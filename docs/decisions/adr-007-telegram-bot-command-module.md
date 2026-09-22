# ADR-007: Modul command/wizard Telegram bot terpisah, di atas polling manual `if/else`

## Status
Diterima

## Konteks
[ADR-006](adr-006-telegram-notification-channel.md) memperkenalkan Telegram sebagai channel push, dengan bot hanya menangani dua perintah (`/start`, `/link <kode>`) lewat rantai `if/else` tunggal di `controllers/telegram.controller.js`, langsung memanggil `prisma` dan `services/telegram.service.js`. Menambahkan perintah baru yang lebih kaya (`/status`, `/riwayat`, `/rekomendasi`, `/unlink`, `/device`, `/tanaman`, `/notifikasi`, `/threshold`, `/help`, `/laporan`) ke pola tersebut akan membuat satu file controller tumbuh tanpa batas dan mencampur parsing routing, pengecekan akses, dan logic per perintah dalam satu tempat, tidak konsisten dengan pola `src/ai/` yang sudah ada untuk domain kompleks lainnya di project ini.

Sebagian perintah baru (`/threshold`, `/tanaman`) juga memerlukan alur multi-langkah dengan inline keyboard: memilih opsi lewat tombol, lalu (untuk `/threshold`) mengirim nilai lewat pesan teks biasa setelahnya. Tidak ada pola sesi/percakapan multi-langkah yang sudah ada di project untuk dijadikan acuan.

## Keputusan
- Memindahkan seluruh penanganan bot ke modul feature-based `src/telegram/`, mengikuti pola yang sama dengan `src/ai/` (`config/` -> `commands/`+`callbacks/`+`keyboards/`, `core/` -> `router.js`, `services/` -> `telegram_api.service.js`). `controllers/telegram.controller.js` dan `routes/telegram.routes.js` tetap di lokasi semula sebagai adapter HTTP tipis (konsisten dengan resource lain), tapi hanya meneruskan ke `telegram/bot.js#processUpdate`.
- `telegram/router.js` adalah satu-satunya tempat yang membedakan event `message` (perintah) dari `callback_query` (tap tombol) dan melakukan parsing routing (nama perintah, `callback_data`). Command dan callback handler menerima `ctx` yang sudah disiapkan (`user`, `devices`, `reply()`, `answerCallback()`, dll.) dan tidak pernah mem-parsing routing sendiri.
- Setiap perintah adalah satu file `commands/*.command.js`, didaftarkan di `commands/index.js`; `/help` menghasilkan daftarnya secara otomatis dari registry tersebut alih-alih salinan manual yang berisiko tidak sinkron.
- Guard "akun/device harus tertaut" disentralisasi dalam satu middleware (`middlewares/require_linked_device.middleware.js#requireLinkedDevice(handler, { requireDevice })`) alih-alih diduplikasi di setiap command yang membutuhkannya.
- Sesi percakapan multi-langkah (dipakai oleh `/threshold`) disimpan di Redis (`session/session.service.js`), key `bot_session:{telegramUserId}`, TTL 300 detik — dipilih karena Redis sudah menjadi dependency project untuk data sesaat lainnya (cache sensor, throttle), dan TTL mencegah wizard yang ditinggalkan menggantung selamanya tanpa perlu job pembersihan terpisah.
- `callback_data` memakai format `domain:action:value` dengan delimiter `:` (bukan JSON string) agar tetap di bawah batas 64 byte Telegram dan mudah di-dispatch berdasarkan `domain`.
- Command sederhana dengan satu callback konfirmasi/toggle (`/unlink`, `/notifikasi`) menangani `handleCallback` langsung di file command-nya sendiri; hanya wizard multi-step yang benar-benar butuh state lintas-langkah (`/tanaman`, `/threshold`) mendapat file `callbacks/*.callback.js` terpisah, karena keduanya perlu dipanggil ulang dari lebih dari satu titik masuk (keyboard awal + lanjutan wizard).
- `/rekomendasi` dan `/status` membaca `RecommendationLog` terakhir alih-alih memanggil ulang `generateRecommendation`, karena setiap pembacaan sensor MQTT yang valid sudah menghasilkan baris log lewat pipeline yang ada; ini menghindari sisi efek ganda (log duplikat, notifikasi transisi kategori terpicu ulang) yang akan muncul jika bot memicu inferensi fuzzy baru untuk sekadar menampilkan status.

## Konsekuensi
- Menambahkan perintah baru sekarang berarti menambah satu file `commands/*.command.js` dan mendaftarkannya di `commands/index.js`; `/help` otomatis mengikuti tanpa perubahan tambahan.
- Command diuji lewat `ctx` yang dikonstruksi manual (bukan lewat router), sehingga tidak bergantung pada data yang di-seed di database maupun ketersediaan Redis. Lihat [ADR-008](adr-008-jest-for-testing.md) untuk keputusan test runner (Jest) dan konvensi mocking-nya.
- Bot bergantung pada Redis untuk sesi wizard; jika Redis tidak terjangkau, `/threshold` dan resolusi tanaman aktif multi-device gagal senyap (fallback: user diminta memilih ulang atau memberi argumen lengkap langsung), bukan bot yang crash.
- `Device.customPhMin`/`customPhMax`/`customMoistureMin`/`customMoistureMax` ditambahkan sebagai field baru untuk mendukung `/threshold`; lihat [architecture/database-schema.md](../architecture/database-schema.md) dan [api/telegram.md](../api/telegram.md).
