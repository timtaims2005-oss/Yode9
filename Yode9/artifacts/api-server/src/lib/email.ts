/**
 * Email Service (Nodemailer)
 * ───────────────────────────
 * Sends transactional emails:
 *  - Email verification
 *  - Password reset
 *  - Welcome / onboarding
 *  - Security alerts
 *  - Weekly reports (optional)
 *
 * Configured via SMTP_* env vars.
 * Falls back to console logging when SMTP is not configured (dev mode).
 */

import { logger } from "./logger.js";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface TransportConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
}

let _transporter: unknown = null;
let _fromAddress = "";

async function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? "noreply@mr7.ai";
  const fromName = process.env.EMAIL_FROM_NAME ?? "mr7.ai";

  _fromAddress = `${fromName} <${from}>`;

  if (!host) {
    logger.warn("[email] SMTP_HOST not set — emails will be logged to console only (dev mode)");
    return null;
  }

  const nodemailer = await import("nodemailer");
  const config: TransportConfig = { host, port, secure };
  if (user && pass) {
    config.auth = { user, pass };
  }

  _transporter = nodemailer.createTransport(config as Parameters<typeof nodemailer.createTransport>[0]);
  logger.info({ host, port }, "[email] SMTP transporter initialized");
  return _transporter;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = await getTransporter() as { sendMail: (opts: Record<string, unknown>) => Promise<unknown> } | null;

  const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

  if (!transporter) {
    // Dev fallback: log email to console
    logger.info({
      to,
      subject: options.subject,
      preview: options.text?.slice(0, 200) ?? options.html.replace(/<[^>]+>/g, "").slice(0, 200),
    }, "[email] DEV — email not sent (SMTP not configured)");
    return true;
  }

  try {
    await transporter.sendMail({
      from: _fromAddress,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
      replyTo: options.replyTo,
    });
    logger.info({ to, subject: options.subject }, "[email] Sent");
    return true;
  } catch (err) {
    logger.error({ err, to, subject: options.subject }, "[email] Failed to send");
    return false;
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0a0a0f;
  color: #e0e0ff;
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const cardStyle = `
  background: #111122;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  padding: 32px;
  margin: 20px 0;
`;

const btnStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 20px 0;
`;

function wrapTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <h1 style="color:#a78bfa;font-size:24px;margin:0 0 8px">${title}</h1>
    <hr style="border:none;border-top:1px solid #2a2a4a;margin:16px 0">
    ${content}
    <hr style="border:none;border-top:1px solid #2a2a4a;margin:24px 0 16px">
    <p style="color:#666;font-size:12px;margin:0">
      mr7.ai — AI & Cybersecurity Platform<br>
      If you didn't request this, please ignore this email.
    </p>
  </div>
</body>
</html>`;
}

export function emailVerificationTemplate(name: string, verifyUrl: string): EmailOptions["html"] {
  return wrapTemplate("Verify Your Email", `
    <p>Hi ${escHtml(name)},</p>
    <p>Welcome to <strong>mr7.ai</strong>! Please verify your email address to activate your account.</p>
    <a href="${verifyUrl}" style="${btnStyle}">Verify Email Address</a>
    <p style="color:#888;font-size:13px">This link expires in <strong>24 hours</strong>.</p>
    <p style="color:#888;font-size:13px">Or copy this URL:<br><code style="color:#a78bfa">${verifyUrl}</code></p>
  `);
}

export function passwordResetTemplate(name: string, resetUrl: string): EmailOptions["html"] {
  return wrapTemplate("Reset Your Password", `
    <p>Hi ${escHtml(name)},</p>
    <p>We received a request to reset your password. Click the button below:</p>
    <a href="${resetUrl}" style="${btnStyle}">Reset Password</a>
    <p style="color:#f87171;font-size:13px">⚠️ This link expires in <strong>1 hour</strong>.</p>
    <p style="color:#888;font-size:13px">If you didn't request this, your account is safe — just ignore this email.</p>
  `);
}

export function welcomeTemplate(name: string): EmailOptions["html"] {
  return wrapTemplate("Welcome to mr7.ai", `
    <p>Hi ${escHtml(name)},</p>
    <p>Your account is ready. You now have access to:</p>
    <ul style="color:#c4b5fd;line-height:2">
      <li>🤖 Multi-provider AI (OpenAI, Anthropic, Groq, Gemini, and more)</li>
      <li>🔐 PentestLab Pro — advanced cybersecurity tools</li>
      <li>🌐 Ollama local models — 100% private AI</li>
      <li>⚡ GodMode — 24 specialized AI modes</li>
      <li>🛡️ Real-time threat monitoring</li>
    </ul>
    <p>Start exploring at <a href="https://mr7.ai" style="color:#a78bfa">mr7.ai</a></p>
  `);
}

export function securityAlertTemplate(
  name: string,
  eventType: string,
  ip: string,
  time: string,
): EmailOptions["html"] {
  return wrapTemplate("Security Alert", `
    <p>Hi ${escHtml(name)},</p>
    <p>A security event was detected on your account:</p>
    <table style="background:#0d0d1a;border-radius:8px;padding:16px;width:100%;border-collapse:collapse">
      <tr><td style="color:#888;padding:6px 12px">Event</td><td style="color:#f87171;padding:6px 12px"><strong>${escHtml(eventType)}</strong></td></tr>
      <tr><td style="color:#888;padding:6px 12px">IP Address</td><td style="color:#fbbf24;padding:6px 12px">${escHtml(ip)}</td></tr>
      <tr><td style="color:#888;padding:6px 12px">Time</td><td style="color:#e0e0ff;padding:6px 12px">${escHtml(time)}</td></tr>
    </table>
    <p>If this was you, no action needed. If not, change your password immediately.</p>
  `);
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  const baseUrl = process.env.APP_URL ?? process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5173";
  const url = `${baseUrl}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Verify your email — mr7.ai",
    html: emailVerificationTemplate(name, url),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
  const baseUrl = process.env.APP_URL ?? process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5173";
  const url = `${baseUrl}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Reset your password — mr7.ai",
    html: passwordResetTemplate(name, url),
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Welcome to mr7.ai 🚀",
    html: welcomeTemplate(name),
  });
}

export async function sendSecurityAlertEmail(
  to: string,
  name: string,
  eventType: string,
  ip: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `[Security Alert] ${eventType} detected — mr7.ai`,
    html: securityAlertTemplate(name, eventType, ip, new Date().toUTCString()),
  });
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
