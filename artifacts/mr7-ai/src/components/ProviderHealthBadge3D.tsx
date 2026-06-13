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

const PROVIDER_SHORT: Record<string, string> = {
  groq:"GROQ", openai:"OAI", anthropic:"CLO", gemini:"GEM",
  openrouter:"OR", custom:"CUST", personal:"KEY", xai:"GROK",
  deepseek:"DS", mistral:"MIS", perplexity:"PP", together:"TG",
};

// ── PURPLE HOLOGRAPHIC SPHERE — always vivid, health is just an overlay ──────
function PurpleSphere({ health, latency }: { health: Health; latency: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const healthRef = useRef<Health>(health);
  const latRef    = useRef<number | null>(latency);

  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { latRef.current = latency; }, [latency]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    const SIZE = 44;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const SR  = 11.5;
    const ORX = SR + 8;

    // Fixed vivid PURPLE palette — always visible
    const PUR  = "rgba(139,92,246,";
    const VIO  = "rgba(167,139,250,";
    const PINK = "rgba(236,72,153,";
    const CYA  = "rgba(192,132,252,";

    // 10 orbital particles on 2 tilted rings
    const particles = Array.from({ length: 10 }, (_, i) => ({
      angle: (i / 10) * Math.PI * 2 + (i % 2 === 0 ? 0 : 0.5),
      speed: 0.65 + (i % 3) * 0.22,
      ring:  i < 5 ? 0 : 1,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.022;
      const t  = tRef.current;
      const h  = healthRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Ambient glow — always purple
      const ambient = ctx.createRadialGradient(cx, cy, SR * 0.4, cx, cy, SR + 16);
      ambient.addColorStop(0,    "rgba(139,92,246,0.28)");
      ambient.addColorStop(0.45, "rgba(139,92,246,0.10)");
      ambient.addColorStop(1,    "rgba(139,92,246,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR + 16, 0, Math.PI * 2);
      ctx.fillStyle = ambient; ctx.fill();

      // Outer pulse rings
      const p1 = (Math.sin(t * 2.0) + 1) / 2;
      const p2 = (Math.sin(t * 1.35 + 1) + 1) / 2;
      ctx.beginPath(); ctx.arc(cx, cy, SR + 3.5 + p1 * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${0.32 * (1 - p1 * 0.5)})`; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, SR + 1.5 + p2 * 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(167,139,250,${0.2 * (1 - p2 * 0.4)})`; ctx.lineWidth = 0.6; ctx.stroke();

      // Tilted orbit ring 1
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.22);
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.ellipse(0, 0, ORX, ORX * 0.30, 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = `${PUR}0.38)`; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      // Tilted orbit ring 2
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-t * 0.16 + Math.PI / 4);
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.ellipse(0, 0, ORX * 0.78, ORX * 0.55, 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = `${VIO}0.22)`; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      // Back particles
      particles.forEach((p, i) => {
        const a = t * p.speed * 0.9 + (i * Math.PI * 2) / 10;
        const depth = Math.sin(a + 0.4);
        if (depth > 0) return;
        const ry = p.ring === 0 ? ORX * 0.30 : ORX * 0.55;
        const rx2 = p.ring === 0 ? ORX : ORX * 0.78;
        const px = cx + Math.cos(a) * rx2;
        const py = cy + Math.sin(a) * ry;
        ctx.beginPath(); ctx.arc(px, py, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `${p.ring === 0 ? PUR : VIO}${0.25 + (depth + 1) * 0.15})`; ctx.fill();
      });

      // Sphere body — always deep purple
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(12,6,28,0.97)"; ctx.fill();

      // Diffuse lighting — purple gradient
      const diff = ctx.createRadialGradient(cx - SR*0.28, cy - SR*0.3, 0, cx, cy, SR);
      diff.addColorStop(0,    "rgba(192,132,252,0.85)");
      diff.addColorStop(0.45, "rgba(139,92,246,0.6)");
      diff.addColorStop(0.8,  "rgba(88,28,135,0.45)");
      diff.addColorStop(1,    "rgba(45,12,70,0.6)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - SR*0.42, cy - SR*0.46, 0, cx - SR*0.12, cy - SR*0.12, SR * 0.95);
      spec.addColorStop(0,   "rgba(255,255,255,0.88)");
      spec.addColorStop(0.2, "rgba(255,255,255,0.3)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // Rim light — pink/magenta
      const rim = ctx.createRadialGradient(cx + SR*0.6, cy + SR*0.44, 0, cx + SR*0.5, cy + SR*0.36, SR * 0.78);
      rim.addColorStop(0, "rgba(236,72,153,0.5)");
      rim.addColorStop(1, "rgba(236,72,153,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // Equator lines
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR, SR * 0.26, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(192,132,252,0.16)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, SR * Math.abs(Math.cos(t * 0.32)) + 0.3, SR, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(139,92,246,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();

      // Checking spinner (always cyan ring)
      if (h === "checking") {
        ctx.beginPath(); ctx.arc(cx, cy, SR - 1.8, t, t + Math.PI * 1.3);
        ctx.strokeStyle = "rgba(192,132,252,0.9)"; ctx.lineWidth = 2.2; ctx.stroke();
      }

      // Front particles
      particles.forEach((p, i) => {
        const a = t * p.speed * 0.9 + (i * Math.PI * 2) / 10;
        const depth = Math.sin(a + 0.4);
        if (depth <= 0) return;
        const ry = p.ring === 0 ? ORX * 0.30 : ORX * 0.55;
        const rx2 = p.ring === 0 ? ORX : ORX * 0.78;
        const px  = cx + Math.cos(a) * rx2;
        const py  = cy + Math.sin(a) * ry;
        const sz  = 1.05 + depth * 1.4;
        const col = p.ring === 0 ? PUR : VIO;
        const glw = ctx.createRadialGradient(px, py, 0, px, py, sz * 3);
        glw.addColorStop(0,   `${col}0.95)`);
        glw.addColorStop(0.4, `${col}0.4)`);
        glw.addColorStop(1,   `${col}0)`);
        ctx.beginPath(); ctx.arc(px, py, sz * 3, 0, Math.PI * 2);
        ctx.fillStyle = glw; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, sz * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();
      });

      // Health status blip (corner indicator)
      const blipColor =
        h === "healthy"  ? [34,  197, 94 ] :
        h === "slow"     ? [245, 158, 11 ] :
        h === "error"    ? [226, 18,  39 ] : [139, 92, 246];
      const [br, bg, bb] = blipColor;
      const blinkA =
        h === "healthy"  ? 0.85 + Math.sin(t * 2.5) * 0.15 :
        h === "error"    ? 0.5  + Math.sin(t * 8.5) * 0.5  :
        h === "slow"     ? 0.6  + Math.sin(t * 4)   * 0.4  :
        h === "checking" ? 0.4  + Math.sin(t * 12)  * 0.4  : 0.5;
      const bx = cx + SR * 0.72, by = cy - SR * 0.72;
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 5.5);
      bg2.addColorStop(0, `rgba(${br},${bg},${bb},${blinkA * 0.6})`);
      bg2.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
      ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = bg2; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${br},${bg},${bb},${blinkA})`; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas ref={canvasRef}
      style={{ width: 44, height: 44, imageRendering: "crisp-edges", display: "block", flexShrink: 0 }} />
  );
}

// ── Sparkline for tooltip ─────────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const cv = ref.current; if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const W = 200, H = 44;
    const DPR = window.devicePixelRatio || 1;
    cv.width = W*DPR; cv.height = H*DPR; ctx.scale(DPR, DPR);
    let t = 0;
    const minV = Math.min(...data)*0.85, maxV = Math.max(...data)*1.12 || 1;
    const pts = data.map((v, i) => ({
      x: 6 + (i / (data.length-1)) * (W-12),
      y: H - 8 - ((v-minV)/(maxV-minV)) * (H-16),
    }));
    function draw() {
      raf.current = requestAnimationFrame(draw);
      t += 0.05; ctx.clearRect(0, 0, W, H);
      for (let gx = 0; gx < W; gx += 22) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.strokeStyle="rgba(139,92,246,0.06)"; ctx.lineWidth=0.5; ctx.stroke(); }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(139,92,246,0.28)"); g.addColorStop(1, "rgba(139,92,246,0)");
      ctx.beginPath(); ctx.moveTo(pts[0].x, H);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, H); ctx.closePath(); ctx.fillStyle=g; ctx.fill();
      ctx.beginPath(); pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      ctx.strokeStyle="rgba(167,139,250,0.95)"; ctx.lineWidth=1.6; ctx.lineJoin="round"; ctx.stroke();
      pts.forEach((p, i) => {
        const isLast = i===pts.length-1;
        const pulse = isLast ? (Math.sin(t*4)+1)/2 : 0;
        if (isLast) {
          ctx.beginPath(); ctx.arc(p.x,p.y,4+pulse*4,0,Math.PI*2);
          ctx.fillStyle=`rgba(139,92,246,${0.15*(1-pulse)})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x,p.y,isLast?2.8+pulse*1.2:1.8,0,Math.PI*2);
        ctx.fillStyle=isLast?"rgba(255,255,255,0.92)":"rgba(167,139,250,0.7)"; ctx.fill();
      });
      ctx.font="bold 8px monospace"; ctx.fillStyle="rgba(167,139,250,0.9)"; ctx.textAlign="right";
      ctx.fillText(`${data[data.length-1]}ms`, W-2, pts[pts.length-1].y-4);
    }
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [data]);
  return <canvas ref={ref} style={{ width: 200, height: 44 }} />;
}

// ── Main Badge ────────────────────────────────────────────────────────────────
export function ProviderHealthBadge3D() {
  const { state }  = useStore();
  const [health,        setHealth]        = useState<Health>("checking");
  const [latency,       setLatency]       = useState<number | null>(null);
  const [history,       setHistory]       = useState<number[]>([]);
  const [checks,        setChecks]        = useState(0);
  const [showTip,       setShowTip]       = useState(false);

  const avg = history.length > 0 ? Math.round(history.reduce((a,b)=>a+b,0)/history.length) : null;
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
        const h: Health = found ? (ms < 1500 ? "healthy" : "slow") :
          ((state.settings.personalApiKey?.trim().length ?? 0) > 10 ? "healthy" : "error");
        setHealth(h); setLatency(ms);
        setHistory(p => [...p.slice(-9), ms]);
        setChecks(c => c + 1);
      } else { setHealth("error"); }
    } catch { setHealth("error"); }
  }, [state.activeProvider, state.settings.personalApiKey]);

  useEffect(() => { recheck(); const id = setInterval(recheck, 90000); return () => clearInterval(id); }, [recheck]);

  const prov   = state.activeProvider;
  const label  = PROVIDER_SHORT[prov] ?? prov.slice(0,5).toUpperCase();
  const hLabel = HEALTH_LABEL[health];
  const hColor =
    health === "healthy"  ? "#22c55e" :
    health === "slow"     ? "#f59e0b" :
    health === "error"    ? "#e21227" :
    health === "checking" ? "#a78bfa" : "#6b7280";
  const statusText =
    health === "checking" ? "جارٍ الفحص" :
    health === "healthy"  ? "متصل" :
    health === "slow"     ? "بطيء" :
    health === "error"    ? "خطأ" : "غير معروف";

  return (
    <div className="relative flex-shrink-0" style={{ isolation: "isolate" }}>
      <motion.button
        onClick={recheck}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className="flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-xl transition-all"
        style={{
          background: "linear-gradient(135deg,rgba(139,92,246,0.1) 0%,rgba(167,139,250,0.05) 100%)",
          border: "1px solid rgba(139,92,246,0.38)",
          boxShadow: "0 0 22px rgba(139,92,246,0.2), 0 0 8px rgba(167,139,250,0.1), inset 0 1px 0 rgba(167,139,250,0.08)",
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label="فحص صحة المزود"
      >
        <PurpleSphere health={health} latency={latency} />
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 pr-0.5">
          <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(167,139,250,0.6)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            {label}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 700, color: hColor, fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {latency != null ? `${latency}ms` : hLabel}
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.94 }}
            transition={{ duration: 0.16 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
            style={{
              width: 240, background: "rgba(6,3,18,0.98)",
              border: "1px solid rgba(139,92,246,0.28)", borderRadius: 14,
              boxShadow: "0 0 40px rgba(139,92,246,0.16), 0 4px 28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(167,139,250,0.1)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="h-[2px] rounded-t-[14px]" style={{ background: "linear-gradient(90deg,transparent,#8b5cf6,transparent)" }} />
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black tracking-[0.25em] font-mono" style={{ color: "#a78bfa" }}>{prov.toUpperCase()}</div>
                  <div className="text-white text-xs font-semibold mt-0.5">{statusText}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <motion.div className="w-2.5 h-2.5 rounded-full"
                    style={{ background: hColor, boxShadow: `0 0 8px ${hColor}` }}
                    animate={{ opacity: health === "error" ? [1,0.2] : [0.6,1] }}
                    transition={{ duration: health === "error" ? 0.4 : 1.2, repeat: Infinity, repeatType: "reverse" }} />
                </div>
              </div>

              {history.length >= 2 && (
                <div className="rounded-xl overflow-hidden" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
                  <div className="px-2 pt-1.5 text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.6)" }}>
                    آخر {history.length} قراءات
                  </div>
                  <Sparkline data={history} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label:"الحالي", value: latency != null ? `${latency}ms` : "---" },
                  { label:"أدنى",   value: min != null ? `${min}ms` : "---" },
                  { label:"أعلى",   value: max != null ? `${max}ms` : "---" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-1.5 text-center"
                    style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <div className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.5)" }}>{label}</div>
                    <div className="text-[10px] font-bold font-mono mt-0.5" style={{ color: "#a78bfa" }}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[9px]">
                <span style={{ color: "rgba(167,139,250,0.5)" }}>
                  متوسط: <span className="font-mono font-bold" style={{ color: "rgba(167,139,250,0.85)" }}>{avg != null ? `${avg}ms` : "---"}</span>
                </span>
                <span style={{ color: "rgba(167,139,250,0.5)" }}>فحوصات: <span className="font-bold" style={{ color: "rgba(167,139,250,0.85)" }}>{checks}</span></span>
              </div>

              <motion.button onClick={() => { recheck(); setShowTip(false); }}
                className="w-full rounded-lg py-1.5 text-[10px] font-bold tracking-wider uppercase"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }}
                whileHover={{ background: "rgba(139,92,246,0.22)" }}
                whileTap={{ scale: 0.97 }}>
                إعادة الفحص
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
