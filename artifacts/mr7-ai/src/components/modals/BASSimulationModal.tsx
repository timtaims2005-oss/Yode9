import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Play, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SCENARIOS = [
  { id: "ransomware", label: "Ransomware Attack", color: "#e21227", icon: "🔐", desc: "Simulate a full ransomware kill chain: phishing → lateral movement → encryption" },
  { id: "apt", label: "APT Nation-State", color: "#a855f7", icon: "🕵️", desc: "Advanced persistent threat — silent infiltration, long-term dwell, data exfil" },
  { id: "insider", label: "Insider Threat", color: "#f97316", icon: "👤", desc: "Legitimate user credential abuse, privilege escalation, data theft" },
  { id: "supply", label: "Supply Chain Attack", color: "#fbbf24", icon: "📦", desc: "Compromise via third-party vendor, software update poisoning" },
  { id: "ddos", label: "Layer 7 DDoS", color: "#00e5ff", icon: "🌊", desc: "Application-layer DDoS targeting API endpoints and login forms" },
  { id: "zerotrust", label: "Zero-Trust Bypass", color: "#4ade80", icon: "🔓", desc: "Attempt to bypass ZTNA, MFA fatigue attack, token hijack" },
];

interface Phase {
  name: string; status: "pending" | "running" | "passed" | "failed"; score: number; desc: string;
}

function buildPhases(scenarioId: string): Phase[] {
  const base: Record<string, Phase[]> = {
    ransomware: [
      { name: "Phishing Email Delivery", status: "pending", score: 0, desc: "Sending crafted email with malicious attachment" },
      { name: "User Opens Attachment", status: "pending", score: 0, desc: "Testing user awareness and email filtering" },
      { name: "Macro Execution", status: "pending", score: 0, desc: "PowerShell dropper execution attempt" },
      { name: "AV / EDR Evasion", status: "pending", score: 0, desc: "Testing endpoint detection capabilities" },
      { name: "Lateral Movement", status: "pending", score: 0, desc: "SMB spread via EternalBlue/ADMIN$ share" },
      { name: "Domain Controller Hit", status: "pending", score: 0, desc: "Targeting AD for GPO deployment" },
      { name: "Data Encryption", status: "pending", score: 0, desc: "Encrypting critical files and shadow copies" },
      { name: "Ransom Note Drop", status: "pending", score: 0, desc: "Final impact assessment" },
    ],
    apt: [
      { name: "Initial Access (Spear Phish)", status: "pending", score: 0, desc: "Highly targeted spear phishing to executive" },
      { name: "Establish Foothold", status: "pending", score: 0, desc: "Deploy RAT/implant, C2 beacon" },
      { name: "Discovery & Recon", status: "pending", score: 0, desc: "Internal network mapping, user enumeration" },
      { name: "Credential Harvesting", status: "pending", score: 0, desc: "Mimikatz, LSASS dump, Kerberoasting" },
      { name: "Persistence Mechanisms", status: "pending", score: 0, desc: "Registry runkeys, scheduled tasks, WMI" },
      { name: "Defense Evasion", status: "pending", score: 0, desc: "Log clearing, timestomping, AMSI bypass" },
      { name: "Data Staging", status: "pending", score: 0, desc: "Aggregating sensitive files for exfil" },
      { name: "Exfiltration", status: "pending", score: 0, desc: "DNS tunneling exfiltration test" },
    ],
  };
  return base[scenarioId] ?? base["ransomware"];
}

