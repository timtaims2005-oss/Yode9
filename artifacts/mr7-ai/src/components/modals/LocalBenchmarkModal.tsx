import { useEffect, useRef, useState, useCallback } from "react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Play, RefreshCw, Trophy, Zap, Wifi, WifiOff, Loader2 } from "lucide-react";

const ENGINES = [
  { id: "ollama",    label: "Ollama",      color: "#00e5ff", icon: "🦙", port: 11434 },
  { id: "lmstudio", label: "LM Studio",   color: "#a78bfa", icon: "🎨", port: 1234  },
  { id: "jan",       label: "Jan",          color: "#34d399", icon: "🤖", port: 1337  },
  { id: "gpt4all",  label: "GPT4All",      color: "#f97316", icon: "🧠", port: 4891  },
  { id: "openwebui", label: "Open WebUI",  color: "#06d6a0", icon: "🌐", port: 3000  },
  { id: "llamafile", label: "Llamafile",   color: "#fbbf24", icon: "📄", port: 8081  },
  { id: "kobold",   label: "KoboldCPP",   color: "#f72585", icon: "⚔️", port: 5001  },
] as const;

interface BenchResult {
  id: string; online: boolean; latencyMs: number | null; modelCount: number;
  grade: "S" | "A" | "B" | "C" | "F" | "-";
}

function grade(lat: number | null, online: boolean): BenchResult["grade"] {
  if (!online || lat === null) return "F";
  if (lat < 30)  return "S";
  if (lat < 80)  return "A";
  if (lat < 200) return "B";
  if (lat < 500) return "C";
  return "F";
}

const GRADE_COLOR: Record<string, string> = {
  S: "#00e5ff", A: "#22c55e", B: "#fbbf24", C: "#f97316", F: "#ef4444", "-": "#ffffff33",
};

