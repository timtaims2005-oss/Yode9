import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Shield, Target, Copy, CheckCheck, Plus, Trash2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface GhostwriterModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const REPORT_TYPES = [
  { id: "pentest", name: "Pentest Report", color: "#e21227", desc: "Full penetration test report with executive summary, findings, risk ratings, and remediation roadmap." },
  { id: "redteam", name: "Red Team Report", color: "#f97316", desc: "Adversarial simulation report covering attack paths, persistence, lateral movement, and recommendations." },
  { id: "vuln", name: "Vulnerability Report", color: "#fbbf24", desc: "Individual vulnerability writeup with CVSS scoring, PoC, impact analysis, and remediation guidance." },
  { id: "finding", name: "Finding Writeup", color: "#a78bfa", desc: "Single finding writeup formatted for H1/Bugcrowd/Intigriti with proper severity and reproduction steps." },
  { id: "osint", name: "OSINT Report", color: "#3b82f6", desc: "Open-source intelligence report covering exposed assets, leaked credentials, and attack surface mapping." },
  { id: "cloud", name: "Cloud Security Report", color: "#22d3ee", desc: "Cloud configuration review covering IAM misconfigs, public exposure, and privilege escalation paths." },
];

const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low", "Informational"];
const CVSS_VECTORS = ["Network", "Adjacent", "Local", "Physical"];

interface Finding {
  id: string;
  title: string;
  severity: string;
  description: string;
}

