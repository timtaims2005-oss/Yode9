import { Router } from "express";
import { listProviders as getAvailableProviders, invalidateProviderCache } from "../lib/ai-providers";
import OpenAI from "openai";

const router = Router();

router.get("/providers", (_req, res) => {
  res.json({ providers: getAvailableProviders() });
});

router.post("/providers/reload", (_req, res) => {
  invalidateProviderCache();
  res.json({ ok: true, providers: getAvailableProviders() });
});

router.post("/providers/set-personal-url", (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") return res.status(400).json({ error: "url required" });
  process.env.PERSONAL_API_BASE_URL = url.trim().replace(/\/$/, "");
  invalidateProviderCache();
  return res.json({ ok: true, url: process.env.PERSONAL_API_BASE_URL });
});

router.post("/providers/test", async (req, res) => {
  const { baseURL, apiKey, model } = req.body as {
    baseURL?: string;
    apiKey?: string;
    model?: string;
  };

  if (!baseURL && !apiKey) {
    return res.status(400).json({ ok: false, error: "baseURL or apiKey required", latencyMs: 0 });
  }

  const start = Date.now();
  try {
    const client = new OpenAI({
      apiKey: apiKey || "sk-test",
      baseURL: baseURL || "https://api.openai.com/v1",
      timeout: 10_000,
      maxRetries: 0,
    });

    await client.chat.completions.create({
      model: model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      stream: false,
    });

    return res.json({ ok: true, latencyMs: Date.now() - start });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // 401/403 means the API is reachable but key is wrong — still means connectivity is OK
    const isAuthError = msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("authentication");
    return res.json({
      ok: isAuthError,
      latencyMs: Date.now() - start,
      error: isAuthError ? undefined : msg.slice(0, 200),
    });
  }
});

export default router;
