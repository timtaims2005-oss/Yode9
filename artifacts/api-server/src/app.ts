import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import router from "./routes";
import providersRouter from "./routes/providers";
import cloudChatsRouter from "./routes/cloud-chats";
import subscriptionsRouter from "./routes/subscriptions";
import { cisaRouter } from "./routes/cisa";
import { logger } from "./lib/logger";
import { validateEnv } from "./lib/env";
import { internalAuth } from "./middlewares/internalAuth";
import { pool, ensureAuthTables } from "./db";
import { setupReplitAuth } from "./routes/auth";

// Validate environment at startup — exits if critical vars missing
validateEnv();

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
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
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Key"],
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

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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

// ── AI + shell rate limits (applied before auth gate) ────────────────────────
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

// ── Fully public routes (CISA threat feed, health) ───────────────────────────
app.use("/api", cisaRouter);

// ── Semi-public routes — providers list (read) + subscription verify ─────────
// GET /providers and POST /subscriptions/verify are public so the frontend
// can show available providers and activate subscriptions without a key.
// Mutating provider routes (set-personal-url) are gated inside the router.
app.use("/api", providersRouter);
app.use("/api", subscriptionsRouter);

// ── Auth routes ───────────────────────────────────────────────────────────────
(async () => {
  try {
    await ensureAuthTables();
    if (process.env.REPL_ID) {
      await setupReplitAuth(app);
    }
  } catch (err) {
    logger.warn({ err }, "Replit Auth setup skipped");
  }
})();

// ── All remaining API routes — protected by internalAuth ─────────────────────
app.use("/api", internalAuth, cloudChatsRouter);
app.use("/api", internalAuth, router);

export default app;
