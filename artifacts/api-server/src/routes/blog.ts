/**
 * Blog / CMS API
 * POST   /api/blog/posts              — create post (admin)
 * GET    /api/blog/posts              — list posts (public, paginated)
 * GET    /api/blog/posts/:slug        — single post (public)
 * PATCH  /api/blog/posts/:id          — update post (admin)
 * DELETE /api/blog/posts/:id          — delete post (admin)
 * GET    /api/blog/sitemap            — slugs for sitemap generation
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { logger } from "../lib/logger.js";
import { validateBody, validateQuery } from "../middlewares/validateBody.js";
import { internalAuth } from "../middlewares/internalAuth.js";
import { cacheGet, cacheSet } from "../lib/redis.js";

const router = Router();

// ── Table bootstrap ────────────────────────────────────────────────────────────
let _ready = false;
async function ensureBlogTables(): Promise<void> {
  if (_ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      slug        VARCHAR UNIQUE NOT NULL,
      title       VARCHAR(512) NOT NULL,
      excerpt     TEXT DEFAULT '',
      content     TEXT NOT NULL,
      author_id   VARCHAR DEFAULT 'admin',
      author_name VARCHAR(256) DEFAULT 'KaliGPT Team',
      status      VARCHAR(32) DEFAULT 'draft',
      tags        JSONB DEFAULT '[]',
      cover_url   VARCHAR(1024) DEFAULT '',
      seo_title   VARCHAR(512) DEFAULT '',
      seo_desc    TEXT DEFAULT '',
      views       INTEGER DEFAULT 0,
      reading_min INTEGER DEFAULT 1,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_slug   ON blog_posts(slug);
  `).catch(() => {});
  _ready = true;
}

// ── Schemas ────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  title:       z.string().min(1).max(512),
  content:     z.string().min(1),
  slug:        z.string().regex(/^[a-z0-9-]+$/).optional(),
  excerpt:     z.string().max(1024).optional().default(""),
  authorName:  z.string().max(256).optional().default("KaliGPT Team"),
  status:      z.enum(["draft", "published", "archived"]).optional().default("draft"),
  tags:        z.array(z.string()).optional().default([]),
  coverUrl:    z.string().max(1024).optional().default(""),
  seoTitle:    z.string().max(512).optional().default(""),
  seoDesc:     z.string().max(1024).optional().default(""),
  readingMin:  z.coerce.number().int().min(1).optional().default(1),
});

const listQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.enum(["draft", "published", "archived"]).optional().default("published"),
  tag:    z.string().optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ── GET /api/blog/posts ────────────────────────────────────────────────────────
router.get("/blog/posts", validateQuery(listQuerySchema), async (req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  const { page, limit, status, tag } = req.query as unknown as {
    page: number; limit: number; status: string; tag?: string;
  };
  const offset = (page - 1) * limit;
  const cacheKey = `blog:list:${status}:${tag ?? "all"}:${page}:${limit}`;

  const cached = await cacheGet<string>(cacheKey);
  if (cached) { res.json(JSON.parse(cached)); return; }

  try {
    let whereClause = "WHERE status = $1";
    const params: (string | number)[] = [status, limit, offset];
    if (tag) {
      whereClause += " AND tags @> $4::jsonb";
      params.push(JSON.stringify([tag]));
    }

    const { rows } = await pool.query(
      `SELECT id, slug, title, excerpt, author_name, tags, cover_url,
              seo_title, seo_desc, views, reading_min, status, created_at, updated_at
       FROM blog_posts ${whereClause}
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      params,
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM blog_posts ${whereClause}`,
      [params[0], ...(tag ? [params[3]] : [])],
    );

    const payload = { posts: rows, total: countRows[0].total, page, limit };
    await cacheSet(cacheKey, JSON.stringify(payload), 60);
    res.json(payload);
  } catch (err) {
    logger.error({ err }, "[blog] List posts failed");
    res.status(500).json({ error: "Failed to fetch posts." });
  }
});

// ── GET /api/blog/posts/:slug ──────────────────────────────────────────────────
router.get("/blog/posts/:slug", async (req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  const { slug } = req.params;
  const cacheKey = `blog:post:${slug}`;
  const cached = await cacheGet<string>(cacheKey);
  if (cached) { res.json(JSON.parse(cached)); return; }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM blog_posts WHERE slug = $1 AND status = 'published' LIMIT 1",
      [slug],
    );
    if (!rows.length) { res.status(404).json({ error: "Post not found." }); return; }
    // Increment view count async
    pool.query("UPDATE blog_posts SET views = views + 1 WHERE slug = $1", [slug]).catch(() => {});
    await cacheSet(cacheKey, JSON.stringify(rows[0]), 120);
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err }, "[blog] Get post failed");
    res.status(500).json({ error: "Failed to fetch post." });
  }
});

// ── GET /api/blog/sitemap ──────────────────────────────────────────────────────
router.get("/blog/sitemap", async (_req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  try {
    const { rows } = await pool.query(
      "SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY updated_at DESC",
    );
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "[blog] Sitemap failed");
    res.status(500).json({ error: "Failed." });
  }
});

// ── POST /api/blog/posts (admin) ───────────────────────────────────────────────
router.post("/blog/posts", internalAuth, validateBody(createSchema), async (req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  const b = req.body as z.infer<typeof createSchema>;
  const slug = b.slug ?? slugify(b.title);

  try {
    const { rows } = await pool.query(
      `INSERT INTO blog_posts
         (slug, title, excerpt, content, author_name, status, tags,
          cover_url, seo_title, seo_desc, reading_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
       RETURNING id, slug`,
      [slug, b.title, b.excerpt, b.content, b.authorName, b.status,
       JSON.stringify(b.tags), b.coverUrl, b.seoTitle, b.seoDesc, b.readingMin],
    );
    res.status(201).json({ ok: true, id: rows[0].id, slug: rows[0].slug });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") { res.status(409).json({ error: "Slug already exists." }); return; }
    logger.error({ err }, "[blog] Create post failed");
    res.status(500).json({ error: "Failed to create post." });
  }
});

// ── PATCH /api/blog/posts/:id (admin) ─────────────────────────────────────────
router.patch("/blog/posts/:id", internalAuth, async (req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  const { id } = req.params;
  const allowed = ["title","excerpt","content","author_name","status","tags","cover_url","seo_title","seo_desc","reading_min"];
  const updates: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  const body = req.body as Record<string, unknown>;
  for (const key of allowed) {
    const camel = key.replace(/_([a-z])/g, (_,c) => c.toUpperCase());
    const val = body[camel] ?? body[key];
    if (val !== undefined) {
      updates.push(`${key} = $${idx++}`);
      vals.push(key === "tags" ? JSON.stringify(val) : val);
    }
  }
  if (!updates.length) { res.status(400).json({ error: "Nothing to update." }); return; }
  updates.push(`updated_at = NOW()`);
  vals.push(id);

  try {
    const result = await pool.query(
      `UPDATE blog_posts SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, slug`,
      vals,
    );
    if (!result.rows.length) { res.status(404).json({ error: "Post not found." }); return; }
    // Bust cache
    const slug = result.rows[0].slug as string;
    pool.query("SELECT 1").then(() => cacheSet(`blog:post:${slug}`, "", -1)).catch(() => {});
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    logger.error({ err }, "[blog] Update post failed");
    res.status(500).json({ error: "Failed to update post." });
  }
});

// ── DELETE /api/blog/posts/:id (admin) ────────────────────────────────────────
router.delete("/blog/posts/:id", internalAuth, async (req: Request, res: Response): Promise<void> => {
  await ensureBlogTables();
  try {
    const result = await pool.query("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) { res.status(404).json({ error: "Post not found." }); return; }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[blog] Delete post failed");
    res.status(500).json({ error: "Failed to delete post." });
  }
});

export default router;
