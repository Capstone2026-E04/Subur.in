-- record_id ESP32 berbentuk teks (mis. node_1-<hash>-1): ubah kolom integer -> text (angka lama
-- tetap terbaca sebagai teks), tambah moisture_type untuk membedakan VWC (%) dari indeks lama,
-- dan tabel rejected_sensor_records untuk payload yang gagal validasi (disimpan sebelum ACK).
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
BEGIN;

ALTER TABLE "raw_sensor_logs" ALTER COLUMN "record_id" TYPE text USING "record_id"::text;
ALTER TABLE "raw_sensor_logs" ADD COLUMN IF NOT EXISTS "moisture_type" varchar(20) NOT NULL DEFAULT 'legacy_index';

CREATE TABLE IF NOT EXISTS "rejected_sensor_records" (
  "id" serial PRIMARY KEY,
  "device_id" uuid NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "record_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "reason" varchar(100) NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rejected_sensor_records_device_record"
  ON "rejected_sensor_records" ("device_id", "record_id");

COMMIT;
