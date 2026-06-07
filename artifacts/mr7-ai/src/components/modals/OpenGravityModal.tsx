import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Code2, Play, Wand2, Bug, MessageSquare, Layers,
  Copy, CheckCheck, ChevronDown, RotateCcw, Sparkles, GitMerge,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pipeline } from "@/lib/pipeline";

interface OpenGravityModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineCode?: { text: string; key: number };
}

type AIAction = "complete" | "explain" | "refactor" | "debug" | "comment" | "test";
type Lang = "python" | "javascript" | "typescript" | "rust" | "go" | "bash" | "sql" | "c" | "cpp" | "java";

const LANGUAGES: { id: Lang; label: string; ext: string }[] = [
  { id: "python", label: "Python", ext: "py" },
  { id: "javascript", label: "JavaScript", ext: "js" },
  { id: "typescript", label: "TypeScript", ext: "ts" },
  { id: "rust", label: "Rust", ext: "rs" },
  { id: "go", label: "Go", ext: "go" },
  { id: "bash", label: "Bash", ext: "sh" },
  { id: "sql", label: "SQL", ext: "sql" },
  { id: "c", label: "C", ext: "c" },
  { id: "cpp", label: "C++", ext: "cpp" },
  { id: "java", label: "Java", ext: "java" },
];

const ACTIONS: { id: AIAction; icon: typeof Wand2; label: string; desc: string; color: string }[] = [
  { id: "complete", icon: Sparkles, label: "Complete", desc: "Auto-complete the code below cursor", color: "#a78bfa" },
  { id: "explain", icon: MessageSquare, label: "Explain", desc: "Line-by-line explanation of the code", color: "#60a5fa" },
  { id: "refactor", icon: Wand2, label: "Refactor", desc: "Improve structure, readability, perf", color: "#34d399" },
  { id: "debug", icon: Bug, label: "Debug", desc: "Find and fix bugs in the code", color: "#f87171" },
  { id: "comment", icon: Layers, label: "Comment", desc: "Add inline documentation comments", color: "#fbbf24" },
  { id: "test", icon: Play, label: "Test", desc: "Generate unit tests for the code", color: "#fb923c" },
];

