import { Router } from "express";
import { logger } from "../lib/logger";
import { localEngineAuth } from "../lib/local-engine-auth";

const router = Router();

// ── Auth: all local-proxy routes require LOCAL_ENGINE_API_KEY when configured ─
router.use(localEngineAuth);

// ── Trusted endpoint check ────────────────────────────────────────────────────
// Allows:  loopback (127.x / ::1), RFC-1918 LAN (192.168.x / 10.x),
//          AND the operator-configured OLLAMA_HOST / VITE_OLLAMA_BASE_URL so
//          that the configured ngrok endpoint can be proxied without a 403.
const OLLAMA_HOST = (
  process.env.OLLAMA_HOST ?? process.env.VITE_OLLAMA_BASE_URL ?? ""
).replace(/\/$/, "");
const CUSTOM_API_KEY = (process.env.CUSTOM_API_KEY ?? "").trim();

function isTrustedEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.")
    ) return true;
    // Allow the operator-configured Ollama / local-engine endpoint (e.g. ngrok)
    if (OLLAMA_HOST) {
      try {
        const configuredHost = new URL(OLLAMA_HOST).hostname;
        if (host === configuredHost) return true;
      } catch { /* ignore malformed env value */ }
    }
    return false;
  } catch {
    return false;
  }
}

router.get("/local-proxy/ping", async (req, res) => {
  const raw = typeof req.query.endpoint === "string" ? req.query.endpoint.trim() : "";
  if (!raw) return res.status(400).json({ error: "endpoint required" });

  const url = raw.replace(/\/$/, "");
  if (!isTrustedEndpoint(url)) {
    return res.status(403).json({ error: "Only local or configured engine endpoints are allowed." });
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`${url}/models`, {
      signal: controller.signal,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(CUSTOM_API_KEY ? { Authorization: `Bearer ${CUSTOM_API_KEY}` } : {}),
      },
    });
    clearTimeout(tid);
    if (!resp.ok) return res.json({ ok: false, status: resp.status });
    const data = (await resp.json()) as { data?: Array<{ id: string }> };
    const models: string[] = (data?.data ?? []).map((m: { id: string }) => m.id).filter(Boolean);
    return res.json({ ok: true, models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unreachable";
    return res.json({ ok: false, error: msg });
  }
});

router.post("/local-proxy/chat", async (req, res) => {
  const { endpoint, model, messages, stream = true } = req.body as {
    endpoint?: string;
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    stream?: boolean;
  };

  if (!endpoint || !model || !Array.isArray(messages)) {
    return res.status(400).json({ error: "endpoint, model and messages are required" });
  }

  const base = endpoint.replace(/\/$/, "");
  if (!isTrustedEndpoint(base)) {
    return res.status(403).json({ error: "Only local or configured engine endpoints are allowed." });
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 120_000);

    let upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(CUSTOM_API_KEY ? { Authorization: `Bearer ${CUSTOM_API_KEY}` } : {}),
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ model, messages, stream }),
      signal: controller.signal,
    });

    // The configured Ollama/ngrok bridge returns 500 for streaming requests
    // but supports the same OpenAI-compatible response non-streaming.
    let usedNonStreamingFallback = false;
    if (!upstream.ok && stream && upstream.status >= 500) {
      usedNonStreamingFallback = true;
      upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(CUSTOM_API_KEY ? { Authorization: `Bearer ${CUSTOM_API_KEY}` } : {}),
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ model, messages, stream: false }),
        signal: controller.signal,
      });
    }

    clearTimeout(tid);

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      logger.warn({ status: upstream.status }, "local-proxy upstream error");
      const isHtml = txt.includes("<!DOCTYPE") || txt.includes("<html");
      const cleanMsg = isHtml
        ? `Local model server at ${base} returned error ${upstream.status}. Is Ollama/LM Studio running?`
        : `Upstream error ${upstream.status}: ${txt.slice(0, 200)}`;
      return res.status(502).json({ error: cleanMsg });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (usedNonStreamingFallback) {
      const data = await upstream.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    return res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "proxy error";
    logger.error({ err }, "local-proxy error");
    if (!res.headersSent) {
      return void res.status(502).json({ error: msg });
    }
    return res.end();
  }
});

export default router;
