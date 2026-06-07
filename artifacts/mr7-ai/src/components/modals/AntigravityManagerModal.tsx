import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, RefreshCw, Shield, Zap, BarChart2, Server,
  Plus, Trash2, CheckCircle, AlertCircle, Clock, Copy,
  CheckCheck, Settings2, Globe, Key, Activity, Eye, EyeOff,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const G = "#00e5cc";
const Gg = (a: number) => `rgba(0,229,204,${a})`;

interface Account {
  id: string;
  name: string;
  provider: "gemini" | "claude";
  status: "active" | "limited" | "exhausted";
  quota: number;
  used: number;
  resetIn: string;
}

const DEMO_ACCOUNTS: Account[] = [
  { id: "1", name: "Account Alpha", provider: "gemini", status: "active", quota: 1500, used: 234, resetIn: "2h 14m" },
  { id: "2", name: "Account Beta", provider: "claude", status: "limited", quota: 1000, used: 892, resetIn: "45m" },
  { id: "3", name: "Account Gamma", provider: "gemini", status: "active", quota: 1500, used: 67, resetIn: "5h 30m" },
  { id: "4", name: "Account Delta", provider: "claude", status: "exhausted", quota: 1000, used: 1000, resetIn: "12m" },
];

const PROXY_LOGS = [
  { time: "14:32:01", event: "Request routed → Account Alpha (Gemini)", status: "ok" },
  { time: "14:31:44", event: "Account Beta quota low (89%) — flagged", status: "warn" },
  { time: "14:30:12", event: "Account Delta exhausted — auto-switched", status: "err" },
  { time: "14:29:55", event: "Proxy server started on :7860", status: "ok" },
];

