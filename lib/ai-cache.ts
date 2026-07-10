/**
 * AI Cache Manager for Yode9 / MR7.AI
 * =====================================
 * استراتيجية التخزين المؤقت المتدرج للردود
 */

import crypto from 'crypto';

export interface CacheEntry {
  response: string;
  tokens: number;
  model: string;
  provider: string;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalTokensSaved: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

export class AICacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private totalTokensSaved = 0;

  private generateKey(message: string, model: string, systemPrompt?: string): string {
    const content = `${model}:${systemPrompt ?? ''}:${message}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  get(message: string, model: string, systemPrompt?: string): CacheEntry | null {
    const key = this.generateKey(message, model, systemPrompt);
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    this.totalTokensSaved += entry.tokens;
    return entry;
  }

  set(
    message: string,
    model: string,
    response: string,
    tokens: number,
    provider: string,
    systemPrompt?: string,
    ttlMs: number = DEFAULT_TTL_MS
  ): void {
    if (this.memoryCache.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const key = this.generateKey(message, model, systemPrompt);
    const entry: CacheEntry = {
      response,
      tokens,
      model,
      provider,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
    };

    this.memoryCache.set(key, entry);
  }

  delete(message: string, model: string, systemPrompt?: string): boolean {
    const key = this.generateKey(message, model, systemPrompt);
    return this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
    this.hits = 0;
    this.misses = 0;
    this.totalTokensSaved = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.memoryCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      totalTokensSaved: this.totalTokensSaved,
    };
  }
}

export const globalAICache = new AICacheManager();

setInterval(() => {
  globalAICache.cleanup();
}, 60 * 1000);
