# Testing

Panduan menjalankan dan menulis test backend. Test memakai **Jest** ([ADR-008](../decisions/adr-008-jest-for-testing.md)). Frontend belum memiliki test otomatis.

## Menjalankan test

Semua perintah dijalankan dari folder `backend/`.

```bash
npm test                                   # seluruh suite
npx jest src/__tests__/ai                  # satu folder
npx jest src/__tests__/ai/c501/inference   # satu file (cocok sebagian nama)
npx jest -t "tie break"                    # berdasarkan nama test
npx jest --coverage                        # laporan cakupan
```

`jest.config.js` mencari `src/__tests__/**/*.test.js`, memakai environment `node`, dan membersihkan mock di antara test (`clearMocks: true`). Test tidak membutuhkan database, Redis, atau broker MQTT: semuanya di-mock.

## Struktur folder

Seluruh test berada di `src/__tests__/` dan mencerminkan struktur `src/`. Nama file `<nama_sumber>.test.js`.

```
src/__tests__/
├── ai/
│   ├── c501/                        test berbasis dokumen perancangan C501 (lihat di bawah)
│   │   ├── fixtures.js              parameter tanaman bersama (bukan test)
│   │   ├── membership.test.js       Step 3-4: fungsi keanggotaan NMI dan pH
│   │   ├── inference.test.js        Step 5-7: aktivasi rule, kategori final, konsistensi rule base
│   │   ├── dosage.test.js           Step 8-10: kalkulator air, dolomit, sulfur
│   │   ├── safety_gate.test.js      Step 11: safety gate koreksi pH
│   │   └── recommendation.test.js   Step 8 dan 11: hasil end-to-end lewat service
│   └── services/
│       └── recommendation.service.test.js   riwayat koreksi, konfigurasi prototipe, validasi input
├── controllers/                     correction, device, user
├── cron/                            database_cleanup_cron
├── mqtt/subscribers/                sensor_subscriber
├── services/                        dev_mode.service
└── telegram/                        router, commands/, session/
```

## Test berbasis dokumen C501

Folder `ai/c501/` berisi test yang angkanya disalin langsung dari dokumen perancangan C501 ("FIX Fuzzy dan Dose Setelah Kalibrasi"). Nomor Step pada nama `describe` merujuk ke dokumen tersebut. Isinya:

| File | Yang diverifikasi |
|------|-------------------|
| `membership.test.js` | Contoh perhitungan NMI (A-D) dan pH (5.1-5.4); derajat keanggotaan 0-1, jumlah tiga himpunan selalu 1, KERING dan BASAH tidak aktif bersamaan |
| `inference.test.js` | Rule aktif pada contoh 6.1, 6.2, 6.4, 6.5; kategori akhir pada tabel Step 6-7 termasuk tie break; 9 rule, antecedent unik, C1-C9 terwakili, selalu ada rule dengan firing strength >= 0,5 |
| `dosage.test.js` | Air 120 / 160 mL, Vneed 100 mL, maksimum 360 / 320 mL; dolomit 2,86 g dan batas 4,7 g; sulfur dibatasi 1,2 g |
| `safety_gate.test.js` | Ambang pH min - 0,5 dan max + 0,5, media basah, minimal 2 pembacaan, periode tunggu 14 hari, batas ukur probe 3,5 dan 8,0 |
| `recommendation.test.js` | Keputusan air (contoh C dan D) dan lima baris tabel pemeriksaan sistem Step 11 |

Bila dokumen C501 direvisi, ubah angka di file ini terlebih dahulu, lalu sesuaikan kode agar test lulus.

## Konvensi menulis test

- **Arrange-Act-Assert** dipisah baris kosong; tidak memakai komentar penanda.
- **Satu perilaku per test.** Nama test menyebut perilaku dan kondisinya, misalnya `defers the correction when the last logged correction is 3 days old`. Nama test berbahasa Inggris.
- **Tanpa komentar** pada file test; keterangan sumber ditaruh di nama `describe`.
- **Deterministik.** Waktu dikirim lewat parameter (`now`) atau dihitung relatif, tidak bergantung urutan test.
- **Mock I/O, bukan logika.** Fungsi murni (mesin fuzzy, kalkulator, safety gate) dipanggil langsung tanpa mock.
- Gunakan `expect.objectContaining` untuk query Prisma agar test tidak rapuh terhadap field yang tidak relevan.

## Pola mock

Prisma:

```js
jest.mock("../../database/connections/prisma_client", () => ({
  device: { findFirst: jest.fn() },
  correctionLog: { create: jest.fn(), findMany: jest.fn() },
}));
```

Redis (dengan counter nyata agar urutan `incr` berperilaku seperti aslinya):

```js
counters = {};
redis = {
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn(async (key) => (counters[key] = (counters[key] ?? 0) + 1)),
};
getRedisClient.mockReturnValue(redis);
```

Controller dipanggil langsung dengan `req`/`res` palsu (`res.status` dan `res.json` berupa `jest.fn()`); routing Express tidak diuji di unit test.

## Menambah test

1. Letakkan file di `src/__tests__/` pada path yang sama dengan file sumbernya, dengan akhiran `.test.js`.
2. Untuk logika fuzzy atau dosis yang berasal dari dokumen C501, tambahkan di `ai/c501/` bersama sumber contohnya.
3. Fungsi baru yang non-trivial minimal punya satu test jalur normal dan satu test kegagalan atau kasus tepi.
4. Jalankan `npm test` sebelum commit.

Setelah mengubah kode, sebuah cara cepat memeriksa test benar-benar menjaga perilaku: longgarkan satu ambang atau kondisi di kode sumber, jalankan test terkait, dan pastikan ada yang gagal; kembalikan perubahannya.

## Batasan saat ini

- Belum ada test integrasi (Supertest ke database uji) dan belum ada workflow CI yang menjalankan `npm test`.
- Cakupan kode sekitar 62% pernyataan (`npx jest --coverage`); logika inti (`ai/`, subscriber MQTT, controller koreksi) menjadi prioritas, sedangkan route, auth, dan sebagian controller lain belum diuji.
- Frontend belum memiliki test.
