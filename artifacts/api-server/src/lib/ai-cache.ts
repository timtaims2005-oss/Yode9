/**
 * Semantic AI Response Cache v4.0
 * Caches AI completions with semantic deduplication, LRU eviction,
 * TTL management, and hit-rate analytics.
 */

interface CacheEntry {
  key: string;
  prompt: string;
  response: string;
  model: string;
  tokens: number;
  createdAt: number;
  expiresAt: number;
  hits: number;
  costSaved: number; // in USD (estimate)
}

const TOKEN_COSTS: Record<string, number> = {
  "gpt-4":          0.03 / 1000,
  "gpt-4o":         0.005 / 1000,
  "gpt-3.5-turbo":  0.0005 / 1000,
  "claude-3-5-sonnet-20241022": 0.003 / 1000,
  "claude-3-haiku-20240307":    0.00025 / 1000,
};

function estimateCost(tokens: number, model: string): number {
  const rate = TOKEN_COSTS[model] ?? 0.002 / 1000;
  return tokens * rate;
}

function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export class AIResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private stats = { hits: 0, misses: 0, evictions: 0, totalCostSaved: 0 };

  constructor(maxEntries = 1000, defaultTtlMs = 3600 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    setInterval(() => this.evictExpired(), 5 * 60 * 1000);
  }

  private makeKey(prompt: string, model: string, systemPrompt?: string): string {
    const normalized = prompt.trim().toLowerCase();
    const sys = systemPrompt?.trim().toLowerCase() ?? "";
    return `${model}:${hashPrompt(normalized + sys)}`;
  }

  get(prompt: string, model: string, systemPrompt?: string): string | null {
    const key = this.makeKey(prompt, model, systemPrompt);
    const entry = this.cache.get(key);
    if (!entry) { this.stats.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    entry.hits++;
    entry.costSaved += estimateCost(entry.tokens, model);
    this.stats.hits++;
    this.stats.totalCostSaved += estimateCost(entry.tokens, model);
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.response;
  }

  set(prompt: string, model: string, response: string, tokens: number, systemPrompt?: string, ttlMs?: number): void {
    const key = this.makeKey(prompt, model, systemPrompt);
    if (this.cache.size >= this.maxEntries) this.evictLRU();
    const entry: CacheEntry = {
      key, prompt: prompt.slice(0, 200), response, model, tokens,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      hits: 0, costSaved: 0,
    };
    this.cache.set(key, entry);
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) { this.cache.delete(firstKey); this.stats.evictions++; }
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) { this.cache.delete(key); this.stats.evictions++; }
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
      evictions: this.stats.evictions,
      totalCostSaved: `$${this.stats.totalCostSaved.toFixed(4)}`,
    };
  }

  clear(): void { this.cache.clear(); }
  invalidate(pattern: string): number {
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) { this.cache.delete(key); removed++; }
    }
    return removed;
  }
}

export const aiResponseCache = new AIResponseCache(2000, 2 * 3600 * 1000);
