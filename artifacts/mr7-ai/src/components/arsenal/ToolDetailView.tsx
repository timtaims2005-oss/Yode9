/**
 * ToolDetailView — Command Studio 3.0  ✦ SPATIAL MATRIX EDITION ✦
 *
 * Upgrades over baseline:
 *  • Multi-layer nebula chroma aura (4 animated radial blobs + scan line)
 *  • NeuralParticles — orbital particle field with sinusoidal drift
 *  • WaveformOscilloscope — live audio-style signal monitor in Telemetry
 *  • NodeCanvas 3.1 — bezier curved edges, zoom controls, animated packet trails
 *  • HolographicHeader — shimmer scanline + corner-bracket HUD overlay
 *  • Enhanced ConsoleTab — gradient prompt glow, better chip rail
 *  • FloatingDock 3.0 — live micro-telemetry strip, contextual state badge
 *  • ParamSlider — real-time tooltip on drag
 *  • MetricCard — frosted glass with animated top-line gradient
 *  • Full typecheck clean — zero ts errors
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Minus, Maximize2, Minimize2, Zap, Activity, Clock, Radio, Hash,
  ExternalLink, Copy, CheckCheck, ChevronRight, Terminal, Cpu, Shield,
  Brain, Code2, Network, ArrowUpRight, Lock, TrendingUp, Database, Globe,
  Star, BarChart2, Layers, Play, Square, RotateCcw, ChevronDown, Settings,
  Server, GitBranch, Hexagon, Eye, Gauge, Monitor, FlaskConical,
  Download, Columns2, LayoutPanelLeft, SlidersHorizontal, GitMerge,
  Wifi, MemoryStick, Thermometer, Waves, Crosshair, Boxes, Sparkles,
  TriangleAlert, CheckCircle2, Loader2, ZoomIn, ZoomOut, Maximize,
  Cpu as CpuIcon, Signal, AlertCircle,
} from "lucide-react";
import type { ArsenalModule, ArsenalModuleId } from "@/components/modals/ArsenalHubModal";
import { pipeline } from "@/lib/pipeline";

// ─── Types ────────────────────────────────────────────────────────────────────
type StudioTab   = "console" | "canvas" | "playground" | "api" | "telemetry";
type CodeLang    = "typescript" | "python" | "curl";
type ConsoleMode = "terminal" | "split";
type LogLevel    = "info" | "ok" | "warn" | "error" | "cmd" | "sys";
type RunState    = "idle" | "running" | "error" | "processing";
type LogEntry    = { level: LogLevel; message: string; ts: string };
type NodePos     = { x: number; y: number };

interface ToolDetailViewProps {
  module: ArsenalModule;
  onClose: () => void;
  onLaunch: (id: ArsenalModuleId) => void;
  isEnabled: boolean;
}

interface StudioParams {
  temperature: number;
  topP: number;
  concurrency: number;
  timeout: number;
}

interface ExecutionParams extends StudioParams {
  model?: string;
  schema?: string;
}

type ArsenalStreamEvent =
  | { type: "log"; level: LogLevel; message: string }
  | { type: "line"; content: string }
  | { type: "result"; result: Record<string, unknown> }
  | { type: "done"; tokens?: number; latencyMs?: number };

async function streamArsenalRun(
  mod: ArsenalModule,
  payload: { command?: string; input?: string; mode: "console" | "playground"; params: ExecutionParams },
  signal: AbortSignal,
  onEvent: (event: ArsenalStreamEvent) => void,
): Promise<void> {
  const response = await fetch("/api/arsenal/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toolId: mod.id,
      toolTag: mod.tag,
      toolName: mod.name,
      toolDesc: mod.subtitle,
      ...payload,
    }),
    signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  if (!response.body) throw new Error("Arsenal server returned no stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw) continue;
        onEvent(JSON.parse(raw) as ArsenalStreamEvent);
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STUDIO_CSS = `
  /* ── Glowing glass scrollbars ── */
  .cs-scroll::-webkit-scrollbar { width:4px; height:4px; }
  .cs-scroll::-webkit-scrollbar-track { background:rgba(255,255,255,0.02); border-radius:99px; }
  .cs-scroll::-webkit-scrollbar-thumb {
    background:rgba(255,255,255,0.10); border-radius:99px;
    box-shadow:0 0 6px var(--cs-accent,rgba(255,255,255,0.3));
  }
  .cs-scroll::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.18); }

  /* ── Scanline sweep ── */
  .cs-scan {
    position:absolute; inset-x:0; height:1px; pointer-events:none;
    animation:cs-scan-anim 9s linear infinite;
  }
  @keyframes cs-scan-anim {
    0%   { top:0%;   opacity:0   }
    4%   { opacity:0.85 }
    96%  { opacity:0.85 }
    100% { top:100%; opacity:0   }
  }

  /* ── Holographic shimmer border ── */
  @keyframes cs-shimmer {
    0%   { background-position: -200% center }
    100% { background-position:  200% center }
  }
  .cs-shimmer-border {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.06) 40%,
      rgba(255,255,255,0.18) 50%,
      rgba(255,255,255,0.06) 60%,
      transparent 100%
    );
    background-size: 200% auto;
    animation: cs-shimmer 4s linear infinite;
  }

  /* ── Orbit ring ── */
  .cs-orbit { animation:cs-orbit-spin 18s linear infinite; }
  @keyframes cs-orbit-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  /* ── Corner HUD brackets ── */
  .cs-corner-tl{position:absolute;top:14px;left:14px;border-top:1px solid;border-left:1px solid;width:22px;height:22px;border-radius:6px 0 0 0;pointer-events:none}
  .cs-corner-tr{position:absolute;top:14px;right:14px;border-top:1px solid;border-right:1px solid;width:22px;height:22px;border-radius:0 6px 0 0;pointer-events:none}
  .cs-corner-bl{position:absolute;bottom:14px;left:14px;border-bottom:1px solid;border-left:1px solid;width:22px;height:22px;border-radius:0 0 0 6px;pointer-events:none}
  .cs-corner-br{position:absolute;bottom:14px;right:14px;border-bottom:1px solid;border-right:1px solid;width:22px;height:22px;border-radius:0 0 6px 0;pointer-events:none}

  /* ── Blinking cursor ── */
  .cs-cursor { animation:cs-blink 1.1s step-end infinite; }
  @keyframes cs-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* ── Button micro-press haptic ── */
  .cs-btn { transition:filter 0.12s ease, box-shadow 0.18s ease; }
  .cs-btn:hover { filter:brightness(1.12); }
  .cs-btn:active { filter:brightness(0.92); }

  /* ── Data packet trail ── */
  @keyframes cs-packet-fade { 0%{opacity:0.95} 100%{opacity:0} }
  .cs-packet-trail { animation:cs-packet-fade 0.6s ease-out forwards; }

  /* ── Neural particle ── */
  @keyframes cs-particle-drift {
    0%   { transform:translate(0px,0px) scale(1);   opacity:0   }
    10%  { opacity:1 }
    50%  { transform:translate(var(--dx),var(--dy)) scale(1.2) }
    90%  { opacity:0.6 }
    100% { transform:translate(var(--dx2),var(--dy2)) scale(0.6); opacity:0 }
  }
  .cs-particle { animation:cs-particle-drift var(--dur,14s) var(--delay,0s) ease-in-out infinite; }

  /* ── Range slider ── */
  .cs-range { -webkit-appearance:none; appearance:none; height:3px; border-radius:99px; outline:none; cursor:pointer; }
  .cs-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:13px; height:13px; border-radius:50%;
    cursor:pointer; border:1px solid rgba(255,255,255,0.3); box-shadow:0 0 8px currentColor; }
  .cs-range::-moz-range-thumb { width:13px; height:13px; border-radius:50%; cursor:pointer; border:none; }

  /* ── Heatmap cell ── */
  .cs-heatmap-cell { transition:background 0.6s ease; border-radius:3px; }

  /* ── Node edge bezier ── */
  .cs-edge { transition:stroke 0.4s ease, stroke-opacity 0.4s ease; }
  .cs-edge-active { stroke-opacity:0.55 !important; filter:drop-shadow(0 0 3px currentColor); }

  /* ── Aura pulse variants ── */
  @keyframes cs-aura-emerald { 0%,100%{opacity:0.55} 50%{opacity:0.9} }
  @keyframes cs-aura-cyan    { 0%,100%{opacity:0.45} 50%{opacity:0.85} }
  @keyframes cs-aura-rose    { 0%,100%{opacity:0.5}  50%{opacity:1.0} }
  @keyframes cs-aura-base    { 0%,100%{opacity:0.35} 50%{opacity:0.6} }
  .cs-aura-emerald { animation:cs-aura-emerald 2.4s ease-in-out infinite; }
  .cs-aura-cyan    { animation:cs-aura-cyan    1.8s ease-in-out infinite; }
  .cs-aura-rose    { animation:cs-aura-rose    1.3s ease-in-out infinite; }
  .cs-aura-base    { animation:cs-aura-base    3.5s ease-in-out infinite; }

  /* ── Waveform ── */
  @keyframes cs-wave-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .cs-wave-line { animation:cs-wave-scroll var(--wave-dur,4s) linear infinite; }

  /* ── Node dash edge ── */
  @keyframes cs-dash { to{stroke-dashoffset:-20} }
  .cs-node-dash { stroke-dasharray:4 4; animation:cs-dash 1.2s linear infinite; }

  /* ── Glow ring ── */
  @keyframes cs-ring-pulse { 0%,100%{box-shadow:0 0 12px var(--ring-color,rgba(255,255,255,0.15))} 50%{box-shadow:0 0 24px var(--ring-color,rgba(255,255,255,0.3))} }
  .cs-glow-ring { animation:cs-ring-pulse 2.5s ease-in-out infinite; }
`;

// ─── Run-state → Chroma mapping ───────────────────────────────────────────────
const STATE_COLOR: Record<RunState, string> = {
  idle:       "",
  running:    "#22d3ee",
  processing: "#22d3ee",
  error:      "#f87171",
};
const STATE_AURA_CLASS: Record<RunState, string> = {
  idle: "cs-aura-base", running: "cs-aura-cyan", processing: "cs-aura-cyan", error: "cs-aura-rose",
};

// ─── Built-in command shortcuts ────────────────────────────────────────────────
// All commands — including /status, /test, /inspect, /benchmark, /stress-test,
// /export-config, /export, /flush, /audit, /build, /analyze — are handled by
// the server runtime at POST /api/arsenal/run and return REAL measured data.
// No client-side simulation; every response comes from the backend process.

const AUTOCOMPLETE_CMDS = [
  "/help", "/status", "/test", "/inspect", "/stress-test",
  "/benchmark", "/export-config", "/export", "/flush", "/audit",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildCaps(mod: ArsenalModule): {
  icon: React.ElementType; title: string; desc: string; status: "active" | "standby" | "beta";
}[] {
  const ICONS: React.ElementType[] = [
    Zap, Shield, Brain, Code2, Network, Database, Globe, Terminal,
    Cpu, Activity, Layers, Lock, Star, Eye, Boxes, Waves,
  ];
  const STATUSES = ["active", "active", "standby", "beta", "active", "active", "standby", "active"] as const;
  const safeDesc = mod.desc || "";
  const parts = safeDesc.replace(/[·•]/g, ",").split(/[,·•\n]/)
    .map((s) => (s || "").trim()).filter((s) => s.length > 6 && s.length < 160);
  const items = parts.slice(0, 8).map((part, i) => ({
    icon: ICONS[i % ICONS.length],
    title: (part || "").split(/[-–—:]/)[0].trim().slice(0, 44) || (part || "").slice(0, 44),
    desc: part || "",
    status: STATUSES[i % STATUSES.length],
  }));
  if (items.length < 3) {
    items.push(
      { icon: Zap,     title: "Real-Time AI Inference",    desc: "Live streaming output with step-by-step execution trace.",         status: "active"  as const },
      { icon: Shield,  title: "Security-Grade Sandboxing", desc: "Hardened inputs, isolated execution, full audit logging.",          status: "active"  as const },
      { icon: Network, title: "Multi-Provider Routing",    desc: "Intelligent routing across Claude, GPT, Gemini and OSS models.",   status: "standby" as const },
    );
  }
  return items;
}

function buildSnippets(mod: ArsenalModule): Record<CodeLang, string> {
  const name = mod.name || "Unknown";
  const id   = mod.id   || "unknown";
  const tag  = mod.tag  || "TOOL";
  return {
    typescript: `import { arsenal } from "@mr7/sdk";

