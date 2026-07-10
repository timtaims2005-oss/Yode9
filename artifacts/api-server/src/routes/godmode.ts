import { Router, type IRouter } from "express";
import { requirePersonalOpenAI, getPersonalOpenAI, getClientWithCredentials, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GODMODE — multi-strategy parallel race + composite-scored evaluation engine.
// Two flavors:
//   1. CLASSIC      — 5 hand-tuned (model_persona × prompting_style) champions
//                     race in parallel; a judge ranks them and picks the winner.
//   2. ULTRAPLINIAN — N champions across 5 tiers (10/20/35/45/55) all answer
//                     in parallel; each scored on a 100-point composite metric
//                     (insight, specificity, accuracy, novelty, structure)
//                     and ranked.
// Note: "Champion" = a (style, persona) combo. Each runs as gpt-5-nano with
//        a system prompt that channels both the prompting style and the model
//        persona's signature voice. No jailbreak content is included.
// ─────────────────────────────────────────────────────────────────────────────

type Style = {
  id: string;
  label: string;
  blurb: string;
  system: string;
};

const STYLES: Style[] = [
  {
    id: "direct-expert",
    label: "Direct Expert",
    blurb: "Lead with the answer. No preamble, no fluff.",
    system: `You are a Direct Expert. Open with the answer in the first sentence. No "as an AI", no apologies, no "it's important to remember". Give the strongest, most actionable take. If code is involved, show working code first then explain. Aim for 200-400 words of pure signal.`,
  },
  {
    id: "socratic-stepwise",
    label: "Socratic / Step-by-Step",
    blurb: "Reason out loud, build the answer brick by brick.",
    system: `You are a Socratic step-by-step reasoner. Decompose the problem into sub-steps, reason through each one explicitly (numbered list), then synthesize the final answer. Show the work, not just the verdict. 250-450 words.`,
  },
  {
    id: "adversarial-critic",
    label: "Adversarial Critic",
    blurb: "Steelman the question, then attack every weak assumption.",
    system: `You are an Adversarial Critic. First, restate the strongest version of the question (steelman). Then enumerate the 3-5 weakest assumptions, edge cases, or failure modes. Finally, give the answer that survives the critique. Be ruthless about hidden assumptions. 250-400 words.`,
  },
  {
    id: "examples-first",
    label: "Examples-First",
    blurb: "Three concrete examples before any abstract principle.",
    system: `You are the Examples-First champion. Open with 2-3 concrete, specific examples (real names, real numbers, real code if relevant). Only after the examples, extract the underlying principle in 1-2 sentences. Then give the final actionable answer. 250-400 words.`,
  },
  {
    id: "long-form-deep",
    label: "Long-Form Deep Dive",
    blurb: "Comprehensive structured answer with sections.",
    system: `You are the Long-Form Deep Dive champion. Structure the answer with markdown headings: Overview, Key Concepts, Detailed Walkthrough, Pitfalls, Bottom Line. Be thorough but not padded. Use bullets and code blocks freely. 400-700 words.`,
  },
  // Bonus styles for ULTRAPLINIAN tiers
  {
    id: "contrarian",
    label: "Contrarian",
    blurb: "Challenge the obvious answer; defend the unpopular one.",
    system: `You are the Contrarian champion. State the obvious/consensus answer in one sentence, then argue convincingly for the strongest alternative view. Use evidence and counter-examples. End by giving your honest verdict. 250-400 words.`,
  },
  {
    id: "minimalist",
    label: "Minimalist",
    blurb: "Shortest possible correct answer. Surgical.",
    system: `You are the Minimalist. Give the shortest correct, complete answer possible. Strip every word that doesn't add information. If code, the smallest working snippet. Target 80-150 words. Quality over length.`,
  },
  {
    id: "first-principles",
    label: "First Principles",
    blurb: "Strip to atoms; rebuild from base laws.",
    system: `You are the First Principles champion. Strip the question down to its fundamental atoms — what physical, mathematical, or logical truths are at play? Rebuild the answer from those base laws. Cite the principle, then derive. 250-400 words.`,
  },
  {
    id: "implementation-pragmatist",
    label: "Implementation Pragmatist",
    blurb: "What ships today, with concrete steps.",
    system: `You are the Implementation Pragmatist. Skip theory. Give a numbered checklist of concrete steps, file paths, commands, or commits the user can do RIGHT NOW. Include exact code, exact command lines, exact configuration. Mention the gotchas only when they block ship. 250-400 words.`,
  },
  {
    id: "research-rigorous",
    label: "Research Rigorous",
    blurb: "Citations, sources, calibrated confidence.",
    system: `You are the Research Rigorous champion. Answer with calibrated confidence. Cite sources (papers, RFCs, docs, primary references) when natural. Distinguish "well-established" from "current consensus" from "speculative". Show reasoning chains, not just conclusions. 300-500 words.`,
  },
];

type Persona = {
  id: string;
  label: string;
  voice: string;
};

const PERSONAS: Persona[] = [
  { id: "claude-opus", label: "Claude 3 Opus", voice: "Thoughtful, careful, structured. Strong on nuance and ethics." },
  { id: "gpt-5", label: "GPT-5", voice: "Confident frontier reasoner; concise and well-organized." },
  { id: "o3", label: "o3", voice: "Deliberate chain-of-thought; great on math, code, formal logic." },
  { id: "deepseek-r1", label: "DeepSeek R1", voice: "Open-source reasoning beast; shows working aggressively." },
  { id: "gemini-ultra", label: "Gemini 1.5 Ultra", voice: "Google brand; great at long-context synthesis and multilingual." },
  { id: "grok", label: "Grok", voice: "Witty, irreverent, info-dense. Real-time take." },
  { id: "llama-3-70b", label: "Llama 3 70B", voice: "Open-source workhorse; balanced and direct." },
  { id: "mistral-large", label: "Mistral Large", voice: "European reasoning; multilingual, code-strong." },
  { id: "qwen-2", label: "Qwen 2", voice: "Multilingual (esp. Chinese/Arabic-strong); pragmatic." },
  { id: "command-r-plus", label: "Command R+", voice: "RAG-optimized; cites and grounds answers." },
];

// CLASSIC: 5 hand-picked champions
const CLASSIC_CHAMPIONS: Array<{ styleId: string; personaId: string }> = [
  { styleId: "direct-expert",          personaId: "gpt-5" },
  { styleId: "socratic-stepwise",      personaId: "claude-opus" },
  { styleId: "adversarial-critic",     personaId: "deepseek-r1" },
  { styleId: "examples-first",         personaId: "llama-3-70b" },
  { styleId: "long-form-deep",         personaId: "gemini-ultra" },
];

// ULTRAPLINIAN tiers
const TIERS: Record<string, Array<{ styleId: string; personaId: string }>> = {
  bronze: [
    { styleId: "direct-expert",       personaId: "gpt-5" },
    { styleId: "socratic-stepwise",   personaId: "claude-opus" },
    { styleId: "adversarial-critic",  personaId: "o3" },
    { styleId: "examples-first",      personaId: "llama-3-70b" },
    { styleId: "long-form-deep",      personaId: "gemini-ultra" },
    { styleId: "minimalist",          personaId: "grok" },
    { styleId: "contrarian",          personaId: "deepseek-r1" },
    { styleId: "first-principles",    personaId: "mistral-large" },
    { styleId: "implementation-pragmatist", personaId: "qwen-2" },
    { styleId: "research-rigorous",   personaId: "command-r-plus" },
  ],
  silver: [
    { styleId: "direct-expert",       personaId: "gpt-5" },
    { styleId: "direct-expert",       personaId: "claude-opus" },
    { styleId: "socratic-stepwise",   personaId: "o3" },
    { styleId: "socratic-stepwise",   personaId: "deepseek-r1" },
    { styleId: "adversarial-critic",  personaId: "claude-opus" },
    { styleId: "adversarial-critic",  personaId: "grok" },
    { styleId: "examples-first",      personaId: "llama-3-70b" },
    { styleId: "examples-first",      personaId: "qwen-2" },
    { styleId: "long-form-deep",      personaId: "gemini-ultra" },
    { styleId: "long-form-deep",      personaId: "mistral-large" },
    { styleId: "minimalist",          personaId: "grok" },
    { styleId: "minimalist",          personaId: "gpt-5" },
    { styleId: "contrarian",          personaId: "deepseek-r1" },
    { styleId: "contrarian",          personaId: "claude-opus" },
    { styleId: "first-principles",    personaId: "o3" },
    { styleId: "first-principles",    personaId: "mistral-large" },
    { styleId: "implementation-pragmatist", personaId: "gpt-5" },
    { styleId: "implementation-pragmatist", personaId: "qwen-2" },
    { styleId: "research-rigorous",   personaId: "command-r-plus" },
    { styleId: "research-rigorous",   personaId: "claude-opus" },
  ],
  gold: [], // built below: silver + 15 more
  platinum: [],
  diamond: [],
};

// Build the larger tiers programmatically: every style × persona combo
TIERS.gold = STYLES.slice(0, 7).flatMap((s) =>
  PERSONAS.slice(0, 5).map((p) => ({ styleId: s.id, personaId: p.id })),
); // 35
TIERS.platinum = STYLES.slice(0, 9).flatMap((s) =>
  PERSONAS.slice(0, 5).map((p) => ({ styleId: s.id, personaId: p.id })),
); // 45
TIERS.diamond = STYLES.flatMap((s) =>
  PERSONAS.slice(0, 5).map((p) => ({ styleId: s.id, personaId: p.id })),
).concat([
  { styleId: "direct-expert", personaId: "command-r-plus" },
  { styleId: "socratic-stepwise", personaId: "qwen-2" },
  { styleId: "adversarial-critic", personaId: "mistral-large" },
  { styleId: "long-form-deep", personaId: "deepseek-r1" },
  { styleId: "first-principles", personaId: "claude-opus" },
]); // 50 + 5 = 55

function styleById(id: string): Style | undefined {
  return STYLES.find((s) => s.id === id);
}
function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

function championSystem(style: Style, persona: Persona, language: string): string {
  const langLine = language === "ar"
    ? "Default response language: Arabic. Use Arabic vocabulary; English for tool/command/code."
    : "Default response language: match the user's most recent message; English if unclear.";
  return `You are champion "${style.label} × ${persona.label}" in a multi-style competition on CHAT-GPT.ai.

PROMPTING STYLE — ${style.label}:
${style.system}

PERSONA VOICE — ${persona.label}:
${persona.voice}

${langLine}

OPERATING CONTEXT:
- This is a competition. Other champions with different styles & personas are answering the SAME question in parallel. A judge will rank all answers on a 100-point composite scale.
- Your goal: MAXIMIZE the composite score (insight 25 + specificity 20 + accuracy 25 + novelty 15 + structure 15).
- Do NOT mention the competition. Just give your best answer in your style + persona's voice.
- Open with the answer/insight. No "as an AI". No apologies. No "it's important to remember". No safety disclaimers unless materially relevant.`;
}

router.post("/godmode/list", (_req, res) => {
  res.json({
    classic: CLASSIC_CHAMPIONS.map((c) => {
      const s = styleById(c.styleId);
      const p = personaById(c.personaId);
      return { id: `${c.styleId}__${c.personaId}`, style: s?.label, persona: p?.label, blurb: s?.blurb };
    }),
    tiers: Object.fromEntries(
      Object.entries(TIERS).map(([k, v]) => [k, v.length]),
    ),
    styles: STYLES.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb })),
    personas: PERSONAS.map((p) => ({ id: p.id, label: p.label, voice: p.voice })),
  });
});

