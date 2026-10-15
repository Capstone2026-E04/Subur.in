-- Autentikasi email + password:
-- 1. users.google_id menjadi nullable (akun yang dibuat lewat email/password belum punya Google ID).
-- 2. users.password_hash (hash scrypt; NULL untuk akun yang hanya memakai Google).
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru.
BEGIN;

ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

COMMIT;
