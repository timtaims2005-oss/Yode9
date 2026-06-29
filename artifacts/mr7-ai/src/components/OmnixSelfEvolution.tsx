// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX SELF EVOLUTION — النظام السابع والأخير
//  ذكاء اصطناعي يتطور بناءً على الاستخدام — مدعوم بالعقل الحاكم
//  يحلل الأنماط، يقترح أوامر جديدة، ويتتبع التطور عبر الزمن
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { OmnixSovereign, useSovereign } from "@/lib/OmnixSovereign";
import { registerLearnedCommand, OMNIX_REGISTRY_MAP } from "@/lib/OmnixRegistry";
import { ABSOLUTE_REGISTRY_COUNT } from "@/lib/OmnixAbsoluteRegistry";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

interface EvolutionSuggestion {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  trigger: string;
  category: string;
  reason: string;
  confidence: number;
  icon: string;
  sovereignBoosted?: boolean; // اقتراح مدعوم من العقل الحاكم
}

// ── Advanced pattern analysis using OmnixSovereign ───────────────────────────

function generateSuggestions(godMode: boolean): EvolutionSuggestion[] {
  const topCmds        = OmnixMemory.getTopCommands(12);
  const recentActions  = OmnixMemory.getRecentActions(20);
  const suggestions: EvolutionSuggestion[] = [];

  // ── Pattern 1: Security + OSINT combo ────────────────────────────────────
  const secCount  = topCmds.filter((c) => c.actionId.includes("security") || c.actionId.includes("threat")).reduce((s, c) => s + c.count, 0);
  const osintCount = topCmds.filter((c) => c.actionId.includes("osint")).reduce((s, c) => s + c.count, 0);
  if (secCount > 3 && osintCount > 3) {
    suggestions.push({
      id: "sugg-security-osint-combo",
      label: "Security + OSINT Combo",
      labelAr: "فتح الأمن + OSINT معاً",
      description: "Opens Security Dashboard and OSINT tools simultaneously",
      trigger: "افتح الأمن والـ OSINT",
      category: "combo",
      reason: `استخدمت أدوات الأمن ${secCount} مرة وOSINT ${osintCount} مرة — هذا يجمعهما بضغطة واحدة`,
      confidence: Math.min(95, 60 + (secCount + osintCount) * 2),
      icon: "🎯",
      sovereignBoosted: godMode,
    });
  }

  // ── Pattern 2: Theme cycle ────────────────────────────────────────────────
  const themeCount = topCmds.find((c) => c.actionId === "set_theme" || c.actionId.includes("theme"))?.count ?? 0;
  if (themeCount > 2) {
    suggestions.push({
      id: "sugg-theme-cycle",
      label: "Theme Cycle",
      labelAr: "تدوير الثيمات تلقائياً",
      description: "Cycles through all themes one by one every 30 seconds",
      trigger: "دوّر الثيمات",
      category: "theme",
      reason: `غيّرت الثيمات ${themeCount} مرة — هذا يدورها تلقائياً`,
      confidence: Math.min(92, 50 + themeCount * 8),
      icon: "🎨",
    });
  }

  // ── Pattern 3: Quick hub (lots of modal opens) ────────────────────────────
  const modalCount = topCmds.filter((c) => c.actionId.startsWith("open_")).reduce((s, c) => s + c.count, 0);
  if (modalCount > 5) {
    suggestions.push({
      id: "sugg-quick-hub",
      label: "Quick Hub",
      labelAr: "مركز الوصول السريع",
      description: "One-click hub for the 5 most-used tools",
      trigger: "افتح المركز السريع",
      category: "modal",
      reason: `فتحت الأدوات ${modalCount} مرة — هذا يجمع أكثر 5 أدوات في مكان واحد`,
      confidence: Math.min(92, 55 + modalCount),
      icon: "🚀",
      sovereignBoosted: godMode,
    });
  }

  // ── Pattern 4: Session replay ─────────────────────────────────────────────
  if (recentActions.length > 5) {
    suggestions.push({
      id: "sugg-replay-session",
      label: "Replay Last Session",
      labelAr: "إعادة تشغيل آخر 5 أوامر",
      description: "Replays the last 5 commands in sequence",
      trigger: "أعد الجلسة الأخيرة",
      category: "memory",
      reason: "بناءً على نشاطك الأخير — تنفيذ آخر 5 أوامر بضغطة واحدة",
      confidence: 78,
      icon: "🔄",
    });
  }

  // ── Pattern 5: God Mode toggle shortcut (sovereign boost) ─────────────────
  if (godMode) {
    suggestions.push({
      id: "sugg-sovereign-lock",
      label: "Sovereign Lock",
      labelAr: "قفل سيادي — حماية الجلسة",
      description: "Locks all OMNIX settings until explicit unlock",
      trigger: "قفل السيادة",
      category: "security",
      reason: "وضع الإله نشط — قفل الجلسة يمنع أي تعديل غير مصرح به",
      confidence: 88,
      icon: "🔐",
      sovereignBoosted: true,
    });
  }

  // ── Pattern 6: Voice macro (frequent voice use) ───────────────────────────
  const voiceCount = recentActions.filter((a) => a.actionId.includes("voice") || a.actionId.includes("omnix:voice")).length;
  if (voiceCount > 2) {
    suggestions.push({
      id: "sugg-voice-macro",
      label: "Voice Macro Chain",
      labelAr: "سلسلة أوامر صوتية تلقائية",
      description: "Record a sequence of voice commands to replay on demand",
      trigger: "سجّل ماكرو صوتي",
      category: "voice",
      reason: "تستخدم الأوامر الصوتية كثيراً — سجّل سلسلة لاستدعائها بكلمة واحدة",
      confidence: 80,
      icon: "🎙️",
    });
  }

  // ── Pattern 7: Auto-dark mode at night ───────────────────────────────────
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    suggestions.push({
      id: "sugg-auto-night-mode",
      label: "Auto Night Mode",
      labelAr: "الوضع الليلي التلقائي",
      description: "Switches to darkest theme after 10PM automatically",
      trigger: "فعّل الوضع الليلي التلقائي",
      category: "theme",
      reason: "الساعة الآن ليلاً — يمكن تفعيل الثيم الأكثر قتامة تلقائياً",
      confidence: 85,
      icon: "🌙",
    });
  }

  // Filter already learned
  const learnedIds = OmnixMemory.getLearnedCommands().map((c) => c.id);
  return suggestions
    .filter((s) => !learnedIds.includes(s.id))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

