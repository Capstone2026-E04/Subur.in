# ADR-009: Autentikasi email + password berdampingan dengan Google

## Status
Diterima

## Konteks
Sebelumnya satu-satunya cara masuk adalah Google Sign-In. Ada kebutuhan mendaftar dan masuk dengan email + password, tanpa kehilangan Google Sign-In, dan user yang mendaftar dengan email + password harus bisa langsung masuk dengan Google memakai akun yang sama.

Proyek ini belum punya layanan pengiriman email, jadi kepemilikan email saat registrasi tidak bisa diverifikasi. Itu membuka serangan pra-pembajakan akun: penyerang mendaftarkan email korban dengan password miliknya; ketika korban kemudian masuk dengan Google, akun yang tertaut masih bisa dimasuki penyerang lewat password tersebut.

## Keputusan
- `users.google_id` menjadi nullable dan ditambah `users.password_hash`. Satu baris `User` mewakili satu orang, apa pun cara daftarnya. Email dicocokkan tanpa membedakan huruf besar/kecil.
- Password di-hash dengan **scrypt dari modul `crypto` Node** (salt acak per hash, format `scrypt1$salt$hash`, perbandingan `timingSafeEqual`), bukan paket bcrypt/argon2, karena stdlib sudah memenuhi kebutuhan dan menghindari dependensi native.
- Login mengembalikan satu pesan galat untuk semua kegagalan dan selalu menjalankan verifikasi hash (hash palsu bila user tidak ada), agar tidak membocorkan keberadaan akun lewat pesan atau waktu respons.
- Percobaan login gagal dibatasi 10 per email per 15 menit dengan `express-rate-limit` (satu-satunya dependensi baru).
- Frontend memakai NextAuth **Credentials provider** yang memanggil `POST /api/auth/login`, menghasilkan token backend yang sama dengan jalur Google ([ADR-003](adr-003-backend-jwt-with-nextauth.md)). Masa berlaku sesi NextAuth diset 7 hari agar tidak melebihi JWT backend.
- Saat Google menautkan akun yang **hanya** punya email + password, `password_hash` dihapus. Avatar Google dipakai bila akun belum punya avatar. User membuat password lagi lewat `POST /api/users/me/password` di halaman profil.
- Akun yang dibuat lewat Google dapat membuat password sekali dari profil; belum ada ubah atau lupa password.

## Konsekuensi
- Pra-pembajakan lewat password dicegah pada saat penautan, dengan biaya user sah harus membuat password lagi setelah pertama kali masuk dengan Google.
- Risiko tersisa: JWT yang sudah dipegang penyerang tetap berlaku sampai 7 hari karena tidak ada revokasi sisi server. Perbaikan menyeluruhnya adalah verifikasi email sebelum akun dapat dipakai, dan/atau revokasi token.
- Registrasi dengan email yang sudah terdaftar menjawab `409`, sehingga keberadaan email tertentu dapat ditebak. Ini kompromi umum tanpa verifikasi email.
- Penghitung batas login berada di memori satu proses: tidak dibagi antar instance dan hilang saat restart. Kuncinya email, sehingga pihak lain bisa mengunci login email tertentu sementara.
- Tidak ada aturan komposisi password (hanya 8 sampai 128 karakter).
