-- 1. Indeks created_at untuk cron pembersihan (deleteMany createdAt < 6 bulan tanpa filter device_id).
-- 2. FK raw_sensor_logs.device_id -> devices.id (tabel dipartisi; FK otomatis berlaku ke semua partisi).
-- 3. notifications.type: varchar -> enum notification_type.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru:
-- `prisma db push` tidak bisa mengubah varchar -> enum tanpa kehilangan data.
BEGIN;

CREATE INDEX IF NOT EXISTS "idx_recommendation_logs_created_at" ON "recommendation_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications"("created_at");

-- Baris yatim dibuang agar FK bisa dipasang.
DELETE FROM "raw_sensor_logs" l
WHERE NOT EXISTS (SELECT 1 FROM "devices" d WHERE d."id" = l."device_id");

ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "raw_sensor_logs_device_id_fkey";
ALTER TABLE "raw_sensor_logs"
  ADD CONSTRAINT "raw_sensor_logs_device_id_fkey"
  FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM ('warning', 'success', 'info');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE "notifications" SET "type" = 'info' WHERE "type" NOT IN ('warning', 'success', 'info');
ALTER TABLE "notifications"
  ALTER COLUMN "type" TYPE "notification_type" USING "type"::"notification_type";

COMMIT;
