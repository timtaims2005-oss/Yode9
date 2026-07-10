import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Eye, AlertTriangle, Terminal, Copy, CheckCheck,
  Zap, Lock, Network, Database, Activity, Target, Crosshair, Radio,
  FileSearch, Hash, Mail, Smartphone, User, Server, Wifi, Key,
  ChevronRight, ExternalLink, Bug, Cpu, ArrowRight, Layers,
  Download, MessageSquare, RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronDown, Link, Clock, FileText, Boxes, ShieldCheck, ShieldAlert,
  Trash2, Bitcoin, GitBranch, BarChart2, Radar, Satellite, Brain,
  Filter, Play, Pause, RotateCw, Settings, Info, AlertOctagon,
  TrendingUp, Map, Users, Phone, Camera, Mic, Share2, List,
  Plus, Save, FolderOpen, Layers as LayersIcon, Package, Microscope,
  Siren, Shield as ShieldIcon, BookOpen, Code, Upload, ArrowDown,
  CheckSquare, Box, Signal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onClose: () => void; }

type MainTab =
  | "unified" | "email" | "network" | "domain"
  | "darkweb" | "blockchain" | "threat" | "graph"
  | "ai" | "monitoring" | "telecom" | "netscan"
  | "username" | "hash" | "sigint" | "person"
  | "ransomware" | "cve" | "evidence" | "bulkioc"
  | "timeline" | "export" | "status";

interface Result { success: boolean; data?: unknown; error?: string; }

const API = "/api/darkweb-intelligence";

const RISK_COLORS: Record<string, string> = {
  critical: "#e21227", high: "#f97316", medium: "#f59e0b",
  low: "#10b981", info: "#3b82f6", unknown: "#64748b"
};

// ── Reusable UI atoms ─────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const c = RISK_COLORS[level?.toLowerCase()] || RISK_COLORS.unknown;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black font-mono border"
      style={{ color: c, background: `${c}18`, borderColor: `${c}35` }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c }} />
      {level?.toUpperCase()}
    </span>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-500"}`} />;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]/20 animate-ping" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[#8b5cf6] animate-spin" />
      </div>
    </div>
  );
}

