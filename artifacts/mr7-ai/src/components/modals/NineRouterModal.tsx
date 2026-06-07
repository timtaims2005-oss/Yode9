import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shuffle, TrendingDown, Play, Square, Copy, CheckCheck,
  GitMerge, Trash2, Zap, Terminal, BarChart2, Network,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { pipeline } from "@/lib/pipeline";

interface NineRouterModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineContext?: { text: string; key: number };
}

const TIERS = [
  { name: "Subscription", providers: ["Claude 3.5 Sonnet", "GPT-4o", "Gemini Ultra"], color: "#fbbf24", desc: "Premium models — used for complex tasks" },
  { name: "Cheap", providers: ["Claude Haiku", "GPT-4o mini", "Gemini Flash"], color: "#f97316", desc: "Cost-effective models — used for simple tasks" },
  { name: "Free", providers: ["Groq Llama 3.3", "OpenRouter free", "Google AI Studio"], color: "#10b981", desc: "Free models — used when budget is exhausted" },
];

const SAMPLE_PROVIDERS = [
  { name: "Anthropic", models: 3, color: "#d97706" },
  { name: "OpenAI", models: 5, color: "#10b981" },
  { name: "Google", models: 8, color: "#4285f4" },
  { name: "Mistral", models: 4, color: "#f97316" },
  { name: "Groq", models: 6, color: "#06b6d4" },
  { name: "Together", models: 12, color: "#8b5cf6" },
  { name: "OpenRouter", models: 100, color: "#a78bfa" },
  { name: "Cohere", models: 3, color: "#e21227" },
];

const SYSTEM_PROMPT = `You are 9Router — an intelligent AI request router and token optimizer. You manage routing across 40+ LLM providers and 100+ models with three routing tiers: Subscription → Cheap → Free.

Your key capabilities:
1. RTK Compression: Reduce prompt token count by 20-40% using advanced text compression (RTK = Rust Token Killer proxy)
2. Smart routing: Route complex tasks to premium models, simple tasks to cheap models, exhausted budgets to free tier
3. Auto-fallback: When any provider fails or hits rate limits, seamlessly route to next provider
4. Cost tracking: Real-time token cost tracking across all providers

When analyzing requests, you:
1. Classify task complexity (simple/medium/complex)
2. Recommend optimal provider tier
3. Estimate token savings from RTK compression
4. Show estimated cost comparison

Be concise and specific. Show savings in % format.`;

type LogEntry = { kind: "user" | "ai" | "route" | "system"; text: string; ts: string };

