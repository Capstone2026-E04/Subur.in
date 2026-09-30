BEGIN;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type";
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_type"
  CHECK ("type" IN ('warning', 'info', 'success'));

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_category_code";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_category_code"
  CHECK ("category_code" ~ '^C[1-9]$');

COMMIT;
