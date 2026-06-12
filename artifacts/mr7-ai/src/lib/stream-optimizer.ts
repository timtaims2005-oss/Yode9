import { getStreamFlushMs, getQualityLevel } from "./adaptive-quality";

type FlushFn = (accumulated: string) => void;

export class StreamOptimizer {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushMs: number;
  private lastFlush = 0;
  private chunkCount = 0;
  private byteCount = 0;
  private onFlush: FlushFn;

  constructor(onFlush: FlushFn) {
    this.onFlush = onFlush;
    this.flushMs = getStreamFlushMs();
  }

  push(chunk: string) {
    this.buffer += chunk;
    this.chunkCount++;
    this.byteCount += chunk.length;

    if (this.timer) return;

    const elapsed = performance.now() - this.lastFlush;
    if (elapsed >= this.flushMs) {
      this.flush();
    } else {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, this.flushMs - elapsed);
    }
  }

  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (!this.buffer) return;
    const buf = this.buffer;
    this.buffer = "";
    this.lastFlush = performance.now();
    this.onFlush(buf);
  }

  reset() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.buffer = "";
    this.chunkCount = 0;
    this.byteCount = 0;
  }

  stats() {
    return { chunks: this.chunkCount, bytes: this.byteCount, flushMs: this.flushMs, quality: getQualityLevel() };
  }
}
