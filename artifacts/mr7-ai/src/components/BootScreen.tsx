import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

/* ════════════════════════════════════════════════════════════
   DATA — Boot Log (40 entries, 120+ subsystems)
════════════════════════════════════════════════════════════ */
const BOOT_LOG = [
  { ms: 0,    text: "[ BIOS ] KaliGPT Quantum Neural Engine v5.0 — COLD BOOT INITIATED",  col: "#00ff41" },
  { ms: 70,   text: "[ UEFI ] Secure boot chain SHA-512 verified. TPM 3.0 LOCKED",         col: "#00ff41" },
  { ms: 140,  text: "[ MEM  ] Allocating 24.6TB threat intelligence cache… DONE",          col: "#00ff41" },
  { ms: 210,  text: "[ CPU  ] 512-core quantum tensor array — ONLINE",                      col: "#00ff41" },
  { ms: 280,  text: "[ GPU  ] 16× H200 tensor cores armed. VRAM: 1.28TB — READY",          col: "#00e5ff" },
  { ms: 340,  text: "[ QUANT] Quantum entanglement layer: 99.97% coherence OK",             col: "#a78bfa" },
  { ms: 400,  text: "[ NET  ] Quantum-encrypted mesh: 20 relay nodes active",               col: "#00e5ff" },
  { ms: 460,  text: "[ TLS  ] mTLS handshake complete. Cert chain valid (ECC-512)",         col: "#00ff41" },
  { ms: 520,  text: "[ AUTH ] Zero-trust auth layer: ACTIVE — multi-factor biometric",      col: "#fbbf24" },
  { ms: 580,  text: "[ DNA  ] Operator DNA hash: 0xDEAD9F3A matched — VERIFIED",            col: "#22c55e" },
  { ms: 640,  text: "[ AI   ] Loading 256-brain council framework… OK",                     col: "#00ff41" },
  { ms: 700,  text: "[ PERS ] Persona matrix: 32 identities mounted… OK",                   col: "#00ff41" },
  { ms: 760,  text: "[ HUB  ] Arsenal Hub v2: 120+ modules armed and locked",               col: "#fbbf24" },
  { ms: 820,  text: "[ PRV  ] OpenAI · Anthropic · Groq · Gemini · DeepSeek · xAI",        col: "#00e5ff" },
  { ms: 875,  text: "[ PRV2 ] Mistral · Perplexity · Together · Fireworks · NVIDIA NIM",   col: "#00e5ff" },
  { ms: 930,  text: "[ OSNT ] Dark-web indexers synced. 7 new CVEs detected",               col: "#a78bfa" },
  { ms: 985,  text: "[ SEC  ] CSRF shield armed. Rate-limiter: 250 req/min",                col: "#00ff41" },
  { ms: 1040, text: "[ WAF  ] Web Application Firewall: 847 rules loaded — ACTIVE",         col: "#00ff41" },
  { ms: 1095, text: "[ RAG  ] Vector DB indexed: 8.7M security documents",                  col: "#00e5ff" },
  { ms: 1150, text: "[ PIPE ] Chain Builder v2: 24 active rules. Pipeline READY",           col: "#00ff41" },
  { ms: 1205, text: "[ GOD  ] GodMode cores UNLOCKED — all 18 modes hot",                   col: "#e21227" },
  { ms: 1260, text: "[ OLL  ] Ollama v0.35.0: llama3.2 + qwen2.5 loaded — LOCAL OK",       col: "#22c55e" },
  { ms: 1315, text: "[ SYNC ] Cloud sync: PostgreSQL replication lag <1ms",                 col: "#00e5ff" },
  { ms: 1370, text: "[ CVE  ] NVD feed: 18,422 entries · CISA KEV: 1,893",                 col: "#fbbf24" },
  { ms: 1420, text: "[ FUZZ ] Parseltongue v3 fuzzer armed. Shellcode gen ready",           col: "#a78bfa" },
  { ms: 1470, text: "[ MLWR ] Malware sandbox: 8 isolated VMs spawned",                    col: "#e21227" },
  { ms: 1520, text: "[ HONP ] HoneyPot network: 12 decoys deployed",                       col: "#f97316" },
  { ms: 1570, text: "[ SIEM ] SIEM engine: 2.4M events/sec processing capacity",           col: "#00e5ff" },
  { ms: 1620, text: "[ SOAR ] SOAR playbooks: 48 automated response rules loaded",          col: "#22c55e" },
  { ms: 1670, text: "[ DLP  ] Data Loss Prevention: ML model calibrated",                   col: "#00ff41" },
  { ms: 1720, text: "[ DASH ] Monitoring dashboards: 5D, Prometheus, Grafana, Loki OK",    col: "#00e5ff" },
  { ms: 1770, text: "[ ZERO ] Zero-Day scanner: 3 new signatures loaded",                  col: "#fbbf24" },
  { ms: 1820, text: "[ FRNS ] Digital forensics engine: memory dump analyzer READY",       col: "#a78bfa" },
  { ms: 1870, text: "[ PRIV ] PrivEsc AI v2: 240 privilege escalation paths loaded",       col: "#e21227" },
  { ms: 1920, text: "[ CRPT ] CipherBreak engine: RSA/AES/ChaCha20 analyzers ARMED",      col: "#a78bfa" },
  { ms: 1970, text: "[ SWRM ] Agent Swarm: 16 autonomous agents initialized",              col: "#00e5ff" },
  { ms: 2020, text: "[ CTRL ] Command & Control: 3 C2 frameworks integrated",              col: "#fbbf24" },
  { ms: 2070, text: "[ CORE ] All 120 subsystems nominal. Booting UI shell…",              col: "#00ff41" },
  { ms: 2150, text: "[ DONE ] ██████████████████ 100% — WELCOME, OPERATOR.",               col: "#e21227" },
];

