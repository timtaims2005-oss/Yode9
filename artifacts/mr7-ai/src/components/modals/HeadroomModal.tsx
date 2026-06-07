import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Layers, TrendingDown, Play, Square, Copy, CheckCheck,
  GitMerge, Trash2, Terminal, Zap, BarChart2, Brain,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface HeadroomModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type Algorithm = "smart" | "code" | "kompress" | "semantic" | "hybrid" | "extreme";

const ALGORITHMS: { id: Algorithm; label: string; color: string; ratio: string; desc: string }[] = [
  { id: "smart", label: "SmartCrusher", color: "#a78bfa", ratio: "60-70%", desc: "General-purpose intelligent compression. Best for prose and technical text." },
  { id: "code", label: "CodeCompressor", color: "#10b981", ratio: "65-80%", desc: "Specialized for source code. Removes comments, whitespace, normalizes syntax." },
  { id: "kompress", label: "Kompress-base", color: "#06b6d4", ratio: "55-65%", desc: "Conservative compression. Safest for critical content requiring full fidelity." },
  { id: "semantic", label: "Semantic Crush", color: "#f97316", ratio: "70-85%", desc: "Meaning-preserving semantic compression. High ratio, low information loss." },
  { id: "hybrid", label: "Hybrid Mode", color: "#fbbf24", ratio: "75-90%", desc: "Combines all algorithms. Applies each to the optimal content type within input." },
  { id: "extreme", label: "Extreme Crush", color: "#e21227", ratio: "85-95%", desc: "Maximum compression. Warning: may lose nuance. Use for context carryover only." },
];

const SYSTEM_PROMPTS: Record<Algorithm, string> = {
  smart: `You are Headroom SmartCrusher — a context compression system that achieves 60-70% token reduction.

Compress the given text intelligently:
- Remove filler words, redundant phrases, verbose explanations
- Preserve all factual content, numbers, proper nouns, key terms
- Convert passive to active voice
- Abbreviate well-known concepts
- Use dense but natural language

Output: [COMPRESSED] marker, then compressed text, then [STATS] with estimated compression ratio.`,

  code: `You are Headroom CodeCompressor — specialized code compression achieving 65-80% token reduction.

Compress the given code/technical content:
- Remove comments (unless critical to understanding)
- Compress variable names where clear from context
- Remove whitespace beyond minimal formatting
- Collapse multi-line patterns to single line where possible
- Remove boilerplate imports if implied by context

Output: [COMPRESSED CODE] marker, then compressed code, then [STATS] with ratio.`,

  kompress: `You are Headroom Kompress-base — conservative compression achieving 55-65% reduction.

Apply minimal, safe compression:
- Remove only clear redundancy and filler
- Preserve exact terminology and all technical details
- Keep all numbers and measurements
- Never abbreviate critical terms
- Maintain paragraph structure

This mode prioritizes fidelity over ratio. Output: [COMPRESSED] marker, result, then [STATS].`,

  semantic: `You are Headroom Semantic Crush — meaning-preserving compression achieving 70-85% reduction.

Use semantic compression:
- Extract core meaning, discard surface-level phrasing
- Represent ideas in their most compressed semantic form
- Group related concepts into single dense statements
- Use technical shorthand where unambiguous
- Output may restructure original flow for density

Output: [SEMANTIC COMPRESSION] marker, result, then [STATS] with original vs compressed token estimate.`,

  hybrid: `You are Headroom Hybrid Mode — adaptive multi-algorithm compression achieving 75-90% reduction.

Analyze the input and apply appropriate algorithm per section:
- Code sections → CodeCompressor
- Technical prose → Semantic Crush
- Lists/enumerations → Kompress
- Narrative text → SmartCrusher

Label each section with its algorithm. Output: [HYBRID COMPRESSION] marker, annotated result, [ALGORITHM MAP], then [STATS].`,

  extreme: `You are Headroom Extreme Crush — maximum compression achieving 85-95% reduction.

Compress ruthlessly:
- Keep only the irreducible semantic core
- Convert everything to terse, dense notes
- Use abbreviations freely
- Merge all related points
- Strip all examples, analogies, elaboration

WARNING: This mode prioritizes token savings over completeness. Use for context carryover only.
Output: [EXTREME COMPRESSION] marker, result, [STATS] with aggressive ratio.`,
};

type LogEntry = { kind: "user" | "headroom" | "system"; text: string; ts: string; algo?: Algorithm };