// ── Evolution Stats Component ─────────────────────────────────────────────────

function EvolutionStats({ godMode }: { godMode: boolean }) {
  const data     = OmnixMemory.getData();
  const learned  = data.learnedCommands.length;
  const sessions = data.entries.filter((e, i, arr) => i === 0 || e.sessionId !== arr[i - 1].sessionId).length;
  const total    = OMNIX_REGISTRY_MAP.size + ABSOLUTE_REGISTRY_COUNT;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {[
        { label: "أوامر متعلمة", value: learned, color: "#aa44ff" },
        { label: "الكل المتاح", value: total, color: "#00e5ff" },
        { label: "إجمالي الاستخدام", value: data.entries.length, color: "#00ff88" },
        { label: "الجلسات", value: sessions, color: "#ffaa00" },
      ].map((s) => (
        <div
          key={s.label}
          className="rounded-xl border p-2.5"
          style={{ background: `${s.color}08`, borderColor: `${s.color}20` }}
        >
          <p className="text-white/35 text-xs">{s.label}</p>
          <p className="font-bold text-sm mt-0.5" style={{ color: s.color }}>
            {s.value.toLocaleString("ar")}
          </p>
        </div>
      ))}
      {godMode && (
        <div
          className="col-span-2 rounded-xl border p-2.5 flex items-center gap-2"
          style={{ background: "#ffaa0008", borderColor: "#ffaa0030" }}
        >
          <span className="text-lg">🔱</span>
          <div>
            <p className="text-xs font-bold" style={{ color: "#ffaa00" }}>وضع الإله نشط</p>
            <p className="text-xs text-white/35">الاقتراحات مدعومة بقدرات العقل الحاكم</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OmnixSelfEvolution({
  dispatchers,
  open,
  onClose,
}: {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}) {
  const sovereign    = useSovereign();
  const godMode      = sovereign.agent.godModeActive;
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);
  const [learned,     setLearned]     = useState(OmnixMemory.getLearnedCommands());
  const [approving,   setApproving]   = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<"suggestions" | "learned" | "stats">("suggestions");

  useEffect(() => {
    if (open) {
      setSuggestions(generateSuggestions(godMode));
      setLearned(OmnixMemory.getLearnedCommands());
    }
  }, [open, godMode]);

  function approveSuggestion(s: EvolutionSuggestion) {
    setApproving(s.id);
    setTimeout(() => {
      const cmdId = `learned_${s.id}`;
      if (!OMNIX_REGISTRY_MAP.has(cmdId)) {
        registerLearnedCommand({
          id: cmdId,
          name: s.label,
          nameAr: s.labelAr,
          description: s.description,
          descriptionAr: s.description,
          category: s.category as never,
          aliases: [s.trigger, s.label, s.labelAr],
          execute: (_, d) => {
            d.toast(`✅ ${s.labelAr}`);
            window.dispatchEvent(new CustomEvent("omnix:learned-command", { detail: s }));
            OmnixSovereign.recordCommandSuccess(cmdId);
            return { actionId: cmdId, success: true, message: s.label, messageAr: s.labelAr };
          },
        });
      }
      OmnixMemory.addLearnedCommand({ label: s.labelAr, description: s.description, trigger: s.trigger });
      OmnixSovereign.recordCommandSuccess(`evolution:approve:${s.id}`);

      setLearned(OmnixMemory.getLearnedCommands());
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
      setApproving(null);
      dispatchers?.toast(`🧬 تم تعلّم الأمر: ${s.labelAr}`);
    }, 700);
  }

  function rejectSuggestion(s: EvolutionSuggestion) {
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    dispatchers?.toast(`❌ تم رفض: ${s.labelAr}`);
  }

  function removeLearned(id: string) {
    OmnixMemory.removeLearnedCommand(id);
    setLearned(OmnixMemory.getLearnedCommands());
    dispatchers?.toast("🗑 تم حذف الأمر المتعلَّم");
  }

  function runLearned(cmd: typeof learned[0]) {
    const reg = OMNIX_REGISTRY_MAP.get(`learned_${cmd.id}`) ?? OMNIX_REGISTRY_MAP.get(cmd.id);
    if (reg && dispatchers) {
      try {
        const r = reg.execute({}, dispatchers);
        dispatchers.toast(r.success ? `✅ ${r.messageAr}` : `❌ ${r.messageAr}`);
        OmnixSovereign.recordCommandSuccess(cmd.id);
      } catch (e) {
        dispatchers.toast(`❌ ${e instanceof Error ? e.message : "فشل"}`);
      }
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(0,4,14,0.98)",
            borderColor: godMode ? "#ffaa0040" : "#aa44ff40",
            boxShadow: godMode
              ? "0 0 70px #ffaa0015, 0 20px 60px #00000088"
              : "0 0 70px #aa44ff15, 0 20px 60px #00000088",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: godMode ? "#ffaa0020" : "#aa44ff20" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{godMode ? "🔱" : "🧬"}</span>
              <div>
                <h2 className="text-sm font-bold tracking-widest"
                  style={{ color: godMode ? "#ffaa00" : "#aa44ff" }}>
                  OMNIX SELF EVOLUTION
                </h2>
                <p className="text-xs text-white/35">
                  {godMode ? "⚡ مدعوم بوضع الإله" : "الذكاء يتطور بناءً على استخدامك"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sovereign Badge */}
              <div
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  background: godMode ? "#ffaa0015" : "#aa44ff15",
                  color: godMode ? "#ffaa0080" : "#aa44ff80",
                  border: `1px solid ${godMode ? "#ffaa0030" : "#aa44ff30"}`,
                  fontSize: "9px",
                }}
              >
                {sovereign.meta.systemHealth === "optimal" ? "🟢" : "🟡"} {sovereign.meta.omnixNodes}/7 عقد
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl">✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "#ffffff08" }}>
            {(["suggestions", "learned", "stats"] as const).map((t) => {
              const icons: Record<typeof t, string> = { suggestions: "💡", learned: "🧠", stats: "📊" };
              const labels: Record<typeof t, string> = { suggestions: "الاقتراحات", learned: "المتعلَّمة", stats: "الإحصائيات" };
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className="flex-1 py-2.5 text-xs transition-colors"
                  style={{
                    color: activeTab === t ? (godMode ? "#ffaa00" : "#aa44ff") : "#ffffff28",
                    background: activeTab === t ? (godMode ? "#ffaa0010" : "#aa44ff10") : "transparent",
                    borderBottom: activeTab === t
                      ? `2px solid ${godMode ? "#ffaa00" : "#aa44ff"}`
                      : "2px solid transparent",
                  }}
                >
                  {icons[t]} {labels[t]}
                  {t === "suggestions" && suggestions.length > 0 && (
                    <span
                      className="ml-1 px-1 rounded-full font-bold"
                      style={{ background: "#aa44ff30", color: "#aa44ff", fontSize: "9px" }}
                    >
                      {suggestions.length}
                    </span>
                  )}
                  {t === "learned" && learned.length > 0 && (
                    <span
                      className="ml-1 px-1 rounded-full font-bold"
                      style={{ background: "#00ff8820", color: "#00ff88", fontSize: "9px" }}
                    >
                      {learned.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── Suggestions Tab ─────────────────────────────────────────────── */}
            {activeTab === "suggestions" && (
              <>
                {suggestions.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-3xl">🤔</p>
                    <p className="text-sm text-white/50">لا توجد اقتراحات حالياً</p>
                    <p className="text-xs text-white/25">
                      استخدم التطبيق أكثر لتظهر اقتراحات مبنية على نمط استخدامك
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-xl border p-4"
                        style={{
                          background: s.sovereignBoosted
                            ? "rgba(255,170,0,0.05)"
                            : "rgba(170,68,255,0.05)",
                          borderColor: s.sovereignBoosted ? "#ffaa0030" : "#aa44ff25",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{s.icon}</span>
                              <p className="text-sm font-bold text-white/90">{s.labelAr}</p>
                              {s.sovereignBoosted && (
                                <span
                                  className="text-xs px-1.5 rounded"
                                  style={{ background: "#ffaa0020", color: "#ffaa0090", fontSize: "8px" }}
                                >
                                  🔱 إلهي
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/45 mb-2">{s.reason}</p>

                            {/* Confidence bar */}
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: s.sovereignBoosted ? "#ffaa0018" : "#aa44ff18",
                                  color: s.sovereignBoosted ? "#ffaa00" : "#aa44ff",
                                }}
                              >
                                {s.category}
                              </span>
                              <span className="text-xs text-white/25">ثقة: {s.confidence}%</span>
                              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${s.confidence}%`,
                                    background: s.sovereignBoosted
                                      ? "linear-gradient(90deg, #ffaa00, #ff4444)"
                                      : "linear-gradient(90deg, #aa44ff, #ff44aa)",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Trigger phrase */}
                            <p className="text-xs text-white/25 mt-2">
                              جملة التشغيل: <span className="font-mono text-white/40">"{s.trigger}"</span>
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => approveSuggestion(s)}
                              disabled={approving === s.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              style={{
                                background: approving === s.id
                                  ? "#aa44ff20"
                                  : (s.sovereignBoosted ? "#ffaa0020" : "#aa44ff20"),
                                border: `1px solid ${s.sovereignBoosted ? "#ffaa0040" : "#aa44ff40"}`,
                                color: s.sovereignBoosted ? "#ffaa00" : "#aa44ff",
                              }}
                            >
                              {approving === s.id ? "⏳" : "✅ تعلّم"}
                            </button>
                            <button
                              onClick={() => rejectSuggestion(s)}
                              disabled={approving === s.id}
                              className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
                              style={{
                                background: "transparent",
                                border: "1px solid #ffffff10",
                                color: "#ffffff30",
                              }}
                            >
                              رفض
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Learned Tab ──────────────────────────────────────────────────── */}
            {activeTab === "learned" && (
              <>
                {learned.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-3xl">📭</p>
                    <p className="text-sm text-white/50">لا توجد أوامر متعلَّمة بعد</p>
                    <p className="text-xs text-white/25">اقبل اقتراحاً من تبويب الاقتراحات</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {learned.map((cmd, i) => (
                      <motion.div
                        key={cmd.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                        style={{ background: "#00ff8806", borderColor: "#00ff8820" }}
                      >
                        <span className="text-emerald-400 text-xs font-bold">✓</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/80 truncate">{cmd.label}</p>
                          <p className="text-xs text-white/35 truncate">جملة: "{cmd.trigger}"</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-white/25 font-mono">×{cmd.usageCount}</span>
                          <button
                            onClick={() => runLearned(cmd)}
                            className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
                            style={{ background: "#00ff8815", border: "1px solid #00ff8830", color: "#00ff88" }}
                          >
                            ▶
                          </button>
                          <button
                            onClick={() => removeLearned(cmd.id)}
                            className="text-white/20 hover:text-red-400/70 transition-colors text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Stats Tab ────────────────────────────────────────────────────── */}
            {activeTab === "stats" && (
              <div className="space-y-4">
                <EvolutionStats godMode={godMode} />

                {/* Top used commands */}
                {OmnixMemory.getTopCommands(5).length > 0 && (
                  <div>
                    <p className="text-xs text-white/35 mb-2 tracking-wider">الأوامر الأكثر استخداماً:</p>
                    <div className="space-y-1.5">
                      {OmnixMemory.getTopCommands(5).map((s) => (
                        <div key={s.actionId} className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (s.count / (OmnixMemory.getTopCommands(1)[0]?.count ?? 1)) * 100)}%`,
                                background: godMode
                                  ? "linear-gradient(90deg, #ffaa00, #ff4444)"
                                  : "linear-gradient(90deg, #aa44ff, #00e5ff)",
                              }}
                            />
                          </div>
                          <span className="text-white/50 w-28 truncate text-xs">{s.label}</span>
                          <span className="text-xs font-mono" style={{ color: godMode ? "#ffaa00" : "#aa44ff" }}>
                            ×{s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sovereign connection */}
                <div
                  className="rounded-xl border p-3 space-y-2"
                  style={{ background: "#00ff8806", borderColor: "#00ff8818" }}
                >
                  <p className="text-xs text-white/35 tracking-wider">اتصال العقل الحاكم:</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88" }} />
                      <span className="text-white/50">الأوامر: {sovereign.ui.commandsExecuted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff4444" }} />
                      <span className="text-white/50">أخطاء: {sovereign.ui.errorsEncountered}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#aa44ff" }} />
                      <span className="text-white/50">العقد: {sovereign.meta.omnixNodes}/7</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: sovereign.meta.systemHealth === "optimal" ? "#00ff88" : "#ffaa00" }} />
                      <span className="text-white/50">الصحة: {sovereign.meta.systemHealth}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "#ffffff08" }}
          >
            <p className="text-xs text-white/20">
              {suggestions.length > 0 ? `${suggestions.length} اقتراح جاهز` : "لا توجد اقتراحات حالياً"}
            </p>
            <button
              onClick={() => {
                setSuggestions(generateSuggestions(godMode));
                dispatchers?.toast("🔄 تم تحديث الاقتراحات");
              }}
              className="text-xs text-white/20 hover:text-white/50 transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/20"
            >
              ↻ تحديث
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
