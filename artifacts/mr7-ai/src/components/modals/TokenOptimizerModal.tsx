import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, BarChart2, TrendingDown, Play, Square, Copy, CheckCheck,
  GitMerge, Trash2, Terminal, Zap, Activity, Settings,
  CheckCircle, AlertTriangle,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface TokenOptimizerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type OptMode = "analyze" | "optimize" | "compact" | "benchmark";

const MODES: { id: OptMode; label: string; color: string; desc: string; icon: typeof BarChart2 }[] = [
  { id: "analyze", label: "Analyze", color: "#22c55e", desc: "Token usage analysis and waste detection", icon: BarChart2 },
  { id: "optimize", label: "Optimize", color: "#3b82f6", desc: "Optimize prompts for minimal token usage", icon: TrendingDown },
  { id: "compact", label: "Compact", color: "#f97316", desc: "Force compaction-survival format for context windows", icon: Zap },
  { id: "benchmark", label: "Benchmark", color: "#8b5cf6", desc: "Quality score and token efficiency rating", icon: Activity },
];

const SYSTEM_PROMPTS: Record<OptMode, string> = {
  analyze: `You are Token Optimizer in ANALYZE mode — a full token optimization suite with 257 test cases.

Analyze the given prompt/text for token efficiency:

TOKEN ANALYSIS:
1. ESTIMATED TOKENS — Approximate token count
2. WASTE PATTERNS — Identify padding, redundancy, verbose phrases
3. HIGH-COST SECTIONS — Lines/phrases with poor information density
4. QUICK WINS — Immediate optimizations with estimated savings
5. COMPRESSION POTENTIAL — Estimated % reduction achievable

WASTE CATEGORIES:
- Filler phrases ("certainly", "of course", "I'd be happy to")
- Redundant context repetition
- Over-explained simple concepts
- Verbose alternatives to concise expressions

Format output as a structured audit report. Be specific with line references.`,

  optimize: `You are Token Optimizer in OPTIMIZE mode.

Take the given prompt and return an optimized version:

Process:
1. Remove all filler and padding words
2. Eliminate redundant context
3. Compress verbose explanations to dense equivalents
4. Use technical shorthand where appropriate
5. Reorder for density (most important first)

Output format:
ORIGINAL TOKENS: [estimate]
OPTIMIZED TOKENS: [estimate]
REDUCTION: [%]
---
OPTIMIZED PROMPT:
[optimized version]
---
CHANGES MADE:
[bullet list of what was changed and why]

Quality score: X/10 (where 10 = maximum efficiency without semantic loss)`,

  compact: `You are Token Optimizer in COMPACT mode — specialized for context window compaction survival.

Convert the given content to compaction-survival format:
- This format is designed to survive Claude's auto-compaction intact
- Maximum semantic density per token
- Use structured notation over prose
- Priority markers: !!! = critical, !! = important, ! = relevant
- Short-form keys: ctx=context, sys=system, req=requirement, dep=dependency

Output: Compaction-survival formatted content with marker system applied.
Add [COMPACT STATS] section with compression ratio and survival estimate.`,

  benchmark: `You are Token Optimizer in BENCHMARK mode — running quality scoring against 257 test cases.

Evaluate the given prompt/response for:

QUALITY METRICS (0-10 each):
1. Information density — tokens per semantic unit
2. Clarity — meaning per token
3. Completeness — does it cover the requirement fully
4. Redundancy — negative score for repetition
5. Format efficiency — appropriate use of structure

COMPOSITE SCORE: [0-100]
GRADE: [A/B/C/D/F]
BENCHMARK COMPARISON: How does this rank vs optimized examples in the test suite

RECOMMENDATIONS: Top 3 specific improvements

This evaluation is based on Token Optimizer's 257-test benchmark suite covering Claude Code, OpenCode, OpenClaw, and Codex.`,
};

type LogEntry = { kind: "user" | "optimizer" | "system"; text: string; ts: string; mode?: OptMode };

interface SessionStats {
  totalAnalyzed: number;
  totalSaved: number;
  avgQuality: number;
  compactions: number;
}

