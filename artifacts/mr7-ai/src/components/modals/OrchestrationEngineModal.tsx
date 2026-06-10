import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Workflow, Play, ChevronRight, CheckCircle, Circle, Loader2, AlertTriangle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface Tool {
  id: string; name: string; color: string; desc: string;
  inputType: string; outputType: string;
}

const TOOLS: Tool[] = [
  { id: "nmap", name: "NMAP", color: "#00e5ff", desc: "Port scanner & service detector", inputType: "HOST/CIDR", outputType: "OPEN PORTS + SERVICES" },
  { id: "nuclei", name: "NUCLEI", color: "#fbbf24", desc: "Template-based vuln scanner", inputType: "URL/HOST", outputType: "CVE LIST" },
  { id: "sqlmap", name: "SQLMAP", color: "#f97316", desc: "Automated SQL injection", inputType: "URL + PARAMS", outputType: "INJECTION POINTS" },
  { id: "metasploit", name: "METASPLOIT", color: "#e21227", desc: "Exploitation framework", inputType: "CVE + TARGET", outputType: "SHELL ACCESS" },
  { id: "burp", name: "BURP SUITE", color: "#a855f7", desc: "Web app security testing", inputType: "HTTP REQUEST", outputType: "VULNERABILITIES" },
  { id: "hydra", name: "HYDRA", color: "#ec4899", desc: "Network login cracker", inputType: "SERVICE + WORDLIST", outputType: "CREDENTIALS" },
  { id: "nikto", name: "NIKTO", color: "#4ade80", desc: "Web server scanner", inputType: "URL", outputType: "WEB ISSUES" },
  { id: "hashcat", name: "HASHCAT", color: "#fb923c", desc: "Password hash cracker", inputType: "HASH + WORDLIST", outputType: "PLAINTEXT PASSWORDS" },
];

interface PipelineStep {
  toolId: string; status: "pending" | "running" | "done" | "error"; output: string[];
}

const TOOL_OUTPUTS: Record<string, string[]> = {
  nmap: ["PORT      STATE   SERVICE   VERSION", "22/tcp    open    ssh       OpenSSH 8.2p1", "80/tcp    open    http      Apache httpd 2.4.41", "443/tcp   open    https     nginx 1.18.0", "3306/tcp  open    mysql     MySQL 5.7.32", "8080/tcp  open    http      Apache Tomcat 9.0.37", "Nmap done: 1 IP address (1 host up) — 1000 ports scanned"],
  nuclei: ["[critical] CVE-2021-41773 — Apache Path Traversal [target:80]", "[critical] CVE-2020-9484 — Apache Tomcat Deserialization [target:8080]", "[high]     MySQL No-Auth [target:3306]", "[medium]   Nginx CORS Misconfiguration [target:443]", "[info]     SSH Banner Leak [target:22]", "5 vulnerabilities found"],
  sqlmap: ["[*] Testing parameter: username", "[*] Heuristic test shows parameter is injectable", "[!] Type: time-based blind", "[!] Type: UNION query (3 columns, MySQL)", "[+] Tables: users, sessions, admin_users, logs", "[+] Dumped credentials: admin:$2b$10$xxxhashed", "1 injection point found, 4 tables dumped"],
  metasploit: ["msf6 > use exploit/multi/http/apache_mod_cgi_bash_env_exec", "msf6 exploit > set RHOSTS 192.168.1.1", "msf6 exploit > set RPORT 80", "msf6 exploit > set TARGETURI /cgi-bin/", "msf6 exploit > run", "[*] Started reverse TCP handler on 0.0.0.0:4444", "[+] 192.168.1.1:80 — Command shell session 1 opened", "meterpreter > getuid: server username: www-data"],
  burp: ["[HIGH] SQL Injection — /login (parameter: username)", "[HIGH] Stored XSS — /profile (parameter: bio)", "[MEDIUM] CSRF — /api/transfer (no token)", "[MEDIUM] IDOR — /api/users/{id} (no auth check)", "[LOW] Verbose error messages expose stack traces", "[INFO] Content-Security-Policy missing", "6 findings, 2 high, 2 medium"],
  hydra: ["[DATA] attacking ssh://192.168.1.1:22/", "[22][ssh] host: 192.168.1.1   login: admin   password: admin123", "[22][ssh] host: 192.168.1.1   login: root    password: toor", "[22][ssh] host: 192.168.1.1   login: deploy  password: deploy2024!", "3 valid passwords found in 4m 12s"],
  nikto: ["+ Server: Apache/2.4.41", "+ /admin/ — Admin directory found", "+ /phpinfo.php — PHP configuration exposed", "+ /.git/ — Git repository accessible", "+ OSVDB-3268: /backup/ — Directory listing enabled", "+ Cookie PHPSESSID set without HttpOnly flag", "6 issues found"],
  hashcat: ["Hashfile: hashes.txt — 3 hashes loaded", "Dictionary: rockyou.txt (14.3M passwords)", "Progress: 14344391/14344391 (100.00%)", "$2b$10$xxx:admin123 — CRACKED", "$2b$10$yyy:password1 — CRACKED", "$2b$10$zzz:Summer2024! — CRACKED", "3/3 hashes cracked in 22.7s (GPU)"],
};

