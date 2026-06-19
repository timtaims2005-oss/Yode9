import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const ENGINES = [
  { id: "ollama",    base: "http://localhost:11434", chatPath: "/api/chat",           type: "ollama"   },
  { id: "lmstudio", base: "http://localhost:1234",  chatPath: "/v1/chat/completions", type: "openai"   },
  { id: "jan",       base: "http://localhost:1337",  chatPath: "/v1/chat/completions", type: "openai"   },
  { id: "gpt4all",  base: "http://localhost:4891",  chatPath: "/v1/chat/completions", type: "openai"   },
  { id: "openwebui", base: "http://localhost:3000",  chatPath: "/api/chat",            type: "openwebui" },
  { id: "llamafile", base: "http://localhost:8081",  chatPath: "/v1/chat/completions", type: "openai"   },
  { id: "kobold",   base: "http://localhost:5001",  chatPath: "/api/v1/generate",     type: "kobold"   },
] as const;

type EngineId = typeof ENGINES[number]["id"];

interface EngineHealth { id: EngineId; online: boolean; latencyMs: number | null; }
interface HealthCache  { ts: number; results: EngineHealth[]; }

let healthCache: HealthCache | null = null;
const CACHE_TTL = 10_000;

async function pingEngine(eng: typeof ENGINES[number]): Promise<EngineHealth> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 3000);
    let url = eng.base;
    if (eng.id === "ollama") url += "/api/tags";
    else if (eng.type === "openai" || eng.type === "openwebui") url += "/v1/models";
    else url += "/api/v1/model";
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    return { id: eng.id, online: r.ok, latencyMs: Date.now() - t0 };
  } catch {
    return { id: eng.id, online: false, latencyMs: null };
  }
}

async function getHealthy(): Promise<EngineHealth[]> {
  const now = Date.now();
  if (healthCache && now - healthCache.ts < CACHE_TTL) return healthCache.results;
  const results = await Promise.all(ENGINES.map(pingEngine));
  healthCache = { ts: now, results };
  return results;
}

// GET /api/lb/health — all engine statuses
router.get("/lb/health", async (_req, res) => {
  const results = await getHealthy();
  res.json({ engines: results, ts: Date.now() });
});

