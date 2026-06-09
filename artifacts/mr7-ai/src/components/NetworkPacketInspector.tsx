import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ChevronDown, ChevronUp, GripHorizontal, Square, Circle,
  Filter, Trash2, Download, Search, Wifi, ChevronRight, ChevronLeft
} from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   NETWORK PACKET INSPECTOR — Wireshark-Style Live API Capture
   Real-time packet capture · Hex dump · ASCII decode · Timing
═══════════════════════════════════════════════════════════════════════ */

const STOR_KEY = "mr7-packet-inspector-pos";
const PANEL_W = 700;

function loadPos(): { x: number; y: number } {
  try { const v = localStorage.getItem(STOR_KEY); if (v) return JSON.parse(v); } catch {}
  return { x: Math.max(0, (window.innerWidth - PANEL_W) / 2), y: 120 };
}

function toHexDump(str: string, maxBytes = 256): { offset: string; hex: string[]; ascii: string }[] {
  const bytes: number[] = [];
  for (let i = 0; i < Math.min(str.length, maxBytes * 2); i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  const rows: { offset: string; hex: string[]; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map(b => b.toString(16).padStart(2, "0"));
    const ascii = chunk.map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : ".").join("");
    rows.push({ offset: i.toString(16).padStart(4, "0"), hex, ascii });
  }
  return rows;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`;
}

function statusColor(status: TrafficEvent["status"]): string {
  return status === "success" ? "#22c55e" : status === "error" ? "#e21227" :
         status === "streaming" ? "#f59e0b" : "#00e5ff";
}

function shortModel(m: string): string {
  return m.replace("CHAT-GPT ", "GPT-").replace("gpt-", "GPT-").slice(0, 16);
}

interface HexByte { row: number; col: number }

export function NetworkPacketInspector() {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos]     = useState<{ x: number; y: number }>(loadPos);
  const [packets, setPackets] = useState<TrafficEvent[]>([]);
  const [selected, setSelected] = useState<TrafficEvent | null>(null);
  const [filter, setFilter]   = useState("");
  const [capturing, setCapturing] = useState(true);
  const [hoveredByte, setHoveredByte] = useState<HexByte | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [capturedCount, setCapturedCount] = useState(0);
  const captureRef = useRef(true);
  const listRef    = useRef<HTMLDivElement>(null);
  const dragRef    = useRef({ dragging: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const autoScroll = useRef(true);

  useEffect(() => {
    captureRef.current = capturing;
  }, [capturing]);

  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      if (!captureRef.current) return;
      setPackets([...trafficBus.history]);
      setCapturedCount(c => (ev.status === "pending" ? c + 1 : c));
      setSelected(prev => prev?.id === ev.id ? ev : prev);
      if (autoScroll.current && listRef.current) {
        setTimeout(() => { if (listRef.current) listRef.current.scrollTop = 0; }, 30);
      }
    });
    return unsub;
  }, []);

  // Widget drag
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = pos.x, oy = pos.y;
    const move = (ev: MouseEvent) => {
      const nx = Math.max(0, Math.min(window.innerWidth - PANEL_W - 4, ox + ev.clientX - sx));
      const ny = Math.max(0, Math.min(window.innerHeight - 50, oy + ev.clientY - sy));
      setPos({ x: nx, y: ny });
      try { localStorage.setItem(STOR_KEY, JSON.stringify({ x: nx, y: ny })); } catch {}
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  }, [pos]);

  const filtered = packets.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return p.model.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q) ||
           p.status.includes(q) || p.endpoint.includes(q);
  });

  const hexDump = selected?.payloadPreview ? toHexDump(selected.payloadPreview) : [];
  const respDump = selected?.responsePreview ? toHexDump(selected.responsePreview) : [];
  const [dumpMode, setDumpMode] = useState<"request" | "response">("request");
  const activeDump = dumpMode === "request" ? hexDump : respDump;

  const totalBytes = packets.reduce((s, p) => s + (p.bytesSent ?? 0) + (p.bytesReceived ?? 0), 0);
  const successRate = packets.length > 0
    ? Math.round(packets.filter(p => p.status === "success").length / packets.length * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 85, userSelect: "none", width: PANEL_W }}
    >
      {/* ══════════════ TOOLBAR / HEADER ══════════════ */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "5px 8px",
          background: "linear-gradient(180deg, rgba(0,6,18,0.99) 0%, rgba(0,10,24,0.98) 100%)",
          borderTop: "1px solid rgba(0,229,255,0.3)",
          borderLeft: "1px solid rgba(0,229,255,0.12)",
          borderRight: "1px solid rgba(0,229,255,0.12)",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          cursor: "grab",
          boxShadow: "0 4px 32px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,229,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <GripHorizontal style={{ width: 10, height: 10, color: "rgba(0,229,255,0.35)", flexShrink: 0 }} />

        {/* Wireshark fin icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Wifi style={{ width: 9, height: 9, color: "#00e5ff" }} />
          <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: "#00e5ff", letterSpacing: "2px" }}>
            PACKET INSPECTOR
          </span>
        </div>

        {/* Capture dot */}
        {capturing && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 6px #e21227" }}
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Filter bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: "4px",
          background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.12)",
          borderRadius: 5, padding: "2px 6px",
        }}
          onMouseDown={e => e.stopPropagation()}
        >
          <Search style={{ width: 7, height: 7, color: "rgba(0,229,255,0.4)" }} />
          <input
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="filter..."
            style={{
              background: "none", border: "none", outline: "none", width: 90,
              fontSize: "7.5px", fontFamily: "monospace", color: "#00e5ff",
              caretColor: "#00e5ff",
            }}
          />
          {filter && <button onClick={() => setFilter("")} onMouseDown={e => e.stopPropagation()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, lineHeight: 1 }}>
            ×
          </button>}
        </div>

        {/* Controls */}
        {[
          { icon: capturing ? <Square style={{ width: 8, height: 8 }} /> : <Circle style={{ width: 8, height: 8 }} />,
            color: capturing ? "#e21227" : "#22c55e",
            tip: capturing ? "Stop" : "Resume",
            onClick: () => setCapturing(c => !c) },
          { icon: <Trash2 style={{ width: 8, height: 8 }} />, color: "rgba(255,255,255,0.3)", tip: "Clear",
            onClick: () => { setPackets([]); setSelected(null); setCapturedCount(0); } },
        ].map((btn, i) => (
          <button key={i}
            onClick={btn.onClick} onMouseDown={e => e.stopPropagation()}
            title={btn.tip}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", color: btn.color, padding: "2px 5px", borderRadius: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
          >
            {btn.icon}
          </button>
        ))}

        {/* Expand/collapse detail */}
        <button
          onClick={() => setShowDetail(d => !d)} onMouseDown={e => e.stopPropagation()}
          title={showDetail ? "Hide detail" : "Show hex detail"}
          style={{ background: "none", border: "1px solid rgba(0,229,255,0.12)", cursor: "pointer", color: "rgba(0,229,255,0.5)", padding: "2px 5px", borderRadius: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
        >
          {showDetail ? <ChevronLeft style={{ width: 8, height: 8 }} /> : <ChevronRight style={{ width: 8, height: 8 }} />}
        </button>

        <button
          onClick={() => setCollapsed(c => !c)} onMouseDown={e => e.stopPropagation()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 0, lineHeight: 1 }}
        >
          {collapsed ? <ChevronDown style={{ width: 10, height: 10 }} /> : <ChevronUp style={{ width: 10, height: 10 }} />}
        </button>
      </div>

      {/* ══════════════ COLUMN HEADER ══════════════ */}
      {!collapsed && (
        <div style={{
          display: "grid",
          gridTemplateColumns: showDetail ? "36px 90px 72px 80px 56px 56px 1fr" : "36px 90px 80px 72px 64px 64px 1fr",
          gap: 0,
          background: "rgba(0,20,40,0.98)",
          border: "1px solid rgba(0,229,255,0.1)", borderTop: "none",
          borderBottom: "1px solid rgba(0,229,255,0.12)",
        }}>
          {["No.", "Time", "Source", "Destination", "Proto", "Length", "Info"].map((h, i) => (
            <div key={i} style={{
              padding: "3px 6px", fontSize: "7.5px", fontFamily: "monospace", fontWeight: 800,
              color: "rgba(0,229,255,0.5)", letterSpacing: "0.8px",
              borderRight: i < 6 ? "1px solid rgba(0,229,255,0.06)" : "none",
              background: i === 0 ? "rgba(0,229,255,0.03)" : "transparent",
            }}>{h}</div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", background: "rgba(1,4,12,0.99)", border: "1px solid rgba(0,229,255,0.1)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>

              {/* ── LEFT: Packet list ── */}
              <div style={{ flex: 1, minWidth: 0, borderRight: showDetail ? "1px solid rgba(0,229,255,0.08)" : "none" }}>
                {/* Packet rows */}
                <div ref={listRef} style={{ maxHeight: 180, overflowY: "auto", overflowX: "hidden" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", fontSize: "7.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.2)" }}>
                      {packets.length === 0 ? "WAITING FOR PACKETS..." : "NO MATCHING PACKETS"}
                    </div>
                  ) : filtered.map((pkt, i) => {
                    const isSelected = selected?.id === pkt.id;
                    const col = statusColor(pkt.status);
                    const isPending = pkt.status === "pending" || pkt.status === "streaming";
                    return (
                      <div
                        key={pkt.id}
                        onClick={() => { setSelected(pkt); autoScroll.current = false; }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: showDetail ? "36px 90px 72px 80px 56px 56px 1fr" : "36px 90px 80px 72px 64px 64px 1fr",
                          gap: 0, cursor: "pointer",
                          background: isSelected
                            ? "rgba(0,229,255,0.09)"
                            : pkt.status === "error" ? "rgba(226,18,39,0.04)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.025)",
                          borderLeft: isSelected ? "2px solid #00e5ff" : `2px solid ${col}22`,
                        }}
                      >
                        {/* No. */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>
                          {pkt.seq}
                        </div>
                        {/* Time */}
                        <div style={{ padding: "3px 5px", fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                          {formatTime(pkt.startTime)}
                        </div>
                        {/* Source */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: "#00e5ff", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                          CLIENT
                        </div>
                        {/* Destination */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: "#a78bfa", borderRight: "1px solid rgba(255,255,255,0.03)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pkt.provider.toUpperCase()}
                        </div>
                        {/* Protocol */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                          HTTP/AI
                        </div>
                        {/* Length */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", borderRight: "1px solid rgba(255,255,255,0.03)" }}>
                          {pkt.bytesSent != null ? `${pkt.bytesSent}B` : "—"}
                        </div>
                        {/* Info */}
                        <div style={{ padding: "3px 5px", fontSize: "7px", fontFamily: "monospace", color: col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {isPending && <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ marginRight: 4 }}>●</motion.span>}
                          {shortModel(pkt.model)}
                          {pkt.latency != null && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{pkt.latency}ms</span>}
                          {pkt.tokens != null && pkt.tokens > 0 && <span style={{ color: "#a78bfa", marginLeft: 6 }}>{pkt.tokens}tok</span>}
                          {pkt.status === "error" && <span style={{ color: "#e21227", marginLeft: 6 }}>ERROR</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Status bar ── */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "3px 8px",
                  background: "rgba(0,6,16,0.99)",
                  borderTop: "1px solid rgba(0,229,255,0.06)",
                }}>
                  <Activity style={{ width: 7, height: 7, color: "rgba(0,229,255,0.4)" }} />
                  <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)" }}>
                    PKT: <span style={{ color: "#00e5ff", fontWeight: 700 }}>{packets.length}</span>
                  </span>
                  <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)" }}>
                    BYTES: <span style={{ color: "#00e5ff", fontWeight: 700 }}>{totalBytes > 999 ? `${(totalBytes/1024).toFixed(1)}K` : totalBytes}</span>
                  </span>
                  <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)" }}>
                    SUCCESS: <span style={{ color: "#22c55e", fontWeight: 700 }}>{successRate}%</span>
                  </span>
                  <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>
                    {capturing ? "● CAPTURING" : "■ PAUSED"}
                  </span>
                </div>

                {/* ── Timing waterfall (when packet selected) ── */}
                {selected && (
                  <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(0,229,255,0.06)", background: "rgba(0,4,12,0.98)" }}>
                    <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)", marginBottom: 5, letterSpacing: "1px" }}>
                      TIMING BREAKDOWN
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {[
                        { label: "Request Init", val: 8, color: "#22c55e" },
                        { label: "API Connect", val: 42, color: "#3b82f6" },
                        { label: "TTFB", val: selected.latency ? Math.round(selected.latency * 0.4) : 0, color: "#f59e0b" },
                        { label: "Stream", val: selected.latency ? Math.round(selected.latency * 0.55) : 0, color: "#a78bfa" },
                      ].map((seg, i) => {
                        const totalLat = selected.latency ?? 1000;
                        const pct = Math.min(100, (seg.val / totalLat) * 100);
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", minWidth: 68 }}>{seg.label}</span>
                            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: seg.color, borderRadius: 2, boxShadow: `0 0 4px ${seg.color}` }} />
                            </div>
                            <span style={{ fontSize: "6px", fontFamily: "monospace", color: seg.color, minWidth: 30, textAlign: "right" }}>{seg.val}ms</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Hex dump panel ── */}
              {showDetail && selected && (
                <div style={{ width: 290, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                  {/* Dump mode tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
                    {(["request", "response"] as const).map(mode => (
                      <button
                        key={mode} onClick={() => setDumpMode(mode)}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          flex: 1, padding: "4px 0",
                          background: dumpMode === mode ? "rgba(0,229,255,0.08)" : "transparent",
                          border: "none", borderBottom: dumpMode === mode ? "2px solid #00e5ff" : "2px solid transparent",
                          cursor: "pointer", fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
                          color: dumpMode === mode ? "#00e5ff" : "rgba(255,255,255,0.25)",
                          letterSpacing: "0.8px",
                        }}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Hex dump content */}
                  <div
                    onMouseDown={e => e.stopPropagation()}
                    style={{ flex: 1, overflowY: "auto", maxHeight: 200, padding: "4px 0" }}
                  >
                    {activeDump.length === 0 ? (
                      <div style={{ padding: "20px 8px", textAlign: "center", fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
                        {dumpMode === "request" ? "NO REQUEST DATA" : "NO RESPONSE DATA"}
                      </div>
                    ) : activeDump.map((row, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 0, padding: "0 4px", fontFamily: "monospace" }}>
                        {/* Offset */}
                        <span style={{ fontSize: "6.5px", color: "rgba(0,229,255,0.3)", minWidth: 32, marginRight: 6 }}>
                          {row.offset}
                        </span>
                        {/* Hex bytes */}
                        <div style={{ display: "flex", gap: "2px", flex: 1 }}>
                          {row.hex.map((b, bi) => (
                            <span
                              key={bi}
                              onMouseEnter={() => setHoveredByte({ row: ri, col: bi })}
                              onMouseLeave={() => setHoveredByte(null)}
                              style={{
                                fontSize: "6.5px", cursor: "default",
                                color: (hoveredByte?.row === ri && hoveredByte?.col === bi)
                                  ? "#fff"
                                  : b === "7b" || b === "7d" ? "#22c55e"
                                  : b === "22" ? "#f59e0b"
                                  : b === "3a" ? "#00e5ff"
                                  : "rgba(255,255,255,0.55)",
                                background: (hoveredByte?.row === ri && hoveredByte?.col === bi)
                                  ? "rgba(0,229,255,0.15)" : "transparent",
                                borderRadius: 2, padding: "0 0.5px",
                              }}
                            >
                              {b}
                            </span>
                          ))}
                          {/* Padding for incomplete rows */}
                          {Array.from({ length: 16 - row.hex.length }).map((_, pi) => (
                            <span key={pi} style={{ fontSize: "6.5px", color: "transparent" }}>00</span>
                          ))}
                        </div>
                        {/* ASCII */}
                        <span style={{ fontSize: "6.5px", color: "rgba(255,255,255,0.3)", minWidth: 66, marginLeft: 4, borderLeft: "1px solid rgba(0,229,255,0.07)", paddingLeft: 4 }}>
                          {row.ascii.split("").map((ch, ci) => (
                            <span key={ci} style={{
                              color: ch !== "." ? "rgba(0,229,255,0.7)" : "rgba(255,255,255,0.15)",
                              background: (hoveredByte?.row === ri && hoveredByte?.col === ci) ? "rgba(0,229,255,0.15)" : "transparent",
                            }}>{ch}</span>
                          ))}
                        </span>
                      </div>
                    ))}
                    {selected.payloadPreview && selected.payloadPreview.length > 512 * 2 && (
                      <div style={{ padding: "4px 8px", fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
                        ... {Math.round(selected.bytesSent! / 1024 * 10) / 10}KB total (showing first 256B)
                      </div>
                    )}
                  </div>

                  {/* Parsed JSON info */}
                  {selected.payloadPreview && (
                    <div style={{
                      borderTop: "1px solid rgba(0,229,255,0.06)",
                      padding: "5px 6px", background: "rgba(0,4,12,0.98)",
                    }}>
                      <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)", marginBottom: 3, letterSpacing: "0.8px" }}>
                        PARSED FIELDS
                      </div>
                      {(() => {
                        try {
                          const parsed = JSON.parse(selected.payloadPreview);
                          return [
                            { k: "model",    v: parsed.model ?? "—" },
                            { k: "provider", v: parsed.provider ?? "personal" },
                            { k: "mode",     v: parsed.mode ?? "chat" },
                            { k: "lang",     v: parsed.language ?? "en" },
                            { k: "msgs",     v: `${(parsed.messages?.length ?? 0)} msg` },
                          ].map(({ k, v }) => (
                            <div key={k} style={{ display: "flex", gap: 4, marginBottom: 1 }}>
                              <span style={{ fontSize: "6px", fontFamily: "monospace", color: "#00e5ff", minWidth: 48 }}>{k}:</span>
                              <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{String(v)}</span>
                            </div>
                          ));
                        } catch {
                          return <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>invalid json</span>;
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
