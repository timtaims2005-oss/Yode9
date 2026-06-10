import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const TECHNIQUES = [
  { id: "poly", label: "Polymorphic Code", desc: "Mutates code structure on each run, changes signature", color: "#e21227", level: 95 },
  { id: "b64", label: "Base64 Layers", desc: "Multi-layer base64 wrapping with decoder stubs", color: "#f97316", level: 70 },
  { id: "xor", label: "XOR Cipher", desc: "XOR with rotating key, self-decoding at runtime", color: "#fbbf24", level: 75 },
  { id: "deadcode", label: "Dead Code Injection", desc: "Injects irrelevant junk code to confuse static analysis", color: "#a855f7", level: 60 },
  { id: "stringsplit", label: "String Fragmentation", desc: "Splits strings into random-length chunks, reassembles at runtime", color: "#00e5ff", level: 65 },
  { id: "api", label: "API Hashing", desc: "Replaces API names with hashes, resolves at runtime", color: "#4ade80", level: 80 },
  { id: "junk", label: "Junk Insertion", desc: "Inserts NOPs, INT3, invalid opcodes inside legitimate code", color: "#ec4899", level: 55 },
  { id: "sleep", label: "Sandbox Evasion", desc: "Detects sandbox (CPUID, uptime, mouse moves) before executing", color: "#fb923c", level: 88 },
];

function applyObfuscation(code: string, technique: typeof TECHNIQUES[0]): string {
  switch (technique.id) {
    case "b64": return `// [BASE64 OBFUSCATED — auto-decode stub]\neval(atob('${btoa(code.slice(0, 200))}...'));`;
    case "xor": {
      const key = 0x42;
      const hex = Array.from(code.slice(0, 100)).map(c => (c.charCodeAt(0) ^ key).toString(16).padStart(2, "0")).join("");
      return `// [XOR OBFUSCATED — key: 0x${key.toString(16)}]\nconst k=${key},d='${hex}'.match(/../g).map(h=>String.fromCharCode(parseInt(h,16)^k)).join('');eval(d);`;
    }
    case "deadcode": {
      const junk = ["if(false){void 0;}", "void(0+0);", "''===''&&void 0;", "Math.random()>2&&alert('');"];
      return code.split("\n").map((l, i) => i % 3 === 0 ? `${l}\n${junk[i % junk.length]}` : l).join("\n");
    }
    case "stringsplit": return code.replace(/"([^"]{4,})"/g, (_, s) => {
      const mid = Math.floor(s.length / 2);
      return `"${s.slice(0, mid)}"+"${s.slice(mid)}"`;
    });
    case "sleep": return `// [SANDBOX EVASION WRAPPER]\nconst _t=Date.now();setTimeout(()=>{if(Date.now()-_t<4900)return;// sandbox detected\n${code}\n},5000);`;
    case "api": return code.replace(/\b(eval|exec|system|shell_exec|popen)\b/g, (m) => `_h('${m.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")}')`);
    case "poly": {
      const varmap: Record<string, string> = {};
      return `// [POLYMORPHIC — var names mutated per compile]\n` + code.replace(/\b(var|let|const)\s+(\w+)/g, (_, kw, name) => {
        if (!varmap[name]) varmap[name] = "_" + Math.random().toString(36).slice(2, 7);
        return `${kw} ${varmap[name]}`;
      });
    }
    default: return `// [JUNK INJECTION]\n` + code.split("\n").map((l, i) => i % 2 === 0 ? `${l}\n__junk_${i}:;` : l).join("\n");
  }
}