function JsonDisplay({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative mt-2">
      <button onClick={copy} className="absolute top-1.5 right-1.5 p-1 rounded text-slate-500 hover:text-white z-10">
        {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
      <pre className="text-[9px] font-mono text-slate-300 bg-black/40 border border-[#1a1a2e] rounded-lg p-3 overflow-auto max-h-72 leading-relaxed whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color = "#8b5cf6" }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      <span className="text-[10px] font-black font-mono uppercase tracking-widest" style={{ color }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right,${color}50,transparent)` }} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; multiline?: boolean; rows?: number;
}) {
  const cls = "w-full bg-black/30 border border-[#1a1a2e] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-[#8b5cf6]/50 font-mono";
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">{label}</label>
      {multiline
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

function Chip({ label, active, color = "#8b5cf6", onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-2 py-0.5 rounded text-[8px] font-mono border transition-all"
      style={{
        background: active ? `${color}18` : "transparent",
        borderColor: active ? `${color}50` : "#1a1a2e",
        color: active ? color : "#475569"
      }}>{label}</button>
  );
}

function RunBtn({ onClick, loading, color = "#8b5cf6", label }: { onClick: () => void; loading: boolean; color?: string; label: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold font-mono disabled:opacity-50 transition-all"
      style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
      {label}
    </button>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
      <p className="text-[10px] text-red-300">{msg}</p>
    </div>
  );
}

function OkBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-2">
      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <p className="text-[10px] text-emerald-300">{msg}</p>
    </div>
  );
}

async function post(endpoint: string, body: object): Promise<Result> {
  const r = await fetch(`${API}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function get(endpoint: string): Promise<Result> {
  const r = await fetch(`${API}${endpoint}`);
  return r.json();
}

// ── TAB: Unified Search ──────────────────────────────────────────────────────
function UnifiedTab() {
  const [q, setQ] = useState(""); const [types, setTypes] = useState(["email","ip","darkweb","blockchain","threat"]); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const allTypes = ["email","ip","domain","darkweb","blockchain","threat","username","hash"];
  const toggle = (t: string) => setTypes(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);
  const run = async () => { if(!q.trim()){toast({title:"أدخل استعلام البحث"});return;} setLoading(true); setResult(null); try { setResult(await post("/search", {query:q,types,enrichment:true})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Search} label="البحث الاستخباراتي الموحد — Unified OSINT Search" />
      <p className="text-[9px] text-slate-500">بحث شامل متوازٍ في جميع المصادر الاستخباراتية دفعة واحدة</p>
      <Field label="الاستعلام" value={q} onChange={setQ} placeholder="email / IP / domain / hash / username / keyword..." />
      <div>
        <p className="text-[8px] font-mono text-slate-600 uppercase mb-1.5">المصادر المفعّلة</p>
        <div className="flex flex-wrap gap-1.5">{allTypes.map(t=><Chip key={t} label={t} active={types.includes(t)} onClick={()=>toggle(t)} />)}</div>
      </div>
      <RunBtn onClick={run} loading={loading} label="تنفيذ البحث الموحد" />
      {loading && <Spinner />}
      {d && <><div className="grid grid-cols-3 gap-2">
        {[{label:"إجمالي النتائج",value:d.total??0,color:"#8b5cf6"},{label:"مصادر مفحوصة",value:d.results?.length??0,color:"#3b82f6"},{label:"التحليل",value:d.analysis?"متاح":"—",color:"#10b981"}].map(({label,value,color})=>(
          <div key={label} className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center">
            <p className="text-[16px] font-black" style={{color}}>{String(value)}</p>
            <p className="text-[8px] text-slate-500 font-mono">{label}</p>
          </div>
        ))}
      </div>
      {d.analysis && <div className="bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-lg p-3"><p className="text-[9px] font-mono text-[#8b5cf6] mb-1.5">تحليل AI</p><p className="text-[10px] text-slate-300">{d.analysis}</p></div>}
      <JsonDisplay data={d} /></>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Email ───────────────────────────────────────────────────────────────
function EmailTab() {
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!email.trim()){toast({title:"أدخل البريد الإلكتروني"});return;} setLoading(true); setResult(null); try { setResult(await get(`/email/${encodeURIComponent(email)}`)); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Mail} label="استخبارات البريد الإلكتروني" color="#3b82f6" />
      <div className="grid grid-cols-2 gap-1.5">{["IntelX","HudsonRock","HIBP","DeHashed","EmailRep","SpyCloud"].map(s=><div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded text-[9px] font-mono text-slate-500"><StatusDot ok={false}/>{s}</div>)}</div>
      <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="target@example.com" type="email" />
      <RunBtn onClick={run} loading={loading} color="#3b82f6" label="تحليل البريد الإلكتروني" />
      {loading && <Spinner />}
      {d && <>
        <div className="grid grid-cols-2 gap-2">
          {[{label:"التسريبات",value:d.breaches?.length??0,color:d.breaches?.length?"#e21227":"#10b981"},{label:"بيانات اعتماد",value:d.credentials?.length??0,color:d.credentials?.length?"#f97316":"#10b981"},{label:"نقاط الخطر",value:d.riskScore??"—",color:"#f59e0b"},{label:"المصادر",value:Object.keys(d.sources??{}).length,color:"#8b5cf6"}].map(({label,value,color})=>(
            <div key={label} className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5 text-center"><p className="text-[18px] font-black" style={{color}}>{String(value)}</p><p className="text-[8px] text-slate-500 font-mono">{label}</p></div>
          ))}
        </div>
        {d.breaches?.length>0 && <div className="space-y-1.5"><p className="text-[8px] font-mono text-red-400 uppercase">التسريبات</p>{d.breaches.slice(0,5).map((b:any,i:number)=><div key={i} className="bg-red-500/5 border border-red-500/20 rounded p-2"><div className="flex justify-between"><span className="text-[9px] font-bold text-white">{b.name||b.source||"تسريب مجهول"}</span><span className="text-[8px] text-red-400 font-mono">{b.breachDate?new Date(b.breachDate).getFullYear():"—"}</span></div>{b.dataClasses?.length>0&&<div className="flex flex-wrap gap-1 mt-1">{b.dataClasses.map((dc:string)=><span key={dc} className="text-[7px] px-1 py-0.5 rounded bg-red-500/15 text-red-300 font-mono">{dc}</span>)}</div>}</div>)}</div>}
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Network ─────────────────────────────────────────────────────────────
function NetworkTab() {
  const [ip, setIp] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!ip.trim()){toast({title:"أدخل عنوان IP"});return;} setLoading(true); setResult(null); try { setResult(await get(`/ip/${encodeURIComponent(ip)}`)); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Network} label="استخبارات IP / الشبكة" color="#e21227" />
      <div className="grid grid-cols-2 gap-1.5">{["Shodan","Censys","BinaryEdge","GreyNoise","Onyphe","VirusTotal"].map(s=><div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded text-[9px] font-mono text-slate-500"><StatusDot ok={false}/>{s}</div>)}</div>
      <Field label="عنوان IP" value={ip} onChange={setIp} placeholder="1.2.3.4 أو 2001:db8::1" />
      <RunBtn onClick={run} loading={loading} color="#e21227" label="تحليل عنوان IP" />
      {loading && <Spinner />}
      {d && <>
        {d.location && <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-3"><p className="text-[8px] text-slate-500 font-mono uppercase mb-2">الموقع الجغرافي</p><div className="grid grid-cols-2 gap-1 text-[9px]">{[["المدينة",d.location.city],["الدولة",d.location.country],["ASN",d.network?.asn],["المشغل",d.network?.isp]].map(([k,v])=>v&&<div key={k as string} className="flex justify-between"><span className="text-slate-600">{k}</span><span className="text-slate-300">{String(v)}</span></div>)}</div></div>}
        {d.openPorts?.length>0 && <div><p className="text-[8px] font-mono text-red-400 uppercase mb-1.5">المنافذ المفتوحة ({d.openPorts.length})</p><div className="flex flex-wrap gap-1.5">{d.openPorts.slice(0,20).map((p:number)=><span key={p} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300">{p}</span>)}</div></div>}
        {d.vulnerabilities?.length>0 && <div><p className="text-[8px] font-mono text-orange-400 uppercase mb-1.5">الثغرات ({d.vulnerabilities.length})</p>{d.vulnerabilities.slice(0,3).map((v:any,i:number)=><div key={i} className="bg-orange-500/5 border border-orange-500/20 rounded p-2 mb-1"><div className="flex items-center gap-2"><span className="text-[9px] font-bold text-orange-300">{v.cve||v.id}</span><RiskBadge level={v.severity||"unknown"}/></div><p className="text-[8px] text-slate-500 mt-0.5">{v.title||v.description}</p></div>)}</div>}
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Domain ──────────────────────────────────────────────────────────────
function DomainTab() {
  const [domain, setDomain] = useState(""); const [mode, setMode] = useState<"info"|"whois"|"dns"|"subdomains"|"ssl">("info"); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!domain.trim()){toast({title:"أدخل النطاق"});return;} setLoading(true); setResult(null);
    try {
      const ep = mode==="info" ? `/domain/${encodeURIComponent(domain)}` : `/domain/${encodeURIComponent(domain)}/${mode}`;
      setResult(await get(ep));
    } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  const modes = [{id:"info",label:"معلومات"},{id:"whois",label:"WHOIS"},{id:"dns",label:"DNS"},{id:"subdomains",label:"نطاقات فرعية"},{id:"ssl",label:"SSL"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Globe} label="استخبارات النطاق" color="#10b981" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#10b98118":"transparent",color:mode===m.id?"#34d399":"#475569",border:mode===m.id?"1px solid #10b98135":"1px solid transparent"}}>{m.label}</button>)}
      </div>
      <Field label="النطاق" value={domain} onChange={setDomain} placeholder="example.com" />
      <RunBtn onClick={run} loading={loading} color="#10b981" label={`تحليل ${modes.find(m=>m.id===mode)?.label||""}`} />
      {loading && <Spinner />}
      {d && <><OkBox msg={`تم تحليل: ${domain}`} /><JsonDisplay data={d} /></>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Dark Web ─────────────────────────────────────────────────────────────
function DarkWebTab() {
  const [mode, setMode] = useState<"search"|"scrape"|"telegram"|"paste">("search");
  const [q, setQ] = useState(""); const [url, setUrl] = useState(""); const [channel, setChannel] = useState(""); const [keywords, setKeywords] = useState(""); const [scrapeType, setScrapeType] = useState("tor"); const [sources, setSources] = useState(["tor","telegram","paste"]);
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const toggleSrc = (s:string) => setSources(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s]);
  const run = async () => { setLoading(true); setResult(null); try {
    if(mode==="search"){if(!q.trim()){toast({title:"أدخل الاستعلام"});setLoading(false);return;} setResult(await post("/darkweb/search",{query:q,sources,options:{keywords:keywords.split(",").map(k=>k.trim()).filter(Boolean)}}));}
    else if(mode==="scrape"){if(!url.trim()){toast({title:"أدخل الرابط"});setLoading(false);return;} setResult(await post("/darkweb/scrape",{url,type:scrapeType}));}
    else if(mode==="telegram"){if(!channel.trim()){toast({title:"أدخل القناة"});setLoading(false);return;} setResult(await post("/darkweb/monitor/telegram",{channel,keywords:keywords.split(",").map(k=>k.trim()).filter(Boolean)}));}
    else{if(!keywords.trim()){toast({title:"أدخل الكلمات"});setLoading(false);return;} setResult(await post("/darkweb/monitor/paste",{keywords:keywords.split(",").map(k=>k.trim())}));}
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const modes = [{id:"search",label:"بحث Tor"},{id:"scrape",label:"استخراج"},{id:"telegram",label:"تيليغرام"},{id:"paste",label:"Paste Sites"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Eye} label="استخبارات الويب المظلم — Tor / I2P / Telegram" color="#8b5cf6" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">
        {modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#8b5cf618":"transparent",color:mode===m.id?"#a78bfa":"#475569",border:mode===m.id?"1px solid #8b5cf635":"1px solid transparent"}}>{m.label}</button>)}
      </div>
      {mode==="search"&&<><Field label="الاستعلام" value={q} onChange={setQ} placeholder="threat actor / keyword / email / domain..." /><div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">مصادر</p><div className="flex gap-1.5">{["tor","i2p","telegram","paste","darkweb"].map(s=><Chip key={s} label={s} active={sources.includes(s)} color="#8b5cf6" onClick={()=>toggleSrc(s)} />)}</div></div><Field label="كلمات مفتاحية (اختياري)" value={keywords} onChange={setKeywords} placeholder="ransomware, credentials, breach..." /></>}
      {mode==="scrape"&&<><Field label="الرابط" value={url} onChange={setUrl} placeholder="http://example.onion" /><div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">الشبكة</p><div className="flex gap-1.5">{["tor","i2p","freenet","zeronet"].map(t=><Chip key={t} label={t} active={scrapeType===t} color="#8b5cf6" onClick={()=>setScrapeType(t)} />)}</div></div></>}
      {mode==="telegram"&&<><Field label="القناة / المجموعة" value={channel} onChange={setChannel} placeholder="@channel أو t.me/channel" /><Field label="كلمات مفتاحية" value={keywords} onChange={setKeywords} placeholder="hack, leak, exploit..." /></>}
      {mode==="paste"&&<><Field label="كلمات مفتاحية" value={keywords} onChange={setKeywords} placeholder="email@domain.com, credentials, breach..." /><p className="text-[8px] text-slate-500">يراقب: Pastebin · Ghostbin · Rentry · Hastebin · PasteBin.pl</p></>}
      <RunBtn onClick={run} loading={loading} color="#8b5cf6" label={mode==="search"?"بحث في الويب المظلم":mode==="scrape"?"استخراج المحتوى":mode==="telegram"?"مراقبة القناة":"مراقبة Paste Sites"} />
      {loading && <Spinner />}
      {result?.success && <><OkBox msg={`تم — ${(result.data as any)?.total??""} نتيجة`} /><JsonDisplay data={result.data} /></>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Blockchain ──────────────────────────────────────────────────────────
function BlockchainTab() {
  const [mode, setMode] = useState<"address"|"trace"|"tx"|"monitor">("address");
  const [address, setAddress] = useState(""); const [txHash, setTxHash] = useState(""); const [chain, setChain] = useState("bitcoin"); const [depth, setDepth] = useState("3"); const [addrs, setAddrs] = useState("");
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { setLoading(true); setResult(null); try {
    if(mode==="address"){if(!address.trim()){toast({title:"أدخل العنوان"});setLoading(false);return;} setResult(await get(`/blockchain/${encodeURIComponent(address)}?chain=${chain}`));}
    else if(mode==="trace"){if(!address.trim()){toast({title:"أدخل العنوان"});setLoading(false);return;} setResult(await post("/blockchain/trace",{sourceAddress:address,depth:parseInt(depth)}));}
    else if(mode==="tx"){if(!txHash.trim()){toast({title:"أدخل الهاش"});setLoading(false);return;} setResult(await get(`/blockchain/tx/${encodeURIComponent(txHash)}?chain=${chain}`));}
    else{const al=addrs.split(",").map(a=>a.trim()).filter(Boolean);if(!al.length){toast({title:"أدخل العناوين"});setLoading(false);return;} setResult(await post("/blockchain/monitor",{addresses:al}));}
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const modes = [{id:"address",label:"تحليل عنوان"},{id:"trace",label:"تتبع الأموال"},{id:"tx",label:"معاملة"},{id:"monitor",label:"مراقبة"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Bitcoin} label="استخبارات البلوك تشين والعملات الرقمية" color="#f59e0b" />
      <div className="grid grid-cols-2 gap-1.5">{["Chainalysis","Elliptic","CipherTrace","TRM Labs","Crystal","AnChain.AI"].map(s=><div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded text-[8px] font-mono text-slate-500"><StatusDot ok={false}/>{s}</div>)}</div>
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">{modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#f59e0b18":"transparent",color:mode===m.id?"#fbbf24":"#475569",border:mode===m.id?"1px solid #f59e0b35":"1px solid transparent"}}>{m.label}</button>)}</div>
      <div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">السلسلة</p><div className="flex gap-1.5">{["bitcoin","ethereum","monero","litecoin","ripple"].map(c=><Chip key={c} label={c} active={chain===c} color="#f59e0b" onClick={()=>setChain(c)} />)}</div></div>
      {(mode==="address"||mode==="trace")&&<Field label="عنوان المحفظة" value={address} onChange={setAddress} placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf..." />}
      {mode==="tx"&&<Field label="هاش المعاملة" value={txHash} onChange={setTxHash} placeholder="a1075db55d416d3ca199f55b6084e211..." />}
      {mode==="trace"&&<Field label="عمق التتبع (1-10)" value={depth} onChange={setDepth} placeholder="3" type="number" />}
      {mode==="monitor"&&<Field label="عناوين (مفصولة بفاصلة)" value={addrs} onChange={setAddrs} placeholder="addr1,addr2..." />}
      <RunBtn onClick={run} loading={loading} color="#f59e0b" label="تحليل البلوك تشين" />
      {loading && <Spinner />}
      {result?.success && (result.data as any)?.riskScore!==undefined && <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between"><span className="text-[10px] font-bold text-amber-300">درجة المخاطرة</span><span className="text-[20px] font-black text-amber-400">{(result.data as any).riskScore}</span></div>}
      {result?.success && <JsonDisplay data={result.data} />}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Threat Intel ─────────────────────────────────────────────────────────
function ThreatTab() {
  const [mode, setMode] = useState<"ioc"|"actor"|"classify"|"alert">("ioc");
  const [ioc, setIoc] = useState(""); const [iocType, setIocType] = useState("ip"); const [actor, setActor] = useState(""); const [desc, setDesc] = useState(""); const [alertName, setAlertName] = useState(""); const [alertQ, setAlertQ] = useState(""); const [severity, setSeverity] = useState("high");
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { setLoading(true); setResult(null); try {
    if(mode==="ioc"){if(!ioc.trim()){toast({title:"أدخل مؤشر الاختراق"});setLoading(false);return;} setResult(await get(`/threat/ioc/${encodeURIComponent(ioc)}?type=${iocType}`));}
    else if(mode==="actor"){if(!actor.trim()){toast({title:"أدخل اسم الجهة"});setLoading(false);return;} setResult(await get(`/threat/actor/${encodeURIComponent(actor)}`));}
    else if(mode==="classify"){if(!desc.trim()){toast({title:"أدخل الوصف"});setLoading(false);return;} setResult(await post("/threat/classify",{description:desc}));}
    else{if(!alertName.trim()){toast({title:"أدخل اسم التنبيه"});setLoading(false);return;} setResult(await post("/threat/alert",{name:alertName,query:alertQ,severity,notify:true}));}
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const modes = [{id:"ioc",label:"تحليل IOC"},{id:"actor",label:"جهة التهديد"},{id:"classify",label:"تصنيف AI"},{id:"alert",label:"إنشاء تنبيه"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={ShieldAlert} label="استخبارات التهديدات — Threat Intelligence" color="#e21227" />
      <div className="grid grid-cols-2 gap-1.5">{["Recorded Future","Anomali ThreatStream","Flashpoint","Kela","AlienVault OTX","MISP"].map(s=><div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded text-[8px] font-mono text-slate-500"><StatusDot ok={false}/>{s}</div>)}</div>
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">{modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#e2122718":"transparent",color:mode===m.id?"#f87171":"#475569",border:mode===m.id?"1px solid #e2122735":"1px solid transparent"}}>{m.label}</button>)}</div>
      {mode==="ioc"&&<><div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">نوع المؤشر</p><div className="flex flex-wrap gap-1.5">{["ip","domain","url","hash","email","mutex","registry"].map(t=><Chip key={t} label={t} active={iocType===t} color="#e21227" onClick={()=>setIocType(t)} />)}</div></div><Field label="مؤشر الاختراق (IOC)" value={ioc} onChange={setIoc} placeholder="IP / domain / hash / URL..." /></>}
      {mode==="actor"&&<Field label="اسم جهة التهديد" value={actor} onChange={setActor} placeholder="APT28, Lazarus Group, REvil, LockBit..." />}
      {mode==="classify"&&<Field label="وصف التهديد" value={desc} onChange={setDesc} placeholder="صف الحادثة الأمنية للتصنيف الذكي..." multiline rows={4} />}
      {mode==="alert"&&<><Field label="اسم التنبيه" value={alertName} onChange={setAlertName} placeholder="Ransomware Alert Q1 2025" /><Field label="استعلام البحث" value={alertQ} onChange={setAlertQ} placeholder="ransomware OR darkweb leak" /><div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">الخطورة</p><div className="flex gap-1.5">{["critical","high","medium","low"].map(s=><Chip key={s} label={s} active={severity===s} color={RISK_COLORS[s]} onClick={()=>setSeverity(s)} />)}</div></div></>}
      <RunBtn onClick={run} loading={loading} color="#e21227" label="تحليل التهديد" />
      {loading && <Spinner />}
      {result?.success && <><OkBox msg="تم التحليل بنجاح" /><JsonDisplay data={result.data} /></>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Graph ───────────────────────────────────────────────────────────────
function GraphTab() {
  const [mode, setMode] = useState<"correlate"|"paths"|"query">("correlate");
  const [val, setVal] = useState(""); const [cType, setCType] = useState("email"); const [src, setSrc] = useState(""); const [tgt, setTgt] = useState(""); const [depth, setDepth] = useState("4"); const [cypher, setCypher] = useState("MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 25");
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { setLoading(true); setResult(null); try {
    if(mode==="correlate"){if(!val.trim()){toast({title:"أدخل القيمة"});setLoading(false);return;} setResult(await get(`/graph/correlate/${cType}/${encodeURIComponent(val)}`));}
    else if(mode==="paths") setResult(await post("/graph/paths",{sourceId:src,targetId:tgt,maxDepth:parseInt(depth)}));
    else setResult(await post("/graph/query",{cypher,parameters:{}}));
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const modes = [{id:"correlate",label:"ربط البيانات"},{id:"paths",label:"مسارات العلاقة"},{id:"query",label:"Cypher Query"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={GitBranch} label="تحليل الرسم البياني — Neo4j Graph DB" color="#06b6d4" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">{modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#06b6d418":"transparent",color:mode===m.id?"#22d3ee":"#475569",border:mode===m.id?"1px solid #06b6d435":"1px solid transparent"}}>{m.label}</button>)}</div>
      {mode==="correlate"&&<><div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">نوع الكيان</p><div className="flex gap-1.5">{["email","ip","domain"].map(t=><Chip key={t} label={t} active={cType===t} color="#06b6d4" onClick={()=>setCType(t)} />)}</div></div><Field label="القيمة" value={val} onChange={setVal} placeholder="email@example.com / 1.2.3.4 / domain.com" /></>}
      {mode==="paths"&&<><Field label="معرف العقدة المصدر" value={src} onChange={setSrc} placeholder="node-id-1" /><Field label="معرف العقدة الهدف" value={tgt} onChange={setTgt} placeholder="node-id-2" /><Field label="أقصى عمق" value={depth} onChange={setDepth} placeholder="4" type="number" /></>}
      {mode==="query"&&<><Field label="استعلام Cypher" value={cypher} onChange={setCypher} placeholder="MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 25" multiline rows={3} /><p className="text-[7px] text-slate-600">DELETE/DROP/REMOVE محظورة</p></>}
      <RunBtn onClick={run} loading={loading} color="#06b6d4" label="تنفيذ التحليل" />
      {loading && <Spinner />}
      {result?.success && (result.data as any)?.nodes && <div className="grid grid-cols-2 gap-2"><div className="bg-black/30 border border-[#1a1a2e] rounded p-2 text-center"><p className="text-[16px] font-black text-cyan-400">{(result.data as any).nodes?.length??0}</p><p className="text-[7px] text-slate-500">عقدة</p></div><div className="bg-black/30 border border-[#1a1a2e] rounded p-2 text-center"><p className="text-[16px] font-black text-cyan-400">{(result.data as any).relationships?.length??0}</p><p className="text-[7px] text-slate-500">علاقة</p></div></div>}
      {result?.success && <JsonDisplay data={result.data} />}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: AI Analysis ──────────────────────────────────────────────────────────
function AITab() {
  const [mode, setMode] = useState<"analyze"|"report"|"query"|"predict">("analyze");
  const [input, setInput] = useState(""); const [template, setTemplate] = useState("standard");
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!input.trim()){toast({title:"أدخل البيانات"});return;} setLoading(true); setResult(null); try {
    if(mode==="analyze") setResult(await post("/ai/analyze",{data:input}));
    else if(mode==="report") setResult(await post("/ai/report",{data:input,template}));
    else if(mode==="query") setResult(await post("/ai/query",{query:input}));
    else setResult(await post("/ai/predict",{historicalData:input}));
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const modes = [{id:"analyze",label:"تحليل الأنماط"},{id:"report",label:"توليد تقرير"},{id:"query",label:"استعلام طبيعي"},{id:"predict",label:"توقع تهديدات"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Brain} label="تحليل الذكاء الاصطناعي — AI Correlation Engine" color="#a78bfa" />
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg border border-[#1a1a2e]">{modes.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className="flex-1 py-1.5 rounded-md text-[8px] font-bold font-mono transition-all" style={{background:mode===m.id?"#a78bfa18":"transparent",color:mode===m.id?"#c4b5fd":"#475569",border:mode===m.id?"1px solid #a78bfa35":"1px solid transparent"}}>{m.label}</button>)}</div>
      {mode==="report"&&<div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">القالب</p><div className="flex gap-1.5">{["standard","executive","technical","incident"].map(t=><Chip key={t} label={t} active={template===t} color="#a78bfa" onClick={()=>setTemplate(t)} />)}</div></div>}
      <Field label={mode==="query"?"الاستعلام بالغة الطبيعية":mode==="predict"?"البيانات التاريخية (JSON)":"البيانات للتحليل"} value={input} onChange={setInput} placeholder={mode==="query"?"ما هي أحدث APT في المنطقة العربية؟":mode==="predict"?"[{\"date\":\"2025-01-01\",\"events\":[...]}]":"JSON data or text..."} multiline rows={4} />
      <RunBtn onClick={run} loading={loading} color="#a78bfa" label={mode==="analyze"?"تحليل البيانات":mode==="report"?"توليد التقرير":mode==="query"?"معالجة الاستعلام":"توقع التهديدات"} />
      {loading && <Spinner />}
      {result?.success && typeof (result.data as any)?.report==="string" ? <div className="bg-black/30 border border-[#a78bfa]/20 rounded-lg p-3"><p className="text-[10px] text-slate-300 whitespace-pre-wrap">{(result.data as any).report}</p></div> : result?.success && <JsonDisplay data={result.data} />}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Monitoring ──────────────────────────────────────────────────────────
function MonitoringTab() {
  const feeds = [
    {label:"Dark Web Forums",color:"#8b5cf6",active:false,list:["RaidForums","BreachForums","XSS.is","Exploit.in"]},
    {label:"Ransomware Leak Sites",color:"#e21227",active:true,list:["LockBit","ALPHV/BlackCat","Cl0p","Play","Akira","RansomHub"]},
    {label:"Paste Sites",color:"#f97316",active:true,list:["Pastebin","Ghostbin","Rentry","Hastebin","ZeroJour.se"]},
    {label:"Telegram Channels",color:"#3b82f6",active:false,list:["Dark Web Intel","Leak Channels","Hacker Groups","OSINT Feeds"]},
    {label:"Social Media OSINT",color:"#10b981",active:false,list:["Twitter/X","Reddit","GitHub","LinkedIn","Mastodon"]},
    {label:"Threat Intelligence Feeds",color:"#06b6d4",active:true,list:["AlienVault OTX","MISP","Abuse.ch","MalwareBazaar","Feodo Tracker"]},
    {label:"CVE / Vulnerability Feeds",color:"#f59e0b",active:true,list:["NVD","CISA KEV","Exploit-DB","VulDB","Packet Storm"]},
    {label:"Stealer Logs Markets",color:"#ec4899",active:false,list:["Genesis Market","Russian Market","2easy","IntelBroker"]},
  ];
  const [statuses, setStatuses] = useState(feeds.map(f=>f.active));
  const alerts = [
    {text:"تسريب جديد في BreachForums — 2.3M سجل بيانات بنكية",color:"#e21227",time:"قبل دقيقتين"},
    {text:"ضحية جديدة لـ LockBit — قطاع الرعاية الصحية (دولة الخليج)",color:"#f97316",time:"قبل 15 دقيقة"},
    {text:"IOC جديد في AlienVault OTX — APT34 Campaign",color:"#f59e0b",time:"قبل ساعة"},
    {text:"CVE-2025-0001 استغلال نشط — تصحيح عاجل",color:"#8b5cf6",time:"قبل 3 ساعات"},
    {text:"ظهور بيانات اعتماد شركة كبرى في Stealer Logs",color:"#ec4899",time:"قبل 6 ساعات"},
  ];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Radio} label="المراقبة الفورية المستمرة — Real-time Monitoring" color="#22c55e" />
      <div className="grid grid-cols-1 gap-2">
        {feeds.map((f,i)=>(
          <div key={f.label} className="flex items-start justify-between p-2.5 bg-black/30 border border-[#1a1a2e] rounded-lg gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full" style={{background:statuses[i]?f.color:"#374151"}}/><span className="text-[9px] font-bold" style={{color:statuses[i]?f.color:"#475569"}}>{f.label}</span><span className="text-[7px] font-mono px-1.5 py-0.5 rounded border" style={{color:statuses[i]?f.color:"#374151",borderColor:statuses[i]?`${f.color}40`:"#1a1a2e",background:statuses[i]?`${f.color}15`:"transparent"}}>{statuses[i]?"نشط":"متوقف"}</span></div>
              <div className="flex flex-wrap gap-1">{f.list.map(s=><span key={s} className="text-[7px] font-mono text-slate-600 px-1 py-0.5 rounded bg-black/30 border border-[#1a1a2e]">{s}</span>)}</div>
            </div>
            <button onClick={()=>setStatuses(p=>p.map((s,j)=>j===i?!s:s))} className="shrink-0 w-10 h-5 rounded-full relative transition-all" style={{background:statuses[i]?f.color:"#1e293b"}}>
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{left:statuses[i]?"calc(100% - 18px)":"2px"}}/>
            </button>
          </div>
        ))}
      </div>
      <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-3">
        <p className="text-[8px] font-mono text-slate-500 uppercase mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>آخر التنبيهات الحية</p>
        <div className="space-y-1.5">{alerts.map((a,i)=><div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded border border-[#1a1a2e] bg-black/20"><span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{background:a.color}}/><div><p className="text-[9px] text-slate-400">{a.text}</p><p className="text-[7px] text-slate-600 font-mono">{a.time}</p></div></div>)}</div>
      </div>
    </div>
  );
}

// ── TAB: Telecom ──────────────────────────────────────────────────────────────
function TelecomTab() {
  const [phone, setPhone] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!phone.trim()){toast({title:"أدخل رقم الهاتف"});return;} setLoading(true); setResult(null); try { setResult(await post("/search",{query:phone,types:["email"],enrichment:true})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const tools = [{label:"Truecaller",desc:"البحث بالاسم وعكس رقم الهاتف"},{label:"NumVerify",desc:"التحقق من الرقم والمشغل"},{label:"SS7 Intelligence",desc:"تحديد الموقع عبر شبكة SS7"},{label:"IMSI Catcher",desc:"استهداف IMSI/IMEI"},{label:"Cellebrite",desc:"استخراج البيانات الجنائية"},{label:"HLR Lookup",desc:"فحص مستوى التوجيه المنزلي"},{label:"TextMagic",desc:"تتبع حالة الرسائل النصية"},{label:"PhoneInfoga",desc:"جمع معلومات مفتوحة عبر الرقم"}];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Phone} label="استخبارات الاتصالات — Telecom OSINT" color="#06b6d4" />
      <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="+966501234567" />
      <div className="grid grid-cols-2 gap-2">{tools.map(t=><div key={t.label} className="p-2.5 bg-black/30 border border-[#1a1a2e] rounded-lg"><p className="text-[9px] font-bold text-cyan-400/80">{t.label}</p><p className="text-[8px] text-slate-600 mt-0.5">{t.desc}</p></div>)}</div>
      <RunBtn onClick={run} loading={loading} color="#06b6d4" label="تحليل رقم الهاتف" />
      {loading && <Spinner />}
      {result?.success && <JsonDisplay data={result.data} />}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Network Scan ─────────────────────────────────────────────────────────
function NetScanTab() {
  const [target, setTarget] = useState<"scada"|"webcams"|"databases"|"rdp"|"iot"|"monitor">("scada");
  const [monQ, setMonQ] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { setLoading(true); setResult(null); try {
    if(target==="monitor"){if(!monQ.trim()){toast({title:"أدخل الاستعلام"});setLoading(false);return;} setResult(await post("/network/monitor",{query:monQ}));} else setResult(await get(`/network/${target}`));
  } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const targets = [{id:"scada",label:"ICS/SCADA",desc:"أنظمة التحكم الصناعي"},{id:"webcams",label:"كاميرات",desc:"كاميرات المراقبة"},{id:"databases",label:"قواعد بيانات",desc:"DB مكشوفة"},{id:"rdp",label:"RDP",desc:"خوادم البعيد"},{id:"iot",label:"IoT",desc:"أجهزة الأشياء"},{id:"monitor",label:"مخصص",desc:"Shodan Query مخصص"}] as const;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Radar} label="مسح الشبكة — Shodan Enterprise Scanning" color="#ec4899" />
      <div className="grid grid-cols-3 gap-2">{targets.map(({id,label,desc})=><button key={id} onClick={()=>setTarget(id)} className="flex flex-col items-start p-2.5 rounded-lg border transition-all text-left" style={{background:target===id?"#ec489918":"black",borderColor:target===id?"#ec489960":"#1a1a2e",color:target===id?"#f472b6":"#475569"}}><p className="text-[9px] font-bold">{label}</p><p className="text-[7px] opacity-70 mt-0.5">{desc}</p></button>)}</div>
      {target==="monitor"&&<Field label="استعلام Shodan" value={monQ} onChange={setMonQ} placeholder='port:3389 country:SA os:"Windows Server 2019"' />}
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"><AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"/><p className="text-[9px] text-amber-300">لأغراض الأمن الدفاعي والتقييم الأمني المرخص فقط</p></div>
      <RunBtn onClick={run} loading={loading} color="#ec4899" label="تنفيذ المسح" />
      {loading && <Spinner />}
      {result?.success && (result.data as any)?.total!==undefined && <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3 text-center"><p className="text-[22px] font-black text-pink-400">{(result.data as any).total}</p><p className="text-[8px] text-slate-500">إجمالي الأنظمة المكتشفة</p></div>}
      {result?.success && <JsonDisplay data={result.data} />}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Username Intel ───────────────────────────────────────────────────────
function UsernameTab() {
  const [username, setUsername] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!username.trim()){toast({title:"أدخل اسم المستخدم"});return;} setLoading(true); setResult(null); try { setResult(await get(`/username/${encodeURIComponent(username)}`)); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  const catColors: Record<string,string> = {social:"#3b82f6",developer:"#10b981",messaging:"#06b6d4",gaming:"#8b5cf6",professional:"#f59e0b",creative:"#ec4899",hacker:"#e21227",content:"#f97316"};
  return (
    <div className="space-y-4">
      <SectionTitle icon={User} label="استخبارات اسم المستخدم — Username OSINT" color="#f97316" />
      <p className="text-[9px] text-slate-500">البحث عن اسم المستخدم عبر 400+ منصة (Sherlock-style) مع تحليل IntelX</p>
      <Field label="اسم المستخدم / Handle" value={username} onChange={setUsername} placeholder="username123" />
      <RunBtn onClick={run} loading={loading} color="#f97316" label="بحث عن اسم المستخدم" />
      {loading && <Spinner />}
      {d && <>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 border border-[#1a1a2e] rounded p-2.5 text-center"><p className="text-[18px] font-black text-orange-400">{d.platforms?.length||0}</p><p className="text-[8px] text-slate-500">منصة مفحوصة</p></div>
          <div className="bg-black/30 border border-[#1a1a2e] rounded p-2.5 text-center"><p className="text-[18px] font-black" style={{color:d.riskScore>20?"#e21227":"#10b981"}}>{d.riskScore||0}</p><p className="text-[8px] text-slate-500">نقاط الخطر</p></div>
        </div>
        {d.platforms?.length>0 && <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">روابط المنصات المتوقعة</p><div className="grid grid-cols-2 gap-1.5">{d.platforms.map((p:any)=><a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded hover:border-orange-500/40 transition-all group"><span className="w-2 h-2 rounded-full shrink-0" style={{background:catColors[p.category]||"#64748b"}}/><span className="text-[8px] font-mono text-slate-400 group-hover:text-orange-400 flex-1 truncate">{p.name}</span><ExternalLink className="w-2.5 h-2.5 text-slate-700 group-hover:text-orange-400 shrink-0"/></a>)}</div></div>}
        {d.darkweb?.length>0 && <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3"><p className="text-[9px] text-red-400 font-mono mb-1">وجد في الويب المظلم: {d.darkweb.length} إشارة</p></div>}
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Hash Analysis ────────────────────────────────────────────────────────
function HashTab() {
  const [hash, setHash] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const detectType = (h:string) => { const l=h.length; if(l===32)return"MD5"; if(l===40)return"SHA1"; if(l===64)return"SHA256"; if(l===128)return"SHA512"; return"unknown"; };
  const run = async () => { if(!hash.trim()){toast({title:"أدخل الهاش"});return;} setLoading(true); setResult(null); try { setResult(await post("/hash/analyze",{hash,hashType:detectType(hash)})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Hash} label="تحليل الهاش وتحديد البرمجيات الخبيثة" color="#f59e0b" />
      <div className="grid grid-cols-2 gap-1.5">{["VirusTotal","HybridAnalysis","ANY.RUN","MalwareBazaar","Abuse.ch","Joe Sandbox"].map(s=><div key={s} className="flex items-center gap-1.5 px-2 py-1 bg-black/20 border border-[#1a1a2e] rounded text-[8px] font-mono text-slate-500"><StatusDot ok={false}/>{s}</div>)}</div>
      <Field label="الهاش (MD5 / SHA1 / SHA256 / SHA512)" value={hash} onChange={setHash} placeholder="d41d8cd98f00b204e9800998ecf8427e" />
      {hash && <p className="text-[8px] font-mono text-slate-500">نوع الهاش المكتشف: <span className="text-amber-400">{detectType(hash)}</span> ({hash.length} حرف)</p>}
      <RunBtn onClick={run} loading={loading} color="#f59e0b" label="تحليل الهاش" />
      {loading && <Spinner />}
      {d && <>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/30 border border-[#1a1a2e] rounded p-2.5 text-center"><p className="text-[13px] font-black" style={{color:d.malicious?"#e21227":"#10b981"}}>{d.malicious?"خطير":"نظيف"}</p><p className="text-[7px] text-slate-500">الحكم</p></div>
          <div className="bg-black/30 border border-[#1a1a2e] rounded p-2.5 text-center"><p className="text-[16px] font-black text-amber-400">{d.confidence||0}%</p><p className="text-[7px] text-slate-500">الثقة</p></div>
          <div className="bg-black/30 border border-[#1a1a2e] rounded p-2.5 text-center"><p className="text-[14px] font-black text-cyan-400">{d.type||"?"}</p><p className="text-[7px] text-slate-500">النوع</p></div>
        </div>
        {d.malwareFamily && <div className="bg-red-500/5 border border-red-500/20 rounded p-2.5"><p className="text-[8px] text-slate-500 font-mono">عائلة البرمجية الخبيثة</p><p className="text-[11px] font-bold text-red-300">{d.malwareFamily}</p></div>}
        <div className="space-y-1.5">
          {[{label:"VirusTotal",url:d.virusTotalUrl,color:"#3b82f6"},{label:"Hybrid Analysis",url:d.hybridAnalysisUrl,color:"#f97316"},{label:"ANY.RUN",url:d.anyRunUrl,color:"#10b981"}].map(({label,url,color})=><a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded hover:border-white/20 transition-all" style={{color}}><ExternalLink className="w-3.5 h-3.5 shrink-0"/><span className="text-[9px] font-bold font-mono">فحص في {label}</span></a>)}
        </div>
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: SIGINT ───────────────────────────────────────────────────────────────
function SigintTab() {
  const [q, setQ] = useState(""); const [freq, setFreq] = useState(""); const [protocol, setProtocol] = useState(""); const [region, setRegion] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!q.trim()){toast({title:"أدخل استعلام البحث"});return;} setLoading(true); setResult(null); try { setResult(await post("/sigint/search",{query:q,frequency:freq,protocol,region})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const resources = [{label:"SigIDWiki",url:"https://www.sigidwiki.com",desc:"قاموس تعريف الإشارات"},{label:"GlobalTuners",url:"https://www.globaltuners.com",desc:"مستقبلات عالمية عبر الإنترنت"},{label:"WebSDR",url:"http://websdr.org",desc:"راديو محدد البرمجيات"},{label:"RadioReference",url:"https://www.radioreference.com",desc:"مرجع ترددات الراديو"},{label:"OpenCellID",url:"https://opencellid.org",desc:"قاعدة بيانات الخلايا المفتوحة"},{label:"OSINT Wigle",url:"https://wigle.net",desc:"قاعدة بيانات شبكات WiFi"}];
  const protocols = ["APRS","AIS","ADS-B","ACARS","DMR","P25","TETRA","GSM","LTE","Satellite"];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Signal} label="استخبارات الإشارات — SIGINT / RF Intelligence" color="#22c55e" />
      <p className="text-[9px] text-slate-500">جمع وتحليل الإشارات الراديوية والاتصالات السلكية واللاسلكية</p>
      <Field label="الاستعلام" value={q} onChange={setQ} placeholder="keyword / callsign / MMSI / ICAO / frequency..." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="التردد (MHz)" value={freq} onChange={setFreq} placeholder="162.400" />
        <Field label="المنطقة الجغرافية" value={region} onChange={setRegion} placeholder="SA / AE / UAE..." />
      </div>
      <div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">البروتوكول</p><div className="flex flex-wrap gap-1.5">{protocols.map(p=><Chip key={p} label={p} active={protocol===p} color="#22c55e" onClick={()=>setProtocol(prev=>prev===p?"":p)} />)}</div></div>
      <RunBtn onClick={run} loading={loading} color="#22c55e" label="بحث SIGINT" />
      {loading && <Spinner />}
      {result?.success && <><OkBox msg={`تم — ${(result.data as any)?.signals?.length||0} إشارة`}/><JsonDisplay data={result.data} /></>}
      {result && !result.success && <ErrBox msg={result.error!} />}
      <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">موارد SIGINT المفتوحة</p><div className="grid grid-cols-2 gap-1.5">{resources.map(r=><a key={r.label} href={r.url} target="_blank" rel="noreferrer" className="flex flex-col p-2 bg-black/30 border border-[#1a1a2e] rounded hover:border-emerald-500/30 transition-all group"><span className="text-[8px] font-bold text-emerald-400/70 group-hover:text-emerald-400">{r.label}</span><span className="text-[7px] text-slate-600">{r.desc}</span></a>)}</div></div>
    </div>
  );
}

// ── TAB: Person OSINT ──────────────────────────────────────────────────────────
function PersonTab() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [username, setUsername] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!name&&!email&&!phone&&!username){toast({title:"أدخل أحد معطيات البحث على الأقل"});return;} setLoading(true); setResult(null); try { setResult(await post("/person/search",{name,email,phone,username})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Users} label="بحث الشخص — Person OSINT & Profiling" color="#ec4899" />
      <p className="text-[9px] text-slate-500">بناء ملف شامل عن الشخص من المصادر المفتوحة</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="John Doe / محمد أحمد" />
        <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="john@example.com" type="email" />
        <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="+1234567890" />
        <Field label="اسم المستخدم" value={username} onChange={setUsername} placeholder="johndoe123" />
      </div>
      <RunBtn onClick={run} loading={loading} color="#ec4899" label="بناء الملف الاستخباراتي" />
      {loading && <Spinner />}
      {d && <>
        {d.osintResources?.length>0 && <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">أدوات البحث في الأشخاص</p><div className="grid grid-cols-2 gap-1.5">{d.osintResources.map((r:any)=><a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded hover:border-pink-500/30 transition-all group"><ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-pink-400"/><span className="text-[8px] font-mono text-slate-400 group-hover:text-pink-400">{r.name}</span></a>)}</div></div>}
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Ransomware Tracker ────────────────────────────────────────────────────
function RansomwareTab() {
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const run = async () => { setLoading(true); setResult(null); try { setResult(await get("/ransomware/tracker")); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  const groups = [{name:"LockBit 3.0",victims:0,active:true,color:"#e21227"},{name:"ALPHV/BlackCat",victims:0,active:true,color:"#f97316"},{name:"Cl0p",victims:0,active:true,color:"#8b5cf6"},{name:"Play",victims:0,active:true,color:"#06b6d4"},{name:"Akira",victims:0,active:true,color:"#10b981"},{name:"8Base",victims:0,active:true,color:"#f59e0b"},{name:"Rhysida",victims:0,active:true,color:"#ec4899"},{name:"RansomHub",victims:0,active:true,color:"#a78bfa"},{name:"BianLian",victims:0,active:true,color:"#22c55e"},{name:"NoEscape",victims:0,active:false,color:"#64748b"},{name:"Vice Society",victims:0,active:false,color:"#64748b"},{name:"Hunters International",victims:0,active:true,color:"#e21227"}];
  return (
    <div className="space-y-4">
      <SectionTitle icon={AlertOctagon} label="تتبع مجموعات الفدية — Ransomware Tracker" color="#e21227" />
      <RunBtn onClick={run} loading={loading} color="#e21227" label="تحديث بيانات مجموعات الفدية" />
      {loading && <Spinner />}
      <div className="grid grid-cols-1 gap-1.5">
        {(d?.groups||groups).map((g:any)=>(
          <div key={g.name} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{background:g.active?g.color:"#374151"}}/>
              <span className="text-[9px] font-bold" style={{color:g.active?g.color:"#475569"}}>{g.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-mono text-slate-600">{g.victims||0} ضحية</span>
              <span className="text-[7px] px-1.5 py-0.5 rounded font-mono" style={{background:g.active?"#e2122215":"#1e293b",color:g.active?"#f87171":"#64748b",border:`1px solid ${g.active?"#e2122230":"#1a1a2e"}`}}>{g.active?"نشط":"غير نشط"}</span>
            </div>
          </div>
        ))}
      </div>
      <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">موارد تتبع الفدية</p><div className="grid grid-cols-2 gap-1.5">{[{n:"Ransomwatch",u:"https://ransomwatch.telemetry.ltd"},{n:"ID Ransomware",u:"https://id-ransomware.malwarehunterteam.com"},{n:"Ransomlook",u:"https://www.ransomlook.io"},{n:"DarkFeed",u:"https://darkfeed.io"}].map(r=><a key={r.n} href={r.u} target="_blank" rel="noreferrer" className="text-[8px] font-mono text-red-400/70 hover:text-red-400 px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded transition-all">{r.n}</a>)}</div></div>
    </div>
  );
}

// ── TAB: CVE Intelligence ──────────────────────────────────────────────────────
function CVETab() {
  const [cveId, setCveId] = useState(""); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => { if(!cveId.trim()){toast({title:"أدخل معرف CVE"});return;} const clean=cveId.trim().toUpperCase().startsWith("CVE-")?cveId.trim():`CVE-${cveId.trim()}`; setLoading(true); setResult(null); try { setResult(await get(`/cve/${encodeURIComponent(clean)}`)); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false); };
  const d = result?.success ? result.data as any : null;
  const recent = [{id:"CVE-2025-0001",score:"9.8",title:"Critical RCE in OpenSSH"},{id:"CVE-2024-12345",score:"8.5",title:"SQL Injection in popular CMS"},{id:"CVE-2024-11111",score:"7.5",title:"LPE in Windows Kernel"},{id:"CVE-2024-99999",score:"9.1",title:"Auth Bypass in VPN Product"}];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Bug} label="استخبارات الثغرات — CVE Intelligence" color="#f97316" />
      <Field label="معرف CVE" value={cveId} onChange={setCveId} placeholder="CVE-2025-0001" />
      <RunBtn onClick={run} loading={loading} color="#f97316" label="تحليل الثغرة" />
      {loading && <Spinner />}
      {d && <>
        <OkBox msg={`تم تحليل: ${d.cveId}`} />
        {d.externalLinks && <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">روابط خارجية</p><div className="grid grid-cols-2 gap-1.5">{Object.entries(d.externalLinks).map(([k,v])=><a key={k} href={v as string} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded hover:border-orange-500/30 transition-all group"><ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-orange-400"/><span className="text-[8px] font-mono text-slate-400 group-hover:text-orange-400">{k}</span></a>)}</div></div>}
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
      <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">ثغرات حديثة يُرصد استغلالها</p>{recent.map(r=><div key={r.id} onClick={()=>setCveId(r.id)} className="flex items-center gap-3 px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg mb-1.5 cursor-pointer hover:border-orange-500/30 transition-all"><span className="text-[8px] font-bold text-orange-400 font-mono w-28 shrink-0">{r.id}</span><span className="text-[9px] text-slate-400 flex-1">{r.title}</span><span className="text-[8px] font-black text-red-400">{r.score}</span></div>)}</div>
    </div>
  );
}

// ── TAB: Evidence Locker ──────────────────────────────────────────────────────
function EvidenceTab() {
  const [sessions, setSessions] = useState<any[]>([]); const [activeSession, setActiveSession] = useState<string|null>(null); const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState(""); const [newTag, setNewTag] = useState("ioc"); const [title, setTitle] = useState(""); const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    try { const r = await get("/evidence"); if(r.success) setSessions((r.data as any)?.sessions||[]); } catch{}
  }, []);

  useEffect(()=>{ loadSessions(); }, [loadSessions]);

  const addItem = () => {
    if(!newItem.trim()){toast({title:"أدخل العنصر"});return;}
    setItems(p=>[...p, {id:Date.now(),value:newItem,tag:newTag,addedAt:new Date().toISOString()}]);
    setNewItem("");
  };

  const save = async () => {
    if(!title.trim()){toast({title:"أدخل اسم الجلسة"});return;}
    setLoading(true);
    try {
      const r = await post("/evidence/save",{sessionId:activeSession||undefined,title,items});
      if(r.success) { setActiveSession((r.data as any).sessionId); await loadSessions(); toast({title:"تم حفظ الجلسة"}); }
    } catch{}
    setLoading(false);
  };

  const loadSession = async (id:string) => {
    try { const r = await get(`/evidence/${id}`); if(r.success&&(r.data as any)?.items) { setItems((r.data as any).items); setTitle((r.data as any).title); setActiveSession(id); } } catch{}
  };

  const tags = ["ioc","email","ip","domain","hash","note","screenshot","url","malware","person"];

  return (
    <div className="space-y-4">
      <SectionTitle icon={FolderOpen} label="خزينة الأدلة — Evidence Locker" color="#10b981" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          <Field label="اسم الجلسة / التحقيق" value={title} onChange={setTitle} placeholder="التحقيق في الهجوم على XYZ" />
          <div className="space-y-2">
            <p className="text-[8px] font-mono text-slate-600 uppercase">إضافة عنصر</p>
            <Field label="قيمة العنصر" value={newItem} onChange={setNewItem} placeholder="IP / email / hash / ملاحظة..." />
            <div className="flex flex-wrap gap-1">{tags.map(t=><Chip key={t} label={t} active={newTag===t} color="#10b981" onClick={()=>setNewTag(t)} />)}</div>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"><Plus className="w-3 h-3"/>إضافة عنصر</button>
          </div>
          <RunBtn onClick={save} loading={loading} color="#10b981" label="حفظ الجلسة" />
        </div>
        <div className="space-y-3">
          <p className="text-[8px] font-mono text-slate-600 uppercase">الجلسات المحفوظة ({sessions.length})</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {sessions.length===0 && <p className="text-[9px] text-slate-600 text-center py-4">لا توجد جلسات</p>}
            {sessions.map((s:any)=><button key={s.id} onClick={()=>loadSession(s.id)} className="w-full flex items-center justify-between px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded hover:border-emerald-500/30 transition-all"><span className="text-[8px] font-bold text-slate-300">{s.title||s.id}</span><span className="text-[7px] text-slate-600">{s.items?.length||0} عنصر</span></button>)}
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            <p className="text-[8px] font-mono text-slate-600 uppercase">عناصر الجلسة ({items.length})</p>
            {items.map((item:any)=><div key={item.id} className="flex items-center gap-2 px-2 py-1.5 bg-black/30 border border-[#1a1a2e] rounded"><span className="text-[7px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono border border-emerald-500/20">{item.tag}</span><span className="text-[8px] text-slate-300 flex-1 truncate">{item.value}</span><button onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))} className="text-slate-700 hover:text-red-400 transition-all"><Trash2 className="w-2.5 h-2.5"/></button></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TAB: Bulk IOC ─────────────────────────────────────────────────────────────
function BulkIOCTab() {
  const [raw, setRaw] = useState(""); const [iocType, setIocType] = useState("ip"); const [loading, setLoading] = useState(false); const [result, setResult] = useState<Result|null>(null);
  const { toast } = useToast();
  const run = async () => {
    const lines = raw.split("\n").map(l=>l.trim()).filter(Boolean);
    if(!lines.length){toast({title:"أدخل IOCs"});return;}
    if(lines.length>100){toast({title:"الحد الأقصى 100 IOC لكل طلب"});return;}
    setLoading(true); setResult(null);
    try { setResult(await post("/ioc/bulk",{iocs:lines.map(v=>({value:v,type:iocType}))})); } catch(e:any){setResult({success:false,error:e.message})} setLoading(false);
  };
  const d = result?.success ? result.data as any : null;
  return (
    <div className="space-y-4">
      <SectionTitle icon={Layers} label="تحليل IOC بالجملة — Bulk IOC Analysis" color="#8b5cf6" />
      <div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">نوع المؤشرات</p><div className="flex flex-wrap gap-1.5">{["ip","domain","url","hash","email"].map(t=><Chip key={t} label={t} active={iocType===t} color="#8b5cf6" onClick={()=>setIocType(t)} />)}</div></div>
      <Field label="IOCs (سطر لكل مؤشر، حد أقصى 100)" value={raw} onChange={setRaw} placeholder={"1.2.3.4\n192.168.1.1\nevilsite.com\n..."} multiline rows={6} />
      <div className="flex items-center gap-2 text-[8px] text-slate-500 font-mono"><Info className="w-3 h-3 shrink-0"/>الإدخال: {raw.split("\n").filter(l=>l.trim()).length} مؤشر</div>
      <RunBtn onClick={run} loading={loading} color="#8b5cf6" label="تحليل جميع المؤشرات" />
      {loading && <Spinner />}
      {d && <>
        <div className="grid grid-cols-4 gap-2">
          {[{label:"إجمالي",value:d.total,color:"#8b5cf6"},{label:"خطير",value:d.malicious,color:"#e21227"},{label:"نظيف",value:d.clean,color:"#10b981"},{label:"حرج",value:d.summary?.criticalCount||0,color:"#f97316"}].map(({label,value,color})=><div key={label} className="bg-black/30 border border-[#1a1a2e] rounded p-2 text-center"><p className="text-[14px] font-black" style={{color}}>{value}</p><p className="text-[7px] text-slate-500">{label}</p></div>)}
        </div>
        <JsonDisplay data={d} />
      </>}
      {result && !result.success && <ErrBox msg={result.error!} />}
    </div>
  );
}

// ── TAB: Investigation Timeline ──────────────────────────────────────────────
function TimelineTab() {
  const [sessionId, setSessionId] = useState(`tl-${Date.now()}`); const [events, setEvents] = useState<any[]>([]); const [evtText, setEvtText] = useState(""); const [evtType, setEvtType] = useState("ioc"); const [evtSrc, setEvtSrc] = useState(""); const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const loadTimeline = useCallback(async (sid:string) => {
    try { const r = await get(`/timeline/${sid}`); if(r.success) setEvents((r.data as any).events||[]); } catch{}
  }, []);
  const addEvent = async () => {
    if(!evtText.trim()){toast({title:"أدخل تفاصيل الحدث"});return;}
    setLoading(true);
    try {
      const r = await post("/timeline/add",{sessionId,event:{type:evtType,description:evtText,source:evtSrc,timestamp:new Date()}});
      if(r.success) { await loadTimeline(sessionId); setEvtText(""); setEvtSrc(""); }
    } catch{}
    setLoading(false);
  };
  useEffect(()=>{ loadTimeline(sessionId); },[sessionId, loadTimeline]);
  const typeColors: Record<string,string> = {ioc:"#e21227",email:"#3b82f6",network:"#06b6d4",darkweb:"#8b5cf6",blockchain:"#f59e0b",threat:"#f97316",note:"#10b981",alert:"#ec4899"};
  const evtTypes = ["ioc","email","network","darkweb","blockchain","threat","note","alert","discovery"];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Clock} label="الجدول الزمني للتحقيق — Investigation Timeline" color="#3b82f6" />
      <Field label="معرف جلسة التحقيق" value={sessionId} onChange={v=>{setSessionId(v);loadTimeline(v);}} placeholder="tl-investigation-001" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="وصف الحدث" value={evtText} onChange={setEvtText} placeholder="اكتشاف IP مشبوه على Shodan..." />
        <Field label="المصدر / الأداة" value={evtSrc} onChange={setEvtSrc} placeholder="Shodan / Email Intel / IntelX..." />
      </div>
      <div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">نوع الحدث</p><div className="flex flex-wrap gap-1.5">{evtTypes.map(t=><Chip key={t} label={t} active={evtType===t} color={typeColors[t]||"#3b82f6"} onClick={()=>setEvtType(t)} />)}</div></div>
      <button onClick={addEvent} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all disabled:opacity-50"><Plus className="w-3 h-3"/>إضافة حدث للجدول الزمني</button>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 to-transparent"/>
        <div className="space-y-3 ml-8 max-h-80 overflow-y-auto">
          {events.length===0 && <p className="text-[9px] text-slate-600 text-center py-8">لا توجد أحداث في الجدول الزمني</p>}
          {[...events].reverse().map((e:any)=>(
            <div key={e.id} className="relative">
              <div className="absolute -left-[26px] top-2 w-3 h-3 rounded-full border-2 border-black" style={{background:typeColors[e.type]||"#3b82f6"}}/>
              <div className="bg-black/30 border border-[#1a1a2e] rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{background:`${typeColors[e.type]||"#3b82f6"}15`,color:typeColors[e.type]||"#3b82f6",border:`1px solid ${typeColors[e.type]||"#3b82f6"}30`}}>{e.type}</span>
                  {e.source && <span className="text-[7px] text-slate-600 font-mono">{e.source}</span>}
                  <span className="text-[7px] text-slate-700 font-mono ml-auto">{new Date(e.timestamp).toLocaleTimeString('ar-SA')}</span>
                </div>
                <p className="text-[9px] text-slate-300">{e.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TAB: Export & Report ──────────────────────────────────────────────────────
function ExportTab() {
  const [data, setData] = useState(""); const [format, setFormat] = useState<"json"|"csv"|"markdown">("json"); const [title, setTitle] = useState(""); const [aiReport, setAiReport] = useState(""); const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const exportData = async () => {
    if(!data.trim()){toast({title:"أدخل البيانات المراد تصديرها"});return;}
    setLoading(true);
    try {
      let parsedData: any; try { parsedData = JSON.parse(data); } catch { parsedData = data; }
      const r = await fetch(`${API}/export`,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({data:parsedData,format,title:title||"DWI Investigation Report"}) });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`dwi-report-${Date.now()}.${format==="markdown"?"md":format}`; a.click();
      URL.revokeObjectURL(url);
      toast({title:"تم تصدير الملف بنجاح"});
    } catch(e:any){toast({title:"خطأ في التصدير",description:e.message})} setLoading(false);
  };
  const generateReport = async () => {
    if(!data.trim()){toast({title:"أدخل البيانات"});return;}
    setLoading(true);
    try {
      let parsedData: any; try { parsedData = JSON.parse(data); } catch { parsedData = data; }
      const r = await post("/ai/report",{data:parsedData,template:"technical"});
      if(r.success) setAiReport((r.data as any)?.report||"");
    } catch(e:any){toast({title:"خطأ في التقرير",description:e.message})} setLoading(false);
  };
  const copyReport = () => { navigator.clipboard.writeText(aiReport); toast({title:"تم نسخ التقرير"}); };
  return (
    <div className="space-y-4">
      <SectionTitle icon={Download} label="التقارير والتصدير — Reports & Export" color="#06b6d4" />
      <Field label="عنوان التقرير" value={title} onChange={setTitle} placeholder="تقرير التحقيق في الحادثة X" />
      <Field label="البيانات (JSON أو نص)" value={data} onChange={setData} placeholder={'{"ip":"1.2.3.4","threats":["ransomware"],...}'} multiline rows={5} />
      <div><p className="text-[8px] font-mono text-slate-600 uppercase mb-1">صيغة التصدير</p><div className="flex gap-2">{[{id:"json",label:"JSON"},{id:"csv",label:"CSV"},{id:"markdown",label:"Markdown"}].map(({id,label})=><Chip key={id} label={label} active={format===id} color="#06b6d4" onClick={()=>setFormat(id as any)} />)}</div></div>
      <div className="flex gap-2">
        <button onClick={exportData} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all disabled:opacity-50"><Download className="w-3 h-3"/>تصدير الملف</button>
        <button onClick={generateReport} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold text-violet-400 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all disabled:opacity-50"><Brain className="w-3 h-3"/>توليد تقرير AI</button>
      </div>
      {loading && <Spinner />}
      {aiReport && <div className="relative"><button onClick={copyReport} className="absolute top-2 right-2 p-1 rounded text-slate-500 hover:text-white"><Copy className="w-3 h-3"/></button><div className="bg-black/30 border border-[#a78bfa]/20 rounded-lg p-3 max-h-72 overflow-auto"><p className="text-[9px] text-slate-300 whitespace-pre-wrap leading-relaxed">{aiReport}</p></div></div>}
    </div>
  );
}

// ── TAB: Status ───────────────────────────────────────────────────────────────
function StatusTab() {
  const [status, setStatus] = useState<Result|null>(null); const [loading, setLoading] = useState(false);
  const fetch_ = useCallback(async () => { setLoading(true); try { setStatus(await get("/status")); } catch(e:any){setStatus({success:false,error:e.message})} setLoading(false); }, []);
  useEffect(()=>{ fetch_(); }, [fetch_]);
  const d = status?.success ? status.data as any : null;
  const svcLabels: Record<string,string> = {intelx:"IntelX",shodan:"Shodan",hudsonrock:"HudsonRock",recordedFuture:"Recorded Future",chainalysis:"Chainalysis",neo4j:"Neo4j Graph DB",openai:"OpenAI / AI"};
  const ftLabels: Record<string,string> = {darkWebSearch:"Dark Web Search",blockchainTracking:"Blockchain Tracking",threatIntelligence:"Threat Intelligence",networkIntelligence:"Network Intelligence",emailIntelligence:"Email Intelligence",aiCorrelation:"AI Correlation",graphAnalysis:"Graph Analysis",torScraping:"Tor Scraping",telegramMonitoring:"Telegram Monitoring",pasteMonitoring:"Paste Monitoring"};
  const secrets = ["INTELX_API_KEY","SHODAN_API_KEY","RF_API_KEY","CHAINALYSIS_API_KEY","OPENAI_API_KEY","NEO4J_URI","NEO4J_PASSWORD","HUDSONROCK_API_KEY"];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><SectionTitle icon={Activity} label="حالة الخدمات والمفاتيح" color="#22c55e" /><button onClick={fetch_} disabled={loading} className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 disabled:opacity-50"><RotateCw className={`w-3 h-3 ${loading?"animate-spin":""}`}/>تحديث</button></div>
      {loading && <Spinner />}
      {d && <div className="space-y-4">
        <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">مفاتيح API</p><div className="space-y-1.5">{Object.entries(d.services||{}).map(([k,v])=><div key={k} className="flex items-center justify-between px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg"><span className="text-[9px] font-mono text-slate-300">{svcLabels[k]||k}</span><div className="flex items-center gap-1.5"><StatusDot ok={!!v}/><span className="text-[8px] font-mono" style={{color:v?"#10b981":"#e21227"}}>{v?"متصل":"غير مُهيأ"}</span></div></div>)}</div></div>
        <div><p className="text-[8px] font-mono text-slate-500 uppercase mb-2">الميزات المتاحة</p><div className="grid grid-cols-2 gap-1.5">{Object.entries(d.features||{}).map(([k,v])=><div key={k} className="flex items-center gap-1.5 px-2 py-1.5 bg-black/20 border border-[#1a1a2e] rounded"><StatusDot ok={!!v}/><span className="text-[8px] font-mono" style={{color:v?"#10b981":"#475569"}}>{ftLabels[k]||k}</span></div>)}</div></div>
        <div className="flex items-center justify-between px-3 py-2 bg-black/30 border border-[#1a1a2e] rounded-lg"><span className="text-[8px] font-mono text-slate-500">إصدار المنظومة</span><span className="text-[8px] font-mono text-[#8b5cf6]">{d.version}</span></div>
      </div>}
      {status && !status.success && <ErrBox msg={status.error!} />}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <p className="text-[8px] font-bold text-amber-400 font-mono mb-2">لتفعيل الخدمات — أضف Secrets في Replit:</p>
        <div className="flex flex-wrap gap-1.5">{secrets.map(k=><code key={k} className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{k}</code>)}</div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function DarkWebIntelligenceFullModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>("unified");

  const tabs: { id: MainTab; label: string; icon: React.ElementType; color: string }[] = [
    { id:"unified",     label:"بحث موحد",         icon:Search,       color:"#8b5cf6" },
    { id:"email",       label:"استخ. البريد",       icon:Mail,         color:"#3b82f6" },
    { id:"network",     label:"استخ. IP",           icon:Network,      color:"#e21227" },
    { id:"domain",      label:"استخ. النطاق",       icon:Globe,        color:"#10b981" },
    { id:"darkweb",     label:"الويب المظلم",       icon:Eye,          color:"#8b5cf6" },
    { id:"blockchain",  label:"البلوك تشين",        icon:Bitcoin,      color:"#f59e0b" },
    { id:"threat",      label:"التهديدات",          icon:ShieldAlert,  color:"#e21227" },
    { id:"graph",       label:"الرسم البياني",      icon:GitBranch,    color:"#06b6d4" },
    { id:"ai",          label:"تحليل AI",           icon:Brain,        color:"#a78bfa" },
    { id:"monitoring",  label:"مراقبة فورية",       icon:Radio,        color:"#22c55e" },
    { id:"telecom",     label:"الاتصالات",          icon:Phone,        color:"#06b6d4" },
    { id:"netscan",     label:"مسح الشبكة",         icon:Radar,        color:"#ec4899" },
    { id:"username",    label:"اسم المستخدم",       icon:User,         color:"#f97316" },
    { id:"hash",        label:"تحليل الهاش",        icon:Hash,         color:"#f59e0b" },
    { id:"sigint",      label:"SIGINT",             icon:Signal,       color:"#22c55e" },
    { id:"person",      label:"بحث الشخص",          icon:Users,        color:"#ec4899" },
    { id:"ransomware",  label:"تتبع الفدية",        icon:AlertOctagon, color:"#e21227" },
    { id:"cve",         label:"استخ. CVE",          icon:Bug,          color:"#f97316" },
    { id:"evidence",    label:"خزينة الأدلة",       icon:FolderOpen,   color:"#10b981" },
    { id:"bulkioc",     label:"IOC بالجملة",        icon:Layers,       color:"#8b5cf6" },
    { id:"timeline",    label:"الجدول الزمني",      icon:Clock,        color:"#3b82f6" },
    { id:"export",      label:"التقارير والتصدير",  icon:Download,     color:"#06b6d4" },
    { id:"status",      label:"حالة الخدمات",       icon:Activity,     color:"#22c55e" },
  ];

  const activeColor = tabs.find(t=>t.id===activeTab)?.color ?? "#8b5cf6";
  const stats = [
    { label: "نظام استخباراتي", value: "23" },
    { label: "مصدر بيانات", value: "50+" },
    { label: "نوع تحليل", value: "15+" },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-3"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl border overflow-hidden"
          style={{ background:"linear-gradient(140deg,#070710 0%,#0b0b1a 100%)", borderColor:`${activeColor}28`, boxShadow:`0 0 80px ${activeColor}18,0 0 160px ${activeColor}0a` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0 gap-4"
            style={{ borderColor:`${activeColor}18`, background:`linear-gradient(to right,${activeColor}0e,transparent)` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${activeColor}18`, border:`1px solid ${activeColor}35` }}>
                <Eye className="w-4 h-4" style={{ color: activeColor }} />
              </div>
              <div>
                <h1 className="text-[13px] font-black text-white tracking-widest">DARK WEB INTELLIGENCE</h1>
                <p className="text-[8px] font-mono" style={{ color: activeColor }}>منظومة الاستخبارات الرقمية المتكاملة ← Military Grade OSINT Platform v2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {stats.map(({label,value})=>(
                <div key={label} className="text-center hidden sm:block">
                  <p className="text-[14px] font-black" style={{color:activeColor}}>{value}</p>
                  <p className="text-[7px] text-slate-600 font-mono">{label}</p>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-[7px] font-mono" style={{color:"#22c55e",borderColor:"#22c55e35",background:"#22c55e0e"}}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>نظام نشط
              </div>
              <div className="text-[7px] font-mono text-slate-700 hidden md:block">Ctrl+Shift+F3</div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-40 shrink-0 border-r border-[#13131f] flex flex-col py-2 gap-0.5 overflow-y-auto" style={{background:"rgba(0,0,0,0.45)"}}>
              {tabs.map(({id,label,icon:Icon,color})=>(
                <button key={id} onClick={()=>setActiveTab(id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 mx-1 rounded-lg text-left transition-all"
                  style={{
                    background: activeTab===id ? `${color}18` : "transparent",
                    border: activeTab===id ? `1px solid ${color}28` : "1px solid transparent",
                    color: activeTab===id ? color : "#3d4a5a"
                  }}>
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="text-[8px] font-bold leading-tight">{label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.12}}>
                  {activeTab==="unified"    && <UnifiedTab />}
                  {activeTab==="email"      && <EmailTab />}
                  {activeTab==="network"    && <NetworkTab />}
                  {activeTab==="domain"     && <DomainTab />}
                  {activeTab==="darkweb"    && <DarkWebTab />}
                  {activeTab==="blockchain" && <BlockchainTab />}
                  {activeTab==="threat"     && <ThreatTab />}
                  {activeTab==="graph"      && <GraphTab />}
                  {activeTab==="ai"         && <AITab />}
                  {activeTab==="monitoring" && <MonitoringTab />}
                  {activeTab==="telecom"    && <TelecomTab />}
                  {activeTab==="netscan"    && <NetScanTab />}
                  {activeTab==="username"   && <UsernameTab />}
                  {activeTab==="hash"       && <HashTab />}
                  {activeTab==="sigint"     && <SigintTab />}
                  {activeTab==="person"     && <PersonTab />}
                  {activeTab==="ransomware" && <RansomwareTab />}
                  {activeTab==="cve"        && <CVETab />}
                  {activeTab==="evidence"   && <EvidenceTab />}
                  {activeTab==="bulkioc"    && <BulkIOCTab />}
                  {activeTab==="timeline"   && <TimelineTab />}
                  {activeTab==="export"     && <ExportTab />}
                  {activeTab==="status"     && <StatusTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-2 border-t shrink-0" style={{borderColor:"#13131f",background:"rgba(0,0,0,0.35)"}}>
            <div className="flex items-center gap-3">
              <span className="text-[7px] font-mono text-slate-700">Yode9 OSINT Platform v2.0 — Military Grade Intelligence</span>
              <span className="text-[7px] font-mono text-slate-800">|</span>
              <span className="text-[7px] font-mono text-slate-700">23 نظام استخباراتي · 50+ مصدر بيانات</span>
            </div>
            <div className="flex items-center gap-1">
              {["IntelX","Shodan","Chainalysis","Neo4j","Recorded Future","MISP"].map(s=>(
                <span key={s} className="text-[6px] font-mono px-1 py-0.5 rounded border border-[#1a1a2e] text-slate-800">{s}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DarkWebIntelligenceFullModal;
