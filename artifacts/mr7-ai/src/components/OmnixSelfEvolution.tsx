// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX SELF EVOLUTION — النظام السابع
//  الذكاء الاصطناعي يقترح تحسينات جديدة بناءً على أنماط الاستخدام
//  عند موافقة المستخدم يُضاف الأمر الجديد تلقائياً ويصبح متاحاً فوراً
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { registerLearnedCommand, OMNIX_REGISTRY_MAP } from "@/lib/OmnixRegistry";
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
}

// ── Generate suggestions based on usage patterns ──────────────────────────────

function generateSuggestions(): EvolutionSuggestion[] {
  const topCmds = OmnixMemory.getTopCommands(10);
  const recentActions = OmnixMemory.getRecentActions(20);
  const suggestions: EvolutionSuggestion[] = [];

  // Pattern: if user opens a security tool + osint tool frequently → suggest combined workflow
  const securityCount = topCmds.filter((c) => c.actionId.includes("security") || c.actionId.includes("threat")).reduce((s, c) => s + c.count, 0);
  const osintCount = topCmds.filter((c) => c.actionId.includes("osint")).reduce((s, c) => s + c.count, 0);

  if (securityCount > 3 && osintCount > 3) {
    suggestions.push({
      id: "sugg-security-osint-combo",
      label: "Security + OSINT Combo",
      labelAr: "فتح الأمن + OSINT معاً",
      description: "Opens Security Dashboard and OSINT tools simultaneously",
      trigger: "افتح الأمن والـ OSINT",
      category: "combo",
      reason: "تستخدم أدوات الأمن وOSINT معاً بكثرة — هذا الأمر يفتحهما دفعة واحدة",
      confidence: Math.min(95, 60 + (securityCount + osintCount) * 2),
    });
  }

  // Pattern: if user frequently changes themes → suggest theme cycle
  const themeCount = topCmds.find((c) => c.actionId === "set_theme")?.count ?? 0;
  if (themeCount > 2) {
    suggestions.push({
      id: "sugg-theme-cycle",
      label: "Theme Cycle",
      labelAr: "تدوير الثيمات",
      description: "Cycles through all themes one by one",
      trigger: "دوّر الثيمات",
      category: "theme",
      reason: "تغيّر الثيمات بكثرة — هذا الأمر يدور عليها تلقائياً",
      confidence: Math.min(90, 50 + themeCount * 8),
    });
  }

  // Pattern: if user frequently opens modals → suggest quick-open hub
  const modalCount = topCmds.filter((c) => c.actionId.startsWith("open_")).reduce((s, c) => s + c.count, 0);
  if (modalCount > 5) {
    suggestions.push({
      id: "sugg-quick-hub",
      label: "Quick Hub",
      labelAr: "مركز الوصول السريع",
      description: "One-click hub for most-used tools",
      trigger: "افتح المركز السريع",
      category: "modal",
      reason: `تفتح الأدوات كثيراً (${modalCount} مرة) — هذا الأمر يجمع أكثر 5 أدوات استخداماً في مكان واحد`,
      confidence: Math.min(92, 55 + modalCount),
    });
  }

  // Fixed suggestions always present
  if (recentActions.length > 5) {
    suggestions.push({
      id: "sugg-replay-session",
      label: "Replay Last Session",
      labelAr: "إعادة تشغيل الجلسة الأخيرة",
      description: "Replays the last 5 commands in sequence",
      trigger: "أعد الجلسة الأخيرة",
      category: "memory",
      reason: "بناءً على نشاطك الأخير — يمكنك إعادة تشغيل آخر 5 أوامر بضغطة واحدة",
      confidence: 78,
    });
  }

  // Filter out already-learned
  const learned = OmnixMemory.getLearnedCommands().map((c) => c.id);
  return suggestions.filter((s) => !learned.includes(s.id)).slice(0, 5);
}

// ── Component ────────────────────────────────────────────────────────────────