export function BASSimulationModal({ open, onOpenChange }: Props) {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function runSimulation() {
    const initial = buildPhases(scenario.id).map(p => ({ ...p }));
    setPhases(initial); setRunning(true); setComplete(false); setOverallScore(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= initial.length) {
        clearInterval(timerRef.current!); setRunning(false); setComplete(true);
        setPhases(prev => {
          const total = prev.reduce((a, p) => a + p.score, 0);
          setOverallScore(Math.round(total / prev.length));
          return prev;
        });
        return;
      }
      setPhases(prev => prev.map((p, idx) => {
        if (idx === i - 1) return { ...p, status: Math.random() > 0.35 ? "failed" : "passed", score: Math.floor(Math.random() * 40) + (Math.random() > 0.35 ? 60 : 20) };
        if (idx === i) return { ...p, status: "running" };
        return p;
      }));
      i++;
    }, 900);
  }

  const color = scenario.color;
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1100, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}33` }}>
                <Shield className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color }}>BREACH & ATTACK SIMULATION</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>BAS Framework · Defense Scoring · Real Attack Scenarios</div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-60 border-r flex flex-col p-3 gap-2 overflow-y-auto" style={{ borderColor: "#111" }}>
              <div className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "#333" }}>ATTACK SCENARIO</div>
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => { if (!running) { setScenario(s); setPhases([]); setComplete(false); } }}
                  className="flex items-start gap-2.5 p-3 rounded-xl text-left"
                  style={{ background: scenario.id === s.id ? `${s.color}0d` : "#0a0a0a", border: `1px solid ${scenario.id === s.id ? s.color + "33" : "#141414"}` }}>
                  <span className="text-base flex-shrink-0">{s.icon}</span>
                  <div>
                    <div className="text-[10px] font-bold" style={{ color: scenario.id === s.id ? s.color : "#3a3a3a" }}>{s.label}</div>
                    <div className="text-[8px] mt-0.5 leading-relaxed" style={{ color: "#222" }}>{s.desc}</div>
                  </div>
                </button>
              ))}
              <motion.button onClick={runSimulation} disabled={running} whileTap={{ scale: 0.97 }}
                className="mt-auto py-2.5 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                style={{ background: `${color}12`, border: `1px solid ${color}35`, color: running ? "#333" : color }}>
                <Play className="w-3.5 h-3.5" />{running ? "SIMULATING..." : "RUN SIMULATION"}
              </motion.button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#111" }}>
                <span className="text-xs font-bold" style={{ color: "#888" }}>{scenario.label} — Attack Chain</span>
                {complete && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: "#444" }}>Defense Score:</span>
                    <span className="text-lg font-bold font-mono" style={{ color: overallScore >= 70 ? "#4ade80" : overallScore >= 40 ? "#f97316" : "#e21227" }}>{overallScore}%</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid gap-3" style={{ minHeight: 0 }}>
                {phases.length === 0 && (
                  <div className="flex items-center justify-center h-48" style={{ color: "#1a1a1a" }}>
                    <div className="text-center"><Shield className="w-10 h-10 mx-auto mb-2 opacity-20" /><div className="text-sm">Select scenario and run simulation</div></div>
                  </div>
                )}
                {phases.map((ph, i) => (
                  <motion.div key={ph.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: ph.status === "running" ? `${color}08` : ph.status === "passed" ? "rgba(74,222,128,0.04)" : ph.status === "failed" ? "rgba(226,18,39,0.04)" : "#0a0a0a", border: `1px solid ${ph.status === "running" ? color + "33" : ph.status === "passed" ? "rgba(74,222,128,0.15)" : ph.status === "failed" ? "rgba(226,18,39,0.15)" : "#111"}` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: ph.status === "passed" ? "rgba(74,222,128,0.12)" : ph.status === "failed" ? "rgba(226,18,39,0.12)" : ph.status === "running" ? `${color}15` : "#111", border: `1px solid ${ph.status === "passed" ? "rgba(74,222,128,0.3)" : ph.status === "failed" ? "rgba(226,18,39,0.3)" : ph.status === "running" ? color + "44" : "#1a1a1a"}` }}>
                      {ph.status === "passed" && <CheckCircle className="w-4 h-4" style={{ color: "#4ade80" }} />}
                      {ph.status === "failed" && <AlertTriangle className="w-4 h-4" style={{ color: "#e21227" }} />}
                      {ph.status === "running" && <motion.div className="w-3 h-3 rounded-full" style={{ background: color }} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} />}
                      {ph.status === "pending" && <span className="text-[10px] font-mono" style={{ color: "#2a2a2a" }}>{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold mb-0.5" style={{ color: ph.status === "pending" ? "#2a2a2a" : "#aaa" }}>{ph.name}</div>
                      <div className="text-[9px]" style={{ color: "#2a2a2a" }}>{ph.desc}</div>
                    </div>
                    {ph.status === "passed" && <div className="text-right"><div className="text-[9px] font-mono" style={{ color: "#333" }}>Blocked</div><div className="text-sm font-bold" style={{ color: "#4ade80" }}>{ph.score}%</div></div>}
                    {ph.status === "failed" && <div className="text-right"><div className="text-[9px] font-mono" style={{ color: "#333" }}>Bypassed</div><div className="text-sm font-bold" style={{ color: "#e21227" }}>{ph.score}%</div></div>}
                    {ph.status === "running" && (
                      <div className="flex gap-0.5">{[0,1,2].map(d => (<motion.div key={d} className="w-1 h-1 rounded-full" style={{ background: color }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.2 }} />))}</div>
                    )}
                  </motion.div>
                ))}
                {complete && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl text-center"
                    style={{ background: overallScore >= 70 ? "rgba(74,222,128,0.06)" : "rgba(226,18,39,0.06)", border: `1px solid ${overallScore >= 70 ? "rgba(74,222,128,0.2)" : "rgba(226,18,39,0.2)"}` }}>
                    <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: overallScore >= 70 ? "#4ade80" : "#e21227" }} />
                    <div className="text-2xl font-bold mb-1" style={{ color: overallScore >= 70 ? "#4ade80" : "#e21227" }}>{overallScore}% Defense Score</div>
                    <div className="text-sm" style={{ color: "#555" }}>{overallScore >= 70 ? "Good defense posture — minor gaps found" : overallScore >= 40 ? "Moderate risk — multiple bypass points" : "Critical gaps — immediate hardening required"}</div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
