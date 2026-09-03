# Polybags API

Read-only reference data used when registering a device. A "polybag" is a specific soil-volume instance derived from a `PolybagType` (physical dimensions).

## `GET /api/polybags`

**Auth required:** Yes (`Authorization: Bearer <jwt>`)

Lists all polybag instances with their type's dimensions flattened into the response.

**Success response `200`:**
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

`soilVolumeLiter` and dimensions are used by [`ai/config/physical_presets.js`](../../backend/src/ai/config/physical_presets.js) to compute the fillable soil volume used in dosage calculations. Seed data (`Kecil`, `Standar`) lives in [`backend/prisma/seed.js`](../../backend/prisma/seed.js).
