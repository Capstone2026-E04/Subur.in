-- Antrean offline ESP32: raw_sensor_logs.record_id (ID record dari node) dan time_synced
-- (false = jam node belum sinkron NTP, timestamp hanya waktu terima).
-- raw_sensor_logs dipartisi RANGE (timestamp), sehingga unique index wajib memuat timestamp:
-- UNIQUE(device_id, record_id, timestamp) idempoten selama measured_at sama pada tiap kirim ulang.
-- Record dengan measured_at null (time_synced=false) memakai waktu terima, jadi kirim ulang
-- bisa menghasilkan baris ganda. Baris lama/telemetri tanpa record_id (NULL) tidak saling bentrok.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
BEGIN;

ALTER TABLE "raw_sensor_logs" ADD COLUMN IF NOT EXISTS "record_id" integer;
ALTER TABLE "raw_sensor_logs" ADD COLUMN IF NOT EXISTS "time_synced" boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_raw_sensor_logs_device_record"
  ON "raw_sensor_logs" ("device_id", "record_id", "timestamp");

COMMIT;
