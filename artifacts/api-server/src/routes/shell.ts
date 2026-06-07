import { Router } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import type { IncomingMessage } from "http";
import type { WebSocket as WS } from "ws";

const execAsync = promisify(exec);
const router = Router();

const WORKSPACE = process.cwd();

const HARD_BLOCKED = [
  /rm\s+-rf\s+[\/~]/i,
  /:\(\)\s*\{.*\}\s*;/,
  /mkfs/i,
  /dd\s+if=\/dev\/(zero|random|urandom)/i,
  />\s*\/dev\/sd[a-z]/i,
  /chmod\s+-R\s+[0-7]*7\s+\//i,
  /shutdown/i,
  /reboot/i,
  /halt/i,
  /poweroff/i,
  /init\s+[0-6]/i,
  /curl\s+.*\|\s*(ba)?sh/i,
  /wget\s+.*\|\s*(ba)?sh/i,
  /python[23]?\s+-c\s+.*exec\s*\(/i,
  /nc\s+(-[a-z]+\s+)*-e\s+/i,
  /ncat\s+.*--exec/i,
  /bash\s+-i\s+>&\s*\/dev\/tcp/i,
  /\/dev\/tcp\//i,
  /socat\s+.*exec/i,
  /pkill\s+-9\s+/i,
  /kill\s+-9\s+1\b/i,
  /systemctl\s+(stop|disable|mask)\s+(sshd|network|cron)/i,
  /crontab\s+-r/i,
  /passwd\s+root/i,
  /useradd|userdel|usermod/i,
  /visudo/i,
  /chattr\s+\+i\s+\/etc/i,
  /iptables\s+-F/i,
  /ufw\s+disable/i,
  /sestatus|setenforce\s+0/i,
];

const MAX_CMD_LENGTH = 2048;

function isSafe(cmd: string): { ok: boolean; reason?: string } {
  if (cmd.length > MAX_CMD_LENGTH) {
    return { ok: false, reason: "Command too long" };
  }
  for (const pattern of HARD_BLOCKED) {
    if (pattern.test(cmd)) {
      return { ok: false, reason: `Blocked pattern detected` };
    }
  }
  return { ok: true };
}

router.post("/shell/exec", async (req, res) => {
  const { command, cwd } = req.body as { command?: string; cwd?: string };
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command required" });
    return;
  }

  const check = isSafe(command);
  if (!check.ok) {
    res.status(403).json({ error: check.reason ?? "Command blocked", stdout: "", stderr: "Blocked" });
    return;
  }

  const resolvedCwd = cwd ?? WORKSPACE;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: resolvedCwd,
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        PATH: process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
    });
    res.json({ stdout: stdout ?? "", stderr: stderr ?? "", success: true, exitCode: 0 });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string; code?: number };
    res.json({
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "Unknown error",
      success: false,
      exitCode: err.code ?? 1,
    });
  }
});

export function handleTerminalSocket(ws: WS, _req: IncomingMessage) {
  let shellProcess: ReturnType<typeof spawn> | null = null;

  function startShell(cwd: string) {
    if (shellProcess) { try { shellProcess.kill(); } catch {} }

    shellProcess = spawn("/bin/bash", ["--norc", "--noprofile"], {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        PS1: "\\[\\033[01;32m\\]kali@mr7\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ",
        HOME: process.env.HOME ?? "/root",
        PATH: process.env.PATH ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    shellProcess.stdout?.on("data", (data: Buffer) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: "output", data: data.toString() }));
    });
    shellProcess.stderr?.on("data", (data: Buffer) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: "output", data: data.toString() }));
    });
    shellProcess.on("exit", (code) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: "exit", code: code ?? 0 }));
    });

    ws.send(JSON.stringify({ type: "ready", cwd }));
  }

  ws.on("message", (raw: Buffer | string) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; data?: string; cwd?: string; cols?: number; rows?: number };
      if (msg.type === "start") {
        startShell(msg.cwd ?? WORKSPACE);
      } else if (msg.type === "input" && shellProcess?.stdin) {
        const input = msg.data ?? "";
        const check = isSafe(input.trim());
        if (!check.ok) {
          ws.send(JSON.stringify({ type: "output", data: `\r\n[BLOCKED] ${check.reason}\r\n` }));
          return;
        }
        shellProcess.stdin.write(input);
      } else if (msg.type === "resize") {
        // PTY resize not supported without node-pty
      } else if (msg.type === "kill") {
        shellProcess?.kill();
        shellProcess = null;
      }
    } catch {}
  });

  ws.on("close", () => {
    try { shellProcess?.kill(); } catch {}
    shellProcess = null;
  });
}

export default router;
