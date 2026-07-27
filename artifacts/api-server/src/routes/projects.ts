/**
 * Projects API — مساحات العمل المنفصلة
 * GET    /api/projects          → list all projects for device
 * POST   /api/projects          → create new project
 * PATCH  /api/projects/:id      → update project (name, system_instructions)
 * DELETE /api/projects/:id      → delete project
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";

const router = Router();

// Ensure projects table exists (idempotent)
async function ensureProjectsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR PRIMARY KEY,
      device_id VARCHAR NOT NULL,
      name VARCHAR NOT NULL,
      system_instructions TEXT NOT NULL DEFAULT '',
      color VARCHAR NOT NULL DEFAULT '#e21227',
      icon VARCHAR NOT NULL DEFAULT 'folder',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_projects_device ON projects (device_id)`).catch(() => {});
}
// run once on load
ensureProjectsTable();

function getDeviceId(req: Request): string {
  // use the same device-id header pattern as cloud-chats
  return (req.headers["x-device-id"] as string) || "anonymous";
}

// ── List ──────────────────────────────────────────────────────────────────────
router.get("/projects", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { rows } = await pool.query(
      `SELECT id, name, system_instructions, color, icon, created_at, updated_at
       FROM projects WHERE device_id = $1 ORDER BY created_at ASC`,
      [deviceId],
    );
    res.json({ projects: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load projects. Please try again." });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post("/projects", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { name, system_instructions = "", color = "#e21227", icon = "folder" } = req.body as {
      name: string; system_instructions?: string; color?: string; icon?: string;
    };
    if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }

    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO projects (id, device_id, name, system_instructions, color, icon)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, system_instructions, color, icon, created_at, updated_at`,
      [id, deviceId, name.trim(), system_instructions, color, icon],
    );
    res.json({ project: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create project. Please try again." });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.patch("/projects/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { id } = req.params;
    const { name, system_instructions, color, icon } = req.body as Partial<{
      name: string; system_instructions: string; color: string; icon: string;
    }>;

    const sets: string[] = ["updated_at = NOW()"];
    const vals: unknown[] = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (system_instructions !== undefined) { sets.push(`system_instructions = $${idx++}`); vals.push(system_instructions); }
    if (color !== undefined) { sets.push(`color = $${idx++}`); vals.push(color); }
    if (icon !== undefined) { sets.push(`icon = $${idx++}`); vals.push(icon); }

    if (vals.length === 0) { res.status(400).json({ error: "nothing to update" }); return; }
    vals.push(id, deviceId);

    const { rows } = await pool.query(
      `UPDATE projects SET ${sets.join(", ")}
       WHERE id = $${idx++} AND device_id = $${idx}
       RETURNING id, name, system_instructions, color, icon, created_at, updated_at`,
      vals,
    );
    if (rows.length === 0) { res.status(404).json({ error: "not found" }); return; }
    res.json({ project: rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update project. Please try again." });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete("/projects/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceId = getDeviceId(req);
    const { id } = req.params;
    await pool.query(`DELETE FROM projects WHERE id = $1 AND device_id = $2`, [id, deviceId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project. Please try again." });
  }
});

export default router;
