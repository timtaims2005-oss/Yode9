import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, AlertTriangle, Globe, Activity, RefreshCw,
  ChevronDown, ChevronUp, Zap, Eye, Target, Radio,
  Bug, Database, Clock, TrendingUp, Copy, CheckCheck,
  Search, Filter, BarChart3, Crosshair, Wifi, Lock,
  ExternalLink, Play, Square, Brain,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

interface ThreatIntelModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tab = "cve" | "apt" | "campaigns" | "aianalysis";

type CveEntry = {
  id: string;
  description: string;
  cvss: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  vendor: string;
  published: string;
  vector: string;
};

type AptGroup = {
  name: string;
  alias: string[];
  origin: string;
  targets: string[];
  tactics: string[];
  lastActivity: string;
  color: string;
  threat: "CRITICAL" | "HIGH" | "MEDIUM";
  tools: string[];
  desc: string;
};

type Campaign = {
  id: string;
  name: string;
  actor: string;
  status: "ACTIVE" | "MONITORING" | "CONTAINED";
  targets: string[];
  vector: string;
  firstSeen: string;
  iocs: string[];
  desc: string;
  color: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#e21227",
  HIGH: "#f97316",
  MEDIUM: "#fbbf24",
  LOW: "#22d3ee",
};

const STATIC_CVES: CveEntry[] = [
  { id: "CVE-2024-3400", description: "PAN-OS GlobalProtect OS command injection — unauthenticated RCE via crafted cookie.", cvss: 10.0, severity: "CRITICAL", vendor: "Palo Alto Networks", published: "2024-04-12", vector: "NETWORK" },
  { id: "CVE-2024-21762", description: "Fortinet FortiOS out-of-bounds write — remote code execution without authentication.", cvss: 9.6, severity: "CRITICAL", vendor: "Fortinet", published: "2024-02-08", vector: "NETWORK" },
  { id: "CVE-2024-1709", description: "ConnectWise ScreenConnect auth bypass via path traversal — full admin access.", cvss: 10.0, severity: "CRITICAL", vendor: "ConnectWise", published: "2024-02-19", vector: "NETWORK" },
  { id: "CVE-2024-20353", description: "Cisco ASA denial of service via malformed HTTP packets — persistent crash loop.", cvss: 8.6, severity: "HIGH", vendor: "Cisco", published: "2024-04-24", vector: "NETWORK" },
  { id: "CVE-2024-29988", description: "Microsoft SmartScreen bypass — Mark of the Web filter evasion for malicious files.", cvss: 8.8, severity: "HIGH", vendor: "Microsoft", published: "2024-04-09", vector: "LOCAL" },
  { id: "CVE-2024-4577", description: "PHP CGI argument injection on Windows — unauthenticated RCE via URL encoding trick.", cvss: 9.8, severity: "CRITICAL", vendor: "PHP Group", published: "2024-06-06", vector: "NETWORK" },
  { id: "CVE-2024-38112", description: "Windows MSHTML platform spoofing — attacker-controlled navigation via MHTML handler.", cvss: 7.5, severity: "HIGH", vendor: "Microsoft", published: "2024-07-09", vector: "LOCAL" },
  { id: "CVE-2024-30088", description: "Windows Kernel elevation of privilege — race condition in NtQueryInformationToken.", cvss: 7.0, severity: "HIGH", vendor: "Microsoft", published: "2024-06-11", vector: "LOCAL" },
  { id: "CVE-2024-23692", description: "Rejetto HTTP File Server template injection — unauthenticated RCE via search parameter.", cvss: 9.8, severity: "CRITICAL", vendor: "Rejetto", published: "2024-05-31", vector: "NETWORK" },
  { id: "CVE-2024-5806", description: "MOVEit Transfer SFTP authentication bypass — impersonation of any valid user.", cvss: 9.1, severity: "CRITICAL", vendor: "Progress Software", published: "2024-06-25", vector: "NETWORK" },
  { id: "CVE-2024-27198", description: "JetBrains TeamCity auth bypass — full admin access via alternative paths.", cvss: 9.8, severity: "CRITICAL", vendor: "JetBrains", published: "2024-03-04", vector: "NETWORK" },
  { id: "CVE-2024-6387", description: "OpenSSH regreSSHion — unauthenticated RCE in glibc Linux via race condition in SIGALRM.", cvss: 8.1, severity: "HIGH", vendor: "OpenSSH", published: "2024-07-01", vector: "NETWORK" },
];

