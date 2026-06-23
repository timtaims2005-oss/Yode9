import { lazy, Suspense } from "react";

// Lazy-load all ambient 3D layers to reduce initial bundle size
const AmbientParticleField = lazy(() => import("../AmbientParticleField").then(m => ({ default: m.AmbientParticleField })));
const HoloDataStream = lazy(() => import("../HoloDataStream").then(m => ({ default: m.HoloDataStream })));
const CyberHeatmapHUD = lazy(() => import("../CyberHeatmapHUD").then(m => ({ default: m.CyberHeatmapHUD })));

/**
 * AmbientLayer — always-on background visual effects, all lazy loaded
 * to prevent them from blocking the initial page load.
 * Paused when tab is hidden for performance.
 */
export function AmbientLayer() {
  return (
    <>
      {/* Heatmap overlay — ambient cyber HUD */}
      <Suspense fallback={null}>
        <CyberHeatmapHUD />
      </Suspense>

      {/* Particle field — desktop only */}
      <div className="hidden md:block">
        <Suspense fallback={null}>
          <AmbientParticleField density={0.12} />
        </Suspense>
      </div>

      {/* Holo data streams — desktop only */}
      <div className="hidden md:block">
        <Suspense fallback={null}>
          <HoloDataStream side="both" />
        </Suspense>
      </div>
    </>
  );
}
