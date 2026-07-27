/**
 * Connection Quality Monitor
 * Measures real network latency via fetch-based pinging every 10 seconds.
 * Classifies connection: excellent / good / fair / poor / offline
 */

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "offline";

export type ConnectionSnapshot = {
  latencyMs: number;
  p95Ms: number;
  quality: ConnectionQuality;
  online: boolean;
  downlink: number;      // Mbps estimate from Navigator API
  effectiveType: string; // "4g" | "3g" | "2g" | "slow-2g"
  packetLoss: number;    // 0–1
  consecutiveFails: number;
  lastChecked: number;
};

type Subscriber = (snap: ConnectionSnapshot) => void;

const PING_URL   = "/api/health";
const PING_MS    = 10_000;
const TIMEOUT_MS = 5_000;
const HISTORY    = 20;

class ConnectionMonitor {
  private latencies: number[]    = [];
  private fails                  = 0;
  private consecutive            = 0;
  private online                 = navigator.onLine;
  private subs                   = new Set<Subscriber>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private snapshot: ConnectionSnapshot = this.buildSnap(0);

  start() {
    if (this.timer) return;
    window.addEventListener("online",  () => { this.online = true;  this.ping(); });
    window.addEventListener("offline", () => { this.online = false; this.broadcast(); });
    this.ping();
    this.timer = setInterval(() => this.ping(), PING_MS);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  subscribe(cb: Subscriber) {
    this.subs.add(cb);
    cb(this.snapshot);
    return () => this.subs.delete(cb);
  }

  getSnapshot(): ConnectionSnapshot { return this.snapshot; }

  private async ping() {
    if (!this.online) { this.broadcast(); return; }
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      await fetch(`${PING_URL}?_t=${t0}`, {
        method: "HEAD",
        cache:  "no-store",
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const ms = Math.round(performance.now() - t0);
      this.latencies.push(ms);
      if (this.latencies.length > HISTORY) this.latencies.shift();
      this.consecutive = 0;
      this.snapshot = this.buildSnap(ms);
    } catch {
      this.fails++;
      this.consecutive++;
      this.snapshot = this.buildSnap(-1);
    }
    this.broadcast();
  }

  private buildSnap(latencyMs: number): ConnectionSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg    = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95    = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] : 0;

    const nav = (navigator as unknown as {
      connection?: { downlink?: number; effectiveType?: string };
    }).connection;
    const downlink      = nav?.downlink      ?? 0;
    const effectiveType = nav?.effectiveType ?? "unknown";

    const recentFails = this.latencies.length < 3 ? 0 :
      (this.fails / Math.max(1, this.fails + this.latencies.length));
    const packetLoss  = Math.min(1, recentFails);

    let quality: ConnectionQuality = "offline";
    if (latencyMs === -1 && this.consecutive > 2) { quality = "offline"; }
    else if (!this.online)                         { quality = "offline"; }
    else if (avg < 80)                             { quality = "excellent"; }
    else if (avg < 200)                            { quality = "good"; }
    else if (avg < 500)                            { quality = "fair"; }
    else                                           { quality = "poor"; }

    return {
      latencyMs: latencyMs === -1 ? avg : latencyMs,
      p95Ms: p95,
      quality,
      online: this.online,
      downlink,
      effectiveType,
      packetLoss,
      consecutiveFails: this.consecutive,
      lastChecked: Date.now(),
    };
  }

  private broadcast() {
    this.subs.forEach(cb => cb(this.snapshot));
  }
}

export const connectionMonitor = new ConnectionMonitor();

if (typeof window !== "undefined") {
  connectionMonitor.start();
}
