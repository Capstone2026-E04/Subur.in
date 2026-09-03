# Recommendations API

Exposes the fuzzy-logic recommendation engine ([architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic)) both as a standalone simulator and as device-bound history. To generate a fresh recommendation for a real device, see `GET /api/devices/:id/recommendation` in [devices.md](devices.md).

## `POST /api/recommendations/simulate`

Runs the fuzzy inference + dosage calculators with arbitrary inputs, without touching a real device or saving a log. Useful for testing plant/polybag combinations.

**Auth required:** No

**Request body:**
```json
{
  "phValue": 5.5,
  "moistureValue": 40.0,
  "polybagPreset": "STANDAR",
  "plantIdOrName": "Pakcoy"
}
```

`polybagPreset` and `plantIdOrName` each accept either a UUID or a case-insensitive name.

**Validation:**
- `phValue`, `moistureValue` required and numeric.
- `phValue` in `[0, 14]`, `moistureValue` in `[0, 100]`.
- `polybagPreset`, `plantIdOrName` required.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Simulasi Fuzzy Logic berhasil dijalankan!",
  "data": {
    "phValue": 5.5,
    "moistureValue": 40,
    "fuzzyIndex": 3.42,
    "categoryCode": "C5",
    "actionText": "pH tanah terlalu asam DAN tanah kering. Tambahkan kapur pertanian (dolomit) sesuai dosis, kemudian lakukan penyiraman sesuai volume yang direkomendasikan.",
    "waterVolumeLiter": 0.864,
    "limeDosageGram": 4.24,
    "sulfurDosageGram": 0,
    "reduceWatering": false,
    "_debug": {
      "inputClamped": { "ph": 5.5, "moisture": 40 },
      "membership": { "ph": {}, "moisture": {} },
      "activeRules": [],
      "yStar": 3.42,
      "categoryStar": 5,
      "polybagPresetUsed": "STANDAR",
      "areaM2": 0.03142,
      "volumeLiterUsed": 5,
      "plantUsed": "Pakcoy (Brassica rapa subsp. chinensis)",
      "phTarget": 6.8,
      "thetaTarget": 0.3
    }
  }
}
```

`_debug` exposes the intermediate fuzzy-inference state (membership degrees, active rules, defuzzified index) and is intended for developer/QA inspection, not end-user display.

**Error responses:** `400` (missing/invalid input), `500`.

## `GET /api/recommendations`

**Auth required:** Yes (`Authorization: Bearer <jwt>`)

Lists the authenticated user's recommendation history, newest first. Optionally filter by `deviceId`.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `deviceId` | string | Optional. Restrict to one device (must be owned by the caller). |

**Success response `200`:**
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

**Error responses:** `404` (`deviceId` given but not owned by caller), `401`, `500`.
