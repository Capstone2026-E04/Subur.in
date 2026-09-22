# Environment Variables

Jangan pernah commit nilai asli: `.env` / `.env.local` sudah masuk gitignore. Salin `.env.example` yang sesuai dan isi dengan nilai asli secara lokal atau di secrets manager deployment Anda.

## Backend (`backend/.env`)

| Variable                          | Tujuan                                                                            | Cara mendapatkannya                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------| ------------------------------------------------------------------- |
| `PORT`                            | Port HTTP yang digunakan server Express                                           | Pilihan Anda, default `3000`                                        |
| `DB_PASSWORD`                     | Password database (dirujuk oleh connection string)                                | Project Postgres/Supabase Anda                                      |
| `DATABASE_URL`                    | Connection string Postgres berbasis pool yang digunakan Prisma saat runtime       | Supabase project settings -> Database -> Connection string          |
| `DIRECT_URL`                      | Connection string Postgres langsung (non-pooled), diperlukan Prisma untuk migrasi | Supabase project settings -> Database -> Connection string (direct) |
| `GOOGLE_CLIENT_ID`                | OAuth Client ID yang digunakan untuk memverifikasi Google ID token                | Google Cloud Console -> APIs & Services -> Credentials              |
| `GOOGLE_CLIENT_SECRET`            | OAuth Client Secret (berpasangan dengan yang di atas)                             | Google Cloud Console -> APIs & Services -> Credentials              |
| `JWT_SECRET`                      | Secret penanda tangan (signing) untuk JWT sesi backend                            | Buat string acak yang panjang sendiri, misalnya `openssl rand -hex 32` |
| `MQTT_BROKER_URL`                 | URL broker MQTT (`mqtts://...`)                                                   | Deployment EMQX Cloud (atau broker lain) Anda                       |
| `MQTT_PORT`                       | Port TLS broker MQTT                                                              | Dashboard broker, biasanya `8883`                                   |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | Kredensial client MQTT                                                            | Dashboard broker                                                    |
| `REDIS_HOST`                      | Host Redis (`host.docker.internal` di Docker, `127.0.0.1` untuk bare-metal/lokal) | Instance Redis self-hosted                                           |
| `REDIS_PORT`                      | Port Redis                                                                        | Pilihan Anda, default `6379`                                        |
| `REDIS_PASSWORD`                  | Password auth Redis (`requirepass`)                                               | Konfigurasi instance Redis self-hosted                               |
| `SENSOR_THROTTLE_SECONDS`         | Jeda minimum (detik) antar penulisan log sensor mentah per device                 | Pilihan Anda, default `30`                                          |
| `METRICS_PASSWORD`                | Password bearer-token yang melindungi `GET /api/metrics` (lihat [backend/logging.md](../backend/logging.md#metrics)) | Pilihan Anda                                          |
| `TELEGRAM_BOT_TOKEN`               | Token bot yang digunakan untuk mengirim/menerima pesan melalui Telegram Bot API   | [@BotFather](https://t.me/BotFather) di Telegram                    |

## Frontend (`frontend/.env.local`)

| Variable                   | Tujuan                                         | Cara mendapatkannya                                                                                           |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`                     | Port yang digunakan server dev Next.js         | Pilihan Anda, default `3001`                                                                                   |
| `AUTH_SECRET`              | Secret enkripsi sesi NextAuth v5                | Generate: `npx auth secret` atau `openssl rand -hex 32`                                                         |
| `AUTH_URL_DEV` / `AUTH_URL_PROD` | Origin publik aplikasi itu sendiri, digunakan NextAuth untuk membangun URL callback/redirect | URL dev lokal Anda (misalnya `http://localhost:3001`) / origin frontend yang sudah dideploy |
| `AUTH_GOOGLE_ID`           | Google OAuth Client ID (sign-in sisi frontend) | Google Cloud Console -> APIs & Services -> Credentials (bisa sama dengan backend, atau Web client terpisah) |
| `AUTH_GOOGLE_SECRET`       | Google OAuth Client Secret                     | Google Cloud Console -> APIs & Services -> Credentials                                                        |
| `NEXT_PUBLIC_API_URL_DEV`  | Base URL backend yang digunakan saat development | Backend lokal Anda, misalnya `http://localhost:3000`                                                           |
| `NEXT_PUBLIC_API_URL_PROD` | Base URL backend yang digunakan pada build produksi | Origin backend yang sudah dideploy                                                                             |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username bot yang ditampilkan pada instruksi "Hubungkan Telegram" di halaman settings | [@BotFather](https://t.me/BotFather) di Telegram (`@username` yang Anda set untuk bot tersebut) |

`src/services/api.ts` memilih `NEXT_PUBLIC_API_URL_PROD` ketika `NODE_ENV === "production"`, jika tidak menggunakan `NEXT_PUBLIC_API_URL_DEV` (dengan fallback ke `http://localhost:3000`). `src/lib/auth.ts` me-resolve `AUTH_URL` dengan cara yang sama dari `AUTH_URL_DEV`/`AUTH_URL_PROD` sebelum NextAuth diinisialisasi, karena NextAuth sendiri hanya membaca satu `AUTH_URL`.

## Catatan Setup Google OAuth

Kedua aplikasi memverifikasi/menukar Google ID token, sehingga OAuth Client harus memiliki:

- Authorized JavaScript origins yang mencakup URL frontend Anda (misalnya `http://localhost:3001`, domain produksi Anda).
- Authorized redirect URI `<frontend-url>/api/nextauth/callback/google` (`basePath` NextAuth adalah `/api/nextauth`, lihat [`frontend/src/lib/auth.ts`](../../frontend/src/lib/auth.ts)).

## Catatan Setup Bot Telegram

1. Buat bot dengan [@BotFather](https://t.me/BotFather) dan salin token-nya ke `TELEGRAM_BOT_TOKEN` (backend), lihat [api/telegram.md](../api/telegram.md).
2. Set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (frontend) ke `@username` bot tersebut agar halaman settings dapat memberi tahu pengguna bot mana yang harus mereka hubungi.
3. Setelah deploy, arahkan Telegram ke webhook satu kali (tidak diotomatisasi oleh CI):
   ```
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<backend-domain>/api/telegram/webhook"
   ```
