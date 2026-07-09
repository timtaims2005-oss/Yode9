import { Router } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

const ENGINES = [
  { id: "ollama",         label: "Ollama",         port: 11434, base: "http://localhost:11434", apiPath: "/api/tags",    modelsKey: "models", idKey: "name",  canInstall: true  },
  { id: "lmstudio",      label: "LM Studio",      port: 1234,  base: "http://localhost:1234",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "jan",           label: "Jan",             port: 1337,  base: "http://localhost:1337",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "textgenwebui",  label: "text-gen-webui",  port: 5000,  base: "http://localhost:5000",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "gpt4all",       label: "GPT4All",         port: 4891,  base: "http://localhost:4891",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "llamafile",     label: "Llamafile",       port: 8081,  base: "http://localhost:8081",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: true  },
  { id: "kobold",        label: "KoboldCPP",       port: 5001,  base: "http://localhost:5001",  apiPath: "/api/v1/model",modelsKey: null,     idKey: "result",canInstall: true  },
  // ── New engines added July 2026 ──────────────────────────────────────────────
  { id: "llamacpp",      label: "llama.cpp",       port: 8082,  base: "http://localhost:8082",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: true  },
  { id: "nitro",         label: "Nitro",           port: 3928,  base: "http://localhost:3928",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: true  },
  { id: "localai",       label: "LocalAI",         port: 8083,  base: "http://localhost:8083",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: true  },
] as const;

type EngineId = typeof ENGINES[number]["id"];

interface EngineStatus {
  id: EngineId;
  label: string;
  port: number;
  online: boolean;
  latencyMs: number | null;
  models: string[];
  version: string | null;
  canInstall: boolean;
  installAvailable: boolean;
}

const WORKSPACE    = process.cwd();
const BIN_DIR      = path.join(WORKSPACE, ".local-engines");
const HOME_BIN_DIR = "/home/runner/.local-engines";

async function pingEngine(eng: typeof ENGINES[number]): Promise<EngineStatus> {
  const t0 = Date.now();
  try {
    const resp = await fetch(`${eng.base}${eng.apiPath}`, { signal: AbortSignal.timeout(3000) });
    const latencyMs = Date.now() - t0;

    if (!resp.ok) return base(eng, false, latencyMs, [], null);

    let models: string[] = [];
    let version: string | null = null;

    if (eng.id === "ollama") {
      const data = await resp.json() as { models?: { name: string }[] };
      models = (data.models ?? []).map(m => m.name);
      try {
        const vr = await fetch(`${eng.base}/api/version`, { signal: AbortSignal.timeout(2000) });
        if (vr.ok) { const vd = await vr.json() as { version?: string }; version = vd.version ?? null; }
      } catch { /* ignore */ }
    } else if (eng.id === "kobold") {
      const data = await resp.json() as { result?: string };
      models = data.result ? [data.result] : [];
    } else {
      const data = await resp.json() as Record<string, unknown>;
      const arr = (eng.modelsKey ? data[eng.modelsKey] : []) as Array<Record<string,unknown>>;
      if (Array.isArray(arr)) {
        models = arr.map(m => String(m[eng.idKey] ?? "")).filter(Boolean);
      }
    }

    return base(eng, true, latencyMs, models, version);
  } catch {
    return base(eng, false, null, [], null);
  }
}

function base(eng: typeof ENGINES[number], online: boolean, latencyMs: number | null, models: string[], version: string | null): EngineStatus {
  return {
    id: eng.id, label: eng.label, port: eng.port, online, latencyMs, models, version,
    canInstall: eng.canInstall,
    installAvailable: checkInstallAvailable(eng.id),
  };
}

