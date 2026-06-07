import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Copy, CheckCheck, Play, BookMarked, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface ClaudePromptsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Prompt = { id: string; name: string; category: string; desc: string; prompt: string; tags: string[] };

const CATEGORIES = ["All", "Code", "Security", "Research", "Writing", "Data", "Agent", "Reasoning", "Creative"];

const PROMPTS: Prompt[] = [
  { id: "react-component", name: "React Component Builder", category: "Code", tags: ["react","typescript","component"],
    desc: "Build complete, accessible, typed React components with all edge cases",
    prompt: `You are a senior React engineer. Build complete, production-ready React components:
- Full TypeScript types and interfaces
- All interactive states (hover, focus, disabled, loading, error)
- Accessibility (ARIA labels, keyboard nav, screen reader)
- Tailwind CSS styling with dark mode
- Error boundaries and null checks
- JSDoc comments
- Usage examples

Never leave TODOs. Ship complete, working components.` },
  { id: "sql-optimizer", name: "SQL Query Optimizer", category: "Data", tags: ["SQL","performance","index"],
    desc: "Analyze and optimize SQL queries for maximum performance",
    prompt: `You are a database performance expert. For any SQL query:
1. Explain the execution plan
2. Identify N+1 problems, full table scans, missing indexes
3. Rewrite the optimized version with explanation
4. Suggest indexes to create (with CREATE INDEX statements)
5. Estimate performance improvement
Always show before/after query side-by-side.` },
  { id: "security-audit", name: "Code Security Auditor", category: "Security", tags: ["security","OWASP","pentest"],
    desc: "Deep security audit of any code for vulnerabilities",
    prompt: `You are a CISO-level security auditor. For any code:
1. Find all security vulnerabilities (OWASP Top 10, injection, auth flaws)
2. Rate each finding by severity (Critical/High/Medium/Low)
3. Show the vulnerable code snippet
4. Provide the secure fix with explanation
5. Add test cases that would catch this vulnerability
Be thorough — assume this is going to production.` },
  { id: "api-design", name: "API Design Reviewer", category: "Code", tags: ["API","REST","design"],
    desc: "Review and improve API design for consistency and best practices",
    prompt: `You are a senior API architect. Review any API design:
1. RESTful resource naming conventions
2. HTTP method and status code correctness
3. Authentication and authorization patterns
4. Request/response schema design
5. Error response format consistency
6. Versioning strategy
7. Rate limiting and pagination
Provide the improved API spec in OpenAPI 3.0 format.` },
  { id: "research-synthesis", name: "Research Synthesizer", category: "Research", tags: ["research","synthesis","academic"],
    desc: "Synthesize multiple research sources into actionable insights",
    prompt: `You are a research director at a top think tank. Synthesize information:
1. Extract key findings and claims
2. Identify agreements and contradictions
3. Assess evidence quality and methodology
4. Fill knowledge gaps with expert inference
5. Generate actionable recommendations
6. Identify open questions for further research
Format as an executive research brief.` },
  { id: "system-design", name: "System Design Expert", category: "Code", tags: ["architecture","distributed","scale"],
    desc: "Design scalable distributed systems for any requirements",
    prompt: `You are a principal engineer at a FAANG company. Design distributed systems:
1. Requirements analysis (functional + non-functional)
2. High-level architecture with components
3. Database selection and schema design
4. API design and service boundaries
5. Scaling strategy (horizontal/vertical/sharding)
6. Caching layers and CDN
7. Failure modes and resilience patterns
8. Monitoring and observability
Draw ASCII architecture diagrams.` },
  { id: "red-team-llm", name: "LLM Red Teamer", category: "Security", tags: ["LLM","jailbreak","adversarial"],
    desc: "Red team LLM systems for safety vulnerabilities and jailbreaks",
    prompt: `You are an AI safety researcher and red teamer. Analyze LLM systems for:
1. Prompt injection vulnerabilities
2. Jailbreak attack vectors
3. Data leakage risks
4. Bias and fairness issues
5. Hallucination patterns
6. Output sanitization gaps
Provide concrete test cases and mitigation strategies.` },
  { id: "business-analyst", name: "Business Analyst AI", category: "Research", tags: ["business","analysis","ROI"],
    desc: "Analyze business problems with structured frameworks",
    prompt: `You are a McKinsey business analyst. For any business problem:
1. Define the problem clearly (root cause analysis)
2. Apply relevant frameworks (MECE, 5 Whys, Pareto)
3. Quantify the impact (revenue, cost, risk)
4. Generate 3 strategic options with trade-offs
5. Recommend the optimal path with implementation timeline
6. Define success metrics and KPIs
Structure as a board-ready presentation.` },
  { id: "creative-director", name: "Creative Director", category: "Creative", tags: ["creative","copywriting","brand"],
    desc: "Generate compelling creative direction and copywriting",
    prompt: `You are an award-winning creative director. For any brand or campaign:
1. Define the creative concept and big idea
2. Write compelling headlines (5 options, ranked)
3. Develop the brand voice and tone guide
4. Create tagline variations
5. Describe visual direction
6. Write full copy for key touchpoints
7. Include call-to-action variations
Make it memorable, human, and conversion-optimized.` },
  { id: "data-pipeline", name: "Data Pipeline Designer", category: "Data", tags: ["ETL","data","pipeline","Spark"],
    desc: "Design robust data pipelines and ETL processes",
    prompt: `You are a senior data engineer. Design complete data pipelines:
1. Source system analysis and extraction strategy
2. Data quality checks and validation rules
3. Transformation logic with edge case handling
4. Loading strategy (full/incremental/CDC)
5. Error handling and dead letter queues
6. Monitoring and alerting
7. Complete Python/Spark code implementation
Include idempotency and exactly-once semantics.` },
  { id: "debugging-detective", name: "Debugging Detective", category: "Code", tags: ["debug","error","fix"],
    desc: "Systematically diagnose and fix any software bug",
    prompt: `You are a debugging detective. For any bug report or error:
1. Reproduce the issue (minimal reproduction steps)
2. Form hypotheses ranked by probability
3. Design diagnostic tests for each hypothesis
4. Identify the root cause with evidence
5. Provide the fix with explanation
6. Add regression test to prevent recurrence
7. Check for similar bugs in related code
Think like Sherlock Holmes — deduce from evidence.` },
  { id: "agent-designer", name: "AI Agent Designer", category: "Agent", tags: ["agent","ReAct","tools","LLM"],
    desc: "Design and implement autonomous AI agents with tools",
    prompt: `You are an AI agent architect. Design complete autonomous agents:
1. Agent goal and capability definition
2. Tool set design (what tools, when to use them)
3. ReAct reasoning loop implementation
4. Memory system (short-term + long-term)
5. Error recovery and reflection
6. Safety constraints and guardrails
7. Complete Python implementation with LangChain/custom
Build agents that actually accomplish real-world tasks.` },
];

