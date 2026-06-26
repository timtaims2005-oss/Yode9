// Neural Prefetch — مستوحى من Google's ML-based prefetching في Chrome
// نموذج ML خفيف يعمل في browser ويتعلم patterns المستخدم
// Markov chain + IndexedDB persistence + Privacy-first

import { speculativeExecution } from './speculative-execution';

interface NavigationEvent {
  from: string;
  to: string;
  timestamp: number;
  dwellTime: number;    // وقت البقاء في الصفحة السابقة
}

interface MarkovState {
  transitions: Record<string, number>;   // to -> count
  total: number;
}

interface PrefetchPrediction {
  url: string;
  confidence: number;
  reason: string;
}

interface MLModel {
  markov: Record<string, MarkovState>;
  actionPatterns: Record<string, string[]>;  // action -> next actions
  sessionCount: number;
  version: number;
}

const CONFIDENCE_THRESHOLD_PREFETCH = 0.80;
const CONFIDENCE_THRESHOLD_EXECUTE = 0.95;
const IDB_DB_NAME = 'neural-prefetch-v1';
const IDB_STORE = 'model';
const MODEL_KEY = 'main-model';

class NeuralPrefetch {
  private model: MLModel = {
    markov: {},
    actionPatterns: {},
    sessionCount: 0,
    version: 1,
  };
  private currentPage = window.location.pathname;
  private pageEntryTime = Date.now();
  private navigationHistory: NavigationEvent[] = [];
  private prefetchedUrls: Set<string> = new Set();
  private initialized = false;
  private idb: IDBDatabase | null = null;
  private stats = {
    predictions: 0,
    prefetches: 0,
    hits: 0,
    modelUpdates: 0,
  };

  async init(): Promise<void> {
    if (this.initialized) return;

    await this._loadModelFromIDB();
    this._observeNavigation();
    this._observeActions();
    this.model.sessionCount++;

    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[NeuralPrefetch] Initialized — model sessions:', this.model.sessionCount);
    }

