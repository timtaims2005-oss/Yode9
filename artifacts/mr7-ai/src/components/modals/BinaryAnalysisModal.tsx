import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Binary, Upload, Search, AlertTriangle, Copy, Check } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SAMPLE_BINARY = `4d5a90000300000004000000ffff0000b8000000000000004000000000000000
000000000000000000000000000000000000000000000000800000000e1fba0e
00b409cd21b8014ccd21546869732070726f6772616d2063616e6e6f74206265
72756e20696e20444f53206d6f64652e0d0d0a2400000000000000504500004c
010300e4c4d55d0000000000000000e00002010b010e003600000014000000000
000165500000010000000480000000040000010000000020000050001000000000
050001000000000000007800000004000094060000020040850000100000100000
000010000010000000000000100000000000000000000000c4540000570000000`;

interface Finding {
  type: "critical" | "high" | "medium" | "info";
  title: string; desc: string; offset: string;
}

const FINDINGS: Finding[] = [
  { type: "critical", title: "Stack Buffer Overflow", desc: "strcpy() call at offset 0x1045 with unvalidated input. Direct stack corruption possible.", offset: "0x00001045" },
  { type: "critical", title: "Use-After-Free", desc: "Heap object referenced after free() at 0x2318. Memory corruption exploitable for RCE.", offset: "0x00002318" },
  { type: "high", title: "Format String Vulnerability", desc: "printf(user_input) pattern at 0x1890. Arbitrary read/write primitive.", offset: "0x00001890" },
  { type: "high", title: "Integer Overflow", desc: "malloc(size * count) without bounds check at 0x3205. Heap overflow possible.", offset: "0x00003205" },
  { type: "medium", title: "Hardcoded Credential", desc: "String 'admin:P@ssw0rd123' found at .rodata:0x8040. Credential leak.", offset: "0x00008040" },
  { type: "medium", title: "Insecure RNG", desc: "srand(time(NULL)) used for security-critical randomness at 0x2750.", offset: "0x00002750" },
  { type: "info", title: "Debug Symbols Present", desc: "Binary compiled with -g flag. Function names and line info exposed.", offset: "0x00000000" },
  { type: "info", title: "NX bit disabled", desc: "Executable stack detected — shellcode injection possible without ROP.", offset: "0x00000100" },
];

const STRINGS: string[] = [
  "/bin/sh", "admin:P@ssw0rd123", "DEBUG_MODE=1", "BACKDOOR_PORT=4444",
  "Mozilla/5.0 (compatible; bot)", "http://evil.c2.server/beacon",
  "cmd.exe /c whoami", "SELECT * FROM users", "/etc/shadow", "id_rsa",
];

const IMPORTS: string[] = [
  "strcpy", "sprintf", "gets", "system", "exec", "popen",
  "malloc", "free", "mprotect", "mmap", "socket", "connect",
  "CreateRemoteThread", "VirtualAllocEx", "WriteProcessMemory",
];

type Tab = "disasm" | "strings" | "imports" | "findings";

const findingColor = (t: Finding["type"]) =>
  t === "critical" ? "#e21227" : t === "high" ? "#f97316" : t === "medium" ? "#fbbf24" : "#00e5ff";

