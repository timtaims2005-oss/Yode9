import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Search, ExternalLink, Star, Zap, Code2, Brain, Mic, Image, Video, Music, Database, Briefcase, BookOpen, Heart, Cpu, Gamepad2, Bot, Settings, ChevronRight, Filter } from "lucide-react";

interface AIAtlasModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ATLAS_CATEGORIES = [
  {
    id: "chat", label: "🤖 Assistance & Chat", color: "#e21227", icon: Bot,
    tools: [
      { name: "ChatGPT", desc: "GPT-4o · OpenAI's flagship chat model", url: "https://chat.openai.com", tag: "FREE+PAID" },
      { name: "Claude AI", desc: "Anthropic's safe, accurate, and honest AI assistant", url: "https://claude.ai", tag: "FREE+PAID" },
      { name: "Gemini", desc: "Google's multimodal AI — text, images, video, audio", url: "https://gemini.google.com", tag: "FREE+PAID" },
      { name: "Perplexity", desc: "AI-powered research tool with multi-source search", url: "https://perplexity.ai", tag: "FREE+PAID" },
      { name: "Microsoft Copilot", desc: "Microsoft 365 AI orchestration engine", url: "https://copilot.microsoft.com", tag: "FREE+PAID" },
      { name: "You.com", desc: "Personal AI search agent with customized recommendations", url: "https://you.com", tag: "FREE" },
      { name: "LobeHub", desc: "Open-source AI chat app for super individuals", url: "https://chat-preview.lobehub.com", tag: "OPEN SOURCE" },
      { name: "Llama", desc: "Meta's state-of-the-art open-source LLM", url: "https://ai.meta.com/llama", tag: "OPEN SOURCE" },
      { name: "InstructLab", desc: "Community-based approach to build open-source LLMs", url: "https://instructlab.ai", tag: "OPEN SOURCE" },
    ]
  },
  {
    id: "productivity", label: "🎯 Productivity", color: "#10b981", icon: Zap,
    tools: [
      { name: "PopAi", desc: "Powerful AI tool for productivity, PDF reading, PPT generation", url: "https://www.popai.pro", tag: "PAID" },
      { name: "Writer", desc: "Full-stack generative AI for enterprise teams", url: "https://writer.com", tag: "PAID" },
      { name: "NoteGPT", desc: "YouTube/PDF summarizer, PPT, mindmaps, and notes", url: "https://notegpt.io", tag: "FREE+PAID" },
      { name: "Motion", desc: "AI that plans your work automatically", url: "https://www.usemotion.com", tag: "PAID" },
      { name: "Dart", desc: "AI-powered project management sidekick", url: "https://www.itsdart.com", tag: "FREE+PAID" },
      { name: "Magical AI", desc: "Auto-draft messages in 1-click across any platform", url: "https://www.getmagical.com/ai", tag: "FREE+PAID" },
      { name: "Wordtune", desc: "Generative AI platform for work productivity", url: "https://www.wordtune.com", tag: "FREE+PAID" },
      { name: "TurboSeek", desc: "Open source AI search engine — smarter and faster", url: "https://www.turboseek.io", tag: "OPEN SOURCE" },
    ]
  },
  {
    id: "code", label: "👾 Code & Development", color: "#6366f1", icon: Code2,
    tools: [
      { name: "GitHub Copilot", desc: "AI pair programmer that lives in your editor", url: "https://github.com/features/copilot", tag: "PAID" },
      { name: "Cursor", desc: "AI-first code editor built for pair-programming with AI", url: "https://www.cursor.com", tag: "FREE+PAID" },
      { name: "Replit AI", desc: "AI coding assistant in the cloud IDE", url: "https://replit.com", tag: "FREE+PAID" },
      { name: "OpenUI", desc: "UI component generation from description or screenshot", url: "https://github.com/wandb/openui", tag: "OPEN SOURCE" },
      { name: "Codeium", desc: "Free AI code acceleration toolkit for developers", url: "https://codeium.com", tag: "FREE" },
      { name: "Tabnine", desc: "AI code completion trained on your codebase", url: "https://www.tabnine.com", tag: "FREE+PAID" },
      { name: "Sourcegraph Cody", desc: "AI coding assistant with entire codebase context", url: "https://sourcegraph.com/cody", tag: "FREE+PAID" },
      { name: "Aider", desc: "AI pair programming in your terminal via git", url: "https://aider.chat", tag: "OPEN SOURCE" },
    ]
  },
  {
    id: "design", label: "🪄 Design & Creativity", color: "#ec4899", icon: Image,
    tools: [
      { name: "Midjourney", desc: "World-class AI image generation via Discord", url: "https://www.midjourney.com", tag: "PAID" },
      { name: "Stable Diffusion", desc: "Open-source text-to-image generation model", url: "https://stability.ai", tag: "OPEN SOURCE" },
      { name: "DALL-E 3", desc: "OpenAI's most expressive image generator", url: "https://openai.com/dall-e-3", tag: "PAID" },
      { name: "Runway", desc: "AI video generation and creative tools suite", url: "https://runwayml.com", tag: "FREE+PAID" },
      { name: "Krea AI", desc: "Real-time AI image generation and enhancement", url: "https://www.krea.ai", tag: "FREE+PAID" },
      { name: "Flux AI", desc: "State-of-the-art open-source image generation", url: "https://github.com/black-forest-labs/flux", tag: "OPEN SOURCE" },
      { name: "Adobe Firefly", desc: "Adobe's generative AI for creative workflows", url: "https://firefly.adobe.com", tag: "FREE+PAID" },
      { name: "Kling AI", desc: "High-quality AI video generation platform", url: "https://www.klingai.com", tag: "FREE+PAID" },
    ]
  },
  {
    id: "tts", label: "🎧 Text to Speech", color: "#f59e0b", icon: Mic,
    tools: [
      { name: "ElevenLabs", desc: "Ultra-realistic TTS in 32 languages with cloning", url: "https://elevenlabs.io", tag: "FREE+PAID" },
      { name: "Play.ht", desc: "Most fluent & conversational AI voice generator", url: "https://play.ht", tag: "FREE+PAID" },
      { name: "Fish Speech", desc: "Brand new high-quality TTS solution", url: "https://speech.fish.audio", tag: "FREE" },
      { name: "Bark", desc: "Suno's multilingual speech + music generation", url: "https://github.com/suno-ai/bark", tag: "OPEN SOURCE" },
      { name: "edge-tts", desc: "Microsoft Edge TTS service from Python, no API key", url: "https://github.com/rany2/edge-tts", tag: "OPEN SOURCE" },
      { name: "Whisper Web", desc: "ML-powered speech recognition in your browser", url: "https://github.com/xenova/whisper-web", tag: "OPEN SOURCE" },
      { name: "Zonos", desc: "LLM-based text-to-speech system by Zyphra", url: "https://github.com/Zyphra/Zonos", tag: "OPEN SOURCE" },
    ]
  },
  {
    id: "audio", label: "🎙️ Audio Generation", color: "#a78bfa", icon: Music,
    tools: [
      { name: "Suno AI", desc: "Create music from text description — any genre", url: "https://suno.com", tag: "FREE+PAID" },
      { name: "Udio", desc: "AI music creation platform with natural language", url: "https://www.udio.com", tag: "FREE+PAID" },
      { name: "ElevenLabs VFX", desc: "AI sound effects generation from description", url: "https://elevenlabs.io/sound-effects", tag: "FREE+PAID" },
      { name: "Stable Audio", desc: "Stability AI's open-source audio generation tools", url: "https://github.com/Stability-AI/stable-audio-tools", tag: "OPEN SOURCE" },
      { name: "SoundHound AI", desc: "Voice AI technology that processes speech like the brain", url: "https://www.soundhound.com", tag: "PAID" },
    ]
  },
  {
    id: "research", label: "🔬 Research & Academic", color: "#22d3ee", icon: BookOpen,
    tools: [
      { name: "Perplexity AI", desc: "Real-time AI research with cited sources", url: "https://perplexity.ai", tag: "FREE+PAID" },
      { name: "Elicit", desc: "AI research assistant for literature reviews", url: "https://elicit.com", tag: "FREE+PAID" },
      { name: "Consensus", desc: "AI search engine for scientific papers", url: "https://consensus.app", tag: "FREE+PAID" },
      { name: "Semantic Scholar", desc: "AI-powered research tool for scientific literature", url: "https://www.semanticscholar.org", tag: "FREE" },
      { name: "ResearchRabbit", desc: "AI paper recommendations and citation maps", url: "https://www.researchrabbit.ai", tag: "FREE" },
      { name: "Scite AI", desc: "Smart citations — how papers cite each other", url: "https://scite.ai", tag: "FREE+PAID" },
    ]
  },
  {
    id: "3d", label: "🧊 Modeling & 3D", color: "#00e5cc", icon: Cpu,
    tools: [
      { name: "Luma Genie", desc: "3D asset generation from text descriptions", url: "https://lumalabs.ai/genie", tag: "FREE+PAID" },
      { name: "InstantMesh", desc: "Tencent's image-to-3D mesh generation", url: "https://github.com/TencentARC/InstantMesh", tag: "OPEN SOURCE" },
      { name: "Unique3D", desc: "Single-view high-quality 3D mesh reconstruction", url: "https://github.com/AiuniAI/Unique3D", tag: "OPEN SOURCE" },
      { name: "3D AI Studio", desc: "AI-powered 3D model generation platform", url: "https://www.3daistudio.com", tag: "FREE+PAID" },
      { name: "Meshy", desc: "AI 3D model generation for game developers", url: "https://www.meshy.ai", tag: "FREE+PAID" },
    ]
  },
  {
    id: "agents", label: "🚙 Automations & Agents", color: "#f97316", icon: Settings,
    tools: [
      { name: "AutoGPT", desc: "Fully autonomous GPT-4 powered AI agent", url: "https://github.com/Significant-Gravitas/AutoGPT", tag: "OPEN SOURCE" },
      { name: "LangChain", desc: "Framework for building LLM-powered applications", url: "https://www.langchain.com", tag: "OPEN SOURCE" },
      { name: "CrewAI", desc: "Framework for multi-agent role-playing systems", url: "https://www.crewai.com", tag: "OPEN SOURCE" },
      { name: "Zapier AI", desc: "AI-powered workflow automation for 5000+ apps", url: "https://zapier.com/ai", tag: "FREE+PAID" },
      { name: "Make.com", desc: "Visual automation platform with AI capabilities", url: "https://www.make.com", tag: "FREE+PAID" },
      { name: "n8n", desc: "Self-hostable workflow automation with AI nodes", url: "https://n8n.io", tag: "OPEN SOURCE" },
      { name: "Botpress", desc: "Next-gen chatbot builder powered by OpenAI", url: "https://botpress.com", tag: "FREE+PAID" },
    ]
  },
  {
    id: "models", label: "📦 Models & LLMs", color: "#8b5cf6", icon: Brain,
    tools: [
      { name: "HuggingFace", desc: "The AI community hub — 500K+ models and datasets", url: "https://huggingface.co", tag: "FREE+PAID" },
      { name: "Ollama", desc: "Run LLMs locally — Llama, Mistral, Gemma, and more", url: "https://ollama.ai", tag: "OPEN SOURCE" },
      { name: "Together AI", desc: "Run open-source models with blazing speed", url: "https://www.together.ai", tag: "FREE+PAID" },
      { name: "Groq", desc: "Ultra-fast LLM inference — 750 tokens/sec", url: "https://groq.com", tag: "FREE+PAID" },
      { name: "Replicate", desc: "Run ML models in the cloud with an API", url: "https://replicate.com", tag: "FREE+PAID" },
      { name: "OpenRouter", desc: "Unified API gateway for 150+ AI models", url: "https://openrouter.ai", tag: "FREE+PAID" },
      { name: "LM Studio", desc: "Desktop app to run local LLMs with GUI", url: "https://lmstudio.ai", tag: "FREE" },
    ]
  },
  {
    id: "business", label: "👔 Business & Marketing", color: "#34d399", icon: Briefcase,
    tools: [
      { name: "Copy.ai", desc: "AI marketing copy and content generation at scale", url: "https://www.copy.ai", tag: "FREE+PAID" },
      { name: "Jasper", desc: "AI content platform for marketing teams", url: "https://www.jasper.ai", tag: "PAID" },
      { name: "HubSpot AI", desc: "AI-powered CRM, marketing, and sales tools", url: "https://www.hubspot.com/artificial-intelligence", tag: "FREE+PAID" },
      { name: "Salesforce Einstein", desc: "AI built into Salesforce CRM platform", url: "https://www.salesforce.com/products/einstein", tag: "PAID" },
      { name: "Notion AI", desc: "AI writing, summarization, and analysis in Notion", url: "https://www.notion.so/product/ai", tag: "PAID" },
    ]
  },
  {
    id: "health", label: "🩺 Health & Wellbeing", color: "#f43f5e", icon: Heart,
    tools: [
      { name: "Ada Health", desc: "AI-powered symptom checker and health guide", url: "https://ada.com", tag: "FREE" },
      { name: "Woebot", desc: "AI mental health chatbot based on CBT", url: "https://woebothealth.com", tag: "FREE+PAID" },
      { name: "Nabla Copilot", desc: "AI clinical assistant for healthcare providers", url: "https://www.nabla.com", tag: "PAID" },
    ]
  },
];

