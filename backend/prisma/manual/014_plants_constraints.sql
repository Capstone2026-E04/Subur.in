BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_plants_name_normalized"
  ON "plants" (lower(btrim("name")));

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_target_between";
ALTER TABLE "plants" ADD CONSTRAINT "chk_plants_ph_target_between"
  CHECK ("ph_target" >= "min_ph" AND "ph_target" <= "max_ph");

COMMIT;
