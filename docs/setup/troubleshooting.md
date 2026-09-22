# Troubleshooting

## Backend gagal start / crash saat boot

Inisialisasi MQTT, Redis, dan cron di [`server.js`](../../backend/src/server.js) masing-masing dibungkus dalam `try/catch` sendiri dan hanya mencatat warning saat gagal; server HTTP tetap berjalan. Jika `/api/health` melaporkan `redis: "ERROR: ..."` atau data sensor tidak pernah diperbarui, periksa kredensial MQTT/Redis di `.env` alih-alih berasumsi seluruh server crash.

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

## Endpoint rekomendasi mengembalikan 500 dengan pesan error bergaya "not found" dari Prisma

`generateRecommendation` melempar error ketika `plantIdOrName` atau `polybagPreset` tidak cocok dengan baris data mana pun (berdasarkan UUID atau nama case-insensitive); ini muncul sebagai `500` dari controller. Pastikan `plantId`/`polybagId` device masih merujuk ke baris data yang ada (seharusnya tidak dapat dihapus karena `onDelete: Restrict`, tetapi data yang di-seed/migrasi di luar jalur normal tetap bisa menjadi tidak konsisten).

## `npx prisma migrate dev` / `db push` gagal secara lokal

Prisma memerlukan `DIRECT_URL` (non-pooled) untuk perubahan schema; connection string berbasis pool (misalnya melalui PgBouncer/pooler Supabase) sering tidak mendukung session-level lock yang dibutuhkan migrasi. Pastikan `DATABASE_URL` dan `DIRECT_URL` sudah diset sesuai [environment.md](environment.md).
