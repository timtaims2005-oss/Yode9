import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

export type ProviderName = "openai" | "anthropic" | "groq" | "gemini" | "openrouter" | "custom" | "personal" | "zhipu" | "glm" | "cloudflare" | "mock";

// ─────────────────────────────────────────────────────────────────────────────
// Per-provider Circuit Breaker
// Tracks consecutive failures per provider and blocks a provider for
// COOLDOWN_MS after FAILURE_THRESHOLD consecutive errors. Automatically
// tries a half-open probe after the cooldown expires.
// ─────────────────────────────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 3;   // consecutive failures before opening the circuit
const COOLDOWN_MS       = 60_000; // 1 minute cooldown window

type CBState = "closed" | "open" | "half-open";

interface ProviderCircuit {
  state: CBState;
  failures: number;
  lastFailure: number;
}

const _circuits = new Map<string, ProviderCircuit>();

function getCircuit(provider: string): ProviderCircuit {
  if (!_circuits.has(provider)) {
    _circuits.set(provider, { state: "closed", failures: 0, lastFailure: 0 });
  }
  return _circuits.get(provider)!;
}

/** Returns true if this provider may be attempted right now. */
export function cbCanAttempt(provider: string): boolean {
  const c = getCircuit(provider);
  if (c.state === "closed") return true;
  if (c.state === "open") {
    if (Date.now() - c.lastFailure > COOLDOWN_MS) {
      c.state = "half-open";
      return true; // allow one probe
    }
    return false;
  }
  return true; // half-open: allow probe
}

/** Call after a successful response to reset the circuit. */
export function cbRecordSuccess(provider: string): void {
  const c = getCircuit(provider);
  c.failures = 0;
  c.state = "closed";
}

/** Call after a failure to track it and potentially open the circuit. */
export function cbRecordFailure(provider: string): void {
  const c = getCircuit(provider);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.state === "half-open" || c.failures >= FAILURE_THRESHOLD) {
    c.state = "open";
  }
}

/** Returns a snapshot of all circuit states (for diagnostics / stats). */
export function cbStats(): Record<string, { state: CBState; failures: number; lastFailure: number }> {
  const out: Record<string, { state: CBState; failures: number; lastFailure: number }> = {};
  for (const [k, v] of _circuits.entries()) out[k] = { ...v };
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional exact-match response cache for callOnce() (non-streaming, non-tool)
// Enable by setting: CALL_ONCE_CACHE_ENABLED=true in environment.
// TTL is intentionally short (60 s) — this is purely a cost/latency saver for
// repeated identical prompts (e.g. title generation, prompt enhancement).
// NEVER used for streaming chat or tool-calling paths.
// ─────────────────────────────────────────────────────────────────────────────
const CALL_ONCE_CACHE_ENABLED = process.env.CALL_ONCE_CACHE_ENABLED === "true";
const CALL_ONCE_CACHE_TTL_MS  = 60_000; // 60 seconds

interface CacheEntry { value: string; ts: number }
const _callOnceCache = new Map<string, CacheEntry>();
const CALL_ONCE_CACHE_MAX = 200;

function cacheGet(key: string): string | null {
  if (!CALL_ONCE_CACHE_ENABLED) return null;
  const e = _callOnceCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CALL_ONCE_CACHE_TTL_MS) { _callOnceCache.delete(key); return null; }
  return e.value;
}

function cacheSet(key: string, value: string): void {
  if (!CALL_ONCE_CACHE_ENABLED || !value) return;
  if (_callOnceCache.size >= CALL_ONCE_CACHE_MAX) {
    // evict oldest
    const oldest = _callOnceCache.keys().next().value;
    if (oldest) _callOnceCache.delete(oldest);
  }
  _callOnceCache.set(key, { value, ts: Date.now() });
}

function callOnceCacheKey(messages: Array<{ role: string; content: string }>): string {
  return createHash("sha256").update(JSON.stringify(messages)).digest("hex");
}

export type ProviderInfo = {
  id: ProviderName;
  name: string;
  available: boolean;
  models: string[];
  baseURL?: string;
};

