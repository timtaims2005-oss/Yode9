/**
 * Ultra Render Config — إعدادات الرندر العالمية
 * يتحكم في جودة الرسومات ومعدل الإطارات تلقائياً
 */
import { getQualityLevel, initDisplayCapabilities } from "./adaptive-quality";

export interface RenderConfig {
  dpr:              [number, number];
  antialias:        boolean;
  shadows:          boolean;
  particleCount:    number;
  rainCount:        number;
  smokeCount:       number;
  starCount:        number;
  fogDensity:       number;
  bloomStrength:    number;
  hud:              boolean;
  weather:          boolean;
  physics:          boolean;
  cinematic:        boolean;
  targetFPS:        number;
  logDepthBuffer:   boolean;
}

let _config: RenderConfig | null = null;

export async function buildRenderConfig(): Promise<RenderConfig> {
  await initDisplayCapabilities();
  const q      = getQualityLevel();
  const isHigh = q === "high";
  const isMed  = q !== "low";
  const dpr    = Math.min(window.devicePixelRatio ?? 1, isHigh ? 2 : 1.5);

  _config = {
    dpr:            [1, dpr],
    antialias:      isHigh,
    shadows:        isHigh,
    particleCount:  isHigh ? 800 : isMed ? 400 : 150,
    rainCount:      isHigh ? 6000 : isMed ? 2500 : 0,
    smokeCount:     isHigh ? 400  : isMed ? 150  : 0,
    starCount:      isHigh ? 3000 : isMed ? 1500 : 500,
    fogDensity:     isHigh ? 0.5  : isMed ? 0.25 : 0,
    bloomStrength:  isHigh ? 0.9  : isMed ? 0.5  : 0.2,
    hud:            isHigh,
    weather:        isMed,
    physics:        isMed,
    cinematic:      isMed,
    targetFPS:      isHigh ? 120 : isMed ? 60 : 30,
    logDepthBuffer: isHigh,
  };
  return _config;
}

export function getRenderConfig(): RenderConfig {
  if (_config) return _config;
  // Fallback synchronous config
  const q = getQualityLevel();
  const isHigh = q === "high";
  const isMed  = q !== "low";
  return {
    dpr:           [1, isHigh ? 2 : 1.5],
    antialias:     isHigh,
    shadows:       isHigh,
    particleCount: isHigh ? 800 : isMed ? 400 : 150,
    rainCount:     isHigh ? 6000 : isMed ? 2500 : 0,
    smokeCount:    isHigh ? 400  : isMed ? 150  : 0,
    starCount:     isHigh ? 3000 : isMed ? 1500 : 500,
    fogDensity:    isHigh ? 0.5  : 0.25,
    bloomStrength: isHigh ? 0.9  : 0.5,
    hud:           isHigh,
    weather:       isMed,
    physics:       isMed,
    cinematic:     isMed,
    targetFPS:     isHigh ? 120 : 60,
    logDepthBuffer:isHigh,
  };
}

/** تحسين تلقائي لمعدل الإطارات بناءً على الأداء الفعلي */
export class AdaptivePerformanceController {
  private fpsHistory: number[] = [];
  private lastTime   = 0;
  private frameCount = 0;

  tick(now: number) {
    this.frameCount++;
    if (now - this.lastTime >= 1000) {
      const fps = this.frameCount;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 5) this.fpsHistory.shift();
      this.frameCount = 0;
      this.lastTime   = now;
    }
  }

  getAverageFPS(): number {
    if (!this.fpsHistory.length) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  shouldReduceQuality(): boolean {
    return this.getAverageFPS() < 30 && this.fpsHistory.length >= 3;
  }

  shouldIncreaseQuality(): boolean {
    return this.getAverageFPS() > 90 && this.fpsHistory.length >= 3;
  }
}

export const perfController = new AdaptivePerformanceController();