const MODULES_FLASH = [
  "KaliAgent v5","NEXUS CORE","JARVIS PRO","Parseltongue v3","RAGFlow","OpenGravity",
  "TeamAgent","Skills Lib","AgentOS","GeminiCLI","Hermes","Graphify",
  "GodMode 18x","CCSwitch","UI/UX Pro","CareerOps","RedTeam AI","DarkWeb Mon",
  "OSINT+","Council 256","Arsenal v2","ShellGen","CVEWatch","NetScan Pro",
  "ChainBuilder","Forensics","PrivEsc AI","CipherBreak","MalwareLab","LogicBomb",
  "HoneyPot","SIEM Engine","SOAR Engine","DLP Shield","ZeroDay Scanner",
  "Swarm AI","C2 Framework","BinaryAnalysis","ThreatHunter","MemDump Analyzer",
  "PacketSniffer","PortKnocker","SQLInjector","XSS Hunter","BufferBreak",
  "ReverseShell","MetaLoader","PhishKit","DNSpoison","SSLStrip",
];

const SUBSYSTEMS = [
  { label: "Auth Layer",       status: "OK",   col: "#00ff41", delay: 280  },
  { label: "Encryption",       status: "OK",   col: "#00ff41", delay: 380  },
  { label: "Quantum Layer",    status: "OK",   col: "#a78bfa", delay: 440  },
  { label: "OSINT Engine",     status: "OK",   col: "#00ff41", delay: 520  },
  { label: "Vector DB",        status: "OK",   col: "#00e5ff", delay: 600  },
  { label: "GodMode",          status: "HOT",  col: "#e21227", delay: 680  },
  { label: "Mesh Network",     status: "OK",   col: "#00e5ff", delay: 760  },
  { label: "Arsenal Hub",      status: "RDY",  col: "#fbbf24", delay: 820  },
  { label: "Council AI",       status: "256x", col: "#a78bfa", delay: 880  },
  { label: "Fuzz Engine",      status: "RDY",  col: "#22c55e", delay: 940  },
  { label: "Malware Lab",      status: "OK",   col: "#a78bfa", delay: 1000 },
  { label: "CVE Monitor",      status: "LIVE", col: "#fbbf24", delay: 1060 },
  { label: "Chain Builder",    status: "RDY",  col: "#00e5ff", delay: 1120 },
  { label: "Local Engines",    status: "OK",   col: "#22c55e", delay: 1180 },
  { label: "Monitoring 5D",    status: "OK",   col: "#00e5ff", delay: 1240 },
  { label: "CSRF Shield",      status: "ARM",  col: "#00ff41", delay: 1300 },
  { label: "Persona Matrix",   status: "32x",  col: "#a78bfa", delay: 1360 },
  { label: "SIEM Engine",      status: "LIVE", col: "#00e5ff", delay: 1420 },
  { label: "SOAR Engine",      status: "OK",   col: "#22c55e", delay: 1480 },
  { label: "HoneyPot Net",     status: "ARM",  col: "#f97316", delay: 1540 },
  { label: "Swarm AI",         status: "OK",   col: "#a78bfa", delay: 1600 },
  { label: "WAF Shield",       status: "ARM",  col: "#00ff41", delay: 1660 },
  { label: "Zero-Day Scanner", status: "RDY",  col: "#e21227", delay: 1720 },
  { label: "C2 Framework",     status: "OK",   col: "#fbbf24", delay: 1780 },
];

const SYS_METRICS = [
  { label: "QUANTUM CPU",    pct: 94,  col: "#00ff41" },
  { label: "NEURAL RAM",     pct: 78,  col: "#00e5ff" },
  { label: "MESH NET",       pct: 99,  col: "#a78bfa" },
  { label: "THREAT DB",      pct: 100, col: "#e21227" },
  { label: "LOCAL ENGINE",   pct: 62,  col: "#22c55e" },
  { label: "VECTOR INDEX",   pct: 88,  col: "#fbbf24" },
  { label: "SWARM AGENT",    pct: 73,  col: "#f97316" },
  { label: "SIEM PROC",      pct: 91,  col: "#00e5ff" },
];