export const CUSTOM_API_BASE_URL =
  process.env.CUSTOM_API_BASE_URL ??
  "https://107b-2003-cb-5f1b-adc8-58f8-bea5-33e-6875.ngrok-free.app/v1";
export const CUSTOM_API_MODEL = process.env.CUSTOM_API_MODEL ?? "deepseek-r1:8b";
export const PERSONAL_DEFAULT_MODEL = process.env.PERSONAL_DEFAULT_MODEL ?? CUSTOM_API_MODEL;

const WORLD_MODELS = [
  // OpenAI
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
  "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
  // Anthropic Claude
  "claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-7-sonnet-20250219",
  // Google Gemini
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro",
  // Meta Llama
  "llama-3.3-70b-instruct", "llama-3.1-8b-instant", "llama-3.1-405b-instruct",
  "llama-3.2-90b-vision-instruct", "llama-3.2-11b-vision-instruct",
  // Mistral
  "mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
  "codestral-latest", "mistral-nemo", "mistral-7b-instruct",
  // DeepSeek (China)
  "deepseek-r1", "deepseek-v3", "deepseek-chat", "deepseek-coder-v2",
  "deepseek-r1-distill-llama-70b",
  // Alibaba Qwen (China)
  "qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct",
  "qwen2.5-coder-32b-instruct", "qwq-32b",
  // Yi / 01.ai (China)
  "yi-lightning", "yi-large", "yi-large-fc", "yi-large-rag",
  // Cohere
  "command-r-plus", "command-r", "command-light",
  // Moonshot (China)
  "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k",
  // Zhipu AI GLM (China)
  "glm-5.2", "glm-5.1", "glm-5", "glm-4-plus", "glm-4", "glm-4-flash", "glm-zero-preview",
  // Baidu ERNIE (China)
  "ernie-4.5-8k", "ernie-4.0-8k", "ernie-3.5-8k",
  // Perplexity
  "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online",
  // Mixtral
  "mixtral-8x7b-instruct", "mixtral-8x22b-instruct",
];

type ProviderConfig = {
  name: string;
  envKey: string;
  baseURL: string;
  models: string[];
  requiresKey?: boolean;
};

const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
    requiresKey: true,
  },
  anthropic: {
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    baseURL: "https://api.anthropic.com",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    requiresKey: true,
  },
  groq: {
    name: "Groq",
    envKey: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    requiresKey: true,
  },
  gemini: {
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
    requiresKey: true,
  },
  openrouter: {
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    models: WORLD_MODELS,
    requiresKey: true,
  },
  custom: {
    name: "Custom / Self-hosted",
    envKey: "CUSTOM_API_KEY",
    baseURL: CUSTOM_API_BASE_URL,
    models: [CUSTOM_API_MODEL],
    requiresKey: true,
  },
  personal: {
    name: "Personal / Custom",
    envKey: "PERSONAL_API_KEY",
    baseURL: "",
    models: [],
    requiresKey: false,
  },
  zhipu: {
    name: "Zhipu AI (GLM-5.2 / GLM-5.1 / GLM-5)",
    envKey: "ZHIPU_API_KEY",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-5.2", "glm-5.1", "glm-5", "glm-4-plus", "glm-4", "glm-4-flash", "glm-zero-preview"],
    requiresKey: true,
  },
  glm: {
    name: "ZAI / GLM-5 (api.z.ai — International)",
    envKey: "ZAI_API_KEY",
    baseURL: "https://api.z.ai/v1",
    models: ["glm-5.2", "glm-5.1", "glm-5", "glm-4-plus", "glm-4", "glm-4-flash", "glm-zero-preview"],
    requiresKey: true,
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    envKey: "CLOUDFLARE_API_TOKEN",
    baseURL: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    models: [
      // Text Generation — chat-capable models (default first for callOnce fallback)
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3.2-3b-instruct",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/mistral/mistral-7b-instruct-v0.1",
      "@cf/mistral/mistral-7b-instruct-v0.2-lora",
      "@cf/google/gemma-7b-it",
      "@cf/google/gemma-2b-it",
      "@cf/qwen/qwen1.5-7b-chat-awq",
      "@cf/qwen/qwen1.5-14b-chat-awq",
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      "@cf/deepseek-ai/deepseek-math-7b-instruct",
      "@cf/microsoft/phi-2",
      "@cf/thebloke/discolm-german-7b-v1-awq",
      "@cf/tiiuae/falcon-7b-instruct",
      "@cf/defog/sqlcoder-7b-2",
      "@cf/openchat/openchat-3.5-0106",
      // Embeddings
      "@cf/neuralmind/bge-base-en-v1.5",
      "@cf/baai/bge-small-en-v1.5",
      "@cf/baai/bge-large-en-v1.5",
      // Translation
      "@cf/meta/m2m100-1.2b",
      // Speech-to-Text
      "@cf/openai/whisper",
      "@cf/openai/whisper-large-v3-turbo",
      // Image Generation
      "@cf/black-forest-labs/flux-1-schnell",
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      "@cf/bytedance/stable-diffusion-xl-lightning",
      "@cf/lykon/dreamshaper-8-lcm",
    ],
    requiresKey: true,
  },
  mock: {
    name: "Local Mock Provider",
    envKey: "LOCAL_MOCK_PROVIDER",
    baseURL: "",
    models: ["mr7-local-simulation"],
    requiresKey: false,
  },
};

