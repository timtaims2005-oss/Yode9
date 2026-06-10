import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Network, Activity, Package, BarChart3, X, Monitor,
  Layers, Radar, Wifi, Cpu, Shield, Maximize2,
  ChevronLeft, LayoutGrid, Thermometer, Clock, Zap,
} from "lucide-react";
import { CyberGlobeWidget }       from "./CyberGlobeWidget";
import { InteractiveGlobeWidget } from "./InteractiveGlobeWidget";
import { NetworkTopologyWidget }  from "./NetworkTopologyWidget";
import { NetworkTrafficPanel }    from "./NetworkTrafficPanel";
import { NetworkPacketInspector } from "./NetworkPacketInspector";
import { ModelBenchmarkPanel }    from "./ModelBenchmarkPanel";
import { SysMonitorWidget }       from "./SysMonitorWidget";
import { IdleWidget }             from "./IdleWidget";

/* ══════════════════════════════════════════════════════════════════════
   CYBER WIDGETS DOCK  v3  — ULTRA 3D FUTURISTIC
   ▸ Live canvas orb button with radar + neural particles + DNA helix
   ▸ 8-panel holographic HUD — 4×2 grid with deep 3D glass panels
   ▸ Full-screen panel expand mode
   ▸ Drag-anywhere with position persistence
   ▸ Ctrl+Shift+H toggle · ESC close
══════════════════════════════════════════════════════════════════════ */

const DOCK_POS_KEY = "cyber-hud-dock-pos-v3";

const PANELS = [
  { id: "globe-threat", label: "GLOBAL THREAT MAP", icon: Globe,        color: "#e21227", desc: "Live attack origins"   },
  { id: "globe-map",    label: "GLOBAL MAP",         icon: Radar,        color: "#3b82f6", desc: "Interactive 3D globe"  },
  { id: "topology",     label: "NET TOPOLOGY",        icon: Network,      color: "#a855f7", desc: "3D network graph"      },
  { id: "traffic",      label: "TRAFFIC ANALYZER",   icon: Activity,     color: "#22c55e", desc: "Real-time API calls"   },
  { id: "packets",      label: "PACKET INSPECTOR",   icon: Package,      color: "#f59e0b", desc: "Wireshark-style HUD"   },
  { id: "benchmark",    label: "MODEL BENCHMARK",    icon: BarChart3,    color: "#06b6d4", desc: "LLM leaderboard"       },
  { id: "sysmon",       label: "SYS MONITOR",         icon: Thermometer,  color: "#10b981", desc: "System resources"      },
  { id: "idle",         label: "IDLE / ACTIVITY",     icon: Clock,        color: "#f472b6", desc: "Session tracker"       },
];

/* ── Position helpers ────────────────────────────────────────────── */
function getInitialPos(): { x: number; y: number } {
  try {
    const s = localStorage.getItem(DOCK_POS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    x: typeof window !== "undefined" ? window.innerWidth  - 90 : 900,
    y: typeof window !== "undefined" ? window.innerHeight - 90 : 600,
  };
}

/* ── Corner brackets ─────────────────────────────────────────────── */
function Brackets({ color, size = 16, thickness = 1.5 }: { color: string; size?: number; thickness?: number }) {
  const s = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute", width: size, height: size,
    border: `${thickness}px solid ${color}50`,
    ...pos, pointerEvents: "none",
  });
  return (
    <>
      <div style={s({ top: 0, left: 0,  borderRight: "none", borderBottom: "none" })} />
      <div style={s({ top: 0, right: 0, borderLeft:  "none", borderBottom: "none" })} />
      <div style={s({ bottom: 0, left: 0,  borderRight: "none", borderTop: "none" })} />
      <div style={s({ bottom: 0, right: 0, borderLeft:  "none", borderTop: "none" })} />
    </>
  );
}

