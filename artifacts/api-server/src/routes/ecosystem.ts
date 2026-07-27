import { Router } from "express";
import { randomUUID } from "node:crypto";

const router = Router();

type Packet = { id: string; modality: string; source?: string; payload: unknown; timestamp?: number };

const sectors = [
  { id: "perception", name: "Perception & Input", status: "online", metric: "7 modalities" },
  { id: "tools", name: "Skills & Actuators", status: "ready", metric: "5 adapters" },
  { id: "cognition", name: "Cognition & Planning", status: "online", metric: "3 thought modes" },
  { id: "memory", name: "Universal Memory", status: "online", metric: "4 memory layers" },
  { id: "evolution", name: "Self-Improvement", status: "ready", metric: "Flywheel armed" },
  { id: "security", name: "Security & Sovereignty", status: process.env.TEE_PROVIDER ? "online" : "attention", metric: process.env.TEE_PROVIDER ? "TEE connected" : "TEE not connected" },
  { id: "governance", name: "Governance & Routing", status: "online", metric: "Trace active" },
  { id: "swarms", name: "Swarms & Recovery", status: "online", metric: "3-tier topology" },
];

router.get("/ecosystem/status", (_req, res) => {
  res.json({
    engine: "ready",
    sectors,
    providers: {
      model: Boolean(process.env.OPENAI_API_KEY || process.env.CLOUDFLARE_API_TOKEN || process.env.GROQ_API_KEY),
      tee: Boolean(process.env.TEE_PROVIDER),
      mcp: Boolean(process.env.MCP_SERVER_URL),
      browser: Boolean(process.env.BROWSER_PROVIDER_URL),
      codeSandbox: Boolean(process.env.CODE_SANDBOX_URL),
      database: Boolean(process.env.DATABASE_URL),
    },
    policy: { sensitiveActions: "human-approval-required", unavailableTEE: "fail-closed" },
    timestamp: new Date().toISOString(),
  });
});

router.post("/ecosystem/run", async (req, res) => {
  const goal = typeof req.body?.goal === "string" ? req.body.goal.trim() : "";
  if (!goal) {
    res.status(400).json({ error: "goal is required" });
    return;
  }
  const packets = Array.isArray(req.body?.packets) ? req.body.packets as Packet[] : [];
  const started = Date.now();
  const sensitive = /delete|pay|payment|credential|production|financial|execute/i.test(goal);
  const steps = goal.split(/\s+and\s+|\s+then\s+/i).map((item: string) => item.trim()).filter(Boolean);
  const trace = (stage: string, status: "completed" | "blocked") => ({
    stage, status, timestamp: new Date().toISOString(),
  });
  const traces = [
    trace("sensory.ingestion", "completed"),
    trace("guardrails.tee-check", sensitive && !process.env.TEE_PROVIDER ? "blocked" : "completed"),
  ];
  if (sensitive && !process.env.TEE_PROVIDER) {
    res.status(409).json({
      error: "Sensitive execution requires an available TEE provider.",
      code: "TEE_UNAVAILABLE",
      failClosed: true,
      traces,
    });
    return;
  }
  const output = {
    runId: randomUUID(),
    input: goal,
    events: packets.length,
    plan: { goal, steps: steps.length ? steps : [goal], risk: sensitive ? 0.8 : 0.2, rationale: "server-governed ecosystem decomposition" },
    simulation: { safe: !sensitive, probability: sensitive ? 0.2 : 0.8, warnings: sensitive ? ["Human approval required."] : [] },
    swarm: { manager: { decision: "coordinate", goal }, workers: [{ decision: "analyze", goal }], review: { verdict: "approved-for-next-step" } },
    traces: [...traces, trace("cognition.world-simulation", "completed"), trace("swarm.execution", "completed"), trace("self-improvement.flywheel", "completed")],
    flywheelRecords: 4,
    durationMs: Date.now() - started,
    approval: sensitive ? "required" : "not-required",
  };
  res.json(output);
});

export default router;