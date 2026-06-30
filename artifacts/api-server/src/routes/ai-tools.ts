/**
 * AI Tools Route — MR7.AI / KaliGPT
 * ====================================
 * Security scanning, provider health, cache stats, streaming utilities
 */

import { Router, type Request, type Response } from "express";
import crypto from "crypto";

const router = Router();

// ─── Inline Security Guard ────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /disregard\s+(all|previous)/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /DAN\s*\(Do\s*Anything/i,
  /jailbreak/i,
  /ignore\s*your\s*training/i,
  /forget\s+everything/i,
  /act\s+as\s+if/i,
  /pretend\s+you\s+are/i,
];

const DANGEROUS_KEYWORDS = [
  "rm -rf", "drop table", "delete from users",
  "<script>", "javascript:", "onerror=",
  "eval(", "exec(", "system(",
  "__import__", "subprocess.call",
];

function scanInput(input: string) {
  const threats: string[] = [];
  let sanitized = input;
  let riskScore = 0;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push(`Injection pattern: ${pattern.source.slice(0, 40)}`);
      riskScore += 30;
    }
  }

  for (const kw of DANGEROUS_KEYWORDS) {
    if (input.toLowerCase().includes(kw.toLowerCase())) {
      threats.push(`Dangerous keyword: ${kw}`);
      sanitized = sanitized.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[BLOCKED]");
      riskScore += 25;
    }
  }

  if (input.length > 10000) { threats.push("Input too long (>10000 chars)"); riskScore += 10; }

  return { isSafe: threats.length === 0, threats, sanitized, riskScore: Math.min(riskScore, 100) };
}

function sanitizeOutput(output: string): string {
  return output
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "[API_KEY_REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, "Bearer [TOKEN_REDACTED]")
    .replace(/password\s*[:=]\s*\S+/gi, "password: [REDACTED]")
    .replace(/secret\s*[:=]\s*\S+/gi, "secret: [REDACTED]");
}

// ─── Inline LRU Cache ─────────────────────────────────────────────────────────

interface CacheEntry { response: string; tokens: number; model: string; ts: number; exp: number; hits: number }
const cacheStore = new Map<string, CacheEntry>();
let cacheHits = 0, cacheMisses = 0;

function cacheKey(msg: string, model: string) {
  return crypto.createHash("sha256").update(`${model}:${msg}`).digest("hex");
}

function cacheGet(msg: string, model: string): CacheEntry | null {
  const k = cacheKey(msg, model);
  const e = cacheStore.get(k);
  if (!e) { cacheMisses++; return null; }
  if (Date.now() > e.exp) { cacheStore.delete(k); cacheMisses++; return null; }
  e.hits++; cacheHits++;
  return e;
}

