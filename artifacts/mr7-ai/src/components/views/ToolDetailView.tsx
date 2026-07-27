/**
 * ToolDetailView — Futuristic AGI Studio inner-detail panel
 *
 * A full-screen split-pane workspace that opens when the user selects
 * an Arsenal module card, BEFORE launching the tool.
 *
 * Layout:
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │  Header bar — breadcrumb, live status, close                  │
 *  ├────────────────────┬───────────────────────────────────────────┤
 *  │  Left: Module ID   │  Right: Tabbed workspace canvas           │
 *  │  • Animated icon   │  • OVERVIEW  CAPABILITIES  INTEGRATION   │
 *  │  • Name / tags     │  • TELEMETRY LOGS                         │
 *  │  • Telemetry stat  │  • Rich content per tab                   │
 *  │  • Source / desc   │                                            │
 *  ├────────────────────┴───────────────────────────────────────────┤
 *  │  Footer — secondary actions, Launch CTA                       │
 *  └────────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Zap, Activity, Clock, Radio, Hash, ExternalLink, Copy, CheckCheck,
  ChevronRight, Terminal, Cpu, Shield, Brain, Code2, Network, Layers,
  CheckCircle2, AlertTriangle, ArrowUpRight, Wifi, Lock,
  TrendingUp, Database, Globe, Star, BarChart2,
} from "lucide-react";
import type { ArsenalModule, ArsenalModuleId } from "@/components/modals/ArsenalHubModal";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DetailTab = "overview" | "capabilities" | "integration" | "telemetry" | "logs";

interface ToolDetailViewProps {
  module: ArsenalModule;
  onClose: () => void;
  onLaunch: (id: ArsenalModuleId) => void;
  isEnabled: boolean;
}

// ─── Per-tab capability sets (generated from module metadata) ─────────────────
function buildCapabilities(mod: ArsenalModule): { icon: React.ElementType; title: string; desc: string }[] {
  const items: { icon: React.ElementType; title: string; desc: string }[] = [];
  const desc = mod.desc;
  // Parse features from description (comma/period separated segments)
  const parts = desc.replace(/[·•]/g, ",").split(/[,·•\n]/).map(s => s.trim()).filter(s => s.length > 6 && s.length < 120);
  const icons: React.ElementType[] = [Zap, Shield, Brain, Code2, Network, Database, Globe, Terminal, Cpu, Activity, Layers, Lock, Star];
  parts.slice(0, 8).forEach((part, i) => {
    items.push({ icon: icons[i % icons.length], title: part.split(/[-–—:]/)[0].trim().slice(0, 40) || part.slice(0, 40), desc: part });
  });
  if (items.length < 3) {
    items.push(
      { icon: Zap, title: "Real-Time AI", desc: "Live AI inference with streaming output and step-by-step execution." },
      { icon: Shield, title: "Security-Grade", desc: "Hardened inputs, sandboxed execution, and audit logging." },
      { icon: Network, title: "Multi-Provider", desc: "Routes across Claude, GPT, Gemini, and open-source models." },
    );
  }
  return items.slice(0, 8);
}

function buildIntegrationSnippet(mod: ArsenalModule): string {
  return `// ── ${mod.name} Integration ────────────────────────────────
// Source: ${mod.source}
// Tag:    ${mod.tag}

import { arsenal } from "@mr7/sdk";

// Initialize module
const tool = await arsenal.load("${mod.id}", {
  mode: "autonomous",
  provider: "claude-opus",
  stream: true,
});

// Execute
const result = await tool.run({
  input: "Your task or query here",
  context: arsenal.getActiveContext(),
});

// Stream output
for await (const chunk of result.stream) {
  console.log(chunk.text);
}

// Cleanup
await tool.shutdown();`;
}

// ─── Telemetry sparkline (SVG mini-chart) ─────────────────────────────────────
function Sparkline({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 90}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = 40;
    const tick = () => {
      frame++;
      setVal(Math.round((frame / total) * target));
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// ─── Glowing pill tab selector ────────────────────────────────────────────────
function GlowTab({
  label, active, onClick, accent,
}: { label: string; active: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 text-[9px] font-black tracking-[0.14em] transition-all duration-200 rounded-full whitespace-nowrap"
      style={{
        background: active ? `${accent}18` : "transparent",
        border: `1px solid ${active ? accent + "55" : "transparent"}`,
        color: active ? accent : "rgba(255,255,255,0.32)",
        boxShadow: active ? `0 0 18px ${accent}30, inset 0 0 12px ${accent}10` : "none",
        letterSpacing: "0.12em",
      }}
    >
      {active && (
        <motion.div
          layoutId="detail-tab-pill"
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${accent}20 0%, transparent 70%)`,
            boxShadow: `0 1px 0 0 ${accent}50`,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

// ─── Telemetry metric card ────────────────────────────────────────────────────
function TelemetryCard({
  label, value, suffix = "", color, icon: Icon, spark, progress,
}: {
  label: string; value: number; suffix?: string; color: string;
  icon: React.ElementType; spark?: number[]; progress?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-4 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 20% 10%, ${color}12 0%, rgba(6,6,10,0.92) 65%)`,
        border: `1px solid ${color}22`,
        boxShadow: `0 0 24px ${color}18, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}77, transparent)` }} />
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[8px] font-black tracking-[0.16em] font-mono" style={{ color: `${color}99` }}>{label}</span>
        </div>
        {spark && <Sparkline color={color} values={spark} />}
      </div>
      <div className="text-[26px] font-mono font-black leading-none" style={{ color, textShadow: `0 0 20px ${color}55` }}>
        <AnimCounter target={value} suffix={suffix} />
      </div>
      {progress !== undefined && (
        <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Log line component ───────────────────────────────────────────────────────
function LogLine({ level, message, ts }: { level: "info" | "ok" | "warn" | "error"; message: string; ts: string }) {
  const col = { info: "#22d3ee", ok: "#4ade80", warn: "#fbbf24", error: "#e21227" }[level];
  const prefix = { info: "[SYS]", ok: "[OK ]", warn: "[WRN]", error: "[ERR]" }[level];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 py-1.5 border-b"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <span className="text-[9px] font-mono font-black flex-shrink-0" style={{ color: col }}>{prefix}</span>
      <span className="text-[9.5px] font-mono flex-1" style={{ color: "rgba(255,255,255,0.55)" }}>{message}</span>
      <span className="text-[8px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>{ts}</span>
    </motion.div>
  );
}

// ─── DETAIL TABS CONTENT ──────────────────────────────────────────────────────

function OverviewTab({ mod }: { mod: ArsenalModule }) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-5"
    >
      {/* Feature highlights grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color, boxShadow: `0 0 6px ${mod.color}` }} />
          <span className="text-[8.5px] font-black tracking-[0.16em] font-mono" style={{ color: `${mod.color}99` }}>KEY FEATURES</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {buildCapabilities(mod).slice(0, 4).map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, duration: 0.22 }}
                className="rounded-xl p-3.5 relative overflow-hidden"
                style={{
                  background: `${mod.color}07`,
                  border: `1px solid ${mod.color}18`,
                }}
              >
                <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${mod.color}44, transparent)` }} />
                <Icon className="w-4 h-4 mb-2" style={{ color: mod.color }} />
                <div className="text-[10px] font-bold leading-tight mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {cap.title}
                </div>
                <div className="text-[9px] leading-snug" style={{ color: "rgba(255,255,255,0.38)" }}>
                  {cap.desc.slice(0, 80)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* About section */}
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[8.5px] font-black tracking-[0.16em] font-mono mb-2.5" style={{ color: "rgba(255,255,255,0.25)" }}>ABOUT</div>
        <p className="text-[10.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>{mod.desc}</p>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "SOURCE", value: mod.source.slice(0, 28), mono: true },
          { label: "TAG", value: mod.tag, mono: true },
          { label: "MODULE ID", value: mod.id, mono: true },
          { label: "STACK", value: "React · TypeScript · AI", mono: false },
        ].map(m => (
          <div key={m.label} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[7.5px] font-mono tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>{m.label}</div>
            <div className={`text-[9.5px] ${m.mono ? "font-mono" : ""} truncate`} style={{ color: "rgba(255,255,255,0.7)" }}>{m.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function CapabilitiesTab({ mod }: { mod: ArsenalModule }) {
  const caps = buildCapabilities(mod);
  return (
    <motion.div
      key="capabilities"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-2"
    >
      {caps.map((cap, i) => {
        const Icon = cap.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.22 }}
            className="flex items-start gap-3 p-3.5 rounded-xl cursor-default"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.055)",
              transition: "all 0.15s ease",
            }}
            whileHover={{
              background: `${mod.color}0c`,
              borderColor: `${mod.color}33`,
              x: 2,
            } as Parameters<typeof motion.div>[0]["whileHover"]}
          >
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: `${mod.color}14`, border: `1px solid ${mod.color}28` }}>
              <Icon className="w-4 h-4" style={{ color: mod.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-bold mb-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>
                {cap.title}
              </div>
              <div className="text-[9.5px] leading-snug" style={{ color: "rgba(255,255,255,0.38)" }}>{cap.desc}</div>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-1" style={{ color: `${mod.color}60` }} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function IntegrationTab({ mod }: { mod: ArsenalModule }) {
  const [copied, setCopied] = useState(false);
  const snippet = buildIntegrationSnippet(mod);

  const copy = () => {
    navigator.clipboard.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      key="integration"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" style={{ color: mod.color }} />
          <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>SDK INTEGRATION SNIPPET</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all"
          style={{
            background: copied ? "rgba(74,222,128,0.12)" : `${mod.color}12`,
            border: `1px solid ${copied ? "rgba(74,222,128,0.35)" : mod.color + "35"}`,
            color: copied ? "#4ade80" : mod.color,
          }}
        >
          {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "COPIED" : "COPY"}
        </motion.button>
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(4,4,8,0.95)", border: `1px solid ${mod.color}20` }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${mod.color}55, transparent)` }} />
        {/* Window dots */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {["#e21227", "#fbbf24", "#4ade80"].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c + "80" }} />
          ))}
          <span className="ml-2 text-[8.5px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            {mod.id}.ts — @mr7/sdk
          </span>
        </div>
        <pre className="px-4 py-4 text-[10px] font-mono leading-relaxed overflow-x-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
          {snippet.split("\n").map((line, i) => {
            const isComment = line.trim().startsWith("//");
            const isKeyword = /^(import|const|await|for|async|function)/.test(line.trim());
            const isString = /"[^"]*"/.test(line);
            return (
              <div key={i} style={{ color: isComment ? "#4ade8055" : isKeyword ? "#a78bfa" : "rgba(255,255,255,0.65)" }}>
                {line}
              </div>
            );
          })}
        </pre>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2">
        {["Documentation", "API Reference", "Examples"].map(label => (
          <button
            key={label}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
          >
            <ArrowUpRight className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function TelemetryTab({ mod }: { mod: ArsenalModule }) {
  const [metrics, setMetrics] = useState({
    latency: 48,
    calls: 2847,
    tokens: 148320,
    uptime: 99.8,
    errorRate: 0.3,
    throughput: 312,
  });

  // Simulate live metric updates
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        latency: Math.max(20, Math.min(200, prev.latency + (Math.random() - 0.5) * 10)),
        calls: prev.calls + Math.floor(Math.random() * 3),
        tokens: prev.tokens + Math.floor(Math.random() * 500),
        throughput: Math.max(100, Math.min(600, prev.throughput + (Math.random() - 0.5) * 30)),
      }));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const spark = Array.from({ length: 12 }, () => Math.random() * 80 + 20);

  return (
    <motion.div
      key="telemetry"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="space-y-3"
    >
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-1">
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-2 h-2 rounded-full"
          style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}
        />
        <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: "rgba(74,222,128,0.7)" }}>LIVE TELEMETRY FEED</span>
        <span className="text-[8px] font-mono ml-auto" style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TelemetryCard label="LATENCY" value={Math.round(metrics.latency)} suffix="ms" color="#22d3ee" icon={Activity} spark={spark} progress={100 - metrics.latency / 2} />
        <TelemetryCard label="TOTAL CALLS" value={metrics.calls} color={mod.color} icon={Zap} spark={spark.map(v => v * 1.2)} progress={75} />
        <TelemetryCard label="TOKENS USED" value={metrics.tokens} color="#a78bfa" icon={Hash} spark={spark.map(v => v * 0.9)} progress={60} />
        <TelemetryCard label="UPTIME" value={Math.round(metrics.uptime * 10) / 10} suffix="%" color="#4ade80" icon={TrendingUp} progress={metrics.uptime} />
      </div>

      {/* Status bars */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: "CPU LOAD", value: 34, color: "#22d3ee" },
          { label: "MEMORY", value: 61, color: "#a78bfa" },
          { label: "THROUGHPUT", value: Math.round((metrics.throughput / 600) * 100), color: mod.color },
          { label: "ERROR RATE", value: Math.round(metrics.errorRate * 10), color: "#fbbf24" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-[8px] font-mono w-20 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <motion.div
                animate={{ width: `${s.value}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${s.color}60, ${s.color})` }}
              />
            </div>
            <span className="text-[9px] font-mono w-8 text-right" style={{ color: s.color }}>{s.value}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LogsTab({ mod }: { mod: ArsenalModule }) {
  const initLogs: { level: "info" | "ok" | "warn" | "error"; message: string; ts: string }[] = [
    { level: "ok",   message: `${mod.name} module initialized — runtime ready`,             ts: "00:00:01" },
    { level: "info", message: "Provider handshake complete — streaming enabled",             ts: "00:00:01" },
    { level: "ok",   message: "Context window configured — 200k tokens available",           ts: "00:00:02" },
    { level: "info", message: `Loaded skill manifest from ${mod.source}`,                   ts: "00:00:03" },
    { level: "warn", message: "Rate limit headroom at 78% — monitor usage",                 ts: "00:00:05" },
    { level: "ok",   message: "Cache layer warm — 99.1% hit rate",                         ts: "00:00:06" },
    { level: "info", message: "Session encryption negotiated — AES-256-GCM active",         ts: "00:00:07" },
    { level: "ok",   message: "Telemetry pipeline connected — metrics streaming",            ts: "00:00:08" },
    { level: "info", message: `Tool tag [${mod.tag}] registered in execution registry`,     ts: "00:00:09" },
    { level: "ok",   message: "All systems nominal — awaiting user invocation",              ts: "00:00:10" },
  ];
  const [logs, setLogs] = useState(initLogs);

  useEffect(() => {
    const pool = [
      { level: "info" as const, message: "Heartbeat received — connection alive" },
      { level: "ok"  as const, message: "Inference burst completed — avg 47ms" },
      { level: "warn" as const, message: "Context approaching 60% capacity — compressing" },
      { level: "info" as const, message: "Provider latency spike detected — rerouting" },
      { level: "ok"  as const, message: "Cache warmed — 2,847 entries pre-loaded" },
    ];
    const id = setInterval(() => {
      const entry = pool[Math.floor(Math.random() * pool.length)];
      const ts = new Date().toLocaleTimeString("en", { hour12: false });
      setLogs(prev => [...prev.slice(-18), { ...entry, ts }]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color, boxShadow: `0 0 6px ${mod.color}` }} />
        <span className="text-[8.5px] font-black tracking-widest font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>RUNTIME LOG STREAM</span>
        <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded-md" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>LIVE</span>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(4,4,8,0.95)", border: `1px solid ${mod.color}18`, maxHeight: 340, overflowY: "auto" }}>
        <div className="px-4 py-3 divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <LogLine key={`${i}-${log.ts}`} {...log} />
            ))}
          </AnimatePresence>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-2 h-3.5 ml-1 align-middle"
            style={{ background: mod.color, borderRadius: 1 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── CSS injected once ────────────────────────────────────────────────────────
const DETAIL_CSS = `
  .tool-detail-scrollbar::-webkit-scrollbar { width: 3px; }
  .tool-detail-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .tool-detail-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  .tool-detail-icon-ring { animation: tool-detail-spin 14s linear infinite; }
  @keyframes tool-detail-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes tool-detail-glow-pulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }
  .tool-detail-scan {
    position: absolute; inset-x: 0; height: 1px; pointer-events: none;
    animation: tool-detail-scan-anim 6s linear infinite;
  }
  @keyframes tool-detail-scan-anim {
    0%   { top: 0%;   opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
`;

// ─── Main ToolDetailView component ────────────────────────────────────────────
export function ToolDetailView({ module: mod, onClose, onLaunch, isEnabled }: ToolDetailViewProps) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(mod.id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunch = useCallback(() => {
    onLaunch(mod.id);
    onClose();
  }, [mod.id, onLaunch, onClose]);

  // Keyboard: Escape → close, Enter → launch
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && e.ctrlKey && isEnabled) handleLaunch();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, handleLaunch, isEnabled]);

  const TABS: { id: DetailTab; label: string }[] = [
    { id: "overview",      label: "OVERVIEW" },
    { id: "capabilities",  label: "CAPABILITIES" },
    { id: "integration",   label: "INTEGRATION" },
    { id: "telemetry",     label: "TELEMETRY" },
    { id: "logs",          label: "LOGS" },
  ];

  const Icon = mod.icon;

  const content = (
    <AnimatePresence>
      <motion.div
        key="tool-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(28px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <style dangerouslySetInnerHTML={{ __html: DETAIL_CSS }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 220, damping: 26 }}
          className="relative w-full flex flex-col overflow-hidden"
          style={{
            width: "min(1160px, 96vw)",
            height: "min(820px, 92vh)",
            background: "rgba(7,7,12,0.97)",
            borderRadius: 22,
            border: `1px solid ${mod.border}`,
            boxShadow: `0 0 0 1px ${mod.color}08, 0 0 80px ${mod.glow}, 0 40px 120px rgba(0,0,0,0.95)`,
          }}
        >
          {/* ── Ambient background ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]" style={{ zIndex: 0 }}>
            {/* Top-left neon aurora */}
            <div className="absolute -top-20 -left-20 w-80 h-80" style={{
              background: `radial-gradient(ellipse at 0% 0%, ${mod.color}12 0%, transparent 70%)`,
            }} />
            {/* Bottom-right accent */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64" style={{
              background: `radial-gradient(ellipse at 100% 100%, ${mod.color}08 0%, transparent 70%)`,
            }} />
            {/* Hex grid */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.018 }} preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="tdg" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse">
                  <polygon points="20,2 38,12 38,34 20,44 2,34 2,12" fill="none" stroke={mod.color} strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tdg)" />
            </svg>
            {/* Scan line */}
            <div className="tool-detail-scan" style={{
              background: `linear-gradient(90deg, transparent 0%, ${mod.color}00 15%, ${mod.color}66 50%, ${mod.color}00 85%, transparent 100%)`,
              boxShadow: `0 0 12px ${mod.color}44`,
            }} />
            {/* Corner brackets */}
            {[["top-3","left-3","borderTop","borderLeft","12px 0 0 0"],["top-3","right-3","borderTop","borderRight","0 12px 0 0"],
              ["bottom-3","left-3","borderBottom","borderLeft","0 0 0 12px"],["bottom-3","right-3","borderBottom","borderRight","0 0 12px 0"]
            ].map(([t, l_or_r, b1, b2, br], ci) => (
              <div key={ci} className="absolute w-10 h-10 pointer-events-none"
                style={{
                  [t]: 12, [l_or_r === "right-3" ? "right" : "left"]: 12,
                  [b1]: `1px solid ${mod.color}55`,
                  [b2]: `1px solid ${mod.color}55`,
                  borderRadius: br,
                }}
              />
            ))}
          </div>

          {/* ══════════════════════════════════════════
              HEADER BAR
          ══════════════════════════════════════════ */}
          <div className="relative z-10 flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
            style={{ borderBottom: `1px solid ${mod.color}18`, background: "rgba(0,0,0,0.3)" }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
              <span>ARSENAL HUB</span>
              <ChevronRight className="w-3 h-3" />
              <span style={{ color: mod.color }}>{mod.name}</span>
            </div>

            <div className="flex-1" />

            {/* Live status pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: isEnabled ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${isEnabled ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}` }}>
              <motion.div
                animate={{ opacity: isEnabled ? [1, 0.3, 1] : 0.4 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isEnabled ? "#4ade80" : "#6b7280" }}
              />
              <span className="text-[8px] font-black font-mono tracking-widest"
                style={{ color: isEnabled ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
                {isEnabled ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            {/* Tag pill */}
            <div className="px-2.5 py-1 rounded-full text-[7.5px] font-black font-mono tracking-widest"
              style={{ background: `${mod.color}12`, border: `1px solid ${mod.color}35`, color: mod.color }}>
              {mod.tag}
            </div>

            {/* Close */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* ══════════════════════════════════════════
              BODY — SPLIT PANE
          ══════════════════════════════════════════ */}
          <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

            {/* ── LEFT PANEL — Module identity ── */}
            <div className="w-[280px] flex-shrink-0 flex flex-col overflow-y-auto tool-detail-scrollbar"
              style={{ borderRight: `1px solid ${mod.color}14`, background: "rgba(0,0,0,0.22)" }}>
              <div className="p-5 flex flex-col gap-4">

                {/* Icon with orbital ring */}
                <div className="relative flex items-center justify-center py-4">
                  {/* Outer glow pulse */}
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.55, 0.3] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-28 h-28 rounded-full"
                    style={{ background: `radial-gradient(circle, ${mod.color}22 0%, transparent 70%)` }}
                  />
                  {/* Orbital ring */}
                  <div className="absolute w-24 h-24 rounded-full pointer-events-none tool-detail-icon-ring"
                    style={{ border: `1px dashed ${mod.color}35` }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                      style={{ background: mod.color, boxShadow: `0 0 8px ${mod.color}` }} />
                  </div>
                  {/* Icon box */}
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${mod.color}32 0%, rgba(6,6,10,0.95) 72%)`,
                      border: `1px solid ${mod.border}`,
                      boxShadow: `0 0 32px ${mod.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                    }}>
                    <Icon className="w-8 h-8" style={{ color: mod.color, filter: `drop-shadow(0 0 10px ${mod.color})` }} />
                  </div>
                </div>

                {/* Name + subtitle */}
                <div className="text-center space-y-1.5">
                  <h2 className="text-[18px] font-black leading-tight tracking-tight"
                    style={{ color: "#f1f5f9", textShadow: `0 0 24px ${mod.color}44` }}>
                    {mod.name}
                  </h2>
                  <p className="text-[10.5px] font-mono leading-snug" style={{ color: "rgba(255,255,255,0.42)" }}>
                    {mod.subtitle}
                  </p>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "STATUS", value: isEnabled ? "ON" : "OFF", color: isEnabled ? "#4ade80" : "#6b7280" },
                    { label: "CALLS", value: "2.8K", color: mod.color },
                    { label: "UPTIME", value: "99%", color: "#22d3ee" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2.5 text-center"
                      style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                      <div className="text-[12px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: `${s.color}66` }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                  <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
                    {mod.desc.slice(0, 200)}{mod.desc.length > 200 ? "…" : ""}
                  </p>
                </div>

                {/* Source attribution */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: mod.color, boxShadow: `0 0 5px ${mod.color}` }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[7px] font-mono tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>SOURCE</div>
                    <div className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{mod.source}</div>
                  </div>
                </div>

                {/* Module ID */}
                <button
                  onClick={copyId}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all w-full text-left"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span className="text-[9px] font-mono flex-1 truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
                    {mod.id}
                  </span>
                  {copied ? <CheckCheck className="w-3 h-3 flex-shrink-0" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />}
                </button>
              </div>
            </div>

            {/* ── RIGHT PANEL — Tabbed workspace ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-1 px-4 py-2.5 flex-shrink-0 overflow-x-auto"
                style={{ borderBottom: `1px solid ${mod.color}14`, background: "rgba(0,0,0,0.15)", scrollbarWidth: "none" }}>
                {TABS.map(t => (
                  <GlowTab
                    key={t.id}
                    label={t.label}
                    active={tab === t.id}
                    onClick={() => setTab(t.id)}
                    accent={mod.color}
                  />
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto tool-detail-scrollbar p-5">
                <AnimatePresence mode="wait">
                  {tab === "overview"     && <OverviewTab key="ov" mod={mod} />}
                  {tab === "capabilities" && <CapabilitiesTab key="cap" mod={mod} />}
                  {tab === "integration"  && <IntegrationTab key="int" mod={mod} />}
                  {tab === "telemetry"    && <TelemetryTab key="tel" mod={mod} />}
                  {tab === "logs"         && <LogsTab key="log" mod={mod} />}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              FOOTER — ACTIONS
          ══════════════════════════════════════════ */}
          <div className="relative z-10 flex items-center gap-3 px-5 py-3 flex-shrink-0"
            style={{ borderTop: `1px solid ${mod.color}14`, background: "rgba(0,0,0,0.3)" }}>
            {/* Keyboard hint */}
            <span className="hidden sm:flex items-center gap-1 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
              <kbd className="px-1.5 py-0.5 rounded" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>ESC</kbd>
              close
              <span className="mx-1">·</span>
              <kbd className="px-1.5 py-0.5 rounded" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>Ctrl+↵</kbd>
              launch
            </span>
            <div className="flex-1" />

            {/* Secondary: Close */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[10px] font-black tracking-wider"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}
            >
              CLOSE
            </motion.button>

            {/* Primary: Launch */}
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleLaunch}
              disabled={!isEnabled}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-wider disabled:opacity-25 transition-all"
              style={{
                background: `linear-gradient(135deg, ${mod.color}30, ${mod.color}50)`,
                border: `1px solid ${mod.border}`,
                color: mod.color,
                boxShadow: isEnabled ? `0 0 24px ${mod.glow}, 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)` : "none",
                textShadow: `0 0 12px ${mod.color}80`,
              }}
            >
              <Zap className="w-4 h-4" style={{ filter: `drop-shadow(0 0 6px ${mod.color})` }} />
              LAUNCH MODULE
              <ExternalLink className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
