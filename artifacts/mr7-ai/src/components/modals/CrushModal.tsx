import { useState, useRef, useEffect } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, Plus, Trash2, Play, ChevronRight, Settings, GitBranch, FileCode, Shield, Zap, Book } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface CrushModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Provider = { id: string; label: string; models: string[]; color: string };
const PROVIDERS: Provider[] = [
  { id: "anthropic", label: "Anthropic",  models: ["claude-opus-4", "claude-sonnet-4", "claude-haiku-3.5"], color: "#fb923c" },
  { id: "openai",    label: "OpenAI",     models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"],                  color: "#10b981" },
  { id: "gemini",    label: "Gemini",     models: ["gemini-2.5-pro", "gemini-2.5-flash"],                  color: "#818cf8" },
  { id: "bedrock",   label: "Bedrock",    models: ["bedrock/claude-3.7", "bedrock/llama-4"],                color: "#f59e0b" },
  { id: "copilot",   label: "Copilot",    models: ["copilot/gpt-4o", "copilot/claude"],                    color: "#3b82f6" },
];

type HookType = "block" | "rewrite" | "inject" | "approve" | "log";
type Hook = { id: string; name: string; matcher: string; type: HookType; command: string; enabled: boolean };

const HOOK_COLORS: Record<HookType, string> = {
  block:   "#e21227",
  rewrite: "#fbbf24",
  inject:  "#10b981",
  approve: "#3b82f6",
  log:     "#a78bfa",
};

type Session = { id: string; name: string; provider: string; model: string; msgs: number; created: string };
type Msg = { role: "user" | "assistant"; content: string; ts: string };

const DEMO_SESSIONS: Session[] = [
  { id: "s1", name: "Fix auth middleware",  provider: "anthropic", model: "claude-sonnet-4",  msgs: 12, created: "2026-05-20" },
  { id: "s2", name: "Refactor DB layer",    provider: "openai",    model: "gpt-5.4",          msgs: 8,  created: "2026-05-19" },
  { id: "s3", name: "Add TypeScript types", provider: "gemini",    model: "gemini-2.5-flash", msgs: 5,  created: "2026-05-18" },
];

const DEMO_HOOKS: Hook[] = [
  { id: "h1", name: "Block git push -f",   matcher: "^bash$", type: "block",   command: "echo $CRUSH_TOOL_INPUT_COMMAND | grep -q 'push.*-f' && exit 2", enabled: true },
  { id: "h2", name: "Inject gofumpt hint",  matcher: "^(write|edit)$", type: "inject",  command: "echo 'Run gofumpt after editing Go files'", enabled: true },
  { id: "h3", name: "Auto-approve safe ls", matcher: "^bash$", type: "approve", command: "echo $CRUSH_TOOL_INPUT_COMMAND | grep -qE '^(ls|pwd|echo)' && exit 0", enabled: false },
  { id: "h4", name: "Log all edits",        matcher: "^(write|edit|patch)$", type: "log", command: "echo \"[$(date)] Edit: $CRUSH_TOOL_INPUT_PATH\" >> ~/.crush-audit.log", enabled: true },
];

const TAB_OPTIONS = ["SESSIONS", "CHAT", "HOOKS", "CONTEXT"];

export function CrushModal({ open, onOpenChange }: CrushModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("SESSIONS");
  const [sessions, setSessions] = useState<Session[]>(DEMO_SESSIONS);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [hooks, setHooks] = useState<Hook[]>(DEMO_HOOKS);
  const [providerId, setProviderId] = useState("anthropic");
  const [modelId, setModelId] = useState("claude-sonnet-4");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lspEnabled, setLspEnabled] = useState(true);
  const [newHookMatcher, setNewHookMatcher] = useState("^bash$");
  const [newHookType, setNewHookType] = useState<HookType>("block");
  const [newHookCommand, setNewHookCommand] = useState("");
  const [newHookName, setNewHookName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const provider = PROVIDERS.find(p => p.id === providerId)!;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function openSession(s: Session) {
    setActiveSession(s);
    setProviderId(s.provider);
    setModelId(s.model);
    setMsgs([
      { role: "assistant", content: `Session restored: **${s.name}**\n\nI have context from ${s.msgs} previous messages. LSP ${lspEnabled ? "enabled" : "disabled"}. ${hooks.filter(h => h.enabled).length} hooks active (PreToolUse).`, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    ]);
    setTab("CHAT");
  }

  function newSession() {
    const s: Session = {
      id: `s${Date.now()}`,
      name: "New session",
      provider: providerId,
      model: modelId,
      msgs: 0,
      created: new Date().toISOString().slice(0, 10),
    };
    setSessions(prev => [s, ...prev]);
    setActiveSession(s);
    setMsgs([{ role: "assistant", content: `New Crush session started.\n\nProvider: **${provider.label}** · Model: **${modelId}**\nLSP: ${lspEnabled ? "ON" : "OFF"} · Hooks: ${hooks.filter(h => h.enabled).length} active\n\nThis is your new coding bestie. I can read, write, and execute code. I integrate with LSPs for code intelligence and support MCP extensions. Type \`/help\` for available commands.`, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
    setTab("CHAT");
  }

  async function sendMsg() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setMsgs(prev => [...prev, { role: "user", content: userMsg, ts }]);
    setLoading(true);

    // Check if hook would fire
    const matchingHooks = hooks.filter(h => h.enabled && (userMsg.toLowerCase().includes("bash") || userMsg.toLowerCase().includes("edit") || userMsg.toLowerCase().includes("write")));
    if (matchingHooks.some(h => h.type === "block")) {
      await new Promise(r => setTimeout(r, 600));
      setMsgs(prev => [...prev, { role: "assistant", content: `[HOOK: PreToolUse BLOCKED]\n\nHook \`${matchingHooks.find(h => h.type === "block")?.name}\` blocked this tool call.\n\nHook output: Operation not permitted by project security policy.`, ts: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...msgs, { role: "user", content: userMsg }].slice(-8).map(m => ({ role: m.role, content: m.content })),
          model: "gpt-5.4",
          systemPrompt: `You are Crush, a terminal AI coding assistant by Charmbracelet. You can read, write, and execute code. You integrate with LSPs. You support multiple providers: ${PROVIDERS.map(p => p.label).join(", ")}. Currently using ${provider.label} / ${modelId}. LSP: ${lspEnabled ? "enabled" : "disabled"}. Active hooks: ${hooks.filter(h => h.enabled).map(h => h.name).join(", ") || "none"}. Respond concisely with code-focused answers. Use markdown code blocks for code.`
        }),
      });
      const reply = await readChatText(r);
      const replyTs = new Date().toLocaleTimeString("en-US", { hour12: false });
      setMsgs(prev => [...prev, { role: "assistant", content: reply, ts: replyTs }]);
      pipeline.push({ source: "Crush", sourceColor: "#a78bfa", label: userMsg.slice(0, 40), content: reply });
    } catch {
      toast({ description: "API error", variant: "destructive" });
    }
    setLoading(false);
  }

  function addHook() {
    if (!newHookCommand.trim() || !newHookName.trim()) return;
    setHooks(prev => [...prev, {
      id: `h${Date.now()}`, name: newHookName, matcher: newHookMatcher,
      type: newHookType, command: newHookCommand, enabled: true,
    }]);
    setNewHookName(""); setNewHookCommand("");
    toast({ description: "Hook added" });
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full max-w-3xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(167,139,250,0.4)", maxHeight: "92vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.05)" }}>
            <Terminal size={20} color="#a78bfa" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">CRUSH</div>
              <div className="text-xs" style={{ color: "#666" }}>Your coding bestie — multi-model · LSP-enhanced · MCP · hooks · sessions</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setLspEnabled(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all"
                style={{ borderColor: lspEnabled ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)", color: lspEnabled ? "#10b981" : "#555", background: lspEnabled ? "rgba(16,185,129,0.08)" : "transparent" }}
              >
                <FileCode size={11} /> LSP {lspEnabled ? "ON" : "OFF"}
              </button>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-white/10 transition-colors"><X size={16} color="#666" /></button>
            </div>
          </div>

          {/* Provider bar */}
          <div className="flex items-center gap-2 px-5 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflowX: "auto" }}>
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => { setProviderId(p.id); setModelId(p.models[0]); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs border whitespace-nowrap transition-all"
                style={{
                  borderColor: providerId === p.id ? p.color + "66" : "rgba(255,255,255,0.08)",
                  color: providerId === p.id ? p.color : "#666",
                  background: providerId === p.id ? p.color + "15" : "transparent",
                }}
              >{p.label}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <select value={modelId} onChange={e => setModelId(e.target.value)}
                className="text-xs border rounded px-2 py-1"
                style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }}
              >
                {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {TAB_OPTIONS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2.5 text-xs font-bold tracking-widest transition-colors"
                style={{ color: tab === t ? "#a78bfa" : "#555", borderBottom: tab === t ? "2px solid #a78bfa" : "2px solid transparent" }}
              >{t}</button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* SESSIONS tab */}
            {tab === "SESSIONS" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold tracking-widest" style={{ color: "#555" }}>WORK SESSIONS · {sessions.length}</div>
                  <button onClick={newSession}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(167,139,250,0.4)", color: "#a78bfa" }}
                  ><Plus size={12} /> NEW SESSION</button>
                </div>
                {sessions.map(s => {
                  const p = PROVIDERS.find(p => p.id === s.provider)!;
                  return (
                    <button key={s.id} onClick={() => openSession(s)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:border-purple-500/40 hover:bg-white/3"
                      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: p.color + "20", color: p.color }}>
                        <GitBranch size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{s.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#555" }}>{p.label} · {s.model} · {s.msgs} messages · {s.created}</div>
                      </div>
                      <ChevronRight size={14} color="#555" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* CHAT tab */}
            {tab === "CHAT" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full" style={{ color: "#444" }}>
                      <Terminal size={32} className="mb-3" />
                      <div className="text-sm">Open a session or create a new one</div>
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "assistant" && (
                        <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "rgba(167,139,250,0.2)" }}>
                          <Terminal size={12} color="#a78bfa" />
                        </div>
                      )}
                      <div className="max-w-[85%]">
                        <div className="px-3 py-2 rounded-lg text-sm whitespace-pre-wrap"
                          style={{ background: m.role === "user" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)", color: "#ddd", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px" }}
                        >{m.content}</div>
                        <div className="text-xs mt-0.5 px-1" style={{ color: "#444" }}>{m.ts}</div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(167,139,250,0.2)" }}>
                        <Terminal size={12} color="#a78bfa" />
                      </div>
                      <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <motion.div className="flex gap-1" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                          {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#a78bfa" }} />)}
                        </motion.div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex gap-2">
                    <input value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                      placeholder="Ask Crush to read, write, or execute code... (Enter to send)"
                      className="flex-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                    <button onClick={sendMsg} disabled={!input.trim() || loading}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                      style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
                    ><Play size={14} /></button>
                  </div>
                </div>
              </div>
            )}

            {/* HOOKS tab */}
            {tab === "HOOKS" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="text-xs" style={{ color: "#555" }}>
                  PreToolUse hooks run before any tool call. They can <span style={{ color: "#e21227" }}>block</span>, <span style={{ color: "#fbbf24" }}>rewrite</span>, <span style={{ color: "#10b981" }}>inject context</span>, <span style={{ color: "#3b82f6" }}>auto-approve</span>, or <span style={{ color: "#a78bfa" }}>log</span>.
                </div>
                {hooks.map(h => (
                  <div key={h.id} className="p-3 rounded-lg border" style={{ borderColor: `${HOOK_COLORS[h.type]}30`, background: `${HOOK_COLORS[h.type]}08` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: HOOK_COLORS[h.type] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{h.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold tracking-wider" style={{ background: HOOK_COLORS[h.type] + "25", color: HOOK_COLORS[h.type] }}>{h.type.toUpperCase()}</span>
                          <span className="text-xs font-mono" style={{ color: "#555" }}>matcher: {h.matcher}</span>
                        </div>
                        <div className="text-xs font-mono p-2 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#888", wordBreak: "break-all" }}>{h.command}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setHooks(prev => prev.map(x => x.id === h.id ? { ...x, enabled: !x.enabled } : x))}
                          className="text-xs px-2 py-1 rounded border transition-all"
                          style={{ borderColor: h.enabled ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)", color: h.enabled ? "#10b981" : "#555" }}
                        >{h.enabled ? "ON" : "OFF"}</button>
                        <button onClick={() => setHooks(prev => prev.filter(x => x.id !== h.id))} className="p-1 rounded hover:bg-white/5"><Trash2 size={12} color="#555" /></button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add hook form */}
                <div className="p-4 rounded-lg border border-dashed" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "#555" }}>ADD HOOK</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input value={newHookName} onChange={e => setNewHookName(e.target.value)} placeholder="Hook name"
                      className="px-3 py-1.5 rounded border text-xs" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                    <input value={newHookMatcher} onChange={e => setNewHookMatcher(e.target.value)} placeholder="Tool matcher regex (e.g. ^bash$)"
                      className="px-3 py-1.5 rounded border text-xs font-mono" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                    <select value={newHookType} onChange={e => setNewHookType(e.target.value as HookType)}
                      className="px-3 py-1.5 rounded border text-xs" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }}>
                      {(["block","rewrite","inject","approve","log"] as HookType[]).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={newHookCommand} onChange={e => setNewHookCommand(e.target.value)} placeholder="Shell command or script path"
                      className="px-3 py-1.5 rounded border text-xs font-mono" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                  </div>
                  <button onClick={addHook} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(167,139,250,0.4)", color: "#a78bfa" }}>
                    <Plus size={12} /> ADD HOOK
                  </button>
                </div>
              </div>
            )}

            {/* CONTEXT tab */}
            {tab === "CONTEXT" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>PROJECT CONTEXT FILES</div>
                <div className="text-xs mb-4" style={{ color: "#666" }}>
                  Crush reads context files from the working directory to understand project-specific instructions.
                </div>
                {[
                  { file: "AGENTS.md",   desc: "Agent-specific instructions and project overview",        found: true  },
                  { file: "CRUSH.md",    desc: "Crush-specific instructions (override AGENTS.md)",        found: false },
                  { file: "CLAUDE.md",   desc: "Claude Code instructions (shared with Crush)",            found: true  },
                  { file: "GEMINI.md",   desc: "Gemini CLI instructions (shared with Crush)",             found: false },
                  { file: ".local/AGENTS.md", desc: "Local overrides (gitignored)",                      found: false },
                ].map(f => (
                  <div key={f.file} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: f.found ? "#10b981" : "#333" }} />
                    <div>
                      <div className="text-sm font-mono" style={{ color: f.found ? "#ccc" : "#555" }}>{f.file}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#555" }}>{f.desc}</div>
                    </div>
                    <div className="ml-auto text-xs" style={{ color: f.found ? "#10b981" : "#444" }}>{f.found ? "FOUND" : "NOT FOUND"}</div>
                  </div>
                ))}
                <div className="p-3 rounded border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>LSP DISCOVERY</div>
                  {[
                    { lang: "TypeScript", cmd: "typescript-language-server", status: lspEnabled ? "ON" : "OFF", color: lspEnabled ? "#3b82f6" : "#333" },
                    { lang: "Go",         cmd: "gopls",                      status: lspEnabled ? "ON" : "OFF", color: lspEnabled ? "#00e5ff" : "#333" },
                    { lang: "Python",     cmd: "pylsp",                      status: "OFF",                     color: "#333" },
                    { lang: "Rust",       cmd: "rust-analyzer",              status: "OFF",                     color: "#333" },
                  ].map(l => (
                    <div key={l.lang} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <span className="text-xs" style={{ color: "#888" }}>{l.lang} <span className="font-mono" style={{ color: "#555" }}>({l.cmd})</span></span>
                      <span className="text-xs font-bold" style={{ color: l.color }}>{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
