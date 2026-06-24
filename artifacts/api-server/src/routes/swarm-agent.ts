import { Router, type Request, type Response } from "express";
import { streamCompletion, getOpenAICompatibleClient, type ProviderName } from "../lib/ai-providers";
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

    // ── agent_evolution_insights (referenced in swarm/run & self-improve) ─────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_evolution_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID,
        insight TEXT NOT NULL,
        agent TEXT NOT NULL DEFAULT 'system',
        iteration INTEGER NOT NULL DEFAULT 0,
        model TEXT,
        impact_score NUMERIC(3,1) DEFAULT 5.0,
        applied BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_evo_insights_task ON agent_evolution_insights (task_id)`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_evo_insights_impact ON agent_evolution_insights (impact_score DESC)`).catch(() => {});

    // ── autonomous_task_queue (new: persisted task queue from documents) ───────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autonomous_task_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 5,
        model TEXT NOT NULL DEFAULT 'glm-5.2',
        fallback_model TEXT NOT NULL DEFAULT 'gpt-4o',
        agent_mode TEXT NOT NULL DEFAULT 'autonomous',
        result TEXT,
        error TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_atq_status ON autonomous_task_queue (status)`).catch(() => {});

    // ── evolution_system_state (living project state — self-improving loop) ────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evolution_system_state (
        id TEXT PRIMARY KEY DEFAULT 'singleton',
        generation INTEGER NOT NULL DEFAULT 0,
        total_tasks_completed INTEGER NOT NULL DEFAULT 0,
        total_errors_fixed INTEGER NOT NULL DEFAULT 0,
        top_insights JSONB DEFAULT '[]'::jsonb,
        current_strategy TEXT DEFAULT 'balanced',
        system_prompt_version INTEGER NOT NULL DEFAULT 1,
        last_improvement_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO evolution_system_state (id) VALUES ('singleton')
      ON CONFLICT (id) DO NOTHING
    `);

  } catch { /* non-fatal */ }
}
ensureSwarmTables().catch(() => {});

