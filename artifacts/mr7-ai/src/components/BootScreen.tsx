import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── BOOT LOG — extended with 64-subsystem coverage ── */
const BOOT_LOG = [
  { ms: 0,    text: "[ BIOS ] KaliGPT Quantum Neural Engine v4.0 — INIT",      col: "#00ff41" },
  { ms: 110,  text: "[ UEFI ] Secure boot chain verified. TPM 3.0 OK",           col: "#00ff41" },
  { ms: 200,  text: "[ MEM  ] Allocating 12.8TB threat intelligence cache",       col: "#00ff41" },
  { ms: 290,  text: "[ CPU  ] 256-core quantum tensor array — ONLINE",            col: "#00ff41" },
  { ms: 380,  text: "[ NET  ] Quantum-encrypted mesh: 14 relay nodes active",     col: "#00e5ff" },
  { ms: 460,  text: "[ TLS  ] mTLS handshake complete. Cert chain valid",         col: "#00ff41" },
  { ms: 540,  text: "[ AI   ] Loading 105-brain council framework… OK",           col: "#00ff41" },
  { ms: 620,  text: "[ PERS ] Persona matrix: 16 identities mounted… OK",         col: "#00ff41" },
  { ms: 700,  text: "[ HUB  ] Arsenal Hub: 70+ modules armed and ready",          col: "#fbbf24" },
  { ms: 780,  text: "[ PRV  ] Providers: OpenAI · Anthropic · Groq · Gemini",    col: "#00e5ff" },
  { ms: 860,  text: "[ OSNT ] Dark-web indexers synced. 3 new CVEs detected",    col: "#a78bfa" },
  { ms: 940,  text: "[ SEC  ] Zero-trust layer ACTIVE. Threat: ELEVATED",         col: "#fbbf24" },
  { ms: 1020, text: "[ RAG  ] Vector DB indexed: 2.4M security documents",        col: "#00e5ff" },
  { ms: 1100, text: "[ PIPE ] Chain Builder: 12 active rules. Pipeline READY",    col: "#00ff41" },
  { ms: 1180, text: "[ CSRF ] CSRF shield armed. Rate-limiter: 150 req/min",      col: "#00ff41" },
  { ms: 1260, text: "[ GOD  ] GodMode cores UNLOCKED — all 14 modes hot",         col: "#e21227" },
  { ms: 1360, text: "[ SYNC ] Cloud sync: PostgreSQL replication OK",              col: "#00e5ff" },
  { ms: 1450, text: "[ CORE ] All 64 subsystems nominal. Booting UI shell…",      col: "#00ff41" },
  { ms: 1560, text: "[ DONE ] ██████████████ 100% — WELCOME, OPERATOR.",           col: "#e21227" },
];

const MODULES_FLASH = [
  "KaliAgent","NEXUS","JARVIS","Parseltongue","RAGFlow","OpenGravity IDE",
  "TeamAgent","Skills Lib","AgentOS","GeminiCLI","Hermes","Graphify",
  "GodMode","CCSwitch","UI/UX Pro","CareerOps","RedTeam AI","DarkWeb Monitor",
  "OSINT+","Council 105","Arsenal","ShellGen","CVEWatch","NetScan Pro",
];

const SUBSYSTEMS = [
  { label: "Auth Layer",    status: "OK",  col: "#00ff41", delay: 300  },
  { label: "Encryption",   status: "OK",  col: "#00ff41", delay: 500  },
  { label: "OSINT Engine", status: "OK",  col: "#00ff41", delay: 700  },
  { label: "Vector DB",    status: "OK",  col: "#00e5ff", delay: 900  },
  { label: "GodMode",      status: "HOT", col: "#e21227", delay: 1100 },
  { label: "Mesh Network", status: "OK",  col: "#00e5ff", delay: 1300 },
  { label: "Arsenal Hub",  status: "RDY", col: "#fbbf24", delay: 1000 },
  { label: "Council AI",   status: "OK",  col: "#a78bfa", delay: 1200 },
];

const SYS_METRICS = [
  { label: "QUANTUM CPU", pct: 94, col: "#00ff41" },
  { label: "NEURAL RAM",  pct: 78, col: "#00e5ff" },
  { label: "MESH NET",    pct: 99, col: "#a78bfa" },
  { label: "THREAT DB",   pct: 100,col: "#e21227" },
];

const THREAT_EVENTS = [
  "CVE-2024-9873 detected in feed",
  "Dark-web actor 0xDEAD active",
  "3 new zero-days indexed",
  "Threat feed sync complete",
];

