/**
 * ArsenalPage — Full-screen standalone route at /arsenal
 *
 * The Arsenal Hub lives as a proper route, not a modal.
 * ArsenalStudioView handles the module browser.
 * ArsenalFullPage handles individual module deep-dives.
 */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ArsenalStudioView } from "@/components/views/ArsenalStudioView";
import { ArsenalFullPage } from "@/components/ArsenalFullPage";
import { AITerminal } from "@/components/AITerminal";
import type { ArsenalModuleId } from "@/components/modals/ArsenalHubModal";

export default function ArsenalPage() {
  const [, navigate] = useLocation();
  const [activeModule, setActiveModule] = useState<ArsenalModuleId | "ai-terminal" | null>(null);
  // Track whether a launch is in progress so onClose (called right after onLaunch
  // by ArsenalStudioView) doesn't navigate away.
  const launchingRef = useRef(false);

  const handleLaunch = useCallback((id: ArsenalModuleId) => {
    launchingRef.current = true;
    setActiveModule(id);
  }, []);

  // Called by ArsenalStudioView after launching, or on Escape / close button.
  const handleClose = useCallback(() => {
    if (launchingRef.current) {
      launchingRef.current = false;
      return; // module just launched — don't navigate
    }
    navigate("/app");
  }, [navigate]);

  const handleBack = useCallback(() => {
    setActiveModule(null);
  }, []);

  // ── Individual module overlay ──────────────────────────────────────────────
  if (activeModule === "ai-terminal") {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <AITerminal onBack={handleBack} />
      </div>
    );
  }

  if (activeModule) {
    return (
      <div className="fixed inset-0 z-50">
        <ArsenalFullPage moduleId={activeModule} onBack={handleBack} />
      </div>
    );
  }

  // ── Module browser ─────────────────────────────────────────────────────────
  return (
    <ArsenalStudioView
      open={true}
      onClose={handleClose}
      onLaunch={handleLaunch}
    />
  );
}
