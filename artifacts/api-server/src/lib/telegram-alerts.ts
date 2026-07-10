/**
 * Telegram Alert Notifier
 * ───────────────────────
 * Sends Alertmanager webhook payloads to a Telegram chat via Bot API.
 * Critical alerts are sent immediately; warnings are batched and flushed
 * on an interval to avoid spamming one message per firing alert.
 */
import { logger } from "./logger";

export interface AlertmanagerAlert {
  status: "firing" | "resolved";
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
  generatorURL?: string;
  fingerprint?: string;
}

export interface AlertmanagerWebhookPayload {
  version?: string;
  groupKey?: string;
  status: "firing" | "resolved";
  receiver?: string;
  groupLabels?: Record<string, string>;
  commonLabels?: Record<string, string>;
  commonAnnotations?: Record<string, string>;
  externalURL?: string;
  alerts: AlertmanagerAlert[];
}

function isConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALERT_CHAT_ID);
}

function statusEmoji(status: string): string {
  return status === "resolved" ? "✅" : "🔥";
}

function severityEmoji(severity: string | undefined): string {
  switch (severity) {
    case "critical": return "🚨";
    case "warning": return "⚠️";
    default: return "ℹ️";
  }
}

function formatAlert(alert: AlertmanagerAlert): string {
  const name = alert.labels?.alertname ?? "UnknownAlert";
  const service = alert.labels?.service ?? "unknown-service";
  const severity = alert.labels?.severity;
  const summary = alert.annotations?.summary ?? alert.annotations?.description ?? "";
  const lines = [
    `${statusEmoji(alert.status)} ${severityEmoji(severity)} *${escapeMd(name)}*`,
    `service: \`${escapeMd(service)}\``,
  ];
  if (summary) lines.push(escapeMd(summary));
  if (alert.status === "firing" && alert.startsAt) {
    lines.push(`since: ${escapeMd(alert.startsAt)}`);
  }
  if (alert.status === "resolved" && alert.endsAt) {
    lines.push(`resolved: ${escapeMd(alert.endsAt)}`);
  }
  return lines.join("\n");
}

function escapeMd(text: string): string {
  // Escape MarkdownV2 reserved characters
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) {
    logger.warn("[telegram-alerts] not configured, dropping alert message");
    return;
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      logger.error({ status: resp.status, body }, "[telegram-alerts] Telegram API error");
    }
  } catch (err) {
    logger.error({ err }, "[telegram-alerts] failed to send Telegram message");
  }
}

export async function sendCriticalAlertNow(payload: AlertmanagerWebhookPayload): Promise<void> {
  if (!isConfigured()) {
    logger.warn("[telegram-alerts] TELEGRAM_BOT_TOKEN/TELEGRAM_ALERT_CHAT_ID missing, critical alert not sent");
    return;
  }
  const header = `🚨 *CRITICAL ALERT* \\(${payload.alerts.length}\\)`;
  const body = payload.alerts.map(formatAlert).join("\n\n");
  await sendTelegramMessage(`${header}\n\n${body}`);
}

// ── Warning batching ──────────────────────────────────────────────────────────
// Warnings queue up and flush together every FLUSH_INTERVAL_MS instead of
// firing one Telegram message per alert.
const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let warningQueue: AlertmanagerAlert[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushWarningQueue();
  }, FLUSH_INTERVAL_MS);
  // Don't keep the process alive solely for this timer
  if (typeof flushTimer.unref === "function") flushTimer.unref();
}

async function flushWarningQueue(): Promise<void> {
  if (warningQueue.length === 0) return;
  const batch = warningQueue;
  warningQueue = [];
  if (!isConfigured()) {
    logger.warn("[telegram-alerts] TELEGRAM_BOT_TOKEN/TELEGRAM_ALERT_CHAT_ID missing, dropping batched warnings");
    return;
  }
  const header = `⚠️ *${batch.length} warning alert${batch.length === 1 ? "" : "s"}*`;
  const body = batch.map(formatAlert).join("\n\n");
  await sendTelegramMessage(`${header}\n\n${body}`);
}

export function queueWarningAlerts(payload: AlertmanagerWebhookPayload): void {
  warningQueue.push(...payload.alerts);
  ensureFlushTimer();
}

/** Exposed for tests / manual flush (e.g. graceful shutdown). */
export async function forceFlushWarnings(): Promise<void> {
  await flushWarningQueue();
}
