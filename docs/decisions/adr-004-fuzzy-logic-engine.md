# ADR-004: Fuzzy logic Mamdani untuk rekomendasi perawatan tanaman

## Status
Diterima

## Konteks
Merekomendasikan perlakuan irigasi/kapur/belerang dari pembacaan sensor pH dan kelembapan mentah perlu memperhitungkan dua variabel yang berinteraksi secara non-linear dan berbeda per tanaman (setiap spesies memiliki rentang pH dan target yang dapat diterima masing-masing). Threshold if/else tetap per variabel tidak bisa mengekspresikan kondisi gabungan seperti "cukup asam dan cukup kering" secara berbeda dari "sangat asam dan sangat kering," dan tidak dapat diskalakan dengan rapi ke rentang target per tanaman tanpa ledakan jumlah rule.

## Keputusan
Mengimplementasikan sistem inferensi fuzzy Mamdani di `src/ai`:
- **Membership function** ([`ai/core/membership.js`](../../backend/src/ai/core/membership.js)) melakukan fuzzifikasi pH dan kelembapan menjadi himpunan linguistik, yang diparameterisasi per tanaman dari `Plant.minPh/maxPh/phTarget`.
- **Rule base** ([`ai/core/rules.js`](../../backend/src/ai/core/rules.js)) memetakan kombinasi himpunan fuzzy ke salah satu dari 9 kategori output (`C1`-`C9`).
- **Inference engine** ([`ai/core/engine.js`](../../backend/src/ai/core/engine.js)) mengevaluasi rule yang aktif, mengagregasi, dan melakukan defuzzifikasi melalui metode centroid yang didiskretisasi menjadi indeks kontinu, lalu membulatkannya ke kategori terdekat.
- **Interpreter** ([`ai/utils/interpreter.js`](../../backend/src/ai/utils/interpreter.js)) mengubah kategori menjadi tindakan yang human-readable dan flag (`needsWater`, `needsLime`, `needsSulfur`, `reduceWatering`).
- **Kalkulator dosis** ([`ai/dosage/*`](../../backend/src/ai/dosage)) mengubah flag tersebut menjadi jumlah gram/liter konkret menggunakan volume tanah fisik dari polybag.

## Konsekuensi
- Rule bersifat deklaratif dan tersentralisasi dalam satu file, membuat logika rekomendasi mudah diaudit dan diuji secara independen dari concern web/database mana pun (`src/ai` tidak memiliki import Express/Prisma di intinya, hanya layer orkestrasi `services/recommendation.service.js` bagian luar yang menyentuh Prisma).
- Menambahkan tanaman baru hanya memerlukan data seed `minPh`/`maxPh`/`phTarget` baru (tanpa rule atau kode baru) karena membership function diparameterisasi per tanaman.
- Langkah defuzzifikasi (`Y_MIN`/`Y_MAX`/`Y_STEP` di [`ai/config/fuzzy_parameters.js`](../../backend/src/ai/config/fuzzy_parameters.js)) adalah aproksimasi numerik (centroid yang didiskretisasi), bukan integral closed-form. Memperketat `Y_STEP` menukar presisi dengan latensi inferensi; ukuran step saat ini dipilih secara empiris dan tidak kritis terhadap performa mengingat volume request yang ada.
- `POST /api/recommendations/simulate` ada khusus agar engine ini bisa diuji dan divalidasi dengan input sembarang tanpa perlu device atau riwayat tersimpan yang nyata, sejalan dengan unit test Jest di `src/__tests__/ai/`.
