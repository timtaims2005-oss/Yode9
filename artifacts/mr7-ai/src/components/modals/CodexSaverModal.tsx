import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingDown, Cpu, Shield, Copy, CheckCheck, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CodexSaverModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ROUTING_RULES = [
  { task: "Write unit tests", risk: "low", router: "Worker LLM", saving: "85%", icon: "🧪" },
  { task: "Generate documentation", risk: "low", router: "Worker LLM", saving: "90%", icon: "📝" },
  { task: "Code search / grep", risk: "low", router: "Worker LLM", saving: "95%", icon: "🔍" },
  { task: "Explain code", risk: "low", router: "Worker LLM", saving: "80%", icon: "💬" },
  { task: "Architecture decisions", risk: "high", router: "Main LLM", saving: "0%", icon: "🏗️" },
  { task: "Security review", risk: "high", router: "Main LLM", saving: "0%", icon: "🔐" },
  { task: "Final code review", risk: "high", router: "Main LLM", saving: "0%", icon: "✅" },
  { task: "Refactor complex logic", risk: "medium", router: "Hybrid", saving: "40%", icon: "♻️" },
];

export function CodexSaverModal({ open, onOpenChange }: CodexSaverModalProps) {
  const [task, setTask] = useState("");
  const [result, setResult] = useState<null | { router: string; reason: string; saving: string }>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);

  async function analyze() {
    if (!task.trim()) return;
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 900));

    const lower = task.toLowerCase();
    const isHigh = ["architect","security","design","critical","production","deploy","auth","payments","migrate"].some(k => lower.includes(k));
    const isLow = ["test","doc","explain","search","grep","comment","readme","format","lint","style"].some(k => lower.includes(k));

    let router, reason, saving;
    if (isHigh) {
      router = "Main LLM (Codex)";
      reason = "High-risk judgment required — architecture, security, or protected domain detected.";
      saving = "0%";
    } else if (isLow) {
      router = "Worker LLM (Pi Agent)";
      reason = "Low-risk development work. Safe to delegate to cheaper worker — test gen, docs, search.";
      saving = `${70 + Math.floor(Math.random() * 25)}%`;
      setTotalSaved(s => s + 1);
    } else {
      router = "Hybrid — Worker first, Main review";
      reason = "Medium complexity. Worker handles execution, Codex validates final output.";
      saving = `${30 + Math.floor(Math.random() * 20)}%`;
      setTotalSaved(s => s + 1);
    }

    setResult({ router, reason, saving });
    pipeline.push({ source: "CodexSaver", sourceColor: "#22d3ee", label: `Routed: ${task}`, content: `Task: ${task}\nRouter: ${router}\nSaving: ${saving}\nReason: ${reason}` });
    setLoading(false);
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(`Task: ${task}\nRouter: ${result.router}\nCost saving: ${result.saving}\nReason: ${result.reason}`);
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
          <motion.div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(34,211,238,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(34,211,238,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)" }}>
                  <TrendingDown className="w-4 h-4" style={{ color: "#22d3ee" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">CodexSaver</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Cost-aware AI router — cheaper without dumber</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Tasks Routed", value: totalSaved.toString(), color: "#22d3ee" },
                  { label: "Avg Saving", value: totalSaved > 0 ? "~75%" : "—", color: "#10b981" },
                  { label: "Mode", value: "Smart Router", color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[16px] font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "#444" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Task analyzer */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.12)" }}>
                <div className="text-[10px] font-bold font-mono" style={{ color: "#22d3ee" }}>TASK ROUTER ANALYZER</div>
                <textarea
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="Describe your task… e.g. 'Write unit tests for auth module' or 'Design microservices architecture'"
                  rows={3}
                  className="w-full bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none resize-none"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }}
                />
                <button onClick={analyze} disabled={!task.trim() || loading}
                  className="w-full py-2 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-40"
                  style={{ background: "rgba(34,211,238,0.1)", borderColor: "rgba(34,211,238,0.3)", color: "#22d3ee" }}>
                  {loading ? "Analyzing…" : "Analyze & Route"}
                </button>
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          {result.router.includes("Worker") ? <Cpu className="w-4 h-4" style={{ color: "#10b981" }} /> : result.router.includes("Hybrid") ? <Zap className="w-4 h-4" style={{ color: "#fbbf24" }} /> : <Shield className="w-4 h-4" style={{ color: "#e21227" }} />}
                          <span className="text-[12px] font-bold" style={{ color: result.router.includes("Worker") ? "#10b981" : result.router.includes("Hybrid") ? "#fbbf24" : "#e21227" }}>{result.router}</span>
                        </div>
                        <div className="text-[10px]" style={{ color: "#666" }}>{result.reason}</div>
                      </div>
                      <div className="text-center flex-shrink-0">
                        <div className="text-[20px] font-bold" style={{ color: "#10b981" }}>{result.saving}</div>
                        <div className="text-[9px]" style={{ color: "#444" }}>cost saving</div>
                      </div>
                    </div>
                    <button onClick={copyResult} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#555" }}>
                      {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy result</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Routing table */}
              <div>
                <div className="text-[10px] font-bold font-mono mb-3" style={{ color: "#444" }}>DEFAULT ROUTING RULES</div>
                <div className="space-y-1.5">
                  {ROUTING_RULES.map(r => (
                    <div key={r.task} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span className="text-[11px]" style={{ color: "#888" }}>{r.task}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{
                          background: r.risk === "high" ? "rgba(226,18,39,0.1)" : r.risk === "low" ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
                          color: r.risk === "high" ? "#e21227" : r.risk === "low" ? "#10b981" : "#fbbf24"
                        }}>{r.risk.toUpperCase()}</span>
                        <span className="text-[9px] font-mono" style={{ color: "#22d3ee" }}>save {r.saving}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
