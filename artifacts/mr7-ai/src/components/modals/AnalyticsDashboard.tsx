import React from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, BarChart2, TrendingUp, Zap, Clock, DollarSign, MessageSquare,
  Activity, Award, AlertTriangle, ChevronDown, Download, RefreshCw,
  Cpu, Globe, Target, Layers,
} from "lucide-react";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onClose: () => void; }

type TabId = "overview" | "tokens" | "models" | "cost" | "perf";

const COST_PER_1K: Record<string, { in: number; out: number }> = {
  "CHAT-GPT Fast":          { in: 0.0005, out: 0.0015 },
  "CHAT-GPT Pro":           { in: 0.01,   out: 0.03   },
  "CHAT-GPT Thinking":      { in: 0.015,  out: 0.06   },
  "CHAT-GPT o4-mini":       { in: 0.00015,out: 0.0006 },
  "CHAT-GPT o3":            { in: 0.01,   out: 0.04   },
  "CHAT-GPT Vision":        { in: 0.01,   out: 0.03   },
  "Claude Sonnet":          { in: 0.003,  out: 0.015  },
  "Claude Haiku":           { in: 0.00025,out: 0.00125},
  "Claude Opus":            { in: 0.015,  out: 0.075  },
  "Gemini 2.0 Flash":       { in: 0.00015,out: 0.0006 },
  "Gemini 2.5 Pro":         { in: 0.00125,out: 0.005  },
  "Gemini Flash Thinking":  { in: 0.00015,out: 0.0006 },
  "DeepSeek V3":            { in: 0.00027,out: 0.0011 },
  "DeepSeek R1":            { in: 0.00055,out: 0.00219},
  "Grok 3 Fast":            { in: 0.005,  out: 0.015  },
};

function estimateTok(s: string) { return Math.ceil(s.length / 4); }

