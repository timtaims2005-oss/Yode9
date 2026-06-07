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
import { logger } from "./lib/logger";
import { internalAuth } from "./middlewares/internalAuth";
import { pool, ensureAuthTables } from "./db";
import { setupReplitAuth } from "./routes/auth";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Key"],
    credentials: true,
  }),
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
  skip: (req) => req.method === "OPTIONS",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI rate limit — max 30 requests/min." },
});

const shellLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Shell rate limit — max 10 commands/min." },
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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Session + Passport ───────────────────────────────────────────────────────
const PgStore = connectPg(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mr7-ai-dev-secret-change-in-prod",
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ── Rate limits ──────────────────────────────────────────────────────────────
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

// ── Public routes (no internalAuth gate) ────────────────────────────────────
app.use("/api", providersRouter);
app.use("/api", cloudChatsRouter);

// ── Auth routes (no internalAuth gate) ──────────────────────────────────────
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

app.use("/api", internalAuth, router);

export default app;
