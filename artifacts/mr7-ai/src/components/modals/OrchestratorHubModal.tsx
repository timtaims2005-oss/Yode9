import { useState, useRef } from "react";
import { X, Play, Users, Zap, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

interface AgentResult {
  agentId: string;
  name: string;
  emoji: string;
  output: string;
  error?: string;
  status: "running" | "done" | "error";
}

const AVAILABLE_AGENTS: AgentDef[] = [
  { id: "researcher", name: "Researcher", emoji: "🔍", role: "بحث وجمع معلومات" },
  { id: "coder",      name: "Coder",      emoji: "💻", role: "برمجة وتنفيذ تقني" },
  { id: "analyst",    name: "Analyst",    emoji: "📊", role: "تحليل وتقييم" },
  { id: "writer",     name: "Writer",     emoji: "✍️", role: "كتابة وتوثيق" },
  { id: "critic",     name: "Critic",     emoji: "⚡", role: "نقد وتقييم المخاطر" },
  { id: "planner",    name: "Planner",    emoji: "🗺️", role: "تخطيط استراتيجي" },
];

const EXAMPLE_TASKS = [
  "ابنِ خطة شاملة لإطلاق تطبيق ذكاء اصطناعي",
  "حلّل مزايا وعيوب الانتقال إلى microservices",
  "اقترح استراتيجية محتوى لمنتج SaaS",
  "صمّم نظام أمان للبنية التحتية السحابية",
  "Build a comprehensive research report on RAG architectures",
];

export function OrchestratorHubModal({ open, onClose }: Props) {
  const [task, setTask] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(["researcher", "analyst", "writer"]));
  const [synthesize, setSynthesize] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "synthesis" | "done">("idle");
  const [agentResults, setAgentResults] = useState<Record<string, AgentResult>>({});
  const [synthesis, setSynthesis] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const abortRef = useRef<() => void>(() => {});

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    if (!task.trim() || running) return;
    setRunning(true);
    setPhase("running");
    setAgentResults({});
    setSynthesis("");
    setExpanded(null);

    // Init all selected agents as "running"
    const initResults: Record<string, AgentResult> = {};
    for (const id of selectedAgents) {
      const a = AVAILABLE_AGENTS.find(x => x.id === id)!;
      initResults[id] = { agentId: id, name: a.name, emoji: a.emoji, output: "", status: "running" };
    }
    setAgentResults(initResults);

    let aborted = false;
    abortRef.current = () => { aborted = true; };

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          agents: Array.from(selectedAgents),
          synthesize,
          language: "ar",
          maxTokensPerAgent: 800,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6)) as {
              type: string;
              agentId?: string;
              name?: string;
              emoji?: string;
              output?: string;
              error?: string;
              content?: string;
              synthesis?: string;
              agentCount?: number;
            };

            switch (d.type) {
              case "agent_start":
                setAgentResults(prev => ({ ...prev, [d.agentId!]: { ...prev[d.agentId!], status: "running", output: "" } }));
                break;
              case "agent_done":
                setAgentResults(prev => ({ ...prev, [d.agentId!]: { agentId: d.agentId!, name: d.name!, emoji: d.emoji!, output: d.output!, status: "done" } }));
                if (d.agentId) setExpanded(d.agentId);
                break;
              case "agent_error":
                setAgentResults(prev => ({ ...prev, [d.agentId!]: { ...prev[d.agentId!], status: "error", error: d.error } }));
                break;
              case "synthesis_start":
                setPhase("synthesis");
                setSynthesis("");
                break;
              case "synthesis_chunk":
                setSynthesis(prev => prev + (d.content ?? ""));
                break;
              case "synthesis_done":
                setSynthesis(d.synthesis ?? "");
                break;
              case "done":
                setPhase("done");
                setRunning(false);
                break;
              case "error":
                setPhase("done");
                setRunning(false);
                break;
            }
          } catch { /* skip bad line */ }
        }
      }
    } catch { /* ignore */ }
    finally {
      setRunning(false);
      if (phase !== "done") setPhase("done");
    }
  };

  const reset = () => {
    abortRef.current();
    setRunning(false);
    setPhase("idle");
    setAgentResults({});
    setSynthesis("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#e21227]" />
            <span className="font-bold text-white">المنسّق متعدد الوكلاء</span>
            <span className="text-xs text-muted-foreground">Multi-Agent Orchestrator</span>
            {phase === "running" && <span className="text-xs text-amber-400 animate-pulse">يعمل...</span>}
            {phase === "synthesis" && <span className="text-xs text-purple-400 animate-pulse">تركيب النتائج...</span>}
            {phase === "done" && <span className="text-xs text-green-400">مكتمل</span>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel — Config */}
          <div className="w-72 border-r border-[#1f1f1f] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1f1f1f] space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">المهمة</p>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                disabled={running}
                rows={4}
                placeholder="صف المهمة التي تريد من الوكلاء تنفيذها..."
                className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none focus:border-[#e21227]/40 disabled:opacity-50"
              />
              <div className="flex flex-wrap gap-1">
                {EXAMPLE_TASKS.map(t => (
                  <button key={t} onClick={() => setTask(t)} className="text-xs px-2 py-0.5 bg-[#1f1f1f] rounded text-muted-foreground hover:text-white transition-colors">{t.slice(0, 25)}...</button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-[#1f1f1f] space-y-2 overflow-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">الوكلاء ({selectedAgents.size})</p>
              {AVAILABLE_AGENTS.map(a => (
                <label key={a.id} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${selectedAgents.has(a.id) ? "bg-[#e21227]/20 border border-[#e21227]/30" : "bg-[#1f1f1f] border border-[#262626]"}`}>{a.emoji}</div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium transition-colors ${selectedAgents.has(a.id) ? "text-white" : "text-muted-foreground"}`}>{a.name}</p>
                    <p className="text-xs text-muted-foreground/60">{a.role}</p>
                  </div>
                  <div className="ml-auto" onClick={() => toggleAgent(a.id)}>
                    {selectedAgents.has(a.id)
                      ? <ToggleRight className="w-5 h-5 text-[#e21227]" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-muted-foreground">تركيب النتائج</span>
                <div onClick={() => setSynthesize(!synthesize)}>
                  {synthesize
                    ? <ToggleRight className="w-5 h-5 text-[#e21227]" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
                </div>
              </label>

              <Button onClick={phase === "idle" || phase === "done" ? run : reset} disabled={!task.trim() && !running} className={`w-full gap-2 text-sm ${running ? "bg-red-900 hover:bg-red-800" : "bg-[#e21227] hover:bg-[#b5000f]"} text-white`}>
                {running ? <><Loader2 className="w-4 h-4 animate-spin" />إيقاف</> : <><Play className="w-4 h-4" />تشغيل</>}
              </Button>
            </div>
          </div>

          {/* Right Panel — Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {phase === "idle" ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
                <div className="text-center space-y-2">
                  <Users className="w-16 h-16 mx-auto opacity-20" />
                  <p>اختر الوكلاء وأدخل المهمة للبدء</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {/* Agent Results */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">نتائج الوكلاء</p>
                {Object.values(agentResults).map(r => (
                  <div key={r.agentId} className="bg-[#161616] border border-[#262626] rounded-lg overflow-hidden">
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] transition-colors" onClick={() => setExpanded(expanded === r.agentId ? null : r.agentId)}>
                      <span className="text-xl">{r.emoji}</span>
                      <span className="text-sm font-medium text-white">{r.name}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {r.status === "running" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                        {r.status === "done" && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {r.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
                        {r.output && (expanded === r.agentId ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />)}
                      </div>
                    </button>
                    {expanded === r.agentId && (
                      <div className="border-t border-[#1f1f1f] p-3 bg-[#0a0a0a]">
                        {r.error ? (
                          <p className="text-sm text-red-400">{r.error}</p>
                        ) : (
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">{r.output || "..."}</pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Synthesis */}
                {(phase === "synthesis" || (phase === "done" && synthesis)) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">التركيب النهائي</p>
                    </div>
                    <div className="bg-[#0f0810] border border-purple-900/40 rounded-lg p-4">
                      <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {synthesis}{phase === "synthesis" && <span className="animate-pulse text-purple-400">▌</span>}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
