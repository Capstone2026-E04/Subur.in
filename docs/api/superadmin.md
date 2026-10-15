# API Superadmin

Endpoint khusus user dengan `role = SUPERADMIN` untuk melihat seluruh data di database. Semua endpoint memerlukan `Authorization: Bearer <jwt>` ([authentication.md](authentication.md)) **dan** role `SUPERADMIN` yang dicek ke database pada setiap request ([backend/authentication.md](../backend/authentication.md#otorisasi-berbasis-role-middlewaressuperadminmiddlewarejs)).

| Status | Penyebab |
|---|---|
| `401` | Token tidak ada/tidak valid |
| `403` | User login tetapi bukan `SUPERADMIN` (`Akses ditolak. Fitur ini hanya untuk Superadmin.`) |

Role diberikan hanya lewat Supabase Dashboard, misalnya:

```sql
UPDATE public.users SET role = 'SUPERADMIN' WHERE email = 'budi@gmail.com';
```

## `GET /api/superadmin/overview`

Jumlah baris untuk setiap tabel yang dapat dilihat.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Ringkasan data berhasil diambil.",
  "data": {
    "overview": {
      "users": 5,
      "devices": 1,
      "plants": 3,
      "recommendations": 142,
      "corrections": 0,
      "sensor-logs": 102,
      "notifications": 6
    }
  }
}
```

## `GET /api/superadmin/device-options`

Semua perangkat dari semua user, untuk pemilih perangkat (grafik dan filter).

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Daftar perangkat berhasil diambil.",
  "data": {
    "devices": [
      {
        "id": "7011204b-e88e-4504-8b67-c9e2f86ff986",
        "label": "Contoh bayam",
        "deviceCode": "node_1",
        "user": { "name": "Budi Santoso", "email": "budi@gmail.com" }
      }
    ]
  }
}
```

## `GET /api/superadmin/sensor-history`

Pembacaan sensor terakhir dari satu perangkat mana pun, urut menaik menurut waktu (untuk grafik).

| Query | Aturan |
|---|---|
| `deviceId` | Wajib, UUID valid |
| `limit` | Opsional, bawaan 100, maksimal 500 |

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Riwayat sensor berhasil diambil.",
  "data": {
    "items": [
      { "id": 462, "timestamp": "2026-10-15T13:22:41.561Z", "ph": 9.8, "moisture": 35 }
    ]
  }
}
```

**Response error:** `400` (`deviceId` bukan UUID).

## `GET /api/superadmin/:resource`

Daftar data tabel dengan paginasi, urutan, pencarian, dan filter. `:resource` hanya boleh salah satu dari daftar di bawah; nilai lain menghasilkan `404`.

| `:resource` | Tabel | Urutan bawaan |
|---|---|---|
| `users` | `users` | `createdAt` turun |
| `devices` | `devices` (+ pemilik dan tanaman) | `createdAt` turun |
| `plants` | `plants` | `name` naik |
| `recommendations` | `recommendation_logs` | `createdAt` turun |
| `corrections` | `correction_logs` | `appliedAt` turun |
| `sensor-logs` | `raw_sensor_logs` | `timestamp` turun |
| `notifications` | `notifications` | `createdAt` turun |

Kolom `password_hash`, `telegram_link_code`, dan `telegram_link_code_expires_at` tidak pernah disertakan pada `users`.

### Query umum

| Query | Aturan |
|---|---|
| `page` | Bilangan bulat positif, bawaan 1 |
| `limit` | Bawaan 20, maksimal 100 |
| `sortBy` | Salah satu kolom yang boleh diurutkan untuk resource tersebut (tabel di bawah); nilai lain `400` |
| `order` | `asc` atau `desc`. Bila `sortBy` diberikan tanpa `order`, bawaannya `asc` |
| `search` | Teks, maksimal 100 karakter, pencarian mengandung (`contains`) tanpa membedakan huruf besar/kecil pada kolom pencarian resource |
| `from`, `to` | Tanggal ISO 8601; membatasi kolom waktu utama resource (`gte` dan `lte`) |

Semua parameter harus berupa string tunggal; parameter berulang (array) ditolak `400`. Urutan selalu ditambah `id` sebagai pembeda agar paginasi stabil.

### Kolom per resource

| Resource | `sortBy` yang diizinkan | Kolom `search` | Filter |
|---|---|---|---|
| `users` | `name`, `email`, `role`, `createdAt` | `name`, `email` | `role` (`USER`/`SUPERADMIN`), `telegramNotifyEnabled` (`true`/`false`) |
| `devices` | `label`, `deviceCode`, `user.email`, `plant.name`, `status`, `sensorInterval`, `lastSeenAt`, `createdAt` | `label`, `deviceCode`, `user.name`, `user.email`, `plant.name` | `status` (`ACTIVE`/`INACTIVE`/`OFFLINE`) |
| `plants` | `name`, `minPh`, `maxPh`, `phTarget`, `createdAt` | `name`, `scientificName` | - |
| `recommendations` | `createdAt`, `device.label`, `phValue`, `moistureValue`, `categoryCode`, `waterVolumeLiter`, `limeDosageGram`, `sulfurDosageGram` | `actionText`, `device.label` | `deviceId`, `reduceWatering`, `isDev` |
| `corrections` | `appliedAt`, `device.label`, `type`, `method`, `doseGram`, `phBefore` | `device.label` | `deviceId`, `type` (`LIME`/`SULFUR`), `method` (`INCORPORATION`/`TOP_DRESSING`) |
| `sensor-logs` | `timestamp`, `device.label`, `ph`, `moisture` | `device.label` | `deviceId`, `isDev` |
| `notifications` | `createdAt`, `device.label`, `title`, `type`, `isRead` | `title`, `message`, `device.label` | `deviceId`, `type` (`warning`/`success`/`info`), `isRead` |

Filter `deviceId` harus UUID, filter boolean hanya menerima `true` atau `false`, filter enum hanya menerima nilai yang tercantum. Filter yang tidak terdaftar untuk resource tersebut diabaikan.

**Contoh:** `GET /api/superadmin/sensor-logs?deviceId=7011204b-e88e-4504-8b67-c9e2f86ff986&isDev=false&sortBy=ph&order=desc&page=1`

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Data berhasil diambil.",
  "data": {
    "items": [
      {
        "id": 462,
        "timestamp": "2026-10-15T13:22:41.561Z",
        "deviceId": "7011204b-e88e-4504-8b67-c9e2f86ff986",
        "ph": 9.8,
        "moisture": 35,
        "isDev": false,
        "device": {
          "id": "7011204b-e88e-4504-8b67-c9e2f86ff986",
          "label": "Contoh bayam",
          "deviceCode": "node_1"
        }
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "total": 102, "totalPages": 6 }
}
```

**Response error:** `400` (parameter tidak valid, pesan `Parameter "<nama>" tidak valid.`), `401`, `403`, `404` (resource tidak dikenal), `500`.
