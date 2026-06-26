import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Shield, AlertTriangle, Crosshair } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface TopoNode {
  id: string; label: string; type: "router" | "server" | "workstation" | "db" | "iot";
  x: number; y: number; vx: number; vy: number;
  cvss: number; cves: string[]; compromised: boolean; patched: boolean;
  connections: string[];
}

const INITIAL_NODES: TopoNode[] = [
  { id: "fw", label: "Firewall", type: "router", x: 400, y: 80, vx: 0, vy: 0, cvss: 3.1, cves: ["CVE-2023-1234"], compromised: false, patched: false, connections: ["web1", "db1", "ws1"] },
  { id: "web1", label: "Web Server", type: "server", x: 200, y: 200, vx: 0, vy: 0, cvss: 9.8, cves: ["CVE-2021-44228", "CVE-2023-4863"], compromised: true, patched: false, connections: ["db1", "api1"] },
  { id: "db1", label: "MySQL DB", type: "db", x: 400, y: 280, vx: 0, vy: 0, cvss: 7.5, cves: ["CVE-2023-21980"], compromised: false, patched: false, connections: ["ws1"] },
  { id: "api1", label: "API Server", type: "server", x: 100, y: 330, vx: 0, vy: 0, cvss: 8.2, cves: ["CVE-2023-38408"], compromised: false, patched: false, connections: ["ws2"] },
  { id: "ws1", label: "Workstation A", type: "workstation", x: 600, y: 200, vx: 0, vy: 0, cvss: 5.4, cves: ["CVE-2023-36025"], compromised: false, patched: true, connections: ["ws2"] },
  { id: "ws2", label: "Workstation B", type: "workstation", x: 650, y: 330, vx: 0, vy: 0, cvss: 6.1, cves: ["CVE-2023-28229"], compromised: false, patched: false, connections: [] },
  { id: "iot1", label: "IoT Camera", type: "iot", x: 500, y: 420, vx: 0, vy: 0, cvss: 9.1, cves: ["CVE-2022-47966"], compromised: false, patched: false, connections: [] },
  { id: "iot2", label: "Smart Thermostat", type: "iot", x: 300, y: 420, vx: 0, vy: 0, cvss: 7.8, cves: ["CVE-2023-28229"], compromised: false, patched: false, connections: [] },
];

function cvssColor(score: number, patched: boolean, compromised: boolean) {
  if (patched) return "#4ade80";
  if (compromised) return "#e21227";
  if (score >= 9) return "#ff4444";
  if (score >= 7) return "#f97316";
  if (score >= 4) return "#fbbf24";
  return "#4ade80";
}

