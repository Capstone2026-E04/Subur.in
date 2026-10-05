-- Kembalikan devices.id ke kode alat (varchar) dari devices.device_code.
-- Jalankan HANYA bersama rollback deploy backend ke versi sebelum surrogate key.
-- Device yang didaftarkan setelah migrasi tetap aman: device_code selalu terisi.

BEGIN;

LOCK TABLE devices, recommendation_logs, notifications, raw_sensor_logs IN ACCESS EXCLUSIVE MODE;

ALTER TABLE recommendation_logs ADD COLUMN old_device_id varchar(50);
UPDATE recommendation_logs t SET old_device_id = d.device_code FROM devices d WHERE d.id = t.device_id;

ALTER TABLE notifications ADD COLUMN old_device_id varchar(50);
UPDATE notifications t SET old_device_id = d.device_code FROM devices d WHERE d.id = t.device_id;

ALTER TABLE raw_sensor_logs ADD COLUMN old_device_id varchar(50);
UPDATE raw_sensor_logs t SET old_device_id = d.device_code FROM devices d WHERE d.id = t.device_id;

ALTER TABLE recommendation_logs DROP CONSTRAINT recommendation_logs_device_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT notifications_device_id_fkey;
DROP INDEX idx_recommendation_logs_device_created;
DROP INDEX idx_notifications_device_created;
DROP INDEX idx_raw_sensor_logs_device_timestamp;

ALTER TABLE recommendation_logs DROP COLUMN device_id;
ALTER TABLE recommendation_logs RENAME COLUMN old_device_id TO device_id;
ALTER TABLE recommendation_logs ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE notifications DROP COLUMN device_id;
ALTER TABLE notifications RENAME COLUMN old_device_id TO device_id;
ALTER TABLE notifications ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE raw_sensor_logs DROP COLUMN device_id;
ALTER TABLE raw_sensor_logs RENAME COLUMN old_device_id TO device_id;
ALTER TABLE raw_sensor_logs ALTER COLUMN device_id SET NOT NULL;

DROP INDEX devices_device_code_key;
ALTER TABLE devices DROP CONSTRAINT devices_pkey;
ALTER TABLE devices DROP COLUMN id;
ALTER TABLE devices RENAME COLUMN device_code TO id;
ALTER TABLE devices ALTER COLUMN id TYPE varchar(50);
ALTER TABLE devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE recommendation_logs
  ADD CONSTRAINT recommendation_logs_device_id_fkey
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_device_id_fkey
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX idx_recommendation_logs_device_created ON recommendation_logs (device_id, created_at DESC);
CREATE INDEX idx_notifications_device_created ON notifications (device_id, created_at DESC);
CREATE INDEX idx_raw_sensor_logs_device_timestamp ON raw_sensor_logs (device_id, "timestamp" DESC);

COMMIT;
