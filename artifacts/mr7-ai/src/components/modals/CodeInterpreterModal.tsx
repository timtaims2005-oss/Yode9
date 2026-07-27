import { useState, useRef, useCallback } from "react";
import { X, Play, RotateCcw, Copy, Download, Terminal, Code2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Language = "python" | "javascript";

const EXAMPLES: Record<Language, { label: string; code: string }[]> = {
  python: [
    { label: "Hello World", code: 'print("Hello, World!")' },
    { label: "Fibonacci", code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        print(a, end=" ")
        a, b = b, a + b

fib(15)` },
    { label: "Data Analysis", code: `import numpy as np
data = [23, 45, 12, 67, 34, 89, 56, 11, 78, 42]
arr = np.array(data)
print(f"Mean: {arr.mean():.2f}")
print(f"Std:  {arr.std():.2f}")
print(f"Max:  {arr.max()}")
print(f"Min:  {arr.min()}")
print(f"Median: {np.median(arr)}")` },
    { label: "Sort Algorithm", code: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left   = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right  = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

import random
data = random.sample(range(100), 10)
print("Before:", data)
print("After:", quicksort(data))` },
    { label: "SHA256 Hash", code: `import hashlib, base64, json

def sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()

samples = ["password123", "admin", "hello world", "CVE-2024-1234"]
for s in samples:
    print(f"{s:20} → {sha256(s)[:16]}...")` },
  ],
  javascript: [
    { label: "Hello World", code: 'console.log("Hello, World!");' },
    { label: "Array Methods", code: `const nums = [1,2,3,4,5,6,7,8,9,10];
const result = nums
  .filter(n => n % 2 === 0)
  .map(n => n ** 2)
  .reduce((a, b) => a + b, 0);
console.log("Sum of even squares:", result);` },
    { label: "Async/Await", code: `async function fetchData(id) {
  return new Promise(resolve =>
    setTimeout(() => resolve({ id, data: "payload_" + id }), 100)
  );
}

async function main() {
  const results = await Promise.all([1, 2, 3].map(fetchData));
  results.forEach(r => console.log(JSON.stringify(r)));
}

main();` },
    { label: "Regex Patterns", code: `const text = "Contact: admin@example.com or root@192.168.1.1";
const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
const ipRe    = /\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b/g;

console.log("Emails:", text.match(emailRe));
console.log("IPs:", text.match(ipRe));` },
  ],
};

const DEFAULT_CODE: Record<Language, string> = {
  python: `# Python Interpreter
# اكتب الكود هنا وانقر Run

import math

def is_prime(n):
    if n < 2: return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0: return False
    return True

primes = [n for n in range(2, 50) if is_prime(n)]
print("Prime numbers up to 50:", primes)
print(f"Count: {len(primes)}")`,
  javascript: `// JavaScript Interpreter
// اكتب الكود هنا وانقر Run

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++)
    if (n % i === 0) return false;
  return true;
}

const primes = Array.from({length: 50}, (_, i) => i + 2).filter(isPrime);
console.log("Prime numbers up to 50:", primes.join(", "));
console.log("Count:", primes.length);`,
};

export function CodeInterpreterModal({ open, onClose }: Props) {
  const [lang, setLang] = useState<Language>("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const switchLang = useCallback((l: Language) => {
    setLang(l);
    setCode(DEFAULT_CODE[l]);
    setOutput("");
    setExecTime(null);
  }, []);

  const runCode = useCallback(async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setOutput("⏳ جاري التنفيذ...");
    setExecTime(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang }),
      });
      const data = await res.json() as { ok: boolean; output: string; executionTime: number };
      setOutput(data.output || "(لا يوجد إخراج)");
      setExecTime(data.executionTime);
    } catch {
      setOutput("[خطأ] فشل الاتصال بالخادم");
    } finally {
      setRunning(false);
    }
  }, [code, lang, running]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
    }
  }, [code, runCode]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast({ description: "تم نسخ الإخراج" });
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `output.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#e21227]" />
            <span className="font-bold text-white tracking-wide">مفسّر الكود</span>
            <span className="text-xs text-muted-foreground">Code Interpreter</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex border border-[#262626] rounded-lg overflow-hidden">
              {(["python", "javascript"] as Language[]).map(l => (
                <button key={l}
                  onClick={() => switchLang(l)}
                  className={`px-3 py-1 text-xs font-mono transition-colors ${lang === l ? "bg-[#e21227] text-white" : "text-muted-foreground hover:text-white hover:bg-[#1a1a1a]"}`}
                >
                  {l === "python" ? "Python" : "JavaScript"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1f1f1f] bg-[#080808]">
          <Button size="sm" onClick={runCode} disabled={running}
            className="bg-[#e21227] hover:bg-[#b5000f] text-white gap-1.5 text-xs h-7">
            <Play className="w-3 h-3" />
            {running ? "يعمل..." : "تشغيل (Ctrl+Enter)"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setCode(DEFAULT_CODE[lang]); setOutput(""); setExecTime(null); }}
            className="border-[#262626] text-muted-foreground hover:text-white text-xs h-7 gap-1.5">
            <RotateCcw className="w-3 h-3" />
            إعادة تعيين
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowExamples(!showExamples)}
              className="border-[#262626] text-muted-foreground hover:text-white text-xs h-7 gap-1.5">
              <Code2 className="w-3 h-3" />
              أمثلة
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showExamples && (
              <div className="absolute top-full left-0 mt-1 bg-[#161616] border border-[#262626] rounded-lg shadow-xl z-10 min-w-[200px]">
                {EXAMPLES[lang].map(ex => (
                  <button key={ex.label} onClick={() => { setCode(ex.code); setOutput(""); setShowExamples(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-white hover:bg-[#1f1f1f] transition-colors">
                    {ex.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sandbox جاهز
          </div>
        </div>

        {/* Editor + Output */}
        <div className="flex flex-1 overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 flex flex-col border-r border-[#1f1f1f]">
            <div className="px-3 py-1 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">الكود</span>
              <button onClick={() => { navigator.clipboard.writeText(code); toast({ description: "تم نسخ الكود" }); }}
                className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
                <Copy className="w-3 h-3" /> نسخ
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full bg-transparent text-green-400 font-mono text-sm p-4 resize-none outline-none leading-relaxed"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Output Panel */}
          <div className="w-[45%] flex flex-col">
            <div className="px-3 py-1 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">الإخراج</span>
                {execTime !== null && (
                  <span className="text-xs text-green-500 font-mono">{execTime}ms</span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={copyOutput} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
                  <Copy className="w-3 h-3" /> نسخ
                </button>
                {output && (
                  <button onClick={downloadOutput} className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 ml-2">
                    <Download className="w-3 h-3" /> تحميل
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-[#080808]">
              {output ? (
                <pre className={`whitespace-pre-wrap leading-relaxed ${output.includes("[Error]") || output.includes("[Blocked]") ? "text-red-400" : output.includes("[Timeout]") ? "text-yellow-400" : "text-gray-300"}`}>
                  {output}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 text-sm">
                  اضغط Run لتنفيذ الكود
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1f1f1f] bg-[#080808] flex items-center gap-4 text-xs text-muted-foreground">
          <span>Ctrl+Enter للتشغيل</span>
          <span>Tab للمسافة البادئة</span>
          <span className="ml-auto">الكود يعمل في Sandbox معزول — لا شبكة، لا نظام ملفات</span>
        </div>
      </div>
    </div>
  );
}
