import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.get("/cloud-chats", async (req, res) => {
  const deviceId = req.query.deviceId as string;
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  try {
    const result = await pool.query(
      "SELECT chats_json, updated_at FROM cloud_chats WHERE device_id = $1",
      [deviceId]
    );
    if (result.rows.length === 0) {
      return res.json({ chats: [], updatedAt: null });
    }
    return res.json({
      chats: result.rows[0].chats_json,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    console.error("cloud-chats GET error:", err);
    return res.status(500).json({ error: "db error" });
  }
});

router.post("/cloud-chats", async (req, res) => {
  const { deviceId, chats } = req.body as { deviceId: string; chats: unknown[] };
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  if (!Array.isArray(chats)) return res.status(400).json({ error: "chats must be array" });
  try {
    await pool.query(
      `INSERT INTO cloud_chats (device_id, chats_json, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (device_id) DO UPDATE
         SET chats_json = $2, updated_at = NOW()`,
      [deviceId, JSON.stringify(chats)]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("cloud-chats POST error:", err);
    return res.status(500).json({ error: "db error" });
  }
});

export default router;
