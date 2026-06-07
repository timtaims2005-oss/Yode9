import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, TrendingDown, Terminal, BarChart2, Play, Square, RotateCcw, Shield } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface RTKModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SAVINGS_TABLE = [
  { op: "ls / tree",       freq: 10, standard: 2000,  rtk: 400,  savings: 80 },
  { op: "cat / read",      freq: 20, standard: 40000, rtk: 12000, savings: 70 },
  { op: "grep / rg",       freq: 8,  standard: 16000, rtk: 3200,  savings: 80 },
  { op: "git status",      freq: 10, standard: 3000,  rtk: 600,   savings: 80 },
  { op: "git diff",        freq: 5,  standard: 10000, rtk: 2500,  savings: 75 },
  { op: "git log",         freq: 5,  standard: 2500,  rtk: 500,   savings: 80 },
  { op: "git add/commit",  freq: 8,  standard: 1600,  rtk: 120,   savings: 92 },
  { op: "cargo/npm test",  freq: 5,  standard: 25000, rtk: 2500,  savings: 90 },
  { op: "pytest",          freq: 4,  standard: 8000,  rtk: 800,   savings: 90 },
  { op: "go test",         freq: 3,  standard: 6000,  rtk: 600,   savings: 90 },
  { op: "docker ps",       freq: 3,  standard: 900,   rtk: 180,   savings: 80 },
];

const SUPPORTED_CMDS = [
  "ls","tree","find","cat","head","tail","grep","rg","awk","sed",
  "git status","git diff","git log","git show","git blame",
  "npm test","yarn test","pnpm test","cargo test","pytest","go test",
  "docker ps","docker logs","kubectl get","ps aux","netstat",
  "curl","wget","jq","yq","cut","sort","uniq","wc","xargs",
];

type LogLine = { ts: string; cmd: string; stdIn: number; rtkOut: number; savings: number };

function fakeCompress(cmd: string): { stdIn: number; rtkOut: number } {
  const base = SAVINGS_TABLE.find(r => cmd.includes(r.op.split(" ")[0]));
  const stdIn = base ? base.standard / base.freq : Math.floor(Math.random() * 3000) + 500;
  const pct = base ? (100 - base.savings) / 100 : 0.25;
  return { stdIn, rtkOut: Math.floor(stdIn * pct) };
}

const TAB_OPTIONS = ["OVERVIEW", "COMPRESS", "SAVINGS", "CONFIG"];

