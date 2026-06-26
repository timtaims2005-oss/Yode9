/**
 * Ultra HUD Overlay — واجهة عرض رأسية فائقة الدقة
 * مؤشرات حية، تنبيهات تهديد، إحصاءات نظام
 */
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SystemStat {
  label: string;
  value: number;
  max: number;
  color: string;
}

function StatBar({ stat }: { stat: SystemStat }) {
  const pct = Math.min(100, (stat.value / stat.max) * 100);
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="w-16 text-right opacity-60 shrink-0">{stat.label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: stat.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span style={{ color: stat.color }} className="w-8 text-right shrink-0">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function useAnimatedValue(base: number, variance: number, speed = 1) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const iv = setInterval(() => {
      setVal(base + (Math.random() - 0.5) * variance * 2);
    }, 1000 / speed);
    return () => clearInterval(iv);
  }, [base, variance, speed]);
  return val;
}

function ThreatAlert({ level }: { level: "LOW" | "MED" | "HIGH" | "CRITICAL" }) {
  const colors: Record<string, string> = {
    LOW:      "#22c55e",
    MED:      "#f59e0b",
    HIGH:     "#f97316",
    CRITICAL: "#e21227",
  };
  const c = colors[level];
  return (
    <motion.div
      animate={{ opacity: level === "CRITICAL" ? [1, 0.4, 1] : 1 }}
      transition={{ repeat: Infinity, duration: 0.6 }}
      className="flex items-center gap-1.5"
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
      <span className="font-mono text-[10px]" style={{ color: c }}>
        THREAT: {level}
      </span>
    </motion.div>
  );
}

function CornerBracket({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute w-4 h-4 border-[#00e5ff]/50";
  const styles: Record<string, string> = {
    tl: "top-0 left-0 border-t border-l",
    tr: "top-0 right-0 border-t border-r",
    bl: "bottom-0 left-0 border-b border-l",
    br: "bottom-0 right-0 border-b border-r",
  };
  return <div className={`${base} ${styles[corner]}`} />;
}

function HUDPanel({
  children, className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative bg-black/40 border border-cyan-500/20 backdrop-blur-sm rounded p-2 ${className}`}>
      <CornerBracket corner="tl" />
      <CornerBracket corner="tr" />
      <CornerBracket corner="bl" />
      <CornerBracket corner="br" />
      {children}
    </div>
  );
}

// ── Live FPS / Performance counter ────────────────────────────────────────
function FPSCounter() {
  const [fps, setFps] = useState(60);
  const frameRef = useRef(0);
  const lastRef  = useRef(performance.now());

  useEffect(() => {
    let raf: number;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frameRef.current++;
      if (now - lastRef.current >= 500) {
        setFps(Math.round(frameRef.current * 2));
        frameRef.current = 0;
        lastRef.current  = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const color = fps >= 90 ? "#22c55e" : fps >= 55 ? "#f59e0b" : "#e21227";
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px]">
      <span className="opacity-50">FPS</span>
      <span style={{ color }} className="font-bold text-xs">{fps}</span>
    </div>
  );
}

// ── Mini Radar Blip ────────────────────────────────────────────────────────
function MiniRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = W / 2 - 2;
    let angle = 0;

    // Static blips
    const blips = Array.from({ length: 5 }, () => ({
      x: cx + (Math.random() - 0.5) * R * 1.5,
      y: cy + (Math.random() - 0.5) * R * 1.5,
      life: Math.random(),
    }));

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      angle = (angle + 0.025) % (Math.PI * 2);

      // Clip to circle
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Background
      ctx.fillStyle = "rgba(0,10,15,0.8)"; ctx.fillRect(0, 0, W, H);

      // Grid rings
      for (let r = R / 4; r <= R; r += R / 4) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,229,255,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      // Cross hairs
      ctx.strokeStyle = "rgba(0,229,255,0.1)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

      // Sweep
      const grad = ctx.createConicalGradient ? null : null;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const sweep = ctx.createLinearGradient(0, 0, R, 0);
      sweep.addColorStop(0,   "rgba(0,229,255,0.5)");
      sweep.addColorStop(1,   "rgba(0,229,255,0)");
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.4, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Blips
      blips.forEach(b => {
        b.life = Math.min(1, b.life + 0.02);
        const dist = Math.sqrt((b.x - cx) ** 2 + (b.y - cy) ** 2);
        if (dist < R) {
          const a = Math.sin(b.life * Math.PI) * 0.9;
          ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(226,18,39,${a})`;
          ctx.fill();
          ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(226,18,39,${a * 0.4})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
        if (b.life >= 1) {
          b.x = cx + (Math.random() - 0.5) * R * 1.5;
          b.y = cy + (Math.random() - 0.5) * R * 1.5;
          b.life = 0;
        }
      });

      ctx.restore();

      // Border
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.3)"; ctx.lineWidth = 1; ctx.stroke();
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} width={80} height={80} className="rounded-full" />;
}

