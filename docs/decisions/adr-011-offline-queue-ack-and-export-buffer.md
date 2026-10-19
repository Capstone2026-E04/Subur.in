# ADR-011: Antrean offline ESP32 dengan ACK, dan ekspor CSV dari buffer MQTT

## Status

Diterima (2026-10-17)

## Konteks

Saat WiFi putus, ESP32 harus menyimpan pembacaan dan mengirimnya setelah tersambung kembali tanpa kehilangan atau menggandakan data. Kontrak dengan firmware: setiap record membawa `record_id` (dan `measured_at` UTC, `boot_id`, `uptime_ms`); backend menyimpan idempoten, lalu membalas ACK; tanpa ACK, record tertua dikirim ulang tiap 30 detik. Terpisah dari itu, pengguna ingin mengekspor data sensor ke Excel yang bersumber dari pesan MQTT, bukan dari database. Penyimpanan database dibatasi `SENSOR_THROTTLE_SECONDS` (default 30 detik) sehingga tidak memuat semua pesan.

## Keputusan

- **Penyimpanan idempoten.** `raw_sensor_logs` mendapat `record_id` (teks, nullable; ESP32 mengirim `node_1-<hash>-1`, angka lama dikonversi ke teks) dan `time_synced` (default `true`). Karena tabel dipartisi `RANGE (timestamp)`, unique index wajib memuat kolom partisi: `UNIQUE(device_id, record_id, timestamp)`. Index itu hanya idempoten selama `measured_at` sama, sehingga dedup sebenarnya memakai `sensor_record_receipts` (PK `(device_id, record_id)`, tidak dipartisi) yang ditulis satu transaksi dengan log via `createMany({ skipDuplicates: true })`. Jangan mengambil angka terakhir `record_id` saja: bentrok antar-sesi.
- **ACK setelah commit.** `ack_publisher.js` mengirim `record_id` polos ke `suburin/devices/<node_id>/ack` (QoS 1, `retain=false`) setelah database commit, juga untuk duplikat. Kegagalan publish ACK hanya dicatat; ESP32 akan mengirim ulang dan penyimpanan idempoten. Nilai sensor tidak valid (termasuk `null`) disimpan dulu bersama payload asli dan alasannya ke `rejected_sensor_records`, baru di-ACK; bila penyimpanan gagal, tidak ada ACK. Perangkat yang belum terdaftar tidak di-ACK sehingga antreannya menunggu sampai perangkat diklaim.
- **Satuan kelembapan.** `soil_vwc_pct` (VWC, %) didahulukan atas `moisture`/`soil_moisture` dan ditandai `moisture_type = vwc_percent`. Ambang rekomendasi lama kalibrasi indeks, jadi rekomendasi dan notifikasi berbasis kelembapan hanya untuk `legacy_index`; `null` berarti tidak tersedia, bukan 0.
- **Waktu.** `measured_at` dipakai sebagai waktu pengukuran. `null` berarti jam belum sinkron NTP: baris disimpan dengan `time_synced=false` dan `timestamp` berisi waktu terima, karena `timestamp` bagian dari primary key. `boot_id` dan `uptime_ms` belum disimpan.
- **Pemrosesan langsung hanya untuk data baru.** Duplikat dan record yang lebih tua dari 2 x `sensorInterval` tidak memicu rekomendasi, notifikasi, SSE, maupun cache Redis terbaru (ambang sama dengan cron `checkOfflineDevices`).
- **Ekspor CSV dari buffer Redis.** Setiap pesan telemetri yang diterima (tanpa throttle; record bernomor hanya bila baru; Dev Mode dikecualikan) dicatat ke list Redis `sensor:export:<deviceCode>` (maks 10.000 entri, TTL 30 hari). `GET /api/sensors/:deviceId/export.csv` membaca list itu; database hanya dipakai untuk memetakan `deviceId` ke `deviceCode`.
- **Otorisasi ekspor.** `EXPORT_API_KEY` statis (Excel tidak dapat memperbarui JWT 7 hari) atau JWT pemilik perangkat.

## Konsekuensi

- Broker MQTT tidak menyimpan riwayat: ekspor hanya mencakup pesan yang diterima backend sejak fitur aktif, dan hilang bila Redis dikosongkan. Tidak ada fallback ke database.
- Perangkat belum terdaftar tidak punya `device_id`, sehingga record-nya (termasuk yang tidak valid) tidak bisa disimpan dan tidak di-ACK.
- `EXPORT_API_KEY` berlaku untuk semua perangkat dan bisa tercatat di log bila dipakai lewat URL; ganti nilainya bila bocor.
- ACL broker harus mengizinkan node subscribe ke `ack` dan `config`, dan backend publish ke keduanya. Mode blacklist bawaan EMQX Cloud sudah mengizinkan semuanya.