const THREAT_EVENTS = [
  "CVE-2025-1337 · CVSS 10.0 CRITICAL detected",
  "Dark-web actor 0xSHADOW active — tracking",
  "5 new zero-days indexed in last 24h",
  "CISA KEV updated: +4 entries",
  "Mesh relay node #9: ANOMALY — investigating",
  "APT-29 signature match in feed — alerting",
  "RCE attempt blocked: 172.16.0.88",
  "APT-28 lateral movement detected",
  "Ransomware beacon blocked: 3 endpoints",
  "Quantum key exchange: 99.97% coherence",
  "Dark web credential dump: 2.1M records",
  "SQL injection wave blocked: 847 attempts",
  "Zero-day PoC published for CVE-2025-9920",
  "Threat intel sync: 18K IOCs loaded",
];

const NETWORK_NODES = [
  { id: "N01", ip: "10.0.0.1",   region: "CORE",    ping: 1,  status: "OK"   },
  { id: "N02", ip: "10.0.0.14",  region: "EU-W",    ping: 12, status: "OK"   },
  { id: "N03", ip: "10.0.0.27",  region: "US-E",    ping: 9,  status: "OK"   },
  { id: "N04", ip: "10.0.0.38",  region: "APAC",    ping: 31, status: "OK"   },
  { id: "N05", ip: "10.0.1.2",   region: "TOR",     ping: 44, status: "TOR"  },
  { id: "N06", ip: "10.0.1.15",  region: "RELAY",   ping: 8,  status: "OK"   },
  { id: "N07", ip: "10.0.2.1",   region: "RELAY",   ping: 19, status: "WARN" },
  { id: "N08", ip: "10.0.2.9",   region: "BACKUP",  ping: 6,  status: "OK"   },
  { id: "N09", ip: "10.0.3.5",   region: "EXIT",    ping: 55, status: "OK"   },
  { id: "N10", ip: "10.0.3.22",  region: "VPN",     ping: 14, status: "OK"   },
  { id: "N11", ip: "10.0.4.1",   region: "HIDDEN",  ping: 77, status: "TOR"  },
  { id: "N12", ip: "10.0.4.18",  region: "EU-N",    ping: 22, status: "OK"   },
  { id: "N13", ip: "10.0.5.3",   region: "ME",      ping: 38, status: "OK"   },
  { id: "N14", ip: "10.0.5.77",  region: "AF",      ping: 61, status: "OK"   },
  { id: "N15", ip: "10.0.6.2",   region: "SA",      ping: 28, status: "OK"   },
  { id: "N16", ip: "10.0.6.55",  region: "US-W",    ping: 7,  status: "OK"   },
  { id: "N17", ip: "10.0.7.1",   region: "QUANT",   ping: 2,  status: "OK"   },
  { id: "N18", ip: "10.0.7.30",  region: "DARK",    ping: 92, status: "TOR"  },
  { id: "N19", ip: "10.0.8.12",  region: "AS",      ping: 45, status: "OK"   },
  { id: "N20", ip: "10.0.8.99",  region: "ONION",   ping: 110,status: "TOR"  },
];

const QUICK_LAUNCH = [
  { label: "KaliGPT App",    emoji: "⚡", path: "/app",     col: "#e21227", sub: "الدردشة الرئيسية" },
  { label: "Council Mode",   emoji: "🧠", path: "/app",     col: "#a78bfa", sub: "256 عقل" },
  { label: "Arsenal Hub",    emoji: "🔧", path: "/app",     col: "#00e5ff", sub: "120+ أداة" },
  { label: "GodMode 18x",    emoji: "🔥", path: "/app",     col: "#fbbf24", sub: "18 وضع" },
  { label: "Roadmap",        emoji: "🗺",  path: "/roadmap", col: "#22c55e", sub: "خريطة الطريق" },
  { label: "Pentest Lab",    emoji: "🧪", path: "/app",     col: "#f97316", sub: "بيئة اختبار" },
  { label: "Swarm AI",       emoji: "🐝", path: "/app",     col: "#a78bfa", sub: "16 عميل" },
  { label: "OSINT Pro",      emoji: "👁",  path: "/app",     col: "#00e5ff", sub: "استخبارات" },
  { label: "Threat Intel",   emoji: "🛡",  path: "/app",     col: "#e21227", sub: "CVE Live" },
];

const AI_BENCHMARKS = [
  { name: "Groq Llama",    speed: 180, tokens: "3.3K/s", col: "#ff6600" },
  { name: "GPT-4o",        speed: 75,  tokens: "1.1K/s", col: "#00ff41" },
  { name: "Claude 3.5",    speed: 60,  tokens: "0.9K/s", col: "#00e5ff" },
  { name: "DeepSeek V3",   speed: 95,  tokens: "1.4K/s", col: "#00ffcc" },
  { name: "Gemini Flash",  speed: 120, tokens: "1.8K/s", col: "#00bfff" },
  { name: "Mistral Large", speed: 88,  tokens: "1.3K/s", col: "#ffcc00" },
];

