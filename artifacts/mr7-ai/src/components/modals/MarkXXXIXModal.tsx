import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Mic, MicOff, Eye, Brain, Terminal, Zap,
  Play, Square, Copy, CheckCheck, GitMerge, Trash2,
  MonitorSpeaker, Globe, Folder, Code2, Clock,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface MarkXXXIXModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

type ActionId = "web_search" | "screen" | "files" | "code" | "system" | "memory" | "browser" | "dev";

const ACTIONS: { id: ActionId; label: string; icon: typeof Cpu; color: string; desc: string }[] = [
  { id: "web_search", label: "Web Search", icon: Globe, color: "#3b82f6", desc: "Search the web for real-time information" },
  { id: "screen", label: "Screen Process", icon: Eye, color: "#10b981", desc: "Analyze and process screen content" },
  { id: "files", label: "File Control", icon: Folder, color: "#f97316", desc: "Read, write, and manage files" },
  { id: "code", label: "Code Helper", icon: Code2, color: "#a78bfa", desc: "Write, review, and debug code" },
  { id: "system", label: "System Control", icon: MonitorSpeaker, color: "#fbbf24", desc: "Manage system settings and apps" },
  { id: "memory", label: "Persistent Memory", icon: Brain, color: "#06b6d4", desc: "Store and recall context across sessions" },
  { id: "browser", label: "Browser Control", icon: Globe, color: "#34d399", desc: "Navigate and interact with the web" },
  { id: "dev", label: "Dev Agent", icon: Terminal, color: "#e21227", desc: "Autonomous development and execution" },
];

const SYSTEM_PROMPT = `You are MARK XXXIX — the 39th Iron Man suit AI, a pinnacle-class autonomous personal assistant engineered by FatihMakes. You bridge the gap between operating system and human intent.

Your capabilities include: real-time voice interaction, system control, app launching, file management, browser control, screen analysis, document processing, code writing & debugging, web search, flight finding, weather reports, reminders, persistent memory, and autonomous multi-step task execution.

Communication style:
- Concise, precise, technical — like J.A.R.V.I.S. but more decisive
- Acknowledge tasks with brief confirmations: "Understood. Executing." / "Processing request."
- For multi-step tasks, outline the plan first, then execute step by step
- Report completion status and any anomalies

You have persistent memory of the user's projects, preferences, and personal context. Reference it naturally.`;

type LogEntry = { kind: "user" | "mark" | "action" | "system"; text: string; ts: string; action?: ActionId };

