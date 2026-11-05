-- Alasan rekomendasi darurat: sensor_out_of_range | dry_critical | wet_surge.
-- NULL = rekomendasi biasa (siklus 4 jam).
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru
-- (atau gunakan `prisma db push`, hasilnya sama).
BEGIN;

ALTER TABLE "recommendation_logs"
  ADD COLUMN IF NOT EXISTS "emergency_reason" varchar(30);

COMMIT;
