# Troubleshooting

## Backend gagal start / crash saat boot

Inisialisasi MQTT, Redis, dan cron di [`server.js`](../../backend/src/server.js) masing-masing dibungkus dalam `try/catch` sendiri dan hanya mencatat warning saat gagal; server HTTP tetap berjalan. Jika `/api/health` melaporkan `redis: "ERROR"` (detail error ada di log backend) atau data sensor tidak pernah diperbarui, periksa kredensial MQTT/Redis di `.env` alih-alih berasumsi seluruh server crash.

## `GET /api/health` melaporkan database `DOWN`

Biasanya disebabkan oleh `DATABASE_URL`/`DIRECT_URL` yang salah atau project Supabase yang di-pause karena tidak aktif (free tier). Pastikan connection string berfungsi dengan `npx prisma db pull` dari `backend/`.

## Google Sign-In berhasil di frontend tetapi sinkronisasi sesi backend gagal

Callback `signIn` di `lib/auth.ts` mengirim POST ke `${API_URL}/api/auth/google` dan mengembalikan `false` (secara diam-diam memblokir sign-in) jika panggilan tersebut gagal. Periksa:
- `NEXT_PUBLIC_API_URL_DEV`/`_PROD` mengarah ke backend yang dapat dijangkau.
- `GOOGLE_CLIENT_ID` backend sesuai dengan `AUTH_GOOGLE_ID` frontend (Google OAuth Client yang sama, atau ID yang audience-nya diterima backend); ketidakcocokan akan membuat `verifyIdToken` gagal dengan `401`.
- Log backend (`Google Sign-In Controller Error`) untuk mengetahui penyebab yang mendasarinya.

## `401 Unauthorized` pada endpoint terproteksi meskipun baru saja login

- Pastikan header persis `Authorization: Bearer <token>` (huruf `B` kapital, satu spasi).
- JWT kedaluwarsa setelah 7 hari ([`auth.controller.js`](../../backend/src/controllers/auth.controller.js)); lakukan sign in lagi.
- Perbedaan `JWT_SECRET` antara deploy yang menerbitkan token dan deploy yang memverifikasi token (misalnya setelah melakukan rotasi secret tanpa membatalkan token lama) menyebabkan verifikasi gagal untuk token yang diterbitkan sebelum rotasi.

## Data sensor tidak pernah muncul di dashboard

