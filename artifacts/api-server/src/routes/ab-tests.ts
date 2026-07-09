/**
 * A/B Testing API
 * GET  /api/ab/variant?testName=&deviceId=   — get assigned variant
 * POST /api/ab/event                          — track conversion event
 * GET  /api/ab/results?testName=             — admin: aggregated results
 * POST /api/ab/tests                         — admin: create/update test
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";
import { validateBody, validateQuery } from "../middlewares/validateBody.js";
import { internalAuth } from "../middlewares/internalAuth.js";
import crypto from "crypto";

const router = Router();

// ── Table bootstrap ────────────────────────────────────────────────────────────
let _ready = false;
async function ensureAbTables(): Promise<void> {
  if (_ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      name       VARCHAR(128) UNIQUE NOT NULL,
      variants   JSONB NOT NULL DEFAULT '["control","variant_a"]',
      weights    JSONB NOT NULL DEFAULT '[50,50]',
      is_active  BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ab_events (
      id         BIGSERIAL PRIMARY KEY,
      test_name  VARCHAR(128) NOT NULL,
      variant    VARCHAR(128) NOT NULL,
      event      VARCHAR(128) NOT NULL,
      device_id  VARCHAR(256) NOT NULL,
      metadata   JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ab_events_test_variant ON ab_events(test_name, variant);
    CREATE INDEX IF NOT EXISTS idx_ab_events_device       ON ab_events(device_id, test_name);
  `).catch(() => {});
  _ready = true;
}

// ── Deterministic variant assignment ──────────────────────────────────────────
function assignVariant(testName: string, deviceId: string, variants: string[], weights: number[]): string {
  const hash = crypto.createHash("sha256").update(`${testName}:${deviceId}`).digest("hex");
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += weights[i] ?? 0;
    if (bucket < cumulative) return variants[i];
  }
  return variants[0];
}

// ── GET /api/ab/variant?testName=&deviceId= ────────────────────────────────────
router.get("/ab/variant", validateQuery(z.object({
  testName: z.string().min(1).max(128),
  deviceId: z.string().min(1).max(256),
})), async (req: Request, res: Response): Promise<void> => {
  await ensureAbTables();
  const { testName, deviceId } = req.query as { testName: string; deviceId: string };
  try {
    const { rows } = await pool.query(
      "SELECT variants, weights FROM ab_tests WHERE name = $1 AND is_active = true LIMIT 1",
      [testName],
    );
    if (!rows.length) {
      res.json({ variant: "control", assigned: false });
      return;
    }
    const variants = rows[0].variants as string[];
    const weights  = rows[0].weights  as number[];
    const variant  = assignVariant(testName, deviceId, variants, weights);

    // Log impression (fire-and-forget)
    pool.query(
      "INSERT INTO ab_events(test_name, variant, event, device_id) VALUES($1,$2,'impression',$3)",
      [testName, variant, deviceId],
    ).catch(() => {});

    res.json({ variant, assigned: true });
  } catch (err) {
    logger.error({ err }, "[ab] Get variant failed");
    res.status(500).json({ error: "Failed." });
  }
});

// ── POST /api/ab/event ─────────────────────────────────────────────────────────
router.post("/ab/event", validateBody(z.object({
  testName: z.string().min(1).max(128),
  variant:  z.string().min(1).max(128),
  event:    z.string().min(1).max(128),
  deviceId: z.string().min(1).max(256),
  metadata: z.record(z.unknown()).optional().default({}),
})), async (req: Request, res: Response): Promise<void> => {
  await ensureAbTables();
  const { testName, variant, event, deviceId, metadata } = req.body as {
    testName: string; variant: string; event: string; deviceId: string; metadata: Record<string,unknown>;
  };
  try {
    await pool.query(
      "INSERT INTO ab_events(test_name, variant, event, device_id, metadata) VALUES($1,$2,$3,$4,$5::jsonb)",
      [testName, variant, event, deviceId, JSON.stringify(metadata)],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[ab] Track event failed");
    res.status(500).json({ error: "Failed." });
  }
});

// ── GET /api/ab/results?testName= (admin) ─────────────────────────────────────
router.get("/ab/results", internalAuth, validateQuery(z.object({
  testName: z.string().min(1).max(128),
})), async (req: Request, res: Response): Promise<void> => {
  await ensureAbTables();
  const { testName } = req.query as { testName: string };
  try {
    const { rows } = await pool.query(
      `SELECT variant, event, COUNT(*)::int AS count
       FROM ab_events WHERE test_name = $1
       GROUP BY variant, event ORDER BY variant, event`,
      [testName],
    );
    const { rows: devRows } = await pool.query(
      `SELECT variant, COUNT(DISTINCT device_id)::int AS unique_devices
       FROM ab_events WHERE test_name = $1
       GROUP BY variant`,
      [testName],
    );

    const byVariant: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      if (!byVariant[r.variant]) byVariant[r.variant] = {};
      byVariant[r.variant][r.event] = r.count;
    }
    for (const r of devRows) {
      if (!byVariant[r.variant]) byVariant[r.variant] = {};
      byVariant[r.variant]["unique_devices"] = r.unique_devices;
    }
    res.json({ testName, results: byVariant });
  } catch (err) {
    logger.error({ err }, "[ab] Results failed");
    res.status(500).json({ error: "Failed." });
  }
});

// ── POST /api/ab/tests (admin) ────────────────────────────────────────────────
router.post("/ab/tests", internalAuth, validateBody(z.object({
  name:     z.string().min(1).max(128),
  variants: z.array(z.string()).min(2).max(10),
  weights:  z.array(z.number()).min(2).max(10).optional(),
  isActive: z.boolean().optional().default(true),
})), async (req: Request, res: Response): Promise<void> => {
  await ensureAbTables();
  const { name, variants, weights, isActive } = req.body as {
    name: string; variants: string[]; weights?: number[]; isActive: boolean;
  };
  const w = weights ?? variants.map(() => Math.floor(100 / variants.length));
  try {
    const { rows } = await pool.query(
      `INSERT INTO ab_tests(name, variants, weights, is_active)
       VALUES($1,$2::jsonb,$3::jsonb,$4)
       ON CONFLICT(name) DO UPDATE
         SET variants=$2::jsonb, weights=$3::jsonb, is_active=$4, updated_at=NOW()
       RETURNING id, name`,
      [name, JSON.stringify(variants), JSON.stringify(w), isActive],
    );
    res.status(201).json({ ok: true, id: rows[0].id, name: rows[0].name });
  } catch (err) {
    logger.error({ err }, "[ab] Create test failed");
    res.status(500).json({ error: "Failed to create test." });
  }
});

export default router;
