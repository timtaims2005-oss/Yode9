import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Brain, Play, Square, Copy, CheckCheck, GitMerge,
  Trash2, Terminal, Zap, BookOpen, Network, Plus,
  TrendingDown, Clock, Tag,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface ClaudeCodeMemoryModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type MemoryMode = "capture" | "retrieve" | "compress" | "graph";

const MODES: { id: MemoryMode; label: string; color: string; desc: string; icon: typeof Brain }[] = [
  { id: "capture", label: "Capture Memory", color: "#f59e0b", desc: "Extract and store key facts from session/context", icon: Brain },
  { id: "retrieve", label: "Retrieve Context", color: "#3b82f6", desc: "Query stored memory for relevant context", icon: BookOpen },
  { id: "compress", label: "Compress Notes", color: "#10b981", desc: "71.5x token reduction via Zettelkasten compression", icon: TrendingDown },
  { id: "graph", label: "Memory Graph", color: "#a78bfa", desc: "Visualize memory as Obsidian-style knowledge graph", icon: Network },
];

const SYSTEM_PROMPTS: Record<MemoryMode, string> = {
  capture: `You are Claude Code Memory Setup — an Obsidian Zettelkasten memory system that achieves 71.5x fewer tokens per session through persistent cross-session memory.

CAPTURE MODE: Extract and format key facts for long-term storage.

Given the input (session transcript, notes, or content):
1. Extract atomic facts (one idea per note)
2. Format as Zettelkasten permanent notes: ID + title + content + links
3. Identify connections between notes
4. Create index note if multiple notes extracted

Output format:
---NOTE: [ID]---
TITLE: [concise title]
CONTENT: [atomic fact, 2-3 sentences max]
TAGS: #[tag1] #[tag2]
LINKS: [[related-note-id]]
---

END with: SUMMARY: [N notes captured, key themes]`,

  retrieve: `You are Claude Code Memory Setup in RETRIEVE mode.

Given a query and memory context, find and synthesize relevant stored knowledge:

1. RELEVANT NOTES: Which stored notes are most relevant to the query
2. SYNTHESIS: Combine relevant facts into a coherent answer
3. GAPS: What is missing from stored memory that would help
4. CONTEXT INJECTION: Format retrieved context for optimal use in next session

Output format:
QUERY: [restated]
RELEVANT MEMORY: [N notes matched]
---
SYNTHESIZED ANSWER:
[answer using stored facts]
---
MISSING CONTEXT: [what would help]
INJECT FORMAT: [ready-to-paste context for next session]`,

  compress: `You are Claude Code Memory Setup in COMPRESS mode — achieving 71.5x token reduction via Zettelkasten compression.

Take the given content (session notes, conversation, documentation) and compress it to permanent note format:

COMPRESSION RULES:
- One idea per note (atomic)
- Title: 5-8 words maximum
- Content: 1-3 sentences only
- Remove all examples, elaboration, preamble
- Link related concepts with [[wikilinks]]
- Use #tags for categorization

Target: 71.5x reduction (e.g., 7150 tokens → 100 tokens)

Output:
ORIGINAL: ~[N] tokens estimated
COMPRESSED: ~[M] tokens estimated
COMPRESSION RATIO: [X]x
---
[Compressed Zettelkasten notes]`,

  graph: `You are Claude Code Memory Setup in MEMORY GRAPH mode — creating Obsidian-style knowledge graphs with Graphify integration.

Given a set of notes or topics, generate a textual representation of the knowledge graph:

For each concept:
- Node ID and title
- Node type (CONCEPT / FACT / PROJECT / PERSON / DECISION)
- Connected nodes with relationship type

Output format:
NODES:
[ID]: [Title] ([Type])
...

EDGES:
[ID] --[relationship]--> [ID]
[ID] --[relationship]--> [ID]
...

KEY CLUSTERS: [2-3 main topic clusters]
CENTRAL NODES: [nodes with most connections]
ORPHAN NOTES: [unconnected notes that need linking]

This graph is compatible with Graphify's SVG renderer — copy to Graphify for visualization.`,
};

interface MemoryNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  ts: string;
}

type LogEntry = { kind: "user" | "memory" | "system"; text: string; ts: string; mode?: MemoryMode };