const APT_GROUPS: AptGroup[] = [
  {
    name: "APT29", alias: ["Cozy Bear", "Midnight Blizzard", "NOBELIUM"], origin: "Russia",
    targets: ["Government", "Defense", "Think Tanks", "Healthcare"],
    tactics: ["Spear-phishing", "Supply Chain", "Cloud Abuse", "OAuth Tokens"],
    lastActivity: "2024-12", color: "#e21227", threat: "CRITICAL",
    tools: ["SUNBURST", "BEACON", "TEARDROP", "WellMess"],
    desc: "Russian SVR intelligence linked to SolarWinds supply chain attack. Focuses on long-term persistent access and intelligence collection.",
  },
  {
    name: "APT41", alias: ["Double Dragon", "Winnti", "BARIUM"], origin: "China",
    targets: ["Technology", "Healthcare", "Gaming", "Telecom", "Finance"],
    tactics: ["Supply Chain", "Zero-Days", "Ransomware-as-Cover", "Living-off-the-Land"],
    lastActivity: "2024-11", color: "#fbbf24", threat: "CRITICAL",
    tools: ["DUSTPAN", "DUSTTRAP", "LATRODECTUS", "KEYPLUG"],
    desc: "Chinese MSS contractors conducting both state-sponsored espionage and financially motivated intrusions simultaneously.",
  },
  {
    name: "Lazarus Group", alias: ["Hidden Cobra", "APT38", "ZINC"], origin: "North Korea",
    targets: ["Cryptocurrency", "Banks", "Defense", "Aerospace"],
    tactics: ["Watering Hole", "LinkedIn Lures", "DeFi Heists", "Zero-Day Chains"],
    lastActivity: "2024-12", color: "#a78bfa", threat: "CRITICAL",
    tools: ["BLINDINGCAN", "COPPERHEDGE", "MANUSCRYPT", "AppleJeus"],
    desc: "DPRK Bureau 121 — primarily funds regime via cryptocurrency theft. Responsible for $3B+ in crypto heists.",
  },
  {
    name: "APT28", alias: ["Fancy Bear", "Sandworm", "Forest Blizzard"], origin: "Russia",
    targets: ["Military", "Government", "NATO", "Election Infrastructure"],
    tactics: ["Credential Theft", "Spear-phishing", "VPN Exploitation", "Wi-Fi Relay"],
    lastActivity: "2024-12", color: "#f97316", threat: "CRITICAL",
    tools: ["X-Agent", "SOURFACE", "CHOPSTICK", "Zebrocy"],
    desc: "Russian GRU Unit 26165. Operates offensive cyber alongside kinetic warfare in Ukraine. Known for destructive wiper attacks.",
  },
  {
    name: "Scattered Spider", alias: ["UNC3944", "Roasted 0ktapus", "Starfraud"], origin: "Western Anglophone",
    targets: ["Hospitality", "Telecom", "Retail", "Finance"],
    tactics: ["SIM Swapping", "MFA Fatigue", "Help Desk Social Engineering", "Cloud Pivoting"],
    lastActivity: "2024-11", color: "#00e5cc", threat: "HIGH",
    tools: ["RansomHub", "ALPHV", "Custom Phishing Kits", "Okta MFA Bypass"],
    desc: "English-speaking threat actors operating via Telegram. Specialize in social engineering IT help desks to gain initial access.",
  },
  {
    name: "Volt Typhoon", alias: ["Bronze Silhouette", "Vanguard Panda"], origin: "China",
    targets: ["US Critical Infrastructure", "Guam", "Military Logistics"],
    tactics: ["Living-off-the-Land", "SOHO Router Compromise", "KV Botnet", "Zero Malware"],
    lastActivity: "2024-12", color: "#22d3ee", threat: "CRITICAL",
    tools: ["No custom malware — LOLBins only", "WMIC", "Netsh", "PsExec"],
    desc: "PRC-linked pre-positioning inside US critical infrastructure for potential disruption. Prioritizes stealth over speed.",
  },
];

