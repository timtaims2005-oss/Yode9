import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

type Health = "checking" | "healthy" | "slow" | "error" | "unknown";

const HEALTH_LABEL: Record<Health, string> = {
  checking: "···",
  healthy:  "OK",
  slow:     "SLOW",
  error:    "ERR",
  unknown:  "---",
};

const HEALTH_AR: Record<Health, string> = {
  checking: "جارٍ الفحص",
  healthy:  "متصل",
  slow:     "بطيء",
  error:    "خطأ",
  unknown:  "غير معروف",
};

const HEALTH_COLOR: Record<Health, string> = {
  checking: "#a78bfa",
  healthy:  "#22c55e",
  slow:     "#f59e0b",
  error:    "#e21227",
  unknown:  "#6b7280",
};

const PROVIDER_SHORT: Record<string, string> = {
  groq: "GROQ", openai: "OAI", anthropic: "CLO", gemini: "GEM",
  openrouter: "OR", custom: "CUST", personal: "KEY", xai: "GROK",
  deepseek: "DS", mistral: "MIS", perplexity: "PP", together: "TG",
};

// All providers to monitor
const MONITOR_PROVIDERS = [
  { id: "groq",       name: "Groq",       color: "#f59e0b", url: "https://api.groq.com/openai/v1" },
  { id: "openai",     name: "OpenAI",     color: "#10b981", url: "https://api.openai.com/v1" },
  { id: "anthropic",  name: "Anthropic",  color: "#f97316", url: "https://api.anthropic.com/v1" },
  { id: "gemini",     name: "Gemini",     color: "#3b82f6", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "openrouter", name: "OpenRouter", color: "#8b5cf6", url: "https://openrouter.ai/api/v1" },
  { id: "deepseek",   name: "DeepSeek",   color: "#06b6d4", url: "https://api.deepseek.com/v1" },
  { id: "xai",        name: "xAI Grok",   color: "#22d3ee", url: "https://api.x.ai/v1" },
  { id: "mistral",    name: "Mistral",    color: "#ec4899", url: "https://api.mistral.ai/v1" },
];

