// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX HUD — لوحة التحكم الرئيسية الكاملة لنظام OMNIX ABSOLUTE
//  5 تبويبات: الحالة + العقل الحاكم + الأوامر + الذاكرة + السجل
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmnixBrain, type OmnixProjectSnapshot } from "@/lib/OmnixBrain";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { NexusCore, type NexusActivityEntry } from "@/lib/NexusCore";
import { OMNIX_COMMAND_REGISTRY, OMNIX_REGISTRY_MAP } from "@/lib/OmnixRegistry";
import { OMNIX_ABSOLUTE_REGISTRY, searchAbsoluteRegistry } from "@/lib/OmnixAbsoluteRegistry";
import { OmnixSovereign, useSovereign, type SovereignState } from "@/lib/OmnixSovereign";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

interface OmnixHUDProps {
  dispatchers: NexusDispatchers | null;
}

type HUDTab = "sovereign" | "status" | "commands" | "memory" | "log";

const TAB_LABELS: Record<HUDTab, string> = {
  sovereign: "🔱 السيادة",
  status:    "📡 الحالة",
  commands:  "⚡ الأوامر",
  memory:    "🧠 الذاكرة",
  log:       "📋 السجل",
};

// ── Sovereign Tab — العقل الحاكم الحي ─────────────────────────────────────────

