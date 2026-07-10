import { Router, type IRouter } from "express";
import { threatIntelEngine } from "../lib/threat-intelligence";

const router: IRouter = Router();

router.get("/threat-intel/stats", (_req, res) => {
  res.json(threatIntelEngine.getThreatStats());
});

router.get("/threat-intel/top", (req, res) => {
  const limit = Math.min(Number(req.query["limit"]) || 20, 100);
  res.json(threatIntelEngine.getTopThreats(limit));
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

router.post("/threat-intel/ioc", (req, res) => {
  try {
    const ioc = threatIntelEngine.addIOC(req.body);
    res.status(201).json(ioc);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

export default router;
