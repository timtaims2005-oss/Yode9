import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Play, ChevronDown, ChevronUp, Shield, Target,
  Search, Scan, Zap, FileText, AlertTriangle, CheckCircle2,
  Clock, Flag, Tag, Copy, Check, MoreHorizontal, Brain,
  ArrowRight, Loader2, RefreshCw, Download, Filter,
  Globe, Lock, Wifi, Bug, Eye, Crosshair,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/chat-client";

interface SecurityKanbanModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Phase = "recon" | "scan" | "exploit" | "report";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
type Priority = "P1" | "P2" | "P3" | "P4";

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  cve?: string;
  affected?: string;
}

interface Task {
  id: string;
  title: string;
  target: string;
  phase: Phase;
  severity: Severity;
  priority: Priority;
  tags: string[];
  notes: string;
  findings: Finding[];
  aiOutput: string;
  running: boolean;
  createdAt: number;
  completedAt?: number;
}

const PHASES: { id: Phase; label: string; color: string; icon: typeof Shield; desc: string }[] = [
  { id: "recon",   label: "RECON",   color: "#3b82f6", icon: Search,   desc: "Intelligence gathering & OSINT" },
  { id: "scan",    label: "SCAN",    color: "#f59e0b", icon: Scan,     desc: "Port scanning & enumeration" },
  { id: "exploit", label: "EXPLOIT", color: "#e21227", icon: Zap,      desc: "Vulnerability exploitation" },
  { id: "report",  label: "REPORT",  color: "#10b981", icon: FileText, desc: "Documentation & remediation" },
];

const SEV_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: "#e21227", bg: "rgba(226,18,39,0.15)",  label: "CRIT" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.15)", label: "HIGH" },
  MEDIUM:   { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "MED"  },
  LOW:      { color: "#3b82f6", bg: "rgba(59,130,246,0.15)", label: "LOW"  },
  INFO:     { color: "#6b7280", bg: "rgba(107,114,128,0.15)",label: "INFO" },
};

const PRI_CONFIG: Record<Priority, { color: string; label: string }> = {
  P1: { color: "#e21227", label: "P1" },
  P2: { color: "#f97316", label: "P2" },
  P3: { color: "#f59e0b", label: "P3" },
  P4: { color: "#6b7280", label: "P4" },
};

const PHASE_PROMPTS: Record<Phase, (task: Task) => string> = {
  recon: (t) => `You are a professional penetration tester conducting reconnaissance on target: ${t.target || "the target"}.

Task: ${t.title}
${t.notes ? `Notes: ${t.notes}` : ""}

Perform comprehensive OSINT and intelligence gathering. Include:
1. Passive reconnaissance steps (DNS records, WHOIS, certificates, Shodan)
2. Social engineering attack surface
3. Technology stack fingerprinting
4. Employee and organization intelligence
5. Infrastructure mapping
6. Key findings and risk indicators

Format as a structured recon report with findings categorized by risk.`,

  scan: (t) => `You are a professional penetration tester performing active scanning on: ${t.target || "the target"}.

Task: ${t.title}
${t.notes ? `Notes: ${t.notes}` : ""}

Conduct systematic enumeration. Include:
1. Port scan results (top 1000 ports simulation)
2. Service version detection
3. OS fingerprinting
4. Web application fingerprinting (if applicable)
5. Directory and file enumeration
6. Authentication surface discovery
7. Vulnerability indicators found

Format as a professional scan report with prioritized findings.`,

  exploit: (t) => `You are a professional red team operator targeting: ${t.target || "the target"}.

Task: ${t.title}
${t.notes ? `Notes: ${t.notes}` : ""}

Develop exploitation strategy. Include:
1. Identified vulnerabilities and CVEs
2. Exploitation techniques (educational/research purposes)
3. Proof-of-concept approaches
4. Post-exploitation pivot opportunities
5. Lateral movement paths
6. Data exfiltration considerations
7. Risk severity assessment with CVSS scores

Format as a technical exploitation report for authorized testing.`,

  report: (t) => `You are a professional cybersecurity consultant writing a penetration test report for: ${t.target || "the target"}.

Task: ${t.title}
${t.notes ? `Notes: ${t.notes}` : ""}

Generate a comprehensive security report. Include:
1. Executive Summary
2. Scope and Methodology
3. Risk Rating Matrix
4. Detailed Findings with severity, description, evidence, and remediation
5. Remediation Roadmap (30/60/90 day plan)
6. Technical Recommendations
7. Compliance implications (if applicable)

Format as a professional penetration testing report ready for client delivery.`,
};