/* ── Holographic shimmer ─────────────────────────────────────────── */
function HoloShimmer({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, borderRadius: "inherit",
        background: `linear-gradient(108deg, transparent 35%, ${color}18 50%, transparent 65%)`,
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   LIVE CANVAS ORB  —  The 3D floating button
══════════════════════════════════════════════════════════════════ */
function LiveOrbCanvas({ color, hovered }: { color: string; hovered: boolean }) {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 80; cv.width = S; cv.height = S;
    const CX = S / 2, CY = S / 2, R = S / 2 - 2;

    // Neural nodes on orb surface
    const nodes = Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      const ro = R * (0.35 + Math.random() * 0.45);
      return {
        x: CX + Math.cos(angle) * ro,
        y: CY + Math.sin(angle) * ro,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.5,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // Radar sector data
    const radarData = Array.from({ length: 64 }, () => Math.random() * 0.7 + 0.15);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.016);
      ctx.clearRect(0, 0, S, S);

      /* ── Clip to circle ── */
      ctx.save();
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();

      /* 1. Deep black glass background */
      const bg = ctx.createRadialGradient(CX - 10, CY - 12, 0, CX, CY, R);
      bg.addColorStop(0, "rgba(12,12,26,1)");
      bg.addColorStop(0.55, "rgba(4,4,14,1)");
      bg.addColorStop(1, "rgba(0,0,6,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S);

      /* 2. Color nebula glow core */
      const nebula = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 0.7);
      nebula.addColorStop(0, color + "22");
      nebula.addColorStop(0.5, color + "08");
      nebula.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nebula; ctx.fillRect(0, 0, S, S);

      /* 3. Rotating radar sweep */
      const sweepAngle = t * 1.2;
      const ctxAny = ctx as any;
      const sweepGrad = typeof ctxAny.createConicGradient === "function"
        ? ctxAny.createConicGradient(sweepAngle, CX, CY)
        : null;
      if (sweepGrad) {
        sweepGrad.addColorStop(0, color + "00");
        sweepGrad.addColorStop(0.08, color + "55");
        sweepGrad.addColorStop(0.18, color + "18");
        sweepGrad.addColorStop(0.19, color + "00");
        sweepGrad.addColorStop(1, color + "00");
        ctx.fillStyle = sweepGrad;
        ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();
      } else {
        // fallback: manual sweep wedge
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(sweepAngle);
        const wg = ctx.createLinearGradient(0, 0, R, 0);
        wg.addColorStop(0, color + "55"); wg.addColorStop(1, color + "00");
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, -0.25, 0.25);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      /* 4. Polar grid rings */
      [0.28, 0.5, 0.72, 0.92].forEach((frac, i) => {
        ctx.beginPath();
        ctx.arc(CX, CY, R * frac, 0, Math.PI * 2);
        ctx.strokeStyle = i === 3 ? color + "30" : "rgba(255,255,255,0.045)";
        ctx.lineWidth = i === 3 ? 0.8 : 0.5;
        ctx.stroke();
      });

      /* 5. Radar spoke lines */
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
        ctx.strokeStyle = "rgba(255,255,255,0.025)";
        ctx.lineWidth = 0.4; ctx.stroke();
      }

      /* 6. Radar waveform ring */
      ctx.beginPath();
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2 - Math.PI / 2;
        const pulse = radarData[i] + Math.sin(t * 2.5 + i * 0.35) * 0.12;
        const rad = R * 0.68 * pulse + R * 0.04;
        const x = CX + Math.cos(a) * rad;
        const y = CY + Math.sin(a) * rad;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color + "88"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = color + "08"; ctx.fill();

      /* 7. Neural network nodes */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        const dx = n.x - CX, dy = n.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > R * 0.85) { n.vx = -n.vx * 0.8; n.vy = -n.vy * 0.8; }
        const alpha = 0.4 + Math.sin(t * 1.8 + n.phase) * 0.3;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.85; ctx.fill();
        ctx.globalAlpha = 1;
      });

      /* 8. Neural connections */
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 22) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = color + Math.round((1 - d / 22) * 40).toString(16).padStart(2, "0");
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });

      /* 9. Top-glass highlight sheen */
      const sheen = ctx.createLinearGradient(CX - R, CY - R, CX + R * 0.3, CY);
      sheen.addColorStop(0, "rgba(255,255,255,0.11)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.05)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.ellipse(CX - 2, CY - 6, R * 0.62, R * 0.28, -0.35, 0, Math.PI * 2);
      ctx.fill();

      /* 10. Hover color overlay */
      if (hovered) {
        ctx.fillStyle = color + "15";
        ctx.fillRect(0, 0, S, S);
      }

      ctx.restore();

      /* 11. Outer glow ring — outside clip */
      if (hovered) {
        ctx.beginPath(); ctx.arc(CX, CY, R + 2, 0, Math.PI * 2);
        ctx.strokeStyle = color + "60"; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, hovered]);

  return (
    <canvas
      ref={cvRef}
      width={80} height={80}
      style={{ width: "80px", height: "80px", borderRadius: "50%", display: "block", pointerEvents: "none" }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   DOCK BUTTON  — draggable, live orb
══════════════════════════════════════════════════════════════════ */
function DockButton({ onClick }: { onClick: () => void }) {
  const [pos,      setPos]      = useState(getInitialPos);
  const [hovered,  setHovered]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tick,     setTick]     = useState(0);
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 });
  const posRef  = useRef(pos);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, moved: false });
  const btnRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1400);
    return () => clearInterval(id);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = e.clientX; d.sy = e.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - d.sx; const dy = ev.clientY - d.sy;
      if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const nx = Math.max(4, Math.min(window.innerWidth - 84, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 84, d.spy + dy));
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onUp() {
      d.active = false; setDragging(false);
      localStorage.setItem(DOCK_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = touch.clientX; d.sy = touch.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: TouchEvent) {
      const tt = ev.touches[0];
      const dx = tt.clientX - d.sx; const dy = tt.clientY - d.sy;
      if (!d.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) { d.moved = true; setDragging(true); }
      if (d.moved) {
        const nx = Math.max(4, Math.min(window.innerWidth - 84, d.spx + dx));
        const ny = Math.max(4, Math.min(window.innerHeight - 84, d.spy + dy));
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onEnd() {
      d.active = false; setDragging(false);
      localStorage.setItem(DOCK_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  const handleClick = useCallback(() => {
    if (!dragRef.current.moved) onClick();
  }, [onClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 22,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -22,
    });
  }, []);

  const ac = PANELS[tick % PANELS.length].color;
  const ac2 = PANELS[(tick + 3) % PANELS.length].color;

  return (
    <div
      ref={btnRef}
      style={{
        position: "fixed", left: pos.x, top: pos.y, zIndex: 95,
        cursor: dragging ? "grabbing" : "grab", userSelect: "none",
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -180 }}
        animate={{
          scale: 1, opacity: 1, rotate: 0,
          rotateX: tilt.y, rotateY: tilt.x,
        }}
        transition={{ delay: 0.8, type: "spring", damping: 16, stiffness: 180 }}
        whileTap={!dragging ? { scale: 0.9 } : {}}
        style={{
          width: "80px", height: "80px",
          position: "relative",
          transformStyle: "preserve-3d",
          perspective: "400px",
        }}
      >
        {/* ── Outer neon glow rings ── */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: `${-(i * 8 + 6)}px`,
              borderRadius: "50%",
              border: `${1.5 - i * 0.3}px solid ${i === 0 ? ac : i === 1 ? ac2 : "rgba(255,255,255,0.06)"}`,
              pointerEvents: "none",
            }}
            animate={{
              opacity: i === 0 ? [0.8, 0.15, 0.8] : i === 1 ? [0.4, 0, 0.4] : [0.15, 0, 0.15],
              scale:   i === 0 ? [1, 1.25, 1] : [1, 1.4, 1],
            }}
            transition={{ duration: 2.4 + i * 0.8, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
          />
        ))}

        {/* ── Orbit rings ── */}
        {[
          { r: 10, speed: 7,  color: ac + "45",             w: 1   },
          { r: 18, speed: 14, color: "rgba(255,255,255,0.1)", w: 0.7 },
          { r: 26, speed: 22, color: ac2 + "25",             w: 0.8 },
        ].map((ring, i) => (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              inset: -ring.r,
              borderRadius: "50%",
              border: `${ring.w}px dashed ${ring.color}`,
              pointerEvents: "none",
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: ring.speed, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* ── Orbit particle on ring 1 ── */}
        <motion.div
          style={{
            position: "absolute",
            inset: -10, borderRadius: "50%",
            pointerEvents: "none",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        >
          <div style={{
            position: "absolute", top: "50%", right: -3,
            width: "5px", height: "5px", borderRadius: "50%",
            background: ac, boxShadow: `0 0 8px ${ac}, 0 0 20px ${ac}80`,
            transform: "translateY(-50%)",
          }} />
        </motion.div>

        {/* ── Live Canvas Orb ── */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
          boxShadow: hovered
            ? `0 0 0 2px ${ac}70, 0 0 60px ${ac}55, 0 0 120px ${ac}20, 0 20px 60px rgba(0,0,0,0.9)`
            : `0 0 0 1.5px ${ac}40, 0 0 30px ${ac}30, 0 8px 40px rgba(0,0,0,0.8)`,
          transition: "box-shadow 0.4s ease",
        }}>
          <LiveOrbCanvas color={ac} hovered={hovered} />
        </div>

        {/* ── Central HUD label overlay ── */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 3,
          gap: "2px",
        }}>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Monitor style={{ width: "18px", height: "18px", color: "#fff", filter: `drop-shadow(0 0 8px ${ac}) drop-shadow(0 0 16px ${ac}88)` }} />
          </motion.div>
          <span style={{
            fontSize: "6.5px", fontFamily: "monospace", fontWeight: 900,
            color: "#fff", letterSpacing: "2px",
            textShadow: `0 0 12px ${ac}, 0 0 24px ${ac}`,
          }}>HUD</span>
        </div>

        {/* ── Top-right badge ── */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{
            position: "absolute", top: "-5px", right: "-5px",
            width: "20px", height: "20px", borderRadius: "50%",
            background: `radial-gradient(circle, ${ac}, ${ac}aa)`,
            border: "2px solid rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "7px", fontFamily: "monospace", fontWeight: 900, color: "#000",
            boxShadow: `0 0 12px ${ac}cc`,
            zIndex: 5,
          }}
        >8</motion.div>

        {/* ── Bottom status bar ── */}
        <motion.div
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "3px", zIndex: 4, pointerEvents: "none",
          }}
        >
          {[ac, ac2, "#22c55e"].map((c, i) => (
            <motion.div key={i}
              animate={{ scaleY: [0.4, 1, 0.6, 0.8, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              style={{ width: "2px", height: "8px", borderRadius: "1px", background: c, boxShadow: `0 0 4px ${c}` }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {hovered && !dragging && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.88 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute", right: "92px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(3,3,12,0.97)",
              border: `1px solid ${ac}45`,
              borderRadius: "12px", padding: "10px 16px",
              whiteSpace: "nowrap", backdropFilter: "blur(24px)",
              boxShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 20px ${ac}18`,
              pointerEvents: "none",
            }}
          >
            {/* Tooltip top accent */}
            <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${ac}, transparent)`, marginBottom: "8px" }} />
            <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px" }}>CYBER HUD</div>
            <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: "2px" }}>
              8 INTELLIGENCE PANELS · LIVE
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "7px" }}>
              {PANELS.slice(0, 8).map(p => (
                <motion.div key={p.id}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: Math.random() }}
                  style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.color, boxShadow: `0 0 5px ${p.color}` }}
                />
              ))}
            </div>
            {/* Tooltip bottom corner brackets */}
            <div style={{ position: "absolute", top: 4, left: 4, width: 6, height: 6, borderTop: `1px solid ${ac}50`, borderLeft: `1px solid ${ac}50` }} />
            <div style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, borderBottom: `1px solid ${ac}50`, borderRight: `1px solid ${ac}50` }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WIDGET CARD  — deep 3D glass card with tilt + shimmer
