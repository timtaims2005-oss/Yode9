/**
 * Referral system
 * GET  /api/referrals/me      → get/create own referral code + stats
 * POST /api/referrals/redeem  → redeem another user's referral code (one-time per account)
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";
import crypto from "crypto";

const router = Router();

const REWARD_TOKENS = 5000;

function generateCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId + Date.now()).digest("hex");
  return hash.slice(0, 8).toUpperCase();
}

async function ensureCode(userId: string): Promise<string> {
  const { rows } = await pool.query("SELECT referral_code FROM users WHERE id = $1", [userId]);
  if (rows[0]?.referral_code) return rows[0].referral_code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(userId + attempt);
    try {
      await pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [code, userId]);
      return code;
    } catch {
      // collision — retry with a different salt
    }
  }
  throw new Error("Failed to generate referral code");
}

/* ── GET /api/referrals/me ── */
router.get("/referrals/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.authUser!.id;
    const code = await ensureCode(userId);

    const { rows: referred } = await pool.query(
      `SELECT r.id, r.status, r.reward_tokens, r.created_at, u.email, u.first_name
       FROM referrals r JOIN users u ON u.id = r.referred_user_id
       WHERE r.referrer_user_id = $1 ORDER BY r.created_at DESC`,
      [userId],
    );
    const { rows: agg } = await pool.query(
      "SELECT COALESCE(SUM(reward_tokens), 0) as total_earned FROM referrals WHERE referrer_user_id = $1",
      [userId],
    );

    res.json({
      code,
      referralLink: `${req.protocol}://${req.get("host")}/?ref=${code}`,
      totalReferred: referred.length,
      totalTokensEarned: parseInt(agg[0].total_earned) || 0,
      rewardPerReferral: REWARD_TOKENS,
      referred,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch referral info", detail: err instanceof Error ? err.message : String(err) });
  }
});

/* ── POST /api/referrals/redeem ── */
router.post("/referrals/redeem", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    const userId = req.authUser!.id;
    if (!code || !code.trim()) { res.status(400).json({ error: "Referral code required" }); return; }

    const { rows: me } = await pool.query("SELECT referred_by, referral_code FROM users WHERE id = $1", [userId]);
    if (me[0]?.referred_by) { res.status(400).json({ error: "لقد استخدمت كود إحالة من قبل" }); return; }
    if (me[0]?.referral_code === code.trim().toUpperCase()) {
      res.status(400).json({ error: "لا يمكنك استخدام كود الإحالة الخاص بك" });
      return;
    }

    const { rows: referrer } = await pool.query(
      "SELECT id FROM users WHERE referral_code = $1", [code.trim().toUpperCase()],
    );
    if (!referrer[0]) { res.status(404).json({ error: "كود الإحالة غير صحيح" }); return; }
    const referrerId = referrer[0].id as string;

    await pool.query("UPDATE users SET referred_by = $1 WHERE id = $2", [referrerId, userId]);
    await pool.query(
      `INSERT INTO referrals (referrer_user_id, referred_user_id, status, reward_tokens, rewarded_at)
       VALUES ($1, $2, 'rewarded', $3, NOW())`,
      [referrerId, userId, REWARD_TOKENS],
    );
    // Give both sides a token bonus by reducing their used-token counter (floor 0)
    await pool.query(
      "UPDATE users SET tokens_used = GREATEST(0, tokens_used - $1) WHERE id IN ($2, $3)",
      [REWARD_TOKENS, referrerId, userId],
    );
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES
       ($1, 'referral', 'مكافأة إحالة', $3),
       ($2, 'referral', 'مكافأة إحالة', 'حصلت على 5000 توكن إضافي لاستخدام كود إحالة')`,
      [referrerId, userId, "أحد الأصدقاء استخدم كود الإحالة الخاص بك — حصلت على 5000 توكن إضافي"],
    );

    res.json({ ok: true, rewardTokens: REWARD_TOKENS });
  } catch (err) {
    res.status(500).json({ error: "Failed to redeem referral code", detail: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
