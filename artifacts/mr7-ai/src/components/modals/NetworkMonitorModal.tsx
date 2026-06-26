import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Wifi, Activity, Filter, Search, Play, Square, Trash2,
  Download, RefreshCw, Globe, Shield, AlertTriangle,
  ChevronDown, ChevronRight, Lock, Unlock, Zap,
  ArrowUp, ArrowDown, Clock, Database, Cpu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NetworkMonitorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Protocol = "TCP" | "UDP" | "HTTP" | "HTTPS" | "DNS" | "ICMP" | "SSH" | "FTP" | "SMTP" | "ARP";
type Flag = "SYN" | "ACK" | "FIN" | "RST" | "PSH" | "URG" | "SYN-ACK";

interface Packet {
  id: string;
  ts: number;
  src: string;
  srcPort: number;
  dst: string;
  dstPort: number;
  protocol: Protocol;
  size: number;
  flags: Flag[];
  ttl: number;
  payload?: string;
  suspicious: boolean;
  country?: string;
  service?: string;
}

const PROTO_COLORS: Record<Protocol, string> = {
  TCP:   "#3b82f6",
  UDP:   "#a78bfa",
  HTTP:  "#f59e0b",
  HTTPS: "#10b981",
  DNS:   "#06b6d4",
  ICMP:  "#f97316",
  SSH:   "#e21227",
  FTP:   "#84cc16",
  SMTP:  "#ec4899",
  ARP:   "#8b5cf6",
};

const SERVICES: Partial<Record<number, string>> = {
  22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP",
  110: "POP3", 143: "IMAP", 443: "HTTPS", 445: "SMB",
  3389: "RDP", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
  21: "FTP", 20: "FTP-Data", 3306: "MySQL", 5432: "PostgreSQL",
};

const IPS = [
  "10.0.0.1", "10.0.0.50", "10.0.0.101", "192.168.1.1", "192.168.1.254",
  "172.16.0.1", "8.8.8.8", "1.1.1.1", "185.220.101.47", "45.33.32.156",
  "104.18.2.161", "151.101.65.69", "13.107.42.14", "23.46.238.194",
];

const COUNTRIES = ["US", "DE", "NL", "RU", "CN", "GB", "FR", "SG", "JP", "BR"];

const PROTOCOLS: Protocol[] = ["TCP","UDP","HTTP","HTTPS","DNS","ICMP","SSH","FTP","SMTP","ARP"];
const FLAG_SETS: Flag[][] = [
  ["SYN"], ["SYN-ACK"], ["ACK"], ["PSH","ACK"], ["FIN","ACK"], ["RST"], ["ACK","PSH"],
];

