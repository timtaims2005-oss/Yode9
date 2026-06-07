import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Square, Users, CheckCircle2, XCircle, Crown, Loader2, GitMerge } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { streamAgent, type AgentEvent } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

interface TeamAgentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AgentSlot = {
  id: number;
  name: string;
  focus: string;
  color: string;
  status: "idle" | "running" | "done" | "error";
  steps: number;
  answer: string;
  toolCalls: number;
};

const TEAM_CONFIGS: AgentSlot[] = [
  { id: 1, name: "RECON", focus: "Deep reconnaissance and OSINT gathering", color: "#60a5fa", status: "idle", steps: 0, answer: "", toolCalls: 0 },
  { id: 2, name: "EXPLOIT", focus: "Vulnerability research and exploit identification", color: "#f87171", status: "idle", steps: 0, answer: "", toolCalls: 0 },
  { id: 3, name: "ANALYST", focus: "Threat analysis and intelligence correlation", color: "#a78bfa", status: "idle", steps: 0, answer: "", toolCalls: 0 },
  { id: 4, name: "STEALTH", focus: "Evasion techniques and detection bypass methods", color: "#4ade80", status: "idle", steps: 0, answer: "", toolCalls: 0 },
  { id: 5, name: "STRIKE", focus: "Offensive playbook generation and weaponization", color: "#fb923c", status: "idle", steps: 0, answer: "", toolCalls: 0 },
];

const TEAM_SIZES = [2, 3, 4, 5];