function sparkPath(vals: number[], w = 120, h = 32): string {
  if (!vals.length) return "";
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`);
  return `M${pts.join(" L")}`;
}

function MiniSpark({ vals, color }: { vals: number[]; color: string }) {
  const path = sparkPath(vals);
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none">
      <path d={sparkPath(vals, 80, 24)} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  );
}

function BarChart({ data, color, maxH = 60 }: { data: { label: string; val: number }[]; color: string; maxH?: number }) {
  const max = Math.max(...data.map(d => d.val), 1);
  return (
    <div className="flex items-end gap-1 h-16 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
          <motion.div
            initial={{ height: 0 }} animate={{ height: `${(d.val / max) * maxH}px` }}
            transition={{ delay: i * 0.03, duration: 0.4 }}
            className="w-full rounded-sm min-h-[2px]"
            style={{ background: color, opacity: 0.7 + 0.3 * (d.val / max) }}
          />
          <span className="text-[8px] text-slate-600 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, spark, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  color: string; spark?: number[]; trend?: number;
}) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] p-3.5 flex flex-col gap-2" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "22", border: `1px solid ${color}33` }}>
            {(React.createElement(Icon, { className: "w-3.5 h-3.5", style: { color } }))}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        </div>
        {trend !== undefined && (
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${trend >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[20px] font-black text-white leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
        </div>
        {spark && <MiniSpark vals={spark} color={color} />}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ open, onClose }: Props) {
  const { state } = useStore();
  const [tab, setTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");

  const stats = useMemo(() => {
    const allMsgs = state.chats.flatMap(c => c.messages);
    const userMsgs = allMsgs.filter(m => m.role === "user");
    const asstMsgs = allMsgs.filter(m => m.role === "assistant");
    const totalTok = allMsgs.reduce((s, m) => s + estimateTok(m.content), 0);
    const inTok = userMsgs.reduce((s, m) => s + estimateTok(m.content), 0);
    const outTok = asstMsgs.reduce((s, m) => s + estimateTok(m.content), 0);

    // Cost estimation
    let totalCost = 0;
    allMsgs.forEach(m => {
      const model = m.model || "CHAT-GPT Fast";
      const rates = COST_PER_1K[model] || { in: 0.001, out: 0.002 };
      const tok = estimateTok(m.content);
      totalCost += (tok / 1000) * (m.role === "user" ? rates.in : rates.out);
    });

    // Models usage
    const modelCounts: Record<string, number> = {};
    asstMsgs.forEach(m => {
      const k = m.model || "CHAT-GPT Fast";
      modelCounts[k] = (modelCounts[k] || 0) + 1;
    });

    // Per-day stats (last 30)
    const now = Date.now();
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 86400000);
      return d.toLocaleDateString("en", { month: "short", day: "numeric" });
    });
    const dayMs = 86400000;
    const perDay = Array.from({ length: 30 }, (_, i) => {
      const start = now - (29 - i) * dayMs;
      const end = start + dayMs;
      return allMsgs.filter(m => m.ts >= start && m.ts < end).reduce((s, m) => s + estimateTok(m.content), 0);
    });

    // Council uses
    const councilMsgs = asstMsgs.filter(m => m.council);
    const godmodeMsgs = asstMsgs.filter(m => m.godmode);

    return {
      totalChats: state.chats.length,
      totalMsgs: allMsgs.length,
      userMsgs: userMsgs.length,
      asstMsgs: asstMsgs.length,
      totalTok, inTok, outTok,
      totalCost,
      modelCounts,
      perDay,
      days,
      councilUses: councilMsgs.length,
      godmodeUses: godmodeMsgs.length,
      bookmarked: allMsgs.filter(m => m.bookmarked).length,
      avgMsgPerChat: state.chats.length ? (allMsgs.length / state.chats.length).toFixed(1) : "0",
      topModel: Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—",
    };
  }, [state.chats]);

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "نظرة عامة", icon: BarChart2 },
    { id: "tokens", label: "التوكنات", icon: Zap },
    { id: "models", label: "النماذج", icon: Cpu },
    { id: "cost", label: "التكلفة", icon: DollarSign },
    { id: "perf", label: "الأداء", icon: Activity },
  ];

  const modelList = Object.entries(stats.modelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxModel = modelList[0]?.[1] || 1;

  const MODEL_COLORS = ["#e21227", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#84cc16", "#6366f1"];

  // Cost by model
  const costByModel = Object.entries(stats.modelCounts).map(([model, count]) => {
    const rates = COST_PER_1K[model] || { in: 0.001, out: 0.002 };
    return { model, cost: count * 100 * (rates.in + rates.out) / 2 };
  }).sort((a, b) => b.cost - a.cost).slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className="relative w-full max-h-[90dvh] flex flex-col rounded-[18px] border border-[#1f1f1f] overflow-hidden"
            style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", background: "#050510" }}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}>

            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b border-[#1a1a2e] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <BarChart2 className="w-4.5 h-4.5 text-[#3b82f6]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-white">Analytics Dashboard</h2>
                  <p className="text-[10px] font-mono text-[#3b82f6]/60">استخدام التوكنات · التكلفة · الأداء · النماذج</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Period selector */}
                <div className="flex items-center gap-0.5 bg-black/40 border border-[#1f1f1f] rounded-lg p-0.5">
                  {(["7d", "30d", "all"] as const).map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${period === p ? "bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30" : "text-slate-500 hover:text-slate-300"}`}>
                      {p === "all" ? "الكل" : p}
                    </button>
                  ))}
                </div>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 px-4 pt-2 shrink-0 border-b border-[#1a1a2e] overflow-x-auto no-scrollbar">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold transition-all shrink-0 border-b-2 ${
                    tab === id ? "text-[#3b82f6] border-[#3b82f6] bg-[#3b82f6]/08" : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}>
                  {(Icon ? React.createElement(Icon, { className: "w-3.5 h-3.5" }) : null)} {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* OVERVIEW */}
              {tab === "overview" && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard label="المحادثات" value={stats.totalChats.toString()} sub={`${stats.avgMsgPerChat} رسالة/محادثة`} icon={MessageSquare} color="#3b82f6" spark={stats.perDay.slice(-8)} trend={12} />
                    <StatCard label="إجمالي الرسائل" value={stats.totalMsgs.toLocaleString()} sub={`${stats.userMsgs} مستخدم · ${stats.asstMsgs} AI`} icon={Activity} color="#10b981" spark={stats.perDay.slice(-8)} trend={8} />
                    <StatCard label="التوكنات المستهلكة" value={stats.totalTok > 1000000 ? `${(stats.totalTok/1000000).toFixed(2)}M` : stats.totalTok > 1000 ? `${(stats.totalTok/1000).toFixed(1)}K` : stats.totalTok.toString()} sub={`${(stats.inTok/1000).toFixed(0)}K إدخال · ${(stats.outTok/1000).toFixed(0)}K إخراج`} icon={Zap} color="#f59e0b" spark={stats.perDay.slice(-8)} />
                    <StatCard label="التكلفة التقديرية" value={`$${stats.totalCost.toFixed(4)}`} sub="تقدير بناءً على الأسعار الرسمية" icon={DollarSign} color="#e21227" />
                    <StatCard label="جلسات Council" value={stats.councilUses.toString()} sub="105 عقل في وقت واحد" icon={Layers} color="#8b5cf6" />
                    <StatCard label="جلسات Godmode" value={stats.godmodeUses.toString()} sub="أقوى وضع توليد" icon={Target} color="#f97316" />
                    <StatCard label="الرسائل المحفوظة" value={stats.bookmarked.toString()} sub="علّمتها كمرجع" icon={Award} color="#06b6d4" />
                    <StatCard label="النموذج الأكثر استخداماً" value={stats.topModel.split(" ").slice(-1)[0]} sub={stats.topModel} icon={Cpu} color="#ec4899" />
                  </div>

                  {/* Daily tokens bar chart */}
                  <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[12px] font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#3b82f6]" /> التوكنات اليومية (آخر 30 يوم)
                      </h3>
                      <span className="text-[9px] font-mono text-slate-600">
                        إجمالي: {(stats.totalTok / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div className="flex items-end gap-px h-20">
                      {stats.perDay.map((v, i) => {
                        const max = Math.max(...stats.perDay, 1);
                        const h = Math.max((v / max) * 64, v > 0 ? 3 : 0);
                        return (
                          <motion.div key={i}
                            initial={{ height: 0 }}
                            animate={{ height: h }}
                            transition={{ delay: i * 0.015 }}
                            className="flex-1 rounded-sm cursor-pointer group relative"
                            style={{ background: v > 0 ? `linear-gradient(to top, #3b82f6, #60a5fa)` : "#1f1f1f", minHeight: v > 0 ? 3 : 1, opacity: 0.7 + 0.3 * (v / Math.max(...stats.perDay, 1)) }}>
                            {v > 0 && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 text-[8px] text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-[#1f1f1f]">
                                {v > 1000 ? `${(v/1000).toFixed(1)}K` : v} tok
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[8px] text-slate-700">30 يوم مضت</span>
                      <span className="text-[8px] text-slate-700">اليوم</span>
                    </div>
                  </div>
                </>
              )}

              {/* TOKENS */}
              {tab === "tokens" && (
                <div className="space-y-4">
                  {/* Big token meters */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "إجمالي", val: stats.totalTok, max: Math.max(stats.totalTok, 1), color: "#3b82f6" },
                      { label: "إدخال (سؤال)", val: stats.inTok, max: Math.max(stats.totalTok, 1), color: "#10b981" },
                      { label: "إخراج (رد)", val: stats.outTok, max: Math.max(stats.totalTok, 1), color: "#f59e0b" },
                    ].map((m, i) => (
                      <div key={i} className="rounded-xl border border-[#1f1f1f] p-4 flex flex-col gap-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <p className="text-[10px] text-slate-500">{m.label}</p>
                        <p className="text-[22px] font-black text-white">
                          {m.val > 1000000 ? `${(m.val/1000000).toFixed(2)}M` : m.val > 1000 ? `${(m.val/1000).toFixed(1)}K` : m.val}
                        </p>
                        <div className="h-1.5 rounded-full bg-[#1f1f1f] overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: m.color }}
                            initial={{ width: 0 }} animate={{ width: `${(m.val / m.max) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <p className="text-[9px] text-slate-600">{((m.val / Math.max(stats.totalTok, 1)) * 100).toFixed(1)}% من الإجمالي</p>
                      </div>
                    ))}
                  </div>

                  {/* Token trend */}
                  <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <h3 className="text-[12px] font-bold text-white mb-3">توزيع التوكنات اليومي</h3>
                    <div className="space-y-1">
                      {stats.perDay.slice(-14).map((v, i) => {
                        const max = Math.max(...stats.perDay.slice(-14), 1);
                        const date = new Date(Date.now() - (13 - i) * 86400000);
                        const label = date.toLocaleDateString("ar", { weekday: "short", day: "numeric" });
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-600 w-16 text-right shrink-0">{label}</span>
                            <div className="flex-1 h-5 rounded-md bg-[#0a0a1a] overflow-hidden">
                              <motion.div className="h-full rounded-md flex items-center px-1.5"
                                style={{ background: `linear-gradient(90deg, #3b82f6, #60a5fa)`, width: `${(v / max) * 100}%`, minWidth: v > 0 ? 8 : 0 }}
                                initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ delay: i * 0.03 }}>
                                {v > 0 && <span className="text-[8px] text-white font-bold whitespace-nowrap">{v > 1000 ? `${(v/1000).toFixed(1)}K` : v}</span>}
                              </motion.div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* MODELS */}
              {tab === "models" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <h3 className="text-[12px] font-bold text-white mb-4">استخدام النماذج</h3>
                    {modelList.length === 0 ? (
                      <p className="text-[12px] text-slate-600 text-center py-8">لا توجد بيانات بعد — ابدأ محادثة!</p>
                    ) : (
                      <div className="space-y-2.5">
                        {modelList.map(([model, count], i) => (
                          <div key={model} className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500 w-4 text-right">{i + 1}</span>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] + "22" }}>
                              <Cpu className="w-2.5 h-2.5" style={{ color: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                            </div>
                            <span className="text-[11px] text-white w-40 truncate shrink-0">{model}</span>
                            <div className="flex-1 h-6 rounded-lg bg-[#0a0a1a] overflow-hidden">
                              <motion.div className="h-full rounded-lg flex items-center justify-end px-2"
                                style={{ background: `${MODEL_COLORS[i % MODEL_COLORS.length]}33`, borderRight: `2px solid ${MODEL_COLORS[i % MODEL_COLORS.length]}` }}
                                initial={{ width: 0 }} animate={{ width: `${(count / maxModel) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}>
                                <span className="text-[9px] font-bold text-white">{count}</span>
                              </motion.div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 w-12 text-right shrink-0">
                              {((count / Math.max(stats.asstMsgs, 1)) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {modelList.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {modelList.slice(0, 4).map(([model, count], i) => (
                        <div key={model} className="rounded-xl border border-[#1f1f1f] p-3 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
                            style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] + "15", color: MODEL_COLORS[i % MODEL_COLORS.length] }}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-white truncate max-w-[140px]">{model}</p>
                            <p className="text-[10px] text-slate-500">{count} استجابة</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COST */}
              {tab === "cost" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-[#1f1f1f] p-4 col-span-2 sm:col-span-1" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <p className="text-[10px] text-slate-500 mb-1">إجمالي التكلفة التقديرية</p>
                      <p className="text-[32px] font-black text-white">${stats.totalCost.toFixed(4)}</p>
                      <p className="text-[10px] text-slate-600 mt-1">بناءً على أسعار API الرسمية</p>
                    </div>
                    <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <p className="text-[10px] text-slate-500 mb-1">متوسط التكلفة / رسالة</p>
                      <p className="text-[22px] font-black text-white">
                        ${stats.totalMsgs > 0 ? (stats.totalCost / stats.totalMsgs).toFixed(5) : "0.00000"}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">متوسط كل رسالة</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <h3 className="text-[12px] font-bold text-white mb-4">التكلفة حسب النموذج</h3>
                    {costByModel.length === 0 ? (
                      <p className="text-[12px] text-slate-600 text-center py-6">لا توجد بيانات</p>
                    ) : costByModel.map(({ model, cost }, i) => (
                      <div key={model} className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] text-white w-36 truncate shrink-0">{model}</span>
                        <div className="flex-1 h-5 rounded bg-[#0a0a1a] overflow-hidden">
                          <motion.div className="h-full rounded"
                            style={{ background: MODEL_COLORS[i % MODEL_COLORS.length] + "66", width: `${(cost / (costByModel[0]?.cost || 1)) * 100}%` }}
                            initial={{ width: 0 }} animate={{ width: `${(cost / (costByModel[0]?.cost || 1)) * 100}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 w-16 text-right shrink-0">${(cost / 1000).toFixed(5)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-amber-500/20 p-3 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.05)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">
                      الأرقام تقديرية بناءً على عدد الرسائل وأسعار API العامة. التكلفة الفعلية قد تختلف حسب نوع الاستخدام والعقود.
                    </p>
                  </div>
                </div>
              )}

              {/* PERFORMANCE */}
              {tab === "perf" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "متوسط طول الرسالة", val: stats.totalMsgs > 0 ? Math.round((state.chats.flatMap(c => c.messages).reduce((s, m) => s + m.content.length, 0)) / stats.totalMsgs) : 0, unit: "حرف", color: "#3b82f6" },
                      { label: "متوسط التوكنات/رسالة", val: stats.totalMsgs > 0 ? Math.round(stats.totalTok / stats.totalMsgs) : 0, unit: "توكن", color: "#10b981" },
                      { label: "المحادثات النشطة", val: state.chats.filter(c => !c.archived).length, unit: "محادثة", color: "#f59e0b" },
                      { label: "محادثات مثبتة", val: state.chats.filter(c => c.pinned).length, unit: "مثبتة", color: "#8b5cf6" },
                      { label: "المجلدات", val: state.folders.length, unit: "مجلد", color: "#06b6d4" },
                      { label: "الذاكرة", val: state.memory.length, unit: "إدخال", color: "#ec4899" },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <p className="text-[9px] text-slate-500 mb-1">{item.label}</p>
                        <p className="text-[24px] font-black" style={{ color: item.color }}>{item.val.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-600">{item.unit}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#1f1f1f] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <h3 className="text-[12px] font-bold text-white mb-3">توزيع أوضاع الاستخدام</h3>
                    <div className="space-y-2.5">
                      {[
                        { label: "رسائل عادية", val: stats.asstMsgs - stats.councilUses - stats.godmodeUses, color: "#3b82f6" },
                        { label: "Council Mode (105 عقل)", val: stats.councilUses, color: "#8b5cf6" },
                        { label: "Godmode", val: stats.godmodeUses, color: "#e21227" },
                      ].map((item, i) => {
                        const pct = stats.asstMsgs > 0 ? (item.val / stats.asstMsgs) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className="text-[11px] text-white w-40 shrink-0">{item.label}</span>
                            <div className="flex-1 h-5 rounded bg-[#0a0a1a] overflow-hidden">
                              <motion.div className="h-full rounded flex items-center px-2"
                                style={{ background: item.color + "40", width: `${pct}%`, minWidth: item.val > 0 ? 30 : 0 }}
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1 }}>
                                <span className="text-[8px] font-bold text-white">{item.val}</span>
                              </motion.div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-[#1a1a2e] flex items-center justify-between shrink-0">
              <p className="text-[9px] font-mono text-slate-700">KALIGPT ANALYTICS · البيانات محلية فقط · لا ترفع إلى الخادم</p>
              <button onClick={onClose} className="px-4 py-1.5 rounded-xl text-[11px] font-bold border border-[#1f1f1f] text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