export function EvasionEngineModal({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<typeof TECHNIQUES[0][]>([TECHNIQUES[0], TECHNIQUES[7]]);
  const [input, setInput] = useState(`// Paste your exploit / shellcode / script here
function runPayload() {
  const cmd = "whoami";
  exec(cmd, (err, stdout) => {
    const data = stdout.trim();
    eval(data);
    system(data);
  });
}
runPayload();`);
  const [output, setOutput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avScores, setAvScores] = useState<{ name: string; detect: boolean }[]>([]);

  function toggleTech(t: typeof TECHNIQUES[0]) {
    setSelected(prev => prev.find(p => p.id === t.id) ? prev.filter(p => p.id !== t.id) : [...prev, t]);
  }

  function process() {
    setProcessing(true);
    setTimeout(() => {
      let result = input;
      selected.forEach(t => { result = applyObfuscation(result, t); });
      setOutput(result);
      setAvScores([
        { name: "Windows Defender", detect: selected.length < 2 },
        { name: "CrowdStrike EDR", detect: selected.length < 3 },
        { name: "Malwarebytes", detect: selected.some(t => t.id === "b64") && selected.length < 4 },
        { name: "ESET NOD32", detect: selected.length < 1 },
        { name: "Carbon Black", detect: selected.some(t => t.id !== "poly" && t.id !== "sleep") && selected.length < 5 },
        { name: "Sentinel One", detect: !selected.find(t => t.id === "poly") },
      ]);
      setProcessing(false);
    }, 1200);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
                <EyeOff className="w-5 h-5" style={{ color: "#a855f7" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#a855f7" }}>EVASION ENGINE</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Polymorphic · Anti-AV · Anti-EDR · Obfuscation Matrix</div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-56 border-r flex flex-col p-3 gap-2 overflow-y-auto" style={{ borderColor: "#111" }}>
              <div className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "#333" }}>TECHNIQUES ({selected.length} active)</div>
              {TECHNIQUES.map(t => {
                const active = !!selected.find(s => s.id === t.id);
                return (
                  <motion.button key={t.id} onClick={() => toggleTech(t)} whileTap={{ scale: 0.97 }}
                    className="flex flex-col gap-1 p-2.5 rounded-xl text-left"
                    style={{ background: active ? `${t.color}0d` : "#0a0a0a", border: `1px solid ${active ? t.color + "33" : "#141414"}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: active ? t.color : "#3a3a3a" }}>{t.label}</span>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: active ? t.color : "#1a1a1a" }} />
                    </div>
                    <div className="text-[8px] leading-relaxed" style={{ color: "#2a2a2a" }}>{t.desc}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-0.5 rounded-full" style={{ background: "#111" }}>
                        <div className="h-full rounded-full" style={{ width: `${t.level}%`, background: t.color }} />
                      </div>
                      <span className="text-[8px] font-mono" style={{ color: t.color }}>{t.level}%</span>
                    </div>
                  </motion.button>
                );
              })}
              <motion.button onClick={process} disabled={processing || selected.length === 0} whileTap={{ scale: 0.97 }}
                className="mt-2 py-2.5 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${processing ? "animate-spin" : ""}`} />
                {processing ? "OBFUSCATING..." : "OBFUSCATE"}
              </motion.button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col border-r" style={{ borderColor: "#111" }}>
                  <div className="px-3 py-2 border-b text-[9px] font-bold tracking-widest" style={{ borderColor: "#111", color: "#333" }}>SOURCE CODE</div>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    className="flex-1 p-4 font-mono text-xs bg-transparent outline-none resize-none"
                    style={{ color: "#4ade80", minHeight: 0 }} spellCheck={false} />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "#111" }}>
                    <span className="text-[9px] font-bold tracking-widest" style={{ color: "#333" }}>OBFUSCATED OUTPUT</span>
                    {output && (
                      <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold"
                        style={{ background: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)", border: "1px solid #1a1a1a", color: copied ? "#4ade80" : "#555" }}>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "COPIED" : "COPY"}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-xs" style={{ minHeight: 0 }}>
                    {output ? <pre style={{ color: "#a855f7", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{output}</pre>
                      : <div className="h-full flex items-center justify-center text-center" style={{ color: "#1a1a1a" }}>Select techniques and apply obfuscation</div>}
                  </div>
                </div>
              </div>

              {avScores.length > 0 && (
                <div className="border-t p-4" style={{ borderColor: "#111" }}>
                  <div className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "#333" }}>AV/EDR DETECTION SIMULATION</div>
                  <div className="grid grid-cols-3 gap-2">
                    {avScores.map(av => (
                      <div key={av.name} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: av.detect ? "rgba(226,18,39,0.06)" : "rgba(74,222,128,0.06)", border: `1px solid ${av.detect ? "rgba(226,18,39,0.2)" : "rgba(74,222,128,0.2)"}` }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: av.detect ? "#e21227" : "#4ade80" }} />
                        <span className="text-[9px] font-mono" style={{ color: av.detect ? "#e21227" : "#4ade80" }}>{av.name}</span>
                        <span className="ml-auto text-[8px]" style={{ color: av.detect ? "#e21227" : "#4ade80" }}>{av.detect ? "DETECTED" : "BYPASS ✓"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
