// Speculative Execution — مستوحى من Speculative Execution في CPUs (Intel/AMD)
// وSpeculative Prefetching في Chrome
// يبدأ تنفيذ الـ API call قبل الضغط بـ 80ms

import { abortRegistry } from './abort-registry';
import { predictiveCache } from './predictive-cache';

interface SpeculativeTarget {
  element: Element;
  url: string;
  init?: RequestInit;
  confidence: number;
  prefetchStart?: number;
  controller?: AbortController;
  promise?: Promise<Response>;
  result?: Response;
}

interface HoverMetrics {
  hoverTime: number;
  velocity: number;     // cursor velocity
  touchPressure: number;
  scrollVelocity: number;
}

const CONFIDENCE_THRESHOLD = 0.85;   // 85% → يبدأ الطلب
const PREFETCH_LEAD_TIME_MS = 80;    // يبدأ 80ms قبل الضغط

class SpeculativeExecution {
  private targets: Map<string, SpeculativeTarget> = new Map();
  private hoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private initialized = false;
  private stats = {
    speculated: 0,
    hits: 0,        // طلب جاهز عند الضغط
    misses: 0,      // طلب لم يكتمل
    cancelled: 0,   // مستخدم لم يضغط
    avgSavedMs: 0,
  };

  init(): void {
    if (this.initialized) return;
    this._attachGlobalListeners();
    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[SpeculativeExecution] Active — lead time:', PREFETCH_LEAD_TIME_MS, 'ms');
    }
  }

  // تسجيل عنصر للـ speculative execution
  register(
    element: Element,
    url: string,
    init?: RequestInit,
    options: { confidence?: number } = {}
  ): () => void {
    const id = this._generateId(element);
    const target: SpeculativeTarget = {
      element,
      url,
      init,
      confidence: options.confidence ?? 0.5,
    };
    this.targets.set(id, target);

    const cleanup = this._attachElementListeners(id, element, target);
    return () => {
      cleanup();
      this._cancelSpeculation(id);
      this.targets.delete(id);
    };
  }

  private _attachElementListeners(id: string, element: Element, target: SpeculativeTarget): () => void {
    const onMouseEnter = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      this._onHoverStart(id, target, {
        hoverTime: 0,
        velocity: Math.sqrt(mouseEvent.movementX ** 2 + mouseEvent.movementY ** 2),
        touchPressure: 0,
        scrollVelocity: 0,
      });
    };

    const onMouseLeave = () => {
      this._cancelSpeculation(id);
    };

    const onMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const existing = this.hoverTimers.get(id);
      if (existing) {
        // ضغط منخفضة الـ velocity = نية أكيدة
        const velocity = Math.sqrt(mouseEvent.movementX ** 2 + mouseEvent.movementY ** 2);
        if (velocity < 2 && !this.targets.get(id)?.promise) {
          this._startSpeculation(id, target);
        }
      }
    };

    const onTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const pressure = touchEvent.touches[0]?.force ?? 0;
      this._onHoverStart(id, target, {
        hoverTime: 0,
        velocity: 0,
        touchPressure: pressure,
        scrollVelocity: 0,
      });
    };

    element.addEventListener('mouseenter', onMouseEnter);
    element.addEventListener('mouseleave', onMouseLeave);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      element.removeEventListener('mouseenter', onMouseEnter);
      element.removeEventListener('mouseleave', onMouseLeave);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('touchstart', onTouchStart);
    };
  }

  private _onHoverStart(id: string, target: SpeculativeTarget, metrics: HoverMetrics): void {
    const confidence = this._calcConfidence(metrics, target);

    if (confidence >= CONFIDENCE_THRESHOLD) {
      // بدء speculation فوراً
      this._startSpeculation(id, target);
    } else {
      // انتظر PREFETCH_LEAD_TIME_MS ثم ابدأ
      const timer = setTimeout(() => {
        this._startSpeculation(id, target);
      }, PREFETCH_LEAD_TIME_MS);
      this.hoverTimers.set(id, timer);
    }
  }

  private _calcConfidence(metrics: HoverMetrics, target: SpeculativeTarget): number {
    let confidence = target.confidence;

    // cursor بطيء على العنصر = نية أكيدة
    if (metrics.velocity < 1) confidence += 0.2;
    else if (metrics.velocity < 3) confidence += 0.1;

    // touch pressure عالي
    if (metrics.touchPressure > 0.5) confidence += 0.2;

    // تحقق من predictive cache
    const cached = predictiveCache.get(target.url);
    if (cached) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private _startSpeculation(id: string, target: SpeculativeTarget): void {
    if (target.promise) return; // بالفعل يعمل

    this.stats.speculated++;
    target.prefetchStart = performance.now();

    const controller = new AbortController();
    target.controller = controller;

    // تسجيل في abort registry
    abortRegistry.register(`speculative_${id}`, controller);

    target.promise = fetch(target.url, {
      ...target.init,
      signal: controller.signal,
    }).then(res => {
      target.result = res.clone();
      return res;
    }).catch(() => {
      return new Response(null, { status: 0 });
    });

    if (import.meta.env.DEV) {
      console.debug('[SpeculativeExecution] Prefetching:', target.url);
    }
  }

  private _cancelSpeculation(id: string): void {
    const timer = this.hoverTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimers.delete(id);
    }

    const target = this.targets.get(id);
    if (target?.controller && !target.result) {
      target.controller.abort();
      abortRegistry.unregister(`speculative_${id}`);
      this.stats.cancelled++;
      target.promise = undefined;
      target.controller = undefined;
    }
  }

  // استرداد نتيجة الـ speculation إذا كانت جاهزة
  async getSpeculativeResult(url: string): Promise<Response | null> {
    for (const [, target] of this.targets) {
      if (target.url === url && target.promise) {
        const savedMs = target.prefetchStart
          ? performance.now() - target.prefetchStart
          : 0;

        if (target.result) {
          this.stats.hits++;
          this.stats.avgSavedMs = (this.stats.avgSavedMs * (this.stats.hits - 1) + savedMs) / this.stats.hits;
          return target.result.clone();
        }

        // انتظر النتيجة إذا لم تكتمل بعد
        try {
          const res = await target.promise;
          this.stats.misses++;
          return res;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private _attachGlobalListeners(): void {
    // مراقبة scroll velocity
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    window.addEventListener('scroll', () => {
      scrollVelocity = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;

      // إلغاء speculations عند scroll سريع
      if (scrollVelocity > 50) {
        for (const [id] of this.targets) {
          this._cancelSpeculation(id);
        }
      }
    }, { passive: true });
  }

  private _generateId(element: Element): string {
    return element.getAttribute('data-speculative-id')
      ?? `spec_${Math.random().toString(36).slice(2)}`;
  }

  getStats() {
    return { ...this.stats };
  }

  destroy(): void {
    for (const [id] of this.targets) {
      this._cancelSpeculation(id);
    }
    this.targets.clear();
    this.hoverTimers.clear();
    this.initialized = false;
  }
}

export const speculativeExecution = new SpeculativeExecution();