Telusuri pipeline secara berurutan:
1. Apakah device benar-benar melakukan publish? Periksa dashboard broker untuk client yang terhubung pada `suburin/devices/{id}/telemetry`.
2. Koneksi MQTT backend: cari `[MQTT Subscriber] Subscribe berhasil...` di log backend saat boot.
3. Validasi payload: [`sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js) membuang payload jika `ph`/`moisture` bukan angka valid dalam rentang yang ditentukan, dan membuat notifikasi "invalid data" (dibatasi hingga sekali per jam per device).
4. `GET /api/sensors/:deviceId/latest`: jika mengembalikan 404, berarti belum ada data yang di-cache/disimpan untuk device ID tersebut secara persis (ID bersifat case-sensitive).
5. Stream SSE (`GET /api/sensors/:deviceId/stream`) tidak update secara live tetapi `/latest` berfungsi: periksa apakah ada proxy yang melakukan buffering pada `text/event-stream` (memerlukan dukungan `X-Accel-Buffering: no`, yang sudah diset oleh backend) atau ekstensi browser yang memblokir `EventSource`.

## Antrean offline ESP32: record terus dikirim ulang

ESP32 mengirim ulang record tertua tiap 30 detik selama belum menerima ACK di `suburin/devices/<node_id>/ack`.
1. Apakah migrasi `009`, `010`, dan `011` sudah dijalankan? Tanpa kolom `record_id` bertipe `text`, tabel `sensor_record_receipts`, dan `rejected_sensor_records`, penyimpanan gagal dan ACK tidak pernah dikirim (cari `[SensorSubscriber] Gagal memproses data sensor` di log).
2. Apakah perangkat sudah diklaim (terdaftar di tabel `devices` dengan `device_code` yang sama dengan `<node_id>`)? Perangkat belum terdaftar sengaja tidak di-ACK.
3. Apakah broker mengizinkan node subscribe ke topic `ack` dan `config`, dan backend publish ke keduanya (EMQX Cloud: Access Control > Authorization; mode blacklist bawaan mengizinkan semuanya)?
4. Apakah backend terhubung ke broker? Log `[MQTT Publisher] ACK tertunda, broker belum terhubung` berarti ACK tidak terkirim.
5. Payload harus memuat `record_id` (teks atau bilangan bulat); nama field lain dianggap telemetri lama (tanpa ACK).

6. Record tidak valid (pH/kelembapan di luar rentang atau `null`) tidak hilang: payload asli tersimpan di `rejected_sensor_records` beserta `reason`, lalu di-ACK. Bila ACK tidak datang, periksa log `Gagal menyimpan record yang ditolak`.

## Ekspor CSV kosong atau `401`

- `401`: `EXPORT_API_KEY` di URL (`?api_key=`) tidak sama dengan nilai di server, atau variabel kosong (jalur kunci nonaktif; pakai JWT). JWT kedaluwarsa setelah 7 hari.
- `404`: `deviceId` bukan UUID perangkat yang valid, atau perangkat tidak ada.
- Hanya header yang muncul: buffer ekspor (`sensor:export:<deviceCode>` di Redis) masih kosong. Buffer hanya berisi pesan yang diterima backend setelah versi ini berjalan, dan hilang bila Redis dikosongkan. Cek juga rentang `from`/`to`.
- `500`: Redis tidak terjangkau; ekspor tidak punya fallback ke database.

## Endpoint rekomendasi mengembalikan 500 dengan pesan error bergaya "not found" dari Prisma

`generateRecommendation` melempar error ketika `plantIdOrName` tidak cocok dengan baris data mana pun (berdasarkan UUID atau nama case-insensitive); ini muncul sebagai `500` dari controller. Pastikan `plantId` device masih merujuk ke baris data yang ada (seharusnya tidak dapat dihapus karena `onDelete: Restrict`, tetapi data yang di-seed/migrasi di luar jalur normal tetap bisa menjadi tidak konsisten).

## `/tanaman` untuk device kedua tidak pernah "menempel"

"Tanaman aktif" disimpan di Redis (`bot_session:{telegramUserId}`, TTL 5 menit, lihat [api/telegram.md](../api/telegram.md)). Jika Redis tidak terjangkau, `session/session.service.js` gagal senyap ke `null`/no-op alih-alih melempar error, sehingga bot tetap membalas tetapi seolah-olah sesi selalu kosong (`/tanaman` untuk user multi-device harus dipilih ulang terus-menerus). Periksa `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` di `.env` dan cari `[Redis] Error koneksi Redis` di log backend. (Unit test `src/__tests__/telegram/session/session.service.test.js` me-mock Redis sepenuhnya lewat `jest.mock(...)`, lihat [ADR-008](../decisions/adr-008-jest-for-testing.md), jadi tidak terpengaruh oleh masalah konektivitas ini.)

## `npx prisma migrate dev` / `db push` gagal secara lokal

Prisma memerlukan `DIRECT_URL` (non-pooled) untuk perubahan schema; connection string berbasis pool (misalnya melalui PgBouncer/pooler Supabase) sering tidak mendukung session-level lock yang dibutuhkan migrasi. Pastikan `DATABASE_URL` dan `DIRECT_URL` sudah diset sesuai [environment.md](environment.md).

## Login email + password ditolak (`Email atau password salah.`)

- Akun yang awalnya mendaftar lewat Google belum punya password. Masuk dengan Google, lalu buat password di halaman Profil (kartu "Password").
- Akun email + password yang kemudian masuk dengan Google kehilangan password lamanya pada penautan pertama ([ADR-009](../decisions/adr-009-email-password-auth.md)); buat password lagi dari Profil.
- Pesan yang sama dipakai untuk email tidak terdaftar, sehingga tidak bisa membedakan penyebabnya dari respons.

## Login mengembalikan `429`

Lebih dari 10 percobaan gagal untuk email yang sama dalam 15 menit. Tunggu jendela waktu berakhir; penghitung berada di memori backend, jadi restart backend juga mengosongkannya.

## `GET /api/users/me` error (`500`) setelah deploy

Backend versi baru membaca `users.role` dan `users.password_hash`. Jalankan `007_user_role.sql` dan `008_email_password_auth.sql` di Supabase SQL Editor **sebelum** deploy ([database/migration.md](../database/migration.md)). Gejala di log: Prisma mengeluh kolom `role` atau `password_hash` tidak ada.

## Menu Superadmin tidak muncul, atau `/dashboard/superadmin` mengarahkan ke `/dashboard`

Role akun belum `SUPERADMIN`, atau backend gagal dimuat saat layout mengambil profil (gagal tertutup). Cek dan atur role lewat Supabase:

```sql
SELECT email, role FROM public.users;
UPDATE public.users SET role = 'SUPERADMIN' WHERE email = 'budi@gmail.com';
```

Role dibaca dari database pada setiap request, jadi tidak perlu login ulang. Endpoint `/api/superadmin/*` yang mengembalikan `403` berarti akun bukan `SUPERADMIN`.

## Dashboard tidak menampilkan data dan kartu rekomendasi berputar terus

`GET /api/sensors/:id/latest` dan `GET /api/devices/:id/recommendation` memakai Redis. Bila Redis tidak terjangkau (misalnya `REDIS_HOST=host.docker.internal` dijalankan di luar Docker, atau Docker Desktop mati), request menggantung dan log backend dipenuhi `connect ETIMEDOUT` serta `Reached the max retries per request limit`. Endpoint yang tidak memakai Redis (`/api/devices`, `/api/plants`, `/api/sensors/:id/history`) tetap normal. Periksa `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, atau jalankan Redis lokal dan arahkan `.env` ke sana.

Jika hanya kartu rekomendasi yang kosong dengan pesan "Belum Ada Rekomendasi", itu normal bila pembacaan terakhir lebih tua dari 2 x `sensorInterval` menit (sensor mati).
