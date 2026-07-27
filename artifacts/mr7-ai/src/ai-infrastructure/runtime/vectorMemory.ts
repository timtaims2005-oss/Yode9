import type { JsonValue } from "../types";

export type MemoryRecord = { id: string; text: string; layer: "stm" | "ltm"; metadata?: Record<string, JsonValue>; createdAt: number };
export interface VectorStore {
  upsert(record: MemoryRecord): Promise<void>;
  search(query: string, limit?: number): Promise<MemoryRecord[]>;
}

function tokens(value: string): Set<string> { return new Set(value.toLowerCase().split(/\W+/).filter((token) => token.length > 2)); }

export class LexicalVectorStore implements VectorStore {
  private readonly records = new Map<string, MemoryRecord>();
  async upsert(record: MemoryRecord): Promise<void> { this.records.set(record.id, record); }
  async search(query: string, limit = 8): Promise<MemoryRecord[]> {
    const queryTokens = tokens(query);
    return [...this.records.values()]
      .map((record) => ({ record, score: [...tokens(record.text)].filter((token) => queryTokens.has(token)).length }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.record);
  }
}
