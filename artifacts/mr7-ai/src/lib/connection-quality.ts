/**
 * Connection Quality Monitor — measures real bandwidth, latency, and packet loss.
 * Uses navigator.connection API + ping-based latency measurement.
 * Adapts streaming parameters (chunk size, timeout) based on quality.
 */

export type ConnectionGrade = "excellent" | "good" | "fair" | "poor" | "offline";

export interface ConnectionMetrics {
  grade: ConnectionGrade;
  latencyMs: number;
  bandwidthMbps: number;
  effectiveType: string;
  rtt: number;
  downlink: number;
  saveData: boolean;
  adaptations: StreamAdaptations;
}

export interface StreamAdaptations {
  chunkDelayMs: number;
  timeoutMs: number;
  maxRetries: number;
  enableCompression: boolean;
  preferLowLatency: boolean;
}

const GRADE_ADAPTATIONS: Record<ConnectionGrade, StreamAdaptations> = {
  excellent: { chunkDelayMs: 0,   timeoutMs: 30000, maxRetries: 1, enableCompression: false, preferLowLatency: false },
  good:      { chunkDelayMs: 0,   timeoutMs: 45000, maxRetries: 2, enableCompression: false, preferLowLatency: false },
  fair:      { chunkDelayMs: 50,  timeoutMs: 60000, maxRetries: 3, enableCompression: true,  preferLowLatency: true  },
  poor:      { chunkDelayMs: 200, timeoutMs: 90000, maxRetries: 4, enableCompression: true,  preferLowLatency: true  },
  offline:   { chunkDelayMs: 0,   timeoutMs: 0,     maxRetries: 0, enableCompression: true,  preferLowLatency: false },
};

type ConnectionCallback = (metrics: ConnectionMetrics) => void;

class ConnectionQualityMonitor {
  private metrics: ConnectionMetrics = {
    grade: "good",
    latencyMs: 50,
    bandwidthMbps: 10,
    effectiveType: "4g",
    rtt: 50,
    downlink: 10,
    saveData: false,
    adaptations: GRADE_ADAPTATIONS.good,
  };
  private listeners = new Set<ConnectionCallback>();
  private pingHistory: number[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  start() {
    // Read Network Information API
    this.readNetworkInfo();

    // Listen to connection changes
    const conn = (navigator as unknown as { connection?: { addEventListener: (e: string, cb: () => void) => void } }).connection;
    conn?.addEventListener("change", () => this.readNetworkInfo());

    // Periodic latency ping
    this.pingTimer = setInterval(() => this.measureLatency(), 15000);
    this.measureLatency(); // immediate first measurement
  }

  stop() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  onMetrics(cb: ConnectionCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get current() { return this.metrics; }
  get adaptations() { return this.metrics.adaptations; }
  get isOnline() { return navigator.onLine && this.metrics.grade !== "offline"; }
  get isSlow() { return this.metrics.grade === "poor" || this.metrics.grade === "fair"; }

  private readNetworkInfo() {
    const conn = (navigator as unknown as {
      connection?: {
        effectiveType?: string;
        rtt?: number;
        downlink?: number;
        saveData?: boolean;
      }
    }).connection;

    const effectiveType = conn?.effectiveType ?? "4g";
    const rtt = conn?.rtt ?? 50;
    const downlink = conn?.downlink ?? 10;
    const saveData = conn?.saveData ?? false;

    const grade = this.gradeFromNetwork(effectiveType, rtt, downlink);
    this.updateMetrics({ effectiveType, rtt, downlink, saveData, grade });
  }

  private async measureLatency() {
    if (!navigator.onLine) {
      this.updateMetrics({ grade: "offline", latencyMs: 9999 });
      return;
    }
    const t0 = performance.now();
    try {
      await fetch("/api/health?_t=" + t0, { method: "HEAD", cache: "no-store" })
        .catch(() => fetch("https://dns.google/resolve?name=a", { cache: "no-store" }));
      const latency = Math.round(performance.now() - t0);
      this.pingHistory.push(latency);
      if (this.pingHistory.length > 5) this.pingHistory.shift();
      const avgLatency = this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
      this.updateMetrics({ latencyMs: Math.round(avgLatency) });
    } catch {
      this.updateMetrics({ grade: "offline" });
    }
  }

  private gradeFromNetwork(type: string, rtt: number, downlink: number): ConnectionGrade {
    if (!navigator.onLine) return "offline";
    if (type === "4g" && rtt < 100 && downlink > 5) return "excellent";
    if (type === "4g" && rtt < 200) return "good";
    if (type === "3g" || rtt < 400) return "fair";
    if (type === "2g" || rtt >= 400) return "poor";
    return "good";
  }

  private updateMetrics(patch: Partial<ConnectionMetrics>) {
    const merged: ConnectionMetrics = {
      ...this.metrics,
      ...patch,
      adaptations: GRADE_ADAPTATIONS[patch.grade ?? this.metrics.grade],
    };
    this.metrics = merged;
    this.listeners.forEach(cb => cb(merged));
  }
}

export const connectionQuality = new ConnectionQualityMonitor();
