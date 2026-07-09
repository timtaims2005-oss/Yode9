import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useThreatStats } from "@/hooks/useThreatIntel";

interface ThreatNode {
  id: string; x: number; y: number;
  severity: "critical" | "high" | "medium" | "low";
  label: string; pulsePhase: number; active: boolean;
}

const SEV_COLORS = {
  critical: "#e21227", high: "#ff7800", medium: "#f59e0b", low: "#10b981",
};

function generateNodes(count: number): ThreatNode[] {
  const sevs: ThreatNode["severity"][] = ["critical","high","medium","low"];
  const labels = ["APT-28","C2-HOST","PHISH","MALWARE","EXPLOIT","BOTNET","RAT","WORM","MINER","SCAN"];
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    severity: sevs[Math.floor(Math.random() * sevs.length)],
    label: labels[Math.floor(Math.random() * labels.length)],
    pulsePhase: Math.random() * Math.PI * 2,
    active: Math.random() > 0.3,
  }));
}

export function HolographicThreatMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes] = useState(() => generateNodes(18));
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const { data: stats } = useThreatStats();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const p = canvas.parentElement!;
      canvas.width = p.offsetWidth * dpr;
      canvas.height = p.offsetHeight * dpr;
      canvas.style.width = `${p.offsetWidth}px`;
      canvas.style.height = `${p.offsetHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const t = (frameRef.current++ * 0.016);
      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(0, 0, W, H);

      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(226,18,39,0.04)";
        ctx.lineWidth = 0.5;
        ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(226,18,39,0.04)";
        ctx.lineWidth = 0.5;
        ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        ctx.stroke();
      }

      nodes.forEach((node, ni) => {
        const px = (node.x / 100) * W;
        const py = (node.y / 100) * H;
        const color = SEV_COLORS[node.severity];
        const pulse = Math.sin(t * 2 + node.pulsePhase);
        const radius = node.severity === "critical" ? 8 : node.severity === "high" ? 6 : 4;
        const glowRadius = radius + pulse * 4;

        nodes.slice(ni + 1).forEach(n2 => {
          const px2 = (n2.x / 100) * W, py2 = (n2.y / 100) * H;
          const d = Math.hypot(px2 - px, py2 - py);
          if (d < 120 && (node.active || n2.active)) {
            const a = (1 - d / 120) * 0.12;
            ctx.beginPath();
            const grad = ctx.createLinearGradient(px, py, px2, py2);
            grad.addColorStop(0, `${color}${Math.round(a*255).toString(16).padStart(2,"0")}`);
            grad.addColorStop(1, `${SEV_COLORS[n2.severity]}${Math.round(a*255).toString(16).padStart(2,"0")}`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.6;
            ctx.moveTo(px, py); ctx.lineTo(px2, py2);
            ctx.stroke();
          }
        });

        if (node.active) {
          ctx.beginPath();
          ctx.arc(px, py, glowRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}22`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        const grad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
        grad.addColorStop(0, `${color}dd`);
        grad.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = node.active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)";
        ctx.fill();

        if (node.severity === "critical" || node.severity === "high") {
          ctx.fillStyle = color;
          ctx.font = `bold 8px 'JetBrains Mono', monospace`;
          ctx.textAlign = "center";
          ctx.fillText(node.label, px, py - radius - 4);
        }
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [nodes]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {(["critical","high","medium","low"] as const).map(sev => (
          <div key={sev} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEV_COLORS[sev], boxShadow: `0 0 4px ${SEV_COLORS[sev]}` }} />
            <span className="text-[9px] font-mono" style={{ color: SEV_COLORS[sev] }}>
              {sev.toUpperCase()} · {stats?.[sev as keyof typeof stats] ?? "–"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
