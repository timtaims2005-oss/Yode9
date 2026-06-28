// ─────────────────────────────────────────────────────────────────────────────
//  NEXUS PANEL — لوحة التحكم الكاملة لنظام NEXUS AI AGENT
//  تعرض جميع الأوامر المتاحة مع إمكانية التنفيذ اليدوي والبحث والسجل
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NEXUS_TOOL_REGISTRY, CATEGORY_LABELS, type NexusTool, type NexusDispatchers } from "@/lib/ToolRegistry";
import { NexusCore, type NexusActivityEntry } from "@/lib/NexusCore";
import { executeNexusResponse } from "./NexusExecutor";

// ── Icons ─────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  security: "🔴",
  osint:    "🟠",
  modal:    "🔵",
  persona:  "🟣",
  theme:    "🌈",
  model:    "🤖",
  ui:       "💻",
  system:   "⚙️",
  chat:     "💬",
  arsenal:  "⚡",
};

const CATEGORY_COLORS: Record<string, string> = {
  security: "#ff3333",
  osint:    "#ff8800",
  modal:    "#3388ff",
  persona:  "#aa44ff",
  theme:    "#ff44cc",
  model:    "#00ffaa",
  ui:       "#4488ff",
  system:   "#888888",
  chat:     "#ffcc00",
  arsenal:  "#ff2200",
};

interface Props {
  open: boolean;
  onClose: () => void;
  dispatchers: NexusDispatchers | null;
}

function useNexusActivity() {
  const [log, setLog] = useState<NexusActivityEntry[]>(() => NexusCore.getState().activityLog);
  useEffect(() => NexusCore.subscribe((s) => setLog([...s.activityLog])), []);
  return log;
}

function useNexusRunning() {
  const [running, setRunning] = useState(false);
  useEffect(() => NexusCore.subscribe((s) => setRunning(s.executionState.running)), []);
  return running;
}

