import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Wifi, WifiOff, Zap, AlertTriangle, Clock } from "lucide-react";

interface KevVuln {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  knownRansomwareCampaignUse: string;
}

interface WsMessage {
  type: "snapshot" | "new_entries";
  items: KevVuln[];
  total?: number;
  version?: string;
}

function ScanLineCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 320, H = 4;
    cv.width = W; cv.height = H;
    let x = -60;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(x, 0, x + 60, 0);
      g.addColorStop(0,   "rgba(226,18,39,0)");
      g.addColorStop(0.5, "rgba(226,18,39,0.8)");
      g.addColorStop(1,   "rgba(226,18,39,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 60, H);
      x += 3;
      if (x > W + 60) x = -60;
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: 4, display: "block" }} />;
}

interface CisaLivePanel3DProps {
  open: boolean;
  onClose: () => void;
}

export function CisaLivePanel3D({ open, onClose }: CisaLivePanel3DProps) {
  const [entries, setEntries]   = useState<KevVuln[]>([]);
  const [newAlerts, setNewAlerts] = useState<KevVuln[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [total, setTotal]       = useState<number | null>(null);
  const [version, setVersion]   = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host  = window.location.host;
    const ws    = new WebSocket(`${proto}//${host}/api/cisa-live`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("open");
    ws.onclose = () => {
      setWsStatus("closed");
      reconnectRef.current = setTimeout(connect, 5000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.total) setTotal(msg.total);
        if (msg.version) setVersion(msg.version);
        if (msg.type === "snapshot") {
          setEntries(msg.items);
        } else if (msg.type === "new_entries") {
          setEntries(prev => [...msg.items, ...prev].slice(0, 50));
          setNewAlerts(prev => [...msg.items, ...prev].slice(0, 5));
          setTimeout(() => setNewAlerts([]), 8000);
        }
      } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [open, connect]);

  const ransomColor = (r: string) =>
    r === "Known"   ? "#e21227" :
    r === "Unknown" ? "#f59e0b" : "#6b7280";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 320, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 320, scale: 0.94 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed right-4 top-16 z-50 w-80"
          style={{
            background: "rgba(6,6,10,0.97)",
            border: "1px solid rgba(226,18,39,0.3)",
            borderRadius: 18,
            boxShadow: "0 0 60px rgba(226,18,39,0.15), 0 20px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Top scan line */}
          <div className="rounded-t-[18px] overflow-hidden">
            <ScanLineCanvas />
          </div>

          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(226,18,39,0.12)" }}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <ShieldAlert className="w-4 h-4" style={{ color: "#e21227" }} />
              </motion.div>
              <div>
                <div className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: "rgba(226,18,39,0.7)" }}>
                  CISA KEV — LIVE
                </div>
                <div className="text-white text-[11px] font-bold">
                  ثغرات مستغلة معروفة
                  {total && <span className="text-white/40 ml-1 font-mono text-[9px]">({total.toLocaleString()})</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* WS status */}
              <div className="flex items-center gap-1">
                {wsStatus === "open" ? (
                  <motion.div animate={{ opacity: [0.5, 1] }} transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}>
                    <Wifi className="w-3 h-3" style={{ color: "#22c55e" }} />
                  </motion.div>
                ) : wsStatus === "connecting" ? (
                  <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                    <Wifi className="w-3 h-3" style={{ color: "#f59e0b" }} />
                  </motion.div>
                ) : (
                  <WifiOff className="w-3 h-3" style={{ color: "#e21227" }} />
                )}
                <span className="text-[8px] font-mono" style={{
                  color: wsStatus === "open" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#e21227"
                }}>
                  {wsStatus === "open" ? "LIVE" : wsStatus === "connecting" ? "···" : "OFF"}
                </span>
              </div>
              <button onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Version badge */}
          {version && (
            <div className="px-4 py-1.5 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[8px] font-mono text-white/30">Catalog v{version}</span>
              <div className="flex items-center gap-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#22c55e" }}
                  animate={{ opacity: [0.4, 1], scale: [0.8, 1.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                />
                <span className="text-[8px] font-mono" style={{ color: "#22c55e" }}>WebSocket Active</span>
              </div>
            </div>
          )}

          {/* New alert toast */}
          <AnimatePresence>
            {newAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mx-3 my-2 rounded-xl p-2.5 flex items-start gap-2"
                  style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.4)" }}>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#e21227" }} />
                  </motion.div>
                  <div>
                    <div className="text-[9px] font-black tracking-widest" style={{ color: "#e21227" }}>
                      تحديث جديد مباشر!
                    </div>
                    <div className="text-[10px] text-white/70 mt-0.5">
                      {newAlerts.length} ثغرة جديدة أُضيفت للفهرس
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entries list */}
          <div className="px-3 pb-3 space-y-1.5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {entries.length === 0 ? (
              <div className="py-8 text-center">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-2">
                  <ShieldAlert className="w-8 h-8" style={{ color: "rgba(226,18,39,0.4)" }} />
                </motion.div>
                <p className="text-[11px] text-white/30">جارٍ الاتصال بـ CISA KEV…</p>
              </div>
            ) : (
              entries.map((v, i) => {
                const isNew = newAlerts.some(a => a.cveID === v.cveID);
                return (
                  <motion.div
                    key={v.cveID}
                    initial={isNew ? { opacity: 0, x: -20, scale: 0.96 } : false}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: isNew ? 0 : i * 0.02, duration: 0.18 }}
                    className="rounded-xl p-2.5 transition-all"
                    style={{
                      background: isNew
                        ? "rgba(226,18,39,0.1)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isNew ? "rgba(226,18,39,0.35)" : "rgba(255,255,255,0.06)"}`,
                      boxShadow: isNew ? "0 0 12px rgba(226,18,39,0.15)" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="font-mono font-black text-[10px]" style={{ color: "#e21227" }}>
                            {v.cveID}
                          </span>
                          {isNew && (
                            <motion.span
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="text-[7px] font-black px-1 py-0.5 rounded"
                              style={{ background: "rgba(226,18,39,0.3)", color: "#e21227", border: "1px solid rgba(226,18,39,0.5)" }}>
                              NEW
                            </motion.span>
                          )}
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold"
                            style={{
                              background: `${ransomColor(v.knownRansomwareCampaignUse)}18`,
                              border: `1px solid ${ransomColor(v.knownRansomwareCampaignUse)}40`,
                              color: ransomColor(v.knownRansomwareCampaignUse),
                            }}>
                            {v.knownRansomwareCampaignUse === "Known" ? "RANSOMWARE" : "VULN"}
                          </span>
                        </div>
                        <div className="text-[10px] font-semibold text-white/80 leading-snug truncate">
                          {v.vulnerabilityName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-white/40 font-mono">{v.vendorProject} · {v.product}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.25)" }} />
                          <span className="text-[8px] font-mono text-white/30">{v.dateAdded}</span>
                          {v.knownRansomwareCampaignUse === "Known" && (
                            <AlertTriangle className="w-2.5 h-2.5 ml-auto" style={{ color: "#e21227" }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-[18px]"
            style={{ background: "linear-gradient(transparent, rgba(6,6,10,0.9))" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