function getCloudflareBaseURL(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

// ── Cloudflare Models — dynamic list with 1-hour in-memory cache ──────────
export interface CloudflareModelEntry {
  id: string;          // UUID internal to Cloudflare
  name: string;        // actual inference name, e.g. "@cf/meta/llama-3.1-8b-instruct"
  description: string;
  task?: { id?: string; name?: string; description?: string };
  tags?: string[];
  created_at?: string;
  properties?: Array<{ property_id: string; value: unknown }>;
}

let _cfModelsCache: CloudflareModelEntry[] | null = null;
let _cfModelsCachedAt = 0;
const CF_MODELS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Static fallback list — used when the Cloudflare models search API is unavailable
// (the token may only have inference permissions, not model-listing permissions)
const CF_STATIC_MODELS: CloudflareModelEntry[] = [
  { id: "@cf/meta/llama-3.1-8b-instruct",                name: "@cf/meta/llama-3.1-8b-instruct",                description: "Llama 3.1 8B Instruct — Meta" },
  { id: "@cf/meta/llama-3.2-3b-instruct",                name: "@cf/meta/llama-3.2-3b-instruct",                description: "Llama 3.2 3B Instruct — Meta (fast)" },
  { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",      name: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",      description: "Llama 3.3 70B FP8 Fast — Meta (powerful)" },
  { id: "@cf/mistral/mistral-7b-instruct-v0.1",          name: "@cf/mistral/mistral-7b-instruct-v0.1",          description: "Mistral 7B Instruct v0.1" },
  { id: "@cf/mistral/mistral-7b-instruct-v0.2-lora",     name: "@cf/mistral/mistral-7b-instruct-v0.2-lora",     description: "Mistral 7B Instruct v0.2 LoRA" },
  { id: "@cf/google/gemma-7b-it",                        name: "@cf/google/gemma-7b-it",                        description: "Google Gemma 7B IT" },
  { id: "@cf/google/gemma-2b-it",                        name: "@cf/google/gemma-2b-it",                        description: "Google Gemma 2B IT (fast)" },
  { id: "@cf/qwen/qwen1.5-7b-chat-awq",                  name: "@cf/qwen/qwen1.5-7b-chat-awq",                  description: "Qwen 1.5 7B Chat AWQ — Alibaba" },
  { id: "@cf/qwen/qwen1.5-14b-chat-awq",                 name: "@cf/qwen/qwen1.5-14b-chat-awq",                 description: "Qwen 1.5 14B Chat AWQ — Alibaba" },
  { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",  name: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",  description: "DeepSeek R1 Distill Qwen 32B" },
  { id: "@cf/deepseek-ai/deepseek-math-7b-instruct",     name: "@cf/deepseek-ai/deepseek-math-7b-instruct",     description: "DeepSeek Math 7B Instruct" },
  { id: "@cf/microsoft/phi-2",                           name: "@cf/microsoft/phi-2",                           description: "Microsoft Phi-2" },
  { id: "@cf/thebloke/discolm-german-7b-v1-awq",         name: "@cf/thebloke/discolm-german-7b-v1-awq",         description: "DiscoLM German 7B v1 AWQ" },
  { id: "@cf/tiiuae/falcon-7b-instruct",                 name: "@cf/tiiuae/falcon-7b-instruct",                 description: "Falcon 7B Instruct — TII UAE" },
  { id: "@cf/defog/sqlcoder-7b-2",                       name: "@cf/defog/sqlcoder-7b-2",                       description: "SQLCoder 7B-2 — SQL generation" },
  { id: "@cf/openchat/openchat-3.5-0106",                name: "@cf/openchat/openchat-3.5-0106",                description: "OpenChat 3.5" },
  { id: "@cf/neuralmind/bge-base-en-v1.5",               name: "@cf/neuralmind/bge-base-en-v1.5",               description: "BGE Base EN v1.5 — 768d embeddings", task: { name: "Text Embeddings" } },
  { id: "@cf/baai/bge-small-en-v1.5",                    name: "@cf/baai/bge-small-en-v1.5",                    description: "BGE Small EN v1.5 — 384d embeddings", task: { name: "Text Embeddings" } },
  { id: "@cf/baai/bge-large-en-v1.5",                    name: "@cf/baai/bge-large-en-v1.5",                    description: "BGE Large EN v1.5 — 1024d embeddings", task: { name: "Text Embeddings" } },
  { id: "@cf/meta/m2m100-1.2b",                          name: "@cf/meta/m2m100-1.2b",                          description: "M2M-100 1.2B — multilingual translation", task: { name: "Translation" } },
  { id: "@cf/openai/whisper",                            name: "@cf/openai/whisper",                            description: "Whisper — Speech-to-Text", task: { name: "Automatic Speech Recognition" } },
  { id: "@cf/openai/whisper-large-v3-turbo",             name: "@cf/openai/whisper-large-v3-turbo",             description: "Whisper Large v3 Turbo — fast STT", task: { name: "Automatic Speech Recognition" } },
  { id: "@cf/black-forest-labs/flux-1-schnell",          name: "@cf/black-forest-labs/flux-1-schnell",          description: "FLUX.1 Schnell — fast image generation", task: { name: "Text-to-Image" } },
  { id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", name: "@cf/stabilityai/stable-diffusion-xl-base-1.0", description: "Stable Diffusion XL Base 1.0", task: { name: "Text-to-Image" } },
  { id: "@cf/bytedance/stable-diffusion-xl-lightning",   name: "@cf/bytedance/stable-diffusion-xl-lightning",   description: "SD XL Lightning — ByteDance fast", task: { name: "Text-to-Image" } },
  { id: "@cf/lykon/dreamshaper-8-lcm",                   name: "@cf/lykon/dreamshaper-8-lcm",                   description: "DreamShaper 8 LCM — artistic images", task: { name: "Text-to-Image" } },
];

export async function fetchCloudflareModels(): Promise<CloudflareModelEntry[]> {
  const now = Date.now();
  if (_cfModelsCache && now - _cfModelsCachedAt < CF_MODELS_CACHE_TTL_MS) {
    return _cfModelsCache;
  }
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!apiToken || !accountId) {
    // No credentials — return the static list so the UI still shows models
    return CF_STATIC_MODELS;
  }
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?task=Text%20Generation`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // Token may lack model-listing permission — fall back to static list
      throw new Error(`Cloudflare models API error: ${res.status} ${res.statusText}`);
    }
    const json = await res.json() as { success: boolean; result?: CloudflareModelEntry[] };
    if (!json.success || !Array.isArray(json.result) || json.result.length === 0) {
      throw new Error("Unexpected Cloudflare API response shape");
    }
    _cfModelsCache   = json.result;
    _cfModelsCachedAt = now;
    return json.result;
  } catch {
    // Graceful degradation: return the static curated list
    _cfModelsCache   = CF_STATIC_MODELS;
    _cfModelsCachedAt = now;
    return CF_STATIC_MODELS;
  }
}

/** Force-clear the model cache (e.g. after credentials change). */
export function invalidateCloudflareModelsCache(): void {
  _cfModelsCache   = null;
  _cfModelsCachedAt = 0;
}

function getPersonalBase(): string {
  return process.env.PERSONAL_API_BASE_URL?.trim() || "";
}

function getPersonalKey(): string {
  return process.env.PERSONAL_API_KEY?.trim() || "";
}

export function hasAnyApiKey(): boolean {
  return !!(
    process.env.PERSONAL_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.CUSTOM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.ZHIPU_API_KEY?.trim() ||
    process.env.ZAI_API_KEY?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim()
  );
}

export function isMockProviderEnabled(): boolean {
  return process.env.LOCAL_MOCK_PROVIDER !== "false" &&
    process.env.NODE_ENV !== "production";
}

function mockResponse(messages: Array<{ role: string; content: string }>): string {
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content?.trim();
  return [
    "Local Mock Provider active.",
    "No live AI key was required for this development request.",
    latest ? `Request received: ${latest.slice(0, 280)}` : "Send a user message to exercise the local provider.",
    "The response is deterministic and safe for local integration tests.",
  ].join("\n");
}

export function listProviders(): ProviderInfo[] {
  return (Object.entries(PROVIDER_CONFIGS) as [ProviderName, ProviderConfig][]).map(
    ([id, cfg]) => {
      let available: boolean;
      if (id === "personal") {
        available = !!getPersonalKey();
      } else if (id === "custom") {
        available = !!(process.env.CUSTOM_API_KEY || process.env.CUSTOM_API_BASE_URL);
      } else if (id === "openai") {
        available = !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
      } else if (id === "anthropic") {
        available = !!(process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY);
      } else if (id === "cloudflare") {
        available = !!(process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.CLOUDFLARE_ACCOUNT_ID?.trim());
      } else if (id === "gemini") {
        // Accept both GEMINI_API_KEY and GOOGLE_AI_API_KEY (same service)
        available = !!(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim());
      } else if (id === "mock") {
        available = isMockProviderEnabled();
      } else {
        available = !!process.env[cfg.envKey];
      }
      const baseURL = id === "personal" ? getPersonalBase() : id === "cloudflare" ? getCloudflareBaseURL() : cfg.baseURL;
      return { id, name: cfg.name, available, models: cfg.models, baseURL };
    }
  );
}

let _openaiClients: Partial<Record<string, OpenAI>> = {};
let _anthropic: Anthropic | null = null;

export function getOpenAICompatibleClient(provider: ProviderName): OpenAI | null {
  const cacheKey = provider;
  if (_openaiClients[cacheKey]) return _openaiClients[cacheKey]!;

  const cfg = PROVIDER_CONFIGS[provider];
  let apiKey: string | undefined;
  let baseURL: string | undefined = cfg.baseURL;

  if (provider === "custom") {
    apiKey = process.env.CUSTOM_API_KEY || undefined;
    baseURL = CUSTOM_API_BASE_URL;
  } else if (provider === "zhipu") {
    apiKey = process.env.ZHIPU_API_KEY || undefined;
    baseURL = "https://open.bigmodel.cn/api/paas/v4";
  } else if (provider === "glm") {
    apiKey = process.env.ZAI_API_KEY || undefined;
    baseURL = "https://api.z.ai/v1";
  } else if (provider === "personal") {
    apiKey = getPersonalKey() || undefined;
    baseURL = getPersonalBase() || undefined;
  } else if (provider === "openai") {
    apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || undefined;
    baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || cfg.baseURL;
  } else if (provider === "cloudflare") {
    // Cloudflare Workers AI — OpenAI-compatible endpoint for function calling
    apiKey = process.env.CLOUDFLARE_API_TOKEN?.trim() || undefined;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
    baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
  } else if (provider === "gemini") {
    // Accept both GEMINI_API_KEY and GOOGLE_AI_API_KEY (same Gemini service)
    apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim() || undefined;
    baseURL = cfg.baseURL;
  } else {
    apiKey = process.env[cfg.envKey];
  }

  if (!apiKey) return null;

  const clientOpts: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
  if (baseURL) clientOpts.baseURL = baseURL;

  if (provider === "custom") {
    clientOpts.defaultHeaders = {
      "ngrok-skip-browser-warning": "true",
    };
  }

  if (provider === "openrouter") {
    clientOpts.defaultHeaders = {
      "HTTP-Referer": "https://mr7.ai",
      "X-Title": "KaliGPT / mr7.ai",
    };
  }

  const client = new OpenAI(clientOpts);
  _openaiClients[cacheKey] = client;
  return client;
}

export function getPersonalOpenAI(): OpenAI | null {
  const key = getPersonalKey();
  const base = getPersonalBase();
  if (!key) return null;
  return new OpenAI({ apiKey: key, ...(base ? { baseURL: base } : {}) });
}

export function requirePersonalOpenAI(): OpenAI {
  const client = getPersonalOpenAI();
  if (!client) {
    throw new Error(
      "لم يتم ضبط مفتاح API. افتح إعدادات المزود من القائمة الجانبية واختر مزوداً وأدخل المفتاح."
    );
  }
  return client;
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set. Add it in Secrets.");
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

export function invalidateProviderCache() {
  _openaiClients = {};
  _anthropic = null;
}

export type StreamChunk = { content?: string; done?: boolean; error?: string };

export async function callOnce(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 1000,
): Promise<string> {
  // ── Optional cache: skip for empty inputs ─────────────────────────────────
  const cacheKey = callOnceCacheKey(messages);
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    // Try personal first, then fall back to any available provider
    let client = getPersonalOpenAI();
    let model = PERSONAL_DEFAULT_MODEL;

    if (!client) {
      // Fallback: find first available OpenAI-compatible provider
      const CALL_ONCE_FALLBACK_ORDER: ProviderName[] = ["groq", "openrouter", "openai", "gemini", "zhipu", "glm", "cloudflare"];
      for (const provider of CALL_ONCE_FALLBACK_ORDER) {
        const c = getOpenAICompatibleClient(provider);
        if (c) {
          client = c;
          model = PROVIDER_CONFIGS[provider]?.models[0] ?? PERSONAL_DEFAULT_MODEL;
          break;
        }
      }
    }

    if (!client && isMockProviderEnabled()) {
      const result = mockResponse(messages);
      cacheSet(cacheKey, result);
      return result;
    }
    if (!client) return "";

    const res = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages,
    }, { signal: controller.signal });
    const result = res.choices?.[0]?.message?.content ?? "";
    cacheSet(cacheKey, result);
    return result;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientWithCredentials(apiKey: string, apiBaseURL?: string): OpenAI {
  return new OpenAI({
    apiKey,
    ...(apiBaseURL ? { baseURL: apiBaseURL } : {}),
  });
}

export async function* streamCompletion(
  provider: ProviderName,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.7,
  opts?: { apiKey?: string; apiBaseURL?: string }
): AsyncGenerator<StreamChunk> {
  const controller = new AbortController();
  const TIMEOUT_MS = 60_000;
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (provider === "mock" && isMockProviderEnabled()) {
      const text = mockResponse(messages);
      for (const chunk of text.match(/.{1,48}(?:\s|$)/g) ?? [text]) {
        yield { content: chunk };
      }
      yield { done: true };
      return;
    }

    // ── Path 1: Frontend passed a key directly (from ProviderSettingsModal) ──
    if (provider !== "custom" && opts?.apiKey && opts.apiKey.trim().length > 10) {
      const client = getClientWithCredentials(opts.apiKey.trim(), opts.apiBaseURL?.trim());
      const resolvedModel = model || PERSONAL_DEFAULT_MODEL;
      try {
        const streamRes = await client.chat.completions.create({
          model: resolvedModel,
          messages,
          stream: true,
          temperature,
        }, { signal: controller.signal });
        for await (const chunk of streamRes) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) yield { content };
        }
        yield { done: true };
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "API error";
        yield { error: msg };
        return;
      }
    }

    // ── Path 2: Anthropic (server-side key) ──
    if (provider === "anthropic") {
      try {
        const client = getAnthropicClient();
        const systemMsg = messages.find((m) => m.role === "system");
        const chatMsgs = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const stream = client.messages.stream({
          model,
          max_tokens: 8192,
          system: systemMsg?.content,
          messages: chatMsgs,
          temperature,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            yield { content: event.delta.text };
          }
        }
        yield { done: true };
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Anthropic API error";
        yield { error: msg };
        return;
      }
    }

    // ── Path 2.5: Cloudflare Workers AI (server-side key, raw fetch — different endpoint shape) ──
    if (provider === "cloudflare") {
      const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
      if (!apiToken || !accountId) {
        yield {
          error: "لم يتم ضبط CLOUDFLARE_API_TOKEN أو CLOUDFLARE_ACCOUNT_ID. أضفهما في Secrets.",
        };
        return;
      }
      const resolvedModel = model || "@cf/meta/llama-3.1-8b-instruct";
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${resolvedModel}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages, temperature, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          yield { error: `Cloudflare Workers AI error (${res.status}): ${text || res.statusText}` };
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const content = parsed?.response ?? parsed?.result?.response ?? "";
              if (content) yield { content };
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }
        yield { done: true };
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Cloudflare Workers AI error";
        yield { error: msg };
        return;
      }
    }

    // ── Path 3: OpenAI-compatible provider (server-side key) ──
    const resolvedProvider: ProviderName =
      (provider === "personal" || !PROVIDER_CONFIGS[provider])
        ? "personal"
        : provider;

    const client = getOpenAICompatibleClient(resolvedProvider);

    if (!client) {
      yield {
        error:
          "لم يتم ضبط مفتاح API. افتح إعدادات المزود من القائمة الجانبية واختر مزوداً وأدخل المفتاح.",
      };
      return;
    }

    const resolvedModel = model || PERSONAL_DEFAULT_MODEL;

    const isGlm5 = /^glm-5/.test(resolvedModel);
    const glm5Extra = isGlm5 ? { extra_body: { reasoning_effort: "max" } } : {};

    try {
      const streamRes = await client.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: true,
        temperature,
        ...glm5Extra,
      } as Parameters<typeof client.chat.completions.create>[0], { signal: controller.signal }) as AsyncIterable<import("openai/resources").ChatCompletionChunk>;

      for await (const chunk of streamRes) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield { content };
      }
    } catch (streamError) {
      // Some Ollama/ngrok bridges support the OpenAI response shape but fail
      // when streaming is enabled. Retry once as a normal completion and
      // surface it through the same application-level SSE contract.
      const status = (streamError as { status?: number }).status;
      const message = streamError instanceof Error ? streamError.message : "";
      const isServerError = status !== undefined
        ? status >= 500
        : /500|internal server error/i.test(message);
      if (resolvedProvider !== "custom" || !isServerError) throw streamError;

      const completion = await client.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: false,
        temperature,
        ...glm5Extra,
      } as Parameters<typeof client.chat.completions.create>[0], { signal: controller.signal }) as import("openai/resources").ChatCompletion;
      const content = completion.choices?.[0]?.message?.content;
      if (content) yield { content };
    }
    yield { done: true };
  } catch (e) {
    const isAbort = e instanceof Error && (e.name === "AbortError" || e.message.includes("abort"));
    if (isAbort) {
      yield { error: "انتهت مهلة الطلب — تحقق من مفتاح API وإعدادات المزود" };
    } else if (e instanceof Error) {
      const msg = e.message;
      if (msg.includes("400") && (msg.includes("no body") || msg.includes("empty"))) {
        yield {
          error:
            "خطأ 400: رفض المزود الطلب — تحقق من صحة اسم النموذج وعنوان API Base URL. قد يكون النموذج غير متاح لدى هذا المزود.",
        };
      } else if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("api key")) {
        yield { error: "مفتاح API غير صالح أو منتهي الصلاحية — أدخل مفتاحاً جديداً في إعدادات المزود." };
      } else if (msg.includes("429")) {
        yield { error: "تجاوزت حد الطلبات — انتظر قليلاً ثم أعد المحاولة." };
      } else {
        yield { error: msg };
      }
    } else {
      yield { error: "AI provider error" };
    }
  } finally {
    clearTimeout(timeout);
  }
}
const FALLBACK_ORDER: ProviderName[] = [
  "personal", "cloudflare", "openrouter", "groq", "openai", "anthropic", "gemini", "zhipu", "glm", "mock",
];

export async function* streamWithFallback(
  primaryProvider: ProviderName,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.7,
  opts?: { apiKey?: string; apiBaseURL?: string },
): AsyncGenerator<StreamChunk> {
  // If the client supplied its own key, that is an explicit choice — never override it.
  // We still run through the circuit breaker for recording, but never skip on circuit open
  // since the user explicitly provided credentials.
  if (opts?.apiKey && opts.apiKey.trim().length > 10) {
    yield* streamCompletion(primaryProvider, model, messages, temperature, opts);
    return;
  }

  const available = new Set(listProviders().filter((p) => p.available).map((p) => p.id));
  const chain: ProviderName[] = [primaryProvider, ...FALLBACK_ORDER].filter(
    (p, i, arr) => arr.indexOf(p) === i && (p === primaryProvider || available.has(p)),
  );

  let lastError = "";
  for (const candidate of chain) {
    // ── Circuit Breaker: skip providers whose circuit is open ──────────────
    if (!cbCanAttempt(candidate)) {
      // Circuit is open for this provider — skip it silently
      continue;
    }

    const candidateModel = candidate === primaryProvider ? model : (PROVIDER_CONFIGS[candidate]?.models[0] || PERSONAL_DEFAULT_MODEL);
    let gotContent = false;
    let sawError = false;
    try {
      for await (const chunk of streamCompletion(candidate, candidateModel, messages, temperature)) {
        if (chunk.error) {
          sawError = true;
          lastError = chunk.error;
          break;
        }
        if (chunk.content) {
          gotContent = true;
          yield chunk;
        }
        if (chunk.done) {
          // Success — reset circuit
          cbRecordSuccess(candidate);
          yield chunk;
          return;
        }
      }
    } catch (e) {
      sawError = true;
      lastError = e instanceof Error ? e.message : "provider error";
    }

    if (gotContent && !sawError) {
      // Streamed content but no explicit done chunk — treat as success
      cbRecordSuccess(candidate);
      return;
    }
    if (sawError) {
      // Record failure for circuit breaker
      cbRecordFailure(candidate);
    }
    if (gotContent) return;
    if (!sawError) return;
    // Nothing was streamed and this candidate errored — try the next provider automatically.
  }

  yield {
    error: lastError
      ? `فشلت جميع محاولات محرك الذكاء الاصطناعي (آخر خطأ: ${lastError}). أضف مفتاح API واحد على الأقل في الإعدادات.`
      : "لا يوجد مزود ذكاء اصطناعي مُفعّل. أضف مفتاح API واحد على الأقل من الإعدادات (Cloudflare Workers AI مجاني).",
  };
}

export const aiProviders = {
  async streamOpenAI(
    opts: {
      model: string;
      messages: { role: "system" | "user" | "assistant"; content: string }[];
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
      apiKey: string;
    },
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const client = new OpenAI({ apiKey: opts.apiKey });
    const res = await client.chat.completions.create({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: opts.temperature ?? 0.1,
      max_tokens: opts.max_tokens ?? 4000,
      ...(opts.response_format ? { response_format: opts.response_format as { type: "json_object" } } : {}),
    });
    for await (const chunk of res) {
      const c = chunk.choices?.[0]?.delta?.content;
      if (c) onChunk(c);
    }
  },
};
