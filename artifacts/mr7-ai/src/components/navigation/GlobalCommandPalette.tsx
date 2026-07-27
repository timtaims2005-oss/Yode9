/**
 * GlobalCommandPalette — Cmd+K / Ctrl+K studio-wide search & command hub
 *
 * Features:
 *  • Fuzzy search across all Arsenal modules, actions, and chats
 *  • Keyboard-driven (↑↓ navigate, Enter launch, Escape close)
 *  • Grouped results with section headings
 *  • Glassmorphism overlay with smooth animations
 *  • Recent / frequent items surfaced first
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Command, X, ArrowRight, Hash, Zap, Shield, Terminal, Brain,
  Globe, Code2, Bot, Layers, Rocket, ChevronRight, Clock, TrendingUp,
  LayoutGrid, Settings, MessageSquare, BookOpen, Crosshair, Cpu, Database,
  Network, FlaskConical, Eye, Lock, Radio, Target, Star,
} from "lucide-react";
import { ARSENAL_MODULES } from "@/components/modals/ArsenalHubModal";
import type { ArsenalModuleId } from "@/components/modals/ArsenalHubModal";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type CmdItem = {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  icon: React.ReactNode;
  color?: string;
  shortcut?: string;
  action: () => void;
};

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface GlobalCommandPaletteProps {
  onOpenArsenal?: () => void;
  onLaunchModule?: (id: ArsenalModuleId) => void;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  onOpenPricing?: () => void;
  onOpenMemory?: () => void;
  onOpenBookmarks?: () => void;
  onOpenDeepSearch?: () => void;
  onOpenOsintHub?: () => void;
  onOpenAnalytics?: () => void;
}

/* ─── Group order ────────────────────────────────────────────────────────── */
const GROUP_ORDER = ["Quick Actions", "Arsenal Modules", "Navigation", "Recent"];

