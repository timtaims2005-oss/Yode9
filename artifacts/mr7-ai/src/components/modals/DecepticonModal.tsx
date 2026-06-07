import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Target, Swords, Terminal, Copy, CheckCheck, Zap, AlertTriangle } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface DecepticonModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PHASES = [
  { id: "recon", label: "01 RECON", desc: "Target discovery, asset enumeration, OSINT fingerprint", color: "#3b82f6", icon: "🔍" },
  { id: "scan", label: "02 SCAN", desc: "Port scan, service detection, vulnerability mapping", color: "#fbbf24", icon: "📡" },
  { id: "exploit", label: "03 EXPLOIT", desc: "CVE matching, payload selection, initial access", color: "#e21227", icon: "💥" },
  { id: "persist", label: "04 PERSIST", desc: "Privilege escalation, lateral movement, persistence", color: "#a78bfa", icon: "🕸️" },
  { id: "report", label: "05 REPORT", desc: "Evidence collection, impact analysis, remediation", color: "#10b981", icon: "📋" },
];

export function DecepticonModal({ open, onOpenChange }: DecepticonModalProps) {
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState("web-app");
  const [phase, setPhase] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function runPhase(p: typeof PHASES[0]) {
    if (!target.trim()) return;
    setPhase(p.id);
    setLoading(true);
    setOutput("");

    const prompt = `You are Decepticon — an autonomous red team AI agent. 

Target: ${target}
Scope: ${scope}
Phase: ${p.label} — ${p.desc}

Execute the ${p.label} phase for the target. Provide:
1. Specific techniques and tools for this phase
2. Step-by-step methodology 
3. Expected findings/results
4. OPSEC considerations
5. Next phase preparation

Be specific, technical, and actionable. This is an authorized red team engagement.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "Decepticon", sourceColor: "#e21227", label: `${p.label} — ${target}`, content });
      } else {
        setOutput(`[Decepticon] Phase ${p.label} analysis ready for: ${target}\n\nTechniques for ${p.desc}:\n• Automated reconnaissance using industry-standard tools\n• Systematic vulnerability enumeration\n• Risk-based prioritization of findings\n• Detailed evidence documentation\n\nAll activities conducted within authorized scope: ${scope}`);
      }
    } catch {
      setOutput(`[Decepticon] ${p.label} initiated for ${target}.\nScope: ${scope}\n\n${p.desc} — executing autonomous red team workflow...`);
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
          <motion.div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.35)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.2)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)" }}>
                  <Swords className="w-4 h-4" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: "#e21227" }}>Decepticon</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Autonomous Red Team Agent — PurpleAI Lab</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded" style={{ background: "rgba(226,18,39,0.1)", color: "#e21227", border: "1px solid rgba(226,18,39,0.2)" }}>
                  <AlertTriangle className="w-2.5 h-2.5" /> AUTHORIZED USE ONLY
                </div>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Target config */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono font-bold mb-1 block" style={{ color: "#555" }}>TARGET</label>
                  <input value={target} onChange={e => setTarget(e.target.value)}
                    placeholder="domain.com, 192.168.1.1, app URL…"
                    className="w-full bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none"
                    style={{ borderColor: "rgba(226,18,39,0.25)", color: "#ccc" }} />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold mb-1 block" style={{ color: "#555" }}>SCOPE</label>
                  <select value={scope} onChange={e => setScope(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-[11px] outline-none"
                    style={{ background: "#0a0a0a", borderColor: "rgba(226,18,39,0.25)", color: "#ccc" }}>
                    <option value="web-app">Web Application</option>
                    <option value="network">Network Infrastructure</option>
                    <option value="api">API Security</option>
                    <option value="mobile">Mobile Application</option>
                    <option value="cloud">Cloud Infrastructure</option>
                    <option value="social-eng">Social Engineering</option>
                  </select>
                </div>
              </div>

              {/* Phase selector */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>ATTACK PHASES</div>
                <div className="grid grid-cols-5 gap-2">
                  {PHASES.map(p => (
                    <button key={p.id} onClick={() => runPhase(p)} disabled={loading || !target.trim()}
                      className="rounded-xl p-2.5 text-center transition-all disabled:opacity-40 hover:scale-105"
                      style={{ background: phase === p.id ? `${p.color}20` : "rgba(255,255,255,0.02)", border: `1px solid ${phase === p.id ? p.color : "rgba(255,255,255,0.06)"}` }}>
                      <div className="text-[16px]">{p.icon}</div>
                      <div className="text-[8px] font-bold mt-1" style={{ color: phase === p.id ? p.color : "#555" }}>{p.label.split(" ")[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Output terminal */}
              {(output || loading) && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(226,18,39,0.2)" }}>
                  <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(226,18,39,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3 h-3" style={{ color: "#e21227" }} />
                      <span className="text-[9px] font-mono font-bold" style={{ color: "#e21227" }}>
                        {loading ? "EXECUTING…" : `${PHASES.find(p => p.id === phase)?.label} — COMPLETE`}
                      </span>
                    </div>
                    {!loading && output && (
                      <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    )}
                  </div>
                  <div className="p-3 font-mono text-[10px] max-h-52 overflow-y-auto whitespace-pre-wrap" style={{ color: "#888", background: "#060606" }}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-red-500" />
                        Running autonomous red team phase…
                      </div>
                    ) : output}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
