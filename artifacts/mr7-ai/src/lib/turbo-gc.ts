// Turbo GC — مستوحى من V8 engine Garbage Collector + Generational GC
// المشكلة: الـ GC يوقف الـ UI بشكل مفاجئ (GC pause)
// الحل: التنبؤ بتوقيت الـ GC وتنظيف الـ objects يدوياً في اللحظة المناسبة

import { memoryPressure } from './memory-pressure';

interface PooledObject<T> {
  value: T;
  inUse: boolean;
  lastUsed: number;
}

interface GCStats {
  manualCleans: number;
  objectsPooled: number;
  objectsRecycled: number;
  gcPausesAvoided: number;
  avgIdleCleanMs: number;
  weakRefsRegistered: number;
}

type CleanupCallback = () => void;

class TurboGC {
  private cleanupQueue: CleanupCallback[] = [];
  private objectPools: Map<string, PooledObject<unknown>[]> = new Map();
  private weakRefs: Set<WeakRef<object>> = new Set();
  private finalizationRegistry: FinalizationRegistry<string> | null = null;
  private idleCallback: ReturnType<typeof requestIdleCallback> | null = null;
  private stats: GCStats = {
    manualCleans: 0,
    objectsPooled: 0,
    objectsRecycled: 0,
    gcPausesAvoided: 0,
    avgIdleCleanMs: 0,
    weakRefsRegistered: 0,
  };
  private initialized = false;
  private performanceEntries: PerformanceEntry[] = [];

  init(): void {
    if (this.initialized) return;

    // FinalizationRegistry — تُستدعى عندما يُحذف الـ object
    if (typeof FinalizationRegistry !== 'undefined') {
      this.finalizationRegistry = new FinalizationRegistry((poolKey: string) => {
        if (import.meta.env.DEV) {
          console.debug('[TurboGC] Object finalized from pool:', poolKey);
        }
      });
    }

    this._attachLifecycleHooks();
    this._scheduleIdleCleanup();
    this._measureGCImpact();

    // تكامل مع memory-pressure
    memoryPressure.onPressure(() => {
      this._forceCleanup();
    });

    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[TurboGC] Initialized — GC pause prevention active');
    }
  }

  // تسجيل cleanup callback ليُستدعى في اللحظة المناسبة
  registerCleanup(callback: CleanupCallback): void {
    this.cleanupQueue.push(callback);
  }

  // Object pooling — بدل إنشاء وحذف objects جديدة
  poolGet<T>(poolKey: string, factory: () => T): T {
    let pool = this.objectPools.get(poolKey) as PooledObject<T>[] | undefined;
    if (!pool) {
      pool = [];
      this.objectPools.set(poolKey, pool as PooledObject<unknown>[]);
    }

    // البحث عن object متاح في الـ pool
    const available = pool.find(obj => !obj.inUse);
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      this.stats.objectsRecycled++;
      return available.value;
    }

    // إنشاء object جديد
    const newObj: PooledObject<T> = {
      value: factory(),
      inUse: true,
      lastUsed: Date.now(),
    };
    pool.push(newObj as unknown as PooledObject<unknown>);
    this.stats.objectsPooled++;

    // تسجيل في FinalizationRegistry
    if (this.finalizationRegistry && typeof newObj.value === 'object' && newObj.value !== null) {
      this.finalizationRegistry.register(newObj.value as object, poolKey);
    }

    return newObj.value;
  }

  // إعادة الـ object للـ pool
  poolReturn<T>(poolKey: string, value: T): void {
    const pool = this.objectPools.get(poolKey) as PooledObject<T>[] | undefined;
    if (!pool) return;

    const obj = pool.find(o => o.value === value);
    if (obj) {
      obj.inUse = false;
      obj.lastUsed = Date.now();
    }
  }

  // WeakRef للـ components الثقيلة — تُحذف تلقائياً إذا لا يوجد reference
  trackWeak<T extends object>(obj: T): WeakRef<T> {
    const ref = new WeakRef(obj);
    this.weakRefs.add(ref as WeakRef<object>);
    this.stats.weakRefsRegistered++;
    return ref;
  }

  // تنظيف الـ WeakRefs الميتة
  private _cleanDeadWeakRefs(): void {
    for (const ref of this.weakRefs) {
      if (!ref.deref()) {
        this.weakRefs.delete(ref);
      }
    }
  }

  // تنظيف الـ pools من الـ objects الغير مستخدمة
  private _cleanStalePools(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 60_000; // 60 ثانية

    for (const [key, pool] of this.objectPools) {
      const cleaned = pool.filter(obj =>
        obj.inUse || (now - obj.lastUsed < STALE_THRESHOLD)
      );
      if (cleaned.length < pool.length) {
        this.objectPools.set(key, cleaned);
        this.stats.manualCleans += pool.length - cleaned.length;
      }
    }
  }

  private _forceCleanup(): void {
    const start = performance.now();

    // تشغيل كل cleanup callbacks
    const callbacks = this.cleanupQueue.splice(0);
    for (const cb of callbacks) {
      try { cb(); } catch { /* ignore */ }
    }

    this._cleanDeadWeakRefs();
    this._cleanStalePools();
    this.stats.gcPausesAvoided++;

    const elapsed = performance.now() - start;
    this.stats.avgIdleCleanMs = (this.stats.avgIdleCleanMs * (this.stats.gcPausesAvoided - 1) + elapsed) / this.stats.gcPausesAvoided;
  }

  private _scheduleIdleCleanup(): void {
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        this.idleCallback = requestIdleCallback((deadline) => {
          if (deadline.timeRemaining() > 5) {
            this._forceCleanup();
          }
          schedule();
        }, { timeout: 5000 });
      } else {
        setTimeout(() => {
          this._forceCleanup();
          schedule();
        }, 5000);
      }
    };
    schedule();
  }

  private _attachLifecycleHooks(): void {
    // تنظيف بعد إغلاق modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.cleanupQueue.length > 0) {
        setTimeout(() => this._forceCleanup(), 100);
      }
    });

    // تنظيف عند visibilitychange (المستخدم غادر الـ tab)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._forceCleanup();
      }
    });
  }

  private _measureGCImpact(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // GC pause طويل مُكتشف
            performance.measure('TurboGC:pause-detected', {
              start: entry.startTime,
              duration: entry.duration,
            });
          }
          this.performanceEntries.push(entry);
          if (this.performanceEntries.length > 100) this.performanceEntries.shift();
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    } catch { /* not supported */ }
  }

  getStats(): GCStats & { poolSizes: Record<string, number> } {
    const poolSizes: Record<string, number> = {};
    for (const [key, pool] of this.objectPools) {
      poolSizes[key] = pool.length;
    }
    return { ...this.stats, poolSizes };
  }

  destroy(): void {
    if (this.idleCallback && 'cancelIdleCallback' in window) {
      cancelIdleCallback(this.idleCallback);
    }
    this.objectPools.clear();
    this.cleanupQueue = [];
    this.weakRefs.clear();
    this.initialized = false;
  }
}

export const turboGC = new TurboGC();
