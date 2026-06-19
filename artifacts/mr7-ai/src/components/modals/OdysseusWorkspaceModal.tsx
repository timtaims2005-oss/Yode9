import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Plus, MessageSquare, Mail, Wrench, Calendar, BarChart2,
  BookOpen, Microscope, Image, Library, Brain, FileText, CheckSquare,
  Palette, Zap, Send, ChevronRight, Loader2, Copy, CheckCheck,
  Trash2, Star, Clock, AlertCircle, RefreshCw, Download, Upload,
  Cpu, Globe, Target, Layers, Sparkles, Menu, Bot, Hash,
  History, Settings, Eye, EyeOff, Terminal, Shield, Wifi,
  Code2, AlignLeft, ChevronDown, ChevronUp, Tag, Bell,
  LogIn, Lock, ToggleLeft, ToggleRight, Wand2, Database,
  FolderOpen, Bookmark, MoreHorizontal, ArrowRight, Play, Square
} from "lucide-react";
import { pipeline } from "@/lib/pipeline";

async function streamToState(prompt: string, onChunk: (chunk: string) => void): Promise<string> {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: true }),
  });
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] };
        const chunk = obj.content ?? obj.choices?.[0]?.delta?.content ?? "";
        if (chunk) { full += chunk; onChunk(full); }
      } catch { /* ignore */ }
    }
  }
  return full;
}

function pipelineEmit(content: string) {
  pipeline.push({ source: "OdysseusWorkspace", sourceColor: "#00e5cc", label: "Workspace", content });
}

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Section =
  | "search" | "chat" | "chats" | "email" | "tools" | "calendar"
  | "compare" | "cookbook" | "research" | "gallery" | "library"
  | "brain" | "notes" | "tasks" | "documents" | "theme";

const NAV_GROUPS = [
  {
    items: [
      { id: "search" as Section, icon: Search, label: "Search", color: "#94a3b8" },
      { id: "chat" as Section, icon: Plus, label: "New Chat", color: "#00e5cc" },
      { id: "chats" as Section, icon: MessageSquare, label: "Chats", color: "#64c8ff" },
    ]
  },
  {
    label: "WORKSPACE",
    items: [
      { id: "email" as Section, icon: Mail, label: "Email", color: "#3b82f6" },
      { id: "tools" as Section, icon: Wrench, label: "Tools", color: "#a78bfa" },
      { id: "calendar" as Section, icon: Calendar, label: "Calendar", color: "#f59e0b" },
    ]
  },
  {
    label: "AI TOOLS",
    items: [
      { id: "compare" as Section, icon: BarChart2, label: "Compare", color: "#ec4899" },
      { id: "cookbook" as Section, icon: Cpu, label: "Cookbook", color: "#10b981" },
      { id: "research" as Section, icon: Microscope, label: "Deep Research", color: "#6366f1" },
    ]
  },
  {
    label: "CONTENT",
    items: [
      { id: "documents" as Section, icon: FileText, label: "Documents", color: "#f97316" },
      { id: "gallery" as Section, icon: Image, label: "Gallery", color: "#fb923c" },
      { id: "library" as Section, icon: Library, label: "Library", color: "#64c8ff" },
      { id: "brain" as Section, icon: Brain, label: "Brain", color: "#e879f9" },
      { id: "notes" as Section, icon: AlignLeft, label: "Notes", color: "#84cc16" },
      { id: "tasks" as Section, icon: CheckSquare, label: "Tasks", color: "#fb923c" },
    ]
  },
  {
    items: [
      { id: "theme" as Section, icon: Palette, label: "Theme", color: "#f472b6" },
    ]
  }
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

const SECTION_COLOR: Record<Section, string> = {
  search: "#94a3b8", chat: "#00e5cc", chats: "#64c8ff", email: "#3b82f6",
  tools: "#a78bfa", calendar: "#f59e0b", compare: "#ec4899", cookbook: "#10b981",
  research: "#6366f1", gallery: "#f97316", library: "#64c8ff", brain: "#e879f9",
  notes: "#84cc16", tasks: "#fb923c", documents: "#f97316", theme: "#f472b6",
};

/* ─── Particle Canvas ──────────────────────────────────────────────────── */
function ParticleCanvas({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * 1200, y: Math.random() * 900,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, a: Math.random() * Math.PI * 2
    }));
    let raf = 0;
    const draw = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a += .008;
        if (p.x < 0 || p.x > c.width) p.vx *= -1;
        if (p.y < 0 || p.y > c.height) p.vy *= -1;
        const alpha = Math.floor(Math.abs(Math.sin(p.a)) * 88).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = color + alpha; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

