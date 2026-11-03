BEGIN;

ALTER TABLE "recommendation_logs" DROP COLUMN IF EXISTS "confirmed_at";

COMMIT;