function SovereignTab({ sovereign }: { sovereign: SovereignState }) {
  const health = sovereign.meta.systemHealth;
  const healthColor = health === "optimal" ? "#00ff88" : health === "degraded" ? "#ffaa00" : "#ff4444";
  const healthLabel = health === "optimal" ? "مثالية" : health === "degraded" ? "متدهورة" : "حرجة";
  const uptime = sovereign.meta.totalUptime;
  const uptimeStr = `${Math.floor(uptime / 60)}د ${uptime % 60}ث`;

  const errorRate = sovereign.ui.commandsExecuted > 0
    ? Math.round((sovereign.ui.errorsEncountered / sovereign.ui.commandsExecuted) * 100)
    : 0;

  return (
    <div className="space-y-4 text-xs">
      {/* System Health */}
      <div
        className="rounded-xl border p-3 flex items-center justify-between"
        style={{ background: `${healthColor}08`, borderColor: `${healthColor}30` }}
      >
        <div>
          <p className="text-white/40 text-xs">صحة النظام</p>
          <p className="font-bold text-sm" style={{ color: healthColor }}>{healthLabel}</p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
          style={{ background: `${healthColor}15`, border: `1px solid ${healthColor}40` }}
        >
          {health === "optimal" ? "🟢" : health === "degraded" ? "🟡" : "🔴"}
        </div>
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="وقت التشغيل" value={uptimeStr} color="#00e5ff" />
        <MiniStat label="العقد النشطة" value={`${sovereign.meta.omnixNodes}/7`} color="#00ff88" />
        <MiniStat label="الأوامر المنفّذة" value={String(sovereign.ui.commandsExecuted)} color="#aa44ff" />
        <MiniStat label="معدل الخطأ" value={`${errorRate}%`} color={errorRate > 20 ? "#ff4444" : "#00ff88"} />
      </div>

      {/* God Mode */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border" style={{ borderColor: "#ffaa0030", background: "#ffaa0008" }}>
        <div>
          <p className="text-white/40 text-xs">وضع الإله</p>
          <p className="font-bold" style={{ color: sovereign.agent.godModeActive ? "#ffaa00" : "#ffffff40" }}>
            {sovereign.agent.godModeActive ? "⚡ نشط" : "معطّل"}
          </p>
        </div>
        <button
          onClick={() => OmnixSovereign.toggleGodMode()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
          style={{
            background: sovereign.agent.godModeActive ? "#ffaa0020" : "#ffffff10",
            border: `1px solid ${sovereign.agent.godModeActive ? "#ffaa0050" : "#ffffff20"}`,
            color: sovereign.agent.godModeActive ? "#ffaa00" : "#ffffff50",
          }}
        >
          {sovereign.agent.godModeActive ? "إلغاء" : "تفعيل"}
        </button>
      </div>

      {/* Agent Info */}
      <div className="space-y-1.5">
        <SovRow label="الاسم" value={sovereign.agent.name} color="#00ff88" />
        <SovRow label="الاستقلالية" value={`${sovereign.agent.autonomyLevel}%`} color="#00e5ff" />
        <SovRow label="أسلوب الرد" value={sovereign.agent.responseStyle} color="#aa44ff" />
        <SovRow label="التشفير" value={sovereign.security.encryptionLevel.toUpperCase()} color="#ff4444" />
        <SovRow label="المستوى الأمني" value={sovereign.security.level} color="#ffaa00" />
      </div>

      {/* Capabilities */}
      <div>
        <p className="text-white/30 mb-2 tracking-wider text-xs">القدرات المفعّلة:</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: "🎙️ صوتي", active: sovereign.capabilities.voiceControl },
            { label: "👋 إيماءات", active: sovereign.capabilities.gestureControl },
            { label: "🧬 تطور", active: sovereign.capabilities.selfEvolution },
            { label: "⚡ اعتراض", active: sovereign.capabilities.quantumInterception },
            { label: "📚 سجل مطلق", active: sovereign.capabilities.absoluteRegistry },
            { label: "💾 ذاكرة أبدية", active: sovereign.capabilities.eternalMemory },
          ].map((cap) => (
            <div
              key={cap.label}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
              style={{
                background: cap.active ? "#00ff8808" : "#ffffff05",
                color: cap.active ? "#00ff88cc" : "#ffffff25",
              }}
            >
              <span>{cap.active ? "✓" : "✗"}</span>
              <span>{cap.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session ID */}
      <div className="px-3 py-2 rounded-xl border" style={{ borderColor: "#ffffff10", background: "#ffffff04" }}>
        <p className="text-white/30 text-xs">معرّف الجلسة:</p>
        <p className="font-mono text-xs text-white/50 mt-0.5 break-all">{sovereign.sessionId}</p>
        <p className="text-white/20 text-xs mt-1">الإصدار: {sovereign.version}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-2.5" style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <p className="text-white/35 text-xs">{label}</p>
      <p className="font-bold text-sm mt-0.5 truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function SovRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/35 flex-shrink-0">{label}:</span>
      <span className="font-mono text-xs truncate" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Status Tab ─────────────────────────────────────────────────────────────────

function StatusTab({ snapshot }: { snapshot: OmnixProjectSnapshot }) {
  const openWindows = Object.entries(snapshot.windows)
    .filter(([, w]) => w.open)
    .map(([id]) => id);

  return (
    <div className="space-y-2.5 text-xs">
      <Row label="المزود"           value={snapshot.modelConfig.provider}              accent="#00e5ff" />
      <Row label="النموذج"          value={snapshot.modelConfig.model}                 accent="#00e5ff" />
      <Row label="الثيم"            value={snapshot.theme.themeId}                     accent="#ff44aa" />
      <Row label="اللون"            value={snapshot.theme.accent}                      accent="#ffaa00" />
      <Row label="الشخصية"          value={snapshot.activePersona?.name ?? "افتراضية"} accent="#aa44ff" />
      <Row label="الوضع"            value={snapshot.mode}                              accent="#ffaa00" />
      <Row label="الحرارة"          value={String(snapshot.modelConfig.temperature)}   accent="#00ff88" />
      <Row label="الحد الأقصى"      value={String(snapshot.modelConfig.maxTokens)}     accent="#00ff88" />
      <Row label="البث"             value={snapshot.modelConfig.streaming ? "✅ مفعّل" : "❌ معطّل"} accent="#00ff88" />
      <Row label="اللغة"            value={snapshot.language}                          accent="#4488ff" />

      <div className="pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
        <p className="text-white/35 mb-1.5">النوافذ المفتوحة ({openWindows.length}):</p>
        {openWindows.length === 0
          ? <p className="text-white/20 italic">لا يوجد</p>
          : <div className="flex flex-wrap gap-1">
              {openWindows.map((id) => (
                <span key={id} className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "#0088ff20", color: "#88bbff" }}>{id}</span>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/35 flex-shrink-0">{label}:</span>
      <span className="font-mono text-xs truncate" style={{ color: accent }}>{value}</span>
    </div>
  );
}

// ── Commands Tab — يجمع كلا السجلين ─────────────────────────────────────────

const TOTAL_COMMANDS = OMNIX_COMMAND_REGISTRY.length + OMNIX_ABSOLUTE_REGISTRY.length;

function CommandsTab({ dispatchers }: { dispatchers: NexusDispatchers | null }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"all" | "omnix" | "absolute">("all");

  type UnifiedCmd = { id: string; nameAr: string; descriptionAr: string; category: string; source: "omnix" | "absolute" };

  const allCmds: UnifiedCmd[] = [
    ...OMNIX_COMMAND_REGISTRY.map((c) => ({ id: c.id, nameAr: c.nameAr, descriptionAr: c.descriptionAr, category: c.category, source: "omnix" as const })),
    ...OMNIX_ABSOLUTE_REGISTRY.map((c) => ({ id: c.id, nameAr: c.nameAr, descriptionAr: c.descriptionAr, category: c.category, source: "absolute" as const })),
  ];

  const filtered = allCmds.filter((c) => {
    const matchSrc = source === "all" || c.source === source;
    const matchSearch = !search || c.nameAr.includes(search) || c.id.includes(search.toLowerCase()) || c.descriptionAr.includes(search);
    return matchSrc && matchSearch;
  });

  function runCommand(cmd: UnifiedCmd) {
    if (!dispatchers) return;
    try {
      if (cmd.source === "omnix") {
        const c = OMNIX_REGISTRY_MAP.get(cmd.id);
        if (c) {
          const r = c.execute({}, dispatchers);
          dispatchers.toast(r.success ? `✅ ${r.messageAr}` : `❌ ${r.messageAr}`);
          OmnixSovereign.recordCommandSuccess(cmd.id);
        }
      } else {
        const c = searchAbsoluteRegistry(cmd.id).find((x) => x.id === cmd.id);
        if (c) {
          const r = c.execute({}, dispatchers);
          dispatchers.toast(r.success ? `✅ ${r.message}` : `❌ ${r.message}`);
          OmnixSovereign.recordCommandSuccess(cmd.id);
        }
      }
    } catch (e) {
      dispatchers.toast(`❌ خطأ: ${e instanceof Error ? e.message : "فشل"}`);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`بحث في ${TOTAL_COMMANDS} أمر...`}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-400/40"
        dir="auto"
      />
      <div className="flex gap-1.5">
        {(["all", "omnix", "absolute"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className="px-2.5 py-0.5 rounded text-xs transition-colors"
            style={{
              background: source === s ? "#00ff8820" : "transparent",
              color: source === s ? "#00ff88" : "#ffffff35",
              border: source === s ? "1px solid #00ff8840" : "1px solid transparent",
            }}
          >
            {s === "all" ? `الكل (${TOTAL_COMMANDS})` : s === "omnix" ? `OMNIX (${OMNIX_COMMAND_REGISTRY.length})` : `ABS (${OMNIX_ABSOLUTE_REGISTRY.length})`}
          </button>
        ))}
      </div>
      <div className="space-y-0.5 max-h-52 overflow-y-auto">
        {filtered.slice(0, 50).map((cmd) => (
          <button
            key={`${cmd.source}-${cmd.id}`}
            onClick={() => runCommand(cmd)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all duration-150 hover:bg-white/5 active:scale-[0.98] group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 group-hover:text-white truncate" dir="auto">
                {cmd.nameAr}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className="text-xs px-1 py-0.5 rounded"
                style={{ background: "#00ff8810", color: "#00ff8870", fontSize: "8px" }}
              >
                {cmd.category}
              </span>
              {cmd.source === "absolute" && (
                <span style={{ fontSize: "8px", color: "#00e5ff40" }}>ABS</span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">لا توجد نتائج</p>
        )}
        {filtered.length > 50 && (
          <p className="text-xs text-white/20 text-center py-2">+ {filtered.length - 50} أمر آخر...</p>
        )}
      </div>
    </div>
  );
}

// ── Memory Tab ────────────────────────────────────────────────────────────────

function MemoryTab() {
  const data = OmnixMemory.getData();
  const topCmds = OmnixMemory.getTopCommands(8);
  const recent = OmnixMemory.getRecentActions(8);

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="إجمالي الأوامر"    value={data.entries.length}              color="#00ff88" />
        <StatCard label="الأوامر المتعلمة"   value={data.learnedCommands.length}      color="#aa44ff" />
        <StatCard label="التفضيلات"           value={Object.keys(data.preferences).length} color="#00e5ff" />
        <StatCard label="الجلسة"             value={data.sessionId.slice(0, 8)}      color="#ffaa00" isText />
      </div>

      {topCmds.length > 0 && (
        <div>
          <p className="text-white/35 mb-2">الأوامر الأكثر استخداماً:</p>
          <div className="space-y-1.5">
            {topCmds.map((s) => (
              <div key={s.actionId} className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (s.count / (topCmds[0]?.count ?? 1)) * 100)}%`,
                      background: "linear-gradient(90deg, #00ff88, #00e5ff)",
                    }}
                  />
                </div>
                <span className="text-white/55 w-28 truncate text-xs">{s.label}</span>
                <span className="text-emerald-400/70 w-6 text-right text-xs font-mono">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p className="text-white/35 mb-2">الأوامر الأخيرة:</p>
          <div className="space-y-1">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-white/45">
                <span>{e.success ? "✅" : "❌"}</span>
                <span className="flex-1 truncate">{e.actionLabel}</span>
                <span className="text-white/20 text-xs">
                  {new Date(e.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => { OmnixMemory.clearHistory(); }}
        className="w-full py-2 rounded-lg text-xs text-red-400/60 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 transition-colors"
      >
        🗑 مسح سجل الذاكرة
      </button>
    </div>
  );
}

function StatCard({ label, value, color, isText }: { label: string; value: string | number; color: string; isText?: boolean }) {
  return (
    <div className="rounded-xl border p-2.5" style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <p className="text-white/35 text-xs">{label}</p>
      <p className="font-bold mt-0.5 text-sm truncate" style={{ color }}>
        {isText ? value : Number(value).toLocaleString("ar")}
      </p>
    </div>
  );
}

// ── Log Tab ───────────────────────────────────────────────────────────────────

function LogTab({ log }: { log: NexusActivityEntry[] }) {
  return (
    <div className="space-y-0.5 max-h-72 overflow-y-auto">
      {log.length === 0 && (
        <p className="text-xs text-white/30 text-center py-6">لا توجد سجلات بعد</p>
      )}
      {log.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 py-1.5 border-b"
          style={{ borderColor: "#ffffff05" }}
        >
          <span className="text-xs flex-shrink-0 mt-0.5">{entry.success ? "✅" : "❌"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/75 truncate">{entry.actionLabel}</p>
            <p className="text-xs text-white/35 truncate">{entry.message}</p>
          </div>
          <span className="text-xs text-white/20 flex-shrink-0">
            {new Date(entry.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main OmnixHUD Panel ──────────────────────────────────────────────────────

export function OmnixHUDPanel({
  dispatchers,
  open,
  onClose,
}: OmnixHUDProps & { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<HUDTab>("sovereign");
  const [snapshot, setSnapshot] = useState(() => OmnixBrain.getSnapshot());
  const [log, setLog] = useState(() => NexusCore.getState().activityLog);
  const sovereign = useSovereign();

  useEffect(() => {
    const unsub = OmnixBrain.subscribe((s) => setSnapshot({ ...s }));
    const unsubNexus = NexusCore.subscribe((s) => setLog([...s.activityLog]));
    return () => { unsub(); unsubNexus(); };
  }, []);

  if (!open) return null;

  const totalCmds = TOTAL_COMMANDS;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed top-16 right-4 z-[9995] w-80 rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "rgba(0,4,12,0.98)",
          borderColor: "#00ff8830",
          boxShadow: "0 0 50px #00ff8812, 0 8px 32px #00000095",
          backdropFilter: "blur(20px)",
          maxHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "#00ff8820" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88" }}
            />
            <span className="text-xs font-bold tracking-widest text-emerald-400">
              OMNIX ABSOLUTE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/25">{totalCmds} أمر</span>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 text-base ml-1">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: "#00ff8815" }}>
          {(Object.keys(TAB_LABELS) as HUDTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-shrink-0 px-2 py-2 text-xs transition-colors whitespace-nowrap"
              style={{
                color: tab === t ? "#00ff88" : "#ffffff28",
                background: tab === t ? "#00ff8810" : "transparent",
                borderBottom: tab === t ? "2px solid #00ff88" : "2px solid transparent",
                fontSize: "10px",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "sovereign" && <SovereignTab sovereign={sovereign} />}
          {tab === "status"    && <StatusTab snapshot={snapshot} />}
          {tab === "commands"  && <CommandsTab dispatchers={dispatchers} />}
          {tab === "memory"    && <MemoryTab />}
          {tab === "log"       && <LogTab log={log} />}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t flex-shrink-0"
          style={{ borderColor: "#00ff8810" }}
        >
          <span className="text-xs text-white/18">
            {new Date(snapshot.timestamp).toLocaleTimeString("ar")}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                background: sovereign.meta.systemHealth === "optimal" ? "#00ff8815" : "#ffaa0015",
                color: sovereign.meta.systemHealth === "optimal" ? "#00ff8880" : "#ffaa0080",
              }}
            >
              {sovereign.meta.systemHealth === "optimal" ? "🟢 مثالي" : "🟡 متدهور"}
            </span>
            <button
              onClick={() => NexusCore.clearLog()}
              className="text-xs text-white/18 hover:text-white/50 transition-colors"
            >
              مسح
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Floating OMNIX Badge (always visible) ────────────────────────────────────

export function OmnixFloatingBadge({
  onOpenPanel,
  onOpenVoice,
  onOpenEvolution,
  onOpenPalette,
}: {
  onOpenPanel: () => void;
  onOpenVoice: () => void;
  onOpenEvolution: () => void;
  onOpenPalette?: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cmdCount, setCmdCount] = useState(0);
  const sovereign = useSovereign();

  useEffect(() => {
    return NexusCore.subscribe((s) => {
      setRunning(s.executionState.running);
      setLogCount(s.activityLog.length);
    });
  }, []);

  useEffect(() => {
    setCmdCount(sovereign.ui.commandsExecuted);
  }, [sovereign.ui.commandsExecuted]);

  useEffect(() => {
    const handler = () => onOpenPanel();
    window.addEventListener("omnix:open-panel", handler);
    const voiceHandler = () => onOpenVoice();
    window.addEventListener("omnix:open-voice", voiceHandler);
    return () => {
      window.removeEventListener("omnix:open-panel", handler);
      window.removeEventListener("omnix:open-voice", voiceHandler);
    };
  }, [onOpenPanel, onOpenVoice]);

  const healthColor = sovereign.meta.systemHealth === "optimal" ? "#00ff88"
    : sovereign.meta.systemHealth === "degraded" ? "#ffaa00" : "#ff4444";

  return (
    <div className="fixed bottom-6 left-6 z-[9990] flex flex-col items-start gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-1.5"
          >
            {[
              { label: "⚡ الأوامر", onClick: onOpenPalette ?? onOpenPanel, shortcut: "⌃⇧Z" },
              { label: "🎙️ صوت",   onClick: onOpenVoice,                   shortcut: "⌃⇧V" },
              { label: "🧬 تطور",   onClick: onOpenEvolution,               shortcut: "" },
              { label: "📋 اللوحة", onClick: onOpenPanel,                   shortcut: "" },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => { btn.onClick(); setExpanded(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(0,8,18,0.95)",
                  border: "1px solid #00ff8828",
                  color: "#00ff88",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span>{btn.label}</span>
                {btn.shortcut && (
                  <span className="text-white/25 font-mono" style={{ fontSize: "9px" }}>{btn.shortcut}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded((v) => !v)}
        onDoubleClick={onOpenPanel}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95"
        title="OMNIX — انقر للقائمة / انقر مزدوج للوحة الكاملة"
        style={{
          background: running ? "rgba(0,255,136,0.12)" : "rgba(0,6,16,0.92)",
          borderColor: running ? "#00ff88" : `${healthColor}40`,
          boxShadow: running ? "0 0 24px #00ff8840" : `0 0 10px ${healthColor}10`,
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Health dot */}
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: healthColor, boxShadow: `0 0 4px ${healthColor}` }}
        />
        <span
          className={`text-xs font-bold tracking-widest ${running ? "text-emerald-400 animate-pulse" : "text-emerald-400/70"}`}
        >
          OMNIX
        </span>
        {(logCount > 0 || cmdCount > 0) && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "#00ff8820", color: "#00ff88", fontSize: "9px" }}
          >
            {cmdCount > 0 ? cmdCount : logCount}
          </span>
        )}
        {running && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
        )}
        <span className="text-emerald-400/35 text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
    </div>
  );
}

// ── Legacy wrapper (kept for backwards compat) ────────────────────────────────

export function OmnixHUD({ dispatchers }: OmnixHUDProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        setPanelOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  void openPanel;

  return (
    <OmnixHUDPanel
      dispatchers={dispatchers}
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
    />
  );
}