/* ─── Search Section ───────────────────────────────────────────────────── */
function SearchSection() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ section: string; title: string; preview: string }[]>([]);
  const ALL_ITEMS = [
    { section: "Chat", title: "AI Conversation", preview: "Chat with Odysseus AI" },
    { section: "Research", title: "Deep Research Pipeline", preview: "Multi-phase web research" },
    { section: "Email", title: "Inbox Triage", preview: "AI email summaries" },
    { section: "Documents", title: "Markdown Editor", preview: "AI writing with export" },
    { section: "Brain", title: "Knowledge Synthesis", preview: "Deep topic analysis" },
    { section: "Compare", title: "Model Comparison", preview: "Blind model testing" },
    { section: "Cookbook", title: "LLM Deployment", preview: "Hardware-aware recommendations" },
    { section: "Tasks", title: "AI Task Planning", preview: "Priority matrix planning" },
    { section: "Gallery", title: "AI Image Vision", preview: "Image description & analysis" },
    { section: "Notes", title: "Smart Notes", preview: "AI-powered note editor" },
    { section: "Calendar", title: "Smart Calendar", preview: "Event scheduling" },
    { section: "Library", title: "Document Library", preview: "Saved reports & files" },
  ];
  const filtered = q ? ALL_ITEMS.filter(i => i.title.toLowerCase().includes(q.toLowerCase()) || i.section.toLowerCase().includes(q.toLowerCase())) : ALL_ITEMS;

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
        <Search size={15} className="text-gray-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search workspace…"
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none font-mono placeholder-gray-600" />
        {q && <button onClick={() => setQ("")}><X size={12} className="text-gray-500" /></button>}
      </div>
      <div className="text-xs text-gray-600 font-mono px-1">{filtered.length} results</div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filtered.map((r, i) => (
          <motion.div key={i} whileHover={{ x: 4 }} className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:opacity-80"
            style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}>{r.section}</span>
            <div>
              <div className="text-sm text-gray-200">{r.title}</div>
              <div className="text-xs text-gray-500">{r.preview}</div>
            </div>
            <ChevronRight size={12} className="text-gray-600 ml-auto" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Chat Section (with Agent Mode) ──────────────────────────────────── */
type ChatMsg = { role: "user" | "ai"; text: string; tool?: string };
type Conversation = { id: string; title: string; msgs: ChatMsg[]; ts: string };

function ChatSection({ color, onNewConversation }: { color: string; onNewConversation: (c: Conversation) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const [model, setModel] = useState("deepseek-v4");
  const [showTools, setShowTools] = useState(false);
  const [memory, setMemory] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const MODELS = ["deepseek-v4", "claude-3.5", "gpt-4o", "gemini-1.5", "mistral-7b"];
  const TOOLS_LIST = ["🌐 Web Search", "💻 Shell", "📁 Files", "🧠 Memory", "⚙️ Skills", "🔌 MCP"];
  const SKILLS = ["Summarize", "Translate", "Code Review", "Debug", "Explain", "Rewrite"];

  const send = useCallback(async (q?: string) => {
    const msg = q || input.trim();
    if (!msg || streaming) return;
    setInput(""); setStreaming(true); setDraft("");
    const newMsg: ChatMsg = { role: "user", text: msg };
    setMsgs(m => [...m, newMsg]);

    const systemPrompt = agentMode
      ? `You are Odysseus Agent — a powerful AI workspace assistant with access to tools (web search, shell, files, memory, skills, MCP). When appropriate, simulate tool use with [TOOL: web_search("query")] or [TOOL: shell("command")] notation. Be helpful, thorough, and show your reasoning.`
      : `You are Odysseus — a helpful AI workspace assistant. Model: ${model}. Provide clear, helpful responses.`;

    let full = "";
    await streamToState(`${systemPrompt}\n\nUser: ${msg}`, c => { full += c; setDraft(full); });
    const aiMsg: ChatMsg = { role: "ai", text: full };
    const updated = [...msgs, newMsg, aiMsg];
    setMsgs(updated);
    if (msg.length > 10) {
      setMemory(m => [...m.slice(-4), msg.slice(0, 60)]);
      if (msgs.length === 0) {
        onNewConversation({ id: Date.now().toString(), title: msg.slice(0, 40), msgs: updated, ts: "Just now" });
      }
    }
    pipelineEmit(full);
    setStreaming(false); setDraft("");
  }, [input, streaming, msgs, agentMode, model, onNewConversation]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, draft]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b text-xs" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <select value={model} onChange={e => setModel(e.target.value)}
          className="bg-transparent font-mono outline-none cursor-pointer text-gray-400 border rounded px-1 py-0.5"
          style={{ border: `1px solid ${color}33` }}>
          {MODELS.map(m => <option key={m} value={m} style={{ background: "#0a0a0f" }}>{m}</option>)}
        </select>
        <button onClick={() => setAgentMode(v => !v)}
          className="flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-all"
          style={{ background: agentMode ? `${color}22` : "transparent", border: `1px solid ${agentMode ? color + "55" : "rgba(255,255,255,0.08)"}`, color: agentMode ? color : "#6b7280" }}>
          {agentMode ? <ToggleRight size={12} /> : <ToggleLeft size={12} />} AGENT
        </button>
        <button onClick={() => setShowTools(v => !v)}
          className="flex items-center gap-1 px-2 py-0.5 rounded transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
          <Wrench size={11} /> Tools
        </button>
        {memory.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ border: "1px solid rgba(232,121,249,0.3)", background: "rgba(232,121,249,0.08)", color: "#e879f9" }}>
            <Brain size={10} /> Memory: {memory.length}
          </div>
        )}
        <button onClick={() => { setMsgs([]); setDraft(""); setMemory([]); }}
          className="ml-auto text-gray-600 hover:text-gray-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Tools strip */}
      <AnimatePresence>
        {showTools && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex gap-1 px-3 py-2 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {TOOLS_LIST.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-all"
                style={{ background: `${color}15`, border: `1px solid ${color}33`, color }}>
                {t}
              </span>
            ))}
            <span className="text-xs text-gray-600 mx-1">|</span>
            {SKILLS.map(s => (
              <button key={s} onClick={() => setInput(`/${s}: `)}
                className="text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                /{s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 opacity-70">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: color, boxShadow: `0 0 20px ${color}44` }}>
              <Bot size={26} style={{ color }} />
            </motion.div>
            <div className="text-center">
              <p className="text-base font-bold font-mono" style={{ color }}>Odysseus · {model}</p>
              <p className="text-xs text-gray-500 mt-1">{agentMode ? "Agent Mode Active — tools enabled" : "Chat Mode — press to switch to Agent"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {["Research a cybersecurity topic", "Write and edit a document", "Compare two AI models", "Plan my project tasks"].map(p => (
                <button key={p} onClick={() => send(p)}
                  className="text-xs p-2.5 rounded-lg text-left border transition-all hover:opacity-80"
                  style={{ border: `1px solid ${color}33`, background: `${color}08`, color: "#9ca3af" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "ai" && (
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                <Bot size={12} style={{ color }} />
              </div>
            )}
            <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm font-mono leading-relaxed whitespace-pre-wrap"
              style={m.role === "user"
                ? { background: `${color}1a`, border: `1px solid ${color}44`, color: "#e2e8f0" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {streaming && draft && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={10} style={{ color }} />
              </motion.div>
            </div>
            <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm font-mono leading-relaxed whitespace-pre-wrap"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}33`, color: "#cbd5e1" }}>
              {draft}<span className="animate-pulse ml-0.5" style={{ color }}>▋</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 rounded-xl border overflow-hidden" style={{ border: `1px solid ${color}33`, background: "rgba(0,0,0,0.3)" }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={agentMode ? "Give Odysseus an agent task…" : "Message Odysseus…"}
              disabled={streaming} rows={1}
              className="w-full bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 resize-none placeholder-gray-600 leading-relaxed" />
            <div className="flex items-center gap-2 px-3 py-1.5 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button className="text-gray-600 hover:text-gray-400 transition-colors"><Upload size={12} /></button>
              <button className="text-gray-600 hover:text-gray-400 transition-colors"><Globe size={12} /></button>
              <button className="text-gray-600 hover:text-gray-400 transition-colors"><Terminal size={12} /></button>
              <span className="ml-auto text-xs text-gray-600 font-mono">⏎ send</span>
            </div>
          </div>
          <button onClick={() => send()} disabled={streaming || !input.trim()}
            className="p-2.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-30 flex-shrink-0"
            style={{ background: color, color: "#000" }}>
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Chats History Section ────────────────────────────────────────────── */
function ChatsSection({ color, conversations }: { color: string; conversations: Conversation[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const ALL_CHATS: Conversation[] = [
    { id: "1", title: "Cybersecurity research session", msgs: [], ts: "Today 14:32" },
    { id: "2", title: "Comparing Claude vs GPT-4o", msgs: [], ts: "Today 11:15" },
    { id: "3", title: "Deep research on quantum computing", msgs: [], ts: "Yesterday 18:40" },
    { id: "4", title: "Email triage strategy", msgs: [], ts: "Yesterday 09:22" },
    { id: "5", title: "Project task planning — Q4", msgs: [], ts: "2 days ago" },
    ...conversations,
  ];

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <Search size={13} className="text-gray-500" />
        <input placeholder="Search chats…" className="flex-1 bg-transparent text-sm text-gray-400 outline-none font-mono" />
      </div>
      <div className="text-xs font-bold text-gray-500 px-1">{ALL_CHATS.length} CONVERSATIONS</div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {ALL_CHATS.map(c => (
          <motion.div key={c.id} whileHover={{ x: 3 }} onClick={() => setSelected(c.id)}
            className="flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
            style={{ border: selected === c.id ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.05)", background: selected === c.id ? `${color}0c` : "rgba(255,255,255,0.01)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
              <MessageSquare size={12} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 truncate">{c.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.ts}</div>
            </div>
            <button className="text-gray-700 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors">
              <Trash2 size={11} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Documents Section ─────────────────────────────────────────────────── */
type DocFormat = "markdown" | "html" | "csv" | "code";
type AIAction = "improve" | "expand" | "summarize" | "formalize" | "fix" | "bullets" | "continue" | "translate";

const TEMPLATES = [
  { name: "Research Report", content: "# Research Report\n\n## Executive Summary\n\n## Key Findings\n\n## Analysis\n\n## Conclusion\n" },
  { name: "Meeting Notes", content: "# Meeting Notes\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n## Discussion\n\n## Action Items\n- [ ] \n" },
  { name: "Technical Spec", content: "# Technical Specification\n\n## Overview\n\n## Architecture\n\n## API Endpoints\n\n## Data Models\n\n## Security\n" },
  { name: "Email Draft", content: "**To:** \n**Subject:** \n\nDear ,\n\n\n\nBest regards,\n" },
];

const AI_ACTIONS: { id: AIAction; label: string; icon: string }[] = [
  { id: "improve", label: "Improve", icon: "✨" },
  { id: "expand", label: "Expand", icon: "📖" },
  { id: "summarize", label: "Summarize", icon: "📋" },
  { id: "formalize", label: "Formalize", icon: "👔" },
  { id: "fix", label: "Fix Grammar", icon: "🔧" },
  { id: "bullets", label: "Bullets", icon: "•" },
  { id: "continue", label: "Continue", icon: "➤" },
  { id: "translate", label: "Translate", icon: "🌐" },
];

function DocumentsSection({ color }: { color: string }) {
  const [docs, setDocs] = useState([
    { id: "1", title: "Research Report — AI 2025", format: "markdown" as DocFormat, content: "# AI Trends 2025\n\n## Executive Summary\n\nArtificial intelligence continues to evolve rapidly...\n\n## Key Findings\n\n- Large language models are becoming more capable\n- Multi-agent systems are gaining adoption\n- Edge AI is emerging as a major trend\n\n## Conclusion\n\nThe AI landscape will continue to transform...", ts: "Today 14:32" },
    { id: "2", title: "Security Audit Notes", format: "markdown" as DocFormat, content: "# Security Audit Q4\n\n## Findings\n\n- Critical: SQL injection in /api/users\n- High: Missing CSRF tokens\n- Medium: Weak session management\n\n## Recommendations\n\nImmediate patching required...", ts: "Yesterday 09:15" },
  ]);
  const [selectedDoc, setSelectedDoc] = useState(docs[0].id);
  const [content, setContent] = useState(docs[0].content);
  const [format, setFormat] = useState<DocFormat>("markdown");
  const [aiRunning, setAiRunning] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const doc = docs.find(d => d.id === selectedDoc)!;

  useEffect(() => { setWordCount(content.trim().split(/\s+/).filter(Boolean).length); }, [content]);

  const runAI = async (action: AIAction) => {
    if (!content.trim() || aiRunning) return;
    setAiRunning(true);
    const PROMPTS: Record<AIAction, string> = {
      improve: `Improve the writing quality, clarity and impact of this text:\n\n${content}`,
      expand: `Expand this text with more detail, examples and context:\n\n${content}`,
      summarize: `Write a concise summary (3-5 sentences) of:\n\n${content}`,
      formalize: `Rewrite this in a formal, professional tone:\n\n${content}`,
      fix: `Fix all grammar, spelling and punctuation errors in:\n\n${content}`,
      bullets: `Convert this into a well-structured bullet-point list:\n\n${content}`,
      continue: `Continue writing naturally from where this ends:\n\n${content}`,
      translate: `Translate this to Arabic, maintaining the original format:\n\n${content}`,
    };
    let full = "";
    await streamToState(PROMPTS[action], c => { full += c; setContent(full); });
    setDocs(ds => ds.map(d => d.id === selectedDoc ? { ...d, content: full } : d));
    setAiRunning(false);
    pipelineEmit(full);
  };

  const newDoc = () => {
    const d = { id: Date.now().toString(), title: `Document ${docs.length + 1}`, format: "markdown" as DocFormat, content: "", ts: "Just now" };
    setDocs(ds => [...ds, d]); setSelectedDoc(d.id); setContent("");
  };

  const copyDoc = () => {
    navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const exportDoc = (fmt: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${doc.title}.${fmt}` });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full gap-0 min-h-0">
      {/* Doc list */}
      <div className="w-48 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={newDoc} className="w-full text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 font-bold transition-all hover:opacity-80"
            style={{ background: color, color: "#000" }}>
            <Plus size={11} /> New Doc
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {docs.map(d => (
            <div key={d.id} onClick={() => { setSelectedDoc(d.id); setContent(d.content); }}
              className="p-2 rounded-lg cursor-pointer border transition-all"
              style={{ border: selectedDoc === d.id ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.05)", background: selectedDoc === d.id ? `${color}0e` : "transparent" }}>
              <div className="text-xs font-semibold text-gray-300 truncate">{d.title}</div>
              <div className="text-xs text-gray-600 mt-0.5">{d.format} · {d.ts}</div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={() => setShowTemplates(v => !v)}
            className="w-full text-xs py-1 px-2 rounded flex items-center justify-center gap-1 transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}33`, color }}>
            <Layers size={10} /> Templates
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex gap-1">
            {(["markdown", "html", "csv", "code"] as DocFormat[]).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className="text-xs px-2 py-0.5 rounded transition-all font-mono"
                style={{ background: format === f ? `${color}22` : "transparent", border: `1px solid ${format === f ? color + "55" : "rgba(255,255,255,0.08)"}`, color: format === f ? color : "#6b7280" }}>
                {f}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          {AI_ACTIONS.map(a => (
            <button key={a.id} onClick={() => runAI(a.id)} disabled={aiRunning}
              className="text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-30"
              style={{ border: `1px solid ${color}33`, color, background: `${color}08` }}>
              {aiRunning ? <Loader2 size={9} className="animate-spin" /> : a.icon} {a.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-600 font-mono">{wordCount}w</span>
            <button onClick={copyDoc} className="text-gray-500 hover:text-gray-300 transition-colors">
              {copied ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
            <button onClick={() => exportDoc("md")} className="text-xs px-2 py-0.5 rounded transition-all hover:opacity-80"
              style={{ border: `1px solid ${color}33`, color }}>
              <Download size={11} />
            </button>
          </div>
        </div>

        {/* Templates panel */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b flex gap-2 px-3 py-2 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => { setContent(t.content); setShowTemplates(false); }}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded border transition-all hover:opacity-80"
                  style={{ border: `1px solid ${color}33`, background: `${color}08`, color }}>
                  {t.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <textarea value={content} onChange={e => { setContent(e.target.value); setDocs(ds => ds.map(d => d.id === selectedDoc ? { ...d, content: e.target.value } : d)); }}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none resize-none p-4 leading-relaxed"
          style={{ minHeight: 0 }}
          placeholder={`Start writing in ${format} format…\n\nTip: Select text and use the AI actions above to enhance it.`} />
      </div>
    </div>
  );
}

/* ─── Email Section ─────────────────────────────────────────────────────── */
const MOCK_EMAILS = [
  { id: 1, from: "security@github.com", subject: "Critical vulnerability in your repo", preview: "A critical security vulnerability has been detected in dependency...", time: "2m ago", priority: "CRITICAL", tag: "security", read: false },
  { id: 2, from: "ceo@company.com", subject: "Q4 Strategy Meeting — Action Required", preview: "Please review the attached deck before Thursday's board meeting...", time: "1h ago", priority: "ACTION", tag: "work", read: false },
  { id: 3, from: "newsletter@techcrunch.com", subject: "Top AI stories this week", preview: "GPT-5 rumors, Anthropic funding, OpenAI's new products...", time: "3h ago", priority: "INFO", tag: "news", read: true },
  { id: 4, from: "billing@aws.com", subject: "Invoice #INV-2024-1124 attached", preview: "Your monthly AWS invoice of $284.32 is now available...", time: "5h ago", priority: "LATER", tag: "billing", read: true },
  { id: 5, from: "noreply@linkedin.com", subject: "12 new connection requests", preview: "People you may know are waiting to connect with you...", time: "8h ago", priority: "SPAM", tag: "social", read: true },
  { id: 6, from: "ops@pagerduty.com", subject: "INCIDENT: API latency spike detected", preview: "Service degradation detected on api.production.com...", time: "12h ago", priority: "CRITICAL", tag: "ops", read: false },
];

const PC: Record<string, string> = { CRITICAL: "#ef4444", ACTION: "#f59e0b", INFO: "#3b82f6", LATER: "#6b7280", SPAM: "#374151" };

function EmailSection({ color }: { color: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [summary, setSummary] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState<"summary" | "reply" | null>(null);
  const [filter, setFilter] = useState("ALL");

  const filtered = filter === "ALL" ? MOCK_EMAILS : MOCK_EMAILS.filter(e => e.priority === filter);

  const analyse = async (id: number, type: "summary" | "reply") => {
    setSelected(id); setLoading(type);
    if (type === "summary") setSummary(""); else setReply("");
    const e = MOCK_EMAILS.find(x => x.id === id)!;
    const prompt = type === "summary"
      ? `Summarize this email for an executive in 3 concise bullet points:\nFrom: ${e.from}\nSubject: ${e.subject}\n${e.preview}`
      : `Draft a professional, concise reply to this email:\nFrom: ${e.from}\nSubject: ${e.subject}\n${e.preview}\n\nKeep it under 100 words and professional.`;
    let full = "";
    await streamToState(prompt, c => { full += c; type === "summary" ? setSummary(full) : setReply(full); });
    setLoading(null);
    pipelineEmit(full);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Email list */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex gap-1 p-2 border-b flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {["ALL", "CRITICAL", "ACTION", "INFO"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ background: filter === f ? `${color}22` : "transparent", border: `1px solid ${filter === f ? color + "55" : "rgba(255,255,255,0.08)"}`, color: filter === f ? color : "#6b7280" }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(e => (
            <motion.div key={e.id} whileHover={{ x: 2 }} onClick={() => { setSelected(e.id); setSummary(""); setReply(""); }}
              className="p-3 border-b cursor-pointer transition-all"
              style={{ borderColor: "rgba(255,255,255,0.04)", background: selected === e.id ? `${color}0a` : "transparent" }}>
              <div className="flex items-center gap-1.5 mb-1">
                {!e.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                <span className="text-xs px-1.5 rounded font-bold" style={{ background: PC[e.priority] + "33", color: PC[e.priority] }}>{e.priority}</span>
                <span className="text-xs px-1.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{e.tag}</span>
                <span className="text-xs text-gray-600 ml-auto">{e.time}</span>
              </div>
              <div className="text-xs font-semibold text-gray-200 truncate">{e.subject}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{e.from}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Email detail */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selected === null ? (
          <div className="flex items-center justify-center h-full opacity-30">
            <div className="text-center"><Mail size={36} className="mx-auto mb-2" style={{ color }} /><p className="text-sm font-mono" style={{ color }}>Select an email</p></div>
          </div>
        ) : (() => {
          const e = MOCK_EMAILS.find(x => x.id === selected)!;
          return (
            <div className="flex flex-col h-full p-4 gap-3 overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: PC[e.priority] + "33", color: PC[e.priority] }}>{e.priority}</span>
                  <span className="text-xs text-gray-500">{e.time}</span>
                </div>
                <div className="text-base font-bold text-gray-100">{e.subject}</div>
                <div className="text-xs text-gray-400 mt-1">From: {e.from}</div>
              </div>
              <div className="text-sm text-gray-300 leading-relaxed p-3 rounded-lg border" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                {e.preview} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </div>
              <div className="flex gap-2">
                <button onClick={() => analyse(selected, "summary")} disabled={loading !== null}
                  className="flex-1 text-xs py-2 rounded flex items-center justify-center gap-1 transition-all hover:opacity-80 font-bold"
                  style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>
                  {loading === "summary" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Summary
                </button>
                <button onClick={() => analyse(selected, "reply")} disabled={loading !== null}
                  className="flex-1 text-xs py-2 rounded flex items-center justify-center gap-1 transition-all hover:opacity-80 font-bold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }}>
                  {loading === "reply" ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Draft Reply
                </button>
              </div>
              {(summary || reply) && (
                <div className="p-3 rounded-lg border" style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
                  <div className="text-xs font-bold mb-2" style={{ color }}>{summary ? "⚡ AI SUMMARY" : "✉️ DRAFT REPLY"}</div>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{summary || reply}</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ─── Research Section ──────────────────────────────────────────────────── */
function ResearchSection({ color }: { color: string }) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep" | "max">("standard");
  const [phase, setPhase] = useState(-1);
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const PHASES = ["Query Decomposition", "Source Planning", "Parallel Search", "Document Reading", "Cross-Reference", "Gap Analysis", "Adversarial Audit", "Synthesis"];
  const DEPTHS = { quick: 3, standard: 5, deep: 7, max: 8 };
  const DEPTH_COLORS = { quick: "#10b981", standard: "#3b82f6", deep: "#a78bfa", max: "#00e5cc" };

  const run = async () => {
    if (!query.trim() || running) return;
    setRunning(true); setResult(""); setPhase(0);
    const numPhases = DEPTHS[depth];
    for (let i = 0; i < numPhases; i++) { setPhase(i); await new Promise(r => setTimeout(r, 500 + Math.random() * 300)); }
    let full = "";
    await streamToState(
      `You are Odysseus Deep Research. Conduct a ${depth} research report on: "${query}". Include: Executive Summary, Key Findings (5+ points with evidence), Supporting Sources, Counterarguments, Knowledge Gaps, Expert Analysis, and Actionable Conclusions. Be thorough and cite reasoning.`,
      c => setResult(c)
    ).then(r => { full = r; });
    setPhase(-1); setRunning(false);
    pipelineEmit(full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Microscope size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
            placeholder="Enter research topic…" disabled={running}
            className="w-full bg-transparent text-sm font-mono text-gray-200 outline-none pl-8 pr-3 py-2 rounded-lg border"
            style={{ border: `1px solid ${color}44` }} />
        </div>
        <button onClick={run} disabled={running || !query.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {running ? <Loader2 size={14} className="animate-spin" /> : "RESEARCH"}
        </button>
      </div>
      <div className="flex gap-2">
        {(["quick", "standard", "deep", "max"] as const).map(d => (
          <button key={d} onClick={() => setDepth(d)}
            className="flex-1 text-xs py-1.5 rounded-lg font-bold transition-all"
            style={{ background: depth === d ? `${DEPTH_COLORS[d]}22` : "transparent", border: `1px solid ${depth === d ? DEPTH_COLORS[d] + "66" : "rgba(255,255,255,0.08)"}`, color: depth === d ? DEPTH_COLORS[d] : "#6b7280" }}>
            {d.toUpperCase()}
          </button>
        ))}
      </div>
      {running && (
        <div className="grid grid-cols-4 gap-1.5">
          {PHASES.slice(0, DEPTHS[depth]).map((p, i) => (
            <motion.div key={p}
              animate={{ borderColor: i === phase ? color : i < phase ? "#10b981" : "rgba(255,255,255,0.08)" }}
              className="text-xs p-2 rounded-lg text-center border transition-all"
              style={{ background: i < phase ? "#10b98112" : i === phase ? `${color}18` : "transparent", color: i < phase ? "#10b981" : i === phase ? color : "#4b5563" }}>
              {i < phase ? "✓ " : i === phase ? "⟳ " : ""}{p.split(" ")[0]}
            </motion.div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto rounded-lg border p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}05` }}>
        {result || <span className="text-gray-600">Research results will appear here…</span>}
        {running && result && <span className="animate-pulse ml-0.5" style={{ color }}>▋</span>}
      </div>
    </div>
  );
}

/* ─── Compare Section ───────────────────────────────────────────────────── */
function CompareSection({ color }: { color: string }) {
  const [prompt, setPrompt] = useState("");
  const [modelA, setModelA] = useState("GPT-4o"); const [modelB, setModelB] = useState("Claude 3.5");
  const [resA, setResA] = useState(""); const [resB, setResB] = useState("");
  const [running, setRunning] = useState(false);
  const [voted, setVoted] = useState<"A" | "B" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const MODELS_OPT = ["GPT-4o", "Claude 3.5", "Gemini 1.5 Pro", "Mistral 7B", "DeepSeek V4", "Llama 3.1 70B"];

  const run = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true); setResA(""); setResB(""); setVoted(null); setRevealed(false);
    await Promise.all([
      streamToState(`You are ${modelA}. Respond to: "${prompt}". Give a thorough, helpful response in your natural style.`, c => setResA(p => p + c)),
      streamToState(`You are ${modelB}. Respond to: "${prompt}". Give a thorough, helpful response with a different perspective.`, c => setResB(p => p + c)),
    ]);
    setRunning(false);
    pipelineEmit(`Compare: ${prompt}`);
  };

  const SIDE_COLOR = { A: "#3b82f6", B: "#10b981" };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Enter prompt to compare models…" disabled={running}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded-lg border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={run} disabled={running || !prompt.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {running ? <Loader2 size={14} className="animate-spin" /> : "RUN"}
        </button>
      </div>
      <div className="flex gap-2 text-xs">
        {(["A", "B"] as const).map(side => (
          <div key={side} className="flex-1 flex items-center gap-2">
            <span className="font-bold" style={{ color: SIDE_COLOR[side] }}>Model {side}</span>
            <select value={side === "A" ? modelA : modelB}
              onChange={e => side === "A" ? setModelA(e.target.value) : setModelB(e.target.value)}
              className="flex-1 bg-transparent font-mono outline-none cursor-pointer px-1 py-0.5 rounded border text-gray-400"
              style={{ border: `1px solid ${SIDE_COLOR[side]}33` }}>
              {MODELS_OPT.map(m => <option key={m} value={m} style={{ background: "#0a0a0f" }}>{m}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {(["A", "B"] as const).map(side => {
          const res = side === "A" ? resA : resB;
          const sc = SIDE_COLOR[side];
          return (
            <div key={side} className="flex flex-col rounded-xl border overflow-hidden min-h-0"
              style={{ border: `1px solid ${sc}44`, boxShadow: voted === side ? `0 0 16px ${sc}33` : "none" }}>
              <div className="px-3 py-2 flex items-center justify-between text-xs font-bold flex-shrink-0"
                style={{ background: `${sc}18`, color: sc }}>
                <span>{revealed ? (side === "A" ? modelA : modelB) : `Model ${side}`}</span>
                {(resA && resB) && !voted && (
                  <button onClick={() => setVoted(side)}
                    className="px-2 py-0.5 rounded font-bold transition-all hover:opacity-80"
                    style={{ background: `${sc}33` }}>
                    Vote {side}
                  </button>
                )}
                {voted === side && <span className="text-yellow-400 flex items-center gap-1"><Star size={10} /> WINNER</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0">
                {res || <span className="text-gray-600">Awaiting response…</span>}
                {running && <span className="animate-pulse ml-0.5" style={{ color: sc }}>▋</span>}
              </div>
            </div>
          );
        })}
      </div>
      {voted && !revealed && (
        <button onClick={() => setRevealed(true)}
          className="text-xs py-2 rounded-lg font-bold transition-all hover:opacity-80"
          style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>
          Reveal Models
        </button>
      )}
    </div>
  );
}

/* ─── Cookbook Section ──────────────────────────────────────────────────── */
function CookbookSection({ color }: { color: string }) {
  const [profile, setProfile] = useState(0);
  const [advice, setAdvice] = useState(""); const [loading, setLoading] = useState(false);
  const PROFILES = [
    { name: "CPU Only", spec: "No GPU · 8GB RAM", icon: "💻", models: ["Llama 3.2 3B Q4", "Phi-3 Mini", "Gemma 2B", "TinyLlama"] },
    { name: "Mid GPU", spec: "8GB VRAM · 16GB RAM", icon: "🖥️", models: ["Llama 3.1 8B", "Mistral 7B", "CodeLlama 7B", "Phi-3 Medium"] },
    { name: "High-End", spec: "24GB VRAM · 32GB RAM", icon: "⚡", models: ["Llama 3.1 70B Q4", "Mixtral 8x7B", "Yi-34B", "Qwen 32B"] },
    { name: "Dual GPU", spec: "48GB+ VRAM · 64GB RAM", icon: "🔥", models: ["Llama 3.1 70B", "Mixtral 8x22B", "Falcon 180B", "Qwen 72B"] },
    { name: "Cloud API", spec: "No GPU needed", icon: "☁️", models: ["GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro", "DeepSeek V4"] },
  ];
  const P = PROFILES[profile];

  const getAdvice = async () => {
    setLoading(true); setAdvice("");
    let full = "";
    await streamToState(
      `You are an expert LLM deployment engineer. For this hardware profile: "${P.name} (${P.spec})", provide:
1. Top 3 recommended models with ollama install commands
2. Expected performance (tokens/sec, context length)
3. VRAM/RAM requirements per model
4. Optimization flags (num_ctx, num_gpu_layers, etc.)
5. Use-case recommendations
6. Quantization recommendations (Q4, Q5, Q8)

Be specific and technical. Include actual ollama commands.`,
      c => setAdvice(c)
    ).then(r => { full = r; });
    setLoading(false);
    pipelineEmit(full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="grid grid-cols-5 gap-2">
        {PROFILES.map((p, i) => (
          <button key={i} onClick={() => { setProfile(i); setAdvice(""); }}
            className="text-xs p-2.5 rounded-xl border text-center transition-all hover:opacity-80"
            style={{ border: i === profile ? `1px solid ${color}77` : "1px solid rgba(255,255,255,0.08)", background: i === profile ? `${color}18` : "rgba(255,255,255,0.02)", color: i === profile ? color : "#888" }}>
            <div className="text-xl mb-1.5">{p.icon}</div>
            <div className="font-bold">{p.name}</div>
            <div className="text-gray-600 mt-0.5 text-xs">{p.spec}</div>
          </button>
        ))}
      </div>
      <div className="p-3 rounded-xl border" style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
        <div className="text-xs font-bold mb-2" style={{ color }}>{P.icon} {P.name} · Recommended Models</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {P.models.map(m => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: `${color}1a`, border: `1px solid ${color}33`, color }}>
              <Cpu size={9} /> {m}
            </span>
          ))}
        </div>
        <button onClick={getAdvice} disabled={loading}
          className="text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:opacity-80 disabled:opacity-40 font-bold"
          style={{ background: color, color: "#000" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Get AI Deployment Guide
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}05` }}>
        {advice || <span className="text-gray-600">Select a hardware profile and generate your personalized deployment guide…</span>}
        {loading && <span className="animate-pulse ml-0.5" style={{ color }}>▋</span>}
      </div>
    </div>
  );
}

/* ─── Tasks Section ─────────────────────────────────────────────────────── */
function TasksSection({ color }: { color: string }) {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Review security audit report", priority: "CRITICAL", done: false, due: "Today", tag: "security" },
    { id: 2, text: "Set up deep research pipeline", priority: "HIGH", done: false, due: "Tomorrow", tag: "ai" },
    { id: 3, text: "Compare GPT-4o vs Claude 3.5", priority: "HIGH", done: true, due: "Done", tag: "research" },
    { id: 4, text: "Update project documentation", priority: "MEDIUM", done: false, due: "This week", tag: "docs" },
    { id: 5, text: "Clear inbox backlog", priority: "LOW", done: false, due: "This week", tag: "email" },
  ]);
  const [input, setInput] = useState("");
  const [planning, setPlanning] = useState(false);
  const [view, setView] = useState<"list" | "matrix">("list");
  const PC2: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#6b7280" };

  const addTask = () => {
    if (!input.trim()) return;
    setTasks(t => [...t, { id: Date.now(), text: input.trim(), priority: "MEDIUM", done: false, due: "No date", tag: "general" }]);
    setInput("");
  };

  const aiPlan = async () => {
    setPlanning(true);
    let full = "";
    await streamToState(
      `Generate 5 actionable, specific tasks for a cybersecurity professional. For each task, respond with this exact format: [PRIORITY] Task text | due: timeframe | tag: category\nPriority must be one of: CRITICAL, HIGH, MEDIUM, LOW`,
      () => { /* streaming not needed here */ }
    ).then(r => { full = r; });
    const newTasks = full.split("\n").filter(l => l.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/i)).slice(0, 5).map((l, i) => {
      const priority = (l.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/i)?.[1] || "MEDIUM").toUpperCase();
      const text = l.replace(/\[.*?\]\s*/, "").split("|")[0].trim();
      const due = l.match(/due:\s*([^|]+)/i)?.[1]?.trim() || "This week";
      const tag = l.match(/tag:\s*(\w+)/i)?.[1]?.trim() || "ai";
      return { id: Date.now() + i, text, priority, done: false, due, tag };
    });
    if (newTasks.length) setTasks(t => [...t, ...newTasks]);
    setPlanning(false);
    pipelineEmit(full);
  };

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a task…"
            className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded-lg border"
            style={{ border: `1px solid ${color}44` }} />
          <button onClick={addTask} className="px-3 py-2 rounded-lg" style={{ background: color, color: "#000" }}><Plus size={14} /></button>
        </div>
        <button onClick={aiPlan} disabled={planning}
          className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
          style={{ border: `1px solid ${color}55`, color }}>
          {planning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Plan
        </button>
        <div className="flex gap-1">
          {(["list", "matrix"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={{ background: view === v ? `${color}22` : "transparent", border: `1px solid ${view === v ? color + "44" : "rgba(255,255,255,0.08)"}`, color: view === v ? color : "#6b7280" }}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${(done / total) * 100}%` }} transition={{ type: "spring" }} />
        </div>
        <span className="text-xs font-mono text-gray-500">{done}/{total} done</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {view === "list" ? (
          <div className="space-y-1.5">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(pri => {
              const group = tasks.filter(t => t.priority === pri);
              if (!group.length) return null;
              return (
                <div key={pri}>
                  <div className="text-xs font-bold mb-1 px-1 flex items-center gap-2" style={{ color: PC2[pri] }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: PC2[pri] }} />
                    {pri} · {group.filter(t => !t.done).length} remaining
                  </div>
                  {group.map(t => (
                    <motion.div key={t.id} layout whileHover={{ x: 3 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border mb-1 cursor-pointer transition-all"
                      style={{ border: `1px solid ${PC2[t.priority]}22`, background: `${PC2[t.priority]}07`, opacity: t.done ? 0.5 : 1 }}
                      onClick={() => setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}>
                      <div className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                        style={{ border: `1px solid ${PC2[t.priority]}77`, background: t.done ? PC2[t.priority] : "transparent" }}>
                        {t.done && <CheckCheck size={10} color="#000" />}
                      </div>
                      <span className="text-sm text-gray-300 font-mono flex-1" style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                      <span className="text-xs px-1.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{t.tag}</span>
                      <span className="text-xs text-gray-600">{t.due}</span>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 h-full">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(pri => (
              <div key={pri} className="rounded-xl border p-3" style={{ border: `1px solid ${PC2[pri]}33`, background: `${PC2[pri]}07` }}>
                <div className="text-xs font-bold mb-2" style={{ color: PC2[pri] }}>{pri}</div>
                {tasks.filter(t => t.priority === pri).map(t => (
                  <div key={t.id} className="text-xs text-gray-400 py-1 border-b font-mono truncate" style={{ borderColor: "rgba(255,255,255,0.05)", opacity: t.done ? 0.4 : 1 }}>
                    {t.done ? "✓ " : "○ "}{t.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notes Section ─────────────────────────────────────────────────────── */
function NotesSection({ color }: { color: string }) {
  const [notes, setNotes] = useState([
    { id: 1, title: "Project Ideas", content: "- Build AI-powered pipeline\n- Integrate with calendar for smart scheduling\n- Voice-to-text for quick captures\n- Export to multiple formats", tag: "ideas", pinned: true, ts: "Today 09:24" },
    { id: 2, title: "Research Notes", content: "Key findings from deep research on cybersecurity trends 2025:\n\n- AI-powered attacks increasing 340% YoY\n- Zero-trust adoption at 67% of enterprises\n- Quantum threats emerging in 2026", tag: "research", pinned: false, ts: "Yesterday 15:30" },
    { id: 3, title: "AI Model Notes", content: "Claude 3.5 Sonnet — best for long-form writing\nGPT-4o — best for code and reasoning\nDeepSeek V4 — best cost/performance\nGemini 1.5 Pro — best for multimodal", tag: "ai", pinned: false, ts: "2 days ago" },
  ]);
  const [selected, setSelected] = useState(0);
  const [content, setContent] = useState(notes[0].content);
  const [saving, setSaving] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);

  const save = () => {
    setSaving(true);
    setNotes(n => n.map((nt, i) => i === selected ? { ...nt, content } : nt));
    setTimeout(() => setSaving(false), 600);
  };

  const aiEnhance = async () => {
    if (!content.trim() || aiEnhancing) return;
    setAiEnhancing(true);
    let full = "";
    await streamToState(`Enhance and organize these notes with better structure and clarity:\n\n${content}`, c => { full += c; setContent(full); });
    setAiEnhancing(false);
    pipelineEmit(full);
  };

  const newNote = () => {
    const n = { id: Date.now(), title: `Note ${notes.length + 1}`, content: "", tag: "general", pinned: false, ts: "Just now" };
    setNotes(ns => [...ns, n]); setSelected(notes.length); setContent("");
  };

  const TAG_COLORS: Record<string, string> = { ideas: "#a78bfa", research: "#10b981", ai: "#00e5cc", general: "#94a3b8" };

  return (
    <div className="flex h-full gap-0 min-h-0">
      <div className="w-52 flex-shrink-0 flex flex-col border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="p-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={newNote} className="w-full text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 font-bold"
            style={{ background: color, color: "#000" }}>
            <Plus size={11} /> New Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map((n, i) => (
            <div key={n.id} onClick={() => { setSelected(i); setContent(n.content); }}
              className="p-2.5 rounded-lg cursor-pointer border transition-all"
              style={{ border: selected === i ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.05)", background: selected === i ? `${color}0e` : "rgba(255,255,255,0.01)" }}>
              <div className="flex items-center gap-1 mb-1">
                {n.pinned && <Star size={9} className="text-yellow-400 flex-shrink-0" />}
                <span className="text-xs font-bold truncate" style={{ color: TAG_COLORS[n.tag] || "#94a3b8" }}>#{n.tag}</span>
              </div>
              <div className="text-xs font-semibold text-gray-300 truncate">{n.title}</div>
              <div className="text-xs text-gray-600 mt-0.5">{n.ts}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span className="text-sm font-bold text-gray-200 flex-1">{notes[selected]?.title}</span>
          <button onClick={aiEnhance} disabled={aiEnhancing} className="text-xs px-2 py-1 rounded flex items-center gap-1 transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}44`, color, background: `${color}0a` }}>
            {aiEnhancing ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} AI
          </button>
          <button onClick={save} className="text-xs px-3 py-1 rounded transition-all hover:opacity-80"
            style={{ background: saving ? "#10b98122" : `${color}22`, color: saving ? "#10b981" : color, border: `1px solid ${saving ? "#10b98144" : color + "44"}` }}>
            {saving ? "Saved ✓" : "Save"}
          </button>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none resize-none p-4 leading-relaxed"
          placeholder="Start writing…" />
      </div>
    </div>
  );
}

/* ─── Calendar Section ──────────────────────────────────────────────────── */
function CalendarSection({ color }: { color: string }) {
  const [view, setView] = useState<"month" | "week">("month");
  const today = new Date().getDate();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = Array.from({ length: 35 }, (_, i) => i - 3 + 1);
  const EVENTS = [
    { day: today, title: "Security Review", time: "09:00", color: "#ef4444", type: "meeting" },
    { day: today, title: "AI Model Testing", time: "14:00", color: "#3b82f6", type: "task" },
    { day: today + 1, title: "Team Standup", time: "10:00", color: "#10b981", type: "meeting" },
    { day: today + 2, title: "Deep Research Session", time: "13:00", color: "#6366f1", type: "ai" },
    { day: today + 5, title: "Project Deadline", time: "17:00", color: "#f59e0b", type: "deadline" },
  ];

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-2">
        <div className="text-sm font-bold text-gray-200">{new Date().toLocaleDateString("en", { month: "long", year: "numeric" })}</div>
        <div className="ml-auto flex gap-1">
          {(["month", "week"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{ background: view === v ? `${color}22` : "transparent", border: `1px solid ${view === v ? color + "44" : "rgba(255,255,255,0.08)"}`, color: view === v ? color : "#6b7280" }}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => <div key={d} className="text-xs text-center text-gray-600 font-bold py-1">{d}</div>)}
        {dates.map((date, i) => {
          const event = EVENTS.find(e => e.day === date);
          const isToday = date === today;
          return (
            <motion.div key={i} whileHover={{ scale: 1.05 }}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer relative transition-all"
              style={{
                background: isToday ? `${color}22` : "rgba(255,255,255,0.02)",
                border: isToday ? `1px solid ${color}66` : "1px solid transparent",
                color: date <= 0 || date > 31 ? "#222" : isToday ? color : "#9ca3af",
              }}>
              {date > 0 && date <= 31 && (
                <>
                  <span className="font-mono">{date}</span>
                  {event && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      <div className="w-1 h-1 rounded-full" style={{ background: event.color }} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        <div className="text-xs font-bold text-gray-500 px-1 mb-2">UPCOMING</div>
        {EVENTS.map((e, i) => (
          <motion.div key={i} whileHover={{ x: 3 }}
            className="flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer"
            style={{ border: `1px solid ${e.color}33`, background: `${e.color}08` }}>
            <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ background: e.color }} />
            <div>
              <div className="text-sm text-gray-200">{e.title}</div>
              <div className="text-xs text-gray-500">{e.day === today ? "Today" : `Day ${e.day}`} · {e.time}</div>
            </div>
            <span className="text-xs ml-auto px-1.5 rounded" style={{ background: `${e.color}22`, color: e.color }}>{e.type}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Gallery Section ───────────────────────────────────────────────────── */
function GallerySection({ color }: { color: string }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [desc, setDesc] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const STYLES = ["photorealistic", "cyberpunk", "anime", "oil painting", "sketch", "3D render"];
  const EXAMPLES = ["Futuristic cyberpunk city at night with neon rain", "Iron Man arc reactor in blue holographic light", "Abstract neural network made of golden light particles", "Quantum computer with glowing qubits in space"];

  const generate = async (p: string) => {
    if (!p) return;
    setPrompt(p); setGenerating(true); setDesc("");
    let full = "";
    await streamToState(
      `You are an AI art director describing a generated image. Create a vivid, detailed description of this ${style} image: "${p}". Describe: composition, lighting, colors, textures, mood, foreground/background details, artistic style. Write as if describing an actual finished artwork. 5-7 rich sentences.`,
      c => setDesc(c)
    ).then(r => { full = r; });
    setGenerating(false);
    pipelineEmit(full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generate(prompt)}
          placeholder="Describe an image to generate…"
          className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded-lg border"
          style={{ border: `1px solid ${color}44` }} />
        <button onClick={() => generate(prompt)} disabled={generating || !prompt.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : "CREATE"}
        </button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {STYLES.map(s => (
          <button key={s} onClick={() => setStyle(s)}
            className="text-xs px-2 py-0.5 rounded-full transition-all"
            style={{ background: style === s ? `${color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${style === s ? color + "55" : "rgba(255,255,255,0.08)"}`, color: style === s ? color : "#6b7280" }}>
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {EXAMPLES.map(e => (
          <button key={e} onClick={() => generate(e)}
            className="text-xs p-2 rounded-lg border text-left transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}22`, background: `${color}06`, color: "#9ca3af" }}>
            {e}
          </button>
        ))}
      </div>
      {(generating || desc) && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <motion.div className="w-full rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ height: 180, background: `linear-gradient(135deg, ${color}15 0%, ${color}28 50%, ${color}15 100%)`, border: `1px solid ${color}33` }}
            animate={{ opacity: generating ? [0.5, 0.8, 0.5] : 1 }} transition={{ duration: 1.5, repeat: generating ? Infinity : 0 }}>
            {generating
              ? <Loader2 size={32} className="animate-spin" style={{ color }} />
              : <Image size={40} style={{ color, opacity: 0.4 }} />}
          </motion.div>
          <p className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{desc}</p>
          {generating && <span className="animate-pulse" style={{ color }}>▋</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Library Section ───────────────────────────────────────────────────── */
function LibrarySection({ color }: { color: string }) {
  const [search, setSearch] = useState("");
  const DOCS = [
    { title: "AI Trends 2025 — Deep Research Report", type: "Research", size: "12.4 KB", date: "Today", tags: ["ai", "research"] },
    { title: "Security Audit Q3 2024", type: "Report", size: "8.1 KB", date: "Yesterday", tags: ["security"] },
    { title: "System Architecture Overview", type: "Document", size: "5.6 KB", date: "3 days ago", tags: ["tech"] },
    { title: "Model Comparison: GPT-4o vs Claude 3.5", type: "Analysis", size: "4.2 KB", date: "1 week ago", tags: ["ai", "models"] },
    { title: "Email Templates — Professional", type: "Template", size: "2.8 KB", date: "2 weeks ago", tags: ["email"] },
    { title: "Penetration Testing Playbook", type: "Playbook", size: "18.3 KB", date: "3 weeks ago", tags: ["security", "pentest"] },
  ];
  const TYPE_COLOR: Record<string, string> = { Research: "#6366f1", Report: "#ef4444", Document: "#3b82f6", Analysis: "#10b981", Template: "#f59e0b", Playbook: "#e879f9" };
  const filtered = search ? DOCS.filter(d => d.title.toLowerCase().includes(search.toLowerCase())) : DOCS;

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ border: `1px solid ${color}33`, background: `${color}06` }}>
        <Search size={13} style={{ color }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search library…"
          className="flex-1 bg-transparent text-sm text-gray-300 outline-none font-mono" />
      </div>
      <div className="text-xs text-gray-600 font-mono">{filtered.length} documents</div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {filtered.map((doc, i) => (
          <motion.div key={i} whileHover={{ x: 3 }}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:opacity-80"
            style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${TYPE_COLOR[doc.type]}18`, border: `1px solid ${TYPE_COLOR[doc.type]}33` }}>
              <FileText size={15} style={{ color: TYPE_COLOR[doc.type] }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-200 truncate">{doc.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: TYPE_COLOR[doc.type] }}>{doc.type}</span>
                <span className="text-xs text-gray-600">{doc.size}</span>
                <span className="text-xs text-gray-600">{doc.date}</span>
                {doc.tags.map(t => <span key={t} className="text-xs px-1.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>#{t}</span>)}
              </div>
            </div>
            <Download size={14} className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Brain Section ─────────────────────────────────────────────────────── */
function BrainSection({ color }: { color: string }) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState("");
  const [mode, setMode] = useState<"explain" | "research" | "compare" | "critique">("explain");
  const MODES = ["explain", "research", "compare", "critique"] as const;
  const TOPICS = ["Explain zero-trust security", "How do LLMs work internally?", "Compare SQL vs NoSQL databases", "What are the risks of AGI?"];
  const MODE_PROMPTS: Record<string, string> = {
    explain: "Provide a comprehensive, structured explanation with real-world examples, analogies, and key concepts",
    research: "Conduct a research-style analysis with sources, evidence, current state of knowledge, and open questions",
    compare: "Create a detailed comparison with pros/cons, use cases, performance characteristics, and recommendation",
    critique: "Provide a critical analysis — challenges, limitations, counterarguments, and alternative perspectives",
  };

  const think = async (q: string) => {
    setQuery(q); setThinking(true); setResult("");
    let full = "";
    await streamToState(`You are Odysseus Brain. ${MODE_PROMPTS[mode]} about: "${q}". Use clear sections with headers. Be thorough and insightful.`, c => { full += c; setResult(full); });
    setThinking(false);
    pipelineEmit(full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Brain size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color }} />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && think(query)}
            placeholder="Ask the Brain anything…" disabled={thinking}
            className="w-full bg-transparent text-sm font-mono text-gray-200 outline-none pl-8 pr-3 py-2 rounded-lg border"
            style={{ border: `1px solid ${color}44` }} />
        </div>
        <button onClick={() => think(query)} disabled={thinking || !query.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: color, color: "#000" }}>
          {thinking ? <Loader2 size={14} className="animate-spin" /> : "THINK"}
        </button>
      </div>
      <div className="flex gap-1.5">
        {MODES.map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="text-xs px-3 py-1 rounded-full font-bold transition-all"
            style={{ background: mode === m ? `${color}22` : "transparent", border: `1px solid ${mode === m ? color + "55" : "rgba(255,255,255,0.08)"}`, color: mode === m ? color : "#6b7280" }}>
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TOPICS.map(t => (
          <button key={t} onClick={() => think(t)}
            className="text-xs p-2 rounded-lg border text-left transition-all hover:opacity-80"
            style={{ border: `1px solid ${color}22`, background: `${color}07`, color: "#9ca3af" }}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: `1px solid ${color}22`, background: `${color}05` }}>
        {result || <span className="text-gray-600">Knowledge synthesis will appear here…</span>}
        {thinking && <span className="animate-pulse ml-0.5" style={{ color }}>▋</span>}
      </div>
    </div>
  );
}

/* ─── Tools Overview ────────────────────────────────────────────────────── */
function ToolsSection({ color, onNavigate }: { color: string; onNavigate: (s: Section) => void }) {
  const TOOLS = [
    { name: "Chat + Agents", desc: "Local/API models, tools, MCP, files, shell, skills & memory", icon: Bot, section: "chat" as Section, color: "#00e5cc", features: ["MCP integration", "Shell access", "Memory", "Skills"] },
    { name: "Deep Research", desc: "Multi-step web research with source reading and report generation", icon: Microscope, section: "research" as Section, color: "#6366f1", features: ["8-phase pipeline", "Source reading", "Gap analysis", "Adversarial audit"] },
    { name: "Compare", desc: "Blind side-by-side model testing and synthesis", icon: BarChart2, section: "compare" as Section, color: "#ec4899", features: ["Blind testing", "Vote system", "6 models", "Parallel streaming"] },
    { name: "Documents", desc: "Writing-first editor with AI edits, Markdown, HTML, CSV", icon: FileText, section: "documents" as Section, color: "#f97316", features: ["8 AI actions", "4 templates", "Export MD/HTML/CSV", "Syntax highlight"] },
    { name: "Email", desc: "Inbox with triage, tags, summaries, and reply drafts", icon: Mail, section: "email" as Section, color: "#3b82f6", features: ["CRITICAL/ACTION/INFO triage", "AI summaries", "Auto-reply", "Tags"] },
    { name: "Cookbook", desc: "Hardware-aware model recommendations, downloads, and serving", icon: Cpu, section: "cookbook" as Section, color: "#10b981", features: ["5 hardware profiles", "Ollama commands", "VRAM estimates", "Speed ratings"] },
    { name: "Notes", desc: "Smart note-taking with AI enhancement", icon: AlignLeft, section: "notes" as Section, color: "#84cc16", features: ["AI enhance", "Tags", "Pin notes", "Multi-format"] },
    { name: "Tasks + Calendar", desc: "Reminders, todos, AI planning, scheduled tasks", icon: CheckSquare, section: "tasks" as Section, color: "#fb923c", features: ["Priority matrix", "AI planning", "Due dates", "Progress tracking"] },
    { name: "Gallery", desc: "AI image vision, styles, and description generation", icon: Image, section: "gallery" as Section, color: "#f97316", features: ["6 art styles", "AI descriptions", "Prompt examples", "Image analysis"] },
    { name: "Brain", desc: "Deep knowledge synthesis with 4 analysis modes", icon: Brain, section: "brain" as Section, color: "#e879f9", features: ["Explain mode", "Research mode", "Compare mode", "Critique mode"] },
    { name: "Library", desc: "Document storage with search and tagging", icon: Library, section: "library" as Section, color: "#64c8ff", features: ["Search", "Type filter", "Tags", "Download"] },
    { name: "Theme", desc: "Customize workspace appearance", icon: Palette, section: "theme" as Section, color: "#f472b6", features: ["Color presets", "Accent colors", "Dark mode", "Typography"] },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto">
      {TOOLS.map(t => {
        const Icon = t.icon;
        return (
          <motion.div key={t.name} whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => onNavigate(t.section)}
            className="p-3 rounded-xl border cursor-pointer transition-all"
            style={{ border: `1px solid ${t.color}33`, background: `${t.color}07` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}22`, border: `1px solid ${t.color}44` }}>
                <Icon size={15} style={{ color: t.color }} />
              </div>
              <span className="text-sm font-bold text-gray-200">{t.name}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-2">{t.desc}</p>
            <div className="flex flex-wrap gap-1">
              {t.features.map(f => (
                <span key={f} className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${t.color}15`, color: t.color }}>{f}</span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Theme Section ─────────────────────────────────────────────────────── */
function ThemeSection({ color, onColorChange }: { color: string; onColorChange: (c: string) => void }) {
  const PRESETS = [
    { name: "Odysseus Teal", color: "#00e5cc", desc: "Default Odysseus theme" },
    { name: "Deep Purple", color: "#a78bfa", desc: "Royal purple workspace" },
    { name: "Crimson", color: "#ef4444", desc: "High-energy red" },
    { name: "Ocean Blue", color: "#3b82f6", desc: "Calm and focused" },
    { name: "Forest Green", color: "#10b981", desc: "Natural productivity" },
    { name: "Solar Orange", color: "#f97316", desc: "Warm and creative" },
    { name: "Midnight Pink", color: "#ec4899", desc: "Bold and expressive" },
    { name: "Gold", color: "#f59e0b", desc: "Premium and warm" },
  ];
  const FONTS = ["JetBrains Mono", "Fira Code", "IBM Plex Mono", "Cascadia Code"];
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Accent Color</div>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <motion.button key={p.name} whileHover={{ scale: 1.04 }} onClick={() => onColorChange(p.color)}
              className="p-3 rounded-xl border text-left transition-all"
              style={{ border: color === p.color ? `1px solid ${p.color}88` : "1px solid rgba(255,255,255,0.08)", background: color === p.color ? `${p.color}18` : "rgba(255,255,255,0.02)", boxShadow: color === p.color ? `0 0 12px ${p.color}33` : "none" }}>
              <div className="w-6 h-6 rounded-full mb-2 shadow-lg" style={{ background: p.color }} />
              <div className="text-xs font-bold text-gray-300">{p.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">{p.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Font Family</div>
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map(f => (
            <button key={f} onClick={() => setSelectedFont(f)}
              className="p-3 rounded-xl border text-left transition-all"
              style={{ border: selectedFont === f ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.08)", background: selectedFont === f ? `${color}12` : "rgba(255,255,255,0.02)", color: selectedFont === f ? color : "#6b7280", fontFamily: f }}>
              <div className="text-sm font-bold">{f}</div>
              <div className="text-xs mt-1 opacity-60">const x = 42; // sample</div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-xl border" style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
        <div className="text-xs font-bold mb-3" style={{ color }}>PREVIEW</div>
        <div className="space-y-2">
          <div className="text-sm font-bold" style={{ color }}>Odysseus Workspace</div>
          <div className="text-xs text-gray-400 font-mono">Accent: {color}</div>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}>ACTIVE</span>
            <span className="text-xs px-2 py-0.5 rounded border text-gray-500" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>INACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────────────── */
export function OdysseusWorkspaceModal({ open, onOpenChange }: Props) {
  const [section, setSection] = useState<Section>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accentColor, setAccentColor] = useState(SECTION_COLOR.chat);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const color = section === "theme" ? accentColor : SECTION_COLOR[section];

  const handleNewConversation = useCallback((c: Conversation) => {
    setConversations(cs => [c, ...cs]);
  }, []);

  const handleNavigate = useCallback((s: Section) => setSection(s), []);

  const renderSection = () => {
    switch (section) {
      case "search": return <SearchSection />;
      case "chat": return <ChatSection color={color} onNewConversation={handleNewConversation} />;
      case "chats": return <ChatsSection color={color} conversations={conversations} />;
      case "email": return <EmailSection color={color} />;
      case "tools": return <ToolsSection color={color} onNavigate={handleNavigate} />;
      case "calendar": return <CalendarSection color={color} />;
      case "compare": return <CompareSection color={color} />;
      case "cookbook": return <CookbookSection color={color} />;
      case "research": return <ResearchSection color={color} />;
      case "gallery": return <GallerySection color={color} />;
      case "library": return <LibrarySection color={color} />;
      case "brain": return <BrainSection color={color} />;
      case "notes": return <NotesSection color={color} />;
      case "tasks": return <TasksSection color={color} />;
      case "documents": return <DocumentsSection color={color} />;
      case "theme": return <ThemeSection color={accentColor} onColorChange={setAccentColor} />;
    }
  };

  const activeNav = ALL_NAV.find(n => n.id === section) || ALL_NAV[1];

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(24px)" }}>
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative w-full max-w-[1300px] h-[92vh] rounded-2xl overflow-hidden flex"
          style={{ background: "#070710", border: `1px solid ${color}33`, boxShadow: `0 0 80px ${color}18, 0 0 160px ${color}08, inset 0 1px 0 rgba(255,255,255,0.04)` }}>

          <ParticleCanvas color={color} />

          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
                className="flex-shrink-0 flex flex-col border-r relative z-10 overflow-hidden"
                style={{ borderColor: `${color}1a`, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(24px)" }}>

                {/* Logo */}
                <div className="flex items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: `${color}1a` }}>
                  <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: color, boxShadow: `0 0 10px ${color}44` }}>
                    <Zap size={12} style={{ color }} />
                  </motion.div>
                  <span className="text-sm font-black tracking-wider" style={{ color }}>Odysseus</span>
                </div>

                {/* Search shortcut */}
                <button onClick={() => setSection("search")}
                  className="flex items-center gap-2 mx-3 mt-3 px-3 py-1.5 rounded-lg border text-xs text-gray-500 transition-all hover:opacity-80"
                  style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <Search size={11} /><span className="flex-1 text-left">Search</span><span className="text-gray-700">⌘K</span>
                </button>

                {/* Nav groups */}
                <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
                  {NAV_GROUPS.map((group, gi) => (
                    <div key={gi} className={gi > 0 ? "mt-1" : ""}>
                      {group.label && (
                        <div className="text-xs font-bold text-gray-700 px-2 py-1 tracking-widest uppercase mt-2">{group.label}</div>
                      )}
                      {group.items.map(n => {
                        const Icon = n.icon;
                        const active = section === n.id;
                        return (
                          <motion.button key={n.id} whileHover={{ x: 3 }} onClick={() => setSection(n.id)}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all relative"
                            style={{ color: active ? n.color : "#6b7280", background: active ? `${n.color}12` : "transparent" }}>
                            {active && <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ background: n.color }} />}
                            <Icon size={13} style={{ color: active ? n.color : "#4b5563", flexShrink: 0 }} />
                            <span className="flex-1 text-left">{n.label}</span>
                            {active && <div className="w-1 h-1 rounded-full" style={{ background: n.color }} />}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="px-3 py-2 border-t text-xs text-gray-700 font-mono" style={{ borderColor: `${color}11` }}>
                  v2.1 · Odysseus AI
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: `${color}18`, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}>
              <button onClick={() => setSidebarOpen(v => !v)}
                className="p-1.5 rounded-lg transition-all hover:opacity-70"
                style={{ border: `1px solid ${color}2a` }}>
                <Menu size={13} style={{ color }} />
              </button>
              <activeNav.icon size={15} style={{ color }} />
              <span className="text-sm font-bold" style={{ color }}>{activeNav.label}</span>
              <div className="ml-auto flex items-center gap-2">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 text-xs font-mono" style={{ color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} /> LIVE
                </motion.div>
                <button onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-lg transition-all hover:opacity-70"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                  <X size={13} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={section}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }} className="h-full overflow-hidden">
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
