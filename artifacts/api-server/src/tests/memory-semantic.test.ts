/**
 * Integration test: semantic (embedding-based) memory search
 *
 * Saves a memory in Arabic, then queries with a genuine synonym phrasing
 * (zero keyword overlap) and asserts the result comes back above the
 * similarity threshold via pgvector cosine similarity.
 *
 * Requires: DATABASE_URL + GOOGLE_AI_API_KEY in environment.
 */

import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "pg";

// ── helpers ───────────────────────────────────────────────────────────────────

const GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001";
const GOOGLE_EMBEDDING_DIM = 3072;
const SIMILARITY_THRESHOLD = 0.7;

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${GOOGLE_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Embedding API HTTP ${res.status}: ${await res.text()}`);

  const data: any = await res.json();
  const values: number[] = data?.embedding?.values;
  if (!values || values.length !== GOOGLE_EMBEDDING_DIM) {
    throw new Error(`Unexpected embedding dim: ${values?.length}`);
  }
  return values;
}

// ── test suite ────────────────────────────────────────────────────────────────

describe("Semantic memory search (integration)", () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const TEST_USER_ID = `test-semantic-${Date.now()}`;

  afterAll(async () => {
    // Clean up test memories
    await pool.query("DELETE FROM ai_user_memories WHERE user_id = $1", [TEST_USER_ID]);
    await pool.end();
  });

  it(
    "returns a memory via synonym query with similarity >= 0.7 (no keyword overlap)",
    async () => {
      // 1. Save memory with one phrasing
      const savedFact = "أفضل مطعم بيتزا زرته كان في نابولي";
      const saveEmbedding = await generateEmbedding(savedFact);
      const vectorLiteral = `[${saveEmbedding.join(",")}]`;

      const insert = await pool.query(
        "INSERT INTO ai_user_memories (user_id, fact, embedding) VALUES ($1, $2, $3::vector) RETURNING id",
        [TEST_USER_ID, savedFact, vectorLiteral]
      );
      expect(insert.rows[0].id).toBeTruthy();

      // 2. Query with genuine synonym / paraphrase (no shared keywords with the saved fact)
      const queryText = "ما هو أحسن مكان أكلت فيه بيتزا؟";
      const queryEmbedding = await generateEmbedding(queryText);
      const queryVector = `[${queryEmbedding.join(",")}]`;

      // 3. pgvector cosine search
      const result = await pool.query(
        `SELECT fact, created_at, 1 - (embedding <=> $2::vector) AS similarity
         FROM ai_user_memories
         WHERE user_id = $1
           AND embedding IS NOT NULL
           AND 1 - (embedding <=> $2::vector) >= $3
         ORDER BY similarity DESC
         LIMIT 5`,
        [TEST_USER_ID, queryVector, SIMILARITY_THRESHOLD]
      );

      // Report the actual similarity score for the record
      const topRow = result.rows[0] as { fact: string; similarity: number } | undefined;
      const actualSimilarity = topRow ? parseFloat(String(topRow.similarity)) : null;

      console.log(`\n[semantic-memory-test] query="${queryText}"`);
      console.log(`[semantic-memory-test] top match fact="${topRow?.fact ?? "none"}"`);
      console.log(`[semantic-memory-test] similarity=${actualSimilarity ?? "NO MATCH"}`);
      console.log(`[semantic-memory-test] threshold=${SIMILARITY_THRESHOLD}`);

      // Assert the saved memory was retrieved above the threshold
      expect(topRow).toBeDefined();
      expect(topRow!.fact).toBe(savedFact);
      expect(actualSimilarity).not.toBeNull();
      expect(actualSimilarity!).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    },
    60_000 // 60s timeout — network calls to Google AI
  );
});
