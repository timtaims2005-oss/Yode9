/**
 * ArsenalStudioView — Full-page Studio layout for the Arsenal Hub
 *
 * Replaces the cramped modal card grid with an expansive, searchable,
 * category-filtered workspace inspired by Claude / Gemini Studio.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ Header — title, search, filter, view toggle                 │
 *  ├──────────────┬──────────────────────────────────────────────┤
 *  │ Category     │ Module cards — masonry / grid / list         │
 *  │ sidebar      │ (hover → expand, click → full workspace)     │
 *  └──────────────┴──────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, LayoutGrid, List, Filter, ChevronRight, Zap, Shield,
  Bot, Brain, Globe, Code2, Terminal, Layers, Lock, Target, Radio,
  FlaskConical, Eye, Cpu, Network, BookOpen, Palette, Rocket, Star,
  Crosshair, Database, SlidersHorizontal, BarChart2, ArrowUpRight,
  CheckCircle2, Circle, Hash, Command,
} from "lucide-react";

import { ARSENAL_MODULES } from "@/components/modals/ArsenalHubModal";
import type { ArsenalModuleId, ArsenalModule } from "@/components/modals/ArsenalHubModal";
import { ToolDetailView } from "@/components/arsenal/ToolDetailView";

/* ─── Tag → Category mapping ─────────────────────────────────────────────── */
const TAG_CATEGORY: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "AI AGENT":     { label: "AI Agents",        icon: Bot,          color: "#a78bfa" },
  "MULTI-AGENT":  { label: "AI Agents",        icon: Bot,          color: "#a78bfa" },
  "AGENT":        { label: "AI Agents",        icon: Bot,          color: "#a78bfa" },
  "AI SYSTEM":    { label: "AI Agents",        icon: Bot,          color: "#a78bfa" },
  "AI CODING":    { label: "Dev & Code",       icon: Code2,        color: "#f97316" },
  "DEV":          { label: "Dev & Code",       icon: Code2,        color: "#f97316" },
  "CODE":         { label: "Dev & Code",       icon: Code2,        color: "#f97316" },
  "PENTEST":      { label: "Security",         icon: Shield,       color: "#e21227" },
  "AI PENTEST":   { label: "Security",         icon: Shield,       color: "#4ade80" },
  "SECURITY":     { label: "Security",         icon: Shield,       color: "#e21227" },
  "RED TEAM":     { label: "Security",         icon: Target,       color: "#e21227" },
  "OFFENSE":      { label: "Security",         icon: Target,       color: "#e21227" },
  "EXPLOIT":      { label: "Security",         icon: Target,       color: "#e21227" },
  "MALWARE":      { label: "Security",         icon: Target,       color: "#e21227" },
  "MOBILE PENTEST":{ label: "Security",        icon: Shield,       color: "#e21227" },
  "HACKING":      { label: "Security",         icon: Terminal,     color: "#e21227" },
  "OSINT":        { label: "Intel & OSINT",    icon: Globe,        color: "#0ea5e9" },
  "INTEL":        { label: "Intel & OSINT",    icon: Globe,        color: "#0ea5e9" },
  "RECON":        { label: "Intel & OSINT",    icon: Globe,        color: "#0ea5e9" },
  "AI":           { label: "AI Tools",         icon: Brain,        color: "#6366f1" },
  "LLM":          { label: "AI Tools",         icon: Brain,        color: "#6366f1" },
  "RESEARCH":     { label: "AI Tools",         icon: Brain,        color: "#6366f1" },
  "DESIGN":       { label: "Design & Collab",  icon: Palette,      color: "#3b82f6" },
  "DESIGN PRO":   { label: "Design & Collab",  icon: Palette,      color: "#6366f1" },
  "COLLAB":       { label: "Design & Collab",  icon: Layers,       color: "#14b8a6" },
  "CLONER":       { label: "Design & Collab",  icon: Globe,        color: "#06b6d4" },
  "DIRECTORY":    { label: "Resources",        icon: BookOpen,     color: "#a78bfa" },
  "FRAMEWORK":    { label: "Resources",        icon: BookOpen,     color: "#a78bfa" },
  "SYSTEM":       { label: "Ops & Systems",    icon: Cpu,          color: "#22c55e" },
  "NETWORK":      { label: "Ops & Systems",    icon: Network,      color: "#22c55e" },
  "FORENSICS":    { label: "Ops & Systems",    icon: FlaskConical, color: "#f59e0b" },
};

function getCategory(tag: string) {
  return TAG_CATEGORY[tag.toUpperCase()] ?? { label: "Other", icon: Hash, color: "#6b7280" };
}

