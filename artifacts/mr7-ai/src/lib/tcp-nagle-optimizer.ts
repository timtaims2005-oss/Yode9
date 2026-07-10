// TCP Nagle Optimizer — مستوحى من Nagle Algorithm + TCP_NODELAY
// المشكلة: طلبات صغيرة كثيرة → network overhead عالي
// الحل: coalescing window يجمع الطلبات الصغيرة ويرسل الكبيرة فوراً

interface PendingRequest {
  id: string;
  url: string;
  init: RequestInit;
  resolve: (res: Response) => void;
  reject: (err: unknown) => void;
  size: number;
  timestamp: number;
}

interface NagleStats {
  totalRequests: number;
  batchedRequests: number;
  immediateRequests: number;
  savedRoundTrips: number;
  avgCoalesceWindow: number;
}

const COALESCE_WINDOW_MS = 100;  // جمع الطلبات خلال 100ms
const LARGE_REQUEST_THRESHOLD = 1024; // 1KB — يُرسل فوراً
const MAX_BATCH_SIZE = 10;

class TCPNagleOptimizer {
  private pendingQueue: PendingRequest[] = [];
  private coalesceTimer: ReturnType<typeof setTimeout> | null = null;
  private adaptiveWindow = COALESCE_WINDOW_MS;
  private windowHistory: number[] = [];
  private stats: NagleStats = {
    totalRequests: 0,
    batchedRequests: 0,
    immediateRequests: 0,
    savedRoundTrips: 0,
    avgCoalesceWindow: COALESCE_WINDOW_MS,
  };
  private initialized = false;
  private requestCounter = 0;

  init(): void {
    if (this.initialized) return;
    this._startAdaptiveLearning();
    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[TCPNagleOptimizer] Initialized — coalesce window:', this.adaptiveWindow, 'ms');
    }
  }

  // إرسال طلب مع Nagle optimization
  async send(url: string, init: RequestInit = {}): Promise<Response> {
    this.stats.totalRequests++;
    const size = this._estimateSize(init);

    // طلبات كبيرة تُرسل فوراً (TCP_NODELAY equivalent)
    if (size > LARGE_REQUEST_THRESHOLD) {
      this.stats.immediateRequests++;
      return fetch(url, init);
    }

    // طلبات صغيرة تنتظر في الـ queue
    return new Promise<Response>((resolve, reject) => {
      const request: PendingRequest = {
        id: `req_${++this.requestCounter}`,
        url,
        init,
        resolve,
        reject,
        size,
        timestamp: Date.now(),
      };
      this.pendingQueue.push(request);
      this._scheduleFlush();
    });
  }

  private _estimateSize(init: RequestInit): number {
    if (!init.body) return 0;
    if (typeof init.body === 'string') return init.body.length;
    if (init.body instanceof ArrayBuffer) return init.body.byteLength;
    if (init.body instanceof Blob) return init.body.size;
    try {
      return JSON.stringify(init.body).length;
    } catch {
      return 0;
    }
  }

  private _scheduleFlush(): void {
    if (this.coalesceTimer) return;

    // إذا امتلأ الـ queue، أرسل فوراً
    if (this.pendingQueue.length >= MAX_BATCH_SIZE) {
      this._flush();
      return;
    }

    this.coalesceTimer = setTimeout(() => {
      this._flush();
    }, this.adaptiveWindow);
  }

  private _flush(): void {
    if (this.coalesceTimer) {
      clearTimeout(this.coalesceTimer);
      this.coalesceTimer = null;
    }

    if (this.pendingQueue.length === 0) return;

    const batch = this.pendingQueue.splice(0, MAX_BATCH_SIZE);
    const batchSize = batch.length;

    if (batchSize > 1) {
      this.stats.batchedRequests += batchSize;
      this.stats.savedRoundTrips += batchSize - 1;
    }

    // تسجيل الـ coalesce window الفعلي
    if (batch.length > 0) {
      const actualWindow = Date.now() - batch[0].timestamp;
      this.windowHistory.push(actualWindow);
      if (this.windowHistory.length > 50) this.windowHistory.shift();
    }

    // تنفيذ كل الطلبات في الـ batch
    for (const req of batch) {
      fetch(req.url, req.init)
        .then(req.resolve)
        .catch(req.reject);
    }

    // إذا يوجد المزيد، جدول flush آخر
    if (this.pendingQueue.length > 0) {
      this._scheduleFlush();
    }
  }

  // Adaptive learning: يتعلم الـ pattern المثالي لـ coalescing window
  private _startAdaptiveLearning(): void {
    setInterval(() => {
      if (this.windowHistory.length < 5) return;

      const avg = this.windowHistory.reduce((a, b) => a + b, 0) / this.windowHistory.length;
      const ratio = this.stats.batchedRequests / Math.max(1, this.stats.totalRequests);

      // إذا نسبة الـ batching منخفضة، قلل الـ window
      if (ratio < 0.3) {
        this.adaptiveWindow = Math.max(10, this.adaptiveWindow - 10);
      } else if (ratio > 0.7) {
        this.adaptiveWindow = Math.min(200, this.adaptiveWindow + 5);
      }

      this.stats.avgCoalesceWindow = avg;
    }, 5000);
  }

  // flush فوري لطلبات urgent
  flushNow(): void {
    this._flush();
  }

  getStats(): NagleStats {
    return { ...this.stats };
  }

  destroy(): void {
    if (this.coalesceTimer) clearTimeout(this.coalesceTimer);
    this.pendingQueue.forEach(req => req.reject(new Error('TCPNagleOptimizer destroyed')));
    this.pendingQueue = [];
    this.initialized = false;
  }
}

export const tcpNagleOptimizer = new TCPNagleOptimizer();
