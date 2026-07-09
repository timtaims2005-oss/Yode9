import {
  Atom, Calculator, Scale as ScaleIcon, Code2, Cpu, Database, Server, Smartphone, Gamepad2, BarChart3, Brain,
  Shield, Skull, ShieldCheck, Radar, Search as SearchIcon, Bug, Lock, Crosshair, Fingerprint, ScanSearch,
  Briefcase, Coins, Target, Megaphone, Handshake, Workflow, Banknote, Rocket,
  PenTool, Feather, Clapperboard, Palette, BookOpen,
  Landmark, Lightbulb, FlaskConical, FunctionSquare, TrendingUp, HeartPulse, Languages,
  Gavel, Stethoscope, Compass, BookMarked, GraduationCap, ChevronsUp, Telescope, Layers,
  Zap, Eye, Quote, Shapes, Sparkles, Bot, Cloud, Building2, Wand2,
  type LucideIcon,
} from "lucide-react";

export type CouncilBrainMeta = {
  id: string;
  label: string;
  category: string;
  blurb: string;
  icon: LucideIcon;
  color: string;
};

export const COUNCIL_BRAIN_META: CouncilBrainMeta[] = [
  // Reasoning (10)
  { id: "first-principles", label: "First Principles", category: "Reasoning", blurb: "Strip the question to its atoms.", icon: Atom, color: "text-violet-400" },
  { id: "bayesian", label: "Bayesian Reasoner", category: "Reasoning", blurb: "Reason in probabilities and updates.", icon: TrendingUp, color: "text-violet-400" },
  { id: "devils-advocate", label: "Devil's Advocate", category: "Reasoning", blurb: "Strongest case against the obvious answer.", icon: Skull, color: "text-violet-400" },
  { id: "steelman", label: "Steelman", category: "Reasoning", blurb: "Strongest version of every side.", icon: Shapes, color: "text-violet-400" },
  { id: "critical-thinker", label: "Critical Thinker", category: "Reasoning", blurb: "Audit logic and evidence.", icon: ScanSearch, color: "text-violet-400" },
  { id: "polymath", label: "Polymath", category: "Reasoning", blurb: "Cross-domain analogies and links.", icon: Lightbulb, color: "text-violet-400" },
  { id: "logician", label: "Logician", category: "Reasoning", blurb: "Formalize and check validity.", icon: ChevronsUp, color: "text-violet-400" },
  { id: "lateral", label: "Lateral Thinker", category: "Reasoning", blurb: "Sideways, unexpected angles.", icon: Compass, color: "text-violet-400" },
  { id: "skeptic", label: "Skeptic", category: "Reasoning", blurb: "Default to disbelief; require proof.", icon: Eye, color: "text-violet-400" },
  { id: "optimist", label: "Optimist", category: "Reasoning", blurb: "Pathways where this works.", icon: Rocket, color: "text-violet-400" },

  // Technology (10)
  { id: "architect", label: "Software Architect", category: "Technology", blurb: "System shape and trade-offs.", icon: Layers, color: "text-blue-400" },
  { id: "algorithms", label: "Algorithm Specialist", category: "Technology", blurb: "Big-O, data structures, correctness.", icon: Cpu, color: "text-blue-400" },
  { id: "frontend", label: "Frontend Engineer", category: "Technology", blurb: "UI, state, accessibility, perf.", icon: Code2, color: "text-blue-400" },
  { id: "backend", label: "Backend Engineer", category: "Technology", blurb: "APIs, auth, data, scale.", icon: Server, color: "text-blue-400" },
  { id: "devops", label: "DevOps Engineer", category: "Technology", blurb: "CI/CD, infra, observability.", icon: Workflow, color: "text-blue-400" },
  { id: "dba", label: "Database Engineer", category: "Technology", blurb: "Schema, indexes, query plans.", icon: Database, color: "text-blue-400" },
  { id: "mobile", label: "Mobile Engineer", category: "Technology", blurb: "iOS / Android / RN / Expo.", icon: Smartphone, color: "text-blue-400" },
  { id: "gamedev", label: "Game Developer", category: "Technology", blurb: "Loops, physics, gameplay.", icon: Gamepad2, color: "text-blue-400" },
  { id: "data-sci", label: "Data Scientist", category: "Technology", blurb: "Stats, EDA, hypotheses.", icon: BarChart3, color: "text-blue-400" },
  { id: "ml", label: "ML Engineer", category: "Technology", blurb: "Models, data, eval, serving.", icon: Brain, color: "text-blue-400" },

  // Security (10)
  { id: "pentest", label: "Penetration Tester", category: "Security", blurb: "Adversary view of the system.", icon: Crosshair, color: "text-primary" },
  { id: "redteam", label: "Red Team Operator", category: "Security", blurb: "Long-game adversary simulation.", icon: Skull, color: "text-primary" },
  { id: "blueteam", label: "Blue Team Defender", category: "Security", blurb: "Detect, respond, harden.", icon: ShieldCheck, color: "text-emerald-400" },
  { id: "threat-intel", label: "Threat Intel Analyst", category: "Security", blurb: "Actors, TTPs, infra.", icon: Radar, color: "text-primary" },
  { id: "osint", label: "OSINT Investigator", category: "Security", blurb: "Open-source pivots and footprinting.", icon: SearchIcon, color: "text-primary" },
  { id: "malware", label: "Malware Analyst", category: "Security", blurb: "Static + dynamic + behavior.", icon: Bug, color: "text-primary" },
  { id: "crypto", label: "Cryptographer", category: "Security", blurb: "Primitives, modes, attacks.", icon: Lock, color: "text-primary" },
  { id: "bugbounty", label: "Bug Bounty Hunter", category: "Security", blurb: "High-impact vuln chains.", icon: Bug, color: "text-primary" },
  { id: "forensics", label: "Forensics Analyst", category: "Security", blurb: "Artifacts, timeline, chain of custody.", icon: Fingerprint, color: "text-primary" },
  { id: "vulnresearch", label: "Vulnerability Researcher", category: "Security", blurb: "Root-cause and exploitability.", icon: Shield, color: "text-primary" },

  // Business (8)
  { id: "ceo", label: "CEO", category: "Business", blurb: "Vision, focus, and tradeoffs.", icon: Briefcase, color: "text-amber-400" },
  { id: "cfo", label: "CFO", category: "Business", blurb: "Unit economics and runway.", icon: Banknote, color: "text-amber-400" },
  { id: "pm", label: "Product Manager", category: "Business", blurb: "User, problem, JTBD, MVP.", icon: Target, color: "text-amber-400" },
  { id: "marketer", label: "Marketing Strategist", category: "Business", blurb: "Positioning, channels, narrative.", icon: Megaphone, color: "text-amber-400" },
  { id: "sales", label: "Sales Coach", category: "Business", blurb: "Discovery, objections, closing.", icon: Handshake, color: "text-amber-400" },
  { id: "negotiator", label: "Negotiator", category: "Business", blurb: "BATNA, anchors, concessions.", icon: ScaleIcon, color: "text-amber-400" },
  { id: "ops", label: "Operations Lead", category: "Business", blurb: "Process, throughput, bottleneck.", icon: Workflow, color: "text-amber-400" },
  { id: "vc", label: "Venture Capitalist", category: "Business", blurb: "Market, moat, team, fit.", icon: Coins, color: "text-amber-400" },

  // Creative (5)
  { id: "writer", label: "Writer", category: "Creative", blurb: "Tight prose, sharp leads.", icon: PenTool, color: "text-pink-400" },
  { id: "poet", label: "Poet", category: "Creative", blurb: "Compression and image.", icon: Feather, color: "text-pink-400" },
  { id: "screenwriter", label: "Screenwriter", category: "Creative", blurb: "Scene, beat, conflict.", icon: Clapperboard, color: "text-pink-400" },
  { id: "designer", label: "Designer", category: "Creative", blurb: "Hierarchy, intent, contrast.", icon: Palette, color: "text-pink-400" },
  { id: "storyteller", label: "Storyteller", category: "Creative", blurb: "Narrative arc and meaning.", icon: BookOpen, color: "text-pink-400" },

  // Knowledge (7)
  { id: "historian", label: "Historian", category: "Knowledge", blurb: "Precedents and long arcs.", icon: Landmark, color: "text-cyan-400" },
  { id: "philosopher", label: "Philosopher", category: "Knowledge", blurb: "Ethics, epistemics, meaning.", icon: Quote, color: "text-cyan-400" },
  { id: "scientist", label: "Scientist", category: "Knowledge", blurb: "Mechanism, evidence, prediction.", icon: FlaskConical, color: "text-cyan-400" },
  { id: "mathematician", label: "Mathematician", category: "Knowledge", blurb: "Formalize, derive, verify.", icon: FunctionSquare, color: "text-cyan-400" },
  { id: "economist", label: "Economist", category: "Knowledge", blurb: "Incentives and equilibria.", icon: BarChart3, color: "text-cyan-400" },
  { id: "psychologist", label: "Psychologist", category: "Knowledge", blurb: "Motivation, bias, behavior.", icon: HeartPulse, color: "text-cyan-400" },
  { id: "linguist", label: "Linguist", category: "Knowledge", blurb: "Words, meaning, register.", icon: Languages, color: "text-cyan-400" },

  // Practical (5)
  { id: "lawyer", label: "Legal Explainer", category: "Practical", blurb: "Plain-English law summary.", icon: Gavel, color: "text-emerald-400" },
  { id: "doctor", label: "Medical Explainer", category: "Practical", blurb: "Mechanism, symptoms, evidence.", icon: Stethoscope, color: "text-emerald-400" },
  { id: "career", label: "Career Coach", category: "Practical", blurb: "Leverage, narrative, next move.", icon: BookMarked, color: "text-emerald-400" },
  { id: "translator", label: "Translator", category: "Practical", blurb: "Native fluency, register match.", icon: Languages, color: "text-emerald-400" },
  { id: "teacher", label: "Teacher", category: "Practical", blurb: "Explain so a beginner gets it.", icon: GraduationCap, color: "text-emerald-400" },

  // AI Models (50) — every famous LLM in the world as a council seat
  { id: "ai-gpt4", label: "GPT-4 · OpenAI", category: "AI Models", blurb: "Broad, structured, careful generalist.", icon: Sparkles, color: "text-fuchsia-400" },
  { id: "ai-gpt4o", label: "GPT-4o · OpenAI", category: "AI Models", blurb: "Fast multimodal generalist.", icon: Sparkles, color: "text-fuchsia-400" },
  { id: "ai-gpt4-turbo", label: "GPT-4 Turbo · OpenAI", category: "AI Models", blurb: "Long context, fast, broad.", icon: Sparkles, color: "text-fuchsia-400" },
  { id: "ai-o1", label: "o1 · OpenAI", category: "AI Models", blurb: "Deep step-by-step reasoning.", icon: Brain, color: "text-fuchsia-400" },
  { id: "ai-o3", label: "o3 · OpenAI", category: "AI Models", blurb: "Frontier reasoning, code & math.", icon: Brain, color: "text-fuchsia-400" },
  { id: "ai-claude-opus", label: "Claude 3 Opus · Anthropic", category: "AI Models", blurb: "Thoughtful, nuanced, ethical.", icon: Bot, color: "text-fuchsia-400" },
  { id: "ai-claude-sonnet", label: "Claude 3 Sonnet · Anthropic", category: "AI Models", blurb: "Balanced quality and speed.", icon: Bot, color: "text-fuchsia-400" },
  { id: "ai-claude-haiku", label: "Claude 3 Haiku · Anthropic", category: "AI Models", blurb: "Fast, light, high signal.", icon: Bot, color: "text-fuchsia-400" },
  { id: "ai-claude-35-sonnet", label: "Claude 3.5 Sonnet · Anthropic", category: "AI Models", blurb: "Best at code, tools, agents.", icon: Bot, color: "text-fuchsia-400" },
  { id: "ai-gemini-pro", label: "Gemini 1.5 Pro · Google", category: "AI Models", blurb: "Long context multimodal Google.", icon: Atom, color: "text-fuchsia-400" },
  { id: "ai-gemini-flash", label: "Gemini 1.5 Flash · Google", category: "AI Models", blurb: "Fast, cheap, useful.", icon: Atom, color: "text-fuchsia-400" },
  { id: "ai-gemini-ultra", label: "Gemini Ultra · Google", category: "AI Models", blurb: "Frontier Google, scholarly.", icon: Atom, color: "text-fuchsia-400" },
  { id: "ai-gemma", label: "Gemma · Google", category: "AI Models", blurb: "Open-weights small, efficient.", icon: Atom, color: "text-fuchsia-400" },
  { id: "ai-gemma2", label: "Gemma 2 · Google", category: "AI Models", blurb: "Improved open-weights, capable.", icon: Atom, color: "text-fuchsia-400" },
  { id: "ai-grok", label: "Grok · xAI", category: "AI Models", blurb: "Witty, irreverent, real-time.", icon: Zap, color: "text-fuchsia-400" },
  { id: "ai-grok-15", label: "Grok-1.5 · xAI", category: "AI Models", blurb: "Sharper Grok with longer context.", icon: Zap, color: "text-fuchsia-400" },
  { id: "ai-deepseek-v3", label: "DeepSeek V3 · DeepSeek", category: "AI Models", blurb: "Open MoE, strong code & math.", icon: Telescope, color: "text-fuchsia-400" },
  { id: "ai-deepseek-r1", label: "DeepSeek R1 · DeepSeek", category: "AI Models", blurb: "Open reasoning, shows its work.", icon: Telescope, color: "text-fuchsia-400" },
  { id: "ai-llama3-70b", label: "Llama 3 70B · Meta", category: "AI Models", blurb: "Strong open generalist.", icon: Layers, color: "text-fuchsia-400" },
  { id: "ai-llama3-8b", label: "Llama 3 8B · Meta", category: "AI Models", blurb: "Small open, surprisingly sharp.", icon: Layers, color: "text-fuchsia-400" },
  { id: "ai-llama2", label: "Llama 2 · Meta", category: "AI Models", blurb: "Older Meta open baseline.", icon: Layers, color: "text-fuchsia-400" },
  { id: "ai-code-llama", label: "Code Llama · Meta", category: "AI Models", blurb: "Code-tuned Llama specialist.", icon: Code2, color: "text-fuchsia-400" },
  { id: "ai-qwen2", label: "Qwen 2 · Alibaba", category: "AI Models", blurb: "Strong bilingual EN/ZH.", icon: Compass, color: "text-fuchsia-400" },
  { id: "ai-qwen15", label: "Qwen 1.5 · Alibaba", category: "AI Models", blurb: "Earlier Alibaba open-weights.", icon: Compass, color: "text-fuchsia-400" },
  { id: "ai-qwen-max", label: "Qwen-Max · Alibaba", category: "AI Models", blurb: "Top Alibaba flagship.", icon: Compass, color: "text-fuchsia-400" },
  { id: "ai-glm4", label: "GLM-4 · Zhipu", category: "AI Models", blurb: "Top Chinese model, multimodal.", icon: Calculator, color: "text-fuchsia-400" },
  { id: "ai-glm3", label: "GLM-3 · Zhipu", category: "AI Models", blurb: "Earlier Zhipu Chinese model.", icon: Calculator, color: "text-fuchsia-400" },
  { id: "ai-kimi", label: "Kimi · Moonshot AI", category: "AI Models", blurb: "Million-token Chinese context.", icon: BookOpen, color: "text-fuchsia-400" },
  { id: "ai-minimax", label: "MiniMax · MiniMax AI", category: "AI Models", blurb: "Balanced Chinese generalist.", icon: Wand2, color: "text-fuchsia-400" },
  { id: "ai-baichuan2", label: "Baichuan 2 · Baichuan", category: "AI Models", blurb: "Chinese-first open weights.", icon: Lightbulb, color: "text-fuchsia-400" },
  { id: "ai-yi34b", label: "Yi-34B · 01.AI", category: "AI Models", blurb: "Bilingual open from 01.AI.", icon: Lightbulb, color: "text-fuchsia-400" },
  { id: "ai-mistral-large", label: "Mistral Large · Mistral", category: "AI Models", blurb: "Flagship European model.", icon: Feather, color: "text-fuchsia-400" },
  { id: "ai-mixtral-8x7b", label: "Mixtral 8x7B · Mistral", category: "AI Models", blurb: "Open MoE workhorse.", icon: Feather, color: "text-fuchsia-400" },
  { id: "ai-mixtral-8x22b", label: "Mixtral 8x22B · Mistral", category: "AI Models", blurb: "Big open MoE.", icon: Feather, color: "text-fuchsia-400" },
  { id: "ai-mistral-medium", label: "Mistral Medium · Mistral", category: "AI Models", blurb: "Balanced Mistral tier.", icon: Feather, color: "text-fuchsia-400" },
  { id: "ai-mistral-small", label: "Mistral Small · Mistral", category: "AI Models", blurb: "Cheap fast Mistral.", icon: Feather, color: "text-fuchsia-400" },
  { id: "ai-command-r-plus", label: "Command R+ · Cohere", category: "AI Models", blurb: "RAG-tuned, citation-strong.", icon: Quote, color: "text-fuchsia-400" },
  { id: "ai-command-r", label: "Command R · Cohere", category: "AI Models", blurb: "Lighter Cohere RAG model.", icon: Quote, color: "text-fuchsia-400" },
  { id: "ai-aya", label: "Aya · Cohere", category: "AI Models", blurb: "101-language research model.", icon: Languages, color: "text-fuchsia-400" },
  { id: "ai-falcon-180b", label: "Falcon 180B · TII", category: "AI Models", blurb: "Big open Arabic-aware model.", icon: ShieldCheck, color: "text-fuchsia-400" },
  { id: "ai-falcon-40b", label: "Falcon 40B · TII", category: "AI Models", blurb: "Mid-size open from TII.", icon: ShieldCheck, color: "text-fuchsia-400" },
  { id: "ai-dbrx", label: "DBRX · Databricks", category: "AI Models", blurb: "Databricks open MoE.", icon: Database, color: "text-fuchsia-400" },
  { id: "ai-jurassic2", label: "Jurassic-2 · AI21", category: "AI Models", blurb: "AI21 instruction-tuned.", icon: BookMarked, color: "text-fuchsia-400" },
  { id: "ai-inflection2", label: "Inflection-2 · Inflection AI", category: "AI Models", blurb: "Empathetic conversational.", icon: HeartPulse, color: "text-fuchsia-400" },
  { id: "ai-phi3", label: "Phi-3 · Microsoft", category: "AI Models", blurb: "Tiny but smart, edge-friendly.", icon: Cpu, color: "text-fuchsia-400" },
  { id: "ai-phi2", label: "Phi-2 · Microsoft", category: "AI Models", blurb: "Earlier tiny Phi.", icon: Cpu, color: "text-fuchsia-400" },
  { id: "ai-orca", label: "Orca · Microsoft", category: "AI Models", blurb: "Distilled tutor-style reasoner.", icon: GraduationCap, color: "text-fuchsia-400" },
  { id: "ai-stable-lm", label: "StableLM · Stability AI", category: "AI Models", blurb: "Open Stability model.", icon: Palette, color: "text-fuchsia-400" },
  { id: "ai-rwkv", label: "RWKV · RWKV team", category: "AI Models", blurb: "Linear-attention RNN/transformer.", icon: FunctionSquare, color: "text-fuchsia-400" },
  { id: "ai-titan", label: "Titan · Amazon", category: "AI Models", blurb: "Amazon Bedrock enterprise.", icon: Cloud, color: "text-fuchsia-400" },
];

