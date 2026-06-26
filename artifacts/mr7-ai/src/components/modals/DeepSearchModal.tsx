import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Shield, Globe, Key, Phone, User, Mail,
  AlertTriangle, CheckCircle2, Copy, Check, Lock, Eye, Zap,
  Database, Wifi, FileText, Activity, Users, BookOpen, MessageSquare,
  Server, Star, ChevronRight, Crown, Loader2, Download,
  Camera, Hash, AtSign, Calendar, ExternalLink,
  Fingerprint, Network, Cpu, Radio, GitBranch
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

/* ─── SCAN STEPS (15) ─────────────────────────────────────────── */
const SCAN_STEPS = [
  { id:1,  label:"Initializing AI Engine",          icon:<Zap size={14}/>,            ms:400  },
  { id:2,  label:"Querying Public Databases",        icon:<Database size={14}/>,       ms:900  },
  { id:3,  label:"Scanning Dark Web Sources",        icon:<Globe size={14}/>,          ms:1200 },
  { id:4,  label:"Analyzing Stealer Logs",           icon:<Eye size={14}/>,            ms:1000 },
  { id:5,  label:"Searching Private Channels",       icon:<MessageSquare size={14}/>,  ms:800  },
  { id:6,  label:"Checking Historical Accounts",     icon:<Users size={14}/>,          ms:700  },
  { id:7,  label:"Scanning Education Records",       icon:<BookOpen size={14}/>,       ms:600  },
  { id:8,  label:"Analyzing Social Footprint",       icon:<Wifi size={14}/>,           ms:900  },
  { id:9,  label:"Checking Paste Archives",          icon:<FileText size={14}/>,       ms:700  },
  { id:10, label:"Mapping Social Media Networks",    icon:<Network size={14}/>,        ms:800  },
  { id:11, label:"Cross-referencing NLP Databases",  icon:<Cpu size={14}/>,            ms:1000 },
  { id:12, label:"Validating Intelligence Sources",  icon:<Shield size={14}/>,         ms:600  },
  { id:13, label:"Scanning Underground Forums",      icon:<Radio size={14}/>,          ms:900  },
  { id:14, label:"Extracting Identity Identifiers",  icon:<Fingerprint size={14}/>,    ms:700  },
  { id:15, label:"Compiling Intelligence Report",    icon:<Activity size={14}/>,       ms:1100 },
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
  { source:"Telegram Scrape", tag:"Dark Web DB", date:"2024-10", severity:"LOW",
    fields:["Id","ScanId","Username","Phone","Name","Country","First Name","Telegram_id"] },
  { source:"Telegram Scrape", tag:"Dark Web DB", date:"2024-10", severity:"LOW",
    fields:["Id","ScanId","Username","Phone","Name","Country","First Name","Telegram_id"] },
  { source:"Telegram Scrape", tag:"Dark Web DB", date:"2024-10", severity:"LOW",
    fields:["Id","ScanId","Username","Phone","Name","Country","First Name","Telegram_id"] },
];

const SOCIAL_PROFILES_DATA = [
  { platform:"Snapchat",  handle:"da7rkx0",    status:"Active",  color:"#fbbf24" },
  { platform:"Twitter/X", handle:"@da7rkx0",   status:"Active",  color:"#3b82f6" },
  { platform:"Instagram", handle:"@da7rkx0",   status:"Private", color:"#e21227" },
  { platform:"TikTok",    handle:"@3a7rkx0",   status:"Active",  color:"#10b981" },
  { platform:"GitHub",    handle:"da7rkx0",    status:"Active",  color:"#8b5cf6" },
  { platform:"LinkedIn",  handle:"Mohamed R.", status:"Private", color:"#06b6d4" },
  { platform:"Telegram",  handle:"@da7rkx0",   status:"Active",  color:"#3b82f6" },
  { platform:"Reddit",    handle:"u/da7rkx0",  status:"Active",  color:"#f97316" },
];

const MEDIA_INTEL = [
  { type:"Profile Photo",   count:"3 found",  source:"Snapchat / Instagram", risk:"Low",    color:"#10b981" },
  { type:"Public Posts",    count:"99+",      source:"Twitter / Reddit",      risk:"Medium", color:"#fbbf24" },
  { type:"Video Content",   count:"12",       source:"TikTok",                risk:"Low",    color:"#3b82f6" },
  { type:"Forum Activity",  count:"47 posts", source:"Underground Forums",    risk:"High",   color:"#ef4444" },
  { type:"Leaked Photos",   count:"Locked",   source:"Dark Web",              risk:"High",   color:"#ef4444" },
  { type:"Voice Samples",   count:"Locked",   source:"Telegram channels",     risk:"Medium", color:"#8b5cf6" },
];

const SOCIAL_ACTIVITY = [
  { action:"Posted in hacking forum",        platform:"Underground Forum", date:"2024-11-03", risk:"High"   },
  { action:"Mentioned in leaked dataset",    platform:"Dark Web DB",       date:"2024-10-15", risk:"High"   },
  { action:"Account linked to breach",       platform:"Stealer Log",       date:"2024-09-22", risk:"High"   },
  { action:"Joined private Telegram group",  platform:"Telegram",          date:"2024-08-10", risk:"Medium" },
  { action:"Active on paste site",           platform:"Pastebin",          date:"2024-07-30", risk:"Medium" },
  { action:"Profile scraped",               platform:"Public OSINT",       date:"2024-06-18", risk:"Low"    },
];

/* ─── LIVE STATS BANNER ────────────────────────────────────────── */
function LiveBanner() {
  const [cnt, setCnt] = useState(201);
  const [sec, setSec] = useState(47);
  useEffect(() => {
    const t = setInterval(() => {
      setCnt(c => c + Math.floor(Math.random()*3-1));
      setSec(s => s > 1 ? s-1 : Math.floor(Math.random()*60+10));
    }, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] text-[10px] shrink-0">
      <span className="flex items-center gap-1.5 text-[#888]">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
        <span className="text-white font-bold">{cnt}</span> people scanning right now
      </span>
      <span className="text-[#333]">|</span>
      <span className="text-[#888]">Last breach detected: <span className="text-[#e21227] font-bold">{sec}s ago</span></span>
    </div>
  );
}

/* ─── SOCIAL PROOF TOAST ───────────────────────────────────────── */
const PROOFS = [
  { name:"Ahmed K.", from:"Egypt",     found:8,  label:"breaches",    t:"2 min ago"  },
  { name:"Li W.",    from:"Singapore", found:6,  label:"credentials", t:"10 min ago" },
  { name:"Maria S.", from:"Brazil",    found:12, label:"exposures",   t:"3 min ago"  },
];
function ProofToast({ p, onDone }: { p:typeof PROOFS[0]; onDone:()=>void }) {
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ y:80, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:80, opacity:0 }}
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222] shadow-2xl max-w-[250px]">
      <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
        <Shield size={13} className="text-green-400"/>
      </div>
      <div>
        <p className="text-[11px] font-bold text-white">{p.name} from {p.from}</p>
        <p className="text-[10px] text-[#e21227]">discovered {p.found} {p.label}</p>
        <p className="text-[9px] text-[#444]">{p.t}</p>
      </div>
    </motion.div>
  );
}

