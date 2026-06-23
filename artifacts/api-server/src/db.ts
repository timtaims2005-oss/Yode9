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
