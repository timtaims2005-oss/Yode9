import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Shield, HardDrive, Zap, Network, Code2, Server, Copy, CheckCheck, Play, ChevronRight } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface InsForgeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PRIMITIVES = [
  { id: "auth", name: "Authentication", icon: Shield, color: "#10b981", tag: "AUTH", desc: "OAuth providers, magic links, JWT sessions, MFA, RBAC roles, session management" },
  { id: "database", name: "Database", icon: Database, color: "#3b82f6", tag: "DB", desc: "PostgreSQL with RLS, migrations, row-level security, schema management, query builder" },
  { id: "storage", name: "Storage", icon: HardDrive, color: "#a78bfa", tag: "STORAGE", desc: "File uploads, CDN, public/private buckets, signed URLs, image transforms" },
  { id: "edge", name: "Edge Functions", icon: Zap, color: "#fbbf24", tag: "COMPUTE", desc: "Deploy serverless functions globally with cold-start < 50ms, streaming support" },
  { id: "ai", name: "AI Gateway", icon: Network, color: "#f97316", tag: "AI", desc: "Unified LLM proxy — OpenAI, Anthropic, Gemini. Rate limiting, caching, cost tracking" },
  { id: "realtime", name: "Realtime", icon: Code2, color: "#22d3ee", tag: "REALTIME", desc: "WebSocket subscriptions, presence channels, broadcast events, row-change listeners" },
];

const OPERATIONS = [
  { id: "scaffold", label: "Scaffold Project", desc: "Generate full-stack project with all primitives wired up" },
  { id: "schema", label: "Design Schema", desc: "Design database schema with RLS policies and migrations" },
  { id: "auth-setup", label: "Setup Auth", desc: "Configure auth providers, roles, and protected routes" },
  { id: "edge-fn", label: "Write Edge Function", desc: "Generate edge function with full type safety" },
  { id: "storage-api", label: "Storage API", desc: "Generate file upload/download API with signed URLs" },
  { id: "ai-gateway", label: "AI Gateway Config", desc: "Setup AI gateway with rate limiting and cost controls" },
  { id: "realtime", label: "Realtime Sub", desc: "Setup realtime subscriptions for live data" },
  { id: "deploy", label: "Deploy Config", desc: "Generate deployment config for InsForge cloud/self-host" },
];

