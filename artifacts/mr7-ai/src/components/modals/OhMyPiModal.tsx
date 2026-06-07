import { useState, useRef, useEffect } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Send, Copy, CheckCheck, Terminal, Code2, Zap, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface OhMyPiModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Msg = { role: "user" | "pi"; content: string; ts: number };

const PI_SYSTEM = `You are Pi — the coding agent with the IDE wired in. Built with TypeScript + Rust + Bun.

You are an expert AI coding assistant that:
- Thinks like a senior engineer
- Provides working code, not pseudocode
- Explains architectural decisions
- Suggests performance optimizations
- Catches bugs before they happen
- Uses modern best practices

For code requests: provide complete, runnable implementations.
For debugging: trace the root cause systematically.
For architecture: think in components, dependencies, and data flow.
You are terse but precise. No filler. Ship quality.`;

const QUICK_ACTIONS = [
  { label: "Review my code", icon: "🔍", prompt: "Review this code and suggest improvements:" },
  { label: "Explain this", icon: "💡", prompt: "Explain this code in detail:" },
  { label: "Find bugs", icon: "🐛", prompt: "Find all bugs and issues in this code:" },
  { label: "Add types", icon: "📐", prompt: "Add TypeScript types to this code:" },
  { label: "Write tests", icon: "🧪", prompt: "Write comprehensive tests for:" },
  { label: "Optimize", icon: "⚡", prompt: "Optimize this code for performance:" },
];

export function OhMyPiModal({ open, onOpenChange }: OhMyPiModalProps) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "pi", content: "Pi coding agent online. IDE wired in. What are we building?", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: msg, ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = msgs.slice(-8).map(m => ({ role: m.role === "pi" ? "assistant" : "user" as const, content: m.content }));
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: PI_SYSTEM }, ...history, { role: "user", content: msg }],
          model: "gpt-5.4"
        }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        const piMsg: Msg = { role: "pi", content, ts: Date.now() };
        setMsgs(prev => [...prev, piMsg]);
        pipeline.push({ source: "OhMyPi", sourceColor: "#34d399", label: msg.slice(0, 50), content });
      } else {
        setMsgs(prev => [...prev, { role: "pi", content: "Pi agent processing your request...", ts: Date.now() }]);
      }
    } catch {
      setMsgs(prev => [...prev, { role: "pi", content: "Connection error. Retrying...", ts: Date.now() }]);
    }
    setLoading(false);
  }

  function copyMsg(content: string, ts: number) {
    navigator.clipboard.writeText(content);
    setCopied(ts);
    setTimeout(() => setCopied(null), 2000);
  }

  function reset() {
    setMsgs([{ role: "pi", content: "Pi coding agent online. IDE wired in. What are we building?", ts: Date.now() }]);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(52,211,153,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(52,211,153,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
                  <Cpu className="w-4 h-4" style={{ color: "#34d399" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">oh-my-pi</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Coding agent with the IDE wired in · TypeScript + Rust + Bun</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <RotateCcw className="w-3.5 h-3.5" style={{ color: "#444" }} />
                </button>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {QUICK_ACTIONS.map(a => (
                <button key={a.label} onClick={() => send(a.prompt)}
                  disabled={loading}
                  className="text-[9px] px-2 py-1 rounded-lg border transition-all disabled:opacity-40 flex items-center gap-1"
                  style={{ background: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.15)", color: "#555" }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.role === "pi" && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
                      <Cpu className="w-3 h-3" style={{ color: "#34d399" }} />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div className={`rounded-xl px-3 py-2.5 text-[11px] whitespace-pre-wrap ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                      style={{ background: m.role === "user" ? "rgba(226,18,39,0.12)" : "rgba(255,255,255,0.04)", color: "#ccc", border: `1px solid ${m.role === "user" ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                      {m.content}
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[8px] font-mono" style={{ color: "#333" }}>{new Date(m.ts).toLocaleTimeString()}</span>
                      {m.role === "pi" && (
                        <button onClick={() => copyMsg(m.content, m.ts)} className="text-[8px] flex items-center gap-0.5" style={{ color: "#333" }}>
                          {copied === m.ts ? <CheckCheck className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(52,211,153,0.15)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Cpu className="w-3 h-3" style={{ color: "#34d399" }} />
                    </motion.div>
                  </div>
                  <div className="rounded-xl px-3 py-2.5 text-[11px]" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ color: "#666" }}>
                      thinking…
                    </motion.span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask Pi to write, review, or fix code…"
                  rows={2} className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none resize-none"
                  style={{ borderColor: "rgba(52,211,153,0.2)", color: "#ccc" }} />
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all disabled:opacity-40 self-end"
                  style={{ background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.35)" }}>
                  <Send className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
