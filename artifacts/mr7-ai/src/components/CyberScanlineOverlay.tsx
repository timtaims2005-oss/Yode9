/**
 * CyberScanlineOverlay — CRT scanlines + vignette + chromatic aberration edge
 * Pure CSS, zero JS per frame, GPU composited via mix-blend-mode
 * Adds cinematic depth to the entire app without any performance cost
 */
export function CyberScanlineOverlay() {
  return (
    <>
      {/* CRT Scanlines */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 99990,
          pointerEvents: "none",
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.06) 2px,
            rgba(0,0,0,0.06) 4px
          )`,
          mixBlendMode: "multiply",
        }}
      />

      {/* Vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 99991,
          pointerEvents: "none",
          background: `radial-gradient(
            ellipse 100% 100% at 50% 50%,
            transparent 55%,
            rgba(0,0,0,0.35) 100%
          )`,
        }}
      />

      {/* Top edge cyan glow line */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 1,
          zIndex: 99992, pointerEvents: "none",
          background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4) 30%, rgba(0,229,255,0.7) 50%, rgba(0,229,255,0.4) 70%, transparent)",
          boxShadow: "0 0 8px rgba(0,229,255,0.5)",
        }}
      />

      {/* Bottom edge red glow line */}
      <div
        aria-hidden
        style={{
          position: "fixed", bottom: 22, left: 0, right: 0, height: 1,
          zIndex: 99992, pointerEvents: "none",
          background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.3) 30%, rgba(226,18,39,0.6) 50%, rgba(226,18,39,0.3) 70%, transparent)",
          boxShadow: "0 0 6px rgba(226,18,39,0.4)",
        }}
      />

      {/* Left edge */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, width: 1,
          zIndex: 99992, pointerEvents: "none",
          background: "linear-gradient(180deg, transparent, rgba(0,229,255,0.15) 50%, transparent)",
        }}
      />

      {/* Right edge */}
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, bottom: 0, right: 0, width: 1,
          zIndex: 99992, pointerEvents: "none",
          background: "linear-gradient(180deg, transparent, rgba(226,18,39,0.12) 50%, transparent)",
        }}
      />
    </>
  );
}
