/**
 * OAuth Routes — Google + GitHub
 * ────────────────────────────────
 * GET /api/auth/google          → redirect to Google OAuth
 * GET /api/auth/google/callback → Google OAuth callback
 * GET /api/auth/github          → redirect to GitHub OAuth
 * GET /api/auth/github/callback → GitHub OAuth callback
 *
 * On success: issues JWT access + refresh tokens, redirects to frontend.
 */

import { Router, type Request, type Response } from "express";
import passport from "passport";
import { pool } from "../db.js";
import { signAccessToken, signRefreshToken, generateToken, sha256 } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";
import { sendWelcomeEmail } from "../lib/email.js";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL
  ?? (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5173");

// ── Setup Strategies (called from app.ts after passport is initialized) ───────
export async function setupOAuthStrategies(): Promise<void> {
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  const githubEnabled = !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET;

  if (!googleEnabled && !githubEnabled) {
    logger.info("[oauth] No OAuth providers configured — routes will return 501");
    return;
  }

  // ── Google Strategy ──────────────────────────────────────────────────────
  if (googleEnabled) {
    try {
      const { Strategy: GoogleStrategy } = await import("passport-google-oauth20");
      passport.use(new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: `${process.env.API_BASE_URL ?? ""}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const user = await upsertOAuthUser({
              provider: "google",
              providerId: profile.id,
              email: profile.emails?.[0]?.value ?? "",
              name: profile.displayName ?? "",
              avatar: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        },
      ));
      logger.info("[oauth] Google strategy initialized");
    } catch (err) {
      logger.warn({ err }, "[oauth] Failed to load passport-google-oauth20");
    }
  }

  // ── GitHub Strategy ──────────────────────────────────────────────────────
  if (githubEnabled) {
    try {
      const { Strategy: GitHubStrategy } = await import("passport-github2");
      passport.use(new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          callbackURL: `${process.env.API_BASE_URL ?? ""}/api/auth/github/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: { id: string; displayName: string; emails?: { value: string }[]; photos?: { value: string }[]; username?: string }, done: (err: Error | null, user?: unknown) => void) => {
          try {
            const user = await upsertOAuthUser({
              provider: "github",
              providerId: profile.id,
              email: profile.emails?.[0]?.value ?? `${profile.username ?? profile.id}@github.com`,
              name: profile.displayName ?? profile.username ?? "",
              avatar: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        },
      ));
      logger.info("[oauth] GitHub strategy initialized");
    } catch (err) {
      logger.warn({ err }, "[oauth] Failed to load passport-github2");
    }
  }
}

// ── Google OAuth Routes ───────────────────────────────────────────────────────
router.get("/auth/google", (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(501).json({ error: "Google OAuth not configured" });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res);
});

router.get("/auth/google/callback", (req: Request, res: Response) => {
  passport.authenticate("google", { session: false }, async (err: Error | null, user: OAuthUser | false) => {
    return handleOAuthCallback(req, res, err, user);
  })(req, res);
});

// ── GitHub OAuth Routes ───────────────────────────────────────────────────────
router.get("/auth/github", (req: Request, res: Response) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    res.status(501).json({ error: "GitHub OAuth not configured" });
    return;
  }
  passport.authenticate("github", { scope: ["user:email"] })(req, res);
});

router.get("/auth/github/callback", (req: Request, res: Response) => {
  passport.authenticate("github", { session: false }, async (err: Error | null, user: OAuthUser | false) => {
    return handleOAuthCallback(req, res, err, user);
  })(req, res);
});

// ── Available providers endpoint ──────────────────────────────────────────────
router.get("/auth/oauth/providers", (_req: Request, res: Response) => {
  res.json({
    providers: [
      { id: "google", name: "Google", enabled: !!process.env.GOOGLE_CLIENT_ID },
      { id: "github", name: "GitHub", enabled: !!process.env.GITHUB_CLIENT_ID },
    ],
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
interface OAuthUser {
  id: string;
  email: string;
  role: string;
  subscription: string;
  isNew: boolean;
}

async function upsertOAuthUser(data: {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}): Promise<OAuthUser> {
  // Ensure oauth_accounts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR NOT NULL,
      provider_id VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(provider, provider_id)
    )
  `).catch(() => {});

  // Check if OAuth account already linked
  const { rows: existing } = await pool.query(
    `SELECT u.id, u.email, u.role, u.subscription
     FROM oauth_accounts oa
     JOIN users u ON oa.user_id = u.id
     WHERE oa.provider=$1 AND oa.provider_id=$2`,
    [data.provider, data.providerId],
  );

  if (existing[0]) {
    return { ...existing[0], isNew: false };
  }

  // Check if user exists with same email
  let userId: string;
  let isNew = false;
  const { rows: byEmail } = await pool.query(
    "SELECT id FROM users WHERE email=$1",
    [data.email],
  );

  if (byEmail[0]) {
    userId = byEmail[0].id;
  } else {
    // Create new user
    const nameParts = data.name.trim().split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") ?? "";

    const { rows: newUser } = await pool.query(
      `INSERT INTO users (email, first_name, last_name, profile_image_url, status, email_verified, role, subscription)
       VALUES ($1, $2, $3, $4, 'active', true, 'user', 'free')
       RETURNING id, email, role, subscription`,
      [data.email, firstName, lastName, data.avatar ?? null],
    );
    userId = newUser[0].id;
    isNew = true;

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(data.email, data.name).catch(() => {});
  }

  // Link OAuth account
  await pool.query(
    "INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, data.provider, data.providerId],
  );

  const { rows: user } = await pool.query(
    "SELECT id, email, role, subscription FROM users WHERE id=$1",
    [userId],
  );

  logger.info({ provider: data.provider, userId, isNew }, "[oauth] User upserted");
  return { ...user[0], isNew };
}

async function handleOAuthCallback(
  _req: Request,
  res: Response,
  err: Error | null,
  user: OAuthUser | false,
): Promise<void> {
  if (err || !user) {
    logger.error({ err }, "[oauth] Callback error");
    res.redirect(`${FRONTEND_URL}/?auth_error=oauth_failed`);
    return;
  }

  try {
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscription,
    });
    const rawRefresh = generateToken(40);
    const refreshHash = sha256(rawRefresh);

    // Store refresh token
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, NOW() + INTERVAL '30 days', 'OAuth', 'oauth')
       ON CONFLICT DO NOTHING`,
      [user.id, refreshHash],
    ).catch(() => {});

    // Redirect to frontend with tokens in URL fragment
    const redirectUrl = new URL(`${FRONTEND_URL}/`);
    redirectUrl.searchParams.set("access_token", accessToken);
    redirectUrl.searchParams.set("refresh_token", rawRefresh);
    if (user.isNew) redirectUrl.searchParams.set("new_user", "1");

    res.redirect(redirectUrl.toString());
  } catch (err2) {
    logger.error({ err: err2 }, "[oauth] Token generation failed");
    res.redirect(`${FRONTEND_URL}/?auth_error=token_failed`);
  }
}

export default router;
