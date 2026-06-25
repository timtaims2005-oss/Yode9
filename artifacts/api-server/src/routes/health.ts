import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "../db";
import { circuitRegistry } from "../lib/circuit-breaker";
import os from "os";

const router: IRouter = Router();
const _startTime = Date.now();

const healthHandler = (_req: import("express").Request, res: import("express").Response): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/healthz", healthHandler);
router.get("/health", healthHandler);
router.head("/health", (_req, res) => { res.status(200).end(); });

router.get("/health/deep", async (_req, res) => {
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};
  const dbStart = Date.now();
  try {
    await pool.query("SELECT 1");
    checks["database"] = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks["database"] = { ok: false, latencyMs: Date.now() - dbStart, detail: String(err) };
  }
  const circuits = circuitRegistry.statsAll();
  const openCircuits = Object.entries(circuits).filter(([, s]) => s.state !== "closed");
  checks["circuits"] = {
    ok: openCircuits.length === 0,
    detail: openCircuits.length > 0 ? `Open: ${openCircuits.map(([n]) => n).join(", ")}` : "All closed",
  };
  const memUsage = process.memoryUsage();
  const allOk = Object.values(checks).every(c => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - _startTime) / 1000),
    version: process.env["APP_VERSION"] ?? "unknown",
    checks,
    system: {
      memHeapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      memRssMB: Math.round(memUsage.rss / 1024 / 1024),
      loadAvg1m: os.loadavg()[0].toFixed(2),
      nodeVersion: process.version,
      pid: process.pid,
    },
    circuits,
    ts: new Date().toISOString(),
  });
});

router.get("/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, reason: "database unavailable" });
  }
});

router.get("/health/live", (_req, res) => {
  res.json({ live: true, pid: process.pid, uptime: process.uptime() });
});

export default router;
