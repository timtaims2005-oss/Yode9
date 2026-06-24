import { Pool } from "pg";
import { logger } from "./lib/logger";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
});

/**
 * Initialize all required database tables on startup.
 * Safe to run multiple times — uses IF NOT EXISTS.
 *
 * NOTE: The schema uses PostgreSQL-compatible syntax (SERIAL, TIMESTAMP WITH TIMEZONE, JSONB).
 * The platform's MySQL-compatible layer accepts these. If migrations fail on your
 * specific DB, convert SERIAL -> AUTO_INCREMENT, JSONB -> JSON, etc.
 */
export async function ensureAuthTables() {
  try {
    // Sessions table (used by connect-pg-simple)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`).catch(() => {});

    // Users table (full schema with auth fields)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE,
        username VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        password_hash VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'user',
        profile_image_url VARCHAR,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        totp_secret VARCHAR,
        totp_enabled BOOLEAN NOT NULL DEFAULT false,
        tokens_used BIGINT NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    // Add missing columns to existing users table (safe migrations)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR UNIQUE`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user'`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tokens_used BIGINT NOT NULL DEFAULT 0`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`).catch(() => {});

    // Cloud chats (per-device storage, gated by internalAuth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cloud_chats (
        device_id VARCHAR NOT NULL PRIMARY KEY,
        chats_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Subscriptions (server-side verification)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR NOT NULL UNIQUE,
        tier VARCHAR NOT NULL DEFAULT 'free',
        activated_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        tokens_used BIGINT NOT NULL DEFAULT 0,
        activation_code_hash VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "subscriptions table may already exist"));

    // Audit logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR,
        action VARCHAR NOT NULL,
        metadata JSONB,
        ip VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "audit_logs table may already exist"));

    // API keys (encrypted hash storage)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR NOT NULL,
        provider VARCHAR NOT NULL,
        key_hash VARCHAR NOT NULL,
        label VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "api_keys table may already exist"));

    // Conversations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {});

    // Messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {});

    // Security events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
        email VARCHAR,
        event_type VARCHAR NOT NULL,
        success BOOLEAN NOT NULL DEFAULT false,
        ip_address VARCHAR,
        user_agent TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "security_events table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sec_events_user_id ON security_events (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sec_events_type ON security_events (event_type)`).catch(() => {});

    // User sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        session_token VARCHAR NOT NULL UNIQUE,
        device_name VARCHAR DEFAULT 'Unknown Device',
        device_type VARCHAR DEFAULT 'browser',
        browser VARCHAR DEFAULT 'Unknown',
        os VARCHAR DEFAULT 'Unknown',
        ip_address VARCHAR,
        location VARCHAR,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "user_sessions table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at)`).catch(() => {});

    // Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        title VARCHAR NOT NULL,
        body TEXT NOT NULL,
        data JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "notifications table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`).catch(() => {});

    // Usage stats (per-request token tracking for analytics)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_stats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        model TEXT NOT NULL DEFAULT 'unknown',
        tokens_used INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        endpoint TEXT NOT NULL DEFAULT '/api/chat',
        status TEXT NOT NULL DEFAULT 'success',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats (created_at)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_stats_model ON usage_stats (model)`).catch(() => {});

    // Safe migration: add status column to users if missing
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active'`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE`).catch(() => {});

    // Context rules (user-defined system context)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS context_rules (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR NOT NULL DEFAULT 'system',
        priority INTEGER NOT NULL DEFAULT 5,
        active BOOLEAN NOT NULL DEFAULT true,
        triggers JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "context_rules table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_context_rules_user_id ON context_rules (user_id)`).catch(() => {});

    // User subscriptions (server-side, user-linked)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR NOT NULL DEFAULT 'free',
        billing_cycle VARCHAR NOT NULL DEFAULT 'monthly',
        price_usd NUMERIC(10,2),
        status VARCHAR NOT NULL DEFAULT 'active',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ends_at TIMESTAMP WITH TIME ZONE,
        canceled_at TIMESTAMP WITH TIME ZONE,
        trial_ends_at TIMESTAMP WITH TIME ZONE,
        stripe_customer_id VARCHAR,
        stripe_subscription_id VARCHAR,
        stripe_price_id VARCHAR,
        stripe_product_id VARCHAR,
        limits JSONB DEFAULT '{}'::jsonb,
        usage_reset_at TIMESTAMP WITH TIME ZONE,
        messages_used INTEGER NOT NULL DEFAULT 0,
        agent_runs_used INTEGER NOT NULL DEFAULT 0,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        cancel_reason VARCHAR,
        is_auto_renew BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "user_subscriptions table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usub_user_id ON user_subscriptions (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_usub_status ON user_subscriptions (status)`).catch(() => {});

    // Agent runs (tracking autonomous agent executions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        agent_type VARCHAR NOT NULL,
        agent_name VARCHAR NOT NULL,
        agent_version VARCHAR,
        status VARCHAR NOT NULL DEFAULT 'pending',
        task TEXT NOT NULL,
        result JSONB DEFAULT '{}'::jsonb,
        tools_used JSONB DEFAULT '[]'::jsonb,
        iterations INTEGER NOT NULL DEFAULT 0,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd NUMERIC(10,6),
        error_message TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "agent_runs table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs (status)`).catch(() => {});

    // API usage tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        provider VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        endpoint VARCHAR NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd NUMERIC(10,6),
        response_ms INTEGER,
        status_code INTEGER,
        error VARCHAR,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "api_usage table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage (user_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage (created_at)`).catch(() => {});

    // Teams
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        slug VARCHAR UNIQUE,
        owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR NOT NULL DEFAULT 'starter',
        max_members INTEGER NOT NULL DEFAULT 5,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "teams table may already exist"));

    // Knowledge base
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        team_id UUID,
        title VARCHAR NOT NULL,
        content TEXT NOT NULL,
        source_url VARCHAR,
        source_type VARCHAR NOT NULL DEFAULT 'manual',
        tags JSONB DEFAULT '[]'::jsonb,
        embedding_model VARCHAR,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "knowledge_base table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_user_id ON knowledge_base (user_id)`).catch(() => {});

    // Reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR NOT NULL,
        type VARCHAR NOT NULL DEFAULT 'pentest',
        status VARCHAR NOT NULL DEFAULT 'draft',
        target VARCHAR,
        content JSONB DEFAULT '{}'::jsonb,
        summary TEXT,
        severity VARCHAR DEFAULT 'medium',
        findings INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "reports table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports (user_id)`).catch(() => {});

    // Webhooks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        events JSONB NOT NULL DEFAULT '[]'::jsonb,
        secret VARCHAR,
        is_active BOOLEAN NOT NULL DEFAULT true,
        failure_count INTEGER NOT NULL DEFAULT 0,
        last_triggered_at TIMESTAMP WITH TIME ZONE,
        last_error TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `).catch((err) => logger.warn({ err }, "webhooks table may already exist"));
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks (user_id)`).catch(() => {});

    logger.info("Database tables ensured.");
  } catch (err) {
    // Don't crash the server if the database isn't ready yet —
    // it will retry on the next startup. Log and continue.
    logger.warn(
      { err },
      "ensureAuthTables failed — database may not be ready yet. Will retry on next startup.",
    );
  }
}
export async function getUserByEmail(email: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createUser(data: {
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  profile_image_url?: string;
  email_verified?: boolean;
}) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, username, role, profile_image_url, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.email.toLowerCase(),
      data.password_hash ?? null,
      data.first_name ?? null,
      data.last_name ?? null,
      data.username ?? null,
      data.role ?? "user",
      data.profile_image_url ?? null,
      data.email_verified ?? false,
    ],
  );
  return rows[0];
}

