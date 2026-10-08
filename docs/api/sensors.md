# API Sensors

Akses baca (read) untuk telemetri mentah device. Proses ingest data terjadi secara out-of-band melalui MQTT (lihat [architecture/api-flow.md](../architecture/api-flow.md#device-telemetry-mqtt---dbcache---sse)), bukan melalui endpoint-endpoint ini.

**Perlu autentikasi:** Ya, untuk semua endpoint ini. Kirim `Authorization: Bearer <jwt>`. `deviceId` (UUID surrogate key, bukan kode alat) harus milik user pemanggil; jika bukan UUID valid, tidak ditemukan, atau milik user lain, response-nya `404` (`requireOwnedDevice` di [`sensor.controller.js`](../../backend/src/controllers/sensor.controller.js)). Tanpa token atau token tidak valid response-nya `401`.

## `GET /api/sensors/:deviceId/stream`

Stream Server-Sent Events (SSE) berisi pembacaan dan notifikasi live untuk satu device. Digunakan oleh [`useSensorRealtime`](../../frontend/src/hooks/useSensorRealtime.ts) pada dashboard.

`EventSource` tidak dapat mengirim header `Authorization`, jadi khusus endpoint ini JWT juga diterima lewat query `?access_token=<jwt>` (dipakai hanya jika header `Authorization` tidak ada). Hindari mencatat URL lengkap request ini di log/proxy karena token ikut tercatat.

**Response:** `Content-Type: text/event-stream`, satu object JSON per baris `data:`:
```
data: {"connected":true,"deviceId":"3c1b6a52-9d3e-4f0a-8a47-2b5d7e9f1a10"}

data: {"ph":6.1,"moisture":42.3,"timestamp":"2026-09-03T10:05:00.000Z"}

: keepalive
```

Komentar `: keepalive` dikirim setiap 20 detik untuk menjaga koneksi tetap hidup melewati proxy. Broadcast notifikasi datang dalam bentuk `{ "notification": { "title": ..., "message": ... } }`.

## `GET /api/sensors/:deviceId/latest`

Mengembalikan pembacaan terbaru untuk sebuah device, dari Redis jika tersedia, dengan fallback ke baris `RawSensorLog` terbaru di Postgres.

**Response sukses `200`:**
```json
{
  "success": true,
  "data": {
    "deviceId": "3c1b6a52-9d3e-4f0a-8a47-2b5d7e9f1a10",
    "ph": 6.1,
    "moisture": 42.3,
    "timestamp": "2026-09-03T10:05:00.000Z"
  }
}
```

**Response error:** `404` (belum ada pembacaan), `500`.

## `GET /api/sensors/:deviceId/history`

Mengembalikan pembacaan historis terbaru dari Postgres, paling relevan untuk keperluan charting.

**Query params:**
| Param | Tipe | Default | Deskripsi |
|---|---|---|---|
| `limit` | integer | `30` | Jumlah pembacaan terbaru yang dikembalikan (dibatasi 1-500) |

**Response sukses `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 10234, "timestamp": "2026-09-03T10:05:00.000Z", "deviceId": "3c1b6a52-9d3e-4f0a-8a47-2b5d7e9f1a10", "ph": 6.1, "moisture": 42.3 }
  ]
}
```

Melakukan retry query hingga 3 kali (dengan jeda 250ms) sebelum mengembalikan `500` jika terus gagal.