export function BinaryAnalysisModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("findings");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [hexInput, setHexInput] = useState(SAMPLE_BINARY);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function analyze() {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); setAnalyzed(true); setTab("findings"); }, 1800);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  const critCount = FINDINGS.filter(f => f.type === "critical").length;
  const highCount = FINDINGS.filter(f => f.type === "high").length;

  const DISASM = [
    "0x00001000:  push   rbp",
    "0x00001001:  mov    rbp, rsp",
    "0x00001004:  sub    rsp, 0x100",
    "0x00001008:  mov    rax, QWORD PTR [rbp+0x10]",
    "0x0000100c:  mov    QWORD PTR [rbp-0x8], rax",
    "0x00001010:  lea    rax, [rbp-0x80]         ; local buf[128]",
    "0x00001014:  mov    rdi, rax",
    "0x00001017:  mov    rsi, QWORD PTR [rbp+0x10]",
    "0x0000101b:  call   0x4020 <strcpy@plt>      ; ← VULN: no bounds",
    "0x00001020:  lea    rdi, [rip+0x2fc0]        ; format string",
    "0x00001027:  mov    rsi, QWORD PTR [rbp-0x8]",
    "0x0000102b:  call   0x4030 <printf@plt>",
    "0x00001030:  mov    eax, 0x0",
    "0x00001035:  leave",
    "0x00001036:  ret",
    "0x00001040:  push   rbp",
    "0x00001041:  mov    rbp, rsp",
    "0x00001044:  sub    rsp, 0x50",
    "0x00001048:  mov    edi, 0x1c8",
    "0x0000104d:  call   0x4010 <malloc@plt>",
    "0x00001052:  mov    QWORD PTR [rbp-0x8], rax",
    "0x00001056:  test   rax, rax",
    "0x00001059:  je     0x1080",
    "0x0000105b:  mov    rdi, QWORD PTR [rbp-0x8]",
    "0x0000105f:  call   0x4015 <free@plt>",
    "0x00001064:  mov    rdx, QWORD PTR [rbp-0x8] ; ← UAF: ptr used after free",
    "0x00001068:  mov    rax, QWORD PTR [rdx+0x18]",
    "0x0000106c:  call   rax                      ; vtable hijack possible",
  ];

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-[18px] overflow-hidden flex flex-col"
          style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
                <Binary className="w-5 h-5" style={{ color: "#a855f7" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#a855f7" }}>BINARY ANALYSIS ENGINE</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Static Analysis · Disassembly · Vuln Detection · Reverse Engineering</div>
              </div>
            </div>
            {analyzed && (
              <div className="flex items-center gap-3">
                {critCount > 0 && <div className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>{critCount} CRITICAL</div>}
                {highCount > 0 && <div className="px-2 py-1 rounded text-[9px] font-bold" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>{highCount} HIGH</div>}
              </div>
            )}
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-64 border-r flex flex-col p-4 gap-3" style={{ borderColor: "#111" }}>
              <div>
                <div className="text-[9px] font-bold tracking-widest mb-2" style={{ color: "#333" }}>BINARY INPUT</div>
                <textarea value={hexInput} onChange={e => setHexInput(e.target.value)}
                  className="w-full h-28 w-7 h-7 flex items-center justify-center rounded-lg font-mono text-[9px] bg-transparent outline-none resize-none"
                  style={{ border: "1px solid #1a1a1a", color: "#3a3a3a" }} spellCheck={false} />
              </div>
              <input ref={fileRef} type="file" className="hidden" accept=".exe,.elf,.bin,.out,.dll,.so" />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono"
                style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }}>
                <Upload className="w-3 h-3" /> Upload Binary (.exe/.elf)
              </button>
              <motion.button onClick={analyze} disabled={analyzing} whileTap={{ scale: 0.97 }}
                className="py-2.5 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                style={{ background: analyzing ? "rgba(168,85,247,0.05)" : "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)", color: analyzing ? "#444" : "#a855f7" }}>
                <Search className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                {analyzing ? "ANALYZING..." : "ANALYZE BINARY"}
              </motion.button>

              {analyzed && (
                <div className="mt-2 space-y-1.5 text-[9px] font-mono">
                  <div className="text-[8px] font-bold tracking-widest mb-1" style={{ color: "#1a1a1a" }}>BINARY INFO</div>
                  {[["Format","ELF64 (x86-64)"],["OS","Linux"],["Compiler","GCC 9.4.0"],["Size","45.2 KB"],["Entropy","6.82 (packed?)"],["NX Bit","DISABLED"],["PIE","Disabled"],["ASLR","Partial"],["Canary","None"]].map(([k,v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span style={{ color: "#2a2a2a" }}>{k}</span>
                      <span style={{ color: "#555" }}>{v as string}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-0 border-b" style={{ borderColor: "#111" }}>
                {(["findings","disasm","strings","imports"] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-4 py-3 text-[10px] font-bold tracking-widest border-b-2 transition-all"
                    style={{ borderColor: tab === t ? "#a855f7" : "transparent", color: tab === t ? "#a855f7" : "#2a2a2a" }}>
                    {t.toUpperCase()}{t === "findings" && analyzed ? ` (${FINDINGS.length})` : ""}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {!analyzed && tab === "findings" && (
                  <div className="h-full flex items-center justify-center" style={{ color: "#1a1a1a" }}>
                    <div className="text-center"><Binary className="w-10 h-10 mx-auto mb-2 opacity-20" /><div>Upload or paste binary hex and click Analyze</div></div>
                  </div>
                )}

                {analyzed && tab === "findings" && (
                  <div className="space-y-2">
                    {FINDINGS.map((f, i) => (
                      <motion.div key={f.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: `${findingColor(f.type)}08`, border: `1px solid ${findingColor(f.type)}22` }}>
                        <div className="px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: `${findingColor(f.type)}15`, color: findingColor(f.type) }}>
                          {f.type.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold mb-0.5" style={{ color: "#ccc" }}>{f.title}</div>
                          <div className="text-[9px] leading-relaxed" style={{ color: "#444" }}>{f.desc}</div>
                        </div>
                        <div className="text-[9px] font-mono flex-shrink-0" style={{ color: "#2a2a2a" }}>{f.offset}</div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {tab === "disasm" && (
                  <div className="font-mono text-[10px] space-y-0.5">
                    {DISASM.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 hover:bg-white/2 px-1 rounded"
                        style={{ color: line.includes("VULN") || line.includes("UAF") ? "#e21227" : line.includes("strcpy") || line.includes("printf") ? "#f97316" : line.includes("0x0") ? "#00e5ff" : "#333" }}>
                        <span style={{ color: "#1a1a1a", fontSize: 8, width: 24, flexShrink: 0 }}>{i + 1}</span>
                        <span>{line}</span>
                        {(line.includes("VULN") || line.includes("UAF")) && (
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[7px] font-bold flex-shrink-0"
                            style={{ background: "rgba(226,18,39,0.1)", color: "#e21227" }}>VULN</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tab === "strings" && (
                  <div className="space-y-1.5">
                    {STRINGS.map(s => (
                      <div key={s} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/2"
                        style={{ border: "1px solid #0d0d0d" }}>
                        <span className="font-mono text-xs flex-1" style={{ color: s.includes("admin") || s.includes("BACKDOOR") || s.includes("evil") ? "#e21227" : "#4ade80" }}>"{s}"</span>
                        <button onClick={() => copy(s)} className="p-1 rounded hover:bg-white/5">
                          {copied === s ? <Check className="w-3 h-3" style={{ color: "#4ade80" }} /> : <Copy className="w-3 h-3" style={{ color: "#333" }} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "imports" && (
                  <div className="grid grid-cols-2 gap-2">
                    {IMPORTS.map(fn => {
                      const isDangerous = ["strcpy","sprintf","gets","system","exec","popen","CreateRemoteThread","VirtualAllocEx","WriteProcessMemory"].includes(fn);
                      return (
                        <div key={fn} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: isDangerous ? "rgba(226,18,39,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${isDangerous ? "rgba(226,18,39,0.2)" : "#111"}` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: isDangerous ? "#e21227" : "#2a2a2a" }} />
                          <span className="font-mono text-xs" style={{ color: isDangerous ? "#e21227" : "#444" }}>{fn}()</span>
                          {isDangerous && <span className="ml-auto text-[8px]" style={{ color: "#e2122766" }}>UNSAFE</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
