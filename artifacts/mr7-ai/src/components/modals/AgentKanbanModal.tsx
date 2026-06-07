import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Play, RotateCcw, GitMerge, Users, Shield, ChevronDown } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface AgentKanbanModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Role = "PLANNER" | "CODER" | "REVIEWER" | "TESTER" | "DEPLOYER";
type CardStatus = "backlog" | "running" | "review" | "done" | "failed";
type Agent = { id: string; name: string; role: Role; identity: string; color: string };
type Card = {
  id: string;
  title: string;
  prompt: string;
  status: CardStatus;
  assignedTo: string | null;
  output: string;
  running: boolean;
  subtasks: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
};

const ROLE_COLORS: Record<Role, string> = {
  PLANNER:  "#a78bfa",
  CODER:    "#3b82f6",
  REVIEWER: "#fbbf24",
  TESTER:   "#10b981",
  DEPLOYER: "#fb923c",
};

const AGENTS: Agent[] = [
  { id: "a1", name: "Aria",   role: "PLANNER",  identity: "0x4A72...F3a1", color: "#a78bfa" },
  { id: "a2", name: "Bruno",  role: "CODER",    identity: "0x2B93...88d4", color: "#3b82f6" },
  { id: "a3", name: "Cleo",   role: "REVIEWER", identity: "0x7C14...2f90", color: "#fbbf24" },
  { id: "a4", name: "Dex",    role: "TESTER",   identity: "0x1D85...cc72", color: "#10b981" },
  { id: "a5", name: "Echo",   role: "DEPLOYER", identity: "0x9E26...5b3e", color: "#fb923c" },
];

const COLS: { id: CardStatus; label: string; color: string }[] = [
  { id: "backlog", label: "BACKLOG",   color: "#555"    },
  { id: "running", label: "IN PROGRESS", color: "#fbbf24" },
  { id: "review",  label: "REVIEW",    color: "#a78bfa" },
  { id: "done",    label: "DONE",      color: "#10b981" },
  { id: "failed",  label: "FAILED",    color: "#e21227" },
];

const INITIAL_CARDS: Card[] = [
  {
    id: "c1", title: "Design authentication flow",
    prompt: "Design a secure JWT + refresh-token authentication system with role-based access control",
    status: "done", assignedTo: "a1", output: "Auth flow designed: JWT (15min) + refresh tokens (7d), RBAC with user/admin/superadmin roles. Schema: users, roles, permissions, refresh_tokens tables.",
    running: false, subtasks: ["Define user roles", "Design JWT payload", "Plan refresh token rotation"], priority: "HIGH",
  },
  {
    id: "c2", title: "Implement auth middleware",
    prompt: "Implement the authentication middleware in TypeScript using the designed auth flow",
    status: "running", assignedTo: "a2", output: "",
    running: true, subtasks: ["Write JWT validation", "Implement refresh endpoint", "Add role middleware"], priority: "HIGH",
  },
  {
    id: "c3", title: "Write auth unit tests",
    prompt: "Write comprehensive unit tests for the authentication middleware covering edge cases",
    status: "backlog", assignedTo: "a4", output: "",
    running: false, subtasks: ["Test token expiry", "Test invalid tokens", "Test role enforcement"], priority: "MEDIUM",
  },
  {
    id: "c4", title: "Code review auth PR",
    prompt: "Review the auth middleware PR for security vulnerabilities and code quality",
    status: "backlog", assignedTo: "a3", output: "",
    running: false, subtasks: ["Check for timing attacks", "Validate input sanitization", "Review error handling"], priority: "HIGH",
  },
];

const PRIORITY_COLORS = { HIGH: "#e21227", MEDIUM: "#fbbf24", LOW: "#10b981" };