export function OrchestrationEngineModal({ open, onOpenChange }: Props) {
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [available, setAvailable] = useState<Tool[]>(TOOLS);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState("192.168.1.1");
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function addTool(tool: Tool) {
    if (pipeline.length >= 6) return;
    setPipeline(prev => [...prev, { toolId: tool.id, status: "pending", output: [] }]);
  }

  function removeTool(idx: number) {
    setPipeline(prev => prev.filter((_, i) => i !== idx));
    if (selectedStep === idx) setSelectedStep(null);
  }

  function runPipeline() {
    if (pipeline.length === 0) return;
    setRunning(true);
    const fresh = pipeline.map(p => ({ ...p, status: "pending" as const, output: [] }));
    setPipeline(fresh);
    setSelectedStep(0);
    let i = 0;

    function runNext() {
      if (i >= fresh.length) { setRunning(false); return; }
      setPipeline(prev => prev.map((p, idx) => idx === i ? { ...p, status: "running" } : p));
      setSelectedStep(i);
      const tool = TOOLS.find(t => t.id === fresh[i].toolId)!;
      const lines = TOOL_OUTPUTS[tool.id] || ["[+] Scan complete"];
      let li = 0;
      timerRef.current = setInterval(() => {
        if (li >= lines.length) {
          clearInterval(timerRef.current!);
          setPipeline(prev => prev.map((p, idx) => idx === i ? { ...p, status: "done", output: lines } : p));
          i++;
          setTimeout(runNext, 600);
          return;
        }
        setPipeline(prev => prev.map((p, idx) => idx === i ? { ...p, output: [...p.output, lines[li]] } : p));
        li++;
      }, 350);
    }
    runNext();
  }

  const selStep = selectedStep !== null ? pipeline[selectedStep] : null;
  const selTool = selStep ? TOOLS.find(t => t.id === selStep.toolId) : null;

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1300, maxHeight: "92vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)" }}>
                <Workflow className="w-5 h-5" style={{ color: "#00e5ff" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#00e5ff" }}>ORCHESTRATION ENGINE</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Nmap → Nuclei → SQLMap → Metasploit · Auto-Chaining</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input value={target} onChange={e => setTarget(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-transparent outline-none"
                style={{ border: "1px solid #1a1a1a", color: "#888", width: 180 }} placeholder="Target IP / domain" />
              <motion.button onClick={runPipeline} disabled={running || pipeline.length === 0} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold tracking-widest"
                style={{ background: running || pipeline.length === 0 ? "rgba(0,229,255,0.04)" : "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: running || pipeline.length === 0 ? "#333" : "#00e5ff" }}>
                <Play className="w-3.5 h-3.5" />{running ? "RUNNING..." : "RUN PIPELINE"}
              </motion.button>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-48 border-r flex flex-col p-3 gap-2 overflow-y-auto" style={{ borderColor: "#111" }}>
              <div className="text-[9px] font-bold tracking-widest mb-1" style={{ color: "#333" }}>TOOL LIBRARY</div>
              {TOOLS.map(t => (
                <motion.button key={t.id} onClick={() => addTool(t)} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-left"
                  style={{ background: "#0a0a0a", border: `1px solid ${t.color}22` }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                  <div>
                    <div className="text-[10px] font-bold" style={{ color: t.color }}>{t.name}</div>
                    <div className="text-[8px]" style={{ color: "#1a1a1a" }}>{t.desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b" style={{ borderColor: "#111" }}>
                <div className="text-[9px] font-bold tracking-widest mb-3" style={{ color: "#333" }}>PIPELINE ({pipeline.length}/6 steps)</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pipeline.length === 0 && <div className="text-[10px]" style={{ color: "#1a1a1a" }}>Click tools from the left panel to build your attack pipeline</div>}
                  {pipeline.map((step, idx) => {
                    const tool = TOOLS.find(t => t.id === step.toolId)!;
                    return (
                      <div key={`${step.toolId}-${idx}`} className="flex items-center gap-1">
                        <motion.button onClick={() => setSelectedStep(idx)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: selectedStep === idx ? `${tool.color}12` : "#0d0d0d", border: `1px solid ${selectedStep === idx ? tool.color + "44" : step.status === "done" ? tool.color + "22" : "#141414"}` }}>
                          {step.status === "pending" && <Circle className="w-3 h-3" style={{ color: "#2a2a2a" }} />}
                          {step.status === "running" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: tool.color }} />}
                          {step.status === "done" && <CheckCircle className="w-3 h-3" style={{ color: tool.color }} />}
                          {step.status === "error" && <AlertTriangle className="w-3 h-3" style={{ color: "#e21227" }} />}
                          <span className="text-[10px] font-bold" style={{ color: step.status === "done" ? tool.color : step.status === "running" ? tool.color : "#333" }}>{tool.name}</span>
                          {!running && <button onClick={e => { e.stopPropagation(); removeTool(idx); }} className="ml-1 text-[9px] hover:text-red-500" style={{ color: "#2a2a2a" }}>✕</button>}
                        </motion.button>
                        {idx < pipeline.length - 1 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "#1a1a1a" }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {selStep && selTool ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: selTool.color }} />
                      <span className="text-xs font-bold" style={{ color: selTool.color }}>{selTool.name}</span>
                      <span className="text-[10px]" style={{ color: "#2a2a2a" }}>→ {selTool.desc}</span>
                      <span className="ml-auto text-[9px] font-mono" style={{ color: "#2a2a2a" }}>INPUT: {selTool.inputType} → OUTPUT: {selTool.outputType}</span>
                    </div>
                    <div className="p-4 rounded-xl font-mono text-[10px] space-y-0.5" style={{ background: "#030303", border: `1px solid ${selTool.color}15`, minHeight: 120 }}>
                      {selStep.output.map((l, i) => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ color: l.startsWith("[+]") ? "#4ade80" : l.startsWith("[!]") || l.includes("critical") ? "#e21227" : l.startsWith("[*]") ? "#00e5ff" : l.includes("high") ? "#f97316" : "#555" }}>
                          {l}
                        </motion.div>
                      ))}
                      {selStep.status === "running" && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }} style={{ color: selTool.color }}>█</motion.span>}
                      {selStep.status === "pending" && <div style={{ color: "#1a1a1a" }}>Waiting to run...</div>}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center" style={{ color: "#1a1a1a" }}>
                    <div className="text-center"><Workflow className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <div className="text-sm">Add tools from the left, build your pipeline, then run it</div>
                    </div>
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
