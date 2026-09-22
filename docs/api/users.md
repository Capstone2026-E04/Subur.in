# API Users

Semua endpoint memerlukan `Authorization: Bearer <jwt>` (lihat [authentication.md](authentication.md)) dan beroperasi pada akun milik pemanggil yang terautentikasi (`req.user.id`).

## `GET /api/users/me`

Mengembalikan profil user yang terautentikasi.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Data profil berhasil diambil.",
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC...",
      "isTelegramLinked": false,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z"
    }
  }
}
```

`isTelegramLinked` adalah boolean turunan (`Boolean(telegramChatId)`). `telegramChatId` mentah tidak pernah dikirim ke client. Lihat [telegram.md](telegram.md) untuk bagaimana nilai ini diatur.

**Response error:** `401` (token tidak ada/tidak valid), `404` (user sudah tidak ada), `500`.

## `PATCH /api/users/me`

Memperbarui `name` dan/atau `avatarUrl`. Minimal satu field wajib diisi.

**Request body:**
```json
{
  "name": "Budi Santoso Jaya",
  "avatarUrl": "https://lh3.googleusercontent.com/a/AC..."
}
```

**Validasi:**
- Minimal salah satu dari `name`/`avatarUrl` harus ada.
- `name` harus berupa string tidak kosong, maksimal 100 karakter.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Profil berhasil diperbarui.",
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso Jaya",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC...",
      "updatedAt": "2026-02-01T09:00:00.000Z"
    }
  }
}
```

**Response error:** `400` (tidak ada field / nama tidak valid), `401`, `500`.

## `DELETE /api/users/me`

Menghapus akun user yang terautentikasi secara permanen. Menghapus juga secara cascade device-device miliknya, yang kemudian secara cascade menghapus log rekomendasi dan notifikasi dari device-device tersebut (lihat [database-schema.md](../architecture/database-schema.md)).

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Akun berhasil dihapus secara permanen."
}
```

**Response error:** `401`, `404`, `500`.

## `POST /api/users/me/telegram/link-code` dan `DELETE /api/users/me/telegram`

Membuat/mencabut penautan akun Telegram. Didokumentasikan secara lengkap di [telegram.md](telegram.md).
