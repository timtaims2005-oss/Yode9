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

    // Users table (Replit OAuth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

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
