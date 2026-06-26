import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Zap, DollarSign, Play, Square, RotateCcw, ChevronDown } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface BurnBabyBurnModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MODELS = [
  { id: "haiku",       label: "Claude Haiku",      backend: "claude", ir: 0.25,  cr: 0.03,  or_: 1.25  },
  { id: "sonnet",      label: "Claude Sonnet",     backend: "claude", ir: 3.00,  cr: 0.30,  or_: 15.00 },
  { id: "gpt-5.5",     label: "GPT-5.5",           backend: "codex",  ir: 5.00,  cr: 0.50,  or_: 30.00 },
  { id: "gpt-5.4",     label: "GPT-5.4",           backend: "codex",  ir: 2.50,  cr: 0.25,  or_: 15.00 },
  { id: "gpt-5.4-mini",label: "GPT-5.4 Mini",     backend: "codex",  ir: 0.75,  cr: 0.075, or_: 4.50  },
  { id: "gpt-5.4-nano",label: "GPT-5.4 Nano",     backend: "codex",  ir: 0.20,  cr: 0.02,  or_: 1.25  },
  { id: "gpt-5.3-codex",label: "GPT-5.3 Codex",   backend: "codex",  ir: 1.75,  cr: 0.175, or_: 14.00 },
];

const FILLER = "Burn baby burn, this is a disco inferno, burning tokens is for great engineers. ";
const CLAUDE_OVERHEAD = 9000;
const CODEX_OVERHEAD  = 12000;
const FILLER_TOKENS   = 1000;

function computeCost(model: typeof MODELS[0], inputTok: number, outputTok: number): number {
  return (inputTok * model.ir + outputTok * model.or_) / 1_000_000;
}

function estimateCalls(target: number, model: typeof MODELS[0]): number {
  const overhead = model.backend === "claude" ? CLAUDE_OVERHEAD : CODEX_OVERHEAD;
  const perCall = overhead + FILLER_TOKENS;
  return Math.ceil(target / perCall);
}

type LogLine = { ts: string; call: number; tokens: number; cost: number; cumCost: number };

