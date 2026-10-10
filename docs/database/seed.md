# Seeding

Seed script: [`backend/prisma/seed.js`](../../backend/prisma/seed.js), dikonfigurasi sebagai entrypoint seed Prisma di `package.json`:
```json
"prisma": { "seed": "node prisma/seed.js" }
```

## Menjalankan

```bash
cd backend
npm run db:seed
```
(setara dengan `node prisma/seed.js`, atau `npx prisma db seed`)

## Apa yang dilakukannya

Seed ini bersifat **destructive-then-recreate** untuk data referensi: ia menghapus baris yang sudah ada sebelum menyisipkan yang baru, sesuai urutan dependensi:
1. Menghapus semua baris `Device`, lalu semua baris `Plant` (device mereferensikan plant dengan `onDelete: Restrict`, sehingga plant harus dibersihkan setelah device).
2. Menyisipkan 3 tanaman: **Bayam** (`Spinacia oleracea`), **Pakcoy** (`Brassica rapa subsp. chinensis`), **Selada** (`Lactuca sativa`), masing-masing dengan `minPh`/`maxPh`/`phTarget` yang digunakan oleh fuzzy engine.

Karena seed ini menghapus baris `Device`, **jangan jalankan ini terhadap database production dengan device terdaftar yang nyata**. Ini akan mencabut registrasi setiap device. Seed ini dimaksudkan untuk inisialisasi database lokal/dev.

## Memperluas

Untuk menambahkan tanaman baru, tambahkan object ke array yang sesuai di `seed.js`. Tidak ada perubahan kode lain yang diperlukan, karena recommendation engine mencari plant berdasarkan nama atau UUID saat request dilakukan, bukan meng-hardcode kumpulan data yang di-seed. Tambahkan juga trigger/target NMI-nya di `src/ai/config/plant_moisture.js`. Jaga agar `minPh`/`maxPh`/`phTarget` tetap realistis untuk spesies tersebut; nilai-nilai ini secara langsung menggerakkan perhitungan dosis irigasi/kapur/belerang (lihat [architecture/system-design.md](../architecture/system-design.md#why-fuzzy-logic)).