export function AgentKanbanModal({ open, onOpenChange }: AgentKanbanModalProps) {
  const { toast } = useToast();
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newAssignee, setNewAssignee] = useState("a2");
  const [newPriority, setNewPriority] = useState<"HIGH"|"MEDIUM"|"LOW">("MEDIUM");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAgents, setShowAgents] = useState(false);

  function addCard() {
    if (!newTitle.trim() || !newPrompt.trim()) return;
    const sub = newPrompt.split(".").filter(Boolean).slice(0, 3).map(s => s.trim().slice(0, 50));
    setCards(prev => [...prev, {
      id: `c${Date.now()}`, title: newTitle, prompt: newPrompt,
      status: "backlog", assignedTo: newAssignee, output: "", running: false,
      subtasks: sub, priority: newPriority,
    }]);
    setNewTitle(""); setNewPrompt(""); setShowForm(false);
  }

  async function runCard(id: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: "running", running: true, output: "" } : c));
    try {
      const card = cards.find(c => c.id === id)!;
      const agent = AGENTS.find(a => a.id === card.assignedTo)!;
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: card.prompt }],
          model: "gpt-5.4",
          systemPrompt: `You are ${agent.name}, an AI agent with role ${agent.role} (identity: ${agent.identity}). ${agent.role === "PLANNER" ? "Break down tasks and create subtasks." : agent.role === "CODER" ? "Write clean, production-ready code." : agent.role === "REVIEWER" ? "Review code for security and quality." : agent.role === "TESTER" ? "Write comprehensive tests." : "Handle deployment and infrastructure."} Be concise and produce actionable output.`
        }),
      });
      const output = await readChatText(r);
      setCards(prev => prev.map(c => c.id === id ? { ...c, status: "review", running: false, output } : c));
      pipeline.push({ source: "AgentKanban", sourceColor: "#00e5cc", label: card.title, content: output });
      toast({ description: `${agent.name} completed: ${card.title}` });
    } catch {
      setCards(prev => prev.map(c => c.id === id ? { ...c, status: "failed", running: false, output: "API error" } : c));
    }
  }

  function approveCard(id: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: "done" } : c));
    toast({ description: "Card approved and moved to Done" });
  }

  function resetCard(id: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: "backlog", output: "", running: false } : c));
  }

  function selfOrganize() {
    setCards(prev => prev.map(c => {
      if (c.status !== "backlog") return c;
      const role: Role = c.title.toLowerCase().includes("design") || c.title.toLowerCase().includes("plan") ? "PLANNER"
        : c.title.toLowerCase().includes("test") ? "TESTER"
        : c.title.toLowerCase().includes("review") ? "REVIEWER"
        : c.title.toLowerCase().includes("deploy") ? "DEPLOYER"
        : "CODER";
      const agent = AGENTS.find(a => a.role === role) || AGENTS[1];
      return { ...c, assignedTo: agent.id };
    }));
    toast({ description: "Agents self-organized based on task types" });
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full max-w-5xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(251,191,36,0.35)", maxHeight: "92vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}>
            <GitMerge size={20} color="#fbbf24" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">AGENT KANBAN</div>
              <div className="text-xs" style={{ color: "#666" }}>Mission control for your AI workforce — agents create tasks, assign teammates, self-organize</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowAgents(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(251,191,36,0.3)", color: "#fbbf24" }}
              ><Users size={11} /> TEAM ({AGENTS.length})</button>
              <button onClick={selfOrganize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(167,139,250,0.3)", color: "#a78bfa" }}
              ><Shield size={11} /> SELF-ORGANIZE</button>
              <button onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#ccc" }}
              ><Plus size={11} /> ADD TASK</button>
              <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-white/10 transition-colors ml-1"><X size={16} color="#666" /></button>
            </div>
          </div>

          {/* Agents row */}
          <AnimatePresence>
            {showAgents && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex gap-3 px-5 py-3 border-b overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
              >
                {AGENTS.map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0" style={{ borderColor: a.color + "40", background: a.color + "10" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: a.color + "30", color: a.color }}>{a.name[0]}</div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: a.color }}>{a.name}</div>
                      <div className="text-xs" style={{ color: "#555" }}>{a.role}</div>
                    </div>
                    <div className="text-xs font-mono ml-2" style={{ color: "#333" }}>{a.identity}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add task form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-5 py-3 border-b overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
              >
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title"
                    className="px-3 py-2 rounded border text-sm col-span-2" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                  <div className="flex gap-2">
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
                      className="flex-1 px-2 py-2 rounded border text-xs" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }}>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                    <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
                      className="flex-1 px-2 py-2 rounded border text-xs" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }}>
                      {AGENTS.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                    </select>
                  </div>
                </div>
                <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Task description / prompt for the agent…"
                  rows={2} className="w-full px-3 py-2 rounded border text-sm resize-none mb-3"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }} />
                <div className="flex gap-2">
                  <button onClick={addCard} className="px-4 py-1.5 rounded text-xs font-bold border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(251,191,36,0.5)", color: "#fbbf24" }}>ADD TASK</button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded text-xs border transition-all hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#666" }}>CANCEL</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kanban board */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-4 h-full min-w-max">
              {COLS.map(col => {
                const colCards = cards.filter(c => c.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col rounded-lg border w-56 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-bold tracking-widest" style={{ color: col.color }}>{col.label}</span>
                      <span className="ml-auto text-xs font-mono" style={{ color: "#444" }}>{colCards.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colCards.map(card => {
                        const agent = AGENTS.find(a => a.id === card.assignedTo);
                        const isExpanded = expanded === card.id;
                        return (
                          <div key={card.id} className="rounded border p-2.5" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <span className="text-xs font-medium text-white leading-tight">{card.title}</span>
                              <span className="text-xs px-1 rounded flex-shrink-0" style={{ background: PRIORITY_COLORS[card.priority] + "20", color: PRIORITY_COLORS[card.priority] }}>{card.priority[0]}</span>
                            </div>
                            {agent && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ background: agent.color + "30", color: agent.color }}>{agent.name[0]}</div>
                                <span className="text-xs" style={{ color: "#555" }}>{agent.name} · {agent.role}</span>
                              </div>
                            )}
                            {card.running && (
                              <motion.div className="text-xs mb-2" style={{ color: "#fbbf24" }} animate={{ opacity: [1,0.4,1] }} transition={{ repeat: Infinity, duration: 1 }}>processing…</motion.div>
                            )}
                            {card.subtasks.length > 0 && (
                              <div className="mb-2">
                                {card.subtasks.map((st, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#555" }}>
                                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: card.status === "done" ? "#10b981" : "#333" }} />
                                    <span className="truncate">{st}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isExpanded && card.output && (
                              <div className="text-xs p-2 rounded mb-2 max-h-24 overflow-y-auto" style={{ background: "rgba(255,255,255,0.04)", color: "#888" }}>{card.output}</div>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              {card.status === "backlog" && (
                                <button onClick={() => runCard(card.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all hover:bg-white/5"
                                  style={{ borderColor: "rgba(251,191,36,0.4)", color: "#fbbf24" }}
                                ><Play size={9} /> RUN</button>
                              )}
                              {card.status === "review" && (
                                <button onClick={() => approveCard(card.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all hover:bg-white/5"
                                  style={{ borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
                                ><GitMerge size={9} /> APPROVE</button>
                              )}
                              {card.output && (
                                <button onClick={() => setExpanded(isExpanded ? null : card.id)}
                                  className="px-1.5 py-1 rounded text-xs border transition-all hover:bg-white/5 ml-auto"
                                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#555" }}
                                ><ChevronDown size={9} /></button>
                              )}
                              {(card.status === "done" || card.status === "failed") && (
                                <button onClick={() => resetCard(card.id)}
                                  className="px-1.5 py-1 rounded text-xs border transition-all hover:bg-white/5"
                                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#555" }}
                                ><RotateCcw size={9} /></button>
                              )}
                              <button onClick={() => setCards(prev => prev.filter(c => c.id !== card.id))}
                                className="px-1.5 py-1 rounded text-xs border transition-all hover:bg-white/5 ml-auto"
                                style={{ borderColor: "rgba(255,255,255,0.06)", color: "#444" }}
                              ><Trash2 size={9} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