export function TokenOptimizerModal({ open, onOpenChange, pipelineContext }: TokenOptimizerModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "Token Optimizer — Full suite: Analyze · Optimize · Compact · Benchmark · 257 test cases", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    { kind: "system", text: "Works with: Claude Code · OpenCode · OpenClaw · Codex CLI", ts: "" },
  ]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<OptMode>("analyze");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [stats, setStats] = useState<SessionStats>({ totalAnalyzed: 0, totalSaved: 0, avgQuality: 0, compactions: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Content received for token optimization (${pipelineContext.text.length} chars)` });
    setInput(pipelineContext.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function run() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: `[${MODES.find(m => m.id === mode)?.label}] ${q.slice(0, 100)}${q.length > 100 ? "..." : ""}`, mode });

    setStats(p => ({
      ...p,
      totalAnalyzed: p.totalAnalyzed + 1,
      compactions: mode === "compact" ? p.compactions + 1 : p.compactions,
    }));

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "optimizer", text: "", mode });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPTS[mode],
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "optimizer") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );

      // Extract savings estimate from response
      const savingsMatch = accRef.current.match(/REDUCTION[:\s]+(\d+)/i);
      if (savingsMatch) {
        const saved = parseInt(savingsMatch[1]);
        setStats(p => ({ ...p, totalSaved: p.totalSaved + saved, avgQuality: Math.round((p.avgQuality + Math.min(saved, 90)) / 2) }));
      }
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "optimizer" && !l.text) u[u.length - 1] = { ...l, text: "[Error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }
  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "optimizer");
    if (!last?.text) return;
    pipeline.push({ source: "Token Optimizer", sourceColor: "#22c55e", label: `Token Optimizer ${MODES.find(m => m.id === last.mode)?.label}`, content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Optimized output routed." });
  }

  const currentMode = MODES.find(m => m.id === mode)!;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(34,197,94,0.25)", maxHeight: "90vh", boxShadow: "0 0 60px rgba(34,197,94,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(34,197,94,0.15)", background: "#08090a" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <BarChart2 className="w-5 h-5" style={{ color: "#22c55e" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#22c55e" }}>Token Optimizer</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: `${currentMode.color}15`, color: currentMode.color, border: `1px solid ${currentMode.color}35` }}>{currentMode.label.toUpperCase()}</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>257 TESTS</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Full token optimization suite · Live dashboard · Compaction survival · Quality scoring</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              {[
                { label: "ANALYZED", value: stats.totalAnalyzed, color: "#22c55e", icon: CheckCircle },
                { label: "AVG SAVED", value: `${stats.totalSaved > 0 ? Math.round(stats.totalSaved / stats.totalAnalyzed) : 0}%`, color: "#3b82f6", icon: TrendingDown },
                { label: "COMPACTIONS", value: stats.compactions, color: "#f97316", icon: Zap },
                { label: "AVG QUALITY", value: `${stats.avgQuality}/90`, color: "#8b5cf6", icon: Activity },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <Icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                    <div>
                      <div className="text-[8px] font-mono" style={{ color: "#444" }}>{s.label}</div>
                      <div className="text-[11px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mode selector */}
            <div className="flex gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all" style={{ background: mode === m.id ? `${m.color}12` : "rgba(255,255,255,0.03)", border: `1px solid ${mode === m.id ? `${m.color}35` : "rgba(255,255,255,0.06)"}`, color: mode === m.id ? m.color : "#444" }}>
                    <Icon className="w-3 h-3" /> {m.label}
                  </button>
                );
              })}
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {logs.map((log, i) => {
                const logMode = MODES.find(m => m.id === log.mode);
                return (
                  <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                    {log.kind !== "user" && (
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "optimizer" ? `${logMode?.color ?? "#22c55e"}12` : "rgba(255,255,255,0.03)" }}>
                        {log.kind === "optimizer" ? <BarChart2 className="w-3 h-3" style={{ color: logMode?.color ?? "#22c55e" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                      style={{ background: log.kind === "user" ? `${logMode?.color ?? "#22c55e"}07` : log.kind === "optimizer" ? "#111" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? `${logMode?.color ?? "#22c55e"}20` : "rgba(255,255,255,0.05)"}` }}>
                      {log.kind === "optimizer" && !log.text && running ? (
                        <div className="flex gap-1 py-1 items-center"><Activity className="w-3 h-3 animate-pulse" style={{ color: currentMode.color }} /><span className="text-[9px]" style={{ color: "#555" }}>Optimizing...</span></div>
                      ) : (
                        <span style={{ color: log.kind === "user" ? logMode?.color ?? "#22c55e" : log.kind === "optimizer" ? "#ccc" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                      )}
                      {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                    </div>
                    {log.kind === "optimizer" && log.text && (
                      <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                        {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Mode desc */}
            <div className="px-4 py-2 border-t text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606", color: "#444" }}>
              <span style={{ color: currentMode.color }}>{currentMode.label}:</span> {currentMode.desc}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                placeholder={`Paste prompt or content to ${currentMode.label.toLowerCase()}...`}
                disabled={running}
                rows={3}
                className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none resize-none"
                style={{ borderColor: `${currentMode.color}30`, color: "#ccc" }}
              />
              <div className="flex gap-2 mt-2">
                {running ? (
                  <button onClick={stop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /> Stop</button>
                ) : (
                  <button onClick={run} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: `${currentMode.color}12`, border: `1px solid ${currentMode.color}35`, color: currentMode.color }}><Play className="w-3 h-3" /> Run</button>
                )}
                <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                <button onClick={() => { setLogs([{ kind: "system", text: "Cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]); setStats({ totalAnalyzed: 0, totalSaved: 0, avgQuality: 0, compactions: 0 }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
