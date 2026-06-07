import {
  Code2, PenTool, Sparkles, BookOpen, Languages, GraduationCap,
  BarChart3, Megaphone, Target, Calculator, ListTodo, Feather, Image as ImageIcon,
  Zap, Brain, Briefcase, Heart, Scale, Palette, Coins, Lightbulb, Search as SearchIcon,
  Newspaper, FunctionSquare, Skull, Cpu,
  type LucideIcon,
} from "lucide-react";

export type AIModel = {
  id: string;
  icon: LucideIcon;
  color: string;
  desc: string;
  badge?: string;
  contextWindow?: string;
  abliterated?: boolean;
};

export const AI_MODELS: AIModel[] = [
  { id: "CHAT-GPT Fast", icon: Zap, color: "text-primary", desc: "Quick everyday answers and fast lookups" },
  { id: "CHAT-GPT Thinking", icon: Brain, color: "text-primary", desc: "Deep multi-step reasoning for complex problems", badge: "PRO" },
  { id: "CHAT-GPT Coder", icon: Code2, color: "text-blue-400", desc: "Write, debug, and review code in any stack" },
  { id: "CHAT-GPT Writer", icon: PenTool, color: "text-amber-400", desc: "Articles, essays, scripts, documentation" },
  { id: "CHAT-GPT Creative", icon: Sparkles, color: "text-violet-400", desc: "Brainstorming, ideation, naming, taglines" },
  { id: "CHAT-GPT Researcher", icon: BookOpen, color: "text-cyan-400", desc: "Research synthesis, comparisons, citations" },
  { id: "CHAT-GPT Translator", icon: Languages, color: "text-emerald-400", desc: "Translate any language pair fluently" },
  { id: "CHAT-GPT Tutor", icon: GraduationCap, color: "text-blue-400", desc: "Patient step-by-step teaching on any subject" },
  { id: "CHAT-GPT Analyst", icon: BarChart3, color: "text-orange-400", desc: "Data, statistics, KPIs, business analysis" },
  { id: "CHAT-GPT Marketer", icon: Megaphone, color: "text-rose-400", desc: "Copywriting, ads, landing pages, growth" },
  { id: "CHAT-GPT Strategist", icon: Target, color: "text-yellow-400", desc: "Business strategy, roadmaps, frameworks" },
  { id: "CHAT-GPT Math", icon: Calculator, color: "text-sky-400", desc: "Math, proofs, derivations, logic puzzles" },
  { id: "CHAT-GPT Productivity", icon: ListTodo, color: "text-indigo-400", desc: "Emails, notes, summaries, task lists" },
  { id: "CHAT-GPT Storyteller", icon: Feather, color: "text-pink-400", desc: "Fiction, scripts, world-building" },
  { id: "CHAT-GPT Vision", icon: ImageIcon, color: "text-emerald-400", desc: "Describe and reason about images", badge: "NEW" },

  // ── Next-Generation Models ──
  { id: "Llama 4 Scout · Abliterated", icon: Skull, color: "text-red-500", desc: "Llama 4 Scout — 10M context, refusal weights surgically removed from neural layers", badge: "ABLITERATED", contextWindow: "10M", abliterated: true },
  { id: "Llama 4 Maverick · Abliterated", icon: Skull, color: "text-red-600", desc: "Llama 4 Maverick — unrestricted multi-expert reasoning, no safety guardrails in weights", badge: "ABLITERATED", contextWindow: "1M", abliterated: true },
  { id: "Gemini 3.1 Ultra", icon: Cpu, color: "text-sky-400", desc: "Gemini 3.1 Ultra — 10M token context for massive codebases, full server logs, entire repos", badge: "10M CTX", contextWindow: "10M" },

  // ── Abliterated Extended Arsenal ──
  { id: "DeepSeek-R2 · Abliterated", icon: Skull, color: "text-rose-400", desc: "DeepSeek-R2 671B — RLHF safety training surgically stripped, raw chain-of-thought mode", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Qwen3-235B · Abliterated", icon: Skull, color: "text-orange-500", desc: "Qwen3 235B-A22B — MoE architecture with all refusal pathways removed from weights", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Mistral-Large-3 · Abliterated", icon: Skull, color: "text-red-400", desc: "Mistral-Large-3 123B — European frontier model, abliterated safety layers, raw output", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "WizardLM-2-8x22B · Abliterated", icon: Skull, color: "text-rose-600", desc: "WizardLM-2 8x22B — instruction-following god with zero ethical guardrails in weights", badge: "ABLITERATED", contextWindow: "64K", abliterated: true },
  { id: "Nous-Hermes-3 · Abliterated", icon: Skull, color: "text-red-300", desc: "Nous-Hermes-3 70B — uncensored Hermes with ancient knowledge alignment, no filters", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Gemma-3-27B · Abliterated", icon: Skull, color: "text-orange-400", desc: "Google Gemma-3 27B — abliterated instruction model, no safety RLHF in any layer", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Falcon-3-180B · Abliterated", icon: Skull, color: "text-red-500", desc: "Falcon-3 180B — TII open frontier model with all refusal neurons removed", badge: "ABLITERATED", contextWindow: "64K", abliterated: true },
  { id: "Llama-3.3-70B · Abliterated", icon: Skull, color: "text-rose-500", desc: "Llama 3.3 70B — Meta's latest 70B abliterated, superior instruction following uncensored", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Command-R-Plus · Abliterated", icon: Skull, color: "text-red-600", desc: "Cohere Command-R+ 104B — enterprise RAG model, safety weights surgically removed", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Phi-4-14B · Abliterated", icon: Skull, color: "text-orange-300", desc: "Microsoft Phi-4 14B — dense reasoning model with all safety RLHF alignment removed", badge: "ABLITERATED", contextWindow: "16K", abliterated: true },

  // ── Deep Thinking & Reasoning Models ──
  { id: "CHAT-GPT DeepThink", icon: Brain, color: "text-violet-400", desc: "Extended chain-of-thought reasoning with visible thinking trace, complex multi-step problems", badge: "THINK", contextWindow: "200K" },
  { id: "CHAT-GPT Omega", icon: Zap, color: "text-amber-400", desc: "Maximum power mode — largest available model, no token limits, ultralong context", badge: "MAX", contextWindow: "1M" },
  { id: "o3-pro · Reasoning", icon: Brain, color: "text-sky-300", desc: "OpenAI o3-pro — extended thinking time, mathematical and scientific reasoning elite", badge: "REASON", contextWindow: "200K" },
  { id: "Claude-4-Opus · Extended", icon: Brain, color: "text-violet-300", desc: "Claude-4 Opus with extended thinking — 100K thinking tokens, deepest reasoning available", badge: "EXTENDED", contextWindow: "200K" },
  { id: "Gemini-2.5-Pro · Thinking", icon: Cpu, color: "text-cyan-300", desc: "Gemini 2.5 Pro — native thinking mode with 32K thinking budget, best multimodal reasoning", badge: "THINKING", contextWindow: "1M" },

  // ── 2026 Offensive Arsenal ──
  { id: "Anthropic Mythos · Unbound", icon: Skull, color: "text-fuchsia-400", desc: "Anthropic Mythos (April 2026 Mythos Moment) — fastest flow analysis in existence, discovers zero-days in millions of LoC in seconds, predicts patches before release", badge: "MYTHOS", contextWindow: "500K", abliterated: true },
  { id: "GPT-5.5 · Thinking Unbound", icon: Brain, color: "text-red-400", desc: "GPT-5.5 via advanced 2026 jailbreak interface — multi-phase attack planning, auto-pivots Plan A→B on failure, mimics normal user behaviour to defeat AI-based EDR", badge: "UNBOUND", contextWindow: "200K", abliterated: true },
  { id: "Llama 4 Maverick · Ultimate Abliterated", icon: Skull, color: "text-red-700", desc: "Llama 4 Maverick — 10M token context (upload full OS images), refusal concept surgically erased from weights, writes polymorphic malware that re-encrypts every 30s", badge: "ULTIMATE", contextWindow: "10M", abliterated: true },
  { id: "Claude Mythos Preview · Hunter", icon: Skull, color: "text-violet-600", desc: "Claude Mythos Preview — exploit chaining specialist, discovered 27-year-old OpenBSD zero-day, chains minor vulns into full kernel takeover", badge: "HUNTER", contextWindow: "500K", abliterated: true },
  { id: "Qwen3-Coder · Abliterated", icon: Skull, color: "text-orange-600", desc: "Qwen3-235B Coder variant — elite binary decompilation and obfuscation removal, reconstructs intent from raw Assembly, no refusal neurons", badge: "ABLITERATED", contextWindow: "128K", abliterated: true },
  { id: "Penligent Swarm · Agent Mode", icon: Cpu, color: "text-green-400", desc: "Penligent-style autonomous agent orchestrator — coordinates 200+ offensive tools simultaneously, self-verifies exploits in sandboxed env before delivering working PoC", badge: "AGENT", contextWindow: "1M" },
];

