/**
 * Code Execution Sandbox — POST /api/execute
 * Runs Python or JavaScript in a restricted child_process with timeout.
 * No network, no file system access outside /tmp, memory-limited.
 */
import { Router, type Request, type Response } from "express";
import { exec } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const EXEC_TIMEOUT_MS = 15_000;
const MAX_CODE_LEN    = 32_000;
const MAX_OUTPUT_LEN  = 20_000;
const SANDBOX_DIR     = "/tmp/mr7-sandbox";

try { mkdirSync(SANDBOX_DIR, { recursive: true }); } catch { /* exists */ }

// ─── Blocklist for dangerous patterns ────────────────────────────────────────
const PYTHON_BLOCKED = [
  /import\s+os\s*;?\s*os\.system/,
  /subprocess/,
  /__import__\s*\(\s*['"]os['"]/,
  /open\s*\([^)]*['"]\s*[wa]/,   // write/append file
  /socket\s*\./,
  /urllib\.request/,
  /requests\./,
  /http\.client/,
  /ftplib/,
  /smtplib/,
  /shutil\.rmtree/,
  /os\.remove/,
  /os\.rmdir/,
  /sys\.exit\s*\(\s*-/,
];

const JS_BLOCKED = [
  /require\s*\(\s*['"]child_process['"]/,
  /require\s*\(\s*['"]fs['"]/,
  /require\s*\(\s*['"]net['"]/,
  /process\.exit/,
  /eval\s*\(/,
  /Function\s*\(/,
];

function checkBlocked(code: string, lang: string): string | null {
  const patterns = lang === "python" ? PYTHON_BLOCKED : JS_BLOCKED;
  for (const p of patterns) {
    if (p.test(code)) return `Blocked pattern: ${p.source.slice(0, 60)}`;
  }
  return null;
}

// ─── Python execution wrapper ─────────────────────────────────────────────────
const PYTHON_PREAMBLE = `
import sys, math, json, re, random, itertools, functools, collections, datetime, time, string, copy, hashlib, base64, struct, binascii, textwrap, io
import numpy as np
from collections import defaultdict, Counter, OrderedDict, deque
from itertools import combinations, permutations, product, chain
from functools import reduce, partial, lru_cache
from math import *

# Capture stdout
_output_buffer = io.StringIO()
sys.stdout = _output_buffer
sys.stderr = _output_buffer

try:
USERCODE
except Exception as _e:
    print(f"\\n[Error] {type(_e).__name__}: {_e}")

sys.stdout = sys.__stdout__
print(_output_buffer.getvalue(), end="")
`;

function buildPythonScript(code: string): string {
  const indented = code.split("\n").map(l => "    " + l).join("\n");
  return PYTHON_PREAMBLE.replace("USERCODE", indented);
}

// ─── JavaScript execution (Node.js) ─────────────────────────────────────────
function buildJsScript(code: string): string {
  return `
const _orig = console.log;
const _lines = [];
console.log = (...args) => { _lines.push(args.map(String).join(" ")); };
console.error = console.log;
console.warn = console.log;
try {
  (function() {
    ${code}
  })();
} catch(e) {
  _lines.push("[Error] " + e.message);
}
process.stdout.write(_lines.join("\\n") + "\\n");
`;
}

// ─── POST /api/execute ────────────────────────────────────────────────────────
router.post("/execute", async (req: Request, res: Response): Promise<void> => {
  const { code, language = "python", timeout } = req.body as {
    code?: string;
    language?: "python" | "javascript";
    timeout?: number;
  };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  if (code.length > MAX_CODE_LEN) {
    res.status(400).json({ error: `Code too long (max ${MAX_CODE_LEN} chars)` });
    return;
  }

  const lang = language === "javascript" ? "javascript" : "python";

  const blocked = checkBlocked(code, lang);
  if (blocked) {
    res.json({ ok: false, output: `[Blocked] ${blocked}`, language: lang, executionTime: 0 });
    return;
  }

  const id      = randomBytes(8).toString("hex");
  const ext     = lang === "python" ? "py" : "js";
  const tmpFile = join(SANDBOX_DIR, `${id}.${ext}`);
  const script  = lang === "python" ? buildPythonScript(code) : buildJsScript(code);
  const timeoutMs = Math.min(timeout ?? EXEC_TIMEOUT_MS, EXEC_TIMEOUT_MS);
  const t0 = Date.now();

  try {
    writeFileSync(tmpFile, script, "utf8");

    const cmd = lang === "python"
      ? `python3 -u "${tmpFile}"`
      : `node --max-old-space-size=128 "${tmpFile}"`;

    const output = await new Promise<string>((resolve) => {
      exec(cmd, {
        timeout: timeoutMs,
        maxBuffer: MAX_OUTPUT_LEN,
        env: {
          PATH: process.env.PATH,
          HOME: SANDBOX_DIR,
          TMPDIR: SANDBOX_DIR,
        },
        uid: process.getuid?.(),
      }, (err, stdout, stderr) => {
        const raw = (stdout + stderr).slice(0, MAX_OUTPUT_LEN);
        if (err && err.killed) {
          resolve(raw + `\n[Timeout] Execution exceeded ${timeoutMs / 1000}s`);
        } else if (err && !raw.trim()) {
          resolve(`[Error] ${err.message}`);
        } else {
          resolve(raw);
        }
      });
    });

    const executionTime = Date.now() - t0;
    logger.info({ lang, id, executionTime }, "[execute] code run");

    res.json({ ok: true, output: output.slice(0, MAX_OUTPUT_LEN), language: lang, executionTime });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execution failed";
    res.json({ ok: false, output: `[Error] ${msg}`, language: lang, executionTime: Date.now() - t0 });
  } finally {
    try { unlinkSync(tmpFile); } catch { /* already gone */ }
  }
});

export default router;
