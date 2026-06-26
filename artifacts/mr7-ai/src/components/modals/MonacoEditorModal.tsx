import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Code2, Play, Copy, Download, Upload, Trash2, Settings2,
  ChevronDown, Terminal, Save, FileCode, Zap, RefreshCw, Share2,
  AlignLeft, Maximize2, Minimize2, Brain, Wand2, Bug, MessageSquare,
  Shield, TestTube, Sparkles, Loader2, Check, SidebarOpen, SidebarClose,
  Lightbulb, Scissors, FileSearch, Languages,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/chat-client";

interface Props {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  initialLang?: string;
  onSendToChat?: (code: string, lang: string) => void;
}

type Lang = "javascript" | "typescript" | "python" | "bash" | "go" | "rust" | "java" | "cpp" | "csharp" | "php" | "ruby" | "html" | "css" | "json" | "yaml" | "sql" | "markdown" | "plaintext";

const LANG_LIST: { id: Lang; label: string; ext: string; comment: string }[] = [
  { id: "javascript", label: "JavaScript", ext: "js", comment: "//" },
  { id: "typescript", label: "TypeScript", ext: "ts", comment: "//" },
  { id: "python", label: "Python", ext: "py", comment: "#" },
  { id: "bash", label: "Bash", ext: "sh", comment: "#" },
  { id: "go", label: "Go", ext: "go", comment: "//" },
  { id: "rust", label: "Rust", ext: "rs", comment: "//" },
  { id: "java", label: "Java", ext: "java", comment: "//" },
  { id: "cpp", label: "C++", ext: "cpp", comment: "//" },
  { id: "csharp", label: "C#", ext: "cs", comment: "//" },
  { id: "php", label: "PHP", ext: "php", comment: "//" },
  { id: "ruby", label: "Ruby", ext: "rb", comment: "#" },
  { id: "html", label: "HTML", ext: "html", comment: "<!--" },
  { id: "css", label: "CSS", ext: "css", comment: "/*" },
  { id: "json", label: "JSON", ext: "json", comment: "" },
  { id: "yaml", label: "YAML", ext: "yaml", comment: "#" },
  { id: "sql", label: "SQL", ext: "sql", comment: "--" },
  { id: "markdown", label: "Markdown", ext: "md", comment: "" },
  { id: "plaintext", label: "Plain Text", ext: "txt", comment: "" },
];

const SEED_CODE: Partial<Record<Lang, string>> = {
  javascript: `// JavaScript — KaliGPT Editor
function exploit(target) {
  const payload = btoa(JSON.stringify({ target, ts: Date.now() }));
  return \`\${target}?q=\${payload}\`;
}

// Test it
const result = exploit("https://target.local/api");
console.log("Payload:", result);
`,
  python: '#!/usr/bin/env python3\n# Python — KaliGPT Editor\n\nimport sys\n\ndef scan_ports(host, ports):\n    """Quick port probe"""\n    import socket\n    open_ports = []\n    for port in ports:\n        s = socket.socket()\n        s.settimeout(0.3)\n        if s.connect_ex((host, port)) == 0:\n            open_ports.append(port)\n        s.close()\n    return open_ports\n\nif __name__ == "__main__":\n    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"\n    ports = range(1, 1025)\n    print("Scanning", host, "...")\n    found = scan_ports(host, ports)\n    print("Open ports:", found)\n',
  bash: '#!/bin/bash\n# Bash — KaliGPT Editor\n\nTARGET=${1:-"127.0.0.1"}\nWORDLIST="/usr/share/wordlists/dirb/common.txt"\n\necho "[*] Recon on $TARGET"\necho "[*] Checking open ports..."\nnmap -sS -T4 --top-ports 1000 $TARGET 2>/dev/null\n\necho ""\necho "[*] Dir brute force..."\nif command -v gobuster &>/dev/null; then\n  gobuster dir -u "http://$TARGET" -w $WORDLIST -q\nfi\n\necho "[+] Done."\n',
  typescript: `// TypeScript — KaliGPT Editor
interface Target {
  host: string;
  port: number;
  protocol: "http" | "https";
}

async function probe(target: Target): Promise<{ status: number; headers: Record<string, string> }> {
  const url = \`\${target.protocol}://\${target.host}:\${target.port}\`;
  const resp = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
  const headers: Record<string, string> = {};
  resp.headers.forEach((v, k) => { headers[k] = v; });
  return { status: resp.status, headers };
}

// Run probe
probe({ host: "target.local", port: 443, protocol: "https" })
  .then(r => console.log("Status:", r.status, "\\nHeaders:", r.headers))
  .catch(e => console.error("Error:", e.message));
`,
};

