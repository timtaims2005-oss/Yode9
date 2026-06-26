import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { logger } from "../lib/logger";
import { validateBody, validateQuery } from "../middlewares/validateBody";

const router = Router();

const getSchema = z.object({
  deviceId: z.string().min(4).max(128),
});

const postSchema = z.object({
  deviceId: z.string().min(4).max(128),
  chats: z.array(z.unknown()).max(500),
});

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

// POST /cloud-chats
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
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "cloud-chats POST error");
    return res.status(500).json({ error: "Database error." });
  }
});

export default router;
