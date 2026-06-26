/**
 * Feature Flags API
 * ──────────────────
 * GET  /api/features             → list all feature flags (public)
 * GET  /api/features/:name       → check single flag (public)
 * PUT  /api/features/:name       → update flag (admin only)
 * POST /api/features/seed        → seed defaults (admin only)
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth, requireAdmin } from "../middlewares/jwtAuth.js";
import {
  listFlags,
  isEnabled,
  setFlag,
  seedDefaultFlags,
  type FlagName,
} from "../lib/feature-flags.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── GET /api/features ─────────────────────────────────────────────────────────
router.get("/features", async (_req: Request, res: Response): Promise<void> => {
  try {
    const flags = await listFlags();
    // Return simplified public view
    const publicFlags = Object.fromEntries(
      flags.map((f) => [f.name, f.enabled]),
    );
    res.json({ ok: true, flags: publicFlags });
  } catch (err) {
    logger.error({ err }, "[features] List failed");
    res.status(500).json({ error: "Failed to list features" });
  }
});

// ── GET /api/features/all ─────────────────────────────────────────────────────
router.get("/features/all", jwtAuth, requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const flags = await listFlags();
    res.json({ ok: true, flags });
  } catch (err) {
    logger.error({ err }, "[features] List all failed");
    res.status(500).json({ error: "Failed to list features" });
  }
});

// ── GET /api/features/:name ───────────────────────────────────────────────────
router.get("/features/:name", async (req: Request, res: Response): Promise<void> => {
  try {
    const name = req.params.name as FlagName;
    const enabled = await isEnabled(name);
    res.json({ ok: true, name, enabled });
  } catch (err) {
    logger.error({ err }, "[features] Get flag failed");
    res.status(500).json({ error: "Failed to get feature flag" });
  }
});

// ── PUT /api/features/:name ───────────────────────────────────────────────────
router.put("/features/:name", jwtAuth, requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const name = req.params.name as FlagName;
    const { enabled } = req.body as { enabled?: boolean };

    if (typeof enabled !== "boolean") {
      res.status(400).json({ error: "enabled (boolean) is required" });
      return;
    }

    await setFlag(name, enabled, req.authUser!.email);
    logger.info({ name, enabled, updatedBy: req.authUser!.email }, "[features] Flag updated");
    res.json({ ok: true, name, enabled });
  } catch (err) {
    logger.error({ err }, "[features] Update flag failed");
    res.status(500).json({ error: "Failed to update feature flag" });
  }
});

// ── POST /api/features/seed ───────────────────────────────────────────────────
router.post("/features/seed", jwtAuth, requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedDefaultFlags();
    res.json({ ok: true, message: "Default flags seeded" });
  } catch (err) {
    logger.error({ err }, "[features] Seed failed");
    res.status(500).json({ error: "Failed to seed flags" });
  }
});

export default router;