function checkInstallAvailable(id: EngineId): boolean {
  if (id === "ollama") {
    const candidates = [
      path.join(WORKSPACE, ".ollama-bin", "ollama"),
      path.join(WORKSPACE, "..", "..", ".ollama-bin", "ollama"),
      "/home/runner/workspace/.ollama-bin/ollama",
    ];
    return candidates.some(p => fs.existsSync(p));
  }
  if (id === "llamafile") {
    return fs.existsSync(path.join(HOME_BIN_DIR, "llamafile")) ||
           fs.existsSync(path.join(BIN_DIR, "llamafile"));
  }
  if (id === "kobold") {
    return fs.existsSync(path.join(BIN_DIR, "koboldcpp", "koboldcpp.py")) ||
           fs.existsSync(path.join(BIN_DIR, "koboldcpp"));
  }
  if (id === "llamacpp") {
    return fs.existsSync(path.join(HOME_BIN_DIR, "llama-server")) ||
           fs.existsSync(path.join(BIN_DIR, "llama-server"));
  }
  if (id === "nitro") {
    return fs.existsSync(path.join(HOME_BIN_DIR, "nitro")) ||
           fs.existsSync(path.join(BIN_DIR, "nitro"));
  }
  if (id === "localai") {
    return fs.existsSync(path.join(HOME_BIN_DIR, "local-ai")) ||
           fs.existsSync(path.join(BIN_DIR, "local-ai"));
  }
  return false;
}

// ── Phi-3 model download status (checks file size vs expected) ────────────────
router.get("/local-engines/phi3-status", (_req, res) => {
  const modelPath   = path.join(HOME_BIN_DIR, "phi3.llamafile");
  const EXPECTED_SZ = 2_600_000_000; // ~2.4 GB
  if (!fs.existsSync(modelPath)) {
    return res.json({ status: "idle", pct: null, sizeBytes: 0 });
  }
  const { size } = fs.statSync(modelPath);
  if (size >= EXPECTED_SZ * 0.98) {
    return res.json({ status: "done", pct: 100, sizeBytes: size });
  }
  const pct = Math.round((size / EXPECTED_SZ) * 100);
  return res.json({ status: "downloading", pct, sizeBytes: size });
});

// ── Download Phi-3 model for Llamafile (single-flight guard) ─────────────────
let phi3DownloadActive = false;

router.post("/local-engines/llamafile-model", (_req, res): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  if (!fs.existsSync(HOME_BIN_DIR)) fs.mkdirSync(HOME_BIN_DIR, { recursive: true });
  const outPath   = path.join(HOME_BIN_DIR, "phi3.llamafile");
  const tmpPath   = path.join(HOME_BIN_DIR, "phi3.llamafile.tmp");
  const dlUrl     = "https://huggingface.co/Mozilla/Phi-3-mini-4k-instruct-llamafile/resolve/main/Phi-3-mini-4k-instruct.Q4_K_M.llamafile";
  const EXPECTED  = 2_600_000_000;

  // Already complete
  if (fs.existsSync(outPath) && fs.statSync(outPath).size >= EXPECTED * 0.98) {
    send({ type: "success", message: "Phi-3 already installed ✓", pct: 100 });
    res.end(); return;
  }

  // Single-flight guard — return live progress to concurrent callers
  if (phi3DownloadActive) {
    send({ type: "start", message: "تحميل Phi-3 جارٍ بالفعل — انتظر...", pct: 0 });
    const poll = setInterval(() => {
      const path_ = fs.existsSync(tmpPath) ? tmpPath : outPath;
      if (fs.existsSync(path_)) {
        const { size } = fs.statSync(path_);
        const pct = Math.min(Math.round((size / EXPECTED) * 100), 99);
        send({ type: "progress", message: `جارٍ التحميل... ${Math.round(size/1e6)}MB`, pct });
        if (!phi3DownloadActive) {
          clearInterval(poll);
          const done = fs.existsSync(outPath) && fs.statSync(outPath).size >= EXPECTED * 0.98;
          send(done ? { type: "success", message: "Phi-3 مثبّت ✓", pct: 100 } : { type: "error", message: "فشل التحميل" });
          res.end();
        }
      }
    }, 3000);
    return;
  }

  phi3DownloadActive = true;
  send({ type: "start", message: "جارٍ تحميل Phi-3-mini-4k (2.4GB)...", pct: 0 });

  // Download to tmp file then rename for atomicity
  const proc = spawn("bash", ["-c",
    `curl -L --max-time 3600 -C - -o "${tmpPath}" "${dlUrl}" 2>&1`
  ], { stdio: ["ignore", "pipe", "pipe"] });

  const progressInterval = setInterval(() => {
    if (fs.existsSync(tmpPath)) {
      const { size } = fs.statSync(tmpPath);
      const pct = Math.min(Math.round((size / EXPECTED) * 100), 99);
      send({ type: "progress", message: `جارٍ التحميل... ${Math.round(size/1e6)}MB / ~2400MB`, pct });
    }
  }, 3000);

  proc.on("close", (code) => {
    clearInterval(progressInterval);
    phi3DownloadActive = false;
    if (code !== 0 && code !== null) {
      send({ type: "error", message: `فشل التحميل (exit ${code})` });
      res.end(); return;
    }
    if (fs.existsSync(tmpPath)) {
      const { size } = fs.statSync(tmpPath);
      if (size >= EXPECTED * 0.98) {
        fs.renameSync(tmpPath, outPath); // atomic rename
        send({ type: "success", message: "Phi-3-mini مثبّت ✓", pct: 100 });
      } else {
        send({ type: "error", message: `تحميل غير مكتمل (${Math.round(size/1e6)}MB)` });
      }
    } else {
      send({ type: "error", message: "الملف غير موجود بعد التحميل" });
    }
    res.end();
  });

  proc.on("error", (err) => {
    clearInterval(progressInterval);
    phi3DownloadActive = false;
    send({ type: "error", message: String(err) });
    res.end();
  });
});

