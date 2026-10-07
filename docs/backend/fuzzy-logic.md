# Fuzzy logic

Dokumen ini menjelaskan cara kerja mesin fuzzy di `backend/src/ai`, lengkap dengan rumus dan kode yang menjalankannya. Alasan memilih metode ini ada di [ADR-004](../decisions/adr-004-fuzzy-logic-engine.md). Rumus ditulis dalam LaTeX, jadi paling nyaman dibaca di viewer Markdown yang mendukung KaTeX atau MathJax (GitHub, VS Code, dan sebagainya).

## Daftar isi

1. [Gambaran umum](#gambaran-umum)
2. [Struktur file](#struktur-file)
3. [Konsep dasar fuzzy](#konsep-dasar-fuzzy)
4. [Tahap 1: fuzzifikasi](#tahap-1-fuzzifikasi)
5. [Tahap 2: evaluasi rule](#tahap-2-evaluasi-rule)
6. [Tahap 3: agregasi](#tahap-3-agregasi)
7. [Tahap 4: defuzzifikasi](#tahap-4-defuzzifikasi)
8. [Tahap 5: menentukan kategori](#tahap-5-menentukan-kategori)
9. [Dari kategori ke tindakan dan dosis](#dari-kategori-ke-tindakan-dan-dosis)
10. [Contoh perhitungan lengkap](#contoh-perhitungan-lengkap)
11. [Catatan dan batasan](#catatan-dan-batasan)
12. [Cara mencoba](#cara-mencoba)

## Gambaran umum

Sistem menerima dua angka dari sensor tanah dan menghasilkan satu rekomendasi perawatan.

| Peran | Simbol | Satuan | Rentang |
|---|---|---|---|
| Input 1: pH tanah | $x_1$ | pH | 0 sampai 14 |
| Input 2: kelembapan tanah | $x_2$ | persen | 0 sampai 100 |
| Output: indeks fuzzy | $y^*$ | tanpa satuan | 0 sampai 8 |
| Output: kategori | $C_k$ | - | $C_1$ sampai $C_9$ |

Metode yang dipakai adalah **Mamdani**. Alurnya lima tahap:

```
(pH, kelembapan)
      |
      v
1. Fuzzifikasi      angka tegas -> derajat keanggotaan
      |
      v
2. Evaluasi rule    derajat keanggotaan -> kekuatan rule (alpha)
      |
      v
3. Agregasi         gabungkan semua rule jadi satu kurva
      |
      v
4. Defuzzifikasi    kurva -> satu angka y*
      |
      v
5. Kategori         y* -> C1..C9
```

Setelah itu kategori diterjemahkan menjadi tindakan (siram, kapur, belerang, atau kurangi penyiraman) dan dosisnya dihitung dari volume polybag. Bagian dosis bukan fuzzy, hanya rumus biasa.

## Struktur file

| File | Isi |
|---|---|
| `src/ai/core/membership.js` | Fungsi keanggotaan untuk pH, kelembapan, dan output |
| `src/ai/core/rules.js` | 20 rule (`RULE_BASE`) |
| `src/ai/core/engine.js` | Evaluasi rule, agregasi, defuzzifikasi, `runInference` |
| `src/ai/config/fuzzy_parameters.js` | `Y_MIN`, `Y_MAX`, `Y_STEP` untuk defuzzifikasi |
| `src/ai/utils/interpreter.js` | Kategori `C1` sampai `C9` menjadi teks dan flag tindakan |
| `src/ai/utils/mathematical.js` | Helper: `toVwc`, `estimateCentroidAnalytic`, alat inspeksi |
| `src/ai/dosage/*.js` | Kalkulator air, kapur, dan belerang |
| `src/ai/config/treatment_constants.js` | Konstanta dosis |
| `src/ai/services/recommendation.service.js` | Penghubung ke database dan seluruh alur di atas |
| `src/ai/simulate.js` | Skrip untuk mencoba mesin tanpa database |

## Konsep dasar fuzzy

Logika biasa hanya mengenal benar atau salah. Misalnya "tanah kering" bernilai benar kalau kelembapan di bawah 20%, dan salah kalau 20,1%. Di dunia nyata batasnya tidak setegas itu.

Pada fuzzy, sebuah nilai boleh **sebagian** masuk ke sebuah himpunan. Seberapa jauh ia masuk disebut **derajat keanggotaan**, ditulis $\mu$, bernilai 0 sampai 1.

$$\mu_A(x) \in [0, 1]$$

- $\mu = 0$: sama sekali bukan anggota himpunan $A$.
- $\mu = 1$: anggota penuh.
- Di antaranya: anggota sebagian.

Contoh: tanah dengan pH 5,2 bisa 30% "sangat asam" sekaligus 70% "asam". Dua-duanya benar pada saat yang sama, dan itulah yang membuat transisi rekomendasi terasa halus.

Dua operator yang dipakai di kode:

| Operasi | Rumus | Di kode |
|---|---|---|
| AND (irisan) | $\min(a, b)$ | `Math.min(muPh, muMoisture)` |
| OR (gabungan) | $\max(a, b)$ | `if (clipped > maxVal)` di `aggregateAt` |

## Tahap 1: fuzzifikasi

Fuzzifikasi mengubah angka sensor menjadi derajat keanggotaan. Semua fungsi ada di `buildMembershipFunctions` (`membership.js`) dan berbentuk segitiga atau trapesium.

### Himpunan pH (menyesuaikan tanaman)

Batas himpunan pH **bergantung pada tanaman**. Setiap tanaman punya `minPh` dan `maxPh` di database. Supaya mudah dibaca, tulis $a = \text{minPh}$ dan $b = \text{maxPh}$. Jika data tanaman tidak lengkap, nilai bawaannya $a = 6{,}0$ dan $b = 7{,}0$.

Ada lima himpunan: sangat asam, asam, optimal, basa, sangat basa.

**Sangat asam**

$$
\mu_{\text{sangatAsam}}(x_1) =
\begin{cases}
1 & x_1 \le a - 1{,}5 \\[4pt]
\dfrac{(a - 0{,}5) - x_1}{1{,}0} & a - 1{,}5 < x_1 \le a - 0{,}5 \\[8pt]
0 & x_1 > a - 0{,}5
\end{cases}
$$

**Asam**

$$
\mu_{\text{asam}}(x_1) =
\begin{cases}
0 & x_1 \le a - 1{,}5 \\[4pt]
\dfrac{x_1 - (a - 1{,}5)}{1{,}0} & a - 1{,}5 < x_1 \le a - 0{,}5 \\[8pt]
\dfrac{a - x_1}{0{,}5} & a - 0{,}5 < x_1 \le a \\[8pt]
0 & x_1 > a
\end{cases}
$$

**Optimal**

$$
\mu_{\text{optimal}}(x_1) =
\begin{cases}
0 & x_1 \le a - 0{,}5 \\[4pt]
\dfrac{x_1 - (a - 0{,}5)}{0{,}5} & a - 0{,}5 < x_1 \le a \\[8pt]
1 & a < x_1 \le b \\[4pt]
\dfrac{(b + 0{,}5) - x_1}{0{,}5} & b < x_1 \le b + 0{,}5 \\[8pt]
0 & x_1 > b + 0{,}5
\end{cases}
$$

**Basa**

$$
\mu_{\text{basa}}(x_1) =
\begin{cases}
0 & x_1 \le b \\[4pt]
\dfrac{x_1 - b}{0{,}5} & b < x_1 \le b + 0{,}5 \\[8pt]
\dfrac{(b + 1{,}5) - x_1}{1{,}0} & b + 0{,}5 < x_1 \le b + 1{,}5 \\[8pt]
0 & x_1 > b + 1{,}5
\end{cases}
$$

**Sangat basa**

$$
\mu_{\text{sangatBasa}}(x_1) =
\begin{cases}
0 & x_1 \le b + 0{,}5 \\[4pt]
\dfrac{x_1 - (b + 0{,}5)}{1{,}0} & b + 0{,}5 < x_1 \le b + 1{,}5 \\[8pt]
1 & x_1 > b + 1{,}5
\end{cases}
$$

Contoh bentuknya untuk $a = 6{,}0$ dan $b = 7{,}0$ (sumbu horizontal adalah pH):

```
 1 |==\    /\    /=====\    /\    /==
   |   \  /  \  /       \  /  \  /
   |    \/    \/         \/    \/
 0 +----+----+----+----+----+----+---->
     4.5  5.5  6.0       7.0  7.5  8.5
     sangat  asam  optimal   basa  sangat
     asam                          basa
```

Karena batas bergeser mengikuti $a$ dan $b$, menambah tanaman baru cukup dengan menambah data `minPh` dan `maxPh`. Tidak perlu mengubah kode atau rule.

### Himpunan kelembapan (tetap untuk semua tanaman)

Sebelum difuzzifikasi, persen kelembapan diubah menjadi **VWC** (*Volumetric Water Content*), yaitu pecahan 0 sampai 1:

$$\text{vwc} = \frac{x_2}{100}$$

Di kode: `toVwc` di `utils/mathematical.js`.

Ada empat himpunan: kering, sedang, lembap, jenuh.

$$
\mu_{\text{kering}}(v) =
\begin{cases}
1 & v \le 0{,}15 \\[4pt]
\dfrac{0{,}25 - v}{0{,}10} & 0{,}15 < v \le 0{,}25 \\[8pt]
0 & v > 0{,}25
\end{cases}
$$

$$
\mu_{\text{sedang}}(v) =
\begin{cases}
0 & v \le 0{,}15 \\[4pt]
\dfrac{v - 0{,}15}{0{,}10} & 0{,}15 < v \le 0{,}25 \\[8pt]
\dfrac{0{,}30 - v}{0{,}05} & 0{,}25 < v \le 0{,}30 \\[8pt]
0 & v > 0{,}30
\end{cases}
$$

$$
\mu_{\text{lembap}}(v) =
\begin{cases}
0 & v \le 0{,}25 \\[4pt]
\dfrac{v - 0{,}25}{0{,}05} & 0{,}25 < v \le 0{,}30 \\[8pt]
1 & 0{,}30 < v \le 0{,}35 \\[4pt]
\dfrac{0{,}40 - v}{0{,}05} & 0{,}35 < v \le 0{,}40 \\[8pt]
0 & v > 0{,}40
\end{cases}
$$

$$
\mu_{\text{jenuh}}(v) =
\begin{cases}
0 & v \le 0{,}35 \\[4pt]
\dfrac{v - 0{,}35}{0{,}05} & 0{,}35 < v \le 0{,}40 \\[8pt]
1 & v > 0{,}40
\end{cases}
$$

Ringkasan titik-titiknya dalam persen kelembapan:

| Himpunan | Penuh (=1) | Mulai naik | Mulai turun | Hilang (=0) |
|---|---|---|---|---|
| Kering | 0 sampai 15 | - | 15 | 25 |
| Sedang | - | 15 | 25 | 30 |
| Lembap | 30 sampai 35 | 25 | 35 | 40 |
| Jenuh | di atas 40 | 35 | - | - |

### Himpunan output

Output punya sembilan himpunan, satu untuk setiap kategori $C_k$. Masing-masing berupa segitiga dengan puncak di $y = k - 1$ dan lebar kaki 1 ke kiri dan kanan:

$$\mu_{C_k}(y) = \max\bigl(0,\; 1 - |y - (k - 1)|\bigr)$$

Jadi $C_1$ berpuncak di $y=0$, $C_2$ di $y=1$, dan seterusnya sampai $C_9$ di $y=8$. Di kode: `muOutput`.

### Kode fuzzifikasi

```js
const fuzzify = (ph, moisturePercent) => {
  const vwc = toVwc(moisturePercent);
  return {
    ph: {
      sangatAsam: muSangatAsam(ph),
      asam: muAsam(ph),
      optimal: muOptimal(ph),
      basa: muBasa(ph),
      sangatBasa: muSangatBasa(ph),
    },
    moisture: {
      kering: muKering(vwc),
      sedang: muSedang(vwc),
      lembap: muLembap(vwc),
      jenuh: muJenuh(vwc),
    },
  };
};
```

Hasilnya satu objek berisi lima derajat untuk pH dan empat untuk kelembapan.

## Tahap 2: evaluasi rule

### Rule base

Ada $5 \times 4 = 20$ rule, satu untuk setiap kombinasi himpunan pH dan himpunan kelembapan. Bentuknya:

> JIKA pH adalah *P* DAN kelembapan adalah *M* MAKA kategori adalah $C_k$.

Isi lengkap `RULE_BASE` di `rules.js`:

| pH \ Kelembapan | Kering | Sedang | Lembap | Jenuh |
|---|---|---|---|---|
| **Sangat asam** | R1 → C5 | R2 → C4 | R3 → C4 | R4 → C6 |
| **Asam** | R5 → C5 | R6 → C4 | R7 → C4 | R8 → C6 |
| **Optimal** | R9 → C2 | R10 → C1 | R11 → C1 | R12 → C3 |
| **Basa** | R13 → C8 | R14 → C7 | R15 → C7 | R16 → C9 |
| **Sangat basa** | R17 → C8 | R18 → C7 | R19 → C7 | R20 → C9 |

Contoh membacanya: R5 berbunyi "jika pH asam dan tanah kering, maka kategori C5".

Arti kategorinya (dari `interpreter.js`):

| Kategori | Kondisi | Tindakan |
|---|---|---|
| C1 | pH optimal, kelembapan cukup | Tidak ada |
| C2 | pH optimal, tanah kering | Siram |
| C3 | pH optimal, tanah jenuh | Kurangi penyiraman |
| C4 | Asam | Beri kapur |
| C5 | Asam dan kering | Beri kapur, lalu siram |
| C6 | Asam dan jenuh | Beri kapur, hentikan penyiraman |
| C7 | Basa | Beri belerang |
| C8 | Basa dan kering | Beri belerang, lalu siram |
| C9 | Basa dan jenuh | Beri belerang, hentikan penyiraman |

### Kekuatan rule

Setiap rule punya **kekuatan penyulutan** $\alpha$. Karena kedua syarat dihubungkan dengan DAN, dipakai nilai terkecil:

$$\alpha_i = \min\bigl(\mu_{P_i}(x_1),\; \mu_{M_i}(x_2)\bigr)$$

Rule dengan $\alpha = 0$ dibuang. Sisanya disebut rule aktif.

```js
function evaluateRules(membership) {
  const activeRules = [];

  for (const rule of RULE_BASE) {
    const muPh = membership.ph[rule.phSet];
    const muMoisture = membership.moisture[rule.moistureSet];
    const alpha = Math.min(muPh, muMoisture);

    if (alpha > 0) {
      activeRules.push({
        ruleId: rule.id,
        phSet: rule.phSet,
        moistureSet: rule.moistureSet,
        outputCategory: rule.outputCategory,
        alpha,
      });
    }
  }

  return activeRules;
}
```

Karena setiap input paling banyak menyentuh dua himpunan yang bertetangga, paling banyak ada 4 rule aktif sekaligus.

## Tahap 3: agregasi

Tiap rule aktif menghasilkan satu segitiga output $C_k$ yang **dipotong** pada ketinggian $\alpha_i$ (metode *clipping*):

$$\mu'_i(y) = \min\bigl(\alpha_i,\; \mu_{C_{k_i}}(y)\bigr)$$

Semua potongan lalu digabung dengan operator maksimum (OR) menjadi satu kurva:

$$\mu_{\text{agg}}(y) = \max_{i}\; \mu'_i(y)$$

```js
function aggregateAt(activeRules, y, muOutputFn) {
  let maxVal = 0;

  for (const rule of activeRules) {
    const outputVal = muOutputFn
      ? muOutputFn(rule.outputCategory, y)
      : Math.max(0, 1 - Math.abs(y - (rule.outputCategory - 1)));
    const clipped = Math.min(rule.alpha, outputVal);
    if (clipped > maxVal) maxVal = clipped;
  }

  return maxVal;
}
```

Fungsi ini menjawab satu pertanyaan: berapa tinggi kurva gabungan di titik $y$ tertentu? Defuzzifikasi memanggilnya berulang kali.

Jika dua rule menunjuk kategori yang sama (misalnya R1 dan R5 sama-sama ke C5), keduanya dipotong pada $\alpha$ masing-masing, dan yang tertinggi menang karena operatornya maksimum.

## Tahap 4: defuzzifikasi

Kurva gabungan harus diringkas menjadi satu angka. Metodenya **centroid** (titik berat). Rumus bakunya integral:

$$y^* = \frac{\displaystyle\int y \,\mu_{\text{agg}}(y)\,dy}{\displaystyle\int \mu_{\text{agg}}(y)\,dy}$$

Kode tidak menghitung integral secara analitik, tetapi menjumlahkan titik-titik sampel dengan jarak $\Delta y$ yang kecil:

$$y^* \approx \frac{\sum_{j} y_j \,\mu_{\text{agg}}(y_j)}{\sum_{j} \mu_{\text{agg}}(y_j)}, \qquad y_j = Y_{\min} + j\,\Delta y$$

Parameter di `config/fuzzy_parameters.js`:

| Parameter | Nilai | Arti |
|---|---|---|
| `Y_MIN` | 0 | Awal sumbu $y$ |
| `Y_MAX` | 8 | Akhir sumbu $y$ |
| `Y_STEP` | 0,01 | Jarak antar sampel ($\Delta y$), sekitar 801 titik |

```js
function defuzzify(activeRules, muOutputFn) {
  const { Y_MIN, Y_MAX, Y_STEP } = FUZZY_PARAMETERS;

  let numerator = 0;
  let denominator = 0;

  for (let y = Y_MIN; y <= Y_MAX + 1e-9; y += Y_STEP) {
    const mu = aggregateAt(activeRules, y, muOutputFn);
    numerator += y * mu;
    denominator += mu;
  }

  if (denominator === 0) {
    return 4;
  }

  return numerator / denominator;
}
```

Dua hal kecil di kode ini:

- `+ 1e-9` pada batas atas menjaga agar titik $y = 8$ tidak terlewat karena galat pembulatan bilangan desimal.
- Jika `denominator === 0` (tidak ada rule aktif), fungsi mengembalikan 4 sebagai nilai tengah. Dengan rule base yang menutup seluruh kombinasi, kondisi ini praktis tidak terjadi.

## Tahap 5: menentukan kategori

Angka $y^*$ bersifat kontinu, padahal tindakan yang dibutuhkan berupa kategori diskret. Dipilih kategori yang puncaknya paling dekat:

$$k^* = \arg\min_{k \in \{1,\dots,9\}} \; \bigl|\,y^* - (k - 1)\,\bigr|$$

```js
function lookupCategory(yStar) {
  let bestK = 1;
  let minDist = Infinity;

  for (let k = 1; k <= 9; k++) {
    const dist = Math.abs(yStar - (k - 1));
    if (dist < minDist) {
      minDist = dist;
      bestK = k;
    }
  }

  return bestK;
}
```

Karena memakai `<` (bukan `<=`), jika $y^*$ tepat di tengah dua kategori, kategori dengan nomor lebih kecil yang dipilih.

### Fungsi pembungkus

`runInference(x1, x2, plantParams)` menyatukan semuanya:

```js
function runInference(x1, x2, plantParams) {
  // validasi tipe, lalu batasi (clamp) pH ke 0..14 dan kelembapan ke 0..100
  const phClamped = Math.max(0, Math.min(14, x1));
  const moistureClamped = Math.max(0, Math.min(100, x2));

  const { fuzzify, muOutput } = buildMembershipFunctions(plantParams);

  const membership = fuzzify(phClamped, moistureClamped);   // tahap 1
  const activeRules = evaluateRules(membership);            // tahap 2
  const yStar = defuzzify(activeRules, muOutput);           // tahap 3 dan 4
  const categoryStar = lookupCategory(yStar);               // tahap 5
  // ...
}
```

Hasil yang dikembalikan:

| Field | Isi |
|---|---|
| `input` | Nilai asli dari pemanggil |
| `inputClamped` | Nilai setelah dibatasi ke rentang valid |
| `membership` | Derajat keanggotaan pH dan kelembapan |
| `activeRules` | Rule aktif beserta $\alpha$ |
| `yStar` | $y^*$, dibulatkan 4 desimal |
| `categoryStar` | Angka $k^*$ |
| `categoryCode` | String seperti `"C5"` |

Jika `x1` atau `x2` bukan angka, fungsi melempar `TypeError`.

## Dari kategori ke tindakan dan dosis

`interpretCategory(categoryCode)` memetakan kategori ke empat flag: `needsWater`, `needsLime`, `needsSulfur`, `reduceWatering`. Flag inilah yang menentukan kalkulator mana yang dijalankan di `recommendation.service.js`.

Bagian ini deterministik dan tidak memakai fuzzy. Konstanta ada di `config/treatment_constants.js`:

| Konstanta | Nilai | Dipakai untuk |
|---|---|---|
| `PH_TOLERANCE` | 0,2 | Toleransi pH sebelum kapur atau belerang diberikan |
| `K_L_LIME` | 1,3 | Gram kapur per liter tanah per satuan pH |
| `K_S_SULFUR` | 0,6 | Gram belerang per liter tanah per satuan pH |
| `M_S_MAX_PER_LITER` | 3,0 | Batas atas belerang (gram per liter tanah) |
| `VWC_TARGET` | 0,30 | Target kelembapan setelah disiram |
| `V_MAX_FRACTION` | 0,08 | Batas air sekali siram, sebagai pecahan volume tanah |

`MAD_FRACTION` juga ada di berkas konstanta, tetapi belum dipakai oleh kode di `src/ai`.

### Volume tanah

Volume tanah dihitung dari ukuran polybag di `physical_presets.js`. Tinggi isi tanah adalah tinggi polybag dikurangi 2,5 cm:

$$h_{\text{isi}} = h - 2{,}5 \text{ cm}, \qquad A = \pi \left(\frac{d}{2 \cdot 100}\right)^2 \text{ m}^2$$

$$V = A \cdot \frac{h_{\text{isi}}}{100} \cdot 1000 \;\text{ liter}$$

dengan $d$ diameter dan $h$ tinggi polybag, keduanya dalam cm.

### Dosis kapur (`lime_calculator.js`)

Dipakai saat tanah terlalu asam (C4, C5, C6). Misalkan $p$ adalah pH terukur, $p_t$ pH target tanaman, dan $a$ adalah `minPh`:

$$
\text{kapur (gram)} =
\begin{cases}
0 & p \ge a - 0{,}2 \\[4pt]
K_L \cdot V \cdot (p_t - p) & p < a - 0{,}2
\end{cases}
$$

dengan $K_L = 1{,}3$.

### Dosis belerang (`sulfur_calculator.js`)

Dipakai saat tanah terlalu basa (C7, C8, C9). Misalkan $b$ adalah `maxPh`:

$$
\text{belerang (gram)} =
\begin{cases}
0 & p \le b + 0{,}2 \\[4pt]
\min\bigl(K_S \cdot V \cdot (p - p_t),\; M_S \cdot V\bigr) & p > b + 0{,}2
\end{cases}
$$

dengan $K_S = 0{,}6$ dan $M_S = 3{,}0$. Jika hasil mentah melebihi batas, dosis dipotong dan hasilnya menandai `requiresStagedApplication: true`, artinya pemberian sebaiknya dibagi bertahap.

### Volume air (`water_calculator.js`)

Dipakai saat tanah kering (C2, C5, C8). Misalkan $v = x_2/100$:

$$
\text{air (liter)} = \min\Bigl(\max\bigl(0,\; (0{,}30 - v)\cdot V\bigr),\; 0{,}08 \cdot V\Bigr)
$$

Artinya air yang dibutuhkan untuk mencapai VWC target, tetapi tidak lebih dari 8% volume tanah sekali siram. Jika terpotong batas ini, `cappedByVmax` bernilai `true`.

## Contoh perhitungan lengkap

**Skenario:** tanaman dengan $a = 6{,}0$, $b = 7{,}0$, $p_t = 6{,}5$ (nilai bawaan). Sensor membaca pH $5{,}2$ dan kelembapan $18\%$. Volume polybag $V = 5$ liter.

**Langkah 1, fuzzifikasi.**

- pH 5,2 berada di rentang $a - 1{,}5 = 4{,}5$ sampai $a - 0{,}5 = 5{,}5$:
  - $\mu_{\text{sangatAsam}} = \dfrac{5{,}5 - 5{,}2}{1{,}0} = 0{,}3$
  - $\mu_{\text{asam}} = \dfrac{5{,}2 - 4{,}5}{1{,}0} = 0{,}7$
  - himpunan pH lain bernilai 0.
- Kelembapan 18% berarti $v = 0{,}18$, di rentang 0,15 sampai 0,25:
  - $\mu_{\text{kering}} = \dfrac{0{,}25 - 0{,}18}{0{,}10} = 0{,}7$
  - $\mu_{\text{sedang}} = \dfrac{0{,}18 - 0{,}15}{0{,}10} = 0{,}3$
  - himpunan lain bernilai 0.

**Langkah 2, evaluasi rule.** Hanya rule yang kedua syaratnya lebih dari 0 yang aktif:

| Rule | pH | Kelembapan | $\alpha = \min(\cdot)$ | Output |
|---|---|---|---|---|
| R1 | sangatAsam (0,3) | kering (0,7) | 0,3 | C5 |
| R2 | sangatAsam (0,3) | sedang (0,3) | 0,3 | C4 |
| R5 | asam (0,7) | kering (0,7) | 0,7 | C5 |
| R6 | asam (0,7) | sedang (0,3) | 0,3 | C4 |

**Langkah 3, agregasi.** Untuk tiap kategori diambil $\alpha$ terbesar:

- C5 (puncak di $y=4$): $\max(0{,}3;\ 0{,}7) = 0{,}7$
- C4 (puncak di $y=3$): $\max(0{,}3;\ 0{,}3) = 0{,}3$

Kurva gabungan adalah segitiga C5 yang dipotong di 0,7 digabung segitiga C4 yang dipotong di 0,3.

**Langkah 4, defuzzifikasi.** Penjumlahan titik-titik dengan $\Delta y = 0{,}01$ memberi:

$$y^* \approx 3{,}6653$$

Nilainya condong ke 4 (C5) karena C5 lebih kuat daripada C4.

**Langkah 5, kategori.** Titik puncak terdekat dari 3,6653 adalah $y = 4$, jadi $k^* = 5$ dan kategorinya **C5**: pH terlalu asam dan tanah kering.

**Dosis.** C5 memicu `needsLime` dan `needsWater`:

- Kapur: $p = 5{,}2 < a - 0{,}2 = 5{,}8$, maka dosis diberikan: $1{,}3 \times 5 \times (6{,}5 - 5{,}2) = 8{,}45$ gram.
- Air: mentah $(0{,}30 - 0{,}18) \times 5 = 0{,}6$ liter, tetapi batasnya $0{,}08 \times 5 = 0{,}4$ liter. Hasil akhir **0,4 liter** dan `cappedByVmax = true`.

Angka-angka di atas dicocokkan dengan hasil menjalankan `runInference(5.2, 18, {minPh: 6, maxPh: 7, phTarget: 6.5})` dan kedua kalkulator.

## Catatan dan batasan

1. **Centroid terpotong di ujung sumbu.** Segitiga $C_9$ berpuncak di $y = 8$ dan separuh kanannya berada di luar `Y_MAX = 8`, sehingga tidak ikut dihitung. Akibatnya $y^*$ untuk kategori ujung tidak pernah tepat 8. Misalnya pH 7,9 dan kelembapan 50% menghasilkan $y^* \approx 7{,}63$. Kategori akhir tetap benar (C9) karena masih paling dekat ke 8. Hal yang sama berlaku untuk $C_1$ di $y=0$. Jika suatu hari nilai $y^*$ mentah dipakai langsung, misalnya untuk visualisasi, ingat bias ini.
2. **Aproksimasi numerik.** Memperkecil `Y_STEP` menambah ketelitian tetapi memperlambat perhitungan. Dengan 0,01 (sekitar 801 titik dan paling banyak 4 rule), waktunya masih jauh dari masalah.
3. **Ada fungsi analitik pembanding.** `estimateCentroidAnalytic` di `utils/mathematical.js` menghitung rata-rata berbobot $\sum \alpha_i (k_i - 1) / \sum \alpha_i$ tanpa agregasi. Ini hanya perkiraan kasar untuk pengecekan, bukan hasil resmi. Pada contoh di atas nilainya $(0{,}3\cdot4 + 0{,}3\cdot3 + 0{,}7\cdot4 + 0{,}3\cdot3)/1{,}6 = 3{,}625$, dekat dengan 3,6653 tetapi tidak sama.
4. **Hanya pH yang menyesuaikan tanaman.** Himpunan kelembapan sama untuk semua tanaman.
5. **Tanaman dengan $a \ge b$** akan menghasilkan himpunan "optimal" yang tidak masuk akal. Data seed harus menjaga `minPh < maxPh`.
6. **Input di luar rentang** dibatasi (clamp) di `runInference`, tetapi `recommendation.service.js` sudah menolaknya lebih dulu dengan error 400.

## Cara mencoba

Endpoint simulasi tersedia tanpa perlu perangkat atau riwayat sensor, lihat [rekomendasi](../api/recommendations.md). Untuk mencoba mesin langsung dari terminal:

```bash
cd backend
node -e 'console.log(require("./src/ai/core/engine").runInference(5.2, 18, {minPh: 6, maxPh: 7, phTarget: 6.5}))'
```

Skrip `src/ai/simulate.js` juga bisa dipakai untuk memeriksa perilaku mesin. Unit test di `src/__tests__/ai/` baru mencakup kalkulator dosis dan service, belum mesin inferensi di `core/`.
