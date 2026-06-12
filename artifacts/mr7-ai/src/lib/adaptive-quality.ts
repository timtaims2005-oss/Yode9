export type QualityLevel = "high" | "medium" | "low";

function detect(): QualityLevel {
  if (typeof window === "undefined") return "high";
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

  const score = (mem >= 8 ? 3 : mem >= 4 ? 2 : 1)
    + (cores >= 8 ? 3 : cores >= 4 ? 2 : 1)
    + (dpr <= 1 ? 2 : dpr <= 2 ? 1 : 0)
    + (isMobile ? -2 : 0);

  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

let _cached: QualityLevel | null = null;

export function getQualityLevel(): QualityLevel {
  if (!_cached) _cached = detect();
  return _cached;
}

export function getCanvasConfig() {
  const q = getQualityLevel();
  return {
    nodeCount:     q === "high" ? 22 : q === "medium" ? 14 : 8,
    particleCount: q === "high" ? 40 : q === "medium" ? 22 : 10,
    gridCols:      q === "high" ? 24 : q === "medium" ? 16 : 10,
    gridRows:      q === "high" ? 20 : q === "medium" ? 14 : 8,
    glitchEnabled: q === "high",
    beamEnabled:   q !== "low",
    dpr:           q === "high" ? (window.devicePixelRatio || 1) : 1,
    targetFps:     q === "high" ? 60 : q === "medium" ? 45 : 30,
    frameBudgetMs: q === "high" ? 16.7 : q === "medium" ? 22 : 33,
  };
}

export function getStreamFlushMs(): number {
  const q = getQualityLevel();
  return q === "high" ? 32 : q === "medium" ? 48 : 64;
}
