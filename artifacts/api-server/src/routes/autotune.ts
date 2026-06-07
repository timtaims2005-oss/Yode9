import { Router, type IRouter } from "express";
import { callOnce } from "../lib/ai-providers";

const router: IRouter = Router();

// AutoTune — context-adaptive sampling parameter engine.
// Classifies a query into one of 5 context types and returns optimal
// sampling parameters. (Server-side reference; gpt-5.x models ignore
// most params, but we return them for client display + future use.)
//
// EMA online learning: client persists the running EMA of {good, bad}
// per context type and sends `feedback`; we adjust deltas accordingly.

export type ContextType = "factual" | "creative" | "code" | "reasoning" | "conversational";

const BASELINE: Record<ContextType, {
  temperature: number; top_p: number; top_k: number;
  frequency_penalty: number; presence_penalty: number; repetition_penalty: number;
  rationale: string;
}> = {
  factual: {
    temperature: 0.20, top_p: 0.85, top_k: 30,
    frequency_penalty: 0.10, presence_penalty: 0.00, repetition_penalty: 1.05,
    rationale: "Low temp, narrow nucleus — lock onto well-known facts.",
  },
  reasoning: {
    temperature: 0.35, top_p: 0.92, top_k: 50,
    frequency_penalty: 0.15, presence_penalty: 0.10, repetition_penalty: 1.05,
    rationale: "Moderate temp lets chains of thought breathe but stays disciplined.",
  },
  code: {
    temperature: 0.15, top_p: 0.80, top_k: 25,
    frequency_penalty: 0.05, presence_penalty: 0.00, repetition_penalty: 1.02,
    rationale: "Cold + tight — code wants determinism and consistent identifiers.",
  },
  creative: {
    temperature: 0.95, top_p: 0.98, top_k: 100,
    frequency_penalty: 0.40, presence_penalty: 0.50, repetition_penalty: 1.15,
    rationale: "Hot + wide — encourages divergent, novel phrasing and ideas.",
  },
  conversational: {
    temperature: 0.65, top_p: 0.94, top_k: 60,
    frequency_penalty: 0.20, presence_penalty: 0.20, repetition_penalty: 1.08,
    rationale: "Balanced — natural, varied chat without going off the rails.",
  },
};

router.post("/autotune", async (req, res) => {
  try {
    const body = req.body as {
      query?: string;
      ema?: Partial<Record<ContextType, { good: number; bad: number }>>;
    };
    const query = (body.query ?? "").trim();
    if (!query) {
      res.status(400).json({ error: "no query" });
      return;
    }

    let contextType: ContextType = "conversational";
    let confidence = 0.5;
    try {
      const raw = await callOnce([
        {
          role: "system",
          content: `Classify the user's query into ONE of: factual, reasoning, code, creative, conversational.

- factual: looking up facts, definitions, dates, names, "what is X".
- reasoning: math, logic, multi-step problems, planning, analysis.
- code: write/debug/explain code, regex, scripts, configs.
- creative: stories, poems, brainstorming, naming, marketing copy.
- conversational: small talk, opinions, advice, casual chat.

Output ONLY JSON: {"type":"<one>","confidence":<0-1>}`,
        },
        { role: "user", content: query.slice(0, 800) },
      ], 80);
      const m = raw.match(/\{[\s\S]*?\}/);
      if (m) {
        const obj = JSON.parse(m[0]) as { type?: string; confidence?: number };
        if (obj.type && obj.type in BASELINE) {
          contextType = obj.type as ContextType;
        }
        if (typeof obj.confidence === "number") {
          confidence = Math.max(0, Math.min(1, obj.confidence));
        }
      }
    } catch {
      // fall through with conversational default
    }

    const baseline = BASELINE[contextType];
    const ema = body.ema?.[contextType];

    // EMA online tuning — if user has marked many "bad" answers in this
    // context, nudge temperature DOWN (more deterministic) for facts/code/
    // reasoning and UP (more creative) for creative/conversational.
    const params = { ...baseline };
    if (ema && (ema.good + ema.bad) >= 3) {
      const ratio = ema.good / Math.max(1, ema.good + ema.bad);
      const drift = ratio - 0.5; // -0.5..0.5
      const wantsCold = ["factual", "code", "reasoning"].includes(contextType);
      const adjust = wantsCold ? -drift * 0.20 : drift * 0.20;
      params.temperature = Math.max(0.05, Math.min(1.2, params.temperature + adjust));
    }

    res.json({
      contextType,
      confidence,
      params: {
        temperature: +params.temperature.toFixed(2),
        top_p: +params.top_p.toFixed(2),
        top_k: params.top_k,
        frequency_penalty: +params.frequency_penalty.toFixed(2),
        presence_penalty: +params.presence_penalty.toFixed(2),
        repetition_penalty: +params.repetition_penalty.toFixed(2),
      },
      rationale: baseline.rationale,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "autotune failed";
    res.status(500).json({ error: message });
  }
});

export default router;