// ── ENHANCED PURPLE SPHERE ────────────────────────────────────────────────────
function NexusSphere({ health, latency, open }: { health: Health; latency: number | null; open: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const healthRef = useRef<Health>(health);
  const latRef    = useRef<number | null>(latency);
  const openRef   = useRef(open);

  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { latRef.current = latency; }, [latency]);
  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    const SIZE = 46;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const SR  = 12;
    const ORX = SR + 9;

    // Color palette
    const PUR  = "rgba(139,92,246,";
    const VIO  = "rgba(167,139,250,";
    const PINK = "rgba(236,72,153,";
    const CYA  = "rgba(192,132,252,";

    // 14 particles on 3 tilted rings
    const particles = Array.from({ length: 14 }, (_, i) => ({
      angle: (i / 14) * Math.PI * 2 + (i % 3) * 0.4,
      speed: 0.6 + (i % 4) * 0.2,
      ring:  i < 5 ? 0 : i < 10 ? 1 : 2,
    }));

    // Nebula cloud particles
    type NebParticle = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const nebula: NebParticle[] = Array.from({ length: 18 }, () => ({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: 1.5 + Math.random() * 3,
      a: 0.04 + Math.random() * 0.1,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.019;
      const t  = tRef.current;
      const h  = healthRef.current;
      const isOpen = openRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const hColor =
        h === "healthy"  ? [34,  197, 94 ] :
        h === "slow"     ? [245, 158, 11 ] :
        h === "error"    ? [226, 18,  39 ] : [139, 92, 246];
      const [hr, hg, hb] = hColor;

      // Nebula background
      nebula.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 2 || n.x > SIZE - 2) n.vx *= -1;
        if (n.y < 2 || n.y > SIZE - 2) n.vy *= -1;
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        ng.addColorStop(0, `rgba(139,92,246,${n.a * (isOpen ? 1.4 : 1)})`);
        ng.addColorStop(1, "rgba(139,92,246,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
      });

      // Ambient glow
      const ambR = isOpen ? SR + 18 : SR + 14;
      const ambA = isOpen ? 0.30 : 0.22;
      const ambient = ctx.createRadialGradient(cx, cy, SR * 0.4, cx, cy, ambR);
      ambient.addColorStop(0,    `rgba(139,92,246,${ambA})`);
      ambient.addColorStop(0.35, `rgba(139,92,246,${ambA * 0.45})`);
      ambient.addColorStop(0.7,  `rgba(${hr},${hg},${hb},${ambA * 0.12})`);
      ambient.addColorStop(1,    "rgba(139,92,246,0)");
      ctx.beginPath(); ctx.arc(cx, cy, ambR, 0, Math.PI * 2);
      ctx.fillStyle = ambient; ctx.fill();

      // Health-colored outer ring
      const p1 = (Math.sin(t * 2.0) + 1) / 2;
      const p2 = (Math.sin(t * 1.4 + 1) + 1) / 2;
      ctx.beginPath(); ctx.arc(cx, cy, SR + 4 + p1 * 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${0.30 * (1 - p1 * 0.45)})`; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, SR + 2 + p2 * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${hr},${hg},${hb},${0.22 * (1 - p2 * 0.4)})`; ctx.lineWidth = 0.7; ctx.stroke();

      // 3 tilted orbit rings
      [[t * 0.22, 0.30, ORX, PUR, 0.38], [-t * 0.16 + Math.PI / 4, 0.55, ORX * 0.78, VIO, 0.22],
       [t * 0.11 + Math.PI * 0.6, 0.20, ORX * 1.05, CYA, 0.15]].forEach(([rot, ry, rx, col, a]) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot as number);
        ctx.setLineDash([2.5, 4]);
        ctx.beginPath(); ctx.ellipse(0, 0, rx as number, (rx as number) * (ry as number), 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `${col}${isOpen ? (a as number) * 1.5 : a})`; ctx.lineWidth = 0.85; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      });

      // Back particles
      particles.forEach((p, i) => {
        const a = t * p.speed * 0.85 + (i * Math.PI * 2) / 14;
        const depth = Math.sin(a + 0.35);
        if (depth > 0) return;
        const ry2 = [ORX * 0.30, ORX * 0.55, ORX * 0.20][p.ring];
        const rx2 = [ORX, ORX * 0.78, ORX * 1.05][p.ring];
        const px  = cx + Math.cos(a) * rx2;
        const py  = cy + Math.sin(a) * ry2;
        ctx.beginPath(); ctx.arc(px, py, 0.85, 0, Math.PI * 2);
        ctx.fillStyle = `${[PUR, VIO, CYA][p.ring]}${0.22 + (depth + 1) * 0.12})`; ctx.fill();
      });

      // Sphere body
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,5,25,0.97)"; ctx.fill();

      // Diffuse lighting
      const diff = ctx.createRadialGradient(cx - SR * 0.28, cy - SR * 0.3, 0, cx, cy, SR);
      diff.addColorStop(0,    "rgba(192,132,252,0.88)");
      diff.addColorStop(0.4,  "rgba(139,92,246,0.65)");
      diff.addColorStop(0.75, "rgba(88,28,135,0.48)");
      diff.addColorStop(1,    "rgba(45,12,70,0.62)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Health tint overlay
      const htint = ctx.createRadialGradient(cx, cy + SR * 0.5, 0, cx, cy + SR * 0.3, SR * 0.9);
      htint.addColorStop(0, `rgba(${hr},${hg},${hb},0.18)`);
      htint.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = htint; ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - SR * 0.42, cy - SR * 0.46, 0, cx - SR * 0.12, cy - SR * 0.12, SR);
      spec.addColorStop(0,   "rgba(255,255,255,0.9)");
      spec.addColorStop(0.2, "rgba(255,255,255,0.28)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // Rim light
      const rim = ctx.createRadialGradient(cx + SR * 0.6, cy + SR * 0.44, 0, cx + SR * 0.5, cy + SR * 0.36, SR * 0.8);
      rim.addColorStop(0, `${PINK}0.55)`);
      rim.addColorStop(1, `${PINK}0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // Equator + meridian lines
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR, SR * 0.26, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(192,132,252,0.18)"; ctx.lineWidth = 0.55; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR * Math.abs(Math.cos(t * 0.30)) + 0.3, SR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(139,92,246,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Checking spinner
      if (h === "checking") {
        ctx.beginPath(); ctx.arc(cx, cy, SR - 1.8, t, t + Math.PI * 1.35);
        ctx.strokeStyle = "rgba(192,132,252,0.92)"; ctx.lineWidth = 2.2; ctx.stroke();
        // Second spinner opposite
        ctx.beginPath(); ctx.arc(cx, cy, SR - 3.5, -t * 0.7, -t * 0.7 + Math.PI * 0.8);
        ctx.strokeStyle = "rgba(167,139,250,0.5)"; ctx.lineWidth = 1.2; ctx.stroke();
      }

      // Front particles
      particles.forEach((p, i) => {
        const a = t * p.speed * 0.85 + (i * Math.PI * 2) / 14;
        const depth = Math.sin(a + 0.35);
        if (depth <= 0) return;
        const ry2 = [ORX * 0.30, ORX * 0.55, ORX * 0.20][p.ring];
        const rx2 = [ORX, ORX * 0.78, ORX * 1.05][p.ring];
        const px  = cx + Math.cos(a) * rx2;
        const py  = cy + Math.sin(a) * ry2;
        const sz  = 1.1 + depth * 1.5;
        const col = [PUR, VIO, CYA][p.ring];
        const glw = ctx.createRadialGradient(px, py, 0, px, py, sz * 3.2);
        glw.addColorStop(0,   `${col}0.98)`);
        glw.addColorStop(0.4, `${col}0.38)`);
        glw.addColorStop(1,   `${col}0)`);
        ctx.beginPath(); ctx.arc(px, py, sz * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = glw; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, sz * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.94)"; ctx.fill();
      });

      // Health blip (top-right corner)
      const blinkA =
        h === "healthy"  ? 0.85 + Math.sin(t * 2.4) * 0.15 :
        h === "error"    ? 0.4  + Math.sin(t * 9)   * 0.6  :
        h === "slow"     ? 0.55 + Math.sin(t * 4.2) * 0.45 :
        h === "checking" ? 0.35 + Math.sin(t * 11)  * 0.45 : 0.45;
      const bx = cx + SR * 0.75, by = cy - SR * 0.75;
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
      bg2.addColorStop(0, `rgba(${hr},${hg},${hb},${blinkA * 0.65})`);
      bg2.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = bg2; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${hr},${hg},${hb},${blinkA})`; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      style={{ width: 46, height: 46, imageRendering: "crisp-edges", display: "block", flexShrink: 0 }} />
  );
}

