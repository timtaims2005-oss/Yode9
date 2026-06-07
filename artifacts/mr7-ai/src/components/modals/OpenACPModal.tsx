import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, Plus, Play, Square, Trash2, GitMerge, RotateCcw, ArrowRight, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface OpenACPModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AgentRole = "planner" | "executor" | "critic" | "synthesizer" | "researcher";
type AgentStatus = "idle" | "running" | "done" | "error";

type Agent = {
  id: string;
  role: AgentRole;
  name: string;
  color: string;
  status: AgentStatus;
  output: string;
  running: boolean;
};

const ROLE_CONFIGS: Record<AgentRole, { label: string; color: string; systemPrompt: string }> = {
  planner:     { label: "Planner",     color: "#fbbf24", systemPrompt: "You are the PLANNER agent. Break the task into a clear step-by-step execution plan with specific sub-tasks, dependencies, and success criteria. Output a structured plan." },
  executor:    { label: "Executor",    color: "#10b981", systemPrompt: "You are the EXECUTOR agent. Implement the task directly. Write working code, commands, or detailed actions. Be specific and actionable." },
  critic:      { label: "Critic",      color: "#e21227", systemPrompt: "You are the CRITIC agent. Find flaws, edge cases, security risks, and missed requirements. Challenge all assumptions. Be thorough and adversarial." },
  synthesizer: { label: "Synthesizer", color: "#a78bfa", systemPrompt: "You are the SYNTHESIZER agent. Combine all inputs into the best unified solution. Resolve conflicts. Produce the final authoritative output." },
  researcher:  { label: "Researcher",  color: "#60a5fa", systemPrompt: "You are the RESEARCHER agent. Gather background knowledge, best practices, relevant patterns, and reference implementations. Support the team with intelligence." },
};

