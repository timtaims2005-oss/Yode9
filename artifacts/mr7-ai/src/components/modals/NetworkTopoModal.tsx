import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Activity, AlertTriangle, Wifi } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface NetNode {
  id: string; label: string; type: "router" | "switch" | "server" | "workstation" | "iot" | "cloud" | "attacker";
  x: number; y: number; connections: string[]; traffic: number; anomaly: boolean; ip: string;
}

const NET_NODES: NetNode[] = [
  { id: "inet", label: "Internet", type: "cloud", x: 400, y: 50, connections: ["fw"], traffic: 100, anomaly: false, ip: "0.0.0.0/0" },
  { id: "fw", label: "Firewall", type: "router", x: 400, y: 160, connections: ["dmz", "core"], traffic: 85, anomaly: false, ip: "10.0.0.1" },
  { id: "dmz", label: "DMZ Switch", type: "switch", x: 200, y: 270, connections: ["web", "mail"], traffic: 60, anomaly: false, ip: "10.0.1.254" },
  { id: "core", label: "Core Switch", type: "switch", x: 600, y: 270, connections: ["hr", "dev", "srv"], traffic: 90, anomaly: false, ip: "10.0.0.254" },
  { id: "web", label: "Web Server", type: "server", x: 100, y: 380, connections: [], traffic: 70, anomaly: true, ip: "10.0.1.10" },
  { id: "mail", label: "Mail Server", type: "server", x: 280, y: 380, connections: [], traffic: 40, anomaly: false, ip: "10.0.1.20" },
  { id: "hr", label: "HR Subnet", type: "workstation", x: 500, y: 380, connections: [], traffic: 20, anomaly: false, ip: "10.0.10.0/24" },
  { id: "dev", label: "Dev Subnet", type: "workstation", x: 640, y: 380, connections: ["iot1"], traffic: 55, anomaly: false, ip: "10.0.20.0/24" },
  { id: "srv", label: "Server Farm", type: "server", x: 760, y: 380, connections: [], traffic: 80, anomaly: false, ip: "10.0.30.0/24" },
  { id: "iot1", label: "IoT Device", type: "iot", x: 640, y: 470, connections: [], traffic: 15, anomaly: true, ip: "10.0.20.99" },
  { id: "attacker", label: "ATTACKER", type: "attacker", x: 700, y: 50, connections: ["inet"], traffic: 95, anomaly: true, ip: "198.51.100.0" },
];

function nodeColor(n: NetNode) {
  if (n.type === "attacker") return "#e21227";
  if (n.anomaly) return "#f97316";
  if (n.type === "cloud") return "#00e5ff";
  if (n.type === "router") return "#a855f7";
  if (n.type === "switch") return "#fbbf24";
  if (n.type === "server") return "#3b82f6";
  if (n.type === "iot") return "#4ade80";
  return "#888";
}

