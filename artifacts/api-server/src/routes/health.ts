import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "../db";
import { circuitRegistry } from "../lib/circuit-breaker";
import { getRedis } from "../lib/redis.js";
import { listProviders } from "../lib/ai-providers.js";
import os from "os";

const router: IRouter = Router();
const _startTime = Date.now();

const healthHandler = (_req: import("express").Request, res: import("express").Response): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.setHeader("Cache-Control", "public, max-age=5, stale-while-revalidate=10");
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

// ── Status page endpoint ───────────────────────────────────────────────────────
// Separate from /health and /healthz: designed for the human-facing Status
// page, reporting per-service traffic-light state (green/yellow/red) rather
// than a single ok/degraded flag.
type ServiceStatus = "green" | "yellow" | "red";

router.get("/health/status", async (_req, res) => {
  const services: Record<string, { status: ServiceStatus; detail: string; latencyMs?: number }> = {};

  // Database
  const dbStart = Date.now();
  try {
    await pool.query("SELECT 1");
    services["database"] = { status: "green", detail: "Connected", latencyMs: Date.now() - dbStart };
  } catch (err) {
    services["database"] = { status: "red", detail: String(err), latencyMs: Date.now() - dbStart };
  }

  // Redis (in-memory fallback counts as degraded, not down)
  const redisStart = Date.now();
  try {
    const redisConfigured = !!process.env.REDIS_URL;
    const r = await getRedis();
    await r.set("health:status:ping", "1", 5);
    const latencyMs = Date.now() - redisStart;
    services["redis"] = redisConfigured
      ? { status: "green", detail: "Connected", latencyMs }
      : { status: "yellow", detail: "REDIS_URL not set — using in-memory fallback", latencyMs };
  } catch (err) {
    services["redis"] = { status: "red", detail: String(err), latencyMs: Date.now() - redisStart };
  }

  // AI providers — green if at least one provider has a key configured
  const providers = listProviders();
  const availableProviders = providers.filter((p) => p.available);
  services["ai_providers"] = availableProviders.length > 0
    ? { status: "green", detail: `${availableProviders.length} provider(s) available: ${availableProviders.map((p) => p.name).join(", ")}` }
    : { status: "red", detail: "No AI provider has an API key configured" };

  const overall: ServiceStatus = Object.values(services).some((s) => s.status === "red")
    ? "red"
    : Object.values(services).some((s) => s.status === "yellow")
      ? "yellow"
      : "green";

  res.status(overall === "red" ? 503 : 200).json({
    overall,
    services,
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
