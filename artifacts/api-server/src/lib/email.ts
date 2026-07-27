/**
 * Email Service
 * ──────────────
 * Sends transactional emails via:
 *   1. Resend SDK   — when RESEND_API_KEY is set (preferred for production)
 *   2. Nodemailer   — when SMTP_HOST is set (self-hosted / legacy)
 *   3. Console log  — dev fallback when neither is configured
 *
 * Templates included:
 *  - Email verification
 *  - Password reset
 *  - Welcome / onboarding
 *  - Security alerts
 *  - Invoice delivery
 */

import { logger } from "./logger.js";

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

// ── Provider detection ─────────────────────────────────────────────────────────

type EmailProvider = "resend" | "smtp" | "console";

function detectProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

let _provider: EmailProvider | null = null;
type ResendClient = { emails: { send: (opts: Record<string, unknown>) => Promise<{ error?: { message: string } }> } };
type SmtpTransporter = { sendMail: (opts: Record<string, unknown>) => Promise<unknown> };

let _resendClient: ResendClient | null = null;
let _smtpTransporter: SmtpTransporter | null = null;
let _fromAddress = "";

// ── Resend initialisation ──────────────────────────────────────────────────────

async function getResend() {
  if (_resendClient) return _resendClient;
  const { Resend } = await import("resend");
  _resendClient = new Resend(process.env.RESEND_API_KEY!) as unknown as ResendClient;
  _fromAddress = process.env.EMAIL_FROM
    ? `${process.env.EMAIL_FROM_NAME ?? "MR7 AI"} <${process.env.EMAIL_FROM}>`
    : "MR7 AI <noreply@mr7.ai>";
  logger.info("[email] Resend provider initialised");
  return _resendClient;
}

// ── SMTP / Nodemailer initialisation ──────────────────────────────────────────

async function getSmtp() {
  if (_smtpTransporter) return _smtpTransporter;

  const host = process.env.SMTP_HOST!;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? "noreply@mr7.ai";
  const fromName = process.env.EMAIL_FROM_NAME ?? "MR7 AI";

  _fromAddress = `${fromName} <${from}>`;

  const nodemailer = await import("nodemailer");
  const config: Record<string, unknown> = { host, port, secure };
  if (user && pass) config.auth = { user, pass };

  _smtpTransporter = nodemailer.createTransport(config) as unknown as SmtpTransporter;
  logger.info({ host, port }, "[email] SMTP transporter initialised");
  return _smtpTransporter;
}