/* ─── MAIN COMPONENT ───────────────────────────────────────────── */
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
  const [payStep, setPayStep]           = useState<"plans"|"payment"|"confirm">("plans");
  const [selectedPlan, setSelectedPlan] = useState<"one-time"|"pro"|"elite">("pro");
  const [coupon, setCoupon]             = useState("");
  const [couponOk, setCouponOk]         = useState(false);
  const [timer, setTimer]               = useState(7099);
  const [proofIdx, setProofIdx]         = useState<number|null>(null);
  const [copied, setCopied]             = useState(false);
  const [copiedAddr, setCopiedAddr]     = useState(false);
  const [expandedBreach, setExpanded]   = useState<number|null>(null);
  const [scanHistory, setScanHistory]   = useState<{q:string;type:string;found:number;ts:number}[]>(() => {
    try { return JSON.parse(localStorage.getItem("mr7-deep-scan-history")||"[]"); } catch { return []; }
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  /* persist history */
  useEffect(() => {
    try { localStorage.setItem("mr7-deep-scan-history", JSON.stringify(scanHistory.slice(0,10))); } catch {}
  }, [scanHistory]);

  /* reset on close */
  useEffect(() => {
    if (!open) { setPhase("idle"); setCompleted([]); setActiveStep(0); setProgress(0); setShowUpgrade(false); setResultTab("overview"); }
  }, [open]);

  /* social proof rotation */
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

  /* upgrade timer */
  useEffect(() => {
    if (showUpgrade) { const t = setInterval(() => setTimer(s => Math.max(0,s-1)), 1000); return () => clearInterval(t); }
  }, [showUpgrade]);

  const timerStr = `${Math.floor(timer/3600)}:${String(Math.floor((timer%3600)/60)).padStart(2,"0")}:${String(timer%60).padStart(2,"0")}`;

  const runScan = useCallback(async () => {
    if (!query.trim()) { toast({ description:"أدخل هدف البحث أولاً" }); return; }
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
    setScanHistory(h => [{q:query, type:inputTab, found: 8+Math.floor(Math.random()*12), ts:Date.now()}, ...h].slice(0,10));
    toast({ title:"Scan Complete", description:`Intelligence report ready for: ${query}` });
  }, [query, inputTab, toast]);

  function copyReport() {
    navigator.clipboard.writeText(`DEEP SEARCH AI — INTELLIGENCE REPORT\nTarget: ${query}\nThreats: 3 flags\nBreaches: Password, IP exposure, Dark web listing\nScan: 15 layers completed\nGenerated by KaliGPT / mr7.ai`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const INPUT_TABS: { id:InputTab; label:string; icon:ReactNode; ph:string }[] = [
    { id:"email",    label:"Email",     icon:<Mail size={13}/>,    ph:"Enter email address..." },
    { id:"phone",    label:"Phone",     icon:<Phone size={13}/>,   ph:"Enter phone number..."  },
    { id:"username", label:"Username",  icon:<User size={13}/>,    ph:"Enter username..."      },
    { id:"fullname", label:"Full Name", icon:<FileText size={13}/>,ph:"Enter full name..."     },
  ];

  const RESULT_TABS: { id:ResultTab; label:string; badge?:string }[] = [
    { id:"overview",   label:"Overview"      },
    { id:"ai-report",  label:"AI Report"     },
    { id:"identity",   label:"Identity"      },
    { id:"breaches",   label:"Data Breaches", badge:"3"   },
    { id:"media",      label:"Media Intel",   badge:"99+" },
    { id:"social",     label:"Social",        badge:"45"  },
    { id:"activity",   label:"Activity"       },
  ];

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full bg-[#090909] overflow-hidden relative">

        {/* ── TOP HEADER ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d] shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <Search size={14} className="text-white"/>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[13px] font-bold text-white">Deep Search AI</span>
            {phase === "results" && (
              <>
                <span className="text-[#333]">/</span>
                <span className="text-[11px] text-violet-400 font-mono">Chain Investigation</span>
              </>
            )}
          </div>
          {phase === "results" && (
            <div className="flex items-center gap-1.5">
              <button onClick={copyReport}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-[#161616] border border-[#262626] text-[#888] hover:text-white transition-all">
                {copied ? <Check size={10} className="text-green-400"/> : <Copy size={10}/>} Export
              </button>
              <button onClick={() => { setPhase("idle"); setCompleted([]); setQuery(""); }}
                className="px-2.5 py-1.5 rounded-lg text-[10px] bg-[#161616] border border-[#262626] text-[#888] hover:text-white transition-all">
                New Scan
              </button>
            </div>
          )}
          <button onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white transition-all ml-1">
            <X size={13}/>
          </button>
        </div>

        <LiveBanner/>

        {/* ── PHASE: IDLE ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex-1 overflow-y-auto">

            {/* Hero */}
            <div className="px-5 pt-6 pb-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#262626] bg-[#111] text-[10px] text-[#888] mb-4">
                <div className="w-4 h-4 rounded-full bg-violet-600/30 flex items-center justify-center">
                  <Search size={9} className="text-violet-400"/>
                </div>
                AI-Powered Intelligence Scanner
              </div>
              <h1 className="text-2xl font-black text-white leading-tight mb-1">
                Discover Your<br/>
                <span style={{ color:"#e21227" }}>Digital Exposure</span>
              </h1>
              <p className="text-[12px] text-[#555] max-w-xs mx-auto mt-2">
                Find leaked credentials, exposed accounts, and compromised data across thousands of breach databases.
              </p>
            </div>

            {/* Input Card */}
            <div className="mx-4 rounded-2xl border border-[#1f1f1f] bg-[#0f0f0f] overflow-hidden mb-4">
              {/* Tabs */}
              <div className="flex border-b border-[#1a1a1a]">
                {INPUT_TABS.map(t => (
                  <button key={t.id} onClick={() => setInputTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-all"
                    style={inputTab === t.id
                      ? { color:"#fff", backgroundColor:"#161616", borderBottom:"2px solid #e21227" }
                      : { color:"#444" }}>
                    <span style={{ color:inputTab===t.id?"#888":"#333" }}>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 px-3 py-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
                  <span className="text-[#444]">{INPUT_TABS.find(t=>t.id===inputTab)?.icon}</span>
                  <input value={query} onChange={e=>setQuery(e.target.value)}
                    onKeyDown={e=>e.key==="Enter" && runScan()}
                    placeholder={INPUT_TABS.find(t=>t.id===inputTab)?.ph}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#2a2a2a] outline-none font-mono"/>
                </div>
                {/* Scan options */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={runScan}
                    className="flex flex-col items-center justify-center py-4 rounded-xl text-white font-bold transition-all active:scale-95"
                    style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                    <div className="flex items-center gap-1.5 text-[12px]">
                      <Search size={13}/> Start Light Scan
                    </div>
                    <span className="text-[10px] font-normal opacity-60 mt-0.5">Free • 1 scan</span>
                  </button>
                  <button onClick={() => setShowUpgrade(true)}
                    className="flex flex-col items-center justify-center py-4 rounded-xl border border-[#262626] bg-[#111] transition-all relative active:scale-95">
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black" style={{ background:"#7c3aed" }}>
                      <Crown size={7}/> PRO
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center mb-1">
                      <Search size={12} className="text-violet-400"/>
                    </div>
                    <span className="text-[12px] font-bold text-white">Deep Scanner</span>
                    <span className="text-[10px] text-[#444] mt-0.5">12,000+ sources</span>
                  </button>
                </div>
                <button onClick={runScan}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                  <Search size={14}/> Start Free Scan Now
                </button>
                <p className="text-center text-[10px] text-[#333] flex items-center justify-center gap-1">
                  <Eye size={9} className="opacity-40"/> The target will not be notified about your search
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mx-4 mb-4">
              {[
                { v:"12,000+", l:"Breach Sources",   icon:<Database size={15}/> },
                { v:"15B+",    l:"Records Indexed",   icon:<Server size={15}/>   },
                { v:"99.7%",   l:"Accuracy Rate",     icon:<Shield size={15}/>   },
              ].map(s=>(
                <div key={s.l} className="border border-[#1a1a1a] rounded-xl p-3 bg-[#0d0d0d] text-center">
                  <div className="flex justify-center mb-1 text-[#333]">{s.icon}</div>
                  <p className="text-[14px] font-black text-white">{s.v}</p>
                  <p className="text-[9px] text-[#444] mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-2 mx-4 mb-4">
              {[
                { icon:<Globe size={13}/>,  label:"Dark Web Monitoring",    color:"#e21227" },
                { icon:<Mail size={13}/>,   label:"Email Breach Detection", color:"#3b82f6" },
                { icon:<Key size={13}/>,    label:"Password Exposure",      color:"#f97316" },
                { icon:<User size={13}/>,   label:"Identity Tracking",      color:"#8b5cf6" },
              ].map(f=>(
                <div key={f.label} className="flex items-center gap-2 px-3 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background:f.color+"20", color:f.color }}>
                    {f.icon}
                  </div>
                  <span className="text-[11px] text-[#888] font-medium leading-tight">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Recent Scans */}
            <div className="mx-4 mb-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <Activity size={11} className="text-[#e21227]"/>
                  <p className="text-[11px] font-bold text-white">Recent Community Scans</p>
                </div>
                <span className="text-[9px] text-green-400 font-bold">LIVE</span>
              </div>
              {(() => {
                const TYPE_COLORS: Record<string,string> = { email:"#e21227", phone:"#3b82f6", username:"#f97316", fullname:"#10b981" };
                const DEMO = [
                  { q:"j***@gmail.com",  type:"email",    found:8,  ts:Date.now()-23000 },
                  { q:"+966-5****234",   type:"phone",    found:4,  ts:Date.now()-60000 },
                  { q:"h4ck3r_007",      type:"username", found:12, ts:Date.now()-180000 },
                  { q:"Ahmed Al-***",    type:"fullname", found:6,  ts:Date.now()-420000 },
                ];
                const rows = scanHistory.length > 0 ? scanHistory.slice(0,4) : DEMO;
                function relTime(ts:number){ const s=Math.floor((Date.now()-ts)/1000); if(s<60) return `${s}s ago`; if(s<3600) return `${Math.floor(s/60)}m ago`; return `${Math.floor(s/3600)}h ago`; }
                return rows.map((s,i)=>{
                  const c = TYPE_COLORS[s.type] ?? "#888";
                  const masked = s.q.length > 12 ? s.q.slice(0,4)+"****"+s.q.slice(-3) : s.q;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-[#0f0f0f]">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[8px] font-black"
                        style={{ background:c+"18", color:c }}>{s.type[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-[#888]">{masked}</span>
                        <span className="text-[9px] text-[#333] ml-2 capitalize">{s.type}</span>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color:c }}>{s.found} found</span>
                      <span className="text-[8px] text-[#333] font-mono">{relTime(s.ts)}</span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* 15 Deep Features list */}
            <div className="mx-4 mb-4 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-violet-600/30 flex items-center justify-center">
                  <Zap size={10} className="text-violet-400"/>
                </div>
                <p className="text-[11px] font-bold text-white">15 Deep Search AI Features</p>
              </div>
              {[
                { n:1,  l:"Transparency in Results",          d:"Shows result categories: direct answers, manuscripts, and sources", c:"#e21227" },
                { n:2,  l:"NLP Accuracy Engine",              d:"Advanced natural language processing for precise intelligence",     c:"#f97316" },
                { n:3,  l:"Specific Question Response",       d:"Who is? What happened? Show image? — accurate targeted answers",   c:"#fbbf24" },
                { n:4,  l:"Platform Data Integration",        d:"Cross-platform data correlation across 11+ services",              c:"#10b981" },
                { n:5,  l:"Query Simplification",             d:"Converts vague requests into precise intelligence queries",        c:"#06b6d4" },
                { n:6,  l:"Social Media Intelligence",        d:"Twitter, Telegram, Instagram, TikTok account investigation",      c:"#3b82f6" },
                { n:7,  l:"Dark Web Monitoring",              d:"12,000+ private and underground data source coverage",            c:"#8b5cf6" },
                { n:8,  l:"Stealer Log Analysis",             d:"Botnet dumps, credential logs, and malware telemetry parsing",    c:"#e21227" },
                { n:9,  l:"Password Breach Detection",        d:"Plain-text password recovery from breach databases",              c:"#ef4444" },
                { n:10, l:"IP & Geolocation Exposure",        d:"Dark web IP dumps and geolocation cross-reference",               c:"#f97316" },
                { n:11, l:"Linked Profiles Discovery",        d:"11+ platform cross-reference for complete identity mapping",      c:"#fbbf24" },
                { n:12, l:"Phone & SMS Records",              d:"Leaked SMS logs and phone number intelligence tracking",          c:"#10b981" },
                { n:13, l:"Vulnerability Scoring",            d:"Exploit score assessment for all discovered identities",          c:"#06b6d4" },
                { n:14, l:"Underground Forum Scanning",       d:"Hacking forums, paste sites, and non-indexed dark sources",      c:"#3b82f6" },
                { n:15, l:"Intelligence Report Compilation",  d:"Full AI threat report with remediation steps & risk rating",     c:"#8b5cf6" },
              ].map(f=>(
                <div key={f.n} className="flex items-start gap-3 px-4 py-3 border-t border-[#111]">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5"
                    style={{ background:f.c+"18", color:f.c }}>{f.n}</div>
                  <div>
                    <p className="text-[11px] font-bold" style={{ color:f.c }}>{f.l}</p>
                    <p className="text-[10px] text-[#444] mt-0.5">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PHASE: SCANNING ────────────────────────────────────── */}
        {phase === "scanning" && (
          <motion.div key="scanning" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 shrink-0">
              <p className="text-[11px] text-[#555] font-mono text-center mb-1">Analyzing</p>
              <p className="text-white font-bold text-center font-mono">{query}</p>
              <div className="mt-4 flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#555] font-mono">Progress</span>
                <motion.span className="text-[11px] font-black font-mono"
                  style={{ color: progress < 40 ? "#e21227" : progress < 80 ? "#fbbf24" : "#10b981" }}>
                  {progress}%
                </motion.span>
              </div>
              <div className="h-2 bg-[#111] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background:"linear-gradient(90deg,#e21227,#f97316)" }}
                  animate={{ width:`${progress}%` }} transition={{ duration:0.4 }}/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1.5">
              {SCAN_STEPS.map(step => {
                const done   = completedSteps.includes(step.id);
                const active = activeStep === step.id && !done;
                return (
                  <motion.div key={step.id} animate={{ opacity: done||active ? 1 : 0.28 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                    style={done
                      ? { borderColor:"#10b98130", backgroundColor:"#10b98108" }
                      : active
                        ? { borderColor:"#e2122730", backgroundColor:"#e2122708" }
                        : { borderColor:"#0f0f0f"  }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={done
                        ? { background:"#10b98120", border:"1px solid #10b98150" }
                        : active
                          ? { background:"#e2122720", border:"1px solid #e2122750" }
                          : { background:"#111", border:"1px solid #1a1a1a" }}>
                      {done   && <CheckCircle2 size={12} className="text-green-400"/>}
                      {active && <Loader2 size={11} className="animate-spin text-[#e21227]"/>}
                      {!done && !active && <span className="text-[#2a2a2a]">{step.icon}</span>}
                    </div>
                    <span className="text-[12px] font-medium"
                      style={done?{color:"#10b981"}:active?{color:"#fff"}:{color:"#333"}}>
                      {step.label}
                    </span>
                    {done && <span className="ml-auto text-[9px] text-green-500 font-mono">✓</span>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── PHASE: RESULTS ─────────────────────────────────────── */}
        {phase === "results" && (
          <motion.div key="results" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="flex-1 flex flex-col overflow-hidden">

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-px bg-[#111] border-b border-[#1a1a1a] shrink-0">
              {[
                { v:"3",   l:"TOTAL RECORDS",  c:"#10b981" },
                { v:"0",   l:"HIGH SEVERITY",  c:"#888"    },
                { v:"1",   l:"BREACH SOURCES", c:"#fbbf24" },
                { v:"3",   l:"DB MATCHES",     c:"#e21227" },
              ].map(s=>(
                <div key={s.l} className="bg-[#0d0d0d] py-3 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[16px] font-black" style={{ color:s.c }}>{s.v}</span>
                  <span className="text-[8px] text-[#444] font-mono tracking-wider">{s.l}</span>
                </div>
              ))}
            </div>

            {/* Result tabs */}
            <div className="flex gap-0 border-b border-[#1a1a1a] bg-[#0a0a0a] overflow-x-auto shrink-0">
              {RESULT_TABS.map(tab=>(
                <button key={tab.id} onClick={()=>setResultTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all border-b-2 shrink-0"
                  style={resultTab===tab.id
                    ? { color:"#e21227", borderColor:"#e21227", backgroundColor:"#e2122710" }
                    : { color:"#444", borderColor:"transparent" }}>
                  {tab.label}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black"
                      style={{ background:resultTab===tab.id?"#e21227":"#1f1f1f", color:"#fff" }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

              {/* OVERVIEW TAB */}
              {resultTab === "overview" && (
                <motion.div key="ov" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  {/* Threats header */}
                  <div className="text-center py-4">
                    <div className="relative inline-block mb-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ background:"linear-gradient(135deg,#e21227,#7f1d1d)" }}>
                        <Shield size={24} className="text-white"/>
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#e21227] flex items-center justify-center border-2 border-[#090909]">
                        <span className="text-[9px] font-black text-white">!</span>
                      </div>
                    </div>
                    <h2 className="text-lg font-black text-white">Potential Threats Detected</h2>
                    <p className="text-[11px] text-[#666] mt-1">
                      We found <span className="text-[#e21227] font-bold">3 potential flags</span> in dark web databases for{" "}
                      <span className="text-white font-mono">{query}</span>
                    </p>
                  </div>

                  {/* Flagged data card */}
                  <div className="rounded-2xl border border-[#e21227]/20 bg-[#e21227]/05 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e21227]/10">
                      <AlertTriangle size={13} className="text-[#e21227]"/>
                      <span className="text-[11px] font-bold text-[#e21227]">Flagged Data Found — Details Hidden</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] text-[#555] mb-3">
                        Our scan detected <span className="text-[#e21227]">exposed records</span> linked to this identity. Upgrade to reveal full details.
                      </p>
                      {[
                        { icon:<Key size={12}/>,    l:"Password breach detected", sub:"(2 sources)",  c:"#f97316", locked:false },
                        { icon:<Globe size={12}/>,  l:"IP address exposed in dark web dump", sub:"",  c:"#3b82f6", locked:false },
                        { icon:<Shield size={12}/>, l:"Data listed for sale on marketplace", sub:"",  c:"#8b5cf6", locked:true  },
                      ].map((item,i)=>(
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl mb-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ background:item.c+"20", color:item.c }}>{item.icon}</div>
                          <span className="text-[11px] text-[#ccc] flex-1">{item.l} <span className="text-[#444]">{item.sub}</span></span>
                          {item.locked
                            ? <Lock size={10} className="text-[#444]"/>
                            : <div className="h-1.5 w-16 bg-[#111] rounded-full overflow-hidden">
                                <div className="h-full w-2/3 rounded-full" style={{ background:item.c+"70" }}/>
                              </div>
                          }
                        </div>
                      ))}
                      <button onClick={() => setShowUpgrade(true)}
                        className="w-full mt-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/08 hover:bg-[#e21227]/15 transition-all">
                        <Lock size={12}/> Unlock Deep Scan — view full details & remediation
                      </button>
                    </div>
                  </div>

                  {/* Additional sources */}
                  <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                      <Eye size={13} className="text-[#fbbf24]"/>
                      <div>
                        <p className="text-[11px] font-bold text-white">Additional sources not yet scanned</p>
                        <p className="text-[10px] text-[#444]">Light Scan covers <span className="text-[#fbbf24]">12%</span> of known leak sources</p>
                      </div>
                    </div>
                    {EXTRA_SOURCES.map((s,i)=>(
                      <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-[#0f0f0f]">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[#444]">{s.icon}</div>
                        <span className="text-[11px] text-[#888] flex-1">{s.label}</span>
                        <span className="text-[10px] font-bold" style={{ color:s.rc }}>{s.risk}</span>
                      </div>
                    ))}
                  </div>

                  {/* Exposure Score */}
                  <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity size={13} className="text-[#fbbf24]"/>
                        <span className="text-[11px] font-bold text-white">Account Exposure Score</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#fbbf24]">Unknown</span>
                    </div>
                    <div className="h-2 bg-[#111] rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full"
                        style={{ background:"linear-gradient(90deg,#fbbf24,#f97316)" }}
                        initial={{ width:"0%" }} animate={{ width:"35%" }} transition={{ duration:1.5 }}/>
                    </div>
                    <p className="text-[10px] text-[#333]">A Deep Scan is required to calculate your full exposure score</p>
                  </div>

                  {/* PRO findings */}
                  <div className="rounded-2xl border border-[#7c3aed]/25 bg-[#7c3aed]/04 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#7c3aed]/15">
                      <div className="w-7 h-7 rounded-lg bg-violet-600/25 flex items-center justify-center">
                        <Search size={12} className="text-violet-400"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-white">Deep Scan Can Find</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-600 text-white">PRO</span>
                        </div>
                        <p className="text-[9px] text-[#444]">Data available in private & underground sources</p>
                      </div>
                    </div>
                    {PRO_FINDINGS.map((f,i)=>(
                      <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-[#7c3aed]/08">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{ background:f.color+"18", color:f.color }}>{f.icon}</div>
                        <span className="text-[11px] text-[#666] flex-1">{f.label}</span>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-14 bg-[#111] rounded-full overflow-hidden">
                            <div className="h-full w-3/4 rounded-full blur-sm" style={{ background:f.color }}/>
                          </div>
                          <Lock size={9} className="text-[#333]"/>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chain Investigation cross-link */}
                  {onOpenChainInvestigation && (
                    <button onClick={() => { onOpenChainInvestigation(); onOpenChange(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/05 hover:bg-[#f59e0b]/10 transition-all text-left">
                      <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/30 flex items-center justify-center shrink-0">
                        <GitBranch size={15} className="text-[#f59e0b]"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white">Open in Chain Investigation</p>
                        <p className="text-[10px] text-[#555]">Build a visual threat graph from these findings</p>
                      </div>
                      <ChevronRight size={13} className="text-[#f59e0b] shrink-0"/>
                    </button>
                  )}

                  {/* CTA */}
                  <div className="rounded-2xl border border-[#e21227]/15 bg-gradient-to-br from-[#e21227]/08 to-transparent p-5 text-center">
                    <h3 className="text-[14px] font-black text-white mb-1">Try Deep Search AI</h3>
                    <p className="text-[10px] text-[#666] mb-3">Scan <span className="text-white font-bold">12,000+</span> private sources including:</p>
                    <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                      {[
                        { icon:<Globe size={9}/>,         label:"Dark Web"    },
                        { icon:<Eye size={9}/>,            label:"Stealer Logs"},
                        { icon:<MessageSquare size={9}/>,  label:"Telegram"    },
                        { icon:<BookOpen size={9}/>,       label:"Forums"      },
                        { icon:<Wifi size={9}/>,           label:"Botnets"     },
                      ].map(tag=>(
                        <span key={tag.label} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#1f1f1f] rounded-full text-[9px] text-[#888]">
                          {tag.icon} {tag.label}
                        </span>
                      ))}
                    </div>
                    <button onClick={() => setShowUpgrade(true)}
                      className="w-full py-4 rounded-xl text-white font-black text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                      <Search size={14}/> Start Deep Scan — Professional Plan
                    </button>
                    <p className="text-[9px] text-[#444] mt-1.5">Includes unlimited scans + full OSINT toolkit</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <Star size={10} className="text-yellow-400 fill-yellow-400"/>
                      <span className="text-[10px] text-[#555]">Check reviews on Trustpilot ↗</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI REPORT TAB */}
              {resultTab === "ai-report" && (
                <motion.div key="air" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  <div className="rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                      <div className="flex items-center gap-2">
                        <Activity size={13} className="text-[#e21227]"/>
                        <span className="text-[12px] font-bold text-white">AI Intelligence Report</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#444]">Generated by KaliGPT</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mb-2">Executive Summary</p>
                        <p className="text-[12px] text-[#aaa] leading-relaxed">
                          Target <span className="text-white font-mono">{query}</span> has been identified across{" "}
                          <span className="text-[#e21227] font-bold">3 breach databases</span> with indicators of compromise
                          dating back to Q4 2024. The digital footprint spans <span className="text-[#fbbf24]">11+ platforms</span> with
                          active social presence. Immediate action recommended for credential rotation.
                        </p>
                      </div>
                      {[
                        { label:"Risk Level",     value:"MEDIUM-HIGH", color:"#ef4444" },
                        { label:"Confidence",     value:"87%",         color:"#10b981" },
                        { label:"Sources Scanned",value:"15 layers",   color:"#3b82f6" },
                        { label:"Findings",       value:"3 flags",     color:"#e21227" },
                        { label:"Last Updated",   value:"Just now",    color:"#fbbf24" },
                      ].map(r=>(
                        <div key={r.label} className="flex items-center justify-between py-2 border-t border-[#111]">
                          <span className="text-[11px] text-[#555]">{r.label}</span>
                          <span className="text-[11px] font-bold font-mono" style={{ color:r.color }}>{r.value}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#111] pt-3">
                        <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mb-2">Recommendations</p>
                        {[
                          "Immediately rotate all passwords associated with this identity",
                          "Enable 2FA on all linked platform accounts",
                          "Monitor dark web for new mentions of this identity",
                          "Check linked email accounts for unauthorized access",
                          "Run a full Deep Scan to uncover hidden breach details",
                        ].map((r,i)=>(
                          <div key={i} className="flex items-start gap-2 py-1.5">
                            <span className="text-[#e21227] text-[10px] font-mono mt-0.5">{i+1}.</span>
                            <span className="text-[11px] text-[#888]">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={copyReport}
                    className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/08 hover:bg-[#e21227]/15 transition-all">
                    {copied?<Check size={13} className="text-green-400"/>:<Download size={13}/>} Download Full Report
                  </button>
                </motion.div>
              )}

              {/* IDENTITY TAB */}
              {resultTab === "identity" && (
                <motion.div key="id" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  {/* Profile card */}
                  <div className="rounded-2xl border border-[#262626] bg-[#0f0f0f] overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-[#1a1a1a]">
                      <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center shrink-0">
                        <Camera size={20} className="text-[#333]"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-white">{query || "Target"}</p>
                        <p className="text-[10px] text-[#555]">Identified via Snapchat</p>
                        <p className="text-[10px] text-violet-400 mt-0.5">Join WhatsApp Group — Tiklo</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono">
                          <span className="text-[#fbbf24]">11 Platforms Found</span>
                          <span className="text-[#888]">1 email</span>
                          <span className="text-[#888]">2 usernames</span>
                        </div>
                      </div>
                    </div>
                    {/* Discovered identifiers */}
                    <div className="p-4 space-y-3">
                      <p className="text-[9px] text-[#444] font-mono uppercase tracking-widest">Discovered Identifiers</p>
                      {/* Names */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <User size={10} className="text-[#555]"/>
                          <span className="text-[9px] text-[#444] font-mono uppercase tracking-wider">Names</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["da7rkx0","3a7rkx0","محمد ردا","mr7","Da7rkx0"].map(n=>(
                            <span key={n} className="px-2.5 py-1 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[10px] text-[#aaa] font-mono">{n}</span>
                          ))}
                        </div>
                      </div>
                      {/* Emails */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Mail size={10} className="text-[#555]"/>
                          <span className="text-[9px] text-[#444] font-mono uppercase tracking-wider">Emails</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["da7rkx@icloud.com"].map(e=>(
                            <span key={e} className="px-2.5 py-1 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[10px] text-[#3b82f6] font-mono">{e}</span>
                          ))}
                        </div>
                      </div>
                      {/* Usernames */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <AtSign size={10} className="text-[#555]"/>
                          <span className="text-[9px] text-[#444] font-mono uppercase tracking-wider">Usernames</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["@da7rkx0","@da7rkx0"].map((u,i)=>(
                            <span key={i} className="px-2.5 py-1 bg-[#1a1a1a] border border-[#262626] rounded-lg text-[10px] text-[#10b981] font-mono">{u}</span>
                          ))}
                        </div>
                      </div>
                      {/* Intelligence sources */}
                      <div className="border-t border-[#1a1a1a] pt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Server size={10} className="text-[#555]"/>
                          <span className="text-[9px] text-[#444] font-mono uppercase tracking-wider">Intelligence Sources (11 Modules)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {["Snapchat OSINT","Telegram DB","HaveIBeenPwned","DarkWeb Scrape","Forum Intel",
                            "PasteSearch","SocialScan","EmailFinder","PhoneDB","GeoIP","NLP Engine"].map(s=>(
                            <span key={s} className="px-2 py-0.5 bg-[#111] border border-[#1a1a1a] rounded text-[8px] text-[#555]">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowUpgrade(true)}
                    className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border border-[#7c3aed]/30 text-violet-400 bg-[#7c3aed]/08 hover:bg-[#7c3aed]/15 transition-all">
                    <Crown size={13}/> Unlock Full Identity Profile
                  </button>
                </motion.div>
              )}

              {/* DATA BREACHES TAB */}
              {resultTab === "breaches" && (
                <motion.div key="br" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-white">3 Breach Records Found</p>
                    <span className="text-[10px] text-[#444] font-mono">via 15-layer scan</span>
                  </div>
                  {BREACH_RECORDS.map((rec,i)=>(
                    <div key={i} className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] overflow-hidden">
                      <button className="w-full flex items-center gap-2 px-4 py-3"
                        onClick={() => setExpanded(expandedBreach===i?null:i)}>
                        <div className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0"/>
                        <span className="text-[11px] font-bold text-white flex-1 text-left">{rec.source}</span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black text-[#3b82f6] border border-[#3b82f6]/30 bg-[#3b82f6]/10">
                          {rec.tag}
                        </span>
                        <Calendar size={10} className="text-[#444]"/>
                        <span className="text-[9px] text-[#444] font-mono">{rec.date}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#10b981] font-bold ml-1">{rec.severity}</span>
                        <ChevronRight size={12} className={`text-[#444] transition-transform ${expandedBreach===i?"rotate-90":""}`}/>
                      </button>
                      <AnimatePresence>
                      {expandedBreach === i && (
                        <motion.div initial={{ height:0 }} animate={{ height:"auto" }} exit={{ height:0 }}
                          className="overflow-hidden border-t border-[#1a1a1a]">
                          <div className="p-4">
                            <p className="text-[9px] text-[#444] font-mono uppercase tracking-widest mb-2">Fields Exposed</p>
                            <div className="flex flex-wrap gap-1.5">
                              {rec.fields.map(f=>(
                                <span key={f} className="flex items-center gap-1 px-2 py-1 bg-[#111] border border-[#1f1f1f] rounded text-[9px] text-[#888]">
                                  <Hash size={8} className="text-[#444]"/> {f}
                                </span>
                              ))}
                            </div>
                            <button onClick={() => setShowUpgrade(true)}
                              className="w-full mt-3 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 border border-[#e21227]/20 text-[#e21227] bg-[#e21227]/06 hover:bg-[#e21227]/12 transition-all">
                              <Lock size={10}/> Unlock Full Record Values
                            </button>
                          </div>
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </div>
                  ))}
                  <button onClick={() => setShowUpgrade(true)}
                    className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2"
                    style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                    <Shield size={13}/> Run Deep Scan — 12,000+ Sources
                  </button>
                </motion.div>
              )}

              {/* MEDIA INTEL TAB */}
              {resultTab === "media" && (
                <motion.div key="mi" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-white">Media Intelligence</p>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#e21227]/20 text-[#e21227]">99+ items</span>
                  </div>
                  {MEDIA_INTEL.map((m,i)=>(
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background:m.color+"18" }}>
                        <Camera size={14} style={{ color:m.color }}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white">{m.type}</p>
                        <p className="text-[9px] text-[#444]">{m.source}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold" style={{ color:m.color }}>{m.count}</p>
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                          style={{ background:m.color+"15", color:m.color }}>{m.risk}</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setShowUpgrade(true)}
                    className="w-full py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 border border-[#7c3aed]/30 text-violet-400 bg-[#7c3aed]/08 hover:bg-[#7c3aed]/15 transition-all">
                    <Lock size={12}/> Unlock Full Media Intelligence (PRO)
                  </button>
                </motion.div>
              )}

              {/* SOCIAL PROFILES TAB */}
              {resultTab === "social" && (
                <motion.div key="sp" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-white">Social Profiles Found</p>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#3b82f6]/20 text-[#3b82f6]">45 platforms</span>
                  </div>
                  {SOCIAL_PROFILES_DATA.map((p,i)=>(
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px]"
                        style={{ background:p.color+"20", color:p.color }}>{p.platform[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white">{p.platform}</p>
                        <p className="text-[10px] text-[#555] font-mono">{p.handle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold"
                          style={{ background:p.status==="Active"?"#10b98115":"#6666660a",
                                   color:p.status==="Active"?"#10b981":"#555" }}>{p.status}</span>
                        {p.status === "Private" && <Lock size={9} className="text-[#444]"/>}
                      </div>
                    </div>
                  ))}
                  <div className="text-center py-3 border border-dashed border-[#1a1a1a] rounded-xl">
                    <p className="text-[10px] text-[#444]">+37 more profiles found with Deep Scan</p>
                    <button onClick={() => setShowUpgrade(true)} className="text-[10px] text-violet-400 font-bold mt-1 hover:underline">
                      Unlock All →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ACTIVITY TAB */}
              {resultTab === "activity" && (
                <motion.div key="act" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="p-4 space-y-3">
                  <p className="text-[11px] font-bold text-white">Social Activity Timeline</p>
                  <div className="relative pl-4">
                    <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#1a1a1a]"/>
                    {SOCIAL_ACTIVITY.map((a,i)=>(
                      <div key={i} className="relative flex gap-3 pb-4">
                        <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2"
                          style={{ borderColor:a.risk==="High"?"#ef4444":a.risk==="Medium"?"#fbbf24":"#10b981",
                                   backgroundColor:a.risk==="High"?"#ef444420":a.risk==="Medium"?"#fbbf2420":"#10b98120" }}/>
                        <div className="flex-1 min-w-0 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] text-[#ccc] leading-tight">{a.action}</p>
                            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0"
                              style={{ background:a.risk==="High"?"#ef444420":a.risk==="Medium"?"#fbbf2420":"#10b98120",
                                       color:a.risk==="High"?"#ef4444":a.risk==="Medium"?"#fbbf24":"#10b981" }}>{a.risk}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#444]">{a.platform}</span>
                            <span className="text-[#2a2a2a]">·</span>
                            <span className="text-[9px] text-[#333] font-mono">{a.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="relative flex gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 border-[#333] bg-[#111]"/>
                      <button onClick={() => setShowUpgrade(true)}
                        className="flex-1 text-center py-2 border border-dashed border-[#1f1f1f] rounded-xl text-[10px] text-[#444] hover:text-violet-400 hover:border-violet-500/30 transition-all">
                        <Lock size={9} className="inline mr-1"/> Unlock full activity history (PRO)
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              </AnimatePresence>
            </div>

            {/* ── STICKY BOTTOM CTA BAR ───────────────────────────── */}
            <div className="shrink-0 border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white truncate">Unlock {query || "target"} — Full Report</p>
                <p className="text-[9px] text-[#444]">12,000+ sources · Identity mapping · AI report</p>
              </div>
              <button onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-[11px] font-bold shrink-0 active:scale-95 transition-all"
                style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                <Crown size={11}/> Deep Scan
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── UPGRADE MODAL (multi-step) ─────────────────────────── */}
        <AnimatePresence>
        {showUpgrade && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="absolute inset-0 z-50 bg-black/90 flex items-end sm:items-center justify-center">
            <motion.div initial={{ y:60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:60, opacity:0 }}
              className="w-full sm:max-w-sm bg-[#0f0f0f] border border-[#1f1f1f] rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[92vh]">

              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a1a1a]">
                {payStep !== "plans" && (
                  <button onClick={() => setPayStep(payStep==="confirm"?"payment":"plans")}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white shrink-0">
                    <ChevronRight size={13} className="rotate-180"/>
                  </button>
                )}
                <span className="text-[12px] font-bold text-white flex-1">
                  {payStep==="plans"?"Unlock Deep Search AI":payStep==="payment"?"Choose Payment Method":"Payment Confirmation"}
                </span>
                <div className="flex items-center gap-1 text-[9px] text-[#e21227] font-mono shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e21227] animate-pulse"/>
                  {timerStr}
                </div>
                <button onClick={() => { setShowUpgrade(false); setPayStep("plans"); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white ml-1">
                  <X size={13}/>
                </button>
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-1.5 py-2 border-b border-[#111]">
                {(["plans","payment","confirm"] as const).map((s,i)=>(
                  <div key={s} className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ background: s===payStep?"#e21227":i<(payStep==="payment"?1:payStep==="confirm"?2:0)?"#e2122750":"#1f1f1f" }}/>
                ))}
              </div>

              <AnimatePresence mode="wait">

              {/* STEP 1: PLANS */}
              {payStep === "plans" && (
                <motion.div key="plans" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                  className="p-4 space-y-3">
                  <p className="text-center text-[11px] text-[#555]">Select a plan to continue</p>
                  {/* One-Time */}
                  <button onClick={() => { setSelectedPlan("one-time"); setPayStep("payment"); }}
                    className="w-full p-3 rounded-xl border border-green-500/30 bg-[#0a0a0a] text-left hover:border-green-500/60 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">BEST VALUE — TRY FIRST</span>
                        <p className="text-[13px] font-black text-white mt-1.5">One-Time Deep Scan</p>
                        <p className="text-[10px] text-[#555] mt-0.5">1 full OSINT scan • No subscription</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {["15 scan layers","Identity mapping","Breach details","AI report"].map(f=>(
                            <span key={f} className="text-[8px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xl font-black text-white">$29</p>
                        <p className="text-[9px] text-[#444]">one-time</p>
                      </div>
                    </div>
                  </button>
                  {/* Pro */}
                  <button onClick={() => { setSelectedPlan("pro"); setPayStep("payment"); }}
                    className="w-full p-3 rounded-xl border-2 border-[#e21227] bg-[#e21227]/05 text-left relative hover:bg-[#e21227]/10 transition-all">
                    <div className="absolute -top-2.5 left-3">
                      <span className="text-[8px] bg-[#f97316] text-white px-2 py-0.5 rounded-full font-black">MOST POPULAR</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-black text-white">Professional</p>
                        <p className="text-[10px] text-[#555] mt-0.5">3 Deep Search Scans/mo • Full OSINT toolkit</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {["All 15 features","Dark web access","Team sharing","API access"].map(f=>(
                            <span key={f} className="text-[8px] px-1.5 py-0.5 bg-[#e21227]/15 text-[#e21227] rounded">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xl font-black text-white">$72</p>
                        <p className="text-[9px] text-[#e21227] line-through">$90</p>
                        <p className="text-[9px] text-[#444]">/mo</p>
                      </div>
                    </div>
                  </button>
                  {/* Elite */}
                  <button onClick={() => { setSelectedPlan("elite"); setPayStep("payment"); }}
                    className="w-full p-3 rounded-xl border border-violet-500/30 bg-[#0a0a0a] text-left hover:border-violet-500/60 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Crown size={10} className="text-violet-400"/>
                          <span className="text-[9px] text-violet-400 font-bold">ELITE — 20% OFF</span>
                        </div>
                        <p className="text-[13px] font-black text-white">Elite</p>
                        <p className="text-[10px] text-[#555] mt-0.5">Unlimited scans • Professional investigators</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {["Unlimited scans","Priority queue","Godmode access","Advanced OSINT"].map(f=>(
                            <span key={f} className="text-[8px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xl font-black text-white">$120</p>
                        <p className="text-[9px] text-violet-400 line-through">$150</p>
                        <p className="text-[9px] text-[#444]">/mo</p>
                      </div>
                    </div>
                  </button>
                  {/* Coupon */}
                  {couponOk ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                      <CheckCircle2 size={12} className="text-green-400"/>
                      <span className="text-[11px] font-bold text-green-400">Coupon "{coupon.toUpperCase()}" Applied</span>
                      <button onClick={()=>{setCouponOk(false);setCoupon("");}} className="ml-auto text-[#444] hover:text-white"><X size={11}/></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon code..."
                        className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl text-[11px] text-white placeholder:text-[#2a2a2a] outline-none focus:border-[#e21227] font-mono"/>
                      <button onClick={()=>coupon.trim()&&setCouponOk(true)}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-white" style={{ background:"#e21227" }}>Apply</button>
                    </div>
                  )}
                  <p className="text-[9px] text-center text-[#333] flex items-center justify-center gap-1">
                    <Shield size={9} className="text-green-400"/> Secure checkout · 7-day refund for first-timers
                  </p>
                </motion.div>
              )}

              {/* STEP 2: PAYMENT METHOD */}
              {payStep === "payment" && (
                <motion.div key="payment" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                  className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[#555]">Plan: <span className="text-white font-bold">
                      {selectedPlan==="one-time"?"One-Time $29":selectedPlan==="pro"?"Professional $72/mo":"Elite $120/mo"}
                    </span></p>
                  </div>
                  {/* Payment tabs */}
                  <div className="flex gap-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
                    {([
                      { id:"usdt_trc20" as PaymentTab, label:"USDT TRC20", color:"#10b981" },
                      { id:"usdt_bep20" as PaymentTab, label:"USDT BEP20", color:"#fbbf24" },
                      { id:"btc"        as PaymentTab, label:"Bitcoin",    color:"#f97316" },
                      { id:"paypal"     as PaymentTab, label:"PayPal",     color:"#3b82f6" },
                    ]).map(t=>(
                      <button key={t.id} onClick={()=>setPaymentTab(t.id)}
                        className="flex-1 py-2.5 text-[9px] font-bold transition-all"
                        style={paymentTab===t.id
                          ? { color:t.color, backgroundColor:t.color+"15", borderBottom:`2px solid ${t.color}` }
                          : { color:"#333", borderBottom:"2px solid transparent" }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Address display */}
                  {paymentTab !== "paypal" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-[#444] font-mono mb-1">
                            {paymentTab==="usdt_trc20"?"USDT TRC20 Address":paymentTab==="usdt_bep20"?"USDT BEP20 Address":"Bitcoin Address"}
                          </p>
                          <p className="text-[10px] text-white font-mono break-all leading-relaxed">
                            {PAYMENT_ADDRESSES[paymentTab]}
                          </p>
                        </div>
                        <button onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_ADDRESSES[paymentTab]);
                          setCopiedAddr(true); setTimeout(()=>setCopiedAddr(false),2000);
                        }} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[#262626] bg-[#111]">
                          {copiedAddr ? <Check size={12} className="text-green-400"/> : <Copy size={12} className="text-[#555]"/>}
                        </button>
                      </div>
                      <div className="p-3 bg-[#fbbf24]/05 border border-[#fbbf24]/20 rounded-xl">
                        <p className="text-[9px] text-[#fbbf24] flex items-start gap-1.5">
                          <AlertTriangle size={9} className="shrink-0 mt-0.5"/>
                          Send the exact amount for your plan. After payment, click "I've Paid" and our team will verify within 24 hours.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center font-black text-[16px] text-blue-400 shrink-0">P</div>
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-white">PayPal</p>
                          <p className="text-[10px] text-[#555] font-mono">{PAYMENT_ADDRESSES.paypal}</p>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(PAYMENT_ADDRESSES.paypal); setCopiedAddr(true); setTimeout(()=>setCopiedAddr(false),2000); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#262626] bg-[#111]">
                          {copiedAddr ? <Check size={12} className="text-green-400"/> : <Copy size={12} className="text-[#555]"/>}
                        </button>
                      </div>
                      <a href="https://paypal.me/mr7ai" target="_blank" rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 border border-[#3b82f6]/30 text-[#3b82f6] bg-[#3b82f6]/08 hover:bg-[#3b82f6]/15 transition-all">
                        <ExternalLink size={13}/> Pay via PayPal.me
                      </a>
                    </div>
                  )}

                  {/* Terms */}
                  <div className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 border border-[#333] rounded mt-0.5 shrink-0"/>
                    <p className="text-[9px] text-[#444]">
                      I agree to the <span className="text-[#e21227]">Terms of Service</span> and{" "}
                      <span className="text-[#e21227]">Refund Policy</span>. All purchases are final.
                    </p>
                  </div>

                  <button onClick={() => setPayStep("confirm")}
                    className="w-full py-3.5 rounded-xl text-white font-black text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                    style={{ background:"linear-gradient(135deg,#e21227,#8b0000)" }}>
                    <Check size={14}/> I've Paid — Continue
                  </button>
                </motion.div>
              )}

              {/* STEP 3: CONFIRM */}
              {payStep === "confirm" && (
                <motion.div key="confirm" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                  className="p-4 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} className="text-green-400"/>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-white mb-1">Payment Submitted</h3>
                    <p className="text-[11px] text-[#555]">
                      Our team will verify your payment within <span className="text-white font-bold">24 hours</span>. You will receive an activation code via Telegram or email.
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    {[
                    { href:"https://t.me/mr7ai",          icon:<MessageSquare size={14} className="text-[#3b82f6]"/>, color:"#3b82f6", label:"Contact via Telegram", sub:"@mr7ai — fastest response",   ext:true  },
                    { href:"https://wa.me/mr7ai",          icon:<Phone size={14} className="text-[#10b981]"/>,        color:"#10b981", label:"Contact via WhatsApp", sub:"Send payment proof on WA",    ext:true  },
                    { href:"mailto:support@mr7.ai",        icon:<Mail size={14} className="text-[#e21227]"/>,         color:"#e21227", label:"Send Payment Proof",   sub:"support@mr7.ai",              ext:false },
                  ].map(c=>(
                    <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-3 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] hover:border-opacity-60 transition-all"
                      style={{ borderColor:`${c.color}20` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background:`${c.color}15` }}>{c.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white">{c.label}</p>
                        <p className="text-[10px] text-[#444]">{c.sub}</p>
                      </div>
                      {c.ext && <ExternalLink size={10} className="text-[#333]"/>}
                    </a>
                  ))}
                  </div>
                  <button onClick={() => { setShowUpgrade(false); setPayStep("plans"); }}
                    className="w-full py-3 rounded-xl text-[12px] font-bold border border-[#1f1f1f] text-[#666] hover:text-white transition-all">
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
            <ProofToast key={proofIdx} p={PROOFS[proofIdx]} onDone={() => setProofIdx(null)}/>
          )}
        </AnimatePresence>
      </div>
    </FullPageOverlay>
  );
}
