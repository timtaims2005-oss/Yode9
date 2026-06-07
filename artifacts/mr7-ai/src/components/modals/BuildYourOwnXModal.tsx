import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Code, ChevronRight, Loader2, Send, Zap, Terminal } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type View = "browse" | "guide";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  projects: string[];
}

const CATEGORIES: Category[] = [
  { id: "3d", name: "3D Renderer", icon: "🎮", color: "#f97316", description: "Ray tracing, rasterization, OpenGL from scratch", projects: ["Ray Tracer in One Weekend", "Software Renderer in 500 lines", "Wolfenstein 3D Raycaster", "Tiny Renderer (C++)"] },
  { id: "ai", name: "AI Model", icon: "🧠", color: "#a78bfa", description: "LLMs, neural networks, diffusion models from scratch", projects: ["LLM from Scratch (Python)", "RAG from Scratch", "Neural Network from Zero", "Diffusion Model Tutorial"] },
  { id: "blockchain", name: "Blockchain", icon: "⛓️", color: "#fbbf24", description: "Bitcoin, Ethereum, PoW consensus from scratch", projects: ["Blockchain in Go", "Bitcoin in Python", "Tiny Cryptocurrency (JS)", "Smart Contract Engine"] },
  { id: "database", name: "Database", icon: "🗄️", color: "#10b981", description: "B-trees, SQL engines, storage layers from scratch", projects: ["SQLite Clone in C", "LevelDB Clone", "Key-Value Store", "ACID Transaction Engine"] },
  { id: "docker", name: "Docker / Container", icon: "🐳", color: "#3b82f6", description: "Linux namespaces, cgroups, container runtimes", projects: ["Container in Go (100 lines)", "Docker Clone", "OCI Runtime", "Linux Namespace Sandbox"] },
  { id: "os", name: "Operating System", icon: "🖥️", color: "#e21227", description: "Kernel, bootloader, process scheduler, memory manager", projects: ["OSDev Wiki OS", "xv6 MIT UNIX clone", "Rust OS Tutorial", "RISC-V Kernel"] },
  { id: "network", name: "Network Stack", icon: "🌐", color: "#06b6d4", description: "TCP/IP, HTTP server, DNS resolver from scratch", projects: ["TCP in Python", "HTTP Server in C", "DNS Resolver", "WebSocket Protocol"] },
  { id: "nn", name: "Neural Network", icon: "🔗", color: "#ec4899", description: "Backprop, autograd, training from scratch", projects: ["Micrograd (Karpathy)", "Makemore LLM", "CNN from Scratch", "Transformer from Scratch"] },
  { id: "shell", name: "Shell", icon: "💻", color: "#84cc16", description: "Bash-like shell, pipes, job control, scripting", projects: ["Shell in C (tutorial)", "Python Shell", "POSIX Shell in Rust", "Zsh Clone"] },
  { id: "git", name: "Git", icon: "📦", color: "#f59e0b", description: "Content-addressable storage, commits, branches", projects: ["ugit (Python)", "Git in Haskell", "Gitlet (Java)", "Mini-Git (Go)"] },
  { id: "lang", name: "Programming Language", icon: "📝", color: "#8b5cf6", description: "Lexer, parser, interpreter, compiler", projects: ["Writing a Compiler (Python)", "Monkey Language", "Crafting Interpreters", "LLVM Tutorial"] },
  { id: "web", name: "Web Browser", icon: "🌍", color: "#0ea5e9", description: "HTML parser, layout engine, JavaScript engine", projects: ["Browser in Python", "Layout Engine", "CSS Box Model", "DOM in 1000 lines"] },
  { id: "search", name: "Search Engine", icon: "🔍", color: "#d946ef", description: "Inverted index, TF-IDF, BM25, full-text search", projects: ["Tiny Search Engine (Python)", "Inverted Index", "BM25 Ranking", "Vector Search Engine"] },
  { id: "game", name: "Game Engine", icon: "🎯", color: "#f97316", description: "ECS, physics, rendering loop, audio pipeline", projects: ["Game in C++", "2D Physics Engine", "ECS Framework", "Roguelike Engine"] },
  { id: "emulator", name: "Emulator / VM", icon: "🕹️", color: "#10b981", description: "CHIP-8, NES, RISC-V virtual machines", projects: ["CHIP-8 Emulator", "NES Emulator", "RISC-V VM", "WASM Interpreter"] },
];

const BYOX_PERSONA = `You are Build Your Own X — an expert software engineering teacher who guides developers through building technologies from scratch.
You follow the philosophy: "What I cannot create, I do not understand" — Richard Feynman.
When teaching, provide:
1. Clear conceptual explanation of how the technology works
2. Step-by-step implementation guide with actual code
3. Key data structures and algorithms involved
4. Testing approach
5. Extensions and challenges to deepen understanding
Use the appropriate programming language for each tutorial (Python, C, Go, Rust, JavaScript as fits).`;