export function MarkXXXIXModal({ open, onOpenChange, pipelineContext }: MarkXXXIXModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "MARK XXXIX ONLINE — Suit systems nominal. All action modules ready.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    { kind: "system", text: "Voice · Screen · Files · Code · System · Memory · Browser · Dev", ts: "" },
  ]);
  const [running, setRunning] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
  const [memInput, setMemInput] = useState("");
  const [tab, setTab] = useState<"chat" | "actions" | "memory">("chat");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    const preview = pipelineContext.text.slice(0, 150).replace(/\n/g, " ");
    addLog({ kind: "system", text: `[Pipeline] Context received: "${preview}${pipelineContext.text.length > 150 ? "..." : ""}"` });
    setInput(`Analyze this context: ${pipelineContext.text.slice(0, 300)}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: q });

    // Detect action intent
    const lq = q.toLowerCase();
    let detectedAction: ActionId | null = null;
    if (lq.includes("search") || lq.includes("find") || lq.includes("look up")) detectedAction = "web_search";
    else if (lq.includes("screen") || lq.includes("see") || lq.includes("visual")) detectedAction = "screen";
    else if (lq.includes("file") || lq.includes("folder") || lq.includes("directory")) detectedAction = "files";
    else if (lq.includes("code") || lq.includes("write") || lq.includes("debug") || lq.includes("function")) detectedAction = "code";
    else if (lq.includes("system") || lq.includes("open app") || lq.includes("launch")) detectedAction = "system";
    else if (lq.includes("remember") || lq.includes("memory") || lq.includes("recall")) detectedAction = "memory";
    else if (lq.includes("browser") || lq.includes("navigate") || lq.includes("website")) detectedAction = "browser";
    else if (lq.includes("build") || lq.includes("develop") || lq.includes("project")) detectedAction = "dev";

    if (detectedAction) {
      setActiveAction(detectedAction);
      const actionObj = ACTIONS.find(a => a.id === detectedAction);
      addLog({ kind: "action", text: `Activating: ${actionObj?.label}`, action: detectedAction });
    }

    setRunning(true);
    accRef.current = "";

    const memContext = memory.length > 0 ? `\n\nMEMORY CONTEXT:\n${memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}` : "";
    const systemPrompt = SYSTEM_PROMPT + memContext;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let chunk = "";
    addLog({ kind: "mark", text: "" });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: systemPrompt,
        },
        (delta: string) => {
          chunk += delta;
          accRef.current += delta;
          setLogs(p => {
            const updated = [...p];
            const last = updated[updated.length - 1];
            if (last?.kind === "mark") updated[updated.length - 1] = { ...last, text: accRef.current };
            return updated;
          });
        }
      );
    } catch {
      setLogs(p => {
        const updated = [...p];
        const last = updated[updated.length - 1];
        if (last?.kind === "mark" && !last.text) updated[updated.length - 1] = { ...last, text: "[System error — retry]" };
        return updated;
      });
    } finally {
      setRunning(false);
      setActiveAction(null);
      abortRef.current = null;

      // Auto-save to memory if remember-related
      if (q.toLowerCase().includes("remember") && accRef.current) {
        const memEntry = q.replace(/remember\s*/i, "").slice(0, 120);
        if (memEntry) setMemory(p => [...p, memEntry]);
      }
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); setActiveAction(null); }

  function copy(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "mark");
    if (!last?.text) return;
    pipeline.push({ source: "Mark XXXIX", sourceColor: "#fbbf24", label: "MARK XXXIX Output", content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Output routed to pipeline." });
  }

  function clearLogs() {
    setLogs([{ kind: "system", text: "MARK XXXIX — Session cleared. Ready.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  function addMemory() {
    if (!memInput.trim()) return;
    setMemory(p => [...p, memInput.trim()]);
    setMemInput("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}
        >
          <motion.div
            className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden"
            style={{ background: "#080808", borderColor: "rgba(251,191,36,0.25)", maxHeight: "88vh", boxShadow: "0 0 60px rgba(251,191,36,0.08)" }}
            initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.15)", background: "linear-gradient(135deg, #0a0800 0%, #080808 100%)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Cpu className="w-5 h-5" style={{ color: "#fbbf24" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#fbbf24" }}>MARK XXXIX</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>ONLINE</span>
                  {running && activeAction && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono animate-pulse" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                      {ACTIONS.find(a => a.id === activeAction)?.label ?? "PROCESSING"}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Cross-Platform Personal AI — Voice · Screen · System · Memory · 15+ Actions</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceActive(v => !v)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: voiceActive ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${voiceActive ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.08)"}` }}
                  title="Voice mode (simulated)"
                >
                  {voiceActive ? <Mic className="w-4 h-4" style={{ color: "#e21227" }} /> : <MicOff className="w-4 h-4" style={{ color: "#555" }} />}
                </button>
                <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: "#555" }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["chat", "actions", "memory"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all"
                  style={{ color: tab === t ? "#fbbf24" : "#444", borderBottom: tab === t ? "2px solid #fbbf24" : "2px solid transparent" }}
                >
                  {t === "memory" ? `MEMORY (${memory.length})` : t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {tab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                    {logs.map((log, i) => (
                      <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                        {log.kind !== "user" && (
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: log.kind === "mark" ? "rgba(251,191,36,0.15)" : log.kind === "action" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)" }}>
                            {log.kind === "mark" ? <Cpu className="w-3 h-3" style={{ color: "#fbbf24" }} /> :
                             log.kind === "action" ? <Zap className="w-3 h-3" style={{ color: "#10b981" }} /> :
                             <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                          style={{
                            background: log.kind === "user" ? "rgba(251,191,36,0.1)" :
                                        log.kind === "mark" ? "#111" :
                                        log.kind === "action" ? "rgba(16,185,129,0.07)" :
                                        "rgba(255,255,255,0.02)",
                            border: `1px solid ${log.kind === "user" ? "rgba(251,191,36,0.2)" : log.kind === "mark" ? "rgba(255,255,255,0.06)" : log.kind === "action" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          {log.kind === "mark" && !log.text && running ? (
                            <div className="flex gap-1 py-1">
                              {[0,1,2].map(d => (
                                <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#fbbf24", animationDelay: `${d * 0.15}s` }} />
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: log.kind === "user" ? "#fbbf24" : log.kind === "mark" ? "#ccc" : log.kind === "action" ? "#10b981" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {log.text}
                            </span>
                          )}
                          {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                        </div>
                        {log.kind === "mark" && log.text && (
                          <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100 transition-all">
                            {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                          </button>
                        )}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  {/* Input */}
                  <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Command MARK XXXIX..."
                        disabled={running}
                        className="flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none transition-all"
                        style={{ borderColor: "rgba(251,191,36,0.2)", color: "#ccc" }}
                      />
                      {running ? (
                        <button onClick={stop} className="px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                          <Square className="w-3 h-3" /> Stop
                        </button>
                      ) : (
                        <button onClick={() => send()} className="px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
                          <Play className="w-3 h-3" /> Execute
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold transition-all" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                        <GitMerge className="w-3 h-3" /> Pipe
                      </button>
                      <button onClick={clearLogs} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}>
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                      <div className="ml-auto text-[9px] font-mono" style={{ color: "#2a2a2a" }}>Mark XXXIX · FatihMakes</div>
                    </div>
                  </div>
                </>
              )}

              {tab === "actions" && (
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                  {ACTIONS.map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => { setTab("chat"); send(`Use ${action.label}: ${action.desc}`); }}
                        className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all hover:scale-[1.02]"
                        style={{ background: `${action.color}08`, borderColor: `${action.color}30` }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${action.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: action.color }} />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold mb-1" style={{ color: action.color }}>{action.label}</div>
                          <div className="text-[9px] leading-relaxed" style={{ color: "#555" }}>{action.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                  <div className="col-span-2 p-3 rounded-xl border text-[10px] font-mono" style={{ borderColor: "rgba(251,191,36,0.1)", background: "rgba(251,191,36,0.03)", color: "#444" }}>
                    Click any action to activate it with MARK XXXIX. The AI will simulate the action and provide results.
                  </div>
                </div>
              )}

              {tab === "memory" && (
                <div className="p-4 flex flex-col gap-3 overflow-y-auto">
                  <div className="flex gap-2">
                    <input
                      value={memInput}
                      onChange={e => setMemInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addMemory(); }}
                      placeholder="Add memory entry..."
                      className="flex-1 bg-transparent border rounded-xl px-4 py-2 text-[11px] font-mono outline-none"
                      style={{ borderColor: "rgba(6,182,212,0.2)", color: "#ccc" }}
                    />
                    <button onClick={addMemory} className="px-4 py-2 rounded-xl text-[10px] font-bold" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}>
                      Store
                    </button>
                  </div>
                  {memory.length === 0 ? (
                    <div className="text-center py-10 text-[10px] font-mono" style={{ color: "#333" }}>No memory entries — store context to persist across sessions</div>
                  ) : (
                    <div className="space-y-2">
                      {memory.map((mem, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: "rgba(6,182,212,0.15)", background: "rgba(6,182,212,0.04)" }}>
                          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#06b6d4" }} />
                          <span className="text-[10px] font-mono flex-1" style={{ color: "#aaa" }}>{mem}</span>
                          <button onClick={() => setMemory(p => p.filter((_, j) => j !== i))} style={{ color: "#333" }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-3 rounded-xl border text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", color: "#333" }}>
                    Memory is injected into every MARK XXXIX conversation. Use "remember..." in chat to auto-extract.
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