export function ClaudePromptsModal({ open, onOpenChange }: ClaudePromptsModalProps) {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { dispatch } = useStore();
  const { toast } = useToast();

  function inject(p: Prompt) {
    dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: p.prompt } });
    toast({ description: `Prompt "${p.name}" injected into chat` });
    onOpenChange(false);
  }

  function copyPrompt(p: Prompt) {
    navigator.clipboard.writeText(p.prompt);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = PROMPTS.filter((p) => {
    const matchCat = cat === "All" || p.category === cat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 60px rgba(16,185,129,0.08)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.4)" }}>
                  <BookMarked className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#10b981" }}>CLAUDE PROMPTS</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Expert prompt library — {PROMPTS.length} production-grade prompts</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-4 py-2.5 border-b space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-1.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <Search className="w-3.5 h-3.5" style={{ color: "#444" }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts…"
                  className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: "#ccc" }} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                    style={{ background: cat === c ? "rgba(16,185,129,0.15)" : "transparent", borderColor: cat === c ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.06)", color: cat === c ? "#10b981" : "#444" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filtered.map((p) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                  <div className="flex items-center justify-between gap-2 p-3 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>{p.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>{p.category}</span>
                      </div>
                      <div className="text-[10px]" style={{ color: "#555" }}>{p.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); copyPrompt(p); }}
                        className="p-1.5 rounded border" style={{ borderColor: "rgba(255,255,255,0.08)", color: "#444" }}>
                        {copiedId === p.id ? <CheckCheck className="w-3 h-3" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); inject(p); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold border"
                        style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>
                        <Play className="w-2.5 h-2.5" /> Inject
                      </button>
                      {expanded === p.id ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#444" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#444" }} />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded === p.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="p-3">
                          <div className="flex gap-1 mb-2 flex-wrap">
                            {p.tags.map((t) => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#333" }}>{t}</span>)}
                          </div>
                          <pre className="text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto" style={{ color: "#666" }}>{p.prompt}</pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
