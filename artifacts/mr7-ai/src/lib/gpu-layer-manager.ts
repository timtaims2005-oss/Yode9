/**
 * GPU Layer Manager — promotes/demotes DOM elements to GPU composited layers.
 * Uses CSS `will-change`, `transform: translateZ(0)`, `isolation: isolate`.
 * Monitors layer budget (GPU VRAM pressure) and demotes old layers on overflow.
 * Also applies CSS containment and content-visibility for offscreen elements.
 */

const MAX_PROMOTED_LAYERS = 24; // conservative GPU layer budget
const OFFSCREEN_THRESHOLD_PX = 300;

interface LayerRecord {
  el: WeakRef<HTMLElement>;
  key: string;
  promotedAt: number;
  hintType: "will-change" | "translate3d" | "both";
}

class GPULayerManager {
  private layers: LayerRecord[] = [];
  private observer: IntersectionObserver | null = null;
  private containmentObserver: ResizeObserver | null = null;
  private initialized = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // IntersectionObserver: apply content-visibility to offscreen elements
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.style.contentVisibility = "";
            el.style.containIntrinsicSize = "";
          } else {
            // Only apply to elements with data-gpu-contain
            if (el.dataset.gpuContain) {
              el.style.contentVisibility = "auto";
              el.style.containIntrinsicSize = `${el.offsetWidth}px ${el.offsetHeight}px`;
            }
          }
        }
      },
      { rootMargin: `${OFFSCREEN_THRESHOLD_PX}px` }
    );
  }

  /** Promote a specific element to a GPU composite layer */
  promote(el: HTMLElement, key: string, hintType: "will-change" | "translate3d" | "both" = "both") {
    if (!this.initialized) this.init();

    // Check if already promoted
    if (this.layers.some(l => l.key === key)) return;

    // Enforce layer budget — evict oldest if at limit
    if (this.layers.length >= MAX_PROMOTED_LAYERS) {
      const oldest = this.layers.shift();
      if (oldest) { const el = oldest.el.deref(); if (el) this.applyDemotion(el); }
    }

    this.applyPromotion(el, hintType);
    this.layers.push({ el: new WeakRef(el), key, promotedAt: Date.now(), hintType });
  }

  /** Remove GPU promotion from element */
  demote(key: string) {
    const idx = this.layers.findIndex(l => l.key === key);
    if (idx < 0) return;
    const [record] = this.layers.splice(idx, 1);
    const el = record.el.deref();
    if (el) this.applyDemotion(el);
  }

  /** Observe element for automatic content-visibility management */
  watchContain(el: HTMLElement) {
    if (!this.initialized) this.init();
    el.dataset.gpuContain = "1";
    this.observer?.observe(el);
  }

  /** Apply CSS containment to an element for layout perf */
  applyContainment(el: HTMLElement, type: "layout" | "paint" | "strict" | "content" = "content") {
    el.style.contain = type;
  }

  /** Batch-promote all elements matching selector */
  promoteAll(selector: string, hintType: "will-change" | "translate3d" | "both" = "both") {
    document.querySelectorAll<HTMLElement>(selector).forEach((el, i) => {
      this.promote(el, `${selector}-${i}`, hintType);
    });
  }

  get layerCount() { return this.layers.length; }
  get budget() { return MAX_PROMOTED_LAYERS; }

  private applyPromotion(el: HTMLElement, hintType: LayerRecord["hintType"]) {
    if (hintType === "will-change" || hintType === "both") {
      el.style.willChange = "transform, opacity";
    }
    if (hintType === "translate3d" || hintType === "both") {
      const cur = el.style.transform;
      if (!cur.includes("translateZ")) {
        el.style.transform = cur ? `${cur} translateZ(0)` : "translateZ(0)";
      }
    }
    el.style.backfaceVisibility = "hidden";
    el.style.perspective = "1000px";
  }

  private applyDemotion(el: HTMLElement) {
    el.style.willChange = "auto";
    el.style.transform = el.style.transform.replace(/\s*translateZ\(0\)/, "").trim();
    el.style.backfaceVisibility = "";
    el.style.perspective = "";
  }
}

export const gpuLayerManager = new GPULayerManager();
