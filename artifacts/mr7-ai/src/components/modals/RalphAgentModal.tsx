import { useState, useRef, useEffect } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Play, Square, RotateCcw, Mic, ChevronRight, Loader2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface RalphAgentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Phase = "idle" | "brainstorm" | "looping" | "done" | "failed";
type LoopIter = { n: number; status: "running" | "done" | "failed"; output: string; ts: string };
type BrainstormQ = { q: string; a: string };

const BRAINSTORM_QS = [
  "What is the main goal of this task?",
  "What does success look like? How will you know when it's done?",
  "Are there any constraints or requirements I should know about?",
  "What technology stack or approach do you prefer?",
];

export function RalphAgentModal({ open, onOpenChange }: RalphAgentModalProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [vagueProblem, setVagueProblem] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [maxIterations, setMaxIterations] = useState(5);
  const [iterations, setIterations] = useState<LoopIter[]>([]);
  const [bsStep, setBsStep] = useState(0);
  const [bsAnswers, setBsAnswers] = useState<BrainstormQ[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loopRef = useRef(false);

  async function startBrainstorm() {
    if (!vagueProblem.trim()) return;
    setPhase("brainstorm");
    setBsStep(0);
    setBsAnswers([]);
    setCurrentAnswer("");
    setIterations([]);
    setRefinedPrompt("");
  }

  async function answerQuestion() {
    if (!currentAnswer.trim()) return;
    const updated = [...bsAnswers, { q: BRAINSTORM_QS[bsStep], a: currentAnswer }];
    setBsAnswers(updated);
    setCurrentAnswer("");
    if (bsStep + 1 < BRAINSTORM_QS.length) {
      setBsStep(s => s + 1);
    } else {
      // Generate refined prompt from brainstorm
      const ctx = updated.map(x => `Q: ${x.q}\nA: ${x.a}`).join("\n\n");
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Original vague idea: "${vagueProblem}"\n\nBrainstorm answers:\n${ctx}\n\nGenerate a clear, specific, high-quality prompt that captures exactly what needs to be built. Be precise, include success criteria, and make it actionable for an AI coding agent.` }],
            model: "gpt-5.4"
          }),
        });
        const refined = await readChatText(r);
        setRefinedPrompt(refined);
        setPhase("idle");
        toast({ description: "Prompt refined — ready to start Ralph Loop" });
      } catch {
        setRefinedPrompt(vagueProblem);
        setPhase("idle");
      }
    }
  }

  async function startLoop() {
    const prompt = refinedPrompt || vagueProblem;
    if (!prompt.trim()) return;
    setPhase("looping");
    setIterations([]);
    loopRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    for (let i = 1; i <= maxIterations; i++) {
      if (!loopRef.current || ctrl.signal.aborted) break;
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      setIterations(prev => [...prev, { n: i, status: "running", output: "", ts }]);

      try {
        const prevResults = iterations.slice(0, i-1).map((it, idx) => `Iteration ${idx+1} result:\n${it.output.slice(0, 300)}`).join("\n\n");
        const iterPrompt = i === 1 ? prompt : `${prompt}\n\nPrevious iterations:\n${prevResults}\n\nContinue improving. Focus on what was missing or could be better in previous attempts.`;

        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: iterPrompt }],
            model: "gpt-5.4",
            systemPrompt: `You are an AI coding agent running iteration ${i} of ${maxIterations} in a Ralph Loop (inspired by Ralph Wiggum's persistent approach). Each iteration should produce better results than the last. Be thorough, specific, and improve on previous attempts. If this is iteration 1, do your best work. If later, explicitly address gaps from previous iterations.`
          }),
          signal: ctrl.signal,
        });
        const output = await readChatText(r);
        setIterations(prev => prev.map(it => it.n === i ? { ...it, status: "done", output } : it));

        // Check if task is complete (heuristic: output contains "complete" or "done" signals)
        const isDone = output.toLowerCase().includes("task complete") || output.toLowerCase().includes("all requirements met") || output.toLowerCase().includes("implementation is complete");
        if (isDone && i >= 2) {
          setPhase("done");
          loopRef.current = false;
          pipeline.push({ source: "RalphLoop", sourceColor: "#fb923c", label: prompt.slice(0, 50), content: output });
          toast({ description: `Ralph Loop complete in ${i} iterations` });
          return;
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          setIterations(prev => prev.map(it => it.status === "running" ? { ...it, status: "failed" } : it));
          break;
        }
        setIterations(prev => prev.map(it => it.n === i ? { ...it, status: "failed", output: "API error" } : it));
      }
    }

    setPhase(loopRef.current ? "done" : "idle");
    loopRef.current = false;
    if (iterations.length > 0) {
      const lastGood = [...iterations].reverse().find(it => it.status === "done");
      if (lastGood) pipeline.push({ source: "RalphLoop", sourceColor: "#fb923c", label: prompt.slice(0, 50), content: lastGood.output });
    }
  }

  function stop() {
    loopRef.current = false;
    abortRef.current?.abort();
    setPhase("idle");
  }

  function reset() {
    loopRef.current = false;
    abortRef.current?.abort();
    setPhase("idle");
    setIterations([]);
    setBsAnswers([]);
    setBsStep(0);
    setCurrentAnswer("");
    setRefinedPrompt("");
    setVagueProblem("");
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative w-full max-w-2xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(251,191,36,0.35)", maxHeight: "92vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}>

          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}>
            <Bot size={20} color="#fbbf24" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">RALPH LOOP</div>
              <div className="text-xs" style={{ color: "#666" }}>Start vague · AI brainstorms requirements · autonomous iteration until perfect (Ralph Desktop methodology)</div>
            </div>
            <button onClick={() => onOpenChange(false)} className="ml-auto p-1 rounded hover:bg-white/10"><X size={16} color="#666" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* STEP 1: Input */}
            <div className={`rounded-lg border p-4 transition-all ${phase === "idle" || phase === "brainstorm" ? "border-yellow-500/20" : "border-white/5 opacity-60"}`}
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>1</div>
                <span className="text-xs font-bold tracking-widest" style={{ color: "#fbbf24" }}>AI BRAINSTORM</span>
                <span className="text-xs ml-auto" style={{ color: "#555" }}>Don't write prompts. Just describe your vague idea.</span>
              </div>
              <textarea value={vagueProblem} onChange={e => setVagueProblem(e.target.value)} disabled={phase !== "idle"}
                placeholder="I want to build… (can be vague — AI will interview you to clarify)"
                rows={2} className="w-full px-3 py-2 rounded border text-sm resize-none"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
              {phase === "idle" && (
                <button onClick={startBrainstorm} disabled={!vagueProblem.trim()}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all disabled:opacity-40"
                  style={{ borderColor: "rgba(251,191,36,0.5)", color: "#fbbf24", background: "rgba(251,191,36,0.08)" }}>
                  <MessageSquare size={13} /> START BRAINSTORM
                </button>
              )}
            </div>

            {/* Brainstorm Q&A */}
            {(phase === "brainstorm" || bsAnswers.length > 0) && (
              <div className="rounded-lg border p-4" style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Mic size={14} color="#fbbf24" />
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#fbbf24" }}>INTERVIEW</span>
                  {phase === "brainstorm" && <span className="text-xs ml-auto" style={{ color: "#555" }}>{bsStep+1} / {BRAINSTORM_QS.length}</span>}
                </div>
                {bsAnswers.map((ba, i) => (
                  <div key={i} className="mb-3">
                    <div className="text-xs mb-1" style={{ color: "#888" }}>Q: {ba.q}</div>
                    <div className="text-xs px-3 py-2 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#ccc" }}>{ba.a}</div>
                  </div>
                ))}
                {phase === "brainstorm" && (
                  <div>
                    <div className="text-sm mb-2 font-medium text-white">{BRAINSTORM_QS[bsStep]}</div>
                    <div className="flex gap-2">
                      <input value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") answerQuestion(); }}
                        placeholder="Your answer…"
                        className="flex-1 px-3 py-2 rounded border text-sm"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} autoFocus />
                      <button onClick={answerQuestion}
                        className="px-4 py-2 rounded text-sm font-bold border transition-all"
                        style={{ borderColor: "rgba(251,191,36,0.5)", color: "#fbbf24" }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {refinedPrompt && (
                  <div className="mt-3 p-3 rounded border" style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
                    <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#10b981" }}>REFINED PROMPT</div>
                    <div className="text-xs" style={{ color: "#aaa" }}>{refinedPrompt}</div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Ralph Loop */}
            <div className={`rounded-lg border p-4 transition-all`} style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>2</div>
                <span className="text-xs font-bold tracking-widest" style={{ color: "#fbbf24" }}>RALPH LOOP — AUTONOMOUS ITERATION</span>
              </div>
              <div className="text-xs mb-3" style={{ color: "#555" }}>
                Agent runs autonomously up to {maxIterations} iterations, improving each time. Stops when task is complete or limit reached.
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs" style={{ color: "#888" }}>Max iterations:</span>
                {[3, 5, 8, 10].map(n => (
                  <button key={n} onClick={() => setMaxIterations(n)} disabled={phase === "looping"}
                    className="px-3 py-1 rounded border text-xs transition-all"
                    style={{ borderColor: maxIterations === n ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.08)", color: maxIterations === n ? "#fbbf24" : "#555", background: maxIterations === n ? "rgba(251,191,36,0.08)" : "transparent" }}>
                    {n}
                  </button>
                ))}
              </div>
              {phase !== "looping" ? (
                <button onClick={startLoop} disabled={!vagueProblem.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)", color: "#000" }}>
                  <Play size={14} /> START RALPH LOOP
                </button>
              ) : (
                <button onClick={stop}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm border transition-all"
                  style={{ borderColor: "#e21227", color: "#e21227" }}>
                  <Square size={14} /> STOP
                </button>
              )}
            </div>

            {/* Loop iterations */}
            {iterations.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold tracking-widest" style={{ color: "#555" }}>ITERATIONS</div>
                {iterations.map(iter => (
                  <div key={iter.n} className="rounded-lg border overflow-hidden" style={{ borderColor: iter.status === "done" ? "rgba(16,185,129,0.2)" : iter.status === "failed" ? "rgba(226,18,39,0.2)" : "rgba(251,191,36,0.2)" }}>
                    <button onClick={() => setExpanded(expanded === iter.n ? null : iter.n)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                      style={{ background: iter.status === "done" ? "rgba(16,185,129,0.06)" : iter.status === "failed" ? "rgba(226,18,39,0.06)" : "rgba(251,191,36,0.06)" }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: iter.status === "done" ? "rgba(16,185,129,0.2)" : iter.status === "failed" ? "rgba(226,18,39,0.2)" : "rgba(251,191,36,0.2)", color: iter.status === "done" ? "#10b981" : iter.status === "failed" ? "#e21227" : "#fbbf24" }}>
                        {iter.n}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">Iteration {iter.n}</span>
                          {iter.status === "running" && <Loader2 size={12} color="#fbbf24" className="animate-spin" />}
                          {iter.status === "done" && <CheckCircle2 size={12} color="#10b981" />}
                          {iter.status === "failed" && <AlertCircle size={12} color="#e21227" />}
                        </div>
                        <div className="text-xs" style={{ color: "#555" }}>{iter.ts} · {iter.output ? iter.output.length + " chars" : "in progress…"}</div>
                      </div>
                    </button>
                    {expanded === iter.n && iter.output && (
                      <div className="px-4 pb-3">
                        <div className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto p-3 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "#aaa" }}>
                          {iter.output}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {phase === "done" && iterations.length > 0 && (
              <div className="flex gap-3">
                <button onClick={() => { const last = [...iterations].reverse().find(it=>it.status==="done"); if(last) { pipeline.push({ source: "RalphLoop", sourceColor: "#fb923c", label: vagueProblem.slice(0,50), content: last.output }); toast({ description: "Sent to pipeline" }); } }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all hover:bg-white/5"
                  style={{ borderColor: "rgba(251,191,36,0.4)", color: "#fbbf24" }}>PIPE TO NEXT MODULE</button>
                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#888" }}><RotateCcw size={13} /> RESET</button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