    // أول تنبؤ بعد التهيئة
    setTimeout(() => this._predict(), 500);
  }

  // تسجيل action → يُحدّث نموذج الـ patterns
  recordAction(actionId: string, nextActionId: string): void {
    if (!this.model.actionPatterns[actionId]) {
      this.model.actionPatterns[actionId] = [];
    }
    this.model.actionPatterns[actionId].push(nextActionId);

    // حفظ دوري في IDB
    this._saveModelToIDB();
    this.stats.modelUpdates++;
  }

  // تنبؤ بالصفحات/الـ resources التالية
  private _predict(): PrefetchPrediction[] {
    const current = this.currentPage;
    const markovState = this.model.markov[current];

    if (!markovState || markovState.total < 3) return [];

    const predictions: PrefetchPrediction[] = [];

    for (const [to, count] of Object.entries(markovState.transitions)) {
      const confidence = count / markovState.total;

      predictions.push({
        url: to,
        confidence,
        reason: `Markov: ${(confidence * 100).toFixed(0)}% of ${markovState.total} sessions`,
      });
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    this.stats.predictions += predictions.length;

    // تنفيذ الـ prefetch
    for (const pred of predictions.slice(0, 3)) {
      if (pred.confidence >= CONFIDENCE_THRESHOLD_PREFETCH) {
        this._prefetch(pred.url, pred.confidence);
      }
    }

    return predictions;
  }

  private _prefetch(url: string, confidence: number): void {
    if (this.prefetchedUrls.has(url)) return;
    this.prefetchedUrls.add(url);
    this.stats.prefetches++;

    if (confidence >= CONFIDENCE_THRESHOLD_EXECUTE) {
      // ثقة عالية: بدء الـ API call فوراً
      if (import.meta.env.DEV) {
        console.debug('[NeuralPrefetch] High-confidence prefetch:', url, `${(confidence * 100).toFixed(0)}%`);
      }
      // تكامل مع speculativeExecution
      const anchor = document.querySelector(`[href="${url}"], [data-prefetch="${url}"]`);
      if (anchor) {
        speculativeExecution.register(anchor, url, undefined, { confidence });
      }
    } else {
      // ثقة متوسطة: prefetch الـ resource فقط
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  }

  private _observeNavigation(): void {
    const recordNav = () => {
      const newPage = window.location.pathname;
      if (newPage === this.currentPage) return;

      const event: NavigationEvent = {
        from: this.currentPage,
        to: newPage,
        timestamp: Date.now(),
        dwellTime: Date.now() - this.pageEntryTime,
      };

      this.navigationHistory.push(event);
      if (this.navigationHistory.length > 100) this.navigationHistory.shift();

      // تحديث Markov chain
      this._updateMarkov(event.from, event.to);

      this.currentPage = newPage;
      this.pageEntryTime = Date.now();
      this.prefetchedUrls.clear();

      // تنبؤ جديد بعد التنقل
      setTimeout(() => this._predict(), 200);
    };

    // SPA navigation
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args) => {
      originalPushState(...args);
      recordNav();
    };

    history.replaceState = (...args) => {
      originalReplaceState(...args);
      recordNav();
    };

    window.addEventListener('popstate', recordNav);
  }

  private _observeActions(): void {
    // مراقبة النقرات لتعلم patterns
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionId = target.getAttribute('data-action-id')
        ?? target.closest('[data-action-id]')?.getAttribute('data-action-id');

      if (actionId) {
        setTimeout(() => {
          const nextAction = document.querySelector('[data-action-id]:hover')
            ?.getAttribute('data-action-id');
          if (nextAction) this.recordAction(actionId, nextAction);
        }, 100);
      }
    }, { passive: true });
  }

  private _updateMarkov(from: string, to: string): void {
    if (!this.model.markov[from]) {
      this.model.markov[from] = { transitions: {}, total: 0 };
    }

    const state = this.model.markov[from];
    state.transitions[to] = (state.transitions[to] ?? 0) + 1;
    state.total++;

    this._saveModelToIDB();
  }

  // حفظ النموذج في IndexedDB — البيانات تبقى محلياً 100%
  private async _saveModelToIDB(): Promise<void> {
    if (!this.idb) await this._openIDB();
    if (!this.idb) return;

    try {
      const tx = this.idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ key: MODEL_KEY, model: this.model });
    } catch { /* ignore */ }
  }

  private async _loadModelFromIDB(): Promise<void> {
    await this._openIDB();
    if (!this.idb) return;

    return new Promise((resolve) => {
      try {
        const tx = this.idb!.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(MODEL_KEY);

        req.onsuccess = () => {
          if (req.result?.model) {
            this.model = req.result.model;
          }
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private _openIDB(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_DB_NAME, 1);

        req.onupgradeneeded = () => {
          req.result.createObjectStore(IDB_STORE, { keyPath: 'key' });
        };

        req.onsuccess = () => {
          this.idb = req.result;
          resolve();
        };

        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // مشاركة predictions مع speculativeExecution
  getPredictions(): PrefetchPrediction[] {
    return this._predict();
  }

  // إعادة تدريب النموذج من بيانات session الحالي
  retrain(): void {
    for (const event of this.navigationHistory) {
      this._updateMarkov(event.from, event.to);
    }
  }

  // حذف البيانات — Privacy control
  async clearModel(): Promise<void> {
    this.model = { markov: {}, actionPatterns: {}, sessionCount: 0, version: 1 };
    this.navigationHistory = [];
    await this._saveModelToIDB();
  }

  getStats() {
    return {
      ...this.stats,
      modelNodes: Object.keys(this.model.markov).length,
      sessionCount: this.model.sessionCount,
      prefetchedUrls: this.prefetchedUrls.size,
    };
  }
}

export const neuralPrefetch = new NeuralPrefetch();
