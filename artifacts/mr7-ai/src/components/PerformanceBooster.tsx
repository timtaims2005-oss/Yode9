/**
 * Performance Booster v2 — 144Hz support + HighPerfEngine integration.
 *
 * · Always-visible mini badge: live FPS + target Hz + health dot
 * · Full panel Ctrl+Shift+B:
 *     — Hz selector: 10 / 15 / 30 / 60 / 120 / 144 / AUTO
 *     — Speedometer gauge (live FPS vs target)
 *     — Frame pipeline (JS budget bar, GPU queue depth)
 *     — Quality presets wired to animationController
 *     — Per-feature toggles (canvas / particles / blur / glow)
 *     — Web Vitals display
 *     — GPU layer audit
 *     — Long-task counter
 *     — Action buttons
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { animationController, type AnimationLevel } from "@/lib/animation-controller";
import { adaptiveFPS, type FPSTarget }               from "@/lib/adaptive-fps";
import { highPerfEngine, onFramePipeline, auditGPULayers, type FramePipeline } from "@/lib/high-perf-engine";
import { webVitals, type WebVitalsSnapshot, type VitalRating } from "@/lib/web-vitals-monitor";
import { getDetectedRefreshRate } from "@/lib/adaptive-quality";

/* ── Theme tokens ─────────────────────────────────────────────────── */
const RED    = "#e21227";
const GREEN  = "#00ff88";
const YELLOW = "#fbbf24";
const ORANGE = "#f97316";
const CYAN   = "#00e5ff";
const VIOLET = "#a78bfa";
const DIM    = "#555";
const DIMMER = "#333";

/* ── Helpers ─────────────────────────────────────────────────────── */
function ratingColor(r: VitalRating | undefined): string {
  if (!r) return DIM;
  return r === "good" ? GREEN : r === "needs-improvement" ? YELLOW : ORANGE;
}
function scoreColor(s: number) {
  return s >= 80 ? GREEN : s >= 50 ? YELLOW : ORANGE;
}
function fpsToColor(fps: number, target: number): string {
  const ratio = fps / target;
  if (ratio >= 0.9) return GREEN;
  if (ratio >= 0.6) return YELLOW;
  return RED;
}

/* ── Sub-components ───────────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ color: DIMMER, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", margin: "10px 0 4px" }}>
      {text}
    </div>
  );
}

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
          transition: "left .15s, background .15s",
        }} />
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ color: DIMMER, fontSize: 10 }}>{label}</span>
      <span style={{ color: color ?? "#aaa", fontSize: 10, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Vital({ label, value, unit, rating, good }: { label: string; value: number | null; unit: string; rating?: VitalRating; good: string }) {
  const color = ratingColor(rating);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0" }}>
      <span style={{ color: DIMMER, fontSize: 10, minWidth: 38 }}>{label}</span>
      <span style={{ color: "#333", fontSize: 9 }}>{good}</span>
      <span style={{ color, fontSize: 10, fontWeight: 700, minWidth: 52, textAlign: "right" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

/* ── Hz selector options ──────────────────────────────────────────── */
const HZ_OPTIONS: Array<{ label: string; fps: FPSTarget | "auto" }> = [
  { label: "AUTO",  fps: "auto" },
  { label: "144",   fps: 144    },
  { label: "120",   fps: 120    },
  { label: "60",    fps: 60     },
  { label: "30",    fps: 30     },
  { label: "15",    fps: 15     },
  { label: "10",    fps: 10     },
];

/* ── Quality presets ──────────────────────────────────────────────── */
interface Preset { id: AnimationLevel; label: string; desc: string; color: string }
const PRESETS: Preset[] = [
  { id: 5, label: "ULTRA",   desc: "Full effects + 144 FPS", color: VIOLET },
  { id: 4, label: "HIGH",    desc: "All features, GPU-capped", color: CYAN   },
  { id: 3, label: "MEDIUM",  desc: "Reduced particles",        color: GREEN  },
  { id: 2, label: "LOW",     desc: "CSS-only, no WebGL",       color: YELLOW },
  { id: 1, label: "MINIMAL", desc: "No animations (a11y)",     color: ORANGE },
];

