import { useRef, useState, useEffect, useCallback, type FC, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Square, Search, Crosshair, Activity, Shield,
  Code2, Eye, GitMerge, Cpu, ChevronRight, Brain, Zap,
} from "lucide-react";
import { streamAgent } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type AgentStatus = "idle" | "running" | "done" | "error";

interface AgentNode {
  id: string;
  name: string;
  subtitle: string;
  focus: string;
  color: string;
  hex6: string;
  x3: number; y3: number; z3: number;
  status: AgentStatus;
  output: string;
  progress: number;
  ping: number;
}

interface Particle {
  fromId: string;
  toId: string;
  t: number;
  speed: number;
  life: number;
}

const R = 200;
const AGENTS_INIT: AgentNode[] = [
  {
    id: "orchestrator", name: "ORCHESTRATOR", subtitle: "Neural Coordinator",
    focus: "You are the master orchestrator AI for a multi-agent cybersecurity system. Analyze the task holistically, identify key attack vectors, assign priorities, and later synthesize all specialist findings into one executive-level assessment. Be concise, structured, tactical.",
    color: "#00e5ff", hex6: "#00e5ff", x3: 0, y3: -50, z3: 0,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "recon", name: "RECON", subtitle: "OSINT & Surface Mapping",
    focus: "You are the RECON specialist agent. Execute deep open-source intelligence: subdomain enum, DNS analysis, ASN lookup, social engineering surfaces, leaked credentials on GitHub/Pastebin, email patterns, and full external attack surface mapping. Be specific and technical.",
    color: "#3b82f6", hex6: "#3b82f6", x3: R, y3: 30, z3: 0,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "exploit", name: "EXPLOIT", subtitle: "Vulnerability & CVE Analysis",
    focus: "You are the EXPLOIT specialist agent. Identify vulnerabilities, CVEs, misconfigurations, and exploitation paths. Enumerate attack chains, CVSS scores, affected components, PoC availability, and weaponization difficulty. Prioritize by exploitability and impact.",
    color: "#e21227", hex6: "#e21227", x3: R * 0.5, y3: 30, z3: R * 0.866,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "analyst", name: "ANALYST", subtitle: "Threat Intel & Attribution",
    focus: "You are the ANALYST specialist agent. Correlate threat intelligence, map to MITRE ATT&CK TTPs, identify behavioral indicators, perform APT attribution analysis, timeline reconstruction, and lateral movement pattern analysis. Reference real threat groups where applicable.",
    color: "#fbbf24", hex6: "#fbbf24", x3: -R * 0.5, y3: 30, z3: R * 0.866,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "defense", name: "DEFENSE", subtitle: "Hardening & Mitigation",
    focus: "You are the DEFENSE specialist agent. Generate prioritized hardening recommendations, patch schedules, WAF rules, network segmentation plans, MFA rollout, backup strategies, and incident response playbooks. Structure by urgency: immediate, 7-day, 30-day.",
    color: "#4ade80", hex6: "#4ade80", x3: -R, y3: 30, z3: 0,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "codex", name: "CODEX", subtitle: "Code & Binary Analysis",
    focus: "You are the CODEX specialist agent. Perform static and dynamic code analysis, identify injection sinks, memory corruption vectors, insecure cryptography, hardcoded secrets, and provide secure code refactoring recommendations with PoC exploit snippets.",
    color: "#a78bfa", hex6: "#a78bfa", x3: -R * 0.5, y3: 30, z3: -R * 0.866,
    status: "idle", output: "", progress: 0, ping: 0,
  },
  {
    id: "ghost", name: "GHOST", subtitle: "Stealth & Evasion",
    focus: "You are the GHOST specialist agent. Develop stealth persistence mechanisms, AV/EDR evasion techniques, anti-forensics methods, living-off-the-land strategies, encrypted C2 channels, and detection bypass playbooks. Focus on operational security.",
    color: "#f97316", hex6: "#f97316", x3: R * 0.5, y3: 30, z3: -R * 0.866,
    status: "idle", output: "", progress: 0, ping: 0,
  },
];