export function BuildYourOwnXModal({ open, onOpenChange }: Props) {
  const [view, setView] = useState<View>("browse");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [guideText, setGuideText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaResult, setQaResult] = useState("");
  const [qaGenerating, setQaGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = CATEGORIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));

  async function generateGuide(cat: Category, project: string) {
    setSelectedCategory(cat);
    setSelectedProject(project);
    setView("guide");
    setGuideText("");
    setGenerating(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const prompt = `Create a complete, hands-on tutorial for building "${project}" in the context of "${cat.name}".
Structure the tutorial as:
# ${project} — Build From Scratch

## What we're building (2-3 sentences)
## How it works (core concepts, data structures, algorithms)
## Step 1: Setup & prerequisites (code)
## Step 2: Core implementation (actual code with comments)
## Step 3: Testing (test cases)
## Step 4: Extending (3 challenges to deepen understanding)
## Key takeaways

Include real, working code. Use appropriate language for this project.`;
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: prompt }], customSystemPrompt: BYOX_PERSONA },
        (chunk) => setGuideText(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function askQuestion() {
    if (!question.trim() || qaGenerating) return;
    setQaGenerating(true);
    setQaResult("");
    const q = question;
    setQuestion("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const context = selectedCategory ? `Context: Building ${selectedProject} (${selectedCategory.name})` : "";
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: `${context}\n\nQuestion: ${q}` }], customSystemPrompt: BYOX_PERSONA },
        (chunk) => setQaResult(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setQaGenerating(false);
  }

  const COL = "#22c55e";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: `${COL}30` }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: `${COL}20`, background: `${COL}08` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COL}15`, border: `1px solid ${COL}30` }}>
            <Code className="w-4 h-4" style={{ color: COL }} />
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: COL }}>Build Your Own X</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>30+ TECHNOLOGIES · AI-GUIDED TUTORIALS · "WHAT I CANNOT CREATE I DO NOT UNDERSTAND"</div>
          </div>
          {view === "guide" && (
            <button onClick={() => setView("browse")} className="ml-auto text-[10px] font-mono px-3 py-1 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "#262626", color: "#888" }}>
              ← BACK
            </button>
          )}
          <button onClick={() => { abortRef.current?.abort(); onOpenChange(false); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {view === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b" style={{ borderColor: "#1f1f1f" }}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#111", border: "1px solid #262626" }}>
                  <BookOpen className="w-3 h-3" style={{ color: "#555" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search technologies..."
                    className="flex-1 bg-transparent text-[10px] outline-none" style={{ color: "#ccc" }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 gap-3">
                  {filtered.map(cat => (
                    <div key={cat.id} className="p-4 rounded-xl border cursor-pointer transition-all hover:border-opacity-60"
                      style={{ background: "#111", borderColor: `${cat.color}20` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-[11px] font-bold" style={{ color: cat.color }}>{cat.name}</span>
                      </div>
                      <div className="text-[9px] mb-3" style={{ color: "#666" }}>{cat.description}</div>
                      <div className="space-y-1">
                        {cat.projects.map(proj => (
                          <button key={proj} onClick={() => generateGuide(cat, proj)}
                            className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[9px] transition-all hover:bg-white/5"
                            style={{ color: "#888" }}>
                            <ChevronRight className="w-2.5 h-2.5 shrink-0" style={{ color: cat.color }} />
                            {proj}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === "guide" && (
            <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "#1f1f1f" }}>
                <span className="text-lg">{selectedCategory?.icon}</span>
                <span className="text-[11px] font-bold" style={{ color: selectedCategory?.color }}>{selectedProject}</span>
                <span className="text-[9px] ml-1" style={{ color: "#444" }}>· {selectedCategory?.name}</span>
                {generating && (
                  <div className="ml-auto flex items-center gap-1.5 text-[9px]" style={{ color: selectedCategory?.color }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Generating tutorial...
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed" style={{ color: "#aaa" }}>
                {guideText ? (
                  <pre className="whitespace-pre-wrap font-sans text-[11px]" style={{ color: "#ccc" }}>
                    {guideText}
                    {generating && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: selectedCategory?.color }} />}
                  </pre>
                ) : (
                  <div className="flex items-center gap-2" style={{ color: selectedCategory?.color }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Building tutorial...
                  </div>
                )}
                {qaResult && (
                  <div className="mt-4 p-3 rounded-lg border" style={{ background: "#0d0d0d", borderColor: `${selectedCategory?.color ?? COL}30` }}>
                    <div className="text-[8px] font-bold mb-1" style={{ color: "#444" }}>AI ANSWER:</div>
                    <pre className="whitespace-pre-wrap font-sans text-[11px]" style={{ color: "#ccc" }}>
                      {qaResult}
                      {qaGenerating && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: selectedCategory?.color ?? COL }} />}
                    </pre>
                  </div>
                )}
              </div>
              <div className="p-3 border-t flex gap-2" style={{ borderColor: "#1f1f1f" }}>
                <Terminal className="w-4 h-4 mt-2 shrink-0" style={{ color: "#555" }} />
                <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), askQuestion())}
                  placeholder="Ask the AI tutor a question about this project..."
                  className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                  style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                <button onClick={askQuestion} disabled={qaGenerating || !question.trim()}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                  style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: qaGenerating ? 0.5 : 1 }}>
                  {qaGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
