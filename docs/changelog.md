# Changelog

Ringkasan perubahan penting secara kronologis terbalik. Lihat `git log` untuk riwayat lengkap.

## 2026-10-29

- **feat(ai)!:** Parameter kelembapan kini per tanaman (`config/plant_moisture.js`: trigger, target, `a`, `b` sebagai fraksi `theta_CC`). Titik `a` dan `b` menggeser batas zona KERING/LEMBAP, dan target per tanaman menjadi batas isi kalkulator air, sehingga ambang siram dan volume air berbeda untuk bayam, selada, dan pakcoy. `THETA_FILL` dan `THETA_TRIGGER_DISPLAY` dihapus; `PH_ACTION_MARGIN` yang tidak terpakai juga dihapus. `nmiTrigger`/`nmiTarget` di `GET /api/plants` ikut berubah. Lihat [backend/fuzzy-logic.md](backend/fuzzy-logic.md).
- **feat(database):** Migrasi `014_plants_constraints.sql` menambah index unik `uq_plants_name_normalized` dan CHECK `chk_plants_ph_target_between` pada `plants`.

## 2026-10-25

- **feat(chart):** Grafik pH dan kelembapan punya pilihan rentang waktu ("Dari" dan "Sampai"). `GET /api/sensors/:deviceId/history` menerima `from`/`to` (ISO), maksimal 500 data per rentang.
- **refactor!(correction):** Fitur pencatatan koreksi pH dihapus: tabel `correction_logs` (migrasi `013_drop_correction_logs.sql`), `GET/POST /api/devices/:id/corrections`, pemantau pH, masa tunggu 7 hari pada safety gate, panel koreksi, dan tab superadmin "Koreksi pH". Safety gate dan estimasi dosis tetap ada.

## 2026-10-24

- **style(dashboard):** Warna dashboard diselaraskan dengan design system setelah PR desain dashboard digabung: `gray`/`slate` menjadi `neutral`, hex hardcode dan `emerald`/`violet` menjadi token `primary`, latar dashboard `bg-neutral-100`. Lihat [frontend/design-system.md](frontend/design-system.md).
- **refactor(dashboard):** Filter menu (`hidden`, `superadminOnly`) dipindah ke `visibleNavItems(role)` di `navConfig.ts`, dipakai Sidebar dan MobileNavigation.
- **chore(eslint):** Aturan `react-hooks/set-state-in-effect` dan `react-hooks/preserve-manual-memoization` dimatikan di `frontend/eslint.config.js` karena menandai pola fetch data di `useEffect` yang dipakai di seluruh dashboard.

## 2026-10-21

- **feat(telegram):** Tombol "Coba Kirim" di Pengaturan > Telegram mengirim pesan uji coba lewat `POST /api/users/me/telegram/test`. Hanya tampil bila akun sudah terhubung; endpoint membalas `409` bila belum terhubung dan `502` bila Telegram gagal menerima pesan.

## 2026-10-20

- **feat(notification):** Status pengiriman Telegram dicatat pada `notifications.telegram_status` (`skipped` bila user belum menautkan atau menonaktifkan Telegram, `sent`, `failed`) beserta `telegram_error` (alasan dari Telegram, maks 255 karakter). Baris lama bernilai `skipped`. **Jalankan `012_notification_telegram_status.sql` (atau `prisma db push`) SEBELUM deploy** (rollback tersedia).
- **feat(fuzzy):** Fuzzy diganti ke rancangan C501 Draf Final13: input VWC (θ m³/m³, acuan θ_CC = 0,3298), himpunan KERING/LEMBAP/JENUH, Mamdani dengan centroid dua sumbu, override pengaman (`decisionSource`), dosis air maks. 200 mL, batas dolomit 2,8 g dan sulfur 2,4 g per 2 L, masa tunggu koreksi 7 hari. Rekomendasi kini hanya untuk data `vwc_percent`; indeks lama dilewati. Lihat [backend/fuzzy-logic.md](backend/fuzzy-logic.md).

## 2026-10-19

