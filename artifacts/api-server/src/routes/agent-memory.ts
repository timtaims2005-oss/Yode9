/**
 * Agent Memory System — Persistent Long-Term Memory for Swarm & Autonomous Agents
 * Stores successful solutions, error patterns, and evolution insights across sessions.
 * Device-scoped (no user auth required) — agents accumulate knowledge over time.
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { callOnce } from "../lib/ai-providers";

const router = Router();

// ── Ensure agent memory tables ────────────────────────────────────────────────
async function ensureAgentMemoryTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id VARCHAR,
        type VARCHAR NOT NULL DEFAULT 'solution',
        goal TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        tags JSONB DEFAULT '[]'::jsonb,
        agent VARCHAR DEFAULT 'swarm',
        model VARCHAR,
        success BOOLEAN NOT NULL DEFAULT true,
        importance INTEGER NOT NULL DEFAULT 5,
        use_count INTEGER NOT NULL DEFAULT 0,
        iteration INTEGER DEFAULT 1,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory (type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_memory_success ON agent_memory (success)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_memory_device ON agent_memory (device_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_evolution_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID,
        insight TEXT NOT NULL,
        agent VARCHAR NOT NULL,
        iteration INTEGER NOT NULL DEFAULT 1,
        model VARCHAR,
        impact_score INTEGER DEFAULT 5,
        applied_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_evo_insights_agent ON agent_evolution_insights (agent)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_error_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pattern TEXT NOT NULL,
        solution TEXT,
        model VARCHAR,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        last_seen TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch { /* non-fatal */ }
}
ensureAgentMemoryTables().catch(() => {});

// ── GET /api/agent-memory — list agent memories ───────────────────────────────
router.get("/agent-memory", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string) || 30, 100);
    const offset = parseInt(req.query["offset"] as string) || 0;
    const type = req.query["type"] as string;
    const success = req.query["success"];
    const agent = req.query["agent"] as string;

    let sql = `SELECT id, type, goal, summary, tags, agent, model, success, importance, use_count, iteration, created_at
               FROM agent_memory WHERE 1=1`;
    const params: unknown[] = [];
    let i = 1;

    if (type) { sql += ` AND type=$${i++}`; params.push(type); }
    if (success !== undefined) { sql += ` AND success=$${i++}`; params.push(success === "true"); }
    if (agent) { sql += ` AND agent=$${i++}`; params.push(agent); }

    sql += ` ORDER BY importance DESC, use_count DESC, created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);
    const { rows: cnt } = await pool.query("SELECT COUNT(*) as total FROM agent_memory");

    res.json({ memories: rows, total: parseInt(cnt[0]?.total ?? "0"), limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch agent memories" });
  }
});

// ── GET /api/agent-memory/:id — get single memory with full content ───────────
router.get("/agent-memory/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query("SELECT * FROM agent_memory WHERE id=$1", [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: "Memory not found" }); return; }
    await pool.query("UPDATE agent_memory SET use_count=use_count+1, updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ memory: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/agent-memory — store new agent memory ──────────────────────────
router.post("/agent-memory", async (req: Request, res: Response) => {
  const {
    device_id, type = "solution", goal, content, summary,
    tags = [], agent = "swarm", model, success = true,
    importance = 5, iteration = 1, metadata = {}
  } = req.body as Record<string, unknown>;

  if (!goal || !content) {
    res.status(400).json({ error: "goal and content are required" });
    return;
  }

  try {
    const computedSummary = summary
      ? String(summary)
      : String(content).slice(0, 300);

    const { rows } = await pool.query(
      `INSERT INTO agent_memory
         (device_id, type, goal, content, summary, tags, agent, model, success, importance, iteration, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        device_id ?? null,
        String(type),
        String(goal),
        String(content),
        computedSummary,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        String(agent),
        model ? String(model) : null,
        Boolean(success),
        Math.min(Math.max(Number(importance) || 5, 1), 10),
        Number(iteration) || 1,
        JSON.stringify(metadata),
      ]
    );
    res.status(201).json({ memory: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to create agent memory" });
  }
});

