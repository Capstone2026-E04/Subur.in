BEGIN;

ALTER TABLE "correction_logs" DROP CONSTRAINT IF EXISTS "chk_correction_logs_dose_gram_positive";
ALTER TABLE "correction_logs" DROP CONSTRAINT IF EXISTS "chk_correction_logs_ph_before_range";
ALTER TABLE "correction_logs" DISABLE ROW LEVEL SECURITY;

COMMIT;
