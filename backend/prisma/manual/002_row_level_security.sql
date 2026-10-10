BEGIN;

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recommendation_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "raw_sensor_logs" ENABLE ROW LEVEL SECURITY;

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
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', part.schema_name, part.table_name);
  END LOOP;
END $$;

COMMIT;
