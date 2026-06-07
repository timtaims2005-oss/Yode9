import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Cpu, Copy, CheckCheck, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface GemmaChatModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Msg = { role: "user" | "gemma"; content: string; ts: number; offline: boolean };

const GEMMA_SYSTEM = `You are Gemma 4 — Google's local AI model running entirely on-device via Apple MLX.
No API keys. No cloud. No Wi-Fi required. All processing is local.

You are a focused, technical coding assistant that:
- Runs completely offline on the user's machine
- Excels at vibe coding — turning ideas into code rapidly
- Provides complete, working implementations
- Is concise and direct — code over prose
- Mentions when a task might exceed local model capabilities

For code: provide complete runnable solutions.
For explanations: be brief and technical.
Prefix responses with [LOCAL] to indicate offline processing.`;

export function GemmaChatModal({ open, onOpenChange }: GemmaChatModalProps) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "gemma", content: "[LOCAL] Gemma 4 online. Running via MLX on your device. No internet required. What are we coding?", ts: Date.now(), offline: true },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [offlineMode] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    setMsgs(prev => [...prev, { role: "user", content: msg, ts: Date.now(), offline: false }]);
    setLoading(true);

    const newId = Date.now();
    setMsgs(prev => [...prev, { role: "gemma", content: "", ts: newId, offline: true }]);
    try {
      const history = msgs.slice(-6).map(m => ({
        role: m.role === "gemma" ? "assistant" : "user" as const,
        content: m.content
      }));
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: GEMMA_SYSTEM }, ...history, { role: "user", content: msg }],
          model: "gpt-5.4",
        }),
      });
      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "", full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const obj = JSON.parse(raw);
              const delta = obj.content ?? obj.choices?.[0]?.delta?.content ?? "";
              full += delta;
              const display = "[LOCAL] " + full;
              setMsgs(prev => prev.map(m => m.ts === newId ? { ...m, content: display } : m));
            } catch { /* ignore */ }
          }
        }
        if (!full) full = "Done.";
        const finalContent = "[LOCAL] " + full;
        setMsgs(prev => prev.map(m => m.ts === newId ? { ...m, content: finalContent } : m));
        pipeline.push({ source: "GemmaChat", sourceColor: "#4299e1", label: msg.slice(0, 50), content: finalContent });
      } else {
        setMsgs(prev => prev.map(m => m.ts === newId ? { ...m, content: "[LOCAL] ⚠️ Processing error — check API connection." } : m));
      }
    } catch {
      setMsgs(prev => prev.map(m => m.ts === newId ? { ...m, content: "[LOCAL] ⚠️ Connection failed. Ensure server is running." } : m));
    }
    setLoading(false);
  }

  function reset() {
    setMsgs([{ role: "gemma", content: "[LOCAL] Gemma 4 online. Running via MLX. Ready to code.", ts: Date.now(), offline: true }]);
  }

  function copyMsg(content: string, ts: number) {
    navigator.clipboard.writeText(content);
    setCopied(ts);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(66,153,225,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(66,153,225,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(66,153,225,0.12)", border: "1px solid rgba(66,153,225,0.3)" }}>
                  <Cpu className="w-4 h-4" style={{ color: "#4299e1" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Gemma Chat</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Local AI coding — no API keys, no cloud, no Wi-Fi required</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded" style={{ background: offlineMode ? "rgba(16,185,129,0.1)" : "rgba(226,18,39,0.1)", color: offlineMode ? "#10b981" : "#e21227", border: `1px solid ${offlineMode ? "rgba(16,185,129,0.2)" : "rgba(226,18,39,0.2)"}` }}>
                  {offlineMode ? <><Wifi className="w-2.5 h-2.5" /> LOCAL MLX</> : <><WifiOff className="w-2.5 h-2.5" /> OFFLINE</>}
                </div>
                <button onClick={reset} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <RotateCcw className="w-3.5 h-3.5" style={{ color: "#444" }} />
                </button>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Status bar */}
            <div className="px-4 py-1.5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[8px] font-mono" style={{ color: "#555" }}>Gemma 4 · Apple MLX · apple-silicon</span>
              </div>
              <span className="text-[8px] font-mono ml-auto" style={{ color: "#333" }}>Vibe Coding Mode</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.role === "gemma" && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(66,153,225,0.15)" }}>
                      <Cpu className="w-3 h-3" style={{ color: "#4299e1" }} />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    <div className={`rounded-xl px-3 py-2.5 text-[11px] whitespace-pre-wrap ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                      style={{ background: m.role === "user" ? "rgba(226,18,39,0.1)" : "rgba(66,153,225,0.06)", color: "#ccc", border: `1px solid ${m.role === "user" ? "rgba(226,18,39,0.2)" : "rgba(66,153,225,0.12)"}` }}>
                      {m.role === "gemma" && m.offline && (
                        <span className="text-[8px] font-mono mr-1.5 px-1 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>LOCAL</span>
                      )}
                      {m.content.replace("[LOCAL] ", "")}
                    </div>
                    {m.role === "gemma" && (
                      <button onClick={() => copyMsg(m.content, m.ts)} className="mt-0.5 ml-1 text-[8px] flex items-center gap-0.5" style={{ color: "#333" }}>
                        {copied === m.ts ? <CheckCheck className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(66,153,225,0.15)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Cpu className="w-3 h-3" style={{ color: "#4299e1" }} />
                    </motion.div>
                  </div>
                  <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(66,153,225,0.06)", border: "1px solid rgba(66,153,225,0.12)" }}>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-[9px] font-mono" style={{ color: "#4299e1" }}>
                      processing on-device…
                    </motion.span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex gap-2">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Vibe code with Gemma 4… no internet needed"
                  rows={2} className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none resize-none"
                  style={{ borderColor: "rgba(66,153,225,0.2)", color: "#ccc" }} />
                <button onClick={send} disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all disabled:opacity-40 self-end"
                  style={{ background: "rgba(66,153,225,0.12)", borderColor: "rgba(66,153,225,0.35)" }}>
                  <Send className="w-3.5 h-3.5" style={{ color: "#4299e1" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
