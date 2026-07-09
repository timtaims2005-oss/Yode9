import { Router, type IRouter } from "express";
import { threatIntelEngine } from "../lib/threat-intelligence";
import { cacheGet, cacheSet, cacheDel } from "../lib/redis.js";

const router: IRouter = Router();

const STATS_TTL = 30;      // stats refresh every 30 s
const TOP_TTL   = 60;      // top threats refresh every 60 s

router.get("/threat-intel/stats", async (_req, res): Promise<void> => {
  const key = "threat-intel:stats";
  const hit = await cacheGet<object>(key);
  if (hit) { res.setHeader("X-Cache", "HIT"); res.json(hit); return; }
  const data = threatIntelEngine.getThreatStats();
  cacheSet(key, data, STATS_TTL).catch(() => {});
  res.json(data);
});

router.get("/threat-intel/top", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"]) || 20, 100);
  const key = `threat-intel:top:${limit}`;
  const hit = await cacheGet<object[]>(key);
  if (hit) { res.setHeader("X-Cache", "HIT"); res.json(hit); return; }
  const data = threatIntelEngine.getTopThreats(limit);
  cacheSet(key, data, TOP_TTL).catch(() => {});
  res.json(data);
});

router.get("/threat-intel/events", (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 100, 1000);
  const severity = req.query["severity"] as string | undefined;
  const sevs = ["info","low","medium","high","critical"] as const;
  const minSev = sevs.includes(severity as typeof sevs[number])
    ? (severity as typeof sevs[number]) : undefined;
  res.json(threatIntelEngine.getRecentEvents(limit, minSev));
});

router.post("/threat-intel/check", (req, res) => {
  const { value } = req.body as { value?: string };
  if (!value) { res.status(400).json({ error: "value required" }); return; }
  const ioc = threatIntelEngine.checkIOC(value);
  res.json({ found: !!ioc, ioc: ioc ?? null });
});

router.post("/threat-intel/ioc", async (req, res): Promise<void> => {
  try {
    const ioc = threatIntelEngine.addIOC(req.body);
    // Invalidate cached stats/top on new IOC
    await Promise.all([
      cacheDel("threat-intel:stats"),
      cacheDel("threat-intel:top:20"),
    ]);
    res.status(201).json(ioc);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
