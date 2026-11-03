BEGIN;

LOCK TABLE recommendation_logs IN ACCESS EXCLUSIVE MODE;

ALTER TABLE recommendation_logs DROP CONSTRAINT recommendation_logs_pkey;
ALTER TABLE recommendation_logs RENAME COLUMN id TO old_id;
ALTER TABLE recommendation_logs ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE recommendation_logs ADD PRIMARY KEY (id);
ALTER TABLE recommendation_logs DROP COLUMN old_id;

COMMIT;
