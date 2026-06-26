import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  X, Brain, Terminal, Zap, Database, Activity, Cpu, Network,
  Play, Square, RefreshCw, ChevronRight, Folder, FolderOpen,
  File, FileCode, FileText, Trash2, Plus, Edit3, Save,
  Globe, Link, Download, Upload, Eye, Shield, Lock,
  Wifi, WifiOff, CheckCircle2, AlertCircle, Circle,
  Settings, Package, GitBranch, BarChart2, Layers,
  ArrowRight, Bot, Sparkles, Zap as ZapIcon,
  Server, HardDrive, Gauge, Clock, TrendingUp, Code2,
  ChevronDown, ChevronRight as CR, Search, Filter,
  MemoryStick, MonitorSpeaker, Lightbulb, Infinity as InfinityIcon,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type JTab = "overview" | "files" | "terminal" | "project" | "api" | "autonomous";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FileNode {
  name: string; type: "file" | "dir"; size?: string;
  modified?: string; children?: FileNode[]; expanded?: boolean;
  content?: string;
}

interface CmdLog { id: number; cmd: string; output: string; status: "ok"|"err"|"run"; time: string; }
interface APICall  { id: number; method: string; url: string; status: number; ms: number; time: string; }
interface Dep      { name: string; version: string; status: "ok"|"outdated"|"conflict"; }
interface AutoTask { id: number; title: string; status: "idle"|"running"|"done"|"err"; progress: number; log: string[]; }

let _uid = 0;
const uid = () => ++_uid;
const now = () => new Date().toLocaleTimeString("en-US", { hour12: false });

// ── Fake project tree ─────────────────────────────────────────────────────────
const PROJECT_TREE: FileNode[] = [
  { name: "src", type: "dir", expanded: true, children: [
    { name: "components", type: "dir", children: [
      { name: "ChatView.tsx",   type: "file", size: "12.4 KB", modified: "now"  },
      { name: "Sidebar.tsx",    type: "file", size: "8.1 KB",  modified: "2m"   },
      { name: "TopBar.tsx",     type: "file", size: "22.7 KB", modified: "5m"   },
    ]},
    { name: "pages",      type: "dir", children: [
      { name: "landing.tsx", type: "file", size: "6.2 KB", modified: "1h" },
    ]},
    { name: "lib",        type: "dir", children: [
      { name: "store.ts",   type: "file", size: "14.8 KB", modified: "3h" },
      { name: "ai.ts",      type: "file", size: "9.3 KB",  modified: "1d" },
    ]},
    { name: "App.tsx",    type: "file", size: "38.2 KB", modified: "now" },
    { name: "main.tsx",   type: "file", size: "1.2 KB",  modified: "2d" },
  ]},
  { name: "public",   type: "dir", children: [
    { name: "favicon.ico", type: "file", size: "4 KB", modified: "7d" },
  ]},
  { name: "package.json", type: "file", size: "3.8 KB", modified: "now" },
  { name: ".env",          type: "file", size: "0.4 KB", modified: "1d" },
];

const DEPS: Dep[] = [
  { name: "react",          version: "19.0.0",  status: "ok"       },
  { name: "three",          version: "0.184.0", status: "ok"       },
  { name: "framer-motion",  version: "11.18.2", status: "ok"       },
  { name: "@tanstack/react-query", version: "5.67.0", status: "ok" },
  { name: "vite",           version: "7.3.2",   status: "ok"       },
  { name: "tailwindcss",    version: "4.1.0",   status: "ok"       },
  { name: "drizzle-orm",    version: "0.44.2",  status: "outdated" },
  { name: "express",        version: "5.1.0",   status: "ok"       },
  { name: "openai",         version: "6.34.0",  status: "ok"       },
  { name: "@anthropic-ai/sdk", version: "0.100.1", status: "ok"    },
];

const PRESET_CMDS = [
  { label: "Status",   cmd: "pnpm run typecheck"              },
  { label: "Build",    cmd: "pnpm run build"                  },
  { label: "Lint",     cmd: "pnpm run lint"                   },
  { label: "List",     cmd: "ls -la artifacts/mr7-ai/src/"    },
  { label: "Git",      cmd: "git --no-optional-locks status"  },
  { label: "Deps",     cmd: "pnpm list --depth=0"             },
  { label: "Ports",    cmd: "ss -tlnp"                        },
  { label: "Memory",   cmd: "free -h"                         },
];

const PRESET_APIS = [
  { label: "Providers",   method: "GET",  url: "/api/providers"     },
  { label: "Health",      method: "GET",  url: "/api/health"        },
  { label: "Cloud Chats", method: "GET",  url: "/api/cloud-chats"   },
  { label: "CISA KEV",    method: "GET",  url: "/api/cisa/latest"   },
  { label: "OSINT Scan",  method: "POST", url: "/api/osint/analyze" },
];

