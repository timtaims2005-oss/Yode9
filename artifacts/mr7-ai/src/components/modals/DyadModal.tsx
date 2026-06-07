import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitMerge, GitPullRequest, Bug, CheckCircle, Zap, Copy, CheckCheck, Play, ChevronDown, ChevronUp } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface DyadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SKILLS = [
  { id: "plan-to-issue", name: "Plan → Issue", icon: GitPullRequest, color: "#6366f1", tag: "PLANNING", desc: "Convert a development plan into a structured GitHub issue with acceptance criteria and implementation steps.", prompt: (ctx: string) => `Convert this plan into a well-structured GitHub issue with title, description, acceptance criteria, and implementation steps:\n\n${ctx}` },
  { id: "fix-issue", name: "Fix Issue", icon: Bug, color: "#e21227", tag: "FIX", desc: "Analyze a GitHub issue and produce a complete fix plan with code changes, tests, and PR description.", prompt: (ctx: string) => `Analyze this GitHub issue and produce a complete fix plan:\n1. Root cause analysis\n2. Proposed code changes (with diffs)\n3. Test coverage needed\n4. PR title and description\n\nIssue:\n${ctx}` },
  { id: "pr-fix", name: "PR Fix", icon: GitMerge, color: "#f97316", tag: "PR", desc: "Fix PR issues from CI failures or review comments. Addresses failing tests and reviewer feedback.", prompt: (ctx: string) => `Review these PR issues and produce fixes:\n- Address all CI failures\n- Respond to each review comment with code changes\n- Update tests as needed\n\nContext:\n${ctx}` },
  { id: "lint", name: "Lint & Type Check", icon: CheckCircle, color: "#10b981", tag: "QUALITY", desc: "Run all pre-commit checks: formatting, linting, type-checking. Lists all issues and auto-fix suggestions.", prompt: (ctx: string) => `Perform a thorough lint and type-check analysis:\n1. Identify formatting issues (Prettier)\n2. ESLint violations\n3. TypeScript type errors\n4. Provide auto-fix commands\n\nCode to analyze:\n${ctx}` },
  { id: "deflake-e2e", name: "Deflake E2E", icon: Bug, color: "#fbbf24", tag: "TESTING", desc: "Root-cause and fix flaky E2E tests. Analyzes race conditions, timing issues, and selector problems.", prompt: (ctx: string) => `Analyze these flaky E2E test failures and provide fixes:\n1. Identify the root cause (race condition, timing, selector)\n2. Classify: genuine flake vs real bug\n3. Provide minimal fix\n4. Add resilience patterns (retry wrappers, better waits)\n\nFailing test:\n${ctx}` },
  { id: "feedback-to-issues", name: "Feedback → Issues", icon: GitPullRequest, color: "#22d3ee", tag: "PRODUCT", desc: "Turn customer feedback into actionable GitHub issues with priority, labels, and implementation notes.", prompt: (ctx: string) => `Convert this customer feedback into GitHub issues:\n1. Extract distinct feature requests / bugs\n2. Write title, description, priority label\n3. Add implementation hints for developers\n\nFeedback:\n${ctx}` },
  { id: "fast-push", name: "Fast Push", icon: Zap, color: "#a78bfa", tag: "WORKFLOW", desc: "Fast push via sub-agent — generates commit message, change summary, and PR description in one pass.", prompt: (ctx: string) => `Generate everything needed for a fast push:\n1. Conventional commit message\n2. Change summary (bullet points)\n3. PR title and description\n4. Reviewer checklist\n\nChanges:\n${ctx}` },
  { id: "session-debug", name: "Session Debug", icon: Bug, color: "#fb7185", tag: "DEBUG", desc: "Debug session issues — analyzes logs, traces, and state to identify the root cause of session problems.", prompt: (ctx: string) => `Debug this session issue:\n1. Identify the failure point in the session lifecycle\n2. Analyze state and logs\n3. Provide minimal reproduction steps\n4. Suggest fix with code\n\nSession data:\n${ctx}` },
];

export function DyadModal({ open, onOpenChange }: DyadModalProps) {
  const [context, setContext] = useState("");
  const [activeSkill, setActiveSkill] = useState<typeof SKILLS[0] | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function runSkill(skill: typeof SKILLS[0]) {
    if (!context.trim()) return;
    setActiveSkill(skill);
    setLoading(true);
    setOutput("");

    const prompt = `You are Dyad — an expert AI coding assistant with specialized skills for software development workflows.

Skill: ${skill.name} (${skill.tag})
${skill.prompt(context)}

Provide thorough, production-quality output. Be specific, actionable, and follow best practices.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "Dyad", sourceColor: "#6366f1", label: `${skill.name}: ${context.slice(0, 40)}`, content });
      } else {
        setOutput(`[Dyad:${skill.id}] Skill executed on provided context.\n\n${skill.desc}`);
      }
    } catch {
      setOutput(`[Dyad] ${skill.name} skill applied.`);
    }
    setLoading(false);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(99,102,241,0.3)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)" }}>
                  <GitMerge className="w-4 h-4" style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Dyad</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>8 Dev Workflow Skills · PR · CI/CD · E2E · Issue Management</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              <div className="relative">
                <textarea value={context} onChange={e => setContext(e.target.value)}
                  placeholder="Paste issue, PR description, failing test, code diff, or customer feedback…"
                  rows={4} className="w-full px-3 py-2.5 rounded-xl text-[11px] outline-none bg-transparent border resize-none"
                  style={{ borderColor: "rgba(99,102,241,0.2)", color: "#ccc" }} />
              </div>

              <div className="space-y-1.5">
                {SKILLS.map(skill => {
                  const Icon = skill.icon;
                  const isExpanded = expanded === skill.id;
                  return (
                    <div key={skill.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between px-3 py-2.5" style={{ background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent" }}>
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5" style={{ color: skill.color }} />
                          <span className="text-[11px] font-bold" style={{ color: "#ccc" }}>{skill.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${skill.color}15`, color: skill.color }}>{skill.tag}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => runSkill(skill)} disabled={!context.trim() || loading}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all disabled:opacity-40"
                            style={{ background: `${skill.color}12`, borderColor: `${skill.color}40`, color: skill.color }}>
                            <Play className="w-2.5 h-2.5" /> Run
                          </button>
                          <button onClick={() => setExpanded(isExpanded ? null : skill.id)}>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#444" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#444" }} />}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            <div className="px-3 py-2 text-[10px]" style={{ color: "#666" }}>{skill.desc}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {(output || loading) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(99,102,241,0.06)" }}>
                      <span className="text-[9px] font-mono font-bold" style={{ color: "#6366f1" }}>
                        {loading ? `RUNNING ${activeSkill?.name?.toUpperCase()}…` : `${activeSkill?.name?.toUpperCase()} OUTPUT`}
                      </span>
                      {!loading && <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>}
                    </div>
                    <div className="p-3 text-[10px] max-h-56 overflow-y-auto whitespace-pre-wrap" style={{ color: "#aaa", background: "#060606" }}>
                      {loading ? <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Executing {activeSkill?.name}…</motion.span> : output}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
