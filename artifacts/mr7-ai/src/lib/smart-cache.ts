/**
 * smart-cache.ts
 * IndexedDB-backed LRU cache for AI responses.
 * Features: LRU eviction, cache warming, Service Worker integration.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME = 'mr7-smart-cache';
const DB_VERSION = 1;
const STORE_NAME = 'responses';
const MAX_ENTRIES = 200;
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const WARM_KEYS = ['__warm_marker__']; // keys to preload on init

// ── Types ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  key: string;
  value: string;
  size: number;       // bytes
  accessedAt: number; // timestamp (LRU)
  createdAt: number;
  hits: number;
}

// ── Internal state ────────────────────────────────────────────────────────────

let db: IDBDatabase | null = null;
let totalSize = 0;
let entryCount = 0;

// In-memory LRU map (key → accessedAt) for fast eviction decisions
const lruMap = new Map<string, number>();

// ── DB helpers ────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      store.createIndex('accessedAt', 'accessedAt');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode: IDBTransactionMode) {
  if (!db) throw new Error('smart-cache: DB not initialised');
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function idbGet(key: string): Promise<CacheEntry | undefined> {
  return new Promise((resolve, reject) => {
    const req = tx('readonly').get(key);
    req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(entry: CacheEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = tx('readwrite').put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = tx('readwrite').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(): Promise<CacheEntry[]> {
  return new Promise((resolve, reject) => {
    const req = tx('readonly').getAll();
    req.onsuccess = () => resolve(req.result as CacheEntry[]);
    req.onerror = () => reject(req.error);
  });
}

// ── LRU eviction ──────────────────────────────────────────────────────────────

async function evictIfNeeded(): Promise<void> {
  if (entryCount <= MAX_ENTRIES && totalSize <= MAX_SIZE_BYTES) return;

  // Sort by accessedAt ascending (oldest first)
  const sorted = [...lruMap.entries()].sort((a, b) => a[1] - b[1]);

  for (const [key] of sorted) {
    if (entryCount <= MAX_ENTRIES * 0.8 && totalSize <= MAX_SIZE_BYTES * 0.8) break;
    const entry = await idbGet(key);
    if (entry) {
      totalSize -= entry.size;
      entryCount -= 1;
    }
    lruMap.delete(key);
    await idbDelete(key);
  }
}

// ── Cache key ─────────────────────────────────────────────────────────────────

function buildKey(prompt: string, model: string): string {
  // Simple deterministic hash (FNV-1a variant)
  const raw = `${model}::${prompt}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `ai-${hash.toString(16)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    db = await openDB();

    // Rebuild in-memory LRU map from DB
    const all = await idbGetAll();
    totalSize = 0;
    entryCount = all.length;
    for (const entry of all) {
      lruMap.set(entry.key, entry.accessedAt);
      totalSize += entry.size;
    }

    // Cache warming
    await warmCache();

    // Register with Service Worker if available
    registerWithSW();

    if (import.meta.env.DEV) {
      console.debug(`[smart-cache] init | ${entryCount} entries | ${(totalSize / 1024).toFixed(1)} KB`);
    }
  } catch (err) {
    console.warn('[smart-cache] init failed, operating without cache:', err);
  }
}

async function get(prompt: string, model: string): Promise<string | null> {
  if (!db) return null;
  const key = buildKey(prompt, model);
  try {
    const entry = await idbGet(key);
    if (!entry) return null;

    // Update LRU
    entry.accessedAt = Date.now();
    entry.hits += 1;
    lruMap.set(key, entry.accessedAt);
    await idbPut(entry);

    return entry.value;
  } catch {
    return null;
  }
}

async function set(prompt: string, model: string, value: string): Promise<void> {
  if (!db) return;
  const key = buildKey(prompt, model);
  const size = new Blob([value]).size;

  try {
    const existing = await idbGet(key);
    if (existing) {
      totalSize -= existing.size;
      entryCount -= 1;
    }

    const entry: CacheEntry = {
      key,
      value,
      size,
      accessedAt: Date.now(),
      createdAt: Date.now(),
      hits: 0,
    };

    await idbPut(entry);
    lruMap.set(key, entry.accessedAt);
    totalSize += size;
    entryCount += 1;

    await evictIfNeeded();
  } catch (err) {
    console.warn('[smart-cache] set failed:', err);
  }
}

async function warmCache(): Promise<void> {
  // Load frequently accessed keys into memory (no-op if no warm keys set)
  for (const key of WARM_KEYS) {
    try {
      await idbGet(key); // just touch to ensure it's in IDB cache
    } catch {
      // ignore
    }
  }
}

function registerWithSW(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) {
      reg.active.postMessage({ type: 'SMART_CACHE_READY', maxSize: MAX_SIZE_BYTES });
    }
  }).catch(() => {});
}

async function clear(): Promise<void> {
  if (!db) return;
  const store = tx('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  lruMap.clear();
  totalSize = 0;
  entryCount = 0;
}

function getStats() {
  return {
    entries: entryCount,
    sizeBytes: totalSize,
    maxEntries: MAX_ENTRIES,
    maxSizeBytes: MAX_SIZE_BYTES,
    fillPct: Math.round((totalSize / MAX_SIZE_BYTES) * 100),
  };
}

export const smartCache = { init, get, set, clear, getStats, buildKey };