function uid() { return Math.random().toString(36).slice(2, 10); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generatePacket(): Packet {
  const protocol = pick(PROTOCOLS);
  const dstPort = pick([22, 25, 53, 80, 110, 143, 443, 445, 3306, 3389, 8080, 8443]);
  const suspicious = Math.random() < 0.08;
  return {
    id: uid(),
    ts: Date.now(),
    src: pick(IPS),
    srcPort: randInt(1024, 65535),
    dst: pick(IPS),
    dstPort,
    protocol,
    size: randInt(40, 1500),
    flags: pick(FLAG_SETS),
    ttl: pick([32, 64, 128, 255]),
    payload: Math.random() > 0.6 ? `[${protocol}] ${Math.random().toString(36).slice(2, 18)}` : undefined,
    suspicious,
    country: pick(COUNTRIES),
    service: SERVICES[dstPort],
  };
}

function formatTs(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

interface Stats {
  total: number;
  totalBytes: number;
  pps: number;
  suspicious: number;
  byProtocol: Partial<Record<Protocol, number>>;
  topSrc: [string, number][];
  topDst: [string, number][];
}

export function NetworkMonitorModal({ open, onOpenChange }: NetworkMonitorModalProps) {
  const { toast } = useToast();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [selected, setSelected] = useState<Packet | null>(null);
  const [filterProto, setFilterProto] = useState<Protocol | "ALL">("ALL");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSuspicious, setFilterSuspicious] = useState(false);
  const [maxPackets] = useState(500);
  const [stats, setStats] = useState<Stats>({ total: 0, totalBytes: 0, pps: 0, suspicious: 0, byProtocol: {}, topSrc: [], topDst: [] });
  const [graphData, setGraphData] = useState<number[]>(Array(60).fill(0));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ppsRef = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const updateStats = useCallback((pkts: Packet[]) => {
    const byProto: Partial<Record<Protocol, number>> = {};
    const srcCount: Record<string, number> = {};
    const dstCount: Record<string, number> = {};
    let susp = 0;
    let bytes = 0;
    for (const p of pkts) {
      byProto[p.protocol] = (byProto[p.protocol] || 0) + 1;
      srcCount[p.src] = (srcCount[p.src] || 0) + 1;
      dstCount[p.dst] = (dstCount[p.dst] || 0) + 1;
      if (p.suspicious) susp++;
      bytes += p.size;
    }
    const topSrc = Object.entries(srcCount).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
    const topDst = Object.entries(dstCount).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][];
    setStats({ total: pkts.length, totalBytes: bytes, pps: ppsRef.current.slice(-1)[0] || 0, suspicious: susp, byProtocol: byProto, topSrc, topDst });
  }, []);

  useEffect(() => {
    if (!capturing) return;
    let tick = 0;
    timerRef.current = setInterval(() => {
      const batchSize = randInt(1, 8);
      const batch = Array.from({ length: batchSize }, generatePacket);
      ppsRef.current = [...ppsRef.current.slice(-59), batchSize];
      setGraphData(prev => [...prev.slice(-59), batchSize]);
      setPackets(prev => {
        const next = [...prev, ...batch].slice(-maxPackets);
        updateStats(next);
        return next;
      });
      tick++;
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [capturing, maxPackets, updateStats]);

  useEffect(() => {
    if (autoScroll && listRef.current && capturing) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [packets.length, autoScroll, capturing]);

  function toggleCapture() {
    if (capturing) {
      setCapturing(false);
      toast({ description: "Capture stopped." });
    } else {
      setCapturing(true);
      toast({ description: "Capture started." });
    }
  }

  function clearPackets() {
    setPackets([]);
    setSelected(null);
    setStats({ total: 0, totalBytes: 0, pps: 0, suspicious: 0, byProtocol: {}, topSrc: [], topDst: [] });
    setGraphData(Array(60).fill(0));
    ppsRef.current = [];
  }

  function exportPcap() {
    const csv = ["Timestamp,Source,SrcPort,Destination,DstPort,Protocol,Size,Flags,Suspicious",
      ...packets.map(p => `${formatTs(p.ts)},${p.src},${p.srcPort},${p.dst},${p.dstPort},${p.protocol},${p.size},"${p.flags.join("|")}",${p.suspicious}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "capture.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Exported capture as CSV." });
  }

  const filtered = packets.filter(p => {
    if (filterProto !== "ALL" && p.protocol !== filterProto) return false;
    if (filterSuspicious && !p.suspicious) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!p.src.includes(q) && !p.dst.includes(q) && !p.protocol.toLowerCase().includes(q) && !(p.service || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const maxGraph = Math.max(...graphData, 1);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 flex flex-col rounded-[18px] border overflow-hidden shadow-2xl"
        style={{ width: "min(1300px, 98vw)", height: "min(880px, 96vh)", background: "#080808", borderColor: "rgba(0,229,255,0.2)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0" style={{ borderColor: "rgba(0,229,255,0.12)", background: "#050505" }}>
          <motion.div animate={{ opacity: capturing ? [1, 0.4, 1] : 1 }} transition={{ duration: 0.8, repeat: Infinity }}
            className="w-2 h-2 rounded-full" style={{ background: capturing ? "#00e5ff" : "#333" }} />
          <Wifi className="w-4 h-4" style={{ color: "#00e5ff" }} />
          <span className="text-sm font-black tracking-wide text-white">NETWORK MONITOR</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(0,229,255,0.3)", color: "#00e5ff" }}>
            {capturing ? "LIVE CAPTURE" : "IDLE"}
          </span>

          {/* Live stats */}
          <div className="flex items-center gap-4 ml-2">
            {[
              { label: "PACKETS", val: stats.total.toLocaleString(), color: "#00e5ff" },
              { label: "BYTES", val: formatSize(stats.totalBytes), color: "#a78bfa" },
              { label: "PPS", val: stats.pps, color: "#10b981" },
              { label: "ALERTS", val: stats.suspicious, color: "#e21227" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-sm font-black font-mono leading-none" style={{ color: s.color }}>{s.val}</span>
                <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggleCapture}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={capturing
                ? { background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.35)", color: "#e21227" }
                : { background: "rgba(0,229,255,0.08)", borderColor: "rgba(0,229,255,0.3)", color: "#00e5ff" }}>
              {capturing ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Start</>}
            </button>
            <button onClick={clearPackets} className="w-7 h-7 rounded-lg flex items-center justify-center border hover:border-white/20 transition-colors" style={{ borderColor: "#222", color: "#666" }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={exportPcap} className="w-7 h-7 rounded-lg flex items-center justify-center border hover:border-white/20 transition-colors" style={{ borderColor: "#222", color: "#666" }}>
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Traffic graph */}
        <div className="px-4 pt-2 pb-0 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-end gap-0.5 h-10">
            {graphData.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm min-h-[1px] transition-all duration-200"
                style={{ height: `${Math.max(2, (v / maxGraph) * 40)}px`, background: v > 0 ? `rgba(0,229,255,${0.3 + 0.7 * (v / maxGraph)})` : "#111" }} />
            ))}
          </div>
          <div className="flex justify-between mt-0.5 mb-1.5">
            <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>60s ago</span>
            <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>now</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — packet list */}
          <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {/* Filters */}
            <div className="px-3 py-2 border-b flex items-center gap-2 shrink-0 flex-wrap" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="relative flex-1 min-w-32">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Filter IP / protocol..."
                  className="pl-7 pr-2 py-1 rounded-lg text-[10px] border outline-none w-full"
                  style={{ background: "#111", borderColor: "#1a1a1a", color: "#ddd" }} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(["ALL", ...PROTOCOLS] as const).map(p => (
                  <button key={p} onClick={() => setFilterProto(p as Protocol | "ALL")}
                    className="px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all"
                    style={filterProto === p
                      ? { background: `${PROTO_COLORS[p as Protocol] || "#555"}22`, color: PROTO_COLORS[p as Protocol] || "#fff", borderColor: `${PROTO_COLORS[p as Protocol] || "#555"}50` }
                      : { background: "transparent", color: "#444", borderColor: "#1a1a1a" }}>
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={() => setFilterSuspicious(v => !v)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                style={filterSuspicious
                  ? { background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.35)", color: "#e21227" }
                  : { background: "transparent", borderColor: "#1a1a1a", color: "#555" }}>
                <AlertTriangle className="w-2.5 h-2.5" /> Alerts
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{filtered.length} pkts</span>
                <button onClick={() => setAutoScroll(v => !v)}
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all"
                  style={autoScroll ? { borderColor: "#00e5ff44", color: "#00e5ff", background: "rgba(0,229,255,0.08)" } : { borderColor: "#222", color: "#444" }}>
                  AUTO
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="px-3 py-1.5 flex gap-2 text-[8px] font-black tracking-widest border-b shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", background: "#050505" }}>
              <span className="w-24 shrink-0">TIME</span>
              <span className="flex-1">SOURCE</span>
              <span className="flex-1">DESTINATION</span>
              <span className="w-16 shrink-0">PROTO</span>
              <span className="w-14 shrink-0">SIZE</span>
              <span className="w-20 shrink-0">FLAGS</span>
            </div>

            {/* Packets */}
            <div ref={listRef} className="flex-1 overflow-y-auto font-mono">
              {filtered.slice(-300).map(p => (
                <div key={p.id}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  className="px-3 py-1 flex gap-2 items-center cursor-pointer border-b transition-colors"
                  style={{
                    borderColor: "rgba(255,255,255,0.02)",
                    background: selected?.id === p.id ? "rgba(0,229,255,0.07)" : p.suspicious ? "rgba(226,18,39,0.04)" : "transparent",
                  }}>
                  <span className="text-[8px] w-24 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>{formatTs(p.ts)}</span>
                  <span className="text-[9px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {p.src}:{p.srcPort}
                  </span>
                  <span className="text-[9px] flex-1 truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {p.dst}:{p.dstPort} {p.service && <span style={{ color: "rgba(255,255,255,0.25)" }}>({p.service})</span>}
                  </span>
                  <span className="text-[8px] font-bold w-16 shrink-0" style={{ color: PROTO_COLORS[p.protocol] }}>
                    {p.protocol}
                  </span>
                  <span className="text-[8px] w-14 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{formatSize(p.size)}</span>
                  <div className="w-20 shrink-0 flex gap-0.5 flex-wrap">
                    {p.flags.map(f => (
                      <span key={f} className="text-[6px] font-black px-0.5 rounded"
                        style={{
                          background: f === "RST" ? "rgba(226,18,39,0.2)" : f === "SYN" ? "rgba(59,130,246,0.2)" : f === "ACK" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)",
                          color: f === "RST" ? "#e21227" : f === "SYN" ? "#3b82f6" : f === "ACK" ? "#10b981" : "rgba(255,255,255,0.4)",
                        }}>
                        {f}
                      </span>
                    ))}
                    {p.suspicious && <AlertTriangle className="w-2.5 h-2.5" style={{ color: "#e21227" }} />}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                  <Wifi className="w-8 h-8 mb-2" style={{ color: "#00e5ff" }} />
                  <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {capturing ? "Waiting for packets..." : "Start capture to monitor traffic"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 flex flex-col shrink-0">
            {/* Packet detail */}
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>PACKET DETAILS</span>
                    {selected.suspicious && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded border" style={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.35)", color: "#e21227" }}>
                        SUSPICIOUS
                      </span>
                    )}
                  </div>

                  {[
                    { label: "Timestamp", val: formatTs(selected.ts) },
                    { label: "Protocol", val: selected.protocol, color: PROTO_COLORS[selected.protocol] },
                    { label: "Source", val: `${selected.src}:${selected.srcPort}` },
                    { label: "Destination", val: `${selected.dst}:${selected.dstPort}` },
                    { label: "Service", val: selected.service || "Unknown" },
                    { label: "Size", val: `${selected.size} bytes` },
                    { label: "TTL", val: String(selected.ttl) },
                    { label: "Country", val: selected.country || "?" },
                    { label: "Flags", val: selected.flags.join(", ") || "None" },
                  ].map(row => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>{row.label}</span>
                      <span className="text-[10px] font-mono" style={{ color: row.color || "rgba(255,255,255,0.7)" }}>{row.val}</span>
                    </div>
                  ))}

                  {selected.payload && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>Payload</span>
                      <div className="rounded-lg p-2 font-mono text-[9px] break-all" style={{ background: "#0a0a0a", color: "#00e5ff" }}>
                        {selected.payload}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="text-center opacity-30">
                    <ChevronRight className="w-6 h-6 mx-auto mb-1" style={{ color: "#00e5ff" }} />
                    <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Select a packet</span>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Protocol breakdown */}
            <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="text-[8px] font-black tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>PROTOCOLS</div>
              <div className="flex flex-col gap-1.5">
                {Object.entries(stats.byProtocol).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([proto, count]) => {
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const col = PROTO_COLORS[proto as Protocol] || "#555";
                  return (
                    <div key={proto} className="flex items-center gap-2">
                      <span className="text-[8px] font-bold w-12 shrink-0" style={{ color: col }}>{proto}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }}
                          className="h-full rounded-full" style={{ background: col }} />
                      </div>
                      <span className="text-[8px] font-mono w-8 text-right shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top talkers */}
            <div className="p-3 flex-1 overflow-hidden">
              <div className="text-[8px] font-black tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>TOP SOURCES</div>
              <div className="flex flex-col gap-1">
                {stats.topSrc.slice(0, 5).map(([ip, count]) => (
                  <div key={ip} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{ip}</span>
                    <span className="text-[8px] font-bold" style={{ color: "#00e5ff" }}>{count}</span>
                  </div>
                ))}
                {stats.topSrc.length === 0 && (
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>No data</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
