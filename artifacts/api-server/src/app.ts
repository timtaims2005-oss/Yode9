import express, { type Express } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { RedisStore } from "connect-redis";
import passport from "passport";
import { getRedis, getRawIoRedis } from "./lib/redis.js";
import { osintLimiter, cveSearchLimiter } from "./middlewares/redis-rate-limit.js";
import { guardrailsMiddleware, sensitiveToolLimiter } from "./middlewares/guardrails.js";
import router from "./routes";
import healthRouter from "./routes/health";
import providersRouter from "./routes/providers";
import cloudChatsRouter from "./routes/cloud-chats";
import subscriptionsRouter from "./routes/subscriptions";
import { cisaRouter } from "./routes/cisa";
import oauthRouter, { setupOAuthStrategies } from "./routes/oauth";
import { logger } from "./lib/logger";
import { validateEnv } from "./lib/env";
import { internalAuth } from "./middlewares/internalAuth";
import { sanitizeInputs } from "./middlewares/sanitize";
import { attackDetector } from "./middlewares/attack-detector";
import { ensureCsrfToken, getCsrfToken } from "./middlewares/csrf";
import { pool, ensureAuthTables, ensureReferralTables } from "./db";
import { setupReplitAuth } from "./routes/auth";
import { startBackupScheduler } from "./lib/backup";
import { seedDefaultFlags } from "./lib/feature-flags";
import threatIntelRouter from "./routes/threat-intel";
import webhooksAlertsRouter from "./routes/webhooks-alerts";
import osintAdvancedRouter from "./routes/osint-advanced";
import osintRouter from "./routes/osint";
import deepSearchRouter from "./routes/deep-search";
import aiToolsRouter from "./routes/ai-tools";
import darkwebIntelligenceRouter from "./routes/darkweb-intelligence";
import { osintIntelRouter } from "./routes/osint-intel";
import intelRouter from "./routes/intel";
import osintFreeRouter from "./routes/osint-free";
import blogRouter from "./routes/blog.js";
import abTestsRouter from "./routes/ab-tests.js";
import chatRouter from "./routes/chat";
import ecosystemRouter from "./routes/ecosystem";
import { globalErrorHandler } from "./middlewares/errorHandler";
import { unifiedAuth } from "./middlewares/unifiedAuthMiddleware";
import { authAwareRateLimit } from "./middlewares/authAwareRateLimit.js";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware.js";
import agenticStreamRouter from "./gateway/agentic-stream.js";

// Validate environment at startup — exits if critical vars missing
validateEnv();

const app: Express = express();

app.set("trust proxy", 1);

const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.openai.com",
          "https://api.anthropic.com",
          "https://openrouter.ai",
          "https://api.groq.com",
          "wss:",
          "ws:",
        ],
        mediaSrc: ["'self'", "blob:", "data:"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: isDev ? ["*"] : ["'none'"],
        upgradeInsecureRequests: isDev ? null : [],
      },
    },
  }),
);

// CORS — use explicit origins in production; never wildcard
const ALLOWED_ORIGINS: string | string[] | boolean = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : process.env.NODE_ENV === "production"
    ? [] // Reject all cross-origin in production if not configured
    : true; // Allow all in development only

if (process.env.NODE_ENV === "production" && Array.isArray(ALLOWED_ORIGINS) && ALLOWED_ORIGINS.length === 0) {
  logger.warn("ALLOWED_ORIGINS not set in production — all cross-origin requests will be rejected.");
}

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      // Standard
      "Content-Type",
      "Authorization",
      // Unified Auth Framework — all 6 strategies
      "X-Internal-Key",       // Strategy 1: internal service
      "Cf-Access-Jwt-Assertion", // Strategy 2: Cloudflare Zero Trust
      "X-Api-Key",            // Strategy 3: developer API key
      // (Strategy 4: JWT — via Authorization header above)
      "X-Clerk-User-Id",      // Strategy 5: Clerk server-side calls
      // (Strategy 6: OIDC — via session cookie, no custom header)
      // Misc
      "X-MR7-Signature",
      "X-No-Compression",
      "X-Request-Id",
    ],
    exposedHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    credentials: true,
  }),
);

