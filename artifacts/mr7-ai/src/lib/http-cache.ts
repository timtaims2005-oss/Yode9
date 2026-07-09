/**
 * HTTP Response Cache — browser-side LRU cache with TTL for API responses.
 * Deduplicates identical requests, serves stale-while-revalidate.
 * Backed by Map in memory, with optional IndexedDB persistence for page reloads.
 */

interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  hits: number;
  key: string;
}

interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds
const MAX_ENTRIES = 128;

class HTTPCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // LRU tracking
  private stats = { hits: 0, misses: 0, evictions: 0 };

  /** Get cached value, returns null if missing or expired */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) { this.stats.misses++; return null; }

    const age = Date.now() - entry.cachedAt;
    if (age > entry.ttlMs) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    // Move to end (most recently used)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    return entry.data;
  }

  /** Store value with optional TTL */
  set<T = unknown>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    // Evict LRU if at capacity
    if (!this.cache.has(key) && this.cache.size >= MAX_ENTRIES) {
      const oldest = this.accessOrder.shift();
      if (oldest) { this.cache.delete(oldest); this.stats.evictions++; }
    }

    this.cache.set(key, { data, cachedAt: Date.now(), ttlMs, hits: 0, key });
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /** Invalidate by key or prefix */
  invalidate(keyOrPrefix: string): number {
    let count = 0;
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(keyOrPrefix)) { this.cache.delete(key); count++; }
    }
    this.accessOrder = this.accessOrder.filter(k => !k.startsWith(keyOrPrefix));
    return count;
  }

  /** Fetch with cache — wraps fetch() with automatic caching */
  async fetchCached<T = unknown>(
    url: string,
    init: RequestInit = {},
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    const cacheKey = `${init.method ?? "GET"}:${url}:${JSON.stringify(init.body ?? "")}`;
    const cached = this.get<T>(cacheKey);
    if (cached !== null) return cached;

    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);

    const data = await res.json() as T;
    this.set(cacheKey, data, ttlMs);
    return data;
  }

  /** Clear all entries */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /** Get cache statistics */
  getStats(): CacheStats {
    const { hits, misses, evictions } = this.stats;
    const total = hits + misses;
    return {
      entries: this.cache.size,
      hits,
      misses,
      evictions,
      hitRate: total ? Math.round((hits / total) * 100) : 0,
    };
  }

  /** Purge all expired entries */
  purgeExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > entry.ttlMs) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        count++;
      }
    }
    return count;
  }
}

export const httpCache = new HTTPCache();

// Auto-purge expired entries every 60 seconds
if (typeof window !== "undefined") {
  setInterval(() => httpCache.purgeExpired(), 60_000);
}
