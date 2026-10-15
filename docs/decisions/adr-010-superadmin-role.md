# ADR-010: Role SUPERADMIN yang dicek ke database dan hanya diubah lewat Supabase

## Status
Diterima

## Konteks
Dibutuhkan satu level akses yang dapat melihat seluruh data di database (semua user, perangkat, log, notifikasi) lewat menu khusus di dashboard, tanpa membuka akses itu ke user biasa dengan cara apa pun. Sebelumnya tidak ada konsep role; otorisasi murni berdasarkan kepemilikan data.

## Keputusan
- Kolom `users.role` bertipe enum Postgres `user_role` (`USER`, `SUPERADMIN`), `NOT NULL`, default `USER`. Semua user lama otomatis `USER` ([`007_user_role.sql`](../../backend/prisma/manual/007_user_role.sql)).
- Role **hanya diubah lewat Supabase Dashboard**. Tidak ada endpoint, seed, atau kode aplikasi yang menulis kolom `role`; pembuatan user (Google maupun email) memakai default `USER`, dan `PATCH /api/users/me` hanya menerima `name` dan `avatarUrl`.
- Role **tidak dimasukkan ke JWT**. `superadmin.middleware.js` membaca role dari database pada setiap request ke `/api/superadmin/*`, sehingga demosi berlaku seketika dan klaim token tidak dapat dipalsukan untuk naik hak akses.
- Frontend menyembunyikan menu "Superadmin" kecuali backend melaporkan `role = SUPERADMIN` (dari `GET /api/users/me`, bukan dari sesi). Halaman `/dashboard/superadmin` memanggil `requireSuperadmin()` di server dan mengarahkan user lain ke `/dashboard` (belum login ke `/login`), gagal tertutup jika profil tidak dapat dimuat. Penegakan sebenarnya tetap di API, sehingga melewati UI tidak memberi akses.
- Endpoint superadmin memakai daftar putih tabel, kolom urut, kolom cari, dan filter; kolom rahasia (`password_hash`, kode tautan Telegram) tidak pernah dikirim.

## Konsekuensi
- Menambah satu query ringan (`select role`) pada setiap request superadmin; request user biasa tidak terkena.
- Aplikasi dan Supabase Dashboard sama-sama terhubung sebagai role Postgres dengan hak penuh, sehingga larangan menulis `role` dari aplikasi dijaga oleh ketiadaan kode, bukan oleh batasan database. Trigger database yang memblokir perubahan role tidak ditambahkan karena tidak bisa membedakan penulis aplikasi dari Dashboard.
- Pemeriksaan di layout Next.js tidak diandalkan untuk keamanan (layout tidak dirender ulang pada setiap navigasi klien), maka pemeriksaan dilakukan di halaman dan di API.
