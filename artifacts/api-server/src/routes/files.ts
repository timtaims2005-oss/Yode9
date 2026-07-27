/**
 * Workspace Files API — نظام إدارة ملفات المساحة
 * GET    /api/files          → list all files for device
 * POST   /api/files          → create new file
 * PATCH  /api/files/:id      → update file content / link
 * DELETE /api/files/:id      → delete file
 *
 * Follows the same device_id pattern as projects.ts
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";

const router = Router();

// Ensure workspace_files table exists (idempotent)
async function ensureFilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_files (
      id VARCHAR PRIMARY KEY,
      device_id VARCHAR NOT NULL,
      path VARCHAR NOT NULL,
      name VARCHAR NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      mime_type VARCHAR NOT NULL DEFAULT 'text/plain',
      linked_skill_id VARCHAR,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_files_device ON workspace_files (device_id)
  `).catch(() => {});
}
ensureFilesTable();

function getDeviceId(req: Request): string {
  return (req.headers["x-device-id"] as string) || "anonymous";
}

// ── List ──────────────────────────────────────────────────────────────────────
router.get("/files", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { rows } = await pool.query(
      `SELECT id, path, name, content, mime_type AS "mimeType", linked_skill_id AS "linkedSkillId",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM workspace_files WHERE device_id = $1 ORDER BY path ASC`,
      [deviceId],
    );
    res.json({ files: rows });
  } catch {
    res.status(500).json({ error: "Failed to load files." });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post("/files", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { id, path, name, content = "", mimeType = "text/plain", linkedSkillId } = req.body as {
      id?: string; path: string; name?: string; content?: string; mimeType?: string; linkedSkillId?: string;
    };
    if (!path?.trim()) { res.status(400).json({ error: "path required" }); return; }

    const fileId   = id ?? `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fileName = name ?? path.split("/").pop() ?? path;

    const { rows } = await pool.query(
      `INSERT INTO workspace_files (id, device_id, path, name, content, mime_type, linked_skill_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
       RETURNING id, path, name, content, mime_type AS "mimeType", linked_skill_id AS "linkedSkillId",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [fileId, deviceId, path.trim(), fileName, content, mimeType, linkedSkillId ?? null],
    );
    res.json({ file: rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to create file." });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.patch("/files/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { id } = req.params;
    const { content, linkedSkillId, name, path } = req.body as Partial<{
      content: string; linkedSkillId: string | null; name: string; path: string;
    }>;

    const sets: string[] = ["updated_at = NOW()"];
    const vals: unknown[] = [];
    let idx = 1;
    if (content    !== undefined) { sets.push(`content = $${idx++}`);              vals.push(content); }
    if (name       !== undefined) { sets.push(`name = $${idx++}`);                 vals.push(name); }
    if (path       !== undefined) { sets.push(`path = $${idx++}`);                 vals.push(path); }
    if (linkedSkillId !== undefined) { sets.push(`linked_skill_id = $${idx++}`);   vals.push(linkedSkillId); }

    if (vals.length === 0) { res.status(400).json({ error: "nothing to update" }); return; }
    vals.push(id, deviceId);

    const { rows } = await pool.query(
      `UPDATE workspace_files SET ${sets.join(", ")}
       WHERE id = $${idx++} AND device_id = $${idx}
       RETURNING id, path, name, content, mime_type AS "mimeType", linked_skill_id AS "linkedSkillId",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      vals,
    );
    if (rows.length === 0) { res.status(404).json({ error: "not found" }); return; }
    res.json({ file: rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to update file." });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete("/files/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { id } = req.params;
    await pool.query(`DELETE FROM workspace_files WHERE id = $1 AND device_id = $2`, [id, deviceId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete file." });
  }
});

export default router;
