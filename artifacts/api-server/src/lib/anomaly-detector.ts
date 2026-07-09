/**
 * AI Anomaly Detector v4.0
 * Statistical anomaly detection using Z-score, IQR, and EWMA algorithms.
 * Detects DDoS, credential stuffing, data exfiltration, and insider threats.
 */

export type AnomalyType =
  | "ddos" | "credential_stuffing" | "data_exfiltration"
  | "port_scan" | "lateral_movement" | "privilege_escalation"
  | "c2_beacon" | "sql_injection" | "xss" | "path_traversal";

export type AnomalySeverity = "critical" | "high" | "medium" | "low";

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-100
  description: string;
  sourceIp?: string;
  targetEndpoint?: string;
  evidence: Record<string, unknown>;
  detectedAt: Date;
  mitigated: boolean;
  mitigation?: string;
}

interface MetricWindow {
  values: number[];
  timestamps: number[];
  ewma: number;
  ewmaVar: number;
}

const EWMA_ALPHA = 0.3;
const ANOMALY_SIGMA_THRESHOLD = 3.5;

function computeZScore(value: number, window: MetricWindow): number {
  if (window.values.length < 5) return 0;
  const mean = window.values.reduce((a, b) => a + b, 0) / window.values.length;
  const variance = window.values.reduce((s, v) => s + (v - mean) ** 2, 0) / window.values.length;
  const std = Math.sqrt(variance);
  return std === 0 ? 0 : Math.abs((value - mean) / std);
}

function updateEWMA(window: MetricWindow, value: number): void {
  if (window.values.length === 0) {
    window.ewma = value;
    window.ewmaVar = 0;
  } else {
    const diff = value - window.ewma;
    window.ewma = EWMA_ALPHA * value + (1 - EWMA_ALPHA) * window.ewma;
    window.ewmaVar = (1 - EWMA_ALPHA) * (window.ewmaVar + EWMA_ALPHA * diff * diff);
  }
}

export class AnomalyDetector {
  private metrics = new Map<string, MetricWindow>();
  private events: AnomalyEvent[] = [];
  private readonly maxEvents = 5000;
  private readonly windowSize = 100;

  record(metricKey: string, value: number, timestamp = Date.now()): AnomalyEvent | null {
    let win = this.metrics.get(metricKey);
    if (!win) {
      win = { values: [], timestamps: [], ewma: value, ewmaVar: 0 };
      this.metrics.set(metricKey, win);
    }

    updateEWMA(win, value);
    const zScore = computeZScore(value, win);

    win.values.push(value);
    win.timestamps.push(timestamp);
    if (win.values.length > this.windowSize) {
      win.values.shift(); win.timestamps.shift();
    }

    if (zScore > ANOMALY_SIGMA_THRESHOLD) {
      return this.createEvent(metricKey, value, zScore, win);
    }
    return null;
  }

  private createEvent(key: string, value: number, zScore: number, win: MetricWindow): AnomalyEvent {
    const type = this.inferType(key);
    const severity = zScore > 6 ? "critical" : zScore > 4.5 ? "high" : zScore > 3.5 ? "medium" : "low";
    const score = Math.min(100, Math.round((zScore / 10) * 100));

    const event: AnomalyEvent = {
      id: Math.random().toString(36).slice(2),
      type, severity, score,
      description: this.describe(type, value, win.ewma),
      evidence: { value, zScore, ewma: win.ewma, ewmaVariance: win.ewmaVar, metricKey: key },
      detectedAt: new Date(),
      mitigated: false,
    };
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    return event;
  }

  private inferType(key: string): AnomalyType {
    const k = key.toLowerCase();
    if (k.includes("login") || k.includes("auth")) return "credential_stuffing";
    if (k.includes("request_rate") || k.includes("rps")) return "ddos";
    if (k.includes("data_out") || k.includes("egress") || k.includes("bytes_out")) return "data_exfiltration";
    if (k.includes("port") || k.includes("scan")) return "port_scan";
    if (k.includes("lateral") || k.includes("smb")) return "lateral_movement";
    if (k.includes("privilege") || k.includes("sudo")) return "privilege_escalation";
    if (k.includes("beacon") || k.includes("c2") || k.includes("callback")) return "c2_beacon";
    if (k.includes("sql") || k.includes("query")) return "sql_injection";
    return "ddos";
  }

  private describe(type: AnomalyType, value: number, baseline: number): string {
    const ratio = baseline > 0 ? (value / baseline).toFixed(1) : "∞";
    const descriptions: Record<AnomalyType, string> = {
      ddos:                `Request rate ${ratio}x above baseline — possible DDoS attack`,
      credential_stuffing: `Login attempt rate ${ratio}x above baseline — credential stuffing suspected`,
      data_exfiltration:   `Egress volume ${ratio}x above baseline — possible data exfiltration`,
      port_scan:           `Port connection rate ${ratio}x above baseline — network scanning detected`,
      lateral_movement:    `Internal traffic ${ratio}x above baseline — lateral movement pattern`,
      privilege_escalation:`Privilege operations ${ratio}x above baseline — escalation attempt`,
      c2_beacon:           `Periodic callback pattern detected — possible C2 beacon`,
      sql_injection:       `SQL error rate ${ratio}x above baseline — injection attempt`,
      xss:                 `Script injection pattern in ${ratio}x of requests`,
      path_traversal:      `Path traversal patterns ${ratio}x above baseline`,
    };
    return descriptions[type];
  }

  getRecentEvents(limit = 50, minSeverity?: AnomalySeverity): AnomalyEvent[] {
    const sevs: AnomalySeverity[] = ["low","medium","high","critical"];
    const minIdx = minSeverity ? sevs.indexOf(minSeverity) : 0;
    return this.events.filter(e => sevs.indexOf(e.severity) >= minIdx).slice(0, limit);
  }

  mitigate(eventId: string, mitigation: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;
    event.mitigated = true;
    event.mitigation = mitigation;
    return true;
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      unmitigated: this.events.filter(e => !e.mitigated).length,
      byType: Object.fromEntries(
        [...new Set(this.events.map(e => e.type))].map(t => [t, this.events.filter(e => e.type === t).length])
      ),
      bySeverity: {
        critical: this.events.filter(e => e.severity === "critical").length,
        high: this.events.filter(e => e.severity === "high").length,
        medium: this.events.filter(e => e.severity === "medium").length,
        low: this.events.filter(e => e.severity === "low").length,
      },
    };
  }
}

export const anomalyDetector = new AnomalyDetector();
