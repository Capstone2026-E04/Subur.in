BEGIN;

ALTER TABLE "notifications" ALTER COLUMN "type" TYPE varchar(20) USING "type"::text;
DROP TYPE IF EXISTS "notification_type";

ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "raw_sensor_logs_device_id_fkey";

DROP INDEX IF EXISTS "idx_notifications_created_at";
DROP INDEX IF EXISTS "idx_recommendation_logs_created_at";

COMMIT;
