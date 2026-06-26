/**
 * Storage Quota Manager — monitors browser storage limits.
 * Tracks localStorage, IndexedDB, and Cache API usage.
 * Evicts oldest chats when approaching quota limits.
 * Uses StorageManager API (Chrome 61+) with fallback estimation.
 */

export interface StorageQuotaInfo {
  used: number;   // bytes
  quota: number;  // bytes
  usedMB: number;
  quotaMB: number;
  pct: number;    // 0-100
  persistent: boolean;
  breakdown: {
    localStorage: number;
    indexedDB: number;
    serviceWorker: number;
  };
}

type QuotaCallback = (info: StorageQuotaInfo) => void;

class StorageQuotaManager {
  private info: StorageQuotaInfo | null = null;
  private listeners = new Set<QuotaCallback>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private evictionCallbacks = new Map<string, () => Promise<void>>();

  async start() {
    await this.measure();
    this.timer = setInterval(() => this.measure(), 30_000);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  onQuota(cb: QuotaCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  registerEviction(key: string, fn: () => Promise<void>) {
    this.evictionCallbacks.set(key, fn);
    return () => this.evictionCallbacks.delete(key);
  }

  get current() { return this.info; }

  /** Request persistent storage (survives browser cleanup) */
  async requestPersistent(): Promise<boolean> {
    try {
      if (navigator.storage?.persist) return await navigator.storage.persist();
    } catch { /* ignore */ }
    return false;
  }

  private async measure() {
    let used = 0, quota = 0, persistent = false;

    // StorageManager API (most accurate)
    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        used  = est.usage  ?? 0;
        quota = est.quota  ?? 0;
      }
      if (navigator.storage?.persisted) {
        persistent = await navigator.storage.persisted();
      }
    } catch { /* ignore */ }

    // Estimate localStorage size
    let lsSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        lsSize += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
      }
    } catch { /* ignore */ }

    const info: StorageQuotaInfo = {
      used, quota,
      usedMB: Math.round(used / 1048576 * 10) / 10,
      quotaMB: Math.round(quota / 1048576),
      pct: quota ? Math.round((used / quota) * 100) : 0,
      persistent,
      breakdown: { localStorage: lsSize, indexedDB: Math.max(0, used - lsSize), serviceWorker: 0 },
    };
    this.info = info;
    this.listeners.forEach(cb => cb(info));

    // Trigger eviction if >90% full
    if (info.pct >= 90) {
      console.warn(`[StorageQuota] Storage ${info.pct}% full — triggering eviction`);
      for (const [key, fn] of this.evictionCallbacks) {
        try { await fn(); } catch (e) { console.warn(`[StorageQuota] eviction "${key}" failed:`, e); }
      }
    }
  }
}

export const storageQuota = new StorageQuotaManager();
