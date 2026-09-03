# Devices API

All endpoints require `Authorization: Bearer <jwt>` (see [authentication.md](authentication.md)). A device is only visible/mutable by the user who registered it.

## `GET /api/devices/discovered`

Lists devices that have sent MQTT telemetry (present in Redis as `sensor:latest:*`) but are **not yet registered** to any user — used to let a user "claim" a physical device they just powered on.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Berhasil mendeteksi device aktif yang belum terdaftar.",
  "data": {
    "devices": [
      { "deviceId": "ESP32-A1B2C3", "ph": 6.2, "moisture": 45.1, "timestamp": "2026-09-03T10:00:00.000Z" }
    ]
  }
}
```

## `POST /api/devices`

Registers (claims) a device to the authenticated user's account.

**Request body:**
```json
{
  "deviceId": "ESP32-A1B2C3",
  "label": "Pakcoy Balkon",
  "plantId": "b6f1c2e0-...-plant-uuid",
  "polybagId": "d9a7e5f0-...-polybag-uuid",
  "sensorInterval": 15
}
```

`sensorInterval` (minutes) is optional, defaults to `15`. On success, the backend also publishes the interval to the device over MQTT (see [backend authentication/config publisher](../architecture/api-flow.md)).

**Success response `201`:**
```json
{
  "success": true,
  "message": "Device berhasil didaftarkan dan dihubungkan ke akun Anda.",
  "data": {
    "device": {
      "id": "ESP32-A1B2C3",
      "userId": "3fa85f64-...",
      "label": "Pakcoy Balkon",
      "plantId": "b6f1c2e0-...",
      "polybagId": "d9a7e5f0-...",
      "status": "ACTIVE",
      "sensorInterval": 15,
      "plant": { "id": "b6f1c2e0-...", "name": "Pakcoy", "phTarget": 6.8 },
      "polybag": { "id": "d9a7e5f0-...", "soilVolumeLiter": 11.04, "polybagType": { "name": "Standar" } }
    }
  }
}
```

**Error responses:** `400` (missing required field, device ID already registered), `401`, `500`.

## `GET /api/devices`

Lists all devices owned by the authenticated user, with `plant` and `polybag` (+`polybagType`) included.

**Success response `200`:** same `device` shape as above, under `data.devices` (array).

## `PATCH /api/devices/:id`

Updates a device the caller owns. Any of `label`, `plantId`, `polybagId`, `status`, `sensorInterval` may be provided; unset fields keep their current value. If `sensorInterval` changes, the backend re-publishes the new interval to the device over MQTT.

**Request body (partial):**
```json
{ "label": "Pakcoy Balkon Barat", "sensorInterval": 30 }
```

**Success response `200`:** updated `device` object under `data.device`.

**Error responses:** `404` (not found or not owned), `500`.

## `DELETE /api/devices/:id`

Deletes a device the caller owns (cascades to its recommendation logs and notifications).

**Success response `200`:**
```json
{ "success": true, "message": "Device berhasil dihapus dari akun Anda." }
```

**Error responses:** `404`, `500`.

## `GET /api/devices/:id/recommendation`

Runs the fuzzy-logic engine against the device's latest sensor reading (Redis, falling back to the most recent `RawSensorLog` row) and persists the result as a `RecommendationLog`. See [recommendations.md](recommendations.md) for the response shape and [architecture/api-flow.md](../architecture/api-flow.md) for the sequence diagram.

**Success response `200` (no sensor data yet):**
```json
{ "success": true, "message": "Belum ada data sensor tercatat untuk alat ini.", "data": null }
```

## `POST /api/devices/:id/config`

Sends an ad-hoc MQTT config message (currently the telemetry publish delay, in milliseconds) to a device the caller owns.

**Request body:**
```json
{ "delay_ms": 5000 }
```

**Validation:** `delay_ms` must be an integer `>= 100`.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Konfigurasi delay berhasil dikirim ke device \"ESP32-A1B2C3\".",
  "data": {
    "deviceId": "ESP32-A1B2C3",
    "topic": "suburin/devices/ESP32-A1B2C3/config",
    "payload": { "delay_ms": 5000 }
  }
}
```

**Error responses:** `400` (missing/invalid `delay_ms`), `404`, `500`.
