import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, RotateCcw, GitMerge, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface NanoBotModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Msg = { role: "user" | "bot"; text: string; ts: string };

const PRESETS = [
  { label: "Explain like I'm 5", prompt: "Explain this concept simply:" },
  { label: "Fix this bug", prompt: "Find and fix the bug in this code:" },
  { label: "Quick summary", prompt: "Summarize this in 3 bullet points:" },
  { label: "Generate regex", prompt: "Write a regex pattern that matches:" },
  { label: "Shell one-liner", prompt: "Write a bash one-liner to:" },
  { label: "SQL query", prompt: "Write a SQL query to:" },
];

export function NanoBotModal({ open, onOpenChange }: NanoBotModalProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setMsgs((prev) => [...prev, { role: "user", text: q, ts }]);
    setStreaming(true);
    const botTs = new Date().toLocaleTimeString("en-US", { hour12: false });
    setMsgs((prev) => [...prev, { role: "bot", text: "", ts: botTs }]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are NanoBot — a compact, fast, highly capable AI assistant. Give short, precise, directly actionable answers. No fluff. If asked for code, give working code immediately." },
            ...msgs.filter((m) => m.role === "user").map((m) => ({ role: "user", content: m.text })),
            { role: "user", content: q },
          ],
          model: "gpt-5-mini",
          stream: true,
        }),
        signal: abortRef.current.signal,
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            full += delta;
            setMsgs((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: full } : m));
          } catch { /* ignore */ }
        }
      }
      if (full) pipeline.push({ source: "NANOBOT", sourceColor: "#00e5cc", label: q.slice(0, 40), content: full });
    } catch { /* ignore */ }
    setStreaming(false);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(0,229,204,0.25)", boxShadow: "0 0 50px rgba(0,229,204,0.1)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,229,204,0.2)", background: "rgba(0,229,204,0.04)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: "rgba(0,229,204,0.1)", borderColor: "rgba(0,229,204,0.4)" }}>
                  <Bot className="w-4 h-4" style={{ color: "#00e5cc" }} />
                </div>
                <div>
                  <div className="text-[12px] font-black tracking-widest" style={{ color: "#00e5cc" }}>NANOBOT</div>
                  <div className="text-[9px]" style={{ color: "#555" }}>Fast lightweight AI — direct, no fluff</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setMsgs([])} className="p-1.5 text-gray-600 hover:text-teal-400"><RotateCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex gap-1 px-3 py-2 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => setInput(p.prompt + " ")}
                  className="px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                  style={{ background: "rgba(0,229,204,0.05)", borderColor: "rgba(0,229,204,0.15)", color: "#1a7a70" }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Zap className="w-8 h-8" style={{ color: "#0a2a28" }} />
                  <div className="text-[10px] font-mono" style={{ color: "#333" }}>Fast answers. No fluff. Ask anything.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] rounded-xl px-3 py-2"
                    style={{
                      background: m.role === "user" ? "rgba(0,229,204,0.1)" : "#0d0d0d",
                      border: `1px solid ${m.role === "user" ? "rgba(0,229,204,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: m.role === "user" ? "#00e5cc" : "#888" }}>{m.text || (streaming && i === msgs.length - 1 ? "▊" : "")}</div>
                    <div className="text-[8px] mt-1 font-mono" style={{ color: "#2a2a2a" }}>{m.ts}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Actions for last bot message */}
            {msgs.length > 0 && !streaming && msgs[msgs.length - 1].role === "bot" && (
              <div className="px-3 py-1.5 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={() => pipeline.push({ source: "NANOBOT", sourceColor: "#00e5cc", label: "NanoBot output", content: msgs[msgs.length - 1].text })}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold border"
                  style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                  <GitMerge className="w-3 h-3" /> Pipe
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Ask anything… Enter to send"
                  disabled={streaming}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none"
                  style={{ borderColor: "rgba(0,229,204,0.2)", color: "#ccc" }} />
                <button onClick={() => send()} disabled={streaming || !input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(0,229,204,0.2)", border: "1px solid rgba(0,229,204,0.4)" }}>
                  <Send className="w-3.5 h-3.5" style={{ color: "#00e5cc" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
