-- Ubah devices.id (kode dari alat) menjadi surrogate key UUID.
-- Kode alat lama dipindahkan ke devices.device_code (unique).
-- Semua FK device_id (recommendation_logs, notifications, raw_sensor_logs) dimigrasi ke UUID baru.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
-- `prisma db push` tidak bisa melakukan perubahan ini tanpa kehilangan data.
-- Hentikan backend (atau pastikan tidak ada data MQTT masuk) selama migrasi berjalan.
--
-- Pra-cek (opsional): baris raw_sensor_logs yatim akan DIHAPUS oleh skrip ini.
--   select count(*) from raw_sensor_logs l
--   where not exists (select 1 from devices d where d.id = l.device_id);

BEGIN;

LOCK TABLE devices, recommendation_logs, notifications, raw_sensor_logs IN ACCESS EXCLUSIVE MODE;

-- 0. Buang raw_sensor_logs yatim (tidak punya FK sehingga tidak bisa dipetakan ke UUID).
DELETE FROM raw_sensor_logs l
WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.id = l.device_id);

-- 1. devices: simpan kode lama, siapkan UUID baru.
ALTER TABLE devices ADD COLUMN device_code varchar(50);
UPDATE devices SET device_code = id;
ALTER TABLE devices ALTER COLUMN device_code SET NOT NULL;
ALTER TABLE devices ADD COLUMN new_id uuid NOT NULL DEFAULT gen_random_uuid();

-- 2. Tabel anak: tambah kolom UUID baru dan isi lewat join ke kode lama.
ALTER TABLE recommendation_logs ADD COLUMN new_device_id uuid;
UPDATE recommendation_logs t SET new_device_id = d.new_id FROM devices d WHERE d.id = t.device_id;

ALTER TABLE notifications ADD COLUMN new_device_id uuid;
UPDATE notifications t SET new_device_id = d.new_id FROM devices d WHERE d.id = t.device_id;

ALTER TABLE raw_sensor_logs ADD COLUMN new_device_id uuid;
UPDATE raw_sensor_logs t SET new_device_id = d.new_id FROM devices d WHERE d.id = t.device_id;

-- 3. Lepas FK dan index lama, ganti kolom lama dengan kolom baru.
ALTER TABLE recommendation_logs DROP CONSTRAINT recommendation_logs_device_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT notifications_device_id_fkey;
DROP INDEX idx_recommendation_logs_device_created;
DROP INDEX idx_notifications_device_created;
DROP INDEX idx_raw_sensor_logs_device_timestamp;

ALTER TABLE recommendation_logs DROP COLUMN device_id;
ALTER TABLE recommendation_logs RENAME COLUMN new_device_id TO device_id;
ALTER TABLE recommendation_logs ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE notifications DROP COLUMN device_id;
ALTER TABLE notifications RENAME COLUMN new_device_id TO device_id;
ALTER TABLE notifications ALTER COLUMN device_id SET NOT NULL;

ALTER TABLE raw_sensor_logs DROP COLUMN device_id;
ALTER TABLE raw_sensor_logs RENAME COLUMN new_device_id TO device_id;
ALTER TABLE raw_sensor_logs ALTER COLUMN device_id SET NOT NULL;

-- 4. devices: ganti primary key ke UUID.
ALTER TABLE devices DROP CONSTRAINT devices_pkey;
ALTER TABLE devices DROP COLUMN id;
ALTER TABLE devices RENAME COLUMN new_id TO id;
ALTER TABLE devices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX devices_device_code_key ON devices (device_code);

-- 5. Pasang kembali FK dan index.
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