// ── Rate limiters ─────────────────────────────────────────────────────────────
// In development (Replit) all traffic arrives from the same reverse-proxy IP,
// so a shared counter would fire immediately. Skip every limiter in dev mode.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
  skip: (req) => isDev || req.method === "OPTIONS",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI rate limit — max 120 requests/min." },
  // Skip in dev; also skip any chat request that targets the local/Ollama engine
  // so streaming inference is never throttled by this express-rate-limit counter.
  skip: (req) => {
    if (isDev) return true;
    // If the client signals it's routing to the local engine, bypass
    const localHeader = req.headers["x-local-engine"];
    if (localHeader === "1" || localHeader === "true") return true;
    return false;
  },
});

const shellLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Shell rate limit — max 30 commands/min." },
  skip: () => isDev,
});

const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Subscription rate limit — max 10 requests/min." },
  skip: () => isDev,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts — try again later." },
  skipSuccessfulRequests: true,
  skip: () => isDev,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Upload rate limit — max 30 uploads/min." },
  skip: () => isDev,
});

app.use(globalLimiter);

// ── Compression — gzip for text responses (SSE excluded to preserve streaming) ─
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // CRITICAL: never compress SSE streams — compression buffers output and
    // destroys real-time token delivery. Check both incoming Accept and the
    // Content-Type the route is about to send.
    const accept = req.headers['accept'] ?? '';
    const ct = res.getHeader('content-type') as string ?? '';
    if (
      accept.includes('text/event-stream') ||
      ct.includes('text/event-stream') ||
      req.headers['x-no-compression']
    ) return false;
    return compression.filter(req, res);
  },
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Clerk proxy — must be mounted BEFORE body parsers (streams raw bytes) ──────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Clerk session middleware — resolves req.auth for all routes ────────────────
// Only mount when CLERK_SECRET_KEY is available; otherwise skip silently so the
// server doesn't crash on boot when Clerk is not yet configured.
if (process.env.CLERK_SECRET_KEY) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
} else {
  logger.warn("[clerk] CLERK_SECRET_KEY not set — Clerk auth middleware skipped. Set the key to enable authentication.");
}

// Serve uploaded files (local storage)
app.use("/uploads", express.static(process.env.LOCAL_UPLOAD_DIR ?? "./uploads"));

app.use(sanitizeInputs);

// ── Attack detector (after body parsing, before routes) ───────────────────────
app.use(attackDetector);

// ── Session + Passport ────────────────────────────────────────────────────────
// Use Redis as session store when REDIS_URL is set; fall back to PostgreSQL.
const PgStore = connectPg(session);
// RedisStore imported directly from connect-redis v9 (named export)

const sessionSecret = process.env.SESSION_SECRET || "mr7-ai-dev-secret-change-in-prod";

async function buildSessionStore() {
  if (process.env.REDIS_URL) {
    try {
      // Warm up Redis so getRawIoRedis() is populated
      await getRedis();
      const raw = getRawIoRedis();
      if (raw) {
        logger.info("[session] Using Redis session store");
        // connect-redis v9 accepts an ioredis-compatible client directly
        return new RedisStore({ client: raw as ConstructorParameters<typeof RedisStore>[0]["client"] });
      }
    } catch {
      // fall through to PgStore
    }
  }
  logger.info("[session] Using PostgreSQL session store");
  return new PgStore({ pool, createTableIfMissing: true, tableName: "sessions" });
}

const sessionStore = await buildSessionStore();

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ── Unified Authentication Framework ─────────────────────────────────────────
// Mounted AFTER session + passport.session() so req.user is populated before
// the OIDC resolver (Strategy 6) tries to read Passport's session claims.
// Resolves one of 6 strategies (internal / cloudflare / api_key / jwt /
// clerk / oidc) and populates req.unifiedAuth + backward-compat req.authUser.
app.use(unifiedAuth);

