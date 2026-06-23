/**
 * Outbound Webhooks System
 * ─────────────────────────
 * Allows users to register webhook endpoints that receive event notifications.
 *
 * Events:
 *  - chat.completed       — AI chat message complete
 *  - agent.task_done      — Agent task completed
 *  - scan.completed       — Security scan completed
 *  - report.generated     — Security report generated
 *  - user.registered      — New user registered (admin only)
 *  - attack.detected      — Security attack detected (admin only)
 *  - system.alert         — System alert
 *
 * Delivery: HMAC-SHA256 signed POST with retry (3 attempts, exponential backoff).
 */

import { pool } from "../db.js";
import { hmacSign } from "./crypto.js";
import { logger } from "./logger.js";

export type WebhookEvent =
  | "chat.completed"
  | "agent.task_done"
  | "scan.completed"
  | "report.generated"
  | "user.registered"
  | "attack.detected"
  | "system.alert"
  | "pentest.scan_done"
  | "file.uploaded"
  | "subscription.changed";

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

// ── DB Setup ──────────────────────────────────────────────────────────────────
export async function ensureWebhookTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      secret VARCHAR NOT NULL,
      events TEXT[] NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      description VARCHAR(255),
      last_triggered_at TIMESTAMP,
      failure_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      webhook_id VARCHAR REFERENCES webhooks(id) ON DELETE CASCADE,
      event VARCHAR NOT NULL,
      payload JSONB NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      success BOOLEAN NOT NULL DEFAULT false,
      duration_ms INTEGER,
      attempt INTEGER NOT NULL DEFAULT 1,
      delivered_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, delivered_at DESC);
  `).catch(() => {});
}

// ── Delivery ──────────────────────────────────────────────────────────────────
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  payload: WebhookPayload,
  attempt = 1,
): Promise<boolean> {
  const body = JSON.stringify(payload);
  const signature = hmacSign(body, webhook.secret);
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MR7-Signature": `sha256=${signature}`,
        "X-MR7-Event": payload.event,
        "X-MR7-Delivery": payload.id,
        "User-Agent": "mr7.ai-webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - start;
    const success = resp.status >= 200 && resp.status < 300;
    const responseBody = await resp.text().catch(() => "");

    // Record delivery
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body, success, duration_ms, attempt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [webhook.id, payload.event, JSON.stringify(payload), resp.status, responseBody.slice(0, 500), success, duration, attempt],
    ).catch(() => {});

    if (success) {
      await pool.query(
        "UPDATE webhooks SET last_triggered_at=NOW(), failure_count=0 WHERE id=$1",
        [webhook.id],
      ).catch(() => {});
    } else {
      await pool.query(
        "UPDATE webhooks SET failure_count=failure_count+1, updated_at=NOW() WHERE id=$1",
        [webhook.id],
      ).catch(() => {});
    }

    return success;
  } catch (err) {
    const duration = Date.now() - start;
    logger.warn({ err, webhookId: webhook.id, attempt }, "[webhooks] Delivery failed");

    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, success, duration_ms, attempt)
       VALUES ($1, $2, $3, false, $4, $5)`,
      [webhook.id, payload.event, JSON.stringify(payload), duration, attempt],
    ).catch(() => {});

    await pool.query(
      "UPDATE webhooks SET failure_count=failure_count+1, updated_at=NOW() WHERE id=$1",
      [webhook.id],
    ).catch(() => {});

    return false;
  }
}

// ── Trigger Event ─────────────────────────────────────────────────────────────
export async function triggerEvent(
  event: WebhookEvent,
  data: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  try {
    await ensureWebhookTables();

    // Find all active webhooks subscribed to this event
    const { rows } = await pool.query(
      `SELECT id, url, secret FROM webhooks
       WHERE is_active = true
         AND failure_count < 10
         AND ($1::varchar IS NULL OR user_id = $1::varchar OR user_id IS NULL)
         AND (events @> ARRAY[$2] OR events = '{}')`,
      [userId ?? null, event],
    );

    if (rows.length === 0) return;

    const payload: WebhookPayload = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Deliver to all webhooks (fire-and-forget with retry)
    for (const webhook of rows) {
      deliverWithRetry(webhook, payload).catch(() => {});
    }
  } catch (err) {
    logger.error({ err, event }, "[webhooks] triggerEvent failed");
  }
}

async function deliverWithRetry(
  webhook: { id: string; url: string; secret: string },
  payload: WebhookPayload,
  maxAttempts = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await deliverWebhook(webhook, payload, attempt);
    if (success) return;
    if (attempt < maxAttempts) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  logger.warn({ webhookId: webhook.id, event: payload.event }, "[webhooks] Max retries reached");
}

// ── CRUD helpers (used by routes) ─────────────────────────────────────────────
export async function createWebhook(
  userId: string,
  url: string,
  events: WebhookEvent[],
  description = "",
): Promise<unknown> {
  await ensureWebhookTables();
  const { generateToken } = await import("./crypto.js");
  const secret = generateToken(32);

  const { rows } = await pool.query(
    `INSERT INTO webhooks (user_id, url, secret, events, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, url, events, description, created_at`,
    [userId, url, secret, events, description],
  );

  return { ...rows[0], secret }; // Return secret only on creation
}

export async function listWebhooks(userId: string): Promise<unknown[]> {
  await ensureWebhookTables();
  const { rows } = await pool.query(
    `SELECT id, url, events, description, is_active, last_triggered_at, failure_count, created_at
     FROM webhooks WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

export async function deleteWebhook(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    "DELETE FROM webhooks WHERE id=$1 AND user_id=$2",
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function getWebhookDeliveries(webhookId: string, userId: string): Promise<unknown[]> {
  // Verify ownership first
  const { rows: wh } = await pool.query(
    "SELECT id FROM webhooks WHERE id=$1 AND user_id=$2",
    [webhookId, userId],
  );
  if (!wh[0]) return [];

  const { rows } = await pool.query(
    `SELECT id, event, status_code, success, duration_ms, attempt, delivered_at
     FROM webhook_deliveries WHERE webhook_id=$1
     ORDER BY delivered_at DESC LIMIT 50`,
    [webhookId],
  );
  return rows;
}