/* ════════════════════════════════════════════════════════════
   PRECOMPUTED RANDOM VALUES
════════════════════════════════════════════════════════════ */
const WAVE_HEIGHTS   = Array.from({ length: 32 }, () => 5 + Math.random() * 18);
const WAVE_DURATIONS = Array.from({ length: 32 }, () => 0.3 + Math.random() * 0.7);

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
    <div style={{ position: "absolute", ...styles[pos], width: 48, height: 48, pointerEvents: "none", zIndex: 20 }}>
      <svg width="48" height="48" style={{ transform: `rotate(${rotate})` }}>
        <polyline points="0,24 0,0 24,0" fill="none" stroke="rgba(226,18,39,0.7)" strokeWidth="2" />
        <polyline points="6,30 6,6 30,6" fill="none" stroke="rgba(226,18,39,0.25)" strokeWidth="0.8" />
        <circle cx="0" cy="0" r="3" fill="#e21227" opacity="0.8" />
        <motion.circle cx="12" cy="0" r="1" fill="#e21227" opacity="0.4"
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
      </svg>
    </div>
  );
}

function WaveformBar({ color = "#00ff41", bars = 32 }: { color?: string; bars?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 22 }}>
      {WAVE_HEIGHTS.slice(0, bars).map((h, i) => (
        <motion.div key={i}
          style={{ width: 2, borderRadius: 1, background: color, originY: 1 }}
          animate={{ height: [4, h, 4] }}
          transition={{ duration: WAVE_DURATIONS[i], repeat: Infinity, delay: i * 0.035, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function MetricBar({ label, pct, col, delay }: { label: string; pct: number; col: string; delay: number }) {
  const [animated, setAnimated] = useState(pct);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimated(p => {
        const drift = (Math.random() - 0.5) * 4;
        return Math.max(10, Math.min(100, p + drift));
      });
    }, 2000 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay / 1000 + 0.4, duration: 0.35 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em" }}>{label}</span>
        <span style={{ fontSize: 7, fontFamily: "monospace", color: col }}>{Math.round(animated)}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: `linear-gradient(90deg, ${col}88, ${col})`, borderRadius: 2 }}
          animate={{ width: `${animated}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

function BiometricScanner({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <motion.div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(0,229,255,0.5)" }}
        animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "1px dashed rgba(226,18,39,0.5)" }}
        animate={{ rotate: -360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: "absolute", inset: 14, borderRadius: "50%", border: "0.5px solid rgba(167,139,250,0.3)" }}
        animate={{ rotate: 180 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }} />
      <motion.div style={{ position: "absolute", inset: 20, borderRadius: "50%", border: "0.5px solid rgba(0,229,255,0.15)" }}
        animate={{ rotate: -90 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
      <div style={{ position: "absolute", inset: 20, border: "1px solid rgba(0,229,255,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="8" y="6" width="20" height="24" rx="6" stroke="rgba(0,229,255,0.6)" strokeWidth="1"/>
          <circle cx="13" cy="16" r="2" fill="#00e5ff" opacity="0.8"/>
          <circle cx="23" cy="16" r="2" fill="#00e5ff" opacity="0.8"/>
          <path d="M11 24 Q18 28 25 24" stroke="rgba(0,229,255,0.6)" strokeWidth="1" fill="none"/>
          <line x1="8" y1="10" x2="12" y2="10" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <line x1="24" y1="10" x2="28" y2="10" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <line x1="8" y1="18" x2="10" y2="18" stroke="rgba(0,229,255,0.3)" strokeWidth="0.8"/>
          <line x1="26" y1="18" x2="28" y2="18" stroke="rgba(0,229,255,0.3)" strokeWidth="0.8"/>
        </svg>
      </div>
      {active && (
        <motion.div style={{ position: "absolute", inset: 20, borderRadius: "50%", overflow: "hidden" }}>
          <motion.div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #00e5ff, transparent)", boxShadow: "0 0 14px #00e5ff" }}
            animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
      )}
      <motion.div style={{ position: "absolute", bottom: 4, right: 4, width: 10, height: 10, borderRadius: "50%", background: active ? "#22c55e" : "#e21227", boxShadow: `0 0 10px ${active ? "#22c55e" : "#e21227"}` }}
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
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
    const W = canvas.width  = 280;
    const H = canvas.height = 280;
    let angle = 0, t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      angle += 0.014; t += 0.028;
      const cx = W / 2, cy = H / 2, R = 108;

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
      grd.addColorStop(0, "rgba(226,18,39,0.06)");
      grd.addColorStop(0.5, "rgba(167,139,250,0.03)");
      grd.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      const rings = [
        { r: R,        color: "rgba(226,18,39,",   tilt: 0 },
        { r: R * 0.76, color: "rgba(0,229,255,",   tilt: Math.PI / 4 },
        { r: R * 0.52, color: "rgba(167,139,250,", tilt: Math.PI / 2.5 },
        { r: R * 0.89, color: "rgba(34,197,94,",   tilt: Math.PI / 6 },
        { r: R * 0.62, color: "rgba(251,191,36,",  tilt: Math.PI / 3.5 },
        { r: R * 0.38, color: "rgba(249,115,22,",  tilt: Math.PI / 1.8 },
      ];

      rings.forEach(({ r, color, tilt }) => {
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += Math.PI / 7) {
          const yr = r * Math.sin(lat);
          const r2 = r * Math.cos(lat);
          ctx.beginPath();
          let first = true;
          for (let lon = 0; lon <= Math.PI * 2 + 0.1; lon += 0.08) {
            const x3 = r2 * Math.cos(lon + angle + tilt);
            const z3 = r2 * Math.sin(lon + angle + tilt);
            const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
            const xF = x3;
            const yF = yr * cosT - z3 * sinT;
            const zF = yr * sinT + z3 * cosT;
            const persp = 360 / (360 + zF);
            const px = cx + xF * persp;
            const py = cy + yF * persp;
            const alpha = Math.max(0, (zF / r + 1) / 2);
            ctx.strokeStyle = `${color}${(alpha * 0.55).toFixed(2)})`;
            ctx.lineWidth = 0.6;
            if (first) { ctx.moveTo(px, py); first = false; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      });

      const nPts = 220;
      for (let i = 0; i < nPts; i++) {
        const phi   = Math.acos(1 - 2 * i / nPts);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + angle * 2;
        const x = R * Math.sin(phi) * Math.cos(theta);
        const y = R * Math.sin(phi) * Math.sin(theta);
        const z = R * Math.cos(phi);
        const persp = 360 / (360 + z);
        const px = cx + x * persp, py = cy + y * persp;
        const brightness = (z / R + 1) / 2;
        const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.22);
        const pr = 1.8 * persp * (0.5 + 0.5 * pulse);
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${(brightness * 0.9 * pulse).toFixed(2)})`;
        ctx.fill();
      }

      const orbColors = ["#e21227","#00e5ff","#a78bfa","#22c55e","#fbbf24","#f97316","#38bdf8","#fb923c","#00ffcc","#ff0080"];
      for (let i = 0; i < 10; i++) {
        const orbitAngle = angle * (1.3 + i * 0.15) + (Math.PI * 2 / 10) * i;
        const orR = R * (0.35 + i * 0.07);
        const ox = cx + orR * Math.cos(orbitAngle);
        const oy = cy + orR * Math.sin(orbitAngle) * 0.40;
        const oz = orR * Math.sin(orbitAngle);
        const persp2 = 360 / (360 + oz);
        ctx.beginPath();
        ctx.arc(ox * persp2 + cx * (1 - persp2), oy * persp2 + cy * (1 - persp2), 3.5 * persp2, 0, Math.PI * 2);
        ctx.fillStyle = orbColors[i % orbColors.length];
        ctx.shadowColor = orbColors[i % orbColors.length];
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const corePulse = 0.5 + 0.5 * Math.sin(t * 2);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26 * corePulse);
      core.addColorStop(0, `rgba(226,18,39,${(0.7 * corePulse).toFixed(2)})`);
      core.addColorStop(0.5, `rgba(167,139,250,${(0.3 * corePulse).toFixed(2)})`);
      core.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, 26 * corePulse, 0, Math.PI * 2);
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
    <div style={{ marginTop: 4 }}>
      <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color: "rgba(0,229,255,0.4)", fontFamily: "monospace" }}>
        ▶ NETWORK NODES [{NETWORK_NODES.length}/20]
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>
        {NETWORK_NODES.map(node => (
          <div key={node.id} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 5px", borderRadius: 4,
            background: "rgba(0,229,255,0.03)",
            border: `1px solid ${node.status === "WARN" ? "rgba(251,191,36,0.2)" : node.status === "TOR" ? "rgba(167,139,250,0.2)" : "rgba(0,229,255,0.1)"}`,
          }}>
            <motion.div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: node.status === "WARN" ? "#fbbf24" : node.status === "TOR" ? "#a78bfa" : "#22c55e",
              boxShadow: `0 0 4px ${node.status === "WARN" ? "#fbbf24" : node.status === "TOR" ? "#a78bfa" : "#22c55e"}`,
              flexShrink: 0,
            }} animate={{ opacity: node.status === "WARN" ? [1, 0.3, 1] : 1 }} transition={{ duration: 0.9, repeat: Infinity }} />
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