// ── Auth-strategy-aware Redis rate limiter (global — all API routes) ──────────
// Applies after unifiedAuth so req.unifiedAuth.authStrategy is already resolved.
// Different quotas per strategy: internal=unlimited, cloudflare=1000, api_key=300,
// jwt=200, clerk/oidc=150, anonymous=20 (all per 60-second window).
//
// Skipped entirely in development — all Replit dev traffic arrives from the same
// reverse-proxy IP, so every unauthenticated request shares one anonymous bucket
// and the 20 req/min limit fires almost immediately during normal use.
//
// Local-engine proxy paths (/api/ollama/*, /api/local-engines/*, /api/local-proxy/*)
// and chat requests targeting the local/ngrok provider are also skipped — throttling
// them only hurts streaming inference against a self-hosted model.
const LOCAL_ENGINE_PATH_RE = /^\/(?:ollama|local-engines|local-proxy)(?:\/|$)/;
app.use("/api", authAwareRateLimit({
  skip: (req) => {
    if (isDev) return true;
    if (LOCAL_ENGINE_PATH_RE.test(req.path)) return true;
    // Skip chat/council/agent routes when the client signals local-engine routing
    const localHeader = req.headers["x-local-engine"];
    if (localHeader === "1" || localHeader === "true") return true;
    return false;
  },
}));

// ── Apply specific rate limits ────────────────────────────────────────────────
app.use(
  [
    "/api/chat",
    "/api/council",
    "/api/godmode",
    "/api/osint/url",
    "/api/osint/analyze",
    "/api/osint/email",
    "/api/osint/ip",
    "/api/osint/domain",
    "/api/osint/hash",
    "/api/osint/username",
    "/api/osint/phone",
    "/api/image",
    "/api/vision",
    "/api/agent",
    "/api/autotune",
  ],
  aiLimiter,
);
app.use(["/api/shell/exec"], shellLimiter);
app.use(["/api/subscriptions/verify", "/api/subscriptions/generate"], subscriptionLimiter);
app.use(["/api/auth/login", "/api/auth/register", "/api/email/forgot-password"], authLimiter);
app.use(["/api/upload"], uploadLimiter);

// ── CSRF token endpoint (session-based auth only) ────────────────────────────
app.get("/api/csrf-token", ensureCsrfToken, getCsrfToken);

// ── Fully public routes (health + CISA threat feed) ─────────────────────────
app.use("/api", healthRouter);
app.use("/api", cisaRouter);
// Defensive agentic control plane: simulation-only jobs and typed SSE telemetry.
app.use("/api/v1/agentic", agenticStreamRouter);

// ── OAuth routes (public — before internalAuth) ───────────────────────────────
app.use("/api", oauthRouter);

// ── Semi-public routes — providers list (read) + subscription verify ─────────
app.use("/api", providersRouter);
app.use("/api", subscriptionsRouter);

// ── Auth routes ───────────────────────────────────────────────────────────────
(async () => {
  try {
    await ensureAuthTables();
    await ensureReferralTables();
    if (process.env.REPL_ID) {
      await setupReplitAuth(app);
    }
    // Setup OAuth strategies (Google + GitHub) — non-fatal if not configured
    await setupOAuthStrategies();
  } catch (err) {
    logger.warn({ err }, "Auth setup skipped");
  }

  // Seed feature flags defaults (non-fatal)
  seedDefaultFlags().catch((err) => logger.warn({ err }, "Feature flags seed skipped"));

  // Start backup scheduler if enabled
  if (process.env.BACKUP_ENABLED === "true") {
    startBackupScheduler();
  }
})();

// ── Threat Intelligence — public read, write protected ───────────────────────
app.use("/api", threatIntelRouter);

// ── Alertmanager webhooks — internal network only, own bearer-token check ────
app.use("/api", webhooksAlertsRouter);

// ── OSINT Advanced — public scanner endpoints (Redis rate-limited) ────────────
app.use("/api/osint-advanced", osintLimiter, sensitiveToolLimiter, guardrailsMiddleware("osint-advanced"), osintAdvancedRouter);

