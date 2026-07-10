/**
 * Web Worker Pool — offloads CPU-heavy tasks to background threads.
 * Prevents main-thread jank from FTS indexing, JSON parsing, encryption, etc.
 * Uses a round-robin pool with task queue and promise-based API.
 */

export type WorkerTask =
  | { type: "fts_index"; chatId: string; title: string; content: string }
  | { type: "fts_search"; query: string; limit?: number }
  | { type: "json_parse"; raw: string }
  | { type: "json_stringify"; data: unknown }
  | { type: "compress"; text: string }
  | { type: "hash"; text: string };

export type WorkerResult = {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

const WORKER_COUNT = Math.max(1, Math.min(4, (navigator.hardwareConcurrency ?? 2) - 1));

// Inline worker code as a blob — no separate worker file needed
const WORKER_CODE = `
const ftsIndex = new Map();
const idf = new Map();
const docCount = { n: 0 };

function tokenize(text) {
  return text.toLowerCase().replace(/[^\\u0600-\\u06FFa-z0-9 ]/g, ' ').split(/\\s+/).filter(t => t.length > 1);
}

function updateIDF(terms) {
  for (const t of new Set(terms)) {
    idf.set(t, (idf.get(t) || 0) + 1);
  }
  docCount.n++;
}

function ftsSearch(query, limit = 10) {
  const terms = tokenize(query);
  const scores = new Map();
  for (const term of terms) {
    for (const [docId, tf] of (ftsIndex.get(term) || [])) {
      const df = idf.get(term) || 1;
      const score = (scores.get(docId) || 0) + tf * Math.log(1 + docCount.n / df);
      scores.set(docId, score);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, score]) => ({ id, score }));
}

function djb2Hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

self.onmessage = ({ data }) => {
  const { id, task } = data;
  try {
    let result;
    switch (task.type) {
      case 'fts_index': {
        const terms = tokenize(task.title + ' ' + task.content);
        const freq = {};
        for (const t of terms) freq[t] = (freq[t] || 0) + 1;
        const maxFreq = Math.max(1, ...Object.values(freq));
        for (const [t, f] of Object.entries(freq)) {
          const tf = f / maxFreq;
          const list = ftsIndex.get(t) || [];
          list.push([task.chatId, tf]);
          ftsIndex.set(t, list);
        }
        updateIDF(terms);
        result = { indexed: terms.length };
        break;
      }
      case 'fts_search':
        result = ftsSearch(task.query, task.limit);
        break;
      case 'json_parse':
        result = JSON.parse(task.raw);
        break;
      case 'json_stringify':
        result = JSON.stringify(task.data);
        break;
      case 'hash':
        result = djb2Hash(task.text);
        break;
      default:
        throw new Error('Unknown task: ' + task.type);
    }
    self.postMessage({ id, ok: true, data: result });
  } catch (e) {
    self.postMessage({ id, ok: false, error: e.message });
  }
};
`;

class WorkerPool {
  private workers: Worker[] = [];
  private next = 0;
  private pending = new Map<string, { resolve: (r: unknown) => void; reject: (e: Error) => void }>();
  private taskCounter = 0;
  private enabled = typeof Worker !== "undefined";

  init() {
    if (!this.enabled || this.workers.length > 0) return;
    const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    for (let i = 0; i < WORKER_COUNT; i++) {
      const w = new Worker(url);
      w.onmessage = ({ data }: MessageEvent<WorkerResult>) => {
        const p = this.pending.get(data.id);
        if (!p) return;
        this.pending.delete(data.id);
        if (data.ok) p.resolve(data.data);
        else p.reject(new Error(data.error ?? "Worker error"));
      };
      w.onerror = (e) => console.warn("[WorkerPool] worker error:", e.message);
      this.workers.push(w);
    }
    // Don't revoke URL early — workers need it until terminated
  }

  run<T = unknown>(task: WorkerTask): Promise<T> {
    if (!this.enabled || this.workers.length === 0) {
      return Promise.reject(new Error("WorkerPool not initialized"));
    }
    const id = `t${++this.taskCounter}`;
    const worker = this.workers[this.next % this.workers.length];
    this.next++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (r: unknown) => void, reject });
      worker.postMessage({ id, task });
    });
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.pending.clear();
  }

  get workerCount() { return this.workers.length; }
  get pendingCount() { return this.pending.size; }
}

export const workerPool = new WorkerPool();
