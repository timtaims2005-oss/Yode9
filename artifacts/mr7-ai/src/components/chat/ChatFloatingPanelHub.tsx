import { lazy, Suspense, useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Maximize2, GripHorizontal } from "lucide-react";
import type { PanelDef } from "./ChatPanelBar";
import { PANEL_DEFS } from "./ChatPanelBar";
import { SysMonitorOrb, IdleTrackerOrb } from "../FloatingChatPanels";

// ── Lazy-loaded 3D panel components ──────────────────────────────────────────
const ThreatFeed3D         = lazy(() => import("../ThreatFeed3D").then(m => ({ default: () => <m.ThreatFeed3D onClose={() => {}} /> })));
const SecurityDashboard3D  = lazy(() => import("../SecurityDashboard3D").then(m => ({ default: () => <m.SecurityDashboard3D onClose={() => {}} /> })));
const NetworkTopology3D    = lazy(() => import("../NetworkTopology3D").then(m => ({ default: () => <m.NetworkTopology3D onClose={() => {}} /> })));
const PerformanceDashboard3D = lazy(() => import("../PerformanceDashboard3D").then(m => ({ default: () => <m.PerformanceDashboard3D onClose={() => {}} /> })));
const CostDashboard3D      = lazy(() => import("../CostDashboard3D").then(m => ({ default: () => <m.CostDashboard3D entries={[]} onClose={() => {}} /> })));
const ContextMemoryPanel3D = lazy(() => import("../ContextMemoryPanel3D").then(m => ({ default: () => <m.ContextMemoryPanel3D onClose={() => {}} /> })));
const AnomalyLog3D         = lazy(() => import("../AnomalyLog3D").then(m => ({ default: () => <m.AnomalyLog3D onClose={() => {}} /> })));
const DedupVisualizer3D    = lazy(() => import("../DedupVisualizer3D").then(m => ({ default: () => <m.DedupVisualizer3D onClose={() => {}} /> })));
const PrefetchIntelligence3D = lazy(() => import("../PrefetchIntelligence3D").then(m => ({ default: () => <m.PrefetchIntelligence3D onClose={() => {}} /> })));
const LiveAttackGlobe3D    = lazy(() => import("../LiveAttackGlobe3D").then(m => ({ default: m.LiveAttackGlobe3D })));
const LiveOpsDashboard3D   = lazy(() => import("../LiveOpsDashboard3D").then(m => ({ default: () => <m.LiveOpsDashboard3D onClose={() => {}} /> })));
const SystemMasterHUD3D    = lazy(() => import("../SystemMasterHUD3D").then(m => ({ default: () => <m.SystemMasterHUD3D id="hub" title="SYSTEM HUD" icon="⚡" color="#facc15" /> })));
const CisaLivePanel3D      = lazy(() => import("../CisaLivePanel3D").then(m => ({ default: () => <m.CisaLivePanel3D open={true} onClose={() => {}} /> })));

