/**
 * network-multiplexer.ts
 * Routes all API requests through a single WebSocket connection with
 * multiplexing (32 concurrent streams). Falls back to HTTP/1.1 if WS fails.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MuxRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface MuxResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface PendingRequest {
  resolve: (res: Response) => void;
  reject: (err: Error) => void;
  startTime: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONCURRENT = 32;
const RECONNECT_DELAY_MS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff
const PING_INTERVAL_MS = 30_000;
const WS_TIMEOUT_MS = 5000; // give up on WS connect after this

// ── State ─────────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let wsReady = false;
let usingFallback = false;
let reconnectAttempt = 0;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let requestIdCounter = 1;
const pending = new Map<string, PendingRequest>();

// Throughput tracking
let bytesTransferred = 0;
let transferStart = Date.now();

// ── WS connect ────────────────────────────────────────────────────────────────

function buildWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/api/mux`;
}

function connectWs(): void {
  if (ws) { ws.onclose = null; ws.close(); }

  const connectDeadline = setTimeout(() => {
    if (!wsReady) {
      console.warn('[network-multiplexer] WS connect timeout — falling back to HTTP');
      useFallback();
    }
  }, WS_TIMEOUT_MS);

  try {
    ws = new WebSocket(buildWsUrl());
  } catch {
    useFallback();
    return;
  }

  ws.onopen = () => {
    clearTimeout(connectDeadline);
    wsReady = true;
    usingFallback = false;
    reconnectAttempt = 0;
    startPing();
    eventBus.emit('network-mux:connected', {});
    if (import.meta.env.DEV) console.debug('[network-multiplexer] WS connected');
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const resp: MuxResponse = JSON.parse(event.data as string);
      bytesTransferred += event.data.length;
      const pendingReq = pending.get(resp.id);
      if (!pendingReq) return;
      pending.delete(resp.id);

      const headers = new Headers(resp.headers ?? {});
      const response = new Response(resp.body, {
        status: resp.status,
        headers,
      });
      pendingReq.resolve(response);
    } catch (err) {
      console.warn('[network-multiplexer] parse error:', err);
    }
  };

  ws.onerror = () => {
    clearTimeout(connectDeadline);
    wsReady = false;
  };

  ws.onclose = () => {
    clearTimeout(connectDeadline);
    wsReady = false;
    stopPing();
    scheduleReconnect();
  };
}

function scheduleReconnect(): void {
  if (usingFallback) return;
  const delay = RECONNECT_DELAY_MS[Math.min(reconnectAttempt, RECONNECT_DELAY_MS.length - 1)];
  reconnectAttempt++;
  setTimeout(connectWs, delay);
}

function useFallback(): void {
  usingFallback = true;
  wsReady = false;
  eventBus.emit('network-mux:fallback', {});
  if (import.meta.env.DEV) console.debug('[network-multiplexer] using HTTP fallback');
}

// ── Ping ──────────────────────────────────────────────────────────────────────

function startPing(): void {
  stopPing();
  pingTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) ws.send('{"ping":1}');
  }, PING_INTERVAL_MS);
}

function stopPing(): void {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

// ── Request routing ───────────────────────────────────────────────────────────

function generateId(): string {
  return `mux-${requestIdCounter++}`;
}

function sendViaWs(
  id: string,
  method: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (pending.size >= MAX_CONCURRENT) {
      // Head-of-line prevention: don't block, fall through to HTTP
      reject(new Error('mux-full'));
      return;
    }

    pending.set(id, { resolve, reject, startTime: Date.now() });

    const req: MuxRequest = {
      id,
      method,
      url,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body as string | undefined,
    };

    try {
      ws!.send(JSON.stringify(req));
    } catch (err) {
      pending.delete(id);
      reject(err);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

function connect(): void {
  connectWs();
  if (import.meta.env.DEV) {
    console.debug('[network-multiplexer] connecting...');
  }
}

async function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : (input as Request).url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const id = generateId();

  // Only multiplex API requests; pass-through everything else
  const isApi = url.startsWith('/api/') || url.includes(location.origin + '/api/');
  if (!isApi || !wsReady || usingFallback) {
    return fetch(input, init);
  }

  try {
    return await sendViaWs(id, method, url, init);
  } catch (err) {
    if ((err as Error).message === 'mux-full') {
      // Concurrency cap hit — fall through to direct HTTP (no blocking)
      return fetch(input, init);
    }
    // WS error — fall back to HTTP for this request
    return fetch(input, init);
  }
}

function getStats() {
  const elapsed = (Date.now() - transferStart) / 1000;
  return {
    connected: wsReady,
    usingFallback,
    pendingRequests: pending.size,
    throughputBytesPerSec: elapsed > 0 ? Math.round(bytesTransferred / elapsed) : 0,
    reconnectAttempt,
  };
}

export const networkMultiplexer = { connect, request, getStats };
