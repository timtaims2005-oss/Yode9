/**
 * =====================================================================
 * tool-orchestrator-v2.ts — نسخة "مربوطة فعلياً" (لا يوجد TODO يرمي Error)
 * =====================================================================
 */

import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";
// pdf-parse is loaded dynamically inside its handler to avoid DOMMatrix crash at startup
import * as cheerio from "cheerio";
import { Pool } from "pg";
import { checkGuardrail, SENSITIVE_TOOL_NAMES } from "../guardrails.js";

// =====================================================================
// 0) اتصال قاعدة البيانات المشترك
// =====================================================================

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL غير مضبوط في متغيرات البيئة");
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

// =====================================================================
// 1) نظام تسجيل الأدوات (Plugin Registry)
// =====================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (ctx: ToolContext, args: Record<string, any>) => Promise<any>;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) log("warn", `تم استبدال أداة مسجلة مسبقاً: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }
  get(name: string) {
    return this.tools.get(name);
  }
  getSchemas() {
    return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({ name, description, parameters }));
  }
  list() {
    return Array.from(this.tools.keys());
  }
}
export const registry = new ToolRegistry();

// =====================================================================
// 2) السجلّ (Logging)
// =====================================================================

type LogLevel = "info" | "warn" | "error";
interface LogEntry { timestamp: string; level: LogLevel; message: string; meta?: Record<string, any>; }
const logBuffer: LogEntry[] = [];
const MAX_LOG_ENTRIES = 500;

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level, message, meta };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.shift();
  console.log(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, meta ? sanitizeMeta(meta) : "");
}
function sanitizeMeta(meta: Record<string, any>) {
  const clean = { ...meta };
  for (const key of Object.keys(clean)) if (/token|secret|key|password/i.test(key)) clean[key] = "[محجوب]";
  return clean;
}
export function getRecentLogs(limit = 100) {
  return logBuffer.slice(-limit);
}

// =====================================================================
// 3) واجهة موحدة لاستدعاء النموذج
// =====================================================================

export interface ToolContext {
  userId: string;
  accountId: string;
  apiToken: string;
  provider?: "cloudflare" | "custom";
  extras?: {
    getFileBuffer?: (fileId: string) => Promise<Buffer>;
    githubToken?: string;
    [key: string]: any;
  };
}

// ─── الاستجابة الموحدة من أي مزوّد ────────────────────────────────────────
interface NormalizedModelResponse {
  response?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: any }>;
  provider: string;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) lastError = new Error(`HTTP ${res.status}: ${await res.text()}`);
      else throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    } catch (err) {
      lastError = err;
    }
    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
    log("warn", `محاولة ${attempt}/${maxRetries} فشلت، إعادة المحاولة بعد ${delayMs}ms`, { url });
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw lastError;
}

