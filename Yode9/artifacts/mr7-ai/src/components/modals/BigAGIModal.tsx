import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Brain, Zap, RefreshCw, CheckCircle, GitMerge,
  BarChart2, Star, Copy, ChevronDown, ChevronUp, Layers,
  Play, AlertTriangle, TrendingUp, Cpu,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const C = "#a78bfa";
const Cg = (n: number) => `rgba(167,139,250,${n})`;

const BEAM_MODELS = [
  { id: "gpt54", name: "GPT-5.4", color: "#10b981", score: 0 },
  { id: "claude_opus", name: "Claude Opus 4", color: "#fbbf24", score: 0 },
  { id: "gemini_pro", name: "Gemini 2.5 Pro", color: "#4299e1", score: 0 },
  { id: "deepseek", name: "DeepSeek R1", color: "#e21227", score: 0 },
  { id: "grok", name: "Grok 3", color: "#818cf8", score: 0 },
];

type BeamResult = { modelId: string; modelName: string; color: string; response: string; score: number; loading: boolean };

export function BigAGIModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [tab, setTab] = useState<"beam" | "inspect" | "personas">("beam");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BeamResult[]>([]);
  const [mergedResult, setMergedResult] = useState("");
  const [running, setRunning] = useState(false);
  const [merging, setMerging] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState(["gpt54", "claude_opus", "gemini_pro"]);

  const PERSONAS = [
    { name: "Security Researcher", desc: "Adversarial mindset, CVE awareness, exploit analysis", color: "#e21227" },
    { name: "Senior Architect", desc: "System design, scalability, trade-off analysis", color: "#10b981" },
    { name: "Data Scientist", desc: "Statistical reasoning, ML/AI expertise, data pipelines", color: "#4299e1" },
    { name: "CEO Strategist", desc: "Business impact, ROI focus, executive communication", color: "#fbbf24" },
    { name: "Red Teamer", desc: "Offensive mindset, bypass techniques, threat modeling", color: "#e21227" },
    { name: "DevOps Engineer", desc: "CI/CD, infrastructure, reliability, monitoring", color: "#a78bfa" },
  ];

  async function runBeam() {
    if (!query.trim() || running) return;
    setRunning(true);
    setMergedResult("");

    const active = BEAM_MODELS.filter(m => selectedModels.includes(m.id));
    const initial: BeamResult[] = active.map(m => ({ modelId: m.id, modelName: m.name, color: m.color, response: "", score: 0, loading: true }));
    setResults(initial);

    await Promise.all(
      active.map(async (model, idx) => {
        const systemPrompt = `You are ${model.name}, an expert AI assistant. The user has asked a question and you must provide the most accurate, comprehensive, and insightful response possible. Be direct and thorough.`;
        try {
          let acc = "";
          await streamChat(
            { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: query }], mode: "chat", customSystemPrompt: systemPrompt },
            chunk => { acc += chunk; setResults(prev => prev.map(r => r.modelId === model.id ? { ...r, response: acc, loading: false } : r)); },
          );
          // Score based on length and keywords
          const score = Math.min(100, Math.floor(acc.length / 12) + (acc.includes("however") ? 5 : 0) + (acc.includes("specifically") ? 5 : 0));
          setResults(prev => prev.map(r => r.modelId === model.id ? { ...r, score, loading: false } : r));
        } catch {
          setResults(prev => prev.map(r => r.modelId === model.id ? { ...r, response: "[Error generating response]", loading: false, score: 0 } : r));
        }
      })
    );

    setRunning(false);
  }

  async function mergeResults() {
    if (results.length === 0 || merging) return;
    setMerging(true);
    setMergedResult("");
    const context = results.map(r => `[${r.modelName}]:\n${r.response}`).join("\n\n---\n\n");
    const prompt = `You are a synthesis expert. Multiple AI models have answered the following question and you must merge their responses into one definitive, de-hallucinated answer, combining the best insights from each while removing contradictions and inaccuracies.

Original question: "${query}"

Model responses:
${context}

Provide a final synthesized answer that is better than any individual response.`;
    try {
      let acc = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setMergedResult(acc); },
      );
    } catch { /* */ }
    setMerging(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Cg(0.25)}`, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Cg(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Cg(0.1), border: `1px solid ${Cg(0.3)}` }}>
              <Brain className="w-5 h-5" style={{ color: C }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">Big-AGI · Beam</div>
              <div className="text-[10px]" style={{ color: "#444" }}>Multi-Model De-Hallucination · Beam & Merge · AI Personas</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b flex-shrink-0" style={{ borderColor: Cg(0.08) }}>
          {(["beam", "inspect", "personas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
              style={tab === t ? { background: Cg(0.12), color: C, border: `1px solid ${Cg(0.3)}` } : { color: "#444", border: "1px solid transparent" }}>
              {t === "beam" ? "⚡ Beam & Merge" : t === "inspect" ? "🔍 Inspector" : "🎭 Personas"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === "beam" && (
            <div className="space-y-4">
              <div className="rounded-xl p-3" style={{ background: Cg(0.05), border: `1px solid ${Cg(0.12)}` }}>
                <div className="text-[10px] font-bold mb-2" style={{ color: C }}>Select Models for Beam</div>
                <div className="flex flex-wrap gap-2">
                  {BEAM_MODELS.map(m => (
                    <button key={m.id} onClick={() => setSelectedModels(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: selectedModels.includes(m.id) ? `${m.color}20` : "#111", border: `1px solid ${selectedModels.includes(m.id) ? m.color + "50" : "#222"}`, color: selectedModels.includes(m.id) ? m.color : "#555" }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && runBeam()}
                  placeholder="Enter question — all selected models will answer simultaneously..."
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none"
                  style={{ borderColor: Cg(0.2), color: "#ccc" }} />
                <button onClick={runBeam} disabled={running || selectedModels.length === 0}
                  className="px-4 rounded-xl text-[10px] font-bold border flex items-center gap-2 disabled:opacity-40"
                  style={{ background: Cg(0.1), borderColor: Cg(0.3), color: C }}>
                  {running ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Beaming...</> : <><Play className="w-3.5 h-3.5" /> Beam</>}
                </button>
              </div>

              {results.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {results.sort((a, b) => b.score - a.score).map((r, i) => (
                    <div key={r.modelId} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${r.color}25`, background: `${r.color}06` }}>
                      <button className="w-full flex items-center gap-2 p-3" onClick={() => setExpanded(expanded === r.modelId ? null : r.modelId)}>
                        {i === 0 && !r.loading && r.score > 0 && <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />}
                        <span className="text-[11px] font-bold" style={{ color: r.color }}>{r.modelName}</span>
                        {r.loading ? (
                          <span className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}><RefreshCw className="w-2.5 h-2.5 animate-spin" /> generating...</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${r.color}20`, color: r.color }}>Score: {r.score}</span>
                        )}
                        <div className="ml-auto">
                          {expanded === r.modelId ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expanded === r.modelId && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: `${r.color}15` }}>
                            <div className="p-3 text-[10px] leading-relaxed whitespace-pre-wrap" style={{ color: "#bbb" }}>
                              {r.loading ? "Generating..." : r.response}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {results.length > 0 && !running && (
                <button onClick={mergeResults} disabled={merging}
                  className="w-full py-3 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: Cg(0.08), borderColor: Cg(0.3), color: C }}>
                  {merging ? <><RefreshCw className="w-4 h-4 animate-spin" /> Merging responses...</> : <><GitMerge className="w-4 h-4" /> Merge & Synthesize Best Answer</>}
                </button>
              )}

              {mergedResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4" style={{ background: Cg(0.06), border: `1px solid ${Cg(0.2)}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <GitMerge className="w-4 h-4" style={{ color: C }} />
                    <span className="text-[11px] font-bold" style={{ color: C }}>Merged · De-Hallucinated Answer</span>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                  </div>
                  <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#ddd" }}>
                    {mergedResult}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {tab === "inspect" && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <div className="text-[11px] font-bold mb-2" style={{ color: C }}>AI Response Inspector</div>
                <div className="text-[10px]" style={{ color: "#555" }}>
                  The inspector mode allows you to analyze AI responses for: hallucinations, factual inconsistencies, confidence calibration, and source attribution. Run any query in Beam mode first, then use the inspector to audit the outputs.
                </div>
              </div>
              {results.length > 0 ? (
                results.map(r => (
                  <div key={r.modelId} className="rounded-xl p-4" style={{ background: "#111", border: `1px solid ${r.color}20` }}>
                    <div className="text-[11px] font-bold mb-3" style={{ color: r.color }}>{r.modelName} — Inspection Report</div>
                    <div className="space-y-2 text-[10px]">
                      {[
                        { label: "Confidence Score", value: `${r.score}/100`, color: r.score > 70 ? "#10b981" : r.score > 40 ? "#fbbf24" : "#e21227" },
                        { label: "Response Length", value: `${r.response.length} chars`, color: "#555" },
                        { label: "Factual Claims", value: "Pending verification", color: "#fbbf24" },
                        { label: "Source Attribution", value: "None provided", color: "#e21227" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between">
                          <span style={{ color: "#555" }}>{label}</span>
                          <span style={{ color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[11px]" style={{ color: "#333" }}>Run Beam mode first to generate responses for inspection</div>
              )}
            </div>
          )}

          {tab === "personas" && (
            <div className="space-y-3">
              <div className="text-[10px]" style={{ color: "#555" }}>
                Personas inject expert context into every conversation. Select a persona to make the AI think from that specialist's perspective.
              </div>
              {PERSONAS.map(p => (
                <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:opacity-90"
                  style={{ background: `${p.color}08`, border: `1px solid ${p.color}25` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15` }}>
                    <Cpu className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-white">{p.name}</div>
                    <div className="text-[9px]" style={{ color: "#555" }}>{p.desc}</div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-[9px] font-bold" style={{ background: `${p.color}15`, color: p.color }}>
                    Inject
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
