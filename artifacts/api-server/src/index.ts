import { createServer } from "http";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import app from "./app";
import { logger } from "./lib/logger";
import { handleTerminalSocket } from "./routes/shell";
import { registerCisaWsClient } from "./routes/cisa";
import { handleCollabSocket } from "./routes/collab";
import { handleMuxSocket } from "./routes/mux";
import { initializeTelemetry } from "./infrastructure/observability/OpenTelemetryConfig";
import { setupMetricsWebSocket } from "./interfaces/ws/MetricsWebSocket";
import { handleVoiceSocket } from "./interfaces/ws/VoiceWebSocket";
import { verifyVoiceToken } from "./lib/voice-token";
import { shutdownQueue } from "./lib/queue.js";

// ── Initialize OpenTelemetry (must be before app logic) ───────────────────────
initializeTelemetry();

// ── Auto-launch Ollama on startup ─────────────────────────────────────────────
async function autoLaunchOllama(): Promise<void> {
  if (process.env["AUTO_LAUNCH_OLLAMA"] === "false") return;

  // Try multiple possible locations — api-server cwd vs workspace root
  const WORKSPACE = process.cwd();
  const candidates = [
    path.join(WORKSPACE, ".ollama-bin", "ollama"),
    path.join(WORKSPACE, "..", "..", ".ollama-bin", "ollama"),
    "/home/runner/workspace/.ollama-bin/ollama",
    "/home/runner/.ollama-bin/ollama",
  ];
  const binWS  = candidates[0];
  const binH   = "/home/runner/workspace/.ollama-bin/ollama";
  const bin    = candidates.find(p => fs.existsSync(p)) ?? null;

  if (!bin) {
    logger.info("Ollama binary not found — skipping auto-launch");
    return;
  }

  // Check if already running
  try {
    const chk = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("Ollama already running — skip auto-launch"); return; }
  } catch { /* not running */ }

  const libDir = path.join(WORKSPACE, ".ollama-bin", "lib", "ollama");
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    HOME: "/home/runner",
    OLLAMA_MODELS: "/home/runner/.ollama/models",
    OLLAMA_ORIGINS: "*",
  };
  if (fs.existsSync(libDir)) env["OLLAMA_LIBRARY_PATH"] = libDir;

  spawn(bin, ["serve"], { detached: true, stdio: "ignore", env }).unref();
  logger.info({ bin }, "Ollama auto-launched on startup");
  console.log("Ollama auto-started");
}

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = createServer(app);

const wss         = new WebSocketServer({ noServer: true });
const cisaWss     = new WebSocketServer({ noServer: true });
const collabWss   = new WebSocketServer({ noServer: true });
const muxWss      = new WebSocketServer({ noServer: true });
const metricsWss  = new WebSocketServer({ noServer: true });
const voiceWss = new WebSocketServer({ noServer: true });

// Per-device/IP rate-limit buckets for the voice WebSocket endpoint
const voiceRateBuckets = new Map<string, { count: number; windowStart: number }>();

// ── Wire WebSocket handlers ───────────────────────────────────────────────────
wss.on("connection", handleTerminalSocket);
setupMetricsWebSocket(metricsWss);
voiceWss.on("connection", (ws) => { handleVoiceSocket(ws); });

cisaWss.on("connection", (ws) => {
  registerCisaWsClient(ws);
});

collabWss.on("connection", (ws) => {
  handleCollabSocket(ws);
});

