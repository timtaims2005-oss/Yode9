/**
 * Backup Management API (Admin Only)
 * ─────────────────────────────────────
 * POST /api/admin/backup/run    → trigger manual backup
 * GET  /api/admin/backup/list   → list available backups
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth, requireAdmin } from "../middlewares/jwtAuth.js";
import { runBackup, listBackups } from "../lib/backup.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(jwtAuth, requireAuth, requireAdmin);

router.post("/admin/backup/run", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await runBackup();
    if (result.success) {
      res.json({ ok: true, file: result.file });
    } else {
      res.status(500).json({ ok: false, error: result.error });
    }
  } catch (err) {
    logger.error({ err }, "[backup] Manual backup failed");
    res.status(500).json({ error: "Backup failed" });
  }
});

router.get("/admin/backup/list", (_req: Request, res: Response): void => {
  try {
    const backups = listBackups();
    res.json({ ok: true, backups });
  } catch (err) {
    logger.error({ err }, "[backup] List backups failed");
    res.status(500).json({ error: "Failed to list backups" });
  }
});

export default router;
