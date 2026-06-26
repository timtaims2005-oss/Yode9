import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Cpu, Zap, AlertTriangle, Terminal, RefreshCw, Monitor } from "lucide-react";

interface ABTopModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Backend = "claude" | "codex" | "opencode";
type Session = {
  id: string;
  name: string;
  backend: Backend;
  model: string;
  pid: number;
  tokUsed: number;
  tokLimit: number;
  ctxPct: number;
  rateUsed: number;
  rateLimit: number;
  ports: number[];
  status: "active" | "idle" | "rate-limited";
  uptime: string;
};

const BACKEND_COLORS: Record<Backend, string> = {
  claude:   "#fb923c",
  codex:    "#3b82f6",
  opencode: "#10b981",
};

function fakeSession(id: number, backend: Backend): Session {
  const models: Record<Backend, string[]> = {
    claude:   ["claude-opus-4", "claude-sonnet-4", "claude-haiku-3.5"],
    codex:    ["gpt-5.4", "gpt-5.4-mini", "gpt-5.5"],
    opencode: ["opencode-v2", "opencode-v2-mini"],
  };
  const tok = Math.floor(Math.random() * 180000) + 5000;
  const limit = 200000;
  const names = ["Fix auth bug", "Refactor DB", "Add tests", "Deploy pipeline", "Code review"];
  return {
    id: `session-${id}`,
    name: names[id % names.length],
    backend,
    model: models[backend][Math.floor(Math.random() * models[backend].length)],
    pid: 10000 + id * 1337 + Math.floor(Math.random() * 1000),
    tokUsed: tok,
    tokLimit: limit,
    ctxPct: Math.floor((tok / limit) * 100),
    rateUsed: Math.floor(Math.random() * 58),
    rateLimit: 60,
    ports: Math.random() > 0.6 ? [3000 + id * 10, 8080 + id] : [],
    status: Math.random() > 0.8 ? "rate-limited" : Math.random() > 0.5 ? "active" : "idle",
    uptime: `${Math.floor(Math.random() * 120)}m${Math.floor(Math.random() * 60)}s`,
  };
}

const STATUS_COLORS = { active: "#10b981", idle: "#555", "rate-limited": "#e21227" };
const STATUS_LABELS = { active: "ACTIVE", idle: "IDLE", "rate-limited": "RATE-LIMITED" };

