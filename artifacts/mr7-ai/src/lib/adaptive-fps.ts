/**
 * Adaptive FPS Controller — Single source of truth for all animation loops.
 *
 * Integrates:
 *  · Battery API  — drops FPS when battery is low and not charging
 *  · Thermal state — drops FPS when CPU/GPU is throttling
 *  · prefers-reduced-motion — caps at 10 FPS
 *  · DPR change   — detects monitor hot-swap (high-DPI ↔ standard)
 *
 * All RAF loops should call  adaptiveFPS.frameBudgetMs  each tick
 * instead of a hard-coded number so quality adapts at runtime.
 */

export type FPSTarget = 60 | 30 | 15 | 10;
export type ThermalState = "nominal" | "fair" | "serious" | "critical";

export interface AdaptiveState {
  targetFPS: FPSTarget;
  frameBudgetMs: number;
  dpr: number;
  batteryLevel: number | null;   // 0–100 or null if API unavailable
  batteryCharging: boolean | null;
  thermalState: ThermalState;
  reason: string;
}

type Listener = (state: AdaptiveState) => void;

type BatteryManager = {
  level: number;
  charging: boolean;
  addEventListener: (event: string, cb: () => void) => void;
};

class AdaptiveFPSController {
  private _state: AdaptiveState = {
    targetFPS:     30,
    frameBudgetMs: 33,
    dpr:           1,
    batteryLevel:  null,
    batteryCharging: null,
    thermalState:  "nominal",
    reason:        "init",
  };

  private listeners    = new Set<Listener>();
  private battery: BatteryManager | null = null;
  private initialized  = false;

  async init(): Promise<void> {
    if (typeof window === "undefined" || this.initialized) return;
    this.initialized = true;

    this._state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    // ── Battery API (Chrome 38+, Edge, Android WebView) ──────────────────
    try {
      const nav = navigator as { getBattery?: () => Promise<BatteryManager> };
      if (typeof nav.getBattery === "function") {
        this.battery = await nav.getBattery();
        this._onBattery();
        this.battery.addEventListener("levelchange",   () => this._onBattery());
        this.battery.addEventListener("chargingchange",() => this._onBattery());
      }
    } catch { /* Firefox / Safari — Battery API not available */ }

    // ── prefers-reduced-motion ────────────────────────────────────────────
    window.matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", () => this._recalculate());

    // ── DPR change (e.g. drag window between monitors) ────────────────────
    // re-query each time so we always get the current DPR
    const checkDpr = () => {
      const next = Math.min(window.devicePixelRatio || 1, 1.5);
      if (next !== this._state.dpr) {
        this._state.dpr = next;
        this._recalculate();
      }
      // re-register for the next change
      window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .addEventListener("change", checkDpr, { once: true });
    };
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", checkDpr, { once: true });

    this._recalculate();
  }

  // Called by thermal-guard when thermal state changes
  setThermalState(state: ThermalState) {
    if (this._state.thermalState === state) return;
    this._state.thermalState = state;
    this._recalculate();
  }

  private _onBattery() {
    if (!this.battery) return;
    this._state.batteryLevel   = Math.round(this.battery.level * 100);
    this._state.batteryCharging = this.battery.charging;
    this._recalculate();
  }

  private _recalculate() {
    const { batteryLevel, batteryCharging, thermalState } = this._state;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let fps: FPSTarget = 30;
    let reason = "default-30fps";

    if (reducedMotion) {
      fps    = 10;
      reason = "prefers-reduced-motion";
    } else if (thermalState === "critical") {
      fps    = 10;
      reason = "thermal:critical";
    } else if (batteryLevel !== null && batteryLevel <= 10 && !batteryCharging) {
      fps    = 10;
      reason = "battery:critical";
    } else if (thermalState === "serious") {
      fps    = 15;
      reason = "thermal:serious";
    } else if (batteryLevel !== null && batteryLevel <= 20 && !batteryCharging) {
      fps    = 15;
      reason = "battery:saver";
    } else if (thermalState === "fair") {
      fps    = 30;
      reason = "thermal:fair";
    } else if (batteryLevel !== null && batteryLevel <= 40 && !batteryCharging) {
      fps    = 30;
      reason = "battery:low";
    } else if (batteryCharging === true || batteryLevel === null || batteryLevel > 80) {
      fps    = 60;
      reason = batteryCharging ? "charging:full-quality" : "battery:good";
    }

    this._state.targetFPS     = fps;
    this._state.frameBudgetMs = 1000 / fps;
    this._state.reason        = reason;
    this._notify();
  }

  private _notify() {
    const snap = { ...this._state };
    this.listeners.forEach(cb => cb(snap));
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb({ ...this._state }); // immediate current state
    return () => this.listeners.delete(cb);
  }

  get state()          { return { ...this._state }; }
  get frameBudgetMs()  { return this._state.frameBudgetMs; }
  get targetFPS()      { return this._state.targetFPS; }
  get dpr()            { return this._state.dpr; }

  // Force low-power mode (user action)
  forceLowPower() {
    this._state.thermalState = "serious";
    this._recalculate();
  }

  // Release forced low-power mode
  releaseLowPower() {
    this._state.thermalState = "nominal";
    this._recalculate();
  }
}

export const adaptiveFPS = new AdaptiveFPSController();

if (typeof window !== "undefined") {
  adaptiveFPS.init().catch(() => {});
}