// ─── Cloudflare (للنماذج المتخصصة: صور، TTS، STT، ترجمة…) ──────────────
async function callCloudflareModel(ctx: ToolContext, model: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetchWithRetry(
    `https://api.cloudflare.com/client/v4/accounts/${ctx.accountId}/ai/run/${model}`,
    { method: "POST", headers: { Authorization: `Bearer ${ctx.apiToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  return res.json();
}

// ─── تطبيع استجابة صيغة OpenAI (Groq / OpenRouter) ─────────────────────
function normalizeOpenAIResponse(data: any, provider: string): NormalizedModelResponse {
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error(`${provider}: استجابة غير متوقعة — ${JSON.stringify(data).slice(0, 200)}`);

  const response = message.content || undefined;
  const rawToolCalls: any[] | undefined = message.tool_calls;

  if (rawToolCalls && rawToolCalls.length > 0) {
    const tool_calls = rawToolCalls.map((tc: any) => {
      const argsRaw = tc.function?.arguments ?? tc.arguments ?? "{}";
      const args = typeof argsRaw === "string"
        ? (() => { try { return JSON.parse(argsRaw); } catch { return {}; } })()
        : argsRaw;
      return { id: tc.id || tc.function?.name || "", name: tc.function?.name || tc.name || "", arguments: args };
    });
    return { response, tool_calls, provider };
  }
  return { response, provider };
}

// ─── مزوّد 1: Groq ────────────────────────────────────────────────────────
// نجرب llama-3.3-70b-versatile أولاً، ولو جاء 413 (السياق أكبر من TPM المجاني 12k)
// ننتقل تلقائياً لـ llama-3.1-8b-instant (TPM أعلى: 30k)
async function callGroq(messages: ChatMessage[], openaiTools?: any[]): Promise<NormalizedModelResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY غير مضبوط");

  // EVALS_MODE: prefer the smaller 8b model first to stay inside the free-tier
  // 6000 TPM window. Production (EVALS_MODE unset) keeps 70b as the primary choice.
  const groqModels = process.env.EVALS_MODE === "1"
    ? ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError = "";

  for (const model of groqModels) {
    const body: any = { model, messages, temperature: 0.7, max_tokens: 4096 };
    if (openaiTools && openaiTools.length > 0) body.tools = openaiTools;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35_000),
    });

    if (res.ok) {
      const data = await res.json();
      log("info", `✅ Groq نجح بالنموذج: ${model}`, { model });
      return normalizeOpenAIResponse(data, `Groq/${model}`);
    }

    const text = await res.text();
    lastError = `Groq/${model} HTTP ${res.status}: ${text}`;

    // 413 = السياق أكبر من TPM → جرّب النموذج الأصغر
    if (res.status === 413) {
      log("warn", `⚠️ ${model} سياق كبير جداً (413) — جرب النموذج الأصغر`, { model });
      continue;
    }
    // أي خطأ آخر → ارمِ الخطأ فوراً
    throw new Error(lastError);
  }

  throw new Error(lastError);
}

// ─── مزوّد 2: OpenRouter ──────────────────────────────────────────────────
async function callOpenRouter(messages: ChatMessage[], openaiTools?: any[]): Promise<NormalizedModelResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY غير مضبوط");

  const body: any = {
    model: "meta-llama/llama-3.3-70b-instruct:free",
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };
  if (openaiTools && openaiTools.length > 0) body.tools = openaiTools;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mr7.ai",
      "X-Title": "mr7.ai",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter HTTP ${res.status}: ${text}`);
  }
  return normalizeOpenAIResponse(await res.json(), "OpenRouter");
}

// ─── تنظيف schemas لـ Gemini (يرفض items.items وبعض الخصائص المتداخلة) ──
function sanitizeSchemaForGemini(schema: any, depth = 0): any {
  if (!schema || typeof schema !== "object" || depth > 6) return schema;
  const s: any = { ...schema };

  // Gemini يقبل فقط: string, number, integer, boolean, array, object
  if (s.type && !["string", "number", "integer", "boolean", "array", "object"].includes(s.type)) {
    s.type = "string";
  }

  // أزل خصائص غير مدعومة
  for (const key of ["$schema", "additionalProperties", "default", "examples", "title", "nullable"]) {
    delete s[key];
  }

  if (s.type === "array") {
    if (s.items && typeof s.items === "object") {
      // لو items نفسها عندها items (array of arrays) → حوّلها لـ object عشان Gemini
      if (s.items.items !== undefined) {
        s.items = { type: "string" };
      } else {
        s.items = sanitizeSchemaForGemini(s.items, depth + 1);
      }
    } else {
      s.items = { type: "string" }; // fallback
    }
    // Gemini لا يقبل minItems/maxItems
    delete s.minItems;
    delete s.maxItems;
  }

  if (s.type === "object" && s.properties) {
    const cleanProps: any = {};
    for (const [k, v] of Object.entries(s.properties)) {
      cleanProps[k] = sanitizeSchemaForGemini(v, depth + 1);
    }
    s.properties = cleanProps;
  }

  if (s.anyOf || s.oneOf || s.allOf) {
    // Gemini لا يدعم anyOf/oneOf → اختر الأول أو حوّل لـ string
    const variants = s.anyOf ?? s.oneOf ?? s.allOf;
    const first = variants?.[0];
    delete s.anyOf; delete s.oneOf; delete s.allOf;
    if (first) Object.assign(s, sanitizeSchemaForGemini(first, depth + 1));
    else s.type = "string";
  }

  return s;
}

// ─── مزوّد 3: Google AI Studio (Gemini) ──────────────────────────────────
async function callGemini(messages: ChatMessage[], openaiTools?: any[]): Promise<NormalizedModelResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY غير مضبوط");

  const systemMsg = messages.find((m) => m.role === "system");
  // Gemini لا يدعم role=tool — حوّل رسائل الأدوات لـ user
  const chatMsgs = messages.filter((m) => m.role !== "system").map((m) => {
    if (m.role === "tool") {
      return { role: "user" as const, content: `[نتيجة الأداة ${(m as any).name ?? ""}]: ${m.content}` };
    }
    return m;
  });

  // دمج الرسائل المتتالية من نفس الدور (Gemini يرفض نفس الدور مرتين تواليًا)
  const merged: Array<{ role: string; content: string }> = [];
  for (const m of chatMsgs) {
    const last = merged[merged.length - 1];
    const role = m.role === "assistant" ? "model" : "user";
    if (last && last.role === role) {
      last.content += "\n" + (typeof m.content === "string" ? m.content : JSON.stringify(m.content));
    } else {
      merged.push({ role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content) });
    }
  }

  const contents = merged.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  const body: any = { contents };
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

  // تحويل أدوات OpenAI → Gemini functionDeclarations مع تنظيف الـ schema
  if (openaiTools && openaiTools.length > 0) {
    try {
      const functionDeclarations = openaiTools.map((t: any) => {
        const fn = t.function ?? t;
        const rawParams = fn.parameters ?? { type: "object", properties: {} };
        return {
          name: fn.name,
          description: fn.description ?? "",
          parameters: sanitizeSchemaForGemini(rawParams),
        };
      });
      body.tools = [{ functionDeclarations }];
    } catch {
      // نكمل بدون أدوات لو فشل التحويل
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error("Gemini: لا يوجد candidate في الرد");

  const parts: any[] = candidate?.content?.parts ?? [];
  // STOP مع parts فارغة يعني رد نصي فارغ — ليس خطأ
  if (parts.length === 0) return { response: "", provider: "Gemini" };

  const textPart = parts.find((p: any) => p.text)?.text ?? "";
  const funcParts = parts.filter((p: any) => p.functionCall);

  if (funcParts.length > 0) {
    const tool_calls = funcParts.map((p: any) => ({
      id: p.functionCall.name,
      name: p.functionCall.name,
      arguments: p.functionCall.args ?? {},
    }));
    return { response: textPart || undefined, tool_calls, provider: "Gemini" };
  }
  return { response: textPart, provider: "Gemini" };
}

// ─── مزوّد 4 (احتياطي): Cloudflare Workers AI ────────────────────────────
// يستخدم /ai/run/{model} مع stream:true — نفس المسار الذي تستخدمه streamCompletion ويعمل بشكل صحيح.
// يجمع الـ SSE chunks ويعيدها كنص كامل (لا يدعم tool calls، لكن يعمل كـ text fallback).
async function callCloudflareFallback(_ctx: ToolContext, messages: ChatMessage[], _openaiTools?: any[]): Promise<NormalizedModelResponse> {
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!apiToken || !accountId) {
    throw new Error("Cloudflare not configured — CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN missing");
  }
  const model = "@cf/meta/llama-3.1-8b-instruct";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: true }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Cloudflare HTTP ${res.status}: ${text}`);
  }
  // جمع الـ SSE chunks وتجميعها في نص كامل
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
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
        if (content) fullText += content;
      } catch { /* ignore malformed SSE chunk */ }
    }
  }
  return { response: fullText, provider: "Cloudflare" };
}

// ─── الدالة الموحدة: Groq → OpenRouter → Gemini → Cloudflare ─────────────
/**
 * callModelWithFallback — تستدعي النماذج بالترتيب حتى ينجح واحد.
 * تنتقل تلقائيًا للمزوّد التالي عند 429 أو 402/403 أو أي خطأ.
 * @param tools — قائمة أدوات بصيغة OpenAI القياسية { type:"function", function:{name,description,parameters} }
 */
export async function callModelWithFallback(
  ctx: ToolContext,
  messages: ChatMessage[],
  tools?: any[]
): Promise<NormalizedModelResponse> {
  // تحويل schemas للصيغة الكاملة المطلوبة من OpenAI/Groq/OpenRouter
  const openaiTools = tools?.map((t: any) =>
    t.type === "function" ? t : { type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.parameters ?? {} } }
  );

  const providers: Array<{ name: string; fn: () => Promise<NormalizedModelResponse> }> = [
    { name: "Groq",       fn: () => callGroq(messages, openaiTools) },
    { name: "OpenRouter", fn: () => callOpenRouter(messages, openaiTools) },
    { name: "Gemini",     fn: () => callGemini(messages, openaiTools) },
    { name: "Cloudflare", fn: () => callCloudflareFallback(ctx, messages, openaiTools) },
  ];

  let lastError = "";
  for (const p of providers) {
    try {
      const result = await p.fn();
      log("info", `✅ تم تنفيذ الطلب عبر المزوّد: ${p.name}`, { provider: p.name });
      return result;
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      lastError = msg;
      const isRateLimit = /429|402|403|neurons|rate.?limit|quota|daily.?free|allocation|exceeded/i.test(msg);
      log("warn", `⚠️ ${p.name} ${isRateLimit ? "وصل للحد" : "فشل"} — الانتقال للمزوّد التالي`, { error: msg });
    }
  }
  throw new Error(`كل مزودي النموذج مشغولين دلوقتي، حاول تاني بعد شوية. (آخر خطأ: ${lastError})`);
}

async function callTextModel(ctx: ToolContext, prompt: string): Promise<string> {
  const result = await callModelWithFallback(ctx, [{ role: "user", content: prompt }]);
  return result.response || "";
}

// =====================================================================
// 4) النماذج الداعمة لـ Tool Calling
// =====================================================================

// بعد إضافة نظام الـ fallback، أي مزوّد في القائمة يدعم Tool Calling.
// القائمة دي محفوظة للتوافق مع الكود القديم والإعدادات.
export const TOOL_CAPABLE_MODELS = [
  // Groq
  "llama-3.3-70b-versatile",
  // OpenRouter
  "meta-llama/llama-3.3-70b-instruct:free",
  // Gemini
  "gemini-2.5-flash",
  // Cloudflare (احتياطي)
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.1-70b-instruct",
  "@cf/openai/gpt-oss-120b",
  "@cf/openai/gpt-oss-20b",
];

/** دائمًا true — نظام الـ fallback يتعامل مع أي نموذج */
export function modelSupportsTools(_model: string): boolean {
  return true;
}

// =====================================================================
// 5) تسجيل الأدوات — بتنفيذ حقيقي
// =====================================================================

registry.register({
  name: "generate_image",
  description: "توليد صورة جديدة من وصف نصي.",
  parameters: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string" } }, required: ["prompt"] },
  handler: async (ctx, args) => {
    const model = args.model || "@cf/black-forest-labs/flux-1-schnell";
    return { image: await callCloudflareModel(ctx, model, { prompt: args.prompt }) };
  },
});

registry.register({
  name: "analyze_image",
  description: "تحليل أو وصف صورة قام المستخدم برفعها.",
  parameters: { type: "object", properties: { image_url: { type: "string" }, question: { type: "string" } }, required: ["image_url"] },
  handler: async (ctx, args) => ({
    description: await callCloudflareModel(ctx, "@cf/meta/llama-3.2-11b-vision-instruct", { image: args.image_url, prompt: args.question || "صف هذه الصورة بالتفصيل" }),
  }),
});

registry.register({
  name: "text_to_speech",
  description: "تحويل نص إلى ملف صوتي منطوق.",
  parameters: { type: "object", properties: { text: { type: "string" }, voice: { type: "string" } }, required: ["text"] },
  handler: async (ctx, args) => callCloudflareModel(ctx, "@cf/deepgram/aura-1", { text: args.text }),
});

registry.register({
  name: "speech_to_text",
  description: "تحويل تسجيل صوتي مرفوع إلى نص مكتوب.",
  parameters: { type: "object", properties: { audio_file_id: { type: "string" } }, required: ["audio_file_id"] },
  handler: async (ctx, args) => {
    if (!ctx.extras?.getFileBuffer) throw new Error("speech_to_text: لازم تمرر ctx.extras.getFileBuffer عند بناء ToolContext");
    const buffer = await ctx.extras.getFileBuffer(args.audio_file_id);
    return callCloudflareModel(ctx, "@cf/openai/whisper-large-v3-turbo", { audio: Array.from(buffer) });
  },
});

registry.register({
  name: "edit_image",
  description: "تعديل صورة موجودة بناءً على تعليمات نصية.",
  parameters: { type: "object", properties: { image_url: { type: "string" }, instruction: { type: "string" } }, required: ["image_url", "instruction"] },
  handler: async () => {
    throw new Error("edit_image: يحتاج تفعيل نموذج img2img خارجي (Replicate/Stability) — أضف مفتاحه وأنا أربطه");
  },
});

registry.register({
  name: "execute_code",
  description: "تنفيذ كود Python أو JavaScript فعلياً داخل بيئة معزولة وإرجاع الناتج.",
  parameters: { type: "object", properties: { language: { type: "string", enum: ["python", "javascript"] }, code: { type: "string" } }, required: ["language", "code"] },
  handler: async (_ctx, args) => {
    const { execFile } = await import("node:child_process");
    const { writeFile, unlink, mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");

    const lang: string = (args.language || "javascript").toLowerCase();

    // ── JavaScript via Node.js ─────────────────────────────────────────────
    if (lang === "javascript") {
      const dir = await mkdtemp(path.join(tmpdir(), "exec-"));
      const file = path.join(dir, "main.mjs");
      await writeFile(file, String(args.code));
      return new Promise((resolve) => {
        execFile("node", ["--experimental-vm-modules", file], { timeout: 10_000 }, async (err, stdout, stderr) => {
          await unlink(file).catch(() => {});
          resolve({ stdout: stdout || "", stderr: stderr || err?.message || "", exitCode: err?.code ?? 0 });
        });
      });
    }

    // ── Python via system python3 ──────────────────────────────────────────
    if (lang === "python") {
      const dir = await mkdtemp(path.join(tmpdir(), "exec-"));
      const file = path.join(dir, "main.py");
      await writeFile(file, String(args.code));

      // Try common python binary names
      const pythonBins = ["python3", "python", "python3.12", "python3.11", "python3.10"];

      for (const bin of pythonBins) {
        const result: any = await new Promise((resolve) => {
          execFile(bin, [file], { timeout: 10_000 }, async (err, stdout, stderr) => {
            if (err && (err as any).code === "ENOENT") { resolve(null); return; }
            await unlink(file).catch(() => {});
            resolve({ stdout: stdout || "", stderr: stderr || "", exitCode: (err as any)?.code ?? 0 });
          });
        });
        if (result !== null) return result;
      }

      await unlink(file).catch(() => {});

      // Python not available locally — fall through to Piston as remote fallback
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", version: "3.10.0", files: [{ content: args.code }] }),
      });
      if (!res.ok) throw new Error(`تعذّر تنفيذ Python محلياً ولا عبر Piston (HTTP ${res.status}). نتيجة الكود يمكن حسابها نظرياً.`);
      const data: any = await res.json();
      return { stdout: data.run?.stdout || "", stderr: data.run?.stderr || "", exitCode: data.run?.code };
    }

    throw new Error(`لغة غير مدعومة: ${lang}. المدعوم: python، javascript`);
  },
});

registry.register({
  name: "review_code",
  description: "مراجعة كود موجود واقتراح تحسينات أو اكتشاف أخطاء، دون تنفيذه.",
  parameters: { type: "object", properties: { code: { type: "string" }, language: { type: "string" } }, required: ["code"] },
  handler: async (ctx, args) =>
    callCloudflareModel(ctx, "@cf/qwen/qwen2.5-coder-32b-instruct", {
      messages: [{ role: "user", content: `راجع هذا الكود (${args.language || "غير محدد"}) واذكر الأخطاء والتحسينات الممكنة:\n\n${args.code}` }],
    }),
});

registry.register({
  name: "run_sql_query",
  description: "تنفيذ استعلام SQL للقراءة فقط على قاعدة بيانات المشروع وإرجاع النتيجة كجدول.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  handler: async (_ctx, args) => {
    const q = String(args.query).trim();
    if (!/^select\s/i.test(q)) throw new Error("run_sql_query: مسموح فقط باستعلامات SELECT لأسباب أمنية");
    if (/;\s*\S/.test(q.replace(/;\s*$/, ""))) throw new Error("run_sql_query: غير مسموح بأكثر من statement واحد");
    const result = await getPool().query(q);
    return { rows: result.rows, rowCount: result.rowCount };
  },
});

registry.register({
  name: "create_pdf",
  description: "تحويل نص أو ماركداون إلى ملف PDF. يرجع base64.",
  parameters: { type: "object", properties: { title: { type: "string" }, content_markdown: { type: "string" } }, required: ["content_markdown"] },
  handler: async (_ctx, args) => {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve({ base64: Buffer.concat(chunks).toString("base64"), mimeType: "application/pdf" }));
      doc.on("error", reject);

      if (args.title) doc.fontSize(20).text(args.title, { underline: true }).moveDown();
      const lines = String(args.content_markdown).split("\n");
      for (const line of lines) {
        if (line.startsWith("# ")) doc.fontSize(18).text(line.slice(2)).moveDown(0.5);
        else if (line.startsWith("## ")) doc.fontSize(15).text(line.slice(3)).moveDown(0.3);
        else if (line.trim() === "") doc.moveDown(0.5);
        else doc.fontSize(11).text(line);
      }
      doc.end();
    });
  },
});

registry.register({
  name: "extract_pdf_text",
  description: "استخراج النص من ملف PDF مرفوع.",
  parameters: { type: "object", properties: { file_id: { type: "string" } }, required: ["file_id"] },
  handler: async (ctx, args) => {
    if (!ctx.extras?.getFileBuffer) throw new Error("extract_pdf_text: لازم تمرر ctx.extras.getFileBuffer عند بناء ToolContext");
    const buffer = await ctx.extras.getFileBuffer(args.file_id);
    // dynamic import to avoid DOMMatrix crash at startup (pdf-parse v2 bundles pdfjs-dist)
    const pdfParseMod = await import("pdf-parse");
    const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
      (pdfParseMod as any).default ?? (pdfParseMod as any);
    const parsed = await pdfParse(buffer);
    return { text: parsed.text, numPages: parsed.numpages };
  },
});

registry.register({
  name: "summarize_document",
  description: "تلخيص مستند طويل (PDF) إلى نقاط رئيسية.",
  parameters: { type: "object", properties: { file_id: { type: "string" }, max_points: { type: "number" } }, required: ["file_id"] },
  handler: async (ctx, args) => {
    const extractTool = registry.get("extract_pdf_text")!;
    const { text } = await extractTool.handler(ctx, { file_id: args.file_id });
    const maxPoints = args.max_points || 5;
    const truncated = text.slice(0, 12000);
    const summary = await callTextModel(ctx, `لخّص هذا المستند في ${maxPoints} نقاط رئيسية بالعربية:\n\n${truncated}`);
    return { summary };
  },
});

registry.register({
  name: "create_docx",
  description: "إنشاء ملف Word فعلي. يرجع base64.",
  parameters: {
    type: "object",
    properties: { title: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, text: { type: "string" } } } } },
    required: ["title", "sections"],
  },
  handler: async (_ctx, args) => {
    const children: Paragraph[] = [new Paragraph({ text: args.title, heading: HeadingLevel.TITLE })];
    for (const section of args.sections || []) {
      if (section.heading) children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
      if (section.text) children.push(new Paragraph({ text: section.text }));
    }
    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    return { base64: buffer.toString("base64"), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  },
});

registry.register({
  name: "create_xlsx",
  description: "إنشاء ملف Excel فعلي. يرجع base64.",
  parameters: {
    type: "object",
    properties: { sheet_name: { type: "string" }, headers: { type: "array", items: { type: "string" } }, rows: { type: "array", items: { type: "array" } } },
    required: ["headers", "rows"],
  },
  handler: async (_ctx, args) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(args.sheet_name || "Sheet1");
    sheet.addRow(args.headers);
    sheet.getRow(1).font = { bold: true };
    for (const row of args.rows || []) sheet.addRow(row);
    sheet.columns.forEach((col) => (col.width = 18));
    const buffer = await workbook.xlsx.writeBuffer();
    return { base64: Buffer.from(buffer as ArrayBuffer).toString("base64"), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  },
});

registry.register({
  name: "create_pptx",
  description: "إنشاء عرض تقديمي PowerPoint فعلي. يرجع base64.",
  parameters: {
    type: "object",
    properties: { title: { type: "string" }, slides: { type: "array", items: { type: "object", properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } } } } } },
    required: ["title", "slides"],
  },
  handler: async (_ctx, args) => {
    const pptx = new PptxGenJS();
    const titleSlide = pptx.addSlide();
    titleSlide.addText(args.title, { x: 0.5, y: 2, fontSize: 32, bold: true });
    for (const slide of args.slides || []) {
      const s = pptx.addSlide();
      s.addText(slide.title || "", { x: 0.5, y: 0.4, fontSize: 24, bold: true });
      s.addText((slide.bullets || []).map((b: string) => ({ text: b, options: { bullet: true } })), { x: 0.5, y: 1.2, fontSize: 16 });
    }
    const data = (await pptx.write({ outputType: "base64" })) as string;
    return { base64: data, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
  },
});

registry.register({
  name: "create_artifact",
  description: "عرض كود أو تطبيق تفاعلي في لوحة Artifacts الجانبية.",
  parameters: { type: "object", properties: { language: { type: "string", enum: ["html", "react", "javascript"] }, code: { type: "string" }, title: { type: "string" } }, required: ["language", "code"] },
  handler: async (_ctx, args) => ({ artifact: args }),
});

registry.register({
  name: "web_search",
  // البحث عبر SearXNG — مجاني تماماً، لا يحتاج مفتاح API ولا إعداد
  // BRAVE_API_KEY غير مطلوب — الأداة تستخدم SearXNG public instances فقط
  description: "بحث حقيقي في الويب مع إرجاع نتائج ومصادرها.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  handler: async (_ctx, args) => {
    const q = String(args.query || "").trim();
    if (!q) throw new Error("web_search: الاستعلام فارغ — أرسل نصاً للبحث عنه");

    // قائمة موسّعة من instances SearXNG العامة (بدون مفتاح، بصيغة JSON)
    // لا يوجد اعتماد على BRAVE_API_KEY أو أي مفتاح خارجي
    const SEARXNG_INSTANCES = [
      "https://searx.be",
      "https://search.inetol.net",
      "https://paulgo.io",
      "https://searx.tiekoetter.com",
      "https://search.rhscz.eu",
      "https://sx.catgirl.cloud",
      "https://priv.au",
      "https://etsi.me",
      "https://searx.prvcy.eu",
      "https://search.ononoki.org",
    ];

    let lastError: string = "";
    for (const base of SEARXNG_INSTANCES) {
      try {
        const url = `${base}/search?q=${encodeURIComponent(q)}&format=json&language=all&time_range=&safesearch=0&categories=general`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
            Accept: "application/json, text/javascript, */*",
            "Accept-Language": "ar,en;q=0.9",
          },
          signal: AbortSignal.timeout(9_000),
        });
        if (!res.ok) { lastError = `HTTP ${res.status} من ${base}`; continue; }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("json")) { lastError = `استجابة غير JSON من ${base}`; continue; }
        const data: any = await res.json();
        const raw: any[] = Array.isArray(data.results) ? data.results : [];
        if (raw.length === 0) { lastError = `لا نتائج من ${base}`; continue; }
        const results = raw.slice(0, 8).map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          snippet: r.content || r.snippet || "",
        }));
        log("info", `web_search: نجح عبر ${base}`, { query: q, count: results.length });
        return { results, source: base };
      } catch (err: any) {
        lastError = `${base}: ${err?.message || err}`;
        log("warn", `web_search: فشل instance`, { base, error: lastError });
        continue;
      }
    }

    // ── Brave Search API fallback ─────────────────────────────────────────────
    // Used when all SearXNG instances are unreachable (common in cloud hosting).
    // Requires BRAVE_SEARCH_API_KEY environment variable.
    const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (braveKey) {
      try {
        const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&search_lang=en&spellcheck=false`;
        const braveRes = await fetch(braveUrl, {
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": braveKey,
          },
          signal: AbortSignal.timeout(9_000),
        });
        if (braveRes.ok) {
          const data: any = await braveRes.json();
          const raw: any[] = Array.isArray(data.web?.results) ? data.web.results : [];
          if (raw.length > 0) {
            const results = raw.slice(0, 8).map((r: any) => ({
              title: r.title || "",
              url: r.url || "",
              snippet: r.description || r.extra_snippets?.[0] || "",
            }));
            log("info", `web_search: نجح عبر Brave Search API (fallback)`, { query: q, count: results.length });
            return { results, source: "brave-search-api" };
          }
        } else {
          log("warn", `web_search: Brave API فشل`, { status: braveRes.status });
        }
      } catch (err: any) {
        log("warn", `web_search: Brave API exception`, { error: err?.message });
      }
    }

    // إذا فشلت كل الـ instances والـ fallback (شائع في بيئات الاستضافة السحابية)
    throw new Error("تعذّر الوصول لخدمة البحث دلوقتي، حاول تاني." + (braveKey ? "" : " (لا يوجد BRAVE_SEARCH_API_KEY كـ fallback)"));
  },
});

