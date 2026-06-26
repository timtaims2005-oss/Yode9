-- Migration 004: Add missing columns to users table
-- These columns are required by jwtAuth, security-monitor, quality-analyzer,
-- weekly-report, db.ts and other api-server modules.

-- role: user access level (user, moderator, admin, superadmin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'moderator', 'admin', 'superadmin'));

-- status: account lifecycle state
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- subscription: current plan name (mirrors tier but as a separate denormalized field)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription TEXT NOT NULL DEFAULT 'free';

-- tokens_used / tokens_limit: usage counters (denormalized from subscriptions table for fast auth checks)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_used  BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_limit BIGINT NOT NULL DEFAULT 1000000;

-- first_name / last_name: separate name fields (in addition to display_name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- profile_image_url: alias for avatar_url used in db.ts INSERT statements
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS users_role_idx   ON users(role);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

-- Record migration
INSERT INTO schema_migrations (version, name) VALUES (4, '004_add_missing_user_columns')
  ON CONFLICT (version) DO NOTHING;
