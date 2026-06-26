/**
 * Feature Flags System
 * ─────────────────────
 * Controls enabling/disabling features without code deployment.
 *
 * Sources (in order of precedence):
 *  1. Database (dynamic, hot-reload)
 *  2. Environment variables (FEATURE_* = true/false)
 *  3. Defaults (hardcoded)
 *
 * Usage:
 *   isEnabled("marketplace")           // → boolean
 *   getFlag("council_mode")            // → FeatureFlag object
 *   setFlag("marketplace", false)      // → update DB
 */

import { pool } from "../db.js";
import { logger } from "./logger.js";

export type FlagName =
  | "council_mode"
  | "fusion_mode"
  | "marketplace"
  | "teams"
  | "knowledge_base"
  | "webhooks"
  | "api_keys"
  | "pentest_lab"
  | "vector_search"
  | "file_uploads"
  | "oauth_google"
  | "oauth_github"
  | "email_verification"
  | "two_factor_auth"
  | "rate_limit_redis"
  | "sentry"
  | "backup_scheduler"
  | "debug_sql"
  | "mock_ai_responses"
  | "seed_database";

export interface FeatureFlag {
  name: FlagName;
  enabled: boolean;
  description: string;
  updatedAt?: Date;
  updatedBy?: string;
}

// Default values (overridden by env vars or DB)
const DEFAULTS: Record<FlagName, { enabled: boolean; description: string }> = {
  council_mode:       { enabled: true,  description: "Multi-AI council mode with multiple champion brains" },
  fusion_mode:        { enabled: true,  description: "AI fusion mode combining multiple providers" },
  marketplace:        { enabled: true,  description: "Plugin marketplace and extensions" },
  teams:              { enabled: true,  description: "Team collaboration features" },
  knowledge_base:     { enabled: true,  description: "Knowledge base with FAISS/vector search" },
  webhooks:           { enabled: true,  description: "Outbound webhooks for event notifications" },
  api_keys:           { enabled: true,  description: "User API key management" },
  pentest_lab:        { enabled: true,  description: "PentestLab Pro cybersecurity platform" },
  vector_search:      { enabled: true,  description: "pgvector semantic search and RAG" },
  file_uploads:       { enabled: true,  description: "File upload and storage (S3/local)" },
  oauth_google:       { enabled: false, description: "Google OAuth login" },
  oauth_github:       { enabled: false, description: "GitHub OAuth login" },
  email_verification: { enabled: false, description: "Email verification on registration" },
  two_factor_auth:    { enabled: true,  description: "TOTP two-factor authentication" },
  rate_limit_redis:   { enabled: false, description: "Redis-backed rate limiting" },
  sentry:             { enabled: false, description: "Sentry error tracking" },
  backup_scheduler:   { enabled: false, description: "Automated PostgreSQL backup scheduler" },
  debug_sql:          { enabled: false, description: "SQL query debug logging" },
  mock_ai_responses:  { enabled: false, description: "Mock AI responses (testing only)" },
  seed_database:      { enabled: false, description: "Seed database with test data" },
};

// In-memory cache with TTL
const _cache = new Map<FlagName, { value: boolean; expires: number }>();
const CACHE_TTL = 60_000; // 1 minute

// ── DB Setup ──────────────────────────────────────────────────────────────────
async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      name VARCHAR PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by VARCHAR
    )
  `).catch(() => {});
}

// ── Read flag ─────────────────────────────────────────────────────────────────
export async function isEnabled(name: FlagName): Promise<boolean> {
  // Check in-memory cache
  const cached = _cache.get(name);
  if (cached && cached.expires > Date.now()) return cached.value;

  // Check env var (FEATURE_COUNCIL_MODE=true)
  const envKey = `FEATURE_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    const val = envVal === "true" || envVal === "1";
    _cache.set(name, { value: val, expires: Date.now() + CACHE_TTL });
    return val;
  }

  // Check DB
  try {
    await ensureTable();
    const { rows } = await pool.query(
      "SELECT enabled FROM feature_flags WHERE name = $1",
      [name],
    );
    if (rows[0]) {
      const val = rows[0].enabled as boolean;
      _cache.set(name, { value: val, expires: Date.now() + CACHE_TTL });
      return val;
    }
  } catch {
    // DB not available — use defaults
  }

  // Use default
  const def = DEFAULTS[name]?.enabled ?? false;
  _cache.set(name, { value: def, expires: Date.now() + CACHE_TTL });
  return def;
}

/** Synchronous check using env vars only (for startup code) */
export function isEnabledSync(name: FlagName): boolean {
  const envKey = `FEATURE_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) return envVal === "true" || envVal === "1";
  return DEFAULTS[name]?.enabled ?? false;
}

// ── Write flag ────────────────────────────────────────────────────────────────
export async function setFlag(name: FlagName, enabled: boolean, updatedBy?: string): Promise<void> {
  await ensureTable();
  const desc = DEFAULTS[name]?.description ?? "";
  await pool.query(
    `INSERT INTO feature_flags (name, enabled, description, updated_at, updated_by)
     VALUES ($1, $2, $3, NOW(), $4)
     ON CONFLICT (name) DO UPDATE SET enabled=$2, updated_at=NOW(), updated_by=$4`,
    [name, enabled, desc, updatedBy ?? null],
  );
  // Invalidate cache
  _cache.delete(name);
  logger.info({ name, enabled, updatedBy }, "[feature-flags] Flag updated");
}

// ── List all flags ────────────────────────────────────────────────────────────
export async function listFlags(): Promise<FeatureFlag[]> {
  await ensureTable();

  // Get DB overrides
  const { rows } = await pool.query(
    "SELECT name, enabled, description, updated_at, updated_by FROM feature_flags",
  ).catch(() => ({ rows: [] as { name: string; enabled: boolean; description: string; updated_at: Date; updated_by: string }[] }));

  const dbMap = new Map(rows.map((r) => [r.name, r]));

  return (Object.keys(DEFAULTS) as FlagName[]).map((name) => {
    const envKey = `FEATURE_${name.toUpperCase()}`;
    const envVal = process.env[envKey];
    const dbRow = dbMap.get(name);

    let enabled: boolean;
    if (envVal !== undefined) {
      enabled = envVal === "true" || envVal === "1";
    } else if (dbRow) {
      enabled = dbRow.enabled;
    } else {
      enabled = DEFAULTS[name].enabled;
    }

    return {
      name,
      enabled,
      description: dbRow?.description ?? DEFAULTS[name].description,
      updatedAt: dbRow?.updated_at,
      updatedBy: dbRow?.updated_by,
    };
  });
}

/** Seed all default flags to DB if not present */
export async function seedDefaultFlags(): Promise<void> {
  try {
    await ensureTable();
    const flags = Object.entries(DEFAULTS) as Array<[FlagName, { enabled: boolean; description: string }]>;
    for (const [name, def] of flags) {
      await pool.query(
        `INSERT INTO feature_flags (name, enabled, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, def.enabled, def.description],
      );
    }
    logger.info("[feature-flags] Default flags seeded");
  } catch (err) {
    logger.warn({ err }, "[feature-flags] Failed to seed flags");
  }
}
