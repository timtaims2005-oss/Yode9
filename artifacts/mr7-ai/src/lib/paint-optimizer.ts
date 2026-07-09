/**
 * Paint Optimizer — reduces paint area and frequency.
 * • CSS containment auto-applied to isolated panels
 * • content-visibility:auto for long lists (save rendering cost)
 * • Coalesces style mutations to avoid repeated paints
 * • Detects and warns on paint storms (>5 paint events in 100ms)
 * • Image lazy-loading observer
 */

const PAINT_STORM_THRESHOLD = 5;
const PAINT_STORM_WINDOW_MS = 100;

class PaintOptimizer {
  private styleQueue = new Map<HTMLElement, Partial<CSSStyleDeclaration>>();
  private rafId: number | null = null;
  private paintCount = 0;
  private paintStormTimer: ReturnType<typeof setTimeout> | null = null;
  private observer: PerformanceObserver | null = null;
  private imageObserver: IntersectionObserver | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // Paint performance observer (Chrome)
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.paintCount += entries.length;
        if (this.paintStormTimer) clearTimeout(this.paintStormTimer);
        this.paintStormTimer = setTimeout(() => {
          if (this.paintCount > PAINT_STORM_THRESHOLD) {
            console.warn(`[PaintOptimizer] Paint storm: ${this.paintCount} paints in ${PAINT_STORM_WINDOW_MS}ms`);
          }
          this.paintCount = 0;
        }, PAINT_STORM_WINDOW_MS);
      });
      this.observer.observe({ type: "paint", buffered: false });
    } catch {
      // PerformanceObserver not available
    }

    // Lazy image loader
    this.imageObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.lazySrc;
            if (src) { img.src = src; delete img.dataset.lazySrc; }
            this.imageObserver?.unobserve(img);
          }
        }
      },
      { rootMargin: "200px" }
    );
  }

  /** Coalesce multiple style mutations into one RAF-batched paint */
  setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
    const existing = this.styleQueue.get(el) ?? {};
    this.styleQueue.set(el, { ...existing, ...styles });
    this.scheduleFlush();
  }

  /** Apply CSS containment to element */
  contain(el: HTMLElement, type: "layout" | "paint" | "strict" | "content" | "size" = "content") {
    el.style.contain = type;
  }

  /** Mark element for content-visibility:auto (skip rendering when off-screen) */
  contentAuto(el: HTMLElement, intrinsicHeight = 200) {
    el.style.contentVisibility = "auto";
    el.style.containIntrinsicSize = `0 ${intrinsicHeight}px`;
  }

  /** Register image for lazy loading */
  lazyLoad(img: HTMLImageElement, src: string) {
    if (!this.initialized) this.init();
    img.dataset.lazySrc = src;
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    this.imageObserver?.observe(img);
  }

  /** Apply contain:paint to all chat message elements */
  optimizeChatList(container: HTMLElement) {
    const msgs = container.querySelectorAll<HTMLElement>("[data-msg]");
    msgs.forEach(el => {
      el.style.contain = "layout paint";
    });
  }

  private scheduleFlush() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  private flush() {
    for (const [el, styles] of this.styleQueue) {
      Object.assign(el.style, styles);
    }
    this.styleQueue.clear();
  }

  destroy() {
    this.observer?.disconnect();
    this.imageObserver?.disconnect();
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.paintStormTimer) clearTimeout(this.paintStormTimer);
  }
}

export const paintOptimizer = new PaintOptimizer();