const INITIAL_TASKS: Task[] = [
  {
    id: "t1", title: "Subdomain Enumeration", target: "example.com",
    phase: "recon", severity: "HIGH", priority: "P1",
    tags: ["DNS", "OSINT", "passive"],
    notes: "Focus on finding hidden subdomains and infrastructure",
    findings: [], aiOutput: "", running: false, createdAt: Date.now() - 86400000,
  },
  {
    id: "t2", title: "Full Port Scan + Service Detection", target: "192.168.1.0/24",
    phase: "scan", severity: "CRITICAL", priority: "P1",
    tags: ["nmap", "service-enum", "active"],
    notes: "Internal network segment — all ports",
    findings: [], aiOutput: "", running: false, createdAt: Date.now() - 43200000,
  },
  {
    id: "t3", title: "SQL Injection Assessment", target: "https://app.example.com/login",
    phase: "exploit", severity: "CRITICAL", priority: "P1",
    tags: ["sqli", "web", "auth-bypass"],
    notes: "Login form shows error messages — potential SQLi",
    findings: [
      { id: "f1", title: "SQL Injection in username parameter", description: "Time-based blind SQLi detected", severity: "CRITICAL", cve: "CWE-89", affected: "/login?user=" },
    ], aiOutput: "", running: false, createdAt: Date.now() - 3600000,
  },
  {
    id: "t4", title: "Executive Penetration Test Report", target: "example.com",
    phase: "report", severity: "HIGH", priority: "P2",
    tags: ["report", "executive", "remediation"],
    notes: "Q2 2026 pentest engagement",
    findings: [], aiOutput: "", running: false, createdAt: Date.now() - 1800000,
  },
];

const STORAGE_KEY = "mr7-security-kanban-v1";

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Task[];
  } catch { /* ignore */ }
  return INITIAL_TASKS;
}

