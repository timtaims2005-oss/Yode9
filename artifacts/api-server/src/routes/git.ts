import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

const WORKSPACE = process.cwd();

async function git(args: string, cwd = WORKSPACE): Promise<{ out: string; err: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(`git ${args}`, { cwd, timeout: 15_000 });
    return { out: stdout.trim(), err: stderr.trim(), ok: true };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { out: err.stdout?.trim() ?? "", err: err.stderr?.trim() ?? err.message ?? "", ok: false };
  }
}

router.get("/git/status", async (_req, res) => {
  const [status, branch, log] = await Promise.all([
    git("status --porcelain"),
    git("rev-parse --abbrev-ref HEAD"),
    git("log --oneline -10"),
  ]);

  const files: { status: string; path: string }[] = [];
  for (const line of status.out.split("\n").filter(Boolean)) {
    files.push({ status: line.slice(0, 2).trim(), path: line.slice(3) });
  }

  res.json({
    branch: branch.out || "main",
    files,
    log: log.out.split("\n").filter(Boolean).map(l => {
      const [hash, ...rest] = l.split(" ");
      return { hash, message: rest.join(" ") };
    }),
    clean: files.length === 0,
  });
});

router.get("/git/diff", async (req, res) => {
  const file = req.query.file as string | undefined;
  const staged = req.query.staged === "true";

  let args = staged ? "diff --staged" : "diff";
  if (file) args += ` -- "${file}"`;

  const result = await git(args);
  res.json({ diff: result.out, ok: result.ok });
});

router.post("/git/add", async (req, res) => {
  const { files } = req.body as { files?: string[] };
  const target = files?.length ? files.map(f => `"${f}"`).join(" ") : ".";
  const result = await git(`add ${target}`);
  res.json({ ok: result.ok, error: result.err || undefined });
});

router.post("/git/commit", async (req, res) => {
  const { message } = req.body as { message?: string };
  if (!message) { res.status(400).json({ error: "message required" }); return; }
  const result = await git(`commit -m "${message.replace(/"/g, '\\"')}"`);
  res.json({ ok: result.ok, out: result.out, error: result.err || undefined });
});

router.post("/git/push", async (req, res) => {
  const result = await git("push");
  res.json({ ok: result.ok, out: result.out, error: result.err || undefined });
});

router.get("/git/log", async (_req, res) => {
  const result = await git('log --oneline --graph --decorate --all -30 --pretty=format:"%h|%an|%ar|%s"');
  const entries = result.out.split("\n").filter(Boolean).map(line => {
    const [hash, author, date, ...msgParts] = line.split("|");
    return { hash, author, date, message: msgParts.join("|") };
  });
  res.json({ entries, ok: result.ok });
});

router.get("/git/blame", async (req, res) => {
  const { file, line } = req.query as { file?: string; line?: string };
  if (!file) { res.status(400).json({ error: "file required" }); return; }
  const args = line ? `blame -L ${line},${line} -- "${file}"` : `blame -- "${file}"`;
  const result = await git(args);
  res.json({ blame: result.out, ok: result.ok });
});

export default router;
