/**
 * Vector Search API (pgvector)
 * ──────────────────────────────
 * POST /api/vector/collections              → create collection
 * GET  /api/vector/collections              → list collections
 * POST /api/vector/collections/:id/index    → index a document
 * POST /api/vector/collections/:id/search   → semantic search
 * POST /api/vector/search                   → global search across all collections
 * DELETE /api/vector/documents/:id          → delete document
 */

import { Router, type Request, type Response } from "express";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth.js";
import {
  ensureVectorTables,
  createCollection,
  listCollections,
  indexDocument,
  semanticSearch,
  globalSemanticSearch,
  deleteDocument,
  upsertDocument,
} from "../lib/vector-db.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.use(jwtAuth);

// ── Initialize tables on first use ────────────────────────────────────────────
let tablesReady = false;
async function ensureTables() {
  if (!tablesReady) {
    await ensureVectorTables();
    tablesReady = true;
  }
}

// ── POST /api/vector/collections ──────────────────────────────────────────────
router.post("/vector/collections", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const { name, description, isPublic } = req.body as {
      name?: string; description?: string; isPublic?: boolean;
    };
    if (!name?.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const id = await createCollection(name.trim(), description ?? "", req.authUser!.id, isPublic ?? false);
    res.status(201).json({ ok: true, id, name });
  } catch (err) {
    logger.error({ err }, "[vector] Create collection failed");
    res.status(500).json({ error: "Failed to create collection" });
  }
});

// ── GET /api/vector/collections ───────────────────────────────────────────────
router.get("/vector/collections", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const collections = await listCollections(req.authUser!.id);
    res.json({ ok: true, collections });
  } catch (err) {
    logger.error({ err }, "[vector] List collections failed");
    res.status(500).json({ error: "Failed to list collections" });
  }
});

// ── POST /api/vector/collections/:id/index ────────────────────────────────────
router.post("/vector/collections/:id/index", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const { text, metadata, chunkSize, chunkOverlap } = req.body as {
      text?: string;
      metadata?: Record<string, unknown>;
      chunkSize?: number;
      chunkOverlap?: number;
    };

    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > 500_000) {
      res.status(400).json({ error: "text too large (max 500KB)" });
      return;
    }

    const indexed = await indexDocument(
      req.params.id,
      text,
      metadata ?? {},
      chunkSize ?? 512,
      chunkOverlap ?? 64,
    );
    res.json({ ok: true, chunksIndexed: indexed });
  } catch (err) {
    logger.error({ err }, "[vector] Index document failed");
    res.status(500).json({ error: "Failed to index document" });
  }
});

// ── POST /api/vector/collections/:id/add ─────────────────────────────────────
router.post("/vector/collections/:id/add", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const { content, metadata } = req.body as { content?: string; metadata?: Record<string, unknown> };
    if (!content?.trim()) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const docId = await upsertDocument(req.params.id, content, metadata ?? {});
    if (!docId) {
      res.status(500).json({ error: "Failed to generate embedding" });
      return;
    }
    res.status(201).json({ ok: true, id: docId });
  } catch (err) {
    logger.error({ err }, "[vector] Add document failed");
    res.status(500).json({ error: "Failed to add document" });
  }
});

// ── POST /api/vector/collections/:id/search ───────────────────────────────────
router.post("/vector/collections/:id/search", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const { query, limit, threshold } = req.body as {
      query?: string; limit?: number; threshold?: number;
    };
    if (!query?.trim()) {
      res.status(400).json({ error: "query is required" });
      return;
    }
    const results = await semanticSearch(
      query,
      req.params.id,
      Math.min(limit ?? 5, 20),
      threshold ?? 0.7,
    );
    res.json({ ok: true, results });
  } catch (err) {
    logger.error({ err }, "[vector] Search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

// ── POST /api/vector/search ───────────────────────────────────────────────────
router.post("/vector/search", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const { query, limit, threshold } = req.body as {
      query?: string; limit?: number; threshold?: number;
    };
    if (!query?.trim()) {
      res.status(400).json({ error: "query is required" });
      return;
    }
    const results = await globalSemanticSearch(
      query,
      req.authUser!.id,
      Math.min(limit ?? 10, 20),
      threshold ?? 0.65,
    );
    res.json({ ok: true, results });
  } catch (err) {
    logger.error({ err }, "[vector] Global search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

// ── DELETE /api/vector/documents/:id ─────────────────────────────────────────
router.delete("/vector/documents/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteDocument(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[vector] Delete document failed");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ── GET /api/vector/status ────────────────────────────────────────────────────
router.get("/vector/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.json({ ok: true, available: true, extension: "pgvector" });
  } catch {
    res.json({ ok: false, available: false, error: "pgvector not available" });
  }
});

export default router;