// ── Tool Card ─────────────────────────────────────────────────────────────────
function ToolCard({ tool, onExecute, running }: {
  tool: NexusTool;
  onExecute: (tool: NexusTool) => void;
  running: boolean;
}) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);
  const hasParams = tool.params && Object.keys(tool.params).length > 0;
  const color = CATEGORY_COLORS[tool.category] ?? "#888";

  function handleRun() {
    const resolvedParams = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, v])
    );
    onExecute({ ...tool, execute: (_, d) => tool.execute(resolvedParams, d) });
  }

  return (
    <motion.div
      layout
      className="rounded-xl border transition-colors cursor-pointer"
      style={{ borderColor: `${color}25`, background: "rgba(0,8,18,0.7)" }}
      whileHover={{ borderColor: `${color}50`, background: "rgba(0,8,18,0.9)" }}
    >
      <div
        className="flex items-start gap-3 p-3"
        onClick={() => hasParams && setExpanded(!expanded)}
      >
        <span className="text-base mt-0.5 flex-shrink-0">{CATEGORY_ICONS[tool.category] ?? "•"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white/90">{tool.nameAr}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: `${color}15`, color, border: `1px solid ${color}30`, fontSize: "9px" }}
            >
              {tool.id}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{tool.descriptionAr}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleRun(); }}
          disabled={running}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 disabled:opacity-40"
          style={{
            background: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          {running ? "..." : "▶ تشغيل"}
        </button>
      </div>

      {/* Params Section */}
      <AnimatePresence>
        {expanded && hasParams && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-2 border-t border-white/5">
              {Object.entries(tool.params!).map(([key, def]) => (
                <div key={key}>
                  <label className="text-xs text-white/40 block mb-1">
                    {key} {def.required && <span className="text-red-400">*</span>}
                    <span className="text-white/25 ml-1">— {def.description}</span>
                  </label>
                  {def.enum ? (
                    <select
                      value={params[key] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">اختر...</option>
                      {def.enum.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : def.type === "boolean" ? (
                    <select
                      value={params[key] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">اختر...</option>
                      <option value="true">تفعيل</option>
                      <option value="false">تعطيل</option>
                    </select>
                  ) : (
                    <input
                      type={def.type === "number" ? "number" : "text"}
                      placeholder={def.description}
                      value={params[key] ?? ""}
                      onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20"
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Activity Row ──────────────────────────────────────────────────────────────
function ActivityRow({ entry }: { entry: NexusActivityEntry }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm flex-shrink-0">{entry.success ? "✅" : "❌"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white/90 truncate">{entry.actionLabel}</p>
        <p className="text-xs text-white/40 truncate">{entry.message}</p>
      </div>
      <span className="text-xs text-white/25 flex-shrink-0 whitespace-nowrap">
        {new Date(entry.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
}

// ── Quick Command Chips ───────────────────────────────────────────────────────
const QUICK_COMMANDS = [
  { label: "افتح الترسانة", cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_arsenal"}]\n<<<END_NEXUS>>>' },
  { label: "ثيم أحمر",     cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"set_theme","params":{"accent":"red"}}]\n<<<END_NEXUS>>>' },
  { label: "ثيم أخضر",     cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"set_theme","params":{"accent":"green"}}]\n<<<END_NEXUS>>>' },
  { label: "ثيم بنفسجي",   cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"set_theme","params":{"accent":"purple"}}]\n<<<END_NEXUS>>>' },
  { label: "شخصية هاكر",   cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"set_persona","params":{"persona":"hacker"}}]\n<<<END_NEXUS>>>' },
  { label: "شخصية Red Team", cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"set_persona","params":{"persona":"redteam"}}]\n<<<END_NEXUS>>>' },
  { label: "OSINT",         cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_osint_dash"}]\n<<<END_NEXUS>>>' },
  { label: "Threat Intel",  cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_threat_intel"}]\n<<<END_NEXUS>>>' },
  { label: "War Room",      cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_war_room"}]\n<<<END_NEXUS>>>' },
  { label: "محادثة جديدة", cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"new_chat"}]\n<<<END_NEXUS>>>' },
  { label: "محرر الكود",   cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_monaco"}]\n<<<END_NEXUS>>>' },
  { label: "Red Team",      cmd: '<<<NEXUS_ACTIONS>>>\n[{"action":"open_red_team"}]\n<<<END_NEXUS>>>' },
];

// ── Main Panel ────────────────────────────────────────────────────────────────
export function NexusPanel({ open, onClose, dispatchers }: Props) {
  const [tab, setTab]         = useState<"tools" | "log" | "state">("tools");
  const [search, setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const activityLog           = useNexusActivity();
  const running               = useNexusRunning();

  const categories = ["all", ...Array.from(new Set(NEXUS_TOOL_REGISTRY.map((t) => t.category)))];

  const filtered = NEXUS_TOOL_REGISTRY.filter((t) => {
    const matchCat = catFilter === "all" || t.category === catFilter;
    const q = search.toLowerCase();
    const matchQ = !q || t.id.includes(q) || t.nameAr.includes(q) || t.descriptionAr.includes(q);
    return matchCat && matchQ;
  });

  const handleExecute = useCallback((tool: NexusTool) => {
    if (!dispatchers) return;
    NexusCore.startExecution([{ actionId: tool.id, label: tool.nameAr }]);
    try {
      const result = tool.execute({}, dispatchers);
      NexusCore.advanceExecution({ actionId: result.actionId, success: result.success, message: result.messageAr });
    } catch (e) {
      NexusCore.advanceExecution({ actionId: tool.id, success: false, message: e instanceof Error ? e.message : "فشل" });
    }
    setTimeout(() => NexusCore.finishExecution(), 300);
  }, [dispatchers]);

  const handleQuickCommand = useCallback((cmd: string) => {
    executeNexusResponse(cmd).catch(() => {});
  }, []);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9995] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.94, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="w-full max-w-4xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden"
          style={{
            background: "rgba(2,8,18,0.97)",
            borderColor: "#00ff8830",
            boxShadow: "0 0 60px #00ff8815, 0 24px 80px #00000080",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
            style={{ borderColor: "#00ff8820" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#00ff8815", border: "1px solid #00ff8840" }}>
                <span className="text-sm font-black text-emerald-400">N</span>
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-widest">NEXUS AI AGENT</h2>
                <p className="text-xs text-white/35">نظام التحكم الكامل بالتطبيق</p>
              </div>
              {running && (
                <span className="ml-2 flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  يُنفِّذ...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30 font-mono">ESC للإغلاق · Ctrl+Shift+N للفتح</span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Commands */}
          <div className="px-6 py-3 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "#ffffff08" }}>
            <div className="flex gap-2 flex-nowrap">
              {QUICK_COMMANDS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickCommand(q.cmd)}
                  disabled={running}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{ background: "#ffffff08", borderColor: "#ffffff15", color: "#ffffff70" }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 flex-shrink-0">
            {(["tools", "log", "state"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                style={{
                  background: tab === t ? "#00ff8815" : "transparent",
                  color: tab === t ? "#00ff88" : "#ffffff40",
                  border: tab === t ? "1px solid #00ff8830" : "1px solid transparent",
                }}
              >
                {t === "tools" ? `الأدوات (${NEXUS_TOOL_REGISTRY.length})` : t === "log" ? `السجل (${activityLog.length})` : "حالة النظام"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 pt-3">
            {tab === "tools" && (
              <>
                {/* Search + Category Filter */}
                <div className="flex gap-3 mb-4 flex-shrink-0 flex-wrap">
                  <input
                    type="text"
                    placeholder="ابحث عن أمر..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-40 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-emerald-500/50"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCatFilter(c)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200"
                        style={{
                          background: catFilter === c ? `${CATEGORY_COLORS[c] ?? "#00ff88"}15` : "transparent",
                          color: catFilter === c ? (CATEGORY_COLORS[c] ?? "#00ff88") : "#ffffff40",
                          borderColor: catFilter === c ? `${CATEGORY_COLORS[c] ?? "#00ff88"}40` : "#ffffff10",
                        }}
                      >
                        {c === "all" ? `الكل (${NEXUS_TOOL_REGISTRY.length})` : `${CATEGORY_ICONS[c] ?? ""} ${CATEGORY_LABELS[c] ?? c}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tools Grid */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 text-white/25 text-sm">لا توجد أوامر مطابقة</div>
                  ) : (
                    filtered.map((tool) => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        onExecute={handleExecute}
                        running={running}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {tab === "log" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <span className="text-xs text-white/40">آخر {activityLog.length} عملية</span>
                  {activityLog.length > 0 && (
                    <button
                      onClick={() => NexusCore.clearLog()}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      مسح السجل
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  {activityLog.length === 0 ? (
                    <div className="text-center py-12 text-white/25 text-sm">لا يوجد سجل بعد — أرسل رسالة للذكاء الاصطناعي</div>
                  ) : (
                    activityLog.map((e) => <ActivityRow key={e.id} entry={e} />)
                  )}
                </div>
              </div>
            )}

            {tab === "state" && <StateTab />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── State Tab ─────────────────────────────────────────────────────────────────
function StateTab() {
  const [snap, setSnap] = useState<Record<string, unknown>>({});

  useEffect(() => {
    function onStateChange(e: Event) {
      const { detail } = e as CustomEvent;
      if (detail) setSnap(detail);
    }
    window.addEventListener("nexus:state-change", onStateChange);
    setSnap(NexusCore.getState() as unknown as Record<string, unknown>);
    return () => window.removeEventListener("nexus:state-change", onStateChange);
  }, []);

  const stateItems: { label: string; valueKey: string }[] = [
    { label: "NEXUS مُفعَّل", valueKey: "enabled" },
    { label: "عدد سجلات النشاط", valueKey: "activityLog.length" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="space-y-3">
        {/* NEXUS State */}
        <div className="rounded-xl border border-white/5 p-4" style={{ background: "#00ff8808" }}>
          <h3 className="text-xs font-black text-emerald-400 tracking-widest mb-3">حالة NEXUS</h3>
          <div className="space-y-2">
            <Row label="مُفعَّل" value={String((snap as { enabled?: boolean }).enabled ?? true)} />
            <Row label="يعمل الآن" value={String((snap as { executionState?: { running: boolean } }).executionState?.running ?? false)} />
            <Row label="عدد سجلات النشاط" value={String(((snap as { activityLog?: unknown[] }).activityLog ?? []).length)} />
          </div>
        </div>

        {/* How to use */}
        <div className="rounded-xl border border-white/5 p-4">
          <h3 className="text-xs font-black text-cyan-400 tracking-widest mb-3">كيفية الاستخدام</h3>
          <div className="space-y-2 text-xs text-white/50 leading-relaxed">
            <p>• أرسل رسالة للذكاء الاصطناعي تطلب منه فتح أداة أو تغيير إعداد</p>
            <p>• الذكاء الاصطناعي سيضع أوامر JSON في رده وسيُنفِّذها NEXUS تلقائياً</p>
            <p>• يمكنك أيضاً تشغيل الأوامر يدوياً من قائمة الأدوات أعلاه</p>
            <p>• استخدم <code className="text-emerald-400">Ctrl+Shift+N</code> لفتح/إغلاق هذه اللوحة</p>
            <p>• الشارة الخضراء في أسفل يمين الشاشة تظهر سجل النشاط</p>
          </div>
        </div>

        {/* Example prompts */}
        <div className="rounded-xl border border-white/5 p-4">
          <h3 className="text-xs font-black text-amber-400 tracking-widest mb-3">أمثلة على الطلبات</h3>
          <div className="space-y-2">
            {[
              "افتح لوحة OSINT",
              "غير لون الثيم إلى البنفسجي",
              "شغّل أداة Red Team",
              "غيّر الشخصية إلى هاكر",
              "افتح AI Terminal وغيّر درجة الحرارة إلى 0.9",
              "بدّل إلى مزود Groq مع نموذج llama-3.1-70b",
              "افتح ترسانة الأدوات واعرض لوحة التهديدات",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("kali:inject-prompt", { detail: { prompt: ex } }));
                }}
                className="w-full text-right px-3 py-2 rounded-lg text-xs text-amber-300/60 hover:text-amber-300 hover:bg-amber-400/5 transition-all border border-transparent hover:border-amber-400/20"
              >
                → {ex}
              </button>
            ))}
          </div>
        </div>

        {void stateItems}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs font-mono text-emerald-400/80">{value}</span>
    </div>
  );
}
