# Migration

Proyek ini menggunakan `prisma db push` di production (tidak ada riwayat `prisma/migrations/` yang di-commit). Lihat [`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml), yang menjalankan `docker compose exec -T backend npx prisma db push --skip-generate` setiap kali backend di-deploy. Perubahan schema dikirim dengan mengedit `schema.prisma` dan membiarkan deploy berikutnya mem-push perubahan tersebut.

## Pengembangan lokal

```bash
cd backend
npx prisma db push       # iterasi cepat, tanpa file migration, sesuai dengan strategi production sendiri
```

Jika Anda ingin riwayat migration yang bisa direview untuk perubahan tertentu (misalnya sebelum perubahan schema yang berpotensi destruktif), Anda bisa menggunakan:
```bash
npx prisma migrate dev --name <change-description>
```
tetapi perlu diingat ini menyimpang dari cara production menerapkan perubahan schema (`db push`). Folder `migrations/` yang dibuat oleh `migrate dev` saat ini tidak digunakan oleh deploy pipeline. Perlakukan `db push` sebagai source of truth kecuali tim sengaja mengadopsi workflow file migration secara project-wide.

## Persyaratan

- `DIRECT_URL` harus di-set (koneksi non-pooled). `db push`/`migrate` membutuhkan operasi level session yang tidak didukung oleh connection pooler (misalnya pooler berbasis PgBouncer milik Supabase). Lihat [setup/environment.md](../setup/environment.md).

## Manajemen partisi

`raw_sensor_logs` di-partisi berdasarkan rentang bulan di level SQL, di luar schema Prisma. `prisma db push` **tidak** membuat/menghapus partisi. Pembuatan partisi dan pembersihan partisi lama ditangani saat runtime oleh [`cron/database_cleanup_cron.js`](../../backend/src/cron/database_cleanup_cron.js), yang memeriksa `pg_partitioned_table`/`pg_class` dan menjalankan DDL `CREATE TABLE ... PARTITION OF` mentah sesuai kebutuhan. Jika Anda mengubah kolom `RawSensorLog` di `schema.prisma`, pastikan SQL mentah pada file cron tersebut masih sesuai dengan susunan kolom yang diperbarui.

## Rollback

Tidak ada rollback otomatis untuk `db push` (karena tidak berbasis file migration, sehingga tidak ada migration "down"). Untuk membatalkan perubahan schema yang bermasalah: kembalikan `schema.prisma` ke bentuk sebelumnya lalu jalankan `db push` lagi. Ini aman untuk perubahan yang bersifat additive/non-destruktif, tetapi **dapat menghapus data** untuk penghapusan kolom/tipe, jadi tinjau output diff dari `prisma db push` (atau jalankan terlebih dahulu terhadap DB staging) sebelum mem-push perubahan destruktif ke production.