/* ── Speedometer SVG ──────────────────────────────────────────────── */
function Speedometer({ fps, target, nativeHz }: { fps: number; target: number; nativeHz: number }) {
  const R     = 32;
  const CX    = 40;
  const CY    = 42;
  const sweep = 220; // degrees arc
  const pct   = Math.min(1, fps / Math.max(target, 1));
  const arcLen = 2 * Math.PI * R;
  const dashArr = (pct * (sweep / 360)) * arcLen;
  const full    = (sweep / 360) * arcLen;
  const color   = fpsToColor(fps, target);

  // rotate so arc goes from -110° to +110°
  const startDeg = 180 + (180 - sweep) / 2;

  return (
    <svg width={80} height={58} style={{ display: "block", margin: "0 auto" }}>
      {/* Track */}
      <circle
        cx={CX} cy={CY} r={R} fill="none" stroke="#1a1a1a" strokeWidth={6}
        strokeDasharray={`${full} ${arcLen}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startDeg} ${CX} ${CY})`}
      />
      {/* Fill */}
      <circle
        cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dashArr} ${arcLen}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startDeg} ${CX} ${CY})`}
        style={{ transition: "stroke-dasharray .15s, stroke .2s", filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
      {/* FPS text */}
      <text x={CX} y={CY - 2} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} fontFamily="monospace">
        {fps}
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" fill={DIMMER} fontSize={8} fontFamily="monospace">
        / {target} FPS
      </text>
      {/* Native Hz label */}
      <text x={CX} y={54} textAnchor="middle" fill="#333" fontSize={7} fontFamily="monospace">
        SCREEN {nativeHz} Hz
      </text>
    </svg>
  );
}

/* ── Frame pipeline bar ───────────────────────────────────────────── */
function PipelineBar({ pipeline }: { pipeline: FramePipeline }) {
  const pct   = Math.min(1, pipeline.jsMs / pipeline.budget);
  const color = pipeline.health === "optimal" ? GREEN : pipeline.health === "stressed" ? YELLOW : RED;
  return (
    <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: DIMMER, fontSize: 9 }}>JS frame time</span>
        <span style={{ color, fontSize: 9, fontWeight: 600 }}>{pipeline.jsMs}ms / {Math.round(pipeline.budget)}ms</span>
      </div>
      <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct * 100}%`,
          background: color, borderRadius: 2,
          boxShadow: `0 0 6px ${color}88`,
          transition: "width .1s, background .2s",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ color: DIMMER, fontSize: 9 }}>GPU queue</span>
        <span style={{ color, fontSize: 9 }}>{Math.round(pipeline.gpuWait * 100)}% · {pipeline.health}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export function PerformanceBooster() {
  const [open,      setOpen]      = useState(false);
  const [preset,    setPreset]    = useState<AnimationLevel>(5);
  const [hzMode,    setHzMode]    = useState<FPSTarget | "auto">("auto");
  const [vitals,    setVitals]    = useState<WebVitalsSnapshot>({
    lcp: null, fcp: null, cls: null, inp: null, ttfb: null, longTasks: 0, score: 0,
  });
  const [kills,     setKills]     = useState(false);
  const [blur,      setBlur]      = useState(true);
  const [glow,      setGlow]      = useState(true);
  const [particles, setParticles] = useState(true);
  const [pipeline,  setPipeline]  = useState<FramePipeline>({ jsMs: 0, gpuWait: 0, budget: 33, health: "optimal" });
  const [layerWarn, setLayerWarn] = useState(false);

  /* live FPS sampler */
  const fpsRef        = useRef(60);
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef<number[]>([]);
  const lastTsRef     = useRef(0);
  const rafRef        = useRef(0);

  /* adaptive state */
  const [adaptState, setAdaptState] = useState(adaptiveFPS.state);

  /* drag */
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef  = useRef({ on: false, ox: 0, oy: 0 });
  const posRef   = useRef({ r: 12, b: 56 });

  const hz    = getDetectedRefreshRate();
  const cores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 1) : 1;

  /* ── keyboard toggle ────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "B") { e.preventDefault(); setOpen(v => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── FPS sampler (own RAF, no extra libs) ───────────────────────── */
  useEffect(() => {
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (lastTsRef.current) {
        const d = now - lastTsRef.current;
        if (d > 0 && d < 200) { // ignore tab-restore spikes
          frameTimesRef.current.push(d);
          if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();
        }
        if (frameTimesRef.current.length >= 8) {
          const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          fpsRef.current = Math.min(Math.round(1000 / avg), 999);
        }
      }
      lastTsRef.current = now;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* refresh display 8×/sec for smooth readout */
  useEffect(() => {
    const id = setInterval(() => setFps(fpsRef.current), 125);
    return () => clearInterval(id);
  }, []);

  /* ── adaptive FPS state ─────────────────────────────────────────── */
  useEffect(() => adaptiveFPS.subscribe(setAdaptState), []);

  /* ── Web Vitals ─────────────────────────────────────────────────── */
  useEffect(() => webVitals.subscribe(setVitals), []);

  /* ── Frame pipeline ─────────────────────────────────────────────── */
  useEffect(() => onFramePipeline(setPipeline), []);

  /* ── GPU layer audit — refresh every 5s when panel is open ─────── */
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setLayerWarn(auditGPULayers().warning), 5000);
    setLayerWarn(auditGPULayers().warning);
    return () => clearInterval(id);
  }, [open]);

  /* ── Make sure highPerfEngine is initialised ────────────────────── */
  useEffect(() => { highPerfEngine.init(); }, []);

  /* ── Hz selector → adaptiveFPS ─────────────────────────────────── */
  const applyHzMode = useCallback((mode: FPSTarget | "auto") => {
    setHzMode(mode);
    if (mode === "auto") {
      adaptiveFPS.releaseOverride();
    } else {
      adaptiveFPS.forceTargetFPS(mode as FPSTarget);
    }
  }, []);

  /* ── Quality preset ─────────────────────────────────────────────── */
  const applyPreset = useCallback((level: AnimationLevel) => {
    setPreset(level);
    animationController.setLevel(level, true);
    setParticles(level >= 4);
    setBlur(level >= 4);
    setGlow(level >= 3);
    // Ultra preset → force max Hz
    if (level === 5) adaptiveFPS.forceMaxHz();
    else if (level <= 2) adaptiveFPS.forceLowPower();
    else adaptiveFPS.releaseOverride();
    setHzMode(level === 5 ? (hz >= 120 ? (hz >= 144 ? 144 : 120) : 60) as FPSTarget : "auto");
  }, [hz]);

  /* ── Kill backgrounds ───────────────────────────────────────────── */
  useEffect(() => {
    if (kills) document.documentElement.classList.add("mr7-no-canvas");
    else        document.documentElement.classList.remove("mr7-no-canvas");
  }, [kills]);

  /* ── CSS feature toggles ────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.style.setProperty("--mr7-blur",    blur      ? "blur(12px)" : "none");
    document.documentElement.style.setProperty("--mr7-glow",    glow      ? "1" : "0");
    document.documentElement.style.setProperty("--mr7-particles", particles ? "1" : "0");
  }, [blur, glow, particles]);

  /* ── Drag ───────────────────────────────────────────────────────── */
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

  const { batteryLevel, batteryCharging, targetFPS, reason, nativeHz: stateNativeHz } = adaptState;
  const displayHz   = stateNativeHz || hz;
  const liveFpsColor = fpsToColor(fps, targetFPS);

  return (
    <>
      {/* ── Always-visible FPS badge ─────────────────────────────── */}
      <div
        onClick={() => setOpen(v => !v)}
        title="Ctrl+Shift+B — Performance Booster"
        style={{
          position: "fixed", left: 10, bottom: 10, zIndex: 99998,
          background: "rgba(5,5,7,0.92)", border: `1px solid ${liveFpsColor}33`,
          borderRadius: 6, padding: "3px 8px",
          fontFamily: "monospace", fontSize: 11, cursor: "pointer",
          userSelect: "none", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", gap: 5,
          boxShadow: `0 0 10px ${liveFpsColor}22`,
          transition: "border-color .3s, box-shadow .3s",
        }}
      >
        {/* health dot */}
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: liveFpsColor,
          boxShadow: `0 0 5px ${liveFpsColor}`,
          animation: pipeline.health === "critical" ? "pulse-dot 0.6s ease-in-out infinite alternate" : "none",
        }} />
        <span style={{ color: liveFpsColor, fontWeight: 700, minWidth: 26, textAlign: "right" }}>{fps}</span>
        <span style={{ color: DIM }}>fps</span>
        <span style={{ color: "#2a2a2a", margin: "0 1px" }}>|</span>
        <span style={{ color: "#444", fontSize: 9 }}>{targetFPS}↑</span>
        <span style={{ color: DIMMER, fontSize: 9 }}>{displayHz}Hz</span>
      </div>

      {/* ── Full booster panel ──────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            right:  posRef.current.r + 52,
            bottom: posRef.current.b + 28,
            zIndex: 99999,
            width:  290,
            background: "rgba(4,4,6,0.97)",
            border: "1px solid #1c1c1c",
            borderRadius: 12,
            padding: "12px 14px 14px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#a0a0a0",
            backdropFilter: "blur(20px)",
            boxShadow: "0 16px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(226,18,39,0.1)",
            userSelect: "none",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {/* ── Header ──────────────────────────────────────────── */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {layerWarn && <span style={{ color: YELLOW, fontSize: 8 }}>⚠ GPU LAYERS</span>}
              <button onClick={() => setOpen(false)} style={closeBtn}>×</button>
            </div>
          </div>

          {/* ── Speedometer ─────────────────────────────────────── */}
          <div style={{ background: "#090909", borderRadius: 8, padding: "8px 0 4px", marginBottom: 4 }}>
            <Speedometer fps={fps} target={targetFPS} nativeHz={displayHz} />
            <div style={{ textAlign: "center", marginTop: 2 }}>
              <span style={{ color: DIMMER, fontSize: 9 }}>reason: </span>
              <span style={{ color: "#444", fontSize: 9 }}>{reason}</span>
            </div>
          </div>

          {/* ── Hz selector ─────────────────────────────────────── */}
          <SectionLabel text="Target Frame Rate" />
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {HZ_OPTIONS.map(opt => {
              const active = hzMode === opt.fps;
              const unavail = opt.fps !== "auto" && typeof opt.fps === "number" && opt.fps > displayHz;
              return (
                <button
                  key={String(opt.fps)}
                  onClick={() => applyHzMode(opt.fps)}
                  disabled={unavail}
                  title={unavail ? `Screen supports up to ${displayHz} Hz` : ""}
                  style={{
                    flex: "1 0 auto",
                    background: active ? `${CYAN}18` : "transparent",
                    border: `1px solid ${active ? CYAN : unavail ? "#1a1a1a" : "#262626"}`,
                    color: active ? CYAN : unavail ? "#2a2a2a" : DIM,
                    borderRadius: 5, padding: "4px 2px",
                    fontSize: 9, cursor: unavail ? "not-allowed" : "pointer",
                    fontFamily: "monospace", fontWeight: 700,
                    transition: "all .15s",
                    minWidth: 30,
                    opacity: unavail ? 0.3 : 1,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ color: DIMMER, fontSize: 8, marginTop: 3 }}>
            {displayHz >= 144
              ? "144 Hz display detected — all options available"
              : displayHz >= 120
              ? "120 Hz display — 144 fps option disabled"
              : `${displayHz} Hz display — higher options auto-capped by browser`}
          </div>

          {/* ── Frame pipeline ──────────────────────────────────── */}
          <SectionLabel text="Frame Pipeline" />
          <PipelineBar pipeline={pipeline} />

          {/* ── Quality presets ─────────────────────────────────── */}
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

          {/* ── Feature toggles ─────────────────────────────────── */}
          <SectionLabel text="Feature Controls" />
          <Toggle label="Canvas backgrounds" value={!kills}    onChange={v => setKills(!v)}  color={CYAN}   />
          <Toggle label="Particle effects"   value={particles} onChange={setParticles}        color={VIOLET} />
          <Toggle label="Blur / glass"       value={blur}      onChange={setBlur}             color={CYAN}   />
          <Toggle label="Glow effects"       value={glow}      onChange={setGlow}             color={RED}    />

          {/* ── Battery ─────────────────────────────────────────── */}
          {batteryLevel !== null && (
            <>
              <SectionLabel text="Power" />
              <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: DIMMER, fontSize: 9 }}>{batteryCharging ? "Charging" : "Battery"}</span>
                  <span style={{
                    color: batteryCharging ? CYAN : batteryLevel > 50 ? GREEN : batteryLevel > 20 ? YELLOW : RED,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {batteryLevel}%{batteryCharging ? " CHARGING" : ""}
                  </span>
                </div>
                <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${batteryLevel}%`,
                    background: batteryCharging ? CYAN : batteryLevel > 50 ? GREEN : batteryLevel > 20 ? YELLOW : RED,
                    borderRadius: 2, transition: "width .4s",
                    boxShadow: batteryCharging ? `0 0 6px ${CYAN}88` : "none",
                  }} />
                </div>
              </div>
            </>
          )}

          {/* ── Web Vitals ──────────────────────────────────────── */}
          <SectionLabel text="Web Vitals" />
          <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
            <Vital label="LCP"  value={vitals.lcp?.value  ?? null} unit="ms" rating={vitals.lcp?.rating}  good="≤2500" />
            <Vital label="FCP"  value={vitals.fcp?.value  ?? null} unit="ms" rating={vitals.fcp?.rating}  good="≤1800" />
            <Vital label="CLS"  value={vitals.cls?.value  ?? null} unit=""   rating={vitals.cls?.rating}  good="≤0.1"  />
            <Vital label="INP"  value={vitals.inp?.value  ?? null} unit="ms" rating={vitals.inp?.rating}  good="≤200"  />
            <Vital label="TTFB" value={vitals.ttfb?.value ?? null} unit="ms" rating={vitals.ttfb?.rating} good="≤800"  />
            <div style={{ borderTop: "1px solid #161616", marginTop: 4, paddingTop: 4 }}>
              <Stat label="Long Tasks (>50ms)" value={`${vitals.longTasks}`}
                color={vitals.longTasks > 10 ? ORANGE : vitals.longTasks > 3 ? YELLOW : DIM} />
              <Stat label="Perf Score" value={vitals.score ? `${vitals.score}/100` : "measuring…"}
                color={scoreColor(vitals.score)} />
            </div>
          </div>

          {/* ── System info ─────────────────────────────────────── */}
          <SectionLabel text="System" />
          <div style={{ background: "#0a0a0c", borderRadius: 6, padding: "6px 8px" }}>
            <Stat label="Native Hz"    value={`${displayHz} Hz`}      color={displayHz >= 144 ? VIOLET : displayHz >= 120 ? CYAN : DIM} />
            <Stat label="Target FPS"   value={`${targetFPS} fps`}     color={liveFpsColor} />
            <Stat label="Live FPS"     value={`${fps} fps`}           color={liveFpsColor} />
            <Stat label="DPR (capped)" value={`${adaptState.dpr}×`}   color={CYAN} />
            <Stat label="CPU Cores"    value={`${cores} cores`}        color={DIM}  />
            <Stat label="Anim Level"   value={`${preset}/5`}          color={PRESETS.find(p => p.id === preset)?.color ?? DIM} />
          </div>

          {/* ── Action buttons ───────────────────────────────────── */}
          <SectionLabel text="Actions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {/* Force GC */}
            <button
              onClick={() => { try { (window as { gc?: () => void }).gc?.(); } catch {} }}
              style={{ ...btnStyle, color: DIM, borderColor: "#1f1f1f" }}
            >FORCE GC</button>

            {/* Reset all */}
            <button
              onClick={() => {
                animationController.clearOverride();
                setPreset(5); setKills(false); setBlur(true); setGlow(true); setParticles(true);
                adaptiveFPS.releaseOverride(); setHzMode("auto");
              }}
              style={{ ...btnStyle, color: CYAN, borderColor: `${CYAN}33` }}
            >RESET ALL</button>

            {/* Low power */}
            <button
              onClick={() => { applyPreset(1); adaptiveFPS.forceLowPower(); applyHzMode(15); }}
              style={{ ...btnStyle, color: ORANGE, borderColor: `${ORANGE}33` }}
            >LOW POWER</button>

            {/* Max perf: 144Hz + Ultra */}
            <button
              onClick={() => {
                applyPreset(5);
                const maxFPS = (Math.min(displayHz, 144) >= 120 ? Math.min(displayHz, 144) : 60) as FPSTarget;
                adaptiveFPS.forceTargetFPS(maxFPS);
                setHzMode(maxFPS);
              }}
              style={{ ...btnStyle, color: GREEN, borderColor: `${GREEN}33`, fontWeight: 700 }}
            >MAX PERF</button>

            {/* Force 144 */}
            <button
              onClick={() => { adaptiveFPS.forceTargetFPS(144); setHzMode(144); }}
              style={{ ...btnStyle, color: VIOLET, borderColor: `${VIOLET}33`, gridColumn: "1 / -1" }}
            >FORCE 144 FPS (override battery / thermal)</button>
          </div>

          <div style={{ marginTop: 10, color: DIMMER, fontSize: 8, textAlign: "center" }}>
            Ctrl+Shift+B to toggle · Ctrl+Shift+P for raw HUD
          </div>
        </div>
      )}
    </>
  );
}

const closeBtn: React.CSSProperties = {
  background: "none", border: "none", color: DIMMER, cursor: "pointer", fontSize: 14, padding: 0,
};

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
  color: "#666",
};
