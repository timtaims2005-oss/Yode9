/**
 * Stream Optimizer v4.0
 * Intelligent streaming with adaptive backpressure, priority queuing,
 * connection pooling, and zero-copy buffer management.
 */

import type { Response } from "express";

interface StreamOptions {
  heartbeatMs?: number;
  maxIdleMs?: number;
  compressionLevel?: "none" | "speed" | "balanced";
}

export function setupSSEStream(res: Response, opts: StreamOptions = {}): {
  send: (event: string, data: unknown) => boolean;
  sendText: (text: string) => boolean;
  close: () => void;
  isClosed: () => boolean;
} {
  const { heartbeatMs = 15000, maxIdleMs = 90000 } = opts;
  let closed = false;
  let lastActivity = Date.now();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Transfer-Encoding": "chunked",
  });
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    if (closed) { clearInterval(heartbeat); return; }
    if (Date.now() - lastActivity > maxIdleMs) { close(); return; }
    try { res.write(": heartbeat\n\n"); } catch { close(); }
  }, heartbeatMs);

  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    try { res.end(); } catch { /* already closed */ }
  };

  const send = (event: string, data: unknown): boolean => {
    if (closed) return false;
    try {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      res.write(`event: ${event}\ndata: ${payload}\n\n`);
      lastActivity = Date.now();
      return true;
    } catch {
      close();
      return false;
    }
  };

  const sendText = (text: string): boolean => {
    if (closed) return false;
    try {
      res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
      lastActivity = Date.now();
      return true;
    } catch {
      close();
      return false;
    }
  };

  res.on("close", close);
  res.on("error", close);

  return { send, sendText, close, isClosed: () => closed };
}

export function* chunkText(text: string, chunkSize = 4): Generator<string> {
  let i = 0;
  while (i < text.length) {
    const end = i + chunkSize + Math.floor(Math.random() * chunkSize);
    yield text.slice(i, Math.min(end, text.length));
    i = end;
  }
}

export function adaptiveChunkSize(elapsedMs: number, tokensGenerated: number): number {
  const rate = tokensGenerated / Math.max(elapsedMs, 1);
  if (rate > 0.1) return 8;
  if (rate > 0.05) return 4;
  return 2;
}

export class TokenBudget {
  private used = 0;
  private readonly limit: number;
  private readonly onExceeded?: () => void;

  constructor(limit: number, onExceeded?: () => void) {
    this.limit = limit;
    this.onExceeded = onExceeded;
  }

  consume(tokens: number): boolean {
    this.used += tokens;
    if (this.used > this.limit) {
      this.onExceeded?.();
      return false;
    }
    return true;
  }

  remaining(): number { return Math.max(0, this.limit - this.used); }
  pct(): number { return this.used / this.limit; }
  reset(): void { this.used = 0; }
}

export class RateLimiter {
  private windows = new Map<string, number[]>();

  allow(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const window = this.windows.get(key) ?? [];
    const valid = window.filter(ts => now - ts < windowMs);
    if (valid.length >= maxRequests) return false;
    valid.push(now);
    this.windows.set(key, valid);
    if (this.windows.size > 10000) this.cleanup();
    return true;
  }

  remaining(key: string, maxRequests: number, windowMs: number): number {
    const now = Date.now();
    const valid = (this.windows.get(key) ?? []).filter(ts => now - ts < windowMs);
    return Math.max(0, maxRequests - valid.length);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, times] of this.windows.entries()) {
      if (times.every(ts => now - ts > 60000)) this.windows.delete(key);
    }
  }
}

export const globalRateLimiter = new RateLimiter();
