# Prisma Conventions

Schema: [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma). Client singleton: [`backend/src/database/connections/prisma_client.js`](../../backend/src/database/connections/prisma_client.js) — always import that shared instance (`const prisma = require('.../prisma_client')`) rather than instantiating `new PrismaClient()` in controllers/services, to avoid exhausting the connection pool.

## Naming

- Models use `PascalCase` (e.g. `RecommendationLog`); tables are mapped to `snake_case` via `@@map` (e.g. `@@map("recommendation_logs")`).
- Fields use `camelCase` in Prisma/JS; columns map to `snake_case` via `@map` (e.g. `phValue @map("ph_value")`). Always add both when adding a new field — the JS-facing name should read naturally in TypeScript/JS, the DB column should match the project's snake_case SQL convention.
- IDs are `@default(uuid()) @db.Uuid` for most models. `Device.id` is the exception — a natural `varchar(50)` key matching the physical device identifier (see [architecture/database-schema.md](../architecture/database-schema.md)).

## Query Patterns

- **Ownership-scoped reads/writes:** `prisma.device.findFirst({ where: { id, userId } })` before any update/delete on a user-owned resource — never trust `id` alone from the URL. See [backend/coding-standards.md](../backend/coding-standards.md).
- **Case-insensitive name lookup:** `where: { name: { equals: value, mode: 'insensitive' } }`, used by the AI layer to resolve a plant/polybag by human-readable name as an alternative to UUID (see [`ai/services/recommendation.service.js`](../../backend/src/ai/services/recommendation.service.js)).
- **Selective includes:** controllers `include` only the relations a response actually needs (e.g. `plant`, `polybag: { include: { polybagType: true } }`) rather than a blanket include, to keep payloads and queries lean.
- **Raw SQL for partition management:** `prisma.$queryRawUnsafe`/`$executeRawUnsafe` are used in [`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js) to manage Postgres table partitions, since Prisma's schema DSL doesn't model partitioning. Table/partition names interpolated into these raw queries are generated internally (year/month), never taken from user input — do not extend this pattern to accept external strings without parameterization.

## Regenerating the Client

After any `schema.prisma` change:
```bash
cd backend
npx prisma generate
```
`npm run db:generate` in `package.json` is a shortcut for this.
