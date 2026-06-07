import { useState, useRef, useEffect, useCallback } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Terminal, Play, Square, RotateCcw, Copy, CheckCheck,
  ChevronRight, Brain, Zap, Send, AlertTriangle, Cpu,
  BookOpen, Star, Trash2, Search as SearchIcon, FileCode,
  Lightbulb, ArrowRight, Plus,
} from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface AITerminalModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type ResultStatus = "ok" | "error" | "running";

interface HistoryEntry {
  id: number;
  cmd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  ts: number;
  aiExplain?: string;
  aiSuggest?: string[];
  starred?: boolean;
}

interface Snippet { label: string; cmd: string; desc: string; tags: string[] }

const SNIPPETS: Snippet[] = [
  { label: "Process List",     cmd: "ps aux --sort=-%cpu | head -20",              desc: "Top CPU-consuming processes",     tags: ["system","monitor"] },
  { label: "Open Ports",       cmd: "ss -tlnp",                                    desc: "Listening TCP/UDP ports",         tags: ["network","recon"] },
  { label: "Network Ifaces",   cmd: "ip addr show",                                desc: "All network interfaces + IPs",    tags: ["network"] },
  { label: "File System",      cmd: "df -hT | sort -k5 -rh",                      desc: "Disk usage by filesystem",        tags: ["system","storage"] },
  { label: "Recent Errors",    cmd: "journalctl -p err -n 50 --no-pager",         desc: "Last 50 system errors",           tags: ["logs","debug"] },
  { label: "Sudo Rules",       cmd: "sudo -l 2>/dev/null || echo 'not available'", desc: "Current user sudo permissions",  tags: ["privesc","security"] },
  { label: "SUID Bins",        cmd: "find / -perm /4000 -type f 2>/dev/null",     desc: "SUID files for privesc analysis", tags: ["privesc","security"] },
  { label: "Crontab",          cmd: "crontab -l 2>/dev/null; cat /etc/cron*/* 2>/dev/null | head -40", desc: "Scheduled tasks", tags: ["persistence","recon"] },
  { label: "Env Variables",    cmd: "env | sort | grep -v '^LS_COLORS'",           desc: "All environment variables",      tags: ["recon"] },
  { label: "Git Log",          cmd: "git log --oneline --graph --decorate -20",   desc: "Recent commit history",           tags: ["git","dev"] },
  { label: "Node Processes",   cmd: "pgrep -fa 'node|npm|pnpm|deno'",             desc: "Running Node.js processes",       tags: ["dev","node"] },
  { label: "TCP Connections",  cmd: "ss -tnp state established",                  desc: "Active TCP connections",          tags: ["network","monitor"] },
  { label: "Bash History",     cmd: "history | tail -30",                         desc: "Recent bash commands",            tags: ["recon","history"] },
  { label: "World-Writables",  cmd: "find /tmp /var/tmp /dev/shm -maxdepth 2 -type f -perm -o+w 2>/dev/null | head -20", desc: "Writable temp files", tags: ["security"] },
  { label: "Kernel Info",      cmd: "uname -a && cat /etc/os-release | head -6",  desc: "Kernel and OS version",           tags: ["recon","system"] },
];

const AI_SYSTEM_PROMPT = `You are an elite shell command interpreter and cybersecurity expert. When given a shell command and its output, provide:

1. **EXPLAIN** (2-3 lines): What this output means technically
2. **FINDINGS** (bullet points): Key security or operational findings
3. **NEXT** (2-3 suggestions): Most logical next commands to run

Format your response as:

EXPLAIN:
[explanation here]

FINDINGS:
- [finding 1]
- [finding 2]

NEXT:
- [command 1]
- [command 2]
- [command 3]`;

const R = "#e21227";
const P = "#7c3aed";
const G = "#4ade80";

async function execCommand(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const r = await fetch("/api/shell/exec", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command: cmd }),
  });
  const d = await r.json().catch(() => ({ stdout: "", stderr: "parse error", exitCode: 1 }));
  return { stdout: d.stdout ?? "", stderr: d.stderr ?? "", exitCode: d.exitCode ?? 1 };
}

async function explainOutput(cmd: string, output: string): Promise<string> {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "user", content: `Command: ${cmd}\n\nOutput:\n${output.slice(0, 3000)}\n\nAnalyze this.` }
      ],
      model: "gpt-5.4",
      systemPrompt: AI_SYSTEM_PROMPT
    }),
  });
  return await readChatText(r) || "No analysis available.";
}

