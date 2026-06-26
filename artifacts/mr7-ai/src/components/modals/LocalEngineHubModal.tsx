import { useEffect, useRef, useState, useCallback } from "react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server, Wifi, WifiOff, Zap, Download, Play, RefreshCw,
  Terminal, CheckCircle2, AlertCircle, Loader2, ChevronDown,
  ChevronUp, ExternalLink, Cpu, Globe, Activity, Shield,
  X, Copy, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Engine definitions ────────────────────────────────────────────────────────
const ENGINES = [
  { id: "ollama",    label: "Ollama",      port: 11434, color: "#00e5ff", glow: "#00e5ff44",
    icon: "🦙", desc: "Most popular local LLM runner",        category: "Core" },
  { id: "lmstudio", label: "LM Studio",   port: 1234,  color: "#a78bfa", glow: "#a78bfa44",
    icon: "🎨", desc: "GUI-based model runner & API",          category: "GUI"  },
  { id: "jan",      label: "Jan",          port: 1337,  color: "#34d399", glow: "#34d39944",
    icon: "🤖", desc: "Open-source ChatGPT alternative",       category: "GUI"  },
  { id: "gpt4all",  label: "GPT4All",      port: 4891,  color: "#f97316", glow: "#f9731644",
    icon: "🧠", desc: "Privacy-focused local AI platform",     category: "GUI"  },
  { id: "openwebui",label: "Open WebUI",   port: 3000,  color: "#06d6a0", glow: "#06d6a044",
    icon: "🌐", desc: "Web UI for Ollama & OpenAI compatible", category: "Web"  },
  { id: "llamafile",label: "Llamafile",    port: 8081,  color: "#fbbf24", glow: "#fbbf2444",
    icon: "📄", desc: "Single-file executable LLM server",     category: "Core" },
  { id: "kobold",   label: "KoboldCPP",    port: 5001,  color: "#f72585", glow: "#f7258544",
    icon: "⚔️", desc: "Optimized inference engine + UI",       category: "Core" },
] as const;
type EngineId = typeof ENGINES[number]["id"];

interface EngineStatus {
  id: EngineId; label: string; port: number; online: boolean;
  latencyMs: number | null; models: string[]; version: string | null;
  canInstall: boolean; installAvailable: boolean;
}

