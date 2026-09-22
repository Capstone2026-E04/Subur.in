# Struktur folder

Monorepo dengan dua aplikasi yang dapat dideploy secara independen, `backend/` dan `frontend/`, ditambah konfigurasi Docker/CI bersama di level root.

```
Subur.in/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Model data (lihat database-schema.md)
│   │   └── seed.js              # Mengisi data awal plants + polybag types/instances
│   └── src/
│       ├── ai/                  # Mesin rekomendasi fuzzy logic (logika murni, tanpa I/O)
│       │   ├── config/          # Parameter fuzzy set, preset fisik, konstanta treatment
│       │   ├── core/            # engine.js (inference), membership.js, rules.js
│       │   ├── dosage/          # Kalkulator dosis air/kapur/sulfur
│       │   ├── services/        # recommendation.service.js, mengorkestrasi engine + lookup Prisma
│       │   ├── utils/           # interpreter.js (kategori -> teks aksi), mathematical.js
│       │   └── simulate.js      # Entrypoint simulasi CLI/manual
│       ├── controllers/         # Handler request Express, satu file per resource
│       ├── cron/                # Job node-cron (manajemen partisi, pembersihan log lama)
│       ├── database/connections/# Singleton Prisma client, Redis client (ioredis)
│       ├── errors/              # AppError.js (error terklasifikasi: statusCode, isOperational)
│       ├── middlewares/         # auth.middleware.js (verifikasi JWT), error.middleware.js (handler error terpusat)
│       ├── mqtt/
│       │   ├── connection.js        # Setup MQTT client (EMQX via TLS)
│       │   ├── publishers/          # Mempublikasikan konfigurasi device (interval sensor) ke perangkat
│       │   └── subscribers/         # Berlangganan topik telemetri, memvalidasi + menyimpan pembacaan
│       ├── repositories/        # Akses data: sensor_repository (Postgres), sensor_redis_repository (cache)
│       ├── routes/              # Router Express, dipasang di bawah /api pada routes/api.js
│       ├── services/            # notification.service.js (fan-out notifyDevice)
│       ├── sse/                 # Registry client Server-Sent Events in-memory + broadcaster
│       ├── telegram/            # Modul bot Telegram (feature-based, lihat api/telegram.md)
│       │   ├── bot.js               # Entrypoint: processUpdate(update), dipanggil oleh controller webhook
│       │   ├── router.js            # Satu-satunya tempat yang membedakan message vs callback_query
│       │   ├── telegram_api.service.js # Client Bot API mentah (sendMessage/sendPhoto/answerCallbackQuery/...)
│       │   ├── commands/            # Satu file per perintah (/status, /threshold, dst), didaftarkan di index.js
│       │   ├── callbacks/           # Handler callback_query untuk wizard multi-step (tanaman, threshold)
│       │   ├── keyboards/           # Builder inline keyboard per domain
│       │   ├── session/             # Sesi wizard berbasis Redis (bot_session:{telegramUserId}, TTL 5 menit)
│       │   ├── middlewares/         # require_linked_device.middleware.js (guard akun/device tertaut)
│       │   └── utils/                # parse_callback_data, format_message, format_chart (quickchart.io)
│       ├── utils/               # response.js (sendSuccess/sendError, envelope response bersama)
│       ├── __tests__/           # Test Jest tersentralisasi, mencerminkan struktur src/ (lihat backend/coding-standards.md)
│       │   ├── ai/                  # dosage/, services/ - mencerminkan src/ai/
│       │   └── telegram/            # session/, commands/, router.test.js - mencerminkan src/telegram/
│       └── server.js            # Bootstrap aplikasi: Express, CORS, MQTT, Redis, inisialisasi cron
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/        # Route group login publik
│       │   ├── (dashboard)/dashboard/ # Route group terproteksi: overview, devices, plants,
│       │   │                          # recommendations, analytics, notifications, settings, profile
│       │   ├── api/nextauth/[...nextauth]/route.ts  # Handler NextAuth v5
│       │   ├── layout.tsx / page.tsx
│       │   └── globals.css          # Token tema Tailwind v4 (warna, font)
│       ├── components/
│       │   ├── common/              # Stub lama (Header/Sidebar/LoadingSpinner), saat ini kosong dan tidak dipakai
│       │   ├── ui/                  # Primitif bergaya shadcn (Card, Sidebar collapsible) dibangun di atas class-variance-authority
│       │   ├── dashboard/           # Widget khusus dashboard (StatCard, SensorGaugeCard, chart, nav)
│       │   └── devices/             # Modal/card manajemen device
│       ├── context/                 # AuthContext.tsx
│       ├── hooks/                   # useDevices, useDeviceStatus, usePlants, useSensorRealtime (client SSE)
│       ├── lib/auth.ts              # Konfigurasi NextAuth v5 (Google provider, pertukaran token backend)
│       ├── services/                # Wrapper Axios/fetch per resource backend
│       ├── types/                   # Tipe TypeScript bersama
│       └── utils/helpers.ts
│
├── .github/workflows/           # deploy-backend.yml, deploy-frontend.yml (build image -> GHCR -> VPS)
├── docker-compose.yml           # Compose produksi: menarik image backend/frontend yang sudah dibangun
└── docs/                        # Pohon dokumentasi ini
```

## Konvensi

- Backend mengikuti layering **controller -> service/repository -> Prisma**; controller tidak pernah langsung berbicara dengan detail Redis/MQTT/Prisma di luar query sederhana, logika bisnis (fuzzy inference, perhitungan dosis) berada di `src/ai`.
- Frontend mengikuti **App Router route group** (`(auth)`, `(dashboard)`) untuk memisahkan layout publik dan terproteksi, dengan akses data dipusatkan di `src/services/*` dan dikonsumsi melalui `src/hooks/*`.
- Setiap resource backend memiliki file route, file controller yang sesuai, dan (jika relevan) file `docs/api/*.md`.
