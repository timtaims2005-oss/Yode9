import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThreatPrediction {
  id: string;
  threat: string;
  probability: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  vector: string;
  eta: string;
  confidence: number;
  indicators: string[];
}

const THREAT_POOL: ThreatPrediction[] = [
  { id:"t1", threat:"SQL Injection Campaign", probability:0.94, severity:"CRITICAL", vector:"WEB", eta:"< 2h", confidence:97, indicators:["Payload scanning","Auth bypass attempts","DB enumeration"] },
  { id:"t2", threat:"Zero-Day Exploit Chain", probability:0.78, severity:"CRITICAL", vector:"NET", eta:"< 6h", confidence:89, indicators:["Unknown CVE pattern","Kernel heap spray","ROP chain detected"] },
  { id:"t3", threat:"APT Lateral Movement", probability:0.86, severity:"HIGH", vector:"INT", eta:"< 1h", confidence:93, indicators:["Pass-the-hash","SMB relay","LDAP enum"] },
  { id:"t4", threat:"Ransomware Staging", probability:0.71, severity:"HIGH", vector:"EMAIL", eta:"< 12h", confidence:84, indicators:["Macro obfuscation","C2 beacon","Shadow copy deletion"] },
  { id:"t5", threat:"DNS Exfiltration", probability:0.65, severity:"MEDIUM", vector:"DNS", eta:"< 4h", confidence:79, indicators:["Long TXT records","High query freq","Encoded subdomains"] },
  { id:"t6", threat:"Credential Stuffing", probability:0.88, severity:"HIGH", vector:"API", eta:"< 30m", confidence:96, indicators:["Rate spike","IP rotation","Leaked combo lists"] },
  { id:"t7", threat:"Supply Chain Compromise", probability:0.55, severity:"CRITICAL", vector:"PKG", eta:"< 24h", confidence:72, indicators:["Typosquatting","Malicious dep","Build pipeline"] },
  { id:"t8", threat:"BGP Hijack Attempt", probability:0.42, severity:"HIGH", vector:"NET", eta:"< 8h", confidence:68, indicators:["Route leak","AS path anomaly","Prefix mismatch"] },
];

const SEV_COLORS = {
  CRITICAL: { bg:"rgba(226,18,39,0.15)", border:"#e21227", text:"#ff4d6a", glow:"rgba(226,18,39,0.6)" },
  HIGH:     { bg:"rgba(255,120,0,0.12)",  border:"#ff7800", text:"#ffa040", glow:"rgba(255,120,0,0.5)" },
  MEDIUM:   { bg:"rgba(255,220,0,0.1)",   border:"#ffd000", text:"#ffe040", glow:"rgba(255,200,0,0.4)" },
  LOW:      { bg:"rgba(0,229,255,0.08)",  border:"#00e5ff", text:"#40eeff", glow:"rgba(0,229,255,0.3)" },
};

function ProbabilityArc({ value, color }: { value: number; color: string }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ * value;
  return (
    <svg width={72} height={72} className="rotate-[-90deg]">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
      <circle
        cx={36} cy={36} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

export function QuantumThreatOracle() {
  const [threats, setThreats] = useState<ThreatPrediction[]>([]);
  const [selected, setSelected] = useState<ThreatPrediction | null>(null);
  const [scanning, setScanning] = useState(true);
  const [pulse, setPulse] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setScanning(true);
    setTimeout(() => {
      const shuffled = [...THREAT_POOL]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map(t => ({
          ...t,
          probability: Math.min(0.99, t.probability + (Math.random() - 0.5) * 0.08),
          confidence:  Math.min(99, Math.max(60, t.confidence + Math.floor((Math.random()-0.5)*6))),
        }))
        .sort((a, b) => b.probability - a.probability);
      setThreats(shuffled);
      setScanning(false);
    }, 1200);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 18000);
    const pulseInterval = setInterval(() => setPulse(p => (p + 1) % 100), 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(pulseInterval);
    };
  }, [refresh]);

  const globalRisk = threats.length
    ? threats.reduce((s, t) => s + t.probability, 0) / threats.length
    : 0;

  return (
    <div className="relative rounded-xl border border-red-900/40 bg-black/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(226,18,39,0.15), inset 0 0 60px rgba(0,0,0,0.5)" }}>

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_,i) => (
          <div key={i} className="absolute inset-0 rounded-xl border border-red-500/10"
            style={{ animation: `ping ${2 + i}s cubic-bezier(0,0,0.2,1) infinite`, animationDelay: `${i*0.6}s`, opacity: 0.3 }} />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-red-500"
              style={{ boxShadow: "0 0 8px #e21227", animation: "pulse 1s infinite" }} />
          </div>
          <span className="text-xs font-bold tracking-[0.15em] text-red-400">QUANTUM THREAT ORACLE</span>
          <span className="text-[10px] text-red-600/60 font-mono">v4.1-QUANTUM</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-gray-500 font-mono">GLOBAL RISK</div>
            <div className="text-sm font-bold font-mono"
              style={{ color: globalRisk > 0.7 ? "#e21227" : globalRisk > 0.4 ? "#ff7800" : "#00e5ff" }}>
              {scanning ? "SCAN..." : `${(globalRisk * 100).toFixed(1)}%`}
            </div>
          </div>
          <button onClick={refresh}
            className="text-[10px] px-2 py-1 rounded border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-colors font-mono">
            {scanning ? "⟳ SCAN" : "↺ RESCAN"}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <AnimatePresence>
          {scanning ? (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="relative w-16 h-16">
                {[...Array(3)].map((_,i) => (
                  <div key={i} className="absolute inset-0 rounded-full border border-red-500/40"
                    style={{ animation: `spin ${1.5 + i * 0.4}s linear infinite`, animationDirection: i % 2 ? "reverse" : "normal" }} />
                ))}
                <div className="absolute inset-3 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-red-400 text-xs font-mono">AI</span>
                </div>
              </div>
              <span className="text-xs text-red-400/70 font-mono animate-pulse">QUANTUM SCAN IN PROGRESS...</span>
            </motion.div>
          ) : (
            threats.map((t, idx) => {
              const sc = SEV_COLORS[t.severity];
              return (
                <motion.div key={t.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                  className="rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: sc.bg, borderColor: sc.border + "55",
                    boxShadow: selected?.id === t.id ? `0 0 16px ${sc.glow}` : "none" }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="relative w-[72px] h-[72px]">
                        <ProbabilityArc value={t.probability} color={sc.border} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-bold font-mono" style={{ color: sc.text }}>
                            {(t.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                          style={{ background: sc.border + "22", color: sc.text, border: `1px solid ${sc.border}44` }}>
                          {t.severity}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">[{t.vector}]</span>
                        <span className="text-[10px] text-gray-600 font-mono ml-auto">{t.eta}</span>
                      </div>
                      <div className="text-sm font-semibold text-white truncate">{t.threat}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-white/5">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${t.confidence}%`, background: sc.border,
                              boxShadow: `0 0 4px ${sc.glow}` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">{t.confidence}% conf</span>
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selected?.id === t.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="text-[10px] text-gray-500 font-mono mb-2">THREAT INDICATORS:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {t.indicators.map((ind, i) => (
                              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded"
                                style={{ background: sc.border + "15", color: sc.text, border: `1px solid ${sc.border}30` }}>
                                ◆ {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
