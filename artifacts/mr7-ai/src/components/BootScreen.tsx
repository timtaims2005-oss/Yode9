import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

/* ════════════════════════════════════════════════════════════
   DATA — Boot Log (25 entries, 80+ subsystems)
════════════════════════════════════════════════════════════ */
const BOOT_LOG = [
  { ms: 0,    text: "[ BIOS ] KaliGPT Quantum Neural Engine v4.0 — COLD BOOT",     col: "#00ff41" },
  { ms: 80,   text: "[ UEFI ] Secure boot chain SHA-512 verified. TPM 3.0 OK",      col: "#00ff41" },
  { ms: 160,  text: "[ MEM  ] Allocating 12.8TB threat intelligence cache… DONE",   col: "#00ff41" },
  { ms: 240,  text: "[ CPU  ] 256-core quantum tensor array — ONLINE",               col: "#00ff41" },
  { ms: 310,  text: "[ GPU  ] 8× H200 tensor cores armed. VRAM: 640GB",             col: "#00e5ff" },
  { ms: 380,  text: "[ NET  ] Quantum-encrypted mesh: 14 relay nodes active",        col: "#00e5ff" },
  { ms: 450,  text: "[ TLS  ] mTLS handshake complete. Cert chain valid (ECC-384)",  col: "#00ff41" },
  { ms: 520,  text: "[ AUTH ] Zero-trust auth layer: ACTIVE — biometric req.",       col: "#fbbf24" },
  { ms: 590,  text: "[ AI   ] Loading 105-brain council framework… OK",              col: "#00ff41" },
  { ms: 650,  text: "[ PERS ] Persona matrix: 16 identities mounted… OK",            col: "#00ff41" },
  { ms: 710,  text: "[ HUB  ] Arsenal Hub: 70+ modules armed and locked",            col: "#fbbf24" },
  { ms: 770,  text: "[ PRV  ] OpenAI · Anthropic · Groq · Gemini · OpenRouter",     col: "#00e5ff" },
  { ms: 830,  text: "[ OSNT ] Dark-web indexers synced. 3 new CVEs detected",       col: "#a78bfa" },
  { ms: 890,  text: "[ SEC  ] CSRF shield armed. Rate-limiter: 150 req/min",         col: "#00ff41" },
  { ms: 950,  text: "[ RAG  ] Vector DB indexed: 2.4M security documents",           col: "#00e5ff" },
  { ms: 1010, text: "[ PIPE ] Chain Builder: 12 active rules. Pipeline READY",       col: "#00ff41" },
  { ms: 1070, text: "[ GOD  ] GodMode cores UNLOCKED — all 14 modes hot",            col: "#e21227" },
  { ms: 1130, text: "[ OLL  ] Ollama v0.30.10: qwen2.5:0.5b loaded — LOCAL OK",     col: "#22c55e" },
  { ms: 1190, text: "[ SYNC ] Cloud sync: PostgreSQL replication lag <2ms",          col: "#00e5ff" },
  { ms: 1250, text: "[ CVE  ] NVD feed: 8,742 entries · CISA KEV: 1,107",           col: "#fbbf24" },
  { ms: 1310, text: "[ FUZZ ] Parseltongue fuzzer armed. Shellcode gen ready",       col: "#a78bfa" },
  { ms: 1370, text: "[ MLWR ] Malware sandbox: 4 isolated VMs spawned",              col: "#e21227" },
  { ms: 1430, text: "[ DASH ] Monitoring dashboards: 3D, Prometheus, Grafana OK",   col: "#00e5ff" },
  { ms: 1510, text: "[ CORE ] All 80 subsystems nominal. Booting UI shell…",         col: "#00ff41" },
  { ms: 1620, text: "[ DONE ] ██████████████ 100% — WELCOME, OPERATOR.",              col: "#e21227" },
];

