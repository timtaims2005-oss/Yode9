import "xterm/css/xterm.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Terminal, Play, Square, RotateCcw, ChevronRight, Zap,
  Plus, Trash2, Key, Eye, EyeOff, FileText, FolderOpen,
  Copy, CheckCheck, ChevronDown, Brain, Settings, AlertCircle,
  Upload, Download, FolderClosed, Search, RefreshCw, FileCode,
  FileCog, FileJson, GitBranch, GitCommit, GitPullRequest,
  TerminalSquare, Cpu, CheckSquare, Square as CheckboxOff,
  AlertTriangle, CircleCheck, ChevronUp, Plus as PlusIcon,
} from "lucide-react";
import type { Terminal as XTerm } from "xterm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaudeCodeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type UltraMode = "medium" | "high" | "xhigh" | "max" | "ultracode";
type ProviderID = "anthropic" | "openai" | "gemini" | "groq" | "openrouter";
type MainTab = "chat" | "shell" | "git";

interface CCMessage { role: "user" | "assistant"; content: string; }

interface VirtualFile { name: string; content: string; updatedAt: number; }

interface Session {
  id: string; name: string; mode: UltraMode;
  messages: CCMessage[]; files: VirtualFile[];
  tokensIn: number; tokensOut: number; createdAt: number;
}

type LogBlock =
  | { kind: "user"; text: string }
  | { kind: "tool"; tool: string; arg: string; id: number; result?: string; status?: "running" | "done" | "error" }
  | { kind: "thinking"; text: string; expanded: boolean; id: number }
  | { kind: "text"; text: string; id: number; streaming?: boolean }
  | { kind: "workflow"; text: string; id: number }
  | { kind: "error"; text: string; id: number }
  | { kind: "sep" };

interface FileNode {
  name: string; path: string; type: "file" | "dir";
  children?: FileNode[]; ext?: string; size?: number;
}

interface GitStatus {
  branch: string;
  files: { status: string; path: string }[];
  log: { hash: string; message: string }[];
  clean: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY_APIKEY   = "cc-api-key-v3";
const LS_KEY_PROVIDER = "cc-provider-v3";
const LS_KEY_SESSIONS = "cc-sessions-v2";
const MAX_AGENT_STEPS = 8;

const PROVIDERS: { id: ProviderID; name: string; placeholder: string; color: string; link: string; hint: string }[] = [
  { id: "anthropic",  name: "Anthropic",  placeholder: "sk-ant-api03-...", color: "#e07035", link: "console.anthropic.com/settings/keys",  hint: "sk-ant-" },
  { id: "openai",     name: "OpenAI",     placeholder: "sk-proj-...",       color: "#10a37f", link: "platform.openai.com/api-keys",          hint: "sk-..." },
  { id: "gemini",     name: "Gemini",     placeholder: "AIzaSy...",         color: "#4285f4", link: "aistudio.google.com/app/apikey",         hint: "AIza" },
  { id: "groq",       name: "Groq",       placeholder: "gsk_...",           color: "#f55036", link: "console.groq.com/keys",                  hint: "gsk_" },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-v1-...",      color: "#6b48f5", link: "openrouter.ai/keys",                     hint: "sk-or-" },
];

const MODES: { id: UltraMode; label: string; sub?: string; model: string; color: string }[] = [
  { id: "medium",    label: "medium",    model: "haiku / gpt-4o-mini", color: "#6b7280" },
  { id: "high",      label: "high",      model: "sonnet / gpt-4o",     color: "#9ca3af" },
  { id: "xhigh",     label: "xhigh",     model: "sonnet3.7 / o4-mini", color: "#c084fc" },
  { id: "max",       label: "max",       model: "opus4.5 / o3",        color: "#a855f7" },
  { id: "ultracode", label: "ultracode", sub: "workflows+agent", model: "opus4.5 / o3", color: "#06b6d4" },
];

const CONTEXT_LIMITS: Record<ProviderID, number> = {
  anthropic: 200000, openai: 128000, gemini: 1000000, groq: 131072, openrouter: 200000,
};

const FILE_EXT_COLORS: Record<string, string> = {
  ts:"#3178c6",tsx:"#3178c6",js:"#f7df1e",jsx:"#61dafb",py:"#3572a5",rs:"#ce4a12",
  go:"#00add8",java:"#b07219",json:"#4ec9b0",yaml:"#cc3e44",yml:"#cc3e44",md:"#6e7681",
  css:"#563d7c",html:"#e34c26",sh:"#89e051",sql:"#336791",toml:"#9c4221",txt:"#9ca3af",
};
function getFileColor(ext?: string) { return ext ? (FILE_EXT_COLORS[ext] ?? "#6b7280") : "#6b7280"; }
function getFileIcon(ext?: string) {
  if (!ext) return <FileText className="w-3 h-3" />;
  if (["ts","tsx","js","jsx"].includes(ext)) return <FileCode className="w-3 h-3" />;
  if (["json","yaml","yml","toml"].includes(ext)) return <FileJson className="w-3 h-3" />;
  if (["sh","bash"].includes(ext)) return <FileCog className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}
function detectProvider(key: string): ProviderID {
  if (key.startsWith("sk-ant")) return "anthropic";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-or-")) return "openrouter";
  return "openai";
}

const QUICK_PROMPTS = [
  "Review this code for security vulnerabilities",
  "Write unit tests for all functions",
  "Refactor for performance and readability",
  "Explain the architecture and data flow",
  "Generate comprehensive documentation",
  "Debug this error and fix it",
  "Add error handling and input validation",
  "Convert to async/await pattern",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(name: string, mode: UltraMode = "xhigh"): Session {
  return { id: Math.random().toString(36).slice(2), name, mode, messages:[], files:[], tokensIn:0, tokensOut:0, createdAt:Date.now() };
}
function saveSessionsToLS(s: Session[]) { try { localStorage.setItem(LS_KEY_SESSIONS, JSON.stringify(s)); } catch {} }
function loadSessionsFromLS(): Session[] {
  try { const r = localStorage.getItem(LS_KEY_SESSIONS); if (r) return JSON.parse(r); } catch {}
  return [makeSession("main")];
}
function estimateCost(tokensIn: number, tokensOut: number, mode: UltraMode): string {
  const ir = mode==="medium"?0.0008:mode==="high"?0.003:0.015;
  const or = mode==="medium"?0.0004:mode==="high"?0.015:0.075;
  const c = (tokensIn/1000)*ir + (tokensOut/1000)*or;
  return c < 0.001 ? "<$0.001" : `$${c.toFixed(4)}`;
}
function estimateTokens(msgs: CCMessage[]): number {
  return msgs.reduce((t, m) => t + Math.ceil(m.content.length / 4), 0);
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

interface ToolCall {
  type: "bash" | "read_file" | "write_file" | "search";
  arg: string;
  content?: string;
}
function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const m of text.matchAll(/^Bash:\s*(.+)$/gm)) calls.push({ type:"bash", arg:m[1].trim() });
  for (const m of text.matchAll(/^Read file:\s*(.+)$/gm)) calls.push({ type:"read_file", arg:m[1].trim() });
  for (const m of text.matchAll(/^Write file:\s*(.+)\n```(?:\w*)\n([\s\S]*?)```/gm)) calls.push({ type:"write_file", arg:m[1].trim(), content:m[2] });
  for (const m of text.matchAll(/^Search:\s*(.+)$/gm)) calls.push({ type:"search", arg:m[1].trim() });
  return calls;
}
async function executeToolCall(call: ToolCall): Promise<string> {
  if (call.type === "bash") {
    const r = await fetch("/api/shell/exec", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ command: call.arg }) });
    const d = await r.json();
    return `$ ${call.arg}\n${d.stdout || ""}${d.stderr ? `\nSTDERR:\n${d.stderr}` : ""}`.trim();
  }
  if (call.type === "read_file") {
    const r = await fetch(`/api/files/read?path=${encodeURIComponent(call.arg)}`);
    const d = await r.json();
    if (d.error) return `Error reading ${call.arg}: ${d.error}`;
    return `File: ${call.arg}\n\`\`\`${d.ext??""}\n${(d.content as string).slice(0,6000)}\n\`\`\``;
  }
  if (call.type === "write_file" && call.content) {
    const r = await fetch("/api/files/write", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ path:call.arg, content:call.content }) });
    const d = await r.json();
    return d.ok ? `Successfully wrote ${call.arg} (${call.content.length} bytes)` : `Error writing ${call.arg}: ${d.error}`;
  }
  return `Executed: ${call.type} — ${call.arg}`;
}