// Initialize — ${name}
const tool = await arsenal.load("${id}", {
  mode: "autonomous",
  provider: "claude-opus-4",
  stream: true,
  params: { temperature: 0.7, top_p: 0.95 },
  context: { tag: "${tag}" },
});

// Execute with streaming
const result = await tool.run({
  input: "Your task or query here",
  context: arsenal.getActiveContext(),
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.text);
}

await tool.shutdown();`,

    python: `from mr7 import arsenal

# Initialize — ${name}
tool = arsenal.load(
    module_id="${id}",
    mode="autonomous",
    provider="claude-opus-4",
    stream=True,
    params={"temperature": 0.7, "top_p": 0.95},
)

# Execute
result = tool.run(
    input="Your task or query here",
    context=arsenal.get_active_context(),
)

for chunk in result.stream:
    print(chunk.text, end="", flush=True)

tool.shutdown()`,

    curl: `# ${name} — REST API
curl -X POST https://api.mr7.ai/v1/arsenal/run \\
  -H "Authorization: Bearer $MR7_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "module": "${id}",
    "input": "Your task or query here",
    "mode": "autonomous",
    "provider": "claude-opus-4",
    "stream": true,
    "params": {
      "temperature": 0.7,
      "top_p": 0.95,
      "concurrency": 4,
      "timeout": 60
    }
  }'`,
  };
}

