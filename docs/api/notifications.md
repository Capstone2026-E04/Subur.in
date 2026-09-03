# Notifications API

All endpoints require `Authorization: Bearer <jwt>` (see [authentication.md](authentication.md)) and are scoped to devices owned by the authenticated user. Notifications are created server-side (e.g. by the MQTT subscriber when it receives invalid sensor data) — there is no general-purpose create endpoint aside from the test helper below.

## `GET /api/notifications`

Lists all notifications for the caller's devices, newest first.

**Success response `200`:**
```json
{
  "success": true,
  "message": "Daftar notifikasi berhasil diambil.",
  "data": {
    "notifications": [
      {
        "id": "f0a1b2c3-...",
        "deviceId": "ESP32-A1B2C3",
        "title": "Data Sensor Tidak Valid",
        "message": "Data sensor tidak valid. Periksa sensor, daya, atau koneksi.",
        "type": "warning",
        "isRead": false,
        "createdAt": "2026-09-03T09:00:00.000Z",
        "device": { "label": "Pakcoy Balkon" }
      }
    ]
  }
}
```

`type` is a free-form string convention: `"warning"`, `"success"`, or `"info"`.

## `PATCH /api/notifications/read`

Marks every unread notification for the caller's devices as read.

**Success response `200`:**
```json
{ "success": true, "message": "Semua notifikasi berhasil ditandai telah dibaca." }
```

## `DELETE /api/notifications/:id`

Deletes one notification the caller has access to (via device ownership).

**Success response `200`:**
```json
{ "success": true, "message": "Notifikasi berhasil dihapus." }
```

**Error responses:** `404` (not found or not owned).

## `POST /api/notifications/test`

Broadcasts a mock notification over SSE for the caller's first device (creating a throwaway test device if none exists) **without** persisting it to the database. Intended for manually verifying the real-time notification pipeline during development.

**Success response `201`:**
```json
{
  "success": true,
  "message": "Notifikasi uji coba berhasil dibuat secara real-time (tanpa disimpan ke database).",
  "data": {
    "notification": {
      "id": "test-notif-1756900000000",
      "deviceId": "TEST-DEV-3fa85f64",
      "title": "Pengujian Sistem",
      "message": "Ini adalah notifikasi uji coba...",
      "type": "info",
      "isRead": false,
      "createdAt": "2026-09-03T09:10:00.000Z",
      "device": { "label": "Sensor Uji Coba" }
    }
  }
}
```

**Error responses:** `400` (no plants/polybags seeded to create a fallback device).
