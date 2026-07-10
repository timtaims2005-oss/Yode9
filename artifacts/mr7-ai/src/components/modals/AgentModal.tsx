import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Brain, Play, Square, ChevronDown, ChevronUp,
  Globe, Calculator, Code, Search, Network, FileSearch,
  Shield, Terminal, Wifi, Server, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Clock, Layers, GitMerge,
} from "lucide-react";
import { streamAgent, type AgentEvent } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";

interface AgentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineTask?: { text: string; key: number };
}

type AgentMode = "brain" | "standalone";

type TaskLog =
  | { kind: "step"; step: number; maxSteps: number }
  | { kind: "thinking"; content: string }
  | { kind: "tool_call"; step: number; name: string; args: Record<string, unknown> }
  | { kind: "tool_result"; step: number; name: string; result: string; ok: boolean }
  | { kind: "answer"; content: string }
  | { kind: "done"; steps: number }
  | { kind: "error"; message: string };

const TOOL_ICONS: Record<string, typeof Globe> = {
  web_search: Globe,
  fetch_url: FileSearch,
  dns_lookup: Network,
  whois_lookup: Server,
  extract_iocs: Shield,
  calculate: Calculator,
  analyze_code: Code,
  port_scan: Wifi,
  exploit_search: Search,
  generate_pentest_script: Terminal,
  network_recon: Network,
};

const TOOL_COLORS: Record<string, string> = {
  web_search: "text-blue-400",
  fetch_url: "text-purple-400",
  dns_lookup: "text-cyan-400",
  whois_lookup: "text-emerald-400",
  extract_iocs: "text-amber-400",
  calculate: "text-green-400",
  analyze_code: "text-fuchsia-400",
  port_scan: "text-orange-400",
  exploit_search: "text-red-400",
  generate_pentest_script: "text-red-400",
  network_recon: "text-cyan-400",
};

const QUICK_TASKS = [
  { label: "Recon Target", icon: Network, task: "Perform complete network reconnaissance on example.com including DNS, WHOIS, and port scan." },
  { label: "CVE Lookup", icon: Shield, task: "Search for recent critical CVEs in Apache and Nginx web servers and explain their impact." },
  { label: "IOC Extract", icon: FileSearch, task: "Extract all indicators of compromise from the following text and classify them:\n\nPaste your log/text here..." },
  { label: "Pentest Script", icon: Terminal, task: "Generate a Python script to enumerate subdomains for a target domain using DNS brute force." },
  { label: "Exploit Search", icon: Search, task: "Search for exploits and vulnerabilities in OpenSSH 8.0 and show their CVSS scores." },
  { label: "Web Analysis", icon: Globe, task: "Fetch and analyze the security headers and technologies used by https://example.com" },
];

function ClawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3 C5 6 4 9 5 13 L7 15" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 2 C11 6 11 10 12 14 L13.5 16" stroke="currentColor" strokeWidth="2.2" />
      <path d="M17 3 C19 6 20 9 19 13 L17 15" stroke="currentColor" strokeWidth="2.2" />
      <path d="M5 13 Q7 18 9 20" stroke="currentColor" strokeWidth="2" />
      <path d="M12 14 Q12 19 12 21" stroke="currentColor" strokeWidth="2" />
      <path d="M19 13 Q17 18 15 20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function AgentModal({ open, onOpenChange, pipelineTask }: AgentModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [mode, setMode] = useState<AgentMode>("brain");
  const [task, setTask] = useState("");

  useEffect(() => {
    if (pipelineTask?.text) setTask(pipelineTask.text);
  }, [pipelineTask?.key]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [answer, setAnswer] = useState("");
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<string>("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/healthz").then((r) => setGatewayOk(r.ok)).catch(() => setGatewayOk(false));
  }, [open]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, answer]);

  function close() {
    if (running) stop();
    onOpenChange(false);
  }

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  function clearAll() {
    setLogs([]);
    setAnswer("");
    answerRef.current = "";
    setCurrentStep(0);
    setMaxSteps(0);
    setExpandedThinking({});
  }

  async function execute() {
    if (!task.trim() || running) return;
    clearAll();
    setRunning(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const contextMessages = (() => {
      if (mode === "standalone") return [{ role: "user" as const, content: task.trim() }];
      const active = state.chats.find((c) => c.id === state.activeChatId);
      const history = (active?.messages ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      return [...history, { role: "user" as const, content: task.trim() }];
    })();

    try {
      await streamAgent(
        {
          messages: contextMessages,
          language: (lang as "en" | "ar") ?? "en",
          maxSteps: 10,
          customSystemPrompt:
            "You are KaliAgent — a specialized cybersecurity AI agent with access to real security tools. You execute multi-step security research, reconnaissance, vulnerability analysis, and penetration testing tasks autonomously. Always explain your findings clearly.",
          redteamMode: true,
        },
        (event: AgentEvent) => {
          if (event.type === "step_start") {
            setCurrentStep(event.step);
            setMaxSteps(event.maxSteps);
            setLogs((p) => [...p, { kind: "step", step: event.step, maxSteps: event.maxSteps }]);
          } else if (event.type === "thinking") {
            setLogs((p) => [...p, { kind: "thinking", content: event.content }]);
          } else if (event.type === "tool_call") {
            setLogs((p) => [...p, { kind: "tool_call", step: event.step, name: event.name, args: event.args }]);
          } else if (event.type === "tool_result") {
            setLogs((p) => [...p, { kind: "tool_result", step: event.step, name: event.name, result: event.result, ok: event.ok }]);
          } else if (event.type === "answer_chunk") {
            answerRef.current += event.content;
            setAnswer(answerRef.current);
          } else if (event.type === "done") {
            setLogs((p) => [...p, { kind: "done", steps: event.steps }]);
            setRunning(false);
          } else if (event.type === "error") {
            setLogs((p) => [...p, { kind: "error", message: event.error }]);
            setRunning(false);
          }
        },
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setLogs((p) => [...p, { kind: "error", message: (e as Error)?.message ?? "Agent failed" }]);
      }
      setRunning(false);
    }
  }

  const hasOutput = logs.length > 0 || answer.length > 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.75)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.90, y: 28, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20, rotateX: 4 }}
            transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-h-[88dvh] flex flex-col rounded-[18px] overflow-hidden shadow-2xl relative"
            style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
              border: "1px solid rgba(255,77,77,0.32)",
              boxShadow: "0 0 140px rgba(255,77,77,0.18), 0 0 60px rgba(255,77,77,0.08), 0 32px 80px rgba(0,0,0,0.97), inset 0 1px 0 rgba(255,77,77,0.18), inset 0 0 100px rgba(255,77,77,0.02)",
            }}
          >
            {/* Animated scan line */}
            <motion.div className="absolute inset-x-0 h-px pointer-events-none z-30"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,77,77,0.70),rgba(0,229,255,0.30),rgba(255,77,77,0.70),transparent)" }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />

            {/* Corner brackets */}
            <span className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 pointer-events-none z-20" style={{ borderColor: "rgba(255,77,77,0.75)" }} />
            <span className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 pointer-events-none z-20" style={{ borderColor: "rgba(255,77,77,0.75)" }} />
            <span className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 pointer-events-none z-20" style={{ borderColor: "rgba(255,77,77,0.35)" }} />
            <span className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 pointer-events-none z-20" style={{ borderColor: "rgba(255,77,77,0.35)" }} />

            {/* Top accent bar */}
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #ff4d4d, #00e5ff44, #ff4d4d, transparent)" }} />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 pt-3 pb-[10px] relative" style={{ borderBottom: "1px solid rgba(255,77,77,0.14)", background: "rgba(255,77,77,0.03)" }}>
              {/* Left: branding */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "radial-gradient(circle, rgba(255,77,77,0.22) 0%, rgba(255,77,77,0.06) 100%)", border: "1px solid rgba(255,77,77,0.45)", boxShadow: "0 0 20px rgba(255,77,77,0.20), inset 0 0 14px rgba(255,77,77,0.08)" }}
                    animate={{ boxShadow: ["0 0 16px rgba(255,77,77,0.18)", "0 0 32px rgba(255,77,77,0.38)", "0 0 16px rgba(255,77,77,0.18)"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                    <span style={{ color: "#ff4d4d" }}><ClawIcon className="w-6 h-6" /></span>
                  </motion.div>
                  {/* Orbit ring */}
                  <motion.div className="absolute inset-[-4px] rounded-2xl border border-dashed pointer-events-none"
                    style={{ borderColor: "rgba(255,77,77,0.22)" }}
                    animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                  {/* Status dot */}
                  <motion.div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: gatewayOk ? "#00e5cc" : gatewayOk === null ? "#888" : "#ff4d4d", borderColor: "#06020e", boxShadow: gatewayOk ? "0 0 8px #00e5cc" : "none" }}
                    animate={gatewayOk ? { scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black tracking-[0.12em]">
                      <span style={{ color: "#ff4d4d" }}>KALI</span>
                      <span className="text-white">AGENT</span>
                    </span>
                    <div className="px-1.5 py-0.5 rounded border font-mono text-[8px] font-black"
                      style={{ color: "#00e5cc", borderColor: "rgba(0,229,204,0.45)", background: "rgba(0,229,204,0.08)" }}>
                      v2.0
                    </div>
                    {running && (
                      <motion.div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(255,77,77,0.12)", border: "1px solid rgba(255,77,77,0.30)" }}>
                        <motion.div className="w-1 h-1 rounded-full" style={{ background: "#ff4d4d" }}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 0.7, repeat: Infinity }} />
                        <span className="text-[7px] font-black font-mono" style={{ color: "#ff4d4d" }}>EXEC</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>AUTONOMOUS CYBER AGENT</span>
                    <span className="text-[7px] font-mono" style={{ color: gatewayOk ? "rgba(0,229,204,0.70)" : "rgba(255,77,77,0.70)" }}>
                      · {gatewayOk === null ? "INIT" : gatewayOk ? "GATEWAY ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: metrics + close */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  {[
                    { label: "NEURAL", pct: 87, color: "#ff4d4d" },
                    { label: "SYNC",   pct: 94, color: "#00e5ff" },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1.5">
                      <span className="text-[6px] font-mono uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>{m.label}</span>
                      <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: m.color, boxShadow: `0 0 4px ${m.color}60` }}
                          initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                      </div>
                      <span className="text-[6px] font-black font-mono" style={{ color: m.color }}>{m.pct}%</span>
                    </div>
                  ))}
                </div>
                <motion.button onClick={close}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                  whileHover={{ background: "rgba(255,60,60,0.15)", color: "#ff4444", borderColor: "rgba(255,60,60,0.35)" }}>
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>

            {/* ── Mode Selector ── */}
            <div className="px-4 pt-3 pb-2">
              <div
                className="flex rounded-xl p-1 gap-1"
                style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {(["brain", "standalone"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all"
                    style={
                      mode === m
                        ? {
                            background: m === "brain" ? "rgba(139,92,246,0.2)" : "rgba(255,77,77,0.15)",
                            border: `1px solid ${m === "brain" ? "rgba(139,92,246,0.5)" : "rgba(255,77,77,0.4)"}`,
                            color: m === "brain" ? "#a78bfa" : "#ff4d4d",
                          }
                        : { color: "#555", border: "1px solid transparent" }
                    }
                  >
                    {m === "brain" ? <Brain className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    {m === "brain" ? "Brain Mode" : "Standalone Mode"}
                    {mode === m && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{
                          background: m === "brain" ? "rgba(139,92,246,0.15)" : "rgba(255,77,77,0.1)",
                          color: m === "brain" ? "#a78bfa" : "#ff4d4d",
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-[10px] mt-1.5 px-1" style={{ color: "#555" }}>
                {mode === "brain"
                  ? "🧠 Brain Mode — Agent reads your current conversation context and continues intelligently."
                  : "⚡ Standalone Mode — Agent runs independently with a fresh context window."}
              </p>
            </div>

            {/* ── Quick Presets ── */}
            <div className="px-4 pb-2">
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_TASKS.map((qt) => {
                  const Icon = qt.icon;
                  return (
                    <button
                      key={qt.label}
                      onClick={() => setTask(qt.task)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                      style={{
                        background: "#111",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#666",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,77,77,0.3)";
                        (e.currentTarget as HTMLElement).style.color = "#ff4d4d";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLElement).style.color = "#666";
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {qt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Task Input ── */}
            <div className="px-4 pb-3">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,77,77,0.25)", background: "#0d0d0d" }}
              >
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) execute();
                  }}
                  placeholder="Describe the security task for the agent to execute autonomously…"
                  rows={3}
                  className="w-full bg-transparent px-3 py-2.5 text-[12px] font-mono text-gray-200 placeholder:text-gray-600 outline-none resize-none"
                  disabled={running}
                />
                <div
                  className="flex items-center justify-between px-3 py-2 border-t"
                  style={{ borderColor: "rgba(255,77,77,0.15)" }}
                >
                  <span className="text-[10px] font-mono" style={{ color: "#444" }}>
                    {running && currentStep > 0 ? (
                      <span style={{ color: "#ff4d4d" }}>
                        ▶ Step {currentStep} / {maxSteps}
                      </span>
                    ) : (
                      "Ctrl+Enter to run"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasOutput && !running && (
                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-colors"
                        style={{ color: "#555", border: "1px solid rgba(255,255,255,0.08)" }}
                      >
                        <RefreshCw className="w-3 h-3" /> Clear
                      </button>
                    )}
                    {running ? (
                      <button
                        onClick={stop}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                        style={{ background: "rgba(255,77,77,0.15)", border: "1px solid rgba(255,77,77,0.4)", color: "#ff4d4d" }}
                      >
                        <Square className="w-3 h-3 fill-current" /> Stop
                      </button>
                    ) : (
                      <button
                        onClick={execute}
                        disabled={!task.trim() || !gatewayOk}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
                        style={{
                          background: "rgba(255,77,77,0.15)",
                          border: "1px solid rgba(255,77,77,0.5)",
                          color: "#ff4d4d",
                          boxShadow: task.trim() ? "0 0 12px rgba(255,77,77,0.2)" : undefined,
                        }}
                      >
                        <Play className="w-3 h-3 fill-current" /> Execute
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Output Dashboard ── */}
            {hasOutput && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
                {/* Divider */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,77,77,0.15)" }} />
                  <span className="text-[9px] font-mono font-bold" style={{ color: "#ff4d4d" }}>
                    ── AGENT OUTPUT ──
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,77,77,0.15)" }} />
                </div>

                {logs.map((log, i) => (
                  <LogEntry
                    key={i}
                    log={log}
                    idx={i}
                    expanded={expandedThinking[i] ?? false}
                    onToggle={() => setExpandedThinking((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}

                {/* Streaming answer */}
                {answer && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl p-3 font-mono text-[11px] leading-relaxed"
                    style={{
                      background: "rgba(0,229,204,0.04)",
                      border: "1px solid rgba(0,229,204,0.2)",
                      color: "#d0d0d0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00e5cc" }} />
                      <span className="text-[10px] font-bold" style={{ color: "#00e5cc" }}>
                        AGENT ANSWER
                      </span>
                      {running && (
                        <span
                          className="inline-block w-1.5 h-3 rounded-sm ml-0.5 animate-pulse"
                          style={{ background: "#00e5cc" }}
                        />
                      )}
                      {!running && answer && (
                        <button
                          onClick={() => pipeline.push({ source: "KaliAgent", sourceColor: "#ff4d4d", label: "agent answer", content: answer })}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                          style={{ background: "rgba(0,229,204,0.08)", borderColor: "rgba(0,229,204,0.25)", color: "#00e5cc" }}
                        >
                          <GitMerge className="w-2.5 h-2.5" /> Pipe
                        </button>
                      )}
                    </div>
                    {answer}
                  </motion.div>
                )}

                <div ref={logsEndRef} />
              </div>
            )}

            {/* ── Empty State ── */}
            {!hasOutput && (
              <div className="flex-1 flex flex-col items-center justify-center pb-8 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)" }}
                >
                  <span style={{ color: "rgba(255,77,77,0.5)" }}><ClawIcon className="w-9 h-9" /></span>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-sm font-bold" style={{ color: "#333" }}>
                    Agent ready
                  </div>
                  <div className="text-[11px]" style={{ color: "#444" }}>
                    Select a preset or describe a task above to begin
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 px-8 w-full max-w-sm">
                  {[
                    { icon: Layers, label: "Multi-step reasoning", color: "#ff4d4d" },
                    { icon: Globe, label: "Live web search", color: "#00e5cc" },
                    { icon: Network, label: "Network recon", color: "#a78bfa" },
                    { icon: Shield, label: "CVE & exploit lookup", color: "#fbbf24" },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.label}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px]"
                        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", color: "#555" }}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />
                        {f.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LogEntry({
  log,
  idx,
  expanded,
  onToggle,
}: {
  log: TaskLog;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (log.kind === "step") {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded" style={{ color: "#555", background: "#111" }}>
          <Clock className="w-2.5 h-2.5 inline mr-1" />
          STEP {log.step} / {log.maxSteps}
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    );
  }

  if (log.kind === "thinking") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0d0d0d" }}
      >
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 text-left"
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#555" }} />
          <span className="text-[10px] font-mono" style={{ color: "#444" }}>
            Agent thinking…
          </span>
          <span className="ml-auto">{expanded ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}</span>
        </button>
        {expanded && (
          <div
            className="px-3 pb-2 text-[10px] font-mono leading-relaxed"
            style={{ color: "#555", whiteSpace: "pre-wrap", borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            {log.content}
          </div>
        )}
      </motion.div>
    );
  }

  if (log.kind === "tool_call") {
    const Icon = TOOL_ICONS[log.name] ?? Shield;
    const color = TOOL_COLORS[log.name] ?? "text-gray-400";
    const argsStr = Object.entries(log.args)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: "#0d0d0d", border: "1px solid rgba(255,77,77,0.15)" }}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <span style={{ color: "rgba(255,77,77,0.6)", fontSize: 11 }}>→</span>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-mono font-bold" style={{ color: "#ff4d4d" }}>
            {log.name}
          </span>
          {argsStr && (
            <span className="text-[10px] font-mono ml-2 break-all" style={{ color: "#555" }}>
              {argsStr.slice(0, 120)}{argsStr.length > 120 ? "…" : ""}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  if (log.kind === "tool_result") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className="px-3 py-2 rounded-lg"
        style={{
          background: log.ok ? "rgba(0,229,204,0.03)" : "rgba(255,77,77,0.05)",
          border: `1px solid ${log.ok ? "rgba(0,229,204,0.15)" : "rgba(255,77,77,0.2)"}`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          {log.ok
            ? <CheckCircle2 className="w-3 h-3" style={{ color: "#00e5cc" }} />
            : <XCircle className="w-3 h-3" style={{ color: "#ff4d4d" }} />
          }
          <span className="text-[10px] font-mono font-bold" style={{ color: log.ok ? "#00e5cc" : "#ff4d4d" }}>
            ← {log.name}
          </span>
        </div>
        <pre
          className="text-[10px] font-mono leading-relaxed overflow-x-auto max-h-28 overflow-y-auto"
          style={{ color: "#666", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {log.result.slice(0, 500)}{log.result.length > 500 ? "\n… (truncated)" : ""}
        </pre>
      </motion.div>
    );
  }

  if (log.kind === "done") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono"
        style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Agent completed in {log.steps} step{log.steps !== 1 ? "s" : ""}.
      </div>
    );
  }

  if (log.kind === "error") {
    return (
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] font-mono"
        style={{ background: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.3)", color: "#ff4d4d" }}
      >
        <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{log.message}</span>
      </div>
    );
  }

  return null;
}
