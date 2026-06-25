import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface LogLine {
  id: number; time: string; level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "CRIT";
  source: string; message: string;
}

const LEVEL_COLOR: Record<LogLine["level"], string> = {
  INFO: "#10b981", WARN: "#f59e0b", ERROR: "#e21227",
  DEBUG: "#a78bfa", CRIT: "#ff4444",
};

const SOURCES = ["THREAT-ENGINE","AI-CORE","NET-SCANNER","AUTH-MOD","FIREWALL","IDS","SOC","VULN-DB","CRYPTO-LIB"];
const MESSAGES = [
  "Scanning network segment 10.0.1.0/24 for active hosts...",
  "AI model inference complete: anomaly score 0.87",
  "Blocked outbound connection to 185.220.101.45 (known C2)",
  "CVE-2024-1234 signature matched on host WS-03",
  "TLS handshake failed — cipher downgrade attempt detected",
  "Auth token refreshed for user session [hashed:a3f7]",
  "Deep packet inspection: 4.2MB suspicious payload fragmented",
  "Neural threat oracle: APT campaign signature detected",
  "Port scan detected from 192.168.1.100 — 1,247 ports/sec",
  "Quarantine initiated for process 'svchost.exe' PID=4421",
  "SSH brute force: 847 attempts blocked in last 60s",
  "Malware sandbox analysis complete: RATING=HIGH",
  "Firewall rule updated: DROP 0.0.0.0/0 → 10.0.0.0/8:22",
  "Database backup integrity verified: SHA256 match",
  "Zero-day exploit attempt blocked via behavioral analysis",
  "Threat intel feed updated: 2,847 new IOCs ingested",
  "AI-assisted triage: 3 critical alerts require immediate action",
  "Network baseline recalibrated — 14 anomalies flagged",
];

let _lineId = 0;
function makeLine(): LogLine {
  const levels: LogLine["level"][] = ["INFO","INFO","INFO","DEBUG","WARN","WARN","ERROR","CRIT"];
  return {
    id: _lineId++,
    time: new Date().toTimeString().slice(0,8),
    level: levels[Math.floor(Math.random() * levels.length)],
    source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
    message: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
  };
}

interface Props { maxLines?: number; className?: string; }

export function CyberTerminalStream({ maxLines = 80, className = "" }: Props) {
  const [lines, setLines] = useState<LogLine[]>(() =>
    Array.from({length:12}, makeLine)
  );
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<LogLine["level"] | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      const count = Math.random() > 0.7 ? 2 : 1;
      const newLines = Array.from({length:count}, makeLine);
      setLines(prev => [...prev, ...newLines].slice(-maxLines));
    }, 600 + Math.random() * 900);
    return () => clearInterval(iv);
  }, [paused, maxLines]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, paused]);

  const visible = lines.filter(l =>
    (filter === "ALL" || l.level === filter) &&
    (!search || l.message.toLowerCase().includes(search.toLowerCase()) ||
     l.source.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`flex flex-col h-full font-mono ${className}`}
      style={{ background:"rgba(0,0,0,0.6)" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" style={{animation:"pulse 1s infinite"}} />
          <span className="text-[10px] text-red-400 font-bold tracking-wider">LIVE FEED</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-gray-300 placeholder:text-gray-700 outline-none focus:border-red-900/50"
        />
        <select value={filter} onChange={e=>setFilter(e.target.value as LogLine["level"]|"ALL")}
          className="bg-black border border-white/10 rounded px-1 py-0.5 text-[9px] text-gray-400 outline-none">
          <option value="ALL">ALL</option>
          {(["CRIT","ERROR","WARN","INFO","DEBUG"] as const).map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button onClick={()=>setPaused(p=>!p)}
          className="text-[9px] px-2 py-0.5 rounded border transition-colors"
          style={{ borderColor: paused ? "#10b981" : "rgba(255,255,255,0.1)",
            color: paused ? "#10b981" : "#6b7280" }}>
          {paused ? "▶ RESUME" : "⏸ PAUSE"}
        </button>
        <span className="text-[9px] text-gray-700">{lines.length} lines</span>
      </div>

      <div ref={containerRef}
        className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5"
        style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(226,18,39,0.2) transparent" }}>
        {visible.map(line => (
          <motion.div key={line.id} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}}
            className="flex items-start gap-1.5 text-[9px] leading-relaxed group hover:bg-white/3 rounded px-1">
            <span className="text-gray-700 flex-shrink-0 mt-px">{line.time}</span>
            <span className="flex-shrink-0 w-9 text-right font-bold mt-px"
              style={{color:LEVEL_COLOR[line.level]}}>{line.level}</span>
            <span className="flex-shrink-0 text-gray-600 w-20 truncate mt-px">[{line.source}]</span>
            <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{line.message}</span>
          </motion.div>
        ))}
        {visible.length === 0 && (
          <div className="text-center text-gray-700 text-[9px] py-8">No entries match filter</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
