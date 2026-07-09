/**
 * MainAgentControl — ON/OFF toggle + Model Switcher for Main AI Agent
 * Persists state to backend. Compact widget suitable for TopBar or Sidebar.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, ToggleLeft, ToggleRight, ChevronDown,
  Loader2, CheckCircle2, Zap,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

const QUICK_MODELS = [
  { id: "glm-5.2",                    label: "GLM-5.2",        color: "#06b6d4" },
  { id: "glm-5.1",                    label: "GLM-5.1",        color: "#22d3ee" },
  { id: "glm-5",                      label: "GLM-5",          color: "#22d3ee" },
  { id: "glm-4-plus",                 label: "GLM-4+",         color: "#22d3ee" },
  { id: "gpt-4o",                     label: "GPT-4o",         color: "#10b981" },
  { id: "gpt-4o-mini",                label: "GPT-4o Mini",    color: "#10b981" },
  { id: "claude-opus-4-5",            label: "Claude Opus",    color: "#8b5cf6" },
  { id: "claude-sonnet-4-5",          label: "Claude Sonnet",  color: "#8b5cf6" },
  { id: "gemini-2.5-pro",             label: "Gemini 2.5 Pro", color: "#f97316" },
  { id: "deepseek-r1",                label: "DeepSeek R1",    color: "#e21227" },
  { id: "o3",                         label: "o3 Reasoning",   color: "#fbbf24" },
  { id: "llama-3.3-70b-instruct",     label: "Llama 3.3 70B", color: "#6b7280" },
];

interface MainAgentState {
  enabled: boolean;
  model: string;
  fallbackModel: string;
}

interface Props {
  compact?: boolean;
  className?: string;
}

export function MainAgentControl({ compact = false, className = "" }: Props) {
  const [state, setState] = useState<MainAgentState>({ enabled: false, model: "gpt-4o", fallbackModel: "gpt-3.5-turbo" });
  const [loading, setLoading] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [synced, setSynced] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authFetch("/api/main-agent/state")
      .then(r => r.json())
      .then(d => { setState(d); setSynced(true); })
      .catch(() => setSynced(true));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const patch = useCallback(async (patch: Partial<MainAgentState>) => {
    setLoading(true);
    try {
      const res = await authFetch("/api/main-agent/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      setState(d);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  const currentModel = QUICK_MODELS.find(m => m.id === state.model);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => patch({ enabled: !state.enabled })}
          disabled={loading || !synced}
          title={state.enabled ? "Main Agent: ON — انقر للإيقاف" : "Main Agent: OFF — انقر للتفعيل"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            state.enabled
              ? "bg-[#e21227]/15 text-[#e21227] border-[#e21227]/30 hover:bg-[#e21227]/25"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
          }`}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : state.enabled ? (
            <ToggleRight className="w-3.5 h-3.5" />
          ) : (
            <ToggleLeft className="w-3.5 h-3.5" />
          )}
          <Bot className="w-3 h-3" />
          {state.enabled ? "ON" : "OFF"}
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`} ref={dropRef}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${state.enabled ? "bg-[#e21227]/20 border border-[#e21227]/30" : "bg-white/5 border border-white/10"}`}>
          <Bot className={`w-3.5 h-3.5 ${state.enabled ? "text-[#e21227]" : "text-white/40"}`} />
        </div>
        <div>
          <div className="text-xs font-bold text-white">Main AI Agent</div>
          <div className="text-[10px] text-white/40">وكيل ذكي مستقل</div>
        </div>
        <div className="flex-1" />
        {state.enabled && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/20"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[10px] text-[#10b981] font-bold">ACTIVE</span>
          </motion.div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => patch({ enabled: !state.enabled })}
        disabled={loading || !synced}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all border ${
          state.enabled
            ? "bg-[#e21227]/15 text-[#e21227] border-[#e21227]/30 hover:bg-[#e21227]/25"
            : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state.enabled ? (
          <><ToggleRight className="w-4 h-4" /> Agent مفعّل</>
        ) : (
          <><ToggleLeft className="w-4 h-4" /> تفعيل Agent</>
        )}
      </button>

      {/* Mode description */}
      <div className={`mt-2 px-3 py-2 rounded-lg text-[10px] leading-relaxed ${
        state.enabled
          ? "bg-[#e21227]/10 text-[#e21227]/80 border border-[#e21227]/15"
          : "bg-white/3 text-white/35 border border-white/8"
      }`}>
        {state.enabled
          ? "✅ تخطيط تلقائي · تنفيذ أدوات · ذاكرة متطورة · إصلاح الأخطاء التلقائي"
          : "⚪ وضع المساعد العادي — ردود مباشرة فقط"}
      </div>

      {/* Model selector */}
      <div className="mt-3 relative">
        <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5 flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" />
          النموذج الرئيسي
        </div>
        <button
          onClick={() => setModelOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/10 hover:border-white/20 transition text-xs"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentModel?.color ?? "#6b7280" }}
            />
            <span className="text-white/70">{currentModel?.label ?? state.model}</span>
          </div>
          <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {modelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-[18px] border border-white/10 bg-black/95 shadow-2xl overflow-hidden"
            >
              {QUICK_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { patch({ model: m.id }); setModelOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className={state.model === m.id ? "text-white font-medium" : "text-white/55"}>{m.label}</span>
                  {state.model === m.id && <CheckCircle2 className="w-3 h-3 ml-auto text-[#e21227]" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fallback model indicator */}
      <div className="mt-2 text-[10px] text-white/25 text-center">
        Fallback: {state.fallbackModel}
      </div>
    </div>
  );
}