- **fix(mqtt):** ACK antrean offline ESP32 sebelumnya tidak pernah terkirim karena backend hanya menerima `record_id` angka, sedangkan ESP32 mengirim teks (`node_1-<hash>-1`). Kini `record_id` teks diterima (angka lama dikonversi ke teks) dan kolomnya menjadi `text`. Payload VWC (`soil_vwc_pct`) dibaca dan ditandai `moisture_type = vwc_percent`; rekomendasi lama hanya untuk `legacy_index`. Record tidak valid atau bernilai `null` disimpan dulu (payload asli + alasan) ke `rejected_sensor_records` sebelum ACK; gagal simpan berarti tidak ada ACK. Dedup memakai `sensor_record_receipts` dalam satu transaksi dengan log, sehingga record ber-`measured_at` null tidak menggandakan baris. CSV ekspor mendapat kolom `moisture_type`. **Jalankan `010_record_id_text_and_rejected_records.sql` dan `011_sensor_record_receipts.sql` SEBELUM deploy.**
- **feat(dashboard):** Kartu kelembapan menampilkan label VWC dan "Status belum dikalibrasi" (tanpa badge kering/basah) untuk data `vwc_percent`.

## 2026-10-17

- **feat(mqtt):** Antrean offline ESP32. Saat WiFi putus, ESP32 menyimpan pembacaan dan mengirimnya setelah tersambung kembali; backend menyimpannya idempoten lewat `UNIQUE(device_id, record_id, timestamp)`, memakai `measured_at` (UTC) sebagai waktu pengukuran, lalu mengirim ACK (`record_id` polos, QoS 1, `retain=false`) ke `suburin/devices/<node_id>/ack` setelah commit database (juga untuk record duplikat). `measured_at = null` (jam belum sinkron NTP) disimpan dengan `time_synced=false` dan waktu terima sebagai penanda posisi. Record duplikat dan data yang lebih tua dari 2 x `sensorInterval` hanya disimpan: tidak memicu rekomendasi, notifikasi, SSE, maupun cache terbaru. Nilai sensor tidak valid tetap di-ACK agar antrean tidak macet; perangkat belum terdaftar tidak di-ACK. Telemetri tanpa `record_id` (firmware lama, Dev Mode) tetap lewat jalur lama. **Jalankan `backend/prisma/manual/009_sensor_buffered_records.sql` di Supabase SEBELUM deploy** (rollback tersedia). Lihat [ADR-011](decisions/adr-011-offline-queue-ack-and-export-buffer.md).
- **feat(sensor):** `GET /api/sensors/:deviceId/export.csv` mengekspor data sensor sebagai CSV untuk Excel (`Data > From Web`). Sumbernya buffer pesan MQTT di Redis (`sensor:export:<deviceCode>`, maks 10.000 pesan, kedaluwarsa 30 hari), dicatat tanpa throttle `SENSOR_THROTTLE_SECONDS`. Kolom: `device_code, timestamp_utc, timestamp_wib, ph, moisture, time_synced`. Parameter `from`, `to`, `limit`. Lihat [api/sensors.md](api/sensors.md).
- **feat(security):** Variabel `EXPORT_API_KEY` (query `?api_key=` atau header `X-API-Key`, perbandingan timing-safe) mengotorisasi ekspor CSV tanpa JWT; kosong = dinonaktifkan. JWT pemilik perangkat tetap diterima.
- **feat(dashboard):** Grafik tren pH dan kelembapan punya pilihan granularitas waktu (per menit, 10 menit, jam, hari) dengan tooltip, dan pilihan jumlah data terakhir (5, 10, 20, 30 titik; default 10).
- **feat(device):** Modal edit perangkat memakai opsi interval yang sama dengan modal tambah (1 menit hingga 12 jam); sebelumnya maksimal 1 jam sehingga perangkat dengan interval 4/6/12 jam tampil kosong saat diedit. Default interval di frontend menjadi 1 jam.
- **fix(dashboard):** Volume air rekomendasi ditampilkan dalam mL.
- **fix(telegram):** Webhook membalas `200` sebelum memproses update; bot membalas pesan galat bila pemrosesan gagal dan mengarahkan pesan teks non-perintah (chat privat) ke `/help`.
- **test:** Tes baru untuk jalur antrean offline, buffer ekspor, endpoint ekspor, dan middleware `EXPORT_API_KEY` (backend 260 test).

## 2026-10-15

