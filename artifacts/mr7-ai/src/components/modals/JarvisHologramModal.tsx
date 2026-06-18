import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Zap, Shield, Activity, Cpu, Globe, Target, AlertTriangle,
  Send, Loader2, Radio, Satellite, Eye, Crosshair, Binary,
  Network, Database, Lock, Wifi, BarChart2, Layers, Bot,
  ChevronRight, RefreshCw, Terminal, Sparkles, Hexagon
} from "lucide-react";
import { readChatText } from "@/lib/chat-client";
import { pipeline } from "@/lib/pipeline";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const JARVIS_BLUE = "#00d4ff";
const JARVIS_CYAN = "#00fff5";
const JARVIS_GOLD = "#ffd700";
const JARVIS_RED  = "#ff3344";

/* ─── Holographic Orb ───────────────────────────────────────────────── */
function HolographicOrb({ size = 120 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer rings */}
      {[1, 0.78, 0.58].map((s, i) => (
        <motion.div key={i}
          className="absolute rounded-full"
          style={{
            width: size * s, height: size * s,
            border: `1px solid ${i === 0 ? JARVIS_BLUE : JARVIS_CYAN}`,
            opacity: 0.25 + i * 0.1,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.02, 1] }}
          transition={{ rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity } }}
        />
      ))}
      {/* Equatorial ring */}
      <motion.div className="absolute rounded-full border"
        style={{ width: size * 0.9, height: size * 0.3, borderColor: JARVIS_BLUE, opacity: 0.3, borderRadius: "50%" }}
        animate={{ rotateX: 75, rotateY: [0, 360] }}
        transition={{ rotateY: { duration: 8, repeat: Infinity, ease: "linear" } }}
      />
      {/* Core glow */}
      <motion.div className="rounded-full flex items-center justify-center"
        style={{
          width: size * 0.38, height: size * 0.38,
          background: `radial-gradient(circle, ${JARVIS_CYAN}cc 0%, ${JARVIS_BLUE}88 50%, transparent 100%)`,
          boxShadow: `0 0 ${size * 0.25}px ${JARVIS_BLUE}aa, 0 0 ${size * 0.5}px ${JARVIS_BLUE}44`,
        }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity }}>
        <Hexagon size={size * 0.14} color="#fff" />
      </motion.div>
      {/* Orbit dots */}
      {[0, 120, 240].map((deg, i) => (
        <motion.div key={i} className="absolute"
          style={{ width: 6, height: 6 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}>
          <div style={{
            position: "absolute", left: size * 0.42, top: -3,
            width: 6, height: 6, borderRadius: "50%",
            background: i === 0 ? JARVIS_GOLD : JARVIS_CYAN,
            boxShadow: `0 0 8px ${i === 0 ? JARVIS_GOLD : JARVIS_CYAN}`,
            transform: `rotate(${deg}deg) translateX(${size * 0.42}px)`,
          }} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── HUD Decorations ───────────────────────────────────────────────── */
function HUDGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Scan grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: `linear-gradient(${JARVIS_BLUE} 1px, transparent 1px), linear-gradient(90deg, ${JARVIS_BLUE} 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />
      {/* Scan line */}
      <motion.div className="absolute inset-x-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${JARVIS_BLUE}66 40%, ${JARVIS_CYAN}88 50%, ${JARVIS_BLUE}66 60%, transparent 100%)` }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 1 }} />
      {/* Radial gradient center */}
      <div className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${JARVIS_BLUE}08 0%, transparent 70%)` }} />
    </div>
  );
}

function HUDCorners() {
  const corners = [
    { style: { top: 12, left: 12, borderTopLeftRadius: 4 }, rotate: 0 },
    { style: { top: 12, right: 12, borderTopRightRadius: 4 }, rotate: 90 },
    { style: { bottom: 12, left: 12, borderBottomLeftRadius: 4 }, rotate: 270 },
    { style: { bottom: 12, right: 12, borderBottomRightRadius: 4 }, rotate: 180 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.div key={i} className="absolute w-8 h-8 pointer-events-none"
          style={{ ...c.style, transform: `rotate(${c.rotate}deg)` }}
          animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
          <div className="absolute top-0 left-0 w-full h-0.5 rounded" style={{ background: JARVIS_BLUE }} />
          <div className="absolute top-0 left-0 w-0.5 h-full rounded" style={{ background: JARVIS_BLUE }} />
        </motion.div>
      ))}
    </>
  );
}

/* ─── 3D Floating Panel ─────────────────────────────────────────────── */
function FloatingPanel({
  title, icon: Icon, color = JARVIS_BLUE, children, delay = 0, tiltX = 0, tiltY = 0, className = ""
}: {
  title: string; icon: typeof Zap; color?: string; children: React.ReactNode;
  delay?: number; tiltX?: number; tiltY?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(tiltX);
  const rotY = useMotionValue(tiltY);
  const springX = useSpring(rotX, { stiffness: 120, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 120, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top)  / rect.height - 0.5;
    rotX.set(cy * -8);
    rotY.set(cx * 8);
  };
  const handleLeave = () => { rotX.set(tiltX); rotY.set(tiltY); };

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 22 }}
      style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d", perspective: 800 }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      whileHover={{ z: 20 }}>
      {/* Glass border glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ border: `1px solid ${color}44`, background: `linear-gradient(135deg, ${color}0e 0%, rgba(0,0,0,0) 60%)`, boxShadow: `inset 0 1px 0 ${color}22, 0 0 30px ${color}18` }} />
      {/* Panel header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b relative z-10"
        style={{ borderColor: `${color}22`, background: `${color}0c` }}>
        <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
          <Icon size={13} style={{ color }} />
        </motion.div>
        <span className="text-xs font-bold font-mono tracking-wider" style={{ color }}>{title}</span>
        <motion.div className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }} />
      </div>
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

/* ─── Threat Monitor Panel ──────────────────────────────────────────── */
function ThreatPanel() {
  const THREATS = [
    { level: "CRITICAL", source: "103.21.4.91", type: "SQL Injection", target: "/api/users", time: "00:12", color: JARVIS_RED },
    { level: "HIGH", source: "185.220.101.4", type: "Brute Force", target: "SSH:22", time: "01:45", color: "#f97316" },
    { level: "HIGH", source: "195.182.55.1", type: "Port Scan", target: "0.0.0.0/0", time: "03:22", color: "#f97316" },
    { level: "MEDIUM", source: "10.0.0.44", type: "Anomaly", target: "/admin", time: "05:10", color: JARVIS_GOLD },
    { level: "LOW", source: "172.16.1.5", type: "Bad TLS", target: ":443", time: "07:33", color: JARVIS_BLUE },
  ];
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 3000); return () => clearInterval(id); }, []);

  return (
    <div className="p-3 space-y-1.5 overflow-y-auto" style={{ height: "calc(100% - 44px)" }}>
      {THREATS.map((t, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-2 p-2 rounded-lg border"
          style={{ border: `1px solid ${t.color}22`, background: `${t.color}07` }}>
          <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: t.color }}
            animate={{ opacity: t.level === "CRITICAL" ? [0.4, 1, 0.4] : 1 }}
            transition={{ duration: 0.8, repeat: Infinity }} />
          <span className="text-xs font-bold font-mono" style={{ color: t.color, minWidth: 60 }}>{t.level}</span>
          <span className="text-xs text-gray-400 font-mono flex-1 truncate">{t.type}</span>
          <span className="text-xs text-gray-600 font-mono">{t.time}</span>
        </motion.div>
      ))}
      <motion.div key={tick} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-1.5 text-xs font-mono p-1.5"
        style={{ color: JARVIS_BLUE }}>
        <RefreshCw size={9} className="animate-spin" /> Live feed updated
      </motion.div>
    </div>
  );
}

/* ─── System Status Panel ───────────────────────────────────────────── */
function SystemPanel() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("en", { hour12: false }));
  useEffect(() => { const id = setInterval(() => setTime(new Date().toLocaleTimeString("en", { hour12: false })), 1000); return () => clearInterval(id); }, []);

  const METRICS = [
    { label: "ARC REACTOR", value: "3.21 GJ", pct: 92, color: JARVIS_CYAN },
    { label: "NEURAL NET", value: "98.4%", pct: 98, color: JARVIS_GOLD },
    { label: "SENSOR ARRAY", value: "ONLINE", pct: 100, color: "#10b981" },
    { label: "COMMS", value: "SECURE", pct: 87, color: JARVIS_BLUE },
  ];

  return (
    <div className="p-3 space-y-3 overflow-y-auto" style={{ height: "calc(100% - 44px)" }}>
      <div className="text-center py-2">
        <div className="text-2xl font-black font-mono" style={{ color: JARVIS_CYAN, textShadow: `0 0 16px ${JARVIS_CYAN}88` }}>{time}</div>
        <div className="text-xs text-gray-500 font-mono mt-1">STARK TECH · MARK L</div>
      </div>
      {METRICS.map(m => (
        <div key={m.label}>
          <div className="flex justify-between text-xs font-mono mb-1" style={{ color: m.color }}>
            <span>{m.label}</span><span>{m.value}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div className="h-full rounded-full" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}88` }}
              initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ delay: 0.5, duration: 1, ease: "easeOut" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Arsenal Control Panel ─────────────────────────────────────────── */
