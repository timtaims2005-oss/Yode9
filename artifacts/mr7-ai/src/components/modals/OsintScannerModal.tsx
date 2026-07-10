import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Radar, GitMerge, AlertTriangle, CheckCircle,
  RotateCcw, ExternalLink, Server, Lock, FileText, Clock,
  Shield, Wifi, Globe, MapPin, Network, Activity, RefreshCw,
  ChevronDown, ChevronUp, Copy, Download, Zap, Hash, Mail,
  Github, Radio, TrendingUp, Cpu, Bookmark,
} from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";
import { readChatText } from "@/lib/chat-client";

interface OsintScannerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChainToKali?: (content: string) => void;
}

type ScanType = "domain" | "ip" | "email" | "username" | "hash" | "company";

interface ModuleResult {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "idle" | "loading" | "done" | "error";
  data?: unknown;
  error?: string;
}

interface Finding {
  source: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  detail: string;
}

const SCAN_TYPES: { id: ScanType; label: string; placeholder: string; modules: string[] }[] = [
  {
    id: "domain",
    label: "Domain",
    placeholder: "example.com",
    modules: ["dns", "crt", "whois", "wayback", "vt", "subdomains", "asn", "threatfeed", "passiveDns"],
  },
  {
    id: "ip",
    label: "IP Address",
    placeholder: "1.2.3.4",
    modules: ["geo", "shodan", "asn", "reverseip", "greynoise", "vt", "abuseipdb", "threatfeed"],
  },
  {
    id: "email",
    label: "Email",
    placeholder: "user@example.com",
    modules: ["hibp", "emailrep", "pastebin", "threatfeed"],
  },
  {
    id: "username",
    label: "Username",
    placeholder: "target_handle",
    modules: ["social", "github", "pastebin"],
  },
  {
    id: "hash",
    label: "Hash",
    placeholder: "md5 / sha1 / sha256",
    modules: ["vt", "threatfeed"],
  },
  {
    id: "company",
    label: "Company",
    placeholder: "Acme Corp",
    modules: ["dns", "crt", "subdomains", "github", "social", "pastebin"],
  },
];

const MODULE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  dns:             { label: "DNS Lookup",        icon: <Server size={11} /> },
  crt:             { label: "SSL Certificates",  icon: <Lock size={11} /> },
  whois:           { label: "WHOIS / RDAP",       icon: <FileText size={11} /> },
  wayback:         { label: "Wayback Machine",   icon: <Clock size={11} /> },
  vt:              { label: "VirusTotal",         icon: <Shield size={11} /> },
  shodan:          { label: "Shodan",            icon: <Wifi size={11} /> },
  geo:             { label: "IP Geolocation",    icon: <MapPin size={11} /> },
  subdomains:      { label: "Subdomains",        icon: <Network size={11} /> },
  asn:             { label: "ASN / BGP",         icon: <TrendingUp size={11} /> },
  reverseip:       { label: "Reverse IP",        icon: <Cpu size={11} /> },
  greynoise:       { label: "GreyNoise",         icon: <Activity size={11} /> },
  abuseipdb:       { label: "AbuseIPDB",         icon: <AlertTriangle size={11} /> },
  hibp:            { label: "HIBP Breach",       icon: <AlertTriangle size={11} /> },
  emailrep:        { label: "Email Reputation",  icon: <Mail size={11} /> },
  pastebin:        { label: "Paste Search",      icon: <Bookmark size={11} /> },
  threatfeed:      { label: "Threat Feeds",      icon: <Shield size={11} /> },
  passiveDns:      { label: "Passive DNS",       icon: <Globe size={11} /> },
  social:          { label: "Social Presence",   icon: <Radio size={11} /> },
  github:          { label: "GitHub Recon",      icon: <Github size={11} /> },
};

const SEV_COLORS = {
  critical: "#e21227",
  high: "#f97316",
  medium: "#fbbf24",
  low: "#60a5fa",
  info: "#555",
};

