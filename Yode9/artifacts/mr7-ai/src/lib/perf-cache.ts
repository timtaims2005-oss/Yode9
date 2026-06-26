export type CacheEntry = {
  key: string;
  value: string;
  ts: number;
  hits: number;
  model: string;
};

const MAX_ENTRIES = 60;
const TTL_MS = 5 * 60 * 1000;

class LRUCache {
  private map = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  private hashKey(model: string, provider: string, messages: Array<{ role: string; content: string }>): string {
    const raw = `${model}|${provider}|${messages.map((m) => `${m.role}:${m.content.slice(0, 200)}`).join("||")}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  get(model: string, provider: string, messages: Array<{ role: string; content: string }>): string | null {
    const key = this.hashKey(model, provider, messages);
    const entry = this.map.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.ts > TTL_MS) {
      this.map.delete(key);
      this.misses++;
      return null;
    }
    entry.hits++;
    this.hits++;
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(model: string, provider: string, messages: Array<{ role: string; content: string }>, value: string): void {
    if (!value || value.length < 10) return;
    const key = this.hashKey(model, provider, messages);
    if (this.map.size >= MAX_ENTRIES) {
      const oldest = this.map.keys().next().value;
      if (oldest) { this.map.delete(oldest); this.evictions++; }
    }
    this.map.set(key, { key, value, ts: Date.now(), hits: 0, model });
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.map.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  clear() { this.map.clear(); this.hits = 0; this.misses = 0; }

  prune() {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now - entry.ts > TTL_MS) this.map.delete(key);
    }
  }
}

export const responseCache = new LRUCache();

setInterval(() => responseCache.prune(), 60_000);