function ArsenalPanel() {
  const MODULES = [
    { name: "KaliAgent", status: "ACTIVE", color: "#ef4444" },
    { name: "NEXUS", status: "READY", color: JARVIS_CYAN },
    { name: "Threat Intel", status: "SCANNING", color: JARVIS_GOLD },
    { name: "OSINT", status: "IDLE", color: "#6b7280" },
    { name: "SOC Command", status: "ACTIVE", color: "#10b981" },
    { name: "Decepticon", status: "STANDBY", color: "#a78bfa" },
  ];
  const STATUS_ANIM: Record<string, boolean> = { ACTIVE: true, SCANNING: true };

  return (
    <div className="p-3 space-y-1.5 overflow-y-auto" style={{ height: "calc(100% - 44px)" }}>
      {MODULES.map((m, i) => (
        <motion.div key={i} whileHover={{ x: 3 }}
          className="flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all hover:opacity-80"
          style={{ border: `1px solid ${m.color}22`, background: `${m.color}07` }}>
          <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: m.color }}
            animate={STATUS_ANIM[m.status] ? { opacity: [0.4, 1, 0.4] } : {}}
            transition={{ duration: 1, repeat: Infinity }} />
          <span className="text-xs font-bold text-gray-300 flex-1">{m.name}</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${m.color}22`, color: m.color }}>{m.status}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Network Topology Panel ────────────────────────────────────────── */
function NetworkPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      x: 20 + Math.random() * 260, y: 10 + Math.random() * 140,
      r: 3 + Math.random() * 3, pulse: Math.random() * Math.PI * 2,
      color: [JARVIS_BLUE, JARVIS_CYAN, JARVIS_GOLD, "#10b981"][Math.floor(Math.random() * 4)],
    }));
    const edges: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      if (Math.sqrt(dx * dx + dy * dy) < 90) edges.push([i, j]);
    }
    let raf = 0;
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      edges.forEach(([a, b]) => {
        ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y);
        ctx.strokeStyle = JARVIS_BLUE + "33"; ctx.lineWidth = 1; ctx.stroke();
      });
      nodes.forEach(n => {
        n.pulse += 0.04;
        const alpha = 0.5 + 0.5 * Math.sin(n.pulse);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + Math.floor(alpha * 200).toString(16).padStart(2, "0");
        ctx.shadowBlur = 8; ctx.shadowColor = n.color;
        ctx.fill(); ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ height: "calc(100% - 44px)", padding: 8 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

/* ─── JARVIS AI Chat ────────────────────────────────────────────────── */
function JarvisChat({ fullHeight = false }: { fullHeight?: boolean }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "jarvis"; text: string }[]>([
    { role: "jarvis", text: "Good evening. All systems operational. Threat level nominal. What do you require?" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const QUICK_OPS = [
    "Run threat assessment", "Status report", "Arsenal module status",
    "Analyse current threats", "Network topology scan", "System diagnostics"
  ];

  const send = useCallback(async (q?: string) => {
    const msg = q || input.trim();
    if (!msg || streaming) return;
    setInput(""); setStreaming(true); setDraft("");
    setMsgs(m => [...m, { role: "user", text: msg }]);
    let full = "";
    await readChatText(
      `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — Tony Stark's primary AI. You are calm, precise, highly intelligent, and occasionally sardonic. You speak in a refined British accent. You have complete situational awareness and access to all systems.

Current time: ${new Date().toLocaleTimeString()}. Current threat level: MEDIUM. Arsenal modules online: 12/15.

User request: "${msg}"

Respond as JARVIS: concise, intelligent, slightly formal. Use "sir" naturally. 2-4 sentences maximum. Never use bullet points — you are speaking, not writing a report.`,
      c => { full += c; setDraft(full); }
    );
    setMsgs(m => [...m, { role: "jarvis", text: full }]);
    pipeline.emit("JARVISHOLOGRAM", full);
    setStreaming(false); setDraft("");
  }, [input, streaming]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, draft]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "jarvis" && (
              <motion.div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: `${JARVIS_BLUE}22`, border: `1px solid ${JARVIS_BLUE}55` }}
                animate={{ boxShadow: [`0 0 0px ${JARVIS_BLUE}00`, `0 0 10px ${JARVIS_BLUE}66`, `0 0 0px ${JARVIS_BLUE}00`] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <Hexagon size={11} style={{ color: JARVIS_CYAN }} />
              </motion.div>
            )}
            <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs font-mono leading-relaxed"
              style={m.role === "user"
                ? { background: `${JARVIS_GOLD}18`, border: `1px solid ${JARVIS_GOLD}44`, color: "#e2e8f0" }
                : { background: `${JARVIS_BLUE}0e`, border: `1px solid ${JARVIS_BLUE}33`, color: "#e2e8f0" }}>
              {m.role === "jarvis" && <span className="block text-xs font-black mb-0.5 tracking-wider" style={{ color: JARVIS_CYAN }}>J.A.R.V.I.S.</span>}
              {m.text}
            </div>
          </motion.div>
        ))}
        {streaming && draft && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: `${JARVIS_BLUE}22`, border: `1px solid ${JARVIS_BLUE}55` }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={10} style={{ color: JARVIS_CYAN }} />
              </motion.div>
            </div>
            <div className="max-w-[82%] px-3 py-2 rounded-xl text-xs font-mono leading-relaxed"
              style={{ background: `${JARVIS_BLUE}0e`, border: `1px solid ${JARVIS_BLUE}33`, color: "#e2e8f0" }}>
              <span className="block text-xs font-black mb-0.5 tracking-wider" style={{ color: JARVIS_CYAN }}>J.A.R.V.I.S.</span>
              {draft}<span className="animate-pulse" style={{ color: JARVIS_CYAN }}>▋</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
      {!fullHeight && (
        <div className="flex gap-1 px-3 pb-2 flex-wrap">
          {QUICK_OPS.map(q => (
            <button key={q} onClick={() => send(q)} disabled={streaming}
              className="text-xs px-2 py-0.5 rounded transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: `${JARVIS_BLUE}12`, border: `1px solid ${JARVIS_BLUE}33`, color: JARVIS_BLUE }}>
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="px-3 pb-3 flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ border: `1px solid ${JARVIS_BLUE}44`, background: "rgba(0,0,0,0.4)" }}>
          <Terminal size={12} style={{ color: JARVIS_BLUE }} />
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Query JARVIS…" disabled={streaming}
            className="flex-1 bg-transparent text-xs font-mono text-gray-200 outline-none placeholder-gray-700" />
        </div>
        <button onClick={() => send()} disabled={streaming || !input.trim()}
          className="p-2.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: JARVIS_BLUE, color: "#000" }}>
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}

/* ─── Intelligence Feed Panel ───────────────────────────────────────── */
function IntelPanel() {
  const [feeds, setFeeds] = useState([
    { type: "OSINT", msg: "3 new CVEs matching monitored services", ts: "00:02:11", color: JARVIS_RED, icon: "⚠" },
    { type: "NETWORK", msg: "Unusual traffic pattern from 185.220.x.x/24", ts: "00:04:33", color: "#f97316", icon: "🌐" },
    { type: "THREAT", msg: "APT group ThreatActor-42 targeting sector", ts: "00:07:58", color: JARVIS_GOLD, icon: "🎯" },
    { type: "INTEL", msg: "New exploit kit detected in dark web forums", ts: "00:12:44", color: JARVIS_CYAN, icon: "🔍" },
    { type: "SYSTEM", msg: "All Arsenal modules synchronized successfully", ts: "00:18:02", color: "#10b981", icon: "✓" },
  ]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");

  const runIntelScan = async () => {
    setScanning(true); setScanResult("");
    let full = "";
    await readChatText(
      "You are JARVIS running a threat intelligence scan. Generate a brief intelligence report (4-5 lines) covering: active threats, CVE alerts, network anomalies, and recommended actions. Use a concise, technical style with status indicators.",
      c => { full += c; setScanResult(full); }
    );
    setScanning(false);
    const newFeed = { type: "JARVIS", msg: full.split("\n")[0]?.slice(0, 60) || "Scan complete", ts: new Date().toLocaleTimeString(), color: JARVIS_CYAN, icon: "⚡" };
    setFeeds(f => [newFeed, ...f.slice(0, 4)]);
    pipeline.emit("JARVISHOLOGRAM", full);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100% - 44px)" }}>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {feeds.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2 p-2 rounded-lg border"
            style={{ border: `1px solid ${f.color}22`, background: `${f.color}08` }}>
            <span className="text-sm flex-shrink-0 mt-0.5">{f.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold font-mono" style={{ color: f.color }}>{f.type}</span>
                <span className="text-xs text-gray-600 font-mono">{f.ts}</span>
              </div>
              <div className="text-xs text-gray-300 font-mono">{f.msg}</div>
            </div>
          </motion.div>
        ))}
        {scanResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-2.5 rounded-lg border text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap"
            style={{ border: `1px solid ${JARVIS_CYAN}33`, background: `${JARVIS_CYAN}08` }}>
            {scanResult}
          </motion.div>
        )}
      </div>
      <div className="p-2.5 border-t" style={{ borderColor: `${JARVIS_BLUE}22` }}>
        <button onClick={runIntelScan} disabled={scanning}
          className="w-full text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: `${JARVIS_CYAN}18`, border: `1px solid ${JARVIS_CYAN}44`, color: JARVIS_CYAN }}>
          {scanning ? <Loader2 size={11} className="animate-spin" /> : <Satellite size={11} />}
          {scanning ? "SCANNING…" : "RUN INTEL SCAN"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────────── */
type View = "hologram" | "terminal";

export function JarvisHologramModal({ open, onOpenChange }: Props) {
  const [view, setView] = useState<View>("hologram");
  const [threatLevel, setThreatLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const THREAT_COLORS = { LOW: "#10b981", MEDIUM: JARVIS_GOLD, HIGH: "#f97316", CRITICAL: JARVIS_RED };
  const tc = THREAT_COLORS[threatLevel];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      if (Math.random() < 0.1) setThreatLevel(l => ({ LOW: "MEDIUM", MEDIUM: "HIGH", HIGH: "MEDIUM", CRITICAL: "HIGH" }[l] as any));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3"
        style={{ background: "rgba(0,0,5,0.94)", backdropFilter: "blur(28px)" }}>
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="relative w-full max-w-[1400px] h-[93vh] rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #020210 0%, #030318 50%, #020210 100%)",
            border: `1px solid ${JARVIS_BLUE}44`,
            boxShadow: `0 0 100px ${JARVIS_BLUE}18, 0 0 200px ${JARVIS_BLUE}08, inset 0 0 100px rgba(0,0,20,0.8)`,
          }}>

          <HUDGrid />
          <HUDCorners />

          {/* ── Header ── */}
          <div className="relative z-20 flex items-center gap-4 px-6 py-3.5 border-b"
            style={{ borderColor: `${JARVIS_BLUE}22`, background: "rgba(0,0,20,0.7)", backdropFilter: "blur(20px)" }}>
            <HolographicOrb size={44} />
            <div>
              <div className="text-lg font-black tracking-[0.2em] font-mono"
                style={{ color: JARVIS_CYAN, textShadow: `0 0 20px ${JARVIS_CYAN}88, 0 0 40px ${JARVIS_BLUE}44` }}>
                J.A.R.V.I.S.
              </div>
              <div className="text-xs text-gray-500 font-mono -mt-0.5 tracking-wider">Just A Rather Very Intelligent System · Stark Industries</div>
            </div>

            <div className="flex gap-1.5 ml-6">
              {(["hologram", "terminal"] as View[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold font-mono uppercase tracking-wider transition-all"
                  style={{
                    background: view === v ? `${JARVIS_BLUE}22` : "transparent",
                    border: `1px solid ${view === v ? JARVIS_BLUE + "66" : "rgba(255,255,255,0.07)"}`,
                    color: view === v ? JARVIS_CYAN : "#4b5563",
                  }}>
                  {v}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: `${tc}18`, border: `1px solid ${tc}44` }}>
                <motion.div className="w-2 h-2 rounded-full" style={{ background: tc }}
                  animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} />
                <span className="text-xs font-bold font-mono" style={{ color: tc }}>THREAT: {threatLevel}</span>
              </div>
              <motion.div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: JARVIS_BLUE }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                <Radio size={11} /> ONLINE
              </motion.div>
              <button onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg transition-all hover:opacity-70"
                style={{ border: `1px solid ${JARVIS_BLUE}33` }}>
                <X size={14} style={{ color: JARVIS_BLUE }} />
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <AnimatePresence mode="wait">
            {view === "hologram" ? (
              <motion.div key="hologram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative z-10 h-[calc(100%-72px)] p-4 grid gap-3"
                style={{ gridTemplateColumns: "1fr 1fr 1.6fr 1fr", gridTemplateRows: "1fr 1fr" }}>

                {/* Row 1, Col 1: System Status */}
                <FloatingPanel title="SYSTEM STATUS" icon={Activity} color={JARVIS_CYAN} delay={0.05} tiltY={3}>
                  <SystemPanel />
                </FloatingPanel>

                {/* Row 1, Col 2: Threat Monitor */}
                <FloatingPanel title="THREAT MONITOR" icon={AlertTriangle} color={JARVIS_RED} delay={0.1} tiltY={-2}>
                  <ThreatPanel />
                </FloatingPanel>

                {/* Rows 1-2, Col 3: JARVIS Chat (spans 2 rows) */}
                <div className="row-span-2">
                  <FloatingPanel title="J.A.R.V.I.S. INTERFACE" icon={Bot} color={JARVIS_CYAN} delay={0.15}
                    className="h-full">
                    <JarvisChat />
                  </FloatingPanel>
                </div>

                {/* Row 1, Col 4: Intel Feed */}
                <FloatingPanel title="INTEL FEED" icon={Satellite} color={JARVIS_GOLD} delay={0.2} tiltY={-3}>
                  <IntelPanel />
                </FloatingPanel>

                {/* Row 2, Col 1: Network Topology */}
                <FloatingPanel title="NETWORK TOPOLOGY" icon={Network} color={JARVIS_BLUE} delay={0.25} tiltY={3}>
                  <NetworkPanel />
                </FloatingPanel>

                {/* Row 2, Col 2: Arsenal Control */}
                <FloatingPanel title="ARSENAL CONTROL" icon={Target} color="#a78bfa" delay={0.3} tiltY={-2}>
                  <ArsenalPanel />
                </FloatingPanel>

                {/* Row 2, Col 4: Holographic Orb display */}
                <FloatingPanel title="CORE STATUS" icon={Hexagon} color={JARVIS_CYAN} delay={0.35} tiltY={-3}>
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
                    <HolographicOrb size={100} />
                    <div className="text-xs font-mono text-center space-y-1">
                      {[
                        { label: "REPULSOR", value: "88%", color: JARVIS_CYAN },
                        { label: "FLIGHT", value: "READY", color: "#10b981" },
                        { label: "COMMS", value: "SECURE", color: JARVIS_GOLD },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between gap-4 px-4">
                          <span className="text-gray-600">{s.label}</span>
                          <span style={{ color: s.color }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </FloatingPanel>
              </motion.div>
            ) : (
              <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative z-10 h-[calc(100%-72px)] p-4">
                <FloatingPanel title="J.A.R.V.I.S. TERMINAL" icon={Terminal} color={JARVIS_CYAN} className="h-full">
                  <JarvisChat fullHeight />
                </FloatingPanel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Bottom HUD bar ── */}
          <div className="absolute bottom-0 inset-x-0 z-20 flex items-center gap-4 px-6 py-2 border-t text-xs font-mono"
            style={{ borderColor: `${JARVIS_BLUE}22`, background: "rgba(0,0,20,0.8)", color: "#1e3a5f" }}>
            <span style={{ color: JARVIS_BLUE }}>STARK</span>
            <span>INDUSTRIES</span>
            <span>·</span>
            <span>JARVIS OS v3.0</span>
            <span>·</span>
            <span>BUILD: MARK-L</span>
            <div className="flex gap-4 ml-auto" style={{ color: "#1e3a5f" }}>
              {["NEURAL NET", "THREAT DB", "SENSOR ARRAY", "COMMS", "ARSENAL"].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <motion.span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#10b981" }}
                    animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5 + Math.random(), repeat: Infinity }} />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
