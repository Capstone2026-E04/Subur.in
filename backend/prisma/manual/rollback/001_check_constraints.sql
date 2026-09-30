BEGIN;

ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_category_code";
ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "chk_raw_sensor_logs_ph_range";
ALTER TABLE "raw_sensor_logs" DROP CONSTRAINT IF EXISTS "chk_raw_sensor_logs_moisture_range";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_ph_value_range";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_moisture_value_range";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_water_volume_liter_non_negative";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_lime_dosage_gram_non_negative";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_sulfur_dosage_gram_non_negative";
ALTER TABLE "recommendation_logs" DROP CONSTRAINT IF EXISTS "chk_recommendation_logs_fuzzy_index_range";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_min_ph_range";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_max_ph_range";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_order";
ALTER TABLE "plants" DROP CONSTRAINT IF EXISTS "chk_plants_ph_target_between";
ALTER TABLE "devices" DROP CONSTRAINT IF EXISTS "chk_devices_sensor_interval_positive";
ALTER TABLE "polybag_types" DROP CONSTRAINT IF EXISTS "chk_polybag_types_diameter_positive";
ALTER TABLE "polybag_types" DROP CONSTRAINT IF EXISTS "chk_polybag_types_height_positive";
ALTER TABLE "polybags" DROP CONSTRAINT IF EXISTS "chk_polybags_soil_volume_liter_positive";

COMMIT;
