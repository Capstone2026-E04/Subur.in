# Autentikasi backend

Dua jalur masuk, email + password dan Google Sign-In, dengan JWT yang diterbitkan backend sebagai token sesi untuk API. Lihat [api/authentication.md](../api/authentication.md) untuk kontrak endpoint dan [architecture/api-flow.md](../architecture/api-flow.md) untuk diagram sekuens.

Semua handler ada di [`controllers/auth.controller.js`](../../backend/src/controllers/auth.controller.js) dan berbagi dua helper internal: `issueSessionToken(user)` (menandatangani JWT) dan `toAuthPayload(user)` (membentuk `{ token, user }` tanpa `passwordHash`).

## Hash password ([`utils/password.js`](../../backend/src/utils/password.js))

Memakai `crypto.scrypt` bawaan Node, tanpa dependensi tambahan.

| Aspek | Nilai |
|---|---|
| Algoritma | scrypt dengan parameter bawaan Node, salt acak 16 byte per hash, kunci 64 byte |
| Format tersimpan | `scrypt1$<salt hex>$<hash hex>` di kolom `users.password_hash` |
| Verifikasi | `crypto.timingSafeEqual`; hash yang rusak atau berversi lain dianggap tidak cocok |
| Batas panjang password | 8 sampai 128 karakter (`validatePassword`) |

Tidak ada aturan komposisi (huruf besar, angka, simbol); hanya panjang.

## Registrasi

1. Menormalisasi email (`trim` + huruf kecil) dan memvalidasi `name`, `email`, `password`.
2. Menolak dengan `409` jika email sudah ada (pencarian tanpa membedakan huruf besar/kecil). Balapan antar request ditangani lewat kode Prisma `P2002`, juga menjadi `409`.
3. Membuat `User` dengan `passwordHash`, tanpa `googleId` dan tanpa `avatarUrl`.
4. Mengembalikan `201` dengan token.

## Login

1. Mencari user berdasarkan email.
2. Selalu menjalankan verifikasi scrypt, memakai hash palsu bila user tidak ada atau belum punya password, agar waktu respons tidak membedakan kasus tersebut.
3. Mengembalikan `401` dengan pesan tunggal `Email atau password salah.` untuk semua kegagalan.
4. Dilindungi [`middlewares/login_rate_limit.middleware.js`](../../backend/src/middlewares/login_rate_limit.middleware.js): `express-rate-limit`, kunci berupa email ternormalisasi, 10 percobaan gagal per 15 menit, percobaan berhasil tidak dihitung. Penyimpanan di memori proses, jadi batasnya per instance backend; kunci per email (bukan per IP) dipilih karena topologi proxy produksi tidak diasumsikan. Konsekuensinya, pihak lain dapat mengunci login email tertentu selama jendela waktu berjalan.

## Sign-In Google

1. Client mengirim `{ idToken }`, yaitu ID token yang diterbitkan Google (diperoleh frontend melalui Google provider milik NextAuth).
2. Backend memverifikasinya dengan `OAuth2Client.verifyIdToken` dari `google-auth-library`, memeriksa audience terhadap `GOOGLE_CLIENT_ID`.
3. Mengekstrak `sub` (ID user Google), `email`, `email_verified`, `name`, `picture`. Email yang tidak ada atau belum terverifikasi ditolak dengan `400`.
4. Mencari user berdasarkan `googleId`. Jika tidak ada, mencari berdasarkan email (tanpa membedakan huruf besar/kecil) dan **menautkan** Google ID ke akun itu. Jika tidak ada juga, membuat `User` baru.
5. Saat menautkan akun yang sebelumnya hanya punya email + password (`googleId` masih kosong): `avatarUrl` diisi dari Google bila masih kosong, dan `passwordHash` diset `null`. Alasannya di [ADR-009](../decisions/adr-009-email-password-auth.md).

## Membuat password untuk akun Google ([`controllers/user.controller.js`](../../backend/src/controllers/user.controller.js))

`POST /api/users/me/password` menerima `{ password, confirmPassword }`. Penyimpanan memakai `updateMany` dengan kondisi `passwordHash: null`, sehingga hanya berhasil jika user belum punya password dan aman dari balapan; selain itu `409`. `GET /api/users/me` mengembalikan `hasPassword` (boolean) agar frontend tahu apakah form ditampilkan. Hash tidak pernah dikirim ke client.

## Otorisasi request ([`middlewares/auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js))

Diterapkan per-router dengan `router.use(authMiddleware)` (devices, users, notifications, superadmin) atau per-route (plants, recommendation history). Lihat masing-masing file router untuk mengetahui route mana yang publik dan mana yang terproteksi.

```javascript
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Akses ditolak. ...', 401, true));
  }
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  req.user = decoded;
  next();
};
```

Jika berhasil, `req.user` berisi payload JWT yang telah didekode (`{ id, email, name }`), dan controller membaca `req.user.id` untuk membatasi query hanya pada pemanggil. Jika gagal, middleware melempar `AppError(401)` lewat `next()`, yang ditangkap [middleware error terpusat](../api/error-response.md).

## Otorisasi berbasis role ([`middlewares/superadmin.middleware.js`](../../backend/src/middlewares/superadmin.middleware.js))

Dipasang setelah `authMiddleware` pada router `/api/superadmin`. Middleware ini **tidak mempercayai token**: ia mengambil `role` user dari database pada setiap request dan hanya meneruskan jika nilainya `SUPERADMIN`.

| Kondisi | Hasil |
|---|---|
| `req.user.id` tidak ada | `401` |
| User tidak ditemukan atau `role` bukan `SUPERADMIN` | `403` (dicatat sebagai warning) |
| Query database gagal | Diteruskan ke error middleware (`500`), akses tidak diberikan |

Karena dibaca dari database, user yang diturunkan role-nya kehilangan akses seketika, dan token dengan klaim `role` yang dipalsukan tidak berpengaruh. Role hanya dapat diubah lewat Supabase Dashboard; tidak ada endpoint, seed, atau kode yang menulis kolom `role`. Lihat [ADR-010](../decisions/adr-010-superadmin-role.md).

## Secrets

`JWT_SECRET` dibaca lewat [`config/jwt.js`](../../backend/src/config/jwt.js), yang melempar error saat startup jika env var tidak diset. `auth.controller.js` dan `auth.middleware.js` sama-sama mengimpor dari sana. Set `JWT_SECRET` yang kuat di semua environment (lihat [setup/environment.md](../setup/environment.md)).

## Yang belum dicakup

- Tidak ada refresh token. JWT valid selama masa berlaku penuh 7 harinya atau sampai `JWT_SECRET` dirotasi; tidak ada daftar revokasi di sisi server. Akibatnya, token yang sudah dipegang pihak lain tetap berlaku sampai 7 hari meskipun password dihapus saat penautan Google.
- Tidak ada verifikasi email saat registrasi (proyek belum punya layanan pengiriman email). Itu sebabnya penautan Google menghapus password lama. Verifikasi email adalah perbaikan menyeluruhnya.
- Tidak ada alur ubah atau lupa password; password hanya bisa dibuat satu kali dari profil untuk akun yang belum memilikinya.
- Role hanya `USER` dan `SUPERADMIN`; selain endpoint `/api/superadmin`, otorisasi tetap berdasarkan kepemilikan data (lihat [api/error-response.md](../api/error-response.md#authorization-vs-not-found)).