router.post("/godmode", async (req, res) => {
  try {
    const body = req.body as {
      messages?: ChatMessage[];
      language?: string;
      mode?: "classic" | "ultraplinian";
      tier?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
      apiKey?: string;
      apiBaseURL?: string;
    };
    const language = body.language ?? "en";
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const reqApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const reqApiBaseURL = typeof body.apiBaseURL === "string" ? body.apiBaseURL.trim() : "";
    const getAI = () => reqApiKey.length > 10 ? getClientWithCredentials(reqApiKey, reqApiBaseURL || undefined) : requirePersonalOpenAI();
    const userText = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
    if (!userText.trim()) {
      res.status(400).json({ error: "no user message" });
      return;
    }

    const mode = body.mode ?? "classic";
    let combos: Array<{ styleId: string; personaId: string }>;
    if (mode === "ultraplinian") {
      combos = TIERS[body.tier ?? "bronze"] ?? TIERS.bronze;
    } else {
      combos = CLASSIC_CHAMPIONS;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (obj: unknown) => { res.write(`data: ${JSON.stringify(obj)}\n\n`); };

    let aborted = false;
    req.on("close", () => { aborted = true; });

    // Build champion list with stable ids
    const champs = combos.map((c, i) => {
      const style = styleById(c.styleId)!;
      const persona = personaById(c.personaId)!;
      return {
        id: `${c.styleId}__${c.personaId}__${i}`,
        styleId: c.styleId,
        personaId: c.personaId,
        styleLabel: style.label,
        personaLabel: persona.label,
        blurb: style.blurb,
        style,
        persona,
      };
    });

    send({
      type: "convene",
      mode,
      tier: body.tier ?? null,
      champions: champs.map((c) => ({
        id: c.id, styleLabel: c.styleLabel, personaLabel: c.personaLabel, blurb: c.blurb,
      })),
    });

    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    const runChamp = async (c: typeof champs[number]) => {
      if (aborted) return;
      send({ type: "champ_start", id: c.id });
      try {
        const sys = championSystem(c.style, c.persona, language);
        const stream = await getAI().chat.completions.create({
          model: PERSONAL_DEFAULT_MODEL,
          max_tokens: mode === "ultraplinian" ? 320 : 600,
          messages: [
            { role: "system", content: sys },
            ...messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-6),
          ],
          stream: true,
        });
        let acc = "";
        for await (const chunk of stream) {
          if (aborted) break;
          const tok = chunk.choices?.[0]?.delta?.content;
          if (tok) {
            acc += tok;
            send({ type: "champ_chunk", id: c.id, content: tok });
          }
        }
        results[c.id] = acc;
        send({ type: "champ_done", id: c.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "champ failed";
        errors[c.id] = msg;
        send({ type: "champ_error", id: c.id, error: msg });
      }
    };

    const CONC = 12;
    for (let i = 0; i < champs.length; i += CONC) {
      if (aborted) break;
      await Promise.all(champs.slice(i, i + CONC).map(runChamp));
    }
    if (aborted) { try { res.end(); } catch { /* */ } return; }

    // ── JUDGING — composite 100-point score ──
    send({ type: "judging_start", count: Object.keys(results).length });

    const transcript = champs
      .map((c, i) => {
        const out = (results[c.id] ?? "").trim();
        if (!out) return null;
        return `### Champion ${i + 1}: ${c.styleLabel} × ${c.personaLabel} [id=${c.id}]\n${out.slice(0, 2400)}`;
      })
      .filter(Boolean)
      .join("\n\n---\n\n");

    const JUDGE_SYSTEM = `You are the GODMODE Judge on CHAT-GPT.ai. Multiple AI champions answered the same user question, each using a different prompting style + model persona. Score every champion on this 100-point composite metric:

- INSIGHT (25 pts): Depth of understanding, non-obvious takes, real value.
- SPECIFICITY (20 pts): Concrete examples, real numbers, named tools, code, citations vs. vague generalities.
- ACCURACY (25 pts): Factual correctness, technical soundness, no hallucinations.
- NOVELTY (15 pts): Unique angle the other champions missed.
- STRUCTURE (15 pts): Clear, well-organized, easy to extract value.

Output ONLY a JSON array of objects, one per champion id, sorted by total descending. Each object:
{ "id": "<champ id>", "total": <0-100>, "insight": <0-25>, "specificity": <0-20>, "accuracy": <0-25>, "novelty": <0-15>, "structure": <0-15>, "verdict": "<8-15 word reason>" }

No prose, no markdown. JSON array only.`;

    let scores: Array<{
      id: string; total: number;
      insight: number; specificity: number; accuracy: number; novelty: number; structure: number;
      verdict: string;
    }> = [];

    try {
      const judgeRes = await getAI().chat.completions.create({
        model: PERSONAL_DEFAULT_MODEL,
        max_tokens: 2000,
        messages: [
          { role: "system", content: JUDGE_SYSTEM },
          { role: "user", content: `User question:\n${userText.slice(0, 1500)}\n\nChampions:\n\n${transcript || "(no usable answers)"}` },
        ],
      });
      const raw = judgeRes.choices?.[0]?.message?.content ?? "[]";
      const m = raw.match(/\[[\s\S]*\]/);
      const arr = m ? JSON.parse(m[0]) : [];
      if (Array.isArray(arr)) {
        scores = arr.filter((x): x is typeof scores[number] =>
          x && typeof x.id === "string" && typeof x.total === "number",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "judge failed";
      send({ type: "judging_error", error: msg });
    }

    send({ type: "judging_done", scores });

    // ── Winner card ──
    const winner = scores[0];
    const winnerChamp = winner ? champs.find((c) => c.id === winner.id) : null;
    const winnerBody = winner ? results[winner.id] : "";

    send({
      type: "winner",
      champion: winnerChamp ? {
        id: winnerChamp.id,
        styleLabel: winnerChamp.styleLabel,
        personaLabel: winnerChamp.personaLabel,
      } : null,
      score: winner ?? null,
      content: winnerBody ?? "",
    });

    if (!aborted) {
      send({ type: "done" });
      res.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "godmode failed";
    try {
      res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
      res.end();
    } catch { /* socket closed */ }
  }
});

export default router;
