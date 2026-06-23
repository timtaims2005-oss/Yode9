/**
 * Performance Booster — visible performance control panel + always-on FPS badge.
 *
 * · Always-visible mini FPS badge (bottom-left, zero overhead)
 * · Full panel  Ctrl+Shift+B  — quality presets, per-feature toggles,
 *   Web Vitals, composite performance score, Hz / DPR / battery readout
 * · Quality presets wire directly into animationController.setLevel()
 * · "Kill backgrounds" toggle pauses all canvas RAF loops via a CSS class
 *   that the canvas elements can react to (opacity:0 + pointer-events:none)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { animationController, type AnimationLevel } from "@/lib/animation-controller";
import { adaptiveFPS }  from "@/lib/adaptive-fps";
import { webVitals, type WebVitalsSnapshot, type VitalRating } from "@/lib/web-vitals-monitor";
import { getDetectedRefreshRate } from "@/lib/adaptive-quality";

/* ── Colours ────────────────────────────────────────────────────────── */
const RED    = "#e21227";
const GREEN  = "#00ff88";
const YELLOW = "#fbbf24";
const ORANGE = "#f97316";
const CYAN   = "#00e5ff";
const VIOLET = "#a78bfa";
const DIM    = "#555";
const DIMMER = "#333";

function ratingColor(r: VitalRating | undefined): string {
  if (!r) return DIM;
  return r === "good" ? GREEN : r === "needs-improvement" ? YELLOW : ORANGE;
}

function scoreColor(s: number) {
  return s >= 80 ? GREEN : s >= 50 ? YELLOW : ORANGE;
}

/* ── Quality preset definitions ─────────────────────────────────────── */
interface Preset { id: AnimationLevel; label: string; desc: string; color: string }
const PRESETS: Preset[] = [
  { id: 5, label: "ULTRA",  desc: "Full effects, max quality", color: VIOLET },
  { id: 4, label: "HIGH",   desc: "All features, GPU-capped",  color: CYAN   },
  { id: 3, label: "MEDIUM", desc: "Reduced particles",         color: GREEN  },
  { id: 2, label: "LOW",    desc: "CSS-only, no WebGL",        color: YELLOW },
  { id: 1, label: "MINIMAL",desc: "No animations (a11y)",      color: ORANGE },
];

/* ── Section label ───────────────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ color: DIMMER, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", margin: "10px 0 4px" }}>
      {text}
    </div>
  );
}

/* ── Toggle row ─────────────────────────────────────────────────────── */
function Toggle({ label, value, onChange, color = GREEN }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: "#888", fontSize: 10 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 32, height: 16, borderRadius: 8, position: "relative", border: "none",
          background: value ? color : "#1a1a1a", cursor: "pointer", transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: value ? 18 : 2,
          width: 12, height: 12, borderRadius: "50%",
          background: value ? "#fff" : "#555",
          transition: "left .2s, background .2s",
        }} />
      </button>
    </div>
  );
}

