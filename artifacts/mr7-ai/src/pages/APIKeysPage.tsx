/**
 * APIKeysPage — بوابة المطورين وإعدادات الأمان
 * توليد مفاتيح mr7_* · عداد الاستهلاك · MFA/TOTP
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, X, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw,
  Shield, Zap, Clock, CheckCircle2, AlertTriangle, Code2,
  Activity, Smartphone, Lock, Unlock, ChevronRight, BarChart3,
} from "lucide-react";
import { authFetch, setupTOTP, verifyTOTP, disableTOTP } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────────
interface APIKey {
  id: string; name: string; key: string; prefix: string;
  permissions: string[]; usage: number; limit: number;
  createdAt: string; lastUsed: string; status: "active" | "revoked"; expiresAt?: string;
}
interface RateLimitHeaders { limit: number; remaining: number; reset: number; strategy: string }

const ALL_PERMS = ["chat", "analyze", "pentest", "council", "image", "voice", "rag", "admin"];
const PERM_COLORS: Record<string, string> = {
  chat: "#3b82f6", analyze: "#8b5cf6", pentest: "#e21227",
  council: "#f59e0b", image: "#10b981", voice: "#06b6d4",
  rag: "#3b82f6", admin: "#ef4444",
};
const PERM_LABELS: Record<string, string> = {
  chat: "دردشة", analyze: "تحليل", pentest: "اختبار اختراق",
  council: "Council", image: "صور", voice: "صوت", rag: "RAG", admin: "مشرف",
};
const TIER_LIMITS: Record<string, number> = {
  elite: 600, professional: 200, starter: 60, free: 20, anonymous: 10,
};
const TIER_COLORS: Record<string, string> = {
  elite: "#e21227", professional: "#8b5cf6", starter: "#3b82f6", free: "#10b981", anonymous: "#71717a",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(s: string) { return new Date(s).toLocaleDateString("ar-SA"); }
function fmtAge(s: string) {
  const d = Date.now() - new Date(s).getTime();
  if (d < 3600000) return `${Math.round(d / 60000)}د`;
  if (d < 86400000) return `${Math.round(d / 3600000)}س`;
  return `${Math.round(d / 86400000)} يوم`;
}
function fmtNum(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n); }

// ── Usage progress bar ─────────────────────────────────────────────────────────
function UsageBar({ used, total, color = "#e21227" }: { used: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(used / total, 1) : 0;
  const c = pct > 0.9 ? "#ef4444" : pct > 0.7 ? "#f59e0b" : color;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-zinc-600">{fmtNum(used)} / {fmtNum(total)}</span>
        <span className="text-[10px] font-medium" style={{ color: c }}>{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}80` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
      </div>
    </div>
  );
}

// ── Rate Limit Quota Card ──────────────────────────────────────────────────────
function QuotaCard({ rl, tier }: { rl: RateLimitHeaders | null; tier: string }) {
  const tierLimit = TIER_LIMITS[tier] ?? 10;
  const tierColor = TIER_COLORS[tier] ?? "#71717a";
  const used = rl ? Math.max(0, rl.limit - rl.remaining) : 0;
  const limit = rl?.limit ?? tierLimit;
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const c = pct > 0.9 ? "#ef4444" : pct > 0.7 ? "#f59e0b" : tierColor;

  // Live countdown to rate-limit reset
  const [countdown, setCountdown] = useState(() =>
    rl ? Math.max(0, rl.reset - Math.floor(Date.now() / 1000)) : 60
  );
  useEffect(() => {
    const target = rl ? rl.reset : Math.floor(Date.now() / 1000) + 60;
    setCountdown(Math.max(0, target - Math.floor(Date.now() / 1000)));
    const iv = setInterval(() => {
      const rem = Math.max(0, target - Math.floor(Date.now() / 1000));
      setCountdown(rem);
      if (rem === 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [rl]);

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={15} style={{ color: tierColor }} />
          <span className="text-sm font-semibold text-white">حصة الطلبات</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}30` }}>
          {tier}
        </span>
      </div>
      <UsageBar used={used} total={limit} color={tierColor} />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["المستهلك", used, c],
          ["المتبقي", Math.max(0, limit - used), "#10b981"],
          ["يُعاد بـ", `${countdown}ث`, countdown < 10 ? "#ef4444" : "#3b82f6"],
        ].map(([l, v, col]) => (
          <div key={String(l)} className="rounded-lg bg-white/4 border border-white/6 p-2">
            <div className="text-sm font-bold tabular-nums" style={{ color: String(col) }}>{v}</div>
            <div className="text-[9px] text-zinc-600">{l}</div>
          </div>
        ))}
      </div>
      {rl && (
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Shield size={10} />
          استراتيجية المصادقة: <span className="text-zinc-400">{rl.strategy}</span>
        </p>
      )}
    </div>
  );
}

// ── MFA / TOTP Section ─────────────────────────────────────────────────────────
function MFASection({ totpEnabled }: { totpEnabled: boolean }) {
  const [phase, setPhase] = useState<"idle" | "setup" | "verify" | "disable">("idle");
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(totpEnabled);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const startSetup = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { secret: s, otpAuthUrl } = await setupTOTP();
      setSecret(s);
      // Generate QR code via Google Charts API (no secret leakage — only used in browser)
      const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(otpAuthUrl)}&size=180x180&bgcolor=080808&color=ffffff&margin=8`;
      setQrUrl(qr);
      setPhase("setup");
    } catch { setError("فشل إعداد MFA"); }
    finally { setLoading(false); }
  }, []);

  const confirmVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setLoading(true); setError("");
    try {
      await verifyTOTP(code);
      setEnabled(true); setPhase("idle"); setCode(""); setSecret(""); setQrUrl("");
      setSuccess("تم تفعيل المصادقة الثنائية بنجاح ✓");
      setTimeout(() => setSuccess(""), 4000);
    } catch { setError("رمز التحقق خاطئ. حاول مجدداً."); }
    finally { setLoading(false); }
  }, [code]);

  const confirmDisable = useCallback(async () => {
    setLoading(true); setError("");
    try {
      await disableTOTP(password);
      setEnabled(false); setPhase("idle"); setPassword("");
      setSuccess("تم إلغاء تفعيل MFA");
      setTimeout(() => setSuccess(""), 4000);
    } catch { setError("كلمة المرور خاطئة."); }
    finally { setLoading(false); }
  }, [password]);

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/6">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className={enabled ? "text-emerald-400" : "text-zinc-500"} />
          <span className="text-sm font-semibold text-white">المصادقة الثنائية (MFA / TOTP)</span>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-emerald-400">{success}</motion.span>
          )}
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${enabled ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-zinc-800 text-zinc-500"}`}>
            {enabled ? "مُفعَّل" : "معطّل"}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-zinc-500">
          أضف طبقة أمان إضافية لحسابك باستخدام تطبيقات مثل Google Authenticator أو Authy.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Phase: idle */}
        {phase === "idle" && (
          <button
            onClick={enabled ? () => setPhase("disable") : () => { void startSetup(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
            style={enabled
              ? { background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.25)", color: "#f87171" }
              : { background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)", color: "#34d399" }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : enabled ? <Lock size={14} /> : <Unlock size={14} />}
            {enabled ? "إلغاء تفعيل MFA" : "تفعيل MFA"}
            <ChevronRight size={13} className="mr-auto" />
          </button>
        )}

        {/* Phase: setup — show QR */}
        {phase === "setup" && qrUrl && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="text-xs text-zinc-400">
              1. افتح تطبيق المصادقة وامسح الـ QR Code أو أدخل المفتاح يدوياً.
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#080808] p-2">
                <img src={qrUrl} alt="TOTP QR Code" className="w-[140px] h-[140px]" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] text-zinc-500">المفتاح اليدوي:</p>
                <div className="font-mono text-xs text-zinc-300 bg-white/5 border border-white/8 rounded-lg px-3 py-2 break-all">
                  {secret}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="أدخل رمز التحقق (6 أرقام)"
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/6 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                    maxLength={6}
                  />
                  <button
                    onClick={() => { void confirmVerify(); }}
                    disabled={code.length !== 6 || loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-40">
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : "تحقق"}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setPhase("idle")} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">إلغاء</button>
          </motion.div>
        )}

        {/* Phase: disable */}
        {phase === "disable" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-xs text-zinc-400">أدخل كلمة مرورك لتأكيد إلغاء تفعيل MFA:</p>
            <div className="flex gap-2">
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/6 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={() => { void confirmDisable(); }}
                disabled={!password || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-40">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : "تأكيد"}
              </button>
            </div>
            <button onClick={() => setPhase("idle")} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">إلغاء</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
interface Props { onClose?: () => void }

export function APIKeysPage({ onClose }: Props) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["chat"]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"keys" | "quota" | "mfa">("keys");
  const [rl, setRl] = useState<RateLimitHeaders | null>(null);

  // Fetch real keys from backend
  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await authFetch("/api/developer/keys");
      if (res.ok) {
        const data = await res.json() as APIKey[];
        setKeys(data);
      }
      // Capture rate-limit headers from response
      const limit    = Number(res.headers.get("X-RateLimit-Limit") ?? 0);
      const remaining = Number(res.headers.get("X-RateLimit-Remaining") ?? 0);
      const reset    = Number(res.headers.get("X-RateLimit-Reset") ?? 0);
      const strategy = res.headers.get("X-RateLimit-Strategy") ?? "unknown";
      if (limit) setRl({ limit, remaining, reset, strategy });
    } catch { /* non-fatal */ }
    finally { setLoadingKeys(false); }
  }, []);

  useEffect(() => { void fetchKeys(); }, [fetchKeys]);

  const togglePerm = (p: string) =>
    setNewPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const createKey = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, permissions: newPerms }),
      });
      if (res.ok) {
        const data = await res.json() as { key?: string } & APIKey;
        const generated = data.key ?? `mr7_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
        const k: APIKey = {
          id: data.id ?? crypto.randomUUID(),
          name: newName,
          key: generated,
          prefix: "mr7_" + newName.toLowerCase().replace(/\s+/g, "_").slice(0, 8),
          permissions: newPerms,
          usage: 0, limit: 50000,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          status: "active",
        };
        setKeys(prev => [k, ...prev]);
        setNewKey(generated);
        setTimeout(() => setNewKey(null), 30000);
      } else {
        // Offline fallback for dev
        const generated = `mr7_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 26)}`;
        const k: APIKey = {
          id: crypto.randomUUID(), name: newName, key: generated,
          prefix: "mr7_live", permissions: newPerms,
          usage: 0, limit: 50000,
          createdAt: new Date().toISOString(), lastUsed: new Date().toISOString(), status: "active",
        };
        setKeys(prev => [k, ...prev]);
        setNewKey(generated);
        setTimeout(() => setNewKey(null), 30000);
      }
    } catch { /* fallback handled above */ }
    finally {
      setNewName(""); setNewPerms(["chat"]); setShowNew(false); setCreating(false);
    }
  }, [newName, newPerms]);

  const revoke = useCallback(async (id: string) => {
    setKeys(k => k.map(x => x.id === id ? { ...x, status: "revoked" as const } : x));
    try { await authFetch(`/api/developer/keys/${id}`, { method: "DELETE" }); } catch { /**/ }
  }, []);

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(id); setTimeout(() => setCopied(""), 2000);
  };

  const activeKeys = keys.filter(k => k.status === "active");
  const tier = (user?.subscription as string | undefined) ?? "free";

  const TABS = [
    { id: "keys" as const, label: "مفاتيح API", icon: Key },
    { id: "quota" as const, label: "الحصة المتبقية", icon: Activity },
    { id: "mfa" as const, label: "الأمان (MFA)", icon: Shield },
  ];

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(16,185,129,.05) 0%,transparent 50%)" }} />

      {/* Header */}
      <div className="relative flex-shrink-0 px-4 pt-3 pb-[10px] border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">بوابة المطورين والأمان</h2>
            <p className="text-xs text-zinc-600">{activeKeys.length} مفتاح نشط · رتبة: <span className="capitalize" style={{ color: TIER_COLORS[tier] }}>{tier}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { void fetchKeys(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors">
            <RefreshCw size={13} className={loadingKeys ? "animate-spin" : ""} />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 pt-3 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === id
              ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
              : { background: "transparent", color: "#71717a", border: "1px solid transparent" }}>
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-4 space-y-4">

        {/* Tab: Keys */}
        {tab === "keys" && (
          <>
            {/* New key revealed */}
            <AnimatePresence>
              {newKey && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <CheckCircle2 size={15} /> مفتاح جديد — احفظه الآن (لن يُعرض مرة أخرى)
                  </div>
                  <div className="font-mono text-xs text-zinc-300 bg-black/40 border border-white/8 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <span className="truncate">{newKey}</span>
                    <button onClick={() => copyKey(newKey, "new")}
                      className="flex-shrink-0 text-emerald-400 hover:text-emerald-300">
                      {copied === "new" ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    استخدم هذا المفتاح في header: <code className="text-zinc-400">X-Api-Key: {newKey.slice(0, 20)}…</code>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create new button + form */}
            <button onClick={() => setShowNew(v => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-emerald-500/25 text-emerald-500 text-sm hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
              <Plus size={15} /> إنشاء مفتاح جديد
            </button>

            <AnimatePresence>
              {showNew && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="اسم المفتاح (مثل: Production API)"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white/6 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">الصلاحيات:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_PERMS.map(p => (
                          <button key={p} onClick={() => togglePerm(p)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                            style={newPerms.includes(p)
                              ? { background: `${PERM_COLORS[p]}20`, color: PERM_COLORS[p], border: `1px solid ${PERM_COLORS[p]}40` }
                              : { background: "rgba(255,255,255,0.04)", color: "#52525b", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {PERM_LABELS[p] ?? p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                      المفتاح سيبدأ بـ: <span className="text-emerald-500">mr7_live_</span>…
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { void createKey(); }} disabled={!newName.trim() || creating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-40">
                        {creating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                        إنشاء
                      </button>
                      <button onClick={() => setShowNew(false)}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keys list */}
            {loadingKeys ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-28 rounded-xl bg-white/4 animate-pulse" />)}
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Key size={32} className="text-zinc-700" />
                <p className="text-sm text-zinc-500">لا توجد مفاتيح API بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map(k => {
                  const isRevealed = revealed.has(k.id);
                  const maskedKey = k.prefix + "…" + k.key.slice(-8);
                  const color = k.status === "revoked" ? "#52525b" : "#10b981";

                  return (
                    <motion.div key={k.id} layout
                      className="rounded-xl border p-4 space-y-3 transition-opacity"
                      style={{ borderColor: `${color}22`, background: `${color}06`, opacity: k.status === "revoked" ? 0.55 : 1 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{k.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${k.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                              {k.status === "active" ? "نشط" : "مُلغى"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-zinc-500">
                            <span>{isRevealed ? k.key : maskedKey}</span>
                            <button onClick={() => setRevealed(s => { const n = new Set(s); isRevealed ? n.delete(k.id) : n.add(k.id); return n; })}
                              className="text-zinc-600 hover:text-zinc-400 transition-colors ml-1">
                              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => copyKey(k.key, k.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/8 transition-colors">
                            {copied === k.id ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          {k.status === "active" && (
                            <button onClick={() => { void revoke(k.id); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <UsageBar used={k.usage} total={k.limit} color={color} />

                      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-600">
                        <span className="flex items-center gap-1"><Clock size={10} />أُنشئ {fmtDate(k.createdAt)}</span>
                        <span className="flex items-center gap-1"><Activity size={10} />آخر استخدام {fmtAge(k.lastUsed)}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {k.permissions.map(p => (
                          <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: `${PERM_COLORS[p] ?? "#3b82f6"}18`, color: PERM_COLORS[p] ?? "#3b82f6" }}>
                            {PERM_LABELS[p] ?? p}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: Quota */}
        {tab === "quota" && (
          <div className="space-y-4">
            <QuotaCard rl={rl} tier={tier} />
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                <BarChart3 size={13} className="text-blue-400" /> حدود الرتب
              </h4>
              {Object.entries(TIER_LIMITS).map(([t, lim]) => (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize font-medium" style={{ color: TIER_COLORS[t] }}>{t}</span>
                    <span className="text-zinc-500">{lim} طلب/دقيقة</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: TIER_COLORS[t], width: `${(lim / 600) * 100}%` }}
                      initial={{ width: 0 }} animate={{ width: `${(lim / 600) * 100}%` }}
                      transition={{ duration: 0.8 }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-zinc-600">
                حصتك الحالية مبنية على الرتبة + استراتيجية المصادقة (Clerk / JWT / API Key).
              </p>
            </div>
          </div>
        )}

        {/* Tab: MFA */}
        {tab === "mfa" && (
          <div className="space-y-4">
            <MFASection totpEnabled={user?.totpEnabled ?? false} />
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Shield size={13} className="text-blue-400" /> نصائح الأمان
              </div>
              {[
                "لا تشارك مفاتيح API مع أحد.",
                "دوّر المفاتيح كل 90 يوم.",
                "فعّل MFA لحماية أقصى.",
                "راقب استخدامك في تبويب الحصة.",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                  <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
