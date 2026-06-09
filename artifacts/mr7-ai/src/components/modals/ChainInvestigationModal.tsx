import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Link2, Search, Loader2, Download,
  Target, Globe, Network, Shield, User, Server, AlertTriangle,
  ChevronRight, Eye, Zap, RefreshCw, Copy, Check, GitBranch
} from "lucide-react";
import { Dialog, DialogContentTop } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type NodeType = "ip" | "domain" | "person" | "org" | "malware" | "vuln" | "tool" | "event";

interface ChainNode {
  id: string;
  type: NodeType;
  label: string;
  value: string;
  notes?: string;
  risk?: "low" | "medium" | "high" | "critical";
  tags?: string[];
}

interface ChainLink {
  from: string;
  to: string;
  relation: string;
  strength: "weak" | "medium" | "strong";
}

interface AnalysisResult {
  summary: string;
  patterns: string[];
  recommendations: string[];
  riskScore: number;
  timeline?: string[];
}

const NODE_TYPES: { id: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "ip", label: "عنوان IP", icon: <Server size={12} />, color: "#e21227" },
  { id: "domain", label: "نطاق", icon: <Globe size={12} />, color: "#3b82f6" },
  { id: "person", label: "شخص", icon: <User size={12} />, color: "#10b981" },
  { id: "org", label: "مؤسسة", icon: <Network size={12} />, color: "#fbbf24" },
  { id: "malware", label: "برمجية خبيثة", icon: <AlertTriangle size={12} />, color: "#ef4444" },
  { id: "vuln", label: "ثغرة أمنية", icon: <Shield size={12} />, color: "#8b5cf6" },
  { id: "tool", label: "أداة", icon: <Target size={12} />, color: "#06b6d4" },
  { id: "event", label: "حدث", icon: <Eye size={12} />, color: "#f97316" },
];

const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#fbbf24",
  high: "#f97316",
  critical: "#e21227",
};

