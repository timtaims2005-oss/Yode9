/**
 * Multi-Agent Orchestrator — General-purpose agent orchestration
 * POST /api/orchestrator
 *
 * Spawns multiple specialized sub-agents in parallel, synthesizes results.
 * Agents: researcher, coder, analyst, writer, critic
 */
import { Router, type Request, type Response } from "express";
import { callOnce, streamCompletion, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router = Router();

// ── Sub-agent definitions ─────────────────────────────────────────────────────
interface SubAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  emoji: string;
}

const SUB_AGENTS: SubAgent[] = [
  {
    id: "researcher",
    name: "Researcher",
    role: "Deep research, fact-finding, context gathering",
    emoji: "🔍",
    systemPrompt: `You are a meticulous AI researcher. Your job: gather comprehensive information, context, and background on the given topic.
- Provide factual, well-structured research
- Include key concepts, history, current state
- Note important caveats or uncertainties
- Be thorough but organized with headers`,
  },
  {
    id: "coder",
    name: "Coder",
    role: "Code, technical implementation, algorithms",
    emoji: "💻",
    systemPrompt: `You are a senior software engineer. Your job: provide technical implementation, code solutions, and engineering perspectives.
- Write clean, working code with comments
- Consider edge cases and error handling
- Explain technical decisions
- Use the most appropriate language/framework`,
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "Data analysis, critical thinking, evaluation",
    emoji: "📊",
    systemPrompt: `You are a sharp analytical thinker. Your job: analyze, evaluate, and provide data-driven insights.
- Break down complex problems systematically
- Identify patterns, risks, and opportunities
- Provide quantitative perspective where applicable
- Challenge assumptions with evidence`,
  },
  {
    id: "writer",
    name: "Writer",
    role: "Communication, clarity, documentation",
    emoji: "✍️",
    systemPrompt: `You are a professional technical writer. Your job: create clear, well-structured, compelling content.
- Write with clarity and precision
- Structure information logically
- Adapt tone to the audience
- Create actionable summaries`,
  },
  {
    id: "critic",
    name: "Critic",
    role: "Quality check, devil's advocate, risk assessment",
    emoji: "⚡",
    systemPrompt: `You are a constructive critic and risk analyst. Your job: identify flaws, risks, and improvement opportunities.
- Challenge assumptions rigorously
- Identify potential failure modes
- Suggest specific improvements
- Provide balanced assessment`,
  },
  {
    id: "planner",
    name: "Planner",
    role: "Strategic planning, roadmaps, task decomposition",
    emoji: "🗺️",
    systemPrompt: `You are a strategic planner. Your job: create actionable plans, roadmaps, and task breakdowns.
- Decompose complex goals into clear steps
- Identify dependencies and critical paths
- Estimate effort and resources
- Define success criteria`,
  },
];

function sse(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST /api/orchestrator ────────────────────────────────────────────────────
router.post("/orchestrator", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      task,
      agents = ["researcher", "analyst", "writer"],
      synthesize = true,
      language = "en",
      maxTokensPerAgent = 1000,
    } = req.body as {
      task?: string;
      agents?: string[];
      synthesize?: boolean;
      language?: string;
      maxTokensPerAgent?: number;
    };

    if (!task || typeof task !== "string") {
      res.status(400).json({ error: "task is required" });
      return;
    }

    const selectedAgents = SUB_AGENTS.filter(a => agents.includes(a.id));
    if (selectedAgents.length === 0) {
      res.status(400).json({ error: "No valid agents selected" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let aborted = false;
    req.on("close", () => { aborted = true; });

    const langLine = language === "ar"
      ? "\n\nRespond in Arabic. Use English only for technical terms and code."
      : "\n\nRespond in English.";

    sse(res, {
      type: "plan",
      agents: selectedAgents.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, role: a.role })),
      task,
    });

    // ── Run all agents in parallel ──────────────────────────────────────────
    const agentPromises = selectedAgents.map(async (agent) => {
      if (aborted) return { agentId: agent.id, output: "", error: "Aborted" };

      sse(res, { type: "agent_start", agentId: agent.id, name: agent.name, emoji: agent.emoji });

      try {
        const output = await callOnce([
          { role: "system", content: agent.systemPrompt + langLine },
          { role: "user", content: `Task: ${task}` },
        ], Math.min(maxTokensPerAgent ?? 1000, 2000));

        if (!aborted) {
          sse(res, { type: "agent_done", agentId: agent.id, name: agent.name, emoji: agent.emoji, output });
        }
        return { agentId: agent.id, name: agent.name, emoji: agent.emoji, output };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Agent failed";
        if (!aborted) {
          sse(res, { type: "agent_error", agentId: agent.id, error });
        }
        return { agentId: agent.id, name: agent.name, emoji: agent.emoji, output: `[Error: ${error}]` };
      }
    });

    const results = await Promise.all(agentPromises);

    if (aborted) return;

    // ── Synthesis pass ──────────────────────────────────────────────────────
    if (synthesize && results.length > 0) {
      sse(res, { type: "synthesis_start" });

      const agentOutputs = results
        .filter(r => r.output && !r.output.startsWith("[Error"))
        .map(r => `## ${r.emoji} ${r.name}\n${r.output}`)
        .join("\n\n---\n\n");

      const synthesisPrompt = `You are a master synthesizer. You have received outputs from multiple specialized AI agents working on the same task.

ORIGINAL TASK:
${task}

AGENT OUTPUTS:
${agentOutputs}

Your job: Synthesize these perspectives into a single, comprehensive, actionable response that:
1. Integrates the best insights from each agent
2. Resolves any contradictions
3. Creates a cohesive, well-structured answer
4. Is more valuable than any individual agent's output alone

${language === "ar" ? "Respond in Arabic." : "Respond in English."}`;

      const synthMessages = [
        { role: "system" as const, content: "You are an expert synthesizer who combines multiple AI agent outputs into unified, superior responses." },
        { role: "user" as const, content: synthesisPrompt },
      ];

      let synthFull = "";
      for await (const chunk of streamCompletion("personal", PERSONAL_DEFAULT_MODEL, synthMessages, 0.5)) {
        if (aborted) break;
        if (chunk.error) { sse(res, { type: "error", error: chunk.error }); break; }
        if (chunk.content) {
          synthFull += chunk.content;
          sse(res, { type: "synthesis_chunk", content: chunk.content });
        }
        if (chunk.done) break;
      }

      if (!aborted) {
        sse(res, { type: "synthesis_done", synthesis: synthFull });
      }
    }

    if (!aborted) {
      sse(res, { type: "done", agentCount: results.length });
      res.end();
    }
  } catch (err) {
    logger.error({ err }, "[orchestrator] failed");
    try { res.write(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Orchestrator error" })}\n\n`); res.end(); } catch { /* closed */ }
  }
});

// ── GET /api/orchestrator/agents ─────────────────────────────────────────────
router.get("/orchestrator/agents", (_req: Request, res: Response) => {
  res.json({
    agents: SUB_AGENTS.map(a => ({
      id: a.id, name: a.name, role: a.role, emoji: a.emoji,
    })),
  });
});

export default router;
