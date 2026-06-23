import { Router } from "express";
import { z } from "zod";
import { listProviders as getAvailableProviders, invalidateProviderCache } from "../lib/ai-providers";
import { internalAuth } from "../middlewares/internalAuth";
import { logger } from "../lib/logger";
import OpenAI from "openai";

const router = Router();

const setPersonalUrlSchema = z.object({
  url: z.string().url().max(512),
});

const testSchema = z.object({
  baseURL: z.string().url().max(512).optional(),
  apiKey: z.string().min(1).max(512).optional(),
  model: z.string().max(128).optional(),
});

// GET /providers — public (frontend needs this without auth)
router.get("/providers", (_req, res) => {
  res.json({ providers: getAvailableProviders() });
});

// POST /providers/reload — requires internalAuth
router.post("/providers/reload", internalAuth, (_req, res) => {
  invalidateProviderCache();
  res.json({ ok: true, providers: getAvailableProviders() });
});

// POST /providers/set-personal-url — requires internalAuth (mutates server env)
router.post("/providers/set-personal-url", internalAuth, (req, res) => {
  const parsed = setPersonalUrlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Valid URL required." });
  }
  const cleanUrl = parsed.data.url.trim().replace(/\/$/, "");
  process.env.PERSONAL_API_BASE_URL = cleanUrl;
  invalidateProviderCache();
  logger.info({ url: cleanUrl }, "Personal API base URL updated");
  return res.json({ ok: true, url: cleanUrl });
});

// POST /providers/test — requires internalAuth
router.post("/providers/test", internalAuth, async (req, res) => {
  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "baseURL or apiKey required.", latencyMs: 0 });
  }
  const { baseURL, apiKey, model } = parsed.data;

  if (!baseURL && !apiKey) {
    return res.status(400).json({ ok: false, error: "baseURL or apiKey required.", latencyMs: 0 });
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
    const isAuthError =
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("Unauthorized") ||
      msg.includes("authentication");
    return res.json({
      ok: isAuthError,
      latencyMs: Date.now() - start,
      error: isAuthError ? undefined : msg.slice(0, 200),
    });
  }
});

export default router;
