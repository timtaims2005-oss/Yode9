import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, GitMerge, Layers, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CCSwitchModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MODELS = [
  { id: "gpt-5.4", label: "GPT-5.4", color: "#10b981" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", color: "#60a5fa" },
  { id: "o4-mini", label: "o4-mini", color: "#c084fc" },
  { id: "gpt-5.2", label: "GPT-5.2", color: "#fbbf24" },
];

type ModelResult = {
  modelId: string;
  label: string;
  color: string;
  content: string;
  status: "idle" | "streaming" | "done" | "error";
};

export function CCSwitchModal({ open, onOpenChange }: CCSwitchModalProps) {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["gpt-5.4", "gpt-5-mini"]));
  const [results, setResults] = useState<ModelResult[]>([]);
  const [running, setRunning] = useState(false);
  const abortRefs = useRef<AbortController[]>([]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  async function run() {
    if (!input.trim() || running) return;
    const q = input.trim();
    setRunning(true);
    setInput("");
    abortRefs.current.forEach((c) => c.abort());
    abortRefs.current = [];

    const selectedModels = MODELS.filter((m) => selected.has(m.id));
    const initial: ModelResult[] = selectedModels.map((m) => ({
      modelId: m.id, label: m.label, color: m.color, content: "", status: "streaming",
    }));
    setResults(initial);

    const promises = selectedModels.map(async (m) => {
      const abort = new AbortController();
      abortRefs.current.push(abort);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: q }], model: m.id, stream: true }),
          signal: abort.signal,
        });
        const reader = res.body?.getReader();
        const dec = new TextDecoder();
        let buf = "";
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
              if (delta) {
                setResults((prev) => prev.map((r) =>
                  r.modelId === m.id ? { ...r, content: r.content + delta } : r
                ));
              }
            } catch { /* ignore */ }
          }
        }
        setResults((prev) => prev.map((r) => r.modelId === m.id ? { ...r, status: "done" } : r));
      } catch {
        setResults((prev) => prev.map((r) => r.modelId === m.id ? { ...r, status: "error", content: r.content || "[error]" } : r));
      }
    });

    await Promise.all(promises);
    setRunning(false);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 60px rgba(99,102,241,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.4)" }}>
                  <Layers className="w-4 h-4" style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#6366f1" }}>CC SWITCH</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Compare multiple models side-by-side simultaneously</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setResults([]); setInput(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Model selector */}
            <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[10px] font-mono" style={{ color: "#444" }}>Models:</span>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                  style={{
                    background: selected.has(m.id) ? `${m.color}15` : "transparent",
                    borderColor: selected.has(m.id) ? `${m.color}50` : "rgba(255,255,255,0.08)",
                    color: selected.has(m.id) ? m.color : "#444",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Results grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Layers className="w-10 h-10" style={{ color: "#1a1a3e" }} />
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>Select models and enter a prompt to compare responses</div>
                </div>
              )}
              <div className={`grid gap-3 ${results.length >= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {results.map((r) => (
                  <motion.div
                    key={r.modelId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3.5 flex flex-col gap-2"
                    style={{ background: `${r.color}08`, border: `1px solid ${r.color}25` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color, boxShadow: r.status === "streaming" ? `0 0 6px ${r.color}` : "none" }} />
                        <span className="text-[10px] font-bold font-mono" style={{ color: r.color }}>{r.label}</span>
                        {r.status === "streaming" && <span className="text-[8px] animate-pulse" style={{ color: "#555" }}>streaming…</span>}
                      </div>
                      {r.status === "done" && (
                        <button
                          onClick={() => pipeline.push({ source: "CCSWITCH", sourceColor: r.color, label: `${r.label} response`, content: r.content })}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-bold border"
                          style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                        >
                          <GitMerge className="w-2.5 h-2.5" />
                          Pipe
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed" style={{ color: "#666", whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
                      {r.content || (r.status === "streaming" ? "…" : "")}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                  placeholder={`Compare across ${selected.size} model${selected.size > 1 ? "s" : ""}…`}
                  disabled={running}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[12px] outline-none"
                  style={{ borderColor: "rgba(99,102,241,0.2)", color: "#ccc" }}
                />
                <button
                  onClick={run}
                  disabled={running || !input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}
                >
                  <Send className="w-4 h-4" style={{ color: "#6366f1" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
