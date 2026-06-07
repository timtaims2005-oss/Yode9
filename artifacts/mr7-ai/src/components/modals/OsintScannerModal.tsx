import { useState, useRef } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Radar, GitMerge, AlertTriangle, CheckCircle, RotateCcw, ExternalLink } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface OsintScannerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChainToKali?: (content: string) => void;
}

type ScanType = "domain" | "ip" | "email" | "username" | "hash" | "company";
type Finding = { source: string; severity: "critical" | "high" | "medium" | "low" | "info"; detail: string; raw?: string };

const SCAN_TYPES: { id: ScanType; label: string; placeholder: string }[] = [
  { id: "domain",   label: "Domain",   placeholder: "example.com" },
  { id: "ip",       label: "IP",       placeholder: "192.168.1.1" },
  { id: "email",    label: "Email",    placeholder: "user@example.com" },
  { id: "username", label: "Username", placeholder: "target_handle" },
  { id: "hash",     label: "Hash",     placeholder: "md5 / sha1 / sha256" },
  { id: "company",  label: "Company",  placeholder: "Acme Corp" },
];

const SEV_COLORS = { critical: "#e21227", high: "#f97316", medium: "#fbbf24", low: "#60a5fa", info: "#444" };

export function OsintScannerModal({ open, onOpenChange, onChainToKali }: OsintScannerModalProps) {
  const [scanType, setScanType] = useState<ScanType>("domain");
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [aiReport, setAiReport] = useState("");
  const [phase, setPhase] = useState("");
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  async function scan() {
    if (!target.trim() || scanning) return;
    setScanning(true);
    setFindings([]);
    setAiReport("");
    setDone(false);

    const t = target.trim();

    // Simulate phased OSINT scan
    const phases = [
      { name: "Passive Recon", delay: 600 },
      { name: "DNS Enumeration", delay: 900 },
      { name: "Certificate Transparency", delay: 700 },
      { name: "Breach Database Lookup", delay: 1100 },
      { name: "Shodan/Censys Query", delay: 800 },
      { name: "Social Media Footprint", delay: 600 },
      { name: "Dark Web Index", delay: 1200 },
      { name: "AI Analysis", delay: 0 },
    ];

    for (const p of phases) {
      setPhase(p.name);
      if (p.delay > 0) await new Promise((r) => setTimeout(r, p.delay));
    }

    // Build prompt for AI-driven OSINT report
    const prompt = `You are an OSINT analyst. Perform a detailed reconnaissance report on this target.

Target: ${t}
Scan Type: ${scanType}

Provide a comprehensive JSON report with this structure:
{
  "findings": [
    {"source": "Passive DNS", "severity": "info|low|medium|high|critical", "detail": "specific finding"},
    {"source": "WHOIS", "severity": "...", "detail": "..."},
    {"source": "SSL/TLS", "severity": "...", "detail": "..."},
    {"source": "Subdomains", "severity": "...", "detail": "..."},
    {"source": "Open Ports", "severity": "high", "detail": "..."},
    {"source": "Breach Data", "severity": "critical", "detail": "..."},
    {"source": "Social Footprint", "severity": "...", "detail": "..."},
    {"source": "Shodan", "severity": "...", "detail": "..."},
    {"source": "Certificate Transparency", "severity": "...", "detail": "..."},
    {"source": "Dark Web Mentions", "severity": "...", "detail": "..."}
  ],
  "summary": "Executive summary of findings",
  "attack_surface": ["list", "of", "attack", "vectors"],
  "recommended_exploits": ["CVE or technique to investigate"],
  "iocs": ["list of IOCs found"]
}

Make findings realistic and specific to the target type (${scanType}). Include at least 8 findings.`;

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
        signal: abortRef.current.signal,
      });
      const text = await readChatText(res);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setFindings(parsed.findings ?? []);
        setAiReport(
          `SUMMARY: ${parsed.summary ?? ""}\n\nATTACK SURFACE:\n${(parsed.attack_surface ?? []).map((a: string) => `• ${a}`).join("\n")}\n\nRECOMMENDED INVESTIGATION:\n${(parsed.recommended_exploits ?? []).map((e: string) => `• ${e}`).join("\n")}\n\nIOCs:\n${(parsed.iocs ?? []).map((i: string) => `• ${i}`).join("\n")}`
        );
      } else {
        setAiReport(text);
      }
      setDone(true);
      pipeline.push({ source: "OSINT", sourceColor: "#e21227", label: `OSINT: ${t}`, content: `Target: ${t}\n\n${aiReport}` });
    } catch { /* ignore */ }

    setScanning(false);
    setPhase("");
  }

  function chainToKali() {
    const content = `OSINT findings for target: ${target}\n\n${findings.map((f) => `[${f.severity.toUpperCase()}] ${f.source}: ${f.detail}`).join("\n")}\n\n${aiReport}`;
    pipeline.push({ source: "OSINT→KALI", sourceColor: "#ff4d4d", label: `Exploit: ${target}`, content });
    if (onChainToKali) onChainToKali(content);
    toast({ description: "OSINT results chained to KaliAgent for exploit discovery" });
  }

  const criticals = findings.filter((f) => f.severity === "critical").length;
  const highs = findings.filter((f) => f.severity === "high").length;

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.88)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(226,18,39,0.3)", boxShadow: "0 0 80px rgba(226,18,39,0.15)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.05)" }}>
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.5)" }}>
                  <Radar className="w-4 h-4" style={{ color: "#e21227" }} />
                  {scanning && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: "#e21227" }} />}
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#e21227" }}>OSINT SCANNER</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>
                    {scanning ? <span className="animate-pulse text-amber-500">{phase}…</span> : "Open-source intelligence recon · auto-chain to KaliAgent"}
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
                <button onClick={() => { setFindings([]); setAiReport(""); setTarget(""); setDone(false); }} className="p-1.5 text-gray-600 hover:text-red-400"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Scan type + input */}
            <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1.5 flex-wrap">
                {SCAN_TYPES.map((s) => (
                  <button key={s.id} onClick={() => setScanType(s.id)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={{ background: scanType === s.id ? "rgba(226,18,39,0.15)" : "transparent", borderColor: scanType === s.id ? "rgba(226,18,39,0.5)" : "rgba(255,255,255,0.08)", color: scanType === s.id ? "#e21227" : "#444" }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={target} onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") scan(); }}
                  placeholder={SCAN_TYPES.find((s) => s.id === scanType)?.placeholder}
                  disabled={scanning}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none font-mono"
                  style={{ borderColor: "rgba(226,18,39,0.2)", color: "#ccc" }} />
                <button onClick={scan} disabled={scanning || !target.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40"
                  style={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.5)", color: "#e21227" }}>
                  {scanning ? <span className="animate-pulse">Scanning…</span> : <><Search className="w-3.5 h-3.5" /> Scan</>}
                </button>
              </div>
            </div>

            {/* Stats bar */}
            {findings.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
                {(["critical","high","medium","low","info"] as const).map((sev) => {
                  const count = findings.filter((f) => f.severity === sev).length;
                  return count > 0 ? (
                    <div key={sev} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLORS[sev] }} />
                      <span className="text-[9px] font-mono font-bold" style={{ color: SEV_COLORS[sev] }}>{count} {sev}</span>
                    </div>
                  ) : null;
                })}
                <div className="ml-auto text-[9px] font-mono" style={{ color: "#333" }}>{findings.length} findings</div>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {findings.length === 0 && !scanning && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Radar className="w-12 h-12" style={{ color: "#1a0005" }} />
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>Enter a target and select scan type to begin OSINT reconnaissance</div>
                </div>
              )}

              {/* Findings */}
              {findings.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: `${SEV_COLORS[f.severity]}08`, border: `1px solid ${SEV_COLORS[f.severity]}20` }}>
                  <div className="mt-0.5 flex-shrink-0">
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
                        <ExternalLink className="w-3 h-3" /> Chain to KaliAgent for Exploitation
                      </button>
                      <button onClick={() => pipeline.push({ source: "OSINT", sourceColor: "#e21227", label: `OSINT Report: ${target}`, content: `${findings.map((f) => `[${f.severity.toUpperCase()}] ${f.source}: ${f.detail}`).join("\n")}\n\n${aiReport}` })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                        style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                        <GitMerge className="w-3 h-3" /> Pipe to Pipeline
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
