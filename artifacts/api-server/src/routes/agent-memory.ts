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

// ── GET /api/agent-memory/retrieve-context — retrieve relevant memories for a session ──
router.get("/agent-memory/retrieve-context", async (req: Request, res: Response) => {
  const goal  = (req.query["goal"] as string ?? "").slice(0, 500);
  const limit = Math.min(parseInt(req.query["limit"] as string) || 5, 15);

  try {
    let rows: any[] = [];
    if (goal) {
      const r = await pool.query(
        `SELECT id, type, goal, summary, tags, agent, model, success, importance, use_count, iteration, created_at
         FROM agent_memory
         WHERE success=true AND (
           goal ILIKE $1 OR summary ILIKE $1 OR content ILIKE $1
         )
         ORDER BY importance DESC, use_count DESC, created_at DESC
         LIMIT $2`,
        [`%${goal.split(" ").slice(0, 4).join("%")}%`, limit]
      );
      rows = r.rows;
    }
    if (rows.length < 3) {
      const r2 = await pool.query(
        `SELECT id, type, goal, summary, tags, agent, model, success, importance, use_count, iteration, created_at
         FROM agent_memory WHERE success=true
         ORDER BY importance DESC, use_count DESC, created_at DESC
         LIMIT $1`,
        [limit]
      );
      const existing = new Set(rows.map((x: any) => x.id));
      for (const row of r2.rows) {
        if (!existing.has(row.id)) rows.push(row);
        if (rows.length >= limit) break;
      }
    }
    if (rows.length > 0) {
      const ids = rows.map((r: any) => r.id);
      await pool.query(
        `UPDATE agent_memory SET use_count=use_count+1, updated_at=NOW() WHERE id=ANY($1)`,
        [ids]
      ).catch(() => {});
    }
    const insights = await pool.query(
      `SELECT insight, agent, impact_score FROM agent_evolution_insights
       ORDER BY impact_score DESC, created_at DESC LIMIT 5`
    );
    res.json({ memories: rows, insights: insights.rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/agent-memory/auto-project — AI-powered project generator ────────
router.post("/agent-memory/auto-project", async (req: Request, res: Response) => {
  const { idea, model = "gpt-4o-mini", language = "ar" } = req.body as {
    idea?: string; model?: string; language?: string;
  };
  if (!idea || idea.trim().length < 5) {
    res.status(400).json({ error: "idea is required (min 5 chars)" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let memoryContext = "";
    try {
      const mems = await pool.query(
        `SELECT summary, goal FROM agent_memory WHERE success=true
         ORDER BY importance DESC, use_count DESC LIMIT 4`
      );
      if (mems.rows.length) {
        memoryContext = "\n\nحلول ناجحة سابقة للاستلهام:\n" +
          mems.rows.map((m: any) => `- ${m.goal}: ${m.summary}`).join("\n");
      }
    } catch { /* non-fatal */ }

    send({ type: "start", idea });

    const systemPrompt = language === "ar"
      ? `أنت مهندس مشاريع ذكي. بناءً على الفكرة، أنشئ مواصفات مشروع كاملة بتنسيق JSON:
{
  "title": "اسم المشروع",
  "description": "وصف تفصيلي",
  "tech_stack": ["التقنيات"],
  "architecture": "وصف المعمارية",
  "phases": [{"name": "المرحلة", "tasks": ["المهام"], "duration": "المدة"}],
  "api_endpoints": [{"method": "GET", "path": "/path", "description": "الوصف"}],
  "database_schema": [{"table": "الجدول", "columns": ["العمود"]}],
  "features": ["الميزات"],
  "security_considerations": ["اعتبارات الأمان"],
  "deployment": "استراتيجية النشر",
  "estimated_time": "الوقت المتوقع"
}`
      : `You are a smart project architect. Generate complete project specifications as JSON.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `الفكرة: ${idea}${memoryContext}` },
    ];

    let fullText = "";
    const { streamCompletion } = await import("../lib/ai-providers");
    for await (const chunk of streamCompletion("openai", model, messages, 0.6)) {
      if (chunk.content) {
        fullText += chunk.content;
        send({ type: "chunk", content: chunk.content });
      }
      if (chunk.done) break;
    }

    let parsed: Record<string, unknown> = {};
    try {
      const match = fullText.match(/```json\s*([\s\S]*?)```/) ?? fullText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[1] ?? match[0]);
    } catch { parsed = { raw: fullText }; }

    try {
      await pool.query(
        `INSERT INTO agent_memory (type, goal, content, summary, tags, agent, success, importance)
         VALUES ('plan', $1, $2, $3, $4, 'auto-project', true, 7)`,
        [
          `توليد مشروع: ${idea.slice(0, 100)}`,
          fullText.slice(0, 2000),
          (parsed["description"] as string ?? idea).slice(0, 300),
          JSON.stringify(["project", "auto-generated"]),
        ]
      );
    } catch { /* non-fatal */ }

    send({ type: "done", project: parsed });
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", error: err?.message })}\n\n`);
    res.end();
  }
});

// ── POST /api/agent-memory/self-improve-loop — cross-session self-improvement ─
router.post("/agent-memory/self-improve-loop", async (req: Request, res: Response) => {
  const { model = "gpt-4o-mini", maxInsights = 5 } = req.body as {
    model?: string; maxInsights?: number;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    send({ type: "start", message: "بدء حلقة التحسين الذاتي عبر الجلسات..." });

    const [memories, errors, insights] = await Promise.all([
      pool.query(
        `SELECT goal, summary, success, agent, importance, use_count FROM agent_memory
         ORDER BY created_at DESC LIMIT 20`
      ),
      pool.query(
        `SELECT pattern, solution, occurrence_count FROM agent_error_patterns
         ORDER BY occurrence_count DESC LIMIT 10`
      ),
      pool.query(
        `SELECT insight, agent, impact_score, applied_count FROM agent_evolution_insights
         ORDER BY impact_score DESC LIMIT 10`
      ),
    ]);

    const memSummary = memories.rows
      .map((m: any) => `[${m.success ? "✓" : "✗"}] ${m.goal}: ${m.summary}`)
      .join("\n");
    const errSummary = errors.rows
      .map((e: any) => `خطأ (${e.occurrence_count}×): ${e.pattern}`)
      .join("\n");
    const insSummary = insights.rows
      .map((i: any) => `رؤية (${i.impact_score}/10): ${i.insight}`)
      .join("\n");

    send({ type: "analyzing", message: "تحليل الذاكرة والأنماط..." });

    const messages = [
      {
        role: "system" as const,
        content: `أنت نظام ذكاء اصطناعي للتحسين الذاتي عبر الجلسات.
مهمتك: تحليل سجل الجلسات السابقة واستخراج توصيات محددة لتحسين أداء النظام في الجلسات القادمة.
أجب بتنسيق JSON:
{
  "system_analysis": "تحليل شامل لأداء النظام",
  "strength_patterns": ["نقاط القوة"],
  "weakness_patterns": ["نقاط الضعف"],
  "new_insights": [{"insight": "الرؤية", "agent": "الوكيل", "impact_score": 8}],
  "strategy_recommendation": "التوصية الاستراتيجية",
  "next_session_context": "السياق الموصى به للجلسة القادمة"
}`,
      },
      {
        role: "user" as const,
        content: `سجل الجلسات:\n${memSummary}\n\nالأخطاء المتكررة:\n${errSummary}\n\nالرؤى المجمعة:\n${insSummary}`,
      },
    ];

    let fullText = "";
    const { streamCompletion } = await import("../lib/ai-providers");
    for await (const chunk of streamCompletion("openai", model, messages, 0.5)) {
      if (chunk.content) {
        fullText += chunk.content;
        send({ type: "chunk", content: chunk.content });
      }
      if (chunk.done) break;
    }

    let parsed: {
      new_insights?: { insight: string; agent: string; impact_score: number }[];
      strategy_recommendation?: string;
      system_analysis?: string;
      next_session_context?: string;
      strength_patterns?: string[];
      weakness_patterns?: string[];
    } = {};
    try {
      const match = fullText.match(/```json\s*([\s\S]*?)```/) ?? fullText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[1] ?? match[0]);
    } catch { /* ignore */ }

    const newInsights = parsed.new_insights?.slice(0, maxInsights) ?? [];
    let savedCount = 0;
    for (const ins of newInsights) {
      try {
        await pool.query(
          `INSERT INTO agent_evolution_insights (insight, agent, iteration, impact_score)
           VALUES ($1, $2, 0, $3)`,
          [
            String(ins.insight).slice(0, 1000),
            String(ins.agent || "self-improve").slice(0, 50),
            Math.min(Math.max(Number(ins.impact_score) || 5, 1), 10),
          ]
        );
        savedCount++;
      } catch { /* non-fatal */ }
    }

    if (parsed.strategy_recommendation) {
      try {
        await pool.query(
          `INSERT INTO agent_memory (type, goal, content, summary, tags, agent, success, importance)
           VALUES ('insight', 'تحسين ذاتي عبر الجلسات', $1, $2, $3, 'self-improve', true, 9)`,
          [
            fullText.slice(0, 2000),
            (parsed.system_analysis ?? parsed.strategy_recommendation).slice(0, 300),
            JSON.stringify(["self-improve", "cross-session", "strategy"]),
          ]
        );
      } catch { /* non-fatal */ }
    }

    send({
      type: "done",
      savedInsights: savedCount,
      analysis: parsed,
      message: `تم حفظ ${savedCount} رؤية جديدة. النظام جاهز للجلسة القادمة.`,
    });
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", error: err?.message })}\n\n`);
    res.end();
  }
});

// ── POST /api/agent-memory/auto-save — auto-save a completed swarm run ───────
router.post("/agent-memory/auto-save", async (req: Request, res: Response) => {
  const { goal, agentOutputs, fusion, model, success = true, iteration = 1 } = req.body as {
    goal?: string;
    agentOutputs?: Record<string, string>;
    fusion?: string;
    model?: string;
    success?: boolean;
    iteration?: number;
  };
  if (!goal || !agentOutputs) {
    res.status(400).json({ error: "goal and agentOutputs required" });
    return;
  }
  try {
    const content = fusion
      ? fusion.slice(0, 3000)
      : Object.entries(agentOutputs).map(([k, v]) => `[${k}]: ${String(v).slice(0, 500)}`).join("\n\n");

    let summaryText = content.slice(0, 250);
    let tags: string[] = ["swarm", "auto-saved"];

    try {
      const aiSummary = await callOnce([
        {
          role: "system" as const,
          content: "لخّص هذا الحل في جملة واحدة واستخرج 3 تاجات (كلمات مفتاحية). أجب بـ JSON: {summary, tags[]}",
        },
        { role: "user" as const, content: `الهدف: ${goal}\n\n${content.slice(0, 800)}` },
      ], 150);

      try {
        const match = aiSummary.match(/\{[\s\S]*\}/);
        if (match) {
          const p = JSON.parse(match[0]);
          if (p.summary) summaryText = p.summary;
          if (Array.isArray(p.tags)) tags = [...tags, ...p.tags.slice(0, 3)];
        }
      } catch { /* ignore */ }
    } catch { /* non-fatal */ }

    const importance = success ? (Number(iteration) > 1 ? 8 : 6) : 3;

    const { rows } = await pool.query(
      `INSERT INTO agent_memory (type, goal, content, summary, tags, agent, model, success, importance, iteration)
       VALUES ('solution', $1, $2, $3, $4, 'swarm', $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        String(goal).slice(0, 500),
        content.slice(0, 4000),
        summaryText.slice(0, 300),
        JSON.stringify(tags),
        model ? String(model).slice(0, 100) : null,
        Boolean(success),
        importance,
        Number(iteration) || 1,
      ]
    );
    res.status(201).json({ ok: true, memory: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
