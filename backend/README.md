# Subur.in Backend

Backend service untuk proyek **Subur.in** (Platform Monitoring & Rekomendasi Tanaman Pintar): menerima data sensor IoT lewat MQTT, menghitung rekomendasi perawatan dengan logika fuzzy Mamdani, dan menyajikannya lewat REST API, SSE, serta bot Telegram.

## Tech Stack

- Node.js + Express.js
- PostgreSQL (Supabase) lewat Prisma ORM
- Redis (ioredis) untuk cache dan buffer data sensor
- MQTT (EMQX Cloud) untuk data sensor perangkat
- JWT + Google OAuth2 (`google-auth-library`) untuk autentikasi
- `node-cron` untuk pembersihan database terjadwal
- Telegram Bot API untuk notifikasi dan perintah bot
- Jest untuk pengujian

## Cara menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env`, lalu isi nilainya (lihat [`../docs/setup/environment.md`](../docs/setup/environment.md)).
3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```
4. Jalankan server (default port `3000`):
   ```bash
   npm run dev
   ```

### Script

| Perintah                | Fungsi                                      |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Server dengan auto-reload (nodemon)         |
| `npm start`             | Server mode produksi                        |
| `npm test`              | Menjalankan test Jest                       |
| `npm run db:generate`   | Generate Prisma client                      |
| `npm run db:seed`       | Mengisi data awal (tanaman)                 |
| `npm run format`        | Format kode dengan Prettier                 |
| `npm run format:check`  | Cek format tanpa mengubah berkas            |

## Struktur `src/`

| Folder          | Isi                                                                         |
| --------------- | --------------------------------------------------------------------------- |
| `routes/`       | Definisi route, digabung di `routes/api.js` dengan prefix `/api`            |
| `controllers/`  | Handler request per resource                                                |
| `middlewares/`  | Auth JWT, superadmin, rate limit login, kunci ekspor, error handler         |
| `repositories/` | Akses data sensor (Prisma dan Redis)                                        |
| `ai/`           | Mesin fuzzy (`core/`), kalkulator dosis (`dosage/`), konfigurasi preset     |
| `mqtt/`         | Koneksi broker, subscriber data sensor, publisher ACK dan konfigurasi       |
| `sse/`          | Streaming data sensor real-time ke klien                                    |
| `telegram/`     | Bot Telegram: router, command, callback, keyboard, sesi                     |
| `cron/`         | Job pembersihan database                                                    |
| `__tests__/`    | Test Jest                                                                   |

## API Endpoints

Semua endpoint berada di bawah prefix `/api`. Endpoint selain yang ditandai publik membutuhkan header `Authorization: Bearer <JWT>`.

| Prefix               | Endpoint utama                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/api`               | `GET /health` (status server dan koneksi database), `GET /version`                                          |
| `/api/auth`          | `POST /register`, `POST /login` (rate limited), `POST /google`                                              |
| `/api/users`         | `GET/PATCH/DELETE /me`, `POST /me/password`, `POST /me/telegram/link-code`, `POST /me/telegram/test`, `DELETE /me/telegram` |
| `/api/devices`       | `POST /`, `GET /`, `GET /discovered`, `PATCH/DELETE /:id`, `GET /:id/recommendation`, `GET/POST /:id/corrections` |
| `/api/sensors`       | `GET /:deviceId/latest`, `/history`, `/stream` (SSE), `/export.csv`                                         |
| `/api/plants`        | `GET /` daftar tanaman                                                                                      |
| `/api/recommendations` | `POST /simulate` simulasi fuzzy logic dan dosis (publik)                                                  |
| `/api/notifications` | `GET /`, `PATCH /read`, `DELETE /:id`, `POST /test`                                                         |
| `/api/telegram`      | `POST /webhook` (diverifikasi dengan `TELEGRAM_WEBHOOK_SECRET`)                                             |
| `/api/dev-mode`      | `GET /`, `PUT /`                                                                                            |
| `/api/superadmin`    | `GET /overview`, `/device-options`, `/sensor-history`, `/:resource` (khusus role superadmin)                |

Contoh singkat, `POST /api/recommendations/simulate`:

```json
{ "phValue": 5.5, "moistureValue": 50.0, "plantIdOrName": "UUID_OR_NAME_PLANT" }
```

Format request/response lengkap, kode error, dan contoh tiap endpoint ada di [`../docs/api/`](../docs/api).

## Docker

`Dockerfile` membangun image yang meng-expose port `3000`. Konfigurasi deploy ada di [`../docker-compose.yml`](../docker-compose.yml) dan [`../docs/setup/deployment.md`](../docs/setup/deployment.md).

## Dokumentasi lengkap

Arsitektur, referensi API penuh, environment variable, skema database, dan konvensi kode ada di [`../docs`](../docs): mulai dari [`docs/api/`](../docs/api), [`docs/backend/`](../docs/backend), dan [`docs/database/`](../docs/database).

## Author

Capstone2026-E04
