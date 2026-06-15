import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, AlertTriangle, Activity, Eye, CheckCircle,
  Clock, Globe, Network, Cpu, Database, Radio,
  TrendingUp, Zap, Lock, Bell, Users,
  BarChart2, Layers, Terminal, FileText, Search, Filter,
  Play, Square, RotateCcw, ChevronRight, ChevronDown,
  ShieldCheck, Brain, Crosshair, Flame, Target, Download,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const INITIAL_ALERTS = [
  { id: 1, sev: "CRITICAL", type: "Ransomware Spread", src: "10.0.14.52", dst: "DC-01", proto: "SMB", time: "13:47:22", status: "active", rule: "RULE-001-RANSOM", mitre: "T1486", analyst: null },
  { id: 2, sev: "HIGH", type: "Lateral Movement", src: "10.0.14.52", dst: "10.0.14.103", proto: "WinRM", time: "13:47:18", status: "investigating", rule: "RULE-045-LATMOV", mitre: "T1021", analyst: "SOC-Tier2" },
  { id: 3, sev: "HIGH", type: "Mimikatz Detection", src: "10.0.14.52", dst: "LOCAL", proto: "LSASS", time: "13:47:15", status: "investigating", rule: "RULE-012-CREDS", mitre: "T1003", analyst: "SOC-Tier2" },
  { id: 4, sev: "HIGH", type: "C2 Beacon Detected", src: "10.0.14.52", dst: "185.220.101.45", proto: "HTTPS", time: "13:47:10", status: "active", rule: "RULE-099-C2", mitre: "T1071", analyst: null },
  { id: 5, sev: "MEDIUM", type: "Network Port Scan", src: "192.168.1.88", dst: "10.0.0.0/8", proto: "TCP", time: "13:46:55", status: "resolved", rule: "RULE-002-SCAN", mitre: "T1046", analyst: "SOC-Tier1" },
  { id: 6, sev: "MEDIUM", type: "DNS Tunneling", src: "10.0.14.77", dst: "8.8.8.8", proto: "DNS", time: "13:46:40", status: "investigating", rule: "RULE-071-DNSEX", mitre: "T1071.004", analyst: "SOC-Tier1" },
  { id: 7, sev: "LOW", type: "Brute Force — x47", src: "203.0.113.42", dst: "auth.corp.com", proto: "HTTPS", time: "13:46:20", status: "resolved", rule: "RULE-003-BRUTE", mitre: "T1110", analyst: "SOC-Tier1" },
  { id: 8, sev: "MEDIUM", type: "Suspicious PowerShell", src: "10.0.14.99", dst: "LOCAL", proto: "PS", time: "13:46:10", status: "active", rule: "RULE-033-PS", mitre: "T1059.001", analyst: null },
  { id: 9, sev: "HIGH", type: "Golden Ticket Attack", src: "10.0.14.88", dst: "DC-01", proto: "Kerberos", time: "13:45:55", status: "active", rule: "RULE-088-GOLDTKT", mitre: "T1558.001", analyst: null },
  { id: 10, sev: "MEDIUM", type: "LOLBIN Execution", src: "10.0.14.33", dst: "LOCAL", proto: "CMD", time: "13:45:30", status: "investigating", rule: "RULE-044-LOLBIN", mitre: "T1218", analyst: "SOC-Tier1" },
];

const SEV_COLORS: Record<string,string> = { CRITICAL:"#e21227",HIGH:"#f97316",MEDIUM:"#fbbf24",LOW:"#4ade80" };
const STATUS_COLORS: Record<string,string> = { active:"#e21227",investigating:"#fbbf24",resolved:"#4ade80" };

const SIEM_SOURCES = [
  { name:"Splunk Enterprise", status:"connected", eps:12450, color:"#f97316", icon:Database },
  { name:"Elastic SIEM", status:"connected", eps:8320, color:"#00e5ff", icon:Layers },
  { name:"Wazuh Manager", status:"connected", eps:3100, color:"#4ade80", icon:Shield },
  { name:"Windows Event Collector", status:"connected", eps:5600, color:"#a855f7", icon:Cpu },
  { name:"Suricata IDS", status:"connected", eps:22000, color:"#e21227", icon:Radio },
  { name:"Zeek Network Monitor", status:"warning", eps:0, color:"#fbbf24", icon:Network },
  { name:"CrowdStrike Falcon", status:"connected", eps:3400, color:"#f97316", icon:ShieldCheck },
  { name:"Microsoft Sentinel", status:"connected", eps:7200, color:"#3b82f6", icon:Brain },
];

