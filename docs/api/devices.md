# API Devices

Semua endpoint memerlukan `Authorization: Bearer <jwt>` (lihat [authentication.md](authentication.md)). Sebuah device hanya dapat dilihat/diubah oleh user yang mendaftarkannya.

## `GET /api/devices/discovered`

Menampilkan daftar device yang telah mengirim telemetri MQTT (tersimpan di Redis sebagai `sensor:latest:*`) tetapi **belum terdaftar** ke user manapun. Digunakan agar user dapat "mengklaim" perangkat fisik yang baru saja dinyalakan.

**Response sukses `200`:**
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

Mendaftarkan (mengklaim) sebuah device ke akun user yang sedang login.

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

`sensorInterval` (dalam menit) bersifat opsional, defaultnya `15`. Jika berhasil, backend juga mempublikasikan interval tersebut ke device melalui MQTT (lihat [backend authentication/config publisher](../architecture/api-flow.md)).

**Response sukses `201`:**
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

**Response error:** `400` (field wajib tidak ada, device ID sudah terdaftar), `401`, `500`.

## `GET /api/devices`

Menampilkan semua device milik user yang sedang login, beserta `plant` dan `polybag` (+`polybagType`).

**Response sukses `200`:** bentuk `device` sama seperti di atas, di dalam `data.devices` (array).

## `PATCH /api/devices/:id`

Memperbarui device milik pemanggil. Salah satu dari `label`, `plantId`, `polybagId`, `status`, `sensorInterval` dapat diberikan; field yang tidak diset akan mempertahankan nilai saat ini. Jika `sensorInterval` berubah, backend akan mempublikasikan ulang interval baru ke device melalui MQTT.

**Request body (parsial):**
```json
{ "label": "Pakcoy Balkon Barat", "sensorInterval": 30 }
```

**Response sukses `200`:** object `device` yang telah diperbarui, di dalam `data.device`.

**Response error:** `404` (tidak ditemukan atau bukan milik user), `500`.

## `DELETE /api/devices/:id`

Menghapus device milik pemanggil (menghapus juga secara cascade log rekomendasi dan notifikasi terkait).

**Response sukses `200`:**
```json
{ "success": true, "message": "Device berhasil dihapus dari akun Anda." }
```

**Response error:** `404`, `500`.

## `GET /api/devices/:id/recommendation`

Menjalankan mesin fuzzy logic terhadap pembacaan sensor terbaru dari device (Redis, dengan fallback ke baris `RawSensorLog` terbaru) dan menyimpan hasilnya sebagai `RecommendationLog`. Lihat [recommendations.md](recommendations.md) untuk bentuk response dan [architecture/api-flow.md](../architecture/api-flow.md) untuk diagram alurnya.

**Response sukses `200` (belum ada data sensor):**
```json
{ "success": true, "message": "Belum ada data sensor tercatat untuk alat ini.", "data": null }
```

## `POST /api/devices/:id/config`

Mengirim pesan konfigurasi MQTT ad-hoc (saat ini berupa delay publikasi telemetri, dalam milidetik) ke device milik pemanggil.

**Request body:**
```json
{ "delay_ms": 5000 }
```

**Validasi:** `delay_ms` harus berupa integer `>= 100`.

**Response sukses `200`:**
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

**Response error:** `400` (`delay_ms` tidak ada/tidak valid), `404`, `500`.