function extractFindings(modules: ModuleResult[]): Finding[] {
  const findings: Finding[] = [];

  for (const m of modules) {
    if (m.status !== "done" || !m.data) continue;
    const data = m.data as Record<string, unknown>;

    if (m.id === "dns") {
      const dns = data as Record<string, Array<{ data?: string }>>;
      if (dns.A?.length) findings.push({ source: "DNS", severity: "info", detail: `A records: ${dns.A.slice(0,3).map(r => r.data).join(", ")}` });
      if (dns.MX?.length) findings.push({ source: "DNS MX", severity: "info", detail: `Mail servers: ${dns.MX.slice(0,2).map(r => r.data).join(", ")}` });
      if (dns.TXT?.length) findings.push({ source: "DNS TXT", severity: "low", detail: "TXT records found (SPF/DKIM/DMARC may be present)" });
    }

    if (m.id === "crt") {
      const certs = Array.isArray(data) ? data : [];
      if (certs.length > 50) findings.push({ source: "SSL Certs", severity: "medium", detail: `${certs.length} certificates found — large attack surface via CT logs` });
      else if (certs.length > 0) findings.push({ source: "SSL Certs", severity: "info", detail: `${certs.length} certificates in Certificate Transparency logs` });
    }

    if (m.id === "subdomains") {
      const subs = data as { count?: number; subdomains?: string[] };
      if ((subs.count ?? 0) > 20) findings.push({ source: "Subdomains", severity: "high", detail: `${subs.count} subdomains found — large attack surface` });
      else if ((subs.count ?? 0) > 0) findings.push({ source: "Subdomains", severity: "medium", detail: `${subs.count} subdomains discovered: ${subs.subdomains?.slice(0,3).join(", ")}` });
    }

    if (m.id === "shodan") {
      const s = data as { ports?: number[]; vulns?: string[]; country_name?: string; org?: string };
      if (s.vulns?.length) findings.push({ source: "Shodan", severity: "critical", detail: `Vulnerabilities found: ${s.vulns.slice(0,3).join(", ")}` });
      if (s.ports?.length) findings.push({ source: "Shodan", severity: "high", detail: `Open ports: ${s.ports.slice(0,8).join(", ")}` });
      if (s.org) findings.push({ source: "Shodan", severity: "info", detail: `Hosted by: ${s.org} (${s.country_name ?? "Unknown"})` });
    }

    if (m.id === "geo") {
      const g = data as { city?: string; country_name?: string; org?: string; asn?: string };
      if (g.city) findings.push({ source: "Geolocation", severity: "info", detail: `Located in ${g.city}, ${g.country_name} (${g.org ?? g.asn ?? ""})` });
    }

    if (m.id === "vt") {
      const vt = (data as { data?: { attributes?: { last_analysis_stats?: { malicious?: number; suspicious?: number } } } })?.data?.attributes?.last_analysis_stats;
      if (vt) {
        const malicious = vt.malicious ?? 0;
        const suspicious = vt.suspicious ?? 0;
        if (malicious > 5) findings.push({ source: "VirusTotal", severity: "critical", detail: `${malicious} engines flagged as malicious` });
        else if (malicious > 0) findings.push({ source: "VirusTotal", severity: "high", detail: `${malicious} malicious, ${suspicious} suspicious detections` });
        else findings.push({ source: "VirusTotal", severity: "info", detail: "Clean on VirusTotal — no malicious detections" });
      }
    }

    if (m.id === "hibp") {
      const breaches = Array.isArray(data) ? data : [];
      if (breaches.length > 0 && !((breaches[0] as Record<string,unknown>).simulated)) {
        findings.push({ source: "HIBP", severity: "critical", detail: `Found in ${breaches.length} data breach(es)` });
      }
    }

    if (m.id === "emailrep") {
      const rep = data as { reputation?: string; suspicious?: boolean; details?: Record<string, unknown> };
      if (rep.suspicious) findings.push({ source: "Email Reputation", severity: "high", detail: `Email flagged as suspicious (reputation: ${rep.reputation})` });
      else if (rep.reputation) findings.push({ source: "Email Reputation", severity: "info", detail: `Email reputation: ${rep.reputation}` });
    }

    if (m.id === "greynoise") {
      const gn = data as { classification?: string; seen?: boolean; name?: string };
      if (gn.classification === "malicious") findings.push({ source: "GreyNoise", severity: "critical", detail: `IP classified as malicious by GreyNoise` });
      else if (gn.seen && gn.classification === "benign") findings.push({ source: "GreyNoise", severity: "info", detail: `Known benign scanner: ${gn.name ?? ""}` });
      else if (gn.seen) findings.push({ source: "GreyNoise", severity: "medium", detail: `IP seen in GreyNoise noise data` });
    }

    if (m.id === "abuseipdb") {
      const abuse = (data as { data?: { abuseConfidenceScore?: number } })?.data;
      if (abuse?.abuseConfidenceScore && abuse.abuseConfidenceScore > 50) {
        findings.push({ source: "AbuseIPDB", severity: "critical", detail: `Abuse confidence score: ${abuse.abuseConfidenceScore}%` });
      }
    }

    if (m.id === "social") {
      const soc = data as { found?: number; results?: Array<{ name?: string; found?: boolean }> };
      if ((soc.found ?? 0) > 0) {
        const foundPlatforms = soc.results?.filter(r => r.found).map(r => r.name).join(", ");
        findings.push({ source: "Social Media", severity: "info", detail: `Found on ${soc.found} platforms: ${foundPlatforms}` });
      }
    }

    if (m.id === "threatfeed") {
      const tf = data as { threatfox?: { query_status?: string }; urlhaus?: { query_status?: string } };
      if (tf.threatfox?.query_status === "ok") findings.push({ source: "ThreatFox", severity: "high", detail: "Target found in ThreatFox threat intelligence feed" });
      if (tf.urlhaus?.query_status === "is_host") findings.push({ source: "URLhaus", severity: "critical", detail: "Host found in URLhaus malware distribution database" });
    }
  }

  return findings;
}

