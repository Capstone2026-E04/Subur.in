# Backend Coding Standards

## Layering

`routes -> controllers -> (services / repositories) -> Prisma / Redis / MQTT`

- **Routes** (`src/routes/*.routes.js`) only wire HTTP verbs/paths to controller functions and mount `authMiddleware` where the resource requires auth (`router.use(authMiddleware)` at the top of the router, or per-route).
- **Controllers** (`src/controllers/*.controller.js`) parse/validate `req.body`/`req.params`/`req.query`, call into Prisma directly for simple CRUD, or delegate to a service (e.g. `ai/services/recommendation.service.js`) for business logic, and shape the JSON response. Every handler is wrapped in `try/catch` and returns the [standard envelope](../api/error-response.md) — there is no shared error-handling middleware.
- **Services** (`src/ai/services`) hold logic that doesn't belong to a single HTTP request/response shape — currently just recommendation generation.
- **Repositories** (`src/repositories`) wrap raw Prisma/Redis calls for sensor data specifically, giving controllers a cache-then-db read pattern (`getLatestSensorData` -> fallback `getLatestSensorLog`) without duplicating that fallback logic in every caller.
- **AI engine** (`src/ai/core`, `src/ai/dosage`, `src/ai/utils`) is pure, I/O-free logic — no Prisma/Express imports — so it stays unit-testable in isolation.

## Style

- CommonJS (`require`/`module.exports`) throughout the backend — the frontend uses ESM/TypeScript, these do not need to match.
- User-facing `message` strings are in Indonesian; keep new ones consistent with the existing tone (`"... berhasil ..."` for success, `"Terjadi kesalahan saat ..."` for generic server errors).
- Resource ownership checks use `prisma.<model>.findFirst({ where: { id, userId } })` and return `404` (not `403`) when the row doesn't belong to the caller — see [api/error-response.md](../api/error-response.md#authorization-vs-not-found). Follow this pattern for any new user-owned resource.
- Prefer `Number(x)`/`parseFloat`/`parseInt` with an explicit `isNaN`/`Number.isInteger` check over trusting request body types — request bodies are untyped JSON.

## Adding a New Endpoint

1. Add the Prisma model/fields if needed ([database/prisma.md](../database/prisma.md)).
2. Add a controller function in the matching `*.controller.js` (or a new file for a new resource).
3. Wire it in the matching `*.routes.js`, mounting `authMiddleware` if the resource is user-owned.
4. Mount a new router in [`routes/api.js`](../../backend/src/routes/api.js) if it's a new resource, and add it to the `GET /api` endpoint listing.
5. Document it in `docs/api/<resource>.md`, following the existing files' structure (endpoint, auth requirement, request/response JSON, error table).

## Testing

Only `src/ai/__tests__` currently has tests (the fuzzy engine and dosage calculators — pure functions, easy to assert against). `npm test` at the backend root is not wired to anything (`package.json`'s `test` script is a placeholder).
