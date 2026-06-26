import { Router } from "express";
import * as fs from "fs";
import * as path from "path";

const router = Router();

const WORKSPACE = path.resolve(process.cwd(), "../..");
const EXCLUDED = new Set([
  "node_modules", ".git", "dist", ".pnpm", "coverage",
  ".cache", "__pycache__", ".next", ".nuxt", "build",
  ".turbo", ".vercel", "attached_assets", ".replit_integration_files",
]);

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  ext?: string;
  size?: number;
}

function buildTree(dir: string, relBase = "", depth = 0): FileNode[] {
  if (depth > 6) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (EXCLUDED.has(entry.name)) continue;

    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "dir",
        children: buildTree(fullPath, relPath, depth + 1),
      });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1);
      let size = 0;
      try { size = fs.statSync(fullPath).size; } catch {}
      nodes.push({ name: entry.name, path: relPath, type: "file", ext, size });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function sanitizePath(relPath: string): string | null {
  const resolved = path.resolve(WORKSPACE, relPath);
  if (!resolved.startsWith(WORKSPACE)) return null;
  return resolved;
}

router.get("/files/tree", (_req, res) => {
  const tree = buildTree(WORKSPACE);
  res.json({ tree, workspace: WORKSPACE });
});

router.get("/files/read", (req, res) => {
  const relPath = req.query.path as string;
  if (!relPath) { res.status(400).json({ error: "path required" }); return; }

  const full = sanitizePath(relPath);
  if (!full) { res.status(403).json({ error: "Access denied" }); return; }

  try {
    const stat = fs.statSync(full);
    if (stat.size > 500_000) {
      res.status(413).json({ error: "File too large (>500KB)" });
      return;
    }
    const content = fs.readFileSync(full, "utf-8");
    const ext = path.extname(full).slice(1);
    res.json({ content, ext, size: stat.size, path: relPath });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

router.post("/files/write", (req, res) => {
  const { path: relPath, content } = req.body as { path: string; content: string };
  if (!relPath || content === undefined) {
    res.status(400).json({ error: "path and content required" });
    return;
  }

  const full = sanitizePath(relPath);
  if (!full) { res.status(403).json({ error: "Access denied" }); return; }

  try {
    const dir = path.dirname(full);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
    res.json({ ok: true, path: relPath });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
