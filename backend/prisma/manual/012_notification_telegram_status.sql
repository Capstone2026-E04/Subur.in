-- Status pengiriman notifikasi ke Telegram: skipped (user tidak menautkan/menonaktifkan), sent, failed.
-- Baris lama diisi 'skipped' karena riwayat pengiriman sebelumnya tidak tercatat.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru
-- (atau gunakan `prisma db push`, hasilnya sama).
BEGIN;

DO $$ BEGIN
  CREATE TYPE "telegram_delivery_status" AS ENUM ('skipped', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "telegram_status" "telegram_delivery_status" NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS "telegram_error" varchar(255);

COMMIT;
