export type AnomalyEvent = {
  id: string;
  type: "rapid_fire" | "pattern_anomaly" | "large_payload" | "repeated_error" | "high_frequency";
  severity: "low" | "medium" | "high";
  message: string;
  ts: number;
  value: number;
  threshold: number;
};

export type AnomalyStats = {
  total: number;
  byType: Record<string, number>;
  riskScore: number;
};

let _counter = 0;

class AnomalyDetector {
  private events: AnomalyEvent[] = [];
  private requestTimestamps: number[] = [];
  private errorTimestamps: number[] = [];
  private subscribers = new Set<(e: AnomalyEvent) => void>();
  private stats: AnomalyStats = { total: 0, byType: {}, riskScore: 0 };

  subscribe(cb: (e: AnomalyEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private emit(e: AnomalyEvent) {
    this.events.unshift(e);
    if (this.events.length > 200) this.events.length = 200;
    this.stats.total++;
    this.stats.byType[e.type] = (this.stats.byType[e.type] ?? 0) + 1;
    this.stats.riskScore = Math.min(100, this.stats.riskScore + (e.severity === "high" ? 15 : e.severity === "medium" ? 7 : 3));
    this.subscribers.forEach((cb) => cb(e));
    setTimeout(() => { this.stats.riskScore = Math.max(0, this.stats.riskScore - 2); }, 30000);
  }

  private makeId() { return `anom-${++_counter}-${Date.now().toString(36)}`; }

  recordRequest(messageLength: number) {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);

    const recentRate = this.requestTimestamps.length;
    if (recentRate > 20) {
      this.emit({ id: this.makeId(), type: "high_frequency", severity: "high",
        message: `High request frequency: ${recentRate} requests/min`,
        ts: now, value: recentRate, threshold: 20 });
    } else if (recentRate > 10) {
      this.emit({ id: this.makeId(), type: "rapid_fire", severity: "medium",
        message: `Elevated request rate: ${recentRate} requests/min`,
        ts: now, value: recentRate, threshold: 10 });
    }

    if (messageLength > 8000) {
      this.emit({ id: this.makeId(), type: "large_payload", severity: "medium",
        message: `Large payload detected: ${messageLength} characters`,
        ts: now, value: messageLength, threshold: 8000 });
    } else if (messageLength > 15000) {
      this.emit({ id: this.makeId(), type: "large_payload", severity: "high",
        message: `Extremely large payload: ${messageLength} characters`,
        ts: now, value: messageLength, threshold: 15000 });
    }
  }

  recordError() {
    const now = Date.now();
    this.errorTimestamps.push(now);
    this.errorTimestamps = this.errorTimestamps.filter((t) => now - t < 120000);
    if (this.errorTimestamps.length > 5) {
      this.emit({ id: this.makeId(), type: "repeated_error", severity: "high",
        message: `Repeated errors detected: ${this.errorTimestamps.length} in 2 min`,
        ts: now, value: this.errorTimestamps.length, threshold: 5 });
    }
  }

  getEvents(): AnomalyEvent[] { return [...this.events]; }
  getStats(): AnomalyStats { return { ...this.stats }; }
  clearRisk() { this.stats.riskScore = 0; }
}

export const anomalyDetector = new AnomalyDetector();
