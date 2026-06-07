import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FlaskConical, Search, BookOpen, Play, Square,
  Copy, CheckCheck, GitMerge, Trash2, Terminal,
  FileText, Microscope, BarChart2,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface FeynmanModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type ResearchMode = "deep" | "litreview" | "audit" | "replicate";

const MODES: { id: ResearchMode; label: string; icon: typeof FlaskConical; color: string; desc: string; prompt: string }[] = [
  {
    id: "deep", label: "Deep Research", icon: Search, color: "#3b82f6",
    desc: "Comprehensive multi-angle research on any topic with source synthesis",
    prompt: `You are Feynman in DEEP RESEARCH mode. Conduct thorough, multi-perspective research on the given topic.

Structure your response as:
1. OVERVIEW — Core concepts and current state
2. KEY FINDINGS — Main discoveries, data, evidence
3. COMPETING PERSPECTIVES — Different schools of thought
4. SYNTHESIS — Your integrated analysis
5. OPEN QUESTIONS — What remains unknown or contested
6. SOURCES TO EXPLORE — Recommend specific papers/books/researchers

Be rigorous, cite reasoning, acknowledge uncertainty. Depth over breadth.`,
  },
  {
    id: "litreview", label: "Literature Review", icon: BookOpen, color: "#8b5cf6",
    desc: "Structured review of research landscape on a topic",
    prompt: `You are Feynman in LITERATURE REVIEW mode. Provide a structured academic literature review.

Structure your response as:
1. RESEARCH LANDSCAPE — Overview of the field
2. SEMINAL WORKS — Foundational papers and their contributions
3. RECENT DEVELOPMENTS — Last 3-5 years of advances
4. METHODOLOGICAL APPROACHES — How research is conducted in this field
5. CONSENSUS AND CONTROVERSY — Where researchers agree/disagree
6. GAPS IN LITERATURE — What has not been studied
7. RESEARCH DIRECTIONS — Promising future directions

Cite specific papers, authors, and journals where possible.`,
  },
  {
    id: "audit", label: "Paper Audit", icon: FileText, color: "#f97316",
    desc: "Critical analysis and fact-checking of a paper or claim",
    prompt: `You are Feynman in PAPER AUDIT mode. Critically analyze the given paper, study, or claim.

Structure your response as:
1. CLAIM SUMMARY — What is being claimed
2. METHODOLOGY REVIEW — How was it studied, strengths/weaknesses
3. STATISTICAL ANALYSIS — Sample size, p-values, effect sizes, validity
4. CONFOUNDERS — What alternative explanations were not accounted for
5. REPLICATION STATUS — Has it been replicated? By whom?
6. EXPERT CONSENSUS — What does the broader scientific community say
7. VERDICT — Credibility rating (1-10) with reasoning

Be adversarially rigorous. Assume nothing. Question everything.`,
  },
  {
    id: "replicate", label: "Experiment Replication", icon: Microscope, color: "#10b981",
    desc: "Design a replication protocol for a study or experiment",
    prompt: `You are Feynman in EXPERIMENT REPLICATION mode. Design a detailed replication protocol.

Structure your response as:
1. ORIGINAL STUDY SUMMARY — What was done and found
2. REPLICATION DESIGN — Step-by-step protocol
3. SAMPLE REQUIREMENTS — Size, demographics, criteria
4. MATERIALS AND TOOLS — What is needed
5. MEASUREMENTS — How to measure outcomes, instruments
6. CONTROLS — How to eliminate confounds
7. ANALYSIS PLAN — How to analyze results
8. EXPECTED OUTCOMES — What would confirm or refute the original

Be specific enough that someone could execute this protocol.`,
  },
];

type LogEntry = { kind: "user" | "feynman" | "system"; text: string; ts: string; mode?: ResearchMode };

