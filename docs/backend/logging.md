# Logging

There is no structured logging library (no Winston/Pino) — logging is plain `console.log`/`console.error`, with a `[Subsystem]` prefix convention so log lines can be grepped by origin.

## Prefix Convention

| Prefix | Subsystem |
|---|---|
| `[MQTT]` | Connection lifecycle ([`mqtt/connection.js`](../../backend/src/mqtt/connection.js)) |
| `[MQTT Subscriber]` | Telemetry ingestion ([`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js)) |
| `[MQTT Publish]` | Outgoing config publishes ([`mqtt/publishers/config_publisher.js`](../../backend/src/mqtt/publishers/config_publisher.js)) |
| `[Redis]` | Redis client init ([`database/connections/redis.js`](../../backend/src/database/connections/redis.js)) |
| `[Cron]` | Scheduled jobs ([`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js)) |
| `[Sensor Controller]` | `sensor.controller.js` request handlers |
| `[Update Device]` / `[Prisma History Query]` | Ad-hoc per-operation prefixes in device/sensor controllers |

Controller-level errors are logged with a descriptive label matching the operation (e.g. `console.error('Get Device Recommendation Error:', error)`) rather than the `[Subsystem]` bracket style — reserve brackets for background/infrastructure subsystems (MQTT, Redis, cron) that don't have a request/response to attach the error to.

## What Gets Logged

- Every controller catch-block logs the raw error via `console.error` before returning the sanitized `message`/`error` response (see [api/error-response.md](../api/error-response.md)).
- MQTT: subscribe success/failure, invalid payloads (with the raw device ID and data), publish failures.
- Cron: partition creation/skip decisions, cleanup results.
- Server boot ([`server.js`](../../backend/src/server.js)): one line per subsystem init attempt, success or caught failure — this is the fastest way to tell which optional subsystem (MQTT/Redis/cron) failed to come up without the whole process crashing.

## Metrics

Separately from logs, [`routes/api.js`](../../backend/src/routes/api.js) exposes `GET /api/metrics` via `prom-client` with Node.js default metrics registered (`collectDefaultMetrics`) — no custom application metrics are defined yet. Point a Prometheus scraper at this endpoint for process-level monitoring (event loop lag, memory, GC).

## Adding Logging to New Code

- Background/infrastructure code (new MQTT topic, new cron job): pick a `[Subsystem]` prefix and stay consistent within that file.
- Request handlers: log the error object in the `catch` block with a short label describing the operation, matching the existing controllers.
- Never log secrets (`JWT_SECRET`, tokens, MQTT/Redis credentials) — `server.js` currently logs `process.env.DATABASE_URL` on boot for debugging; avoid extending that pattern to files carrying application secrets and consider removing it before hardening logs for a shared environment.
