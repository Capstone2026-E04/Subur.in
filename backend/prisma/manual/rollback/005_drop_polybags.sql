-- Rollback struktur saja; data polybag lama tidak dipulihkan.
BEGIN;

CREATE TABLE IF NOT EXISTS "polybag_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "diameter" DOUBLE PRECISION NOT NULL CHECK ("diameter" > 0),
  "height" DOUBLE PRECISION NOT NULL CHECK ("height" > 0),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "polybags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "polybag_type_id" UUID NOT NULL REFERENCES "polybag_types"("id") ON DELETE RESTRICT,
  "soil_volume_liter" DOUBLE PRECISION NOT NULL CHECK ("soil_volume_liter" > 0),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_polybags_polybag_type_id" ON "polybags"("polybag_type_id");
ALTER TABLE "polybag_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "polybags" ENABLE ROW LEVEL SECURITY;
-- Isi ulang preset lalu pulihkan kolom (NOT NULL) setelah semua device terisi.
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "polybag_id" UUID REFERENCES "polybags"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "idx_devices_polybag_id" ON "devices"("polybag_id");

COMMIT;
