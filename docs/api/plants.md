# API Plants

Data referensi read-only yang digunakan saat mendaftarkan device.

## `GET /api/plants`

**Perlu autentikasi:** Ya (`Authorization: Bearer <jwt>`)

Menampilkan semua spesies tanaman, diurutkan berdasarkan nama secara ascending.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Daftar tanaman berhasil diambil.",
  "data": [
    {
      "id": "b6f1c2e0-0000-0000-0000-000000000001",
      "name": "Bayam",
      "scientificName": "Spinacia oleracea",
      "description": "Sayuran hijau kaya zat besi dan vitamin...",
      "minPh": 6.0,
      "maxPh": 7.0,
      "phTarget": 6.5,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

`minPh`/`maxPh`/`phTarget` langsung digunakan sebagai input mesin rekomendasi fuzzy, lihat [architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic). Data seed (`Bayam`, `Pakcoy`, `Selada`) berada di [`backend/prisma/seed.js`](../../backend/prisma/seed.js).
