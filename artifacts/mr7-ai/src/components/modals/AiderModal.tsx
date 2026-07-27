import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Terminal, Code2, GitBranch, Play, Square, ChevronRight,
  Zap, FileCode, RefreshCw, Copy, CheckCheck, Send, Brain,
  Layers, Settings, Search, Plus, Trash2, RotateCcw, Eye,
  GitCommit, FileText, AlertCircle, CheckSquare, Cpu, Sparkles,
} from "lucide-react";

const A = "#f97316"; // aider orange
const Ag = (n: number) => `rgba(249,115,22,${n})`;
const TEAL = "#00e5cc";

interface AiderModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "terminal" | "diff" | "files" | "models" | "history";

interface Message { role: "user" | "assistant" | "system"; content: string; ts: number; }
interface FileEntry { path: string; lang: string; tokens: number; active: boolean; }
interface HistoryEntry { cmd: string; status: "ok" | "err"; ts: number; diff: number; }

const AIDER_MODELS = [
  { id: "claude-opus-4-5",   name: "Claude Opus 4.5",  vendor: "Anthropic",  cost: "$15/$75",  ctx: "200K", icon: "🟠", best: true },
  { id: "claude-sonnet-3-7", name: "Claude Sonnet 3.7",vendor: "Anthropic",  cost: "$3/$15",   ctx: "200K", icon: "🟡" },
  { id: "gpt-4o",            name: "GPT-4o",           vendor: "OpenAI",     cost: "$5/$15",   ctx: "128K", icon: "🟢" },
  { id: "o3-mini",           name: "o3-mini",          vendor: "OpenAI",     cost: "$1.1/$4.4",ctx: "128K", icon: "⚪" },
  { id: "deepseek-r1",       name: "DeepSeek R1",      vendor: "DeepSeek",   cost: "$0.55/$2.2",ctx: "64K", icon: "🔵" },
  { id: "gemini-2.5-pro",    name: "Gemini 2.5 Pro",   vendor: "Google",     cost: "$1.25/$10",ctx: "1M",   icon: "💜" },
  { id: "llama-3.3-70b",     name: "Llama 3.3 70B",    vendor: "Local",      cost: "Free",     ctx: "128K", icon: "🦙" },
];

const QUICK_CMDS = [
  "/add src/components/App.tsx",
  "/diff",
  "/commit 'refactor: improve performance'",
  "/undo",
  "/clear",
  "/run npm test",
  "/voice",
  "/help",
];

const SAMPLE_FILES: FileEntry[] = [
  { path: "src/App.tsx",         lang: "tsx",  tokens: 1420, active: true  },
  { path: "src/lib/api.ts",      lang: "ts",   tokens: 890,  active: true  },
  { path: "src/components/UI.tsx",lang:"tsx",  tokens: 2100, active: false },
  { path: "tests/api.test.ts",   lang: "ts",   tokens: 560,  active: false },
  { path: "package.json",        lang: "json", tokens: 180,  active: true  },
];

const SAMPLE_HISTORY: HistoryEntry[] = [
  { cmd: "Add dark mode toggle to header",             status: "ok",  ts: Date.now() - 320000, diff: 42 },
  { cmd: "Fix TypeScript errors in auth module",       status: "ok",  ts: Date.now() - 1800000, diff: 18 },
  { cmd: "Refactor API calls to use React Query",      status: "ok",  ts: Date.now() - 5400000, diff: 127 },
  { cmd: "Write unit tests for utils/format.ts",       status: "err", ts: Date.now() - 86400000, diff: 0  },
  { cmd: "Implement WebSocket real-time updates",      status: "ok",  ts: Date.now() - 172800000, diff: 89 },
];

const SAMPLE_DIFF = `--- a/src/App.tsx
+++ b/src/App.tsx
@@ -12,7 +12,7 @@ import { useState } from 'react';
 
 export function App() {
-  const [dark, setDark] = useState(false);
+  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
 
   useEffect(() => {
-    document.documentElement.classList.toggle('dark', dark);
+    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
+    localStorage.setItem('theme', dark ? 'dark' : 'light');
   }, [dark]);`;

