import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Square, Target, Zap, Shield, Terminal, ChevronRight, AlertTriangle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const KILL_CHAIN = [
  { id: "recon", label: "RECONNAISSANCE", color: "#00e5ff", x: 80, y: 200, desc: "OSINT · Shodan · DNS · Whois" },
  { id: "weapon", label: "WEAPONIZATION", color: "#fbbf24", x: 240, y: 200, desc: "Payload Build · Exploit Craft" },
  { id: "delivery", label: "DELIVERY", color: "#f97316", x: 400, y: 200, desc: "Phishing · Drive-By · USB Drop" },
  { id: "exploit", label: "EXPLOITATION", color: "#e21227", x: 560, y: 200, desc: "CVE Trigger · Zero-Day · Injection" },
  { id: "install", label: "INSTALLATION", color: "#a855f7", x: 720, y: 200, desc: "Backdoor · Rootkit · Persistence" },
  { id: "c2", label: "C2 CHANNEL", color: "#ec4899", x: 880, y: 200, desc: "Beacon · Tunnel · DNS-over-HTTPS" },
  { id: "actions", label: "EXFILTRATION", color: "#ff4444", x: 1040, y: 200, desc: "Data Theft · Lateral Move · Ransomware" },
];

const ATTACK_LOGS = [
  "[*] Initializing autonomous red-team engine...",
  "[*] Target scope locked: 192.168.1.0/24",
  "[>] Phase 1: Passive reconnaissance started",
  "[>] Enumerating subdomains via DNS brute-force...",
  "[+] Found: admin.target.com → 192.168.1.45",
  "[+] Found: api.target.com → 192.168.1.67",
  "[>] Port scanning 192.168.1.45 (top-1000)...",
  "[+] Open: 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS), 8080/tcp (alt-HTTP)",
  "[>] Fingerprinting services...",
  "[+] SSH: OpenSSH 7.2p2 Ubuntu (CVE-2016-6210 potential)",
  "[+] HTTP: Apache 2.4.18 (CVE-2017-7679 detected!)",
  "[!] CRITICAL: Apache mod_mime buffer overflow — CVSS 9.8",
  "[>] Phase 2: Weaponization — crafting exploit for CVE-2017-7679...",
  "[+] Payload generated: apache_mod_mime_exploit.elf (x64)",
  "[>] Phase 3: Delivery — HTTP request injection...",
  "[+] Exploit delivered via malformed MIME boundary",
  "[!] Shell obtained: www-data@192.168.1.45",
  "[>] Phase 4: Privilege escalation via SUID binary...",
  "[+] ROOT SHELL ACQUIRED ✓",
  "[>] Phase 5: Installing persistence (cron backdoor)...",
  "[+] C2 beacon established: 443/tcp (disguised HTTPS)",
  "[>] Phase 6: Lateral movement scan...",
  "[+] Pivot to 192.168.1.67 via SSH key theft",
  "[!] MISSION COMPLETE — Full network compromise in 4m 23s",
];