const CAMPAIGNS: Campaign[] = [
  {
    id: "C-2024-001", name: "Operation MidnightEclipse", actor: "APT29",
    status: "ACTIVE", targets: ["European Government Portals", "NATO Agencies"],
    vector: "OAuth Token Theft via Microsoft Teams phishing", firstSeen: "2024-09-01",
    iocs: ["45.142.212.100", "update-service[.]org", "b3a7f1c2d4e5f6g7.exe"],
    desc: "Persistent campaign targeting European diplomatic entities via compromised Microsoft 365 OAuth tokens.",
    color: "#e21227",
  },
  {
    id: "C-2024-002", name: "DeFi Sweep 2024", actor: "Lazarus Group",
    status: "ACTIVE", targets: ["DeFi Protocols", "Crypto Exchanges", "Bridge Contracts"],
    vector: "Malicious npm packages distributed via LinkedIn job offers", firstSeen: "2024-06-15",
    iocs: ["crypto-wallet-lib@1.2.3", "web3-utils-extended", "198.51.100.44"],
    desc: "Ongoing campaign targeting Web3 developers with trojanized npm packages. $450M+ stolen in 2024.",
    color: "#a78bfa",
  },
  {
    id: "C-2024-003", name: "Stormcloud Infrastructure", actor: "Volt Typhoon",
    status: "MONITORING", targets: ["US Water Systems", "Power Grid SCADA", "Port Logistics"],
    vector: "Compromised Cisco/Netgear SOHO routers as KV-Botnet proxies", firstSeen: "2023-11-20",
    iocs: ["185.220.101.47", "203.0.113.88", "Compromised SOHO devices"],
    desc: "Pre-positioned access in 23 US critical infrastructure sectors. No destructive activity yet — assessed as contingency staging.",
    color: "#22d3ee",
  },
  {
    id: "C-2024-004", name: "Scattered Hospitality", actor: "Scattered Spider",
    status: "MONITORING", targets: ["MGM Resorts", "Caesars", "Hotel Chains"],
    vector: "Okta MFA fatigue + help desk social engineering", firstSeen: "2024-03-10",
    iocs: ["help-desk-[company]-support[.]com", "Okta push bombing", "SIM swap events"],
    desc: "Ongoing campaign against hospitality sector. Monetizes via ransomware deployment after persistent cloud access.",
    color: "#00e5cc",
  },
  {
    id: "C-2024-005", name: "TechSiphon", actor: "APT41",
    status: "ACTIVE", targets: ["Semiconductor Firms", "AI Research Labs", "Defense Contractors"],
    vector: "Zero-day in enterprise VPN + supply chain compromise", firstSeen: "2024-08-20",
    iocs: ["api-update[.]tech", "cdn-delivery[.]net", "dlls with timestomped metadata"],
    desc: "IP theft campaign targeting cutting-edge AI and semiconductor research. Using DUSTPAN loader with DUSTTRAP implant.",
    color: "#fbbf24",
  },
];

function SeverityBadge({ sev }: { sev: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-bold font-mono"
      style={{ background: `${SEVERITY_COLOR[sev]}22`, color: SEVERITY_COLOR[sev], border: `1px solid ${SEVERITY_COLOR[sev]}44` }}
    >
      {sev}
    </span>
  );
}

function CvssBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 9 ? "#e21227" : score >= 7 ? "#f97316" : score >= 4 ? "#fbbf24" : "#22d3ee";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold font-mono" style={{ color }}>{score.toFixed(1)}</span>
    </div>
  );
}

