/**
 * Vector Database Service (pgvector)
 * ─────────────────────────────────────
 * Uses PostgreSQL pgvector extension for:
 *  - Storing embeddings (OpenAI text-embedding-3-small)
 *  - Semantic similarity search
 *  - RAG (Retrieval-Augmented Generation) document storage
 *
 * Tables:
 *  - vector_documents: stores document chunks with embeddings
 *  - vector_collections: logical groups of documents
 */

import { pool } from "../db.js";
import { logger } from "./logger.js";
import { getPersonalOpenAI } from "./ai-providers.js";

export interface VectorDocument {
  id: string;
  collection: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

// ── Table Setup ───────────────────────────────────────────────────────────────
export async function ensureVectorTables(): Promise<void> {
  try {
    // Enable pgvector extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Collections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vector_collections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        name VARCHAR NOT NULL UNIQUE,
        description TEXT,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Documents table with 1536-dim vector (text-embedding-3-small)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vector_documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        collection_id VARCHAR REFERENCES vector_collections(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}',
        token_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // IVFFlat index for fast approximate search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding
      ON vector_documents USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `).catch(() => {
      // Index creation may fail if there's not enough data yet — that's fine
    });

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_documents_collection
      ON vector_documents(collection_id)
    `);

    logger.info("[vector-db] Tables initialized");
  } catch (err) {
    logger.warn({ err }, "[vector-db] Setup failed — pgvector may not be available");
  }
}

// ── Embeddings ────────────────────────────────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const client = getPersonalOpenAI();
    if (!client) {
      logger.warn("[vector-db] No OpenAI client available — cannot generate embedding");
      return null;
    }
    const response = await client.embeddings.create({
      model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: text.slice(0, 8192), // max tokens
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    logger.error({ err }, "[vector-db] Failed to generate embedding");
    return null;
  }
}

// ── Collections ───────────────────────────────────────────────────────────────
export async function createCollection(
  name: string,
  description = "",
  userId?: string,
  isPublic = false,
): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO vector_collections (name, description, user_id, is_public)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
     RETURNING id`,
    [name, description, userId ?? null, isPublic],
  );
  return rows[0].id;
}

export async function listCollections(userId?: string): Promise<unknown[]> {
  const { rows } = await pool.query(
    `SELECT id, name, description, is_public, created_at,
            (SELECT COUNT(*)::int FROM vector_documents WHERE collection_id = vector_collections.id) AS doc_count
     FROM vector_collections
     WHERE user_id = $1 OR is_public = true
     ORDER BY created_at DESC`,
    [userId ?? null],
  );
  return rows;
}

// ── Documents ─────────────────────────────────────────────────────────────────
export async function upsertDocument(
  collectionId: string,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<string | null> {
  const embedding = await generateEmbedding(content);
  if (!embedding) return null;

  const tokenCount = Math.ceil(content.length / 4); // rough estimate
  const vectorStr = `[${embedding.join(",")}]`;

  const { rows } = await pool.query(
    `INSERT INTO vector_documents (collection_id, content, embedding, metadata, token_count)
     VALUES ($1, $2, $3::vector, $4, $5)
     RETURNING id`,
    [collectionId, content, vectorStr, JSON.stringify(metadata), tokenCount],
  );
  return rows[0]?.id ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
  await pool.query("DELETE FROM vector_documents WHERE id = $1", [id]);
}

// ── Semantic Search ───────────────────────────────────────────────────────────
export async function semanticSearch(
  query: string,
  collectionId: string,
  limit = 5,
  threshold = 0.7,
): Promise<VectorDocument[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const vectorStr = `[${embedding.join(",")}]`;

  const { rows } = await pool.query(
    `SELECT id, collection_id AS collection, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM vector_documents
     WHERE collection_id = $2
       AND 1 - (embedding <=> $1::vector) >= $3
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    [vectorStr, collectionId, threshold, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    collection: r.collection,
    content: r.content,
    metadata: r.metadata ?? {},
    similarity: r.similarity,
  }));
}

/** Multi-collection search */
export async function globalSemanticSearch(
  query: string,
  userId?: string,
  limit = 10,
  threshold = 0.65,
): Promise<VectorDocument[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const vectorStr = `[${embedding.join(",")}]`;

  const { rows } = await pool.query(
    `SELECT vd.id, vc.name AS collection, vd.content, vd.metadata,
            1 - (vd.embedding <=> $1::vector) AS similarity
     FROM vector_documents vd
     JOIN vector_collections vc ON vd.collection_id = vc.id
     WHERE (vc.user_id = $2 OR vc.is_public = true)
       AND 1 - (vd.embedding <=> $1::vector) >= $3
     ORDER BY vd.embedding <=> $1::vector
     LIMIT $4`,
    [vectorStr, userId ?? null, threshold, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    collection: r.collection,
    content: r.content,
    metadata: r.metadata ?? {},
    similarity: r.similarity,
  }));
}

/** Chunk and embed a long text document */
export async function indexDocument(
  collectionId: string,
  text: string,
  metadata: Record<string, unknown> = {},
  chunkSize = 512,
  chunkOverlap = 64,
): Promise<number> {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk);
  }

  let indexed = 0;
  for (const chunk of chunks) {
    const id = await upsertDocument(collectionId, chunk, { ...metadata, chunkIndex: indexed });
    if (id) indexed++;
  }

  logger.info({ collectionId, chunks: chunks.length, indexed }, "[vector-db] Document indexed");
  return indexed;
}
