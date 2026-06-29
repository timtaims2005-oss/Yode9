// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX COMMAND PALETTE — لوحة الأوامر العالمية الشاملة
//  Ctrl+Shift+Z — يبحث في كلا السجلين: OmnixRegistry + OmnixAbsoluteRegistry
//  بحث فوري في كل الأوامر وتنفيذها بضغطة Enter
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OMNIX_COMMAND_REGISTRY, OMNIX_REGISTRY_MAP } from "@/lib/OmnixRegistry";
import { OMNIX_ABSOLUTE_REGISTRY, searchAbsoluteRegistry, type AbsoluteCommand } from "@/lib/OmnixAbsoluteRegistry";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { OmnixSovereign } from "@/lib/OmnixSovereign";
import type { OmnixCommand } from "@/lib/OmnixRegistry";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

// ── Unified display item (merges both registries) ─────────────────────────────

interface PaletteItem {
  id: string;
  nameAr: string;
  name: string;
  descriptionAr: string;
  category: string;
  source: "omnix" | "absolute" | "learned";
  learned?: boolean;
  cmd: OmnixCommand | AbsoluteCommand;
}

const CATEGORY_ICONS: Record<string, string> = {
  modal: "🪟", persona: "🎭", theme: "🎨", model: "🤖", security: "🔒",
  osint: "🕵️", ui: "🖥️", system: "⚙️", chat: "💬", arsenal: "⚔️",
  window: "🪟", voice: "🎙️", memory: "🧠", evolution: "🧬",
  layout: "📐", font: "🔤", color: "🎨", combo: "⚡",
  sovereign: "🔱", omnix: "⚡",
};

const SOURCE_COLORS: Record<PaletteItem["source"], string> = {
  omnix: "#00ff88",
  absolute: "#00e5ff",
  learned: "#aa44ff",
};

interface OmnixCommandPaletteProps {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}

// ── Build unified palette items ───────────────────────────────────────────────

function buildAllItems(): PaletteItem[] {
  const items: PaletteItem[] = [];
  const seen = new Set<string>();

  // Primary registry
  for (const cmd of OMNIX_COMMAND_REGISTRY) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      items.push({
        id: cmd.id,
        nameAr: cmd.nameAr,
        name: cmd.name,
        descriptionAr: cmd.descriptionAr,
        category: cmd.category,
        source: cmd.learned ? "learned" : "omnix",
        learned: cmd.learned,
        cmd,
      });
    }
  }

  // Absolute registry (deduplicate by id)
  for (const cmd of OMNIX_ABSOLUTE_REGISTRY) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      items.push({
        id: cmd.id,
        nameAr: cmd.nameAr,
        name: cmd.name,
        descriptionAr: cmd.descriptionAr,
        category: cmd.category,
        source: "absolute",
        cmd,
      });
    }
  }

  return items;
}

const ALL_ITEMS = buildAllItems();
const TOTAL_COUNT = ALL_ITEMS.length;

// ── Search ────────────────────────────────────────────────────────────────────

function searchItems(query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_ITEMS.slice(0, 14);

  return ALL_ITEMS.filter((item) => {
    const aliasMatch =
      "aliases" in item.cmd
        ? item.cmd.aliases.some((a: string) => a.toLowerCase().includes(q))
        : false;
    return (
      item.id.includes(q) ||
      item.nameAr.includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.includes(q) ||
      item.descriptionAr.includes(q) ||
      aliasMatch
    );
  }).slice(0, 18);
}

// ── Highlight match ───────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-400/30 text-emerald-300 rounded-sm px-px">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Execute any item ──────────────────────────────────────────────────────────

