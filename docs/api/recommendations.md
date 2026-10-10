# API Recommendations

Mengekspos mesin rekomendasi fuzzy logic ([architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic)) baik sebagai simulator mandiri maupun sebagai riwayat yang terikat ke device. Untuk menghasilkan rekomendasi baru bagi device sungguhan, lihat `GET /api/devices/:id/recommendation` pada [devices.md](devices.md).

## `POST /api/recommendations/simulate`

Menjalankan fuzzy inference + kalkulator dosis dengan input bebas, tanpa menyentuh device sungguhan atau menyimpan log. Berguna untuk menguji kombinasi pH, NMI, dan tanaman pada preset polybag prototipe (20x20 cm, media 2 L).

**Perlu autentikasi:** Tidak

**Request body:**
```json
{
  "phValue": 5.5,
  "moistureValue": 40.0,
  "plantIdOrName": "Pakcoy"
}
```

`plantIdOrName` dapat berupa UUID atau nama (tidak case-sensitive).

**Validasi:**
- `phValue`, `moistureValue` wajib diisi dan berupa angka.
- `phValue` pada rentang `[0, 14]`, `moistureValue` pada rentang `[0, 100]`.
- `plantIdOrName` wajib diisi.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Simulasi Fuzzy Logic berhasil dijalankan!",
  "data": {
    "phValue": 5.5,
    "moistureValue": 40,
    "fuzzyIndex": 1,
    "categoryCode": "C5",
    "actionText": "pH media terlalu asam dan media kering. Pertimbangkan dolomit, lalu siram sesuai estimasi volume.",
    "waterAction": "IRRIGATE",
    "phAction": "LIME",
    "phCorrection": { "status": "READY", "reasons": [] },
    "waterVolumeLiter": 0.3,
    "limeDosageGram": 8.45,
    "sulfurDosageGram": 0,
    "reduceWatering": false,
    "_debug": {
      "membership": { "ph": {}, "moisture": {} },
      "activeRules": [],
      "aggregation": { "C5": 1 },
      "polybagPresetUsed": "STANDAR",
      "areaM2": 0.03142,
      "volumeLiterUsed": 5,
      "plantUsed": "Pakcoy (Brassica rapa subsp. chinensis)",
      "phTarget": 6.8,
      "nmiTrigger": 60,
      "nmiTarget": 80
    }
  }
}
```

`moistureValue` adalah NMI (0-100). `fuzzyIndex` adalah kekuatan aturan terlemah dari kedua keputusan final (0-1). `phCorrection.status` bernilai `NONE`, `READY`, `DEFERRED`, atau `NEEDS_CONFIRMATION`; dosis kapur/sulfur hanya terisi saat `READY`. Tanaman selain Selada/Bayam/Pakcoy ditolak `422`.

`_debug` mengekspos state fuzzy inference antara (derajat keanggotaan, rule aktif, agregasi per kategori) dan dimaksudkan untuk pemeriksaan developer/QA, bukan untuk ditampilkan ke end user.

**Response error:** `400` (input tidak ada/tidak valid), `404` (tanaman tidak ditemukan), `422` (tanaman tanpa parameter NMI), `500`.

## `GET /api/recommendations`

**Perlu autentikasi:** Ya (`Authorization: Bearer <jwt>`)

Menampilkan riwayat rekomendasi milik user yang terautentikasi, terbaru lebih dulu. Dapat difilter berdasarkan `deviceId`.

**Query params:**
| Param | Tipe | Deskripsi |
|---|---|---|
| `deviceId` | string | Opsional. Membatasi ke satu device (harus dimiliki oleh pemanggil). |

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Riwayat rekomendasi berhasil diambil.",
  "data": {
    "logs": [
      {
        "id": "e1a2b3c4-...",
        "deviceId": "ESP32-A1B2C3",
        "phValue": 5.5,
        "moistureValue": 40,
        "fuzzyIndex": 3.42,
        "categoryCode": "C5",
        "actionText": "pH tanah terlalu asam DAN tanah kering...",
        "waterVolumeLiter": 0.864,
        "limeDosageGram": 4.24,
        "sulfurDosageGram": 0,
        "reduceWatering": false,
        "createdAt": "2026-09-03T10:00:00.000Z",
        "device": {
          "id": "ESP32-A1B2C3",
          "label": "Pakcoy Balkon",
          "plant": { "name": "Pakcoy", "scientificName": "Brassica rapa subsp. chinensis" }
        }
      }
    ]
  }
}
```

**Response error:** `404` (`deviceId` diberikan tapi bukan milik pemanggil), `401`, `500`.
