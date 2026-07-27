import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pool } from "../../db.js";
import { logger } from "../../lib/logger.js";
import type { AgenticStreamEvent, AgenticJob } from "../../gateway/agentic-stream.js";

const localDataDir = resolve(process.env.LOCAL_DATA_DIR ?? "./data");
let databaseReady = false;
let databaseUnavailable = false;
let writeChain = Promise.resolve();

async function ensureDatabase(): Promise<boolean> {
  if (databaseReady) return true;
  if (databaseUnavailable || !process.env.DATABASE_URL) return false;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agentic_jobs (
        id VARCHAR PRIMARY KEY,
        request JSONB NOT NULL,
        status VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agentic_telemetry_events (
        id VARCHAR PRIMARY KEY,
        job_id VARCHAR NOT NULL REFERENCES agentic_jobs(id) ON DELETE CASCADE,
        event_type VARCHAR NOT NULL,
        event_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agentic_events_job_id
      ON agentic_telemetry_events (job_id, created_at)
    `);
    databaseReady = true;
    return true;
  } catch (error) {
    databaseUnavailable = true;
    logger.warn({ err: error }, "[agentic-persistence] PostgreSQL unavailable; using local file fallback");
    return false;
  }
}

async function appendLocal(fileName: string, value: unknown): Promise<void> {
  const filePath = resolve(localDataDir, fileName);
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writeChain.then(operation);
  writeChain = next.catch(() => undefined);
  return next;
}

export async function persistAgenticJob(job: AgenticJob): Promise<void> {
  await enqueueWrite(async () => {
    if (await ensureDatabase()) {
      await pool.query(
        `INSERT INTO agentic_jobs (id, request, status, created_at, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at`,
        [job.id, job.request, job.status, job.createdAt, job.completedAt ?? null],
      );
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      await appendLocal("agentic-jobs.jsonl", job);
    }
  });
}

export async function persistAgenticEvent(event: AgenticStreamEvent): Promise<void> {
  await enqueueWrite(async () => {
    if (await ensureDatabase()) {
      await pool.query(
        `INSERT INTO agentic_telemetry_events (id, job_id, event_type, event_data, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [event.id, event.jobId, event.type, event.data, event.timestamp],
      );
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      await appendLocal("agentic-telemetry.jsonl", event);
    }
  });
}

export function getAgenticPersistenceStatus(): {
  mode: "postgresql" | "local-file" | "unavailable";
  databaseConfigured: boolean;
} {
  return {
    mode: databaseReady
      ? "postgresql"
      : databaseUnavailable || !process.env.DATABASE_URL
        ? process.env.NODE_ENV === "production" ? "unavailable" : "local-file"
        : "postgresql",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  };
}

export async function awaitAgenticPersistenceReady(): Promise<void> {
  await ensureDatabase();
}

void persistAgenticJob;
void persistAgenticEvent;
void awaitAgenticPersistenceReady;
void getAgenticPersistenceStatus;