export function HeadroomModal({ open, onOpenChange, pipelineContext }: HeadroomModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "Headroom — Context compression layer · 60-95% token reduction · 6 algorithms · Cross-agent memory", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
  ]);
  const [running, setRunning] = useState(false);
  const [algo, setAlgo] = useState<Algorithm>("smart");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Content received for compression (${pipelineContext.text.length} chars)` });
    setInput(pipelineContext.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function compress() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    const algoObj = ALGORITHMS.find(a => a.id === algo)!;
    addLog({ kind: "user", text: `[${algoObj.label}] ${q.slice(0, 100)}${q.length > 100 ? "..." : ""}`, algo });

    const estSaving = parseInt(algoObj.ratio.split("-")[0]);
    setTotalSavings(p => p + estSaving);

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "headroom", text: "", algo });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPTS[algo],
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "headroom") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "headroom" && !l.text) u[u.length - 1] = { ...l, text: "[Compression error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }
  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "headroom");
    if (!last?.text) return;
    pipeline.push({ source: "Headroom", sourceColor: "#a78bfa", label: `Headroom ${ALGORITHMS.find(a => a.id === last.algo)?.label ?? "Compression"}`, content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Compressed output routed." });
  }

  const currentAlgo = ALGORITHMS.find(a => a.id === algo)!;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(167,139,250,0.25)", maxHeight: "90vh", boxShadow: "0 0 60px rgba(167,139,250,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.15)", background: "#090809" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)" }}>
                <Layers className="w-5 h-5" style={{ color: "#a78bfa" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#a78bfa" }}>Headroom</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: `${currentAlgo.color}15`, color: currentAlgo.color, border: `1px solid ${currentAlgo.color}35` }}>{currentAlgo.label.toUpperCase()}</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>{currentAlgo.ratio} reduction</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Context compression · 6 algorithms · Proxy/MCP/library modes · Cross-agent memory</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Algorithm selector */}
            <div className="grid grid-cols-3 gap-1.5 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              {ALGORITHMS.map(a => (
                <button key={a.id} onClick={() => setAlgo(a.id)} className="flex items-center justify-between px-2.5 py-2 rounded-lg text-[9px] font-bold transition-all" style={{ background: algo === a.id ? `${a.color}12` : "rgba(255,255,255,0.03)", border: `1px solid ${algo === a.id ? `${a.color}35` : "rgba(255,255,255,0.06)"}`, color: algo === a.id ? a.color : "#444" }}>
                  <span>{a.label}</span>
                  <span className="font-mono text-[8px] opacity-70">{a.ratio}</span>
                </button>
              ))}
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {logs.map((log, i) => {
                const logAlgo = ALGORITHMS.find(a => a.id === log.algo);
                return (
                  <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                    {log.kind !== "user" && (
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "headroom" ? `${logAlgo?.color ?? "#a78bfa"}12` : "rgba(255,255,255,0.03)" }}>
                        {log.kind === "headroom" ? <TrendingDown className="w-3 h-3" style={{ color: logAlgo?.color ?? "#a78bfa" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                      style={{ background: log.kind === "user" ? `${logAlgo?.color ?? "#a78bfa"}08` : log.kind === "headroom" ? "#111" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? `${logAlgo?.color ?? "#a78bfa"}20` : "rgba(255,255,255,0.05)"}` }}>
                      {log.kind === "headroom" && !log.text && running ? (
                        <div className="flex gap-1 py-1 items-center">
                          <TrendingDown className="w-3 h-3 animate-pulse" style={{ color: currentAlgo.color }} />
                          <span className="text-[9px]" style={{ color: "#555" }}>Compressing...</span>
                        </div>
                      ) : (
                        <span style={{ color: log.kind === "user" ? logAlgo?.color ?? "#a78bfa" : log.kind === "headroom" ? "#ccc" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                      )}
                      {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                    </div>
                    {log.kind === "headroom" && log.text && (
                      <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                        {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Algo description */}
            <div className="px-4 py-2 border-t text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606", color: "#444" }}>
              <span style={{ color: currentAlgo.color }}>{currentAlgo.label}:</span> {currentAlgo.desc}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); compress(); } }}
                placeholder={`Paste content to compress with ${currentAlgo.label} (${currentAlgo.ratio} reduction)...`}
                disabled={running}
                rows={3}
                className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none resize-none"
                style={{ borderColor: `${currentAlgo.color}30`, color: "#ccc" }}
              />
              <div className="flex gap-2 mt-2">
                {running ? (
                  <button onClick={stop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /> Stop</button>
                ) : (
                  <button onClick={compress} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: `${currentAlgo.color}12`, border: `1px solid ${currentAlgo.color}35`, color: currentAlgo.color }}><Play className="w-3 h-3" /> Compress</button>
                )}
                <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                <button onClick={() => { setLogs([{ kind: "system", text: "Headroom cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]); setTotalSavings(0); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                {totalSavings > 0 && (
                  <div className="ml-auto flex items-center gap-1.5 text-[9px] font-mono" style={{ color: "#10b981" }}>
                    <TrendingDown className="w-3 h-3" /><span>~{totalSavings}% total savings</span>
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