const MODULES_FLASH = [
  "KaliAgent","NEXUS","JARVIS","Parseltongue","RAGFlow","OpenGravity",
  "TeamAgent","Skills Lib","AgentOS","GeminiCLI","Hermes","Graphify",
  "GodMode","CCSwitch","UI/UX Pro","CareerOps","RedTeam AI","DarkWeb Mon",
  "OSINT+","Council 105","Arsenal","ShellGen","CVEWatch","NetScan Pro",
  "ChainBuilder","Forensics","PrivEsc AI","CipherBreak","MalwareLab","LogicBomb",
];

const SUBSYSTEMS = [
  { label: "Auth Layer",      status: "OK",  col: "#00ff41", delay: 280  },
  { label: "Encryption",      status: "OK",  col: "#00ff41", delay: 400  },
  { label: "OSINT Engine",    status: "OK",  col: "#00ff41", delay: 520  },
  { label: "Vector DB",       status: "OK",  col: "#00e5ff", delay: 640  },
  { label: "GodMode",         status: "HOT", col: "#e21227", delay: 760  },
  { label: "Mesh Network",    status: "OK",  col: "#00e5ff", delay: 880  },
  { label: "Arsenal Hub",     status: "RDY", col: "#fbbf24", delay: 760  },
  { label: "Council AI",      status: "OK",  col: "#a78bfa", delay: 880  },
  { label: "Fuzz Engine",     status: "RDY", col: "#22c55e", delay: 960  },
  { label: "Malware Lab",     status: "OK",  col: "#a78bfa", delay: 1020 },
  { label: "CVE Monitor",     status: "LIVE",col: "#fbbf24", delay: 1080 },
  { label: "Chain Builder",   status: "RDY", col: "#00e5ff", delay: 1140 },
  { label: "Local Engines",   status: "OK",  col: "#22c55e", delay: 1200 },
  { label: "Monitoring 3D",   status: "OK",  col: "#00e5ff", delay: 1260 },
  { label: "CSRF Shield",     status: "ARM", col: "#00ff41", delay: 1320 },
  { label: "Persona Matrix",  status: "16x", col: "#a78bfa", delay: 1380 },
];

const SYS_METRICS = [
  { label: "QUANTUM CPU",    pct: 94,  col: "#00ff41" },
  { label: "NEURAL RAM",     pct: 78,  col: "#00e5ff" },
  { label: "MESH NET",       pct: 99,  col: "#a78bfa" },
  { label: "THREAT DB",      pct: 100, col: "#e21227" },
  { label: "LOCAL ENGINE",   pct: 62,  col: "#22c55e" },
  { label: "VECTOR INDEX",   pct: 88,  col: "#fbbf24" },
];

const THREAT_EVENTS = [
  "CVE-2024-9873 · CVSS 9.8 detected",
  "Dark-web actor 0xDEAD active",
  "3 new zero-days indexed",
  "CISA KEV updated: +2 entries",
  "Mesh relay node #7: ANOMALY",
  "Threat feed sync complete",
  "RCE attempt blocked: 192.168.0.44",
  "APT-28 signature match in feed",
];

const NETWORK_NODES = [
  { id: "N01", ip: "10.0.0.1",   region: "CORE",    ping: 1,  status: "OK" },
  { id: "N02", ip: "10.0.0.14",  region: "EU-W",    ping: 12, status: "OK" },
  { id: "N03", ip: "10.0.0.27",  region: "US-E",    ping: 9,  status: "OK" },
  { id: "N04", ip: "10.0.0.38",  region: "APAC",    ping: 31, status: "OK" },
  { id: "N05", ip: "10.0.1.2",   region: "TOR",     ping: 44, status: "TOR"},
  { id: "N06", ip: "10.0.1.15",  region: "RELAY",   ping: 8,  status: "OK" },
  { id: "N07", ip: "10.0.2.1",   region: "RELAY",   ping: 19, status: "WARN"},
  { id: "N08", ip: "10.0.2.9",   region: "BACKUP",  ping: 6,  status: "OK" },
  { id: "N09", ip: "10.0.3.5",   region: "EXIT",    ping: 55, status: "OK" },
  { id: "N10", ip: "10.0.3.22",  region: "VPN",     ping: 14, status: "OK" },
  { id: "N11", ip: "10.0.4.1",   region: "HIDDEN",  ping: 77, status: "TOR"},
  { id: "N12", ip: "10.0.4.18",  region: "EU-N",    ping: 22, status: "OK" },
  { id: "N13", ip: "10.0.5.3",   region: "ME",      ping: 38, status: "OK" },
  { id: "N14", ip: "10.0.5.77",  region: "AF",      ping: 61, status: "OK" },
];

