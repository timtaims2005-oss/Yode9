/**
 * Yode9 Security Hub — Full Feature Dashboard
 * 30-Agent Swarm + OSINT + Malware + CVE + Tickets + Reports
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Bot, Search, Bug, AlertTriangle, FileText, Ticket,
  Activity, Cpu, Globe, Database, Zap, RefreshCw, Play, X,
  CheckCircle, XCircle, Clock, Upload, Download, Eye, Lock,
  Target, Network, Server, Code2, Hash, Siren, BarChart3,
  TrendingUp, Users, Key, Fingerprint, Radar, ChevronRight,
  Terminal, BookOpen, ExternalLink,
} from "lucide-react";

// ── Backend URL ────────────────────────────────────────────────────────────────
const BACKEND = "";  // relative — Flask proxy via vite

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${BACKEND}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ── TABS ───────────────────────────────────────────────────────────────────────
type TabId = "swarm" | "osint" | "malware" | "network" | "cve" | "tickets" | "reports";

const TABS: { id: TabId; label: string; icon: typeof Shield; color: string }[] = [
  { id: "swarm",   label: "30 وكيل AI",      icon: Bot,          color: "#a855f7" },
  { id: "osint",   label: "OSINT متقدم",      icon: Globe,        color: "#00e5ff" },
  { id: "malware", label: "تحليل البرمجيات",  icon: Bug,          color: "#ef4444" },
  { id: "network", label: "فحص الشبكة",       icon: Network,      color: "#10b981" },
  { id: "cve",     label: "CVE/NVD",           icon: AlertTriangle, color: "#f59e0b" },
  { id: "tickets", label: "نظام التذاكر",     icon: Ticket,       color: "#3b82f6" },
  { id: "reports", label: "تقارير PDF",        icon: FileText,     color: "#8b5cf6" },
];

// ── SEVERITY BADGE ─────────────────────────────────────────────────────────────
function SevBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
    CLEAN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    INFO: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colors[level] || colors.INFO}`}>
      {level}
    </span>
  );
}

// ── SWARM TAB ──────────────────────────────────────────────────────────────────
function SwarmTab() {
  const [swarmStatus, setSwarmStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [taskType, setTaskType] = useState("full_audit");
  const [taskResult, setTaskResult] = useState<any>(null);
  const [taskId, setTaskId] = useState("");
  const [polling, setPolling] = useState(false);
  const [streamEvents, setStreamEvents] = useState<string[]>([]);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/api/agents/status");
      setSwarmStatus(data);
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const dispatch = async () => {
    if (!target.trim()) return;
    setLoading(true);
    setTaskResult(null);
    setStreamEvents([]);
    try {
      const data = await apiFetch("/api/agents/analyze", {
        method: "POST",
        body: JSON.stringify({ target, mode: taskType }),
      });
      setTaskId(data.task_id);
      setPolling(true);
      // Poll for result
      const pollInterval = setInterval(async () => {
        try {
          const result = await apiFetch(`/api/agents/task/${data.task_id}`);
          if (result.status === "completed") {
            setTaskResult(result);
            setPolling(false);
            clearInterval(pollInterval);
          }
        } catch {}
      }, 2000);
      setTimeout(() => { clearInterval(pollInterval); setPolling(false); }, 120000);
    } catch (e: any) {
      setStreamEvents(prev => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const taskTypes = [
    { value: "full_audit",    label: "تدقيق أمني كامل" },
    { value: "security_scan", label: "فحص أمني" },
    { value: "osint",         label: "OSINT" },
    { value: "malware",       label: "تحليل برمجيات خبيثة" },
    { value: "cve_research",  label: "بحث CVE" },
    { value: "network_recon", label: "استطلاع شبكة" },
    { value: "dark_web",      label: "الويب المظلم" },
  ];

  return (
    <div className="space-y-4">
      {/* Swarm Status */}
      {swarmStatus && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-purple-400">{swarmStatus.total_agents}</div>
            <div className="text-xs text-white/50 mt-1">إجمالي الوكلاء</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-green-400">{swarmStatus.idle}</div>
            <div className="text-xs text-white/50 mt-1">جاهز للعمل</div>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-cyan-400">{swarmStatus.busy}</div>
            <div className="text-xs text-white/50 mt-1">نشط</div>
          </div>
        </div>
      )}

      {/* Dispatch Form */}
      <div className="bg-[#0f0f1a] border border-purple-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
          <Zap className="w-4 h-4" /> نشر وكلاء AI
        </h3>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="أدخل الهدف (IP / نطاق / URL / ملف)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          onKeyDown={e => e.key === "Enter" && dispatch()}
        />
        <select
          value={taskType}
          onChange={e => setTaskType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          {taskTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={dispatch}
          disabled={loading || polling || !target.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {loading || polling ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> جاري تحليل بـ {swarmStatus?.total_agents || 30} وكيل...</>
          ) : (
            <><Play className="w-4 h-4" /> ابدأ التحليل</>
          )}
        </button>
      </div>

      {/* Task Result */}
      {taskResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f0f1a] border border-green-500/20 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> نتائج التحليل
            </h3>
            <span className="text-xs text-white/30">{taskResult.task_id}</span>
          </div>

          {taskResult.synthesis?.executive_summary && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
              <div className="text-xs font-bold text-green-400 mb-2">ملخص تنفيذي</div>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                {taskResult.synthesis.executive_summary.slice(0, 800)}
              </p>
            </div>
          )}

          {taskResult.results && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-white/50">تقارير الوكلاء ({Object.keys(taskResult.results).length})</div>
              {Object.entries(taskResult.results).map(([role, res]: [string, any]) => (
                <details key={role} className="bg-white/5 rounded-lg border border-white/10">
                  <summary className="px-3 py-2 text-xs font-bold text-white/70 cursor-pointer hover:text-white flex items-center gap-2">
                    <Bot className="w-3 h-3 text-purple-400" />
                    {role.replace(/_/g, " ").toUpperCase()}
                    {res.provider && <span className="text-white/30 font-normal ml-auto">({res.provider})</span>}
                  </summary>
                  <div className="px-3 pb-3 text-xs text-white/60 whitespace-pre-wrap leading-relaxed">
                    {(res.analysis || res.error || "").slice(0, 500)}
                  </div>
                </details>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Agent Grid */}
      {swarmStatus?.agents && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-white/50">قائمة الوكلاء ({swarmStatus.agents.length})</div>
          <div className="grid grid-cols-2 gap-2">
            {swarmStatus.agents.slice(0, 16).map((agent: any) => (
              <div key={agent.agent_id}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${agent.status === "idle" ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                <span className="text-xs text-white/60 truncate">{agent.role.replace(/_/g, " ")}</span>
                <span className="text-xs text-white/30 ml-auto">#{agent.instance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OSINT TAB ──────────────────────────────────────────────────────────────────
function OsintTab() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sources, setSources] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/osint/advanced/sources").then(setSources).catch(() => {});
  }, []);

  const investigate = async () => {
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch("/api/osint/advanced/investigate", {
        method: "POST",
        body: JSON.stringify({ target }),
      });
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sources Status */}
      {sources && (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(sources.sources).slice(0, 8).map(([name, info]: [string, any]) => (
            <div key={name} className={`rounded-lg border p-2 text-center ${info.configured ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/5"}`}>
              <div className={`text-xs font-bold ${info.configured ? "text-green-400" : "text-white/30"}`}>
                {info.configured ? "✓" : "○"} {name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0f0f1a] border border-cyan-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
          <Globe className="w-4 h-4" /> تحقيق OSINT شامل
        </h3>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="IP / نطاق / بريد إلكتروني"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          onKeyDown={e => e.key === "Enter" && investigate()}
        />
        <button
          onClick={investigate}
          disabled={loading || !target.trim()}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> جاري الفحص...</> : <><Search className="w-4 h-4" /> ابدأ التحقيق</>}
        </button>
      </div>

      {result && !result.error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Risk Score */}
          {result.risk && (
            <div className={`rounded-xl border p-4 text-center ${
              result.risk.level === "CRITICAL" ? "border-red-500/40 bg-red-500/10" :
              result.risk.level === "HIGH" ? "border-orange-500/40 bg-orange-500/10" :
              result.risk.level === "MEDIUM" ? "border-yellow-500/40 bg-yellow-500/10" :
              "border-green-500/40 bg-green-500/10"
            }`}>
              <div className="text-4xl font-black text-white">{result.risk.score}/100</div>
              <SevBadge level={result.risk.level} />
              <div className="text-xs text-white/50 mt-2">{result.risk.recommendation}</div>
              {result.risk.factors?.map((f: string, i: number) => (
                <div key={i} className="text-xs text-white/60 mt-1">• {f}</div>
              ))}
            </div>
          )}

          {/* Summary */}
          {result.summary?.highlights?.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="text-xs font-bold text-white/50 mb-2">أبرز النتائج</div>
              {result.summary.highlights.map((h: string, i: number) => (
                <div key={i} className="text-xs text-white/70">{h}</div>
              ))}
            </div>
          )}

          {/* Intel Cards */}
          <div className="space-y-2">
            {Object.entries(result.intel || {}).map(([source, data]: [string, any]) => (
              data?.available && (
                <details key={source} className="bg-white/5 rounded-lg border border-white/10">
                  <summary className="px-3 py-2 text-xs font-bold text-white/70 cursor-pointer hover:text-white capitalize">
                    {source.replace(/_/g, " ")} ✓
                  </summary>
                  <pre className="px-3 pb-3 text-xs text-white/50 overflow-x-auto">
                    {JSON.stringify(data, null, 2).slice(0, 600)}
                  </pre>
                </details>
              )
            ))}
          </div>
        </motion.div>
      )}

      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
          خطأ: {result.error}
        </div>
      )}
    </div>
  );
}

// ── MALWARE TAB ────────────────────────────────────────────────────────────────
function MalwareTab() {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch("/api/malware/analyze", { method: "POST", body: form });
      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const lookupHash = async () => {
    if (!hash.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiFetch("/api/malware/hash", {
        method: "POST",
        body: JSON.stringify({ hash: hash.trim() }),
      });
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div className="bg-[#0f0f1a] border border-red-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <Upload className="w-4 h-4" /> رفع ملف للتحليل
        </h3>
        <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-red-500/30 hover:border-red-500/60 rounded-lg py-6 text-sm text-red-400/70 hover:text-red-400 transition-colors"
        >
          {file ? <><CheckCircle className="w-4 h-4 inline mr-2" />{file.name} ({(file.size/1024).toFixed(1)} KB)</> : "اضغط لاختيار ملف"}
        </button>
        {file && (
          <button onClick={analyzeFile} disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors">
            {loading ? "جاري التحليل..." : "تحليل الملف"}
          </button>
        )}
      </div>

      {/* Hash Lookup */}
      <div className="bg-[#0f0f1a] border border-red-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <Hash className="w-4 h-4" /> بحث بالـ Hash
        </h3>
        <input
          value={hash}
          onChange={e => setHash(e.target.value)}
          placeholder="MD5 / SHA1 / SHA256"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-red-500/50"
          onKeyDown={e => e.key === "Enter" && lookupHash()}
        />
        <button onClick={lookupHash} disabled={loading || !hash.trim()}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors">
          {loading ? "جاري البحث..." : "بحث في VirusTotal"}
        </button>
      </div>

      {/* Results */}
      {result && !result.error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {result.risk && (
            <div className={`rounded-xl border p-4 ${
              result.risk.verdict === "MALICIOUS" ? "border-red-500/40 bg-red-500/10" :
              result.risk.verdict === "SUSPICIOUS" ? "border-orange-500/40 bg-orange-500/10" :
              "border-green-500/40 bg-green-500/10"
            }`}>
              <div className="text-lg font-black text-white">{result.risk.verdict}</div>
              <div className="text-sm text-white/60">Risk Score: {result.risk.score}/100</div>
              {result.risk.factors?.map((f: string, i: number) => (
                <div key={i} className="text-xs text-white/50 mt-1">⚠ {f}</div>
              ))}
            </div>
          )}

          {result.hashes && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="text-xs font-bold text-white/50 mb-2">Hashes</div>
              {Object.entries(result.hashes).map(([k, v]: [string, any]) => k !== "size_bytes" && (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="text-white/30 uppercase w-8">{k}</span>
                  <span className="text-white/70 font-mono break-all">{v}</span>
                </div>
              ))}
            </div>
          )}

          {result.signature_matches?.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <div className="text-xs font-bold text-red-400 mb-2">🔴 تطابق التوقيعات</div>
              {result.signature_matches.map((m: any, i: number) => (
                <div key={i} className="text-xs text-red-300">
                  • {m.family} ({m.confidence}) — {m.matched_signatures.join(", ")}
                </div>
              ))}
            </div>
          )}

          {result.suspicious_patterns?.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
              <div className="text-xs font-bold text-orange-400 mb-2">أنماط مشبوهة</div>
              {result.suspicious_patterns.slice(0, 8).map((p: any, i: number) => (
                <div key={i} className="text-xs text-orange-300">
                  <SevBadge level={p.severity} /> {p.pattern}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── NETWORK TAB ────────────────────────────────────────────────────────────────
function NetworkTab() {
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState("quick");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"ports" | "ssl" | "headers" | "dns">("ports");

  const scan = async () => {
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const endpoints = {
        ports: apiFetch("/api/network/scan", { method: "POST", body: JSON.stringify({ target, mode }) }),
        ssl: apiFetch(`/api/network/ssl/${target}`),
        headers: apiFetch("/api/network/headers", { method: "POST", body: JSON.stringify({ url: target }) }),
        dns: apiFetch(`/api/network/dns/${target}`),
      };
      const [ports, ssl, headers, dns] = await Promise.allSettled(Object.values(endpoints));
      setResult({
        ports: ports.status === "fulfilled" ? ports.value : null,
        ssl: ssl.status === "fulfilled" ? ssl.value : null,
        headers: headers.status === "fulfilled" ? headers.value : null,
        dns: dns.status === "fulfilled" ? dns.value : null,
      });
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0f0f1a] border border-green-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
          <Network className="w-4 h-4" /> فحص الشبكة المتقدم
        </h3>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="IP أو نطاق (مثال: example.com)"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500/50"
          onKeyDown={e => e.key === "Enter" && scan()}
        />
        <select value={mode} onChange={e => setMode(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
          <option value="quick">سريع (20 منفذ)</option>
          <option value="comprehensive">شامل (1000+ منفذ)</option>
        </select>
        <button onClick={scan} disabled={loading || !target.trim()}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors">
          {loading ? "جاري الفحص..." : "ابدأ الفحص"}
        </button>
      </div>

      {result && !result.error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Sub-tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["ports", "ssl", "headers", "dns"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === t ? "bg-green-600 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab === "ports" && result.ports && (
            <div className="space-y-2">
              {result.ports.open_ports?.map((p: any) => (
                <div key={p.port} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div className="w-14 text-right font-mono text-sm text-green-400 font-bold">{p.port}</div>
                  <div className="text-xs text-white/70">{p.service}</div>
                  {p.banner && <div className="text-xs text-white/30 truncate ml-auto">{p.banner.slice(0, 50)}</div>}
                </div>
              ))}
              {result.ports.vulnerability_hints?.map((v: any) => (
                <div key={v.port} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
                  ⚠ Port {v.port}: {v.issue}
                </div>
              ))}
            </div>
          )}

          {activeTab === "ssl" && result.ssl?.available && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-white/30">Issuer: </span><span className="text-white/70">{result.ssl.issuer?.organizationName || "N/A"}</span></div>
                <div><span className="text-white/30">Protocol: </span><span className="text-white/70">{result.ssl.tls_version}</span></div>
                <div><span className="text-white/30">Expires: </span><span className={result.ssl.expired ? "text-red-400" : "text-green-400"}>{result.ssl.not_after}</span></div>
                <div><span className="text-white/30">Days left: </span><span className={result.ssl.days_remaining < 30 ? "text-yellow-400" : "text-green-400"}>{result.ssl.days_remaining}</span></div>
                {result.ssl.weak_cipher && <div className="col-span-2 text-red-400">⚠ Weak cipher detected</div>}
              </div>
              {result.ssl.san?.length > 0 && (
                <div><span className="text-white/30">SANs: </span><span className="text-white/70">{result.ssl.san.slice(0, 5).join(", ")}</span></div>
              )}
            </div>
          )}

          {activeTab === "headers" && result.headers?.available && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-white">{result.headers.grade}</div>
                <div className="text-sm text-white/50">Security Score: {result.headers.security_score}/100</div>
              </div>
              {Object.entries(result.headers.headers || {}).map(([h, info]: [string, any]) => (
                <div key={h} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${info.present ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  {info.present ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="font-mono text-white/70">{h}</span>
                  {info.value && <span className="text-white/30 truncate">{String(info.value).slice(0, 60)}</span>}
                </div>
              ))}
            </div>
          )}

          {activeTab === "dns" && result.dns?.records && (
            <div className="space-y-2">
              {Object.entries(result.dns.records).map(([type, records]: [string, any]) => records?.length > 0 && (
                <div key={type} className="bg-white/5 rounded-lg border border-white/10 p-2">
                  <div className="text-xs font-bold text-cyan-400 mb-1">{type}</div>
                  {records.map((r: string, i: number) => (
                    <div key={i} className="text-xs text-white/60 font-mono">{r}</div>
                  ))}
                </div>
              ))}
              {result.dns.discovered_subdomains?.length > 0 && (
                <div className="bg-yellow-500/10 rounded-lg border border-yellow-500/30 p-2">
                  <div className="text-xs font-bold text-yellow-400 mb-1">Subdomains Found</div>
                  {result.dns.discovered_subdomains.map((s: string, i: number) => (
                    <div key={i} className="text-xs text-yellow-300 font-mono">{s}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── CVE TAB ────────────────────────────────────────────────────────────────────
function CveTab() {
  const [query, setQuery] = useState("");
  const [software, setSoftware] = useState("");
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<"search" | "software" | "latest">("search");

  const search = async () => {
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (mode === "search" && query.trim()) {
        const isCve = /CVE-\d{4}-\d+/i.test(query);
        if (isCve) {
          data = await apiFetch(`/api/cve/${query.toUpperCase()}`);
        } else {
          data = await apiFetch(`/api/cve/search?q=${encodeURIComponent(query)}`);
        }
      } else if (mode === "software" && software.trim()) {
        data = await apiFetch("/api/cve/software", {
          method: "POST",
          body: JSON.stringify({ software, version }),
        });
      } else if (mode === "latest") {
        data = await apiFetch("/api/cve/latest?days=7&limit=20");
      }
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const vulns = result?.vulnerabilities || (result?.cve ? [result.cve] : []);

  return (
    <div className="space-y-4">
      <div className="bg-[#0f0f1a] border border-yellow-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> بحث CVE/NVD
        </h3>
        <div className="flex gap-2">
          {(["search", "software", "latest"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === m ? "bg-yellow-600 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
              {m === "search" ? "بحث" : m === "software" ? "برنامج" : "الأحدث"}
            </button>
          ))}
        </div>

        {mode === "search" && (
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="CVE-2024-XXXX أو اسم البرنامج"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-500/50"
            onKeyDown={e => e.key === "Enter" && search()} />
        )}
        {mode === "software" && (
          <div className="flex gap-2">
            <input value={software} onChange={e => setSoftware(e.target.value)}
              placeholder="اسم البرنامج (مثال: Apache)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" />
            <input value={version} onChange={e => setVersion(e.target.value)}
              placeholder="الإصدار" className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" />
          </div>
        )}

        <button onClick={search} disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors">
          {loading ? "جاري البحث..." : "بحث"}
        </button>
      </div>

      {vulns.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-white/30">نتائج: {result?.total_results || vulns.length}</div>
          {vulns.map((v: any) => (
            <div key={v.cve_id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-yellow-400">{v.cve_id}</span>
                <SevBadge level={v.severity || "INFO"} />
                {v.cvss_score > 0 && <span className="text-xs text-white/50">CVSS: {v.cvss_score}</span>}
                <a href={v.url} target="_blank" rel="noreferrer" className="ml-auto text-white/30 hover:text-white">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{v.description?.slice(0, 300)}</p>
              {v.github_pocs?.length > 0 && (
                <div className="text-xs text-red-400">⚠ {v.github_pocs.length} PoC exploit(s) found on GitHub</div>
              )}
              {v.mitre_techniques?.map((t: any) => (
                <div key={t.technique_id} className="text-xs text-orange-400">
                  🎯 {t.technique_id}: {t.technique_name}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TICKETS TAB ────────────────────────────────────────────────────────────────
function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiFetch("/api/tickets/"),
        apiFetch("/api/tickets/stats"),
      ]);
      setTickets(t.tickets || []);
      setStats(s);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const createTicket = async () => {
    if (!form.title || !form.description) return;
    setCreating(true);
    try {
      await apiFetch("/api/tickets/", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "", priority: "medium" });
      fetchTickets();
    } catch {} finally { setCreating(false); }
  };

  const priorityColors: Record<string, string> = {
    critical: "text-red-400", high: "text-orange-400",
    medium: "text-yellow-400", low: "text-green-400",
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-blue-400">{stats.total}</div>
            <div className="text-xs text-white/40">إجمالي</div>
          </div>
          {Object.entries(stats.by_status || {}).slice(0, 3).map(([s, c]) => (
            <div key={s} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-white">{c as number}</div>
              <div className="text-xs text-white/40 capitalize">{s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      <div className="bg-[#0f0f1a] border border-blue-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
          <Ticket className="w-4 h-4" /> تذكرة جديدة
        </h3>
        <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
          placeholder="عنوان التذكرة"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
        <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
          placeholder="وصف المشكلة..." rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none" />
        <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
          <option value="low">منخفض</option>
          <option value="medium">متوسط</option>
          <option value="high">عالي</option>
          <option value="critical">حرج</option>
        </select>
        <button onClick={createTicket} disabled={creating || !form.title || !form.description}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors">
          {creating ? "جاري الإنشاء..." : "إنشاء تذكرة"}
        </button>
      </div>

      {/* Tickets List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-white/30 py-8">جاري التحميل...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-white/30 py-8">لا توجد تذاكر بعد</div>
        ) : tickets.map((t: any) => (
          <button key={t.ticket_id} onClick={() => setSelected(selected?.ticket_id === t.ticket_id ? null : t)}
            className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/30">{t.ticket_number}</span>
              <span className={`text-xs font-bold ${priorityColors[t.priority] || "text-white/50"}`}>{t.priority}</span>
              <span className="text-xs text-white/30">{t.status}</span>
            </div>
            <div className="text-sm text-white mt-1">{t.title}</div>
            {selected?.ticket_id === t.ticket_id && t.messages?.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {t.messages.map((m: any) => (
                  <div key={m.message_id} className={`text-xs p-2 rounded-lg ${m.sender === "yode9-ai" ? "bg-blue-500/10 text-blue-300" : "bg-white/5 text-white/60"}`}>
                    <div className="font-bold mb-0.5">{m.sender_name}</div>
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── REPORTS TAB ────────────────────────────────────────────────────────────────
function ReportsTab() {
  const [target, setTarget] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [riskLevel, setRiskLevel] = useState("HIGH");

  useEffect(() => {
    apiFetch("/api/reports/list").then(d => setReports(d.reports || [])).catch(() => {});
  }, []);

  const generate = async () => {
    if (!target.trim()) return;
    setLoading(true);
    try {
      const payload = {
        target, executive_summary: summary || `Security assessment for ${target}`,
        report_type: "Penetration Test",
        classification: "CONFIDENTIAL",
        risk: { score: riskLevel === "CRITICAL" ? 90 : riskLevel === "HIGH" ? 70 : riskLevel === "MEDIUM" ? 50 : 25, level: riskLevel },
        findings: [
          { title: "Open Ports Detected", severity: "HIGH", description: "Multiple services exposed to the internet", impact: "Increased attack surface", remediation: "Close unnecessary ports" },
          { title: "Missing Security Headers", severity: "MEDIUM", description: "HTTP security headers not configured", impact: "Potential XSS/clickjacking", remediation: "Add Content-Security-Policy, HSTS, X-Frame-Options" },
        ],
        recommendations: [
          "Apply all pending security patches",
          "Enable Web Application Firewall",
          "Implement security monitoring",
          "Conduct regular penetration testing",
        ],
      };

      const r = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `security_report_${Date.now()}.pdf`;
        a.click();
        apiFetch("/api/reports/list").then(d => setReports(d.reports || [])).catch(() => {});
      }
    } catch (e: any) {
      console.error("Report generation failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0f0f1a] border border-purple-500/20 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
          <FileText className="w-4 h-4" /> إنشاء تقرير PDF
        </h3>
        <input value={target} onChange={e => setTarget(e.target.value)}
          placeholder="اسم الهدف / نطاق / شركة"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50" />
        <textarea value={summary} onChange={e => setSummary(e.target.value)}
          placeholder="الملخص التنفيذي (اختياري)..." rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none" />
        <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
          <option value="CRITICAL">حرج — CRITICAL</option>
          <option value="HIGH">عالي — HIGH</option>
          <option value="MEDIUM">متوسط — MEDIUM</option>
          <option value="LOW">منخفض — LOW</option>
        </select>
        <button onClick={generate} disabled={loading || !target.trim()}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> جاري إنشاء التقرير...</> : <><Download className="w-4 h-4" /> إنشاء وتحميل PDF</>}
        </button>
      </div>

      {reports.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-white/30">التقارير السابقة ({reports.length})</div>
          {reports.map((r: any) => (
            <a key={r.filename} href={`/api/reports/download/${r.filename}`} download
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-3 transition-colors cursor-pointer">
              <FileText className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-xs text-white">{r.filename}</div>
                <div className="text-xs text-white/30">{r.size_kb} KB — {r.created}</div>
              </div>
              <Download className="w-4 h-4 text-white/30 ml-auto" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function Yode9SecurityHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>("swarm");

  const tabComponents: Record<TabId, JSX.Element> = {
    swarm:   <SwarmTab />,
    osint:   <OsintTab />,
    malware: <MalwareTab />,
    network: <NetworkTab />,
    cve:     <CveTab />,
    tickets: <TicketsTab />,
    reports: <ReportsTab />,
  };

  return (
    <div className="min-h-screen bg-[#060610] text-white p-4 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Yode9 Security Hub</h1>
            <p className="text-xs text-white/40">30 وكيل AI • OSINT • Malware • CVE • تذاكر • تقارير</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={active ? { borderColor: tab.color + "60", backgroundColor: tab.color + "15" } : {}}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                active ? "text-white" : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={active ? { color: tab.color } : {}} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tabComponents[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