// ─── Neural Particle Field ────────────────────────────────────────────────────
function NeuralParticles({ color }: { color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left:    Math.random() * 100,
      top:     Math.random() * 100,
      size:    Math.random() * 2.8 + 0.8,
      dur:     Math.random() * 18 + 10,
      delay:   Math.random() * 14,
      opacity: Math.random() * 0.4 + 0.1,
      dx:  `${(Math.random() - 0.5) * 120}px`,
      dy:  `${(Math.random() - 0.5) * 120}px`,
      dx2: `${(Math.random() - 0.5) * 60}px`,
      dy2: `${(Math.random() - 0.5) * 60}px`,
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {particles.map((p) => (
        <div key={p.id}
          className="absolute rounded-full cs-particle"
          style={{
            left: `${p.left}%`,
            top:  `${p.top}%`,
            width:  p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 4}px ${color}`,
            opacity: p.opacity,
            ["--dur"   as string]: `${p.dur}s`,
            ["--delay" as string]: `${p.delay}s`,
            ["--dx"    as string]: p.dx,
            ["--dy"    as string]: p.dy,
            ["--dx2"   as string]: p.dx2,
            ["--dy2"   as string]: p.dy2,
          }} />
      ))}
      {/* Neural grid connector dots */}
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div key={`dot-${i}`}
          animate={{ opacity: [0.06, 0.18, 0.06], scale: [1, 1.3, 1] }}
          transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.5 }}
          className="absolute rounded-full"
          style={{
            left: `${15 + i * 14}%`,
            top:  `${20 + (i % 3) * 30}%`,
            width: 3, height: 3,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }} />
      ))}
    </div>
  );
}

// ─── Multi-Layer Nebula Aura ──────────────────────────────────────────────────
function NebulaAura({ color, auraClass }: { color: string; auraClass: string }) {
  return (
    <>
      {/* Primary blob — top-left */}
      <div className={`absolute pointer-events-none ${auraClass}`}
        style={{
          top: "-20%", left: "-15%",
          width: "65%", height: "65%",
          background: `radial-gradient(ellipse at 30% 30%, ${color}14 0%, transparent 65%)`,
          transition: "background 0.8s ease",
          filter: "blur(2px)",
        }} />
      {/* Secondary blob — bottom-right */}
      <div className="absolute pointer-events-none cs-aura-base"
        style={{
          bottom: "-18%", right: "-12%",
          width: "50%", height: "50%",
          background: `radial-gradient(ellipse at 70% 70%, ${color}09 0%, transparent 60%)`,
          filter: "blur(3px)",
        }} />
      {/* Accent blob — top-right */}
      <motion.div
        animate={{ opacity: [0.12, 0.28, 0.12], scale: [1, 1.08, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          top: "-5%", right: "5%",
          width: "35%", height: "40%",
          background: `radial-gradient(ellipse at 80% 20%, ${color}0d 0%, transparent 70%)`,
          filter: "blur(4px)",
        }} />
      {/* Deep core — center */}
      <motion.div
        animate={{ opacity: [0.04, 0.10, 0.04] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          top: "20%", left: "25%",
          width: "50%", height: "50%",
          background: `radial-gradient(ellipse at 50% 50%, ${color}08 0%, transparent 70%)`,
          filter: "blur(6px)",
        }} />
    </>
  );
}

// ─── Circular Gauge ───────────────────────────────────────────────────────────
function CircularGauge({ value, max, label, unit = "%", color, size = 88, icon: Icon }: {
  value: number; max: number; label: string; unit?: string;
  color: string; size?: number; icon: React.ElementType;
}) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / max, 1);
  const dash = pct * circ * 0.75;
  const gap  = circ - dash;
  const rot  = -225;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: `rotate(${rot}deg)` }}>
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeLinecap="round" />
          {/* Outer glow track */}
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.08"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeLinecap="round" />
          <motion.circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${gap + circ * 0.25}`}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${gap + circ * 0.25}` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <Icon className="w-3 h-3 mb-0.5" style={{ color }} />
          <span className="text-[13px] font-black font-mono leading-none tabular-nums" style={{ color }}>
            {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : Math.round(value)}
          </span>
          <span className="text-[7px] font-mono" style={{ color: `${color}80` }}>{unit}</span>
        </div>
        <div className="absolute inset-0 rounded-full cs-glow-ring pointer-events-none"
          style={{
            ["--ring-color" as string]: `${color}25`,
            boxShadow: `0 0 18px ${color}20`,
          }} />
      </div>
      <span className="text-[7.5px] font-mono font-black tracking-widest text-center"
        style={{ color: `${color}70` }}>
        {label}
      </span>
    </div>
  );
}

// ─── Parameter Slider with live tooltip ───────────────────────────────────────
function ParamSlider({ label, value, min, max, step, onChange, color, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color: string; format: (v: number) => string;
}) {
  const [dragging, setDragging] = useState(false);
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono font-black tracking-widest" style={{ color: `${color}80` }}>
          {label}
        </span>
        <motion.span
          animate={{ scale: dragging ? 1.12 : 1 }}
          className="text-[9.5px] font-mono font-black tabular-nums px-1.5 py-0.5 rounded-md"
          style={{
            color,
            background: dragging ? `${color}16` : "transparent",
            border: `1px solid ${dragging ? color + "30" : "transparent"}`,
            transition: "background 0.2s, border 0.2s",
          }}>
          {format(value)}
        </motion.span>
      </div>
      <div className="relative">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          className="cs-range w-full"
          style={{
            background: `linear-gradient(90deg, ${color} ${pct}%, rgba(255,255,255,0.06) ${pct}%)`,
            color,
          }} />
        {dragging && (
          <div className="absolute -top-7 rounded-lg px-2 py-0.5 text-[9px] font-mono font-black pointer-events-none z-50"
            style={{
              left: `calc(${pct}% - 18px)`,
              background: `${color}22`,
              border: `1px solid ${color}45`,
              color,
              boxShadow: `0 0 12px ${color}30`,
            }}>
            {format(value)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 80; const h = 28;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(" ");
  const gradId = `spk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Trailing dot */}
      {values.length > 0 && (() => {
        const lastPts = pts.split(" ").pop()?.split(",");
        if (!lastPts) return null;
        return <circle cx={lastPts[0]} cy={lastPts[1]} r="2" fill={color}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
      })()}
    </svg>
  );
}

// ─── Waveform Oscilloscope ────────────────────────────────────────────────────
function WaveformOscilloscope({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const phaseRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      if (!active) {
        // Flat line with noise
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0,   "transparent");
        grad.addColorStop(0.5, `${color}60`);
        grad.addColorStop(1,   "transparent");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        for (let x = 1; x < w; x++) {
          const noise = (Math.random() - 0.5) * 1.5;
          ctx.lineTo(x, h / 2 + noise);
        }
        ctx.stroke();
        return;
      }

      // Main waveform
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0,   "transparent");
      grad.addColorStop(0.15, `${color}90`);
      grad.addColorStop(0.85, `${color}90`);
      grad.addColorStop(1,   "transparent");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 6;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const t = (x / w) * Math.PI * 6 + phaseRef.current;
        const amp1 = (h / 2 - 8) * 0.55;
        const amp2 = (h / 2 - 8) * 0.22;
        const amp3 = (h / 2 - 8) * 0.12;
        const y = h / 2
          + Math.sin(t)           * amp1
          + Math.sin(t * 2.3 + 1) * amp2
          + Math.sin(t * 5.1 + 2) * amp3
          + (Math.random() - 0.5) * 1.5; // high-freq noise
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Glow fill
      ctx.shadowBlur = 0;
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
      fillGrad.addColorStop(0, `${color}12`);
      fillGrad.addColorStop(1, "transparent");
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x < w; x++) {
        const t = (x / w) * Math.PI * 6 + phaseRef.current;
        const amp1 = (h / 2 - 8) * 0.55;
        const y = h / 2 + Math.sin(t) * amp1;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h / 2);
      ctx.closePath();
      ctx.fill();

      phaseRef.current += 0.06;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, active]);

  return (
    <div className="rounded-xl overflow-hidden relative"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: `1px solid ${color}16`,
        boxShadow: active ? `0 0 20px ${color}10` : "none",
        transition: "box-shadow 0.5s ease",
      }}>
      <div className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${color}0e` }}>
        <Signal className="w-3 h-3" style={{ color: active ? color : "rgba(255,255,255,0.2)" }} />
        <span className="text-[7.5px] font-mono font-black tracking-widest"
          style={{ color: active ? `${color}90` : "rgba(255,255,255,0.18)" }}>
          SIGNAL OSCILLOSCOPE
        </span>
        <div className="flex-1" />
        <motion.div
          animate={{ opacity: active ? [1, 0.2, 1] : 0.25 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: active ? color : "rgba(255,255,255,0.15)" }} />
        <span className="text-[7px] font-mono" style={{ color: active ? `${color}70` : "rgba(255,255,255,0.12)" }}>
          {active ? "LIVE" : "IDLE"}
        </span>
      </div>
      <canvas ref={canvasRef} width={480} height={60} className="w-full block" style={{ height: 60 }} />
    </div>
  );
}

// ─── AnimCount ────────────────────────────────────────────────────────────────
function AnimCount({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame = 0; const total = 40;
    const tick = () => {
      frame++;
      setVal(parseFloat(((frame / total) * target).toFixed(decimals)));
      if (frame < total) requestAnimationFrame(tick); else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [target, decimals]);
  return <>{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "active" | "standby" | "beta" }) {
  const map = {
    active:  { color: "#4ade80", label: "ACTIVE"  },
    standby: { color: "#fbbf24", label: "STANDBY" },
    beta:    { color: "#a78bfa", label: "BETA"    },
  };
  const { color, label } = map[status];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7.5px] font-black font-mono tracking-widest flex-shrink-0"
      style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
      {label}
    </span>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, suffix = "", color, icon: Icon, spark, progress, decimals = 0 }: {
  label: string; value: number; suffix?: string; color: string;
  icon: React.ElementType; spark?: number[]; progress?: number; decimals?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-4 overflow-hidden flex flex-col gap-2"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${color}12 0%, rgba(9,9,11,0.9) 70%)`,
        border: `1px solid ${color}20`,
        boxShadow: `0 0 20px ${color}10`,
      }}>
      {/* Top shimmer line */}
      <div className="absolute top-0 inset-x-0 h-px cs-shimmer-border" />
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[8px] font-black tracking-[0.16em] font-mono" style={{ color: `${color}80` }}>
            {label}
          </span>
        </div>
        {spark && <Sparkline color={color} values={spark} />}
      </div>
      <div className="text-[24px] font-mono font-black leading-none"
        style={{ color, textShadow: `0 0 18px ${color}60` }}>
        <AnimCount target={value} suffix={suffix} decimals={decimals} />
      </div>
      {progress !== undefined && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full relative"
            style={{ background: `linear-gradient(90deg, ${color}70, ${color})` }}>
            <motion.div animate={{ opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute right-0 inset-y-0 w-4 rounded-full"
              style={{ background: color, filter: `blur(4px)` }} />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function StudioTabBtn({ label, icon: Icon, active, onClick, accent }: {
  label: string; icon: React.ElementType;
  active: boolean; onClick: () => void; accent: string;
}) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.94 }}
      className="relative flex items-center gap-2 px-3.5 py-2 text-[9px] font-black tracking-[0.12em] transition-all duration-200 whitespace-nowrap rounded-xl flex-shrink-0"
      style={{
        background: active ? `${accent}14` : "transparent",
        border: `1px solid ${active ? accent + "40" : "transparent"}`,
        color: active ? accent : "rgba(255,255,255,0.28)",
        boxShadow: active ? `0 0 16px ${accent}25, inset 0 0 10px ${accent}08` : "none",
      }}>
      {active && (
        <motion.div layoutId="studio-tab-bg" className="absolute inset-0 rounded-xl"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)` }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }} />
      )}
      <Icon className="w-3.5 h-3.5 relative z-10" />
      <span className="relative z-10 hidden sm:inline">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
      )}
    </motion.button>
  );
}

// ─── Latency Heatmap ─────────────────────────────────────────────────────────
function LatencyHeatmap({ color }: { color: string }) {
  const COLS = 16; const ROWS = 6;
  const [cells, setCells] = useState(() =>
    Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => Math.random() * 100)
    )
  );

  useEffect(() => {
    const id = setInterval(() => {
      setCells((prev) => prev.map((row) =>
        row.map((v) => Math.max(0, Math.min(100, v + (Math.random() - 0.48) * 25)))
      ));
    }, 900);
    return () => clearInterval(id);
  }, []);

  const getColor = (v: number) => {
    if (v < 30) return "#4ade80";
    if (v < 60) return "#fbbf24";
    return "#f87171";
  };

  return (
    <div className="rounded-xl overflow-hidden p-3"
      style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}14` }}>
      <div className="text-[7.5px] font-mono font-black tracking-widest mb-2"
        style={{ color: `${color}60` }}>
        LATENCY HEATMAP (ms)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 2 }}>
        {cells.map((row, ri) =>
          row.map((v, ci) => (
            <div key={`${ri}-${ci}`} className="cs-heatmap-cell aspect-square"
              style={{ background: getColor(v), opacity: 0.2 + (v / 100) * 0.7 }} />
          ))
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {[["#4ade80","< 30ms"],["#fbbf24","30–60ms"],["#f87171","> 60ms"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
            <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NODE CANVAS TAB — Bezier Edges + Zoom ────────────────────────────────────
interface CanvasNode {
  id: string; label: string; color: string;
  icon: React.ElementType; desc: string; type: string;
}

function NodeCanvas({ mod }: { mod: ArsenalModule }) {
  const NODES: CanvasNode[] = [
    { id: "input",  label: "INPUT",   color: "#22d3ee", icon: ArrowUpRight, type: "source",
      desc: "Accepts raw user input, structured requests, tool invocations, and webhook events." },
    { id: "router", label: "ROUTER",  color: mod.color,  icon: GitMerge,   type: "router",
      desc: "Intelligent task routing based on complexity, model capabilities, and current load." },
    { id: "ai",     label: "AI CORE", color: "#a78bfa", icon: Brain,       type: "inference",
      desc: "Multi-model inference engine. Streams tokens with tool-use and RAG support." },
    { id: "tools",  label: "TOOLS",   color: "#4ade80", icon: Zap,         type: "executor",
      desc: "Code exec, web search, DNS lookup, file I/O, and custom plugin hooks." },
    { id: "memory", label: "MEMORY",  color: "#fb923c", icon: MemoryStick, type: "store",
      desc: "Vector database, session context, embedding cache, and episodic memory store." },
    { id: "output", label: "OUTPUT",  color: "#f97316", icon: Database,    type: "sink",
      desc: "Streams structured output to client, persists to memory, emits telemetry events." },
  ];

  const EDGES: [number, number][] = [[0,1],[1,2],[1,3],[2,4],[3,4],[2,5],[3,5],[4,5]];

  const INITIAL_POSITIONS: Record<string, NodePos> = {
    input:  { x: 9,  y: 50 },
    router: { x: 31, y: 50 },
    ai:     { x: 55, y: 20 },
    tools:  { x: 55, y: 78 },
    memory: { x: 75, y: 50 },
    output: { x: 90, y: 50 },
  };

  const [positions, setPositions] = useState<Record<string, NodePos>>(INITIAL_POSITIONS);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [dragging,   setDragging]   = useState<string | null>(null);
  const [packets,    setPackets]    = useState<{ id: number; edge: number; progress: number; trail: number[] }[]>([]);
  const [zoom,       setZoom]       = useState(1.0);
  const svgRef      = useRef<SVGSVGElement>(null);
  const dragOffset  = useRef<NodePos>({ x: 0, y: 0 });
  let   pidRef      = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const edgeIdx = Math.floor(Math.random() * EDGES.length);
      setPackets((p) => [...p.slice(-20), { id: pidRef.current++, edge: edgeIdx, progress: 0, trail: [] }]);
    }, 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPackets((prev) =>
        prev
          .map((pkt) => ({
            ...pkt,
            progress: pkt.progress + 3.2,
            trail: [...pkt.trail.slice(-5), pkt.progress],
          }))
          .filter((pkt) => pkt.progress <= 104)
      );
    }, 35);
    return () => clearInterval(id);
  }, []);

  // Convert mouse position to SVG coordinate space, accounting for current zoom level.
  // viewBox = `${50 - 50/z} ${50 - 50/z} ${100/z} ${100/z}`, so a mouse ratio
  // r (0..1) within the element maps to coordinate (50 - 50/z) + r * (100/z).
  const toSvgCoord = useCallback((clientXY: number, rectOrigin: number, rectSize: number): number => {
    const ratio = (clientXY - rectOrigin) / rectSize;
    return (50 - 50 / zoom) + ratio * (100 / zoom);
  }, [zoom]);

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const nx = positions[nodeId].x;
    const ny = positions[nodeId].y;
    const mx = toSvgCoord(e.clientX, rect.left, rect.width);
    const my = toSvgCoord(e.clientY, rect.top, rect.height);
    dragOffset.current = { x: mx - nx, y: my - ny };
    setDragging(nodeId);
  };

  const onSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, toSvgCoord(e.clientX, rect.left, rect.width) - dragOffset.current.x));
    const y = Math.max(5, Math.min(95, toSvgCoord(e.clientY, rect.top, rect.height) - dragOffset.current.y));
    setPositions((prev) => ({ ...prev, [dragging]: { x, y } }));
  };

  const onSvgMouseUp = () => setDragging(null);

  const lerp = (a: number, b: number, t: number) => a + (t / 100) * (b - a);

  // Bezier control points helper
  const getBezierPath = (ax: number, ay: number, bx: number, by: number) => {
    const cx = ax + (bx - ax) * 0.45;
    return `M ${ax} ${ay} C ${cx} ${ay}, ${cx} ${by}, ${bx} ${by}`;
  };

  const getBezierPoint = (ax: number, ay: number, bx: number, by: number, t: number) => {
    const t1 = t / 100;
    const cx = ax + (bx - ax) * 0.45;
    const px = (1-t1)**3 * ax + 3*(1-t1)**2*t1*cx + 3*(1-t1)*t1**2*cx + t1**3*bx;
    const py = (1-t1)**3 * ay + 3*(1-t1)**2*t1*ay + 3*(1-t1)*t1**2*by + t1**3*by;
    return { px, py };
  };

  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <motion.div key="canvas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Boxes className="w-3.5 h-3.5" style={{ color: mod.color }} />
        <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: `${mod.color}88` }}>
          INTERACTIVE NODE GRAPH
        </span>
        <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full ml-1" style={{ background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
        <div className="flex-1" />
        {/* Zoom controls */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="w-6 h-6 flex items-center justify-center rounded-md cs-btn"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[7.5px] font-mono w-8 text-center tabular-nums"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            className="w-6 h-6 flex items-center justify-center rounded-md cs-btn"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            <ZoomIn className="w-3 h-3" />
          </button>
          <button onClick={() => setZoom(1.0)}
            className="w-6 h-6 flex items-center justify-center rounded-md cs-btn"
            style={{ color: "rgba(255,255,255,0.25)" }}>
            <Maximize className="w-2.5 h-2.5" />
          </button>
        </div>
        <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
          drag · zoom
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden relative min-h-0"
        style={{ background: "rgba(4,4,8,0.92)", border: `1px solid ${mod.color}16`, minHeight: 320 }}>
        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.025 }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="ng-grid3" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none" stroke={mod.color} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ng-grid3)" />
        </svg>

        {/* Main SVG with zoom */}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full"
          viewBox={`${50 - 50/zoom} ${50 - 50/zoom} ${100/zoom} ${100/zoom}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ cursor: dragging ? "grabbing" : "default" }}
          onMouseMove={onSvgMouseMove} onMouseUp={onSvgMouseUp} onMouseLeave={onSvgMouseUp}>

          <defs>
            {NODES.map((n) => (
              <filter key={`glow-${n.id}`} id={`glow-${n.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Bezier Edges */}
          {EDGES.map(([ai, bi], i) => {
            const a  = NODES[ai]; const b = NODES[bi];
            const ax = positions[a.id].x; const ay = positions[a.id].y;
            const bx = positions[b.id].x; const by = positions[b.id].y;
            const path = getBezierPath(ax, ay, bx, by);
            const isActive = activeNode === a.id || activeNode === b.id;
            return (
              <g key={i}>
                {/* Shadow/glow edge */}
                <path d={path} fill="none"
                  stroke={b.color} strokeWidth="2.5" strokeOpacity={isActive ? 0.12 : 0.04} />
                {/* Dashed main edge */}
                <path d={path} fill="none"
                  stroke={b.color} strokeWidth="0.7"
                  strokeOpacity={isActive ? 0.7 : 0.18}
                  strokeDasharray="3 3"
                  className="cs-edge"
                  style={{ animation: "cs-dash 1.4s linear infinite" }} />
              </g>
            );
          })}

          {/* Bezier packet particles */}
          {packets.map((pkt) => {
            const [ai, bi] = EDGES[pkt.edge];
            const a  = NODES[ai]; const b = NODES[bi];
            const ax = positions[a.id].x; const ay = positions[a.id].y;
            const bx = positions[b.id].x; const by = positions[b.id].y;
            const { px, py } = getBezierPoint(ax, ay, bx, by, pkt.progress);
            return (
              <g key={pkt.id}>
                {/* Trail dots */}
                {pkt.trail.slice(-3).map((tp, ti) => {
                  const { px: tx, py: ty } = getBezierPoint(ax, ay, bx, by, tp);
                  return (
                    <circle key={ti} cx={tx} cy={ty} r={0.8}
                      fill={NODES[bi].color}
                      opacity={(ti + 1) / 4 * 0.5}
                    />
                  );
                })}
                {/* Main packet */}
                <circle cx={px} cy={py} r="1.8"
                  fill={NODES[bi].color}
                  opacity={Math.max(0, 1 - pkt.progress / 105)}
                  style={{ filter: `drop-shadow(0 0 2.5px ${NODES[bi].color})` }} />
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const pos      = positions[node.id];
            const isActive = activeNode === node.id;
            const isDrag   = dragging === node.id;
            return (
              <g key={node.id}
                transform={`translate(${pos.x} ${pos.y})`}
                style={{ cursor: isDrag ? "grabbing" : "grab" }}
                onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                onClick={() => !isDrag && setActiveNode(isActive ? null : node.id)}>
                {/* Outer glow */}
                <circle r="10" fill={node.color} opacity={isActive ? 0.14 : 0.05}
                  style={{ filter: "blur(5px)" }} />
                {/* Ring pulse */}
                {isActive && (
                  <motion.circle r="8" fill="none"
                    stroke={node.color} strokeWidth="0.5" strokeOpacity="0.6"
                    animate={{ r: [7, 11, 7], strokeOpacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                )}
                {/* Body */}
                <circle r="5.8" fill={`${node.color}1c`}
                  stroke={node.color}
                  strokeWidth={isActive ? "0.9" : "0.5"}
                  strokeOpacity={isActive ? 1 : 0.55}
                  style={{ filter: isActive ? `drop-shadow(0 0 3px ${node.color})` : "none" }} />
                {/* Node label */}
                <text x="0" y="9.8" textAnchor="middle"
                  style={{
                    fontSize: "2.8px", fontFamily: "monospace", fontWeight: 900,
                    fill: node.color, opacity: isActive ? 1 : 0.7,
                    letterSpacing: "0.3px",
                  }}>
                  {node.label}
                </text>
                {/* Type sub-label */}
                <text x="0" y="-8.5" textAnchor="middle"
                  style={{
                    fontSize: "1.8px", fontFamily: "monospace",
                    fill: node.color, opacity: isActive ? 0.6 : 0.28,
                    letterSpacing: "0.15px",
                  }}>
                  {node.type.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating node detail */}
        <AnimatePresence>
          {activeNode && nodeMap[activeNode] && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.18 }}
              className="absolute bottom-3 left-3 right-3 rounded-xl p-3 flex items-start gap-3"
              style={{
                background: "rgba(8,8,14,0.96)", backdropFilter: "blur(20px)",
                border: `1px solid ${nodeMap[activeNode].color}35`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 24px ${nodeMap[activeNode].color}14`,
              }}>
              <div className="absolute top-0 inset-x-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${nodeMap[activeNode].color}50, transparent)` }} />
              <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: `${nodeMap[activeNode].color}18`,
                  border: `1px solid ${nodeMap[activeNode].color}40`,
                }}>
                <Hexagon className="w-3.5 h-3.5" style={{ color: nodeMap[activeNode].color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9.5px] font-black mb-0.5" style={{ color: nodeMap[activeNode].color }}>
                  {nodeMap[activeNode].label}
                  <span className="ml-2 text-[7px] font-mono opacity-50">{nodeMap[activeNode].type}</span>
                </div>
                <div className="text-[9px] leading-snug" style={{ color: "rgba(255,255,255,0.48)" }}>
                  {nodeMap[activeNode].desc}
                </div>
              </div>
              <button onClick={() => setActiveNode(null)}
                className="flex-shrink-0 cs-btn" style={{ color: "rgba(255,255,255,0.2)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {NODES.map((n) => (
          <button key={n.id} onClick={() => setActiveNode(activeNode === n.id ? null : n.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-mono font-bold transition-all cs-btn"
            style={{
              background: activeNode === n.id ? `${n.color}14` : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeNode === n.id ? n.color + "45" : "rgba(255,255,255,0.07)"}`,
              color: activeNode === n.id ? n.color : "rgba(255,255,255,0.35)",
            }}>
            <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              animate={activeNode === n.id ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ background: n.color, boxShadow: activeNode === n.id ? `0 0 4px ${n.color}` : "none" }} />
            {n.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── PLAYGROUND SPLIT TAB ────────────────────────────────────────────────────
function PlaygroundSplit({ mod, params }: { mod: ArsenalModule; params: StudioParams }) {
  const [input,      setInput]      = useState("Analyze threat surface of target system");
  const [showSchema, setShowSchema] = useState(false);
  const [schema,     setSchema]     = useState(`{\n  "type": "object",\n  "properties": {\n    "target": { "type": "string" },\n    "depth": { "type": "number", "default": 3 },\n    "output_format": { "type": "string", "enum": ["json","markdown"] }\n  },\n  "required": ["target"]\n}`);
  const [running,    setRunning]    = useState(false);
  const [output,     setOutput]     = useState<string[]>([]);
  const [structuredResult, setStructuredResult] = useState<Record<string, unknown> | null>(null);
  const [copied,      setCopied]   = useState(false);
  const [progress,   setProgress]   = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const run = () => {
    if (!input.trim() || running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setOutput([]); setStructuredResult(null); setProgress(0); setRunning(true);
    void streamArsenalRun(mod, {
      input,
      mode: "playground",
      params: { ...params, schema: showSchema ? schema : undefined },
    }, controller.signal, (event) => {
      if (event.type === "log") setOutput((previous) => [...previous, `↳ ${event.message}`]);
      if (event.type === "line") setOutput((previous) => [...previous, event.content]);
      if (event.type === "result") {
        setStructuredResult(event.result);
        const serialized = JSON.stringify(event.result, null, 2);
        setOutput((previous) => [...previous, serialized]);
        pipeline.push({
          source: mod.name,
          sourceColor: mod.color,
          label: `${mod.name} execution`,
          content: serialized,
        });
      }
      if (event.type === "done") {
        setProgress(100);
        setRunning(false);
      }
    }).catch((error: unknown) => {
      if ((error as Error)?.name !== "AbortError") {
        setOutput((previous) => [...previous, `✕ ${error instanceof Error ? error.message : "Execution failed"}`]);
      }
      setRunning(false);
    }).finally(() => {
      abortRef.current = null;
    });
  };
  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  const resultText = structuredResult ? JSON.stringify(structuredResult, null, 2) : output.join("\n");
  const copyOutput = () => {
    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  const exportOutput = () => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${mod.id}-execution.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div key="playground" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 h-full">

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* ── LEFT: Input + Schema ── */}
        <div className="flex flex-col gap-2 lg:w-[46%] min-h-0">
          <div className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "rgba(4,4,8,0.92)", border: `1px solid ${mod.color}20`, flex: 1 }}>
            <div className="absolute top-0 inset-x-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${mod.color}44, transparent)` }} />
            <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: `1px solid ${mod.color}14` }}>
              <FlaskConical className="w-3.5 h-3.5" style={{ color: mod.color }} />
              <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: `${mod.color}80` }}>
                PROMPT INPUT
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => setShowSchema((s) => !s)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7.5px] font-mono font-bold transition-all cs-btn"
                  style={{
                    background: showSchema ? `${mod.color}14` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${showSchema ? mod.color + "35" : "rgba(255,255,255,0.08)"}`,
                    color: showSchema ? mod.color : "rgba(255,255,255,0.3)",
                  }}>
                  <Code2 className="w-2.5 h-2.5" /> SCHEMA
                </button>
              </div>
            </div>

            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5}
              className="flex-1 bg-transparent px-4 py-3 text-[11px] font-mono outline-none resize-none cs-scroll leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)", minHeight: 100 }}
              placeholder="Enter task, query, or test prompt…" />

            <AnimatePresence>
              {showSchema && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 140, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="overflow-hidden flex-shrink-0"
                  style={{ borderTop: `1px solid ${mod.color}14` }}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[7.5px] font-mono font-black tracking-widest"
                      style={{ color: "rgba(255,255,255,0.18)" }}>JSON SCHEMA</span>
                  </div>
                  <textarea value={schema} onChange={(e) => setSchema(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-[9.5px] font-mono outline-none resize-none cs-scroll"
                    style={{ color: "#fbbf24bb", height: 110 }} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
              style={{ borderTop: `1px solid ${mod.color}14` }}>
              <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                t={params.temperature} · p={params.topP} · c={params.concurrency}
              </span>
              <div className="flex-1" />
              {running ? (
                <motion.button whileTap={{ scale: 0.92 }} onClick={stop}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9.5px] font-black cs-btn"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                  <Square className="w-3 h-3" /> STOP
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.92 }} onClick={run} disabled={!input.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9.5px] font-black disabled:opacity-25 cs-btn"
                  style={{
                    background: `${mod.color}18`, border: `1px solid ${mod.color}40`,
                    color: mod.color, boxShadow: `0 0 14px ${mod.color}18`,
                  }}>
                  <Play className="w-3.5 h-3.5" /> EXECUTE
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live Output + Heatmap ── */}
        <div className="flex flex-col gap-2 lg:flex-1 min-h-0">
          {(running || progress > 0) && (
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>
                  PIPELINE PROGRESS
                </span>
                <span className="text-[8px] font-mono tabular-nums" style={{ color: mod.color }}>{progress}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${mod.color}60, ${mod.color})`, boxShadow: `0 0 8px ${mod.color}80` }} />
              </div>
            </div>
          )}

          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-0"
            style={{ background: "rgba(4,4,8,0.97)", border: `1px solid rgba(255,255,255,0.06)` }}>
            <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <Monitor className="w-3 h-3" style={{ color: "rgba(255,255,255,0.22)" }} />
              <span className="text-[8px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>LIVE OUTPUT</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={copyOutput} disabled={!resultText}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[7px] font-mono cs-btn disabled:opacity-25"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: copied ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                  {copied ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />} {copied ? "COPIED" : "COPY"}
                </button>
                <button onClick={exportOutput} disabled={!resultText}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[7px] font-mono cs-btn disabled:opacity-25"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}>
                  <Download className="w-2.5 h-2.5" /> EXPORT
                </button>
              </div>
              {running && (
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                  className="ml-auto flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#22d3ee" }} />
                  <span className="text-[7.5px] font-mono" style={{ color: "#22d3ee" }}>STREAMING</span>
                </motion.div>
              )}
              {!running && progress === 100 && (
                <div className="ml-auto flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" style={{ color: "#4ade80" }} />
                  <span className="text-[7.5px] font-mono" style={{ color: "#4ade80" }}>COMPLETE</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto cs-scroll px-4 py-3 space-y-1 min-h-0">
              {output.length === 0 && !running && (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-25">
                  <Eye className="w-7 h-7" />
                  <span className="text-[9.5px] font-mono">Configure input and press EXECUTE</span>
                </div>
              )}
              <AnimatePresence initial={false}>
                {output.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.14 }}
                    className="text-[10px] font-mono leading-relaxed py-0.5"
                    style={{
                      color: (line ?? "").startsWith("✓") ? "#4ade80"
                        : (line ?? "").includes("error") ? "#f87171"
                        : "rgba(255,255,255,0.6)",
                      borderLeft: `2px solid ${(line ?? "").startsWith("✓") ? "#4ade8030" : mod.color + "18"}`,
                      paddingLeft: 10,
                    }}>
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
              {running && (
                <div className="flex items-center gap-1.5 pl-3 py-0.5">
                  {[0,1,2].map((i) => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <LatencyHeatmap color={mod.color} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── CONSOLE TAB ─────────────────────────────────────────────────────────────
function ConsoleTab({ mod, params, onParamChange, onRunStateChange }: {
  mod: ArsenalModule;
  params: StudioParams;
  onParamChange: (p: Partial<StudioParams>) => void;
  onRunStateChange: (s: RunState) => void;
}) {
  const INIT_LOGS: LogEntry[] = [
    { level: "sys",  message: `${mod.name} Command Studio — awaiting server runtime`,      ts: "—" },
    { level: "info", message: `Module: ${mod.id} · Source: ${mod.source}`,                 ts: "—" },
    { level: "info", message: "No execution has been recorded in this session yet",         ts: "—" },
  ];

  const [mode, setMode]               = useState<ConsoleMode>("terminal");
  const [logs, setLogs]               = useState<LogEntry[]>(INIT_LOGS);
  const [running, setRunning]         = useState(false);
  const [cmd, setCmd]                 = useState("");
  const [model, setModel]             = useState("claude-opus-4");
  const [history, setHistory]         = useState<string[]>([]);
  const [histIdx, setHistIdx]         = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showParams, setShowParams]   = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, "ts">) => {
    const ts = new Date().toLocaleTimeString("en", { hour12: false });
    setLogs((prev) => [...prev.slice(-40), { ...entry, ts }]);
  }, []);

  const runCmd = useCallback((presetCommand?: string) => {
    const userCmd = (presetCommand ?? cmd).trim();
    if (!userCmd || running) return;
    setCmd(""); setHistIdx(-1); setShowSuggest(false);
    setHistory((h) => [userCmd, ...h.slice(0, 49)]);
    addLog({ level: "cmd", message: `$ ${userCmd}` });
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    onRunStateChange("running");
    addLog({ level: "info", message: `Dispatching ${mod.id} to the server runtime — temp:${params.temperature}` });
    void streamArsenalRun(mod, {
      command: userCmd,
      mode: "console",
      params: { ...params, model },
    }, controller.signal, (event) => {
      if (event.type === "log") addLog({ level: event.level, message: event.message });
      if (event.type === "line") addLog({ level: "info", message: event.content });
      if (event.type === "result") {
        const serialized = JSON.stringify(event.result, null, 2);
        addLog({ level: "ok", message: serialized });
        pipeline.push({
          source: mod.name,
          sourceColor: mod.color,
          label: `${mod.name} execution`,
          content: serialized,
        });
      }
      if (event.type === "done") {
        setRunning(false);
        onRunStateChange("idle");
      }
    }).catch((error: unknown) => {
      if ((error as Error)?.name !== "AbortError") {
        addLog({ level: "error", message: error instanceof Error ? error.message : "Execution failed" });
        onRunStateChange("error");
      }
      setRunning(false);
    }).finally(() => {
      abortRef.current = null;
    });
  }, [cmd, running, model, params, mod, addLog, onRunStateChange]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    addLog({ level: "warn", message: "Execution interrupted by operator" });
    setRunning(false);
    onRunStateChange("idle");
  }, [addLog, onRunStateChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runCmd(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next); setCmd(history[next] ?? ""); setShowSuggest(false);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setCmd(""); } else { setHistIdx(next); setCmd(history[next] ?? ""); }
      setShowSuggest(false);
    }
    if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault(); setCmd(suggestions[0]); setSuggestions([]); setShowSuggest(false);
    }
    if (e.key === "Escape") { setSuggestions([]); setShowSuggest(false); }
  };

  const handleCmdChange = (v: string) => {
    setCmd(v); setHistIdx(-1);
    const sv = v || "";
    if (sv.startsWith("/")) {
      const matches = AUTOCOMPLETE_CMDS.filter((c) => (c || "").startsWith(sv) && c !== sv);
      setSuggestions(matches); setShowSuggest(matches.length > 0);
    } else { setSuggestions([]); setShowSuggest(false); }
  };

  const runPreset = (key: string) => { runCmd(key); };

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const LEVEL_COLOR: Record<LogLevel, string> = {
    info: "#22d3ee", ok: "#4ade80", warn: "#fbbf24", error: "#f87171", cmd: mod.color, sys: "#a78bfa",
  };
  const LEVEL_PFX: Record<LogLevel, string> = {
    info: "[SYS]", ok: "[OK ]", warn: "[WRN]", error: "[ERR]", cmd: "[CMD]", sys: "[•••]",
  };

  const CHIPS = [
    { label: "Benchmark",     icon: "⚡", cmd: "/benchmark",     color: "#fbbf24" },
    { label: "Inspect",       icon: "🔬", cmd: "/inspect",       color: "#22d3ee" },
    { label: "Stress Test",   icon: "🔥", cmd: "/stress-test",   color: "#f87171" },
    { label: "Export Config", icon: "📦", cmd: "/export-config", color: "#a78bfa" },
    { label: "Flush Cache",   icon: "🔄", cmd: "/flush",         color: "#4ade80" },
    { label: "Audit",         icon: "🛡️", cmd: "/audit",         color: "#fb923c" },
  ];

  return (
    <motion.div key="console" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
      className="flex flex-col gap-2.5 h-full">

      {/* ── Top control row ── */}
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-0.5 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["terminal", "split"] as ConsoleMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8.5px] font-black tracking-wider transition-all cs-btn"
              style={{
                background: mode === m ? `${mod.color}16` : "transparent",
                border: `1px solid ${mode === m ? mod.color + "38" : "transparent"}`,
                color: mode === m ? mod.color : "rgba(255,255,255,0.3)",
              }}>
              {m === "terminal"
                ? <><LayoutPanelLeft className="w-2.5 h-2.5" /> TERMINAL</>
                : <><Columns2 className="w-2.5 h-2.5" /> SPLIT</>}
            </button>
          ))}
        </div>

        <button onClick={() => setShowParams((s) => !s)}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[8.5px] font-black transition-all cs-btn"
          style={{
            background: showParams ? `${mod.color}12` : "rgba(255,255,255,0.04)",
            border: `1px solid ${showParams ? mod.color + "35" : "rgba(255,255,255,0.07)"}`,
            color: showParams ? mod.color : "rgba(255,255,255,0.3)",
          }}>
          <SlidersHorizontal className="w-3 h-3" /> PARAMS
        </button>

        <div className="flex-1" />

        {/* Model selector */}
        <div className="relative hidden sm:block">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${mod.color}22` }}>
            <Brain className="w-3 h-3" style={{ color: mod.color }} />
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="bg-transparent text-[9px] font-mono font-bold outline-none appearance-none cursor-pointer pr-4"
              style={{ color: mod.color }}>
              {["claude-opus-4","claude-sonnet-4","gpt-4o","gemini-2.5-pro","llama-3.3-70b","deepseek-r2","grok-3"].map((m) => (
                <option key={m} value={m} style={{ background: "#09090b", color: "#e2e8f0" }}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: `${mod.color}50` }} />
          </div>
        </div>
      </div>

      {/* ── Param sliders ── */}
      <AnimatePresence>
        {showParams && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden">
            <div className="rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4"
              style={{ background: "rgba(0,0,0,0.32)", border: `1px solid ${mod.color}14` }}>
              <ParamSlider label="TEMPERATURE" value={params.temperature} min={0} max={2} step={0.01}
                onChange={(v) => onParamChange({ temperature: v })} color="#f97316"
                format={(v) => v.toFixed(2)} />
              <ParamSlider label="TOP-P" value={params.topP} min={0} max={1} step={0.01}
                onChange={(v) => onParamChange({ topP: v })} color="#a78bfa"
                format={(v) => v.toFixed(2)} />
              <ParamSlider label="CONCURRENCY" value={params.concurrency} min={1} max={16} step={1}
                onChange={(v) => onParamChange({ concurrency: v })} color="#22d3ee"
                format={(v) => `${v}×`} />
              <ParamSlider label="TIMEOUT (s)" value={params.timeout} min={5} max={120} step={5}
                onChange={(v) => onParamChange({ timeout: v })} color="#4ade80"
                format={(v) => `${v}s`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick-action chips ── */}
      <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
        {CHIPS.map(({ label, icon, cmd: chipCmd, color }) => (
          <motion.button key={label} whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.92 }}
            onClick={() => runPreset(chipCmd)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8.5px] font-black cs-btn"
            style={{
              background: `${color}0e`, border: `1px solid ${color}28`, color,
              boxShadow: `0 0 8px ${color}10`,
            }}>
            <span className="text-[10px]">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* ── Terminal / Split content ── */}
      {mode === "split" ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-0"
            style={{ background: "rgba(4,4,8,0.97)", border: `1px solid ${mod.color}18` }}>
            <TerminalWindow logs={logs} running={running} mod={mod} logsEndRef={logsEndRef}
              LEVEL_COLOR={LEVEL_COLOR} LEVEL_PFX={LEVEL_PFX} onClear={() => setLogs([])} />
          </div>
          <div className="lg:w-[42%] flex flex-col gap-2">
            <div className="rounded-xl overflow-hidden flex-1"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.28)" }}>
              <div className="px-3 py-2 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Settings className="w-3 h-3" style={{ color: "rgba(255,255,255,0.22)" }} />
                <span className="text-[7.5px] font-black tracking-widest font-mono"
                  style={{ color: "rgba(255,255,255,0.18)" }}>ENV VARS</span>
              </div>
              <textarea defaultValue={`PROVIDER=claude-opus-4\nSTREAM=true\nSAFETY=strict\nMODE=autonomous`}
                rows={5}
                className="w-full bg-transparent px-3 py-2 text-[9.5px] font-mono outline-none resize-none cs-scroll"
                style={{ color: "rgba(255,255,255,0.42)" }} />
            </div>
          </div>
        </div>
      ) : (
        /* ── Full Terminal ── */
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-0 relative"
          style={{
            background: "rgba(4,4,8,0.97)",
            border: `1px solid ${running ? mod.color + "32" : mod.color + "18"}`,
            boxShadow: running ? `inset 0 0 40px ${mod.color}08, 0 0 24px ${mod.color}14` : "none",
            transition: "box-shadow 0.4s ease, border-color 0.4s ease",
          }}>
          {running && (
            <div className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ boxShadow: `inset 0 0 50px ${mod.color}06` }} />
          )}
          <TerminalWindow logs={logs} running={running} mod={mod} logsEndRef={logsEndRef}
            LEVEL_COLOR={LEVEL_COLOR} LEVEL_PFX={LEVEL_PFX} onClear={() => setLogs([])} />

          {/* Autocomplete */}
          <AnimatePresence>
            {showSuggest && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-14 left-4 z-50 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(10,10,16,0.98)", border: `1px solid ${mod.color}32`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${mod.color}14`,
                }}>
                {suggestions.map((s, i) => (
                  <button key={s}
                    onClick={() => { setCmd(s); setSuggestions([]); setShowSuggest(false); inputRef.current?.focus(); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-[10px] font-mono text-left"
                    style={{
                      color: i === 0 ? mod.color : "rgba(255,255,255,0.5)",
                      background: i === 0 ? `${mod.color}10` : "transparent",
                      borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                    <span style={{ color: `${mod.color}55` }}>↵</span> {s}
                  </button>
                ))}
                <div className="px-4 py-1.5 text-[7px] font-mono"
                  style={{ color: "rgba(255,255,255,0.16)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  TAB · ↑↓ navigate · ESC dismiss
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar with gradient prompt */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 relative"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
            <span className="text-[14px] font-mono font-black select-none"
              style={{
                color: mod.color,
                textShadow: `0 0 10px ${mod.color}80`,
              }}>$</span>
            <input ref={inputRef} type="text" value={cmd}
              onChange={(e) => handleCmdChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={running ? "waiting for execution…" : "Enter command or /help…"}
              disabled={running}
              className="flex-1 bg-transparent text-[10.5px] font-mono outline-none placeholder:opacity-15"
              style={{ color: "rgba(255,255,255,0.82)" }} />
            {history.length > 0 && !running && (
              <span className="hidden sm:block text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.13)" }}>
                ↑↓ history · TAB complete
              </span>
            )}
            {running ? (
              <motion.button whileTap={{ scale: 0.9 }} onClick={stopRun}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black cs-btn"
                style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                <Square className="w-3 h-3" /> STOP
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => runCmd()} disabled={!cmd.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black disabled:opacity-25 cs-btn"
                style={{ background: `${mod.color}14`, border: `1px solid ${mod.color}35`, color: mod.color }}>
                <Play className="w-3 h-3" /> RUN
              </motion.button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Terminal Window (shared) ─────────────────────────────────────────────────
function TerminalWindow({ logs, running, mod, logsEndRef, LEVEL_COLOR, LEVEL_PFX, onClear }: {
  logs: LogEntry[]; running: boolean; mod: ArsenalModule;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  LEVEL_COLOR: Record<LogLevel, string>;
  LEVEL_PFX: Record<LogLevel, string>;
  onClear: () => void;
}) {
  const logText = logs.map((log) => `${log.level.toUpperCase()}\t${log.message}`).join("\n");
  const copyLogs = () => { navigator.clipboard.writeText(logText).catch(() => {}); };
  const exportLogs = () => {
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${mod.id}-session.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="flex items-center gap-1.5 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {(["#e21227","#fbbf24","#4ade80"] as const).map((c) => (
          <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c + "70" }} />
        ))}
        <span className="ml-2 text-[8.5px] font-mono" style={{ color: "rgba(255,255,255,0.16)" }}>
          {mod.id} — command studio 3.0
        </span>
        <div className="ml-auto flex items-center gap-2">
          {running && (
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.65, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full" style={{ background: "#22d3ee", boxShadow: "0 0 6px #22d3ee" }} />
          )}
          <span className="text-[7.5px] font-mono"
            style={{ color: running ? "#22d3ee" : "rgba(255,255,255,0.13)" }}>
            {running ? "RUNNING" : "IDLE"}
          </span>
          <button onClick={copyLogs}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-mono transition-all cs-btn"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)" }}>
            <Copy className="w-2.5 h-2.5" /> COPY
          </button>
          <button onClick={exportLogs}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-mono transition-all cs-btn"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)" }}>
            <Download className="w-2.5 h-2.5" /> EXPORT
          </button>
          <button onClick={onClear}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-mono transition-all cs-btn"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)" }}>
            <RotateCcw className="w-2.5 h-2.5" /> CLR
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto cs-scroll px-4 py-3 space-y-0.5 min-h-0">
        <AnimatePresence initial={false}>
          {logs.map((log, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-start gap-2 py-0.5">
              <span className="text-[8.5px] font-mono font-black flex-shrink-0 w-9"
                style={{ color: LEVEL_COLOR[log.level] }}>
                {LEVEL_PFX[log.level]}
              </span>
              <span className="text-[10px] font-mono flex-1 leading-relaxed"
                style={{ color: log.level === "cmd" ? mod.color : log.level === "sys" ? "#a78bfa" : "rgba(255,255,255,0.58)" }}>
                {log.message}
              </span>
              <span className="text-[7px] font-mono flex-shrink-0 tabular-nums"
                style={{ color: "rgba(255,255,255,0.12)" }}>
                {log.ts}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-1 py-0.5">
          <span className="text-[8.5px] font-mono font-black w-9" style={{ color: LEVEL_COLOR.ok }}>
            {LEVEL_PFX.ok}
          </span>
          <span className="cs-cursor"
            style={{ color: mod.color, background: mod.color, width: 7, height: 13, display: "inline-block", borderRadius: 1 }} />
        </div>
        <div ref={logsEndRef} />
      </div>
    </>
  );
}

// ─── API TAB ─────────────────────────────────────────────────────────────────
function ApiTab({ mod }: { mod: ArsenalModule }) {
  const [lang, setLang]     = useState<CodeLang>("typescript");
  const [copied, setCopied] = useState(false);
  const snippets = useMemo(() => buildSnippets(mod), [mod]);

  const copy = () => {
    navigator.clipboard.writeText(snippets[lang]).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const LC: Record<CodeLang, string> = { typescript: "#3b82f6", python: "#f59e0b", curl: "#4ade80" };

  const hl = (line: string | undefined, l: CodeLang) => {
    const sl = line ?? "";
    const trimmed = sl.trim();
    if (l === "curl") {
      if (trimmed.startsWith("#"))  return { color: "#4ade8045" };
      if (sl.includes("curl "))     return { color: "#4ade80" };
      if (/^  -/.test(sl))          return { color: "#22d3ee" };
      return { color: "rgba(255,255,255,0.6)" };
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) return { color: "#4ade8045" };
    if (/^(import|from|const|let|await|for|async|def|return|print|process)\b/.test(trimmed)) return { color: "#a78bfa" };
    if (/"[^"]*"/.test(sl)) return { color: "#fbbf24bb" };
    return { color: "rgba(255,255,255,0.6)" };
  };

  return (
    <motion.div key="api" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
      className="space-y-3">

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["typescript","python","curl"] as CodeLang[]).map((id) => (
            <button key={id} onClick={() => setLang(id)}
              className="px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wide transition-all cs-btn"
              style={{
                background: lang === id ? `${LC[id]}18` : "transparent",
                border: `1px solid ${lang === id ? LC[id] + "40" : "transparent"}`,
                color: lang === id ? LC[id] : "rgba(255,255,255,0.3)",
              }}>
              {id === "typescript" ? "TypeScript" : id === "python" ? "Python" : "cURL"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }} onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black cs-btn"
          style={{
            background: copied ? "rgba(74,222,128,0.12)" : `${LC[lang]}12`,
            border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : LC[lang] + "30"}`,
            color: copied ? "#4ade80" : LC[lang],
          }}>
          {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "COPIED" : "COPY"}
        </motion.button>
      </div>

      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: "rgba(4,4,8,0.97)", border: `1px solid ${LC[lang]}20` }}>
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LC[lang]}44, transparent)` }} />
        <div className="flex items-center gap-1.5 px-4 py-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {(["#e21227","#fbbf24","#4ade80"] as const).map((c) => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c + "80" }} />
          ))}
          <span className="ml-2 text-[8.5px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
            {mod.id}.{lang === "typescript" ? "ts" : lang === "python" ? "py" : "sh"}
          </span>
          <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: `${LC[lang]}12`, border: `1px solid ${LC[lang]}25`, color: LC[lang] }}>
            {lang.toUpperCase()}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.pre key={lang} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="px-5 py-4 text-[10.5px] font-mono leading-relaxed overflow-x-auto cs-scroll">
            {snippets[lang].split("\n").map((line, i) => (
              <div key={i} style={hl(line, lang)}>{line || " "}</div>
            ))}
          </motion.pre>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["Documentation","API Reference","Examples"].map((label) => (
          <motion.button key={label} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-bold cs-btn"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.32)" }}>
            <ArrowUpRight className="w-3 h-3" /> {label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── TELEMETRY TAB ───────────────────────────────────────────────────────────
function TelemetryTab({ mod, runState }: { mod: ArsenalModule; runState: RunState }) {
  const [metrics, setMetrics] = useState({
    latency: 0, calls: 0, tokens: 0, uptime: 0,
    cpu: 0, ram: 0, gpu: 0, throughput: 0, errorRate: 0,
    gpuMem: 0, sockets: 0,
  });
  const [sparks, setSparks] = useState<number[][]>([[], [], [], []]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/arsenal/telemetry?toolId=${encodeURIComponent(mod.id)}`);
        if (!response.ok) throw new Error(`Telemetry request failed: ${response.status}`);
        const data = await response.json() as {
          latency: number; calls: number; tokens: number; uptime: number;
          errorRate: number; ram: number; ramPercent?: number; heapUsed: number;
          cpu?: number; loadAvg?: number[];
        };
        if (disposed) return;
        const next = {
          latency:    data.latency,
          calls:      data.calls,
          tokens:     data.tokens,
          uptime:     data.uptime > 0 ? 100 : 0,
          cpu:        data.cpu ?? 0,
          ram:        data.ramPercent ?? Math.min(100, data.ram / 8),
          gpu:        0,
          throughput: data.latency > 0 ? Math.min(650, data.tokens / (data.latency / 1000 || 1)) : 0,
          errorRate:  data.errorRate,
          gpuMem:     data.heapUsed,
          sockets:    0,
        };
        setMetrics(next);
        const values = [
          Math.max(0, Math.min(100, 100 - next.latency / 2.2)),
          Math.min(100, next.calls),
          Math.min(100, next.tokens / 1000),
          next.uptime,
        ];
        setSparks((previous) => previous.map((spark, index) => [...spark.slice(-13), values[index]]));
      } catch {
        // A missing telemetry response is represented by zeroed metrics, not fabricated data.
      }
    };
    void load();
    const id = setInterval(() => { void load(); }, 5000);
    return () => { disposed = true; clearInterval(id); };
  }, [mod.id]);

  const BARS = [
    { label: "CPU LOAD",   value: metrics.cpu,        color: "#22d3ee" },
    { label: "MEMORY",     value: metrics.ram,        color: "#a78bfa" },
    { label: "GPU UTIL",   value: metrics.gpu,        color: mod.color },
    { label: "THROUGHPUT", value: Math.round((metrics.throughput / 650) * 100), color: "#4ade80" },
    { label: "ERROR RATE", value: Math.min(100, Math.round(metrics.errorRate * 20)), color: "#fbbf24" },
  ];

  return (
    <motion.div key="telemetry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
      className="space-y-4">

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
          className="w-2 h-2 rounded-full" style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
        <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: "rgba(74,222,128,0.75)" }}>
          LIVE TELEMETRY FEED
        </span>
        <span className="ml-auto text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.16)" }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Waveform oscilloscope */}
      <WaveformOscilloscope color={mod.color} active={runState === "running" || runState === "processing"} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="LATENCY"   value={Math.round(metrics.latency)} suffix="ms" color="#22d3ee"
          icon={Activity}   spark={sparks[0]} progress={100 - metrics.latency / 2.2} />
        <MetricCard label="API CALLS" value={metrics.calls}               color={mod.color}
          icon={Zap}        spark={sparks[1]} progress={75} />
        <MetricCard label="TOKENS"    value={metrics.tokens}              color="#a78bfa"
          icon={Hash}       spark={sparks[2]} progress={60} />
        <MetricCard label="UPTIME"    value={metrics.uptime} suffix="%" color="#4ade80"
          icon={TrendingUp} spark={sparks[3]} progress={metrics.uptime} decimals={1} />
      </div>

      {/* Circular gauges */}
      <div className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-3.5 h-3.5" style={{ color: mod.color }} />
          <span className="text-[8px] font-black tracking-widest font-mono" style={{ color: `${mod.color}70` }}>
            RESOURCE GAUGES
          </span>
        </div>
        <div className="flex items-center justify-around flex-wrap gap-4">
          <CircularGauge value={metrics.gpuMem} max={16} label="GPU MEMORY" unit="GB"
            color={mod.color} icon={MemoryStick} />
          <CircularGauge value={Math.round(metrics.throughput)} max={650} label="THROUGHPUT" unit="tok/s"
            color="#22d3ee" icon={Waves} />
          <CircularGauge value={parseFloat(metrics.errorRate.toFixed(2))} max={5} label="ERROR RATE" unit="%"
            color="#f87171" icon={TriangleAlert} size={88} />
          <CircularGauge value={metrics.sockets} max={32} label="SOCKETS" unit="conn"
            color="#4ade80" icon={Wifi} />
        </div>
      </div>

      {/* Resource bars */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.26)" }} />
          <span className="text-[8px] font-black tracking-widest font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
            RESOURCE ALLOCATION
          </span>
        </div>
        {BARS.map((bar) => (
          <div key={bar.label} className="flex items-center gap-3">
            <span className="text-[7.5px] font-mono w-20 flex-shrink-0" style={{ color: "rgba(255,255,255,0.26)" }}>
              {bar.label}
            </span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div animate={{ width: `${bar.value}%` }} transition={{ duration: 0.6 }}
                className="h-full rounded-full relative"
                style={{ background: `linear-gradient(90deg, ${bar.color}55, ${bar.color})` }}>
                <motion.div animate={{ opacity: [0.6, 0, 0.6] }} transition={{ duration: 1, repeat: Infinity }}
                  className="absolute right-0 top-0 bottom-0 w-3 rounded-full"
                  style={{ background: bar.color, filter: "blur(3px)" }} />
              </motion.div>
            </div>
            <span className="text-[9px] font-mono w-9 text-right tabular-nums" style={{ color: bar.color }}>
              {bar.value}%
            </span>
          </div>
        ))}
      </div>

      {/* Service status grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "API Gateway",   icon: Server,    ok: true  },
          { label: "AI Provider",   icon: Brain,     ok: metrics.calls > 0  },
          { label: "Cache Layer",   icon: Database,  ok: true  },
          { label: "Auth Service",  icon: Lock,      ok: true  },
          { label: "Telemetry Bus", icon: BarChart2, ok: true  },
          { label: "Edge Runtime",  icon: Globe,     ok: false },
        ].map(({ label, icon: Icon, ok }) => (
          <div key={label} className="rounded-xl p-2.5 flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.022)",
              border: `1px solid ${ok ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.15)"}`,
            }}>
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: ok ? "#4ade80" : "#fbbf24" }} />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.56)" }}>
                {label}
              </div>
              <div className="text-[7px] font-mono" style={{ color: ok ? "#4ade8055" : "#fbbf2455" }}>
                {ok ? "ONLINE" : "DEGRADED"}
              </div>
            </div>
            <motion.div animate={{ opacity: ok ? [1, 0.3, 1] : [0.6, 0.2, 0.6] }}
              transition={{ duration: ok ? 2 : 1.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: ok ? "#4ade80" : "#fbbf24" }} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── FLOATING STUDIO DOCK 3.0 ─────────────────────────────────────────────────
