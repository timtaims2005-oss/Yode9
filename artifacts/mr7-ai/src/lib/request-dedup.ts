import { perfMonitor } from "./perf-monitor";

type ChunkListener = (chunk: string) => void;
type CompletionListener = (full: string) => void;
type ErrorListener = (err: unknown) => void;

type PendingEntry = {
  key: string;
  chunkListeners: Set<ChunkListener>;
  completionListeners: Set<CompletionListener>;
  errorListeners: Set<ErrorListener>;
  full: string;
  started: number;
};

type DedupEvent =
  | { type: "new"; key: string; label: string }
  | { type: "hit"; key: string; label: string; savedCost: number }
  | { type: "done"; key: string }
  | { type: "error"; key: string };

type DedupStats = {
  totalRequests: number;
  dedupedRequests: number;
  savedAPICalls: number;
};

class RequestDeduplicator {
  private pending = new Map<string, PendingEntry>();
  private eventListeners = new Set<(e: DedupEvent) => void>();
  private stats: DedupStats = { totalRequests: 0, dedupedRequests: 0, savedAPICalls: 0 };

  private hashRequest(model: string, provider: string, messages: Array<{ role: string; content: string }>): string {
    const raw = `${model}|${provider}|${messages.map((m) => `${m.role}:${m.content.slice(0, 512)}`).join("||")}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(36);
  }

  onEvent(cb: (e: DedupEvent) => void) {
    this.eventListeners.add(cb);
    return () => { this.eventListeners.delete(cb); };
  }

  private emit(e: DedupEvent) { this.eventListeners.forEach((cb) => cb(e)); }

  getStats(): DedupStats { return { ...this.stats }; }
  getPendingCount(): number { return this.pending.size; }

  async dedupStream(
    model: string,
    provider: string,
    messages: Array<{ role: string; content: string }>,
    label: string,
    fetchFn: (onChunk: (chunk: string) => void) => Promise<string>,
    onChunk: ChunkListener,
    signal?: AbortSignal,
  ): Promise<string> {
    const key = this.hashRequest(model, provider, messages);
    this.stats.totalRequests++;

    const existing = this.pending.get(key);
    if (existing) {
      this.stats.dedupedRequests++;
      this.stats.savedAPICalls++;
      this.emit({ type: "hit", key, label, savedCost: 0 });

      existing.chunkListeners.add(onChunk);
      if (existing.full) onChunk(existing.full);

      return new Promise<string>((resolve, reject) => {
        if (signal?.aborted) { existing.chunkListeners.delete(onChunk); reject(new DOMException("Aborted", "AbortError")); return; }
        signal?.addEventListener("abort", () => { existing.chunkListeners.delete(onChunk); existing.completionListeners.delete(resolve); existing.errorListeners.delete(reject); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        existing.completionListeners.add(resolve);
        existing.errorListeners.add(reject);
      });
    }

    const entry: PendingEntry = {
      key, full: "", started: Date.now(),
      chunkListeners: new Set([onChunk]),
      completionListeners: new Set(),
      errorListeners: new Set(),
    };
    this.pending.set(key, entry);
    this.emit({ type: "new", key, label });

    const broadcastChunk = (chunk: string) => {
      entry.full += chunk;
      entry.chunkListeners.forEach((listener) => listener(chunk));
    };

    try {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const full = await fetchFn(broadcastChunk);
      entry.full = full;
      const latency = Date.now() - entry.started;
      perfMonitor.recordLatency(latency);
      this.pending.delete(key);
      this.emit({ type: "done", key });
      entry.completionListeners.forEach((r) => r(full));
      return full;
    } catch (err) {
      this.pending.delete(key);
      this.emit({ type: "error", key });
      entry.errorListeners.forEach((r) => r(err));
      throw err;
    }
  }
}

export const requestDedup = new RequestDeduplicator();
