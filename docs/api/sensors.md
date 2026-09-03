# Sensors API

Read access to raw device telemetry. Ingestion happens out-of-band via MQTT (see [architecture/api-flow.md](../architecture/api-flow.md#device-telemetry-mqtt---dbcache---sse)), not through these endpoints.

**Auth required:** No on any of these endpoints today — they are keyed only by `deviceId` in the path. Treat `deviceId` as a capability token in client code; do not expose another user's device ID in UI you don't control.

## `GET /api/sensors/:deviceId/stream`

Server-Sent Events (SSE) stream of live readings and notifications for one device. Used by [`useSensorRealtime`](../../frontend/src/hooks/useSensorRealtime.ts) on the dashboard.

**Response:** `Content-Type: text/event-stream`, one JSON object per `data:` line:
```
data: {"connected":true,"deviceId":"ESP32-A1B2C3"}

data: {"ph":6.1,"moisture":42.3,"timestamp":"2026-09-03T10:05:00.000Z"}

: keepalive
```

A `: keepalive` comment is sent every 20 seconds to keep the connection alive through proxies. Notification broadcasts arrive as `{ "notification": { "title": ..., "message": ... } }`.

## `GET /api/sensors/:deviceId/latest`

Returns the most recent reading for a device — from Redis if present, falling back to the latest `RawSensorLog` row in Postgres.

**Success response `200`:**
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

**Error responses:** `404` (no reading exists yet), `500`.

## `GET /api/sensors/:deviceId/history`

Returns recent historical readings from Postgres, most relevant for charting.

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `30` | Number of most recent readings to return |

**Success response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 10234, "timestamp": "2026-09-03T10:05:00.000Z", "deviceId": "ESP32-A1B2C3", "ph": 6.1, "moisture": 42.3 }
  ]
}
```

Retries the query up to 3 times (250ms apart) before returning `500` on persistent failure.
