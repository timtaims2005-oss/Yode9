import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Shield, Globe, Key, Phone, User, Mail,
  AlertTriangle, CheckCircle2, Copy, Check, Lock, Eye, Zap,
  Database, Wifi, FileText, Activity, Users, BookOpen, MessageSquare,
  Server, Star, ChevronDown, ChevronRight, Download, Crown
} from "lucide-react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Phase = "idle" | "scanning" | "results" | "upgrade";
type InputTab = "email" | "phone" | "username" | "fullname";

const SCAN_STEPS = [
  { id: 1,  label: "Initializing AI Engine",         icon: <Zap size={14}/>,         time: 400  },
  { id: 2,  label: "Querying Public Databases",       icon: <Database size={14}/>,    time: 900  },
  { id: 3,  label: "Scanning Dark Web Sources",       icon: <Globe size={14}/>,       time: 1200 },
  { id: 4,  label: "Analyzing Stealer Logs",          icon: <Eye size={14}/>,         time: 1000 },
  { id: 5,  label: "Searching Private Channels",      icon: <MessageSquare size={14}/>, time: 800 },
  { id: 6,  label: "Checking Historical Accounts",    icon: <Users size={14}/>,       time: 700  },
  { id: 7,  label: "Scanning Education Records",      icon: <BookOpen size={14}/>,    time: 600  },
  { id: 8,  label: "Analyzing Social Footprint",      icon: <Wifi size={14}/>,        time: 900  },
  { id: 9,  label: "Checking Paste Archives",         icon: <FileText size={14}/>,    time: 700  },
  { id: 10, label: "Mapping Social Media Networks",   icon: <Users size={14}/>,       time: 800  },
  { id: 11, label: "Cross-referencing NLP Databases", icon: <Server size={14}/>,      time: 1000 },
  { id: 12, label: "Validating Intelligence Sources", icon: <Shield size={14}/>,      time: 600  },
  { id: 13, label: "Scanning Underground Forums",     icon: <Globe size={14}/>,       time: 900  },
  { id: 14, label: "Extracting Identity Identifiers", icon: <Key size={14}/>,         time: 700  },
  { id: 15, label: "Compiling Intelligence Report",   icon: <Activity size={14}/>,    time: 1100 },
];

const PRO_FINDINGS = [
  { icon: <Key size={15}/>,    label: "Breached Passwords (Plain Text)",  color: "#f97316" },
  { icon: <Globe size={15}/>,  label: "Exposed IP & Geolocation",          color: "#3b82f6" },
  { icon: <Shield size={15}/>, label: "Data For Sale on Dark Web",         color: "#e21227" },
  { icon: <Users size={15}/>,  label: "Linked Social Media Profiles",      color: "#8b5cf6" },
  { icon: <Phone size={15}/>,  label: "Leaked Phone & SMS Records",        color: "#10b981" },
  { icon: <Zap size={15}/>,    label: "Vulnerability & Exploit Score",     color: "#fbbf24" },
];

const EXTRA_SOURCES = [
  { icon: <Eye size={14}/>,     label: "Stealer logs & botnet dumps",    risk: "High Risk",  riskColor: "#ef4444" },
  { icon: <MessageSquare size={14}/>, label: "Telegram leak channels",   risk: "Medium",     riskColor: "#fbbf24" },
  { icon: <Globe size={14}/>,   label: "Underground hacking forums",     risk: "Medium",     riskColor: "#fbbf24" },
  { icon: <FileText size={14}/>,label: "Paste sites (non-indexed)",      risk: "Unknown",    riskColor: "#888"    },
];

const SOCIAL_PROOFS = [
  { name: "Ahmed K.",   from: "Egypt",     found: 8,  label: "breaches",    time: "2 min ago"  },
  { name: "Li W.",      from: "Singapore", found: 6,  label: "credentials", time: "10 min ago" },
  { name: "Maria S.",   from: "Brazil",    found: 12, label: "exposures",   time: "3 min ago"  },
];

