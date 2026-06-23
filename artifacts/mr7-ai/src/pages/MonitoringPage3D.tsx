/**
 * MonitoringPage3D — لوحة مراقبة ثلاثية الأبعاد
 * System metrics · API health · Real-time graphs · 3D holographic
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, X, Cpu, Wifi, Server, RefreshCw, AlertTriangle, CheckCircle2, Clock, BarChart2, Zap } from "lucide-react";

interface Metric { label: string; value: number; max: number; color: string }
interface ApiEndpoint { name: string; path: string; latency: number; status: "ok" | "slow" | "error"; requests: number }

const STATUS_COLORS = { ok: "#10b981", slow: "#f59e0b", error: "#e21227" };

function useMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "CPU", value: 34, max: 100, color: "#e21227" },
    { label: "RAM", value: 61, max: 100, color: "#3b82f6" },
    { label: "Disk I/O", value: 28, max: 100, color: "#10b981" },
    { label: "Network", value: 45, max: 100, color: "#f59e0b" },
    { label: "GPU", value: 72, max: 100, color: "#8b5cf6" },
    { label: "Tokens/min", value: 4200, max: 10000, color: "#06b6d4" },
  ]);

  const [endpoints] = useState<ApiEndpoint[]>([
    { name: "Chat API", path: "/api/chat", latency: 245, status: "ok", requests: 1842 },
    { name: "Council", path: "/api/council", latency: 1920, status: "slow", requests: 38 },
    { name: "Godmode", path: "/api/godmode", latency: 3400, status: "slow", requests: 12 },
    { name: "OSINT", path: "/api/osint", latency: 180, status: "ok", requests: 567 },
    { name: "Agent", path: "/api/agent", latency: 890, status: "ok", requests: 234 },
    { name: "Image Gen", path: "/api/image", latency: 2100, status: "ok", requests: 89 },
    { name: "Vision", path: "/api/vision", latency: 320, status: "ok", requests: 145 },
    { name: "Health", path: "/api/health", latency: 12, status: "ok", requests: 9823 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: Math.max(0, Math.min(m.max, m.value + (Math.random() - 0.5) * 8)),
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return { metrics, endpoints };
}

// ── Live Bar Metric ────────────────────────────────────────────────────────────
function MetricBar({ metric }: { metric: Metric }) {
  const pct = Math.round((metric.value / metric.max) * 100);
  return (
    <div className="p-3 rounded-xl border border-white/6 bg-white/2">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-zinc-400">{metric.label}</p>
        <p className="text-xs font-bold" style={{ color: metric.color }}>
          {metric.value >= 1000 ? `${(metric.value / 1000).toFixed(1)}k` : Math.round(metric.value)}
        </p>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ backgroundColor: metric.color, boxShadow: `0 0 6px ${metric.color}66` }}
        />
      </div>
      <p className="text-[9px] text-zinc-700 mt-1">{pct}%</p>
    </div>
  );
}

// ── 3D System Network Canvas ───────────────────────────────────────────────────
function SystemCanvas() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = cv.offsetWidth * DPR; cv.height = cv.offsetHeight * DPR;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    };
    resize();
    const W = cv.offsetWidth, H = cv.offsetHeight;
    const CX = W / 2, CY = H / 2;

    const nodes = [
      { x: CX, y: CY, r: 22, color: "#e21227", label: "KaliGPT" },
      { x: CX - 100, y: CY - 55, r: 13, color: "#3b82f6", label: "Chat" },
      { x: CX + 100, y: CY - 55, r: 13, color: "#10b981", label: "Council" },
      { x: CX - 100, y: CY + 55, r: 13, color: "#f59e0b", label: "OSINT" },
      { x: CX + 100, y: CY + 55, r: 13, color: "#8b5cf6", label: "Agent" },
      { x: CX, y: CY - 95, r: 9, color: "#06b6d4", label: "Vision" },
      { x: CX, y: CY + 95, r: 9, color: "#f97316", label: "Image" },
    ];

    let t = 0;
    function draw() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Connections + traveling particles
      nodes.slice(1).forEach(n => {
        const pulse = 0.3 + 0.4 * Math.abs(Math.sin(t * 2 + n.x * 0.01));
        const alpha = Math.round(pulse * 180).toString(16).padStart(2, "0");
        ctx.strokeStyle = n.color + alpha;
        ctx.lineWidth = 1; ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(n.x, n.y); ctx.stroke();
        ctx.setLineDash([]);

        const prog = (t * 0.35 + n.x * 0.004) % 1;
        const px = nodes[0].x + (n.x - nodes[0].x) * prog;
        const py = nodes[0].y + (n.y - nodes[0].y) * prog;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = n.color; ctx.shadowColor = n.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });

      // Nodes
      nodes.forEach((n, i) => {
        const wave = i === 0 ? 0.5 + 0.5 * Math.sin(t * 1.5) : 0.3 + 0.3 * Math.sin(t * 2 + i);
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.5);
        gr.addColorStop(0, n.color + "44"); gr.addColorStop(1, n.color + "00");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.5, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + wave * 4, 0, Math.PI * 2);
        ctx.strokeStyle = n.color + "44"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "cc"; ctx.shadowColor = n.color; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = `bold ${i === 0 ? 9 : 7}px Inter`; ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + (i === 0 ? 4 : 3));
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={cvRef} className="w-full rounded-xl" style={{ height: 200 }} />;
}

interface Props { onClose?: () => void }

export function MonitoringPage3D({ onClose }: Props) {
  const { metrics, endpoints } = useMetrics();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const upCount = endpoints.filter(e => e.status === "ok").length;
  const totalReqs = endpoints.reduce((s, e) => s + e.requests, 0);
  const avgLat = Math.round(endpoints.reduce((s, e) => s + e.latency, 0) / endpoints.length);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(226,18,39,.05) 0%,transparent 55%)" }} />

      {/* Header */}
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">المراقبة — 3D Live</h2>
            <p className="text-xs text-zinc-600">{upCount}/{endpoints.length} خدمة نشطة · {totalReqs.toLocaleString()} طلب</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
          <button onClick={refresh} disabled={refreshing} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Server, label: "متوسط الاستجابة", value: `${avgLat}ms`, color: "#e21227" },
            { icon: BarChart2, label: "إجمالي الطلبات", value: totalReqs.toLocaleString(), color: "#3b82f6" },
            { icon: CheckCircle2, label: "Uptime", value: `${Math.round((upCount / endpoints.length) * 100)}%`, color: "#10b981" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="p-3 rounded-xl border border-white/6 bg-white/2 text-center">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-sm font-bold" style={{ color }}>{value}</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* 3D System Map */}
        <div className="p-4 rounded-xl bg-white/2 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-400" />خريطة النظام 3D
          </p>
          <SystemCanvas />
        </div>

        {/* Metrics Grid */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />مقاييس الموارد — Real-time
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.map(m => <MetricBar key={m.label} metric={m} />)}
          </div>
        </div>

        {/* API Endpoints */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-zinc-500" />نقاط نهاية API
          </p>
          <div className="space-y-1.5">
            {endpoints.map((ep, i) => {
              const color = STATUS_COLORS[ep.status];
              return (
                <motion.div key={ep.path} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 bg-white/2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300">{ep.name}</p>
                    <p className="text-[10px] text-zinc-700 font-mono">{ep.path}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-mono" style={{ color }}>{ep.latency}ms</p>
                      <p className="text-[9px] text-zinc-700">{ep.requests.toLocaleString()} req</p>
                    </div>
                    <div className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: `${color}18`, color }}>
                      {ep.status === "ok" ? "OK" : ep.status === "slow" ? "SLOW" : "ERR"}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />تنبيهات النظام
          </p>
          <div className="space-y-1.5">
            {[
              { msg: "Council API يتجاوز حد الاستجابة (>2000ms)", time: "منذ 3 دقائق" },
              { msg: "ذاكرة النظام: 61% — استخدام مرتفع", time: "منذ 10 دقائق" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                <span className="text-zinc-400 flex-1">{a.msg}</span>
                <span className="text-zinc-700 flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
