import { lazy, Suspense } from "react";
import { getQualityLevel } from "../../lib/adaptive-quality";

const AmbientParticleField = lazy(() => import("../AmbientParticleField").then(m => ({ default: m.AmbientParticleField })));
const HoloDataStream       = lazy(() => import("../HoloDataStream").then(m => ({ default: m.HoloDataStream })));
const CyberHeatmapHUD      = lazy(() => import("../CyberHeatmapHUD").then(m => ({ default: m.CyberHeatmapHUD })));
const UltraScene              = lazy(() => import("../3d/UltraScene").then(m => ({ default: m.UltraScene })));
const CSSPostFX               = lazy(() => import("../3d/PostProcessing").then(m => ({ default: m.CSSPostFX })));
const CanvasPostFX            = lazy(() => import("../3d/PostProcessing").then(m => ({ default: m.CanvasPostFX })));
const FilmGrainOverlay        = lazy(() => import("../3d/CinematicEffects").then(m => ({ default: m.FilmGrainOverlay })));
const ChromaticAberrationBorder = lazy(() => import("../3d/CinematicEffects").then(m => ({ default: m.ChromaticAberrationBorder })));
const AmbientAudioController  = lazy(() => import("../AmbientAudioController").then(m => ({ default: m.AmbientAudioController })));

/**
 * AmbientLayer — always-on background visual effects
 * Ultra HD: Ray Marching + PBR + Bloom + Rain + Smoke + Post-FX
 */
export function AmbientLayer() {
  const quality = getQualityLevel();
  const isLow   = quality === "low";

  return (
    <>
      {/* ── Ultra 3D Scene (Ray Marching + PBR + Rain + Smoke) ── */}
      <Suspense fallback={null}>
        <UltraScene showStats={false} />
      </Suspense>

      {/* ── Post-Processing CSS Layer ── */}
      <Suspense fallback={null}>
        <CSSPostFX
          enabled
          bloom
          scanlines={!isLow}
          vignette
          chromaticAberration={quality === "high"}
          glitch={false}
        />
      </Suspense>

      {/* ── Canvas Post-FX (corner brackets, scan beam, noise grain) ── */}
      {!isLow && (
        <Suspense fallback={null}>
          <CanvasPostFX enabled />
        </Suspense>
      )}

      {/* ── Heatmap overlay ── */}
      <Suspense fallback={null}>
        <CyberHeatmapHUD />
      </Suspense>

      {/* ── Particle field + Holo streams (desktop only) ── */}
      <div className="hidden md:block">
        <Suspense fallback={null}>
          <AmbientParticleField density={0.08} />
        </Suspense>
      </div>

      <div className="hidden md:block">
        <Suspense fallback={null}>
          <HoloDataStream side="both" />
        </Suspense>
      </div>

      {/* ── Film Grain + Chromatic Aberration Border ── */}
      {!isLow && (
        <Suspense fallback={null}>
          <FilmGrainOverlay strength={0.02} />
        </Suspense>
      )}
      {!isLow && (
        <Suspense fallback={null}>
          <ChromaticAberrationBorder strength={quality === "high" ? 8 : 4} />
        </Suspense>
      )}

      {/* ── Ambient Audio (starts after first user gesture) ── */}
      <Suspense fallback={null}>
        <AmbientAudioController />
      </Suspense>
    </>
  );
}