let _id = 0;
const nid = () => ++_id;

export function AITerminalModal({ open, onOpenChange }: AITerminalModalProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [autoExplain, setAutoExplain] = useState(false);
  const [tab, setTab] = useState<"terminal" | "snippets" | "history">("terminal");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<number | null>(null);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  async function run(cmd: string) {
    const c = cmd.trim();
    if (!c || running) return;
    setInput(""); setRunning(true); setHistIdx(-1);

    const id = nid();
    const entry: HistoryEntry = { id, cmd: c, stdout: "", stderr: "", exitCode: 0, ts: Date.now() };
    setHistory(p => [...p, entry]);

    try {
      const { stdout, stderr, exitCode } = await execCommand(c);
      const updated = { ...entry, stdout, stderr, exitCode };

      if (autoExplain && (stdout || stderr)) {
        setHistory(p => p.map(h => h.id === id ? { ...updated, aiExplain: "Analyzing..." } : h));
        const analysis = await explainOutput(c, stdout || stderr);
        const nexts = extractNext(analysis);
        setHistory(p => p.map(h => h.id === id ? { ...updated, aiExplain: analysis, aiSuggest: nexts } : h));
      } else {
        setHistory(p => p.map(h => h.id === id ? updated : h));
      }

      pipeline.push({ source: "ai-terminal", sourceColor: "#e21227", label: `Shell: ${c.slice(0, 40)}`, content: `$ ${c}\n${stdout.slice(0, 500)}` });
    } catch (e) {
      setHistory(p => p.map(h => h.id === id ? { ...h, stderr: String(e), exitCode: 1 } : h));
    }

    setRunning(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function analyzeEntry(entry: HistoryEntry) {
    setHistory(p => p.map(h => h.id === entry.id ? { ...h, aiExplain: "Analyzing..." } : h));
    const analysis = await explainOutput(entry.cmd, entry.stdout || entry.stderr);
    const nexts = extractNext(analysis);
    setHistory(p => p.map(h => h.id === entry.id ? { ...h, aiExplain: analysis, aiSuggest: nexts } : h));
  }

  function extractNext(analysis: string): string[] {
    const lines = analysis.split("\n");
    const idx = lines.findIndex(l => l.trim().startsWith("NEXT"));
    if (idx < 0) return [];
    const cmds: string[] = [];
    for (let i = idx + 1; i < lines.length && cmds.length < 4; i++) {
      const l = lines[i].replace(/^[-•*]\s*/, "").trim();
      if (l && !l.startsWith("#")) cmds.push(l);
    }
    return cmds;
  }

  function copyText(text: string, id: number) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { run(input); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const cmds = history.map(h => h.cmd);
      const nx = Math.min(histIdx + 1, cmds.length - 1);
      setHistIdx(nx);
      setInput(cmds[cmds.length - 1 - nx] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx <= 0) { setHistIdx(-1); setInput(""); return; }
      const nx = histIdx - 1;
      setHistIdx(nx);
      setInput(history[history.length - 1 - nx]?.cmd ?? "");
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Auto-complete from history
      if (input) {
        const match = [...history].reverse().find(h => h.cmd.startsWith(input) && h.cmd !== input);
        if (match) setInput(match.cmd);
      }
    }
  }

  const allTags = ["all", ...Array.from(new Set(SNIPPETS.flatMap(s => s.tags)))];
  const filteredSnippets = SNIPPETS.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || s.label.toLowerCase().includes(q) || s.cmd.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    const matchTag = filter === "all" || s.tags.includes(filter);
    return matchSearch && matchTag;
  });

  const starredHistory = history.filter(h => h.starred);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
            className="w-full max-w-3xl flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#0c0c10", border: "1px solid rgba(226,18,39,0.3)", boxShadow: "0 0 80px rgba(226,18,39,0.1)", height: "min(90vh,700px)" }}>

            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#121218" }}>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onOpenChange(false)} className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              </div>
              <div className="flex items-center gap-2 mx-auto">
                <Terminal className="w-3.5 h-3.5" style={{ color: R }} />
                <span className="text-[11px] font-mono font-bold" style={{ color: "#555" }}>AI Terminal</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold" style={{ background: "rgba(226,18,39,0.12)", color: R, border: `1px solid ${R}40` }}>AI-POWERED</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setAutoExplain(p => !p)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-all"
                  style={{ background: autoExplain ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoExplain ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`, color: autoExplain ? "#a78bfa" : "#444" }}>
                  <Brain className="w-2.5 h-2.5" /> Auto-AI
                </button>
                <button onClick={() => onOpenChange(false)} className="text-gray-700 hover:text-gray-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0e0e14" }}>
              {([["terminal", "TERMINAL", Terminal], ["snippets", "SNIPPETS", BookOpen], ["history", "HISTORY", Star]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id as typeof tab)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono transition-all"
                  style={{ borderBottom: tab === id ? `2px solid ${R}` : "2px solid transparent", color: tab === id ? R : "#333" }}>
                  <Icon className="w-3 h-3" />{label}
                  {id === "history" && history.length > 0 && <span className="ml-1 text-[8px] px-1 rounded" style={{ background: "rgba(226,18,39,0.1)", color: R }}>{history.length}</span>}
                  {id === "snippets" && <span className="ml-1 text-[8px] px-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#333" }}>{SNIPPETS.length}</span>}
                </button>
              ))}
            </div>

            {/* TERMINAL TAB */}
            {tab === "terminal" && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 font-mono" style={{ background: "#0c0c10" }}>
                  {history.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)" }}>
                        <Terminal className="w-6 h-6" style={{ color: "rgba(226,18,39,0.4)" }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: "#2a1a1a" }}>AI Terminal — تنفيذ أوامر Shell مع تحليل AI</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SNIPPETS.slice(0, 6).map(s => (
                          <button key={s.label} onClick={() => run(s.cmd)}
                            className="text-left px-2 py-1.5 rounded text-[9px] font-mono"
                            style={{ background: "#0e0e14", border: "1px solid rgba(255,255,255,0.04)", color: "#2a1a1a" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${R}30`; e.currentTarget.style.color = "#7a2020"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#2a1a1a"; }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {history.map(entry => (
                    <div key={entry.id} className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)", background: "#0e0e14" }}>
                      {/* Command line */}
                      <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <ChevronRight className="w-3 h-3 shrink-0" style={{ color: G }} />
                        <span className="flex-1 text-[11px] font-mono" style={{ color: "#e2e8f0" }}>{entry.cmd}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8px] font-mono" style={{ color: entry.exitCode === 0 ? "#4ade80" : "#f87171" }}>{entry.exitCode === 0 ? "✓" : `exit ${entry.exitCode}`}</span>
                          <button onClick={() => copyText(entry.cmd, entry.id * 10)}
                            className="p-0.5 text-gray-700 hover:text-gray-400">
                            {copied === entry.id * 10 ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setHistory(p => p.map(h => h.id === entry.id ? { ...h, starred: !h.starred } : h))}
                            className="p-0.5" style={{ color: entry.starred ? "#fbbf24" : "#333" }}>
                            <Star className="w-3 h-3" />
                          </button>
                          {!entry.aiExplain && (
                            <button onClick={() => analyzeEntry(entry)} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px]"
                              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#7c3aed" }}>
                              <Brain className="w-2.5 h-2.5" />AI
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Output */}
                      {(entry.stdout || entry.stderr) && (
                        <div className="px-3 py-2 text-[10px] font-mono overflow-x-auto" style={{ maxHeight: 200, overflowY: "auto" }}>
                          {entry.stdout && <pre style={{ color: "#9ca3af", whiteSpace: "pre", margin: 0 }}>{entry.stdout}</pre>}
                          {entry.stderr && <pre style={{ color: "#f87171", whiteSpace: "pre", margin: 0 }}>{entry.stderr}</pre>}
                        </div>
                      )}
                      {/* AI Analysis */}
                      {entry.aiExplain && (
                        <div className="border-t px-3 py-2" style={{ borderColor: "rgba(124,58,237,0.15)", background: "rgba(124,58,237,0.04)" }}>
                          {entry.aiExplain === "Analyzing..." ? (
                            <div className="flex items-center gap-2 text-[9px] font-mono animate-pulse" style={{ color: "#7c3aed" }}>
                              <Brain className="w-3 h-3" /> جاري التحليل...
                            </div>
                          ) : (
                            <>
                              <div className="text-[9px] font-mono whitespace-pre-wrap" style={{ color: "#6b5f9a" }}>{entry.aiExplain.slice(0, 400)}</div>
                              {entry.aiSuggest && entry.aiSuggest.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {entry.aiSuggest.map((cmd, i) => (
                                    <button key={i} onClick={() => run(cmd)}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono"
                                      style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
                                      <ArrowRight className="w-2.5 h-2.5" />{cmd.length > 35 ? cmd.slice(0, 35) + "..." : cmd}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {running && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono animate-pulse" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)", color: "#4ade80" }}>
                      <Cpu className="w-3 h-3" />تنفيذ...
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
                {/* Input */}
                <div className="flex items-center gap-2 px-3 py-2 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0e0e14" }}>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#4ade80" }} />
                  <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="أدخل أمراً... (↑↓ تاريخ, Tab إكمال)"
                    className="flex-1 bg-transparent text-[12px] font-mono text-gray-300 outline-none placeholder:text-gray-800"
                    disabled={running} />
                  <button onClick={() => run(input)} disabled={!input.trim() || running}
                    className="px-2.5 py-1 rounded text-[10px] font-bold disabled:opacity-30 flex items-center gap-1"
                    style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <button onClick={() => setHistory([])} className="p-1 text-gray-700 hover:text-gray-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </>
            )}

            {/* SNIPPETS TAB */}
            {tab === "snippets" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <SearchIcon className="w-3 h-3" style={{ color: "#333" }} />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث في القوالب..."
                    className="flex-1 bg-transparent text-[11px] font-mono text-gray-400 outline-none placeholder:text-gray-700" />
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {allTags.map(t => (
                    <button key={t} onClick={() => setFilter(t)}
                      className="px-2 py-0.5 rounded text-[8px] font-mono shrink-0 transition-all"
                      style={{ background: filter === t ? "rgba(226,18,39,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${filter === t ? "rgba(226,18,39,0.3)" : "rgba(255,255,255,0.06)"}`, color: filter === t ? R : "#444" }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-2">
                  {filteredSnippets.map(s => (
                    <div key={s.label} className="flex items-center gap-3 px-3 py-2 rounded-lg group cursor-pointer"
                      style={{ background: "#0e0e14", border: "1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${R}40`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono font-bold" style={{ color: "#9ca3af" }}>{s.label}</span>
                          <div className="flex gap-0.5">
                            {s.tags.map(t => <span key={t} className="text-[7px] px-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#444" }}>{t}</span>)}
                          </div>
                        </div>
                        <div className="text-[9px] font-mono truncate" style={{ color: "#e21227" }}>{s.cmd}</div>
                        <div className="text-[8px] mt-0.5" style={{ color: "#333" }}>{s.desc}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                        <button onClick={() => { setInput(s.cmd); setTab("terminal"); setTimeout(() => inputRef.current?.focus(), 50); }}
                          className="px-2 py-0.5 rounded text-[8px]" style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}>Edit</button>
                        <button onClick={() => { run(s.cmd); setTab("terminal"); }}
                          className="px-2 py-0.5 rounded text-[8px] font-bold flex items-center gap-1"
                          style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.2)", color: R }}>
                          <Play className="w-2.5 h-2.5" />Run
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {tab === "history" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="text-[9px] font-mono" style={{ color: "#333" }}>{history.length} COMMANDS · {starredHistory.length} STARRED</span>
                  <button onClick={() => setHistory([])} className="text-[8px] font-mono px-2 py-0.5 rounded" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>Clear All</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {[...history].reverse().map(h => (
                    <div key={h.id} className="flex items-center gap-2 px-3 py-2 rounded group"
                      style={{ background: "#0e0e14", border: `1px solid ${h.starred ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.04)"}` }}>
                      {h.starred && <Star className="w-3 h-3 shrink-0" style={{ color: "#fbbf24" }} />}
                      <span className="flex-1 text-[10px] font-mono truncate" style={{ color: "#6b7280" }}>{h.cmd}</span>
                      <span className="text-[8px] font-mono shrink-0" style={{ color: h.exitCode === 0 ? "#4ade80" : "#f87171" }}>{h.exitCode === 0 ? "✓" : `✗ ${h.exitCode}`}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                        <button onClick={() => { setInput(h.cmd); setTab("terminal"); setTimeout(() => inputRef.current?.focus(), 50); }}
                          className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(255,255,255,0.04)", color: "#555" }}>Use</button>
                        <button onClick={() => { run(h.cmd); setTab("terminal"); }}
                          className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(74,222,128,0.08)", color: G }}>Re-run</button>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <div className="text-center py-8 text-[10px] font-mono" style={{ color: "#1a1a1a" }}>لا يوجد تاريخ بعد</div>}
                </div>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