export function ABTopModal({ open, onOpenChange }: ABTopModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refresh() {
    const backends: Backend[] = ["claude", "codex", "opencode"];
    const count = Math.floor(Math.random() * 3) + 2;
    const newSessions = Array.from({ length: count }, (_, i) =>
      fakeSession(i, backends[i % backends.length])
    );
    setSessions(newSessions);
  }

  useEffect(() => {
    if (!open) return;
    refresh();
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
      setSessions(prev => prev.map(s => ({
        ...s,
        tokUsed: Math.min(s.tokLimit, s.tokUsed + (s.status === "active" ? Math.floor(Math.random() * 800) : 0)),
        ctxPct: Math.min(100, Math.floor(((s.tokUsed + (s.status === "active" ? 800 : 0)) / s.tokLimit) * 100)),
        rateUsed: Math.min(s.rateLimit, s.rateUsed + (s.status === "active" ? Math.floor(Math.random() * 3) : 0)),
        status: s.ctxPct > 90 ? "rate-limited" : s.status,
      })));
    }, 1200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open]);

  const total = sessions.length;
  const active = sessions.filter(s => s.status === "active").length;
  const totalTok = sessions.reduce((a, s) => a + s.tokUsed, 0);
  const orphanPorts = sessions.flatMap(s => s.ports);

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
          className="relative w-full max-w-3xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(226,18,39,0.35)", maxHeight: "90vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          {/* Header — btop-style */}
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(226,18,39,0.2)", background: "#111" }}>
            <Activity size={18} color="#e21227" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">ABTOP</div>
              <div className="text-xs" style={{ color: "#555" }}>Like btop, but for your AI coding agents — Claude Code · Codex CLI · OpenCode</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-mono" style={{ color: "#555" }}>tick {tick}</span>
              <button onClick={refresh} className="p-1.5 rounded hover:bg-white/10 transition-colors"><RefreshCw size={13} color="#555" /></button>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-white/10 transition-colors"><X size={16} color="#666" /></button>
            </div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
            {[
              { label: "SESSIONS", value: total.toString(), color: "#fff", icon: <Terminal size={13} /> },
              { label: "ACTIVE",   value: active.toString(), color: "#10b981", icon: <Activity size={13} /> },
              { label: "TOTAL TOK", value: `${(totalTok/1000).toFixed(0)}K`, color: "#fbbf24", icon: <Cpu size={13} /> },
              { label: "ORPHAN PORTS", value: orphanPorts.length.toString(), color: orphanPorts.length > 0 ? "#e21227" : "#555", icon: <AlertTriangle size={13} /> },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-3 border-r last:border-r-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <div className="font-mono font-bold text-base" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs tracking-widest" style={{ color: "#444" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: "#444" }}>
                <Monitor size={32} className="mb-3" />
                <div className="text-sm">No active agent sessions detected</div>
                <button onClick={refresh} className="mt-3 text-xs px-4 py-1.5 rounded border hover:bg-white/5 transition-all" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>SCAN PROCESSES</button>
              </div>
            )}

            {sessions.map(s => {
              const bColor = BACKEND_COLORS[s.backend];
              const ctxColor = s.ctxPct > 85 ? "#e21227" : s.ctxPct > 65 ? "#fbbf24" : "#10b981";
              const rateColor = s.rateUsed / s.rateLimit > 0.9 ? "#e21227" : s.rateUsed / s.rateLimit > 0.7 ? "#fbbf24" : "#10b981";
              const isSelected = selected === s.id;
              return (
                <motion.div key={s.id}
                  onClick={() => setSelected(isSelected ? null : s.id)}
                  className="rounded-lg border cursor-pointer transition-all"
                  style={{ borderColor: isSelected ? bColor + "60" : "rgba(255,255,255,0.07)", background: isSelected ? bColor + "08" : "rgba(255,255,255,0.02)" }}
                  whileHover={{ borderColor: bColor + "40" }}
                >
                  {/* Session header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{s.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: bColor + "20", color: bColor }}>{s.backend.toUpperCase()}</span>
                        <span className="text-xs" style={{ color: "#555" }}>{s.model}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "#555" }}>
                        <span>PID {s.pid}</span>
                        <span>uptime {s.uptime}</span>
                        <span className="font-bold" style={{ color: STATUS_COLORS[s.status] }}>{STATUS_LABELS[s.status]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric bars */}
                  <div className="px-4 pb-3 space-y-2">
                    {/* Context window */}
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: "#555" }}>
                        <span>CONTEXT WINDOW</span>
                        <span style={{ color: ctxColor }}>{s.ctxPct}% · {(s.tokUsed/1000).toFixed(0)}K / {(s.tokLimit/1000).toFixed(0)}K tok</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: ctxColor, width: `${s.ctxPct}%` }} transition={{ duration: 0.4 }} />
                      </div>
                    </div>
                    {/* Rate limit */}
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: "#555" }}>
                        <span>RATE LIMIT</span>
                        <span style={{ color: rateColor }}>{s.rateUsed}/{s.rateLimit} req/min</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full" style={{ background: rateColor, width: `${(s.rateUsed / s.rateLimit) * 100}%` }} transition={{ duration: 0.4 }} />
                      </div>
                    </div>
                  </div>

                  {/* Orphan ports warning */}
                  {s.ports.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border" style={{ borderColor: "rgba(250,204,21,0.3)", background: "rgba(250,204,21,0.06)", color: "#fbbf24" }}>
                        <AlertTriangle size={11} />
                        <span>Orphan ports detected: {s.ports.join(", ")} — agent spawned servers may still be running</span>
                      </div>
                    </div>
                  )}

                  {/* Context % warning */}
                  {s.ctxPct > 85 && (
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border" style={{ borderColor: "rgba(226,18,39,0.3)", background: "rgba(226,18,39,0.06)", color: "#e21227" }}>
                        <AlertTriangle size={11} />
                        <span>Context window {s.ctxPct}% full — consider compressing or starting a new session</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {orphanPorts.length > 0 && (
              <div className="p-3 rounded border" style={{ borderColor: "rgba(226,18,39,0.3)", background: "rgba(226,18,39,0.06)" }}>
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest mb-1" style={{ color: "#e21227" }}>
                  <AlertTriangle size={12} /> ORPHAN PORT ALERT
                </div>
                <div className="text-xs" style={{ color: "#888" }}>
                  Agent spawned servers on ports {orphanPorts.join(", ")} — these processes may be consuming resources after the agent session ended.
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-2 border-t text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#444" }}>
            Read-only · No API keys required · Discovers Claude Code / Codex CLI / OpenCode sessions from process state · Auto-refreshes every 1.2s
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
