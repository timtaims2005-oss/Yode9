import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitMerge, X, ChevronUp, ChevronDown, Copy, CheckCheck,
  Trash2, ArrowRight, Database, Terminal, Bot, Code2,
} from "lucide-react";
import { pipeline, type PipelineItem } from "@/lib/pipeline";

interface PipelineHUDProps {
  onSendToRag: (item: PipelineItem) => void;
  onSendToCLI: (item: PipelineItem) => void;
  onSendToAgent: (item: PipelineItem) => void;
  onSendToIDE: (item: PipelineItem) => void;
}

export function PipelineHUD({ onSendToRag, onSendToCLI, onSendToAgent, onSendToIDE }: PipelineHUDProps) {
  const [items, setItems] = useState<PipelineItem[]>(() => pipeline.getItems());
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const unsub = pipeline.subscribe(() => {
      const next = pipeline.getItems();
      setItems(next);
      if (next.length > 0) {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
    });
    return unsub;
  }, []);

  function copy(item: PipelineItem) {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function route(item: PipelineItem, destination: string, destColor: string, cb: (i: PipelineItem) => void) {
    pipeline.recordRoute(item.id, destination, destColor);
    cb(item);
    pipeline.remove(item.id);
  }

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-20 right-4 z-40 w-72 rounded-2xl overflow-hidden"
      style={{
        background: "#0d0d0d",
        border: `1px solid ${flash ? "rgba(0,229,204,0.6)" : "rgba(0,229,204,0.25)"}`,
        boxShadow: flash
          ? "0 0 30px rgba(0,229,204,0.3), 0 8px 32px rgba(0,0,0,0.8)"
          : "0 0 20px rgba(0,229,204,0.1), 0 8px 32px rgba(0,0,0,0.7)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        style={{ background: "rgba(0,229,204,0.06)", borderBottom: "1px solid rgba(0,229,204,0.12)" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,229,204,0.12)", border: "1px solid rgba(0,229,204,0.3)" }}
          >
            <GitMerge className="w-3.5 h-3.5" style={{ color: "#00e5cc" }} />
          </div>
          <span className="text-[11px] font-black tracking-wider" style={{ color: "#00e5cc" }}>
            PIPELINE
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(0,229,204,0.15)", color: "#00e5cc" }}
          >
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); pipeline.clear(); }}
            className="p-1 rounded transition-colors"
            style={{ color: "#333" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
            title="Clear all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" style={{ color: "#00e5cc" }} />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" style={{ color: "#00e5cc" }} />
          )}
        </div>
      </div>

      {/* Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="px-3 py-2.5 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.05)", background: idx === 0 ? "rgba(0,229,204,0.03)" : "transparent" }}
                >
                  {/* Source badge + time */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.sourceColor }} />
                      <span className="text-[9px] font-bold font-mono" style={{ color: item.sourceColor }}>
                        {item.source}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: "#333" }}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono" style={{ color: "#333" }}>{item.timestamp}</span>
                      <button
                        onClick={() => pipeline.remove(item.id)}
                        className="p-0.5 rounded transition-colors"
                        style={{ color: "#333" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content preview */}
                  <div className="text-[10px] font-mono leading-relaxed mb-2 line-clamp-2" style={{ color: "#666", whiteSpace: "pre-wrap" }}>
                    {item.content.slice(0, 140)}{item.content.length > 140 ? "…" : ""}
                  </div>

                  {/* Route buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[8px] font-mono" style={{ color: "#333" }}>SEND TO:</span>
                    <RouteButton icon={Database} label="RAG" color="#3b82f6"
                      onClick={() => route(item, "RAGFlow", "#3b82f6", onSendToRag)}
                      title="Open in RAGFlow as document" />
                    <RouteButton icon={Terminal} label="CLI" color="#818cf8"
                      onClick={() => route(item, "Gemini CLI", "#818cf8", onSendToCLI)}
                      title="Inject into Gemini CLI context" />
                    <RouteButton icon={Bot} label="Agent" color="#ff4d4d"
                      onClick={() => route(item, "KaliAgent", "#ff4d4d", onSendToAgent)}
                      title="Pre-fill KaliAgent task" />
                    <RouteButton icon={Code2} label="IDE" color="#a78bfa"
                      onClick={() => route(item, "OpenGravity IDE", "#a78bfa", onSendToIDE)}
                      title="Inject into OpenGravity IDE" />
                    <button
                      onClick={() => copy(item)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#555" }}
                    >
                      {copiedId === item.id
                        ? <CheckCheck className="w-2.5 h-2.5" style={{ color: "#4ade80" }} />
                        : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-[9px] font-mono" style={{ color: "#333" }}>
                <ArrowRight className="w-2.5 h-2.5 inline mr-1" style={{ color: "#00e5cc" }} />
                Route output from any module to another
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RouteButton({
  icon: Icon,
  label,
  color,
  onClick,
  title,
}: {
  icon: typeof Database;
  label: string;
  color: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all"
      style={{ background: `${color}10`, borderColor: `${color}30`, color }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}20`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}60`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}10`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
    >
      <Icon className="w-2.5 h-2.5" style={{ width: 10, height: 10 }} />
      {label}
    </button>
  );
}
