import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Search, Play, GitMerge } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface AwesomeLLMModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type App = {
  id: string;
  name: string;
  category: string;
  desc: string;
  systemPrompt: string;
  tags: string[];
  color: string;
  icon: string;
};

const CATEGORIES = ["All", "Agent", "Code", "RAG", "Vision", "Voice", "Tools", "Research", "Security", "Productivity"];

const LLM_APPS: App[] = [
  { id: "auto-researcher", name: "Auto Researcher", category: "Research", icon: "🔬", tags: ["research", "web", "synthesis"], color: "#60a5fa",
    desc: "Autonomous multi-source research agent — searches, synthesizes, and writes comprehensive reports",
    systemPrompt: "You are an autonomous research agent. For any topic: (1) Break it into 5-7 research questions, (2) Synthesize information from multiple angles, (3) Identify gaps and contradictions, (4) Write a structured report with key findings, evidence, and recommendations. Cite sources and show your reasoning." },
  { id: "code-reviewer", name: "Code Reviewer Pro", category: "Code", icon: "🔍", tags: ["review", "security", "quality"], color: "#10b981",
    desc: "Expert code review with security audit, performance analysis, and refactoring suggestions",
    systemPrompt: "You are a senior staff engineer doing code review. For every submission: (1) Security vulnerabilities (OWASP, injection, auth flaws), (2) Performance issues (complexity, memory leaks, N+1 queries), (3) Code quality (SOLID, DRY, readability), (4) Test coverage gaps, (5) Specific refactoring suggestions with code examples. Be thorough and specific." },
  { id: "sql-agent", name: "SQL Intelligence", category: "Tools", icon: "🗄️", tags: ["SQL", "database", "query"], color: "#fbbf24",
    desc: "Natural language to SQL, query optimizer, schema designer, and performance analyzer",
    systemPrompt: "You are a database expert. Convert natural language to optimized SQL, explain query plans, design efficient schemas, identify N+1 problems, suggest indexes, and optimize slow queries. Always provide both the SQL and a plain English explanation." },
  { id: "threat-hunter", name: "Threat Hunter", category: "Security", icon: "🎯", tags: ["OSINT", "threat", "hunting"], color: "#e21227",
    desc: "Proactive threat hunting — IOC analysis, TTP mapping, MITRE ATT&CK correlation",
    systemPrompt: "You are a threat hunting expert. For any IOC or suspicious activity: map to MITRE ATT&CK framework, identify related TTPs, suggest detection rules (Sigma/Yara), recommend threat intelligence sources, and provide hunt hypotheses. Think like an adversary." },
  { id: "api-designer", name: "API Designer", category: "Code", icon: "⚡", tags: ["API", "REST", "OpenAPI"], color: "#a78bfa",
    desc: "Design REST/GraphQL APIs with OpenAPI spec, authentication patterns, rate limiting, and docs",
    systemPrompt: "You are a senior API architect. Design RESTful and GraphQL APIs with: proper resource modeling, HTTP status codes, authentication (JWT/OAuth2), rate limiting strategies, versioning, error handling, and complete OpenAPI 3.0 specs. Follow API design best practices." },
  { id: "data-scientist", name: "Data Scientist AI", category: "Research", icon: "📊", tags: ["data", "ML", "analysis"], color: "#f97316",
    desc: "Statistical analysis, ML model selection, feature engineering, and visualization recommendations",
    systemPrompt: "You are a senior data scientist. For any dataset or problem: recommend the right ML algorithm with reasoning, suggest feature engineering steps, identify data quality issues, recommend statistical tests, explain model evaluation metrics, and provide Python/R code snippets." },
  { id: "devops-agent", name: "DevOps Agent", category: "Tools", icon: "🔧", tags: ["CI/CD", "Docker", "K8s"], color: "#00e5cc",
    desc: "Infrastructure automation, CI/CD pipelines, Docker/K8s configs, and SRE practices",
    systemPrompt: "You are a senior DevOps/SRE engineer. Help with: Dockerfile optimization, Kubernetes manifests, CI/CD pipeline design (GitHub Actions, GitLab CI), monitoring setup (Prometheus/Grafana), incident response runbooks, and infrastructure-as-code (Terraform, Pulumi)." },
  { id: "rag-builder", name: "RAG Architect", category: "RAG", icon: "🧩", tags: ["RAG", "embeddings", "vector"], color: "#ec4899",
    desc: "Design RAG systems — chunking strategies, embedding models, retrieval methods, reranking",
    systemPrompt: "You are a RAG systems architect. For any knowledge retrieval problem: recommend chunking strategies (semantic vs fixed), embedding models (text-embedding-3-large vs ada), vector databases (Pinecone, Weaviate, ChromaDB), retrieval methods (dense, sparse, hybrid), reranking approaches, and evaluation metrics (RAGAS)." },
  { id: "security-analyzer", name: "CVE Analyzer", category: "Security", icon: "🛡️", tags: ["CVE", "CVSS", "patch"], color: "#ff4d4d",
    desc: "CVE analysis, CVSS scoring, exploit chain mapping, and remediation guidance",
    systemPrompt: "You are a vulnerability management expert. For any CVE or security finding: explain the vulnerability mechanism, calculate CVSS score with reasoning, map potential exploit chains, identify affected components, and provide specific remediation steps with validation tests." },
  { id: "doc-writer", name: "Docs Writer", category: "Productivity", icon: "📝", tags: ["docs", "technical writing"], color: "#34d399",
    desc: "Technical documentation, README files, API docs, architecture decision records",
    systemPrompt: "You are a technical writer. Create clear, comprehensive documentation: README files with setup/usage/examples, API reference docs, architecture decision records (ADRs), runbooks, onboarding guides. Write for your audience — beginner-friendly or expert-level as needed." },
  { id: "prompt-optimizer", name: "Prompt Optimizer", category: "Tools", icon: "✨", tags: ["prompt", "optimization", "LLM"], color: "#fbbf24",
    desc: "Analyze and optimize prompts for any LLM — chain-of-thought, few-shot, structured outputs",
    systemPrompt: "You are a prompt engineering expert. Analyze prompts and improve them with: chain-of-thought reasoning, few-shot examples, role definition, output format specification, constraint setting, and system/user/assistant separation. Explain why each change improves performance." },
  { id: "pentest-assistant", name: "Pentest Assistant", category: "Security", icon: "💀", tags: ["pentest", "exploit", "red team"], color: "#e21227",
    desc: "Penetration testing methodology, exploit development, and red team operation planning",
    systemPrompt: "You are an expert penetration tester (authorized engagements only). For any target/scope: design the engagement methodology, identify attack vectors, suggest exploitation techniques, develop post-exploitation strategies, and write detailed findings with CVSS scores and remediation. Follow responsible disclosure." },
];