const THEMES = {
  "Kali Dark": { bg: "#0a0a14", text: "#e2e8f0", lineNum: "#3a3a5c", border: "#1e1e3a", keyword: "#e21227", string: "#10b981", comment: "#4a4a7a", number: "#f59e0b", func: "#60a5fa" },
  "Matrix": { bg: "#000a00", text: "#00ff41", lineNum: "#003300", border: "#004400", keyword: "#00ff41", string: "#39ff14", comment: "#006600", number: "#aaff00", func: "#00cc33" },
  "Midnight": { bg: "#0d0d1f", text: "#cdd6f4", lineNum: "#2a2a4a", border: "#1e1e3e", keyword: "#cba6f7", string: "#a6e3a1", comment: "#6c7086", number: "#fab387", func: "#89b4fa" },
  "Solarized": { bg: "#002b36", text: "#839496", lineNum: "#073642", border: "#073642", keyword: "#268bd2", string: "#2aa198", comment: "#586e75", number: "#d33682", func: "#859900" },
};

type ThemeName = keyof typeof THEMES;

type AIAction = "explain" | "fix" | "comment" | "refactor" | "security" | "tests" | "complete" | "optimize";

const AI_ACTIONS: { id: AIAction; label: string; icon: typeof Brain; color: string; prompt: (code: string, lang: string) => string }[] = [
  {
    id: "explain", label: "Explain Code", icon: Lightbulb, color: "#3b82f6",
    prompt: (code, lang) => `Explain the following ${lang} code clearly and concisely. Describe what it does, how it works, and any important patterns or techniques used:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "fix", label: "Fix Bugs", icon: Bug, color: "#e21227",
    prompt: (code, lang) => `Find and fix all bugs, errors, and issues in the following ${lang} code. Show the corrected code with explanations of what was wrong:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "comment", label: "Add Comments", icon: MessageSquare, color: "#10b981",
    prompt: (code, lang) => `Add comprehensive, professional inline comments to the following ${lang} code. Explain the logic, parameters, and return values:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "refactor", label: "Refactor", icon: Scissors, color: "#a78bfa",
    prompt: (code, lang) => `Refactor the following ${lang} code to improve readability, maintainability, and performance. Apply best practices and design patterns:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "security", label: "Security Audit", icon: Shield, color: "#f59e0b",
    prompt: (code, lang) => `Perform a comprehensive security audit of the following ${lang} code. Identify vulnerabilities, security flaws, injection risks, and provide secure alternatives:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "tests", label: "Generate Tests", icon: TestTube, color: "#06b6d4",
    prompt: (code, lang) => `Generate comprehensive unit tests for the following ${lang} code. Cover normal cases, edge cases, and error scenarios:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "complete", label: "Complete Code", icon: Sparkles, color: "#ec4899",
    prompt: (code, lang) => `Complete and extend the following ${lang} code. Add missing functionality, error handling, and make it production-ready:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
  {
    id: "optimize", label: "Optimize", icon: Zap, color: "#f97316",
    prompt: (code, lang) => `Optimize the following ${lang} code for maximum performance. Reduce complexity, improve efficiency, and explain the optimizations:\n\n\`\`\`${lang}\n${code}\n\`\`\``,
  },
];

