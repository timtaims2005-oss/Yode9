import { lazy, Suspense } from "react";
import { getQualityLevel } from "../../lib/adaptive-quality";

const CSSPostFX    = lazy(() => import("../3d/PostProcessing").then(m => ({ default: m.CSSPostFX })));
const UltraScene5D = lazy(() => import("../3d/UltraScene5D").then(m => ({ default: m.UltraScene5D })));

/**
 * AmbientLayer — طبقة التأثيرات البيئية خماسية الأبعاد
 * 5D XYZ + البُعد الرابع (الطور الزمني) + البُعد الخامس (الوعي الكمومي)
 */
export function AmbientLayer() {
  const quality = getQualityLevel();
  const isLow   = quality === "low";

  return (
    <>
      {/* ── محرك الرسومات 5D الكامل ── */}
      <Suspense fallback={null}>
        <UltraScene5D showStats={false} />
      </Suspense>

      {/* ── طبقة Post-Processing CSS (خطوط المسح / vignette) ── */}
      {!isLow && (
        <Suspense fallback={null}>
          <CSSPostFX
            enabled
            bloom={false}
            scanlines={quality === "high"}
            vignette={true}
            chromaticAberration={false}
            glitch={false}
          />
        </Suspense>
      )}
    </>
  );
}
