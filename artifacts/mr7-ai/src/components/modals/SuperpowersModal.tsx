import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Shield, Brain, Play, CheckCircle2, GitMerge, RefreshCw, Search, Star, ChevronDown } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface SuperpowersModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tier = "micro" | "lightweight" | "full";
type WorkflowId = string;

const TIERS: { id: Tier; label: string; desc: string; color: string; icon: typeof Zap; threshold: string }[] = [
  { id: "micro",       label: "MICRO",       desc: "Simple tasks — direct answer or tiny edit. Zero overhead.",         color: "#10b981", icon: Zap,     threshold: "1-2 steps" },
  { id: "lightweight", label: "LIGHTWEIGHT",  desc: "Moderate tasks — structured output, basic TDD, no full pipeline.", color: "#fbbf24", icon: Shield,  threshold: "3-7 steps" },
  { id: "full",        label: "FULL",         desc: "Complex tasks — complete pipeline: plan → TDD → safety → review.", color: "#a78bfa", icon: Brain,   threshold: "8+ steps"  },
];

const WORKFLOWS = [
  { id: "tdd",          label: "TDD Enforcement",         tier: "lightweight" as Tier, desc: "RED → GREEN → REFACTOR cycle with test-first mandate",              tag: "TESTING"    },
  { id: "debug",        label: "Systematic Debugging",    tier: "lightweight" as Tier, desc: "Reproduce → Isolate → Hypothesize → Verify → Fix → Confirm",        tag: "DEBUG"      },
  { id: "code-review",  label: "5-Axis Code Review",      tier: "lightweight" as Tier, desc: "Correctness · Readability · Architecture · Security · Performance",  tag: "REVIEW"     },
  { id: "red-team",     label: "Adversarial Red Team",    tier: "full" as Tier,        desc: "Attack your own code — logic bugs, adversarial inputs, race conditions", tag: "RED TEAM" },
  { id: "safety",       label: "Safety Hooks",            tier: "lightweight" as Tier, desc: "10 proactive hooks: no git push -f, no secret leaks, no destructive ops", tag: "SAFETY"  },
  { id: "memory",       label: "Cross-Session Memory",    tier: "full" as Tier,        desc: "Project map, known issues, and architecture decisions persist across sessions", tag: "MEMORY" },
  { id: "plan",         label: "Task Breakdown",          tier: "lightweight" as Tier, desc: "Decompose work into vertical slices with acceptance criteria",        tag: "PLANNING"   },
  { id: "ship",         label: "Ship Workflow",           tier: "full" as Tier,        desc: "spec → plan → build → test → review → commit pipeline",              tag: "FULL CI"    },
  { id: "spec",         label: "Spec Writing",            tier: "lightweight" as Tier, desc: "Requirements → acceptance criteria → test plan",                     tag: "SPEC"       },
  { id: "brainstorm",   label: "Brainstorm",              tier: "micro" as Tier,       desc: "Rapid ideation with self-consistency verification",                   tag: "IDEAS"      },
  { id: "simplify",     label: "Code Simplification",     tier: "micro" as Tier,       desc: "Reduce complexity without changing behavior — guard clauses, extract helpers", tag: "REFACTOR" },
  { id: "consistency",  label: "Self-Consistency Check",  tier: "lightweight" as Tier, desc: "Multi-path verification at critical decision points",                 tag: "VERIFY"     },
];

const TIER_COLORS: Record<Tier, string> = { micro: "#10b981", lightweight: "#fbbf24", full: "#a78bfa" };