function getRiskColor(risk?: string) {
  return RISK_COLORS[risk ?? "low"] ?? "#666";
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function NodeCard({
  node,
  onDelete,
  onUpdate,
  selected,
  onSelect,
  onLinkFrom,
  linkFromActive,
}: {
  node: ChainNode;
  onDelete: () => void;
  onUpdate: (n: ChainNode) => void;
  selected: boolean;
  onSelect: () => void;
  onLinkFrom: () => void;
  linkFromActive: boolean;
}) {
  const typeMeta = NODE_TYPES.find((t) => t.id === node.type)!;
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(node.value);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-xl border p-3 cursor-pointer transition-all group`}
      style={{
        borderColor: selected ? typeMeta.color : "#1f1f1f",
        background: selected ? typeMeta.color + "12" : "#0d0d0d",
        boxShadow: selected ? `0 0 0 2px ${typeMeta.color}60` : "none",
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: typeMeta.color + "20", color: typeMeta.color }}
        >
          {typeMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: typeMeta.color }}>
              {typeMeta.label}
            </span>
            {node.risk && (
              <span
                className="text-[8px] font-bold px-1 py-0.5 rounded"
                style={{ background: getRiskColor(node.risk) + "20", color: getRiskColor(node.risk) }}
              >
                {node.risk.toUpperCase()}
              </span>
            )}
          </div>
          {editing ? (
            <input
              autoFocus
              value={localVal}
              onChange={(e) => setLocalVal(e.target.value)}
              onBlur={() => { setEditing(false); onUpdate({ ...node, value: localVal }); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onUpdate({ ...node, value: localVal }); } }}
              className="w-full text-[11px] bg-[#161616] border border-[#333] rounded px-1.5 py-0.5 text-white outline-none font-mono"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="text-[11px] text-white font-mono truncate"
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
              title={node.value}
            >
              {node.value || <span className="text-[#444]">انقر مرتين للتعديل</span>}
            </p>
          )}
          {node.label && node.label !== node.value && (
            <p className="text-[9px] text-[#555] mt-0.5 truncate">{node.label}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onLinkFrom(); }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              linkFromActive ? "bg-blue-500/30 text-blue-400" : "bg-[#161616] text-[#555] hover:text-blue-400"
            }`}
            title="ربط من هذه العقدة"
          >
            <Link2 size={10} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-6 h-6 rounded flex items-center justify-center bg-[#161616] text-[#555] hover:text-red-400 transition-all"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ChainInvestigationModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [links, setLinks] = useState<ChainLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [linkFromNode, setLinkFromNode] = useState<string | null>(null);
  const [addType, setAddType] = useState<NodeType>("ip");
  const [addValue, setAddValue] = useState("");
  const [addRisk, setAddRisk] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [linkRelation, setLinkRelation] = useState("متصل بـ");
  const [activeTab, setActiveTab] = useState<"graph" | "analysis">("graph");
  const [copied, setCopied] = useState(false);

  function addNode() {
    if (!addValue.trim()) return;
    const newNode: ChainNode = {
      id: genId(),
      type: addType,
      label: addValue.trim(),
      value: addValue.trim(),
      risk: addRisk,
      tags: [],
    };
    setNodes((prev) => [...prev, newNode]);
    setAddValue("");
    toast({ description: `تم إضافة ${NODE_TYPES.find((t) => t.id === addType)?.label}: ${newNode.value}` });
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setLinks((prev) => prev.filter((l) => l.from !== id && l.to !== id));
    if (selectedNode === id) setSelectedNode(null);
    if (linkFromNode === id) setLinkFromNode(null);
  }

  function handleNodeSelect(id: string) {
    if (linkFromNode && linkFromNode !== id) {
      setLinks((prev) => [
        ...prev,
        { from: linkFromNode, to: id, relation: linkRelation, strength: "medium" },
      ]);
      setLinkFromNode(null);
      toast({ description: "تم إنشاء الرابط" });
    } else {
      setSelectedNode((prev) => prev === id ? null : id);
    }
  }

  const runAnalysis = useCallback(async () => {
    if (nodes.length === 0) return;
    setIsAnalyzing(true);
    setActiveTab("analysis");

    const nodeList = nodes.map((n) => `- [${NODE_TYPES.find((t) => t.id === n.type)?.label}] ${n.value} (خطورة: ${n.risk ?? "غير محدد"})`).join("\n");
    const linkList = links.map((l) => {
      const from = nodes.find((n) => n.id === l.from)?.value ?? l.from;
      const to = nodes.find((n) => n.id === l.to)?.value ?? l.to;
      return `- ${from} → ${l.relation} → ${to}`;
    }).join("\n");

    const prompt = `أنت محقق جنائي رقمي خبير. لديك شبكة تحقيق بها:

**العقد (الكيانات)**:
${nodeList}

**الروابط (العلاقات)**:
${linkList.length > 0 ? linkList : "لا روابط محددة بعد"}

قدّم تحليلاً استخباراتياً يشمل:
1. **ملخص الشبكة** - ما الصورة الكاملة التي تبدو عليها؟
2. **الأنماط المكتشفة** - قائمة بـ 4-6 أنماط أو مؤشرات خطر
3. **أبرز العلاقات** والارتباطات المثيرة للاهتمام
4. **درجة الخطر الكلية** من 0-100 مع التبرير
5. **التوصيات** - 5 خطوات محددة للتحقيق أو التخفيف
6. **جدول زمني مقترح** للأحداث إن أمكن

أجب بصيغة JSON فقط بالشكل:
{
  "summary": "...",
  "patterns": ["...", "..."],
  "recommendations": ["...", "..."],
  "riskScore": 75,
  "timeline": ["...", "..."]
}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "CHAT-GPT Researcher",
          messages: [{ role: "user", content: prompt }],
          mode: "chat",
          language: "ar",
        }),
      });

      if (!res.ok || !res.body) throw new Error("فشل الاتصال");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const j = JSON.parse(data);
            if (j.content) raw += j.content;
          } catch { /* skip */ }
        }
      }

      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as AnalysisResult;
        setAnalysis(parsed);
      } else {
        setAnalysis({
          summary: raw,
          patterns: [],
          recommendations: [],
          riskScore: 50,
        });
      }
    } catch (e) {
      toast({ description: `فشل التحليل: ${e instanceof Error ? e.message : "خطأ"}` });
    } finally {
      setIsAnalyzing(false);
    }
  }, [nodes, links, toast]);

  function exportChain() {
    const data = {
      nodes: nodes.map((n) => ({ ...n })),
      links,
      analysis,
      exportedAt: new Date().toISOString(),
    };
    const report = `# تقرير التحقيق المتسلسل
تاريخ: ${new Date().toLocaleDateString("ar")}
العقد: ${nodes.length} | الروابط: ${links.length}

## الكيانات
${nodes.map((n) => `- [${NODE_TYPES.find((t) => t.id === n.type)?.label}] ${n.value} (${n.risk})`).join("\n")}

## العلاقات
${links.map((l) => `- ${nodes.find((n) => n.id === l.from)?.value} → ${l.relation} → ${nodes.find((n) => n.id === l.to)?.value}`).join("\n")}

## التحليل
${analysis ? `
**الملخص**: ${analysis.summary}
**الخطورة**: ${analysis.riskScore}/100
**الأنماط**: ${analysis.patterns.join(", ")}
**التوصيات**:
${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}
` : "لم يتم التحليل بعد"}

---
JSON Raw: ${JSON.stringify(data, null, 2)}`;
    void navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ description: "تم نسخ تقرير التحقيق" });
  }

  const getRiskGauge = (score: number) => {
    if (score >= 80) return { color: "#e21227", label: "حرج" };
    if (score >= 60) return { color: "#f97316", label: "عالٍ" };
    if (score >= 40) return { color: "#fbbf24", label: "متوسط" };
    return { color: "#10b981", label: "منخفض" };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="max-w-5xl w-full h-[92vh] bg-[#080808] border border-[#1f1f1f] rounded-xl overflow-hidden p-0 flex flex-col gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #4c1d95)" }}
            animate={{ boxShadow: ["0 0 10px #8b5cf640", "0 0 25px #8b5cf680", "0 0 10px #8b5cf640"] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <GitBranch size={16} className="text-white" />
          </motion.div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">CHAIN INVESTIGATION</h2>
            <p className="text-[10px] text-[#666] font-mono">بناء سلسلة التحقيق وتحليل العلاقات بالذكاء الاصطناعي</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-[#555] font-mono">
              {nodes.length} عقدة · {links.length} رابط
            </span>
            {nodes.length > 0 && (
              <button
                onClick={exportChain}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white transition-all"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Download size={12} />}
                تصدير
              </button>
            )}
            {nodes.length > 0 && (
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #4c1d95)", color: "white" }}
              >
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                تحليل بالذكاء
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#666] hover:text-white hover:border-[#8b5cf6] transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1f1f1f] shrink-0">
          {(["graph", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab
                  ? "border-[#8b5cf6] text-[#8b5cf6]"
                  : "border-transparent text-[#555] hover:text-[#888]"
              }`}
            >
              {tab === "graph" ? "الشبكة" : "التحليل"}
              {tab === "analysis" && analysis && (
                <span
                  className="ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{
                    background: getRiskGauge(analysis.riskScore).color + "25",
                    color: getRiskGauge(analysis.riskScore).color,
                  }}
                >
                  {analysis.riskScore}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 flex min-h-0">
          {activeTab === "graph" && (
            <>
              {/* Add node sidebar */}
              <div className="w-64 shrink-0 border-r border-[#1f1f1f] flex flex-col bg-[#090909]">
                <div className="p-3 border-b border-[#1f1f1f]">
                  <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">إضافة كيان</p>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {NODE_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setAddType(t.id)}
                        className={`px-1.5 py-1 rounded text-[9px] border transition-all flex items-center gap-1 font-mono`}
                        style={
                          addType === t.id
                            ? { borderColor: t.color, color: t.color, background: t.color + "15" }
                            : { borderColor: "#1f1f1f", color: "#555" }
                        }
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNode()}
                    placeholder="قيمة الكيان..."
                    className="w-full px-2 py-1.5 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg text-[11px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#8b5cf6] transition-colors font-mono mb-2"
                    dir="auto"
                  />
                  <div className="flex gap-1 mb-2">
                    {(["low", "medium", "high", "critical"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setAddRisk(r)}
                        className="flex-1 py-1 rounded text-[8px] font-bold border transition-all"
                        style={
                          addRisk === r
                            ? { borderColor: RISK_COLORS[r], color: RISK_COLORS[r], background: RISK_COLORS[r] + "20" }
                            : { borderColor: "#1f1f1f", color: "#444" }
                        }
                      >
                        {r === "low" ? "منخفض" : r === "medium" ? "متوسط" : r === "high" ? "عالٍ" : "حرج"}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={addNode}
                    disabled={!addValue.trim()}
                    className="w-full py-1.5 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #4c1d95)", color: "white" }}
                  >
                    <Plus size={12} />
                    إضافة
                  </button>
                </div>

                {/* Link relation */}
                {linkFromNode && (
                  <div className="p-3 border-b border-[#1f1f1f] bg-blue-500/05">
                    <p className="text-[9px] text-blue-400 font-mono mb-1.5">وضع الربط — اختر عقدة أخرى</p>
                    <input
                      type="text"
                      value={linkRelation}
                      onChange={(e) => setLinkRelation(e.target.value)}
                      placeholder="العلاقة..."
                      className="w-full px-2 py-1 bg-[#0d0d0d] border border-blue-500/30 rounded text-[10px] text-white placeholder:text-[#444] focus:outline-none focus:border-blue-400 font-mono"
                    />
                    <button
                      onClick={() => setLinkFromNode(null)}
                      className="mt-1.5 w-full text-[9px] text-[#555] hover:text-red-400 transition-colors font-mono"
                    >
                      إلغاء الربط
                    </button>
                  </div>
                )}

                {/* Links list */}
                {links.length > 0 && (
                  <div className="p-3 flex-1 overflow-y-auto">
                    <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-mono">الروابط</p>
                    <div className="space-y-1">
                      {links.map((link, idx) => {
                        const fromNode = nodes.find((n) => n.id === link.from);
                        const toNode = nodes.find((n) => n.id === link.to);
                        return (
                          <div key={idx} className="flex items-center gap-1 text-[9px] font-mono text-[#555] group">
                            <span className="text-[#888] truncate max-w-[60px]">{fromNode?.value ?? "?"}</span>
                            <ChevronRight size={9} className="text-[#8b5cf6] shrink-0" />
                            <span className="text-[#8b5cf6] truncate max-w-[50px]">{link.relation}</span>
                            <ChevronRight size={9} className="text-[#8b5cf6] shrink-0" />
                            <span className="text-[#888] truncate max-w-[60px]">{toNode?.value ?? "?"}</span>
                            <button
                              onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))}
                              className="ml-auto opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all shrink-0"
                            >
                              <Trash2 size={8} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Graph canvas */}
              <div className="flex-1 overflow-y-auto p-4">
                {nodes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg, #8b5cf620, #4c1d9520)", border: "1px solid #8b5cf630" }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Network size={28} style={{ color: "#8b5cf6" }} />
                    </motion.div>
                    <p className="text-[13px] text-[#666] mb-1">ابدأ بإضافة الكيانات</p>
                    <p className="text-[10px] text-[#444]">أضف IPs، نطاقات، أشخاص، مؤسسات وغيرها<br />ثم اربطها واطلب التحليل بالذكاء الاصطناعي</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <AnimatePresence>
                      {nodes.map((node) => (
                        <NodeCard
                          key={node.id}
                          node={node}
                          onDelete={() => deleteNode(node.id)}
                          onUpdate={(n) => setNodes((prev) => prev.map((x) => x.id === n.id ? n : x))}
                          selected={selectedNode === node.id}
                          onSelect={() => handleNodeSelect(node.id)}
                          onLinkFrom={() => setLinkFromNode((prev) => prev === node.id ? null : node.id)}
                          linkFromActive={linkFromNode === node.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "analysis" && (
            <div className="flex-1 overflow-y-auto p-5">
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-12 h-12 rounded-full border-2 border-[#8b5cf6]/30 border-t-[#8b5cf6]"
                  />
                  <p className="text-[12px] text-[#8b5cf6] font-mono">جاري التحليل الاستخباراتي...</p>
                  <div className="flex gap-1">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ delay: i * 0.12, repeat: Infinity, duration: 1.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!isAnalyzing && !analysis && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#8b5cf620", border: "1px solid #8b5cf630" }}>
                    <Search size={24} style={{ color: "#8b5cf6" }} />
                  </div>
                  <p className="text-[13px] text-[#666]">أضف كيانات ثم اضغط "تحليل بالذكاء"</p>
                  {nodes.length > 0 && (
                    <button
                      onClick={runAnalysis}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] text-white"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #4c1d95)" }}
                    >
                      <Zap size={14} />
                      ابدأ التحليل
                    </button>
                  )}
                </div>
              )}

              {!isAnalyzing && analysis && (
                <div className="space-y-4">
                  {/* Risk gauge */}
                  <div className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-[#666] font-mono uppercase tracking-wider">درجة الخطر الكلية</span>
                      <span
                        className="text-2xl font-black font-mono"
                        style={{ color: getRiskGauge(analysis.riskScore).color }}
                      >
                        {analysis.riskScore}<span className="text-sm text-[#555]">/100</span>
                      </span>
                    </div>
                    <div className="h-2 bg-[#161616] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, #10b981, #fbbf24, ${getRiskGauge(analysis.riskScore).color})` }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${analysis.riskScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-[10px] font-bold mt-1.5" style={{ color: getRiskGauge(analysis.riskScore).color }}>
                      {getRiskGauge(analysis.riskScore).label}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/05 p-4">
                    <p className="text-[10px] text-[#8b5cf6] font-mono uppercase tracking-wider mb-2">الملخص التنفيذي</p>
                    <p className="text-[12px] text-[#ccc] leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Patterns */}
                  {analysis.patterns.length > 0 && (
                    <div className="rounded-xl border border-[#fbbf24]/20 bg-[#fbbf24]/05 p-4">
                      <p className="text-[10px] text-[#fbbf24] font-mono uppercase tracking-wider mb-2">الأنماط المكتشفة</p>
                      <div className="space-y-1.5">
                        {analysis.patterns.map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] mt-1.5 shrink-0" />
                            <p className="text-[11px] text-[#ccc]">{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <div className="rounded-xl border border-[#10b981]/20 bg-[#10b981]/05 p-4">
                      <p className="text-[10px] text-[#10b981] font-mono uppercase tracking-wider mb-2">التوصيات الاستراتيجية</p>
                      <div className="space-y-2">
                        {analysis.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] font-bold font-mono text-[#10b981] shrink-0 mt-0.5">{i + 1}.</span>
                            <p className="text-[11px] text-[#ccc]">{r}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {analysis.timeline && analysis.timeline.length > 0 && (
                    <div className="rounded-xl border border-[#3b82f6]/20 bg-[#3b82f6]/05 p-4">
                      <p className="text-[10px] text-[#3b82f6] font-mono uppercase tracking-wider mb-2">الجدول الزمني</p>
                      <div className="space-y-2">
                        {analysis.timeline.map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                              {i < (analysis.timeline?.length ?? 0) - 1 && <div className="w-0.5 h-5 bg-[#3b82f6]/30 mt-1" />}
                            </div>
                            <p className="text-[11px] text-[#ccc] -mt-0.5">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={runAnalysis}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] text-[#888] border border-[#1f1f1f] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-all"
                  >
                    <RefreshCw size={12} />
                    إعادة التحليل
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
