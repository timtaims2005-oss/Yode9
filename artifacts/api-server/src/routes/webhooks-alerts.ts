/**
 * Alertmanager Webhook Receiver
 * ─────────────────────────────
 * POST /api/webhooks/alerts            → generic receiver (all severities)
 * POST /api/webhooks/alerts/critical   → critical alerts, forwarded to Telegram immediately
 * POST /api/webhooks/alerts/warning    → warning alerts, batched and flushed periodically
 *
 * Payload format matches Alertmanager's standard webhook_config body:
 * https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
 */
import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import {
  sendCriticalAlertNow,
  queueWarningAlerts,
  type AlertmanagerWebhookPayload,
} from "../lib/telegram-alerts";

const router = Router();

function isValidPayload(body: unknown): body is AlertmanagerWebhookPayload {
  return !!body && typeof body === "object" && Array.isArray((body as any).alerts);
}

// Optional bearer-token check for the generic /alerts receiver, matching the
// `http_config.bearer_token` set on the "default" Alertmanager receiver.
function checkWebhookToken(req: Request, res: Response): boolean {
  const expected = process.env.WEBHOOK_TOKEN;
  if (!expected) return true; // not configured, skip check
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== expected) {
    res.status(401).json({ error: "Invalid webhook token" });
    return false;
  }
  return true;
}

// ── POST /api/webhooks/alerts ─────────────────────────────────────────────────
// Generic receiver: routes by each alert's own severity label.
router.post("/webhooks/alerts", async (req: Request, res: Response): Promise<void> => {
  if (!checkWebhookToken(req, res)) return;
  if (!isValidPayload(req.body)) {
    res.status(400).json({ error: "Invalid Alertmanager payload" });
    return;
  }
  const payload = req.body as AlertmanagerWebhookPayload;
  logger.info({ status: payload.status, count: payload.alerts.length }, "[webhooks/alerts] received");

  const critical = payload.alerts.filter(a => a.labels?.severity === "critical");
  const warning = payload.alerts.filter(a => a.labels?.severity !== "critical");

  try {
    if (critical.length) {
      await sendCriticalAlertNow({ ...payload, alerts: critical });
    }
    if (warning.length) {
      queueWarningAlerts({ ...payload, alerts: warning });
    }
    res.json({ ok: true, critical: critical.length, warning: warning.length });
  } catch (err) {
    logger.error({ err }, "[webhooks/alerts] failed to process");
    res.status(500).json({ error: "Failed to process alert" });
  }
});

// ── POST /api/webhooks/alerts/critical ────────────────────────────────────────
router.post("/webhooks/alerts/critical", async (req: Request, res: Response): Promise<void> => {
  if (!checkWebhookToken(req, res)) return;
  if (!isValidPayload(req.body)) {
    res.status(400).json({ error: "Invalid Alertmanager payload" });
    return;
  }
  const payload = req.body as AlertmanagerWebhookPayload;
  logger.warn({ status: payload.status, count: payload.alerts.length }, "[webhooks/alerts/critical] received");
  try {
    await sendCriticalAlertNow(payload);
    res.json({ ok: true, sent: payload.alerts.length });
  } catch (err) {
    logger.error({ err }, "[webhooks/alerts/critical] failed to send");
    res.status(500).json({ error: "Failed to send critical alert" });
  }
});

// ── POST /api/webhooks/alerts/warning ─────────────────────────────────────────
router.post("/webhooks/alerts/warning", async (req: Request, res: Response): Promise<void> => {
  if (!checkWebhookToken(req, res)) return;
  if (!isValidPayload(req.body)) {
    res.status(400).json({ error: "Invalid Alertmanager payload" });
    return;
  }
  const payload = req.body as AlertmanagerWebhookPayload;
  logger.info({ status: payload.status, count: payload.alerts.length }, "[webhooks/alerts/warning] queued");
  queueWarningAlerts(payload);
  res.json({ ok: true, queued: payload.alerts.length });
});

export default router;
