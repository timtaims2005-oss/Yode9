import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, AlertTriangle, Play, ExternalLink, RefreshCw, Zap, Shield, Target, Globe } from "lucide-react";
import { ExploitChainModal } from "./ExploitChainModal";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface CVEEntry {
  id: string; title: string; cvss: number; vendor: string; product: string;
  type: string; published: string; description: string; zeroday: boolean;
  mitreIds?: string[]; attackOrigins?: [number, number][];
}

// MITRE ATT&CK tactics correlation
const MITRE_TACTICS: Record<string, { id: string; tactic: string; technique: string; color: string }[]> = {
  "RCE":          [{ id: "T1190", tactic: "Initial Access",  technique: "Exploit Public-Facing App", color: "#e21227" }, { id: "T1059", tactic: "Execution",      technique: "Command Scripting",          color: "#f97316" }],
  "Backdoor":     [{ id: "T1195", tactic: "Initial Access",  technique: "Supply Chain Compromise",   color: "#a855f7" }, { id: "T1543", tactic: "Persistence",    technique: "Create/Modify System Process",color: "#8b5cf6" }],
  "Auth Bypass":  [{ id: "T1078", tactic: "Defense Evasion",technique: "Valid Accounts",             color: "#f59e0b" }, { id: "T1110", tactic: "Credential Access","technique": "Brute Force",              color: "#fbbf24" }],
  "DDoS":         [{ id: "T1498", tactic: "Impact",         technique: "Network DoS",               color: "#ef4444" }, { id: "T1499", tactic: "Impact",          technique: "Endpoint DoS",               color: "#dc2626" }],
  "Memory Corruption": [{ id: "T1203", tactic: "Execution", technique: "Exploitation for Client Exec",color: "#06b6d4"}, { id: "T1055", tactic: "Defense Evasion","technique": "Process Injection",        color: "#0891b2" }],
  "Zero-Click":   [{ id: "T1566", tactic: "Initial Access", technique: "Phishing",                  color: "#10b981" }, { id: "T1204", tactic: "Execution",       technique: "User Execution",             color: "#059669" }],
  "default":      [{ id: "T1210", tactic: "Lateral Movement","technique": "Exploit Remote Services", color: "#6366f1"}, { id: "T1588", tactic: "Resource Dev",    technique: "Obtain Capabilities",       color: "#4f46e5" }],
};

// Attack origin coordinates [lat, lon] for globe visualization
const ATTACK_ORIGINS: [number, number][] = [
  [55.75, 37.61],  // Moscow
  [39.91, 116.39], // Beijing
  [35.68, 139.69], // Tokyo
  [51.50, -0.12],  // London
  [48.85, 2.35],   // Paris
  [40.71, -74.00], // New York
  [37.56, 126.97], // Seoul
  [28.61, 77.20],  // Delhi
  [-23.55, -46.63],// São Paulo
  [24.89, 46.67],  // Riyadh
  [1.35, 103.82],  // Singapore
  [52.37, 4.89],   // Amsterdam
];

