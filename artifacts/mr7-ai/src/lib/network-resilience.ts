/**
 * Network Resilience Layer
 * Offline-first request queue with IndexedDB persistence.
 * Queues failed POST/PUT requests when offline, auto-replays on reconnect.
 * Eliminates data loss during disconnections.
 */

import { connectionMonitor } from "./connection-monitor";

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  label: string;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
};

export type ReplayResult = {
  id: string;
  label: string;
  success: boolean;
  error?: string;
};

type Listener = (state: ResilienceState) => void;

export type ResilienceState = {
  queued: number;
  replaying: boolean;
  lastReplay: number | null;
  totalReplayed: number;
  totalFailed: number;
};

const DB_NAME    = "mr7-resilience-v1";
const STORE_NAME = "offline-queue";
const DB_VERSION = 1;

class NetworkResilienceLayer {
  private db: IDBDatabase | null = null;
  private replaying  = false;
  private listeners  = new Set<Listener>();
  private state: ResilienceState = {
    queued: 0, replaying: false, lastReplay: null,
    totalReplayed: 0, totalFailed: 0,
  };
  private unsubConn: (() => void) | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;
    this.db = await this.openDB();
    await this.syncQueueCount();

    this.unsubConn = connectionMonitor.subscribe((snap) => {
      if (snap.online && snap.quality !== "poor" && this.state.queued > 0 && !this.replaying) {
        this.replayQueue();
      }
    });
  }

  destroy() {
    this.unsubConn?.();
    this.db?.close();
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb({ ...this.state });
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const snap = { ...this.state };
    this.listeners.forEach(cb => cb(snap));
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
      };
      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
    });
  }

  private txn(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("DB not initialized");
    return this.db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  private idbAll(): Promise<QueuedRequest[]> {
    return new Promise((resolve, reject) => {
      const req = this.txn("readonly").getAll();
      req.onsuccess = () => resolve(req.result as QueuedRequest[]);
      req.onerror   = () => reject(req.error);
    });
  }

  private idbPut(item: QueuedRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.txn("readwrite").put(item);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  private idbDelete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.txn("readwrite").delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  private async syncQueueCount() {
    const items = await this.idbAll();
    this.state.queued = items.length;
    this.notify();
  }

  async enqueue(
    request: { url: string; method: string; headers?: Record<string, string>; body?: string | null; label?: string },
    maxAttempts = 3,
  ): Promise<string> {
    const id = `rq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: QueuedRequest = {
      id,
      url: request.url,
      method: request.method.toUpperCase(),
      headers: request.headers ?? {},
      body: request.body ?? null,
      label: request.label ?? request.url,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts,
    };
    await this.idbPut(item);
    this.state.queued++;
    this.notify();
    return id;
  }

  async replayQueue(): Promise<ReplayResult[]> {
    if (this.replaying || !this.db) return [];
    const items = await this.idbAll();
    if (items.length === 0) return [];

    this.replaying = true;
    this.state.replaying = true;
    this.notify();

    const results: ReplayResult[] = [];

    for (const item of items) {
      const snap = connectionMonitor.getSnapshot();
      if (!snap.online) break;

      item.attempts++;
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch(item.url, {
          method:  item.method,
          headers: item.headers,
          body:    item.body ?? undefined,
          signal:  ctrl.signal,
        });
        clearTimeout(tid);

        if (resp.ok) {
          await this.idbDelete(item.id);
          this.state.totalReplayed++;
          results.push({ id: item.id, label: item.label, success: true });
        } else {
          if (item.attempts >= item.maxAttempts) {
            await this.idbDelete(item.id);
            this.state.totalFailed++;
            results.push({ id: item.id, label: item.label, success: false, error: `HTTP ${resp.status}` });
          } else {
            await this.idbPut(item);
            results.push({ id: item.id, label: item.label, success: false, error: `HTTP ${resp.status} — will retry` });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "network error";
        if (item.attempts >= item.maxAttempts) {
          await this.idbDelete(item.id);
          this.state.totalFailed++;
          results.push({ id: item.id, label: item.label, success: false, error: msg });
        } else {
          await this.idbPut(item);
          results.push({ id: item.id, label: item.label, success: false, error: `${msg} — will retry` });
        }
      }
    }

    await this.syncQueueCount();
    this.replaying = false;
    this.state.replaying = false;
    this.state.lastReplay = Date.now();
    this.notify();

    return results;
  }

  async clearQueue(): Promise<void> {
    const items = await this.idbAll();
    for (const item of items) await this.idbDelete(item.id);
    this.state.queued = 0;
    this.notify();
  }

  getState(): ResilienceState { return { ...this.state }; }
}

export const networkResilience = new NetworkResilienceLayer();

if (typeof window !== "undefined") {
  networkResilience.init().catch(() => {});
}
