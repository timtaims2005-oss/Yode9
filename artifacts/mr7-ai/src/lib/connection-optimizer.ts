/**
 * connection-optimizer.ts
 * Extends retry-engine & request-dedup with HTTP/2 awareness,
 * request coalescing, and bandwidth-adaptive concurrency limits.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

type SpeedTier = 'fast' | 'medium' | 'slow';

interface BandwidthSample {
  timestamp: number;
  bytesPerSec: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_INTERVAL_MS = 10_000;       // bandwidth re-measured every 10s
const FAST_THRESHOLD_BPS = 10 * 1024 * 1024;  // 10 Mbps
const SLOW_THRESHOLD_BPS = 1 * 1024 * 1024;   // 1 Mbps
const COALESCE_WINDOW_MS = 20;           // ms to collect requests before flushing

const CONCURRENCY: Record<SpeedTier, number> = {
  fast: 6,
  medium: 3,
  slow: 1,
};

// ── State ─────────────────────────────────────────────────────────────────────

let currentTier: SpeedTier = 'medium';
let currentConcurrency = CONCURRENCY.medium;
let activeRequests = 0;
let measureTimer: ReturnType<typeof setInterval> | null = null;
const bandwidthHistory: BandwidthSample[] = [];

// Coalescing: pending coalesced requests
interface CoalesceEntry {
  key: string;
  requests: Array<{ resolve: (r: Response) => void; reject: (e: unknown) => void }>;
  init?: RequestInit;
}
const coalesceMap = new Map<string, CoalesceEntry>();
let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Bandwidth estimation ──────────────────────────────────────────────────────

async function measureBandwidth(): Promise<void> {
  // Use a small probe request to /api/csrf-token (always exists, tiny payload)
  const probe = '/api/csrf-token';
  const t0 = performance.now();
  try {
    const res = await fetch(probe, { cache: 'no-store', credentials: 'include' });
    const buf = await res.arrayBuffer();
    const elapsed = (performance.now() - t0) / 1000; // seconds
    if (elapsed > 0) {
      const bps = buf.byteLength / elapsed;
      bandwidthHistory.push({ timestamp: Date.now(), bytesPerSec: bps });
      if (bandwidthHistory.length > 10) bandwidthHistory.shift();
      updateTier(bps);
    }
  } catch {
    // ignore probe failures
  }
}

function updateTier(bps: number): void {
  let tier: SpeedTier = 'medium';
  if (bps >= FAST_THRESHOLD_BPS) tier = 'fast';
  else if (bps < SLOW_THRESHOLD_BPS) tier = 'slow';

  if (tier !== currentTier) {
    currentTier = tier;
    currentConcurrency = CONCURRENCY[tier];
    if (import.meta.env.DEV) {
      console.debug(
        `[connection-optimizer] tier=${tier}` +
        ` | ${(bps / 1024 / 1024).toFixed(2)} Mbps` +
        ` | concurrency=${currentConcurrency}`
      );
    }
    eventBus.emit('connection:tier-change', {
      tier,
      bps,
      concurrency: currentConcurrency,
    });
  }
}

// ── Request queue with concurrency cap ───────────────────────────────────────

type FetchArgs = [RequestInfo | URL, RequestInit?];
const pendingQueue: Array<{ args: FetchArgs; resolve: (r: Response) => void; reject: (e: unknown) => void }> = [];

function drainQueue(): void {
  while (pendingQueue.length > 0 && activeRequests < currentConcurrency) {
    const item = pendingQueue.shift()!;
    activeRequests++;
    fetch(...item.args)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => { activeRequests--; drainQueue(); });
  }
}

/** Throttled fetch that respects current concurrency limit. */
function throttledFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (activeRequests < currentConcurrency) {
    activeRequests++;
    return fetch(input, init).finally(() => { activeRequests--; drainQueue(); });
  }
  return new Promise((resolve, reject) => {
    pendingQueue.push({ args: [input, init], resolve, reject });
  });
}

// ── Request coalescing ────────────────────────────────────────────────────────

/** Coalesce identical GET requests made within COALESCE_WINDOW_MS. */
function coalescedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();

  // Only coalesce GET requests
  if (method !== 'GET') return throttledFetch(input, init);

  const key = url;
  if (coalesceMap.has(key)) {
    return new Promise((resolve, reject) => {
      coalesceMap.get(key)!.requests.push({ resolve, reject });
    });
  }

  return new Promise((resolve, reject) => {
    coalesceMap.set(key, { key, requests: [{ resolve, reject }], init });
    if (coalesceTimer === null) {
      coalesceTimer = setTimeout(flushCoalesced, COALESCE_WINDOW_MS);
    }
  });
}

function flushCoalesced(): void {
  coalesceTimer = null;
  for (const [key, entry] of coalesceMap) {
    coalesceMap.delete(key);
    throttledFetch(key, entry.init)
      .then(res => {
        // Clone response for each waiter
        for (let i = 0; i < entry.requests.length; i++) {
          const clone = i < entry.requests.length - 1 ? res.clone() : res;
          entry.requests[i].resolve(clone);
        }
      })
      .catch(err => {
        entry.requests.forEach(r => r.reject(err));
      });
  }
}

// ── Compression hint for slow connections ────────────────────────────────────

function addCompressionHint(init: RequestInit = {}): RequestInit {
  if (currentTier !== 'slow') return init;
  const headers = new Headers(init.headers);
  headers.set('Accept-Encoding', 'gzip, deflate, br');
  return { ...init, headers };
}

// ── Public API ────────────────────────────────────────────────────────────────

function init(): void {
  measureBandwidth();
  measureTimer = setInterval(measureBandwidth, SAMPLE_INTERVAL_MS);

  if (import.meta.env.DEV) {
    console.debug('[connection-optimizer] init');
  }
}

function destroy(): void {
  if (measureTimer) { clearInterval(measureTimer); measureTimer = null; }
}

function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return coalescedFetch(input, addCompressionHint(init));
}

function getStats() {
  const avgBps =
    bandwidthHistory.length > 0
      ? bandwidthHistory.reduce((a, b) => a + b.bytesPerSec, 0) /
        bandwidthHistory.length
      : 0;
  return {
    tier: currentTier,
    concurrency: currentConcurrency,
    activeRequests,
    queuedRequests: pendingQueue.length,
    avgBandwidthMbps: avgBps / 1024 / 1024,
  };
}

export const connectionOptimizer = { init, destroy, fetch, getStats };
