import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Target, Zap, Bug, AlertTriangle, CheckCheck,
  Play, Square, RefreshCw, ChevronRight, Eye, Crosshair,
  Network, Lock, Cpu, Activity, Globe, Search, FileText,
  Terminal, BarChart2, Clock, Layers, Swords, Brain,
} from "lucide-react";

const G = "#4ade80"; // strix green
const Gg = (n: number) => `rgba(74,222,128,${n})`;
const RED = "#e21227";

interface StrixModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "scan" | "findings" | "agents" | "reports";
type ScanStatus = "idle" | "running" | "done";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface Finding {
  id: string; title: string; severity: Severity; cve?: string;
  desc: string; file?: string; line?: number; exploitable: boolean;
  category: string; validated: boolean;
}

const SEV_COLOR: Record<Severity, string> = { CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#60a5fa", INFO: "#9ca3af" };

const SAMPLE_FINDINGS: Finding[] = [
  { id: "f1", title: "SQL Injection in /api/users", severity: "CRITICAL", cve: "CVE-2024-1234", desc: "Unsanitized user input passed directly to database query. Attackers can extract or delete all data.", file: "routes/users.py", line: 47, exploitable: true, category: "Injection", validated: true },
  { id: "f2", title: "JWT Algorithm Confusion", severity: "HIGH", desc: "JWT library accepts 'none' algorithm, allowing token forgery without a valid signature.", file: "auth/jwt.py", line: 23, exploitable: true, category: "Authentication", validated: true },
  { id: "f3", title: "Reflected XSS in Search", severity: "HIGH", cve: "CVE-2024-5678", desc: "User-controlled input rendered without sanitization in search results page.", file: "templates/search.html", line: 89, exploitable: true, category: "XSS", validated: true },
  { id: "f4", title: "Insecure Direct Object Reference", severity: "MEDIUM", desc: "API endpoints do not validate user authorization before returning resources.", file: "routes/api.py", line: 112, exploitable: false, category: "Authorization", validated: false },
  { id: "f5", title: "Outdated Dependency: requests 2.28.0", severity: "MEDIUM", cve: "CVE-2023-32681", desc: "Vulnerable to header injection attacks via crafted redirect targets.", file: "requirements.txt", line: 8, exploitable: false, category: "Dependencies", validated: false },
  { id: "f6", title: "Directory Listing Enabled", severity: "LOW", desc: "Web server exposes directory contents, revealing file structure and sensitive paths.", exploitable: false, category: "Misconfiguration", validated: false },
  { id: "f7", title: "Missing HSTS Header", severity: "INFO", desc: "HTTP Strict Transport Security header not set. Recommend adding max-age=31536000.", exploitable: false, category: "Headers", validated: false },
];

const AGENTS = [
  { name: "Recon Agent",     role: "Reconnaissance & OSINT",        status: "done",    findings: 3, icon: Eye,      color: "#60a5fa" },
  { name: "Spider Agent",    role: "Web Crawling & Asset Discovery", status: "done",    findings: 8, icon: Network,  color: "#a78bfa" },
  { name: "Exploit Agent",   role: "Vulnerability Exploitation",     status: "done",    findings: 5, icon: Swords,   color: RED },
  { name: "Validator Agent", role: "PoC Generation & Validation",    status: "running", findings: 2, icon: Target,   color: G },
  { name: "Report Agent",    role: "Findings Synthesis & Reporting", status: "idle",    findings: 0, icon: FileText, color: "#fbbf24" },
];

const SCAN_LOGS = [
  "[RECON] Starting reconnaissance on target…",
  "[RECON] Found 12 subdomains via DNS enumeration",
  "[SPIDER] Crawling 847 endpoints…",
  "[SPIDER] Discovered /api/users, /api/admin, /debug",
  "[EXPLOIT] Testing SQL injection vectors…",
  "[EXPLOIT] ✓ CONFIRMED: SQL injection in /api/users?id=",
  "[EXPLOIT] Testing JWT algorithm confusion…",
  "[EXPLOIT] ✓ CONFIRMED: JWT accepts 'none' algorithm",
  "[EXPLOIT] Testing XSS payloads in 23 input fields…",
  "[EXPLOIT] ✓ CONFIRMED: Reflected XSS in ?q= parameter",
  "[VALIDATOR] Generating working PoC for SQL injection…",
  "[VALIDATOR] ✓ PoC validated — database contents extracted",
  "[VALIDATOR] Generating PoC for JWT forgery…",
];

function PulseRing({ color, size = 60 }: { color: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {[1, 0.7, 0.4].map((s, i) => (
        <motion.div key={i} className="absolute rounded-full border" style={{ width: size * s, height: size * s, borderColor: color, opacity: 0.5 - i * 0.12 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
      ))}
      <div className="rounded-full flex items-center justify-center" style={{ width: size * 0.45, height: size * 0.45, background: `radial-gradient(circle, ${color}44, ${color}11)`, boxShadow: `0 0 ${size * 0.3}px ${color}66` }}>
        <Shield size={size * 0.22} style={{ color }} />
      </div>
    </div>
  );
}

export function StrixModal({ open, onOpenChange }: StrixModalProps) {
  const [tab, setTab] = useState<Tab>("scan");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("done");
  const [target, setTarget] = useState("https://example-app.com");
  const [logLines, setLogLines] = useState(SCAN_LOGS);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logLines]);

  const startScan = () => {
    setScanStatus("running");
    setLogLines([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < SCAN_LOGS.length) { setLogLines(l => [...l, SCAN_LOGS[i]]); i++; }
      else { clearInterval(interval); setScanStatus("done"); }
    }, 400);
  };

  if (!open) return null;

  const filtered = filter === "ALL" ? SAMPLE_FINDINGS : SAMPLE_FINDINGS.filter(f => f.severity === filter);
  const critCount = SAMPLE_FINDINGS.filter(f => f.severity === "CRITICAL").length;
  const highCount = SAMPLE_FINDINGS.filter(f => f.severity === "HIGH").length;

  const TabBtn = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof Shield }) => (
    <button onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all" style={{ background: tab === id ? Gg(0.14) : "rgba(255,255,255,0.03)", border: `1px solid ${tab === id ? Gg(0.45) : "rgba(255,255,255,0.07)"}`, color: tab === id ? G : "rgba(255,255,255,0.45)" }}>
      <Icon size={11} />{label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#020a04 0%,#030804 100%)", border: `1px solid ${Gg(0.2)}`, boxShadow: `0 0 80px ${Gg(0.1)}, 0 0 200px ${Gg(0.04)}` }} initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}>

          {/* Scan line */}
          <motion.div className="absolute inset-x-0 h-px z-20 pointer-events-none" style={{ background: `linear-gradient(90deg,transparent,${Gg(0.5)},transparent)` }} animate={{ top: ["0%","100%"] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Gg(0.12), background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <PulseRing color={G} size={40} />
              <div>
                <div className="text-sm font-black font-mono" style={{ color: G }}>STRIX</div>
                <div className="text-[10px] font-mono" style={{ color: "#333" }}>AI Autonomous Pentesting Agents</div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: scanStatus === "running" ? "rgba(251,191,36,0.1)" : Gg(0.08), border: `1px solid ${scanStatus === "running" ? "rgba(251,191,36,0.25)" : Gg(0.2)}`, color: scanStatus === "running" ? "#fbbf24" : G }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: scanStatus === "running" ? "#fbbf24" : G, animation: scanStatus === "running" ? "pulse 1s infinite" : "none" }} />
                {scanStatus === "running" ? "SCANNING" : scanStatus === "done" ? "SCAN COMPLETE" : "READY"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {scanStatus === "done" && (
                <div className="hidden sm:flex items-center gap-3 mr-3">
                  <div className="text-center"><div className="text-lg font-black font-mono" style={{ color: RED }}>{critCount}</div><div className="text-[8px] font-mono" style={{ color: "#444" }}>CRITICAL</div></div>
                  <div className="text-center"><div className="text-lg font-black font-mono" style={{ color: "#f97316" }}>{highCount}</div><div className="text-[8px] font-mono" style={{ color: "#444" }}>HIGH</div></div>
                  <div className="text-center"><div className="text-lg font-black font-mono" style={{ color: G }}>{SAMPLE_FINDINGS.length}</div><div className="text-[8px] font-mono" style={{ color: "#444" }}>TOTAL</div></div>
                </div>
              )}
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <X size={14} style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: Gg(0.07) }}>
            <TabBtn id="scan"     label="SCAN"     icon={Target}    />
            <TabBtn id="findings" label="FINDINGS" icon={Bug}       />
            <TabBtn id="agents"   label="AGENTS"   icon={Brain}     />
            <TabBtn id="reports"  label="REPORT"   icon={FileText}  />
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* ── SCAN ── */}
              {tab === "scan" && (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Gg(0.15)}` }}>
                      <Globe size={13} style={{ color: "#444" }} />
                      <input value={target} onChange={e => setTarget(e.target.value)} className="flex-1 bg-transparent outline-none text-xs font-mono text-gray-300" placeholder="https://target.com" />
                    </div>
                    <motion.button onClick={scanStatus === "running" ? () => setScanStatus("idle") : startScan} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black font-mono" style={{ background: scanStatus === "running" ? "rgba(226,18,39,0.15)" : Gg(0.15), border: `1px solid ${scanStatus === "running" ? "rgba(226,18,39,0.4)" : Gg(0.4)}`, color: scanStatus === "running" ? RED : G }}>
                      {scanStatus === "running" ? <><Square size={13} />STOP</> : <><Play size={13} />START SCAN</>}
                    </motion.button>
                  </div>

                  <div className="flex-1 rounded-xl overflow-hidden font-mono text-xs p-4 space-y-1" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${Gg(0.08)}` }}>
                    {logLines.map((line, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2">
                        <span style={{ color: line.includes("CONFIRMED") ? G : line.includes("EXPLOIT") ? "#f97316" : line.includes("VALIDATOR") ? "#60a5fa" : "#444" }}>›</span>
                        <span style={{ color: line.includes("CONFIRMED") ? G : "#666" }}>{line}</span>
                      </motion.div>
                    ))}
                    {scanStatus === "running" && <motion.div animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="flex items-center gap-2"><span style={{ color: G }}>›</span><span style={{ color: G }}>▌</span></motion.div>}
                    <div ref={logEndRef} />
                  </div>

                  {scanStatus === "done" && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "CRITICAL", val: critCount, color: RED },
                        { label: "HIGH",     val: highCount, color: "#f97316" },
                        { label: "VALIDATED", val: SAMPLE_FINDINGS.filter(f=>f.validated).length, color: G },
                        { label: "SCAN TIME", val: "4m 32s", color: "#60a5fa" },
                      ].map(s => (
                        <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22` }}>
                          <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.val}</div>
                          <div className="text-[9px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── FINDINGS ── */}
              {tab === "findings" && (
                <motion.div key="findings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full">
                  <div className="w-80 flex-shrink-0 flex flex-col border-r p-3 gap-2" style={{ borderColor: Gg(0.08) }}>
                    <div className="flex gap-1 flex-wrap">
                      {(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const).map(s => (
                        <button key={s} onClick={() => setFilter(s)} className="px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all" style={{ background: filter === s ? `${SEV_COLOR[s as Severity] ?? "#666"}22` : "rgba(255,255,255,0.03)", border: `1px solid ${filter === s ? (SEV_COLOR[s as Severity] ?? "#666") : "rgba(255,255,255,0.06)"}`, color: filter === s ? (SEV_COLOR[s as Severity] ?? "#ccc") : "#444" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5">
                      {filtered.map((f, i) => (
                        <motion.div key={f.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setSelectedFinding(f)} className="p-2.5 rounded-xl cursor-pointer transition-all" style={{ background: selectedFinding?.id === f.id ? `${SEV_COLOR[f.severity]}12` : "rgba(255,255,255,0.03)", border: `1px solid ${selectedFinding?.id === f.id ? SEV_COLOR[f.severity] + "40" : "rgba(255,255,255,0.06)"}` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded" style={{ background: SEV_COLOR[f.severity] + "22", color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                            {f.validated && <CheckCheck size={10} style={{ color: G }} />}
                          </div>
                          <div className="text-[11px] font-mono leading-tight" style={{ color: "#ccc" }}>{f.title}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedFinding ? (
                      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono" style={{ background: SEV_COLOR[selectedFinding.severity] + "20", color: SEV_COLOR[selectedFinding.severity] }}>{selectedFinding.severity}</span>
                          {selectedFinding.cve && <span className="px-2.5 py-1 rounded-lg text-xs font-mono" style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>{selectedFinding.cve}</span>}
                          {selectedFinding.exploitable && <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono animate-pulse" style={{ background: "rgba(226,18,39,0.12)", color: RED }}>⚡ EXPLOITABLE</span>}
                        </div>
                        <h3 className="text-base font-bold font-mono" style={{ color: "#eee" }}>{selectedFinding.title}</h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{selectedFinding.desc}</p>
                        {selectedFinding.file && (
                          <div className="flex items-center gap-2 p-3 rounded-xl font-mono text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <FileText size={13} style={{ color: "#444" }} />
                            <span style={{ color: G }}>{selectedFinding.file}</span>
                            {selectedFinding.line && <span style={{ color: "#444" }}>line {selectedFinding.line}</span>}
                          </div>
                        )}
                        <div className="p-3 rounded-xl" style={{ background: "rgba(74,222,128,0.05)", border: `1px solid ${Gg(0.12)}` }}>
                          <div className="text-[10px] font-mono font-bold mb-2" style={{ color: G }}>AI REMEDIATION</div>
                          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>Validate and sanitize all user-controlled input before use. Implement parameterized queries or prepared statements. Apply defense-in-depth with WAF rules and least-privilege database accounts.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <Bug size={32} style={{ color: "#222" }} />
                        <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Select a finding to view details</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── AGENTS ── */}
              {tab === "agents" && (
                <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-3">
                  {AGENTS.map((agent, i) => {
                    const Icon = agent.icon;
                    return (
                      <motion.div key={agent.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${agent.color}22` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
                            <Icon size={18} style={{ color: agent.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm" style={{ color: "#ddd" }}>{agent.name}</div>
                            <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.42)" }}>{agent.role}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black font-mono" style={{ color: agent.color }}>{agent.findings}</div>
                            <div className="text-[9px] font-mono" style={{ color: "#444" }}>FINDINGS</div>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold" style={{ background: agent.status === "done" ? Gg(0.08) : agent.status === "running" ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", color: agent.status === "done" ? G : agent.status === "running" ? "#fbbf24" : "#444" }}>
                            {agent.status === "running" && <RefreshCw size={9} className="inline mr-1 animate-spin" />}
                            {agent.status.toUpperCase()}
                          </div>
                        </div>
                        {agent.status === "running" && (
                          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <motion.div className="h-full rounded-full" style={{ background: "#fbbf24" }} animate={{ width: ["20%","80%","45%","90%"] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* ── REPORT ── */}
              {tab === "reports" && (
                <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-6 space-y-4 font-mono">
                  <div className="flex items-center justify-between">
                    <div><div className="text-base font-black" style={{ color: G }}>PENETRATION TEST REPORT</div><div className="text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>Target: {target} · {new Date().toLocaleDateString()}</div></div>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: Gg(0.1), border: `1px solid ${Gg(0.3)}`, color: G }}><FileText size={13} />EXPORT PDF</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: "RISK SCORE", val: "8.7/10", color: RED }, { label: "CRITICAL", val: critCount, color: RED }, { label: "HIGH", val: highCount, color: "#f97316" }, { label: "VALIDATED PoC", val: SAMPLE_FINDINGS.filter(f=>f.validated).length, color: G }].map(s => (
                      <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}22` }}>
                        <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-[9px] mt-1" style={{ color: "#444" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>EXECUTIVE SUMMARY</div>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>Strix autonomous AI agents identified {SAMPLE_FINDINGS.length} vulnerabilities including {critCount} critical and {highCount} high severity findings. {SAMPLE_FINDINGS.filter(f=>f.validated).length} vulnerabilities were confirmed with working proof-of-concept exploits. Immediate remediation of the SQL injection and JWT algorithm confusion vulnerabilities is strongly recommended.</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>VULNERABILITY SUMMARY</div>
                    {SAMPLE_FINDINGS.map(f => (
                      <div key={f.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: SEV_COLOR[f.severity] + "20", color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                        <span className="flex-1 text-xs" style={{ color: "#888" }}>{f.title}</span>
                        {f.validated && <CheckCheck size={12} style={{ color: G }} />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: Gg(0.08), background: "rgba(0,0,0,0.4)" }}>
            <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>strix v2.1 · 5 autonomous agents · Apache 2.0</div>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <Shield size={12} style={{ color: G }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
