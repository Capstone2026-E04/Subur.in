# Konvensi Prisma

Schema: [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma). Client singleton: [`backend/src/database/connections/prisma_client.js`](../../backend/src/database/connections/prisma_client.js). Selalu import instance bersama tersebut (`const prisma = require('.../prisma_client')`) daripada membuat `new PrismaClient()` baru di controller/service, untuk menghindari habisnya connection pool.

## Penamaan

- Model menggunakan `PascalCase` (misalnya `RecommendationLog`); tabel dipetakan ke `snake_case` melalui `@@map` (misalnya `@@map("recommendation_logs")`).
- Field menggunakan `camelCase` di Prisma/JS; kolom dipetakan ke `snake_case` melalui `@map` (misalnya `phValue @map("ph_value")`). Selalu tambahkan keduanya saat menambah field baru. Nama yang menghadap JS harus terbaca alami dalam TypeScript/JS, kolom DB harus sesuai konvensi SQL snake_case proyek ini.
- ID menggunakan `@default(uuid()) @db.Uuid` untuk sebagian besar model. `Device.id` adalah pengecualian: sebuah natural key `varchar(50)` yang sesuai dengan identifier fisik perangkat (lihat [architecture/database-schema.md](../architecture/database-schema.md)).

## Pola query

- **Ownership-scoped reads/writes:** `prisma.device.findFirst({ where: { id, userId } })` sebelum melakukan update/delete apa pun pada resource milik user. Jangan pernah percaya `id` saja dari URL. Lihat [backend/coding-standards.md](../backend/coding-standards.md).
- **Pencarian nama case-insensitive:** `where: { name: { equals: value, mode: 'insensitive' } }`, digunakan oleh layer AI untuk me-resolve plant/polybag berdasarkan nama yang human-readable sebagai alternatif dari UUID (lihat [`ai/services/recommendation.service.js`](../../backend/src/ai/services/recommendation.service.js)).
- **Selective includes:** controller melakukan `include` hanya untuk relasi yang benar-benar dibutuhkan response (misalnya `plant`, `polybag: { include: { polybagType: true } }`) daripada blanket include, agar payload dan query tetap ringan.
- **Raw SQL untuk manajemen partisi:** `prisma.$queryRawUnsafe`/`$executeRawUnsafe` digunakan di [`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js) untuk mengelola partisi tabel Postgres, karena schema DSL Prisma tidak memodelkan partitioning. Nama tabel/partisi yang di-interpolasi ke dalam raw query ini dihasilkan secara internal (year/month), tidak pernah diambil dari input user. Jangan memperluas pola ini untuk menerima string eksternal tanpa parameterisasi.

## Mocking di unit test

Unit test (Jest) tidak pernah memanggil `prisma_client` sungguhan: mock seluruh modul lewat `jest.mock('.../database/connections/prisma_client', () => ({ <model>: { <method>: jest.fn() } }))`, lalu atur nilai kembalian per test dengan `mockResolvedValue`/`mockRejectedValue`. Lihat `src/__tests__/ai/services/recommendation.service.test.js` untuk contoh nyata, dan [backend/coding-standards.md](../backend/coding-standards.md#testing) untuk konvensi test secara umum.

## Meregenerasi client

Setelah perubahan apa pun pada `schema.prisma`:
```bash
cd backend
npx prisma generate
```
`npm run db:generate` di `package.json` adalah shortcut untuk ini.
