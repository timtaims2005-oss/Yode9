import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Globe, Zap, BarChart2, Shield, RefreshCw,
  ArrowLeftRight, DollarSign, Activity, CheckCircle,
  AlertCircle, Server, Lock, TrendingUp, Copy, CheckCheck,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const A = "#818cf8";
const Ag = (n: number) => `rgba(129,140,248,${n})`;

const PROVIDERS = [
  { name: "OpenAI", models: ["gpt-5.4", "gpt-5-mini", "o4-mini"], status: "active", latency: "234ms", cost: "$0.003/1k" },
  { name: "Anthropic", models: ["claude-opus-4", "claude-sonnet-4", "claude-haiku"], status: "active", latency: "312ms", cost: "$0.015/1k" },
  { name: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash"], status: "active", latency: "189ms", cost: "$0.001/1k" },
  { name: "Groq", models: ["llama-4-scout", "mixtral-8x7b"], status: "limited", latency: "45ms", cost: "Free tier" },
  { name: "DeepSeek", models: ["deepseek-v3", "deepseek-r1"], status: "active", latency: "567ms", cost: "$0.0002/1k" },
];

const REQUESTS = [
  { time: "14:35:02", model: "gpt-5.4", tokens: 1240, cost: "$0.0037", latency: "421ms", status: "ok" },
  { time: "14:34:55", model: "claude-sonnet-4", tokens: 892, cost: "$0.0134", latency: "312ms", status: "ok" },
  { time: "14:34:31", model: "gemini-2.5-flash", tokens: 3401, cost: "$0.0034", latency: "189ms", status: "ok" },
  { time: "14:34:10", model: "gpt-5.4", tokens: 567, cost: "$0.0017", latency: "398ms", status: "ok" },
  { time: "14:33:48", model: "llama-4-scout", tokens: 2100, cost: "$0.0000", latency: "43ms", status: "ratelimit" },
];

export function AxonHubModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [tab, setTab] = useState<"gateway" | "routing" | "ai">("gateway");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [routingMode, setRoutingMode] = useState<"roundrobin" | "cheapest" | "fastest" | "smartload">("smartload");

  async function runAI() {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    const prompt = `You are AxonHub AI — an expert in AI gateway configuration, model routing optimization, load balancing strategies, cost reduction, and multi-provider orchestration (OpenAI, Anthropic, Google, Groq, DeepSeek, Mistral).

User query: ${aiQuery}

Provide expert gateway configuration advice, routing strategies, and cost optimization. Be precise and actionable.`;
    try {
      let acc = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setAiResponse(acc); },
      );
    } catch { /* */ }
    setAiLoading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Ag(0.25)}`, maxHeight: "88vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Ag(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Ag(0.1), border: `1px solid ${Ag(0.3)}` }}>
              <Globe className="w-5 h-5" style={{ color: A }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">AxonHub Gateway</div>
              <div className="text-[10px]" style={{ color: "#444" }}>Universal AI Router · Load Balancer · Cost Tracker · RBAC</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b flex-shrink-0" style={{ borderColor: Ag(0.08) }}>
          {(["gateway", "routing", "ai"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
              style={tab === t ? { background: Ag(0.12), color: A, border: `1px solid ${Ag(0.3)}` } : { color: "#444", border: "1px solid transparent" }}>
              {t === "gateway" ? "Gateway Status" : t === "routing" ? "Smart Routing" : "AI Optimizer"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === "gateway" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Requests Today", value: "12,847", icon: Activity, color: A },
                  { label: "Avg Latency", value: "287ms", icon: Zap, color: "#10b981" },
                  { label: "Cost Today", value: "$4.23", icon: DollarSign, color: "#fbbf24" },
                  { label: "Uptime", value: "99.9%", icon: CheckCircle, color: "#10b981" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                    <div className="text-[16px] font-bold text-white">{value}</div>
                    <div className="text-[9px]" style={{ color: "#555" }}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: A }}>Connected Providers</div>
              {PROVIDERS.map(p => (
                <div key={p.name} className="rounded-xl p-3" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-white">{p.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: p.status === "active" ? "#10b98115" : "#fbbf2415", color: p.status === "active" ? "#10b981" : "#fbbf24" }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px]" style={{ color: "#555" }}>
                      <span>⚡ {p.latency}</span>
                      <span>💰 {p.cost}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {p.models.map(m => (
                      <span key={m} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: Ag(0.06), color: "#666" }}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: "#555" }}>Recent Requests</div>
              <div className="space-y-1">
                {REQUESTS.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "#111" }}>
                    <span className="text-[9px] font-mono" style={{ color: "#333" }}>{r.time}</span>
                    <span className="text-[10px] font-mono flex-1" style={{ color: r.status === "ok" ? "#ccc" : "#fbbf24" }}>{r.model}</span>
                    <span className="text-[9px]" style={{ color: "#555" }}>{r.tokens} tok</span>
                    <span className="text-[9px]" style={{ color: "#10b981" }}>{r.cost}</span>
                    <span className="text-[9px]" style={{ color: "#555" }}>{r.latency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "routing" && (
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: A }}>Routing Strategy</div>
              <div className="grid grid-cols-2 gap-2">
                {(["smartload", "roundrobin", "cheapest", "fastest"] as const).map(mode => (
                  <button key={mode} onClick={() => setRoutingMode(mode)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{ background: routingMode === mode ? Ag(0.1) : "#111", border: `1px solid ${routingMode === mode ? Ag(0.3) : "#1a1a1a"}`, color: routingMode === mode ? A : "#666" }}>
                    <div className="text-[11px] font-bold capitalize mb-1">{mode === "smartload" ? "Smart Load Balance" : mode === "roundrobin" ? "Round Robin" : mode === "cheapest" ? "Cheapest First" : "Fastest First"}</div>
                    <div className="text-[9px]" style={{ color: "#444" }}>
                      {mode === "smartload" ? "ML-based routing using latency + cost + availability" : mode === "roundrobin" ? "Distribute evenly across all healthy providers" : mode === "cheapest" ? "Always route to lowest cost provider" : "Always route to lowest latency provider"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <div className="text-[10px] font-bold" style={{ color: A }}>Failover Rules</div>
                {[
                  { trigger: "Latency > 2000ms", action: "Switch to next provider" },
                  { trigger: "Error rate > 5%", action: "Remove from rotation (60s)" },
                  { trigger: "429 Rate Limit", action: "Retry after backoff delay" },
                  { trigger: "Quota exhausted", action: "Failover to backup account" },
                ].map(({ trigger, action }) => (
                  <div key={trigger} className="flex items-center gap-2 text-[10px]">
                    <ArrowLeftRight className="w-3 h-3 flex-shrink-0" style={{ color: "#333" }} />
                    <span style={{ color: "#e21227" }}>{trigger}</span>
                    <span style={{ color: "#333" }}>→</span>
                    <span style={{ color: "#10b981" }}>{action}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ background: Ag(0.04), border: `1px solid ${Ag(0.12)}` }}>
                <div className="text-[10px] font-bold mb-2" style={{ color: A }}>Model Aliases (Zero Code Changes)</div>
                <div className="space-y-1.5 text-[10px] font-mono">
                  {[
                    ["gpt-4", "→ claude-opus-4 (cheaper)"],
                    ["claude-3-sonnet", "→ gemini-2.5-pro (faster)"],
                    ["gpt-4-turbo", "→ deepseek-v3 (80% cheaper)"],
                  ].map(([from, to]) => (
                    <div key={from} className="flex items-center gap-2">
                      <span style={{ color: "#555" }}>{from}</span>
                      <span style={{ color: "#333" }}>{to}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {["Optimize routing for lowest cost with &lt;500ms latency SLA", "How to configure failover between OpenAI and Anthropic?", "Generate RBAC rules for a team of 5 developers", "Analyze my request logs and suggest cost optimizations"].map(q => (
                  <button key={q} onClick={() => setAiQuery(q.replace("&lt;", "<"))} className="w-full text-left px-3 py-2 rounded-lg text-[10px] border transition-all hover:border-indigo-500/30" style={{ background: "#111", borderColor: "#1a1a1a", color: "#888" }}>
                    {q.replace("&lt;", "<")}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runAI()}
                  placeholder="Ask AxonHub AI..."
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none"
                  style={{ borderColor: Ag(0.2), color: "#ccc" }} />
                <button onClick={runAI} disabled={aiLoading} className="px-4 rounded-xl text-[10px] font-bold border" style={{ background: Ag(0.08), borderColor: Ag(0.3), color: A }}>
                  {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                </button>
              </div>

              {aiResponse && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap" style={{ background: "#111", border: `1px solid ${Ag(0.12)}`, color: "#ccc" }}>
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