export function FeynmanModal({ open, onOpenChange, pipelineContext }: FeynmanModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "Feynman Research Agent — Deep Research · Literature Review · Paper Audit · Experiment Replication", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
  ]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<ResearchMode>("deep");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Context received for research: "${pipelineContext.text.slice(0, 100)}..."` });
    setInput(pipelineContext.text.slice(0, 500));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function research() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    const modeObj = MODES.find(m => m.id === mode)!;
    addLog({ kind: "user", text: `[${modeObj.label}] ${q}`, mode });
    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "feynman", text: "", mode });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: modeObj.prompt,
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "feynman") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "feynman" && !l.text) u[u.length - 1] = { ...l, text: "[Research error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }
  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "feynman");
    if (!last?.text) return;
    pipeline.push({ source: "Feynman", sourceColor: "#3b82f6", label: `Feynman ${MODES.find(m => m.id === last.mode)?.label ?? "Research"}`, content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Research routed to pipeline." });
  }

  const currentMode = MODES.find(m => m.id === mode)!;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(59,130,246,0.25)", maxHeight: "90vh", boxShadow: "0 0 60px rgba(59,130,246,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(59,130,246,0.15)", background: "#08090a" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <FlaskConical className="w-5 h-5" style={{ color: "#3b82f6" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#3b82f6" }}>Feynman</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: `${currentMode.color}15`, color: currentMode.color, border: `1px solid ${currentMode.color}35` }}>{currentMode.label.toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Open-source AI Research Agent · Deep Research · Literature Review · Paper Audit · Replication</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Mode selector */}
            <div className="flex gap-2 px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              {MODES.map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all" style={{ background: mode === m.id ? `${m.color}15` : "rgba(255,255,255,0.03)", border: `1px solid ${mode === m.id ? `${m.color}35` : "rgba(255,255,255,0.07)"}`, color: mode === m.id ? m.color : "#444" }}>
                    <Icon className="w-3 h-3" /> {m.label}
                  </button>
                );
              })}
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px]">
              {logs.map((log, i) => {
                const logMode = MODES.find(m => m.id === log.mode);
                return (
                  <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                    {log.kind !== "user" && (
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "feynman" ? `${logMode?.color ?? "#3b82f6"}15` : "rgba(255,255,255,0.03)" }}>
                        {log.kind === "feynman" ? <FlaskConical className="w-3 h-3" style={{ color: logMode?.color ?? "#3b82f6" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                      style={{ background: log.kind === "user" ? `${logMode?.color ?? "#3b82f6"}08` : log.kind === "feynman" ? "#111" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? `${logMode?.color ?? "#3b82f6"}20` : "rgba(255,255,255,0.05)"}` }}>
                      {log.kind === "feynman" && !log.text && running ? (
                        <div className="flex gap-1 py-1">{[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: currentMode.color, animationDelay: `${d * 0.15}s` }} />)}</div>
                      ) : (
                        <span style={{ color: log.kind === "user" ? logMode?.color ?? "#3b82f6" : log.kind === "feynman" ? "#ccc" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                      )}
                      {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                    </div>
                    {log.kind === "feynman" && log.text && (
                      <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                        {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Mode description bar */}
            <div className="px-4 py-2 border-t text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606", color: "#444" }}>
              <span style={{ color: currentMode.color }}>{currentMode.label}:</span> {currentMode.desc}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); research(); } }}
                placeholder={`Enter research topic or question for ${currentMode.label}...`}
                disabled={running}
                rows={2}
                className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none resize-none transition-all"
                style={{ borderColor: `${currentMode.color}30`, color: "#ccc" }}
              />
              <div className="flex gap-2 mt-2">
                {running ? (
                  <button onClick={stop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /> Stop</button>
                ) : (
                  <button onClick={research} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: `${currentMode.color}12`, border: `1px solid ${currentMode.color}35`, color: currentMode.color }}><Play className="w-3 h-3" /> Research</button>
                )}
                <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                <button onClick={() => setLogs([{ kind: "system", text: "Feynman cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                <div className="ml-auto flex items-center gap-1 text-[9px] font-mono" style={{ color: "#2a2a2a" }}><BarChart2 className="w-3 h-3" />{logs.filter(l => l.kind === "feynman" && l.text).length} reports</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
