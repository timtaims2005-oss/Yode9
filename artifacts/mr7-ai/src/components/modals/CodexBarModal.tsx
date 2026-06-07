import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart2, RefreshCw, Copy, CheckCheck, Zap, AlertTriangle } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CodexBarModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PROVIDERS = [
  { name: "OpenAI Codex", limit: 500000, used: Math.floor(Math.random() * 400000), resetIn: "3h 22m", color: "#10b981", status: "ok" },
  { name: "Claude (Sonnet)", limit: 200000, used: Math.floor(Math.random() * 180000), resetIn: "1h 05m", color: "#fbbf24", status: "warn" },
  { name: "Gemini Pro", limit: 1000000, used: Math.floor(Math.random() * 200000), resetIn: "8h 00m", color: "#3b82f6", status: "ok" },
  { name: "GPT-5.4", limit: 300000, used: Math.floor(Math.random() * 290000), resetIn: "0h 12m", color: "#e21227", status: "critical" },
  { name: "GPT-5-mini", limit: 2000000, used: Math.floor(Math.random() * 500000), resetIn: "6h 40m", color: "#10b981", status: "ok" },
  { name: "Grok-3", limit: 150000, used: Math.floor(Math.random() * 80000), resetIn: "4h 15m", color: "#a78bfa", status: "ok" },
  { name: "DeepSeek-V3", limit: 1000000, used: Math.floor(Math.random() * 600000), resetIn: "5h 30m", color: "#06b6d4", status: "ok" },
  { name: "Cursor Pro", limit: 500, used: Math.floor(Math.random() * 490), resetIn: "Monthly", color: "#f97316", status: "warn" },
  { name: "Copilot", limit: 2000, used: Math.floor(Math.random() * 800), resetIn: "Monthly", color: "#60a5fa", status: "ok" },
  { name: "OpenRouter", limit: 999999, used: Math.floor(Math.random() * 100000), resetIn: "Monthly", color: "#22d3ee", status: "ok" },
];

function pct(used: number, limit: number) { return Math.min(100, Math.round((used / limit) * 100)); }
function fmt(n: number) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n); }

export function CodexBarModal({ open, onOpenChange }: CodexBarModalProps) {
  const [providers, setProviders] = useState(PROVIDERS);
  const [copied, setCopied] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  function refresh() {
    setProviders(PROVIDERS.map(p => ({
      ...p,
      used: Math.floor(Math.random() * p.limit),
      status: Math.random() > 0.8 ? "warn" : Math.random() > 0.95 ? "critical" : "ok",
    })));
    setLastRefresh(new Date());
  }

  function copyReport() {
    const report = providers.map(p =>
      `${p.name}: ${fmt(p.used)}/${fmt(p.limit)} (${pct(p.used,p.limit)}%) — resets in ${p.resetIn}`
    ).join("\n");
    navigator.clipboard.writeText(report);
    setCopied(true);
    pipeline.push({ source: "CodexBar", label: "Token Report", content: report, sourceColor: "#10b981" });
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(16,185,129,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <BarChart2 className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">CodexBar</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>AI Token Limits Dashboard — 40+ Providers</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)", color: "#10b981" }}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
                <button onClick={copyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>
                  {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Report</>}
                </button>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Summary row */}
            <div className="px-5 py-3 flex items-center gap-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] font-mono" style={{ color: "#333" }}>
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>
              {providers.filter(p => p.status === "critical").length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#e21227" }}>
                  <AlertTriangle className="w-3 h-3" />
                  {providers.filter(p => p.status === "critical").length} providers near limit
                </div>
              )}
              <div className="ml-auto text-[10px] font-mono" style={{ color: "#444" }}>
                {providers.filter(p => p.status === "ok").length} healthy · {providers.filter(p => p.status !== "ok").length} warning
              </div>
            </div>

            {/* Provider grid */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {providers.map((p) => {
                const pctVal = pct(p.used, p.limit);
                const barColor = pctVal > 90 ? "#e21227" : pctVal > 70 ? "#fbbf24" : p.color;
                return (
                  <motion.div key={p.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.05)` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: barColor, boxShadow: `0 0 4px ${barColor}` }} />
                        <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>{p.name}</span>
                        {p.status === "critical" && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(226,18,39,0.15)", color: "#e21227" }}>NEAR LIMIT</span>
                        )}
                        {p.status === "warn" && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>WARNING</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span style={{ color: "#555" }}>resets {p.resetIn}</span>
                        <span style={{ color: barColor }}>{fmt(p.used)}</span>
                        <span style={{ color: "#333" }}>/ {fmt(p.limit)}</span>
                        <span className="font-bold" style={{ color: barColor }}>{pctVal}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, boxShadow: `0 0 6px ${barColor}80` }}
                        initial={{ width: 0 }} animate={{ width: `${pctVal}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <Zap className="w-3 h-3" style={{ color: "#10b981" }} />
              <span className="text-[10px]" style={{ color: "#333" }}>Privacy-first — reuses existing sessions, no passwords stored. Simulated data for display.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
