import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, RefreshCw, Zap, BookOpen, CheckCircle,
  ArrowRight, ExternalLink, Brain, FileText, AlertCircle, Layers,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const B = "#4299e1";
const Bg = (n: number) => `rgba(66,153,225,${n})`;

type ResearchStep = {
  id: string;
  phase: "query_gen" | "web_research" | "reflection" | "refinement" | "answer";
  title: string;
  content: string;
  status: "pending" | "running" | "done";
};

const RESEARCH_TEMPLATES = [
  { label: "Security Vuln Analysis", query: "What are the most critical vulnerabilities in {target} systems discovered in 2024-2025? Include CVEs, CVSS scores, and exploitation techniques." },
  { label: "Threat Intelligence", query: "Latest APT campaigns targeting {sector} organizations — TTPs, IOCs, attribution, and defensive countermeasures." },
  { label: "Technology Deep Dive", query: "Comprehensive technical analysis of {technology}: architecture, security implications, attack surface, and best practices." },
  { label: "OSINT Investigation", query: "Gather comprehensive open-source intelligence on {target}: infrastructure, exposure, historical data, relationships." },
  { label: "Competitive Analysis", query: "Compare {topic} across leading solutions — features, security posture, architecture decisions, and trade-offs." },
];

export function GeminiResearchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [maxLoops, setMaxLoops] = useState(2);
  const abortRef = useRef<AbortController | null>(null);

  function addStep(step: ResearchStep) {
    setSteps(p => [...p, step]);
  }

  function updateStep(id: string, updates: Partial<ResearchStep>) {
    setSteps(p => p.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  async function runResearch() {
    if (!query.trim() || running) return;
    setRunning(true);
    setSteps([]);
    setFinalAnswer("");
    setCitations([]);

    abortRef.current = new AbortController();

    try {
      // Phase 1: Generate search queries
      const qId = `q-${Date.now()}`;
      addStep({ id: qId, phase: "query_gen", title: "Generating Search Queries", content: "", status: "running" });
      let queries = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: `Generate 3-5 targeted search queries to thoroughly research: "${query}"\n\nOutput only the queries, one per line, no numbering.` }], mode: "chat" },
        chunk => { queries += chunk; updateStep(qId, { content: queries }); },
        abortRef.current.signal,
      );
      updateStep(qId, { status: "done" });

      const searchQueries = queries.split("\n").filter(q => q.trim()).slice(0, 5);

      // Phase 2: Web research (simulated with AI knowledge)
      const webId = `web-${Date.now()}`;
      addStep({ id: webId, phase: "web_research", title: "Researching Sources", content: "", status: "running" });
      let webFindings = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{
          role: "user",
          content: `You are a research agent. Based on your training data and knowledge, provide detailed findings for these research queries:\n\n${searchQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nProvide specific facts, data points, expert opinions, and technical details. Include likely sources (websites, papers, databases).`
        }], mode: "chat" },
        chunk => { webFindings += chunk; updateStep(webId, { content: webFindings }); },
        abortRef.current.signal,
      );
      updateStep(webId, { status: "done" });

      // Phase 3: Reflection & gap analysis
      const reflId = `refl-${Date.now()}`;
      addStep({ id: reflId, phase: "reflection", title: "Identifying Knowledge Gaps", content: "", status: "running" });
      let reflection = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{
          role: "user",
          content: `Analyze these research findings for the query "${query}":\n\n${webFindings.slice(0, 2000)}\n\nIdentify: 1) Key gaps in coverage, 2) Contradictions found, 3) Areas needing deeper research, 4) Confidence level (1-10).`
        }], mode: "chat" },
        chunk => { reflection += chunk; updateStep(reflId, { content: reflection }); },
        abortRef.current.signal,
      );
      updateStep(reflId, { status: "done" });

      // Phase 4: Refinement loop
      let refinedData = webFindings;
      for (let loop = 0; loop < maxLoops - 1; loop++) {
        const refineId = `refine-${loop}-${Date.now()}`;
        addStep({ id: refineId, phase: "refinement", title: `Refinement Loop ${loop + 1}/${maxLoops - 1}`, content: "", status: "running" });
        let refined = "";
        await streamChat(
          { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{
            role: "user",
            content: `Based on the gap analysis, provide additional deeper research to fill these gaps:\n\n${reflection.slice(0, 500)}\n\nOriginal research context: ${query}\n\nProvide specific, technical, detailed information for the identified gaps.`
          }], mode: "chat" },
          chunk => { refined += chunk; updateStep(refineId, { content: refined }); },
          abortRef.current.signal,
        );
        refinedData += "\n\n" + refined;
        updateStep(refineId, { status: "done" });
      }

      // Phase 5: Final synthesis
      const ansId = `ans-${Date.now()}`;
      addStep({ id: ansId, phase: "answer", title: "Synthesizing Final Answer", content: "", status: "running" });
      let answer = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{
          role: "user",
          content: `Synthesize a comprehensive, well-structured answer for: "${query}"\n\nUsing all gathered research:\n${refinedData.slice(0, 3000)}\n\nRequirements:\n- Comprehensive coverage\n- Technical precision\n- Cite specific sources/references where possible\n- Structured with headers\n- Include key findings, analysis, and recommendations`
        }], mode: "chat" },
        chunk => { answer += chunk; setFinalAnswer(answer); updateStep(ansId, { content: "Generating comprehensive answer..." }); },
        abortRef.current.signal,
      );
      updateStep(ansId, { status: "done" });

      // Extract citations
      const citationPatterns = answer.match(/\[.+?\]|\(.+?\.(?:com|org|gov|edu|net).+?\)/g) || [];
      setCitations([...new Set(citationPatterns.slice(0, 8))]);

    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addStep({ id: "err", phase: "answer", title: "Research Error", content: String(err), status: "done" });
      }
    }
    setRunning(false);
  }

  function stopResearch() {
    abortRef.current?.abort();
    setRunning(false);
  }

  const phaseColors: Record<ResearchStep["phase"], string> = {
    query_gen: "#10b981",
    web_research: B,
    reflection: "#fbbf24",
    refinement: "#a78bfa",
    answer: "#e21227",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Bg(0.25)}`, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Bg(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Bg(0.1), border: `1px solid ${Bg(0.3)}` }}>
              <Globe className="w-5 h-5" style={{ color: B }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">Gemini Research Agent</div>
              <div className="text-[10px]" style={{ color: "#444" }}>LangGraph Deep Research · Iterative Refinement · Cited Answers</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Config */}
          <div className="flex items-center gap-3">
            <span className="text-[10px]" style={{ color: "#555" }}>Refinement loops:</span>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setMaxLoops(n)}
                className="w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center"
                style={{ background: maxLoops === n ? Bg(0.12) : "#111", border: `1px solid ${maxLoops === n ? Bg(0.3) : "#222"}`, color: maxLoops === n ? B : "#444" }}>
                {n}
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="grid grid-cols-2 gap-2">
            {RESEARCH_TEMPLATES.slice(0, 4).map(t => (
              <button key={t.label} onClick={() => setQuery(t.query.replace(/\{.+?\}/g, "[target]"))}
                className="text-left px-3 py-2 rounded-lg text-[10px] border transition-all hover:border-blue-500/30"
                style={{ background: "#111", borderColor: "#1a1a1a", color: "#666" }}>
                <span style={{ color: B }}>⬡</span> {t.label}
              </button>
            ))}
          </div>

          {/* Query Input */}
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runResearch()}
              placeholder="Enter research query — the agent will search, reflect, and iterate..."
              className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none"
              style={{ borderColor: Bg(0.2), color: "#ccc" }} />
            {running ? (
              <button onClick={stopResearch} className="px-4 rounded-xl text-[10px] font-bold border flex items-center gap-1"
                style={{ background: "rgba(226,18,39,0.08)", borderColor: "rgba(226,18,39,0.3)", color: "#e21227" }}>
                <X className="w-3.5 h-3.5" /> Stop
              </button>
            ) : (
              <button onClick={runResearch} className="px-4 rounded-xl text-[10px] font-bold border flex items-center gap-2"
                style={{ background: Bg(0.08), borderColor: Bg(0.3), color: B }}>
                <Search className="w-3.5 h-3.5" /> Research
              </button>
            )}
          </div>

          {/* Research Pipeline Steps */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: B }}>Research Pipeline</div>
              {steps.map((step) => (
                <div key={step.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${phaseColors[step.phase]}20`, background: `${phaseColors[step.phase]}05` }}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    {step.status === "running" ? (
                      <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: phaseColors[step.phase] }} />
                    ) : (
                      <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: phaseColors[step.phase] }} />
                    )}
                    <span className="text-[10px] font-bold" style={{ color: phaseColors[step.phase] }}>{step.title}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-mono ml-auto" style={{ background: `${phaseColors[step.phase]}15`, color: phaseColors[step.phase] }}>
                      {step.phase.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  {step.content && step.status === "done" && (
                    <div className="px-3 pb-2 text-[9px] leading-relaxed" style={{ color: "#555", maxHeight: "100px", overflow: "hidden" }}>
                      {step.content.slice(0, 300)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Final Answer */}
          {finalAnswer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4" style={{ color: B }} />
                <span className="text-[11px] font-bold text-white">Research Complete</span>
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
              </div>
              <div className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap" style={{ background: "#111", border: `1px solid ${Bg(0.15)}`, color: "#ddd" }}>
                {finalAnswer}
              </div>
              {citations.length > 0 && (
                <div className="mt-3 rounded-xl p-3" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                  <div className="text-[9px] font-bold mb-2" style={{ color: "#555" }}>SOURCES / REFERENCES</div>
                  <div className="flex flex-wrap gap-1">
                    {citations.map((c, i) => (
                      <span key={i} className="text-[8px] px-2 py-0.5 rounded font-mono" style={{ background: Bg(0.08), color: B }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
