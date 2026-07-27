/**
 * Unified Authentication Framework (UAF) v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Single middleware that recognises all 6 authentication strategies in priority
 * order, normalises them into one UnifiedAuthContext attached to req.unifiedAuth,
 * and maintains full backward compatibility through req.authUser.
 *
 * Strategy resolution order (first match wins):
 *   1. Internal Service    — x-internal-key header          (highest trust, service-to-service)
 *   2. Cloudflare Access   — Cf-Access-Jwt-Assertion         (zero-trust perimeter)
 *   3. API Key             — x-api-key: mr7_*                (developer integration)
 *   4. JWT Bearer          — Authorization: Bearer <RS256>   (user session)
 *   5. Clerk Session       — req.auth / x-clerk-user-id      (SSO / web login)
 *   6. Replit OIDC         — Passport req.user from OIDC     (Replit SSO)
 *   7. Anonymous           — no credentials                  (public read-only access)
 *
 * Consumers:
 *   - Use req.unifiedAuth         for full context
 *   - Use req.authUser            for backward-compatible legacy field (auto-populated)
 *   - Guards: requireUnifiedAuth(), requireRole(), requireTier(), requirePermission(),
 *             requireAnyStrategy(), requireTokenQuota(), requireAuthAndQuota()
 *   - Audit:  authSummary(), authAuditLog()
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool, getUserById } from "../db.js";
import { verifyJwtRsa } from "../lib/crypto.js";
import { logger } from "../lib/logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthStrategy =
  | "internal"    // x-internal-key  — microservice / cron job
  | "cloudflare"  // Cf-Access-Jwt-Assertion — Cloudflare Zero Trust
  | "api_key"     // x-api-key: mr7_* — developer API access
  | "jwt"         // Authorization: Bearer <RS256 JWT> — user session
  | "clerk"       // Clerk session (req.auth from @clerk/express SDK)
  | "oidc"        // Replit OIDC via Passport session (req.user)
  | "anonymous";  // No credentials — public route

export type UserRole = "admin" | "user" | "system" | "service";
export type SubscriptionTier = "free" | "starter" | "professional" | "elite" | "system";

export interface UnifiedAuthContext {
  /** Canonical user / service identifier */
  userId: string;
  /** Email address — may be synthetic for non-user strategies */
  email: string;
  /** Display name when available */
  displayName?: string;
  /** Role for RBAC decisions */
  role: UserRole;
  /** Subscription tier — drives quota & rate-limit buckets */
  tier: SubscriptionTier;
  /** Which strategy resolved this context */
  authStrategy: AuthStrategy;
  /** Granted permission scopes */
  permissions: string[];
  /** Token quota for usage enforcement — null for non-user strategies */
  tokenQuota: { used: number; limit: number } | null;
  /** DB session ID when available */
  sessionId?: string;
  /** api_keys.id when resolved via API key */
  apiKeyId?: string;
  /** Clerk userId when resolved via Clerk */
  clerkUserId?: string;
  /** Cloudflare Access identity when resolved via CF */
  cloudflareIdentity?: { email: string; sub: string; country?: string };
  /** Replit OIDC claims when resolved via OIDC */
  oidcClaims?: Record<string, unknown>;
  /** Resolution time in milliseconds (perf diagnostics) */
  resolvedInMs?: number;
  /** Extra strategy-specific data */
  metadata: Record<string, unknown>;
}

// ── Express namespace augmentation ────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /**
       * Unified auth context — always set after unifiedAuth() middleware.
       * Use this in new code.
       */
      unifiedAuth: UnifiedAuthContext;
      /**
       * Backward-compatible alias — auto-populated from unifiedAuth when the
       * strategy resolves a real database user. All legacy routes using
       * req.authUser continue to work without changes.
       */
      authUser?: {
        id: string;
        email: string;
        role: string;
        subscription: string;
        tokens_used: number;
        tokens_limit: number;
      };
    }
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "";

