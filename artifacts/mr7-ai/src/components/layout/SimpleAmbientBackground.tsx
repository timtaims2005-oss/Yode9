/**
 * SimpleAmbientBackground — الخلفية البسيطة الأصلية (مطوّرة)
 * خلفية داكنة نظيفة بدون كرات/خطوط/جسيمات متحركة ثقيلة.
 * توهج أحمر خافت + شبكة ثابتة رقيقة + خط مسح بطيء (CSS فقط، أداء ممتاز).
 */
export function SimpleAmbientBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#080808",
      }}
    >
      {/* توهج مركزي خافت */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226,18,39,0.09), transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 100% 100%, rgba(0,229,255,0.05), transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 0% 100%, rgba(167,139,250,0.04), transparent 60%)",
        }}
      />

      {/* شبكة ثابتة رقيقة جداً */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* خط مسح بطيء نازل */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "140px",
          background:
            "linear-gradient(180deg, transparent, rgba(226,18,39,0.05), transparent)",
          animation: "ambientScan 14s linear infinite",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 220px rgba(0,0,0,0.65)",
        }}
      />

      <style>{`
        @keyframes ambientScan {
          0%   { top: -140px; }
          100% { top: 100vh; }
        }
      `}</style>
    </div>
  );
}
