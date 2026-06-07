import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Send, Copy, CheckCheck, GitMerge, RotateCcw, ChevronRight } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CodexMobileModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const QUICK_ACTIONS = [
  { label: "Review PR", prompt: "Review this pull request and identify issues:" },
  { label: "Write tests", prompt: "Write comprehensive unit tests for this code:" },
  { label: "Refactor", prompt: "Refactor this code for readability and performance:" },
  { label: "Add types", prompt: "Add full TypeScript types to this JavaScript code:" },
  { label: "Gen docs", prompt: "Generate JSDoc/docstring documentation for:" },
  { label: "Find bugs", prompt: "Find all bugs and security issues in:" },
  { label: "Optimize", prompt: "Optimize this code for performance. Show Big-O analysis:" },
  { label: "Convert", prompt: "Convert this code to Python/TypeScript/Go:" },
];

type ConvItem = { role: "user" | "ai"; text: string };

export function CodexMobileModal({ open, onOpenChange }: CodexMobileModalProps) {
  const [conv, setConv] = useState<ConvItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setConv((prev) => [...prev, { role: "user", text }]);
    setStreaming(true);
    setConv((prev) => [...prev, { role: "ai", text: "" }]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are Codex Mobile — an expert coding assistant optimized for rapid, precise responses. Give working code immediately. Use markdown code blocks. Be concise but complete." },
            ...conv.map((c) => ({ role: c.role === "user" ? "user" : "assistant", content: c.text })),
            { role: "user", content: text },
          ],
          model: "gpt-5.4",
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
          try { const c = JSON.parse(raw); const d = c.content ?? c.choices?.[0]?.delta?.content ?? ""; full += d; setConv((p) => p.map((item, i) => i === p.length - 1 ? { ...item, text: full } : item)); } catch { /* ignore */ }
        }
      }
      if (full) pipeline.push({ source: "CODEXMOBILE", sourceColor: "#34d399", label: text.slice(0, 40), content: full });
    } catch { /* ignore */ }
    setStreaming(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const lastAI = [...conv].reverse().find((c) => c.role === "ai");

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(52,211,153,0.25)", boxShadow: "0 0 60px rgba(52,211,153,0.1)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.4)" }}>
                  <Smartphone className="w-4 h-4" style={{ color: "#34d399" }} />
                </div>
                <div>
                  <div className="text-[12px] font-black tracking-widest" style={{ color: "#34d399" }}>CODEX MOBILE</div>
                  <div className="text-[9px]" style={{ color: "#555" }}>Mobile code assistant — fast & precise</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setConv([]); setInput(""); }} className="p-1.5 text-gray-600 hover:text-emerald-400"><RotateCcw className="w-3.5 h-3.5" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {QUICK_ACTIONS.map((a) => (
                <button key={a.label} onClick={() => setInput(a.prompt + " ")}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold border whitespace-nowrap flex-shrink-0 transition-all"
                  style={{ background: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.15)", color: "#1a5a3e" }}>
                  <ChevronRight className="w-2.5 h-2.5 inline mr-0.5" />{a.label}
                </button>
              ))}
            </div>

            {/* Conversation */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {conv.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Smartphone className="w-8 h-8" style={{ color: "#0a2a1e" }} />
                  <div className="text-[10px] font-mono" style={{ color: "#333" }}>Paste code or describe your task</div>
                </div>
              )}
              {conv.map((item, i) => (
                <div key={i} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[90%] rounded-xl px-3 py-2"
                    style={{ background: item.role === "user" ? "rgba(52,211,153,0.1)" : "#0d0d0d", border: `1px solid ${item.role === "user" ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: item.role === "user" ? "#34d399" : "#888" }}>
                      {item.text}{streaming && i === conv.length - 1 && item.role === "ai" ? "▊" : ""}
                    </pre>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {lastAI && !streaming && (
              <div className="px-3 py-1.5 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={() => { navigator.clipboard.writeText(lastAI.text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold border"
                  style={{ background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.2)", color: "#34d399" }}>
                  {copied ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />} {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={() => pipeline.push({ source: "CODEXMOBILE", sourceColor: "#34d399", label: "Codex output", content: lastAI.text })}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold border"
                  style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                  <GitMerge className="w-2.5 h-2.5" /> Pipe
                </button>
              </div>
            )}

            <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Paste code or describe task… (Enter to send)"
                  disabled={streaming} rows={2}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none resize-none font-mono"
                  style={{ borderColor: "rgba(52,211,153,0.2)", color: "#ccc" }} />
                <button onClick={() => send()} disabled={streaming || !input.trim()}
                  className="w-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.4)" }}>
                  <Send className="w-4 h-4" style={{ color: "#34d399" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