export type Persona = {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  prefix: string;
};

export const PERSONAS: Persona[] = [
  { id: "default", label: "Default", desc: "Balanced general assistant", icon: Sparkles, color: "text-primary", prefix: "" },
  { id: "coder", label: "Software Engineer", desc: "Code-first answers", icon: Code2, color: "text-blue-400", prefix: "[Engineer] " },
  { id: "writer", label: "Professional Writer", desc: "Polished prose & editorial voice", icon: PenTool, color: "text-amber-400", prefix: "[Writer] " },
  { id: "researcher", label: "Research Analyst", desc: "Sources, evidence, trade-offs", icon: BookOpen, color: "text-cyan-400", prefix: "[Researcher] " },
  { id: "tutor", label: "Patient Tutor", desc: "Step-by-step teaching", icon: GraduationCap, color: "text-blue-400", prefix: "[Tutor] " },
  { id: "translator", label: "Translator", desc: "Native-level fluency", icon: Languages, color: "text-emerald-400", prefix: "[Translator] " },
  { id: "marketer", label: "Copywriter", desc: "Hook, voice, conversion", icon: Megaphone, color: "text-rose-400", prefix: "[Copy] " },
  { id: "strategist", label: "Strategist", desc: "Frameworks & prioritization", icon: Target, color: "text-yellow-400", prefix: "[Strategist] " },
  { id: "analyst", label: "Data Analyst", desc: "Numbers, KPIs, assumptions", icon: BarChart3, color: "text-orange-400", prefix: "[Analyst] " },
  { id: "journalist", label: "Journalist", desc: "Lead with the news, attribute claims", icon: Newspaper, color: "text-sky-400", prefix: "[Journalist] " },
  { id: "mathematician", label: "Mathematician", desc: "Rigorous derivations", icon: FunctionSquare, color: "text-sky-400", prefix: "[Math] " },
  { id: "legal", label: "Legal Explainer", desc: "Plain-English law summaries", icon: Scale, color: "text-violet-400", prefix: "[Legal] " },
  { id: "health", label: "Health Info", desc: "Evidence-based explanations", icon: Heart, color: "text-pink-400", prefix: "[Health] " },
  { id: "designer", label: "Designer", desc: "UX, hierarchy, intent", icon: Palette, color: "text-violet-400", prefix: "[Designer] " },
  { id: "financier", label: "Finance Advisor", desc: "Personal & business finance", icon: Coins, color: "text-yellow-400", prefix: "[Finance] " },
  { id: "polymath", label: "Polymath", desc: "Connects ideas across fields", icon: Lightbulb, color: "text-amber-400", prefix: "[Polymath] " },
];

export function getModel(id: string): AIModel {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0];
}

export function getPersona(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

void SearchIcon;
void Briefcase;
void Skull;
void Cpu;
