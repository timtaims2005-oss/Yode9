// Circuit Breaker — مستوحى من Circuit Breaker Pattern (Netflix Hystrix)
// ثلاث حالات: CLOSED → OPEN → HALF-OPEN → CLOSED
// يوقف الطلبات المتكررة للـ API الفاشل

import { eventBus } from './event-bus';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitConfig {
  failureThreshold: number;   // عدد الفشل قبل الفتح
  recoveryTimeMs: number;     // وقت الانتظار قبل HALF_OPEN
  successThreshold: number;   // نجاحات HALF_OPEN للعودة CLOSED
  timeout: number;            // timeout للطلب الواحد
}

interface CircuitStatus {
  endpoint: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
  totalBlocked: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  recoveryTimeMs: 30_000,   // 30 ثانية
  successThreshold: 2,
  timeout: 10_000,
};

class Circuit {
  state: CircuitState = 'CLOSED';
  failures = 0;
  successes = 0;
  lastFailureTime?: number;
  nextRetryTime?: number;
  totalBlocked = 0;
  config: CircuitConfig;
  endpoint: string;

  constructor(endpoint: string, config: CircuitConfig) {
    this.endpoint = endpoint;
    this.config = config;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this._close();
      }
    } else if (this.state === 'CLOSED') {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.config.failureThreshold) {
      this._open();
    }
  }

  canRequest(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // فحص إذا حان وقت المحاولة
      if (Date.now() >= (this.nextRetryTime ?? 0)) {
        this._halfOpen();
        return true;
      }
      this.totalBlocked++;
      return false;
    }

    // HALF_OPEN: يسمح بطلب واحد فقط
    return true;
  }

  private _open(): void {
    this.state = 'OPEN';
    this.nextRetryTime = Date.now() + this.config.recoveryTimeMs;
    this.successes = 0;

    eventBus.emit('circuit:open', {
      endpoint: this.endpoint,
      failures: this.failures,
      nextRetry: this.nextRetryTime,
    });
  }

  private _halfOpen(): void {
    this.state = 'HALF_OPEN';
    this.successes = 0;

    eventBus.emit('circuit:half-open', { endpoint: this.endpoint });
  }

  private _close(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextRetryTime = undefined;

    eventBus.emit('circuit:closed', { endpoint: this.endpoint });
  }

  getStatus(): CircuitStatus {
    return {
      endpoint: this.endpoint,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
      totalBlocked: this.totalBlocked,
    };
  }
}

class CircuitBreaker {
  private circuits: Map<string, Circuit> = new Map();
  private globalConfig: CircuitConfig = DEFAULT_CONFIG;
  private initialized = false;

  init(config: Partial<CircuitConfig> = {}): void {
    if (this.initialized) return;
    this.globalConfig = { ...DEFAULT_CONFIG, ...config };
    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[CircuitBreaker] Initialized — threshold:', this.globalConfig.failureThreshold, 'failures');
    }
  }

  private _getCircuit(endpoint: string): Circuit {
    let circuit = this.circuits.get(endpoint);
    if (!circuit) {
      circuit = new Circuit(endpoint, this.globalConfig);
      this.circuits.set(endpoint, circuit);
    }
    return circuit;
  }

  // تنفيذ طلب مع حماية Circuit Breaker
  async execute<T>(
    endpoint: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    const circuit = this._getCircuit(endpoint);

    if (!circuit.canRequest()) {
      if (import.meta.env.DEV) {
        console.warn('[CircuitBreaker] BLOCKED:', endpoint, '— retry at:', new Date(circuit.nextRetryTime!));
      }

      if (fallback) return fallback();
      throw new Error(`Circuit OPEN for ${endpoint}. Retry after ${Math.ceil(((circuit.nextRetryTime ?? 0) - Date.now()) / 1000)}s`);
    }

    // تطبيق timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${endpoint}`)), this.globalConfig.timeout)
    );

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      circuit.recordSuccess();
      return result;
    } catch (err) {
      circuit.recordFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  // حماية fetch مع Circuit Breaker
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const endpoint = this._normalizeEndpoint(url);

    return this.execute(
      endpoint,
      () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.globalConfig.timeout);

        return fetch(url, { ...init, signal: controller.signal })
          .finally(() => clearTimeout(timer));
      },
      () => new Response(JSON.stringify({ error: 'Service unavailable', circuit: 'OPEN' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  private _normalizeEndpoint(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname.replace(/\/\d+/g, '/:id');
    } catch {
      return url;
    }
  }

  // إعادة تشغيل circuit يدوياً
  reset(endpoint: string): void {
    this.circuits.delete(endpoint);
  }

  resetAll(): void {
    this.circuits.clear();
  }

  // حالة كل circuits للـ SystemHealthBar
  getAllStatus(): CircuitStatus[] {
    return Array.from(this.circuits.values()).map(c => c.getStatus());
  }

  getStatus(endpoint: string): CircuitStatus | null {
    return this.circuits.get(endpoint)?.getStatus() ?? null;
  }

  isOpen(endpoint: string): boolean {
    return this.circuits.get(endpoint)?.state === 'OPEN';
  }
}

export const circuitBreaker = new CircuitBreaker();
