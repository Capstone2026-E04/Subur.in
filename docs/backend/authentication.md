# Autentikasi backend

Hanya Google Sign-In, dengan JWT yang diterbitkan backend sebagai token sesi untuk API. Lihat [api/authentication.md](../api/authentication.md) untuk kontrak endpoint dan [architecture/api-flow.md](../architecture/api-flow.md) untuk diagram sekuens.

## Alur Sign-In ([`controllers/auth.controller.js`](../../backend/src/controllers/auth.controller.js))

1. Client mengirim `{ idToken }`, yaitu ID token yang diterbitkan Google (diperoleh frontend melalui Google provider milik NextAuth).
2. Backend memverifikasinya dengan `OAuth2Client.verifyIdToken` dari `google-auth-library`, memeriksa audience terhadap `GOOGLE_CLIENT_ID`.
3. Mengekstrak `sub` (ID user Google), `email`, `email_verified`, `name`, `picture` dari payload yang telah diverifikasi. Email yang tidak ada atau belum terverifikasi ditolak dengan `400`.
4. Mencari user berdasarkan `googleId`; jika tidak ditemukan, mencoba mencari berdasarkan `email` dan menautkan Google ID ke akun yang sudah ada tersebut (menangani kasus user yang sudah ada sebelum penautan Google, atau re-auth setelah `googleId` entah bagaimana terhapus); jika tidak, membuat `User` baru.
5. Menandatangani JWT (`{ id, email, name }`, `JWT_SECRET`, algoritma `HS256`, masa berlaku 7 hari) dan mengembalikannya bersama data user.

## Otorisasi request ([`middlewares/auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js))

Diterapkan per-router dengan `router.use(authMiddleware)` (devices, users, notifications) atau per-route (plants, recommendation history). Lihat masing-masing file router untuk mengetahui route mana yang publik dan mana yang terproteksi.

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

Jika berhasil, `req.user` berisi payload JWT yang telah didekode (`{ id, email, name }`), dan controller membaca `req.user.id` untuk membatasi query hanya pada pemanggil (caller). Jika gagal (header hilang, header salah format, signature kedaluwarsa/tidak valid), middleware melempar `AppError(401)` lewat `next()`, yang ditangkap [middleware error terpusat](../api/error-response.md) dan menghentikan request dengan `401` sebelum controller dijalankan.

## Secrets

`JWT_SECRET` dibaca lewat [`config/jwt.js`](../../backend/src/config/jwt.js), yang melempar error saat startup jika env var tidak diset (tidak ada lagi fallback hardcoded). `auth.controller.js` dan `auth.middleware.js` sama-sama mengimpor dari sana. Set `JWT_SECRET` yang kuat di semua environment (lihat [setup/environment.md](../setup/environment.md)).

## Yang belum dicakup

- Tidak ada refresh token. JWT valid selama masa berlaku penuh 7 harinya atau sampai `JWT_SECRET` dirotasi; tidak ada daftar revokasi di sisi server.
- Tidak ada sistem role/permission. Setiap user yang terautentikasi memiliki kemampuan yang sama atas resource miliknya sendiri; otorisasi murni berdasarkan "apakah Anda pemilik baris data ini" (lihat [api/error-response.md](../api/error-response.md#authorization-vs-not-found)).