function ScanLine() {
  return <motion.div className="absolute inset-x-0 h-px pointer-events-none z-20" style={{ background: `linear-gradient(90deg, transparent, ${A}66, transparent)` }} animate={{ top: ["0%", "100%"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />;
}

export function AiderModal({ open, onOpenChange }: AiderModalProps) {
  const [tab, setTab] = useState<Tab>("terminal");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Aider v0.77.0 · AI pair programming in your terminal", ts: Date.now() - 5000 },
    { role: "assistant", content: "Hello! I'm Aider, your AI pair programming partner. I can edit your code, run tests, commit changes, and more. What would you like to work on?", ts: Date.now() - 3000 },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-3-7");
  const [files, setFiles] = useState(SAMPLE_FILES);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(async (text?: string) => {
    const prompt = text ?? input;
    if (!prompt.trim()) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: prompt, ts: Date.now() }]);
    setStreaming(true);
    try {
      const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `You are Aider, an AI pair programming assistant. The user says: ${prompt}. Respond as Aider would — concise, technical, and helpful. Mention specific file edits, diffs, or commands when relevant. Keep under 150 words.` }], stream: true }) });
      if (!resp.ok || !resp.body) throw new Error("stream failed");
      const reader = resp.body.getReader(); const dec = new TextDecoder();
      let buf = "", full = "";
      setMessages(m => [...m, { role: "assistant", content: "", ts: Date.now() }]);
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
          try { const o = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c = o.content ?? o.choices?.[0]?.delta?.content ?? ""; if (c) { full += c; setMessages(m => { const n = [...m]; n[n.length - 1] = { ...n[n.length - 1], content: full }; return n; }); } } catch { /* */ }
        }
      }
    } catch { setMessages(m => [...m, { role: "assistant", content: "⚠ Connection error. Check your API key.", ts: Date.now() }]); }
    setStreaming(false);
  }, [input]);

  if (!open) return null;

  const TabBtn = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof Terminal }) => (
    <button onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all" style={{ background: tab === id ? Ag(0.15) : "rgba(255,255,255,0.03)", border: `1px solid ${tab === id ? Ag(0.45) : "rgba(255,255,255,0.07)"}`, color: tab === id ? A : "rgba(255,255,255,0.45)" }}>
      <Icon size={11} />{label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(14,7,2,0.97) 0%, rgba(8,4,1,0.98) 100%)", backdropFilter: "blur(40px)", border: `1px solid ${Ag(0.25)}`, boxShadow: `0 0 80px ${Ag(0.12)}, 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 ${Ag(0.1)}` }} initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}>
          <ScanLine />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Ag(0.15), background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Ag(0.15), border: `1px solid ${Ag(0.35)}` }} animate={{ boxShadow: [`0 0 10px ${Ag(0.2)}`, `0 0 20px ${Ag(0.4)}`, `0 0 10px ${Ag(0.2)}`] }} transition={{ duration: 2, repeat: Infinity }}>
                <Code2 size={18} style={{ color: A }} />
              </motion.div>
              <div>
                <div className="text-sm font-black font-mono" style={{ color: A }}>AIDER</div>
                <div className="text-[10px] font-mono" style={{ color: "#444" }}>AI Pair Programming · v0.77.0</div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                CONNECTED
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="text-[10px] font-mono px-2 py-1 rounded-lg border cursor-pointer" style={{ background: "rgba(0,0,0,0.8)", borderColor: Ag(0.2), color: "#aaa" }}>
                {AIDER_MODELS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
              </select>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <X size={14} style={{ color: "rgba(255,255,255,0.55)" }} />
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: Ag(0.08) }}>
            <TabBtn id="terminal" label="TERMINAL" icon={Terminal} />
            <TabBtn id="diff"     label="DIFF"     icon={FileCode} />
            <TabBtn id="files"    label="FILES"    icon={Layers} />
            <TabBtn id="models"   label="MODELS"   icon={Brain} />
            <TabBtn id="history"  label="HISTORY"  icon={GitCommit} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* ── TERMINAL ── */}
              {tab === "terminal" && (
                <motion.div key="terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
                    {messages.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role !== "user" && (
                          <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: msg.role === "system" ? "rgba(100,100,100,0.15)" : Ag(0.15), border: `1px solid ${msg.role === "system" ? "rgba(100,100,100,0.2)" : Ag(0.3)}` }}>
                            {msg.role === "system" ? <Settings size={10} color="#666" /> : <Code2 size={10} style={{ color: A }} />}
                          </div>
                        )}
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed`} style={{ background: msg.role === "user" ? Ag(0.15) : msg.role === "system" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)", border: `1px solid ${msg.role === "user" ? Ag(0.3) : "rgba(255,255,255,0.06)"}`, color: msg.role === "system" ? "#444" : "#ccc" }}>
                          {msg.content || <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}>▌</motion.span>}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Quick Commands */}
                  <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
                    {QUICK_CMDS.slice(0, 5).map(cmd => (
                      <button key={cmd} onClick={() => send(cmd)} className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all" style={{ background: Ag(0.06), border: `1px solid ${Ag(0.15)}`, color: A }}>
                        {cmd}
                      </button>
                    ))}
                  </div>
                  {/* Input */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Ag(0.2)}` }}>
                      <ChevronRight size={14} style={{ color: A }} />
                      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="Ask Aider to edit your code…" className="flex-1 bg-transparent outline-none font-mono text-sm text-gray-300 placeholder-gray-600" disabled={streaming} />
                      <button onClick={() => send()} disabled={streaming || !input.trim()} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all" style={{ background: input.trim() ? Ag(0.2) : "transparent", border: `1px solid ${input.trim() ? Ag(0.4) : "transparent"}` }}>
                        {streaming ? <RefreshCw size={12} style={{ color: A }} className="animate-spin" /> : <Send size={12} style={{ color: A }} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── DIFF ── */}
              {tab === "diff" && (
                <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-4 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.38)" }}>LAST COMMIT DIFF · src/App.tsx</div>
                    <button onClick={() => { navigator.clipboard.writeText(SAMPLE_DIFF); setCopiedDiff(true); setTimeout(() => setCopiedDiff(false), 2000); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: Ag(0.08), border: `1px solid ${Ag(0.2)}`, color: A }}>
                      {copiedDiff ? <><CheckCheck size={10} /> COPIED</> : <><Copy size={10} /> COPY</>}
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto rounded-xl font-mono text-xs p-4" style={{ background: "rgba(0,0,0,0.6)", border: `1px solid ${Ag(0.12)}` }}>
                    {SAMPLE_DIFF.split("\n").map((line, i) => (
                      <div key={i} className="py-0.5" style={{ color: line.startsWith("+") ? "#4ade80" : line.startsWith("-") ? "#f87171" : line.startsWith("@@") ? "#60a5fa" : "#666" }}>
                        {line || <>&nbsp;</>}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: "Lines Added", val: "+12", color: "#4ade80" }, { label: "Lines Removed", val: "-3", color: "#f87171" }, { label: "Files Changed", val: "1", color: A }].map(s => (
                      <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.val}</div>
                        <div className="text-[10px] font-mono text-gray-500 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── FILES ── */}
              {tab === "files" && (
                <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Search size={14} style={{ color: "rgba(255,255,255,0.35)" }} />
                    <input placeholder="Filter files…" className="flex-1 bg-transparent outline-none text-xs font-mono placeholder-gray-600" style={{ color: "rgba(255,255,255,0.65)" }} />
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: Ag(0.1), border: `1px solid ${Ag(0.25)}`, color: A }}>
                      <Plus size={10} />ADD FILE
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {files.map((f, i) => (
                      <motion.div key={f.path} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{ background: f.active ? Ag(0.08) : "rgba(255,255,255,0.03)", border: `1px solid ${f.active ? Ag(0.2) : "rgba(255,255,255,0.06)"}` }}>
                        <FileCode size={14} style={{ color: f.active ? A : "rgba(255,255,255,0.38)" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono truncate" style={{ color: f.active ? "#ddd" : "rgba(255,255,255,0.52)" }}>{f.path}</div>
                          <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{f.lang} · {f.tokens.toLocaleString()} tokens</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {f.active && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: Ag(0.15), color: A }}>IN CONTEXT</span>}
                          <button onClick={() => setFiles(fs => fs.map(x => x.path === f.path ? { ...x, active: !x.active } : x))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                            {f.active ? <CheckSquare size={11} style={{ color: A }} /> : <Eye size={11} style={{ color: "rgba(255,255,255,0.4)" }} />}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "rgba(249,115,22,0.05)", border: `1px solid ${Ag(0.15)}` }}>
                    <div className="text-[10px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.42)" }}>CONTEXT WINDOW</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: A, width: "38%" }} initial={{ width: 0 }} animate={{ width: "38%" }} transition={{ duration: 0.8 }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: A }}>5,150 / 200K tokens</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── MODELS ── */}
              {tab === "models" && (
                <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 grid grid-cols-1 gap-2">
                  {AIDER_MODELS.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelectedModel(m.id)} className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all" style={{ background: selectedModel === m.id ? Ag(0.1) : "rgba(255,255,255,0.03)", border: `1px solid ${selectedModel === m.id ? Ag(0.3) : "rgba(255,255,255,0.06)"}` }}>
                      <span className="text-2xl">{m.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: selectedModel === m.id ? A : "#ccc" }}>{m.name}</span>
                          {m.best && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "rgba(250,204,21,0.15)", color: "#fbbf24" }}>BEST</span>}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{m.vendor} · {m.ctx} context · {m.cost}/1M tokens</div>
                      </div>
                      {selectedModel === m.id && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: Ag(0.2) }}><CheckCheck size={10} style={{ color: A }} /></motion.div>}
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* ── HISTORY ── */}
              {tab === "history" && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-2">
                  {SAMPLE_HISTORY.map((h, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${h.status === "ok" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)"}` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: h.status === "ok" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)" }}>
                        {h.status === "ok" ? <CheckCheck size={13} color="#4ade80" /> : <AlertCircle size={13} color="#f87171" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono truncate" style={{ color: "#ccc" }}>{h.cmd}</div>
                        <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.32)" }}>{new Date(h.ts).toLocaleString()}</div>
                      </div>
                      {h.diff > 0 && <span className="text-[10px] font-mono" style={{ color: "#4ade80" }}>+{h.diff} lines</span>}
                      <button onClick={() => { setTab("terminal"); setInput(h.cmd); }} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: Ag(0.06) }}><RotateCcw size={10} style={{ color: A }} /></button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: Ag(0.1), background: "rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>aider v0.77.0</span>
              <span>·</span>
              <span>{files.filter(f => f.active).length} files in context</span>
              <span>·</span>
              <span style={{ color: A }}>singularity 88%</span>
            </div>
            <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }}>
              <Sparkles size={12} style={{ color: A }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