// ── Public send function ───────────────────────────────────────────────────────

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!_provider) _provider = detectProvider();

  const to = Array.isArray(options.to) ? options.to : [options.to];
  const toStr = to.join(", ");

  // ── Resend path ────────────────────────────────────────────────────────────
  if (_provider === "resend") {
    try {
      const client = await getResend();
      const { error } = await client!.emails.send({
        from: _fromAddress,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
        replyTo: options.replyTo,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
          content_type: a.contentType,
        })),
      });
      if (error) {
        logger.error({ error, to: toStr, subject: options.subject }, "[email] Resend error");
        return false;
      }
      logger.info({ to: toStr, subject: options.subject }, "[email] Sent via Resend");
      return true;
    } catch (err) {
      logger.error({ err, to: toStr, subject: options.subject }, "[email] Resend exception");
      return false;
    }
  }

  // ── SMTP path ──────────────────────────────────────────────────────────────
  if (_provider === "smtp") {
    try {
      const transporter = await getSmtp();
      await transporter!.sendMail({
        from: _fromAddress,
        to: toStr,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.html.replace(/<[^>]+>/g, ""),
        replyTo: options.replyTo,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      logger.info({ to: toStr, subject: options.subject }, "[email] Sent via SMTP");
      return true;
    } catch (err) {
      logger.error({ err, to: toStr, subject: options.subject }, "[email] SMTP failed");
      return false;
    }
  }

  // ── Console fallback ──────────────────────────────────────────────────────
  logger.info({
    to: toStr,
    subject: options.subject,
    preview: (options.text ?? options.html.replace(/<[^>]+>/g, "")).slice(0, 200),
  }, "[email] DEV — email not sent (set RESEND_API_KEY or SMTP_HOST to enable)");
  return true;
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
  padding: 14px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 16px 0;
`;

function wrap(body: string): string {
  return `<div style="${baseStyle}">
    <div style="${cardStyle}">${body}</div>
    <p style="color:#555577;font-size:12px;text-align:center;margin-top:24px;">
      MR7 AI — This is an automated message, please do not reply directly.
    </p>
  </div>`;
}

export function buildVerificationEmail(code: string, expiresMinutes = 15): EmailOptions {
  return {
    subject: "Verify your MR7 AI account",
    html: wrap(`
      <h2 style="color:#e0e0ff;margin:0 0 8px;">Verify your email address</h2>
      <p style="color:#aaaacc;">Enter this code in the app to confirm your account:</p>
      <div style="background:#1a1a33;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#6366f1;">${code}</span>
      </div>
      <p style="color:#666688;font-size:13px;">Expires in ${expiresMinutes} minutes. If you did not request this, you can safely ignore it.</p>
    `),
    to: "", // caller fills this in
  };
}

export function buildPasswordResetEmail(resetUrl: string): EmailOptions {
  return {
    subject: "Reset your MR7 AI password",
    html: wrap(`
      <h2 style="color:#e0e0ff;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#aaaacc;">Click the button below to choose a new password. The link expires in 1 hour.</p>
      <a href="${resetUrl}" style="${btnStyle}">Reset Password</a>
      <p style="color:#666688;font-size:13px;">If you did not request a password reset, please ignore this email.</p>
    `),
    to: "",
  };
}

export function buildWelcomeEmail(name: string): EmailOptions {
  return {
    subject: "Welcome to MR7 AI",
    html: wrap(`
      <h2 style="color:#e0e0ff;margin:0 0 8px;">Welcome, ${name}! 🎉</h2>
      <p style="color:#aaaacc;">Your MR7 AI account is ready. You now have access to advanced AI tools, OSINT capabilities, and more.</p>
      <p style="color:#aaaacc;">Get started by opening the app or visiting your dashboard.</p>
    `),
    to: "",
  };
}

export function buildSecurityAlertEmail(action: string, details: string): EmailOptions {
  return {
    subject: `Security alert: ${action}`,
    html: wrap(`
      <h2 style="color:#ef4444;margin:0 0 8px;">⚠️ Security Alert</h2>
      <p style="color:#aaaacc;">We detected the following activity on your account:</p>
      <div style="background:#2a0a0a;border:1px solid #4a1a1a;border-radius:8px;padding:16px;margin:16px 0;">
        <strong style="color:#ffaaaa;">${action}</strong>
        <p style="color:#cc8888;font-size:13px;margin:8px 0 0;">${details}</p>
      </div>
      <p style="color:#666688;font-size:13px;">If this was you, no action is needed. If not, please reset your password immediately.</p>
    `),
    to: "",
  };
}

// ── Convenience wrappers (used by routes) ─────────────────────────────────────

/** Send email verification token to a user. */
export async function sendVerificationEmail(to: string, _name: string, token: string): Promise<boolean> {
  const opts = buildVerificationEmail(token);
  return sendEmail({ ...opts, to });
}

/** Send password reset link to a user. */
export async function sendPasswordResetEmail(to: string, _name: string, resetUrlOrToken: string): Promise<boolean> {
  // Accept either a full URL or a bare token
  const url = resetUrlOrToken.startsWith("http") ? resetUrlOrToken : `${process.env.APP_URL ?? ""}/reset-password?token=${resetUrlOrToken}`;
  const opts = buildPasswordResetEmail(url);
  return sendEmail({ ...opts, to });
}

/** Send welcome email to a newly registered user. */
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const opts = buildWelcomeEmail(name);
  return sendEmail({ ...opts, to });
}

/** Send Stripe invoice email with optional PDF attachment. */
export async function sendInvoiceEmail(
  to: string,
  _name: string,
  planName: string,
  amount: string,
  _invoiceNumber?: string,
  pdfBuffer?: Buffer,
): Promise<boolean> {
  const opts = buildInvoiceEmail(planName, amount);
  return sendEmail({
    ...opts,
    to,
    attachments: pdfBuffer
      ? [{ filename: `invoice-${Date.now()}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
      : undefined,
  });
}

export function buildInvoiceEmail(planName: string, amount: string, pdfUrl?: string): EmailOptions {
  return {
    subject: `Your MR7 AI invoice — ${planName}`,
    html: wrap(`
      <h2 style="color:#e0e0ff;margin:0 0 8px;">Payment confirmed</h2>
      <p style="color:#aaaacc;">Thank you for your subscription to <strong style="color:#6366f1;">${planName}</strong>.</p>
      <div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#aaccaa;margin:0;font-size:18px;font-weight:700;">Amount charged: ${amount}</p>
      </div>
      ${pdfUrl ? `<a href="${pdfUrl}" style="${btnStyle}">Download Invoice (PDF)</a>` : ""}
    `),
    to: "",
  };
}