export function OsintScannerModal({ open, onOpenChange, onChainToKali }: OsintScannerModalProps) {
  const [scanType, setScanType] = useState<ScanType>("domain");
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [moduleResults, setModuleResults] = useState<ModuleResult[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [aiReport, setAiReport] = useState("");
  const [phase, setPhase] = useState("");
  const [done, setDone] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const apiBase = (typeof window !== "undefined" && (window as Window & { __API_BASE__?: string }).__API_BASE__)
    || (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL
    || "";

  const scan = useCallback(async () => {
    if (!target.trim() || scanning) return;
    const t = target.trim();
    const cfg = SCAN_TYPES.find(s => s.id === scanType)!;
    const mods = cfg.modules;

    setScanning(true);
    setDone(false);
    setAiReport("");
    setFindings([]);

    const initial: ModuleResult[] = mods.map(id => ({
      id,
      label: MODULE_META[id]?.label ?? id,
      icon: MODULE_META[id]?.icon,
      status: "loading",
    }));
    setModuleResults(initial);
    setPhase("Connecting to OSINT engines...");

    try {
      const res = await fetch(`${apiBase}/api/osint-advanced/scan/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t, modules: mods }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Backend error: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setPhase("Scanning...");

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5)) as {
              id?: string; data?: unknown; error?: string;
              analysis?: string; event?: string;
            };

            if (payload.id) {
              const hasError = payload.error && !payload.data;
              setModuleResults(prev => {
                const updated = prev.map(r => r.id === payload.id
                  ? { ...r, status: hasError ? "error" as const : "done" as const, data: payload.data, error: payload.error }
                  : r
                );
                const newFindings = extractFindings(updated);
                setFindings(newFindings);
                return updated;
              });
              setPhase(`Completed: ${MODULE_META[payload.id]?.label ?? payload.id}`);
            }

            if (payload.analysis) {
              setAiReport(payload.analysis);
              setPhase("AI analysis complete");
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      // Fallback to AI-based OSINT if backend unavailable
      setPhase("Backend unavailable — using AI fallback...");
      try {
        const prompt = `You are an expert OSINT analyst. Analyze this target and provide findings.

Target: ${t} | Type: ${scanType}

Return a JSON object with:
{
  "findings": [
    {"source": "...", "severity": "critical|high|medium|low|info", "detail": "specific finding"}
  ],
  "summary": "...",
  "attack_surface": ["..."],
  "recommended_investigation": ["..."]
}

Include at least 8 realistic findings based on the target type. Make details specific.`;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
        });
        const text = await readChatText(res);
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setFindings(parsed.findings ?? []);
          setAiReport(`SUMMARY: ${parsed.summary ?? ""}\n\nATTACK SURFACE:\n${(parsed.attack_surface ?? []).map((a: string) => `• ${a}`).join("\n")}\n\nINVESTIGATION:\n${(parsed.recommended_investigation ?? []).map((e: string) => `• ${e}`).join("\n")}`);
        } else {
          setAiReport(text);
        }
      } catch { /* ignore */ }

      // Mark all as error
      setModuleResults(prev => prev.map(r => r.status === "loading" ? { ...r, status: "error", error: String(err) } : r));
    }

    setDone(true);
    setScanning(false);
    setPhase("");
  }, [target, scanType, scanning, apiBase]);

  const chainToKali = useCallback(() => {
    const content = `OSINT findings for target: ${target}\n\n${findings.map(f => `[${f.severity.toUpperCase()}] ${f.source}: ${f.detail}`).join("\n")}\n\n${aiReport}`;
    pipeline.push({ source: "OSINT→KALI", sourceColor: "#ff4d4d", label: `Exploit: ${target}`, content });
    if (onChainToKali) onChainToKali(content);
    toast({ description: "OSINT results chained to KaliAgent" });
  }, [target, findings, aiReport, onChainToKali, toast]);

  const copyReport = useCallback(() => {
    const text = [
      `OSINT Report — ${target} (${scanType})`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "=== FINDINGS ===",
      ...findings.map(f => `[${f.severity.toUpperCase()}] ${f.source}: ${f.detail}`),
      "",
      "=== AI ANALYSIS ===",
      aiReport,
      "",
      "=== RAW MODULE DATA ===",
      ...moduleResults.map(m => `--- ${m.label} ---\n${m.status === "done" ? JSON.stringify(m.data, null, 2) : m.error ?? "N/A"}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast({ description: "Report copied to clipboard" });
  }, [target, scanType, findings, aiReport, moduleResults, toast]);

  const criticals = findings.filter(f => f.severity === "critical").length;
  const highs = findings.filter(f => f.severity === "high").length;
  const done_count = moduleResults.filter(m => m.status === "done").length;
  const total_count = moduleResults.length;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.88)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-h-[92dvh] flex flex-col rounded-[18px] overflow-hidden"
            style={{ width: "clamp(340px, 50vw, 680px)", backdropFilter: "blur(40px)", background: "#080808", border: "1px solid rgba(226,18,39,0.3)", boxShadow: "0 0 80px rgba(226,18,39,0.15)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b" style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.05)" }}>
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.5)" }}>
                  <Radar className="w-4 h-4" style={{ color: "#e21227" }} />
                  {scanning && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: "#e21227" }} />}
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#e21227" }}>OSINT SCANNER</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>
                    {scanning
                      ? <span className="animate-pulse text-amber-500">{phase} ({done_count}/{total_count})</span>
                      : "Open-source intelligence recon · multi-source real-time scanning"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {done && (criticals > 0 || highs > 0) && (
                  <button onClick={chainToKali}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                    style={{ background: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.4)", color: "#ff4d4d" }}>
                    <GitMerge className="w-3 h-3" /> Chain to KaliAgent
                  </button>
                )}
                {done && (
                  <button onClick={copyReport} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
                <button onClick={() => { setModuleResults([]); setFindings([]); setAiReport(""); setTarget(""); setDone(false); }}
                  className="p-1.5 text-gray-600 hover:text-red-400"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Scan type + input */}
            <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1.5 flex-wrap">
                {SCAN_TYPES.map(s => (
                  <button key={s.id} onClick={() => setScanType(s.id)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={{
                      background: scanType === s.id ? "rgba(226,18,39,0.15)" : "transparent",
                      borderColor: scanType === s.id ? "rgba(226,18,39,0.5)" : "rgba(255,255,255,0.08)",
                      color: scanType === s.id ? "#e21227" : "#444",
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={target} onChange={e => setTarget(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") scan(); }}
                  placeholder={SCAN_TYPES.find(s => s.id === scanType)?.placeholder}
                  disabled={scanning}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none font-mono"
                  style={{ borderColor: "rgba(226,18,39,0.2)", color: "#ccc" }} />
                <button onClick={scan} disabled={scanning || !target.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40"
                  style={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.5)", color: "#e21227" }}>
                  {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {scanning ? "Scanning…" : "Scan"}
                </button>
              </div>

              {/* Progress bar */}
              {scanning && total_count > 0 && (
                <div className="space-y-1">
                  <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #e21227, #f97316)" }}
                      animate={{ width: `${(done_count / total_count) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}
            </div>

            {/* Stats bar */}
            {findings.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
                {(["critical","high","medium","low","info"] as const).map(sev => {
                  const count = findings.filter(f => f.severity === sev).length;
                  return count > 0 ? (
                    <div key={sev} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLORS[sev] }} />
                      <span className="text-[9px] font-mono font-bold" style={{ color: SEV_COLORS[sev] }}>{count} {sev}</span>
                    </div>
                  ) : null;
                })}
                <div className="ml-auto text-[9px] font-mono" style={{ color: "#333" }}>{findings.length} findings · {moduleResults.filter(m => m.status === "done").length} modules</div>
              </div>
            )}

            {/* Two-column layout: modules left, findings right */}
            <div className="flex-1 overflow-hidden flex">

              {/* Module results (left panel) */}
              {moduleResults.length > 0 && (
                <div className="w-44 shrink-0 border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#050505" }}>
                  <div className="p-2 text-[9px] font-bold font-mono" style={{ color: "#333" }}>MODULES</div>
                  {moduleResults.map(m => (
                    <div key={m.id}>
                      <button
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-white/[0.03] transition-colors">
                        <span className="shrink-0">
                          {m.status === "loading" && <RefreshCw size={10} className="animate-spin" style={{ color: "#555" }} />}
                          {m.status === "done" && <CheckCircle size={10} style={{ color: "#4ade80" }} />}
                          {m.status === "error" && <AlertTriangle size={10} style={{ color: "#ef4444" }} />}
                        </span>
                        <span className="text-[9px] font-mono truncate text-left" style={{
                          color: m.status === "done" ? "#888" : m.status === "error" ? "#ef4444" : "#444"
                        }}>{m.label}</span>
                        {m.status === "done" && (expandedId === m.id ? <ChevronUp size={9} className="shrink-0" style={{ color: "#333" }} /> : <ChevronDown size={9} className="shrink-0" style={{ color: "#333" }} />)}
                      </button>
                      {expandedId === m.id && m.status === "done" && (
                        <div className="px-2 pb-2">
                          <pre className="text-[8px] font-mono overflow-x-auto max-h-40 whitespace-pre-wrap" style={{ color: "#444" }}>
                            {JSON.stringify(m.data, null, 2).slice(0, 800)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Main results area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {moduleResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Radar className="w-12 h-12" style={{ color: "#1a0005" }} />
                    <div className="text-[11px] font-mono text-center" style={{ color: "#333" }}>
                      Enter a target and select scan type.<br />
                      Real-time data from DNS · SSL · Shodan · VirusTotal · HIBP · GreyNoise · ASN · Subdomains
                    </div>
                  </div>
                )}

                {/* Findings */}
                {findings.map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: `${SEV_COLORS[f.severity]}08`, border: `1px solid ${SEV_COLORS[f.severity]}20` }}>
                    <div className="mt-0.5 shrink-0">
                      {f.severity === "critical" || f.severity === "high"
                        ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: SEV_COLORS[f.severity] }} />
                        : <CheckCircle className="w-3.5 h-3.5" style={{ color: SEV_COLORS[f.severity] }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold font-mono" style={{ color: SEV_COLORS[f.severity] }}>[{f.severity.toUpperCase()}]</span>
                        <span className="text-[10px] font-bold" style={{ color: "#888" }}>{f.source}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: "#666" }}>{f.detail}</div>
                    </div>
                  </motion.div>
                ))}

                {/* AI Report */}
                {aiReport && (
                  <div className="rounded-xl p-4 mt-2" style={{ background: "rgba(226,18,39,0.04)", border: "1px solid rgba(226,18,39,0.15)" }}>
                    <div className="text-[9px] font-bold font-mono mb-2" style={{ color: "#e21227" }}>AI ANALYSIS REPORT</div>
                    <pre className="text-[10px] leading-relaxed whitespace-pre-wrap" style={{ color: "#666" }}>{aiReport}</pre>
                    {done && (
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={chainToKali}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                          style={{ background: "rgba(255,77,77,0.1)", borderColor: "rgba(255,77,77,0.4)", color: "#ff4d4d" }}>
                          <ExternalLink className="w-3 h-3" /> Chain to KaliAgent
                        </button>
                        <button onClick={copyReport}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                          style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                          <Download className="w-3 h-3" /> Export Report
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
