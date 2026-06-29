// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX ABSOLUTE DASHBOARD — لوحة التحكم الإلهية الكاملة
//  واجهة موحدة لجميع الأنظمة التسعة: الخريطة الحية، الأوامر، الذاكرة،
//  التنفيذ، الصوت، التطور الذاتي، إحصائيات مباشرة
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Brain, Mic, MicOff, GitBranch, BarChart3, Clock,
  CheckCircle2, XCircle, AlertCircle, Search, Play, RefreshCw,
  Cpu, Database, Activity, ChevronRight, Layers, Sparkles,
  Terminal, Eye, EyeOff, Command, Star, TrendingUp,
} from "lucide-react";
import {
  OmnixAbsoluteCore,
  OmnixAbsoluteRegistry,
  OmnixMemory,
  OmnixSovereign,
  OmnixSelfEvolution,
  registerBuiltinCommands,
  type ExecutionJob,
  type EvolutionSuggestion,
  type ComponentEntry,
  type CommandDefinition,
  type OmnixAbsoluteCoreStatus,
} from "../lib/OmnixAbsolute";

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "overview" | "commands" | "map" | "logs" | "memory" | "evolution" | "voice";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "نظرة عامة",    icon: <Activity size={14} /> },
  { id: "commands",  label: "الأوامر",       icon: <Command size={14} /> },
  { id: "map",       label: "الخريطة الحية", icon: <Layers size={14} /> },
  { id: "logs",      label: "سجل التنفيذ",   icon: <Terminal size={14} /> },
  { id: "memory",    label: "الذاكرة",       icon: <Database size={14} /> },
  { id: "evolution", label: "التطور",        icon: <GitBranch size={14} /> },
  { id: "voice",     label: "الصوت",         icon: <Mic size={14} /> },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface OmnixAbsoluteDashboardProps {
  open: boolean;
  onClose: () => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OmnixAbsoluteDashboard({ open, onClose }: OmnixAbsoluteDashboardProps) {
  const core = useRef(OmnixAbsoluteCore.getInstance()).current;
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<OmnixAbsoluteCoreStatus>(() => core.getStatus());
  const [logs, setLogs] = useState<ExecutionJob[]>([]);
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);
  const [liveMap, setLiveMap] = useState<Map<string, ComponentEntry>>(new Map());
  const [cmdSearch, setCmdSearch] = useState("");
  const [cmdResult, setCmdResult] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "error">("idle");
  const [patterns, setPatterns] = useState<ReturnType<typeof OmnixMemory.getTopPatterns>>([]);
  const [initialized, setInitialized] = useState(false);

  // ── Initialize on first open ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (!initialized) {
      registerBuiltinCommands();
      core.initialize();
      setInitialized(true);
    }
    setPatterns(OmnixMemory.getInstance().getTopPatterns(10));
    setLogs(core.executor.getLastN(50));
    setSuggestions(core.evolution.getSuggestions());
  }, [open, core, initialized]);

  // ── Subscribe to live updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(core.onStatusChange(s => setStatus(s)));
    unsubs.push(OmnixSovereign.getInstance().subscribe(m => setLiveMap(new Map(m))));
    unsubs.push(core.evolution.onSuggestionsChange(list => setSuggestions([...list])));

    core.executor.onProgressCallback(() => {
      setLogs(core.executor.getLastN(50));
    });
    core.executor.onCompleteCallback(() => {
      setLogs(core.executor.getLastN(50));
      setPatterns(OmnixMemory.getInstance().getTopPatterns(10));
    });

    core.voice.onStateChange(s => setVoiceState(s));
    core.voice.onPartialTranscript(t => setVoiceText(t));
    core.voice.onCommandDetected(cmd => {
      setVoiceText(cmd.text);
      if (cmd.matchedCommand) {
        setCmdResult(`✓ تم تنفيذ: ${cmd.matchedCommand}`);
        setTimeout(() => setCmdResult(null), 3000);
      }
    });

    return () => unsubs.forEach(u => u());
  }, [open, core]);

  // ── Run command ─────────────────────────────────────────────────────────────
  const runCmd = useCallback(async (cmd: CommandDefinition) => {
    setCmdResult(`⏳ جارٍ تنفيذ: ${cmd.nameAr ?? cmd.name}…`);
    try {
      const ctx = {
        sovereign: core.sovereign,
        registry: core.registry,
        memory: core.memory,
        executor: core.executor,
      };
      const res = await cmd.execute({}, ctx);
      core.memory.recordPattern(cmd.id);
      setCmdResult(`✓ ${cmd.nameAr ?? cmd.name}: ${JSON.stringify(res).slice(0, 80)}`);
    } catch (e) {
      setCmdResult(`✗ فشل: ${(e as Error).message}`);
    }
    setTimeout(() => setCmdResult(null), 4000);
  }, [core]);

  const filteredCmds = OmnixAbsoluteRegistry.getInstance().search(cmdSearch);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="omnix-dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl h-[90vh] bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{ maxHeight: "90vh" }}
          >
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e21227] to-[#ff4d4d] flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm tracking-wide">OMNIX ABSOLUTE</h2>
                  <p className="text-[#666] text-[10px]">السلطة الإلهية المطلقة على المشروع</p>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2">
                <StatusBadge label={`${status.commandCount} أمر`} color="#e21227" icon={<Command size={10} />} />
                <StatusBadge label={`${status.componentCount} مكون`} color="#3b82f6" icon={<Layers size={10} />} />
                <StatusBadge label={status.isProcessing ? "جارٍ التنفيذ" : "جاهز"} color={status.isProcessing ? "#f59e0b" : "#10b981"} icon={<Activity size={10} />} />
                {status.isListening && (
                  <StatusBadge label="يستمع" color="#a855f7" icon={<Mic size={10} />} />
                )}
                <button onClick={onClose} className="ml-4 p-1.5 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                  <X size={16} className="text-[#666] hover:text-white" />
                </button>
              </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-1 px-6 py-2 border-b border-[#1a1a1a] overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                    tab === t.id
                      ? "bg-[#e21227]/20 text-[#e21227] border border-[#e21227]/30"
                      : "text-[#666] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Command result toast ──────────────────────────────────────── */}
            <AnimatePresence>
              {cmdResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-shrink-0 mx-6 mt-2 px-4 py-2 rounded-lg bg-[#161616] border border-[#262626] text-[11px] text-[#ccc] font-mono"
                >
                  {cmdResult}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
              {tab === "overview"  && <OverviewTab status={status} patterns={patterns} logs={logs} suggestions={suggestions} core={core} />}
              {tab === "commands"  && <CommandsTab search={cmdSearch} setSearch={setCmdSearch} commands={filteredCmds} onRun={runCmd} />}
              {tab === "map"       && <LiveMapTab liveMap={liveMap} />}
              {tab === "logs"      && <LogsTab logs={logs} onClear={() => { core.executor.clearLogs(); setLogs([]); }} />}
              {tab === "memory"    && <MemoryTab core={core} />}
              {tab === "evolution" && <EvolutionTab suggestions={suggestions} onApprove={(s) => core.evolution.approve(s)} onReject={(id) => core.evolution.reject(id)} stats={{ approved: core.evolution.getApprovedCount(), rejected: core.evolution.getRejectedCount(), total: core.registry.count() }} />}
              {tab === "voice"     && <VoiceTab voiceState={voiceState} voiceText={voiceText} supported={status.voiceSupported} isListening={status.isListening} onToggle={() => core.toggleVoice()} core={core} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ label, color, icon }: { label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border" style={{ borderColor: color + "40", color, backgroundColor: color + "10" }}>
      {icon}
      {label}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ status, patterns, logs, suggestions, core }: {
  status: OmnixAbsoluteCoreStatus;
  patterns: ReturnType<typeof OmnixMemory.getTopPatterns>;
  logs: ExecutionJob[];
  suggestions: EvolutionSuggestion[];
  core: OmnixAbsoluteCore;
}) {
  const successRate = logs.length > 0
    ? Math.round((logs.filter(l => l.status === "success").length / logs.length) * 100)
    : 100;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Command size={18} />} value={status.commandCount} label="أوامر مسجلة" color="#e21227" />
        <StatCard icon={<Layers size={18} />} value={status.componentCount} label="مكونات حية" color="#3b82f6" />
        <StatCard icon={<Database size={18} />} value={status.sessionCount} label="جلسات محفوظة" color="#10b981" />
        <StatCard icon={<TrendingUp size={18} />} value={`${successRate}%`} label="معدل النجاح" color="#f59e0b" />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top patterns */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
          <h3 className="text-[#888] text-[11px] font-medium mb-3 flex items-center gap-2">
            <Star size={12} className="text-[#f59e0b]" />
            أكثر الأوامر استخداماً
          </h3>
          <div className="space-y-2">
            {patterns.length === 0 && (
              <p className="text-[#444] text-[11px] text-center py-4">لم يتم تسجيل أي نمط بعد</p>
            )}
            {patterns.slice(0, 6).map(p => (
              <div key={p.commandId} className="flex items-center justify-between">
                <span className="text-[#aaa] text-[11px] font-mono truncate max-w-[180px]">{p.commandId}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 rounded-full bg-[#e21227]/30 w-16">
                    <div className="h-1 rounded-full bg-[#e21227]" style={{ width: `${Math.min((p.count / (patterns[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[#e21227] text-[10px] w-6 text-right">{p.count}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
          <h3 className="text-[#888] text-[11px] font-medium mb-3 flex items-center gap-2">
            <Clock size={12} className="text-[#3b82f6]" />
            آخر التنفيذات
          </h3>
          <div className="space-y-1.5">
            {logs.length === 0 && (
              <p className="text-[#444] text-[11px] text-center py-4">لا توجد تنفيذات بعد</p>
            )}
            {logs.slice(-6).reverse().map((log, i) => (
              <div key={i} className="flex items-center gap-2">
                {log.status === "success" ? <CheckCircle2 size={11} className="text-[#10b981] shrink-0" /> :
                  log.status === "failed" ? <XCircle size={11} className="text-[#e21227] shrink-0" /> :
                  <AlertCircle size={11} className="text-[#f59e0b] shrink-0" />}
                <span className="text-[#aaa] text-[10px] font-mono truncate">{log.id}</span>
                {log.error && <span className="text-[#e21227] text-[9px] truncate">{log.error.slice(0, 30)}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution suggestions preview */}
      {suggestions.length > 0 && (
        <div className="bg-[#111] border border-[#10b981]/20 rounded-xl p-4">
          <h3 className="text-[#888] text-[11px] font-medium mb-3 flex items-center gap-2">
            <Sparkles size={12} className="text-[#10b981]" />
            اقتراحات التطور ({suggestions.length})
          </h3>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#0d0d0d] rounded-lg px-3 py-2">
                <div>
                  <p className="text-[#ccc] text-[11px]">{s.name}</p>
                  <p className="text-[#555] text-[10px]">{s.description.slice(0, 60)}…</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#10b981] text-[10px]">{Math.round(s.confidence * 100)}%</span>
                  <button
                    onClick={() => core.evolution.approve(s)}
                    className="px-2 py-1 rounded bg-[#10b981]/20 text-[#10b981] text-[10px] hover:bg-[#10b981]/30 transition-colors"
                  >
                    قبول
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System info */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
        <h3 className="text-[#888] text-[11px] font-medium mb-3 flex items-center gap-2">
          <Cpu size={12} className="text-[#a855f7]" />
          معلومات النظام
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <InfoRow label="النموذج" value={status.model} />
          <InfoRow label="المزود" value={status.provider} />
          <InfoRow label="الصوت" value={status.voiceSupported ? "مدعوم" : "غير مدعوم"} />
          <InfoRow label="الحالة" value={status.initialized ? "مُهيأ" : "غير مُهيأ"} />
          <InfoRow label="اقتراحات التطور" value={`${status.suggestionCount}`} />
          <InfoRow label="جاهز" value={status.isProcessing ? "لا (جارٍ)" : "نعم"} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 flex flex-col gap-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20", color }}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[#555] text-[11px]">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-[#0d0d0d] rounded px-2 py-1.5">
      <span className="text-[#555]">{label}</span>
      <span className="text-[#aaa] font-mono">{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: COMMANDS
// ══════════════════════════════════════════════════════════════════════════════

function CommandsTab({ search, setSearch, commands, onRun }: {
  search: string;
  setSearch: (v: string) => void;
  commands: CommandDefinition[];
  onRun: (cmd: CommandDefinition) => void;
}) {
  const TYPE_COLOR: Record<string, string> = {
    open: "#3b82f6", close: "#6b7280", run: "#10b981", stop: "#e21227",
    change_theme: "#a855f7", custom: "#f59e0b", evolve: "#0ea5e9",
    set_model: "#ec4899", alert: "#f97316", osint_run: "#22c55e",
    create: "#10b981", delete: "#e21227", update: "#f59e0b",
    session_save: "#8b5cf6", session_load: "#06b6d4",
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 py-3 border-b border-[#1a1a1a]">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن أمر (عربي أو إنجليزي)…"
            className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg pl-9 pr-4 py-2 text-[12px] text-white placeholder-[#444] outline-none focus:border-[#e21227]/40"
            dir="rtl"
          />
        </div>
        <p className="text-[#555] text-[10px] mt-1.5 text-right">{commands.length} أمر</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
        {commands.map(cmd => (
          <motion.div
            key={cmd.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between bg-[#111] hover:bg-[#161616] border border-[#1a1a1a] hover:border-[#262626] rounded-lg px-4 py-3 group transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
                style={{ color: TYPE_COLOR[cmd.type] ?? "#888", backgroundColor: (TYPE_COLOR[cmd.type] ?? "#888") + "20" }}
              >
                {cmd.type}
              </span>
              <div className="min-w-0">
                <p className="text-[#ccc] text-[11px] font-medium truncate">{cmd.nameAr ?? cmd.name}</p>
                <p className="text-[#444] text-[10px] truncate">{cmd.description}</p>
                {cmd.aliases && cmd.aliases.length > 0 && (
                  <p className="text-[#333] text-[9px] truncate">{cmd.aliases.slice(0, 4).join(" · ")}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onRun(cmd)}
              className="shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[#e21227]/20"
            >
              <Play size={12} className="text-[#e21227]" />
            </button>
          </motion.div>
        ))}
        {commands.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Search size={24} className="text-[#333]" />
            <p className="text-[#444] text-[12px]">لا توجد نتائج لـ "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: LIVE MAP
// ══════════════════════════════════════════════════════════════════════════════

function LiveMapTab({ liveMap }: { liveMap: Map<string, ComponentEntry> }) {
  const [filter, setFilter] = useState("");
  const entries = Array.from(liveMap.values()).filter(e =>
    !filter || e.id.toLowerCase().includes(filter.toLowerCase()) || e.type.includes(filter)
  );

  const TYPE_COLOR: Record<string, string> = {
    ui: "#3b82f6", tool: "#10b981", window: "#a855f7", setting: "#f59e0b",
    model: "#ec4899", feature: "#0ea5e9", security: "#e21227", osint: "#22c55e",
    theme: "#f97316", layout: "#8b5cf6", character: "#06b6d4", session: "#eab308",
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 py-3 border-b border-[#1a1a1a] flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="تصفية المكونات…"
            className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg pl-9 pr-4 py-2 text-[12px] text-white placeholder-[#444] outline-none focus:border-[#3b82f6]/40"
          />
        </div>
        <span className="text-[#555] text-[11px] shrink-0">{entries.length} مكون</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Eye size={24} className="text-[#333]" />
            <p className="text-[#444] text-[12px]">
              {liveMap.size === 0 ? "لم يتم تسجيل أي مكون بعد" : "لا توجد نتائج"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {entries.map(e => (
              <div key={e.id} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3 hover:border-[#262626] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ color: TYPE_COLOR[e.type] ?? "#888", backgroundColor: (TYPE_COLOR[e.type] ?? "#888") + "20" }}
                  >
                    {e.type}
                  </span>
                </div>
                <p className="text-[#ccc] text-[11px] font-mono truncate">{e.id}</p>
                <p className="text-[#444] text-[10px] mt-0.5">
                  {new Date(e.lastUpdate).toLocaleTimeString("ar")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: EXECUTION LOGS
// ══════════════════════════════════════════════════════════════════════════════

function LogsTab({ logs, onClear }: { logs: ExecutionJob[]; onClear: () => void }) {
  const reversed = [...logs].reverse();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[#555] text-[11px]">{logs.length} سجل</span>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-[#666] hover:text-white text-[11px] transition-colors"
        >
          <RefreshCw size={11} />
          مسح السجل
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono">
        {reversed.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Terminal size={24} className="text-[#333]" />
            <p className="text-[#444] text-[12px]">لا توجد تنفيذات</p>
          </div>
        )}
        {reversed.map((log, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg text-[11px] border ${
              log.status === "success" ? "bg-[#10b981]/5 border-[#10b981]/10 text-[#10b981]" :
              log.status === "failed"  ? "bg-[#e21227]/5 border-[#e21227]/10 text-[#e21227]" :
              log.status === "running" ? "bg-[#f59e0b]/5 border-[#f59e0b]/10 text-[#f59e0b]" :
              "bg-[#111] border-[#1a1a1a] text-[#555]"
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {log.status === "success" ? <CheckCircle2 size={12} /> :
               log.status === "failed"  ? <XCircle size={12} /> :
               log.status === "running" ? <Activity size={12} className="animate-pulse" /> :
               <AlertCircle size={12} />}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-bold">{log.id}</span>
              {log.reason && <span className="text-[#555] ml-2">— {log.reason}</span>}
              {log.error  && <span className="block text-[10px] mt-0.5 opacity-70">{log.error}</span>}
              {log.result !== undefined && (
                <span className="block text-[10px] mt-0.5 opacity-60">
                  {JSON.stringify(log.result).slice(0, 100)}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[9px] opacity-50">{log.attempts}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: MEMORY
// ══════════════════════════════════════════════════════════════════════════════

function MemoryTab({ core }: { core: OmnixAbsoluteCore }) {
  const mem = OmnixMemory.getInstance();
  const sessions = mem.getRecentSessions(20);
  const patterns = mem.getTopPatterns(15);
  const prefs = mem.getAllPreferences();
  const [memTab, setMemTab] = useState<"sessions" | "patterns" | "prefs">("sessions");

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex gap-1 px-6 py-2 border-b border-[#1a1a1a]">
        {(["sessions", "patterns", "prefs"] as const).map(t => (
          <button
            key={t}
            onClick={() => setMemTab(t)}
            className={`px-3 py-1 rounded text-[11px] transition-colors ${
              memTab === t ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#aaa]"
            }`}
          >
            {t === "sessions" ? `الجلسات (${sessions.length})` :
             t === "patterns" ? `الأنماط (${patterns.length})` :
             `التفضيلات (${Object.keys(prefs).length})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {memTab === "sessions" && (
          sessions.length === 0
            ? <EmptyState icon={<Clock size={24} />} text="لا توجد جلسات محفوظة" />
            : sessions.map(s => (
              <div key={s.id} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#e21227] text-[10px] font-mono">{s.id}</span>
                  <span className="text-[#444] text-[10px]">{new Date(s.timestamp).toLocaleString("ar")}</span>
                </div>
                <p className="text-[#aaa] text-[11px] truncate">{s.userPrompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[#555] text-[10px]">{s.commandsExecuted.length} أوامر</span>
                  {s.modelUsed && <span className="text-[#555] text-[10px]">· {s.modelUsed}</span>}
                </div>
              </div>
            ))
        )}
        {memTab === "patterns" && (
          patterns.length === 0
            ? <EmptyState icon={<BarChart3 size={24} />} text="لا توجد أنماط مسجلة" />
            : patterns.map(p => (
              <div key={p.commandId} className="flex items-center justify-between bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2.5">
                <span className="text-[#aaa] text-[11px] font-mono">{p.commandId}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1 rounded-full bg-[#1a1a1a]">
                    <div className="h-1 rounded-full bg-[#e21227]" style={{ width: `${Math.min((p.count / (patterns[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[#e21227] text-[11px] w-8 text-right font-bold">{p.count}</span>
                </div>
              </div>
            ))
        )}
        {memTab === "prefs" && (
          Object.keys(prefs).length === 0
            ? <EmptyState icon={<Database size={24} />} text="لا توجد تفضيلات مخزنة" />
            : Object.entries(prefs).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2.5">
                <span className="text-[#aaa] text-[11px] font-mono">{k}</span>
                <span className="text-[#555] text-[11px] max-w-[200px] truncate">{JSON.stringify(v)}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: EVOLUTION
// ══════════════════════════════════════════════════════════════════════════════

function EvolutionTab({ suggestions, onApprove, onReject, stats }: {
  suggestions: EvolutionSuggestion[];
  onApprove: (s: EvolutionSuggestion) => void;
  onReject: (id: string) => void;
  stats: { approved: number; rejected: number; total: number };
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3 px-6 py-3 border-b border-[#1a1a1a]">
        <div className="bg-[#111] rounded-lg p-3 text-center">
          <div className="text-[#10b981] text-lg font-bold">{stats.approved}</div>
          <div className="text-[#555] text-[10px]">مقبول</div>
        </div>
        <div className="bg-[#111] rounded-lg p-3 text-center">
          <div className="text-[#e21227] text-lg font-bold">{stats.rejected}</div>
          <div className="text-[#555] text-[10px]">مرفوض</div>
        </div>
        <div className="bg-[#111] rounded-lg p-3 text-center">
          <div className="text-[#3b82f6] text-lg font-bold">{stats.total}</div>
          <div className="text-[#555] text-[10px]">إجمالي الأوامر</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Sparkles size={28} className="text-[#333]" />
            <p className="text-[#444] text-[12px] text-center">
              لا توجد اقتراحات حالياً<br />
              <span className="text-[10px] text-[#333]">استخدم الأوامر أكثر وسيقترح النظام تحسينات</span>
            </p>
          </div>
        ) : suggestions.map(s => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-[#111] border border-[#10b981]/20 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <GitBranch size={12} className="text-[#10b981]" />
                  <span className="text-[#10b981] text-[11px] font-medium">{s.name}</span>
                  <span className="text-[#333] text-[10px]">({Math.round(s.confidence * 100)}% ثقة)</span>
                </div>
                <p className="text-[#666] text-[11px]">{s.description}</p>
                <p className="text-[#444] text-[10px] mt-1 font-mono">مبني على: {s.basedOnPattern}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onApprove(s)}
                  className="px-3 py-1.5 rounded-lg bg-[#10b981]/20 text-[#10b981] text-[11px] hover:bg-[#10b981]/30 transition-colors border border-[#10b981]/20"
                >
                  قبول
                </button>
                <button
                  onClick={() => onReject(s.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-[#666] text-[11px] hover:bg-[#222] transition-colors"
                >
                  رفض
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: VOICE
// ══════════════════════════════════════════════════════════════════════════════

function VoiceTab({ voiceState, voiceText, supported, isListening, onToggle, core }: {
  voiceState: "idle" | "listening" | "error";
  voiceText: string;
  supported: boolean;
  isListening: boolean;
  onToggle: () => void;
  core: OmnixAbsoluteCore;
}) {
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const testVoice = () => {
    if (!testText.trim()) return;
    const result = core.voice.parseText(testText);
    if (result.matchedCommand) {
      setTestResult(`✓ تم التطابق: ${result.matchedCommand} (ثقة: ${Math.round(result.confidence * 100)}%)`);
    } else {
      setTestResult(`✗ لم يتم العثور على أمر مطابق`);
    }
  };

  const KEYWORDS = [
    "افتح الإعدادات", "شغّل OSINT", "أغلق النوافذ", "غير الثيم",
    "open settings", "run osint", "stop voice", "analyze patterns",
    "افتح مستودع الأسلحة", "شغّل الوكيل",
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Main toggle */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6 flex flex-col items-center gap-4">
        <div
          onClick={supported ? onToggle : undefined}
          className={`w-20 h-20 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all ${
            !supported ? "opacity-30 cursor-not-allowed border-[#333] bg-[#111]" :
            isListening ? "border-[#a855f7] bg-[#a855f7]/10 shadow-[0_0_30px_rgba(168,85,247,0.3)]" :
            voiceState === "error" ? "border-[#e21227] bg-[#e21227]/10" :
            "border-[#333] hover:border-[#555] bg-[#0d0d0d]"
          }`}
        >
          {isListening
            ? <Mic size={32} className="text-[#a855f7] animate-pulse" />
            : <MicOff size={32} className="text-[#555]" />}
        </div>

        <div className="text-center">
          <p className="text-white text-sm font-medium">
            {!supported ? "الصوت غير مدعوم في هذا المتصفح" :
             isListening ? "يستمع الآن…" :
             voiceState === "error" ? "خطأ في التعرف الصوتي" : "انقر للتفعيل"}
          </p>
          {isListening && voiceText && (
            <p className="text-[#a855f7] text-[11px] mt-1 max-w-[300px] text-center">{voiceText}</p>
          )}
        </div>

        {supported && (
          <p className="text-[#444] text-[11px] text-center">
            يدعم العربية والإنجليزية · متصل بجميع {core.registry.count()} أمر
          </p>
        )}
      </div>

      {/* Test command */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
        <h3 className="text-[#888] text-[11px] font-medium mb-3">اختبار الأمر النصي</h3>
        <div className="flex gap-2">
          <input
            value={testText}
            onChange={e => setTestText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && testVoice()}
            placeholder="أدخل نصاً للاختبار…"
            className="flex-1 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[12px] text-white placeholder-[#333] outline-none focus:border-[#a855f7]/40"
            dir="rtl"
          />
          <button
            onClick={testVoice}
            className="px-4 py-2 rounded-lg bg-[#a855f7]/20 text-[#a855f7] text-[11px] hover:bg-[#a855f7]/30 transition-colors border border-[#a855f7]/20"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        {testResult && (
          <p className={`mt-2 text-[11px] ${testResult.startsWith("✓") ? "text-[#10b981]" : "text-[#e21227]"}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* Example keywords */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
        <h3 className="text-[#888] text-[11px] font-medium mb-3">أمثلة على الأوامر الصوتية</h3>
        <div className="flex flex-wrap gap-2">
          {KEYWORDS.map(kw => (
            <button
              key={kw}
              onClick={() => setTestText(kw)}
              className="px-3 py-1.5 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#666] text-[10px] hover:text-white hover:border-[#333] transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#444]">
      {icon}
      <p className="text-[12px]">{text}</p>
    </div>
  );
}

export default OmnixAbsoluteDashboard;
