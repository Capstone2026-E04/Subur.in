# ADR-003: JWT terbitan backend yang dijembatani melalui NextAuth

## Status
Diterima

## Konteks
Frontend menggunakan NextAuth v5 murni untuk proses handshake Google OAuth (consent screen, token exchange, session cookie). Backend adalah service Express terpisah dengan database sendiri dan tanpa integrasi NextAuth, serta perlu mengautentikasi setiap request API secara independen dari mekanisme session frontend (misalnya untuk client non-browser di masa depan, atau jika frontend suatu saat diganti).

## Keputusan
Saat sign-in Google berhasil, callback `signIn` milik NextAuth ([`lib/auth.ts`](../../frontend/src/lib/auth.ts)) langsung menukar Google ID token dengan JWT terbitan backend dengan memanggil `POST /api/auth/google`. JWT backend tersebut disimpan di dalam session NextAuth (`session.user.backendToken`) dan adalah token yang benar-benar dikirim sebagai `Authorization: Bearer` pada setiap pemanggilan backend API. Google ID token itu sendiri tidak pernah digunakan ulang setelah pertukaran ini.

## Konsekuensi
- Backend tetap menjadi otoritas autentikasi yang mandiri (`JWT_SECRET` sendiri, tabel user sendiri yang diindeks dengan `googleId`/`email`): backend tidak perlu mempercayai atau memvalidasi session cookie NextAuth, sehingga bisa melayani client non-Next.js tanpa perubahan.
- Sign-in gagal secara fail-closed: jika pemanggilan pertukaran ke backend gagal (error jaringan, backend down, `GOOGLE_CLIENT_ID` tidak cocok), `signIn` mengembalikan `false` dan user tidak pernah diberikan session NextAuth, meskipun langkah OAuth Google sendiri berhasil.
- Ada dua masa hidup token (session NextAuth vs. JWT backend berumur 7 hari yang tersimpan di dalamnya): jika keduanya tidak sinkron, seorang user bisa memiliki session NextAuth yang aktif dengan token backend yang sudah kedaluwarsa, sehingga mendapat 401 pada pemanggilan API sampai mereka melakukan autentikasi ulang. Saat ini belum ada refresh proaktif untuk token backend sebelum masa berlaku 7 harinya habis.
