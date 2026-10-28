# Fuzzy logic

Dokumen ini menjelaskan mesin fuzzy di `backend/src/ai` setelah disesuaikan dengan dokumen perancangan **C501** ("Rancangan Fuzzy Mamdani dan Kalkulator Dosis Air Subur.in", Draf Final13). Alasan memilih metode ini ada di [ADR-004](../decisions/adr-004-fuzzy-logic-engine.md).

## Alur

```text
Sensor (VWC) -> fuzzifikasi (pH, theta) -> rule base 3x3 -> Mamdani MIN-MAX
             -> centroid per sumbu (air, pH) -> kategori C1-C9 -> safety gate -> kalkulator dosis
```

Fuzzy hanya menentukan **jenis** tindakan. Besaran air/dolomit/sulfur dihitung kalkulator deterministik, dan safety gate menentukan apakah koreksi pH boleh ditampilkan sebagai instruksi.

| File                                 | Peran                                                   |
| ------------------------------------ | ------------------------------------------------------- |
| `core/membership.js`                 | Fungsi keanggotaan pH dan kelembapan (VWC)              |
| `core/rules.js`                      | Rule base 3x3, kategori C1-C9, pusat himpunan konsekuen |
| `core/engine.js`                     | MIN-MAX, centroid dua sumbu, ambang aksi, override      |
| `core/safety_gate.js`                | Pemeriksaan koreksi pH                                  |
| `dosage/*`                           | Kalkulator air, dolomit, sulfur                         |
| `config/plant_moisture.js`           | Parameter kelembapan per tanaman (trigger, target, a, b) |
| `config/treatment_constants.js`      | Semua konstanta desain                                  |
| `services/recommendation.service.js` | Orkestrasi + akses database                             |

## Input

- **pH** (`0-14`).
- **VWC** (`moistureValue`, persen `0-100`, sama dengan `soil_vwc_pct`): kadar air volumetrik. Service membaginya 100 menjadi theta (m3/m3). Pembacaan indeks lama (`legacy_index`) tidak dipetakan ke VWC dan tidak menghasilkan rekomendasi.
- `safetyOverride` (opsional, string alasan, mis. `sensor_out_of_range`): memaksa air STOP tanpa mengubah nilai VWC (lihat Override pengaman).

## Parameter

Acuan kelembapan adalah container capacity polybag 2 L: `theta_CC = 0,3298` m3/m3 (659,6 mL / 2.000 mL). Rentang pH tiap tanaman ada di tabel `plants`, sedangkan parameter kelembapan ada di `config/plant_moisture.js` sebagai fraksi `theta_CC`.

| Tanaman              | pH min | pH max | pH target |
| -------------------- | -----: | -----: | --------: |
| Selada               |    6,0 |    6,7 |       6,5 |
| Bayam (_Amaranthus_) |    6,0 |    7,0 |       6,5 |
| Pakcoy               |    6,0 |    7,5 |       6,8 |

| Tanaman | trigger | target | a      | b      | theta trigger | theta target | theta a | theta b |
| ------- | ------: | -----: | -----: | -----: | ------------: | -----------: | ------: | ------: |
| Bayam   |    0,70 |   0,85 |  0,531 |  0,864 |        0,2309 |       0,2803 |  0,1751 |  0,2849 |
| Selada  |    0,65 |   0,80 |  0,481 |  0,814 |        0,2144 |       0,2638 |  0,1586 |  0,2685 |
| Pakcoy  |    0,60 |   0,80 |  0,431 |  0,764 |        0,1979 |       0,2638 |  0,1421 |  0,2520 |

Kolom pertama sampai keempat adalah fraksi `theta_CC`; kolom `theta` adalah hasil perkaliannya (m3/m3). `trigger` dan `target` juga dikirim sebagai persen VWC lewat `GET /api/plants` (`nmiTrigger`/`nmiTarget`); `target` dipakai sebagai batas isi kalkulator air.

Tanaman lain ditolak `422`. Angka kelembapan adalah parameter desain, bukan optimum agronomi teruji.

## Fungsi keanggotaan

![Diagram fungsi keanggotaan pH dan kelembapan](membership-functions.svg)

**pH** (`ASAM`, `OPTIMAL`, `BASA`; transisi 0,5 satuan di luar [min, max]) tidak berubah.

**Kelembapan** (`KERING`, `LEMBAP`, `JENUH`) dengan titik `a` dan `b` per tanaman (tabel di atas) serta `d = 7/6` dan `e = 4/3` kali `theta_CC` (0,3848; 0,4397) yang sama untuk semua tanaman. Tanpa parameter tanaman, `a` dan `b` kembali ke nilai bawaan `1/2` dan `5/6` kali `theta_CC` (0,1649; 0,2748):

- `KERING`: 1 untuk theta <= a, turun linear ke 0 di b.
- `LEMBAP`: naik a..b, 1 pada b..d, turun d..e.
- `JENUH`: 0 untuk theta <= d, naik linear ke 1 di e.

Ketiganya selalu berjumlah 1. JENUH baru aktif di atas 0,3848, di luar daerah kalibrasi sensor, sehingga pada data normal ia tidak tercapai; kondisi basah ditangani override.

