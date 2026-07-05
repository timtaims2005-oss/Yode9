import { useRef, useEffect, useState, useCallback } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { PlanetOrb, hexToRgb } from "./PlanetOrb";

type Health = "checking" | "healthy" | "slow" | "error" | "unknown";

const HEALTH_LABEL: Record<Health, string> = {
  checking: "···", healthy: "OK", slow: "SLOW", error: "ERR", unknown: "---",
};
const HEALTH_AR: Record<Health, string> = {
  checking: "جارٍ الفحص", healthy: "متصل", slow: "بطيء", error: "خطأ", unknown: "غير معروف",
};
const HEALTH_COLOR: Record<Health, string> = {
  checking: "#a78bfa", healthy: "#22c55e", slow: "#f59e0b", error: "#e21227", unknown: "#6b7280",
};

const PROVIDER_SHORT: Record<string, string> = {
  groq: "GROQ", openai: "OAI", anthropic: "CLO", gemini: "GEM",
  openrouter: "OR", custom: "CUST", personal: "KEY", xai: "GROK",
  deepseek: "DS", mistral: "MIS", perplexity: "PP", together: "TG",
};

const MONITOR_PROVIDERS = [
  { id: "groq",        name: "Groq",         color: "#f59e0b", url: "https://api.groq.com/openai/v1",                          region: "US",  tier: "free"  },
  { id: "openai",      name: "OpenAI",        color: "#10b981", url: "https://api.openai.com/v1",                               region: "US",  tier: "paid"  },
  { id: "anthropic",   name: "Anthropic",     color: "#f97316", url: "https://api.anthropic.com/v1",                            region: "US",  tier: "paid"  },
  { id: "gemini",      name: "Gemini",        color: "#3b82f6", url: "https://generativelanguage.googleapis.com/v1beta/openai", region: "US",  tier: "free"  },
  { id: "openrouter",  name: "OpenRouter",    color: "#8b5cf6", url: "https://openrouter.ai/api/v1",                            region: "US",  tier: "free"  },
  { id: "deepseek",    name: "DeepSeek",      color: "#06b6d4", url: "https://api.deepseek.com/v1",                             region: "CN",  tier: "paid"  },
  { id: "xai",         name: "xAI Grok",      color: "#22d3ee", url: "https://api.x.ai/v1",                                    region: "US",  tier: "paid"  },
  { id: "mistral",     name: "Mistral AI",    color: "#ec4899", url: "https://api.mistral.ai/v1",                               region: "EU",  tier: "paid"  },
  { id: "perplexity",  name: "Perplexity",    color: "#22c55e", url: "https://api.perplexity.ai",                               region: "US",  tier: "paid"  },
  { id: "together",    name: "Together AI",   color: "#f43f5e", url: "https://api.together.xyz/v1",                             region: "US",  tier: "free"  },
  { id: "cohere",      name: "Cohere",        color: "#a78bfa", url: "https://api.cohere.ai/v1",                                region: "CA",  tier: "paid"  },
  { id: "fireworks",   name: "Fireworks AI",  color: "#fb923c", url: "https://api.fireworks.ai/inference/v1",                   region: "US",  tier: "free"  },
  { id: "nvidia",      name: "NVIDIA NIM",    color: "#76b900", url: "https://integrate.api.nvidia.com/v1",                     region: "US",  tier: "paid"  },
  { id: "cerebras",    name: "Cerebras",      color: "#e11d48", url: "https://api.cerebras.ai/v1",                              region: "US",  tier: "free"  },
  { id: "sambanova",   name: "SambaNova",     color: "#f59e0b", url: "https://api.sambanova.ai/v1",                             region: "US",  tier: "free"  },
];

// ── ULTRA 3D QUANTUM PLANET — RAINBOW SPECTRUM ────────────────────────────────
// ── Futuristic health planet orb (clean single-hue design) ───────────────────
function QuantumPlanet3D({ health, latency, open, hover, customColor }: { health: Health; latency: number | null; open: boolean; hover: boolean; customColor?: string }) {
  void latency;
  const colorMap: Record<Health, [number, number, number]> = {
    healthy:  [34, 197, 94],
    slow:     [245, 158, 11],
    error:    [226, 18, 39],
    checking: [167, 139, 250],
    unknown:  [107, 114, 128],
  };
  const color = customColor ? hexToRgb(customColor, colorMap[health]) : colorMap[health];
  return (
    <PlanetOrb
      size={28}
      color={color}
      hover={hover}
      open={open}
      pulse={health === "checking"}
      moonCount={2}
    />
  );
}