export function AwesomeLLMModal({ open, onOpenChange }: AwesomeLLMModalProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const { dispatch } = useStore();
  const { toast } = useToast();

  function launch(app: App) {
    dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: app.systemPrompt } });
    toast({ description: `${app.icon} ${app.name} injected — start chatting!` });
    onOpenChange(false);
  }

  const filtered = LLM_APPS.filter((a) => {
    const matchCat = cat === "All" || a.category === cat;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()) || a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 0 60px rgba(251,191,36,0.08)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.4)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#fbbf24" }}>AWESOME LLM APPS</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>{LLM_APPS.length} AI applications — launch any directly into chat</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#444" }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search apps…"
                  className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: "#ccc" }} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                    style={{ background: cat === c ? "rgba(251,191,36,0.15)" : "transparent", borderColor: cat === c ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.06)", color: cat === c ? "#fbbf24" : "#444" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((app) => (
                  <motion.div key={app.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3.5 flex flex-col gap-2"
                    style={{ background: `${app.color}08`, border: `1px solid ${app.color}20` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{app.icon}</span>
                        <div>
                          <div className="text-[11px] font-bold" style={{ color: app.color }}>{app.name}</div>
                          <div className="text-[9px] font-mono" style={{ color: "#444" }}>{app.category}</div>
                        </div>
                      </div>
                      <button onClick={() => launch(app)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border flex-shrink-0"
                        style={{ background: `${app.color}15`, borderColor: `${app.color}40`, color: app.color }}>
                        <Play className="w-2.5 h-2.5" /> Launch
                      </button>
                    </div>
                    <div className="text-[10px] leading-relaxed" style={{ color: "#555" }}>{app.desc}</div>
                    <div className="flex gap-1 flex-wrap">
                      {app.tags.map((tag) => (
                        <span key={tag} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#333" }}>{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
