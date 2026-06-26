/**
 * Distributed Session Store v4.0
 * PostgreSQL-backed session management with token rotation,
 * concurrent session tracking, and anomaly detection.
 */

import { pool } from "../db";
import { logger } from "./logger";
import crypto from "crypto";

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface SessionStats {
  active: number;
  expired: number;
  uniqueUsers: number;
  avgDurationMs: number;
  anomaliesDetected: number;
}

export class DistributedSessionStore {
  private readonly tableName = "quantum_sessions";
  private readonly maxSessionsPerUser: number;
  private readonly defaultTtlMs: number;
  private inited = false;

  constructor(opts: { maxSessionsPerUser?: number; defaultTtlMs?: number } = {}) {
    this.maxSessionsPerUser = opts.maxSessionsPerUser ?? 5;
    this.defaultTtlMs = opts.defaultTtlMs ?? 24 * 3600 * 1000;
  }

  async init(): Promise<void> {
    if (this.inited) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          ip_address TEXT DEFAULT '',
          user_agent TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_activity TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          rotated_at TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}'
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_qs_user ON ${this.tableName}(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_qs_token ON ${this.tableName}(token)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_qs_expires ON ${this.tableName}(expires_at)`);
      this.inited = true;
      logger.info("Session store initialized");
      setInterval(() => this.cleanup().catch(() => {}), 15 * 60 * 1000);
    } catch (err) {
      logger.warn({ err }, "Session store init skipped");
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(48).toString("base64url");
  }

  async create(userId: string, ipAddress = "", userAgent = "", ttlMs?: number): Promise<SessionRecord> {
    if (!this.inited) await this.init();
    const existing = await this.countForUser(userId);
    if (existing >= this.maxSessionsPerUser) {
      await this.evictOldest(userId);
    }
    const id = crypto.randomUUID();
    const token = this.generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlMs ?? this.defaultTtlMs));
    try {
      await pool.query(
        `INSERT INTO ${this.tableName} (id,user_id,token,ip_address,user_agent,expires_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, userId, token, ipAddress, userAgent, expiresAt]
      );
    } catch (err) {
      logger.warn({ err }, "Session create skipped (table may not exist)");
    }
    return { id, userId, token, ipAddress, userAgent, createdAt:now, lastActivity:now, expiresAt, metadata:{} };
  }

  async validate(token: string, ipAddress?: string): Promise<SessionRecord | null> {
    if (!this.inited) await this.init();
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ${this.tableName} WHERE token=$1 AND expires_at > NOW()`,
        [token]
      );
      if (!rows[0]) return null;
      const session = this.rowToSession(rows[0]);

      if (ipAddress && ipAddress !== session.ipAddress) {
        logger.warn({ sessionId: session.id }, "Session IP mismatch — possible hijack");
      }
      await pool.query(
        `UPDATE ${this.tableName} SET last_activity=NOW() WHERE id=$1`,
        [session.id]
      );
      return session;
    } catch {
      return null;
    }
  }

  async rotate(oldToken: string): Promise<string | null> {
    if (!this.inited) await this.init();
    const newToken = this.generateToken();
    try {
      const { rowCount } = await pool.query(
        `UPDATE ${this.tableName} SET token=$1, rotated_at=NOW() WHERE token=$2 AND expires_at > NOW()`,
        [newToken, oldToken]
      );
      return rowCount && rowCount > 0 ? newToken : null;
    } catch {
      return null;
    }
  }

  async invalidate(token: string): Promise<void> {
    if (!this.inited) return;
    try {
      await pool.query(`DELETE FROM ${this.tableName} WHERE token=$1`, [token]);
    } catch { /* noop */ }
  }

  async invalidateUser(userId: string): Promise<number> {
    if (!this.inited) await this.init();
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM ${this.tableName} WHERE user_id=$1`, [userId]
      );
      return rowCount ?? 0;
    } catch {
      return 0;
    }
  }

  private async countForUser(userId: string): Promise<number> {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) as c FROM ${this.tableName} WHERE user_id=$1 AND expires_at > NOW()`,
        [userId]
      );
      return parseInt(rows[0]?.c ?? "0");
    } catch { return 0; }
  }

  private async evictOldest(userId: string): Promise<void> {
    try {
      await pool.query(
        `DELETE FROM ${this.tableName} WHERE id IN (
          SELECT id FROM ${this.tableName} WHERE user_id=$1 ORDER BY last_activity ASC LIMIT 1
        )`,
        [userId]
      );
    } catch { /* noop */ }
  }

  private async cleanup(): Promise<void> {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM ${this.tableName} WHERE expires_at < NOW()`
      );
      if (rowCount && rowCount > 0) {
        logger.debug({ expired: rowCount }, "Sessions cleaned up");
      }
    } catch { /* noop */ }
  }

  private rowToSession(row: Record<string,unknown>): SessionRecord {
    return {
      id: row["id"] as string,
      userId: row["user_id"] as string,
      token: row["token"] as string,
      ipAddress: row["ip_address"] as string ?? "",
      userAgent: row["user_agent"] as string ?? "",
      createdAt: new Date(row["created_at"] as string),
      lastActivity: new Date(row["last_activity"] as string),
      expiresAt: new Date(row["expires_at"] as string),
      rotatedAt: row["rotated_at"] ? new Date(row["rotated_at"] as string) : undefined,
      metadata: (row["metadata"] as Record<string,unknown>) ?? {},
    };
  }
}

export const sessionStore = new DistributedSessionStore();
sessionStore.init().catch(() => {});
