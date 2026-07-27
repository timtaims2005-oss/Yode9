/**
 * InfrastructureDashboard — لوحة مراقبة البنية التحتية للمشرفين
 * Live polls: /api/health/status + /api/health/queues
 * Requires admin role — shows 403 banner if unauthorised.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server, Database, Cpu, Cloud, Zap, Activity, RefreshCw, X,
  CheckCircle2, AlertTriangle, XCircle, BarChart3, Clock,
  Package, Inbox, CheckCheck, AlertOctagon, Wifi, WifiOff,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────────────
type ServiceStatus = "green" | "yellow" | "red";
interface ServiceInfo { status: ServiceStatus; detail: string; latencyMs?: number }
interface HealthStatus {
  overall: ServiceStatus;
  services: Record<string, ServiceInfo>;
  ts: string;
}
interface QueueOk   { mode: string; waiting: number; active: number; completed: number; failed: number }
interface QueueFail { error: string }
type QueueInfo = QueueOk | QueueFail;
interface CacheStats { hits: number; misses: number; errors: number; bypasses: number; hitRate: string }
interface QueuesData {
  queues: Record<string, QueueInfo>;
  cache: CacheStats;
  ts: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ServiceStatus, string> = { green: "#10b981", yellow: "#f59e0b", red: "#ef4444" };
const STATUS_LABEL: Record<ServiceStatus, string> = { green: "سليم", yellow: "تدهور جزئي", red: "معطل" };
const QUEUE_NAMES: Record<string, string> = {
  "ai-generation": "توليد الـ AI",
  "s3-upload": "رفع الملفات",
  "webhook-dispatch": "إرسال Webhooks",
  "email-send": "إرسال البريد",
};

function fmtMs(ms?: number) { return ms !== undefined ? `${ms}ms` : "—"; }
function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Subcomponents ──────────────────────────────────────────────────────────────
function StatusDot({ status, pulse = false }: { status: ServiceStatus; pulse?: boolean }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="relative flex-shrink-0" style={{ width: 10, height: 10 }}>
      <span className="absolute inset-0 rounded-full" style={{ background: c, opacity: 0.25 }} />
      {pulse && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: c, opacity: 0.5 }} />}
      <span className="absolute inset-0 rounded-full" style={{ background: c, scale: 0.6 }} />
    </span>
  );
}

function StatusIcon({ status, size = 18 }: { status: ServiceStatus; size?: number }) {
  const c = STATUS_COLOR[status];
  if (status === "green") return <CheckCircle2 size={size} style={{ color: c }} />;
  if (status === "yellow") return <AlertTriangle size={size} style={{ color: c }} />;
  return <XCircle size={size} style={{ color: c }} />;
}

function ServiceCard({ name, info, icon: IconComp }: { name: string; info: ServiceInfo; icon: React.ElementType }) {
  const c = STATUS_COLOR[info.status];
  const Icon = IconComp as React.FC<{ size?: number; style?: React.CSSProperties }>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: `${c}08`, borderColor: `${c}22` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c}18`, border: `1px solid ${c}30` }}>
            <Icon size={16} style={{ color: c }} />
          </div>
          <span className="text-sm font-semibold text-white">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={info.status} pulse={info.status !== "green"} />
          <span className="text-xs font-medium" style={{ color: c }}>{STATUS_LABEL[info.status]}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{info.detail}</p>
      {info.latencyMs !== undefined && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Clock size={11} />
          <span>وقت الاستجابة: <span className="text-zinc-400">{fmtMs(info.latencyMs)}</span></span>
        </div>
      )}
    </motion.div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function CacheGauge({ stats }: { stats: CacheStats }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const total = stats.hits + stats.misses;
  const pct = total > 0 ? stats.hits / total : 0;

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const S = 88;
    cv.width = S * DPR; cv.height = S * DPR; cv.style.width = S + "px"; cv.style.height = S + "px";
    ctx.scale(DPR, DPR);
    const cx = S / 2, cy = S / 2, r = S * 0.35;
    const sa = -Math.PI / 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 7; ctx.stroke();
    if (pct > 0) {
      const gr = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      gr.addColorStop(0, "#10b98199"); gr.addColorStop(1, "#10b981");
      ctx.beginPath(); ctx.arc(cx, cy, r, sa, sa + Math.PI * 2 * pct);
      ctx.strokeStyle = gr; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.shadowColor = "#10b981"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.font = `bold 15px Inter`; ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy + 5);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = `8px Inter`; ctx.fillText("HIT", cx, cy + 17);
  }, [pct]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={cvRef} />
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-center">
        {([["✅ حصل", stats.hits, "#10b981"], ["❌ فاتت", stats.misses, "#ef4444"], ["⚠️ أخطاء", stats.errors, "#f59e0b"]] as [string, number, string][]).map(([l, v, c]) => (
          <div key={l}>
            <div className="text-base font-bold" style={{ color: c }}>{v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}</div>
            <div className="text-[9px] text-zinc-600">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueCard({ name, data }: { name: string; data: QueueInfo }) {
  const arabicName = QUEUE_NAMES[name] ?? name;
  if ("error" in data) {
    return (
      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertOctagon size={15} className="text-red-400" />
          <span className="text-sm font-medium text-white">{arabicName}</span>
        </div>
        <p className="text-xs text-red-400/70">{data.error}</p>
      </div>
    );
  }

  const q = data as QueueOk;
  const isBullMQ = q.mode === "bullmq";
  const total = q.waiting + q.active + q.completed + q.failed;

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={15} className={isBullMQ ? "text-purple-400" : "text-zinc-500"} />
          <span className="text-sm font-medium text-white">{arabicName}</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{
          background: isBullMQ ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)",
          color: isBullMQ ? "#a78bfa" : "#71717a",
        }}>
          {isBullMQ ? "BullMQ" : "In-Process"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { l: "انتظار", v: q.waiting,   c: "#f59e0b", Icon: Inbox },
          { l: "نشط",    v: q.active,    c: "#3b82f6", Icon: Zap },
          { l: "اكتمل",  v: q.completed, c: "#10b981", Icon: CheckCheck },
          { l: "فشل",    v: q.failed,    c: "#ef4444", Icon: AlertOctagon },
        ].map(({ l, v, c, Icon }) => (
          <div key={l} className="rounded-lg p-2" style={{ background: `${c}10`, border: `1px solid ${c}20` }}>
            <Icon size={13} style={{ color: c }} className="mx-auto mb-1" />
            <div className="text-sm font-bold" style={{ color: c }}>{v}</div>
            <div className="text-[9px] text-zinc-600">{l}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <ProgressBar value={q.active} max={Math.max(total, 1)} color="#3b82f6" />
      )}
    </div>
  );
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  database:    Database,
  redis:       Cpu,
  ai_providers: Zap,
  s3:          Cloud,
  job_queue:   Package,
  default:     Server,
};
const SERVICE_NAMES: Record<string, string> = {
  database:    "قاعدة البيانات (PostgreSQL)",
  redis:       "Redis / Cache",
  ai_providers: "مزودي الـ AI",
  s3:          "تخزين S3 / R2",
  job_queue:   "طابور المهام (BullMQ)",
};

// ── Refresh countdown bar ──────────────────────────────────────────────────────
const POLL_INTERVAL = 15;

function RefreshCountdown({ onRefresh }: { onRefresh: () => void }) {
  const [secs, setSecs] = useState(POLL_INTERVAL);
  useEffect(() => {
    setSecs(POLL_INTERVAL);
    const iv = setInterval(() => {
      setSecs(s => (s <= 1 ? POLL_INTERVAL : s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [onRefresh]);

  const pct = ((POLL_INTERVAL - secs) / POLL_INTERVAL) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-1 rounded-full bg-white/6 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-blue-500/70"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>
      <span className="text-[10px] text-zinc-600 tabular-nums">{secs}ث</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
interface Props { onClose?: () => void }

export function InfrastructureDashboard({ onClose }: Props) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [queues, setQueues] = useState<QueuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTs, setLastTs] = useState<string>("");
  const [forbidden, setForbidden] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [hr, qr] = await Promise.all([
        authFetch("/api/health/status"),
        authFetch("/api/health/queues"),
      ]);

      if (hr.status === 403 || qr.status === 403) { setForbidden(true); setLoading(false); return; }

      const [hd, qd] = await Promise.all([
        hr.ok ? hr.json() as Promise<HealthStatus> : null,
        qr.ok ? qr.json() as Promise<QueuesData> : null,
      ]);

      if (hd) setHealth(hd);
      if (qd) setQueues(qd);
      setLastTs(new Date().toISOString());
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => { void load(); }, 15_000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const overall = health?.overall ?? "green";
  const overallColor = STATUS_COLOR[overall];

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#080808] gap-4" dir="rtl">
        <AlertOctagon size={40} className="text-red-400" />
        <p className="text-lg font-bold text-white">وصول مرفوض</p>
        <p className="text-sm text-zinc-500">هذه اللوحة محمية — تتطلب رتبة المشرف (Admin).</p>
        {onClose && <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/8 text-sm text-zinc-400 hover:text-white transition-colors">إغلاق</button>}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 20% 10%, ${overallColor}0c 0%, transparent 55%)`
      }} />

      {/* Header */}
      <div className="relative flex-shrink-0 px-4 pt-3 pb-[10px] border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border flex items-center justify-center"
            style={{ background: `${overallColor}1a`, borderColor: `${overallColor}30` }}>
            <Activity size={18} style={{ color: overallColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">لوحة البنية التحتية</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: `${overallColor}18`, color: overallColor, border: `1px solid ${overallColor}30` }}>
                {STATUS_LABEL[overall]}
              </span>
            </div>
            {lastTs && <p className="text-xs text-zinc-600">آخر تحديث: {fmtTime(lastTs)} · تحديث كل 15ث</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RefreshCountdown onRefresh={load} />
          <button onClick={() => { void load(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors"
            title="تحديث فوري">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-4 space-y-5">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 flex items-center gap-2 text-sm text-red-400">
              <WifiOff size={15} />
              <span>خطأ في الاتصال: {error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection status summary bar */}
        {health && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border border-white/6 bg-white/3 p-3 flex items-center gap-4 flex-wrap">
            {Object.entries(health.services).map(([key, svc]) => (
              <div key={key} className="flex items-center gap-1.5">
                <StatusDot status={svc.status} />
                <span className="text-xs text-zinc-400">{SERVICE_NAMES[key] ?? key}</span>
              </div>
            ))}
            <div className="mr-auto flex items-center gap-1.5 text-xs text-zinc-600">
              <Wifi size={11} />
              <span>مباشر</span>
            </div>
          </motion.div>
        )}

        {/* Services Grid */}
        {health && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">حالة الخدمات</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(health.services).map(([key, svc]) => {
                const Icon = SERVICE_ICONS[key] ?? SERVICE_ICONS.default;
                return (
                  <ServiceCard
                    key={key}
                    name={SERVICE_NAMES[key] ?? key}
                    info={svc}
                    icon={Icon}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Cache stats */}
        {queues?.cache && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">إحصاءات الـ Cache</h3>
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                <CacheGauge stats={queues.cache} />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">نسبة الـ Cache Hit</span>
                      <span className="font-medium text-emerald-400">{queues.cache.hitRate}</span>
                    </div>
                    <ProgressBar
                      value={queues.cache.hits}
                      max={Math.max(queues.cache.hits + queues.cache.misses, 1)}
                      color="#10b981"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-white/4 border border-white/6 p-2.5">
                      <div className="text-zinc-500 mb-0.5">إجمالي الطلبات</div>
                      <div className="text-sm font-bold text-white">{(queues.cache.hits + queues.cache.misses).toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg bg-white/4 border border-white/6 p-2.5">
                      <div className="text-zinc-500 mb-0.5">Bypass</div>
                      <div className="text-sm font-bold text-white">{queues.cache.bypasses}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Job Queues */}
        {queues?.queues && (
          <section>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">طوابير المهام (BullMQ)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(queues.queues).map(([name, data]) => (
                <QueueCard key={name} name={name} data={data} />
              ))}
            </div>
          </section>
        )}

        {/* Loading skeleton */}
        {loading && !health && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-white/4 animate-pulse" />
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
