-- Rollback 010. record_id teks non-angka akan gagal dikonversi; hapus barisnya dulu bila ada.
BEGIN;

DROP TABLE IF EXISTS "rejected_sensor_records";
ALTER TABLE "raw_sensor_logs" DROP COLUMN IF EXISTS "moisture_type";
ALTER TABLE "raw_sensor_logs" ALTER COLUMN "record_id" TYPE integer USING "record_id"::integer;

COMMIT;
