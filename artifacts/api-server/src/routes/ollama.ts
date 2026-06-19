import { Router } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";

// Workspace-persistent binary (survives container restarts)
const OLLAMA_BIN_WORKSPACE = path.join(process.cwd(), ".ollama-bin", "ollama");
const OLLAMA_BIN_HOME      = "/home/runner/.ollama-bin/ollama";
const OLLAMA_BIN = process.env.OLLAMA_BIN ||
  (fs.existsSync(OLLAMA_BIN_WORKSPACE) ? OLLAMA_BIN_WORKSPACE : OLLAMA_BIN_HOME);

async function ollamaFetch(endpoint: string, options?: RequestInit) {
  const url = `${OLLAMA_BASE}${endpoint}`;
  const res  = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  return res;
}

function isOllamaRunning(): Promise<boolean> {
  return ollamaFetch("/api/tags")
    .then(r => r.ok)
    .catch(() => false);
}

function getBin(): string {
  if (fs.existsSync(OLLAMA_BIN_WORKSPACE)) return OLLAMA_BIN_WORKSPACE;
  if (fs.existsSync(OLLAMA_BIN_HOME))      return OLLAMA_BIN_HOME;
  return OLLAMA_BIN;
}

const OLLAMA_LIB_PATH = path.join(process.cwd(), ".ollama-bin", "lib", "ollama");

function startDaemon() {
  const bin = getBin();
  if (!fs.existsSync(bin)) return false;
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    HOME: "/home/runner",
    OLLAMA_MODELS: "/home/runner/.ollama/models",
  };
  if (fs.existsSync(OLLAMA_LIB_PATH)) {
    env.OLLAMA_LIBRARY_PATH = OLLAMA_LIB_PATH;
  }
  spawn(bin, ["serve"], {
    detached: true, stdio: "ignore",
    env,
  }).unref();
  return true;
}

router.get("/ollama/status", async (_req, res) => {
  try {
    const running = await isOllamaRunning();
    const binExists = fs.existsSync(getBin());
    const dlLog = fs.existsSync("/tmp/ollama-dl.log")
      ? fs.readFileSync("/tmp/ollama-dl.log", "utf8").split("\n").filter(Boolean).slice(-3).join(" | ")
      : null;
    if (!running) return res.json({ running: false, models: [], version: null, binExists, dlLog });
    const [tagsRes, versionRes] = await Promise.all([
      ollamaFetch("/api/tags"),
      ollamaFetch("/api/version"),
    ]);
    const tags    = await tagsRes.json() as { models?: unknown[] };
    const version = await versionRes.json() as { version?: string };
    return res.json({
      running: true, models: tags.models ?? [],
      version: version.version ?? null, binExists, dlLog: null,
    });
  } catch {
    return res.json({ running: false, models: [], version: null, binExists: false, dlLog: null });
  }
});

router.get("/ollama/models", async (_req, res) => {
  try {
    const r = await ollamaFetch("/api/tags");
    if (!r.ok) return res.status(503).json({ error: "Ollama not available" });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama offline" });
  }
});

router.get("/ollama/ps", async (_req, res) => {
  try {
    const r = await ollamaFetch("/api/ps");
    if (!r.ok) return res.json({ models: [] });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.json({ models: [] });
  }
});

router.get("/ollama/show/:model", async (req, res) => {
  const { model } = req.params;
  try {
    const r = await ollamaFetch("/api/show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    if (!r.ok) return res.status(503).json({ error: "Ollama not available" });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama offline" });
  }
});

// SSE pull with live progress
router.post("/ollama/pull", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  const { model } = req.body as { model?: string };
  if (!model) { res.write(`data: ${JSON.stringify({ error: "model required" })}\n\n`); res.end(); return; }
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: true }),
      signal: AbortSignal.timeout(600_000),
    });
    if (!r.body) { res.write(`data: ${JSON.stringify({ error: "no body" })}\n\n`); res.end(); return; }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try { const d = JSON.parse(line); res.write(`data: ${JSON.stringify(d)}\n\n`); } catch { /* skip */ }
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/ollama/delete", async (req, res) => {
  const { model } = req.body as { model?: string };
  if (!model) return res.status(400).json({ error: "model required" });
  try {
    await ollamaFetch("/api/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed" });
  }
});

