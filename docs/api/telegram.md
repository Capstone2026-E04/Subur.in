# API Telegram

Menangani webhook Telegram Bot dan alur penautan akun. Lihat [ADR-006](../decisions/adr-006-telegram-notification-channel.md) untuk alasan mengapa Telegram menjadi satu-satunya kanal push eksternal, dan [backend/authentication.md](../backend/authentication.md) untuk bagaimana `POST /api/users/me/telegram/link-code` dan `DELETE /api/users/me/telegram` sesuai dalam endpoint user yang terautentikasi (didokumentasikan bersama profil di [users.md](users.md)).

## `POST /api/telegram/webhook`

**Tidak ada header `Authorization`**: endpoint ini dipanggil oleh server Telegram, bukan oleh frontend. Menerima object [`Update`](https://core.telegram.org/bots/api#update) dari Telegram.

**Request body (dari Telegram):**
```json
{
  "message": {
    "chat": { "id": 123456789 },
    "text": "/link ABC123"
  }
}
```

**Perilaku:**

| Teks pesan | Aksi |
|---|---|
| `/start` | Membalas dengan pesan sambutan singkat yang menjelaskan cara mendapatkan kode penghubung dari halaman pengaturan Subur.in. |
| `/link <CODE>` | Mencari `User` berdasarkan `telegramLinkCode`. Jika ditemukan, mengatur `telegramChatId` user tersebut ke chat ID pengirim dan menghapus `telegramLinkCode` (sekali pakai), lalu membalas dengan konfirmasi. Jika tidak ditemukan, membalas bahwa kode tidak valid atau sudah kedaluwarsa. |
| Selain itu | Membalas dengan pesan bantuan singkat. |

**Response:** Selalu `200` dengan body kosong, apa pun hasilnya. Telegram akan terus mencoba ulang (retry) tanpa batas pada response non-200 mana pun, dan kegagalan di sini (kode salah, error DB) dikomunikasikan kembali ke user melalui balasan chat, bukan melalui error HTTP.

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

Memerlukan `Authorization: Bearer <jwt>`. Menghapus `telegramChatId` dan `telegramLinkCode` pada akun pemanggil, memutuskan notifikasi Telegram.

**Response sukses `200`:**
```json
{ "success": true, "message": "Koneksi Telegram berhasil diputuskan." }
```

## Catatan

- `sendMessage` pada [`services/telegram.service.js`](../../backend/src/services/telegram.service.js) tidak pernah melempar error. Panggilan API Telegram yang gagal akan dicatat (log) dan diredam sehingga tidak dapat memutus sisi database/SSE dari [`notifyDevice`](../../backend/src/services/notification.service.js).
- Hanya pesan judul notifikasi dari `notifyDevice` yang dikirim dengan `parse_mode: "Markdown"`; balasan webhook sengaja dikirim sebagai plain text, karena bisa saja berisi kode yang diketik user dengan karakter khusus Markdown yang tidak di-escape (lihat [changelog](../changelog.md)).
