# Format Response Error

Setiap endpoint mengembalikan JSON dengan envelope `success` yang konsisten. Tidak ada middleware penanganan error global, setiap controller menangani errornya sendiri dan membentuk response-nya, sehingga bentuk di bawah ini adalah sebuah konvensi, bukan sesuatu yang dipaksakan di seluruh framework.

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
  "error": "optional lower-level error detail, present on 5xx and some 4xx"
}
```

- `message` adalah string yang mudah dibaca manusia (dalam Bahasa Indonesia, konsisten dengan bagian API lainnya) dan aman ditampilkan ke end user.
- `error` hanya disertakan pada beberapa response dan berpotensi membocorkan pesan error internal (misalnya error Prisma/driver pada 500). Perlakukan sebagai informasi debug, bukan sesuatu yang langsung ditampilkan di UI.

## Kode Status

| Kode | Arti | Contoh |
|---|---|---|
| `200` | Sukses | Resource berhasil diambil/diperbarui/dihapus |
| `201` | Dibuat | Device berhasil didaftarkan, notifikasi uji coba dibuat |
| `400` | Bad request / gagal validasi | Field wajib tidak ada, nilai di luar rentang |
| `401` | Tidak terautentikasi | Header `Authorization` tidak ada/tidak valid, ID token Google tidak valid, JWT kedaluwarsa |
| `404` | Tidak ditemukan / bukan milik pemanggil | Device, notifikasi, atau user tidak ditemukan untuk user yang terautentikasi |
| `500` | Error server yang tidak tertangani | Error database, exception yang tidak terduga |

## Authorization vs. Not Found

Endpoint yang scoped ke resource (devices, notifications) sengaja mengembalikan `404` alih-alih `403` ketika sebuah resource ada tetapi dimiliki oleh user lain, sehingga keberadaan suatu ID resource tidak terkonfirmasi kepada pemanggil yang bukan pemiliknya. Lihat [`device.controller.js`](../../backend/src/controllers/device.controller.js) pada `updateDevice`/`deleteDevice` untuk pola ini (`findFirst({ where: { id, userId } })`).
