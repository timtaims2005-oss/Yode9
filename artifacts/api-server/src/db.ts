import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
});

export async function ensureAuthTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cloud_chats (
        device_id VARCHAR NOT NULL PRIMARY KEY,
        chats_json JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn("ensureAuthTables warning:", err instanceof Error ? err.message : err);
  }
}
