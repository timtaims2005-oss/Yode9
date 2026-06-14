import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Brain, Shield, Globe, Bot, Layers, Sparkles,
  Code2, Network, Database, Terminal, Star, ArrowRight,
  Cpu, Search, Lock, Flame, CheckCircle2, Rocket,
} from "lucide-react";

const APP_VERSION = "3.0.0";
const STORAGE_KEY = "mr7-whats-new-seen-v3";

export function useWhatsNewShouldShow(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== APP_VERSION;
}

type ChangeEntry = {
  icon: React.ElementType;
  color: string;
  title: string;
  titleAr: string;
  desc: string;
  tag?: "NEW" | "IMPROVED" | "HOT" | "AI";
};

const CHANGES: ChangeEntry[] = [
  {
    icon: Brain,
    color: "#e21227",
    title: "Neural Thinking Indicator",
    titleAr: "مؤشر التفكير العصبي",
    desc: "Futuristic animated brain indicator with real-time phase tracking, elapsed timer, and neural scanning ring while AI processes your query.",
    tag: "NEW",
  },
  {
    icon: Rocket,
    color: "#a78bfa",
    title: "Arsenal Hub — 70+ Modules",
    titleAr: "مركز الترسانة — 70+ وحدة",
    desc: "Unified launcher for 70+ AI security tools with Chain Builder for automation pipelines between modules.",
    tag: "IMPROVED",
  },
  {
    icon: Globe,
    color: "#3b82f6",
    title: "50+ AI Providers Catalog",
    titleAr: "كتالوج 50+ مزود ذكاء اصطناعي",
    desc: "Expanded provider catalog with OpenAI, Anthropic, Groq, Google, xAI, Mistral, Perplexity, DeepSeek, Together AI, Fireworks, Cohere, NVIDIA NIM, Azure, Ollama, LM Studio and 35+ more.",
    tag: "IMPROVED",
  },
  {
    icon: Layers,
    color: "#10b981",
    title: "Scrollable TopBar Navigation",
    titleAr: "شريط تنقل قابل للتمرير",
    desc: "TopBar buttons now scroll horizontally with animated left/right arrows when overflow is detected — access all tools without clutter.",
    tag: "NEW",
  },
  {
    icon: Star,
    color: "#f59e0b",
    title: "Onboarding Feature Tour",
    titleAr: "جولة تعريفية بالميزات",
    desc: "6-slide onboarding tour showcasing Chat Mode, Agent IDE, Dark Web Search, Council of 105, Arsenal Hub, and Godmode.",
    tag: "NEW",
  },
  {
    icon: Cpu,
    color: "#06b6d4",
    title: "Godmode — 14 Combat Modes",
    titleAr: "Godmode — 14 وضع قتالي",
    desc: "Godmode now supports 14 parallel champion strategies: Classic, UltraPlinian, Reason, Hunter, Agent, Extended, MaxOverdrive, Unbound, JioReason, Mythos, Ultimate, Think, Max, Abliterated.",
    tag: "IMPROVED",
  },
  {
    icon: Network,
    color: "#ec4899",
    title: "Council of 105 Brains",
    titleAr: "مجلس 105 عقل",
    desc: "Full council now runs 105 specialist AI brains in parallel with smart router, fusion synthesis, scoring mode and debate mode.",
    tag: "HOT",
  },
  {
    icon: Database,
    color: "#8b5cf6",
    title: "Local Model Integration",
    titleAr: "تكامل النماذج المحلية",
    desc: "Connect Ollama, LM Studio, or vLLM — pull 100+ uncensored models locally with one click. Full offline AI capability.",
    tag: "IMPROVED",
  },
  {
    icon: Shield,
    color: "#f97316",
    title: "Neural Matrix — AI Selector",
    titleAr: "المصفوفة العصبية — منتقي الذكاء الاصطناعي",
    desc: "Visual model selector with CLASSIFIED / ELITE / ADVANCED tiers, real-time power stats, and one-click model switching.",
    tag: "IMPROVED",
  },
  {
    icon: Code2,
    color: "#22d3ee",
    title: "Monaco Editor + Code Templates",
    titleAr: "محرر موناكو + قوالب الكود",
    desc: "Full VS Code-style editor with syntax highlighting, 40+ security code templates across exploit, OSINT, malware, network, and crypto categories.",
    tag: "IMPROVED",
  },
  {
    icon: Terminal,
    color: "#e21227",
    title: "Shell Generator v2",
    titleAr: "مولد الشيل v2",
    desc: "Generate reverse shells, web shells, bind shells in 20+ languages with obfuscation, encoding, and one-click copy.",
    tag: "IMPROVED",
  },
  {
    icon: Search,
    color: "#10b981",
    title: "Dark Web Intelligence",
    titleAr: "استخبارات الويب المظلم",
    desc: "Threat intelligence aggregation from Shodan, Censys, GreyNoise, AlienVault OTX, CVE databases, and dark web monitors.",
    tag: "HOT",
  },
];

const TAG_STYLES: Record<string, string> = {
  NEW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  IMPROVED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  HOT: "bg-primary/15 text-primary border-primary/30",
  AI: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

interface WhatsNewModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #111111 0%, #0a0a0a 100%)",
              border: "1px solid #1f1f1f",
              boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(226,18,39,0.1)",
            }}
          >
            {/* Header glow strip */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, transparent, #e21227, #a78bfa, #e21227, transparent)" }}
            />

            {/* Header */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-4 flex-shrink-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "radial-gradient(circle, rgba(226,18,39,0.2) 0%, rgba(226,18,39,0.05) 100%)",
                  border: "1px solid rgba(226,18,39,0.3)",
                  boxShadow: "0 0 20px rgba(226,18,39,0.2)",
                }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">What's New</h2>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}
                  >
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  كل ما هو جديد ومحسّن في KaliGPT
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Changelog list */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
              {CHANGES.map((change, i) => {
                const Icon = change.icon;
                const isActive = activeIdx === i;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    onClick={() => setActiveIdx(isActive ? null : i)}
                    className="group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: isActive ? `${change.color}0a` : "transparent",
                      border: `1px solid ${isActive ? change.color + "30" : "transparent"}`,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = `${change.color}06`;
                        (e.currentTarget as HTMLElement).style.border = `1px solid ${change.color}20`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                      }
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: `${change.color}15`,
                        border: `1px solid ${change.color}30`,
                      }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: change.color, width: 18, height: 18 }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-foreground">{change.title}</span>
                        {change.tag && (
                          <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${TAG_STYLES[change.tag]}`}>
                            {change.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-arabic">{change.titleAr}</p>
                      <AnimatePresence>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-[11.5px] text-muted-foreground/80 mt-2 leading-relaxed"
                          >
                            {change.desc}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <ArrowRight
                      className="w-3.5 h-3.5 flex-shrink-0 mt-1.5 transition-transform"
                      style={{
                        color: isActive ? change.color : "rgba(255,255,255,0.2)",
                        transform: isActive ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid #1f1f1f", background: "rgba(0,0,0,0.3)" }}
            >
              <span className="text-[11px] text-muted-foreground/40 font-mono">
                mr7.ai · KaliGPT v{APP_VERSION}
              </span>
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 text-[12px] font-medium px-4 py-2 rounded-lg transition-all"
                style={{
                  background: "rgba(226,18,39,0.12)",
                  border: "1px solid rgba(226,18,39,0.25)",
                  color: "#e21227",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(226,18,39,0.22)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(226,18,39,0.12)";
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم، انطلق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
