import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, Cpu, Network, Terminal, Zap, Code2, Eye, Target, Server } from "lucide-react";
import { MatrixRain } from "./MatrixRain";
import { FuturisticBackground3D } from "./FuturisticBackground3D";
import { useStore } from "@/lib/store";


const BOOT_LINES = [
  "Initializing KaliGPT neural engine...",
  "Loading 105 council brains...",
  "Connecting to secure AI gateway...",
  "Calibrating red team protocols...",
  "Arsenal modules ready.",
  "SYSTEM ONLINE — AWAITING INPUT",
];

const QUICK_COMMANDS = [
  { icon: Target, label: "Recon Target", prompt: "نفّذ استطلاعاً كاملاً على الهدف: ", color: "#e21227" },
  { icon: Code2, label: "Exploit Code", prompt: "اكتب exploit لـ CVE-", color: "#a78bfa" },
  { icon: Eye, label: "OSINT Sweep", prompt: "ابحث عن معلومات OSINT عن: ", color: "#22c55e" },
  { icon: Shield, label: "Malware Analysis", prompt: "حلّل هذا الكود المشبوه: ", color: "#f59e0b" },
  { icon: Network, label: "Network Scan", prompt: "افحص الشبكة وحدد المنافذ المفتوحة لـ: ", color: "#00e5ff" },
  { icon: Terminal, label: "Shell Generator", prompt: "ولّد reverse shell لـ ", color: "#ff6b35" },
];

interface ChatEmptyStateProps {
  modelName: string;
  memoryCount?: number;
  onPrompt?: (text: string) => void;
  emptyText?: string;
}

