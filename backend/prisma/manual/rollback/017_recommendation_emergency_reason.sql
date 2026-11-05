BEGIN;

ALTER TABLE "recommendation_logs" DROP COLUMN IF EXISTS "emergency_reason";

COMMIT;
