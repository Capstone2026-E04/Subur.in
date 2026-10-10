# Fuzzy logic

Dokumen ini menjelaskan mesin fuzzy di `backend/src/ai` setelah disesuaikan dengan dokumen perancangan **C501** ("FIX Fuzzy dan Dose Setelah Kalibrasi"). Alasan memilih metode ini ada di [ADR-004](../decisions/adr-004-fuzzy-logic-engine.md).

## Alur

```
Sensor -> validasi input -> fuzzifikasi (pH, NMI) -> rule base 3x3 -> MIN-MAX
       -> WaterAction + pHAction -> kategori C1-C9 -> safety gate -> kalkulator dosis
```

Fuzzy hanya menentukan **jenis** tindakan. Besaran air/dolomit/sulfur dihitung kalkulator deterministik, dan safety gate menentukan apakah koreksi pH boleh ditampilkan sebagai instruksi.

| File | Peran |
|------|-------|
| `core/membership.js` | Fungsi keanggotaan pH dan NMI |
| `core/rules.js` | Rule base 3x3, definisi kategori C1-C9, urutan prioritas tie |
| `core/engine.js` | Firing strength (MIN), agregasi (MAX), pemilihan aksi |
| `core/safety_gate.js` | Pemeriksaan koreksi pH |
| `dosage/*` | Kalkulator air, dolomit, sulfur |
| `config/plant_moisture.js` | Trigger dan target NMI per tanaman |
| `config/treatment_constants.js` | Konstanta kalibrasi/dosis |
| `services/recommendation.service.js` | Orkestrasi + akses database |

## Input

- **pH** (`0-14`): pH media hasil kalibrasi sensor.
- **NMI** (`0-100`): *Normalized Moisture Index*, indeks operasional hasil karakterisasi wet-up sensor M01 (`NMI = V_applied / 400 mL x 100`). NMI **bukan** VWC, persen field capacity, atau tingkat kejenuhan. Nilai `moistureValue` dari sensor diperlakukan sebagai NMI.

## Parameter tanaman

| Tanaman | pH min (L) | pH max (U) | pH target | NMI trigger (T) | NMI target |
|---------|-----------:|-----------:|----------:|----------------:|-----------:|
| Selada  | 6,0 | 6,7 | 6,5 | 65 | 90 |
| Bayam (*Amaranthus*) | 6,0 | 7,0 | 6,5 | 70 | 80 |
| Pakcoy  | 6,0 | 7,5 | 6,8 | 60 | 80 |

pH disimpan di tabel `plants`; trigger/target NMI di `config/plant_moisture.js` (kunci = nama tanaman huruf kecil). Tanaman lain ditolak `422`. Angka NMI adalah setpoint rekayasa, bukan angka optimum biologis dari literatur.

## Fungsi keanggotaan

**pH** (`ASAM`, `OPTIMAL`, `BASA`; transisi 0,5 satuan di luar [L, U]):

- `ASAM`: 1 untuk p <= L-0,5, turun linear ke 0 di L.
- `OPTIMAL`: naik dari L-0,5 ke L, 1 pada [L, U], turun ke 0 di U+0,5.
- `BASA`: 0 untuk p <= U, naik linear ke 1 di U+0,5.

**NMI** (`KERING`, `OPTIMAL`, `BASAH`; n = NMI):

- `KERING`: 1 untuk n <= T-5, turun linear ke 0 di T+5.
- `OPTIMAL`: naik T-5..T+5, 1 pada T+5..90, turun 90..95.
- `BASAH`: 0 untuk n <= 90, naik linear ke 1 di 95.

Ketiga himpunan selalu berjumlah 1 pada seluruh domain (diuji di `__tests__/ai/core/engine.test.js`).

## Rule base 3x3

| pH \ NMI | KERING | OPTIMAL | BASAH |
|----------|--------|---------|-------|
| ASAM | C5 | C4 | C6 |
| OPTIMAL | C2 | C1 | C3 |
| BASA | C8 | C7 | C9 |

Setiap kategori = `WaterAction` x `pHAction`:

| Kategori | WaterAction | pHAction | Makna |
|----------|-------------|----------|-------|
| C1 | NONE | NONE | Monitoring |
| C2 | IRRIGATE | NONE | Penyiraman |
| C3 | STOP | NONE | Stop siram, cek drainase |
| C4 | NONE | LIME | Kebutuhan dolomit |
| C5 | IRRIGATE | LIME | Dolomit + air |
| C6 | STOP | LIME | Stop air, dolomit ditunda |
| C7 | NONE | SULFUR | Kebutuhan sulfur |
| C8 | IRRIGATE | SULFUR | Sulfur + air |
| C9 | STOP | SULFUR | Stop air, sulfur ditunda |

Kode 1-9 hanyalah label, bukan skala numerik.

## Inferensi (MIN-MAX, tanpa centroid)

1. Firing strength tiap rule: `alpha = min(mu_pH, mu_NMI)`.
2. Agregasi per kategori: `h(c) = max(alpha)` untuk rule yang menghasilkan `c`.
3. Aksi dipilih **per dimensi** (air dan pH) dari nilai agregasi terbesar. Seri (toleransi 1e-9) diselesaikan dengan prioritas:
   - WaterAction: `STOP > NONE > IRRIGATE`
   - pHAction: `NONE > LIME / SULFUR`
4. Kategori final = pasangan `(WaterAction, pHAction)`.
5. `fuzzyIndex` pada response = dukungan terlemah dari kedua keputusan (0-1), bukan lagi indeks centroid.

Contoh (bayam, pH 5,75, NMI 70): `C1, C2, C4, C5` masing-masing 0,5, jadi air = NONE, pH = NONE, kategori **C1**.

## Kalkulator

Semua kalkulator mengikuti rumus C501 untuk media **2 L** dan memakai preset polybag tunggal (20x20 cm, media 2 L; `src/ai/config/polybag.js`).

| Kalkulator | Rumus | Batas |
|------------|-------|-------|
| Air | `Vneed = max(0, (NMI target - NMI) x 4)` mL; `Vmax = max(0, (95 - NMI) x 4)` mL; `Vest = min(Vneed, Vmax)` | Hanya bila `WaterAction = IRRIGATE`, selain itu 0 |
| Dolomit | `1,3 x V x max(0, pH target - pH)` g | 4,7 g per 2 L |
| Sulfur | `0,6 x V x max(0, pH - pH target)` g | 1,2 g per 2 L |

Koefisien 1,3 dan 0,6 serta batas gram adalah parameter simulasi, bukan hasil kalibrasi dosis-respons pada media Subur.in.

## Safety gate koreksi pH

Koreksi (dolomit/sulfur) hanya `READY` bila semua terpenuhi; jika tidak status `DEFERRED` dengan daftar alasan. Gate tidak mengubah kategori fuzzy.

- pH melewati ambang: dolomit `pH <= L - 0,5`, sulfur `pH >= U + 0,5`.
- `WaterAction` bukan `STOP`.
- Minimal 2 pembacaan konsisten (`consistentReadings`; subscriber MQTT menghitungnya via Redis `sensor:ph_out_of_range:<deviceCode>`; default `Infinity` untuk simulasi).
- Tidak dalam periode tunggu 14 hari setelah koreksi (diambil dari koreksi terakhir di tabel `correction_logs` bila `deviceId` diberikan; dicatat lewat `POST /api/devices/:id/corrections`).
- pH di batas ukur probe (<= 3,5 atau >= 8,0): status `NEEDS_CONFIRMATION`.

Bila koreksi tidak `READY`, `limeDosageGram`/`sulfurDosageGram` bernilai 0; estimasi mentahnya tetap ada di `_debug.limeDetail` / `_debug.sulfurDetail`.

## Batasan

- NMI bukan kadar air absolut; estimasi air adalah estimasi berbasis indeks (R^2 regresi kalibrasi 0,7969, LOOCV RMSE 44,65 poin NMI).
- Model konversi sensor ke NMI belum difinalkan; backend menerima nilai moisture apa adanya sebagai NMI.
- Dosis gram belum tervalidasi secara agronomis.

## Cara mencoba

```bash
cd backend
npx jest src/__tests__/ai        # tes mesin, kalkulator, dan service
node src/ai/simulate.js          # simulator interaktif (butuh database terseed)
```