router.get("/local-engines/status", async (_req, res) => {
  const results = await Promise.all(ENGINES.map(pingEngine));
  return res.json({ engines: results, ts: Date.now() });
});

router.get("/local-engines/status/:id", async (req, res) => {
  const eng = ENGINES.find(e => e.id === req.params.id);
  if (!eng) return res.status(404).json({ error: "Unknown engine" });
  const result = await pingEngine(eng);
  return res.json(result);
});

router.post("/local-engines/launch/:id", (req, res): void => {
  const id = req.params.id as EngineId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: "start", message: `Launching ${id}...` });

  if (id === "ollama") {
    const candidates = [
      path.join(WORKSPACE, ".ollama-bin", "ollama"),
      path.join(WORKSPACE, "..", "..", ".ollama-bin", "ollama"),
      "/home/runner/workspace/.ollama-bin/ollama",
      "/home/runner/.ollama-bin/ollama",
    ];
    const bin    = candidates.find(p => fs.existsSync(p)) ?? null;
    const libDir = bin ? path.join(path.dirname(bin), "lib", "ollama") : "";

    if (!bin) {
      send({ type: "error", message: "Ollama binary not found. Please install first." });
      res.end();
      return;
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      HOME: "/home/runner",
      OLLAMA_MODELS: "/home/runner/.ollama/models",
    };
    if (fs.existsSync(libDir)) env.OLLAMA_LIBRARY_PATH = libDir;

    spawn(bin, ["serve"], { detached: true, stdio: "ignore", env }).unref();
    send({ type: "log", message: "Ollama daemon spawned" });

    let tries = 0;
    const check = setInterval(async () => {
      tries++;
      try {
        const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          clearInterval(check);
          send({ type: "success", message: "Ollama is online ✓" });
          res.end();
        }
      } catch { /* waiting */ }
      if (tries >= 20) {
        clearInterval(check);
        send({ type: "error", message: "Ollama did not respond in 20s" });
        res.end();
      }
    }, 1000);
    return;
  }

  if (id === "llamafile") {
    const llamaBin = fs.existsSync(path.join(HOME_BIN_DIR, "llamafile"))
      ? path.join(HOME_BIN_DIR, "llamafile")
      : path.join(BIN_DIR, "llamafile");
    if (!fs.existsSync(llamaBin)) {
      send({ type: "error", message: "Llamafile binary not found. Use install first." });
      res.end();
      return;
    }
    try {
      try { fs.chmodSync(llamaBin, 0o755); } catch { /* ignore */ }
      const modelPath = path.join(HOME_BIN_DIR, "phi3.llamafile");
      const args = fs.existsSync(modelPath)
        ? ["--model", modelPath, "--port", "8081", "--host", "0.0.0.0", "--nobrowser"]
        : ["--server", "--port", "8081", "--host", "0.0.0.0"];
      spawn(llamaBin, args, {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "Llamafile server starting on port 8081..." });
      setTimeout(() => { send({ type: "success", message: "Llamafile launched ✓" }); res.end(); }, 3000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "llamacpp") {
    const bin = fs.existsSync(path.join(HOME_BIN_DIR, "llama-server"))
      ? path.join(HOME_BIN_DIR, "llama-server")
      : path.join(BIN_DIR, "llama-server");
    if (!fs.existsSync(bin)) {
      send({ type: "error", message: "llama-server binary not found. Use install first." });
      res.end();
      return;
    }
    try {
      try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
      spawn(bin, ["--port", "8082", "--host", "0.0.0.0"], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "llama.cpp server starting on port 8082..." });
      let tries = 0;
      const check = setInterval(async () => {
        tries++;
        try {
          const r = await fetch("http://localhost:8082/v1/models", { signal: AbortSignal.timeout(2000) });
          if (r.ok) { clearInterval(check); send({ type: "success", message: "llama.cpp is online ✓" }); res.end(); }
        } catch { /* waiting */ }
        if (tries >= 15) { clearInterval(check); send({ type: "success", message: "llama.cpp launched ✓ (no model loaded yet)" }); res.end(); }
      }, 1000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "nitro") {
    const bin = fs.existsSync(path.join(HOME_BIN_DIR, "nitro"))
      ? path.join(HOME_BIN_DIR, "nitro")
      : path.join(BIN_DIR, "nitro");
    if (!fs.existsSync(bin)) {
      send({ type: "error", message: "Nitro binary not found. Use install first." });
      res.end();
      return;
    }
    try {
      try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
      spawn(bin, [], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string>, PORT: "3928", HOST: "0.0.0.0" }
      }).unref();
      send({ type: "log", message: "Nitro starting on port 3928..." });
      let tries = 0;
      const check = setInterval(async () => {
        tries++;
        try {
          const r = await fetch("http://localhost:3928/v1/models", { signal: AbortSignal.timeout(2000) });
          if (r.ok) { clearInterval(check); send({ type: "success", message: "Nitro is online ✓" }); res.end(); }
        } catch { /* waiting */ }
        if (tries >= 15) { clearInterval(check); send({ type: "success", message: "Nitro launched ✓" }); res.end(); }
      }, 1000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "localai") {
    const bin = fs.existsSync(path.join(HOME_BIN_DIR, "local-ai"))
      ? path.join(HOME_BIN_DIR, "local-ai")
      : path.join(BIN_DIR, "local-ai");
    if (!fs.existsSync(bin)) {
      send({ type: "error", message: "LocalAI binary not found. Use install first." });
      res.end();
      return;
    }
    try {
      try { fs.chmodSync(bin, 0o755); } catch { /* ignore */ }
      spawn(bin, ["--address", "0.0.0.0:8083"], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "LocalAI starting on port 8083..." });
      let tries = 0;
      const check = setInterval(async () => {
        tries++;
        try {
          const r = await fetch("http://localhost:8083/v1/models", { signal: AbortSignal.timeout(2000) });
          if (r.ok) { clearInterval(check); send({ type: "success", message: "LocalAI is online ✓" }); res.end(); }
        } catch { /* waiting */ }
        if (tries >= 20) { clearInterval(check); send({ type: "success", message: "LocalAI launched ✓" }); res.end(); }
      }, 1000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "kobold") {
    const koboldDir = path.join(BIN_DIR, "koboldcpp");
    const pyScript  = path.join(koboldDir, "koboldcpp.py");
    if (!fs.existsSync(pyScript)) {
      send({ type: "error", message: "KoboldCPP not found. Use install first." });
      res.end();
      return;
    }
    try {
      spawn("python3", [pyScript, "--port", "5001", "--host", "0.0.0.0", "--skiplauncher"], {
        detached: true, stdio: "ignore", cwd: koboldDir,
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "KoboldCPP starting on port 5001..." });
      setTimeout(() => { send({ type: "success", message: "KoboldCPP launched ✓" }); res.end(); }, 4000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if ((id as string) === "openwebui") {
    try {
      const proc = spawn("bash", ["-c", "python3 -m open_webui serve --port 3000 --host 0.0.0.0"], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      });
      proc.unref();
      send({ type: "log", message: "Open WebUI starting on port 3000..." });
      setTimeout(() => { send({ type: "success", message: "Open WebUI launched ✓" }); res.end(); }, 5000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "lmstudio") {
    const candidates = [
      `${process.env["HOME"] ?? "/home/runner"}/.local/bin/lmstudio`,
      "/usr/bin/lmstudio",
      "/opt/lm-studio/lmstudio",
      "/opt/lmstudio/lmstudio",
    ];
    const bin = candidates.find(p => fs.existsSync(p)) ?? null;
    if (bin) {
      try {
        spawn(bin, [], { detached: true, stdio: "ignore" }).unref();
        send({ type: "log", message: "LM Studio launched — enable Local Server on port 1234" });
        let tries = 0;
        const check = setInterval(async () => {
          tries++;
          try {
            const r = await fetch("http://localhost:1234/v1/models", { signal: AbortSignal.timeout(2000) });
            if (r.ok) { clearInterval(check); send({ type: "success", message: "LM Studio is online ✓" }); res.end(); }
          } catch { /* waiting */ }
          if (tries >= 20) { clearInterval(check); send({ type: "info", message: "LM Studio launched — go to Local Server tab and click Start" }); res.end(); }
        }, 1000);
      } catch (e) { send({ type: "error", message: String(e) }); res.end(); }
    } else {
      send({ type: "info", message: "LM Studio غير مثبّت — حمّله من lmstudio.ai ثم فعّل Local Server على المنفذ 1234" });
      res.end();
    }
    return;
  }

  if (id === "jan") {
    const candidates = [
      `${process.env["HOME"] ?? "/home/runner"}/.local/bin/jan`,
      "/usr/bin/jan",
      "/opt/jan/jan",
      `${process.env["HOME"] ?? "/home/runner"}/Applications/Jan.AppImage`,
    ];
    const bin = candidates.find(p => fs.existsSync(p)) ?? null;
    if (bin) {
      try {
        spawn(bin, [], { detached: true, stdio: "ignore" }).unref();
        send({ type: "log", message: "Jan launched — enable Local API Server on port 1337" });
        let tries = 0;
        const check = setInterval(async () => {
          tries++;
          try {
            const r = await fetch("http://localhost:1337/v1/models", { signal: AbortSignal.timeout(2000) });
            if (r.ok) { clearInterval(check); send({ type: "success", message: "Jan is online ✓" }); res.end(); }
          } catch { /* waiting */ }
          if (tries >= 20) { clearInterval(check); send({ type: "info", message: "Jan launched — go to Local API Server and click Start" }); res.end(); }
        }, 1000);
      } catch (e) { send({ type: "error", message: String(e) }); res.end(); }
    } else {
      send({ type: "info", message: "Jan غير مثبّت — حمّله من jan.ai ثم فعّل Local API Server على المنفذ 1337" });
      res.end();
    }
    return;
  }

  send({ type: "info", message: `${id} must be launched from its native app. See install guide.` });
  res.end();
});

router.post("/local-engines/install/:id", (req, res): void => {
  const id = req.params.id as EngineId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: "start", message: `Installing ${id}...` });

  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  if (id === "ollama") {
    send({ type: "log", message: "Downloading Ollama v0.30.10...", pct: 0 });
    const dlUrl   = "https://github.com/ollama/ollama/releases/download/v0.30.10/ollama-linux-amd64.tgz";
    const tgzPath = "/tmp/ollama.tgz";
    const outDir  = path.join(WORKSPACE, ".ollama-bin");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const proc = spawn("bash", ["-c",
      `curl -L --max-time 300 -# -o ${tgzPath} "${dlUrl}" 2>&1`
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const matches = buf.match(/(\d+\.\d+)/g);
      if (matches) {
        const pct = Math.min(Math.round(parseFloat(matches[matches.length - 1])), 99);
        send({ type: "progress", message: `Downloading... ${pct}%`, pct });
        buf = "";
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);

    proc.on("close", (code) => {
      if (code !== 0) { send({ type: "error", message: `Download failed (exit ${code})` }); res.end(); return; }
      send({ type: "log", message: "Extracting tarball...", pct: 99 });
      execAsync(`tar -xzf ${tgzPath} -C ${outDir} && chmod +x ${path.join(outDir, "ollama")}`)
        .then(() => { send({ type: "success", message: "Ollama installed ✓", pct: 100 }); res.end(); })
        .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    });
    return;
  }

  if (id === "llamafile") {
    send({ type: "log", message: "Downloading Llamafile 0.9.2 binary...", pct: 0 });
    const dlUrl   = "https://github.com/Mozilla-Ocho/llamafile/releases/download/0.9.2/llamafile-0.9.2";
    const outPath = path.join(HOME_BIN_DIR, "llamafile");
    if (!fs.existsSync(HOME_BIN_DIR)) fs.mkdirSync(HOME_BIN_DIR, { recursive: true });
    const proc = spawn("bash", ["-c", `curl -L --max-time 300 -# -o "${outPath}" "${dlUrl}" 2>&1`], { stdio: ["ignore","pipe","pipe"] });
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const matches = buf.match(/(\d+\.\d+)/g);
      if (matches) { const pct = Math.min(Math.round(parseFloat(matches[matches.length-1])),99); send({ type: "progress", message: `Downloading... ${pct}%`, pct }); buf = ""; }
    };
    proc.stdout?.on("data", onData); proc.stderr?.on("data", onData);
    proc.on("close", (code) => {
      if (code !== 0) { send({ type: "error", message: `Download failed (exit ${code})` }); res.end(); return; }
      try { fs.chmodSync(outPath, 0o755); } catch { /* ignore */ }
      send({ type: "success", message: "Llamafile installed ✓", pct: 100 }); res.end();
    });
    return;
  }

  if (id === "llamacpp") {
    send({ type: "log", message: "Downloading llama.cpp server (pre-built)...", pct: 0 });
    const dlUrl   = "https://github.com/ggml-org/llama.cpp/releases/download/b9870/llama-b9870-bin-ubuntu-x64.tar.gz";
    const tmpTar  = "/tmp/llama-cpp-dl.tar.gz";
    if (!fs.existsSync(HOME_BIN_DIR)) fs.mkdirSync(HOME_BIN_DIR, { recursive: true });
    const proc = spawn("bash", ["-c", `curl -L --max-time 300 -# -o "${tmpTar}" "${dlUrl}" 2>&1`], { stdio: ["ignore","pipe","pipe"] });
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const matches = buf.match(/(\d+\.\d+)/g);
      if (matches) { const pct = Math.min(Math.round(parseFloat(matches[matches.length-1])), 99); send({ type: "progress", message: `Downloading... ${pct}%`, pct }); buf = ""; }
    };
    proc.stdout?.on("data", onData); proc.stderr?.on("data", onData);
    proc.on("close", async (code) => {
      if (code !== 0) { send({ type: "error", message: `Download failed (exit ${code})` }); res.end(); return; }
      send({ type: "log", message: "Extracting...", pct: 99 });
      try {
        await execAsync(`tar -xzf "${tmpTar}" -C /tmp/ 2>&1`);
        const found = await execAsync(`find /tmp -name "llama-server" -type f 2>/dev/null | head -1`);
        const src = found.stdout.trim();
        if (!src) { send({ type: "error", message: "llama-server not found in archive" }); res.end(); return; }
        fs.copyFileSync(src, path.join(HOME_BIN_DIR, "llama-server"));
        fs.chmodSync(path.join(HOME_BIN_DIR, "llama-server"), 0o755);
        send({ type: "success", message: "llama.cpp server installed ✓", pct: 100 }); res.end();
      } catch (e) { send({ type: "error", message: String(e) }); res.end(); }
    });
    return;
  }

  if (id === "nitro") {
    send({ type: "log", message: "Downloading Nitro (cortex.cpp v0.3.3)...", pct: 0 });
    const dlUrl  = "https://github.com/janhq/cortex.cpp/releases/download/v0.3.3/nitro-0.3.3-linux-amd64.tar.gz";
    const tmpTar = "/tmp/nitro-dl.tar.gz";
    if (!fs.existsSync(HOME_BIN_DIR)) fs.mkdirSync(HOME_BIN_DIR, { recursive: true });
    const proc = spawn("bash", ["-c", `curl -L --max-time 300 -# -o "${tmpTar}" "${dlUrl}" 2>&1`], { stdio: ["ignore","pipe","pipe"] });
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const matches = buf.match(/(\d+\.\d+)/g);
      if (matches) { const pct = Math.min(Math.round(parseFloat(matches[matches.length-1])), 99); send({ type: "progress", message: `Downloading... ${pct}%`, pct }); buf = ""; }
    };
    proc.stdout?.on("data", onData); proc.stderr?.on("data", onData);
    proc.on("close", async (code) => {
      if (code !== 0) { send({ type: "error", message: `Download failed (exit ${code})` }); res.end(); return; }
      send({ type: "log", message: "Extracting...", pct: 99 });
      try {
        await execAsync(`mkdir -p /tmp/nitro-extracted && tar -xzf "${tmpTar}" -C /tmp/nitro-extracted/ 2>&1`);
        const found = await execAsync(`find /tmp/nitro-extracted -name "nitro" -type f 2>/dev/null | head -1`);
        const src = found.stdout.trim();
        if (!src) { send({ type: "error", message: "nitro binary not found in archive" }); res.end(); return; }
        fs.copyFileSync(src, path.join(HOME_BIN_DIR, "nitro"));
        fs.chmodSync(path.join(HOME_BIN_DIR, "nitro"), 0o755);
        send({ type: "success", message: "Nitro installed ✓", pct: 100 }); res.end();
      } catch (e) { send({ type: "error", message: String(e) }); res.end(); }
    });
    return;
  }

  if (id === "localai") {
    send({ type: "log", message: "Downloading LocalAI v2.21.1...", pct: 0 });
    const dlUrl   = "https://github.com/mudler/LocalAI/releases/download/v2.21.1/local-ai-Linux-x86_64";
    const outPath = path.join(HOME_BIN_DIR, "local-ai");
    if (!fs.existsSync(HOME_BIN_DIR)) fs.mkdirSync(HOME_BIN_DIR, { recursive: true });
    const proc = spawn("bash", ["-c", `curl -L --max-time 300 -# -o "${outPath}" "${dlUrl}" 2>&1`], { stdio: ["ignore","pipe","pipe"] });
    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const matches = buf.match(/(\d+\.\d+)/g);
      if (matches) { const pct = Math.min(Math.round(parseFloat(matches[matches.length-1])), 99); send({ type: "progress", message: `Downloading... ${pct}%`, pct }); buf = ""; }
    };
    proc.stdout?.on("data", onData); proc.stderr?.on("data", onData);
    proc.on("close", (code) => {
      if (code !== 0) { send({ type: "error", message: `Download failed (exit ${code})` }); res.end(); return; }
      try { fs.chmodSync(outPath, 0o755); } catch { /* ignore */ }
      send({ type: "success", message: "LocalAI installed ✓", pct: 100 }); res.end();
    });
    return;
  }

  if (id === "kobold") {
    send({ type: "log", message: "Cloning KoboldCPP..." });
    const outDir = path.join(BIN_DIR, "koboldcpp");
    execAsync(`git clone --depth=1 https://github.com/LostRuins/koboldcpp.git "${outDir}" 2>&1`)
      .then(() => {
        send({ type: "log", message: "Installing Python deps..." });
        return execAsync(`pip3 install --quiet -r "${path.join(outDir, "requirements.txt")}" 2>&1`);
      })
      .then(() => { send({ type: "success", message: "KoboldCPP installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  if ((id as string) === "openwebui") {
    send({ type: "log", message: "Installing Open WebUI via pip..." });
    execAsync("pip3 install open-webui 2>&1", { maxBuffer: 10 * 1024 * 1024 })
      .then(() => { send({ type: "success", message: "Open WebUI installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  send({ type: "info", message: `${id} must be installed manually. Download from official site.` });
  res.end();
});

router.post("/local-engines/pull-model", async (req, res): Promise<void> => {
  const { model } = req.body as { model?: string };
  if (!model) { res.status(400).json({ error: "model required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const check = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    if (!check.ok) { send({ type: "error", message: "Ollama غير مشغّل" }); res.end(); return; }

    send({ type: "start", model, message: `بدء تحميل ${model}...` });

    const pullRes = await fetch("http://localhost:11434/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: true }),
      signal: AbortSignal.timeout(600000),
    });

    if (!pullRes.ok || !pullRes.body) {
      send({ type: "error", message: `فشل Ollama pull: ${pullRes.status}` });
      res.end();
      return;
    }

    const reader = pullRes.body.getReader();
    const decoder = new TextDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as {
            status?: string; total?: number; completed?: number; error?: string;
          };
          if (obj.error) { send({ type: "error", message: obj.error }); res.end(); return; }
          const pct = obj.total && obj.total > 0
            ? Math.round(((obj.completed ?? 0) / obj.total) * 100)
            : null;
          send({ type: "progress", status: obj.status, total: obj.total, completed: obj.completed, pct });
        } catch { /* skip malformed line */ }
      }
    }

    send({ type: "success", message: `${model} تم التحميل` });
    res.end();
  } catch (err: unknown) {
    send({ type: "error", message: String(err) });
    res.end();
  }
});

router.delete("/local-engines/model/:model", async (req, res): Promise<void> => {
  const model = decodeURIComponent(req.params.model);
  if (!model) { res.status(400).json({ error: "model required" }); return; }
  try {
    const r = await fetch("http://localhost:11434/api/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      res.json({ success: true, message: `تم حذف ${model}` });
    } else {
      const txt = await r.text().catch(() => "Unknown error");
      res.status(r.status).json({ error: txt });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/local-engines/benchmark", async (req, res): Promise<void> => {
  const { model, prompt } = req.body as { model?: string; prompt?: string };
  if (!model) { res.status(400).json({ error: "model required" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const testPrompt = prompt ?? "Write a one-paragraph explanation of quantum computing.";

  try {
    const check = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    if (!check.ok) { send({ type: "error", message: "Ollama غير مشغّل" }); res.end(); return; }

    send({ type: "start", message: `Benchmarking ${model}...` });
    const t0 = Date.now();
    let tokens = 0;

    const genRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: testPrompt, stream: true }),
      signal: AbortSignal.timeout(120000),
    });

    if (!genRes.ok || !genRes.body) {
      send({ type: "error", message: `فشل: ${genRes.status}` });
      res.end(); return;
    }

    const reader  = genRes.body.getReader();
    const decoder = new TextDecoder();
    let   carry   = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = (carry + chunk).split("\n");
      carry = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as { response?: string; done?: boolean; eval_count?: number; eval_duration?: number };
          if (obj.response) {
            tokens++;
            const elapsed = (Date.now() - t0) / 1000;
            const tps = elapsed > 0 ? Math.round(tokens / elapsed) : 0;
            send({ type: "token", token: obj.response, tokens, tps, elapsed: Math.round(elapsed * 10) / 10 });
          }
          if (obj.done) {
            const totalMs   = Date.now() - t0;
            const finalTps  = obj.eval_duration ? Math.round(((obj.eval_count ?? tokens) / obj.eval_duration) * 1e9) : Math.round(tokens / (totalMs / 1000));
            send({ type: "done", tokens: obj.eval_count ?? tokens, totalMs, tps: finalTps });
          }
        } catch { /* skip */ }
      }
    }
    res.end();
  } catch (e) {
    send({ type: "error", message: String(e) });
    res.end();
  }
});

router.get("/local-engines/guide/:id", (_req, res) => {
  const id = _req.params.id as EngineId;
  const GUIDES: Record<string, { url: string; steps: string[] }> = {
    ollama:     { url: "https://ollama.com", steps: ["Click Install above", "Run: ollama pull llama3.2:3b", "Server auto-starts on port 11434"] },
    lmstudio:   { url: "https://lmstudio.ai", steps: ["Download from lmstudio.ai", "Install & open LM Studio", "Load a model", "Go to Local Server tab → Start Server (port 1234)"] },
    jan:        { url: "https://jan.ai", steps: ["Download from jan.ai", "Install & open Jan", "Download a model in Hub", "Go to Local API Server → Start (port 1337)"] },
    gpt4all:    { url: "https://gpt4all.io", steps: ["Download from gpt4all.io", "Install & open GPT4All", "Download a model", "Enable API server in Settings → API (port 4891)"] },
    openwebui:  { url: "https://openwebui.com", steps: ["Click Install above (pip install)", "Click Launch above", "Open WebUI starts on port 3000"] },
    llamafile:  { url: "https://github.com/Mozilla-Ocho/llamafile", steps: ["Click Install above (downloads binary to ~/.local-engines/)", "Click Launch above to start server on port 8081", "Load a .gguf model or use Phi-3 model"] },
    kobold:     { url: "https://github.com/LostRuins/koboldcpp", steps: ["Click Install above (git clone)", "Click Launch above", "KoboldCPP starts on port 5001"] },
    llamacpp:   { url: "https://github.com/ggml-org/llama.cpp", steps: ["Click Install above (downloads pre-built binary)", "Click Launch above", "llama.cpp server starts on port 8082", "Load models via API"] },
    nitro:      { url: "https://github.com/janhq/cortex.cpp", steps: ["Click Install above (downloads nitro binary)", "Click Launch above", "Nitro starts on port 3928", "Compatible with OpenAI API"] },
    localai:    { url: "https://localai.io", steps: ["Click Install above (downloads 1.3GB binary)", "Click Launch above", "LocalAI starts on port 8083", "Supports many model formats"] },
  };
  const guide = GUIDES[id];
  if (!guide) return res.status(404).json({ error: "Not found" });
  return res.json(guide);
});

export default router;
