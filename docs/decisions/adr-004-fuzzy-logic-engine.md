# ADR-004: Fuzzy logic Mamdani untuk rekomendasi perawatan tanaman

## Status
Diterima

## Konteks
Merekomendasikan perlakuan irigasi/kapur/belerang dari pembacaan sensor pH dan kelembapan mentah perlu memperhitungkan dua variabel yang berinteraksi secara non-linear dan berbeda per tanaman (setiap spesies memiliki rentang pH dan target yang dapat diterima masing-masing). Threshold if/else tetap per variabel tidak bisa mengekspresikan kondisi gabungan seperti "cukup asam dan cukup kering" secara berbeda dari "sangat asam dan sangat kering," dan tidak dapat diskalakan dengan rapi ke rentang target per tanaman tanpa ledakan jumlah rule.

## Keputusan
Mengimplementasikan sistem inferensi fuzzy Mamdani di `src/ai`:
- **Membership function** ([`ai/core/membership.js`](../../backend/src/ai/core/membership.js)): pH (`ASAM/OPTIMAL/BASA`, dari `Plant.minPh/maxPh`) dan NMI (`KERING/OPTIMAL/BASAH`, dari trigger per tanaman di [`ai/config/plant_moisture.js`](../../backend/src/ai/config/plant_moisture.js)).
- **Rule base** ([`ai/core/rules.js`](../../backend/src/ai/core/rules.js)): 3x3 = 9 rule yang memetakan ke kategori `C1`-`C9` (`WaterAction` x `pHAction`).
- **Inference engine** ([`ai/core/engine.js`](../../backend/src/ai/core/engine.js)): MIN-MAX dengan pemilihan aksi diskret per dimensi dan tie-break berprioritas, tanpa defuzzifikasi centroid.
- **Safety gate** ([`ai/core/safety_gate.js`](../../backend/src/ai/core/safety_gate.js)): menentukan apakah koreksi pH boleh ditampilkan, ditunda, atau perlu konfirmasi.
- **Interpreter** ([`ai/utils/interpreter.js`](../../backend/src/ai/utils/interpreter.js)): teks tindakan per kategori.
- **Kalkulator dosis** ([`ai/dosage/*`](../../backend/src/ai/dosage)): air, dolomit, sulfur sesuai rumus C501.

Spesifikasi lengkap ada di [fuzzy-logic.md](../backend/fuzzy-logic.md). Rancangan ini menggantikan versi awal (5 himpunan pH x 4 himpunan kelembapan, 20 rule, centroid) mengikuti dokumen C501.

## Konsekuensi
- Rule bersifat deklaratif dan tersentralisasi dalam satu file, membuat logika rekomendasi mudah diaudit dan diuji secara independen dari concern web/database mana pun (`src/ai` tidak memiliki import Express/Prisma di intinya, hanya layer orkestrasi `services/recommendation.service.js` bagian luar yang menyentuh Prisma).
- Menambahkan tanaman baru memerlukan data `minPh`/`maxPh`/`phTarget` di seed dan entri trigger/target NMI di `config/plant_moisture.js` (tanpa rule atau kode inferensi baru).
- Kategori adalah label diskret, sehingga tidak ada aproksimasi numerik atau parameter `Y_STEP`; keputusan seri diselesaikan lewat urutan prioritas yang deterministik.
- `POST /api/recommendations/simulate` ada khusus agar engine ini bisa diuji dan divalidasi dengan input sembarang tanpa perlu device atau riwayat tersimpan yang nyata, sejalan dengan unit test Jest di `src/__tests__/ai/`.
