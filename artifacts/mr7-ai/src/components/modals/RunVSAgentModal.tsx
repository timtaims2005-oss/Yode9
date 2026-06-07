import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Square, Copy, CheckCheck, GitMerge, Code2, Terminal, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface RunVSAgentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type RunLang = "python" | "javascript" | "typescript" | "bash" | "go" | "rust";
const LANGS: { id: RunLang; label: string; placeholder: string }[] = [
  { id: "python",     label: "Python",     placeholder: "print('Hello World')" },
  { id: "javascript", label: "JavaScript", placeholder: "console.log('Hello World')" },
  { id: "typescript", label: "TypeScript", placeholder: "const msg: string = 'Hello'\nconsole.log(msg)" },
  { id: "bash",       label: "Bash",       placeholder: "echo 'Hello World'\nls -la" },
  { id: "go",         label: "Go",         placeholder: 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello")\n}' },
  { id: "rust",       label: "Rust",       placeholder: 'fn main() {\n  println!("Hello World");\n}' },
];

const TEMPLATES: Record<RunLang, { name: string; code: string }[]> = {
  python: [
    { name: "HTTP Request", code: `import requests\nresponse = requests.get('https://api.github.com')\nprint(response.status_code)\nprint(response.json()['current_user_url'])` },
    { name: "Data Analysis", code: `import statistics\ndata = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\nprint(f'Mean: {statistics.mean(data)}')\nprint(f'Stdev: {statistics.stdev(data):.2f}')` },
  ],
  javascript: [
    { name: "Fetch API", code: `fetch('https://jsonplaceholder.typicode.com/posts/1')\n  .then(r => r.json())\n  .then(data => console.log(data.title))` },
    { name: "Array ops", code: `const nums = [1,2,3,4,5]\nconst doubled = nums.map(n => n * 2)\nconst sum = doubled.reduce((a,b) => a+b, 0)\nconsole.log({ doubled, sum })` },
  ],
  typescript: [{ name: "Type Example", code: `interface User {\n  id: number\n  name: string\n}\nconst user: User = { id: 1, name: 'Alice' }\nconsole.log(user)` }],
  bash: [
    { name: "System Info", code: `echo "OS: $(uname -s)"\necho "User: $(whoami)"\necho "Dir: $(pwd)"` },
  ],
  go: [{ name: "Hello", code: `package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello from Go!")\n}` }],
  rust: [{ name: "Hello", code: `fn main() {\n  println!("Hello from Rust!");\n}` }],
};

export function RunVSAgentModal({ open, onOpenChange }: RunVSAgentModalProps) {
  const [lang, setLang] = useState<RunLang>("python");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function runCode() {
    if (!code.trim() || running) return;
    setRunning(true);
    setOutput("");
    setError("");

    const prompt = `Execute this ${lang} code and simulate its output precisely. If there are errors, show the exact error message.
Show ONLY the program output or error, nothing else.

\`\`\`${lang}
${code}
\`\`\``;

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a ${lang} interpreter/compiler. When given code, simulate its exact execution and output. Show ONLY the program's stdout/stderr output, no explanations.` },
            { role: "user", content: prompt },
          ],
          model: "gpt-5.4",
          stream: true,
        }),
        signal: abortRef.current.signal,
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try { const chunk = JSON.parse(raw); const delta = chunk.content ?? chunk.choices?.[0]?.delta?.content ?? ""; full += delta; setOutput(full); } catch { /* ignore */ }
        }
      }
      pipeline.push({ source: "RVSAGENT", sourceColor: "#a78bfa", label: `Run ${lang}`, content: `CODE:\n${code}\n\nOUTPUT:\n${full}` });
    } catch { /* ignore */ }
    setRunning(false);
  }

  async function aiFixCode() {
    if (!code.trim() || running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Fix and improve this ${lang} code. Return ONLY the fixed code, no explanations:\n\`\`\`${lang}\n${code}\n\`\`\`` }],
          model: "gpt-5.4",
          stream: false,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const match = text.match(/```(?:\w+)?\n?([\s\S]*?)```/);
      if (match) setCode(match[1].trim());
    } catch { /* ignore */ }
    setRunning(false);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.88)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 0 60px rgba(167,139,250,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.4)" }}>
                  <Code2 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#a78bfa" }}>RUN VS AGENT</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>AI-simulated code execution environment</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={aiFixCode} disabled={running || !code.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border disabled:opacity-30"
                  style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                  AI Fix
                </button>
                <button onClick={() => { setCode(""); setOutput(""); setError(""); }} className="p-1.5 text-gray-600 hover:text-purple-400"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Lang tabs + templates */}
            <div className="px-4 py-2.5 border-b space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1.5 flex-wrap">
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => setLang(l.id)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={{ background: lang === l.id ? "rgba(167,139,250,0.15)" : "transparent", borderColor: lang === l.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)", color: lang === l.id ? "#a78bfa" : "#444" }}>
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(TEMPLATES[lang] ?? []).map((t) => (
                  <button key={t.name} onClick={() => setCode(t.code)}
                    className="px-2 py-0.5 rounded text-[9px] font-bold border transition-all"
                    style={{ background: "rgba(167,139,250,0.05)", borderColor: "rgba(167,139,250,0.15)", color: "#555" }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Code editor + output */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <textarea value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder={LANGS.find((l) => l.id === lang)?.placeholder}
                  className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-[11px]"
                  style={{ color: "#ccc", minHeight: 180 }} />
              </div>
              {/* Run button */}
              <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={running ? () => abortRef.current?.abort() : runCode}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold border"
                  style={{ background: running ? "rgba(226,18,39,0.1)" : "rgba(167,139,250,0.15)", borderColor: running ? "rgba(226,18,39,0.4)" : "rgba(167,139,250,0.5)", color: running ? "#e21227" : "#a78bfa" }}>
                  {running ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Run {LANGS.find((l) => l.id === lang)?.label}</>}
                </button>
                {output && (
                  <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#444" }}>
                    {copied ? <CheckCheck className="w-3 h-3" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
                {output && (
                  <button onClick={() => pipeline.push({ source: "RVSAGENT", sourceColor: "#a78bfa", label: `${lang} output`, content: output })}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border"
                    style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                    <GitMerge className="w-3 h-3" /> Pipe
                  </button>
                )}
              </div>
              {/* Output panel */}
              <div className="overflow-y-auto p-4 font-mono text-[11px]" style={{ background: "#030303", minHeight: 100, maxHeight: 200 }}>
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-3 h-3" style={{ color: "#333" }} />
                  <span className="text-[9px] font-mono" style={{ color: "#333" }}>OUTPUT</span>
                </div>
                {!output && !running && <div style={{ color: "#2a2a2a" }}>// Run code to see output</div>}
                {running && <div className="animate-pulse" style={{ color: "#a78bfa" }}>Executing…</div>}
                {(error || output) && <div style={{ color: error ? "#e21227" : "#10b981", whiteSpace: "pre-wrap" }}>{error || output}</div>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
