import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

type ServiceStatus = "green" | "yellow" | "red";

interface ServiceEntry {
  status: ServiceStatus;
  detail: string;
  latencyMs?: number;
}

interface StatusResponse {
  overall: ServiceStatus;
  services: Record<string, ServiceEntry>;
  ts: string;
}

const LABELS: Record<string, string> = {
  database: "قاعدة البيانات",
  redis: "Redis",
  ai_providers: "مزودو الذكاء الاصطناعي",
};

function Badge({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, { icon: ReactNode; text: string; classes: string }> = {
    green: { icon: <CheckCircle2 className="w-4 h-4" />, text: "يعمل بشكل طبيعي", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    yellow: { icon: <AlertTriangle className="w-4 h-4" />, text: "أداء منخفض", classes: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    red: { icon: <XCircle className="w-4 h-4" />, text: "متوقف", classes: "bg-red-500/10 text-red-400 border-red-500/30" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${s.classes}`}>
      {s.icon}
      {s.text}
    </span>
  );
}

export default function StatusPage() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health/status");
      const json = (await res.json()) as StatusResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل حالة النظام");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',sans-serif]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> الرئيسية
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF3C00] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">KaliGPT</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-[#FF3C00] mb-2">SYSTEM / STATUS</div>
            <h1 className="text-4xl font-bold text-white mb-3">حالة النظام</h1>
            {data && <p className="text-white/40 text-sm">آخر فحص: {new Date(data.ts).toLocaleString("ar")}</p>}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm border border-white/10 rounded-lg px-3 py-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-8 p-4 rounded-lg border border-white/10 flex items-center justify-between">
              <span className="text-white/70 text-sm">الحالة العامة</span>
              <Badge status={data.overall} />
            </div>

            <div className="space-y-3">
              {Object.entries(data.services).map(([key, svc]) => (
                <div key={key} className="p-4 rounded-lg border border-white/10 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{LABELS[key] ?? key}</div>
                    <div className="text-xs text-white/40 mt-1 truncate">{svc.detail}</div>
                    {typeof svc.latencyMs === "number" && (
                      <div className="text-xs text-white/30 mt-0.5">{svc.latencyMs}ms</div>
                    )}
                  </div>
                  <Badge status={svc.status} />
                </div>
              ))}
            </div>
          </>
        )}

        {loading && !data && (
          <div className="text-white/40 text-sm">جارٍ فحص حالة النظام...</div>
        )}
      </div>
    </div>
  );
}
