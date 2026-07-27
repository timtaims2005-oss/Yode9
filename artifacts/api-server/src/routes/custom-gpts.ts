/**
 * Custom GPTs — User-defined AI personas with custom instructions, tools, and behaviors
 *
 * POST   /api/custom-gpts          — Create custom GPT
 * GET    /api/custom-gpts          — List all (public + own)
 * GET    /api/custom-gpts/:id      — Get single
 * PUT    /api/custom-gpts/:id      — Update (owner only)
 * DELETE /api/custom-gpts/:id      — Delete (owner only)
 * POST   /api/custom-gpts/:id/chat — Chat with custom GPT (SSE streaming)
 * POST   /api/custom-gpts/:id/clone— Clone a public GPT
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { streamCompletion } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router = Router();

// ── Ensure table exists ────────────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_gpts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id    TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      avatar_url  TEXT DEFAULT '',
      system_prompt TEXT NOT NULL,
      starter_prompts TEXT[] DEFAULT '{}',
      tools       JSONB DEFAULT '[]',
      model       TEXT DEFAULT 'gpt-4o',
      temperature FLOAT DEFAULT 0.7,
      is_public   BOOLEAN DEFAULT false,
      category    TEXT DEFAULT 'general',
      use_count   INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_custom_gpts_owner ON custom_gpts(owner_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_custom_gpts_public ON custom_gpts(is_public) WHERE is_public = true`);
}

let tablesReady = false;
async function ready() {
  if (!tablesReady) { await ensureTables(); tablesReady = true; }
}

// ── POST /api/custom-gpts ──────────────────────────────────────────────────────
router.post("/custom-gpts", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const {
    name, description = "", avatar_url = "", system_prompt,
    starter_prompts = [], tools = [], model = "gpt-4o",
    temperature = 0.7, is_public = false, category = "general",
    owner_id = "anonymous",
  } = req.body as Record<string, unknown>;

  if (!name || !system_prompt) {
    res.status(400).json({ error: "name and system_prompt are required" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_gpts (owner_id, name, description, avatar_url, system_prompt, starter_prompts, tools, model, temperature, is_public, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [String(owner_id), String(name).slice(0, 80), String(description).slice(0, 500),
       String(avatar_url), String(system_prompt).slice(0, 8000),
       Array.isArray(starter_prompts) ? starter_prompts : [],
       JSON.stringify(Array.isArray(tools) ? tools : []),
       String(model), Number(temperature), Boolean(is_public), String(category)]
    );
    res.status(201).json({ ok: true, gpt: rows[0] });
  } catch (err) {
    logger.error({ err }, "[custom-gpts] create failed");
    res.status(500).json({ error: "Failed to create custom GPT" });
  }
});

// ── GET /api/custom-gpts ──────────────────────────────────────────────────────
router.get("/custom-gpts", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const owner_id = (req.query["owner_id"] as string) || "";
  const category = (req.query["category"] as string) || "";
  const search   = (req.query["q"] as string) || "";
  const limit    = Math.min(parseInt(req.query["limit"] as string) || 50, 100);
  const offset   = parseInt(req.query["offset"] as string) || 0;

  try {
    let sql = `SELECT * FROM custom_gpts WHERE (is_public = true OR owner_id = $1)`;
    const params: unknown[] = [owner_id || "none"];
    let i = 2;
    if (category) { sql += ` AND category = $${i++}`; params.push(category); }
    if (search)   { sql += ` AND (name ILIKE $${i} OR description ILIKE $${i})`; params.push(`%${search}%`); i++; }
    sql += ` ORDER BY use_count DESC, created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, gpts: rows, total: rows.length });
  } catch (err) {
    logger.error({ err }, "[custom-gpts] list failed");
    res.status(500).json({ error: "Failed to list custom GPTs" });
  }
});

// ── GET /api/custom-gpts/:id ──────────────────────────────────────────────────
router.get("/custom-gpts/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    const { rows } = await pool.query("SELECT * FROM custom_gpts WHERE id=$1", [req.params["id"]]);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true, gpt: rows[0] });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// ── PUT /api/custom-gpts/:id ──────────────────────────────────────────────────
router.put("/custom-gpts/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const { name, description, system_prompt, starter_prompts, tools, model, temperature, is_public, category, avatar_url, owner_id } = req.body as Record<string, unknown>;
  try {
    const { rows } = await pool.query("SELECT owner_id FROM custom_gpts WHERE id=$1", [req.params["id"]]);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (rows[0].owner_id !== String(owner_id || "")) {
      res.status(403).json({ error: "Not authorized" }); return;
    }
    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const set = (col: string, val: unknown) => { updates.push(`${col}=$${i++}`); params.push(val); };
    if (name !== undefined)             set("name", String(name).slice(0, 80));
    if (description !== undefined)      set("description", String(description).slice(0, 500));
    if (system_prompt !== undefined)    set("system_prompt", String(system_prompt).slice(0, 8000));
    if (avatar_url !== undefined)       set("avatar_url", String(avatar_url));
    if (starter_prompts !== undefined)  set("starter_prompts", Array.isArray(starter_prompts) ? starter_prompts : []);
    if (tools !== undefined)            set("tools", JSON.stringify(Array.isArray(tools) ? tools : []));
    if (model !== undefined)            set("model", String(model));
    if (temperature !== undefined)      set("temperature", Number(temperature));
    if (is_public !== undefined)        set("is_public", Boolean(is_public));
    if (category !== undefined)         set("category", String(category));
    set("updated_at", new Date().toISOString());
    params.push(req.params["id"]);
    await pool.query(`UPDATE custom_gpts SET ${updates.join(",")} WHERE id=$${i}`, params);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[custom-gpts] update failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

// ── DELETE /api/custom-gpts/:id ───────────────────────────────────────────────
router.delete("/custom-gpts/:id", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const owner_id = (req.query["owner_id"] as string) || "";
  try {
    const { rows } = await pool.query("SELECT owner_id FROM custom_gpts WHERE id=$1", [req.params["id"]]);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (rows[0].owner_id !== owner_id) { res.status(403).json({ error: "Not authorized" }); return; }
    await pool.query("DELETE FROM custom_gpts WHERE id=$1", [req.params["id"]]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── POST /api/custom-gpts/:id/chat ────────────────────────────────────────────
router.post("/custom-gpts/:id/chat", async (req: Request, res: Response): Promise<void> => {
  await ready();
  try {
    const { rows } = await pool.query("SELECT * FROM custom_gpts WHERE id=$1", [req.params["id"]]);
    if (!rows[0]) { res.status(404).json({ error: "GPT not found" }); return; }
    const gpt = rows[0] as {
      name: string; system_prompt: string; model: string; temperature: number;
    };

    const { messages = [], memory = [] } = req.body as {
      messages?: { role: string; content: string }[];
      memory?: string[];
    };

    const memLine = memory.length > 0 ? `\n\nUser context:\n- ${memory.join("\n- ")}` : "";
    const systemContent = `You are ${gpt.name}.\n\n${gpt.system_prompt}${memLine}`;

    const chatMessages = [
      { role: "system" as const, content: systemContent },
      ...messages.filter(m => m.role === "user" || m.role === "assistant").map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let aborted = false;
    req.on("close", () => { aborted = true; });

    for await (const chunk of streamCompletion("personal", gpt.model, chatMessages, gpt.temperature)) {
      if (aborted) break;
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }
      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
      }
      if (chunk.done) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        break;
      }
    }

    if (!aborted) {
      await pool.query("UPDATE custom_gpts SET use_count = use_count + 1 WHERE id=$1", [req.params["id"]]);
      res.end();
    }
  } catch (err) {
    logger.error({ err }, "[custom-gpts] chat failed");
    try { res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`); res.end(); } catch { /* closed */ }
  }
});

// ── POST /api/custom-gpts/:id/clone ──────────────────────────────────────────
router.post("/custom-gpts/:id/clone", async (req: Request, res: Response): Promise<void> => {
  await ready();
  const owner_id = (req.body as Record<string, string>).owner_id || "anonymous";
  try {
    const { rows } = await pool.query("SELECT * FROM custom_gpts WHERE id=$1 AND is_public=true", [req.params["id"]]);
    if (!rows[0]) { res.status(404).json({ error: "Not found or not public" }); return; }
    const src = rows[0] as Record<string, unknown>;
    const { rows: newRows } = await pool.query(
      `INSERT INTO custom_gpts (owner_id, name, description, avatar_url, system_prompt, starter_prompts, tools, model, temperature, is_public, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10) RETURNING id`,
      [owner_id, `${src["name"]} (Clone)`, src["description"], src["avatar_url"],
       src["system_prompt"], src["starter_prompts"], src["tools"],
       src["model"], src["temperature"], src["category"]]
    );
    res.status(201).json({ ok: true, id: newRows[0].id });
  } catch { res.status(500).json({ error: "Clone failed" }); }
});

export default router;
