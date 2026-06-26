import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Search, X, Shield, Globe, Key, Phone, User, Mail,
  AlertTriangle, CheckCircle2, Copy, Check, Lock, Eye, Zap,
  Database, Wifi, FileText, Activity, Users, BookOpen, MessageSquare,
  Server, Star, ChevronRight, Crown, Loader2, Download,
  Camera, Hash, AtSign, Calendar, ExternalLink,
  Fingerprint, Network, Cpu, Radio, GitBranch, MapPin,
  TrendingUp, BarChart2, Layers, Target, Crosshair, Scan,
  Image, Video, Mic, Heart, Share2, ThumbsUp
} from "lucide-react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenChainInvestigation?: () => void;
}
type Phase = "idle" | "scanning" | "results";
type InputTab = "email" | "phone" | "username" | "fullname";
type ResultTab = "overview" | "ai-report" | "identity" | "breaches" | "media" | "social" | "activity";
type PaymentTab = "usdt_trc20" | "usdt_bep20" | "btc" | "paypal";

const PAYMENT_ADDRESSES = {
  usdt_trc20: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
  usdt_bep20: "0x742d35Cc6634C0532925a3b8D4C9C3e6F1A7B8D2",
  btc:        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  paypal:     "@mr7ai",
};

const SCAN_STEPS = [
  { id:1,  label:"Initializing AI Engine",          icon:<Zap size={14}/>,            ms:380  },
  { id:2,  label:"Querying Public Databases",        icon:<Database size={14}/>,       ms:820  },
  { id:3,  label:"Scanning Dark Web Sources",        icon:<Globe size={14}/>,          ms:1100 },
  { id:4,  label:"Analyzing Stealer Logs",           icon:<Eye size={14}/>,            ms:950  },
  { id:5,  label:"Searching Private Channels",       icon:<MessageSquare size={14}/>,  ms:750  },
  { id:6,  label:"Checking Historical Accounts",     icon:<Users size={14}/>,          ms:680  },
  { id:7,  label:"Scanning Education Records",       icon:<BookOpen size={14}/>,       ms:560  },
  { id:8,  label:"Analyzing Social Footprint",       icon:<Wifi size={14}/>,           ms:870  },
  { id:9,  label:"Checking Paste Archives",          icon:<FileText size={14}/>,       ms:640  },
  { id:10, label:"Mapping Social Media Networks",    icon:<Network size={14}/>,        ms:780  },
  { id:11, label:"Cross-referencing NLP Databases",  icon:<Cpu size={14}/>,            ms:930  },
  { id:12, label:"Validating Intelligence Sources",  icon:<Shield size={14}/>,         ms:590  },
  { id:13, label:"Scanning Underground Forums",      icon:<Radio size={14}/>,          ms:870  },
  { id:14, label:"Extracting Identity Identifiers",  icon:<Fingerprint size={14}/>,    ms:650  },
  { id:15, label:"Compiling Intelligence Report",    icon:<Activity size={14}/>,       ms:1050 },
];

const PRO_FINDINGS = [
  { icon:<Key size={14}/>,    label:"Breached Passwords (Plain Text)",   color:"#f97316" },
  { icon:<Globe size={14}/>,  label:"Exposed IP & Geolocation",           color:"#3b82f6" },
  { icon:<Shield size={14}/>, label:"Data For Sale on Dark Web",          color:"#e21227" },
  { icon:<Users size={14}/>,  label:"Linked Social Media Profiles",       color:"#8b5cf6" },
  { icon:<Phone size={14}/>,  label:"Leaked Phone & SMS Records",         color:"#10b981" },
  { icon:<Zap size={14}/>,    label:"Vulnerability & Exploit Score",      color:"#fbbf24" },
];

const EXTRA_SOURCES = [
  { icon:<Eye size={13}/>,           label:"Stealer logs & botnet dumps",   risk:"High Risk", rc:"#ef4444" },
  { icon:<MessageSquare size={13}/>, label:"Telegram leak channels",         risk:"Medium",    rc:"#fbbf24" },
  { icon:<Globe size={13}/>,         label:"Underground hacking forums",     risk:"Medium",    rc:"#fbbf24" },
  { icon:<FileText size={13}/>,      label:"Paste sites (non-indexed)",      risk:"Unknown",   rc:"#888"    },
];

const BREACH_RECORDS = [
  {
    source:"Telegram Scrape", tag:"Dark Web DB", date:"2024-10", severity:"LOW", color:"#fbbf24",
    fields:["Id","ScanId","Username","Phone","Name","Country","First Name","Telegram_id"],
    details: { records: "2.1M", type: "Phone + Username", encrypted: false }
  },
  {
    source:"stealer.log #1142", tag:"Stealer Logs", date:"2024-08", severity:"HIGH", color:"#ef4444",
    fields:["Email","Password (plain)","Cookie","IP Address","Browser","OS"],
    details: { records: "847K", type: "Full Credential Dump", encrypted: false }
  },
  {
    source:"ComboDB v3", tag:"Credential DB", date:"2024-05", severity:"MEDIUM", color:"#f97316",
    fields:["Email","Password Hash","Username","Signup Date","Country"],
    details: { records: "11.4M", type: "Email + Hash", encrypted: true }
  },
];

const SOCIAL_PROFILES_DATA = [
  { platform:"Snapchat",  handle:"da7rkx0",    status:"Active",  color:"#fbbf24", followers:"1.2K",  posts:"87",  verified:false },
  { platform:"Twitter/X", handle:"@da7rkx0",   status:"Active",  color:"#3b82f6", followers:"4.8K",  posts:"312", verified:false },
  { platform:"Instagram", handle:"@da7rkx0",   status:"Private", color:"#e21227", followers:"?",     posts:"?",   verified:false },
  { platform:"TikTok",    handle:"@3a7rkx0",   status:"Active",  color:"#10b981", followers:"22.1K", posts:"143", verified:false },
  { platform:"GitHub",    handle:"da7rkx0",    status:"Active",  color:"#8b5cf6", followers:"89",    posts:"?",   verified:false },
  { platform:"LinkedIn",  handle:"Mohamed R.", status:"Private", color:"#06b6d4", followers:"?",     posts:"?",   verified:false },
  { platform:"Telegram",  handle:"@da7rkx0",   status:"Active",  color:"#3b82f6", followers:"?",     posts:"?",   verified:false },
  { platform:"Reddit",    handle:"u/da7rkx0",  status:"Active",  color:"#f97316", followers:"234",   posts:"67",  verified:false },
];

const MEDIA_INTEL = [
  { type:"Profile Photo",   count:3,    source:"Snapchat / Instagram", risk:"Low",    color:"#10b981", locked:false, icon:<Camera size={13}/> },
  { type:"Public Posts",    count:99,   source:"Twitter / Reddit",      risk:"Medium", color:"#fbbf24", locked:false, icon:<FileText size={13}/> },
  { type:"Video Content",   count:12,   source:"TikTok",                risk:"Low",    color:"#3b82f6", locked:false, icon:<Video size={13}/> },
  { type:"Forum Activity",  count:47,   source:"Underground Forums",    risk:"High",   color:"#ef4444", locked:false, icon:<MessageSquare size={13}/> },
  { type:"Leaked Photos",   count:0,    source:"Dark Web",              risk:"High",   color:"#ef4444", locked:true,  icon:<Image size={13}/> },
  { type:"Voice Samples",   count:0,    source:"Telegram channels",     risk:"Medium", color:"#8b5cf6", locked:true,  icon:<Mic size={13}/> },
];

const SOCIAL_ACTIVITY = [
  { action:"Posted in hacking forum",       platform:"Underground Forum", date:"2024-11-03", risk:"High",   icon:<Globe size={11}/>,         color:"#ef4444" },
  { action:"Mentioned in leaked dataset",   platform:"Dark Web DB",       date:"2024-10-15", risk:"High",   icon:<Database size={11}/>,      color:"#ef4444" },
  { action:"Account linked to breach",      platform:"Stealer Log",       date:"2024-09-22", risk:"High",   icon:<AlertTriangle size={11}/>, color:"#ef4444" },
  { action:"Joined private Telegram group", platform:"Telegram",          date:"2024-08-10", risk:"Medium", icon:<MessageSquare size={11}/>, color:"#fbbf24" },
  { action:"Active on paste site",          platform:"Pastebin",          date:"2024-07-30", risk:"Medium", icon:<FileText size={11}/>,      color:"#fbbf24" },
  { action:"Profile scraped",              platform:"Public OSINT",       date:"2024-06-18", risk:"Low",    icon:<Scan size={11}/>,          color:"#10b981" },
];

const IDENTITY_DATA = {
  name: "M***** R*****",
  username: "da7rkx0",
  email: "d***@gmail.com",
  phone: "+966-5***-****",
  country: "Saudi Arabia",
  city: "Riyadh",
  age: "24-28 (estimated)",
  languages: ["Arabic", "English"],
  devices: ["Android (Samsung)", "Windows PC"],
  firstSeen: "2019-03",
  lastSeen: "2024-11",
  ipHistory: ["185.x.x.x (UAE)", "78.x.x.x (KSA)"],
  linkedEmails: 3,
  linkedPhones: 2,
};

const PROOFS = [
  { name:"Ahmed K.", from:"Egypt",     found:8,  label:"breaches",    t:"2 min ago"  },
  { name:"Li W.",    from:"Singapore", found:6,  label:"credentials", t:"10 min ago" },
  { name:"Maria S.", from:"Brazil",    found:12, label:"exposures",   t:"3 min ago"  },
  { name:"Omar F.",  from:"UAE",       found:9,  label:"dark web hits",t:"5 min ago"  },
];