function CveTab() {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM">("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = STATIC_CVES.filter((c) => {
    if (filter !== "ALL" && c.severity !== filter) return false;
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.vendor.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "#1f1f1f" }}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#444" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CVE / vendor / description…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[11px] outline-none bg-transparent border"
            style={{ borderColor: "#262626", color: "#aaa" }}
          />
        </div>
        <div className="flex gap-1">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded text-[9px] font-bold font-mono border transition-all"
              style={{
                background: filter === f ? (f === "ALL" ? "rgba(226,18,39,0.15)" : `${SEVERITY_COLOR[f]}22`) : "transparent",
                borderColor: filter === f ? (f === "ALL" ? "rgba(226,18,39,0.4)" : `${SEVERITY_COLOR[f]}55`) : "#262626",
                color: filter === f ? (f === "ALL" ? "#e21227" : SEVERITY_COLOR[f]) : "#555",
              }}
            >{f}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((cve) => (
          <div key={cve.id} className="border-b transition-colors" style={{ borderColor: "#1a1a1a" }}>
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
              onClick={() => setExpanded(expanded === cve.id ? null : cve.id)}
            >
              <div className="flex-shrink-0 w-1 self-stretch rounded-full mt-1" style={{ background: SEVERITY_COLOR[cve.severity] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold font-mono" style={{ color: "#e21227" }}>{cve.id}</span>
                  <SeverityBadge sev={cve.severity} />
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#666" }}>{cve.vendor}</span>
                  <span className="text-[9px] font-mono" style={{ color: "#444" }}>{cve.published}</span>
                </div>
                <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: "#888" }}>{cve.description}</p>
                <div className="mt-1.5 w-48">
                  <CvssBar score={cve.cvss} />
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: "#2a2a2a", color: "#555" }}>{cve.vector}</span>
                {expanded === cve.id ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
              </div>
            </div>
            <AnimatePresence>
              {expanded === cve.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 ml-4 pl-4 border-l" style={{ borderColor: `${SEVERITY_COLOR[cve.severity]}33` }}>
                    <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#aaa" }}>{cve.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono" style={{ color: "#555" }}>CVSS: {cve.cvss} · {cve.vector} · {cve.vendor} · {cve.published}</span>
                      <button
                        onClick={() => copy(cve.id, cve.id)}
                        className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border transition-colors"
                        style={{ borderColor: "#2a2a2a", color: copied === cve.id ? "#00e5cc" : "#555" }}
                      >
                        {copied === cve.id ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copied === cve.id ? "Copied" : "Copy ID"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-t text-[9px] font-mono" style={{ borderColor: "#1a1a1a", color: "#444" }}>
        <span>{filtered.length} CVEs shown · Updated Jul 2024</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e5cc" }} />LIVE FEED</span>
      </div>
    </div>
  );
}

function AptTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1f1f1f" }}>
        <div className="text-[10px] font-mono" style={{ color: "#555" }}>Tracking {APT_GROUPS.length} active threat actor groups</div>
        <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color: "#00e5cc" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e5cc" }} />
          LIVE TRACKING
        </div>
      </div>
      {APT_GROUPS.map((apt) => (
        <div key={apt.name} className="border-b" style={{ borderColor: "#1a1a1a" }}>
          <div
            className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
            onClick={() => setExpanded(expanded === apt.name ? null : apt.name)}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black font-mono"
              style={{ background: `${apt.color}15`, border: `1px solid ${apt.color}44`, color: apt.color }}>
              {apt.name.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-bold" style={{ color: apt.color }}>{apt.name}</span>
                <SeverityBadge sev={apt.threat} />
                <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#666" }}>{apt.origin}</span>
              </div>
              <p className="text-[9px] font-mono mt-0.5" style={{ color: "#555" }}>
                {apt.alias.slice(0, 3).join(" · ")}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {apt.targets.slice(0, 3).map((t) => (
                  <span key={t} className="text-[8px] px-1.5 py-0.5 rounded border" style={{ borderColor: "#2a2a2a", color: "#666" }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <span className="text-[8px] font-mono" style={{ color: "#444" }}>LAST SEEN</span>
              <span className="text-[9px] font-mono" style={{ color: apt.color }}>{apt.lastActivity}</span>
              {expanded === apt.name ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}
            </div>
          </div>
          <AnimatePresence>
            {expanded === apt.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 ml-11 border-l space-y-3" style={{ borderColor: `${apt.color}33` }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#999" }}>{apt.desc}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[8px] font-bold font-mono mb-1.5" style={{ color: "#555" }}>TACTICS (TTPs)</div>
                      <div className="space-y-0.5">
                        {apt.tactics.map((t) => (
                          <div key={t} className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: apt.color }} />
                            <span className="text-[10px]" style={{ color: "#888" }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold font-mono mb-1.5" style={{ color: "#555" }}>KNOWN TOOLS</div>
                      <div className="space-y-0.5">
                        {apt.tools.map((t) => (
                          <div key={t} className="text-[10px] font-mono" style={{ color: "#777" }}>{t}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold font-mono mb-1.5" style={{ color: "#555" }}>ALL ALIASES</div>
                    <div className="flex flex-wrap gap-1">
                      {apt.alias.map((a) => (
                        <span key={a} className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: `${apt.color}11`, color: apt.color, border: `1px solid ${apt.color}33` }}>{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function CampaignsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const statusColor: Record<string, string> = {
    ACTIVE: "#e21227", MONITORING: "#fbbf24", CONTAINED: "#22d3ee",
  };

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1f1f1f" }}>
        <div className="flex items-center gap-3">
          {(["ACTIVE", "MONITORING", "CONTAINED"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: statusColor[s] }} />
              <span className="text-[9px] font-mono" style={{ color: statusColor[s] }}>{s}</span>
              <span className="text-[9px] font-mono" style={{ color: "#444" }}>
                {CAMPAIGNS.filter((c) => c.status === s).length}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[9px] font-mono" style={{ color: "#444" }}>Threat Campaign Feed · {new Date().toLocaleDateString()}</div>
      </div>
      {CAMPAIGNS.map((camp) => (
        <div key={camp.id} className="border-b" style={{ borderColor: "#1a1a1a" }}>
          <div
            className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
            onClick={() => setExpanded(expanded === camp.id ? null : camp.id)}
          >
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: statusColor[camp.status], boxShadow: camp.status === "ACTIVE" ? `0 0 6px ${statusColor[camp.status]}` : "none" }} />
                <span className="text-[9px] font-bold font-mono" style={{ color: statusColor[camp.status] }}>{camp.status}</span>
              </div>
              <span className="text-[8px] font-mono" style={{ color: "#444" }}>{camp.id}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold" style={{ color: camp.color }}>{camp.name}</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${camp.color}15`, color: camp.color }}>{camp.actor}</span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#777" }}>{camp.vector}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {camp.targets.map((t) => (
                  <span key={t} className="text-[8px] px-1.5 py-0.5 rounded border" style={{ borderColor: "#2a2a2a", color: "#666" }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 text-[8px] font-mono" style={{ color: "#444" }}>
              <div>First seen</div>
              <div style={{ color: "#666" }}>{camp.firstSeen}</div>
              <div className="mt-1">{expanded === camp.id ? <ChevronUp className="w-3 h-3 text-zinc-600" /> : <ChevronDown className="w-3 h-3 text-zinc-600" />}</div>
            </div>
          </div>
          <AnimatePresence>
            {expanded === camp.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 ml-4 pl-4 border-l space-y-3" style={{ borderColor: `${camp.color}33` }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#999" }}>{camp.desc}</p>
                  <div>
                    <div className="text-[8px] font-bold font-mono mb-1.5" style={{ color: "#555" }}>INDICATORS OF COMPROMISE (IOCs)</div>
                    <div className="space-y-1">
                      {camp.iocs.map((ioc) => (
                        <div key={ioc} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1f1f1f" }}>
                          <span className="text-[10px] font-mono" style={{ color: "#888" }}>{ioc}</span>
                          <button onClick={() => copy(ioc, ioc)} className="text-[8px] flex items-center gap-1" style={{ color: copied === ioc ? "#00e5cc" : "#444" }}>
                            {copied === ioc ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

type AnalysisType = "threat_summary" | "cve_brief" | "apt_profile" | "ioc_hunt" | "defense_brief" | "sector_risk";

const ANALYSIS_PROMPTS: Record<AnalysisType, { label: string; icon: typeof Shield; color: string; prompt: string }> = {
  threat_summary: {
    label: "Global Threat Summary", icon: Globe, color: "#e21227",
    prompt: "You are a senior threat intelligence analyst. Provide a concise, professional global cybersecurity threat landscape briefing for today. Cover: (1) Most critical active threats and threat actors, (2) Top vulnerability classes being exploited in the wild, (3) Trending attack vectors, (4) Key sectors under attack. Be specific, use real CVE IDs and APT group names. Format with clear sections.",
  },
  cve_brief: {
    label: "Critical CVE Briefing", icon: Bug, color: "#f97316",
    prompt: "You are a vulnerability analyst. Provide a detailed briefing on the most critical CVEs currently being actively exploited in the wild. For each CVE: include the ID, affected product, CVSS score, exploitation method, impact, and recommended immediate mitigations. Focus on CVEs with active exploitation evidence. Be precise and actionable.",
  },
  apt_profile: {
    label: "APT Activity Report", icon: Target, color: "#a78bfa",
    prompt: "You are a threat intelligence analyst specializing in advanced persistent threats. Provide a comprehensive report on current APT group activity. Cover: active campaigns, targeting patterns, new TTPs observed, tools and malware families in use, and attribution confidence levels. Include APT29, APT41, Lazarus Group, Scattered Spider, Volt Typhoon and other active groups. Use MITRE ATT&CK framework references.",
  },
  ioc_hunt: {
    label: "IOC Threat Hunt Guide", icon: Crosshair, color: "#fbbf24",
    prompt: "You are a threat hunter. Provide a practical IOC (Indicator of Compromise) hunting guide based on the latest threat intelligence. Include: network IOCs (domains, IPs, protocols), host-based IOCs (file hashes, registry keys, process names), behavioral IOCs (LOLBIN usage, lateral movement patterns), and specific detection queries in Sigma format or KQL where possible. Focus on currently active campaigns.",
  },
  defense_brief: {
    label: "Defensive Countermeasures", icon: Shield, color: "#00e5cc",
    prompt: "You are a defensive security architect. Based on the current threat landscape, provide a prioritized list of defensive countermeasures and hardening steps. Cover: (1) Critical patches needed immediately, (2) Network segmentation priorities, (3) Identity security (MFA, PAM), (4) Detection rules to deploy (EDR/SIEM), (5) Threat hunting queries, (6) Security awareness priorities. Be specific and actionable.",
  },
  sector_risk: {
    label: "Sector Risk Assessment", icon: BarChart3, color: "#22d3ee",
    prompt: "You are a cyber risk analyst. Provide a sector-by-sector risk assessment of the current threat landscape. Rate each sector's risk level and explain why. Sectors: Government, Healthcare, Finance, Energy/Utilities, Technology, Defense, Education, Critical Infrastructure. For each: current threat actors targeting them, recent incidents, most relevant CVEs, and top recommended controls.",
  },
};

function AIAnalysisTab() {
  const { state } = useStore();
  const [selectedType, setSelectedType] = useState<AnalysisType>("threat_summary");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  async function runAnalysis() {
    if (running) {
      abortRef.current?.abort();
      setRunning(false);
      return;
    }
    setOutput("");
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    const cfg = ANALYSIS_PROMPTS[selectedType];
    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: state.settings.language,
          memory: [],
          messages: [{ role: "user", content: cfg.prompt }],
          mode: "chat",
        },
        (chunk) => {
          setOutput((p) => p + chunk);
          setTimeout(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" }); }, 50);
        },
        ac.signal,
      );
      setLastRun(new Date());
    } catch {
      /* aborted or error */
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b" style={{ borderColor: "#1f1f1f" }}>
        <div className="text-[9px] font-bold font-mono mb-2" style={{ color: "#555" }}>SELECT ANALYSIS TYPE</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.entries(ANALYSIS_PROMPTS) as [AnalysisType, typeof ANALYSIS_PROMPTS[AnalysisType]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = selectedType === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className="flex flex-col items-start gap-1 px-2.5 py-2 rounded-lg text-left border transition-all"
                style={{
                  background: active ? `${cfg.color}12` : "transparent",
                  borderColor: active ? `${cfg.color}55` : "#1f1f1f",
                }}
              >
                <Icon className="w-3 h-3" style={{ color: active ? cfg.color : "#555" }} />
                <span className="text-[9px] font-bold leading-tight" style={{ color: active ? cfg.color : "#555" }}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#1f1f1f" }}>
        <div className="text-[9px] font-mono" style={{ color: "#444" }}>
          {lastRun ? `Last run: ${lastRun.toLocaleTimeString()}` : "Ready to analyze"}
        </div>
        <button
          onClick={runAnalysis}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
          style={{
            background: running ? "rgba(226,18,39,0.12)" : `${ANALYSIS_PROMPTS[selectedType].color}12`,
            borderColor: running ? "rgba(226,18,39,0.4)" : `${ANALYSIS_PROMPTS[selectedType].color}44`,
            color: running ? "#e21227" : ANALYSIS_PROMPTS[selectedType].color,
          }}
        >
          {running ? <><Square className="w-3 h-3" />Stop</> : <><Play className="w-3 h-3" />Run Analysis</>}
        </button>
      </div>

      <div ref={outputRef} className="flex-1 overflow-y-auto p-4">
        {output ? (
          <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#c8c8c8", fontFamily: "inherit" }}>
            {output}
            {running && <span className="inline-block w-1 h-3 ml-0.5 animate-pulse" style={{ background: ANALYSIS_PROMPTS[selectedType].color }} />}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${ANALYSIS_PROMPTS[selectedType].color}15`, border: `1px solid ${ANALYSIS_PROMPTS[selectedType].color}33` }}>
              {(() => { const Icon = ANALYSIS_PROMPTS[selectedType].icon; return <Icon className="w-6 h-6" style={{ color: ANALYSIS_PROMPTS[selectedType].color }} />; })()}
            </div>
            <div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: "#888" }}>{ANALYSIS_PROMPTS[selectedType].label}</div>
              <div className="text-[10px]" style={{ color: "#444" }}>Click Run Analysis to generate a live AI-powered intelligence brief</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats header ──────────────────────────────────────────────────────────────

const STATS = [
  { label: "Critical CVEs", value: STATIC_CVES.filter((c) => c.severity === "CRITICAL").length.toString(), color: "#e21227", icon: Bug },
  { label: "Active Campaigns", value: CAMPAIGNS.filter((c) => c.status === "ACTIVE").length.toString(), color: "#f97316", icon: Radio },
  { label: "APT Groups", value: APT_GROUPS.length.toString(), color: "#a78bfa", icon: Target },
  { label: "Threat Score", value: "9.4", color: "#fbbf24", icon: TrendingUp },
];

export function ThreatIntelModal({ open, onOpenChange }: ThreatIntelModalProps) {
  const [tab, setTab] = useState<Tab>("cve");

  const TABS: { id: Tab; label: string; icon: typeof Shield; color: string }[] = [
    { id: "cve", label: "CVE Feed", icon: Bug, color: "#f97316" },
    { id: "apt", label: "APT Groups", icon: Target, color: "#a78bfa" },
    { id: "campaigns", label: "Campaigns", icon: Radio, color: "#e21227" },
    { id: "aianalysis", label: "AI Analysis", icon: Brain, color: "#00e5cc" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-4xl h-[88vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ background: "#0d0d0d", border: "1px solid rgba(226,18,39,0.25)", boxShadow: "0 0 60px rgba(226,18,39,0.08), 0 25px 50px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1f1f1f", background: "rgba(226,18,39,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
              <Shield className="w-4 h-4" style={{ color: "#e21227" }} />
            </div>
            <div>
              <div className="text-[14px] font-black tracking-wide" style={{ color: "#fff" }}>THREAT INTELLIGENCE</div>
              <div className="text-[9px] font-mono" style={{ color: "#555" }}>CVE · APT · CAMPAIGNS · AI BRIEFINGS</div>
            </div>
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg" style={{ background: "rgba(0,229,76,0.08)", border: "1px solid rgba(0,229,76,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e54c" }} />
              <span className="text-[9px] font-bold font-mono" style={{ color: "#00e54c" }}>LIVE</span>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-white/5" style={{ borderColor: "#2a2a2a" }}>
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex-shrink-0 grid grid-cols-4 gap-px border-b" style={{ borderColor: "#1a1a1a", background: "#1a1a1a" }}>
          {STATS.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3" style={{ background: "#0d0d0d" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}33` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div>
                <div className="text-[16px] font-black leading-none" style={{ color }}>{value}</div>
                <div className="text-[8px] font-mono mt-0.5" style={{ color: "#555" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b" style={{ borderColor: "#1f1f1f" }}>
          {TABS.map(({ id, label, icon: Icon, color }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold border-b-2 transition-all"
                style={{
                  borderBottomColor: active ? color : "transparent",
                  color: active ? color : "#555",
                  background: active ? `${color}08` : "transparent",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="h-full">
              {tab === "cve" && <CveTab />}
              {tab === "apt" && <AptTab />}
              {tab === "campaigns" && <CampaignsTab />}
              {tab === "aianalysis" && <AIAnalysisTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
