BEGIN;

ALTER TABLE "correction_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "correction_logs" ADD CONSTRAINT "chk_correction_logs_dose_gram_positive" CHECK ("dose_gram" > 0);
ALTER TABLE "correction_logs" ADD CONSTRAINT "chk_correction_logs_ph_before_range" CHECK ("ph_before" >= 0 AND "ph_before" <= 14);

COMMIT;
