import { useState, useRef, useEffect } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitMerge, Send, RotateCcw, Copy, CheckCheck, Network } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface GraphifyModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Node = { id: string; label: string; type: "core" | "branch" | "leaf"; x: number; y: number; color: string };
type Edge = { from: string; to: string; label: string };

export function GraphifyModal({ open, onOpenChange }: GraphifyModalProps) {
  const [input, setInput] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [running, setRunning] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  async function generate() {
    if (!input.trim() || running) return;
    setRunning(true);
    setNodes([]);
    setEdges([]);

    const prompt = `You are a knowledge graph generator. Convert the following text into a JSON knowledge graph.

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"id": "n1", "label": "Main Topic", "type": "core"},
    {"id": "n2", "label": "Sub Topic", "type": "branch"},
    {"id": "n3", "label": "Detail", "type": "leaf"}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "label": "contains"},
    {"from": "n2", "to": "n3", "label": "includes"}
  ]
}

Node types: "core" (central concept), "branch" (main category), "leaf" (detail/fact)
Generate 8-20 nodes. Maximum depth 3 levels. Make labels concise (2-5 words).

Text to convert: ${input}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-5.4"
        }),
      });
      const text = await readChatText(res);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      const graph = JSON.parse(jsonMatch[0]);
      setRawJson(JSON.stringify(graph, null, 2));

      const W = 700, H = 480;
      const colorMap: Record<string, string> = { core: "#e21227", branch: "#fbbf24", leaf: "#60a5fa" };

      const positioned: Node[] = graph.nodes.map((n: { id: string; label: string; type: "core" | "branch" | "leaf" }, i: number) => {
        const total = graph.nodes.length;
        const angle = (i / total) * 2 * Math.PI;
        const radius = n.type === "core" ? 0 : n.type === "branch" ? 140 : 260;
        return {
          ...n,
          x: W / 2 + radius * Math.cos(angle),
          y: H / 2 + radius * Math.sin(angle),
          color: colorMap[n.type] ?? "#888",
        };
      });

      setNodes(positioned);
      setEdges(graph.edges ?? []);
      pipeline.push({ source: "GRAPHIFY", sourceColor: "#a78bfa", label: `Graph: ${input.slice(0, 30)}`, content: JSON.stringify(graph) });
    } catch { /* ignore */ }
    setRunning(false);
  }

  function onMouseDown(e: React.MouseEvent, nodeId: string) {
    setDragNode(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setNodes((prev) => prev.map((n) =>
      n.id === dragNode ? { ...n, x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y } : n
    ));
  }

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
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 0 60px rgba(167,139,250,0.1)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.4)" }}>
                  <Network className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#a78bfa" }}>GRAPHIFY</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Knowledge Graph Generator — drag nodes to rearrange</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setNodes([]); setEdges([]); setInput(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Graph canvas */}
            <div className="flex-1 overflow-hidden relative" style={{ background: "#060606", minHeight: 320 }}>
              {nodes.length === 0 && !running && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Network className="w-10 h-10" style={{ color: "#1a1a2e" }} />
                  <div className="text-[11px] font-mono" style={{ color: "#333" }}>Enter any text below to generate a knowledge graph</div>
                </div>
              )}
              {running && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[11px] font-mono animate-pulse" style={{ color: "#a78bfa" }}>Generating graph…</div>
                </div>
              )}
              {nodes.length > 0 && (
                <svg
                  ref={svgRef}
                  className="w-full h-full"
                  style={{ cursor: dragNode ? "grabbing" : "default" }}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => setDragNode(null)}
                  onMouseLeave={() => setDragNode(null)}
                >
                  {edges.map((e, i) => {
                    const from = nodes.find((n) => n.id === e.from);
                    const to = nodes.find((n) => n.id === e.to);
                    if (!from || !to) return null;
                    const mx = (from.x + to.x) / 2;
                    const my = (from.y + to.y) / 2;
                    return (
                      <g key={i}>
                        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(167,139,250,0.2)" strokeWidth="1" />
                        <text x={mx} y={my} textAnchor="middle" fill="#333" fontSize="8" fontFamily="monospace">{e.label}</text>
                      </g>
                    );
                  })}
                  {nodes.map((node) => (
                    <g key={node.id} style={{ cursor: "grab" }} onMouseDown={(e) => onMouseDown(e, node.id)}>
                      <circle
                        cx={node.x} cy={node.y}
                        r={node.type === "core" ? 28 : node.type === "branch" ? 20 : 14}
                        fill={`${node.color}18`} stroke={node.color} strokeWidth="1.5"
                      />
                      <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle" fill={node.color}
                        fontSize={node.type === "core" ? 9 : 8} fontFamily="monospace" fontWeight="bold">
                        {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>

            {/* Legend */}
            {nodes.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {[["core", "#e21227"], ["branch", "#fbbf24"], ["leaf", "#60a5fa"]].map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[9px] font-mono" style={{ color: "#444" }}>{type}</span>
                  </div>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(rawJson); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#444" }}
                  >
                    {copied ? <CheckCheck className="w-3 h-3" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3" />}
                    JSON
                  </button>
                  <button
                    onClick={() => pipeline.push({ source: "GRAPHIFY", sourceColor: "#a78bfa", label: "Graph JSON", content: rawJson })}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border"
                    style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)", color: "#a78bfa" }}
                  >
                    <GitMerge className="w-3 h-3" />
                    Pipe
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
                  placeholder="Enter any text, concept, or topic to graph…"
                  disabled={running}
                  className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[12px] outline-none"
                  style={{ borderColor: "rgba(167,139,250,0.2)", color: "#ccc" }}
                />
                <button
                  onClick={generate}
                  disabled={running || !input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                  style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)" }}
                >
                  <Send className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
