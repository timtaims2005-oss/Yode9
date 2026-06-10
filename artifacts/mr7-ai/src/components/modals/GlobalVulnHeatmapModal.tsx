import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, TrendingUp, AlertTriangle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface CountryData {
  name: string; code: string; lat: number; lon: number; vulns: number; active: number; color: string;
}

const COUNTRIES: CountryData[] = [
  { name: "United States", code: "US", lat: 38, lon: -97, vulns: 4821, active: 234, color: "#e21227" },
  { name: "China", code: "CN", lat: 35, lon: 105, vulns: 3654, active: 189, color: "#e21227" },
  { name: "Russia", code: "RU", lat: 60, lon: 100, vulns: 2987, active: 156, color: "#f97316" },
  { name: "Germany", code: "DE", lat: 51, lon: 10, vulns: 1854, active: 78, color: "#f97316" },
  { name: "United Kingdom", code: "GB", lat: 54, lon: -2, vulns: 1623, active: 67, color: "#fbbf24" },
  { name: "Brazil", code: "BR", lat: -14, lon: -51, vulns: 1445, active: 54, color: "#fbbf24" },
  { name: "India", code: "IN", lat: 20, lon: 77, vulns: 1389, active: 61, color: "#fbbf24" },
  { name: "France", code: "FR", lat: 46, lon: 2, vulns: 1201, active: 45, color: "#fbbf24" },
  { name: "Japan", code: "JP", lat: 36, lon: 138, vulns: 987, active: 38, color: "#a3e635" },
  { name: "South Korea", code: "KR", lat: 36, lon: 128, vulns: 876, active: 29, color: "#a3e635" },
  { name: "Canada", code: "CA", lat: 56, lon: -96, vulns: 754, active: 22, color: "#4ade80" },
  { name: "Australia", code: "AU", lat: -25, lon: 134, vulns: 689, active: 18, color: "#4ade80" },
  { name: "Netherlands", code: "NL", lat: 52, lon: 5, vulns: 621, active: 24, color: "#4ade80" },
  { name: "Iran", code: "IR", lat: 32, lon: 53, vulns: 1876, active: 98, color: "#f97316" },
  { name: "North Korea", code: "KP", lat: 40, lon: 127, vulns: 654, active: 87, color: "#f97316" },
];

const TOP_CVES = [
  { id: "CVE-2024-3094", desc: "XZ Utils Backdoor", cvss: 10.0, count: 45821 },
  { id: "CVE-2024-1709", desc: "ScreenConnect Auth Bypass", cvss: 10.0, count: 38654 },
  { id: "CVE-2024-21762", desc: "Fortinet SSL-VPN RCE", cvss: 9.8, count: 29877 },
  { id: "CVE-2024-6387", desc: "OpenSSH regreSSHion", cvss: 8.1, count: 245000 },
  { id: "CVE-2023-4863", desc: "WebP Heap Overflow", cvss: 8.8, count: 189000 },
  { id: "CVE-2021-44228", desc: "Log4Shell", cvss: 10.0, count: 1200000 },
];

function latLonToXY(lat: number, lon: number, w: number, h: number) {
  const x = (lon + 180) / 360 * w;
  const y = (90 - lat) / 180 * h;
  return { x, y };
}

function vulnsToRadius(v: number): number {
  return 5 + Math.log(v) * 2.5;
}

export function GlobalVulnHeatmapModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selected, setSelected] = useState<CountryData | null>(null);
  const [attackArcs, setAttackArcs] = useState<{ from: CountryData; to: CountryData; progress: number; color: string }[]>([]);
  const arcsRef = useRef(attackArcs);
  useEffect(() => { arcsRef.current = attackArcs; }, [attackArcs]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);

    const arcList: { from: CountryData; to: CountryData; progress: number; color: string }[] = [];

    function spawnArc() {
      const attackers = COUNTRIES.filter(c => c.active > 50);
      const victims = COUNTRIES.filter(c => c.active < 60);
      const from = attackers[Math.floor(Math.random() * attackers.length)];
      const to = victims[Math.floor(Math.random() * victims.length)];
      if (from !== to) arcList.push({ from, to, progress: 0, color: from.color });
    }

    function frame() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#030303"; ctx.fillRect(0, 0, W, H);

      const gridGrad = ctx.createLinearGradient(0, 0, W, H);
      gridGrad.addColorStop(0, "rgba(0,229,255,0.02)"); gridGrad.addColorStop(1, "rgba(226,18,39,0.02)");
      ctx.fillStyle = gridGrad; ctx.fillRect(0, 0, W, H);

      for (let lng = -180; lng <= 180; lng += 30) {
        const x = (lng + 180) / 360 * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1; ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        const y = (90 - lat) / 180 * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.stroke();
      }

      if (t % 30 === 0) spawnArc();
      for (let i = arcList.length - 1; i >= 0; i--) {
        const arc = arcList[i];
        const { x: ax, y: ay } = latLonToXY(arc.from.lat, arc.from.lon, W, H);
        const { x: bx, y: by } = latLonToXY(arc.to.lat, arc.to.lon, W, H);
        const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * 0.3;
        const p = arc.progress;
        const px = (1-p)*(1-p)*ax + 2*(1-p)*p*mx + p*p*bx;
        const py = (1-p)*(1-p)*ay + 2*(1-p)*p*my + p*p*by;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        for (let s = 0; s <= p; s += 0.02) {
          const qx = (1-s)*(1-s)*ax + 2*(1-s)*s*mx + s*s*bx;
          const qy = (1-s)*(1-s)*ay + 2*(1-s)*s*my + s*s*by;
          ctx.lineTo(qx, qy);
        }
        ctx.strokeStyle = `${arc.color}44`; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = arc.color; ctx.fill();
        arc.progress += 0.012;
        if (arc.progress >= 1) arcList.splice(i, 1);
      }

      COUNTRIES.forEach(c => {
        const { x, y } = latLonToXY(c.lat, c.lon, W, H);
        const r = vulnsToRadius(c.vulns);
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
        grd.addColorStop(0, `${c.color}55`); grd.addColorStop(0.5, `${c.color}22`); grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        const pulse = r + Math.sin(t * 0.07 + c.lat) * 2;
        ctx.beginPath(); ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `${c.color}66`; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = c.color; ctx.fill();
        ctx.font = "7px monospace"; ctx.fillStyle = c.color; ctx.textAlign = "center";
        ctx.fillText(c.code, x, y + r + 10);
      });

      t++;
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const hit = COUNTRIES.find(c => {
        const { x, y } = latLonToXY(c.lat, c.lon, canvas.width, canvas.height);
        return Math.hypot(mx - x, my - y) < vulnsToRadius(c.vulns) * 2;
      });
      setSelected(hit || null);
    }
    canvas.addEventListener("click", onClick);
    return () => { cancelAnimationFrame(animRef.current); canvas.removeEventListener("click", onClick); window.removeEventListener("resize", resize); };
  }, [open]);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1300, maxHeight: "90vh", background: "#050505", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#111" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)" }}>
                <Globe className="w-5 h-5" style={{ color: "#e21227" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#e21227" }}>GLOBAL VULNERABILITY HEATMAP</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Real-Time CVE Distribution · Live Attack Arcs · Click Countries</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mr-4">
              {[["#e21227","Critical"],["#f97316","High"],["#fbbf24","Medium"],["#4ade80","Low"]].map(([c,l]) => (
                <div key={l as string} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: c as string }} />
                  <span className="text-[9px] font-mono" style={{ color: "#333" }}>{l}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex-1 relative">
              <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 420 }} />
              {selected && (
                <motion.div className="absolute top-4 left-4 p-4 rounded-xl w-52"
                  style={{ background: "rgba(0,0,0,0.92)", border: `1px solid ${selected.color}33`, backdropFilter: "blur(12px)" }}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="font-bold text-sm mb-2" style={{ color: selected.color }}>{selected.name}</div>
                  {[["Code", selected.code], ["Total Vulns", selected.vulns.toLocaleString()], ["Active Threats", selected.active], ["Risk", selected.vulns > 3000 ? "CRITICAL" : selected.vulns > 1500 ? "HIGH" : "MEDIUM"]].map(([k, v]) => (
                    <div key={k as string} className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>{k}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: k === "Risk" ? selected.color : "#666" }}>{String(v)}</span>
                    </div>
                  ))}
                  <button onClick={() => setSelected(null)} className="mt-2 w-full py-1 rounded text-[9px]" style={{ background: "#0a0a0a", border: "1px solid #111", color: "#444" }}>Dismiss</button>
                </motion.div>
              )}
            </div>

            <div className="w-52 border-l flex flex-col" style={{ borderColor: "#111" }}>
              <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "#111" }}>
                <TrendingUp className="w-3 h-3" style={{ color: "#e21227" }} />
                <span className="text-[9px] font-bold tracking-widest" style={{ color: "#333" }}>TOP CVEs ACTIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2" style={{ minHeight: 0 }}>
                {TOP_CVES.map(cve => (
                  <div key={cve.id} className="mb-2 p-2.5 rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #141414" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono font-bold" style={{ color: cve.cvss >= 9.5 ? "#e21227" : "#f97316" }}>{cve.id}</span>
                      <span className="text-[8px] font-bold" style={{ color: cve.cvss >= 9.5 ? "#e21227" : "#f97316" }}>{cve.cvss}</span>
                    </div>
                    <div className="text-[8px] mb-1.5" style={{ color: "#2a2a2a" }}>{cve.desc}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 h-1 rounded-full mr-2" style={{ background: "#111" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(cve.count / 13000, 100)}%`, background: cve.cvss >= 9.5 ? "#e21227" : "#f97316" }} />
                      </div>
                      <span className="text-[7px] font-mono" style={{ color: "#333" }}>{cve.count > 999 ? `${(cve.count/1000).toFixed(0)}K` : cve.count}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t" style={{ borderColor: "#111" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px]" style={{ color: "#2a2a2a" }}>Total tracked</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: "#e21227" }}>{COUNTRIES.reduce((a, c) => a + c.vulns, 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px]" style={{ color: "#2a2a2a" }}>Active threats</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color: "#f97316" }}>{COUNTRIES.reduce((a, c) => a + c.active, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
