/**
 * AI Streaming Optimizer v1.0
 * ============================
 * تحسين الـ Streaming للمحادثات مع الذكاء الاصطناعي
 * Optimized streaming for AI conversations with adaptive buffering
 */

import type { Response } from 'express';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StreamOptions {
  bufferSize?: number;
  flushIntervalMs?: number;
  heartbeatMs?: number;
  maxIdleMs?: number;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string, tokenCount: number) => void;
  onError?: (error: Error) => void;
}

export interface StreamMetrics {
  tokensGenerated: number;
  elapsedMs: number;
  tokensPerSecond: number;
  bufferedChunks: number;
}

// ── AIStreamingOptimizer ──────────────────────────────────────────────────────

export class AIStreamingOptimizer {
  /**
   * إنشاء استجابة SSE محسّنة لمجرى توكنات الذكاء الاصطناعي
   * Create an optimized SSE stream for AI token generation
   */
  static createTokenStream(
    res: Response,
    generator: AsyncGenerator<string>,
    options: StreamOptions = {}
  ): Promise<StreamMetrics> {
    const {
      bufferSize = 6,
      flushIntervalMs = 20,
      heartbeatMs = 15_000,
      maxIdleMs = 90_000,
      onToken,
      onComplete,
      onError,
    } = options;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const metrics: StreamMetrics = {
      tokensGenerated: 0,
      elapsedMs: 0,
      bufferedChunks: 0,
      tokensPerSecond: 0,
    };

    return new Promise((resolve, reject) => {
      let closed = false;
      let buffer: string[] = [];
      let fullText = '';
      let flushTimer: NodeJS.Timeout | null = null;
      let lastActivity = Date.now();
      const startTime = Date.now();

      const close = () => {
        if (closed) return;
        closed = true;
        if (flushTimer) clearInterval(flushTimer);
        if (heartbeat) clearInterval(heartbeat);
        try { res.end(); } catch { /* already closed */ }
      };

      const flush = () => {
        if (buffer.length === 0 || closed) return;
        const chunk = buffer.join('');
        buffer = [];
        try {
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
          lastActivity = Date.now();
          metrics.bufferedChunks++;
        } catch {
          close();
        }
      };

      const sendEvent = (event: string, data: unknown) => {
        if (closed) return;
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          close();
        }
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        if (Date.now() - lastActivity > maxIdleMs) {
          close();
          return;
        }
        try { res.write(': heartbeat\n\n'); } catch { close(); }
      }, heartbeatMs);

      // Flush timer for consistent UI updates
      flushTimer = setInterval(flush, flushIntervalMs);

      // Handle client disconnect
      res.on('close', close);
      res.on('error', close);

      // Stream tokens
      (async () => {
        try {
          for await (const token of generator) {
            if (closed) break;

            buffer.push(token);
            fullText += token;
            metrics.tokensGenerated++;
            onToken?.(token);

            // Flush when buffer is full
            if (buffer.length >= bufferSize) {
              flush();
            }
          }

          // Flush remaining buffer
          flush();

          // Calculate final metrics
          metrics.elapsedMs = Date.now() - startTime;
          metrics.tokensPerSecond = metrics.tokensGenerated / Math.max(metrics.elapsedMs / 1000, 0.001);

          // Send completion event
          sendEvent('done', {
            type: 'done',
            metrics,
            totalLength: fullText.length,
          });

          onComplete?.(fullText, metrics.tokensGenerated);
          close();
          resolve(metrics);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          if (!closed) {
            sendEvent('error', { type: 'error', message: err.message });
          }
          onError?.(err);
          close();
          reject(err);
        }
      })();
    });
  }

  /**
   * ضغط التوكنات لتحسين الأداء
   * Compress tokens for performance improvement
   */
  static compressTokens(tokens: string[]): string {
    return tokens
      .map(t => t.replace(/\s+/g, ' '))
      .join('')
      .trim();
  }

  /**
   * حساب حجم المخزن المؤقت التكيفي بناءً على سرعة التوليد
   * Calculate adaptive buffer size based on generation speed
   */
  static adaptiveBufferSize(tokensPerSecond: number): number {
    if (tokensPerSecond > 80) return 16;   // Very fast: buffer more
    if (tokensPerSecond > 40) return 8;    // Fast: moderate buffer
    if (tokensPerSecond > 20) return 4;    // Medium: small buffer
    return 2;                               // Slow: minimal buffer for responsiveness
  }

  /**
   * تحويل async iterable إلى Generator قابل للتحكم
   * Convert async iterable to a controllable generator
   */
  static async *fromAsyncIterable<T extends string>(
    iterable: AsyncIterable<T>,
    transform?: (chunk: T) => string
  ): AsyncGenerator<string> {
    for await (const chunk of iterable) {
      yield transform ? transform(chunk) : chunk;
    }
  }

  /**
   * إنشاء generator من قائمة نصوص (مفيد للاختبار)
   * Create a generator from a list of strings (useful for testing)
   */
  static async *fromTokenList(
    tokens: string[],
    delayMs = 0
  ): AsyncGenerator<string> {
    for (const token of tokens) {
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      yield token;
    }
  }

  /**
   * دمج عدة generators في واحد مع الحفاظ على الترتيب
   * Merge multiple generators maintaining order
   */
  static async *mergeGenerators(
    ...generators: AsyncGenerator<string>[]
  ): AsyncGenerator<string> {
    for (const gen of generators) {
      for await (const token of gen) {
        yield token;
      }
    }
  }
}

// ── Token Buffer ──────────────────────────────────────────────────────────────

export class TokenBuffer {
  private buffer: string[] = [];
  private readonly maxSize: number;
  private readonly onFlush: (chunk: string) => void;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(maxSize: number, flushIntervalMs: number, onFlush: (chunk: string) => void) {
    this.maxSize = maxSize;
    this.onFlush = onFlush;
    this.flushTimer = setInterval(() => this.flush(), flushIntervalMs);
  }

  push(token: string): void {
    this.buffer.push(token);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;
    const chunk = this.buffer.join('');
    this.buffer = [];
    this.onFlush(chunk);
  }

  destroy(): void {
    this.flush();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  get size(): number {
    return this.buffer.length;
  }
}

// ── Stream Metrics Tracker ────────────────────────────────────────────────────

export class StreamMetricsTracker {
  private startTime: number;
  private tokenCount = 0;
  private checkpoints: Array<{ time: number; tokens: number }> = [];

  constructor() {
    this.startTime = Date.now();
  }

  record(tokens = 1): void {
    this.tokenCount += tokens;
    const now = Date.now();
    this.checkpoints.push({ time: now, tokens: this.tokenCount });
    // Keep only last 100 checkpoints
    if (this.checkpoints.length > 100) {
      this.checkpoints.shift();
    }
  }

  getMetrics(): StreamMetrics {
    const now = Date.now();
    const elapsedMs = now - this.startTime;
    const tokensPerSecond = this.tokenCount / Math.max(elapsedMs / 1000, 0.001);

    return {
      tokensGenerated: this.tokenCount,
      elapsedMs,
      tokensPerSecond,
      bufferedChunks: this.checkpoints.length,
    };
  }

  /**
   * حساب السرعة اللحظية (آخر ثانية)
   * Calculate instantaneous speed (last second)
   */
  getInstantaneousSpeed(): number {
    const now = Date.now();
    const oneSecAgo = now - 1000;
    const recent = this.checkpoints.filter(c => c.time > oneSecAgo);
    return recent.length > 1
      ? recent[recent.length - 1].tokens - recent[0].tokens
      : 0;
  }
}
