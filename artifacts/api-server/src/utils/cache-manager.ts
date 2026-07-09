// In-memory cache manager with TTL support
interface CacheEntry {
  value: any;
  expiresAt: number;
  hits: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 1000, defaultTTLSeconds = 300) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    entry.hits++;
    this.hits++;
    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxSize) this.evict();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL),
      hits: 0
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return false; }
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(prefix?: string): void {
    if (!prefix) { this.cache.clear(); return; }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%'
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }

  private evict(): void {
    // LRU-like: remove entry with least hits
    let minHits = Infinity;
    let lruKey = '';
    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) { minHits = entry.hits; lruKey = key; }
    }
    if (lruKey) this.cache.delete(lruKey);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton global cache
export const globalCache = new CacheManager(2000, 600);

// Cache-aware fetch wrapper
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300,
  cache = globalCache
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const result = await fetchFn();
  cache.set(key, result, ttlSeconds);
  return result;
}

export default CacheManager;