export function AntigravityManagerModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [tab, setTab] = useState<"accounts" | "proxy" | "ai">("accounts");
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatRef = useRef<AbortController | null>(null);

  async function runAI() {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    chatRef.current?.abort();
    const ctrl = new AbortController();
    chatRef.current = ctrl;
    const prompt = `You are AntigravityManager AI — expert in multi-account AI quota management, API proxy configuration, rate-limit optimization, and Gemini/Claude account orchestration.

User query: ${aiQuery}

Provide expert analysis and actionable recommendations. Be precise and technical.`;
    try {
      let acc = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setAiResponse(acc); },
        ctrl.signal,
      );
    } catch { /* aborted */ }
    setAiLoading(false);
  }

  function getStatusColor(s: Account["status"]) {
    if (s === "active") return "#00e5cc";
    if (s === "limited") return "#fbbf24";
    return "#e21227";
  }

  function getStatusIcon(s: Account["status"]) {
    if (s === "active") return <CheckCircle className="w-3 h-3" />;
    if (s === "limited") return <AlertCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Gg(0.25)}`, maxHeight: "88vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Gg(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Gg(0.1), border: `1px solid ${Gg(0.3)}` }}>
              <Users className="w-5 h-5" style={{ color: G }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">Antigravity Manager</div>
              <div className="text-[10px]" style={{ color: "#444" }}>Multi-Account AI Quota Manager · API Proxy · Auto-Switch</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b flex-shrink-0" style={{ borderColor: Gg(0.08) }}>
          {(["accounts", "proxy", "ai"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
              style={tab === t ? { background: Gg(0.12), color: G, border: `1px solid ${Gg(0.3)}` } : { color: "#444", border: "1px solid transparent" }}
            >
              {t === "accounts" ? "Account Pool" : t === "proxy" ? "Proxy Server" : "AI Optimizer"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ACCOUNTS TAB */}
          {tab === "accounts" && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total Accounts", value: accounts.length, icon: Users, color: G },
                  { label: "Active", value: accounts.filter(a => a.status === "active").length, icon: CheckCircle, color: "#10b981" },
                  { label: "Limited", value: accounts.filter(a => a.status === "limited").length, icon: AlertCircle, color: "#fbbf24" },
                  { label: "Exhausted", value: accounts.filter(a => a.status === "exhausted").length, icon: Clock, color: "#e21227" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                    <div className="text-[18px] font-bold text-white">{value}</div>
                    <div className="text-[9px]" style={{ color: "#555" }}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: G }}>Account Pool</div>
              {accounts.map((acc) => (
                <motion.div key={acc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl p-3" style={{ background: "#111", border: `1px solid ${getStatusColor(acc.status)}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-white">{acc.name}</div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: acc.provider === "gemini" ? "rgba(66,153,225,0.15)" : "rgba(167,139,250,0.15)", color: acc.provider === "gemini" ? "#4299e1" : "#a78bfa" }}>
                        {acc.provider.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-[9px]" style={{ color: getStatusColor(acc.status) }}>
                        {getStatusIcon(acc.status)} {acc.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowKey(showKey === acc.id ? null : acc.id)} className="p-1 rounded hover:bg-white/5">
                        {showKey === acc.id ? <EyeOff className="w-3 h-3 text-gray-500" /> : <Eye className="w-3 h-3 text-gray-500" />}
                      </button>
                      <button onClick={() => setAccounts(a => a.filter(x => x.id !== acc.id))} className="p-1 rounded hover:bg-red-500/10">
                        <Trash2 className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px]" style={{ color: "#555" }}>
                      <span>Quota Usage</span>
                      <span style={{ color: getStatusColor(acc.status) }}>{acc.used}/{acc.quota} · Resets in {acc.resetIn}</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: "#1a1a1a" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${(acc.used / acc.quota) * 100}%`, background: getStatusColor(acc.status) }} />
                    </div>
                  </div>
                  {showKey === acc.id && (
                    <div className="mt-2 px-2 py-1.5 rounded-lg text-[9px] font-mono" style={{ background: "#0d0d0d", color: "#555", border: "1px solid #1a1a1a" }}>
                      sk-ant-••••••••••••••••••••••••••••••••••••••• [encrypted]
                    </div>
                  )}
                </motion.div>
              ))}

              <button className="w-full py-2.5 rounded-xl text-[10px] font-bold border flex items-center justify-center gap-2 transition-all hover:bg-green-500/5" style={{ borderColor: Gg(0.2), color: G, borderStyle: "dashed" }}>
                <Plus className="w-3.5 h-3.5" /> Add Account
              </button>
            </div>
          )}

          {/* PROXY TAB */}
          {tab === "proxy" && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: Gg(0.05), border: `1px solid ${Gg(0.15)}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <Server className="w-4 h-4" style={{ color: G }} />
                  <div className="text-[12px] font-bold text-white">Local API Proxy</div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#10b98120", color: "#10b981" }}>● RUNNING</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div><span style={{ color: "#555" }}>Endpoint: </span><span className="font-mono" style={{ color: G }}>http://localhost:7860/v1</span></div>
                  <div><span style={{ color: "#555" }}>Protocol: </span><span className="font-mono text-white">OpenAI-Compatible</span></div>
                  <div><span style={{ color: "#555" }}>Mode: </span><span className="font-mono text-white">Round-Robin Auto-Switch</span></div>
                  <div><span style={{ color: "#555" }}>Encryption: </span><span className="font-mono" style={{ color: "#10b981" }}>AES-256-GCM</span></div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase mb-2" style={{ color: "#555" }}>Proxy Event Log</div>
                <div className="space-y-1.5">
                  {PROXY_LOGS.map((log, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg" style={{ background: "#111" }}>
                      <span className="text-[9px] font-mono" style={{ color: "#333" }}>{log.time}</span>
                      <span className="text-[10px] flex-1" style={{ color: log.status === "ok" ? "#10b981" : log.status === "warn" ? "#fbbf24" : "#e21227" }}>{log.event}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <div className="text-[10px] font-bold mb-2" style={{ color: "#555" }}>Auto-Switch Configuration</div>
                <div className="space-y-2 text-[10px]">
                  {[
                    { label: "Switch when quota exceeds", value: "85%" },
                    { label: "Rate limit recovery delay", value: "30s" },
                    { label: "Priority order", value: "Active → Limited → Standby" },
                    { label: "Fallback behavior", value: "Queue & retry" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span style={{ color: "#555" }}>{label}</span>
                      <span className="font-mono" style={{ color: G }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI TAB */}
          {tab === "ai" && (
            <div className="space-y-4">
              <div className="rounded-xl p-3" style={{ background: Gg(0.04), border: `1px solid ${Gg(0.12)}` }}>
                <div className="text-[10px]" style={{ color: "#555" }}>
                  Ask the AI to optimize your account rotation strategy, analyze quota patterns, suggest rate-limit bypass techniques, or configure proxy rules.
                </div>
              </div>

              <div className="space-y-2">
                {["Optimize my account rotation strategy for maximum uptime", "How to minimize rate-limit hits across 4 accounts?", "Generate proxy config for Claude + Gemini load balancing", "Analyze my quota usage and suggest optimizations"].map((q) => (
                  <button key={q} onClick={() => setAiQuery(q)} className="w-full text-left px-3 py-2 rounded-lg text-[10px] border transition-all hover:border-teal-500/30" style={{ background: "#111", borderColor: "#1a1a1a", color: "#888" }}>
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runAI()}
                  placeholder="Ask AntigravityManager AI..."
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none"
                  style={{ borderColor: Gg(0.2), color: "#ccc" }} />
                <button onClick={runAI} disabled={aiLoading} className="px-4 rounded-xl text-[10px] font-bold border transition-all" style={{ background: Gg(0.08), borderColor: Gg(0.3), color: G }}>
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                </button>
              </div>

              {aiResponse && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap" style={{ background: "#111", border: `1px solid ${Gg(0.12)}`, color: "#ccc" }}>
                  {aiResponse}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