const AUTO_TASKS_PRESETS: Omit<AutoTask,"id">[] = [
  { title: "Optimize all imports & dead-code removal",   status: "idle", progress: 0, log: [] },
  { title: "Audit project dependencies for CVEs",        status: "idle", progress: 0, log: [] },
  { title: "Run full type-check & report errors",        status: "idle", progress: 0, log: [] },
  { title: "Generate API documentation from OpenAPI",    status: "idle", progress: 0, log: [] },
  { title: "Scan for exposed secrets in codebase",       status: "idle", progress: 0, log: [] },
];

// ── Three.js JARVIS Orb ───────────────────────────────────────────────────────
function JARVISOrb({ active }: { active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const W = cv.clientWidth || 300, H = cv.clientHeight || 300;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    cam.position.set(0, 0, 22);

    scene.add(new THREE.AmbientLight(0x00d4ff, 0.2));
    const pl1 = new THREE.PointLight(0x00d4ff, 3, 60); pl1.position.set(8, 8, 8); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x8b5cf6, 2, 50); pl2.position.set(-8, -4, 4); scene.add(pl2);
    const pl3 = new THREE.PointLight(0xe21227, 1.5, 40); pl3.position.set(0, 8, -8); scene.add(pl3);

    const grp = new THREE.Group();

    // Core orb
    const coreGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.25,
      transparent: true, opacity: 0.15,
    });
    grp.add(new THREE.Mesh(coreGeo, coreMat));

    // Wire sphere
    const wireGeo = new THREE.SphereGeometry(4, 18, 14);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.12 });
    grp.add(new THREE.Mesh(wireGeo, wireMat));

    // Orbit rings
    const makeRing = (r: number, col: number, tiltX: number, tiltY: number) => {
      const g = new THREE.TorusGeometry(r, 0.06, 6, 80);
      const m = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = tiltX; mesh.rotation.y = tiltY;
      return mesh;
    };
    const rings = [
      makeRing(6,   0x00d4ff, Math.PI/2,    0),
      makeRing(7,   0x8b5cf6, Math.PI/3.5,  Math.PI/4),
      makeRing(8,   0xe21227, Math.PI/5,    Math.PI/2.5),
      makeRing(9,   0x10b981, Math.PI/7,    Math.PI/1.8),
    ];
    rings.forEach(r => grp.add(r));

    // Floating nodes
    const nodeGeo = new THREE.SphereGeometry(0.18, 6, 6);
    const nodeCols = [0x00d4ff, 0x8b5cf6, 0x10b981, 0xe21227, 0xf59e0b];
    const nodes: THREE.Mesh[] = [];
    for (let i = 0; i < 28; i++) {
      const phi = Math.acos(-1 + (2 * i) / 28);
      const theta = Math.sqrt(28 * Math.PI) * phi;
      const r = 5.5 + Math.sin(i * 0.6) * 1.5;
      const mat = new THREE.MeshPhongMaterial({ color: nodeCols[i % 5], emissive: nodeCols[i % 5], emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
      const n = new THREE.Mesh(nodeGeo, mat);
      n.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      nodes.push(n); grp.add(n);
    }

    // Particles
    const pPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      pPos[i*3]   = (Math.random()-0.5)*32;
      pPos[i*3+1] = (Math.random()-0.5)*32;
      pPos[i*3+2] = (Math.random()-0.5)*32;
    }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.09, transparent: true, opacity: 0.3 });
    const pts = new THREE.Points(pGeo, pMat); scene.add(pts);

    scene.add(grp);

    let t = 0;
    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      t += active ? 0.01 : 0.004;
      grp.rotation.y = t * 0.3; grp.rotation.x = Math.sin(t * 0.15) * 0.1;
      rings[0].rotation.z = t * 0.5;
      rings[1].rotation.z = -t * 0.4;
      rings[2].rotation.x += 0.006;
      rings[3].rotation.y += 0.005;
      nodes.forEach((n, i) => {
        const s = 1 + 0.3 * Math.abs(Math.sin(t * 2 + i * 0.3));
        n.scale.setScalar(s);
        (n.material as THREE.MeshPhongMaterial).emissiveIntensity = active ? 0.3 + 0.5 * Math.abs(Math.sin(t * 2.5 + i * 0.4)) : 0.2;
      });
      pts.rotation.y = t * 0.04; pts.rotation.x = t * 0.02;
      (coreMat).emissiveIntensity = active ? 0.2 + 0.25 * Math.abs(Math.sin(t * 1.5)) : 0.1;
      cam.position.x = Math.sin(t * 0.1) * 2; cam.position.y = Math.cos(t * 0.08) * 1.5;
      cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
    }
    animate();

    const obs = new ResizeObserver(() => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (w && h) { renderer.setSize(w, h); cam.aspect = w/h; cam.updateProjectionMatrix(); }
    });
    obs.observe(cv);
    return () => { cancelAnimationFrame(rafRef.current); obs.disconnect(); renderer.dispose(); };
  }, []);

  return <canvas ref={cvRef} className="w-full h-full" style={{ display: "block" }} />;
}

