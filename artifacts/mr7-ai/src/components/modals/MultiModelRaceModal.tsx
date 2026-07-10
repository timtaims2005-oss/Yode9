import { useEffect, useRef, useState, useCallback } from "react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Activity, X, RotateCcw, Copy, Check, ChevronDown, ChevronUp, Loader2, Bolt, BarChart3, Timer, TrendingUp, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Feature 12 & 13: Add Groq engines to race ─────────────────────────────
const LOCAL_ENGINES = [
  { id: "ollama",    label: "Ollama",      color: "#00e5ff", icon: "🦙", port: 11434, groq: false },
  { id: "lmstudio", label: "LM Studio",   color: "#a78bfa", icon: "🎨", port: 1234,  groq: false },
  { id: "jan",       label: "Jan",          color: "#34d399", icon: "🤖", port: 1337,  groq: false },
  { id: "gpt4all",  label: "GPT4All",      color: "#f97316", icon: "🧠", port: 4891,  groq: false },
  { id: "openwebui", label: "Open WebUI",  color: "#06d6a0", icon: "🌐", port: 3000,  groq: false },
  { id: "llamafile", label: "Llamafile",   color: "#fbbf24", icon: "📄", port: 8081,  groq: false },
  { id: "kobold",   label: "KoboldCPP",   color: "#f72585", icon: "⚔️", port: 5001,  groq: false },
] as const;

const GROQ_ENGINES = [
  { id: "groq-llama3-8b",  label: "Groq LLaMA3 8B",   color: "#fbbf24", icon: "⚡", port: 0, groq: true, model: "llama-3.1-8b-instant"   },
  { id: "groq-mixtral",    label: "Groq Mixtral 8×7B", color: "#c084fc", icon: "⚡", port: 0, groq: true, model: "mixtral-8x7b-32768"      },
  { id: "groq-gemma2",     label: "Groq Gemma2 9B",    color: "#34d399", icon: "⚡", port: 0, groq: true, model: "gemma2-9b-it"            },
] as const;

const ENGINES = [...LOCAL_ENGINES, ...GROQ_ENGINES] as const;
type EngineId = typeof ENGINES[number]["id"];

interface EngineResult {
  id: EngineId;
  status: "waiting" | "streaming" | "done" | "error";
  text: string;
  elapsedMs: number | null;
  tokensEst: number;
  latencyMs: number | null;
  firstTokenMs: number | null;
  wordsPerSec: number | null;
}