/* ─── Extract unique categories ──────────────────────────────────────────── */
function buildCategories() {
  const cats = new Map<string, { icon: React.ElementType; color: string; count: number }>();
  for (const m of ARSENAL_MODULES) {
    const cat = getCategory(m.tag);
    const existing = cats.get(cat.label);
    if (existing) {
      cats.set(cat.label, { ...existing, count: existing.count + 1 });
    } else {
      cats.set(cat.label, { icon: cat.icon, color: cat.color, count: 1 });
    }
  }
  return [
    { id: "all", label: "All Modules", icon: LayoutGrid, color: "#e21227", count: ARSENAL_MODULES.length },
    ...Array.from(cats.entries()).map(([label, v]) => ({ id: label, label, ...v })),
  ];
}

const CATEGORIES = buildCategories();

/* ─── View modes ─────────────────────────────────────────────────────────── */
type ViewMode = "grid" | "list";

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface ArsenalStudioViewProps {
  open: boolean;
  onClose: () => void;
  onLaunch: (id: ArsenalModuleId) => void;
}

/* ─── onSelectDetail prop helper ─────────────────────────────────────────── */
type OnSelectDetail = (mod: ArsenalModule) => void;

/* ─── Module card — grid mode ────────────────────────────────────────────── */
function ModuleCardGrid({
  module: m,
  onLaunch,
  index,
}: {
  module: typeof ARSENAL_MODULES[number];
  onLaunch: OnSelectDetail;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onLaunch(m)}
      className="group relative flex flex-col cursor-pointer overflow-hidden rounded-2xl transition-all duration-200"
      style={{
        background: hovered ? `${m.color}0e` : "rgba(14,14,14,0.9)",
        border: `1px solid ${hovered ? m.border : "rgba(255,255,255,0.06)"}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 32px ${m.glow}, 0 0 0 1px ${m.border}` : "none",
        minHeight: 180,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-200"
        style={{
          background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Card content */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200"
            style={{
              background: m.bg,
              border: `1px solid ${m.border}`,
              transform: hovered ? "scale(1.08)" : "scale(1)",
            }}
          >
            <m.icon className="w-5 h-5" style={{ color: m.color }} />
          </div>

          {/* Tag badge */}
          <span
            className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: `${m.color}16`,
              color: m.color,
              border: `1px solid ${m.color}30`,
            }}
          >
            {m.tag}
          </span>
        </div>

        {/* Name */}
        <div>
          <h3
            className="text-sm font-bold leading-tight mb-1 transition-colors duration-200"
            style={{ color: hovered ? "#fff" : "rgba(255,255,255,0.85)" }}
          >
            {m.name}
          </h3>
          <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>
            {m.subtitle}
          </p>
        </div>

        {/* Description — visible on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="text-[11px] leading-relaxed overflow-hidden"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {m.desc.slice(0, 120)}…
            </motion.p>
          )}
        </AnimatePresence>

        {/* Source footer */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.2)" }}>
            {m.source}
          </span>
          <motion.div
            animate={{ x: hovered ? 2 : 0, opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: m.color }} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Module row — list mode ─────────────────────────────────────────────── */
function ModuleRowList({
  module: m,
  onLaunch,
  index,
}: {
  module: typeof ARSENAL_MODULES[number];
  onLaunch: OnSelectDetail;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.015, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onLaunch(m)}
      className="group flex items-center gap-4 px-4 py-3.5 cursor-pointer rounded-xl transition-all duration-150"
      style={{
        background: hovered ? `${m.color}0a` : "transparent",
        border: `1px solid ${hovered ? m.border : "transparent"}`,
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: m.bg, border: `1px solid ${m.border}` }}
      >
        <m.icon className="w-4.5 h-4.5" style={{ color: m.color }} />
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
            {m.name}
          </span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase hidden sm:inline"
            style={{ color: m.color }}
          >
            {m.tag}
          </span>
        </div>
        <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          {m.subtitle}
        </p>
      </div>

      {/* Source */}
      <span className="text-[10px] font-mono hidden lg:block flex-shrink-0 w-40 truncate text-right" style={{ color: "rgba(255,255,255,0.18)" }}>
        {m.source}
      </span>

      {/* Arrow */}
      <motion.div
        animate={{ x: hovered ? 2 : 0, opacity: hovered ? 1 : 0.3 }}
        transition={{ duration: 0.15 }}
        className="flex-shrink-0"
      >
        <ChevronRight className="w-4 h-4" style={{ color: m.color }} />
      </motion.div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function ArsenalStudioView({ open, onClose, onLaunch }: ArsenalStudioViewProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedMod, setSelectedMod] = useState<ArsenalModule | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Focus search on open ────────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedCategory("all");
      setTimeout(() => searchRef.current?.focus(), 120);
    }
  }, [open]);

  /* ── Keyboard close ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ── Filter modules ──────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let mods = ARSENAL_MODULES;

    // Category filter
    if (selectedCategory !== "all") {
      mods = mods.filter((m) => getCategory(m.tag).label === selectedCategory);
    }

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      mods = mods.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q) ||
          m.desc.toLowerCase().includes(q) ||
          m.tag.toLowerCase().includes(q) ||
          m.source.toLowerCase().includes(q)
      );
    }

    return mods;
  }, [query, selectedCategory]);

  const handleSelectDetail = useCallback(
    (mod: ArsenalModule) => {
      setSelectedMod(mod);
    },
    []
  );

  /* ── Render ──────────────────────────────────────────────────────────── */
  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="arsenal-studio"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[150] flex flex-col"
          style={{ background: "#060606" }}
        >
          {/* ── Top bar ──────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 sm:px-6 flex-shrink-0"
            style={{
              height: 56,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(8,8,8,0.95)",
            }}
          >
            {/* Title */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}
              >
                <LayoutGrid className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>
                  Arsenal
                </div>
                <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(226,18,39,0.7)" }}>
                  Studio Hub
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${ARSENAL_MODULES.length} modules…`}
                className="w-full rounded-xl py-2 pl-9 pr-4 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.88)",
                  caretColor: "#e21227",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(226,18,39,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(226,18,39,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Results count */}
            {query && (
              <span className="text-[11px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                {filtered.length} results
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* View toggle */}
            <div
              className="flex items-center rounded-lg p-1 flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {(["grid", "list"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="p-1.5 rounded-md transition-all"
                  style={{
                    background: viewMode === mode ? "rgba(226,18,39,0.15)" : "transparent",
                    color: viewMode === mode ? "#e21227" : "rgba(255,255,255,0.35)",
                  }}
                  title={mode === "grid" ? "Grid view" : "List view"}
                >
                  {mode === "grid" ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── Category sidebar ─────────────────────────────────────── */}
            <motion.aside
              initial={false}
              animate={{ width: sidebarCollapsed ? 56 : 220 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              className="flex-shrink-0 flex flex-col overflow-hidden"
              style={{
                borderRight: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(8,8,8,0.6)",
              }}
            >
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="flex items-center justify-center w-full py-3 transition-all flex-shrink-0"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Category list */}
              <nav className="flex-1 overflow-y-auto studio-scroll py-2 px-2">
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    >
                      Categories
                    </motion.div>
                  )}
                </AnimatePresence>

                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all mb-0.5 text-left overflow-hidden"
                      style={{
                        background: isActive ? `${cat.color}14` : "transparent",
                        border: `1px solid ${isActive ? `${cat.color}30` : "transparent"}`,
                        color: isActive ? cat.color : "rgba(255,255,255,0.45)",
                        minHeight: 36,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                        }
                      }}
                      title={sidebarCollapsed ? cat.label : undefined}
                    >
                      <cat.icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? cat.color : "inherit" }} />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex-1 flex items-center justify-between gap-1 overflow-hidden"
                          >
                            <span className="text-xs font-medium truncate">{cat.label}</span>
                            <span
                              className="text-[10px] font-mono flex-shrink-0"
                              style={{ color: isActive ? cat.color : "rgba(255,255,255,0.2)" }}
                            >
                              {cat.count}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </nav>
            </motion.aside>

            {/* ── Module grid / list ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto studio-scroll min-w-0">
              {/* Stats bar */}
              <div
                className="flex items-center gap-4 px-6 py-3 sticky top-0 z-10 flex-shrink-0"
                style={{
                  background: "rgba(6,6,6,0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold" style={{ color: "#e21227" }}>
                    {filtered.length}
                  </span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {selectedCategory === "all" ? "modules" : CATEGORIES.find(c => c.id === selectedCategory)?.label ?? "modules"}
                    {query && ` matching "${query}"`}
                  </span>
                </div>

                {/* Category chips */}
                {!query && selectedCategory !== "all" && (
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
                    style={{
                      background: "rgba(226,18,39,0.1)",
                      border: "1px solid rgba(226,18,39,0.25)",
                      color: "#e21227",
                    }}
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {["AI AGENT", "SECURITY", "OSINT"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const cat = getCategory(tag);
                        setSelectedCategory(cat.label);
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {ARSENAL_MODULES.filter((m) => m.tag === tag).length}{" "}
                      {tag.toLowerCase().replace("ai ", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Search className="w-12 h-12" style={{ color: "rgba(255,255,255,0.07)" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                      No modules match "{query}"
                    </p>
                    <button
                      onClick={() => setQuery("")}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                    >
                      Clear search
                    </button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {filtered.map((m, i) => (
                      <ModuleCardGrid key={m.id} module={m} onLaunch={handleSelectDetail} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-w-4xl">
                    {filtered.map((m, i) => (
                      <ModuleRowList key={m.id} module={m} onLaunch={handleSelectDetail} index={i} />
                    ))}
                  </div>
                )}

                {/* Bottom padding for mobile nav */}
                <div className="h-20 md:hidden" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const portal = createPortal(content, document.body);

  return (
    <>
      {portal}
      {selectedMod && (
        <ToolDetailView
          module={selectedMod}
          isEnabled={true}
          onClose={() => setSelectedMod(null)}
          onLaunch={(id) => { onLaunch(id); onClose(); }}
        />
      )}
    </>
  );
}
