import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, AlertTriangle, Shield, ChevronDown, ChevronUp,
  Activity, Eye, Radio, Zap, Lock, Skull, Server, Wifi,
  RefreshCw, ExternalLink, Bug, Database, Terminal,
} from "lucide-react";

type ThreatEntry = {
  id: string;
  type: "CVE" | "BREACH" | "APT" | "LEAK" | "MALWARE" | "DARKNET" | "RANSOMWARE" | "BOTNET";
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  time: string;
  source: string;
  cvss?: number;
  fresh?: boolean;
};

const THREAT_POOL: Omit<ThreatEntry, "id" | "time" | "fresh">[] = [
  { type: "CVE",       title: "CVE-2026-1337 — OpenSSL 3.x RCE via TLS handshake",     severity: "CRITICAL", source: "NVD",          cvss: 9.8 },
  { type: "CVE",       title: "CVE-2026-8821 — Linux kernel io_uring privilege esc",    severity: "CRITICAL", source: "NVD",          cvss: 9.6 },
  { type: "CVE",       title: "CVE-2026-5511 — Windows CLFS driver use-after-free",    severity: "CRITICAL", source: "MSFT",         cvss: 9.6 },
  { type: "CVE",       title: "CVE-2026-3344 — Chrome renderer exploit chain",          severity: "CRITICAL", source: "Google",       cvss: 9.2 },
  { type: "BREACH",    title: "Fortune 500 HR DB leaked — 2.4M employee records",       severity: "CRITICAL", source: "IntelFeed"     },
  { type: "BREACH",    title: "Major bank credential dump — 800K accounts on RAMP",     severity: "CRITICAL", source: "DarkFeed"      },
  { type: "APT",       title: "APT-41 active — defence contractor spear-phishing wave", severity: "HIGH",     source: "Mandiant"      },
  { type: "APT",       title: "LAZARUS UEFI bootkit — new EDR evasion variant detected",severity: "CRITICAL", source: "ESET"          },
  { type: "APT",       title: "APT-29 device code flow OAuth abuse — cloud targets",    severity: "HIGH",     source: "CrowdStrike"   },
  { type: "APT",       title: "Volt Typhoon pre-positioning in US critical infra",      severity: "CRITICAL", source: "CISA"          },
  { type: "LEAK",      title: "Source code of major SaaS platform dumped on forums",    severity: "HIGH",     source: "BreachForum"   },
  { type: "LEAK",      title: "Government employee PII (340K) indexed on Telegram",     severity: "HIGH",     source: "TeleWatch"     },
  { type: "MALWARE",   title: "New Cobalt Strike BOF bypasses all EDR hooks in-memory", severity: "HIGH",     source: "VXUnderground" },
  { type: "MALWARE",   title: "AgentTesla v4 campaign targeting Middle East orgs",      severity: "HIGH",     source: "ANY.RUN"       },
  { type: "MALWARE",   title: "LummaStealer new C2 infra — 40K bots active",           severity: "HIGH",     source: "IntelFeed"     },
  { type: "DARKNET",   title: "RDP credentials for 12K enterprise hosts auctioned",     severity: "HIGH",     source: "DarkFeed"      },
  { type: "DARKNET",   title: "Zero-day for Palo Alto NGFW offered on XSS forum",      severity: "CRITICAL", source: "XSS.is"        },
  { type: "DARKNET",   title: "Healthcare records (5M patients) listed for $8K",        severity: "HIGH",     source: "RAMP"          },
  { type: "RANSOMWARE",title: "LockBit 4.0 claimed attack on logistics giant",         severity: "CRITICAL", source: "RansomFeed"    },
  { type: "RANSOMWARE",title: "Clop gang exploiting MOVEit zero-day (unpatched)",       severity: "CRITICAL", source: "BleepingComp"  },
  { type: "RANSOMWARE",title: "BlackCat affiliate targets healthcare — double extort",  severity: "CRITICAL", source: "IntelFeed"     },
  { type: "BOTNET",    title: "Mirai v3 variant scanning for exposed Docker sockets",   severity: "MEDIUM",   source: "Shodan"        },
  { type: "BOTNET",    title: "Emotet reactivated — spam campaign 2M emails/hr",       severity: "HIGH",     source: "CERT-EU"       },
  { type: "CVE",       title: "CVE-2026-2048 — VMware ESXi guest-to-host escape",      severity: "CRITICAL", source: "VMware",       cvss: 9.9 },
  { type: "CVE",       title: "CVE-2026-7722 — Apache Struts OGNL injection RCE",      severity: "CRITICAL", source: "Apache",       cvss: 9.8 },
  { type: "BREACH",    title: "Telco provider SS7 intercepted — 90K users affected",   severity: "HIGH",     source: "IntelFeed"     },
  { type: "MALWARE",   title: "XLoader macOS stealer disguised as productivity app",   severity: "MEDIUM",   source: "SentinelOne"   },
  { type: "DARKNET",   title: "AI-generated deepfake phishing kit listed for $200",    severity: "MEDIUM",   source: "DarkFeed"      },
];

