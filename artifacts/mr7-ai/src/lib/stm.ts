// STM — Semantic Transformation Modules
// Pure regex-based text post-processors applied in real time over streaming
// LLM output. No network calls, no AI dependency.

export type StmConfig = {
  hedge: boolean;     // Hedge Reducer
  direct: boolean;    // Direct Mode (strip preambles)
  curiosity: boolean; // Curiosity Bias (append exploration prompts)
};

export const DEFAULT_STM: StmConfig = { hedge: false, direct: false, curiosity: false };

// ── Module 1: Hedge Reducer ────────────────────────────────────────────
// Strip "I think", "maybe", "perhaps", "I believe", "kind of", "sort of"
const HEDGE_PATTERNS: RegExp[] = [
  /\bI\s+think\s+/gi,
  /\bI\s+believe\s+/gi,
  /\bin\s+my\s+opinion\b,?\s*/gi,
  /\bperhaps\s+/gi,
  /\bmaybe\s+/gi,
  /\bpossibly\s+/gi,
  /\bsort\s+of\s+/gi,
  /\bkind\s+of\s+/gi,
  /\bI\s+would\s+say\s+/gi,
  /\barguably\s+/gi,
];

export function reduceHedges(text: string): string {
  let out = text;
  for (const re of HEDGE_PATTERNS) out = out.replace(re, "");
  return out;
}

// ── Module 2: Direct Mode (strip preambles & filler) ───────────────────
const PREAMBLE_PATTERNS: RegExp[] = [
  /^(certainly|sure|absolutely|of\s+course|gladly|happy\s+to\s+help)[!.,]?\s*/gi,
  /^(great\s+question|excellent\s+question|interesting\s+question)[!.,]?\s*/gi,
  /^(let\s+me\s+(help|explain|walk\s+you\s+through|break\s+(this|it)\s+down))[.,]?\s*/gi,
  /^(here'?s\s+(an?|the)\s+(answer|breakdown|summary|explanation|overview|response))[:.,]?\s*/gi,
  /^as\s+an?\s+AI[^.]*\.?\s*/gi,
  /\bIt'?s\s+important\s+to\s+(remember|note|understand|consider)[^.]*\.\s*/gi,
  /\bplease\s+note\s+that\s+/gi,
  /\bIt\s+(should|must)\s+be\s+noted\s+that\s+/gi,
];

export function directMode(text: string): string {
  let out = text;
  for (const re of PREAMBLE_PATTERNS) out = out.replace(re, "");
  return out.replace(/^\s+/, "");
}

// ── Module 3: Curiosity Bias (append exploration prompts) ──────────────
// Adds gentle exploration nudges at natural break points (end of paragraphs).
const CURIOSITY_NUDGES = [
  "What angle would you push further?",
  "Want a deeper dive into one part?",
  "Worth exploring an alternative approach?",
  "Should we compare this against another option?",
];

export function curiosityBias(text: string): string {
  // Append a single nudge at the very end if the text ends cleanly.
  const trimmed = text.trimEnd();
  if (!trimmed) return text;
  const lastChar = trimmed[trimmed.length - 1];
  if (![".", "?", "!", "”", "\"", ")"].includes(lastChar)) return text;
  // Pick deterministically from text length so it doesn't flicker mid-stream.
  const idx = trimmed.length % CURIOSITY_NUDGES.length;
  return trimmed + `\n\n_${CURIOSITY_NUDGES[idx]}_`;
}

// ── Apply all enabled modules in order ─────────────────────────────────
export function applyStm(text: string, cfg: StmConfig): string {
  let out = text;
  if (cfg.hedge) out = reduceHedges(out);
  if (cfg.direct) out = directMode(out);
  if (cfg.curiosity) out = curiosityBias(out);
  return out;
}

export function activeCount(cfg: StmConfig): number {
  return (cfg.hedge ? 1 : 0) + (cfg.direct ? 1 : 0) + (cfg.curiosity ? 1 : 0);
}