export function RTKModal({ open, onOpenChange }: RTKModalProps) {
  const [tab, setTab] = useState("OVERVIEW");
  const [cmd, setCmd] = useState("");
  const [running, setRunning] = useState(false);
  const [sessionLog, setSessionLog] = useState<LogLine[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [totalStd, setTotalStd] = useState(0);
  const [autoDemo, setAutoDemo] = useState(false);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedRef = useRef(0);
  const stdRef = useRef(0);

  useEffect(() => {
    if (!autoDemo) {
      if (demoRef.current) clearInterval(demoRef.current);
      return;
    }
    demoRef.current = setInterval(() => {
      const cmds = ["git status", "npm test", "ls -la", "grep -r pattern .", "cargo test", "docker ps", "git diff HEAD"];
      const randomCmd = cmds[Math.floor(Math.random() * cmds.length)];
      const { stdIn, rtkOut } = fakeCompress(randomCmd);
      const s = stdIn - rtkOut;
      savedRef.current += s;
      stdRef.current += stdIn;
      setTotalSaved(savedRef.current);
      setTotalStd(stdRef.current);
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      setSessionLog(prev => [{
        ts, cmd: randomCmd, stdIn, rtkOut, savings: Math.round((s / stdIn) * 100),
      }, ...prev].slice(0, 30));
    }, 900);
    return () => { if (demoRef.current) clearInterval(demoRef.current); };
  }, [autoDemo]);

  function compress() {
    if (!cmd.trim()) return;
    const { stdIn, rtkOut } = fakeCompress(cmd.trim());
    const s = stdIn - rtkOut;
    savedRef.current += s;
    stdRef.current += stdIn;
    setTotalSaved(savedRef.current);
    setTotalStd(stdRef.current);
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setSessionLog(prev => [{ ts, cmd: cmd.trim(), stdIn, rtkOut, savings: Math.round((s / stdIn) * 100) }, ...prev].slice(0, 30));
    pipeline.push({ source: "RTK", sourceColor: "#e21227", label: cmd.trim(), content: `Command: ${cmd}\nStandard output: ${stdIn} tokens\nRTK compressed: ${rtkOut} tokens\nSaved: ${s} tokens (${Math.round((s/stdIn)*100)}%)` });
    setCmd("");
  }

  const totalSavingsPct = totalStd > 0 ? Math.round((totalSaved / totalStd) * 100) : 0;

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
          style={{ background: "#0d0d0d", borderColor: "rgba(226,18,39,0.35)", maxHeight: "90vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.05)" }}>
            <TrendingDown size={20} color="#e21227" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">RTK — RUST TOKEN KILLER</div>
              <div className="text-xs" style={{ color: "#666" }}>High-performance CLI proxy · 60-90% token reduction · 100+ commands · &lt;10ms overhead</div>
            </div>
            <button onClick={() => onOpenChange(false)} className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"><X size={16} color="#666" /></button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-2">
              <TrendingDown size={14} color="#e21227" />
              <span className="text-xs font-mono font-bold" style={{ color: "#e21227" }}>{totalSaved.toLocaleString()} tok saved</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} color="#fbbf24" />
              <span className="text-xs font-mono" style={{ color: "#fbbf24" }}>{totalSavingsPct}% reduction</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart2 size={14} color="#10b981" />
              <span className="text-xs font-mono" style={{ color: "#10b981" }}>{sessionLog.length} commands</span>
            </div>
            <button
              onClick={() => setAutoDemo(v => !v)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-xs border transition-all"
              style={{ borderColor: autoDemo ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.1)", color: autoDemo ? "#e21227" : "#555" }}
            >
              {autoDemo ? <><Square size={10} /> STOP DEMO</> : <><Play size={10} /> LIVE DEMO</>}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {TAB_OPTIONS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2.5 text-xs font-bold tracking-widest transition-colors"
                style={{ color: tab === t ? "#e21227" : "#555", borderBottom: tab === t ? "2px solid #e21227" : "2px solid transparent" }}
              >{t}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* OVERVIEW tab */}
            {tab === "OVERVIEW" && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "TOKEN SAVINGS", value: "60-90%", sub: "per command", color: "#e21227" },
                    { label: "SUPPORTED CMDS", value: "100+",   sub: "Git, npm, cargo, docker…", color: "#fbbf24" },
                    { label: "OVERHEAD",       value: "<10ms",  sub: "single Rust binary", color: "#10b981" },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-lg border text-center" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs font-bold tracking-widest mt-1" style={{ color: "#555" }}>{s.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#444" }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "#555" }}>HOW RTK WORKS</div>
                  <div className="text-xs space-y-2" style={{ color: "#888" }}>
                    <div>RTK wraps CLI commands and filters/compresses their output before it reaches your LLM context window. It acts as a transparent proxy — <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#ccc" }}>rtk ls</code> instead of <code className="px-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#ccc" }}>ls</code>.</div>
                    <div>The single Rust binary applies command-specific filters: truncating verbose output, removing ANSI escape codes, collapsing repeated lines, and extracting only the signal from noisy test runners.</div>
                    <div>In a 30-minute Claude Code session, RTK typically reduces total token consumption from ~118,000 to ~23,900 tokens — an <span style={{ color: "#e21227", fontWeight: "bold" }}>80% reduction</span>.</div>
                  </div>
                </div>
                <div className="p-3 rounded border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>INSTALL</div>
                  <div className="space-y-1">
                    {[
                      { os: "Homebrew",       cmd: "brew install rtk" },
                      { os: "Quick Install",  cmd: "curl -fsSL https://rtk-ai.app/install.sh | sh" },
                      { os: "Cargo",          cmd: "cargo install --git https://github.com/rtk-ai/rtk" },
                    ].map(i => (
                      <div key={i.os} className="flex items-center gap-3">
                        <span className="text-xs w-24 flex-shrink-0" style={{ color: "#555" }}>{i.os}</span>
                        <code className="text-xs font-mono px-2 py-1 rounded flex-1" style={{ background: "rgba(255,255,255,0.04)", color: "#ccc" }}>{i.cmd}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* COMPRESS tab */}
            {tab === "COMPRESS" && (
              <div className="p-5 space-y-4">
                <div className="text-xs" style={{ color: "#666" }}>Enter a command to see how RTK would compress its output and save tokens.</div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-l-lg border-y border-l text-sm" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e21227" }}>
                    <Terminal size={14} />
                    <span className="font-mono">rtk</span>
                  </div>
                  <input value={cmd} onChange={e => setCmd(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") compress(); }}
                    placeholder="git diff HEAD~1, npm test, ls -la, grep -r …"
                    className="flex-1 px-3 py-2 border-y text-sm font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                  <button onClick={compress}
                    className="px-4 py-2 rounded-r-lg border text-sm font-bold transition-all"
                    style={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.4)", color: "#e21227" }}
                  ><Zap size={14} /></button>
                </div>

                {sessionLog.length > 0 && (
                  <div className="rounded border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="grid text-xs font-bold px-3 py-1.5 border-b" style={{ gridTemplateColumns: "70px 1fr 80px 80px 60px", borderColor: "rgba(255,255,255,0.05)", color: "#555", background: "rgba(255,255,255,0.02)" }}>
                      <span>TIME</span><span>COMMAND</span><span>STANDARD</span><span>RTK</span><span>SAVED</span>
                    </div>
                    {sessionLog.map((l, i) => (
                      <div key={i} className="grid text-xs px-3 py-1.5 font-mono hover:bg-white/2 transition-colors"
                        style={{ gridTemplateColumns: "70px 1fr 80px 80px 60px", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#aaa" }}
                      >
                        <span style={{ color: "#555" }}>{l.ts}</span>
                        <span className="truncate" style={{ color: "#ccc" }}>{l.cmd}</span>
                        <span style={{ color: "#888" }}>{l.stdIn.toLocaleString()}</span>
                        <span style={{ color: "#10b981" }}>{l.rtkOut.toLocaleString()}</span>
                        <span style={{ color: "#e21227" }}>-{l.savings}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="text-xs font-bold tracking-widest mb-1" style={{ color: "#555" }}>SESSION TOTAL STANDARD</div>
                    <div className="text-xl font-mono font-bold text-white">{totalStd.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: "#555" }}>tokens</div>
                  </div>
                  <div className="flex-1 p-3 rounded border" style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.05)" }}>
                    <div className="text-xs font-bold tracking-widest mb-1" style={{ color: "#e21227" }}>SESSION SAVED</div>
                    <div className="text-xl font-mono font-bold" style={{ color: "#e21227" }}>{totalSaved.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: "#555" }}>tokens ({totalSavingsPct}% reduction)</div>
                  </div>
                </div>
              </div>
            )}

            {/* SAVINGS tab */}
            {tab === "SAVINGS" && (
              <div className="p-5">
                <div className="text-xs mb-4" style={{ color: "#666" }}>Token savings for a 30-minute Claude Code session (medium TypeScript/Rust project).</div>
                <div className="rounded border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <div className="grid text-xs font-bold px-3 py-2 border-b" style={{ gridTemplateColumns: "1fr 60px 80px 80px 70px", borderColor: "rgba(255,255,255,0.06)", color: "#555", background: "rgba(255,255,255,0.03)" }}>
                    <span>OPERATION</span><span>FREQ</span><span>STANDARD</span><span>RTK</span><span>SAVINGS</span>
                  </div>
                  {SAVINGS_TABLE.map(r => (
                    <div key={r.op} className="grid text-xs px-3 py-2 hover:bg-white/2 transition-colors"
                      style={{ gridTemplateColumns: "1fr 60px 80px 80px 70px", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#aaa" }}
                    >
                      <span className="font-mono" style={{ color: "#ccc" }}>{r.op}</span>
                      <span style={{ color: "#555" }}>{r.freq}x</span>
                      <span style={{ color: "#888" }}>{r.standard.toLocaleString()}</span>
                      <span style={{ color: "#10b981" }}>{r.rtk.toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ background: "#e21227", width: `${r.savings}%` }} />
                        </div>
                        <span style={{ color: "#e21227" }}>-{r.savings}%</span>
                      </div>
                    </div>
                  ))}
                  <div className="grid text-xs px-3 py-2 font-bold" style={{ gridTemplateColumns: "1fr 60px 80px 80px 70px", background: "rgba(255,255,255,0.03)", color: "#fff" }}>
                    <span>TOTAL</span><span></span>
                    <span style={{ color: "#888" }}>~118,000</span>
                    <span style={{ color: "#10b981" }}>~23,900</span>
                    <span style={{ color: "#e21227" }}>-80%</span>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIG tab */}
            {tab === "CONFIG" && (
              <div className="p-5 space-y-4">
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>SUPPORTED COMMANDS ({SUPPORTED_CMDS.length}+)</div>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_CMDS.map(c => (
                    <span key={c} className="text-xs px-2 py-1 rounded font-mono border"
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#888" }}>{c}</span>
                  ))}
                  <span className="text-xs px-2 py-1 rounded font-mono border" style={{ borderColor: "rgba(255,255,255,0.07)", color: "#555" }}>…and 70+ more</span>
                </div>
                <div className="p-4 rounded border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#555" }}>PLATFORMS</div>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "#888" }}>
                    {["macOS (arm64 / x86_64)", "Linux (musl / gnu)", "Windows (PowerShell / CMD)", "WSL2", "Docker / Podman", "CI/CD (GitHub Actions, etc.)"].map(p => (
                      <div key={p} className="flex items-center gap-1.5"><Shield size={10} color="#10b981" />{p}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
