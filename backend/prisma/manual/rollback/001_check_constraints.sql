BEGIN;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_category_code";

COMMIT;
