# Pengujian response time

Panduan pengujian response time Subur.in: cara dirancang, dijalankan, diukur, dan ditafsirkan, agar bisa diulang dan batas validitasnya jelas. Untuk test Jest, lihat [testing.md](testing.md). Script ini tidak termasuk `npm test`: ia memakai database, Redis, broker, dan backend sungguhan.

- Script: [`backend/scripts/response_time.js`](../../backend/scripts/response_time.js), dijalankan manual dari `backend/` (tanpa entri di `package.json`)
- Kategori ISO/IEC 25010: Performance Efficiency, sub-karakteristik _time behaviour_
- Metrik utama: latensi per segmen (T0→T1, T1→T2, T2→T3) dan latensi end-to-end (T0→T4)

---

## 1. Apa yang diuji dan apa yang tidak

### 1.1 Yang diuji

Waktu yang dibutuhkan sistem sejak satu paket data sensor dikirim ke broker MQTT sampai rekomendasi hasil fuzzy tersimpan, bisa diambil lewat API, dan tampil di dashboard.

### 1.2 Yang sengaja dikeluarkan

Dua jeda berikut adalah **keputusan desain**, bukan kelambatan sistem, sehingga tidak boleh masuk ke response time:

| Jeda terjadwal                                             | Lokasi di kode                                      | Perlakuan di pengujian                                   |
| ---------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Interval sensor (15 menit, atau 1 jam)                     | `sensorInterval` pada device                        | Tidak ditunggu. Script mengirim data sendiri.            |
| Gate rekomendasi air tiap 4 jam (`WATER_DECISION_SECONDS`) | `claimWaterDecision` di `water_schedule.service.js` | Kunci gate Redis dihapus sebelum tiap sampel (bagian 5). |
| Gate dosis pH 7 hari (`PH_DECISION_SECONDS`)               | `claimPhDecision`                                   | Dihapus dengan cara yang sama.                           |

Jika T0 diambil dari saat sensor membaca lalu pengujian menunggu gate 4 jam, hasilnya ribuan detik dan tidak bermakna. Karena itu T0 didefinisikan sebagai saat paket **dipublish ke broker**.

### 1.3 Batas awal pengujian

Pengujian dimulai saat data dipublish ke broker MQTT (T0). Segmen sebelum titik itu tidak dicakup.

---

## 2. Pipeline yang diukur

```text
[Pengirim data uji]                   T0  mqtt.publish
      │  (MQTT QoS 1, topic suburin/devices/<deviceCode>/telemetry)
      ▼
[Broker EMQX Cloud]
      │
      ▼
[Backend di VPS]  sensor_subscriber.js → handleSensorMessage
      │  1. parse payload, validasi pH 0–14 dan kelembapan 0–100
      │  2. setSeenSensorNode (Redis)
      │  3. prisma.device.findUnique (Postgres/Supabase)
      │  4. setLatestSensorData (Redis)
      │  5. broadcastToDevice  ───────────────►  event SSE ke dashboard   T1
      │  6. recordMoisture, claimEmergency, claimWaterDecision (Redis)
      │  7. generateRecommendation (fuzzy + dosis)
      │  8. prisma.recommendationLog.create    ──►  rekomendasi tersimpan  T2
      │  9. broadcastToDevice {type:"recommendation"} ──► dashboard fetch ulang
      │ 10. notifikasi, penghitung Redis
      ▼
[API]  GET /api/devices/:id/recommendation                                T3
      │  (membaca log terbaru, bukan data live)
      ▼
[Dashboard Next.js]  fetch → setState → render                            T4
```

Urutan di langkah 5, 8, dan 9 penting: event SSE sensor (langkah 5) dikirim **sebelum** rekomendasi dihitung dan disimpan, sehingga T1 selalu lebih awal dari T2. Event `recommendation` (langkah 9) dikirim **setelah** log tersimpan, dan baru event itulah yang menyuruh dashboard mengambil rekomendasi baru (bagian 9).

---

## 3. Definisi titik ukur

