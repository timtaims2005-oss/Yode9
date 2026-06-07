import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Copy, CheckCheck, Search, ExternalLink, Star, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface AwesomeOpenCodeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const RESOURCES = [
  { category: "Agents", name: "oh-my-pi", desc: "Coding agent with IDE wired in. TypeScript + Rust + Bun.", stars: "4.2k", color: "#34d399", tag: "AGENT" },
  { category: "Agents", name: "OpenClaw", desc: "Autonomous coding agent with multi-step ReAct loop and tool use.", stars: "3.8k", color: "#ff4d4d", tag: "AGENT" },
  { category: "Agents", name: "Hermes Agent", desc: "Self-improving agent with learning loop. Skill creation from experience.", stars: "6.1k", color: "#fbbf24", tag: "AGENT" },
  { category: "Tools", name: "CodexBar", desc: "40+ AI provider token limits in your menu bar with reset countdowns.", stars: "2.9k", color: "#10b981", tag: "TOOL" },
  { category: "Tools", name: "abtop", desc: "btop for AI agents — token usage, context %, rate limits, all sessions.", stars: "1.8k", color: "#e21227", tag: "MONITOR" },
  { category: "Tools", name: "CodexSaver", desc: "Cost-aware AI router. Routes low-risk work to cheaper worker LLM.", stars: "1.2k", color: "#22d3ee", tag: "COST" },
  { category: "Skills", name: "Antigravity Awesome Skills", desc: "1,460+ agentic skills for Claude Code, Gemini CLI, Cursor, Copilot.", stars: "38k", color: "#a78bfa", tag: "SKILLS" },
  { category: "Skills", name: "claude-bughunter", desc: "51 bug hunting skills, 681 HackerOne patterns, 24 vuln classes.", stars: "3.1k", color: "#e21227", tag: "SECURITY" },
  { category: "Skills", name: "agent-skills", desc: "Production-grade engineering skills. 7 slash commands, SDLC coverage.", stars: "2.4k", color: "#3b82f6", tag: "SKILLS" },
  { category: "Memory", name: "agentmemory", desc: "Persistent memory for AI coding agents. No more re-explaining.", stars: "5.7k", color: "#fbbf24", tag: "MEMORY" },
  { category: "Memory", name: "Graphify", desc: "Project knowledge graph. Query your codebase instead of grepping.", stars: "4.9k", color: "#a78bfa", tag: "GRAPH" },
  { category: "Memory", name: "CodeGraph (Rust)", desc: "Codebase-to-knowledge-graph. Semantic search for AI agents.", stars: "2.1k", color: "#f97316", tag: "GRAPH" },
  { category: "Research", name: "HyperResearch", desc: "16-step deep research pipeline. Leads DeepResearch-Bench leaderboard.", stars: "3.3k", color: "#a78bfa", tag: "RESEARCH" },
  { category: "Productivity", name: "Career-Ops", desc: "Multi-agent job search system. AI-powered resume, cover letters, prep.", stars: "5.2k", color: "#0ea5e9", tag: "CAREER" },
  { category: "Productivity", name: "cc-switch", desc: "All-in-one manager for Claude Code, Codex, Gemini CLI, OpenCode.", stars: "7.8k", color: "#6366f1", tag: "MANAGER" },
  { category: "Security", name: "Decepticon", desc: "Autonomous red team agent. 5-phase attack pipeline with AI reasoning.", stars: "2.7k", color: "#e21227", tag: "RED TEAM" },
];

const CATS = ["All", ...Array.from(new Set(RESOURCES.map(r => r.category)))];

export function AwesomeOpenCodeModal({ open, onOpenChange }: AwesomeOpenCodeModalProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [injected, setInjected] = useState<string | null>(null);

  const filtered = RESOURCES.filter(r =>
    (cat === "All" || r.category === cat) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase()))
  );

  function inject(r: typeof RESOURCES[0]) {
    const content = `# ${r.name}\n${r.desc}\n\nCategory: ${r.category} | Stars: ${r.stars}`;
    pipeline.push({ source: "AwesomeOpenCode", sourceColor: "#6366f1", label: r.name, content });
    setInjected(r.name);
    setTimeout(() => setInjected(null), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(99,102,241,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Awesome OpenCode</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Curated open-source AI coding tools, agents, and skills</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {/* Search + Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "#444" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search resources…"
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl text-[10px] outline-none bg-transparent border"
                    style={{ borderColor: "rgba(255,255,255,0.08)", color: "#ccc" }} />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className="text-[9px] px-2.5 py-1 rounded-lg font-bold border transition-all"
                    style={{ background: cat === c ? "rgba(99,102,241,0.12)" : "transparent", borderColor: cat === c ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)", color: cat === c ? "#6366f1" : "#555" }}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Resources */}
              <div className="space-y-2">
                {filtered.map(r => (
                  <motion.div key={r.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color, boxShadow: `0 0 4px ${r.color}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>{r.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${r.color}15`, color: r.color }}>{r.tag}</span>
                      </div>
                      <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>{r.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color: "#444" }}>
                        <Star className="w-2.5 h-2.5" />{r.stars}
                      </div>
                      <button onClick={() => inject(r)}
                        className="text-[9px] px-2 py-1 rounded-lg border flex items-center gap-1 transition-all"
                        style={{ background: injected === r.name ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", borderColor: injected === r.name ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)", color: injected === r.name ? "#10b981" : "#555" }}>
                        {injected === r.name ? <><CheckCheck className="w-2.5 h-2.5" /> Injected</> : <><Zap className="w-2.5 h-2.5" /> Inject</>}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
