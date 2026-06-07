import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Layers, Play, Square, Plus, Trash2, Clock,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

interface AgentOSModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type TaskInterval = "30s" | "1m" | "5m" | "15m" | "1h";
type TaskStatus = "idle" | "running" | "done" | "error" | "scheduled";

type ScheduledTask = {
  id: string;
  name: string;
  prompt: string;
  interval: TaskInterval;
  status: TaskStatus;
  lastRun: string | null;
  lastOutput: string;
  runCount: number;
  enabled: boolean;
  expanded: boolean;
};

const INTERVAL_MS: Record<TaskInterval, number> = {
  "30s": 30_000,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
};

const INTERVAL_LABELS: TaskInterval[] = ["30s", "1m", "5m", "15m", "1h"];

const PRESET_TASKS: { name: string; prompt: string; interval: TaskInterval }[] = [
  {
    name: "Threat Intel Monitor",
    prompt: "Search for the latest critical CVEs and zero-day exploits reported in the last 24 hours. List the top 5 with severity, affected software, and mitigation steps.",
    interval: "15m",
  },
  {
    name: "OSINT News Digest",
    prompt: "Summarize the top cybersecurity news and threat intelligence from the last hour. Focus on APT activity, ransomware, and data breaches.",
    interval: "1h",
  },
  {
    name: "Code Security Audit",
    prompt: "Review common security anti-patterns in web applications. Provide a brief checklist of OWASP Top 10 items with detection tips.",
    interval: "5m",
  },
  {
    name: "Network Anomaly Probe",
    prompt: "List 5 common signs of network intrusion or lateral movement that a SOC analyst should watch for. Include detection queries or indicators.",
    interval: "15m",
  },
];