muxWss.on("connection", (ws) => {
  handleMuxSocket(ws);
});

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  if (url.startsWith("/api/terminal")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/cisa-live")) {
    cisaWss.handleUpgrade(req, socket, head, (ws) => {
      cisaWss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/collab")) {
    collabWss.handleUpgrade(req, socket, head, (ws) => {
      collabWss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/mux")) {
    muxWss.handleUpgrade(req, socket, head, (ws) => {
      muxWss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/ws/metrics") || url.startsWith("/api/ws/metrics")) {
    metricsWss.handleUpgrade(req, socket, head, (ws) => {
      metricsWss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/voice-live")) {
    const urlParams = new URLSearchParams((req.url ?? "").split("?")[1] ?? "");
    const rawToken  = urlParams.get("token") ?? "";
    const verification = verifyVoiceToken(rawToken);
    if (!verification.ok) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nWWW-Authenticate: Bearer realm=\"voice-live\"\r\n\r\n");
      socket.destroy();
      return;
    }
    const voiceRateKey = `vid:${verification.id}`;
    const now = Date.now();
    const VOICE_WINDOW_MS = 60_000; const VOICE_MAX_PER_WINDOW = 5;
    if (!voiceRateBuckets.has(voiceRateKey)) voiceRateBuckets.set(voiceRateKey, { count: 0, windowStart: now });
    const bucket = voiceRateBuckets.get(voiceRateKey)!;
    if (now - bucket.windowStart > VOICE_WINDOW_MS) { bucket.count = 0; bucket.windowStart = now; }
    if (bucket.count >= VOICE_MAX_PER_WINDOW) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nContent-Length: 0\r\n\r\n");
      socket.destroy(); return;
    }
    bucket.count += 1;
    voiceWss.handleUpgrade(req, socket, head, (ws) => { voiceWss.emit("connection", ws, req); });
  } else {
    socket.destroy();
  }
});

// ── Auto-launch Llamafile on startup ──────────────────────────────────────────
async function autoLaunchLlamafile(): Promise<void> {
  const WORKSPACE = process.cwd();
  // Check HOME_BIN_DIR first (new install path), fall back to workspace-relative
  const candidates = [
    path.join(HOME_BIN_DIR, "llamafile"),
    path.join(WORKSPACE, ".local-engines", "llamafile"),
  ];
  const bin = candidates.find(p => fs.existsSync(p)) ?? null;
  if (!bin) { logger.info("Llamafile binary not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:8081/v1/models", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("Llamafile already running — skip"); return; }
  } catch { /* not running */ }
  try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
  const modelPath = path.join(HOME_BIN_DIR, "phi3.llamafile");
  const args = fs.existsSync(modelPath)
    ? ["--model", modelPath, "--port", "8081", "--host", "0.0.0.0", "--nobrowser"]
    : ["--server", "--port", "8081", "--host", "0.0.0.0"];
  const llamaProc = spawn(bin, args, {
    detached: true, stdio: "ignore",
    env: { ...(process.env as Record<string, string>) },
  });
  llamaProc.on("error", (err) => logger.warn({ err }, "Llamafile spawn error"));
  llamaProc.unref();
  logger.info({ bin }, "Llamafile auto-launched on startup (port 8081)");
}

// ── Auto-launch KoboldCPP on startup ─────────────────────────────────────────
async function autoLaunchKobold(): Promise<void> {
  const WORKSPACE = process.cwd();
  const pyScript = path.join(WORKSPACE, ".local-engines", "koboldcpp", "koboldcpp.py");
  if (!fs.existsSync(pyScript)) { logger.info("KoboldCPP not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:5001/api/v1/model", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("KoboldCPP already running — skip"); return; }
  } catch { /* not running */ }
  const koboldProc = spawn("python3", [pyScript, "--port", "5001", "--host", "0.0.0.0", "--skiplauncher"], {
    detached: true, stdio: "ignore",
    cwd: path.dirname(pyScript),
    env: { ...(process.env as Record<string, string>) },
  });
  koboldProc.on("error", (err) => logger.warn({ err }, "KoboldCPP spawn error — python3 may be unavailable"));
  koboldProc.unref();
  logger.info({ pyScript }, "KoboldCPP auto-launched on startup");
}

const HOME_BIN_DIR = "/home/runner/.local-engines";

// ── Auto-launch llama.cpp server on startup ───────────────────────────────────
async function autoLaunchLlamaCpp(): Promise<void> {
  const bin = path.join(HOME_BIN_DIR, "llama-server");
  if (!fs.existsSync(bin)) { logger.info("llama-server not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:8082/v1/models", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("llama.cpp already running — skip"); return; }
  } catch { /* not running */ }
  try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
  const proc = spawn(bin, ["--port", "8082", "--host", "0.0.0.0"], {
    detached: true, stdio: "ignore",
    env: { ...(process.env as Record<string, string>) },
  });
  proc.on("error", (err) => logger.warn({ err }, "llama.cpp spawn error"));
  proc.unref();
  logger.info({ bin }, "llama.cpp auto-launched on startup (port 8082)");
}

// ── Auto-launch Nitro on startup ──────────────────────────────────────────────
async function autoLaunchNitro(): Promise<void> {
  const bin = path.join(HOME_BIN_DIR, "nitro");
  if (!fs.existsSync(bin)) { logger.info("Nitro not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:3928/v1/models", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("Nitro already running — skip"); return; }
  } catch { /* not running */ }
  try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
  const proc = spawn(bin, [], {
    detached: true, stdio: "ignore",
    env: { ...(process.env as Record<string, string>), PORT: "3928", HOST: "0.0.0.0" },
  });
  proc.on("error", (err) => logger.warn({ err }, "Nitro spawn error"));
  proc.unref();
  logger.info({ bin }, "Nitro auto-launched on startup (port 3928)");
}

// ── Auto-launch LocalAI on startup ────────────────────────────────────────────
async function autoLaunchLocalAI(): Promise<void> {
  const bin = path.join(HOME_BIN_DIR, "local-ai");
  if (!fs.existsSync(bin)) { logger.info("LocalAI not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:8083/v1/models", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("LocalAI already running — skip"); return; }
  } catch { /* not running */ }
  try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
  const proc = spawn(bin, ["--address", "0.0.0.0:8083"], {
    detached: true, stdio: "ignore",
    env: { ...(process.env as Record<string, string>) },
  });
  proc.on("error", (err) => logger.warn({ err }, "LocalAI spawn error"));
  proc.unref();
  logger.info({ bin }, "LocalAI auto-launched on startup (port 8083)");
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
let _shuttingDown = false;
async function gracefulShutdown(signal: string): Promise<void> {
  if (_shuttingDown) return;
  _shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  // Stop accepting new HTTP connections
  server.close();

  // Drain BullMQ workers and queues
  try {
    await shutdownQueue();
  } catch (err) {
    logger.warn({ err }, "Queue shutdown error");
  }

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

process.once("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.once("SIGINT",  () => { void gracefulShutdown("SIGINT"); });

server.listen(port, (err?: Error) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");

  // ── Cloudflare env-var diagnostic ──────────────────────────────────────────
  const cfToken   = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  // Log only boolean presence — never lengths, never values
  logger.info(
    {
      CLOUDFLARE_API_TOKEN_set:  !!cfToken   && cfToken.trim()   !== "",
      CLOUDFLARE_ACCOUNT_ID_set: !!cfAccount && cfAccount.trim() !== "",
    },
    "[env-check] Cloudflare credentials at runtime"
  );
  // ───────────────────────────────────────────────────────────────────────────
  // Auto-launch Ollama immediately
  autoLaunchOllama().catch(e => logger.warn({ err: e }, "autoLaunchOllama error"));
  // Auto-launch all other engines after 5s (give Ollama priority)
  setTimeout(() => {
    autoLaunchLlamafile().catch(e => logger.warn({ err: e }, "autoLaunchLlamafile error"));
    autoLaunchKobold().catch(e => logger.warn({ err: e }, "autoLaunchKobold error"));
    autoLaunchLlamaCpp().catch(e => logger.warn({ err: e }, "autoLaunchLlamaCpp error"));
    autoLaunchNitro().catch(e => logger.warn({ err: e }, "autoLaunchNitro error"));
    autoLaunchLocalAI().catch(e => logger.warn({ err: e }, "autoLaunchLocalAI error"));
  }, 5000);
});
