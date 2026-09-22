# API Telegram

Menangani webhook Telegram Bot dan alur penautan akun. Bot sendiri (routing perintah, wizard inline keyboard, sesi Redis) hidup sebagai modul feature-based di [`backend/src/telegram/`](../../backend/src/telegram/), lihat [architecture/folder-structure.md](../architecture/folder-structure.md). Lihat [ADR-006](../decisions/adr-006-telegram-notification-channel.md) untuk alasan mengapa Telegram menjadi satu-satunya kanal push eksternal, [ADR-007](../decisions/adr-007-telegram-bot-command-module.md) untuk arsitektur command/wizard bot, dan [backend/authentication.md](../backend/authentication.md) untuk bagaimana `POST /api/users/me/telegram/link-code` dan `DELETE /api/users/me/telegram` sesuai dalam endpoint user yang terautentikasi (didokumentasikan bersama profil di [users.md](users.md)).

## `POST /api/telegram/webhook`

**Tidak ada header `Authorization`**: endpoint ini dipanggil oleh server Telegram, bukan oleh frontend. Menerima object [`Update`](https://core.telegram.org/bots/api#update) dari Telegram (`message` untuk perintah teks, `callback_query` untuk tap tombol inline keyboard). Controller ([`controllers/telegram.controller.js`](../../backend/src/controllers/telegram.controller.js)) hanyalah adapter tipis yang meneruskan body request ke `telegram/bot.js#processUpdate`, yang pada gilirannya memanggil `telegram/router.js#handleUpdate` — satu-satunya tempat yang membedakan `message` dari `callback_query` dan melakukan parsing routing.

**Request body (dari Telegram, contoh perintah teks):**
```json
{
  "message": {
    "chat": { "id": 123456789 },
    "from": { "id": 123456789 },
    "text": "/status"
  }
}
```

**Response:** Selalu `200` dengan body kosong, apa pun hasilnya. Telegram akan terus mencoba ulang (retry) tanpa batas pada response non-200 mana pun, dan kegagalan di sini (kode salah, error DB) dikomunikasikan kembali ke user melalui balasan chat, bukan melalui error HTTP. `bot.js#processUpdate` membungkus seluruh pemrosesan dalam `try/catch` sehingga error pada satu perintah tidak pernah membocorkan status non-200 ke Telegram.

## Perintah Bot

Setiap perintah diimplementasikan sebagai satu file di `telegram/commands/*.command.js`, didaftarkan di `telegram/commands/index.js`. `/help` menghasilkan daftar berikut secara otomatis dari registry tersebut, bukan salinan manual.

| Perintah | Butuh akun tertaut | Butuh device terdaftar | Deskripsi |
|---|---|---|---|
| `/start` | - | - | Pesan sambutan dan cara mendapatkan kode penghubung. |
| `/link <kode>` | - | - | Menautkan akun Subur.in ke chat Telegram ini menggunakan kode sekali pakai. |
| `/status` | v | v | Data sensor terkini (pH, kelembapan) dan kategori fuzzy C1–C9 milik tanaman aktif, dibaca dari `RecommendationLog` terakhir. |
| `/riwayat [7d\|30d]` | v | v | Grafik riwayat pH & kelembapan (default `7d`); argumen selain `7d`/`30d` ditolak. Grafik dirender via [quickchart.io](https://quickchart.io/) dan dikirim sebagai foto. |
| `/rekomendasi` | v | v | Rekomendasi treatment terakhir: kategori C1–C9 penyebab, dan breakdown dosis air/dolomit/sulfur dari `RecommendationLog` terakhir. |
| `/unlink` | v | - | Memutus koneksi Telegram dari akun, dengan konfirmasi inline keyboard ("Ya, putuskan" / "Batal") karena bersifat destruktif. |
| `/device` | v | v | Info koneksi device aktif: status online/offline (dibandingkan terhadap `2x sensorInterval`), waktu terakhir terlihat. Tidak menampilkan baterai/sinyal karena firmware ESP32 saat ini tidak mengirim field tersebut. |
| `/tanaman` | v | v | Memilih "tanaman aktif" (device) via inline keyboard, dipakai sebagai device default untuk `/status`, `/riwayat`, `/rekomendasi`, `/device`, dan `/laporan` saat user memiliki lebih dari satu device. |
| `/notifikasi [on\|off]` | v | - | Toggle notifikasi perubahan kategori C1–C9 (`User.telegramNotifyEnabled`, persisten di database). Tanpa argumen menampilkan status saat ini beserta tombol toggle. |
| `/threshold [<ph\|kelembapan> <min> <max>]` | v | v | Mengatur ambang batas notifikasi kustom pH/kelembapan per device. Tanpa argumen memasuki wizard (pilih parameter via keyboard, lalu kirim `min max` sebagai teks biasa); dengan argumen lengkap, langsung divalidasi dan disimpan. |
| `/help` | - | - | Daftar perintah di atas, dihasilkan otomatis dari registry. |
| `/laporan` | v | v | Ringkasan on-demand 7 hari terakhir (rata-rata pH/kelembapan, jumlah treatment, kategori terakhir) untuk tanaman aktif. `buildLaporanText(deviceId)` diekspor terpisah dari handler Telegram-nya supaya bisa dipanggil langsung oleh cron job terpisah nantinya (belum dijadwalkan otomatis). |

Perintah pada kolom "Butuh akun tertaut" dibungkus dengan `middlewares/require_linked_device.middleware.js#requireLinkedDevice(handler, { requireDevice })`, satu-satunya tempat yang memeriksa `User` tertaut dan (jika `requireDevice: true`) memiliki minimal satu `Device` — command individual tidak melakukan pengecekan ini sendiri.

## Tanaman aktif (multi-device)

Saat user memiliki lebih dari satu `Device`, perintah yang beroperasi pada satu device (`/status`, `/riwayat`, `/rekomendasi`, `/device`, `/laporan`) memerlukan "tanaman aktif" yang dipilih lewat `/tanaman`. Resolusi dilakukan oleh `session/session.service.js#resolveActiveDevice(telegramUserId, devices)`:

- 0 device -> ditolak oleh `requireLinkedDevice` sebelum command dijalankan.
- 1 device -> dipilih otomatis, tanpa perlu `/tanaman`.
- >1 device tanpa device aktif tersimpan (atau device aktif tersimpan sudah tidak ada di daftar) -> command membalas meminta user menjalankan `/tanaman` terlebih dahulu.

## Sesi & wizard (`/threshold`)

Sesi percakapan multi-langkah disimpan di Redis via `session/session.service.js`, dengan key `bot_session:{telegramUserId}` dan TTL 300 detik (5 menit) — wizard yang ditinggalkan otomatis kedaluwarsa. `/threshold` tanpa argumen menyimpan `{ wizard: { type: "threshold", parameter, deviceId } }`; pesan teks biasa berikutnya (bukan diawali `/`) dicocokkan oleh `router.js` terhadap wizard aktif dan diteruskan ke `threshold.command.js#handleWizardInput`, bukan diproses sebagai perintah baru.

## Inline keyboard & callback_data

Tombol inline keyboard menggunakan `callback_data` berformat `domain:action:value` (delimiter `:`, di-parse via `utils/parse_callback_data.js`), bukan JSON string, agar tetap di bawah batas 64 byte milik Telegram. `router.js` mem-parsing `callback_data` dan mendispatch berdasarkan `domain` ke `callbacks/index.js#callbackHandlers`:

| Domain | Handler | Catatan |
|---|---|---|
| `tanaman` | `callbacks/tanaman.callback.js` | Wizard pemilihan device, dipisah karena keyboard-nya dibangun ulang setiap kali dari daftar device user. |
| `threshold` | `callbacks/threshold.callback.js` | Langkah pertama wizard `/threshold` (pemilihan parameter); langkah kedua (input nilai) ditangani sebagai pesan teks biasa via `handleWizardInput`, bukan callback. |
| `unlink` | `commands/unlink.command.js#handleCallback` | Konfirmasi/pembatalan tunggal, ditangani langsung di file command-nya (tidak butuh file `callbacks/` terpisah). |
| `notifikasi` | `commands/notifikasi.command.js#handleCallback` | Toggle satu tombol, sama seperti `unlink`. |

Setiap handler callback memanggil `ctx.answerCallback()` (`answerCallbackQuery` Telegram) di awal untuk menghilangkan loading state tombol, sesuai konvensi project.

## `POST /api/users/me/telegram/link-code`

Memerlukan `Authorization: Bearer <jwt>`. Membuat kode alfanumerik 6 karakter, menyimpannya pada `telegramLinkCode` milik pemanggil, dan mengembalikannya untuk ditampilkan di UI.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Kode penghubung Telegram berhasil dibuat.",
  "data": { "linkCode": "AB12CD" }
}
```

## `DELETE /api/users/me/telegram`

Memerlukan `Authorization: Bearer <jwt>`. Menghapus `telegramChatId` dan `telegramLinkCode` pada akun pemanggil, memutuskan notifikasi Telegram. Setara dengan perintah `/unlink` pada bot, hanya dipicu dari dashboard alih-alih chat.

**Response sukses `200`:**
```json
{ "success": true, "message": "Koneksi Telegram berhasil diputuskan." }
```

## Catatan

- `sendMessage`/`sendPhoto`/`answerCallbackQuery`/`editMessageReplyMarkup` pada [`telegram/telegram_api.service.js`](../../backend/src/telegram/telegram_api.service.js) (dipindahkan dari `services/telegram.service.js`) tidak pernah melempar error. Panggilan API Telegram yang gagal akan dicatat (log) dan diredam sehingga tidak dapat memutus sisi database/SSE dari [`notifyDevice`](../../backend/src/services/notification.service.js).
- Hanya pesan judul notifikasi dari `notifyDevice` yang dikirim dengan `parse_mode: "Markdown"`; balasan webhook sengaja dikirim sebagai plain text, karena bisa saja berisi kode yang diketik user dengan karakter khusus Markdown yang tidak di-escape (lihat [changelog](../changelog.md)).
- `notifyDevice` sekarang memeriksa `User.telegramNotifyEnabled` sebelum mengirim ke Telegram (lihat [notifications.md](notifications.md)); channel database + SSE tidak terpengaruh oleh preferensi ini.
- `Device.customPhMin`/`customPhMax`/`customMoistureMin`/`customMoistureMax` (diatur lewat `/threshold`) menggantikan ambang batas notifikasi hardcode (`25`/`35` untuk kelembapan, `plant.minPh`/`maxPh` untuk pH) di [`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js) ketika diset; rekomendasi fuzzy logic (`generateRecommendation`) tetap selalu memakai nilai resmi dari `Plant`, tidak terpengaruh oleh threshold kustom ini. Lihat [database-schema.md](../architecture/database-schema.md).
