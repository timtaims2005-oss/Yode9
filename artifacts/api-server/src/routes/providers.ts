import { Router } from "express";
import { getAvailableProviders, invalidateProviderCache } from "../lib/ai-providers";

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
  process.env.PERSONAL_API_BASE_URL = url.trim().replace(/\/$/, "") ;
  invalidateProviderCache();
  return res.json({ ok: true, url: process.env.PERSONAL_API_BASE_URL });
});

export default router;