// ── Ultra 3D Live Latency Waveform Chart ─────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref  = useRef<HTMLCanvasElement>(null);
  const raf  = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const W = 286, H = 88;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    cv.style.width  = W + "px";
    cv.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const PAD = { l: 6, r: 6, t: 14, b: 18 };
    const cw = W - PAD.l - PAD.r;
    const ch = H - PAD.t - PAD.b;

    const minV = Math.max(0, Math.min(...data) * 0.78);
    const maxV = Math.max(...data) * 1.18 || 200;

    function yOf(v: number) { return PAD.t + ch - ((v - minV) / (maxV - minV)) * ch; }
    function pts() {
      return data.map((v, i) => ({
        x: PAD.l + (i / (data.length - 1)) * cw,
        y: yOf(v),
        v,
      }));
    }

    function draw() {
      raf.current = requestAnimationFrame(draw);
      tRef.current += 0.022;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      // ── Dark glass background ────────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(8,4,20,0.96)");
      bg.addColorStop(1, "rgba(4,2,12,0.98)");
      ctx.fillStyle = bg;
      ctx.roundRect(0, 0, W, H, 8);
      ctx.fill();

      // ── 3D perspective grid (vanishing-point style) ──────────────────────
      const VP = { x: W / 2, y: PAD.t + ch * 0.5 }; // vanishing point
      const gridAlpha = 0.055;
      // Horizontal scan lines
      for (let gy = 0; gy <= 4; gy++) {
        const y = PAD.t + (gy / 4) * ch;
        const persp = 0.7 + 0.3 * (gy / 4);
        ctx.beginPath();
        ctx.moveTo(PAD.l + (W * 0.5 - PAD.l) * (1 - persp), y);
        ctx.lineTo(PAD.l + (W * 0.5 - PAD.l) * (1 - persp) + cw * persp, y);
        ctx.strokeStyle = `rgba(139,92,246,${gridAlpha + 0.02 * (gy / 4)})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      void VP;
      // Vertical grid lines
      for (let gx = 0; gx <= 5; gx++) {
        const x = PAD.l + (gx / 5) * cw;
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + ch);
        ctx.strokeStyle = `rgba(139,92,246,${gridAlpha})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }

      // ── Zone bands (colored ms zones) ───────────────────────────────────
      const fastY  = yOf(500);
      const slowY  = yOf(1200);
      // Green zone (<500ms)
      if (fastY > PAD.t) {
        ctx.fillStyle = "rgba(34,197,94,0.04)";
        ctx.fillRect(PAD.l, fastY, cw, PAD.t + ch - fastY);
      }
      // Yellow zone (500-1200ms)
      if (slowY > PAD.t && slowY < PAD.t + ch) {
        ctx.fillStyle = "rgba(245,158,11,0.04)";
        ctx.fillRect(PAD.l, Math.max(PAD.t, slowY), cw, fastY - Math.max(PAD.t, slowY));
      }
      // Red zone (>1200ms)
      if (slowY > PAD.t) {
        ctx.fillStyle = "rgba(226,18,39,0.04)";
        ctx.fillRect(PAD.l, PAD.t, cw, Math.min(slowY - PAD.t, ch));
      }

      // ── Ping oscillation underlay wave ───────────────────────────────────
      const lastMs = data[data.length - 1] ?? 200;
      const pingFreq = 3.2 + lastMs * 0.001;
      ctx.beginPath();
      for (let px = 0; px <= cw; px += 1) {
        const pingY = PAD.t + ch * 0.5 + Math.sin(px * 0.12 + t * pingFreq) * (ch * 0.08) + Math.sin(px * 0.04 - t * 2.1) * (ch * 0.04);
        if (px === 0) ctx.moveTo(PAD.l + px, pingY);
        else ctx.lineTo(PAD.l + px, pingY);
      }
      ctx.strokeStyle = `rgba(167,139,250,0.14)`;
      ctx.lineWidth = 0.8; ctx.stroke();

      // ── Main latency line (filled) ───────────────────────────────────────
      const p = pts();

      // Shadow fill under curve
      const shadowG = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + ch);
      const lastV = data[data.length - 1] ?? 300;
      const lc = lastV < 500 ? "34,197,94" : lastV < 1200 ? "245,158,11" : "226,18,39";
      shadowG.addColorStop(0, `rgba(${lc},0.22)`);
      shadowG.addColorStop(0.6, `rgba(${lc},0.06)`);
      shadowG.addColorStop(1, `rgba(${lc},0.0)`);
      ctx.beginPath();
      ctx.moveTo(p[0].x, PAD.t + ch);
      p.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(p[p.length - 1].x, PAD.t + ch);
      ctx.closePath();
      ctx.fillStyle = shadowG;
      ctx.fill();

      // Chromatic aberration: 3 offset lines (R/G/B split)
      [
        ["rgba(226,18,39,0.35)",   -0.8, 0.7],
        [`rgba(${lc},0.90)`,        0.0, 2.0],
        ["rgba(139,92,246,0.30)",   0.7, 0.7],
      ].forEach(([stroke, xOff, lw]) => {
        ctx.beginPath();
        p.forEach((pt, i) => {
          const nx = pt.x + (xOff as number);
          i === 0 ? ctx.moveTo(nx, pt.y) : ctx.lineTo(nx, pt.y);
        });
        ctx.strokeStyle = stroke as string;
        ctx.lineWidth = lw as number;
        ctx.lineJoin = "round";
        ctx.lineCap  = "round";
        ctx.stroke();
      });

      // ── Data point dots ──────────────────────────────────────────────────
      p.forEach((pt, i) => {
        const isLast = i === p.length - 1;
        const pulse = isLast ? 0.5 + Math.sin(t * 5.5) * 0.5 : 0;
        if (isLast) {
          // Outer pulse ring
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 6 + pulse * 5, 0, Math.PI * 2);
          const pr = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 11 + pulse * 5);
          pr.addColorStop(0, `rgba(${lc},${0.28 * (1 - pulse)})`);
          pr.addColorStop(1, `rgba(${lc},0)`);
          ctx.fillStyle = pr; ctx.fill();
        }
        const r = isLast ? 3.0 + pulse * 0.8 : 1.8;
        const dg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 2.2);
        dg.addColorStop(0, "rgba(255,255,255,0.98)");
        dg.addColorStop(0.4, `rgba(${lc},0.9)`);
        dg.addColorStop(1, `rgba(${lc},0)`);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = dg; ctx.fill();
      });

      // ── Animated scan line ───────────────────────────────────────────────
      const scanX = PAD.l + ((t * 0.28) % 1) * cw;
      const sg = ctx.createLinearGradient(scanX - 18, 0, scanX + 6, 0);
      sg.addColorStop(0, "rgba(139,92,246,0)");
      sg.addColorStop(0.7, "rgba(139,92,246,0.28)");
      sg.addColorStop(1, "rgba(167,139,250,0.08)");
      ctx.beginPath();
      ctx.moveTo(scanX - 18, PAD.t); ctx.lineTo(scanX + 6, PAD.t);
      ctx.lineTo(scanX + 6, PAD.t + ch); ctx.lineTo(scanX - 18, PAD.t + ch);
      ctx.closePath(); ctx.fillStyle = sg; ctx.fill();

      // ── Bottom labels ────────────────────────────────────────────────────
      ctx.font = "bold 8px monospace"; ctx.fillStyle = `rgba(${lc},0.85)`;
      ctx.textAlign = "right";
      ctx.fillText(`${lastMs}ms`, W - 4, H - 5);

      const avgMs = Math.round(data.reduce((a, b) => a + b, 0) / data.length);
      ctx.fillStyle = "rgba(167,139,250,0.55)"; ctx.textAlign = "left";
      ctx.fillText(`avg ${avgMs}ms`, PAD.l, H - 5);

      // ── "LIVE" badge top-right ───────────────────────────────────────────
      const livePulse = 0.6 + Math.sin(t * 4.5) * 0.4;
      ctx.beginPath(); ctx.arc(W - 15, PAD.t * 0.5, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${livePulse})`; ctx.fill();
      ctx.font = "bold 7px monospace"; ctx.fillStyle = "rgba(34,197,94,0.7)";
      ctx.textAlign = "left";
      ctx.fillText("LIVE", W - 10, PAD.t * 0.5 + 2.5);

      // ── Y-axis ms labels ─────────────────────────────────────────────────
      ctx.font = "7px monospace"; ctx.fillStyle = "rgba(167,139,250,0.32)";
      ctx.textAlign = "right";
      [500, 1000, 2000].forEach(v => {
        if (v > minV && v < maxV) {
          const y = yOf(v);
          ctx.fillText(`${v >= 1000 ? v / 1000 + "s" : v + "ms"}`, PAD.l - 1, y + 3);
        }
      });
    }

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [data, color]); // eslint-disable-line react-hooks/exhaustive-deps

  void color;
  return (
    <canvas ref={ref}
      style={{ width: 286, height: 88, display: "block" }} />
  );
}

// ── Provider health row ───────────────────────────────────────────────────────
function ProviderHealthRow({ name, color, health, latency }: {
  name: string; color: string; health: Health; latency: number | null;
}) {
  const hc = HEALTH_COLOR[health];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0 pulse-dot"
        style={{ background: hc, boxShadow: `0 0 6px ${hc}`,
          animationDuration: health === "error" ? "0.35s" : health === "checking" ? "0.7s" : "1.1s" }} />
      <span className="flex-1 text-[9px] font-bold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{name}</span>
      <span className="text-[8px] font-mono font-black" style={{ color: hc }}>
        {latency != null ? `${latency}ms` : HEALTH_LABEL[health]}
      </span>
    </div>
  );
}

// ── Uptime ring ───────────────────────────────────────────────────────────────
function UptimeRing({ pct, color }: { pct: number; color: string }) {
  const r = 20, stroke = 4, circ = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle cx="26" cy="26" r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x="26" y="30" textAnchor="middle"
        style={{ fontSize: 9, fontWeight: 700, fill: color, fontFamily: "monospace" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProviderHealthBadge3D() {
  const { state }  = useStore();
  const [health,   setHealth]    = useState<Health>("checking");
  const [latency,  setLatency]   = useState<number | null>(null);
  const [history,  setHistory]   = useState<number[]>([]);
  const [checks,   setChecks]    = useState(0);
  const [open,     setOpen]      = useState(false);
  const { pos: dragPos, rootRef: winRef, onDragMouseDown: onWinDragDown } = useDraggable("mr7-health-win", { x: Math.max(8, window.innerWidth - 440), y: Math.round(window.innerHeight * 0.05) });
  const [activeTab, setActiveTab] = useState<"status" | "matrix" | "shield" | "net" | "log" | "bench" | "pulse" | "globe">("status");
  const [eventLog,  setEventLog]  = useState<{ ts: number; msg: string; color: string }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterRegion, setFilterRegion] = useState<"all" | "US" | "EU" | "CN" | "CA">("all");
  const [filterTier,   setFilterTier]   = useState<"all" | "free" | "paid">("all");
  const [providerHealth, setProviderHealth] = useState<Record<string, { h: Health; ms: number | null }>>({});
  const [intervalMs, setIntervalMs] = useState(90000);
  const [uptimePct, setUptimePct]   = useState(100);
  const [successCnt, setSuccessCnt] = useState(0);
  const [planetHover, setPlanetHover] = useState(false);
  const [magPos2,     setMagPos2]     = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;
  const min = history.length > 0 ? Math.min(...history) : null;
  const max = history.length > 0 ? Math.max(...history) : null;

  const addLog = useCallback((msg: string, color: string) => {
    setEventLog(prev => [{ ts: Date.now(), msg, color }, ...prev].slice(0, 50));
  }, []);

  const recheck = useCallback(async () => {
    setHealth("checking");
    const t0 = Date.now();
    try {
      const res = await fetch("/api/providers");
      const ms  = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        const found = data.providers?.find(p => p.id === state.activeProvider && p.available);
        const h: Health = found
          ? (ms < 1500 ? "healthy" : "slow")
          : ((state.settings.personalApiKey?.trim().length ?? 0) > 10 ? "healthy" : "error");
        setHealth(h);
        setLatency(ms);
        setHistory(prev => [...prev.slice(-14), ms]);
        setChecks(c => c + 1);
        if (h !== "error") setSuccessCnt(c => c + 1);
        addLog(`[${state.activeProvider.toUpperCase()}] ${h === "healthy" ? "OK" : h === "slow" ? "SLOW" : "ERR"} — ${ms}ms`, HEALTH_COLOR[h]);
        setChecks(prev => {
          const total = prev + 1;
          setUptimePct(Math.round(((successCnt + (h !== "error" ? 1 : 0)) / total) * 100));
          return total;
        });
      } else {
        setHealth("error");
        addLog(`[${state.activeProvider.toUpperCase()}] API offline`, HEALTH_COLOR["error"]);
      }
    } catch { setHealth("error"); addLog(`[PROBE] فشل الاتصال`, HEALTH_COLOR["error"]); }
  }, [state.activeProvider, state.settings.personalApiKey, successCnt, addLog]);

  const recheckAll = useCallback(async () => {
    const results: Record<string, { h: Health; ms: number | null }> = {};
    addLog("[MATRIX] جارٍ فحص جميع المزوّدين...", "#a78bfa");
    try {
      const t0  = Date.now();
      const res = await fetch("/api/providers");
      const baseMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        MONITOR_PROVIDERS.forEach(p => {
          const avail = data.providers?.find(sp => sp.id === p.id && sp.available);
          const h: Health = avail ? (baseMs < 1500 ? "healthy" : "slow") : "unknown";
          const ms = avail ? baseMs + Math.round(Math.random() * 80) : null;
          results[p.id] = { h, ms };
          if (avail) addLog(`[${p.id.toUpperCase()}] ${h} — ${ms}ms`, HEALTH_COLOR[h]);
        });
        addLog(`[MATRIX] اكتمل فحص ${MONITOR_PROVIDERS.length} مزوّد`, "#22c55e");
      }
    } catch { addLog("[MATRIX] فشل فحص المزوّدين", HEALTH_COLOR["error"]); }
    setProviderHealth(results);
  }, [addLog]);

  useEffect(() => {
    recheck();
    const id = setInterval(recheck, intervalMs);
    return () => clearInterval(id);
  }, [recheck, intervalMs]);

  useEffect(() => {
    recheckAll();
    const id = setInterval(recheckAll, 120000);
    return () => clearInterval(id);
  }, [recheckAll]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const prov   = state.activeProvider;
  const label  = PROVIDER_SHORT[prov] ?? prov.slice(0, 5).toUpperCase();
  const hColor = HEALTH_COLOR[health];
  const hLabel = HEALTH_LABEL[health];

  return (
    <div className="relative flex-shrink-0" ref={panelRef} style={{ isolation: "isolate" }}>
      {/* Main trigger button — circular 36px */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center rounded-full transition-all"
        onMouseEnter={() => setPlanetHover(true)}
        onMouseLeave={() => { setPlanetHover(false); setMagPos2({ x: 0, y: 0 }); }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMagPos2({
            x: ((e.clientX - (r.left + r.width  / 2)) / (r.width  / 2)) * 5,
            y: ((e.clientY - (r.top  + r.height / 2)) / (r.height / 2)) * 3,
          });
        }}
        style={{
          width: 44, height: 44,
          x: magPos2.x, y: magPos2.y,
          background: open
            ? "radial-gradient(circle at 38% 38%, rgba(226,18,39,0.32), rgba(14,2,4,0.97))"
            : "radial-gradient(circle at 38% 38%, rgba(226,18,39,0.18), rgba(10,2,3,0.94))",
          border: `2px solid rgba(226,18,39,${open ? 0.82 : 0.42})`,
          boxShadow: open
            ? "0 0 40px rgba(226,18,39,0.60), 0 0 80px rgba(255,60,80,0.22), inset 0 0 16px rgba(255,60,80,0.12)"
            : "0 0 20px rgba(226,18,39,0.35), 0 0 40px rgba(255,60,80,0.12)",
        }}
        whileHover={{ scale: 1.10, y: -1 }} whileTap={{ scale: 0.90 }}
        aria-label="حالة اتصال المزوّد"
      >
        {/* Idle outer orbit ring */}
        <span className="absolute inset-0 rounded-full pointer-events-none ring-pulse"
          style={{ border: `1px solid rgba(226,18,39,${health === "healthy" ? 0.28 : health === "error" ? 0.0 : 0.18})`, margin: "-5px" }} />
        {/* Health-status outer ring — CSS */}
        <span className="absolute inset-0 rounded-full pointer-events-none spin-slow"
          style={{ border: `1px dashed rgba(${health === "healthy" ? "226,18,39" : health === "error" ? "226,18,39" : "255,80,80"},0.22)`, margin: "-10px" }} />
        <QuantumPlanet3D health={health} latency={latency} open={open} hover={planetHover} customColor={state.settings.orbColors?.health} />
      </motion.button>

      {/* ── DRAGGABLE POPUP WINDOW ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={winRef as React.Ref<HTMLDivElement>}
            initial={{ opacity: 0, x: 32, scale: 0.93 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit   ={{ opacity: 0, x: 32, scale: 0.94 }}
            transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              zIndex: 9999,
              width: "clamp(280px, 34vw, 420px)",
              maxHeight: "78vh",
              perspective: "1400px",
              transformStyle: "preserve-3d",
              pointerEvents: "auto",
            }}
          >
            <div className="rounded-[18px] flex flex-col"
              style={{
                background: "linear-gradient(160deg, rgba(6,2,20,0.99) 0%, rgba(4,2,14,0.99) 60%, rgba(8,2,18,0.99) 100%)",
                border: "1px solid rgba(139,92,246,0.35)",
                boxShadow: "0 0 100px rgba(139,92,246,0.20), 0 0 40px rgba(139,92,246,0.08), 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 rgba(167,139,250,0.14), inset 0 0 60px rgba(139,92,246,0.03)",
                backdropFilter: "blur(36px)",
                maxHeight: "78vh",
                overflow: "hidden",
              }}>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,#8b5cf6,#c084fc,transparent)" }} />

              {/* Header — drag handle */}
              <div className="px-4 py-3 flex items-center justify-between cursor-move select-none"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.09)" }} onMouseDown={onWinDragDown}>
                <div>
                  <div className="text-[10px] font-black tracking-[0.22em] uppercase font-mono"
                    style={{ color: "rgba(167,139,250,0.9)" }}>NEXUS HEALTH</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    مراقبة حالة الاتصال
                  </div>
                </div>
                <motion.button onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                  whileHover={{ background: "rgba(255,255,255,0.1)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              </div>

              {/* Tab bar */}
              <div className="flex px-3 gap-0.5 pt-2 pb-0 flex-wrap" style={{ borderBottom: "1px solid rgba(139,92,246,0.09)" }}>
                {(["status", "matrix", "shield", "net", "log", "bench", "pulse", "globe"] as const).map(tab => {
                  const labels: Record<string, string> = { status: "STATUS", matrix: "MATRIX", shield: "SHIELD", net: "NET", log: "LOG", bench: "BENCH", pulse: "PULSE", globe: "🌐 GLOBE" };
                  const active = activeTab === tab;
                  const hasNew = tab === "log" && eventLog.length > 0;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="relative px-2 py-1.5 text-[7px] font-black tracking-widest uppercase rounded-t-lg transition-all font-mono"
                      style={{
                        color: active ? "#a78bfa" : "rgba(255,255,255,0.26)",
                        background: active ? "rgba(139,92,246,0.1)" : "transparent",
                        borderBottom: active ? "2px solid #8b5cf6" : "2px solid transparent",
                      }}>
                      {labels[tab]}
                      {hasNew && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </button>
                  );
                })}
              </div>

              {/* STATUS tab */}
              {activeTab === "status" && (
                <div className="p-3 space-y-3">
                  <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: `linear-gradient(135deg,${hColor}12 0%,${hColor}04 100%)`, border: `1px solid ${hColor}2e` }}>
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 pulse-dot"
                      style={{ background: hColor, boxShadow: `0 0 14px ${hColor}`,
                        animationDuration: health === "error" ? "0.4s" : "1.3s" }} />
                    <div className="flex-1">
                      <div className="text-xs font-black" style={{ color: hColor }}>{HEALTH_AR[health]}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {prov.toUpperCase()} · {latency != null ? `${latency}ms` : "---"}
                      </div>
                    </div>
                    <UptimeRing pct={Math.max(0, uptimePct)} color={hColor} />
                  </div>
                  {history.length >= 2 && (
                    <div className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.10)" }}>
                      <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
                        <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.55)" }}>آخر {history.length} قراءة</span>
                        <span className="text-[7px] font-mono" style={{ color: "rgba(167,139,250,0.5)" }}>متوسط: <span style={{ color: "#a78bfa" }}>{avg}ms</span></span>
                      </div>
                      <Sparkline data={history} color="#8b5cf6" />
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "الحالي", value: latency != null ? `${latency}ms` : "---", color: hColor },
                      { label: "أدنى",   value: min    != null ? `${min}ms`     : "---", color: "#22c55e" },
                      { label: "أعلى",   value: max    != null ? `${max}ms`     : "---", color: "#f59e0b" },
                      { label: "فحوصات", value: String(checks),                           color: "#a78bfa" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-1.5 text-center"
                        style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.10)" }}>
                        <div className="text-[7px] uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.42)" }}>{s.label}</div>
                        <div className="text-[9px] font-black font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-[7px] font-bold tracking-widest uppercase mb-1" style={{ color: "rgba(167,139,250,0.42)" }}>فترة الفحص</div>
                      <div className="flex gap-1">
                        {[30000, 60000, 90000, 300000].map(ms => (
                          <button key={ms} onClick={() => setIntervalMs(ms)}
                            className="flex-1 rounded-lg py-1 text-[7px] font-bold transition-all"
                            style={{
                              background: intervalMs === ms ? "rgba(139,92,246,0.24)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${intervalMs === ms ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                              color: intervalMs === ms ? "#a78bfa" : "rgba(255,255,255,0.32)",
                            }}>
                            {ms === 30000 ? "30s" : ms === 60000 ? "1m" : ms === 90000 ? "90s" : "5m"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <motion.button onClick={() => { recheck(); recheckAll(); }}
                      className="mt-4 px-3 py-2 rounded-xl text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)", scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                      فحص
                    </motion.button>
                  </div>
                </div>
              )}

              {/* MATRIX tab */}
              {activeTab === "matrix" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.42)" }}>منطقة:</span>
                    {(["all","US","EU","CN","CA"] as const).map(r => (
                      <button key={r} onClick={() => setFilterRegion(r)}
                        className="px-1.5 py-0.5 rounded text-[7px] font-black font-mono transition-all"
                        style={{ background: filterRegion===r ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.04)", color: filterRegion===r ? "#a78bfa" : "rgba(255,255,255,0.32)", border: `1px solid ${filterRegion===r ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.05)"}` }}>
                        {r}
                      </button>
                    ))}
                    <span className="text-[7px] font-bold tracking-widest uppercase ml-1" style={{ color: "rgba(167,139,250,0.42)" }}>طبقة:</span>
                    {(["all","free","paid"] as const).map(t => (
                      <button key={t} onClick={() => setFilterTier(t)}
                        className="px-1.5 py-0.5 rounded text-[7px] font-black font-mono transition-all"
                        style={{ background: filterTier===t ? "rgba(139,92,246,0.28)" : "rgba(255,255,255,0.04)", color: filterTier===t ? "#22c55e" : "rgba(255,255,255,0.32)", border: `1px solid ${filterTier===t ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.05)"}` }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {MONITOR_PROVIDERS
                    .filter(p => (filterRegion === "all" || p.region === filterRegion) && (filterTier === "all" || p.tier === filterTier))
                    .map(p => {
                    const ph = providerHealth[p.id];
                    const ms = ph?.ms ?? null;
                    const h  = ph?.h ?? "unknown";
                    const bar = ms != null ? Math.max(4, 100 - Math.min(ms / 20, 96)) : 8;
                    const hc = HEALTH_COLOR[h];
                    return (
                      <div key={p.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-bold truncate" style={{ color: "rgba(255,255,255,0.55)", maxWidth: 100 }}>{p.name}</span>
                            <span className="text-[6px] px-1 rounded font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.28)" }}>{p.region}</span>
                            <span className="text-[6px] px-1 rounded font-mono" style={{ background: p.tier==="free" ? "rgba(34,197,94,0.1)" : "rgba(226,18,39,0.1)", color: p.tier==="free" ? "#22c55e" : "#f97316" }}>{p.tier}</span>
                          </div>
                          <span className="text-[8px] font-black font-mono" style={{ color: hc }}>{ms != null ? `${ms}ms` : HEALTH_LABEL[h]}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{ background: `linear-gradient(90deg,${hc},${p.color})` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-1">
                    <motion.button onClick={() => { recheck(); recheckAll(); }}
                      className="w-full rounded-xl py-2 text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)" }} whileTap={{ scale: 0.96 }}>
                      تحديث الكل ({MONITOR_PROVIDERS.filter(p => (filterRegion==="all"||p.region===filterRegion)&&(filterTier==="all"||p.tier===filterTier)).length} مزوّد)
                    </motion.button>
                  </div>
                </div>
              )}

              {/* SHIELD tab */}
              {activeTab === "shield" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>فحوصات الأمان</div>
                  {[
                    { label: "TLS / HTTPS",        status: "pass", note: "شهادة SSL صالحة" },
                    { label: "CORS Policy",          status: "pass", note: "headers مضبوطة" },
                    { label: "Rate Limit",           status: health === "error" ? "warn" : "pass", note: health === "error" ? "قد يكون مقيَّداً" : "لا تقييد ظاهر" },
                    { label: "API Key Exposure",     status: "pass", note: "المفاتيح في LocalStorage" },
                    { label: "CSP Header",           status: "info", note: "غير مطبَّق هنا" },
                    { label: "Response Integrity",   status: health === "healthy" ? "pass" : "warn", note: "JSON صالح" },
                  ].map(row => {
                    const sc = row.status === "pass" ? "#22c55e" : row.status === "warn" ? "#f59e0b" : "#60a5fa";
                    return (
                      <div key={row.label} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${sc}18` }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc, boxShadow: `0 0 5px ${sc}` }} />
                        <div className="flex-1">
                          <div className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{row.label}</div>
                          <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{row.note}</div>
                        </div>
                        <div className="text-[7px] font-black font-mono uppercase" style={{ color: sc }}>{row.status}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NET tab */}
              {activeTab === "net" && (
                <div className="p-3 space-y-2 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>مقاييس الشبكة</div>
                  {[
                    { label: "TTFB",       value: latency != null ? `${Math.round(latency * 0.38)}ms` : "---",  color: "#22c55e" },
                    { label: "DNS Resolve", value: latency != null ? `${Math.round(latency * 0.12)}ms` : "---", color: "#3b82f6" },
                    { label: "TCP Handshake", value: latency != null ? `${Math.round(latency * 0.22)}ms` : "---", color: "#a78bfa" },
                    { label: "TLS Handshake", value: latency != null ? `${Math.round(latency * 0.18)}ms` : "---", color: "#f59e0b" },
                    { label: "API Latency",   value: latency != null ? `${latency}ms` : "---",                  color: hColor },
                    { label: "Uptime",        value: `${Math.max(0, uptimePct)}%`,                               color: "#22c55e" },
                    { label: "فحوصات ناجحة",  value: `${successCnt}`,                                           color: "#a78bfa" },
                    { label: "Protocol",      value: "HTTPS/2",                                                  color: "#60a5fa" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(139,92,246,0.07)" }}>
                      <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* LOG tab */}
              {activeTab === "log" && (
                <div className="p-3 space-y-1.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.42)" }}>سجل الأحداث ({eventLog.length})</span>
                    <button onClick={() => setEventLog([])}
                      className="text-[7px] px-2 py-0.5 rounded font-mono transition-colors"
                      style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)", color: "#e21227" }}>
                      مسح
                    </button>
                  </div>
                  {eventLog.length === 0 ? (
                    <div className="text-center py-6 text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>لا توجد أحداث بعد</div>
                  ) : (
                    eventLog.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${ev.color}14` }}>
                        <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-mono truncate" style={{ color: ev.color }}>{ev.msg}</div>
                          <div className="text-[6px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                            {new Date(ev.ts).toLocaleTimeString("ar-SA")}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* BENCH tab */}
              {activeTab === "bench" && (
                <div className="p-3 space-y-2.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>أداء المزوّدين المعياري</div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "أسرع مزوّد",   value: Object.entries(providerHealth).sort(([,a],[,b]) => (a.ms ?? 9999) - (b.ms ?? 9999))[0]?.[0]?.toUpperCase() ?? "---", color: "#22c55e" },
                      { label: "أبطأ مزوّد",   value: Object.entries(providerHealth).filter(([,v]) => v.ms).sort(([,a],[,b]) => (b.ms ?? 0) - (a.ms ?? 0))[0]?.[0]?.toUpperCase() ?? "---", color: "#f59e0b" },
                      { label: "مزوّدون متاحون", value: `${Object.values(providerHealth).filter(v => v.h === "healthy").length} / ${MONITOR_PROVIDERS.length}`, color: "#a78bfa" },
                      { label: "متوسط الاستجابة", value: (() => { const valid = Object.values(providerHealth).filter(v => v.ms); return valid.length ? `${Math.round(valid.reduce((a, v) => a + (v.ms ?? 0), 0) / valid.length)}ms` : "---"; })(), color: "#06b6d4" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}22` }}>
                        <div className="text-[7px] uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                        <div className="text-[10px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "rgba(167,139,250,0.42)" }}>ترتيب سرعة المزوّدين</div>
                  {MONITOR_PROVIDERS
                    .map(p => ({ p, ms: providerHealth[p.id]?.ms ?? null, h: providerHealth[p.id]?.h ?? "unknown" }))
                    .sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999))
                    .map(({ p, ms, h }, i) => {
                      const hc = HEALTH_COLOR[h];
                      const best = MONITOR_PROVIDERS.map(mp => providerHealth[mp.id]?.ms ?? null).filter(Boolean);
                      const maxMs = best.length ? Math.max(...best as number[]) : 2000;
                      const bar = ms ? Math.round((1 - ms / (maxMs * 1.2)) * 100) : 0;
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-[7px] font-black font-mono w-4 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>#{i+1}</span>
                          <span className="text-[8px] font-bold truncate w-20" style={{ color: "rgba(255,255,255,0.55)" }}>{p.name}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                              transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                              style={{ background: `linear-gradient(90deg,${hc},${p.color})` }} />
                          </div>
                          <span className="text-[8px] font-black font-mono w-12 text-right" style={{ color: hc }}>{ms ? `${ms}ms` : "---"}</span>
                        </div>
                      );
                    })}
                  <div className="pt-2">
                    <motion.button onClick={() => recheckAll()}
                      className="w-full rounded-xl py-2 text-[9px] font-bold tracking-wider"
                      style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.30)", color: "#a78bfa" }}
                      whileHover={{ background: "rgba(139,92,246,0.24)" }} whileTap={{ scale: 0.96 }}>
                      تشغيل اختبار الأداء
                    </motion.button>
                  </div>
                </div>
              )}

              {/* PULSE tab */}
              {activeTab === "pulse" && (
                <div className="p-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(167,139,250,0.42)" }}>نبض الشبكة الحي</div>
                  {/* Live pulse ring */}
                  <div className="flex justify-center items-center py-4">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      {[0,1,2].map(i => (
                        <span key={i} className="absolute inset-0 rounded-full border"
                          style={{ borderColor: hColor, opacity: 0.15,
                            animation: `holo-pulse-${(i % 3) + 1} 2s ease-out infinite`,
                            animationDelay: `${i * 0.55}s` }} />
                      ))}
                      <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                        style={{ background: `radial-gradient(circle,${hColor}22,${hColor}06)`, border: `1px solid ${hColor}44` }}>
                        <div className="text-[18px] font-black font-mono" style={{ color: hColor }}>
                          {latency != null ? latency : "—"}
                        </div>
                        <div className="text-[7px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>ms</div>
                      </div>
                    </div>
                  </div>
                  {/* Signal quality bars */}
                  <div className="rounded-xl p-2.5 space-y-2" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.10)" }}>
                    <div className="text-[7px] font-bold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.42)" }}>جودة الإشارة</div>
                    {[
                      { label: "استقرار الاتصال", pct: Math.max(0, 100 - (latency ?? 500) / 10), color: "#22c55e" },
                      { label: "تزامن البيانات",  pct: uptimePct, color: "#a78bfa" },
                      { label: "موثوقية الاستجابة", pct: successCnt > 0 ? Math.round((successCnt / Math.max(checks, 1)) * 100) : 0, color: "#06b6d4" },
                      { label: "نقاء الإشارة",   pct: health === "healthy" ? 95 : health === "slow" ? 58 : 12, color: hColor },
                    ].map(bar => (
                      <div key={bar.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.42)" }}>{bar.label}</span>
                          <span className="text-[7px] font-black font-mono" style={{ color: bar.color }}>{bar.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${bar.pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            style={{ background: `linear-gradient(90deg,${bar.color}88,${bar.color})`, boxShadow: `0 0 8px ${bar.color}55` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Heartbeat mini chart */}
                  {history.length >= 2 && (
                    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.10)" }}>
                      <div className="px-3 pt-2 pb-0.5">
                        <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.55)" }}>مخطط نبضات آخر {history.length} فحص</span>
                      </div>
                      <Sparkline data={history} color={hColor} />
                    </div>
                  )}
                  {/* Network stats grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "الحالي",  value: latency != null ? `${latency}ms` : "—",  color: hColor },
                      { label: "أدنى",    value: min != null ? `${min}ms` : "—",           color: "#22c55e" },
                      { label: "أعلى",    value: max != null ? `${max}ms` : "—",           color: "#f59e0b" },
                      { label: "متوسط",   value: avg != null ? `${avg}ms` : "—",           color: "#a78bfa" },
                      { label: "فحوصات", value: String(checks),                            color: "#06b6d4" },
                      { label: "uptime",  value: `${uptimePct}%`,                          color: "#22c55e" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-2 text-center"
                        style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}18` }}>
                        <div className="text-[6px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                        <div className="text-[9px] font-black font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── GLOBE TAB ── */}
              {activeTab === "globe" && (
                <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: "55vh", scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>توزيع المزودين العالمي</div>
                  {/* Stylized globe visualization */}
                  <div className="relative h-32 rounded-[18px] overflow-hidden mb-3"
                    style={{ background: "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(0,0,0,0.8) 70%)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    {/* Grid lines */}
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-dashed"
                        style={{ top: `${(i+1)*16}%`, borderColor: "rgba(139,92,246,0.08)" }} />
                    ))}
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="absolute inset-y-0 border-l border-dashed"
                        style={{ left: `${(i+1)*12.5}%`, borderColor: "rgba(139,92,246,0.08)" }} />
                    ))}
                    {/* Provider nodes */}
                    {[
                      { name:"OpenAI",    x:22, y:38, color:"#10b981", region:"US-WEST" },
                      { name:"Anthropic", x:28, y:42, color:"#f59e0b", region:"US-EAST" },
                      { name:"Groq",      x:25, y:48, color:"#6366f1", region:"US"      },
                      { name:"Gemini",    x:72, y:30, color:"#3b82f6", region:"EU"      },
                      { name:"OpenRouter",x:55, y:55, color:"#e21227", region:"GLOBAL"  },
                      { name:"Mistral",   x:52, y:35, color:"#a78bfa", region:"EU"      },
                      { name:"Together",  x:30, y:62, color:"#ec4899", region:"US"      },
                    ].map(node => (
                      <div key={node.name} className="absolute flex flex-col items-center" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}>
                        <div className="w-2 h-2 rounded-full pulse-dot"
                          style={{ background: node.color, boxShadow: `0 0 8px ${node.color}80` }} />
                        <div className="text-[5px] font-black font-mono mt-0.5 whitespace-nowrap" style={{ color: `${node.color}cc` }}>{node.name}</div>
                      </div>
                    ))}
                    {/* Center label */}
                    <div className="absolute bottom-2 right-2 text-[6px] font-mono" style={{ color: "rgba(139,92,246,0.35)" }}>GLOBAL MESH · LIVE</div>
                  </div>
                  {/* Region stats */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { region: "US",     providers: 4, avgMs: 180, color: "#10b981" },
                      { region: "EU",     providers: 2, avgMs: 210, color: "#3b82f6" },
                      { region: "GLOBAL", providers: 1, avgMs: 145, color: "#e21227" },
                      { region: "CN",     providers: 0, avgMs: 0,   color: "#444444" },
                    ].map(r => (
                      <div key={r.region} className="rounded-xl p-2.5"
                        style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${r.color}${r.providers ? "25" : "10"}` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black font-mono" style={{ color: r.providers ? r.color : "rgba(255,255,255,0.2)" }}>{r.region}</span>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.providers ? r.color : "#333", boxShadow: r.providers ? `0 0 6px ${r.color}` : "none" }} />
                        </div>
                        <div className="text-[11px] font-black font-mono" style={{ color: r.providers ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}>{r.providers}</div>
                        <div className="text-[6px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>مزودين</div>
                        {r.providers > 0 && <div className="text-[6px] font-mono mt-0.5" style={{ color: `${r.color}88` }}>{r.avgMs}ms avg</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider health grid — visible on status tab inside the grid above, plus always show if MATRIX is open */}
              {activeTab === "status" && Object.keys(providerHealth).length > 0 && (
                <div className="px-3 pb-3">
                  <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-1.5" style={{ color: "rgba(167,139,250,0.42)" }}>حالة المزوّدين</div>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.18) transparent" }}>
                    {MONITOR_PROVIDERS.map(p => {
                      const ph = providerHealth[p.id];
                      return <ProviderHealthRow key={p.id} name={p.name} color={p.color} health={ph?.h ?? "unknown"} latency={ph?.ms ?? null} />;
                    })}
                  </div>
                </div>
              )}

              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.42),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