const CF_TEAM_DOMAIN  = process.env.CF_ACCESS_TEAM_DOMAIN ?? ""; // e.g. myteam.cloudflareaccess.com
const CF_ACCESS_AUD   = process.env.CF_ACCESS_AUD ?? "";         // Application Audience tag
const CF_CERTS_TTL_MS = 10 * 60 * 1000;                         // JWKS cache: 10 min

// Cloudflare JWKS cache
interface CfJwksCache { keys: CfJwk[]; fetchedAt: number }
interface CfJwk { kid: string; n: string; e: string; kty: string }
let _cfJwksCache: CfJwksCache | null = null;

// ── Helper: client IP ─────────────────────────────────────────────────────────

function clientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff;
  return first?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

// ── Helper: build backward-compat authUser ────────────────────────────────────

function buildAuthUser(ctx: UnifiedAuthContext): Express.Request["authUser"] | undefined {
  if (ctx.authStrategy === "anonymous" || ctx.authStrategy === "internal") return undefined;
  return {
    id:           ctx.userId,
    email:        ctx.email,
    role:         ctx.role,
    subscription: ctx.tier,
    tokens_used:  ctx.tokenQuota?.used  ?? 0,
    tokens_limit: ctx.tokenQuota?.limit ?? 0,
  };
}

// ── Helper: anonymous context ─────────────────────────────────────────────────

function anonymousContext(): UnifiedAuthContext {
  return {
    userId:      "anonymous",
    email:       "",
    role:        "user",
    tier:        "free",
    authStrategy:"anonymous",
    permissions: [],
    tokenQuota:  null,
    metadata:    {},
  };
}

// ── Helper: hydrate DB quota for an existing context ─────────────────────────
// Used by OIDC strategy when we have a DB user but no pre-fetched quota fields.