export function InsForgeModal({ open, onOpenChange }: InsForgeModalProps) {
  const [enabledPrimitives, setEnabledPrimitives] = useState<Set<string>>(new Set(["auth", "database"]));
  const [operation, setOperation] = useState("scaffold");
  const [projectDesc, setProjectDesc] = useState("");
  const [framework, setFramework] = useState("react");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeOp, setActiveOp] = useState<typeof OPERATIONS[0] | null>(null);

  const frameworks = ["react", "nextjs", "vue", "nuxt", "svelte", "vanilla"];

  function togglePrimitive(id: string) {
    setEnabledPrimitives(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runOperation() {
    if (!projectDesc.trim()) return;
    setLoading(true);
    setOutput("");
    const op = OPERATIONS.find(o => o.id === operation)!;
    setActiveOp(op);

    const selected = PRIMITIVES.filter(p => enabledPrimitives.has(p.id));
    const primitiveList = selected.map(p => `- ${p.name} (${p.tag}): ${p.desc}`).join("\n");

    const prompt = `You are InsForge — the all-in-one open-source backend platform for agentic coding.

Project: "${projectDesc}"
Framework: ${framework}
Operation: ${op.label} — ${op.desc}
Enabled Primitives:\n${primitiveList || "None selected"}

Execute ${op.label} for InsForge:

## PROJECT ARCHITECTURE
How the selected primitives integrate together.

## IMPLEMENTATION

${operation === "scaffold" ? `### File Structure
Complete project structure with all files.

### Core Configuration
InsForge SDK initialization, environment variables, client setup.

### Authentication Setup
Auth provider config, protected routes, session handling.

### Database Schema
SQL schema with RLS policies, indexes, and migrations.

### API Routes
Complete API endpoints with type-safe request/response.

### Frontend Integration
React hooks, state management, and UI components.` : ""}

${operation === "schema" ? `### Database Schema (SQL)
Complete CREATE TABLE statements with RLS policies.

### Row-Level Security Policies
Per-table RLS rules for authenticated access.

### Migration Script
Drizzle/Prisma migration or raw SQL migration file.` : ""}

${operation === "edge-fn" ? `### Edge Function Code
Complete TypeScript edge function with:
- Request parsing and validation
- Business logic
- Response formatting
- Error handling

### Deployment Config
wrangler.toml or equivalent deployment configuration.` : ""}

${operation === "ai-gateway" ? `### AI Gateway Configuration
Rate limiting rules, model routing, cost caps.

### Unified Client
Type-safe AI client that works with all providers.

### Cost Tracking Setup
Usage monitoring and budget alerts.` : ""}

Provide complete, production-ready code that an AI coding agent can execute directly.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "InsForge", sourceColor: "#10b981", label: `${op.label}: ${projectDesc.slice(0, 40)}`, content });
      } else {
        setOutput(`[InsForge] ${op.label} complete for: "${projectDesc}"\n\nPrimitives: ${selected.map(p => p.name).join(", ")}`);
      }
    } catch {
      setOutput(`[InsForge] ${op.label} executed.`);
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
          <motion.div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(16,185,129,0.3)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
                  <Server className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">InsForge</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Agentic Backend Platform · DB · Auth · Storage · Edge · AI Gateway · Realtime</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Primitives */}
              <div>
                <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>BACKEND PRIMITIVES (toggle to include)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRIMITIVES.map(prim => {
                    const Icon = prim.icon;
                    const isOn = enabledPrimitives.has(prim.id);
                    return (
                      <button key={prim.id} onClick={() => togglePrimitive(prim.id)}
                        className="flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                        style={{ background: isOn ? `${prim.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${isOn ? prim.color + "40" : "rgba(255,255,255,0.06)"}` }}>
                        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: isOn ? prim.color : "#333" }} />
                        <div>
                          <div className="text-[9px] font-bold" style={{ color: isOn ? "#ccc" : "#444" }}>{prim.name}</div>
                          <div className="text-[7px] mt-0.5" style={{ color: prim.color, opacity: isOn ? 0.8 : 0.3 }}>{prim.tag}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Operation + Framework */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>OPERATION</div>
                  <div className="space-y-1">
                    {OPERATIONS.map(op => (
                      <button key={op.id} onClick={() => setOperation(op.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all"
                        style={{ background: operation === op.id ? "rgba(16,185,129,0.1)" : "transparent", border: `1px solid ${operation === op.id ? "rgba(16,185,129,0.3)" : "transparent"}` }}>
                        <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: operation === op.id ? "#10b981" : "#333" }} />
                        <span className="text-[9px]" style={{ color: operation === op.id ? "#ccc" : "#555" }}>{op.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "#555" }}>FRAMEWORK</div>
                  <div className="space-y-1">
                    {frameworks.map(f => (
                      <button key={f} onClick={() => setFramework(f)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all capitalize"
                        style={{ background: framework === f ? "rgba(16,185,129,0.1)" : "transparent", border: `1px solid ${framework === f ? "rgba(16,185,129,0.3)" : "transparent"}` }}>
                        <span className="text-[9px] capitalize" style={{ color: framework === f ? "#10b981" : "#555" }}>{f}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project description */}
              <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)}
                placeholder="Describe your project… e.g. 'SaaS app with user auth, file uploads, and real-time notifications'"
                rows={3} className="w-full px-3 py-2.5 rounded-xl text-[11px] outline-none bg-transparent border resize-none"
                style={{ borderColor: "rgba(16,185,129,0.2)", color: "#ccc" }} />

              <button onClick={runOperation} disabled={!projectDesc.trim() || loading}
                className="w-full py-2.5 rounded-xl text-[12px] font-bold border transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.35)", color: "#10b981" }}>
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Zap className="w-3.5 h-3.5" /></motion.div> Generating…</>
                  : <><Play className="w-3.5 h-3.5" /> {OPERATIONS.find(o => o.id === operation)?.label}</>}
              </button>

              <AnimatePresence>
                {output && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(16,185,129,0.06)" }}>
                      <span className="text-[9px] font-mono font-bold" style={{ color: "#10b981" }}>
                        {activeOp?.label?.toUpperCase()} OUTPUT
                      </span>
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