export function MonacoEditorModal({ open, onClose, initialCode, initialLang = "python", onSendToChat }: Props) {
  const { toast } = useToast();
  const [lang, setLang] = useState<Lang>(initialLang as Lang);
  const [code, setCode] = useState(initialCode || SEED_CODE[initialLang as Lang] || "");
  const [theme, setTheme] = useState<ThemeName>("Kali Dark");
  const [fontSize, setFontSize] = useState(13);
  const [lineNums, setLineNums] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [tabSize, setTabSize] = useState(2);
  const [fileHistory, setFileHistory] = useState<{ code: string; label: string }[]>([]);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [aiAction, setAiAction] = useState<AIAction | null>(null);
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const tColors = THEMES[theme];

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (initialLang && LANG_LIST.find(l => l.id === initialLang)) {
      setLang(initialLang as Lang);
    }
  }, [initialLang]);

  const handleLangChange = useCallback((newLang: Lang) => {
    setLang(newLang);
    setLangOpen(false);
    if (!code.trim() || code === SEED_CODE[lang]) {
      setCode(SEED_CODE[newLang] || "");
    }
  }, [code, lang]);

  function lineCount(): number { return code.split("\n").length; }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const indent = " ".repeat(tabSize);
      const newCode = code.substring(0, start) + indent + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + tabSize; });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveToHistory(); }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); toggleComment(); }
  }

  function saveToHistory() {
    const preview = code.slice(0, 40).replace(/\n/g, "↵");
    setFileHistory(h => [{ code, label: `${new Date().toLocaleTimeString()} — ${preview}` }, ...h.slice(0, 9)]);
    toast({ description: "Saved to history." });
  }

  function toggleComment() {
    const ta = textRef.current;
    if (!ta) return;
    const langInfo = LANG_LIST.find(l => l.id === lang);
    const commentChar = langInfo?.comment || "//";
    if (!commentChar) return;
    const start = ta.selectionStart;
    const lines = code.split("\n");
    let pos = 0;
    const startLine = lines.findIndex((_, i) => {
      const lineEnd = pos + lines[i].length + 1;
      const found = pos <= start && start < lineEnd;
      pos = lineEnd;
      return found;
    });
    if (startLine >= 0) {
      const line = lines[startLine];
      lines[startLine] = line.trimStart().startsWith(commentChar)
        ? line.replace(commentChar, "").trimStart()
        : commentChar + " " + line;
      setCode(lines.join("\n"));
    }
  }

  async function runAI(action?: AIAction, customPrompt?: string) {
    const selectedAction = action ?? aiAction;
    const actionDef = AI_ACTIONS.find(a => a.id === selectedAction);
    if (!actionDef && !customPrompt) return;
    if (!code.trim() && !customPrompt) { toast({ description: "Write some code first." }); return; }

    setAiLoading(true);
    setAiOutput("");
    if (action) setAiAction(action);

    const prompt = customPrompt || actionDef!.prompt(code, LANG_LIST.find(l => l.id === lang)?.label || lang);
    let acc = "";
    try {
      await streamChat(
        {
          model: "CHAT-GPT Pro", persona: null, customInstructions: "",
          language: "en", memory: [], mode: "chat",
          messages: [{ role: "user", content: prompt }],
          webContext: null,
          customSystemPrompt: "You are an expert software engineer and security researcher. Provide clear, accurate, production-ready code and analysis.",
          provider: "personal", providerModel: "gpt-3.5-turbo",
        },
        (chunk) => { acc += chunk; setAiOutput(acc); },
      );
    } catch {
      acc += "\n\n[AI error — check connection]";
      setAiOutput(acc);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAICode() {
    const match = aiOutput.match(/```(?:\w+)?\n([\s\S]+?)```/);
    if (match) {
      setCode(match[1]);
      toast({ description: "AI code applied to editor." });
    } else {
      toast({ description: "No code block found in AI output." });
    }
  }

  function copyAIOutput() {
    navigator.clipboard.writeText(aiOutput);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
    toast({ description: "AI output copied." });
  }

  function handleRun() {
    setRunning(true);
    setOutputOpen(true);
    setOutput("");
    setTimeout(() => {
      const langInfo = LANG_LIST.find(l => l.id === lang);
      const lines = code.split("\n").length;
      const words = code.split(/\s+/).length;
      if (lang === "javascript") {
        try {
          const logs: string[] = [];
          const _console = { log: (...a: unknown[]) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")), error: (...a: unknown[]) => logs.push("[ERROR] " + a.join(" ")), warn: (...a: unknown[]) => logs.push("[WARN] " + a.join(" ")) };
          const fn = new Function("console", code);
          fn(_console);
          setOutput(logs.join("\n") || "[No output — add console.log() calls]");
        } catch (e: unknown) {
          setOutput(`[Runtime Error]\n${(e as Error).message}`);
        }
      } else {
        setOutput(`[KaliGPT Code Runner — ${langInfo?.label || lang}]\nLines: ${lines} · Chars: ${code.length} · ~${Math.ceil(code.length / 4)} tokens\n\n${code.slice(0, 500)}${code.length > 500 ? "\n...[truncated]" : ""}\n\n[Live ${lang} execution requires backend sandbox — use "Analyze with AI" for code review]`);
      }
      setRunning(false);
    }, 500);
  }

  function handleDownload() {
    const langInfo = LANG_LIST.find(l => l.id === lang);
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kaligpt_code.${langInfo?.ext || "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Downloaded." });
  }

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".js,.ts,.py,.sh,.go,.rs,.java,.cpp,.cs,.php,.rb,.html,.css,.json,.yaml,.sql,.md,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCode(ev.target?.result as string || "");
        const ext = file.name.split(".").pop() || "";
        const found = LANG_LIST.find(l => l.ext === ext);
        if (found) setLang(found.id);
        toast({ description: `Loaded: ${file.name}` });
      };
      reader.readAsText(file);
    };
    input.click();
  }

  const lines = code.split("\n");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed z-50 flex items-center justify-center ${fullscreen ? "inset-0" : "inset-0 p-2"}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={!fullscreen ? onClose : undefined} />
          <motion.div
            className={`relative flex overflow-hidden ${fullscreen ? "w-full h-full" : "w-full max-h-[93vh] rounded-[18px]"}`}
            style={{ background: tColors.bg, border: `1px solid ${tColors.border}` }}
            initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}>

            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tColors.keyword}80, transparent)` }} />

            {/* Main editor column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${tColors.border}` }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#e21227]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
                    <div className="w-3 h-3 rounded-full bg-[#10b981]/80" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" style={{ color: tColors.keyword }} />
                    <span className="text-[12px] font-bold" style={{ color: tColors.text }}>KaliGPT Code Editor</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${tColors.keyword}20`, color: tColors.keyword, border: `1px solid ${tColors.keyword}40` }}>
                      {LANG_LIST.find(l => l.id === lang)?.label || lang}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Lang selector */}
                  <div className="relative">
                    <button onClick={() => setLangOpen(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ background: tColors.border, color: tColors.text, border: `1px solid ${tColors.border}` }}>
                      {LANG_LIST.find(l => l.id === lang)?.ext.toUpperCase() || "TXT"}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {langOpen && (
                      <div className="absolute top-full mt-1 right-0 z-50 rounded-lg overflow-hidden shadow-2xl" style={{ background: tColors.bg, border: `1px solid ${tColors.border}`, maxHeight: 240, overflowY: "auto" }}>
                        {LANG_LIST.map(l => (
                          <button key={l.id} onClick={() => handleLangChange(l.id)}
                            className="w-full px-3 py-1.5 text-left text-[11px] hover:opacity-80 transition-opacity"
                            style={{ color: lang === l.id ? tColors.keyword : tColors.text, background: lang === l.id ? `${tColors.keyword}15` : "transparent" }}>
                            {l.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Theme selector */}
                  <div className="relative">
                    <button onClick={() => setThemeOpen(v => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ background: tColors.border, color: tColors.text, border: `1px solid ${tColors.border}` }}>
                      <span className="hidden sm:inline">{theme}</span>
                      <span className="sm:hidden">Theme</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {themeOpen && (
                      <div className="absolute top-full mt-1 right-0 z-50 rounded-lg overflow-hidden shadow-2xl" style={{ background: tColors.bg, border: `1px solid ${tColors.border}` }}>
                        {(Object.keys(THEMES) as ThemeName[]).map(t => (
                          <button key={t} onClick={() => { setTheme(t); setThemeOpen(false); }}
                            className="w-full px-3 py-1.5 text-left text-[11px] hover:opacity-80 transition-opacity"
                            style={{ color: theme === t ? tColors.keyword : tColors.text, background: theme === t ? `${tColors.keyword}15` : "transparent" }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleUpload} title="Upload file" className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: tColors.text }}>
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleDownload} title="Download" className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: tColors.text }}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(code); toast({ description: "Copied." }); }} title="Copy all" className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: tColors.text }}>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {onSendToChat && (
                    <button onClick={() => { onSendToChat(code, lang); onClose(); }} title="Send to Chat"
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ background: `${tColors.keyword}20`, color: tColors.keyword, border: `1px solid ${tColors.keyword}40` }}>
                      <Share2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                  )}
                  <button onClick={handleRun} disabled={running}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: running ? `${tColors.keyword}40` : `${tColors.keyword}25`, color: tColors.keyword, border: `1px solid ${tColors.keyword}50` }}>
                    {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{running ? "Running..." : "Run"}</span>
                  </button>
                  <button onClick={() => setAiSidebarOpen(v => !v)} title="Toggle AI Panel"
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all hover:opacity-80"
                    style={aiSidebarOpen
                      ? { background: "rgba(168,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(168,139,250,0.4)" }
                      : { background: tColors.border, color: tColors.text, border: `1px solid ${tColors.border}` }}>
                    <Brain className="w-3.5 h-3.5" /> AI
                  </button>
                  <button onClick={() => setFullscreen(v => !v)} className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: tColors.text }}>
                    {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  {!fullscreen && (
                    <button onClick={onClose} className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: tColors.text }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-3 px-4 py-1 shrink-0 text-[9px] font-mono" style={{ background: `${tColors.keyword}15`, borderBottom: `1px solid ${tColors.border}`, color: `${tColors.text}80` }}>
                <span>{lineCount()} lines</span>
                <span>·</span>
                <span>{code.length} chars</span>
                <span>·</span>
                <span>~{Math.ceil(code.length / 4)} tokens</span>
                <span>·</span>
                <button onClick={() => setWordWrap(v => !v)} className="hover:opacity-100 opacity-70">{wordWrap ? "Wrap ON" : "Wrap OFF"}</button>
                <span>·</span>
                <button onClick={() => setLineNums(v => !v)} className="hover:opacity-100 opacity-70">{lineNums ? "Lines ON" : "Lines OFF"}</button>
                <span>·</span>
                <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="hover:opacity-100 opacity-70 px-1">A-</button>
                <span className="opacity-70">{fontSize}px</span>
                <button onClick={() => setFontSize(s => Math.min(20, s + 1))} className="hover:opacity-100 opacity-70 px-1">A+</button>
                <span>·</span>
                <button onClick={saveToHistory} className="hover:opacity-100 opacity-70">Ctrl+S</button>
                <span>·</span>
                <button onClick={toggleComment} className="hover:opacity-100 opacity-70">Ctrl+/ comment</button>
                {fullscreen && (
                  <button onClick={onClose} className="ml-auto px-2 py-0.5 rounded text-[9px] hover:opacity-80" style={{ background: `${tColors.keyword}30`, color: tColors.keyword }}>
                    Close
                  </button>
                )}
              </div>

              {/* Editor area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto relative flex">
                  {lineNums && (
                    <div className="select-none shrink-0 overflow-hidden" style={{ background: tColors.bg, borderRight: `1px solid ${tColors.border}`, minWidth: 40 + String(lines.length).length * 6 }}>
                      <div className="pt-2 pb-2" style={{ fontSize }}>
                        {lines.map((_, i) => (
                          <div key={i} className="text-right pr-3 leading-6 text-[11px] font-mono" style={{ color: tColors.lineNum, lineHeight: `${fontSize * 1.6}px` }}>
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <textarea
                    ref={textRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="flex-1 resize-none outline-none p-2 font-mono caret-current selection:bg-blue-500/30"
                    style={{ background: tColors.bg, color: tColors.text, fontSize, lineHeight: `${fontSize * 1.6}px`, whiteSpace: wordWrap ? "pre-wrap" : "pre", overflowX: wordWrap ? "hidden" : "auto", tabSize }}
                  />
                </div>

                {/* Output panel */}
                <AnimatePresence>
                  {outputOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 160 }} exit={{ height: 0 }}
                      className="shrink-0 overflow-hidden" style={{ borderTop: `1px solid ${tColors.border}` }}>
                      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: `${tColors.keyword}10` }}>
                        <div className="flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" style={{ color: tColors.keyword }} />
                          <span className="text-[10px] font-mono" style={{ color: tColors.keyword }}>OUTPUT</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { navigator.clipboard.writeText(output); toast({ description: "Copied." }); }}
                            className="p-0.5 hover:opacity-70 transition-opacity" style={{ color: `${tColors.text}60` }}>
                            <Copy className="w-3 h-3" />
                          </button>
                          <button onClick={() => setOutputOpen(false)} className="hover:opacity-70" style={{ color: tColors.text }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 overflow-auto h-[120px] font-mono text-[11px] whitespace-pre-wrap" style={{ background: tColors.bg, color: tColors.text }}>
                        {running ? <span style={{ color: tColors.keyword }} className="animate-pulse">Running...</span> : output || <span style={{ color: `${tColors.text}40` }}>No output yet.</span>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History */}
                {fileHistory.length > 0 && (
                  <div className="shrink-0 px-3 py-2 flex items-center gap-2 overflow-x-auto" style={{ borderTop: `1px solid ${tColors.border}`, background: tColors.bg }}>
                    <span className="text-[9px] font-mono shrink-0" style={{ color: `${tColors.text}50` }}>HISTORY:</span>
                    {fileHistory.slice(0, 5).map((h, i) => (
                      <button key={i} onClick={() => setCode(h.code)}
                        className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono hover:opacity-80 transition-opacity truncate max-w-[150px]"
                        style={{ background: tColors.border, color: `${tColors.text}80` }}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 py-2 shrink-0 text-[9px] font-mono" style={{ borderTop: `1px solid ${tColors.border}`, background: `${tColors.keyword}08` }}>
                <div className="flex items-center gap-2" style={{ color: `${tColors.text}60` }}>
                  <Code2 className="w-3 h-3" style={{ color: tColors.keyword }} />
                  <span>KaliGPT Code Editor</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCode("")}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                    style={{ color: `${tColors.text}60`, border: `1px solid ${tColors.border}` }}>
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                  <button onClick={() => setCode(SEED_CODE[lang] || "")}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                    style={{ color: tColors.keyword, border: `1px solid ${tColors.keyword}40`, background: `${tColors.keyword}10` }}>
                    <Zap className="w-3 h-3" /> Sample
                  </button>
                </div>
              </div>
            </div>

            {/* AI Sidebar */}
            <AnimatePresence>
              {aiSidebarOpen && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col shrink-0 overflow-hidden"
                  style={{ borderLeft: `1px solid ${tColors.border}`, background: "#0a0a0a", width: 320 }}>

                  {/* AI header */}
                  <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: tColors.border, background: "#050505" }}>
                    <Brain className="w-4 h-4" style={{ color: "#a78bfa" }} />
                    <span className="text-[11px] font-black tracking-wide text-white">AI ASSISTANT</span>
                    <motion.div animate={{ opacity: aiLoading ? [1, 0.3, 1] : 1 }} transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: aiLoading ? "#a78bfa" : "#333" }} />
                  </div>

                  {/* Action buttons */}
                  <div className="p-2 border-b" style={{ borderColor: tColors.border }}>
                    <div className="text-[7px] font-black tracking-widest mb-2 px-1" style={{ color: "rgba(255,255,255,0.2)" }}>AI ACTIONS</div>
                    <div className="grid grid-cols-2 gap-1">
                      {AI_ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                          <button key={action.id} onClick={() => runAI(action.id)} disabled={aiLoading}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all hover:opacity-90 disabled:opacity-40 text-left"
                            style={aiAction === action.id && !aiLoading
                              ? { background: `${action.color}20`, borderColor: `${action.color}50`, color: action.color }
                              : { background: "rgba(255,255,255,0.03)", borderColor: "#1a1a1a", color: "rgba(255,255,255,0.5)" }}>
                            <Icon className="w-3 h-3 shrink-0" style={{ color: action.color }} />
                            <span className="leading-tight">{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom prompt */}
                  <div className="p-2 border-b" style={{ borderColor: tColors.border }}>
                    <div className="text-[7px] font-black tracking-widest mb-1.5 px-1" style={{ color: "rgba(255,255,255,0.2)" }}>CUSTOM PROMPT</div>
                    <div className="flex gap-1.5">
                      <textarea value={aiCustomPrompt} onChange={e => setAiCustomPrompt(e.target.value)}
                        placeholder="Ask AI anything about your code..."
                        className="flex-1 px-2 py-1.5 rounded-lg border outline-none font-mono text-[9px] resize-none"
                        style={{ background: "#111", borderColor: "#1f1f1f", color: "#ccc", minHeight: 52 }} />
                      <button onClick={() => { runAI(undefined, `${aiCustomPrompt}\n\nCode context:\n\`\`\`${lang}\n${code}\n\`\`\``); setAiCustomPrompt(""); }}
                        disabled={!aiCustomPrompt.trim() || aiLoading}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all hover:opacity-90 disabled:opacity-40 self-end"
                        style={{ background: "rgba(168,139,250,0.15)", borderColor: "rgba(168,139,250,0.35)", color: "#a78bfa" }}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* AI Output */}
                  <div className="flex-1 flex flex-col min-h-0">
                    {aiLoading && !aiOutput && (
                      <div className="flex items-center gap-2 px-3 py-3">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a78bfa" }} />
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>AI analyzing code...</span>
                      </div>
                    )}
                    {aiOutput && (
                      <>
                        <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: tColors.border }}>
                          <span className="text-[8px] font-black tracking-widest flex-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {AI_ACTIONS.find(a => a.id === aiAction)?.label?.toUpperCase() || "AI OUTPUT"}
                          </span>
                          {aiLoading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#a78bfa" }} />}
                          <button onClick={copyAIOutput} className="p-1 rounded hover:opacity-70" style={{ color: aiCopied ? "#10b981" : "rgba(255,255,255,0.3)" }}>
                            {aiCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={applyAICode}
                            className="text-[8px] font-bold px-2 py-0.5 rounded border transition-all hover:opacity-80"
                            style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>
                            Apply
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                          <pre className="text-[9px] font-mono whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {aiOutput}
                          </pre>
                        </div>
                      </>
                    )}
                    {!aiOutput && !aiLoading && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-25">
                        <Brain className="w-8 h-8" style={{ color: "#a78bfa" }} />
                        <span className="text-[9px] font-mono text-center px-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Select an action or type a custom prompt to get AI analysis
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
