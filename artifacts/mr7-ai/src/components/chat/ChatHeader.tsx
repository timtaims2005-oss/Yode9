import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Download, Share2, FileCode, Shield, Zap, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Chat } from "@/lib/store";

interface ChatHeaderProps {
  chat: Chat;
  totalTokens: number;
  showTokenMeter: boolean;
  activePersona: string | null | undefined;
  onClear: () => void;
  onExportMd: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onShare: () => void;
}

function usePulse(interval = 2200) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(v => v + 1), interval);
    return () => clearInterval(iv);
  }, [interval]);
  return tick;
}

export function ChatHeader({
  chat, totalTokens, showTokenMeter, activePersona,
  onClear, onExportMd, onExportJson, onExportPdf, onShare,
}: ChatHeaderProps) {
  const [hovBtn, setHovBtn] = useState<string | null>(null);
  const tick = usePulse();
  void tick;

  return (
    <div className="relative flex-shrink-0" style={{ zIndex: 20 }}>
      {/* ── 5D depth layer — bottom glow ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(226,18,39,0.03) 0%, transparent 100%)",
        }} />

      {/* ── Scan line sweep ───────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
          style={{
            position: "absolute", top: 0, bottom: 0, width: "20%",
            background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.06), rgba(0,229,255,0.04), transparent)",
          }}
        />
      </div>

      {/* ── Main bar ──────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-between px-3"
        style={{
          height: "40px",
          background: "linear-gradient(180deg, rgba(8,6,18,0.97) 0%, rgba(6,4,14,0.97) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Corner HUD brackets */}
        <div className="absolute top-1.5 left-1.5 w-2 h-2 pointer-events-none"
          style={{ borderTop: "1px solid rgba(226,18,39,0.4)", borderLeft: "1px solid rgba(226,18,39,0.4)" }} />
        <div className="absolute bottom-1.5 right-1.5 w-2 h-2 pointer-events-none"
          style={{ borderBottom: "1px solid rgba(0,229,255,0.3)", borderRight: "1px solid rgba(0,229,255,0.3)" }} />

        {/* ── LEFT: session identity ─────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Status orb */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ background: "#e21227", boxShadow: "0 0 6px #e21227, 0 0 12px rgba(226,18,39,0.4)" }}
          />

          {/* KaliGPT label */}
          <span className="font-mono font-black text-[7px] tracking-[0.3em] flex-shrink-0"
            style={{ color: "rgba(226,18,39,0.6)" }}>KALIGPT</span>

          {/* Separator */}
          <div className="w-px h-3 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* Chat title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield style={{ width: "9px", height: "9px", color: "rgba(226,18,39,0.5)", flexShrink: 0 }} />
            <span className="font-mono font-bold text-[10px] truncate max-w-[160px]"
              style={{ color: "rgba(255,255,255,0.7)" }}>{chat.title}</span>
          </div>

          {/* Meta chips */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Message count */}
            <div className="flex items-center gap-0.5 px-1.5 rounded"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Activity style={{ width: "7px", height: "7px", color: "rgba(255,255,255,0.3)" }} />
              <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {chat.messages.length}
              </span>
            </div>

            {/* Token meter */}
            <AnimatePresence>
              {showTokenMeter && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-0.5 px-1.5 rounded"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <Zap style={{ width: "7px", height: "7px", color: "#10b981" }} />
                  <span className="font-mono text-[8px] font-bold"
                    style={{ color: "#10b981", textShadow: "0 0 6px rgba(16,185,129,0.5)" }}>
                    ~{totalTokens.toLocaleString()}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active persona */}
            <AnimatePresence>
              {activePersona && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center gap-0.5 px-1.5 rounded"
                  style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.25)" }}
                >
                  <motion.div className="w-1 h-1 rounded-full"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ background: "#e21227" }} />
                  <span className="font-mono text-[8px] font-bold"
                    style={{ color: "#e21227" }}>{activePersona}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT: action buttons ──────────────────────────── */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Clear */}
          <motion.button
            onClick={onClear}
            onMouseEnter={() => setHovBtn("clear")}
            onMouseLeave={() => setHovBtn(null)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{
              width: "26px", height: "26px",
              background: hovBtn === "clear" ? "rgba(226,18,39,0.12)" : "transparent",
              border: hovBtn === "clear" ? "1px solid rgba(226,18,39,0.3)" : "1px solid transparent",
              color: hovBtn === "clear" ? "#e21227" : "rgba(255,255,255,0.3)",
            }}
            aria-label="Clear chat"
          >
            <Trash2 style={{ width: "12px", height: "12px" }} />
          </motion.button>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                onMouseEnter={() => setHovBtn("export")}
                onMouseLeave={() => setHovBtn(null)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center justify-center rounded-lg transition-all"
                style={{
                  width: "26px", height: "26px",
                  background: hovBtn === "export" ? "rgba(255,255,255,0.07)" : "transparent",
                  border: "1px solid transparent",
                  color: hovBtn === "export" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                }}
                aria-label="Export"
              >
                <Download style={{ width: "12px", height: "12px" }} />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-card border-border">
              <DropdownMenuItem onSelect={onExportMd}><FileCode className="w-4 h-4" /> Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onSelect={onExportJson}><FileCode className="w-4 h-4" /> JSON (.json)</DropdownMenuItem>
              <DropdownMenuItem onSelect={onExportPdf}><FileCode className="w-4 h-4" /> Print / PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share */}
          <motion.button
            onClick={onShare}
            onMouseEnter={() => setHovBtn("share")}
            onMouseLeave={() => setHovBtn(null)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{
              width: "26px", height: "26px",
              background: hovBtn === "share" ? "rgba(255,255,255,0.07)" : "transparent",
              border: "1px solid transparent",
              color: hovBtn === "share" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
            }}
            aria-label="Share"
          >
            <Share2 style={{ width: "12px", height: "12px" }} />
          </motion.button>
        </div>
      </div>

      {/* ── Bottom accent glow ────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.3) 40%, rgba(0,229,255,0.2) 70%, transparent)" }} />

      {/* ── 5D parallax depth bars ────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ height: "3px" }}>
        <motion.div className="h-full w-full"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.12) 30%, rgba(139,92,246,0.08) 60%, transparent)" }}
        />
      </div>
    </div>
  );
}
