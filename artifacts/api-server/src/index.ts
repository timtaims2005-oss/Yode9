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
}

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = createServer(app);

const wss         = new WebSocketServer({ noServer: true });
const cisaWss     = new WebSocketServer({ noServer: true });
const collabWss   = new WebSocketServer({ noServer: true });
const muxWss      = new WebSocketServer({ noServer: true });

wss.on("connection", handleTerminalSocket);

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
  } else {
    socket.destroy();
  }
});

// ── Auto-launch Llamafile on startup ──────────────────────────────────────────
async function autoLaunchLlamafile(): Promise<void> {
  const WORKSPACE = process.cwd();
  const bin = path.join(WORKSPACE, ".local-engines", "llamafile");
  if (!fs.existsSync(bin)) { logger.info("Llamafile binary not found — skip"); return; }
  try {
    const chk = await fetch("http://localhost:8081/v1/models", { signal: AbortSignal.timeout(2000) });
    if (chk.ok) { logger.info("Llamafile already running — skip"); return; }
  } catch { /* not running */ }
  try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
  const llamaProc = spawn(bin, ["--server", "--port", "8081", "--host", "0.0.0.0"], {
    detached: true, stdio: "ignore",
    env: { ...(process.env as Record<string, string>) },
  });
  llamaProc.on("error", (err) => logger.warn({ err }, "Llamafile spawn error"));
  llamaProc.unref();
  logger.info({ bin }, "Llamafile auto-launched on startup");
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

server.listen(port, (err?: Error) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");
  // Auto-launch Ollama immediately
  autoLaunchOllama().catch(e => logger.warn({ err: e }, "autoLaunchOllama error"));
  // Auto-launch Llamafile + KoboldCPP after 5s (give Ollama priority)
  setTimeout(() => {
    autoLaunchLlamafile().catch(e => logger.warn({ err: e }, "autoLaunchLlamafile error"));
    autoLaunchKobold().catch(e => logger.warn({ err: e }, "autoLaunchKobold error"));
  }, 5000);
});