// ─── ApiKeySetup ─────────────────────────────────────────────────────────────

function ApiKeySetup({ onSave }: { onSave: (key: string, provider: ProviderID) => void }) {
  const [sel, setSel] = useState<ProviderID>("anthropic");
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [testing, setTesting] = useState(false);
  const prov = PROVIDERS.find(p => p.id === sel)!;

  async function handleSave() {
    const k = key.trim();
    if (!k) { setErr("أدخل مفتاح API"); return; }
    setTesting(true); setErr("");
    try {
      const r = await fetch("/api/claude-code/verify-key", { method:"POST", headers:{"x-api-key":k,"content-type":"application/json"}, body:"{}" });
      const d = await r.json().catch(() => ({ error: "مفتاح غير صالح" }));
      if (!r.ok) { setErr(d.error ?? "مفتاح غير صالح"); setTesting(false); return; }
      const dp = (d.provider as ProviderID) ?? detectProvider(k);
      localStorage.setItem(LS_KEY_APIKEY, k);
      localStorage.setItem(LS_KEY_PROVIDER, dp);
      onSave(k, dp);
    } catch { setErr("تعذر الاتصال"); }
    setTesting(false);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6" style={{ background:"#0c0c10" }}>
      <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} className="w-full max-w-md">
        <div className="rounded-2xl p-6 border" style={{ background:"#121218", borderColor:"rgba(6,182,212,0.3)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.35)" }}>
              <Key className="w-4 h-4" style={{ color:"#67e8f9" }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">اختر مزود AI</div>
              <div className="text-[10px]" style={{ color:"#555" }}>Anthropic · OpenAI · Gemini · Groq · OpenRouter</div>
            </div>
          </div>
          <div className="flex gap-1 mb-4 flex-wrap">
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => { setSel(p.id); setKey(""); setErr(""); }}
                className="flex-1 min-w-[70px] px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ background:sel===p.id?`${p.color}22`:"#0e0e14", border:`1px solid ${sel===p.id?p.color+"80":"rgba(255,255,255,0.07)"}`, color:sel===p.id?p.color:"#444" }}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono" style={{ color:prov.color }}>{prov.hint}</span>
            <a href={`https://${prov.link}`} target="_blank" rel="noopener noreferrer" className="text-[9px] ml-auto" style={{ color:"#333" }}>{prov.link}</a>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3" style={{ background:"#0e0e14", border:`1px solid ${err?"rgba(239,68,68,0.4)":"rgba(255,255,255,0.08)"}` }}>
            <input type={show?"text":"password"} value={key} onChange={e => { setKey(e.target.value); setErr(""); }}
              onKeyDown={e => e.key==="Enter" && handleSave()} placeholder={prov.placeholder}
              className="flex-1 bg-transparent text-[12px] font-mono text-gray-200 outline-none placeholder:text-gray-700" autoFocus />
            <button onClick={() => setShow(!show)} className="text-gray-600 hover:text-gray-400">
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {err && <div className="flex items-center gap-1.5 mb-3 text-[11px]" style={{ color:"#f87171" }}><AlertCircle className="w-3.5 h-3.5" />{err}</div>}
          <button onClick={handleSave} disabled={!key.trim()||testing} className="w-full py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-40"
            style={{ background:`linear-gradient(135deg,${prov.color}22,${prov.color}11)`, border:`1px solid ${prov.color}60`, color:prov.color }}>
            {testing ? "جاري التحقق..." : `حفظ — ${prov.name}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── File Tree Sidebar ────────────────────────────────────────────────────────

function FileTreePanel({ onAddToContext }: { onAddToContext: (f: VirtualFile) => void }) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["artifacts","artifacts/mr7-ai","artifacts/api-server"]));
  const [selected, setSelected] = useState<string|null>(null);
  const [fileContent, setFileContent] = useState<{ path:string; content:string; ext?:string }|null>(null);
  const [search, setSearch] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function loadTree() {
    setLoading(true);
    try { const r = await fetch("/api/files/tree"); const d = await r.json(); setTree(d.tree??[]); } catch {}
    setLoading(false);
  }
  useEffect(() => { loadTree(); }, []);

  async function openFile(node: FileNode) {
    if (node.type==="dir") {
      setExpanded(prev => { const n=new Set(prev); n.has(node.path)?n.delete(node.path):n.add(node.path); return n; });
      return;
    }
    setSelected(node.path); setLoadingFile(true);
    try {
      const r = await fetch(`/api/files/read?path=${encodeURIComponent(node.path)}`);
      const d = await r.json();
      if (d.content!==undefined) setFileContent({ path:node.path, content:d.content, ext:d.ext });
    } catch {}
    setLoadingFile(false);
  }

  function addCtx(node: FileNode) {
    if (!fileContent||fileContent.path!==node.path) return;
    onAddToContext({ name:node.name, content:fileContent.content, updatedAt:Date.now() });
    setAdded(prev => new Set(prev).add(node.path));
    setTimeout(() => setAdded(prev => { const n=new Set(prev); n.delete(node.path); return n; }), 2000);
  }

  function filterTree(nodes: FileNode[], q: string): FileNode[] {
    if (!q) return nodes;
    const res: FileNode[] = [];
    for (const n of nodes) {
      if (n.type==="dir") { const f=filterTree(n.children??[],q); if (f.length) res.push({...n,children:f}); }
      else if (n.name.toLowerCase().includes(q.toLowerCase())) res.push(n);
    }
    return res;
  }

  function renderNode(node: FileNode, depth=0): React.ReactNode {
    const isOpen=expanded.has(node.path), isSel=selected===node.path, isAdd=added.has(node.path);
    const color = node.type==="file" ? getFileColor(node.ext) : "#06b6d4";
    return (
      <div key={node.path}>
        <div className="flex items-center gap-1 px-2 py-[3px] cursor-pointer rounded group"
          style={{ paddingLeft:8+depth*12, background:isSel?"rgba(6,182,212,0.12)":undefined }}
          onClick={() => openFile(node)}
          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background=""; }}>
          {node.type==="dir"
            ? <>{isOpen?<FolderOpen className="w-3 h-3 shrink-0" style={{color}}/>:<FolderClosed className="w-3 h-3 shrink-0" style={{color}}/>}
                <span className="text-[10px] font-mono truncate" style={{ color:"#9ca3af" }}>{node.name}</span>
                {isOpen?<ChevronDown className="w-2.5 h-2.5 ml-auto shrink-0 opacity-40"/>:<ChevronRight className="w-2.5 h-2.5 ml-auto shrink-0 opacity-20"/>}</>
            : <><span style={{color}}>{getFileIcon(node.ext)}</span>
                <span className="text-[10px] font-mono truncate flex-1" style={{ color:isSel?"#c4b5fd":"#6b7280" }}>{node.name}</span>
                <button onClick={e=>{e.stopPropagation();addCtx(node);}} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" style={{ color:isAdd?"#4ade80":"#06b6d4" }}>
                  {isAdd?<CheckCheck className="w-2.5 h-2.5"/>:<PlusIcon className="w-2.5 h-2.5"/>}
                </button></>}
        </div>
        {node.type==="dir"&&isOpen&&<div>{(node.children??[]).map(c=>renderNode(c,depth+1))}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col shrink-0 border-r overflow-hidden" style={{ width:220, borderColor:"rgba(255,255,255,0.06)", background:"#0a0a0d" }}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
        <FolderOpen className="w-3 h-3 shrink-0" style={{ color:"#06b6d4" }} />
        <span className="text-[9px] font-mono font-bold flex-1" style={{ color:"#555" }}>FILES</span>
        <button onClick={loadTree} className="text-gray-700 hover:text-gray-500"><RefreshCw className={`w-2.5 h-2.5 ${loading?"animate-spin":""}`}/></button>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 border-b" style={{ borderColor:"rgba(255,255,255,0.04)" }}>
        <Search className="w-2.5 h-2.5 shrink-0" style={{ color:"#333" }} />
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..."
          className="flex-1 bg-transparent text-[10px] font-mono text-gray-500 outline-none placeholder:text-gray-800" />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {loading?<div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin" style={{color:"#333"}}/></div>
          :filterTree(tree,search).map(n=>renderNode(n))}
      </div>
      {fileContent && (
        <div className="border-t" style={{ borderColor:"rgba(6,182,212,0.15)" }}>
          <div className="flex items-center gap-1 px-2 py-1" style={{ background:"#0e0e14" }}>
            <span className="text-[9px] font-mono truncate flex-1" style={{ color:getFileColor(fileContent.ext) }}>{fileContent.path.split("/").pop()}</span>
            <button onClick={() => onAddToContext({ name:fileContent.path.split("/").pop()!, content:fileContent.content, updatedAt:Date.now() })}
              className="text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background:"rgba(6,182,212,0.15)", color:"#67e8f9", border:"1px solid rgba(6,182,212,0.3)" }}>
              +ctx
            </button>
          </div>
          <div className="px-2 py-1.5 text-[9px] font-mono overflow-y-auto" style={{ maxHeight:100, color:"#6b7280", background:"#070709", whiteSpace:"pre", overflowX:"auto" }}>
            {loadingFile?"...":(fileContent.content.slice(0,1500)+(fileContent.content.length>1500?"\n...":""))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── xterm Shell Terminal ──────────────────────────────────────────────────────

function TerminalTab({ open }: { open: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm|null>(null);
  const wsRef = useRef<WebSocket|null>(null);
  const fitRef = useRef<{ fit: () => void }|null>(null);
  const [status, setStatus] = useState<"connecting"|"ready"|"disconnected">("connecting");

  useEffect(() => {
    if (!open || !containerRef.current) return;
    let mounted = true;

    async function init() {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      if (!mounted || !containerRef.current) return;

      const term = new Terminal({
        theme: { background:"#0c0c10", foreground:"#d1d5db", cursor:"#06b6d4", cursorAccent:"#0c0c10", selectionBackground:"rgba(6,182,212,0.3)", black:"#1e1e2e", red:"#f38ba8", green:"#a6e3a1", yellow:"#f9e2af", blue:"#89b4fa", magenta:"#cba6f7", cyan:"#89dceb", white:"#cdd6f4" },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13, cursorBlink: true, cursorStyle: "block",
        scrollback: 2000, allowTransparency: true,
      });

      const fitAddon = new FitAddon();
      const linksAddon = new WebLinksAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(linksAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      fitRef.current = fitAddon;
      termRef.current = term;

      term.writeln("\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m");
      term.writeln("\x1b[35m║\x1b[0m  \x1b[32mKaliGPT Shell\x1b[0m · \x1b[36mWebSocket Terminal v2\x1b[0m        \x1b[35m║\x1b[0m");
      term.writeln("\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m");
      term.writeln("");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/terminal`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type:"start", cwd:"/home/runner/workspace" }));
        };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data) as { type:string; data?:string; cwd?:string };
            if (msg.type==="ready") {
              setStatus("ready");
              term.writeln(`\x1b[32mConnected\x1b[0m · \x1b[33m${msg.cwd}\x1b[0m`);
              term.writeln("");
            } else if (msg.type==="output") {
              term.write(msg.data??"");
            } else if (msg.type==="exit") {
              term.writeln("\r\n\x1b[31m[Shell exited]\x1b[0m");
              setStatus("disconnected");
            }
          } catch {}
        };
        ws.onerror = () => {
          term.writeln("\x1b[31mWebSocket connection failed.\x1b[0m");
          setStatus("disconnected");
        };
        ws.onclose = () => { setStatus("disconnected"); };

        term.onData(data => {
          if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:"input", data }));
        });
      } catch {
        term.writeln("\x1b[31mFailed to connect to terminal server.\x1b[0m");
        setStatus("disconnected");
      }

      const ro = new ResizeObserver(() => { try { fitAddon.fit(); } catch {} });
      if (containerRef.current) ro.observe(containerRef.current);

      return () => { ro.disconnect(); };
    }

    init();

    return () => {
      mounted = false;
      wsRef.current?.close();
      termRef.current?.dispose();
      termRef.current = null;
      wsRef.current = null;
    };
  }, [open]);

  function reconnect() {
    wsRef.current?.close();
    termRef.current?.dispose();
    termRef.current = null;
    wsRef.current = null;
    setStatus("connecting");
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-1.5 border-b shrink-0" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#0e0e14" }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:status==="ready"?"#4ade80":status==="connecting"?"#fbbf24":"#f87171" }}/>
        <span className="text-[10px] font-mono" style={{ color:"#555" }}>
          {status==="ready"?"Connected · /home/runner/workspace":status==="connecting"?"Connecting...":"Disconnected"}
        </span>
        <button onClick={reconnect} className="ml-auto text-gray-700 hover:text-gray-400 transition-colors" title="Reconnect">
          <RefreshCw className="w-3.5 h-3.5"/>
        </button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 p-2" style={{ background:"#0c0c10" }} />
    </div>
  );
}