const SEV_COLORS: Record<ThreatEntry["severity"], { color: string; bg: string; border: string }> = {
  CRITICAL: { color: "#e21227", bg: "rgba(226,18,39,0.1)",  border: "rgba(226,18,39,0.3)"  },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  MEDIUM:   { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  LOW:      { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
};

const TYPE_ICONS: Record<ThreatEntry["type"], typeof Globe> = {
  CVE: Bug, BREACH: Database, APT: Radio, LEAK: Eye, MALWARE: Skull,
  DARKNET: Globe, RANSOMWARE: Lock, BOTNET: Server,
};

const TYPE_COLORS: Record<ThreatEntry["type"], string> = {
  CVE: "#e21227", BREACH: "#f97316", APT: "#a78bfa", LEAK: "#fbbf24",
  MALWARE: "#94a3b8", DARKNET: "#10b981", RANSOMWARE: "#ec4899", BOTNET: "#22d3ee",
};

function makeEntry(idx: number): ThreatEntry {
  const tpl = THREAT_POOL[idx % THREAT_POOL.length];
  const mins = Math.floor(Math.random() * 59) + 1;
  return {
    ...tpl,
    id: `${Date.now()}-${idx}-${Math.random()}`,
    time: `${mins}m ago`,
    fresh: mins <= 5,
  };
}

export function DarkWebMonitor() {
  const [expanded, setExpanded] = useState(false);
  const [feeds, setFeeds] = useState<ThreatEntry[]>(() => {
    const shuffled = [...THREAT_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8).map((_, i) => makeEntry(i));
  });
  const [newAlert, setNewAlert] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [stats] = useState({ total: 2847 + Math.floor(Math.random() * 200), critical: 12, high: 31 });
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * THREAT_POOL.length);
      const entry = makeEntry(idx);
      setFeeds(prev => [entry, ...prev.slice(0, 9)]);
      setNewAlert(true);
      setPulse(true);
      setTimeout(() => setNewAlert(false), 3000);
      setTimeout(() => setPulse(false), 1500);
    }, 7000 + Math.random() * 8000);
    return () => clearInterval(id);
  }, []);

  const critical = feeds.filter(f => f.severity === "CRITICAL").length;
  const highCount = feeds.filter(f => f.severity === "HIGH").length;

  return (
    <div className="mx-2 mb-2">
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "rgba(10,0,5,0.9)",
          borderColor: newAlert ? "rgba(226,18,39,0.55)" : "rgba(226,18,39,0.2)",
          boxShadow: newAlert ? "0 0 16px rgba(226,18,39,0.25)" : "none",
          transition: "all 0.4s",
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full px-3 py-2 flex items-center gap-2"
        >
          <div className="relative flex-shrink-0">
            {pulse && (
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#e21227", opacity: 0.4 }} />
            )}
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.35)" }}>
              <Globe className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
            </div>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black tracking-widest" style={{ color: "#e21227" }}>DARK WEB MONITOR</span>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#10b981" }}
              />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[7px] font-mono" style={{ color: "rgba(226,18,39,0.5)" }}>
                {critical > 0 && <span style={{ color: "#e21227" }}>{critical} CRIT</span>}
                {highCount > 0 && <span style={{ color: "#f97316" }}> · {highCount} HIGH</span>}
                {" "}· {feeds.length} feeds
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {newAlert && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-[7px] font-black px-1 py-0.5 rounded font-mono"
                style={{ background: "rgba(226,18,39,0.2)", color: "#e21227" }}
              >
                NEW
              </motion.span>
            )}
            {expanded ? <ChevronUp className="w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} />}
          </div>
        </button>

        {/* Stats row (always visible) */}
        <div className="px-3 py-1.5 flex items-center gap-3 border-t" style={{ borderColor: "rgba(226,18,39,0.1)", background: "rgba(226,18,39,0.03)" }}>
          {[
            { label: "TOTAL THREATS", value: stats.total.toLocaleString(), color: "#e21227" },
            { label: "CRITICAL",      value: stats.critical,               color: "#e21227" },
            { label: "HIGH",          value: stats.high,                   color: "#f97316" },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center">
              <div className="text-[10px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feed list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div ref={feedRef} className="max-h-52 overflow-y-auto divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {feeds.map((f) => {
                    const Icon = TYPE_ICONS[f.type];
                    const sev = SEV_COLORS[f.severity];
                    const typeColor = TYPE_COLORS[f.type];
                    return (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, x: -8, backgroundColor: "rgba(226,18,39,0.12)" }}
                        animate={{ opacity: 1, x: 0, backgroundColor: "transparent" }}
                        transition={{ duration: 0.3 }}
                        className="px-2.5 py-1.5"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      >
                        <div className="flex items-start gap-1.5">
                          <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${typeColor}15` }}>
                            <Icon className="w-2.5 h-2.5" style={{ color: typeColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                              <span className="text-[7px] font-bold px-1 py-0.5 rounded font-mono"
                                style={{ background: sev.bg, borderColor: sev.border, color: sev.color, border: `1px solid ${sev.border}` }}>
                                {f.severity}
                              </span>
                              <span className="text-[7px] font-mono" style={{ color: typeColor }}>{f.type}</span>
                              {f.cvss && <span className="text-[7px] font-mono" style={{ color: sev.color }}>CVSS {f.cvss}</span>}
                              {f.fresh && <span className="text-[7px] font-black px-0.5 rounded" style={{ color: "#10b981" }}>NEW</span>}
                              <span className="ml-auto text-[6px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{f.time}</span>
                            </div>
                            <div className="text-[8px] leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>
                              {f.title}
                            </div>
                            <div className="text-[6px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
                              src: {f.source}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between border-t" style={{ borderColor: "rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.3)" }}>
                <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>Auto-refreshing · 7 sources</span>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1 text-[7px] font-mono" style={{ color: "#10b981" }}>
                  <Activity className="w-2.5 h-2.5" /> LIVE
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
