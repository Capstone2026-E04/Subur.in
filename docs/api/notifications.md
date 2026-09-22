# API Notifications

Semua endpoint memerlukan `Authorization: Bearer <jwt>` (lihat [authentication.md](authentication.md)) dan dibatasi hanya untuk device milik user yang terautentikasi. Notifikasi dibuat di sisi server (misalnya oleh MQTT subscriber saat menerima data sensor yang tidak valid) melalui helper bersama [`notifyDevice`](../../backend/src/services/notification.service.js), yang menyebarkan satu notifikasi ke tiga kanal: database (untuk daftar ini), broadcast SSE langsung ke dashboard, dan pesan Telegram jika pemilik device telah menautkan akunnya (lihat [telegram.md](telegram.md)). Tidak ada endpoint create serba guna selain helper uji coba di bawah ini.

## `GET /api/notifications`

Menampilkan semua notifikasi untuk device milik pemanggil, terbaru lebih dulu.

**Response sukses `200`:**
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

`type` adalah konvensi string bebas: `"warning"`, `"success"`, atau `"info"`.

## `PATCH /api/notifications/read`

Menandai semua notifikasi yang belum dibaca untuk device milik pemanggil sebagai telah dibaca.

**Response sukses `200`:**
```json
{ "success": true, "message": "Semua notifikasi berhasil ditandai telah dibaca." }
```

## `DELETE /api/notifications/:id`

Menghapus satu notifikasi yang dapat diakses oleh pemanggil (melalui kepemilikan device).

**Response sukses `200`:**
```json
{ "success": true, "message": "Notifikasi berhasil dihapus." }
```

**Response error:** `404` (tidak ditemukan atau bukan milik pemanggil).

## `POST /api/notifications/test`

Mengirim notifikasi sungguhan melalui `notifyDevice` untuk device pertama milik pemanggil (membuat device uji coba sementara jika belum ada), sehingga menguji setiap kanal: tersimpan ke database, di-broadcast melalui SSE, dan terkirim ke Telegram jika pemanggil telah menautkan akunnya. Dimaksudkan untuk verifikasi manual seluruh pipeline notifikasi, termasuk Telegram, dari tombol "Tes Notifikasi" di dashboard.

**Response sukses `201`:**
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

**Response error:** `400` (tidak ada data plants/polybags yang di-seed untuk membuat device fallback).
