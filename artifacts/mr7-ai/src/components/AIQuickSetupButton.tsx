import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";

interface ProviderConfig {
  id: string; name: string; baseURL: string;
  bestModel: string; bestModelLabel: string;
  providerName: ProviderName; color: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id:"groq",       name:"Groq",       color:"#f59e0b", baseURL:"https://api.groq.com/openai/v1",                          bestModel:"llama-3.3-70b-versatile",        bestModelLabel:"Llama 3.3 70B",     providerName:"groq"       },
  { id:"openai",     name:"OpenAI",     color:"#10b981", baseURL:"https://api.openai.com/v1",                               bestModel:"gpt-4o",                         bestModelLabel:"GPT-4o",            providerName:"openai"     },
  { id:"anthropic",  name:"Anthropic",  color:"#f97316", baseURL:"https://api.anthropic.com/v1",                            bestModel:"claude-sonnet-4-5",              bestModelLabel:"Claude Sonnet 4.5", providerName:"anthropic"  },
  { id:"gemini",     name:"Gemini",     color:"#3b82f6", baseURL:"https://generativelanguage.googleapis.com/v1beta/openai", bestModel:"gemini-2.5-flash",               bestModelLabel:"Gemini 2.5 Flash",  providerName:"gemini"     },
  { id:"openrouter", name:"OpenRouter", color:"#8b5cf6", baseURL:"https://openrouter.ai/api/v1",                            bestModel:"deepseek/deepseek-chat-v3-0324", bestModelLabel:"DeepSeek V3",       providerName:"openrouter" },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── GREEN ORBITAL ATOM — always vivid, state only changes core/label ─────────
