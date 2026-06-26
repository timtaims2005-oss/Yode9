// eBPF Inspector — مستوحى من eBPF (Extended Berkeley Packet Filter)
// يستخدمه Cloudflare وFacebook لمراقبة الشبكة
// browser equivalent: يعترض كل fetch/XHR/WebSocket بدون تعديلها

import { eventBus } from './event-bus';

interface RequestRecord {
  id: string;
  url: string;
  method: string;
  startTime: number;
  ttfb?: number;          // Time to first byte
  endTime?: number;
  payloadSize: number;
  responseSize: number;
  status?: number;
  latency?: number;
  throughput?: number;    // bytes/sec
  isAnomaly: boolean;
}

interface EndpointStats {
  url: string;
  count: number;
  avgLatency: number;
  maxLatency: number;
  totalBytes: number;
  errorRate: number;
  heatScore: number;      // خريطة حرارية
}

interface AnomalyThresholds {
  latencyMs: number;
  payloadKB: number;
  errorRatePercent: number;
}

const ANOMALY_THRESHOLDS: AnomalyThresholds = {
  latencyMs: 3000,
  payloadKB: 512,
  errorRatePercent: 20,
};

class EBPFInspector {
  private records: Map<string, RequestRecord> = new Map();
  private endpointStats: Map<string, EndpointStats> = new Map();
  private requestCounter = 0;
  private initialized = false;
  private originalFetch: typeof window.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  init(): void {
    if (this.initialized) return;
    this._interceptFetch();
    this._interceptXHR();
    this._interceptWebSocket();
    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[eBPFInspector] Network interception active');
    }
  }

  private _genId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  private _interceptFetch(): void {
    this.originalFetch = window.fetch.bind(window);
    const self = this;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const id = self._genId();
      const url = typeof input === 'string' ? input
        : input instanceof URL ? input.href
        : (input as Request).url;
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const payloadSize = init?.body
        ? new Blob([init.body as BlobPart]).size
        : 0;

      const record: RequestRecord = {
        id,
        url,
        method: method.toUpperCase(),
        startTime: performance.now(),
        payloadSize,
        responseSize: 0,
        isAnomaly: false,
      };
      self.records.set(id, record);

      try {
        const response = await (self.originalFetch!)(input, init);
        const clone = response.clone();

        record.endTime = performance.now();
        record.latency = record.endTime - record.startTime;
        record.status = response.status;

        // قياس حجم الاستجابة
        clone.blob().then(blob => {
          record.responseSize = blob.size;
          record.throughput = blob.size / (record.latency! / 1000); // bytes/sec
          self._analyzeRecord(record);
        }).catch(() => {});

        return response;
      } catch (err) {
        record.endTime = performance.now();
        record.latency = record.endTime - record.startTime;
        record.status = 0;
        record.isAnomaly = true;
        self._analyzeRecord(record);
        throw err;
      }
    };
  }

  private _interceptXHR(): void {
    const self = this;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: unknown[]) {
      (this as unknown as Record<string, unknown>).__ebpf_id = self._genId();
      (this as unknown as Record<string, unknown>).__ebpf_url = url.toString();
      (this as unknown as Record<string, unknown>).__ebpf_method = method;
      return (self.originalXHROpen as Function).call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const id = (this as unknown as Record<string, unknown>).__ebpf_id as string;
      const url = (this as unknown as Record<string, unknown>).__ebpf_url as string;
      const method = (this as unknown as Record<string, unknown>).__ebpf_method as string;

      if (id) {
        const record: RequestRecord = {
          id,
          url,
          method: method.toUpperCase(),
          startTime: performance.now(),
          payloadSize: body ? new Blob([body as BlobPart]).size : 0,
          responseSize: 0,
          isAnomaly: false,
        };
        self.records.set(id, record);

        this.addEventListener('load', () => {
          record.endTime = performance.now();
          record.latency = record.endTime - record.startTime;
          record.status = this.status;
          record.responseSize = (this.response as string)?.length ?? 0;
          self._analyzeRecord(record);
        });

        this.addEventListener('error', () => {
          record.endTime = performance.now();
          record.latency = record.endTime - record.startTime;
          record.status = 0;
          record.isAnomaly = true;
          self._analyzeRecord(record);
        });
      }

      return (self.originalXHRSend as Function).call(this, body);
    };
  }

  private _interceptWebSocket(): void {
    const OriginalWebSocket = window.WebSocket;
    const self = this;

    window.WebSocket = class extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        const wsUrl = url.toString();
        const id = self._genId();
        const record: RequestRecord = {
          id,
          url: wsUrl,
          method: 'WS',
          startTime: performance.now(),
          payloadSize: 0,
          responseSize: 0,
          isAnomaly: false,
        };
        self.records.set(id, record);

        this.addEventListener('open', () => {
          record.ttfb = performance.now() - record.startTime;
        });

        this.addEventListener('message', (event: MessageEvent) => {
          const size = typeof event.data === 'string'
            ? event.data.length
            : event.data instanceof ArrayBuffer ? event.data.byteLength : 0;
          record.responseSize += size;
        });

        this.addEventListener('close', () => {
          record.endTime = performance.now();
          record.latency = record.endTime - record.startTime;
          self._analyzeRecord(record);
        });
      }
    } as typeof WebSocket;
  }

  private _analyzeRecord(record: RequestRecord): void {
    // كشف anomaly
    if (record.latency && record.latency > ANOMALY_THRESHOLDS.latencyMs) {
      record.isAnomaly = true;
    }
    if (record.payloadSize > ANOMALY_THRESHOLDS.payloadKB * 1024) {
      record.isAnomaly = true;
    }

    // تحديث endpoint stats
    const key = this._normalizeUrl(record.url);
    const existing = this.endpointStats.get(key);

    if (existing) {
      const totalRequests = existing.count + 1;
      const errors = record.status === 0 || (record.status && record.status >= 500) ? 1 : 0;
      existing.avgLatency = (existing.avgLatency * existing.count + (record.latency ?? 0)) / totalRequests;
      existing.maxLatency = Math.max(existing.maxLatency, record.latency ?? 0);
      existing.totalBytes += record.responseSize;
      existing.errorRate = (existing.errorRate * existing.count + errors) / totalRequests * 100;
      existing.count = totalRequests;
      existing.heatScore = Math.min(100, existing.count * 2 + (existing.avgLatency > 1000 ? 20 : 0));
    } else {
      this.endpointStats.set(key, {
        url: key,
        count: 1,
        avgLatency: record.latency ?? 0,
        maxLatency: record.latency ?? 0,
        totalBytes: record.responseSize,
        errorRate: 0,
        heatScore: 2,
      });
    }

    // إرسال alert عند anomaly
    if (record.isAnomaly) {
      eventBus.emit('ebpf:anomaly', {
        url: record.url,
        method: record.method,
        latency: record.latency,
        status: record.status,
      });

      if (import.meta.env.DEV) {
        console.warn('[eBPFInspector] Anomaly detected:', record);
      }
    }
  }

  private _normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      // إزالة query params وIDs لتجميع endpoints المتشابهة
      return parsed.pathname.replace(/\/\d+/g, '/:id').replace(/\/[0-9a-f-]{36}/g, '/:uuid');
    } catch {
      return url;
    }
  }

  getHeatmap(): EndpointStats[] {
    return Array.from(this.endpointStats.values())
      .sort((a, b) => b.heatScore - a.heatScore);
  }

  getRecentAnomalies(): RequestRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.isAnomaly)
      .slice(-20);
  }

  getStats(): { totalRequests: number; anomalies: number; topEndpoints: EndpointStats[] } {
    const anomalies = Array.from(this.records.values()).filter(r => r.isAnomaly).length;
    return {
      totalRequests: this.requestCounter,
      anomalies,
      topEndpoints: this.getHeatmap().slice(0, 5),
    };
  }
}

export const ebpfInspector = new EBPFInspector();