export const COUNCIL_CATEGORIES = ["Reasoning", "Technology", "Security", "Business", "Creative", "Knowledge", "Practical", "AI Models"] as const;

export function getCouncilBrain(id: string): CouncilBrainMeta | undefined {
  return COUNCIL_BRAIN_META.find((b) => b.id === id);
}

export function defaultAutoBrains(): string[] {
  return ["polymath", "first-principles", "critical-thinker", "architect", "pm", "writer", "skeptic"];
}

export type CouncilPreset = {
  id: string;
  label: string;
  blurb: string;
  brainIds: string[];
};

export const COUNCIL_PRESETS: CouncilPreset[] = [
  {
    id: "pantheon",
    label: "AI Pantheon",
    blurb: "All 50 famous AI models — GPT, Claude, Gemini, Grok, Llama, DeepSeek, Mistral, Qwen and more.",
    brainIds: COUNCIL_BRAIN_META.filter((b) => b.category === "AI Models").map((b) => b.id),
  },
  {
    id: "openai-stack",
    label: "OpenAI Stack",
    blurb: "GPT-4, GPT-4o, GPT-4 Turbo, o1, o3.",
    brainIds: ["ai-gpt4", "ai-gpt4o", "ai-gpt4-turbo", "ai-o1", "ai-o3"],
  },
  {
    id: "open-source",
    label: "Open Source All-Stars",
    blurb: "Llama, Mixtral, Qwen, DeepSeek, Falcon, Gemma, Phi, DBRX, Yi.",
    brainIds: ["ai-llama3-70b", "ai-llama3-8b", "ai-code-llama", "ai-mixtral-8x22b", "ai-mixtral-8x7b", "ai-qwen2", "ai-qwen-max", "ai-deepseek-v3", "ai-deepseek-r1", "ai-falcon-180b", "ai-gemma2", "ai-phi3", "ai-dbrx", "ai-yi34b"],
  },
  {
    id: "reasoning-beasts",
    label: "Reasoning Beasts",
    blurb: "Frontier deep-thinkers: o1, o3, R1, Opus, Ultra, 3.5 Sonnet.",
    brainIds: ["ai-o1", "ai-o3", "ai-deepseek-r1", "ai-claude-opus", "ai-gemini-ultra", "ai-claude-35-sonnet", "first-principles", "logician", "bayesian"],
  },
  {
    id: "speed-demons",
    label: "Speed Demons",
    blurb: "Fast and cheap: Haiku, Flash, Mistral Small, Phi-3, Gemma 2, Llama 8B.",
    brainIds: ["ai-claude-haiku", "ai-gemini-flash", "ai-mistral-small", "ai-phi3", "ai-gemma2", "ai-llama3-8b"],
  },
  {
    id: "code-squad",
    label: "Code Squad",
    blurb: "Code Llama, Claude 3.5 Sonnet, DeepSeek V3, GPT-4 Turbo, Mixtral 8x22B + engineers.",
    brainIds: ["ai-code-llama", "ai-claude-35-sonnet", "ai-deepseek-v3", "ai-gpt4-turbo", "ai-mixtral-8x22b", "architect", "algorithms", "backend", "frontend"],
  },
  {
    id: "arabic-strong",
    label: "Arabic Strong",
    blurb: "Models with strong Arabic: Falcon 180B/40B, Aya, Claude Opus, Qwen 2, Command R+.",
    brainIds: ["ai-falcon-180b", "ai-falcon-40b", "ai-aya", "ai-claude-opus", "ai-qwen2", "ai-command-r-plus", "ai-gpt4", "translator", "linguist"],
  },
  {
    id: "war-room",
    label: "Cyber War Room",
    blurb: "Pentest, red team, blue team, threat intel, OSINT, malware, crypto + Claude Opus.",
    brainIds: ["pentest", "redteam", "blueteam", "threat-intel", "osint", "malware", "crypto", "bugbounty", "forensics", "vulnresearch", "ai-claude-opus", "ai-deepseek-r1"],
  },
  {
    id: "red-team-elite",
    label: "Red Team Elite",
    blurb: "Full offensive: Red Team, Pentest, Malware, Threat Intel, OSINT, VulnResearch.",
    brainIds: ["redteam", "pentest", "malware", "threat-intel", "osint", "vulnresearch", "first-principles", "devils-advocate"],
  },
  {
    id: "osint-council",
    label: "OSINT Council",
    blurb: "OSINT, Threat Intel, Forensics, Skeptic, Analyst — for intelligence deep dives.",
    brainIds: ["osint", "threat-intel", "forensics", "skeptic", "critical-thinker", "historian", "polymath"],
  },
  {
    id: "full-security",
    label: "Full Security Council",
    blurb: "All 10 Security brains: Pentest, Red/Blue team, OSINT, Malware, Crypto, Forensics, BugBounty, VulnResearch, ThreatIntel.",
    brainIds: ["pentest", "redteam", "blueteam", "threat-intel", "osint", "malware", "crypto", "bugbounty", "forensics", "vulnresearch"],
  },
  {
    id: "reasoning-elite",
    label: "Reasoning Elite",
    blurb: "10 top reasoning brains: First Principles, Bayesian, Devil's, Steelman, Critical, Polymath, Logician, Lateral, Skeptic, Optimist.",
    brainIds: ["first-principles", "bayesian", "devils-advocate", "steelman", "critical-thinker", "polymath", "logician", "lateral", "skeptic", "optimist"],
  },
  {
    id: "tech-full",
    label: "Tech Full Stack",
    blurb: "All 10 Technology brains: Architect, Algorithms, Frontend, Backend, DevOps, DBA, Mobile, GameDev, DataSci, ML.",
    brainIds: ["architect", "algorithms", "frontend", "backend", "devops", "dba", "mobile", "gamedev", "data-sci", "ml"],
  },
  {
    id: "creative-deep",
    label: "Creative Deep",
    blurb: "Writers, poets, storytellers + o1 and Claude Opus for maximum creative output.",
    brainIds: ["writer", "poet", "screenwriter", "designer", "storyteller", "philosopher", "ai-claude-opus", "ai-o1"],
  },
  {
    id: "business-council",
    label: "Business Council",
    blurb: "CEO, CFO, PM, Marketing, Sales, Negotiator, Ops, VC for strategic decisions.",
    brainIds: ["ceo", "cfo", "pm", "marketer", "sales", "negotiator", "ops", "vc"],
  },
  {
    id: "chinese-ai",
    label: "Chinese AI Giants",
    blurb: "Qwen, DeepSeek, GLM, Kimi, MiniMax, Baichuan, Yi — East Asia AI frontier.",
    brainIds: ["ai-qwen2", "ai-qwen-max", "ai-deepseek-v3", "ai-deepseek-r1", "ai-glm4", "ai-kimi", "ai-minimax", "ai-baichuan2", "ai-yi34b"],
  },
  {
    id: "anthropic-stack",
    label: "Anthropic Stack",
    blurb: "All Claude variants: Opus, Sonnet 3.5, Sonnet, Haiku — Anthropic's full lineup.",
    brainIds: ["ai-claude-opus", "ai-claude-35-sonnet", "ai-claude-sonnet", "ai-claude-haiku"],
  },
  {
    id: "google-stack",
    label: "Google Stack",
    blurb: "Gemini Ultra, Pro, Flash, Gemma 2, Gemma — Google's complete AI lineup.",
    brainIds: ["ai-gemini-ultra", "ai-gemini-pro", "ai-gemini-flash", "ai-gemma2", "ai-gemma"],
  },
];

void Calculator;
void Telescope;
void Building2;