Semua titik diukur dengan **satu jam yang sama (laptop penguji)**. Dengan begitu tidak ada galat akibat selisih jam antara VPS dan klien, dan tidak perlu NTP. Konsekuensinya, beberapa titik adalah _proksi_ yang diamati dari luar sistem, bukan stempel waktu internal backend.

| Titik | Definisi di pengujian ini                                        | Cara diamati                                                                                   | Catatan akurasi                                                                                                        |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| T0    | `client.publish(...)` dipanggil di script                        | `performance.now()` sesaat sebelum publish; `Date.now()` untuk dibandingkan dengan jam halaman | Tepat, tetapi belum termasuk PUBACK broker                                                                             |
| T1    | Event SSE sensor untuk sampel ini tiba di laptop                 | Koneksi SSE tersendiri ke `/api/sensors/:id/stream`; event dicocokkan lewat nilai `ph`         | Proksi untuk "backend menerima". Mencakup perjalanan SSE kembali ke laptop, dan terjadi setelah langkah 1–5 di backend |
| T2    | Baris `recommendation_logs` dengan `phValue` sampel ini terlihat | Polling Prisma tiap 50 ms ke Supabase dari laptop                                              | Resolusi ±50 ms dan mencakup latensi query laptop→Supabase, jadi sedikit melebihi waktu T2 yang sebenarnya di backend  |
| T3    | `GET /api/devices/:id/recommendation` selesai                    | Request dari script **setelah** T2 terdeteksi; waktu sampai body habis dibaca                  | Mencakup handshake TLS baru dan jaringan laptop→VPS                                                                    |
| T4    | Rekomendasi tampil di dashboard                                  | Playwright (bagian 7)                                                                          | Perkiraan: respons fetch aplikasi + dua `requestAnimationFrame`                                                        |

Segmen yang dilaporkan:

| Segmen | Rumus         | Arti                                                               |
| ------ | ------------- | ------------------------------------------------------------------ |
| T0→T1  | `t1 - t0`     | Laptop → EMQX → backend → (lookup device) → SSE → laptop           |
| T1→T2  | `t2 - t1`     | Fuzzy, pemrosesan jendela kelembapan di Redis, dan penyimpanan log |
| T2→T3  | `t3 - t2`     | Satu request API rekomendasi setelah log ada                       |
| T0→T4  | `t4 - t0wall` | End-to-end sampai dashboard, hanya untuk sampel yang tampil        |

T3 dan T4 **tidak dijumlahkan**. T3 adalah request terpisah dari script. T4 berasal dari fetch milik dashboard sendiri yang dipicu SSE. Keduanya berjalan paralel dari titik waktu yang berbeda.

---

## 4. Korelasi sampel: pH unik

Banyak pembacaan dikirim dalam satu uji, jadi tiap sampel harus bisa dikenali di SSE, di database, dan di respons API. Script memberi tiap sampel nilai pH unik:

```text
runTag = detik_epoch mod 10000          (berbeda tiap eksekusi script)
ph     = basePh + (runTag × 100 + nomorSampel) × 1e-8     dibulatkan 8 desimal
```

Contoh: pada titik `[6.2, 26]`, sampel 1 dari eksekusi dengan `runTag = 3333` mengirim `ph = 6.20333301`. Pergeseran maksimum 0,01 dari nilai dasar, jauh di bawah ketelitian sensor pH, jadi tidak mengubah kategori fuzzy.

Nilai harus unik **antar eksekusi dan antar skenario**, bukan hanya dalam satu eksekusi. Pada pengujian pertama, ketiga skenario memakai basis 6.2 dengan selisih tetap 0,0001, sehingga ada 30 nilai pH kembar. Akibatnya, T2 cocok dengan baris log milik uji sebelumnya dan terbaca terlalu cepat, dan entri halaman dari uji sebelumnya menghasilkan T4 negatif (−19225 ms). Seluruh hasil itu dibuang dan pengujian diulang dengan rumus di atas. Hasil ulang diperiksa: tidak ada pH kembar dan tidak ada T4 negatif.

Nilai ini dipakai sebagai kunci di tiga tempat:

1. SSE: `waiters.get(event.ph)` membangunkan sampel yang tepat.
2. Database: `recommendationLog.findFirst({ where: { deviceId, phValue: ph } })`.
3. Browser: `window.__t[ph]` untuk T4. Respons `/recommendation` memuat `phValue` dari log terbaru, sehingga cocok hanya jika dashboard menerima log milik sampel ini.

Perbandingan float aman karena angka yang sama melewati JSON di semua jalur (publish → Postgres `double` → respons JSON).

---

## 5. Reset gate agar tiap sampel menghasilkan rekomendasi

Backend hanya membuat rekomendasi bila `decisionMoisture !== null`, yaitu bila gate lolos. Tanpa tindakan khusus, hanya sampel pertama yang menghasilkan rekomendasi dan sisanya terblokir 4 jam. Sebelum setiap sampel, script:

1. Mencari kunci Redis `sensor:*<deviceCode>*` lalu menghapus yang cocok dengan `moisture_window`, `water_decision`, `ph_decision`, atau `emergency` (termasuk `emergency_settle`).
2. Menanam satu bacaan awal di `sensor:moisture_window:<deviceCode>` berformat `<epoch ms>:<kelembapan>`.

Alasannya: `claimWaterDecision` mensyaratkan sedikitnya `WATER_MIN_READINGS = 2` bacaan di jendela. Bacaan yang ditanam menjadi bacaan pertama, dan pesan MQTT sampel menjadi yang kedua, sehingga syarat terpenuhi. Slot 4 jam yang sudah dihapus lalu diklaim ulang oleh sampel ini (`SET NX` berhasil). Hal yang sama berlaku untuk gate pH 7 hari.

Dengan cara ini, yang diukur adalah waktu pemrosesan sistem, bukan jeda terjadwalnya.

---

## 6. Langkah satu sampel secara berurutan

```text
1. Hitung ph unik dan ambil titik (basePh, kelembapan) sesuai skenario.
2. Reset gate Redis dan tanam bacaan awal (bagian 5).
3. Daftarkan penunggu SSE untuk ph ini.
4. t0 = performance.now(); t0wall = Date.now()
5. Publish {"ph": ph, "soil_vwc_pct": kelembapan} ke topic telemetry, QoS 1.
6. Tunggu event SSE dengan ph tersebut (batas 30 detik).      → T1
   Jika tidak datang: sampel dicatat GAGAL.
7. Polling DB tiap 50 ms sampai baris log dengan phValue itu muncul (batas 30 detik dari t0).   → T2
8. Setelah T2: GET /api/devices/:id/recommendation, baca body sampai habis.                    → T3
9. Jika browser aktif: tunggu hingga 10 detik sampai window.__t[ph] terisi (dashboard fetch ulang
   setelah event "recommendation" dan menerima log sampel ini).                                → T4
   Jika tidak terisi: sampel dicatat "tak tampil".
10. Simpan baris hasil, tidur 1 detik, lanjut ke sampel berikutnya.
```

Payload memakai field `soil_vwc_pct` agar backend memperlakukannya sebagai `moistureType = "vwc_percent"`. Hanya jenis ini yang masuk ke jalur keputusan air. Payload tanpa `record_id` memakai jalur langsung (bukan jalur buffer/ack), yang merupakan jalur telemetri normal.

Sampel dianggap **berhasil** bila T1, T2, dan T3 semuanya terukur. T4 dicatat terpisah karena dashboard bisa saja tidak menampilkan sampel tertentu.

---

## 7. Pengukuran T4 dengan Playwright

### 7.1 Persiapan browser

1. Chromium headless dijalankan lewat paket `playwright` (devDependency backend).
2. Login lewat form asli: halaman `/login`, isi `#login-email` dan `#login-password`, klik `#btn-login-email`. Akun harus akun email + password (bukan Google) milik device uji.
3. Script menunggu browser membuka request `/api/sensors/:id/stream`, yaitu tanda dashboard sudah memasang koneksi SSE-nya sendiri. Lalu jeda 2 detik agar fetch awal selesai.

### 7.2 Instrumentasi di dalam halaman

Sebelum halaman dimuat, `addInitScript` membungkus `window.fetch`. Untuk setiap respons dari URL yang mengandung `/recommendation`:

1. Respons di-`clone()` dan dibaca sebagai JSON (aplikasi tetap memakai respons aslinya).
2. Jika `data.phValue` ada dan belum tercatat, dua kali `requestAnimationFrame` bersarang dipasang.
3. Setelah callback kedua, `t4 = Date.now()` disimpan di `window.__t[phValue]`.

Dua `requestAnimationFrame` dipakai karena callback pertama berjalan sebelum paint berikutnya, dan callback kedua berjalan setelah frame itu selesai. Ini perkiraan untuk "React sudah commit dan browser sudah paint".

Script mem-polling `window.__t[ph]` lewat `page.evaluate` tiap 30 ms. Jam halaman (`Date.now()`) dan jam Node berasal dari mesin yang sama, sehingga `t4 - t0wall` valid.

### 7.3 Keterbatasan T4

- T4 bukan pengamatan langsung pada DOM. Nilai pH di kartu hanya tampil 1 desimal, jadi nilai unik tidak bisa dibaca dari layar.
- Fetch aplikasi dipicu oleh event SSE, bukan oleh script. Sebelum perbaikan di bagian 9, fetch itu bisa mendahului penyimpanan log, mengembalikan rekomendasi lama, dan sampel tidak tercatat tampil. Setelah perbaikan, fetch ulang dipicu event `recommendation` yang dikirim sesudah log tersimpan.
- Berjalan dari headless Chromium di laptop, bukan perangkat pengguna. Waktu render di ponsel akan lebih lama.

---

## 8. Skenario