// ── 3D Radar Canvas ────────────────────────────────────────────────────────
function RadarChart({ results }: { results: BenchResult[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const fRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = Math.min(cv.offsetWidth, cv.offsetHeight);
    cv.width = cv.height = S * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const W = S, H = S;
    const cx = W / 2, cy = H / 2;
    const maxLat = 600;

    function draw() {
      fRef.current++;
      const f = fRef.current;
      ctx.clearRect(0, 0, W, H);

      // bg
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
      bg.addColorStop(0, "#0a0f1a");
      bg.addColorStop(1, "#04060a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const N = ENGINES.length;
      const R = S * 0.34;

      // Axis rings
      [0.25, 0.5, 0.75, 1].forEach(ratio => {
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const r = R * ratio;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(0,229,255,${0.05 + ratio * 0.03})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Axis lines
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.strokeStyle = "rgba(0,229,255,0.06)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Data polygon
      ctx.beginPath();
      ENGINES.forEach((eng, i) => {
        const a   = (i / N) * Math.PI * 2 - Math.PI / 2;
        const res = results.find(r => r.id === eng.id);
        let norm  = 0;
        if (res?.online && res.latencyMs !== null) norm = Math.max(0, 1 - res.latencyMs / maxLat);
        const r = R * (0.05 + norm * 0.95);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      fill.addColorStop(0, "rgba(0,229,255,0.3)");
      fill.addColorStop(1, "rgba(0,229,255,0.03)");
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#00e5ffaa";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nodes
      ENGINES.forEach((eng, i) => {
        const a   = (i / N) * Math.PI * 2 - Math.PI / 2;
        const res = results.find(r => r.id === eng.id);
        const online = res?.online ?? false;
        const pulse  = (Math.sin(f * 0.06 + i) + 1) / 2;

        const ax = cx + Math.cos(a) * R * 1.1;
        const ay = cy + Math.sin(a) * R * 1.1;

        // Node glow
        if (online) {
          const grd = ctx.createRadialGradient(ax, ay, 0, ax, ay, 10);
          grd.addColorStop(0, eng.color + "88");
          grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(ax, ay, 10 + pulse * 4, 0, Math.PI * 2); ctx.fill();
        }

        ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2);
        ctx.fillStyle = online ? eng.color : "#ffffff15";
        ctx.fill();

        // Label
        const lx = cx + Math.cos(a) * (R * 1.28);
        const ly = cy + Math.sin(a) * (R * 1.28);
        ctx.fillStyle = online ? eng.color : "#ffffff30";
        ctx.font = `bold 9px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(eng.label.slice(0, 5).toUpperCase(), lx, ly);

        if (res?.latencyMs && online) {
          const ll = cy + Math.sin(a) * (R * 1.28) + 10;
          ctx.fillStyle = eng.color + "88";
          ctx.font = "7px monospace";
          ctx.fillText(`${res.latencyMs}ms`, lx, ll);
        }
      });

      // Center label
      ctx.fillStyle = "rgba(0,229,255,0.6)";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RADAR", cx, cy - 6);
      ctx.font = "7px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillText("Latency", cx, cy + 6);

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [results]);

  return (
    <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
  );
}

// ── Live Latency Timeline ──────────────────────────────────────────────────
function LatencyTimeline({ history }: { history: { ts: number; results: BenchResult[] }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width = cv.offsetWidth; const H = cv.height = cv.offsetHeight;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#060810"; ctx.fillRect(0, 0, W, H);

    if (history.length < 2) {
      ctx.fillStyle = "#ffffff15"; ctx.font = "10px monospace";
      ctx.textAlign = "center"; ctx.fillText("Run benchmark to see timeline", W/2, H/2);
      return;
    }

    const maxLat = 600;
    const pad = 20;

    ENGINES.forEach((eng, ei) => {
      const pts = history.map((h, hi) => {
        const r = h.results.find(r => r.id === eng.id);
        const lat = r?.latencyMs ?? null;
        return { x: pad + (hi / (history.length - 1)) * (W - 2 * pad), y: lat !== null ? H - pad - ((lat / maxLat) * (H - 2 * pad)) : H - pad };
      });

      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = eng.color + "99";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const last = pts[pts.length - 1];
      ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = eng.color; ctx.fill();
    });

    // Grid lines
    [100, 200, 400].forEach(lat => {
      const y = H - pad - ((lat / maxLat) * (H - 2 * pad));
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y);
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = "#ffffff22"; ctx.font = "7px monospace";
      ctx.textAlign = "right"; ctx.fillText(`${lat}ms`, pad - 2, y + 3);
    });
  }, [history]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 100, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }} />;
}

// ── Main Modal ─────────────────────────────────────────────────────────────
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function LocalBenchmarkModal({ open, onOpenChange }: Props) {
  const [results,    setResults]    = useState<BenchResult[]>(() =>
    ENGINES.map(e => ({ id: e.id, online: false, latencyMs: null, modelCount: 0, grade: "-" as const }))
  );
  const [running,    setRunning]    = useState(false);
  const [history,    setHistory]    = useState<{ ts: number; results: BenchResult[] }[]>([]);
  const [runCount,   setRunCount]   = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoRun,    setAutoRun]    = useState(false);

  const runBench = useCallback(async () => {
    setRunning(true);
    const current: BenchResult[] = ENGINES.map(e => ({ id: e.id, online: false, latencyMs: null, modelCount: 0, grade: "-" as const }));

    try {
      const resp = await fetch("/api/lb/benchmark", { method: "POST" });
      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let buf      = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim(); if (!line) continue;
          try {
            const d = JSON.parse(line) as { type: string; engine?: string; online?: boolean; latencyMs?: number | null; modelCount?: number };
            if (d.type === "result" && d.engine) {
              const idx = current.findIndex(r => r.id === d.engine);
              if (idx >= 0) {
                current[idx] = {
                  id: d.engine,
                  online: d.online ?? false,
                  latencyMs: d.latencyMs ?? null,
                  modelCount: d.modelCount ?? 0,
                  grade: grade(d.latencyMs ?? null, d.online ?? false),
                };
                setResults([...current]);
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    setRunCount(c => c + 1);
    setHistory(h => [...h.slice(-20), { ts: Date.now(), results: [...current] }]);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (autoRun) {
      runBench();
      autoRef.current = setInterval(runBench, 15000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoRun, runBench]);

  useEffect(() => { if (open) runBench(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onlineResults = results.filter(r => r.online).sort((a, b) => (a.latencyMs ?? 9999) - (b.latencyMs ?? 9999));

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div
        className="w-full mx-auto rounded-[18px] overflow-hidden flex flex-col"
        style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
          border: "1px solid rgba(167,139,250,0.15)",
          boxShadow: "0 0 60px rgba(167,139,250,0.06)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 pt-3 pb-[10px] border-b shrink-0"
          style={{ borderColor: "rgba(167,139,250,0.1)", background: "rgba(0,0,0,0.3)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)" }}>
            📊
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white">Local Engine Benchmark</h2>
            <p className="text-[10px] text-white/35">Real-time latency · grade · model count · timeline</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-green-400">{onlineResults.length}</div>
              <div className="text-[8px] text-white/30 uppercase">Online</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-purple-400">{runCount}</div>
              <div className="text-[8px] text-white/30 uppercase">Runs</div>
            </div>
          </div>
          <button
            onClick={runBench}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? "Testing..." : "Run"}
          </button>
          <button
            onClick={() => setAutoRun(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: autoRun ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.04)",
              color: autoRun ? "#00e5ff" : "#ffffff44",
              border: autoRun ? "1px solid rgba(0,229,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {autoRun ? "⏹ Auto" : "▶ Auto"}
          </button>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/08 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0 space-y-5">

          {/* Top row: Radar + Grades */}
          <div className="flex gap-5">
            {/* Radar */}
            <div className="w-56 h-56 shrink-0 rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(0,229,255,0.08)" }}>
              <RadarChart results={results} />
            </div>

            {/* Grade cards */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              {ENGINES.map(eng => {
                const res = results.find(r => r.id === eng.id)!;
                const gc  = GRADE_COLOR[res.grade] ?? "#ffffff33";
                return (
                  <div
                    key={eng.id}
                    className="rounded-xl p-3 flex items-center gap-2.5"
                    style={{
                      background: res.online ? eng.color + "08" : "#ffffff03",
                      border: `1px solid ${res.online ? eng.color + "33" : "#ffffff08"}`,
                    }}
                  >
                    <span className="text-base">{eng.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold" style={{ color: res.online ? eng.color : "#ffffff44" }}>
                        {eng.label}
                      </div>
                      <div className="text-[9px] text-white/30 font-mono mt-0.5">
                        {res.online ? (
                          <>{res.latencyMs}ms · {res.modelCount}m</>
                        ) : "offline"}
                      </div>
                    </div>
                    {/* Grade badge */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: gc + "22", color: gc, border: `1px solid ${gc}44`, boxShadow: res.online ? `0 0 8px ${gc}33` : "none" }}
                    >
                      {res.grade}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rankings */}
          {onlineResults.length > 0 && (
            <div>
              <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider mb-2">🏆 Speed Rankings</div>
              <div className="space-y-1.5">
                {onlineResults.map((res, i) => {
                  const eng = ENGINES.find(e => e.id === res.id)!;
                  const maxLat = onlineResults[onlineResults.length - 1]?.latencyMs ?? 500;
                  const norm = Math.max(0.05, 1 - (res.latencyMs ?? 0) / (maxLat * 1.1));
                  return (
                    <div key={res.id} className="flex items-center gap-3">
                      <span className="text-sm shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <span className="text-[10px] font-bold w-20 shrink-0" style={{ color: eng.color }}>{eng.label}</span>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#ffffff06" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${eng.color}, ${eng.color}88)`, boxShadow: `0 0 8px ${eng.color}44` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${norm * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] text-white/50 font-mono w-16 text-right shrink-0">
                        {res.latencyMs}ms
                      </span>
                      <span className="text-[9px] font-bold w-6 text-center shrink-0" style={{ color: GRADE_COLOR[res.grade] }}>
                        {res.grade}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <div className="text-[9px] text-white/30 font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity size={10} /> Latency Timeline ({history.length} runs)
            </div>
            <LatencyTimeline history={history} />
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {ENGINES.map(eng => (
                <div key={eng.id} className="flex items-center gap-1">
                  <div className="w-3 h-0.5 rounded" style={{ background: eng.color }} />
                  <span className="text-[8px] text-white/30">{eng.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t shrink-0"
          style={{ borderColor: "rgba(167,139,250,0.08)", background: "rgba(0,0,0,0.2)" }}>
          <div className="flex items-center gap-3">
            {ENGINES.map(eng => {
              const res = results.find(r => r.id === eng.id);
              return (
                <div key={eng.id} className="flex items-center gap-1" title={`${eng.label}: ${res?.online ? res.latencyMs + "ms" : "offline"}`}>
                  {res?.online
                    ? <Wifi size={9} style={{ color: eng.color }} />
                    : <WifiOff size={9} className="text-white/15" />}
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-white/20 font-mono">LOCAL BENCHMARK · MR7-AI</span>
          <span className="text-[9px] text-white/30 font-mono">
            {autoRun ? "⟳ AUTO 15s" : running ? "● TESTING" : "● IDLE"}
          </span>
        </div>
      </div>
    </FullPageOverlay>
  );
}
