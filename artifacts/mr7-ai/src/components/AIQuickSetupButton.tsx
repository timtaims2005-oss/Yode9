import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { PlanetOrb, hexToRgb } from "./PlanetOrb";
import { Settings, Search, X, Zap, RotateCcw, Check } from "lucide-react";

const KEY_PREFIX = "mr7-ai-p-key-";
const URL_PREFIX = "mr7-ai-p-url-";
const OPEN_STATE_KEY = "mr7-setup-win-open";

interface ProviderDef {
  id: string; name: string; shortName: string; color: string;
  baseURL: string; providerName: ProviderName;
  models: { id: string; label: string; tag: string }[];
  category: string; requiresKey: boolean; badge?: string;
}

const ALL_PROVIDERS: ProviderDef[] = [
  {
    id: "groq", name: "Groq", shortName: "GROQ", color: "#f59e0b",
    baseURL: "https://api.groq.com/openai/v1", providerName: "groq",
    category: "سرعة فائقة", requiresKey: true, badge: "FASTEST",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", tag: "BEST" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", tag: "FAST" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8×7B", tag: "MIX" },
    ],
  },
  {
    id: "openai", name: "OpenAI", shortName: "OAI", color: "#10b981",
    baseURL: "https://api.openai.com/v1", providerName: "openai",
    category: "متعدد الأغراض", requiresKey: true, badge: "GPT-4o",
    models: [
      { id: "gpt-4o", label: "GPT-4o", tag: "BEST" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "FAST" },
      { id: "o1-mini", label: "o1-mini", tag: "THINK" },
    ],
  },
  {
    id: "anthropic", name: "Anthropic", shortName: "CLO", color: "#f97316",
    baseURL: "https://api.anthropic.com/v1", providerName: "anthropic",
    category: "استدلال عميق", requiresKey: true, badge: "Claude",
    models: [
      { id: "claude-sonnet-4-5", label: "Sonnet 4.5", tag: "BEST" },
      { id: "claude-3-5-haiku-latest", label: "Haiku 3.5", tag: "FAST" },
      { id: "claude-opus-4-5", label: "Opus 4.5", tag: "MAX" },
    ],
  },
  {
    id: "gemini", name: "Gemini", shortName: "GEM", color: "#3b82f6",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", providerName: "gemini",
    category: "متعدد الوسائط", requiresKey: true, badge: "2.5",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "BEST" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "PRO" },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", shortName: "OR", color: "#8b5cf6",
    baseURL: "https://openrouter.ai/api/v1", providerName: "openrouter",
    category: "300+ نموذج", requiresKey: true, badge: "300+",
    models: [
      { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", tag: "BEST" },
      { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5", tag: "PRO" },
      { id: "meta-llama/llama-3.3-70b", label: "Llama 3.3 70B", tag: "OPEN" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "DS", color: "#06b6d4",
    baseURL: "https://api.deepseek.com/v1", providerName: "custom",
    category: "استدلال", requiresKey: true,
    models: [
      { id: "deepseek-chat", label: "DeepSeek V3", tag: "BEST" },
      { id: "deepseek-reasoner", label: "DeepSeek R1", tag: "THINK" },
    ],
  },
  {
    id: "xai", name: "xAI Grok", shortName: "GROK", color: "#22d3ee",
    baseURL: "https://api.x.ai/v1", providerName: "custom",
    category: "X.ai", requiresKey: true,
    models: [
      { id: "grok-3", label: "Grok 3", tag: "BEST" },
      { id: "grok-3-mini", label: "Grok 3 Mini", tag: "FAST" },
    ],
  },
  {
    id: "mistral", name: "Mistral AI", shortName: "MIS", color: "#ec4899",
    baseURL: "https://api.mistral.ai/v1", providerName: "custom",
    category: "أوروبي", requiresKey: true,
    models: [
      { id: "mistral-large-latest", label: "Mistral Large", tag: "BEST" },
      { id: "mistral-small-latest", label: "Mistral Small", tag: "FAST" },
    ],
  },
  {
    id: "perplexity", name: "Perplexity", shortName: "PP", color: "#22c55e",
    baseURL: "https://api.perplexity.ai", providerName: "custom",
    category: "بحث ويب", requiresKey: true,
    models: [
      { id: "sonar-pro", label: "Sonar Pro", tag: "BEST" },
      { id: "sonar", label: "Sonar", tag: "FAST" },
    ],
  },
  {
    id: "ollama", name: "Ollama", shortName: "OLL", color: "#10b981",
    baseURL: "http://localhost:11434/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [
      { id: "llama3.2", label: "Llama 3.2", tag: "BEST" },
      { id: "deepseek-r1", label: "DeepSeek R1", tag: "THINK" },
    ],
  },
  {
    id: "lmstudio", name: "LM Studio", shortName: "LMS", color: "#a78bfa",
    baseURL: "http://localhost:1234/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [{ id: "local-model", label: "النموذج المحلي", tag: "LOCAL" }],
  },
  {
    id: "together", name: "Together AI", shortName: "TG", color: "#f43f5e",
    baseURL: "https://api.together.xyz/v1", providerName: "custom",
    category: "مجاني", requiresKey: true, badge: "FREE",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo", tag: "FAST" },
      { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1", tag: "THINK" },
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", label: "Mixtral 8×22B", tag: "BIG" },
    ],
  },
  {
    id: "cohere", name: "Cohere", shortName: "COH", color: "#a78bfa",
    baseURL: "https://api.cohere.ai/compatibility/v1", providerName: "custom",
    category: "استدلال عميق", requiresKey: true,
    models: [
      { id: "command-r-plus-08-2024", label: "Command R+ 08-2024", tag: "BEST" },
      { id: "command-r-08-2024", label: "Command R 08-2024", tag: "FAST" },
    ],
  },
  {
    id: "fireworks", name: "Fireworks AI", shortName: "FW", color: "#fb923c",
    baseURL: "https://api.fireworks.ai/inference/v1", providerName: "custom",
    category: "سرعة فائقة", requiresKey: true, badge: "FAST",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", label: "Llama 3.3 70B", tag: "BEST" },
      { id: "accounts/fireworks/models/deepseek-r1", label: "DeepSeek R1", tag: "THINK" },
      { id: "accounts/fireworks/models/mixtral-8x22b-instruct", label: "Mixtral 8×22B", tag: "BIG" },
    ],
  },
  {
    id: "nvidia", name: "NVIDIA NIM", shortName: "NIM", color: "#76b900",
    baseURL: "https://integrate.api.nvidia.com/v1", providerName: "custom",
    category: "GPU محلي", requiresKey: true, badge: "GPU",
    models: [
      { id: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tag: "BEST" },
      { id: "deepseek-ai/deepseek-r1", label: "DeepSeek R1", tag: "THINK" },
      { id: "nvidia/nemotron-4-340b-instruct", label: "Nemotron 340B", tag: "HUGE" },
    ],
  },
  {
    id: "cerebras", name: "Cerebras", shortName: "CBS", color: "#e11d48",
    baseURL: "https://api.cerebras.ai/v1", providerName: "custom",
    category: "سرعة قياسية", requiresKey: true, badge: "1600 t/s",
    models: [
      { id: "llama3.3-70b", label: "Llama 3.3 70B", tag: "FAST" },
      { id: "llama3.1-8b", label: "Llama 3.1 8B", tag: "TURBO" },
    ],
  },
  {
    id: "sambanova", name: "SambaNova", shortName: "SNV", color: "#f59e0b",
    baseURL: "https://api.sambanova.ai/v1", providerName: "custom",
    category: "سرعة", requiresKey: true,
    models: [
      { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", tag: "BEST" },
      { id: "DeepSeek-R1-Distill-Llama-70B", label: "DeepSeek R1 70B", tag: "THINK" },
    ],
  },
  {
    id: "hyperbolic", name: "Hyperbolic", shortName: "HYP", color: "#818cf8",
    baseURL: "https://api.hyperbolic.xyz/v1", providerName: "custom",
    category: "مفتوح المصدر", requiresKey: true,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", tag: "BEST" },
      { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1", tag: "THINK" },
    ],
  },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── Provider dot ──────────────────────────────────────────────────────────
function ProviderDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: 8, height: 8,
        background: active ? color : `${color}44`,
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.3s",
      }}
    />
  );
}

