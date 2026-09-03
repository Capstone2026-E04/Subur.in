# Seeding

Seed script: [`backend/prisma/seed.js`](../../backend/prisma/seed.js), configured as Prisma's seed entrypoint in `package.json`:
```json
"prisma": { "seed": "node prisma/seed.js" }
```

## Running

```bash
cd backend
npm run db:seed
```
(equivalent to `node prisma/seed.js`, or `npx prisma db seed`)

## What It Does

The seed is **destructive-then-recreate** for reference data — it deletes existing rows before inserting fresh ones, in dependency order:
1. Deletes all `Device` rows, then all `Plant` rows (devices reference plants with `onDelete: Restrict`, so plants must be cleared after devices).
2. Inserts 3 plants: **Bayam** (`Spinacia oleracea`), **Pakcoy** (`Brassica rapa subsp. chinensis`), **Selada** (`Lactuca sativa`) — each with `minPh`/`maxPh`/`phTarget` used by the fuzzy engine.
3. Deletes all `Polybag` rows, then all `PolybagType` rows.
4. Inserts 2 polybag types (**Kecil**: 20cm diameter x 25cm height, **Standar**: 25cm x 25cm) and one `Polybag` instance per type with a precomputed `soilVolumeLiter`.

Because it deletes `Device` rows, **do not run this against a production database with real registered devices** — it will unregister every device. It's meant for local/dev database initialization.

## Extending

To add a new plant or polybag type, add an object to the corresponding array in `seed.js` — no other code changes needed, since the recommendation engine looks plants/polybags up by name or UUID at request time rather than hardcoding the seeded set. Keep `minPh`/`maxPh`/`phTarget` realistic for the species; they directly drive irrigation/lime/sulfur dosage math (see [architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic)).