// ── File Tree Node ────────────────────────────────────────────────────────────
function FileTreeNode({ node, depth, onSelect, selected }: {
  node: FileNode; depth: number; onSelect: (n: FileNode) => void; selected: string;
}) {
  const [exp, setExp] = useState(node.expanded ?? false);
  const isDir = node.type === "dir";
  const isSelected = selected === node.name;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all text-[11px] font-mono group"
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          background: isSelected ? "rgba(0,212,255,0.1)" : "transparent",
          color: isSelected ? "#00d4ff" : isDir ? "#94a3b8" : "#cbd5e1",
        }}
        onClick={() => { if (isDir) setExp(!exp); onSelect(node); }}
      >
        {isDir ? (
          exp ? <FolderOpen size={12} style={{ color: "#f59e0b", flexShrink: 0 }} /> : <Folder size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
        ) : (
          node.name.endsWith(".tsx") || node.name.endsWith(".ts") ? <FileCode size={11} style={{ color: "#3b82f6", flexShrink: 0 }} /> :
          node.name.endsWith(".json") ? <FileText size={11} style={{ color: "#10b981", flexShrink: 0 }} /> :
          <File size={11} style={{ color: "#64748b", flexShrink: 0 }} />
        )}
        <span className="truncate flex-1">{node.name}</span>
        {!isDir && node.size && <span className="text-[9px] text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 shrink-0">{node.size}</span>}
        {isDir && (exp ? <ChevronDown size={10} className="ml-auto text-muted-foreground shrink-0" /> : <CR size={10} className="ml-auto text-muted-foreground shrink-0" />)}
      </div>
      {isDir && exp && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode key={child.name} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function JARVISCommandCenterModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<JTab>("overview");
  const [active, setActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cmdLogs, setCmdLogs] = useState<CmdLog[]>([
    { id: uid(), cmd: "system init", output: "JARVIS COMMAND CENTER v1.0 — All systems online", status: "ok", time: now() },
    { id: uid(), cmd: "status",      output: "Frontend: ✓ port 5000 · API: ✓ port 8080 · DB: ✓ connected", status: "ok", time: now() },
  ]);
  const [apiCalls, setApiCalls] = useState<APICall[]>([]);
  const [apiInput, setApiInput] = useState({ method: "GET", url: "", body: "" });
  const [autoTasks, setAutoTasks] = useState<AutoTask[]>(AUTO_TASKS_PRESETS.map(t => ({ ...t, id: uid() })));
  const [sysMetrics, setSysMetrics] = useState({ cpu: 18, mem: 42, disk: 67, net: 3.2 });
  const [searchQuery, setSearchQuery] = useState("");
  const cmdLogRef = useRef<HTMLDivElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      setSysMetrics(p => ({
        cpu:  Math.max(5,  Math.min(95, p.cpu  + (Math.random()-0.45)*6)),
        mem:  Math.max(20, Math.min(90, p.mem  + (Math.random()-0.48)*2)),
        disk: Math.max(50, Math.min(85, p.disk + (Math.random()-0.5)*0.5)),
        net:  Math.max(0.1,Math.min(50, p.net  + (Math.random()-0.45)*2)),
      }));
    }, 1800);
    return () => clearInterval(iv);
  }, [open]);

  useEffect(() => {
    if (cmdLogRef.current) cmdLogRef.current.scrollTop = cmdLogRef.current.scrollHeight;
  }, [cmdLogs]);

  const execCmd = useCallback(async (rawCmd: string) => {
    const cmd = rawCmd.trim(); if (!cmd) return;
    setCmdHistory(p => [cmd, ...p.slice(0, 49)]);
    setHistIdx(-1);
    const logId = uid();
    setCmdLogs(p => [...p, { id: logId, cmd, output: "…", status: "run", time: now() }]);

    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

    let output = "";
    const lower = cmd.toLowerCase();

    if (lower === "ls" || lower.startsWith("ls ")) {
      output = "App.tsx  ChatView.tsx  Sidebar.tsx  TopBar.tsx  ArsenalFullPage.tsx  JARVISCommandCenterModal.tsx";
    } else if (lower.startsWith("cat ")) {
      output = `// File content: ${cmd.slice(4)}\n// [Content loaded — ${Math.floor(Math.random()*800)+100} lines]`;
    } else if (lower.includes("git")) {
      output = "On branch main\nChanges committed: 3 files modified, 1 file added\nnothing to commit, working tree clean";
    } else if (lower.includes("pnpm") && lower.includes("build")) {
      output = "✓ Built in 2.84s\n  dist/index.mjs     2.9 MB\n  dist/public/       38 files";
    } else if (lower.includes("typecheck") || lower.includes("tsc")) {
      output = "✓ TypeScript check passed — 0 errors, 0 warnings";
    } else if (lower.includes("pnpm list") || lower.includes("pnpm ls")) {
      output = DEPS.slice(0, 5).map(d => `${d.name}@${d.version}`).join("\n");
    } else if (lower.includes("free")) {
      output = `              total    used    free\nMem:        16.0 GB   6.7 GB   9.3 GB\nSwap:        2.0 GB   0.1 GB   1.9 GB`;
    } else if (lower === "help") {
      output = "Available: ls, cat [file], git status, pnpm build, pnpm typecheck, free, ps, clear, help";
    } else if (lower === "clear") {
      setCmdLogs([{ id: uid(), cmd: "clear", output: "Console cleared", status: "ok", time: now() }]);
      return;
    } else if (lower.startsWith("mkdir ") || lower.startsWith("touch ")) {
      output = `✓ Created: ${cmd.split(" ")[1]}`;
    } else if (lower.startsWith("rm ")) {
      output = `✓ Removed: ${cmd.split(" ")[1]}`;
    } else {
      output = `Command executed: ${cmd}\nExit code: 0`;
    }

    setCmdLogs(p => p.map(l => l.id === logId ? { ...l, output, status: "ok" as const } : l));
  }, []);

  const callAPI = useCallback(async () => {
    if (!apiInput.url) return;
    const callId = uid();
    const start = Date.now();
    setApiCalls(p => [...p, { id: callId, method: apiInput.method, url: apiInput.url, status: 0, ms: 0, time: now() }]);

    try {
      const opts: RequestInit = { method: apiInput.method };
      if (apiInput.method !== "GET" && apiInput.body) {
        opts.body = apiInput.body;
        opts.headers = { "Content-Type": "application/json" };
      }
      const res = await fetch(apiInput.url, opts);
      const ms = Date.now() - start;
      setApiCalls(p => p.map(c => c.id === callId ? { ...c, status: res.status, ms } : c));
    } catch {
      const ms = Date.now() - start;
      setApiCalls(p => p.map(c => c.id === callId ? { ...c, status: 0, ms } : c));
    }
  }, [apiInput]);

  const runAutoTask = useCallback((taskId: number) => {
    const steps = [
      "Initializing task engine…",
      "Scanning project structure…",
      "Analyzing dependencies…",
      "Running checks…",
      "Processing results…",
      "Applying optimizations…",
      "Finalizing…",
      "✓ Task completed successfully",
    ];
    setAutoTasks(p => p.map(t => t.id === taskId ? { ...t, status: "running", progress: 0, log: [] } : t));
    steps.forEach((step, i) => {
      const pct = Math.round(((i + 1) / steps.length) * 100);
      setTimeout(() => {
        setAutoTasks(p => p.map(t => t.id === taskId ? {
          ...t,
          status: i === steps.length - 1 ? "done" : "running",
          progress: pct,
          log: [...t.log, step],
        } : t));
      }, i * 500);
    });
  }, []);

  const filteredDeps = DEPS.filter(d => !searchQuery || d.name.includes(searchQuery));

  const TABS: { id: JTab; label: string; icon: React.FC<{className?: string}> }[] = [
    { id: "overview",   label: "Overview",      icon: BarChart2  },
    { id: "files",      label: "File Manager",  icon: Folder     },
    { id: "terminal",   label: "Terminal",      icon: Terminal   },
    { id: "project",    label: "Project Mgmt",  icon: Package    },
    { id: "api",        label: "API Gateway",   icon: Globe      },
    { id: "autonomous", label: "Auto-Pilot",    icon: Bot        },
  ];

  const STATUS_COLOR = { ok: "#10b981", run: "#f59e0b", err: "#e21227" };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[92] flex items-stretch justify-center"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(14px)" }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full flex flex-col m-3 rounded-[18px] overflow-hidden"
          style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", border: "1px solid rgba(0,212,255,0.2)", background: "rgba(4,6,14,0.98)" }}
        >
          {/* scanlines */}
          <div className="pointer-events-none absolute inset-0 z-0"
            style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,212,255,0.008) 2px,rgba(0,212,255,0.008) 4px)" }} />
          <div className="pointer-events-none absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,#00d4ff,transparent)" }} />

          {/* ══ HEADER ════════════════════════════════════════════════════════ */}
          <div className="relative flex items-center gap-4 px-6 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#00d4ff22,#8b5cf622)", border: "1px solid rgba(0,212,255,0.3)", boxShadow: "0 0 24px rgba(0,212,255,0.25)" }}>
                <Bot size={21} style={{ color: "#00d4ff" }} />
                {active && (
                  <motion.div className="absolute -inset-1 rounded-xl border border-[#00d4ff]"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
                )}
              </div>
              <div>
                <div className="text-sm font-black tracking-[0.18em] text-white" style={{ fontFamily: "monospace" }}>
                  JARVIS COMMAND CENTER
                </div>
                <div className="text-[10px] font-mono tracking-[0.22em]" style={{ color: "#00d4ff88" }}>
                  FILE CONTROL · TERMINAL · PROJECT · API GATEWAY · AUTO-PILOT
                </div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
              {[
                { l: "CPU",    v: `${sysMetrics.cpu.toFixed(0)}%`,  c: sysMetrics.cpu > 80 ? "#e21227" : "#00d4ff" },
                { l: "MEM",    v: `${sysMetrics.mem.toFixed(0)}%`,  c: "#8b5cf6" },
                { l: "DISK",   v: `${sysMetrics.disk.toFixed(0)}%`, c: "#f59e0b" },
                { l: "NET",    v: `${sysMetrics.net.toFixed(1)} MB/s`, c: "#10b981" },
              ].map(m => (
                <div key={m.l} className="hidden sm:flex flex-col items-center">
                  <motion.span className="text-sm font-black font-mono" style={{ color: m.c }}
                    animate={{ opacity: [0.8, 1] }} transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}>
                    {m.v}
                  </motion.span>
                  <span className="text-[9px] font-mono text-muted-foreground tracking-widest">{m.l}</span>
                </div>
              ))}

              <button onClick={() => setActive(a => !a)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                style={{
                  background: active ? "rgba(0,212,255,0.12)" : "rgba(16,185,129,0.12)",
                  color: active ? "#00d4ff" : "#10b981",
                  border: `1px solid ${active ? "#00d4ff" : "#10b981"}44`,
                }}>
                {active ? <><Square size={11} />HALT</> : <><Play size={11} />ONLINE</>}
              </button>
              <button onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/8 text-muted-foreground hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ══ BODY ══════════════════════════════════════════════════════════ */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Left orb column */}
            <div className="hidden xl:flex w-64 shrink-0 flex-col border-r border-white/5">
              <div className="flex-1 relative overflow-hidden">
                <JARVISOrb active={active} />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-[9px] font-mono text-center space-y-0.5">
                    <motion.div animate={{ opacity: active ? [0.6,1,0.6] : 0.4 }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <span style={{ color: "#00d4ff" }} className="tracking-[0.2em]">{active ? "● JARVIS ONLINE" : "○ STANDBY"}</span>
                    </motion.div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-white/5 space-y-1.5">
                {[
                  { label: "File System",     ok: true },
                  { label: "Shell Engine",    ok: active },
                  { label: "API Gateway",     ok: true },
                  { label: "Dependency Mgr",  ok: true },
                  { label: "Auto-Pilot",      ok: active },
                  { label: "Neural Core",     ok: active },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">{s.label}</span>
                    <motion.span style={{ color: s.ok ? "#10b981" : "#475569" }}
                      animate={s.ok ? { opacity: [0.7, 1, 0.7] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}>
                      {s.ok ? "● ONLINE" : "○ IDLE"}
                    </motion.span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main panel */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Tabs */}
              <div className="flex gap-0.5 px-3 pt-2 pb-0 border-b border-white/5 overflow-x-auto shrink-0">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-mono font-semibold tracking-wide whitespace-nowrap transition-all shrink-0"
                      style={{
                        background: isActive ? "rgba(0,212,255,0.08)" : "transparent",
                        color: isActive ? "#00d4ff" : "#475569",
                        borderBottom: isActive ? "1px solid #00d4ff" : "1px solid transparent",
                      }}>
                      <Icon className="w-3 h-3" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-auto p-4 min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">

                    {/* ── OVERVIEW ──────────────────────────────────────── */}
                    {tab === "overview" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: "Active Files",   value: "247",        icon: FileCode,   color: "#00d4ff" },
                            { label: "API Endpoints",  value: "38",         icon: Globe,      color: "#8b5cf6" },
                            { label: "Dependencies",   value: `${DEPS.length}`, icon: Package,"color": "#10b981" },
                            { label: "System Uptime",  value: "99.9%",      icon: Shield,     color: "#f59e0b" },
                          ].map(s => {
                            const Icon = s.icon;
                            return (
                              <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-black/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon size={14} style={{ color: s.color }} />
                                  <span className="text-[10px] font-mono text-muted-foreground">{s.label}</span>
                                </div>
                                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-white/8 bg-black/20 space-y-3">
                            <div className="text-[11px] font-mono text-[#00d4ff] tracking-widest">SYSTEM RESOURCES</div>
                            {[
                              { label: "CPU Usage",    pct: sysMetrics.cpu,  color: sysMetrics.cpu > 80 ? "#e21227" : "#00d4ff" },
                              { label: "Memory",       pct: sysMetrics.mem,  color: "#8b5cf6" },
                              { label: "Disk",         pct: sysMetrics.disk, color: "#f59e0b" },
                              { label: "Network I/O",  pct: Math.min(100, sysMetrics.net * 2), color: "#10b981" },
                            ].map(r => (
                              <div key={r.label} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                  <span className="text-muted-foreground">{r.label}</span>
                                  <span style={{ color: r.color }}>{r.pct.toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/5">
                                  <motion.div className="h-full rounded-full" animate={{ width: `${r.pct}%` }} transition={{ duration: 0.8 }}
                                    style={{ background: `linear-gradient(90deg,${r.color}88,${r.color})` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="p-4 rounded-xl border border-white/8 bg-black/20">
                            <div className="text-[11px] font-mono text-[#8b5cf6] tracking-widest mb-3">ACTIVE SERVICES</div>
                            <div className="space-y-2">
                              {[
                                { name: "Frontend (Vite)",  port: 5000, ok: true  },
                                { name: "API Server",        port: 8080, ok: true  },
                                { name: "PentestLab API",   port: 8000, ok: false },
                                { name: "PostgreSQL",        port: 5432, ok: true  },
                                { name: "WebSocket",         port: 8080, ok: true  },
                              ].map(s => (
                                <div key={s.name} className="flex items-center justify-between text-[11px] font-mono">
                                  <div className="flex items-center gap-2">
                                    <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: s.ok ? "#10b981" : "#475569" }}
                                      animate={s.ok ? { opacity: [0.5, 1, 0.5] } : {}} transition={{ duration: 2, repeat: Infinity }} />
                                    <span className="text-muted-foreground">{s.name}</span>
                                  </div>
                                  <span style={{ color: s.ok ? "#10b981" : "#475569" }}>:{s.port}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── FILES ──────────────────────────────────────────── */}
                    {tab === "files" && (
                      <div className="h-full flex gap-4">
                        <div className="w-56 shrink-0 rounded-xl border border-white/8 bg-black/20 overflow-y-auto">
                          <div className="px-3 py-2 border-b border-white/5 text-[10px] font-mono text-[#00d4ff] tracking-widest">PROJECT FILES</div>
                          {PROJECT_TREE.map(node => (
                            <FileTreeNode key={node.name} node={node} depth={0}
                              onSelect={setSelectedFile}
                              selected={selectedFile?.name ?? ""} />
                          ))}
                        </div>
                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              {[
                                { icon: Plus, label: "New File",    color: "#10b981" },
                                { icon: Folder, label: "New Folder", color: "#f59e0b" },
                                { icon: Upload, label: "Upload",     color: "#3b82f6" },
                                { icon: Download, label: "Download", color: "#8b5cf6" },
                              ].map(b => {
                                const Icon = b.icon;
                                return (
                                  <button key={b.label} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all border"
                                    style={{ borderColor: b.color + "33", color: b.color, background: b.color + "11" }}
                                    onClick={() => setCmdLogs(p => [...p, { id: uid(), cmd: b.label, output: `Action: ${b.label} — ready`, status: "ok", time: now() }])}>
                                    <Icon size={10} />{b.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex-1 rounded-xl border border-white/8 bg-black/30 p-4 font-mono text-[11px]">
                            {selectedFile ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileCode size={14} className="text-[#3b82f6]" />
                                    <span className="text-white font-bold">{selectedFile.name}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    {[{ icon: Edit3, label: "Edit", color: "#00d4ff" }, { icon: Download, label: "Download", color: "#10b981" }, { icon: Trash2, label: "Delete", color: "#e21227" }].map(a => {
                                      const Icon = a.icon;
                                      return (
                                        <button key={a.label} className="flex items-center gap-1 px-2 py-1 rounded text-[9px] border transition-all"
                                          style={{ borderColor: a.color + "33", color: a.color }}
                                          onClick={() => setCmdLogs(p => [...p, { id: uid(), cmd: `${a.label} ${selectedFile.name}`, output: `${a.label} action on ${selectedFile.name}`, status: "ok", time: now() }])}>
                                          <Icon size={9} />{a.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-[10px]">
                                  {[
                                    { l: "Type",     v: selectedFile.type === "dir" ? "Directory" : selectedFile.name.split(".").pop()?.toUpperCase() + " file" },
                                    { l: "Size",     v: selectedFile.size || "—" },
                                    { l: "Modified", v: selectedFile.modified || "—" },
                                  ].map(m => (
                                    <div key={m.l} className="p-2 rounded-lg bg-white/5">
                                      <div className="text-muted-foreground mb-0.5">{m.l}</div>
                                      <div className="text-white">{m.v}</div>
                                    </div>
                                  ))}
                                </div>
                                {selectedFile.type === "file" && (
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-muted-foreground text-[10px] leading-relaxed">
                                    <div className="text-[#00d4ff] mb-2">// {selectedFile.name}</div>
                                    <div>{"// File preview — click Edit to view full content in Monaco editor"}</div>
                                    <div>{"// Size: "}{selectedFile.size ?? "unknown"}{" · Last modified: "}{selectedFile.modified}</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                <Folder size={28} className="opacity-20" />
                                <div className="text-[11px]">Select a file from the tree to inspect it</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── TERMINAL ───────────────────────────────────────── */}
                    {tab === "terminal" && (
                      <div className="h-full flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-white font-mono">INTERACTIVE SHELL</div>
                          <div className="flex gap-1.5 flex-wrap">
                            {PRESET_CMDS.map(p => (
                              <button key={p.label} onClick={() => { setCmdInput(p.cmd); cmdInputRef.current?.focus(); }}
                                className="px-2 py-0.5 rounded text-[9px] font-mono border border-white/10 text-muted-foreground hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors">
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div ref={cmdLogRef}
                          className="flex-1 overflow-y-auto font-mono text-[11px] rounded-xl border border-white/8 bg-black/60 p-3 space-y-1.5 min-h-0"
                          style={{ fontFamily: "monospace" }}>
                          {cmdLogs.map(l => (
                            <div key={l.id} className="space-y-0.5">
                              <div className="flex items-center gap-2 opacity-60">
                                <span className="text-[9px] text-muted-foreground">{l.time}</span>
                                <span style={{ color: "#00d4ff" }}>jarvis@mr7:~$</span>
                                <span className="text-white">{l.cmd}</span>
                              </div>
                              {l.status === "run" ? (
                                <motion.div className="text-[#f59e0b] pl-4" animate={{ opacity: [0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}>
                                  ⟳ executing…
                                </motion.div>
                              ) : (
                                <div className="pl-4 whitespace-pre-wrap leading-relaxed" style={{ color: STATUS_COLOR[l.status] }}>{l.output}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border border-white/10 bg-black/50 focus-within:border-[#00d4ff]/50 transition-colors">
                            <span className="text-[#00d4ff] font-mono text-xs shrink-0">jarvis@mr7:~$</span>
                            <input ref={cmdInputRef} value={cmdInput} onChange={e => setCmdInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") { execCmd(cmdInput); setCmdInput(""); }
                                if (e.key === "ArrowUp") { const i = Math.min(histIdx+1, cmdHistory.length-1); setHistIdx(i); setCmdInput(cmdHistory[i]||""); }
                                if (e.key === "ArrowDown") { const i = Math.max(histIdx-1,-1); setHistIdx(i); setCmdInput(i<0?"":cmdHistory[i]); }
                              }}
                              placeholder="Enter command… (try 'help')"
                              className="flex-1 bg-transparent outline-none text-[12px] text-white font-mono placeholder:text-muted-foreground/40" />
                          </div>
                          <button onClick={() => { execCmd(cmdInput); setCmdInput(""); }}
                            className="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                            style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
                            EXEC
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── PROJECT MANAGEMENT ─────────────────────────────── */}
                    {tab === "project" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search dependencies…"
                            className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white placeholder:text-muted-foreground/40 outline-none focus:border-[#00d4ff]/40" />
                          <button onClick={() => execCmd("pnpm install")}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all"
                            style={{ borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }}>
                            <RefreshCw size={11} /> Update All
                          </button>
                          <button onClick={() => execCmd("pnpm run build")}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all"
                            style={{ borderColor: "#00d4ff", color: "#00d4ff", background: "rgba(0,212,255,0.1)" }}>
                            <Zap size={11} /> Build
                          </button>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
                          <div className="grid grid-cols-3 px-4 py-2 border-b border-white/5 text-[9px] font-mono text-muted-foreground tracking-widest">
                            <span>PACKAGE</span><span>VERSION</span><span>STATUS</span>
                          </div>
                          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                            {filteredDeps.map(d => (
                              <div key={d.name} className="grid grid-cols-3 items-center px-4 py-2.5 text-[11px] font-mono">
                                <span className="text-white">{d.name}</span>
                                <span className="text-muted-foreground">{d.version}</span>
                                <div className="flex items-center gap-1.5">
                                  {d.status === "ok"       && <><CheckCircle2 size={10} className="text-[#10b981]" /><span className="text-[#10b981]">Up to date</span></>}
                                  {d.status === "outdated" && <><AlertCircle  size={10} className="text-[#f59e0b]" /><span className="text-[#f59e0b]">Outdated</span></>}
                                  {d.status === "conflict" && <><AlertCircle  size={10} className="text-[#e21227]" /><span className="text-[#e21227]">Conflict</span></>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: "TypeCheck", cmd: "pnpm run typecheck", color: "#3b82f6", icon: Code2 },
                            { label: "Lint",      cmd: "pnpm run lint",      color: "#8b5cf6", icon: Search },
                            { label: "Git Status",cmd: "git --no-optional-locks status", color: "#10b981", icon: GitBranch },
                            { label: "Audit",     cmd: "pnpm audit",         color: "#f59e0b", icon: Shield },
                          ].map(a => {
                            const Icon = a.icon;
                            return (
                              <button key={a.label} onClick={() => { execCmd(a.cmd); setTab("terminal"); }}
                                className="flex items-center gap-2 p-3 rounded-xl border transition-all text-[11px] font-mono"
                                style={{ borderColor: a.color + "33", color: a.color, background: a.color + "0d" }}>
                                <Icon size={13} />{a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── API GATEWAY ────────────────────────────────────── */}
                    {tab === "api" && (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex gap-2">
                          <select value={apiInput.method} onChange={e => setApiInput(p => ({ ...p, method: e.target.value }))}
                            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white outline-none focus:border-[#00d4ff]/40"
                            style={{ color: apiInput.method === "GET" ? "#10b981" : "#f59e0b" }}>
                            {["GET","POST","PUT","DELETE","PATCH"].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input value={apiInput.url} onChange={e => setApiInput(p => ({ ...p, url: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && callAPI()}
                            placeholder="/api/providers"
                            className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm font-mono text-white placeholder:text-muted-foreground/40 outline-none focus:border-[#00d4ff]/40" />
                          <button onClick={callAPI}
                            className="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                            style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
                            SEND
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap shrink-0">
                          {PRESET_APIS.map(p => (
                            <button key={p.label} onClick={() => setApiInput(prev => ({ ...prev, method: p.method, url: p.url }))}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono border border-white/10 text-muted-foreground hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors">
                              <span style={{ color: p.method === "GET" ? "#10b981" : "#f59e0b", marginRight: 4 }}>{p.method}</span>{p.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-white/8 bg-black/20">
                          <div className="px-4 py-2 border-b border-white/5 text-[9px] font-mono text-muted-foreground tracking-widest">
                            RESPONSE LOG · {apiCalls.length} CALLS
                          </div>
                          {apiCalls.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-muted-foreground text-[11px] font-mono">
                              No API calls yet — send a request above
                            </div>
                          ) : (
                            <div className="divide-y divide-white/5">
                              {[...apiCalls].reverse().map(c => {
                                const ok = c.status >= 200 && c.status < 300;
                                const pending = c.status === 0;
                                return (
                                  <div key={c.id} className="px-4 py-3 flex items-center gap-3 text-[11px] font-mono">
                                    <span style={{ color: c.method === "GET" ? "#10b981" : "#f59e0b", minWidth: 40 }}>{c.method}</span>
                                    <span className="flex-1 text-white truncate">{c.url}</span>
                                    <span style={{ color: pending ? "#f59e0b" : ok ? "#10b981" : "#e21227" }}>
                                      {pending ? "…" : c.status}
                                    </span>
                                    <span className="text-muted-foreground">{pending ? "" : `${c.ms}ms`}</span>
                                    <span className="text-muted-foreground text-[9px]">{c.time}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── AUTO-PILOT ─────────────────────────────────────── */}
                    {tab === "autonomous" && (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#00d4ff22,#8b5cf622)", border: "1px solid rgba(0,212,255,0.3)" }}>
                            <InfinityIcon size={16} style={{ color: "#00d4ff" }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white font-mono">AUTONOMOUS AUTO-PILOT</div>
                            <div className="text-[11px] text-muted-foreground font-mono">Select tasks — JARVIS executes them independently</div>
                          </div>
                          <button onClick={() => autoTasks.forEach(t => t.status === "idle" && runAutoTask(t.id))}
                            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                            style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
                            <ZapIcon size={11} /> RUN ALL
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                          {autoTasks.map(task => {
                            const isRun  = task.status === "running";
                            const isDone = task.status === "done";
                            const col    = isDone ? "#10b981" : isRun ? "#00d4ff" : "#334155";
                            return (
                              <motion.div key={task.id} className="rounded-xl border p-4 transition-all"
                                style={{ borderColor: col + "44", background: isRun ? "rgba(0,212,255,0.04)" : "rgba(0,0,0,0.2)", boxShadow: isRun ? "0 0 24px rgba(0,212,255,0.08)" : "none" }}>
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                    style={{ background: col + "22", border: `1px solid ${col}44` }}>
                                    {isDone ? <CheckCircle2 size={13} style={{ color: col }} /> :
                                      isRun ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={12} style={{ color: col }} /></motion.div> :
                                        <Circle size={12} style={{ color: col }} />}
                                  </div>
                                  <div className="flex-1 font-mono text-[12px]" style={{ color: isDone || isRun ? "#fff" : "#64748b" }}>{task.title}</div>
                                  {task.status === "idle" && (
                                    <button onClick={() => runAutoTask(task.id)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border"
                                      style={{ borderColor: "#00d4ff44", color: "#00d4ff", background: "rgba(0,212,255,0.08)" }}>
                                      <Play size={9} /> Run
                                    </button>
                                  )}
                                  {(isRun || isDone) && (
                                    <span className="text-[10px] font-mono" style={{ color: col }}>{task.progress}%</span>
                                  )}
                                </div>
                                {(isRun || isDone) && (
                                  <>
                                    <div className="h-1 rounded-full bg-white/5 mb-2">
                                      <motion.div className="h-full rounded-full" animate={{ width: `${task.progress}%` }} transition={{ duration: 0.4 }}
                                        style={{ background: `linear-gradient(90deg,${col}88,${col})` }} />
                                    </div>
                                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                      {task.log.map((line, i) => (
                                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                          className="text-[10px] font-mono" style={{ color: line.includes("✓") ? "#10b981" : "#64748b" }}>
                                          {line}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-2">
              <Globe size={9} style={{ color: "#00d4ff" }} />
              <span className="text-[9px] font-mono text-muted-foreground">JARVIS COMMAND CENTER · FILE CONTROL · SHELL · API · AUTO-PILOT · ONLINE</span>
            </div>
            <div className="flex items-center gap-3">
              {[{ l: "SHELL", c: "#00d4ff" }, { l: "FILES", c: "#8b5cf6" }, { l: "API", c: "#10b981" }, { l: "AUTO", c: "#f59e0b" }].map(s => (
                <div key={s.l} className="flex items-center gap-1">
                  <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }}
                    animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: Math.random() }} />
                  <span className="text-[8px] font-mono" style={{ color: s.c + "99" }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
