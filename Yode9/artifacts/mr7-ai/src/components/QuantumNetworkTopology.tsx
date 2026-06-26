import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface NetNode {
  id: string; x: number; y: number;
  type: "router" | "server" | "client" | "firewall" | "threat";
  label: string; active: boolean; compromised: boolean; traffic: number;
}

interface NetEdge { from: string; to: string; bandwidth: number; encrypted: boolean; }

const ICONS: Record<NetNode["type"], string> = {
  router: "◈", server: "▣", client: "◉", firewall: "◆", threat: "✕",
};
const COLORS: Record<NetNode["type"], string> = {
  router: "#00e5ff", server: "#10b981", client: "#a78bfa",
  firewall: "#f59e0b", threat: "#e21227",
};

function makeTopology(): { nodes: NetNode[]; edges: NetEdge[] } {
  const nodes: NetNode[] = [
    { id:"fw1",  x:50, y:15, type:"firewall", label:"FW-01",    active:true,  compromised:false, traffic:0.8 },
    { id:"r1",   x:50, y:35, type:"router",   label:"CORE-R1",  active:true,  compromised:false, traffic:0.6 },
    { id:"s1",   x:20, y:55, type:"server",   label:"SRV-01",   active:true,  compromised:false, traffic:0.9 },
    { id:"s2",   x:50, y:55, type:"server",   label:"SRV-02",   active:true,  compromised:true,  traffic:0.4 },
    { id:"s3",   x:80, y:55, type:"server",   label:"DB-01",    active:true,  compromised:false, traffic:0.7 },
    { id:"c1",   x:10, y:75, type:"client",   label:"WS-01",    active:true,  compromised:false, traffic:0.3 },
    { id:"c2",   x:30, y:75, type:"client",   label:"WS-02",    active:false, compromised:false, traffic:0 },
    { id:"c3",   x:50, y:75, type:"client",   label:"WS-03",    active:true,  compromised:true,  traffic:0.8 },
    { id:"c4",   x:70, y:75, type:"client",   label:"WS-04",    active:true,  compromised:false, traffic:0.2 },
    { id:"t1",   x:90, y:30, type:"threat",   label:"APT-28",   active:true,  compromised:false, traffic:0.5 },
  ];
  const edges: NetEdge[] = [
    { from:"fw1", to:"r1",  bandwidth:10, encrypted:true },
    { from:"r1",  to:"s1",  bandwidth:5,  encrypted:true },
    { from:"r1",  to:"s2",  bandwidth:3,  encrypted:false },
    { from:"r1",  to:"s3",  bandwidth:8,  encrypted:true },
    { from:"s1",  to:"c1",  bandwidth:2,  encrypted:true },
    { from:"s1",  to:"c2",  bandwidth:1,  encrypted:true },
    { from:"s2",  to:"c3",  bandwidth:4,  encrypted:false },
    { from:"s3",  to:"c4",  bandwidth:2,  encrypted:true },
    { from:"t1",  to:"s2",  bandwidth:6,  encrypted:false },
    { from:"t1",  to:"c3",  bandwidth:3,  encrypted:false },
  ];
  return { nodes, edges };
}

