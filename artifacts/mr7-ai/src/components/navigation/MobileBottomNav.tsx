/**
 * MobileBottomNav — Persistent bottom navigation for mobile & small screens
 *
 * Shows on md:hidden. Provides quick access to Home, Arsenal, Search,
 * Copilot/Agent, and a More menu. Uses the studio design token system.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, LayoutGrid, Search, Bot, MoreHorizontal,
  Brain, Shield, Globe, Zap, X, Settings, Bookmark,
  TrendingUp, Radio, Target, Command,
} from "lucide-react";

type NavTab = "chat" | "arsenal" | "search" | "agent" | "more";

interface MobileBottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onNewChat?: () => void;
  onOpenArsenal?: () => void;
  onOpenSearch?: () => void;
  onOpenAgent?: () => void;
  onOpenSettings?: () => void;
  onOpenMemory?: () => void;
  onOpenBookmarks?: () => void;
  onOpenDeepSearch?: () => void;
  onOpenOsintHub?: () => void;
  onOpenAnalytics?: () => void;
  unreadCount?: number;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "chat",    label: "Chat",    icon: MessageSquare },
  { id: "arsenal", label: "Arsenal", icon: LayoutGrid },
  { id: "search",  label: "Search",  icon: Search },
  { id: "agent",   label: "Agent",   icon: Bot },
  { id: "more",    label: "More",    icon: MoreHorizontal },
];

const MORE_ITEMS = [
  { icon: Brain,       label: "Memory Core",   color: "#a78bfa", action: "memory" },
  { icon: Globe,       label: "OSINT Hub",     color: "#0ea5e9", action: "osint" },
  { icon: TrendingUp,  label: "Analytics",     color: "#22c55e", action: "analytics" },
  { icon: Bookmark,    label: "Bookmarks",     color: "#f59e0b", action: "bookmarks" },
  { icon: Shield,      label: "Deep Search",   color: "#3b82f6", action: "deepSearch" },
  { icon: Settings,    label: "Settings",      color: "#6b7280", action: "settings" },
] as const;

type MoreAction = typeof MORE_ITEMS[number]["action"];

export function MobileBottomNav({
  activeTab = "chat",
  onTabChange,
  onNewChat,
  onOpenArsenal,
  onOpenSearch,
  onOpenAgent,
  onOpenSettings,
  onOpenMemory,
  onOpenBookmarks,
  onOpenDeepSearch,
  onOpenOsintHub,
  onOpenAnalytics,
  unreadCount = 0,
}: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  function handleTab(tab: NavTab) {
    onTabChange?.(tab);
    if (tab === "chat")    { onNewChat?.(); setMoreOpen(false); }
    if (tab === "arsenal") { onOpenArsenal?.(); setMoreOpen(false); }
    if (tab === "search")  { onOpenSearch?.(); setMoreOpen(false); }
    if (tab === "agent")   { onOpenAgent?.(); setMoreOpen(false); }
    if (tab === "more")    { setMoreOpen((v) => !v); }
  }

  function handleMoreAction(action: MoreAction) {
    setMoreOpen(false);
    if (action === "memory")     onOpenMemory?.();
    if (action === "osint")      onOpenOsintHub?.();
    if (action === "analytics")  onOpenAnalytics?.();
    if (action === "bookmarks")  onOpenBookmarks?.();
    if (action === "deepSearch") onOpenDeepSearch?.();
    if (action === "settings")   onOpenSettings?.();
  }

  return (
    <>
      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[190] md:hidden"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              key="more-drawer"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-[191] md:hidden left-4 right-4"
              style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 8px)" }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(12,12,12,0.96)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                    More
                  </span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
                  </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-0">
                  {MORE_ITEMS.map((item, i) => (
                    <button
                      key={item.action}
                      onClick={() => handleMoreAction(item.action)}
                      className="flex flex-col items-center gap-2 p-4 transition-all active:scale-95"
                      style={{
                        borderRight: (i + 1) % 3 !== 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${item.color}18` }}
                      >
                        <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[180] md:hidden"
        style={{
          background: "rgba(8,8,8,0.96)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center" style={{ height: 60 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id || (item.id === "more" && moreOpen);
            return (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative h-full transition-all active:scale-95"
              >
                {/* Active indicator */}
                <AnimatePresence>
                  {isActive && item.id !== "more" && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: "#e21227" }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <div className="relative">
                  <item.icon
                    className="w-5 h-5 transition-colors"
                    style={{
                      color: isActive ? "#e21227" : "rgba(255,255,255,0.4)",
                      strokeWidth: isActive ? 2.5 : 1.8,
                    }}
                  />
                  {/* Badge */}
                  {item.id === "chat" && unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                      style={{ background: "#e21227", color: "#fff" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {item.id === "more" && moreOpen && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: "#e21227" }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: isActive ? "#e21227" : "rgba(255,255,255,0.3)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