/* ─── Fuzzy match ────────────────────────────────────────────────────────── */
function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // char-by-char fuzzy
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  return 20;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function GlobalCommandPalette({
  onOpenArsenal,
  onLaunchModule,
  onNewChat,
  onOpenSettings,
  onOpenPricing,
  onOpenMemory,
  onOpenBookmarks,
  onOpenDeepSearch,
  onOpenOsintHub,
  onOpenAnalytics,
}: GlobalCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ── Keyboard trigger ────────────────────────────────────────────────── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── Focus input on open ─────────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  /* ── Build command list ──────────────────────────────────────────────── */
  const allItems = useMemo<CmdItem[]>(() => {
    const quickActions: CmdItem[] = [
      {
        id: "new-chat",
        label: "New Chat",
        sublabel: "Start a fresh conversation",
        group: "Quick Actions",
        icon: <MessageSquare className="w-4 h-4" />,
        color: "#e21227",
        shortcut: "N",
        action: () => { onNewChat?.(); setOpen(false); },
      },
      {
        id: "arsenal",
        label: "Open Arsenal Hub",
        sublabel: "All AI tools & modules",
        group: "Quick Actions",
        icon: <LayoutGrid className="w-4 h-4" />,
        color: "#e21227",
        shortcut: "A",
        action: () => { onOpenArsenal?.(); setOpen(false); },
      },
      {
        id: "deep-search",
        label: "Deep Search",
        sublabel: "AI-powered web intelligence",
        group: "Quick Actions",
        icon: <Search className="w-4 h-4" />,
        color: "#3b82f6",
        action: () => { onOpenDeepSearch?.(); setOpen(false); },
      },
      {
        id: "osint-hub",
        label: "OSINT Hub",
        sublabel: "Open-source intelligence center",
        group: "Quick Actions",
        icon: <Globe className="w-4 h-4" />,
        color: "#0ea5e9",
        action: () => { onOpenOsintHub?.(); setOpen(false); },
      },
    ];

    const navItems: CmdItem[] = [
      {
        id: "nav-settings",
        label: "Settings",
        group: "Navigation",
        icon: <Settings className="w-4 h-4" />,
        color: "#6b7280",
        action: () => { onOpenSettings?.(); setOpen(false); },
      },
      {
        id: "nav-pricing",
        label: "Pricing & Upgrade",
        group: "Navigation",
        icon: <Star className="w-4 h-4" />,
        color: "#f59e0b",
        action: () => { onOpenPricing?.(); setOpen(false); },
      },
      {
        id: "nav-memory",
        label: "Memory Core",
        group: "Navigation",
        icon: <Brain className="w-4 h-4" />,
        color: "#a78bfa",
        action: () => { onOpenMemory?.(); setOpen(false); },
      },
      {
        id: "nav-bookmarks",
        label: "Bookmarks",
        group: "Navigation",
        icon: <BookOpen className="w-4 h-4" />,
        color: "#f59e0b",
        action: () => { onOpenBookmarks?.(); setOpen(false); },
      },
      {
        id: "nav-analytics",
        label: "Analytics Dashboard",
        group: "Navigation",
        icon: <TrendingUp className="w-4 h-4" />,
        color: "#22c55e",
        action: () => { onOpenAnalytics?.(); setOpen(false); },
      },
    ];

    const arsenalItems: CmdItem[] = ARSENAL_MODULES.map((m) => ({
      id: `arsenal-${m.id}`,
      label: m.name,
      sublabel: m.subtitle,
      group: "Arsenal Modules",
      icon: <m.icon className="w-4 h-4" style={{ color: m.color }} />,
      color: m.color,
      action: () => {
        onLaunchModule?.(m.id);
        setOpen(false);
      },
    }));

    return [...quickActions, ...navItems, ...arsenalItems];
  }, [onNewChat, onOpenArsenal, onOpenDeepSearch, onOpenOsintHub, onOpenSettings, onOpenPricing, onOpenMemory, onOpenBookmarks, onOpenAnalytics, onLaunchModule]);

  /* ── Filter + score ──────────────────────────────────────────────────── */
  const filtered = useMemo<CmdItem[]>(() => {
    if (!query.trim()) {
      // Default: show quick actions + first 6 arsenal modules
      return [
        ...allItems.filter((i) => i.group === "Quick Actions"),
        ...allItems.filter((i) => i.group === "Navigation"),
        ...allItems.filter((i) => i.group === "Arsenal Modules").slice(0, 8),
      ];
    }
    return allItems
      .filter((i) => fuzzyMatch(query, i.label) || fuzzyMatch(query, i.sublabel ?? "") || fuzzyMatch(query, i.group))
      .sort((a, b) => {
        const sa = fuzzyScore(query, a.label);
        const sb = fuzzyScore(query, b.label);
        return sb - sa;
      })
      .slice(0, 20);
  }, [query, allItems]);

  /* ── Group results ───────────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const groups: Record<string, CmdItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filtered]);

  /* ── Flat indexed list for keyboard nav ──────────────────────────────── */
  const flatItems = useMemo(() => filtered, [filtered]);

  /* ── Keyboard navigation ─────────────────────────────────────────────── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatItems[selectedIdx]?.action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }, [flatItems, selectedIdx]);

  /* ── Scroll selected into view ───────────────────────────────────────── */
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIdx]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[400]"
            style={{
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onClick={() => setOpen(false)}
          />

          {/* Palette panel */}
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[401] inset-x-4 top-[8vh] mx-auto"
            style={{ maxWidth: 620 }}
            onKeyDown={handleKeyDown}
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "rgba(10,10,10,0.92)",
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(226,18,39,0.06)",
              }}
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, tools, modules…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    caretColor: "#e21227",
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <kbd
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Results list */}
              <div
                ref={listRef}
                className="overflow-y-auto studio-scroll"
                style={{ maxHeight: "min(60vh, 480px)", padding: "8px 0" }}
              >
                {flatItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Search className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                      No results for "{query}"
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([group, items]) => (
                    <div key={group}>
                      {/* Group header */}
                      <div
                        className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "rgba(255,255,255,0.28)" }}
                      >
                        {group}
                      </div>

                      {/* Items */}
                      {items.map((item) => {
                        const globalIdx = flatItems.indexOf(item);
                        const isSelected = globalIdx === selectedIdx;
                        return (
                          <button
                            key={item.id}
                            data-idx={globalIdx}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                            style={{
                              background: isSelected
                                ? "rgba(226,18,39,0.08)"
                                : "transparent",
                              borderLeft: isSelected
                                ? "2px solid rgba(226,18,39,0.7)"
                                : "2px solid transparent",
                            }}
                          >
                            {/* Icon */}
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: item.color
                                  ? `${item.color}18`
                                  : "rgba(255,255,255,0.06)",
                                color: item.color ?? "rgba(255,255,255,0.5)",
                              }}
                            >
                              {item.icon}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm font-medium truncate"
                                style={{
                                  color: isSelected
                                    ? "rgba(255,255,255,0.95)"
                                    : "rgba(255,255,255,0.75)",
                                }}
                              >
                                {item.label}
                              </div>
                              {item.sublabel && (
                                <div
                                  className="text-xs truncate mt-0.5"
                                  style={{ color: "rgba(255,255,255,0.35)" }}
                                >
                                  {item.sublabel}
                                </div>
                              )}
                            </div>

                            {/* Shortcut or arrow */}
                            {item.shortcut ? (
                              <kbd
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono flex-shrink-0"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "rgba(255,255,255,0.35)",
                                }}
                              >
                                {item.shortcut}
                              </kbd>
                            ) : (
                              <ChevronRight
                                className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                  color: "rgba(255,255,255,0.3)",
                                  opacity: isSelected ? 0.6 : 0,
                                }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center gap-3">
                  {[
                    { keys: ["↑", "↓"], label: "navigate" },
                    { keys: ["↵"], label: "launch" },
                    { keys: ["⌘", "K"], label: "toggle" },
                  ].map(({ keys, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      {keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1 py-0.5 rounded text-[9px] font-mono"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.3)",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <Command className="w-3 h-3" />
                  <span className="text-[10px]">MR7 Command</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

/** Trigger button to open command palette — place anywhere in the UI */
export function CommandPaletteTrigger({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => {
        const e = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
        document.dispatchEvent(e);
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.45)",
      }}
      title="Command Palette (⌘K)"
    >
      <Search className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Search…</span>
      <div className="hidden sm:flex items-center gap-0.5">
        <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>⌘</kbd>
        <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>K</kbd>
      </div>
    </button>
  );
}