## Rule base 3x3

| pH \ Kelembapan | KERING | LEMBAP | JENUH |
| --------------- | ------ | ------ | ----- |
| ASAM            | C5     | C4     | C6    |
| OPTIMAL         | C2     | C1     | C3    |
| BASA            | C8     | C7     | C9    |

Setiap kategori = `WaterAction` x `pHAction`:

| Kategori | WaterAction | pHAction |
| -------- | ----------- | -------- |
| C1       | NONE        | NONE     |
| C2       | IRRIGATE    | NONE     |
| C3       | STOP        | NONE     |
| C4       | NONE        | LIME     |
| C5       | IRRIGATE    | LIME     |
| C6       | STOP        | LIME     |
| C7       | NONE        | SULFUR   |
| C8       | IRRIGATE    | SULFUR   |
| C9       | STOP        | SULFUR   |

## Inferensi (Mamdani, centroid per sumbu)

1. `alpha = min(mu_pH, mu_kelembapan)` per aturan.
2. Dua sumbu terpisah agar kode C1-C9 tidak diperlakukan sebagai jarak: air (`STOP -1`, `NONE 0`, `IRRIGATE +1`) dan pH (`SULFUR -1`, `NONE 0`, `LIME +1`).
3. Konsekuen berupa segitiga `max(0, 1 - |y - c|)` pada domain [-1, 1], dipotong `alpha` (MIN), diagregasi dengan MAX.
4. Centroid pada grid `dy = 0,02`: `y* = sum(y mu) / sum(mu)`.
5. `y* >= 0,12` menjadi aksi positif, `y* <= -0,12` aksi negatif, selain itu `NONE` (ambang desain; pembandingan memakai toleransi 1e-9).
6. `fuzzyIndex` pada response = kekuatan aturan tertinggi yang mendukung aksi terpilih, diambil yang terlemah dari kedua sumbu (0-1).

Akibatnya pemicu siram jatuh di theta ~0,2309 untuk bayam (70% `theta_CC`), ~0,2144 untuk selada (65%), dan ~0,1979 untuk pakcoy (60%), dan sumbu pH menyala LIME pada pH <= 5,75 dan SULFUR pada pH >= 7,25 (bayam).

## Override pengaman

Dengan `safetyOverride`, kelembapan diperlakukan JENUH penuh: air STOP, volume 0 mL, pH tetap dihitung sebagai indikasi dan ditunda oleh safety gate. Response memuat `decisionSource: "safety_override"` dan `overrideReason`; tanpa override `decisionSource` bernilai `fuzzy`. Status ini bukan bukti kejenuhan fisik. Pemicunya (ADC di luar rentang kalibrasi, theta < 0, sensor tidak sehat) belum ada di backend; pemanggil yang menentukan.

## Kalkulator

Rumus mengikuti Bagian 4.8-4.9 dokumen C501 untuk media **2 L** (preset polybag 25x25 cm, `src/ai/config/polybag.js`).

| Kalkulator | Rumus                                         | Batas                                                                                                  |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Air        | `Vneed = max(0, (theta target tanaman - theta) x 2.000)` mL | `min(Vneed, 0,10 x 2.000)` = maks. 200 mL per siram; hanya bila `WaterAction = IRRIGATE`, selain itu 0 |
| Dolomit    | `1,3 x V x max(0, pH target - pH)` g          | 1,4 g/L = 2,8 g per 2 L                                                                                |
| Sulfur     | `0,6 x V x max(0, pH - pH target)` g          | 1,2 g/L = 2,4 g per 2 L                                                                                |

Koefisien dan batas adalah estimasi berbasis literatur, belum diuji pada media Subur.in.

## Safety gate koreksi pH

Koreksi hanya `READY` bila semua terpenuhi; jika tidak `DEFERRED` dengan daftar alasan. Gate tidak mengubah kategori fuzzy. Ambang pH mengikuti sumbu fuzzy (tidak ada ambang tambahan).

- `WaterAction` bukan `STOP`.
- Minimal 2 pembacaan konsisten (`consistentReadings`; subscriber MQTT menghitungnya via Redis `sensor:ph_out_of_range:<deviceCode>` untuk pH di luar batas +/- 0,25; default `Infinity` untuk simulasi).
- pH di batas ukur probe (<= 3,5 atau >= 8,0): `NEEDS_CONFIRMATION`.

Bila koreksi tidak `READY`, `limeDosageGram`/`sulfurDosageGram` bernilai 0; estimasi mentahnya tetap ada di `_debug.limeDetail` / `_debug.sulfurDetail`.

## Batasan

- Kalibrasi ADC -> VWC (kubik) belum tervalidasi pada polybag (ADC saat CC = 950 belum konsisten dengan theta_CC = 0,3298). Rekomendasi air dari VWC sensor belum boleh dianggap operasional sebelum ADC saat CC diukur ulang.
- Dosis gram belum tervalidasi secara agronomis.

## Cara mencoba

```bash
cd backend
npx jest src/__tests__/ai        # oracle Bagian 4.11, safety gate, dan service
node src/ai/simulate.js          # simulator interaktif (butuh database terseed)
```
