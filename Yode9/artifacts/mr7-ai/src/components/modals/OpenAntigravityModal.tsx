import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Globe, Bot, Code2, Users, CheckCircle, Zap,
  RefreshCw, Play, Layers, GitMerge, Terminal, Brain,
  Shield, Rocket, ArrowRight, Settings2,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const O = "#f97316";
const Og = (n: number) => `rgba(249,115,22,${n})`;

const PROVIDERS = ["OpenAI GPT-5.4", "Claude Opus 4", "Gemini 2.5 Pro", "DeepSeek V3", "Grok 3", "Llama 4", "Mistral Large", "Qwen 2.5"];

type AgentTask = { id: string; name: string; status: "idle" | "running" | "done" | "error"; output: string; agentType: string };

const AGENT_TYPES = [
  { id: "planner", name: "Planner", desc: "Decomposes tasks into executable steps", color: "#4299e1", icon: Layers },
  { id: "coder", name: "Coder", desc: "Writes and refactors production code", color: "#10b981", icon: Code2 },
  { id: "tester", name: "Tester", desc: "Writes tests and validates code quality", color: "#fbbf24", icon: CheckCircle },
  { id: "reviewer", name: "Code Reviewer", desc: "Security audit and best practices", color: "#e21227", icon: Shield },
  { id: "devops", name: "DevOps", desc: "CI/CD, infrastructure, deployment", color: "#a78bfa", icon: Rocket },
  { id: "researcher", name: "Researcher", desc: "Technical research and documentation", color: "#00e5cc", icon: Brain },
];

