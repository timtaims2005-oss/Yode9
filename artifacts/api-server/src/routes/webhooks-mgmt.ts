/**
 * Webhook Management API
 * ───────────────────────
 * POST   /api/webhooks                      → create webhook
 * GET    /api/webhooks                      → list user webhooks
 * DELETE /api/webhooks/:id                  → delete webhook
 * PUT    /api/webhooks/:id/toggle           → enable/disable webhook
 * GET    /api/webhooks/:id/deliveries       → delivery history
 * POST   /api/webhooks/:id/test             → send test event
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth.js";
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  getWebhookDeliveries,
  triggerEvent,
  type WebhookEvent,
  ensureWebhookTables,
} from "../lib/webhooks.js";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";

const router = Router();
router.use(jwtAuth, requireAuth);

const VALID_EVENTS: WebhookEvent[] = [
  "chat.completed", "agent.task_done", "scan.completed", "report.generated",
  "user.registered", "attack.detected", "system.alert", "pentest.scan_done",
  "file.uploaded", "subscription.changed",
];

// ── POST /api/webhooks ────────────────────────────────────────────────────────
router.post("/webhooks", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureWebhookTables();
    const { url, events, description } = req.body as {
      url?: string;
      events?: string[];
      description?: string;
    };

    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    try { new URL(url); } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    // Validate events
    const validatedEvents = (events ?? []).filter((e) =>
      VALID_EVENTS.includes(e as WebhookEvent),
    ) as WebhookEvent[];

    // Check max 10 webhooks per user
    const { rows: existing } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM webhooks WHERE user_id=$1 AND is_active=true",
      [req.authUser!.id],
    );
    if ((existing[0]?.cnt ?? 0) >= 10) {
      res.status(400).json({ error: "Maximum 10 webhooks per account" });
      return;
    }

    const webhook = await createWebhook(req.authUser!.id, url, validatedEvents, description ?? "");
    res.status(201).json({ ok: true, webhook });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] Create failed");
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

// ── GET /api/webhooks ─────────────────────────────────────────────────────────
router.get("/webhooks", async (req: Request, res: Response): Promise<void> => {
  try {
    const webhooks = await listWebhooks(req.authUser!.id);
    res.json({ ok: true, webhooks });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] List failed");
    res.status(500).json({ error: "Failed to list webhooks" });
  }
});

// ── DELETE /api/webhooks/:id ──────────────────────────────────────────────────
router.delete("/webhooks/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await deleteWebhook(req.params.id, req.authUser!.id);
    if (!deleted) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] Delete failed");
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// ── PUT /api/webhooks/:id/toggle ──────────────────────────────────────────────
router.put("/webhooks/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  try {
    const { enabled } = req.body as { enabled?: boolean };
    const { rowCount } = await pool.query(
      "UPDATE webhooks SET is_active=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3",
      [enabled ?? true, req.params.id, req.authUser!.id],
    );
    if (!rowCount) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }
    res.json({ ok: true, enabled: enabled ?? true });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] Toggle failed");
    res.status(500).json({ error: "Failed to toggle webhook" });
  }
});

// ── GET /api/webhooks/:id/deliveries ─────────────────────────────────────────
router.get("/webhooks/:id/deliveries", async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveries = await getWebhookDeliveries(req.params.id, req.authUser!.id);
    res.json({ ok: true, deliveries });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] Get deliveries failed");
    res.status(500).json({ error: "Failed to get deliveries" });
  }
});

// ── POST /api/webhooks/:id/test ───────────────────────────────────────────────
router.post("/webhooks/:id/test", async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM webhooks WHERE id=$1 AND user_id=$2 AND is_active=true",
      [req.params.id, req.authUser!.id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }
    await triggerEvent("system.alert", {
      message: "Test webhook delivery from mr7.ai",
      webhookId: req.params.id,
      timestamp: new Date().toISOString(),
    }, req.authUser!.id);
    res.json({ ok: true, message: "Test event triggered" });
  } catch (err) {
    logger.error({ err }, "[webhooks-mgmt] Test failed");
    res.status(500).json({ error: "Failed to send test event" });
  }
});

// ── GET /api/webhooks/events ──────────────────────────────────────────────────
router.get("/webhooks/events", (_req: Request, res: Response): void => {
  res.json({ ok: true, events: VALID_EVENTS });
});

export default router;
