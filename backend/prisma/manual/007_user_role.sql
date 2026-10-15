-- Menambahkan kolom users.role (enum user_role: USER | SUPERADMIN), default USER.
-- Semua user yang sudah ada otomatis menjadi USER.
-- Role SUPERADMIN HANYA diberikan manual lewat Supabase Dashboard (Table Editor / SQL Editor);
-- tidak ada kode aplikasi atau seed yang menulis kolom ini.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
BEGIN;

DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('USER', 'SUPERADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'USER';

COMMIT;
