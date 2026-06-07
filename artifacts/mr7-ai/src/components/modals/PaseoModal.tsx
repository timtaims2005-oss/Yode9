import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Layers, GitBranch, Terminal, Mic, Wifi, Play, Square, RefreshCw, Plus, ChevronRight, Activity, Users, Monitor, Bot } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const PROVIDERS = [
  { id: "claude", label: "Claude Code", model: "claude/opus-4.6", color: "#ff6b35", active: true },
  { id: "codex", label: "Codex", model: "codex/gpt-5.4", color: "#74c0fc", active: false },
  { id: "copilot", label: "Copilot", model: "copilot/gpt-4o", color: "#4ade80", active: false },
  { id: "opencode", label: "OpenCode", model: "opencode/sonnet", color: "#a78bfa", active: false },
  { id: "pi", label: "Pi Agent", model: "pi/v2", color: "#fbbf24", active: false },
];

const SKILLS = [
  { cmd: "/paseo-handoff", desc: "Hand off work between agents — plan with Claude, implement with Codex" },
  { cmd: "/paseo-loop", desc: "Loop an agent against clear acceptance criteria (Ralph loops)" },
  { cmd: "/paseo-advisor", desc: "Spin up a single agent as advisor for a second opinion" },
  { cmd: "/paseo-committee", desc: "Form a committee of contrasting agents for root cause analysis" },
];

type AgentStatus = "idle" | "running" | "done" | "error";
interface Agent { id: string; provider: string; task: string; status: AgentStatus; output: string; color: string; }