function AttackGlobe3D({ attacks }: { attacks: [number, number][] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 6;

    function latLonToXY(lat: number, lon: number, rotY: number): { x: number; y: number; z: number } {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + rotY) * (Math.PI / 180);
      return {
        x: cx + R * Math.sin(phi) * Math.cos(theta),
        y: cy - R * Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta),
      };
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);
      const rotY = t * 12; // degrees per second

      // Globe sphere
      const gGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      gGrad.addColorStop(0, "rgba(20,30,50,0.9)");
      gGrad.addColorStop(0.6, "rgba(8,12,20,0.95)");
      gGrad.addColorStop(1, "rgba(0,0,0,0.7)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = gGrad; ctx.fill();

      // Grid lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lon = 0; lon <= 360; lon += 5) {
          const p = latLonToXY(lat, lon, rotY);
          if (p.z > 0) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else { first = true; }
        }
        ctx.strokeStyle = "rgba(0,229,255,0.06)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath(); let first = true;
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = latLonToXY(lat, lon, rotY);
          if (p.z > 0) {
            if (first) { ctx.moveTo(p.x, p.y); first = false; }
            else ctx.lineTo(p.x, p.y);
          } else { first = true; }
        }
        ctx.strokeStyle = "rgba(0,229,255,0.04)"; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Attack origin dots
      attacks.forEach((origin, i) => {
        const p = latLonToXY(origin[0], origin[1], rotY);
        if (p.z <= 0.1) return;
        const pulse = 0.5 + Math.sin(t * 3 + i * 1.1) * 0.5;
        const r = 2.5 + pulse * 2;
        // Glow
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${0.06 * pulse})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${0.7 + pulse * 0.3})`; ctx.fill();
        // Line to center of globe
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cx, cy);
        ctx.strokeStyle = `rgba(226,18,39,${0.04 * pulse})`; ctx.lineWidth = 0.5; ctx.stroke();
      });

      // Globe rim highlight
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.12)"; ctx.lineWidth = 1; ctx.stroke();

      // Highlight
      const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 0, cx - R * 0.4, cy - R * 0.4, R * 0.6);
      hi.addColorStop(0, "rgba(255,255,255,0.06)");
      hi.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = hi; ctx.fill();
    }

    function loop() {
      tRef.current += 0.016;
      draw(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [attacks]);

  return <canvas ref={cvRef} width={140} height={140} style={{ width: 140, height: 140, display: "block", borderRadius: "50%" }} />;
}

const BASE_CVES: CVEEntry[] = [
  { id: "CVE-2024-3094", title: "XZ Utils Backdoor", cvss: 10.0, vendor: "Tukaani", product: "xz-utils 5.6.0/5.6.1", type: "Backdoor", published: "2024-03-29", zeroday: true, description: "Supply chain backdoor in XZ Utils compression library affecting sshd via systemd on multiple Linux distros. Remote code execution as root." },
  { id: "CVE-2024-21762", title: "Fortinet SSL-VPN RCE", cvss: 9.8, vendor: "Fortinet", product: "FortiOS", type: "RCE", published: "2024-02-08", zeroday: true, description: "Out-of-bound write vulnerability in FortiOS/FortiProxy SSL-VPN. Allows unauthenticated RCE via crafted HTTP requests." },
  { id: "CVE-2023-44487", title: "HTTP/2 Rapid Reset", cvss: 7.5, vendor: "Multiple", product: "HTTP/2 Servers", type: "DDoS", published: "2023-10-10", zeroday: false, description: "Novel HTTP/2 rapid reset DDoS technique exploiting stream cancellation. Caused record-breaking DDoS attacks against cloud providers." },
  { id: "CVE-2023-4863", title: "WebP Heap Buffer Overflow", cvss: 8.8, vendor: "Google", product: "Chrome/WebP libwebp", type: "Memory Corruption", published: "2023-09-11", zeroday: true, description: "Heap buffer overflow in WebP decoder. Exploited in the wild. Affects all browsers using libwebp including Chrome, Firefox, Safari." },
  { id: "CVE-2024-1709", title: "ConnectWise ScreenConnect Auth Bypass", cvss: 10.0, vendor: "ConnectWise", product: "ScreenConnect", type: "Auth Bypass", published: "2024-02-19", zeroday: true, description: "Authentication bypass using alternate path allows full system compromise. CISA emergency directive issued. Actively exploited." },
  { id: "CVE-2023-36884", title: "Office/Windows HTML RCE", cvss: 8.3, vendor: "Microsoft", product: "Windows/Office", type: "RCE", published: "2023-07-11", zeroday: true, description: "Windows Search remote code execution via Office documents. Exploited by STORM-0978 (Russian threat actor) against NATO summit attendees." },
  { id: "CVE-2024-6387", title: "OpenSSH regreSSHion", cvss: 8.1, vendor: "OpenSSH", product: "sshd < 9.8p1", type: "RCE", published: "2024-07-01", zeroday: false, description: "Signal handler race condition in OpenSSH sshd daemon. Unauthenticated RCE as root on glibc-based Linux systems. Regression of CVE-2006-5051." },
  { id: "CVE-2024-4577", title: "PHP CGI Windows RCE", cvss: 9.8, vendor: "PHP Group", product: "PHP 8.x (Windows)", type: "RCE", published: "2024-06-06", zeroday: true, description: "Argument injection vulnerability in PHP CGI mode on Windows. Unauthenticated RCE. Bypasses CVE-2012-1823 patch via Windows codepage handling." },
  { id: "CVE-2023-23397", title: "Outlook Zero-Click RCE", cvss: 9.8, vendor: "Microsoft", product: "Microsoft Outlook", type: "Zero-Click", published: "2023-03-14", zeroday: true, description: "Net-NTLMv2 hash theft via specially crafted email. No user interaction required. Exploited by APT28 (Russia GRU) against European targets." },
  { id: "CVE-2024-27198", title: "JetBrains TeamCity Auth Bypass", cvss: 9.8, vendor: "JetBrains", product: "TeamCity < 2023.11.4", type: "Auth Bypass", published: "2024-03-04", zeroday: false, description: "Authentication bypass allowing complete server takeover. Used by North Korean Lazarus Group and ALPHV ransomware operators for initial access." },
];

function cvssColor(s: number) {
  if (s >= 9) return "#ff2222";
  if (s >= 7) return "#f97316";
  if (s >= 4) return "#fbbf24";
  return "#4ade80";
}

export function LiveCVEModal({ open, onOpenChange }: Props) {
  const [feed, setFeed] = useState<CVEEntry[]>(BASE_CVES);
  const [selected, setSelected] = useState<CVEEntry | null>(null);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [filterZero, setFilterZero] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [chainCVE, setChainCVE] = useState<CVEEntry | null>(null);
  const [chainOpen, setChainOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      const randIdx = Math.floor(Math.random() * BASE_CVES.length);
      const mutated = { ...BASE_CVES[randIdx], published: new Date().toISOString().split("T")[0], zeroday: Math.random() > 0.7 };
      setFeed(prev => [mutated, ...prev.slice(0, 19)]);
      setLastUpdate(new Date());
    }, 8000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [simLog]);

  function simulateCVE(cve: CVEEntry) {
    setSimLog([]); setSimRunning(true);
    const lines = [
      `[*] Loading CVE simulation: ${cve.id}`,
      `[*] Vulnerability: ${cve.title}`,
      `[*] CVSS Score: ${cve.cvss} (${cve.cvss >= 9 ? "CRITICAL" : cve.cvss >= 7 ? "HIGH" : "MEDIUM"})`,
      `[>] Fetching PoC code from exploit-db...`,
      `[+] PoC found: ${cve.id.replace("CVE-", "exploit-")}.py`,
      `[>] Setting up isolated sandbox environment...`,
      `[+] Container spawned: vuln-sim-${cve.id.toLowerCase().replace(/-/g, "_")}`,
      `[>] Configuring vulnerable ${cve.product} instance...`,
      `[+] Target service running on 127.0.0.1:8443`,
      `[>] Launching exploit simulation: ${cve.type}...`,
      `[>] ${cve.description.split(".")[0]}...`,
      `[+] Exploit payload delivered successfully`,
      `[!] ${cve.cvss >= 9 ? "CRITICAL" : "HIGH"}: System compromise simulated`,
      `[+] Impact assessment: ${cve.vendor} ${cve.product} COMPROMISED`,
      `[>] Generating remediation report...`,
      `[+] Mitigation: Apply vendor patch immediately`,
      `[+] Workaround: ${cve.type === "RCE" ? "Disable service or add WAF rule" : "Update to latest version"}`,
      `[!] Simulation complete — environment destroyed`,
    ];
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= lines.length) { clearInterval(timerRef.current!); setSimRunning(false); return; }
      setSimLog(prev => [...prev, lines[i++]]);
    }, 350);
  }

  const displayFeed = filterZero ? feed.filter(c => c.zeroday) : feed;

  if (!open) return null;
  return (
    <>
    {chainCVE && (
      <ExploitChainModal
        open={chainOpen}
        onOpenChange={(v) => { setChainOpen(v); if (!v) setChainCVE(null); }}
        initialCVE={{ id: chainCVE.id, title: chainCVE.title, cvss: chainCVE.cvss, type: chainCVE.type, product: chainCVE.product }}
      />
    )}
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#141414", background: "linear-gradient(135deg,rgba(226,18,39,0.04),rgba(0,229,255,0.02))" }}>
            <div className="flex items-center gap-4">
              {/* 3D Attack Globe */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <AttackGlobe3D attacks={ATTACK_ORIGINS} />
                <div style={{
                  position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.35)",
                  borderRadius: 4, padding: "1px 6px",
                  fontSize: 8, fontWeight: 700, fontFamily: "monospace", color: "#e21227",
                  whiteSpace: "nowrap",
                }}>LIVE THREATS</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}>
                    <Radio className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                    <motion.div className="absolute inset-0 rounded-lg" style={{ border: "1px solid rgba(226,18,39,0.5)" }} animate={{ scale: [1, 1.4], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-widest" style={{ color: "#e21227" }}>LIVE CVE INTELLIGENCE FEED</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: "#333" }}>Zero-Day Monitor · NVD · MITRE ATT&CK · Simulation Engine</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {["TA0001","TA0003","TA0005","TA0006","TA0040"].map((ta, i) => (
                    <div key={ta} style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                      background: `rgba(${[226,249,245,251,239][i]},${[18,115,158,191,68][i]},${[39,22,11,36,68][i]},0.12)`,
                      border: `1px solid rgba(${[226,249,245,251,239][i]},${[18,115,158,191,68][i]},${[39,22,11,36,68][i]},0.3)`,
                      color: ["#e21227","#f59e0b","#a78bfa","#fbbf24","#ef4444"][i] }}>
                      {ta}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFilterZero(!filterZero)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                style={{ background: filterZero ? "rgba(226,18,39,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filterZero ? "rgba(226,18,39,0.4)" : "#1a1a1a"}`, color: filterZero ? "#e21227" : "#444" }}>
                <AlertTriangle className="w-3 h-3" /> ZERO-DAY ONLY
              </button>
              <div className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>Updated {lastUpdate.toLocaleTimeString()}</div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {displayFeed.map((cve, i) => (
                <motion.button key={`${cve.id}-${i}`} onClick={() => setSelected(cve)}
                  className="w-full flex items-start gap-3 px-4 py-3 border-b text-left hover:bg-white/2 transition-all"
                  style={{ borderColor: "#0d0d0d", background: selected?.id === cve.id ? "rgba(226,18,39,0.04)" : "transparent" }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-6 rounded flex items-center justify-center text-[9px] font-bold"
                      style={{ background: `${cvssColor(cve.cvss)}18`, border: `1px solid ${cvssColor(cve.cvss)}44`, color: cvssColor(cve.cvss) }}>
                      {cve.cvss}
                    </div>
                    {cve.zeroday && <div className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>0DAY</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold font-mono" style={{ color: cvssColor(cve.cvss) }}>{cve.id}</span>
                      <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#444" }}>{cve.type}</span>
                    </div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#ccc" }}>{cve.title}</div>
                    <div className="text-[9px] truncate" style={{ color: "#333" }}>{cve.vendor} · {cve.product}</div>
                  </div>
                  <div className="text-[9px] font-mono flex-shrink-0" style={{ color: "#2a2a2a" }}>{cve.published}</div>
                </motion.button>
              ))}
            </div>

            <div className="w-80 border-l flex flex-col" style={{ borderColor: "#111" }}>
              {selected ? (
                <>
                  <div className="p-4 border-b" style={{ borderColor: "#111" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold font-mono" style={{ color: cvssColor(selected.cvss) }}>{selected.id}</span>
                      {selected.zeroday && <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(226,18,39,0.15)", color: "#e21227" }}>ZERO-DAY</span>}
                      <div className="ml-auto px-2 py-0.5 rounded font-bold text-[10px]" style={{ background: `${cvssColor(selected.cvss)}18`, color: cvssColor(selected.cvss) }}>{selected.cvss}</div>
                    </div>
                    <div className="text-sm font-bold mb-2" style={{ color: "#eee" }}>{selected.title}</div>
                    <div className="text-[10px] leading-relaxed mb-3" style={{ color: "#555" }}>{selected.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono mb-3">
                      {[["Vendor", selected.vendor], ["Product", selected.product], ["Type", selected.type], ["Published", selected.published]].map(([k, v]) => (
                        <div key={k as string}><div style={{ color: "#2a2a2a" }}>{k}</div><div style={{ color: "#666" }}>{v}</div></div>
                      ))}
                    </div>
                    {/* MITRE ATT&CK Correlation */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield className="w-3 h-3" style={{ color: "#00e5ff" }} />
                        <span className="text-[9px] font-bold tracking-widest" style={{ color: "#00e5ff" }}>MITRE ATT&CK</span>
                      </div>
                      <div className="space-y-1">
                        {(MITRE_TACTICS[selected.type] ?? MITRE_TACTICS["default"]).map(m => (
                          <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                            style={{ background: `${m.color}08`, border: `1px solid ${m.color}25` }}>
                            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded"
                              style={{ background: `${m.color}18`, color: m.color }}>{m.id}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[8px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{m.technique}</div>
                              <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{m.tactic}</div>
                            </div>
                            <Target className="w-2.5 h-2.5 flex-shrink-0" style={{ color: m.color, opacity: 0.6 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button onClick={() => simulateCVE(selected)} disabled={simRunning} whileTap={{ scale: 0.97 }}
                        className="flex-1 py-2 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                        style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)", color: "#e21227" }}>
                        <Play className="w-3.5 h-3.5" />{simRunning ? "SIMULATING..." : "SIMULATE"}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setChainCVE(selected); setChainOpen(true); }}
                        className="flex-1 py-2 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                        style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.38)", color: "#a855f7" }}>
                        <Zap className="w-3.5 h-3.5" /> CHAIN EXPLOIT
                      </motion.button>
                    </div>
                  </div>
                  <div ref={logRef} className="flex-1 overflow-y-auto p-3 font-mono text-[9px] space-y-0.5" style={{ background: "#030303", minHeight: 0 }}>
                    {simLog.map((l, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ color: l.startsWith("[!]") ? "#e21227" : l.startsWith("[+]") ? "#4ade80" : l.startsWith("[>]") ? "#00e5ff" : "#333" }}>
                        {l}
                      </motion.div>
                    ))}
                    {simRunning && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ color: "#e21227" }}>█</motion.span>}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" style={{ color: "#1a1a1a" }}>
                  <div className="text-center"><AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" /><div className="text-xs">Select CVE to simulate</div></div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