function OrbitalAtom({ phase }: { phase: Phase }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tickRef   = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const DPR = Math.min(window.devicePixelRatio * 2, 4);
    const W = 52, H = 52;
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    const cx = W / 2, cy = H / 2;

    // Fixed vivid colors — ALWAYS bright regardless of state
    const GREEN  = "rgba(0,255,136,";
    const CYAN   = "rgba(0,229,255,";
    const WHITE  = "rgba(255,255,255,";
    const LIME   = "rgba(124,252,0,";

    // 18 orbital particles — 3 tilted ellipses
    const particles = Array.from({ length: 18 }, (_, i) => {
      const ring = Math.floor(i / 6);  // 0, 1, 2
      return {
        angle: (i / 6) * Math.PI * 2 + ring * 0.42,
        speed: 0.018 + ring * 0.007,
        rx:    14 + ring * 4.5,
        tilt:  0.28 + ring * 0.32,
        col:   ring === 0 ? GREEN : ring === 1 ? CYAN : LIME,
        size:  1.0 + ring * 0.4,
        trail: [] as {x: number; y: number}[],
      };
    });

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;
      const phaseNow = phaseRef.current;
      ctx.clearRect(0, 0, W, H);

      // Deep ambient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
      bg.addColorStop(0,   "rgba(0,255,136,0.12)");
      bg.addColorStop(0.6, "rgba(0,229,255,0.04)");
      bg.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI*2);
      ctx.fillStyle = bg; ctx.fill();

      // Scanning sweep beam
      if (phaseNow === "scanning") {
        const angle = (t * 0.06) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22, -0.5, 0.5);
        ctx.closePath();
        const sweep = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
        sweep.addColorStop(0, "rgba(0,229,255,0.7)");
        sweep.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = sweep; ctx.fill();
        ctx.restore();
      }

      // 3 orbit ellipses (dashed, anti-aliased)
      const orbitDefs = [
        { rx: 14, tilt: 0.28, rot: t*0.012,  col: GREEN  },
        { rx: 18, tilt: 0.52, rot: -t*0.009, col: CYAN   },
        { rx: 22, tilt: 0.68, rot: t*0.007,  col: LIME   },
      ];
      orbitDefs.forEach(o => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(o.rot);
        ctx.setLineDash([2.5, 4.5]);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.rx, o.rx * o.tilt, 0, 0, Math.PI*2);
        ctx.strokeStyle = `${o.col}0.22)`;
        ctx.lineWidth = 0.9; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Particles + trails
      particles.forEach(p => {
        p.angle += p.speed * (phaseNow === "scanning" ? 1.9 : 1);
        const px = cx + Math.cos(p.angle) * p.rx;
        const py = cy + Math.sin(p.angle) * p.rx * p.tilt;
        const depth = (Math.sin(p.angle) + 1) / 2;
        const alpha = 0.25 + depth * 0.75;

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 6) p.trail.shift();
        p.trail.forEach((pt, ti) => {
          const ta = alpha * 0.18 * (ti / p.trail.length);
          const tr = p.size * 0.4 * (ti / p.trail.length);
          if (tr < 0.1) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI*2);
          ctx.fillStyle = `${p.col}${ta})`; ctx.fill();
        });

        // Glow halo
        const gr = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
        gr.addColorStop(0,   `${p.col}${alpha})`);
        gr.addColorStop(0.4, `${p.col}${alpha * 0.35})`);
        gr.addColorStop(1,   `${p.col}0)`);
        ctx.beginPath(); ctx.arc(px, py, p.size * 3, 0, Math.PI*2);
        ctx.fillStyle = gr; ctx.fill();

        // Bright core
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4, p.size * 0.7), 0, Math.PI*2);
        ctx.fillStyle = `${WHITE}${alpha * 0.95})`; ctx.fill();
      });

      // Central nucleus
      const coreR = 5.5 + (phaseNow === "scanning" ? Math.sin(t*0.18)*1.5 : 0);
      // Halo
      const cHalo = ctx.createRadialGradient(cx, cy, coreR*0.6, cx, cy, coreR*3.5);
      cHalo.addColorStop(0,   "rgba(0,255,136,0.55)");
      cHalo.addColorStop(0.5, "rgba(0,255,136,0.15)");
      cHalo.addColorStop(1,   "rgba(0,255,136,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR*3.5, 0, Math.PI*2);
      ctx.fillStyle = cHalo; ctx.fill();
      // Body
      const cBody = ctx.createRadialGradient(cx-coreR*0.3, cy-coreR*0.35, 0, cx, cy, coreR);
      cBody.addColorStop(0,   "rgba(255,255,255,0.95)");
      cBody.addColorStop(0.3, "rgba(0,255,136,1)");
      cBody.addColorStop(0.7, "rgba(0,200,100,0.8)");
      cBody.addColorStop(1,   "rgba(0,120,60,0.5)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI*2);
      ctx.fillStyle = cBody; ctx.fill();
      // Grid lines on nucleus
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI*2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, coreR, coreR*0.3, 0, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(0,255,136,0.2)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Done: green check
      if (phaseNow === "done") {
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
        ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(cx-4.5, cy+0.5); ctx.lineTo(cx-1, cy+4); ctx.lineTo(cx+5.5, cy-4.5);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      // Fail: red X
      if (phaseNow === "fail") {
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx-4, cy-4); ctx.lineTo(cx+4, cy+4);
        ctx.moveTo(cx+4, cy-4); ctx.lineTo(cx-4, cy+4);
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseRef = useRef<Phase>(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 52, height: 52, imageRendering: "crisp-edges", display: "block", flexShrink: 0 }}
    />
  );
}

