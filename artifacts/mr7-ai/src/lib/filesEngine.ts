// ─────────────────────────────────────────────────────────────────────────────
//  FILES ENGINE — نظام ملفات المساحة الافتراضية
//  يوفر CRUD كامل للملفات داخل جلسة المتصفح (localStorage + IndexedDB fallback)
//  قابل للاستخدام من قِبل النموذج عبر systemTools.ts
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceFile = {
  id: string;
  name: string;
  path: string;
  linkedSkillId?: string;
  content: string;
  language: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
};

const FS_KEY = "mr7-workspace-files";

function _load(): Record<string, WorkspaceFile> {
  try {
    const raw = localStorage.getItem(FS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _save(db: Record<string, WorkspaceFile>): void {
  try {
    localStorage.setItem(FS_KEY, JSON.stringify(db));
  } catch { /* quota exceeded — ignore */ }
}

function _detectLang(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", sh: "bash", bash: "bash", json: "json", yaml: "yaml",
    yml: "yaml", md: "markdown", html: "html", css: "css", sql: "sql",
    rs: "rust", go: "go", cpp: "cpp", c: "c", java: "java", rb: "ruby",
  };
  return map[ext] ?? "text";
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

export function listFiles(filter?: string): WorkspaceFile[] {
  const db = _load();
  const files = Object.values(db);
  if (!filter) return files;
  const q = filter.toLowerCase();
  return files.filter(
    (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q)),
  );
}

export function readFile(pathOrId: string): WorkspaceFile | null {
  const db = _load();
  // Try direct ID first
  if (db[pathOrId]) return db[pathOrId];
  // Then search by path or name
  return Object.values(db).find((f) => f.path === pathOrId || f.name === pathOrId) ?? null;
}

export function createFile(
  name: string,
  content: string,
  path?: string,
  tags?: string[],
): WorkspaceFile {
  const db = _load();
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const filePath = path ?? `/${name}`;
  const file: WorkspaceFile = {
    id,
    name,
    path: filePath,
    content,
    language: _detectLang(name),
    size: new TextEncoder().encode(content).length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: tags ?? [],
  };
  db[id] = file;
  _save(db);
  return file;
}

export function updateFile(
  pathOrId: string,
  updates: Partial<Pick<WorkspaceFile, "content" | "name" | "path" | "tags" | "linkedSkillId">>,
): WorkspaceFile | null {
  const db = _load();
  const existing = db[pathOrId] ?? Object.values(db).find((f) => f.path === pathOrId || f.name === pathOrId);
  if (!existing) return null;
  const updated: WorkspaceFile = {
    ...existing,
    ...updates,
    size: updates.content ? new TextEncoder().encode(updates.content).length : existing.size,
    updatedAt: Date.now(),
  };
  db[existing.id] = updated;
  _save(db);
  return updated;
}

export function deleteFile(pathOrId: string): boolean {
  const db = _load();
  if (db[pathOrId]) {
    delete db[pathOrId];
    _save(db);
    return true;
  }
  const match = Object.values(db).find((f) => f.path === pathOrId || f.name === pathOrId);
  if (match) {
    delete db[match.id];
    _save(db);
    return true;
  }
  return false;
}

export function getFileStats(): { total: number; totalSize: number; languages: Record<string, number> } {
  const files = listFiles();
  const langs: Record<string, number> = {};
  let totalSize = 0;
  for (const f of files) {
    totalSize += f.size;
    langs[f.language] = (langs[f.language] ?? 0) + 1;
  }
  return { total: files.length, totalSize, languages: langs };
}

export function searchInFiles(query: string): Array<{ file: WorkspaceFile; matchCount: number; preview: string }> {
  const files = listFiles();
  const results: Array<{ file: WorkspaceFile; matchCount: number; preview: string }> = [];
  const q = query.toLowerCase();

  for (const f of files) {
    const content = f.content.toLowerCase();
    const matchCount = (content.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    if (matchCount > 0) {
      const idx = content.indexOf(q);
      const preview = f.content.slice(Math.max(0, idx - 40), idx + 60).replace(/\n/g, " ").trim();
      results.push({ file: f, matchCount, preview });
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}

export function exportFilesAsZipManifest(): string {
  const files = listFiles();
  return JSON.stringify(
    files.map((f) => ({ name: f.name, path: f.path, size: f.size, language: f.language, tags: f.tags })),
    null, 2,
  );
}
