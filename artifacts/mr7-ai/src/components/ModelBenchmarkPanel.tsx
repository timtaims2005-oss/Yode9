import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronDown, ChevronUp, GripHorizontal, Trophy, Zap, Clock, Cpu } from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════
   AI MODEL BENCHMARK PANEL
   Real-time: speed · latency · token rate · call volume
═══════════════════════════════════════════════════════════════════ */

const PANEL_W  = 340;

interface ModelStats {
  model: string;
  calls: number;
  successes: number;
  totalLatency: number;
  minLatency: number;
  maxLatency: number;
  totalTokens: number;
  totalBytes: number;
}

function shortName(m: string): string {
  return m.replace(/CHAT-GPT\s*/i, "").replace(/gpt-/i, "").slice(0, 18) || m.slice(0, 18);
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function medal(rank: number): string {
  return rank === 0 ? "#fbbf24" : rank === 1 ? "#94a3b8" : rank === 2 ? "#b45309" : "rgba(255,255,255,0.2)";
}

export function ModelBenchmarkPanel() {
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable("mr7-benchmark-pos", { x: Math.max(0, window.innerWidth - PANEL_W - 20), y: 200 });
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [sort, setSort]   = useState<"latency" | "calls" | "tokens">("calls");
  const [tab, setTab]     = useState<"table" | "bars">("table");

  // Rebuild stats from trafficBus history
  const rebuild = useCallback(() => {
    const map = new Map<string, ModelStats>();
    for (const ev of trafficBus.history) {
      if (ev.status !== "success" && ev.status !== "error") continue;
      const key = ev.model || "unknown";
      const s: ModelStats = map.get(key) ?? {
        model: key, calls: 0, successes: 0, totalLatency: 0,
        minLatency: Infinity, maxLatency: 0, totalTokens: 0, totalBytes: 0,
      };
      s.calls++;
      if (ev.status === "success" && ev.latency != null) {
        s.successes++;
        s.totalLatency += ev.latency;
        s.minLatency = Math.min(s.minLatency, ev.latency);
        s.maxLatency = Math.max(s.maxLatency, ev.latency);
      }
      s.totalTokens += ev.tokens ?? 0;
      s.totalBytes  += (ev.bytesSent ?? 0) + (ev.bytesReceived ?? 0);
      map.set(key, s);
    }
    setStats([...map.values()]);
  }, []);

  useEffect(() => {
    rebuild();
    return trafficBus.subscribe(() => rebuild());
  }, [rebuild]);

  // Sort
  const sorted = [...stats].sort((a, b) => {
    if (sort === "latency") {
      const la = a.successes > 0 ? a.totalLatency / a.successes : Infinity;
      const lb = b.successes > 0 ? b.totalLatency / b.successes : Infinity;
      return la - lb;
    }
    if (sort === "tokens") return b.totalTokens - a.totalTokens;
    return b.calls - a.calls;
  });

  const maxLatency = Math.max(...sorted.map(s => s.successes > 0 ? s.totalLatency / s.successes : 0), 1);
  const maxCalls   = Math.max(...sorted.map(s => s.calls), 1);


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      ref={rootRef as any}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 96, userSelect: "none", width: PANEL_W }}
    >
      {/* ── Drag strip ── */}
      <div
        onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}
        style={{
          height: 10, borderRadius: "10px 10px 0 0", cursor: "grab",
          background: "repeating-linear-gradient(90deg, rgba(251,191,36,0.28) 0px, rgba(251,191,36,0.28) 3px, transparent 3px, transparent 8px)",
          border: "1px solid rgba(251,191,36,0.35)", borderBottom: "none",
          boxShadow: "0 0 12px rgba(251,191,36,0.15)",
        }}
      />

      {/* ── Header ── */}
      <div
        onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "8px 10px",
          background: "linear-gradient(135deg, rgba(8,6,2,0.99), rgba(14,10,2,0.98))",
          border: "1px solid rgba(251,191,36,0.2)", borderTop: "none",
          borderBottom: collapsed ? "1px solid rgba(251,191,36,0.2)" : "1px solid rgba(251,191,36,0.06)",
          borderRadius: collapsed ? "0 0 10px 10px" : "0",
          cursor: "grab",
          boxShadow: "0 4px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <GripHorizontal style={{ width: 12, height: 12, color: "rgba(251,191,36,0.45)", flexShrink: 0 }} />
        <Trophy style={{ width: 9, height: 9, color: "#fbbf24", flexShrink: 0 }} />
        <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 800, color: "#fbbf24", letterSpacing: "1.8px", flex: 1 }}>
          MODEL BENCHMARK
        </span>
        <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>
          {stats.length} MODELS · {stats.reduce((s, m) => s + m.calls, 0)} CALLS
        </span>
        <button
          onClick={() => setCollapsed(c => !c)} onMouseDown={e => e.stopPropagation()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, lineHeight: 1, marginLeft: 4 }}
        >
          {collapsed ? <ChevronDown style={{ width: 10, height: 10 }} /> : <ChevronUp style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              border: "1px solid rgba(251,191,36,0.14)", borderTop: "none", borderRadius: "0 0 10px 10px",
              background: "rgba(4,3,1,0.99)", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.9)",
            }}>
              {/* Tabs + sort */}
              <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(251,191,36,0.07)", padding: "4px 8px", gap: 6 }}>
                {(["table", "bars"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} onMouseDown={e => e.stopPropagation()}
                    style={{
                      padding: "2px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: "7px",
                      fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.6px",
                      background: tab === t ? "rgba(251,191,36,0.12)" : "transparent",
                      color: tab === t ? "#fbbf24" : "rgba(255,255,255,0.2)",
                      borderBottom: tab === t ? "1px solid #fbbf24" : "1px solid transparent",
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>SORT:</span>
                {(["calls", "latency", "tokens"] as const).map(s => (
                  <button key={s} onClick={() => setSort(s)} onMouseDown={e => e.stopPropagation()}
                    style={{
                      padding: "1px 5px", borderRadius: 3, border: `1px solid ${sort === s ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer", fontSize: "6.5px", fontFamily: "monospace",
                      background: sort === s ? "rgba(251,191,36,0.08)" : "transparent",
                      color: sort === s ? "#fbbf24" : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {stats.length === 0 ? (
                <div style={{ padding: "24px 12px", textAlign: "center", fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
                  SEND A MESSAGE TO START BENCHMARKING
                </div>
              ) : tab === "table" ? (
                /* ── TABLE VIEW ── */
                <div>
                  {/* Column headers */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "16px 1fr 64px 64px 52px",
                    padding: "3px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(251,191,36,0.02)",
                  }}>
                    {["#", "MODEL", "AVG", "CALLS", "TOK"].map((h, i) => (
                      <div key={i} style={{ fontSize: "6.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(251,191,36,0.4)", letterSpacing: "0.5px" }}>{h}</div>
                    ))}
                  </div>
                  {sorted.map((s, idx) => {
                    const avgLat = s.successes > 0 ? s.totalLatency / s.successes : 0;
                    const tokRate = avgLat > 0 && s.totalTokens > 0 ? Math.round(s.totalTokens / (s.totalLatency / 1000)) : 0;
                    return (
                      <motion.div
                        key={s.model}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        style={{
                          display: "grid", gridTemplateColumns: "16px 1fr 64px 64px 52px",
                          padding: "5px 8px",
                          borderBottom: "1px solid rgba(255,255,255,0.025)",
                          background: idx === 0 ? "rgba(251,191,36,0.04)" : "transparent",
                        }}
                      >
                        {/* Rank */}
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: medal(idx), fontWeight: 900 }}>
                          {idx + 1}
                        </div>
                        {/* Model name */}
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: idx === 0 ? "#fbbf24" : "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shortName(s.model)}
                        </div>
                        {/* Avg latency */}
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: avgLat < 1500 ? "#22c55e" : avgLat < 4000 ? "#f59e0b" : "#e21227" }}>
                          {avgLat > 0 ? fmtMs(avgLat) : "—"}
                        </div>
                        {/* Call count */}
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                          {s.calls} ({s.successes}✓)
                        </div>
                        {/* Tokens/s */}
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: "#a78bfa" }}>
                          {tokRate > 0 ? `${tokRate}/s` : `${s.totalTokens}`}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* ── BAR VIEW ── */
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {sorted.slice(0, 8).map((s, idx) => {
                    const avgLat = s.successes > 0 ? s.totalLatency / s.successes : 0;
                    const barVal = sort === "latency" ? avgLat / maxLatency : s.calls / maxCalls;
                    const barColor = sort === "latency"
                      ? (avgLat < 1500 ? "#22c55e" : avgLat < 4000 ? "#f59e0b" : "#e21227")
                      : "#00e5ff";
                    return (
                      <div key={s.model}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: idx === 0 ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>
                            {idx + 1}. {shortName(s.model)}
                          </span>
                          <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: barColor }}>
                            {sort === "latency" ? (avgLat > 0 ? fmtMs(avgLat) : "—") : sort === "calls" ? `${s.calls} calls` : `${s.totalTokens} tok`}
                          </span>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${barVal * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            style={{
                              height: "100%", borderRadius: 3,
                              background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                              boxShadow: `0 0 6px ${barColor}66`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer stats */}
              <div style={{
                display: "flex", gap: "12px", padding: "5px 10px",
                borderTop: "1px solid rgba(251,191,36,0.06)",
                background: "rgba(251,191,36,0.02)",
              }}>
                {[
                  { icon: <Clock style={{ width: 7, height: 7 }} />, label: "BEST", value: sorted[0] && sorted[0].successes > 0 ? fmtMs(sorted[0].totalLatency / sorted[0].successes) : "—", color: "#22c55e" },
                  { icon: <Zap style={{ width: 7, height: 7 }} />, label: "CALLS", value: String(stats.reduce((s, m) => s + m.calls, 0)), color: "#00e5ff" },
                  { icon: <Cpu style={{ width: 7, height: 7 }} />, label: "TOKENS", value: String(stats.reduce((s, m) => s + m.totalTokens, 0)), color: "#a78bfa" },
                ].map(({ icon, label, value, color }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>{icon}</span>
                    <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{label}:</span>
                    <span style={{ fontSize: "6.5px", fontFamily: "monospace", color, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
