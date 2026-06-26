import { lazy, Suspense } from "react";
import { getQualityLevel } from "../../lib/adaptive-quality";

const CSSPostFX  = lazy(() => import("../3d/PostProcessing").then(m => ({ default: m.CSSPostFX })));

/**
 * AmbientLayer — lightweight background effects only
 * 3D scene removed to avoid blocking chat and buttons
 */
export function AmbientLayer() {
  const quality = getQualityLevel();
  const isLow   = quality === "low";

  return (
    <>
      {/* ── Post-Processing CSS Layer (scanlines/vignette only) ── */}
      <Suspense fallback={null}>
        <CSSPostFX
          enabled
          bloom={false}
          scanlines={false}
          vignette={false}
          chromaticAberration={false}
          glitch={false}
        />
      </Suspense>
    </>
  );
}