| Skenario    | Titik uji `[pH, VWC %]`                                                    | Tujuan                                                                                                                                                                                                                                      |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normal`    | `[6.2, 26]` (satu titik, diulang)                                          | Data normal tanpa perubahan kategori. Jalur tipikal.                                                                                                                                                                                        |
| `kategori`  | `[6.2,26] [4.5,26] [8.2,26] [6.2,14] [6.2,40] [4.5,14] [8.2,40]`, bergilir | Memicu kategori berbeda (pH asam/basa, kering/basah). Titik-titik ini tidak mencakup seluruh C1–C9: pada pengujian, kategori yang muncul hanya C1 (9 sampel), C2 (4), C4 (5), C5 (4), dan C7 (8). Untuk C1–C9 lengkap, tambahkan titik uji. |
| `emergency` | `[6.2, 10]`                                                                | Kelembapan ≤ 16,49% (`THETA_CC/2`) dengan bacaan awal yang juga 10% memicu `dry_critical`. Jalur ini melewati gate 4 jam.                                                                                                                   |

Pada skenario `emergency`, backend mengirim notifikasi (`notifyDevice`) sebagai bagian dari pemrosesan, sehingga waktu T1→T2 bisa sedikit berbeda dari jalur normal.

---

## 9. Temuan: race pada dashboard dan perbaikannya

### 9.1 Masalah (sebelum perbaikan)

Dari kode (bukan hanya dari pengukuran):

1. `sensor_subscriber.js` memanggil `broadcastToDevice` (event SSE sensor) sebelum `generateRecommendation` dan `recommendationLog.create`.
2. `dashboard/page.tsx`: perubahan `lastUpdated` (dari SSE) memanggil `loadRecommendation(true)`.
3. `getDeviceRecommendation` membangun respons dari **log terbaru** di database, bukan dari data sensor live.

Fetch yang dipicu SSE sensor bisa mengambil log **sebelum** log baru tersimpan dan menerima rekomendasi lama. Dashboard tidak punya pemicu fetch ulang lain (selain event SSE berikutnya, pergantian device, atau konfirmasi), sehingga rekomendasi baru baru terlihat pada event sensor berikutnya atau setelah halaman dimuat ulang.

### 9.2 Perbaikan (opsi A)

- Backend: setelah `recommendationLog.create`, `sensor_subscriber.js` mengirim event SSE kedua `{ type: "recommendation", deviceId }`. Event ini tidak dikirim bila tidak ada log baru (gate belum lolos atau terjadi error).
- Frontend: `useSensorRealtime` menaikkan penghitung `recommendationVersion` tiap event itu tiba, dan `dashboard/page.tsx` memanggil `loadRecommendation(true)` saat penghitung berubah. Event sensor biasa tetap memicu fetch seperti sebelumnya. Klien lama yang tidak mengenal `type` mengabaikan event ini karena tidak memuat `ph` atau `moisture`.
- Tes: `sensor_subscriber.test.js` memastikan urutan sensor → log tersimpan → `recommendation`, dan event itu tidak muncul bila log tidak dibuat.

### 9.3 Cara mengukur dampaknya

Pengujian mencatat jumlah sampel "tampil otomatis" (`Tampil otomatis di dashboard: x/y`). Hasil yang diambil **sebelum** perbaikan dibuat dari backend yang belum diperbarui dan menjadi data pembanding. Setelah backend dan frontend yang diperbaiki dideploy, uji ulang dengan perintah yang sama dan bandingkan jumlah sampel tampil serta T0→T4. Sebelum perbaikan, 4 dari 90 sampel (4,4%) tidak tampil otomatis dalam 10 detik: 1/30 pada `normal`, 2/30 pada `kategori`, dan 1/30 pada `emergency`. Jadi race ini nyata, meski jarang. Setelah perbaikan dideploy (commit `16891c4`), semua 90 sampel tampil otomatis; perbandingannya ada di bagian 13.4.

---

## 10. Statistik dan keluaran

### 10.1 Perhitungan

Dihitung per segmen hanya dari sampel yang berhasil:

- `min`, `max`
- `mean` = rata-rata aritmetika
- `median` dan `p95` memakai **nearest-rank**: nilai pada indeks `ceil(p × n) - 1` dari data terurut. Untuk n = 30, P95 adalah nilai terbesar ke-2.
- `sd` = simpangan baku **populasi** (dibagi n, bukan n−1)
- tingkat kegagalan = `(runs − n berhasil) / runs`

Script punya self-test: `node scripts/response_time.js --selftest` memeriksa fungsi statistik pada data kecil.

Dengan n = 30, P95 tidak stabil terhadap satu data pencilan, jadi laporkan juga max dan jumlah sampel gagal.

### 10.2 Keluaran

- Konsol: baris per sampel (`#n ok T1= T2= T3= T4= kategori`), jumlah tampil, dan tabel markdown berisi min, mean, median, P95, max, SD.
- CSV per skenario: `run, ph, moisture, ok, t1_ms, t2_ms, t3_ms, t4_ms, category`, ditulis ke folder kerja sebagai `response_time_<skenario>_<epoch ms>.csv` (pola `response_time_*.csv` sudah ada di `backend/.gitignore`). Nilai T1–T3 relatif terhadap T0; T4 relatif terhadap `t0wall`.

---

## 11. Lingkungan dan cara menjalankan

### 11.1 Topologi saat pengujian

- Laptop penguji menjalankan script, Chromium Playwright, dan klien MQTT.
- Broker: EMQX Cloud.
- Backend dan frontend di VPS (`https://suburin.duckdns.org`; API di `/api`).
- Database: Postgres (Supabase), diakses langsung oleh script dari laptop untuk polling T2.
- Redis di VPS (terhubung ke backend via `host.docker.internal`). Port 6379 tidak terbuka ke publik, jadi script mengaksesnya lewat **tunnel SSH**:

```bash
ssh -N -L 6379:127.0.0.1:6379 <user>@<ip-vps>
```

Script lalu memakai `REDIS_HOST=127.0.0.1`. Variabel lain (`DATABASE_URL`, `JWT_SECRET`, `MQTT_*`, `REDIS_PASSWORD`) diambil dari `backend/.env`, yang nilainya sama dengan di VPS. `JWT_SECRET` harus sama agar token buatan script diterima API.

### 11.2 Device dan akun uji

- Device khusus uji (`node_test`) dengan tanaman terpasang dan `sensorInterval = 60`.
- Akun email + password pemilik device itu, hanya dipakai untuk login Playwright.
- JWT untuk SSE dan request API dibuat langsung oleh script (`jsonwebtoken`, payload `{ id: device.userId }`), karena middleware hanya memverifikasi tanda tangan dan `requireOwnedDevice` mencocokkan pemilik device.

