# Plants API

Read-only reference data used when registering a device.

## `GET /api/plants`

**Auth required:** Yes (`Authorization: Bearer <jwt>`)

Lists all plant species, ordered by name ascending.

**Success response `200`:**
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

`minPh`/`maxPh`/`phTarget` feed directly into the fuzzy recommendation engine — see [architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic). Seed data (`Bayam`, `Pakcoy`, `Selada`) lives in [`backend/prisma/seed.js`](../../backend/prisma/seed.js).
