# Logging

Tidak ada library logging terstruktur (tidak ada Winston/Pino). Logging menggunakan `console.log`/`console.error` biasa, dengan konvensi prefix `[Subsystem]` agar baris log dapat di-grep berdasarkan asalnya, dan objek konteks (`{ message, stack, ...id relevan }`) sebagai argumen kedua alih-alih hanya string.

## Konvensi prefix

| Prefix | Subsistem |
|---|---|
| `[MQTT]` | Siklus hidup koneksi ([`mqtt/connection.js`](../../backend/src/mqtt/connection.js)) |
| `[SensorSubscriber]` | Ingesti telemetri ([`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js)) |
| `[MQTT Publish]` | Publikasi konfigurasi keluar ([`mqtt/publishers/config_publisher.js`](../../backend/src/mqtt/publishers/config_publisher.js)) |
| `[Redis]` | Inisialisasi Redis client ([`database/connections/redis.js`](../../backend/src/database/connections/redis.js)) |
| `[DatabaseCleanupCron]` | Job terjadwal ([`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js)) |
| `[TelegramApiService]` | Panggilan Bot API keluar ([`telegram/telegram_api.service.js`](../../backend/src/telegram/telegram_api.service.js)) |
| `[TelegramBot]` | Error tak tertangani saat memproses satu `Update` Telegram ([`telegram/bot.js`](../../backend/src/telegram/bot.js)) |
| `[TelegramSessionService]` | Kegagalan baca/tulis sesi wizard di Redis ([`telegram/session/session.service.js`](../../backend/src/telegram/session/session.service.js)) |
| `[Error Middleware]` | Error tak tertangani yang sampai ke [middleware error terpusat](../../backend/src/middlewares/error.middleware.js) |
| `[<Nama>Controller]` | Error di controller resource tersebut (mis. `[DeviceController]`, `[SensorController]`, `[UserController]`) |
| `[Server]` | Kegagalan inisialisasi subsistem saat boot ([`server.js`](../../backend/src/server.js)) |

Setiap controller memakai prefix `[<Nama>Controller]` yang konsisten dengan nama file-nya (bukan lagi label ad-hoc per operasi seperti sebelumnya).

## Apa yang dicatat

- Setiap blok catch controller mencatat `{ message, stack, ...konteks }` (mis. `userId`, `deviceId`) melalui `console.error` sebelum meneruskan ke `next(error)` (untuk error tak terduga) atau langsung mengembalikan response `sendError` (untuk kondisi yang ditangani lokal). Lihat [api/error-response.md](../api/error-response.md).
- `[Error Middleware]` mencatat ulang setiap error yang sampai kepadanya (`message`, `stack`, `method`, `path`, `userId`) sebagai titik audit tunggal untuk semua error tak tertangani, sebelum membentuk response akhir ke client.
- MQTT: keberhasilan/kegagalan subscribe, payload tidak valid (beserta ID perangkat dan data mentahnya), kegagalan publish.
- Cron: keputusan pembuatan/pelewatan partisi, hasil pembersihan.
- Boot server ([`server.js`](../../backend/src/server.js)): satu baris per percobaan inisialisasi subsistem, baik sukses maupun kegagalan yang tertangkap. Ini cara tercepat untuk mengetahui subsistem opsional mana (MQTT/Redis/cron) yang gagal berjalan tanpa membuat seluruh proses crash.

## Menambahkan logging pada kode baru

- Kode background/infrastruktur (topik MQTT baru, cron job baru): pilih prefix `[Subsystem]` dan jaga konsistensi dalam file tersebut.
- Request handler: pakai prefix `[<Nama>Controller]` dan catat objek `{ message, stack, ...konteks }` di blok `catch`, bukan sekadar `error.message` sebagai string.
- Jangan pernah mencatat secret (`JWT_SECRET`, token, kredensial MQTT/Redis). `server.js` saat ini mencatat `process.env.DATABASE_URL` saat boot untuk keperluan debugging; hindari memperluas pola ini ke file yang membawa secret aplikasi dan pertimbangkan untuk menghapusnya sebelum mengeraskan (harden) log untuk environment bersama.
