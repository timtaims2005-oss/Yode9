/**
 * LocalAIModelNexus — 3D Auto-Connect Hub + Model Download Center
 * Fixed: pingEngine uses server-side /api/local-engines/status/:id (no direct localhost fetch)
 * Tabs: NEXUS (3D orbit visualization) | MODELS (Ollama model downloader with progress)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Server, Wifi, WifiOff, Zap, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Copy, Check, ChevronDown, ChevronUp,
  Terminal, Download, Activity, Cpu, Layers, Database, Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Engine registry ───────────────────────────────────────────────────────────
const ENGINES = [
  {
    id: "ollama",
    label: "Ollama",
    port: 11434,
    color: "#00e5ff",
    icon: "🦙",
    desc: "أسرع محرك نماذج محلي — مثبت على Replit",
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
    icon: "🎨",
    desc: "واجهة رسومية + خادم API (المنفذ 1234)",
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
    icon: "🤖",
    desc: "ChatGPT مفتوح المصدر — API منفذ 1337",
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
    icon: "⚡",
    desc: "خادم oobabooga — تشغيل: python server.py --api",
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
    out[e.id] = { id: e.id, online: false, latencyMs: null, models: [], version: null, checking: false, lastChecked: 0, error: null };
  }
  return out as Record<EngineId, EngineStatus>;
}

// ── Server-side ping (fixes mixed content error) ──────────────────────────────
async function pingEngine(engine: typeof ENGINES[number]): Promise<{
  online: boolean; latencyMs: number | null; models: string[]; version: string | null; error: string | null;
}> {
  try {
    const res = await fetch(`/api/local-engines/status/${engine.id}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { online: false, latencyMs: null, models: [], version: null, error: `HTTP ${res.status}` };
    const data = await res.json() as {
      online: boolean; latencyMs: number | null; models: string[]; version: string | null;
    };
    return {
      online: data.online ?? false,
      latencyMs: data.latencyMs ?? null,
      models: data.models ?? [],
      version: data.version ?? null,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err.name === "AbortError" ? "timeout" : err.message) : "failed";
    return { online: false, latencyMs: null, models: [], version: null, error: msg };
  }
}

// ── 3D Nexus Canvas ───────────────────────────────────────────────────────────
function NexusCanvas3D({ statuses, scanning, selectedId, onSelect }: {
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
      const f = frameRef.current;
      const W = cv!.offsetWidth, H = cv!.offsetHeight;
      const cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);

      // Deep space bg
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, "#070d18");
      bg.addColorStop(1, "#020408");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 0.5;
      const gs = 36;
      for (let x = cx % gs; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = cy % gs; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Center nexus core
      const coreR = 22 + Math.sin(f * 0.04) * 3;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2);
      cg.addColorStop(0, "#00e5ff55"); cg.addColorStop(0.4, "#00e5ff22"); cg.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 2, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // Rotating hex
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(f * 0.015);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const r = coreR * 0.85;
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.strokeStyle = "#00e5ff60"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();

      // Scanline pulse when scanning
      if (scanning) {
        const scanA = ((f * 0.018) % (Math.PI * 2));
        const scanR = Math.min(cx, cy) * 0.95;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, scanR, scanA, scanA + 0.6); ctx.closePath();
        ctx.fillStyle = "rgba(0,229,255,0.04)"; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, scanR, scanA, scanA + 0.6);
        ctx.strokeStyle = "#00e5ff88"; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Engine orbs
      const orbitR = Math.min(W, H) * 0.33;
      hitRef.current = [];
      ENGINES.forEach((eng, i) => {
        const status = statuses[eng.id];
        const angle  = (i / ENGINES.length) * Math.PI * 2 - Math.PI / 2 + f * 0.006;
        const ox = cx + Math.cos(angle) * orbitR;
        const oy = cy + Math.sin(angle) * orbitR;
        const r  = selectedId === eng.id ? 28 : 22;
        const col = eng.color;
        hitRef.current.push({ id: eng.id, cx: ox, cy: oy, r: r + 8 });

        // Orbit trail
        const orbitAng = (i / ENGINES.length) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath(); ctx.arc(cx, cy, orbitR, orbitAng - 0.3, orbitAng + 0.3);
        ctx.strokeStyle = col + "22"; ctx.lineWidth = 0.8; ctx.stroke();

        // Connection line
        const la = status.online ? 0.5 + Math.sin(f * 0.06 + i) * 0.25 : 0.08;
        const lg = ctx.createLinearGradient(cx, cy, ox, oy);
        lg.addColorStop(0, `#00e5ff${Math.floor(la * 255).toString(16).padStart(2, "0")}`);
        lg.addColorStop(1, col + Math.floor(la * 180).toString(16).padStart(2, "0"));
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ox, oy);
        ctx.strokeStyle = lg; ctx.lineWidth = status.online ? 1.4 : 0.5; ctx.stroke();

        // Data packets
        if (status.online) {
          const t2 = ((f * 0.025 + i * 0.4) % 1);
          const px = cx + (ox - cx) * t2, py = cy + (oy - cy) * t2;
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = col + "dd"; ctx.fill();
        }

        // Glow rings
        if (status.online) {
          for (let ri = 0; ri < 3; ri++) {
            const rp = ((f * 0.018 + ri * 0.4) % 1);
            const rr = r * (1 + rp * 1.4);
            const ra = (1 - rp) * 0.3;
            ctx.beginPath(); ctx.arc(ox, oy, rr, 0, Math.PI * 2);
            ctx.strokeStyle = col + Math.floor(ra * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = 1; ctx.stroke();
          }
        }

        if (status.checking) {
          ctx.beginPath();
          ctx.arc(ox, oy, r + 6, (f * 0.06) % (Math.PI * 2), ((f * 0.06) + Math.PI * 1.4) % (Math.PI * 2));
          ctx.strokeStyle = col + "88"; ctx.lineWidth = 2; ctx.stroke();
        }

        // Orb fill
        const og = ctx.createRadialGradient(ox - r * 0.3, oy - r * 0.3, 0, ox, oy, r);
        if (status.online) {
          og.addColorStop(0, col + "cc"); og.addColorStop(0.5, col + "66"); og.addColorStop(1, col + "22");
        } else {
          og.addColorStop(0, "rgba(255,255,255,0.08)"); og.addColorStop(1, "rgba(255,255,255,0.02)");
        }
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fillStyle = og; ctx.fill();
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.strokeStyle = selectedId === eng.id ? col + "ff" : status.online ? col + "99" : col + "33";
        ctx.lineWidth = selectedId === eng.id ? 2 : 1.5; ctx.stroke();

        ctx.font = `bold ${r < 25 ? 9 : 10}px monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = status.online ? "#fff" : col + "77";
        ctx.fillText(eng.tag, ox, oy);
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = status.online ? col : "rgba(255,255,255,0.25)";
        ctx.fillText(eng.label, ox, oy + r + 10);
        ctx.beginPath(); ctx.arc(ox + r - 5, oy - r + 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = status.online ? "#22c55e" : status.checking ? "#fbbf24" : "#ef4444";
        ctx.fill();
      });

      // Floating particles
      for (let p = 0; p < 30; p++) {
        const a = (p / 30) * Math.PI * 2 + f * 0.003 * (p % 2 === 0 ? 1 : -1);
        const r = (Math.sin(p * 1.3 + f * 0.01) * 0.3 + 0.7) * orbitR * 1.35;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        const al = 0.15 + Math.sin(f * 0.03 + p) * 0.1;
        ctx.beginPath(); ctx.arc(px, py, 1 + (p % 3) * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${al})`; ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    function onClick(e: MouseEvent) {
      const rect = cv!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      for (const h of hitRef.current) {
        const dx = mx - h.cx, dy = my - h.cy;
        if (Math.sqrt(dx * dx + dy * dy) < h.r) { onSelect(h.id); return; }
      }
    }
    cv.addEventListener("click", onClick);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); cv.removeEventListener("click", onClick); };
  }, [statuses, scanning, selectedId, onSelect]);

  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" style={{ display: "block" }} />;
}

// ── Engine detail panel ───────────────────────────────────────────────────────
function EnginePanel({ engine, status, onConnect }: {
  engine: typeof ENGINES[number];
  status: EngineStatus;
  onConnect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${engine.color}0a 0%, rgba(0,0,0,0.6) 100%)`,
        border: `1px solid ${engine.color}${status.online ? "55" : "22"}`,
        boxShadow: status.online ? `0 0 30px ${engine.color}18` : "none",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${engine.color}18`, border: `1px solid ${engine.color}33`, boxShadow: status.online ? `0 0 16px ${engine.color}40` : "none" }}>
          {engine.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{engine.label}</span>
            {engine.replitNative && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e33" }}>REPLIT</span>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: `${engine.color}15`, color: engine.color }}>:{engine.port}</span>
          </div>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{engine.desc}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status.checking ? <Loader2 size={12} className="animate-spin text-yellow-400" />
            : status.online ? <CheckCircle2 size={12} className="text-green-400" />
            : <WifiOff size={12} className="text-red-400/60" />}
          <span className="text-[9px] font-bold"
            style={{ color: status.online ? "#22c55e" : status.checking ? "#fbbf24" : "#ef4444" }}>
            {status.online ? "متصل" : status.checking ? "فحص" : "غير متاح"}
          </span>
        </div>
      </div>

      {status.online && (
        <div className="flex gap-3 px-4 pb-2">
          <div className="flex items-center gap-1">
            <Activity size={9} style={{ color: engine.color }} />
            <span className="text-[9px] font-mono" style={{ color: engine.color }}>{status.latencyMs}ms</span>
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

      {status.online && status.models.length > 0 && (
        <div className="px-4 pb-2">
          <button onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white/60 transition-colors">
            {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            النماذج المحملة ({status.models.length})
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1 flex flex-wrap gap-1">
                {status.models.slice(0, 12).map(m => (
                  <span key={m} className="text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]"
                    style={{ background: `${engine.color}15`, color: engine.color + "cc" }}>{m}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!status.online && (
        <div className="px-4 pb-3">
          <div className="text-[9px] text-white/30 mb-1 flex items-center gap-1"><Terminal size={9} /> تشغيل:</div>
          <div className="flex items-center gap-2">
            <code className="text-[9px] font-mono px-2 py-1 rounded flex-1 truncate"
              style={{ background: "rgba(0,0,0,0.5)", color: engine.color + "bb", border: `1px solid ${engine.color}20` }}>
              {engine.installCmd}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(engine.installCmd); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
              className="p-1 rounded transition-colors" style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <motion.button onClick={onConnect} disabled={status.checking}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-xl text-[10px] font-bold tracking-wider flex items-center justify-center gap-2"
          style={{
            background: status.online ? `${engine.color}18` : `${engine.color}10`,
            border: `1px solid ${status.online ? engine.color + "55" : engine.color + "25"}`,
            color: status.online ? engine.color : engine.color + "77",
            cursor: status.checking ? "wait" : "pointer",
          }}>
          {status.checking ? <><Loader2 size={10} className="animate-spin" /> جاري الفحص...</>
            : status.online ? <><CheckCircle2 size={10} /> متصل — إعادة فحص</>
            : <><Wifi size={10} /> محاولة الاتصال</>}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Ollama Model Hub (3D download panel) ─────────────────────────────────────
interface OllamaModel {
  id: string;
  name: string;
  size: string;
  desc: string;
  color: string;
  tags: string[];
  pullName: string;
}

const OLLAMA_MODELS: OllamaModel[] = [
  { id: "qwen-0.5b",     name: "Qwen2.5",      size: "395 MB",  pullName: "qwen2.5:0.5b",       color: "#00e5ff", tags: ["سريع","خفيف"],         desc: "أسرع نموذج — مثالي للاختبار والتطوير" },
  { id: "gemma2-2b",     name: "Gemma 2",       size: "1.6 GB",  pullName: "gemma2:2b",           color: "#4ade80", tags: ["Google","متوازن"],      desc: "نموذج Google الخفيف عالي الجودة" },
  { id: "phi3-mini",     name: "Phi-3 Mini",    size: "2.3 GB",  pullName: "phi3:mini",           color: "#a78bfa", tags: ["Microsoft","ذكي"],      desc: "نموذج Microsoft المتقدم للاستدلال" },
  { id: "llama3.2-3b",   name: "Llama 3.2",     size: "2.0 GB",  pullName: "llama3.2:3b",         color: "#f97316", tags: ["Meta","دردشة"],         desc: "أحدث نماذج Meta الخفيفة" },
  { id: "mistral-7b",    name: "Mistral 7B",    size: "4.1 GB",  pullName: "mistral:7b",          color: "#fbbf24", tags: ["قوي","متعدد"],          desc: "الأكثر شعبية — سرعة + جودة فائقة" },
  { id: "llama3.1-8b",   name: "Llama 3.1",     size: "4.7 GB",  pullName: "llama3.1:8b",         color: "#fb923c", tags: ["Meta","متقدم"],         desc: "نموذج Meta القوي للمهام المعقدة" },
  { id: "deepseek-coder","name": "DeepSeek Coder","size": "3.8 GB","pullName": "deepseek-coder:6.7b","color": "#06b6d4", tags: ["كود","برمجة"],         desc: "أفضل نموذج للكود والبرمجة" },
  { id: "codellama-13b", name: "CodeLlama",     size: "7.4 GB",  pullName: "codellama:13b",       color: "#ec4899", tags: ["كود","ضخم"],            desc: "نموذج Meta للبرمجة الاحترافية" },
  { id: "qwen2.5-coder", name: "Qwen2.5 Coder", size: "4.7 GB", pullName: "qwen2.5-coder:7b",    color: "#818cf8", tags: ["كود","عربي"],           desc: "نموذج كود متعدد اللغات + العربية" },
];

interface PullState {
  status: "idle" | "pulling" | "done" | "error";
  pct: number;
  message: string;
}

function ModelCard({ model, ollamaOnline }: { model: OllamaModel; ollamaOnline: boolean }) {
  const [pull, setPull] = useState<PullState>({ status: "idle", pct: 0, message: "" });
  const [hovered, setHovered] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  function startPull() {
    if (pull.status === "pulling") return;
    if (!ollamaOnline) return;

    setPull({ status: "pulling", pct: 0, message: "بدء التحميل..." });

    fetch("/api/local-engines/pull-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model.pullName }),
    }).then(res => {
      if (!res.ok || !res.body) {
        setPull({ status: "error", pct: 0, message: "فشل الاتصال" });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            setPull(p => p.status === "pulling" ? { status: "done", pct: 100, message: "تم التحميل" } : p);
            return;
          }
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              const d = JSON.parse(line.slice(5).trim()) as {
                type: string; pct?: number; status?: string; message?: string;
              };
              if (d.type === "error") {
                setPull({ status: "error", pct: 0, message: d.message ?? "خطأ" });
                return;
              }
              if (d.type === "success") {
                setPull({ status: "done", pct: 100, message: "اكتمل التحميل" });
                return;
              }
              if (d.type === "progress") {
                setPull({ status: "pulling", pct: d.pct ?? 0, message: d.status ?? "تحميل..." });
              }
            } catch { /* ignore */ }
          }
          read();
        }).catch(() => setPull({ status: "error", pct: 0, message: "انقطع الاتصال" }));
      }
      read();
    }).catch(() => setPull({ status: "error", pct: 0, message: "فشل الاتصال" }));
  }

  useEffect(() => () => { esRef.current?.close(); }, []);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-[18px] flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${model.color}0d 0%, rgba(4,6,12,0.9) 100%)`,
        border: `1px solid ${model.color}${hovered ? "55" : "20"}`,
        boxShadow: hovered ? `0 0 24px ${model.color}20, 0 4px 24px rgba(0,0,0,0.5)` : "0 2px 12px rgba(0,0,0,0.4)",
        transition: "all 0.25s ease",
      }}
    >
      {/* Shimmer */}
      <AnimatePresence>
        {hovered && (
          <motion.div className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: `linear-gradient(135deg, ${model.color}06 0%, transparent 60%)` }} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${model.color}15`, border: `1px solid ${model.color}30` }}>
          <Package size={16} style={{ color: model.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white">{model.name}</span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${model.color}15`, color: model.color }}>{model.size}</span>
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {model.tags.map(t => (
              <span key={t} className="text-[8px] px-1 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-white/35 px-4 pb-3 leading-relaxed">{model.desc}</p>

      {/* Pull name */}
      <div className="px-4 pb-3">
        <code className="text-[9px] font-mono text-white/25">ollama pull {model.pullName}</code>
      </div>

      {/* Progress bar */}
      {pull.status !== "idle" && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono" style={{ color: pull.status === "error" ? "#ef4444" : pull.status === "done" ? "#22c55e" : model.color }}>
              {pull.message}
            </span>
            {pull.status === "pulling" && (
              <span className="text-[9px] font-mono" style={{ color: model.color }}>{pull.pct}%</span>
            )}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${pull.pct}%` }}
              transition={{ ease: "linear", duration: 0.3 }}
              style={{
                background: pull.status === "error" ? "#ef4444"
                  : pull.status === "done" ? "#22c55e"
                  : `linear-gradient(90deg, ${model.color}88, ${model.color})`,
                boxShadow: pull.status !== "error" ? `0 0 8px ${model.color}60` : "none",
              }}
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <div className="px-4 pb-4 mt-auto">
        <motion.button
          onClick={pull.status === "idle" || pull.status === "error" ? startPull : undefined}
          disabled={pull.status === "pulling" || pull.status === "done"}
          whileHover={pull.status === "idle" ? { scale: 1.02 } : {}}
          whileTap={pull.status === "idle" ? { scale: 0.97 } : {}}
          className="w-full py-2 rounded-xl text-[10px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
          style={{
            background: pull.status === "done" ? "#22c55e18"
              : pull.status === "error" ? "#ef444418"
              : !ollamaOnline ? "rgba(255,255,255,0.04)"
              : `${model.color}15`,
            border: `1px solid ${pull.status === "done" ? "#22c55e44"
              : pull.status === "error" ? "#ef444444"
              : !ollamaOnline ? "rgba(255,255,255,0.08)"
              : model.color + "40"}`,
            color: pull.status === "done" ? "#22c55e"
              : pull.status === "error" ? "#ef4444"
              : !ollamaOnline ? "rgba(255,255,255,0.2)"
              : model.color,
            cursor: pull.status === "pulling" || pull.status === "done" || !ollamaOnline ? "default" : "pointer",
          }}
        >
          {pull.status === "pulling" ? <><Loader2 size={10} className="animate-spin" /> تحميل... {pull.pct}%</>
            : pull.status === "done" ? <><CheckCircle2 size={10} /> تم التحميل</>
            : pull.status === "error" ? <><AlertCircle size={10} /> إعادة المحاولة</>
            : !ollamaOnline ? <><WifiOff size={10} /> Ollama غير متصل</>
            : <><Download size={10} /> تحميل النموذج</>}
        </motion.button>
      </div>
    </motion.div>
  );
}

// Canvas background for Models tab
function ModelsCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const fRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function resize() { cv!.width = cv!.offsetWidth * devicePixelRatio; cv!.height = cv!.offsetHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    function draw() {
      fRef.current++;
      const f = fRef.current;
      const W = cv!.offsetWidth, H = cv!.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      // Drifting grid
      ctx.strokeStyle = "rgba(0,229,255,0.025)"; ctx.lineWidth = 0.5;
      const gs = 60;
      for (let x = (f * 0.2) % gs; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (f * 0.1) % gs; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Floating orbs
      for (let p = 0; p < 12; p++) {
        const x = W * 0.5 + Math.cos(f * 0.004 + p * 2.1) * W * 0.45;
        const y = H * 0.5 + Math.sin(f * 0.003 + p * 1.7) * H * 0.4;
        const r = 2 + (p % 3);
        const al = 0.06 + Math.sin(f * 0.05 + p) * 0.03;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${al})`; ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ display: "block" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────
interface LocalAIModelNexusProps {
  open: boolean;
  onClose: () => void;
}

const PING_INTERVAL = 8000;
type Tab = "nexus" | "models";

export function LocalAIModelNexus({ open, onClose }: LocalAIModelNexusProps) {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<EngineId, EngineStatus>>(makeInitialStatus);
  const [scanning, setScanning] = useState(false);
  const [selectedId, setSelectedId] = useState<EngineId | null>(null);
  const [autoMode, setAutoMode]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("nexus");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOnline  = useRef(new Set<string>());

  const updateStatus = useCallback((id: EngineId, patch: Partial<EngineStatus>) => {
    setStatuses(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const pingOne = useCallback(async (engine: typeof ENGINES[number]) => {
    updateStatus(engine.id, { checking: true });
    const result = await pingEngine(engine);
    updateStatus(engine.id, { ...result, checking: false, lastChecked: Date.now() });
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

  useEffect(() => {
    if (!open) return;
    scanAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoMode && open) {
      intervalRef.current = setInterval(scanAll, PING_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, open]);

  const onlineCount = ENGINES.filter(e => statuses[e.id].online).length;
  const ollamaOnline = statuses["ollama"].online;
  const selectedEngine = selectedId ? ENGINES.find(e => e.id === selectedId) : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[8200] flex flex-col" style={{ background: "rgba(2,4,10,0.98)", backdropFilter: "blur(24px)" }}>
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)" }} />

      {/* HUD corners */}
      {(["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"] as const).map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-12 h-12 pointer-events-none opacity-40`} style={{
          borderTop:    i < 2  ? "1px solid #00e5ff" : "none",
          borderBottom: i >= 2 ? "1px solid #00e5ff" : "none",
          borderLeft:   i % 2 === 0 ? "1px solid #00e5ff" : "none",
          borderRight:  i % 2 === 1 ? "1px solid #00e5ff" : "none",
        }} />
      ))}

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 pt-3 pb-[10px] shrink-0"
        style={{ borderBottom: "1px solid rgba(0,229,255,0.1)" }}>
        <div className="flex items-center gap-4">
          <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#00e5ff18", border: "1px solid #00e5ff33" }}
            animate={{ boxShadow: ["0 0 8px #00e5ff20","0 0 20px #00e5ff50","0 0 8px #00e5ff20"] }}
            transition={{ duration: 2, repeat: Infinity }}>
            <Server size={15} className="text-cyan-400" />
          </motion.div>
          <div>
            <div className="text-white font-black text-sm tracking-widest">LOCAL AI MODEL NEXUS</div>
            <div className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.5)" }}>
              نظام التوصيل التلقائي والتحميل المباشر · v3.0 ULTRA
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 ml-4">
            {(["nexus","models"] as Tab[]).map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
                style={{
                  background: activeTab === tab ? "#00e5ff18" : "transparent",
                  border: `1px solid ${activeTab === tab ? "#00e5ff44" : "rgba(255,255,255,0.06)"}`,
                  color: activeTab === tab ? "#00e5ff" : "rgba(255,255,255,0.3)",
                }}>
                {tab === "nexus" ? "NEXUS" : "MODELS"}
              </button>
            ))}
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
          <button onClick={() => setAutoMode(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all"
            style={{
              background: autoMode ? "#00e5ff18" : "rgba(255,255,255,0.04)",
              border: `1px solid ${autoMode ? "#00e5ff44" : "rgba(255,255,255,0.08)"}`,
              color: autoMode ? "#00e5ff" : "rgba(255,255,255,0.3)",
            }}>
            <Activity size={9} /> AUTO {autoMode ? "ON" : "OFF"}
          </button>

          {/* Manual scan */}
          <button onClick={scanAll} disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: scanning ? "#fbbf24" : "rgba(255,255,255,0.4)",
            }}>
            <RefreshCw size={9} className={scanning ? "animate-spin" : ""} />
            {scanning ? "فحص..." : "فحص الآن"}
          </button>

          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-red-500/10 transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "nexus" ? (
            <motion.div key="nexus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex h-full gap-0">
              {/* Left: 3D Canvas */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <div className="relative w-full" style={{ maxWidth: 480, aspectRatio: "1/1" }}>
                  <NexusCanvas3D statuses={statuses} scanning={scanning} selectedId={selectedId} onSelect={setSelectedId} />
                </div>

                {/* AUTO CONNECT button */}
                <motion.button
                  onClick={scanAll}
                  disabled={scanning}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative overflow-hidden flex items-center gap-2.5 px-6 py-3 rounded-[18px] font-bold text-sm tracking-wider"
                  style={{
                    background: "linear-gradient(135deg, #00e5ff18 0%, #a78bfa18 100%)",
                    border: `1px solid ${scanning ? "#fbbf24aa" : onlineCount > 0 ? "#22c55eaa" : "#00e5ffaa"}`,
                    color: scanning ? "#fbbf24" : onlineCount > 0 ? "#22c55e" : "#00e5ff",
                    boxShadow: scanning ? "0 0 24px #fbbf2430" : onlineCount > 0 ? "0 0 24px #22c55e30" : "0 0 24px #00e5ff20",
                  }}>
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.12),transparent)" }}
                    animate={{ x: ["-100%","200%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
                  {scanning ? <><RefreshCw size={14} className="animate-spin" /> جاري الفحص الشامل...</>
                    : <><Zap size={14} /> AUTO CONNECT — تفعيل تلقائي</>}
                </motion.button>

                <div className="text-[9px] font-mono text-white/25 text-center">
                  {scanning ? "⟳ فحص جميع المحركات..."
                    : `تحديث تلقائي كل ${PING_INTERVAL / 1000}ث · اضغط على المحرك للتفاصيل`}
                </div>
              </div>

              {/* Right: Engine panels */}
              <div className="w-80 flex flex-col gap-3 p-4 overflow-y-auto shrink-0"
                style={{ borderLeft: "1px solid rgba(0,229,255,0.08)" }}>
                <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest px-1">
                  المحركات المحلية — {onlineCount} متصل
                </div>
                <AnimatePresence mode="popLayout">
                  {ENGINES.map(engine => (
                    <motion.div key={engine.id} layout
                      onClick={() => setSelectedId(prev => prev === engine.id ? null : engine.id)}
                      className="cursor-pointer">
                      {selectedId === engine.id && selectedEngine ? (
                        <EnginePanel engine={selectedEngine} status={statuses[engine.id]} onConnect={() => pingOne(engine)} />
                      ) : (
                        <motion.div whileHover={{ scale: 1.01, x: 2 }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                          style={{
                            background: statuses[engine.id].online ? `${engine.color}0d` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${engine.color}${statuses[engine.id].online ? "33" : "14"}`,
                          }}>
                          <span className="text-lg">{engine.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-white/80">{engine.label}</div>
                            <div className="text-[9px] font-mono" style={{ color: engine.color + "77" }}>
                              :{engine.port}{statuses[engine.id].latencyMs ? ` · ${statuses[engine.id].latencyMs}ms` : ""}
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
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Setup guide */}
                <div className="mt-2 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,229,255,0.08)" }}>
                  <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Terminal size={8} /> دليل الإعداد السريع
                  </div>
                  <div className="space-y-1.5 text-[9px] text-white/25">
                    <p><span style={{ color: "#00e5ff77" }}>Ollama:</span> مثبت تلقائياً على Replit ✓</p>
                    <p><span style={{ color: "#a78bfa77" }}>LM Studio:</span> lmstudio.ai → Local Server</p>
                    <p><span style={{ color: "#34d39977" }}>Jan:</span> jan.ai → Local API Server</p>
                    <p><span style={{ color: "#f9731677" }}>text-gen-webui:</span> python server.py --api</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative h-full overflow-y-auto">
              <ModelsCanvas />
              <div className="relative z-10 p-6">
                {/* Models header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-white font-black text-lg tracking-widest flex items-center gap-3">
                      <Database size={18} className="text-cyan-400" />
                      OLLAMA MODEL HUB
                    </div>
                    <div className="text-[10px] font-mono mt-1" style={{ color: "rgba(0,229,255,0.4)" }}>
                      تحميل النماذج مباشرة — يتطلب Ollama متصل
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{
                      background: ollamaOnline ? "#22c55e12" : "#ef444412",
                      border: `1px solid ${ollamaOnline ? "#22c55e33" : "#ef444433"}`,
                    }}>
                    {ollamaOnline
                      ? <><motion.div className="w-2 h-2 rounded-full bg-green-400" animate={{ opacity: [0.5,1,0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                          <span className="text-[10px] font-bold text-green-400">Ollama متصل</span></>
                      : <><WifiOff size={12} className="text-red-400" />
                          <span className="text-[10px] font-bold text-red-400">Ollama غير متصل</span></>}
                  </div>
                </div>

                {!ollamaOnline && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                    style={{ background: "#ef444410", border: "1px solid #ef444430" }}>
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                    <div className="text-[11px] text-red-300/80">
                      انتقل إلى تبويب <span className="font-bold text-red-300">NEXUS</span> واضغط <span className="font-bold">AUTO CONNECT</span> لتشغيل Ollama أولاً
                    </div>
                  </motion.div>
                )}

                {/* Model grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {OLLAMA_MODELS.map((model, i) => (
                    <motion.div key={model.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      <ModelCard model={model} ollamaOnline={ollamaOnline} />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-2xl text-center"
                  style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.08)" }}>
                  <p className="text-[9px] font-mono text-white/20">
                    التحميل يتم عبر Ollama مباشرة · يمكنك تحميل أي نموذج من <span style={{ color: "#00e5ff55" }}>ollama.com/library</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Floating FAB trigger button ───────────────────────────────────────────────
export function LocalAIFAB({ onOpen, onlineCount }: { onOpen: () => void; onlineCount: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.1, y: -3 }}
      whileTap={{ scale: 0.92 }}
      className="relative overflow-hidden flex flex-col items-center justify-center rounded-[18px]"
      style={{
        width: 52, height: 52,
        background: "linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(167,139,250,0.1) 100%)",
        border: `1.5px solid ${onlineCount > 0 ? "#22c55e66" : "rgba(0,229,255,0.4)"}`,
        boxShadow: hovered
          ? `0 0 28px ${onlineCount > 0 ? "#22c55e40" : "#00e5ff35"}, 0 8px 24px rgba(0,0,0,0.6)`
          : `0 0 12px ${onlineCount > 0 ? "#22c55e20" : "#00e5ff15"}, 0 4px 12px rgba(0,0,0,0.5)`,
        backdropFilter: "blur(12px)",
        cursor: "pointer",
      }}
      title="LOCAL AI MODEL NEXUS"
    >
      {/* Shimmer */}
      <motion.div className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.12) 0%, transparent 60%)" }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }} />

      {/* Pulse ring */}
      {onlineCount > 0 && (
        <motion.div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: "1px solid #22c55e" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }} />
      )}

      <Server size={16} style={{ color: onlineCount > 0 ? "#22c55e" : "#00e5ff" }} />
      <span className="text-[7px] font-bold tracking-wide mt-0.5"
        style={{ color: onlineCount > 0 ? "#22c55e" : "#00e5ff" }}>
        LOCAL AI
      </span>

      {/* Online badge */}
      {onlineCount > 0 && (
        <motion.div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black"
          style={{ background: "#22c55e", color: "#000", boxShadow: "0 0 8px #22c55e60" }}
          animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 1.5, repeat: Infinity }}>
          {onlineCount}
        </motion.div>
      )}
    </motion.button>
  );
}