- **feat(auth)!:** Registrasi dan login dengan email + password (`POST /api/auth/register`, `POST /api/auth/login`) berdampingan dengan Google Sign-In. Password di-hash scrypt (`utils/password.js`), pesan galat login seragam, dan percobaan gagal dibatasi 10 per email per 15 menit (dependensi baru `express-rate-limit`). `users.google_id` menjadi nullable dan `users.password_hash` ditambahkan. **Jalankan `backend/prisma/manual/008_email_password_auth.sql` di Supabase SEBELUM deploy** (rollback tersedia). Lihat [ADR-009](decisions/adr-009-email-password-auth.md).
- **feat(auth):** Akun email + password yang masuk dengan Google ditautkan ke akun yang sama dan mengambil avatar Google bila kosong. Password lama dihapus pada penautan pertama untuk mencegah pra-pembajakan akun (email saat registrasi tidak diverifikasi); user membuat password lagi dari profil.
- **feat(users):** `POST /api/users/me/password` membuat password untuk akun Google (sekali, form dua input di halaman Profil). `GET /api/users/me` menambah `role` dan `hasPassword`.
- **feat(frontend):** Login memakai Credentials provider NextAuth dan halaman `/register`; sesi NextAuth diset 7 hari agar sama dengan JWT backend (sebelumnya 30 hari).
- **feat(superadmin)!:** Kolom `users.role` (enum `user_role`: `USER`, `SUPERADMIN`, default `USER`) dan endpoint `/api/superadmin/*` untuk melihat seluruh data (ringkasan, daftar perangkat, riwayat sensor, tujuh tabel dengan paginasi, sort, pencarian, filter, rentang tanggal). Role dibaca dari database pada setiap request dan hanya diubah lewat Supabase Dashboard. Menu dan halaman `/dashboard/superadmin` hanya untuk `SUPERADMIN` (grafik pH dan kelembapan dengan pilihan perangkat, tabel semua data). **Jalankan `backend/prisma/manual/007_user_role.sql` di Supabase SEBELUM deploy** (rollback tersedia). Lihat [api/superadmin.md](api/superadmin.md) dan [ADR-010](decisions/adr-010-superadmin-role.md).
- **feat(frontend):** Dashboard Ringkasan dan Perangkat disesuaikan dengan desain Figma: sidebar dan topbar baru (dropdown perangkat di topbar, state bersama lewat Zustand `useSelectedDeviceStore`), kartu rekomendasi treatment, bar pH, gauge kelembapan, dan grafik tren rata-rata per menit (10 menit terakhir) dengan pembacaan realtime. `SensorMonitorPanel` dan `StatCard` dihapus.
- **feat(frontend):** Halaman login dan register didesain ulang (`AuthShell`, animasi GSAP); `Card` dashboard memakai `rounded-3xl`; aksesibilitas sidebar dan topbar (label ikon, target sentuh 44 px).
- **test:** 57 test baru untuk password, auth, role superadmin, dan endpoint superadmin (backend 239 test).
- **docs:** Dokumentasi autentikasi, users, skema, migrasi, routing, state, komponen, design system, alur API, dan troubleshooting diperbarui; ditambah [api/superadmin.md](api/superadmin.md), [ADR-009](decisions/adr-009-email-password-auth.md), dan [ADR-010](decisions/adr-010-superadmin-role.md).

## 2026-10-12

- **perf(db)!:** Indeks `created_at` pada `recommendation_logs` dan `notifications` untuk cron pembersihan; FK `raw_sensor_logs.device_id -> devices.id` (ON DELETE CASCADE); `notifications.type` menjadi enum `notification_type` (`warning`, `success`, `info`). **Jalankan `backend/prisma/manual/006_indexes_fk_enum.sql` di Supabase SEBELUM deploy** (rollback tersedia), karena `prisma db push` tidak bisa mengubah varchar menjadi enum tanpa kehilangan data.
- **chore(polybag):** Ukuran polybag prototipe menjadi 30x30 cm; volume media tetap 2 L.

## 2026-10-10