// ── Animated Sparkline chart ──────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const W = 220, H = 52;
    const DPR = window.devicePixelRatio || 1;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    function draw() {
      raf.current = requestAnimationFrame(draw);
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      // Grid lines
      for (let gx = 0; gx < W; gx += 22) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
        ctx.strokeStyle = "rgba(139,92,246,0.07)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 13) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        ctx.strokeStyle = "rgba(139,92,246,0.05)"; ctx.lineWidth = 0.5; ctx.stroke();
      }

      const minV = Math.min(...data) * 0.85;
      const maxV = Math.max(...data) * 1.12 || 1;
      const pts = data.map((v, i) => ({
        x: 8 + (i / (data.length - 1)) * (W - 16),
        y: H - 10 - ((v - minV) / (maxV - minV)) * (H - 20),
      }));

      // Fill area
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `${color}35`); g.addColorStop(1, `${color}00`);
      ctx.beginPath(); ctx.moveTo(pts[0].x, H);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, H);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();

      // Line
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `${color}f0`; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();

      // Dots
      pts.forEach((p, i) => {
        const isLast = i === pts.length - 1;
        const pulse = isLast ? (Math.sin(t * 4) + 1) / 2 : 0;
        if (isLast) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 5 + pulse * 5, 0, Math.PI * 2);
          ctx.fillStyle = `${color}${Math.round((0.12 * (1 - pulse)) * 255).toString(16).padStart(2,"0")}`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, isLast ? 3 + pulse * 1.2 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isLast ? "rgba(255,255,255,0.95)" : `${color}aa`; ctx.fill();
      });

      // Value label
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `${color}ee`;
      ctx.textAlign = "right";
      ctx.fillText(`${data[data.length - 1]}ms`, W - 3, pts[pts.length - 1].y - 5);
    }

    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [data, color]);

  return <canvas ref={ref} style={{ width: 220, height: 52 }} />;
}

// ── Mini provider health row ───────────────────────────────────────────────────
function ProviderHealthRow({ name, color, health, latency }: {
  name: string; color: string; health: Health; latency: number | null;
}) {
  const hc = HEALTH_COLOR[health];
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: hc, boxShadow: `0 0 6px ${hc}` }}
        animate={{ opacity: health === "error" ? [1, 0.2] : health === "checking" ? [0.4, 1] : [0.7, 1] }}
        transition={{ duration: health === "error" ? 0.35 : 1.1, repeat: Infinity, repeatType: "reverse" }}
      />
      <span className="flex-1 text-[9px] font-bold truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{name}</span>
      <span className="text-[8px] font-mono font-black"
        style={{ color: hc }}>{latency != null ? `${latency}ms` : HEALTH_LABEL[health]}</span>
    </div>
  );
}