// ── Provider card ──────────────────────────────────────────────────────────
function ProviderCard({
  prov, isActive, configuredKey, selectedModel,
  onActivate, onModelChange, onKeyChange,
}: {
  prov: ProviderDef; isActive: boolean;
  configuredKey: string; selectedModel: string;
  onActivate: (p: ProviderDef, m: string) => void;
  onModelChange: (id: string, m: string) => void;
  onKeyChange: (id: string, k: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyInput, setKeyInput] = useState(configuredKey);
  const hasKey = prov.requiresKey ? configuredKey.length > 10 : true;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg,${prov.color}18 0%,${prov.color}06 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? prov.color + "55" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-right"
      >
        <ProviderDot color={prov.color} active={hasKey} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black" style={{ color: isActive ? prov.color : "#e2e8f0" }}>
              {prov.name}
            </span>
            {prov.badge && (
              <span
                className="text-[7px] font-bold px-1 py-px rounded"
                style={{ background: `${prov.color}20`, color: prov.color, border: `1px solid ${prov.color}38` }}
              >
                {prov.badge}
              </span>
            )}
            {isActive && (
              <span
                className="text-[7px] font-bold px-1 py-px rounded flex items-center gap-0.5"
                style={{ background: "rgba(0,255,136,0.14)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.32)" }}
              >
                <Check className="w-2 h-2" /> نشط
              </span>
            )}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>
            {prov.category} · {prov.models.length} نموذج
          </div>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: "rgba(255,255,255,0.35)" }}>
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 3L4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${prov.color}14` }}>
              <div className="pt-2">
                <div className="text-[7px] font-bold tracking-widest mb-1.5 uppercase" style={{ color: `${prov.color}80` }}>النماذج</div>
                <div className="grid grid-cols-2 gap-1">
                  {prov.models.map((m) => {
                    const isSel = (selectedModel || prov.models[0].id) === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => onModelChange(prov.id, m.id)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all"
                        style={{
                          background: isSel ? `${prov.color}1e` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSel ? prov.color + "48" : "rgba(255,255,255,0.05)"}`,
                        }}
                      >
                        <span className="text-[9px] font-semibold truncate" style={{ color: isSel ? prov.color : "rgba(255,255,255,0.6)" }}>{m.label}</span>
                        <span className="text-[7px] font-black ml-1" style={{ color: isSel ? prov.color : "rgba(255,255,255,0.28)" }}>{m.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {prov.requiresKey && (
                <div>
                  <div className="text-[7px] font-bold tracking-widest mb-1 uppercase" style={{ color: `${prov.color}80` }}>مفتاح API</div>
                  <div className="flex gap-1">
                    <input
                      type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
                      placeholder={`${prov.id.toUpperCase()}-...`}
                      className="flex-1 rounded-lg px-2 py-1.5 text-[9px] font-mono outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${keyInput.length > 10 ? prov.color + "48" : "rgba(255,255,255,0.07)"}`,
                        color: "rgba(255,255,255,0.8)",
                      }}
                    />
                    <motion.button
                      onClick={() => { onKeyChange(prov.id, keyInput); onActivate(prov, selectedModel || prov.models[0].id); }}
                      className="px-2.5 rounded-lg text-[8px] font-bold whitespace-nowrap"
                      style={{ background: `${prov.color}1e`, border: `1px solid ${prov.color}38`, color: prov.color }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    >
                      حفظ وتفعيل
                    </motion.button>
                  </div>
                </div>
              )}
              {!prov.requiresKey && (
                <motion.button
                  onClick={() => onActivate(prov, selectedModel || prov.models[0].id)}
                  className="w-full py-1.5 rounded-lg text-[9px] font-bold"
                  style={{
                    background: isActive ? `${prov.color}22` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isActive ? prov.color + "45" : "rgba(255,255,255,0.09)"}`,
                    color: isActive ? prov.color : "rgba(255,255,255,0.7)",
                  }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  {isActive ? "فعّال الآن" : "تفعيل"}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Scan progress bar ────────────────────────────────────────────────────
function ScanBar({ progress }: { progress: number }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "linear-gradient(90deg,#e0e0f0,#c8c8dc)" }}
        animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────
export function AIQuickSetupButton() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [open, setOpenState] = useState(() => localStorage.getItem(OPEN_STATE_KEY) === "1");
  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
      localStorage.setItem(OPEN_STATE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);
  const { pos: dragPos, rootRef: winRef, onDragMouseDown: onWinDragDown, resetPos: resetWinPos } =
    useDraggable("mr7-setup-win", { x: 16, y: Math.round(window.innerHeight * 0.05) });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg] = useState("");
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [providerSearch, setProviderSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded: Record<string, string> = {};
    ALL_PROVIDERS.forEach((p) => {
      const k = localStorage.getItem(KEY_PREFIX + p.id)?.trim() ?? "";
      if (k) loaded[p.id] = k;
    });
    setKeys(loaded);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep open if click is inside the trigger button OR inside the portaled panel itself
      const insideButton = panelRef.current?.contains(target) ?? false;
      const insidePanel  = (winRef as React.RefObject<HTMLDivElement>).current?.contains(target) ?? false;
      if (!insideButton && !insidePanel) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, setOpen, winRef]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);

  function applyProvider(p: ProviderDef, model: string, key: string) {
    const url = localStorage.getItem(URL_PREFIX + p.id)?.trim() || p.baseURL;
    if (key) {
      dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: url, streaming: true, autoTitle: true } });
    }
    if (p.providerName !== "custom") {
      dispatch({ type: "SET_PROVIDER", provider: p.providerName, providerModel: model });
    } else {
      dispatch({ type: "SET_PROVIDER", provider: "custom", providerModel: model });
      dispatch({ type: "SET_SETTINGS", patch: { personalApiBaseURL: url } });
    }
  }

  const autoScan = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning"); setScanProgress(0); setScanMsg("يتم مسح المفاتيح...");

    for (let i = 0; i < ALL_PROVIDERS.length; i++) {
      const p = ALL_PROVIDERS[i];
      setScanProgress(Math.round((i / ALL_PROVIDERS.length) * 100));
      setScanMsg(`فحص ${p.name}...`);
      await new Promise((r) => setTimeout(r, 60));

      if (p.requiresKey) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          const model = selectedModels[p.id] || p.models[0].id;
          applyProvider(p, model, key);
          setScanProgress(100); setScanMsg(`تم: ${p.name}`); setPhase("done");
          toast({ description: `تم التفعيل تلقائياً — ${p.name} · ${p.models.find((m) => m.id === model)?.label ?? model}` });
          setTimeout(() => setPhase("idle"), 3000);
          return;
        }
      } else {
        const model = selectedModels[p.id] || p.models[0].id;
        applyProvider(p, model, "");
        setScanProgress(100); setScanMsg(`محلي: ${p.name}`); setPhase("done");
        toast({ description: `تم التفعيل تلقائياً — ${p.name} · ${p.models.find((m) => m.id === model)?.label ?? model}` });
        setTimeout(() => setPhase("idle"), 3000);
        return;
      }
    }

    if ((state.settings.personalApiKey?.trim().length ?? 0) > 10) {
      dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
      setScanProgress(100); setScanMsg("المفتاح الشخصي");
      setPhase("done"); toast({ description: "تم التفعيل — المفتاح الشخصي" });
      setTimeout(() => setPhase("idle"), 3000);
      return;
    }

    setPhase("fail"); setScanMsg("لم يُعثر على مزوّد");
    toast({ description: "لم يُعثر على مزوّد مُهيَّأ — أدخل مفتاح API لأحد المزوّدين أدناه", variant: "destructive" });
    setTimeout(() => setPhase("idle"), 2500);
  }, [phase, state.settings.personalApiKey, selectedModels, dispatch, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleActivate(prov: ProviderDef, model: string) {
    const key = keys[prov.id] ?? localStorage.getItem(KEY_PREFIX + prov.id)?.trim() ?? "";
    applyProvider(prov, model, key);
    setPhase("done");
    toast({ description: `تم التفعيل — ${prov.name} · ${prov.models.find((m) => m.id === model)?.label ?? model}` });
    setTimeout(() => setPhase("idle"), 2000);
  }

  function handleKeyChange(id: string, key: string) {
    localStorage.setItem(KEY_PREFIX + id, key);
    setKeys((k) => ({ ...k, [id]: key }));
  }

  function handleModelChange(id: string, model: string) {
    setSelectedModels((s) => ({ ...s, [id]: model }));
  }

  const cfgCnt = ALL_PROVIDERS.filter((p) => (p.requiresKey ? (keys[p.id]?.length ?? 0) > 10 : true)).length;
  const filteredProviders = ALL_PROVIDERS.filter((p) => !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase()));

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Trigger button — simple, consistent circular orb like other TopBar buttons */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        disabled={phase === "scanning"}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 36, height: 36,
          background: open
            ? "radial-gradient(circle at 38% 38%, rgba(240,240,244,0.28), rgba(10,10,16,0.97))"
            : "radial-gradient(circle at 38% 38%, rgba(240,240,244,0.10), rgba(8,8,12,0.92))",
          border: `1.5px solid rgba(240,240,244,${open ? 0.7 : 0.3})`,
          boxShadow: open ? "0 0 24px rgba(240,240,244,0.30)" : "none",
          cursor: phase === "scanning" ? "wait" : "pointer",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="إعدادات الذكاء الاصطناعي"
        title="إعدادات الذكاء الاصطناعي"
      >
        {phase === "scanning" ? (
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Zap className="w-4 h-4" style={{ color: "rgba(245,158,11,0.9)" }} />
          </motion.span>
        ) : (
          <Settings className="w-4 h-4" style={{ color: open ? "#fff" : "rgba(240,240,244,0.8)" }} />
        )}
        {phase === "done" && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
        )}
        {phase === "fail" && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "#e21227", boxShadow: "0 0 6px #e21227" }} />
        )}
      </motion.button>

      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={winRef as React.Ref<HTMLDivElement>}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              zIndex: 99999,
              width: "clamp(280px, 32vw, 400px)",
              maxHeight: "76vh",
              pointerEvents: "auto",
            }}
          >
            <div
              className="rounded-2xl flex flex-col overflow-hidden"
              style={{
                background: "linear-gradient(160deg, rgba(8,8,14,0.99) 0%, rgba(6,6,12,0.99) 100%)",
                border: "1px solid rgba(240,240,244,0.18)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)",
                backdropFilter: "blur(28px)",
                maxHeight: "76vh",
              }}
            >
              {/* Header — drag handle */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-move select-none"
                style={{ borderBottom: "1px solid rgba(240,240,244,0.08)" }}
                onMouseDown={onWinDragDown}
              >
                <div>
                  <div className="text-[11px] font-black tracking-[0.16em] uppercase font-mono flex items-center gap-1.5" style={{ color: "rgba(240,240,244,0.9)" }}>
                    <Settings className="w-3 h-3" /> إعدادات الذكاء الاصطناعي
                  </div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
                    {cfgCnt} مزوّد مُهيَّأ من {ALL_PROVIDERS.length}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => { resetWinPos(); toast({ description: "تمت إعادة النافذة إلى موضعها الافتراضي" }); }}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}
                    title="إعادة ضبط الموضع"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </motion.button>
                  <motion.button
                    onClick={() => setOpen(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>

              {/* Auto-scan */}
              <div className="px-4 pt-3 pb-2">
                {phase === "scanning" && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.8)" }}>{scanMsg}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: "rgba(0,255,136,0.9)" }}>{scanProgress}%</span>
                    </div>
                    <ScanBar progress={scanProgress} />
                  </div>
                )}
                <motion.button
                  onClick={autoScan}
                  disabled={phase === "scanning"}
                  className="w-full rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                  style={{
                    background: phase === "scanning" ? "rgba(240,240,244,0.04)" : "linear-gradient(135deg,rgba(240,240,244,0.14) 0%,rgba(200,200,220,0.08) 100%)",
                    border: `1px solid rgba(240,240,244,${phase === "scanning" ? 0.12 : 0.35})`,
                    color: phase === "scanning" ? "rgba(240,240,244,0.35)" : "rgba(240,240,244,0.9)",
                  }}
                  whileHover={phase !== "scanning" ? { scale: 1.01 } : {}}
                  whileTap={phase !== "scanning" ? { scale: 0.98 } : {}}
                >
                  {phase === "scanning" ? (
                    <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>جارٍ المسح التلقائي...</>
                  ) : (
                    <><Zap className="w-3 h-3" />مسح تلقائي وتفعيل أفضل مزوّد</>
                  )}
                </motion.button>
              </div>

              {/* Search */}
              <div className="px-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "rgba(240,240,244,0.4)" }} />
                  <input
                    type="text" value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="بحث عن مزوّد..."
                    className="w-full pl-7 pr-2 py-1.5 text-[9px] font-mono rounded-lg outline-none"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: `1px solid rgba(240,240,244,${providerSearch ? 0.28 : 0.12})`,
                      color: "rgba(255,255,255,0.8)",
                    }}
                    dir="rtl"
                  />
                  {providerSearch && (
                    <button onClick={() => setProviderSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Provider list */}
              <div
                className="px-4 pb-4 space-y-1.5 overflow-y-auto"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(240,240,244,0.15) transparent" }}
              >
                <div className="text-[7px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "rgba(240,240,244,0.38)" }}>
                  {providerSearch ? `${filteredProviders.length} نتيجة` : "المزوّدون المتاحون"}
                </div>
                {filteredProviders.length === 0 && (
                  <div className="text-center py-6 text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>لا توجد نتائج</div>
                )}
                {filteredProviders.map((p) => (
                  <ProviderCard
                    key={p.id} prov={p}
                    isActive={state.activeProvider === p.providerName && state.activeProviderModel === (selectedModels[p.id] || p.models[0].id)}
                    configuredKey={keys[p.id] ?? ""}
                    selectedModel={selectedModels[p.id] ?? p.models[0].id}
                    onActivate={handleActivate} onModelChange={handleModelChange} onKeyChange={handleKeyChange}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