const QUICK_LAUNCH = [
  { label: "KaliGPT App",    emoji: "⚡", path: "/app",     col: "#e21227", sub: "الدردشة الرئيسية" },
  { label: "Council Mode",   emoji: "🧠", path: "/app",     col: "#a78bfa", sub: "105 عقل" },
  { label: "Arsenal Hub",    emoji: "🔧", path: "/app",     col: "#00e5ff", sub: "70+ أداة" },
  { label: "GodMode",        emoji: "🔥", path: "/app",     col: "#fbbf24", sub: "14 وضع" },
  { label: "Roadmap",        emoji: "🗺",  path: "/roadmap", col: "#22c55e", sub: "خريطة الطريق" },
  { label: "Pentest Lab",    emoji: "🧪", path: "/app",     col: "#f97316", sub: "بيئة اختبار" },
];

/* ════════════════════════════════════════════════════════════
   PRECOMPUTED RANDOM VALUES
════════════════════════════════════════════════════════════ */
const WAVE_HEIGHTS   = Array.from({ length: 28 }, () => 6 + Math.random() * 14);
const WAVE_DURATIONS = Array.from({ length: 28 }, () => 0.4 + Math.random() * 0.6);

/* ════════════════════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════════════════════ */
function CornerHUD({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 10, left: 10 },
    tr: { top: 10, right: 10 },
    bl: { bottom: 10, left: 10 },
    br: { bottom: 10, right: 10 },
  };
  const rotate = { tl: "0deg", tr: "90deg", bl: "270deg", br: "180deg" }[pos];
  return (
    <div style={{ position: "absolute", ...styles[pos], width: 40, height: 40, pointerEvents: "none", zIndex: 20 }}>
      <svg width="40" height="40" style={{ transform: `rotate(${rotate})` }}>
        <polyline points="0,20 0,0 20,0" fill="none" stroke="rgba(226,18,39,0.6)" strokeWidth="1.5" />
        <polyline points="5,25 5,5 25,5" fill="none" stroke="rgba(226,18,39,0.2)" strokeWidth="0.8" />
        <circle cx="0" cy="0" r="2" fill="#e21227" opacity="0.7" />
      </svg>
    </div>
  );
}

