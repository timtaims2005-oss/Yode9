/**
 * Abort Controller Registry
 * Centralized management of all in-flight AbortControllers.
 * Automatically cancels stale requests when navigating away or switching chats.
 */

type Entry = {
  controller: AbortController;
  label:      string;
  chatId:     string;
  createdAt:  number;
};

class AbortRegistry {
  private map = new Map<string, Entry>();
  private seq = 0;

  /** Register a new abort controller. Returns [signal, cancel fn, key]. */
  register(label: string, chatId: string): [AbortSignal, () => void, string] {
    const key        = `${++this.seq}-${label}`;
    const controller = new AbortController();
    this.map.set(key, { controller, label, chatId, createdAt: Date.now() });
    const cancel = () => this.cancel(key);
    return [controller.signal, cancel, key];
  }

  /** Cancel a specific request. */
  cancel(key: string) {
    const entry = this.map.get(key);
    if (entry) {
      entry.controller.abort();
      this.map.delete(key);
    }
  }

  /** Cancel all requests for a specific chat. */
  cancelChat(chatId: string) {
    for (const [key, entry] of this.map) {
      if (entry.chatId === chatId) {
        entry.controller.abort();
        this.map.delete(key);
      }
    }
  }

  /** Cancel ALL in-flight requests. */
  cancelAll() {
    for (const [key, entry] of this.map) {
      entry.controller.abort();
      this.map.delete(key);
    }
  }

  /** Cancel requests older than maxAgeMs (default 5 min). */
  pruneStale(maxAgeMs = 300_000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, entry] of this.map) {
      if (entry.createdAt < cutoff) {
        entry.controller.abort();
        this.map.delete(key);
      }
    }
  }

  /** Remove a completed (non-aborted) entry. */
  remove(key: string) {
    this.map.delete(key);
  }

  get activeCount() { return this.map.size; }

  summary(): Array<{ key: string; label: string; chatId: string; ageMs: number }> {
    const now = Date.now();
    return [...this.map.entries()].map(([key, e]) => ({
      key,
      label:  e.label,
      chatId: e.chatId,
      ageMs:  now - e.createdAt,
    }));
  }
}

export const abortRegistry = new AbortRegistry();

// Auto-prune stale requests every 2 minutes
if (typeof window !== "undefined") {
  setInterval(() => abortRegistry.pruneStale(), 120_000);
}
