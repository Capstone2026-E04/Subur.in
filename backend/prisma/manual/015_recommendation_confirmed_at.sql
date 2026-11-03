-- Waktu user mengonfirmasi bahwa rekomendasi sudah dilaksanakan (dashboard atau Telegram).
-- NULL = belum dikonfirmasi.
--
-- JALANKAN MANUAL di Supabase SQL Editor SEBELUM deploy backend versi baru
-- (atau gunakan `prisma db push`, hasilnya sama).
BEGIN;

ALTER TABLE "recommendation_logs"
  ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz;

COMMIT;
