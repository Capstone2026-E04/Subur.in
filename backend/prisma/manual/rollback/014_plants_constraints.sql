BEGIN;

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_target_between";
DROP INDEX IF EXISTS "uq_plants_name_normalized";

COMMIT;