function executeItem(item: PaletteItem, dispatchers: NexusDispatchers): { success: boolean; message: string } {
  if (item.source === "omnix" || item.source === "learned") {
    const cmd = OMNIX_REGISTRY_MAP.get(item.id);
    if (cmd) {
      const r = cmd.execute({}, dispatchers);
      OmnixMemory.recordAction({ actionId: item.id, actionLabel: item.nameAr, params: {}, success: r.success });
      OmnixSovereign.recordCommandSuccess(item.id);
      return { success: r.success, message: r.messageAr };
    }
  }
  // absolute registry
  const absCmd = searchAbsoluteRegistry(item.id).find((c) => c.id === item.id);
  if (absCmd) {
    const r = absCmd.execute({}, dispatchers);
    OmnixMemory.recordAction({ actionId: item.id, actionLabel: item.nameAr, params: {}, success: r.success });
    OmnixSovereign.recordCommandSuccess(item.id);
    return r;
  }
  return { success: false, message: "أمر غير موجود" };
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OmnixCommandPalette({ dispatchers, open, onClose }: OmnixCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const recent = OmnixMemory.getRecentActions(8).map((e) => e.actionId);
      setRecentIds([...new Set(recent)]);
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered: PaletteItem[] = (() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show recent + top commands when no query
      const recentItems = recentIds
        .map((id) => ALL_ITEMS.find((item) => item.id === id))
        .filter(Boolean) as PaletteItem[];
      const topIds = OmnixMemory.getTopCommands(14)
        .map((s) => s.actionId)
        .filter((id) => !recentIds.includes(id));
      const topItems = topIds
        .map((id) => ALL_ITEMS.find((item) => item.id === id))
        .filter(Boolean) as PaletteItem[];
      const combined = [...recentItems, ...topItems].slice(0, 14);
      return combined.length > 0 ? combined : ALL_ITEMS.slice(0, 14);
    }
    return searchItems(q);
  })();

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const runItem = useCallback((item: PaletteItem) => {
    if (!dispatchers) return;
    try {
      const result = executeItem(item, dispatchers);
      dispatchers.toast(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (e) {
      dispatchers.toast(`❌ ${e instanceof Error ? e.message : "فشل التنفيذ"}`);
    }
    onClose();
  }, [dispatchers, onClose]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((v) => Math.min(v + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (filtered[selected]) runItem(filtered[selected]); }
    if (e.key === "Escape")    { e.preventDefault(); onClose(); }
    if (e.key === "Tab")       { e.preventDefault(); setSelected((v) => (v + 1) % filtered.length); }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[10010] flex items-start justify-center pt-[13vh]"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-2xl mx-4 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "rgba(0,4,12,0.98)",
            borderColor: "#00ff8840",
            boxShadow: "0 0 100px #00ff8818, 0 30px 80px #00000095",
            maxHeight: "66vh",
          }}
        >
          {/* Header + Search */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "#00ff8820" }}>
            <span className="text-emerald-400 text-xl flex-shrink-0">🔱</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={`ابحث في ${TOTAL_COUNT} أمر OMNIX... (↑↓ للتنقل، Enter للتنفيذ)`}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              dir="auto"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-white/20">{TOTAL_COUNT} أمر</span>
              <kbd className="text-xs px-1.5 py-0.5 rounded border text-white/30 ml-1"
                style={{ borderColor: "#ffffff15", background: "#ffffff08" }}>Esc</kbd>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-white/30 text-sm">لا توجد أوامر مطابقة</p>
                <p className="text-white/15 text-xs mt-1">جرّب كلمة مختلفة بالعربية أو الإنجليزية</p>
              </div>
            ) : (
              <>
                {!query.trim() && (
                  <p className="px-4 pt-2 pb-1 text-xs text-white/20 tracking-wider">
                    {recentIds.length > 0 ? "⏱ الأخيرة والأكثر استخداماً" : "⚡ جميع الأوامر"}
                  </p>
                )}
                {filtered.map((item, idx) => (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setSelected(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75"
                    style={{
                      background: selected === idx ? `${SOURCE_COLORS[item.source]}0a` : "transparent",
                      borderLeft: selected === idx ? `2px solid ${SOURCE_COLORS[item.source]}` : "2px solid transparent",
                    }}
                  >
                    {/* Icon */}
                    <span className="text-base flex-shrink-0 w-7 text-center leading-none">
                      {CATEGORY_ICONS[item.category] ?? "⚡"}
                    </span>

                    {/* Labels */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90 truncate leading-tight" dir="auto">
                        {highlight(item.nameAr, query)}
                      </p>
                      <p className="text-xs text-white/35 truncate leading-tight mt-0.5" dir="auto">
                        {highlight(item.descriptionAr, query)}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: `${SOURCE_COLORS[item.source]}12`,
                          color: `${SOURCE_COLORS[item.source]}90`,
                          fontSize: "9px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {item.category}
                      </span>
                      {item.source === "absolute" && (
                        <span style={{ fontSize: "9px", color: "#00e5ff50" }}>ABS</span>
                      )}
                      {item.learned && (
                        <span className="text-purple-400/70" style={{ fontSize: "11px" }}>🧬</span>
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
            <div className="flex items-center gap-4 text-xs text-white/20">
              <span>↑↓ تنقل</span>
              <span>Enter تنفيذ</span>
              <span>Tab التالي</span>
              <span>Esc إغلاق</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: "#00ff8840" }}>{OMNIX_COMMAND_REGISTRY.length} OMNIX</span>
              <span className="text-white/15">+</span>
              <span style={{ color: "#00e5ff40" }}>{OMNIX_ABSOLUTE_REGISTRY.length} ABS</span>
              <span className="text-white/20">= {TOTAL_COUNT} أمر</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