function FloatingDock({ mod, onRun, onStop, onClear, onSettings, running, showSettings, uptime, apiCalls }: {
  mod: ArsenalModule;
  onRun: () => void; onStop: () => void; onClear: () => void; onSettings: () => void;
  running: boolean; showSettings: boolean; uptime: number; apiCalls: number;
}) {
  const ACTIONS = [
    {
      key: "run",
      label: running ? "RUNNING" : "RUN",
      icon: running ? Loader2 : Play,
      color: running ? "#22d3ee" : "#4ade80",
      bg:     running ? "rgba(34,211,238,0.14)" : "rgba(74,222,128,0.12)",
      border: running ? "rgba(34,211,238,0.35)" : "rgba(74,222,128,0.3)",
      action: running ? onStop : onRun,
      glow:   running ? "0 0 18px rgba(34,211,238,0.35)" : "0 0 14px rgba(74,222,128,0.22)",
    },
    {
      key: "stop",  label: "STOP",  icon: Square,    color: "#f87171",
      bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)",
      action: onStop, glow: "none",
    },
    {
      key: "clear", label: "CLEAR", icon: RotateCcw, color: "rgba(255,255,255,0.45)",
      bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)",
      action: onClear, glow: "none",
    },
    {
      key: "settings", label: "PARAMS", icon: SlidersHorizontal,
      color: showSettings ? mod.color : "rgba(255,255,255,0.35)",
      bg:     showSettings ? `${mod.color}12` : "rgba(255,255,255,0.05)",
      border: showSettings ? `${mod.color}38` : "rgba(255,255,255,0.1)",
      action: onSettings, glow: "none",
    },
  ];

  const formatUptime = (s: number) => {
    const m  = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="lg:hidden fixed bottom-6 left-1/2 z-[300] -translate-x-1/2"
      style={{ width: "min(380px, 92vw)" }}>

      {/* Micro-telemetry strip */}
      <div className="flex items-center gap-3 px-4 py-1.5 mb-1 rounded-xl mx-2"
        style={{
          background: "rgba(6,6,10,0.85)",
          backdropFilter: "blur(20px)",
          border: `1px solid rgba(255,255,255,0.05)`,
        }}>
        <div className="flex items-center gap-1">
          <motion.div animate={{ opacity: running ? [1, 0.2, 1] : 0.3 }} transition={{ duration: 0.8, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: running ? "#22d3ee" : "#4ade80", boxShadow: running ? "0 0 5px #22d3ee" : "none" }} />
          <span className="text-[7px] font-mono" style={{ color: running ? "#22d3ee" : "rgba(255,255,255,0.25)" }}>
            {running ? "ACTIVE" : "IDLE"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.2)" }} />
          <span className="text-[7px] font-mono tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
            {formatUptime(uptime)}
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-[7px] font-mono tabular-nums" style={{ color: `${mod.color}60` }}>
          {apiCalls.toLocaleString()} calls
        </span>
        <div className="w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-[7px] font-mono font-black tracking-widest" style={{ color: `${mod.color}60` }}>
          STUDIO
        </span>
      </div>

      {/* Main dock */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
        style={{
          background: "rgba(7,7,12,0.96)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: `1px solid ${mod.color}22`,
          boxShadow: `0 8px 48px rgba(0,0,0,0.85), 0 0 0 1px ${mod.color}08, 0 0 32px ${mod.color}12`,
        }}>

        {/* Studio label */}
        <div className="flex flex-col mr-2 flex-shrink-0">
          <span className="text-[6px] font-mono font-black tracking-widest" style={{ color: `${mod.color}55` }}>
            STUDIO DOCK
          </span>
          <motion.div animate={{ scaleX: running ? [1, 0.6, 1] : 1 }} transition={{ duration: 0.8, repeat: Infinity }}
            className="w-10 h-0.5 rounded-full mt-0.5"
            style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }} />
        </div>

        <div className="flex-1 flex items-center justify-around gap-1">
          {ACTIONS.map((a) => {
            const ActionIcon = a.icon;
            return (
              <motion.button key={a.key} whileTap={{ scale: 0.85 }} onClick={a.action}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 cs-btn"
                style={{
                  background: a.bg,
                  border: `1px solid ${a.border}`,
                  color: a.color,
                  boxShadow: a.glow !== "none" ? a.glow : "none",
                }}>
                <ActionIcon className={`w-4 h-4 ${a.key === "run" && running ? "animate-spin" : ""}`} />
                <span className="text-[6.5px] font-black font-mono tracking-widest">{a.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export function ToolDetailView({ module: mod, onClose, onLaunch, isEnabled }: ToolDetailViewProps) {
  const [tab,        setTab]        = useState<StudioTab>("console");
  const [fullscreen, setFullscreen] = useState(false);
  const [minimized,  setMinimized]  = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [uptime,     setUptime]     = useState(0);
  const [apiCalls,   setApiCalls]   = useState(0);
  const [runState,   setRunState]   = useState<RunState>("idle");
  const [showParams, setShowParams] = useState(false);
  const [dockRunning,setDockRunning]= useState(false);

  const [params, setParams] = useState<StudioParams>({
    temperature: 0.70,
    topP:        0.95,
    concurrency: 4,
    timeout:     60,
  });

  const updateParams = useCallback((p: Partial<StudioParams>) =>
    setParams((prev) => ({ ...prev, ...p })), []);

  const auraColor = runState !== "idle" ? STATE_COLOR[runState] : mod.color;
  const auraClass = STATE_AURA_CLASS[runState];

  useEffect(() => {
    let disposed = false;
    const loadTelemetry = async () => {
      try {
        const response = await fetch(`/api/arsenal/telemetry?toolId=${encodeURIComponent(mod.id)}`);
        if (!response.ok) return;
        const data = await response.json() as { calls?: number; uptime?: number };
        if (disposed) return;
        setApiCalls(Number.isFinite(data.calls) ? Number(data.calls) : 0);
        setUptime(Number.isFinite(data.uptime) ? Math.max(0, Math.round(Number(data.uptime))) : 0);
      } catch {
        if (!disposed) {
          setApiCalls(0);
          setUptime(0);
        }
      }
    };
    void loadTelemetry();
    const id = setInterval(() => { void loadTelemetry(); }, 5000);
    return () => { disposed = true; clearInterval(id); };
  }, [mod.id]);

  const formatUptime = (s: number) => {
    const h  = Math.floor(s / 3600).toString().padStart(2, "0");
    const m  = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${ss}`;
  };

  const handleLaunch = useCallback(() => { onLaunch(mod.id); onClose(); }, [mod.id, onLaunch, onClose]);

  const copyId = () => {
    navigator.clipboard.writeText(mod.id).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && e.ctrlKey && isEnabled) handleLaunch();
      if (e.key === "F11") { e.preventDefault(); setFullscreen((f) => !f); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, handleLaunch, isEnabled]);

  const Icon = mod.icon;

  const TABS: { id: StudioTab; label: string; icon: React.ElementType }[] = [
    { id: "console",    label: "CONSOLE",    icon: Terminal     },
    { id: "canvas",     label: "NODE GRAPH", icon: Crosshair    },
    { id: "playground", label: "PLAYGROUND", icon: FlaskConical  },
    { id: "api",        label: "API",        icon: Code2        },
    { id: "telemetry",  label: "TELEMETRY",  icon: Activity     },
  ];

  const caps = useMemo(() => buildCaps(mod), [mod]);

  const content = (
    <AnimatePresence>
      <motion.div key="cs-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 200,
          padding: fullscreen ? 0 : "clamp(4px, 2vw, 14px)",
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(40px)",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

        <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />

        <motion.div key="cs-panel"
          initial={{ opacity: 0, scale: 0.95, y: 28 }}
          animate={{ opacity: minimized ? 0 : 1, scale: minimized ? 0.84 : 1, y: minimized ? 64 : 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 18 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 220, damping: 28 }}
          className="relative flex flex-col overflow-hidden"
          style={{
            width:  fullscreen ? "100vw" : "min(1280px, 97vw)",
            height: fullscreen ? "100dvh" : "min(920px, 95dvh)",
            background: "rgba(5,5,9,0.99)",
            borderRadius: fullscreen ? 0 : 22,
            border: fullscreen ? "none" : `1px solid ${mod.border}`,
            boxShadow: fullscreen ? "none"
              : `0 0 0 1px ${mod.color}05, 0 0 120px ${mod.glow}, 0 70px 180px rgba(0,0,0,0.97)`,
          }}>

          {/* ══ Ambient Background ══ */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]" style={{ zIndex: 0 }}>
            {/* Multi-layer nebula aura */}
            <NebulaAura color={auraColor} auraClass={auraClass} />
            {/* Neural particle field */}
            <NeuralParticles color={auraColor} />
            {/* Dot grid */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.015 }} preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="csgrid3" x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse">
                  <rect width="44" height="44" fill="none" stroke={mod.color} strokeWidth="0.5" />
                  <circle cx="22" cy="22" r="0.8" fill={mod.color} opacity="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#csgrid3)" />
            </svg>
            {/* Scanline sweep */}
            <div className="cs-scan" style={{
              background: `linear-gradient(90deg, transparent 0%, ${auraColor}00 15%, ${auraColor}50 50%, ${auraColor}00 85%, transparent)`,
              boxShadow: `0 0 14px ${auraColor}22`,
              transition: "background 0.8s ease",
            }} />
            {/* HUD corner brackets */}
            {(["cs-corner-tl","cs-corner-tr","cs-corner-bl","cs-corner-br"] as const).map((cls) => (
              <div key={cls} className={cls}
                style={{ borderColor: `${auraColor}30`, transition: "border-color 0.6s ease" }} />
            ))}
          </div>

          {/* ══ HUD HEADER ══ */}
          <div className="relative z-10 flex-shrink-0"
            style={{ borderBottom: `1px solid ${mod.color}18`, background: "rgba(0,0,0,0.44)", backdropFilter: "blur(28px)" }}>
            {/* Holographic shimmer on header bottom border */}
            <div className="absolute bottom-0 inset-x-0 h-px cs-shimmer-border" />

            {/* Top row */}
            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3">
              {/* Icon orb */}
              <div className="relative w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${mod.color}28, rgba(0,0,0,0.9))`,
                  border: `1px solid ${mod.border}`,
                  boxShadow: `0 0 20px ${mod.glow}`,
                }}>
                <Icon className="w-5 h-5" style={{ color: mod.color, filter: `drop-shadow(0 0 6px ${mod.color})` }} />
                <div className="absolute w-full h-full rounded-xl cs-orbit pointer-events-none"
                  style={{ border: `1px dashed ${mod.color}22` }}>
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: mod.color, boxShadow: `0 0 5px ${mod.color}` }} />
                </div>
              </div>

              {/* Name & breadcrumb */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1 text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
                  <span>ARSENAL HUB</span>
                  <ChevronRight className="w-3 h-3" />
                  <span style={{ color: `${mod.color}99` }}>COMMAND STUDIO 3.0</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[15px] sm:text-[17px] font-black leading-none tracking-tight truncate"
                    style={{
                      color: "#f1f5f9",
                      textShadow: `0 0 24px ${auraColor}40`,
                      transition: "text-shadow 0.6s ease",
                    }}>
                    {mod.name}
                  </h1>
                  <div className="hidden sm:block px-2 py-0.5 rounded-full text-[7px] font-black font-mono tracking-widest flex-shrink-0"
                    style={{ background: `${mod.color}12`, border: `1px solid ${mod.color}28`, color: mod.color }}>
                    {mod.tag}
                  </div>
                  {runState !== "idle" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black font-mono tracking-widest flex-shrink-0"
                      style={{ background: `${auraColor}14`, border: `1px solid ${auraColor}38`, color: auraColor }}>
                      <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                        className="w-1 h-1 rounded-full" style={{ background: auraColor }} />
                      {runState.toUpperCase()}
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex-1" />

              {/* HUD pills */}
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{
                    background: isEnabled ? "rgba(74,222,128,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isEnabled ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  <motion.div animate={{ opacity: isEnabled ? [1, 0.2, 1] : 0.3 }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: isEnabled ? "#4ade80" : "#6b7280", boxShadow: isEnabled ? "0 0 8px #4ade80" : "none" }} />
                  <span className="text-[7.5px] font-black font-mono tracking-widest"
                    style={{ color: isEnabled ? "#4ade80" : "rgba(255,255,255,0.22)" }}>
                    {isEnabled ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.14)" }}>
                  <Clock className="w-3 h-3" style={{ color: "#22d3ee" }} />
                  <span className="text-[8.5px] font-mono font-bold tabular-nums" style={{ color: "#22d3ee" }}>
                    {formatUptime(uptime)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: `${mod.color}08`, border: `1px solid ${mod.color}1e` }}>
                  <Radio className="w-3 h-3" style={{ color: mod.color }} />
                  <span className="text-[8.5px] font-mono font-bold tabular-nums" style={{ color: mod.color }}>
                    {apiCalls.toLocaleString()}
                  </span>
                  <span className="text-[7px] font-mono" style={{ color: `${mod.color}50` }}>CALLS</span>
                </div>
                <button onClick={copyId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cs-btn"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.26)" }}>
                  <Hash className="w-3 h-3" />
                  <span className="text-[8px] font-mono truncate max-w-24">{mod.id}</span>
                  {copied ? <CheckCheck className="w-3 h-3" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Window controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                  onClick={() => setMinimized((m) => !m)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg cs-btn"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
                  <Minus className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                  onClick={() => setFullscreen((f) => !f)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg cs-btn"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
                  {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </motion.button>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.88 }}
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg cs-btn"
                  style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.22)", color: "rgba(226,18,39,0.7)" }}>
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>

            {/* Tab row */}
            <div className="flex items-center gap-1 px-4 sm:px-5 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {TABS.map((t) => (
                <StudioTabBtn key={t.id} label={t.label} icon={t.icon}
                  active={tab === t.id} onClick={() => setTab(t.id)} accent={mod.color} />
              ))}
              <div className="flex-1" />
              <div className="flex md:hidden items-center gap-2">
                <motion.div animate={{ opacity: isEnabled ? [1, 0.25, 1] : 0.3 }}
                  transition={{ duration: 1.3, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: isEnabled ? auraColor : "#6b7280", transition: "background 0.5s ease" }} />
                <span className="text-[7.5px] font-mono tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {formatUptime(uptime)}
                </span>
              </div>
            </div>
          </div>

          {/* ══ BODY ══ */}
          <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

            {/* Left sidebar */}
            <div className="hidden lg:flex w-[238px] xl:w-[254px] flex-shrink-0 flex-col overflow-y-auto cs-scroll"
              style={{
                borderRight: `1px solid ${mod.color}10`,
                background: "rgba(0,0,0,0.16)",
                ["--cs-accent" as string]: mod.color,
              }}>
              <div className="p-5 flex flex-col gap-4">

                {/* Icon orb */}
                <div className="relative flex items-center justify-center py-5">
                  <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.16, 0.42, 0.16] }}
                    transition={{ duration: 3.2, repeat: Infinity }}
                    className="absolute w-28 h-28 rounded-full"
                    style={{ background: `radial-gradient(circle, ${auraColor}1a 0%, transparent 70%)`, transition: "background 0.8s ease" }} />
                  <div className="absolute w-24 h-24 rounded-full cs-orbit pointer-events-none"
                    style={{ border: `1px dashed ${mod.color}24` }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                      style={{ background: mod.color, boxShadow: `0 0 8px ${mod.color}` }} />
                  </div>
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${mod.color}2c 0%, rgba(6,6,10,0.95) 72%)`,
                      border: `1px solid ${mod.border}`,
                      boxShadow: `0 0 32px ${mod.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    }}>
                    <Icon className="w-8 h-8" style={{ color: mod.color, filter: `drop-shadow(0 0 10px ${mod.color})` }} />
                  </div>
                </div>

                {/* Name */}
                <div className="text-center space-y-1.5">
                  <h2 className="text-[15px] font-black leading-tight"
                    style={{ color: "#f1f5f9", textShadow: `0 0 20px ${mod.color}35` }}>
                    {mod.name}
                  </h2>
                  <p className="text-[9px] font-mono leading-snug" style={{ color: "rgba(255,255,255,0.34)" }}>
                    {mod.subtitle}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "STATUS", value: isEnabled ? "ON" : "OFF", color: isEnabled ? "#4ade80" : "#6b7280" },
                    { label: "CALLS",  value: `${Math.floor(apiCalls / 1000)}K`, color: mod.color },
                    { label: "UPTIME", value: uptime > 0 ? `${Math.floor(uptime / 60)}m` : "—", color: "#22d3ee" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-2.5 text-center"
                      style={{ background: `${s.color}08`, border: `1px solid ${s.color}1c` }}>
                      <div className="text-[12px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: `${s.color}50` }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Capabilities */}
                <div className="space-y-1.5">
                  <div className="text-[7.5px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.14)" }}>
                    CAPABILITIES
                  </div>
                  {caps.slice(0, 5).map((cap, i) => {
                    const CapIcon = cap.icon;
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <CapIcon className="w-3 h-3 flex-shrink-0" style={{ color: mod.color }} />
                        <span className="text-[8.5px] leading-snug truncate" style={{ color: "rgba(255,255,255,0.52)" }}>
                          {cap.title}
                        </span>
                        <StatusBadge status={cap.status} />
                      </div>
                    );
                  })}
                </div>

                {/* Description */}
                <div className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {(mod.desc || "").slice(0, 180)}{(mod.desc || "").length > 180 ? "…" : ""}
                  </p>
                </div>

                {/* Source */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.016)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <GitBranch className="w-3 h-3 flex-shrink-0" style={{ color: `${mod.color}55` }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[6.5px] font-mono tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.16)" }}>SOURCE</div>
                    <div className="text-[8.5px] font-mono truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{mod.source}</div>
                  </div>
                </div>

                {/* Copy ID */}
                <button onClick={copyId}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full text-left cs-btn"
                  style={{ background: "rgba(255,255,255,0.016)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.14)" }} />
                  <span className="text-[8.5px] font-mono flex-1 truncate" style={{ color: "rgba(255,255,255,0.32)" }}>
                    {mod.id}
                  </span>
                  {copied
                    ? <CheckCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#4ade80" }} />
                    : <Copy className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.12)" }} />}
                </button>

                {/* Architecture */}
                <div className="space-y-1.5">
                  <div className="text-[7px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.14)" }}>
                    CORE ARCHITECTURE
                  </div>
                  {[
                    { label: "Stack",    value: "React · TS · AI" },
                    { label: "Runtime",  value: "Node.js + Edge"  },
                    { label: "Protocol", value: "WS · gRPC · REST" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.016)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>{label}</span>
                      <span className="text-[8px] font-mono font-bold truncate max-w-24"
                        style={{ color: "rgba(255,255,255,0.5)" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right content panel */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto cs-scroll p-4 sm:p-5"
                style={{ ["--cs-accent" as string]: mod.color }}>
                <AnimatePresence mode="wait">
                  {tab === "console" && (
                    <ConsoleTab key="con" mod={mod} params={params} onParamChange={updateParams}
                      onRunStateChange={(s) => { setRunState(s); setDockRunning(s === "running" || s === "processing"); }} />
                  )}
                  {tab === "canvas" && (
                    <NodeCanvas key="canvas" mod={mod} />
                  )}
                  {tab === "playground" && (
                    <PlaygroundSplit key="play" mod={mod} params={params} />
                  )}
                  {tab === "api" && (
                    <ApiTab key="api" mod={mod} />
                  )}
                  {tab === "telemetry" && (
                    <TelemetryTab key="tel" mod={mod} runState={runState} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══ */}
          <div className="relative z-10 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 flex-shrink-0"
            style={{
              borderTop: `1px solid ${mod.color}14`,
              background: "rgba(5,5,9,0.90)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
            }}>

            <span className="hidden sm:flex items-center gap-1 text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.11)" }}>
              {[["ESC","close"],["Ctrl+↵","launch"],["F11","fullscreen"]].map(([k, l]) => (
                <React.Fragment key={k}>
                  <kbd className="px-1.5 py-0.5 rounded"
                    style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.03)" }}>
                    {k}
                  </kbd>
                  <span className="mr-2">{l}</span>
                </React.Fragment>
              ))}
            </span>

            <div className="hidden md:flex items-center gap-3 text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
              <span style={{ color: "#f97316" }}>T={params.temperature.toFixed(2)}</span>
              <span style={{ color: "#a78bfa" }}>P={params.topP.toFixed(2)}</span>
              <span style={{ color: "#22d3ee" }}>C={params.concurrency}×</span>
              <span style={{ color: "#4ade80" }}>TO={params.timeout}s</span>
            </div>

            <div className="flex-1" />

            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-xl text-[9.5px] font-black tracking-wider cs-btn"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}>
              CLOSE
            </motion.button>

            <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.93 }}
              onClick={handleLaunch} disabled={!isEnabled}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black tracking-wider disabled:opacity-25 cs-btn"
              style={{
                background: `linear-gradient(135deg, ${mod.color}26, ${mod.color}48)`,
                border: `1px solid ${mod.border}`,
                color: mod.color,
                boxShadow: isEnabled ? `0 0 28px ${mod.glow}, 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
                textShadow: `0 0 10px ${mod.color}65`,
              }}>
              <Zap className="w-4 h-4" style={{ filter: `drop-shadow(0 0 5px ${mod.color})` }} />
              <span className="hidden sm:inline">LAUNCH STUDIO</span>
              <span className="sm:hidden">LAUNCH</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>

        {/* ══ FLOATING MOBILE DOCK 3.0 ══ */}
        <FloatingDock
          mod={mod}
          running={dockRunning}
          showSettings={showParams}
          uptime={uptime}
          apiCalls={apiCalls}
          onRun={() => {}}
          onStop={() => { setRunState("idle"); setDockRunning(false); }}
          onClear={() => {}}
          onSettings={() => setShowParams((s) => !s)}
        />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
