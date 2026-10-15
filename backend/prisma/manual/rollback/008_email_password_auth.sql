-- Akan GAGAL jika masih ada user tanpa google_id (akun email/password).
-- Hapus atau lengkapi google_id user tersebut terlebih dahulu.
BEGIN;

ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "users" ALTER COLUMN "google_id" SET NOT NULL;

COMMIT;