- **refactor(fuzzy)!:** Mesin fuzzy disesuaikan dengan dokumen C501: rule base 3x3 (pH ASAM/OPTIMAL/BASA x NMI KERING/OPTIMAL/BASAH), inferensi MIN-MAX dengan tie-break berprioritas (menggantikan 20 rule + centroid), kelembapan kini berupa NMI dengan trigger/target per tanaman (`config/plant_moisture.js`; hanya Selada, Bayam, Pakcoy), kalkulator air/dolomit/sulfur mengikuti rumus C501, dan safety gate koreksi pH baru. `fuzzyIndex` kini 0-1 (kekuatan aturan). Response menambah `waterAction`, `phAction`, `phCorrection`. Lihat [backend/fuzzy-logic.md](backend/fuzzy-logic.md).
- **refactor(polybag)!:** Preset polybag disederhanakan menjadi satu (`Standar`, 20x20 cm, media 2 L); preset `Kecil` dan `Standar` lama dihapus. Volume media kini dibaca dari `soilVolumeLiter`, bukan dihitung dari dimensi.
- **feat(frontend):** Animasi landing page memakai GSAP + ScrollTrigger (`LandingMotion.tsx`): timeline hero, reveal bertahap, progres langkah mengikuti scroll, dan hitung naik angka; dependency baru `gsap` dan `@gsap/react`. Menggantikan `Reveal` berbasis framer-motion.
- **feat(frontend):** Landing page dan halaman login didesain ulang (hero asimetris dengan pratinjau komponen asli, langkah kerja, bento rekomendasi, CTA penutup); font dimuat lewat `next/font`. Lihat [frontend/design-system.md](frontend/design-system.md#halaman-publik-landing-dan-login).
- **feat(frontend):** Halaman Rekomendasi menampilkan status safety gate koreksi pH dan panel pencatatan/riwayat koreksi; kelembapan ditampilkan sebagai NMI (bukan persen), volume air dalam mL, gauge dashboard dan halaman Tanaman memakai rentang pH serta trigger/target NMI per tanaman. `GET /api/plants` menambah `nmiTrigger`/`nmiTarget`.
- **test:** Test fuzzy ditulis ulang berdasarkan contoh dokumen C501 (`__tests__/ai/c501/`), ditambah test subscriber MQTT, controller koreksi, dan riwayat koreksi pada service. Panduan baru: [backend/testing.md](backend/testing.md).
- **refactor(polybag)!:** Tabel `polybags`/`polybag_types` dan kolom `devices.polybag_id` dihapus (`prisma/manual/005_drop_polybags.sql`, rollback tersedia), serta endpoint `GET /api/polybags`. Preset kini konstanta `ai/config/polybag.js`. `polybagId` dihapus dari `POST/PATCH /api/devices` dan `polybagPreset` dari `POST /api/recommendations/simulate`. Frontend tidak lagi memilih polybag.
- **feat(correction):** Pencatatan koreksi pH: tabel `correction_logs`, `POST/GET /api/devices/:id/corrections`. Koreksi terakhir mengaktifkan periode tunggu 14 hari pada safety gate (subscriber MQTT dan `GET /api/devices/:id/recommendation`). Perlu `prisma db push` lalu `prisma/manual/004_correction_logs.sql` (rollback tersedia).
- **refactor(mqtt):** Notifikasi kering/basah dan koreksi pH di subscriber kini mengikuti keputusan fuzzy (bukan ambang moisture 25/35); pembacaan pH berturut-turut di luar ambang dihitung via Redis untuk safety gate.

## 2026-10-08

- **fix(security):** Webhook Telegram memverifikasi header `X-Telegram-Bot-Api-Secret-Token` terhadap `TELEGRAM_WEBHOOK_SECRET` (perbandingan timing-safe); request tanpa secret yang cocok ditolak `401`. Perlu `setWebhook` ulang dengan `secret_token`.
- **fix(security):** Endpoint `/api/sensors/:deviceId/{stream,latest,history}` kini wajib JWT dan hanya untuk pemilik device (`404` bila bukan miliknya). `stream` juga menerima `?access_token=` karena `EventSource` tidak bisa mengirim header; frontend (`useSensorRealtime`, dashboard) ikut mengirim token.
- **fix(security):** `JWT_SECRET` wajib (tanpa fallback, lewat `config/jwt.js`); JWT dikunci ke `HS256`; sign-in Google menolak email yang belum terverifikasi.
- **fix(security):** Kode link Telegram menjadi 8 karakter via `crypto.randomInt` dan kedaluwarsa 10 menit (kolom baru `users.telegram_link_code_expires_at`, perlu `prisma db push`/migrasi).
- **fix(security):** `PATCH /api/users/me` memvalidasi `avatarUrl` (https, maks 2048); `limit` riwayat sensor dibatasi 1-500; `GET /api/devices/discovered` memakai `SCAN` alih-alih `KEYS`; `/api/health` tidak lagi membocorkan pesan error Redis; `DATABASE_URL` tidak lagi dicatat saat boot.

## 2026-10-05

- **fix(mqtt):** Config interval dipublikasikan dengan `retain: true` agar alat yang offline/reboot langsung menerima interval terakhir saat subscribe.
- **fix(device):** `sensorInterval` divalidasi 1-60 menit (sesuai batas firmware ESP) pada `registerDevice` dan `updateDevice`.
- **refactor(api)!:** Menghapus endpoint `POST /api/devices/:id/config` (`delay_ms`) yang tidak kompatibel dengan firmware dan tidak dipakai frontend; ubah interval lewat `PATCH /api/devices/:id`.
- **refactor(db)!:** `Device.id` kini UUID surrogate key; kode dari alat disimpan di `Device.deviceCode` (`device_code`, unik). FK `device_id` pada `recommendation_logs`, `notifications`, dan `raw_sensor_logs` menjadi UUID. Migrasi data lewat `prisma/manual/003_device_surrogate_key.sql` (dijalankan manual sebelum deploy, ada rollback).
- **refactor(api)!:** `POST /api/devices` memakai `deviceCode` (bukan `deviceId`); `GET /api/devices/discovered` mengembalikan `deviceCode`; path/query `:id`/`:deviceId` kini UUID. Topic MQTT tidak berubah (tetap memakai kode alat), jadi firmware tidak perlu diubah.
- **feat(dev-mode):** Dev Mode untuk simulasi telemetri MQTT per user, dengan skenario kritis acak; data simulasi ditandai `is_dev` pada `recommendation_logs` dan `raw_sensor_logs`.

## 2026-10-03

- **fix(device):** `GET /api/devices/:id/recommendation` kini read-only dan tidak lagi menulis `recommendation_logs` (sebelumnya satu insert per panggilan, termasuk dari data basi); log hanya ditulis oleh subscriber MQTT. Field `logId` dihapus dari respons.
- **feat(device):** Endpoint yang sama mengembalikan `data: null` dengan pesan "Data sensor sudah lama..." bila pembacaan terakhir lebih tua dari 2 × `sensorInterval` menit (ambang sama dengan cron `checkOfflineDevices`).

## 2026-09-30 (hardening database)

- **refactor(db):** Semua kolom `DateTime` kini `timestamptz(6)`.
- **perf(db):** Menambahkan `@@index` untuk FK dan query riwayat (`raw_sensor_logs`, `devices`, `notifications`, `recommendation_logs`, `polybags`).
- **feat(db):** Menambahkan CHECK constraint kategori, rentang numerik, dan nilai positif lewat `prisma/manual/001_check_constraints.sql`.
- **feat(db):** Mengaktifkan RLS pada semua tabel dan partisi lewat `prisma/manual/002_row_level_security.sql`; `database_cleanup_cron.js` mengaktifkan RLS otomatis pada partisi baru dan yang sudah ada.
- **fix(device):** Menghapus device atau akun kini juga menghapus `raw_sensor_logs` terkait dalam satu transaksi; menambahkan `npm run db:check-orphans`. `seed.js` ikut menghapus `raw_sensor_logs` sebelum `device.deleteMany`.
- **feat(device):** `registerDevice` dan `updateDevice` memvalidasi `sensorInterval` (bilangan bulat minimal 1).

## 2026-09-30

- **refactor(telegram):** Menghapus perintah `/threshold` beserta callback, keyboard, dan mekanisme wizard sesi (`getWizard`/`setWizard`/`clearWizard`) karena rentang ambang batas sudah ditentukan oleh fuzzy logic dan tidak dapat dikustomisasi user.
- **refactor(db):** Menghapus `Device.customPhMin`/`customPhMax`/`customMoistureMin`/`customMoistureMax`; `sensor_subscriber.js` kembali selalu memakai ambang bawaan (`25`/`35` kelembapan, `Plant.minPh`/`maxPh` pH).

## 2026-09-23

- **test(backend):** Migrasi seluruh testing backend ke **Jest**, menggantikan script `assert`+`node` manual (`src/ai/__tests__/*.test.js`, yang sebagiannya menghantam database Supabase sungguhan dan skip diam-diam tanpa data seed). Test dipindahkan ke folder tersentralisasi `src/__tests__/`, mencerminkan struktur `src/`, dengan Prisma/Redis di-mock lewat `jest.mock(...)` alih-alih dependency sungguhan. `npm test` sekarang menjalankan `jest` dan benar-benar gagal (exit non-zero) saat assertion gagal. Lihat [ADR-008](decisions/adr-008-jest-for-testing.md).
- **refactor(telegram):** Memindahkan seluruh penanganan bot Telegram dari `controllers/telegram.controller.js` (rantai `if/else` tunggal) menjadi modul feature-based [`src/telegram/`](../backend/src/telegram/) (`router.js`, `commands/`, `callbacks/`, `keyboards/`, `session/`, `middlewares/`, `utils/`), mengikuti pola yang sama dengan `src/ai/`. `services/telegram.service.js` dipindahkan menjadi `telegram/telegram_api.service.js`. Lihat [ADR-007](decisions/adr-007-telegram-bot-command-module.md).
- **feat(telegram):** Menambahkan perintah bot baru: `/status`, `/riwayat [7d|30d]` (grafik via quickchart.io), `/rekomendasi`, `/unlink` (dengan konfirmasi inline keyboard), `/device`, `/tanaman` (memilih tanaman aktif untuk device multi-unit), `/notifikasi on|off`, `/threshold` (wizard inline keyboard + input teks untuk ambang batas notifikasi kustom pH/kelembapan per device), `/help` (dihasilkan otomatis dari registry perintah), dan `/laporan` (ringkasan on-demand 7 hari). `/start` dan `/link` dipindahkan tanpa perubahan perilaku. Lihat [api/telegram.md](api/telegram.md).
- **feat(db):** Menambahkan `User.telegramNotifyEnabled` (dipakai oleh `/notifikasi` dan `notifyDevice` untuk gating channel Telegram) serta `Device.customPhMin`/`customPhMax`/`customMoistureMin`/`customMoistureMax` (dipakai oleh `/threshold` untuk meng-override ambang batas notifikasi transisi kategori bawaan di `sensor_subscriber.js`). Lihat [architecture/database-schema.md](architecture/database-schema.md).
- **test(telegram):** Menambahkan unit test Jest untuk `session.service.js`, `router.js`, dan command dengan logic paling kompleks (`status`, `threshold`, `notifikasi`), lihat entri migrasi Jest di atas.

## 2026-09-22

- **refactor(error-handling):** Menambahkan `AppError` dan middleware error Express terpusat ([`middlewares/error.middleware.js`](../backend/src/middlewares/error.middleware.js)) sehingga error tak terduga tidak lagi ditangani manual di tiap controller dan membocorkan `error.message` mentah ke client; `recommendation.service.js`/`physical_presets.js` sekarang melempar `AppError` berstatus 400/404 alih-alih `Error`/`TypeError`/`RangeError` generik yang selalu jatuh ke 500.
- **refactor(api):** Menyentralisasi bentuk response lewat helper `sendSuccess`/`sendError` ([`utils/response.js`](../backend/src/utils/response.js)) di seluruh endpoint, menggantikan `res.json({...})` yang ditulis manual per controller. Payload `GET /api` dan `GET /api/health` yang sebelumnya berada di top-level kini dibungkus di bawah `data`, konsisten dengan endpoint lain. Lihat [api/error-response.md](api/error-response.md).
- **refactor(fuzzy-engine):** Mengganti nama `theta`/`thetaTarget` menjadi `vwc`/`vwcTarget` (Volumetric Water Content) di seluruh mesin fuzzy logic, dan mengekstrak rumus konversi `moisturePercent / 100` yang terduplikasi menjadi `toVwc()` di `ai/utils/mathematical.js`.
- **refactor(cron):** Retensi `raw_sensor_logs`/`recommendation_logs`/`notifications` diperpanjang dari 30 hari menjadi 6 bulan; menghapus `cron/downsampling_job.js` yang kosong dan tidak pernah diimplementasikan.

## 2026-09-08

- **fix(layout):** Container root dashboard menggunakan `flex` (row) tanpa breakpoint responsif, sehingga di mobile bar hamburger dan panel konten utama berada bersebelahan alih-alih bertumpuk; diubah menjadi `flex-col md:flex-row`. Juga memperbaiki touch target di bawah 44px pada tombol hamburger/close sidebar mobile dan mencegah nama user yang panjang meluber dari topbar.
- **feat(ux):** Mendesain ulang halaman landing dan login agar sesuai dengan identitas visual aplikasi lainnya alih-alih menjadi placeholder tanpa styling; menambahkan pesan error yang ramah saat sign-in Google gagal; memperbaiki `**text**` literal yang tidak ter-render bold di halaman dashboard/recommendations/analytics; menghapus jargon internal ("Fuzzy Logic", "Treatment", "jalankan seeder database") dari copy yang menghadap user.
- **fix(telegram):** `sendMessage` tidak lagi memaksa `parse_mode: "Markdown"` pada setiap pesan: balasan statis bot (misalnya `/link KODE_ANDA`) mengandung `_` yang tidak di-escape, yang merusak parser Markdown lawas milik Telegram dan membuat setiap balasan, termasuk `/start`, gagal dengan "can't parse entities."
- **feat(notifications)!:** Menghapus opsi notifikasi push browser desktop (`Notification.requestPermission()`/`new Notification(...)` dan toggle settings-nya): Telegram kini menjadi satu-satunya channel untuk menjangkau user yang tidak sedang berada di dashboard. Lihat [ADR-006](decisions/adr-006-telegram-notification-channel.md).
- **feat(notifications):** Menambahkan Telegram sebagai channel notifikasi: penautan akun melalui kode sekali pakai (`POST /api/users/me/telegram/link-code`, `POST /api/telegram/webhook`), dan mensentralisasi semua pembuatan notifikasi di balik `notifyDevice()` dalam `notification.service.js` baru, menggantikan pasangan `prisma.notification.create` + `broadcastToDevice` yang terduplikasi di seluruh codebase ([api/telegram.md](api/telegram.md), [ADR-006](decisions/adr-006-telegram-notification-channel.md)).
- **fix(recommendation):** Menghapus batas atas yang tidak terdokumentasi pada dosis kapur/dolomit yang tidak sesuai dengan spesifikasi model fuzzy (hanya dosis belerang yang memiliki batas atas terdokumentasi); menghapus konstanta duplikat yang mati dari `fuzzy_parameters.js` dan parameter kelembapan per tanaman yang tidak terpakai dan tidak pernah benar-benar dibaca.
- **ci(deploy):** Workflow deploy backend dan frontend sekarang berbagi concurrency group sehingga tidak bisa berjalan bersamaan terhadap VPS bersama, dan script deploy VPS menggagalkan job pada error apa pun alih-alih melanjutkan secara diam-diam.
- **refactor(redis):** Memigrasikan client Redis dari Upstash ke instance `ioredis` self-hosted.
- **refactor(plants):** Target kelembapan tanah sekarang menjadi satu nilai statis yang dibagikan oleh semua tanaman alih-alih field per tanaman, sesuai dengan bagaimana model fuzzy sebenarnya dirancang.
- **fix(auth):** `AUTH_URL` sekarang di-resolve dari `AUTH_URL_DEV`/`AUTH_URL_PROD` per environment alih-alih satu nilai yang hanya berfungsi di salah satu dari dev/prod.
- **feat(dashboard):** Memigrasikan UI dashboard ke `Card` bergaya shadcn/ui dan sidebar yang bisa di-collapse (`components/ui/`), menggantikan markup card/sidebar buatan tangan di sebagian besar halaman dashboard.

## 2026-09-03

- **fix(auth):** Menyelaraskan `basePath` `SessionProvider` frontend dengan konfigurasi NextAuth sisi server (`/api/nextauth`), memperbaiki desinkronisasi session setelah pemindahan `basePath` sebelumnya.
- **fix(auth):** Backend sekarang mempercayai header forwarded host dari reverse proxy sehingga NextAuth me-resolve origin yang benar saat di-deploy di belakang reverse proxy.
- **chore(env):** URL API production diperbarui menjadi `suburin.duckdns.org`.

## Sebelumnya

- **feat(api):** Health check dipasang di bawah `/api/health`.
- **chore(env):** `PORT` default dev frontend diubah menjadi `3001`.
- **ci(deploy):** Workflow deploy backend sekarang menjalankan `prisma db push` secara otomatis setiap kali deploy ([setup/deployment.md](setup/deployment.md)).
- **fix:** Memindahkan `basePath` NextAuth ke `/api/nextauth` untuk menghindari tabrakan path dengan prefix `/api` milik backend sendiri saat keduanya di-proxy dari origin yang sama.
- **fix:** Build Docker frontend sekarang membaca `.env.local` di `docker-compose.yml` alih-alih `.env`.
- **chore:** Pipeline deployment berbasis Docker awal disiapkan (GHCR + VPS melalui GitHub Actions).
