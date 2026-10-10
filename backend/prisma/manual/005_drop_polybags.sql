-- Preset polybag kini konstanta kode (src/ai/config/polybag.js): 20x20 cm, media 2 L.
BEGIN;

ALTER TABLE "devices" DROP COLUMN IF EXISTS "polybag_id";
DROP TABLE IF EXISTS "polybags";
DROP TABLE IF EXISTS "polybag_types";

COMMIT;