export function PaseoModal({ open, onOpenChange }: Props) {
  const [task, setTask] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("claude");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"agents" | "skills" | "hosts">("agents");
  const abortRef = useRef<AbortController | null>(null);

  const HOSTS = [
    { name: "KaliGPT Cloud", status: "online", agents: agents.length },
    { name: "Local Daemon", status: "offline", agents: 0 },
  ];

  const launchAgent = async () => {
    if (!task.trim() || streaming) return;
    const provider = PROVIDERS.find(p => p.id === selectedProvider)!;
    const agentId = `agent-${Date.now()}`;
    const newAgent: Agent = { id: agentId, provider: provider.label, task, status: "running", output: "", color: provider.color };
    setAgents(prev => [...prev, newAgent]);
    setTask("");
    setStreaming(true);
    abortRef.current = new AbortController();
    try {
      const prompt = selectedSkill
        ? `You are a ${provider.label} agent. Use the ${selectedSkill} pattern to complete this task:\n\n${task}\n\nProvide a structured, actionable response.`
        : `You are a ${provider.label} coding agent running via Paseo. Complete this task:\n\n${task}\n\nProvide a detailed, actionable plan with code if needed.`;
      let out = "";
      await streamChat({ model: "gpt-5.4", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: prompt }], customSystemPrompt: "You are a professional AI coding agent." }, (chunk) => { out += chunk; setAgents(prev => prev.map(a => a.id === agentId ? { ...a, output: out } : a)); }, abortRef.current.signal);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "done" } : a));
    } catch {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "error", output: "Agent interrupted." } : a));
    } finally {
      setStreaming(false);
    }
  };

  const killAgent = (id: string) => {
    if (streaming) { abortRef.current?.abort(); }
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: "#080808", borderColor: "rgba(255,107,53,0.25)", maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,107,53,0.15)", background: "linear-gradient(135deg,#0f0804,#080808)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)" }}>
                  <Smartphone className="w-4 h-4" style={{ color: "#ff6b35" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#ff6b35" }}>Paseo</div>
                  <div className="text-[10px] font-mono" style={{ color: "#555" }}>Multi-Agent Mobile Orchestration</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border" style={{ borderColor: "rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.05)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-green-400">DAEMON ACTIVE</span>
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
                  <X className="w-4 h-4" style={{ color: "#444" }} />
                </button>
              </div>
            </div>

            {/* Provider Strip */}
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => setSelectedProvider(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={{ borderColor: selectedProvider === p.id ? `${p.color}50` : "rgba(255,255,255,0.08)", background: selectedProvider === p.id ? `${p.color}15` : "transparent", color: selectedProvider === p.id ? p.color : "#444" }}>
                  <Bot className="w-3 h-3" />{p.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {(["agents", "skills", "hosts"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors capitalize"
                  style={{ borderColor: activeTab === tab ? "#ff6b35" : "transparent", color: activeTab === tab ? "#ff6b35" : "#333" }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {activeTab === "agents" && (
                <div className="space-y-4">
                  {/* Task Input */}
                  <div className="rounded-xl border p-4" style={{ borderColor: "rgba(255,107,53,0.2)", background: "rgba(255,107,53,0.03)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#ff6b35" }}>New Agent Task</div>
                    <div className="flex gap-2 mb-2">
                      <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}
                        className="flex-shrink-0 px-3 py-2 rounded-lg text-[11px] font-mono border outline-none"
                        style={{ background: "#0f0f0f", borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>
                        <option value="">No Skill</option>
                        {SKILLS.map(s => <option key={s.cmd} value={s.cmd}>{s.cmd}</option>)}
                      </select>
                    </div>
                    <textarea value={task} onChange={e => setTask(e.target.value)}
                      placeholder="Describe the task for your agent..."
                      onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) launchAgent(); }}
                      className="w-full min-h-[80px] p-3 rounded-lg border text-xs font-mono outline-none resize-none"
                      style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", color: "#ddd", lineHeight: 1.6 }} />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[9px] font-mono" style={{ color: "#333" }}>Ctrl+Enter to launch</span>
                      <button onClick={launchAgent} disabled={!task.trim() || streaming}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                        style={{ background: task.trim() && !streaming ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.05)", color: task.trim() && !streaming ? "#ff6b35" : "#333", border: `1px solid ${task.trim() && !streaming ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                        <Play className="w-3 h-3" />Launch Agent
                      </button>
                    </div>
                  </div>

                  {/* Agent List */}
                  {agents.length === 0 ? (
                    <div className="text-center py-12" style={{ color: "#222" }}>
                      <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <div className="text-sm font-mono">No agents running</div>
                      <div className="text-[10px] mt-1">Launch a task above to spawn an agent</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agents.map(agent => (
                        <div key={agent.id} className="rounded-xl border p-4" style={{ borderColor: `${agent.color}25`, background: `${agent.color}05` }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${agent.status === "running" ? "animate-pulse" : ""}`} style={{ background: agent.status === "running" ? agent.color : agent.status === "done" ? "#4ade80" : "#ef4444", boxShadow: agent.status === "running" ? `0 0 6px ${agent.color}` : "none" }} />
                              <span className="text-[11px] font-bold" style={{ color: agent.color }}>{agent.provider}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase" style={{ background: "rgba(255,255,255,0.05)", color: "#444" }}>{agent.status}</span>
                            </div>
                            <button onClick={() => killAgent(agent.id)} className="p-1 rounded hover:bg-white/5 transition-colors">
                              <X className="w-3 h-3" style={{ color: "#333" }} />
                            </button>
                          </div>
                          <div className="text-[10px] font-mono mb-2 line-clamp-2" style={{ color: "#555" }}>{agent.task}</div>
                          {agent.output && (
                            <div className="rounded-lg p-3 text-[10px] font-mono leading-relaxed max-h-40 overflow-y-auto" style={{ background: "rgba(0,0,0,0.4)", color: "#aaa", whiteSpace: "pre-wrap" }}>
                              {agent.output}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "skills" && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono mb-4" style={{ color: "#444" }}>Paseo skills teach agents to orchestrate other agents. Install via: npx skills add getpaseo/paseo</div>
                  {SKILLS.map(skill => (
                    <div key={skill.cmd} onClick={() => { setSelectedSkill(skill.cmd); setActiveTab("agents"); }}
                      className="p-4 rounded-xl border cursor-pointer transition-all hover:border-orange-500/30 group"
                      style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <code className="text-[11px] font-bold" style={{ color: "#ff6b35" }}>{skill.cmd}</code>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#ff6b35" }} />
                      </div>
                      <p className="text-[10px] font-mono" style={{ color: "#555" }}>{skill.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "hosts" && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono mb-4" style={{ color: "#444" }}>Connect agents to multiple hosts. Scan QR code from the mobile app to link a new daemon.</div>
                  {HOSTS.map(host => (
                    <div key={host.name} className="p-4 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-4 h-4" style={{ color: "#444" }} />
                          <div>
                            <div className="text-[11px] font-bold" style={{ color: "#ccc" }}>{host.name}</div>
                            <div className="text-[9px] font-mono" style={{ color: "#333" }}>{host.agents} agent{host.agents !== 1 ? "s" : ""} running</div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-mono ${host.status === "online" ? "text-green-400" : "text-red-400"}`}
                          style={{ borderColor: host.status === "online" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)", background: host.status === "online" ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)" }}>
                          <Wifi className="w-3 h-3" />{host.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer hover:border-orange-500/30 transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.06)", color: "#333" }}>
                    <Plus className="w-4 h-4" />
                    <span className="text-[11px] font-mono">Add Host via QR</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: "#2a2a2a" }}>
                <span>{agents.length} agents</span><span>·</span><span>1 host</span><span>·</span><span>Paseo v2.0</span>
              </div>
              <Smartphone className="w-3.5 h-3.5" style={{ color: "#1a1a1a" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