const SNIPPETS: { label: string; lang: Lang; code: string }[] = [
  { label: "Port Scanner", lang: "python", code: `import socket\nimport concurrent.futures\nfrom datetime import datetime\n\nHASH_LENGTHS = {32: "md5", 40: "sha1", 64: "sha256", 128: "sha512"}\n\ndef scan_port(host: str, port: int) -> tuple:\n    try:\n        with socket.create_connection((host, port), timeout=1):\n            return port, True\n    except (socket.timeout, ConnectionRefusedError, OSError):\n        return port, False\n\ndef port_scan(host: str, start: int = 1, end: int = 1024) -> list:\n    open_ports = []\n    print(f"[*] Scanning {host} ports {start}-{end} — {datetime.now():%H:%M:%S}")\n    with concurrent.futures.ThreadPoolExecutor(max_workers=150) as executor:\n        futures = {executor.submit(scan_port, host, p): p for p in range(start, end + 1)}\n        for future in concurrent.futures.as_completed(futures):\n            port, is_open = future.result()\n            if is_open:\n                try:\n                    service = socket.getservbyport(port)\n                except OSError:\n                    service = "unknown"\n                print(f"  [+] {port}/tcp  OPEN  ({service})")\n                open_ports.append(port)\n    print(f"[*] Done. {len(open_ports)} open ports found.")\n    return sorted(open_ports)\n\nif __name__ == "__main__":\n    port_scan("192.168.1.1", 1, 1024)\n` },
  { label: "Hash Cracker", lang: "python", code: `import hashlib\nimport sys\n\nHASH_LENGTHS = {32: "md5", 40: "sha1", 56: "sha224", 64: "sha256", 96: "sha384", 128: "sha512"}\n\ndef identify_hash(h: str) -> str:\n    return HASH_LENGTHS.get(len(h.strip()), "unknown")\n\ndef hash_word(word: str, algorithm: str) -> str:\n    h = hashlib.new(algorithm)\n    h.update(word.encode())\n    return h.hexdigest()\n\ndef crack_hash(target_hash: str, wordlist_path: str) -> str | None:\n    target = target_hash.strip().lower()\n    algo = identify_hash(target)\n    if algo == "unknown":\n        print(f"[-] Unknown hash length: {len(target)} chars")\n        return None\n    print(f"[*] Hash type: {algo.upper()}")\n    try:\n        with open(wordlist_path, encoding="utf-8", errors="ignore") as f:\n            for i, line in enumerate(f):\n                word = line.rstrip("\\n")\n                if hash_word(word, algo) == target:\n                    print(f"[+] CRACKED after {i+1:,} attempts: {word!r}")\n                    return word\n                if i % 100_000 == 0 and i:\n                    print(f"    {i:,} attempts…")\n    except FileNotFoundError:\n        print(f"[-] Wordlist not found: {wordlist_path}")\n        return None\n    print("[-] Not found in wordlist.")\n    return None\n\nif __name__ == "__main__":\n    crack_hash(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "/usr/share/wordlists/rockyou.txt")\n` },
  { label: "JWT Parser", lang: "javascript", code: `function base64UrlDecode(str) {\n  const pad = str.length % 4;\n  const padded = pad ? str + '='.repeat(4 - pad) : str;\n  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));\n}\n\nfunction parseJWT(token) {\n  const parts = token.split('.');\n  if (parts.length !== 3) throw new Error(\`Invalid JWT: expected 3 parts, got \${parts.length}\`);\n  const header  = JSON.parse(base64UrlDecode(parts[0]));\n  const payload = JSON.parse(base64UrlDecode(parts[1]));\n  return { header, payload, signature: parts[2] };\n}\n\nfunction checkJWTAlgo(token) {\n  const { header, payload } = parseJWT(token);\n  const vulns = [];\n  if (!header.alg || header.alg.toLowerCase() === 'none')\n    vulns.push('CRITICAL: "none" algorithm — no signature validation!');\n  if (header.alg?.startsWith('HS') && payload.iss)\n    vulns.push('MEDIUM: Check RS256→HS256 confusion if server uses public key as HMAC secret');\n  const expMs = payload.exp ? payload.exp * 1000 : null;\n  if (!expMs) vulns.push('MEDIUM: No "exp" claim — token never expires');\n  else if (expMs < Date.now()) vulns.push(\`INFO: Token expired at \${new Date(expMs).toISOString()}\`);\n  console.log('Header:',  header);\n  console.log('Payload:', payload);\n  console.log('Findings:', vulns.length ? vulns : ['None detected']);\n  return { header, payload, vulnerabilities: vulns };\n}\n\n// Demo with an alg:none token\nconst demo = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIn0.';\ncheckJWTAlgo(demo);\n` },
  { label: "SQL Injection", lang: "python", code: `import requests\nimport sys\n\nPAYLOADS = [\n    ("'",                          "quote"),\n    ("' OR '1'='1",                "classic-or"),\n    ("' OR 1=1--",                 "comment-or"),\n    ("1 AND SLEEP(3)--",           "time-blind"),\n    ("' UNION SELECT NULL,NULL--", "union-null"),\n    ("'; SELECT @@version--",      "mssql-version"),\n]\nERROR_SIGNS = [\n    "sql syntax", "mysql_fetch", "ORA-0", "syntax error",\n    "SQLSTATE", "unclosed quotation", "pg_query", "SQLiteException",\n]\n\ndef test_sqli(url: str, param: str, method: str = "GET") -> list:\n    findings = []\n    session = requests.Session()\n    session.headers["User-Agent"] = "Mozilla/5.0 Security-Test/1.0"\n    try:\n        baseline_len = len(session.get(url, timeout=8).text)\n    except Exception:\n        baseline_len = 0\n    for payload, ptype in PAYLOADS:\n        try:\n            args = {param: payload}\n            resp = session.get(url, params=args, timeout=10) if method == "GET" else session.post(url, data=args, timeout=10)\n            body = resp.text.lower()\n            for sign in ERROR_SIGNS:\n                if sign.lower() in body:\n                    findings.append({"payload": payload, "type": ptype, "sign": sign})\n                    print(f"  [!] {ptype}: triggered '{sign}' (HTTP {resp.status_code})")\n                    break\n            else:\n                if abs(len(resp.text) - baseline_len) > 50:\n                    print(f"  [?] {ptype}: response length changed ({baseline_len} → {len(resp.text)})")\n        except requests.RequestException as e:\n            print(f"  [x] {ptype}: {e}")\n    print(f"\\n[*] {len(findings)} confirmed findings on {url}")\n    return findings\n\nif __name__ == "__main__":\n    url   = sys.argv[1] if len(sys.argv) > 1 else "http://testphp.vulnweb.com/listproducts.php"\n    param = sys.argv[2] if len(sys.argv) > 2 else "cat"\n    test_sqli(url, param)\n` },
];

