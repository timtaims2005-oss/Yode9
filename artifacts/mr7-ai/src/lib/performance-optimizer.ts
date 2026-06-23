/**
 * Advanced Performance Monitoring and Optimization
 * Real-time metrics, lazy loading, and resource management
 */

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private thresholds: Map<string, number> = new Map();

  start(label: string): void {
    performance.mark(`${label}-start`);
  }

  end(label: string): number {
    performance.mark(`${label}-end`);
    const measure = performance.measure(label, `${label}-start`, `${label}-end`);
    const duration = measure.duration;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    return duration;
  }

  setThreshold(label: string, maxMs: number): void {
    this.thresholds.set(label, maxMs);
  }

  checkThresholds(): Array<{ label: string; avg: number; threshold: number; exceeded: boolean }> {
    const results: Array<{ label: string; avg: number; threshold: number; exceeded: boolean }> = [];
    
    for (const [label, threshold] of this.thresholds.entries()) {
      const measurements = this.metrics.get(label);
      if (measurements && measurements.length > 0) {
        const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        results.push({
          label,
          avg,
          threshold,
          exceeded: avg > threshold
        });
      }
    }
    
    return results;
  }

  getMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  clear(): void {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * Lazy Loader for components and modules
 */
export class LazyLoader {
  private loadedModules: Map<string, any> = new Map();
  private loadingModules: Map<string, Promise<any>> = new Map();

  async load<T>(moduleName: string, loader: () => Promise<T>): Promise<T> {
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName) as T;
    }

    if (this.loadingModules.has(moduleName)) {
      return this.loadingModules.get(moduleName) as Promise<T>;
    }

    const loadPromise = loader().then((module) => {
      this.loadedModules.set(moduleName, module);
      this.loadingModules.delete(moduleName);
      return module;
    });

    this.loadingModules.set(moduleName, loadPromise);
    return loadPromise;
  }

  isLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  preload(moduleName: string, loader: () => Promise<any>): void {
    if (!this.loadingModules.has(moduleName) && !this.loadedModules.has(moduleName)) {
      this.load(moduleName, loader).catch(() => {});
    }
  }
}

/**
 * Resource Pool for reusable objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize: number = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool = [];
  }
}

/**
 * Intersection Observer for lazy loading elements
 */
export class IntersectionObserverManager {
  private observer: IntersectionObserver | null = null;
  private callbacks: Map<Element, () => void> = new Map();

  constructor(options?: IntersectionObserverInit) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const callback = this.callbacks.get(entry.target);
          if (callback) {
            callback();
            this.callbacks.delete(entry.target);
            this.observer?.unobserve(entry.target);
          }
        }
      });
    }, options);
  }

  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer?.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.callbacks.clear();
  }
}

/**
 * Web Worker Pool for parallel processing
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    workerCode: string;
    data: any;
  }> = [];
  private maxWorkers: number;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = maxWorkers;
  }

  async execute<T>(workerCode: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ resolve, reject, workerCode, data });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.workers.length < this.maxWorkers) {
      const task = this.taskQueue.shift();
      if (!task) break;

      const blob = new Blob([task.workerCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);

      worker.onmessage = (e) => {
        task.resolve(e.data);
        this.removeWorker(worker);
        URL.revokeObjectURL(url);
      };

      worker.onerror = (e) => {
        task.reject(e);
        this.removeWorker(worker);
        URL.revokeObjectURL(url);
      };

      this.workers.push(worker);
      worker.postMessage(task.data);
    }
  }

  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
      worker.terminate();
    }
    this.processQueue();
  }

  terminateAll(): void {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.taskQueue = [];
  }
}

/**
 * Virtual Scroll Manager for large lists
 */
export class VirtualScrollManager {
  private container: HTMLElement;
  private itemHeight: number;
  private totalItems: number;
  private overscan: number;
  private renderItem: (index: number) => HTMLElement;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    totalItems: number,
    overscan: number,
    renderItem: (index: number) => HTMLElement
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.overscan = overscan;
    this.renderItem = renderItem;

    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    this.container.style.height = `${totalItems * itemHeight}px`;

    this.container.addEventListener('scroll', () => this.render());
    this.render();
  }

  private render(): void {
    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const endIndex = Math.min(
      this.totalItems,
      Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.overscan
    );

    // Remove existing items
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.renderItem(i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      item.style.left = '0';
      item.style.right = '0';
      item.style.height = `${this.itemHeight}px`;
      this.container.appendChild(item);
    }
  }

  scrollToIndex(index: number): void {
    this.container.scrollTop = index * this.itemHeight;
  }

  updateTotalItems(total: number): void {
    this.totalItems = total;
    this.container.style.height = `${total * this.itemHeight}px`;
    this.render();
  }
}

// Singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const lazyLoader = new LazyLoader();
