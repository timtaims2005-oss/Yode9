import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { logger } from "../lib/logger";
import { validateBody, validateQuery } from "../middlewares/validateBody";
import {
  ensureVectorTables,
  createCollection,
  upsertDocument,
  semanticSearch,
} from "../lib/vector-db.js";

const router = Router();

const getSchema = z.object({
  deviceId: z.string().min(4).max(128),
});

const postSchema = z.object({
  deviceId: z.string().min(4).max(128),
  chats: z.array(z.unknown()).max(500),
});

const searchSchema = z.object({
  query: z.string().min(1).max(1024),
  deviceId: z.string().min(4).max(128),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});

// ── Vector indexing helper ─────────────────────────────────────────────────────
let _vectorReady = false;
async function ensureVector() {
  if (!_vectorReady) {
    await ensureVectorTables();
    _vectorReady = true;
  }
}

async function indexChats(deviceId: string, chats: unknown[]): Promise<void> {
  try {
    await ensureVector();
    const collectionName = `chats-${deviceId}`;
    const collectionId = await createCollection(collectionName, `Chat history for device ${deviceId}`);

    for (const chat of chats) {
      const c = chat as { id?: string; title?: string; messages?: Array<{ role?: string; content?: string }> };
      if (!c?.messages?.length) continue;

      const lastN = c.messages.slice(-6);
      const text = lastN
        .map((m) => `[${m.role ?? "user"}]: ${(m.content ?? "").slice(0, 800)}`)
        .join("\n");

      if (!text.trim()) continue;

      await upsertDocument(collectionId, text, {
        chatId: c.id ?? "",
        title: c.title ?? "",
        deviceId,
        messageCount: c.messages.length,
      });
    }
  } catch (err) {
    logger.warn({ err }, "[cloud-chats] Background vector indexing failed (non-fatal)");
  }
}

// GET /cloud-chats?deviceId=
router.get("/cloud-chats", validateQuery(getSchema), async (req, res) => {
  const { deviceId } = req.query as { deviceId: string };
  try {
    const result = await pool.query(
      "SELECT chats_json, updated_at FROM cloud_chats WHERE device_id = $1",
      [deviceId],
    );
    if (result.rows.length === 0) {
      return res.json({ chats: [], updatedAt: null });
    }
    return res.json({
      chats: result.rows[0].chats_json,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    logger.error({ err }, "cloud-chats GET error");
    return res.status(500).json({ error: "Database error." });
  }
});

// POST /cloud-chats — save + background-index into vector DB
router.post("/cloud-chats", validateBody(postSchema), async (req, res) => {
  const { deviceId, chats } = req.body as { deviceId: string; chats: unknown[] };
  try {
    await pool.query(
      `INSERT INTO cloud_chats (device_id, chats_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (device_id) DO UPDATE
         SET chats_json = $2::jsonb, updated_at = NOW()`,
      [deviceId, JSON.stringify(chats)],
    );
    // Background vector indexing — don't await, not critical path
    indexChats(deviceId, chats).catch(() => {});
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "cloud-chats POST error");
    return res.status(500).json({ error: "Database error." });
  }
});

// POST /chats/search — semantic search through indexed chat messages
router.post("/chats/search", validateBody(searchSchema), async (req, res) => {
  const { query, deviceId, limit } = req.body as { query: string; deviceId: string; limit: number };
  try {
    await ensureVector();
    const collectionName = `chats-${deviceId}`;

    // Find the collection ID
    const colResult = await pool.query(
      "SELECT id FROM vector_collections WHERE name = $1 LIMIT 1",
      [collectionName],
    );
    if (colResult.rows.length === 0) {
      return res.json({ results: [], total: 0, message: "No indexed chats found for this device." });
    }

    const collectionId = colResult.rows[0].id as string;
    const results = await semanticSearch(query, collectionId, limit, 0.5);

    return res.json({
      results: results.map((r) => ({
        chatId: (r.metadata as Record<string, unknown>).chatId ?? "",
        title: (r.metadata as Record<string, unknown>).title ?? "",
        snippet: r.content.slice(0, 300),
        similarity: Math.round((r.similarity ?? 0) * 100) / 100,
      })),
      total: results.length,
    });
  } catch (err) {
    logger.error({ err }, "[chats/search] Semantic search error");
    return res.status(500).json({ error: "Search failed." });
  }
});

export default router;
