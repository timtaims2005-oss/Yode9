// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX COMMAND PALETTE — لوحة الأوامر العالمية
//  Ctrl+Shift+Z — بحث فوري في كل الأوامر وتنفيذها بضغطة Enter
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OMNIX_COMMAND_REGISTRY, OMNIX_REGISTRY_MAP, type OmnixCommand } from "@/lib/OmnixRegistry";
import { OmnixMemory } from "@/lib/OmnixMemory";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

const CATEGORY_ICONS: Record<string, string> = {
  modal: "🪟", persona: "🎭", theme: "🎨", model: "🤖", security: "🔒",
  osint: "🔍", ui: "🖥️", system: "⚙️", chat: "💬", arsenal: "⚔️",
  window: "🪟", voice: "🎙️", memory: "🧠", evolution: "🧬",
  layout: "📐", font: "🔤", color: "🎨", combo: "⚡",
};

interface OmnixCommandPaletteProps {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-400/30 text-emerald-300 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function OmnixCommandPalette({ dispatchers, open, onClose }: OmnixCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent commands
  useEffect(() => {
    if (open) {
      const recent = OmnixMemory.getRecentActions(8).map((e) => e.actionId);
      setRecentIds([...new Set(recent)]);
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered: OmnixCommand[] = (() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show recent + top commands when no query
      const recent = recentIds
        .map((id) => OMNIX_REGISTRY_MAP.get(id))
        .filter(Boolean) as OmnixCommand[];
      const top = OmnixMemory.getTopCommands(12)
        .map((s) => OMNIX_REGISTRY_MAP.get(s.actionId))
        .filter(Boolean)
        .filter((c) => !recent.find((r) => r!.id === c!.id)) as OmnixCommand[];
      const combined = [...recent, ...top].slice(0, 12);
      return combined.length > 0 ? combined : OMNIX_COMMAND_REGISTRY.slice(0, 12);
    }
    return OMNIX_COMMAND_REGISTRY.filter((c) =>
      c.id.includes(q) ||
      c.nameAr.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.category.includes(q) ||
      c.descriptionAr.includes(q) ||
      (c.aliases ?? []).some((a) => a.toLowerCase().includes(q))
    ).slice(0, 15);
  })();

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const runCommand = useCallback((cmd: OmnixCommand) => {
    if (!dispatchers) return;
    try {
      const result = cmd.execute({}, dispatchers);
      dispatchers.toast(result.success ? `✅ ${result.messageAr}` : `❌ ${result.messageAr}`);
      OmnixMemory.recordAction({
        actionId: cmd.id,
        actionLabel: cmd.nameAr,
        params: {},
        success: result.success,
      });
    } catch (e) {
      dispatchers.toast(`❌ ${e instanceof Error ? e.message : "فشل التنفيذ"}`);
    }
    onClose();
  }, [dispatchers, onClose]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((v) => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[selected]) runCommand(filtered[selected]); }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Tab") { e.preventDefault(); setSelected((v) => (v + 1) % filtered.length); }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[10010] flex items-start justify-center pt-[15vh]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-xl mx-4 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "rgba(0,6,14,0.97)",
            borderColor: "#00ff8840",
            boxShadow: "0 0 80px #00ff8820, 0 25px 80px #00000090",
            maxHeight: "60vh",
          }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "#00ff8820" }}>
            <span className="text-emerald-400 text-lg flex-shrink-0">⚡</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="ابحث في أوامر OMNIX... (↑↓ للتنقل، Enter للتنفيذ)"
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              dir="auto"
              spellCheck={false}
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <kbd className="text-xs px-1.5 py-0.5 rounded border text-white/30" style={{ borderColor: "#ffffff15", background: "#ffffff08" }}>Esc</kbd>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-white/30 text-sm">
                لا توجد أوامر مطابقة — جرّب كلمة أخرى
              </div>
            ) : (
              <>
                {!query.trim() && (
                  <p className="px-4 py-2 text-xs text-white/25 tracking-wider">
                    {recentIds.length > 0 ? "الأوامر الأخيرة والأكثر استخداماً" : "جميع الأوامر"}
                  </p>
                )}
                {filtered.map((cmd, idx) => (
                  <button
                    key={cmd.id}
                    data-idx={idx}
                    onClick={() => runCommand(cmd)}
                    onMouseEnter={() => setSelected(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                    style={{
                      background: selected === idx ? "rgba(0,255,136,0.08)" : "transparent",
                      borderLeft: selected === idx ? "2px solid #00ff88" : "2px solid transparent",
                    }}
                  >
                    <span className="text-lg flex-shrink-0 w-7 text-center">
                      {CATEGORY_ICONS[cmd.category] ?? "⚡"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate" dir="auto">
                        {highlight(cmd.nameAr, query)}
                      </p>
                      <p className="text-xs text-white/40 truncate" dir="auto">
                        {highlight(cmd.descriptionAr, query)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "#00ff8810", color: "#00ff8870", fontSize: "9px" }}
                      >
                        {cmd.category}
                      </span>
                      {cmd.learned && (
                        <span className="text-xs text-purple-400/70">🧬</span>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2 border-t"
            style={{ borderColor: "#00ff8810" }}
          >
            <div className="flex items-center gap-3 text-xs text-white/25">
              <span>↑↓ تنقل</span>
              <span>Enter تنفيذ</span>
              <span>Tab التالي</span>
            </div>
            <span className="text-xs text-white/20">
              {filtered.length} من {OMNIX_COMMAND_REGISTRY.length} أمر
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