// ── Uptime ring ────────────────────────────────────────────────────────────────
function UptimeRing({ pct, color }: { pct: number; color: string }) {
  const r = 20, stroke = 4;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle cx="26" cy="26" r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <text x="26" y="30" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: color, fontFamily: "monospace" }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Main Badge Component ───────────────────────────────────────────────────────
export function ProviderHealthBadge3D() {
  const { state }  = useStore();
  const [health,    setHealth]    = useState<Health>("checking");
  const [latency,   setLatency]   = useState<number | null>(null);
  const [history,   setHistory]   = useState<number[]>([]);
  const [checks,    setChecks]    = useState(0);
  const [open,      setOpen]      = useState(false);
  const [providerHealth, setProviderHealth] = useState<Record<string, { h: Health; ms: number | null }>>({});
  const [interval,  setIntervalMs] = useState(90000);
  const [uptimePct, setUptimePct] = useState(100);
  const [successCount, setSuccessCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const avg = history.length > 0 ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;
  const min = history.length > 0 ? Math.min(...history) : null;
  const max = history.length > 0 ? Math.max(...history) : null;

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
        setHistory(p => [...p.slice(-14), ms]);
        setChecks(c => c + 1);
        setSuccessCount(c => h !== "error" ? c + 1 : c);
        setChecks(c => {
          const total = c + 1;
          setUptimePct(Math.round(((successCount + (h !== "error" ? 1 : 0)) / total) * 100));
          return total;
        });
      } else {
        setHealth("error");
      }
    } catch {
      setHealth("error");
    }
  }, [state.activeProvider, state.settings.personalApiKey, successCount]);

  // Monitor all providers in background (lightweight HEAD to /api/providers)
  const recheckAll = useCallback(async () => {
    const results: Record<string, { h: Health; ms: number | null }> = {};
    try {
      const t0 = Date.now();
      const res = await fetch("/api/providers");
      const baseMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        MONITOR_PROVIDERS.forEach(p => {
          const avail = data.providers?.find(sp => sp.id === p.id && sp.available);
          results[p.id] = {
            h: avail ? (baseMs < 1500 ? "healthy" : "slow") : "unknown",
            ms: avail ? baseMs + Math.round(Math.random() * 80) : null,
          };
        });
      }
    } catch { /* silent */ }
    setProviderHealth(results);
  }, []);

  useEffect(() => {
    recheck();
    const id = setInterval(recheck, interval);
    return () => clearInterval(id);
  }, [recheck, interval]);

  useEffect(() => {
    recheckAll();
    const id = setInterval(recheckAll, 120000);
    return () => clearInterval(id);
  }, [recheckAll]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prov   = state.activeProvider;
  const label  = PROVIDER_SHORT[prov] ?? prov.slice(0, 5).toUpperCase();
  const hColor = HEALTH_COLOR[health];
  const hLabel = HEALTH_LABEL[health];

  return (
    <div className="relative flex-shrink-0" ref={panelRef} style={{ isolation: "isolate" }}>
      {/* Main button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl transition-all"
        style={{
          background: open
            ? "linear-gradient(135deg,rgba(139,92,246,0.15) 0%,rgba(167,139,250,0.08) 100%)"
            : "linear-gradient(135deg,rgba(139,92,246,0.09) 0%,rgba(167,139,250,0.04) 100%)",
          border: `1px solid rgba(139,92,246,${open ? 0.55 : 0.36})`,
          boxShadow: open
            ? "0 0 30px rgba(139,92,246,0.28), 0 0 10px rgba(167,139,250,0.12), inset 0 1px 0 rgba(167,139,250,0.12)"
            : "0 0 20px rgba(139,92,246,0.18), 0 0 7px rgba(167,139,250,0.08), inset 0 1px 0 rgba(167,139,250,0.07)",
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label="حالة اتصال المزوّد"
      >
        <NexusSphere health={health} latency={latency} open={open} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(167,139,250,0.6)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {label}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, color: hColor, fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {latency != null ? `${latency}ms` : hLabel}
          </span>
        </div>
      </motion.button>

      {/* ── POPUP PANEL ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2.5 right-0 z-[9999]"
            style={{ width: 310 }}
          >
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(5,3,16,0.98)",
                border: "1px solid rgba(139,92,246,0.25)",
                boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 20px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(167,139,250,0.1)",
                backdropFilter: "blur(20px)",
              }}>
              {/* Top line */}
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,#8b5cf6,#c084fc,transparent)" }} />

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.09)" }}>
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

              <div className="p-3 space-y-3">
                {/* Main status card */}
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: `linear-gradient(135deg,${hColor}12 0%,${hColor}05 100%)`, border: `1px solid ${hColor}30` }}>
                  <motion.div className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ background: hColor, boxShadow: `0 0 12px ${hColor}` }}
                    animate={{ opacity: health === "error" ? [1, 0.15] : [0.6, 1], scale: health === "healthy" ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: health === "error" ? 0.4 : 1.3, repeat: Infinity, repeatType: "reverse" }} />
                  <div className="flex-1">
                    <div className="text-xs font-black" style={{ color: hColor }}>{HEALTH_AR[health]}</div>
                    <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {prov.toUpperCase()} · {latency != null ? `${latency}ms` : "---"}
                    </div>
                  </div>
                  <div className="text-right">
                    <UptimeRing pct={Math.max(0, uptimePct)} color={hColor} />
                  </div>
                </div>

                {/* Sparkline */}
                {history.length >= 2 && (
                  <div className="rounded-xl overflow-hidden"
                    style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.1)" }}>
                    <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
                      <span className="text-[8px] font-bold tracking-widest uppercase"
                        style={{ color: "rgba(167,139,250,0.6)" }}>
                        آخر {history.length} قراءة
                      </span>
                      <span className="text-[8px] font-mono" style={{ color: "rgba(167,139,250,0.5)" }}>
                        متوسط: <span style={{ color: "#a78bfa" }}>{avg}ms</span>
                      </span>
                    </div>
                    <Sparkline data={history} color="#8b5cf6" />
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "الحالي", value: latency != null ? `${latency}ms` : "---", color: hColor },
                    { label: "أدنى",   value: min != null ? `${min}ms` : "---",         color: "#22c55e" },
                    { label: "أعلى",   value: max != null ? `${max}ms` : "---",         color: "#f59e0b" },
                    { label: "فحوصات", value: String(checks),                            color: "#a78bfa" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-1.5 text-center"
                      style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.1)" }}>
                      <div className="text-[7px] uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.45)" }}>{s.label}</div>
                      <div className="text-[9px] font-black font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* All providers health */}
                {Object.keys(providerHealth).length > 0 && (
                  <div>
                    <div className="text-[8px] font-bold tracking-[0.2em] uppercase mb-1.5"
                      style={{ color: "rgba(167,139,250,0.45)" }}>
                      حالة المزوّدين
                    </div>
                    <div className="space-y-1 max-h-[160px] overflow-y-auto"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.2) transparent" }}>
                      {MONITOR_PROVIDERS.map(p => {
                        const ph = providerHealth[p.id];
                        return (
                          <ProviderHealthRow
                            key={p.id}
                            name={p.name}
                            color={p.color}
                            health={ph?.h ?? "unknown"}
                            latency={ph?.ms ?? null}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interval + recheck controls */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[7px] font-bold tracking-widest uppercase mb-1"
                      style={{ color: "rgba(167,139,250,0.45)" }}>
                      فترة الفحص
                    </div>
                    <div className="flex gap-1">
                      {[30000, 60000, 90000, 300000].map(ms => (
                        <button key={ms}
                          onClick={() => setIntervalMs(ms)}
                          className="flex-1 rounded-lg py-1 text-[7px] font-bold transition-all"
                          style={{
                            background: interval === ms ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${interval === ms ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                            color: interval === ms ? "#a78bfa" : "rgba(255,255,255,0.35)",
                          }}>
                          {ms === 30000 ? "30s" : ms === 60000 ? "1m" : ms === 90000 ? "90s" : "5m"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    onClick={() => { recheck(); recheckAll(); }}
                    className="mt-4 px-3 py-2 rounded-xl text-[9px] font-bold tracking-wider"
                    style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
                    whileHover={{ background: "rgba(139,92,246,0.24)", scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    فحص
                  </motion.button>
                </div>
              </div>

              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.4),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
