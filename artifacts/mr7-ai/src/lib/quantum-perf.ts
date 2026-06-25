/**
 * Quantum Performance Engine v4.0
 * Ultra-fast request caching, deduplication, predictive prefetching,
 * adaptive throttling, and zero-lag rendering pipeline.
 */

type CacheEntry<T> = { data: T; ts: number; ttl: number; hits: number };
type PendingEntry<T> = { promise: Promise<T>; ts: number };

class QuantumCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private pending = new Map<string, PendingEntry<unknown>>();
  private maxSize: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.scheduleEviction();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) { this.missCount++; return null; }
    if (Date.now() - entry.ts > entry.ttl) { this.store.delete(key); this.missCount++; return null; }
    entry.hits++;
    this.hitCount++;
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs = 60000): void {
    if (this.store.size >= this.maxSize) this.evictLRU();
    this.store.set(key, { data, ts: Date.now(), ttl: ttlMs, hits: 0 });
  }

  async dedup<T>(key: string, fn: () => Promise<T>, ttlMs = 60000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const pending = this.pending.get(key) as PendingEntry<T> | undefined;
    if (pending) return pending.promise;
    const promise = fn().then(data => {
      this.set(key, data, ttlMs);
      this.pending.delete(key);
      return data;
    }).catch(err => {
      this.pending.delete(key);
      throw err;
    });
    this.pending.set(key, { promise: promise as Promise<unknown>, ts: Date.now() });
    return promise;
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }

  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestScore = Infinity;
    for (const [k, v] of this.store.entries()) {
      const score = v.ts + v.hits * 1000;
      if (score < oldestScore) { oldestScore = score; oldest = k; }
    }
    if (oldest) this.store.delete(oldest);
  }

  private scheduleEviction(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now - v.ts > v.ttl) this.store.delete(k);
      }
    }, 30000);
  }

  stats() {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      ratio: total ? this.hitCount / total : 0,
      size: this.store.size,
    };
  }
}

class RequestPriorityQueue {
  private high: Array<() => void> = [];
  private normal: Array<() => void> = [];
  private low: Array<() => void> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue<T>(fn: () => Promise<T>, priority: "high" | "normal" | "low" = "normal"): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.running++;
        try { resolve(await fn()); } catch (e) { reject(e); }
        finally { this.running--; this.drain(); }
      };
      if (priority === "high") this.high.push(task);
      else if (priority === "low") this.low.push(task);
      else this.normal.push(task);
      this.drain();
    });
  }

  private drain(): void {
    while (this.running < this.maxConcurrent) {
      const next = this.high.shift() ?? this.normal.shift() ?? this.low.shift();
      if (!next) break;
      next();
    }
  }
}

class PredictivePrefetcher {
  private patterns = new Map<string, number>();
  private prefetched = new Set<string>();
  private cache: QuantumCache;

  constructor(cache: QuantumCache) {
    this.cache = cache;
  }

  recordAccess(key: string): void {
    this.patterns.set(key, (this.patterns.get(key) ?? 0) + 1);
  }

  async prefetch(keys: string[], fetcher: (key: string) => Promise<unknown>): Promise<void> {
    const sorted = keys
      .filter(k => !this.prefetched.has(k) && this.cache.get(k) === null)
      .sort((a, b) => (this.patterns.get(b) ?? 0) - (this.patterns.get(a) ?? 0))
      .slice(0, 5);

    for (const key of sorted) {
      this.prefetched.add(key);
      fetcher(key)
        .then(data => this.cache.set(key, data, 120000))
        .catch(() => this.prefetched.delete(key));
    }
  }
}

class FrameBudgetScheduler {
  private tasks: Array<{ fn: () => void; priority: number }> = [];
  private budgetMs: number;
  private raf = 0;

  constructor(budgetMs = 8) {
    this.budgetMs = budgetMs;
  }

  schedule(fn: () => void, priority = 5): void {
    this.tasks.push({ fn, priority });
    this.tasks.sort((a, b) => b.priority - a.priority);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flush());
  }

  private flush(): void {
    this.raf = 0;
    const deadline = performance.now() + this.budgetMs;
    while (this.tasks.length && performance.now() < deadline) {
      const task = this.tasks.shift();
      task?.fn();
    }
    if (this.tasks.length) {
      this.raf = requestAnimationFrame(() => this.flush());
    }
  }
}

class ConnectionPool {
  private sockets = new Map<string, WebSocket>();
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  connect(url: string, onMessage: (data: unknown) => void): () => void {
    if (!this.listeners.has(url)) this.listeners.set(url, new Set());
    this.listeners.get(url)!.add(onMessage);

    if (!this.sockets.has(url) || this.sockets.get(url)!.readyState > 1) {
      this.createSocket(url);
    }

    return () => {
      this.listeners.get(url)?.delete(onMessage);
      if (this.listeners.get(url)?.size === 0) {
        this.sockets.get(url)?.close();
        this.sockets.delete(url);
      }
    };
  }

  private createSocket(url: string): void {
    try {
      const ws = new WebSocket(url);
      this.sockets.set(url, ws);
      ws.onmessage = (e) => {
        let data: unknown;
        try { data = JSON.parse(e.data); } catch { data = e.data; }
        this.listeners.get(url)?.forEach(fn => fn(data));
      };
      ws.onclose = () => {
        this.sockets.delete(url);
        if (this.listeners.get(url)?.size) {
          const timer = setTimeout(() => this.createSocket(url), 2000);
          this.reconnectTimers.set(url, timer);
        }
      };
      ws.onerror = () => ws.close();
    } catch { /* ignore in non-WS environments */ }
  }
}

export const quantumCache = new QuantumCache(1000);
export const requestQueue = new RequestPriorityQueue(8);
export const prefetcher = new PredictivePrefetcher(quantumCache);
export const frameBudget = new FrameBudgetScheduler(10);
export const connectionPool = new ConnectionPool();

export async function qFetch<T>(
  url: string,
  options?: RequestInit & { ttl?: number; priority?: "high" | "normal" | "low" },
): Promise<T> {
  const { ttl = 30000, priority = "normal", ...fetchOpts } = options ?? {};
  const method = (fetchOpts.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${url}:${fetchOpts.body ? JSON.stringify(fetchOpts.body) : ""}`;

  if (method === "GET") {
    return quantumCache.dedup<T>(
      cacheKey,
      () => requestQueue.enqueue(() => fetch(url, fetchOpts).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      }), priority),
      ttl,
    );
  }

  return requestQueue.enqueue(() => fetch(url, fetchOpts).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    quantumCache.invalidate(`GET:${url.split("?")[0]}`);
    return r.json() as Promise<T>;
  }), priority);
}

export function measurePerf(label: string): () => number {
  const start = performance.now();
  return () => {
    const elapsed = performance.now() - start;
    if (import.meta.env.DEV) console.debug(`[QuantumPerf] ${label}: ${elapsed.toFixed(2)}ms`);
    return elapsed;
  };
}
