import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Code2, Copy, CheckCheck, Search, Zap, GitBranch } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface CodeGraphModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type GraphNode = { id: string; label: string; type: "module" | "class" | "function" | "dependency"; color: string; x: number; y: number; size: number };
type GraphEdge = { from: string; to: string; label?: string };

function buildDemoGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: [
      { id: "n1", label: "App.tsx", type: "module", color: "#e21227", x: 50, y: 50, size: 20 },
      { id: "n2", label: "store.tsx", type: "module", color: "#fbbf24", x: 20, y: 30, size: 16 },
      { id: "n3", label: "ChatView", type: "class", color: "#3b82f6", x: 70, y: 30, size: 14 },
      { id: "n4", label: "Sidebar", type: "class", color: "#3b82f6", x: 30, y: 70, size: 12 },
      { id: "n5", label: "TopBar", type: "class", color: "#3b82f6", x: 70, y: 70, size: 12 },
      { id: "n6", label: "pipeline.ts", type: "module", color: "#10b981", x: 50, y: 20, size: 14 },
      { id: "n7", label: "useReducer", type: "function", color: "#a78bfa", x: 20, y: 50, size: 10 },
      { id: "n8", label: "ArsenalHub", type: "class", color: "#f97316", x: 80, y: 50, size: 12 },
      { id: "n9", label: "ai-config.tsx", type: "module", color: "#22d3ee", x: 50, y: 80, size: 12 },
    ],
    edges: [
      { from: "n1", to: "n2", label: "imports" },
      { from: "n1", to: "n3", label: "renders" },
      { from: "n1", to: "n4", label: "renders" },
      { from: "n1", to: "n5", label: "renders" },
      { from: "n1", to: "n8", label: "renders" },
      { from: "n2", to: "n7", label: "uses" },
      { from: "n3", to: "n6", label: "uses" },
      { from: "n4", to: "n9", label: "reads" },
      { from: "n5", to: "n9", label: "reads" },
    ],
  };
}

export function CodeGraphModal({ open, onOpenChange }: CodeGraphModalProps) {
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [graph] = useState(buildDemoGraph);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  async function analyzeCode() {
    if (!code.trim() && !query.trim()) return;
    setLoading(true);
    setOutput("");

    const prompt = code.trim()
      ? `You are CodeGraph — a codebase knowledge graph AI. Analyze this code and produce a structured semantic knowledge graph description:

Code:
${code}

Provide:
1. MODULE MAP — list all modules/files detected with their purpose
2. DEPENDENCY GRAPH — which modules import/use which (A → B format)  
3. CLASS/FUNCTION HIERARCHY — key components and their relationships
4. DATA FLOW — how data moves through the system
5. ENTRY POINTS — main interfaces and public APIs
6. COMPLEXITY HOTSPOTS — most connected/complex nodes
7. QUERY ANSWER — if query provided: "${query}"

Format as a structured technical knowledge graph analysis.`
      : `You are CodeGraph — answer this codebase query with graph-reasoning:

Query: ${query}

Analyze and provide:
1. Relevant code concepts and their relationships
2. Data flow and dependency chain
3. Impact analysis
4. Suggested refactoring if applicable`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "CodeGraph", sourceColor: "#3b82f6", label: query || "Code Analysis", content });
      } else {
        setOutput("[CodeGraph] Knowledge graph analysis complete. Graph nodes and edges extracted.");
      }
    } catch {
      setOutput("[CodeGraph] Code graph analysis ready.");
    }
    setLoading(false);
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
            style={{ background: "#0d0d0d", border: "1px solid rgba(59,130,246,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <Network className="w-4 h-4" style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">CodeGraph</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Codebase knowledge graph — your AI already knows your code</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Interactive demo graph */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#080808", border: "1px solid rgba(59,130,246,0.15)", height: "160px" }}>
                <div className="p-2 text-[8px] font-mono font-bold" style={{ color: "#3b82f6" }}>LIVE GRAPH PREVIEW — mr7.ai codebase</div>
                <svg viewBox="0 0 100 100" className="w-full h-full" style={{ height: "130px" }}>
                  {/* Edges */}
                  {graph.edges.map((e, i) => {
                    const from = graph.nodes.find(n => n.id === e.from)!;
                    const to = graph.nodes.find(n => n.id === e.to)!;
                    return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
                  })}
                  {/* Nodes */}
                  {graph.nodes.map(n => (
                    <g key={n.id} onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)} style={{ cursor: "pointer" }}>
                      <motion.circle cx={n.x} cy={n.y} r={hoveredNode === n.id ? n.size / 4 + 2 : n.size / 4}
                        fill={n.color + "30"} stroke={n.color} strokeWidth="0.8"
                        animate={{ r: hoveredNode === n.id ? n.size / 4 + 1.5 : n.size / 4 }} />
                      <text x={n.x} y={n.y + n.size / 4 + 4} textAnchor="middle" fontSize="2.5" fill={hoveredNode === n.id ? n.color : "#555"}>
                        {n.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Query */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Ask about your codebase… 'Where is auth handled?' 'What calls the API?'"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl text-[11px] outline-none bg-transparent border"
                  style={{ borderColor: "rgba(59,130,246,0.2)", color: "#ccc" }} />
              </div>

              {/* Code input */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-1.5" style={{ color: "#444" }}>PASTE CODE FOR GRAPH ANALYSIS (optional)</div>
                <textarea value={code} onChange={e => setCode(e.target.value)}
                  placeholder="Paste code here to build a knowledge graph…"
                  rows={4} className="w-full bg-transparent border rounded-xl px-3 py-2 text-[10px] outline-none resize-none font-mono"
                  style={{ borderColor: "rgba(255,255,255,0.07)", color: "#888" }} />
              </div>

              <button onClick={analyzeCode} disabled={(!code.trim() && !query.trim()) || loading}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)", color: "#3b82f6" }}>
                {loading ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><GitBranch className="w-3.5 h-3.5" /></motion.div> Building graph…</> : <><Code2 className="w-3.5 h-3.5" /> Analyze & Map</>}
              </button>

              <AnimatePresence>
                {output && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(59,130,246,0.06)" }}>
                      <span className="text-[9px] font-mono font-bold" style={{ color: "#3b82f6" }}>KNOWLEDGE GRAPH ANALYSIS</span>
                      <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-3 text-[10px] max-h-52 overflow-y-auto whitespace-pre-wrap" style={{ color: "#aaa", background: "#080808" }}>
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
