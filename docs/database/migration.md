# Migrations

The project uses `prisma db push` in production (no committed `prisma/migrations/` history) — see [`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml), which runs `docker compose exec -T backend npx prisma db push --skip-generate` after every backend deploy. Schema changes ship by editing `schema.prisma` and letting the next deploy push them.

## Local Development

```bash
cd backend
npx prisma db push       # fast iteration, no migration files, matches production's own strategy
```

If you want a reviewable migration history for a specific change (e.g. before a schema change that could be destructive), you can use:
```bash
npx prisma migrate dev --name <change-description>
```
but be aware this diverges from how production applies schema changes (`db push`) — a `migrate dev`-created `migrations/` folder is not currently consumed by the deploy pipeline. Treat `db push` as the source of truth unless the team deliberately adopts a migration-file workflow project-wide.

## Requirements

- `DIRECT_URL` must be set (non-pooled connection) — `db push`/`migrate` need session-level operations that a connection pooler (e.g. Supabase's PgBouncer-backed pooler) doesn't support. See [setup/environment.md](../setup/environment.md).

## Partition Management

`raw_sensor_logs` is range-partitioned by month at the SQL level, outside of Prisma's schema — `prisma db push` does **not** create/drop partitions. Partition creation and old-partition cleanup are handled at runtime by [`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js), which checks `pg_partitioned_table`/`pg_class` and issues raw `CREATE TABLE ... PARTITION OF` DDL as needed. If you change `RawSensorLog`'s columns in `schema.prisma`, verify the raw SQL in that cron file still matches the updated column set.

## Rollback

There's no automated rollback for `db push` (it's not migration-file based, so there's no "down" migration). To revert a bad schema change: edit `schema.prisma` back to the previous shape and run `db push` again — this is safe for additive/non-destructive changes but **can drop data** for column/type removals, so review `prisma db push`'s diff output (or run against a staging DB first) before pushing a destructive change to production.