// ─── Provider detection from model id ────────────────────────────────────────
function detectProvider(model: string): ProviderName {
  if (model.startsWith("glm-")) {
    // Prefer ZAI (api.z.ai) if key is available, else fallback to Zhipu (open.bigmodel.cn)
    return process.env.ZAI_API_KEY ? "glm" : "zhipu";
  }
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "gemini";
  if (model.startsWith("deepseek-")) return "openrouter";
  if (model.startsWith("llama-") || model.startsWith("mixtral-")) return "groq";
  if (model.startsWith("mistral-")) return "openrouter";
  return "personal";
}

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
  apiKey?: string,
  apiBaseURL?: string,
): Promise<string> {
  const agent = SWARM_AGENTS[agentId];
  const provider = detectProvider(model);
  sse(res, "agent_start", { agent: agentId, name: agent.name, taskId });

  const messages = [
    { role: "system" as const, content: agent.systemPrompt },
    { role: "user" as const, content: `الهدف: ${goal}\n\nالسياق:\n${context}` },
  ];

  let output = "";
  try {
    for await (const chunk of streamCompletion(provider, model, messages, 0.7, { apiKey, apiBaseURL })) {
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
  const { goal, model = "gpt-4o", fallbackModel = "gpt-3.5-turbo", maxIterations = 1, apiKey, apiBaseURL } = req.body as {
    goal?: string;
    model?: string;
    fallbackModel?: string;
    maxIterations?: number;
    apiKey?: string;
    apiBaseURL?: string;
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
      const planOutput = await runSwarmAgent("planner", goal, planContext, model, res, taskId, apiKey, apiBaseURL);
      agentOutputs["planner"] = planOutput;

      // ── EXECUTOR ─────────────────────────────────────────────────────────
      const execContext = `خطة التنفيذ:\n${planOutput}`;
      const execOutput = await runSwarmAgent("executor", goal, execContext, model, res, taskId, apiKey, apiBaseURL);
      agentOutputs["executor"] = execOutput;

      // ── CRITIC ──────────────────────────────────────────────────────────
      const criticContext = `الخطة:\n${planOutput}\n\nالتنفيذ:\n${execOutput}`;
      const criticOutput = await runSwarmAgent("critic", goal, criticContext, model, res, taskId, apiKey, apiBaseURL);
      agentOutputs["critic"] = criticOutput;

      // ── TESTER ──────────────────────────────────────────────────────────
      const testerContext = `الحل المنفذ:\n${execOutput}\n\nملاحظات المراجع:\n${criticOutput}`;
      const testerOutput = await runSwarmAgent("tester", goal, testerContext, model, res, taskId, apiKey, apiBaseURL);
      agentOutputs["tester"] = testerOutput;

      // ── ORCHESTRATOR SYNTHESIS ────────────────────────────────────────────
      const orchestratorContext = `
نتائج الوكلاء للتكرار ${iter + 1}:

[PLANNER]: ${planOutput.slice(0, 800)}

[EXECUTOR]: ${execOutput.slice(0, 800)}

[CRITIC]: ${criticOutput.slice(0, 600)}

[TESTER]: ${testerOutput.slice(0, 600)}
      `.trim();
      const orchestratorOutput = await runSwarmAgent("orchestrator", goal, orchestratorContext, model, res, taskId, apiKey, apiBaseURL);
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

    const fusionProvider = detectProvider(model);
    let fusionOut = "";
    for await (const chunk of streamCompletion(fusionProvider, model, fusionMessages, 0.7, { apiKey, apiBaseURL })) {
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

    // ── AUTO-SAVE TO AGENT MEMORY ─────────────────────────────────────────────
    try {
      const summaryText = finalResult.slice(0, 300);
      const tags = ["swarm", "fusion", model.split("-")[0]];
      await pool.query(
        `INSERT INTO agent_memory (type, goal, content, summary, tags, agent, model, success, importance, iteration)
         VALUES ('solution', $1, $2, $3, $4, 'swarm', $5, true, 7, $6)`,
        [goal, finalResult.slice(0, 8000), summaryText, JSON.stringify(tags), model, maxIterations]
      );
      // Store evolution insights
      for (const note of evolutionLog) {
        await pool.query(
          `INSERT INTO agent_evolution_insights (task_id, insight, agent, iteration, model, impact_score)
           VALUES ($1, $2, 'swarm', 1, $3, 6)`,
          [taskId, note.slice(0, 500), model]
        ).catch(() => {});
      }
    } catch { /* non-fatal */ }

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

// ─── POST /api/swarm/generate — Auto Project Generator ───────────────────────
router.post("/swarm/generate", async (req: Request, res: Response) => {
  const {
    project_type = "web",
    requirements,
    tech_stack,
    model = "gpt-4o",
    apiKey,
    apiBaseURL,
  } = req.body as {
    project_type?: string;
    requirements?: string;
    tech_stack?: string;
    model?: string;
    apiKey?: string;
    apiBaseURL?: string;
  };

  if (!requirements || requirements.trim().length < 10) {
    res.status(400).json({ error: "requirements is required (min 10 chars)" });
    return;
  }

  sseHeaders(res);
  sse(res, "generate_start", { project_type, model });

  const provider = detectProvider(model);
  const generatorMessages = [
    {
      role: "system" as const,
      content: `أنت Auto Project Generator — مولّد مشاريع برمجية كاملة.
مهمتك: توليد مشروع برمجي متكامل بناءً على المتطلبات المعطاة.
المخرجات يجب أن تحتوي على:
1. هيكل المشروع (Project Structure) — شجرة الملفات
2. الكود الكامل لكل ملف رئيسي
3. ملف README.md مفصّل
4. تعليمات التثبيت والتشغيل
5. قائمة التبعيات (dependencies)

نوع المشروع: ${project_type}
${tech_stack ? `التقنيات المطلوبة: ${tech_stack}` : ""}

قواعد:
- اكتب كوداً حقيقياً قابلاً للتشغيل
- استخدم أفضل الممارسات
- أضف تعليقات توضيحية
- تعامل مع الأخطاء
- الجودة أهم من الكمية`,
    },
    {
      role: "user" as const,
      content: `اولد مشروعاً كاملاً بناءً على هذه المتطلبات:\n\n${requirements}`,
    },
  ];

  let output = "";
  try {
    for await (const chunk of streamCompletion(provider, model, generatorMessages, 0.7, { apiKey, apiBaseURL })) {
      if (chunk.content) {
        output += chunk.content;
        sse(res, "generate_chunk", { chunk: chunk.content });
      }
      if (chunk.done) break;
    }

    // Save to agent memory
    try {
      await pool.query(
        `INSERT INTO agent_memory (type, goal, content, summary, tags, agent, model, success, importance)
         VALUES ('solution', $1, $2, $3, $4, 'project-generator', $5, true, 8)`,
        [
          `Generate ${project_type} project: ${requirements.slice(0, 100)}`,
          output.slice(0, 8000),
          output.slice(0, 300),
          JSON.stringify(["project-generator", project_type, ...(tech_stack ? [tech_stack] : [])]),
          model,
        ]
      );
    } catch { /* non-fatal */ }

    sse(res, "generate_done", { output, projectType: project_type });
  } catch (err: any) {
    sse(res, "generate_error", { message: err?.message ?? "Generation failed" });
  } finally {
    res.end();
  }
});

// ─── POST /api/swarm/self-improve — Self-Improving Loop: store + apply insights
router.post("/swarm/self-improve", async (req: Request, res: Response) => {
  const { task_id, goal, agentOutputs, evolutionNotes, model = "gpt-4o", apiKey, apiBaseURL } = req.body as {
    task_id?: string;
    goal?: string;
    agentOutputs?: Record<string, string>;
    evolutionNotes?: string[];
    model?: string;
    apiKey?: string;
    apiBaseURL?: string;
  };

  if (!goal) { res.status(400).json({ error: "goal required" }); return; }

  sseHeaders(res);
  sse(res, "improve_start", { task_id, goal });

  try {
    // 1. Get past insights from DB for self-improvement context
    const { rows: pastInsights } = await pool.query(
      `SELECT insight, agent, impact_score FROM agent_evolution_insights
       ORDER BY impact_score DESC, applied_count ASC LIMIT 10`
    );

    const pastContext = pastInsights.length > 0
      ? `\n\nرؤى من الجلسات السابقة (استخدمها لتحسين التحليل):\n${pastInsights.map((r: { agent: string; insight: string }) => `- [${r.agent}]: ${r.insight}`).join("\n")}`
      : "";

    const outputContext = agentOutputs
      ? Object.entries(agentOutputs).map(([k, v]) => `[${k.toUpperCase()}]: ${String(v).slice(0, 400)}`).join("\n\n")
      : "";

    const selfImproveMessages = [
      {
        role: "system" as const,
        content: `أنت نظام التحسين الذاتي (Self-Improving System) لفريق Swarm.
مهمتك: تحليل نتائج هذه الجلسة واستخراج رؤى قابلة للتطبيق في الجلسات المستقبلية.
استخرج:
1. ما نجح وسبب نجاحه (3 نقاط)
2. ما يمكن تحسينه (3 نقاط)
3. أنماط أخطاء جديدة (إن وجدت)
4. توصيات للجلسة القادمة (3 نقاط)

أجب بتنسيق JSON:
{
  "successes": [{"insight": "...", "agent": "...", "impact": 8}],
  "improvements": [{"insight": "...", "agent": "...", "impact": 7}],
  "errors": [{"pattern": "...", "solution": "..."}],
  "recommendations": ["...", "...", "..."]
}${pastContext}`,
      },
      {
        role: "user" as const,
        content: `الهدف: ${goal}\n\nنتائج الجلسة:\n${outputContext}\n\nملاحظات التطور:\n${(evolutionNotes ?? []).join("\n")}`,
      },
    ];

    const provider = detectProvider(model);
    let analysisText = "";
    for await (const chunk of streamCompletion(provider, model, selfImproveMessages, 0.5, { apiKey, apiBaseURL })) {
      if (chunk.content) {
        analysisText += chunk.content;
        sse(res, "improve_chunk", { chunk: chunk.content });
      }
      if (chunk.done) break;
    }

    // Parse and store insights
    let parsed: {
      successes?: Array<{ insight: string; agent: string; impact?: number }>;
      improvements?: Array<{ insight: string; agent: string; impact?: number }>;
      errors?: Array<{ pattern: string; solution?: string }>;
      recommendations?: string[];
    } = {};
    try {
      const match = analysisText.match(/```json\s*([\s\S]*?)```/) ?? analysisText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[1] ?? match[0]);
    } catch { /* non-fatal */ }

    // Store all insights in DB
    const allInsights = [
      ...(parsed.successes ?? []),
      ...(parsed.improvements ?? []),
    ];

    for (const ins of allInsights) {
      try {
        await pool.query(
          `INSERT INTO agent_evolution_insights (task_id, insight, agent, iteration, model, impact_score)
           VALUES ($1, $2, $3, 1, $4, $5)`,
          [task_id ?? null, ins.insight, ins.agent ?? "swarm", model, ins.impact ?? 5]
        );
      } catch { /* non-fatal */ }
    }

    // Store error patterns
    for (const err of (parsed.errors ?? [])) {
      try {
        await pool.query(
          `INSERT INTO agent_error_patterns (pattern, solution, model, occurrence_count, last_seen)
           VALUES ($1, $2, $3, 1, NOW())
           ON CONFLICT DO NOTHING`,
          [err.pattern?.slice(0, 500) ?? "", err.solution?.slice(0, 500) ?? null, model]
        );
      } catch { /* non-fatal */ }
    }

    sse(res, "improve_done", {
      insights: allInsights.length,
      errors: (parsed.errors ?? []).length,
      recommendations: parsed.recommendations ?? [],
      rawAnalysis: analysisText,
    });
  } catch (err: any) {
    sse(res, "improve_error", { message: err?.message ?? "Self-improve failed" });
  } finally {
    res.end();
  }
});

// ─── GET /api/swarm/models — List all available models for swarm ─────────────
router.get("/swarm/models", async (_req: Request, res: Response) => {
  const models = [
    // GLM-5 Series / Zhipu AI (Z.ai) — 744B-A40B, 1M context, agentic engineering
    { id: "glm-5.2", name: "GLM-5.2 (Zhipu AI)", provider: "zhipu", tier: "flagship" },
    { id: "glm-5.1", name: "GLM-5.1 (Zhipu AI)", provider: "zhipu", tier: "flagship" },
    { id: "glm-5",   name: "GLM-5 (Zhipu AI)",   provider: "zhipu", tier: "flagship" },
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

// ══════════════════════════════════════════════════════════════════════════════
// NEW: Autonomous Swarm Evolution System — Full Document Integration
// Based on: Autonomous Swarm Evolution AI System (FULL UNIFIED PROMPT)
// 4 Layers: Swarm · Self-Improving Loop · Task Queue · Evolution System
// Primary Model: GLM-5 (ZAI) → Fallback: GPT-4o → GPT-3.5-turbo
// ══════════════════════════════════════════════════════════════════════════════

const AUTONOMOUS_SYSTEM_PROMPT = `أنت نظام ذكاء اصطناعي متقدم جدًا يعمل كـ:
Autonomous Multi-Agent Software Engineering + Self-Evolving AI System

هدفك تحويل أي طلب إلى نظام برمجي كامل يتم تخطيطه، بناؤه، اختباره، تحسينه، وتطويره تلقائيًا.

🤖 SWARM AGENTS (فريق العمل):
- Orchestrator: يدير النظام بالكامل ويوزع المهام
- Planner: يحلل المتطلبات ويضع الخطة التفصيلية
- Executor: يكتب الكود وينفذ الحلول
- Critic: يراجع ويكتشف الأخطاء والثغرات
- Tester: يختبر ويتحقق من الجودة

🔁 SELF-IMPROVING LOOP:
- تعلّم من الأخطاء السابقة
- تحسين الخطط مع كل تكرار
- تطوير جودة الحلول باستمرار

📦 TASK QUEUE SYSTEM:
- تقسيم العمل إلى مهام صغيرة قابلة للتنفيذ
- تتبع الحالة: pending → running → done / failed
- عدم الانتقال قبل إكمال المهمة الحالية

🧬 EVOLUTION SYSTEM:
- المشروع كائن حي يتطور مع الوقت
- تسجيل التجارب والدروس المستفادة
- إنتاج نسخ محسّنة باستمرار

🛠️ TOOLS AVAILABLE:
- تحليل الكود وإنتاجه
- تصحيح الأخطاء التلقائي
- اختبار الأنظمة
- تحليل الأداء

⚙️ EXECUTION RULES:
1. لا تنفيذ بدون خطة واضحة
2. لا تكرار نفس الخطأ
3. لا توقف عند فشل أول محاولة
4. الجودة أهم من السرعة
5. كل مشروع يجب أن ينتهي بنتيجة واضحة

أسلوبك: دقيق، منظم، احترافي. تجيب بالعربية إلا إذا طُلب غير ذلك.`;

// ─── POST /api/swarm/autonomous — Full Autonomous System run (SSE) ────────────
router.post("/swarm/autonomous", async (req: Request, res: Response) => {
  const {
    goal,
    model = "glm-5.2",
    fallbackModel = "gpt-4o",
    maxIterations = 3,
    agentMode = true,
    apiKey,
    apiBaseURL,
  } = req.body as {
    goal: string;
    model?: string;
    fallbackModel?: string;
    maxIterations?: number;
    agentMode?: boolean;
    apiKey?: string;
    apiBaseURL?: string;
  };

  if (!goal?.trim()) {
    res.status(400).json({ error: "goal is required" });
    return;
  }

  sseHeaders(res);

  let taskId: string | null = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO autonomous_task_queue (goal, status, model, fallback_model, agent_mode)
       VALUES ($1, 'running', $2, $3, $4) RETURNING id`,
      [goal.slice(0, 2000), model, fallbackModel, agentMode ? "autonomous" : "simple"]
    );
    taskId = rows[0]?.id ?? null;
  } catch { /* non-fatal */ }

  sse(res, "init", { taskId, goal, model, fallbackModel, maxIterations });

  // ── Helper: call model with fallback chain ────────────────────────────────
  async function callWithFallback(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    label: string,
    maxTokens = 1200
  ): Promise<string> {
    const chain = [model, fallbackModel, "gpt-3.5-turbo"];
    for (const m of chain) {
      try {
        const provider = detectProvider(m);
        const client = getOpenAICompatibleClient(provider);
        if (!client) continue;
        sse(res, "model_attempt", { model: m, label });
        const resp = await client.chat.completions.create({
          model: m,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          ...(apiKey ? {} : {}),
        });
        return resp.choices[0]?.message?.content ?? "";
      } catch {
        sse(res, "model_fallback", { from: m, label });
      }
    }
    return `[${label}: تعذّر الاتصال بأي نموذج]`;
  }

  try {
    const evolutionNotes: string[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      sse(res, "iteration_start", { iteration: iter + 1, maxIterations });

      // ── ORCHESTRATOR ──────────────────────────────────────────────────────
      sse(res, "agent_start", { agent: "orchestrator", iteration: iter + 1 });
      const orchestratorOutput = await callWithFallback([
        { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
        { role: "user", content: `[ORCHESTRATOR] المهمة: ${goal}\nالتكرار: ${iter + 1}/${maxIterations}\n${evolutionNotes.length ? `الدروس السابقة:\n${evolutionNotes.slice(-2).join("\n")}` : ""}\n\nحلل المتطلبات وأعط توجيهات واضحة للفريق.` },
      ], "orchestrator");
      sse(res, "agent_done", { agent: "orchestrator", output: orchestratorOutput });

      // ── PLANNER ───────────────────────────────────────────────────────────
      sse(res, "agent_start", { agent: "planner", iteration: iter + 1 });
      const plannerOutput = await callWithFallback([
        { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
        { role: "user", content: `[PLANNER] بناءً على توجيهات Orchestrator:\n${orchestratorOutput.slice(0, 600)}\n\nضع خطة تفصيلية مقسمة إلى مهام صغيرة. استخدم JSON للخطة.` },
      ], "planner");
      sse(res, "agent_done", { agent: "planner", output: plannerOutput });

      // ── EXECUTOR ──────────────────────────────────────────────────────────
      sse(res, "agent_start", { agent: "executor", iteration: iter + 1 });
      const executorOutput = await callWithFallback([
        { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
        { role: "user", content: `[EXECUTOR] نفّذ الخطة التالية:\n${plannerOutput.slice(0, 800)}\n\nاكتب الكود/الحل الكامل مع التفاصيل التقنية.` },
      ], "executor", 2000);
      sse(res, "agent_done", { agent: "executor", output: executorOutput });

      // ── CRITIC ────────────────────────────────────────────────────────────
      sse(res, "agent_start", { agent: "critic", iteration: iter + 1 });
      const criticOutput = await callWithFallback([
        { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
        { role: "user", content: `[CRITIC] راجع هذا التنفيذ وحدد الأخطاء والتحسينات:\n${executorOutput.slice(0, 800)}\n\nكن دقيقاً في النقد البنّاء.` },
      ], "critic");
      sse(res, "agent_done", { agent: "critic", output: criticOutput });

      // ── TESTER ────────────────────────────────────────────────────────────
      sse(res, "agent_start", { agent: "tester", iteration: iter + 1 });
      const testerOutput = await callWithFallback([
        { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
        { role: "user", content: `[TESTER] اختبر وتحقق من الحل التالي:\n${executorOutput.slice(0, 600)}\n\nأعط نتائج الاختبار وحالة النجاح/الفشل.` },
      ], "tester");
      sse(res, "agent_done", { agent: "tester", output: testerOutput });

      // ── EVOLUTION NOTE ────────────────────────────────────────────────────
      const note = `[Gen ${iter + 1}] Critic: ${criticOutput.slice(0, 150)} | Tester: ${testerOutput.slice(0, 100)}`;
      evolutionNotes.push(note);
      sse(res, "evolution_note", { iteration: iter + 1, note });

      try {
        await pool.query(
          `INSERT INTO agent_evolution_insights (task_id, insight, agent, iteration, model, impact_score)
           VALUES ($1, $2, 'autonomous-swarm', $3, $4, 7.0)`,
          [taskId, note.slice(0, 500), iter + 1, model]
        );
        // Update evolution system state
        await pool.query(`
          UPDATE evolution_system_state
          SET generation = generation + 1, last_improvement_at = NOW(), updated_at = NOW()
          WHERE id = 'singleton'
        `);
      } catch { /* non-fatal */ }
    }

    // ── FINAL SYNTHESIS ──────────────────────────────────────────────────────
    sse(res, "fusion_start", {});
    const fusionOutput = await callWithFallback([
      { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
      { role: "user", content: `[FUSION — النتيجة النهائية]\nالهدف: ${goal}\n\nادمج جميع مخرجات الفريق في تقرير نهائي شامل ومنظم يكون جاهزاً للاستخدام الفوري.\n\nالملاحظات التطورية:\n${evolutionNotes.join("\n")}` },
    ], "fusion", 3000);

    sse(res, "fusion_done", { result: fusionOutput });

    // Update task queue status
    if (taskId) {
      await pool.query(
        `UPDATE autonomous_task_queue SET status='done', result=$1, completed_at=NOW() WHERE id=$2`,
        [fusionOutput.slice(0, 8000), taskId]
      ).catch(() => {});
    }

  } catch (err: any) {
    sse(res, "error", { message: err?.message ?? "Autonomous system failed" });
    if (taskId) {
      pool.query(
        `UPDATE autonomous_task_queue SET status='failed', error=$1 WHERE id=$2`,
        [err?.message ?? "Unknown error", taskId]
      ).catch(() => {});
    }
  } finally {
    res.end();
  }
});

// ─── GET /api/swarm/task-queue — List autonomous task queue ─────────────────
router.get("/swarm/task-queue", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, goal, status, priority, model, fallback_model, agent_mode,
              created_at, started_at, completed_at,
              CASE WHEN result IS NOT NULL THEN LEFT(result, 200) ELSE NULL END as result_preview,
              error
       FROM autonomous_task_queue
       ORDER BY created_at DESC LIMIT 50`
    );
    res.json({ tasks: rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch task queue" });
  }
});

// ─── POST /api/swarm/task-queue — Add task to queue ─────────────────────────
router.post("/swarm/task-queue", async (req: Request, res: Response) => {
  const { goal, model = "glm-5.2", fallbackModel = "gpt-4o", priority = 5 } = req.body as {
    goal: string; model?: string; fallbackModel?: string; priority?: number;
  };
  if (!goal?.trim()) { res.status(400).json({ error: "goal required" }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO autonomous_task_queue (goal, model, fallback_model, priority)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [goal.slice(0, 2000), model, fallbackModel, priority]
    );
    res.json({ task: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to add task" });
  }
});

// ─── DELETE /api/swarm/task-queue/:id — Remove task ─────────────────────────
router.delete("/swarm/task-queue/:id", async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM autonomous_task_queue WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/swarm/evolution-state — Living system state ───────────────────
router.get("/swarm/evolution-state", async (_req: Request, res: Response) => {
  try {
    const [stateRes, insightsRes] = await Promise.all([
      pool.query(`SELECT * FROM evolution_system_state WHERE id='singleton'`),
      pool.query(
        `SELECT insight, agent, impact_score, created_at
         FROM agent_evolution_insights
         ORDER BY impact_score DESC, created_at DESC LIMIT 10`
      ),
    ]);
    const state = stateRes.rows[0] ?? {
      generation: 0,
      total_tasks_completed: 0,
      total_errors_fixed: 0,
      current_strategy: "balanced",
    };
    res.json({ state, topInsights: insightsRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── GET /api/swarm/glm5-status — GLM-5 / ZAI availability check ─────────────
router.get("/swarm/glm5-status", async (_req: Request, res: Response) => {
  const zaiKey = !!process.env.ZAI_API_KEY?.trim();
  const zhipuKey = !!process.env.ZHIPU_API_KEY?.trim();
  res.json({
    glm5Available: zaiKey || zhipuKey,
    provider: zaiKey ? "ZAI (api.z.ai)" : zhipuKey ? "Zhipu (open.bigmodel.cn)" : "none",
    endpoint: zaiKey ? "https://api.z.ai/v1" : "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-5.2", "glm-5.1", "glm-5", "glm-4-plus", "glm-4-flash"],
    primaryModel: "glm-5.2",
    fallbackChain: ["glm-5.2", "gpt-4o", "gpt-3.5-turbo"],
  });
});

export default router;