// ── Main Ultra HUD ─────────────────────────────────────────────────────────
export function UltraHUD() {
  const threat = useAnimatedValue(65, 20, 0.2);
  const cpu    = useAnimatedValue(72, 15, 0.5);
  const gpu    = useAnimatedValue(88, 8,  0.3);
  const mem    = useAnimatedValue(58, 12, 0.4);
  const net    = useAnimatedValue(45, 25, 1.0);

  const threatLevel: "LOW" | "MED" | "HIGH" | "CRITICAL" =
    threat > 85 ? "CRITICAL" : threat > 70 ? "HIGH" : threat > 50 ? "MED" : "LOW";

  const stats: SystemStat[] = [
    { label: "CPU",     value: cpu,  max: 100, color: "#00e5ff" },
    { label: "GPU",     value: gpu,  max: 100, color: "#7c3aed" },
    { label: "MEMORY",  value: mem,  max: 100, color: "#f59e0b" },
    { label: "NETWORK", value: net,  max: 100, color: "#22c55e" },
  ];

  return (
    <>
      {/* ── Top-left: System stats ── */}
      <div className="fixed top-20 left-3 z-30 pointer-events-none space-y-2 hidden lg:block">
        <HUDPanel className="w-44 space-y-1.5">
          <div className="text-[9px] font-mono text-cyan-400/70 mb-1 tracking-widest">◈ SYSTEM VITALS</div>
          {stats.map(s => <StatBar key={s.label} stat={s} />)}
        </HUDPanel>
      </div>

      {/* ── Top-right: Threat + FPS ── */}
      <div className="fixed top-20 right-3 z-30 pointer-events-none space-y-2 hidden lg:block">
        <HUDPanel className="w-36">
          <div className="text-[9px] font-mono text-cyan-400/70 mb-2 tracking-widest">◈ COMBAT STATUS</div>
          <ThreatAlert level={threatLevel} />
          <div className="mt-1.5 border-t border-cyan-500/10 pt-1.5">
            <FPSCounter />
          </div>
        </HUDPanel>

        {/* Radar */}
        <HUDPanel className="flex flex-col items-center gap-1">
          <div className="text-[9px] font-mono text-cyan-400/70 tracking-widest">◈ RADAR</div>
          <MiniRadar />
        </HUDPanel>
      </div>

      {/* ── Bottom-center: Alert ticker ── */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden lg:block">
        <motion.div
          className="flex items-center gap-3 bg-black/50 border border-red-500/30 rounded px-3 py-1 backdrop-blur-sm"
          animate={{ borderColor: ["rgba(226,18,39,0.3)", "rgba(226,18,39,0.7)", "rgba(226,18,39,0.3)"] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-[9px] font-mono text-red-400/80">◈ ULTRA HD MODE ACTIVE</span>
          <span className="text-[9px] font-mono text-cyan-400/60">RAY MARCHING + PBR + VR READY</span>
        </motion.div>
      </div>
    </>
  );
}
