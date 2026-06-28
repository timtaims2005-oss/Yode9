import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronDown, ChevronUp, X, CheckCircle2,
  XCircle, Zap, Terminal, Layers, Palette,
  Shield, Bot, Settings2, Eye, EyeOff,
} from "lucide-react";
import type { AIActionResult } from "../lib/AIController";
import { TOOL_REGISTRY } from "../lib/AIController";

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  modal:    Layers,
  persona:  Bot,
  theme:    Palette,
  model:    Settings2,
  security: Shield,
  ui:       Eye,
};

const CATEGORY_COLOR: Record<string, string> = {
  modal:    "#00e5ff",
  persona:  "#a855f7",
  theme:    "#f97316",
  model:    "#4ade80",
  security: "#e21227",
  ui:       "#fbbf24",
};

const CATEGORY_AR: Record<string, string> = {
  modal:    "النوافذ",
  persona:  "الشخصية",
  theme:    "الثيم",
  model:    "النموذج",
  security: "الأمان",
  ui:       "الواجهة",
};

interface ActionEntry {
  id: string;
  results: AIActionResult[];
  ts: number;
}

export function AIControllerHUD({ enabled, onToggle }: Props) {
  const [entries, setEntries] = useState<ActionEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const results = (e as CustomEvent<AIActionResult[]>).detail;
      if (!results || results.length === 0) return;
      const entry: ActionEntry = { id: String(Date.now()), results, ts: Date.now() };
      setEntries(prev => [entry, ...prev].slice(0, 20));
      setExpanded(true);
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    };
    window.addEventListener("kali:ai-actions", handler);
    return () => window.removeEventListener("kali:ai-actions", handler);
  }, []);

  const clearHistory = useCallback(() => { setEntries([]); setExpanded(false); }, []);

  const grouped = TOOL_REGISTRY.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, typeof TOOL_REGISTRY>);

  return (
    <div className="fixed bottom-20 right-4 z-[9000] flex flex-col items-end gap-2 pointer-events-none select-none">
      {/* ── Tools Reference Panel ─── */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto w-[340px] max-h-[60vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col"
            style={{ background: "rgba(5,8,14,0.97)", borderColor: "rgba(0,229,255,0.2)", backdropFilter: "blur(24px)", boxShadow: "0 0 40px rgba(0,229,255,0.1)" }}>

            <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0" style={{ borderColor: "rgba(0,229,255,0.12)" }}>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-mono font-bold text-white tracking-widest">TOOL REGISTRY</span>
                <span className="text-[8px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{TOOL_REGISTRY.length} أمر</span>
              </div>
              <button onClick={() => setShowTools(false)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,229,255,0.2) transparent" }}>
              {Object.entries(grouped).map(([cat, tools]) => {
                const Icon = CATEGORY_ICON[cat] ?? Zap;
                const color = CATEGORY_COLOR[cat] ?? "#00e5ff";
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                      <Icon className="w-3 h-3" style={{ color }} />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color }}>{CATEGORY_AR[cat] ?? cat}</span>
                      <div className="flex-1 h-px" style={{ background: `${color}20` }} />
                    </div>
                    {tools.map(tool => (
                      <div key={tool.id} className="px-2 py-1.5 rounded-lg mb-0.5 hover:bg-white/4 transition-colors">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <code className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: `${color}15`, color }}>{tool.id}</code>
                        </div>
                        <p className="text-[9px] font-mono text-white/50 leading-tight">{tool.descriptionAr}</p>
                        {tool.params && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(tool.params).map(([k, v]) => (
                              <span key={k} className="text-[7px] font-mono px-1 py-0.5 rounded bg-white/5 text-white/30">
                                {k}{v.required ? "*" : "?"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action History Panel ─── */}
      <AnimatePresence>
        {expanded && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="pointer-events-auto w-[300px] max-h-[40vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col"
            style={{ background: "rgba(5,8,14,0.95)", borderColor: "rgba(168,85,247,0.25)", backdropFilter: "blur(20px)" }}>

            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "rgba(168,85,247,0.12)" }}>
              <div className="flex items-center gap-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="text-[9px] font-mono font-bold text-purple-300 tracking-widest">AI ACTIONS</span>
                <span className="text-[8px] font-mono text-white/25 bg-white/5 px-1 py-0.5 rounded">{entries.reduce((s, e) => s + e.results.length, 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearHistory} className="text-[8px] font-mono text-white/25 hover:text-white/50 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">مسح</button>
                <button onClick={() => setExpanded(false)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded text-white/30 hover:text-white/60">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(168,85,247,0.2) transparent" }}>
              <AnimatePresence initial={false}>
                {entries.map((entry, ei) => (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl border p-2.5 space-y-1.5"
                    style={{ borderColor: ei === 0 ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.05)", background: ei === 0 ? "rgba(168,85,247,0.06)" : "rgba(0,0,0,0.3)" }}>
                    <div className="text-[7px] font-mono text-white/20">{new Date(entry.ts).toLocaleTimeString()}</div>
                    {entry.results.map((r, ri) => {
                      const tool = TOOL_REGISTRY.find(t => t.id === r.action);
                      const color = CATEGORY_COLOR[tool?.category ?? "ui"] ?? "#00e5ff";
                      return (
                        <div key={ri} className="flex items-start gap-2">
                          {r.success
                            ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
                            : <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <code className="text-[7px] font-mono px-1 rounded" style={{ background: `${color}15`, color }}>{r.action}</code>
                            </div>
                            <p className="text-[8px] font-mono text-white/50 mt-0.5 leading-tight">{r.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Controller Button ─── */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* History toggle (only if has entries) */}
        {entries.length > 0 && !expanded && (
          <motion.button onClick={() => setExpanded(true)}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-mono font-bold"
            style={{ background: "rgba(168,85,247,0.15)", borderColor: "rgba(168,85,247,0.4)", color: "#a855f7" }}>
            <ChevronUp className="w-3 h-3" />
            {entries.reduce((s, e) => s + e.results.length, 0)} إجراء
          </motion.button>
        )}

        {/* Tools reference */}
        <motion.button onClick={() => setShowTools(v => !v)}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all"
          style={{
            background: showTools ? "rgba(0,229,255,0.2)" : "rgba(5,8,14,0.9)",
            borderColor: showTools ? "rgba(0,229,255,0.5)" : "rgba(0,229,255,0.2)",
            boxShadow: showTools ? "0 0 16px rgba(0,229,255,0.3)" : "none",
          }}>
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
        </motion.button>

        {/* Main controller toggle */}
        <motion.button onClick={onToggle}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          animate={pulse ? { scale: [1, 1.3, 1], boxShadow: ["0 0 0px rgba(168,85,247,0)", "0 0 30px rgba(168,85,247,0.7)", "0 0 0px rgba(168,85,247,0)"] } : {}}
          className="relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all"
          style={{
            background: enabled ? "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(0,229,255,0.2))" : "rgba(5,8,14,0.9)",
            borderColor: enabled ? "rgba(168,85,247,0.6)" : "rgba(168,85,247,0.25)",
            boxShadow: enabled ? "0 0 20px rgba(168,85,247,0.3)" : "none",
          }}>
          {enabled
            ? <Brain className="w-4 h-4 text-purple-400" />
            : <Bot className="w-4 h-4 text-white/30" />
          }
          {enabled && (
            <motion.div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }} />
          )}
        </motion.button>
      </div>

      {/* ── Enabled indicator toast ─── */}
      <AnimatePresence>
        {enabled && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} transition={{ delay: 0.3 }}
            className="pointer-events-none absolute bottom-12 right-0 px-3 py-1.5 rounded-xl border text-[9px] font-mono font-bold whitespace-nowrap"
            style={{ background: "rgba(168,85,247,0.15)", borderColor: "rgba(168,85,247,0.4)", color: "#a855f7" }}>
            ⚡ AI Controller نشط — اطلب أي شيء
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
