# API Sensors

Akses baca (read) dan ekspor CSV untuk telemetri mentah device. Proses ingest data terjadi secara out-of-band melalui MQTT (lihat [architecture/api-flow.md](../architecture/api-flow.md#device-telemetry-mqtt---dbcache---sse)), bukan melalui endpoint-endpoint ini. Pesan telemetri yang membawa `record_id` berasal dari antrean offline ESP32 dan di-ACK oleh backend (lihat [ADR-011](../decisions/adr-011-offline-queue-ack-and-export-buffer.md)).

**Perlu autentikasi:** Ya, untuk semua endpoint ini. Kirim `Authorization: Bearer <jwt>` (endpoint ekspor CSV juga menerima `EXPORT_API_KEY`, lihat bagiannya). `deviceId` (UUID surrogate key, bukan kode alat) harus milik user pemanggil; jika bukan UUID valid, tidak ditemukan, atau milik user lain, response-nya `404` (`requireOwnedDevice` di [`sensor.controller.js`](../../backend/src/controllers/sensor.controller.js)). Tanpa token atau token tidak valid response-nya `401`.

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

## `GET /api/sensors/:deviceId/export.csv`

Mengekspor pembacaan sensor (pH dan kelembapan) sebagai CSV, untuk dimuat langsung di Excel. Sumbernya **buffer pesan MQTT di Redis** (`sensor:export:<deviceCode>`, bukan database): setiap pesan telemetri yang diterima backend dicatat tanpa throttle 30 detik milik penyimpanan database. Buffer menyimpan maksimal 10.000 pesan terbaru per perangkat dan kedaluwarsa 30 hari setelah pesan terakhir. Data sebelum fitur ini aktif tidak ada di buffer, dan buffer hilang bila Redis dikosongkan. Data simulasi dev mode tidak dicatat.

**Autentikasi:** salah satu dari (1) `EXPORT_API_KEY` lewat query `?api_key=` atau header `X-API-Key`, berlaku untuk semua perangkat dan tidak kedaluwarsa (nonaktif bila variabel kosong), atau (2) JWT pemilik perangkat lewat `Authorization: Bearer <token>` atau `?access_token=`. Excel `Data > From Web` tidak mengirim header kustom, jadi pakai query. Kunci di URL bisa tercatat di log; jangan dibagikan, dan ganti nilainya bila bocor.

**Query params:**
| Param | Tipe | Default | Deskripsi |
|---|---|---|---|
| `from` | tanggal | - | Batas awal (inklusif), mis. `2026-10-01` atau `2026-10-01T00:00:00Z` |
| `to` | tanggal | - | Batas akhir (inklusif) |
| `limit` | integer | `10000` | Jumlah baris terbaru (dibatasi 1-10000) |

**Response sukses `200`** (`text/csv; charset=utf-8`, urut waktu menaik):
```csv
device_code,timestamp_utc,timestamp_wib,ph,moisture,time_synced
ESP32-A1B2C3,2026-10-17T07:03:22.000Z,2026-10-17 14:03:22,6.4,71.2,true
```

`device_code` adalah kode perangkat. `time_synced=false` berarti jam ESP32 belum sinkron NTP; `timestamp_wib` pada baris itu adalah waktu terima server.

**Response error:** `400` (`from`/`to` bukan tanggal valid), `401`, `404` (device bukan milik user), `500`.

**Excel:** `Data > Get Data > From Web`, tempel `https://<backend-domain>/api/sensors/<deviceId>/export.csv?api_key=<EXPORT_API_KEY>`, lalu `Refresh` untuk memperbarui data.
