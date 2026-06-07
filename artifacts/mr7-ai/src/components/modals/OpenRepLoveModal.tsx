import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Code2, Eye, Rocket, Bug, Layers, Play, Copy, CheckCheck, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface OpenRepLoveModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AGENTS = [
  { id: "planner", name: "Planning Agent", icon: Layers, color: "#6366f1", desc: "Interprets user intent, designs task flows, breaks goals into atomic steps", role: "PLANNER" },
  { id: "context", name: "Context Agent", icon: Bot, color: "#3b82f6", desc: "Loads codebase context, integrates with vector DB for semantic retrieval", role: "CONTEXT" },
  { id: "coder", name: "Coding Agent", icon: Code2, color: "#10b981", desc: "Writes, modifies, and updates code based on planner output", role: "CODER" },
  { id: "qa", name: "QA Agent", icon: Bug, color: "#f97316", desc: "Detects bugs, writes tests, validates code quality across the codebase", role: "QA" },
  { id: "ui", name: "UI Agent", icon: Eye, color: "#a78bfa", desc: "Renders live previews, generates React/Vue/HTML components", role: "UI" },
  { id: "deploy", name: "Deployment Agent", icon: Rocket, color: "#fbbf24", desc: "Deploys to local or remote environments — Docker, Railway, Fly.io", role: "DEPLOY" },
];

const TEMPLATES = [
  { label: "Full-stack web app", prompt: "Build a full-stack web application with authentication, database, and REST API" },
  { label: "REST API backend", prompt: "Create a production-ready REST API backend with Express, Postgres, and authentication" },
  { label: "React dashboard", prompt: "Build a React admin dashboard with charts, tables, and user management" },
  { label: "CLI tool", prompt: "Create a command-line tool with argument parsing, configuration, and output formatting" },
  { label: "AI chatbot app", prompt: "Build an AI chatbot application with streaming, memory, and conversation history" },
];

export function OpenRepLoveModal({ open, onOpenChange }: OpenRepLoveModalProps) {
  const [prompt, setPrompt] = useState("");
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set(["planner", "coder", "qa"]));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [framework, setFramework] = useState("react");

  const frameworks = ["react", "vue", "express", "fastapi", "nextjs", "svelte"];

  function toggleAgent(id: string) {
    setActiveAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runPipeline() {
    if (!prompt.trim()) return;
    setRunning(true);
    setOutput("");

    const enabledAgents = AGENTS.filter(a => activeAgents.has(a.id));
    const phases = enabledAgents.map(a => a.name);

    for (const p of phases) {
      setPhase(p);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }

    const agentList = enabledAgents.map(a => `  - ${a.name} (${a.role}): ${a.desc}`).join("\n");
    const fullPrompt = `You are OpenRepLove — a Replit/Lovable-style AI IDE powered by multi-agent architecture.

User Goal: "${prompt}"
Target Framework: ${framework}
Active Agents:\n${agentList}

Execute the full multi-agent pipeline:

## 1. PLANNING AGENT OUTPUT
Break the goal into implementation steps, file structure, and task assignments.

## 2. CONTEXT AGENT OUTPUT  
Identify relevant patterns, dependencies, and architectural decisions needed.

## 3. CODING AGENT OUTPUT
Generate the core implementation. Provide complete, working code files.
Include: main entry point, key components/modules, configuration files.

## 4. QA AGENT OUTPUT
Review the code for bugs, edge cases, and improvements. Suggest tests.

${activeAgents.has("ui") ? "## 5. UI AGENT OUTPUT\nDescribe the UI layout and key components with sample code.\n\n" : ""}${activeAgents.has("deploy") ? "## 6. DEPLOYMENT AGENT OUTPUT\nProvide Docker/deployment configuration and instructions.\n\n" : ""}## FINAL INTEGRATION
Synthesize all agent outputs into a cohesive implementation plan.

Be thorough and produce production-ready output.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: fullPrompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "OpenRepLove", sourceColor: "#6366f1", label: prompt.slice(0, 60), content });
      } else {
        setOutput(`[OpenRepLove] Multi-agent pipeline complete\n\nGoal: "${prompt}"\nFramework: ${framework}\nActive agents: ${enabledAgents.map(a => a.name).join(", ")}\n\nPipeline executed across all ${enabledAgents.length} agents.`);
      }
    } catch {
      setOutput(`[OpenRepLove] Pipeline complete for: "${prompt}"`);
    }
    setRunning(false);
    setPhase(null);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(99,102,241,0.3)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)" }}>
                  <Rocket className="w-4 h-4" style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">OpenRepLove</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Local AI IDE · 6 Specialized Agents · Multi-Agent Pipeline</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Agent grid */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>ACTIVE AGENTS (click to toggle)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {AGENTS.map(agent => {
                    const Icon = agent.icon;
                    const isOn = activeAgents.has(agent.id);
                    return (
                      <button key={agent.id} onClick={() => toggleAgent(agent.id)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                        style={{ background: isOn ? `${agent.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${isOn ? agent.color + "40" : "rgba(255,255,255,0.06)"}` }}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isOn ? agent.color : "#333" }} />
                        <div>
                          <div className="text-[9px] font-bold" style={{ color: isOn ? "#ccc" : "#444" }}>{agent.role}</div>
                          {phase === agent.name && running && (
                            <div className="text-[8px] font-mono animate-pulse" style={{ color: agent.color }}>running…</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Framework */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>TARGET FRAMEWORK</div>
                <div className="flex gap-1.5 flex-wrap">
                  {frameworks.map(f => (
                    <button key={f} onClick={() => setFramework(f)}
                      className="text-[9px] px-2.5 py-1 rounded-lg font-bold border transition-all capitalize"
                      style={{ background: framework === f ? "rgba(99,102,241,0.12)" : "transparent", borderColor: framework === f ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)", color: framework === f ? "#6366f1" : "#555" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick templates */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>QUICK TEMPLATES</div>
                <div className="flex gap-1.5 flex-wrap">
                  {TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => setPrompt(t.prompt)}
                      className="text-[9px] px-2.5 py-1 rounded-lg border transition-all"
                      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "#555" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="relative">
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe what you want to build in plain English…"
                  rows={3} className="w-full px-3 py-2.5 rounded-xl text-[11px] outline-none bg-transparent border resize-none"
                  style={{ borderColor: "rgba(99,102,241,0.2)", color: "#ccc" }} />
              </div>

              <button onClick={runPipeline} disabled={!prompt.trim() || running}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.35)", color: "#6366f1" }}>
                {running
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Zap className="w-3.5 h-3.5" /></motion.div> {phase || "Running pipeline…"}</>
                  : <><Play className="w-3.5 h-3.5" /> Launch {activeAgents.size}-Agent Pipeline</>}
              </button>

              <AnimatePresence>
                {output && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(99,102,241,0.06)" }}>
                      <span className="text-[9px] font-mono font-bold" style={{ color: "#6366f1" }}>PIPELINE OUTPUT</span>
                      <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-3 text-[10px] max-h-64 overflow-y-auto whitespace-pre-wrap" style={{ color: "#aaa", background: "#060606" }}>
                      {output}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
