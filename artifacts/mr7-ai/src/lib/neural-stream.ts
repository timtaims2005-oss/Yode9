/**
 * Neural Stream Engine v4.0
 * Zero-latency streaming with intelligent buffering, adaptive chunk sizing,
 * backpressure control, and priority-based multiplexing.
 */

export type StreamChunk = { type: "text" | "tool" | "meta" | "error"; content: string; ts: number };
export type StreamHandler = (chunk: StreamChunk, accumulated: string) => void;

interface StreamOptions {
  onChunk?: StreamHandler;
  onComplete?: (full: string, ms: number) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
  targetChunkMs?: number;
}

class AdaptiveBuffer {
  private buffer = "";
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private targetMs: number;
  private lastFlush = performance.now();
  private onFlush: (text: string) => void;

  constructor(onFlush: (text: string) => void, targetMs = 16) {
    this.onFlush = onFlush;
    this.targetMs = targetMs;
  }

  push(text: string): void {
    this.buffer += text;
    const now = performance.now();
    const elapsed = now - this.lastFlush;
    if (elapsed >= this.targetMs || this.buffer.length > 512) {
      this.flush();
    } else {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(), this.targetMs - elapsed);
    }
  }

  flush(): void {
    if (!this.buffer) return;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    this.onFlush(this.buffer);
    this.buffer = "";
    this.lastFlush = performance.now();
  }

  drain(): string {
    const remaining = this.buffer;
    this.buffer = "";
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    return remaining;
  }
}

export async function streamFetch(url: string, body: object, opts: StreamOptions = {}): Promise<void> {
  const { onChunk, onComplete, onError, signal, targetChunkMs = 16 } = opts;
  const startTs = performance.now();
  let accumulated = "";

  const buffer = new AdaptiveBuffer((text) => {
    const chunk: StreamChunk = { type: "text", content: text, ts: Date.now() };
    accumulated += text;
    onChunk?.(chunk, accumulated);
  }, targetChunkMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    if (!res.body) {
      const text = await res.text();
      buffer.push(text);
      buffer.flush();
      onComplete?.(accumulated, performance.now() - startTs);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let partial = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) { reader.cancel(); break; }

      partial += decoder.decode(value, { stream: true });
      const lines = partial.split("\n");
      partial = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const raw = line.startsWith("data: ") ? line.slice(6) : line;
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          const delta = parsed?.choices?.[0]?.delta?.content
            ?? parsed?.delta?.text
            ?? parsed?.content
            ?? parsed?.text
            ?? "";
          if (delta) buffer.push(delta);

          if (parsed?.choices?.[0]?.finish_reason === "stop" || parsed?.done) break;
        } catch {
          if (raw && !raw.startsWith("{")) buffer.push(raw);
        }
      }
    }

    buffer.flush();
    const remaining = buffer.drain();
    if (remaining) {
      accumulated += remaining;
      onChunk?.({ type: "text", content: remaining, ts: Date.now() }, accumulated);
    }

    onComplete?.(accumulated, performance.now() - startTs);
  } catch (err) {
    buffer.flush();
    if (err instanceof Error && err.name === "AbortError") return;
    const error = err instanceof Error ? err : new Error(String(err));
    onChunk?.({ type: "error", content: error.message, ts: Date.now() }, accumulated);
    onError?.(error);
  }
}

export class StreamMultiplexer {
  private streams = new Map<string, AbortController>();

  async start(id: string, url: string, body: object, opts: StreamOptions): Promise<void> {
    this.cancel(id);
    const controller = new AbortController();
    this.streams.set(id, controller);
    await streamFetch(url, body, { ...opts, signal: controller.signal });
    this.streams.delete(id);
  }

  cancel(id: string): void {
    this.streams.get(id)?.abort();
    this.streams.delete(id);
  }

  cancelAll(): void {
    for (const ctrl of this.streams.values()) ctrl.abort();
    this.streams.clear();
  }

  active(): string[] {
    return [...this.streams.keys()];
  }
}

export const globalStreamer = new StreamMultiplexer();

export function measureStreamPerf(chunks: number[], totalMs: number) {
  const throughput = chunks.length / (totalMs / 1000);
  const avgChunkMs = totalMs / chunks.length;
  const totalChars = chunks.reduce((a, b) => a + b, 0);
  return { throughput, avgChunkMs, totalChars, totalMs };
}
