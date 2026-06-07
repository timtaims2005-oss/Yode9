import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Factory, Play, Copy, CheckCheck, Settings, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface AIFactoryModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const WORKFLOWS = [
  {
    id: "code-review", name: "Code Review Pipeline", color: "#3b82f6",
    stages: ["Extract code", "Analyze patterns", "Security scan", "Suggest improvements", "Generate diff"],
    prompt: (input: string) => `You are an expert code reviewer in an AI Factory pipeline.\n\nCode to review:\n${input}\n\nProvide:\n1. Code quality assessment (1-10)\n2. Security vulnerabilities found\n3. Performance issues\n4. Best practice violations\n5. Specific improvement suggestions with fixed code snippets`,
  },
  {
    id: "doc-gen", name: "Documentation Generator", color: "#10b981",
    stages: ["Parse structure", "Infer intent", "Write docstrings", "Add examples", "Format output"],
    prompt: (input: string) => `You are a documentation AI in an AI Factory pipeline.\n\nCode/API:\n${input}\n\nGenerate complete documentation:\n- Overview and purpose\n- Parameters/return values\n- Usage examples (3+)\n- Edge cases and notes\n- Markdown formatted`,
  },
  {
    id: "test-gen", name: "Test Suite Generator", color: "#fbbf24",
    stages: ["Analyze logic", "Map edge cases", "Write unit tests", "Add mocks", "Coverage check"],
    prompt: (input: string) => `You are a test generation AI.\n\nCode:\n${input}\n\nGenerate comprehensive test suite:\n- Unit tests (happy path)\n- Edge cases\n- Error cases\n- Mock setup\n- Coverage for all branches`,
  },
  {
    id: "refactor", name: "Intelligent Refactor", color: "#a78bfa",
    stages: ["Parse AST", "Find smells", "Plan refactor", "Apply transforms", "Verify behavior"],
    prompt: (input: string) => `You are a refactoring AI.\n\nCode:\n${input}\n\nRefactor for:\n1. SOLID principles\n2. DRY/KISS\n3. Better naming\n4. Reduced complexity\n5. Show before/after diff with explanations`,
  },
  {
    id: "security", name: "Security Audit", color: "#e21227",
    stages: ["Input validation", "Auth check", "Injection scan", "Crypto review", "Report generate"],
    prompt: (input: string) => `You are a security audit AI.\n\nCode/Config:\n${input}\n\nSecurity audit:\n1. OWASP Top 10 check\n2. Injection vulnerabilities\n3. Auth/authz issues\n4. Data exposure risks\n5. Severity ratings with fixes`,
  },
  {
    id: "translate", name: "Code Translator", color: "#22d3ee",
    stages: ["Parse source", "Map constructs", "Translate idioms", "Optimize target", "Verify logic"],
    prompt: (input: string) => `You are a code translation AI.\n\nCode:\n${input}\n\nTranslate this code to the most appropriate modern equivalent, preserving all logic and behavior. Explain any idiom differences and optimization opportunities in the target language.`,
  },
];