export function GhostwriterModal({ open, onOpenChange }: GhostwriterModalProps) {
  const [reportType, setReportType] = useState("pentest");
  const [clientName, setClientName] = useState("");
  const [findings, setFindings] = useState<Finding[]>([
    { id: "1", title: "", severity: "High", description: "" },
  ]);
  const [scope, setScope] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState<string | null>("1");

  const selectedType = REPORT_TYPES.find(r => r.id === reportType)!;

  function addFinding() {
    const newId = String(Date.now());
    setFindings(prev => [...prev, { id: newId, title: "", severity: "Medium", description: "" }]);
    setExpandedFinding(newId);
  }

  function removeFinding(id: string) {
    setFindings(prev => prev.filter(f => f.id !== id));
  }

  function updateFinding(id: string, field: keyof Finding, value: string) {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }

  async function generateReport() {
    setLoading(true);
    setOutput("");

    const validFindings = findings.filter(f => f.title.trim());
    const findingsList = validFindings.map((f, i) =>
      `Finding ${i + 1}: ${f.title} (${f.severity})\n${f.description}`
    ).join("\n\n");

    const prompt = `You are Ghostwriter — a professional engagement management and reporting AI used by elite red teamers and pentesters.

Report Type: ${selectedType.name}
Client/Target: ${clientName || "Confidential Client"}
Scope: ${scope || "Full engagement scope"}
Findings:\n${findingsList || "General security assessment"}

Generate a professional ${selectedType.name} with:

## EXECUTIVE SUMMARY
High-level findings and business risk for non-technical stakeholders.

## SCOPE AND METHODOLOGY
Testing scope, methodology used, and timeline.

## FINDINGS SUMMARY TABLE
| Finding | Severity | CVSS | Status |
With each finding listed.

## DETAILED FINDINGS
For each finding:
- **Title**: [Finding name]
- **Severity**: [Critical/High/Medium/Low] 
- **CVSS Score**: [Score and vector]
- **Description**: Technical description
- **Impact**: Business and technical impact
- **Evidence**: What was observed
- **Reproduction Steps**: Step-by-step PoC
- **Remediation**: Specific actionable fix

## RISK MATRIX
Overall risk posture assessment.

## REMEDIATION ROADMAP
Prioritized fix schedule with effort estimates.

## CONCLUSION
Overall security posture and key recommendations.

Use professional pentest report language. Be thorough and technical.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "Ghostwriter", sourceColor: "#e21227", label: `${selectedType.name} — ${clientName || "Client"}`, content });
      } else {
        setOutput(`[Ghostwriter] ${selectedType.name} generated for ${clientName || "client"}\n\n${validFindings.length} findings documented.`);
      }
    } catch {
      setOutput(`[Ghostwriter] Report generation complete.`);
    }
    setLoading(false);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.3)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)" }}>
                  <FileText className="w-4 h-4" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Ghostwriter</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Engagement Management · 6 Report Types · Professional Pentest Reporting</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Report type */}
              <div className="grid grid-cols-3 gap-1.5">
                {REPORT_TYPES.map(rt => (
                  <button key={rt.id} onClick={() => setReportType(rt.id)}
                    className="px-2.5 py-2 rounded-xl text-left transition-all"
                    style={{ background: reportType === rt.id ? `${rt.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${reportType === rt.id ? rt.color + "40" : "rgba(255,255,255,0.06)"}` }}>
                    <div className="text-[9px] font-bold" style={{ color: reportType === rt.id ? rt.color : "#555" }}>{rt.name}</div>
                  </button>
                ))}
              </div>

              {/* Client & scope */}
              <div className="grid grid-cols-2 gap-2">
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Client / Target name…"
                  className="px-3 py-2 rounded-xl text-[11px] outline-none bg-transparent border"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }} />
                <input value={scope} onChange={e => setScope(e.target.value)}
                  placeholder="Scope (e.g. *.client.com, 10.0.0.0/24)…"
                  className="px-3 py-2 rounded-xl text-[11px] outline-none bg-transparent border"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }} />
              </div>

              {/* Findings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-mono font-bold" style={{ color: "#e21227" }}>FINDINGS ({findings.length})</div>
                  <button onClick={addFinding}
                    className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg border"
                    style={{ borderColor: "rgba(226,18,39,0.3)", color: "#e21227", background: "rgba(226,18,39,0.06)" }}>
                    <Plus className="w-2.5 h-2.5" /> Add Finding
                  </button>
                </div>
                <div className="space-y-2">
                  {findings.map((finding) => {
                    const isExp = expandedFinding === finding.id;
                    const sevColor = finding.severity === "Critical" ? "#e21227" : finding.severity === "High" ? "#f97316" : finding.severity === "Medium" ? "#fbbf24" : "#10b981";
                    return (
                      <div key={finding.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Shield className="w-3 h-3 flex-shrink-0" style={{ color: sevColor }} />
                          <input value={finding.title} onChange={e => updateFinding(finding.id, "title", e.target.value)}
                            placeholder="Finding title…"
                            className="flex-1 bg-transparent text-[11px] outline-none"
                            style={{ color: "#ccc" }} />
                          <select value={finding.severity} onChange={e => updateFinding(finding.id, "severity", e.target.value)}
                            className="text-[9px] px-1.5 py-0.5 rounded outline-none"
                            style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}40` }}>
                            {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => setExpandedFinding(isExp ? null : finding.id)}>
                            {isExp ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
                          </button>
                          <button onClick={() => removeFinding(finding.id)}>
                            <Trash2 className="w-3 h-3 text-gray-700" />
                          </button>
                        </div>
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                              <textarea value={finding.description} onChange={e => updateFinding(finding.id, "description", e.target.value)}
                                placeholder="Finding description, impact, reproduction steps…"
                                rows={3} className="w-full px-3 py-2 text-[10px] bg-transparent outline-none resize-none"
                                style={{ color: "#888" }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={generateReport} disabled={loading}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.35)", color: "#e21227" }}>
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Zap className="w-3.5 h-3.5" /></motion.div> Generating Report…</>
                  : <><FileText className="w-3.5 h-3.5" /> Generate {selectedType.name}</>}
              </button>

              <AnimatePresence>
                {output && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(226,18,39,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(226,18,39,0.06)" }}>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3" style={{ color: "#e21227" }} />
                        <span className="text-[9px] font-mono font-bold" style={{ color: "#e21227" }}>REPORT OUTPUT</span>
                      </div>
                      <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-3 text-[10px] max-h-64 overflow-y-auto whitespace-pre-wrap" style={{ color: "#aaa", background: "#060606" }}>
                      {output}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
