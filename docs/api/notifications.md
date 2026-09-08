# Notifications API

All endpoints require `Authorization: Bearer <jwt>` (see [authentication.md](authentication.md)) and are scoped to devices owned by the authenticated user. Notifications are created server-side (e.g. by the MQTT subscriber when it receives invalid sensor data) through the shared [`notifyDevice`](../../backend/src/services/notification.service.js) helper, which fans a single notification out to three channels: the database (for this list), a live SSE broadcast to the dashboard, and a Telegram message if the device owner has linked their account (see [telegram.md](telegram.md)). There is no general-purpose create endpoint aside from the test helper below.

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

Sends a real notification through `notifyDevice` for the caller's first device (creating a throwaway test device if none exists), so it exercises every channel: persisted to the database, broadcast over SSE, and sent to Telegram if the caller has linked their account. Intended for manually verifying the full notification pipeline, including Telegram, from the dashboard's "Tes Notifikasi" button.

**Success response `201`:**
```json
{
  "success": true,
  "message": "Notifikasi uji coba berhasil dibuat dan dikirim ke seluruh kanal (dashboard & Telegram jika terhubung).",
  "data": {
    "notification": {
      "id": "f0a1b2c3-...",
      "deviceId": "TEST-DEV-3fa85f64",
      "title": "Pengujian Sistem",
      "message": "Ini adalah notifikasi uji coba untuk memverifikasi bahwa sistem notifikasi real-time Anda berfungsi dengan baik.",
      "type": "info",
      "isRead": false,
      "createdAt": "2026-09-08T09:10:00.000Z"
    }
  }
}
```

**Error responses:** `400` (no plants/polybags seeded to create a fallback device).