/* ── AI Benchmark Panel ── */
function AIBenchmarkPanel() {
  return (
    <div style={{ marginTop: 4 }}>
      <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color: "rgba(251,191,36,0.5)", fontFamily: "monospace" }}>
        ▶ AI PROVIDER BENCHMARKS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {AI_BENCHMARKS.map((b, i) => (
          <motion.div key={b.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{b.name}</span>
              <span style={{ fontSize: 6.5, fontFamily: "monospace", color: b.col }}>{b.tokens}</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: `linear-gradient(90deg, ${b.col}66, ${b.col})`, borderRadius: 2 }}
                initial={{ width: 0 }}
                animate={{ width: `${b.speed / 1.8}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </motion.div>
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
        position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)",
        width: "min(820px, 95vw)", zIndex: 30,
        background: "rgba(0,0,0,0.94)", backdropFilter: "blur(28px)",
        border: "1px solid rgba(226,18,39,0.4)",
        borderRadius: 22, padding: "22px 26px",
        boxShadow: "0 0 80px rgba(226,18,39,0.22), 0 20px 60px rgba(0,0,0,0.8)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.65, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 12px #e21227" }}
        />
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(226,18,39,0.85)", letterSpacing: "0.35em", fontWeight: 700 }}>
          MISSION CONTROL v2 — SELECT OPERATION
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
            transition={{ delay: i * 0.055, duration: 0.28 }}
            onClick={() => onSelect(item.path)}
            style={{
              padding: "12px 10px", borderRadius: 12,
              background: `${item.col}10`,
              border: `1px solid ${item.col}30`,
              cursor: "pointer", transition: "all 0.22s ease",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              textAlign: "center",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `${item.col}22`;
              (e.currentTarget as HTMLElement).style.borderColor = `${item.col}65`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${item.col}30`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = `${item.col}10`;
              (e.currentTarget as HTMLElement).style.borderColor = `${item.col}30`;
              (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)";
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

      {/* Shortcut hints */}
      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {[["ESC", "تخطي"], ["ENTER", "دخول سريع"], ["F12", "GodMode"], ["?", "مساعدة"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 7, fontFamily: "monospace", padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>{k}</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{v}</span>
          </div>
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
  const [rightTab,    setRightTab]    = useState<"log" | "nodes" | "bench">("log");
  const [scanDone,    setScanDone]    = useState(false);
  const [sessionSec,  setSessionSec]  = useState(0);
  const [threatCount, setThreatCount] = useState(0);
  const [operatorId]  = useState(() => {
    const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0").toUpperCase();
    return `OPR-${hex()}-${hex()}`;
  });
  const [clearanceLevel] = useState(() => {
    const levels = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "OMEGA"];
    return levels[Math.floor(Math.random() * levels.length)];
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

    timers.push(setTimeout(() => setPhase("scan"), 2200));
    timers.push(setTimeout(() => setScanDone(true), 2600));
    timers.push(setTimeout(() => setPhase("modules"), 2700));

    MODULES_FLASH.forEach((_, i) => {
      timers.push(setTimeout(() => setModIdx(i + 1), 2750 + i * 50));
    });

    const doneAt = 2750 + MODULES_FLASH.length * 50;
    timers.push(setTimeout(() => { setPhase("done"); setShowLaunch(true); }, doneAt));
    timers.push(setTimeout(() => dismiss(), doneAt + 3500));

    const tickerInterval = setInterval(() => {
      setThreatIdx(i => (i + 1) % THREAT_EVENTS.length);
    }, 800);

    const sessionTimer = setInterval(() => {
      setSessionSec(s => s + 1);
    }, 1000);

    const threatTimer = setInterval(() => {
      setThreatCount(c => c + Math.floor(Math.random() * 3));
    }, 1200);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tickerInterval);
      clearInterval(sessionTimer);
      clearInterval(threatTimer);
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
          exit={{ opacity: 0, scale: 1.04 }}
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
            backgroundImage: "linear-gradient(45deg, rgba(0,229,255,0.01) 1px, transparent 1px)",
            backgroundSize: "84px 84px",
          }} />
          {/* Scan line */}
          <motion.div className="absolute inset-x-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)", zIndex: 5 }}
            animate={{ top: ["0%", "100%"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />

          {/* ── TOP STATUS BAR ── */}
          <div className="flex items-center justify-between px-5 py-2 z-10 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(226,18,39,0.12)", background: "rgba(0,0,0,0.7)" }}>
            <div className="flex items-center gap-3">
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.65, repeat: Infinity }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 10px #e21227" }} />
              <span className="font-mono text-[8.5px] tracking-[0.28em]" style={{ color: "rgba(226,18,39,0.8)" }}>
                KALIGPT QNEV5 — AUTHORIZED ACCESS ONLY
              </span>
              <span className="font-mono text-[7px] px-1.5 py-0.5 rounded" style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.07)" }}>
                SECURE
              </span>
              <span className="font-mono text-[7px] px-1.5 py-0.5 rounded" style={{ color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.07)" }}>
                QUANTUM
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-[7px]" style={{ color: "rgba(226,18,39,0.6)" }}>
                THREATS: <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#e21227", fontWeight: 700 }}>{threatCount}</motion.span>
              </span>
              <span className="font-mono text-[7.5px]" style={{ color: "rgba(0,229,255,0.5)" }}>
                SESSION: {formatSessionTime(sessionSec)}
              </span>
              <span className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
              </span>
              <span className="font-mono text-[7px] px-2 py-0.5 rounded" style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.07)" }}>
                THREAT: CRITICAL
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
            <div className="flex-1 flex flex-col items-center justify-center relative px-4 gap-2.5">
              <motion.div className="absolute inset-x-0 h-px pointer-events-none z-10"
                style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.7),rgba(0,229,255,0.35),rgba(226,18,39,0.7),transparent)" }}
                animate={{ top: ["0%","100%","0%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />

              <motion.div initial={{ scale: 0.45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <SphereCanvas />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }} className="text-center">
                <div className="text-5xl font-black tracking-widest mb-1">
                  <motion.span style={{ color: "#e21227" }}
                    animate={{ textShadow: ["0 0 8px #e21227","0 0 40px #e21227, 0 0 80px #e21227aa","0 0 8px #e21227"] }}
                    transition={{ duration: 1.8, repeat: Infinity }}>KALI</motion.span>
                  <span className="text-white">GPT</span>
                </div>
                <div className="font-mono tracking-[0.35em] text-[7.5px] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
                  AUTONOMOUS CYBER AI · v5.0 · ARSENAL MODE PRO ULTRA
                </div>
              </motion.div>

              {/* Progress */}
              <div className="w-64">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>SYSTEM INIT [{progress}/100]</span>
                  <span className="font-mono text-[7.5px]" style={{ color: "#e21227" }}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #e21227, #ff6b6b, #a78bfa, #00e5ff, #22c55e)" }}
                    animate={{ width: `${progress}%` }} transition={{ duration: 0.1, ease: "easeOut" }} />
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["-200% 0","200% 0"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
                </div>
              </div>

              {/* Metrics */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="w-64 space-y-1.5">
                {SYS_METRICS.map((m, i) => (
                  <MetricBar key={m.label} label={m.label} pct={m.pct} col={m.col} delay={i * 110} />
                ))}
              </motion.div>

              {/* Waveform */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                className="flex items-center gap-2">
                <span className="font-mono text-[6.5px]" style={{ color: "rgba(0,255,65,0.45)" }}>NEURAL</span>
                <WaveformBar color="#e21227" bars={20} />
                <WaveformBar bars={12} />
                <span className="font-mono text-[6.5px]" style={{ color: "rgba(0,255,65,0.45)" }}>LIVE</span>
              </motion.div>

              {/* Phase status */}
              <AnimatePresence mode="wait">
                {phase === "scan" && (
                  <motion.div key="scan" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color: "#00e5ff" }}>
                    ⬡ SCANNING OPERATOR BIOMETRICS + DNA…
                  </motion.div>
                )}
                {phase === "modules" && modIdx < MODULES_FLASH.length && (
                  <motion.div key={`mod-${modIdx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.05 }} className="font-mono text-[8.5px] font-black tracking-widest" style={{ color: "#00e5ff" }}>
                    ⟳ LOADING: {MODULES_FLASH[modIdx] ?? ""}
                  </motion.div>
                )}
                {phase === "done" && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="font-mono text-[9.5px] font-black tracking-widest" style={{ color: "#22c55e", textShadow: "0 0 18px #22c55e" }}>
                    ✓ ALL 120 SYSTEMS ONLINE — READY
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="font-mono text-[7px]" style={{ color: "rgba(255,255,255,0.1)" }}>
                {showLaunch ? "اختر عملية من لوحة التحكم أعلاه" : "انقر في أي مكان للتخطي"}
              </div>
            </div>

            {/* ── MIDDLE PANEL ── */}
            <div className="w-56 flex flex-col justify-center items-center gap-3 py-4"
              style={{ borderLeft: "1px solid rgba(0,229,255,0.08)", borderRight: "1px solid rgba(0,229,255,0.08)" }}>

              <div className="font-mono text-[6.5px] tracking-[0.3em] uppercase font-bold" style={{ color: "rgba(0,229,255,0.4)" }}>
                ▶ OPERATOR SCAN
              </div>

              <BiometricScanner active={phase === "scan" || phase === "boot"} />

              <AnimatePresence mode="wait">
                {!scanDone ? (
                  <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <div className="font-mono text-[7.5px] mb-0.5" style={{ color: "rgba(0,229,255,0.55)" }}>SCANNING…</div>
                    <div className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.18)" }}>BIOMETRIC + DNA AUTH</div>
                  </motion.div>
                ) : (
                  <motion.div key="id" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="font-mono text-[6.5px] mb-0.5" style={{ color: "#22c55e" }}>✓ OPERATOR VERIFIED</div>
                    <div className="font-mono text-[7.5px] font-bold" style={{ color: "#00e5ff" }}>{operatorId}</div>
                    <div className="font-mono text-[6px] mt-0.5" style={{ color: "rgba(34,197,94,0.55)" }}>CLEARANCE: {clearanceLevel}</div>
                    <div className="font-mono text-[6px]" style={{ color: "rgba(251,191,36,0.55)" }}>ROLE: RED TEAM LEAD</div>
                    <div className="font-mono text-[6px]" style={{ color: "rgba(167,139,250,0.55)" }}>DNA: 0xDEAD9F3A ✓</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subsystem badges */}
              <div className="w-full px-3 space-y-0.5 mt-1 overflow-hidden" style={{ maxHeight: 180 }}>
                <div className="font-mono text-[6px] tracking-[0.25em] uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.18)" }}>SUBSYSTEMS [{SUBSYSTEMS.filter((_, i) => subsysReady[i]).length}/{SUBSYSTEMS.length}]</div>
                {SUBSYSTEMS.map((sys, i) => (
                  <motion.div key={sys.label}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: subsysReady[i] ? 1 : 0.2, x: 0 }}
                    transition={{ delay: sys.delay / 1000, duration: 0.22 }}
                    className="flex items-center justify-between">
                    <span className="font-mono text-[6px]" style={{ color: subsysReady[i] ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" }}>
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
                  LIVE THREAT FEED
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={threatIdx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="font-mono text-[6.5px] leading-snug" style={{ color: "rgba(167,139,250,0.7)" }}>
                    ⚡ {THREAT_EVENTS[threatIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="w-80 flex flex-col py-4 px-4 font-mono overflow-hidden"
              style={{ borderLeft: "1px solid rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(16px)" }}>

              {/* Tab switcher */}
              <div className="flex gap-1 mb-3">
                {(["log", "nodes", "bench"] as const).map(tab => (
                  <button key={tab} onClick={() => setRightTab(tab)} style={{
                    padding: "3px 8px", borderRadius: 6, fontSize: 6,
                    fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.18em",
                    cursor: "pointer", transition: "all 0.2s",
                    background: rightTab === tab ? "rgba(226,18,39,0.15)" : "rgba(255,255,255,0.03)",
                    color: rightTab === tab ? "#e21227" : "rgba(255,255,255,0.25)",
                    border: `1px solid ${rightTab === tab ? "rgba(226,18,39,0.35)" : "rgba(255,255,255,0.06)"}`,
                    textTransform: "uppercase",
                  }}>
                    {tab === "log" ? "BOOT LOG" : tab === "nodes" ? "NODES" : "BENCH"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {rightTab === "log" ? (
                  <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
                    <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color: "rgba(226,18,39,0.5)" }}>
                      ▶ BOOT SEQUENCE LOG [{lines.length}/{BOOT_LOG.length}]
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      {lines.map((ln, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.08 }} className="text-[7.5px] leading-snug"
                          style={{ color: ln.col, textShadow: `0 0 5px ${ln.col}44` }}>
                          {ln.text}
                        </motion.div>
                      ))}
                      <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.55, repeat: Infinity }}
                        className="text-[8.5px]" style={{ color: "#00ff41" }}>_</motion.div>
                    </div>
                  </motion.div>
                ) : rightTab === "nodes" ? (
                  <motion.div key="nodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <NetworkMap />
                  </motion.div>
                ) : (
                  <motion.div key="bench" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <AIBenchmarkPanel />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Arsenal modules grid */}
              {phase !== "boot" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(226,18,39,0.1)" }}>
                  <div className="text-[6px] tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(226,18,39,0.35)" }}>
                    ARSENAL MODULES [{modIdx}/{MODULES_FLASH.length}]
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {MODULES_FLASH.slice(0, modIdx).map((mod, i) => (
                      <motion.span key={mod}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.1 }}
                        style={{
                          fontSize: 5.5, fontFamily: "monospace", padding: "1.5px 4px",
                          borderRadius: 3, fontWeight: 700,
                          background: i % 3 === 0 ? "rgba(226,18,39,0.1)" : i % 3 === 1 ? "rgba(0,229,255,0.08)" : "rgba(167,139,250,0.1)",
                          color: i % 3 === 0 ? "rgba(226,18,39,0.7)" : i % 3 === 1 ? "rgba(0,229,255,0.7)" : "rgba(167,139,250,0.7)",
                          border: `1px solid ${i % 3 === 0 ? "rgba(226,18,39,0.2)" : i % 3 === 1 ? "rgba(0,229,255,0.15)" : "rgba(167,139,250,0.2)"}`,
                        }}>
                        {mod}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── BOTTOM BAR ── */}
          <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 z-10"
            style={{ borderTop: "1px solid rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.7)" }}>
            <div className="flex items-center gap-4">
              {[
                { label: "CPU TEMP", val: "72°C", col: "#fbbf24" },
                { label: "GPU TEMP", val: "68°C", col: "#f97316" },
                { label: "LATENCY",  val: "2ms",  col: "#00e5ff" },
                { label: "PKT/S",    val: "1.2M", col: "#22c55e" },
              ].map(({ label, val, col }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.2)" }}>{label}:</span>
                  <span className="font-mono text-[6.5px] font-bold" style={{ color: col }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
                className="font-mono text-[6.5px]" style={{ color: "#22c55e" }}>● LIVE</motion.span>
              <span className="font-mono text-[6.5px]" style={{ color: "rgba(255,255,255,0.15)" }}>
                KaliGPT v5.0 · Arsenal Mode Pro Ultra · {SUBSYSTEMS.filter((_, i) => subsysReady[i]).length}/{SUBSYSTEMS.length} online
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