export function AIAtlasModal({ open, onOpenChange }: AIAtlasModalProps) {
  const [activeCategory, setActiveCategory] = useState("chat");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.3, a: Math.random() });
    }
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,200,255,${p.a * 0.4})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  const cat = ATLAS_CATEGORIES.find(c => c.id === activeCategory) ?? ATLAS_CATEGORIES[0];
  const allTools = ATLAS_CATEGORIES.flatMap(c => c.tools.map(t => ({ ...t, catColor: c.color, catLabel: c.label })));
  const filteredAll = search ? allTools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase())) : [];
  const displayTools = search ? filteredAll : cat.tools.map(t => ({ ...t, catColor: cat.color, catLabel: cat.label }));
  const totalTools = ATLAS_CATEGORIES.reduce((s, c) => s + c.tools.length, 0);

  const TAG_COLORS: Record<string, string> = { "FREE": "#10b981", "PAID": "#f97316", "FREE+PAID": "#3b82f6", "OPEN SOURCE": "#8b5cf6" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25, type: "spring", stiffness: 220, damping: 28 }}
        className="relative w-full max-w-7xl h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #050508 0%, #030306 60%, #060310 100%)", border: "1px solid rgba(100,200,255,0.12)", boxShadow: "0 0 80px rgba(100,200,255,0.08), 0 0 160px rgba(100,200,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }} />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(100,200,255,0.08)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-4">
            <motion.div animate={{ rotateY: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(100,200,255,0.2), rgba(100,200,255,0.05))", border: "1px solid rgba(100,200,255,0.3)", boxShadow: "0 0 20px rgba(100,200,255,0.2)" }}>
              <Globe className="w-5 h-5" style={{ color: "#64c8ff" }} />
            </motion.div>
            <div>
              <div className="text-sm font-black tracking-widest" style={{ color: "#64c8ff", fontFamily: "monospace" }}>AI ATLAS</div>
              <div className="text-[10px] font-mono" style={{ color: "rgba(100,200,255,0.5)" }}>GLOBAL AI TOOLS DIRECTORY · {totalTools}+ TOOLS · {ATLAS_CATEGORIES.length} CATEGORIES</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest border" style={{ color: "#64c8ff", borderColor: "rgba(100,200,255,0.25)", background: "rgba(100,200,255,0.06)" }}>
              {totalTools}+ TOOLS INDEXED
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-52 border-r flex-shrink-0 overflow-y-auto" style={{ borderColor: "rgba(100,200,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
            <div className="p-3 space-y-0.5">
              {ATLAS_CATEGORIES.map(c => {
                const Icon = c.icon;
                const isActive = activeCategory === c.id && !search;
                return (
                  <motion.button key={c.id} onClick={() => { setActiveCategory(c.id); setSearch(""); }} whileHover={{ x: 2 }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{ background: isActive ? `${c.color}12` : "transparent", border: `1px solid ${isActive ? `${c.color}30` : "transparent"}` }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? c.color : "rgba(255,255,255,0.3)" }} />
                    <span className="text-[9.5px] font-bold leading-tight" style={{ color: isActive ? c.color : "rgba(255,255,255,0.35)" }}>{c.label}</span>
                    <span className="ml-auto text-[8px] font-mono" style={{ color: isActive ? `${c.color}80` : "rgba(255,255,255,0.15)" }}>{c.tools.length}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + controls */}
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "rgba(100,200,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(100,200,255,0.4)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all AI tools..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-[11px] outline-none font-mono"
                  style={{ background: "rgba(100,200,255,0.06)", border: "1px solid rgba(100,200,255,0.15)", color: "#ccc" }} />
              </div>
              {search && <span className="text-[9px] font-mono" style={{ color: "#64c8ff" }}>{filteredAll.length} results</span>}
            </div>

            {/* Category header */}
            {!search && (
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-1 h-6 rounded-full" style={{ background: cat.color }} />
                <span className="text-sm font-black tracking-wide" style={{ color: cat.color }}>{cat.label}</span>
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{cat.tools.length} tools</span>
              </div>
            )}
            {search && (
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>Search results for: <span style={{ color: "#64c8ff" }}>{search}</span></span>
              </div>
            )}

            {/* Tools grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {displayTools.map((tool, i) => (
                    <motion.div key={`${tool.name}-${i}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -3, scale: 1.02 }}
                      className="group rounded-2xl p-4 relative overflow-hidden cursor-pointer"
                      style={{ background: `radial-gradient(circle at 20% 20%, ${tool.catColor}08 0%, rgba(5,5,8,0.95) 70%)`, border: `1px solid ${tool.catColor}18`, transition: "all 0.2s" }}>
                      <div className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${tool.catColor}60, transparent)` }} />
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-black text-[11px] tracking-wide" style={{ color: "#ddd" }}>{tool.name}</div>
                        <a href={(tool as { url?: string }).url || "#"} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: tool.catColor }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-[9px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{tool.desc}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${TAG_COLORS[(tool as {tag?: string}).tag || "FREE"]}18`, color: TAG_COLORS[(tool as {tag?: string}).tag || "FREE"], border: `1px solid ${TAG_COLORS[(tool as {tag?: string}).tag || "FREE"]}30` }}>
                          {(tool as {tag?: string}).tag}
                        </span>
                        {search && <span className="text-[8px] font-mono" style={{ color: tool.catColor + "70" }}>{(tool as {catLabel?: string}).catLabel?.split(" ").slice(1).join(" ")}</span>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(100,200,255,0.06)", background: "rgba(0,0,0,0.4)" }}>
          <div className="text-[9px] font-mono" style={{ color: "rgba(100,200,255,0.3)" }}>AI-ATLAS DIRECTORY · CURATED AI TOOLS UNIVERSE</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <span className="text-[9px] font-mono" style={{ color: "#10b981" }}>LIVE DATABASE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
