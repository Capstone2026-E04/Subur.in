# Changelog

Ringkasan perubahan penting secara kronologis terbalik. Lihat `git log` untuk riwayat lengkap.

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
