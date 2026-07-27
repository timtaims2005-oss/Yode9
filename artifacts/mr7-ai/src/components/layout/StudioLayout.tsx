/**
 * StudioLayout — Modern AGI Studio wrapper
 *
 * Provides the outer shell: collapsible sidebar slot, persistent top context
 * bar, and expansive WorkspaceArea. Drop-in replacement for the flat flex div
 * in App.tsx without touching internal component state.
 *
 * Usage:
 *   <StudioLayout
 *     sidebar={<Sidebar ... />}
 *     topBar={<TopBar ... />}
 *     bottomBar={<MobileBottomNav ... />}
 *     sidebarCollapsed={collapsed}
 *   >
 *     {children}   ← ChatView, Arsenal, etc.
 *   </StudioLayout>
 */

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StudioLayoutProps {
  /** Left navigation sidebar element */
  sidebar?: React.ReactNode;
  /** Top context bar element */
  topBar?: React.ReactNode;
  /** System status footer — shown on all screen sizes above bottomBar */
  lowBar?: React.ReactNode;
  /** Bottom navigation (mobile only) */
  bottomBar?: React.ReactNode;
  /** Whether the sidebar is in collapsed icon-only mode */
  sidebarCollapsed?: boolean;
  /** Whether the mobile drawer is open */
  sidebarOpen?: boolean;
  /** Whether the sidebar is rendered at all (on mobile, only the drawer) */
  hideSidebarOnMobile?: boolean;
  /** Main workspace content */
  children: React.ReactNode;
  /** Extra className for the workspace area */
  workspaceClassName?: string;
}

export function StudioLayout({
  sidebar,
  topBar,
  lowBar,
  bottomBar,
  sidebarCollapsed = false,
  sidebarOpen = false,
  hideSidebarOnMobile = true,
  children,
  workspaceClassName = "",
}: StudioLayoutProps) {
  const sidebarW = sidebarCollapsed
    ? "var(--studio-sidebar-collapsed)"
    : "var(--studio-sidebar-width)";

  return (
    <div
      className="studio-layout flex h-[100dvh] w-full overflow-hidden text-foreground selection:bg-primary/30 dark relative"
      style={{ zIndex: 1 }}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
    >
      {/* ── Sidebar (desktop persistent) ──────────────────────────────────── */}
      {sidebar && (
        <motion.aside
          className="studio-sidebar hidden md:flex flex-col flex-shrink-0 relative z-10"
          initial={false}
          animate={{ width: sidebarW }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          style={{ minWidth: sidebarW, maxWidth: sidebarW, willChange: "width" }}
        >
          {sidebar}
        </motion.aside>
      )}

      {/* ── Main workspace ─────────────────────────────────────────────────── */}
      <div
        className={`studio-workspace flex-1 flex flex-col min-w-0 h-full relative overflow-hidden ${workspaceClassName}`}
      >
        {/* Top bar */}
        {topBar && (
          <header className="studio-topbar flex-shrink-0 relative z-10" style={{ height: "var(--studio-topbar-height)" }}>
            {topBar}
          </header>
        )}

        {/* Content area */}
        <main className="studio-content flex-1 min-h-0 overflow-hidden relative">
          {children}
        </main>

        {/* Low bar — system status footer (desktop only; mobile version lives
            inside LowBar itself anchored above the mobile nav) */}
        {lowBar && (
          <div className="flex-shrink-0 studio-lowbar-slot">
            {lowBar}
          </div>
        )}

        {/* Mobile spacer — reserves the exact height of the fixed MobileBottomNav
            (60 px + device safe-area-inset-bottom) so no content is ever obscured
            by the nav bar. Invisible on md+ where the nav is hidden. */}
        <div
          className="md:hidden flex-shrink-0 pointer-events-none"
          style={{ height: "calc(60px + env(safe-area-inset-bottom, 0px))" }}
        />

        {/* Bottom bar slot (mobile only) — MobileBottomNav is self-fixed so this
            div contributes no additional layout height; it just mounts the nav. */}
        {bottomBar && (
          <div className="md:hidden studio-bottom-nav">
            {bottomBar}
          </div>
        )}
      </div>
    </div>
  );
}

/** Thin divider between sidebar and workspace — optional decorative border */
export function StudioSidebarDivider() {
  return (
    <div
      className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
      style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.25) 30%, rgba(255,255,255,0.06) 60%, transparent 100%)",
      }}
    />
  );
}

/** Context bar — shown below topBar when a project / mode is active */
export function StudioContextBar({
  children,
  color = "#e21227",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-medium flex-shrink-0"
      style={{
        background: `${color}0d`,
        borderBottom: `1px solid ${color}22`,
        color: color,
      }}
    >
      {children}
    </motion.div>
  );
}

/** WorkspaceArea — a split-pane or tabbed workspace for tools */
export function WorkspaceArea({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`workspace-area w-full h-full flex flex-col overflow-hidden relative studio-scroll ${className}`}
    >
      {children}
    </div>
  );
}

/** Workspace split pane — side by side panels */
export function WorkspaceSplitPane({
  left,
  right,
  leftWidth = "50%",
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
}) {
  return (
    <div className="flex w-full h-full overflow-hidden">
      <div
        className="flex-shrink-0 h-full overflow-auto studio-scroll"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      <div
        className="flex-shrink-0 w-px"
        style={{ background: "var(--surface-border)" }}
      />
      <div className="flex-1 h-full overflow-auto studio-scroll min-w-0">
        {right}
      </div>
    </div>
  );
}

/** Workspace tabs */
export function WorkspaceTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab strip */}
      <div
        className="flex items-center gap-1 px-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--surface-border)",
          background: "var(--surface-raised)",
          minHeight: 40,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-all relative"
            style={{
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              background: activeTab === tab.id ? "var(--surface-card)" : "transparent",
              borderBottom: activeTab === tab.id ? "2px solid var(--mr7-red)" : "2px solid transparent",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto studio-scroll min-h-0">
        {children}
      </div>
    </div>
  );
}
