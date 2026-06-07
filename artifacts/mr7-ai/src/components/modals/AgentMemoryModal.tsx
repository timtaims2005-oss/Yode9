import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Plus, Trash2, Search, Copy, CheckCheck, Database, Clock } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface AgentMemoryModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type MemoryEntry = {
  id: string;
  content: string;
  tags: string[];
  timestamp: number;
  source: string;
  recalled: number;
};

const STORAGE_KEY = "mr7-agent-memory-v1";

function loadMemories(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return [
    { id: "m1", content: "User prefers dark cybersecurity themes and red accent colors.", tags: ["preference", "ui"], timestamp: Date.now() - 86400000, source: "Chat", recalled: 3 },
    { id: "m2", content: "Project uses pnpm monorepo with React + Vite + Tailwind v4.", tags: ["tech", "stack"], timestamp: Date.now() - 43200000, source: "Context", recalled: 7 },
    { id: "m3", content: "Arabic is the primary communication language.", tags: ["language", "preference"], timestamp: Date.now() - 21600000, source: "Instruction", recalled: 12 },
  ];
}

function saveMemories(memories: MemoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
}

export function AgentMemoryModal({ open, onOpenChange }: AgentMemoryModalProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>(loadMemories);
  const [search, setSearch] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { saveMemories(memories); }, [memories]);

  function addMemory() {
    if (!newContent.trim()) return;
    const entry: MemoryEntry = {
      id: `m${Date.now()}`,
      content: newContent.trim(),
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      timestamp: Date.now(),
      source: "Manual",
      recalled: 0,
    };
    setMemories(prev => [entry, ...prev]);
    setNewContent(""); setNewTags(""); setShowAdd(false);
    pipeline.push({ source: "AgentMemory", sourceColor: "#fbbf24", label: "Memory Saved", content: entry.content });
  }

  function deleteMemory(id: string) {
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  function copyMemory(m: MemoryEntry) {
    navigator.clipboard.writeText(m.content);
    setCopied(m.id);
    setTimeout(() => setCopied(null), 2000);
  }

  function injectAll() {
    const context = memories.map(m => `[${m.tags.join(",")}] ${m.content}`).join("\n");
    pipeline.push({ source: "AgentMemory", sourceColor: "#fbbf24", label: "Full Memory Context", content: context });
  }

  const filtered = memories.filter(m =>
    !search || m.content.toLowerCase().includes(search.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(251,191,36,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(251,191,36,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  <Brain className="w-4 h-4" style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Agent Memory</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Persistent cross-session memory — no more re-explaining</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={injectAll} className="text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-all" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                  Inject All
                </button>
                <button onClick={() => setShowAdd(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ borderColor: "rgba(255,255,255,0.1)", color: "#888" }}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Database, label: "Memories", value: memories.length, color: "#fbbf24" },
                  { icon: Clock, label: "Latest", value: memories.length ? new Date(Math.max(...memories.map(m => m.timestamp))).toLocaleDateString() : "—", color: "#10b981" },
                  { icon: Brain, label: "Total Recalls", value: memories.reduce((s, m) => s + m.recalled, 0), color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-[15px] font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "#444" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Add form */}
              <AnimatePresence>
                {showAdd && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
                      <div className="text-[10px] font-bold font-mono" style={{ color: "#fbbf24" }}>NEW MEMORY</div>
                      <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                        placeholder="What should the AI remember across sessions?"
                        rows={2} className="w-full bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none resize-none"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }} />
                      <input value={newTags} onChange={e => setNewTags(e.target.value)}
                        placeholder="Tags (comma-separated): preference, tech, context…"
                        className="w-full bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none"
                        style={{ borderColor: "rgba(255,255,255,0.1)", color: "#ccc" }} />
                      <button onClick={addMemory} disabled={!newContent.trim()}
                        className="w-full py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40 transition-all"
                        style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.3)", color: "#fbbf24" }}>
                        Save Memory
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#444" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search memories…"
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-[11px] outline-none bg-transparent border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "#ccc" }} />
              </div>

              {/* Memory list */}
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-[11px]" style={{ color: "#333" }}>No memories found</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(m => (
                    <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] flex-1" style={{ color: "#bbb" }}>{m.content}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => copyMemory(m)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5">
                            {copied === m.id ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" style={{ color: "#444" }} />}
                          </button>
                          <button onClick={() => deleteMemory(m.id)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5">
                            <Trash2 className="w-3 h-3" style={{ color: "#444" }} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {m.tags.map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}>{t}</span>
                        ))}
                        <span className="text-[8px] ml-auto font-mono" style={{ color: "#333" }}>recalled {m.recalled}x · {m.source}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