const THREAT_FEEDS = [
  { name:"CISA KEV", type:"CVE", count:1117, update:"2m ago", color:"#e21227", fresh:true },
  { name:"AlienVault OTX", type:"IOC", count:4280000, update:"15m ago", color:"#f97316", fresh:true },
  { name:"VirusTotal Intel", type:"Hash", count:890000, update:"5m ago", color:"#fbbf24", fresh:true },
  { name:"Shodan Monitor", type:"Assets", count:2344, update:"1h ago", color:"#00e5ff", fresh:false },
  { name:"AbuseIPDB", type:"IP Rep", count:1200000, update:"30m ago", color:"#a855f7", fresh:true },
  { name:"MITRE ATT&CK", type:"TTP", count:760, update:"1d ago", color:"#4ade80", fresh:false },
  { name:"Recorded Future", type:"Threat Intel", count:54200, update:"8m ago", color:"#ec4899", fresh:true },
  { name:"Mandiant Advantage", type:"APT Groups", count:387, update:"4h ago", color:"#f59e0b", fresh:false },
];

const PLAYBOOKS = [
  { name:"Ransomware Response", steps:["Isolate host from network","Snapshot memory & disk","Block C2 IPs in firewall","Preserve evidence chain","Notify legal & management","Deploy EDR containment"], trigger:"RULE-001-RANSOM", color:"#e21227", avg_time:"12 min" },
  { name:"Credential Theft IR", steps:["Force password reset","Revoke active sessions","Audit recent access logs","Enable MFA enforcement","Threat hunt laterally"], trigger:"RULE-012-CREDS", color:"#f97316", avg_time:"8 min" },
  { name:"C2 Beaconing Response", steps:["Block outbound IP in NGFW","Start full PCAP capture","Hash all file artifacts","Threat hunt on domain","Submit IOCs to threat intel"], trigger:"RULE-099-C2", color:"#a855f7", avg_time:"10 min" },
  { name:"Brute Force Block", steps:["Block source IP (24h)","Notify account owner","Review auth log patterns","Add IP to threat watchlist"], trigger:"RULE-003-BRUTE", color:"#fbbf24", avg_time:"3 min" },
  { name:"Golden Ticket Response", steps:["Reset KRBTGT password (x2)","Force domain-wide Kerberos reset","Audit all privileged accounts","Isolate affected DCs","Forensic memory capture"], trigger:"RULE-088-GOLDTKT", color:"#e21227", avg_time:"25 min" },
  { name:"Lateral Movement Hunt", steps:["Map movement via BloodHound","Block compromised accounts","Enable enhanced audit logging","Deploy deception honeypot","Escalate to IR team"], trigger:"RULE-045-LATMOV", color:"#38bdf8", avg_time:"15 min" },
];

const HUNT_HYPOTHESES = [
  { name:"Kerberoasting Activity", query:"index=windows EventCode=4769 TicketEncryptionType=0x17 | stats count by src_user", sigma:"kerberoasting_detection.yml", status:"active" },
  { name:"LSASS Memory Access", query:"index=sysmon EventCode=10 TargetImage=*lsass.exe | table SourceImage,GrantedAccess", sigma:"lsass_access.yml", status:"running" },
  { name:"Suspicious Named Pipes", query:"index=sysmon EventCode=17,18 PipeName IN (\"*mojo*\",\"*PSHost*\")", sigma:"named_pipe_ioc.yml", status:"new" },
  { name:"Living Off the Land", query:"index=windows process IN (certutil,regsvr32,mshta,wscript,cscript)", sigma:"lolbin_exec.yml", status:"active" },
  { name:"Unusual Outbound DNS", query:"index=dns query_length>30 NOT (category=benign) | stats sum(bytes) by dest", sigma:"dns_tunneling.yml", status:"running" },
];

function SOCCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(()=>{
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function resize(){
      const c = canvasRef.current;
      if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; }
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    type Threat = { x: number; y: number; vx: number; vy: number; sev: number; active: boolean; pulse: number };
    const threats: Threat[] = [];
    for (let i=0; i<20; i++) threats.push({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.0004, vy: (Math.random()-0.5)*0.0004,
      sev: Math.floor(Math.random()*4), active: Math.random()>0.5, pulse: Math.random()*Math.PI*2
    });

    const TCOLORS = ["#e21227","#f97316","#fbbf24","#4ade80"];

    function draw(){
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.009;
      const t = tRef.current;
      const W=cv!.width, H=cv!.height;
      ctx.clearRect(0,0,W,H);

      // globe-like grid in corner
      const gcx=W*0.8, gcy=H*0.5, grad=Math.min(W,H)*0.35;
      // lat/long lines
      for (let i=0; i<7; i++) {
        const lat=(i/6-0.5)*Math.PI;
        const ry=Math.cos(lat)*grad;
        ctx.beginPath(); ctx.ellipse(gcx, gcy, ry, ry*0.3, 0, 0, Math.PI*2);
        ctx.strokeStyle=`rgba(0,229,255,0.05)`; ctx.lineWidth=0.8; ctx.stroke();
      }
      for (let i=0; i<12; i++) {
        const ang=i/12*Math.PI*2+t*0.05;
        ctx.beginPath(); ctx.ellipse(gcx, gcy, grad, grad*0.45, ang, 0, Math.PI*2);
        ctx.strokeStyle=`rgba(0,229,255,0.04)`; ctx.lineWidth=0.8; ctx.stroke();
      }
      // outer ring
      ctx.beginPath(); ctx.arc(gcx, gcy, grad+10, 0, Math.PI*2);
      ctx.strokeStyle=`rgba(0,229,255,${0.08+0.04*Math.sin(t)})`; ctx.lineWidth=1.5; ctx.stroke();

      // threat dots on globe
      threats.forEach((th,i) => {
        th.x+=th.vx; th.y+=th.vy;
        if(th.x<0||th.x>1) th.vx*=-1; if(th.y<0||th.y>1) th.vy*=-1;
        const phi=th.x*Math.PI*2+t*0.05;
        const theta=(th.y-0.5)*Math.PI;
        const px=gcx+grad*Math.cos(theta)*Math.cos(phi);
        const py=gcy+grad*0.45*Math.sin(theta);
        const alpha=0.5+0.5*Math.sin(t*2+th.pulse);
        const r=2.5+th.sev*0.8;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
        ctx.fillStyle=TCOLORS[th.sev]+Math.floor(alpha*200).toString(16).padStart(2,"0");
        ctx.fill();
        if (th.active&&th.sev<2) {
          ctx.beginPath(); ctx.arc(px, py, r*3, 0, Math.PI*2);
          ctx.strokeStyle=TCOLORS[th.sev]+"30"; ctx.lineWidth=0.8; ctx.stroke();
        }
      });

      // left side — EPS bars
      ctx.fillStyle="rgba(0,229,255,0.06)";
      ctx.font="8px monospace";
      const barLabels=["Splunk","Elastic","Wazuh","WEC","Suricata"];
      const barVals=[0.85,0.63,0.24,0.43,1.0];
      barLabels.forEach((lb,i)=>{
        const bx=W*0.02, by=H*0.15+i*H*0.12;
        const bw=W*0.16, bh=6;
        const animated=Math.min(barVals[i]+0.05*Math.sin(t+i),1);
        ctx.fillStyle="rgba(255,255,255,0.04)";
        ctx.fillRect(bx, by, bw, bh);
        const barColor=i===4?"rgba(226,18,39,0.35)":"rgba(0,229,255,0.25)";
        ctx.fillStyle=barColor;
        ctx.fillRect(bx, by, bw*animated, bh);
        ctx.fillStyle="rgba(255,255,255,0.15)";
        ctx.fillText(lb, bx, by-2);
      });

      // alert pulse rings center
      for (let wave=0; wave<3; wave++) {
        const wRad=((t*0.4+wave*0.33)%1)*Math.min(W,H)*0.1;
        ctx.beginPath(); ctx.arc(W*0.35, H*0.5, wRad, 0, Math.PI*2);
        ctx.strokeStyle=`rgba(226,18,39,${0.12*(1-wRad/(Math.min(W,H)*0.1))})`; ctx.lineWidth=1; ctx.stroke();
      }
    }
    draw();
    return ()=>{ cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  },[]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export function SOCCommandModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"overview"|"alerts"|"siem"|"threat-intel"|"playbooks"|"hunt"|"reports">("overview");
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string|null>(null);
  const [selectedAlert, setSelectedAlert] = useState<number|null>(null);
  const [sevFilter, setSevFilter] = useState<string>("ALL");
  const [epsValue, setEpsValue] = useState(58470);
  const [expandedHunt, setExpandedHunt] = useState<string|null>(null);

  useEffect(()=>{
    const iv = setInterval(()=>{
      setEpsValue(prev=>Math.max(50000,Math.min(75000,prev+(Math.random()-0.5)*2000)));
      // occasionally add a new alert
      if (Math.random()<0.15) {
        const types=["Suspicious DNS Query","Process Injection","Scheduled Task Created","Registry Persistence","Unusual Parent-Child Process"];
        const sevs:("CRITICAL"|"HIGH"|"MEDIUM"|"LOW")[]=["HIGH","MEDIUM","HIGH","MEDIUM","LOW"];
        const i=Math.floor(Math.random()*types.length);
        setAlerts(prev=>[{
          id:Date.now(),sev:sevs[i],type:types[i],src:`10.0.${Math.floor(Math.random()*20)}.${Math.floor(Math.random()*254)}`,
          dst:"LOCAL",proto:"Sysmon",time:new Date().toLocaleTimeString("en",{hour12:false}),status:"active",
          rule:`RULE-${String(Math.floor(Math.random()*999)).padStart(3,"0")}`,mitre:"T"+String(1000+Math.floor(Math.random()*600)),analyst:null
        },...prev].slice(0,50));
      }
    },3000);
    return ()=>clearInterval(iv);
  },[]);

  const updateAlert = (id: number, status: string) => {
    setAlerts(prev=>prev.map(a=>a.id===id?{...a,status,analyst:"SOC-Tier1"}:a));
  };

  if (!open) return null;

  const TABS = [
    {id:"overview",label:"Overview",icon:Activity},
    {id:"alerts",label:"Alerts",icon:AlertTriangle},
    {id:"siem",label:"SIEM Sources",icon:Database},
    {id:"threat-intel",label:"Threat Intel",icon:Globe},
    {id:"playbooks",label:"Playbooks",icon:Shield},
    {id:"hunt",label:"Threat Hunt",icon:Search},
    {id:"reports",label:"Reports",icon:FileText},
  ] as const;

  const filteredAlerts = sevFilter==="ALL" ? alerts : alerts.filter(a=>a.sev===sevFilter);

  const critCount = alerts.filter(a=>a.sev==="CRITICAL"&&a.status==="active").length;
  const highCount = alerts.filter(a=>a.sev==="HIGH"&&a.status==="active").length;
  const totalActive = alerts.filter(a=>a.status==="active").length;

  return (
    <motion.div className="fixed inset-0 z-[9999] flex flex-col" style={{background:"#020408"}}
      initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.97}} transition={{duration:0.22}}>
      <div className="pointer-events-none absolute inset-0 z-[1]" style={{background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(226,18,39,0.007) 2px,rgba(226,18,39,0.007) 4px)"}} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b shrink-0" style={{borderColor:"rgba(226,18,39,0.2)",background:"rgba(0,0,0,0.85)"}}>
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"rgba(226,18,39,0.12)",border:"1px solid rgba(226,18,39,0.4)"}}>
            <ShieldCheck className="w-4 h-4 text-red-400" />
            {critCount>0&&<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"/>}
          </div>
          <div>
            <div className="text-[9px] font-mono text-red-400/60 tracking-widest">SECURITY OPERATIONS CENTER · 24/7</div>
            <h1 className="text-[13px] font-black tracking-wider text-white">SOC COMMAND CENTER</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {critCount>0&&(
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-700/40 animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/>
              <span className="text-[10px] font-mono text-red-300">{critCount} CRITICAL ACTIVE</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/8">
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse"/>
            <span className="text-[10px] font-mono text-cyan-400">{epsValue.toLocaleString()} EPS</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/8">
            <Clock className="w-3 h-3 text-white/40"/>
            <span className="text-[10px] font-mono text-white/40">{new Date().toLocaleTimeString("en",{hour12:false})}</span>
          </div>
          <button onClick={()=>onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        </div>
      </div>

      {/* TABS */}
      <div className="relative z-10 flex items-center border-b shrink-0 overflow-x-auto" style={{borderColor:"rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.6)"}}>
        {TABS.map(t=>{
          const Icon=t.icon; const active=tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono tracking-wider border-b-2 transition-all whitespace-nowrap shrink-0 ${active?"border-red-500 text-red-400 bg-red-950/15":"border-transparent text-white/35 hover:text-white/60"}`}>
              <Icon className="w-3 h-3"/>{t.label}
              {t.id==="alerts"&&totalActive>0&&<span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono bg-red-900/60 text-red-300 ml-1">{totalActive}</span>}
            </button>
          );
        })}
      </div>

      {/* BODY */}
      <div className="relative flex-1 overflow-hidden z-10">
        <SOCCanvas />
        <div className="relative z-10 h-full overflow-y-auto p-4">
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ── */}
            {tab==="overview"&&(
              <motion.div key="ov" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:"Active Incidents",value:String(totalActive),sub:"Requires attention",color:"#e21227",icon:AlertTriangle},
                    {label:"Events Per Second",value:epsValue.toLocaleString(),sub:"Total SIEM ingestion",color:"#00e5ff",icon:Activity},
                    {label:"SIEM Sources",value:"8",sub:"7 connected · 1 warning",color:"#4ade80",icon:Database},
                    {label:"Threat Feed IOCs",value:"6.4M",sub:"Updated < 15m",color:"#a855f7",icon:Globe},
                    {label:"Open Alerts",value:String(alerts.filter(a=>a.status!=="resolved").length),sub:"Pending triage",color:"#f97316",icon:Bell},
                    {label:"MTTR Today",value:"14min",sub:"Mean time to respond",color:"#fbbf24",icon:Clock},
                    {label:"Hunt Hypotheses",value:String(HUNT_HYPOTHESES.length),sub:"Active investigations",color:"#38bdf8",icon:Search},
                    {label:"Playbooks Ready",value:String(PLAYBOOKS.length),sub:"Auto + manual",color:"#4ade80",icon:Shield},
                  ].map((s,i)=>{
                    const Icon=s.icon;
                    return (
                      <motion.div key={i} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        className="relative overflow-hidden rounded-xl p-3.5 border backdrop-blur-sm" style={{borderColor:s.color+"28",background:s.color+"07"}}>
                        <div className="absolute inset-x-0 top-0 h-px" style={{background:`linear-gradient(90deg,transparent,${s.color}50,transparent)`}}/>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xl font-black" style={{color:s.color}}>{s.value}</div>
                            <div className="text-[9px] font-mono text-white/50 mt-0.5">{s.label}</div>
                            <div className="text-[8px] font-mono mt-0.5" style={{color:s.color+"80"}}>{s.sub}</div>
                          </div>
                          <Icon className="w-4 h-4 opacity-35" style={{color:s.color}}/>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Live alert feed */}
                <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-mono text-white/55 tracking-widest uppercase">Live Alert Feed</h3>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/><span className="text-[9px] font-mono text-red-400">REAL-TIME</span></div>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {alerts.slice(0,8).map((a,i)=>(
                      <motion.div key={a.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                        className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-black/30 hover:border-white/10 transition-all cursor-pointer"
                        onClick={()=>setTab("alerts")}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{background:SEV_COLORS[a.sev]}}/>
                        <div className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0" style={{background:SEV_COLORS[a.sev]+"20",color:SEV_COLORS[a.sev]}}>{a.sev}</div>
                        <span className="text-[10px] font-mono text-white/65 flex-1 truncate">{a.type}</span>
                        <span className="text-[8px] font-mono text-white/30 shrink-0">{a.src}</span>
                        <span className="text-[8px] font-mono text-white/25 shrink-0">{a.time}</span>
                        <div className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0" style={{background:STATUS_COLORS[a.status]+"15",color:STATUS_COLORS[a.status]}}>{a.status}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ALERTS ── */}
            {tab==="alerts"&&(
              <motion.div key="alerts" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f=>(
                      <button key={f} onClick={()=>setSevFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${sevFilter===f?"text-white":"text-white/40 hover:text-white/60 bg-white/3"}`}
                        style={sevFilter===f&&f!=="ALL"?{background:SEV_COLORS[f]+"25",color:SEV_COLORS[f],border:`1px solid ${SEV_COLORS[f]}35`}:sevFilter===f?{background:"rgba(255,255,255,0.1)"}:{}}>
                        {f}
                        {f!=="ALL"&&<span className="ml-1 text-white/30">{alerts.filter(a=>a.sev===f).length}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto text-[9px] font-mono text-white/30">{filteredAlerts.length} alerts</div>
                </div>
                <div className="space-y-2">
                  {filteredAlerts.map((a,i)=>{
                    const sel=selectedAlert===a.id;
                    return (
                      <motion.div key={a.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.02}}
                        className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${sel?"border-opacity-40":"border-white/6 hover:border-white/12"}`}
                        style={sel?{borderColor:SEV_COLORS[a.sev]+"35",background:SEV_COLORS[a.sev]+"06"}:{}}>
                        <div className="flex items-center gap-2 p-2.5" onClick={()=>setSelectedAlert(sel?null:a.id)}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:SEV_COLORS[a.sev],boxShadow:a.status==="active"?`0 0 6px ${SEV_COLORS[a.sev]}`:"none"}}/>
                          <div className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0" style={{background:SEV_COLORS[a.sev]+"20",color:SEV_COLORS[a.sev]}}>{a.sev}</div>
                          <span className="text-[11px] font-semibold text-white flex-1 truncate">{a.type}</span>
                          <span className="text-[9px] font-mono text-white/35 shrink-0">{a.src} → {a.dst}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30 shrink-0">{a.mitre}</span>
                          <span className="text-[8px] font-mono text-white/25 shrink-0">{a.time}</span>
                          <div className="px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0" style={{background:STATUS_COLORS[a.status]+"18",color:STATUS_COLORS[a.status]}}>{a.status}</div>
                          {sel?<ChevronDown className="w-3 h-3 text-white/30 shrink-0"/>:<ChevronRight className="w-3 h-3 text-white/20 shrink-0"/>}
                        </div>
                        <AnimatePresence>
                          {sel&&(
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t border-white/6">
                              <div className="p-3 space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] font-mono">
                                  {[{k:"Rule",v:a.rule},{k:"Protocol",v:a.proto},{k:"Analyst",v:a.analyst??"-"},{k:"MITRE",v:a.mitre}].map(({k,v})=>(
                                    <div key={k} className="p-2 rounded-lg bg-white/3 border border-white/5">
                                      <div className="text-white/35">{k}</div>
                                      <div className="text-white/70 font-bold mt-0.5">{v}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={()=>updateAlert(a.id,"investigating")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-900/25 hover:bg-yellow-900/40 border border-yellow-700/30 text-[9px] font-mono text-yellow-300 transition-colors"><Eye className="w-3 h-3"/>Investigate</button>
                                  <button onClick={()=>updateAlert(a.id,"resolved")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/25 hover:bg-green-900/40 border border-green-700/30 text-[9px] font-mono text-green-300 transition-colors"><CheckCircle className="w-3 h-3"/>Resolve</button>
                                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/25 hover:bg-purple-900/40 border border-purple-700/30 text-[9px] font-mono text-purple-300 transition-colors"><Shield className="w-3 h-3"/>Run Playbook</button>
                                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-[9px] font-mono text-white/50 transition-colors"><Terminal className="w-3 h-3"/>IR Console</button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── SIEM SOURCES ── */}
            {tab==="siem"&&(
              <motion.div key="siem" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SIEM_SOURCES.map((s,i)=>{
                    const Icon=s.icon;
                    return (
                      <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                        className="rounded-xl border border-white/8 bg-black/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.color+"14",border:`1px solid ${s.color}28`}}>
                              <Icon className="w-4 h-4" style={{color:s.color}}/>
                            </div>
                            <div>
                              <div className="text-[12px] font-bold text-white">{s.name}</div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${s.status==="connected"?"bg-green-400":"bg-yellow-400 animate-pulse"}`}/>
                                <span className="text-[9px] font-mono text-white/35">{s.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-black" style={{color:s.color}}>{s.eps.toLocaleString()}</div>
                            <div className="text-[9px] font-mono text-white/30">events/sec</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <div className="h-full rounded-full transition-all" style={{width:`${Math.min((s.eps/22000)*100,100)}%`,background:s.color+"80"}}/>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── THREAT INTEL ── */}
            {tab==="threat-intel"&&(
              <motion.div key="ti" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {THREAT_FEEDS.map((f,i)=>(
                    <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                      className="rounded-xl border border-white/8 bg-black/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:f.color}}/>
                          <span className="text-[12px] font-bold text-white">{f.name}</span>
                          {f.fresh&&<span className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-green-900/30 text-green-400 border border-green-800/25">FRESH</span>}
                        </div>
                        <span className="text-[9px] font-mono text-white/30">{f.update}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-white/40">{f.type}</span>
                        <span className="text-base font-black" style={{color:f.color}}>{typeof f.count==="number"?f.count.toLocaleString():f.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── PLAYBOOKS ── */}
            {tab==="playbooks"&&(
              <motion.div key="pb" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
                {PLAYBOOKS.map((pb,i)=>(
                  <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                    className="rounded-xl border overflow-hidden" style={{borderColor:pb.color+"22",background:pb.color+"05"}}>
                    <button onClick={()=>setExpandedPlaybook(expandedPlaybook===pb.name?null:pb.name)}
                      className="w-full flex items-center gap-3 p-3.5 hover:bg-white/3 transition-colors">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{background:pb.color}}/>
                      <div className="flex-1 text-left">
                        <div className="text-[12px] font-bold text-white">{pb.name}</div>
                        <div className="text-[9px] font-mono text-white/35">Trigger: {pb.trigger} · Avg {pb.avg_time}</div>
                      </div>
                      <span className="text-[9px] font-mono text-white/30">{pb.steps.length} steps</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all mr-2" style={{background:pb.color+"20",color:pb.color,border:`1px solid ${pb.color}30`}}
                        onClick={e=>{e.stopPropagation();}}>
                        <Play className="w-3 h-3"/> RUN
                      </button>
                      {expandedPlaybook===pb.name?<ChevronDown className="w-3 h-3 text-white/30"/>:<ChevronRight className="w-3 h-3 text-white/30"/>}
                    </button>
                    <AnimatePresence>
                      {expandedPlaybook===pb.name&&(
                        <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t border-white/6">
                          <div className="p-3 space-y-1.5">
                            {pb.steps.map((step,si)=>(
                              <div key={si} className="flex items-center gap-3 p-2 rounded-lg bg-white/3 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0" style={{background:pb.color+"25",color:pb.color}}>{si+1}</div>
                                <span className="text-[10px] font-mono text-white/60">{step}</span>
                                <CheckCircle className="w-3 h-3 text-white/15 ml-auto shrink-0"/>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ── THREAT HUNT ── */}
            {tab==="hunt"&&(
              <motion.div key="hunt" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-cyan-900/35 bg-cyan-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3"><Search className="w-4 h-4 text-cyan-400"/><h2 className="text-sm font-bold text-white">Proactive Threat Hunt Operations</h2></div>
                  <div className="space-y-3">
                    {HUNT_HYPOTHESES.map((h,i)=>{
                      const exp=expandedHunt===h.name;
                      return (
                        <div key={i} className="rounded-xl border border-white/7 bg-black/40 overflow-hidden">
                          <button onClick={()=>setExpandedHunt(exp?null:h.name)} className="w-full flex items-center gap-3 p-3 hover:bg-white/3 transition-colors">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${h.status==="running"?"animate-pulse":""}`} style={{background:h.status==="running"?"#00e5ff":h.status==="active"?"#4ade80":"#fbbf24"}}/>
                            <div className="flex-1 text-left">
                              <div className="text-[11px] font-bold text-white">{h.name}</div>
                              <div className="text-[9px] font-mono text-white/30">{h.sigma}</div>
                            </div>
                            <div className="px-2 py-0.5 rounded text-[8px] font-mono" style={{background:h.status==="running"?"rgba(0,229,255,0.15)":"rgba(74,222,128,0.12)",color:h.status==="running"?"#00e5ff":"#4ade80"}}>{h.status.toUpperCase()}</div>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-900/20 hover:bg-cyan-900/35 border border-cyan-800/25 text-[9px] font-mono text-cyan-400 transition-colors mr-2" onClick={e=>e.stopPropagation()}>
                              <Play className="w-3 h-3"/> Execute
                            </button>
                            {exp?<ChevronDown className="w-3 h-3 text-white/25"/>:<ChevronRight className="w-3 h-3 text-white/20"/>}
                          </button>
                          <AnimatePresence>
                            {exp&&(
                              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t border-white/5">
                                <div className="p-3">
                                  <div className="text-[8px] font-mono text-white/35 mb-1 tracking-wider">SPL QUERY</div>
                                  <div className="font-mono text-[9.5px] text-cyan-400 bg-black/60 p-3 rounded-lg border border-cyan-900/25 leading-5">{h.query}</div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {name:"Hypothesis-Driven Hunt",desc:"Define adversary TTPs, build detection hypothesis, execute SPL/KQL queries"},
                    {name:"IOC Sweep",desc:"Sweep all endpoints and network for known bad IPs, domains, file hashes"},
                    {name:"Anomaly Hunt",desc:"ML-based baseline deviation detection — UEBA, user behavior analytics"},
                  ].map((t,i)=>(
                    <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3">
                      <div className="text-[11px] font-bold text-cyan-400 mb-1">{t.name}</div>
                      <div className="text-[9px] text-white/35 leading-4">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── REPORTS ── */}
            {tab==="reports"&&(
              <motion.div key="rpts" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4 max-w-3xl mx-auto">
                <div className="rounded-xl border border-white/8 bg-black/50 p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white">SOC Reports & Compliance Dashboards</h2>
                  {[
                    {name:"Daily SOC Summary",period:"Last 24h",color:"#e21227",desc:"Alert volumes, MTTR, top threat actors, false positive rate"},
                    {name:"Weekly Threat Landscape",period:"7 days",color:"#f97316",desc:"Trend analysis, emerging threats, attack pattern shifts"},
                    {name:"SIEM Health Report",period:"Real-time",color:"#00e5ff",desc:"Source ingestion, EPS trends, data quality score, coverage gaps"},
                    {name:"Threat Hunt Report",period:"Custom",color:"#a855f7",desc:"Hypothesis outcomes, dwell time, detection improvement metrics"},
                    {name:"Compliance Report",period:"Monthly",color:"#4ade80",desc:"SOX, HIPAA, PCI-DSS, ISO 27001 control status and evidence"},
                    {name:"Executive Security Briefing",period:"Weekly",color:"#fbbf24",desc:"Board-level risk summary, budget justification, KPI dashboard"},
                  ].map((r,i)=>(
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/7 bg-white/3 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:r.color+"12"}}>
                        <BarChart2 className="w-4 h-4" style={{color:r.color}}/>
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold text-white">{r.name}</div>
                        <div className="text-[9px] font-mono text-white/35">{r.desc}</div>
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30 shrink-0">{r.period}</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/50 border border-white/7 transition-colors shrink-0">
                        <Download className="w-3 h-3"/> Export
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
