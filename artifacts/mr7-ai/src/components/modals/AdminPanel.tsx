import { useState, useEffect, useCallback } from "react";
import { ModalShell } from "@/components/ModalShell";
import {
  Shield, Lock, Check, Copy, RefreshCw, Crown, Users, Zap, AlertCircle,
  CreditCard, Save, ChevronDown, ChevronUp, BarChart3, Search, Ban, UserCheck, Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  verifyAdminPassword, generateActivationCode,
  loadPaymentSettings, savePaymentSettings, type PaymentSettings,
} from "@/lib/subscription-verify";
import {
  type SubscriptionTier, TIER_LABELS, TIER_TOKENS,
} from "@/lib/subscription";

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIERS: SubscriptionTier[] = ["free", "starter", "professional", "elite"];

interface PlatformStats {
  users: { total: number; today: number };
  subscriptions: Record<string, number>;
  totalTokensUsed: number;
  requestsLast30d: number;
  estMonthlyRevenueUsd: number;
  completedReferrals: number;
}

interface PlatformUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  tokens_used: number;
  last_login_at?: string;
  created_at: string;
  plan?: string;
  subscription_status?: string;
  ends_at?: string;
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [genTier, setGenTier] = useState<SubscriptionTier>("starter");
  const [genDays, setGenDays] = useState(30);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [setTier, setSetTier] = useState<SubscriptionTier>(state.subscription.tier);
  const [setDays, setSetDays] = useState(30);
  const [payOpen, setPayOpen] = useState(false);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(loadPaymentSettings());
  const [adminSecret, setAdminSecret] = useState("");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [statsLoading, setStatsLoading] = useState(false);
  const [usersList, setUsersList] = useState<PlatformUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  const fetchStats = useCallback(async (secret: string) => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-secret": secret } });
      const data = await res.json();
      if (!res.ok) { setStatsError(data.error || "Failed to load stats"); return; }
      setStats(data);
    } catch {
      setStatsError("Network error loading stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (secret: string, search = "") => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=25`, {
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users || []);
        setUsersTotal(data.total || 0);
      }
    } catch {
      // silent — non-critical section
    } finally {
      setUsersLoading(false);
    }
  }, []);

  async function userAction(id: string, action: "suspend" | "ban" | "activate" | "delete") {
    if (action === "delete" && !window.confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({ description: `User ${action}d successfully.` });
        fetchUsers(adminSecret, userSearch);
      } else {
        toast({ description: "Action failed." });
      }
    } catch {
      toast({ description: "Network error." });
    }
  }

  async function login() {
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setAuthed(true);
      setPwError(false);
      setAdminSecret(password);
      setPassword("");
      setPaySettings(loadPaymentSettings());
      fetchStats(password);
    } else {
      setPwError(true);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setAuthed(false);
      setPassword("");
      setPwError(false);
      setGeneratedCode("");
      setPayOpen(false);
      setStats(null);
      setStatsError("");
      setUsersOpen(false);
      setUsersList([]);
    }
    onOpenChange(v);
  }

  function activateTier() {
    const expiresAt = setTier === "free" ? null : Date.now() + setDays * 86_400_000;
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: {
        tier: setTier,
        activatedAt: setTier === "free" ? null : Date.now(),
        expiresAt,
        tokensUsed: 0,
        activationCode: `ADMIN-MANUAL-${Date.now()}`,
      },
    });
    toast({ description: `Subscription set to ${TIER_LABELS[setTier]}${setTier !== "free" ? ` for ${setDays} days` : ""}.` });
  }

  async function genCode() {
    const result = await generateActivationCode(genTier, genDays);
    if (result.ok && result.code) {
      setGeneratedCode(result.code);
    } else {
      toast({ description: result.error || "Failed to generate code" });
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetSubscription() {
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: { tier: "free", activatedAt: null, expiresAt: null, tokensUsed: 0, activationCode: null },
    });
    toast({ description: "Subscription reset to Free." });
  }

  function savePaySettings() {
    savePaymentSettings(paySettings);
    toast({ description: "Payment settings saved. Will take effect immediately." });
  }

  useEffect(() => {
    if (!authed || !usersOpen) return;
    const t = setTimeout(() => fetchUsers(adminSecret, userSearch), 300);
    return () => clearTimeout(t);
  }, [authed, usersOpen, userSearch, adminSecret, fetchUsers]);

  const sub = state.subscription;
  const tierColor: Record<SubscriptionTier, string> = {
    free: "text-muted-foreground",
    starter: "text-emerald-400",
    professional: "text-blue-400",
    elite: "text-amber-400",
  };

  const PayField = ({
    label, field, placeholder,
  }: { label: string; field: keyof PaymentSettings; placeholder?: string }) => (
    <div>
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      <input
        value={paySettings[field]}
        onChange={(e) => setPaySettings((p: PaymentSettings) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder ?? label}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-primary font-mono"
      />
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={() => handleClose(false)}
      title="Owner Admin Panel"
      subtitle="PRIVATE — Master access required"
      iconColor="#e21227"
      icon={<Shield className="w-4.5 h-4.5 text-primary" />}
    >
      <div className="p-4 space-y-4">
        {!authed ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Enter the owner master password</div>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder="Master password"
                className={`w-full bg-background border ${pwError ? "border-red-500" : "border-border"} rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono`}
                autoFocus
              />
              {pwError && (
                <div className="flex items-center gap-1.5 text-red-400 text-[12px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Incorrect password
                </div>
              )}
            </div>

            <button
              onClick={login}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
            >
              Authenticate
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[12px] text-emerald-400">
              <Check className="w-4 h-4 shrink-0" /> Authenticated as Owner
            </div>

            {/* Current subscription */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Current Device Subscription
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-black ${tierColor[sub.tier]}`}>{TIER_LABELS[sub.tier]}</span>
                {sub.expiresAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Expires: {new Date(sub.expiresAt).toLocaleDateString()} · {Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 86_400_000))}d left
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tokens used: {sub.tokensUsed.toLocaleString()} / {TIER_TOKENS[sub.tier].toLocaleString()}
              </div>
            </div>

            {/* Activate tier on this device */}
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Activate Tier on This Device
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Tier</label>
                  <select
                    value={setTier}
                    onChange={(e) => setSetTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{TIER_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={setDays}
                    onChange={(e) => setSetDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={setTier === "free"}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={activateTier}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Activate {TIER_LABELS[setTier]}
                </button>
                <button
                  onClick={resetSubscription}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors text-sm"
                  title="Reset to free"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Generate customer code */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Generate Customer Activation Code
              </div>
              <div className="text-[11px] text-muted-foreground">
                Generate a code to send to a paying customer. They enter it in the app to activate their plan.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Plan</label>
                  <select
                    value={genTier}
                    onChange={(e) => setGenTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {TIERS.filter((t) => t !== "free").map((t) => (
                      <option key={t} value={t}>{TIER_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Valid for (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={genDays}
                    onChange={(e) => setGenDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                onClick={genCode}
                className="w-full py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 transition-colors"
              >
                Generate Code
              </button>
              {generatedCode && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-xl">
                    <code className="flex-1 text-[11px] font-mono text-cyan-400 break-all">{generatedCode}</code>
                    <button
                      onClick={copyCode}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-amber-400/5 border border-amber-400/20 rounded-lg p-2">
                    Send this code to your customer. They enter it via Account → Activate tab. Valid for {genDays} days from now.
                  </div>
                </div>
              )}
            </div>

            {/* Platform Stats */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Platform Stats (Live)
                </div>
                <button
                  onClick={() => fetchStats(adminSecret)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${statsLoading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {statsError ? (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {statsError}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black">{stats.users.total}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Users</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black text-emerald-400">+{stats.users.today}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">New Today</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black text-amber-400">${stats.estMonthlyRevenueUsd.toFixed(0)}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Monthly Rev</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black">{stats.totalTokensUsed.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Tokens Used</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black">{stats.requestsLast30d}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Requests/30d</div>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-2.5">
                    <div className="font-mono text-base font-black text-cyan-400">{stats.completedReferrals}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Referrals</div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">Loading...</div>
              )}
            </div>

            {/* User Management */}
            <div className="border-t border-border pt-4 space-y-3">
              <button
                onClick={() => setUsersOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-bold hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" /> User Management ({usersTotal})
                </span>
                {usersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {usersOpen && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by email..."
                      className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-[12px] outline-none focus:border-primary"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {usersLoading ? (
                      <div className="text-[11px] text-muted-foreground text-center py-3">Loading...</div>
                    ) : usersList.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground text-center py-3">No users found.</div>
                    ) : (
                      usersList.map((u) => (
                        <div key={u.id} className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold truncate">{u.email}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <span className={u.status === "banned" ? "text-red-400" : u.status === "suspended" ? "text-amber-400" : "text-emerald-400"}>
                                {u.status || "active"}
                              </span>
                              {" · "}{u.plan || "free"}{" · "}{u.tokens_used?.toLocaleString() || 0} tokens
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {u.status !== "active" && (
                              <button onClick={() => userAction(u.id, "activate")} title="Activate" className="w-6 h-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                              </button>
                            )}
                            {u.status !== "suspended" && (
                              <button onClick={() => userAction(u.id, "suspend")} title="Suspend" className="w-6 h-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                              </button>
                            )}
                            {u.status !== "banned" && (
                              <button onClick={() => userAction(u.id, "ban")} title="Ban" className="w-6 h-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
                                <Ban className="w-3 h-3 text-red-400" />
                              </button>
                            )}
                            <button onClick={() => userAction(u.id, "delete")} title="Delete" className="w-6 h-6 flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Settings */}
            <div className="border-t border-border pt-4 space-y-3">
              <button
                onClick={() => setPayOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-bold hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-400" /> Payment Settings
                </span>
                {payOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {payOpen && (
                <div className="space-y-3">
                  <div className="text-[11px] text-muted-foreground">
                    Edit your payment addresses. Changes take effect immediately without redeployment.
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">USDT / Crypto</div>
                    <PayField label="USDT TRC20 Address" field="usdt_trc20" placeholder="T..." />
                    <PayField label="USDT BEP20 Address" field="usdt_bep20" placeholder="0x..." />
                    <PayField label="Bitcoin (BTC) Address" field="btc" placeholder="bc1..." />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">PayPal</div>
                    <PayField label="PayPal Handle" field="paypal_handle" placeholder="@YourPayPal" />
                    <PayField label="PayPal.me Link" field="paypal_link" placeholder="https://paypal.me/..." />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Bank Transfer</div>
                    <PayField label="Bank Name" field="bank_name" placeholder="Bank Name" />
                    <PayField label="Account Name" field="bank_account_name" placeholder="Account Holder Name" />
                    <PayField label="IBAN" field="bank_iban" placeholder="SA..." />
                    <PayField label="SWIFT / BIC" field="bank_swift" placeholder="XXXXXXXX" />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Support Contacts</div>
                    <PayField label="Telegram Support Link" field="telegram" placeholder="https://t.me/..." />
                    <PayField label="Support Email" field="email" placeholder="support@..." />
                  </div>

                  <button
                    onClick={savePaySettings}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Payment Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
