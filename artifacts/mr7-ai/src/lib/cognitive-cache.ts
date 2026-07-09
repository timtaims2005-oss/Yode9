/**
 * cognitive-cache.ts
 * Pattern-learning cache that observes which API calls always happen together
 * and pre-fetches them automatically. Stores patterns in IndexedDB.
 * Confidence score 0-100; only pre-fetches when confidence > 70.
 * Forgets patterns older than 7 days (time-based LRU).
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pattern {
  trigger: string;     // URL that was observed first
  followup: string;    // URL that followed within the time window
  hits: number;        // how many times this pair was seen
  misses: number;      // how many times trigger fired without followup
  lastSeen: number;    // timestamp
  createdAt: number;
}

interface CallRecord {
  url: string;
  ts: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME     = 'mr7-cognitive-cache';
const DB_VERSION  = 1;
const STORE_NAME  = 'patterns';
const WINDOW_MS   = 2000;    // calls within 2s are considered "co-occurring"
const CONFIDENCE_THRESHOLD = 70;
const TTL_MS      = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_PATTERNS = 500;
const PERSIST_DEBOUNCE = 5000; // write to IDB every 5s

// ── State ─────────────────────────────────────────────────────────────────────

let db: IDBDatabase | null = null;
const patterns = new Map<string, Pattern>();
const recentCalls: CallRecord[] = []; // sliding window of recent API calls
let persistTimer: ReturnType<typeof setTimeout> | null = null;

// ── DB helpers ────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function patternKey(trigger: string, followup: string): string {
  return `${trigger}||${followup}`;
}

async function loadPatterns(): Promise<void> {
  if (!db) return;
  const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
  const req = store.getAll();
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const now = Date.now();
      for (const row of req.result as Array<{ key: string; pattern: Pattern }>) {
        if (now - row.pattern.lastSeen < TTL_MS) {
          patterns.set(row.key, row.pattern);
        }
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    await persistPatterns();
  }, PERSIST_DEBOUNCE);
}

async function persistPatterns(): Promise<void> {
  if (!db) return;
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  for (const [key, pattern] of patterns) {
    store.put({ key, pattern });
  }
}

// ── Pattern learning ──────────────────────────────────────────────────────────

function pruneRecentCalls(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (recentCalls.length > 0 && recentCalls[0].ts < cutoff) {
    recentCalls.shift();
  }
}

function pruneOldPatterns(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, p] of patterns) {
    if (p.lastSeen < cutoff) patterns.delete(key);
  }
  // Cap total patterns
  if (patterns.size > MAX_PATTERNS) {
    const sorted = [...patterns.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (const [key] of sorted.slice(0, patterns.size - MAX_PATTERNS)) {
      patterns.delete(key);
    }
  }
}

function recordCall(url: string): void {
  const now = Date.now();
  pruneRecentCalls();

  // Record co-occurrence with all recent calls in the window
  for (const prev of recentCalls) {
    const key = patternKey(prev.url, url);
    const existing = patterns.get(key);
    if (existing) {
      existing.hits++;
      existing.lastSeen = now;
    } else {
      patterns.set(key, {
        trigger: prev.url,
        followup: url,
        hits: 1,
        misses: 0,
        lastSeen: now,
        createdAt: now,
      });
    }
  }

  recentCalls.push({ url, ts: now });
  schedulePersist();
}

function getConfidence(trigger: string, followup: string): number {
  const key = patternKey(trigger, followup);
  const p = patterns.get(key);
  if (!p) return 0;
  const total = p.hits + p.misses;
  if (total < 3) return 0; // not enough data
  return Math.round((p.hits / total) * 100);
}

// ── Prefetch ──────────────────────────────────────────────────────────────────

function prefetchFor(triggerUrl: string): void {
  for (const [, p] of patterns) {
    if (p.trigger !== triggerUrl) continue;
    const confidence = getConfidence(triggerUrl, p.followup);
    if (confidence >= CONFIDENCE_THRESHOLD) {
      if (import.meta.env.DEV) {
        console.debug(
          `[cognitive-cache] prefetch ${p.followup}` +
          ` (confidence=${confidence}%, hits=${p.hits})`
        );
      }
      // Prefetch via link-preload hint (non-blocking)
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = p.followup;
      document.head.appendChild(link);
      // Remove after a short delay to avoid link-tag accumulation
      setTimeout(() => link.remove(), 10_000);

      eventBus.emit('cognitive-cache:prefetch', {
        trigger: triggerUrl,
        followup: p.followup,
        confidence,
      });
    }
  }
}

// ── Fetch interception ────────────────────────────────────────────────────────

let interceptInstalled = false;

function installInterceptor(): void {
  if (interceptInstalled) return;
  interceptInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : (input as Request).url;

    const isApi = url.startsWith('/api/') || url.includes(location.origin + '/api/');
    if (isApi) {
      recordCall(url);
      prefetchFor(url);
    }

    return originalFetch(input, init);
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    db = await openDB();
    await loadPatterns();
    pruneOldPatterns();
    installInterceptor();

    // Periodic cleanup every 30 minutes
    setInterval(pruneOldPatterns, 30 * 60 * 1000);

    if (import.meta.env.DEV) {
      console.debug(`[cognitive-cache] init | ${patterns.size} patterns loaded`);
    }
  } catch (err) {
    console.warn('[cognitive-cache] init failed:', err);
  }
}

function getStats() {
  return {
    patterns: patterns.size,
    topPatterns: [...patterns.values()]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map(p => ({
        trigger: p.trigger,
        followup: p.followup,
        confidence: getConfidence(p.trigger, p.followup),
        hits: p.hits,
      })),
  };
}

export const cognitiveCache = { init, getStats, getConfidence };
