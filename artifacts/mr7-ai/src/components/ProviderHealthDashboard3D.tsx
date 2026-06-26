/**
 * ProviderHealthDashboard3D
 * Real-time 3D health dashboard for all AI providers.
 * Shows latency sparklines, auto-disable logic, quota gauges.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Activity, WifiOff, Zap, AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

const KEY_PREFIX = "mr7-ai-p-key-";

interface ProviderHealth {
  id: string;
  name: string;
  color: string;
  status: "checking" | "healthy" | "slow" | "error" | "offline" | "disabled";
  latency: number | null;
  history: number[];
  checkCount: number;
  disabled: boolean;
  errorStreak: number;
  lastChecked: number | null;
  successRate: number;
}

const PROVIDER_DEFS = [
  { id: "personal",   name: "Personal API", color: "#e21227", baseURL: "" },
  { id: "openai",     name: "OpenAI",        color: "#00ff41", baseURL: "https://api.openai.com/v1" },
  { id: "anthropic",  name: "Anthropic",     color: "#00e5ff", baseURL: "https://api.anthropic.com/v1" },
  { id: "groq",       name: "Groq",          color: "#ff6600", baseURL: "https://api.groq.com/openai/v1" },
  { id: "gemini",     name: "Gemini",        color: "#00bfff", baseURL: "https://generativelanguage.googleapis.com/v1beta" },
  { id: "openrouter", name: "OpenRouter",    color: "#ff0080", baseURL: "https://openrouter.ai/api/v1" },
  { id: "deepseek",   name: "DeepSeek",      color: "#00ffcc", baseURL: "https://api.deepseek.com/v1" },
  { id: "xai",        name: "xAI Grok",      color: "#ff3333", baseURL: "https://api.x.ai/v1" },
  { id: "mistral",    name: "Mistral",       color: "#ffcc00", baseURL: "https://api.mistral.ai/v1" },
  { id: "perplexity", name: "Perplexity",    color: "#00ff99", baseURL: "https://api.perplexity.ai" },
];

// ── Mini sparkline canvas ─────────────────────────────────────────────────────
function MiniSparkline({ data, color, w = 80, h = 28 }: { data: number[]; color: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;
    cv.width = w * DPR; cv.height = h * DPR;
    ctx.scale(DPR, DPR);

    const pad = 3;
    const W = w - pad * 2, H = h - pad * 2;
    const min = Math.min(...data) * 0.85;
    const max = Math.max(...data) * 1.15 || 1;
    const [r, g, b] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)];
    let t = 0;

    function draw() {
      t += 0.05;
      ctx.clearRect(0, 0, w, h);

      const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * W,
        y: pad + H - ((v - min) / (max - min)) * H,
      }));

      // Fill
      const grad = ctx.createLinearGradient(0, pad, 0, pad + H);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad + H);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, pad + H);
      ctx.fillStyle = grad; ctx.fill();

      // Line
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();

      // Last point pulse
      const lp = pts[pts.length - 1];
      const pulse = (Math.sin(t * 4) + 1) / 2;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 2 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.15 * (1 - pulse)})`; ctx.fill();
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [data, color, w, h]);

  return <canvas ref={ref} style={{ width: w, height: h, display: "block", imageRendering: "crisp-edges" }} />;
}

// ── 3D Radial Health Orb ──────────────────────────────────────────────────────
function HealthOrb({ status, color }: { status: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 36;
    cv.width = S; cv.height = S;
    const cx = S / 2, cy = S / 2, r = 11;
    const [rr, rg, rb] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)];

    function draw() {
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, S, S);

      // Status-specific animation
      const anim = status === "healthy" ? Math.sin(f * 0.04) * 0.2 :
                   status === "error"   ? Math.sin(f * 0.2) * 0.5 :
                   status === "slow"    ? Math.sin(f * 0.08) * 0.3 :
                   status === "checking"? f % 60 / 60 : 0;

      // Outer glow pulse
      if (status !== "offline" && status !== "disabled") {
        const glowR = r + 6 + anim * 4;
        const g2 = ctx.createRadialGradient(cx, cy, r, cx, cy, glowR);
        g2.addColorStop(0, `rgba(${rr},${rg},${rb},${0.2 + Math.abs(anim) * 0.1})`);
        g2.addColorStop(1, `rgba(${rr},${rg},${rb},0)`);
        ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = g2; ctx.fill();
      }

      // Sphere body
      const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r);
      if (status === "disabled" || status === "offline") {
        body.addColorStop(0, "rgba(40,40,40,0.95)");
        body.addColorStop(1, "rgba(15,15,15,0.95)");
      } else {
        body.addColorStop(0, `rgba(${Math.round(rr*0.5+60)},${Math.round(rg*0.5+60)},${Math.round(rb*0.5+60)},0.95)`);
        body.addColorStop(0.5, `rgba(${rr},${rg},${rb},0.8)`);
        body.addColorStop(1, `rgba(${Math.round(rr*0.25)},${Math.round(rg*0.25)},${Math.round(rb*0.25)},0.9)`);
      }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(cx - r*0.35, cy - r*0.4, 0, cx - r*0.1, cy - r*0.1, r * 0.9);
      spec.addColorStop(0, "rgba(255,255,255,0.7)");
      spec.addColorStop(0.3, "rgba(255,255,255,0.15)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // Checking spinner arc
      if (status === "checking") {
        const spinA = (f * 0.06) % (Math.PI * 2);
        ctx.beginPath(); ctx.arc(cx, cy, r - 2, spinA, spinA + Math.PI * 1.3);
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.9)`;
        ctx.lineWidth = 2; ctx.stroke();
      }

      // Error X
      if (status === "error") {
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.9)`;
        ctx.lineWidth = 1.5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke();
      }

      // Disabled dash
      if (status === "disabled") {
        ctx.strokeStyle = "rgba(100,100,100,0.7)";
        ctx.lineWidth = 1.5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, color]);

  return <canvas ref={ref} style={{ width: 36, height: 36, imageRendering: "crisp-edges", flexShrink: 0 }} />;
}

// ── Latency Bar ───────────────────────────────────────────────────────────────
function LatencyBar({ ms, color }: { ms: number | null; color: string }) {
  if (ms === null) return <div className="h-1.5 w-16 rounded-full bg-[#1a1a1a]" />;
  const pct = Math.min(ms / 3000, 1);
  const barColor = ms < 500 ? "#22c55e" : ms < 1500 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-1.5 w-16 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: barColor, boxShadow: `0 0 4px ${barColor}` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function ProviderHealthDashboard3D() {
  const DISABLED_KEY = "mr7-health-disabled";
  const loadDisabled = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(DISABLED_KEY) || "[]")); }
    catch { return new Set(); }
  };

  const [providers, setProviders] = useState<ProviderHealth[]>(() =>
    PROVIDER_DEFS.map(p => ({
      id: p.id, name: p.name, color: p.color,
      status: "checking" as const,
      latency: null, history: [], checkCount: 0,
      disabled: loadDisabled().has(p.id),
      errorStreak: 0, lastChecked: null, successRate: 100,
    }))
  );
  const [scanning, setScanning]         = useState(false);
  const [lastScan, setLastScan]         = useState<Date | null>(null);
  const [autoDisable, setAutoDisable]   = useState(true);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleDisable = useCallback((id: string) => {
    setProviders(prev => {
      const next = prev.map(p => p.id === id ? { ...p, disabled: !p.disabled } : p);
      const disabled = new Set(next.filter(p => p.disabled).map(p => p.id));
      localStorage.setItem(DISABLED_KEY, JSON.stringify([...disabled]));
      return next;
    });
  }, []);

  const checkAll = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setLastScan(new Date());

    let serverProviders: { id: string; available: boolean }[] = [];
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json() as { providers?: { id: string; available: boolean }[] };
        serverProviders = data.providers ?? [];
      }
    } catch { /* continue */ }

    const checks = PROVIDER_DEFS.map(async (def) => {
      const t0 = Date.now();
      const hasKey = def.id === "personal"
        ? !!localStorage.getItem("mr7-ai-p-key-personal")?.trim()
        : !!(localStorage.getItem(KEY_PREFIX + def.id)?.trim());
      const serverStatus = serverProviders.find(p => p.id === def.id);

      let status: ProviderHealth["status"];
      let latencyMs: number | null = null;

      if (!hasKey && !serverStatus?.available) {
        status = "offline";
      } else {
        // Lightweight ping via our own health endpoint
        try {
          const r = await fetch(`/api/health?probe=${def.id}`, { signal: AbortSignal.timeout(5000) });
          latencyMs = Date.now() - t0;
          status = r.ok
            ? latencyMs < 1000 ? "healthy" : "slow"
            : "error";
        } catch {
          latencyMs = null;
          status = serverStatus?.available ? "slow" : "error";
        }
      }

      return { id: def.id, status, latency: latencyMs };
    });

    const results = await Promise.allSettled(checks);
    setProviders(prev => prev.map((p, i) => {
      const res = results[i];
      if (res.status !== "fulfilled") return p;
      const { status, latency } = res.value;
      const newStreak = status === "error" ? p.errorStreak + 1 : 0;
      const shouldDisable = autoDisable && newStreak >= 3 && !p.disabled;
      const totalChecks = p.checkCount + 1;
      const successRate = status === "healthy" || status === "slow"
        ? Math.round((p.successRate * p.checkCount + 100) / totalChecks)
        : Math.round((p.successRate * p.checkCount) / totalChecks);

      if (shouldDisable) {
        const disabled = loadDisabled();
        disabled.add(p.id);
        localStorage.setItem(DISABLED_KEY, JSON.stringify([...disabled]));
      }

      return {
        ...p,
        status: p.disabled ? "disabled" : status,
        latency,
        history: latency != null ? [...p.history.slice(-19), latency] : p.history,
        checkCount: totalChecks,
        errorStreak: newStreak,
        lastChecked: Date.now(),
        disabled: shouldDisable ? true : p.disabled,
        successRate,
      };
    }));

    setScanning(false);
  }, [scanning, autoDisable]);

  useEffect(() => {
    checkAll();
    intervalRef.current = setInterval(checkAll, 120_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const healthy  = providers.filter(p => p.status === "healthy").length;
  const errors   = providers.filter(p => p.status === "error").length;
  const offline  = providers.filter(p => p.status === "offline").length;
  const disabled = providers.filter(p => p.disabled).length;

  const overallHealth =
    errors > 2 ? "critical" :
    errors > 0 ? "degraded" :
    healthy > 0 ? "operational" : "unknown";

  const getTrend = (h: number[]) => {
    if (h.length < 3) return "stable";
    const last = h[h.length - 1];
    const prev = h[h.length - 3];
    if (last > prev * 1.3) return "up";
    if (last < prev * 0.7) return "down";
    return "stable";
  };

  return (
    <div className="space-y-4 p-4">
      {/* ── Header: overall status ── */}
      <div className="rounded-[18px] overflow-hidden border"
        style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
          borderColor: overallHealth === "operational" ? "rgba(34,197,94,0.25)" :
                       overallHealth === "degraded"    ? "rgba(245,158,11,0.25)" :
                       overallHealth === "critical"    ? "rgba(226,18,39,0.3)" : "rgba(255,255,255,0.1)",
          background: "linear-gradient(135deg, rgba(8,8,8,0.9), rgba(12,12,12,0.9))",
        }}>

        {/* Top accent bar */}
        <div className="h-0.5 w-full"
          style={{ background: overallHealth === "operational" ? "linear-gradient(90deg,transparent,#22c55e,transparent)" :
                               overallHealth === "degraded"    ? "linear-gradient(90deg,transparent,#f59e0b,transparent)" :
                               "linear-gradient(90deg,transparent,#ef4444,transparent)" }} />

        <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ background: overallHealth === "operational" ? "#22c55e" : overallHealth === "degraded" ? "#f59e0b" : "#ef4444",
                         boxShadow: `0 0 10px ${overallHealth === "operational" ? "#22c55e" : overallHealth === "degraded" ? "#f59e0b" : "#ef4444"}` }}
              />
              <span className="text-[13px] font-black text-white uppercase tracking-wider">
                {overallHealth === "operational" ? "جميع الأنظمة تعمل" :
                 overallHealth === "degraded"    ? "تدهور جزئي في الخدمة" :
                 overallHealth === "critical"    ? "تدخل حرج مطلوب" : "حالة غير معروفة"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              {healthy} سليم · {errors} خطأ · {offline} غير متصل · {disabled} معطّل
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastScan && (
              <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {lastScan.toLocaleTimeString("ar-SA")}
              </span>
            )}
            <button
              onClick={checkAll}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}
            >
              <RefreshCw className={`w-3 h-3 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "جارٍ..." : "فحص الكل"}
            </button>
            <button
              onClick={() => setAutoDisable(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: autoDisable ? "rgba(226,18,39,0.1)" : "rgba(255,255,255,0.04)",
                border: autoDisable ? "1px solid rgba(226,18,39,0.35)" : "1px solid rgba(255,255,255,0.1)",
                color: autoDisable ? "#e21227" : "rgba(255,255,255,0.4)",
              }}
              title="تعطيل تلقائي للمزودين الفاشلين (3 أخطاء متتالية)"
            >
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">إيقاف تلقائي</span>
            </button>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="px-4 pb-3 grid grid-cols-4 gap-2">
          {[
            { label: "سليم", val: healthy, color: "#22c55e" },
            { label: "بطيء", val: providers.filter(p => p.status === "slow").length, color: "#f59e0b" },
            { label: "خطأ", val: errors, color: "#ef4444" },
            { label: "معطّل", val: disabled, color: "#6b7280" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: `${s.color}0a`, border: `1px solid ${s.color}18` }}>
              <div className="text-[16px] font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: `${s.color}88` }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Provider cards grid ── */}
      <div className="grid grid-cols-1 gap-2">
        {providers.map((p) => {
          const trend = getTrend(p.history);
          const statusColor =
            p.status === "healthy"  ? "#22c55e" :
            p.status === "slow"     ? "#f59e0b" :
            p.status === "error"    ? "#ef4444" :
            p.status === "checking" ? "#60a5fa" :
            p.status === "disabled" ? "#4b5563" : "#374151";

          const statusLabel =
            p.status === "healthy"  ? "سليم" :
            p.status === "slow"     ? "بطيء" :
            p.status === "error"    ? "خطأ" :
            p.status === "checking" ? "فحص..." :
            p.status === "disabled" ? "معطّل" : "غير متصل";

          const avg = p.history.length ? Math.round(p.history.reduce((a, b) => a + b, 0) / p.history.length) : null;

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border transition-all"
              style={{
                borderColor: p.disabled ? "rgba(75,85,99,0.2)" : `${statusColor}22`,
                background: p.disabled ? "rgba(6,6,6,0.6)" : `linear-gradient(135deg, ${p.color}06 0%, rgba(8,8,8,0.8) 100%)`,
              }}
            >
              <div className="p-3 flex items-center gap-3">
                <HealthOrb status={p.status} color={p.color} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-black text-white">{p.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                      {statusLabel}
                    </span>
                    {p.errorStreak > 0 && !p.disabled && (
                      <span className="text-[8px] font-mono text-red-400 opacity-70">{p.errorStreak} خطأ متتالي</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <LatencyBar ms={p.latency} color={p.color} />
                    {p.latency != null && (
                      <span className="text-[10px] font-mono" style={{ color: statusColor }}>{p.latency}ms</span>
                    )}
                    {avg != null && (
                      <span className="text-[9px] text-muted-foreground font-mono">avg: {avg}ms</span>
                    )}
                    {trend !== "stable" && (
                      <span className={`text-[9px] flex items-center gap-0.5 ${trend === "up" ? "text-orange-400" : "text-green-400"}`}>
                        {trend === "up" ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      </span>
                    )}
                    {p.history.length > 0 && avg == null && <Minus className="w-3 h-3 text-muted-foreground/40" />}
                  </div>
                </div>

                {/* Mini sparkline */}
                {p.history.length >= 2 && !p.disabled && (
                  <div className="shrink-0 rounded-lg overflow-hidden" style={{ background: `${p.color}08`, border: `1px solid ${p.color}14` }}>
                    <MiniSparkline data={p.history} color={p.color} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[8px] text-muted-foreground/50 font-mono">{p.successRate}%</span>
                  <button
                    onClick={() => toggleDisable(p.id)}
                    title={p.disabled ? "تفعيل المزود" : "تعطيل مؤقت"}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                    style={{
                      background: p.disabled ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      border: p.disabled ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
                      color: p.disabled ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {p.disabled
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <WifiOff className="w-3 h-3" />
                    }
                  </button>
                </div>
              </div>

              {/* History bar */}
              {p.history.length > 0 && !p.disabled && (
                <div className="px-3 pb-2 flex items-center gap-0.5">
                  {p.history.slice(-20).map((v, i) => {
                    const hc = v < 500 ? "#22c55e" : v < 1500 ? "#f59e0b" : "#ef4444";
                    const ht = Math.min(v / 2000, 1) * 16 + 2;
                    return (
                      <div key={i} className="w-1 rounded-sm shrink-0 transition-all" title={`${v}ms`}
                        style={{ height: ht, background: hc, opacity: 0.5 + (i / p.history.length) * 0.5 }} />
                    );
                  })}
                  <span className="ml-1 text-[8px] text-muted-foreground/40 font-mono">{p.checkCount} فحص</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {[
          { color: "#22c55e", label: "< 500ms سليم" },
          { color: "#f59e0b", label: "< 1500ms بطيء" },
          { color: "#ef4444", label: "> 1500ms خطأ" },
          { color: "#6b7280", label: "معطّل / غير متصل" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            <span className="text-[9px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Activity className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40">تحديث كل 2 دقيقة</span>
          <Zap className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40">إيقاف تلقائي بعد 3 أخطاء</span>
        </div>
      </div>
    </div>
  );
}
