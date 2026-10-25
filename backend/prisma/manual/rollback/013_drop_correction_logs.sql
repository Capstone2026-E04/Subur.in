BEGIN;

DO $$ BEGIN
  CREATE TYPE "correction_type" AS ENUM ('LIME', 'SULFUR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "correction_method" AS ENUM ('INCORPORATION', 'TOP_DRESSING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "correction_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "device_id" UUID NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "type" "correction_type" NOT NULL,
  "method" "correction_method" NOT NULL,
  "dose_gram" DOUBLE PRECISION NOT NULL CHECK ("dose_gram" > 0),
  "ph_before" DOUBLE PRECISION NOT NULL CHECK ("ph_before" >= 0 AND "ph_before" <= 14),
  "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_correction_logs_device_applied" ON "correction_logs" ("device_id", "applied_at" DESC);
ALTER TABLE "correction_logs" ENABLE ROW LEVEL SECURITY;

COMMIT;
