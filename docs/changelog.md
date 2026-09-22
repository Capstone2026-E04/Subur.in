# Changelog

Ringkasan perubahan penting secara kronologis terbalik. Lihat `git log` untuk riwayat lengkap.

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
