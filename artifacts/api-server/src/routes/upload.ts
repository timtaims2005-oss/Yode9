/**
 * File Upload API
 * ────────────────
 * POST /api/upload              → upload a file (authenticated)
 * GET  /api/upload/my-files     → list user's uploaded files
 * DELETE /api/upload/:key       → delete a file
 * GET  /api/upload/url/:key     → get download URL
 *
 * Supports local disk and S3/Cloudflare R2.
 * Files stored under: {prefix}/{userId}/{timestamp}-{random}.{ext}
 */

import { Router, type Request, type Response } from "express";
import multer from "multer";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth.js";
import {
  getStorage,
  generateStorageKey,
  MAX_UPLOAD_SIZE,
  ALLOWED_MIME_TYPES,
} from "../lib/storage.js";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";
import { triggerEvent } from "../lib/webhooks.js";

const router = Router();

// ── Multer (in-memory, 50MB limit) ───────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ── DB setup ──────────────────────────────────────────────────────────────────
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      storage_key VARCHAR NOT NULL,
      original_name VARCHAR NOT NULL,
      mime_type VARCHAR NOT NULL,
      size INTEGER NOT NULL,
      url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id, created_at DESC);
  `).catch(() => {});
}

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post(
  "/upload",
  jwtAuth,
  requireAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: `File too large. Max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTable();

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const { buffer, originalname, mimetype, size } = req.file;
      const userId = req.authUser!.id;
      const prefix = (req.body.prefix as string) ?? "uploads";

      const key = generateStorageKey(userId, originalname, prefix);
      const storage = getStorage();
      const uploaded = await storage.upload(buffer, key, mimetype, originalname);

      // Save metadata to DB
      const { rows } = await pool.query(
        `INSERT INTO uploaded_files (user_id, storage_key, original_name, mime_type, size, url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, storage_key, original_name, mime_type, size, url, created_at`,
        [userId, key, originalname, mimetype, size, uploaded.url],
      );

      // Trigger webhook event
      triggerEvent("file.uploaded", {
        fileId: rows[0].id,
        name: originalname,
        size,
        mimeType: mimetype,
      }, userId).catch(() => {});

      logger.info({ userId, key, size }, "[upload] File uploaded");
      res.status(201).json({ ok: true, file: rows[0] });
    } catch (err) {
      logger.error({ err }, "[upload] Upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

// ── GET /api/upload/my-files ──────────────────────────────────────────────────
router.get("/upload/my-files", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, storage_key, original_name, mime_type, size, url, created_at
       FROM uploaded_files WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 100`,
      [req.authUser!.id],
    );
    res.json({ ok: true, files: rows });
  } catch (err) {
    logger.error({ err }, "[upload] List files failed");
    res.status(500).json({ error: "Failed to list files" });
  }
});

// ── GET /api/upload/url/:key ──────────────────────────────────────────────────
router.get("/upload/url/:key", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params.key;
    // Verify ownership
    const { rows } = await pool.query(
      "SELECT url FROM uploaded_files WHERE storage_key=$1 AND user_id=$2",
      [key, req.authUser!.id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const storage = getStorage();
    const url = await storage.getUrl(key);
    res.json({ ok: true, url });
  } catch (err) {
    logger.error({ err }, "[upload] Get URL failed");
    res.status(500).json({ error: "Failed to get file URL" });
  }
});

// ── DELETE /api/upload/:id ────────────────────────────────────────────────────
router.delete("/upload/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      "SELECT storage_key FROM uploaded_files WHERE id=$1 AND user_id=$2",
      [String(req.params.id), req.authUser!.id],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const storage = getStorage();
    await storage.delete(rows[0].storage_key);
    await pool.query("DELETE FROM uploaded_files WHERE id=$1", [String(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[upload] Delete failed");
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
