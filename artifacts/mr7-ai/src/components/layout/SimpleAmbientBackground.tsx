/**
 * SimpleAmbientBackground — خلفية الكاروهات الحمراء/السوداء القديمة (مطوّرة)
 * 3 أنماط قابلة للاختيار من الإعدادات: checkerboard | grid | particles
 */
export type BackgroundStyle = "checkerboard" | "grid" | "particles";

export function SimpleAmbientBackground({ styleId = "checkerboard" }: { styleId?: BackgroundStyle }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#0a0202",
      }}
    >
      {styleId === "checkerboard" && (
        <>
          {/* رقعة كاروهات حمراء غالبة ممزوجة بحواف ناعمة مع الأسود (بدون filter/blur لتفادي أي تقطيع في الأداء) */}
          <div
            className="ambient-checker"
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.85,
              backgroundImage: "repeating-conic-gradient(#4a0209 0% 25%, #0a0202 0% 50%)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
            }}
          />

          {/* طبقة حمراء إضافية لزيادة هيمنة اللون الأحمر مع مزج ناعم للحواف */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.5,
              background: "radial-gradient(ellipse 90% 70% at 50% 35%, rgba(226,18,39,0.32), transparent 78%)",
            }}
          />

          {/* خطوط فاصلة رفيعة بين المربعات */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.4,
              backgroundImage:
                "linear-gradient(rgba(226,18,39,0.18) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(226,18,39,0.18) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
            }}
          />

          {/* نبض خافت على رقعة الكاروهات */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(226,18,39,0.14), transparent 70%)",
              animation: "ambientPulse 6s ease-in-out infinite",
            }}
          />
        </>
      )}

      {styleId === "grid" && (
        <>
          {/* شبكة خطوط حمراء واضحة */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.4,
              backgroundImage:
                "linear-gradient(rgba(226,18,39,0.16) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(226,18,39,0.16) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
            }}
          />
          {/* خطوط ثانوية أدق للعمق */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.18,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              maskImage: "radial-gradient(ellipse 85% 65% at 50% 30%, #000 35%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 30%, #000 35%, transparent 100%)",
            }}
          />
        </>
      )}

      {styleId === "particles" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            backgroundImage:
              "radial-gradient(rgba(226,18,39,0.5) 1px, transparent 1.5px)," +
              "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1.5px)",
            backgroundSize: "38px 38px, 64px 64px",
            backgroundPosition: "0 0, 19px 27px",
            maskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 95% 80% at 50% 25%, #000 35%, transparent 100%)",
            animation: "ambientDrift 30s linear infinite",
          }}
        />
      )}

      {/* توهج مركزي خافت — مشترك بين كل الأنماط */}
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
          background: "linear-gradient(180deg, transparent, rgba(226,18,39,0.07), transparent)",
          animation: "ambientScan 14s linear infinite",
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
        @keyframes ambientDrift {
          0%   { background-position: 0 0, 19px 27px; }
          100% { background-position: 38px 38px, 57px 65px; }
        }
      `}</style>
    </div>
  );
}
