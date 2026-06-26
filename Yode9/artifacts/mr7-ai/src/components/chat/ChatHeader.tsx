import { Trash2, Download, Share2, FileCode } from "lucide-react";
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

export function ChatHeader({
  chat, totalTokens, showTokenMeter, activePersona,
  onClear, onExportMd, onExportJson, onExportPdf, onShare,
}: ChatHeaderProps) {
  return (
    <div
      className="h-10 flex items-center justify-between px-4 relative"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(8,8,12,0.8)" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.25) 50%, transparent)" }}
      />
      <div className="text-[11px] truncate flex items-center gap-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        <span className="font-mono font-bold text-white/60 truncate max-w-[180px]">{chat.title}</span>
        <span style={{ color: "rgba(226,18,39,0.4)" }}>·</span>
        <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{chat.messages.length} msgs</span>
        {showTokenMeter && (
          <>
            <span style={{ color: "rgba(226,18,39,0.4)" }}>·</span>
            <span className="font-mono text-[10px]" style={{ color: "#10b981", textShadow: "0 0 6px rgba(16,185,129,0.5)" }}>
              ~{totalTokens.toLocaleString()} tok
            </span>
          </>
        )}
        {activePersona && (
          <>
            <span style={{ color: "rgba(226,18,39,0.4)" }}>·</span>
            <span className="font-mono text-[10px]" style={{ color: "#e21227" }}>{activePersona}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#e21227"; e.currentTarget.style.background = "rgba(226,18,39,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}
          aria-label="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}
              aria-label="Export"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-card border-border">
            <DropdownMenuItem onSelect={onExportMd}><FileCode className="w-4 h-4" /> Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportJson}><FileCode className="w-4 h-4" /> JSON (.json)</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExportPdf}><FileCode className="w-4 h-4" /> Print / PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={onShare}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}
          aria-label="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
