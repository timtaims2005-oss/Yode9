import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
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
import { pool, ensureAuthTables } from "./db";
import { setupReplitAuth } from "./routes/auth";
import { startBackupScheduler } from "./lib/backup";
import { seedDefaultFlags } from "./lib/feature-flags";
import threatIntelRouter from "./routes/threat-intel";
import osintAdvancedRouter from "./routes/osint-advanced";
import aiToolsRouter from "./routes/ai-tools";

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
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Key", "X-MR7-Signature"],
    credentials: true,
  }),
);

// ── Rate limiters ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
  skip: (req) => req.method === "OPTIONS",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI rate limit — max 120 requests/min." },
});

const shellLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Shell rate limit — max 30 commands/min." },
});

const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Subscription rate limit — max 10 requests/min." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts — try again later." },
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Upload rate limit — max 30 uploads/min." },
});

app.use(globalLimiter);

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files (local storage)
app.use("/uploads", express.static(process.env.LOCAL_UPLOAD_DIR ?? "./uploads"));

app.use(sanitizeInputs);

// ── Attack detector (after body parsing, before routes) ───────────────────────
app.use(attackDetector);

// ── Session + Passport ────────────────────────────────────────────────────────
const PgStore = connectPg(session);

const sessionSecret = process.env.SESSION_SECRET || "mr7-ai-dev-secret-change-in-prod";

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      createTableIfMissing: true,
      tableName: "sessions",
    }),
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

// ── Apply specific rate limits ────────────────────────────────────────────────
app.use(
  [
    "/api/chat",
    "/api/council",
    "/api/godmode",
    "/api/osint/url",
    "/api/osint/analyze",
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

// ── OAuth routes (public — before internalAuth) ───────────────────────────────
app.use("/api", oauthRouter);

// ── Semi-public routes — providers list (read) + subscription verify ─────────
app.use("/api", providersRouter);
app.use("/api", subscriptionsRouter);

// ── Auth routes ───────────────────────────────────────────────────────────────
(async () => {
  try {
    await ensureAuthTables();
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

// ── OSINT Advanced — public scanner endpoints ─────────────────────────────────
app.use("/api/osint-advanced", osintAdvancedRouter);

// ── AI Tools — security, cache, providers, validation ─────────────────────────
app.use("/api/ai-tools", aiToolsRouter);

// ── All remaining API routes — protected by internalAuth ─────────────────────
app.use("/api", internalAuth, cloudChatsRouter);
app.use("/api", internalAuth, router);

export default app;