// ── Simple built-in panels ────────────────────────────────────────────────────
function StreamMetricsPanel() {
  const [tps, setTps] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setTps(Math.round(Math.random() * 80 + 20));
      setTotal(v => v + Math.round(Math.random() * 40 + 5));
    }, 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="p-4 font-mono space-y-3">
      <div className="flex justify-between items-center text-[11px]">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Tokens / sec</span>
        <span style={{ color: "#34d399", textShadow: "0 0 8px rgba(52,211,153,0.5)", fontWeight: 700, fontSize: "14px" }}>{tps}</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full" style={{ background: "#34d399" }}
          animate={{ width: `${Math.min(100, tps)}%` }} transition={{ duration: 0.4 }} />
      </div>
      <div className="flex justify-between items-center text-[11px]">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Total Tokens</span>
        <span style={{ color: "#34d399", fontWeight: 700 }}>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function GpuCpuPanel() {
  const [vals, setVals] = useState({ cpu: 42, gpu: 28, mem: 61 });
  useEffect(() => {
    const iv = setInterval(() => setVals(v => ({
      cpu: Math.max(5, Math.min(95, v.cpu + (Math.random() - 0.5) * 8)),
      gpu: Math.max(5, Math.min(95, v.gpu + (Math.random() - 0.5) * 6)),
      mem: Math.max(20, Math.min(90, v.mem + (Math.random() - 0.5) * 2)),
    })), 600);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="p-4 space-y-3">
      {([["CPU", vals.cpu, "#06b6d4"], ["GPU", vals.gpu, "#8b5cf6"], ["MEM", vals.mem, "#10b981"]] as const).map(([lbl, val, col]) => (
        <div key={lbl} className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{lbl}</span>
            <span style={{ color: col, textShadow: `0 0 6px ${col}`, fontWeight: 700 }}>{Math.round(val)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div className="h-full rounded-full" style={{ background: col }}
              animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreatIntelPanel() {
  const threats = [
    { id: "CVE-2024-1234", sev: "CRITICAL", src: "NVD", color: "#e21227" },
    { id: "APT-41-IOC",    sev: "HIGH",     src: "CISA", color: "#fb923c" },
    { id: "RANSOM-WAVE",   sev: "HIGH",     src: "FBI",  color: "#fb923c" },
    { id: "SUPPLY-CHAIN",  sev: "MEDIUM",   src: "NSA",  color: "#facc15" },
    { id: "ZERO-DAY-SSL",  sev: "CRITICAL", src: "CVE",  color: "#e21227" },
  ];
  return (
    <div className="p-3 space-y-1.5 font-mono text-[10px]">
      {threats.map(t => (
        <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded"
          style={{ background: `${t.color}08`, border: `1px solid ${t.color}20` }}>
          <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ background: t.color }} />
          <span style={{ color: "rgba(255,255,255,0.7)", flex: 1 }}>{t.id}</span>
          <span className="text-[8px] font-black tracking-wide" style={{ color: t.color }}>{t.sev}</span>
          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>{t.src}</span>
        </div>
      ))}
    </div>
  );
}

// ── Panel registry ────────────────────────────────────────────────────────────
const PANEL_REGISTRY: Record<string, { component: React.ComponentType; w: number; h: number }> = {
  sysmon:      { component: SysMonitorOrb,          w: 230, h: 200 },
  idle:        { component: IdleTrackerOrb,          w: 230, h: 240 },
  threat:      { component: ThreatFeed3D,            w: 400, h: 380 },
  secDash:     { component: SecurityDashboard3D,     w: 460, h: 420 },
  netTopo:     { component: NetworkTopology3D,       w: 480, h: 440 },
  perf:        { component: PerformanceDashboard3D,  w: 460, h: 420 },
  cost:        { component: CostDashboard3D,         w: 420, h: 400 },
  ctxMem:      { component: ContextMemoryPanel3D,    w: 420, h: 400 },
  anomaly:     { component: AnomalyLog3D,            w: 400, h: 380 },
  dedup:       { component: DedupVisualizer3D,       w: 420, h: 400 },
  radio:       { component: PrefetchIntelligence3D,  w: 400, h: 380 },
  threatMap:   { component: LiveAttackGlobe3D,       w: 520, h: 440 },
  threatIntel: { component: ThreatIntelPanel,        w: 340, h: 240 },
  liveOps:     { component: LiveOpsDashboard3D,      w: 460, h: 420 },
  sysHUD:      { component: SystemMasterHUD3D,       w: 440, h: 420 },
  cisa:        { component: CisaLivePanel3D,         w: 440, h: 400 },
  dbStats:     { component: StreamMetricsPanel,      w: 280, h: 200 },
  gpu:         { component: GpuCpuPanel,             w: 280, h: 210 },
};

// ── Saved position helpers ────────────────────────────────────────────────────
function getSavedPos(id: string, dx: number, dy: number): { x: number; y: number } {
  try {
    const s = localStorage.getItem(`fp-hub-${id}-v2`);
    if (s) return JSON.parse(s);
  } catch {}
  return { x: dx, y: dy };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── Individual floating window ────────────────────────────────────────────────
interface FloatingWindowProps {
  panelId: string;
  def: PanelDef;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
}

function FloatingWindow({ panelId, def, zIndex, onClose, onFocus }: FloatingWindowProps) {
  const cfg = PANEL_REGISTRY[panelId];
  const W = cfg?.w ?? 360;
  const H = cfg?.h ?? 320;
  const fallX = 60 + (zIndex % 8) * 45;
  const fallY = 60 + (zIndex % 5) * 35;

  const [pos, setPos] = useState(() => getSavedPos(panelId, fallX, fallY));
  const [minimized, setMinimized] = useState(false);
  const [hov, setHov] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const posRef = useRef(pos);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onFocus();
    const startX = e.clientX, startY = e.clientY;
    const startPX = posRef.current.x, startPY = posRef.current.y;
    function onMove(ev: MouseEvent) {
      const nx = clamp(startPX + ev.clientX - startX, 0, window.innerWidth - W);
      const ny = clamp(startPY + ev.clientY - startY, 0, window.innerHeight - 60);
      posRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
    }
    function onUp() {
      localStorage.setItem(`fp-hub-${panelId}-v2`, JSON.stringify(posRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelId, W, onFocus]);

  function onMouseMove(e: React.MouseEvent) {
    if (!panelRef.current || minimized) return;
    const r = panelRef.current.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 12,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -12,
    });
  }

  const Icon = def.icon;
  const Content = cfg?.component;

  return createPortal(
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.82, y: 24 }}
      animate={{
        opacity: 1, scale: 1, y: 0,
        rotateX: hov && !minimized ? tilt.y : 0,
        rotateY: hov && !minimized ? tilt.x : 0,
        boxShadow: hov
          ? `0 28px 90px rgba(0,0,0,0.96), 0 0 50px ${def.glow}, 0 0 0 1px ${def.color}45`
          : `0 10px 50px rgba(0,0,0,0.92), 0 0 24px ${def.glow}70, 0 0 0 1px ${def.color}28`,
      }}
      exit={{ opacity: 0, scale: 0.78, y: 18 }}
      transition={{ type: "spring", damping: 24, stiffness: 220 }}
      onClick={onFocus}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={onMouseMove}
      style={{
        position: "fixed", left: pos.x, top: pos.y,
        width: minimized ? "240px" : `${W}px`,
        zIndex: 9000 + zIndex,
        transformStyle: "preserve-3d", perspective: "900px",
        userSelect: "none", pointerEvents: "all",
      }}
    >
      {/* ── Shell ──────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg, rgba(4,8,20,0.99) 0%, rgba(5,9,20,0.99) 55%, rgba(3,6,15,0.99) 100%)",
        border: `1px solid ${def.color}32`,
        borderRadius: "16px",
        overflow: "hidden",
        backdropFilter: "blur(36px)",
        WebkitBackdropFilter: "blur(36px)",
      }}>

        {/* ── Top accent bar ─────────────────────────────────── */}
        <motion.div animate={{ scaleX: hov ? 1 : 0.55, opacity: hov ? 1 : 0.65 }}
          transition={{ duration: 0.3 }}
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${def.color}88, ${def.color}, ${def.color}88, transparent)`,
            transformOrigin: "center",
          }}
        />

        {/* ── HUD corner brackets ────────────────────────────── */}
        {(["tl","tr","bl","br"] as const).map(c => (
          <div key={c} className="absolute pointer-events-none" style={{
            top: c.includes("t") ? 5 : undefined,
            bottom: c.includes("b") ? 5 : undefined,
            left: c.includes("l") ? 5 : undefined,
            right: c.includes("r") ? 5 : undefined,
            width: 10, height: 10,
            borderTop: c.includes("t") ? `1px solid ${def.color}45` : undefined,
            borderBottom: c.includes("b") ? `1px solid ${def.color}45` : undefined,
            borderLeft: c.includes("l") ? `1px solid ${def.color}45` : undefined,
            borderRight: c.includes("r") ? `1px solid ${def.color}45` : undefined,
          }} />
        ))}

        {/* ── Title / drag bar ───────────────────────────────── */}
        <div onMouseDown={startDrag} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px",
          borderBottom: minimized ? "none" : `1px solid ${def.color}10`,
          background: `linear-gradient(90deg, ${def.color}12, transparent 70%)`,
          cursor: "grab",
        }}>
          <GripHorizontal style={{ width: "10px", height: "10px", color: `${def.color}55`, flexShrink: 0 }} />
          <motion.div
            animate={{ filter: [`drop-shadow(0 0 2px ${def.color})`, `drop-shadow(0 0 8px ${def.color})`, `drop-shadow(0 0 2px ${def.color})`] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <Icon style={{ width: "11px", height: "11px", color: def.color, flexShrink: 0 }} />
          </motion.div>

          <div className="flex flex-col flex-1 min-w-0 leading-none">
            <span className="font-mono font-black text-[5.5px] tracking-[0.5em]"
              style={{ color: `${def.color}50` }}>KALIGPT · PANEL</span>
            <span className="font-mono font-black text-[8px] tracking-widest truncate uppercase"
              style={{ color: `${def.color}cc` }}>{def.label}</span>
          </div>

          <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            animate={{ opacity: [1, 0.25, 1], scale: [1, 0.75, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ background: def.color, boxShadow: `0 0 6px ${def.color}` }}
          />

          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <button onClick={e => { e.stopPropagation(); setMinimized(v => !v); }}
              style={{
                width: "18px", height: "18px", borderRadius: "5px", cursor: "pointer",
                background: minimized ? `${def.color}20` : "rgba(255,255,255,0.04)",
                border: `1px solid ${def.color}22`,
                color: "rgba(255,255,255,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${def.color}28`)}
              onMouseLeave={e => (e.currentTarget.style.background = minimized ? `${def.color}20` : "rgba(255,255,255,0.04)")}
            >
              {minimized ? <Maximize2 style={{ width: "8px", height: "8px" }} /> : <Minus style={{ width: "8px", height: "8px" }} />}
            </button>
            <button onClick={e => { e.stopPropagation(); onClose(); }}
              style={{
                width: "18px", height: "18px", borderRadius: "5px", cursor: "pointer",
                background: "rgba(226,18,39,0.07)",
                border: "1px solid rgba(226,18,39,0.22)",
                color: "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(226,18,39,0.24)"; e.currentTarget.style.color = "#e21227"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(226,18,39,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <X style={{ width: "8px", height: "8px" }} />
            </button>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <AnimatePresence>
          {!minimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${H}px`, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ height: `${H}px`, overflow: "auto", pointerEvents: "all",
                scrollbarWidth: "thin",
                scrollbarColor: `${def.color}30 transparent`,
              }}>
                {Content ? (
                  <Suspense fallback={
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <motion.span className="font-mono text-[10px] tracking-widest"
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ color: def.color }}>
                        LOADING…
                      </motion.span>
                    </div>
                  }>
                    <Content />
                  </Suspense>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                    Panel not available
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom accent ──────────────────────────────────── */}
        <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${def.color}18, transparent)` }} />
      </div>
    </motion.div>,
    document.body
  );
}

// ── ChatFloatingPanelHub — public export ─────────────────────────────────────
interface ChatFloatingPanelHubProps {
  openPanels: Set<string>;
  onClose: (id: string) => void;
}

export function ChatFloatingPanelHub({ openPanels, onClose }: ChatFloatingPanelHubProps) {
  const [focusOrder, setFocusOrder] = useState<string[]>([]);

  const focusPanel = useCallback((id: string) => {
    setFocusOrder(prev => [...prev.filter(x => x !== id), id]);
  }, []);

  return (
    <AnimatePresence>
      {Array.from(openPanels).map(id => {
        const def = PANEL_DEFS.find(p => p.id === id);
        if (!def) return null;
        const zIdx = focusOrder.includes(id)
          ? focusOrder.indexOf(id)
          : Array.from(openPanels).indexOf(id);
        return (
          <FloatingWindow
            key={id}
            panelId={id}
            def={def}
            zIndex={zIdx}
            onClose={() => onClose(id)}
            onFocus={() => focusPanel(id)}
          />
        );
      })}
    </AnimatePresence>
  );
}
