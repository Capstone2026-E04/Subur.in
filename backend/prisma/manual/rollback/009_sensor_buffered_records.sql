BEGIN;

DROP INDEX IF EXISTS "uq_raw_sensor_logs_device_record";
ALTER TABLE "raw_sensor_logs" DROP COLUMN IF EXISTS "time_synced";
ALTER TABLE "raw_sensor_logs" DROP COLUMN IF EXISTS "record_id";

COMMIT;