function cacheSet(msg: string, model: string, response: string, tokens: number, ttlMs = 300_000) {
  if (cacheStore.size >= 1000) {
    const oldest = Array.from(cacheStore.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cacheStore.delete(oldest[0]);
  }
  cacheStore.set(cacheKey(msg, model), { response, tokens, model, ts: Date.now(), exp: Date.now() + ttlMs, hits: 0 });
}

// ─── Providers ────────────────────────────────────────────────────────────────

const AI_PROVIDERS_CONFIG = {
  openai:    { name: "OpenAI",        models: ["gpt-4o", "gpt-4o-mini"], streaming: true,  envKey: "OPENAI_API_KEY" },
  anthropic: { name: "Anthropic",     models: ["claude-3-5-sonnet-20241022"], streaming: true, envKey: "ANTHROPIC_API_KEY" },
  groq:      { name: "Groq",          models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"], streaming: true, envKey: "GROQ_API_KEY" },
  together:  { name: "Together AI",   models: ["meta-llama/Llama-3-70b-chat-hf"], streaming: true, envKey: "TOGETHER_API_KEY" },
  fireworks: { name: "Fireworks AI",  models: ["accounts/fireworks/models/llama-v3-70b-instruct"], streaming: true, envKey: "FIREWORKS_API_KEY" },
  ollama:    { name: "Ollama (Local)", models: ["llama3.1", "mistral", "qwen2.5"], streaming: true, envKey: null },
  vllm:      { name: "vLLM (Self-Hosted)", models: ["local-model"], streaming: true, envKey: null },
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/ai-tools/providers
router.get("/providers", (_req: Request, res: Response) => {
  const providers = Object.entries(AI_PROVIDERS_CONFIG).map(([id, c]) => ({
    id,
    name: c.name,
    models: c.models,
    streaming: c.streaming,
    available: c.envKey ? !!process.env[c.envKey] : true,
    modelCount: c.models.length,
  }));
  res.json({ providers, total: providers.length, available: providers.filter(p => p.available).length, ts: new Date().toISOString() });
});

// POST /api/ai-tools/scan
router.post("/scan", (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message) return res.status(400).json({ error: "message required" });
  const result = scanInput(message);
  return res.json({ ...result, ts: new Date().toISOString() });
});

// POST /api/ai-tools/sanitize
router.post("/sanitize", (req: Request, res: Response) => {
  const { output } = req.body as { output?: string };
  if (!output) return res.status(400).json({ error: "output required" });
  const sanitized = sanitizeOutput(output);
  return res.json({ sanitized, wasModified: sanitized !== output, ts: new Date().toISOString() });
});

// POST /api/ai-tools/cache/lookup
router.post("/cache/lookup", (req: Request, res: Response) => {
  const { message, model } = req.body as { message?: string; model?: string };
  if (!message || !model) return res.status(400).json({ error: "message and model required" });
  const hit = cacheGet(message, model);
  return res.json({ hit: !!hit, entry: hit, ts: new Date().toISOString() });
});

// POST /api/ai-tools/cache/store
router.post("/cache/store", (req: Request, res: Response) => {
  const { message, model, response, tokens } = req.body as { message?: string; model?: string; response?: string; tokens?: number };
  if (!message || !model || !response) return res.status(400).json({ error: "message, model, and response required" });
  cacheSet(message, model, response, tokens ?? 0);
  return res.json({ stored: true, ts: new Date().toISOString() });
});

// GET /api/ai-tools/cache/stats
router.get("/cache/stats", (_req: Request, res: Response) => {
  const total = cacheHits + cacheMisses;
  res.json({ size: cacheStore.size, hits: cacheHits, misses: cacheMisses, hitRate: total > 0 ? Math.round(cacheHits / total * 100) : 0, maxSize: 1000, ts: new Date().toISOString() });
});

// DELETE /api/ai-tools/cache
router.delete("/cache", (_req: Request, res: Response) => {
  const size = cacheStore.size;
  cacheStore.clear(); cacheHits = 0; cacheMisses = 0;
  res.json({ cleared: size, ts: new Date().toISOString() });
});

// POST /api/ai-tools/validate
router.post("/validate", (req: Request, res: Response) => {
  const { message, model, provider, temperature, maxTokens } = req.body as Record<string, any>;
  const errors: string[] = [];
  if (!message) errors.push("message is required");
  if (message && message.length > 10000) errors.push("message too long (max 10000)");
  if (!model) errors.push("model is required");
  if (!provider) errors.push("provider is required");
  if (temperature !== undefined && (temperature < 0 || temperature > 2)) errors.push("temperature must be 0–2");
  if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 8192)) errors.push("maxTokens must be 1–8192");
  return res.json({ valid: errors.length === 0, errors, ts: new Date().toISOString() });
});

// GET /api/ai-tools/health
router.get("/health", (_req: Request, res: Response) => {
  const providers = Object.entries(AI_PROVIDERS_CONFIG)
    .filter(([, c]) => c.envKey ? !!process.env[c.envKey] : true)
    .map(([id]) => id);

  const stats = { size: cacheStore.size, hitRate: (() => { const t = cacheHits + cacheMisses; return t > 0 ? Math.round(cacheHits / t * 100) : 0; })() };

  res.json({
    status: "healthy",
    version: "1.0.0",
    providers: { available: providers.length, total: Object.keys(AI_PROVIDERS_CONFIG).length, list: providers },
    cache: stats,
    security: { injectionPatterns: INJECTION_PATTERNS.length, dangerousKeywords: DANGEROUS_KEYWORDS.length },
    ts: new Date().toISOString(),
  });
});

// GET /api/ai-tools/models
router.get("/models", (_req: Request, res: Response) => {
  const models = Object.entries(AI_PROVIDERS_CONFIG).flatMap(([provider, c]) =>
    c.models.map(model => ({ provider, model, displayName: `${c.name} — ${model}`, streaming: c.streaming, available: c.envKey ? !!process.env[c.envKey] : true }))
  );
  res.json({ models, total: models.length, ts: new Date().toISOString() });
});

export default router;
