import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, Zap, Activity } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function CyberVisionModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [threatLevel, setThreatLevel] = useState(50);
  const [mode, setMode] = useState<"matrix" | "particles" | "neural">("particles");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()[]{}<>/\\|?!~`";
    const cols = Math.floor(canvas.width / 16);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * -50);

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; life: number; maxLife: number; color: string; };
    const particles: Particle[] = [];

    type NeuralNode = { x: number; y: number; vx: number; vy: number; size: number; connections: number[]; activation: number; };
    const nodes: NeuralNode[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 3 + Math.random() * 5,
      connections: [],
      activation: Math.random(),
    }));

    function getThreatColor(alpha = 1) {
      const lvl = threatLevel / 100;
      const r = Math.floor(lvl * 255);
      const g = Math.floor((1 - lvl) * 200);
      const b = Math.floor((1 - lvl * 0.8) * 50);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawMatrix() {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const lvl = threatLevel / 100;
      const r = Math.floor(lvl * 255), g = Math.floor((1 - lvl) * 200);
      ctx.font = "14px monospace";
      drops.forEach((drop, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const intensity = Math.random();
        if (intensity > 0.95) {
          ctx.fillStyle = `rgba(255,255,255,0.9)`;
        } else {
          ctx.fillStyle = `rgba(${r},${g},30,${0.4 + intensity * 0.4})`;
        }
        ctx.fillText(char, i * 16, drop * 16);
        drops[i] = drop > canvas.height / 16 + 5 ? (Math.random() > 0.975 ? 0 : drop) : drop + 1;
      });
    }

    function drawParticles() {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const lvl = threatLevel / 100;
      const spawnRate = 2 + lvl * 8;
      for (let s = 0; s < spawnRate; s++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + lvl * 4 + Math.random() * 2;
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.6,
          y: canvas.height / 2 + (Math.random() - 0.5) * canvas.height * 0.6,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          size: 1 + lvl * 3 + Math.random() * 2,
          life: 60 + Math.random() * 80, maxLife: 140,
          color: getThreatColor(),
        });
      }
      particles.forEach((p, i) => {
        const alpha = (p.life / p.maxLife);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(",1)", `,${alpha})`);
        ctx.fill();
        const trail = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 5, p.y - p.vy * 5);
        trail.addColorStop(0, p.color.replace(",1)", `,${alpha * 0.5})`));
        trail.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 8, p.y - p.vy * 8);
        ctx.strokeStyle = trail; ctx.lineWidth = p.size * 0.5; ctx.stroke();
        p.x += p.vx; p.y += p.vy; p.life--;
      });
      for (let i = particles.length - 1; i >= 0; i--) { if (particles[i].life <= 0) particles.splice(i, 1); }

      const r2 = 80 + lvl * 120;
      const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, r2);
      grad.addColorStop(0, getThreatColor(0.15 + lvl * 0.2));
      grad.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, r2, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 20 + Math.sin(t * 0.05) * 5, 0, Math.PI * 2);
      ctx.strokeStyle = getThreatColor(0.8); ctx.lineWidth = 2; ctx.stroke();
    }

    function drawNeural() {
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        n.activation = (n.activation + 0.005 + (threatLevel / 100) * 0.02) % 1;
      });
      nodes.forEach((n, i) => {
        nodes.forEach((m, j) => {
          if (i >= j) return;
          const dist = Math.hypot(n.x - m.x, n.y - m.y);
          if (dist > 150) return;
          const alpha = (1 - dist / 150) * 0.5;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = getThreatColor(alpha);
          ctx.lineWidth = (1 - dist / 150) * 1.5;
          ctx.stroke();
        });
      });
      nodes.forEach(n => {
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 3);
        grd.addColorStop(0, getThreatColor(n.activation * 0.6));
        grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fillStyle = getThreatColor(0.8 + n.activation * 0.2);
        ctx.fill();
      });
    }

    function frame() {
      if (mode === "matrix") drawMatrix();
      else if (mode === "particles") drawParticles();
      else drawNeural();
      t++;
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [open, threatLevel, mode]);

  const lvlColor = threatLevel > 75 ? "#e21227" : threatLevel > 40 ? "#f97316" : "#4ade80";

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-[18px] overflow-hidden flex flex-col"
          style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", maxWidth: 1100, maxHeight: "90vh", background: "#050505", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b" style={{ borderColor: "#111" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}>
                <Eye className="w-5 h-5" style={{ color: "#00e5ff" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#00e5ff" }}>CYBER-VISION UI</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Digital Infiltration Mode · WebGPU Haptic Visualization</div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="relative flex-1" style={{ minHeight: 400 }}>
            <canvas ref={canvasRef} className="w-full h-full absolute inset-0" style={{ minHeight: 450 }} />

            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {(["matrix", "particles", "neural"] as const).map(m => (
                <motion.button key={m} onClick={() => setMode(m)} whileTap={{ scale: 0.92 }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest"
                  style={{ background: mode === m ? "rgba(0,229,255,0.15)" : "rgba(0,0,0,0.7)", border: `1px solid ${mode === m ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.06)"}`, color: mode === m ? "#00e5ff" : "#444", backdropFilter: "blur(8px)" }}>
                  {m.toUpperCase()}
                </motion.button>
              ))}
            </div>

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2" style={{ minWidth: 160 }}>
              <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-3 h-3" style={{ color: lvlColor }} />
                  <span className="text-[10px] font-bold tracking-widest" style={{ color: lvlColor }}>THREAT LEVEL</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100} value={threatLevel} onChange={e => setThreatLevel(+e.target.value)}
                    className="w-24" style={{ accentColor: lvlColor }} />
                  <span className="text-xs font-mono font-bold" style={{ color: lvlColor }}>{threatLevel}%</span>
                </div>
                <div className="text-[9px] font-mono mt-1.5" style={{ color: "#333" }}>
                  {threatLevel > 75 ? "CRITICAL — ACTIVE BREACH" : threatLevel > 40 ? "ELEVATED — SCANNING" : "LOW — NOMINAL"}
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                {[["PACKETS/S", Math.floor(threatLevel * 45 + 200)],
                  ["ANOMALIES", Math.floor(threatLevel * 0.8)],
                  ["LATENCY", `${Math.floor(12 + threatLevel * 0.4)}ms`]].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[9px] font-mono" style={{ color: "#333" }}>{label}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: lvlColor }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <motion.div className="w-2 h-2 rounded-full" style={{ background: lvlColor }}
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
              <span className="text-[10px] font-mono tracking-widest" style={{ color: lvlColor }}>
                {mode === "matrix" ? "DIGITAL INFILTRATION ACTIVE" : mode === "particles" ? "HAPTIC PARTICLE FIELD" : "NEURAL MESH ACTIVE"}
              </span>
              <motion.div className="w-2 h-2 rounded-full" style={{ background: lvlColor }}
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.5 }} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