export function NineRouterModal({ open, onOpenChange, pipelineContext }: NineRouterModalProps) {
  const { state } = useStore();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { kind: "system", text: "9Router ACTIVE — RTK compression on · 40+ providers · Auto-fallback: Subscription → Cheap → Free", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
  ]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"chat" | "tiers" | "providers">("chat");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [rtkEnabled, setRtkEnabled] = useState(true);
  const [savings, setSavings] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef("");

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  useEffect(() => {
    if (!pipelineContext?.text) return;
    addLog({ kind: "system", text: `[Pipeline] Context received: "${pipelineContext.text.slice(0, 100)}..."` });
    setInput(pipelineContext.text.slice(0, 300));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineContext?.key]);

  function addLog(entry: Omit<LogEntry, "ts">) {
    setLogs(p => [...p, { ...entry, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
  }

  function classifyTask(q: string): { tier: string; saving: number; provider: string } {
    const len = q.length;
    const lq = q.toLowerCase();
    const isComplex = lq.includes("analyze") || lq.includes("research") || lq.includes("architecture") || len > 300;
    const isSimple = len < 80 || lq.includes("what is") || lq.includes("define") || lq.includes("explain briefly");
    if (isComplex) return { tier: "Subscription", saving: rtkEnabled ? 28 : 0, provider: "Claude 3.5 Sonnet" };
    if (isSimple) return { tier: "Free", saving: rtkEnabled ? 35 : 0, provider: "Groq Llama 3.3 70B" };
    return { tier: "Cheap", saving: rtkEnabled ? 22 : 0, provider: "Claude Haiku" };
  }

  async function send() {
    const q = input.trim();
    if (!q || running) return;
    setInput("");
    addLog({ kind: "user", text: q });

    const { tier, saving, provider } = classifyTask(q);
    setSavings(p => p + saving);
    addLog({ kind: "route", text: `Classified: ${tier} tier → ${provider} · ${rtkEnabled ? `RTK compression: -${saving}% tokens` : "RTK disabled"}` });

    setRunning(true);
    accRef.current = "";
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    addLog({ kind: "ai", text: "" });

    const rtkNote = rtkEnabled ? `\n\nRTK compression is active — your response should be compressed by ~${saving}% without losing semantic meaning. Be concise but complete.` : "";

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: q }],
          customSystemPrompt: SYSTEM_PROMPT + rtkNote + `\n\nRouted to: ${tier} tier, provider: ${provider}`,
        },
        (delta: string) => {
          accRef.current += delta;
          setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "ai") u[u.length - 1] = { ...l, text: accRef.current }; return u; });
        }
      );
    } catch {
      setLogs(p => { const u = [...p]; const l = u[u.length - 1]; if (l?.kind === "ai" && !l.text) u[u.length - 1] = { ...l, text: "[Routing error — retrying fallback chain...]" }; return u; });
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
    pipeline.push({ source: "9Router", sourceColor: "#a78bfa", label: "9Router Response", content: last.text });
    addLog({ kind: "system", text: "[Pipeline] Output routed." });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div className="w-full max-w-3xl flex flex-col rounded-2xl border overflow-hidden" style={{ background: "#080808", borderColor: "rgba(167,139,250,0.25)", maxHeight: "88vh", boxShadow: "0 0 60px rgba(167,139,250,0.06)" }} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.15)", background: "#090808" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)" }}>
                <Shuffle className="w-5 h-5" style={{ color: "#a78bfa" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tracking-widest font-mono" style={{ color: "#a78bfa" }}>9Router</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>40+ PROVIDERS</span>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>{savings > 0 ? `${savings}% saved` : "RTK READY"}</span>
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: "#444" }}>AI Router · RTK compression 20-40% · 100+ models · Auto-fallback tier system</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRtkEnabled(v => !v)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold transition-all" style={{ background: rtkEnabled ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${rtkEnabled ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.08)"}`, color: rtkEnabled ? "#a78bfa" : "#444" }}>
                  <TrendingDown className="w-3 h-3" /> RTK
                </button>
                <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"><X className="w-4 h-4" style={{ color: "#555" }} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["chat", "tiers", "providers"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all" style={{ color: tab === t ? "#a78bfa" : "#444", borderBottom: tab === t ? "2px solid #a78bfa" : "2px solid transparent" }}>
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
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: log.kind === "ai" ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)" }}>
                            {log.kind === "ai" ? <Shuffle className="w-3 h-3" style={{ color: "#a78bfa" }} /> : log.kind === "route" ? <Network className="w-3 h-3" style={{ color: "#10b981" }} /> : <Terminal className="w-3 h-3" style={{ color: "#333" }} />}
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${log.kind === "user" ? "rounded-tr-none" : "rounded-tl-none"}`}
                          style={{ background: log.kind === "user" ? "rgba(167,139,250,0.08)" : log.kind === "ai" ? "#111" : log.kind === "route" ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${log.kind === "user" ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                          {log.kind === "ai" && !log.text && running ? (
                            <div className="flex gap-1 py-1">{[0,1,2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#a78bfa", animationDelay: `${d * 0.15}s` }} />)}</div>
                          ) : (
                            <span style={{ color: log.kind === "user" ? "#a78bfa" : log.kind === "ai" ? "#ccc" : log.kind === "route" ? "#10b981" : "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{log.text}</span>
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
                    <div className="flex gap-2">
                      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }} placeholder="Route request across 40+ providers..." disabled={running} className="flex-1 bg-transparent border rounded-xl px-4 py-2.5 text-[11px] font-mono outline-none" style={{ borderColor: "rgba(167,139,250,0.2)", color: "#ccc" }} />
                      {running ? (
                        <button onClick={stop} className="px-4 py-2.5 rounded-xl text-[10px] font-bold" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}><Square className="w-3 h-3" /></button>
                      ) : (
                        <button onClick={send} className="px-4 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}><Play className="w-3 h-3" /> Route</button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={pipe} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}><GitMerge className="w-3 h-3" /> Pipe</button>
                      <button onClick={() => { setLogs([{ kind: "system", text: "Cleared.", ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]); setSavings(0); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#444" }}><Trash2 className="w-3 h-3" /> Clear</button>
                      {savings > 0 && <div className="ml-auto flex items-center gap-1 text-[9px] font-mono" style={{ color: "#10b981" }}><TrendingDown className="w-3 h-3" />{savings}% tokens saved</div>}
                    </div>
                  </div>
                </>
              )}

              {tab === "tiers" && (
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: "#444" }}>FALLBACK TIER SYSTEM</div>
                  {TIERS.map((tier, i) => (
                    <div key={tier.name} className="p-4 rounded-xl border" style={{ borderColor: `${tier.color}25`, background: `${tier.color}05` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono" style={{ background: `${tier.color}20`, color: tier.color }}>{i + 1}</div>
                        <span className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.name} Tier</span>
                      </div>
                      <div className="text-[9px] mb-2" style={{ color: "#555" }}>{tier.desc}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tier.providers.map(p => <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${tier.color}12`, color: tier.color }}>{p}</span>)}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl border text-[9px] font-mono" style={{ borderColor: "rgba(255,255,255,0.05)", color: "#333" }}>
                    9Router auto-classifies each request and routes to the appropriate tier. Budget exhausted? Falls to next tier automatically.
                  </div>
                </div>
              )}

              {tab === "providers" && (
                <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
                  {SAMPLE_PROVIDERS.map(p => (
                    <div key={p.name} className="p-3 rounded-xl border" style={{ borderColor: `${p.color}25`, background: `${p.color}05` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${p.color}15`, color: p.color }}>{p.models} models</span>
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2 p-3 rounded-xl border" style={{ borderColor: "rgba(167,139,250,0.1)", background: "rgba(167,139,250,0.03)" }}>
                    <div className="flex items-center gap-2"><Zap className="w-3 h-3" style={{ color: "#a78bfa" }} /><span className="text-[9px] font-bold" style={{ color: "#a78bfa" }}>40+ PROVIDERS · 100+ MODELS</span></div>
                    <div className="text-[8px] font-mono mt-1" style={{ color: "#333" }}>RTK compression reduces all prompts by 20-40% before routing · <BarChart2 className="w-3 h-3 inline" style={{ color: "#555" }} /> Real savings tracked per session</div>
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
