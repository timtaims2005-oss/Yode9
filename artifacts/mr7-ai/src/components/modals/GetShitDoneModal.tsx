import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckSquare, Square, Trash2, GitMerge, Zap, RotateCcw, Plus } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface GetShitDoneModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Task = {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
  aiExpanded?: string[];
  expanding?: boolean;
};

const PRIORITY_COLORS = { high: "#e21227", medium: "#fbbf24", low: "#60a5fa" };

export function GetShitDoneModal({ open, onOpenChange }: GetShitDoneModalProps) {
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goal, setGoal] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  function addTask() {
    if (!input.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).slice(2),
      text: input.trim(),
      done: false,
      priority: "medium",
    };
    setTasks((prev) => [...prev, newTask]);
    setInput("");
  }

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function setPriority(id: string, priority: Task["priority"]) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, priority } : t));
  }

  async function generatePlan() {
    if (!goal.trim()) {
      toast({ description: "Enter a goal first" });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Break down this goal into concrete actionable tasks (7-12 tasks). Return ONLY a JSON array:
[
  {"text": "Task description", "priority": "high|medium|low"},
  ...
]

Goal: ${goal}

Make tasks specific, actionable, and completable in one session. Order by priority.`,
          }],
          model: "gpt-5.4"
        }),
      });
      const text = await readChatText(res);
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("no array");
      const parsed: { text: string; priority: string }[] = JSON.parse(match[0]);
      const newTasks: Task[] = parsed.map((t) => ({
        id: Math.random().toString(36).slice(2),
        text: t.text,
        done: false,
        priority: (["high", "medium", "low"].includes(t.priority) ? t.priority : "medium") as Task["priority"],
      }));
      setTasks(newTasks);
    } catch {
      toast({ description: "Failed to generate plan" });
    }
    setGenerating(false);
  }

  async function expandTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, expanding: true } : t));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Break this task into 3-5 micro-steps. Return ONLY a JSON array of strings:
["step 1", "step 2", ...]
Task: ${task.text}`,
          }],
          model: "gpt-5.4"
        }),
      });
      const text = await readChatText(res);
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("no array");
      const steps: string[] = JSON.parse(match[0]);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, aiExpanded: steps, expanding: false } : t));
    } catch {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, expanding: false } : t));
    }
  }

  const done = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(249,115,22,0.25)", boxShadow: "0 0 60px rgba(249,115,22,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.4)" }}>
                  <Zap className="w-4 h-4" style={{ color: "#f97316" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#f97316" }}>GET SHIT DONE</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>AI-powered GTD task engine</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setTasks([])} className="p-1.5 rounded-lg text-gray-600 hover:text-orange-400 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Goal input + AI plan */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") generatePlan(); }}
                  placeholder="Enter your goal… (AI will break it into tasks)"
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none"
                  style={{ borderColor: "rgba(249,115,22,0.2)", color: "#ccc" }}
                />
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40 transition-all"
                  style={{ background: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.3)", color: "#f97316" }}
                >
                  {generating ? <span className="animate-pulse">…</span> : <><Zap className="w-3 h-3" />AI Plan</>}
                </button>
              </div>
            </div>

            {/* Progress */}
            {tasks.length > 0 && (
              <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono" style={{ color: "#555" }}>{done}/{tasks.length} done</span>
                  <span className="text-[10px] font-mono" style={{ color: "#f97316" }}>{progress}%</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#f97316" }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tasks list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Zap className="w-10 h-10" style={{ color: "#1a1000" }} />
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>Enter a goal to AI-generate your plan, or add tasks manually</div>
                </div>
              )}
              {["high", "medium", "low"].map((priority) => {
                const group = tasks.filter((t) => t.priority === priority);
                if (!group.length) return null;
                return (
                  <div key={priority}>
                    <div className="text-[9px] font-bold font-mono mb-1.5 uppercase" style={{ color: PRIORITY_COLORS[priority as Task["priority"]] }}>
                      {priority} priority
                    </div>
                    <div className="space-y-1.5">
                      {group.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="rounded-xl p-3"
                          style={{
                            background: task.done ? "rgba(255,255,255,0.02)" : `${PRIORITY_COLORS[task.priority]}08`,
                            border: `1px solid ${task.done ? "rgba(255,255,255,0.05)" : `${PRIORITY_COLORS[task.priority]}25`}`,
                            opacity: task.done ? 0.5 : 1,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                              {task.done
                                ? <CheckSquare className="w-4 h-4" style={{ color: "#4ade80" }} />
                                : <Square className="w-4 h-4" style={{ color: PRIORITY_COLORS[task.priority] }} />
                              }
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px]" style={{ color: task.done ? "#444" : "#ccc", textDecoration: task.done ? "line-through" : "none" }}>
                                {task.text}
                              </div>
                              {task.aiExpanded && (
                                <div className="mt-1.5 space-y-0.5 pl-2 border-l" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                                  {task.aiExpanded.map((step, i) => (
                                    <div key={i} className="text-[10px]" style={{ color: "#555" }}>· {step}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => expandTask(task.id)}
                                disabled={task.expanding}
                                className="text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all"
                                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#444" }}
                              >
                                {task.expanding ? "…" : "expand"}
                              </button>
                              <button onClick={() => deleteTask(task.id)}>
                                <Trash2 className="w-3 h-3" style={{ color: "#333" }} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Manual add + pipe */}
            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                  placeholder="Add task manually…"
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[12px] outline-none"
                  style={{ borderColor: "rgba(249,115,22,0.15)", color: "#ccc" }}
                />
                <button onClick={addTask} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)" }}>
                  <Plus className="w-4 h-4" style={{ color: "#f97316" }} />
                </button>
                <button
                  onClick={() => pipeline.push({ source: "GSD", sourceColor: "#f97316", label: "Task list", content: tasks.map((t) => `[${t.done ? "x" : " "}] ${t.text}`).join("\n") })}
                  className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,204,0.08)", border: "1px solid rgba(0,229,204,0.2)" }}
                >
                  <GitMerge className="w-4 h-4" style={{ color: "#00e5cc" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
