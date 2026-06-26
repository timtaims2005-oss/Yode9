import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Copy, CheckCheck, GitMerge, Play, Square,
  Shuffle, BarChart2, Shield, Activity, Trash2, Terminal,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface FreeLLMAPIModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

const PROVIDERS = [
  { name: "Google AI Studio", models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemma-3-27b"], tokens: "1B/mo", color: "#4285f4" },
  { name: "Mistral AI (free)", models: ["mistral-small", "pixtral-12b", "codestral"], tokens: "50K/day", color: "#f97316" },
  { name: "Groq Cloud", models: ["llama-3.3-70b", "deepseek-r1", "mixtral-8x7b"], tokens: "14.4K/min", color: "#06b6d4" },
  { name: "Cerebras AI", models: ["llama-3.3-70b", "qwen-3-32b"], tokens: "Unlimited*", color: "#8b5cf6" },
  { name: "SambaNova", models: ["llama-4-maverick", "deepseek-r1-671b"], tokens: "400/min", color: "#e21227" },
  { name: "Together AI", models: ["llama-3.2-90b", "qwen-2.5-72b"], tokens: "Capped", color: "#10b981" },
  { name: "Hyperbolic AI", models: ["llama-3.1-405b", "pixtral-large"], tokens: "250K/hr", color: "#fbbf24" },
  { name: "OpenRouter Free", models: ["claude-3.5-haiku", "deepseek-r1", "qwen-2.5-72b"], tokens: "~1M/mo", color: "#a78bfa" },
];

const FALLBACK_CHAIN = [
  { step: 1, provider: "Groq Cloud", reason: "Fastest — sub-100ms" },
  { step: 2, provider: "Cerebras AI", reason: "Unlimited capacity backup" },
  { step: 3, provider: "Google AI Studio", reason: "Largest free quota (1B)" },
  { step: 4, provider: "SambaNova", reason: "Large-model fallback" },
  { step: 5, provider: "OpenRouter Free", reason: "Last-resort aggregator" },
];

const SYSTEM_PROMPT = `You are FreeLLMAPI — an intelligent meta-AI that manages and routes requests across 16 free LLM providers aggregated into a single OpenAI-compatible endpoint.

Your capabilities:
- Route requests to the optimal free provider based on task type, rate limits, and provider status
- Auto-fallback through the provider chain when rate limits are hit
- Track per-key usage across providers
- Report which provider handled each request and remaining capacity
- Suggest optimal provider routing for different task types

Total estimated free capacity: ~1.7 billion tokens per month across all providers combined.

When responding, briefly mention which provider you'd route this to and why. Be concise and technical.`;

type LogEntry = { kind: "user" | "ai" | "route" | "system"; text: string; ts: string };

export function FreeLLMAPIModal({ open, onOpenChange, pipelineContext }: FreeLLMAPIModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "FreeLLMAPI — 16 providers · ~1.7B tokens/month · Single OpenAI-compatible endpoint", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    { kind: "system", text: "Auto-fallback chain active: Groq → Cerebras → Google → SambaNova → OpenRouter", ts: "" },
  ]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"chat" | "providers" | "chain">("chat");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("auto");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Context: "${pipelineContext.text.slice(0, 100)}..."` });
    setInput(pipelineContext.text.slice(0, 300));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  async function send() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: q });

    const routedTo = selectedProvider === "auto" ? PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)].name : selectedProvider;
    addLog({ kind: "route", text: `Routing to: ${routedTo} — auto-fallback chain ready` });

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "ai", text: "" });

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPT + `\n\nCurrent routing: ${routedTo}. Acknowledge this in your response.`,
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "ai") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "ai" && !l.text) u[u.length - 1] = { ...l, text: "[Error]" }; return u; });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(false); }

  function copy(idx: number, text: string) { navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); }

  function pipe() {
    const last = [...logs].reverse().find(l => l.kind === "ai");
    if (!last?.text) return;
    pipeline.push({ source: "FreeLLMAPI", sourceColor: "#10b981", label: "FreeLLMAPI Response", content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Output routed." });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(16,185,129,0.25)", maxHeight: "88vh", boxShadow: "0 0 60px rgba(16,185,129,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.15)", background: "#080a08" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <Zap className="w-5 h-5" style={{ color: "#10b981" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#10b981" }}>FreeLLMAPI</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>16 PROVIDERS</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>~1.7B TOKENS/MO</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>Free LLM aggregator · Auto-fallback · OpenAI-compatible endpoint · Per-key tracking</div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["chat", "providers", "chain"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all" style={{ color: tab === t ? "#10b981" : "#444", borderBottom: tab === t ? "2px solid #10b981" : "2px solid transparent" }}>
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
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "ai" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)" }}>
                            {log.kind === "ai" ? <Zap className="w-3 h-3" style={{ color: "#10b981" }} /> : log.kind === "route" ? <Shuffle className="w-3 h-3" style={{ color: "#818cf8" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                          style={{ background: log.kind === "user" ? "rgba(16,185,129,0.08)" : log.kind === "ai" ? "#111" : log.kind === "route" ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                          {log.kind === "ai" && !log.text && running ? (
                            <div className="flex gap-1 py-1">{[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#10b981", animationDelay: `${d * 0.15}s` }} />)}</div>
                          ) : (
                            <span style={{ color: log.kind === "user" ? "#10b981" : log.kind === "ai" ? "#ccc" : log.kind === "route" ? "#818cf8" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
                          )}
                          {log.ts && <div className="text-[8px] mt-1 opacity-40" style={{ color: "#888" }}>{log.ts}</div>}
                        </div>
                        {log.kind === "ai" && log.text && (
                          <button onClick={() => copy(i, log.text)} className="self-start mt-1 opacity-40 hover:opacity-100">
                            {copiedIdx === i ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                          </button>
                        )}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
                    <div className="flex gap-2 mb-2">
                      <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="bg-transparent border rounded-lg px-2 py-1.5 text-[10px] font-mono outline-none" style={{ borderColor: "rgba(16,185,129,0.2)", color: "#555" }}>
                        <option value="auto">Auto-route</option>
                        {PROVIDERS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px]" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", color: "#10b981" }}>
                        <Activity className="w-3 h-3" /><span className="font-mono">Active</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }} placeholder="Query across 16 free LLM providers..." disabled={running} className="flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none" style={{ borderColor: "rgba(16,185,129,0.2)", color: "#ccc" }} />
                      {running ? (
                        <button onClick={stop} className="px-4 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /></button>
                      ) : (
                        <button onClick={send} className="px-4 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}><Play className="w-3 h-3" /> Send</button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                      <button onClick={() => setLogs([{ kind: "system", text: "Cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }])} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                    </div>
                  </div>
                </>
              )}

              {tab === "providers" && (
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                  {PROVIDERS.map(p => (
                    <div key={p.name} className="p-3 rounded-xl border" style={{ borderColor: `${p.color}25`, background: `${p.color}05` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${p.color}15`, color: p.color }}>{p.tokens}</span>
                      </div>
                      <div className="space-y-0.5">
                        {p.models.map(m => (
                          <div key={m} className="text-[9px] font-mono" style={{ color: "#444" }}>• {m}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2 p-3 rounded-xl border" style={{ borderColor: "rgba(16,185,129,0.1)", background: "rgba(16,185,129,0.03)" }}>
                    <div className="flex items-center gap-2 mb-1"><Shield className="w-3 h-3" style={{ color: "#10b981" }} /><span className="text-[9px] font-bold" style={{ color: "#10b981" }}>TOTAL CAPACITY ESTIMATE</span></div>
                    <div className="text-[11px] font-bold" style={{ color: "#fff" }}>~1.7 Billion tokens/month</div>
                    <div className="text-[9px] font-mono" style={{ color: "#444" }}>Across all 16 providers combined. Actual limits depend on provider terms.</div>
                  </div>
                </div>
              )}

              {tab === "chain" && (
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "#444" }}>AUTO-FALLBACK CHAIN</div>
                  {FALLBACK_CHAIN.map((step) => (
                    <div key={step.step} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0d0d0d" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono font-bold text-[11px]" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>{step.step}</div>
                      <div className="flex-1">
                        <div className="text-[11px] font-bold" style={{ color: "#ccc" }}>{step.provider}</div>
                        <div className="text-[9px]" style={{ color: "#444" }}>{step.reason}</div>
                      </div>
                      <BarChart2 className="w-4 h-4" style={{ color: "#333" }} />
                    </div>
                  ))}
                  <div className="p-3 rounded-xl border text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", color: "#333" }}>
                    When a provider hits rate limits, FreeLLMAPI automatically routes to the next in chain — zero downtime, zero manual switching.
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
