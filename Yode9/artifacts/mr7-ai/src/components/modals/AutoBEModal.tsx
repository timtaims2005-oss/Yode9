import { useState, useRef } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code2, Database, FileText, TestTube, Play, Download, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface AutoBEModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Phase = "idle" | "schema" | "api" | "tests" | "implementation" | "done";
type Framework = "fastapi" | "express" | "nestjs" | "gin" | "rails" | "laravel";
type DbType = "postgresql" | "mysql" | "mongodb" | "sqlite";

const FRAMEWORKS: { id: Framework; label: string; lang: string; color: string }[] = [
  { id: "fastapi",  label: "FastAPI",    lang: "Python",     color: "#10b981" },
  { id: "express",  label: "Express.js", lang: "TypeScript", color: "#f59e0b" },
  { id: "nestjs",   label: "NestJS",     lang: "TypeScript", color: "#e21227" },
  { id: "gin",      label: "Gin",        lang: "Go",         color: "#00e5ff" },
  { id: "rails",    label: "Rails",      lang: "Ruby",       color: "#ff4d4d" },
  { id: "laravel",  label: "Laravel",    lang: "PHP",        color: "#a78bfa" },
];

const DB_TYPES: { id: DbType; label: string }[] = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql",      label: "MySQL"      },
  { id: "mongodb",    label: "MongoDB"    },
  { id: "sqlite",     label: "SQLite"     },
];

type Output = { phase: Phase; content: string };

const PHASE_LABELS: Record<Phase, string> = {
  idle: "", schema: "DATABASE SCHEMA", api: "API DOCS",
  tests: "TEST COVERAGE", implementation: "IMPLEMENTATION", done: "COMPLETE",
};

const EXAMPLES = [
  "A task management SaaS with user auth, projects, tasks, comments, and file attachments",
  "An e-commerce backend with products, inventory, orders, payments, and shipping tracking",
  "A real-time chat application with rooms, messages, users, reactions, and read receipts",
  "A blog platform with posts, categories, tags, authors, comments, and SEO metadata",
];

const PHASE_ORDER: Phase[] = ["schema", "api", "tests", "implementation"];