export function VulnTopologyModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<TopoNode[]>(INITIAL_NODES.map(n => ({ ...n })));
  const [selectedNode, setSelectedNode] = useState<TopoNode | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);

    function getNodePos(node: TopoNode) {
      const sx = canvas.width / 750, sy = canvas.height / 520;
      return { x: node.x * sx, y: node.y * sy };
    }

    function drawBlackHole(cx: number, cy: number, radius: number, color: string, intensity: number, t: number) {
      for (let ring = 3; ring >= 1; ring--) {
        const r = radius * ring * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `${color}${Math.floor(intensity * 80).toString(16).padStart(2, "0")}`);
        grad.addColorStop(0.4, `${color}${Math.floor(intensity * 30).toString(16).padStart(2, "0")}`);
        grad.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
      }
      const spokes = 8;
      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2 + t * 0.02;
        const len = radius * (2 + Math.sin(t * 0.05 + i) * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius * 0.5, cy + Math.sin(angle) * radius * 0.5);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.strokeStyle = `${color}44`; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;

      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 50) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke(); }
      for (let gy = 0; gy < canvas.height; gy += 50) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke(); }

      nodes.forEach(n => {
        const a = getNodePos(n);
        n.connections.forEach(cid => {
          const target = nodes.find(m => m.id === cid);
          if (!target) return;
          const b = getNodePos(target);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          const isActive = n.compromised || target.compromised;
          ctx.strokeStyle = isActive ? "rgba(226,18,39,0.3)" : "rgba(255,255,255,0.07)";
          ctx.lineWidth = isActive ? 1.5 : 1;
          ctx.stroke();
          if (isActive) {
            const prog = (t % 60) / 60;
            const px = a.x + (b.x - a.x) * prog, py = a.y + (b.y - a.y) * prog;
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#e21227"; ctx.fill();
          }
        });
      });

      nodes.forEach(n => {
        const { x, y } = getNodePos(n);
        const color = cvssColor(n.cvss, n.patched, n.compromised);
        const nodeR = 18 + (n.cvss / 10) * 8;

        if (!n.patched && n.cvss >= 7) {
          drawBlackHole(x, y, nodeR * 1.5, color, n.cvss / 10, t + nodes.indexOf(n) * 20);
        } else {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, nodeR * 2);
          glow.addColorStop(0, `${color}22`); glow.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(x, y, nodeR * 2, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
        }

        ctx.beginPath(); ctx.arc(x, y, nodeR, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = n.compromised ? 2.5 : 1.5;
        ctx.stroke();
        ctx.fillStyle = `${color}15`; ctx.fill();

        if (n.compromised) {
          ctx.beginPath(); ctx.arc(x, y, nodeR + 4 + Math.sin(t * 0.1) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}66`; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }

        ctx.fillStyle = color; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(n.label, x, y + nodeR + 14);
        ctx.font = "8px monospace"; ctx.fillStyle = `${color}99`;
        ctx.fillText(`CVSS ${n.cvss}`, x, y + nodeR + 24);
      });

      t++;
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const sx = canvas.width / 750, sy = canvas.height / 520;
      const hit = nodesRef.current.find(n => {
        const nx = n.x * sx, ny = n.y * sy;
        return Math.hypot(mx - nx, my - ny) < 30;
      });
      if (hit) setSelectedNode({ ...hit });
    }
    canvas.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(animRef.current); canvas.removeEventListener("click", onClick); window.removeEventListener("resize", resize); };
  }, [open]);

  function patchNode(id: string) {
    nodesRef.current = nodesRef.current.map(n => n.id === id ? { ...n, patched: true, compromised: false } : n);
    setSelectedNode(null);
    setActionLog(prev => [`[+] Patched ${id} — ${INITIAL_NODES.find(n => n.id === id)?.cves.join(", ") ?? "CVEs"} mitigated`, ...prev]);
  }

  function exploitNode(id: string) {
    nodesRef.current = nodesRef.current.map(n => n.id === id && !n.patched ? { ...n, compromised: true } : n);
    setSelectedNode(null);
    setActionLog(prev => [`[!] EXPLOITED ${id} — lateral movement initiated`, ...prev]);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#050505", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#111" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
                <Globe className="w-5 h-5" style={{ color: "#f97316" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#f97316" }}>VULNERABILITY TOPOLOGY</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>3D Black-Hole Network · Click to Exploit or Patch</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[["#ff4444","CRITICAL ≥9"],["#f97316","HIGH ≥7"],["#fbbf24","MEDIUM ≥4"],["#4ade80","LOW / PATCHED"],["#e21227","COMPROMISED"]].map(([c,l]) => (
                <div key={l as string} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                  <span className="text-[9px] font-mono" style={{ color: "#333" }}>{l as string}</span>
                </div>
              ))}
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 ml-2">
                <X className="w-4 h-4" style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex-1 relative">
              <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 450 }} />
              {selectedNode && (
                <motion.div className="absolute top-4 left-4 p-4 rounded-xl w-56"
                  style={{ background: "rgba(0,0,0,0.9)", border: `1px solid ${cvssColor(selectedNode.cvss, selectedNode.patched, selectedNode.compromised)}44`, backdropFilter: "blur(12px)" }}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="font-bold text-sm mb-1" style={{ color: cvssColor(selectedNode.cvss, selectedNode.patched, selectedNode.compromised) }}>{selectedNode.label}</div>
                  <div className="text-[9px] font-mono mb-3 space-y-1">
                    <div style={{ color: "#444" }}>Type: {selectedNode.type}</div>
                    <div style={{ color: cvssColor(selectedNode.cvss, selectedNode.patched, selectedNode.compromised) }}>CVSS: {selectedNode.cvss}</div>
                    <div style={{ color: "#555" }}>CVEs: {selectedNode.cves.join(", ")}</div>
                    <div style={{ color: selectedNode.patched ? "#4ade80" : selectedNode.compromised ? "#e21227" : "#fbbf24" }}>
                      Status: {selectedNode.patched ? "PATCHED" : selectedNode.compromised ? "COMPROMISED" : "VULNERABLE"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedNode.patched && (
                      <button onClick={() => patchNode(selectedNode.id)}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-bold"
                        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                        <Shield className="w-3 h-3 inline mr-1" />PATCH
                      </button>
                    )}
                    {!selectedNode.compromised && !selectedNode.patched && (
                      <button onClick={() => exploitNode(selectedNode.id)}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-bold"
                        style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                        <Crosshair className="w-3 h-3 inline mr-1" />EXPLOIT
                      </button>
                    )}
                    <button onClick={() => setSelectedNode(null)} className="px-2 py-1.5 rounded-lg text-[9px]" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }}>✕</button>
                  </div>
                </motion.div>
              )}
            </div>
            <div className="w-48 border-l flex flex-col" style={{ borderColor: "#111" }}>
              <div className="p-3 border-b text-[9px] font-bold tracking-widest" style={{ borderColor: "#111", color: "#333" }}>ACTION LOG</div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ minHeight: 0 }}>
                {actionLog.length === 0 && <div className="text-[9px]" style={{ color: "#1a1a1a" }}>Click nodes to interact</div>}
                {actionLog.map((l, i) => (
                  <div key={i} className="text-[9px] font-mono" style={{ color: l.startsWith("[!]") ? "#e21227" : "#4ade80" }}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
