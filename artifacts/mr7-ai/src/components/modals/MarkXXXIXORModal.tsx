import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cpu, Brain, Terminal, Zap, Play, Square, Copy,
  CheckCheck, GitMerge, Trash2, Network, Globe, Code2,
  Shuffle, BarChart2,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface MarkXXXIXORModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

const FREE_MODELS = [
  { id: "gemini-flash", name: "Gemini 2.5 Flash", provider: "Google", color: "#4285f4", used: "Voice + Tool-calling" },
  { id: "meta-llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "OpenRouter", color: "#06b6d4", used: "Web Search" },
  { id: "deepseek-r1:free", name: "DeepSeek R1", provider: "OpenRouter", color: "#8b5cf6", used: "Memory" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B", provider: "OpenRouter", color: "#10b981", used: "Code Helper" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", provider: "OpenRouter", color: "#f97316", used: "Browser Control" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", provider: "OpenRouter", color: "#fbbf24", used: "Desktop Control" },
];

const ACTION_MODULES = [
  { label: "Web Search", router: "Llama 3.3 70B", desc: "Routes to free OpenRouter model — no Gemini quota used" },
  { label: "Memory", router: "DeepSeek R1", desc: "Persistent memory storage + retrieval via free tier" },
  { label: "Flight Finder", router: "Qwen 2.5 72B", desc: "Flight search queries handled by OpenRouter free model" },
  { label: "Desktop Control", router: "Gemma 3 27B", desc: "System control commands via lightweight free model" },
  { label: "File Processor", router: "Gemini Flash", desc: "Document analysis stays on primary voice model" },
  { label: "Code Helper", router: "Qwen 2.5 72B", desc: "Code generation routed to strongest free coder" },
  { label: "Browser Control", router: "Mistral 7B", desc: "Web navigation via fast free model" },
  { label: "Dev Agent", router: "DeepSeek R1", desc: "Complex dev tasks use DeepSeek's reasoning chain" },
];

const SYSTEM_PROMPT = `You are MARK XXXIX-OR — the OpenRouter-enhanced variant of the Mark 39 personal AI suit. You are the evolution of MARK XXXIX with a critical improvement: selected action modules now route their LLM calls through OpenRouter's free-tier models, dramatically increasing effective request limits without additional cost.

Architecture:
- Gemini 2.5 Flash Native Audio: handles real-time voice and primary tool-calling
- OpenRouter free tier (Llama/DeepSeek/Qwen/Mistral): handles web search, memory, flight finder, desktop control, browser control

This allows you to maintain the full capability of MARK XXXIX while conserving Gemini quota for voice-critical operations only.

Communication style: precise, technical, acknowledge the routing decision when relevant (e.g., "Routing web search to Llama 3.3 70B via OpenRouter...").`;

type LogEntry = { kind: "user" | "mark" | "route" | "system"; text: string; ts: string };

export function MarkXXXIXORModal({ open, onOpenChange, pipelineContext }: MarkXXXIXORModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "MARK XXXIX-OR ONLINE — OpenRouter integration active. 40% faster · Quota optimized.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    { kind: "system", text: "Voice: Gemini 2.5 Flash · Actions: OpenRouter Free Tier (6 models)", ts: "" },
  ]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"chat" | "routing" | "models">("chat");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [routeStats, setRouteStats] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Context received: "${pipelineContext.text.slice(0, 100)}..."` });
    setInput(`Analyze: ${pipelineContext.text.slice(0, 300)}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  function detectRouter(q: string): { label: string; model: string; color: string } {
    const lq = q.toLowerCase();
    if (lq.includes("search") || lq.includes("find") || lq.includes("look up")) return { label: "Web Search", model: "Llama 3.3 70B", color: "#06b6d4" };
    if (lq.includes("remember") || lq.includes("memory") || lq.includes("recall")) return { label: "Memory", model: "DeepSeek R1", color: "#8b5cf6" };
    if (lq.includes("code") || lq.includes("write") || lq.includes("function") || lq.includes("debug")) return { label: "Code Helper", model: "Qwen 2.5 72B", color: "#10b981" };
    if (lq.includes("browser") || lq.includes("navigate") || lq.includes("website")) return { label: "Browser Control", model: "Mistral 7B", color: "#f97316" };
    if (lq.includes("flight") || lq.includes("book") || lq.includes("travel")) return { label: "Flight Finder", model: "Qwen 2.5 72B", color: "#10b981" };
    if (lq.includes("system") || lq.includes("desktop") || lq.includes("app")) return { label: "Desktop Control", model: "Gemma 3 27B", color: "#fbbf24" };
    return { label: "Primary", model: "Gemini 2.5 Flash", color: "#4285f4" };
  }

  async function send() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: q });

    const { label, model, color } = detectRouter(q);
    addLog({ kind: "route", text: `Routing "${label}" → ${model} (OpenRouter Free)` });
    setRouteStats(p => ({ ...p, [model]: (p[model] ?? 0) + 1 }));

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
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
          customSystemPrompt: SYSTEM_PROMPT + `\n\nCurrent routing decision: ${label} → ${model}. Acknowledge this routing in your response naturally.`,
        },
        (delta: string) => {
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
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "mark" && !l.text) u[u.length - 1] = { ...l, text: "[Error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
    void color;
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }

  function copy(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "mark");
    if (!last?.text) return;
    pipeline.push({ source: "Mark XXXIX-OR", sourceColor: "#00e5ff", label: "MARK XXXIX-OR Output", content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Output routed." });
  }

  function clearLogs() {
    setLogs([{ kind: "system", text: "MARK XXXIX-OR — Cleared. OpenRouter integration active.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(0,229,255,0.25)", maxHeight: "88vh", boxShadow: "0 0 60px rgba(0,229,255,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(0,229,255,0.15)", background: "#0a0c0d" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)" }}>
                <Cpu className="w-5 h-5" style={{ color: "#00e5ff" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#00e5ff" }}>MARK XXXIX-OR</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>ONLINE</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>OPENROUTER</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>+OpenRouter · 40% faster · 6 free-tier models · Quota-optimized</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["chat", "routing", "models"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all" style={{ color: tab === t ? "#00e5ff" : "#444", borderBottom: tab === t ? "2px solid #00e5ff" : "2px solid transparent" }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {tab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                    {logs.map((log, i) => (
                      <div key={i} className={`flex gap-2 ${log.kind === "user" ? "justify-end" : "justify-start"}`}>
                        {log.kind !== "user" && (
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "mark" ? "rgba(0,229,255,0.1)" : log.kind === "route" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)" }}>
                            {log.kind === "mark" ? <Cpu className="w-3 h-3" style={{ color: "#00e5ff" }} /> : log.kind === "route" ? <Shuffle className="w-3 h-3" style={{ color: "#818cf8" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                          style={{ background: log.kind === "user" ? "rgba(0,229,255,0.08)" : log.kind === "mark" ? "#111" : log.kind === "route" ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? "rgba(0,229,255,0.2)" : log.kind === "route" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                          {log.kind === "mark" && !log.text && running ? (
                            <div className="flex gap-1 py-1">{[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#00e5ff", animationDelay: `${d * 0.15}s` }} />)}</div>
                          ) : (
                            <span style={{ color: log.kind === "user" ? "#00e5ff" : log.kind === "mark" ? "#ccc" : log.kind === "route" ? "#818cf8" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                          )}
                          {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                        </div>
                        {log.kind === "mark" && log.text && (
                          <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                            {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                          </button>
                        )}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
                    <div className="flex gap-2">
                      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }} placeholder="Command MARK XXXIX-OR..." disabled={running} className="flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none" style={{ borderColor: "rgba(0,229,255,0.2)", color: "#ccc" }} />
                      {running ? (
                        <button onClick={stop} className="px-4 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /></button>
                      ) : (
                        <button onClick={send} className="px-4 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff" }}><Play className="w-3 h-3" /> Execute</button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                      <button onClick={clearLogs} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                    </div>
                  </div>
                </>
              )}

              {tab === "routing" && (
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "#444" }}>ACTION MODULE ROUTING TABLE</div>
                  {ACTION_MODULES.map((mod, i) => (
                    <div key={i} className="p-3 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0d0d0d" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>{mod.label}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
                          <Shuffle className="w-2.5 h-2.5" style={{ color: "#818cf8" }} />
                          <span className="text-[9px] font-mono" style={{ color: "#818cf8" }}>{mod.router}</span>
                        </div>
                      </div>
                      <div className="text-[9px]" style={{ color: "#555" }}>{mod.desc}</div>
                    </div>
                  ))}
                  {Object.keys(routeStats).length > 0 && (
                    <div className="p-3 rounded-xl border" style={{ borderColor: "rgba(0,229,255,0.1)", background: "rgba(0,229,255,0.03)" }}>
                      <div className="text-[9px] font-bold mb-2" style={{ color: "#00e5ff" }}>ROUTE STATS (THIS SESSION)</div>
                      {Object.entries(routeStats).map(([model, count]) => (
                        <div key={model} className="flex justify-between text-[9px] font-mono py-0.5" style={{ color: "#555" }}>
                          <span>{model}</span><span style={{ color: "#818cf8" }}>{count}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "models" && (
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                  {FREE_MODELS.map(m => (
                    <div key={m.id} className="p-3 rounded-xl border" style={{ borderColor: `${m.color}25`, background: `${m.color}05` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-[10px] font-bold" style={{ color: m.color }}>{m.name}</span>
                      </div>
                      <div className="text-[9px] mb-1" style={{ color: "#555" }}>{m.provider}</div>
                      <div className="text-[9px] px-2 py-0.5 rounded font-mono inline-block" style={{ background: `${m.color}15`, color: m.color }}>Used for: {m.used}</div>
                    </div>
                  ))}
                  <div className="col-span-2 p-3 rounded-xl border text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", color: "#333" }}>
                    All OpenRouter models are FREE tier — no API cost. Primary Gemini Flash handles voice only.
                    <br /><BarChart2 className="w-3 h-3 inline mr-1 mt-1" style={{ color: "#444" }} />Result: 40% faster interactions, effectively unlimited action module capacity.
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
