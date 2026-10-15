# API Autentikasi

Subur.in mendukung dua cara masuk: **email + password** dan **Google Sign-In**. Keduanya menghasilkan JWT yang diterbitkan backend dengan bentuk yang sama, sehingga seluruh endpoint terproteksi tidak peduli bagaimana user masuk. Frontend menjembatani keduanya lewat NextAuth (lihat [ADR-003](../decisions/adr-003-backend-jwt-with-nextauth.md) dan [ADR-009](../decisions/adr-009-email-password-auth.md)). Detail implementasi ada di [backend/authentication.md](../backend/authentication.md) dan diagram alur di [architecture/api-flow.md](../architecture/api-flow.md).

| Endpoint | Fungsi | Autentikasi |
|---|---|---|
| `POST /api/auth/register` | Mendaftar dengan email + password | Tidak |
| `POST /api/auth/login` | Masuk dengan email + password | Tidak |
| `POST /api/auth/google` | Masuk dengan ID token Google | Tidak |
| `POST /api/users/me/password` | Membuat password untuk akun yang mendaftar lewat Google | Ya (lihat [users.md](users.md)) |

Ketiga endpoint pertama mengembalikan struktur sukses yang sama:

```json
{
  "success": true,
  "message": "Login berhasil!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Budi Santoso",
      "email": "budi@gmail.com",
      "avatarUrl": null
    }
  }
}
```

`avatarUrl` bernilai `null` untuk akun yang dibuat lewat email + password sampai user menautkan Google.

## `POST /api/auth/register`

Membuat akun baru dengan email dan password. Email dinormalisasi (dipangkas dan diubah ke huruf kecil). Akun baru tidak memiliki avatar dan `googleId`.

**Request body:**
```json
{
  "name": "Budi Santoso",
  "email": "budi@gmail.com",
  "password": "rahasia123"
}
```

**Validasi:**
- `name`, `email`, dan `password` wajib diisi. `name` maksimal 100 karakter.
- `email` berformat valid, maksimal 255 karakter.
- `password` 8 sampai 128 karakter.

**Response sukses `201`:** struktur di atas dengan `message: "Registrasi berhasil!"`.

**Response error:**
| Status | Penyebab |
|---|---|
| `400` | Field wajib kosong, format email salah, nama terlalu panjang, atau password di luar batas panjang |
| `409` | Email sudah terdaftar (termasuk email milik akun Google) |
| `500` | Error database |

## `POST /api/auth/login`

**Perlu autentikasi:** Tidak

**Request body:**
```json
{
  "email": "budi@gmail.com",
  "password": "rahasia123"
}
```

**Response sukses `200`:** struktur di atas dengan `message: "Login berhasil!"`.

**Response error:**
| Status | Penyebab |
|---|---|
| `400` | `email` atau `password` kosong / bukan string |
| `401` | `Email atau password salah.` Pesan ini sama untuk email tidak terdaftar, password salah, dan akun yang belum punya password (hanya Google), supaya tidak membocorkan keberadaan akun |
| `429` | Terlalu banyak percobaan login gagal untuk email tersebut |
| `500` | Error database |

### Pembatasan percobaan login

Hanya percobaan gagal yang dihitung: maksimal **10 kali per email per 15 menit**. Percobaan yang berhasil tidak menambah hitungan. Setelah batas terlampaui, respons `429` dengan `message: "Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit."` dikirim sampai jendela waktu berakhir. Penghitung disimpan di memori proses backend (satu instance), bukan Redis.

## `POST /api/auth/google`

Memverifikasi ID token Google, mencari atau membuat `User` terkait, dan menerbitkan session JWT (berlaku 7 hari).

**Request body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response sukses `200`:** struktur di atas dengan `message: "Autentikasi Google berhasil!"`.

**Response error:**
| Status | Penyebab |
|---|---|
| `400` | `idToken` tidak ada, atau akun Google tidak memiliki email yang terverifikasi |
| `401` | ID token Google tidak valid/kedaluwarsa |
| `500` | Error database saat mencari/membuat user |

## Penautan Akun Email dan Google

User yang mendaftar dengan email + password dapat langsung masuk dengan Google memakai email yang sama. Backend menautkan `googleId` ke akun yang ada (pencocokan email tanpa membedakan huruf besar/kecil), bukan membuat akun duplikat, dan:

- **Avatar** diambil dari akun Google jika akun belum punya avatar. Avatar yang sudah diatur user tidak ditimpa.
- **Password dihapus** pada penautan pertama untuk akun yang sebelumnya hanya punya email + password. Email saat registrasi tidak diverifikasi, sehingga tanpa langkah ini pihak lain bisa mendaftarkan email orang lain lebih dulu dan tetap memegang password-nya setelah pemilik email menautkan Google. User yang sah cukup membuat password baru dari halaman profil (`POST /api/users/me/password`). Lihat [ADR-009](../decisions/adr-009-email-password-auth.md).

## Menggunakan Token

Kirim `token` yang dikembalikan sebagai Bearer token pada setiap endpoint yang dilindungi:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Payload JWT berisi `id`, `email`, dan `name`, serta diverifikasi dengan `JWT_SECRET` (lihat [setup/environment.md](../setup/environment.md)). **Role tidak ada di dalam token**; role dibaca dari database pada setiap request ke endpoint yang membutuhkannya (lihat [superadmin.md](superadmin.md)). Endpoint yang dilindungi menolak request dengan status `401` jika header tidak ada, formatnya salah, atau token tidak valid/kedaluwarsa (lihat [error-response.md](error-response.md)).

## Sesi dan Cookie di Frontend

Browser tidak menyimpan JWT backend secara langsung. NextAuth menyimpannya di dalam cookie sesi terenkripsi (`httpOnly`, `sameSite=lax`, `secure` otomatis pada HTTPS). Masa berlaku sesi diset **7 hari**, sama dengan masa berlaku JWT backend, supaya sesi tidak lebih lama dari tokennya. Lihat [frontend/state-management.md](../frontend/state-management.md#session-state).