══════════════════════════════════════════════════════════════════ */
function WidgetCard({
  id, label, icon: Icon, color, desc, onExpand, children,
}: {
  id: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string; desc: string;
  onExpand: () => void; children: React.ReactNode;
}) {
  const [tilt, setTilt]   = useState({ x: 0, y: 0 });
  const [hov,  setHov]    = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 16,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -16,
    });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHov(false); }}
      onMouseEnter={() => setHov(true)}
      animate={{
        rotateX: tilt.y, rotateY: tilt.x,
        boxShadow: hov
          ? `0 8px 48px rgba(0,0,0,0.9), 0 0 0 1px ${color}40, 0 0 40px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)`
          : `0 3px 20px rgba(0,0,0,0.7), 0 0 0 1px ${color}15, 0 0 10px ${color}08`,
      }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      style={{
        perspective: "800px",
        position: "relative", borderRadius: "14px", overflow: "hidden",
        border: `1px solid ${hov ? color + "40" : color + "18"}`,
        background: `linear-gradient(148deg, rgba(6,6,16,0.99) 0%, rgba(10,8,22,0.98) 60%, rgba(4,8,18,0.99) 100%)`,
        display: "flex", flexDirection: "column",
        transformStyle: "preserve-3d",
        transition: "border-color 0.3s",
        minHeight: 0,
      }}
    >
      {/* Holographic shimmer */}
      {hov && <HoloShimmer color={color} />}

      {/* Top accent bar */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0.55, scaleX: hov ? 1 : 0.65 }}
        style={{
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${color}dd, ${color}, transparent)`,
          flexShrink: 0, transformOrigin: "center",
        }}
      />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "6px 9px",
        borderBottom: `1px solid ${color}10`,
        background: `linear-gradient(90deg, ${color}10, transparent)`,
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        <motion.div animate={{ filter: hov ? `drop-shadow(0 0 10px ${color})` : `drop-shadow(0 0 4px ${color}88)` }}>
          <Icon style={{ width: "11px", height: "11px", color, flexShrink: 0 }} />
        </motion.div>
        <span style={{
          fontSize: "8px", fontFamily: "monospace", fontWeight: 900,
          color, letterSpacing: "1.8px", flex: 1,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textShadow: hov ? `0 0 10px ${color}` : "none",
          transition: "text-shadow 0.3s",
        }}>{label}</span>
        <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)", letterSpacing: "0.3px", marginRight: "3px" }}>{desc}</span>

        {/* Live indicator */}
        <motion.div
          animate={{ opacity: [1, 0.2, 1], scale: [1, 0.75, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}
        />

        {/* Expand button */}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          title="Expand"
          style={{
            width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
            background: `${color}12`, border: `1px solid ${color}22`,
            color: "rgba(255,255,255,0.35)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}28`; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 10px ${color}50`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}12`; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
        >
          <Maximize2 style={{ width: "8px", height: "8px" }} />
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        {children}
      </div>

      {/* Corner brackets */}
      <Brackets color={color} size={12} thickness={1.2} />
    </motion.div>
  );
}