Kredensial akun tidak disimpan di file apa pun. Ia dioper lewat variabel lingkungan saat perintah dijalankan.

### 11.3 Perintah

```bash
cd backend
API_URL=https://suburin.duckdns.org \
FRONTEND_URL=https://suburin.duckdns.org \
REDIS_HOST=127.0.0.1 \
TEST_EMAIL=<email-akun-uji> TEST_PASSWORD=<password-akun-uji> \
node scripts/response_time.js --device node_test --scenario normal --runs 30
# scenario: normal | kategori | emergency
```

Tanpa `TEST_EMAIL` dan `TEST_PASSWORD`, script berjalan tanpa T4 (hanya T0–T3).

### 11.4 Normalisasi URL broker

`MQTT_BROKER_URL` pada `.env` berisi host tanpa protokol. Script menormalkannya persis seperti `src/mqtt/connection.js`: bila tanpa `mqtt://` atau `mqtts://`, protokol dipilih dari port (8883 → `mqtts`) dan `rejectUnauthorized` dimatikan seperti klien backend.

### 11.5 Opsi, variabel lingkungan, dan struktur script

| Opsi                                              | Default  | Arti                                                    |
| ------------------------------------------------- | -------- | ------------------------------------------------------- |
| `--device <deviceCode>`                           | wajib    | Kode device uji di database                             |
| `--scenario normal`, `kategori`, atau `emergency` | `normal` | Titik uji (bagian 8)                                    |
| `--runs <n>`                                      | `30`     | Jumlah sampel. Maksimum 100 agar pH tetap unik          |
| `--selftest`                                      | -        | Hanya memeriksa fungsi statistik, tanpa koneksi apa pun |

| Variabel                                          | Dipakai untuk                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `API_URL` (default `http://localhost:3000`)       | Origin backend. Script menambahkan `/api/...` sendiri, jadi jangan sertakan `/api` |
| `FRONTEND_URL` (default `http://localhost:3001`)  | Origin dashboard untuk login Playwright                                            |
| `TEST_EMAIL`, `TEST_PASSWORD`                     | Akun pemilik device. Bila salah satu kosong, T4 dilewati                           |
| `DATABASE_URL`, `JWT_SECRET`, `MQTT_*`, `REDIS_*` | Dibaca dari `backend/.env`, sama seperti server                                    |

Fungsi di script:

| Fungsi                                         | Tugas                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `parseArgs`, `brokerUrl`                       | Membaca opsi dan menormalkan URL broker seperti `src/mqtt/connection.js`              |
| `connectMqtt`                                  | Klien MQTT yang mem-publish data uji                                                  |
| `listenSse`                                    | Satu koneksi SSE untuk seluruh uji, membangunkan penunggu per nilai `ph` (T1)         |
| `openDashboard`                                | Login Playwright, memasang hook `window.fetch`, menunggu stream SSE dashboard terbuka |
| `resetGate`                                    | Menghapus kunci gate Redis dan menanam bacaan awal (bagian 5)                         |
| `measureSample`                                | Satu sampel: publish, T1, T2, T3, T4 (bagian 6)                                       |
| `segments`, `printReport`, `writeCsv`, `stats` | Statistik per segmen, tabel markdown, dan CSV                                         |

Script ini sengaja tanpa komentar; kontrak pengukurannya didokumentasikan di halaman ini.

---

## 12. Validitas, keterbatasan, dan efek samping

### 12.1 Keterbatasan yang harus dicantumkan di laporan

