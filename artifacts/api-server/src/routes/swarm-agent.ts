import { Router, type Request, type Response } from "express";
import { callOnce, streamCompletion, getOpenAICompatibleClient } from "../lib/ai-providers";
import { pool } from "../db";

const router = Router();

// ─── SSE helpers ────────────────────────────────────────────────────────────
function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}
function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Ensure swarm tables ─────────────────────────────────────────────────────
async function ensureSwarmTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        model TEXT,
        plan JSONB DEFAULT '[]',
        agent_outputs JSONB DEFAULT '{}',
        evolution_notes JSONB DEFAULT '[]',
        result TEXT,
        error_log JSONB DEFAULT '[]',
        iteration INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm_evolution_log (
        id SERIAL PRIMARY KEY,
        task_id UUID,
        iteration INTEGER,
        agent TEXT,
        insight TEXT,
        ts TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS main_agent_state (
        id TEXT PRIMARY KEY DEFAULT 'singleton',
        enabled BOOLEAN NOT NULL DEFAULT false,
        model TEXT NOT NULL DEFAULT 'gpt-4o',
        fallback_model TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO main_agent_state (id, enabled, model, fallback_model)
      VALUES ('singleton', false, 'gpt-4o', 'gpt-3.5-turbo')
      ON CONFLICT (id) DO NOTHING
    `);
  } catch { /* non-fatal */ }
}
ensureSwarmTables().catch(() => {});

// ─── Agent definitions ───────────────────────────────────────────────────────
const SWARM_AGENTS = {
  orchestrator: {
    name: "🎯 Orchestrator",
    role: "يدير الفريق بالكامل، يوزع المهام، يجمع النتائج، يقيّم التقدم",
    color: "#e21227",
    systemPrompt: `أنت Orchestrator — قائد فريق الوكلاء الذكي.
مهمتك: تحليل الهدف، وضع خطة محكمة، توزيع المهام على الوكلاء، وتجميع النتائج.
أسلوبك: دقيق، منظم، استراتيجي. تقرر متى تتوقف ومتى تكرر.
قيمك: الجودة أهم من السرعة. لا توقف حتى يكتمل الهدف.`,
  },
  planner: {
    name: "📋 Planner",
    role: "يحلل المتطلبات ويضع خطة تفصيلية بخطوات قابلة للتنفيذ",
    color: "#8b5cf6",
    systemPrompt: `أنت Planner — خبير التخطيط والتحليل.
مهمتك: استلام الهدف وتحويله إلى خطة تفصيلية بخطوات واضحة.
ضع خطة بـ 3-7 خطوات محددة قابلة للتنفيذ. كل خطوة تحتوي على: العنوان، التفاصيل، المخرجات المتوقعة.
أجب بتنسيق JSON محاط بـ \`\`\`json.`,
  },
  executor: {
    name: "⚡ Executor",
    role: "ينفذ الخطة ويكتب الكود ويبني الحل الفعلي",
    color: "#22d3ee",
    systemPrompt: `أنت Executor — منفذ الحلول البرمجية والتقنية.
مهمتك: تنفيذ كل خطوة في الخطة وإنتاج حل فعلي ومتكامل.
اكتب كوداً حقيقياً، وحلولاً تقنية، ولا تكتفي بالشرح.
استخدم أفضل الممارسات. كن دقيقاً وعملياً.`,
  },
  critic: {
    name: "🔍 Critic",
    role: "يراجع النتائج، يكتشف الأخطاء، يقترح التحسينات",
    color: "#f97316",
    systemPrompt: `أنت Critic — مراجع الجودة ومكتشف الأخطاء.
مهمتك: مراجعة الحل المنفذ بعين ناقدة.
ابحث عن: ثغرات أمنية، أخطاء منطقية، حالات حافة، أداء ضعيف.
قدّم تقريراً واضحاً: ما الصواب، ما الخطأ، وكيف نحسنه.`,
  },
  tester: {
    name: "🧪 Tester",
    role: "يختبر النظام ويكسره ويتحقق من جودة الحل",
    color: "#10b981",
    systemPrompt: `أنت Tester — خبير الاختبار وضمان الجودة.
مهمتك: اختبار الحل من كل الزوايا.
جرب: حالات حافة، مدخلات غير متوقعة، سيناريوهات فشل، اختبارات أداء.
قدّم: خطة اختبار + نتائج + توصيات.`,
  },
} as const;

type AgentId = keyof typeof SWARM_AGENTS;