export function SuperpowersModal({ open, onOpenChange }: SuperpowersModalProps) {
  const { toast } = useToast();
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowId | null>(null);
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [autoRouted, setAutoRouted] = useState<Tier | null>(null);

  const filtered = WORKFLOWS.filter(w =>
    (!search || w.label.toLowerCase().includes(search.toLowerCase()) || w.desc.toLowerCase().includes(search.toLowerCase()) || w.tag.toLowerCase().includes(search.toLowerCase())) &&
    (!activeTier || w.tier === activeTier)
  );

  function autoRoute(input: string) {
    const words = input.trim().split(/\s+/).length;
    const hasKeywords = (kws: string[]) => kws.some(k => input.toLowerCase().includes(k));
    let tier: Tier;
    if (words <= 8 || hasKeywords(["simple", "quick", "fix typo", "rename", "what is"])) {
      tier = "micro";
    } else if (hasKeywords(["implement", "feature", "build", "create", "add", "refactor", "test", "debug", "review", "write"])) {
      tier = words > 30 ? "full" : "lightweight";
    } else {
      tier = "full";
    }
    setAutoRouted(tier);
    setActiveTier(tier);
    return tier;
  }

  async function runWorkflow() {
    if (!task.trim() || running) return;
    const tier = autoRouted || autoRoute(task);
    const wf = selectedWorkflow ? WORKFLOWS.find(w => w.id === selectedWorkflow) : null;
    setRunning(true);
    setOutput("");

    const systemPrompt = `You are Superpowers Optimized — an agentic development framework (fork of obra/superpowers).

Current routing tier: ${tier.toUpperCase()} (${TIERS.find(t=>t.id===tier)?.threshold})
${wf ? `Active workflow: ${wf.label} — ${wf.desc}` : "Auto-selected workflow based on task complexity"}

Tier rules:
- MICRO: Direct answer, minimal overhead, no elaborate pipeline
- LIGHTWEIGHT: Structured output, basic TDD/debug/review, key safety checks
- FULL: Complete pipeline — spec → plan → TDD (RED/GREEN/REFACTOR) → safety hooks → adversarial red-team → 5-axis review

Safety hooks always active (all tiers):
- No git push --force
- No secret/credential leaks in code
- No destructive operations without explicit confirmation
- Self-consistency check before final answer

${tier === "full" ? `Full pipeline for this task:
1. SPEC: Define acceptance criteria
2. PLAN: Break into vertical slices  
3. BUILD: Implement with TDD (RED→GREEN→REFACTOR)
4. SAFETY: Run 10 safety hooks
5. RED TEAM: Adversarial attack the implementation
6. REVIEW: 5-axis code review (correctness/readability/architecture/security/performance)` : ""}

Respond with structured, professional output appropriate to the tier.`;

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: task }],
          model: "gpt-5.4",
          systemPrompt
        }),
      });
      const content = await readChatText(r);
      setOutput(content);
      pipeline.push({ source: "Superpowers", sourceColor: "#10b981", label: task.slice(0, 50), content });
      toast({ description: `${tier.toUpperCase()} workflow complete` });
    } catch {
      toast({ description: "API error", variant: "destructive" });
    }
    setRunning(false);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative w-full max-w-3xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(167,139,250,0.35)", maxHeight: "92vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}>

          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}>
            <Star size={20} color="#a78bfa" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">SUPERPOWERS OPTIMIZED</div>
              <div className="text-xs" style={{ color: "#666" }}>Agentic dev framework v6.6.1 — auto 3-tier routing · TDD · safety hooks · red-team · cross-session memory</div>
            </div>
            <button onClick={() => onOpenChange(false)} className="ml-auto p-1 rounded hover:bg-white/10"><X size={16} color="#666" /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* 3-tier routing */}
            <div className="p-5 border-b space-y-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="text-xs font-bold tracking-widest mb-3" style={{ color: "#555" }}>AUTOMATIC 3-TIER WORKFLOW ROUTING</div>
              <div className="grid grid-cols-3 gap-3">
                {TIERS.map(t => {
                  const Icon = t.icon;
                  const isActive = activeTier === t.id;
                  return (
                    <button key={t.id} onClick={() => setActiveTier(isActive ? null : t.id)}
                      className="p-3 rounded-lg border text-left transition-all"
                      style={{ borderColor: isActive ? t.color + "60" : "rgba(255,255,255,0.08)", background: isActive ? t.color + "10" : "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} color={t.color} />
                        <span className="text-xs font-bold" style={{ color: t.color }}>{t.label}</span>
                        {autoRouted === t.id && <span className="text-xs px-1 rounded" style={{ background: t.color + "20", color: t.color }}>AUTO</span>}
                      </div>
                      <div className="text-xs" style={{ color: "#666" }}>{t.desc}</div>
                      <div className="text-xs mt-1 font-mono" style={{ color: "#444" }}>{t.threshold}</div>
                    </button>
                  );
                })}
              </div>

              {/* Task input */}
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#555" }}>TASK — auto-routes to correct tier</label>
                <textarea value={task} onChange={e => { setTask(e.target.value); if (!running) { setAutoRouted(null); setActiveTier(null); } }}
                  onBlur={() => { if (task.trim()) autoRoute(task); }}
                  placeholder="Describe your task — Superpowers will automatically route it to MICRO, LIGHTWEIGHT, or FULL pipeline…"
                  rows={3} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                {autoRouted && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: TIER_COLORS[autoRouted] }}>
                    <Zap size={11} />
                    Auto-routed to <strong>{autoRouted.toUpperCase()}</strong> tier based on task complexity
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={runWorkflow} disabled={!task.trim() || running}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "#fff" }}>
                  {running ? <><RefreshCw size={14} className="animate-spin" /> RUNNING…</> : <><Play size={14} /> RUN WORKFLOW</>}
                </button>
                {(output || running) && (
                  <button onClick={() => { setOutput(""); setAutoRouted(null); setActiveTier(null); setTask(""); }}
                    className="px-4 py-2.5 rounded-lg text-sm border hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>RESET</button>
                )}
              </div>
            </div>

            {/* Output */}
            {output && (
              <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={14} color="#a78bfa" />
                  <span className="text-xs font-bold tracking-widest" style={{ color: "#a78bfa" }}>
                    {autoRouted?.toUpperCase()} WORKFLOW OUTPUT
                  </span>
                </div>
                <div className="p-4 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto"
                  style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", color: "#ccc" }}>
                  {output}
                </div>
                <button onClick={() => { pipeline.push({ source: "Superpowers", sourceColor: "#10b981", label: task.slice(0,50), content: output }); toast({ description: "Sent to pipeline" }); }}
                  className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border hover:bg-white/5"
                  style={{ borderColor: "rgba(167,139,250,0.3)", color: "#a78bfa" }}>
                  <GitMerge size={10} /> PIPE TO NEXT MODULE
                </button>
              </div>
            )}

            {/* Workflow library */}
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold tracking-widest" style={{ color: "#555" }}>30+ WORKFLOW SKILLS</span>
                <div className="flex-1 relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#444" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…"
                    className="w-full pl-8 pr-3 py-1.5 rounded border text-xs"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#ccc" }} />
                </div>
                <button onClick={() => setShowAll(v => !v)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "#555" }}>
                  <ChevronDown size={11} /> {showAll ? "LESS" : "ALL"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(showAll ? filtered : filtered.slice(0, 8)).map(w => {
                  const isSelected = selectedWorkflow === w.id;
                  const tc = TIER_COLORS[w.tier];
                  return (
                    <button key={w.id} onClick={() => setSelectedWorkflow(isSelected ? null : w.id)}
                      className="p-3 rounded-lg border text-left transition-all"
                      style={{ borderColor: isSelected ? tc + "50" : "rgba(255,255,255,0.07)", background: isSelected ? tc + "08" : "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{w.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: tc + "20", color: tc }}>{w.tier.toUpperCase()}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>{w.tag}</span>
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: "#666" }}>{w.desc}</div>
                    </button>
                  );
                })}
              </div>
              {!showAll && filtered.length > 8 && (
                <button onClick={() => setShowAll(true)} className="w-full mt-3 py-2 text-xs border rounded hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "#555" }}>
                  Show {filtered.length - 8} more workflows
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