const SYSTEM_PROMPT = `You are Agent OS — an autonomous AI agent running on a scheduled timer. You execute intelligence-gathering, monitoring, and analysis tasks automatically and report findings in a concise, structured format. Always be direct and technical. Format output clearly with sections if needed.`;

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export function AgentOSModal({ open, onOpenChange }: AgentOSModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newInterval, setNewInterval] = useState<TaskInterval>("5m");
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const abortRefs = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearInterval(t));
      abortRefs.current.forEach((c) => c.abort());
    };
  }, []);

  function updateTask(id: string, patch: Partial<ScheduledTask>) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }

  async function runTask(task: ScheduledTask) {
    const ctrl = new AbortController();
    abortRefs.current.set(task.id, ctrl);
    updateTask(task.id, { status: "running", lastRun: new Date().toLocaleTimeString() });

    let output = "";
    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: (lang as "en" | "ar") ?? "en",
          memory: [],
          messages: [{ role: "user", content: task.prompt }],
          customSystemPrompt: SYSTEM_PROMPT,
        },
        (chunk) => {
          output += chunk;
          updateTask(task.id, { lastOutput: output });
        },
        ctrl.signal,
      );
      updateTask(task.id, {
        status: "done",
        lastOutput: output,
        runCount: task.runCount + 1,
      });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        updateTask(task.id, { status: "error", lastOutput: `Error: ${(e as Error)?.message ?? "Failed"}` });
      }
    }
  }

  function scheduleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const ms = INTERVAL_MS[task.interval];
    runTask(task);
    const timer = setInterval(() => {
      setTasks((prev) => {
        const t = prev.find((x) => x.id === id);
        if (t && t.enabled) runTask(t);
        return prev;
      });
    }, ms);
    timersRef.current.set(id, timer);
    updateTask(id, { enabled: true, status: "scheduled" });
  }

  function stopTask(id: string) {
    const timer = timersRef.current.get(id);
    if (timer) { clearInterval(timer); timersRef.current.delete(id); }
    abortRefs.current.get(id)?.abort();
    abortRefs.current.delete(id);
    updateTask(id, { enabled: false, status: "idle" });
  }

  function deleteTask(id: string) {
    stopTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask() {
    if (!newName.trim() || !newPrompt.trim()) return;
    const task: ScheduledTask = {
      id: genId(),
      name: newName.trim(),
      prompt: newPrompt.trim(),
      interval: newInterval,
      status: "idle",
      lastRun: null,
      lastOutput: "",
      runCount: 0,
      enabled: false,
      expanded: false,
    };
    setTasks((prev) => [...prev, task]);
    setNewName("");
    setNewPrompt("");
    setNewInterval("5m");
    setCreating(false);
  }

  function loadPreset(p: typeof PRESET_TASKS[0]) {
    setNewName(p.name);
    setNewPrompt(p.prompt);
    setNewInterval(p.interval);
    setCreating(true);
  }

  const statusColor: Record<TaskStatus, string> = {
    idle: "#444",
    running: "#fbbf24",
    done: "#4ade80",
    error: "#f87171",
    scheduled: "#00e5cc",
  };

  const statusLabel: Record<TaskStatus, string> = {
    idle: "IDLE",
    running: "RUNNING",
    done: "DONE",
    error: "ERROR",
    scheduled: "SCHEDULED",
  };

  if (!open) return null;

  const activeTasks = tasks.filter((t) => t.enabled).length;

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#080a0c",
              border: "1px solid rgba(251,146,60,0.25)",
              boxShadow: "0 0 60px rgba(251,146,60,0.12), 0 30px 60px rgba(0,0,0,0.9)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: "rgba(251,146,60,0.2)", background: "rgba(251,146,60,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.4)" }}
                >
                  <Layers className="w-4.5 h-4.5" style={{ color: "#fb923c", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#fb923c" }}>
                      AGENT<span className="text-white"> OS</span>
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono"
                      style={{ color: "#fb923c", borderColor: "rgba(251,146,60,0.35)", background: "rgba(251,146,60,0.08)" }}
                    >
                      OPENFANG
                    </span>
                    {activeTasks > 0 && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono animate-pulse"
                        style={{ background: "rgba(0,229,204,0.12)", color: "#00e5cc" }}
                      >
                        {activeTasks} ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px]" style={{ color: "#3a2010" }}>
                    Schedule autonomous AI tasks — fire and forget
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreating((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    background: creating ? "rgba(251,146,60,0.15)" : "rgba(251,146,60,0.06)",
                    borderColor: creating ? "rgba(251,146,60,0.5)" : "rgba(251,146,60,0.2)",
                    color: "#fb923c",
                  }}
                >
                  <Plus className="w-3 h-3" />
                  New Task
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "#333" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fb923c")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Create form */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="px-4 py-3 border-b space-y-3" style={{ borderColor: "rgba(251,146,60,0.15)", background: "rgba(251,146,60,0.02)" }}>
                    {/* Presets */}
                    <div>
                      <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#fb923c" }}>PRESETS</div>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_TASKS.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => loadPreset(p)}
                            className="px-2 py-1 rounded text-[10px] font-mono transition-colors"
                            style={{ background: "#111", border: "1px solid rgba(251,146,60,0.2)", color: "#666" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#fb923c")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Task name…"
                      className="w-full bg-transparent border rounded-lg px-3 py-2 text-[12px] outline-none"
                      style={{ borderColor: "rgba(251,146,60,0.25)", color: "#ccc" }}
                    />
                    <textarea
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="What should the agent do on each run?…"
                      rows={3}
                      className="w-full bg-transparent border rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                      style={{ borderColor: "rgba(251,146,60,0.25)", color: "#ccc" }}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: "#fb923c" }} />
                        <span className="text-[11px] font-mono" style={{ color: "#666" }}>Interval:</span>
                        <div className="flex gap-1">
                          {INTERVAL_LABELS.map((iv) => (
                            <button
                              key={iv}
                              onClick={() => setNewInterval(iv)}
                              className="px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all"
                              style={
                                newInterval === iv
                                  ? { background: "rgba(251,146,60,0.15)", borderColor: "rgba(251,146,60,0.4)", color: "#fb923c" }
                                  : { background: "#111", borderColor: "rgba(255,255,255,0.07)", color: "#555" }
                              }
                            >
                              {iv}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={() => { setCreating(false); setNewName(""); setNewPrompt(""); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                        style={{ borderColor: "rgba(255,255,255,0.08)", color: "#555" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addTask}
                        disabled={!newName.trim() || !newPrompt.trim()}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40"
                        style={{ background: "rgba(251,146,60,0.12)", borderColor: "rgba(251,146,60,0.4)", color: "#fb923c" }}
                      >
                        <Plus className="w-3 h-3 inline mr-1" />
                        Create Task
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}
                  >
                    <Layers className="w-8 h-8" style={{ color: "rgba(251,146,60,0.3)" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-[12px] font-bold" style={{ color: "#333" }}>No scheduled tasks</div>
                    <div className="text-[10px] mt-1" style={{ color: "#222" }}>
                      Create a task or load a preset to get started
                    </div>
                  </div>
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-[12px] border"
                    style={{ background: "rgba(251,146,60,0.08)", borderColor: "rgba(251,146,60,0.3)", color: "#fb923c" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create First Task
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      className="rounded-xl overflow-hidden border transition-all"
                      style={{
                        background: task.enabled ? "rgba(251,146,60,0.04)" : "#0d0d0d",
                        borderColor: task.enabled ? "rgba(251,146,60,0.25)" : "rgba(255,255,255,0.07)",
                      }}
                    >
                      {/* Task header row */}
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {/* Status dot */}
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: statusColor[task.status],
                            boxShadow: task.status === "running" || task.status === "scheduled"
                              ? `0 0 6px ${statusColor[task.status]}`
                              : undefined,
                            animation: task.status === "running" ? "pulse 1s infinite" : undefined,
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold truncate" style={{ color: task.enabled ? "#fff" : "#555" }}>
                              {task.name}
                            </span>
                            <span
                              className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                background: `${statusColor[task.status]}15`,
                                color: statusColor[task.status],
                              }}
                            >
                              {statusLabel[task.status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-mono" style={{ color: "#333" }}>
                              every {task.interval}
                            </span>
                            {task.lastRun && (
                              <span className="text-[9px] font-mono" style={{ color: "#333" }}>
                                · last: {task.lastRun}
                              </span>
                            )}
                            {task.runCount > 0 && (
                              <span className="text-[9px] font-mono" style={{ color: "#333" }}>
                                · runs: {task.runCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Expand */}
                          <button
                            onClick={() => updateTask(task.id, { expanded: !task.expanded })}
                            className="p-1 rounded transition-colors"
                            style={{ color: "#333" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#fb923c")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                          >
                            {task.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {/* Run once */}
                          {!task.enabled && (
                            <button
                              onClick={() => runTask(task)}
                              disabled={task.status === "running"}
                              className="p-1 rounded transition-colors disabled:opacity-40"
                              title="Run once"
                              style={{ color: "#555" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#4ade80")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Schedule / Stop */}
                          {task.enabled ? (
                            <button
                              onClick={() => stopTask(task.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all"
                              style={{ background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.35)", color: "#f87171" }}
                            >
                              <Square className="w-2.5 h-2.5 fill-current" /> Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => scheduleTask(task.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all"
                              style={{ background: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.35)", color: "#fb923c" }}
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> Start
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded transition-colors"
                            style={{ color: "#333" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded output */}
                      <AnimatePresence>
                        {task.expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-2">
                              <div className="text-[9px] font-mono" style={{ color: "#333" }}>
                                Prompt: {task.prompt.slice(0, 120)}{task.prompt.length > 120 ? "…" : ""}
                              </div>
                              {task.lastOutput && (
                                <div
                                  className="rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed max-h-48 overflow-y-auto"
                                  style={{ background: "#080808", border: "1px solid rgba(251,146,60,0.12)", color: "#ccc", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                                >
                                  {task.lastOutput}
                                  {task.status === "running" && (
                                    <Loader2 className="inline w-3 h-3 ml-1 animate-spin" style={{ color: "#fb923c" }} />
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(251,146,60,0.1)" }}>
              <span className="text-[9px] font-mono" style={{ color: "#333" }}>
                src: OpenFang · Autonomous Task OS
              </span>
              <span className="text-[9px] font-mono" style={{ color: activeTasks > 0 ? "#00e5cc" : "#333" }}>
                {activeTasks > 0 ? `${activeTasks} task${activeTasks > 1 ? "s" : ""} running` : "All tasks idle"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
