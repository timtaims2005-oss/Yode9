import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribePerfState, startPerfEngine, TARGET_FPS } from "@/lib/perf144";
import type { PerfState } from "@/lib/perf144";

const HISTORY = 60;

function FpsGraph({ history, fps }: { history: number[]; fps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    const max = 160;
    const barW = W / HISTORY;

    history.forEach((v, i) => {
      const ratio = Math.min(v / max, 1);
      const barH = ratio * H;
      const green = v >= 120 ? 1 : v >= 60 ? 0.6 : 0.1;
      const red   = v >= 120 ? 0.1 : v >= 60 ? 0.7 : 1;
      ctx.fillStyle = `rgba(${Math.round(red * 220)},${Math.round(green * 220)},80,0.9)`;
      ctx.fillRect(i * barW, H - barH, barW - 0.5, barH);
    });

    // 144fps target line
    const y144 = H - (TARGET_FPS / max) * H;
    ctx.strokeStyle = "rgba(0,229,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, y144); ctx.lineTo(W, y144); ctx.stroke();
    ctx.setLineDash([]);

    // 60fps line
    const y60 = H - (60 / max) * H;
    ctx.strokeStyle = "rgba(255,200,0,0.25)";
    ctx.lineWidth = 0.6;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(0, y60); ctx.lineTo(W, y60); ctx.stroke();
    ctx.setLineDash([]);
  }, [history]);

  const col = fps >= 120 ? "#22c55e" : fps >= 60 ? "#fbbf24" : "#e21227";
  return (
    <div className="relative">
      <canvas ref={ref} width={120} height={28} style={{ display: "block" }} />
      <span style={{ color: col, fontSize: 8, position: "absolute", top: 1, right: 2, fontFamily: "monospace", fontWeight: 700 }}>
        {fps}fps
      </span>
    </div>
  );
}

export function PerfMonitor() {
  const [perf, setPerf] = useState<PerfState | null>(null);
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    startPerfEngine();
    const unsub = subscribePerfState(setPerf);
    return unsub;
  }, []);

  if (!perf) return null;

  const fpsCol = perf.fps >= 120 ? "#22c55e" : perf.fps >= 60 ? "#fbbf24" : "#e21227";
  const frameCol = perf.frameMs <= 8 ? "#22c55e" : perf.frameMs <= 16.7 ? "#fbbf24" : "#e21227";
  const netIcon = perf.netType === "4g" || perf.netType === "wifi" ? "◉" : perf.netType === "3g" ? "◎" : "○";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            top: 8,
            right: 8,
            zIndex: 9999,
            background: "rgba(2,10,18,0.92)",
            border: "1px solid rgba(0,229,255,0.18)",
            borderRadius: 8,
            backdropFilter: "blur(12px)",
            userSelect: "none",
            cursor: "default",
            minWidth: 140,
            boxShadow: "0 0 20px rgba(0,229,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Header */}
          <div
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "4px 8px", borderBottom: collapsed ? "none" : "1px solid rgba(0,229,255,0.08)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: fpsCol, flexShrink: 0 }}
              />
              <span style={{ color: "#00e5ff", fontSize: 9, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2 }}>
                PERF·144
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: fpsCol, fontSize: 10, fontFamily: "monospace", fontWeight: 800 }}>
                {perf.fps}
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, fontFamily: "monospace" }}>fps</span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 8, marginLeft: 4 }}>{collapsed ? "▼" : "▲"}</span>
            </div>
          </div>

          {/* Body */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 5 }}>

                  {/* FPS Graph */}
                  <FpsGraph history={perf.history} fps={perf.fps} />

                  {/* Target badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, fontFamily: "monospace" }}>TARGET</span>
                    <div style={{
                      background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)",
                      borderRadius: 3, padding: "1px 5px",
                      color: "#00e5ff", fontSize: 8, fontFamily: "monospace", fontWeight: 700,
                    }}>
                      {TARGET_FPS} Hz
                    </div>
                  </div>

                  {/* Frame time */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, fontFamily: "monospace" }}>FRAME</span>
                    <span style={{ color: frameCol, fontSize: 8, fontFamily: "monospace", fontWeight: 700 }}>
                      {perf.frameMs}ms
                    </span>
                  </div>

                  {/* Budget bar */}
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 3, overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: `${Math.min((perf.frameMs / (1000 / 60)) * 100, 100)}%` }}
                      transition={{ duration: 0.3 }}
                      style={{
                        height: "100%",
                        background: frameCol,
                        boxShadow: `0 0 4px ${frameCol}`,
                        borderRadius: 2,
                      }}
                    />
                  </div>

                  {/* Memory */}
                  {perf.memMB > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, fontFamily: "monospace" }}>MEM</span>
                      <span style={{ color: "#a78bfa", fontSize: 8, fontFamily: "monospace", fontWeight: 700 }}>
                        {perf.memMB}MB
                        {perf.memLimit > 0 && (
                          <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>/{perf.memLimit}MB</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Network */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, fontFamily: "monospace" }}>NET</span>
                    <span style={{ color: "#22d3ee", fontSize: 8, fontFamily: "monospace" }}>
                      {netIcon} {perf.netType.toUpperCase()}
                      {perf.netDownlink > 0 && <span style={{ color: "rgba(255,255,255,0.4)" }}> {perf.netDownlink}Mb</span>}
                    </span>
                  </div>

                  {/* RTT */}
                  {perf.rtt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, fontFamily: "monospace" }}>RTT</span>
                      <span style={{ color: perf.rtt < 50 ? "#22c55e" : perf.rtt < 150 ? "#fbbf24" : "#e21227", fontSize: 8, fontFamily: "monospace" }}>
                        {perf.rtt}ms
                      </span>
                    </div>
                  )}

                  {/* Budget indicator */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4, marginTop: 1,
                    paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: perf.budgetOk ? "#22c55e" : "#e21227",
                      boxShadow: `0 0 6px ${perf.budgetOk ? "#22c55e" : "#e21227"}`,
                    }} />
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7, fontFamily: "monospace" }}>
                      {perf.budgetOk ? "FRAME BUDGET OK" : "FRAME OVERRUN"}
                    </span>
                  </div>

                  {/* GPU accel note */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: "#00e5ff", boxShadow: "0 0 6px #00e5ff" }} />
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 7, fontFamily: "monospace" }}>GPU COMPOSITING ON</span>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close */}
          <button
            onClick={() => setVisible(false)}
            style={{
              position: "absolute", top: 3, right: collapsed ? 70 : 3,
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.2)", fontSize: 9, padding: "2px 4px",
              lineHeight: 1,
            }}
            title="Hide perf monitor"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