// ─── Git Panel ────────────────────────────────────────────────────────────────

function GitPanel() {
  const [status, setStatus] = useState<GitStatus|null>(null);
  const [diff, setDiff] = useState<string>("");
  const [selected, setSelected] = useState<string|null>(null);
  const [staged, setStaged] = useState<Set<string>>(new Set());
  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState<{ text:string; ok:boolean }|null>(null);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    const r = await fetch("/api/git/status");
    const d = await r.json();
    setStatus(d);
    setLoading(false);
  }

  async function loadDiff(file?: string) {
    const url = file ? `/api/git/diff?file=${encodeURIComponent(file)}` : "/api/git/diff";
    const r = await fetch(url);
    const d = await r.json();
    setDiff(d.diff ?? "No changes");
  }

  async function stageAll() {
    await fetch("/api/git/add", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ files:[] }) });
    setStaged(new Set(status?.files.map(f=>f.path)??[]));
  }

  async function commit() {
    if (!commitMsg.trim()) return;
    setCommitting(true);
    const r = await fetch("/api/git/commit", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ message:commitMsg }) });
    const d = await r.json();
    setMessage({ text:d.ok?`Committed: ${commitMsg}`:d.error??"Failed", ok:d.ok });
    if (d.ok) { setCommitMsg(""); await loadStatus(); }
    setCommitting(false);
  }

  function fileStatusColor(s: string) {
    if (s==="M") return "#fbbf24";
    if (s==="A") return "#4ade80";
    if (s==="D") return "#f87171";
    if (s==="R") return "#60a5fa";
    if (s==="?") return "#9ca3af";
    return "#6b7280";
  }

  function renderDiff(d: string) {
    return d.split("\n").map((line, i) => {
      const color = line.startsWith("+")?`#4ade80`:line.startsWith("-")?`#f87171`:line.startsWith("@@")?`#60a5fa`:`#6b7280`;
      const bg = line.startsWith("+")?`rgba(74,222,128,0.05)`:line.startsWith("-")?`rgba(248,113,113,0.05)`:`transparent`;
      return <div key={i} style={{ color, background:bg, fontFamily:"monospace", fontSize:10, lineHeight:"1.6", whiteSpace:"pre", paddingLeft:4 }}>{line||" "}</div>;
    });
  }

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left: file list */}
      <div className="w-56 flex flex-col border-r shrink-0" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#0a0a0d" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
          <GitBranch className="w-3 h-3" style={{ color:"#67e8f9" }} />
          <span className="text-[10px] font-mono font-bold" style={{ color:"#67e8f9" }}>{status?.branch??"-"}</span>
          <button onClick={loadStatus} className="ml-auto text-gray-700 hover:text-gray-400"><RefreshCw className={`w-2.5 h-2.5 ${loading?"animate-spin":""}`}/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading?<div className="text-center py-4 text-[10px]" style={{color:"#333"}}>Loading...</div>
            :status?.clean?<div className="text-center py-4 text-[10px]" style={{color:"#333"}}>Working tree clean</div>
            :status?.files.map(f => (
              <div key={f.path} onClick={() => { setSelected(f.path); loadDiff(f.path); }}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors group"
                style={{ background:selected===f.path?"rgba(6,182,212,0.12)":undefined }}
                onMouseEnter={e=>{if(selected!==f.path)e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
                onMouseLeave={e=>{if(selected!==f.path)e.currentTarget.style.background="";}}
              >
                <span className="text-[9px] font-mono font-bold w-4 shrink-0" style={{ color:fileStatusColor(f.status) }}>{f.status}</span>
                <span className="text-[9px] font-mono truncate flex-1" style={{ color:"#6b7280" }}>{f.path.split("/").pop()}</span>
                <button onClick={e=>{e.stopPropagation();setStaged(prev=>{const n=new Set(prev);staged.has(f.path)?n.delete(f.path):n.add(f.path);return n;});}}
                  className="opacity-0 group-hover:opacity-100 shrink-0">
                  {staged.has(f.path)?<CheckSquare className="w-3 h-3" style={{color:"#4ade80"}}/>:<CheckboxOff className="w-3 h-3" style={{color:"#333"}}/>}
                </button>
              </div>
            ))}
        </div>
        {/* Commit area */}
        <div className="border-t p-2 space-y-2" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
          <button onClick={stageAll} className="w-full text-[9px] font-mono py-1 rounded transition-colors"
            style={{ background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.3)", color:"#67e8f9" }}>
            Stage All
          </button>
          <textarea value={commitMsg} onChange={e=>setCommitMsg(e.target.value)} rows={2} placeholder="Commit message..."
            className="w-full bg-transparent text-[10px] font-mono text-gray-400 outline-none resize-none rounded px-2 py-1"
            style={{ border:"1px solid rgba(255,255,255,0.06)" }} />
          <button onClick={commit} disabled={!commitMsg.trim()||committing}
            className="w-full text-[9px] font-bold py-1 rounded flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
            style={{ background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", color:"#4ade80" }}>
            <GitCommit className="w-3 h-3"/> {committing?"Committing...":"Commit"}
          </button>
          {message && (
            <div className="text-[9px] font-mono px-2 py-1 rounded" style={{ background:message.ok?"rgba(74,222,128,0.08)":"rgba(248,113,113,0.08)", color:message.ok?"#4ade80":"#f87171", border:`1px solid ${message.ok?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"}` }}>
              {message.text}
            </div>
          )}
        </div>
        {/* Log */}
        <div className="border-t" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
          <div className="px-3 py-1.5 text-[9px] font-mono font-bold" style={{ color:"#333" }}>RECENT COMMITS</div>
          <div className="overflow-y-auto" style={{ maxHeight:100 }}>
            {status?.log.slice(0,6).map(l => (
              <div key={l.hash} className="px-3 py-0.5">
                <span className="text-[8px] font-mono" style={{ color:"#06b6d4" }}>{l.hash}</span>
                <span className="text-[8px] font-mono ml-2" style={{ color:"#444" }}>{l.message.slice(0,30)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right: diff viewer */}
      <div className="flex-1 overflow-auto" style={{ background:"#080808" }}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color:"#083344" }}>
            <GitPullRequest className="w-10 h-10 opacity-30" />
            <span className="text-[11px] font-mono">اختر ملفاً لعرض التغييرات</span>
          </div>
        ) : (
          <div className="p-2">{renderDiff(diff)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Log Block ────────────────────────────────────────────────────────────────

function LogBlockView({ block, onToggleThinking }: { block: LogBlock; onToggleThinking: (id:number)=>void }) {
  const [copied, setCopied] = useState(false);
  function copy(text:string) { navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);}); }

  if (block.kind==="sep") return <div className="my-2 h-px" style={{ background:"rgba(255,255,255,0.04)" }}/>;
  if (block.kind==="user") return (
    <div className="flex items-start gap-2 mt-3 mb-1">
      <span style={{ color:"#4ade80", fontSize:11 }}>❯</span>
      <span className="text-[12px] font-mono font-semibold" style={{ color:"#e2e8f0" }}>{block.text}</span>
    </div>
  );
  if (block.kind==="tool") return (
    <div className="flex items-start gap-2 my-1 px-2 py-1.5 rounded-lg" style={{ background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)" }}>
      <Cpu className="w-3 h-3 mt-0.5 shrink-0" style={{ color:"#06b6d4" }}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold" style={{ color:"#0891b2" }}>{block.tool}</span>
          <span className="text-[9px] font-mono truncate" style={{ color:"#0e7490" }}>{block.arg}</span>
          {block.status==="running"&&<span className="text-[8px] animate-pulse ml-auto" style={{color:"#fbbf24"}}>running...</span>}
          {block.status==="done"&&<CircleCheck className="w-3 h-3 ml-auto" style={{color:"#4ade80"}}/>}
          {block.status==="error"&&<AlertTriangle className="w-3 h-3 ml-auto" style={{color:"#f87171"}}/>}
        </div>
        {block.result&&<div className="text-[9px] font-mono mt-1 overflow-x-auto" style={{ color:"#6b7280", whiteSpace:"pre", maxHeight:120, overflowY:"auto" }}>{block.result.slice(0,600)}</div>}
      </div>
    </div>
  );
  if (block.kind==="workflow") return (
    <div className="flex items-center gap-2 px-2 py-1 rounded my-1 text-[10px] font-mono" style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.2)" }}>
      <Zap className="w-3 h-3 shrink-0" style={{ color:"#06b6d4" }}/><span style={{ color:"#67e8f9" }}>{block.text}</span>
    </div>
  );
  if (block.kind==="thinking") return (
    <div className="my-1 rounded overflow-hidden" style={{ border:"1px solid rgba(168,85,247,0.2)", background:"rgba(6,182,212,0.04)" }}>
      <button onClick={()=>onToggleThinking(block.id)} className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] font-mono" style={{ color:"#06b6d4" }}>
        <Brain className="w-3 h-3"/><span>Extended Thinking</span>
        <span className="ml-auto">{block.expanded?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}</span>
      </button>
      {block.expanded&&<div className="px-3 pb-2 text-[10px] font-mono leading-relaxed" style={{ color:"#6b5f9a", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{block.text}</div>}
    </div>
  );
  if (block.kind==="error") return (
    <div className="flex items-start gap-2 my-1 px-2 py-1.5 rounded text-[11px] font-mono" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171" }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/><span style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{block.text}</span>
    </div>
  );
  if (block.kind==="text") return (
    <div className="relative group my-1">
      <div className="pl-3 py-1.5 text-[12px] font-mono leading-relaxed" style={{ color:"#d1d5db", borderLeft:"2px solid rgba(6,182,212,0.3)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {block.text}
        {block.streaming&&<span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse rounded-sm" style={{ background:"#06b6d4" }}/>}
      </div>
      {!block.streaming&&block.text&&(
        <button onClick={()=>copy(block.text)} className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 p-1 rounded" style={{ color:"#555" }}>
          {copied?<CheckCheck className="w-3 h-3 text-green-500"/>:<Copy className="w-3 h-3"/>}
        </button>
      )}
    </div>
  );
  return null;
}

// ─── Context Meter ────────────────────────────────────────────────────────────

function ContextMeter({ msgs, provider }: { msgs: CCMessage[]; provider: ProviderID }) {
  const tokens = estimateTokens(msgs);
  const limit = CONTEXT_LIMITS[provider] ?? 128000;
  const pct = Math.min(100, (tokens / limit) * 100);
  const color = pct>90?"#f87171":pct>70?"#fbbf24":"#4ade80";
  return (
    <div className="flex items-center gap-2 px-4 py-1 border-t shrink-0" style={{ borderColor:"rgba(255,255,255,0.04)", background:"#0a0a0d" }}>
      <span className="text-[8px] font-mono" style={{ color:"#333" }}>CTX</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${color}88, ${color})` }}/>
      </div>
      <span className="text-[8px] font-mono" style={{ color:"#444" }}>{(tokens/1000).toFixed(1)}K/{(limit/1000).toFixed(0)}K</span>
    </div>
  );
}

// ─── Agent Step Indicator ─────────────────────────────────────────────────────

function AgentStepIndicator({ step, max }: { step: number; max: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0" style={{ background:"rgba(6,182,212,0.08)", borderBottom:"1px solid rgba(6,182,212,0.15)" }}>
      <div className="flex gap-0.5">
        {Array.from({length:max}).map((_,i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background:i<step?"#06b6d4":i===step?"#67e8f9 animate-pulse":"rgba(255,255,255,0.1)" }}/>
        ))}
      </div>
      <span className="text-[9px] font-mono" style={{ color:"#67e8f9" }}>Agent Step {step}/{max}</span>
      <span className="text-[8px] font-mono ml-auto animate-pulse" style={{ color:"#06b6d4" }}>⬤ executing tools</span>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ClaudeCodeModal({ open, onOpenChange }: ClaudeCodeModalProps) {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY_APIKEY)??"");
  const [provider, setProvider] = useState<ProviderID>(() => (localStorage.getItem(LS_KEY_PROVIDER) as ProviderID)??"anthropic");
  const [sessions, setSessions] = useState<Session[]>(() => loadSessionsFromLS());
  const [activeId, setActiveId] = useState<string>(() => { const s=loadSessionsFromLS(); return s[0]?.id??""; });
  const [logs, setLogs] = useState<LogBlock[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [agentLoop, setAgentLoop] = useState(true);
  const [agentStep, setAgentStep] = useState(0);
  const [showFiles, setShowFiles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("chat");
  const [showModelMenu, setShowModelMenu] = useState(false);

  const abortRef = useRef<AbortController|null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textBufRef = useRef("");
  const thinkBufRef = useRef("");
  const idCountRef = useRef(0);

  const activeSession = sessions.find(s => s.id===activeId)??sessions[0];
  const modeIdx = MODES.findIndex(m => m.id===(activeSession?.mode??"xhigh"));
  const currentMode = MODES[modeIdx]??MODES[2];
  const currentProvider = PROVIDERS.find(p => p.id===provider)??PROVIDERS[0];

  useEffect(() => { try { localStorage.setItem(LS_KEY_SESSIONS, JSON.stringify(sessions)); } catch {} }, [sessions]);
  useEffect(() => { if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior:"smooth" }); }, [logs]);
  useEffect(() => { if (open) { if (!activeId&&sessions[0]) setActiveId(sessions[0].id); setTimeout(()=>inputRef.current?.focus(),80); } }, [open]);
  useEffect(() => {
    if (!activeSession) return;
    const rebuilt: LogBlock[] = [];
    for (const msg of activeSession.messages) {
      if (msg.role==="user") rebuilt.push({ kind:"user", text:msg.content });
      else rebuilt.push({ kind:"text", text:msg.content, id:Math.random() });
      rebuilt.push({ kind:"sep" });
    }
    setLogs(rebuilt);
    textBufRef.current=""; thinkBufRef.current="";
  }, [activeId]);

  function nextId() { idCountRef.current++; return idCountRef.current; }
  function upd(id: string, patch: Partial<Session>) { setSessions(prev => prev.map(s => s.id===id?{...s,...patch}:s)); }
  function newSession() { const s=makeSession(`session-${sessions.length+1}`,activeSession?.mode??"xhigh"); setSessions(p=>[...p,s]); setActiveId(s.id); setLogs([]); }
  function closeSession(id: string) { if (sessions.length<=1) return; const nx=sessions.find(s=>s.id!==id); setSessions(p=>p.filter(s=>s.id!==id)); if (id===activeId&&nx) setActiveId(nx.id); }
  function setMode(mode: UltraMode) { if (!running) upd(activeId,{mode}); }
  function addFile(f: VirtualFile) { const files=[...(activeSession?.files??[]).filter(x=>x.name!==f.name),f]; upd(activeId,{files}); }
  function removeFile(name:string) { upd(activeId,{files:(activeSession?.files??[]).filter(f=>f.name!==name)}); }
  const toggleThinking = useCallback((id:number)=>{ setLogs(prev=>prev.map(b=>b.kind==="thinking"&&b.id===id?{...b,expanded:!b.expanded}:b)); },[]);

  function stop() {
    abortRef.current?.abort(); setRunning(false); setAgentStep(0);
    setLogs(prev=>{const a=[...prev];for(let i=a.length-1;i>=0;i--){if(a[i].kind==="text"&&(a[i] as {streaming?:boolean}).streaming){(a[i] as {streaming?:boolean}).streaming=false;break;}}return[...a,{kind:"sep"}];});
  }

  async function streamOnce(msgs: CCMessage[], abortSignal: AbortSignal): Promise<string> {
    const res = await fetch("/api/claude-code/stream", {
      method:"POST",
      headers:{"content-type":"application/json","x-api-key":apiKey},
      body:JSON.stringify({ messages:msgs, mode:currentMode.id, files:activeSession?.files??[] }),
      signal:abortSignal,
    });
    if (!res.ok) { const d=await res.json().catch(()=>({error:"خطأ في الاتصال"})); throw new Error(d.error??"خطأ في الخادم"); }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let buf="", fullText="";
    let currentTextId=-1, currentThinkId=-1, inText=false, inThinking=false;

    for(;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value,{stream:true});
      const lines = buf.split("\n"); buf = lines.pop()??"";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let evt: Record<string,unknown>;
        try { evt=JSON.parse(line.slice(6)); } catch { continue; }
        const type = evt.type as string;
        if (type==="error") throw new Error(String((evt as {error?:unknown}).error??"Unknown error"));
        if (type==="content_block_start") {
          const cb=(evt as {content_block?:{type?:string}}).content_block;
          if (cb?.type==="thinking") { inThinking=true; inText=false; const id=nextId(); currentThinkId=id; thinkBufRef.current=""; setLogs(p=>[...p,{kind:"thinking",text:"",expanded:false,id}]); }
          else if (cb?.type==="text") { inText=true; inThinking=false; const id=nextId(); currentTextId=id; textBufRef.current=""; setLogs(p=>[...p,{kind:"text",text:"",id,streaming:true}]); }
        }
        if (type==="content_block_delta") {
          const delta=(evt as {delta?:{type?:string;thinking?:string;text?:string}}).delta;
          if (delta?.type==="thinking_delta"&&delta.thinking&&inThinking) {
            thinkBufRef.current+=delta.thinking;
            const id=currentThinkId;
            setLogs(p=>p.map(b=>b.kind==="thinking"&&b.id===id?{...b,text:thinkBufRef.current}:b));
          }
          if (delta?.type==="text_delta"&&delta.text&&inText) {
            fullText+=delta.text; textBufRef.current+=delta.text;
            const id=currentTextId;
            setLogs(p=>p.map(b=>b.kind==="text"&&(b as {id:number}).id===id?{...b,text:textBufRef.current,streaming:true}:b));
          }
        }
        if (type==="content_block_stop") {
          if (inText&&currentTextId>=0) { const id=currentTextId; setLogs(p=>p.map(b=>b.kind==="text"&&(b as {id:number}).id===id?{...b,streaming:false}:b)); inText=false; }
          if (inThinking) inThinking=false;
        }
        if (type==="message_stop") break;
      }
    }
    return fullText;
  }

  async function execute() {
    const task = input.trim();
    if (!task||running||!activeSession||!apiKey) return;
    setInput(""); setRunning(true); setAgentStep(0);
    textBufRef.current=""; thinkBufRef.current="";

    const userMsg: CCMessage = { role:"user", content:task };
    let currentMsgs = [...activeSession.messages, userMsg];
    upd(activeId,{ messages:currentMsgs });
    setLogs(p=>[...p,{kind:"user",text:task}]);

    if (currentMode.id==="ultracode") {
      setLogs(p=>[...p,{kind:"workflow",text:"Initializing autonomous workflow orchestration...",id:nextId()}]);
      await sleep(300);
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let assistantText = "";
    let step = 0;

    try {
      while (step < (agentLoop ? MAX_AGENT_STEPS : 1)) {
        step++;
        if (step > 1) setAgentStep(step);

        assistantText = await streamOnce(currentMsgs, ctrl.signal);

        // Parse tool calls
        if (agentLoop) {
          const toolCalls = parseToolCalls(assistantText);
          if (toolCalls.length === 0) break; // No more tool calls, done

          // Execute each tool call
          const toolResults: string[] = [];
          for (const tc of toolCalls.slice(0, 4)) { // max 4 tools per step
            const toolId = nextId();
            setLogs(p=>[...p,{kind:"tool",tool:tc.type==="bash"?"Bash":tc.type==="read_file"?"Read file":tc.type==="write_file"?"Write file":"Search",arg:tc.arg,id:toolId,status:"running"}]);
            try {
              const result = await executeToolCall(tc);
              toolResults.push(`[${tc.type}: ${tc.arg}]\n${result}`);
              setLogs(p=>p.map(b=>(b.kind==="tool"&&b.id===toolId)?{...b,status:"done",result}:b));
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e);
              toolResults.push(`[${tc.type}: ${tc.arg}]\nError: ${errMsg}`);
              setLogs(p=>p.map(b=>(b.kind==="tool"&&b.id===toolId)?{...b,status:"error",result:errMsg}:b));
            }
          }

          // Feed results back
          const assistantMsg: CCMessage = { role:"assistant", content:assistantText };
          const toolResultMsg: CCMessage = { role:"user", content:`Tool execution results:\n\n${toolResults.join("\n\n")}` };
          currentMsgs = [...currentMsgs, assistantMsg, toolResultMsg];
        } else {
          break;
        }
      }

      const finalAssistantMsg: CCMessage = { role:"assistant", content:assistantText };
      upd(activeId,{ messages:[...activeSession.messages, userMsg, finalAssistantMsg] });

      if (currentMode.id==="ultracode") setLogs(p=>[...p,{kind:"workflow",text:"Workflow complete. All sub-tasks synthesized.",id:nextId()}]);
      setLogs(p=>[...p,{kind:"sep"}]);
    } catch (e: unknown) {
      if ((e as {name?:string})?.name!=="AbortError") {
        setLogs(p=>[...p,{kind:"error",text:(e as Error)?.message??"خطأ غير معروف",id:nextId()},{kind:"sep"}]);
      }
    } finally {
      setRunning(false); setAgentStep(0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key==="Escape") { stop(); return; }
    if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); execute(); }
  }

  function handleCommand(cmd: string) {
    const c=cmd.trim().toLowerCase();
    if (c==="/clear") { setLogs([]); upd(activeId,{messages:[]}); setInput(""); }
    else if (c==="/new") { newSession(); setInput(""); }
    else if (c==="/key") { setShowSettings(true); setInput(""); }
    else if (c.startsWith("/model ")) { const m=c.replace("/model ","").trim() as UltraMode; if (MODES.find(x=>x.id===m)) { setMode(m); setInput(""); } }
    else if (c==="/agent") { setAgentLoop(p=>!p); setInput(""); }
  }

  if (!open) return null;

  if (!apiKey) {
    return (
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(6px)" }}>
            <motion.div initial={{scale:0.95,y:12}} animate={{scale:1,y:0}} exit={{scale:0.95,y:12}}
              className="w-full flex flex-col rounded-[18px] overflow-hidden"
              style={{ background:"#0c0c10", border:"1px solid rgba(6,182,212,0.3)", maxHeight:"90vh" }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#121218" }}>
                <div className="flex items-center gap-1.5">
                  <button onClick={()=>onOpenChange(false)} className="w-3 h-3 rounded-full" style={{background:"#ff5f57"}}/>
                  <div className="w-3 h-3 rounded-full" style={{background:"#febc2e"}}/>
                  <div className="w-3 h-3 rounded-full" style={{background:"#28c840"}}/>
                </div>
                <span className="text-[11px] font-mono" style={{color:"#555"}}>Claude Code — اختر مزود AI</span>
                <button onClick={()=>onOpenChange(false)} className="text-gray-700 hover:text-gray-400"><X className="w-3.5 h-3.5"/></button>
              </div>
              <ApiKeySetup onSave={(k,p)=>{ setApiKey(k); setProvider(p); }}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id:"chat", label:"CHAT", icon:<Terminal className="w-3 h-3"/> },
    { id:"shell", label:"SHELL", icon:<TerminalSquare className="w-3 h-3"/> },
    { id:"git", label:"GIT", icon:<GitBranch className="w-3 h-3"/> },
  ];

  return (
    <AnimatePresence>
      {open&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ background:"rgba(0,0,0,0.88)", backdropFilter:"blur(6px)" }}
          onClick={e=>{ if(e.target===e.currentTarget) onOpenChange(false); }}>
          <motion.div initial={{scale:0.96,y:16}} animate={{scale:1,y:0}} exit={{scale:0.96,y:16}} transition={{duration:0.18}}
            className="w-full flex flex-col rounded-[18px] overflow-hidden shadow-2xl"
            style={{ background:"#0c0c10", border:"1px solid rgba(6,182,212,0.25)", boxShadow:"0 0 80px rgba(6,182,212,0.2),0 30px 60px rgba(0,0,0,0.9)", height:"min(90vh,800px)" }}>

            {/* ── Title bar ── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0 select-none" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#121218" }}>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>onOpenChange(false)} className="w-3 h-3 rounded-full" style={{background:"#ff5f57"}}/>
                <div className="w-3 h-3 rounded-full" style={{background:"#febc2e"}}/>
                <div className="w-3 h-3 rounded-full" style={{background:"#28c840"}}/>
              </div>
              <div className="flex items-center gap-2 mx-auto">
                <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ background:`${currentProvider.color}22`, border:`1px solid ${currentProvider.color}50`, color:currentProvider.color }}>
                  {currentProvider.name.slice(0,2).toUpperCase()}
                </div>
                <span className="text-[11px] font-mono" style={{ color:"#666" }}>Claude Code v3 · {currentProvider.name} · {currentMode.id.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>setAgentLoop(p=>!p)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all"
                  style={{ background:agentLoop?"rgba(6,182,212,0.2)":"rgba(255,255,255,0.05)", border:`1px solid ${agentLoop?"rgba(6,182,212,0.5)":"rgba(255,255,255,0.1)"}`, color:agentLoop?"#67e8f9":"#444" }}
                  title="Toggle Agent Loop">
                  <Cpu className="w-2.5 h-2.5"/> {agentLoop?"AGENT":"MANUAL"}
                </button>
                <button onClick={()=>setShowFileTree(!showFileTree)} className="p-1 rounded" style={{ color:showFileTree?"#06b6d4":"#444" }} title="File Tree">
                  <FolderOpen className="w-3.5 h-3.5"/>
                </button>
                <button onClick={()=>setShowFiles(!showFiles)} className="p-1 rounded" style={{ color:showFiles?"#06b6d4":"#444" }} title="Upload Files">
                  <FileText className="w-3.5 h-3.5"/>
                </button>
                {/* Model switcher */}
                <div className="relative">
                  <button onClick={()=>setShowModelMenu(p=>!p)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all"
                    style={{ background:showModelMenu?`${currentProvider.color}22`:"rgba(255,255,255,0.05)", border:`1px solid ${showModelMenu?currentProvider.color+"60":"rgba(255,255,255,0.1)"}`, color:showModelMenu?currentProvider.color:"#555" }}
                    title="تبديل مزود الذكاء الاصطناعي">
                    <Brain className="w-2.5 h-2.5"/>
                    <span>{currentProvider.name.slice(0,3).toUpperCase()}</span>
                  </button>
                  {showModelMenu && (
                    <div className="absolute top-full right-0 mt-1 rounded-[18px] overflow-hidden z-50 shadow-2xl"
                      style={{ background:"#0e0e14", border:"1px solid rgba(6,182,212,0.25)", minWidth:160 }}>
                      {PROVIDERS.map(p => (
                        <button key={p.id} onClick={()=>{ setProvider(p.id); localStorage.setItem(LS_KEY_PROVIDER,p.id); setShowModelMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold transition-all text-left"
                          style={{ background:provider===p.id?`${p.color}15`:"transparent", color:provider===p.id?p.color:"#444", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                          onMouseEnter={e=>{ if(provider!==p.id){e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#999";} }}
                          onMouseLeave={e=>{ if(provider!==p.id){e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#444";} }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:p.color }}/>
                          {p.name}
                          {provider===p.id && <span className="ml-auto text-[8px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>setShowSettings(!showSettings)} className="p-1 rounded" style={{ color:showSettings?"#06b6d4":"#444" }}>
                  <Settings className="w-3.5 h-3.5"/>
                </button>
                <button onClick={()=>onOpenChange(false)} className="p-1 text-gray-700 hover:text-gray-400"><X className="w-3.5 h-3.5"/></button>
              </div>
            </div>

            {/* ── Settings panel ── */}
            <AnimatePresence>
              {showSettings&&(
                <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden shrink-0" style={{ borderBottom:"1px solid rgba(6,182,212,0.15)", background:"#0e0e14" }}>
                  <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0" style={{ background:`${currentProvider.color}15`, border:`1px solid ${currentProvider.color}40` }}>
                      <span className="text-[10px] font-bold" style={{ color:currentProvider.color }}>{currentProvider.name}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background:"#121218", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <input type={showKey?"text":"password"} value={newKeyInput||apiKey} onChange={e=>setNewKeyInput(e.target.value)}
                        className="flex-1 bg-transparent text-[11px] font-mono text-gray-400 outline-none" placeholder="أدخل مفتاح جديد..."/>
                      <button onClick={()=>setShowKey(!showKey)} className="text-gray-600 hover:text-gray-400">{showKey?<EyeOff className="w-3 h-3"/>:<Eye className="w-3 h-3"/>}</button>
                    </div>
                    <button onClick={()=>{ const k=newKeyInput.trim(); if(!k) return; const dp=detectProvider(k); localStorage.setItem(LS_KEY_APIKEY,k); localStorage.setItem(LS_KEY_PROVIDER,dp); setApiKey(k); setProvider(dp); setNewKeyInput(""); setShowSettings(false); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0" style={{ background:"rgba(6,182,212,0.2)", border:"1px solid rgba(6,182,212,0.4)", color:"#67e8f9" }}>حفظ</button>
                    <button onClick={()=>{ localStorage.removeItem(LS_KEY_APIKEY); localStorage.removeItem(LS_KEY_PROVIDER); setApiKey(""); }}
                      className="px-2 py-1.5 rounded-lg text-[10px] shrink-0" style={{ color:"#f87171", border:"1px solid rgba(239,68,68,0.2)" }}>
                      <Trash2 className="w-3 h-3"/>
                    </button>
                    <span className="text-[9px] font-mono" style={{ color:"#333" }}>{activeSession?estimateCost(activeSession.tokensIn,activeSession.tokensOut,activeSession.mode):"$0"}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Tab bar ── */}
            <div className="flex items-center border-b shrink-0" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#0d0d12" }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold transition-all"
                  style={{ borderBottom:activeTab===tab.id?`2px solid ${currentMode.color}`:"2px solid transparent", color:activeTab===tab.id?currentMode.color:"#444", background:activeTab===tab.id?"rgba(6,182,212,0.05)":undefined }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            {activeTab==="shell" && <TerminalTab open={activeTab==="shell"} />}
            {activeTab==="git" && <GitPanel />}
            {activeTab==="chat" && (
              <>
                {/* Session tabs */}
                <div className="flex items-center gap-0 px-2 pt-1.5 shrink-0 border-b" style={{ borderColor:"rgba(255,255,255,0.05)", background:"#0e0e14" }}>
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                    {sessions.map(s => (
                      <div key={s.id} className="flex items-center gap-1 group shrink-0" style={{ borderBottom:s.id===activeId?`2px solid ${currentMode.color}`:"2px solid transparent", paddingBottom:2 }}>
                        <button onClick={()=>setActiveId(s.id)} className="flex items-center gap-1.5 px-2 py-1 rounded-t text-[10px] font-mono" style={{ color:s.id===activeId?currentMode.color:"#444" }}>
                          <Terminal className="w-2.5 h-2.5"/>{s.name}
                          <span className="text-[8px] ml-0.5 opacity-60">{MODES.find(m=>m.id===s.mode)?.label??s.mode}</span>
                        </button>
                        {sessions.length>1&&<button onClick={()=>closeSession(s.id)} className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-500"><X className="w-2.5 h-2.5"/></button>}
                      </div>
                    ))}
                  </div>
                  <button onClick={newSession} className="p-1.5 shrink-0 text-gray-700 hover:text-gray-400"><Plus className="w-3.5 h-3.5"/></button>
                </div>

                {/* Path bar */}
                <div className="flex items-center gap-2 px-4 py-1 shrink-0" style={{ background:"#0e0e14", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <Terminal className="w-3 h-3" style={{ color:"#333" }}/>
                  <span className="text-[9px] font-mono" style={{ color:"#333" }}>~/workspace</span>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background:"rgba(6,182,212,0.08)", color:"#0e7490", border:"1px solid rgba(8,145,178,0.15)" }}>
                    {currentMode.id==="ultracode"?"bypass permissions on":`effort: ${currentMode.id}`}
                  </span>
                  <div className="ml-auto flex items-center gap-2 text-[9px] font-mono" style={{ color:"#083344" }}>
                    <span>{activeSession?.messages.length??0} msgs</span><span>·</span>
                    <span>{activeSession?estimateCost(activeSession.tokensIn,activeSession.tokensOut,activeSession.mode):"$0"}</span>
                    {running&&<span className="animate-pulse" style={{ color:"#06b6d4" }}>⬤ running</span>}
                  </div>
                </div>

                {/* File upload panel */}
                <AnimatePresence>
                  {showFiles&&(
                    <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden shrink-0">
                      <div className="border-b shrink-0" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#0e0e14" }}>
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-3 h-3" style={{ color:"#555" }}/>
                            <span className="text-[9px] font-mono font-bold" style={{ color:"#444" }}>UPLOADED FILES</span>
                            {(activeSession?.files??[]).length>0&&<span className="text-[8px] px-1 rounded font-mono" style={{ background:"rgba(6,182,212,0.15)", color:"#06b6d4" }}>{(activeSession?.files??[]).length}</span>}
                          </div>
                          <button onClick={()=>{ const el=document.createElement("input"); el.type="file"; el.onchange=async()=>{ const f=el.files?.[0]; if(!f) return; const c=await f.text(); addFile({name:f.name,content:c,updatedAt:Date.now()}); }; el.click(); }}
                            className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color:"#555", border:"1px solid rgba(255,255,255,0.06)" }}>
                            <Upload className="w-2.5 h-2.5"/> رفع
                          </button>
                        </div>
                        {(activeSession?.files??[]).length>0&&(
                          <div className="flex flex-wrap gap-1 px-3 pb-2">
                            {(activeSession?.files??[]).map(f => (
                              <div key={f.name} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono group" style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.2)", color:"#67e8f9" }}>
                                <FileText className="w-2.5 h-2.5"/>{f.name}
                                <button onClick={()=>removeFile(f.name)} className="ml-1 opacity-0 group-hover:opacity-100 text-red-500"><X className="w-2.5 h-2.5"/></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Agent step indicator */}
                {running&&agentStep>0&&<AgentStepIndicator step={agentStep} max={MAX_AGENT_STEPS}/>}

                {/* Main content area */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  <AnimatePresence>
                    {showFileTree&&(
                      <motion.div initial={{width:0,opacity:0}} animate={{width:220,opacity:1}} exit={{width:0,opacity:0}} transition={{duration:0.2}} className="overflow-hidden shrink-0">
                        <FileTreePanel onAddToContext={addFile}/>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Terminal output */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 font-mono min-h-0" style={{ background:"#0c0c10" }}>
                    {logs.length===0&&(
                      <div className="flex flex-col items-center justify-center h-full gap-4 pb-8">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.2)" }}>
                          <Terminal className="w-7 h-7" style={{ color:"rgba(6,182,212,0.5)" }}/>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold mb-1" style={{ color:"#083344" }}>{currentProvider.name} · {currentMode.model}</div>
                          <div className="text-[10px] font-mono" style={{ color:"#1e1530" }}>
                            {agentLoop?"Agent Loop ON — auto-executes Bash/ReadFile/WriteFile tools":`Manual mode — ${currentMode.id}`}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 w-full max-w-sm px-4">
                          {QUICK_PROMPTS.map(p => (
                            <button key={p} onClick={()=>{ setInput(p); inputRef.current?.focus(); }}
                              className="text-left px-2 py-1.5 rounded-lg text-[9px] font-mono transition-all"
                              style={{ background:"#0e0e14", border:"1px solid rgba(255,255,255,0.05)", color:"#3a3060" }}
                              onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(6,182,212,0.3)"; e.currentTarget.style.color="#0891b2"; }}
                              onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"; e.currentTarget.style.color="#3a3060"; }}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <AnimatePresence initial={false}>
                      {logs.map((block,i) => (
                        <motion.div key={i} initial={{opacity:0,x:-3}} animate={{opacity:1,x:0}} transition={{duration:0.1}}>
                          <LogBlockView block={block} onToggleThinking={toggleThinking}/>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={logsEndRef}/>
                  </div>
                </div>

                {/* Context meter */}
                <ContextMeter msgs={activeSession?.messages??[]} provider={provider}/>

                {/* Input bar */}
                <div className="px-4 py-2 border-t shrink-0" style={{ borderColor:"rgba(255,255,255,0.06)", background:"#0e0e14" }}>
                  <div className="flex items-end gap-2">
                    <ChevronRight className="w-4 h-4 mb-2 flex-shrink-0" style={{ color:"#4ade80" }}/>
                    <textarea ref={inputRef} value={input}
                      onChange={e=>{ const v=e.target.value; setInput(v); if(v.startsWith("/")&&(v.endsWith(" ")||v==="/clear"||v==="/new"||v==="/key"||v==="/agent")) handleCommand(v); }}
                      onKeyDown={handleKeyDown} rows={1}
                      placeholder={running?"Running... (Esc to stop)":`[${currentMode.id}] اكتب هنا... أو /clear /new /key /agent`}
                      disabled={running}
                      className="flex-1 bg-transparent text-[12px] font-mono outline-none resize-none placeholder:text-gray-800 text-gray-200"
                      style={{ lineHeight:"1.5", maxHeight:120 }}
                      onInput={e=>{ const el=e.currentTarget; el.style.height="auto"; el.style.height=Math.min(el.scrollHeight,120)+"px"; }}/>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-shrink-0">
                      {running?(
                        <button onClick={stop} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold" style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.35)", color:"#f87171" }}>
                          <Square className="w-3 h-3 fill-current"/> Stop
                        </button>
                      ):(
                        <button onClick={execute} disabled={!input.trim()} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold disabled:opacity-30 transition-all"
                          style={{ background:currentMode.id==="ultracode"?"rgba(6,182,212,0.2)":"rgba(6,182,212,0.12)", border:`1px solid ${currentMode.color}40`, color:currentMode.color }}>
                          <Play className="w-3 h-3 fill-current"/> Run
                        </button>
                      )}
                      <button onClick={()=>{ setLogs([]); upd(activeId,{messages:[]}); }} className="p-1 rounded text-gray-700 hover:text-gray-500" title="Clear">
                        <RotateCcw className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>{ const t=logs.filter(b=>b.kind==="text"||b.kind==="user").map(b=>(b as {text:string}).text).join("\n\n"); navigator.clipboard.writeText(t); }}
                        className="p-1 rounded text-gray-700 hover:text-gray-500" title="Copy">
                        <Download className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono mt-0.5 pl-6" style={{ color:"#083344" }}>
                    Shift+Enter سطر جديد · /agent تبديل الوكيل · /clear مسح · /key تغيير المفتاح
                  </div>
                </div>

                {/* Mode Slider */}
                <div className="shrink-0 relative overflow-hidden" style={{ background:"linear-gradient(135deg,#1e1030 0%,#150d2a 40%,#1a0a3d 70%,#0f0720 100%)", borderTop:"1px solid rgba(6,182,212,0.15)" }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(ellipse 50% 100% at ${(modeIdx/(MODES.length-1))*100}% 50%,rgba(6,182,212,0.15) 0%,transparent 70%)` }}/>
                  <div className="relative px-6 py-3">
                    <div className="relative flex items-center mt-1">
                      <div className="absolute top-[5px] left-0 right-0 h-0.5" style={{ background:"rgba(255,255,255,0.06)" }}/>
                      <div className="absolute top-[5px] left-0 h-0.5 transition-all duration-400" style={{ width:`${(modeIdx/(MODES.length-1))*100}%`, background:`linear-gradient(to right,rgba(6,182,212,0.4),${currentMode.color})` }}/>
                      {MODES.map((m,idx) => {
                        const isActive=m.id===activeSession?.mode, isPast=idx<=modeIdx;
                        return (
                          <div key={m.id} className="flex-1 flex flex-col items-center relative">
                            <button onClick={()=>!running&&setMode(m.id)} disabled={running} className="flex flex-col items-center gap-0.5">
                              <div className="relative z-10 rounded-full transition-all duration-300" style={{ width:isActive?12:7, height:isActive?12:7, background:isActive?m.color:isPast?"rgba(6,182,212,0.45)":"rgba(255,255,255,0.1)", boxShadow:isActive?`0 0 10px ${m.color},0 0 20px ${m.color}60`:undefined }}/>
                              <span className="text-[8px] font-mono font-bold mt-1" style={{ color:isActive?m.color:"#0c4a5f" }}>{m.label}</span>
                              {m.sub&&<span className="text-[7px] font-mono" style={{ color:isActive?"#0e7490":"#221a38" }}>{m.sub}</span>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-mono" style={{ color:"#0c4a5f" }}>
                        {running?<span className="animate-pulse" style={{ color:"#06b6d4" }}>{currentMode.id==="ultracode"?"Ultracode running...":currentMode.id+" running..."}</span>:currentMode.model}
                      </span>
                      <span className="text-[8px] font-mono" style={{ color:"#2a2044" }}>Esc stop · Enter run</span>
                    </div>
                  </div>
                </div>
              </>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