1. **Satu klien, satu lokasi.** Latensi jaringan laptop↔VPS↔EMQX↔Supabase ikut terukur dan akan berbeda dari lokasi lain.
2. **Resolusi polling.** T2 ±50 ms dan T4 ±30 ms.
3. **T2 mencakup latensi query laptop→Supabase**, sehingga sedikit lebih besar dari waktu penyimpanan di backend. Untuk angka internal backend yang bersih, perlu stempel waktu di `sensor_subscriber.js` (tidak dipasang agar kode produksi tidak diubah).
4. **T1 adalah proksi** lewat SSE dan terjadi setelah lookup device di backend.
5. **T3 mencakup handshake TLS baru** karena tiap sampel membuka koneksi baru.
6. **T4 adalah perkiraan** (bagian 7.3).
7. **Mesin penguji** bukan ponsel pengguna, dan tidak ada beban pengguna lain yang disimulasikan. Kondisi "sibuk" pada desain pengujian belum diwakili bila pengujian dijalankan saat sepi.
8. **Sampel diberi jeda 1 detik**, jadi tidak menguji beban beruntun.
9. **Jumlah sampel** 30 per skenario cukup untuk mean dan median, tetapi P95 hanya ditentukan oleh dua nilai terbesar.

### 12.2 Efek samping pengujian

- Menulis baris `recommendation_logs`, `sensor_logs` (sebagian, sesuai throttle), dan data Redis untuk device uji.
- Memicu pemrosesan notifikasi untuk device itu (terutama pada skenario `emergency`).
- Menghapus kunci gate Redis milik device uji. Karena itu **jangan** memakai device yang memantau tanaman sungguhan.
- Bila selesai, device dan akun uji dapat dihapus. Rekomendasi ikut terhapus karena relasinya `onDelete: Cascade`.

### 12.3 Penetapan target

Target latensi ditetapkan sendiri dan dijelaskan alasannya, tanpa angka dari literatur kecuali ada sumbernya. Untuk monitoring tanaman, proses biologis berjalan lambat, sehingga latensi beberapa detik masih memadai. Target yang sebenarnya perlu ditulis di laporan oleh peneliti beserta pembenarannya.

---

## 13. Hasil

Data diambil terhadap VPS (`https://suburin.duckdns.org`) sebelum perbaikan bagian 9 dideploy, dari laptop penguji, dengan device uji `node_test` (interval sensor 60 menit), 30 ulangan per skenario. Semua sampel berhasil (0 gagal). Satuan milidetik. Data mentah per sampel berupa CSV yang tidak ikut repositori.

### 13.1 Sebelum perbaikan: skenario `normal` (n = 30, tampil di dashboard 29/30)

| Segmen                              | Min  | Mean | Median | P95  | Max  | SD  |
| ----------------------------------- | ---- | ---- | ------ | ---- | ---- | --- |
| Broker → Backend (T0→T1)\*          | 702  | 787  | 747    | 907  | 1420 | 129 |
| Fuzzy + simpan DB (T1→T2)           | 1035 | 1554 | 1335   | 2561 | 5608 | 822 |
| API rekomendasi (T2→T3)             | 1647 | 1915 | 1724   | 2257 | 5568 | 695 |
| Dashboard tampil (T0→T4, 29 sampel) | 2416 | 2688 | 2575   | 3186 | 4406 | 382 |

### 13.2 Sebelum perbaikan: skenario `kategori` (n = 30, tampil di dashboard 28/30)

| Segmen                              | Min  | Mean | Median | P95  | Max  | SD  |
| ----------------------------------- | ---- | ---- | ------ | ---- | ---- | --- |
| Broker → Backend (T0→T1)\*          | 706  | 791  | 753    | 1055 | 1102 | 101 |
| Fuzzy + simpan DB (T1→T2)           | 1030 | 1402 | 1518   | 1706 | 1866 | 237 |
| API rekomendasi (T2→T3)             | 1657 | 1847 | 1811   | 2111 | 2525 | 172 |
| Dashboard tampil (T0→T4, 28 sampel) | 2433 | 2612 | 2580   | 2880 | 2896 | 137 |

### 13.3 Sebelum perbaikan: skenario `emergency` (n = 30, tampil di dashboard 29/30)

| Segmen                              | Min  | Mean | Median | P95  | Max  | SD  |
| ----------------------------------- | ---- | ---- | ------ | ---- | ---- | --- |
| Broker → Backend (T0→T1)\*          | 702  | 751  | 734    | 835  | 863  | 41  |
| Fuzzy + simpan DB (T1→T2)           | 1064 | 1487 | 1573   | 1734 | 1807 | 207 |
| API rekomendasi (T2→T3)             | 1651 | 1879 | 1825   | 2612 | 2726 | 236 |
| Dashboard tampil (T0→T4, 29 sampel) | 2431 | 2616 | 2575   | 2869 | 3056 | 150 |

