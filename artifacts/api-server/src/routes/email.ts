/**
 * Email Routes
 * ─────────────
 * POST /api/email/verify          → verify email with token
 * POST /api/email/resend-verify   → resend verification email
 * POST /api/email/forgot-password → send password reset email
 * POST /api/email/reset-password  → reset password with token
 * POST /api/email/test            → send test email (admin only)
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth, requireAdmin } from "../middlewares/jwtAuth.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmail,
} from "../lib/email.js";
import { storeToken, consumeToken } from "../lib/redis.js";
import { generateToken, hashPassword } from "../lib/crypto.js";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── POST /api/email/verify ────────────────────────────────────────────────────
router.post("/email/verify", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    const userId = await consumeToken(`email-verify:${token}`);
    if (!userId) {
      res.status(400).json({ error: "Invalid or expired verification token" });
      return;
    }

    await pool.query(
      "UPDATE users SET email_verified=true, status='active', updated_at=NOW() WHERE id=$1",
      [userId],
    );

    logger.info({ userId }, "[email] Email verified");
    res.json({ ok: true, message: "Email verified successfully" });
  } catch (err) {
    logger.error({ err }, "[email] Verify failed");
    res.status(500).json({ error: "Verification failed" });
  }
});

// ── POST /api/email/resend-verify ─────────────────────────────────────────────
router.post("/email/resend-verify", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      "SELECT email, first_name, email_verified FROM users WHERE id=$1",
      [req.authUser!.id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (rows[0].email_verified) {
      res.status(400).json({ error: "Email already verified" });
      return;
    }

    const token = generateToken(32);
    await storeToken(`email-verify:${token}`, req.authUser!.id, 86400); // 24h

    await sendVerificationEmail(rows[0].email, rows[0].first_name ?? "User", token);
    res.json({ ok: true, message: "Verification email sent" });
  } catch (err) {
    logger.error({ err }, "[email] Resend verify failed");
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// ── POST /api/email/forgot-password ──────────────────────────────────────────
router.post("/email/forgot-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const { rows } = await pool.query(
      "SELECT id, first_name FROM users WHERE email=$1 AND status='active'",
      [email.toLowerCase().trim()],
    );

    // Always return success (don't leak whether email exists)
    if (rows[0]) {
      const token = generateToken(32);
      await storeToken(`pwd-reset:${token}`, rows[0].id, 3600); // 1h
      await sendPasswordResetEmail(email, rows[0].first_name ?? "User", token);
    }

    res.json({ ok: true, message: "If this email exists, a reset link has been sent" });
  } catch (err) {
    logger.error({ err }, "[email] Forgot password failed");
    res.status(500).json({ error: "Failed to process request" });
  }
});

// ── POST /api/email/reset-password ───────────────────────────────────────────
router.post("/email/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ error: "token and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const userId = await consumeToken(`pwd-reset:${token}`);
    if (!userId) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const hashed = await hashPassword(password);
    await pool.query(
      "UPDATE users SET password_hash=$1, updated_at=NOW(), locked_until=NULL, failed_login_attempts=0 WHERE id=$2",
      [hashed, userId],
    );

    // Invalidate all sessions
    await pool.query("DELETE FROM user_sessions WHERE user_id=$1", [userId]).catch(() => {});

    logger.info({ userId }, "[email] Password reset");
    res.json({ ok: true, message: "Password reset successfully" });
  } catch (err) {
    logger.error({ err }, "[email] Reset password failed");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ── POST /api/email/test (admin only) ─────────────────────────────────────────
router.post("/email/test", jwtAuth, requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, html } = req.body as { to?: string; subject?: string; html?: string };
    if (!to || !subject) {
      res.status(400).json({ error: "to and subject are required" });
      return;
    }
    const sent = await sendEmail({
      to,
      subject,
      html: html ?? `<p>Test email from mr7.ai sent at ${new Date().toUTCString()}</p>`,
    });
    res.json({ ok: sent, message: sent ? "Email sent" : "Email delivery failed (check SMTP config)" });
  } catch (err) {
    logger.error({ err }, "[email] Test email failed");
    res.status(500).json({ error: "Failed to send test email" });
  }
});

export default router;