export function OmnixSelfEvolution({
  dispatchers,
  open,
  onClose,
}: {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);
  const [learned, setLearned] = useState(OmnixMemory.getLearnedCommands());
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSuggestions(generateSuggestions());
      setLearned(OmnixMemory.getLearnedCommands());
    }
  }, [open]);

  function approveSuggestion(s: EvolutionSuggestion) {
    setApproving(s.id);
    setTimeout(() => {
      // Register as a learned command
      const cmdId = `learned_${s.id}`;
      if (!OMNIX_REGISTRY_MAP.has(cmdId)) {
        registerLearnedCommand({
          id: cmdId,
          name: s.label,
          nameAr: s.labelAr,
          description: s.description,
          descriptionAr: s.description,
          category: s.category as never,
          aliases: [s.trigger],
          execute: (_, d) => {
            d.toast(`✅ تم تنفيذ: ${s.labelAr}`);
            window.dispatchEvent(new CustomEvent("omnix:learned-command", { detail: s }));
            return {
              actionId: cmdId,
              success: true,
              message: s.label,
              messageAr: s.labelAr,
            };
          },
        });
      }

      OmnixMemory.addLearnedCommand({
        label: s.labelAr,
        description: s.description,
        trigger: s.trigger,
      });

      setLearned(OmnixMemory.getLearnedCommands());
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
      setApproving(null);

      dispatchers?.toast(`🧬 تم تعلم الأمر: ${s.labelAr}`);
    }, 800);
  }

  function removeLearned(id: string) {
    OmnixMemory.removeLearnedCommand(id);
    setLearned(OmnixMemory.getLearnedCommands());
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
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(0,8,18,0.97)",
            borderColor: "#aa44ff40",
            boxShadow: "0 0 60px #aa44ff15, 0 20px 60px #00000080",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#aa44ff20" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧬</span>
              <div>
                <h2 className="text-sm font-bold tracking-widest" style={{ color: "#aa44ff" }}>
                  OMNIX SELF EVOLUTION
                </h2>
                <p className="text-xs text-white/40">الذكاء الاصطناعي يتطور بناءً على استخدامك</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Suggestions */}
            <div>
              <p className="text-xs font-bold text-white/50 mb-3 tracking-wider">
                💡 اقتراحات مبنية على نمط استخدامك:
              </p>
              {suggestions.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">
                  لا توجد اقتراحات حالياً — استخدم التطبيق أكثر لتظهر اقتراحات جديدة
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-xl border p-4"
                      style={{
                        background: "rgba(170,68,255,0.05)",
                        borderColor: "#aa44ff25",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white/90">{s.labelAr}</p>
                          <p className="text-xs text-white/50 mt-1">{s.reason}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#aa44ff20", color: "#aa44ff" }}>
                              {s.category}
                            </span>
                            <span className="text-xs text-white/30">ثقة: {s.confidence}%</span>
                            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${s.confidence}%`,
                                  background: "linear-gradient(90deg, #aa44ff, #ff44aa)",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => approveSuggestion(s)}
                          disabled={approving === s.id}
                          className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                          style={{
                            background: approving === s.id ? "#aa44ff30" : "#aa44ff20",
                            border: "1px solid #aa44ff40",
                            color: "#aa44ff",
                          }}
                        >
                          {approving === s.id ? "⏳ جاري..." : "✅ تعلّم"}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Learned Commands */}
            {learned.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/50 mb-3 tracking-wider">
                  🧠 الأوامر المُتعلَّمة ({learned.length}):
                </p>
                <div className="space-y-2">
                  {learned.map((cmd) => (
                    <div
                      key={cmd.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{ background: "#00ff8808", borderColor: "#00ff8820" }}
                    >
                      <span className="text-emerald-400 text-xs">✓</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white/80">{cmd.label}</p>
                        <p className="text-xs text-white/40">تشغيل: "{cmd.trigger}"</p>
                      </div>
                      <span className="text-xs text-white/30">×{cmd.usageCount}</span>
                      <button
                        onClick={() => removeLearned(cmd.id)}
                        className="text-white/20 hover:text-red-400/70 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
