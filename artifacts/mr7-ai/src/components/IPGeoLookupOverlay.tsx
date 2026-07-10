import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Globe, Server, AlertTriangle, MapPin, Wifi,
  Lock, Clock, Zap, Activity, Radio, ChevronRight, Eye,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   IP GEO LOOKUP OVERLAY — 3D Holographic WHOIS + Threat Intel
   Ultra-futuristic, advanced, animated canvas background
═══════════════════════════════════════════════════════════════════ */

export interface GeoNodeData {
  id: string;
  name: string;
  ip: string;
  port: string;
  protocol: string;
  lat: number;
  lon: number;
  type: "attacker" | "target" | "relay";
  color: string;
}

interface WHOISRecord {
  field: string;
  value: string;
  color?: string;
}

const THREAT_LABELS = ["MINIMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"];
const THREAT_COLORS = ["#22c55e", "#10b981", "#f59e0b", "#e87b0c", "#e21227"];

const PORT_SERVICES: Record<string, string> = {
  "22": "SSH", "80": "HTTP", "443": "HTTPS", "3389": "RDP",
  "4444": "BACKDOOR", "8080": "HTTP-PROXY", "9050": "TOR",
  "1080": "SOCKS5", "3306": "MYSQL", "445": "SMB", "25": "SMTP",
  "53": "DNS", "8443": "HTTPS-ALT", "9001": "TOR-DIR",
  "1194": "OPENVPN",
};

function makeFakeWHOIS(node: GeoNodeData): WHOISRecord[] {
  const asns: Record<string, string> = {
    ru: "AS8359 MTS PJSC", cn: "AS4134 Chinanet", ir: "AS49100 Pishgaman Toseeh",
    kp: "AS131279 Star JV", br: "AS1916 ANSP", in: "AS45609 Bharti Airtel",
    us: "AS13335 Cloudflare", gb: "AS2856 BT Group", de: "AS24940 Hetzner Online",
    ua: "AS6849 UKRTELENET", jp: "AS4713 NTT Communications", sa: "AS25207 SaudiNet",
    sg: "AS4657 StarHub Mobile", au: "AS1221 Telstra", ca: "AS577 Bell Canada",
    fr: "AS3215 Orange S.A.", nl: "AS1136 KPN", tw: "AS3462 HiNet",
    mx: "AS8151 Uninet S.A.", za: "AS5713 Telkom SA",
  };
  const isps: Record<string, string> = {
    ru: "MTS Telecom", cn: "China Telecom", ir: "Pishgaman Cloud", kp: "Korea Post",
    br: "Vivo", in: "Airtel India", us: "Cloudflare Inc.", gb: "British Telecom",
    de: "Hetzner", ua: "Ukrtelecom", jp: "NTT", sa: "Saudi Telecom",
    sg: "StarHub", au: "Telstra Corp.", ca: "Bell Canada", fr: "Orange",
    nl: "KPN NL", tw: "HiNet Taiwan", mx: "Telmex", za: "Telkom SA",
  };
  const orgs: Record<string, string> = {
    ru: "Rostelecom", cn: "China Internet Network", ir: "NIOC Network",
    kp: "Ministry of Posts", br: "NET Servicos", in: "India Telecom",
    us: "ARIN ALLOCATION", gb: "RIPE NCC", de: "DENIC eG", ua: "UA-IX",
    jp: "JPNIC", sa: "STC Group", sg: "iDA Singapore", au: "APNIC",
    ca: "ARIN Canada", fr: "RENATER", nl: "RIPE NCC Amsterdam", tw: "TWNIC",
    mx: "LACNIC Mexico", za: "AfriNIC ZA",
  };
  const reg = new Date(Date.now() - Math.random() * 157680000000).toISOString().split("T")[0];
  const upd = new Date(Date.now() - Math.random() * 7776000000).toISOString().split("T")[0];
  const isAttacker = node.type === "attacker";
  return [
    { field: "IP ADDRESS", value: node.ip, color: isAttacker ? "#ff6666" : "#00e5ff" },
    { field: "ASN", value: asns[node.id] || "AS00000 UNKNOWN", color: "#a855f7" },
    { field: "ISP / ORG", value: isps[node.id] || "Unknown ISP" },
    { field: "REGISTRANT", value: orgs[node.id] || "Unknown Org" },
    { field: "COUNTRY", value: `${node.name} (${node.lat.toFixed(2)}°, ${node.lon.toFixed(2)}°)` },
    { field: "REG DATE", value: reg, color: "#10b981" },
    { field: "UPDATED", value: upd, color: "#10b981" },
    { field: "STATUS", value: isAttacker ? "⚠ THREAT ACTOR" : node.type === "relay" ? "→ RELAY NODE" : "✓ MONITORED", color: isAttacker ? "#e21227" : node.type === "relay" ? "#a855f7" : "#22c55e" },
    { field: "OPEN PORTS", value: [node.port, ...[22, 80, 443, 8080].filter(p => p !== +node.port).slice(0, 3)].map(p => `${p}/${PORT_SERVICES[p] ?? "UNKNOWN"}`).join("  "), color: "#f59e0b" },
    { field: "TLS VERSION", value: "TLSv1.3 (AES-256-GCM)" },
    { field: "PROTOCOL", value: `${node.protocol} / TCP4` },
    { field: "LAST SEEN", value: new Date(Date.now() - Math.random() * 180000).toLocaleTimeString("en-US", { hour12: false }), color: "#22c55e" },
  ];
}

