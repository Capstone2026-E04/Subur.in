# Validasi

Tidak ada library validasi skema (tidak ada Joi/Zod/express-validator). Setiap controller memvalidasi `req.body`/`req.params`/`req.query` secara manual dan mengembalikan `400` dengan `message` deskriptif jika gagal. Ini menjaga logika validasi tetap berada di dekat handler yang dilindunginya, dengan konsekuensi sedikit pengulangan antar controller.

## Pola umum

**Pemeriksaan field wajib:**
```javascript
if (!deviceId || !label || !plantId || !polybagId) {
  return sendError(res, 400, 'deviceId, label, plantId, dan polybagId wajib diisi.');
}
```

**Pemeriksaan rentang numerik (nilai sensor):**
```javascript
const ph = parseFloat(phValue);
if (isNaN(ph)) {
  return sendError(res, 400, 'phValue dan moistureValue harus berupa angka valid.');
}
if (ph < 0 || ph > 14) {
  return sendError(res, 400, 'Nilai pH harus berada dalam rentang 0 sampai 14.');
}
```

**Bilangan bulat dengan nilai minimum (konfigurasi device):**
```javascript
const parsedDelay = Number(delay_ms);
if (!Number.isInteger(parsedDelay) || parsedDelay < 100) {
  return sendError(res, 400, '"delay_ms" harus berupa bilangan bulat dan minimal 100 ms.');
}
```

**Panjang/kekosongan string (update profil):**
```javascript
if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
  return sendError(res, 400, 'Nama tidak boleh kosong.');
}
if (name !== undefined && name.trim().length > 100) {
  return sendError(res, 400, 'Nama tidak boleh melebihi 100 karakter.');
}
```

Lapisan AI menduplikasi pemeriksaan rentangnya sendiri di [`ai/services/recommendation.service.js`](../../backend/src/ai/services/recommendation.service.js) (melempar `AppError` dengan status 400/404 alih-alih `res.status().json()` langsung, karena tidak punya akses ke `res`), karena dipanggil baik dari `recommendation.controller.js` maupun `device.controller.js`. Controller hanya perlu memvalidasi apa yang bisa langsung dikirim client (misalnya `phValue`/`moistureValue` pada simulate), sementara service melakukan validasi ulang sebagai jaring pengaman terhadap pemanggil mana pun; `AppError` yang dilempar service ditangkap di controller lalu diteruskan ke middleware error terpusat lewat `next(error)`.

## Validasi payload MQTT

Telemetri dari perangkat divalidasi di [`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js) alih-alih melalui lapisan HTTP: `ph` dan `moisture` harus berupa angka finite dalam rentang yang valid, dan JSON yang salah format akan dibuang. Payload tidak valid memicu `Notification` (dibatasi maksimal satu per device per jam melalui Redis lock key `sensor:invalid_notified:<deviceId>`) alih-alih error HTTP yang ditujukan ke client, karena tidak ada siklus request/response untuk MQTT.

## Menambahkan validasi pada endpoint baru

Ikuti gaya yang sudah ada: periksa field wajib terlebih dahulu, lalu tipe/format, lalu rentang/aturan bisnis, dan langsung return begitu satu pemeriksaan gagal. Jangan mengumpulkan banyak error menjadi satu response; controller di sini selalu return pada kegagalan pertama.
