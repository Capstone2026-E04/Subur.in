# ADR-008: Jest sebagai test runner, menggantikan script `assert`+`node` manual

## Status
Diterima

## Konteks
Backend sebelumnya tidak memiliki test runner (`package.json#scripts.test` adalah placeholder `echo "Error: no test specified" && exit 1`). Test yang ada (`src/ai/__tests__/dosage.test.js`, `recommendation.test.js`) ditulis sebagai script Node biasa: fungsi `async function runTests()` yang memanggil `assert.strictEqual`/`assert.rejects` secara berurutan, mencetak progres lewat `console.log` berbahasa Indonesia, dan dijalankan langsung lewat `node src/ai/__tests__/recommendation.test.js`. `recommendation.test.js` juga menghantam database Supabase sungguhan (query `prisma.polybag.findMany`/`prisma.plant.findFirst` nyata) dan melewati (skip) diam-diam alih-alih gagal jika data seed tidak ada, sehingga assertion sebenarnya bisa saja tidak pernah dijalankan tanpa terlihat di output CI mana pun (lagipula belum ada CI yang menjalankannya).

Saat menambahkan modul `src/telegram/` ([ADR-007](adr-007-telegram-bot-command-module.md)), pola yang sama sempat diperluas ke `src/telegram/__tests__/` sebelum migrasi ini: test yang menyentuh Redis (`resolveActiveDevice`, wizard) harus menangani kasus Redis benar-benar tidak terjangkau dari environment test secara manual (retry ioredis yang menggantung, race exit), menunjukkan pola manual ini semakin tidak scalable begitu jumlah dependency eksternal yang perlu diisolasi bertambah.

## Keputusan
- Mengadopsi **Jest** sebagai satu-satunya test runner backend, dipasang sebagai `devDependency` dan dihubungkan lewat `jest.config.js` + `package.json#scripts.test`.
- Memindahkan seluruh test dari folder `__tests__/` yang tersebar co-located (`src/ai/__tests__/`, `src/telegram/__tests__/`) menjadi satu folder tersentralisasi `src/__tests__/`, mencerminkan struktur `src/` (`src/__tests__/ai/dosage/water_calculator.test.js` untuk `src/ai/dosage/water_calculator.js`, dst).
- Unit test **memock** setiap dependency I/O (Prisma via `jest.mock('.../database/connections/prisma_client')`, Redis via `jest.mock('.../database/connections/redis')`) alih-alih menghantam database/Redis sungguhan; kalkulator dan mesin fuzzy (`src/ai/core`, `src/ai/dosage`) yang murni tanpa I/O diuji langsung tanpa mocking apa pun.
- Struktur test memakai `describe()`/`it()` dengan pola Arrange-Act-Assert, bukan fungsi `runTests()` naratif dengan `console.log` progres manual.
- File `dosage.test.js` gabungan dipecah menjadi satu file per kalkulator (`water_calculator.test.js`, `lime_calculator.test.js`, `sulfur_calculator.test.js`) mengikuti konvensi satu file test per file sumber.

## Konsekuensi
- `npm test` sekarang benar-benar menjalankan sesuatu dan gagal dengan exit code non-zero saat assertion gagal, sehingga dapat dihubungkan ke CI (belum ada workflow CI test terpisah saat ADR ini ditulis; hanya `deploy-backend.yml`/`deploy-frontend.yml` yang ada).
- Unit test tidak lagi bergantung pada data seed nyata atau konektivitas Supabase/Redis dari environment test, menghilangkan mode skip-diam-diam yang ada di `recommendation.test.js` versi lama.
- Test baru untuk file yang menyentuh Prisma/Redis wajib memock dependency tersebut (lihat [backend/coding-standards.md](../backend/coding-standards.md#testing)); test yang sengaja menghantam database/Redis sungguhan (integration test) harus ditandai dan dikelompokkan secara eksplisit sebagai tingkatan terpisah jika/ketika ditambahkan, bukan dicampur ke dalam suite unit test default.
- Menambah dependency baru (`jest`) ke `devDependencies`; tidak ada perubahan pada `dependencies` produksi.