export function QuantumNetworkTopology({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [topo] = useState(makeTopology);
  const [selected, setSelected] = useState<NetNode | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio||1, 1.5);
    const resize = () => {
      const p = canvas.parentElement!;
      canvas.width = p.offsetWidth * dpr;
      canvas.height = p.offsetHeight * dpr;
      canvas.style.width = `${p.offsetWidth}px`;
      canvas.style.height = `${p.offsetHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodePos = (n: NetNode) => ({
      x: (n.x / 100) * (canvas.width / dpr),
      y: (n.y / 100) * (canvas.height / dpr),
    });

    const draw = () => {
      const t = frameRef.current++ * 0.016;
      const W = canvas.width/dpr, H = canvas.height/dpr;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save(); ctx.scale(dpr,dpr);

      ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(0,0,W,H);

      topo.edges.forEach(edge => {
        const from = topo.nodes.find(n => n.id === edge.from)!;
        const to = topo.nodes.find(n => n.id === edge.to)!;
        const fp = nodePos(from), tp = nodePos(to);
        const isThreat = from.type === "threat" || to.type === "threat";
        const color = isThreat ? "#e21227" : edge.encrypted ? "#10b981" : "#f59e0b";
        const alpha = 0.3 + 0.2 * Math.sin(t * 2 + edge.bandwidth);
        ctx.beginPath();
        ctx.strokeStyle = `${color}${Math.round(alpha*255).toString(16).padStart(2,"0")}`;
        ctx.lineWidth = edge.bandwidth / 4;
        ctx.shadowColor = color; ctx.shadowBlur = isThreat ? 6 : 3;
        ctx.setLineDash(edge.encrypted ? [] : [4,4]);
        ctx.moveTo(fp.x, fp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke();
        ctx.setLineDash([]); ctx.shadowBlur = 0;

        if (from.active && to.active) {
          const progress = (t * 0.4 + edge.bandwidth * 0.1) % 1;
          const px = fp.x + (tp.x - fp.x) * progress;
          const py = fp.y + (tp.y - fp.y) * progress;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI*2);
          ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });

      topo.nodes.forEach(node => {
        const { x, y } = nodePos(node);
        const color = node.compromised ? "#e21227" : COLORS[node.type];
        const pulse = Math.sin(t * 3 + node.x) * 0.3 + 0.7;
        const r = 10;

        if (node.active) {
          ctx.beginPath();
          ctx.arc(x, y, r + 6 + pulse * 4, 0, Math.PI*2);
          ctx.strokeStyle = `${color}22`; ctx.lineWidth = 1; ctx.stroke();
        }

        const grad = ctx.createRadialGradient(x,y,0,x,y,r);
        grad.addColorStop(0, `${color}ee`); grad.addColorStop(1, `${color}44`);
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle = grad; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fill();
        ctx.shadowBlur = 0;

        if (node.compromised) {
          ctx.font = "bold 10px monospace"; ctx.fillStyle = "#e21227";
          ctx.textAlign = "center"; ctx.fillText("⚠", x, y + 3);
        } else {
          ctx.font = "9px monospace"; ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.textAlign = "center"; ctx.fillText(ICONS[node.type], x, y + 3);
        }

        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillStyle = color; ctx.textAlign = "center";
        ctx.fillText(node.label, x, y + r + 10);
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const hit = topo.nodes.find(n => {
        const { x, y } = { x: (n.x/100)*W, y: (n.y/100)*H };
        return Math.hypot(mx-x, my-y) < 14;
      });
      setSelected(hit ?? null);
    };
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
    };
  }, [topo]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" />
      {selected && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          className="absolute top-2 left-2 rounded-lg border p-2.5 text-[10px] font-mono"
          style={{ background:"rgba(0,0,0,0.9)", borderColor:`${COLORS[selected.type]}40`,
            color: COLORS[selected.type], minWidth: 140 }}>
          <div className="font-bold">{selected.label}</div>
          <div className="text-gray-500 mt-0.5">TYPE: {selected.type.toUpperCase()}</div>
          <div className={selected.compromised ? "text-red-500" : "text-green-500"}>
            {selected.compromised ? "◈ COMPROMISED" : "◉ CLEAN"}
          </div>
          <div className="text-gray-500">TRAFFIC: {Math.round(selected.traffic*100)}%</div>
          <button onClick={()=>setSelected(null)} className="mt-1.5 text-gray-700 hover:text-white">close ✕</button>
        </motion.div>
      )}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {(["firewall","router","server","client","threat"] as const).map(t => (
          <div key={t} className="flex items-center gap-1">
            <span style={{color:COLORS[t]}} className="text-[9px]">{ICONS[t]}</span>
            <span className="text-[9px] text-gray-600 font-mono">{t.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