// Streaming chat via SSE
router.post("/ollama/chat/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  const { model, messages } = req.body as { model: string; messages: unknown[] };
  if (!model || !messages) {
    res.write(`data: ${JSON.stringify({ error: "model+messages required" })}\n\n`);
    res.end(); return;
  }
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.body) { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); return; }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(Boolean);
      for (const line of lines) {
        try { const d = JSON.parse(line); res.write(`data: ${JSON.stringify(d)}\n\n`); } catch { /* skip */ }
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/ollama/chat", async (req, res) => {
  const { model, messages } = req.body as { model: string; messages: unknown[] };
  if (!model || !messages) return res.status(400).json({ error: "model+messages required" });
  try {
    const r = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    const data = await r.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/ollama/generate", async (req, res) => {
  const { model, prompt } = req.body as { model: string; prompt: string };
  try {
    const r = await ollamaFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    const data = await r.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/ollama/start", async (_req, res) => {
  if (await isOllamaRunning()) return res.json({ ok: true, already: true });
  const started = startDaemon();
  if (!started) return res.status(404).json({ ok: false, error: "Ollama binary not found. Use /install first." });
  await new Promise(r => setTimeout(r, 3000));
  const nowRunning = await isOllamaRunning();
  return res.json({ ok: nowRunning, started: true });
});

// SSE install with live log
router.post("/ollama/install", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const send = (msg: string) => res.write(`data: ${JSON.stringify({ msg })}\n\n`);

  if (await isOllamaRunning()) {
    send("Ollama is already running!");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end(); return;
  }

  const bin = getBin();
  if (fs.existsSync(bin)) {
    send("Binary found — starting Ollama...");
    startDaemon();
    await new Promise(r => setTimeout(r, 3000));
    const running = await isOllamaRunning();
    send(running ? "Ollama is running on :11434!" : "Server didn't respond. Check logs.");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end(); return;
  }

  try {
    const INSTALL_DIR = path.join(process.cwd(), ".ollama-bin");
    await execAsync(`mkdir -p "${INSTALL_DIR}"`, { timeout: 5_000 });
    send("Downloading Ollama v0.30.10 (~1.3GB — this takes a few minutes)...");

    const VERSION = "v0.30.10";
    const URL = `https://github.com/ollama/ollama/releases/download/${VERSION}/ollama-linux-amd64.tar.zst`;
    const TMP = `/tmp/ollama-install-${Date.now()}`;
    await execAsync(`mkdir -p "${TMP}"`, { timeout: 5_000 });

    await execAsync(`curl -fL --retry 3 "${URL}" -o "${TMP}/ollama.tar.zst"`, { timeout: 600_000 });
    send("Extracting binary...");
    await execAsync(`cd "${TMP}" && mkdir -p extract && tar --use-compress-program=zstd -xf ollama.tar.zst --wildcards 'bin/ollama' -C extract 2>/dev/null; true`, { timeout: 120_000 });

    const { stdout } = await execAsync(`find "${TMP}/extract" -name "ollama" -type f 2>/dev/null | head -1`);
    const found = stdout.trim();
    if (!found) throw new Error("Binary not found inside archive");

    const dest = path.join(INSTALL_DIR, "ollama");
    await execAsync(`cp "${found}" "${dest}" && chmod +x "${dest}" && rm -rf "${TMP}"`);
    send("Ollama installed to workspace (persistent)!");

    send("Starting Ollama server...");
    startDaemon();
    await new Promise(r => setTimeout(r, 3500));
    const running = await isOllamaRunning();
    send(running ? "Ollama is running on :11434!" : "Started — may need a few more seconds.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    send(`Install failed: ${msg}`);
    send("Tip: Use Hugging Face Spaces tab for 24/7 GPU-powered models.");
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// Background download status
router.get("/ollama/dl-status", (_req, res) => {
  try {
    const log = fs.existsSync("/tmp/ollama-dl.log")
      ? fs.readFileSync("/tmp/ollama-dl.log", "utf8")
      : "";
    const lines = log.split("\n").filter(Boolean);
    const done  = lines.some(l => l === "DONE");
    const binExists = fs.existsSync(path.join(process.cwd(), ".ollama-bin", "ollama"));
    return res.json({ done, binExists, log: lines.slice(-5).join("\n") });
  } catch {
    return res.json({ done: false, binExists: false, log: "" });
  }
});

export default router;
