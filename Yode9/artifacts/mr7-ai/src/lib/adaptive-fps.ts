/**
 * Adaptive FPS Controller v2 — Single source of truth for all animation loops.
 *
 * FPS ladder (high → low):
 *   144 → 120 → 60 → 30 → 15 → 10
 *
 * Decision engine:
 *  · Reads native screen Hz (from initDisplayCapabilities)
 *  · Battery API    — drops FPS on low battery
 *  · Thermal state  — drops FPS on CPU/GPU throttle
 *  · prefers-reduced-motion → cap 10 FPS
 *  · Manual override via forceMaxHz() / forceLowPower()
 *  · DPR change detection (monitor hot-swap)
 */

import { getDetectedRefreshRate } from "./adaptive-quality";

export type FPSTarget = 144 | 120 | 60 | 30 | 15 | 10;
export type ThermalState = "nominal" | "fair" | "serious" | "critical";

export interface AdaptiveState {
  targetFPS:      FPSTarget;
  frameBudgetMs:  number;
  nativeHz:       number;  // screen's real refresh rate
  dpr:            number;
  batteryLevel:   number | null;
  batteryCharging: boolean | null;
  thermalState:   ThermalState;
  reason:         string;
  manualOverride: boolean;
}

type Listener = (state: AdaptiveState) => void;

type BatteryManager = {
  level: number;
  charging: boolean;
  addEventListener: (event: string, cb: () => void) => void;
};

// Ordered ladder from best to worst
const FPS_LADDER: FPSTarget[] = [144, 120, 60, 30, 15, 10];

function clampToLadder(target: number): FPSTarget {
  // pick the highest ladder value ≤ target
  for (const f of FPS_LADDER) {
    if (f <= target) return f;
  }
  return 10;
}

class AdaptiveFPSController {
  private _state: AdaptiveState = {
    targetFPS:      30,
    frameBudgetMs:  33,
    nativeHz:       60,
    dpr:            1,
    batteryLevel:   null,
    batteryCharging: null,
    thermalState:   "nominal",
    reason:         "init",
    manualOverride: false,
  };

  private listeners   = new Set<Listener>();
  private battery: BatteryManager | null = null;
  private initialized = false;
  private _manualFPS: FPSTarget | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined" || this.initialized) return;
    this.initialized = true;

    this._state.dpr      = Math.min(window.devicePixelRatio || 1, 1.5);
    this._state.nativeHz = getDetectedRefreshRate();

    // ── Battery API ───────────────────────────────────────────────────────
    try {
      const nav = navigator as { getBattery?: () => Promise<BatteryManager> };
      if (typeof nav.getBattery === "function") {
        this.battery = await nav.getBattery();
        this._onBattery();
        this.battery.addEventListener("levelchange",    () => this._onBattery());
        this.battery.addEventListener("chargingchange", () => this._onBattery());
      }
    } catch { /* Firefox/Safari — no Battery API */ }

    // ── prefers-reduced-motion ─────────────────────────────────────────────
    window.matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", () => this._recalculate());

    // ── DPR change (monitor swap) ──────────────────────────────────────────
    const checkDpr = () => {
      const next = Math.min(window.devicePixelRatio || 1, 1.5);
      if (next !== this._state.dpr) {
        this._state.dpr = next;
        this._recalculate();
      }
      window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
        .addEventListener("change", checkDpr, { once: true });
    };
    window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", checkDpr, { once: true });

    // Re-read Hz after capabilities are fully detected (they may update post-init)
    setTimeout(() => {
      this._state.nativeHz = getDetectedRefreshRate();
      this._recalculate();
    }, 500);

    this._recalculate();
  }

  /** Called by thermal-guard when thermal state changes */
  setThermalState(state: ThermalState) {
    if (this._state.thermalState === state) return;
    this._state.thermalState = state;
    if (!this._manualFPS) this._recalculate();
  }

  private _onBattery() {
    if (!this.battery) return;
    this._state.batteryLevel    = Math.round(this.battery.level * 100);
    this._state.batteryCharging = this.battery.charging;
    if (!this._manualFPS) this._recalculate();
  }

  private _recalculate() {
    if (this._manualFPS !== null) {
      this._setState(this._manualFPS, "manual-override", true);
      return;
    }

    const { batteryLevel, batteryCharging, thermalState, nativeHz } = this._state;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Maximum possible FPS on this screen
    const maxHz = Math.min(nativeHz, 144); // our ceiling is 144

    let fps: FPSTarget;
    let reason: string;

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
      // Full power — use native Hz up to 144
      fps    = clampToLadder(maxHz);
      reason = batteryCharging
        ? `charging:${maxHz}hz`
        : `battery:good:${maxHz}hz`;
    } else {
      fps    = 60;
      reason = "default-60fps";
    }

    this._setState(fps, reason, false);
  }

  private _setState(fps: FPSTarget, reason: string, manual: boolean) {
    this._state.targetFPS     = fps;
    this._state.frameBudgetMs = 1000 / fps;
    this._state.reason        = reason;
    this._state.manualOverride = manual;
    this._notify();
  }

  private _notify() {
    const snap = { ...this._state };
    this.listeners.forEach(cb => cb(snap));
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb({ ...this._state });
    return () => this.listeners.delete(cb);
  }

  // ── Manual controls ────────────────────────────────────────────────────

  /** Force a specific FPS regardless of conditions */
  forceTargetFPS(fps: FPSTarget) {
    this._manualFPS = fps;
    this._setState(fps, `forced:${fps}fps`, true);
  }

  /** Use the native screen Hz as max (up to 144) */
  forceMaxHz() {
    this._manualFPS = null;
    const hz = clampToLadder(Math.min(this._state.nativeHz, 144));
    this._manualFPS = hz;
    this._setState(hz, `forced:native-${hz}hz`, true);
  }

  /** Reduce to battery-saver mode */
  forceLowPower() {
    this._manualFPS = null;
    this._state.thermalState = "serious";
    this._recalculate();
  }

  /** Release all manual overrides — let the system decide */
  releaseOverride() {
    this._manualFPS = null;
    this._state.thermalState = "nominal";
    this._recalculate();
  }

  /** @deprecated Use releaseOverride() */
  releaseLowPower() { this.releaseOverride(); }

  // ── Getters ────────────────────────────────────────────────────────────
  get state()         { return { ...this._state }; }
  get frameBudgetMs() { return this._state.frameBudgetMs; }
  get targetFPS()     { return this._state.targetFPS; }
  get dpr()           { return this._state.dpr; }
  get nativeHz()      { return this._state.nativeHz; }
}

export const adaptiveFPS = new AdaptiveFPSController();

if (typeof window !== "undefined") {
  adaptiveFPS.init().catch(() => {});
}
