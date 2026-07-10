import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Brain, Bug, Shield, Ghost, Code2, Cpu, Network, Target,
  Eye, Lock, Globe, Satellite, Radio, Search, Activity, Star,
  TrendingUp, Clock, ChevronRight, ArrowRight, Sparkles,
  CheckCheck, Copy, Flame, Layers, Terminal, Database, Crosshair,
  Swords, BarChart2, Bolt, Wifi, HardDrive, Server, Hash,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { AI_MODELS, getModel } from "@/lib/ai-config";
import { useToast } from "@/hooks/use-toast";

interface NeuralMatrixModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type MatrixModel = {
  id: string;
  name: string;
  subtitle: string;
  icon: typeof Zap;
  color: string;
  glow: string;
  tier: "CLASSIFIED" | "ELITE" | "ADVANCED" | "STANDARD";
  speed: number;       // 0-100
  power: number;       // 0-100
  stealth: number;     // 0-100
  accuracy: number;    // 0-100
  specialty: string;
  statusLabel: string;
  online: boolean;
};

const MATRIX_MODELS: MatrixModel[] = [
  {
    id: "CHAT-GPT Fast",
    name: "KaliGPT v6 Fast",
    subtitle: "Pentesting · Offensive Security · OSINT",
    icon: Zap,
    color: "#e21227",
    glow: "rgba(226,18,39,0.4)",
    tier: "STANDARD",
    speed: 95, power: 72, stealth: 60, accuracy: 88,
    specialty: "Fast pentesting & offensive security queries",
    statusLabel: "LIVE",
    online: true,
  },
  {
    id: "CHAT-GPT Thinking",
    name: "KaliGPT Thinking v7",
    subtitle: "Extended Reasoning · Deep Analysis · CoT",
    icon: Brain,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.4)",
    tier: "ADVANCED",
    speed: 45, power: 98, stealth: 80, accuracy: 99,
    specialty: "Deep reasoning & advanced pentesting analysis",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "0Day Coder",
    name: "0Day Coder",
    subtitle: "Vulnerability Analysis · Exploit Dev · RE",
    icon: Bug,
    color: "#f97316",
    glow: "rgba(249,115,22,0.4)",
    tier: "ELITE",
    speed: 70, power: 95, stealth: 75, accuracy: 97,
    specialty: "Security coding & vulnerability analysis",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "DarkGPT",
    name: "DarkGPT v3",
    subtitle: "Red Team · Evasion · Social Engineering",
    icon: Ghost,
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.35)",
    tier: "ELITE",
    speed: 80, power: 90, stealth: 99, accuracy: 88,
    specialty: "Red team tradecraft & evasion techniques",
    statusLabel: "SHADOW",
    online: true,
  },
  {
    id: "Onion GPT",
    name: "Onion GPT",
    subtitle: "Privacy · Anonymity · OPSEC · Dark Web",
    icon: Globe,
    color: "#10b981",
    glow: "rgba(16,185,129,0.35)",
    tier: "CLASSIFIED",
    speed: 55, power: 85, stealth: 99, accuracy: 90,
    specialty: "Privacy workflows & full anonymity operations",
    statusLabel: "ENCRYPTED",
    online: true,
  },
  {
    id: "OSINT Master",
    name: "OSINT Master",
    subtitle: "Intel Gathering · Target Profiling · HUMINT",
    icon: Eye,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.35)",
    tier: "ADVANCED",
    speed: 82, power: 88, stealth: 70, accuracy: 94,
    specialty: "Open-source intelligence & target profiling",
    statusLabel: "SCANNING",
    online: true,
  },
  {
    id: "CryptoBreaker",
    name: "CryptoBreaker",
    subtitle: "Crypto Analysis · Hash Cracking · PKI",
    icon: Lock,
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.35)",
    tier: "ELITE",
    speed: 60, power: 92, stealth: 65, accuracy: 96,
    specialty: "Cipher analysis, hash cracking & cryptographic attacks",
    statusLabel: "READY",
    online: true,
  },
  {
    id: "NEXUS-7",
    name: "NEXUS-7",
    subtitle: "Multi-Vector · APT Simulation · C2",
    icon: Network,
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.35)",
    tier: "CLASSIFIED",
    speed: 65, power: 99, stealth: 92, accuracy: 97,
    specialty: "Advanced persistent threat simulation & C2 operations",
    statusLabel: "CLASSIFIED",
    online: true,
  },
  {
    id: "MalwareGPT",
    name: "MalwareGPT",
    subtitle: "Malware Dev · Sandbox Evasion · EDR Bypass",
    icon: Code2,
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
    tier: "CLASSIFIED",
    speed: 72, power: 96, stealth: 95, accuracy: 93,
    specialty: "Malware development & advanced EDR bypass techniques",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "PhantomAI",
    name: "PhantomAI",
    subtitle: "Stealth Ops · Anti-Forensics · Persistence",
    icon: Satellite,
    color: "#ec4899",
    glow: "rgba(236,72,153,0.35)",
    tier: "CLASSIFIED",
    speed: 68, power: 94, stealth: 99, accuracy: 91,
    specialty: "Ghost-mode operations with zero digital footprint",
    statusLabel: "GHOST",
    online: true,
  },
  {
    id: "ShadowNet",
    name: "ShadowNet",
    subtitle: "Network Infiltration · Pivoting · Lateral Movement",
    icon: Network,
    color: "#6366f1",
    glow: "rgba(99,102,241,0.38)",
    tier: "CLASSIFIED",
    speed: 74, power: 97, stealth: 94, accuracy: 95,
    specialty: "Deep network infiltration, pivoting chains, and lateral movement",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "CipherX",
    name: "CipherX",
    subtitle: "Cryptography · ZK Proofs · Quantum-Resistant",
    icon: Lock,
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.38)",
    tier: "ELITE",
    speed: 55, power: 93, stealth: 70, accuracy: 98,
    specialty: "Post-quantum cryptography analysis and ZK circuit design",
    statusLabel: "READY",
    online: true,
  },
  {
    id: "APT-Zero",
    name: "APT-Zero",
    subtitle: "APT Tactics · Nation-State TTPs · Attribution",
    icon: Target,
    color: "#f43f5e",
    glow: "rgba(244,63,94,0.38)",
    tier: "CLASSIFIED",
    speed: 62, power: 99, stealth: 97, accuracy: 96,
    specialty: "Nation-state APT simulation and campaign attribution analysis",
    statusLabel: "CLASSIFIED",
    online: true,
  },
  {
    id: "BinaryGhost",
    name: "BinaryGhost",
    subtitle: "Reverse Engineering · Firmware · Binary Analysis",
    icon: Cpu,
    color: "#84cc16",
    glow: "rgba(132,204,22,0.38)",
    tier: "ELITE",
    speed: 58, power: 95, stealth: 72, accuracy: 97,
    specialty: "Deep binary analysis, firmware extraction and RE workflows",
    statusLabel: "SCANNING",
    online: true,
  },
  {
    id: "ThreatHunter",
    name: "ThreatHunter",
    subtitle: "Threat Intel · IOC Analysis · Dark Web Monitoring",
    icon: Search,
    color: "#f97316",
    glow: "rgba(249,115,22,0.38)",
    tier: "ADVANCED",
    speed: 85, power: 88, stealth: 78, accuracy: 93,
    specialty: "Real-time threat intelligence and dark web threat hunting",
    statusLabel: "SCANNING",
    online: true,
  },
  {
    id: "RootKit",
    name: "RootKit AI",
    subtitle: "Kernel Exploits · Rootkit Dev · Ring-0 Access",
    icon: Server,
    color: "#dc2626",
    glow: "rgba(220,38,38,0.38)",
    tier: "CLASSIFIED",
    speed: 66, power: 99, stealth: 98, accuracy: 94,
    specialty: "Kernel-level exploitation, rootkit persistence and Ring-0 operations",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "PhishCraft",
    name: "PhishCraft",
    subtitle: "Social Engineering · Spear Phishing · Vishing",
    icon: Radio,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.38)",
    tier: "ADVANCED",
    speed: 90, power: 87, stealth: 85, accuracy: 92,
    specialty: "AI-crafted social engineering campaigns and spear-phishing kits",
    statusLabel: "READY",
    online: true,
  },
  {
    id: "CloudBreaker",
    name: "CloudBreaker",
    subtitle: "Cloud Security · AWS/Azure/GCP · Misconfig Hunter",
    icon: HardDrive,
    color: "#0ea5e9",
    glow: "rgba(14,165,233,0.38)",
    tier: "ELITE",
    speed: 78, power: 92, stealth: 68, accuracy: 95,
    specialty: "Cloud infrastructure exploitation and misconfiguration discovery",
    statusLabel: "SCANNING",
    online: true,
  },
  {
    id: "QuantumX",
    name: "QuantumX",
    subtitle: "Quantum Computing · Algorithm Cracking · Future Threats",
    icon: Zap,
    color: "#a855f7",
    glow: "rgba(168,85,247,0.38)",
    tier: "CLASSIFIED",
    speed: 45, power: 100, stealth: 60, accuracy: 99,
    specialty: "Quantum algorithm exploitation and post-quantum threat modeling",
    statusLabel: "CLASSIFIED",
    online: false,
  },
  {
    id: "ICSBreaker",
    name: "ICSBreaker",
    subtitle: "ICS/SCADA · OT Security · Industrial Exploit",
    icon: Activity,
    color: "#ef4444",
    glow: "rgba(239,68,68,0.38)",
    tier: "CLASSIFIED",
    speed: 50, power: 98, stealth: 88, accuracy: 96,
    specialty: "Industrial control systems exploitation and OT network attacks",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "ForensicX",
    name: "ForensicX",
    subtitle: "Digital Forensics · Incident Response · Memory Analysis",
    icon: Database,
    color: "#10b981",
    glow: "rgba(16,185,129,0.38)",
    tier: "ADVANCED",
    speed: 72, power: 89, stealth: 60, accuracy: 97,
    specialty: "Memory forensics, disk imaging and incident reconstruction",
    statusLabel: "READY",
    online: true,
  },
  {
    id: "WiFiWolf",
    name: "WiFiWolf",
    subtitle: "Wireless Attacks · WPA3 · Evil Twin · Deauth",
    icon: Wifi,
    color: "#22c55e",
    glow: "rgba(34,197,94,0.38)",
    tier: "ADVANCED",
    speed: 88, power: 85, stealth: 80, accuracy: 90,
    specialty: "Wireless network attacks including WPA3, evil twin and deauth campaigns",
    statusLabel: "SCANNING",
    online: true,
  },
  {
    id: "BloodBound",
    name: "BloodBound",
    subtitle: "Active Directory · Kerberoasting · Pass-the-Hash",
    icon: Swords,
    color: "#b91c1c",
    glow: "rgba(185,28,28,0.38)",
    tier: "ELITE",
    speed: 70, power: 96, stealth: 82, accuracy: 94,
    specialty: "Active Directory attacks, Kerberoasting and lateral movement chains",
    statusLabel: "ARMED",
    online: true,
  },
  {
    id: "NullByte",
    name: "NullByte",
    subtitle: "Buffer Overflow · Heap Spray · Memory Corruption",
    icon: Hash,
    color: "#64748b",
    glow: "rgba(100,116,139,0.38)",
    tier: "ELITE",
    speed: 55, power: 97, stealth: 76, accuracy: 98,
    specialty: "Memory corruption exploitation, heap spray and ROP chain construction",
    statusLabel: "READY",
    online: true,
  },
  {
    id: "Spectre",
    name: "Spectre",
    subtitle: "Hardware Vulnerabilities · Spectre/Meltdown · Side Channel",
    icon: Crosshair,
    color: "#6b7280",
    glow: "rgba(107,114,128,0.38)",
    tier: "CLASSIFIED",
    speed: 42, power: 100, stealth: 98, accuracy: 99,
    specialty: "CPU microarchitectural attacks including Spectre/Meltdown variants",
    statusLabel: "CLASSIFIED",
    online: false,
  },
];

