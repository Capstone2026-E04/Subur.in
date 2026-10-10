BEGIN;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type";
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_type"
  CHECK ("type" IN ('warning', 'info', 'success'));

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_category_code";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_category_code"
  CHECK ("category_code" ~ '^C[1-9]$');

ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "chk_raw_sensor_logs_ph_range";
ALTER TABLE "raw_sensor_logs" ADD CONSTRAINT "chk_raw_sensor_logs_ph_range"
  CHECK ("ph" >= 0 AND "ph" <= 14);

ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "chk_raw_sensor_logs_moisture_range";
ALTER TABLE "raw_sensor_logs" ADD CONSTRAINT "chk_raw_sensor_logs_moisture_range"
  CHECK ("moisture" >= 0 AND "moisture" <= 100);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_ph_value_range";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_ph_value_range"
  CHECK ("ph_value" >= 0 AND "ph_value" <= 14);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_moisture_value_range";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_moisture_value_range"
  CHECK ("moisture_value" >= 0 AND "moisture_value" <= 100);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_water_volume_liter_non_negative";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_water_volume_liter_non_negative"
  CHECK ("water_volume_liter" >= 0);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_lime_dosage_gram_non_negative";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_lime_dosage_gram_non_negative"
  CHECK ("lime_dosage_gram" >= 0);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_sulfur_dosage_gram_non_negative";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_sulfur_dosage_gram_non_negative"
  CHECK ("sulfur_dosage_gram" >= 0);

ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_fuzzy_index_range";
ALTER TABLE "recommendation_logs" ADD CONSTRAINT "chk_recommendation_logs_fuzzy_index_range"
  CHECK ("fuzzy_index" >= 0 AND "fuzzy_index" <= 8);

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_min_ph_range";
ALTER TABLE "plants" ADD CONSTRAINT "chk_plants_min_ph_range"
  CHECK ("min_ph" >= 0 AND "min_ph" <= 14);

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_max_ph_range";
ALTER TABLE "plants" ADD CONSTRAINT "chk_plants_max_ph_range"
  CHECK ("max_ph" >= 0 AND "max_ph" <= 14);

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_order";
ALTER TABLE "plants" ADD CONSTRAINT "chk_plants_ph_order"
  CHECK ("min_ph" < "max_ph");

ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_target_between";
ALTER TABLE "plants" ADD CONSTRAINT "chk_plants_ph_target_between"
  CHECK ("ph_target" >= "min_ph" AND "ph_target" <= "max_ph");

ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "chk_devices_sensor_interval_positive";
ALTER TABLE "devices" ADD CONSTRAINT "chk_devices_sensor_interval_positive"
  CHECK ("sensor_interval" > 0);

COMMIT;