function makeThreatData(node: GeoNodeData) {
  const base = node.type === "attacker" ? 65 + Math.random() * 30 : node.type === "relay" ? 30 + Math.random() * 30 : 5 + Math.random() * 25;
  const score = Math.min(99, Math.round(base));
  const level = Math.min(4, Math.floor(score / 20));
  const events = Math.round(base * 1.4 + Math.random() * 20);
  const cvss = (3 + (score / 100) * 7).toFixed(1);
  return { score, level, events, cvss };
}

/* ── 3D Canvas background for the overlay ── */
function HoloBackground() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.offsetWidth || 680;
    const H = cv.offsetHeight || 480;
    cv.width = W; cv.height = H;

    const hexSize = 38;
    const hexes: { x: number; y: number; phase: number }[] = [];
    for (let r = -1; r <= Math.ceil(H / (hexSize * 1.5)) + 1; r++) {
      for (let c = -1; c <= Math.ceil(W / (hexSize * 1.73)) + 1; c++) {
        hexes.push({ x: c * hexSize * 1.73 + (r % 2) * hexSize * 0.865, y: r * hexSize * 1.5, phase: Math.random() * Math.PI * 2 });
      }
    }

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.2 + 0.3, color: ["#00e5ff", "#a855f7", "#e21227", "#22c55e"][Math.floor(Math.random() * 4)],
      alpha: Math.random() * 0.4 + 0.05,
    }));

    const rings = Array.from({ length: 3 }, (_, i) => ({ r: 40 + i * 30, speed: 0.002 + i * 0.001, phase: (i / 3) * Math.PI * 2 }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.012);
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "rgba(4,6,22,0.97)");
      bg.addColorStop(0.5, "rgba(2,4,16,0.98)");
      bg.addColorStop(1, "rgba(3,8,24,0.97)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Hex grid
      hexes.forEach(h => {
        const a = (Math.sin(t * 0.5 + h.phase) + 1) / 2 * 0.055 + 0.008;
        ctx.strokeStyle = `rgba(0,229,255,${a})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const x = h.x + hexSize * 0.45 * Math.cos(ang);
          const y = h.y + hexSize * 0.45 * Math.sin(ang);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      });

      // Rotating rings (top-left corner = visual focus)
      const cx = W * 0.82, cy = H * 0.22;
      rings.forEach(ring => {
        const angle = t * ring.speed + ring.phase;
        const grd = ctx.createLinearGradient(cx - ring.r, cy, cx + ring.r, cy);
        grd.addColorStop(0, "rgba(0,229,255,0)");
        grd.addColorStop(0.5, `rgba(0,229,255,0.18)`);
        grd.addColorStop(1, "rgba(0,229,255,0)");
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.r, ring.r * 0.35, 0, 0, Math.PI * 2);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      });

      // Globe outline (right side)
      const globeR = 50;
      const glbX = W * 0.82, glbY = H * 0.22;
      ctx.strokeStyle = "rgba(0,229,255,0.12)";
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(glbX, glbY, globeR, 0, Math.PI * 2); ctx.stroke();
      for (let la = -60; la <= 60; la += 30) {
        const ry = globeR * Math.sin(la * Math.PI / 180);
        const rx = Math.sqrt(Math.max(0, globeR * globeR - ry * ry));
        ctx.beginPath();
        ctx.ellipse(glbX, glbY - ry * 0.6, rx, rx * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${0.06 - Math.abs(la) * 0.0005})`;
        ctx.stroke();
      }
      for (let lo = 0; lo < 360; lo += 40) {
        const angle2 = (lo + t * 8) * Math.PI / 180;
        const x = glbX + globeR * Math.cos(angle2) * 0.6;
        const y = glbY + globeR * Math.sin(angle2) * 0.95;
        ctx.strokeStyle = "rgba(0,229,255,0.05)";
        ctx.beginPath();
        ctx.ellipse(glbX, glbY, globeR, globeR * 0.6, lo * Math.PI / 180, 0, Math.PI * 2);
        ctx.stroke();
        void x; void y;
      }

      // Particles
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
        particles.slice(i + 1, i + 4).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 70) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color; ctx.lineWidth = 0.25;
            ctx.globalAlpha = (1 - d / 70) * 0.06; ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;

      // Scan line
      const scanY = ((t * 22) % H);
      const sg = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4);
      sg.addColorStop(0, "rgba(0,229,255,0)");
      sg.addColorStop(0.5, "rgba(0,229,255,0.04)");
      sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 4, W, 8);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas ref={cvRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "inherit" }}
    />
  );
}