async function hydrateQuota(userId: string): Promise<{ used: number; limit: number } | null> {
  try {
    const { rows } = await pool.query<{ tokens_used: number; tokens_limit: number }>(
      "SELECT tokens_used, tokens_limit FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    if (!rows[0]) return null;
    return { used: rows[0].tokens_used, limit: rows[0].tokens_limit };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 1 — Internal Service Key (x-internal-key)
// Highest trust level: microservice-to-microservice, cron jobs, orchestrators.
// Uses timing-safe comparison to prevent timing oracle attacks.
// ═══════════════════════════════════════════════════════════════════════════════

function resolveInternal(req: Request): UnifiedAuthContext | null {
  const header = req.headers["x-internal-key"] as string | undefined;
  if (!header) return null;

  // Key not configured → behave like internalAuth.ts (fail in prod, warn in dev)
  if (!INTERNAL_KEY) {
    if (process.env.NODE_ENV === "production") return null;
    logger.warn("[unifiedAuth/internal] INTERNAL_API_KEY not set — passing in dev mode");
    return {
      userId:      "system",
      email:       "system@internal",
      role:        "system",
      tier:        "system",
      authStrategy:"internal",
      permissions: ["*"],
      tokenQuota:  null,
      metadata:    { source: "x-internal-key", devBypass: true },
    };
  }

  // Constant-time comparison — prevents timing side-channel leaks
  try {
    const headerBuf = Buffer.from(header);
    const keyBuf    = Buffer.from(INTERNAL_KEY);
    // Pad to equal length before comparing so timingSafeEqual doesn't throw
    const maxLen    = Math.max(headerBuf.length, keyBuf.length);
    const a = Buffer.alloc(maxLen); headerBuf.copy(a);
    const b = Buffer.alloc(maxLen); keyBuf.copy(b);
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return {
    userId:      "system",
    email:       "system@internal",
    role:        "system",
    tier:        "system",
    authStrategy:"internal",
    permissions: ["*"],
    tokenQuota:  null,
    metadata:    { source: "x-internal-key", ip: clientIp(req) },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 2 — Cloudflare Zero Trust (Cf-Access-Jwt-Assertion)
// Verifies RS256 JWT against the team's public JWKS (cached 10 min).
// Falls back gracefully if CF is not configured.
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchCfJwks(): Promise<CfJwk[]> {
  if (_cfJwksCache && Date.now() - _cfJwksCache.fetchedAt < CF_CERTS_TTL_MS) {
    return _cfJwksCache.keys;
  }
  const url = `https://${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`CF JWKS fetch failed: ${res.status}`);
  const body = await res.json() as { keys: CfJwk[] };
  _cfJwksCache = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

async function resolveCloudflare(req: Request): Promise<UnifiedAuthContext | null> {
  const cfJwt = req.headers["cf-access-jwt-assertion"] as string | undefined;
  if (!cfJwt || !CF_TEAM_DOMAIN) return null;

  try {
    // Decode header to get kid
    const [headerB64] = cfJwt.split(".");
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString()) as {
      kid?: string; alg?: string;
    };

    const keys = await fetchCfJwks();
    const jwk  = keys.find((k) => k.kid === header.kid) ?? keys[0];
    if (!jwk) throw new Error("No matching JWK found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pubKey = crypto.createPublicKey({ key: jwk as any, format: "jwk" });

    const payload = jwt.verify(cfJwt, pubKey, {
      algorithms: ["RS256"],
      ...(CF_ACCESS_AUD ? { audience: CF_ACCESS_AUD } : {}),
      issuer: `https://${CF_TEAM_DOMAIN}`,
    }) as jwt.JwtPayload;

    const email   = (payload["email"] as string | undefined) ?? "";
    const country = req.headers["cf-ipcountry"] as string | undefined;

    return {
      userId:      `cf:${payload.sub ?? email}`,
      email,
      role:        "user",
      tier:        "professional",
      authStrategy:"cloudflare",
      permissions: ["chat", "image", "tts", "vector"],
      tokenQuota:  null,
      cloudflareIdentity: { email, sub: payload.sub ?? "", country },
      metadata:    { cfJti: payload.jti, country, ip: clientIp(req) },
    };
  } catch (err) {
    logger.warn({ err }, "[unifiedAuth/cloudflare] CF Access JWT verification failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 3 — Developer API Key (x-api-key: mr7_*)
// SHA-256 hash lookup against api_keys table; IP allowlist enforced.
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveApiKey(req: Request): Promise<UnifiedAuthContext | null> {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (!apiKey) return null;

  try {
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const { rows } = await pool.query<{
      id: string; user_id: string; name: string; permissions: string[];
      rate_limit_per_min: number; uid: string; email: string; role: string;
      subscription: string; tokens_used: number; tokens_limit: number;
      allowed_ips: string[] | null;
    }>(
      `SELECT ak.id, ak.user_id, ak.name, ak.permissions, ak.rate_limit_per_min,
              ak.allowed_ips,
              u.id AS uid, u.email, u.role, u.subscription,
              u.tokens_used, u.tokens_limit
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
        WHERE ak.key_hash = $1
          AND ak.is_active = true
          AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash],
    );

    if (!rows[0]) return null;

    const row        = rows[0];
    const ip         = clientIp(req);
    const allowedIps = row.allowed_ips ?? null;

    if (allowedIps && allowedIps.length > 0 && !allowedIps.includes(ip)) {
      logger.warn({ ip, keyId: row.id }, "[unifiedAuth/api_key] IP not in allowlist");
      return null;
    }

    // Fire-and-forget usage stamp
    pool.query(
      "UPDATE api_keys SET last_used_at = NOW(), last_used_ip = $2 WHERE id = $1",
      [row.id, ip],
    ).catch(() => {});

    return {
      userId:      row.uid,
      email:       row.email,
      role:        row.role as UserRole,
      tier:        row.subscription as SubscriptionTier,
      authStrategy:"api_key",
      permissions: Array.isArray(row.permissions) ? row.permissions : ["chat"],
      tokenQuota:  { used: row.tokens_used, limit: row.tokens_limit },
      apiKeyId:    row.id,
      metadata:    { keyName: row.name, rateLimitPerMin: row.rate_limit_per_min, ip },
    };
  } catch (err) {
    logger.error({ err }, "[unifiedAuth/api_key] DB lookup failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 4 — JWT Bearer (RS256)
// Verifies RSA-2048 access token; hydrates live quota from DB.
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveJwt(req: Request): Promise<UnifiedAuthContext | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token   = authHeader.slice(7);
  const payload = verifyJwtRsa(token);

  if (!payload || payload.type !== "access") {
    logger.debug("[unifiedAuth/jwt] Invalid or expired JWT");
    return null;
  }

  try {
    const user = await getUserById(payload.sub);
    if (!user) {
      logger.warn({ sub: payload.sub }, "[unifiedAuth/jwt] User not found");
      return null;
    }

    return {
      userId:      user.id,
      email:       user.email,
      role:        user.role as UserRole,
      tier:        user.subscription as SubscriptionTier,
      authStrategy:"jwt",
      permissions: user.role === "admin" ? ["*"] : ["chat", "image", "tts", "upload", "vector"],
      tokenQuota:  { used: user.tokens_used, limit: user.tokens_limit },
      metadata:    { jti: payload.jti, tier: payload.tier },
    };
  } catch (err) {
    logger.error({ err }, "[unifiedAuth/jwt] DB hydration failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 5 — Clerk Session
// Reads the context set by @clerk/express clerkMiddleware() (req.auth).
// Also accepts x-clerk-user-id for programmatic server-side calls.
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveClerk(req: Request): Promise<UnifiedAuthContext | null> {
  const clerkAuth = (req as unknown as {
    auth?: { userId?: string; sessionId?: string; orgId?: string };
  }).auth;
  const clerkUserId =
    clerkAuth?.userId ?? (req.headers["x-clerk-user-id"] as string | undefined);

  if (!clerkUserId) return null;

  try {
    const { rows } = await pool.query<{
      id: string; email: string; role: string; subscription: string;
      tokens_used: number; tokens_limit: number;
    }>(
      `SELECT id, email, role, subscription, tokens_used, tokens_limit
         FROM users
        WHERE oauth_provider = 'clerk' AND oauth_provider_id = $1
        LIMIT 1`,
      [clerkUserId],
    );

    if (rows[0]) {
      const u = rows[0];
      return {
        userId:      u.id,
        email:       u.email,
        role:        u.role as UserRole,
        tier:        u.subscription as SubscriptionTier,
        authStrategy:"clerk",
        permissions: u.role === "admin" ? ["*"] : ["chat", "image", "tts", "upload"],
        tokenQuota:  { used: u.tokens_used, limit: u.tokens_limit },
        clerkUserId,
        sessionId:   clerkAuth?.sessionId,
        metadata:    { orgId: clerkAuth?.orgId },
      };
    }

    // No linked DB user — JIT-provision the Clerk user in the local users table
    try {
      // Attempt to fetch email from Clerk API
      let userEmail = `clerk_${clerkUserId}@noreply.mr7`;
      try {
        const { createClerkClient } = await import("@clerk/express");
        const clerkApiClient = createClerkClient({ secretKey: process.env["CLERK_SECRET_KEY"] });
        const clerkUser = await clerkApiClient.users.getUser(clerkUserId);
        const primary = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        );
        if (primary?.emailAddress) userEmail = primary.emailAddress;
      } catch (clerkFetchErr) {
        logger.warn({ clerkFetchErr }, "[unifiedAuth/clerk] Could not fetch Clerk user email — using synthetic email");
      }

      const newId = crypto.randomUUID();
      const { rows: provisioned } = await pool.query<{
        id: string; email: string; role: string; subscription: string;
        tokens_used: number; tokens_limit: number;
      }>(
        `INSERT INTO users (id, email, role, subscription, oauth_provider, oauth_provider_id, tokens_used, tokens_limit, created_at, updated_at)
         VALUES ($1, $2, 'user', 'free', 'clerk', $3, 0, 100000, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE
           SET oauth_provider    = EXCLUDED.oauth_provider,
               oauth_provider_id = EXCLUDED.oauth_provider_id,
               updated_at        = NOW()
         RETURNING id, email, role, subscription, tokens_used, tokens_limit`,
        [newId, userEmail, clerkUserId],
      );

      if (provisioned[0]) {
        const u = provisioned[0];
        logger.info({ userId: u.id, clerkUserId }, "[unifiedAuth/clerk] JIT-provisioned new Clerk user");
        return {
          userId:      u.id,
          email:       u.email,
          role:        u.role as UserRole,
          tier:        u.subscription as SubscriptionTier,
          authStrategy:"clerk",
          permissions: ["chat", "image", "tts", "upload"],
          tokenQuota:  { used: u.tokens_used, limit: u.tokens_limit },
          clerkUserId,
          sessionId:   clerkAuth?.sessionId,
          metadata:    { orgId: clerkAuth?.orgId, provisioned: true },
        };
      }
    } catch (provisionErr) {
      logger.error({ provisionErr }, "[unifiedAuth/clerk] JIT provisioning failed — falling back to ephemeral context");
    }

    // Final fallback: ephemeral clerk context (chat-only)
    return {
      userId:      `clerk:${clerkUserId}`,
      email:       "",
      role:        "user",
      tier:        "free",
      authStrategy:"clerk",
      permissions: ["chat"],
      tokenQuota:  null,
      clerkUserId,
      sessionId:   clerkAuth?.sessionId,
      metadata:    { ephemeral: true, orgId: clerkAuth?.orgId },
    };
  } catch (err) {
    logger.error({ err }, "[unifiedAuth/clerk] DB lookup failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Strategy 6 — Replit OIDC via Passport Session (req.user)
// Reads claims set by Passport's OIDC strategy in routes/auth.ts.
// Syncs with the users table for live role/quota data.
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveOidc(req: Request): Promise<UnifiedAuthContext | null> {
  // Passport populates req.user with serialised OIDC session data
  const passportUser = (req as unknown as { user?: Record<string, unknown> }).user;
  if (!passportUser) return null;

  const claims = passportUser["claims"] as Record<string, unknown> | undefined;
  if (!claims) return null;

  const sub   = claims["sub"] as string | undefined;
  const email = (claims["email"] as string | undefined) ?? "";
  if (!sub) return null;

  // Check session expiry
  const expiresAt = passportUser["expires_at"] as number | undefined;
  if (expiresAt && Math.floor(Date.now() / 1000) > expiresAt) {
    // Token expired — fall through to anonymous; caller should handle refresh
    logger.debug({ sub }, "[unifiedAuth/oidc] OIDC token expired");
    return null;
  }

  try {
    // Attempt to find linked DB user
    const { rows } = await pool.query<{
      id: string; email: string; role: string; subscription: string;
      tokens_used: number; tokens_limit: number;
    }>(
      `SELECT id, email, role, subscription, tokens_used, tokens_limit
         FROM users WHERE id = $1 LIMIT 1`,
      [sub],
    );

    const firstName = claims["first_name"] as string | undefined;
    const lastName  = claims["last_name"]  as string | undefined;
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || undefined;

    if (rows[0]) {
      const u = rows[0];
      return {
        userId:      u.id,
        email:       u.email || email,
        displayName,
        role:        u.role as UserRole,
        tier:        u.subscription as SubscriptionTier,
        authStrategy:"oidc",
        permissions: u.role === "admin" ? ["*"] : ["chat", "image", "tts", "upload", "vector"],
        tokenQuota:  { used: u.tokens_used, limit: u.tokens_limit },
        oidcClaims:  claims,
        metadata:    { provider: "replit", profileImageUrl: claims["profile_image_url"] },
      };
    }

    // User not in DB yet — upsert will happen in the OIDC callback; return limited context
    return {
      userId:      sub,
      email,
      displayName,
      role:        "user",
      tier:        "free",
      authStrategy:"oidc",
      permissions: ["chat"],
      tokenQuota:  null,
      oidcClaims:  claims,
      metadata:    { provider: "replit", pending_upsert: true },
    };
  } catch (err) {
    logger.error({ err }, "[unifiedAuth/oidc] DB lookup failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Middleware — resolves strategy chain and populates req.unifiedAuth
// ═══════════════════════════════════════════════════════════════════════════════

export async function unifiedAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const startMs = Date.now();

  try {
    let ctx: UnifiedAuthContext | null = null;

    // Explicit local-only bypass for direct Replit development testing.
    // It is intentionally treated as an internal system actor so legacy
    // internalAuth guards and authenticated routes can be exercised together.
    if (process.env.LOCAL_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production") {
      ctx = {
        userId: "local-dev",
        email: "local-dev@mr7.local",
        displayName: "Local Development User",
        role: "system",
        tier: "system",
        authStrategy: "internal",
        permissions: ["*"],
        tokenQuota: null,
        metadata: { source: "LOCAL_AUTH_BYPASS", localOnly: true },
      };
    }

    // Strategy 1: Internal Service Key (synchronous — fastest, checked first)
    if (!ctx) ctx = resolveInternal(req);

    // Strategy 2: Cloudflare Zero Trust
    if (!ctx) ctx = await resolveCloudflare(req);

    // Strategy 3: Developer API Key
    if (!ctx) ctx = await resolveApiKey(req);

    // Strategy 4: JWT Bearer (RS256)
    if (!ctx) ctx = await resolveJwt(req);

    // Strategy 5: Clerk Session
    if (!ctx) ctx = await resolveClerk(req);

    // Strategy 6: Replit OIDC (Passport session)
    if (!ctx) ctx = await resolveOidc(req);

    // Strategy 7: Anonymous fallback
    if (!ctx) ctx = anonymousContext();

    ctx.resolvedInMs = Date.now() - startMs;
    req.unifiedAuth = ctx;

    // Backward compatibility: populate req.authUser for all legacy routes
    const legacyUser = buildAuthUser(ctx);
    if (legacyUser) req.authUser = legacyUser;

    next();
  } catch (err) {
    logger.error(
      { err },
      "[unifiedAuth] Unexpected error in strategy chain — failing open (anonymous)",
    );
    req.unifiedAuth = { ...anonymousContext(), resolvedInMs: Date.now() - startMs };
    next();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Guards — composable Express middleware for access control
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reject anonymous requests.
 * Any authenticated strategy passes (internal, cf, api_key, jwt, clerk, oidc).
 */
export function requireUnifiedAuth(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.unifiedAuth;
  if (!ctx || ctx.authStrategy === "anonymous") {
    res.status(401).json({
      error: "Authentication required.",
      hint:  "Provide a Bearer token, API key (x-api-key), Clerk session, or valid Replit session.",
    });
    return;
  }
  next();
}

/**
 * Require one of the listed strategies exactly.
 * Example: requireAnyStrategy("jwt", "clerk") — rejects api_key or internal.
 */
export function requireAnyStrategy(...strategies: AuthStrategy[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.unifiedAuth;
    if (!ctx || !strategies.includes(ctx.authStrategy)) {
      res.status(401).json({
        error:    "Authentication method not accepted for this endpoint.",
        accepted: strategies,
        current:  ctx?.authStrategy ?? "none",
      });
      return;
    }
    next();
  };
}

/**
 * Require a minimum role.
 * Role hierarchy: system > admin > service > user
 */
const ROLE_RANK: Record<UserRole | "service", number> = {
  system:  100,
  admin:   80,
  service: 60,
  user:    10,
};

export function requireRole(...roles: Array<UserRole | "service">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.unifiedAuth;
    if (!ctx || ctx.authStrategy === "anonymous") {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const userRank = ROLE_RANK[ctx.role] ?? 0;
    const minRank  = Math.min(...roles.map((r) => ROLE_RANK[r] ?? 999));
    if (userRank < minRank) {
      res.status(403).json({
        error:    "Insufficient role.",
        required: roles,
        current:  ctx.role,
      });
      return;
    }
    next();
  };
}

/**
 * Require a specific permission scope.
 * "*" wildcard grants all permissions (internal / admin).
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.unifiedAuth;
    if (!ctx || ctx.authStrategy === "anonymous") {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const has = ctx.permissions.includes("*") || ctx.permissions.includes(permission);
    if (!has) {
      res.status(403).json({
        error:    "Insufficient permissions.",
        required: permission,
        granted:  ctx.permissions,
      });
      return;
    }
    next();
  };
}

/**
 * Require a minimum subscription tier.
 * Tier hierarchy: system > elite > professional > starter > free
 */
const TIER_RANK: Record<SubscriptionTier, number> = {
  system:       100,
  elite:        80,
  professional: 60,
  starter:      40,
  free:         10,
};

export function requireTier(...tiers: SubscriptionTier[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.unifiedAuth;
    if (!ctx || ctx.authStrategy === "anonymous") {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const userRank = TIER_RANK[ctx.tier] ?? 0;
    const minRank  = Math.min(...tiers.map((t) => TIER_RANK[t] ?? 999));
    if (userRank < minRank) {
      res.status(403).json({
        error:      "Plan upgrade required.",
        required:   tiers,
        current:    ctx.tier,
        upgradeUrl: "/app#pricing",
      });
      return;
    }
    next();
  };
}

/**
 * Enforce token quota — rejects requests when used >= limit.
 * Safe to chain after requireUnifiedAuth.
 */
export function requireTokenQuota(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.unifiedAuth;
  if (!ctx || !ctx.tokenQuota) { next(); return; }
  if (ctx.tokenQuota.used >= ctx.tokenQuota.limit) {
    res.status(429).json({
      error:      "Token quota exceeded. Please upgrade your plan or wait for the next billing cycle.",
      used:       ctx.tokenQuota.used,
      limit:      ctx.tokenQuota.limit,
      upgradeUrl: "/app#pricing",
    });
    return;
  }
  next();
}

/**
 * Combined convenience guard: authenticated + token quota OK.
 * Equivalent to: [requireUnifiedAuth, requireTokenQuota]
 */
export function requireAuthAndQuota(req: Request, res: Response, next: NextFunction): void {
  requireUnifiedAuth(req, res, () => requireTokenQuota(req, res, next));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Backward-compatible shims — re-export under legacy names so existing imports
// (jwtAuth, requireAuth, requireAdmin, checkTokenQuota) continue to work.
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use unifiedAuth() instead. */
export const jwtAuth = unifiedAuth;

/** @deprecated Use requireUnifiedAuth() instead. */
export const requireAuth = requireUnifiedAuth;

/** @deprecated Use requireRole("admin") instead. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole("admin")(req, res, next);
}

/** @deprecated Use requireTokenQuota() instead. */
export const checkTokenQuota = requireTokenQuota;

// ── Utility: extract auth summary for logging / audit ─────────────────────────

export function authSummary(req: Request): Record<string, unknown> {
  const ctx = req.unifiedAuth;
  if (!ctx) return { strategy: "unresolved" };
  return {
    strategy:    ctx.authStrategy,
    userId:      ctx.userId === "anonymous" || ctx.userId.startsWith("system") || ctx.userId.startsWith("cf:")
                   ? ctx.userId
                   : "[redacted]",
    role:        ctx.role,
    tier:        ctx.tier,
    apiKeyId:    ctx.apiKeyId,
    clerkUserId: ctx.clerkUserId,
    resolvedInMs:ctx.resolvedInMs,
  };
}

/**
 * Security audit log — structured log entry for auth events.
 * Call from sensitive route handlers to produce a traceable audit trail.
 *
 * @example
 *   authAuditLog(req, "user.password_change", { outcome: "success" });
 */
export function authAuditLog(
  req: Request,
  event: string,
  extra?: Record<string, unknown>,
): void {
  const ctx = req.unifiedAuth;
  logger.info({
    audit:    true,
    event,
    strategy: ctx?.authStrategy ?? "unresolved",
    role:     ctx?.role,
    tier:     ctx?.tier,
    ip:       clientIp(req),
    path:     req.path,
    method:   req.method,
    apiKeyId: ctx?.apiKeyId,
    // userId is sensitive — only log for system/anonymous actors
    userId:
      !ctx || ctx.authStrategy === "anonymous" || ctx.authStrategy === "internal"
        ? ctx?.userId
        : undefined,
    ...extra,
  });
}