/* ── Corner HUD Decoration ── */
function CornerHUD({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 12, left: 12 },
    tr: { top: 12, right: 12 },
    bl: { bottom: 12, left: 12 },
    br: { bottom: 12, right: 12 },
  };
  const rotate = { tl: "0deg", tr: "90deg", bl: "270deg", br: "180deg" }[pos];
  return (
    <div style={{
      position: "absolute", ...styles[pos],
      width: 36, height: 36,
      pointerEvents: "none",
      zIndex: 20,
    }}>
      <svg width="36" height="36" style={{ transform: `rotate(${rotate})` }}>
        <polyline points="0,18 0,0 18,0" fill="none" stroke="rgba(226,18,39,0.55)" strokeWidth="1.5" />
        <polyline points="4,22 4,4 22,4" fill="none" stroke="rgba(226,18,39,0.22)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

/* ── Waveform Bars — heights precomputed to avoid re-render jitter ── */
const WAVE_HEIGHTS = Array.from({ length: 24 }, () => 6 + Math.random() * 14);
const WAVE_DURATIONS = Array.from({ length: 24 }, () => 0.4 + Math.random() * 0.6);

function WaveformBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
      {WAVE_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          style={{ width: 2, borderRadius: 1, background: "#00ff41", originY: 1 }}
          animate={{ height: [4, h, 4] }}
          transition={{ duration: WAVE_DURATIONS[i], repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── System Metric Bar ── */
function MetricBar({ label, pct, col, delay }: { label: string; pct: number; col: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000 + 0.5, duration: 0.4 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em" }}>{label}</span>
        <span style={{ fontSize: 8, fontFamily: "monospace", color: col }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${col}99, ${col})`, borderRadius: 2 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay / 1000 + 0.7, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ── Biometric Scanner ── */
function BiometricScanner({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      {/* Outer ring */}
      <motion.div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "1px solid rgba(0,229,255,0.4)",
      }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner ring */}
      <motion.div style={{
        position: "absolute", inset: 6, borderRadius: "50%",
        border: "1px dashed rgba(226,18,39,0.4)",
      }}
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      {/* Face outline */}
      <div style={{
        position: "absolute", inset: 14,
        border: "1px solid rgba(0,229,255,0.25)",
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="8" y="6" width="16" height="20" rx="4" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <circle cx="12" cy="14" r="1.5" fill="#00e5ff" opacity="0.7"/>
          <circle cx="20" cy="14" r="1.5" fill="#00e5ff" opacity="0.7"/>
          <path d="M11 20 Q16 23 21 20" stroke="rgba(0,229,255,0.5)" strokeWidth="1" fill="none"/>
        </svg>
      </div>
      {/* Scan line */}
      {active && (
        <motion.div style={{
          position: "absolute", inset: 14, borderRadius: "50%", overflow: "hidden",
        }}>
          <motion.div style={{
            position: "absolute", left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #00e5ff, transparent)",
            boxShadow: "0 0 8px #00e5ff",
          }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
      {/* Status dot */}
      <motion.div style={{
        position: "absolute", bottom: 4, right: 4,
        width: 8, height: 8, borderRadius: "50%",
        background: active ? "#22c55e" : "#e21227",
        boxShadow: `0 0 8px ${active ? "#22c55e" : "#e21227"}`,
      }}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </div>
  );
}

/* ── 3D Sphere Canvas ── */
function SphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = 280;
    const H = canvas.height = 280;
    let angle = 0, t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      angle += 0.016;
      t += 0.035;
      const cx = W / 2, cy = H / 2, R = 108;

      // Outer glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      grd.addColorStop(0, "rgba(226,18,39,0.06)");
      grd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Rings
      const rings = [
        { r: R,         color: "rgba(226,18,39,",  tilt: 0 },
        { r: R * 0.75,  color: "rgba(0,229,255,",  tilt: Math.PI / 4 },
        { r: R * 0.5,   color: "rgba(167,139,250,", tilt: Math.PI / 2.5 },
        { r: R * 0.88,  color: "rgba(34,197,94,",  tilt: Math.PI / 6 },
      ];

      rings.forEach(({ r, color, tilt }) => {
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 6) {
          const yr = r * Math.sin(lat);
          const r2 = r * Math.cos(lat);
          ctx.beginPath();
          let first = true;
          for (let lon = 0; lon <= Math.PI * 2 + 0.1; lon += 0.1) {
            const x3 = r2 * Math.cos(lon + angle + tilt);
            const z3 = r2 * Math.sin(lon + angle + tilt);
            const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
            const xF = x3;
            const yF = yr * cosT - z3 * sinT;
            const zF = yr * sinT + z3 * cosT;
            const persp = 340 / (340 + zF);
            const px = cx + xF * persp;
            const py = cy + yF * persp;
            const alpha = Math.max(0, (zF / r + 1) / 2);
            ctx.strokeStyle = `${color}${(alpha * 0.65).toFixed(2)})`;
            ctx.lineWidth = 0.7;
            if (first) { ctx.moveTo(px, py); first = false; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      });

      // Fibonacci dots
      const nPts = 140;
      for (let i = 0; i < nPts; i++) {
        const phi = Math.acos(1 - 2 * i / nPts);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + angle * 2;
        const x = R * Math.sin(phi) * Math.cos(theta);
        const y = R * Math.sin(phi) * Math.sin(theta);
        const z = R * Math.cos(phi);
        const persp = 340 / (340 + z);
        const px = cx + x * persp;
        const py = cy + y * persp;
        const brightness = (z / R + 1) / 2;
        const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.25);
        const pr = 1.6 * persp * (0.5 + 0.5 * pulse);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${(brightness * 0.8 * pulse).toFixed(2)})`;
        ctx.fill();
      }

      // Orbital satellites
      const orbColors = ["#e21227","#00e5ff","#a78bfa","#22c55e","#fbbf24","#f97316","#38bdf8","#fb923c"];
      for (let i = 0; i < 8; i++) {
        const orbitAngle = angle * (1.4 + i * 0.18) + (Math.PI * 2 / 8) * i;
        const orR = R * (0.38 + i * 0.08);
        const ox = cx + orR * Math.cos(orbitAngle);
        const oy = cy + orR * Math.sin(orbitAngle) * 0.42;
        const oz = orR * Math.sin(orbitAngle);
        const persp2 = 340 / (340 + oz);
        ctx.beginPath();
        ctx.arc(ox * persp2 + cx * (1 - persp2), oy * persp2 + cy * (1 - persp2), 3.5 * persp2, 0, Math.PI * 2);
        ctx.fillStyle = orbColors[i % orbColors.length];
        ctx.shadowColor = orbColors[i % orbColors.length];
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Inner core pulse
      const corePulse = 0.5 + 0.5 * Math.sin(t * 2);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20 * corePulse);
      core.addColorStop(0, `rgba(226,18,39,${(0.6 * corePulse).toFixed(2)})`);
      core.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * corePulse, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

/* ── Main BootScreen ── */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);
  const [lines, setLines] = useState<{ text: string; col: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [modIdx, setModIdx] = useState(0);
  const [phase, setPhase] = useState<"boot" | "scan" | "modules" | "done">("boot");
  const [subsysReady, setSubsysReady] = useState<boolean[]>(Array(SUBSYSTEMS.length).fill(false));
  const [threatIdx, setThreatIdx] = useState(0);
  const [operatorId] = useState(() => {
    const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0").toUpperCase();
    return `OPR-${hex()}-${hex()}`;
  });
  const [scanDone, setScanDone] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    setTimeout(onDone, 600);
  }, [onDone]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Boot log
    BOOT_LOG.forEach(({ ms, text, col }) => {
      timers.push(setTimeout(() => {
        setLines(l => [...l, { text, col }]);
        setProgress(p => Math.min(100, p + Math.round(100 / BOOT_LOG.length)));
      }, ms));
    });

    // Subsystem badges
    SUBSYSTEMS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setSubsysReady(prev => { const n = [...prev]; n[i] = true; return n; });
      }, SUBSYSTEMS[i].delay));
    });

    // Operator scan
    timers.push(setTimeout(() => setPhase("scan"), 1600));
    timers.push(setTimeout(() => setScanDone(true), 1900));

    // Modules flash
    timers.push(setTimeout(() => setPhase("modules"), 2000));
    MODULES_FLASH.forEach((_, i) => {
      timers.push(setTimeout(() => setModIdx(i + 1), 2050 + i * 60));
    });
    timers.push(setTimeout(() => setPhase("done"), 2050 + MODULES_FLASH.length * 60));
    timers.push(setTimeout(dismiss, 3200));

    // Threat ticker — managed separately (not a setTimeout)
    const tickerInterval = setInterval(() => {
      setThreatIdx(i => (i + 1) % THREAT_EVENTS.length);
    }, 900);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tickerInterval);
    };
  }, [dismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[99999] flex flex-col overflow-hidden"
          style={{ background: "#000000" }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          onClick={dismiss}
        >
          {/* Corner HUDs */}
          <CornerHUD pos="tl" />
          <CornerHUD pos="tr" />
          <CornerHUD pos="bl" />
          <CornerHUD pos="br" />

          {/* Hex grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(226,18,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.035) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }} />

          {/* Diagonal grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(45deg, rgba(0,229,255,0.015) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }} />

          {/* Top status bar */}
          <div className="flex items-center justify-between px-6 py-2 z-10 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(226,18,39,0.12)", background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 8px #e21227" }}
              />
              <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color: "rgba(226,18,39,0.7)" }}>
                KALIGPT QUANTUM NEURAL ENGINE v4.0
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[8px]" style={{ color: "rgba(0,229,255,0.5)" }}>
                {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
              </span>
              <span className="font-mono text-[8px] px-2 py-0.5 rounded" style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)" }}>
                THREAT: ELEVATED
              </span>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center relative px-4 gap-4">

              {/* Scan line */}
              <motion.div className="absolute inset-x-0 h-px pointer-events-none z-10"
                style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.7),rgba(0,229,255,0.4),rgba(226,18,39,0.7),transparent)" }}
                animate={{ top: ["0%","100%","0%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              />

              {/* 3D Sphere */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <SphereCanvas />
              </motion.div>

              {/* KALI GPT title */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-5xl font-black tracking-widest mb-1">
                  <motion.span
                    style={{ color: "#e21227" }}
                    animate={{ textShadow: ["0 0 8px #e21227","0 0 32px #e21227, 0 0 60px #e21227aa","0 0 8px #e21227"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >KALI</motion.span>
                  <span className="text-white">GPT</span>
                </div>
                <div className="font-mono tracking-[0.4em] text-[9px] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
                  AUTONOMOUS CYBER AI · v4.0 · ARSENAL MODE PRO
                </div>
              </motion.div>

              {/* Progress bar */}
              <div className="w-64">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>SYSTEM INIT</span>
                  <span className="font-mono text-[8px]" style={{ color: "#e21227" }}>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #e21227, #ff6b6b, #00e5ff, #a78bfa)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  />
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["-200% 0", "200% 0"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </div>

              {/* System metrics */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-64 space-y-2"
              >
                {SYS_METRICS.map((m, i) => (
                  <MetricBar key={m.label} label={m.label} pct={m.pct} col={m.col} delay={i * 150} />
                ))}
              </motion.div>

              {/* Waveform */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center gap-2"
              >
                <span className="font-mono text-[7px]" style={{ color: "rgba(0,255,65,0.5)" }}>AUDIO</span>
                <WaveformBar />
                <span className="font-mono text-[7px]" style={{ color: "rgba(0,255,65,0.5)" }}>OK</span>
              </motion.div>

              {/* Phase status */}
              <AnimatePresence mode="wait">
                {phase === "scan" && (
                  <motion.div key="scan"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="font-mono text-[9px] font-bold tracking-widest"
                    style={{ color: "#00e5ff" }}
                  >
                    ⬡ SCANNING OPERATOR BIOMETRICS…
                  </motion.div>
                )}
                {phase === "modules" && modIdx < MODULES_FLASH.length && (
                  <motion.div key={`mod-${modIdx}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.06 }}
                    className="font-mono text-[9px] font-black tracking-widest"
                    style={{ color: "#00e5ff" }}
                  >
                    LOADING: {MODULES_FLASH[modIdx] ?? ""}
                  </motion.div>
                )}
                {phase === "done" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="font-mono text-[10px] font-black tracking-widest"
                    style={{ color: "#22c55e", textShadow: "0 0 12px #22c55e" }}
                  >
                    ✓ ALL 64 SYSTEMS ONLINE
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.12)" }}>
                انقر في أي مكان للتخطي
              </div>
            </div>

            {/* ── MIDDLE PANEL — Operator Scan ── */}
            <div className="w-52 flex flex-col justify-center items-center gap-4 py-6"
              style={{ borderLeft: "1px solid rgba(0,229,255,0.1)", borderRight: "1px solid rgba(0,229,255,0.1)" }}>

              <div className="font-mono text-[7px] tracking-[0.35em] uppercase font-bold mb-1" style={{ color: "rgba(0,229,255,0.45)" }}>
                ▶ OPERATOR SCAN
              </div>

              <BiometricScanner active={phase === "scan" || phase === "boot"} />

              <AnimatePresence mode="wait">
                {!scanDone ? (
                  <motion.div key="scanning"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="font-mono text-[8px] mb-1" style={{ color: "rgba(0,229,255,0.6)" }}>
                      SCANNING…
                    </div>
                    <div className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                      BIOMETRIC AUTH
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="id"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="font-mono text-[7px] mb-0.5" style={{ color: "#22c55e" }}>✓ OPERATOR ID</div>
                    <div className="font-mono text-[8px] font-bold" style={{ color: "#00e5ff" }}>{operatorId}</div>
                    <div className="font-mono text-[7px] mt-1" style={{ color: "rgba(34,197,94,0.6)" }}>CLEARANCE: TOP SECRET</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subsystem status badges */}
              <div className="w-full px-3 space-y-1.5 mt-2">
                <div className="font-mono text-[6px] tracking-[0.3em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                  SUBSYSTEMS
                </div>
                {SUBSYSTEMS.map((sys, i) => (
                  <motion.div key={sys.label}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: subsysReady[i] ? 1 : 0.25, x: 0 }}
                    transition={{ delay: sys.delay / 1000, duration: 0.3 }}
                    className="flex items-center justify-between"
                  >
                    <span className="font-mono text-[7px]" style={{ color: subsysReady[i] ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>
                      {sys.label}
                    </span>
                    <span className="font-mono text-[6px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: sys.col,
                        background: `${sys.col}15`,
                        border: `1px solid ${sys.col}30`,
                      }}
                    >
                      {subsysReady[i] ? sys.status : "…"}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Threat feed */}
              <div className="w-full px-3 mt-2">
                <div className="font-mono text-[6px] tracking-[0.3em] uppercase mb-1.5" style={{ color: "rgba(167,139,250,0.4)" }}>
                  THREAT FEED
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={threatIdx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="font-mono text-[7px] leading-snug"
                    style={{ color: "rgba(167,139,250,0.7)" }}
                  >
                    ⚡ {THREAT_EVENTS[threatIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── RIGHT PANEL — Boot Log ── */}
            <div className="w-80 flex flex-col justify-center py-5 px-5 font-mono overflow-hidden"
              style={{ borderLeft: "1px solid rgba(226,18,39,0.12)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)" }}>

              <div className="text-[7px] tracking-[0.35em] uppercase mb-3 font-bold" style={{ color: "rgba(226,18,39,0.55)" }}>
                ▶ BOOT SEQUENCE LOG
              </div>

              <div className="space-y-1 overflow-hidden flex-1">
                {lines.map((ln, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-[8.5px] leading-snug"
                    style={{ color: ln.col, textShadow: `0 0 5px ${ln.col}55` }}
                  >
                    {ln.text}
                  </motion.div>
                ))}
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-[9px]"
                  style={{ color: "#00ff41" }}
                >_</motion.div>
              </div>

              {/* Arsenal modules grid */}
              {phase !== "boot" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-4">
                  <div className="text-[7px] tracking-widest uppercase mb-2 font-bold" style={{ color: "rgba(0,229,255,0.45)" }}>
                    ARSENAL MODULES [{modIdx}/{MODULES_FLASH.length}]
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MODULES_FLASH.map((mod, i) => (
                      <motion.div key={mod}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{
                          opacity: i < modIdx ? 1 : 0.12,
                          scale: i < modIdx ? 1 : 0.9,
                        }}
                        transition={{ duration: 0.1 }}
                        className="text-[6.5px] font-bold px-1 py-0.5 rounded text-center truncate"
                        style={{
                          background: i < modIdx ? "rgba(0,229,255,0.07)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${i < modIdx ? "rgba(0,229,255,0.22)" : "rgba(255,255,255,0.04)"}`,
                          color: i < modIdx ? "#00e5ff" : "rgba(255,255,255,0.12)",
                          boxShadow: i < modIdx ? "0 0 6px rgba(0,229,255,0.1)" : "none",
                        }}
                      >
                        {mod.split(" ")[0]}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── BOTTOM STATUS BAR ── */}
          <div className="flex items-center justify-between px-6 py-2 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-6">
              {[
                { label: "NODES", val: "14/14", col: "#00ff41" },
                { label: "CVEs", val: "3 NEW", col: "#a78bfa" },
                { label: "UPTIME", val: "99.9%", col: "#00e5ff" },
                { label: "BRAINS", val: "105", col: "#fbbf24" },
              ].map(({ label, val, col }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.25)" }}>{label}:</span>
                  <span className="font-mono text-[7px] font-bold" style={{ color: col }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.15)" }}>
              KaliGPT · mr7.ai · Authorized Operators Only
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
