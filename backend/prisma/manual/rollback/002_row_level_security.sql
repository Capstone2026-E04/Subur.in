BEGIN;

DO $$
DECLARE
  part RECORD;
BEGIN
  FOR part IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.relname = 'raw_sensor_logs'
      AND p.relnamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', part.schema_name, part.table_name);
  END LOOP;
END $$;

ALTER TABLE "raw_sensor_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendation_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "plants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;

COMMIT;
