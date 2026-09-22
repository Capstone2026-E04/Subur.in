# API Polybags

Data referensi read-only yang digunakan saat mendaftarkan device. Sebuah "polybag" adalah instance volume tanah tertentu yang diturunkan dari sebuah `PolybagType` (dimensi fisik).

## `GET /api/polybags`

**Perlu autentikasi:** Ya (`Authorization: Bearer <jwt>`)

Menampilkan semua instance polybag beserta dimensi dari tipenya yang diratakan (flattened) ke dalam response.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Daftar polybag berhasil diambil.",
  "data": [
    {
      "id": "d9a7e5f0-0000-0000-0000-000000000001",
      "name": "STANDAR",
      "diameter": 25.0,
      "height": 25.0,
      "soilVolumeLiter": 11.04
    }
  ]
}
```

`soilVolumeLiter` dan dimensi digunakan oleh [`ai/config/physical_presets.js`](../../backend/src/ai/config/physical_presets.js) untuk menghitung volume tanah yang dapat diisi, yang digunakan dalam perhitungan dosis. Data seed (`Kecil`, `Standar`) berada di [`backend/prisma/seed.js`](../../backend/prisma/seed.js).
