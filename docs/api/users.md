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
      "role": "USER",
      "isTelegramLinked": false,
      "hasPassword": true,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z"
    }
  }
}
```

`isTelegramLinked` adalah boolean turunan (`Boolean(telegramChatId)`). `telegramChatId` mentah tidak pernah dikirim ke client. Lihat [telegram.md](telegram.md) untuk bagaimana nilai ini diatur.

`role` adalah `USER` atau `SUPERADMIN` dan menjadi sumber kebenaran bagi frontend untuk menampilkan menu Superadmin (lihat [superadmin.md](superadmin.md)). `hasPassword` adalah boolean turunan (`Boolean(passwordHash)`); hash tidak pernah dikirim. Frontend memakainya untuk menampilkan form buat password.

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
- `avatarUrl` harus berupa URL `https` yang valid, maksimal 2048 karakter.

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

## `POST /api/users/me/password`

Membuat password untuk akun yang belum memilikinya (misalnya akun yang mendaftar lewat Google), sehingga user juga dapat masuk dengan email + password. Hanya bisa dilakukan **sekali**; belum ada ubah password.

**Request body:**
```json
{
  "password": "rahasia123",
  "confirmPassword": "rahasia123"
}
```

**Validasi:** `password` 8 sampai 128 karakter, dan `confirmPassword` harus sama.

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Password berhasil dibuat.",
  "data": null
}
```

**Response error:**
| Status | Penyebab |
|---|---|
| `400` | Password di luar batas panjang atau konfirmasi tidak cocok |
| `401` | Token tidak ada/tidak valid |
| `404` | User sudah tidak ada |
| `409` | Password sudah dibuat sebelumnya |

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

## `POST /api/users/me/telegram/link-code`, `POST /api/users/me/telegram/test`, dan `DELETE /api/users/me/telegram`

Membuat/mencabut penautan akun Telegram dan mengirim pesan uji coba. Didokumentasikan secara lengkap di [telegram.md](telegram.md).