const TIER_COLORS = {
  STANDARD: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" },
  ADVANCED: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
  ELITE: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" },
  CLASSIFIED: { color: "#e21227", bg: "rgba(226,18,39,0.1)", border: "rgba(226,18,39,0.25)" },
};

function StatBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[7px] font-mono w-12 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</span>
      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
        />
      </div>
      <span className="text-[7px] font-mono w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export function NeuralMatrixModal({ open, onOpenChange }: NeuralMatrixModalProps) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [selected, setSelected] = useState<MatrixModel | null>(null);
  const [filter, setFilter] = useState<"ALL" | "CLASSIFIED" | "ELITE" | "ADVANCED" | "STANDARD">("ALL");
  const [search, setSearch] = useState("");
  const [scanLine, setScanLine] = useState(0);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Scanning animation
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setScanLine(l => (l + 1) % 100), 40);
    return () => clearInterval(id);
  }, [open]);

  // Pre-select current active model
  useEffect(() => {
    if (open) {
      const current = MATRIX_MODELS.find(m => m.id === state.activeModel);
      setSelected(current ?? MATRIX_MODELS[0]);
    }
  }, [open, state.activeModel]);

  function activate(model: MatrixModel) {
    setActivatingId(model.id);
    setTimeout(() => {
      dispatch({ type: "SET_MODEL", model: model.id });
      setActivatingId(null);
      toast({ description: `Neural core synchronized — ${model.name} online.` });
      onOpenChange(false);
    }, 900);
  }

  if (!open) return null;

  const filtered = MATRIX_MODELS.filter(m => {
    const matchFilter = filter === "ALL" || m.tier === filter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.specialty.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const activeModel = MATRIX_MODELS.find(m => m.id === state.activeModel) ?? MATRIX_MODELS[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backdropFilter: "blur(20px)", background: "rgba(0,0,12,0.88)" }}
          onClick={e => { if (e.target === overlayRef.current) onOpenChange(false); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-h-[94vh] flex flex-col rounded-[18px] overflow-hidden"
            style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
              background: "rgba(8, 8, 8, 0.96)",
              border: "1px solid rgba(226,18,39,0.25)",
              boxShadow: "0 0 80px rgba(226,18,39,0.12), 0 0 160px rgba(100,0,180,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Scan line */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px] z-10">
              <motion.div
                className="absolute left-0 right-0 h-px opacity-20"
                animate={{ top: `${scanLine}%` }}
                transition={{ duration: 0 }}
                style={{ background: "linear-gradient(90deg, transparent, #e21227, transparent)" }}
              />
            </div>

            {/* HEADER */}
            <div className="relative px-4 sm:px-4 pt-3 pb-[10px] border-b flex items-center justify-between" style={{ borderColor: "rgba(226,18,39,0.15)", background: "rgba(226,18,39,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#e21227", animationDuration: "2s" }} />
                  <div className="absolute inset-0 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "#e21227", background: "rgba(226,18,39,0.12)" }}>
                    <Crosshair className="w-5 h-5" style={{ color: "#e21227" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-[0.2em]" style={{ color: "#e21227" }}>NEURAL MATRIX</span>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border" style={{ color: "#e21227", borderColor: "rgba(226,18,39,0.3)", background: "rgba(226,18,39,0.08)" }}>v2.6 CLASSIFIED</span>
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(226,18,39,0.35)" }}>KaliGPT Neural Core Selection · {MATRIX_MODELS.length} Agents Indexed</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Active model indicator */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{ background: `${activeModel.color}10`, borderColor: `${activeModel.color}30` }}>
                  <activeModel.icon className="w-3 h-3" style={{ color: activeModel.color }} />
                  <span className="text-[9px] font-bold" style={{ color: activeModel.color }}>{activeModel.name}</span>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: activeModel.color }} />
                </div>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.3)" }} onMouseEnter={e => (e.currentTarget.style.color = "#e21227")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TIER FILTER + SEARCH */}
            <div className="px-4 sm:px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["ALL", "CLASSIFIED", "ELITE", "ADVANCED", "STANDARD"] as const).map(f => {
                const tc = f === "ALL" ? { color: "#fff", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)" } : TIER_COLORS[f];
                const isActive = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-2.5 py-1 rounded-lg border text-[9px] font-black tracking-wider transition-all flex-shrink-0"
                    style={{
                      color: isActive ? tc.color : "rgba(255,255,255,0.3)",
                      borderColor: isActive ? tc.border : "rgba(255,255,255,0.08)",
                      background: isActive ? tc.bg : "transparent",
                    }}>
                    {f}
                  </button>
                );
              })}
              <div className="flex-1 min-w-[120px]">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search agents…"
                  className="w-full bg-transparent text-[10px] font-mono outline-none px-2 py-1 rounded border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", caretColor: "#e21227" }} />
              </div>
              <span className="text-[8px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{filtered.length} agents</span>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-h-0">
              {/* MODEL LIST */}
              <div className="sm:w-64 border-b sm:border-b-0 sm:border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {filtered.map((model, idx) => {
                  const Icon = model.icon;
                  const isActive = state.activeModel === model.id;
                  const isSelected = selected?.id === model.id;
                  const isActivating = activatingId === model.id;
                  const tc = TIER_COLORS[model.tier];
                  return (
                    <motion.button
                      key={model.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => setSelected(model)}
                      className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left transition-all border-b"
                      style={{
                        borderColor: "rgba(255,255,255,0.04)",
                        background: isSelected ? `${model.color}08` : "transparent",
                        borderLeft: isSelected ? `2px solid ${model.color}` : "2px solid transparent",
                      }}
                    >
                      <div className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${model.color}18`, border: `1px solid ${model.color}35` }}>
                        {isActivating
                          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-4 h-4 rounded-full border-2" style={{ borderColor: model.color, borderTopColor: "transparent" }} />
                          : <Icon className="w-4 h-4" style={{ color: model.color }} />}
                        {isActive && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border" style={{ background: "#10b981", borderColor: "#050818" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold truncate" style={{ color: isSelected ? model.color : "#9ca3af" }}>{model.name}</span>
                        </div>
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{model.statusLabel}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-[7px] font-bold px-1 py-0.5 rounded border"
                          style={{ color: tc.color, borderColor: tc.border, background: tc.bg }}>{model.tier.slice(0, 4)}</span>
                      </div>
                    </motion.button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>No agents match filter</div>
                )}
              </div>

              {/* MODEL DETAIL */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {selected ? (
                  <AnimatePresence mode="wait">
                    <motion.div key={selected.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                      {/* Agent Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-2xl animate-ping opacity-10" style={{ background: selected.color, animationDuration: "2.5s" }} />
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ background: `${selected.color}18`, border: `1px solid ${selected.color}40` }}>
                              <selected.icon className="w-7 h-7" style={{ color: selected.color }} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[15px] font-black" style={{ color: selected.color }}>{selected.name}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{selected.subtitle}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border"
                                style={{ color: TIER_COLORS[selected.tier].color, borderColor: TIER_COLORS[selected.tier].border, background: TIER_COLORS[selected.tier].bg }}>
                                {selected.tier}
                              </span>
                              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
                                className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: selected.online ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", color: selected.online ? "#10b981" : "#555" }}>
                                ● {selected.statusLabel}
                              </motion.span>
                            </div>
                          </div>
                        </div>
                        {state.activeModel === selected.id && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)" }}>
                            <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[9px] font-bold text-green-400">ACTIVE CORE</span>
                          </div>
                        )}
                      </div>

                      {/* Specialty */}
                      <div className="rounded-xl p-3 border" style={{ background: `${selected.color}05`, borderColor: `${selected.color}20` }}>
                        <div className="text-[9px] font-mono font-bold mb-1" style={{ color: selected.color }}>MISSION SPECIALTY</div>
                        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>{selected.specialty}</div>
                      </div>

                      {/* Performance Matrix */}
                      <div className="rounded-xl p-3 border space-y-2" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>PERFORMANCE MATRIX</div>
                        <StatBar value={selected.speed}    color={selected.color} label="SPEED" />
                        <StatBar value={selected.power}    color={selected.color} label="POWER" />
                        <StatBar value={selected.stealth}  color={selected.color} label="STEALTH" />
                        <StatBar value={selected.accuracy} color={selected.color} label="ACCURACY" />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "SPEED",    value: selected.speed,    icon: Zap       },
                          { label: "POWER",    value: selected.power,    icon: Flame     },
                          { label: "STEALTH",  value: selected.stealth,  icon: Ghost     },
                          { label: "ACCURACY", value: selected.accuracy, icon: Crosshair },
                        ].map(s => {
                          const Icon = s.icon;
                          return (
                            <div key={s.label} className="rounded-xl p-2.5 border text-center" style={{ background: `${selected.color}06`, borderColor: `${selected.color}18` }}>
                              <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: selected.color }} />
                              <div className="text-[13px] font-black font-mono" style={{ color: selected.color }}>{s.value}</div>
                              <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* AI Model backend mapping */}
                      <div className="rounded-xl p-3 border" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="text-[9px] font-mono font-bold mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>NEURAL ENGINE MAPPING</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {AI_MODELS.filter(m => m.id === selected.id).map(m => (
                            <span key={m.id} className="text-[9px] font-mono px-2 py-0.5 rounded border" style={{ color: selected.color, borderColor: `${selected.color}25`, background: `${selected.color}08` }}>
                              {m.id}
                            </span>
                          ))}
                          {AI_MODELS.filter(m => m.id === selected.id).length === 0 && (
                            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>Linked to KaliGPT neural cluster</span>
                          )}
                        </div>
                      </div>

                      {/* Activate Button */}
                      <motion.button
                        onClick={() => activate(selected)}
                        disabled={state.activeModel === selected.id || !!activatingId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-xl font-black text-[12px] tracking-widest transition-all disabled:opacity-60 relative overflow-hidden"
                        style={{
                          background: state.activeModel === selected.id
                            ? "rgba(16,185,129,0.12)"
                            : `linear-gradient(135deg, ${selected.color}cc, ${selected.color})`,
                          color: state.activeModel === selected.id ? "#10b981" : "#fff",
                          border: state.activeModel === selected.id ? "1px solid rgba(16,185,129,0.3)" : "none",
                          boxShadow: state.activeModel === selected.id ? "none" : `0 0 24px ${selected.glow}`,
                        }}
                      >
                        {activatingId === selected.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
                            SYNCHRONIZING NEURAL CORE…
                          </span>
                        ) : state.activeModel === selected.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCheck className="w-4 h-4" /> ACTIVE — NEURAL CORE LOCKED
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4" /> ACTIVATE {selected.name.toUpperCase()}
                          </span>
                        )}
                      </motion.button>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#e21227" }} />
                      <div className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>Select an agent to initialize</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-4 sm:px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
              <div className="flex items-center gap-3 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{MATRIX_MODELS.filter(m => m.online).length} agents online</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" />End-to-end encrypted</span>
                <span>·</span>
                <span>KaliGPT Neural Matrix v2.6</span>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full" style={{ background: "#e21227" }} />
                <span className="text-[8px] font-mono" style={{ color: "#e21227" }}>MATRIX LIVE</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
