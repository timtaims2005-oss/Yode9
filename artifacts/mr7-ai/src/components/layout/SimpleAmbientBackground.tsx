/**
 * SimpleAmbientBackground — خلفية الكاروهات الحمراء/السوداء القديمة (مطوّرة)
 * رقعة شطرنج داكنة حمراء/سوداء + توهج أحمر + شبكة رقيقة + خط مسح + نبض خافت على المربعات.
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
      {/* رقعة الكاروهات الحمراء/السوداء */}
      <div
        className="ambient-checker"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.55,
          backgroundImage:
            "repeating-conic-gradient(#0c0c0c 0% 25%, #1a0608 0% 50%)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
        }}
      />

      {/* خطوط فاصلة رفيعة بين المربعات */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          backgroundImage:
            "linear-gradient(rgba(226,18,39,0.12) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(226,18,39,0.12) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* توهج مركزي خافت */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226,18,39,0.12), transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 100% 100%, rgba(0,229,255,0.05), transparent 60%)," +
            "radial-gradient(ellipse 70% 50% at 0% 100%, rgba(167,139,250,0.04), transparent 60%)",
        }}
      />

      {/* شبكة ثابتة رقيقة جداً (طبقة إضافية للعمق) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
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
            "linear-gradient(180deg, transparent, rgba(226,18,39,0.07), transparent)",
          animation: "ambientScan 14s linear infinite",
        }}
      />

      {/* نبض خافت على رقعة الكاروهات */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(226,18,39,0.08), transparent 70%)",
          animation: "ambientPulse 6s ease-in-out infinite",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 220px rgba(0,0,0,0.7)",
        }}
      />

      <style>{`
        @keyframes ambientScan {
          0%   { top: -140px; }
          100% { top: 100vh; }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
