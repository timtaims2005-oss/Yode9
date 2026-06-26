/**
 * Animation Controller — centralized animation quality management.
 * Coordinates between ThermalGuard, FrameScheduler, and adaptive quality.
 * Provides a single source of truth for animation complexity:
 *   Level 5 = full quality (particles + 3D + WebGL)
 *   Level 3 = reduced (no particles, CSS only)
 *   Level 1 = minimal (no animations, accessibility mode)
 */

import { thermalGuard } from "./thermal-guard";
import { frameScheduler } from "./frame-scheduler";
import { memoryPressure } from "./memory-pressure";

export type AnimationLevel = 1 | 2 | 3 | 4 | 5;

interface AnimationConfig {
  level: AnimationLevel;
  particles: boolean;
  webgl: boolean;
  css3d: boolean;
  transitions: boolean;
  blur: boolean;
  gradients: boolean;
  particleCount: number;
  frameSkip: number; // render every N frames (1 = every frame)
}

const LEVEL_CONFIGS: Record<AnimationLevel, AnimationConfig> = {
  5: { level: 5, particles: true,  webgl: true,  css3d: true,  transitions: true,  blur: true,  gradients: true,  particleCount: 120, frameSkip: 1 },
  4: { level: 4, particles: true,  webgl: true,  css3d: true,  transitions: true,  blur: true,  gradients: true,  particleCount: 60,  frameSkip: 1 },
  3: { level: 3, particles: false, webgl: false, css3d: true,  transitions: true,  blur: false, gradients: true,  particleCount: 0,   frameSkip: 2 },
  2: { level: 2, particles: false, webgl: false, css3d: false, transitions: true,  blur: false, gradients: false, particleCount: 0,   frameSkip: 3 },
  1: { level: 1, particles: false, webgl: false, css3d: false, transitions: false, blur: false, gradients: false, particleCount: 0,   frameSkip: 1 },
};

type LevelCallback = (config: AnimationConfig) => void;

class AnimationController {
  private currentLevel: AnimationLevel = 5;
  private manualOverride: AnimationLevel | null = null;
  private listeners = new Set<LevelCallback>();
  private initialized = false;

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { this.setLevel(1, true); return; }
    mq.addEventListener("change", e => { if (e.matches) this.setLevel(1, true); });

    // React to thermal throttling
    thermalGuard.onMetrics(m => {
      if (this.manualOverride !== null) return;
      const map: Record<string, AnimationLevel> = { nominal: 5, fair: 4, serious: 3, critical: 2 };
      this.setLevel(map[m.state] as AnimationLevel ?? 5);
    });

    // React to memory pressure
    memoryPressure.onStats(s => {
      if (this.manualOverride !== null) return;
      if (s.pressure === "critical") this.setLevel(Math.min(this.currentLevel, 2) as AnimationLevel);
      else if (s.pressure === "moderate") this.setLevel(Math.min(this.currentLevel, 3) as AnimationLevel);
    });

    // React to FPS drops
    frameScheduler.onMetrics((fps) => {
      if (this.manualOverride !== null) return;
      if (fps < 25 && this.currentLevel > 2) this.setLevel((this.currentLevel - 1) as AnimationLevel);
      else if (fps > 50 && this.currentLevel < 5) this.setLevel((this.currentLevel + 1) as AnimationLevel);
    });

    // Apply CSS data attribute for CSS-side adaptations
    this.applyCSS();
  }

  setLevel(level: AnimationLevel, manual = false) {
    if (manual) this.manualOverride = level;
    if (this.currentLevel === level) return;
    this.currentLevel = level;
    this.applyCSS();
    const config = LEVEL_CONFIGS[level];
    this.listeners.forEach(cb => cb(config));
  }

  clearOverride() {
    this.manualOverride = null;
  }

  onLevel(cb: LevelCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get config() { return LEVEL_CONFIGS[this.currentLevel]; }
  get level() { return this.currentLevel; }
  get isReduced() { return this.currentLevel <= 2; }
  get particleCount() { return LEVEL_CONFIGS[this.currentLevel].particleCount; }

  private applyCSS() {
    document.documentElement.dataset.animLevel = String(this.currentLevel);
    document.documentElement.style.setProperty("--anim-dur", this.currentLevel >= 3 ? "0.3s" : this.currentLevel === 2 ? "0.15s" : "0s");
    document.documentElement.style.setProperty("--particle-count", String(LEVEL_CONFIGS[this.currentLevel].particleCount));
  }
}

export const animationController = new AnimationController();