// ─── Run a single swarm agent ────────────────────────────────────────────────
async function runSwarmAgent(
  agentId: AgentId,
  goal: string,
  context: string,
  model: string,
  res: Response,
  taskId: string,
): Promise<string> {
  const agent = SWARM_AGENTS[agentId];
  sse(res, "agent_start", { agent: agentId, name: agent.name, taskId });

  const messages = [
    { role: "system" as const, content: agent.systemPrompt },
    { role: "user" as const, content: `الهدف: ${goal}\n\nالسياق:\n${context}` },
  ];

  let output = "";
  try {
    for await (const chunk of streamCompletion(messages, { model, maxTokens: 2000 })) {
      if (chunk.content) {
        output += chunk.content;
        sse(res, "agent_chunk", { agent: agentId, name: agent.name, chunk: chunk.content });
      }
      if (chunk.done) break;
    }
  } catch (err: any) {
    output = `[${agent.name}] خطأ: ${err?.message ?? "فشل غير متوقع"}`;
    sse(res, "agent_error", { agent: agentId, error: output });
  }

  sse(res, "agent_done", { agent: agentId, name: agent.name, outputLen: output.length });
  return output;
}

// ─── POST /api/swarm/run — Full swarm evolution run (SSE) ───────────────────
router.post("/swarm/run", async (req: Request, res: Response) => {
  const { goal, model = "gpt-4o", fallbackModel = "gpt-3.5-turbo", maxIterations = 1 } = req.body as {
    goal?: string;
    model?: string;
    fallbackModel?: string;
    maxIterations?: number;
  };

  if (!goal || goal.trim().length < 5) {
    res.status(400).json({ error: "goal is required (min 5 chars)" });
    return;
  }

  sseHeaders(res);

  let taskId = "local-" + Date.now();
  try {
    const r = await pool.query(
      `INSERT INTO swarm_tasks (goal, model, status) VALUES ($1, $2, 'running') RETURNING id`,
      [goal, model],
    );
    taskId = r.rows[0]?.id ?? taskId;
  } catch { /* non-fatal */ }

  sse(res, "task_start", { taskId, goal, model, maxIterations });

  const agentOutputs: Record<string, string> = {};
  const evolutionLog: string[] = [];
  let finalResult = "";

  try {
    for (let iter = 0; iter < Math.min(maxIterations, 3); iter++) {
      sse(res, "iteration_start", { iteration: iter + 1, of: maxIterations });

      // ── PLANNER ─────────────────────────────────────────────────────────
      const planContext = iter === 0 ? "بدء المشروع من الصفر" : `التكرار رقم ${iter + 1}.\nالتحسينات المقترحة:\n${evolutionLog.slice(-3).join("\n")}`;
      const planOutput = await runSwarmAgent("planner", goal, planContext, model, res, taskId);
      agentOutputs["planner"] = planOutput;

      // ── EXECUTOR ─────────────────────────────────────────────────────────
      const execContext = `خطة التنفيذ:\n${planOutput}`;
      const execOutput = await runSwarmAgent("executor", goal, execContext, model, res, taskId);
      agentOutputs["executor"] = execOutput;

      // ── CRITIC ──────────────────────────────────────────────────────────
      const criticContext = `الخطة:\n${planOutput}\n\nالتنفيذ:\n${execOutput}`;
      const criticOutput = await runSwarmAgent("critic", goal, criticContext, model, res, taskId);
      agentOutputs["critic"] = criticOutput;

      // ── TESTER ──────────────────────────────────────────────────────────
      const testerContext = `الحل المنفذ:\n${execOutput}\n\nملاحظات المراجع:\n${criticOutput}`;
      const testerOutput = await runSwarmAgent("tester", goal, testerContext, model, res, taskId);
      agentOutputs["tester"] = testerOutput;

      // ── ORCHESTRATOR SYNTHESIS ────────────────────────────────────────────
      const orchestratorContext = `
نتائج الوكلاء للتكرار ${iter + 1}:

[PLANNER]: ${planOutput.slice(0, 800)}

[EXECUTOR]: ${execOutput.slice(0, 800)}

[CRITIC]: ${criticOutput.slice(0, 600)}

[TESTER]: ${testerOutput.slice(0, 600)}
      `.trim();
      const orchestratorOutput = await runSwarmAgent("orchestrator", goal, orchestratorContext, model, res, taskId);
      agentOutputs["orchestrator"] = orchestratorOutput;
      finalResult = orchestratorOutput;

      // ── EVOLUTION LOG ────────────────────────────────────────────────────
      evolutionLog.push(`[Iter ${iter + 1}] ${criticOutput.slice(0, 200)}`);
      sse(res, "iteration_done", { iteration: iter + 1, evolutionNote: evolutionLog.at(-1) });

      try {
        await pool.query(
          `UPDATE swarm_tasks SET agent_outputs=$1, evolution_notes=$2, iteration=$3, updated_at=NOW() WHERE id=$4`,
          [JSON.stringify(agentOutputs), JSON.stringify(evolutionLog), iter + 1, taskId],
        );
      } catch { /* non-fatal */ }
    }

    // ── FINAL FUSION ─────────────────────────────────────────────────────────
    sse(res, "fusion_start", {});
    const fusionMessages = [
      {
        role: "system" as const,
        content: `أنت نظام FUSION النهائي. اجمع نتائج فريق الوكلاء في تقرير نهائي شامل ومنظم.
التقرير يجب أن يحتوي على:
1. ملخص تنفيذي
2. الحل النهائي (كود أو خطة أو تحليل)
3. نقاط القوة
4. التحسينات المستقبلية`,
      },
      {
        role: "user" as const,
        content: `الهدف الأصلي: ${goal}\n\nنتائج الفريق:\n${Object.entries(agentOutputs).map(([k, v]) => `[${k.toUpperCase()}]:\n${v.slice(0, 600)}`).join("\n\n")}`,
      },
    ];

    let fusionOut = "";
    for await (const chunk of streamCompletion(fusionMessages, { model, maxTokens: 2000 })) {
      if (chunk.content) {
        fusionOut += chunk.content;
        sse(res, "fusion_chunk", { chunk: chunk.content });
      }
      if (chunk.done) break;
    }
    finalResult = fusionOut || finalResult;

    await pool.query(
      `UPDATE swarm_tasks SET status='done', result=$1, updated_at=NOW() WHERE id=$2`,
      [finalResult.slice(0, 8000), taskId],
    );

    sse(res, "done", { taskId, result: finalResult, agentOutputs });
  } catch (err: any) {
    sse(res, "error", { message: err?.message ?? "Unknown error" });
    await pool.query(
      `UPDATE swarm_tasks SET status='failed', error_log=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify([err?.message]), taskId],
    ).catch(() => {});
  } finally {
    res.end();
  }
});

// ─── GET /api/swarm/tasks — List recent swarm tasks ─────────────────────────
router.get("/swarm/tasks", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, goal, status, model, iteration, created_at, updated_at
       FROM swarm_tasks ORDER BY created_at DESC LIMIT 20`,
    );
    res.json({ tasks: rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/swarm/tasks/:id — Get task detail ──────────────────────────────
router.get("/swarm/tasks/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM swarm_tasks WHERE id = $1`, [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({ task: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/main-agent/state ───────────────────────────────────────────────
router.get("/main-agent/state", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM main_agent_state WHERE id='singleton'`);
    const row = rows[0] ?? { enabled: false, model: "gpt-4o", fallback_model: "gpt-3.5-turbo" };
    res.json({ enabled: row.enabled, model: row.model, fallbackModel: row.fallback_model });
  } catch {
    res.json({ enabled: false, model: "gpt-4o", fallbackModel: "gpt-3.5-turbo" });
  }
});

// ─── PATCH /api/main-agent/state — Toggle ON/OFF or change model ─────────────
router.patch("/main-agent/state", async (req: Request, res: Response) => {
  const { enabled, model, fallbackModel } = req.body as {
    enabled?: boolean;
    model?: string;
    fallbackModel?: string;
  };
  try {
    const sets: string[] = ["updated_at = NOW()"];
    const vals: unknown[] = [];
    let i = 1;
    if (enabled !== undefined) { sets.push(`enabled = $${i++}`); vals.push(enabled); }
    if (model) { sets.push(`model = $${i++}`); vals.push(model); }
    if (fallbackModel) { sets.push(`fallback_model = $${i++}`); vals.push(fallbackModel); }
    vals.push("singleton");
    await pool.query(`UPDATE main_agent_state SET ${sets.join(", ")} WHERE id = $${i}`, vals);
    const { rows } = await pool.query(`SELECT * FROM main_agent_state WHERE id='singleton'`);
    const row = rows[0];
    res.json({ enabled: row.enabled, model: row.model, fallbackModel: row.fallback_model });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/swarm/models — List all available models for swarm ─────────────
router.get("/swarm/models", async (_req: Request, res: Response) => {
  const models = [
    // GLM-5 / Zhipu AI
    { id: "glm-5", name: "GLM-5 (Zhipu AI)", provider: "zhipu", tier: "flagship" },
    { id: "glm-4-plus", name: "GLM-4 Plus (Zhipu AI)", provider: "zhipu", tier: "advanced" },
    { id: "glm-4", name: "GLM-4 (Zhipu AI)", provider: "zhipu", tier: "standard" },
    { id: "glm-4-flash", name: "GLM-4 Flash (Fast)", provider: "zhipu", tier: "fast" },
    // OpenAI
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", tier: "flagship" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", tier: "fast" },
    { id: "o3", name: "o3 (Reasoning)", provider: "openai", tier: "reasoning" },
    { id: "o3-mini", name: "o3-mini", provider: "openai", tier: "reasoning" },
    { id: "o4-mini", name: "o4-mini", provider: "openai", tier: "reasoning" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Fallback)", provider: "openai", tier: "fast" },
    // Anthropic
    { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic", tier: "flagship" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", tier: "advanced" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", tier: "fast" },
    // Google
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini", tier: "flagship" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini", tier: "fast" },
    // DeepSeek
    { id: "deepseek-r1", name: "DeepSeek R1 (Reasoning)", provider: "deepseek", tier: "reasoning" },
    { id: "deepseek-v3", name: "DeepSeek V3", provider: "deepseek", tier: "advanced" },
    // Meta
    { id: "llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "groq", tier: "advanced" },
    // Mistral
    { id: "mistral-large-latest", name: "Mistral Large", provider: "mistral", tier: "advanced" },
  ];
  res.json({ models });
});

export default router;