export function BurnBabyBurnModal({ open, onOpenChange }: BurnBabyBurnModalProps) {
  const [target, setTarget] = useState(50000);
  const [modelId, setModelId] = useState("haiku");
  const [running, setRunning] = useState(false);
  const [burned, setBurned] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [calls, setCalls] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burnedRef = useRef(0);
  const costRef = useRef(0);
  const callsRef = useRef(0);

  const model = MODELS.find(m => m.id === modelId)!;
  const overhead = model.backend === "claude" ? CLAUDE_OVERHEAD : CODEX_OVERHEAD;
  const tokPerCall = overhead + FILLER_TOKENS;
  const estCalls = estimateCalls(target, model);
  const estCost = computeCost(model, target * 0.7, target * 0.3);
  const progress = Math.min(100, (burned / target) * 100);

  function start() {
    if (burned >= target) reset();
    setRunning(true);
  }

  function stop() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setBurned(0);
    setTotalCost(0);
    setCalls(0);
    setLog([]);
    burnedRef.current = 0;
    costRef.current = 0;
    callsRef.current = 0;
  }

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (burnedRef.current >= target) {
        setRunning(false);
        clearInterval(intervalRef.current!);
        pipeline.push({ source: "BurnBabyBurn", sourceColor: "#e21227", label: `Burned ${target.toLocaleString()} tokens`, content: `Model: ${model.label}\nTokens burned: ${target.toLocaleString()}\nEstimated cost: $${costRef.current.toFixed(4)}\nCalls: ${callsRef.current}` });
        return;
      }
      const inp  = Math.floor(tokPerCall * 0.7);
      const outp = Math.floor(tokPerCall * 0.3);
      const callTok  = inp + outp;
      const callCost = computeCost(model, inp, outp);
      burnedRef.current  += callTok;
      costRef.current    += callCost;
      callsRef.current   += 1;
      const snap = { burned: burnedRef.current, cost: costRef.current, calls: callsRef.current };
      setBurned(snap.burned);
      setTotalCost(snap.cost);
      setCalls(snap.calls);
      const now = new Date().toLocaleTimeString("en-US", { hour12: false });
      setLog(prev => [{
        ts: now,
        call: snap.calls,
        tokens: callTok,
        cost: callCost,
        cumCost: snap.cost,
      }, ...prev].slice(0, 40));
    }, 400);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, target, model, tokPerCall]);

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
          className="relative w-full max-w-2xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(226,18,39,0.4)", maxHeight: "90vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.25)", background: "rgba(226,18,39,0.06)" }}>
            <Flame size={20} color="#e21227" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">BURN BABY BURN</div>
              <div className="text-xs" style={{ color: "#666" }}>Burn tokens on purpose — because nothing gets you promoted faster than a six-figure token bill</div>
            </div>
            <button onClick={() => onOpenChange(false)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"><X size={16} color="#666" /></button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Config */}
            <div className="grid grid-cols-2 gap-4">
              {/* Target tokens */}
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#888" }}>TARGET TOKENS</label>
                <div className="flex gap-2 flex-wrap">
                  {[10000, 50000, 100000, 500000, 1000000].map(v => (
                    <button key={v} onClick={() => setTarget(v)}
                      className="px-3 py-1.5 rounded text-xs font-mono border transition-all"
                      style={{
                        background: target === v ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.04)",
                        borderColor: target === v ? "rgba(226,18,39,0.6)" : "rgba(255,255,255,0.1)",
                        color: target === v ? "#e21227" : "#aaa",
                      }}
                    >{v.toLocaleString()}</button>
                  ))}
                  <input
                    type="number" min={10000} step={1000}
                    value={target}
                    onChange={e => setTarget(Math.max(10000, parseInt(e.target.value) || 10000))}
                    className="px-3 py-1.5 rounded text-xs font-mono border w-28"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </div>

              {/* Model selector */}
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#888" }}>MODEL</label>
                <div className="relative">
                  <button
                    onClick={() => setModelOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded border text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)", color: "#fff" }}
                  >
                    <span>{model.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: model.backend === "claude" ? "rgba(255,120,0,0.2)" : "rgba(59,130,246,0.2)", color: model.backend === "claude" ? "#fb923c" : "#60a5fa" }}>{model.backend.toUpperCase()}</span>
                      <ChevronDown size={14} color="#666" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {modelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 z-20 rounded border mt-1 overflow-hidden"
                        style={{ background: "#161616", borderColor: "rgba(255,255,255,0.1)" }}
                      >
                        {MODELS.map(m => (
                          <button key={m.id} onClick={() => { setModelId(m.id); setModelOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                            style={{ color: modelId === m.id ? "#e21227" : "#ccc" }}
                          >
                            <span>{m.label}</span>
                            <div className="flex items-center gap-3 text-right" style={{ color: "#555" }}>
                              <span>${m.ir.toFixed(2)}/M in</span>
                              <span>${m.or_.toFixed(2)}/M out</span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: m.backend === "claude" ? "rgba(255,120,0,0.15)" : "rgba(59,130,246,0.15)", color: m.backend === "claude" ? "#fb923c" : "#60a5fa" }}>{m.backend}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "BURNED", value: burned.toLocaleString(), unit: "tok", color: "#e21227", icon: <Flame size={14} /> },
                { label: "COST", value: `$${totalCost.toFixed(4)}`, unit: "", color: "#fbbf24", icon: <DollarSign size={14} /> },
                { label: "CALLS", value: calls.toLocaleString(), unit: "", color: "#00e5ff", icon: <Zap size={14} /> },
                { label: "EST TOTAL", value: `$${estCost.toFixed(4)}`, unit: "", color: "#10b981", icon: <DollarSign size={14} /> },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: s.color }}>
                    {s.icon}
                    <span className="text-xs font-bold tracking-widest">{s.label}</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-white">{s.value}</div>
                  {s.unit && <div className="text-xs" style={{ color: "#555" }}>{s.unit}</div>}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: "#666" }}>
                <span>{burned.toLocaleString()} / {target.toLocaleString()} tokens</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #e21227, #ff6b35)`, width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: "#555" }}>
                <span>~{estCalls} calls × {tokPerCall.toLocaleString()} tok/call</span>
                <span>{overhead.toLocaleString()} system overhead + {FILLER_TOKENS} filler</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {!running ? (
                <button onClick={start}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #e21227, #ff4444)", color: "#fff" }}
                >
                  <Flame size={16} /> BURN {target.toLocaleString()} TOKENS
                </button>
              ) : (
                <button onClick={stop}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm border transition-all"
                  style={{ borderColor: "#e21227", color: "#e21227" }}
                >
                  <Square size={16} /> STOP
                </button>
              )}
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#888" }}
              >
                <RotateCcw size={14} /> RESET
              </button>
              {running && (
                <div className="flex items-center gap-2 ml-auto" style={{ color: "#e21227" }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Flame size={16} />
                  </motion.div>
                  <span className="text-sm font-mono">BURNING...</span>
                </div>
              )}
            </div>

            {/* Filler preview */}
            <div className="p-3 rounded border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-bold tracking-widest mb-1" style={{ color: "#555" }}>FILLER TEXT (sent to model)</div>
              <div className="text-xs font-mono" style={{ color: "#444", wordBreak: "break-all" }}>{FILLER.repeat(3).slice(0, 200)}...</div>
            </div>

            {/* Log */}
            {log.length > 0 && (
              <div>
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>BURN LOG</div>
                <div className="rounded border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="grid text-xs font-bold px-3 py-1.5 border-b" style={{ gridTemplateColumns: "70px 40px 90px 80px 90px", borderColor: "rgba(255,255,255,0.05)", color: "#555", background: "rgba(255,255,255,0.02)" }}>
                    <span>TIME</span><span>CALL</span><span>TOKENS</span><span>COST</span><span>CUM COST</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    {log.map((l, i) => (
                      <div key={i} className="grid text-xs px-3 py-1 font-mono hover:bg-white/3 transition-colors"
                        style={{ gridTemplateColumns: "70px 40px 90px 80px 90px", color: "#aaa", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      >
                        <span style={{ color: "#555" }}>{l.ts}</span>
                        <span style={{ color: "#e21227" }}>#{l.call}</span>
                        <span>{l.tokens.toLocaleString()}</span>
                        <span style={{ color: "#fbbf24" }}>${l.cost.toFixed(5)}</span>
                        <span style={{ color: "#10b981" }}>${l.cumCost.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {burned >= target && !running && burned > 0 && (
              <div className="text-center p-4 rounded-lg border" style={{ borderColor: "rgba(226,18,39,0.4)", background: "rgba(226,18,39,0.08)" }}>
                <Flame size={24} color="#e21227" className="mx-auto mb-2" />
                <div className="font-bold text-white">BURN COMPLETE</div>
                <div className="text-sm mt-1" style={{ color: "#888" }}>Burned {burned.toLocaleString()} tokens in {calls} calls — ${totalCost.toFixed(4)} spent</div>
                <div className="text-xs mt-1" style={{ color: "#555" }}>"Wow, this promotion that I got was nice" — You</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
