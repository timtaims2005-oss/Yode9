/**
 * Thermal Guard — detects CPU/GPU thermal throttling and adapts app behavior.
 * Uses Device Thermal API (Chrome 123+) + heuristic FPS/timing degradation detection.
 * Reduces animation complexity, particle count, and render quality when throttling detected.
 */

export type ThermalState = "nominal" | "fair" | "serious" | "critical";

interface ThermalMetrics {
  state: ThermalState;
  fps: number;
  frameVarianceMs: number;
  throttlingDetected: boolean;
  adaptationsActive: string[];
}

type ThermalCallback = (metrics: ThermalMetrics) => void;

const FPS_SAMPLE_SIZE = 30;
const THROTTLE_FPS_THRESHOLD = 45; // below 45fps = possible throttle
const THROTTLE_VARIANCE_THRESHOLD = 8; // >8ms frame variance = jitter

class ThermalGuard {
  private listeners = new Set<ThermalCallback>();
  private frameTimes: number[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private thermalState: ThermalState = "nominal";
  private adaptations = new Set<string>();
  private thermalManager: unknown = null;

  async start() {
    // Try native Thermal API
    try {
      const thermal = (navigator as unknown as { thermal?: { addEventListener: (e: string, cb: () => void) => void; thermalState?: string } }).thermal;
      if (thermal) {
        this.thermalManager = thermal;
        thermal.addEventListener("change", () => this.onNativeThermal());
        this.onNativeThermal();
      }
    } catch {
      // Not available — use heuristic
    }

    // Always run FPS heuristic
    this.startFrameMonitor();
  }

  stop() {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  onMetrics(cb: ThermalCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get currentState() { return this.thermalState; }
  get isThrottling() { return this.thermalState === "serious" || this.thermalState === "critical"; }
  get activeAdaptations() { return [...this.adaptations]; }

  addAdaptation(name: string) { this.adaptations.add(name); }
  removeAdaptation(name: string) { this.adaptations.delete(name); }

  private onNativeThermal() {
    const thermal = this.thermalManager as { thermalState?: string } | null;
    if (!thermal) return;
    const raw = thermal.thermalState ?? "nominal";
    const map: Record<string, ThermalState> = { nominal: "nominal", fair: "fair", serious: "serious", critical: "critical" };
    this.thermalState = map[raw] ?? "nominal";
    this.emit(60, 0);
  }

  private startFrameMonitor() {
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      if (this.lastTime === 0) { this.lastTime = now; return; }

      const delta = now - this.lastTime;
      this.lastTime = now;
      this.frameTimes.push(delta);
      if (this.frameTimes.length > FPS_SAMPLE_SIZE) this.frameTimes.shift();

      if (this.frameTimes.length === FPS_SAMPLE_SIZE) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLE_SIZE;
        const fps = Math.round(1000 / avg);
        const variance = Math.sqrt(
          this.frameTimes.reduce((s, t) => s + (t - avg) ** 2, 0) / FPS_SAMPLE_SIZE
        );

        // Update heuristic thermal state if no native API
        if (!this.thermalManager) {
          if (fps < THROTTLE_FPS_THRESHOLD && variance > THROTTLE_VARIANCE_THRESHOLD) {
            this.thermalState = "serious";
          } else if (fps < THROTTLE_FPS_THRESHOLD || variance > THROTTLE_VARIANCE_THRESHOLD) {
            this.thermalState = "fair";
          } else {
            this.thermalState = "nominal";
          }
        }

        this.emit(fps, variance);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private emit(fps: number, variance: number) {
    const metrics: ThermalMetrics = {
      state: this.thermalState,
      fps,
      frameVarianceMs: Math.round(variance * 10) / 10,
      throttlingDetected: this.isThrottling,
      adaptationsActive: [...this.adaptations],
    };
    this.listeners.forEach(cb => cb(metrics));
  }
}

export const thermalGuard = new ThermalGuard();