/* ── Widget renderer ─────────────────────────────────────────────── */
function RenderWidget({ id, full = false }: { id: string; full?: boolean }) {
  const e = !full;
  switch (id) {
    case "globe-threat": return <CyberGlobeWidget       embedded={e} />;
    case "globe-map":    return <InteractiveGlobeWidget embedded={e} />;
    case "topology":     return <NetworkTopologyWidget  embedded={e} />;
    case "traffic":      return <NetworkTrafficPanel    embedded={e} />;
    case "packets":      return <NetworkPacketInspector embedded={e} />;
    case "benchmark":    return <ModelBenchmarkPanel    embedded={e} />;
    case "sysmon":       return <SysMonitorWidget       embedded={e} />;
    case "idle":         return <IdleWidget             embedded={e} />;
    default: return null;
  }
}

/* ══════════════════════════════════════════════════════════════════
   HUD BACKGROUND  — full-screen 3D canvas scene
══════════════════════════════════════════════════════════════════ */
function HUDBackground() {
  const cvRef   = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tkRef   = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W; cv.height = H;
    const cvEl = cv;
    function resize() {
      W = cvEl.offsetWidth; H = cvEl.offsetHeight;
      cvEl.width = W; cvEl.height = H;
    }
    window.addEventListener("resize", resize);

    // Particles
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.3 + 0.3,
      color: ["#00e5ff", "#e21227", "#a855f7", "#22c55e", "#f59e0b", "#f472b6"][Math.floor(Math.random() * 6)],
    }));

    // DNA helix params
    const helixCols = 2;

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = (tkRef.current += 0.014);
      ctx.clearRect(0, 0, W, H);

      /* 1. Deep radial bg */
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
      bg.addColorStop(0, "rgba(5,4,18,1)");
      bg.addColorStop(0.5, "rgba(2,2,10,1)");
      bg.addColorStop(1, "rgba(0,0,5,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      /* 2. Corner accent glows */
      const corners = [
        { x: 0,   y: 0,   c: "rgba(226,18,39,0.06)" },
        { x: W,   y: 0,   c: "rgba(59,130,246,0.04)" },
        { x: 0,   y: H,   c: "rgba(168,85,247,0.04)" },
        { x: W,   y: H,   c: "rgba(34,197,94,0.04)"  },
      ];
      corners.forEach(({ x, y, c }) => {
        const cg = ctx.createRadialGradient(x, y, 0, x, y, W * 0.55);
        cg.addColorStop(0, c); cg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
      });

      /* 3. Scrolling perspective grid */
      const vp = { x: W * 0.5, y: H * 0.42 };
      const gScroll = (t * 22) % (H / 14);
      ctx.save();
      // Vertical perspective lines
      for (let i = -16; i <= 16; i++) {
        const t2 = (i + 16) / 32;
        const center = Math.abs(i) / 16;
        const alpha = 0.04 - center * 0.028;
        const gx = W * t2;
        ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
        ctx.lineWidth = i % 4 === 0 ? 0.7 : 0.35;
        ctx.beginPath(); ctx.moveTo(gx, H); ctx.lineTo(vp.x, vp.y); ctx.stroke();
      }
      // Horizontal scrolling lines
      for (let j = -2; j <= 18; j++) {
        const gy = vp.y + gScroll + (j / 16) * (H - vp.y);
        if (gy < vp.y || gy > H + 2) continue;
        const frac = (gy - vp.y) / (H - vp.y);
        const alpha = frac * 0.09;
        const halfW2 = frac * (W * 0.52);
        ctx.strokeStyle = j % 4 === 0 ? `rgba(59,130,246,${alpha * 0.7})` : `rgba(0,229,255,${alpha})`;
        ctx.lineWidth = j % 4 === 0 ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(vp.x - halfW2, gy); ctx.lineTo(vp.x + halfW2, gy); ctx.stroke();
      }
      ctx.restore();

      /* 4. Vanishing point glow */
      const vpg = ctx.createRadialGradient(vp.x, vp.y, 0, vp.x, vp.y, 160);
      vpg.addColorStop(0, "rgba(226,18,39,0.14)");
      vpg.addColorStop(0.4, "rgba(226,18,39,0.04)");
      vpg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vpg; ctx.fillRect(vp.x - 160, vp.y - 100, 320, 220);

      /* 5. DNA helix columns */
      for (let col = 0; col < helixCols; col++) {
        const hx = col === 0 ? W * 0.06 : W * 0.94;
        const amp = 12;
        const freq = 0.045;
        const nodeCount = 28;
        for (let j = 0; j < nodeCount; j++) {
          const fy = (j / nodeCount) * H;
          const phase1 = fy * freq + t * 1.2;
          const phase2 = fy * freq + t * 1.2 + Math.PI;
          const x1 = hx + Math.cos(phase1) * amp;
          const x2 = hx + Math.cos(phase2) * amp;
          const y1 = fy, y2 = fy;
          // Backbone line
          if (j > 0) {
            const pp1 = ((j - 1) / nodeCount) * H;
            const pa1 = pp1 * freq + t * 1.2;
            const pa2 = pp1 * freq + t * 1.2 + Math.PI;
            ctx.strokeStyle = "rgba(226,18,39,0.2)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(hx + Math.cos(pa1) * amp, pp1);
            ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = "rgba(0,229,255,0.2)";
            ctx.beginPath();
            ctx.moveTo(hx + Math.cos(pa2) * amp, pp1);
            ctx.lineTo(x2, y2); ctx.stroke();
          }
          // Rung
          if (j % 3 === 0) {
            ctx.strokeStyle = "rgba(168,85,247,0.18)";
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
          // Nodes
          const alpha = 0.55 + Math.sin(phase1 * 2) * 0.3;
          ctx.beginPath(); ctx.arc(x1, y1, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(226,18,39,${alpha})`; ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,229,255,${alpha})`; ctx.fill();
        }
      }

      /* 6. Particles with neural connections */
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.35; ctx.fill();
      });
      pts.forEach((a, i) => {
        pts.slice(i + 1, i + 6).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = (1 - d / 80) * 0.12;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;

      /* 7. Horizontal scan sweep */
      const scanY = (t * 55) % H;
      const sg = ctx.createLinearGradient(0, scanY - 8, 0, scanY + 8);
      sg.addColorStop(0, "rgba(0,229,255,0)");
      sg.addColorStop(0.4, "rgba(0,229,255,0.035)");
      sg.addColorStop(0.5, "rgba(0,229,255,0.05)");
      sg.addColorStop(0.6, "rgba(0,229,255,0.035)");
      sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 8, W, 16);

      /* 8. Hex grid overlay top portion */
      ctx.save(); ctx.globalAlpha = 0.025; ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 0.5;
      const hexR = 28; const hexH2 = hexR * Math.sqrt(3);
      for (let hxi = -hexR; hxi < W + hexR; hxi += hexR * 3) {
        for (let hyi = -hexH2; hyi < H * 0.35; hyi += hexH2) {
          for (let k = 0; k < 6; k++) {
            const a1 = (k / 6) * Math.PI * 2 - Math.PI / 6;
            const a2 = ((k + 1) / 6) * Math.PI * 2 - Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(hxi + Math.cos(a1) * hexR, hyi + Math.sin(a1) * hexR);
            ctx.lineTo(hxi + Math.cos(a2) * hexR, hyi + Math.sin(a2) * hexR);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    frame();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={cvRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
  );
}

/* ══════════════════════════════════════════════════════════════════
   LIVE CLOCK  — monospace HUD clock
══════════════════════════════════════════════════════════════════ */
function HUDClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-US", { hour12: false }));
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date().toLocaleTimeString("en-US", { hour12: false })), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(0,229,255,0.6)", letterSpacing: "1.5px" }}>
      {time}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN HUD OVERLAY
══════════════════════════════════════════════════════════════════ */
function CyberHUDOverlay({ onClose }: { onClose: () => void }) {
  const [loaded,       setLoaded]       = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const [focusAnim,    setFocusAnim]    = useState(false);

  useEffect(() => { const tt = setTimeout(() => setLoaded(true), 80); return () => clearTimeout(tt); }, []);

  const handleExpand = useCallback((id: string) => {
    setFocusAnim(false);
    setFocusedPanel(id);
    setTimeout(() => setFocusAnim(true), 30);
  }, []);

  const handleBack = useCallback(() => {
    setFocusAnim(false);
    setTimeout(() => setFocusedPanel(null), 160);
  }, []);

  const focusedMeta = focusedPanel ? PANELS.find(p => p.id === focusedPanel)! : null;

  const wrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <HUDBackground />

      {/* CRT scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }} />

      {children}
    </motion.div>
  );

  /* ── FOCUSED single-panel view ── */
  if (focusedPanel && focusedMeta) {
    const { color, icon: Icon, label, desc } = focusedMeta;
    return wrapper(
      <>
        <div style={{
          position: "relative", zIndex: 10,
          display: "flex", alignItems: "center", gap: "12px",
          padding: "11px 18px",
          borderBottom: `1px solid ${color}22`,
          background: "rgba(3,3,12,0.88)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}>
          {/* Top accent line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />

          <motion.button
            onClick={handleBack}
            whileHover={{ x: -3, scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "8px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(255,255,255,0.55)", cursor: "pointer",
              fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px",
            }}
          >
            <ChevronLeft style={{ width: "11px", height: "11px" }} />
            BACK TO HUD
          </motion.button>

          <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.07)" }} />

          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: `radial-gradient(circle, ${color}20, rgba(0,0,0,0.8))`,
            border: `1px solid ${color}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            <Icon style={{ width: "16px", height: "16px", color, filter: `drop-shadow(0 0 8px ${color})` }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px", textShadow: `0 0 16px ${color}80` }}>{label}</span>
              <motion.div animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            </div>
            <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>{desc} · FULL SCREEN MODE</div>
          </div>

          <div style={{ flex: 1 }} />

          <HUDClock />

          <button
            onClick={handleBack}
            style={{
              padding: "4px 10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "8.5px", fontFamily: "monospace",
            }}
          >
            <LayoutGrid style={{ width: "9px", height: "9px" }} />
            ALL PANELS
          </button>

          <button
            onClick={onClose}
            style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.22)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: focusAnim ? 1 : 0, scale: focusAnim ? 1 : 0.97, y: focusAnim ? 0 : 12 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "relative", zIndex: 5, flex: 1,
            margin: "10px", borderRadius: "16px", overflow: "hidden",
            border: `1px solid ${color}28`,
            boxShadow: `0 0 80px ${color}18, 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}
        >
          <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${color}dd, ${color}, transparent)`, flexShrink: 0 }} />
          <div style={{ flex: 1, height: "calc(100% - 2px)", overflow: "hidden" }}>
            <RenderWidget id={focusedPanel} full={false} />
          </div>
          <Brackets color={color} size={20} thickness={1.8} />
        </motion.div>
      </>
    );
  }

  /* ── 8-panel grid view ── */
  return wrapper(
    <>
      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "12px",
        padding: "11px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        background: "rgba(3,3,12,0.88)",
        backdropFilter: "blur(24px)",
        flexShrink: 0,
      }}>
        {/* Header top neon line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.5), rgba(0,229,255,0.3), rgba(226,18,39,0.5), transparent)" }} />

        {/* Logo */}
        <motion.div
          animate={{ boxShadow: ["0 0 16px rgba(226,18,39,0.2)", "0 0 36px rgba(226,18,39,0.45)", "0 0 16px rgba(226,18,39,0.2)"] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          style={{
            width: "36px", height: "36px", borderRadius: "11px", flexShrink: 0,
            background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.28), rgba(59,130,246,0.15), rgba(0,0,0,0.9))",
            border: "1px solid rgba(226,18,39,0.38)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Layers style={{ width: "17px", height: "17px", color: "#e21227", filter: "drop-shadow(0 0 8px #e21227)" }} />
        </motion.div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3.5px", textShadow: "0 0 20px rgba(226,18,39,0.5)" }}>CYBER HUD</span>
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", letterSpacing: "1px", padding: "2px 8px", borderRadius: "4px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 0 8px rgba(34,197,94,0.2)" }}
            >LIVE</motion.span>
            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(0,229,255,0.4)", letterSpacing: "1px" }}>v3.0</span>
          </div>
          <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1.2px", marginTop: "2px" }}>
            8 INTELLIGENCE PANELS · REAL-TIME · 3D HOLOGRAPHIC
          </div>
        </div>

        {/* Panel dots */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {PANELS.map((p, i) => (
            <motion.button
              key={p.id} title={p.label}
              onClick={() => handleExpand(p.id)}
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.0, repeat: Infinity, delay: i * 0.22 }}
              whileHover={{ scale: 2.2 }}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, boxShadow: `0 0 7px ${p.color}`, cursor: "pointer", border: "none" }}
            />
          ))}
        </div>

        <HUDClock />

        <button
          onClick={onClose}
          style={{
            width: "34px", height: "34px", borderRadius: "9px",
            background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.22s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(226,18,39,0.4)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.07)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* ── 4×2 panel grid ── */}
      <div style={{
        position: "relative", zIndex: 5,
        flex: 1, display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: "8px", padding: "10px",
        overflow: "hidden",
      }}>
        {loaded && PANELS.map((panel, i) => (
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, y: 22, scale: 0.92, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ delay: i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <WidgetCard
              id={panel.id}
              label={panel.label}
              icon={panel.icon}
              color={panel.color}
              desc={panel.desc}
              onExpand={() => handleExpand(panel.id)}
            >
              <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
                <RenderWidget id={panel.id} />
              </div>
            </WidgetCard>
          </motion.div>
        ))}
      </div>

      {/* Footer status bar */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "18px",
        padding: "7px 18px",
        borderTop: "1px solid rgba(255,255,255,0.045)",
        background: "rgba(3,3,12,0.8)",
        backdropFilter: "blur(14px)",
        flexShrink: 0,
      }}>
        {[
          { icon: Wifi,    label: "FEEDS",    val: "8/8",    color: "#22c55e" },
          { icon: Cpu,     label: "LATENCY",  val: "12ms",   color: "#3b82f6" },
          { icon: Shield,  label: "THREATS",  val: "ACTIVE", color: "#e21227" },
          { icon: Monitor, label: "PANELS",   val: "8 LIVE", color: "#a855f7" },
          { icon: Zap,     label: "NEURAL",   val: "ONLINE", color: "#f59e0b" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8 + Math.random(), repeat: Infinity }}>
              <Icon style={{ width: "9px", height: "9px", color }} />
            </motion.div>
            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.8px" }}>{label}</span>
            <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 6px ${color}` }}>{val}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)", letterSpacing: "1px" }}>
          ESC · CTRL+SHIFT+H · CLICK ⊞ TO EXPAND
        </span>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PUBLIC EXPORT
══════════════════════════════════════════════════════════════════ */
export function CyberWidgetsDock() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault(); setOpen(v => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <DockButton onClick={() => setOpen(true)} />
      <AnimatePresence>
        {open && <CyberHUDOverlay onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