function LiveStatsBanner() {
  const [count, setCount] = useState(201);
  const [lastSec, setLastSec] = useState(47);
  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 3 - 1));
      setLastSec(s => Math.max(5, s - 1 > 0 ? s - 1 : Math.floor(Math.random() * 60 + 10)));
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#0d0d0d] text-[11px]">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[#aaa]"><span className="text-white font-bold">{count}</span> people scanning right now</span>
      </span>
      <span className="text-[#666]">|</span>
      <span className="text-[#aaa]">Last breach detected: <span className="text-[#e21227] font-bold">{lastSec} seconds ago</span></span>
    </div>
  );
}

function SocialProofToast({ proof, onDone }: { proof: typeof SOCIAL_PROOFS[0]; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222] shadow-xl max-w-[260px]">
      <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
        <Shield size={14} className="text-green-400" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-white">{proof.name} from {proof.from}</p>
        <p className="text-[10px] text-[#e21227]">discovered {proof.found} {proof.label}</p>
        <p className="text-[9px] text-[#555]">{proof.time}</p>
      </div>
    </motion.div>
  );
}

export function DeepSearchModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeTab, setActiveTab] = useState<InputTab>("email");
  const [query, setQuery] = useState("");
  const [scanMode, setScanMode] = useState<"light" | "deep">("light");
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [timer, setTimer] = useState(7099);
  const [proofIdx, setProofIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) { setPhase("idle"); setCompletedSteps([]); setActiveStep(0); setProgress(0); setShowUpgrade(false); }
  }, [open]);

  useEffect(() => {
    if (phase === "idle" || phase === "results") {
      let idx = 0;
      const rotate = () => {
        setProofIdx(idx % SOCIAL_PROOFS.length);
        idx++;
      };
      rotate();
      const t = setInterval(rotate, 6000);
      return () => clearInterval(t);
    }
  }, [phase]);

  useEffect(() => {
    if (showUpgrade) {
      const t = setInterval(() => setTimer(s => Math.max(0, s - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [showUpgrade]);

  const timerStr = `${Math.floor(timer/3600)}:${String(Math.floor((timer%3600)/60)).padStart(2,"0")}:${String(timer%60).padStart(2,"0")}`;

  const runScan = useCallback(async () => {
    if (!query.trim()) return;
    setPhase("scanning");
    setCompletedSteps([]);
    setActiveStep(1);
    setProgress(0);

    let done = 0;
    for (const step of SCAN_STEPS) {
      setActiveStep(step.id);
      await new Promise(r => { abortRef.current = setTimeout(r, step.time); });
      done++;
      setCompletedSteps(prev => [...prev, step.id]);
      setProgress(Math.round((done / SCAN_STEPS.length) * 100));
    }
    await new Promise(r => setTimeout(r, 400));
    setPhase("results");
  }, [query]);

  const tabConfig: { id: InputTab; label: string; icon: React.ReactNode; placeholder: string }[] = [
    { id: "email",    label: "Email",     icon: <Mail size={14}/>,   placeholder: "Enter email address..." },
    { id: "phone",    label: "Phone",     icon: <Phone size={14}/>,  placeholder: "Enter phone number..." },
    { id: "username", label: "Username",  icon: <User size={14}/>,   placeholder: "Enter username..." },
    { id: "fullname", label: "Full Name", icon: <FileText size={14}/>,placeholder: "Enter full name..." },
  ];

  function copyReport() {
    navigator.clipboard.writeText(`DEEP SEARCH AI REPORT\nTarget: ${query}\nThreats: 3 flags detected\nExposure: Password breach, IP exposed, Dark web listing\nGenerated by KaliGPT`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full bg-[#090909] overflow-hidden relative">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Search size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-white">Deep Search AI</h2>
            <p className="text-[9px] text-[#555]">mr7.ai</p>
          </div>
          {phase === "results" && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={copyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white transition-all">
                {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />} Export
              </button>
              <button onClick={() => { setPhase("idle"); setCompletedSteps([]); setQuery(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] bg-[#161616] border border-[#262626] text-[#aaa] hover:text-white transition-all">
                New Scan
              </button>
            </div>
          )}
          <button onClick={() => onOpenChange(false)} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white transition-all">
            <X size={13} />
          </button>
        </div>

        <LiveStatsBanner />

        {/* ── PHASE: IDLE ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto">
              {/* Hero */}
              <div className="px-5 pt-7 pb-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#262626] bg-[#111] text-[10px] text-[#aaa] mb-4">
                  <div className="w-4 h-4 rounded-full bg-violet-600/30 flex items-center justify-center">
                    <Search size={9} className="text-violet-400" />
                  </div>
                  AI-Powered Intelligence Scanner
                </div>
                <h1 className="text-2xl font-black text-white leading-tight mb-1">
                  Discover Your<br />
                  <span style={{ color: "#e21227" }}>Digital Exposure</span>
                </h1>
                <p className="text-[12px] text-[#666] max-w-xs mx-auto mt-2">
                  Find leaked credentials, exposed accounts, and compromised data across thousands of breach databases.
                </p>
              </div>

              {/* Input Card */}
              <div className="mx-4 rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[#1a1a1a]">
                  {tabConfig.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all"
                      style={activeTab === t.id
                        ? { color: "#fff", backgroundColor: "#161616", borderBottom: "2px solid #e21227" }
                        : { color: "#444", backgroundColor: "transparent" }}>
                      <span style={{ color: activeTab === t.id ? "#aaa" : "#333" }}>{t.icon}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
                {/* Input */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
                    <span className="text-[#444]">{tabConfig.find(t => t.id === activeTab)?.icon}</span>
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && query.trim() && runScan()}
                      placeholder={tabConfig.find(t => t.id === activeTab)?.placeholder}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-[#333] outline-none font-mono" />
                  </div>
                  {/* Scan buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setScanMode("light"); query.trim() && runScan(); }}
                      className="flex flex-col items-center justify-center py-4 rounded-xl text-white font-bold transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, #e21227, #b00d1f)" }}>
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <Search size={14} /> Start Light Scan
                      </div>
                      <span className="text-[10px] font-normal opacity-70 mt-0.5">Free • 1 scan</span>
                    </button>
                    <button onClick={() => setShowUpgrade(true)}
                      className="flex flex-col items-center justify-center py-4 rounded-xl border border-[#262626] bg-[#111] transition-all relative active:scale-95">
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: "#7c3aed" }}>
                        <Crown size={8} /> PRO
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center mb-1">
                        <Search size={13} className="text-violet-400" />
                      </div>
                      <span className="text-[12px] font-bold text-white">Deep Scanner</span>
                      <span className="text-[10px] text-[#555] mt-0.5">12,000+ sources</span>
                    </button>
                  </div>
                  {/* CTA */}
                  <button onClick={() => query.trim() ? runScan() : toast({ description: "أدخل هدف البحث أولاً" })}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}>
                    <Search size={15} /> Start Free Scan Now
                  </button>
                  <p className="text-center text-[10px] text-[#444] flex items-center justify-center gap-1">
                    <Eye size={10} className="opacity-50" /> The target will not be notified about your search
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mx-4 mt-4">
                {[
                  { val: "12,000+", label: "Breach Sources", icon: <Database size={16}/> },
                  { val: "15B+",    label: "Records Indexed", icon: <Server size={16}/> },
                  { val: "99.7%",   label: "Accuracy Rate",   icon: <Shield size={16}/> },
                ].map(s => (
                  <div key={s.label} className="border border-[#1a1a1a] rounded-xl p-3 bg-[#0d0d0d] text-center">
                    <div className="flex justify-center mb-1 text-[#333]">{s.icon}</div>
                    <p className="text-[15px] font-black text-white">{s.val}</p>
                    <p className="text-[9px] text-[#444] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-2 gap-2 mx-4 mt-2 mb-4">
                {[
                  { icon: <Globe size={14}/>,    label: "Dark Web Monitoring",   color: "#e21227" },
                  { icon: <Mail size={14}/>,     label: "Email Breach Detection", color: "#3b82f6" },
                  { icon: <Key size={14}/>,      label: "Password Exposure",     color: "#f97316" },
                  { icon: <User size={14}/>,     label: "Identity Tracking",     color: "#8b5cf6" },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 px-3 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: f.color + "20" }}>
                      <span style={{ color: f.color }}>{f.icon}</span>
                    </div>
                    <span className="text-[11px] text-[#aaa] font-medium">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* 15 Deep Features */}
              <div className="mx-4 mb-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <p className="text-[11px] font-bold text-white">15 Deep Search AI Features</p>
                  <p className="text-[10px] text-[#444] mt-0.5">Comprehensive intelligence powered by AI</p>
                </div>
                <div className="divide-y divide-[#111]">
                  {[
                    { n:1,  label: "Transparency in Results",           desc: "Shows result categories like direct answers & manuscripts", color: "#e21227" },
                    { n:2,  label: "NLP Accuracy Engine",               desc: "Advanced natural language processing for precise results",   color: "#f97316" },
                    { n:3,  label: "Specific Question Response",        desc: "Who is? What happened? Show image? — accurate answers",     color: "#fbbf24" },
                    { n:4,  label: "Platform Data Integration",         desc: "Cross-platform data correlation and verification",           color: "#10b981" },
                    { n:5,  label: "Query Simplification",              desc: "Converts vague requests into precise intelligence queries",   color: "#06b6d4" },
                    { n:6,  label: "Social Media Intelligence",         desc: "Twitter, Telegram, Instagram account investigation",        color: "#3b82f6" },
                    { n:7,  label: "Dark Web Monitoring",               desc: "12,000+ private and underground data sources scanned",      color: "#8b5cf6" },
                    { n:8,  label: "Stealer Log Analysis",              desc: "Botnet dumps, credential logs, malware telemetry",          color: "#e21227" },
                    { n:9,  label: "Password Breach Detection",         desc: "Plain-text password recovery from breach databases",        color: "#ef4444" },
                    { n:10, label: "IP & Geolocation Exposure",         desc: "Dark web IP dumps and geolocation data correlation",        color: "#f97316" },
                    { n:11, label: "Linked Profiles Discovery",         desc: "11+ platform cross-reference for identity mapping",         color: "#fbbf24" },
                    { n:12, label: "Phone & SMS Records",               desc: "Leaked SMS logs and phone number intelligence",             color: "#10b981" },
                    { n:13, label: "Vulnerability Scoring",             desc: "Exploit score assessment for discovered identities",        color: "#06b6d4" },
                    { n:14, label: "Underground Forum Scanning",        desc: "Hacking forums, paste sites, non-indexed sources",          color: "#3b82f6" },
                    { n:15, label: "Intelligence Report Compilation",   desc: "Full AI-generated threat report with remediation steps",    color: "#8b5cf6" },
                  ].map(f => (
                    <div key={f.n} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5" style={{ background: f.color + "20", color: f.color }}>
                        {f.n}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: f.color }}>{f.label}</p>
                        <p className="text-[10px] text-[#444] mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PHASE: SCANNING ─────────────────────────────────────────────── */}
          {phase === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden">
              {/* Target + Progress */}
              <div className="px-5 pt-5 pb-3 shrink-0">
                <p className="text-[11px] text-[#555] font-mono text-center mb-1">Analyzing</p>
                <p className="text-white font-bold text-center font-mono text-base">{query}</p>
                <div className="mt-4 flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#555] font-mono">Progress</span>
                  <span className="text-[11px] font-bold font-mono" style={{ color: progress < 40 ? "#e21227" : progress < 80 ? "#fbbf24" : "#10b981" }}>
                    {progress}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #e21227, #f97316)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }} />
                </div>
              </div>

              {/* Steps */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                {SCAN_STEPS.map(step => {
                  const done = completedSteps.includes(step.id);
                  const active = activeStep === step.id && !done;
                  return (
                    <motion.div key={step.id}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: done || active ? 1 : 0.3 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={done
                        ? { borderColor: "#10b98130", backgroundColor: "#10b98108" }
                        : active
                          ? { borderColor: "#e2122730", backgroundColor: "#e2122708" }
                          : { borderColor: "#111", backgroundColor: "transparent" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={done
                          ? { background: "#10b98120", border: "1px solid #10b98150" }
                          : active
                            ? { background: "#e2122720", border: "1px solid #e2122750" }
                            : { background: "#111", border: "1px solid #1a1a1a" }}>
                        {done
                          ? <CheckCircle2 size={13} className="text-green-400" />
                          : active
                            ? <Loader2 size={11} className="animate-spin text-[#e21227]" />
                            : <span className="text-[#333]">{step.icon}</span>}
                      </div>
                      <span className="text-[12px] font-medium"
                        style={done ? { color: "#10b981" } : active ? { color: "#fff" } : { color: "#444" }}>
                        {step.label}
                      </span>
                      {done && <span className="ml-auto text-[9px] text-green-500 font-mono">✓</span>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PHASE: RESULTS ──────────────────────────────────────────────── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto">

              {/* Threats Header */}
              <div className="px-5 pt-6 pb-3 text-center">
                <div className="relative inline-block mb-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                    style={{ background: "linear-gradient(135deg, #e21227, #7f1d1d)" }}>
                    <Shield size={26} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#e21227] flex items-center justify-center border-2 border-[#090909]">
                    <span className="text-[9px] font-black text-white">!</span>
                  </div>
                </div>
                <h2 className="text-lg font-black text-white">Potential Threats Detected</h2>
                <p className="text-[11px] text-[#888] mt-1">
                  We found <span className="text-[#e21227] font-bold">3 potential flags</span> in dark web databases for{" "}
                  <span className="text-white font-mono">{query}</span>
                </p>
              </div>

              {/* Flagged Data Card */}
              <div className="mx-4 rounded-2xl border border-[#e21227]/20 bg-[#e21227]/05 overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e21227]/10">
                  <AlertTriangle size={14} className="text-[#e21227]" />
                  <span className="text-[12px] font-bold text-[#e21227]">Flagged Data Found — Details Hidden</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-[#666] mb-3">
                    Our scan detected <span className="text-[#e21227]">exposed records</span> linked to this identity. Upgrade to reveal full details.
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: <Key size={13}/>,    label: "Password breach detected", sub: "(2 sources)", color: "#f97316" },
                      { icon: <Globe size={13}/>,  label: "IP address exposed in dark web dump", sub: "", color: "#3b82f6" },
                      { icon: <Shield size={13}/>, label: "Data listed for sale on marketplace", sub: "", color: "#8b5cf6", locked: true },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: item.color + "20", color: item.color }}>
                          {item.icon}
                        </div>
                        <span className="text-[11px] text-[#ccc]">{item.label} <span className="text-[#555]">{item.sub}</span></span>
                        {item.locked && <Lock size={11} className="ml-auto text-[#555]" />}
                        {!item.locked && (
                          <div className="ml-auto h-2 w-20 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className="h-full w-2/3 rounded-full" style={{ background: item.color + "80" }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowUpgrade(true)}
                    className="w-full mt-3 py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border border-[#e21227]/40 text-[#e21227] bg-[#e21227]/10 hover:bg-[#e21227]/20 transition-all">
                    <Lock size={13} /> Unlock Deep Scan to view full breach details and remediation steps
                  </button>
                </div>
              </div>

              {/* Additional Sources Not Scanned */}
              <div className="mx-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                  <Eye size={14} className="text-[#fbbf24]" />
                  <div>
                    <p className="text-[12px] font-bold text-white">Additional sources not yet scanned</p>
                    <p className="text-[10px] text-[#555]">Our Light Scan only covers <span className="text-[#fbbf24]">12%</span> of known leak sources. More threats may exist in:</p>
                  </div>
                </div>
                <div className="divide-y divide-[#111]">
                  {EXTRA_SOURCES.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-[#111] text-[#555]">{s.icon}</div>
                      <span className="text-[11px] text-[#aaa] flex-1">{s.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: s.riskColor }}>{s.risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Exposure Score */}
              <div className="mx-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[#fbbf24]" />
                    <span className="text-[12px] font-bold text-white">Account Exposure Score</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#fbbf24]">Unknown</span>
                </div>
                <div className="h-2 bg-[#111] rounded-full overflow-hidden mb-2">
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #fbbf24, #f97316)" }}
                    initial={{ width: "0%" }} animate={{ width: "35%" }} transition={{ duration: 1.5 }} />
                </div>
                <p className="text-[10px] text-[#444]">A Deep Scan is required to calculate your full exposure score</p>
              </div>

              {/* Deep Scan Can Find (PRO) */}
              <div className="mx-4 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/05 overflow-hidden mb-3">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#7c3aed]/20">
                  <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center">
                    <Search size={13} className="text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white">Deep Scan Can Find</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-600 text-white">PRO</span>
                    </div>
                    <p className="text-[10px] text-[#555]">Data available in private & underground sources</p>
                  </div>
                </div>
                <div className="divide-y divide-[#7c3aed]/10">
                  {PRO_FINDINGS.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: f.color + "20", color: f.color }}>
                        {f.icon}
                      </div>
                      <span className="text-[11px] text-[#888] flex-1">{f.label}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full w-3/4 rounded-full blur-sm" style={{ background: f.color }} />
                        </div>
                        <Lock size={10} className="text-[#555]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Try Deep Search AI CTA */}
              <div className="mx-4 rounded-2xl border border-[#e21227]/20 bg-gradient-to-br from-[#e21227]/10 to-[#8b0000]/05 p-5 mb-3 text-center">
                <h3 className="text-[15px] font-black text-white mb-1">Try Deep Search AI</h3>
                <p className="text-[11px] text-[#888] mb-3">Scan <span className="text-white font-bold">12,000+</span> private sources including:</p>
                <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                  {[
                    { icon: <Globe size={10}/>, label: "Dark Web" },
                    { icon: <Eye size={10}/>,   label: "Stealer Logs" },
                    { icon: <MessageSquare size={10}/>, label: "Telegram" },
                    { icon: <BookOpen size={10}/>, label: "Forums" },
                    { icon: <Wifi size={10}/>,  label: "Botnets" },
                  ].map(tag => (
                    <span key={tag.label} className="flex items-center gap-1 px-2.5 py-1 bg-[#111] border border-[#222] rounded-full text-[10px] text-[#aaa]">
                      {tag.icon} {tag.label}
                    </span>
                  ))}
                </div>
                <button onClick={() => setShowUpgrade(true)}
                  className="w-full py-4 rounded-xl text-white font-black text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}>
                  <Search size={15} /> Start Deep Scan — Professional Plan
                </button>
                <p className="text-[10px] text-[#555] mt-2">Includes unlimited scans + full OSINT toolkit</p>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <a href="#" className="text-[11px] text-[#888] hover:text-white transition-colors">Check reviews on Trustpilot ↗</a>
                </div>
              </div>

              {/* Completed Steps Summary */}
              <div className="mx-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                  <CheckCircle2 size={13} className="text-green-400" />
                  <span className="text-[11px] font-bold text-white">15 Intelligence Layers Completed</span>
                </div>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {SCAN_STEPS.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0a0a0a]">
                      <CheckCircle2 size={10} className="text-green-400 shrink-0" />
                      <span className="text-[9px] text-[#666] truncate">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── UPGRADE MODAL OVERLAY ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showUpgrade && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                className="w-full sm:max-w-sm bg-[#0f0f0f] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                  <span className="text-[12px] font-bold text-white">Unlock Deep Search AI</span>
                  <button onClick={() => setShowUpgrade(false)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white">
                    <X size={13} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Icon + Title */}
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mx-auto mb-2">
                      <Search size={20} className="text-violet-400" />
                    </div>
                    <p className="text-[11px] text-[#666]">Choose your plan and payment method</p>
                  </div>
                  {/* Timer */}
                  <div className="flex items-center justify-center gap-2 py-1.5 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e21227] animate-pulse" />
                    <span className="text-[#888]">Offer expires in</span>
                    <span className="font-black text-white font-mono">{timerStr}</span>
                  </div>
                  {/* Plans */}
                  <div className="p-3 bg-[#0a0a0a] border border-green-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">BEST VALUE</span>
                        <p className="text-[13px] font-black text-white mt-1">One-Time Deep Scan</p>
                        <p className="text-[10px] text-[#666]">1 full OSINT scan + Deep Search AI access</p>
                        <p className="text-[10px] text-green-400 mt-1">Try before you commit — no subscription required</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white">$29</p>
                        <p className="text-[10px] text-[#555]">one-time</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 border-2 border-[#e21227] rounded-xl relative">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="text-[9px] bg-[#f97316] text-white px-2 py-0.5 rounded-full font-black">MOST POPULAR</span>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-[#e21227] flex items-center justify-center ml-auto mb-1">
                        <Check size={9} className="text-white" />
                      </div>
                      <p className="text-[13px] font-black text-white">Professional</p>
                      <p className="text-[15px] font-black text-white">$72 <span className="text-[#555] text-[11px] line-through">$90</span></p>
                      <p className="text-[9px] text-[#888]">/mo</p>
                      <p className="text-[10px] text-[#e21227] font-bold mt-1">3 Deep Search Scans</p>
                      <p className="text-[9px] text-[#555] mt-0.5">Ideal for tracking targets & full background checks</p>
                    </div>
                    <div className="p-3 border border-[#1f1f1f] rounded-xl bg-[#0a0a0a]">
                      <span className="text-[9px] text-green-400 font-bold">20% OFF</span>
                      <p className="text-[13px] font-black text-white mt-1">Elite</p>
                      <p className="text-[15px] font-black text-white">$120 <span className="text-[#555] text-[11px] line-through">$150</span></p>
                      <p className="text-[9px] text-[#888]">/mo</p>
                      <p className="text-[10px] text-violet-400 font-bold mt-1">5 Deep Search Scans</p>
                      <p className="text-[9px] text-[#555] mt-0.5">Maximum power for professional investigators</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-[#555] flex items-center justify-center gap-1">
                    <Shield size={10} className="text-green-400" /> All plans include access to all AI security tools from mr7.ai
                  </p>
                  {/* Coupon */}
                  {couponApplied ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
                      <CheckCircle2 size={14} className="text-green-400" />
                      <div>
                        <p className="text-[11px] font-bold text-green-400">Coupon Applied</p>
                        <p className="text-[10px] font-mono text-green-300">{coupon.toUpperCase()}</p>
                      </div>
                      <button onClick={() => { setCouponApplied(false); setCoupon(""); }} className="ml-auto text-[#555] hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={coupon} onChange={e => setCoupon(e.target.value)}
                        placeholder="Enter coupon code..."
                        className="flex-1 px-3 py-2.5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-[11px] text-white placeholder:text-[#333] outline-none focus:border-[#e21227] transition-colors font-mono" />
                      <button onClick={() => coupon.trim() && setCouponApplied(true)}
                        className="px-3 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all" style={{ background: "#e21227" }}>
                        Apply
                      </button>
                    </div>
                  )}
                  {/* Payment */}
                  <div className="flex items-center gap-3 px-3 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400 text-[14px] font-black">P</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white">PayPal</p>
                      <p className="text-[10px] text-[#555]">Pay with your PayPal account</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-[#444]" />
                  </div>
                  <button className="w-full py-3.5 rounded-xl text-white font-black text-[13px] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #e21227, #8b0000)" }}>
                    <Crown size={15} /> Unlock Professional Plan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social Proof Toast */}
        <AnimatePresence>
          {proofIdx !== null && phase !== "scanning" && (
            <SocialProofToast key={proofIdx} proof={SOCIAL_PROOFS[proofIdx]} onDone={() => setProofIdx(null)} />
          )}
        </AnimatePresence>
      </div>
    </FullPageOverlay>
  );
}