export function OpenAntigravityModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [tab, setTab] = useState<"gateway" | "agents" | "multiagent">("gateway");
  const [selectedProvider, setSelectedProvider] = useState("OpenAI GPT-5.4");
  const [task, setTask] = useState("");
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState(["planner", "coder", "tester"]);
  const [output, setOutput] = useState("");

  async function runSingleAgent(agentType: string) {
    if (!task.trim() || running) return;
    const agent = AGENT_TYPES.find(a => a.id === agentType)!;
    setRunning(true);
    setOutput("");
    const prompt = `You are an expert ${agent.name} agent in a multi-agent development system.

Task: ${task}

As ${agent.name}, your specific role is: ${agent.desc}
Provide your specialized output for this task. Be precise and actionable.`;
    try {
      let acc = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setOutput(acc); },
      );
    } catch { /* */ }
    setRunning(false);
  }

  async function runMultiAgent() {
    if (!task.trim() || running) return;
    setRunning(true);
    const activeAgents = AGENT_TYPES.filter(a => selectedAgents.includes(a.id));
    const initial: AgentTask[] = activeAgents.map(a => ({ id: a.id, name: a.name, status: "running", output: "", agentType: a.id }));
    setAgentTasks(initial);
    setOutput("");

    await Promise.all(activeAgents.map(async (agent) => {
      const prompt = `You are a specialized ${agent.name} agent in an autonomous multi-agent software development pipeline.

Main task: ${task}

Your role: ${agent.desc}

Provide your specialized deliverable for this task. Be specific, technical, and production-ready.`;
      try {
        let acc = "";
        await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setAgentTasks(p => p.map(t => t.id === agent.id ? { ...t, output: acc, status: "running" } : t)); },
      );
        setAgentTasks(p => p.map(t => t.id === agent.id ? { ...t, status: "done" } : t));
      } catch {
        setAgentTasks(p => p.map(t => t.id === agent.id ? { ...t, output: "Agent failed", status: "error" } : t));
      }
    }));

    // Synthesize outputs
    const allOutputs = activeAgents.map(a => {
      const t = agentTasks.find(x => x.id === a.id);
      return t ? `[${a.name.toUpperCase()}]:\n${t.output}` : "";
    }).join("\n\n---\n\n");

    const synthPrompt = `You are a synthesis orchestrator. Multiple specialized AI agents have completed their work on a task. Combine their outputs into a unified, coherent result.

Task: ${task}

Agent outputs:
${allOutputs.slice(0, 3000)}

Create a final consolidated deliverable that integrates all agent contributions.`;

    let synth = "";
    await streamChat(
      { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: synthPrompt }], mode: "chat" },
      chunk => { synth += chunk; setOutput(synth); },
    );

    setRunning(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Og(0.25)}`, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Og(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Og(0.1), border: `1px solid ${Og(0.3)}` }}>
              <Globe className="w-5 h-5" style={{ color: O }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">Open-Antigravity</div>
              <div className="text-[10px]" style={{ color: "#444" }}>Universal AI Gateway · Multi-Agent IDE · Zero Vendor Lock-in</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-1 px-5 py-2 border-b flex-shrink-0" style={{ borderColor: Og(0.08) }}>
          {([["gateway", "🌌 Universal Gateway"], ["agents", "🤖 Agent Toolkit"], ["multiagent", "⚡ Multi-Agent"]] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
              style={tab === t ? { background: Og(0.12), color: O, border: `1px solid ${Og(0.3)}` } : { color: "#444", border: "1px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* GATEWAY */}
          {tab === "gateway" && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: Og(0.05), border: `1px solid ${Og(0.15)}` }}>
                <div className="text-[11px] font-bold mb-2 text-white">Universal LLM Gateway</div>
                <div className="text-[10px]" style={{ color: "#666" }}>
                  Open-Antigravity provides a translation layer for all major LLM providers. Use any SDK, call any model, zero code changes needed. Break free from vendor lock-in.
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: O }}>Select Active Provider</div>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map(p => (
                  <button key={p} onClick={() => setSelectedProvider(p)}
                    className="px-3 py-2.5 rounded-xl text-left text-[10px] font-bold transition-all"
                    style={{ background: selectedProvider === p ? Og(0.1) : "#111", border: `1px solid ${selectedProvider === p ? Og(0.3) : "#1a1a1a"}`, color: selectedProvider === p ? O : "#555" }}>
                    <ArrowRight className="w-3 h-3 inline mr-1" />
                    {p}
                  </button>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <div className="text-[10px] font-bold" style={{ color: O }}>Gateway Features</div>
                {[
                  ["Any SDK → Any Model", "Use OpenAI SDK to call Claude, or Anthropic SDK to call GPT"],
                  ["Auto Failover", "Switch providers in &lt;100ms on error or rate limit"],
                  ["Model Aliases", "Route 'gpt-4' → 'gemini-pro' transparently"],
                  ["Privacy First", "No code/env/OS data sent. API key stays in your browser"],
                  ["Cost Tracking", "Per-request cost breakdown across all providers"],
                ].map(([feat, desc]) => (
                  <div key={feat} className="flex items-start gap-2 text-[10px]">
                    <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    <div>
                      <span className="font-bold text-white">{feat}: </span>
                      <span style={{ color: "#555" }}>{desc.replace("&lt;", "<")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AGENTS */}
          {tab === "agents" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {AGENT_TYPES.map(agent => (
                  <div key={agent.id} className="rounded-xl p-3" style={{ background: `${agent.color}06`, border: `1px solid ${agent.color}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <agent.icon className="w-4 h-4" style={{ color: agent.color }} />
                      <span className="text-[11px] font-bold text-white">{agent.name}</span>
                    </div>
                    <div className="text-[9px] mb-3" style={{ color: "#555" }}>{agent.desc}</div>
                    <button onClick={() => { setTab("agents"); runSingleAgent(agent.id); }}
                      disabled={running || !task}
                      className="w-full py-1.5 rounded-lg text-[9px] font-bold border disabled:opacity-30 transition-all"
                      style={{ background: `${agent.color}10`, borderColor: `${agent.color}30`, color: agent.color }}>
                      {running ? "Running..." : "Launch Agent"}
                    </button>
                  </div>
                ))}
              </div>

              <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Describe your task for the agent..."
                rows={3} className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none resize-none"
                style={{ borderColor: Og(0.2), color: "#ccc" }} />

              {output && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{ background: "#111", border: `1px solid ${Og(0.15)}`, color: "#ddd" }}>
                  {running && <RefreshCw className="w-3 h-3 animate-spin inline mr-2" style={{ color: O }} />}
                  {output}
                </motion.div>
              )}
            </div>
          )}

          {/* MULTI-AGENT */}
          {tab === "multiagent" && (
            <div className="space-y-4">
              <div className="rounded-xl p-3" style={{ background: Og(0.05), border: `1px solid ${Og(0.12)}` }}>
                <div className="text-[10px]" style={{ color: "#666" }}>
                  Select agents to run in parallel. Each specialist handles their domain, then outputs are synthesized into a unified deliverable.
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase" style={{ color: O }}>Select Agent Team</div>
              <div className="flex flex-wrap gap-2">
                {AGENT_TYPES.map(a => (
                  <button key={a.id} onClick={() => setSelectedAgents(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: selectedAgents.includes(a.id) ? `${a.color}15` : "#111", border: `1px solid ${selectedAgents.includes(a.id) ? a.color + "40" : "#222"}`, color: selectedAgents.includes(a.id) ? a.color : "#555" }}>
                    {a.name}
                  </button>
                ))}
              </div>

              <textarea value={task} onChange={e => setTask(e.target.value)}
                placeholder="Enter high-level task — selected agents will work in parallel..."
                rows={3} className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none resize-none"
                style={{ borderColor: Og(0.2), color: "#ccc" }} />

              <button onClick={runMultiAgent} disabled={running || selectedAgents.length === 0 || !task}
                className="w-full py-3 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: Og(0.08), borderColor: Og(0.3), color: O }}>
                {running ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running {selectedAgents.length} agents...</> : <><Users className="w-4 h-4" /> Launch {selectedAgents.length} Agents in Parallel</>}
              </button>

              {agentTasks.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {agentTasks.map(t => {
                    const agent = AGENT_TYPES.find(a => a.id === t.id)!;
                    return (
                      <div key={t.id} className="rounded-xl p-3" style={{ background: `${agent.color}06`, border: `1px solid ${agent.color}20` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold" style={{ color: agent.color }}>{t.name}</span>
                          {t.status === "running" && <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ color: agent.color }} />}
                          {t.status === "done" && <CheckCircle className="w-2.5 h-2.5" style={{ color: "#10b981" }} />}
                        </div>
                        <div className="text-[9px] leading-relaxed" style={{ color: "#555" }}>
                          {t.output.slice(0, 150)}{t.output.length > 150 ? "..." : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {output && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <GitMerge className="w-4 h-4" style={{ color: O }} />
                    <span className="text-[11px] font-bold text-white">Synthesized Output</span>
                  </div>
                  <div className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap"
                    style={{ background: "#111", border: `1px solid ${Og(0.15)}`, color: "#ddd" }}>
                    {output}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