export function AIFactoryModal({ open, onOpenChange }: AIFactoryModalProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(WORKFLOWS[0]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  /** Stream one focused API call for a single pipeline stage. Returns the full stage output. */
  async function runStage(
    stageLabel: string,
    stageIdx: number,
    totalStages: number,
    workflowName: string,
    userInput: string,
    prevStages: { name: string; output: string }[],
    onToken: (token: string) => void,
  ): Promise<string> {
    const prevCtx = prevStages.length > 0
      ? `\nPrevious stages completed:\n${prevStages.map(s => `• ${s.name}:\n${s.output.slice(0, 400)}`).join("\n\n")}\n`
      : "";

    const isLastStage = stageIdx === totalStages - 1;
    const stagePrompt = isLastStage
      ? `You are executing the final stage (${stageIdx + 1}/${totalStages}) of the "${workflowName}" pipeline: **${stageLabel}**.\n${prevCtx}\nInput:\n${userInput}\n\nUsing all previous stage outputs as context, produce the complete final output for this pipeline. Be thorough and comprehensive.`
      : `You are executing stage ${stageIdx + 1}/${totalStages} of the "${workflowName}" pipeline: **${stageLabel}**.\n${prevCtx}\nInput:\n${userInput}\n\nFocus ONLY on: "${stageLabel}". Be concise and specific. Your output feeds the next stage.`;

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: stagePrompt }],
        model: "gpt-5.4",
        stream: true,
      }),
    });

    if (!resp.ok || !resp.body) throw new Error(`Stage ${stageIdx + 1} API error (${resp.status})`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let stageOutput = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of block.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const obj = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
            if (obj.error) throw new Error(obj.error);
            if (obj.content) { stageOutput += obj.content; onToken(obj.content); }
            if (obj.done) return stageOutput;
          } catch (e) { if (e instanceof Error && e.message) throw e; }
        }
      }
    }
    return stageOutput;
  }

  async function runFactory() {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    setCurrentStage(0);

    const stages = selectedWorkflow.stages;
    const completedStages: { name: string; output: string }[] = [];
    let displayOutput = "";

    for (let i = 0; i < stages.length; i++) {
      setCurrentStage(i + 1);
      const stageName = stages[i];
      const stageHeader = `## Stage ${i + 1}/${stages.length}: ${stageName}\n`;

      try {
        const stageResult = await runStage(
          stageName, i, stages.length,
          selectedWorkflow.name, input,
          completedStages,
          (token) => {
            displayOutput = completedStages
              .map((s, idx) => `## Stage ${idx + 1}/${stages.length}: ${s.name}\n${s.output}`)
              .join("\n\n---\n\n") +
              (completedStages.length > 0 ? "\n\n---\n\n" : "") +
              stageHeader +
              (displayOutput.split(stageHeader)[1] ?? "") + token;
            setOutput(displayOutput);
          },
        );

        completedStages.push({ name: stageName, output: stageResult });
        displayOutput = completedStages
          .map((s, idx) => `## Stage ${idx + 1}/${stages.length}: ${s.name}\n${s.output}`)
          .join("\n\n---\n\n");
        setOutput(displayOutput);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        completedStages.push({ name: stageName, output: `[Error: ${msg}]` });
      }
    }

    if (displayOutput) {
      pipeline.push({ source: "AIFactory", sourceColor: "#0ea5e9", label: selectedWorkflow.name, content: displayOutput });
    }
    setLoading(false);
    setCurrentStage(0);
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
          <motion.div className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(14,165,233,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(14,165,233,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)" }}>
                  <Factory className="w-4 h-4" style={{ color: "#0ea5e9" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">AI Factory</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Stop configuring. Start building. Multi-stage AI pipelines.</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Workflow selector */}
              <div className="grid grid-cols-3 gap-2">
                {WORKFLOWS.map(w => (
                  <button key={w.id} onClick={() => setSelectedWorkflow(w)}
                    className="rounded-xl p-2.5 text-left transition-all"
                    style={{ background: selectedWorkflow.id === w.id ? `${w.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${selectedWorkflow.id === w.id ? w.color : "rgba(255,255,255,0.06)"}` }}>
                    <div className="text-[10px] font-bold" style={{ color: selectedWorkflow.id === w.id ? w.color : "#888" }}>{w.name}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "#444" }}>{w.stages.length} stages</div>
                  </button>
                ))}
              </div>

              {/* Pipeline stages */}
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[9px] font-mono font-bold" style={{ color: selectedWorkflow.color }}>PIPELINE STAGES</div>
                  <button onClick={() => setExpanded(v => !v)} className="text-[9px]" style={{ color: "#444" }}>
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                {expanded && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedWorkflow.stages.map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className={`text-[9px] px-2 py-1 rounded font-mono transition-all ${loading && currentStage === i + 1 ? "animate-pulse" : ""}`}
                          style={{
                            background: loading && currentStage > i ? `${selectedWorkflow.color}15` : "rgba(255,255,255,0.04)",
                            color: loading && currentStage > i ? selectedWorkflow.color : "#555",
                            border: `1px solid ${loading && currentStage === i + 1 ? selectedWorkflow.color : "transparent"}`
                          }}>
                          {i + 1}. {s}
                        </span>
                        {i < selectedWorkflow.stages.length - 1 && <Settings className="w-2 h-2" style={{ color: "#2a2a2a" }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <textarea value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Paste your code, text, or content here for the ${selectedWorkflow.name}…`}
                rows={5} className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none resize-none font-mono"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "#ccc" }} />

              <button onClick={runFactory} disabled={!input.trim() || loading}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `${selectedWorkflow.color}12`, borderColor: selectedWorkflow.color + "60", color: selectedWorkflow.color }}>
                {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><Zap className="w-3.5 h-3.5" /></motion.div> Stage {currentStage}/{selectedWorkflow.stages.length} running…</> : <><Play className="w-3.5 h-3.5" /> Run {selectedWorkflow.name}</>}
              </button>

              <AnimatePresence>
                {output && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: `1px solid ${selectedWorkflow.color}30` }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: `${selectedWorkflow.color}08` }}>
                      <span className="text-[9px] font-mono font-bold" style={{ color: selectedWorkflow.color }}>OUTPUT — {selectedWorkflow.name.toUpperCase()}</span>
                      <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-3 text-[10px] max-h-56 overflow-y-auto whitespace-pre-wrap font-mono" style={{ color: "#aaa", background: "#080808" }}>
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
