import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════
   NEURAL.AI — Compact HUD v4
   Max 320×120px · No sphere · 3 thin bars · futuristic 5D shell
═══════════════════════════════════════════════════════════════════════ */

const AGENT_PHASES = [
  { text: "Scanning attack surface",    label: "RECON"     },
  { text: "Querying intel database",     label: "RETRIEVE"  },
  { text: "Identifying vulnerabilities", label: "ANALYZE"   },
  { text: "Generating exploit chain",    label: "GENERATE"  },
  { text: "Running stealth checks",      label: "VALIDATE"  },
  { text: "Synthesizing intelligence",   label: "SYNTHESIZE"},
];

const CHAT_PHASES = [
  { text: "Parsing neural context",      label: "PARSE"     },
  { text: "Retrieving memory vectors",   label: "RETRIEVE"  },
  { text: "Processing neural matrix",    label: "COMPUTE"   },
  { text: "Formulating response",        label: "GENERATE"  },
  { text: "Cross-referencing knowledge", label: "VERIFY"    },
  { text: "Applying security protocols", label: "FINALIZE"  },
];

const BARS = [
  { name: "CORTEX", color: "#e21227" },
  { name: "MEMORY", color: "#00e5ff" },
  { name: "OUTPUT", color: "#22c55e" },
];

