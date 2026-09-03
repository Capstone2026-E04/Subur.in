# Troubleshooting

## Backend fails to start / crashes on boot

MQTT, Redis, and cron initialization in [`server.js`](../../backend/src/server.js) are each wrapped in their own `try/catch` and only log a warning on failure — the HTTP server still starts. If `/api/health` reports `redis: "ERROR: ..."` or sensor data never updates, check MQTT/Redis credentials in `.env` rather than assuming the whole server crashed.

## `GET /api/health` reports database `DOWN`

Usually a bad `DATABASE_URL`/`DIRECT_URL` or the Supabase project pausing due to inactivity (free tier). Confirm the connection string works with `npx prisma db pull` from `backend/`.

## Google Sign-In succeeds on the frontend but backend session sync fails

`lib/auth.ts`'s `signIn` callback POSTs to `${API_URL}/api/auth/google` and returns `false` (silently blocking sign-in) if that call fails. Check:
- `NEXT_PUBLIC_API_URL_DEV`/`_PROD` points at a reachable backend.
- Backend's `GOOGLE_CLIENT_ID` matches the frontend's `AUTH_GOOGLE_ID` (the same Google OAuth Client, or an ID whose audience the backend accepts) — a mismatch fails `verifyIdToken` with a `401`.
- Backend logs (`Google Sign-In Controller Error`) for the underlying cause.

## `401 Unauthorized` on protected endpoints despite a fresh login

- Confirm the header is exactly `Authorization: Bearer <token>` (capital `B`, one space).
- The JWT expires after 7 days ([`auth.controller.js`](../../backend/src/controllers/auth.controller.js)) — sign in again.
- `JWT_SECRET` differing between the token-issuing deploy and the token-verifying deploy (e.g. after rotating the secret without invalidating old tokens) breaks verification for tokens issued before the rotation.

## Sensor data never appears on the dashboard

Trace the pipeline in order:
1. Is the device actually publishing? Check the broker's dashboard for connected clients on `suburin/devices/{id}/telemetry`.
2. Backend MQTT connection: look for `[MQTT Subscriber] Subscribe berhasil...` in backend logs at boot.
3. Payload validation: [`sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js) drops payloads where `ph`/`moisture` aren't valid numbers in range and creates an "invalid data" notification (rate-limited to once per hour per device).
4. `GET /api/sensors/:deviceId/latest` — if this 404s, nothing has been cached/persisted yet for that exact device ID (IDs are case-sensitive).
5. SSE stream (`GET /api/sensors/:deviceId/stream`) not updating live but `/latest` works: check for a proxy buffering `text/event-stream` (needs `X-Accel-Buffering: no` support, already set by the backend) or a browser extension blocking `EventSource`.

## Recommendation endpoint returns a 500 with a Prisma "not found" style error message

`generateRecommendation` throws when `plantIdOrName` or `polybagPreset` doesn't match a row (by UUID or case-insensitive name) — this bubbles up as a `500` from the controller. Confirm the device's `plantId`/`polybagId` still reference rows that exist (they shouldn't be deletable due to `onDelete: Restrict`, but data seeded/migrated out of band can still be inconsistent).

## `npx prisma migrate dev` / `db push` fails locally

Prisma needs `DIRECT_URL` (non-pooled) for schema changes — pooled connection strings (e.g. via PgBouncer/Supabase's pooler) often don't support the session-level locks migrations require. Confirm both `DATABASE_URL` and `DIRECT_URL` are set per [environment.md](environment.md).
