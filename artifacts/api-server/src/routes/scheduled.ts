/**
 * Scheduled Tasks — Automated recurring AI executions
 *
 * POST   /api/scheduled          — Create task
 * GET    /api/scheduled          — List tasks
 * GET    /api/scheduled/:id      — Get task + history
 * PUT    /api/scheduled/:id      — Update task
 * DELETE /api/scheduled/:id      — Delete task
 * POST   /api/scheduled/:id/run  — Run now (manual trigger)
 * POST   /api/scheduled/:id/toggle — Enable/Disable
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { callOnce } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router = Router();

// ── Table setup ───────────────────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      description  TEXT DEFAULT '',
      prompt       TEXT NOT NULL,
      model        TEXT DEFAULT 'gpt-4o',
      cron_expr    TEXT NOT NULL DEFAULT '0 9 * * *',
      timezone     TEXT DEFAULT 'UTC',
      is_enabled   BOOLEAN DEFAULT true,
      last_run_at  TIMESTAMPTZ,
      next_run_at  TIMESTAMPTZ,
      run_count    INTEGER DEFAULT 0,
      error_count  INTEGER DEFAULT 0,
      webhook_url  TEXT DEFAULT '',
      output_format TEXT DEFAULT 'text',
      tags         TEXT[] DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_runs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id     UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
      started_at  TIMESTAMPTZ DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status      TEXT DEFAULT 'running',
      output      TEXT DEFAULT '',
      error       TEXT DEFAULT '',
      tokens_used INTEGER DEFAULT 0
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_owner ON scheduled_tasks(owner_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_enabled ON scheduled_tasks(is_enabled, next_run_at) WHERE is_enabled = true`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_runs_task ON scheduled_runs(task_id, started_at DESC)`);
}

let tablesReady = false;
async function ready() {
  if (!tablesReady) { await ensureTables(); tablesReady = true; }
}

// ── Compute next run time from cron expression (simplified) ───────────────────
function computeNextRun(cronExpr: string): Date {
  const now = new Date();
  const parts = cronExpr.split(" ");
  if (parts.length < 5) return new Date(now.getTime() + 60_000);

  const [min, hour] = parts;
  const next = new Date(now);
  next.setSeconds(0, 0);

  if (min !== "*" && hour !== "*") {
    const m = parseInt(min), h = parseInt(hour);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (hour !== "*") {
    const h = parseInt(hour);
    next.setHours(h, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    const m = parseInt(min) || 0;
    next.setMinutes(m + 1, 0, 0);
    if (next <= now) next.setTime(now.getTime() + 60_000);
  }

  return next;
}

// ── Run a task ────────────────────────────────────────────────────────────────
async function runTask(taskId: string): Promise<{ output: string; tokens: number; error?: string }> {
  const { rows } = await pool.query("SELECT * FROM scheduled_tasks WHERE id=$1", [taskId]);
  if (!rows[0]) throw new Error("Task not found");
  const task = rows[0] as { prompt: string; model: string; name: string };

  const { rows: runRows } = await pool.query(
    "INSERT INTO scheduled_runs (task_id, status) VALUES ($1,'running') RETURNING id",
    [taskId]
  );
  const runId = runRows[0].id;

  try {
    const result = await callOnce([
      { role: "system", content: "You are an automated AI assistant executing a scheduled task. Be concise and actionable." },
      { role: "user", content: task.prompt },
    ], 2000);

    await pool.query(
      "UPDATE scheduled_runs SET status='done', output=$1, finished_at=NOW(), tokens_used=$2 WHERE id=$3",
      [result.slice(0, 10000), result.length / 4 | 0, runId]
    );
    await pool.query(
      "UPDATE scheduled_tasks SET run_count=run_count+1, last_run_at=NOW(), next_run_at=$1, updated_at=NOW() WHERE id=$2",
      [computeNextRun(rows[0].cron_expr), taskId]
    );

    return { output: result, tokens: result.length / 4 | 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await pool.query(
      "UPDATE scheduled_runs SET status='error', error=$1, finished_at=NOW() WHERE id=$2",
      [msg, runId]
    );
    await pool.query(
      "UPDATE scheduled_tasks SET error_count=error_count+1, last_run_at=NOW() WHERE id=$1",
      [taskId]
    );
    return { output: "", tokens: 0, error: msg };
  }
}

// ── Background runner — checks every minute ───────────────────────────────────
let runnerStarted = false;
function startRunner() {
  if (runnerStarted) return;
  runnerStarted = true;
  setInterval(async () => {
    try {
      await ready();
      const { rows } = await pool.query(
        "SELECT id FROM scheduled_tasks WHERE is_enabled=true AND next_run_at <= NOW() LIMIT 10"
      );
      for (const row of rows) {
        runTask(row.id).catch(e => logger.error({ e }, "[scheduler] run failed"));
      }
    } catch (e) {
      logger.error({ e }, "[scheduler] tick failed");
    }
  }, 60_000);
}
startRunner();

// ── POST /api/scheduled ───────────────────────────────────────────────────────
router.post("/scheduled", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const { name, description = "", prompt, model = "gpt-4o", cron_expr = "0 9 * * *",
    timezone = "UTC", webhook_url = "", output_format = "text", tags = [],
    owner_id = "anonymous" } = req.body as Record<string, unknown>;

  if (!name || !prompt) {
    res.status(400).json({ error: "name and prompt are required" });
    return;
  }

  try {
    const nextRun = computeNextRun(String(cron_expr));
    const { rows } = await pool.query(
      `INSERT INTO scheduled_tasks (owner_id, name, description, prompt, model, cron_expr, timezone, webhook_url, output_format, tags, next_run_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [String(owner_id), String(name).slice(0, 80), String(description).slice(0, 500),
       String(prompt).slice(0, 4000), String(model), String(cron_expr),
       String(timezone), String(webhook_url), String(output_format),
       Array.isArray(tags) ? tags : [], nextRun]
    );
    res.status(201).json({ ok: true, task: rows[0] });
  } catch (err) {
    logger.error({ err }, "[scheduled] create failed");
    res.status(500).json({ error: "Failed to create task" });
  }
});

// ── GET /api/scheduled ────────────────────────────────────────────────────────
router.get("/scheduled", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const owner_id = (req.query["owner_id"] as string) || "anonymous";
  const limit = Math.min(parseInt(req.query["limit"] as string) || 50, 100);
  const offset = parseInt(req.query["offset"] as string) || 0;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM scheduled_tasks WHERE owner_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [owner_id, limit, offset]
    );
    res.json({ ok: true, tasks: rows });
  } catch { res.status(500).json({ error: "Failed to list tasks" }); }
});

// ── GET /api/scheduled/:id ────────────────────────────────────────────────────
router.get("/scheduled/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    const { rows: task } = await pool.query("SELECT * FROM scheduled_tasks WHERE id=$1", [req.params["id"]]);
    if (!task[0]) { res.status(404).json({ error: "Not found" }); return; }
    const { rows: runs } = await pool.query(
      "SELECT * FROM scheduled_runs WHERE task_id=$1 ORDER BY started_at DESC LIMIT 20",
      [req.params["id"]]
    );
    res.json({ ok: true, task: task[0], runs });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── PUT /api/scheduled/:id ────────────────────────────────────────────────────
router.put("/scheduled/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const fields = req.body as Record<string, unknown>;
  const { name, description, prompt, model, cron_expr, timezone, webhook_url, output_format, tags } = fields;
  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const set = (col: string, val: unknown) => { updates.push(`${col}=$${i++}`); params.push(val); };
    if (name !== undefined)          set("name", String(name).slice(0, 80));
    if (description !== undefined)   set("description", String(description).slice(0, 500));
    if (prompt !== undefined)        set("prompt", String(prompt).slice(0, 4000));
    if (model !== undefined)         set("model", String(model));
    if (cron_expr !== undefined)     { set("cron_expr", String(cron_expr)); set("next_run_at", computeNextRun(String(cron_expr))); }
    if (timezone !== undefined)      set("timezone", String(timezone));
    if (webhook_url !== undefined)   set("webhook_url", String(webhook_url));
    if (output_format !== undefined) set("output_format", String(output_format));
    if (tags !== undefined)          set("tags", Array.isArray(tags) ? tags : []);
    set("updated_at", new Date().toISOString());
    params.push(req.params["id"]);
    await pool.query(`UPDATE scheduled_tasks SET ${updates.join(",")} WHERE id=$${i}`, params);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// ── DELETE /api/scheduled/:id ─────────────────────────────────────────────────
router.delete("/scheduled/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    await pool.query("DELETE FROM scheduled_tasks WHERE id=$1", [req.params["id"]]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── POST /api/scheduled/:id/run ───────────────────────────────────────────────
router.post("/scheduled/:id/run", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    const result = await runTask(req.params["id"]);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Run failed" });
  }
});

// ── POST /api/scheduled/:id/toggle ───────────────────────────────────────────
router.post("/scheduled/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    const { rows } = await pool.query(
      "UPDATE scheduled_tasks SET is_enabled = NOT is_enabled, updated_at=NOW() WHERE id=$1 RETURNING is_enabled",
      [req.params["id"]]
    );
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true, is_enabled: rows[0].is_enabled });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