// ── OSINT Intelligence endpoints — Redis rate-limited ─────────────────────────
app.use("/api/osint", osintLimiter, sensitiveToolLimiter, guardrailsMiddleware("osint"));
app.use("/api", osintRouter);

// ── Deep Search — comprehensive OSINT aggregator ───────────────────────────────
app.use("/api", osintLimiter, deepSearchRouter);

// ── Threat Intel Enrich / Analyze-Chain — public browser-callable endpoints ───
import threatIntelEnrichRouter from "./routes/threat-intel-enrich";
app.use("/api", osintLimiter, sensitiveToolLimiter, threatIntelEnrichRouter);

// ── AI Tools — security, cache, providers, validation ─────────────────────────
app.use("/api/ai-tools", aiToolsRouter);
app.use("/api/darkweb-intelligence", sensitiveToolLimiter, guardrailsMiddleware("darkweb-intelligence"), darkwebIntelligenceRouter);
app.use("/api/osint-intel", osintIntelRouter);
// Unified defensive intelligence — /api/intel/network, /api/intel/darkweb, /api/intel/vuln-audit, /api/intel/chain
app.use("/api", osintLimiter, intelRouter);

// ── Free OSINT routes — public browser-callable, rate-limited, no internal key ─
app.use("/api", osintLimiter, sensitiveToolLimiter, osintFreeRouter);

// ── Chat routes — public (rate-limited separately, no internalAuth needed) ────
app.use("/api", chatRouter);
app.use("/api", ecosystemRouter);

// ── Arsenal Hub — real execution engine (public — tool execution, no internalAuth) ──
import arsenalRouter from "./routes/arsenal";
app.use("/api", arsenalRouter);

// ── Blog CMS — public GET, admin POST/PATCH/DELETE protected internally ───────
app.use("/api", blogRouter);

// ── A/B Testing — public GET variant + track, admin results protected ─────────
app.use("/api", abTestsRouter);

// ── Office file export — public (no auth needed, files are ephemeral) ─────────
import officeExportRouter from "./routes/office-export";
app.use("/api", officeExportRouter);

// ── OMNI-HACK — AI Pentest Platform (18 Phases) ───────────────────────────────
import pentestOmniRouter from "./routes/pentest-omni";
app.use("/api", pentestOmniRouter);

// ── Central AI Orchestration (Function Calling) — public ──────────────────────
import orchestrateRouter from "./routes/orchestrate";
app.use("/api", orchestrateRouter);

// Serve tool-output files (generated PDFs, DOCX, XLSX, etc.)
import { join } from "path";
app.use("/api/uploads/tool-output", express.static(join(process.env.LOCAL_UPLOAD_DIR ?? "./uploads", "tool-output")));

// ── Projects (workspaces) — public by device-id ────────────────────────────
import projectsRouter from "./routes/projects";
app.use("/api", projectsRouter);
import projectVersionsRouter from "./routes/project-versions";
app.use("/api", projectVersionsRouter);
import voiceTokenRouter from "./routes/voice-token";
app.use("/api", voiceTokenRouter);

// ── Ultra-Advanced Unified System (AI Orchestrator, Sandbox, Crypto, Metrics) ─
import unifiedSystemRouter from "./interfaces/http/UnifiedSystemController";
app.use("/api/system", unifiedSystemRouter);

// ── All remaining API routes — protected by internal or authenticated access ───
// unifiedAuth is already registered globally above; internalAuth here acts as
// a thin guard that confirms the UAF resolved to the "internal" strategy.
// Cloud-chats: internal service calls only (system-to-system).
app.use("/api", internalAuth, cloudChatsRouter);
// Main router: internalAuth guard — internal services + any authenticated route
// that the individual route handlers additionally gate with requireUnifiedAuth.
app.use("/api", internalAuth, router);

// ── Global error handler — MUST be last (after all routes) ───────────────────
// Catches any error passed via next(err) or thrown in async Express 5 handlers.
// Returns a safe, sanitised response — never leaks stacks, DB messages, or paths.
app.use(globalErrorHandler);

export default app;