// ── 3D Wireframe Threat Globe ─────────────────────────────────────────────────
function ThreatGlobe3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const rotRef    = useRef(0);

  type Arc = { lat1: number; lon1: number; lat2: number; lon2: number; t: number; speed: number; color: string };
  const arcsRef = useRef<Arc[]>([]);

  const spawnArc = useCallback(() => {
    const COLORS = ["#e21227","#ff4455","#00e5ff","#a78bfa","#f97316","#00ff88"];
    arcsRef.current.push({
      lat1: (Math.random() - 0.5) * Math.PI * 0.8,
      lon1: (Math.random() - 0.5) * Math.PI * 2,
      lat2: (Math.random() - 0.5) * Math.PI * 0.8,
      lon2: (Math.random() - 0.5) * Math.PI * 2,
      t: 0, speed: 0.006 + Math.random() * 0.008,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    if (arcsRef.current.length > 6) arcsRef.current.shift();
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 140;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = S * DPR; cv.height = S * DPR;
    cv.style.width = S + "px"; cv.style.height = S + "px";
    ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2, R = S * 0.42;

    const arcSpawn = setInterval(spawnArc, 900);
    spawnArc(); spawnArc();

    function project(lat: number, lon: number, rotY: number): [number, number, number] {
      const x = Math.cos(lat) * Math.sin(lon + rotY);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.cos(lon + rotY);
      return [cx + x * R, cy - y * R, z];
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      rotRef.current += 0.004;
      const rot = rotRef.current;
      ctx.clearRect(0, 0, S, S);

      // Globe wireframe
      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let lat = -80; lat <= 80; lat += 20) {
        const r = Math.cos(lat * Math.PI / 180) * R;
        const y2 = cy - Math.sin(lat * Math.PI / 180) * R;
        ctx.beginPath(); ctx.arc(cx, y2, r, 0, Math.PI * 2); ctx.stroke();
      }
      for (let lon = 0; lon < 360; lon += 30) {
        const angle = (lon * Math.PI / 180) + rot;
        ctx.beginPath();
        for (let lat2 = -80; lat2 <= 80; lat2 += 5) {
          const [px, py, pz] = project(lat2 * Math.PI / 180, 0, angle);
          if (pz > 0) { if (lat2 === -80) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        }
        ctx.stroke();
      }

      // Attack arcs
      arcsRef.current.forEach(arc => {
        arc.t = Math.min(arc.t + arc.speed, 1);
        const steps = 24;
        let first = true;
        ctx.beginPath();
        for (let i = 0; i <= steps * arc.t; i++) {
          const frac = i / steps;
          const lat = arc.lat1 + (arc.lat2 - arc.lat1) * frac;
          const lon = arc.lon1 + (arc.lon2 - arc.lon1) * frac;
          const [px, py, pz] = project(lat, lon, rot);
          if (pz > 0) { if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py); }
        }
        ctx.strokeStyle = arc.color + "cc";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Glow core
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6);
      g.addColorStop(0, "rgba(226,18,39,0.08)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    };
    draw();

    return () => { cancelAnimationFrame(rafRef.current); clearInterval(arcSpawn); };
  }, [spawnArc]);

  return <canvas ref={canvasRef} style={{ width: 140, height: 140 }} />;
}

// ── Mini local model toggle orb ────────────────────────────────────────────────
function LocalToggleOrb({ active, onClick }: { active: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true, desynchronized: true })!;
    const S = 48, DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = S * DPR; cv.height = S * DPR; ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2, R = S * 0.32;
    const [r, g, b] = active ? [34, 197, 94] : [239, 68, 68];

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, S, S);

      const pulse = 0.5 + Math.sin(t * (active ? 2.2 : 3.5)) * 0.35;
      const glow = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, S * 0.5);
      glow.addColorStop(0, `rgba(${r},${g},${b},${pulse * 0.6})`);
      glow.addColorStop(0.55, `rgba(${r},${g},${b},${pulse * 0.18})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // Rotating ring
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (active ? 0.8 : 2.2));
      ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, Math.PI * 1.4);
      ctx.strokeStyle = `rgba(${r},${g},${b},${active ? 0.55 : 0.3})`;
      ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();

      // Sphere
      const diff = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      diff.addColorStop(0, `rgba(${Math.min(r+90,255)},${Math.min(g+90,255)},${Math.min(b+90,255)},0.96)`);
      diff.addColorStop(0.5, `rgba(${r},${g},${b},0.88)`);
      diff.addColorStop(1, `rgba(${Math.round(r*0.2)},${Math.round(g*0.2)},${Math.round(b*0.2)},0.72)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(2,6,4,0.9)`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // Specular
      const spec = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, 0, cx, cy, R);
      spec.addColorStop(0, "rgba(255,255,255,0.78)");
      spec.addColorStop(0.3, "rgba(255,255,255,0.2)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 group"
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.92, transition: { type: "spring", stiffness: 600, damping: 25 } }}
      title={active ? "تعطيل النموذج المحلي" : "تفعيل النموذج المحلي"}
      aria-label="Local model toggle"
    >
      <div className="relative">
        <canvas ref={canvasRef} style={{ width: 48, height: 48, display: "block", cursor: "pointer", borderRadius: "50%" }} />
        {/* Outer ring pulse */}
        <motion.div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: `1.5px solid ${active ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.4)"}` }}
          animate={{ scale: [1, 1.22, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: active ? 2.0 : 1.1, repeat: Infinity }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <span style={{
          fontSize: "7px", fontWeight: 900, letterSpacing: "0.32em",
          color: active ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.65)",
          fontFamily: "monospace", textTransform: "uppercase",
        }}>LOCAL MODEL</span>
        <span style={{
          fontSize: "9px", fontWeight: 900, letterSpacing: "0.2em",
          color: active ? "#22c55e" : "#ef4444",
          fontFamily: "monospace",
          textShadow: `0 0 10px ${active ? "#22c55e" : "#ef4444"}`,
        }}>{active ? "ENABLED" : "DISABLED"}</span>
      </div>
    </motion.button>
  );
}

export function ChatEmptyState({ modelName, memoryCount = 0, onPrompt, emptyText }: ChatEmptyStateProps) {
  const { state, dispatch } = useStore();
  const useLocal = state.settings.useLocalModel;
  const globeVisible = state.globeVisible ?? true;
  const [bootLine, setBootLine] = useState(0);
  const [showMain, setShowMain] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setBootLine(i);
      if (i >= BOOT_LINES.length - 1) {
        clearInterval(id);
        setTimeout(() => setShowMain(true), 400);
      }
    }, 260);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPulse(p => p + 1);
      if (Math.random() > 0.9) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 180);
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "16px", padding: "32px 24px", maxWidth: "680px", margin: "0 auto", width: "100%" }}>
      {/* 3D futuristic background for empty state */}
      {globeVisible && <FuturisticBackground3D opacity={0.35} />}
      {/* Subtle matrix rain overlay */}
      {globeVisible && <MatrixRain opacity={0.04} color="#e21227" speed={0.5} density={0.5} />}

      {/* HUD corners */}
      <div className="hud-corners hud-animated" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div className="hud-c tl" /><div className="hud-c tr" />
        <div className="hud-c bl" /><div className="hud-c br" />
      </div>

      {/* Threat Globe 3D — animated wireframe globe with attack arcs */}
      {globeVisible && (
        <div style={{ position: "absolute", top: 8, right: 8, opacity: 0.65, pointerEvents: "none", zIndex: 1 }}>
          <ThreatGlobe3D />
        </div>
      )}

      {/* Central orb icon — hidden in chat mode */}
      {globeVisible && (
        <div style={{ textAlign: "center", marginBottom: "24px", position: "relative", zIndex: 2 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Orbit rings */}
            {[120, 88, 60].map((size, i) => (
              <div key={i} style={{
                position: "absolute",
                left: "50%", top: "50%",
                width: size, height: size,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: `1px solid rgba(226,18,39,${0.08 + i * 0.06})`,
                animation: `spin3d ${10 - i * 2}s linear infinite ${i % 2 === 0 ? "" : "reverse"}`,
                pointerEvents: "none",
              }} />
            ))}

            {/* Orbiting dot */}
            <div style={{
              position: "absolute",
              left: "50%", top: "50%",
              pointerEvents: "none",
              animation: "orbit 3s linear infinite",
            }}>
              <div style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: "#e21227", boxShadow: "0 0 8px #e21227",
                transform: "translate(-50%, -50%)",
              }} />
            </div>

            {/* Core icon */}
            <motion.div
              animate={{ scale: glitching ? [1, 1.04, 0.97, 1] : [1, 1.03, 1] }}
              transition={{ duration: glitching ? 0.18 : 2.5, repeat: Infinity }}
              style={{
                position: "relative", width: "80px", height: "80px",
                borderRadius: "22px",
                background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.25), rgba(8,8,12,0.97))",
                border: "1px solid rgba(226,18,39,0.4)",
                boxShadow: `0 0 40px rgba(226,18,39,0.3), 0 0 ${80 + (pulse % 2) * 20}px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "default",
              }}
            >
              <Shield style={{ width: "36px", height: "36px", color: "#e21227", filter: "drop-shadow(0 0 10px rgba(226,18,39,0.8))" }} />
            </motion.div>
          </div>
        </div>
      )}

      {/* Boot sequence — hidden in chat mode */}
      {globeVisible && (
        <div style={{ fontFamily: "monospace", fontSize: "10px", marginBottom: "16px", textAlign: "center", position: "relative", zIndex: 2 }}>
          <AnimatePresence mode="popLayout">
            {BOOT_LINES.slice(0, bootLine + 1).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: i === bootLine ? 1 : 0.2, x: 0 }}
                style={{
                  color: i === BOOT_LINES.length - 1 ? "#22c55e" : "rgba(255,255,255,0.3)",
                  textShadow: i === BOOT_LINES.length - 1 ? "0 0 8px #22c55e" : "none",
                  lineHeight: 1.8,
                }}
              >
                {i === BOOT_LINES.length - 1 ? "▶ " : "· "}{line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(showMain || !globeVisible) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            style={{ position: "relative", zIndex: 2 }}
          >
            {/* Model name */}
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <h2 style={{
                fontSize: "22px", fontWeight: 900, letterSpacing: "-0.5px",
                color: "#fff",
                textShadow: globeVisible && glitching
                  ? "2px 0 rgba(226,18,39,0.8), -2px 0 rgba(0,200,255,0.4)"
                  : "0 0 20px rgba(226,18,39,0.2)",
                marginBottom: "4px",
              }}>
                {modelName}
              </h2>
              <p style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>
                {emptyText || "ما الهدف الذي نشتغل عليه اليوم؟"}
              </p>
            </div>


            {/* Local Model toggle — boot screen */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "20px",
                padding: "12px 24px", borderRadius: "16px",
                background: useLocal ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.04)",
                border: `1px solid ${useLocal ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.14)"}`,
                backdropFilter: "blur(8px)",
              }}>
                <LocalToggleOrb
                  active={useLocal}
                  onClick={() => dispatch({ type: "SET_SETTINGS", patch: { useLocalModel: !useLocal } })}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.28em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
                    وضع النموذج
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: useLocal ? "#22c55e" : "#ef4444", textShadow: `0 0 18px ${useLocal ? "#22c55e" : "#ef4444"}` }}>
                    {useLocal ? "نموذج محلي" : "نموذج سحابي"}
                  </div>
                  <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)" }}>
                    {useLocal ? (state.settings.localModel || "Ollama / LM Studio") : (state.activeProvider?.toUpperCase() || "CLOUD")}
                  </div>
                  <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>
                    اضغط للتبديل ←→ toggle
                  </div>
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "24px" }}>
              {[
                { label: "NEURAL LINK ACTIVE", color: "#10b981", dot: true },
                { label: "SECURE CHANNEL", color: "#e21227", dot: true },
                { label: "ARSENAL READY", color: "#a78bfa", dot: false },
                ...(memoryCount > 0 ? [{ label: `${memoryCount} MEMORY NODES`, color: "#10b981", dot: false }] : []),
              ].map((b, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "100px",
                  background: `${b.color}0d`, border: `1px solid ${b.color}25`,
                  fontSize: "9px", fontFamily: "monospace", fontWeight: 700,
                  color: b.color, letterSpacing: "0.8px",
                }}>
                  {b.dot && (
                    <span style={{
                      width: "4px", height: "4px", borderRadius: "50%",
                      background: b.color, boxShadow: `0 0 5px ${b.color}`,
                      animation: "neonFlicker 2s ease-in-out infinite",
                      display: "block",
                    }} />
                  )}
                  {b.label}
                </div>
              ))}
            </div>

            {/* Quick command grid */}
            {onPrompt && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "8px",
              }}>
                {QUICK_COMMANDS.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => onPrompt(cmd.prompt)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 12px", borderRadius: "10px",
                        background: `${cmd.color}08`,
                        border: `1px solid ${cmd.color}20`,
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: `${cmd.color}12`,
                        borderColor: `${cmd.color}40`,
                        y: -1,
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon style={{ width: "13px", height: "13px", color: cmd.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>
                        {cmd.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
