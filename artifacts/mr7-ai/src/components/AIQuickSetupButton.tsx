import { useState, useCallback, useEffect, useRef } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, ProviderName } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { PlanetOrb, hexToRgb } from "./PlanetOrb";

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
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",   tag: "FAST" },
      { id: "mixtral-8x7b-32768",      label: "Mixtral 8×7B",   tag: "MIX"  },
    ],
  },
  {
    id: "openai", name: "OpenAI", shortName: "OAI", color: "#10b981",
    baseURL: "https://api.openai.com/v1", providerName: "openai",
    category: "متعدد الأغراض", requiresKey: true, badge: "GPT-4o",
    models: [
      { id: "gpt-4o",      label: "GPT-4o",      tag: "BEST" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "FAST" },
      { id: "o1-mini",     label: "o1-mini",      tag: "THINK"},
    ],
  },
  {
    id: "anthropic", name: "Anthropic", shortName: "CLO", color: "#f97316",
    baseURL: "https://api.anthropic.com/v1", providerName: "anthropic",
    category: "استدلال عميق", requiresKey: true, badge: "Claude",
    models: [
      { id: "claude-sonnet-4-5",       label: "Sonnet 4.5",  tag: "BEST" },
      { id: "claude-3-5-haiku-latest", label: "Haiku 3.5",   tag: "FAST" },
      { id: "claude-opus-4-5",         label: "Opus 4.5",    tag: "MAX"  },
    ],
  },
  {
    id: "gemini", name: "Gemini", shortName: "GEM", color: "#3b82f6",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", providerName: "gemini",
    category: "متعدد الوسائط", requiresKey: true, badge: "2.5",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "BEST" },
      { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   tag: "PRO"  },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", shortName: "OR", color: "#8b5cf6",
    baseURL: "https://openrouter.ai/api/v1", providerName: "openrouter",
    category: "300+ نموذج", requiresKey: true, badge: "300+",
    models: [
      { id: "deepseek/deepseek-chat-v3-0324",  label: "DeepSeek V3",      tag: "BEST" },
      { id: "anthropic/claude-sonnet-4-5",     label: "Claude Sonnet 4.5",tag: "PRO"  },
      { id: "meta-llama/llama-3.3-70b",        label: "Llama 3.3 70B",    tag: "OPEN" },
    ],
  },
  {
    id: "deepseek", name: "DeepSeek", shortName: "DS", color: "#06b6d4",
    baseURL: "https://api.deepseek.com/v1", providerName: "custom",
    category: "استدلال", requiresKey: true,
    models: [
      { id: "deepseek-chat",     label: "DeepSeek V3", tag: "BEST" },
      { id: "deepseek-reasoner", label: "DeepSeek R1", tag: "THINK"},
    ],
  },
  {
    id: "xai", name: "xAI Grok", shortName: "GROK", color: "#22d3ee",
    baseURL: "https://api.x.ai/v1", providerName: "custom",
    category: "X.ai", requiresKey: true,
    models: [
      { id: "grok-3",      label: "Grok 3",      tag: "BEST" },
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
      { id: "sonar",     label: "Sonar",     tag: "FAST" },
    ],
  },
  {
    id: "ollama", name: "Ollama", shortName: "OLL", color: "#10b981",
    baseURL: "http://localhost:11434/v1", providerName: "custom",
    category: "محلي", requiresKey: false, badge: "LOCAL",
    models: [
      { id: "llama3.2",    label: "Llama 3.2",   tag: "BEST" },
      { id: "deepseek-r1", label: "DeepSeek R1", tag: "THINK"},
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
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",      label: "Llama 3.3 70B Turbo",  tag: "FAST" },
      { id: "deepseek-ai/DeepSeek-R1",                        label: "DeepSeek R1",           tag: "THINK"},
      { id: "mistralai/Mixtral-8x22B-Instruct-v0.1",          label: "Mixtral 8×22B",         tag: "BIG"  },
    ],
  },
  {
    id: "cohere", name: "Cohere", shortName: "COH", color: "#a78bfa",
    baseURL: "https://api.cohere.ai/compatibility/v1", providerName: "custom",
    category: "استدلال عميق", requiresKey: true,
    models: [
      { id: "command-r-plus-08-2024", label: "Command R+ 08-2024", tag: "BEST" },
      { id: "command-r-08-2024",      label: "Command R 08-2024",  tag: "FAST" },
    ],
  },
  {
    id: "fireworks", name: "Fireworks AI", shortName: "FW", color: "#fb923c",
    baseURL: "https://api.fireworks.ai/inference/v1", providerName: "custom",
    category: "سرعة فائقة", requiresKey: true, badge: "FAST",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct",  label: "Llama 3.3 70B",    tag: "BEST" },
      { id: "accounts/fireworks/models/deepseek-r1",               label: "DeepSeek R1",       tag: "THINK"},
      { id: "accounts/fireworks/models/mixtral-8x22b-instruct",    label: "Mixtral 8×22B",    tag: "BIG"  },
    ],
  },
  {
    id: "nvidia", name: "NVIDIA NIM", shortName: "NIM", color: "#76b900",
    baseURL: "https://integrate.api.nvidia.com/v1", providerName: "custom",
    category: "GPU محلي", requiresKey: true, badge: "GPU",
    models: [
      { id: "meta/llama-3.3-70b-instruct",  label: "Llama 3.3 70B",   tag: "BEST" },
      { id: "deepseek-ai/deepseek-r1",       label: "DeepSeek R1",      tag: "THINK"},
      { id: "nvidia/nemotron-4-340b-instruct", label: "Nemotron 340B", tag: "HUGE" },
    ],
  },
  {
    id: "cerebras", name: "Cerebras", shortName: "CBS", color: "#e11d48",
    baseURL: "https://api.cerebras.ai/v1", providerName: "custom",
    category: "سرعة قياسية", requiresKey: true, badge: "1600 t/s",
    models: [
      { id: "llama3.3-70b",  label: "Llama 3.3 70B",  tag: "FAST" },
      { id: "llama3.1-8b",   label: "Llama 3.1 8B",   tag: "TURBO"},
    ],
  },
  {
    id: "sambanova", name: "SambaNova", shortName: "SNV", color: "#f59e0b",
    baseURL: "https://api.sambanova.ai/v1", providerName: "custom",
    category: "سرعة", requiresKey: true,
    models: [
      { id: "Meta-Llama-3.3-70B-Instruct", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "DeepSeek-R1-Distill-Llama-70B", label: "DeepSeek R1 70B", tag: "THINK"},
    ],
  },
  {
    id: "hyperbolic", name: "Hyperbolic", shortName: "HYP", color: "#818cf8",
    baseURL: "https://api.hyperbolic.xyz/v1", providerName: "custom",
    category: "مفتوح المصدر", requiresKey: true,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B",  tag: "BEST" },
      { id: "deepseek-ai/DeepSeek-R1",             label: "DeepSeek R1",    tag: "THINK"},
    ],
  },
];

