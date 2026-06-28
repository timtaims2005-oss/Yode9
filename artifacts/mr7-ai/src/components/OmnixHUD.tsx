// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX HUD — لوحة التحكم الرئيسية لنظام OMNIX
//  تجمع الحالة الحية + السجل + الأوامر السريعة + الذاكرة في مكان واحد
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmnixBrain, type OmnixProjectSnapshot } from "@/lib/OmnixBrain";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { NexusCore, type NexusActivityEntry } from "@/lib/NexusCore";
import { OMNIX_COMMAND_REGISTRY, OMNIX_REGISTRY_MAP } from "@/lib/OmnixRegistry";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

interface OmnixHUDProps {
  dispatchers: NexusDispatchers | null;
}

type HUDTab = "status" | "commands" | "memory" | "log";

const TAB_LABELS: Record<HUDTab, string> = {
  status: "📡 الحالة",
  commands: "⚡ الأوامر",
  memory: "🧠 الذاكرة",
  log: "📋 السجل",
};

// ── Status Tab ────────────────────────────────────────────────────────────────

function StatusTab({ snapshot }: { snapshot: OmnixProjectSnapshot }) {
  const openWindows = Object.entries(snapshot.windows)
    .filter(([, w]) => w.open)
    .map(([id]) => id);

  return (
    <div className="space-y-3 text-xs">
      <Row label="المزود" value={snapshot.modelConfig.provider} accent="#00e5ff" />
      <Row label="النموذج" value={snapshot.modelConfig.model} accent="#00e5ff" />
      <Row label="الثيم" value={snapshot.theme.themeId} accent="#ff44aa" />
      <Row label="اللون" value={snapshot.theme.accent} accent={snapshot.theme.accent} />
      <Row label="الشخصية" value={snapshot.activePersona?.name ?? "افتراضية"} accent="#aa44ff" />
      <Row label="الوضع" value={snapshot.mode} accent="#ffaa00" />
      <Row label="درجة الحرارة" value={String(snapshot.modelConfig.temperature)} accent="#00ff88" />
      <Row label="الحد الأقصى للرموز" value={String(snapshot.modelConfig.maxTokens)} accent="#00ff88" />
      <Row label="البث المباشر" value={snapshot.modelConfig.streaming ? "✅ مفعّل" : "❌ معطّل"} accent="#00ff88" />
      <Row label="اللغة" value={snapshot.language} accent="#4488ff" />
      <div className="pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
        <p className="text-white/40 mb-1">النوافذ المفتوحة ({openWindows.length}):</p>
        {openWindows.length === 0
          ? <p className="text-white/20 italic">لا يوجد</p>
          : <div className="flex flex-wrap gap-1">
              {openWindows.map((id) => (
                <span key={id} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#0088ff20", color: "#88bbff" }}>
                  {id}
                </span>
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
      <span className="text-white/40 flex-shrink-0">{label}:</span>
      <span className="font-mono truncate" style={{ color: accent }}>{value}</span>
    </div>
  );
}

// ── Commands Tab ──────────────────────────────────────────────────────────────

function CommandsTab({ dispatchers }: { dispatchers: NexusDispatchers | null }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(OMNIX_COMMAND_REGISTRY.map((c) => c.category)))];
  const filtered = OMNIX_COMMAND_REGISTRY.filter((c) => {
    const matchesCat = category === "all" || c.category === category;
    const matchesSearch =
      !search ||
      c.nameAr.includes(search) ||
      c.id.includes(search.toLowerCase()) ||
      c.descriptionAr.includes(search);
    return matchesCat && matchesSearch;
  });

  function runCommand(id: string) {
    if (!dispatchers) return;
    const cmd = OMNIX_REGISTRY_MAP.get(id);
    if (!cmd) return;
    try {
      const result = cmd.execute({}, dispatchers);
      dispatchers.toast(result.success ? `✅ ${result.messageAr}` : `❌ ${result.messageAr}`);
    } catch (e) {
      dispatchers.toast(`❌ خطأ: ${e instanceof Error ? e.message : "فشل التنفيذ"}`);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="بحث في الأوامر..."
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-400/40"
        dir="auto"
      />
      <div className="flex flex-wrap gap-1">
        {categories.slice(0, 8).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-2 py-0.5 rounded text-xs transition-colors"
            style={{
              background: category === cat ? "#00ff8820" : "transparent",
              color: category === cat ? "#00ff88" : "#ffffff40",
              border: category === cat ? "1px solid #00ff8840" : "1px solid transparent",
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {filtered.slice(0, 40).map((cmd) => (
          <button
            key={cmd.id}
            onClick={() => runCommand(cmd.id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 hover:bg-white/5 active:scale-[0.98] group"
          >
            <span className="text-xs flex-1 text-white/70 group-hover:text-white truncate" dir="auto">
              {cmd.nameAr}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "#00ff8810", color: "#00ff8880", fontSize: "9px" }}
            >
              {cmd.category}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">لا توجد نتائج</p>
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
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="إجمالي الأوامر" value={data.entries.length} color="#00ff88" />
        <StatCard label="الأوامر المتعلمة" value={data.learnedCommands.length} color="#aa44ff" />
        <StatCard label="التفضيلات" value={Object.keys(data.preferences).length} color="#00e5ff" />
        <StatCard label="الجلسة الحالية" value={data.sessionId.slice(0, 8)} color="#ffaa00" isText />
      </div>

      {topCmds.length > 0 && (
        <div>
          <p className="text-white/40 mb-2">الأوامر الأكثر استخداماً:</p>
          <div className="space-y-1">
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
                <span className="text-white/60 w-32 truncate">{s.label}</span>
                <span className="text-emerald-400/70 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <p className="text-white/40 mb-2">الأوامر الأخيرة:</p>
          <div className="space-y-1">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-white/50">
                <span>{e.success ? "✅" : "❌"}</span>
                <span className="flex-1 truncate">{e.actionLabel}</span>
                <span className="text-white/25 text-xs">
                  {new Date(e.ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => { OmnixMemory.clearHistory(); window.location.reload(); }}
        className="w-full py-2 rounded-lg text-xs text-red-400/60 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 transition-colors"
      >
        🗑 مسح سجل الذاكرة
      </button>
    </div>
  );
}

function StatCard({ label, value, color, isText }: { label: string; value: string | number; color: string; isText?: boolean }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: `${color}08`, borderColor: `${color}20` }}>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="font-bold mt-1 text-sm truncate" style={{ color }}>
        {isText ? value : value.toLocaleString("ar")}
      </p>
    </div>
  );
}

// ── Log Tab ───────────────────────────────────────────────────────────────────

function LogTab({ log }: { log: NexusActivityEntry[] }) {
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto">
      {log.length === 0 && (
        <p className="text-xs text-white/30 text-center py-6">لا توجد سجلات بعد</p>
      )}
      {log.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 py-1.5 border-b"
          style={{ borderColor: "#ffffff06" }}
        >
          <span className="text-xs flex-shrink-0 mt-0.5">{entry.success ? "✅" : "❌"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/80 truncate">{entry.actionLabel}</p>
            <p className="text-xs text-white/40 truncate">{entry.message}</p>
          </div>
          <span className="text-xs text-white/25 flex-shrink-0">
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
  const [tab, setTab] = useState<HUDTab>("status");
  const [snapshot, setSnapshot] = useState(() => OmnixBrain.getSnapshot());
  const [log, setLog] = useState(() => NexusCore.getState().activityLog);

  useEffect(() => {
    const unsub = OmnixBrain.subscribe((s) => setSnapshot({ ...s }));
    const unsubNexus = NexusCore.subscribe((s) => setLog([...s.activityLog]));
    return () => { unsub(); unsubNexus(); };
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed top-16 right-4 z-[9995] w-80 rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "rgba(0,6,14,0.97)",
          borderColor: "#00ff8830",
          boxShadow: "0 0 40px #00ff8815, 0 8px 32px #00000090",
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
            <span className="text-xs text-white/30">
              {OMNIX_COMMAND_REGISTRY.length} أمر
            </span>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 text-base ml-1">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "#00ff8815" }}>
          {(Object.keys(TAB_LABELS) as HUDTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-xs transition-colors"
              style={{
                color: tab === t ? "#00ff88" : "#ffffff30",
                background: tab === t ? "#00ff8810" : "transparent",
                borderBottom: tab === t ? "2px solid #00ff88" : "2px solid transparent",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "status" && <StatusTab snapshot={snapshot} />}
          {tab === "commands" && <CommandsTab dispatchers={dispatchers} />}
          {tab === "memory" && <MemoryTab />}
          {tab === "log" && <LogTab log={log} />}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t flex-shrink-0"
          style={{ borderColor: "#00ff8810" }}
        >
          <span className="text-xs text-white/20">
            آخر تحديث: {new Date(snapshot.timestamp).toLocaleTimeString("ar")}
          </span>
          <button
            onClick={() => NexusCore.clearLog()}
            className="text-xs text-white/20 hover:text-white/50 transition-colors"
          >
            مسح السجل
          </button>
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

  useEffect(() => {
    return NexusCore.subscribe((s) => {
      setRunning(s.executionState.running);
      setLogCount(s.activityLog.length);
    });
  }, []);

  // Listen for panel open event
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
              { label: "⚡ الأوامر", onClick: onOpenPalette ?? onOpenPanel },
              { label: "🎙️ صوت", onClick: onOpenVoice },
              { label: "🧬 تطور", onClick: onOpenEvolution },
              { label: "📋 السجل", onClick: onOpenPanel },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => { btn.onClick(); setExpanded(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(0,10,20,0.92)",
                  border: "1px solid #00ff8830",
                  color: "#00ff88",
                  backdropFilter: "blur(12px)",
                }}
              >
                {btn.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setExpanded((v) => !v)}
        onDoubleClick={onOpenPanel}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95"
        title="OMNIX — انقر للقائمة / انقر مزدوج للوحة الكاملة (Ctrl+Shift+O)"
        style={{
          background: running ? "rgba(0,255,136,0.12)" : "rgba(0,8,18,0.90)",
          borderColor: running ? "#00ff88" : "#00ff8840",
          boxShadow: running ? "0 0 20px #00ff8840" : "0 0 10px #00ff8810",
          backdropFilter: "blur(16px)",
        }}
      >
        <span
          className={`text-xs font-bold tracking-widest ${running ? "text-emerald-400 animate-pulse" : "text-emerald-400/70"}`}
        >
          OMNIX
        </span>
        {logCount > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: "#00ff8820", color: "#00ff88", fontSize: "9px" }}
          >
            {logCount}
          </span>
        )}
        {running && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        )}
        <span className="text-emerald-400/40 text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
    </div>
  );
}

// ── Main OmnixHUD wrapper (all in one) ───────────────────────────────────────

export function OmnixHUD({ dispatchers }: OmnixHUDProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  // Keyboard shortcut Ctrl+Shift+Z (to avoid conflict with Ctrl+Shift+O = OSINT)
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

  return (
    <>
      <OmnixHUDPanel
        dispatchers={dispatchers}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
