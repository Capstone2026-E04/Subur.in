# API Sensors

Akses baca (read) untuk telemetri mentah device. Proses ingest data terjadi secara out-of-band melalui MQTT (lihat [architecture/api-flow.md](../architecture/api-flow.md#device-telemetry-mqtt---dbcache---sse)), bukan melalui endpoint-endpoint ini.

**Perlu autentikasi:** Tidak, untuk semua endpoint ini saat ini. Endpoint-endpoint ini hanya dikunci berdasarkan `deviceId` pada path. Perlakukan `deviceId` sebagai capability token pada kode client; jangan mengekspos device ID milik user lain di UI yang tidak Anda kendalikan.

## `GET /api/sensors/:deviceId/stream`

Stream Server-Sent Events (SSE) berisi pembacaan dan notifikasi live untuk satu device. Digunakan oleh [`useSensorRealtime`](../../frontend/src/hooks/useSensorRealtime.ts) pada dashboard.

**Response:** `Content-Type: text/event-stream`, satu object JSON per baris `data:`:
```
data: {"connected":true,"deviceId":"ESP32-A1B2C3"}

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
    "deviceId": "ESP32-A1B2C3",
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
| `limit` | integer | `30` | Jumlah pembacaan terbaru yang dikembalikan |

**Response sukses `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 10234, "timestamp": "2026-09-03T10:05:00.000Z", "deviceId": "ESP32-A1B2C3", "ph": 6.1, "moisture": 42.3 }
  ]
}
```

Melakukan retry query hingga 3 kali (dengan jeda 250ms) sebelum mengembalikan `500` jika terus gagal.