export function NetworkTopoModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selected, setSelected] = useState<NetNode | null>(null);
  const [trafficLog, setTrafficLog] = useState<string[]>([
    "[>] 198.51.100.0 → 10.0.1.10 — HTTP GET /admin (suspicious)",
    "[>] 10.0.1.10 → 10.0.0.1 — anomalous outbound port 4444",
    "[+] 10.0.20.0 → 10.0.30.0 — normal SMB traffic",
    "[!] 10.0.20.99 (IoT) — unusual DNS queries to unknown domain",
  ]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    type Packet = { from: NetNode; to: NetNode; progress: number; color: string; size: number };
    let packets: Packet[] = [];

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);

    function getPos(n: NetNode) {
      return { x: n.x * canvas.width / 860, y: n.y * canvas.height / 560 };
    }

    function spawnPacket() {
      const src = NET_NODES[Math.floor(Math.random() * NET_NODES.length)];
      if (!src.connections.length) return;
      const dstId = src.connections[Math.floor(Math.random() * src.connections.length)];
      const dst = NET_NODES.find(n => n.id === dstId);
      if (!dst) return;
      const isAttack = src.type === "attacker" || src.anomaly || dst.anomaly;
      packets.push({ from: src, to: dst, progress: 0, color: isAttack ? "#e21227" : "#4ade8066", size: isAttack ? 4 : 2 });
    }

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let gx = 0; gx < canvas.width; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.strokeStyle = "rgba(255,255,255,0.02)"; ctx.lineWidth = 1; ctx.stroke(); }
      for (let gy = 0; gy < canvas.height; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke(); }

      NET_NODES.forEach(n => {
        const a = getPos(n);
        n.connections.forEach(cid => {
          const target = NET_NODES.find(m => m.id === cid);
          if (!target) return;
          const b = getPos(target);
          const isHot = n.anomaly || target.anomaly || n.type === "attacker";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = isHot ? "rgba(226,18,39,0.25)" : "rgba(255,255,255,0.06)";
          ctx.lineWidth = isHot ? 1.5 : 1; ctx.stroke();
        });
      });

      if (t % 12 === 0) spawnPacket();
      packets = packets.filter(p => p.progress < 1);
      packets.forEach(p => {
        const a = getPos(p.from), b = getPos(p.to);
        const px = a.x + (b.x - a.x) * p.progress, py = a.y + (b.y - a.y) * p.progress;
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - (b.x - a.x) * 0.06, py - (b.y - a.y) * 0.06);
        ctx.strokeStyle = p.color + "66"; ctx.lineWidth = 1; ctx.stroke();
        p.progress += 0.018;
      });

      NET_NODES.forEach(n => {
        const { x, y } = getPos(n);
        const col = nodeColor(n);
        const r = n.type === "router" || n.type === "switch" ? 20 : 16;
        if (n.anomaly || n.type === "attacker") {
          const pls = r + 5 + Math.sin(t * 0.08) * 4;
          ctx.beginPath(); ctx.arc(x, y, pls, 0, Math.PI * 2);
          ctx.strokeStyle = `${col}44`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.fillStyle = `${col}18`; ctx.fill(); ctx.stroke();
        const traf = n.traffic / 100;
        ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + traf * Math.PI * 2);
        ctx.strokeStyle = `${col}55`; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = "8px monospace"; ctx.fillStyle = col; ctx.textAlign = "center";
        ctx.fillText(n.label, x, y + r + 13);
        ctx.font = "7px monospace"; ctx.fillStyle = `${col}77`;
        ctx.fillText(n.ip, x, y + r + 22);
      });
      t++; animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);

    function genLog() {
      const src = NET_NODES[Math.floor(Math.random() * NET_NODES.length)];
      const dst = NET_NODES[Math.floor(Math.random() * NET_NODES.length)];
      const types = ["HTTP GET", "TCP SYN", "DNS query", "ICMP ping", "SMB connect", "SSH attempt"];
      const type = types[Math.floor(Math.random() * types.length)];
      const isAlert = src.type === "attacker" || src.anomaly;
      const line = `${isAlert ? "[!]" : "[>]"} ${src.ip} → ${dst.ip} — ${type}${isAlert ? " (ANOMALY)" : ""}`;
      setTrafficLog(prev => [line, ...prev.slice(0, 14)]);
    }
    const logTimer = setInterval(genLog, 2500);

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const sx = canvas.width / 860, sy = canvas.height / 560;
      const hit = NET_NODES.find(n => Math.hypot(mx - n.x * sx, my - n.y * sy) < 28);
      setSelected(hit || null);
    }
    canvas.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(animRef.current); clearInterval(logTimer); canvas.removeEventListener("click", onClick); window.removeEventListener("resize", resize); };
  }, [open]);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-[18px] overflow-hidden flex flex-col"
          style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", maxWidth: 1200, maxHeight: "90vh", background: "#050505", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b" style={{ borderColor: "#111" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <Network className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#3b82f6" }}>LIVE NETWORK TOPOLOGY</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Real-Time Packet Flow · Anomaly Detection · Click to Inspect</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mr-4">
              {[["#e21227","Attacker"],["#f97316","Anomaly"],["#a855f7","Router"],["#fbbf24","Switch"],["#3b82f6","Server"],["#4ade80","IoT"]].map(([c,l]) => (
                <div key={l as string} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                  <span className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>{l}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex-1 relative">
              <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 420 }} />
              {selected && (
                <motion.div className="absolute top-4 left-4 p-4 rounded-xl w-52"
                  style={{ background: "rgba(0,0,0,0.9)", border: `1px solid ${nodeColor(selected)}44`, backdropFilter: "blur(12px)" }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="font-bold text-sm mb-2" style={{ color: nodeColor(selected) }}>{selected.label}</div>
                  {[["IP", selected.ip], ["Type", selected.type], ["Traffic", `${selected.traffic}%`], ["Status", selected.anomaly ? "ANOMALY DETECTED" : "NORMAL"]].map(([k, v]) => (
                    <div key={k as string} className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>{k}</span>
                      <span className="text-[9px] font-mono" style={{ color: k === "Status" && selected.anomaly ? "#f97316" : "#666" }}>{v}</span>
                    </div>
                  ))}
                  <div className="mt-2 h-1.5 rounded-full" style={{ background: "#0d0d0d" }}>
                    <div className="h-full rounded-full" style={{ width: `${selected.traffic}%`, background: nodeColor(selected) }} />
                  </div>
                  <button onClick={() => setSelected(null)} className="mt-2 w-full text-[9px] py-1 rounded" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }}>Dismiss</button>
                </motion.div>
              )}
            </div>
            <div className="w-52 border-l flex flex-col" style={{ borderColor: "#111" }}>
              <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "#111" }}>
                <Activity className="w-3 h-3" style={{ color: "#e21227" }} />
                <span className="text-[9px] font-bold tracking-widest" style={{ color: "#333" }}>TRAFFIC LOG</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{ minHeight: 0 }}>
                {trafficLog.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[8px] font-mono leading-relaxed"
                    style={{ color: l.startsWith("[!]") ? "#f97316" : "#2a2a2a" }}>{l}</motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
