/**
 * AgentProjectGeneratorPage — Auto Project Generator
 * Autonomous project generation using the Swarm system.
 * Generates full project structure, code, README, and dependencies.
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, X, ChevronDown, Play, Square, Code2,
  FileText, Cpu, Zap, CheckCircle2, Loader2,
  Globe, Server, Smartphone, Database, Bot,
  Folder, Copy, Check,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

type ProjectType = "web" | "api" | "mobile" | "cli" | "library" | "fullstack" | "ai-agent";

const PROJECT_TYPES: Array<{ id: ProjectType; label: string; icon: React.ElementType; desc: string; color: string }> = [
  { id: "web",       label: "Web App",      icon: Globe,      desc: "React/Vue/Next.js",      color: "#3b82f6" },
  { id: "api",       label: "REST API",     icon: Server,     desc: "Express/FastAPI/Go",     color: "#10b981" },
  { id: "fullstack", label: "Full Stack",   icon: Cpu,        desc: "Frontend + Backend",     color: "#8b5cf6" },
  { id: "ai-agent",  label: "AI Agent",     icon: Bot,        desc: "LangChain/AutoGPT",      color: "#e21227" },
  { id: "mobile",    label: "Mobile App",   icon: Smartphone, desc: "React Native/Flutter",   color: "#f97316" },
  { id: "cli",       label: "CLI Tool",     icon: Code2,      desc: "Node.js/Python/Rust",    color: "#22d3ee" },
  { id: "library",   label: "Library/SDK",  icon: Database,   desc: "NPM/PyPI package",       color: "#fbbf24" },
];

const TECH_STACKS: Record<ProjectType, string[]> = {
  web:       ["React + Vite + TailwindCSS", "Next.js 14 + TypeScript", "Vue 3 + Nuxt", "Svelte + SvelteKit"],
  api:       ["Node.js + Express + TypeScript", "Python FastAPI", "Go + Gin", "Python Flask"],
  fullstack: ["React + Node.js + PostgreSQL", "Next.js + Prisma", "Vue + Laravel", "React + FastAPI"],
  "ai-agent":["LangChain + Python", "AutoGPT style + OpenAI", "CrewAI", "Custom Agent + Tools"],
  mobile:    ["React Native + Expo", "Flutter + Dart", "Ionic + React"],
  cli:       ["Node.js + Commander.js", "Python + Click", "Rust + Clap", "Go + Cobra"],
  library:   ["TypeScript NPM package", "Python PyPI package", "Rust Crate", "Go Module"],
};

const QUICK_MODELS = [
  { id: "gpt-4o",             label: "GPT-4o",         color: "#10b981" },
  { id: "glm-5.2",            label: "GLM-5.2",        color: "#06b6d4" },
  { id: "claude-sonnet-4-5",  label: "Claude Sonnet",  color: "#8b5cf6" },
  { id: "gemini-2.5-flash",   label: "Gemini 2.5 Flash", color: "#f97316" },
  { id: "deepseek-r1",        label: "DeepSeek R1",    color: "#e21227" },
];

interface Props { onClose?: () => void }

export function AgentProjectGeneratorPage({ onClose }: Props) {
  const [projectType, setProjectType] = useState<ProjectType>("web");
  const [requirements, setRequirements] = useState("");
  const [techStack, setTechStack] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [modelOpen, setModelOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const selectedModel = QUICK_MODELS.find(m => m.id === model);

  const generate = useCallback(async () => {
    if (!requirements.trim() || generating) return;

    setGenerating(true);
    setOutput("");
    setDone(false);
    abortRef.current = new AbortController();

    try {
      const resp = await authFetch("/api/swarm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_type: projectType, requirements, tech_stack: techStack, model }),
        signal: abortRef.current.signal,
      });

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          try {
            const d = JSON.parse(part.replace(/^data:\s*/, "").split("\n").find(l => l.startsWith("{")) ?? "{}");
            if (d.chunk) {
              setOutput(o => {
                const next = o + d.chunk;
                requestAnimationFrame(() => {
                  if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
                });
                return next;
              });
            }
            if (d.output) { setOutput(d.output); setDone(true); }
            if (d.message) { setOutput(o => o + `\n\n❌ Error: ${d.message}`); setDone(true); }
          } catch { /**/ }
        }
      }
      setDone(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setOutput(o => o + `\n\n❌ فشل الاتصال: ${e?.message}`);
      }
    } finally {
      setGenerating(false);
    }
  }, [requirements, projectType, techStack, model, generating]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
    setDone(true);
  }, []);

  const copyOutput = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-[10px] border-b border-white/6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#e21227]/20 border border-[#e21227]/30 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-[#e21227]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Auto Project Generator</h2>
          <p className="text-[10px] text-white/30">توليد مشاريع برمجية كاملة تلقائياً بالذكاء الاصطناعي</p>
        </div>
        <div className="flex-1" />
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6">
        <div className="p-5 space-y-5">
          {/* Project Type */}
          <div>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              نوع المشروع
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_TYPES.map(pt => (
                <button
                  key={pt.id}
                  onClick={() => { setProjectType(pt.id); setTechStack(""); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    projectType === pt.id
                      ? "border-opacity-40 bg-opacity-10"
                      : "border-white/8 bg-white/3 hover:bg-white/6"
                  }`}
                  style={projectType === pt.id ? {
                    borderColor: `${pt.color}40`,
                    backgroundColor: `${pt.color}10`,
                  } : {}}
                >
                  <pt.icon {...{ className: "w-4 h-4 mx-auto mb-1", style: { color: projectType === pt.id ? pt.color : "#6b7280" } } as Record<string,unknown>} />
                  <div className="text-[10px] font-medium" style={{ color: projectType === pt.id ? pt.color : "#6b7280" }}>
                    {pt.label}
                  </div>
                  <div className="text-[9px] text-white/25 mt-0.5 hidden sm:block">{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tech Stack Presets */}
          <div>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              التقنيات (اختياري)
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {(TECH_STACKS[projectType] ?? []).map(s => (
                <button
                  key={s}
                  onClick={() => setTechStack(techStack === s ? "" : s)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all ${
                    techStack === s
                      ? "bg-[#e21227]/15 border-[#e21227]/30 text-[#e21227]"
                      : "bg-white/4 border-white/8 text-white/40 hover:text-white/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              value={techStack}
              onChange={e => setTechStack(e.target.value)}
              placeholder="أو اكتب التقنيات يدوياً..."
              className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/20"
            />
          </div>

          {/* Requirements */}
          <div>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              متطلبات المشروع <span className="text-[#e21227]">*</span>
            </div>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="اشرح المشروع بالتفصيل: ما هو، ما وظيفته، ما الميزات المطلوبة، كيف يعمل...

مثال: أريد تطبيق ويب لإدارة المهام (Todo App) يدعم:
- إضافة/حذف/تعديل المهام
- تصنيف المهام بألوان
- فلتر حسب الحالة (منجزة/قيد التنفيذ)
- حفظ البيانات في LocalStorage
- واجهة عربية جميلة"
              className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none h-40"
            />
          </div>

          {/* Model Selector */}
          <div className="relative">
            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" />
              النموذج
            </div>
            <button
              onClick={() => setModelOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedModel?.color ?? "#6b7280" }} />
                <span className="text-white/70">{selectedModel?.label ?? model}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {modelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1 left-0 right-0 z-50 rounded-[18px] border border-white/10 bg-black/95 shadow-2xl overflow-hidden"
                >
                  {QUICK_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setModel(m.id); setModelOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className={model === m.id ? "text-white font-medium" : "text-white/55"}>{m.label}</span>
                      {model === m.id && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-[#e21227]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <button
              onClick={generating ? stop : generate}
              disabled={!requirements.trim() && !generating}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all ${
                generating
                  ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                  : requirements.trim()
                    ? "bg-[#e21227]/15 text-[#e21227] border border-[#e21227]/30 hover:bg-[#e21227]/25"
                    : "bg-white/4 text-white/20 border border-white/8 cursor-not-allowed"
              }`}
            >
              {generating ? (
                <><Square className="w-4 h-4" /> إيقاف التوليد</>
              ) : (
                <><Rocket className="w-4 h-4" /> توليد المشروع</>
              )}
            </button>
            {output && (
              <button
                onClick={copyOutput}
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/4 text-white/50 hover:text-white hover:bg-white/8 transition text-sm flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        <AnimatePresence>
          {(output || generating) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/6"
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#e21227] animate-spin" />
                  ) : done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {generating ? "جاري التوليد..." : done ? "اكتمل المشروع" : "المخرجات"}
                  </span>
                  {done && (
                    <span className="mr-auto text-[10px] text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      تم الحفظ في ذاكرة الوكيل
                    </span>
                  )}
                </div>
                <div
                  ref={outputRef}
                  className="bg-black/40 border border-white/6 rounded-xl p-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6"
                >
                  <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
                    {output}
                    {generating && <span className="animate-pulse text-[#e21227]">▋</span>}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