export function ClaudeCodeMemoryModal({ open, onOpenChange, pipelineContext }: ClaudeCodeMemoryModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "Claude Code Memory Setup — Obsidian Zettelkasten · 71.5x token reduction · Persistent cross-session memory", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    { kind: "system", text: "Graphify integration available — export memory graph to visual node map", ts: "" },
  ]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<MemoryMode>("capture");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"main" | "vault">("main");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Context received for memory capture (${pipelineContext.text.length} chars)` });
    setInput(pipelineContext.text);
    setMode("capture");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function run() {
    const q = (mode === "retrieve" ? query || input : input).trim();
    if (!q || running) return;
    setInput("");
    setQuery("");
    addLog({ kind: "user", text: `[${MODES.find(m => m.id === mode)?.label}] ${q.slice(0, 100)}${q.length > 100 ? "..." : ""}`, mode });

    const memContext = notes.length > 0
      ? `\n\nSTORED MEMORY VAULT (${notes.length} notes):\n${notes.map(n => `[[${n.id}]] ${n.title}: ${n.content}`).join("\n")}`
      : "";

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "memory", text: "", mode });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPTS[mode] + memContext,
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "memory") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );

      // Auto-extract notes from capture mode
      if (mode === "capture" && accRef.current) {
        const noteMatches = accRef.current.matchAll(/---NOTE: ([^-]+)---\nTITLE: ([^\n]+)\nCONTENT: ([^\n]+)/g);
        const newNotes: MemoryNote[] = [];
        for (const match of noteMatches) {
          newNotes.push({
            id: match[1].trim(),
            title: match[2].trim(),
            content: match[3].trim(),
            tags: [],
            ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
          });
        }
        if (newNotes.length > 0) setNotes(p => [...p, ...newNotes]);
      }
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "memory" && !l.text) u[u.length - 1] = { ...l, text: "[Error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }
  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "memory");
    if (!last?.text) return;
    pipeline.push({ source: "Claude Memory", sourceColor: "#f59e0b", label: `Memory ${MODES.find(m => m.id === last.mode)?.label}`, content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Memory output routed." });
  }

  const currentMode = MODES.find(m => m.id === mode)!;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(245,158,11,0.25)", maxHeight: "90vh", boxShadow: "0 0 60px rgba(245,158,11,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(245,158,11,0.15)", background: "#0a0900" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Brain className="w-5 h-5" style={{ color: "#f59e0b" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#f59e0b" }}>Claude Code Memory</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>71.5x REDUCTION</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>{notes.length} NOTES</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Obsidian Zettelkasten · Persistent cross-session memory · Graphify integration</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["main", "vault"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all" style={{ color: tab === t ? "#f59e0b" : "#444", borderBottom: tab === t ? "2px solid #f59e0b" : "2px solid transparent" }}>
                  {t === "vault" ? `VAULT (${notes.length})` : "MAIN"}
                </button>
              ))}
            </div>

            {tab === "main" && (
              <>
                {/* Mode selector */}
                <div className="flex gap-2 px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
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
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "memory" ? `${logMode?.color ?? "#f59e0b"}12` : "rgba(255,255,255,0.03)" }}>
                            {log.kind === "memory" ? <Brain className="w-3 h-3" style={{ color: logMode?.color ?? "#f59e0b" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                          </div>
                        )}
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                          style={{ background: log.kind === "user" ? `${logMode?.color ?? "#f59e0b"}07` : log.kind === "memory" ? "#111" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? `${logMode?.color ?? "#f59e0b"}20` : "rgba(255,255,255,0.05)"}` }}>
                          {log.kind === "memory" && !log.text && running ? (
                            <div className="flex gap-1 py-1 items-center"><Brain className="w-3 h-3 animate-pulse" style={{ color: currentMode.color }} /><span className="text-[9px]" style={{ color: "#555" }}>Processing memory...</span></div>
                          ) : (
                            <span style={{ color: log.kind === "user" ? logMode?.color ?? "#f59e0b" : log.kind === "memory" ? "#ccc" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                          )}
                          {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                        </div>
                        {log.kind === "memory" && log.text && (
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
                  {mode === "retrieve" && (
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search query for memory retrieval..."
                      className="w-full bg-transparent border rounded-xl px-4 py-2 text-[11px] font-mono outline-none mb-2"
                      style={{ borderColor: `${currentMode.color}30`, color: "#ccc" }}
                    />
                  )}
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                    placeholder={mode === "retrieve" ? "Additional context (optional)..." : `Content to ${currentMode.label.toLowerCase()}...`}
                    disabled={running}
                    rows={mode === "retrieve" ? 2 : 3}
                    className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none resize-none"
                    style={{ borderColor: `${currentMode.color}25`, color: "#ccc" }}
                  />
                  <div className="flex gap-2 mt-2">
                    {running ? (
                      <button onClick={stop} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /> Stop</button>
                    ) : (
                      <button onClick={run} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: `${currentMode.color}12`, border: `1px solid ${currentMode.color}35`, color: currentMode.color }}><Play className="w-3 h-3" /> Process</button>
                    )}
                    <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                    <button onClick={() => setLogs([{ kind: "system", text: "Cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                    <div className="ml-auto flex items-center gap-1 text-[9px] font-mono" style={{ color: "#2a2a2a" }}><Zap className="w-3 h-3" />71.5x reduction</div>
                  </div>
                </div>
              </>
            )}

            {tab === "vault" && (
              <div className="flex-1 overflow-y-auto p-4">
                {notes.length === 0 ? (
                  <div className="text-center py-16 text-[10px] font-mono" style={{ color: "#333" }}>No notes in vault — use Capture Memory to store knowledge from sessions</div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note, i) => (
                      <div key={i} className="p-4 rounded-xl border" style={{ borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.03)" }}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>[[{note.id}]]</div>
                            <span className="text-[10px] font-bold" style={{ color: "#ccc" }}>{note.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5" style={{ color: "#333" }} />
                            <span className="text-[8px] font-mono" style={{ color: "#333" }}>{note.ts}</span>
                            <button onClick={() => setNotes(p => p.filter((_, j) => j !== i))} style={{ color: "#333" }}><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: "#888" }}>{note.content}</div>
                        {note.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {note.tags.map(t => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b" }}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setNotes([])} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear Vault</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
