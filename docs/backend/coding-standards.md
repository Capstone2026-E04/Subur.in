# Standar coding backend

## Layering

`routes -> controllers -> (services / repositories) -> Prisma / Redis / MQTT`

- **Routes** (`src/routes/*.routes.js`) hanya menghubungkan verb/path HTTP ke fungsi controller dan memasang `authMiddleware` di tempat resource memerlukan auth (`router.use(authMiddleware)` di bagian atas router, atau per-route).
- **Controllers** (`src/controllers/*.controller.js`) mem-parsing/memvalidasi `req.body`/`req.params`/`req.query`, memanggil Prisma secara langsung untuk CRUD sederhana, atau mendelegasikan ke service (misalnya `ai/services/recommendation.service.js`, `services/notification.service.js`) untuk logika bisnis, dan membentuk response JSON. Setiap handler dibungkus dalam `try/catch` dan mengembalikan [format response standar](../api/error-response.md); tidak ada middleware penanganan error bersama.
- **Services** menampung logika yang tidak terikat pada satu bentuk request/response HTTP, dan dipisah berdasarkan concern: `src/ai/services` (pembuatan rekomendasi, berdampingan dengan mesin AI murni) dan `src/services` (concern lintas-fungsi yang digunakan dari banyak call site: `notification.service.js` menyebarkan notifikasi ke Postgres/SSE/Telegram, `telegram.service.js` membungkus Bot API).
- **Repositories** (`src/repositories`) membungkus panggilan Prisma/Redis mentah khusus untuk data sensor, memberikan controller pola baca cache-lalu-db (`getLatestSensorData` -> fallback `getLatestSensorLog`) tanpa menduplikasi logika fallback tersebut di setiap pemanggil.
- **AI engine** (`src/ai/core`, `src/ai/dosage`, `src/ai/utils`) adalah logika murni tanpa I/O (tanpa import Prisma/Express), sehingga tetap dapat diuji secara terisolasi.

## Gaya penulisan

- CommonJS (`require`/`module.exports`) digunakan di seluruh backend. Frontend menggunakan ESM/TypeScript, keduanya tidak perlu selaras.
- String `message` yang ditujukan ke user menggunakan Bahasa Indonesia; jaga string baru tetap konsisten dengan nada yang sudah ada (`"... berhasil ..."` untuk sukses, `"Terjadi kesalahan saat ..."` untuk error server umum).
- Pemeriksaan kepemilikan resource menggunakan `prisma.<model>.findFirst({ where: { id, userId } })` dan mengembalikan `404` (bukan `403`) ketika baris data bukan milik pemanggil. Lihat [api/error-response.md](../api/error-response.md#authorization-vs-not-found). Ikuti pola ini untuk resource baru yang dimiliki user.
- Utamakan `Number(x)`/`parseFloat`/`parseInt` dengan pemeriksaan `isNaN`/`Number.isInteger` eksplisit daripada mempercayai tipe body request, karena body request adalah JSON tanpa tipe.

## Menambahkan endpoint baru

1. Tambahkan model/field Prisma jika diperlukan ([database/prisma.md](../database/prisma.md)).
2. Tambahkan fungsi controller di `*.controller.js` yang sesuai (atau file baru untuk resource baru).
3. Pasang di `*.routes.js` yang sesuai, memasang `authMiddleware` jika resource dimiliki user.
4. Pasang router baru di [`routes/api.js`](../../backend/src/routes/api.js) jika ini resource baru, dan tambahkan ke daftar endpoint `GET /api`.
5. Dokumentasikan di `docs/api/<resource>.md`, mengikuti struktur file yang sudah ada (endpoint, kebutuhan auth, JSON request/response, tabel error).

## Testing

Saat ini hanya `src/ai/__tests__` yang memiliki test (mesin fuzzy dan kalkulator dosis, fungsi murni yang mudah diuji). `npm test` di root backend belum terhubung ke apa pun (script `test` pada `package.json` masih placeholder).
