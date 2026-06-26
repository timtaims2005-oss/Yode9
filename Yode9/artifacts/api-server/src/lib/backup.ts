/**
 * PostgreSQL Backup Scheduler
 * ────────────────────────────
 * Automated pg_dump backups on a configurable schedule.
 *
 * Config:
 *  BACKUP_DIR       — directory for backup files (default: ./backups)
 *  BACKUP_KEEP_DAYS — how many days to retain backups (default: 30)
 *  BACKUP_SCHEDULE  — cron-like: "daily" | "weekly" | "hourly" (default: daily)
 *
 * Backup format: SQL dump compressed with gzip → .sql.gz
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const BACKUP_KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS ?? "30", 10);
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE ?? "daily";

// ── Single backup run ─────────────────────────────────────────────────────────
export async function runBackup(): Promise<{ success: boolean; file?: string; error?: string }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return { success: false, error: "DATABASE_URL not set" };
  }

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  logger.info({ filepath }, "[backup] Starting PostgreSQL backup");

  try {
    // Use pg_dump with gzip compression
    await execAsync(
      `pg_dump --no-password "${dbUrl}" | gzip > "${filepath}"`,
      { timeout: 5 * 60 * 1000 }, // 5 minute timeout
    );

    const stats = fs.statSync(filepath);
    logger.info({ filepath, size: stats.size }, "[backup] Backup completed");

    // Cleanup old backups
    await cleanupOldBackups();

    return { success: true, file: filepath };
  } catch (err) {
    logger.error({ err }, "[backup] Backup failed");
    // Remove incomplete file
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return { success: false, error: String(err) };
  }
}

async function cleanupOldBackups(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR);

  let deleted = 0;
  for (const file of files) {
    if (!file.endsWith(".sql.gz") && !file.endsWith(".sql")) continue;
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.info({ deleted, keepDays: BACKUP_KEEP_DAYS }, "[backup] Old backups cleaned up");
  }
}

// ── List backups ──────────────────────────────────────────────────────────────
export function listBackups(): Array<{ name: string; size: number; createdAt: Date }> {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sql.gz") || f.endsWith(".sql"))
    .map((file) => {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      return { name: file, size: stats.size, createdAt: stats.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
export function startBackupScheduler(): void {
  // Check if pg_dump is available
  exec("which pg_dump", (err) => {
    if (err) {
      logger.warn("[backup] pg_dump not found — backup scheduler disabled. Install postgresql-client to enable.");
      return;
    }

    const intervals: Record<string, number> = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
    };

    const interval = intervals[BACKUP_SCHEDULE] ?? intervals.daily;

    logger.info({ schedule: BACKUP_SCHEDULE, intervalMs: interval }, "[backup] Backup scheduler started");

    // Run immediately on startup, then on schedule
    setTimeout(async () => {
      await runBackup();
    }, 30_000); // 30s delay after startup

    setInterval(async () => {
      await runBackup();
    }, interval);
  });
}
