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

  /* Bytes received in last 500ms window for adaptive flush rate */
  private recentBytes: { ts: number; n: number }[] = [];
  private _progress = 0; /* 0..1 estimated completion */

  /** Estimated stream completion 0..1 (based on content-length or heuristic). */
  get progress() { return this._progress; }

  setProgress(v: number) { this._progress = Math.max(0, Math.min(1, v)); }

  push(chunk: string) {
    this.buffer += chunk;
    this.chunkCount++;
    this.byteCount += chunk.length;

    /* Track recent throughput for adaptive flushing */
    const now = performance.now();
    this.recentBytes.push({ ts: now, n: chunk.length });
    this.recentBytes = this.recentBytes.filter(e => now - e.ts < 500);
    const bytesPer500ms = this.recentBytes.reduce((a, e) => a + e.n, 0);
    /* High throughput → flush faster; low throughput → flush slower */
    if (bytesPer500ms > 4000) this.flushMs = Math.max(16, this.flushMs * 0.85);
    else if (bytesPer500ms < 500) this.flushMs = Math.min(getStreamFlushMs() * 2, this.flushMs * 1.1);

    if (this.timer) return;

    const elapsed = now - this.lastFlush;
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
    this._progress = 0;
    this.recentBytes = [];
    this.flushMs = getStreamFlushMs();
  }

  stats() {
    return { chunks: this.chunkCount, bytes: this.byteCount, flushMs: this.flushMs, quality: getQualityLevel() };
  }
}
