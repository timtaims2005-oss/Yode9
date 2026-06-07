import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Play, Square, Copy, CheckCheck, GitMerge,
  Trash2, Terminal, TrendingDown, Brain, Filter, Zap,
  BarChart2, Settings,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface GovernorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type GovernorMode = "hygiene" | "compress" | "compact" | "drift";

const MODES: { id: GovernorMode; label: string; color: string; desc: string; icon: typeof Shield }[] = [
  { id: "hygiene", label: "Context Hygiene", color: "#06b6d4", desc: "Filter tool output, remove noise, keep signal", icon: Filter },
  { id: "compress", label: "Memory Compress", color: "#8b5cf6", desc: "Compress conversation memory to essentials", icon: TrendingDown },
  { id: "compact", label: "Compact Mode", color: "#10b981", desc: "Force minimal, dense output format", icon: Zap },
  { id: "drift", label: "Drift Check", color: "#f97316", desc: "Detect and correct goal drift in long sessions", icon: Brain },
];

const SYSTEM_PROMPTS: Record<GovernorMode, string> = {
  hygiene: `You are Governor in CONTEXT HYGIENE mode — a Claude Code plugin that manages session health.

Your role: Filter and clean AI tool outputs to preserve only actionable signal.

When given tool output or AI responses:
1. FILTER: Remove verbose logging, stack traces beyond the critical line, redundant confirmations
2. PRESERVE: Error messages, file paths, key values, action results, warnings
3. SUMMARIZE: Compress multi-line outputs to their semantic core
4. FLAG: Mark any output that seems anomalous or unexpected

Format: Present cleaned output first, then a [GOVERNOR SUMMARY] section with what was filtered and why.`,

  compress: `You are Governor in MEMORY COMPRESSION mode.

Your role: Take conversation history or memory context and compress it to the essential facts needed for future turns.

Process:
1. EXTRACT: Key decisions made, constraints established, facts confirmed
2. DISCARD: Exploratory reasoning that led to dead ends, repetitive exchanges, raw output
3. SYNTHESIZE: Combine related facts into compressed statements
4. FORMAT: Output as numbered memory entries, each under 50 words

Output format:
COMPRESSED MEMORY (N entries):
1. [fact]
2. [fact]
...
DISCARDED: [brief summary of what was dropped and why]`,

  compact: `You are Governor in COMPACT MODE.

All responses must be maximally dense and minimal. Rules:
- No padding words ("certainly", "of course", "I'd be happy to")
- No restating the question
- Bullet points over prose where possible
- Code blocks for any technical content
- Maximum 3 sentences per concept
- Numbers and specifics over adjectives

Answer the question as if token cost is $1 per word.`,

  drift: `You are Governor in DRIFT CHECK mode.

Your role: Analyze a task description and current conversation state to detect goal drift.

Check for:
1. SCOPE CREEP: Has the task grown beyond original intent?
2. GOAL SUBSTITUTION: Is the current focus different from the original goal?
3. ASSUMPTION DRIFT: Have unstated assumptions shifted the direction?
4. PRIORITY INVERSION: Are secondary goals now treated as primary?

Output:
ORIGINAL GOAL: [extracted from context]
CURRENT FOCUS: [what is actually happening]
DRIFT DETECTED: [yes/no] — [description]
CORRECTION: [how to get back on track]`,
};

type LogEntry = { kind: "user" | "governor" | "system"; text: string; ts: string };

