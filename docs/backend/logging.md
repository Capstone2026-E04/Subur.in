# Logging

Tidak ada library logging terstruktur (tidak ada Winston/Pino). Logging menggunakan `console.log`/`console.error` biasa, dengan konvensi prefix `[Subsystem]` agar baris log dapat di-grep berdasarkan asalnya.

## Konvensi prefix

| Prefix | Subsistem |
|---|---|
| `[MQTT]` | Siklus hidup koneksi ([`mqtt/connection.js`](../../backend/src/mqtt/connection.js)) |
| `[MQTT Subscriber]` | Ingesti telemetri ([`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js)) |
| `[MQTT Publish]` | Publikasi konfigurasi keluar ([`mqtt/publishers/config_publisher.js`](../../backend/src/mqtt/publishers/config_publisher.js)) |
| `[Redis]` | Inisialisasi Redis client ([`database/connections/redis.js`](../../backend/src/database/connections/redis.js)) |
| `[Cron]` | Job terjadwal ([`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js)) |
| `[Telegram Service]` | Panggilan Bot API keluar ([`services/telegram.service.js`](../../backend/src/services/telegram.service.js)) |
| `[Telegram Controller]` | Error pemrosesan webhook ([`controllers/telegram.controller.js`](../../backend/src/controllers/telegram.controller.js)) |
| `[Sensor Controller]` | Handler request `sensor.controller.js` |
| `[Update Device]` / `[Prisma History Query]` | Prefix ad-hoc per-operasi di controller device/sensor |

Error pada level controller dicatat dengan label deskriptif yang sesuai dengan operasinya (misalnya `console.error('Get Device Recommendation Error:', error)`) alih-alih gaya bracket `[Subsystem]`. Bracket disediakan khusus untuk subsistem background/infrastruktur (MQTT, Redis, cron) yang tidak memiliki siklus request/response untuk melekatkan error tersebut.

## Apa yang dicatat

- Setiap blok catch controller mencatat error mentah melalui `console.error` sebelum mengembalikan response `message`/`error` yang sudah disanitasi (lihat [api/error-response.md](../api/error-response.md)).
- MQTT: keberhasilan/kegagalan subscribe, payload tidak valid (beserta ID perangkat dan data mentahnya), kegagalan publish.
- Cron: keputusan pembuatan/pelewatan partisi, hasil pembersihan.
- Boot server ([`server.js`](../../backend/src/server.js)): satu baris per percobaan inisialisasi subsistem, baik sukses maupun kegagalan yang tertangkap. Ini cara tercepat untuk mengetahui subsistem opsional mana (MQTT/Redis/cron) yang gagal berjalan tanpa membuat seluruh proses crash.

## Menambahkan logging pada kode baru

- Kode background/infrastruktur (topik MQTT baru, cron job baru): pilih prefix `[Subsystem]` dan jaga konsistensi dalam file tersebut.
- Request handler: catat objek error di blok `catch` dengan label singkat yang mendeskripsikan operasinya, selaras dengan controller yang sudah ada.
- Jangan pernah mencatat secret (`JWT_SECRET`, token, kredensial MQTT/Redis). `server.js` saat ini mencatat `process.env.DATABASE_URL` saat boot untuk keperluan debugging; hindari memperluas pola ini ke file yang membawa secret aplikasi dan pertimbangkan untuk menghapusnya sebelum mengeraskan (harden) log untuk environment bersama.