/* ── Stat row ────────────────────────────────────────────────────────── */
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ color: DIMMER, fontSize: 10 }}>{label}</span>
      <span style={{ color: color ?? "#aaa", fontSize: 10, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ── Vital row ───────────────────────────────────────────────────────── */
function Vital({ label, value, unit, rating, good }: { label: string; value: number | null; unit: string; rating?: VitalRating; good: string }) {
  const color = ratingColor(rating);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0" }}>
      <span style={{ color: DIMMER, fontSize: 10, minWidth: 38 }}>{label}</span>
      <span style={{ color: "#444", fontSize: 9 }}>{good}</span>
      <span style={{ color, fontSize: 10, fontWeight: 700, minWidth: 52, textAlign: "right" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export function PerformanceBooster() {
  const [open,     setOpen]     = useState(false);
  const [preset,   setPreset]   = useState<AnimationLevel>(5);
  const [vitals,   setVitals]   = useState<WebVitalsSnapshot>({
    lcp: null, fcp: null, cls: null, inp: null, ttfb: null, longTasks: 0, score: 0,
  });
  const [kills,    setKills]    = useState(false); // kill all canvas backgrounds
  const [blur,     setBlur]     = useState(true);
  const [glow,     setGlow]     = useState(true);
  const [particles,setParticles]= useState(true);

  /* live FPS sampler — cheap, independent RAF */
  const fpsRef     = useRef(60);
  const [fps, setFps]           = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastTsRef     = useRef(0);
  const rafRef        = useRef(0);

  /* adaptive state */
  const [adaptState, setAdaptState] = useState(adaptiveFPS.state);

  /* drag */
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef({ on: false, ox: 0, oy: 0 });
  const posRef   = useRef({ r: 12, b: 56 });

  const hz   = getDetectedRefreshRate();
  const cores = navigator.hardwareConcurrency ?? 1;

  /* ── keyboard toggle ─────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "B") { e.preventDefault(); setOpen(v => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── FPS sampler ─────────────────────────────────────────────────── */
  useEffect(() => {
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (lastTsRef.current) {
        const d = now - lastTsRef.current;
        frameTimesRef.current.push(d);
        if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
        if (frameTimesRef.current.length >= 10) {
          const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          fpsRef.current = Math.round(1000 / avg);
        }
      }
      lastTsRef.current = now;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* refresh fps display 4×/sec */
  useEffect(() => {
    const id = setInterval(() => setFps(fpsRef.current), 250);
    return () => clearInterval(id);
  }, []);

  /* ── subscribe to adaptive state ─────────────────────────────────── */
  useEffect(() => adaptiveFPS.subscribe(setAdaptState), []);

  /* ── Web Vitals ──────────────────────────────────────────────────── */
  useEffect(() => webVitals.subscribe(setVitals), []);

  /* ── Quality preset → animationController ────────────────────────── */
  const applyPreset = useCallback((level: AnimationLevel) => {
    setPreset(level);
    animationController.setLevel(level, true);
    // Sync toggles to preset config
    setParticles(level >= 4);
    setBlur(level >= 4);
    setGlow(level >= 3);
  }, []);

  /* ── Kill backgrounds toggle → CSS class on <html> ──────────────── */
  useEffect(() => {
    if (kills) document.documentElement.classList.add("mr7-no-canvas");
    else        document.documentElement.classList.remove("mr7-no-canvas");
  }, [kills]);

  /* ── CSS feature toggles ─────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.style.setProperty("--mr7-blur",    blur     ? "blur(12px)" : "none");
    document.documentElement.style.setProperty("--mr7-glow",    glow     ? "1" : "0");
    document.documentElement.style.setProperty("--mr7-particles",particles ? "1" : "0");
  }, [blur, glow, particles]);

  /* ── Drag ────────────────────────────────────────────────────────── */
  const onHeaderDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { on: true, ox: e.clientX - rect.right, oy: e.clientY - rect.bottom };
    e.preventDefault();
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current.on || !panelRef.current) return;
      posRef.current.r = Math.max(4, window.innerWidth  - e.clientX - dragRef.current.ox);
      posRef.current.b = Math.max(4, window.innerHeight - e.clientY - dragRef.current.oy);
      panelRef.current.style.right  = posRef.current.r + "px";
      panelRef.current.style.bottom = posRef.current.b + "px";
    };
    const up = () => { dragRef.current.on = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const fpsColor = fps >= 55 ? GREEN : fps >= 30 ? YELLOW : RED;
  const { batteryLevel, batteryCharging, targetFPS, reason } = adaptState;

  return (
    <>
      {/* ── Always-visible mini FPS badge ─────────────────────────── */}
      <div
        onClick={() => setOpen(v => !v)}
        title="Ctrl+Shift+B — Performance Booster"
        style={{
          position: "fixed", left: 10, bottom: 10, zIndex: 99998,
          background: "rgba(6,6,8,0.88)", border: `1px solid ${fpsColor}33`,
          borderRadius: 6, padding: "3px 7px",
          fontFamily: "monospace", fontSize: 11, cursor: "pointer",
          userSelect: "none", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", gap: 5,
          boxShadow: `0 0 8px ${fpsColor}22`,
          transition: "border-color .3s, box-shadow .3s",
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: fpsColor, boxShadow: `0 0 4px ${fpsColor}` }} />
        <span style={{ color: fpsColor, fontWeight: 700 }}>{fps}</span>
        <span style={{ color: DIM }}>fps</span>
        <span style={{ color: DIMMER, fontSize: 9 }}>| {targetFPS}↗ | {hz}Hz</span>
      </div>

      {/* ── Full booster panel ─────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            right: posRef.current.r + 52, // offset so it doesn't overlap the mini badge
            bottom: posRef.current.b + 28,
            zIndex: 99999,
            width: 280,
            background: "rgba(5,5,7,0.97)",
            border: "1px solid #1f1f1f",
            borderRadius: 12,
            padding: "12px 14px 14px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#a0a0a0",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(226,18,39,0.12)",
            userSelect: "none",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            onMouseDown={onHeaderDown}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10, cursor: "move", paddingBottom: 8,
              borderBottom: "1px solid #161616",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: RED, boxShadow: `0 0 6px ${RED}` }} />
              <span style={{ color: RED, fontWeight: 700, letterSpacing: 1.5, fontSize: 10 }}>PERFORMANCE BOOSTER</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: DIMMER, cursor: "pointer", fontSize: 14, padding: 0 }}
            >×</button>
          </div>

          {/* ── Performance score ─────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#0a0a0c", borderRadius: 8, padding: "8px 10px", marginBottom: 4,
          }}>
            {/* Score ring */}
            <svg width={54} height={54} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
              <circle cx={27} cy={27} r={22} fill="none" stroke="#1a1a1a" strokeWidth={5} />
              <circle
                cx={27} cy={27} r={22} fill="none"
                stroke={scoreColor(vitals.score)}
                strokeWidth={5}
                strokeDasharray={`${(vitals.score / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray .4s, stroke .4s" }}
              />
              <text
                x={27} y={28} textAnchor="middle" dominantBaseline="middle"
                fill={scoreColor(vitals.score)} fontSize={13} fontWeight={700} fontFamily="monospace"
                style={{ transform: "rotate(90deg)", transformOrigin: "27px 27px" }}
              >
                {vitals.score || "—"}
              </text>
            </svg>
            <div>
              <div style={{ color: scoreColor(vitals.score), fontWeight: 700, fontSize: 13 }}>
                {vitals.score >= 80 ? "FAST" : vitals.score >= 50 ? "FAIR" : vitals.score > 0 ? "SLOW" : "MEASURING"}
              </div>
              <div style={{ color: DIM, fontSize: 9, marginTop: 2 }}>
                {vitals.longTasks} long tasks · {fps} fps live · {hz} Hz
              </div>
              <div style={{ color: DIMMER, fontSize: 9 }}>
                {adaptState.batteryLevel !== null
                  ? `Battery ${adaptState.batteryLevel}%${batteryCharging ? " ⚡" : ""}`
                  : `${cores} CPU cores`}
              </div>
            </div>
          </div>

          {/* ── Quality presets ───────────────────────────────────── */}
          <SectionLabel text="Quality Preset" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                title={p.desc}
                style={{
                  background: preset === p.id ? `${p.color}18` : "transparent",
                  border: `1px solid ${preset === p.id ? p.color : "#1f1f1f"}`,
                  color: preset === p.id ? p.color : DIMMER,
                  borderRadius: 5, padding: "4px 2px", fontSize: 8, cursor: "pointer",
                  fontFamily: "monospace", fontWeight: 600, letterSpacing: 0.5,
                  transition: "all .15s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Feature toggles ───────────────────────────────────── */}
          <SectionLabel text="Feature Controls" />
          <Toggle label="Canvas backgrounds" value={!kills}    onChange={v => setKills(!v)} color={CYAN}   />
          <Toggle label="Particle effects"   value={particles} onChange={setParticles}       color={VIOLET} />
          <Toggle label="Blur / glass"       value={blur}      onChange={setBlur}            color={CYAN}   />
          <Toggle label="Glow effects"       value={glow}      onChange={setGlow}            color={RED}    />

          {/* ── Adaptive FPS ──────────────────────────────────────── */}
          <SectionLabel text="Adaptive FPS" />
          <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: DIM, fontSize: 10 }}>Target</span>
              <span style={{ color: fpsColor, fontWeight: 700, fontSize: 14 }}>{targetFPS} FPS</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: DIMMER, fontSize: 9 }}>reason</span>
              <span style={{ color: "#444", fontSize: 9 }}>{reason}</span>
            </div>
            {batteryLevel !== null && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: DIMMER, fontSize: 9 }}>{batteryCharging ? "Battery ⚡ charging" : "Battery"}</span>
                  <span style={{ color: batteryCharging ? CYAN : batteryLevel > 50 ? GREEN : batteryLevel > 20 ? YELLOW : RED, fontSize: 9, fontWeight: 600 }}>
                    {batteryLevel}%
                  </span>
                </div>
                <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${batteryLevel}%`,
                    background: batteryCharging ? CYAN : batteryLevel > 50 ? GREEN : batteryLevel > 20 ? YELLOW : RED,
                    borderRadius: 2, transition: "width .4s",
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* ── Web Vitals ────────────────────────────────────────── */}
          <SectionLabel text="Web Vitals (Core)" />
          <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
            <Vital label="LCP"  value={vitals.lcp?.value  ?? null} unit="ms" rating={vitals.lcp?.rating}  good="≤2500" />
            <Vital label="FCP"  value={vitals.fcp?.value  ?? null} unit="ms" rating={vitals.fcp?.rating}  good="≤1800" />
            <Vital label="CLS"  value={vitals.cls?.value  ?? null} unit=""   rating={vitals.cls?.rating}  good="≤0.1"  />
            <Vital label="INP"  value={vitals.inp?.value  ?? null} unit="ms" rating={vitals.inp?.rating}  good="≤200"  />
            <Vital label="TTFB" value={vitals.ttfb?.value ?? null} unit="ms" rating={vitals.ttfb?.rating} good="≤800"  />
            <div style={{ borderTop: "1px solid #161616", marginTop: 4, paddingTop: 4 }}>
              <Stat label="Long Tasks" value={`${vitals.longTasks} blocks`} color={vitals.longTasks > 10 ? ORANGE : vitals.longTasks > 3 ? YELLOW : DIM} />
            </div>
          </div>

          {/* ── System info ───────────────────────────────────────── */}
          <SectionLabel text="System" />
          <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
            <Stat label="Screen Hz"    value={`${hz} Hz`}           color={hz >= 120 ? VIOLET : CYAN} />
            <Stat label="Live FPS"     value={`${fps} fps`}         color={fpsColor}                  />
            <Stat label="DPR (capped)" value={`${adaptState.dpr}×`} color={CYAN}                      />
            <Stat label="CPU Cores"    value={`${cores} cores`}     color={DIM}                       />
            <Stat label="Anim Level"   value={`${preset}/5`}        color={PRESETS.find(p => p.id === preset)?.color ?? DIM} />
          </div>

          {/* ── Action buttons ────────────────────────────────────── */}
          <SectionLabel text="Actions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              onClick={() => { try { (window as { gc?: () => void }).gc?.(); } catch {} }}
              style={{ ...btnStyle, color: DIM, borderColor: "#1f1f1f" }}
            >FORCE GC</button>
            <button
              onClick={() => {
                animationController.clearOverride();
                setPreset(5); setKills(false); setBlur(true); setGlow(true); setParticles(true);
              }}
              style={{ ...btnStyle, color: CYAN, borderColor: `${CYAN}33` }}
            >RESET ALL</button>
            <button
              onClick={() => { applyPreset(1); adaptiveFPS.forceLowPower(); }}
              style={{ ...btnStyle, color: ORANGE, borderColor: `${ORANGE}33` }}
            >LOW POWER</button>
            <button
              onClick={() => { applyPreset(5); adaptiveFPS.releaseLowPower(); }}
              style={{ ...btnStyle, color: GREEN, borderColor: `${GREEN}33` }}
            >MAX PERF</button>
          </div>

          <div style={{ marginTop: 10, color: DIMMER, fontSize: 9, textAlign: "center" }}>
            Ctrl+Shift+B to toggle · Ctrl+Shift+P for raw HUD
          </div>
        </div>
      )}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #262626",
  borderRadius: 5,
  padding: "5px 0",
  fontSize: 9,
  cursor: "pointer",
  fontFamily: "monospace",
  letterSpacing: 0.5,
  fontWeight: 600,
  transition: "all .15s",
};