function save(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function uid() { return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function fid() { return `finding-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export function SecurityKanbanModal({ open, onOpenChange }: SecurityKanbanModalProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(load);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskPhase, setNewTaskPhase] = useState<Phase | null>(null);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [addFindingFor, setAddFindingFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  const [newTask, setNewTask] = useState<Partial<Task>>({ severity: "HIGH", priority: "P1", tags: [] });
  const [newFinding, setNewFinding] = useState<Partial<Finding>>({ severity: "HIGH" });

  useEffect(() => { save(tasks); }, [tasks]);

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast({ description: "Task deleted." });
  }

  function addTask() {
    if (!newTask.title?.trim() || !newTaskPhase) return;
    const t: Task = {
      id: uid(), title: newTask.title!, target: newTask.target || "",
      phase: newTaskPhase, severity: newTask.severity as Severity || "HIGH",
      priority: newTask.priority as Priority || "P1", tags: newTask.tags || [],
      notes: newTask.notes || "", findings: [], aiOutput: "",
      running: false, createdAt: Date.now(),
    };
    setTasks(prev => [...prev, t]);
    setNewTask({ severity: "HIGH", priority: "P1", tags: [] });
    setNewTaskPhase(null);
    toast({ description: "Task created." });
  }

  function moveTask(id: string, dir: -1 | 1) {
    const phaseOrder: Phase[] = ["recon", "scan", "exploit", "report"];
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const idx = phaseOrder.indexOf(t.phase);
      const next = phaseOrder[idx + dir];
      return next ? { ...t, phase: next, completedAt: next === "report" ? Date.now() : undefined } : t;
    }));
  }

  async function runAI(task: Task) {
    updateTask(task.id, { running: true, aiOutput: "" });
    const prompt = PHASE_PROMPTS[task.phase](task);
    let acc = "";
    try {
      await streamChat(
        { model: "CHAT-GPT Pro", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: prompt }], mode: "chat", webContext: null, customSystemPrompt: "You are an expert penetration tester and cybersecurity professional.", provider: "personal", providerModel: "gpt-3.5-turbo" },
        (chunk) => {
          acc += chunk;
          updateTask(task.id, { aiOutput: acc });
        },
      );
    } catch {
      acc += "\n\n[AI generation failed — check connection]";
      updateTask(task.id, { aiOutput: acc });
    } finally {
      updateTask(task.id, { running: false });
    }
  }

  function addFinding(taskId: string) {
    if (!newFinding.title?.trim()) return;
    const f: Finding = {
      id: fid(), title: newFinding.title!, description: newFinding.description || "",
      severity: newFinding.severity as Severity || "HIGH", cve: newFinding.cve, affected: newFinding.affected,
    };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, findings: [...t.findings, f] } : t));
    setNewFinding({ severity: "HIGH" });
    setAddFindingFor(null);
  }

  function removeFinding(taskId: string, findingId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, findings: t.findings.filter(f => f.id !== findingId) } : t));
  }

  function copyOutput(task: Task) {
    navigator.clipboard.writeText(task.aiOutput);
    setCopiedId(task.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportBoard() {
    const md = tasks.map(t => `## [${t.phase.toUpperCase()}] ${t.title}\n**Target:** ${t.target}\n**Severity:** ${t.severity} | **Priority:** ${t.priority}\n**Tags:** ${t.tags.join(", ")}\n\n${t.notes}\n\n${t.aiOutput ? `### AI Analysis\n${t.aiOutput}` : ""}\n\n${t.findings.length ? `### Findings\n${t.findings.map(f => `- **${f.severity}**: ${f.title} ${f.cve ? `(${f.cve})` : ""}\n  ${f.description}`).join("\n")}` : ""}`).join("\n\n---\n\n");
    const blob = new Blob([`# Security Pentest Board\n\n${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "pentest-board.md"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Board exported as Markdown." });
  }

  const filtered = tasks.filter(t => {
    if (filter !== "ALL" && t.severity !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.target.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    critical: tasks.filter(t => t.severity === "CRITICAL").length,
    findings: tasks.reduce((s, t) => s + t.findings.length, 0),
    inProgress: tasks.filter(t => t.phase === "exploit").length,
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 flex flex-col rounded-[18px] border overflow-hidden shadow-2xl"
        style={{ width: "min(1400px, 98vw)", height: "min(900px, 96vh)", background: "#080808", borderColor: "rgba(226,18,39,0.2)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(226,18,39,0.15)", background: "#0a0a0a" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}>
            <Shield className="w-4 h-4" style={{ color: "#e21227" }} />
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-white">SECURITY PENTEST BOARD</div>
            <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Recon → Scan → Exploit → Report</div>
          </div>

          {/* Stats */}
          {showStats && (
            <div className="flex items-center gap-3 ml-4">
              {[
                { label: "TASKS", val: stats.total, color: "#3b82f6" },
                { label: "CRITICAL", val: stats.critical, color: "#e21227" },
                { label: "FINDINGS", val: stats.findings, color: "#f59e0b" },
                { label: "ACTIVE", val: stats.inProgress, color: "#10b981" },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center">
                  <span className="text-base font-black font-mono leading-none" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="pl-7 pr-3 py-1.5 rounded-lg text-[11px] border outline-none w-36"
                style={{ background: "#111", borderColor: "#222", color: "#fff" }} />
            </div>

            {/* Filter */}
            <div className="flex gap-1">
              {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className="px-2 py-1 rounded text-[9px] font-bold border transition-all"
                  style={filter === s
                    ? s === "ALL" ? { background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "#333" }
                      : { background: SEV_CONFIG[s as Severity].bg, color: SEV_CONFIG[s as Severity].color, borderColor: SEV_CONFIG[s as Severity].color + "60" }
                    : { background: "transparent", color: "#555", borderColor: "#1f1f1f" }}>
                  {s}
                </button>
              ))}
            </div>

            <button onClick={exportBoard} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:border-emerald-500/50"
              style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)", color: "#10b981" }}>
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 overflow-hidden flex gap-0">
          {PHASES.map((phase, phaseIdx) => {
            const phaseTasks = filtered.filter(t => t.phase === phase.id);
            const PhaseIcon = phase.icon;
            return (
              <div key={phase.id} className="flex-1 flex flex-col border-r last:border-r-0 min-w-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>

                {/* Phase header */}
                <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between"
                  style={{ borderColor: `${phase.color}25`, background: `${phase.color}08` }}>
                  <div className="flex items-center gap-2">
                    <PhaseIcon className="w-4 h-4" style={{ color: phase.color }} />
                    <div>
                      <div className="text-[11px] font-black tracking-widest" style={{ color: phase.color }}>{phase.label}</div>
                      <div className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>{phase.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${phase.color}20`, color: phase.color }}>
                      {phaseTasks.length}
                    </span>
                    <button onClick={() => setNewTaskPhase(phase.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:opacity-100 opacity-60"
                      style={{ background: `${phase.color}20`, color: phase.color }}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks list */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                  <AnimatePresence>
                    {phaseTasks.map(task => {
                      const sev = SEV_CONFIG[task.severity];
                      const pri = PRI_CONFIG[task.priority];
                      const isExpanded = expandedId === task.id;
                      return (
                        <motion.div key={task.id}
                          layout
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="rounded-xl border overflow-hidden cursor-pointer"
                          style={{ background: "#0e0e0e", borderColor: isExpanded ? `${phase.color}50` : "#1a1a1a" }}
                          onClick={() => setExpandedId(isExpanded ? null : task.id)}>

                          {/* Task header */}
                          <div className="p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-white leading-tight truncate">{task.title}</div>
                                {task.target && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Crosshair className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                                    <span className="text-[9px] font-mono truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{task.target}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[8px] font-black px-1 py-0.5 rounded border"
                                  style={{ background: sev.bg, borderColor: sev.color + "50", color: sev.color }}>
                                  {sev.label}
                                </span>
                                <span className="text-[8px] font-black" style={{ color: pri.color }}>{pri.label}</span>
                              </div>
                            </div>

                            {/* Tags */}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {task.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Findings count */}
                            {task.findings.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Bug className="w-2.5 h-2.5" style={{ color: "#f59e0b" }} />
                                <span className="text-[9px]" style={{ color: "#f59e0b" }}>{task.findings.length} finding{task.findings.length !== 1 ? "s" : ""}</span>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                {phaseIdx > 0 && (
                                  <button onClick={e => { e.stopPropagation(); moveTask(task.id, -1); }}
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded border hover:opacity-80 transition-opacity"
                                    style={{ borderColor: "#333", color: "#666" }}>
                                    ← Back
                                  </button>
                                )}
                                {phaseIdx < 3 && (
                                  <button onClick={e => { e.stopPropagation(); moveTask(task.id, 1); }}
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded border hover:opacity-80 transition-all flex items-center gap-1"
                                    style={{ borderColor: `${phase.color}50`, color: phase.color, background: `${phase.color}10` }}>
                                    Next <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
                            </div>
                          </div>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                                className="overflow-hidden border-t" style={{ borderColor: "#1a1a1a" }}
                                onClick={e => e.stopPropagation()}>
                                <div className="p-3 flex flex-col gap-3">

                                  {/* Notes */}
                                  {task.notes && (
                                    <div className="text-[10px] rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)" }}>
                                      {task.notes}
                                    </div>
                                  )}

                                  {/* AI Run button */}
                                  <div className="flex gap-2">
                                    <button onClick={() => runAI(task)} disabled={task.running}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:opacity-90 flex-1 justify-center disabled:opacity-50"
                                      style={{ background: `${phase.color}15`, borderColor: `${phase.color}40`, color: phase.color }}>
                                      {task.running ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Brain className="w-3 h-3" /> Run AI Analysis</>}
                                    </button>
                                    {task.aiOutput && (
                                      <button onClick={() => copyOutput(task)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:opacity-80"
                                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "#222", color: copiedId === task.id ? "#10b981" : "#666" }}>
                                        {copiedId === task.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>

                                  {/* AI Output */}
                                  {task.aiOutput && (
                                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#1a1a1a" }}>
                                      <div className="px-2 py-1 border-b flex items-center gap-1.5" style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}>
                                        <Brain className="w-2.5 h-2.5" style={{ color: phase.color }} />
                                        <span className="text-[8px] font-black tracking-widest font-mono" style={{ color: phase.color }}>AI ANALYSIS</span>
                                        {task.running && <Loader2 className="w-2.5 h-2.5 animate-spin ml-auto" style={{ color: phase.color }} />}
                                      </div>
                                      <div className="p-2.5 max-h-48 overflow-y-auto">
                                        <pre className="text-[9px] font-mono whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                                          {task.aiOutput}
                                        </pre>
                                      </div>
                                    </div>
                                  )}

                                  {/* Findings */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[9px] font-black tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>FINDINGS</span>
                                      <button onClick={() => setAddFindingFor(addFindingFor === task.id ? null : task.id)}
                                        className="text-[9px] font-bold px-2 py-0.5 rounded border hover:opacity-80 flex items-center gap-1"
                                        style={{ borderColor: "#333", color: "#666" }}>
                                        <Plus className="w-2.5 h-2.5" /> Add
                                      </button>
                                    </div>

                                    {addFindingFor === task.id && (
                                      <div className="rounded-lg border p-2.5 mb-2 flex flex-col gap-2" style={{ borderColor: "#222", background: "#0a0a0a" }}>
                                        <input value={newFinding.title || ""} onChange={e => setNewFinding(p => ({ ...p, title: e.target.value }))}
                                          placeholder="Finding title..." className="px-2.5 py-1.5 rounded text-[10px] border outline-none w-full"
                                          style={{ background: "#111", borderColor: "#222", color: "#fff" }} />
                                        <input value={newFinding.description || ""} onChange={e => setNewFinding(p => ({ ...p, description: e.target.value }))}
                                          placeholder="Description..." className="px-2.5 py-1.5 rounded text-[10px] border outline-none w-full"
                                          style={{ background: "#111", borderColor: "#222", color: "#fff" }} />
                                        <div className="flex gap-2">
                                          <input value={newFinding.cve || ""} onChange={e => setNewFinding(p => ({ ...p, cve: e.target.value }))}
                                            placeholder="CVE/CWE" className="px-2.5 py-1.5 rounded text-[10px] border outline-none flex-1"
                                            style={{ background: "#111", borderColor: "#222", color: "#fff" }} />
                                          <select value={newFinding.severity} onChange={e => setNewFinding(p => ({ ...p, severity: e.target.value as Severity }))}
                                            className="px-2 py-1.5 rounded text-[10px] border outline-none"
                                            style={{ background: "#111", borderColor: "#222", color: "#fff" }}>
                                            {(["CRITICAL","HIGH","MEDIUM","LOW","INFO"] as Severity[]).map(s => <option key={s}>{s}</option>)}
                                          </select>
                                        </div>
                                        <button onClick={() => addFinding(task.id)}
                                          className="px-3 py-1.5 rounded text-[10px] font-bold border w-full"
                                          style={{ background: "rgba(226,18,39,0.1)", borderColor: "rgba(226,18,39,0.3)", color: "#e21227" }}>
                                          Add Finding
                                        </button>
                                      </div>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                      {task.findings.map(f => {
                                        const fs = SEV_CONFIG[f.severity];
                                        return (
                                          <div key={f.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 border group"
                                            style={{ background: `${fs.color}08`, borderColor: `${fs.color}25` }}>
                                            <span className="text-[7px] font-black px-1 py-0.5 rounded border shrink-0 mt-0.5"
                                              style={{ background: fs.bg, borderColor: `${fs.color}40`, color: fs.color }}>
                                              {fs.label}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-[9px] font-bold text-white">{f.title}</div>
                                              {f.cve && <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{f.cve}</div>}
                                              {f.description && <div className="text-[8px]" style={{ color: "rgba(255,255,255,0.4)" }}>{f.description}</div>}
                                            </div>
                                            <button onClick={() => removeFinding(task.id, f.id)}
                                              className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20">
                                              <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Delete */}
                                  <button onClick={() => deleteTask(task.id)}
                                    className="flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded border w-fit transition-all hover:bg-red-500/10"
                                    style={{ borderColor: "rgba(226,18,39,0.2)", color: "#e21227" }}>
                                    <Trash2 className="w-2.5 h-2.5" /> Delete Task
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {phaseTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                      <PhaseIcon className="w-6 h-6 mb-2" style={{ color: phase.color }} />
                      <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>No tasks</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* New Task Form */}
        <AnimatePresence>
          {newTaskPhase && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden border-t shrink-0" style={{ borderColor: "rgba(226,18,39,0.15)" }}>
              <div className="p-3 flex gap-3 flex-wrap items-end" style={{ background: "#0a0a0a" }}>
                <div className="flex-1 min-w-48">
                  <div className="text-[8px] font-bold mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>TASK TITLE</div>
                  <input value={newTask.title || ""} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    placeholder={`New ${newTaskPhase} task...`} className="px-2.5 py-1.5 rounded-lg text-[11px] border outline-none w-full"
                    style={{ background: "#111", borderColor: "#222", color: "#fff" }}
                    onKeyDown={e => e.key === "Enter" && addTask()} />
                </div>
                <div className="flex-1 min-w-36">
                  <div className="text-[8px] font-bold mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>TARGET</div>
                  <input value={newTask.target || ""} onChange={e => setNewTask(p => ({ ...p, target: e.target.value }))}
                    placeholder="IP / domain / URL" className="px-2.5 py-1.5 rounded-lg text-[11px] border outline-none w-full"
                    style={{ background: "#111", borderColor: "#222", color: "#fff" }} />
                </div>
                <div>
                  <div className="text-[8px] font-bold mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>SEVERITY</div>
                  <select value={newTask.severity} onChange={e => setNewTask(p => ({ ...p, severity: e.target.value as Severity }))}
                    className="px-2 py-1.5 rounded-lg text-[11px] border outline-none"
                    style={{ background: "#111", borderColor: "#222", color: "#fff" }}>
                    {(["CRITICAL","HIGH","MEDIUM","LOW","INFO"] as Severity[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[8px] font-bold mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>PRIORITY</div>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Priority }))}
                    className="px-2 py-1.5 rounded-lg text-[11px] border outline-none"
                    style={{ background: "#111", borderColor: "#222", color: "#fff" }}>
                    {(["P1","P2","P3","P4"] as Priority[]).map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={addTask}
                    className="px-4 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:opacity-90"
                    style={{ background: "rgba(226,18,39,0.12)", borderColor: "rgba(226,18,39,0.3)", color: "#e21227" }}>
                    Add Task
                  </button>
                  <button onClick={() => setNewTaskPhase(null)}
                    className="px-3 py-1.5 rounded-lg text-[11px] border transition-all hover:bg-white/5"
                    style={{ borderColor: "#222", color: "#666" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
