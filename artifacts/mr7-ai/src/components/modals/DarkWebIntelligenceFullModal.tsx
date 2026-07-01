import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Eye, AlertTriangle, Terminal, Copy, CheckCheck,
  Zap, Lock, Network, Database, Activity, Target, Crosshair, Radio,
  FileSearch, Hash, Mail, Smartphone, User, Server, Wifi, Key,
  ChevronRight, ExternalLink, Bug, Cpu, ArrowRight, Layers,
  Download, MessageSquare, RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronDown, Link, Clock, FileText, Boxes, ShieldCheck, ShieldAlert,
  Trash2, Bitcoin, GitBranch, BarChart2, Radar, Satellite, Brain,
  Filter, Play, Pause, RotateCw, Settings, Info, AlertOctagon,
  TrendingUp, Map, Users, Phone, Camera, Mic, Share2, List
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

type MainTab =
  | "unified" | "email" | "network" | "domain"
  | "darkweb" | "blockchain" | "threat"
  | "graph" | "ai" | "monitoring" | "telecom"
  | "netscan" | "status";

interface Result {
  success: boolean;
  data?: unknown;
  error?: string;
}

const API_BASE = "/api/darkweb-intelligence";

const RISK_COLORS: Record<string, string> = {
  critical: "#e21227", high: "#f97316", medium: "#f59e0b", low: "#10b981", unknown: "#64748b"
};

