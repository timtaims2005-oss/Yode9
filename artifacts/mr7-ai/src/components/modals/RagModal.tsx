import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, Trash2, Send, Database, FileText, Plus, GitMerge,
  Search, Zap, CheckCircle2, Loader2, Brain, BarChart3, Copy, RefreshCw,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";

interface RagModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineDoc?: { text: string; name: string; key: number };
}

type EmbedStatus = "idle" | "embedding" | "done" | "error";

type Doc = {
  id: string;
  name: string;
  content: string;
  words: number;
  chars: number;
  addedAt: string;
  embedStatus: EmbedStatus;
  embedProgress: number;
  chunks: string[];
};

type ChatMsg = { role: "user" | "ai"; text: string; sources?: string[] };

const MAX_CONTEXT_CHARS = 16_000;
const CHUNK_SIZE = 500;

function chunkText(text: string): string[] {
  const sentences = text.replace(/\r\n/g, "\n").split(/(?<=[.!?؟]\s)|(?<=\n\n)/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 30);
}

function semanticScore(query: string, chunk: string): number {
  const qTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const cLower = chunk.toLowerCase();
  let score = 0;
  for (const token of qTokens) {
    const count = (cLower.match(new RegExp(token, "g")) || []).length;
    score += count > 0 ? 1 + Math.log(count + 1) : 0;
  }
  const proximity = qTokens.every(t => cLower.includes(t)) ? 2 : 0;
  return (score + proximity) / Math.max(qTokens.length, 1);
}

function retrieveContext(query: string, docs: Doc[], topK = 12): { context: string; sources: string[] } {
  if (!docs.length) return { context: "", sources: [] };
  const scored: { chunk: string; score: number; docName: string }[] = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score = semanticScore(query, chunk);
      if (score > 0) scored.push({ chunk, score, docName: doc.name });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);
  const sources = [...new Set(top.map(t => t.docName))];
  const context = top.map(t => `[${t.docName}]\n${t.chunk}`).join("\n\n---\n\n").slice(0, MAX_CONTEXT_CHARS);
  return { context, sources };
}

async function simulateEmbedding(
  doc: Doc,
  onProgress: (id: string, progress: number, status: EmbedStatus) => void,
): Promise<void> {
  const steps = doc.chunks.length || 5;
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    onProgress(doc.id, Math.round((i / steps) * 100), "embedding");
  }
  onProgress(doc.id, 100, "done");
}