/* ── Animated threat score ring ── */
function ThreatRing({ score, color }: { score: number; color: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 80; cv.width = S; cv.height = S;
    const cx = S / 2, cy = S / 2, R = S / 2 - 4;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.02);
      ctx.clearRect(0, 0, S, S);

      // BG circle
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 5; ctx.stroke();

      // Score arc
      const arc = (score / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + arc);
      ctx.strokeStyle = color + (0.7 + Math.sin(t * 2) * 0.2 > 0.9 ? "ee" : "bb");
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Glow
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + arc);
      ctx.strokeStyle = color + "44";
      ctx.lineWidth = 10; ctx.stroke();

      // Score text
      ctx.fillStyle = color;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(score), cx, cy - 4);
      ctx.font = "bold 7px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText("THREAT", cx, cy + 10);

      // Rotating dot
      const da = t * 1.5 - Math.PI / 2;
      const dx = cx + R * Math.cos(da);
      const dy = cy + R * Math.sin(da);
      ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.35; ctx.fill();
      ctx.globalAlpha = 1;
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, color]);

  return <canvas ref={cvRef} width={80} height={80} style={{ width: 80, height: 80, display: "block" }} />;
}

/* ── Main overlay component ── */
export function IPGeoLookupOverlay({
  node,
  onClose,
}: {
  node: GeoNodeData;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [activeTab, setActiveTab] = useState<"whois" | "ports" | "history">("whois");
  const whoisData = makeFakeWHOIS(node);
  const threat = makeThreatData(node);
  const threatColor = THREAT_COLORS[threat.level];
  const threatLabel = THREAT_LABELS[threat.level];

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60);
    const iv = setInterval(() => setScanLine(v => (v + 3) % 100), 30);
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t1); clearInterval(iv); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const fakeHistory = Array.from({ length: 6 }, (_, i) => ({
    time: new Date(Date.now() - (i + 1) * 47000 * (1 + Math.random())).toLocaleTimeString("en-US", { hour12: false }),
    event: ["SYN FLOOD", "PORT SCAN", "SSH BRUTE", "RDP PROBE", "HTTP ENUM", "MALWARE C2", "DATA EXFIL", "CREDENTIAL"][Math.floor(Math.random() * 8)],
    severity: (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const)[Math.floor(Math.random() * 4)],
    bytes: `${Math.round(10 + Math.random() * 990)}KB`,
  }));

  const openPorts = [
    { port: node.port, service: PORT_SERVICES[node.port] ?? "UNKNOWN", state: "OPEN", banner: `${node.protocol}/1.1 server` },
    ...([22, 80, 443, 8080, 3306, 445].filter(p => p !== +node.port).slice(0, 4).map(p => ({
      port: String(p),
      service: PORT_SERVICES[String(p)] ?? "UNKNOWN",
      state: Math.random() > 0.4 ? "OPEN" : "FILTERED",
      banner: `service ${PORT_SERVICES[String(p)] ?? "unknown"}`,
    }))),
  ];

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  return (
    <AnimatePresence>
      {true && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
          }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.88, y: visible ? 0 : 24 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              width: "min(720px, 96vw)",
              maxHeight: "92vh",
              borderRadius: "20px",
              overflow: "hidden",
              border: `1px solid ${node.color}35`,
              boxShadow: `0 0 80px ${node.color}22, 0 0 0 1px rgba(255,255,255,0.025), 0 32px 80px rgba(0,0,0,0.95)`,
              display: "flex", flexDirection: "column",
            }}
          >
            <HoloBackground />

            {/* Scan line overlay */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.005) 2px, rgba(255,255,255,0.005) 4px)",
            }} />
            <motion.div
              style={{
                position: "absolute", left: 0, right: 0, height: "2px",
                top: `${scanLine}%`, zIndex: 2, pointerEvents: "none",
                background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)",
              }}
            />

            {/* Corner brackets */}
            {[
              { top: 10, left: 10, bt: "none", br: "none" },
              { top: 10, right: 10, bt: "none", bl: "none" },
              { bottom: 10, left: 10, bb: "none", br: "none" },
              { bottom: 10, right: 10, bb: "none", bl: "none" },
            ].map((pos, i) => (
              <div key={i} style={{
                position: "absolute", width: 14, height: 14, zIndex: 10,
                pointerEvents: "none",
                border: `1.5px solid ${node.color}50`,
                borderRight: (pos as { br?: string }).br ?? undefined,
                borderLeft: (pos as { bl?: string }).bl ?? undefined,
                borderBottom: (pos as { bb?: string }).bb ?? undefined,
                borderTop: (pos as { bt?: string }).bt ?? undefined,
                ...(pos.top !== undefined ? { top: pos.top } : { bottom: (pos as { bottom: number }).bottom }),
                ...(pos.left !== undefined ? { left: pos.left } : { right: (pos as { right: number }).right }),
              }} />
            ))}

            {/* Header */}
            <div style={{
              position: "relative", zIndex: 5,
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 16px 10px",
              borderBottom: `1px solid ${node.color}20`,
              flexShrink: 0,
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: `radial-gradient(circle, ${node.color}30, rgba(0,0,0,0.85))`,
                border: `1px solid ${node.color}45`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 18px ${node.color}30`,
              }}>
                {node.type === "attacker" ? (
                  <AlertTriangle style={{ width: "16px", height: "16px", color: node.color, filter: `drop-shadow(0 0 6px ${node.color})` }} />
                ) : node.type === "relay" ? (
                  <Radio style={{ width: "16px", height: "16px", color: node.color, filter: `drop-shadow(0 0 6px ${node.color})` }} />
                ) : (
                  <Shield style={{ width: "16px", height: "16px", color: node.color, filter: `drop-shadow(0 0 6px ${node.color})` }} />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2px" }}>
                    IP INTELLIGENCE
                  </span>
                  <motion.span
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{
                      fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
                      color: "#22c55e", letterSpacing: "1px", padding: "2px 6px",
                      borderRadius: "4px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                    }}
                  >LIVE</motion.span>
                  <span style={{
                    fontSize: "7px", fontFamily: "monospace", color: threatColor, letterSpacing: "1px",
                    padding: "2px 7px", borderRadius: "4px",
                    background: threatColor + "18", border: `1px solid ${threatColor}35`,
                  }}>{threatLabel} RISK</span>
                </div>
                <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginTop: "2px", letterSpacing: "1px" }}>
                  {node.ip} · {node.name.toUpperCase()} · {node.type.toUpperCase()} NODE
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <button onClick={handleClose}
                style={{
                  width: "30px", height: "30px", borderRadius: "8px",
                  background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)",
                  color: "rgba(255,255,255,0.45)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.25)"; b.style.color = "#fff"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.07)"; b.style.color = "rgba(255,255,255,0.45)"; }}
              >
                <X style={{ width: "13px", height: "13px" }} />
              </button>
            </div>

            {/* Body */}
            <div style={{
              position: "relative", zIndex: 5, flex: 1,
              display: "flex", overflow: "hidden", minHeight: 0,
            }}>
              {/* Left column — threat score + key metrics */}
              <div style={{
                width: "180px", flexShrink: 0, padding: "14px 12px",
                borderRight: `1px solid ${node.color}15`,
                display: "flex", flexDirection: "column", gap: "12px",
                overflowY: "auto",
              }}>
                {/* Threat ring */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <ThreatRing score={threat.score} color={threatColor} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    {THREAT_COLORS.map((c, i) => (
                      <div key={i} style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: i <= threat.level ? c : c + "22",
                        boxShadow: i <= threat.level ? `0 0 5px ${c}` : "none",
                      }} />
                    ))}
                  </div>
                </div>

                {/* Key metrics */}
                {[
                  { icon: Zap, label: "CVSS", val: threat.cvss, color: threatColor },
                  { icon: Activity, label: "EVENTS", val: String(threat.events), color: "#a855f7" },
                  { icon: Clock, label: "UPTIME", val: `${Math.round(60 + Math.random() * 6800)}h`, color: "#00e5ff" },
                  { icon: Eye, label: "OBSERVED", val: `${Math.round(1 + Math.random() * 90)}d`, color: "#10b981" },
                  { icon: Server, label: "PORTS", val: `${3 + Math.round(Math.random() * 12)} open`, color: "#f59e0b" },
                ].map(({ icon: Icon, label, val, color }) => (
                  <div key={label} style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    padding: "6px 8px", borderRadius: "8px",
                    background: `${color}0a`, border: `1px solid ${color}15`,
                  }}>
                    <Icon style={{ width: "9px", height: "9px", color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.8px" }}>{label}</div>
                      <div style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 8px ${color}` }}>{val}</div>
                    </div>
                  </div>
                ))}

                {/* Geo coords */}
                <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                    <MapPin style={{ width: "8px", height: "8px", color: "#00e5ff" }} />
                    <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(0,229,255,0.6)", letterSpacing: "1px" }}>GEO COORDINATES</span>
                  </div>
                  <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#99f6e4" }}>{node.lat.toFixed(4)}° N</div>
                  <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#99f6e4" }}>{node.lon.toFixed(4)}° E</div>
                </div>
              </div>

              {/* Right column — tabs + data */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Tabs */}
                <div style={{
                  display: "flex", gap: "2px", padding: "8px 12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  flexShrink: 0,
                }}>
                  {([
                    { id: "whois", icon: Globe, label: "WHOIS" },
                    { id: "ports", icon: Wifi, label: "PORT SCAN" },
                    { id: "history", icon: Lock, label: "ATTACK LOG" },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        padding: "5px 10px", borderRadius: "7px 7px 0 0",
                        background: activeTab === tab.id ? `${node.color}15` : "transparent",
                        border: `1px solid ${activeTab === tab.id ? node.color + "35" : "transparent"}`,
                        borderBottom: "none",
                        color: activeTab === tab.id ? node.color : "rgba(255,255,255,0.3)",
                        cursor: "pointer", fontSize: "7.5px", fontFamily: "monospace",
                        fontWeight: 700, letterSpacing: "1px",
                        transition: "all 0.15s",
                      }}
                    >
                      <tab.icon style={{ width: "8px", height: "8px" }} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
                  <AnimatePresence mode="wait">
                    {activeTab === "whois" && (
                      <motion.div
                        key="whois"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                      >
                        {whoisData.map((row, i) => (
                          <motion.div
                            key={row.field}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            style={{
                              display: "flex", gap: "8px",
                              padding: "5px 8px",
                              borderRadius: "6px",
                              background: i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent",
                              marginBottom: "2px",
                            }}
                          >
                            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.8px", width: "80px", flexShrink: 0 }}>{row.field}</span>
                            <ChevronRight style={{ width: "8px", height: "8px", color: "rgba(255,255,255,0.12)", flexShrink: 0, marginTop: "1px" }} />
                            <span style={{ fontSize: "8px", fontFamily: "monospace", color: row.color ?? "rgba(255,255,255,0.65)", wordBreak: "break-all" }}>{row.value}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === "ports" && (
                      <motion.div key="ports" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                        <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(0,229,255,0.5)", letterSpacing: "1.5px", marginBottom: "10px" }}>
                          NMAP SCAN — {node.ip} — {new Date().toLocaleTimeString("en-US", { hour12: false })}
                        </div>
                        {openPorts.map((p, i) => (
                          <motion.div key={p.port} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            style={{
                              display: "grid", gridTemplateColumns: "40px 80px 80px 1fr",
                              gap: "6px", padding: "6px 8px", borderRadius: "6px",
                              background: p.state === "OPEN" ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                              border: `1px solid ${p.state === "OPEN" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)"}`,
                              marginBottom: "4px",
                            }}
                          >
                            <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color: p.state === "OPEN" ? "#22c55e" : "#666" }}>{p.port}</span>
                            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: p.state === "OPEN" ? "#22c55e" : "#555" }}>{p.state}</span>
                            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "#a855f7" }}>{p.service}</span>
                            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.banner}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === "history" && (
                      <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                        {fakeHistory.map((ev, i) => {
                          const sevColor = { CRITICAL: "#e21227", HIGH: "#f59e0b", MEDIUM: "#a855f7", LOW: "#22c55e" }[ev.severity];
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                padding: "7px 10px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                                marginBottom: "5px",
                              }}
                            >
                              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: sevColor, boxShadow: `0 0 6px ${sevColor}`, flexShrink: 0 }} />
                              <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", width: "55px", flexShrink: 0 }}>{ev.time}</span>
                              <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color: sevColor, flex: 1 }}>{ev.event}</span>
                              <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{ev.bytes}</span>
                              <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: sevColor, padding: "1px 5px", borderRadius: "3px", background: sevColor + "15" }}>{ev.severity}</span>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              position: "relative", zIndex: 5,
              display: "flex", alignItems: "center", gap: "12px",
              padding: "7px 14px",
              borderTop: `1px solid ${node.color}12`,
              flexShrink: 0,
            }}>
              <div style={{ height: "1px", position: "absolute", top: 0, left: 0, right: 0, background: `linear-gradient(90deg, transparent, ${node.color}30, transparent)` }} />
              {[
                { label: "PROTOCOL", val: node.protocol, color: "#00e5ff" },
                { label: "PORT", val: node.port, color: "#a855f7" },
                { label: "NODE TYPE", val: node.type.toUpperCase(), color: node.color },
                { label: "CVSS", val: threat.cvss, color: threatColor },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.8px" }}>{label}</span>
                  <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 8px ${color}` }}>{val}</span>
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)", letterSpacing: "1px" }}>ESC TO CLOSE</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
