# API Autentikasi

Subur.in hanya menggunakan Google Sign-In, tidak ada alur email/password. Frontend melakukan handshake OAuth Google melalui NextAuth, lalu menukar ID token Google dengan JWT yang diterbitkan oleh backend. Lihat [backend/authentication.md](../backend/authentication.md) untuk detail implementasi dan [architecture/api-flow.md](../architecture/api-flow.md) untuk diagram alur lengkap.

## `POST /api/auth/google`

Memverifikasi ID token Google, mencari atau membuat `User` terkait, dan menerbitkan session JWT (berlaku 7 hari).

**Perlu autentikasi:** Tidak

**Request body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response sukses `200`:**
```json
{
  "success": true,
  "message": "Autentikasi Google berhasil!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "avatarUrl": "https://lh3.googleusercontent.com/a/AC..."
    }
  }
}
```

**Response error:**
| Status | Penyebab |
|---|---|
| `400` | `idToken` tidak ada, atau akun Google tidak memiliki email |
| `401` | ID token Google tidak valid/kedaluwarsa |
| `500` | Error database saat mencari/membuat user |

## Menggunakan Token

Kirim `token` yang dikembalikan sebagai Bearer token pada setiap endpoint yang dilindungi:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Payload JWT berisi `id`, `email`, dan `name`, serta diverifikasi dengan `JWT_SECRET` (lihat [setup/environment.md](../setup/environment.md)). Endpoint yang dilindungi akan menolak request dengan status `401` jika header tidak ada, formatnya salah, atau token tidak valid/kedaluwarsa (lihat [error-response.md](error-response.md)).

## Penautan Akun

Jika seorang user sebelumnya pernah mendaftar dengan email yang sama melalui state akun Google yang berbeda, backend akan menautkan `googleId` yang masuk ke record user yang sudah ada berdasarkan kecocokan email, bukan membuat akun duplikat.