const ICON_MAP: Record<string, FC<{ size?: number; className?: string; style?: CSSProperties }>> = {
  orchestrator: Brain, recon: Search, exploit: Crosshair,
  analyst: Activity, defense: Shield, codex: Code2, ghost: Eye,
};

const CONNECTIONS: [string, string][] = [
  ["orchestrator","recon"],["orchestrator","exploit"],["orchestrator","analyst"],
  ["orchestrator","defense"],["orchestrator","codex"],["orchestrator","ghost"],
  ["recon","exploit"],["analyst","defense"],["codex","ghost"],["exploit","analyst"],
];

function hexPath(cx: number, cy: number, r: number): Path2D {
  const p = new Path2D();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

function project(x: number, y: number, z: number, ry: number, cx: number, cy: number) {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const rx = x * cos + z * sin;
  const rz = -x * sin + z * cos;
  const fl = 750;
  const d = fl + rz + 400;
  if (d <= 0) return null;
  const s = fl / d;
  return { sx: cx + rx * s, sy: cy + y * s, sz: rz, scale: s };
}

function lerpBezier(p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0x + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * p3x,
    y: mt * mt * mt * p0y + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * p3y,
  };
}

export function MultiAgentSOCModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const rotY = useRef(0);
  const time = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const agentsRef = useRef<AgentNode[]>(AGENTS_INIT.map(a => ({ ...a })));

  const [agents, setAgents] = useState<AgentNode[]>(AGENTS_INIT.map(a => ({ ...a })));
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<string | null>("orchestrator");
  const [synthesis, setSynthesis] = useState("");
  const [phase, setPhase] = useState<"idle" | "dispatching" | "running" | "synthesizing" | "done">("idle");
  const abortCtrls = useRef<AbortController[]>([]);
  const flushTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const outputBufs = useRef<Map<string, string>>(new Map());
  const synthBuf = useRef("");
  const synthFlush = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncAgents = useCallback(() => {
    setAgents(agentsRef.current.map(a => ({ ...a })));
  }, []);

  const patchAgent = useCallback((id: string, patch: Partial<AgentNode>) => {
    agentsRef.current = agentsRef.current.map(a => a.id === id ? { ...a, ...patch } : a);
  }, []);

  const flushOutput = useCallback((id: string) => {
    const buf = outputBufs.current.get(id) ?? "";
    patchAgent(id, { output: buf });
    syncAgents();
  }, [patchAgent, syncAgents]);

  const scheduleFlush = useCallback((id: string) => {
    const existing = flushTimers.current.get(id);
    if (existing) return;
    const t = setTimeout(() => {
      flushTimers.current.delete(id);
      flushOutput(id);
    }, 48);
    flushTimers.current.set(id, t);
  }, [flushOutput]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    if (!open) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const cx = W / 2;
      const cy = H / 2 + 20;

      ctx.clearRect(0, 0, W, H);

      rotY.current += 0.004;
      time.current += 0.016;

      // ── Background ─────────────────────────────────────────────────────────
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      bg.addColorStop(0, "#0a0a12");
      bg.addColorStop(1, "#050508");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Scanline overlay
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.08 + 0.04 * Math.sin(y * 0.05 + time.current)})`;
        ctx.fillRect(0, y, W, 1);
      }

      // ── Grid floor ─────────────────────────────────────────────────────────
      const gridY = cy + 100;
      const vp = { x: cx, y: gridY };
      ctx.save();
      ctx.globalAlpha = 0.18;
      for (let i = -8; i <= 8; i++) {
        const x = cx + i * 40;
        ctx.beginPath();
        ctx.moveTo(x, gridY);
        ctx.lineTo(vp.x, gridY - 180);
        ctx.strokeStyle = "#e21227";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let j = 0; j <= 7; j++) {
        const pct = j / 7;
        const y = gridY - pct * 180;
        const spread = (1 - pct) * 320;
        ctx.beginPath();
        ctx.moveTo(cx - spread, y);
        ctx.lineTo(cx + spread, y);
        ctx.strokeStyle = `rgba(226,18,39,${0.3 - pct * 0.25})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // ── Project agents ──────────────────────────────────────────────────────
      const cur = agentsRef.current;
      const projected = cur.map(a => {
        const p = project(a.x3, a.y3, a.z3, rotY.current, cx, cy);
        return { agent: a, proj: p };
      }).filter(d => d.proj !== null) as { agent: AgentNode; proj: NonNullable<ReturnType<typeof project>> }[];

      projected.sort((a, b) => a.proj.sz - b.proj.sz);

      // ── Connections ─────────────────────────────────────────────────────────
      for (const [fromId, toId] of CONNECTIONS) {
        const fd = projected.find(d => d.agent.id === fromId);
        const td = projected.find(d => d.agent.id === toId);
        if (!fd || !td) continue;

        const isActive = fd.agent.status === "running" || td.agent.status === "running";
        const isDone = fd.agent.status === "done" && td.agent.status === "done";

        const alpha = isActive ? 0.55 : isDone ? 0.3 : 0.12;
        const midX = (fd.proj.sx + td.proj.sx) / 2;
        const midY = Math.min(fd.proj.sy, td.proj.sy) - 40;

        const grad = ctx.createLinearGradient(fd.proj.sx, fd.proj.sy, td.proj.sx, td.proj.sy);
        grad.addColorStop(0, fd.agent.color + "cc");
        grad.addColorStop(1, td.agent.color + "cc");

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(fd.proj.sx, fd.proj.sy);
        ctx.quadraticCurveTo(midX, midY, td.proj.sx, td.proj.sy);
        ctx.strokeStyle = grad;
        ctx.lineWidth = isActive ? 1.5 : 0.8;
        if (isActive) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = fd.agent.color;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Particles ──────────────────────────────────────────────────────────
      const deadParts: number[] = [];
      particlesRef.current.forEach((p, idx) => {
        p.t += p.speed;
        p.life -= 0.01;
        if (p.t > 1 || p.life <= 0) { deadParts.push(idx); return; }

        const fd = projected.find(d => d.agent.id === p.fromId);
        const td = projected.find(d => d.agent.id === p.toId);
        if (!fd || !td) { deadParts.push(idx); return; }

        const midX = (fd.proj.sx + td.proj.sx) / 2;
        const midY = Math.min(fd.proj.sy, td.proj.sy) - 40;

        const { x, y } = lerpBezier(
          fd.proj.sx, fd.proj.sy, midX, midY, midX, midY, td.proj.sx, td.proj.sy, p.t
        );

        const fromColor = fd.agent.color;
        ctx.save();
        ctx.globalAlpha = p.life * 0.9;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fromColor;
        ctx.fillStyle = fromColor;
        ctx.beginPath();
        ctx.arc(x, y, 3 * fd.proj.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      });
      for (let i = deadParts.length - 1; i >= 0; i--) {
        particlesRef.current.splice(deadParts[i], 1);
      }

      // Spawn particles for active connections
      if (Math.random() < 0.35) {
        const active = cur.filter(a => a.status === "running");
        if (active.length > 0) {
          const orch = cur.find(a => a.id === "orchestrator");
          if (orch && active.length > 0) {
            const target = active[Math.floor(Math.random() * active.length)];
            if (target.id !== "orchestrator") {
              const rev = Math.random() < 0.4;
              particlesRef.current.push({
                fromId: rev ? target.id : "orchestrator",
                toId: rev ? "orchestrator" : target.id,
                t: 0, speed: 0.012 + Math.random() * 0.008, life: 1,
              });
            }
          }
          if (active.length >= 2 && Math.random() < 0.3) {
            const a = active[Math.floor(Math.random() * active.length)];
            const b = active.filter(x => x.id !== a.id)[0];
            if (b) {
              particlesRef.current.push({ fromId: a.id, toId: b.id, t: 0, speed: 0.015, life: 1 });
            }
          }
        }
      }

      // ── Agent nodes ────────────────────────────────────────────────────────
      for (const { agent, proj } of projected) {
        const { sx, sy, scale } = proj;
        const r = (agent.id === "orchestrator" ? 38 : 28) * scale;
        const isRunning = agent.status === "running";
        const isDone = agent.status === "done";
        const isErr = agent.status === "error";
        const glow = isRunning ? 30 : isDone ? 12 : 6;

        // Outer glow
        ctx.save();
        ctx.shadowBlur = glow * scale * 2;
        ctx.shadowColor = agent.color;

        // Hex fill
        const hexFill = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        hexFill.addColorStop(0, agent.color + "44");
        hexFill.addColorStop(0.6, agent.color + "22");
        hexFill.addColorStop(1, agent.color + "08");

        const hp = hexPath(sx, sy, r);
        ctx.fillStyle = hexFill;
        ctx.fill(hp);

        // Hex border
        ctx.strokeStyle = agent.color + (isRunning ? "ff" : isDone ? "bb" : "55");
        ctx.lineWidth = (isRunning ? 2 : 1) * scale;
        ctx.stroke(hp);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Inner pulse ring (running state)
        if (isRunning) {
          const pulse = 0.5 + 0.5 * Math.sin(time.current * 3);
          ctx.save();
          ctx.globalAlpha = pulse * 0.6;
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 1.5 * scale;
          ctx.shadowBlur = 15;
          ctx.shadowColor = agent.color;
          ctx.beginPath();
          ctx.arc(sx, sy, (r + 8 + pulse * 6) * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // Progress arc
        if (agent.progress > 0) {
          ctx.save();
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 3 * scale;
          ctx.shadowBlur = 10;
          ctx.shadowColor = agent.color;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(sx, sy, (r + 5) * scale, -Math.PI / 2, -Math.PI / 2 + agent.progress * Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // Status dot (center)
        ctx.save();
        const dotColor = isRunning ? "#00ff88" : isDone ? agent.color : isErr ? "#ff4444" : "#333344";
        ctx.fillStyle = dotColor;
        ctx.shadowBlur = isRunning ? 12 : 4;
        ctx.shadowColor = dotColor;
        ctx.beginPath();
        ctx.arc(sx, sy, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Orchestrator spin ring
        if (agent.id === "orchestrator") {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth = 1 * scale;
          const spinR = (r + 16) * scale;
          for (let i = 0; i < 3; i++) {
            const startA = time.current * 1.5 + (i * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.arc(sx, sy, spinR, startA, startA + 0.8);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Label
        const fontSize = Math.max(8, 10 * scale);
        ctx.save();
        ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = agent.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = agent.color;
        ctx.fillText(agent.name, sx, sy + r + 14 * scale);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Ping indicator
        if (agent.ping > 0) {
          ctx.save();
          ctx.font = `${Math.max(7, 8 * scale)}px monospace`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff88";
          ctx.fillText(`${agent.ping}ms`, sx, sy + r + 24 * scale);
          ctx.restore();
        }
      }

      // ── Corner HUD ─────────────────────────────────────────────────────────
      ctx.save();
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#00e5ff44";
      const active = cur.filter(a => a.status === "running").length;
      const done = cur.filter(a => a.status === "done").length;
      ctx.fillText(`AGENTS: ${active} ACTIVE / ${done} DONE / ${cur.length} TOTAL`, 12, 20);
      ctx.fillText(`PARTICLES: ${particlesRef.current.length}`, 12, 34);
      ctx.fillText(`ROT: ${(rotY.current % (Math.PI * 2)).toFixed(2)} rad`, 12, 48);
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [open]);

  const stop = useCallback(() => {
    abortCtrls.current.forEach(c => c.abort());
    abortCtrls.current = [];
    setRunning(false);
    setPhase("idle");
    agentsRef.current = agentsRef.current.map(a =>
      a.status === "running" ? { ...a, status: "error" as AgentStatus } : a
    );
    syncAgents();
  }, [syncAgents]);

  const run = useCallback(async () => {
    if (!task.trim() || running) return;

    const fresh = AGENTS_INIT.map(a => ({ ...a }));
    agentsRef.current = fresh;
    setAgents(fresh);
    setSynthesis("");
    synthBuf.current = "";
    outputBufs.current.clear();
    particlesRef.current = [];
    setRunning(true);
    setPhase("dispatching");
    setSelected("orchestrator");

    const ctxMessages = (() => {
      const chat = state.chats.find(c => c.id === state.activeChatId);
      const hist = (chat?.messages ?? []).slice(-4).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      return [...hist, { role: "user" as const, content: task }];
    })();

    const ctrls = AGENTS_INIT.map(() => new AbortController());
    abortCtrls.current = ctrls;

    // Short delay so UI shows "dispatching" phase
    await new Promise(r => setTimeout(r, 600));
    setPhase("running");

    const agentPromises = AGENTS_INIT.map(async (agentDef, i) => {
      const ctrl = ctrls[i];
      const startTime = Date.now();

      patchAgent(agentDef.id, { status: "running", progress: 0.05 });
      syncAgents();

      outputBufs.current.set(agentDef.id, "");

      try {
        await streamAgent(
          {
            messages: ctxMessages,
            language: "en",
            maxSteps: 6,
            customSystemPrompt: agentDef.focus,
            redteamMode: true,
          },
          (event) => {
            if (event.type === "answer_chunk") {
              const prev = outputBufs.current.get(agentDef.id) ?? "";
              outputBufs.current.set(agentDef.id, prev + event.content);
              const len = outputBufs.current.get(agentDef.id)!.length;
              patchAgent(agentDef.id, { progress: Math.min(0.95, 0.1 + len / 1200) });
              scheduleFlush(agentDef.id);
            } else if (event.type === "step_start") {
              patchAgent(agentDef.id, { progress: Math.min(0.9, (event.step / event.maxSteps) * 0.8 + 0.1) });
            }
          },
          ctrl.signal,
        );

        const finalOut = outputBufs.current.get(agentDef.id) ?? "";
        const elapsed = Date.now() - startTime;
        patchAgent(agentDef.id, {
          status: "done",
          output: finalOut,
          progress: 1,
          ping: elapsed,
        });
        syncAgents();
      } catch (e: unknown) {
        if ((e as Error)?.name === "AbortError") return;
        patchAgent(agentDef.id, { status: "error", progress: 0 });
        syncAgents();
      }
    });

    await Promise.all(agentPromises);

    // Synthesis pass
    const allDone = agentsRef.current.filter(a => a.status === "done");
    if (allDone.length === 0 || abortCtrls.current.length === 0) {
      setRunning(false);
      setPhase("done");
      return;
    }

    setPhase("synthesizing");
    const synthCtrl = new AbortController();
    abortCtrls.current = [synthCtrl];

    const summaries = allDone.map(a => `=== ${a.name} ===\n${a.output}`).join("\n\n");

    try {
      await streamAgent(
        {
          messages: [{ role: "user", content: `Synthesize these specialist agent reports into one executive summary:\n\n${summaries}\n\nOriginal task: ${task}` }],
          language: "en",
          maxSteps: 3,
          customSystemPrompt: "You are a senior cybersecurity director. Synthesize the multi-agent findings into a clear executive report: CRITICAL FINDINGS, KEY RISKS, ATTACK CHAIN, IMMEDIATE ACTIONS, LONG-TERM ROADMAP. Be structured, decisive, and actionable.",
        },
        (event) => {
          if (event.type === "answer_chunk") {
            synthBuf.current += event.content;
            if (synthFlush.current) clearTimeout(synthFlush.current);
            synthFlush.current = setTimeout(() => {
              setSynthesis(synthBuf.current);
              synthFlush.current = null;
            }, 48);
          }
        },
        synthCtrl.signal,
      );
    } catch { /* ignore */ }

    setSynthesis(synthBuf.current);
    setRunning(false);
    setPhase("done");
  }, [task, running, state, patchAgent, syncAgents, scheduleFlush]);

  const selectedAgent = agents.find(a => a.id === selected);
  const Icon = selected ? ICON_MAP[selected] ?? Brain : Brain;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative flex flex-col w-full rounded-[18px] overflow-hidden border border-white/8"
        style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
          boxShadow: "0 0 80px rgba(0,229,255,0.08), 0 0 40px rgba(226,18,39,0.06), 0 32px 80px rgba(0,0,0,0.9)",
          height: "min(90vh, 820px)",
        }}
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 px-4 pt-3 pb-[10px] border-b border-white/6 flex-shrink-0"
          style={{ background: "linear-gradient(90deg, rgba(0,229,255,0.04) 0%, transparent 50%, rgba(226,18,39,0.03) 100%)" }}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center">
                <Cpu size={16} className="text-[#00e5ff]" />
              </div>
              {running && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00ff88] animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-xs font-black tracking-[0.25em] text-white/90 font-mono">MULTI-AGENT SOC</div>
              <div className="text-[10px] text-[#00e5ff]/60 font-mono tracking-widest">
                {phase === "idle" && "STANDBY — 7 SPECIALIST AGENTS READY"}
                {phase === "dispatching" && "DISPATCHING NEURAL AGENTS..."}
                {phase === "running" && `${agents.filter(a => a.status === "running").length} AGENTS ACTIVE · ${agents.filter(a => a.status === "done").length} COMPLETE`}
                {phase === "synthesizing" && "SYNTHESIS IN PROGRESS..."}
                {phase === "done" && `MISSION COMPLETE · ${agents.filter(a => a.status === "done").length}/${agents.length} AGENTS`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Phase indicators */}
            {(["dispatching", "running", "synthesizing", "done"] as const).map((p, i) => (
              <div key={p} className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  phase === p ? "bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" :
                  ["dispatching","running","synthesizing","done"].indexOf(phase) > i ? "bg-white/30" : "bg-white/10"
                }`} />
                {i < 3 && <div className="w-3 h-px bg-white/10" />}
              </div>
            ))}

            <button
              onClick={() => { stop(); onOpenChange(false); }}
              className="ml-3 w-7 h-7 rounded-lg bg-white/5 hover:bg-[#e21227]/20 border border-white/8 flex items-center justify-center transition-colors"
            >
              <X size={13} className="text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: 3D Canvas ──────────────────────────────────────────────── */}
          <div className="relative flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
            <canvas
              ref={canvasRef}
              className="flex-1 w-full h-full cursor-crosshair"
              style={{ display: "block" }}
            />

            {/* Task input overlay at bottom of canvas */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-white/6"
              style={{ background: "linear-gradient(0deg, rgba(6,6,12,0.98) 0%, rgba(6,6,12,0.7) 100%)" }}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ChevronRight size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00e5ff]/50" />
                  <input
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
                    placeholder="Enter target / objective for the multi-agent team..."
                    disabled={running}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl text-xs font-mono text-white/90 placeholder-white/25 border outline-none transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: task ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)",
                    }}
                  />
                </div>
                {running ? (
                  <button
                    onClick={stop}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border transition-all"
                    style={{ background: "rgba(226,18,39,0.15)", borderColor: "rgba(226,18,39,0.4)", color: "#e21227" }}
                  >
                    <Square size={12} /> STOP
                  </button>
                ) : (
                  <button
                    onClick={run}
                    disabled={!task.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "rgba(0,229,255,0.12)", borderColor: "rgba(0,229,255,0.35)", color: "#00e5ff" }}
                  >
                    <Play size={12} /> DEPLOY
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Control Panel ─────────────────────────────────────────── */}
          <div className="w-80 flex flex-col border-l border-white/6 flex-shrink-0" style={{ background: "rgba(4,4,8,0.9)" }}>
            {/* Agent roster */}
            <div className="px-3 py-2 border-b border-white/5">
              <div className="text-[9px] font-black tracking-[0.3em] text-white/30 font-mono mb-2">AGENT ROSTER</div>
              <div className="space-y-1">
                {agents.map(agent => {
                  const AgentIcon = ICON_MAP[agent.id] ?? Brain;
                  const isSelected = selected === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelected(agent.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all text-left"
                      style={{
                        background: isSelected ? `${agent.color}14` : "transparent",
                        border: `1px solid ${isSelected ? agent.color + "44" : "transparent"}`,
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: agent.color + "22" }}>
                          <AgentIcon size={11} style={{ color: agent.color }} />
                        </div>
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                          agent.status === "running" ? "bg-[#00ff88] animate-pulse" :
                          agent.status === "done" ? "bg-[#4ade80]" :
                          agent.status === "error" ? "bg-[#e21227]" : "bg-white/20"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold font-mono leading-none truncate" style={{ color: agent.color }}>
                          {agent.name}
                        </div>
                        <div className="text-[9px] text-white/35 font-mono truncate mt-0.5">{agent.subtitle}</div>
                      </div>
                      {agent.status === "running" && (
                        <div className="flex-shrink-0 w-12 h-1 rounded-full bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{
                            width: `${agent.progress * 100}%`,
                            background: agent.color,
                            boxShadow: `0 0 6px ${agent.color}`,
                          }} />
                        </div>
                      )}
                      {agent.status === "done" && agent.ping > 0 && (
                        <span className="text-[9px] font-mono text-white/30 flex-shrink-0">{(agent.ping / 1000).toFixed(1)}s</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected agent output */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedAgent && (
                <>
                  <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
                    <Icon size={11} style={{ color: selectedAgent.color }} />
                    <span className="text-[9px] font-black tracking-widest font-mono" style={{ color: selectedAgent.color }}>
                      {selectedAgent.name} OUTPUT
                    </span>
                    {selectedAgent.status === "running" && (
                      <span className="ml-auto text-[9px] text-[#00ff88] font-mono animate-pulse">STREAMING...</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 scroll-smooth">
                    {selectedAgent.output ? (
                      <pre className="text-[10px] font-mono text-white/75 whitespace-pre-wrap leading-relaxed">
                        {selectedAgent.output}
                        {selectedAgent.status === "running" && (
                          <span className="inline-block w-1.5 h-3 ml-0.5 bg-white/60 animate-pulse align-middle" />
                        )}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                        <Icon size={24} style={{ color: selectedAgent.color }} />
                        <span className="text-[10px] font-mono text-white/40">
                          {selectedAgent.status === "idle" ? "Awaiting deployment..." : "Initializing..."}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Synthesis panel */}
            <AnimatePresence>
              {(phase === "synthesizing" || phase === "done") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-[#fbbf24]/20 flex-shrink-0"
                  style={{ maxHeight: "35%" }}
                >
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(251,191,36,0.05)" }}>
                    <GitMerge size={11} className="text-[#fbbf24]" />
                    <span className="text-[9px] font-black tracking-widest font-mono text-[#fbbf24]">SYNTHESIS</span>
                    {phase === "synthesizing" && (
                      <Zap size={9} className="ml-auto text-[#fbbf24] animate-pulse" />
                    )}
                  </div>
                  <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: "160px" }}>
                    {synthesis ? (
                      <pre className="text-[10px] font-mono text-white/75 whitespace-pre-wrap leading-relaxed">
                        {synthesis}
                        {phase === "synthesizing" && (
                          <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#fbbf24]/60 animate-pulse align-middle" />
                        )}
                      </pre>
                    ) : (
                      <div className="text-[9px] text-white/30 font-mono animate-pulse">Synthesizing all agent reports...</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
