# Environment Variables

Never commit real values — `.env` / `.env.local` are gitignored. Copy the matching `.env.example` and fill in real values locally or in your deployment secrets manager.

## Backend (`backend/.env`)

| Variable                          | Purpose                                                                           | Where to get it                                                     |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `PORT`                            | HTTP port the Express server listens on                                           | Your choice, default `3000`                                         |
| `DB_PASSWORD`                     | Database password (referenced by connection string)                               | Your Postgres/Supabase project                                      |
| `DATABASE_URL`                    | Pooled Postgres connection string used by Prisma at runtime                       | Supabase project settings -> Database -> Connection string          |
| `DIRECT_URL`                      | Direct (non-pooled) Postgres connection string, required by Prisma for migrations | Supabase project settings -> Database -> Connection string (direct) |
| `GOOGLE_CLIENT_ID`                | OAuth Client ID used to verify Google ID tokens                                   | Google Cloud Console -> APIs & Services -> Credentials              |
| `GOOGLE_CLIENT_SECRET`            | OAuth Client Secret (paired with the above)                                       | Google Cloud Console -> APIs & Services -> Credentials              |
| `JWT_SECRET`                      | Signing secret for backend session JWTs                                           | Generate a long random string yourself, e.g. `openssl rand -hex 32` |
| `MQTT_BROKER_URL`                 | MQTT broker URL (`mqtts://...`)                                                   | Your EMQX Cloud (or other broker) deployment                        |
| `MQTT_PORT`                       | MQTT broker TLS port                                                              | Broker dashboard, typically `8883`                                  |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | MQTT client credentials                                                           | Broker dashboard                                                    |
| `UPSTASH_REDIS_REST_URL`          | Redis REST endpoint                                                               | Upstash console -> your database -> REST API                        |
| `UPSTASH_REDIS_REST_TOKEN`        | Redis REST auth token                                                             | Upstash console -> your database -> REST API                        |
| `SENSOR_THROTTLE_SECONDS`         | Minimum seconds between raw sensor log writes per device                          | Your choice, default `30`                                           |

## Frontend (`frontend/.env.local`)

| Variable                   | Purpose                                        | Where to get it                                                                                               |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`                     | Port the Next.js dev server listens on         | Your choice, default `3001`                                                                                   |
| `AUTH_SECRET`              | NextAuth v5 session encryption secret          | Generate: `npx auth secret` or `openssl rand -hex 32`                                                         |
| `AUTH_GOOGLE_ID`           | Google OAuth Client ID (frontend-side sign-in) | Google Cloud Console -> APIs & Services -> Credentials (can match the backend's, or be a separate Web client) |
| `AUTH_GOOGLE_SECRET`       | Google OAuth Client Secret                     | Google Cloud Console -> APIs & Services -> Credentials                                                        |
| `NEXT_PUBLIC_API_URL_DEV`  | Backend base URL used in development           | Your local backend, e.g. `http://localhost:3000`                                                              |
| `NEXT_PUBLIC_API_URL_PROD` | Backend base URL used in production builds     | Your deployed backend origin                                                                                  |

`src/services/api.ts` picks `NEXT_PUBLIC_API_URL_PROD` when `NODE_ENV === "production"`, otherwise `NEXT_PUBLIC_API_URL_DEV` (falling back to `http://localhost:3000`).

## Google OAuth Setup Notes

Both apps verify/exchange Google ID tokens, so the OAuth Client must have:

- Authorized JavaScript origins including your frontend URL(s) (e.g. `http://localhost:3001`, your production domain).
- Authorized redirect URI `<frontend-url>/api/nextauth/callback/google` (NextAuth's `basePath` is `/api/nextauth`, see [`frontend/src/lib/auth.ts`](../../frontend/src/lib/auth.ts)).
