import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, Send, Database, FileText, Plus, GitMerge } from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";

interface RagModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineDoc?: { text: string; name: string; key: number };
}

type Doc = { id: string; name: string; content: string; words: number; addedAt: string };
type ChatMsg = { role: "user" | "ai"; text: string };

const MAX_CONTEXT_CHARS = 12_000;

export function RagModal({ open, onOpenChange, pipelineDoc }: RagModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"docs" | "chat">("docs");
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef("");

  useEffect(() => {
    if (!pipelineDoc?.text) return;
    const doc: Doc = {
      id: Math.random().toString(36).slice(2),
      name: pipelineDoc.name,
      content: pipelineDoc.text.slice(0, 100_000),
      words: pipelineDoc.text.split(/\s+/).length,
      addedAt: new Date().toLocaleTimeString(),
    };
    setDocs((p) => [...p, doc]);
    setTab("chat");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineDoc?.key]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) ?? "";
        const doc: Doc = {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          content: content.slice(0, 100_000),
          words: content.split(/\s+/).length,
          addedAt: new Date().toLocaleTimeString(),
        };
        setDocs((p) => [...p, doc]);
        setTab("chat");
      };
      reader.readAsText(file);
    });
  }

  function simpleRetrieve(q: string, docList: Doc[]): string {
    if (!docList.length) return "";
    const qWords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const scored = docList.flatMap((doc) => {
      const lines = doc.content.split("\n").filter((l) => l.trim().length > 20);
      return lines.map((line) => {
        const score = qWords.reduce((s, w) => s + (line.toLowerCase().includes(w) ? 1 : 0), 0);
        return { line, score, docName: doc.name };
      });
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    const topContent = scored.filter((s) => s.score > 0).map((s) => `[${s.docName}]: ${s.line}`).join("\n") ||
      docList.map((d) => d.content.slice(0, 2000)).join("\n\n");

    return topContent.slice(0, MAX_CONTEXT_CHARS);
  }

  async function ask() {
    if (!query.trim() || running || !docs.length) return;
    const q = query.trim();
    setQuery("");
    setChat((p) => [...p, { role: "user", text: q }]);
    setRunning(true);
    answerRef.current = "";
    setChat((p) => [...p, { role: "ai", text: "" }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const context = simpleRetrieve(q, docs);
    const systemPrompt = `You are a precise document analyst AI. Answer questions based ONLY on the provided document context below.
If the answer is not in the documents, say so clearly. Quote relevant sections when helpful.

DOCUMENT CONTEXT:
---
${context}
---

Language: ${lang === "ar" ? "Arabic" : "English"}`;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: (lang as "en" | "ar") ?? "en",
          memory: [],
          messages: [...chat.slice(-4).map((m) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.text })), { role: "user" as const, content: q }],
          customSystemPrompt: systemPrompt,
        },
        (chunk) => {
          answerRef.current += chunk;
          setChat((p) => p.map((m, i) => i === p.length - 1 ? { ...m, text: answerRef.current } : m));
        },
        ctrl.signal,
      );
    } catch { /* ignored */ } finally {
      setRunning(false);
    }
  }

  if (!open) return null;

  const totalWords = docs.reduce((s, d) => s + d.words, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#040812", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 60px rgba(59,130,246,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)" }}>
                  <Database className="w-4.5 h-4.5" style={{ color: "#3b82f6", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#3b82f6" }}>RAGFlow</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)" }}>KNOWLEDGE BASE</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#1a2a5a" }}>{docs.length} doc{docs.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Tabs */}
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(59,130,246,0.2)" }}>
                  {(["docs", "chat"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="px-3 py-1 text-[11px] font-bold transition-all"
                      style={tab === t ? { background: "rgba(59,130,246,0.2)", color: "#3b82f6" } : { background: "transparent", color: "#444" }}
                    >
                      {t === "docs" ? "Docs" : "Chat"}
                      {t === "docs" && docs.length > 0 && <span className="ml-1 text-[9px] opacity-70">{docs.length}</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg" style={{ color: "#1a2a5a" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")} onMouseLeave={(e) => (e.currentTarget.style.color = "#1a2a5a")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Docs Tab */}
            {tab === "docs" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.py,.ts,.tsx,.js,.html,.css,.xml,.yaml,.yml,.log" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all"
                  style={{ borderColor: "rgba(59,130,246,0.2)", color: "#3b82f6", background: "rgba(59,130,246,0.03)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.07)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.2)"; (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.03)"; }}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-[12px] font-bold">Upload documents</span>
                  <span className="text-[10px]" style={{ color: "#1a2a5a" }}>txt · md · json · py · ts · csv · log · yaml</span>
                </button>

                {docs.length === 0 ? (
                  <div className="text-center py-4 text-[11px]" style={{ color: "#1a2a5a" }}>
                    Upload documents to start chatting with them
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "#0a0f1a", border: "1px solid rgba(59,130,246,0.15)" }}>
                        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#3b82f6" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold truncate" style={{ color: "#ccc" }}>{doc.name}</div>
                          <div className="text-[9px]" style={{ color: "#1a2a5a" }}>{doc.words.toLocaleString()} words · added {doc.addedAt}</div>
                        </div>
                        <button onClick={() => setDocs((p) => p.filter((d) => d.id !== doc.id))} className="p-1 rounded transition-colors" style={{ color: "#333" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")} onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setTab("chat")} className="w-full py-2 rounded-xl text-[12px] font-bold border transition-all" style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)", color: "#3b82f6" }}>
                      Chat with {docs.length} document{docs.length > 1 ? "s" : ""} →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {tab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "55vh" }}>
                  {docs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Database className="w-10 h-10" style={{ color: "rgba(59,130,246,0.2)" }} />
                      <span className="text-[11px]" style={{ color: "#1a2a5a" }}>No documents yet. Switch to Docs tab to upload.</span>
                      <button onClick={() => setTab("docs")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
                        <Plus className="w-3.5 h-3.5" /> Add Documents
                      </button>
                    </div>
                  ) : (
                    <>
                      {chat.length === 0 && (
                        <div className="text-center py-8 text-[11px]" style={{ color: "#1a2a5a" }}>
                          Ask anything about your {docs.length} document{docs.length > 1 ? "s" : ""}…
                        </div>
                      )}
                      {chat.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className="max-w-[80%] px-3 py-2 rounded-xl text-[11px] leading-relaxed"
                            style={{
                              background: m.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)"}`,
                              color: m.role === "user" ? "#93c5fd" : "#ccc",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {m.text || (running && i === chat.length - 1 && <span className="inline-block w-1.5 h-3 rounded-sm animate-pulse" style={{ background: "#3b82f6" }} />)}
                          </div>
                          {m.role === "ai" && m.text && !running && (
                            <button
                              onClick={() => pipeline.push({ source: "RAGFlow", sourceColor: "#3b82f6", label: "doc answer", content: m.text })}
                              className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                              style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                            >
                              <GitMerge className="w-2.5 h-2.5" /> Pipe
                            </button>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>
                {docs.length > 0 && (
                  <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
                    <div className="flex gap-2">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                        placeholder="Ask your documents…"
                        disabled={running}
                        className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[12px] outline-none"
                        style={{ borderColor: "rgba(59,130,246,0.25)", color: "#ccc" }}
                      />
                      <button
                        onClick={ask}
                        disabled={!query.trim() || running}
                        className="p-2.5 rounded-xl border transition-all disabled:opacity-40"
                        style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#3b82f6" }}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