function WaveformBar({ color = "#00ff41", bars = 28 }: { color?: string; bars?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
      {WAVE_HEIGHTS.slice(0, bars).map((h, i) => (
        <motion.div key={i}
          style={{ width: 2, borderRadius: 1, background: color, originY: 1 }}
          animate={{ height: [4, h, 4] }}
          transition={{ duration: WAVE_DURATIONS[i], repeat: Infinity, delay: i * 0.04, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function MetricBar({ label, pct, col, delay }: { label: string; pct: number; col: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay / 1000 + 0.4, duration: 0.35 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 7.5, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}>{label}</span>
        <span style={{ fontSize: 7.5, fontFamily: "monospace", color: col }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${col}99, ${col})`, borderRadius: 2 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay / 1000 + 0.6, duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

function BiometricScanner({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <motion.div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(0,229,255,0.4)" }}
        animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "1px dashed rgba(226,18,39,0.4)" }}
        animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: "absolute", inset: 16, borderRadius: "50%", border: "0.5px solid rgba(0,229,255,0.15)" }}
        animate={{ rotate: 180 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
      <div style={{ position: "absolute", inset: 16, border: "1px solid rgba(0,229,255,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <rect x="8" y="6" width="18" height="22" rx="5" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <circle cx="12.5" cy="15" r="1.8" fill="#00e5ff" opacity="0.7"/>
          <circle cx="21.5" cy="15" r="1.8" fill="#00e5ff" opacity="0.7"/>
          <path d="M11 22 Q17 26 23 22" stroke="rgba(0,229,255,0.5)" strokeWidth="1" fill="none"/>
          <line x1="8" y1="10" x2="11" y2="10" stroke="rgba(0,229,255,0.4)" strokeWidth="0.8"/>
          <line x1="23" y1="10" x2="26" y2="10" stroke="rgba(0,229,255,0.4)" strokeWidth="0.8"/>
        </svg>
      </div>
      {active && (
        <motion.div style={{ position: "absolute", inset: 16, borderRadius: "50%", overflow: "hidden" }}>
          <motion.div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #00e5ff, transparent)", boxShadow: "0 0 10px #00e5ff" }}
            animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
      )}
      <motion.div style={{ position: "absolute", bottom: 4, right: 4, width: 9, height: 9, borderRadius: "50%", background: active ? "#22c55e" : "#e21227", boxShadow: `0 0 8px ${active ? "#22c55e" : "#e21227"}` }}
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
    </div>
  );
}

function SphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width  = 260;
    const H = canvas.height = 260;
    let angle = 0, t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      angle += 0.016; t += 0.033;
      const cx = W / 2, cy = H / 2, R = 100;

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      grd.addColorStop(0, "rgba(226,18,39,0.07)");
      grd.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      const rings = [
        { r: R,        color: "rgba(226,18,39,",   tilt: 0 },
        { r: R * 0.76, color: "rgba(0,229,255,",   tilt: Math.PI / 4 },
        { r: R * 0.52, color: "rgba(167,139,250,", tilt: Math.PI / 2.5 },
        { r: R * 0.89, color: "rgba(34,197,94,",   tilt: Math.PI / 6 },
        { r: R * 0.62, color: "rgba(251,191,36,",  tilt: Math.PI / 3.5 },
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
            ctx.strokeStyle = `${color}${(alpha * 0.6).toFixed(2)})`;
            ctx.lineWidth = 0.7;
            if (first) { ctx.moveTo(px, py); first = false; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      });

      const nPts = 160;
      for (let i = 0; i < nPts; i++) {
        const phi   = Math.acos(1 - 2 * i / nPts);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + angle * 2;
        const x = R * Math.sin(phi) * Math.cos(theta);
        const y = R * Math.sin(phi) * Math.sin(theta);
        const z = R * Math.cos(phi);
        const persp = 340 / (340 + z);
        const px = cx + x * persp, py = cy + y * persp;
        const brightness = (z / R + 1) / 2;
        const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.25);
        const pr = 1.6 * persp * (0.5 + 0.5 * pulse);
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${(brightness * 0.85 * pulse).toFixed(2)})`;
        ctx.fill();
      }

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

      const corePulse = 0.5 + 0.5 * Math.sin(t * 2);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22 * corePulse);
      core.addColorStop(0, `rgba(226,18,39,${(0.65 * corePulse).toFixed(2)})`);
      core.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, 22 * corePulse, 0, Math.PI * 2);
      ctx.fillStyle = core; ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

/* ── Network Map Panel ── */
function NetworkMap() {
  return (
    <div style={{ marginTop: 8 }}>
      <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color: "rgba(0,229,255,0.4)", fontFamily: "monospace" }}>
        ▶ NETWORK NODES [{NETWORK_NODES.length}/14]
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
        {NETWORK_NODES.map(node => (
          <div key={node.id} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 5px", borderRadius: 4,
            background: "rgba(0,229,255,0.03)",
            border: `1px solid ${node.status === "WARN" ? "rgba(251,191,36,0.2)" : node.status === "TOR" ? "rgba(167,139,250,0.2)" : "rgba(0,229,255,0.1)"}`,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: node.status === "WARN" ? "#fbbf24" : node.status === "TOR" ? "#a78bfa" : "#22c55e",
              boxShadow: `0 0 4px ${node.status === "WARN" ? "#fbbf24" : node.status === "TOR" ? "#a78bfa" : "#22c55e"}`,
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {node.id} · {node.region}
              </div>
              <div style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(0,229,255,0.35)", marginTop: 1 }}>
                {node.ip} · {node.ping}ms
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quick Launch Panel ── */
function QuickLaunchPanel({ onSelect }: { onSelect: (path: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
        width: "min(680px, 94vw)", zIndex: 30,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(226,18,39,0.35)",
        borderRadius: 20, padding: "20px 24px",
        boxShadow: "0 0 60px rgba(226,18,39,0.2), 0 20px 60px rgba(0,0,0,0.7)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 10px #e21227" }}
        />
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(226,18,39,0.8)", letterSpacing: "0.35em", fontWeight: 700 }}>
          MISSION CONTROL — SELECT OPERATION
        </span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(226,18,39,0.3), transparent)" }} />
        <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
          انقر للدخول
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {QUICK_LAUNCH.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            onClick={() => onSelect(item.path)}
            style={{
              padding: "12px 10px", borderRadius: 12,
              background: `${item.col}10`,
              border: `1px solid ${item.col}30`,
              cursor: "pointer", transition: "all 0.25s ease",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              textAlign: "center",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `${item.col}22`;
              (e.currentTarget as HTMLElement).style.borderColor = `${item.col}60`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${item.col}25`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = `${item.col}10`;
              (e.currentTarget as HTMLElement).style.borderColor = `${item.col}30`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 20 }}>{item.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: item.col, fontFamily: "monospace", letterSpacing: "0.1em" }}>
              {item.label}
            </span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              {item.sub}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN BOOTSCREEN
════════════════════════════════════════════════════════════ */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [, navigate] = useLocation();
  const [show,        setShow]        = useState(true);
  const [lines,       setLines]       = useState<{ text: string; col: string }[]>([]);
  const [progress,    setProgress]    = useState(0);
  const [modIdx,      setModIdx]      = useState(0);
  const [phase,       setPhase]       = useState<"boot" | "scan" | "modules" | "done">("boot");
  const [subsysReady, setSubsysReady] = useState<boolean[]>(Array(SUBSYSTEMS.length).fill(false));
  const [threatIdx,   setThreatIdx]   = useState(0);
  const [showLaunch,  setShowLaunch]  = useState(false);
  const [rightTab,    setRightTab]    = useState<"log" | "nodes">("log");
  const [scanDone,    setScanDone]    = useState(false);
  const [sessionSec,  setSessionSec]  = useState(0);
  const [operatorId]  = useState(() => {
    const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0").toUpperCase();
    return `OPR-${hex()}-${hex()}`;
  });

  const dismiss = useCallback((path?: string) => {
    setShow(false);
    setTimeout(() => {
      onDone();
      if (path && path !== "/app") navigate(path);
    }, 500);
  }, [onDone, navigate]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LOG.forEach(({ ms, text, col }) => {
      timers.push(setTimeout(() => {
        setLines(l => [...l, { text, col }]);
        setProgress(p => Math.min(100, p + Math.round(100 / BOOT_LOG.length)));
      }, ms));
    });

    SUBSYSTEMS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setSubsysReady(prev => { const n = [...prev]; n[i] = true; return n; });
      }, SUBSYSTEMS[i].delay));
    });

    timers.push(setTimeout(() => setPhase("scan"), 1680));
    timers.push(setTimeout(() => setScanDone(true), 2000));
    timers.push(setTimeout(() => setPhase("modules"), 2100));

    MODULES_FLASH.forEach((_, i) => {
      timers.push(setTimeout(() => setModIdx(i + 1), 2150 + i * 55));
    });

    const doneAt = 2150 + MODULES_FLASH.length * 55;
    timers.push(setTimeout(() => { setPhase("done"); setShowLaunch(true); }, doneAt));
    timers.push(setTimeout(() => dismiss(), doneAt + 3000));

    const tickerInterval = setInterval(() => {
      setThreatIdx(i => (i + 1) % THREAT_EVENTS.length);
    }, 850);

    const sessionTimer = setInterval(() => {
      setSessionSec(s => s + 1);
    }, 1000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tickerInterval);
      clearInterval(sessionTimer);
    };
  }, [dismiss]);

  const formatSessionTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[99999] flex flex-col overflow-hidden"
          style={{ background: "#000000" }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => !showLaunch && dismiss()}
        >
          {/* Corners */}
          <CornerHUD pos="tl" /><CornerHUD pos="tr" />
          <CornerHUD pos="bl" /><CornerHUD pos="br" />

          {/* Grid bg */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(226,18,39,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(45deg, rgba(0,229,255,0.012) 1px, transparent 1px)",
            backgroundSize: "84px 84px",
          }} />

          {/* ── TOP STATUS BAR ── */}
          <div className="flex items-center justify-between px-5 py-2 z-10 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-3">
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.75, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 8px #e21227" }} />
              <span className="font-mono text-[8.5px] tracking-[0.28em]" style={{ color: "rgba(226,18,39,0.75)" }}>
                KALIGPT QNEV4 — AUTHORIZED ACCESS
              </span>
              <span className="font-mono text-[7px] px-1.5 py-0.5 rounded" style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.07)" }}>
                SECURE
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-[7.5px]" style={{ color: "rgba(0,229,255,0.5)" }}>
                SESSION: {formatSessionTime(sessionSec)}
              </span>
              <span className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
              </span>
              <span className="font-mono text-[7px] px-2 py-0.5 rounded" style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.07)" }}>
                THREAT: ELEVATED
              </span>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex flex-1 overflow-hidden relative">

            {/* Quick Launch */}
            <AnimatePresence>
              {showLaunch && (
                <QuickLaunchPanel onSelect={(path) => dismiss(path)} />
              )}
            </AnimatePresence>

            {/* ── LEFT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center relative px-4 gap-3">
              <motion.div className="absolute inset-x-0 h-px pointer-events-none z-10"
                style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.6),rgba(0,229,255,0.3),rgba(226,18,39,0.6),transparent)" }}
                animate={{ top: ["0%","100%","0%"] }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }} />

              <motion.div initial={{ scale: 0.45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <SphereCanvas />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }} className="text-center">
                <div className="text-5xl font-black tracking-widest mb-1">
                  <motion.span style={{ color: "#e21227" }}
                    animate={{ textShadow: ["0 0 8px #e21227","0 0 36px #e21227, 0 0 70px #e21227aa","0 0 8px #e21227"] }}
                    transition={{ duration: 2, repeat: Infinity }}>KALI</motion.span>
                  <span className="text-white">GPT</span>
                </div>
                <div className="font-mono tracking-[0.35em] text-[8px] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
                  AUTONOMOUS CYBER AI · v4.0 · ARSENAL MODE PRO
                </div>
              </motion.div>

              {/* Progress */}
              <div className="w-60">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>SYSTEM INIT</span>
                  <span className="font-mono text-[7.5px]" style={{ color: "#e21227" }}>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #e21227, #ff6b6b, #00e5ff, #a78bfa)" }}
                    animate={{ width: `${progress}%` }} transition={{ duration: 0.1, ease: "easeOut" }} />
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["-200% 0","200% 0"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
                </div>
              </div>

              {/* Metrics */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="w-60 space-y-1.5">
                {SYS_METRICS.map((m, i) => (
                  <MetricBar key={m.label} label={m.label} pct={m.pct} col={m.col} delay={i * 130} />
                ))}
              </motion.div>

              {/* Waveform */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                className="flex items-center gap-2">
                <span className="font-mono text-[6.5px]" style={{ color: "rgba(0,255,65,0.45)" }}>AUDIO</span>
                <WaveformBar />
                <span className="font-mono text-[6.5px]" style={{ color: "rgba(0,255,65,0.45)" }}>OK</span>
              </motion.div>

              {/* Phase status */}
              <AnimatePresence mode="wait">
                {phase === "scan" && (
                  <motion.div key="scan" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: "#00e5ff" }}>
                    ⬡ SCANNING OPERATOR BIOMETRICS…
                  </motion.div>
                )}
                {phase === "modules" && modIdx < MODULES_FLASH.length && (
                  <motion.div key={`mod-${modIdx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.055 }} className="font-mono text-[8.5px] font-black tracking-widest" style={{ color: "#00e5ff" }}>
                    LOADING: {MODULES_FLASH[modIdx] ?? ""}
                  </motion.div>
                )}
                {phase === "done" && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="font-mono text-[9.5px] font-black tracking-widest" style={{ color: "#22c55e", textShadow: "0 0 14px #22c55e" }}>
                    ✓ ALL 80 SYSTEMS ONLINE
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.1)" }}>
                {showLaunch ? "اختر عملية من لوحة التحكم أعلاه" : "انقر في أي مكان للتخطي"}
              </div>
            </div>

            {/* ── MIDDLE PANEL ── */}
            <div className="w-52 flex flex-col justify-center items-center gap-3 py-5"
              style={{ borderLeft: "1px solid rgba(0,229,255,0.08)", borderRight: "1px solid rgba(0,229,255,0.08)" }}>

              <div className="font-mono text-[6.5px] tracking-[0.3em] uppercase font-bold" style={{ color: "rgba(0,229,255,0.4)" }}>
                ▶ OPERATOR SCAN
              </div>

              <BiometricScanner active={phase === "scan" || phase === "boot"} />

              <AnimatePresence mode="wait">
                {!scanDone ? (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <div className="font-mono text-[7.5px] mb-0.5" style={{ color: "rgba(0,229,255,0.55)" }}>SCANNING…</div>
                    <div className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.18)" }}>BIOMETRIC AUTH</div>
                  </motion.div>
                ) : (
                  <motion.div key="id" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="font-mono text-[6.5px] mb-0.5" style={{ color: "#22c55e" }}>✓ OPERATOR ID</div>
                    <div className="font-mono text-[7.5px] font-bold" style={{ color: "#00e5ff" }}>{operatorId}</div>
                    <div className="font-mono text-[6px] mt-0.5" style={{ color: "rgba(34,197,94,0.55)" }}>CLEARANCE: TOP SECRET</div>
                    <div className="font-mono text-[6px]" style={{ color: "rgba(251,191,36,0.55)" }}>ROLE: RED TEAM LEAD</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subsystem badges */}
              <div className="w-full px-3 space-y-1 mt-1">
                <div className="font-mono text-[6px] tracking-[0.25em] uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.18)" }}>SUBSYSTEMS</div>
                {SUBSYSTEMS.map((sys, i) => (
                  <motion.div key={sys.label}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: subsysReady[i] ? 1 : 0.2, x: 0 }}
                    transition={{ delay: sys.delay / 1000, duration: 0.25 }}
                    className="flex items-center justify-between">
                    <span className="font-mono text-[6.5px]" style={{ color: subsysReady[i] ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)" }}>
                      {sys.label}
                    </span>
                    <span className="font-mono text-[5.5px] font-bold px-1 py-0.5 rounded"
                      style={{ color: sys.col, background: `${sys.col}12`, border: `1px solid ${sys.col}28` }}>
                      {subsysReady[i] ? sys.status : "…"}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Threat feed */}
              <div className="w-full px-3 mt-1">
                <div className="font-mono text-[6px] tracking-[0.25em] uppercase mb-1" style={{ color: "rgba(167,139,250,0.35)" }}>
                  THREAT FEED
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={threatIdx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-[6.5px] leading-snug" style={{ color: "rgba(167,139,250,0.65)" }}>
                    ⚡ {THREAT_EVENTS[threatIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="w-80 flex flex-col py-4 px-4 font-mono overflow-hidden"
              style={{ borderLeft: "1px solid rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(14px)" }}>

              {/* Tab switcher */}
              <div className="flex gap-1 mb-3">
                {(["log", "nodes"] as const).map(tab => (
                  <button key={tab} onClick={() => setRightTab(tab)} style={{
                    padding: "3px 10px", borderRadius: 6, fontSize: 6.5,
                    fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.2em",
                    cursor: "pointer", transition: "all 0.2s",
                    background: rightTab === tab ? "rgba(226,18,39,0.15)" : "rgba(255,255,255,0.03)",
                    color: rightTab === tab ? "#e21227" : "rgba(255,255,255,0.25)",
                    border: `1px solid ${rightTab === tab ? "rgba(226,18,39,0.35)" : "rgba(255,255,255,0.06)"}`,
                    textTransform: "uppercase",
                  }}>
                    {tab === "log" ? "BOOT LOG" : "NODES"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {rightTab === "log" ? (
                  <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
                    <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color: "rgba(226,18,39,0.5)" }}>
                      ▶ BOOT SEQUENCE LOG
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      {lines.map((ln, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.09 }} className="text-[8px] leading-snug"
                          style={{ color: ln.col, textShadow: `0 0 5px ${ln.col}44` }}>
                          {ln.text}
                        </motion.div>
                      ))}
                      <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.55, repeat: Infinity }}
                        className="text-[8.5px]" style={{ color: "#00ff41" }}>_</motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="nodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-hidden">
                    <NetworkMap />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Arsenal modules grid */}
              {phase !== "boot" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-3">
                  <div className="text-[6.5px] tracking-widest uppercase mb-1.5 font-bold" style={{ color: "rgba(0,229,255,0.4)" }}>
                    ARSENAL [{modIdx}/{MODULES_FLASH.length}]
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MODULES_FLASH.map((mod, i) => (
                      <motion.div key={mod}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: i < modIdx ? 1 : 0.1, scale: i < modIdx ? 1 : 0.92 }}
                        transition={{ duration: 0.09 }}
                        className="text-[6px] font-bold px-1 py-0.5 rounded text-center truncate"
                        style={{
                          background: i < modIdx ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${i < modIdx ? "rgba(0,229,255,0.2)" : "rgba(255,255,255,0.03)"}`,
                          color: i < modIdx ? "#00e5ff" : "rgba(255,255,255,0.1)",
                          boxShadow: i < modIdx ? "0 0 5px rgba(0,229,255,0.08)" : "none",
                        }}>
                        {mod.split(" ")[0]}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── BOTTOM STATUS BAR ── */}
          <div className="flex items-center justify-between px-5 py-2 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(226,18,39,0.08)", background: "rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-5">
              {[
                { label: "NODES",   val: "14/14",  col: "#00ff41" },
                { label: "CVEs",    val: "3 NEW",  col: "#a78bfa" },
                { label: "UPTIME",  val: "99.9%",  col: "#00e5ff" },
                { label: "BRAINS",  val: "105",    col: "#fbbf24" },
                { label: "MODULES", val: `${modIdx}/${MODULES_FLASH.length}`, col: "#22c55e" },
              ].map(({ label, val, col }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.22)" }}>{label}:</span>
                  <span className="font-mono text-[6.5px] font-bold" style={{ color: col }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <WaveformBar color="#00e5ff" bars={16} />
              <span className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.12)" }}>
                KaliGPT · mr7.ai · Authorized Only
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
