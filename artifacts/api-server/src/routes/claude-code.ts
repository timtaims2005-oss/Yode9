import { Router } from "express";

const router = Router();

type Provider = "anthropic" | "openai" | "groq" | "openrouter" | "gemini";

function detectProvider(key: string): Provider {
  if (key.startsWith("sk-ant")) return "anthropic";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-or-")) return "openrouter";
  return "openai";
}

const PROVIDER_MODELS: Record<Provider, Record<string, string>> = {
  anthropic: {
    medium:    "claude-3-5-haiku-20241022",
    high:      "claude-3-5-sonnet-20241022",
    xhigh:     "claude-3-7-sonnet-20250219",
    max:       "claude-opus-4-5",
    ultracode: "claude-opus-4-5",
  },
  openai: {
    medium:    "gpt-4o-mini",
    high:      "gpt-4o",
    xhigh:     "o4-mini",
    max:       "o3",
    ultracode: "o3",
  },
  groq: {
    medium:    "llama-3.1-8b-instant",
    high:      "llama-3.3-70b-versatile",
    xhigh:     "llama-3.3-70b-versatile",
    max:       "llama-3.3-70b-versatile",
    ultracode: "llama-3.3-70b-versatile",
  },
  openrouter: {
    medium:    "meta-llama/llama-3.1-8b-instruct",
    high:      "anthropic/claude-3.5-sonnet",
    xhigh:     "anthropic/claude-3.7-sonnet",
    max:       "anthropic/claude-opus-4-5",
    ultracode: "anthropic/claude-opus-4-5",
  },
  gemini: {
    medium:    "gemini-2.5-flash",
    high:      "gemini-2.5-flash",
    xhigh:     "gemini-2.5-pro",
    max:       "gemini-2.5-pro",
    ultracode: "gemini-2.5-pro",
  },
};

const ANTHROPIC_MAX_TOKENS: Record<string, number> = {
  medium: 4096, high: 8192, xhigh: 16000, max: 16000, ultracode: 32000,
};
const ANTHROPIC_THINKING: Record<string, number> = {
  xhigh: 8000, max: 10000, ultracode: 16000,
};

function buildSystemPrompt(mode: string, system: string, files: { name: string; content: string }[]): string {
  const parts: string[] = [
    `You are an autonomous AI coding agent operating in ${mode.toUpperCase()} mode.`,
    `Help with complex coding tasks, architecture decisions, debugging, and autonomous task execution.`,
    `Describe your actions clearly:`,
    `- Reading a file: start with "Read file: <filename>"`,
    `- Writing a file: start with "Write file: <filename>"`,
    `- Running a command: start with "Bash: <command>"`,
    `- Searching: start with "Search: <query>"`,
  ];
  if (mode === "ultracode") {
    parts.push(`\nULTRACODE MODE: For every task: 1) Plan completely 2) Break into sub-workflows 3) Execute each 4) Synthesize results. Maximum depth. No shortcuts.`);
  } else if (mode === "max") {
    parts.push(`\nMAX MODE: Use maximum reasoning. Exhaustive analysis required.`);
  }
  if (system) parts.push(`\nAdditional instructions: ${system}`);
  if (files.length > 0) {
    parts.push(`\nWorkspace files:`);
    for (const f of files) parts.push(`\n=== ${f.name} ===\n${f.content}\n`);
  }
  return parts.join("\n");
}

function sseWrite(res: any, obj: unknown) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

// ── Anthropic streaming proxy ──────────────────────────────────────────────────

async function streamAnthropic(
  res: any,
  apiKey: string,
  messages: any[],
  mode: string,
  fullSystem: string,
  req: any,
) {
  const model = PROVIDER_MODELS.anthropic[mode] ?? PROVIDER_MODELS.anthropic.xhigh;
  const maxTokens = ANTHROPIC_MAX_TOKENS[mode] ?? 8192;
  const useThinking = ["xhigh", "max", "ultracode"].includes(mode);
  const thinkingBudget = ANTHROPIC_THINKING[mode] ?? 0;

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  if (useThinking && thinkingBudget > 0) {
    headers["anthropic-beta"] = "interleaved-thinking-2025-05-14";
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    stream: true,
    system: fullSystem,
    messages,
  };
  if (useThinking && thinkingBudget > 0) {
    body["thinking"] = { type: "enabled", budget_tokens: thinkingBudget };
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    let errMsg = errText;
    try { errMsg = JSON.parse(errText)?.error?.message ?? errText; } catch {}
    sseWrite(res, { type: "error", error: errMsg });
    res.end();
    return;
  }

  const reader = upstream.body?.getReader();
  if (!reader) { res.end(); return; }

  const decoder = new TextDecoder();
  let buf = "";

  req.on("close", () => { try { reader.cancel(); } catch {} });

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) res.write(line + "\n\n");
    }
  }

  sseWrite(res, { type: "message_stop" });
  res.end();
}

// ── OpenAI-compatible streaming (OpenAI, Groq, OpenRouter) ─────────────────────