\* Diukur dari klien MQTT di laptop → broker → backend → SSE ke laptop.

### 13.4 Setelah perbaikan (commit `16891c4`, 30 ulangan per skenario, 0 gagal, tampil di dashboard 90/90)

Diambil dengan perintah dan device uji yang sama setelah backend dan frontend yang diperbaiki dideploy (`/api/version` mengembalikan `16891c4`).

| Segmen (median / P95)        | `normal`    | `kategori`  | `emergency` |
| ---------------------------- | ----------- | ----------- | ----------- |
| Broker → Backend (T0→T1)\*   | 772 / 844   | 802 / 1100  | 769 / 964   |
| Fuzzy + simpan DB (T1→T2)    | 1550 / 1941 | 1610 / 2027 | 1605 / 1687 |
| API rekomendasi (T2→T3)      | 1855 / 2224 | 1948 / 3220 | 1883 / 2248 |
| Dashboard tampil (T0→T4)     | 2663 / 4098 | 2666 / 3604 | 2640 / 2889 |
| Tampil otomatis di dashboard | 30/30       | 30/30       | 30/30       |

Rata-rata dan nilai lengkap (min, mean, max, SD) ada di CSV mentah. Sebagai contoh, T0→T4 pada `normal` memiliki mean 2856, max 4563, SD 514.

### 13.5 Pembacaan hasil

- **Hasil antar skenario hampir sama.** Median T0→T4 berkisar 2575–2580 ms pada ketiganya, dan jalur darurat tidak lebih lambat dari jalur normal. Pada `normal`, ekor P95 dan max lebih besar (T1→T2 sampai 5608 ms, T2→T3 sampai 5568 ms), kemungkinan lonjakan jaringan sesaat; dengan 30 sampel, satu atau dua pencilan sudah menentukan P95 dan SD.
- **Waktu tunggu terbesar bukan di firmware atau fuzzy saja.** Median segmen: T0→T1 sekitar 0,75 detik, T1→T2 sekitar 1,3–1,6 detik, dan T2→T3 sekitar 1,7–1,8 detik. T1→T2 mencakup pemrosesan Redis, fuzzy, penyimpanan log, serta latensi polling laptop→Supabase (bagian 3). T2→T3 hanya satu request API, sebagian besar adalah perjalanan jaringan dan handshake TLS baru. Memisahkan kontribusi masing-masing butuh stempel waktu di sisi backend, yang belum dipasang.
- **End-to-end ke dashboard sekitar 2,6 detik (median), dan P95 sekitar 2,9–3,2 detik.** Jangan menjumlahkan T3 dengan T4 (bagian 3).
- **Race dashboard nyata, dan perbaikannya tampak bekerja.** Sebelum perbaikan, 4 dari 90 sampel (4,4%) tidak tampil otomatis dalam 10 detik (bagian 9). Setelah perbaikan, 0 dari 90. Dengan jumlah sampel sekecil ini selisih itu belum konklusif secara statistik (uji Fisher satu arah p ≈ 0,06), jadi dasar yang lebih kuat adalah mekanismenya: fetch ulang kini dipicu event yang dikirim sesudah log tersimpan. Statistik T4 dihitung hanya dari sampel yang tampil.
- **Median T0→T4 naik sedikit (sekitar 2575 menjadi 2640–2666 ms).** Kenaikan sekitar 60–90 ms searah dengan desain baru, karena dashboard kini menunggu event kedua sesudah log tersimpan. Selisih sekecil itu masih dalam rentang variasi antar-eksekusi (bandingkan `normal` yang P95-nya melonjak dari 3186 ke 4098 ms), jadi jangan dibaca sebagai kemunduran yang pasti.
- **Cakupan.** Pengujian ini hanya satu klien, satu lokasi, saat tidak ada pengguna lain, dan tanpa kategori C3, C6, C8, C9 (bagian 8, 12.1).