export function AutoBEModal({ open, onOpenChange }: AutoBEModalProps) {
  const { toast } = useToast();
  const [requirement, setRequirement] = useState("");
  const [framework, setFramework] = useState<Framework>("fastapi");
  const [db, setDb] = useState<DbType>("postgresql");
  const [phase, setPhase] = useState<Phase>("idle");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [tab, setTab] = useState<Phase>("schema");
  const [fwOpen, setFwOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fw = FRAMEWORKS.find(f => f.id === framework)!;

  const PROMPTS: Record<Phase, string> = {
    idle: "", done: "",
    schema: `You are AutoBE, an AI backend builder (prototype to production). Given: "${requirement}". Framework: ${fw.label} (${fw.lang}), Database: ${db}.\n\nGenerate a complete DATABASE SCHEMA:\n1. All tables/collections with columns, types, constraints\n2. Relationships and foreign keys\n3. Performance indexes\n4. Migration SQL or ORM model code\n\nBe specific and production-ready.`,
    api: `You are AutoBE. Given: "${requirement}" with ${fw.label}/${db}.\n\nGenerate complete REST API DOCUMENTATION:\n1. All endpoints: HTTP method, path, request/response schemas\n2. Authentication and authorization requirements\n3. Error codes and messages\n4. Rate limiting recommendations\n5. Sample OpenAPI 3.0 YAML for key endpoints`,
    tests: `You are AutoBE. Given: "${requirement}" with ${fw.label}/${db}.\n\nGenerate TEST COVERAGE PLAN:\n1. Unit tests for each service layer\n2. Integration tests for critical user flows\n3. E2E test scenarios\n4. Edge cases and failure scenarios\n5. Sample test code in ${fw.lang} (>80% coverage target)`,
    implementation: `You are AutoBE. Given: "${requirement}" with ${fw.label}/${db}.\n\nGenerate IMPLEMENTATION:\n1. Project file structure\n2. Core business logic (key services)\n3. Middleware stack configuration\n4. Environment variables (.env.example)\n5. README with setup and run instructions\n\nProvide clean, production-ready ${fw.lang} code.`,
  };

  async function generate() {
    if (!requirement.trim() || phase !== "idle") return;
    setOutputs([]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const collected: Output[] = [];

    for (const p of PHASE_ORDER) {
      if (ctrl.signal.aborted) break;
      setPhase(p);
      setTab(p);
      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: PROMPTS[p] }], model: "gpt-5.4" }),
          signal: ctrl.signal,
        });
        const content = await readChatText(r);
        collected.push({ phase: p, content });
        setOutputs([...collected]);
      } catch (e: any) {
        if (e.name === "AbortError") break;
        collected.push({ phase: p, content: "Error generating content." });
        setOutputs([...collected]);
      }
    }

    if (!ctrl.signal.aborted) {
      setPhase("done");
      const text = collected.map(o => `## ${PHASE_LABELS[o.phase]}\n\n${o.content}`).join("\n\n---\n\n");
      pipeline.push({ source: "AutoBE", sourceColor: "#3b82f6", label: requirement.slice(0, 50), content: text });
      toast({ description: "AutoBE generation complete" });
    }
  }

  function stop() { abortRef.current?.abort(); setPhase("idle"); }
  function reset() { abortRef.current?.abort(); setPhase("idle"); setOutputs([]); setRequirement(""); }

  const currentOutput = outputs.find(o => o.phase === tab);
  const isDone = (p: Phase) => outputs.some(o => o.phase === p);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div className="relative w-full max-w-3xl rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "#0d0d0d", borderColor: "rgba(16,185,129,0.35)", maxHeight: "92vh" }}
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
            <Code2 size={20} color="#10b981" />
            <div>
              <div className="font-bold text-sm tracking-widest text-white">AUTO-BE</div>
              <div className="text-xs" style={{ color: "#666" }}>AI backend builder — natural language → schema + API docs + tests + code</div>
            </div>
            <button onClick={() => onOpenChange(false)} className="ml-auto p-1 rounded hover:bg-white/10"><X size={16} color="#666" /></button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-5 space-y-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#555" }}>DESCRIBE YOUR BACKEND (natural language)</label>
                <textarea value={requirement} onChange={e => setRequirement(e.target.value)} disabled={phase !== "idle"}
                  placeholder="E.g.: A SaaS with user authentication, projects, tasks, comments, file uploads, and email notifications"
                  rows={3} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} onClick={() => setRequirement(ex)} disabled={phase !== "idle"}
                      className="text-xs px-2 py-1 rounded border hover:bg-white/5 transition-all"
                      style={{ borderColor: "rgba(255,255,255,0.08)", color: "#555" }}>Example {i+1}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#555" }}>FRAMEWORK</label>
                  <div className="relative">
                    <button onClick={() => setFwOpen(v => !v)} disabled={phase !== "idle"}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: fw.color }} />
                        {fw.label} <span className="text-xs ml-1" style={{ color: "#555" }}>({fw.lang})</span>
                      </div>
                      <ChevronDown size={14} color="#555" />
                    </button>
                    <AnimatePresence>
                      {fwOpen && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 z-20 rounded border mt-1 overflow-hidden"
                          style={{ background: "#161616", borderColor: "rgba(255,255,255,0.1)" }}>
                          {FRAMEWORKS.map(f => (
                            <button key={f.id} onClick={() => { setFramework(f.id); setFwOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                              style={{ color: framework === f.id ? f.color : "#ccc" }}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                              {f.label}<span className="text-xs ml-auto" style={{ color: "#555" }}>{f.lang}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: "#555" }}>DATABASE</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DB_TYPES.map(d => (
                      <button key={d.id} onClick={() => setDb(d.id)} disabled={phase !== "idle"}
                        className="px-3 py-2 rounded-lg border text-xs font-bold transition-all"
                        style={{ background: db === d.id ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)", borderColor: db === d.id ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.08)", color: db === d.id ? "#10b981" : "#666" }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phase pipeline indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                {PHASE_ORDER.map((p, i) => {
                  const done = isDone(p);
                  const current = phase === p;
                  const icons: Record<string, typeof Code2> = { schema: Database, api: FileText, tests: TestTube, implementation: Code2 };
                  const Icon = icons[p] || Code2;
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
                        style={{ background: done ? "rgba(16,185,129,0.15)" : current ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", color: done ? "#10b981" : current ? "#fbbf24" : "#555" }}>
                        {current ? <Loader2 size={11} className="animate-spin" /> : done ? <CheckCircle2 size={11} /> : <Icon size={11} />}
                        {PHASE_LABELS[p]}
                      </div>
                      {i < PHASE_ORDER.length - 1 && <div className="w-4 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />}
                    </div>
                  );
                })}
                {phase === "done" && <span className="text-xs ml-2" style={{ color: "#10b981" }}>ALL DONE</span>}
              </div>

              <div className="flex gap-3">
                {phase === "idle" ? (
                  <button onClick={generate} disabled={!requirement.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
                    <Play size={14} /> GENERATE BACKEND
                  </button>
                ) : phase !== "done" ? (
                  <button onClick={stop} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm border"
                    style={{ borderColor: "#e21227", color: "#e21227" }}>STOP</button>
                ) : null}
                {outputs.length > 0 && (
                  <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border hover:bg-white/5"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>RESET</button>
                )}
              </div>
            </div>

            {outputs.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {PHASE_ORDER.map(p => {
                    const done = isDone(p);
                    const icons: Record<string, typeof Code2> = { schema: Database, api: FileText, tests: TestTube, implementation: Code2 };
                    const Icon = icons[p] || Code2;
                    return (
                      <button key={p} onClick={() => setTab(p)} disabled={!done}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-widest transition-colors disabled:opacity-30"
                        style={{ color: tab === p ? "#10b981" : "#555", borderBottom: tab === p ? "2px solid #10b981" : "2px solid transparent" }}>
                        <Icon size={11} />{PHASE_LABELS[p]}
                      </button>
                    );
                  })}
                  {phase === "done" && (
                    <button onClick={() => {
                      const text = outputs.map(o => `## ${PHASE_LABELS[o.phase]}\n\n${o.content}`).join("\n\n---\n\n");
                      pipeline.push({ source: "AutoBE", sourceColor: "#3b82f6", label: requirement.slice(0, 50), content: text });
                      toast({ description: "Exported to pipeline" });
                    }} className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 border-transparent hover:bg-white/5" style={{ color: "#10b981" }}>
                      <Download size={11} /> EXPORT
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {currentOutput ? (
                    <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ color: "#ccc" }}>{currentOutput.content}</pre>
                  ) : (
                    <div className="flex items-center justify-center h-32" style={{ color: "#444" }}>
                      {phase === tab ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /><span>Generating {PHASE_LABELS[tab]}…</span></div> : <span>Waiting…</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {outputs.length === 0 && phase === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ color: "#444" }}>
                <Code2 size={40} className="mb-4" />
                <div className="text-sm text-center">Describe your backend requirements in natural language<br /><span style={{ color: "#333" }}>AutoBE generates schema · API docs · tests · implementation code</span></div>
                <div className="mt-4 text-xs" style={{ color: "#333" }}>Based on the AutoBE open-source project by wrtnlabs</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
