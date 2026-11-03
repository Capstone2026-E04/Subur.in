# Firmware ESP32

Sketch ada di [`firmware/`](../../firmware): satu folder per node (`node_1`, `node_2`), identik kecuali `NODE_ID`. Perubahan logika harus diterapkan di keduanya. Setup dan upload: [`firmware/README.md`](../../firmware/README.md).

Target: Arduino-ESP32 3.x, PubSubClient 2.8, ArduinoJson 7.x. Belum diuji compile dan belum diuji di perangkat fisik.

## Kontrak MQTT

| Topic | Arah | Isi |
|---|---|---|
| `suburin/devices/<node_id>/telemetry` | node → backend | Record JSON (lihat bawah) |
| `suburin/devices/<node_id>/ack` | backend → node | `record_id` polos (bukan JSON), QoS 1, retain=false |
| `suburin/devices/<node_id>/config` | backend → node | `{"reading_interval_min": n}`, retained |

Backend wajib menyimpan idempoten (`UNIQUE(device_id, record_id)`), memakai `measured_at` (UTC) sebagai waktu pengukuran, dan baru mengirim ACK setelah commit database (juga untuk ID duplikat). `measured_at: null` berarti jam belum sinkron NTP dan tidak boleh diganti waktu terima. Tanpa ACK, record tertua dikirim ulang tiap 30 detik. ACL broker harus mengizinkan node subscribe `ack` dan `config`. Lihat [ADR-011](../decisions/adr-011-offline-queue-ack-and-export-buffer.md).

## Field record

`node_id`, `record_id` (`<node>-<boot_id>-<urutan>`), `boot_id`, `uptime_ms`, `measured_at`, `time_valid`, `ph`, `ph_valid`, `ph_used_previous`, `soil_vwc` (m³/m³), `soil_vwc_pct` (% VWC), `adc_soil_used`, `soil_status`, `soil_adc_clamped`, `soil_calibration_id`, `adc_ph`, `adc_soil`, `reading_interval_min`.

## VWC

Model kubik sementara (`vwc_cubic_l0_13_provisional`), `x = ADC/1000`:

| ADC | Hasil |
|---|---|
| ≤ 0 atau ≥ 4095 | `adc_rail_or_invalid`, VWC `null` |
| ≤ 650 | `wet_out_of_range`, VWC `null` |
| 650 < ADC ≤ 2576 | dihitung (`within_model_range`) |
| > 2576 | di-clamp ke 2576 (`dry_clamped`) |

Bukan nilai NMI/RWC. pH di luar 3–10 memakai nilai valid terakhir dengan `ph_valid=false` dan `ph_used_previous=true`.

## Antrean dan batas

- Maksimum 512 record, atau lebih sedikit bila flash penuh. Saat penuh, record baru tidak disimpan dan data lama tidak ditimpa.
- Record ditulis ke file sementara lalu di-rename; dihapus hanya setelah ACK. Daya putus saat pembacaan berjalan masih dapat menghilangkan pembacaan itu.
- Mount LittleFS gagal: kirim `FORMAT LITTLEFS` lewat Serial Monitor (115200, newline) hanya bila siap menghapus seluruh filesystem. Tidak ada format otomatis.
- Koneksi MQTT/TLS bersifat sinkron dan dapat menunda siklus beberapa detik.
- `tls.setInsecure()` belum memverifikasi server; untuk produksi gunakan `setCACert()`.
- Interval dari `config` hanya diterima bila 1–60 menit.