type Phase = "idle" | "scanning" | "done" | "fail";

// ── ULTRA 3D QUANTUM ATOM — CLEAN WHITE ───────────────────────────────────────
function QuantumAtom3D({ phase, open, hover, customColor }: { phase: Phase; open: boolean; hover: boolean; customColor?: string }) {
  const colorMap: Record<Phase, [number, number, number]> = {
    idle:     [240, 240, 244],
    scanning: [245, 158, 11],
    done:     [34, 197, 94],
    fail:     [226, 18, 39],
  };
  const color = customColor ? hexToRgb(customColor, colorMap[phase]) : colorMap[phase];
  return (
    <PlanetOrb
      size={32}
      color={color}
      hover={hover}
      open={open}
      pulse={phase === "scanning"}
      moonCount={2}
    />
  );
}

// ── Provider dot ──────────────────────────────────────────────────────────────
function ProviderDot({ color, active }: { color: string; active: boolean }) {
  return (
    <span className="inline-block rounded-full flex-shrink-0"
      style={{
        width: 8, height: 8,
        background: active ? color : `${color}44`,
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 0.3s",
      }} />
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────
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
    <div className="rounded-xl overflow-hidden"
      style={{
        background: isActive
          ? `linear-gradient(135deg,${prov.color}18 0%,${prov.color}06 100%)`
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? prov.color + "55" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isActive ? `0 0 16px ${prov.color}14` : "none",
        transition: "all 0.25s",
      }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <ProviderDot color={prov.color} active={hasKey} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black" style={{ color: isActive ? prov.color : "#e2e8f0" }}>
              {prov.name}
            </span>
            {prov.badge && (
              <span className="text-[7px] font-bold px-1 py-px rounded"
                style={{ background: `${prov.color}20`, color: prov.color, border: `1px solid ${prov.color}38` }}>
                {prov.badge}
              </span>
            )}
            {isActive && (
              <span className="text-[7px] font-bold px-1 py-px rounded"
                style={{ background: "rgba(0,255,136,0.14)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.32)" }}>
                ACTIVE
              </span>
            )}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>
            {prov.category} · {prov.models.length} نموذج
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button onClick={() => onActivate(prov, selectedModel || prov.models[0].id)}
            className="text-[8px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: isActive ? `${prov.color}22` : "rgba(255,255,255,0.05)",
              border: `1px solid ${isActive ? prov.color + "45" : "rgba(255,255,255,0.09)"}`,
              color: isActive ? prov.color : "rgba(255,255,255,0.55)",
            }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {isActive ? "فعّال" : "تفعيل"}
          </motion.button>
          <motion.button onClick={() => setExpanded(e => !e)}
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: "rgba(255,255,255,0.35)" }}
            animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 3L4 5.5 6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${prov.color}14` }}>
              <div className="pt-2">
                <div className="text-[7px] font-bold tracking-widest mb-1.5 uppercase"
                  style={{ color: `${prov.color}80` }}>النماذج</div>
                <div className="grid grid-cols-2 gap-1">
                  {prov.models.map(m => {
                    const isSel = (selectedModel || prov.models[0].id) === m.id;
                    return (
                      <button key={m.id} onClick={() => onModelChange(prov.id, m.id)}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all"
                        style={{
                          background: isSel ? `${prov.color}1e` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSel ? prov.color + "48" : "rgba(255,255,255,0.05)"}`,
                        }}>
                        <span className="text-[9px] font-semibold truncate"
                          style={{ color: isSel ? prov.color : "rgba(255,255,255,0.6)" }}>{m.label}</span>
                        <span className="text-[7px] font-black ml-1"
                          style={{ color: isSel ? prov.color : "rgba(255,255,255,0.28)" }}>{m.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {prov.requiresKey && (
                <div>
                  <div className="text-[7px] font-bold tracking-widest mb-1 uppercase"
                    style={{ color: `${prov.color}80` }}>مفتاح API</div>
                  <div className="flex gap-1">
                    <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                      placeholder={`${prov.id.toUpperCase()}-...`}
                      className="flex-1 rounded-lg px-2 py-1.5 text-[9px] font-mono outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid ${keyInput.length > 10 ? prov.color + "48" : "rgba(255,255,255,0.07)"}`,
                        color: "rgba(255,255,255,0.8)",
                      }} />
                    <motion.button
                      onClick={() => { onKeyChange(prov.id, keyInput); onActivate(prov, selectedModel || prov.models[0].id); }}
                      className="px-2 rounded-lg text-[8px] font-bold"
                      style={{ background: `${prov.color}1e`, border: `1px solid ${prov.color}38`, color: prov.color }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      حفظ
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Scan progress bar ─────────────────────────────────────────────────────────
function ScanBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg,${color},${color}88)` }}
        animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      <motion.div className="absolute inset-y-0 w-8"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)" }}
        animate={{ left: ["-10%", "110%"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AIQuickSetupButton() {
  const { state, dispatch }       = useStore();
  const { toast }                 = useToast();
  const [phase, setPhase]         = useState<Phase>("idle");
  const [open, setOpenState]      = useState(() => localStorage.getItem(OPEN_STATE_KEY) === "1");
  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState(prev => {
      const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
      localStorage.setItem(OPEN_STATE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);
  const { pos: dragPos, rootRef: winRef, onDragMouseDown: onWinDragDown, resetPos: resetWinPos } = useDraggable("mr7-setup-win", { x: 16, y: Math.round(window.innerHeight * 0.05) });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg]     = useState("");
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [keys, setKeys]           = useState<Record<string, string>>({});
  const [providerSearch, setProviderSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"nexus" | "metrics" | "arsenal" | "intel" | "console">("nexus");
  const [atomHover, setAtomHover] = useState(false);
  const [magPos,    setMagPos]    = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved keys on open
  useEffect(() => {
    const loaded: Record<string, string> = {};
    ALL_PROVIDERS.forEach(p => {
      const k = localStorage.getItem(KEY_PREFIX + p.id)?.trim() ?? "";
      if (k) loaded[p.id] = k;
    });
    setKeys(loaded);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Keyboard shortcut Ctrl+Shift+A
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Auto-init once per session
  useEffect(() => {
    if (!sessionStorage.getItem("mr7-autoinit")) {
      sessionStorage.setItem("mr7-autoinit", "1");
      setTimeout(autoScan, 1800);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const autoScan = useCallback(async () => {
    if (phase === "scanning") return;
    setPhase("scanning"); setScanProgress(0); setScanMsg("يتم مسح المفاتيح...");

    for (let i = 0; i < ALL_PROVIDERS.length; i++) {
      const p = ALL_PROVIDERS[i];
      setScanProgress(Math.round((i / ALL_PROVIDERS.length) * 100));
      setScanMsg(`فحص ${p.name}...`);
      await new Promise(r => setTimeout(r, 80));

      if (p.requiresKey) {
        const key = localStorage.getItem(KEY_PREFIX + p.id)?.trim();
        if (key && key.length > 10) {
          const model = selectedModels[p.id] || p.models[0].id;
          applyProvider(p, model, key);
          setScanProgress(100); setScanMsg(`تم: ${p.name}`);
          setPhase("done");
          toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
          setTimeout(() => setPhase("idle"), 3500);
          return;
        }
      } else {
        const model = selectedModels[p.id] || p.models[0].id;
        applyProvider(p, model, "");
        setScanProgress(100); setScanMsg(`محلي: ${p.name}`);
        setPhase("done");
        toast({ description: `AUTO — ${p.name} · ${p.models.find(m => m.id === model)?.label ?? model}` });
        setTimeout(() => setPhase("idle"), 3500);
        return;
      }
    }

    if ((state.settings.personalApiKey?.trim().length ?? 0) > 10) {
      dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true } });
      setScanProgress(100); setScanMsg("المفتاح الشخصي");
      setPhase("done"); toast({ description: "AUTO — المفتاح الشخصي" });
      setTimeout(() => setPhase("idle"), 3500);
      return;
    }

    setPhase("fail"); setScanMsg("لم يُعثر على مزوّد");
    toast({ description: "لم يُعثر على مزوّد — أدخل مفتاح API", variant: "destructive" });
    setTimeout(() => setPhase("idle"), 2500);
  }, [phase, state.settings.personalApiKey, selectedModels, dispatch, toast]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleActivate(prov: ProviderDef, model: string) {
    const key = keys[prov.id] ?? localStorage.getItem(KEY_PREFIX + prov.id)?.trim() ?? "";
    applyProvider(prov, model, key);
    setPhase("done");
    toast({ description: `${prov.name} · ${prov.models.find(m => m.id === model)?.label ?? model}` });
    setTimeout(() => setPhase("idle"), 2500);
  }

  function handleKeyChange(id: string, key: string) {
    localStorage.setItem(KEY_PREFIX + id, key);
    setKeys(k => ({ ...k, [id]: key }));
  }

  function handleModelChange(id: string, model: string) {
    setSelectedModels(s => ({ ...s, [id]: model }));
  }

  const label = phase === "scanning" ? "SCAN" : phase === "done" ? "OK" : phase === "fail" ? "ERR" : "AUTO";
  const cfgCnt = ALL_PROVIDERS.filter(p => p.requiresKey ? (keys[p.id]?.length ?? 0) > 10 : true).length;

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Main trigger button — circular 36px */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        disabled={phase === "scanning"}
        className="relative flex items-center justify-center rounded-full"
        onMouseEnter={() => setAtomHover(true)}
        onMouseLeave={() => { setAtomHover(false); setMagPos({ x: 0, y: 0 }); }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMagPos({
            x: ((e.clientX - (r.left + r.width  / 2)) / (r.width  / 2)) * 5,
            y: ((e.clientY - (r.top  + r.height / 2)) / (r.height / 2)) * 3,
          });
        }}
        style={{
          width: 44, height: 44,
          x: magPos.x, y: magPos.y,
          background: open
            ? "radial-gradient(circle at 38% 38%, rgba(240,240,244,0.28), rgba(10,10,16,0.97))"
            : "radial-gradient(circle at 38% 38%, rgba(240,240,244,0.12), rgba(8,8,12,0.92))",
          border: `2px solid rgba(240,240,244,${open ? 0.75 : 0.35})`,
          boxShadow: open
            ? "0 0 36px rgba(240,240,244,0.40), 0 0 70px rgba(200,200,220,0.18), inset 0 0 14px rgba(255,255,255,0.10)"
            : "0 0 18px rgba(240,240,244,0.22), 0 0 36px rgba(200,200,220,0.09)",
          cursor: phase === "scanning" ? "wait" : "pointer",
        }}
        whileHover={{ scale: 1.10, y: -1 }}
        whileTap={{ scale: 0.90 }}
        aria-label="إعداد الذكاء الاصطناعي تلقائياً"
      >
        {/* Idle outer orbit ring */}
        <motion.span className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: "1px solid rgba(240,240,244,0.22)", margin: "-5px" }}
          animate={{ opacity: [0.22, 0.55, 0.22], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
        {/* Second orbit ring */}
        <motion.span className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: "1px dashed rgba(220,220,240,0.14)", margin: "-10px" }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
        {phase === "scanning" && (
          <motion.span className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: "1px solid rgba(240,240,244,0.9)" }}
            animate={{ scale: [1, 1.45, 1], opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }} />
        )}
        <QuantumAtom3D phase={phase} open={open} hover={atomHover} customColor={state.settings.orbColors?.setup} />
      </motion.button>

      {open && (
        <motion.button
          onClick={() => { resetWinPos(); toast({ description: "تمت إعادة نافذة الإعدادات إلى موضعها الافتراضي" }); }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: 20, height: 20,
            top: -4, right: -4,
            background: "rgba(10,10,16,0.95)",
            border: "1px solid rgba(240,240,244,0.35)",
            color: "rgba(240,240,244,0.75)",
          }}
          whileHover={{ scale: 1.15, borderColor: "rgba(240,240,244,0.7)" }}
          whileTap={{ scale: 0.9 }}
          aria-label="إعادة ضبط موضع نافذة الإعدادات"
          title="إعادة ضبط الموضع"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.89" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13.5 2.5v3.2h-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}

      {/* ── DRAGGABLE POPUP WINDOW ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={winRef as React.Ref<HTMLDivElement>}
            initial={{ opacity: 0, x: -32, scale: 0.93 }}
            animate={{ opacity: 1, x: 0,   scale: 1    }}
            exit   ={{ opacity: 0, x: -32, scale: 0.94 }}
            transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              left: dragPos.x,
              top: dragPos.y,
              zIndex: 99999,
              width: "clamp(280px, 34vw, 420px)",
              maxHeight: "78vh",
              perspective: "1400px",
              transformStyle: "preserve-3d",
              pointerEvents: "auto",
            }}
          >
            <div className="rounded-[18px] flex flex-col"
              style={{
                background: "linear-gradient(160deg, rgba(8,8,14,0.99) 0%, rgba(6,6,12,0.99) 60%, rgba(8,8,14,0.99) 100%)",
                border: "1px solid rgba(240,240,244,0.22)",
                boxShadow: "0 0 100px rgba(240,240,244,0.08), 0 0 40px rgba(200,200,220,0.04), 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 60px rgba(240,240,244,0.01)",
                backdropFilter: "blur(36px)",
                maxHeight: "78vh",
                overflow: "hidden",
              }}>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(240,240,244,0.70),rgba(200,200,220,0.40),transparent)" }} />

              {/* Header — drag handle */}
              <div className="px-4 py-3 flex items-center justify-between cursor-move select-none"
                style={{ borderBottom: "1px solid rgba(240,240,244,0.07)" }} onMouseDown={onWinDragDown}>
                <div>
                  <div className="text-[11px] font-black tracking-[0.22em] uppercase font-mono"
                    style={{ color: "rgba(240,240,244,0.88)" }}>⚙ إعدادات الذكاء الاصطناعي</div>
                  <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
                    {cfgCnt} مزوّد مُهيَّأ من {ALL_PROVIDERS.length}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {ALL_PROVIDERS.slice(0, 8).map(p => (
                      <div key={p.id} className="w-1.5 h-3.5 rounded-sm transition-all"
                        style={{
                          background: (keys[p.id]?.length ?? 0) > 10 || !p.requiresKey ? p.color : "rgba(255,255,255,0.07)",
                        }} />
                    ))}
                  </div>
                  <motion.button onClick={() => setOpen(false)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    whileHover={{ background: "rgba(255,255,255,0.1)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex px-4 gap-1 pt-2 pb-0" style={{ borderBottom: "1px solid rgba(240,240,244,0.08)" }}>
                {(["nexus", "metrics", "arsenal", "intel", "console"] as const).map(tab => {
                  const labels: Record<string, string> = { nexus: "المزوّدون", metrics: "الأداء", arsenal: "أدوات", intel: "ذكاء", console: "⚙ إعدادات" };
                  const active = activeTab === tab;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="px-2.5 py-1.5 text-[8px] font-black tracking-wide uppercase rounded-t-lg transition-all font-mono"
                      style={{
                        color: active ? "rgba(240,240,244,0.95)" : "rgba(255,255,255,0.28)",
                        background: active ? "rgba(240,240,244,0.07)" : "transparent",
                        borderBottom: active ? "2px solid rgba(240,240,244,0.75)" : "2px solid transparent",
                      }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* NEXUS tab */}
              {activeTab === "nexus" && (<>
                {/* Scan progress */}
                {phase === "scanning" && (
                  <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,255,136,0.06)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono" style={{ color: "rgba(0,229,255,0.8)" }}>{scanMsg}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: "rgba(0,255,136,0.9)" }}>{scanProgress}%</span>
                    </div>
                    <ScanBar progress={scanProgress} color="#e0e0f0" />
                  </div>
                )}
                <div className="px-4 pt-3 pb-2">
                  <motion.button onClick={autoScan} disabled={phase === "scanning"}
                    className="w-full rounded-xl py-2.5 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                    style={{
                      background: phase === "scanning"
                        ? "rgba(240,240,244,0.04)"
                        : "linear-gradient(135deg,rgba(240,240,244,0.14) 0%,rgba(200,200,220,0.08) 100%)",
                      border: `1px solid rgba(240,240,244,${phase === "scanning" ? 0.12 : 0.35})`,
                      color: phase === "scanning" ? "rgba(240,240,244,0.35)" : "rgba(240,240,244,0.88)",
                    }}
                    whileHover={phase !== "scanning" ? { scale: 1.01, boxShadow: "0 0 20px rgba(240,240,244,0.12)" } : {}}
                    whileTap  ={phase !== "scanning" ? { scale: 0.98 } : {}}>
                    {phase === "scanning" ? (
                      <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>◌</motion.span>جارٍ المسح التلقائي...</>
                    ) : (
                      <><span style={{ fontSize: 12 }}>⚡</span>مسح تلقائي وتفعيل أفضل مزوّد</>
                    )}
                  </motion.button>
                </div>
                <div className="px-4 pb-2">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{ color: "rgba(240,240,244,0.40)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" value={providerSearch} onChange={e => setProviderSearch(e.target.value)}
                      placeholder="بحث عن مزوّد..."
                      className="w-full pl-7 pr-2 py-1.5 text-[9px] font-mono rounded-lg outline-none"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: `1px solid rgba(240,240,244,${providerSearch ? 0.28 : 0.12})`,
                        color: "rgba(255,255,255,0.8)",
                      }} dir="rtl" />
                    {providerSearch && (
                      <button onClick={() => setProviderSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3 space-y-1.5 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(240,240,244,0.15) transparent" }}>
                  <div className="text-[7px] font-bold tracking-[0.22em] uppercase mb-2 pt-1"
                    style={{ color: "rgba(240,240,244,0.38)" }}>
                    {providerSearch
                      ? `${ALL_PROVIDERS.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase())).length} نتيجة`
                      : "المزوّدون المتاحون"}
                  </div>
                  {ALL_PROVIDERS.filter(p => !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase())).map(p => (
                    <ProviderCard key={p.id} prov={p}
                      isActive={state.activeProvider === p.providerName && state.activeProviderModel === (selectedModels[p.id] || p.models[0].id)}
                      configuredKey={keys[p.id] ?? ""}
                      selectedModel={selectedModels[p.id] ?? p.models[0].id}
                      onActivate={handleActivate} onModelChange={handleModelChange} onKeyChange={handleKeyChange} />
                  ))}
                </div>
              </>)}

              {/* METRICS tab */}
              {activeTab === "metrics" && (
                <div className="px-4 py-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>تصنيف سرعة النماذج</div>
                  {ALL_PROVIDERS.slice(0, 8).map((p, i) => {
                    const bar = 100 - i * 11;
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-16 text-[8px] font-mono truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{p.name}</div>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${bar}%` }}
                            transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                            style={{ background: `linear-gradient(90deg,${p.color},rgba(0,229,255,0.7))` }} />
                        </div>
                        <div className="w-8 text-[8px] font-black font-mono text-right" style={{ color: p.color }}>{bar}%</div>
                      </div>
                    );
                  })}
                  <div className="h-px" style={{ background: "rgba(0,255,136,0.08)" }} />
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>احصاءات الجلسة</div>
                  {[
                    { label: "الجلسة الحالية",  value: state.activeProvider.toUpperCase(), color: "rgba(0,255,136,0.9)" },
                    { label: "النموذج النشط",    value: (state.activeProviderModel ?? "---").split("/").pop()?.slice(0, 18) ?? "---", color: "rgba(0,229,255,0.8)" },
                    { label: "المفاتيح المُهيَّأة", value: `${cfgCnt} / ${ALL_PROVIDERS.length}`, color: "#a78bfa" },
                    { label: "الاستدامة",         value: `${Math.round((cfgCnt / ALL_PROVIDERS.length) * 100)}%`, color: "#22c55e" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.06)" }}>
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.38)" }}>{s.label}</span>
                      <span className="text-[9px] font-black font-mono" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ARSENAL tab */}
              {activeTab === "arsenal" && (
                <div className="px-4 py-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>اختصارات لوحة المفاتيح</div>
                  {[
                    { keys: ["Ctrl", "Shift", "A"], desc: "فتح / إغلاق لوحة AI" },
                    { keys: ["Ctrl", "Enter"],      desc: "إرسال الرسالة" },
                    { keys: ["Ctrl", "K"],           desc: "البحث السريع" },
                    { keys: ["Esc"],                 desc: "إلغاء / إغلاق" },
                  ].map(row => (
                    <div key={row.desc} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.06)" }}>
                      <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.45)" }}>{row.desc}</span>
                      <div className="flex items-center gap-0.5">
                        {row.keys.map((k, i) => (
                          <span key={k} className="flex items-center gap-0.5">
                            {i > 0 && <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.18)" }}>+</span>}
                            <kbd className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: "#0a0d10", border: "1px solid rgba(0,255,136,0.18)", color: "rgba(0,255,136,0.6)" }}>{k}</kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="h-px" style={{ background: "rgba(0,255,136,0.08)" }} />
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>أدوار سريعة</div>
                  {[
                    { role: "محلل أمني", desc: "خبير في تحليل الثغرات والهجمات",    color: "#ef4444" },
                    { role: "مطوّر",      desc: "مساعد برمجي متخصص في الكود",        color: "#3b82f6" },
                    { role: "باحث OSINT", desc: "جمع المعلومات من مصادر مفتوحة",     color: "#f59e0b" },
                    { role: "محلل CTF",   desc: "حل تحديات Capture The Flag",         color: "#8b5cf6" },
                    { role: "عام",        desc: "مساعد ذكاء اصطناعي عام",             color: "#22c55e" },
                  ].map(r => (
                    <motion.button key={r.role} onClick={() => {
                      const active = ALL_PROVIDERS.find(p => p.providerName === state.activeProvider);
                      if (active) { applyProvider(active, selectedModels[active.id] || active.models[0].id, keys[active.id] ?? ""); }
                      toast({ description: `دور نشط: ${r.role}` });
                    }}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${r.color}22` }}
                      whileHover={{ background: `${r.color}0d`, borderColor: `${r.color}44` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                      <div className="flex-1 text-left">
                        <div className="text-[9px] font-black" style={{ color: r.color }}>{r.role}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{r.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* INTEL tab */}
              {activeTab === "intel" && (
                <div className="px-4 py-3 space-y-3 max-h-[calc(88vh-220px)] overflow-y-auto"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,136,0.18) transparent" }}>
                  <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.38)" }}>قدرات نموذج الذكاء</div>

                  {/* Capability radar chart (CSS-based) */}
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,255,136,0.03)", border: "1px solid rgba(0,255,136,0.08)" }}>
                    {[
                      { label: "استدلال",    pct: 92, color: "#00e5ff" },
                      { label: "كود",         pct: 88, color: "#22c55e" },
                      { label: "إبداع",       pct: 75, color: "#a78bfa" },
                      { label: "أمن إلكتروني", pct: 95, color: "#e21227" },
                      { label: "تحليل OSINT", pct: 84, color: "#f59e0b" },
                      { label: "لغات",        pct: 78, color: "#06b6d4" },
                    ].map(cap => (
                      <div key={cap.label} className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{cap.label}</span>
                          <span className="text-[8px] font-black font-mono" style={{ color: cap.color }}>{cap.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${cap.pct}%`, background: `linear-gradient(90deg,${cap.color}66,${cap.color})`, boxShadow: `0 0 8px ${cap.color}55` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Context / Speed stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "نافذة السياق", value: "128K", sub: "رمز", color: "#00e5ff" },
                      { label: "سرعة التوليد", value: "~95", sub: "TPS", color: "#22c55e" },
                      { label: "دقة الكود",    value: "88%",  sub: "HumanEval", color: "#a78bfa" },
                      { label: "المعرفة حتى",  value: "2024", sub: "Q4", color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2.5"
                        style={{ background: "rgba(0,255,136,0.03)", border: `1px solid ${s.color}18` }}>
                        <div className="text-[6px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                        <div className="text-[13px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Model comparison table */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,255,136,0.08)" }}>
                    <div className="px-2.5 py-1.5" style={{ background: "rgba(0,255,136,0.06)" }}>
                      <span className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.5)" }}>مقارنة النماذج</span>
                    </div>
                    {[
                      { name: "GPT-4o",         speed: 88, quality: 96, cost: "عالي",    color: "#22c55e" },
                      { name: "Claude 3.5",      speed: 82, quality: 97, cost: "عالي",    color: "#f59e0b" },
                      { name: "Gemini 1.5 Pro",  speed: 91, quality: 92, cost: "متوسط",   color: "#3b82f6" },
                      { name: "DeepSeek R1",     speed: 76, quality: 94, cost: "منخفض",   color: "#a78bfa" },
                      { name: "Llama 3.3 70B",   speed: 95, quality: 88, cost: "مجاني",   color: "#e21227" },
                    ].map(m => (
                      <div key={m.name} className="flex items-center gap-2 px-2.5 py-1.5"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                        <span className="text-[8px] font-bold w-24 truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{m.name}</span>
                        <div className="flex-1 flex gap-1 items-center">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full" style={{ width: `${m.quality}%`, background: m.color }} />
                          </div>
                        </div>
                        <span className="text-[7px] font-mono w-10 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>{m.cost}</span>
                      </div>
                    ))}
                  </div>

                  {/* Security specialties */}
                  <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "rgba(226,18,39,0.04)", border: "1px solid rgba(226,18,39,0.10)" }}>
                    <div className="text-[7px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(226,18,39,0.5)" }}>تخصصات الأمن الإلكتروني</div>
                    {[
                      "اختبار الاختراق (Pentesting)", "تحليل البرمجيات الخبيثة",
                      "OSINT & Reconnaissance", "تحليل CTF & Reverse Engineering",
                      "Red Team Operations", "Blue Team Defense & SOC",
                    ].map(spec => (
                      <div key={spec} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#e21227" }} />
                        <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.45)" }}>{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === "console" && (
                <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: "55vh", scrollbarWidth: "thin", scrollbarColor: "rgba(240,240,244,0.15) transparent" }}>

                  {/* Active provider display */}
                  <div className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "rgba(240,240,244,0.04)", border: "1px solid rgba(240,240,244,0.10)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[7px] font-bold tracking-widest uppercase mb-0.5" style={{ color: "rgba(240,240,244,0.40)" }}>المزوّد النشط</div>
                      <div className="text-[11px] font-black" style={{ color: "rgba(240,240,244,0.90)" }}>{state.activeProvider.toUpperCase()}</div>
                      <div className="text-[8px] font-mono truncate mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{state.activeProviderModel?.split("/").pop() ?? "---"}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e", animationDuration: "1.4s" }} />
                  </div>

                  {/* Toggle settings */}
                  <div>
                    <div className="text-[7px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(240,240,244,0.35)" }}>الإعدادات العامة</div>
                    <div className="space-y-1.5">
                      {[
                        { key: "streaming",  label: "بث الردود (Streaming)",    desc: "عرض الرد تدريجياً أثناء التوليد",    value: state.settings.streaming  ?? true },
                        { key: "autoTitle",  label: "عنونة تلقائية",            desc: "توليد عنوان للمحادثة تلقائياً",       value: state.settings.autoTitle  ?? true },
                      ].map(s => (
                        <div key={s.key} className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(240,240,244,0.06)" }}>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-[9px] font-bold" style={{ color: "rgba(240,240,244,0.80)" }}>{s.label}</div>
                            <div className="text-[7px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.desc}</div>
                          </div>
                          <motion.button
                            onClick={() => dispatch({ type: "SET_SETTINGS", patch: { [s.key]: !s.value } })}
                            className="flex-shrink-0 w-10 h-5 rounded-full relative"
                            style={{ background: s.value ? "rgba(34,197,94,0.8)" : "rgba(255,255,255,0.12)", border: `1px solid ${s.value ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.15)"}` }}
                            whileTap={{ scale: 0.95 }}>
                            <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                              animate={{ left: s.value ? "calc(100% - 18px)" : "2px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Temperature slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(240,240,244,0.35)" }}>درجة الإبداع (Temperature)</div>
                      <span className="text-[10px] font-black font-mono" style={{ color: "rgba(240,240,244,0.85)" }}>
                        {(state.settings.aiTemperature ?? 0.7).toFixed(1)}
                      </span>
                    </div>
                    <input type="range" min="0" max="2" step="0.1"
                      value={state.settings.aiTemperature ?? 0.7}
                      onChange={e => dispatch({ type: "SET_SETTINGS", patch: { aiTemperature: parseFloat(e.target.value) } })}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: "rgba(240,240,244,0.8)", background: "rgba(240,240,244,0.12)" }} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>دقيق 0</span>
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>متوازن 1</span>
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>إبداعي 2</span>
                    </div>
                  </div>

                  {/* Max tokens */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(240,240,244,0.35)" }}>الحد الأقصى للرموز</div>
                      <span className="text-[10px] font-black font-mono" style={{ color: "rgba(240,240,244,0.85)" }}>
                        {state.settings.aiMaxTokens ?? 4096}
                      </span>
                    </div>
                    <input type="range" min="512" max="32768" step="512"
                      value={state.settings.aiMaxTokens ?? 4096}
                      onChange={e => dispatch({ type: "SET_SETTINGS", patch: { aiMaxTokens: parseInt(e.target.value) } })}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: "rgba(240,240,244,0.8)", background: "rgba(240,240,244,0.12)" }} />
                    <div className="flex justify-between mt-1">
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>512</span>
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>16K</span>
                      <span className="text-[6px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>32K</span>
                    </div>
                  </div>

                  {/* Top-P */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "rgba(240,240,244,0.35)" }}>تنوّع المخرجات (Top-P)</div>
                      <span className="text-[10px] font-black font-mono" style={{ color: "rgba(240,240,244,0.85)" }}>
                        {(state.settings.aiTopP ?? 1.0).toFixed(2)}
                      </span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.05"
                      value={state.settings.aiTopP ?? 1.0}
                      onChange={e => dispatch({ type: "SET_SETTINGS", patch: { aiTopP: parseFloat(e.target.value) } })}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: "rgba(240,240,244,0.8)", background: "rgba(240,240,244,0.12)" }} />
                  </div>

                  {/* Reset button */}
                  <motion.button
                    onClick={() => dispatch({ type: "SET_SETTINGS", patch: { aiTemperature: 0.7, aiMaxTokens: 4096, aiTopP: 1.0, streaming: true, autoTitle: true } })}
                    className="w-full py-2 rounded-xl text-[9px] font-bold tracking-wide"
                    style={{ background: "rgba(240,240,244,0.04)", border: "1px solid rgba(240,240,244,0.12)", color: "rgba(240,240,244,0.55)" }}
                    whileHover={{ background: "rgba(240,240,244,0.08)", color: "rgba(240,240,244,0.80)" }}
                    whileTap={{ scale: 0.97 }}>
                    إعادة ضبط الإعدادات للافتراضي
                  </motion.button>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(240,240,244,0.06)" }}>
                <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>
                  النشط: <span style={{ color: "rgba(240,240,244,0.70)" }}>{state.activeProvider.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {["Ctrl", "Shift", "A"].map((k, i) => (
                    <span key={k} className="flex items-center gap-0.5">
                      {i > 0 && <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.18)" }}>+</span>}
                      <kbd className="text-[7px] px-1.5 py-0.5 rounded font-mono"
                        style={{ background: "#0a0a12", border: "1px solid rgba(240,240,244,0.15)", color: "rgba(240,240,244,0.55)" }}>
                        {k}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(240,240,244,0.25),transparent)" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
