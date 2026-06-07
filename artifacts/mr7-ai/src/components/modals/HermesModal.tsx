import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Zap, RotateCcw, Copy, CheckCheck, GitMerge } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface HermesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Step = {
  id: string;
  type: "think" | "plan" | "act" | "reflect" | "answer";
  label: string;
  content: string;
  status: "pending" | "running" | "done";
};

const HERMES_SYSTEM = `You are HERMES — the divine messenger agent. You reason in structured multi-step chains:

THINK → PLAN → ACT → REFLECT → ANSWER

For every query you must:
1. THINK: Internal monologue, parse what is truly being asked
2. PLAN: List the concrete steps to answer or solve
3. ACT: Execute each step, cite sources/tools if needed
4. REFLECT: Verify the answer, check for errors or gaps
5. ANSWER: Final precise, actionable response

Be analytical, deep, and thorough. Never skip steps. Always show your reasoning chain.`;

const STEP_TYPES: Step["type"][] = ["think", "plan", "act", "reflect", "answer"];
const STEP_LABELS: Record<Step["type"], string> = {
  think: "THINKING",
  plan: "PLANNING",
  act: "ACTING",
  reflect: "REFLECTING",
  answer: "ANSWER",
};
const STEP_COLORS: Record<Step["type"], string> = {
  think: "#fbbf24",
  plan: "#60a5fa",
  act: "#34d399",
  reflect: "#c084fc",
  answer: "#f87171",
};

export function HermesModal({ open, onOpenChange }: HermesModalProps) {
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  function reset() {
    abortRef.current?.abort();
    setSteps([]);
    setRunning(false);
    setInput("");
  }

  async function run() {
    if (!input.trim() || running) return;
    const query = input.trim();
    setInput("");
    setRunning(true);
    setSteps([]);

    const initialSteps: Step[] = STEP_TYPES.map((type) => ({
      id: type,
      type,
      label: STEP_LABELS[type],
      content: "",
      status: "pending",
    }));
    setSteps(initialSteps);

    abortRef.current = new AbortController();

    const messages = [
      { role: "system", content: HERMES_SYSTEM },
      { role: "user", content: `Query: ${query}\n\nRespond with exactly 5 sections labeled:\n##THINK\n##PLAN\n##ACT\n##REFLECT\n##ANSWER\n\nEach section should be detailed and thorough.` },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model: "gpt-5.4", stream: true }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let currentType: Step["type"] = "think";

      setSteps((prev) => prev.map((s) => s.type === "think" ? { ...s, status: "running" } : s));

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content ?? "";
            fullText += delta;

            // Parse sections as they arrive
            const sectionMap: Record<string, Step["type"]> = {
              "##THINK": "think",
              "##PLAN": "plan",
              "##ACT": "act",
              "##REFLECT": "reflect",
              "##ANSWER": "answer",
            };

            for (const [marker, type] of Object.entries(sectionMap)) {
              if (fullText.includes(marker) && currentType !== type) {
                if (STEP_TYPES.indexOf(type) > STEP_TYPES.indexOf(currentType)) {
                  setSteps((prev) => prev.map((s) =>
                    s.type === currentType ? { ...s, status: "done" } :
                    s.type === type ? { ...s, status: "running" } : s
                  ));
                  currentType = type;
                }
              }
            }

            // Extract content for each section
            setSteps((prev) => prev.map((s) => {
              const marker = `##${s.type.toUpperCase()}`;
              const idx = fullText.indexOf(marker);
              if (idx === -1) return s;
              const nextMarkers = STEP_TYPES
                .filter((t) => t !== s.type)
                .map((t) => `##${t.toUpperCase()}`);
              let endIdx = fullText.length;
              for (const nm of nextMarkers) {
                const ni = fullText.indexOf(nm, idx + marker.length);
                if (ni !== -1 && ni < endIdx) endIdx = ni;
              }
              const content = fullText.slice(idx + marker.length, endIdx).trim();
              return { ...s, content };
            }));
          } catch { /* ignore */ }
        }
      }

      setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));

      const finalAnswer = steps.find((s) => s.type === "answer")?.content ?? fullText;
      pipeline.push({ source: "HERMES", sourceColor: "#fbbf24", label: `Hermes: ${query.slice(0, 40)}`, content: finalAnswer || fullText });
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        setSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "done", content: s.content || "[error]" } : s));
      }
    } finally {
      setRunning(false);
    }
  }

  function copyAnswer() {
    const ans = steps.find((s) => s.type === "answer")?.content;
    if (ans) {
      navigator.clipboard.writeText(ans);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(251,191,36,0.25)", boxShadow: "0 0 60px rgba(251,191,36,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.4)" }}>
                  <Zap className="w-4 h-4" style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#fbbf24" }}>HERMES AGENT</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Think → Plan → Act → Reflect → Answer</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={reset} className="p-1.5 rounded-lg text-gray-600 hover:text-amber-400 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {steps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border" style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.15)" }}>
                    <Zap className="w-6 h-6" style={{ color: "#3a2a00" }} />
                  </div>
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>Ask HERMES anything — deep multi-step reasoning</div>
                </div>
              )}
              {steps.map((step) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl p-3.5"
                  style={{
                    background: step.status === "done" ? `${STEP_COLORS[step.type]}08` : step.status === "running" ? `${STEP_COLORS[step.type]}12` : "#0d0d0d",
                    border: `1px solid ${step.status !== "pending" ? `${STEP_COLORS[step.type]}30` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: step.status === "pending" ? "#2a2a2a" : STEP_COLORS[step.type], boxShadow: step.status === "running" ? `0 0 8px ${STEP_COLORS[step.type]}` : "none" }} />
                    <span className="text-[9px] font-bold font-mono" style={{ color: step.status !== "pending" ? STEP_COLORS[step.type] : "#333" }}>
                      {step.label}
                    </span>
                    {step.status === "running" && (
                      <span className="text-[8px] font-mono animate-pulse" style={{ color: "#555" }}>processing…</span>
                    )}
                  </div>
                  {step.content && (
                    <div className="text-[11px] leading-relaxed" style={{ color: step.type === "answer" ? "#ccc" : "#666", whiteSpace: "pre-wrap" }}>
                      {step.content}
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Actions */}
            {steps.length > 0 && !running && (
              <div className="px-4 py-2 flex items-center gap-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={copyAnswer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)", color: "#fbbf24" }}
                >
                  {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy Answer"}
                </button>
                <button
                  onClick={() => pipeline.push({ source: "HERMES", sourceColor: "#fbbf24", label: "Hermes output", content: steps.find((s) => s.type === "answer")?.content ?? "" })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                >
                  <GitMerge className="w-3 h-3" />
                  Pipe Output
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                  placeholder="Ask HERMES anything… (Enter to send)"
                  disabled={running}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[12px] outline-none font-mono"
                  style={{ borderColor: "rgba(251,191,36,0.2)", color: "#ccc" }}
                />
                <button
                  onClick={run}
                  disabled={running || !input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: running ? "rgba(251,191,36,0.1)" : "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)" }}
                >
                  <Send className="w-4 h-4" style={{ color: "#fbbf24" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