// POST /api/lb/chat — route to fastest online engine (SSE out)
router.post("/lb/chat", async (req, res) => {
  const { messages, model, preferEngine } = req.body as {
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    preferEngine?: EngineId;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (d: object) => res.write(`data: ${JSON.stringify(d)}\n\n`);

  const healthy = await getHealthy();
  const online  = healthy.filter(h => h.online).sort((a, b) => (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999));

  if (online.length === 0) {
    send({ type: "error", message: "No local engines are online. Start Ollama or another engine first." });
    return res.end();
  }

  // Prefer requested engine if it's online
  let chosen = online[0];
  if (preferEngine) {
    const pref = online.find(h => h.id === preferEngine);
    if (pref) chosen = pref;
  }

  const eng = ENGINES.find(e => e.id === chosen.id)!;
  send({ type: "routed", engine: eng.id, latencyMs: chosen.latencyMs, onlineCount: online.length });

  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 120_000);

    let body: object;
    if (eng.type === "ollama") {
      body = { model: model ?? "llama3.2:1b", messages, stream: true };
    } else if (eng.type === "kobold") {
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";
      body = { prompt, max_length: 512, temperature: 0.7 };
    } else {
      body = { model: model ?? "default", messages, stream: true };
    }

    const upstream = await fetch(`${eng.base}${eng.chatPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer local" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(tid);

    if (!upstream.ok || !upstream.body) {
      send({ type: "error", message: `Engine ${eng.id} returned ${upstream.status}` });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const dec    = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const line of parts) {
        const clean = line.replace(/^data:\s*/, "").trim();
        if (!clean || clean === "[DONE]") continue;
        try {
          const d = JSON.parse(clean);
          let chunk = "";
          if (eng.type === "ollama") {
            chunk = d?.message?.content ?? d?.response ?? "";
          } else {
            chunk = d?.choices?.[0]?.delta?.content ?? d?.choices?.[0]?.text ?? "";
          }
          if (chunk) send({ type: "chunk", content: chunk, engine: eng.id });
        } catch { /* ignore */ }
      }
    }

    send({ type: "done", engine: eng.id });
    res.end();
  } catch (err) {
    logger.warn({ err }, "lb/chat upstream error");
    send({ type: "error", message: err instanceof Error ? err.message : "Stream error" });
    res.end();
  }
});

// POST /api/lb/race — send prompt to ALL online engines simultaneously (SSE)
router.post("/lb/race", async (req, res) => {
  const { messages, model } = req.body as {
    messages?: Array<{ role: string; content: string }>;
    model?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (d: object) => res.write(`data: ${JSON.stringify(d)}\n\n`);

  const healthy = await getHealthy();
  const online  = healthy.filter(h => h.online);

  send({ type: "start", engines: online.map(h => h.id), count: online.length });

  if (online.length === 0) {
    send({ type: "error", message: "No engines online" });
    return res.end();
  }

  const activeEngines = new Set<string>(online.map(h => h.id));

  const streamEngine = async (eid: EngineId) => {
    const eng = ENGINES.find(e => e.id === eid)!;
    const t0  = Date.now();
    try {
      let body: object;
      if (eng.type === "ollama") {
        body = { model: model ?? "llama3.2:1b", messages, stream: true };
      } else if (eng.type === "kobold") {
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";
        body = { prompt, max_length: 400, temperature: 0.7 };
      } else {
        body = { model: model ?? "default", messages, stream: true };
      }

      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 60_000);
      const upstream = await fetch(`${eng.base}${eng.chatPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer local" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(tid);

      if (!upstream.ok || !upstream.body) {
        send({ type: "engine_error", engine: eid, message: `HTTP ${upstream.status}` });
        activeEngines.delete(eid);
        return;
      }

      send({ type: "engine_start", engine: eid, latencyMs: Date.now() - t0 });

      const reader = upstream.body.getReader();
      const dec    = new TextDecoder();
      let buf      = "";
      let text     = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() ?? "";
        for (const line of parts) {
          const clean = line.replace(/^data:\s*/, "").trim();
          if (!clean || clean === "[DONE]") continue;
          try {
            const d = JSON.parse(clean);
            let chunk = "";
            if (eng.type === "ollama") chunk = d?.message?.content ?? d?.response ?? "";
            else chunk = d?.choices?.[0]?.delta?.content ?? d?.choices?.[0]?.text ?? "";
            if (chunk) {
              text += chunk;
              send({ type: "engine_chunk", engine: eid, content: chunk, totalLen: text.length });
            }
          } catch { /* ignore */ }
        }
      }

      const elapsed = Date.now() - t0;
      send({ type: "engine_done", engine: eid, totalText: text, elapsedMs: elapsed, tokensEst: Math.round(text.split(" ").length) });
    } catch (err) {
      send({ type: "engine_error", engine: eid, message: err instanceof Error ? err.message : "Error" });
    } finally {
      activeEngines.delete(eid);
      if (activeEngines.size === 0) {
        send({ type: "race_done" });
        res.end();
      }
    }
  };

  // Fire all engines simultaneously
  online.forEach(h => streamEngine(h.id as EngineId));
});

// POST /api/lb/benchmark — quick latency benchmark all engines
router.post("/lb/benchmark", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (d: object) => res.write(`data: ${JSON.stringify(d)}\n\n`);
  send({ type: "start", engines: ENGINES.map(e => e.id) });

  const pingPromise = ENGINES.map(async (eng) => {
    const t0 = Date.now();
    let pingUrl = eng.base;
    if (eng.id === "ollama")       pingUrl += "/api/tags";
    else if (eng.type === "kobold") pingUrl += "/api/v1/model";
    else                            pingUrl += "/v1/models";

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000);
      const r    = await fetch(pingUrl, { signal: ctrl.signal });
      clearTimeout(tid);
      const lat  = Date.now() - t0;
      let modelCount = 0;
      if (r.ok) {
        try {
          const d = await r.json() as Record<string, unknown>;
          if (eng.id === "ollama") modelCount = ((d.models as unknown[]) ?? []).length;
          else modelCount = ((d.data as unknown[]) ?? []).length;
        } catch { /* ignore */ }
      }
      send({ type: "result", engine: eng.id, online: r.ok, latencyMs: lat, modelCount });
    } catch {
      send({ type: "result", engine: eng.id, online: false, latencyMs: null, modelCount: 0 });
    }
  });

  await Promise.all(pingPromise);
  send({ type: "done" });
  res.end();
});

export default router;