/* ── Animated thin bar ─────────────────────────────────────────────── */
function ThinBar({ color, name, seed }: { color: string; name: string; seed: number }) {
  const [fill, setFill] = useState(30 + seed * 17);
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);
  const fillRef = useRef(fill);

  useEffect(() => {
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      tickRef.current++;
      if (tickRef.current % 6 === 0) {
        // drift target randomly, bounce in 15–95
        fillRef.current = Math.min(95, Math.max(15,
          fillRef.current + (Math.random() - 0.42) * 7
        ));
        setFill(Math.round(fillRef.current));
      }
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {/* label */}
      <span style={{
        fontSize: 7, fontFamily: "monospace", fontWeight: 800,
        color, letterSpacing: "0.6px", minWidth: 36, opacity: 0.9,
      }}>
        {name}
      </span>

      {/* track */}
      <div style={{
        flex: 1, height: 3, borderRadius: 2,
        background: `${color}18`,
        position: "relative", overflow: "hidden",
      }}>
        {/* fill */}
        <motion.div
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            background: `linear-gradient(90deg, ${color}55, ${color})`,
            borderRadius: 2,
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
        {/* shimmer scan */}
        <motion.div
          animate={{ x: ["-40%", "140%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear", repeatDelay: 0.4 }}
          style={{
            position: "absolute", top: 0, width: "30%", height: "100%",
            background: `linear-gradient(90deg, transparent, ${color}cc, transparent)`,
          }}
        />
      </div>

      {/* percent */}
      <span style={{
        fontSize: 7, fontFamily: "monospace", color: `${color}bb`,
        minWidth: 20, textAlign: "right",
      }}>
        {fill}%
      </span>
    </div>
  );
}

/* ── Corner brackets ───────────────────────────────────────────────── */
function Corners({ color }: { color: string }) {
  const b = `1px solid ${color}`;
  const s: React.CSSProperties = { position: "absolute", width: 7, height: 7 };
  return (
    <>
      <div style={{ ...s, top: 3, left: 3,   borderTop: b, borderLeft: b  }} />
      <div style={{ ...s, top: 3, right: 3,  borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 3, left: 3,  borderBottom: b, borderLeft:  b }} />
      <div style={{ ...s, bottom: 3, right: 3, borderBottom: b, borderRight: b }} />
    </>
  );
}

/* ── Scanline sweep overlay ────────────────────────────────────────── */
function ScanSweep({ color }: { color: string }) {
  return (
    <motion.div
      animate={{ x: ["-100%", "200%"] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
      style={{
        position: "absolute", top: 0, left: 0,
        width: "30%", height: "100%", pointerEvents: "none", zIndex: 1,
        background: `linear-gradient(90deg, transparent, ${color}0a, ${color}18, ${color}0a, transparent)`,
      }}
    />
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
interface ThinkingIndicatorProps { agentMode?: boolean }

export function ThinkingIndicator({ agentMode = false }: ThinkingIndicatorProps) {
  const [phase,   setPhase]   = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [tps,     setTps]     = useState(8);
  const startRef = useRef(Date.now());

  const phases       = agentMode ? AGENT_PHASES : CHAT_PHASES;
  const currentPhase = phases[phase % phases.length];

  /* ticker */
  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
      setTps(prev => Math.round(prev + (22 + Math.random() * 20 - prev) * 0.3));
    }, 350);
    return () => clearInterval(id);
  }, []);

  /* phase cycle */
  useEffect(() => {
    const id = setInterval(() => setPhase(p => p + 1), 2800);
    return () => clearInterval(id);
  }, []);

  const RED = "#e21227";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{    opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "inline-block", maxWidth: 320, width: "100%" }}
    >
      {/* Shell */}
      <div style={{
        position: "relative",
        maxHeight: 120,
        padding: "7px 10px 8px",
        background: "rgba(6,4,14,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${RED}50`,
        borderRadius: 5,
        boxShadow: `
          0 0 0 1px ${RED}16,
          0 8px 32px rgba(0,0,0,0.7),
          0 0 20px ${RED}10,
          inset 0 0 20px ${RED}05
        `,
        overflow: "hidden",
      }}>
        <Corners color={RED} />
        <ScanSweep color={RED} />

        {/* Top shimmer edge */}
        <motion.div
          animate={{ backgroundPosition: ["0% 0%", "100% 0%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${RED}cc, ${RED}, ${RED}cc, transparent)`,
            backgroundSize: "200% auto",
          }}
        />

        {/* ── Row 1: NEURAL.AI · MODE · t/s · time ─── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 4, position: "relative", zIndex: 2,
        }}>
          {/* Blinking status dot */}
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            style={{
              width: 4, height: 4, borderRadius: "50%",
              background: RED, boxShadow: `0 0 5px ${RED}`, flexShrink: 0,
            }}
          />

          {/* NEURAL.AI */}
          <span style={{
            fontSize: 9, fontFamily: "monospace", fontWeight: 900,
            color: RED, letterSpacing: "2px",
          }}>
            NEURAL.AI
          </span>

          <span style={{ fontSize: 8, color: `${RED}40`, fontFamily: "monospace" }}>│</span>

          {/* Active mode — animated */}
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y:  4 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: 9, fontFamily: "monospace", fontWeight: 800,
                color: "#fff", letterSpacing: "1px",
              }}
            >
              {currentPhase.label}
            </motion.span>
          </AnimatePresence>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* t/s */}
          <span style={{
            fontSize: 8, fontFamily: "monospace",
            color: "#22c55e", letterSpacing: "0.3px",
          }}>
            {tps}<span style={{ color: "rgba(255,255,255,0.25)" }}>t/s</span>
          </span>

          {/* elapsed */}
          <span style={{
            fontSize: 8, fontFamily: "monospace",
            color: "rgba(255,255,255,0.28)",
          }}>
            {elapsed.toFixed(1)}s
          </span>
        </div>

        {/* ── Row 2: What model is doing now ──────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{    opacity: 0, x:  6 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: 8.5, fontFamily: "monospace",
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.3px", marginBottom: 7,
              position: "relative", zIndex: 2,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {/* tiny chevron */}
            <span style={{ color: RED, opacity: 0.7 }}>›</span>
            {currentPhase.text}
            {/* trailing cursor */}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              style={{ color: RED }}
            >
              _
            </motion.span>
          </motion.div>
        </AnimatePresence>

        {/* ── Rows 3-5: CORTEX / MEMORY / OUTPUT bars ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative", zIndex: 2 }}>
          {BARS.map((bar, i) => (
            <ThinBar key={bar.name} name={bar.name} color={bar.color} seed={i} />
          ))}
        </div>

        {/* Bottom accent */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${RED}30 50%, transparent)`,
        }} />

        {/* 5D depth planes — stacked pseudo-layers */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 11px,
              rgba(226,18,39,0.018) 11px,
              rgba(226,18,39,0.018) 12px
            )
          `,
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 0%, ${RED}06 0%, transparent 65%)`,
        }} />
      </div>
    </motion.div>
  );
}