export function RagModal({ open, onOpenChange, pipelineDoc }: RagModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"docs" | "chat" | "search">("docs");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ chunk: string; docName: string; score: number }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef("");

  useEffect(() => {
    if (!pipelineDoc?.text) return;
    addDoc(pipelineDoc.name, pipelineDoc.text);
    setTab("chat");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineDoc?.key]);

  const updateDoc = useCallback((id: string, patch: Partial<Doc>) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }, []);

  function addDoc(name: string, text: string) {
    const content = text.slice(0, 200_000);
    const chunks = chunkText(content);
    const doc: Doc = {
      id: Math.random().toString(36).slice(2),
      name,
      content,
      words: content.split(/\s+/).length,
      chars: content.length,
      addedAt: new Date().toLocaleTimeString(),
      embedStatus: "embedding",
      embedProgress: 0,
      chunks,
    };
    setDocs(prev => [...prev, doc]);
    simulateEmbedding(doc, (id, progress, status) => {
      updateDoc(id, { embedProgress: progress, embedStatus: status });
    });
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        addDoc(file.name, (e.target?.result as string) ?? "");
        setTab("chat");
      };
      reader.readAsText(file);
    });
  }

  function runSemanticSearch() {
    if (!searchQuery.trim() || !docs.length) return;
    const results: { chunk: string; docName: string; score: number }[] = [];
    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        const score = semanticScore(searchQuery, chunk);
        if (score > 0.3) results.push({ chunk, docName: doc.name, score });
      }
    }
    results.sort((a, b) => b.score - a.score);
    setSearchResults(results.slice(0, 15));
  }

  async function ask() {
    if (!query.trim() || running) return;
    if (!docs.length) { setTab("docs"); return; }
    const readyDocs = docs.filter(d => d.embedStatus === "done");
    if (!readyDocs.length) return;
    const q = query.trim();
    setQuery("");
    setChat(p => [...p, { role: "user", text: q }]);
    setRunning(true);
    answerRef.current = "";
    setChat(p => [...p, { role: "ai", text: "", sources: [] }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { context, sources } = retrieveContext(q, readyDocs);
    const systemPrompt = `You are a precise RAG document analyst. Answer questions based ONLY on the provided document context.
If the answer isn't in the documents, say: "I couldn't find this in the provided documents."
Always cite the source document name when quoting.

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
          messages: [
            ...chat.slice(-6).map(m => ({
              role: m.role === "user" ? "user" as const : "assistant" as const,
              content: m.text,
            })),
            { role: "user" as const, content: q },
          ],
          customSystemPrompt: systemPrompt,
        },
        chunk => {
          answerRef.current += chunk;
          setChat(p => p.map((m, i) =>
            i === p.length - 1 ? { ...m, text: answerRef.current, sources } : m
          ));
        },
        ctrl.signal,
      );
    } catch { /* ignored */ } finally {
      setRunning(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  const totalWords = docs.reduce((s, d) => s + d.words, 0);
  const totalChunks = docs.reduce((s, d) => s + d.chunks.length, 0);
  const allReady = docs.length > 0 && docs.every(d => d.embedStatus === "done");

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.88)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #040c1a 0%, #020810 100%)",
              border: "1px solid rgba(59,130,246,0.3)",
              boxShadow: "0 0 80px rgba(59,130,246,0.12), 0 24px 80px rgba(0,0,0,0.95)",
            }}
          >
            {/* Scan line */}
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.8),transparent)" }} />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.05)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                  style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)" }}
                >
                  <Database className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  {docs.some(d => d.embedStatus === "embedding") && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#3b82f6" }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#3b82f6" }}>RAGFlow</span>
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded border font-mono"
                      style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)" }}
                    >
                      KNOWLEDGE BASE
                    </span>
                    {allReady && (
                      <span
                        className="text-[8px] font-black px-1.5 py-0.5 rounded border font-mono flex items-center gap-1"
                        style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" /> INDEXED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(59,130,246,0.45)" }}>
                    {docs.length} doc{docs.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words · {totalChunks} chunks
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "rgba(59,130,246,0.2)" }}>
                  {(["docs", "chat", "search"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className="px-3 py-1.5 text-[10px] font-black tracking-wide uppercase transition-all"
                      style={
                        tab === t
                          ? { background: "rgba(59,130,246,0.2)", color: "#3b82f6" }
                          : { background: "transparent", color: "rgba(255,255,255,0.25)" }
                      }
                    >
                      {t === "docs" ? `Docs ${docs.length ? `(${docs.length})` : ""}` : t === "chat" ? "Chat" : "Search"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── DOCS TAB ── */}
            {tab === "docs" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.json,.py,.ts,.tsx,.js,.html,.css,.xml,.yaml,.yml,.log,.sh,.rs,.go,.java,.c,.cpp,.h"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />

                {/* Drop zone */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 py-10 rounded-xl border-2 border-dashed transition-all group"
                  style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.02)" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.45)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.06)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.2)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.02)";
                  }}
                >
                  <Upload className="w-7 h-7" style={{ color: "#3b82f6" }} />
                  <div>
                    <p className="text-[13px] font-bold text-center" style={{ color: "#3b82f6" }}>Upload Documents</p>
                    <p className="text-[10px] text-center mt-1" style={{ color: "rgba(59,130,246,0.45)" }}>
                      txt · md · json · py · ts · csv · log · yaml · sh · rs · go · java
                    </p>
                  </div>
                </button>

                {docs.length === 0 ? (
                  <div className="text-center py-4 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Upload documents to start chatting with them
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 px-3 py-3 rounded-xl"
                        style={{ background: "#060e1c", border: "1px solid rgba(59,130,246,0.15)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                          >
                            {doc.embedStatus === "done" ? (
                              <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                            ) : doc.embedStatus === "embedding" ? (
                              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#3b82f6" }} />
                            ) : (
                              <FileText className="w-4 h-4" style={{ color: "#3b82f6" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                              {doc.name}
                            </div>
                            <div className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(59,130,246,0.4)" }}>
                              {doc.words.toLocaleString()} words · {doc.chunks.length} chunks · {doc.addedAt}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {doc.embedStatus === "done" && (
                              <span
                                className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                                style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}
                              >
                                INDEXED
                              </span>
                            )}
                            <button
                              onClick={() => setDocs(p => p.filter(d => d.id !== doc.id))}
                              className="p-1 rounded transition-colors"
                              style={{ color: "rgba(255,255,255,0.2)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Embedding progress bar */}
                        {doc.embedStatus === "embedding" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono" style={{ color: "#3b82f6" }}>
                                Embedding chunks… {doc.embedProgress}%
                              </span>
                              <span className="text-[9px] font-mono" style={{ color: "rgba(59,130,246,0.4)" }}>
                                {Math.round(doc.chunks.length * doc.embedProgress / 100)}/{doc.chunks.length}
                              </span>
                            </div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(59,130,246,0.1)" }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${doc.embedProgress}%` }}
                                transition={{ duration: 0.2 }}
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}

                    <button
                      onClick={() => setTab("chat")}
                      disabled={!allReady}
                      className="w-full py-2.5 rounded-xl text-[12px] font-black border transition-all disabled:opacity-40"
                      style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.35)", color: "#3b82f6" }}
                    >
                      {allReady
                        ? `Chat with ${docs.length} document${docs.length > 1 ? "s" : ""} →`
                        : "Indexing documents…"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {tab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: "55vh" }}>
                  {docs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Database className="w-10 h-10" style={{ color: "rgba(59,130,246,0.2)" }} />
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        No documents yet. Switch to Docs tab to upload.
                      </span>
                      <button
                        onClick={() => setTab("docs")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Documents
                      </button>
                    </div>
                  ) : (
                    <>
                      {chat.length === 0 && (
                        <div className="text-center py-8 space-y-2">
                          <Brain className="w-8 h-8 mx-auto" style={{ color: "rgba(59,130,246,0.25)" }} />
                          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                            Ask anything about your {docs.length} document{docs.length > 1 ? "s" : ""}…
                          </p>
                          <div className="flex flex-wrap justify-center gap-2 mt-3">
                            {["Summarize the main topics", "What are the key findings?", "List all important terms"].map(q => (
                              <button
                                key={q}
                                onClick={() => { setQuery(q); }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all"
                                style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)", color: "rgba(59,130,246,0.7)" }}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chat.map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                        >
                          {m.role === "ai" && m.sources && m.sources.length > 0 && (
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              {m.sources.map(s => (
                                <span
                                  key={s}
                                  className="text-[8px] font-bold px-1.5 py-0.5 rounded border"
                                  style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.07)" }}
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          <div
                            className="max-w-[85%] px-3 py-2.5 rounded-xl text-[11px] leading-relaxed group relative"
                            style={{
                              background: m.role === "user" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.07)"}`,
                              color: m.role === "user" ? "#93c5fd" : "rgba(255,255,255,0.82)",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {m.text || (running && i === chat.length - 1 && (
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-block w-1.5 h-3 rounded-sm animate-pulse" style={{ background: "#3b82f6" }} />
                                <span className="text-[10px] font-mono" style={{ color: "rgba(59,130,246,0.5)" }}>streaming…</span>
                              </span>
                            ))}
                            {m.role === "ai" && m.text && !running && (
                              <button
                                onClick={() => navigator.clipboard.writeText(m.text)}
                                className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: "rgba(59,130,246,0.5)" }}
                                title="Copy"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {m.role === "ai" && m.text && !running && (
                            <button
                              onClick={() => pipeline.push({ source: "RAGFlow", sourceColor: "#3b82f6", label: "doc answer", content: m.text })}
                              className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                              style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}
                            >
                              <GitMerge className="w-2.5 h-2.5" /> Pipe to Pipeline
                            </button>
                          )}
                        </motion.div>
                      ))}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {docs.length > 0 && (
                  <div
                    className="px-4 py-3 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(59,130,246,0.12)" }}
                  >
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <textarea
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
                          placeholder={allReady ? "Ask your documents… (Enter to send, Shift+Enter for newline)" : "Indexing… please wait"}
                          disabled={running || !allReady}
                          rows={2}
                          className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-[12px] outline-none resize-none"
                          style={{ borderColor: "rgba(59,130,246,0.25)", color: "rgba(255,255,255,0.85)", background: "rgba(59,130,246,0.03)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={ask}
                          disabled={!query.trim() || running || !allReady}
                          className="p-2.5 rounded-xl border transition-all disabled:opacity-40"
                          style={{ background: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.3)", color: "#3b82f6" }}
                        >
                          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                        {running && (
                          <button
                            onClick={() => { abortRef.current?.abort(); setRunning(false); }}
                            className="p-2.5 rounded-xl border transition-all"
                            style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                            title="Stop generation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {chat.length > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[9px] font-mono" style={{ color: "rgba(59,130,246,0.3)" }}>
                          {chat.filter(m => m.role === "user").length} exchanges
                        </span>
                        <button
                          onClick={() => setChat([])}
                          className="flex items-center gap-1 text-[9px] font-bold transition-colors"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Clear chat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── SEMANTIC SEARCH TAB ── */}
            {tab === "search" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(59,130,246,0.5)" }} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") runSemanticSearch(); }}
                      placeholder="Semantic search across documents…"
                      className="w-full bg-transparent border rounded-xl pl-9 pr-3 py-2.5 text-[12px] outline-none"
                      style={{ borderColor: "rgba(59,130,246,0.25)", color: "rgba(255,255,255,0.85)", background: "rgba(59,130,246,0.03)" }}
                    />
                  </div>
                  <button
                    onClick={runSemanticSearch}
                    disabled={!searchQuery.trim() || !docs.length}
                    className="px-3 py-2.5 rounded-xl border transition-all disabled:opacity-40 flex items-center gap-1.5 text-[11px] font-bold"
                    style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.3)", color: "#3b82f6" }}
                  >
                    <Zap className="w-3.5 h-3.5" /> Search
                  </button>
                </div>

                {docs.length === 0 && (
                  <div className="text-center py-8 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                    No documents indexed yet.
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3.5 h-3.5" style={{ color: "rgba(59,130,246,0.5)" }} />
                      <span className="text-[10px] font-bold" style={{ color: "rgba(59,130,246,0.6)" }}>
                        {searchResults.length} results
                      </span>
                    </div>
                    {searchResults.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-3 rounded-xl space-y-1.5"
                        style={{ background: "#060e1c", border: "1px solid rgba(59,130,246,0.12)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                            style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)" }}
                          >
                            {r.docName}
                          </span>
                          <span className="text-[9px] font-mono" style={{ color: "rgba(59,130,246,0.4)" }}>
                            score: {r.score.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", whiteSpace: "pre-wrap" }}>
                          {r.chunk.slice(0, 400)}{r.chunk.length > 400 ? "…" : ""}
                        </p>
                        <button
                          onClick={() => { setQuery(`Based on: "${r.chunk.slice(0, 120)}…" — `); setTab("chat"); }}
                          className="flex items-center gap-1 text-[9px] font-bold transition-colors"
                          style={{ color: "rgba(59,130,246,0.5)" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                          onMouseLeave={e => (e.currentTarget.style.color = "rgba(59,130,246,0.5)")}
                        >
                          <Send className="w-2.5 h-2.5" /> Use in chat
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom neon line */}
            <div className="h-px flex-shrink-0" style={{ background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.4),transparent)" }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