export function TeamAgentModal({ open, onOpenChange }: TeamAgentModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [task, setTask] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [agents, setAgents] = useState<AgentSlot[]>(TEAM_CONFIGS.slice(0, 3).map((a) => ({ ...a })));
  const [running, setRunning] = useState(false);
  const [synthesis, setSynthesis] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const abortControllers = useRef<AbortController[]>([]);
  const synthRef = useRef("");

  function updateTeamSize(n: number) {
    setTeamSize(n);
    setAgents(TEAM_CONFIGS.slice(0, n).map((a) => ({ ...a })));
    setSynthesis("");
  }

  function updateAgent(id: number, patch: Partial<AgentSlot>) {
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  }

  function stop() {
    abortControllers.current.forEach((c) => c.abort());
    setRunning(false);
    setSynthesizing(false);
  }

  async function execute() {
    if (!task.trim() || running) return;
    const reset = agents.map((a) => ({ ...a, status: "idle" as const, steps: 0, answer: "", toolCalls: 0 }));
    setAgents(reset);
    setSynthesis("");
    synthRef.current = "";
    setRunning(true);
    setSelected(null);

    const ctrls = reset.map(() => new AbortController());
    abortControllers.current = ctrls;

    const contextMessages = (() => {
      const active = state.chats.find((c) => c.id === state.activeChatId);
      const history = (active?.messages ?? []).slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      return [...history, { role: "user" as const, content: task }];
    })();

    const promises = reset.map(async (agent, i) => {
      const ctrl = ctrls[i];
      updateAgent(agent.id, { status: "running" });
      let answerBuf = "";
      let toolCount = 0;
      let stepCount = 0;

      try {
        await streamAgent(
          {
            messages: contextMessages,
            language: (lang as "en" | "ar") ?? "en",
            maxSteps: 8,
            customSystemPrompt: `You are a specialist cybersecurity agent — ${agent.name} unit.
Your focus: ${agent.focus}.
Analyse the task from your specialist perspective. Use your unique focus area to find insights others might miss.
Be concise but thorough. Maximum 4 paragraphs.`,
            redteamMode: true,
          },
          (ev: AgentEvent) => {
            if (ev.type === "step_start") {
              stepCount = ev.step;
              updateAgent(agent.id, { steps: stepCount });
            } else if (ev.type === "tool_call") {
              toolCount++;
              updateAgent(agent.id, { toolCalls: toolCount });
            } else if (ev.type === "answer_chunk") {
              answerBuf += ev.content;
              updateAgent(agent.id, { answer: answerBuf });
            } else if (ev.type === "done") {
              updateAgent(agent.id, { status: "done" });
            }
          },
          ctrl.signal,
        );
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          updateAgent(agent.id, { status: "error" });
        }
      }
    });

    await Promise.allSettled(promises);

    setRunning(false);

    setAgents((current) => {
      const completed = current.filter((a) => a.answer && a.status === "done");
      if (completed.length >= 2) runSynthesis(completed);
      return current;
    });
  }

  async function runSynthesis(completedAgents: AgentSlot[]) {
    setSynthesizing(true);
    synthRef.current = "";
    const ctrl = new AbortController();
    abortControllers.current = [ctrl];

    const agentAnswers = completedAgents.map((a) => `## ${a.name} UNIT\n${a.answer}`).join("\n\n---\n\n");

    try {
      await streamAgent(
        {
          messages: [
            {
              role: "user",
              content: `You are the FUSION COORDINATOR. Below are independent analyses from ${completedAgents.length} specialist agents.

TASK: ${task}

AGENT REPORTS:
${agentAnswers}

Your job: synthesize all perspectives into one unified, structured threat intelligence report. Cover all angles found across agents. Identify consensus points and unique findings. Format with headers.`,
            },
          ],
          language: (lang as "en" | "ar") ?? "en",
          maxSteps: 3,
          customSystemPrompt: "You are the FUSION COORDINATOR. Synthesize multiple agent reports into a unified intelligence report.",
        },
        (ev: AgentEvent) => {
          if (ev.type === "answer_chunk") {
            synthRef.current += ev.content;
            setSynthesis(synthRef.current);
          }
        },
        ctrl.signal,
      );
    } catch { /* ignored */ } finally {
      setSynthesizing(false);
    }
  }

  if (!open) return null;

  const activeAgent = selected !== null ? agents.find((a) => a.id === selected) : null;
  const allDone = agents.every((a) => a.status === "done" || a.status === "error");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#07070d", border: "1px solid rgba(249,115,22,0.25)", boxShadow: "0 0 60px rgba(249,115,22,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.35)" }}>
                  <Users className="w-4.5 h-4.5" style={{ color: "#f97316", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#f97316" }}>TEAM AGENT</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.06)" }}>oh-my-openagent</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#3a2010" }}>{teamSize} specialist agents running in parallel + fusion synthesis</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(249,115,22,0.2)" }}>
                  {TEAM_SIZES.map((n) => (
                    <button
                      key={n}
                      onClick={() => updateTeamSize(n)}
                      disabled={running}
                      className="px-2.5 py-1 text-[11px] font-bold transition-all disabled:opacity-40"
                      style={teamSize === n ? { background: "rgba(249,115,22,0.2)", color: "#f97316" } : { color: "#444" }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg" style={{ color: "#3a2010" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")} onMouseLeave={(e) => (e.currentTarget.style.color = "#3a2010")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {/* Task Input */}
              <div className="flex gap-2">
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Mission objective for all agents…"
                  rows={2}
                  disabled={running}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] font-mono outline-none resize-none"
                  style={{ borderColor: "rgba(249,115,22,0.25)", color: "#ccc" }}
                />
                {running ? (
                  <button onClick={stop} className="px-4 py-2 rounded-xl text-[11px] font-bold border self-stretch" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button onClick={execute} disabled={!task.trim()} className="px-4 py-2 rounded-xl text-[11px] font-bold border self-stretch disabled:opacity-40" style={{ background: "rgba(249,115,22,0.12)", borderColor: "rgba(249,115,22,0.4)", color: "#f97316" }}>
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                )}
              </div>

              {/* Agent Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelected(selected === agent.id ? null : agent.id)}
                    className="text-left p-3 rounded-xl border transition-all"
                    style={{
                      background: selected === agent.id ? `${agent.color}15` : "#0d0d10",
                      borderColor: selected === agent.id ? `${agent.color}50` : "rgba(255,255,255,0.07)",
                      boxShadow: selected === agent.id ? `0 0 20px ${agent.color}20` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black font-mono" style={{ color: agent.color }}>{agent.name}</span>
                      <span className="flex items-center gap-1 text-[9px] font-mono" style={{ color: agent.status === "done" ? "#00e5cc" : agent.status === "error" ? "#f87171" : agent.status === "running" ? agent.color : "#444" }}>
                        {agent.status === "running" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        {agent.status === "done" && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {agent.status === "error" && <XCircle className="w-2.5 h-2.5" />}
                        {agent.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] mb-2 leading-tight" style={{ color: "#555" }}>{agent.focus}</div>
                    {agent.status !== "idle" && (
                      <div className="flex gap-3 text-[9px] font-mono" style={{ color: "#555" }}>
                        <span>Steps: {agent.steps}</span>
                        <span>Tools: {agent.toolCalls}</span>
                      </div>
                    )}
                    {agent.answer && (
                      <div className="mt-2 text-[9px] leading-tight line-clamp-3" style={{ color: agent.color, opacity: 0.8 }}>
                        {agent.answer.slice(0, 120)}…
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Selected Agent Detail */}
              {activeAgent?.answer && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-3.5" style={{ background: `${activeAgent.color}08`, border: `1px solid ${activeAgent.color}30` }}>
                  <div className="text-[10px] font-black font-mono mb-2" style={{ color: activeAgent.color }}>{activeAgent.name} FULL REPORT</div>
                  <pre className="text-[11px] font-mono leading-relaxed text-gray-300 whitespace-pre-wrap">{activeAgent.answer}</pre>
                </motion.div>
              )}

              {/* Synthesis */}
              {(synthesis || synthesizing) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-3.5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.35)", boxShadow: "0 0 30px rgba(251,191,36,0.08)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Crown className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                    <span className="text-[10px] font-black font-mono" style={{ color: "#fbbf24" }}>FUSION SYNTHESIS</span>
                    {synthesizing && <Loader2 className="w-3 h-3 animate-spin ml-1" style={{ color: "#fbbf24" }} />}
                    {!synthesizing && synthesis && (
                      <button
                        onClick={() => pipeline.push({ source: "TeamAgent", sourceColor: "#f97316", label: "fusion synthesis", content: synthesis })}
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                        style={{ background: "rgba(0,229,204,0.08)", borderColor: "rgba(0,229,204,0.25)", color: "#00e5cc" }}
                      >
                        <GitMerge className="w-2.5 h-2.5" /> Pipe
                      </button>
                    )}
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed text-gray-200 whitespace-pre-wrap">{synthesis}</pre>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