// ── POST /api/agent-memory/search — semantic search in memories ───────────────
router.post("/agent-memory/search", async (req: Request, res: Response) => {
  const { query, type, limit = 5 } = req.body as { query?: string; type?: string; limit?: number };
  if (!query) { res.status(400).json({ error: "query required" }); return; }

  try {
    let sql = `SELECT id, type, goal, summary, tags, agent, model, success, importance, use_count
               FROM agent_memory WHERE (
                 goal ILIKE $1 OR summary ILIKE $1 OR content ILIKE $1
               )`;
    const params: unknown[] = [`%${query}%`];
    let i = 2;

    if (type) { sql += ` AND type=$${i++}`; params.push(type); }

    sql += ` ORDER BY importance DESC, use_count DESC LIMIT $${i}`;
    params.push(Math.min(Number(limit) || 5, 20));

    const { rows } = await pool.query(sql, params);
    res.json({ results: rows, query });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/agent-memory/evolution/insights — get evolution insights ─────────
router.get("/agent-memory/evolution/insights", async (req: Request, res: Response) => {
  try {
    const agent = req.query["agent"] as string;
    let sql = `SELECT * FROM agent_evolution_insights WHERE 1=1`;
    const params: unknown[] = [];
    let i = 1;

    if (agent) { sql += ` AND agent=$${i++}`; params.push(agent); }
    sql += ` ORDER BY impact_score DESC, created_at DESC LIMIT 20`;

    const { rows } = await pool.query(sql, params);
    res.json({ insights: rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/agent-memory/evolution/insights — store evolution insight ───────
router.post("/agent-memory/evolution/insights", async (req: Request, res: Response) => {
  const { task_id, insight, agent, iteration = 1, model, impact_score = 5 } = req.body as Record<string, unknown>;
  if (!insight || !agent) { res.status(400).json({ error: "insight and agent required" }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO agent_evolution_insights (task_id, insight, agent, iteration, model, impact_score)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        task_id ?? null,
        String(insight),
        String(agent),
        Number(iteration) || 1,
        model ? String(model) : null,
        Math.min(Math.max(Number(impact_score) || 5, 1), 10),
      ]
    );
    res.status(201).json({ insight: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/agent-memory/errors — get error patterns ────────────────────────
router.get("/agent-memory/errors", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM agent_error_patterns ORDER BY occurrence_count DESC LIMIT 20`
    );
    res.json({ patterns: rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/agent-memory/errors — record error pattern ─────────────────────
router.post("/agent-memory/errors", async (req: Request, res: Response) => {
  const { pattern, solution, model } = req.body as Record<string, unknown>;
  if (!pattern) { res.status(400).json({ error: "pattern required" }); return; }
  try {
    await pool.query(
      `INSERT INTO agent_error_patterns (pattern, solution, model, occurrence_count, last_seen)
       VALUES ($1,$2,$3,1,NOW())
       ON CONFLICT DO NOTHING`,
      [String(pattern).slice(0, 500), solution ? String(solution).slice(0, 500) : null, model ? String(model) : null]
    );
    await pool.query(
      `UPDATE agent_error_patterns SET occurrence_count=occurrence_count+1, last_seen=NOW()
       WHERE pattern=$1`,
      [String(pattern).slice(0, 500)]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── DELETE /api/agent-memory/:id — delete memory ─────────────────────────────
router.delete("/agent-memory/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM agent_memory WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/agent-memory/auto-summarize — AI summarize a swarm run ─────────
router.post("/agent-memory/auto-summarize", async (req: Request, res: Response) => {
  const { goal, agentOutputs, model = "gpt-4o-mini" } = req.body as {
    goal?: string;
    agentOutputs?: Record<string, string>;
    model?: string;
  };
  if (!goal || !agentOutputs) {
    res.status(400).json({ error: "goal and agentOutputs required" });
    return;
  }
  try {
    const context = Object.entries(agentOutputs)
      .map(([k, v]) => `[${k.toUpperCase()}]: ${String(v).slice(0, 400)}`)
      .join("\n\n");

    const summary = await callOnce([
      {
        role: "system",
        content: "أنت نظام تلخيص ذكي. لخص الحل في 2-3 جمل واستخرج أهم 3 insights تعلّمها النظام من هذه الجلسة. أجب بتنسيق JSON: {summary, insights[], tags[]}",
      },
      { role: "user", content: `الهدف: ${goal}\n\nمخرجات الوكلاء:\n${context}` },
    ], 400);

    let parsed: { summary?: string; insights?: string[]; tags?: string[] } = {};
    try {
      const match = summary.match(/```json\s*([\s\S]*?)```/) ?? summary.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[1] ?? match[0]);
    } catch { parsed = { summary, insights: [], tags: [] }; }

    res.json({
      summary: parsed.summary ?? summary,
      insights: parsed.insights ?? [],
      tags: parsed.tags ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/agent-memory/stats — memory system stats ────────────────────────
router.get("/agent-memory/stats", async (_req: Request, res: Response) => {
  try {
    const [total, successful, failed, insights, errors] = await Promise.all([
      pool.query("SELECT COUNT(*) as c FROM agent_memory"),
      pool.query("SELECT COUNT(*) as c FROM agent_memory WHERE success=true"),
      pool.query("SELECT COUNT(*) as c FROM agent_memory WHERE success=false"),
      pool.query("SELECT COUNT(*) as c FROM agent_evolution_insights"),
      pool.query("SELECT COUNT(*) as c FROM agent_error_patterns"),
    ]);
    res.json({
      total:      parseInt(total.rows[0]?.c ?? "0"),
      successful: parseInt(successful.rows[0]?.c ?? "0"),
      failed:     parseInt(failed.rows[0]?.c ?? "0"),
      insights:   parseInt(insights.rows[0]?.c ?? "0"),
      errors:     parseInt(errors.rows[0]?.c ?? "0"),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
