import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import {
  verifyActivationCode,
  verifyAdminPassword,
  generateActivationCode,
} from "../lib/subscription-verify";
import { logger } from "../lib/logger";

const router = Router();

const verifySchema = z.object({
  code: z.string().min(8).max(64),
  deviceId: z.string().min(4).max(128),
});

const statusSchema = z.object({
  deviceId: z.string().min(4).max(128),
});

const useTokensSchema = z.object({
  deviceId: z.string().min(4).max(128),
  tokens: z.number().int().positive().max(1_000_000),
});

const generateSchema = z.object({
  adminPassword: z.string().min(1),
  tier: z.enum(["free", "starter", "professional", "elite"]),
  days: z.number().int().positive().max(3650),
});

// POST /subscriptions/verify
router.post("/subscriptions/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid request body." });
  }
  const { code, deviceId } = parsed.data;

  const verified = verifyActivationCode(code);
  if (!verified) {
    return res.status(400).json({ ok: false, error: "Invalid or expired activation code." });
  }

  try {
    await pool.query(
      `INSERT INTO subscriptions (device_id, tier, activated_at, expires_at, tokens_used, activation_code_hash)
       VALUES ($1, $2, NOW(), to_timestamp($3 / 1000.0), 0, MD5($4))
       ON CONFLICT (device_id) DO UPDATE
         SET tier = $2,
             activated_at = NOW(),
             expires_at = to_timestamp($3 / 1000.0),
             tokens_used = 0,
             activation_code_hash = MD5($4)`,
      [deviceId, verified.tier, verified.expiresAt, code],
    );

    logger.info({ deviceId, tier: verified.tier }, "Subscription activated");
    return res.json({ ok: true, tier: verified.tier, expiresAt: verified.expiresAt });
  } catch (err) {
    logger.error({ err }, "Failed to save subscription");
    return res.status(500).json({ ok: false, error: "Database error." });
  }
});

// GET /subscriptions/status?deviceId=
router.get("/subscriptions/status", async (req, res) => {
  const parsed = statusSchema.safeParse({ deviceId: req.query.deviceId });
  if (!parsed.success) {
    return res.status(400).json({ error: "deviceId required." });
  }
  const { deviceId } = parsed.data;

  try {
    const result = await pool.query(
      `SELECT tier, activated_at, expires_at, tokens_used
       FROM subscriptions WHERE device_id = $1`,
      [deviceId],
    );

    if (result.rows.length === 0) {
      return res.json({
        tier: "free",
        activatedAt: null,
        expiresAt: null,
        tokensUsed: 0,
        active: false,
      });
    }

    const row = result.rows[0];
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
    const isActive = expiresAt ? Date.now() < expiresAt : false;

    // Auto-downgrade expired subscriptions
    if (!isActive && row.tier !== "free") {
      await pool.query(
        "UPDATE subscriptions SET tier = 'free' WHERE device_id = $1",
        [deviceId],
      );
      logger.info({ deviceId }, "Subscription expired — downgraded to free");
    }

    return res.json({
      tier: isActive ? row.tier : "free",
      activatedAt: row.activated_at ? new Date(row.activated_at).getTime() : null,
      expiresAt,
      tokensUsed: row.tokens_used ?? 0,
      active: isActive,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch subscription status");
    return res.status(500).json({ error: "Database error." });
  }
});

// POST /subscriptions/use-tokens — atomic token deduction
router.post("/subscriptions/use-tokens", async (req, res) => {
  const parsed = useTokensSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid request." });
  }
  const { deviceId, tokens } = parsed.data;

  try {
    await pool.query(
      `INSERT INTO subscriptions (device_id, tier, tokens_used)
       VALUES ($1, 'free', $2)
       ON CONFLICT (device_id) DO UPDATE
         SET tokens_used = subscriptions.tokens_used + $2`,
      [deviceId, tokens],
    );
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to deduct tokens");
    return res.status(500).json({ ok: false, error: "Database error." });
  }
});

// POST /subscriptions/generate — admin only (server-side code generation)
router.post("/subscriptions/generate", (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "Invalid request." });
  }
  const { adminPassword, tier, days } = parsed.data;

  if (!verifyAdminPassword(adminPassword)) {
    return res.status(403).json({ ok: false, error: "Invalid admin password." });
  }

  const code = generateActivationCode(tier, days);
  logger.info({ tier, days }, "Activation code generated");
  return res.json({ ok: true, code });
});

export default router;