// ── 3D Holographic Hub Canvas ─────────────────────────────────────────────────
function HolographicHub({ statuses, scanning, selectedId, onSelect }: {
  statuses: EngineStatus[];
  scanning: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);
  const hoverRef  = useRef<string | null>(null);
  const posRef    = useRef<{ id: string; x: number; y: number; r: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width  = canvas!.offsetWidth  * devicePixelRatio;
      canvas!.height = canvas!.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      frameRef.current++;
      const f  = frameRef.current;
      const W  = canvas!.offsetWidth;
      const H  = canvas!.offsetHeight;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // Deep space background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      bg.addColorStop(0, "#0a0f1a");
      bg.addColorStop(1, "#030508");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.5;
      const gs = 40;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      // Orbit rings
      const orbits = [60, 120, 160];
      orbits.forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${0.04 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Dashed rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(f * 0.004);
      ctx.beginPath();
      ctx.arc(0, 0, 135, 0, Math.PI * 2);
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(0,229,255,0.08)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Scanning sweep
      if (scanning) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((f * 0.05) % (Math.PI * 2));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 160, -0.5, 0.5);
        ctx.closePath();
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 160);
        sg.addColorStop(0, "rgba(0,229,255,0.18)");
        sg.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(160, 0);
        ctx.strokeStyle = "rgba(0,229,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Engine node positions
      const nodePositions = ENGINES.map((eng, i) => {
        const angle  = (i / ENGINES.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 120;
        return {
          id: eng.id,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          r: 18,
          eng,
        };
      });
      posRef.current = nodePositions.map(n => ({ id: n.id, x: n.x, y: n.y, r: n.r }));

      // Connection lines to center
      nodePositions.forEach(({ x, y, eng, id }) => {
        const st = statuses.find(s => s.id === id);
        const online = st?.online ?? false;
        const isSelected = selectedId === id;

        if (online) {
          // Animated particle on line
          const t   = ((f * 0.012) + ENGINES.findIndex(e => e.id === id) * 0.2) % 1;
          const px  = cx + (x - cx) * t;
          const py  = cy + (y - cy) * t;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.strokeStyle = isSelected ? eng.color + "88" : eng.color + "33";
          ctx.lineWidth   = isSelected ? 1.5 : 0.8;
          ctx.stroke();

          // Particle
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 4);
          pg.addColorStop(0, eng.color);
          pg.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = pg;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.lineWidth   = 0.5;
          ctx.setLineDash([3, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Engine nodes
      nodePositions.forEach(({ x, y, r, eng, id }) => {
        const st = statuses.find(s => s.id === id);
        const online    = st?.online ?? false;
        const isHovered = hoverRef.current === id;
        const isSelected= selectedId === id;
        const pulse     = (Math.sin(f * 0.06 + ENGINES.findIndex(e => e.id === id)) + 1) / 2;
        const color     = online ? eng.color : "#ffffff22";
        const nr        = isSelected ? r + 4 : isHovered ? r + 2 : r;

        // Outer glow ring (online)
        if (online) {
          ctx.beginPath();
          ctx.arc(x, y, nr + 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = color + "22";
          ctx.lineWidth   = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, nr + 3, 0, Math.PI * 2);
          ctx.strokeStyle = color + "55";
          ctx.lineWidth   = 1.2;
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, nr + 12, 0, Math.PI * 2);
          ctx.strokeStyle = color + "66";
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        }

        // Node body
        const ng = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, nr);
        if (online) {
          ng.addColorStop(0, color + "ff");
          ng.addColorStop(0.4, color + "99");
          ng.addColorStop(1, color + "11");
        } else {
          ng.addColorStop(0, "#ffffff18");
          ng.addColorStop(1, "#ffffff04");
        }
        ctx.beginPath();
        ctx.arc(x, y, nr, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(x, y, nr, 0, Math.PI * 2);
        ctx.strokeStyle = online ? color + "cc" : "#ffffff22";
        ctx.lineWidth   = isSelected ? 2 : 1.2;
        ctx.stroke();

        // Label
        ctx.fillStyle   = online ? color : "rgba(255,255,255,0.35)";
        ctx.font        = `bold ${isSelected ? 10 : 9}px monospace`;
        ctx.textAlign   = "center";
        ctx.fillText(eng.label, x, y + nr + 13);

        // Status dot + latency
        if (online && st?.latencyMs) {
          ctx.fillStyle = color + "aa";
          ctx.font      = "7px monospace";
          ctx.fillText(`${st.latencyMs}ms`, x, y + nr + 22);
        }

        // Status indicator
        ctx.beginPath();
        ctx.arc(x + nr - 4, y - nr + 4, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = online ? "#22c55e" : (scanning ? "#fbbf24" : "#ef4444");
        ctx.fill();
      });

      // Central hub
      const hubPulse = (Math.sin(f * 0.03) + 1) / 2;
      const hubR = 22 + hubPulse * 3;

      // Hub glow
      const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR + 20);
      hg.addColorStop(0, "rgba(0,229,255,0.35)");
      hg.addColorStop(0.5, "rgba(0,229,255,0.08)");
      hg.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, hubR + 20, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();

      // Hub body
      const hbg = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, hubR);
      hbg.addColorStop(0, "#00e5ffcc");
      hbg.addColorStop(0.5, "#00e5ff55");
      hbg.addColorStop(1, "#00e5ff11");
      ctx.beginPath();
      ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = hbg;
      ctx.fill();
      ctx.strokeStyle = "#00e5ffaa";
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Hub text
      ctx.fillStyle = "#00e5ff";
      ctx.font      = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LOCAL", cx, cy - 3);
      ctx.fillText("HUB", cx, cy + 7);

      // Online count badge
      const onlineCount = statuses.filter(s => s.online).length;
      ctx.fillStyle = "#ffffff99";
      ctx.font      = "7px monospace";
      ctx.fillText(`${onlineCount}/${ENGINES.length}`, cx, cy + 17);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [statuses, scanning, selectedId]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const p of posRef.current) {
      const dx = mx - p.x, dy = my - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= p.r + 10) {
        onSelect(p.id);
        return;
      }
    }
    onSelect("");
  }, [onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = null;
    for (const p of posRef.current) {
      const dx = mx - p.x, dy = my - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= p.r + 10) { found = p.id; break; }
    }
    hoverRef.current = found;
    if (canvasRef.current) canvasRef.current.style.cursor = found ? "pointer" : "default";
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

// ── Live Log Feed ─────────────────────────────────────────────────────────────
function LogFeed({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);
  return (
    <div className="h-32 overflow-y-auto rounded-lg bg-black/60 border border-white/10 p-2 font-mono text-[10px] space-y-0.5">
      {lines.map((l, i) => {
        const isErr = l.includes("[ERROR]");
        const isOk  = l.includes("[OK]") || l.includes("✓");
        return (
          <div key={i} className={isErr ? "text-red-400" : isOk ? "text-green-400" : "text-cyan-300/80"}>
            {l}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── Engine Detail Panel ───────────────────────────────────────────────────────
function EnginePanel({
  eng, status, onLaunch, onInstall, onRefresh,
}: {
  eng: typeof ENGINES[number];
  status: EngineStatus | null;
  onLaunch: () => void;
  onInstall: () => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]    = useState(false);

  const copyPort = () => {
    navigator.clipboard.writeText(String(eng.port));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const online  = status?.online ?? false;
  const models  = status?.models ?? [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: online ? eng.color + "44" : "#ffffff11",
        background: `linear-gradient(135deg, ${eng.color}06 0%, #0a0f1a 100%)`,
        boxShadow: online ? `0 0 20px ${eng.color}18` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: eng.color + "18", border: `1px solid ${eng.color}44` }}
        >
          {eng.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: online ? eng.color : "#ffffff88" }}>
              {eng.label}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: online ? "#22c55e22" : "#ef444422", color: online ? "#22c55e" : "#ef4444" }}
            >
              {online ? "ONLINE" : "OFFLINE"}
            </span>
            {status?.version && (
              <span className="text-[9px] text-white/30 font-mono">v{status.version}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30 font-mono">:{eng.port}</span>
            {status?.latencyMs && (
              <span className="text-[10px] font-mono" style={{ color: eng.color + "aa" }}>
                {status.latencyMs}ms
              </span>
            )}
            {online && models.length > 0 && (
              <span className="text-[10px] text-white/30">{models.length} model{models.length > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRefresh}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/08 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={copyPort}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/08 transition-colors"
            title="Copy port"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
          {!online && status?.canInstall && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: eng.color + "22", color: eng.color, border: `1px solid ${eng.color}44` }}
              title="Install"
            >
              <Download size={10} />
              Install
            </button>
          )}
          <button
            onClick={onLaunch}
            disabled={online}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: online ? "#22c55e22" : eng.color + "33",
              color: online ? "#22c55e" : eng.color,
              border: `1px solid ${online ? "#22c55e44" : eng.color + "55"}`,
            }}
          >
            {online ? <CheckCircle2 size={10} /> : <Play size={10} />}
            {online ? "Running" : "Launch"}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/08 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded models & info */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
            style={{ borderColor: eng.color + "22" }}
          >
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-white/40">{eng.desc}</p>
              {online && models.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider mb-1">Loaded Models</div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {models.map(m => (
                      <span
                        key={m}
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: eng.color + "18", color: eng.color + "cc", border: `1px solid ${eng.color}22` }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ) : online ? (
                <p className="text-[10px] text-white/30 italic">No models loaded yet</p>
              ) : (
                <div className="text-[10px] text-white/30 space-y-0.5">
                  <div>Port: <span className="font-mono text-white/50">:{eng.port}</span></div>
                  <div>Endpoint: <span className="font-mono text-white/50">http://localhost:{eng.port}/v1</span></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Metric Bar ────────────────────────────────────────────────────────────────
function MetricBar3D({ statuses }: { statuses: EngineStatus[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 60;

    function draw() {
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#06080d";
      ctx.fillRect(0, 0, W, H);

      const barW   = Math.floor(W / ENGINES.length) - 4;
      const maxLat = 500;

      ENGINES.forEach((eng, i) => {
        const st    = statuses.find(s => s.id === eng.id);
        const x     = i * (barW + 4) + 2;
        const online= st?.online ?? false;
        const lat   = st?.latencyMs ?? 0;
        const norm  = Math.min(lat / maxLat, 1);
        const pulse = (Math.sin(f * 0.08 + i) + 1) / 2;

        // Base
        ctx.fillStyle = "#ffffff06";
        ctx.fillRect(x, 5, barW, H - 10);

        if (online) {
          const barH  = Math.max(4, (H - 12) * (1 - norm * 0.6));
          const baseY = H - 7;
          const grad  = ctx.createLinearGradient(x, baseY, x, baseY - barH);
          grad.addColorStop(0, eng.color + "cc");
          grad.addColorStop(1, eng.color + "44");
          ctx.fillStyle = grad;
          ctx.fillRect(x, baseY - barH, barW, barH);

          // Shimmer
          const shimmerY = baseY - barH + (pulse * barH);
          ctx.fillStyle  = eng.color + "33";
          ctx.fillRect(x, shimmerY - 2, barW, 2);

          // Top glow
          const tg = ctx.createLinearGradient(x, baseY - barH - 8, x, baseY - barH);
          tg.addColorStop(0, "transparent");
          tg.addColorStop(1, eng.color + "55");
          ctx.fillStyle = tg;
          ctx.fillRect(x, baseY - barH - 8, barW, 8);

          // Latency text
          ctx.fillStyle  = eng.color;
          ctx.font       = "bold 7px monospace";
          ctx.textAlign  = "center";
          ctx.fillText(`${lat}ms`, x + barW / 2, H - 1);
        } else {
          ctx.fillStyle  = "#ffffff18";
          ctx.font       = "7px monospace";
          ctx.textAlign  = "center";
          ctx.fillText("—", x + barW / 2, H / 2 + 3);
        }

        // Label
        ctx.fillStyle  = online ? eng.color : "#ffffff33";
        ctx.font       = "6px monospace";
        ctx.textAlign  = "center";
        ctx.fillText(eng.label.slice(0, 4).toUpperCase(), x + barW / 2, 11);
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [statuses]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ height: 60, border: "1px solid rgba(0,229,255,0.08)" }}
    />
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function LocalEngineHubModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [statuses,   setStatuses]   = useState<EngineStatus[]>([]);
  const [scanning,   setScanning]   = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs,       setLogs]       = useState<string[]>([]);
  const [activeTab,  setActiveTab]  = useState<"hub" | "engines" | "logs">("hub");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const fetchStatus = useCallback(async (showScan = false) => {
    if (showScan) setScanning(true);
    try {
      const resp = await fetch("/api/local-engines/status");
      if (resp.ok) {
        const data = await resp.json() as { engines: EngineStatus[] };
        setStatuses(data.engines ?? []);
      }
    } catch { /* ignore */ }
    if (showScan) setTimeout(() => setScanning(false), 1200);
  }, []);

  const fetchOne = useCallback(async (id: string) => {
    try {
      const resp = await fetch(`/api/local-engines/status/${id}`);
      if (resp.ok) {
        const data = await resp.json() as EngineStatus;
        setStatuses(prev => prev.map(s => s.id === id ? data : s));
      }
    } catch { /* ignore */ }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    if (!open) return;
    fetchStatus(true);
    pollRef.current = setInterval(() => fetchStatus(), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, fetchStatus]);

  const streamAction = useCallback(async (url: string, label: string, onDone?: () => void) => {
    addLog(`→ ${label}...`);
    try {
      const resp = await fetch(url, { method: "POST" });
      if (!resp.body) { addLog(`[ERROR] No response body`); return; }
      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const d = JSON.parse(line) as { type: string; message: string };
            const prefix = d.type === "error" ? "[ERROR]" : d.type === "success" ? "[OK]" : "";
            addLog(`${prefix} ${d.message}`);
            if (d.type === "success") {
              toast({ title: label, description: d.message });
              onDone?.();
            }
            if (d.type === "error") {
              toast({ title: "Error", description: d.message, variant: "destructive" });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      addLog(`[ERROR] ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [toast]);

  const handleLaunch  = (id: string) => { streamAction(`/api/local-engines/launch/${id}`, `Launch ${id}`, () => fetchOne(id)); if (activeTab !== "logs") setActiveTab("logs"); };
  const handleInstall = (id: string) => { streamAction(`/api/local-engines/install/${id}`, `Install ${id}`, () => fetchOne(id)); if (activeTab !== "logs") setActiveTab("logs"); };

  const onlineCount = statuses.filter(s => s.online).length;

  const selectedEng    = ENGINES.find(e => e.id === selectedId) ?? null;
  const selectedStatus = statuses.find(s => s.id === selectedId) ?? null;

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div
        className="relative w-full mx-auto rounded-[18px] overflow-hidden flex flex-col"
        style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
          border: "1px solid rgba(0,229,255,0.15)",
          boxShadow: "0 0 80px rgba(0,229,255,0.08), inset 0 0 40px rgba(0,229,255,0.02)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-4 pt-3 pb-[10px] border-b shrink-0"
          style={{ borderColor: "rgba(0,229,255,0.1)", background: "rgba(0,229,255,0.03)" }}
        >
          {/* Animated logo */}
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.4)" }}
            >
              <Server size={18} className="text-cyan-400" />
            </div>
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: onlineCount > 0 ? "#22c55e" : "#ef4444", color: "white" }}
            >
              {onlineCount}
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-base font-bold text-white tracking-wide">
              Local AI Engine Hub
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              {onlineCount}/{ENGINES.length} engines online — parallel inference cluster
            </p>
          </div>

          {/* Stats row */}
          <div className="hidden md:flex items-center gap-4">
            {[
              { label: "Online",   value: onlineCount,                       color: "#22c55e" },
              { label: "Offline",  value: ENGINES.length - onlineCount,      color: "#ef4444" },
              { label: "Models",   value: statuses.reduce((s, e) => s + e.models.length, 0), color: "#00e5ff" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold font-mono leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scan all button */}
          <button
            onClick={() => fetchStatus(true)}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-60"
            style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}
          >
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
            {scanning ? "Scanning..." : "Scan All"}
          </button>

          <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/08 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 shrink-0">
          {(["hub", "engines", "logs"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeTab === tab ? "rgba(0,229,255,0.15)" : "transparent",
                color: activeTab === tab ? "#00e5ff" : "rgba(255,255,255,0.35)",
                border: activeTab === tab ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
              }}
            >
              {tab === "hub" ? "🔮 Hub 3D" : tab === "engines" ? "⚡ Engines" : "📟 Logs"}
              {tab === "logs" && logs.length > 0 && (
                <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] bg-cyan-500/20 text-cyan-400">
                  {logs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0 p-4">
          <AnimatePresence mode="wait">

            {/* HUB 3D TAB */}
            {activeTab === "hub" && (
              <motion.div
                key="hub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex gap-4"
                style={{ minHeight: 400 }}
              >
                {/* Canvas */}
                <div className="flex-1 rounded-xl overflow-hidden relative" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", border: "1px solid rgba(0,229,255,0.08)", minHeight: 360 }}>
                  <HolographicHub
                    statuses={statuses}
                    scanning={scanning}
                    selectedId={selectedId}
                    onSelect={id => setSelectedId(id || null)}
                  />
                  {/* Overlay hint */}
                  <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] text-white/20 font-mono pointer-events-none">
                    Click a node to inspect · {scanning ? "SCANNING..." : `Last scan: ${new Date().toLocaleTimeString()}`}
                  </div>
                </div>

                {/* Side panel */}
                <div className="w-64 flex flex-col gap-3 overflow-y-auto">
                  {/* Metric bars */}
                  <div>
                    <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider mb-1.5">Latency Overview</div>
                    <MetricBar3D statuses={statuses} />
                  </div>

                  {/* Selected engine detail */}
                  {selectedEng ? (
                    <div
                      className="rounded-xl p-3 space-y-2"
                      style={{ background: `${selectedEng.color}08`, border: `1px solid ${selectedEng.color}33` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{selectedEng.icon}</span>
                        <div>
                          <div className="font-bold text-sm" style={{ color: selectedEng.color }}>{selectedEng.label}</div>
                          <div className="text-[9px] text-white/30">port {selectedEng.port}</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/40">{selectedEng.desc}</p>

                      {selectedStatus?.online ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                            <CheckCircle2 size={10} /> Online · {selectedStatus.latencyMs}ms
                          </div>
                          {selectedStatus.models.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {selectedStatus.models.slice(0, 4).map(m => (
                                <span key={m} className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                                  style={{ background: selectedEng.color + "18", color: selectedEng.color + "cc" }}>
                                  {m.length > 16 ? m.slice(0, 16) + "…" : m}
                                </span>
                              ))}
                              {selectedStatus.models.length > 4 && (
                                <span className="text-[8px] text-white/30">+{selectedStatus.models.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          {selectedStatus?.canInstall && (
                            <button
                              onClick={() => handleInstall(selectedEng.id)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                              style={{ background: selectedEng.color + "22", color: selectedEng.color, border: `1px solid ${selectedEng.color}44` }}
                            >
                              <Download size={10} /> Install
                            </button>
                          )}
                          <button
                            onClick={() => handleLaunch(selectedEng.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{ background: selectedEng.color + "22", color: selectedEng.color, border: `1px solid ${selectedEng.color}44` }}
                          >
                            <Play size={10} /> Launch
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl p-3 text-center text-white/20 text-[10px]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                      Click a node in the hub to inspect it
                    </div>
                  )}

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {ENGINES.map(eng => {
                      const st = statuses.find(s => s.id === eng.id);
                      return (
                        <button
                          key={eng.id}
                          onClick={() => setSelectedId(eng.id)}
                          className="rounded-lg p-2 text-left transition-all"
                          style={{
                            background: st?.online ? eng.color + "10" : "#ffffff04",
                            border: selectedId === eng.id ? `1px solid ${eng.color}88` : `1px solid ${st?.online ? eng.color + "33" : "#ffffff08"}`,
                          }}
                        >
                          <div className="text-[9px] font-bold truncate" style={{ color: st?.online ? eng.color : "#ffffff55" }}>
                            {eng.label}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: st?.online ? "#22c55e" : "#ef4444" }} />
                            <span className="text-[8px] text-white/30 font-mono">
                              {st?.online ? `${st.latencyMs}ms` : "offline"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ENGINES TAB */}
            {activeTab === "engines" && (
              <motion.div
                key="engines"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto space-y-2 pr-1"
              >
                {/* Summary bar */}
                <div
                  className="rounded-xl p-3 flex items-center gap-4 shrink-0"
                  style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}
                >
                  <Activity size={14} className="text-cyan-400 shrink-0" />
                  <div className="flex-1 flex items-center gap-4 flex-wrap">
                    <span className="text-[11px] text-white/50">
                      <span className="text-green-400 font-bold">{onlineCount}</span> online
                      &nbsp;·&nbsp;
                      <span className="text-red-400 font-bold">{ENGINES.length - onlineCount}</span> offline
                    </span>
                    {statuses.filter(s => s.online).map(s => (
                      <span key={s.id} className="text-[10px] font-mono" style={{ color: ENGINES.find(e => e.id === s.id)?.color }}>
                        {s.label} {s.latencyMs}ms
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchStatus(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}
                  >
                    <RefreshCw size={10} className={scanning ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>

                {/* Engine panels */}
                {ENGINES.map(eng => (
                  <EnginePanel
                    key={eng.id}
                    eng={eng}
                    status={statuses.find(s => s.id === eng.id) ?? null}
                    onLaunch={()  => handleLaunch(eng.id)}
                    onInstall={() => handleInstall(eng.id)}
                    onRefresh={() => fetchOne(eng.id)}
                  />
                ))}
              </motion.div>
            )}

            {/* LOGS TAB */}
            {activeTab === "logs" && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col gap-3"
              >
                <div className="flex items-center justify-between shrink-0">
                  <div className="text-[11px] text-white/40 font-mono">
                    {logs.length} log entries
                  </div>
                  <button
                    onClick={() => setLogs([])}
                    className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-black/60 border border-white/08 p-3 font-mono text-[10px] space-y-0.5">
                  {logs.length === 0 ? (
                    <div className="text-white/20 text-center mt-8">No activity yet. Launch or install an engine to see logs.</div>
                  ) : logs.map((l, i) => {
                    const isErr = l.includes("[ERROR]");
                    const isOk  = l.includes("[OK]");
                    return (
                      <div key={i} className={isErr ? "text-red-400" : isOk ? "text-green-400" : "text-cyan-300/70"}>
                        {l}
                      </div>
                    );
                  })}
                </div>

                {/* Quick launch grid */}
                <div className="shrink-0">
                  <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider mb-2">Quick Actions</div>
                  <div className="grid grid-cols-4 gap-2">
                    {ENGINES.map(eng => {
                      const st = statuses.find(s => s.id === eng.id);
                      return (
                        <button
                          key={eng.id}
                          onClick={() => st?.online ? null : handleLaunch(eng.id)}
                          disabled={st?.online}
                          className="rounded-lg py-2 px-1 text-center transition-all disabled:opacity-60"
                          style={{
                            background: st?.online ? eng.color + "12" : "#ffffff06",
                            border: `1px solid ${st?.online ? eng.color + "44" : "#ffffff0a"}`,
                          }}
                        >
                          <div className="text-sm mb-0.5">{eng.icon}</div>
                          <div className="text-[8px] font-bold truncate" style={{ color: st?.online ? eng.color : "#ffffff55" }}>
                            {eng.label}
                          </div>
                          <div className="text-[7px] mt-0.5" style={{ color: st?.online ? "#22c55e" : "#ef4444" }}>
                            {st?.online ? "●" : "○"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-2.5 border-t shrink-0"
          style={{ borderColor: "rgba(0,229,255,0.08)", background: "rgba(0,229,255,0.02)" }}
        >
          <div className="flex items-center gap-3">
            {ENGINES.map(eng => {
              const st = statuses.find(s => s.id === eng.id);
              return (
                <div key={eng.id} className="flex items-center gap-1" title={eng.label}>
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: st?.online ? eng.color : "#ffffff22", boxShadow: st?.online ? `0 0 6px ${eng.color}` : "none" }}
                  />
                  <span className="text-[8px] font-mono hidden sm:inline" style={{ color: st?.online ? eng.color + "aa" : "#ffffff22" }}>
                    {eng.label.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] text-white/20 font-mono">
            LOCAL ENGINE HUB · MR7-AI
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${scanning ? "animate-pulse bg-yellow-400" : onlineCount > 0 ? "bg-green-400" : "bg-red-500"}`} />
            <span className="text-[9px] text-white/30 font-mono">
              {scanning ? "SCANNING" : `${onlineCount} ACTIVE`}
            </span>
          </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
