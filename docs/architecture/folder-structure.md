# Folder Structure

Monorepo with two independently deployable apps, `backend/` and `frontend/`, plus shared root-level Docker/CI config.

```
Subur.in/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Data model (see database-schema.md)
│   │   └── seed.js              # Seeds plants + polybag types/instances
│   └── src/
│       ├── ai/                  # Fuzzy logic recommendation engine (pure logic, no I/O)
│       │   ├── config/          # Fuzzy set parameters, physical presets, treatment constants
│       │   ├── core/            # engine.js (inference), membership.js, rules.js
│       │   ├── dosage/          # water/lime/sulfur dosage calculators
│       │   ├── services/        # recommendation.service.js — orchestrates engine + Prisma lookups
│       │   ├── utils/           # interpreter.js (category -> action text), mathematical.js
│       │   ├── simulate.js      # CLI/manual simulation entrypoint
│       │   └── __tests__/       # Unit tests for the engine and calculators
│       ├── controllers/         # Express request handlers, one file per resource
│       ├── cron/                # node-cron jobs (partition mgmt, downsampling)
│       ├── database/connections/# Prisma client singleton, Redis client (Upstash/ioredis adapter)
│       ├── middlewares/         # auth.middleware.js — JWT verification
│       ├── mqtt/
│       │   ├── connection.js        # MQTT client setup (EMQX over TLS)
│       │   ├── publishers/          # Publishes device config (sensor interval) to devices
│       │   └── subscribers/         # Subscribes to telemetry topic, validates + persists readings
│       ├── repositories/        # Data access: sensor_repository (Postgres), sensor_redis_repository (cache)
│       ├── routes/              # Express routers, mounted under /api in routes/api.js
│       ├── sse/                 # In-memory Server-Sent Events client registry + broadcaster
│       └── server.js            # App bootstrap: Express, CORS, MQTT, Redis, cron init
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/        # Public login route group
│       │   ├── (dashboard)/dashboard/ # Protected route group: overview, devices, plants,
│       │   │                          # recommendations, analytics, notifications, settings, profile
│       │   ├── api/nextauth/[...nextauth]/route.ts  # NextAuth v5 handler
│       │   ├── layout.tsx / page.tsx
│       │   └── globals.css          # Tailwind v4 theme tokens (colors, fonts)
│       ├── components/
│       │   ├── common/              # Header, Sidebar, LoadingSpinner (shared across app)
│       │   ├── dashboard/           # Dashboard-specific widgets (StatCard, SensorGaugeCard, charts, nav)
│       │   └── devices/             # Device management modals/cards
│       ├── context/                 # AuthContext.tsx
│       ├── hooks/                   # useDevices, useDeviceStatus, usePlants, useSensorRealtime (SSE client)
│       ├── lib/auth.ts              # NextAuth v5 config (Google provider, backend token exchange)
│       ├── services/                # Axios/fetch wrappers per backend resource
│       ├── types/                   # Shared TypeScript types
│       └── utils/helpers.ts
│
├── .github/workflows/           # deploy-backend.yml, deploy-frontend.yml (build image -> GHCR -> VPS)
├── docker-compose.yml           # Production compose: pulls prebuilt backend/frontend images
└── docs/                        # This documentation tree
```

## Conventions

- Backend follows a **controller -> service/repository -> Prisma** layering; controllers never talk to Redis/MQTT/Prisma detail beyond simple queries, business logic (fuzzy inference, dosage math) lives in `src/ai`.
- Frontend follows **App Router route groups** (`(auth)`, `(dashboard)`) to separate public and protected layouts, with data access centralized in `src/services/*` and consumed through `src/hooks/*`.
- Each backend resource has a matching route file, controller file, and (where relevant) a `docs/api/*.md` file.