export function AutonomousRedTeamModal({ open, onOpenChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [activePhase, setActivePhase] = useState(-1);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logIdx, setLogIdx] = useState(0);
  const [target, setTarget] = useState("192.168.1.0/24");
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let t = 0;
    let particlesArr: { x: number; y: number; vx: number; vy: number; life: number; color: string; phase: number }[] = [];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function addParticle(fromNode: number, toNode: number) {
      if (fromNode < 0 || toNode >= KILL_CHAIN.length) return;
      const from = KILL_CHAIN[fromNode];
      const to = KILL_CHAIN[toNode];
      const scaleX = canvas.width / 1120;
      const scaleY = canvas.height / 400;
      for (let i = 0; i < 3; i++) {
        particlesArr.push({
          x: from.x * scaleX,
          y: from.y * scaleY,
          vx: ((to.x - from.x) * scaleX) / 60 + (Math.random() - 0.5) * 1.5,
          vy: ((to.y - from.y) * scaleY) / 60 + (Math.random() - 0.5) * 1.5,
          life: 60,
          color: from.color,
          phase: fromNode,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scaleX = canvas.width / 1120;
      const scaleY = canvas.height / 400;

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }

      for (let i = 0; i < KILL_CHAIN.length - 1; i++) {
        const a = KILL_CHAIN[i], b = KILL_CHAIN[i + 1];
        const active = i <= activePhase;
        ctx.beginPath();
        ctx.moveTo(a.x * scaleX, a.y * scaleY);
        ctx.lineTo(b.x * scaleX, b.y * scaleY);
        ctx.strokeStyle = active ? `${a.color}99` : "rgba(255,255,255,0.08)";
        ctx.lineWidth = active ? 2 : 1;
        ctx.stroke();
        if (active) {
          const progress = (t % 80) / 80;
          const px = a.x * scaleX + (b.x * scaleX - a.x * scaleX) * progress;
          const py = a.y * scaleY;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = a.color;
          ctx.fill();
        }
      }

      KILL_CHAIN.forEach((node, i) => {
        const nx = node.x * scaleX, ny = node.y * scaleY;
        const isActive = i === activePhase;
        const isDone = i < activePhase;
        const r = isActive ? 28 + Math.sin(t * 0.1) * 4 : 22;

        if (isActive) {
          const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r * 2.5);
          grad.addColorStop(0, `${node.color}33`);
          grad.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(nx, ny, r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = grad; ctx.fill();
        }

        ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? node.color : isDone ? `${node.color}88` : "rgba(255,255,255,0.15)";
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.stroke();
        ctx.fillStyle = isActive ? `${node.color}22` : isDone ? `${node.color}11` : "rgba(10,10,10,0.8)";
        ctx.fill();

        if (isDone) {
          ctx.font = "bold 13px monospace";
          ctx.fillStyle = node.color;
          ctx.textAlign = "center";
          ctx.fillText("✓", nx, ny + 5);
        } else if (isActive) {
          ctx.beginPath();
          ctx.arc(nx, ny, r - 6, -Math.PI / 2, -Math.PI / 2 + (t % 120) / 120 * Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.font = `${scaleX > 0.7 ? 9 : 7}px monospace`;
        ctx.fillStyle = isActive ? node.color : isDone ? `${node.color}99` : "rgba(255,255,255,0.3)";
        ctx.textAlign = "center";
        const label = node.label.split(" ");
        label.forEach((l, li) => ctx.fillText(l, nx, ny + r + 16 + li * 12));
      });

      particlesArr = particlesArr.filter(p => p.life > 0);
      particlesArr.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.floor(p.life / 60 * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy; p.life--;
      });

      if (running && t % 15 === 0 && activePhase >= 0) addParticle(activePhase - 1, activePhase);

      t++;
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [open, activePhase, running]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  function startAttack() {
    setLogs([]); setLogIdx(0); setActivePhase(0); setRunning(true);
    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx >= ATTACK_LOGS.length) { clearInterval(timerRef.current!); setRunning(false); return; }
      setLogs(prev => [...prev, ATTACK_LOGS[idx]]);
      idx++;
    }, 300);
    let phase = 0;
    phaseTimerRef.current = setInterval(() => {
      phase++;
      setActivePhase(phase);
      if (phase >= KILL_CHAIN.length) clearInterval(phaseTimerRef.current!);
    }, 1800);
  }

  function stopAttack() {
    clearInterval(timerRef.current!); clearInterval(phaseTimerRef.current!);
    setRunning(false);
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full flex flex-col rounded-2xl overflow-hidden"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1f1f1f" }}
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)" }}>
                <Target className="w-5 h-5" style={{ color: "#e21227" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#e21227" }}>AUTONOMOUS RED-TEAM ENGINE</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#3a3a3a" }}>Kill-Chain · Auto-Exploitation · 3D Attack Path</div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex gap-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "#141414" }}>
                <Target className="w-3.5 h-3.5" style={{ color: "#666" }} />
                <input value={target} onChange={e => setTarget(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono outline-none"
                  style={{ color: "#e5e5e5" }} placeholder="Target CIDR or hostname" />
                {!running ? (
                  <motion.button onClick={startAttack} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest"
                    style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227" }}>
                    <Play className="w-3 h-3" /> LAUNCH ATTACK
                  </motion.button>
                ) : (
                  <motion.button onClick={stopAttack} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest"
                    style={{ background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)", color: "#f97316" }}>
                    <Square className="w-3 h-3" /> ABORT
                  </motion.button>
                )}
              </div>

              <div className="relative" style={{ height: 260 }}>
                <canvas ref={canvasRef} className="w-full h-full" />
                {activePhase >= 0 && activePhase < KILL_CHAIN.length && (
                  <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-mono"
                    style={{ background: "rgba(0,0,0,0.85)", border: `1px solid ${KILL_CHAIN[Math.min(activePhase, KILL_CHAIN.length-1)].color}44`, color: KILL_CHAIN[Math.min(activePhase, KILL_CHAIN.length-1)].color }}
                    key={activePhase} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    {KILL_CHAIN[Math.min(activePhase, KILL_CHAIN.length-1)].desc}
                  </motion.div>
                )}
              </div>

              <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5" style={{ background: "#050505", minHeight: 0 }}>
                {logs.length === 0 && (
                  <div className="text-center py-8" style={{ color: "#2a2a2a" }}>
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div>Enter target and launch attack</div>
                  </div>
                )}
                {logs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    style={{ color: log.startsWith("[!]") ? "#e21227" : log.startsWith("[+]") ? "#4ade80" : log.startsWith("[>]") ? "#00e5ff" : "#555" }}>
                    {log}
                  </motion.div>
                ))}
                {running && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ color: "#e21227" }}>█</motion.span>}
              </div>
            </div>

            <div className="w-56 border-l flex flex-col gap-0" style={{ borderColor: "#141414" }}>
              <div className="p-3 border-b text-xs font-bold tracking-widest" style={{ borderColor: "#141414", color: "#333" }}>KILL CHAIN STATUS</div>
              {KILL_CHAIN.map((node, i) => (
                <div key={node.id} className="px-3 py-2.5 flex items-center gap-2.5 border-b" style={{ borderColor: "#0d0d0d", background: i === activePhase ? `${node.color}08` : "transparent" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                    style={{ background: i < activePhase ? `${node.color}22` : i === activePhase ? `${node.color}33` : "rgba(255,255,255,0.03)", border: `1px solid ${i <= activePhase ? node.color + "55" : "#1a1a1a"}`, color: i <= activePhase ? node.color : "#333" }}>
                    {i < activePhase ? "✓" : i + 1}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold tracking-widest" style={{ color: i <= activePhase ? node.color : "#2a2a2a" }}>{node.label}</div>
                    {i === activePhase && <motion.div className="text-[8px] mt-0.5" style={{ color: "#3a3a3a" }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>EXECUTING...</motion.div>}
                  </div>
                  {i === activePhase && running && (
                    <motion.div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: node.color }}
                      animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
                  )}
                </div>
              ))}
              {activePhase >= KILL_CHAIN.length && (
                <div className="p-4 mt-auto">
                  <div className="p-3 rounded-xl text-center" style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)" }}>
                    <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" style={{ color: "#e21227" }} />
                    <div className="text-xs font-bold" style={{ color: "#e21227" }}>COMPROMISED</div>
                    <div className="text-[9px] mt-1" style={{ color: "#444" }}>Full chain complete</div>
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