export function AIQuickSetupButton() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase]           = useState<Phase>("idle");
  const [matchedName, setMatchedName] = useState("");
  const [showTip, setShowTip]         = useState(false);
  const tipRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning");
    try {
      for (const p of PROVIDERS) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL, streaming: true, autoTitle: true } });
          dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: p.bestModel });
          setMatchedName(p.name); setPhase("done");
          toast({ description: `AUTO — ${p.name} · ${p.bestModelLabel}` });
          setTimeout(() => setPhase("idle"), 3500);
          return;
        }
      }
      if ((state.settings.personalApiKey?.trim().length ?? 0) > 10) {
        dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
        setMatchedName("Personal"); setPhase("done");
        toast({ description: "AUTO — مفتاحك الشخصي" });
        setTimeout(() => setPhase("idle"), 3500);
        return;
      }
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = await res.json() as { providers?: { id: string; available: boolean }[] };
          for (const p of PROVIDERS) {
            if (data.providers?.find(sp => sp.id === p.id && sp.available)) {
              dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: p.bestModel });
              dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
              setMatchedName(p.name); setPhase("done");
              toast({ description: `AUTO — ${p.name} · ${p.bestModelLabel}` });
              setTimeout(() => setPhase("idle"), 3500);
              return;
            }
          }
        }
      } catch { /* ignore */ }
      setPhase("fail");
      toast({ description: "لم يُعثر على مزوّد — أدخل مفتاح API", variant: "destructive" });
      setTimeout(() => setPhase("idle"), 2500);
    } catch {
      setPhase("fail");
      setTimeout(() => setPhase("idle"), 2500);
    }
  }, [phase, state.settings.personalApiKey, dispatch, toast]);

  useEffect(() => {
    if (!sessionStorage.getItem("mr7-autoinit")) {
      sessionStorage.setItem("mr7-autoinit", "1");
      const t = setTimeout(run, 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); run(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [run]);

  const label = phase === "scanning" ? "SCAN" : phase === "done" ? (matchedName || "OK") : phase === "fail" ? "FAIL" : "AUTO";

  return (
    <div className="relative flex-shrink-0"
      onMouseEnter={() => { tipRef.current && clearTimeout(tipRef.current); setShowTip(true); }}
      onMouseLeave={() => { tipRef.current = setTimeout(() => setShowTip(false), 200); }}>
      <button
        onClick={run}
        disabled={phase === "scanning"}
        className="relative flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl transition-all active:scale-95 hover:scale-[1.03]"
        style={{
          background: "linear-gradient(135deg,rgba(0,255,136,0.08) 0%,rgba(0,229,255,0.04) 100%)",
          border: "1px solid rgba(0,255,136,0.35)",
          boxShadow: "0 0 22px rgba(0,255,136,0.18), 0 0 8px rgba(0,229,255,0.1), inset 0 1px 0 rgba(0,255,136,0.1)",
          cursor: phase === "scanning" ? "wait" : "pointer",
        }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
        title="AUTO SETUP · Ctrl+Shift+A"
      >
        {/* HUD corners */}
        <span className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor: "rgba(0,255,136,0.6)" }} />
        <span className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r pointer-events-none" style={{ borderColor: "rgba(0,255,136,0.6)" }} />
        {/* Scan line */}
        {phase === "scanning" && (
          <motion.span className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.9),transparent)", top: "50%" }}
            animate={{ top: ["15%","85%","15%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
        )}
        <OrbitalAtom phase={phase} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span className="text-[7px] font-black tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.55)" }}>
            {phase === "scanning" ? "SCAN" : "AUTO AI"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={label}
              initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="text-[11px] font-black"
              style={{ color: phase === "fail" ? "#ef4444" : phase === "done" ? "#22c55e" : "rgba(0,255,136,0.9)" }}>
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
      </button>

      <AnimatePresence>
        {showTip && phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.94 }} transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-[9999] pointer-events-none whitespace-nowrap"
          >
            <div className="rounded-xl px-3.5 py-2.5 text-center"
              style={{ background: "#070a0a", border: "1px solid rgba(0,255,136,0.2)", boxShadow: "0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,136,0.08)" }}>
              <p className="text-[11px] font-black text-white mb-0.5">الإعداد التلقائي للذكاء الاصطناعي</p>
              <p className="text-[9px] text-white/40">يكتشف أفضل مزوّد متاح ويُفعّله</p>
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {["Ctrl","Shift","A"].map((k, i) => (
                  <span key={k}>
                    {i > 0 && <span className="text-[8px] text-white/30 mx-0.5">+</span>}
                    <kbd className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                      style={{ background: "#111", border: "1px solid rgba(0,255,136,0.25)", color: "rgba(0,255,136,0.8)" }}>{k}</kbd>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