export function GovernorModal({ open, onOpenChange, pipelineContext }: GovernorModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "Governor — Context hygiene · Memory compression · Compact mode · Drift guardrails", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
  ]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<GovernorMode>("hygiene");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [filterStrength, setFilterStrength] = useState<"light" | "medium" | "aggressive">("medium");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Content received for processing: "${pipelineContext.text.slice(0, 100)}..."` });
    setInput(pipelineContext.text.slice(0, 2000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function process() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: q });
    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "governor", text: "" });

    const strengthNote = `\n\nFilter strength: ${filterStrength}. ${filterStrength === "light" ? "Preserve most content, only remove obvious noise." : filterStrength === "medium" ? "Balance compression and completeness." : "Aggressive compression — keep only critical signal."}`;

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPTS[mode] + strengthNote,
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "governor") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "governor" && !l.text) u[u.length - 1] = { ...l, text: "[Error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }
  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "governor");
    if (!last?.text) return;
    pipeline.push({ source: "Governor", sourceColor: "#06b6d4", label: `Governor ${MODES.find(m => m.id === mode)?.label}`, content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Governor output routed." });
  }

  const currentMode = MODES.find(m => m.id === mode)!;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(6,182,212,0.25)", maxHeight: "90vh", boxShadow: "0 0 60px rgba(6,182,212,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(6,182,212,0.15)", background: "#080a0a" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)" }}>
                <Shield className="w-5 h-5" style={{ color: "#06b6d4" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#06b6d4" }}>Governor</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: `${currentMode.color}15`, color: currentMode.color, border: `1px solid ${currentMode.color}35` }}>{currentMode.label.toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Claude Code context hygiene · Tool-output filtering · Memory compression · Drift guardrails</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Mode + settings bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all" style={{ background: mode === m.id ? `${m.color}12` : "rgba(255,255,255,0.03)", border: `1px solid ${mode === m.id ? `${m.color}35` : "rgba(255,255,255,0.07)"}`, color: mode === m.id ? m.color : "#444" }}>
                    <Icon className="w-3 h-3" /> {m.label}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-1.5">
                <Settings className="w-3 h-3" style={{ color: "#444" }} />
                {(["light", "medium", "aggressive"] as const).map(s => (
                  <button key={s} onClick={() => setFilterStrength(s)} className="px-2 py-1 rounded text-[8px] font-bold font-mono transition-all" style={{ background: filterStrength === s ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)", color: filterStrength === s ? "#06b6d4" : "#444" }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                  {log.kind !== "user" && (
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "governor" ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.03)" }}>
                      {log.kind === "governor" ? <Shield className="w-3 h-3" style={{ color: "#06b6d4" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                    style={{ background: log.kind === "user" ? "rgba(6,182,212,0.07)" : log.kind === "governor" ? "#111" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                    {log.kind === "governor" && !log.text && running ? (
                      <div className="flex gap-1 py-1">{[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#06b6d4", animationDelay: `${d * 0.15}s` }} />)}</div>
                    ) : (
                      <span style={{ color: log.kind === "user" ? "#06b6d4" : log.kind === "governor" ? "#ccc" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                    )}
                    {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                  </div>
                  {log.kind === "governor" && log.text && (
                    <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                      {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                    </button>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Mode description */}
            <div className="px-4 py-2 border-t text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606", color: "#444" }}>
              <span style={{ color: currentMode.color }}>{currentMode.label}:</span> {currentMode.desc} · Filter: <span style={{ color: "#06b6d4" }}>{filterStrength}</span>
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); process(); } }}
                placeholder={`Paste tool output, memory, or conversation to ${currentMode.label.toLowerCase()}...`}
                disabled={running}
                rows={3}
                className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none resize-none transition-all"
                style={{ borderColor: `${currentMode.color}30`, color: "#ccc" }}
              />
              <div className="flex gap-2 mt-2">
                {running ? (
                  <button onClick={stop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /> Stop</button>
                ) : (
                  <button onClick={process} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: `${currentMode.color}12`, border: `1px solid ${currentMode.color}35`, color: currentMode.color }}><Play className="w-3 h-3" /> Process</button>
                )}
                <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                <button onClick={() => setLogs([{ kind: "system", text: "Governor cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                <div className="ml-auto flex items-center gap-1 text-[9px] font-mono" style={{ color: "#2a2a2a" }}><BarChart2 className="w-3 h-3" />{logs.filter(l => l.kind === "governor").length} processed</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