function RiskBadge({ level }: { level: string }) {
  const color = RISK_COLORS[level] || RISK_COLORS.unknown;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border"
      style={{ color, background: `${color}20`, borderColor: `${color}40` }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {level.toUpperCase()}
    </span>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-500"}`} />;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]/20 animate-ping" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[#8b5cf6] animate-spin" />
      </div>
    </div>
  );
}

function JsonDisplay({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative">
      <button onClick={copy} className="absolute top-2 right-2 p-1 rounded text-slate-400 hover:text-white">
        {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
      <pre className="text-[9px] font-mono text-slate-300 bg-black/40 border border-[#1a1a2e] rounded-lg p-3 overflow-auto max-h-80 leading-relaxed whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color = "#8b5cf6" }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="text-[11px] font-bold font-mono uppercase tracking-widest" style={{ color }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/30 border border-[#1a1a2e] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#8b5cf6]/60 font-mono"
      />
    </div>
  );
}

function ActionButton({ onClick, loading, color = "#8b5cf6", children }: {
  onClick: () => void; loading: boolean; color?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold font-mono disabled:opacity-50 transition-all"
      style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
    >
      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Unified Search
// ────────────────────────────────────────────────────────────
function UnifiedSearchTab() {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState(["email", "ip", "darkweb"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const allTypes = ["email", "ip", "domain", "darkweb", "blockchain", "threat", "username", "hash"];

  const toggleType = (t: string) =>
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const run = async () => {
    if (!query.trim()) { toast({ title: "أدخل استعلام البحث" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, types, enrichment: true })
      });
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={Search} label="البحث الاستخباراتي الموحد" />
      <p className="text-[10px] text-slate-500">بحث شامل عبر جميع المصادر الاستخباراتية في آن واحد</p>
      <InputField label="الاستعلام" value={query} onChange={setQuery} placeholder="بريد / IP / نطاق / هاش / اسم مستخدم..." />
      <div>
        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">مصادر البحث</label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {allTypes.map(t => (
            <button key={t} onClick={() => toggleType(t)}
              className="px-2.5 py-1 rounded-lg text-[9px] font-mono border transition-all"
              style={{
                background: types.includes(t) ? "#8b5cf620" : "transparent",
                borderColor: types.includes(t) ? "#8b5cf660" : "#1a1a2e",
                color: types.includes(t) ? "#a78bfa" : "#475569"
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <ActionButton onClick={run} loading={loading}>تنفيذ البحث الموحد</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div className="space-y-3">
          {result.success ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "إجمالي النتائج", value: (result.data as any)?.total ?? 0, color: "#8b5cf6" },
                  { label: "مصادر مفحوصة", value: (result.data as any)?.results?.length ?? 0, color: "#3b82f6" },
                  { label: "الاستعلام", value: (result.data as any)?.query ?? query, color: "#10b981" }
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center">
                    <p className="text-[16px] font-black" style={{ color }}>{String(value)}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {(result.data as any)?.analysis && (
                <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-lg p-3">
                  <p className="text-[9px] font-mono text-[#8b5cf6] mb-1.5 uppercase">تحليل AI</p>
                  <p className="text-[10px] text-slate-300">{(result.data as any).analysis}</p>
                </div>
              )}
              <JsonDisplay data={result.data} />
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Email Intelligence
// ────────────────────────────────────────────────────────────
function EmailIntelTab() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    if (!email.trim()) { toast({ title: "أدخل البريد الإلكتروني" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/email/${encodeURIComponent(email)}`);
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const d = result?.success ? (result.data as any) : null;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Mail} label="استخبارات البريد الإلكتروني" color="#3b82f6" />
      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-mono">
        {["IntelX", "HudsonRock", "HIBP", "DeHashed", "EmailRep", "SpyCloud"].map(s => (
          <div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded">
            <StatusDot ok={false} />{s}
          </div>
        ))}
      </div>
      <InputField label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="target@example.com" type="email" />
      <ActionButton onClick={run} loading={loading} color="#3b82f6">تحليل البريد الإلكتروني</ActionButton>
      {loading && <Spinner />}
      {d && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "التسريبات", value: d.breaches?.length ?? 0, color: d.breaches?.length ? "#e21227" : "#10b981" },
              { label: "بيانات الاعتماد", value: d.credentials?.length ?? 0, color: d.credentials?.length ? "#f97316" : "#10b981" },
              { label: "نقاط الخطر", value: d.riskScore ?? "—", color: "#f59e0b" },
              { label: "المصادر", value: Object.keys(d.sources ?? {}).length, color: "#8b5cf6" }
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center">
                <p className="text-[18px] font-black" style={{ color }}>{String(value)}</p>
                <p className="text-[8px] text-slate-500 font-mono">{label}</p>
              </div>
            ))}
          </div>
          {d.breaches?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest">التسريبات المكتشفة</p>
              {d.breaches.slice(0, 5).map((b: any, i: number) => (
                <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white">{b.name || b.source || "تسريب مجهول"}</span>
                    <span className="text-[9px] font-mono text-red-400">{b.breachDate ? new Date(b.breachDate).getFullYear() : "—"}</span>
                  </div>
                  {b.dataClasses?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {b.dataClasses.map((dc: string) => (
                        <span key={dc} className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-mono">{dc}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <JsonDisplay data={d} />
        </div>
      )}
      {result && !result.success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="w-4 h-4 text-red-400" />
          <p className="text-[10px] text-red-300">{result.error}</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Network Intelligence
// ────────────────────────────────────────────────────────────
function NetworkIntelTab() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    if (!ip.trim()) { toast({ title: "أدخل عنوان IP" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/ip/${encodeURIComponent(ip)}`);
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const d = result?.success ? (result.data as any) : null;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Network} label="استخبارات الشبكة / IP" color="#e21227" />
      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-mono">
        {["Shodan", "Censys", "BinaryEdge", "GreyNoise", "Onyphe", "VirusTotal"].map(s => (
          <div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded">
            <StatusDot ok={false} />{s}
          </div>
        ))}
      </div>
      <InputField label="عنوان IP" value={ip} onChange={setIp} placeholder="1.2.3.4 أو 2001:db8::1" />
      <ActionButton onClick={run} loading={loading} color="#e21227">تحليل عنوان IP</ActionButton>
      {loading && <Spinner />}
      {d && (
        <div className="space-y-3">
          {d.location && (
            <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-3">
              <p className="text-[9px] font-mono text-slate-500 uppercase mb-2">الموقع الجغرافي</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                {[
                  ["المدينة", d.location.city],
                  ["الدولة", d.location.country],
                  ["المنطقة", d.location.region],
                  ["المنطقة الزمنية", d.location.timezone],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-600">{k}</span>
                    <span className="text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {d.openPorts?.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-red-400 uppercase mb-1.5">المنافذ المفتوحة ({d.openPorts.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {d.openPorts.slice(0, 20).map((p: number) => (
                  <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300">{p}</span>
                ))}
              </div>
            </div>
          )}
          {d.vulnerabilities?.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-orange-400 uppercase mb-1.5">الثغرات ({d.vulnerabilities.length})</p>
              {d.vulnerabilities.slice(0, 3).map((v: any, i: number) => (
                <div key={i} className="bg-orange-500/5 border border-orange-500/20 rounded p-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-orange-300">{v.cve || v.id}</span>
                    <RiskBadge level={v.severity || "unknown"} />
                    {v.cvss && <span className="text-[9px] font-mono text-slate-400">CVSS: {v.cvss}</span>}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1">{v.title || v.description}</p>
                </div>
              ))}
            </div>
          )}
          <JsonDisplay data={d} />
        </div>
      )}
      {result && !result.success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="w-4 h-4 text-red-400" />
          <p className="text-[10px] text-red-300">{result.error}</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Domain Intelligence
// ────────────────────────────────────────────────────────────
function DomainIntelTab() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    if (!domain.trim()) { toast({ title: "أدخل اسم النطاق" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/domain/${encodeURIComponent(domain)}`);
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const d = result?.success ? (result.data as any) : null;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Globe} label="استخبارات النطاق" color="#10b981" />
      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-mono">
        {["DomainTools", "RiskIQ", "PassiveTotal", "URLScan", "WHOIS", "Farsight DNSDB"].map(s => (
          <div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded">
            <StatusDot ok={false} />{s}
          </div>
        ))}
      </div>
      <InputField label="النطاق" value={domain} onChange={setDomain} placeholder="example.com" />
      <ActionButton onClick={run} loading={loading} color="#10b981">تحليل النطاق</ActionButton>
      {loading && <Spinner />}
      {d && (
        <div className="space-y-3">
          <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-3">
            <p className="text-[9px] font-mono text-emerald-400 uppercase mb-2">معلومات النطاق</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {[
                ["النطاق", d.domain],
                ["السجل", d.registrar?.name],
                ["تاريخ الإنشاء", d.registration?.created],
                ["تاريخ الانتهاء", d.registration?.expires],
              ].map(([k, v]) => v && (
                <div key={k as string} className="flex justify-between gap-2">
                  <span className="text-slate-600">{k}</span>
                  <span className="text-slate-300 truncate">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
          {d.message && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-300">{d.message}</p>
            </div>
          )}
          <JsonDisplay data={d} />
        </div>
      )}
      {result && !result.success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="w-4 h-4 text-red-400" />
          <p className="text-[10px] text-red-300">{result.error}</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Dark Web
// ────────────────────────────────────────────────────────────
function DarkWebTab() {
  const [activeMode, setActiveMode] = useState<"search" | "scrape" | "telegram" | "paste">("search");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [keywords, setKeywords] = useState("");
  const [scrapeType, setScrapeType] = useState("tor");
  const [sources, setSources] = useState(["tor", "telegram", "paste"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const toggleSource = (s: string) =>
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (activeMode === "search") {
        if (!query.trim()) { toast({ title: "أدخل الاستعلام" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/darkweb/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, sources, options: { keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) } })
        });
      } else if (activeMode === "scrape") {
        if (!url.trim()) { toast({ title: "أدخل الرابط" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/darkweb/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, type: scrapeType })
        });
      } else if (activeMode === "telegram") {
        if (!channel.trim()) { toast({ title: "أدخل القناة" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/darkweb/monitor/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) })
        });
      } else {
        if (!keywords.trim()) { toast({ title: "أدخل الكلمات المفتاحية" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/darkweb/monitor/paste`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: keywords.split(",").map(k => k.trim()) })
        });
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: "search", label: "بحث", icon: Search },
    { id: "scrape", label: "استخراج", icon: FileSearch },
    { id: "telegram", label: "تيليغرام", icon: MessageSquare },
    { id: "paste", label: "مواقع Paste", icon: FileText },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Globe} label="استخبارات الويب المظلم" color="#8b5cf6" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {modes.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveMode(id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-bold font-mono transition-all"
            style={{
              background: activeMode === id ? "#8b5cf620" : "transparent",
              color: activeMode === id ? "#a78bfa" : "#475569",
              border: activeMode === id ? "1px solid #8b5cf640" : "1px solid transparent"
            }}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {activeMode === "search" && (
        <div className="space-y-3">
          <InputField label="الاستعلام" value={query} onChange={setQuery} placeholder="threat actor / keyword / domain..." />
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">المصادر</label>
            <div className="flex gap-2 mt-1.5">
              {["tor", "i2p", "telegram", "paste", "darkweb"].map(s => (
                <button key={s} onClick={() => toggleSource(s)}
                  className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                  style={{
                    background: sources.includes(s) ? "#8b5cf620" : "transparent",
                    borderColor: sources.includes(s) ? "#8b5cf660" : "#1a1a2e",
                    color: sources.includes(s) ? "#a78bfa" : "#475569"
                  }}>{s}</button>
              ))}
            </div>
          </div>
          <InputField label="كلمات مفتاحية (اختياري، مفصولة بفاصلة)" value={keywords} onChange={setKeywords} placeholder="ransomware, leak, credentials..." />
        </div>
      )}

      {activeMode === "scrape" && (
        <div className="space-y-3">
          <InputField label="الرابط" value={url} onChange={setUrl} placeholder="http://example.onion" />
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">نوع الشبكة</label>
            <div className="flex gap-2 mt-1.5">
              {["tor", "i2p", "freenet", "zeronet"].map(t => (
                <button key={t} onClick={() => setScrapeType(t)}
                  className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                  style={{
                    background: scrapeType === t ? "#8b5cf620" : "transparent",
                    borderColor: scrapeType === t ? "#8b5cf660" : "#1a1a2e",
                    color: scrapeType === t ? "#a78bfa" : "#475569"
                  }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMode === "telegram" && (
        <div className="space-y-3">
          <InputField label="القناة / المجموعة" value={channel} onChange={setChannel} placeholder="@channel أو t.me/channel" />
          <InputField label="كلمات مفتاحية" value={keywords} onChange={setKeywords} placeholder="hack, leak, exploit..." />
        </div>
      )}

      {activeMode === "paste" && (
        <div className="space-y-3">
          <InputField label="كلمات مفتاحية" value={keywords} onChange={setKeywords} placeholder="email@domain.com, credentials, breach..." />
          <p className="text-[9px] text-slate-500">يراقب: Pastebin, Ghostbin, Rentry, PasteBin.pl, Hastebin وغيرها</p>
        </div>
      )}

      <ActionButton onClick={run} loading={loading} color="#8b5cf6">
        {activeMode === "search" ? "تنفيذ البحث" : activeMode === "scrape" ? "استخراج المحتوى" : activeMode === "telegram" ? "مراقبة القناة" : "مراقبة المواقع"}
      </ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-[10px] text-emerald-300">
                  تم الاسترداد بنجاح — {(result.data as any)?.total ?? (result.data as any)?.results?.length ?? ""} نتيجة
                </p>
              </div>
              <JsonDisplay data={result.data} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Blockchain Intelligence
// ────────────────────────────────────────────────────────────
function BlockchainTab() {
  const [mode, setMode] = useState<"address" | "trace" | "tx" | "monitor">("address");
  const [address, setAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [chain, setChain] = useState("bitcoin");
  const [depth, setDepth] = useState("3");
  const [addresses, setAddresses] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (mode === "address") {
        if (!address.trim()) { toast({ title: "أدخل العنوان" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/blockchain/${encodeURIComponent(address)}?chain=${chain}`);
      } else if (mode === "trace") {
        if (!address.trim()) { toast({ title: "أدخل العنوان المصدر" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/blockchain/trace`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceAddress: address, depth: parseInt(depth) })
        });
      } else if (mode === "tx") {
        if (!txHash.trim()) { toast({ title: "أدخل هاش المعاملة" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/blockchain/tx/${encodeURIComponent(txHash)}?chain=${chain}`);
      } else {
        const addrList = addresses.split(",").map(a => a.trim()).filter(Boolean);
        if (!addrList.length) { toast({ title: "أدخل العناوين" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/blockchain/monitor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: addrList })
        });
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: "address", label: "تحليل عنوان" },
    { id: "trace", label: "تتبع الأموال" },
    { id: "tx", label: "معاملة" },
    { id: "monitor", label: "مراقبة" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Bitcoin} label="استخبارات البلوك تشين" color="#f59e0b" />
      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-mono">
        {["Chainalysis", "Elliptic", "CipherTrace", "TRM Labs", "Crystal", "AnChain"].map(s => (
          <div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded">
            <StatusDot ok={false} />{s}
          </div>
        ))}
      </div>
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {modes.map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id)}
            className="flex-1 py-1.5 rounded-md text-[9px] font-bold font-mono transition-all"
            style={{
              background: mode === id ? "#f59e0b20" : "transparent",
              color: mode === id ? "#fbbf24" : "#475569",
              border: mode === id ? "1px solid #f59e0b40" : "1px solid transparent"
            }}>{label}</button>
        ))}
      </div>

      <div>
        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">السلسلة</label>
        <div className="flex gap-1.5 mt-1.5">
          {["bitcoin", "ethereum", "monero", "litecoin", "ripple"].map(c => (
            <button key={c} onClick={() => setChain(c)}
              className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
              style={{
                background: chain === c ? "#f59e0b20" : "transparent",
                borderColor: chain === c ? "#f59e0b60" : "#1a1a2e",
                color: chain === c ? "#fbbf24" : "#475569"
              }}>{c}</button>
          ))}
        </div>
      </div>

      {(mode === "address" || mode === "trace") && (
        <InputField label="عنوان المحفظة" value={address} onChange={setAddress} placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf..." />
      )}
      {mode === "tx" && (
        <InputField label="هاش المعاملة" value={txHash} onChange={setTxHash} placeholder="a1075db55d416d3ca199f55b6084e211..." />
      )}
      {mode === "trace" && (
        <InputField label="عمق التتبع (1-10)" value={depth} onChange={setDepth} placeholder="3" type="number" />
      )}
      {mode === "monitor" && (
        <InputField label="عناوين المراقبة (مفصولة بفاصلة)" value={addresses} onChange={setAddresses} placeholder="addr1,addr2,addr3..." />
      )}

      <ActionButton onClick={run} loading={loading} color="#f59e0b">تحليل البلوك تشين</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              {(result.data as any)?.riskScore !== undefined && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300">درجة المخاطرة</span>
                    <span className="text-[20px] font-black text-amber-400">{(result.data as any).riskScore}</span>
                  </div>
                  {(result.data as any)?.mixingDetected && (
                    <p className="text-[9px] text-red-300 mt-1">⚠ تم اكتشاف عمليات تمويه (Mixing)</p>
                  )}
                </div>
              )}
              <JsonDisplay data={result.data} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Threat Intelligence
// ────────────────────────────────────────────────────────────
function ThreatIntelTab() {
  const [mode, setMode] = useState<"ioc" | "actor" | "classify" | "alert">("ioc");
  const [ioc, setIoc] = useState("");
  const [iocType, setIocType] = useState("ip");
  const [actor, setActor] = useState("");
  const [description, setDescription] = useState("");
  const [alertName, setAlertName] = useState("");
  const [alertQuery, setAlertQuery] = useState("");
  const [severity, setSeverity] = useState("high");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (mode === "ioc") {
        if (!ioc.trim()) { toast({ title: "أدخل مؤشر الاختراق" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/threat/ioc/${encodeURIComponent(ioc)}?type=${iocType}`);
      } else if (mode === "actor") {
        if (!actor.trim()) { toast({ title: "أدخل اسم الجهة" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/threat/actor/${encodeURIComponent(actor)}`);
      } else if (mode === "classify") {
        if (!description.trim()) { toast({ title: "أدخل الوصف" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/threat/classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description })
        });
      } else {
        if (!alertName.trim()) { toast({ title: "أدخل اسم التنبيه" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/threat/alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: alertName, query: alertQuery, severity, notify: true })
        });
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: "ioc", label: "تحليل IOC" },
    { id: "actor", label: "جهة التهديد" },
    { id: "classify", label: "تصنيف AI" },
    { id: "alert", label: "إنشاء تنبيه" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionTitle icon={ShieldAlert} label="استخبارات التهديدات" color="#e21227" />
      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 font-mono">
        {["Recorded Future", "Anomali", "Flashpoint", "Kela", "AlienVault OTX", "MISP"].map(s => (
          <div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded">
            <StatusDot ok={false} />{s}
          </div>
        ))}
      </div>
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {modes.map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id)}
            className="flex-1 py-1.5 rounded-md text-[9px] font-bold font-mono transition-all"
            style={{
              background: mode === id ? "#e2122720" : "transparent",
              color: mode === id ? "#f87171" : "#475569",
              border: mode === id ? "1px solid #e2122740" : "1px solid transparent"
            }}>{label}</button>
        ))}
      </div>

      {mode === "ioc" && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">نوع المؤشر</label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {["ip", "domain", "url", "hash", "email", "mutex", "registry"].map(t => (
                <button key={t} onClick={() => setIocType(t)}
                  className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                  style={{
                    background: iocType === t ? "#e2122720" : "transparent",
                    borderColor: iocType === t ? "#e2122760" : "#1a1a2e",
                    color: iocType === t ? "#f87171" : "#475569"
                  }}>{t}</button>
              ))}
            </div>
          </div>
          <InputField label="مؤشر الاختراق (IOC)" value={ioc} onChange={setIoc} placeholder="IP / domain / hash / URL..." />
        </div>
      )}
      {mode === "actor" && <InputField label="اسم جهة التهديد" value={actor} onChange={setActor} placeholder="APT28, Lazarus, REvil..." />}
      {mode === "classify" && (
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">وصف التهديد</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="صف الحادثة الأمنية أو التهديد للتصنيف الذكي..."
            className="w-full h-24 bg-black/30 border border-[#1a1a2e] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#e21227]/60 font-mono resize-none"
          />
        </div>
      )}
      {mode === "alert" && (
        <div className="space-y-3">
          <InputField label="اسم التنبيه" value={alertName} onChange={setAlertName} placeholder="Ransomware Alert Q1 2025" />
          <InputField label="استعلام البحث" value={alertQuery} onChange={setAlertQuery} placeholder="ransomware OR darkweb leak" />
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">الخطورة</label>
            <div className="flex gap-2 mt-1.5">
              {["critical", "high", "medium", "low"].map(s => (
                <button key={s} onClick={() => setSeverity(s)}
                  className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                  style={{
                    background: severity === s ? `${RISK_COLORS[s]}20` : "transparent",
                    borderColor: severity === s ? `${RISK_COLORS[s]}60` : "#1a1a2e",
                    color: severity === s ? RISK_COLORS[s] : "#475569"
                  }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ActionButton onClick={run} loading={loading} color="#e21227">تحليل التهديد</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-[10px] text-emerald-300">تم التحليل بنجاح</p>
              </div>
              <JsonDisplay data={result.data} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Graph Analysis
// ────────────────────────────────────────────────────────────
function GraphAnalysisTab() {
  const [mode, setMode] = useState<"correlate" | "paths" | "query">("correlate");
  const [value, setValue] = useState("");
  const [correlateType, setCorrelateType] = useState("email");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [maxDepth, setMaxDepth] = useState("4");
  const [cypher, setCypher] = useState("MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 25");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (mode === "correlate") {
        if (!value.trim()) { toast({ title: "أدخل القيمة" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/graph/correlate/${correlateType}/${encodeURIComponent(value)}`);
      } else if (mode === "paths") {
        r = await fetch(`${API_BASE}/graph/paths`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, targetId, maxDepth: parseInt(maxDepth) })
        });
      } else {
        r = await fetch(`${API_BASE}/graph/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cypher, parameters: {} })
        });
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={GitBranch} label="تحليل الرسم البياني — Neo4j" color="#06b6d4" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {[
          { id: "correlate", label: "ربط البيانات" },
          { id: "paths", label: "مسارات العلاقة" },
          { id: "query", label: "استعلام Cypher" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id as typeof mode)}
            className="flex-1 py-1.5 rounded-md text-[9px] font-bold font-mono transition-all"
            style={{
              background: mode === id ? "#06b6d420" : "transparent",
              color: mode === id ? "#22d3ee" : "#475569",
              border: mode === id ? "1px solid #06b6d440" : "1px solid transparent"
            }}>{label}</button>
        ))}
      </div>

      {mode === "correlate" && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">نوع الكيان</label>
            <div className="flex gap-2 mt-1.5">
              {["email", "ip", "domain"].map(t => (
                <button key={t} onClick={() => setCorrelateType(t)}
                  className="px-3 py-1 rounded text-[9px] font-mono border transition-all"
                  style={{
                    background: correlateType === t ? "#06b6d420" : "transparent",
                    borderColor: correlateType === t ? "#06b6d460" : "#1a1a2e",
                    color: correlateType === t ? "#22d3ee" : "#475569"
                  }}>{t}</button>
              ))}
            </div>
          </div>
          <InputField label="القيمة" value={value} onChange={setValue} placeholder="email@example.com / 1.2.3.4 / domain.com" />
        </div>
      )}
      {mode === "paths" && (
        <div className="space-y-3">
          <InputField label="معرف العقدة المصدر" value={sourceId} onChange={setSourceId} placeholder="node-id-1" />
          <InputField label="معرف العقدة الهدف" value={targetId} onChange={setTargetId} placeholder="node-id-2" />
          <InputField label="أقصى عمق" value={maxDepth} onChange={setMaxDepth} placeholder="4" type="number" />
        </div>
      )}
      {mode === "query" && (
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">استعلام Cypher</label>
          <textarea
            value={cypher} onChange={e => setCypher(e.target.value)}
            className="w-full h-20 bg-black/40 border border-[#06b6d4]/30 rounded-lg px-3 py-2 text-[10px] text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-[#06b6d4]/60 font-mono resize-none"
          />
          <p className="text-[8px] text-slate-600">ملاحظة: عمليات الحذف (DELETE/DROP/REMOVE) محظورة</p>
        </div>
      )}

      <ActionButton onClick={run} loading={loading} color="#06b6d4">تنفيذ التحليل</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              {(result.data as any)?.nodes && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center">
                    <p className="text-[18px] font-black text-cyan-400">{(result.data as any).nodes?.length ?? 0}</p>
                    <p className="text-[8px] text-slate-500">عقدة</p>
                  </div>
                  <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center">
                    <p className="text-[18px] font-black text-cyan-400">{(result.data as any).relationships?.length ?? 0}</p>
                    <p className="text-[8px] text-slate-500">علاقة</p>
                  </div>
                </div>
              )}
              <JsonDisplay data={result.data} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: AI Analysis
// ────────────────────────────────────────────────────────────
function AIAnalysisTab() {
  const [mode, setMode] = useState<"analyze" | "report" | "query" | "predict">("analyze");
  const [input, setInput] = useState("");
  const [template, setTemplate] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    if (!input.trim()) { toast({ title: "أدخل البيانات" }); return; }
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (mode === "analyze") {
        r = await fetch(`${API_BASE}/ai/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: input })
        });
      } else if (mode === "report") {
        r = await fetch(`${API_BASE}/ai/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: input, template })
        });
      } else if (mode === "query") {
        r = await fetch(`${API_BASE}/ai/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: input })
        });
      } else {
        r = await fetch(`${API_BASE}/ai/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historicalData: input })
        });
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle icon={Brain} label="تحليل الذكاء الاصطناعي" color="#a78bfa" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {[
          { id: "analyze", label: "تحليل الأنماط" },
          { id: "report", label: "توليد تقرير" },
          { id: "query", label: "استعلام طبيعي" },
          { id: "predict", label: "توقع التهديدات" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setMode(id as typeof mode)}
            className="flex-1 py-1.5 rounded-md text-[9px] font-bold font-mono transition-all"
            style={{
              background: mode === id ? "#a78bfa20" : "transparent",
              color: mode === id ? "#c4b5fd" : "#475569",
              border: mode === id ? "1px solid #a78bfa40" : "1px solid transparent"
            }}>{label}</button>
        ))}
      </div>

      {mode === "report" && (
        <div>
          <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">قالب التقرير</label>
          <div className="flex gap-2 mt-1.5">
            {["standard", "executive", "technical", "incident"].map(t => (
              <button key={t} onClick={() => setTemplate(t)}
                className="px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                style={{
                  background: template === t ? "#a78bfa20" : "transparent",
                  borderColor: template === t ? "#a78bfa60" : "#1a1a2e",
                  color: template === t ? "#c4b5fd" : "#475569"
                }}>{t}</button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
          {mode === "query" ? "الاستعلام بالغة الطبيعية" : mode === "predict" ? "البيانات التاريخية (JSON)" : "البيانات للتحليل"}
        </label>
        <textarea
          value={input} onChange={e => setInput(e.target.value)}
          placeholder={
            mode === "query" ? "ما هي أحدث هجمات APT في المنطقة العربية؟" :
            mode === "predict" ? '[{"date":"2025-01-01","events":[...]}]' :
            'أدخل البيانات أو JSON للتحليل...'
          }
          className="w-full h-28 bg-black/30 border border-[#1a1a2e] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#a78bfa]/60 font-mono resize-none"
        />
      </div>

      <ActionButton onClick={run} loading={loading} color="#a78bfa">
        {mode === "analyze" ? "تحليل البيانات" : mode === "report" ? "توليد التقرير" : mode === "query" ? "معالجة الاستعلام" : "توقع التهديدات"}
      </ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              {typeof (result.data as any)?.report === "string" ? (
                <div className="bg-black/30 border border-[#a78bfa]/20 rounded-lg p-3">
                  <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{(result.data as any).report}</p>
                </div>
              ) : (
                <JsonDisplay data={result.data} />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Network Scan (Shodan Advanced)
// ────────────────────────────────────────────────────────────
function NetworkScanTab() {
  const [activeTarget, setActiveTarget] = useState<"scada" | "webcams" | "databases" | "rdp" | "iot" | "monitor">("scada");
  const [monitorQuery, setMonitorQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r: Response;
      if (activeTarget === "monitor") {
        if (!monitorQuery.trim()) { toast({ title: "أدخل استعلام المراقبة" }); setLoading(false); return; }
        r = await fetch(`${API_BASE}/network/monitor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: monitorQuery })
        });
      } else {
        r = await fetch(`${API_BASE}/network/${activeTarget}`);
      }
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const targets = [
    { id: "scada", label: "ICS/SCADA", icon: Cpu, desc: "أنظمة التحكم الصناعي المكشوفة" },
    { id: "webcams", label: "كاميرات", icon: Camera, desc: "كاميرات المراقبة غير المحمية" },
    { id: "databases", label: "قواعد بيانات", icon: Database, desc: "قواعد البيانات المكشوفة" },
    { id: "rdp", label: "RDP", icon: Monitor, desc: "خوادم سطح المكتب البعيد" },
    { id: "iot", label: "IoT", icon: Wifi, desc: "أجهزة إنترنت الأشياء الضعيفة" },
    { id: "monitor", label: "مراقبة مخصصة", icon: Radar, desc: "إنشاء مراقبة مخصصة" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionTitle icon={Radar} label="مسح الشبكة — Shodan Enterprise" color="#ec4899" />
      <div className="grid grid-cols-3 gap-2">
        {targets.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} onClick={() => setActiveTarget(id)}
            className="flex flex-col items-start p-2.5 rounded-lg border transition-all text-left"
            style={{
              background: activeTarget === id ? "#ec489920" : "black",
              borderColor: activeTarget === id ? "#ec489960" : "#1a1a2e",
              color: activeTarget === id ? "#f472b6" : "#475569"
            }}>
            <Icon className="w-4 h-4 mb-1" />
            <p className="text-[9px] font-bold">{label}</p>
            <p className="text-[8px] opacity-70 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {activeTarget === "monitor" && (
        <InputField label="استعلام Shodan المخصص" value={monitorQuery} onChange={setMonitorQuery} placeholder='port:3389 country:SA os:"Windows Server"' />
      )}

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[9px] text-amber-300">لأغراض الأمن الدفاعي والتقييم الأمني المرخص فقط</p>
        </div>
      </div>

      <ActionButton onClick={run} loading={loading} color="#ec4899">تنفيذ المسح</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success ? (
            <div className="space-y-3">
              {(result.data as any)?.total !== undefined && (
                <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3 text-center">
                  <p className="text-[22px] font-black text-pink-400">{(result.data as any).total}</p>
                  <p className="text-[9px] text-slate-500 font-mono">إجمالي الأنظمة المكتشفة</p>
                </div>
              )}
              <JsonDisplay data={result.data} />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Missing Monitor icon workaround
const Monitor = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// ────────────────────────────────────────────────────────────
// TAB: Real-time Monitoring
// ────────────────────────────────────────────────────────────
function MonitoringTab() {
  const monitors = [
    { label: "Dark Web Forums", color: "#8b5cf6", active: false, feeds: ["RaidForums", "BreachForums", "XSS.is", "Exploit.in"] },
    { label: "Ransomware Leak Sites", color: "#e21227", active: true, feeds: ["LockBit", "ALPHV/BlackCat", "Cl0p", "Play"] },
    { label: "Paste Sites", color: "#f97316", active: true, feeds: ["Pastebin", "Ghostbin", "Rentry", "Hastebin"] },
    { label: "Telegram Channels", color: "#3b82f6", active: false, feeds: ["Dark Web Intel", "Leak Channels", "Hacker Groups"] },
    { label: "Social Media (OSINT)", color: "#10b981", active: false, feeds: ["Twitter/X", "Reddit", "GitHub", "LinkedIn"] },
    { label: "Threat Feeds", color: "#06b6d4", active: true, feeds: ["AlienVault OTX", "MISP", "Abuse.ch", "MalwareBazaar"] },
  ];

  const [statuses, setStatuses] = useState(monitors.map(m => m.active));

  const toggle = (i: number) => setStatuses(prev => prev.map((s, j) => j === i ? !s : s));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Radio} label="المراقبة الفورية المستمرة" color="#22c55e" />
      <div className="grid grid-cols-1 gap-2">
        {monitors.map((m, i) => (
          <div key={m.label} className="flex items-start justify-between p-3 bg-black/30 border border-[#1a1a2e] rounded-lg gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: statuses[i] ? m.color : "#374151" }} />
                <span className="text-[10px] font-bold" style={{ color: statuses[i] ? m.color : "#475569" }}>{m.label}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{
                  background: statuses[i] ? `${m.color}20` : "transparent",
                  border: `1px solid ${statuses[i] ? m.color + "40" : "#1a1a2e"}`,
                  color: statuses[i] ? m.color : "#374151"
                }}>{statuses[i] ? "نشط" : "متوقف"}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.feeds.map(f => (
                  <span key={f} className="text-[8px] font-mono text-slate-600 px-1.5 py-0.5 rounded bg-black/30 border border-[#1a1a2e]">{f}</span>
                ))}
              </div>
            </div>
            <button onClick={() => toggle(i)}
              className="shrink-0 w-10 h-5 rounded-full relative transition-all"
              style={{ background: statuses[i] ? m.color : "#1e293b" }}>
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
                style={{ left: statuses[i] ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-3">
        <p className="text-[9px] font-mono text-slate-500 uppercase mb-2">آخر التنبيهات الحية</p>
        <div className="space-y-2">
          {[
            { time: "منذ 2 دقيقة", text: "تسريب جديد في BreachForums - 2.3M سجل", color: "#e21227" },
            { time: "منذ 15 دقيقة", text: "ضحية جديدة لـ LockBit — قطاع الرعاية الصحية", color: "#f97316" },
            { time: "منذ 1 ساعة", text: "مؤشر اختراق جديد في AlienVault OTX", color: "#f59e0b" },
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded border border-[#1a1a2e] bg-black/20">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: a.color }} />
              <div>
                <p className="text-[9px] text-slate-400">{a.text}</p>
                <p className="text-[8px] text-slate-600 font-mono">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Telecom Intelligence
// ────────────────────────────────────────────────────────────
function TelecomTab() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const analyzePhone = async () => {
    if (!phone.trim()) { toast({ title: "أدخل رقم الهاتف" }); return; }
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: phone, types: ["email"], enrichment: true })
      });
      setResult(await r.json());
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    { label: "Truecaller", desc: "البحث بالاسم وعكس رقم الهاتف", color: "#3b82f6", available: false },
    { label: "NumVerify", desc: "التحقق من الرقم والمشغل", color: "#10b981", available: false },
    { label: "SS7 Intelligence", desc: "تحديد الموقع عبر شبكة SS7", color: "#e21227", available: false },
    { label: "IMSI Catcher", desc: "استهداف IMSI/IMEI", color: "#f97316", available: false },
    { label: "Cellebrite", desc: "استخراج البيانات الجنائية", color: "#8b5cf6", available: false },
    { label: "HLR Lookup", desc: "فحص مستوى التوجيه المنزلي", color: "#06b6d4", available: false },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle icon={Phone} label="استخبارات الاتصالات" color="#06b6d4" />
      <InputField label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="+966501234567" />
      <div className="grid grid-cols-2 gap-2">
        {tools.map(t => (
          <div key={t.label} className="flex items-start gap-2 p-2.5 bg-black/30 border border-[#1a1a2e] rounded-lg">
            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: t.available ? t.color : "#374151" }} />
            <div>
              <p className="text-[9px] font-bold" style={{ color: t.available ? t.color : "#475569" }}>{t.label}</p>
              <p className="text-[8px] text-slate-600">{t.desc}</p>
              {!t.available && <p className="text-[7px] text-slate-700 font-mono">يتطلب مفتاح API</p>}
            </div>
          </div>
        ))}
      </div>
      <ActionButton onClick={analyzePhone} loading={loading} color="#06b6d4">تحليل رقم الهاتف</ActionButton>
      {loading && <Spinner />}
      {result && (
        <div>
          {result.success
            ? <JsonDisplay data={result.data} />
            : <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="w-4 h-4 text-red-400" /><p className="text-[10px] text-red-300">{result.error}</p>
            </div>
          }
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: Services Status
// ────────────────────────────────────────────────────────────
function StatusTab() {
  const [status, setStatus] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/status`);
      setStatus(await r.json());
    } catch (e: any) {
      setStatus({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const d = status?.success ? (status.data as any) : null;

  const serviceLabels: Record<string, string> = {
    intelx: "IntelX", shodan: "Shodan", hudsonrock: "HudsonRock",
    recordedFuture: "Recorded Future", chainalysis: "Chainalysis",
    neo4j: "Neo4j Graph DB", openai: "OpenAI / AI Analysis"
  };
  const featureLabels: Record<string, string> = {
    darkWebSearch: "Dark Web Search", blockchainTracking: "Blockchain Tracking",
    threatIntelligence: "Threat Intelligence", networkIntelligence: "Network Intelligence",
    emailIntelligence: "Email Intelligence", aiCorrelation: "AI Correlation",
    graphAnalysis: "Graph Analysis", torScraping: "Tor Scraping",
    telegramMonitoring: "Telegram Monitoring", pasteMonitoring: "Paste Monitoring"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Activity} label="حالة الخدمات والمفاتيح" color="#22c55e" />
        <button onClick={fetchStatus} disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 disabled:opacity-50">
          <RotateCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> تحديث
        </button>
      </div>

      {loading && <Spinner />}

      {d && (
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-2 tracking-widest">مفاتيح API</p>
            <div className="space-y-1.5">
              {Object.entries(d.services ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg">
                  <span className="text-[10px] font-mono text-slate-300">{serviceLabels[k] || k}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusDot ok={!!v} />
                    <span className="text-[9px] font-mono" style={{ color: v ? "#10b981" : "#e21227" }}>{v ? "متصل" : "غير مهيأ"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-2 tracking-widest">الميزات المتاحة</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(d.features ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 px-2 py-1.5 bg-black/20 border border-[#1a1a2e] rounded-lg">
                  <StatusDot ok={!!v} />
                  <span className="text-[9px] font-mono" style={{ color: v ? "#10b981" : "#475569" }}>{featureLabels[k] || k}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg">
            <span className="text-[9px] font-mono text-slate-500">إصدار المنظومة</span>
            <span className="text-[9px] font-mono text-[#8b5cf6]">{d.version ?? "—"}</span>
          </div>
        </div>
      )}

      {status && !status.success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <XCircle className="w-4 h-4 text-red-400" />
          <p className="text-[10px] text-red-300">{status.error}</p>
        </div>
      )}

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
        <p className="text-[9px] font-bold text-amber-400 font-mono">لتفعيل الخدمات</p>
        <p className="text-[9px] text-amber-300/80">أضف مفاتيح API إلى متغيرات البيئة في Replit Secrets:</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {["INTELX_API_KEY", "SHODAN_API_KEY", "RF_API_KEY", "CHAINALYSIS_API_KEY", "OPENAI_API_KEY", "NEO4J_URI"].map(k => (
            <code key={k} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{k}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export function DarkWebIntelligenceFullModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>("unified");

  const tabs: { id: MainTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "unified",    label: "بحث موحد",       icon: Search,      color: "#8b5cf6" },
    { id: "email",      label: "استخبارات البريد", icon: Mail,        color: "#3b82f6" },
    { id: "network",    label: "استخبارات الشبكة", icon: Network,     color: "#e21227" },
    { id: "domain",     label: "استخبارات النطاق", icon: Globe,       color: "#10b981" },
    { id: "darkweb",    label: "الويب المظلم",     icon: Eye,         color: "#8b5cf6" },
    { id: "blockchain", label: "البلوك تشين",      icon: Bitcoin,     color: "#f59e0b" },
    { id: "threat",     label: "التهديدات",        icon: ShieldAlert, color: "#e21227" },
    { id: "graph",      label: "الرسم البياني",    icon: GitBranch,   color: "#06b6d4" },
    { id: "ai",         label: "تحليل AI",         icon: Brain,       color: "#a78bfa" },
    { id: "monitoring", label: "مراقبة فورية",     icon: Radio,       color: "#22c55e" },
    { id: "telecom",    label: "الاتصالات",        icon: Phone,       color: "#06b6d4" },
    { id: "netscan",    label: "مسح الشبكة",       icon: Radar,       color: "#ec4899" },
    { id: "status",     label: "حالة الخدمات",     icon: Activity,    color: "#22c55e" },
  ];

  const activeColor = tabs.find(t => t.id === activeTab)?.color ?? "#8b5cf6";

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl border overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)",
            borderColor: `${activeColor}30`,
            boxShadow: `0 0 60px ${activeColor}20, 0 0 120px ${activeColor}10`
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
            style={{ borderColor: `${activeColor}20`, background: `linear-gradient(to right, ${activeColor}10, transparent)` }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${activeColor}20`, border: `1px solid ${activeColor}40` }}>
                <Eye className="w-4 h-4" style={{ color: activeColor }} />
              </div>
              <div>
                <h1 className="text-[13px] font-black text-white tracking-wide">DARK WEB INTELLIGENCE</h1>
                <p className="text-[9px] font-mono" style={{ color: activeColor }}>منظومة الاستخبارات الرقمية المتكاملة — Military Grade</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-mono"
                style={{ color: "#22c55e", borderColor: "#22c55e40", background: "#22c55e10" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                نظام نشط
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar Navigation */}
            <div className="w-44 shrink-0 border-r border-[#1a1a2e] flex flex-col py-2 gap-0.5 overflow-y-auto"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              {tabs.map(({ id, label, icon: Icon, color }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-left transition-all"
                  style={{
                    background: activeTab === id ? `${color}20` : "transparent",
                    border: activeTab === id ? `1px solid ${color}30` : "1px solid transparent",
                    color: activeTab === id ? color : "#475569"
                  }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[9px] font-bold truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}>
                  {activeTab === "unified"    && <UnifiedSearchTab />}
                  {activeTab === "email"      && <EmailIntelTab />}
                  {activeTab === "network"    && <NetworkIntelTab />}
                  {activeTab === "domain"     && <DomainIntelTab />}
                  {activeTab === "darkweb"    && <DarkWebTab />}
                  {activeTab === "blockchain" && <BlockchainTab />}
                  {activeTab === "threat"     && <ThreatIntelTab />}
                  {activeTab === "graph"      && <GraphAnalysisTab />}
                  {activeTab === "ai"         && <AIAnalysisTab />}
                  {activeTab === "monitoring" && <MonitoringTab />}
                  {activeTab === "telecom"    && <TelecomTab />}
                  {activeTab === "netscan"    && <NetworkScanTab />}
                  {activeTab === "status"     && <StatusTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-2 border-t shrink-0"
            style={{ borderColor: "#1a1a2e", background: "rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-mono text-slate-600">Yode9 OSINT Platform v2.0 Military-Grade</span>
              <span className="text-[8px] font-mono text-slate-700">|</span>
              <span className="text-[8px] font-mono text-slate-600">13 نظام استخباراتي متكامل</span>
            </div>
            <div className="flex items-center gap-1.5">
              {["IntelX", "Shodan", "Chainalysis", "Neo4j", "RecordedFuture"].map(s => (
                <span key={s} className="text-[7px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a2e] text-slate-700">{s}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DarkWebIntelligenceFullModal;
