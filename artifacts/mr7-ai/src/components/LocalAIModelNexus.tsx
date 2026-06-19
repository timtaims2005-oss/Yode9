/**
 * LocalAIModelNexus — 3D Auto-Connect Hub for Local AI Engines
 * Ollama · LM Studio · Jan · text-gen-webui
 * Full 3D canvas, auto-ping every 8s, auto-connect on detection, WindowTray-ready.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Server, Wifi, WifiOff, Zap, RefreshCw, Play, CheckCircle2,
  AlertCircle, Loader2, Copy, Check, ChevronDown, ChevronUp,
  Terminal, Download, Globe, Activity, Cpu, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Engine registry ───────────────────────────────────────────────────────────
const ENGINES = [
  {
    id: "ollama",
    label: "Ollama",
    port: 11434,
    color: "#00e5ff",
    glow: "#00e5ff33",
    icon: "🦙",
    desc: "أسرع محرك نماذج محلي — مثبت على Replit",
    modelsPath: "/api/tags",
    versionPath: "/api/version",
    category: "Core",
    installCmd: "ollama pull qwen2.5:0.5b",
    corsEnv: "OLLAMA_ORIGINS=*",
    replitNative: true,
    tag: "OLL",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    port: 1234,
    color: "#a78bfa",
    glow: "#a78bfa33",
    icon: "🎨",
    desc: "واجهة رسومية + خادم API محلي (المنفذ 1234)",
    modelsPath: "/v1/models",
    versionPath: "/v1/models",
    category: "GUI",
    installCmd: "lmstudio.ai → Local Server → Start",
    corsEnv: "",
    replitNative: false,
    tag: "LMS",
  },
  {
    id: "jan",
    label: "Jan",
    port: 1337,
    color: "#34d399",
    glow: "#34d39933",
    icon: "🤖",
    desc: "ChatGPT مفتوح المصدر — API على منفذ 1337",
    modelsPath: "/v1/models",
    versionPath: "/v1/models",
    category: "GUI",
    installCmd: "jan.ai → Settings → Local API Server → Start",
    corsEnv: "",
    replitNative: false,
    tag: "JAN",
  },
  {
    id: "textgenwebui",
    label: "text-gen-webui",
    port: 5000,
    color: "#f97316",
    glow: "#f9731633",
    icon: "⚡",
    desc: "خادم oobabooga — تشغيل: python server.py --api",
    modelsPath: "/v1/models",
    versionPath: "/v1/models",
    category: "Core",
    installCmd: "python server.py --api --extensions openai",
    corsEnv: "--listen --api",
    replitNative: false,
    tag: "TGW",
  },
] as const;

type EngineId = typeof ENGINES[number]["id"];

interface EngineStatus {
  id: EngineId;
  online: boolean;
  latencyMs: number | null;
  models: string[];
  version: string | null;
  checking: boolean;
  lastChecked: number;
  error: string | null;
}

function makeInitialStatus(): Record<EngineId, EngineStatus> {
  const out: Partial<Record<EngineId, EngineStatus>> = {};
  for (const e of ENGINES) {
    out[e.id] = {
      id: e.id, online: false, latencyMs: null,
      models: [], version: null, checking: false,
      lastChecked: 0, error: null,
    };
  }
  return out as Record<EngineId, EngineStatus>;
}

// ── 3D Canvas ─────────────────────────────────────────────────────────────────
function NexusCanvas3D({
  statuses,
  scanning,
  selectedId,
  onSelect,
}: {
  statuses: Record<EngineId, EngineStatus>;
  scanning: boolean;
  selectedId: EngineId | null;
  onSelect: (id: EngineId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const frameRef  = useRef(0);
  const hitRef    = useRef<{ id: EngineId; cx: number; cy: number; r: number }[]>([]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;

    function resize() {
      cv!.width  = cv!.offsetWidth  * devicePixelRatio;
      cv!.height = cv!.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    function draw() {
      frameRef.current++;
      const f  = frameRef.current;
      const W  = cv!.offsetWidth;
      const H  = cv!.offsetHeight;
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      // ── deep space bg ──
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, "#070d18");
      bg.addColorStop(1, "#020408");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── grid ──
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.5;
      const gs = 36;
      for (let x = cx % gs; x < W; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = cy % gs; y < H; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── center nexus core ──
      const coreR = 22 + Math.sin(f * 0.04) * 3;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
      cg.addColorStop(0, "#00e5ff55");
      cg.addColorStop(0.4, "#00e5ff22");
      cg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // rotating hex
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(f * 0.015);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const r = coreR * 0.85;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.strokeStyle = "#00e5ff60";
      ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();

      // scanline pulse
      if (scanning) {
        const scanA = ((f * 0.018) % (Math.PI * 2));
        const scanR = Math.min(cx, cy) * 0.95;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, scanR, scanA, scanA + 0.6);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,229,255,0.04)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, scanR, scanA, scanA + 0.6);
        ctx.strokeStyle = "#00e5ff88";
        ctx.lineWidth = 1.5; ctx.stroke();
      }

      // ── engine orbs ──
      const count   = ENGINES.length;
      const orbitR  = Math.min(W, H) * 0.33;
      hitRef.current = [];

      ENGINES.forEach((eng, i) => {
        const status = statuses[eng.id];
        const angle  = (i / count) * Math.PI * 2 - Math.PI / 2 + f * 0.006;
        const ox     = cx + Math.cos(angle) * orbitR;
        const oy     = cy + Math.sin(angle) * orbitR;
        const isOnline   = status.online;
        const isChecking = status.checking;
        const isSelected = selectedId === eng.id;
        const r = isSelected ? 28 : 22;
        const col = eng.color;

        hitRef.current.push({ id: eng.id, cx: ox, cy: oy, r: r + 8 });

        // ── orbit trail ──
        const orbitAng = (i / count) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, orbitAng - 0.3, orbitAng + 0.3);
        ctx.strokeStyle = col + "22"; ctx.lineWidth = 0.8; ctx.stroke();

        // ── connection line to center ──
        const lineAlpha = isOnline ? 0.5 + Math.sin(f * 0.06 + i) * 0.25 : 0.08;
        const lineGrad = ctx.createLinearGradient(cx, cy, ox, oy);
        lineGrad.addColorStop(0, `#00e5ff${Math.floor(lineAlpha * 255).toString(16).padStart(2, "0")}`);
        lineGrad.addColorStop(1, col + Math.floor(lineAlpha * 180).toString(16).padStart(2, "0"));
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ox, oy);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = isOnline ? 1.4 : 0.5; ctx.stroke();

        // data packets on line when online
        if (isOnline) {
          const t2 = ((f * 0.025 + i * 0.4) % 1);
          const px = cx + (ox - cx) * t2;
          const py = cy + (oy - cy) * t2;
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = col + "dd"; ctx.fill();
        }

        // ── glow rings ──
        if (isOnline) {
          for (let ri = 0; ri < 3; ri++) {
            const rProg = ((f * 0.018 + ri * 0.4) % 1);
            const rRad  = r * (1 + rProg * 1.4);
            const rAlph = (1 - rProg) * 0.3;
            ctx.beginPath(); ctx.arc(ox, oy, rRad, 0, Math.PI * 2);
            ctx.strokeStyle = col + Math.floor(rAlph * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = 1; ctx.stroke();
          }
        }

        if (isChecking) {
          ctx.beginPath();
          ctx.arc(ox, oy, r + 6, (f * 0.06) % (Math.PI * 2), ((f * 0.06) + Math.PI * 1.4) % (Math.PI * 2));
          ctx.strokeStyle = col + "88"; ctx.lineWidth = 2; ctx.stroke();
        }

        // ── orb fill ──
        const orbGrad = ctx.createRadialGradient(ox - r * 0.3, oy - r * 0.3, 0, ox, oy, r);
        if (isOnline) {
          orbGrad.addColorStop(0, col + "cc");
          orbGrad.addColorStop(0.5, col + "66");
          orbGrad.addColorStop(1, col + "22");
        } else {
          orbGrad.addColorStop(0, "rgba(255,255,255,0.08)");
          orbGrad.addColorStop(1, "rgba(255,255,255,0.02)");
        }
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad; ctx.fill();

        // border
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? col + "ff" : isOnline ? col + "99" : col + "33";
        ctx.lineWidth = isSelected ? 2 : 1.5; ctx.stroke();

        // ── tag label ──
        ctx.font = `bold ${r < 25 ? 9 : 10}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = isOnline ? "#fff" : col + "77";
        ctx.fillText(eng.tag, ox, oy);

        // ── name below ──
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = isOnline ? col : "rgba(255,255,255,0.25)";
        ctx.fillText(eng.label, ox, oy + r + 10);

        // ── status dot ──
        ctx.beginPath(); ctx.arc(ox + r - 5, oy - r + 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = isOnline ? "#22c55e" : isChecking ? "#fbbf24" : "#ef4444";
        ctx.fill();
      });

      // ── floating particles ──
      for (let p = 0; p < 30; p++) {
        const a = (p / 30) * Math.PI * 2 + f * 0.003 * (p % 2 === 0 ? 1 : -1);
        const r = (Math.sin(p * 1.3 + f * 0.01) * 0.3 + 0.7) * orbitR * 1.35;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        const al = 0.15 + Math.sin(f * 0.03 + p) * 0.1;
        ctx.beginPath(); ctx.arc(px, py, 1 + (p % 3) * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${al})`; ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    // click hit testing
    function onClick(e: MouseEvent) {
      const rect = cv!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (const h of hitRef.current) {
        const dx = mx - h.cx, dy = my - h.cy;
        if (Math.sqrt(dx * dx + dy * dy) < h.r) {
          onSelect(h.id);
          return;
        }
      }
    }
    cv.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      cv.removeEventListener("click", onClick);
    };
  }, [statuses, scanning, selectedId, onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-pointer"
      style={{ display: "block" }}
    />
  );
}

// ── Engine detail panel ───────────────────────────────────────────────────────
function EnginePanel({
  engine,
  status,
  onConnect,
}: {
  engine: typeof ENGINES[number];
  status: EngineStatus;
  onConnect: (id: EngineId) => void;
}) {
  const [copied, setCopied]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  function copyCmd(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <motion.div
      key={engine.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${engine.color}0a 0%, rgba(0,0,0,0.6) 100%)`,
        border: `1px solid ${engine.color}${status.online ? "55" : "22"}`,
        boxShadow: status.online ? `0 0 30px ${engine.color}18` : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{
            background: `${engine.color}18`,
            border: `1px solid ${engine.color}33`,
            boxShadow: status.online ? `0 0 16px ${engine.color}40` : "none",
          }}
        >
          {engine.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{engine.label}</span>
            {engine.replitNative && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e33" }}>
                REPLIT
              </span>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: `${engine.color}15`, color: engine.color }}>
              :{engine.port}
            </span>
          </div>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{engine.desc}</p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status.checking ? (
            <Loader2 size={12} className="animate-spin text-yellow-400" />
          ) : status.online ? (
            <CheckCircle2 size={12} className="text-green-400" />
          ) : (
            <WifiOff size={12} className="text-red-400/60" />
          )}
          <span className="text-[9px] font-bold"
            style={{ color: status.online ? "#22c55e" : status.checking ? "#fbbf24" : "#ef4444" }}>
            {status.online ? "متصل" : status.checking ? "فحص" : "غير متاح"}
          </span>
        </div>
      </div>

      {/* Stats row when online */}
      {status.online && (
        <div className="flex gap-3 px-4 pb-3">
          <div className="flex items-center gap-1">
            <Activity size={9} style={{ color: engine.color }} />
            <span className="text-[9px] font-mono" style={{ color: engine.color }}>
              {status.latencyMs}ms
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Layers size={9} className="text-white/30" />
            <span className="text-[9px] text-white/40">{status.models.length} نموذج</span>
          </div>
          {status.version && (
            <div className="flex items-center gap-1">
              <Cpu size={9} className="text-white/30" />
              <span className="text-[9px] text-white/40">{status.version}</span>
            </div>
          )}
        </div>
      )}

      {/* Models list */}
      {status.online && status.models.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/60 transition-colors"
          >
            {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            النماذج المحملة ({status.models.length})
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1 flex flex-wrap gap-1"
              >
                {status.models.slice(0, 12).map(m => (
                  <span key={m} className="text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]"
                    style={{ background: `${engine.color}15`, color: engine.color + "cc" }}>
                    {m}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Offline install guide */}
      {!status.online && (
        <div className="px-4 pb-3">
          <div className="text-[9px] text-white/30 mb-1 flex items-center gap-1">
            <Terminal size={9} /> تشغيل:
          </div>
          <div className="flex items-center gap-2">
            <code className="text-[9px] font-mono px-2 py-1 rounded flex-1 truncate"
              style={{ background: "rgba(0,0,0,0.5)", color: engine.color + "bb", border: `1px solid ${engine.color}20` }}>
              {engine.installCmd}
            </code>
            <button
              onClick={() => copyCmd(engine.installCmd)}
              className="p-1 rounded transition-colors"
              style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.3)" }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
          </div>
          {engine.corsEnv && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-white/25">
              <Globe size={8} /> CORS: <code className="font-mono" style={{ color: engine.color + "88" }}>{engine.corsEnv}</code>
            </div>
          )}
        </div>
      )}

      {/* Connect button */}
      <div className="px-4 pb-4">
        <motion.button
          onClick={() => onConnect(engine.id)}
          disabled={status.checking}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-2"
          style={{
            background: status.online
              ? `${engine.color}18`
              : `${engine.color}10`,
            border: `1px solid ${status.online ? engine.color + "55" : engine.color + "25"}`,
            color: status.online ? engine.color : engine.color + "77",
            cursor: status.checking ? "wait" : "pointer",
          }}
        >
          {status.checking ? (
            <><Loader2 size={10} className="animate-spin" /> جاري الفحص...</>
          ) : status.online ? (
            <><CheckCircle2 size={10} /> متصل — إعادة فحص</>
          ) : (
            <><Wifi size={10} /> محاولة الاتصال</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Auto-connect pulse button ─────────────────────────────────────────────────
function AutoConnectButton({ scanning, onlineCount, onScan }: {
  scanning: boolean;
  onlineCount: number;
  onScan: () => void;
}) {
  return (
    <motion.button
      onClick={onScan}
      disabled={scanning}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className="relative overflow-hidden flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm tracking-wider"
      style={{
        background: "linear-gradient(135deg, #00e5ff18 0%, #a78bfa18 100%)",
        border: `1px solid ${scanning ? "#fbbf24aa" : onlineCount > 0 ? "#22c55eaa" : "#00e5ffaa"}`,
        color: scanning ? "#fbbf24" : onlineCount > 0 ? "#22c55e" : "#00e5ff",
        boxShadow: scanning
          ? "0 0 24px #fbbf2430"
          : onlineCount > 0
          ? "0 0 24px #22c55e30"
          : "0 0 24px #00e5ff20",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.12),transparent)" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
      {scanning ? (
        <><RefreshCw size={14} className="animate-spin" /> جاري الفحص الشامل...</>
      ) : (
        <><Zap size={14} /> AUTO CONNECT — تفعيل تلقائي</>
      )}
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface LocalAIModelNexusProps {
  open: boolean;
  onClose: () => void;
}

const PING_INTERVAL = 8000;

async function pingEngine(engine: typeof ENGINES[number]): Promise<{
  online: boolean; latencyMs: number | null; models: string[]; version: string | null; error: string | null;
}> {
  const base = `http://localhost:${engine.port}`;
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(base + engine.modelsPath, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { online: false, latencyMs: null, models: [], version: null, error: `HTTP ${res.status}` };
    const data = await res.json() as Record<string, unknown>;
    const latencyMs = Date.now() - t0;

    let models: string[] = [];
    if (engine.id === "ollama") {
      models = ((data.models ?? []) as { name: string }[]).map(m => m.name);
    } else {
      models = ((data.data ?? []) as { id: string }[]).map(m => m.id);
    }

    let version: string | null = null;
    if (engine.id === "ollama" && typeof data.version === "string") version = data.version;

    return { online: true, latencyMs, models, version, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : "failed";
    return { online: false, latencyMs: null, models: [], version: null, error: msg };
  }
}

export function LocalAIModelNexus({ open, onClose }: LocalAIModelNexusProps) {
  const { toast } = useToast();
  const [statuses, setStatuses]   = useState<Record<EngineId, EngineStatus>>(makeInitialStatus);
  const [scanning, setScanning]   = useState(false);
  const [selectedId, setSelectedId] = useState<EngineId | null>(null);
  const [autoMode, setAutoMode]   = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOnline  = useRef(new Set<string>());

  const updateStatus = useCallback((id: EngineId, patch: Partial<EngineStatus>) => {
    setStatuses(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const pingOne = useCallback(async (engine: typeof ENGINES[number]) => {
    updateStatus(engine.id, { checking: true });
    const result = await pingEngine(engine);
    updateStatus(engine.id, {
      ...result, checking: false, lastChecked: Date.now(),
    });

    // Notify when engine comes online
    if (result.online && !prevOnline.current.has(engine.id)) {
      prevOnline.current.add(engine.id);
      toast({ description: `${engine.icon} ${engine.label} متصل — ${result.models.length} نموذج جاهز` });
    } else if (!result.online) {
      prevOnline.current.delete(engine.id);
    }
  }, [updateStatus, toast]);

  const scanAll = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    await Promise.all(ENGINES.map(e => pingOne(e)));
    setScanning(false);
  }, [scanning, pingOne]);

  // Auto-ping on mount and interval
  useEffect(() => {
    if (!open) return;
    scanAll();
    if (autoMode) {
      intervalRef.current = setInterval(scanAll, PING_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open, autoMode]);

  // toggle auto mode
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoMode && open) {
      intervalRef.current = setInterval(scanAll, PING_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoMode, open]);

  const onlineCount = ENGINES.filter(e => statuses[e.id].online).length;
  const selectedEngine = selectedId ? ENGINES.find(e => e.id === selectedId) : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[8000] flex flex-col"
      style={{ background: "rgba(2,4,10,0.98)", backdropFilter: "blur(24px)" }}
    >
      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)",
        }}
      />

      {/* Corner HUD brackets */}
      {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-12 h-12 pointer-events-none opacity-40`} style={{
          borderTop:    i < 2  ? "1px solid #00e5ff" : "none",
          borderBottom: i >= 2 ? "1px solid #00e5ff" : "none",
          borderLeft:   i % 2 === 0 ? "1px solid #00e5ff" : "none",
          borderRight:  i % 2 === 1 ? "1px solid #00e5ff" : "none",
        }} />
      ))}

      {/* ── Header ─── */}
      <div className="relative flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,229,255,0.1)" }}>
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "#00e5ff18", border: "1px solid #00e5ff33" }}
            animate={{ boxShadow: ["0 0 8px #00e5ff20", "0 0 20px #00e5ff50", "0 0 8px #00e5ff20"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Server size={14} className="text-cyan-400" />
          </motion.div>
          <div>
            <div className="text-white font-black text-sm tracking-widest">LOCAL AI MODEL NEXUS</div>
            <div className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.5)" }}>
              نظام التوصيل التلقائي للنماذج المحلية · v3.0 ULTRA
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Online counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: onlineCount > 0 ? "#22c55e18" : "rgba(255,255,255,0.04)", border: `1px solid ${onlineCount > 0 ? "#22c55e33" : "rgba(255,255,255,0.08)"}` }}>
            <motion.div className="w-1.5 h-1.5 rounded-full"
              style={{ background: onlineCount > 0 ? "#22c55e" : "#ef4444" }}
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-[10px] font-bold" style={{ color: onlineCount > 0 ? "#22c55e" : "#ef4444" }}>
              {onlineCount}/{ENGINES.length} متصل
            </span>
          </div>

          {/* Auto mode toggle */}
          <button
            onClick={() => setAutoMode(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all"
            style={{
              background: autoMode ? "#00e5ff18" : "rgba(255,255,255,0.04)",
              border: `1px solid ${autoMode ? "#00e5ff44" : "rgba(255,255,255,0.08)"}`,
              color: autoMode ? "#00e5ff" : "rgba(255,255,255,0.3)",
            }}
          >
            <Activity size={9} />
            AUTO {autoMode ? "ON" : "OFF"}
          </button>

          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-red-500/10 transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Body ─── */}
      <div className="flex-1 flex gap-0 overflow-hidden min-h-0">

        {/* Left: 3D Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          {/* 3D scene */}
          <div className="relative w-full" style={{ maxWidth: 480, aspectRatio: "1/1" }}>
            <NexusCanvas3D
              statuses={statuses}
              scanning={scanning}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Auto connect button */}
          <AutoConnectButton scanning={scanning} onlineCount={onlineCount} onScan={scanAll} />

          {/* Status line */}
          <div className="text-[9px] font-mono text-white/25 text-center">
            {scanning
              ? "⟳ فحص جميع المحركات..."
              : `آخر فحص: ${new Date().toLocaleTimeString("ar")} · تحديث تلقائي كل ${PING_INTERVAL / 1000}ث`}
          </div>
        </div>

        {/* Right: Engine panels */}
        <div className="w-80 flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
          style={{ borderLeft: "1px solid rgba(0,229,255,0.08)" }}>

          {/* Quick status header */}
          <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest px-1">
            المحركات المحلية — {onlineCount} متصل
          </div>

          <AnimatePresence mode="popLayout">
            {ENGINES.map(engine => (
              <motion.div
                key={engine.id}
                layout
                onClick={() => setSelectedId(prev => prev === engine.id ? null : engine.id)}
                className="cursor-pointer"
              >
                {selectedId === engine.id && selectedEngine ? (
                  <EnginePanel
                    engine={selectedEngine}
                    status={statuses[engine.id]}
                    onConnect={() => pingOne(engine)}
                  />
                ) : (
                  /* compact card */
                  <motion.div
                    whileHover={{ scale: 1.01, x: 2 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{
                      background: statuses[engine.id].online
                        ? `${engine.color}0d`
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${engine.color}${statuses[engine.id].online ? "33" : "14"}`,
                    }}
                  >
                    <span className="text-lg">{engine.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-white/80">{engine.label}</div>
                      <div className="text-[9px] font-mono" style={{ color: engine.color + "77" }}>
                        :{engine.port}
                        {statuses[engine.id].latencyMs
                          ? ` · ${statuses[engine.id].latencyMs}ms`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {statuses[engine.id].checking ? (
                        <Loader2 size={10} className="animate-spin text-yellow-400" />
                      ) : statuses[engine.id].online ? (
                        <motion.div className="w-2 h-2 rounded-full bg-green-400"
                          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-red-400/40" />
                      )}
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>▸</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Setup guide */}
          <div className="mt-2 p-3 rounded-xl"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,229,255,0.08)" }}>
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Download size={8} /> دليل الإعداد السريع
            </div>
            <div className="space-y-2 text-[9px] text-white/25">
              <p><span style={{ color: "#00e5ff77" }}>Ollama:</span> مثبت تلقائياً على Replit ✓</p>
              <p><span style={{ color: "#a78bfa77" }}>LM Studio:</span> lmstudio.ai → Local Server</p>
              <p><span style={{ color: "#34d39977" }}>Jan:</span> jan.ai → Local API Server</p>
              <p><span style={{ color: "#f9731677" }}>text-gen-webui:</span> python server.py --api</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Floating trigger button (always visible) ──────────────────────────────────
export function LocalAINexusTrigger({ onOpen, onlineCount }: { onOpen: () => void; onlineCount: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.93 }}
      className="relative overflow-hidden flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-[10px] tracking-wider"
      style={{
        background: "linear-gradient(135deg, rgba(0,229,255,0.12) 0%, rgba(167,139,250,0.08) 100%)",
        border: `1px solid ${onlineCount > 0 ? "#22c55e55" : "rgba(0,229,255,0.25)"}`,
        color: onlineCount > 0 ? "#22c55e" : "#00e5ff",
        boxShadow: hovered
          ? `0 0 20px ${onlineCount > 0 ? "#22c55e30" : "#00e5ff25"}`
          : "none",
        backdropFilter: "blur(12px)",
      }}
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: onlineCount > 0 ? "#22c55e" : "#00e5ff" }}
        animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <Server size={10} />
      LOCAL AI
      {onlineCount > 0 && (
        <span className="text-[8px] px-1 rounded"
          style={{ background: "#22c55e22", color: "#22c55e" }}>
          {onlineCount}
        </span>
      )}

      {/* shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.1),transparent)" }}
        animate={{ x: hovered ? ["-100%", "200%"] : "-100%" }}
        transition={{ duration: 1.2, repeat: hovered ? Infinity : 0, ease: "linear" }}
      />
    </motion.button>
  );
}
