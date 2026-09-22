# Format Response Error

Setiap endpoint mengembalikan JSON dengan envelope `success` yang konsisten, dibentuk lewat helper bersama [`utils/response.js`](../../backend/src/utils/response.js) (`sendSuccess`/`sendError`), bukan `res.json({...})` yang ditulis manual per controller.

Error tak terduga (exception yang tidak ditangani lokal di controller) diteruskan lewat `next(error)` ke [middleware error terpusat](../../backend/src/middlewares/error.middleware.js), yang mengklasifikasikan error lewat [`AppError`](../../backend/src/errors/AppError.js) (`statusCode`, `isOperational`) sebelum membentuk response akhir. Controller hanya menangani sendiri kasus yang memang butuh respons lokal (misalnya health check, webhook Telegram yang wajib membalas `200`).

## Envelope

**Sukses:**
```json
{
  "success": true,
  "message": "Daftar device Anda berhasil diambil.",
  "data": {}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Device tidak ditemukan atau Anda tidak memiliki akses.",
  "errors": null
}
```

- `message` adalah string yang mudah dibaca manusia (dalam Bahasa Indonesia, konsisten dengan bagian API lainnya) dan aman ditampilkan ke end user.
- `errors` diisi hanya untuk validasi multi-field (belum ada endpoint yang memakainya saat ini); `null` di kasus lain. Body response **tidak pernah** menyertakan stack trace atau pesan error internal mentah (mis. error Prisma/driver) — itu hanya dicatat di log server, tidak dikirim ke client.
- Error operasional (`isOperational: true`, misalnya "Device tidak ditemukan") mengirim `err.message` apa adanya sebagai `message`. Error non-operasional (bug/exception tak terduga) selalu mengirim pesan generik `"Terjadi kesalahan pada server"`, apa pun isi `error.message` aslinya.

## Kode Status

| Kode | Arti | Contoh |
|---|---|---|
| `200` | Sukses | Resource berhasil diambil/diperbarui/dihapus |
| `201` | Dibuat | Device berhasil didaftarkan, notifikasi uji coba dibuat |
| `400` | Bad request / gagal validasi | Field wajib tidak ada, nilai di luar rentang |
| `401` | Tidak terautentikasi | Header `Authorization` tidak ada/tidak valid, ID token Google tidak valid, JWT kedaluwarsa |
| `404` | Tidak ditemukan / bukan milik pemanggil | Device, notifikasi, user, tanaman, atau polybag tidak ditemukan untuk request yang bersangkutan |
| `500` | Error server yang tidak tertangani | Error database, exception yang tidak terduga |

## Authorization vs. Not Found

Endpoint yang scoped ke resource (devices, notifications) sengaja mengembalikan `404` alih-alih `403` ketika sebuah resource ada tetapi dimiliki oleh user lain, sehingga keberadaan suatu ID resource tidak terkonfirmasi kepada pemanggil yang bukan pemiliknya. Lihat [`device.controller.js`](../../backend/src/controllers/device.controller.js) pada `updateDevice`/`deleteDevice` untuk pola ini (`findFirst({ where: { id, userId } })`).

## Menambahkan error handling pada kode baru

- Gunakan `sendSuccess`/`sendError` dari `utils/response.js`, jangan menulis ulang `res.status(x).json({...})`.
- Untuk kondisi yang controller bisa tangani secara berarti di tempat (validasi input, "tidak ditemukan"), langsung `return sendError(res, statusCode, message)`.
- Untuk error tak terduga (query DB gagal, exception dari service), tangkap di `catch`, log dengan konteks (`message`, `stack`, id relevan), lalu `return next(error)` — jangan bentuk response 500 manual.
- Kalau service/lapisan bisnis (bukan controller) perlu melempar error dengan status HTTP tertentu (400/404), lempar `new AppError(message, statusCode)` alih-alih `Error`/`TypeError`/`RangeError` generik, supaya middleware terpusat tahu cara mengklasifikasikannya. Lihat [`ai/services/recommendation.service.js`](../../backend/src/ai/services/recommendation.service.js) dan [`ai/config/physical_presets.js`](../../backend/src/ai/config/physical_presets.js) untuk contoh.