/* ─── 5D HOLOGRAPHIC SCAN LINE ─────────────────────────────────── */
function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-px opacity-30"
        style={{ background: "linear-gradient(90deg, transparent, #e21227, #f97316, #e21227, transparent)" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── 5D GRID BACKGROUND ────────────────────────────────────────── */
function GridBg({ color = "#e21227" }: { color?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]"
      style={{
        backgroundImage: `linear-gradient(${color}40 1px, transparent 1px), linear-gradient(90deg, ${color}40 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    />
  );
}

/* ─── LIVE BANNER ───────────────────────────────────────────────── */
function LiveBanner() {
  const [cnt, setCnt] = useState(201);
  const [sec, setSec] = useState(47);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setCnt(c => Math.max(180, c + Math.floor(Math.random() * 5 - 2)));
      setSec(s => { if (s <= 1) { setPulse(true); setTimeout(() => setPulse(false), 600); return Math.floor(Math.random() * 80 + 10); } return s - 1; });
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#070707] text-[10px] shrink-0 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{ backgroundPosition: ["0% 0%", "100% 0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ background: "linear-gradient(90deg, transparent, #e21227 40%, #f97316 60%, transparent)", backgroundSize: "200% 100%" }}
      />
      <span className="flex items-center gap-1.5 text-[#888] relative z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white font-bold">{cnt}</span> people scanning right now
      </span>
      <span className="text-[#222]">|</span>
      <motion.span animate={pulse ? { scale: [1, 1.15, 1] } : {}} className="text-[#888] relative z-10">
        Last breach: <span className="text-[#e21227] font-bold">{sec}s ago</span>
      </motion.span>
    </div>
  );
}

/* ─── SOCIAL PROOF TOAST ─────────────────────────────────────────── */
function ProofToast({ p, onDone }: { p: typeof PROOFS[0]; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
      style={{ background: "linear-gradient(135deg, #0f0f0f, #111)", border: "1px solid #1f1f1f", boxShadow: "0 0 20px rgba(226,18,39,0.15)" }}>
      <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
        <Shield size={13} className="text-green-400" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-white">{p.name} from {p.from}</p>
        <p className="text-[10px] text-[#e21227]">discovered {p.found} {p.label}</p>
        <p className="text-[9px] text-[#444]">{p.t}</p>
      </div>
    </motion.div>
  );
}

/* ─── NEON BADGE ─────────────────────────────────────────────────── */
function NeonBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40`, boxShadow: `0 0 8px ${color}20` }}>
      {label}
    </span>
  );
}

/* ─── RISK DOT ───────────────────────────────────────────────────── */
function RiskDot({ level }: { level: string }) {
  const c = level === "High" || level === "HIGH" ? "#ef4444" : level === "Medium" || level === "MEDIUM" ? "#fbbf24" : "#10b981";
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />
      <span className="text-[9px] font-bold" style={{ color: c }}>{level}</span>
    </span>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export function DeepSearchModal({ open, onOpenChange, onOpenChainInvestigation }: Props) {
  const { toast } = useToast();
  const [phase, setPhase]               = useState<Phase>("idle");
  const [inputTab, setInputTab]         = useState<InputTab>("email");
  const [resultTab, setResultTab]       = useState<ResultTab>("overview");
  const [paymentTab, setPaymentTab]     = useState<PaymentTab>("usdt_trc20");
  const [query, setQuery]               = useState("");
  const [completedSteps, setCompleted]  = useState<number[]>([]);
  const [activeStep, setActiveStep]     = useState(0);
  const [progress, setProgress]         = useState(0);
  const [showUpgrade, setShowUpgrade]   = useState(false);
  const [payStep, setPayStep]           = useState<"plans" | "payment" | "confirm">("plans");
  const [selectedPlan, setSelectedPlan] = useState<"one-time" | "pro" | "elite">("pro");
  const [coupon, setCoupon]             = useState("");
  const [couponOk, setCouponOk]         = useState(false);
  const [timer, setTimer]               = useState(7099);
  const [proofIdx, setProofIdx]         = useState<number | null>(null);
  const [copied, setCopied]             = useState(false);
  const [copiedAddr, setCopiedAddr]     = useState(false);
  const [expandedBreach, setExpanded]   = useState<number | null>(null);
  const [scanHistory, setScanHistory]   = useState<{ q: string; type: string; found: number; ts: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("mr7-deep-scan-history") || "[]"); } catch { return []; }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem("mr7-deep-scan-history", JSON.stringify(scanHistory.slice(0, 10))); } catch {}
  }, [scanHistory]);

  useEffect(() => {
    if (!open) { setPhase("idle"); setCompleted([]); setActiveStep(0); setProgress(0); setShowUpgrade(false); setResultTab("overview"); }
  }, [open]);

  useEffect(() => {
    if (phase === "idle" || phase === "results") {
      let i = 0;
      const next = () => { setProofIdx(i % PROOFS.length); i++; };
      next();
      const t = setInterval(next, 6000);
      return () => clearInterval(t);
    }
    setProofIdx(null);
  }, [phase]);

  useEffect(() => {
    if (showUpgrade) { const t = setInterval(() => setTimer(s => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }
  }, [showUpgrade]);

  const timerStr = `${Math.floor(timer / 3600)}:${String(Math.floor((timer % 3600) / 60)).padStart(2, "0")}:${String(timer % 60).padStart(2, "0")}`;

  const runScan = useCallback(async () => {
    if (!query.trim()) { toast({ description: "أدخل هدف البحث أولاً" }); return; }
    setPhase("scanning"); setCompleted([]); setActiveStep(1); setProgress(0);
    let done = 0;
    for (const step of SCAN_STEPS) {
      setActiveStep(step.id);
      await new Promise(r => { timerRef.current = setTimeout(r, step.ms); });
      done++;
      setCompleted(prev => [...prev, step.id]);
      setProgress(Math.round((done / SCAN_STEPS.length) * 100));
    }
    await new Promise(r => setTimeout(r, 300));
    setPhase("results"); setResultTab("overview");
    setScanHistory(h => [{ q: query, type: inputTab, found: 8 + Math.floor(Math.random() * 12), ts: Date.now() }, ...h].slice(0, 10));
    toast({ title: "Scan Complete", description: `Intelligence report ready for: ${query}` });
  }, [query, inputTab, toast]);

  function copyReport() {
    navigator.clipboard.writeText(`DEEP SEARCH AI — INTELLIGENCE REPORT\nTarget: ${query}\nThreats: 3 flags\nBreaches: Password, IP exposure, Dark web listing\nScan: 15 layers completed\nGenerated by KaliGPT / mr7.ai`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const INPUT_TABS: { id: InputTab; label: string; icon: ReactNode; ph: string }[] = [
    { id: "email",    label: "Email",     icon: <Mail size={13} />,     ph: "Enter email address..." },
    { id: "phone",    label: "Phone",     icon: <Phone size={13} />,    ph: "Enter phone number..."  },
    { id: "username", label: "Username",  icon: <User size={13} />,     ph: "Enter username..."      },
    { id: "fullname", label: "Full Name", icon: <FileText size={13} />, ph: "Enter full name..."     },
  ];

  const RESULT_TABS: { id: ResultTab; label: string; badge?: string; icon: ReactNode }[] = [
    { id: "overview",  label: "Overview",      icon: <BarChart2 size={11} />   },
    { id: "ai-report", label: "AI Report",     icon: <Activity size={11} />    },
    { id: "identity",  label: "Identity",      icon: <Fingerprint size={11} /> },
    { id: "breaches",  label: "Breaches",      icon: <Shield size={11} />,     badge: "3"   },
    { id: "media",     label: "Media",         icon: <Camera size={11} />,     badge: "99+" },
    { id: "social",    label: "Social",        icon: <Users size={11} />,      badge: "8"   },
    { id: "activity",  label: "Activity",      icon: <Radio size={11} />,      badge: "6"   },
  ];

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full bg-[#060608] overflow-hidden relative">
        <GridBg />

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] bg-[#09090c] shrink-0 relative z-10">
          <motion.div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            animate={{ boxShadow: ["0 0 0px #7c3aed40", "0 0 15px #7c3aed60", "0 0 0px #7c3aed40"] }}
            transition={{ duration: 2, repeat: Infinity }}>
            <Search size={14} className="text-white relative z-10" />
          </motion.div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[13px] font-black text-white tracking-wide">Deep Search AI</span>
            {phase === "results" && (
              <>
                <span className="text-[#222]">/</span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="text-[11px] font-mono"
                  style={{ color: "#7c3aed" }}>
                  {RESULT_TABS.find(t => t.id === resultTab)?.label}
                </motion.span>
              </>
            )}
            <span className="ml-auto flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "#e21227" + "18", color: "#e21227", border: "1px solid #e2122730" }}>
              <span className="w-1 h-1 rounded-full bg-[#e21227] animate-pulse" /> LIVE
            </span>
          </div>
          {phase === "results" && (
            <div className="flex items-center gap-1.5">
              <button onClick={copyReport}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-[#111] border border-[#1f1f1f] text-[#666] hover:text-white hover:border-[#333] transition-all">
                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />} Export
              </button>
              <button onClick={() => { setPhase("idle"); setCompleted([]); setQuery(""); }}
                className="px-2.5 py-1.5 rounded-lg text-[10px] bg-[#111] border border-[#1f1f1f] text-[#666] hover:text-white transition-all">
                New Scan
              </button>
            </div>
          )}
          <button onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#111] border border-[#1f1f1f] text-[#444] hover:text-white hover:border-[#333] transition-all ml-1">
            <X size={13} />
          </button>
        </div>

        <LiveBanner />

        {/* ── PHASE: IDLE ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto relative z-10">

              {/* Hero */}
              <div className="px-5 pt-7 pb-5 text-center relative">
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] text-[#888] mb-5"
                  style={{ borderColor: "#7c3aed30", background: "#7c3aed10" }}
                  animate={{ borderColor: ["#7c3aed30", "#7c3aed60", "#7c3aed30"] }}
                  transition={{ duration: 3, repeat: Infinity }}>
                  <motion.div className="w-4 h-4 rounded-full bg-violet-600/30 flex items-center justify-center"
                    animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                    <Scan size={9} className="text-violet-400" />
                  </motion.div>
                  AI-Powered Intelligence Scanner — v5.0 Deep
                </motion.div>

                <h1 className="text-[26px] font-black text-white leading-tight mb-2">
                  Discover Your<br />
                  <motion.span
                    style={{ color: "#e21227" }}
                    animate={{ textShadow: ["0 0 0px #e21227", "0 0 20px #e2122760", "0 0 0px #e21227"] }}
                    transition={{ duration: 2.5, repeat: Infinity }}>
                    Digital Exposure
                  </motion.span>
                </h1>
                <p className="text-[12px] text-[#555] max-w-xs mx-auto">
                  Find leaked credentials, exposed accounts, and compromised data across <span className="text-[#e21227]">thousands</span> of breach databases.
                </p>
              </div>

              {/* Input Card */}
              <div className="mx-4 rounded-[18px] border border-[#1f1f1f] bg-[#0c0c10] overflow-hidden mb-4 relative"
                style={{ boxShadow: "0 0 30px rgba(226,18,39,0.06)" }}>
                <div className="flex border-b border-[#1a1a1a]">
                  {INPUT_TABS.map(t => (
                    <button key={t.id} onClick={() => setInputTab(t.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all"
                      style={inputTab === t.id
                        ? { color: "#fff", backgroundColor: "#0f0f14", borderBottom: "2px solid #e21227", boxShadow: "inset 0 -1px 0 #e21227" }
                        : { color: "#333" }}>
                      <span style={{ color: inputTab === t.id ? "#e21227" : "#2a2a2a" }}>{t.icon}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-3">
                  <motion.div
                    className="flex items-center gap-2 px-3 py-3 bg-[#080810] border border-[#1f1f1f] rounded-xl"
                    whileFocus={{ borderColor: "#e21227" }}
                    style={{ transition: "border-color 0.2s" }}>
                    <span className="text-[#444]">{INPUT_TABS.find(t => t.id === inputTab)?.icon}</span>
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runScan()}
                      placeholder={INPUT_TABS.find(t => t.id === inputTab)?.ph}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-[#222] outline-none font-mono" />
                    {query && (
                      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setQuery("")}
                        className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#444] hover:text-white transition-all">
                        <X size={9} />
                      </motion.button>
                    )}
                  </motion.div>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button onClick={runScan} whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center justify-center py-4 rounded-[18px] text-white font-bold transition-all relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}>
                      <motion.div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#ff1a35,#a00000)" }} />
                      <div className="flex items-center gap-1.5 text-[12px] relative z-10">
                        <Search size={13} /> Start Light Scan
                      </div>
                      <span className="text-[10px] font-normal opacity-60 mt-0.5 relative z-10">Free • 1 scan</span>
                    </motion.button>

                    <motion.button onClick={() => setShowUpgrade(true)} whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center justify-center py-4 rounded-[18px] border border-[#262626] bg-[#0f0f14] transition-all relative overflow-hidden"
                      animate={{ borderColor: ["#7c3aed20", "#7c3aed50", "#7c3aed20"] }}
                      transition={{ duration: 3, repeat: Infinity }}>
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black" style={{ background: "#7c3aed" }}>
                        <Crown size={7} /> PRO
                      </div>
                      <motion.div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center mb-1"
                        animate={{ boxShadow: ["0 0 0 #7c3aed", "0 0 12px #7c3aed50", "0 0 0 #7c3aed"] }}
                        transition={{ duration: 2, repeat: Infinity }}>
                        <Crosshair size={12} className="text-violet-400" />
                      </motion.div>
                      <span className="text-[12px] font-bold text-white">Deep Scanner</span>
                      <span className="text-[10px] text-[#444] mt-0.5">12,000+ sources</span>
                    </motion.button>
                  </div>

                  <motion.button onClick={runScan} whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}>
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", width: "50%" }}
                    />
                    <Search size={14} /> Start Free Scan Now
                  </motion.button>

                  <p className="text-center text-[10px] text-[#2a2a2a] flex items-center justify-center gap-1">
                    <Eye size={9} className="opacity-40" /> The target will not be notified about your search
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 mx-4 mb-4">
                {[
                  { v: "12,000+", l: "Breach Sources", icon: <Database size={16} />, c: "#e21227" },
                  { v: "15B+",    l: "Records Indexed", icon: <Server size={16} />,   c: "#3b82f6" },
                  { v: "99.7%",   l: "Accuracy Rate",   icon: <Shield size={16} />,   c: "#10b981" },
                ].map(s => (
                  <motion.div key={s.l}
                    className="border border-[#1a1a1a] rounded-xl p-3 bg-[#0c0c10] text-center relative overflow-hidden"
                    whileHover={{ borderColor: s.c + "40" }}
                    transition={{ duration: 0.2 }}>
                    <div className="flex justify-center mb-1" style={{ color: s.c + "60" }}>{s.icon}</div>
                    <p className="text-[15px] font-black text-white">{s.v}</p>
                    <p className="text-[9px] text-[#444] mt-0.5">{s.l}</p>
                  </motion.div>
                ))}
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-2 mx-4 mb-4">
                {[
                  { icon: <Globe size={13} />,  label: "Dark Web Monitoring",    color: "#e21227" },
                  { icon: <Mail size={13} />,   label: "Email Breach Detection", color: "#3b82f6" },
                  { icon: <Key size={13} />,    label: "Password Exposure",      color: "#f97316" },
                  { icon: <User size={13} />,   label: "Identity Tracking",      color: "#8b5cf6" },
                ].map(f => (
                  <motion.div key={f.label}
                    className="flex items-center gap-2 px-3 py-3 bg-[#0c0c10] border border-[#1a1a1a] rounded-xl"
                    whileHover={{ borderColor: f.color + "30", backgroundColor: f.color + "06" }}
                    transition={{ duration: 0.2 }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: f.color + "20", color: f.color }}>
                      {f.icon}
                    </div>
                    <span className="text-[11px] text-[#777] font-medium leading-tight">{f.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Recent Community Scans */}
              <div className="mx-4 mb-4 rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <Activity size={11} className="text-[#e21227]" />
                    <p className="text-[11px] font-bold text-white">Recent Community Scans</p>
                  </div>
                  <motion.span className="text-[9px] text-green-400 font-bold"
                    animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>LIVE</motion.span>
                </div>
                {(() => {
                  const TYPE_COLORS: Record<string, string> = { email: "#e21227", phone: "#3b82f6", username: "#f97316", fullname: "#10b981" };
                  const DEMO = [
                    { q: "j***@gmail.com",  type: "email",    found: 8,  ts: Date.now() - 23000  },
                    { q: "+966-5****234",   type: "phone",    found: 4,  ts: Date.now() - 60000  },
                    { q: "h4ck3r_007",      type: "username", found: 12, ts: Date.now() - 180000 },
                    { q: "Ahmed Al-***",    type: "fullname", found: 6,  ts: Date.now() - 420000 },
                  ];
                  const rows = scanHistory.length > 0 ? scanHistory.slice(0, 4) : DEMO;
                  function relTime(ts: number) { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; return `${Math.floor(s / 3600)}h ago`; }
                  return rows.map((s, i) => {
                    const c = TYPE_COLORS[s.type] ?? "#888";
                    const masked = s.q.length > 12 ? s.q.slice(0, 4) + "****" + s.q.slice(-3) : s.q;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#0f0f0f]">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[8px] font-black"
                          style={{ background: c + "18", color: c }}>{s.type[0].toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-[#777]">{masked}</span>
                          <span className="text-[9px] text-[#333] ml-2 capitalize">{s.type}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: c }}>{s.found} found</span>
                        <span className="text-[8px] text-[#333] font-mono">{relTime(s.ts)}</span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* 15 Features */}
              <div className="mx-4 mb-6 rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-violet-600/30 flex items-center justify-center">
                    <Layers size={10} className="text-violet-400" />
                  </div>
                  <p className="text-[11px] font-bold text-white">15 Deep Search AI Capabilities</p>
                </div>
                {[
                  { n: 1,  l: "Transparency in Results",         d: "Shows result categories: direct answers, manuscripts, sources", c: "#e21227" },
                  { n: 2,  l: "NLP Accuracy Engine",             d: "Advanced natural language processing for precise intelligence", c: "#f97316" },
                  { n: 3,  l: "Specific Question Response",      d: "Who is? What happened? Show image? — accurate targeted answers", c: "#fbbf24" },
                  { n: 4,  l: "Platform Data Integration",       d: "Cross-platform correlation across 11+ services",               c: "#10b981" },
                  { n: 5,  l: "Query Simplification",            d: "Converts vague requests into precise intelligence queries",     c: "#06b6d4" },
                  { n: 6,  l: "Social Media Intelligence",       d: "Twitter, Telegram, Instagram, TikTok investigation",           c: "#3b82f6" },
                  { n: 7,  l: "Dark Web Monitoring",             d: "12,000+ private and underground data source coverage",         c: "#8b5cf6" },
                  { n: 8,  l: "Stealer Log Analysis",            d: "Botnet dumps, credential logs, malware telemetry parsing",     c: "#e21227" },
                  { n: 9,  l: "Password Breach Detection",       d: "Plain-text password recovery from breach databases",           c: "#ef4444" },
                  { n: 10, l: "IP & Geolocation Exposure",       d: "Dark web IP dumps and geolocation cross-reference",            c: "#f97316" },
                  { n: 11, l: "Linked Profiles Discovery",       d: "11+ platform cross-reference for complete identity mapping",   c: "#fbbf24" },
                  { n: 12, l: "Phone & SMS Records",             d: "Leaked SMS logs and phone number intelligence tracking",       c: "#10b981" },
                  { n: 13, l: "Vulnerability Scoring",           d: "Exploit score assessment for all discovered identities",       c: "#06b6d4" },
                  { n: 14, l: "Underground Forum Scanning",      d: "Hacking forums, paste sites, non-indexed dark sources",       c: "#3b82f6" },
                  { n: 15, l: "Intelligence Report Compilation", d: "Full AI threat report with remediation steps & risk rating",  c: "#8b5cf6" },
                ].map(f => (
                  <div key={f.n} className="flex items-start gap-3 px-4 py-3 border-t border-[#111]">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5"
                      style={{ background: f.c + "18", color: f.c }}>{f.n}</div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: f.c }}>{f.l}</p>
                      <p className="text-[10px] text-[#444] mt-0.5">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PHASE: SCANNING ───────────────────────────────────── */}
          {phase === "scanning" && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden relative z-10">
              <ScanLine />

              <div className="px-5 pt-6 pb-3 shrink-0">
                <div className="text-center mb-4">
                  <motion.div
                    className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center relative"
                    style={{ background: "linear-gradient(135deg, #e21227, #7c3aed)" }}
                    animate={{ boxShadow: ["0 0 0px #e21227", "0 0 30px #e2122770", "0 0 0px #e21227"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                      <Scan size={24} className="text-white" />
                    </motion.div>
                  </motion.div>
                  <p className="text-[11px] text-[#555] font-mono mb-1">ANALYZING TARGET</p>
                  <p className="text-white font-black text-[15px] font-mono tracking-wider">{query}</p>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#555] font-mono">SCAN PROGRESS</span>
                  <motion.span className="text-[13px] font-black font-mono"
                    style={{ color: progress < 40 ? "#e21227" : progress < 80 ? "#fbbf24" : "#10b981" }}>
                    {progress}%
                  </motion.span>
                </div>
                <div className="h-2 bg-[#111] rounded-full overflow-hidden mb-1 relative">
                  <motion.div className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#e21227,#f97316,#fbbf24)" }}
                    animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                  <motion.div
                    className="absolute inset-0 opacity-50"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)", width: "30%" }}
                  />
                </div>
                <p className="text-[9px] text-[#333] font-mono text-right">
                  {completedSteps.length} / {SCAN_STEPS.length} steps complete
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
                {SCAN_STEPS.map(step => {
                  const done   = completedSteps.includes(step.id);
                  const active = activeStep === step.id && !done;
                  return (
                    <motion.div key={step.id}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: done || active ? 1 : 0.3, x: 0 }}
                      transition={{ delay: step.id * 0.03 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={done
                        ? { borderColor: "#10b98130", backgroundColor: "#10b98108", boxShadow: "0 0 10px rgba(16,185,129,0.05)" }
                        : active
                          ? { borderColor: "#e2122730", backgroundColor: "#e2122708", boxShadow: "0 0 10px rgba(226,18,39,0.08)" }
                          : { borderColor: "#0f0f0f" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={done
                          ? { background: "#10b98120", border: "1px solid #10b98140" }
                          : active
                            ? { background: "#e2122718", border: "1px solid #e2122740" }
                            : { background: "#111", border: "1px solid #1a1a1a" }}>
                        {done && <CheckCircle2 size={12} className="text-green-400" />}
                        {active && <Loader2 size={11} className="animate-spin text-[#e21227]" />}
                        {!done && !active && <span className="text-[#2a2a2a]">{step.icon}</span>}
                      </div>
                      <span className="text-[12px] font-medium flex-1"
                        style={done ? { color: "#10b981" } : active ? { color: "#fff" } : { color: "#2a2a2a" }}>
                        {step.label}
                      </span>
                      {done && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="text-[9px] text-green-500 font-mono font-bold">✓ done</motion.span>
                      )}
                      {active && (
                        <motion.div className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <motion.span key={i} className="w-1 h-1 rounded-full bg-[#e21227]"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PHASE: RESULTS ────────────────────────────────────── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden relative z-10">

              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-px bg-[#111] border-b border-[#1a1a1a] shrink-0">
                {[
                  { v: "3",  l: "RECORDS",  c: "#10b981" },
                  { v: "1",  l: "HIGH RISK", c: "#ef4444" },
                  { v: "3",  l: "BREACHES",  c: "#fbbf24" },
                  { v: "87%",l: "ACCURACY", c: "#8b5cf6" },
                ].map(s => (
                  <div key={s.l} className="bg-[#09090c] py-2.5 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden">
                    <motion.div className="absolute inset-0 opacity-5" style={{ background: s.c }} />
                    <motion.span className="text-[15px] font-black" style={{ color: s.c }}
                      animate={{ textShadow: [`0 0 0px ${s.c}`, `0 0 10px ${s.c}60`, `0 0 0px ${s.c}`] }}
                      transition={{ duration: 3, repeat: Infinity, delay: Math.random() }}>
                      {s.v}
                    </motion.span>
                    <span className="text-[8px] text-[#444] font-mono tracking-wider">{s.l}</span>
                  </div>
                ))}
              </div>

              {/* Result tabs */}
              <div className="flex gap-0 border-b border-[#1a1a1a] bg-[#08080c] overflow-x-auto shrink-0 relative">
                <ScanLine />
                {RESULT_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setResultTab(tab.id)}
                    className="flex items-center gap-1 px-3 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all border-b-2 shrink-0 relative"
                    style={resultTab === tab.id
                      ? { color: "#e21227", borderColor: "#e21227", backgroundColor: "#e2122710" }
                      : { color: "#333", borderColor: "transparent" }}>
                    {tab.icon}
                    <span className="ml-1">{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black ml-0.5"
                        style={{ background: resultTab === tab.id ? "#e21227" : "#1a1a1a", color: "#fff" }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">

                  {/* ── OVERVIEW ──────────────────────────────────── */}
                  {resultTab === "overview" && (
                    <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="text-center py-4">
                        <motion.div className="relative inline-block mb-3"
                          animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                            style={{ background: "linear-gradient(135deg,#e21227,#7f1d1d)", boxShadow: "0 0 30px rgba(226,18,39,0.40)" }}>
                            <Shield size={26} className="text-white" />
                          </div>
                          <motion.div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#e21227] flex items-center justify-center border-2 border-[#060608]"
                            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                            <AlertTriangle size={10} className="text-white" />
                          </motion.div>
                        </motion.div>
                        <h2 className="text-[17px] font-black text-white">Potential Threats Detected</h2>
                        <p className="text-[11px] text-[#555] mt-1">
                          Found <span className="text-[#e21227] font-bold">3 potential flags</span> for{" "}
                          <span className="text-white font-mono">{query}</span>
                        </p>
                      </div>

                      {/* Flagged card */}
                      <div className="rounded-[18px] border border-[#e21227]/20 overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #e21227 / 5%, transparent)" }}>
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e21227]/10 bg-[#e21227]/05">
                          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
                            <AlertTriangle size={13} className="text-[#e21227]" />
                          </motion.div>
                          <span className="text-[11px] font-bold text-[#e21227]">Flagged Data Found — Upgrade to Reveal</span>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {[
                            { icon: <Key size={12} />,    l: "Password breach detected", sub: "(2 sources)",  c: "#f97316", locked: false },
                            { icon: <Globe size={12} />,  l: "IP address exposed in dark web dump", sub: "",  c: "#3b82f6", locked: false },
                            { icon: <Shield size={12} />, l: "Data listed for sale on marketplace", sub: "",  c: "#8b5cf6", locked: true  },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#0a0a10] border border-[#1a1a1a] rounded-xl">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                                style={{ background: item.c + "20", color: item.c }}>{item.icon}</div>
                              <span className="text-[11px] text-[#bbb] flex-1">{item.l} <span className="text-[#333]">{item.sub}</span></span>
                              {item.locked
                                ? <Lock size={10} className="text-[#333]" />
                                : <div className="h-1.5 w-16 bg-[#111] rounded-full overflow-hidden">
                                    <motion.div className="h-full rounded-full" style={{ background: item.c + "80", width: "70%" }}
                                      animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} />
                                  </div>
                              }
                            </div>
                          ))}
                          <button onClick={() => setShowUpgrade(true)}
                            className="w-full mt-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/08 hover:bg-[#e21227]/15 transition-all">
                            <Lock size={12} /> Unlock Deep Scan — view full details
                          </button>
                        </div>
                      </div>

                      {/* Extra sources */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                          <Eye size={13} className="text-[#fbbf24]" />
                          <div>
                            <p className="text-[11px] font-bold text-white">Additional Sources Not Yet Scanned</p>
                            <p className="text-[10px] text-[#444]">Light Scan covers only <span className="text-[#fbbf24]">12%</span> of known sources</p>
                          </div>
                        </div>
                        {EXTRA_SOURCES.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-[#0f0f0f]">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[#444]">{s.icon}</div>
                            <span className="text-[11px] text-[#777] flex-1">{s.label}</span>
                            <RiskDot level={s.risk} />
                          </div>
                        ))}
                      </div>

                      {/* Exposure Score */}
                      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c10] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={13} className="text-[#fbbf24]" />
                            <span className="text-[11px] font-bold text-white">Account Exposure Score</span>
                          </div>
                          <span className="text-[11px] font-bold text-[#fbbf24]">Unknown</span>
                        </div>
                        <div className="h-2.5 bg-[#111] rounded-full overflow-hidden mb-2 relative">
                          <motion.div className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg,#fbbf24,#ef4444)" }}
                            initial={{ width: "0%" }} animate={{ width: "35%" }} transition={{ duration: 2 }} />
                          <div className="absolute inset-0 flex items-center justify-end pr-2">
                            <Lock size={7} className="text-[#444]" />
                          </div>
                        </div>
                        <p className="text-[10px] text-[#333]">A Deep Scan is required to calculate your full exposure score</p>
                      </div>

                      {/* PRO findings */}
                      <div className="rounded-[18px] border border-[#7c3aed]/25 overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #7c3aed08, transparent)" }}>
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#7c3aed]/15">
                          <motion.div className="w-7 h-7 rounded-lg bg-violet-600/25 flex items-center justify-center"
                            animate={{ boxShadow: ["0 0 0 #7c3aed", "0 0 15px #7c3aed50", "0 0 0 #7c3aed"] }}
                            transition={{ duration: 2, repeat: Infinity }}>
                            <Crosshair size={12} className="text-violet-400" />
                          </motion.div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-white">Deep Scan Can Reveal</span>
                              <NeonBadge label="PRO" color="#7c3aed" />
                            </div>
                            <p className="text-[9px] text-[#444]">Available in private & underground sources</p>
                          </div>
                        </div>
                        {PRO_FINDINGS.map((f, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-[#7c3aed]/08">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: f.color + "18", color: f.color }}>{f.icon}</div>
                            <span className="text-[11px] text-[#666] flex-1">{f.label}</span>
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-14 bg-[#111] rounded-full overflow-hidden">
                                <div className="h-full w-3/4 rounded-full blur-sm" style={{ background: f.color }} />
                              </div>
                              <Lock size={9} className="text-[#333]" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chain Investigation button */}
                      {onOpenChainInvestigation && (
                        <motion.button onClick={() => { onOpenChainInvestigation(); onOpenChange(false); }}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all"
                          style={{ borderColor: "#f59e0b30", background: "linear-gradient(135deg, #f59e0b08, transparent)" }}
                          animate={{ borderColor: ["#f59e0b20", "#f59e0b50", "#f59e0b20"] }}
                          transition={{ duration: 3, repeat: Infinity }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "#f59e0b20", border: "1px solid #f59e0b30" }}>
                            <GitBranch size={15} className="text-[#f59e0b]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-white">Open in Chain Investigation</p>
                            <p className="text-[10px] text-[#555]">Build a visual threat graph from these findings</p>
                          </div>
                          <ChevronRight size={13} className="text-[#f59e0b] shrink-0" />
                        </motion.button>
                      )}

                      {/* CTA */}
                      <div className="rounded-[18px] border border-[#e21227]/15 p-5 text-center relative overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #e21227/08, transparent)" }}>
                        <h3 className="text-[14px] font-black text-white mb-1">Try Deep Search AI</h3>
                        <p className="text-[10px] text-[#555] mb-3">Scan <span className="text-white font-bold">12,000+</span> private sources</p>
                        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                          {["Dark Web", "Stealer Logs", "Telegram", "Forums", "Botnets"].map(tag => (
                            <span key={tag} className="px-2 py-1 bg-[#111] border border-[#1f1f1f] rounded-full text-[9px] text-[#666]">{tag}</span>
                          ))}
                        </div>
                        <motion.button onClick={() => setShowUpgrade(true)} whileTap={{ scale: 0.98 }}
                          className="w-full py-4 rounded-xl text-white font-black text-[12px] flex items-center justify-center gap-2 relative overflow-hidden"
                          style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}>
                          <motion.div className="absolute inset-0"
                            animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)", width: "50%" }} />
                          <Crown size={14} /> Start Deep Scan — Professional
                        </motion.button>
                        <p className="text-[9px] text-[#444] mt-1.5">Unlimited scans + full OSINT toolkit</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── AI REPORT ─────────────────────────────────── */}
                  {resultTab === "ai-report" && (
                    <motion.div key="air" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]"
                          style={{ background: "linear-gradient(90deg, #e2122710, transparent)" }}>
                          <div className="flex items-center gap-2">
                            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
                              <Activity size={13} className="text-[#e21227]" />
                            </motion.div>
                            <span className="text-[12px] font-bold text-white">AI Intelligence Report</span>
                          </div>
                          <span className="text-[9px] font-mono text-[#444] flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-400" /> KaliGPT v5
                          </span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mb-2 flex items-center gap-1">
                              <span className="w-3 h-px bg-[#e21227]" /> Executive Summary
                            </p>
                            <p className="text-[12px] text-[#999] leading-relaxed">
                              Target <span className="text-white font-mono">{query}</span> identified across{" "}
                              <span className="text-[#e21227] font-bold">3 breach databases</span> with indicators of compromise
                              dating back to Q4 2024. Digital footprint spans <span className="text-[#fbbf24]">11+ platforms</span> with
                              active social presence on TikTok (22K followers), Twitter, Snapchat, and underground forums.
                              Immediate credential rotation recommended.
                            </p>
                          </div>
                          {[
                            { label: "Risk Level",      value: "MEDIUM-HIGH", color: "#ef4444" },
                            { label: "Confidence",      value: "87%",          color: "#10b981" },
                            { label: "Sources Scanned", value: "15 layers",    color: "#3b82f6" },
                            { label: "Findings",        value: "3 flags",      color: "#e21227" },
                            { label: "Platforms Found", value: "8 active",     color: "#8b5cf6" },
                            { label: "Last Updated",    value: "Just now",     color: "#fbbf24" },
                          ].map(r => (
                            <div key={r.label} className="flex items-center justify-between py-2 border-t border-[#111]">
                              <span className="text-[11px] text-[#444]">{r.label}</span>
                              <span className="text-[11px] font-bold font-mono" style={{ color: r.color }}>{r.value}</span>
                            </div>
                          ))}
                          <div className="border-t border-[#111] pt-3">
                            <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mb-2 flex items-center gap-1">
                              <span className="w-3 h-px bg-[#fbbf24]" /> Recommendations
                            </p>
                            {[
                              "Immediately rotate all passwords associated with this identity",
                              "Enable 2FA on all linked platform accounts",
                              "Monitor dark web for new mentions of this identity",
                              "Check linked email accounts for unauthorized access",
                              "Run a full Deep Scan to uncover hidden breach details",
                            ].map((r, i) => (
                              <div key={i} className="flex items-start gap-2 py-1.5">
                                <span className="text-[#e21227] text-[10px] font-mono mt-0.5">{i + 1}.</span>
                                <span className="text-[11px] text-[#777]">{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={copyReport}
                        className="w-full py-3 rounded-xl text-[12px] font-bold border border-[#1f1f1f] text-[#666] hover:text-white flex items-center justify-center gap-2 transition-all">
                        {copied ? <Check size={13} className="text-green-400" /> : <Download size={13} />}
                        {copied ? "Copied!" : "Export Report"}
                      </button>
                    </motion.div>
                  )}

                  {/* ── IDENTITY PROFILE ──────────────────────────── */}
                  {resultTab === "identity" && (
                    <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">

                      {/* Identity card header */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="px-4 pt-3 pb-[10px] border-b border-[#1a1a1a] flex items-center gap-4"
                          style={{ background: "linear-gradient(135deg, #10b98108, transparent)" }}>
                          <motion.div
                            className="w-16 h-16 rounded-[18px] flex items-center justify-center shrink-0 relative overflow-hidden"
                            style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "2px solid #10b98130" }}
                            animate={{ boxShadow: ["0 0 0 #10b981", "0 0 15px #10b98130", "0 0 0 #10b981"] }}
                            transition={{ duration: 3, repeat: Infinity }}>
                            <User size={26} className="text-[#10b981]" />
                            <motion.div className="absolute inset-0 opacity-20"
                              animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                              style={{ background: "linear-gradient(45deg, #10b98130, transparent)", backgroundSize: "200% 200%" }} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-black text-white">{IDENTITY_DATA.name}</p>
                            <p className="text-[11px] text-[#10b981] font-mono">@{IDENTITY_DATA.username}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <NeonBadge label="OSINT VERIFIED" color="#10b981" />
                              <NeonBadge label="FLAGGED" color="#e21227" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-[#111]">
                          {[
                            { label: "Email",     value: IDENTITY_DATA.email,   icon: <Mail size={11} />,   color: "#e21227" },
                            { label: "Phone",     value: IDENTITY_DATA.phone,   icon: <Phone size={11} />,  color: "#3b82f6" },
                            { label: "Country",   value: IDENTITY_DATA.country, icon: <MapPin size={11} />, color: "#10b981" },
                            { label: "City",      value: IDENTITY_DATA.city,    icon: <Globe size={11} />,  color: "#fbbf24" },
                            { label: "Age Est.",  value: IDENTITY_DATA.age,     icon: <Calendar size={11}/>,color: "#8b5cf6" },
                            { label: "Last Seen", value: IDENTITY_DATA.lastSeen,icon: <Eye size={11} />,    color: "#f97316" },
                          ].map(f => (
                            <div key={f.label} className="px-3 py-2.5 bg-[#0a0a0e] flex items-center gap-2">
                              <span style={{ color: f.color }}>{f.icon}</span>
                              <div className="min-w-0">
                                <p className="text-[9px] text-[#444] font-mono">{f.label}</p>
                                <p className="text-[11px] text-white font-mono truncate">{f.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Devices & Languages */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                          <Cpu size={11} className="text-[#8b5cf6]" />
                          <span className="text-[11px] font-bold text-white">Device & Language Profile</span>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          <div>
                            <p className="text-[9px] text-[#444] font-mono mb-1">KNOWN DEVICES</p>
                            <div className="flex gap-2 flex-wrap">
                              {IDENTITY_DATA.devices.map(d => (
                                <span key={d} className="px-2 py-1 bg-[#8b5cf620] border border-[#8b5cf630] rounded-lg text-[10px] text-[#8b5cf6]">{d}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] text-[#444] font-mono mb-1">LANGUAGES</p>
                            <div className="flex gap-2 flex-wrap">
                              {IDENTITY_DATA.languages.map(l => (
                                <span key={l} className="px-2 py-1 bg-[#10b98120] border border-[#10b98130] rounded-lg text-[10px] text-[#10b981]">{l}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* IP History */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                          <Globe size={11} className="text-[#3b82f6]" />
                          <span className="text-[11px] font-bold text-white">IP Address History</span>
                          <Lock size={10} className="text-[#333] ml-auto" />
                        </div>
                        {IDENTITY_DATA.ipHistory.map((ip, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-[#0f0f0f]">
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-[#3b82f620]">
                              <Server size={9} className="text-[#3b82f6]" />
                            </div>
                            <span className="text-[11px] text-[#777] font-mono flex-1">{ip}</span>
                            <NeonBadge label="HISTORIC" color="#3b82f6" />
                          </div>
                        ))}
                        <div className="px-4 py-3 border-t border-[#0f0f0f] flex items-center gap-2">
                          <Lock size={10} className="text-[#333]" />
                          <span className="text-[10px] text-[#333]">+5 more IPs locked — upgrade to reveal</span>
                          <button onClick={() => setShowUpgrade(true)} className="ml-auto text-[10px] text-[#e21227] font-bold hover:underline">Unlock</button>
                        </div>
                      </div>

                      {/* Linked accounts */}
                      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c10] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2Icon size={11} className="text-[#fbbf24]" />
                          <span className="text-[11px] font-bold text-white">Linked Accounts Summary</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { l: "Emails",   v: IDENTITY_DATA.linkedEmails, c: "#e21227" },
                            { l: "Phones",   v: IDENTITY_DATA.linkedPhones, c: "#3b82f6" },
                            { l: "Profiles", v: 8,                          c: "#10b981" },
                          ].map(s => (
                            <div key={s.l} className="text-center py-3 rounded-xl border border-[#1a1a1a] bg-[#0a0a0e]">
                              <p className="text-[18px] font-black" style={{ color: s.c }}>{s.v}</p>
                              <p className="text-[9px] text-[#444]">{s.l}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── DATA BREACHES ─────────────────────────────── */}
                  {resultTab === "breaches" && (
                    <motion.div key="br" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-[#777]">
                          <span className="text-white font-bold">3</span> breach records found
                        </p>
                        <NeonBadge label="VERIFIED" color="#10b981" />
                      </div>

                      {BREACH_RECORDS.map((b, i) => (
                        <motion.div key={i}
                          className="rounded-[18px] border overflow-hidden cursor-pointer"
                          style={{
              width: "clamp(340px, 40vw, 560px)",
              backdropFilter: "blur(40px)",
                            borderColor: expandedBreach === i ? b.color + "40" : "#1a1a1a",
                            background: expandedBreach === i ? b.color + "06" : "#0c0c10",
                          }}
                          onClick={() => setExpanded(expandedBreach === i ? null : i)}>
                          <div className="flex items-center gap-3 px-4 py-3.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: b.color + "20", border: `1px solid ${b.color}30` }}>
                              <Database size={14} style={{ color: b.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[12px] font-bold text-white">{b.source}</p>
                                <NeonBadge label={b.tag} color={b.color} />
                              </div>
                              <p className="text-[10px] text-[#444] mt-0.5 font-mono">{b.date} · {b.details.records} records</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <RiskDot level={b.severity} />
                              <motion.div animate={{ rotate: expandedBreach === i ? 90 : 0 }}>
                                <ChevronRight size={13} className="text-[#444]" />
                              </motion.div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedBreach === i && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                <div className="px-4 pb-4 pt-0 border-t border-[#111] space-y-3">
                                  <div>
                                    <p className="text-[9px] text-[#444] font-mono mb-2 mt-3">EXPOSED FIELDS</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {b.fields.map(f => (
                                        <span key={f} className="px-2 py-1 bg-[#111] border border-[#1a1a1a] rounded-lg text-[9px] font-mono"
                                          style={{ color: b.color }}>{f}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="px-3 py-2 bg-[#0a0a0e] border border-[#111] rounded-xl">
                                      <p className="text-[9px] text-[#444] font-mono">TYPE</p>
                                      <p className="text-[10px] text-white mt-0.5">{b.details.type}</p>
                                    </div>
                                    <div className="px-3 py-2 bg-[#0a0a0e] border border-[#111] rounded-xl">
                                      <p className="text-[9px] text-[#444] font-mono">ENCRYPTED</p>
                                      <p className="text-[10px] font-bold mt-0.5" style={{ color: b.details.encrypted ? "#10b981" : "#ef4444" }}>
                                        {b.details.encrypted ? "YES" : "NO — PLAINTEXT"}
                                      </p>
                                    </div>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); setShowUpgrade(true); }}
                                    className="w-full py-2 rounded-xl text-[10px] font-bold border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/08 hover:bg-[#e21227]/15 transition-all flex items-center justify-center gap-1.5">
                                    <Lock size={10} /> View Full Record — Upgrade
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}

                      {/* Locked breaches */}
                      <div className="rounded-2xl border border-dashed border-[#1f1f1f] bg-[#0a0a0a] p-4 text-center">
                        <Lock size={16} className="text-[#333] mx-auto mb-2" />
                        <p className="text-[11px] font-bold text-[#444]">5+ More Breaches Detected</p>
                        <p className="text-[10px] text-[#333] mt-1 mb-3">Available in stealer logs, telegram dumps, and dark web DBs</p>
                        <button onClick={() => setShowUpgrade(true)}
                          className="px-4 py-2 rounded-xl text-[11px] font-bold text-[#e21227] border border-[#e21227]/30 bg-[#e21227]/08 hover:bg-[#e21227]/15 transition-all">
                          Unlock All Breaches
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── MEDIA INTEL ───────────────────────────────── */}
                  {resultTab === "media" && (
                    <motion.div key="mi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {MEDIA_INTEL.map((m, i) => (
                          <motion.div key={i}
                            className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] p-3 relative overflow-hidden"
                            whileHover={{ borderColor: m.color + "30" }}
                            style={m.locked ? { opacity: 0.7 } : {}}>
                            {m.locked && (
                              <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
                                style={{ background: "#000000bb" }}>
                                <div className="text-center">
                                  <Lock size={16} className="text-[#444] mx-auto mb-1" />
                                  <button onClick={() => setShowUpgrade(true)}
                                    className="text-[9px] text-[#e21227] font-bold hover:underline">Unlock PRO</button>
                                </div>
                              </div>
                            )}
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                              style={{ background: m.color + "20", color: m.color }}>
                              {m.icon}
                            </div>
                            <p className="text-[11px] font-bold text-white">{m.type}</p>
                            <p className="text-[13px] font-black mt-0.5" style={{ color: m.color }}>
                              {m.locked ? "???" : m.count > 0 ? `${m.count}+` : "0"}
                            </p>
                            <p className="text-[9px] text-[#444] mt-0.5">{m.source}</p>
                            <div className="mt-2">
                              <RiskDot level={m.risk} />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Photo grid preview */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Camera size={11} className="text-[#10b981]" />
                            <span className="text-[11px] font-bold text-white">Profile Photos Found</span>
                          </div>
                          <span className="text-[10px] text-[#10b981] font-bold">3 detected</span>
                        </div>
                        <div className="p-3 grid grid-cols-3 gap-2">
                          {[1, 2, 3].map(n => (
                            <div key={n} className="aspect-square rounded-xl overflow-hidden relative"
                              style={{ background: "linear-gradient(135deg, #1a1a2e, #0f0f1a)", border: "1px solid #1a1a1a" }}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <User size={20} className="text-[#2a2a2a] mx-auto mb-1" />
                                  <p className="text-[8px] text-[#333] font-mono">Source {n}</p>
                                </div>
                              </div>
                              {n > 1 && (
                                <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center"
                                  style={{ background: "#00000090" }}>
                                  <Lock size={14} className="text-[#444]" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="px-4 py-3 border-t border-[#111] text-center">
                          <button onClick={() => setShowUpgrade(true)}
                            className="text-[10px] text-[#e21227] font-bold hover:underline flex items-center gap-1 mx-auto">
                            <Lock size={9} /> Unlock 2 more photos + leaked images
                          </button>
                        </div>
                      </div>

                      {/* Video content */}
                      <div className="rounded-[18px] border border-[#1a1a1a] bg-[#0c0c10] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Video size={11} className="text-[#3b82f6]" />
                            <span className="text-[11px] font-bold text-white">Video Content</span>
                          </div>
                          <NeonBadge label="12 FOUND" color="#3b82f6" />
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {[
                            { platform: "TikTok", count: 8,  views: "1.2M total views",  locked: false },
                            { platform: "YouTube", count: 4, views: "Unknown",           locked: true  },
                          ].map((v, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-t border-[#111]">
                              <div className="w-8 h-8 rounded-lg bg-[#3b82f620] flex items-center justify-center">
                                <Video size={12} className="text-[#3b82f6]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white">{v.platform}</p>
                                <p className="text-[10px] text-[#444]">{v.views}</p>
                              </div>
                              {v.locked
                                ? <Lock size={10} className="text-[#333]" />
                                : <span className="text-[11px] font-bold text-[#3b82f6]">{v.count} videos</span>
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── SOCIAL PROFILES ───────────────────────────── */}
                  {resultTab === "social" && (
                    <motion.div key="sp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-[#777]"><span className="text-white font-bold">8</span> profiles discovered</p>
                        <NeonBadge label="OSINT MAPPED" color="#8b5cf6" />
                      </div>

                      <div className="space-y-2">
                        {SOCIAL_PROFILES_DATA.map((p, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[#1a1a1a] bg-[#0c0c10] transition-all"
                            style={{ borderLeft: `3px solid ${p.color}40` }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px]"
                              style={{ background: p.color + "20", color: p.color, border: `1px solid ${p.color}30` }}>
                              {p.platform.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-white">{p.platform}</p>
                              <p className="text-[10px] font-mono mt-0.5" style={{ color: p.color }}>{p.handle}</p>
                              {p.status === "Active" && (
                                <div className="flex items-center gap-2 mt-1">
                                  {p.followers !== "?" && (
                                    <span className="text-[9px] text-[#555]">{p.followers} followers</span>
                                  )}
                                  {p.posts !== "?" && (
                                    <span className="text-[9px] text-[#555]">· {p.posts} posts</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  color: p.status === "Active" ? "#10b981" : "#888",
                                  background: p.status === "Active" ? "#10b98115" : "#1a1a1a",
                                  border: `1px solid ${p.status === "Active" ? "#10b98130" : "#2a2a2a"}`,
                                }}>
                                {p.status}
                              </span>
                              {p.status === "Active"
                                ? <ExternalLink size={10} className="text-[#333]" />
                                : <Lock size={10} className="text-[#333]" />
                              }
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Social connections map */}
                      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c10] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Network size={11} className="text-[#8b5cf6]" />
                          <span className="text-[11px] font-bold text-white">Cross-Platform Connections</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { l: "Mutual Follows",  v: "47",    c: "#8b5cf6" },
                            { l: "Shared Posts",    v: "12+",   c: "#3b82f6" },
                            { l: "Common Groups",   v: "6",     c: "#10b981" },
                          ].map(s => (
                            <div key={s.l} className="text-center py-3 rounded-xl bg-[#0a0a0e] border border-[#111]">
                              <p className="text-[16px] font-black" style={{ color: s.c }}>{s.v}</p>
                              <p className="text-[9px] text-[#444] mt-0.5">{s.l}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setShowUpgrade(true)}
                          className="w-full mt-3 py-2 rounded-xl text-[10px] font-bold border border-dashed border-[#8b5cf630] text-[#8b5cf6] bg-[#8b5cf608] hover:bg-[#8b5cf615] transition-all">
                          <Lock size={9} className="inline mr-1" /> Unlock full social graph (PRO)
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── ACTIVITY TIMELINE ─────────────────────────── */}
                  {resultTab === "activity" && (
                    <motion.div key="act" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-[#777]">Activity <span className="text-white font-bold">Timeline</span></p>
                        <NeonBadge label="OSINT" color="#f97316" />
                      </div>

                      <div className="space-y-0 relative">
                        <div className="absolute left-[22px] top-3 bottom-3 w-px bg-gradient-to-b from-[#e21227] via-[#fbbf24] to-[#10b981] opacity-20" />
                        {SOCIAL_ACTIVITY.map((a, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex gap-3 pb-4 relative">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10"
                              style={{ background: a.color + "18", border: `1px solid ${a.color}30` }}>
                              <span style={{ color: a.color }}>{a.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0 py-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] font-bold text-white leading-snug">{a.action}</p>
                                <RiskDot level={a.risk} />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono text-[#444]">{a.platform}</span>
                                <span className="text-[#333]">·</span>
                                <span className="text-[9px] font-mono text-[#333]">{a.date}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {/* Locked entries */}
                        <div className="flex gap-3 pb-2 relative opacity-50">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#1a1a1a] border border-[#222] z-10">
                            <Lock size={11} className="text-[#444]" />
                          </div>
                          <div className="flex-1 py-3 rounded-xl border border-dashed border-[#1f1f1f] px-3 flex items-center justify-between">
                            <span className="text-[10px] text-[#333]">+12 more activities locked</span>
                            <button onClick={() => setShowUpgrade(true)} className="text-[10px] text-[#e21227] font-bold hover:underline">Unlock</button>
                          </div>
                        </div>
                      </div>

                      {/* Activity heatmap */}
                      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0c0c10] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 size={11} className="text-[#fbbf24]" />
                          <span className="text-[11px] font-bold text-white">Activity Heatmap (2024)</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          {Array.from({ length: 52 }).map((_, i) => {
                            const intensity = Math.random();
                            const c = intensity > 0.7 ? "#e21227" : intensity > 0.4 ? "#fbbf24" : "#1a1a1a";
                            return (
                              <div key={i} className="h-3 rounded-sm" style={{ background: c, opacity: intensity > 0.2 ? 0.6 + intensity * 0.4 : 0.3 }} />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 mt-2 justify-end">
                          <span className="text-[8px] text-[#444]">Less</span>
                          {["#1a1a1a", "#fbbf24", "#f97316", "#e21227"].map(c => (
                            <div key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                          ))}
                          <span className="text-[8px] text-[#444]">More</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Sticky bottom CTA */}
              <div className="shrink-0 border-t border-[#1a1a1a] bg-[#09090c] px-4 py-3 flex items-center gap-2 relative overflow-hidden">
                <motion.div className="absolute inset-0 opacity-[0.03]"
                  animate={{ x: ["-100%", "100%"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ background: "linear-gradient(90deg, transparent, #e21227, transparent)", width: "50%" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">Unlock {query || "target"} — Full Report</p>
                  <p className="text-[9px] text-[#444]">12,000+ sources · Identity mapping · AI report</p>
                </div>
                <motion.button onClick={() => setShowUpgrade(true)} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-[11px] font-black shrink-0"
                  style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}
                  animate={{ boxShadow: ["0 0 0 #e21227", "0 0 15px #e2122760", "0 0 0 #e21227"] }}
                  transition={{ duration: 2, repeat: Infinity }}>
                  <Crown size={11} /> Deep Scan
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── UPGRADE MODAL ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showUpgrade && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/92 flex items-end sm:items-center justify-center backdrop-blur-sm">
              <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full sm:max-w-sm bg-[#0c0c10] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[92vh] relative"
                style={{ boxShadow: "0 -20px 60px rgba(226,18,39,0.15)" }}>
                <GridBg color="#e21227" />

                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a] relative z-10">
                  {payStep !== "plans" && (
                    <button onClick={() => setPayStep(payStep === "confirm" ? "payment" : "plans")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white shrink-0">
                      <ChevronRight size={13} className="rotate-180" />
                    </button>
                  )}
                  <span className="text-[12px] font-black text-white flex-1">
                    {payStep === "plans" ? "Unlock Deep Search AI" : payStep === "payment" ? "Choose Payment" : "Payment Submitted"}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono font-black shrink-0"
                    style={{ color: "#e21227" }}>
                    <motion.span className="w-1.5 h-1.5 rounded-full bg-[#e21227]"
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    {timerStr}
                  </div>
                  <button onClick={() => { setShowUpgrade(false); setPayStep("plans"); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white ml-1">
                    <X size={13} />
                  </button>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 py-2.5 border-b border-[#111] relative z-10">
                  {(["plans", "payment", "confirm"] as const).map((s, i) => (
                    <motion.div key={s} className="rounded-full transition-all"
                      animate={{
                        width: s === payStep ? 20 : 6,
                        height: 6,
                        background: s === payStep ? "#e21227" : i < (payStep === "payment" ? 1 : payStep === "confirm" ? 2 : 0) ? "#e2122750" : "#1f1f1f",
                      }} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* STEP 1: PLANS */}
                  {payStep === "plans" && (
                    <motion.div key="plans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-3 relative z-10">
                      <p className="text-center text-[11px] text-[#555]">Choose a plan to get started</p>

                      <motion.button onClick={() => { setSelectedPlan("one-time"); setPayStep("payment"); }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3.5 rounded-2xl border border-green-500/30 bg-[#0a0a0e] text-left hover:border-green-500/60 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <NeonBadge label="BEST VALUE — TRY FIRST" color="#10b981" />
                            <p className="text-[14px] font-black text-white mt-2">One-Time Deep Scan</p>
                            <p className="text-[10px] text-[#555] mt-0.5">1 full OSINT scan • No subscription</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {["15 scan layers", "Identity mapping", "Breach details", "AI report"].map(f => (
                                <span key={f} className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-[22px] font-black text-white">$29</p>
                            <p className="text-[9px] text-[#444]">one-time</p>
                          </div>
                        </div>
                      </motion.button>

                      <motion.button onClick={() => { setSelectedPlan("pro"); setPayStep("payment"); }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3.5 rounded-2xl border-2 border-[#e21227] bg-[#e21227]/05 text-left relative hover:bg-[#e21227]/10 transition-all">
                        <div className="absolute -top-3 left-4">
                          <span className="text-[8px] bg-gradient-to-r from-[#f97316] to-[#e21227] text-white px-2.5 py-1 rounded-full font-black">★ MOST POPULAR</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[14px] font-black text-white">Professional</p>
                            <p className="text-[10px] text-[#555] mt-0.5">3 Deep Scans/mo • Full OSINT toolkit</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {["All 15 features", "Dark web access", "Team sharing", "API access"].map(f => (
                                <span key={f} className="text-[8px] px-1.5 py-0.5 bg-[#e21227]/15 text-[#e21227] rounded">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-[22px] font-black text-white">$72</p>
                            <p className="text-[9px] text-[#e21227] line-through">$90</p>
                            <p className="text-[9px] text-[#444]">/month</p>
                          </div>
                        </div>
                      </motion.button>

                      <motion.button onClick={() => { setSelectedPlan("elite"); setPayStep("payment"); }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3.5 rounded-2xl border border-violet-500/30 bg-[#0a0a0e] text-left hover:border-violet-500/60 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Crown size={10} className="text-violet-400" />
                              <NeonBadge label="ELITE — 20% OFF" color="#8b5cf6" />
                            </div>
                            <p className="text-[14px] font-black text-white">Elite</p>
                            <p className="text-[10px] text-[#555] mt-0.5">Unlimited scans • Priority queue</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {["Unlimited", "Godmode", "Advanced OSINT", "Priority"].map(f => (
                                <span key={f} className="text-[8px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-[22px] font-black text-white">$120</p>
                            <p className="text-[9px] text-violet-400 line-through">$150</p>
                            <p className="text-[9px] text-[#444]">/month</p>
                          </div>
                        </div>
                      </motion.button>

                      {couponOk ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span className="text-[11px] font-bold text-green-400">Coupon "{coupon.toUpperCase()}" Applied!</span>
                          <button onClick={() => { setCouponOk(false); setCoupon(""); }} className="ml-auto text-[#444] hover:text-white"><X size={11} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon code..."
                            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-[11px] text-white placeholder:text-[#2a2a2a] outline-none focus:border-[#e21227] font-mono transition-colors" />
                          <button onClick={() => coupon.trim() && setCouponOk(true)}
                            className="px-3 py-2 rounded-xl text-[11px] font-bold text-white"
                            style={{ background: "#e21227" }}>Apply</button>
                        </div>
                      )}

                      <p className="text-[9px] text-center text-[#333] flex items-center justify-center gap-1">
                        <Shield size={9} className="text-green-400" /> Secure checkout · 7-day refund for first-timers
                      </p>
                    </motion.div>
                  )}

                  {/* STEP 2: PAYMENT */}
                  {payStep === "payment" && (
                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-3 relative z-10">
                      <p className="text-[11px] text-[#555]">Plan: <span className="text-white font-bold">
                        {selectedPlan === "one-time" ? "One-Time $29" : selectedPlan === "pro" ? "Professional $72/mo" : "Elite $120/mo"}
                      </span></p>

                      <div className="flex gap-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
                        {([
                          { id: "usdt_trc20" as PaymentTab, label: "USDT TRC20", color: "#10b981" },
                          { id: "usdt_bep20" as PaymentTab, label: "USDT BEP20", color: "#fbbf24" },
                          { id: "btc"        as PaymentTab, label: "Bitcoin",    color: "#f97316" },
                          { id: "paypal"     as PaymentTab, label: "PayPal",     color: "#3b82f6" },
                        ]).map(t => (
                          <button key={t.id} onClick={() => setPaymentTab(t.id)}
                            className="flex-1 py-2.5 text-[9px] font-bold transition-all"
                            style={paymentTab === t.id
                              ? { color: t.color, backgroundColor: t.color + "15", borderBottom: `2px solid ${t.color}` }
                              : { color: "#333", borderBottom: "2px solid transparent" }}>
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {paymentTab !== "paypal" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-3.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-[#444] font-mono mb-1">
                                {paymentTab === "usdt_trc20" ? "USDT TRC20 Address" : paymentTab === "usdt_bep20" ? "USDT BEP20 Address" : "Bitcoin Address"}
                              </p>
                              <p className="text-[10px] text-white font-mono break-all leading-relaxed">
                                {PAYMENT_ADDRESSES[paymentTab]}
                              </p>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(PAYMENT_ADDRESSES[paymentTab]); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-[#262626] bg-[#111] hover:bg-[#1a1a1a] transition-all">
                              {copiedAddr ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-[#555]" />}
                            </button>
                          </div>
                          <div className="p-3 bg-[#fbbf24]/05 border border-[#fbbf24]/20 rounded-xl">
                            <p className="text-[9px] text-[#fbbf24] flex items-start gap-1.5">
                              <AlertTriangle size={9} className="shrink-0 mt-0.5" />
                              Send the exact amount. After payment, click "I've Paid" — our team verifies within 24 hours.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-3.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center font-black text-[18px] text-blue-400 shrink-0">P</div>
                            <div className="flex-1">
                              <p className="text-[12px] font-bold text-white">PayPal</p>
                              <p className="text-[10px] text-[#555] font-mono">{PAYMENT_ADDRESSES.paypal}</p>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(PAYMENT_ADDRESSES.paypal); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#262626] bg-[#111]">
                              {copiedAddr ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-[#555]" />}
                            </button>
                          </div>
                          <a href="https://paypal.me/mr7ai" target="_blank" rel="noopener noreferrer"
                            className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border border-[#3b82f6]/30 text-[#3b82f6] bg-[#3b82f6]/08 hover:bg-[#3b82f6]/15 transition-all">
                            <ExternalLink size={13} /> Pay via PayPal.me
                          </a>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <div className="w-3.5 h-3.5 border border-[#333] rounded mt-0.5 shrink-0" />
                        <p className="text-[9px] text-[#444]">
                          I agree to the <span className="text-[#e21227]">Terms of Service</span> and{" "}
                          <span className="text-[#e21227]">Refund Policy</span>.
                        </p>
                      </div>

                      <motion.button onClick={() => setPayStep("confirm")} whileTap={{ scale: 0.98 }}
                        className="w-full py-3.5 rounded-xl text-white font-black text-[12px] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#e21227,#8b0000)" }}>
                        <Check size={14} /> I've Paid — Continue
                      </motion.button>
                    </motion.div>
                  )}

                  {/* STEP 3: CONFIRM */}
                  {payStep === "confirm" && (
                    <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-4 text-center relative z-10">
                      <motion.div
                        className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto"
                        animate={{ boxShadow: ["0 0 0 #10b981", "0 0 25px #10b98150", "0 0 0 #10b981"] }}
                        transition={{ duration: 2, repeat: Infinity }}>
                        <CheckCircle2 size={28} className="text-green-400" />
                      </motion.div>
                      <div>
                        <h3 className="text-[15px] font-black text-white mb-1">Payment Submitted!</h3>
                        <p className="text-[11px] text-[#555]">
                          Our team verifies within <span className="text-white font-bold">24 hours</span>. You'll receive an activation code via Telegram or email.
                        </p>
                      </div>
                      <div className="space-y-2 text-left">
                        {[
                          { href: "https://t.me/mr7ai",       icon: <MessageSquare size={14} className="text-[#3b82f6]" />, color: "#3b82f6", label: "Contact via Telegram", sub: "@mr7ai — fastest response", ext: true  },
                          { href: "https://wa.me/966500000000",icon: <Phone size={14} className="text-[#10b981]" />,        color: "#10b981", label: "Contact via WhatsApp", sub: "Send payment proof on WA",  ext: true  },
                          { href: "mailto:support@mr7.ai",    icon: <Mail size={14} className="text-[#e21227]" />,         color: "#e21227", label: "Send Payment Proof",   sub: "support@mr7.ai",            ext: false },
                        ].map(c => (
                          <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-3 rounded-xl border transition-all hover:opacity-80"
                            style={{ borderColor: c.color + "25", background: c.color + "08" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.color + "15" }}>{c.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-white">{c.label}</p>
                              <p className="text-[10px] text-[#444]">{c.sub}</p>
                            </div>
                            {c.ext && <ExternalLink size={10} className="text-[#333]" />}
                          </a>
                        ))}
                      </div>
                      <button onClick={() => { setShowUpgrade(false); setPayStep("plans"); }}
                        className="w-full py-3 rounded-xl text-[12px] font-bold border border-[#1f1f1f] text-[#555] hover:text-white transition-all">
                        Close
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Social Proof Toast */}
        <AnimatePresence>
          {proofIdx !== null && !showUpgrade && (
            <ProofToast key={proofIdx} p={PROOFS[proofIdx]} onDone={() => setProofIdx(null)} />
          )}
        </AnimatePresence>
      </div>
    </FullPageOverlay>
  );
}

/* tiny helper used inside identity tab */
function Link2Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