async function streamOpenAICompat(
  res: any,
  apiKey: string,
  provider: Provider,
  messages: any[],
  mode: string,
  fullSystem: string,
  req: any,
) {
  const model = PROVIDER_MODELS[provider][mode] ?? PROVIDER_MODELS[provider].xhigh;

  const baseURLs: Record<string, string> = {
    openai:     "https://api.openai.com/v1/chat/completions",
    groq:       "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  };
  const url = baseURLs[provider] ?? baseURLs.openai;

  const chatMessages = [
    { role: "system", content: fullSystem },
    ...messages,
  ];

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(provider === "openrouter" ? { "HTTP-Referer": "https://mr7.ai", "X-Title": "KaliGPT" } : {}),
    },
    body: JSON.stringify({ model, messages: chatMessages, stream: true, max_tokens: 8192 }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    let errMsg = errText;
    try { errMsg = JSON.parse(errText)?.error?.message ?? errText; } catch {}
    sseWrite(res, { type: "error", error: errMsg });
    res.end();
    return;
  }

  const reader = upstream.body?.getReader();
  if (!reader) { res.end(); return; }

  const decoder = new TextDecoder();
  let buf = "";
  let blockStarted = false;

  req.on("close", () => { try { reader.cancel(); } catch {} });

  sseWrite(res, { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  blockStarted = true;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw);
        const delta = evt?.choices?.[0]?.delta;
        if (delta?.content) {
          sseWrite(res, {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: delta.content },
          });
        }
      } catch {}
    }
  }

  if (blockStarted) {
    sseWrite(res, { type: "content_block_stop", index: 0 });
  }
  sseWrite(res, { type: "message_stop" });
  res.end();
}

// ── Gemini streaming ───────────────────────────────────────────────────────────

async function streamGemini(
  res: any,
  apiKey: string,
  messages: any[],
  mode: string,
  fullSystem: string,
  req: any,
) {
  const model = PROVIDER_MODELS.gemini[mode] ?? "gemini-2.5-flash";

  const contents = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: fullSystem }] },
        contents,
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
  );

  if (!upstream.ok) {
    const errText = await upstream.text();
    let errMsg = errText;
    try { errMsg = JSON.parse(errText)?.error?.message ?? errText; } catch {}
    sseWrite(res, { type: "error", error: errMsg });
    res.end();
    return;
  }

  const reader = upstream.body?.getReader();
  if (!reader) { res.end(); return; }

  const decoder = new TextDecoder();
  let buf = "";

  req.on("close", () => { try { reader.cancel(); } catch {} });

  sseWrite(res, { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      try {
        const evt = JSON.parse(raw);
        const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          sseWrite(res, {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text },
          });
        }
      } catch {}
    }
  }

  sseWrite(res, { type: "content_block_stop", index: 0 });
  sseWrite(res, { type: "message_stop" });
  res.end();
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.post("/claude-code/stream", async (req, res) => {
  const apiKey = (req.headers["x-api-key"] ?? req.headers["x-anthropic-key"]) as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: "مفتاح API مطلوب" });
    return;
  }

  const {
    messages = [],
    mode = "xhigh",
    system = "",
    files = [] as { name: string; content: string }[],
  } = req.body as {
    messages: { role: string; content: string }[];
    mode: string;
    system: string;
    files: { name: string; content: string }[];
  };

  const provider = detectProvider(apiKey);
  const fullSystem = buildSystemPrompt(mode, system, files);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    if (provider === "anthropic") {
      await streamAnthropic(res, apiKey, messages, mode, fullSystem, req);
    } else if (provider === "gemini") {
      await streamGemini(res, apiKey, messages, mode, fullSystem, req);
    } else {
      await streamOpenAICompat(res, apiKey, provider, messages, mode, fullSystem, req);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!res.writableEnded) {
      sseWrite(res, { type: "error", error: msg });
      res.end();
    }
  }
});

router.post("/claude-code/verify-key", async (req, res) => {
  const apiKey = (req.headers["x-api-key"] ?? req.headers["x-anthropic-key"]) as string | undefined;
  if (!apiKey) {
    res.status(401).json({ error: "مفتاح API مطلوب" });
    return;
  }

  const provider = detectProvider(apiKey);

  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      const data = await r.json() as any;
      if (!r.ok) {
        res.status(401).json({ error: data?.error?.message ?? "مفتاح Anthropic غير صالح" });
        return;
      }
      res.json({ ok: true, provider, models: (data.data ?? []).slice(0, 5).map((m: any) => m.id) });
    } else if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const data = await r.json() as any;
      if (!r.ok) {
        res.status(401).json({ error: data?.error?.message ?? "مفتاح OpenAI غير صالح" });
        return;
      }
      res.json({ ok: true, provider, models: (data.data ?? []).slice(0, 5).map((m: any) => m.id) });
    } else if (provider === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const data = await r.json() as any;
      if (!r.ok) {
        res.status(401).json({ error: data?.error?.message ?? "مفتاح Groq غير صالح" });
        return;
      }
      res.json({ ok: true, provider, models: (data.data ?? []).slice(0, 5).map((m: any) => m.id) });
    } else if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await r.json() as any;
      if (!r.ok) {
        res.status(401).json({ error: data?.error?.message ?? "مفتاح Gemini غير صالح" });
        return;
      }
      res.json({ ok: true, provider, models: (data.models ?? []).slice(0, 5).map((m: any) => m.name) });
    } else if (provider === "openrouter") {
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      const data = await r.json() as any;
      if (!r.ok) {
        res.status(401).json({ error: data?.error?.message ?? "مفتاح OpenRouter غير صالح" });
        return;
      }
      res.json({ ok: true, provider, models: (data.data ?? []).slice(0, 5).map((m: any) => m.id) });
    } else {
      res.status(400).json({ error: "نوع المفتاح غير معروف" });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