export function OpenACPModal({ open, onOpenChange }: OpenACPModalProps) {
  const [task, setTask] = useState("");
  const [agents, setAgents] = useState<Agent[]>([
    { id: "1", role: "planner",     name: "PLANNER-1",     color: ROLE_CONFIGS.planner.color,     status: "idle", output: "", running: false },
    { id: "2", role: "executor",    name: "EXECUTOR-1",    color: ROLE_CONFIGS.executor.color,    status: "idle", output: "", running: false },
    { id: "3", role: "critic",      name: "CRITIC-1",      color: ROLE_CONFIGS.critic.color,      status: "idle", output: "", running: false },
    { id: "4", role: "synthesizer", name: "SYNTHESIZER-1", color: ROLE_CONFIGS.synthesizer.color, status: "idle", output: "", running: false },
  ]);
  const [orchestrating, setOrchestrating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  async function runAgent(agentId: string, taskText: string) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "running", running: true, output: "" } : a));
    const abort = new AbortController();
    abortRefs.current.set(agentId, abort);
    const cfg = ROLE_CONFIGS[agent.role];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: cfg.systemPrompt },
            { role: "user", content: `TASK: ${taskText}` },
          ],
          model: "gpt-5.4",
          stream: true,
        }),
        signal: abort.signal,
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try { const chunk = JSON.parse(raw); const delta = chunk.choices?.[0]?.delta?.content ?? ""; full += delta; setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, output: full } : a)); } catch { /* ignore */ }
        }
      }
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "done", running: false } : a));
    } catch {
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, status: "error", running: false } : a));
    }
  }

  async function orchestrate() {
    if (!task.trim() || orchestrating) return;
    setOrchestrating(true);
    setAgents((prev) => prev.map((a) => ({ ...a, output: "", status: "idle" })));

    // Phase 1: run all non-synthesizer agents in parallel
    const phase1 = agents.filter((a) => a.role !== "synthesizer");
    await Promise.all(phase1.map((a) => runAgent(a.id, task)));

    // Phase 2: synthesizer combines all outputs
    const synthAgent = agents.find((a) => a.role === "synthesizer");
    if (synthAgent) {
      const phase1Outputs = agents.filter((a) => a.role !== "synthesizer")
        .map((a) => `[${a.name}]: ${a.output}`).join("\n\n---\n\n");
      await runAgent(synthAgent.id, `Original task: ${task}\n\nAgent outputs:\n${phase1Outputs}\n\nSynthesize into the best final solution.`);
    }

    const finalOutput = agents.find((a) => a.role === "synthesizer")?.output ?? "";
    if (finalOutput) pipeline.push({ source: "OPENACP", sourceColor: "#a78bfa", label: `ACP: ${task.slice(0, 40)}`, content: finalOutput });
    setOrchestrating(false);
  }

  function addAgent() {
    const roles: AgentRole[] = ["planner", "executor", "critic", "researcher", "synthesizer"];
    const role = roles[Math.floor(Math.random() * (roles.length - 1))]; // skip synthesizer in random
    const count = agents.filter((a) => a.role === role).length + 1;
    const cfg = ROLE_CONFIGS[role];
    setAgents((prev) => [...prev, {
      id: Date.now().toString(), role, name: `${cfg.label.toUpperCase()}-${count}`, color: cfg.color, status: "idle", output: "", running: false,
    }]);
  }

  function removeAgent(id: string) { setAgents((prev) => prev.filter((a) => a.id !== id)); }

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 0 60px rgba(167,139,250,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.4)" }}>
                  <GitBranch className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#a78bfa" }}>OPEN ACP</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Agent Coordination Protocol — orchestrated multi-agent teams</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={addAgent} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border"
                  style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                  <Plus className="w-3 h-3" /> Add Agent
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Task input */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input type="text" value={task} onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") orchestrate(); }}
                  placeholder="Task for the agent team to orchestrate…"
                  disabled={orchestrating}
                  className="flex-1 border rounded-xl px-3 py-2 text-[12px] outline-none bg-transparent"
                  style={{ borderColor: "rgba(167,139,250,0.2)", color: "#ccc" }} />
                <button onClick={orchestrate} disabled={orchestrating || !task.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40"
                  style={{ background: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.5)", color: "#a78bfa" }}>
                  {orchestrating ? <><Square className="w-3 h-3" /> Running…</> : <><Zap className="w-3 h-3" /> Orchestrate</>}
                </button>
              </div>
            </div>

            {/* Agent flow diagram */}
            <div className="px-4 py-2 border-b flex items-center gap-1 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#060606" }}>
              {agents.map((a, i) => (
                <div key={a.id} className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-bold border"
                    style={{ background: `${a.color}10`, borderColor: `${a.status !== "idle" ? a.color + "50" : "rgba(255,255,255,0.06)"}`, color: a.status !== "idle" ? a.color : "#333" }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${a.running ? "animate-ping" : ""}`} style={{ background: a.status === "done" ? "#10b981" : a.status === "running" ? a.color : a.status === "error" ? "#e21227" : "#333" }} />
                    {a.name}
                  </div>
                  {i < agents.length - 1 && <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "#222" }} />}
                </div>
              ))}
            </div>

            {/* Agent cards */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <motion.div key={agent.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${agent.status !== "idle" ? agent.color + "30" : "rgba(255,255,255,0.06)"}`, background: agent.status !== "idle" ? `${agent.color}06` : "#0a0a0a" }}>
                  <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.running ? "animate-pulse" : ""}`}
                        style={{ background: agent.status === "done" ? "#10b981" : agent.status === "running" ? agent.color : agent.status === "error" ? "#e21227" : "#2a2a2a" }} />
                      <span className="text-[11px] font-bold" style={{ color: agent.color }}>{agent.name}</span>
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#444" }}>
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {agent.status === "done" && (
                        <button onClick={(e) => { e.stopPropagation(); pipeline.push({ source: "OPENACP", sourceColor: agent.color, label: agent.name, content: agent.output }); }}
                          className="p-1" style={{ color: "#00e5cc" }}>
                          <GitMerge className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); removeAgent(agent.id); }} className="p-1" style={{ color: "#2a2a2a" }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded === agent.id && agent.output && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="p-3 text-[10px] max-h-36 overflow-y-auto whitespace-pre-wrap font-mono" style={{ color: "#666" }}>
                          {agent.output}
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
