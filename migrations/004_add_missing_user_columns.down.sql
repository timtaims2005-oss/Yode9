-- Rollback: remove columns added in 004
DROP INDEX IF EXISTS users_role_idx;
DROP INDEX IF EXISTS users_status_idx;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription;
ALTER TABLE users DROP COLUMN IF EXISTS tokens_used;
ALTER TABLE users DROP COLUMN IF EXISTS tokens_limit;
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;
ALTER TABLE users DROP COLUMN IF EXISTS profile_image_url;

DELETE FROM schema_migrations WHERE version = 4;