export async function updateUserTokens(userId: string, tokensUsed: number) {
  await pool.query(
    "UPDATE users SET tokens_used = tokens_used + $1, updated_at = NOW() WHERE id = $2",
    [tokensUsed, userId],
  );
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  notifData?: Record<string, unknown>;
}) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.userId, data.type, data.title, data.body, JSON.stringify(data.notifData ?? {})],
  );
  return rows[0];
}

// ── Security event logging ────────────────────────────────────────────────────
export async function logSecurityEvent(data: {
  userId?: string;
  email?: string;
  eventType: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, email, event_type, success, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId ?? null,
        data.email ?? null,
        data.eventType,
        data.success,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        JSON.stringify(data.details ?? {}),
      ],
    );
  } catch { /* non-fatal */ }
}

// ── Session management ────────────────────────────────────────────────────────
export async function createUserSession(data: {
  userId: string;
  sessionToken: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  expiresAt: Date;
}) {
  try {
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, device_name, device_type, browser, os, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (session_token) DO UPDATE SET last_active_at = NOW()`,
      [
        data.userId, data.sessionToken,
        data.deviceName ?? "Unknown Device", data.deviceType ?? "browser",
        data.browser ?? "Unknown", data.os ?? "Unknown",
        data.ipAddress ?? null, data.expiresAt,
      ],
    );
  } catch { /* non-fatal */ }
}

export async function revokeUserSession(sessionId: string, userId: string) {
  await pool.query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2", [sessionId, userId]);
}

export async function revokeAllUserSessions(userId: string, exceptToken?: string) {
  if (exceptToken) {
    await pool.query(
      "DELETE FROM user_sessions WHERE user_id = $1 AND session_token != $2",
      [userId, exceptToken],
    );
  } else {
    await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
  }
}

export async function getUserSessions(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, device_name, device_type, browser, os, ip_address, location,
            last_active_at, expires_at, created_at
     FROM user_sessions WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId],
  );
  return rows;
}