// ── Background 3D Particle Canvas ─────────────────────────────────────────
function ParticleBg({ engineColors }: { engineColors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const fRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    const resize = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    const N = 120;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * cv.width,
      y: Math.random() * cv.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.3,
      c: engineColors[Math.floor(Math.random() * engineColors.length)] ?? "#00e5ff",
      a: Math.random() * 0.4 + 0.1,
    }));

    function draw() {
      fRef.current++;
      const W = cv!.offsetWidth, H = cv!.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // Deep bg
      ctx.fillStyle = "#040609";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Particles
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        const pulse = (Math.sin(fRef.current * 0.02 + p.x * 0.01) + 1) / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = p.c + Math.round(p.a * 255 * (0.5 + pulse * 0.5)).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = pts[i].c + Math.round((1 - dist / 80) * 0.15 * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />;
}

// ── 3D Progress Arc ────────────────────────────────────────────────────────
function ProgressArc({ color, progress, size = 44 }: { color: string; progress: number; size?: number }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - Math.min(progress, 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "22"} strokeWidth={3} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.3s ease", filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ── Engine Response Card ───────────────────────────────────────────────────
function EngineCard({
  eng, result, rank, expanded, onToggle, onCopy,
}: {
  eng: typeof ENGINES[number];
  result: EngineResult;
  rank: number | null;
  expanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const medals = ["🥇", "🥈", "🥉"];
  const medal  = rank !== null && rank < 3 ? medals[rank] : null;
  const isDone = result.status === "done";
  const isErr  = result.status === "error";
  const isStream = result.status === "streaming";
  const words  = result.text.trim().split(/\s+/).filter(Boolean).length;
  const wps    = isDone && result.elapsedMs ? (words / (result.elapsedMs / 1000)).toFixed(1) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] overflow-hidden relative"
      style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
        background: `linear-gradient(135deg, ${eng.color}08 0%, #060810 100%)`,
        border: `1px solid ${isErr ? "#ef444444" : isDone ? eng.color + "55" : isStream ? eng.color + "33" : "#ffffff0a"}`,
        boxShadow: isDone ? `0 0 24px ${eng.color}15` : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Scan line when streaming */}
      {isStream && (
        <motion.div
          className="absolute inset-x-0 h-[1px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${eng.color}, transparent)`, zIndex: 2 }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 cursor-pointer" onClick={onToggle}>
        {/* Icon + arc */}
        <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
          <div className="absolute inset-0">
            <ProgressArc color={eng.color} progress={isStream ? 0.5 : isDone ? 1 : 0} />
          </div>
          <span className="text-base z-10 relative">{eng.icon}</span>
          {medal && (
            <span className="absolute -top-1 -right-1 text-xs z-20">{medal}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold" style={{ color: eng.color }}>{eng.label}</span>
            {'groq' in eng && eng.groq && (
              <span className="text-[7px] px-1 py-0.5 rounded font-black tracking-wider"
                style={{ background: "rgba(251,191,36,0.18)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)" }}>
                GROQ GPU
              </span>
            )}
            {rank !== null && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: eng.color + "22", color: eng.color }}>
                #{rank + 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isDone ? (
              <>
                <span className="text-[9px] text-green-400 font-mono">{result.elapsedMs}ms</span>
                <span className="text-[8px] text-white/30">·</span>
                <span className="text-[9px] text-white/40 font-mono">{words}w</span>
                {wps && <><span className="text-[8px] text-white/30">·</span><span className="text-[9px] text-white/40 font-mono">{wps}w/s</span></>}
              </>
            ) : isErr ? (
              <span className="text-[9px] text-red-400">Error</span>
            ) : isStream ? (
              <span className="text-[9px] font-mono animate-pulse" style={{ color: eng.color }}>{words} words...</span>
            ) : (
              <span className="text-[9px] text-white/25">Waiting...</span>
            )}
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isStream && <Loader2 size={12} className="animate-spin" style={{ color: eng.color }} />}
          {isDone && (
            <button onClick={e => { e.stopPropagation(); handleCopy(); }} className="p-1 rounded text-white/30 hover:text-white/70 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          )}
          {expanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
        </div>
      </div>

      {/* Response text */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t"
            style={{ borderColor: eng.color + "22" }}
          >
            <div className="p-3 text-[11px] text-white/80 leading-relaxed max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
              {isErr ? (
                <span className="text-red-400">Connection failed — engine not running on port {eng.port}</span>
              ) : result.text ? (
                result.text
              ) : (
                <span className="text-white/20 italic">Awaiting response...</span>
              )}
              {isStream && <span className="animate-pulse text-cyan-400">▊</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Live Race Stats Canvas ─────────────────────────────────────────────────
function RaceStatsBar({ results }: { results: EngineResult[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const fRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    cv.width = cv.offsetWidth * devicePixelRatio;
    cv.height = 56 * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const W = cv.offsetWidth, H = 56;

    const maxWords = Math.max(...results.map(r => r.text.split(/\s+/).filter(Boolean).length), 1);

    function draw() {
      fRef.current++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#060810";
      ctx.fillRect(0, 0, W, H);

      const barW = Math.floor(W / ENGINES.length) - 4;

      ENGINES.forEach((eng, i) => {
        const res   = results.find(r => r.id === eng.id);
        const words = res ? res.text.split(/\s+/).filter(Boolean).length : 0;
        const norm  = words / maxWords;
        const x     = i * (barW + 4) + 2;
        const pulse = (Math.sin(fRef.current * 0.1 + i) + 1) / 2;

        // Track
        ctx.fillStyle = "#ffffff05";
        ctx.fillRect(x, 8, barW, H - 16);

        if (res && (res.status === "streaming" || res.status === "done")) {
          const barH = Math.max(2, (H - 18) * norm);
          const grd  = ctx.createLinearGradient(x, H - 9 - barH, x, H - 9);
          grd.addColorStop(0, eng.color + "cc");
          grd.addColorStop(1, eng.color + "44");
          ctx.fillStyle = grd;
          ctx.fillRect(x, H - 9 - barH, barW, barH);

          // Shimmer
          if (res.status === "streaming") {
            ctx.fillStyle = eng.color + "44";
            ctx.fillRect(x, H - 9 - barH - 2 + pulse * barH, barW, 2);
          }

          ctx.fillStyle = eng.color;
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${words}w`, x + barW / 2, H - 2);
        }

        ctx.fillStyle = res?.status === "done" ? eng.color : "#ffffff33";
        ctx.font = "6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(eng.label.slice(0, 4).toUpperCase(), x + barW / 2, 8);
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [results]);

  return (
    <canvas ref={canvasRef} className="w-full rounded-lg" style={{ height: 56, border: "1px solid rgba(0,229,255,0.08)" }} />
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function MultiModelRaceModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [prompt,    setPrompt]    = useState("Explain quantum entanglement in one short paragraph.");
  const [results,   setResults]   = useState<EngineResult[]>(() =>
    ENGINES.map(e => ({ id: e.id, status: "waiting", text: "", elapsedMs: null, tokensEst: 0, latencyMs: null, firstTokenMs: null, wordsPerSec: null }))
  );
  const [racing,    setRacing]    = useState(false);
  const [expanded,  setExpanded]  = useState<Set<EngineId>>(new Set());
  const [finishOrder, setFinishOrder] = useState<EngineId[]>([]);
  const abortRef  = useRef<AbortController | null>(null);
  const startTime = useRef<number>(0);

  const resetResults = useCallback(() => {
    setResults(ENGINES.map(e => ({ id: e.id, status: "waiting", text: "", elapsedMs: null, tokensEst: 0, latencyMs: null, firstTokenMs: null, wordsPerSec: null })));
    setFinishOrder([]);
  }, []);

  // ── Feature 14: Groq race runner ─────────────────────────────────────────
  const runGroqEngine = useCallback(async (
    engId: EngineId,
    model: string,
    groqApiKey: string,
    signal: AbortSignal,
  ) => {
    const t0 = Date.now();
    let firstToken = true;
    let buf = "";
    try {
      setResults(prev => prev.map(r => r.id === engId ? { ...r, status: "streaming" } : r));
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqApiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: true, max_tokens: 512 }),
        signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`Groq ${resp.status}`);
      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        const lines = raw.split("\n");
        raw = lines.pop() ?? "";
        for (const ln of lines) {
          const d = ln.replace(/^data:\s*/, "").trim();
          if (!d || d === "[DONE]") continue;
          try {
            const chunk = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
            const token = chunk.choices?.[0]?.delta?.content ?? "";
            if (token) {
              if (firstToken) {
                firstToken = false;
                setResults(prev => prev.map(r => r.id === engId ? { ...r, latencyMs: Date.now() - t0 } : r));
              }
              buf += token;
              setResults(prev => prev.map(r => r.id === engId ? { ...r, text: r.text + token } : r));
            }
          } catch { /* skip */ }
        }
      }
      const elapsed = Date.now() - t0;
      const words   = buf.split(/\s+/).filter(Boolean).length;
      setFinishOrder(fo => fo.includes(engId) ? fo : [...fo, engId]);
      setResults(prev => prev.map(r => r.id === engId
        ? { ...r, status: "done", elapsedMs: elapsed, tokensEst: words, wordsPerSec: elapsed > 0 ? Math.round(words / elapsed * 1000) : 0 }
        : r));
    } catch {
      setResults(prev => prev.map(r => r.id === engId ? { ...r, status: "error" } : r));
    }
  }, [prompt]);

  const startRace = useCallback(async () => {
    if (racing) { abortRef.current?.abort(); return; }
    if (!prompt.trim()) { toast({ title: "Enter a prompt first" }); return; }

    resetResults();
    setRacing(true);
    setExpanded(new Set(ENGINES.map(e => e.id)));
    startTime.current = Date.now();

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // ── Groq engines run in parallel via direct Groq API ─────────────────
    const groqKey = localStorage.getItem("mr7-ai-p-key-groq") ?? "";
    const groqPromises = GROQ_ENGINES.map(e =>
      groqKey
        ? runGroqEngine(e.id, e.model, groqKey, signal)
        : Promise.resolve(setResults(prev => prev.map(r => r.id === e.id ? { ...r, status: "error" } : r)))
    );

    // ── Local engines via lb/race SSE ─────────────────────────────────────
    const localRace = (async () => {
      try {
        const resp = await fetch("/api/lb/race", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
          signal,
        });

        if (!resp.body) throw new Error("No body");

        const reader = resp.body.getReader();
        const dec    = new TextDecoder();
        let buf      = "";

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
              const d = JSON.parse(line) as {
                type: string; engine?: string; content?: string;
                elapsedMs?: number; tokensEst?: number; latencyMs?: number;
                message?: string; totalText?: string;
              };

              const eid = d.engine as EngineId | undefined;

              setResults(prev => prev.map(r => {
                if (!eid || r.id !== eid) return r;
                switch (d.type) {
                  case "engine_start":
                    return { ...r, status: "streaming", latencyMs: d.latencyMs ?? null };
                  case "engine_chunk":
                    return { ...r, status: "streaming", text: r.text + (d.content ?? "") };
                  case "engine_done":
                    setFinishOrder(fo => fo.includes(eid) ? fo : [...fo, eid]);
                    return {
                      ...r, status: "done",
                      text: d.totalText ?? r.text,
                      elapsedMs: d.elapsedMs ?? null,
                      tokensEst: d.tokensEst ?? 0,
                    };
                  case "engine_error":
                    return { ...r, status: "error" };
                  default:
                    return r;
                }
              }));

              if (d.type === "race_done") break;
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast({ title: "Race error", description: (e as Error).message, variant: "destructive" });
        }
      }
    })();

    await Promise.allSettled([localRace, ...groqPromises]);
    setRacing(false);
  }, [racing, prompt, resetResults, toast, runGroqEngine]);

  const toggleExpand = (id: EngineId) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doneResults = results.filter(r => r.status === "done").sort((a, b) => (a.elapsedMs ?? 9999) - (b.elapsedMs ?? 9999));

  const engineColors = ENGINES.map(e => e.color);

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div
        className="relative w-full mx-auto rounded-[18px] overflow-hidden flex flex-col"
        style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
          border: "1px solid rgba(0,229,255,0.12)",
          boxShadow: "0 0 80px rgba(0,229,255,0.06), 0 0 160px rgba(167,139,250,0.04)",
          maxHeight: "92vh",
        }}
      >
        {/* Particle background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <ParticleBg engineColors={engineColors} />
        </div>

        {/* Header */}
        <div
          className="relative flex items-center gap-4 px-4 pt-3 pb-[10px] border-b shrink-0"
          style={{ borderColor: "rgba(0,229,255,0.1)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)" }}
          >
            🏁
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              Multi-Model Race
              <motion.span
                className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                style={{ background: "rgba(0,229,255,0.15)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)" }}
                animate={racing ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {racing ? "⚡ RACING" : `${ENGINES.length} ENGINES`}
              </motion.span>
            </h2>
            <p className="text-[11px] text-white/35 mt-0.5">
            7 local engines + 3 Groq GPU engines · {localStorage.getItem("mr7-ai-p-key-groq") ? <span className="text-amber-400">Groq key configured</span> : <span className="text-white/25">Set Groq key in Ollama Hub → GROQ ARENA</span>}
          </p>
          </div>

          {/* Trophy count */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400 font-mono">{doneResults.length}</div>
              <div className="text-[9px] text-white/30 uppercase">Done</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400 font-mono">
                {results.filter(r => r.status === "streaming").length}
              </div>
              <div className="text-[9px] text-white/30 uppercase">Live</div>
            </div>
          </div>

          <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/08 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Prompt input */}
        <div className="relative flex items-center gap-3 px-6 py-3 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
          <div className="flex-1 relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={racing}
              rows={2}
              placeholder="Enter your prompt to race across all engines..."
              className="w-full resize-none rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-white/25 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(0,229,255,0.15)",
                fontFamily: "monospace",
              }}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) startRace(); }}
            />
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <motion.button
              onClick={startRace}
              disabled={!prompt.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[11px] transition-all disabled:opacity-50"
              style={{
                background: racing
                  ? "rgba(239,68,68,0.2)"
                  : "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(167,139,250,0.2))",
                color: racing ? "#ef4444" : "#00e5ff",
                border: racing ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(0,229,255,0.4)",
                boxShadow: racing ? "none" : "0 0 20px rgba(0,229,255,0.15)",
              }}
            >
              {racing ? <><X size={12} /> Stop</> : <><Zap size={12} /> Race!</>}
            </motion.button>
            <button
              onClick={() => { resetResults(); setExpanded(new Set()); }}
              disabled={racing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative px-6 py-2 shrink-0">
          <RaceStatsBar results={results} />
        </div>

        {/* Engine grid */}
        <div className="relative flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          {/* Finish order banner */}
          <AnimatePresence>
            {doneResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 py-2 mb-3 flex-wrap"
              >
                <Trophy size={12} className="text-yellow-400 shrink-0" />
                <span className="text-[10px] text-white/40 font-mono">Finish order:</span>
                {doneResults.map((r, i) => {
                  const eng = ENGINES.find(e => e.id === r.id)!;
                  return (
                    <span key={r.id} className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: eng.color + "18", color: eng.color, border: `1px solid ${eng.color}33` }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`} {eng.label} {r.elapsedMs}ms
                    </span>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ENGINES.map(eng => {
              const res  = results.find(r => r.id === eng.id)!;
              const rank = doneResults.findIndex(r => r.id === eng.id);
              return (
                <EngineCard
                  key={eng.id}
                  eng={eng}
                  result={res}
                  rank={rank >= 0 ? rank : null}
                  expanded={expanded.has(eng.id)}
                  onToggle={() => toggleExpand(eng.id)}
                  onCopy={() => navigator.clipboard.writeText(res.text)}
                />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative flex items-center justify-between px-6 py-2 border-t shrink-0"
          style={{ borderColor: "rgba(0,229,255,0.06)", background: "rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-center gap-3">
            {ENGINES.map(eng => {
              const r = results.find(x => x.id === eng.id);
              return (
                <div key={eng.id} className="flex items-center gap-1" title={eng.label}>
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: r?.status === "done" ? eng.color : r?.status === "streaming" ? eng.color : "#ffffff15" }}
                    animate={r?.status === "streaming" ? { opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-white/20 font-mono">MULTI-MODEL RACE · Ctrl+Enter to launch</span>
          <div className="flex items-center gap-1.5">
            {racing && <motion.div className="w-1.5 h-1.5 rounded-full bg-yellow-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />}
            <span className="text-[9px] text-white/30 font-mono">
              {racing ? `${results.filter(r => r.status === "streaming").length} streaming` : `${doneResults.length}/${ENGINES.length} done`}
            </span>
          </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
