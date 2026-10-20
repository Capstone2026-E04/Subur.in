BEGIN;

ALTER TABLE "notifications"
  DROP COLUMN IF EXISTS "telegram_status",
  DROP COLUMN IF EXISTS "telegram_error";
DROP TYPE IF EXISTS "telegram_delivery_status";

COMMIT;
