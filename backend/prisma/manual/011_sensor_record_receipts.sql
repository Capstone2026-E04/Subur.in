-- Dedup record antrean ESP32 lintas partisi: raw_sensor_logs dipartisi RANGE (timestamp) sehingga
-- unique index-nya wajib memuat timestamp dan tidak menahan kirim ulang record ber-measured_at null.
-- sensor_record_receipts (tidak dipartisi) menjamin satu receipt per (device_id, record_id);
-- backend menulis receipt dan log dalam satu transaksi.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
BEGIN;

CREATE TABLE IF NOT EXISTS "sensor_record_receipts" (
  "device_id" uuid NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "record_id" text NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("device_id", "record_id")
);

COMMIT;
