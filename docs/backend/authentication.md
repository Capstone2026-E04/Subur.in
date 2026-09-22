# Autentikasi backend

Hanya Google Sign-In, dengan JWT yang diterbitkan backend sebagai token sesi untuk API. Lihat [api/authentication.md](../api/authentication.md) untuk kontrak endpoint dan [architecture/api-flow.md](../architecture/api-flow.md) untuk diagram sekuens.

## Alur Sign-In ([`controllers/auth.controller.js`](../../backend/src/controllers/auth.controller.js))

1. Client mengirim `{ idToken }`, yaitu ID token yang diterbitkan Google (diperoleh frontend melalui Google provider milik NextAuth).
2. Backend memverifikasinya dengan `OAuth2Client.verifyIdToken` dari `google-auth-library`, memeriksa audience terhadap `GOOGLE_CLIENT_ID`.
3. Mengekstrak `sub` (ID user Google), `email`, `name`, `picture` dari payload yang telah diverifikasi.
4. Mencari user berdasarkan `googleId`; jika tidak ditemukan, mencoba mencari berdasarkan `email` dan menautkan Google ID ke akun yang sudah ada tersebut (menangani kasus user yang sudah ada sebelum penautan Google, atau re-auth setelah `googleId` entah bagaimana terhapus); jika tidak, membuat `User` baru.
5. Menandatangani JWT (`{ id, email, name }`, `JWT_SECRET`, masa berlaku 7 hari) dan mengembalikannya bersama data user.

## Otorisasi request ([`middlewares/auth.middleware.js`](../../backend/src/middlewares/auth.middleware.js))

Diterapkan per-router dengan `router.use(authMiddleware)` (devices, users, notifications) atau per-route (plants, polybags, recommendation history). Lihat masing-masing file router untuk mengetahui route mana yang publik dan mana yang terproteksi.

```javascript
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '...' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
};
```

Jika berhasil, `req.user` berisi payload JWT yang telah didekode (`{ id, email, name }`), dan controller membaca `req.user.id` untuk membatasi query hanya pada pemanggil (caller). Jika gagal (header hilang, header salah format, signature kedaluwarsa/tidak valid), request dihentikan dengan `401` sebelum controller dijalankan.

## Secrets

`JWT_SECRET` memiliki fallback hardcoded (`'fallback_secret_for_development'`) jika env var tidak diset. Ini tidak boleh diandalkan di luar development lokal: `JWT_SECRET` yang hilang pada environment mana pun yang di-deploy berarti siapa pun dapat memalsukan token sesi yang valid. Selalu set `JWT_SECRET` yang kuat di production (lihat [setup/environment.md](../setup/environment.md)).

## Yang belum dicakup

- Tidak ada refresh token. JWT valid selama masa berlaku penuh 7 harinya atau sampai `JWT_SECRET` dirotasi; tidak ada daftar revokasi di sisi server.
- Tidak ada sistem role/permission. Setiap user yang terautentikasi memiliki kemampuan yang sama atas resource miliknya sendiri; otorisasi murni berdasarkan "apakah Anda pemilik baris data ini" (lihat [api/error-response.md](../api/error-response.md#authorization-vs-not-found)).