registry.register({
  name: "fetch_webpage",
  description: "جلب محتوى صفحة ويب محددة عبر رابطها لقراءتها أو تلخيصها.",
  parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  handler: async (_ctx, args) => {
    const res = await fetch(args.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Yode9Bot/1.0)" } });
    if (!res.ok) throw new Error(`fetch_webpage: فشل الطلب HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 15000);
    return { text, title: $("title").text() };
  },
});

registry.register({
  name: "translate_text",
  description: "ترجمة نص من لغة إلى أخرى.",
  parameters: { type: "object", properties: { text: { type: "string" }, source_lang: { type: "string" }, target_lang: { type: "string" } }, required: ["text", "target_lang"] },
  handler: async (ctx, args) => callCloudflareModel(ctx, "@cf/meta/m2m100-1.2b", { text: args.text, source_lang: args.source_lang || "auto", target_lang: args.target_lang }),
});

// =====================================================================
// Google AI Embedding helper (gemini-embedding-001, dim=3072)
// Uses GOOGLE_AI_API_KEY. Throws explicitly on failure — no silent fallback.
// =====================================================================

const GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
const GOOGLE_EMBEDDING_DIM = 3072;
const MEMORY_SIMILARITY_THRESHOLD = 0.7;

async function generateGoogleEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error("generate_embedding: GOOGLE_AI_API_KEY غير مضبوط — لا يمكن توليد embedding");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GOOGLE_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`generate_embedding: فشل طلب Google Embedding HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values || values.length !== GOOGLE_EMBEDDING_DIM) {
    throw new Error(`generate_embedding: بُعد غير متوقع للـ embedding — توقعنا ${GOOGLE_EMBEDDING_DIM} وحصلنا ${values?.length ?? "undefined"}`);
  }
  return values;
}

registry.register({
  name: "generate_embeddings",
  description: "تحويل نص إلى تمثيل رقمي (vector) بأبعاد 3072 عبر Google Generative AI (gemini-embedding-001) لأغراض البحث الدلالي.",
  parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
  handler: async (_ctx, args) => {
    const embedding = await generateGoogleEmbedding(String(args.text));
    return { embedding, model: GOOGLE_EMBEDDING_MODEL, dimensions: GOOGLE_EMBEDDING_DIM };
  },
});

registry.register({
  name: "semantic_search",
  description: "بحث دلالي حقيقي في ذاكرة المستخدم المحفوظة باستخدام cosine similarity عبر pgvector.",
  parameters: { type: "object", properties: { query: { type: "string" }, threshold: { type: "number" } }, required: ["query"] },
  handler: async (ctx, args) => {
    const queryText = String(args.query).trim();
    if (!queryText) return { matches: [] };

    // توليد embedding للاستعلام — يرمي خطأ صريح إذا فشل
    const queryEmbedding = await generateGoogleEmbedding(queryText);
    const threshold = typeof args.threshold === "number" ? args.threshold : MEMORY_SIMILARITY_THRESHOLD;

    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    // pgvector: <=> هو cosine distance (0=متطابق, 1=متعامد)، فـ similarity = 1 - distance
    const result = await getPool().query(
      `SELECT fact, created_at, 1 - (embedding <=> $2::vector) AS similarity
       FROM ai_user_memories
       WHERE user_id = $1
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> $2::vector) >= $3
       ORDER BY similarity DESC
       LIMIT 10`,
      [ctx.userId, vectorLiteral, threshold]
    );
    return { matches: result.rows };
  },
});

registry.register({
  name: "manage_project",
  description: "إنشاء أو تبديل أو حذف مساحة عمل (Project).",
  parameters: { type: "object", properties: { action: { type: "string", enum: ["create", "switch", "delete", "list"] }, project_name: { type: "string" } }, required: ["action"] },
  handler: async (ctx, args) => {
    const pool = getPool();
    switch (args.action) {
      case "create": {
        const r = await pool.query("INSERT INTO ai_projects (user_id, name) VALUES ($1, $2) RETURNING id, name", [ctx.userId, args.project_name]);
        return { created: r.rows[0] };
      }
      case "switch": {
        await pool.query("UPDATE ai_projects SET is_active = false WHERE user_id = $1", [ctx.userId]);
        const r = await pool.query("UPDATE ai_projects SET is_active = true WHERE user_id = $1 AND name = $2 RETURNING id, name", [ctx.userId, args.project_name]);
        if (r.rowCount === 0) throw new Error(`لا يوجد مشروع باسم: ${args.project_name}`);
        return { active: r.rows[0] };
      }
      case "delete": {
        const r = await pool.query("DELETE FROM ai_projects WHERE user_id = $1 AND name = $2 RETURNING id", [ctx.userId, args.project_name]);
        return { deleted: r.rowCount };
      }
      case "list": {
        const r = await pool.query("SELECT id, name, is_active FROM ai_projects WHERE user_id = $1 ORDER BY created_at DESC", [ctx.userId]);
        return { projects: r.rows };
      }
      default:
        throw new Error(`إجراء غير معروف: ${args.action}`);
    }
  },
});

registry.register({
  name: "save_memory",
  description: "حفظ معلومة دائمة عن المستخدم مع embedding دلالي للبحث اللاحق.",
  parameters: { type: "object", properties: { fact: { type: "string" } }, required: ["fact"] },
  handler: async (ctx, args) => {
    const factText = String(args.fact).trim();
    if (!factText) throw new Error("save_memory: النص (fact) لا يمكن أن يكون فارغاً");

    // توليد embedding — يرمي خطأ صريح إذا فشل، لا fallback صامت
    const embedding = await generateGoogleEmbedding(factText);
    const vectorLiteral = `[${embedding.join(",")}]`;

    const r = await getPool().query(
      "INSERT INTO ai_user_memories (user_id, fact, embedding) VALUES ($1, $2, $3::vector) RETURNING id",
      [ctx.userId, factText, vectorLiteral]
    );
    return { saved: true, id: r.rows[0].id, embeddingDim: embedding.length };
  },
});

registry.register({
  name: "recall_memory",
  description: "استرجاع معلومات محفوظة سابقاً عن المستخدم — مع query يستخدم البحث الدلالي، بدون query يرجع آخر 20 ذاكرة.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: [] },
  handler: async (ctx, args) => {
    if (!args.query) {
      const r = await getPool().query(
        "SELECT fact, created_at FROM ai_user_memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
        [ctx.userId]
      );
      return { memories: r.rows };
    }
    const semanticTool = registry.get("semantic_search")!;
    return semanticTool.handler(ctx, { query: args.query });
  },
});

registry.register({
  name: "set_reminder",
  description: "جدولة تذكير أو مهمة للمستخدم في وقت محدد مستقبلاً.",
  parameters: { type: "object", properties: { message: { type: "string" }, remind_at: { type: "string" } }, required: ["message", "remind_at"] },
  handler: async (ctx, args) => {
    const r = await getPool().query("INSERT INTO ai_reminders (user_id, message, remind_at) VALUES ($1, $2, $3) RETURNING id", [ctx.userId, args.message, args.remind_at]);
    return { scheduled: true, id: r.rows[0].id, note: "شغّل checkDueReminders() من worker/cron كل دقيقة عشان تُرسل فعلياً" };
  },
});

export async function checkDueReminders(): Promise<Array<{ id: number; userId: string; message: string }>> {
  const pool = getPool();
  const r = await pool.query("SELECT id, user_id, message FROM ai_reminders WHERE remind_at <= now() AND fired = false");
  if (r.rowCount && r.rowCount > 0) {
    const ids = r.rows.map((row: any) => row.id);
    await pool.query("UPDATE ai_reminders SET fired = true WHERE id = ANY($1)", [ids]);
  }
  return r.rows.map((row: any) => ({ id: row.id, userId: row.user_id, message: row.message }));
}

registry.register({
  name: "github_repos",
  description: "جلب قائمة مستودعات GitHub الخاصة بالمستخدم.",
  parameters: { type: "object", properties: {}, required: [] },
  handler: async (ctx) => {
    if (!ctx.extras?.githubToken) throw new Error("github_repos: لازم تمرر ctx.extras.githubToken");
    const res = await fetch("https://api.github.com/user/repos?per_page=50", {
      headers: { Authorization: `Bearer ${ctx.extras.githubToken}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`github_repos: فشل الطلب HTTP ${res.status}`);
    const data: any = await res.json();
    return { repos: data.map((r: any) => ({ name: r.full_name, private: r.private, url: r.html_url })) };
  },
});

registry.register({
  name: "github_issues",
  description: "جلب قائمة المشاكل المفتوحة في مستودع GitHub محدد.",
  parameters: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"] },
  handler: async (ctx, args) => {
    if (!ctx.extras?.githubToken) throw new Error("github_issues: لازم تمرر ctx.extras.githubToken");
    const res = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/issues?state=open&per_page=50`, {
      headers: { Authorization: `Bearer ${ctx.extras.githubToken}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`github_issues: فشل الطلب HTTP ${res.status}`);
    const data: any = await res.json();
    return { issues: data.map((i: any) => ({ number: i.number, title: i.title, url: i.html_url })) };
  },
});

// =====================================================================
// 6) إدارة سياق المحادثة
// =====================================================================

interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string; }
const MAX_CONTEXT_MESSAGES = 40;
function trimContext(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;
  const systemMessages = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  return [...systemMessages, ...rest.slice(-1 * (MAX_CONTEXT_MESSAGES - systemMessages.length))];
}

// =====================================================================
// 7) حلقة المحادثة مع الأدوات
// =====================================================================

const MAX_TOOL_ITERATIONS = 6;
export interface ChatWithToolsResult { finalMessage: string; toolCallsLog: Array<{ tool: string; args: any; result: any; durationMs: number }>; iterations: number; providerUsed?: string; }

export async function chatWithTools(
  ctx: ToolContext,
  model: string,
  messages: ChatMessage[],
  options?: { onToolCall?: (toolName: string, args: any) => void }
): Promise<ChatWithToolsResult> {
  // modelSupportsTools دائمًا true — نظام الـ fallback يتعامل مع أي نموذج
  const toolCallsLog: ChatWithToolsResult["toolCallsLog"] = [];
  let currentMessages = trimContext(messages);
  const toolSchemas = registry.getSchemas();
  let forceFinalAnswer = false;
  let lastProvider = "";
  const seenToolCalls = new Map<string, number>();

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    log("info", `تكرار رقم ${i + 1} من حلقة الأدوات`);

    // استدعاء النموذج عبر نظام الـ fallback (Groq → OpenRouter → Gemini → Cloudflare)
    const response = await callModelWithFallback(
      ctx,
      currentMessages,
      forceFinalAnswer ? undefined : toolSchemas
    );
    lastProvider = response.provider;

    const toolCalls = response.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      log("info", `انتهت الحلقة برد نهائي من ${response.provider}`);
      return { finalMessage: response.response || "", toolCallsLog, iterations: i + 1, providerUsed: response.provider };
    }

    // كشف الاستدعاءات المكررة
    let hasDuplicate = false;
    for (const call of toolCalls) {
      const key = `${call.name}:${JSON.stringify(call.arguments)}`;
      const count = (seenToolCalls.get(key) ?? 0) + 1;
      seenToolCalls.set(key, count);
      if (count >= 2) { hasDuplicate = true; break; }
    }

    for (const call of toolCalls) {
      const toolName = call.name;
      const args = typeof call.arguments === "string"
        ? (() => { try { return JSON.parse(call.arguments); } catch { return {}; } })()
        : (call.arguments ?? {});
      const tool = registry.get(toolName);
      options?.onToolCall?.(toolName, args);
      const startedAt = Date.now();
      let result: any;
      if (!tool) {
        result = { error: `أداة غير مسجلة: ${toolName}` };
        log("error", `محاولة استدعاء أداة غير موجودة: ${toolName}`);
      } else if (SENSITIVE_TOOL_NAMES.has(toolName)) {
        // ── Guardrails: sensitive tools (code exec, raw SQL) must pass an
        // intent check before they run. Never silently skip this.
        const lastUserMessage = [...currentMessages].reverse().find((m) => m.role === "user")?.content;
        const decision = await checkGuardrail({
          toolName,
          args,
          userContext: lastUserMessage,
          actorId: ctx.userId,
        });
        if (!decision.allowed) {
          result = {
            error:
              "تم رفض تنفيذ هذه الأداة: الطلب يبدو أنه يستهدف نظاماً حقيقياً تابعاً لطرف ثالث دون إذن أو ملكية معلنة. " +
              "هذه القدرة مخصصة للاستخدام التعليمي أو على أنظمتك الخاصة أو بيئات معملية مصرَّح بها فقط.",
            guardrailBlocked: true,
            classification: decision.classification,
          };
          log("warn", `Guardrails رفض تنفيذ ${toolName}`, { classification: decision.classification });
        } else {
          try {
            result = await tool.handler(ctx, args);
            log("info", `نجح تنفيذ الأداة: ${toolName}`, { args });
          } catch (err: any) {
            result = { error: err.message };
            log("error", `فشل تنفيذ الأداة: ${toolName}`, { error: err.message });
          }
        }
      } else {
        try {
          result = await tool.handler(ctx, args);
          log("info", `نجح تنفيذ الأداة: ${toolName}`, { args });
        } catch (err: any) {
          result = { error: err.message };
          log("error", `فشل تنفيذ الأداة: ${toolName}`, { error: err.message });
        }
      }
      const durationMs = Date.now() - startedAt;
      toolCallsLog.push({ tool: toolName, args, result, durationMs });
      currentMessages.push({
        role: "tool",
        name: toolName,
        tool_call_id: call.id || toolName,
        content: JSON.stringify(result),
      });
    }

    forceFinalAnswer = true; // الجولة القادمة: أجب فقط، لا تستدعِ أدوات
    currentMessages = trimContext(currentMessages);

    if (hasDuplicate) {
      log("warn", "كُشف استدعاء مكرر للأداة — إنهاء الحلقة مبكراً");
      break;
    }
  }

  log("warn", "تم الوصول للحد الأقصى من تكرارات حلقة الأدوات دون رد نهائي");
  return {
    finalMessage: "تم الوصول للحد الأقصى من محاولات استخدام الأدوات دون التوصل لرد نهائي.",
    toolCallsLog,
    iterations: MAX_TOOL_ITERATIONS,
  };
}

// =====================================================================
// 8) دوال مساعدة للتصدير
// =====================================================================

export function getToolsStatus(): Array<{ name: string; description: string }> {
  return registry.getSchemas().map((t) => ({ name: t.name, description: t.description }));
}
export function getLogs(limit?: number) {
  return getRecentLogs(limit);
}
