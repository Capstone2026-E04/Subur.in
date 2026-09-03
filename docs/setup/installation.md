# Installation

## Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (the project targets Supabase in production, but any Postgres works locally)
- A Redis instance (the project targets Upstash Redis REST API in production)
- An MQTT broker reachable over TLS (the project targets EMQX Cloud)
- A Google Cloud OAuth 2.0 Client ID (Web application) for Google Sign-In

## 1. Clone

```bash
git clone https://github.com/Capstone2026-E04/Subur.in.git
cd Subur.in
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in the values, see setup/environment.md
npx prisma generate
npx prisma db push       # or: npx prisma migrate dev, see database/migration.md
npm run db:seed          # seeds plants + polybag types
npm run dev              # nodemon, http://localhost:3000
```

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in the values, see setup/environment.md
npm run dev                  # http://localhost:3001 (or PORT from .env.local)
```

## 4. Verify

- Backend: `GET http://localhost:3000/api/health` should return `{"status":"UP", ...}`.
- Backend: `GET http://localhost:3000/api` lists all available endpoints.
- Frontend: open the dev server URL, you should land on `/login`; signing in with Google should sync a session with the backend.

## Running Both with Docker Compose

The root [`docker-compose.yml`](../../docker-compose.yml) is a **production** compose file — it pulls prebuilt images from GHCR rather than building from source, and is meant for the deployment VPS, not local development. For local development, run each app with `npm run dev` as above. See [deployment.md](deployment.md) for how images are built and shipped.