const SYSTEM_PROMPT = `You are OpenGravity AI — a senior software engineer and security researcher embedded in a code editor. Your responses focus purely on code: producing correct, idiomatic, production-quality solutions.

Rules:
- For COMPLETE: continue the code naturally from where it ends. No explanation, just code.
- For EXPLAIN: give a clear, technical line-by-line or section-by-section breakdown.
- For REFACTOR: rewrite the entire code with improvements. Show the full rewritten version.
- For DEBUG: identify all bugs, explain each one, then show the fixed version.
- For COMMENT: return the full code with comprehensive inline comments added.
- For TEST: generate comprehensive unit tests using appropriate test framework for the language.

Always wrap final code in a code block with the language identifier.`;

export function OpenGravityModal({ open, onOpenChange, pipelineCode }: OpenGravityModalProps) {
  const { state } = useStore();
  const { lang } = useT();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Lang>("python");
  const [action, setAction] = useState<AIAction>("explain");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef("");

  useEffect(() => {
    if (pipelineCode?.text) setCode(pipelineCode.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineCode?.key]);

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  async function run() {
    if (!code.trim() || running) return;
    setOutput("");
    outputRef.current = "";
    setRunning(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const actionLabel = ACTIONS.find((a) => a.id === action)?.label ?? action;
    const userMsg = `Language: ${language}\nAction: ${actionLabel}\n\n\`\`\`${language}\n${code}\n\`\`\``;

    try {
      await streamChat(
        {
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          language: (lang as "en" | "ar") ?? "en",
          memory: [],
          messages: [{ role: "user", content: userMsg }],
          customSystemPrompt: SYSTEM_PROMPT,
        },
        (chunk) => {
          outputRef.current += chunk;
          setOutput(outputRef.current);
        },
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setOutput(`Error: ${(e as Error)?.message ?? "Request failed"}`);
      }
    } finally {
      setRunning(false);
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadSnippet(s: typeof SNIPPETS[0]) {
    setCode(s.code);
    setLanguage(s.lang);
  }

  if (!open) return null;

  const activeLang = LANGUAGES.find((l) => l.id === language)!;

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#070b12",
              border: "1px solid rgba(167,139,250,0.25)",
              boxShadow: "0 0 70px rgba(167,139,250,0.12), 0 30px 60px rgba(0,0,0,0.9)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ background: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.4)" }}
                >
                  <Code2 className="w-4.5 h-4.5" style={{ color: "#a78bfa", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#a78bfa" }}>
                      OPEN<span className="text-white">GRAVITY</span>
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono"
                      style={{ color: "#a78bfa", borderColor: "rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.08)" }}
                    >
                      AI IDE
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#2d1f6e" }}>
                    Intelligent code completions, refactor, debug & explain
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#333" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#333")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar */}
            <div
              className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 flex-wrap"
              style={{ borderColor: "rgba(255,255,255,0.05)", background: "#080d14" }}
            >
              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-all"
                  style={{ background: "rgba(167,139,250,0.08)", borderColor: "rgba(167,139,250,0.25)", color: "#a78bfa" }}
                >
                  .{activeLang.ext}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {langOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-10 min-w-32"
                    style={{ background: "#0f0f1a", border: "1px solid rgba(167,139,250,0.25)" }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setLanguage(l.id); setLangOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors"
                        style={{
                          color: language === l.id ? "#a78bfa" : "#666",
                          background: language === l.id ? "rgba(167,139,250,0.1)" : "transparent",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = language === l.id ? "rgba(167,139,250,0.1)" : "transparent")}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Snippets */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono" style={{ color: "#333" }}>LOAD:</span>
                {SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => loadSnippet(s)}
                    className="px-2 py-1 rounded text-[9px] font-mono transition-colors"
                    style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", color: "#555" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {code && (
                <button
                  onClick={() => setCode("")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors"
                  style={{ color: "#444" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Main content */}
            <div className="flex flex-1 min-h-0">
              {/* Left: code editor */}
              <div className="flex flex-col w-1/2 border-r min-h-0" style={{ borderColor: "rgba(167,139,250,0.1)" }}>
                <div className="px-3 py-1.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(167,139,250,0.08)" }}>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f87171" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#fbbf24" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ade80" }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "#333" }}>
                    editor.{activeLang.ext}
                  </span>
                  <span className="text-[9px] font-mono ml-auto" style={{ color: "#333" }}>
                    {code.split("\n").length} lines
                  </span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`// Paste your ${activeLang.label} code here…\n// Select an action and click Run`}
                  className="flex-1 resize-none px-4 py-3 text-[12px] font-mono outline-none"
                  style={{
                    background: "transparent",
                    color: "#ccc",
                    caretColor: "#a78bfa",
                    lineHeight: "1.6",
                    tabSize: 2,
                  }}
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      setCode(code.substring(0, start) + "  " + code.substring(end));
                      setTimeout(() => {
                        e.currentTarget.selectionStart = start + 2;
                        e.currentTarget.selectionEnd = start + 2;
                      }, 0);
                    }
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
                  }}
                />
              </div>

              {/* Right: actions + output */}
              <div className="flex flex-col w-1/2 min-h-0">
                {/* Action picker */}
                <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(167,139,250,0.08)" }}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ACTIONS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setAction(a.id)}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all"
                          style={
                            action === a.id
                              ? { background: `${a.color}18`, borderColor: `${a.color}60`, color: a.color }
                              : { background: "#0a0a12", borderColor: "rgba(255,255,255,0.06)", color: "#444" }
                          }
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: action === a.id ? a.color : "#333", width: 14, height: 14 }} />
                          <span className="text-[10px] font-bold">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[9px]" style={{ color: "#333" }}>
                    {ACTIONS.find((a) => a.id === action)?.desc}
                  </div>
                </div>

                {/* Run button */}
                <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "rgba(167,139,250,0.08)" }}>
                  <button
                    onClick={running ? stop : run}
                    disabled={!code.trim() && !running}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-[12px] transition-all disabled:opacity-40"
                    style={{
                      background: running ? "rgba(248,113,113,0.12)" : "rgba(167,139,250,0.12)",
                      border: `1px solid ${running ? "rgba(248,113,113,0.4)" : "rgba(167,139,250,0.4)"}`,
                      color: running ? "#f87171" : "#a78bfa",
                    }}
                  >
                    {running ? (
                      <>
                        <div className="w-3 h-3 rounded-sm" style={{ background: "#f87171" }} />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Run AI  ·  Ctrl+Enter
                      </>
                    )}
                  </button>
                </div>

                {/* Output */}
                <div className="flex-1 overflow-y-auto min-h-0 relative">
                  {output ? (
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-bold" style={{ color: "#a78bfa" }}>
                          AI OUTPUT — {ACTIONS.find((a) => a.id === action)?.label?.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!running && output && (
                            <button
                              onClick={() => pipeline.push({ source: "OpenGravity", sourceColor: "#a78bfa", label: `${action}/${language}`, content: output })}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all"
                              style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}
                            >
                              <GitMerge className="w-2.5 h-2.5" style={{ width: 10, height: 10 }} /> Pipe
                            </button>
                          )}
                          <button
                            onClick={copyOutput}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-all"
                            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}
                          >
                            {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <pre
                        className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words"
                        style={{ color: "#c9d1d9" }}
                      >
                        {output}
                        {running && (
                          <span
                            className="inline-block w-1.5 h-3.5 rounded-sm ml-0.5 animate-pulse"
                            style={{ background: "#a78bfa" }}
                          />
                        )}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}
                      >
                        <Code2 className="w-6 h-6" style={{ color: "rgba(167,139,250,0.3)" }} />
                      </div>
                      <div className="text-center">
                        <div className="text-[11px] font-bold" style={{ color: "#333" }}>
                          Paste code · select action · run
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: "#222" }}>
                          AI output appears here
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
