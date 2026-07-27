/**
 * NetworkIntelPanel — Production Intelligence Panel
 * Wired to POST /api/intel/network (DNS + RDAP + ipinfo.io + Shodan InternetDB + GreyNoise)
 * 12-hour Redis cache | Zod-validated backend inputs
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Server, Shield, AlertTriangle, Wifi, Search, Loader2,
  Download, Activity, MapPin, Lock, Database, CheckCircle2,
  ChevronDown, ChevronUp, ExternalLink, Fingerprint, Network,
} from "lucide-react";

interface GeoInfo {
  ip?: string; city?: string; region?: string; country?: string; org?: string; timezone?: string; loc?: string;
}
interface DnsInfo {
  mx: Array<{ exchange: string; priority: number }>;
  txt: string[]; ns: string[]; spf: boolean; dmarc: boolean; dkim: boolean;
}
interface RdapInfo {
  ldhName?: string; created?: string; expires?: string; status?: string[];
}
interface NetworkResult {
  query: string; type: "ip" | "domain";
  geo?: GeoInfo | null;
  ports?: number[]; vulns?: string[]; hostnames?: string[]; tags?: string[]; cpes?: string[];
  greynoise?: Record<string, unknown> | null;
  resolvedIPs?: string[];
  certificates?: string[];
  dns?: DnsInfo | null;
  rdap?: RdapInfo | null;
  riskScore: number; riskLevel: string;
  sources: Record<string, { success: boolean; error?: string }>;
  cached: boolean; scannedAt: string;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
};
const RISK_BG: Record<string, string> = {
  CRITICAL: "rgba(226,18,39,0.10)", HIGH: "rgba(249,115,22,0.10)",
  MEDIUM: "rgba(234,179,8,0.10)", LOW: "rgba(34,197,94,0.10)",
};

function riskColor(level: string): string { return RISK_COLORS[level] ?? "#6b7280"; }
function riskBg(level: string): string { return RISK_BG[level] ?? "transparent"; }

function Tag({ children, color = "#3b82f6" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide"
      style={{ background: color + "20", color }}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-mono uppercase tracking-widest text-[#444] mb-1.5">{children}</p>;
}

function Expandable({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#161616] transition-colors">
        <span className="text-[11px] font-medium text-gray-300">{title}</span>
        <div className="flex items-center gap-2">
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1f1f1f] text-gray-400 font-mono">{badge}</span>}
          {open ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 border-t border-[#1f1f1f]">
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NetworkIntelPanel({ onInjectToChat }: Props) {
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<NetworkResult | null>(null);
  const [error, setError]       = useState("");
  const [progress, setProgress] = useState(0);

  const search = async () => {
    if (!query.trim()) { setError("Enter an IP address or domain"); return; }
    setLoading(true); setError(""); setResult(null); setProgress(0);

    // Animate progress while waiting
    const prog = setInterval(() => setProgress((p) => Math.min(p + 3, 90)), 200);

    try {
      const res = await fetch("/api/intel/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), type: "auto" }),
      });
      const data = await res.json() as { success: boolean; data?: NetworkResult; error?: string; details?: unknown[] };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Scan failed");
      } else if (data.data) {
        setResult(data.data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      clearInterval(prog);
      setProgress(100);
      setTimeout(() => setProgress(0), 600);
      setLoading(false);
    }
  };

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `network-intel-${result.query}-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const injectToChat = () => {
    if (!result || !onInjectToChat) return;
    const lines = [
      `## Network Intelligence: ${result.query}`,
      `**Risk:** ${result.riskScore}/100 (${result.riskLevel})`,
      `**Type:** ${result.type}`,
      result.geo ? `**Location:** ${result.geo.city ?? ""}, ${result.geo.country ?? ""} | ISP: ${result.geo.org ?? ""}` : "",
      result.ports?.length ? `**Open Ports:** ${result.ports.join(", ")}` : "",
      result.vulns?.length ? `**CVEs:** ${result.vulns.join(", ")}` : "",
      result.certificates?.length ? `**Certificates:** ${result.certificates.slice(0, 5).join(", ")}` : "",
      `**Sources:** ${Object.keys(result.sources).join(", ")}`,
      `**Scanned:** ${result.scannedAt}`,
    ].filter(Boolean).join("\n");
    onInjectToChat(lines);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <Globe className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Network Intelligence</h2>
          <p className="text-[10px] text-gray-500">ipinfo.io · Shodan InternetDB · GreyNoise · crt.sh · RDAP</p>
        </div>
        {result && (
          <div className="flex items-center gap-1">
            {result.cached && <Tag color="#3b82f6">12H CACHE</Tag>}
            {onInjectToChat && (
              <button onClick={injectToChat} className="p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-cyan-400 transition-all text-[10px]">
                ↗
              </button>
            )}
            <button onClick={exportResult} className="p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-[#1f1f1f]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="IP address or domain — e.g. 8.8.8.8, github.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-[#2a2a2a] rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "Scanning…" : "Scan"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {progress > 0 && progress < 100 && (
          <div className="mt-2 w-full bg-[#1a1a1a] rounded-full h-1 overflow-hidden">
            <motion.div className="h-full bg-cyan-500 rounded-full" style={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">

              {/* Risk Score Card */}
              <div className="rounded-lg border p-4" style={{ borderColor: riskColor(result.riskLevel) + "40", background: riskBg(result.riskLevel) }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg">
                      {result.type === "ip" ? <Server className="w-5 h-5 text-cyan-400" /> : <Globe className="w-5 h-5 text-cyan-400" />}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-white font-bold">{result.query}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Tag color="#06b6d4">{result.type.toUpperCase()}</Tag>
                        {result.geo?.country && <Tag color="#6b7280">{result.geo.country}</Tag>}
                        {result.greynoise && typeof result.greynoise["classification"] === "string" && (
                          <Tag color={result.greynoise["classification"] === "malicious" ? "#e21227" : "#10b981"}>
                            GN: {String(result.greynoise["classification"]).toUpperCase()}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: riskColor(result.riskLevel) }}>{result.riskScore}</p>
                    <p className="text-[10px] font-bold" style={{ color: riskColor(result.riskLevel) }}>{result.riskLevel}</p>
                  </div>
                </div>
                <div className="w-full bg-[#0d0d0d]/60 rounded-full h-1.5">
                  <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${result.riskScore}%` }} transition={{ duration: 0.8 }}
                    style={{ backgroundColor: riskColor(result.riskLevel) }} />
                </div>
              </div>

              {/* IP-specific: Geo + Ports + Vulns */}
              {result.type === "ip" && (
                <>
                  {result.geo && (
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-3 space-y-2">
                      <SectionTitle>Geolocation — ipinfo.io</SectionTitle>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { icon: <MapPin size={10} />, label: "City", value: `${result.geo.city ?? "—"}, ${result.geo.region ?? "—"}` },
                          { icon: <Globe size={10} />, label: "Country", value: result.geo.country ?? "—" },
                          { icon: <Network size={10} />, label: "ISP / ASN", value: result.geo.org ?? "—" },
                          { icon: <Activity size={10} />, label: "Timezone", value: result.geo.timezone ?? "—" },
                        ].map(({ icon, label, value }) => (
                          <div key={label} className="flex items-start gap-1.5">
                            <span className="text-gray-600 mt-0.5">{icon}</span>
                            <div>
                              <p className="text-[9px] text-gray-600">{label}</p>
                              <p className="text-[11px] text-gray-200 font-mono truncate max-w-[110px]">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(result.ports?.length ?? 0) > 0 && (
                    <Expandable title="Open Ports — Shodan InternetDB" badge={String(result.ports!.length)}>
                      <div className="flex flex-wrap gap-1">
                        {result.ports!.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#1a1a1a] text-cyan-300 border border-[#2a2a2a]">{p}</span>
                        ))}
                      </div>
                    </Expandable>
                  )}

                  {(result.vulns?.length ?? 0) > 0 && (
                    <Expandable title="Known CVEs — Shodan InternetDB" badge={String(result.vulns!.length)}>
                      <div className="space-y-1">
                        {result.vulns!.map((v) => (
                          <div key={v} className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-red-300">{v}</span>
                            <a href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noopener noreferrer"
                              className="text-[9px] text-gray-500 hover:text-cyan-400 flex items-center gap-1">
                              <ExternalLink size={9} /> NVD
                            </a>
                          </div>
                        ))}
                      </div>
                    </Expandable>
                  )}

                  {(result.hostnames?.length ?? 0) > 0 && (
                    <Expandable title="Hostnames" badge={String(result.hostnames!.length)}>
                      <div className="space-y-1">
                        {result.hostnames!.map((h) => <p key={h} className="text-[11px] font-mono text-gray-300">{h}</p>)}
                      </div>
                    </Expandable>
                  )}
                </>
              )}

              {/* Domain-specific: DNS + WHOIS + Certs */}
              {result.type === "domain" && (
                <>
                  {result.resolvedIPs?.length ? (
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-3">
                      <SectionTitle>Resolved IPs</SectionTitle>
                      <div className="flex flex-wrap gap-1">
                        {result.resolvedIPs.map((ip) => (
                          <span key={ip} className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#1a1a1a] text-cyan-300 border border-[#2a2a2a]">{ip}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {result.dns && (
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-3 space-y-2">
                      <SectionTitle>DNS Records</SectionTitle>
                      {/* Email security badges */}
                      <div className="flex gap-1.5 flex-wrap mb-1">
                        {[
                          { label: "SPF",   ok: result.dns.spf,   desc: "Sender Policy Framework" },
                          { label: "DMARC", ok: result.dns.dmarc, desc: "Domain-based Message Authentication" },
                          { label: "DKIM",  ok: result.dns.dkim,  desc: "DomainKeys Identified Mail" },
                        ].map(({ label, ok }) => (
                          <div key={label} className="flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono"
                            style={{ borderColor: ok ? "#10b98140" : "#e2122740", color: ok ? "#10b981" : "#e21227", background: ok ? "#10b98110" : "#e2122710" }}>
                            {ok ? <CheckCircle2 size={8} /> : <AlertTriangle size={8} />} {label}
                          </div>
                        ))}
                      </div>
                      {result.dns.mx.length > 0 && (
                        <div>
                          <p className="text-[9px] text-gray-600 mb-1">MX Records</p>
                          {result.dns.mx.slice(0, 4).map((r) => (
                            <p key={r.exchange} className="text-[10px] font-mono text-gray-300">{r.priority} {r.exchange}</p>
                          ))}
                        </div>
                      )}
                      {result.dns.ns.length > 0 && (
                        <div>
                          <p className="text-[9px] text-gray-600 mb-1">Nameservers</p>
                          <div className="flex flex-wrap gap-1">
                            {result.dns.ns.slice(0, 4).map((ns) => (
                              <span key={ns} className="text-[10px] font-mono text-gray-400">{ns}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.dns.txt.length > 0 && (
                        <Expandable title="TXT Records" badge={String(result.dns.txt.length)}>
                          {result.dns.txt.slice(0, 6).map((t, i) => (
                            <p key={i} className="text-[10px] font-mono text-gray-400 truncate">{t}</p>
                          ))}
                        </Expandable>
                      )}
                    </div>
                  )}

                  {result.rdap && (
                    <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-3">
                      <SectionTitle>WHOIS / RDAP</SectionTitle>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {result.rdap.created && <div><p className="text-[9px] text-gray-600">Registered</p><p className="font-mono text-gray-300 text-[10px]">{result.rdap.created?.slice(0, 10)}</p></div>}
                        {result.rdap.expires && <div><p className="text-[9px] text-gray-600">Expires</p><p className="font-mono text-gray-300 text-[10px]">{result.rdap.expires?.slice(0, 10)}</p></div>}
                        {result.rdap.status?.length && <div className="col-span-2"><p className="text-[9px] text-gray-600">Status</p><div className="flex flex-wrap gap-1 mt-0.5">{result.rdap.status.map((s) => <Tag key={s} color="#6b7280">{s}</Tag>)}</div></div>}
                      </div>
                    </div>
                  )}

                  {result.certificates?.length ? (
                    <Expandable title="Certificate Transparency — crt.sh" badge={String(result.certificates.length)}>
                      {result.certificates.slice(0, 10).map((c, i) => (
                        <p key={i} className="text-[10px] font-mono text-gray-400 truncate">{c}</p>
                      ))}
                    </Expandable>
                  ) : null}
                </>
              )}

              {/* Sources status */}
              <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-3">
                <SectionTitle>Data Sources</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(result.sources).map(([name, s]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      {s.success
                        ? <CheckCircle2 size={9} className="text-green-400 shrink-0" />
                        : <AlertTriangle size={9} className="text-gray-600 shrink-0" />}
                      <span className="text-[10px] font-mono truncate" style={{ color: s.success ? "#9ca3af" : "#4b5563" }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GreyNoise raw */}
              {result.greynoise && (
                <Expandable title="GreyNoise Details">
                  <pre className="text-[10px] font-mono text-gray-400 overflow-x-auto max-h-36 scrollbar-thin scrollbar-thumb-[#2a2a2a]">
                    {JSON.stringify(result.greynoise, null, 2)}
                  </pre>
                </Expandable>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-12 text-gray-700">
            <div className="relative mx-auto w-12 h-12 mb-4">
              <Wifi className="w-12 h-12 opacity-10" />
              <Shield className="w-5 h-5 absolute bottom-0 right-0 opacity-20" />
            </div>
            <p className="text-sm">Enter an IP address or domain</p>
            <p className="text-xs mt-1 text-gray-700">DNS · WHOIS · Geo · Ports · CVEs · Certificates</p>
          </div>
        )}

        {loading && (
          <div className="py-12 space-y-3">
            {["Resolving DNS records…", "Querying geolocation…", "Checking Shodan InternetDB…", "Fetching GreyNoise reputation…", "Scanning crt.sh certificates…"].map((step, i) => (
              <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 size={10} className="animate-spin text-cyan-500 shrink-0" />
                {step}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkIntelPanel;
