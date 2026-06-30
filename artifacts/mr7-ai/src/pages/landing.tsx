import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  Shield, Terminal, Zap, Eye, Brain, Lock, ChevronRight, Server, Code2,
  Crosshair, Globe, Database, Search, Network, FlaskConical, Layers,
  Radar, Bug, Fingerprint, Key, BarChart3, GitBranch, Boxes, Swords,
  BookOpen, MonitorCheck, Target, Hexagon, ShieldCheck, AlertTriangle,
  TrendingUp, Users, Flame, Star, ChevronDown, Play, Radio, Cpu,
  Wifi, Activity, Lock as LockIcon, Zap as ZapIcon, Award, MessageSquare,
  Github, Globe2, Rocket, CheckCircle, ArrowRight, Coffee, Heart,
} from "lucide-react";
import { ThreatFeedTicker } from "@/components/ThreatFeedTicker";

/* ══════════════════════════════════════════════════════════════
   PARTICLE CANVAS
══════════════════════════════════════════════════════════════ */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: .5, y: .5 });
  const frameRef = useRef(0);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const COLS = ["#e21227","#ff3c3c","#ff6b35","rgba(226,18,39,0.5)","rgba(255,255,255,0.4)","rgba(167,139,250,0.5)","rgba(0,229,255,0.3)","rgba(34,197,94,0.3)"];
    interface P { x:number;y:number;z:number;vx:number;vy:number;vz:number;r:number;alpha:number;col:string;type:number }
    const pts: P[] = Array.from({length:240},()=>({ x:Math.random()*cv.width,y:Math.random()*cv.height,z:Math.random()*1000,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,vz:-.5-Math.random()*1.5,r:1+Math.random()*3,alpha:.3+Math.random()*.7,col:COLS[Math.floor(Math.random()*COLS.length)],type:Math.floor(Math.random()*3) }));
    const onMouse=(e:MouseEvent)=>{ mouseRef.current={x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight}; };
    window.addEventListener("mousemove",onMouse);
    const draw=()=>{
      const w=cv.width,h=cv.height; ctx.clearRect(0,0,w,h);
      const fl=600,mx=(mouseRef.current.x-.5)*28,my=(mouseRef.current.y-.5)*18;
      pts.forEach(p=>{
        p.z+=p.vz; p.x+=p.vx+mx*.002; p.y+=p.vy+my*.002;
        if(p.z<=0)p.z=1000; if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0;
        const s=fl/(fl+p.z),px=(p.x-w/2)*s+w/2,py=(p.y-h/2)*s+h/2,r=Math.max(.3,p.r*s),al=Math.min(1,p.alpha*s*.8);
        ctx.globalAlpha=al;
        if(p.type===0){ const g=ctx.createRadialGradient(px,py,0,px,py,r*4); g.addColorStop(0,p.col); g.addColorStop(1,"transparent"); ctx.beginPath(); ctx.arc(px,py,r*4,0,Math.PI*2); ctx.fillStyle=g; ctx.fill(); ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fillStyle=p.col; ctx.fill(); }
        else if(p.type===1){ ctx.strokeStyle=p.col; ctx.lineWidth=r*.5; ctx.beginPath(); ctx.moveTo(px-r*3,py); ctx.lineTo(px+r*3,py); ctx.moveTo(px,py-r*3); ctx.lineTo(px,py+r*3); ctx.stroke(); }
        else{ ctx.strokeStyle=p.col; ctx.lineWidth=r*.4; ctx.beginPath(); ctx.arc(px,py,r*2.5,0,Math.PI*2); ctx.stroke(); }
        ctx.globalAlpha=1;
      });
      for(let i=0;i<pts.length;i++){ const s1=fl/(fl+pts[i].z),px1=(pts[i].x-w/2)*s1+w/2,py1=(pts[i].y-h/2)*s1+h/2; for(let j=i+1;j<Math.min(pts.length,i+9);j++){ const s2=fl/(fl+pts[j].z),px2=(pts[j].x-w/2)*s2+w/2,py2=(pts[j].y-h/2)*s2+h/2; const d=Math.sqrt((px1-px2)**2+(py1-py2)**2); if(d<130){ ctx.globalAlpha=(1-d/130)*.1; ctx.strokeStyle="#e21227"; ctx.lineWidth=.5; ctx.beginPath(); ctx.moveTo(px1,py1); ctx.lineTo(px2,py2); ctx.stroke(); ctx.globalAlpha=1; } } }
      frameRef.current=requestAnimationFrame(draw);
    };
    draw();
    return()=>{ cancelAnimationFrame(frameRef.current); window.removeEventListener("resize",resize); window.removeEventListener("mousemove",onMouse); };
  },[]);
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}><canvas ref={ref} style={{display:"block",width:"100%",height:"100%"}}/></div>;
}

/* ══════════════════════════════════════════════════════════════
   LIVE COUNTER
══════════════════════════════════════════════════════════════ */
function LiveCounter({target,suffix="",color="#e21227"}:{target:number;suffix?:string;color?:string}) {
  const [val,setVal]=useState(0); const ref=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{ if(!e.isIntersecting)return; obs.disconnect();
      let v=0; const step=target/(2000/16);
      const id=setInterval(()=>{ v=Math.min(v+step,target); setVal(Math.floor(v)); if(v>=target)clearInterval(id); },16);
    },{threshold:.3});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[target]);
  return <span ref={ref} style={{color}}>{val.toLocaleString()}{suffix}</span>;
}

/* ══════════════════════════════════════════════════════════════
   TYPEWRITER
══════════════════════════════════════════════════════════════ */
const PHRASES = [
  "اختبار الاختراق المتقدم بالذكاء الاصطناعي",
  "Advanced Penetration Testing AI",
  "Red Team · OSINT Ultra · Council 256 · Arsenal v3",
  "256 عقل ذكاء اصطناعي في وقت واحد",
  "Shell Generator v3 · Dark Web · Godmode 22x",
  "Swarm 32x · SIEM/SOAR · ZeroDay · ICS/SCADA",
  "مساعدك الهجومي الأول في الأمن السيبراني",
  "WiFi · BLE · RFID · Satellite · Drone SIGINT",
];
function TypewriterText({style={}}:{style?:CSSProperties}) {
  const [pi,setPi]=useState(0); const [txt,setTxt]=useState(""); const [del,setDel]=useState(false); const [ci,setCi]=useState(0);
  useEffect(()=>{
    const ph=PHRASES[pi];
    if(!del){ if(ci<ph.length){ const t=setTimeout(()=>{ setTxt(ph.slice(0,ci+1)); setCi(c=>c+1); },40+Math.random()*18); return()=>clearTimeout(t); } else{ const t=setTimeout(()=>setDel(true),2200); return()=>clearTimeout(t); } }
    else{ if(ci>0){ const t=setTimeout(()=>{ setTxt(ph.slice(0,ci-1)); setCi(c=>c-1); },20); return()=>clearTimeout(t); } else{ setDel(false); setPi(i=>(i+1)%PHRASES.length); } }
  },[ci,del,pi]);
  return <span style={style}>{txt}<span style={{display:"inline-block",width:2,height:"1em",background:"#e21227",marginLeft:2,verticalAlign:"middle",animation:"terminalBlink 1s step-end infinite",boxShadow:"0 0 8px #e21227"}}/></span>;
}

/* ══════════════════════════════════════════════════════════════
   HOLOGRAPHIC CARD
══════════════════════════════════════════════════════════════ */
function HoloCard({children,style={}}:{children:ReactNode;style?:CSSProperties}) {
  const ref=useRef<HTMLDivElement>(null); const [rot,setRot]=useState({x:0,y:0}); const [hov,setHov]=useState(false);
  return (
    <div ref={ref} style={{perspective:"1000px",...style}} onMouseMove={e=>{ const r=ref.current!.getBoundingClientRect(); setRot({x:-(e.clientY-r.top-r.height/2)/(r.height/2)*7,y:(e.clientX-r.left-r.width/2)/(r.width/2)*7}); }} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setRot({x:0,y:0});}}>
      <div style={{transform:`rotateX(${rot.x}deg) rotateY(${rot.y}deg) translateZ(${hov?8:0}px)`,transformStyle:"preserve-3d",transition:hov?"none":"transform .5s cubic-bezier(.23,1,.32,1)"}}>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({text}:{text:string}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:8,marginBottom:20}}>
      <div style={{width:20,height:1,background:"linear-gradient(90deg,transparent,#e21227)"}}/>
      <span style={{fontSize:10,fontFamily:"monospace",color:"rgba(226,18,39,0.75)",letterSpacing:"0.35em",fontWeight:700}}>{text}</span>
      <div style={{width:20,height:1,background:"linear-gradient(90deg,#e21227,transparent)"}}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const LIVE_STATS = [
  {label:"مستخدم نشط",  value:22480, suffix:"",  icon:Users,        col:"#e21227"},
  {label:"فحص اليوم",    value:142800,suffix:"+", icon:Target,       col:"#00e5ff"},
  {label:"CVE مُكتشف",   value:2341,  suffix:"",  icon:AlertTriangle,col:"#fbbf24"},
  {label:"نموذج AI",      value:20,    suffix:"+", icon:Brain,        col:"#a78bfa"},
  {label:"دقة التهديد",  value:99,    suffix:"%", icon:TrendingUp,   col:"#22c55e"},
  {label:"وضع عمل",       value:22,    suffix:"",  icon:Layers,       col:"#f97316"},
  {label:"عميل Swarm",   value:32,    suffix:"",  icon:Hexagon,      col:"#a78bfa"},
  {label:"شريك أمني",    value:48,    suffix:"+", icon:Award,        col:"#fbbf24"},
];

const FEATURES = [
  {icon:Brain,     title:"ذكاء اصطناعي متخصص",        desc:"نماذج مدرّبة خصيصاً على الأمن السيبراني — اختبار الاختراق، تحليل الثغرات، والأوامر الهجومية.",         color:"#e21227"},
  {icon:Terminal,  title:"ترمينال تفاعلي مدمج",       desc:"طرفية أوامر كاملة في المتصفح تتيح تنفيذ أوامر Shell وتفسير النتائج مباشرة بالذكاء الاصطناعي.",          color:"#ff6b35"},
  {icon:Eye,       title:"OSINT Ultra",               desc:"استخبارات مصادر مفتوحة متقدمة: دارك ويب، I2P، Freenet، ZeroNet، وتتبع البصمة الرقمية بالكامل.",         color:"#00e5ff"},
  {icon:Crosshair, title:"Red Team AI",               desc:"محاكاة هجمات حقيقية، تقييم الدفاعات، وتحليل نقاط الضعف من منظور APT متقدم.",                          color:"#a78bfa"},
  {icon:Server,    title:"Council Mode — 256 عقل",    desc:"256 نموذج ذكاء اصطناعي متخصص في وقت واحد: مخترق، محلل، مطور، محقق جنائي، وأكثر.",                       color:"#e21227"},
  {icon:Code2,     title:"Arsenal v3 — 180+ أداة",   desc:"ShellGen v3، JARVIS Pro، Parseltongue v4، RAGFlow v2، CVEWatch، وأدوات هجومية ودفاعية متكاملة.",           color:"#22c55e"},
  {icon:Radar,     title:"CVE Watcher Live",          desc:"مراقبة لحظية لـ NVD/CISA KEV/ExploitDB مع تنبيهات فورية وتحليل أثر تلقائي وتوليد PoC.",                  color:"#fbbf24"},
  {icon:Network,   title:"Network Interceptor Pro",   desc:"تحليل حركة الشبكة، فحص البروتوكولات، WiFi/BLE/RFID هجمات، واكتشاف الأجهزة المخفية.",                   color:"#f97316"},
  {icon:Fingerprint,title:"Digital Forensics AI",    desc:"Volatility3 + Rekall + YARA + BinaryNinja: استخراج الأدلة وإعادة تشكيل سلسلة الهجوم.",                    color:"#e21227"},
  {icon:Hexagon,   title:"Swarm Intelligence 32x",   desc:"32 عميل ذكاء اصطناعي مستقل يعملون بالتوازي على تحليل الأهداف وتنسيق الهجمات وتجميع النتائج.",            color:"#a78bfa"},
  {icon:ShieldCheck,title:"SIEM/SOAR/UEBA مدمج",    desc:"محرك أحداث أمنية 8.4M event/s مع 96 قاعدة SOAR وتحليل سلوك المستخدم UEBA آلياً.",                        color:"#00e5ff"},
  {icon:AlertTriangle,title:"Zero-Day Scanner v2",   desc:"فحص الثغرات المجهولة باستخدام AFL++ وLibFuzzer وتحليل السلوك الديناميكي والأنماط الشاذة.",                color:"#fbbf24"},
  {icon:Cpu,       title:"ICS/SCADA Attack Suite",   desc:"مسح Modbus/DNP3/Profinet، وكشف الثغرات في البنية التحتية الصناعية وأنظمة التحكم.",                        color:"#e21227"},
  {icon:Globe,     title:"Cloud Security CSPM",       desc:"AWS/GCP/Azure: كشف التكوينات الخاطئة، S3 exposure، IAM privilege escalation، وK8s escape vectors.",      color:"#00bfff"},
  {icon:Radio,     title:"SIGINT/RF Module",          desc:"تحليل الطيف الراديوي، ADS-B tracker، BLE eavesdrop، GPS spoofing، وتحليل الإشارات.",                       color:"#a78bfa"},
  {icon:Brain,     title:"AI Adversarial Suite",      desc:"LLM jailbreak، prompt injection، model poisoning، GAN attacks، voice cloning، deepfake generation.",        color:"#ff0080"},
];

const MODELS = [
  {name:"CHAT-GPT Fast",       tag:"سريع",         color:"#3b82f6",  icon:Zap},
  {name:"CHAT-GPT Thinking",   tag:"تفكير",         color:"#a855f7",  icon:Brain},
  {name:"KaliGPT Red Team",    tag:"هجومي",         color:"#e21227",  icon:Swords},
  {name:"GodMode 22x",         tag:"لا حدود",       color:"#f97316",  icon:Flame},
  {name:"Claude Opus 4",       tag:"تحليل",         color:"#00e5ff",  icon:BookOpen},
  {name:"Gemini 2.5 Flash",    tag:"متعدد",         color:"#34d399",  icon:Layers},
  {name:"DeepSeek V3",         tag:"استدلال",       color:"#00ffcc",  icon:Brain},
  {name:"Grok 3 Mini",         tag:"X.ai",          color:"#ff3333",  icon:Flame},
  {name:"Groq Llama 3.3",      tag:"3.3K/s",        color:"#ff6600",  icon:Zap},
  {name:"Cerebras Llama",      tag:"4.1K/s",        color:"#ff00aa",  icon:ZapIcon},
  {name:"NVIDIA NIM",          tag:"GPU فائق",      color:"#76ff00",  icon:Cpu},
  {name:"Ollama Local",        tag:"محلي مجاني",    color:"#00ff41",  icon:MonitorCheck},
];

const TOOLS = [
  {icon:Terminal,     name:"ShellGen v3",      desc:"توليد أوامر Shell هجومية متعددة الطبقات",  col:"#e21227",  cat:"OFFENSIVE"},
  {icon:Eye,          name:"OSINT Ultra",      desc:"استخبارات دارك ويب + I2P + Freenet",       col:"#00e5ff",  cat:"RECON"},
  {icon:Bug,          name:"CVEWatch Live",    desc:"مراقبة NVD/CISA/ExploitDB اللحظية",       col:"#a78bfa",  cat:"INTEL"},
  {icon:Network,      name:"NetScan Pro",      desc:"فحص الشبكات والبنية التحتية",              col:"#22c55e",  cat:"NETWORK"},
  {icon:Brain,        name:"Council 256",      desc:"256 عقل في آنٍ واحد",                      col:"#fbbf24",  cat:"AI"},
  {icon:Database,     name:"RAGFlow v2",       desc:"قاعدة معرفة 24.7M وثيقة أمنية",          col:"#00e5ff",  cat:"DB"},
  {icon:Radar,        name:"Threat Intel",     desc:"تحليل التهديدات APT اللحظية",              col:"#e21227",  cat:"INTEL"},
  {icon:Code2,        name:"JARVIS Pro",       desc:"مساعد برمجة هجومية متقدم",                col:"#f97316",  cat:"DEV"},
  {icon:LockIcon,     name:"CipherBreak v2",   desc:"RSA/AES/Kyber/ChaCha20 تحليل",            col:"#a78bfa",  cat:"CRYPTO"},
  {icon:Globe,        name:"DarkWeb Mon v2",   desc:"مراقبة الويب المظلم + I2P + Freenet",     col:"#e21227",  cat:"OSINT"},
  {icon:FlaskConical, name:"Parseltongue v4",  desc:"AFL++ + LibFuzzer shellcode متقدم",       col:"#22c55e",  cat:"EXPLOIT"},
  {icon:GitBranch,    name:"ChainBuilder v3",  desc:"بناء سلاسل الهجوم المتعددة المراحل",      col:"#00e5ff",  cat:"PIPELINE"},
  {icon:Fingerprint,  name:"Forensics AI",     desc:"Volatility3 + YARA + BinaryNinja",       col:"#fbbf24",  cat:"FORENSIC"},
  {icon:Key,          name:"PrivEsc AI v3",    desc:"580 مسار لرفع الصلاحيات تلقائياً",       col:"#e21227",  cat:"EXPLOIT"},
  {icon:Boxes,        name:"ArsenalHub v3",    desc:"مركز تحكم 180+ أداة",                     col:"#a78bfa",  cat:"HUB"},
  {icon:MonitorCheck, name:"GodMode 22x",      desc:"22 وضع بدون قيود",                        col:"#ff6b35",  cat:"GODMODE"},
  {icon:Hexagon,      name:"Swarm AI 32x",     desc:"32 عميل مستقل بالتوازي",                 col:"#a78bfa",  cat:"AI"},
  {icon:ShieldCheck,  name:"SIEM/SOAR/UEBA",   desc:"8.4M event/s + 96 قاعدة استجابة",        col:"#00e5ff",  cat:"DEFENSE"},
  {icon:AlertTriangle,name:"ZeroDay Scan v2",  desc:"AFL++ + LibFuzzer فحص مجهول",             col:"#fbbf24",  cat:"SCANNER"},
  {icon:Target,       name:"C2 Framework",     desc:"Cobalt Strike + Havoc + Sliver",          col:"#e21227",  cat:"C2"},
  {icon:Wifi,         name:"WiFi Attack Suite",desc:"WPA3/PMKID + BLE hijack + RFID clone",   col:"#00bfff",  cat:"WIRELESS"},
  {icon:Cpu,          name:"ICS/SCADA Suite",  desc:"Modbus + DNP3 + Profinet probes",         col:"#e21227",  cat:"ICS"},
  {icon:Globe2,       name:"Cloud CSPM",       desc:"AWS/GCP/Azure/K8s security posture",      col:"#00bfff",  cat:"CLOUD"},
  {icon:Radio,        name:"SIGINT Module",    desc:"RF spectrum + ADS-B + GPS spoofing",      col:"#a78bfa",  cat:"SIGINT"},
];

const COMPARISONS = [
  {feature:"تخصص الأمن السيبراني 100%",      kg:true, cg:false, cp:false},
  {feature:"Council Mode — 256 عقل",          kg:true, cg:false, cp:false},
  {feature:"GodMode 22x بدون قيود",           kg:true, cg:false, cp:false},
  {feature:"Arsenal v3 — 180+ أداة",          kg:true, cg:false, cp:false},
  {feature:"OSINT Ultra — دارك ويب + I2P",    kg:true, cg:false, cp:false},
  {feature:"ShellGen v3 — shellcode",          kg:true, cg:false, cp:false},
  {feature:"CVE Watcher — NVD/CISA لحظي",     kg:true, cg:false, cp:false},
  {feature:"نماذج متعددة المزودين (20+)",      kg:true, cg:false, cp:true },
  {feature:"Swarm Intelligence 32x",           kg:true, cg:false, cp:false},
  {feature:"SIEM/SOAR/UEBA مدمج",             kg:true, cg:false, cp:false},
  {feature:"ICS/SCADA Attack Suite",           kg:true, cg:false, cp:false},
  {feature:"WiFi/BLE/RFID/SIGINT",            kg:true, cg:false, cp:false},
  {feature:"Cloud CSPM — AWS/GCP/Azure",       kg:true, cg:false, cp:false},
  {feature:"AI Adversarial — LLM jailbreak",   kg:true, cg:false, cp:false},
  {feature:"دعم عربي متكامل",                  kg:true, cg:true,  cp:false},
];

const TESTIMONIALS = [
  {name:"محمد الشمري",   role:"Senior Pentester",    avatar:"M", text:"KaliGPT غيّر طريقة عملي كلياً. Council Mode وحده يساوي فريق من المختبرين. ما يمكن وصفه.", rating:5, col:"#e21227"},
  {name:"Sarah K.",      role:"Red Team Lead",        avatar:"S", text:"The Arsenal v3 is unmatched. ShellGen v3 + OSINT Ultra saved me 4 hours per engagement.", rating:5, col:"#00e5ff"},
  {name:"خالد العمري",   role:"CTF Champion",         avatar:"K", text:"GodMode 22x للـ CTF = الشفرة المطلقة. فزت في 3 CTF محلية بسبب هذه الأداة.", rating:5, col:"#a78bfa"},
  {name:"Alex R.",       role:"CISO @ SecureCorp",    avatar:"A", text:"We integrated KaliGPT into our threat intel pipeline. APT detection accuracy is 99.2%.", rating:5, col:"#22c55e"},
  {name:"يوسف المالكي",  role:"Security Researcher",  avatar:"Y", text:"Swarm 32x ثوري. أرسل 32 عميل يحللون هدفاً واحداً بالتوازي — النتائج خارقة المألوف.", rating:5, col:"#fbbf24"},
  {name:"Chen W.",       role:"Bug Bounty Hunter",     avatar:"C", text:"CVE Watcher + ZeroDay Scanner combo = $42K bounty last month. Game changer.",          rating:5, col:"#f97316"},
  {name:"رانيا السيد",   role:"SOC Analyst",          avatar:"R", text:"SIEM/SOAR/UEBA المدمج وفّر 70% من وقت الاستجابة للحوادث في فريقنا. لا مقارنة.",       rating:5, col:"#00e5ff"},
  {name:"Marcus T.",     role:"ICS Security Engineer", avatar:"M", text:"ICS/SCADA suite found 3 critical Modbus exposures in our OT network in 8 minutes.",    rating:5, col:"#e21227"},
];

const FAQS = [
  {q:"هل يمكن استخدام KaliGPT للأغراض التعليمية فقط؟",                    a:"نعم. KaliGPT مصمم للباحثين الأمنيين والمختبرين المرخصين وطلاب الأمن في بيئات اختبار قانونية حصراً."},
  {q:"ما الفرق بين KaliGPT وChatGPT العادي؟",                             a:"KaliGPT متخصص 100% في الأمن السيبراني بقاعدة معرفية هجومية/دفاعية، بينما ChatGPT عام ومحدود بقيود مشددة."},
  {q:"هل بياناتي محفوظة أم تُعالج محلياً؟",                                a:"تُعالج المحادثات عبر نموذج اللغة المختار. يمكن تشغيل النماذج المحلية Ollama/LM Studio بدون إرسال أي بيانات."},
  {q:"ما هو وضع المجلس Council Mode؟",                                    a:"وضع فريد يُشغّل 256 نموذج ذكاء اصطناعي متخصص في وقت واحد ثم يجمع نتائجهم في تقرير شامل ومركّب."},
  {q:"هل يدعم GodMode مفاتيح API الخاصة بي؟",                             a:"نعم. OpenAI/Anthropic/Groq/Gemini/DeepSeek/xAI/Mistral/Together/Fireworks/NVIDIA NIM والمزيد. التبديل تلقائي."},
  {q:"هل يعمل KaliGPT بدون إنترنت؟",                                       a:"نعم عبر Local Engine المدمج: Ollama v0.38+ وLM Studio مع llama3.3/qwen2.5/phi4 وغيرها."},
  {q:"ما هو Swarm Intelligence 32x؟",                                      a:"نظام يُشغّل 32 عميل ذكاء اصطناعي مستقل بالتوازي يتعاونون على هدف واحد من زوايا مختلفة ويجمعون النتائج."},
  {q:"كيف يعمل ICS/SCADA Attack Suite؟",                                   a:"يفحص البنية التحتية الصناعية عبر بروتوكولات Modbus/DNP3/Profinet/EtherNet-IP ويكشف ثغرات OT/IT."},
  {q:"ما هو SIGINT Module؟",                                               a:"وحدة تحليل الطيف الراديوي: ADS-B tracking، BLE eavesdrop، GPS spoofing، RFID cloning، تحليل إشارات راديو."},
  {q:"هل يدعم SIEM/SOAR التكامل مع الأنظمة الخارجية؟",                     a:"نعم: Slack/PagerDuty/Webhooks المخصصة. يدعم QRadar/Splunk/Elastic SIEM عبر API مع 96 قاعدة تلقائية."},
];

const LIVE_ACTIVITY = [
  {type:"SCAN",    msg:"Red team scan on 192.168.1.0/24 — 47 hosts found",          col:"#e21227", time:"now"},
  {type:"CVE",     msg:"CVE-2025-1337 CVSS 10.0 — Apache RCE — PoC available",      col:"#fbbf24", time:"3s"},
  {type:"OSINT",   msg:"OSINT sweep: 31 subdomains, 9 APIs, 2 login panels",         col:"#00e5ff", time:"7s"},
  {type:"SWARM",   msg:"Swarm session: 32 agents analyzing target in parallel",      col:"#22c55e", time:"12s"},
  {type:"ICS",     msg:"ICS scan: Modbus exposure found on port 502 — CRITICAL",    col:"#e21227", time:"16s"},
  {type:"COUNCIL", msg:"Council 256: analyzing APT-41 TTPs — 98% confidence",       col:"#a78bfa", time:"22s"},
  {type:"WIFI",    msg:"WPA3 PMKID capture: 14 handshakes — processing",            col:"#00bfff", time:"28s"},
  {type:"CLOUD",   msg:"AWS CSPM: 3 public S3 buckets, IAM misconfiguration",       col:"#fbbf24", time:"34s"},
  {type:"SIGINT",  msg:"ADS-B: 142 aircraft tracked, 2 anomalous transponders",     col:"#a78bfa", time:"40s"},
  {type:"SOAR",    msg:"SOAR auto-response: threat isolated, ticket created",        col:"#22c55e", time:"46s"},
];

const COMMUNITY_STATS = [
  {label:"أعضاء Discord",     value:18400, suffix:"+", icon:MessageSquare, col:"#5865F2"},
  {label:"GitHub Stars",      value:9200,  suffix:"+", icon:Github,        col:"#22c55e"},
  {label:"CTF انتصارات",      value:1240,  suffix:"",  icon:Award,         col:"#fbbf24"},
  {label:"مساهم مفتوح",       value:340,   suffix:"+", icon:Heart,         col:"#e21227"},
];

const PARTNERS = [
  {name:"Kali Linux",  col:"#3572A5"}, {name:"Metasploit",  col:"#e21227"},
  {name:"Burp Suite",  col:"#ff6600"}, {name:"OWASP",       col:"#0080ff"},
  {name:"OpenAI",      col:"#00ff41"}, {name:"Anthropic",   col:"#00e5ff"},
  {name:"Groq",        col:"#ff6600"}, {name:"DeepSeek",    col:"#00ffcc"},
  {name:"NVD/NIST",   col:"#fbbf24"}, {name:"CISA",        col:"#e21227"},
  {name:"Shodan",      col:"#f97316"}, {name:"VT",          col:"#22c55e"},
];

const WHATS_NEW = [
  {ver:"v6.0", date:"يونيو 2025",  items:["Swarm AI 32x","ICS/SCADA Suite","SIGINT Module","AI Adversarial Suite","Cloud CSPM v2","GodMode 22x"]},
  {ver:"v5.0", date:"مارس 2025",  items:["SIEM/SOAR/UEBA","ZeroDay Scanner v2","WiFi/BLE/RFID","Council 256 Ultra","Arsenal v3"]},
  {ver:"v4.0", date:"يناير 2025",  items:["Council Mode","GodMode 18x","Swarm AI 16x","CVE Watcher","Arsenal v2"]},
];

/* ══════════════════════════════════════════════════════════════
   TERMINAL DEMO
══════════════════════════════════════════════════════════════ */
function TerminalDemo() {
  const lines = [
    {text:"$ kaligpt --mode red-team --swarm 32 --target corp.example.com", col:"#00ff41", delay:0},
    {text:"[*] Swarm 32x initialized — targeting corp.example.com...", col:"#a78bfa", delay:600},
    {text:"[*] Agent SA-01 RECON: DNS enum → 31 subdomains discovered", col:"#00e5ff", delay:1100},
    {text:"[*] Agent SA-02 OSINT: dark-web → 4.2M leaked credentials found", col:"#00e5ff", delay:1600},
    {text:"[!] CVE-2025-1337 (CVSS 10.0) — Apache 2.4.x on admin.corp.example.com", col:"#fbbf24", delay:2200},
    {text:"[*] Agent SA-03 EXPLOIT: generating RCE payload (polymorphic)...", col:"#a78bfa", delay:2800},
    {text:"[*] Council 256 reviewing findings — consensus: 99.1% exploitable", col:"#22c55e", delay:3400},
    {text:"[*] SIEM/SOAR alert: auto-ticket created, team notified", col:"#00e5ff", delay:4000},
    {text:"[+] ICS scan: Modbus port 502 exposed — CRITICAL industrial risk", col:"#e21227", delay:4600},
    {text:"[✓] Report: 89 findings, 23 critical, 31 high — PDF generated", col:"#e21227", delay:5300},
  ];
  const [vis,setVis]=useState(0);
  useEffect(()=>{ lines.forEach(({delay},i)=>setTimeout(()=>setVis(v=>Math.max(v,i+1)),delay)); },[]);
  return (
    <div style={{background:"#040404",borderRadius:16,border:"1px solid rgba(0,229,255,0.15)",boxShadow:"0 0 48px rgba(0,229,255,0.07),0 24px 60px rgba(0,0,0,0.6)",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:"#ef4444"}}/><div style={{width:10,height:10,borderRadius:"50%",background:"#eab308"}}/><div style={{width:10,height:10,borderRadius:"50%",background:"#22c55e"}}/>
        <span style={{fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.3)",marginLeft:8}}>kaligpt v6.0 — bash · Swarm 32x · Red Team Mode</span>
        <span style={{marginLeft:"auto",fontSize:8,fontFamily:"monospace",color:"rgba(34,197,94,0.5)"}}>● LIVE</span>
      </div>
      <div style={{padding:16,fontFamily:"monospace",fontSize:12,lineHeight:2,minHeight:240}}>
        {lines.slice(0,vis).map((l,i)=><div key={i} style={{color:l.col}}>{l.text}</div>)}
        {vis<lines.length&&<span style={{display:"inline-block",width:8,height:14,background:"#00ff41",animation:"terminalBlink 1s step-end infinite",verticalAlign:"middle"}}/>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   THREAT MAP VISUALIZATION
══════════════════════════════════════════════════════════════ */
function ThreatMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  useEffect(()=>{
    const cv=ref.current; if(!cv)return;
    const ctx=cv.getContext("2d")!;
    cv.width=700; cv.height=350;
    const nodes=[
      {x:120,y:80,label:"US-E",attacks:142,col:"#e21227"},{x:80,y:180,label:"US-W",attacks:89,col:"#fbbf24"},
      {x:280,y:60,label:"EU-W",attacks:221,col:"#e21227"},{x:320,y:140,label:"EU-N",attacks:67,col:"#a78bfa"},
      {x:420,y:100,label:"ME",attacks:188,col:"#fbbf24"},{x:380,y:200,label:"AF",attacks:44,col:"#22c55e"},
      {x:540,y:80,label:"AS",attacks:312,col:"#e21227"},{x:580,y:180,label:"APAC",attacks:156,col:"#fbbf24"},
      {x:200,y:260,label:"SA",attacks:55,col:"#22c55e"},{x:450,y:280,label:"OC",attacks:31,col:"#00e5ff"},
    ];
    const streams: {from:number;to:number;progress:number;speed:number}[] = [];
    for(let i=0;i<20;i++) streams.push({from:Math.floor(Math.random()*nodes.length),to:Math.floor(Math.random()*nodes.length),progress:Math.random(),speed:.004+Math.random()*.008});
    let t=0;
    const draw=()=>{
      t+=.012; ctx.clearRect(0,0,700,350);
      ctx.fillStyle="#050505"; ctx.fillRect(0,0,700,350);
      const bg=ctx.createRadialGradient(350,175,0,350,175,350);
      bg.addColorStop(0,"rgba(226,18,39,0.04)"); bg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=bg; ctx.fillRect(0,0,700,350);

      streams.forEach(s=>{
        s.progress=(s.progress+s.speed)%1;
        const fn=nodes[s.from], tn=nodes[s.to]; if(fn===tn)return;
        const px=fn.x+(tn.x-fn.x)*s.progress, py=fn.y+(tn.y-fn.y)*s.progress;
        const g=ctx.createLinearGradient(fn.x,fn.y,tn.x,tn.y);
        g.addColorStop(0,"rgba(226,18,39,0)"); g.addColorStop(.5,"rgba(226,18,39,0.35)"); g.addColorStop(1,"rgba(226,18,39,0)");
        ctx.beginPath(); ctx.moveTo(fn.x,fn.y); ctx.lineTo(tn.x,tn.y); ctx.strokeStyle=g; ctx.lineWidth=.6; ctx.stroke();
        const grd=ctx.createRadialGradient(px,py,0,px,py,5);
        grd.addColorStop(0,"rgba(226,18,39,0.9)"); grd.addColorStop(1,"rgba(226,18,39,0)");
        ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
      });

      nodes.forEach((n,i)=>{
        const pulse=.6+.4*Math.sin(t*2+i*.7);
        const r=6+n.attacks/80*4;
        const gn=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r*3);
        gn.addColorStop(0,n.col+"aa"); gn.addColorStop(1,n.col+"00");
        ctx.beginPath(); ctx.arc(n.x,n.y,r*3*pulse,0,Math.PI*2); ctx.fillStyle=gn; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2); ctx.fillStyle=n.col; ctx.fill();
        ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font="bold 9px monospace";
        ctx.fillText(n.label,n.x-10,n.y-12);
        ctx.fillStyle=n.col; ctx.font="7px monospace";
        ctx.fillText(`${n.attacks}/h`,n.x-10,n.y+20);
      });
      frame.current=requestAnimationFrame(draw);
    };
    draw();
    return()=>cancelAnimationFrame(frame.current);
  },[]);
  return <canvas ref={ref} style={{width:"100%",height:"auto",borderRadius:12,border:"1px solid rgba(226,18,39,0.15)"}}/>;
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [,navigate]=useLocation();
  const [faqOpen,setFaqOpen]=useState<number|null>(null);
  const [actIdx,setActIdx]=useState(0);
  const [toolCat,setToolCat]=useState("ALL");
  const [newsCat,setNewsCat]=useState(0);

  useEffect(()=>{ const id=setInterval(()=>setActIdx(i=>(i+1)%LIVE_ACTIVITY.length),2000); return()=>clearInterval(id); },[]);

  const CATS=["ALL","OFFENSIVE","RECON","INTEL","NETWORK","AI","EXPLOIT","FORENSIC","GODMODE","DEFENSE","WIRELESS","ICS","CLOUD","SIGINT"];
  const filtered=toolCat==="ALL"?TOOLS:TOOLS.filter(t=>t.cat===toolCat);

  return (
    <div style={{background:"#000",color:"#fff",minHeight:"100vh",overflowX:"hidden",position:"relative"}}>
      <style>{`
        @keyframes terminalBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pulse3d{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glitch{0%,90%,100%{transform:translate(0)}91%{transform:translate(-2px,1px)}93%{transform:translate(2px,-1px)}95%{transform:translate(-1px,2px)}97%{transform:translate(1px,-2px)}}
        @keyframes scanline{from{top:-2px}to{top:100%}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .holo-btn{transition:all .3s ease}.holo-btn:hover{filter:brightness(1.15);transform:translateY(-2px)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.02)}::-webkit-scrollbar-thumb{background:rgba(226,18,39,0.3);border-radius:2px}
      `}</style>

      <ParticleCanvas />

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(226,18,39,0.12)",background:"rgba(0,0,0,0.88)"}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#e21227,#c4101f)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 22px rgba(226,18,39,0.55)"}}>
              <Shield style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <span style={{fontSize:18,fontWeight:900,letterSpacing:"-0.5px"}}><span style={{color:"#e21227"}}>Kali</span>GPT</span>
              <div style={{fontSize:8,fontFamily:"monospace",color:"rgba(255,255,255,0.25)",letterSpacing:"0.2em"}}>v6.0 · ARSENAL MODE ULTRA</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            {[["الميزات","features"],["الترسانة","arsenal"],["ما الجديد","changelog"],["الأسعار","pricing"],["FAQ","faq"]].map(([l,id])=>(
              <button key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"})}
                style={{fontSize:13,color:"rgba(255,255,255,0.45)",background:"none",border:"none",cursor:"pointer",transition:"color .2s"}}
                onMouseEnter={e=>(e.currentTarget.style.color="#fff")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.45)")}>{l}</button>
            ))}
            <button onClick={()=>navigate("/app")} className="holo-btn" style={{padding:"8px 22px",borderRadius:10,fontSize:12,fontWeight:700,background:"linear-gradient(135deg,#e21227,#c4101f)",color:"#fff",border:"none",cursor:"pointer",boxShadow:"0 0 22px rgba(226,18,39,0.4)"}}>
              ابدأ الآن ←
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",zIndex:10,padding:"120px 24px 80px",textAlign:"center"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(226,18,39,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(226,18,39,0.055) 1px,transparent 1px)",backgroundSize:"60px 60px",transform:"perspective(600px) rotateX(35deg) scaleX(1.6)",transformOrigin:"50% 0%",maskImage:"linear-gradient(to bottom,transparent 0%,black 30%,black 60%,transparent 100%)",WebkitMaskImage:"linear-gradient(to bottom,transparent 0%,black 30%,black 60%,transparent 100%)"}}/>
        </div>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:1}}>
          <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(226,18,39,0.5),rgba(0,229,255,0.3),rgba(226,18,39,0.5),transparent)",animation:"scanline 8s linear infinite",boxShadow:"0 0 20px rgba(226,18,39,0.3)"}}/>
        </div>

        {/* Badge */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 18px",borderRadius:100,border:"1px solid rgba(226,18,39,0.3)",background:"rgba(226,18,39,0.06)",marginBottom:28,backdropFilter:"blur(10px)"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e",animation:"terminalBlink 1.5s step-end infinite",display:"inline-block"}}/>
          <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.6)",letterSpacing:"0.2em"}}>
            NEW v6.0: Swarm 32x · ICS/SCADA · SIGINT · Cloud CSPM · AI Adversarial
          </span>
        </div>

        {/* Title */}
        <h1 style={{fontSize:"clamp(44px,7.5vw,96px)",fontWeight:900,letterSpacing:"-3px",lineHeight:1,marginBottom:24,position:"relative",zIndex:1}}>
          <span style={{color:"#e21227",position:"relative",display:"inline-block"}}>
            KALI
            <span aria-hidden style={{position:"absolute",left:0,top:0,color:"#e21227",clipPath:"inset(30% 0 50% 0)",animation:"glitch 4s infinite",opacity:.7}}>KALI</span>
            <span aria-hidden style={{position:"absolute",left:0,top:0,color:"#00e5ff",clipPath:"inset(60% 0 20% 0)",animation:"glitch 4s infinite",animationDelay:".5s",opacity:.4}}>KALI</span>
          </span>
          <span style={{color:"#fff"}}>GPT</span>
          <br/>
          <span style={{fontSize:"clamp(24px,4vw,54px)",color:"rgba(255,255,255,0.38)",fontWeight:700,letterSpacing:"-1px"}}>
            الذكاء الاصطناعي الهجومي
          </span>
        </h1>

        <div style={{height:42,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:32}}>
          <TypewriterText style={{fontSize:"clamp(14px,2vw,20px)",color:"rgba(255,255,255,0.42)",fontFamily:"monospace"}}/>
        </div>

        {/* CTAs */}
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:52}}>
          <button onClick={()=>navigate("/app")} className="holo-btn" style={{display:"inline-flex",alignItems:"center",gap:10,padding:"16px 44px",borderRadius:14,background:"linear-gradient(135deg,#e21227 0%,#c4101f 50%,#a00d1a 100%)",color:"#fff",fontSize:16,fontWeight:800,border:"none",cursor:"pointer",boxShadow:"0 0 64px rgba(226,18,39,0.45),0 12px 32px rgba(226,18,39,0.25)"}}>
            <Terminal style={{width:20,height:20}}/> ابدأ مجاناً
          </button>
          <button onClick={()=>document.getElementById("terminal-demo")?.scrollIntoView({behavior:"smooth"})} style={{display:"inline-flex",alignItems:"center",gap:10,padding:"16px 32px",borderRadius:14,background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.6)",fontSize:15,fontWeight:500,border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",transition:"all .3s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.25)";(e.currentTarget as HTMLElement).style.color="#fff";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.6)";}}>
            <Play style={{width:16,height:16}}/> شاهد العرض
          </button>
          <button onClick={()=>document.getElementById("changelog")?.scrollIntoView({behavior:"smooth"})} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"16px 24px",borderRadius:14,background:"rgba(226,18,39,0.08)",color:"rgba(226,18,39,0.7)",fontSize:13,fontWeight:600,border:"1px solid rgba(226,18,39,0.2)",cursor:"pointer",transition:"all .3s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(226,18,39,0.45)";(e.currentTarget as HTMLElement).style.color="#e21227";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(226,18,39,0.2)";(e.currentTarget as HTMLElement).style.color="rgba(226,18,39,0.7)";}}>
            <Rocket style={{width:14,height:14}}/> ما الجديد v6.0
          </button>
        </div>

        {/* Live activity */}
        <div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px",borderRadius:12,background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(10px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:9,fontFamily:"monospace",color:"rgba(255,255,255,0.3)",letterSpacing:"0.3em"}}>LIVE</span>
            <span style={{width:5,height:5,borderRadius:"50%",background:LIVE_ACTIVITY[actIdx].col,boxShadow:`0 0 8px ${LIVE_ACTIVITY[actIdx].col}`,display:"inline-block",animation:"terminalBlink 1s step-end infinite"}}/>
            <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.45)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              [{LIVE_ACTIVITY[actIdx].type}] {LIVE_ACTIVITY[actIdx].msg}
            </span>
            <span style={{fontSize:9,fontFamily:"monospace",color:"rgba(255,255,255,0.2)",flexShrink:0}}>{LIVE_ACTIVITY[actIdx].time} ago</span>
          </div>
        </div>

        <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:6,animation:"float 2s ease-in-out infinite"}}>
          <span style={{fontSize:9,fontFamily:"monospace",color:"rgba(255,255,255,0.18)",letterSpacing:"0.3em"}}>SCROLL</span>
          <ChevronDown style={{width:16,height:16,color:"rgba(255,255,255,0.18)"}}/>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section style={{padding:"64px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(226,18,39,0.02)"}}>
        <div style={{maxWidth:1280,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:20}}>
          {LIVE_STATS.map((s,i)=>{ const Icon=s.icon; return (
            <div key={i} style={{textAlign:"center",padding:"20px 12px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
              <Icon style={{width:22,height:22,color:s.col,margin:"0 auto 10px"}}/>
              <div style={{fontSize:"clamp(22px,3vw,34px)",fontWeight:900,fontFamily:"monospace",letterSpacing:"-1px"}}>
                <LiveCounter target={s.value} suffix={s.suffix} color={s.col}/>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.32)",marginTop:4,fontFamily:"monospace"}}>{s.label}</div>
            </div>
          ); })}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:"100px 24px",position:"relative",zIndex:10}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:60}}>
            <SectionLabel text="CAPABILITIES v6.0"/>
            <h2 style={{fontSize:"clamp(28px,4vw,50px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:12}}>16 قدرة لا مثيل لها</h2>
            <p style={{color:"rgba(255,255,255,0.32)",fontSize:15,maxWidth:580,margin:"0 auto"}}>منصة شاملة تجمع أقوى أدوات الأمن السيبراني الهجومي والدفاعي مع أحدث نماذج الذكاء الاصطناعي</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
            {FEATURES.map((f,i)=>{ const Icon=f.icon; return (
              <HoloCard key={i}>
                <div style={{padding:22,borderRadius:18,background:"rgba(255,255,255,0.03)",border:`1px solid ${f.color}16`,boxShadow:"0 4px 24px rgba(0,0,0,0.3)",position:"relative",overflow:"hidden",transition:"all .3s"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${f.color}35`;(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 32px ${f.color}14`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${f.color}16`;(e.currentTarget as HTMLElement).style.boxShadow="0 4px 24px rgba(0,0,0,0.3)";}}>
                  <div style={{position:"absolute",top:0,right:0,width:80,height:80,background:`radial-gradient(circle,${f.color}08,transparent)`,borderRadius:"0 18px 0 80px",pointerEvents:"none"}}/>
                  <div style={{width:42,height:42,borderRadius:11,background:`${f.color}14`,border:`1px solid ${f.color}28`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                    <Icon style={{width:20,height:20,color:f.color}}/>
                  </div>
                  <h3 style={{fontSize:13.5,fontWeight:700,marginBottom:7}}>{f.title}</h3>
                  <p style={{fontSize:11.5,color:"rgba(255,255,255,0.38)",lineHeight:1.7}}>{f.desc}</p>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${f.color}32,transparent)`}}/>
                </div>
              </HoloCard>
            ); })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,229,255,0.008)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:60}}>
            <SectionLabel text="HOW IT WORKS"/>
            <h2 style={{fontSize:"clamp(26px,3.8vw,46px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:10}}>أربع خطوات للسيطرة الكاملة</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:14,maxWidth:480,margin:"0 auto"}}>من الإعداد إلى التقرير في دقائق — لا خبرة مسبقة مطلوبة</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,position:"relative"}}>
            {/* connector line */}
            <div style={{position:"absolute",top:36,left:"12.5%",right:"12.5%",height:1,background:"linear-gradient(90deg,transparent,rgba(226,18,39,0.3),rgba(0,229,255,0.3),rgba(226,18,39,0.3),transparent)",pointerEvents:"none",display:"none"}}/>
            {[
              {step:"01",emoji:"🔑",title:"اتصل بمزودك",desc:"أضف مفاتيح API من Groq أو OpenAI أو Gemini أو أي من 20+ مزود — أو ابدأ بدون مفتاح مع النماذج المجانية",col:"#e21227"},
              {step:"02",emoji:"⚡",title:"اختر وضع الهجوم",desc:"Council 256، GodMode 22x، Swarm 32x، Arsenal v3 — كل وضع مصمم لسيناريو محدد",col:"#fbbf24"},
              {step:"03",emoji:"🎯",title:"شغّل الاستطلاع",desc:"OSINT Ultra يجمع البيانات تلقائياً — ثغرات CVE، شبكات، أهداف — كل شيء في ثوانٍ",col:"#00e5ff"},
              {step:"04",emoji:"📊",title:"احصل على التقرير",desc:"تقرير احترافي كامل مع PoC والتوصيات والترميز اللوني حسب خطورة كل ثغرة",col:"#22c55e"},
            ].map((s,i)=>(
              <HoloCard key={i}>
                <div style={{padding:"28px 24px",borderRadius:20,background:"rgba(255,255,255,0.025)",border:`1px solid ${s.col}18`,position:"relative",overflow:"hidden",textAlign:"center"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.col}55,transparent)`}}/>
                  <div style={{fontSize:9,fontFamily:"monospace",fontWeight:700,color:`${s.col}66`,letterSpacing:"0.3em",marginBottom:12}}>STEP {s.step}</div>
                  <div style={{fontSize:36,marginBottom:14}}>{s.emoji}</div>
                  <h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:"#fff"}}>{s.title}</h3>
                  <p style={{fontSize:11.5,color:"rgba(255,255,255,0.38)",lineHeight:1.75}}>{s.desc}</p>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.col}30,transparent)`}}/>
                </div>
              </HoloCard>
            ))}
          </div>
          {/* CTA under steps */}
          <div style={{textAlign:"center",marginTop:40}}>
            <button onClick={()=>navigate("/app")} className="holo-btn" style={{display:"inline-flex",alignItems:"center",gap:10,padding:"14px 36px",borderRadius:12,background:"linear-gradient(135deg,#e21227,#c4101f)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",boxShadow:"0 0 40px rgba(226,18,39,0.3)"}}>
              ابدأ الآن — مجاناً <ArrowRight style={{width:15,height:15}}/>
            </button>
          </div>
        </div>
      </section>

      {/* ── AI SPEED COMPARISON ── */}
      <section style={{padding:"80px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="AI SPEED BENCHMARK"/>
            <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:8}}>أسرع نماذج الذكاء الاصطناعي</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>مقارنة سرعة توليد الرموز — رموز/ثانية</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              {name:"Cerebras Llama 3.3",speed:2100,col:"#ff00aa",badge:"FASTEST"},
              {name:"Groq Llama 3.3 70B", speed:1800,col:"#ff6600",badge:"ULTRA"},
              {name:"Groq Mixtral 8x7B",  speed:1400,col:"#f97316",badge:"FAST"},
              {name:"DeepSeek R2",         speed:900, col:"#00e5ff",badge:"SMART"},
              {name:"Gemini Flash 2.0",    speed:780, col:"#fbbf24",badge:""},
              {name:"GPT-4o",              speed:320, col:"#74aa9c",badge:""},
              {name:"Claude Sonnet 3.7",   speed:290, col:"#d97706",badge:""},
              {name:"Ollama Local",         speed:180, col:"#00ff41",badge:"LOCAL"},
            ].map((m,i)=>(
              <div key={m.name} style={{display:"flex",alignItems:"center",gap:14,padding:"8px 0"}}>
                <div style={{width:160,fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.45)",textAlign:"right",flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.name}</div>
                <div style={{flex:1,height:20,background:"rgba(255,255,255,0.04)",borderRadius:6,overflow:"hidden",position:"relative"}}>
                  <div style={{width:`${(m.speed/2100)*100}%`,height:"100%",background:`linear-gradient(90deg,${m.col}44,${m.col})`,borderRadius:6,transition:"width 1s ease",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                    <span style={{fontSize:9,fontFamily:"monospace",fontWeight:700,color:"rgba(255,255,255,0.8)",whiteSpace:"nowrap"}}>{m.speed.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{width:52,flexShrink:0,display:"flex",justifyContent:"flex-end"}}>
                  {m.badge&&<span style={{fontSize:7.5,fontFamily:"monospace",fontWeight:800,padding:"2px 5px",borderRadius:4,background:`${m.col}18`,color:m.col,border:`1px solid ${m.col}30`,letterSpacing:"0.1em"}}>{m.badge}</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,padding:"12px 18px",borderRadius:10,background:"rgba(226,18,39,0.04)",border:"1px solid rgba(226,18,39,0.15)",display:"flex",alignItems:"center",gap:12}}>
            <Zap style={{width:14,height:14,color:"#e21227",flexShrink:0}}/>
            <p style={{fontSize:11.5,color:"rgba(255,255,255,0.38)"}}>KaliGPT يختار تلقائياً أسرع نموذج متاح لديك — ويتبدّل للاحتياطي إذا كان الأول مشغولاً.</p>
          </div>
        </div>
      </section>

      {/* ── TERMINAL DEMO ── */}
      <section id="terminal-demo" style={{padding:"80px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="LIVE DEMO — SWARM 32x"/>
            <h2 style={{fontSize:"clamp(24px,3.5vw,44px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:10}}>شاهد KaliGPT v6.0 في العمل</h2>
            <p style={{color:"rgba(255,255,255,0.32)",fontSize:14}}>جلسة Red Team حقيقية — Swarm 32x من الاستطلاع إلى التقرير</p>
          </div>
          <TerminalDemo/>
          <div style={{display:"flex",justifyContent:"center",marginTop:28}}>
            <button onClick={()=>navigate("/app")} className="holo-btn" style={{display:"inline-flex",alignItems:"center",gap:10,padding:"14px 38px",borderRadius:12,background:"linear-gradient(135deg,#e21227,#c4101f)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",boxShadow:"0 0 40px rgba(226,18,39,0.35)"}}>
              جرّب الآن — مجاناً <ChevronRight style={{width:16,height:16}}/>
            </button>
          </div>
        </div>
      </section>

      {/* ── THREAT MAP ── */}
      <section style={{padding:"80px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(226,18,39,0.015)"}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <SectionLabel text="GLOBAL THREAT MAP"/>
            <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:8}}>خريطة التهديدات العالمية</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>هجمات مكتشفة ومُتتبّعة لحظياً من 10 مناطق</p>
          </div>
          <ThreatMap/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:20}}>
            {[{label:"هجمات/ساعة",val:"1,105",col:"#e21227"},{label:"ثغرات نشطة",val:"23",col:"#fbbf24"},{label:"مناطق مراقبة",val:"10",col:"#00e5ff"},{label:"معدل الكشف",val:"99.2%",col:"#22c55e"}].map(s=>(
              <div key={s.label} style={{textAlign:"center",padding:"14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{fontSize:20,fontWeight:900,fontFamily:"monospace",color:s.col}}>{s.val}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:4,fontFamily:"monospace"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODELS ── */}
      <section style={{padding:"80px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="AI MODELS — 20+"/>
            <h2 style={{fontSize:"clamp(24px,3.5vw,42px)",fontWeight:800,letterSpacing:"-1.5px"}}>20+ نموذج ذكاء اصطناعي</h2>
            <p style={{color:"rgba(255,255,255,0.3)",marginTop:8,fontSize:13}}>مختلفة التخصصات والسرعات — واجهة واحدة</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:11}}>
            {MODELS.map((m,i)=>{ const Icon=m.icon; return (
              <HoloCard key={i}>
                <div style={{padding:"16px 14px",borderRadius:14,background:`${m.color}08`,border:`1px solid ${m.color}22`,textAlign:"center",transition:"all .25s",cursor:"pointer"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${m.color}14`;(e.currentTarget as HTMLElement).style.borderColor=`${m.color}42`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${m.color}08`;(e.currentTarget as HTMLElement).style.borderColor=`${m.color}22`;}}>
                  <Icon style={{width:22,height:22,color:m.color,margin:"0 auto 9px"}}/>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#fff",marginBottom:5}}>{m.name}</div>
                  <span style={{fontSize:9,fontFamily:"monospace",padding:"2px 8px",borderRadius:6,background:`${m.color}1e`,color:m.color,fontWeight:700}}>{m.tag}</span>
                </div>
              </HoloCard>
            ); })}
          </div>
        </div>
      </section>

      {/* ── ARSENAL ── */}
      <section id="arsenal" style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:1400,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="ARSENAL V3"/>
            <h2 style={{fontSize:"clamp(28px,4vw,50px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:8}}>180+ أداة متخصصة</h2>
            <p style={{color:"rgba(255,255,255,0.32)",fontSize:14}}>هجومية · دفاعية · استخباراتية · جنائية · صناعية · سحابية</p>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginBottom:28}}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setToolCat(c)} style={{padding:"5px 14px",borderRadius:20,fontSize:10,fontFamily:"monospace",fontWeight:700,letterSpacing:"0.1em",cursor:"pointer",transition:"all .2s",background:toolCat===c?"rgba(226,18,39,0.2)":"rgba(255,255,255,0.03)",color:toolCat===c?"#e21227":"rgba(255,255,255,0.32)",border:`1px solid ${toolCat===c?"rgba(226,18,39,0.4)":"rgba(255,255,255,0.06)"}`}}>{c}</button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:9}}>
            {filtered.map(t=>{ const Icon=t.icon; return (
              <HoloCard key={t.name}>
                <div style={{padding:14,borderRadius:13,background:`${t.col}07`,border:`1px solid ${t.col}1e`,transition:"all .2s",cursor:"pointer",display:"flex",gap:11,alignItems:"flex-start"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${t.col}13`;(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${t.col}07`;(e.currentTarget as HTMLElement).style.transform="none";}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`${t.col}17`,border:`1px solid ${t.col}2e`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon style={{width:16,height:16,color:t.col}}/>
                  </div>
                  <div>
                    <div style={{fontSize:11.5,fontWeight:700,color:"#fff",marginBottom:3}}>{t.name}</div>
                    <div style={{fontSize:9.5,color:"rgba(255,255,255,0.33)",marginBottom:5,lineHeight:1.4}}>{t.desc}</div>
                    <span style={{fontSize:7.5,fontFamily:"monospace",padding:"1.5px 5px",borderRadius:4,background:`${t.col}17`,color:t.col,fontWeight:700}}>{t.cat}</span>
                  </div>
                </div>
              </HoloCard>
            ); })}
          </div>
        </div>
      </section>

      {/* ── WHAT'S NEW ── */}
      <section id="changelog" style={{padding:"80px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(226,18,39,0.015)"}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="CHANGELOG"/>
            <h2 style={{fontSize:"clamp(24px,3.5vw,42px)",fontWeight:800,letterSpacing:"-1.5px"}}>ما الجديد؟</h2>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:28}}>
            {WHATS_NEW.map((w,i)=>(
              <button key={w.ver} onClick={()=>setNewsCat(i)} style={{padding:"5px 16px",borderRadius:20,fontSize:11,fontFamily:"monospace",fontWeight:700,cursor:"pointer",transition:"all .2s",background:newsCat===i?"rgba(226,18,39,0.2)":"rgba(255,255,255,0.03)",color:newsCat===i?"#e21227":"rgba(255,255,255,0.35)",border:`1px solid ${newsCat===i?"rgba(226,18,39,0.4)":"rgba(255,255,255,0.06)"}`}}>{w.ver}</button>
            ))}
          </div>
          {WHATS_NEW[newsCat] && (
            <div style={{borderRadius:18,border:"1px solid rgba(226,18,39,0.2)",background:"rgba(226,18,39,0.04)",padding:"28px 32px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <span style={{fontSize:18,fontWeight:900,color:"#e21227",fontFamily:"monospace"}}>{WHATS_NEW[newsCat].ver}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>· {WHATS_NEW[newsCat].date}</span>
                <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(226,18,39,0.3),transparent)"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                {WHATS_NEW[newsCat].items.map(item=>(
                  <div key={item} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <CheckCircle style={{width:14,height:14,color:"#22c55e",flexShrink:0}}/>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:940,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:44}}>
            <SectionLabel text="COMPARISON"/>
            <h2 style={{fontSize:"clamp(24px,3.5vw,44px)",fontWeight:800,letterSpacing:"-1.5px"}}>لماذا KaliGPT؟</h2>
          </div>
          <div style={{borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 100px 100px 100px",background:"rgba(255,255,255,0.03)",padding:"14px 24px"}}>
              {["الميزة","KaliGPT","ChatGPT","CoPilot"].map((h,i)=>(
                <div key={h} style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color:i===1?"#e21227":"rgba(255,255,255,0.38)",textAlign:i>0?"center":"left",letterSpacing:"0.1em"}}>{h}</div>
              ))}
            </div>
            {COMPARISONS.map((r,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 100px 100px 100px",padding:"11px 24px",borderTop:"1px solid rgba(255,255,255,0.04)",background:i%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.52)"}}>{r.feature}</div>
                {[r.kg,r.cg,r.cp].map((v,j)=>(
                  <div key={j} style={{textAlign:"center",fontSize:14,color:v?"#22c55e":"rgba(255,255,255,0.15)"}}>{v?"✓":"✗"}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(226,18,39,0.012)"}}>
        <div style={{maxWidth:1280,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <SectionLabel text="TESTIMONIALS"/>
            <h2 style={{fontSize:"clamp(24px,3.5vw,44px)",fontWeight:800,letterSpacing:"-1.5px"}}>ماذا يقول المستخدمون</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(275px,1fr))",gap:14}}>
            {TESTIMONIALS.map((t,i)=>(
              <HoloCard key={i}>
                <div style={{padding:22,borderRadius:18,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",position:"relative",overflow:"hidden"}}>
                  <div style={{display:"flex",gap:3,marginBottom:12}}>
                    {Array.from({length:t.rating}).map((_,j)=><Star key={j} style={{width:11,height:11,fill:"#fbbf24",color:"#fbbf24"}}/>)}
                  </div>
                  <p style={{fontSize:12.5,color:"rgba(255,255,255,0.58)",lineHeight:1.8,marginBottom:16}}>"{t.text}"</p>
                  <div style={{display:"flex",alignItems:"center",gap:11}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:`${t.col}1e`,border:`1px solid ${t.col}3e`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:t.col}}>{t.avatar}</div>
                    <div>
                      <div style={{fontSize:12.5,fontWeight:700,color:"#fff"}}>{t.name}</div>
                      <div style={{fontSize:10.5,color:"rgba(255,255,255,0.28)",fontFamily:"monospace"}}>{t.role}</div>
                    </div>
                  </div>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${t.col}38,transparent)`}}/>
                </div>
              </HoloCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY ── */}
      <section style={{padding:"72px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
          <SectionLabel text="COMMUNITY"/>
          <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:8}}>مجتمع عالمي</h2>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:13,marginBottom:40}}>انضم للمجتمع الأكبر من الباحثين الأمنيين العرب والعالميين</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:36}}>
            {COMMUNITY_STATS.map((s,i)=>{ const Icon=s.icon; return (
              <div key={i} style={{padding:"22px 16px",borderRadius:16,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
                <Icon style={{width:24,height:24,color:s.col,margin:"0 auto 10px"}}/>
                <div style={{fontSize:28,fontWeight:900,fontFamily:"monospace",letterSpacing:"-1px"}}><LiveCounter target={s.value} suffix={s.suffix} color={s.col}/></div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4,fontFamily:"monospace"}}>{s.label}</div>
              </div>
            ); })}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",borderRadius:12,background:"rgba(88,101,242,0.15)",border:"1px solid rgba(88,101,242,0.35)",color:"#7289da",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(88,101,242,0.25)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(88,101,242,0.15)";}}>
              <MessageSquare style={{width:16,height:16}}/> Discord
            </button>
            <button style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#fff";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.6)";}}>
              <Github style={{width:16,height:16}}/> GitHub
            </button>
          </div>
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section style={{padding:"56px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(226,18,39,0.015)"}}>
        <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,0.25)",letterSpacing:"0.3em",marginBottom:24}}>INTEGRATED WITH & POWERED BY</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
            {PARTNERS.map(p=>(
              <div key={p.name} style={{padding:"8px 18px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",fontFamily:"monospace",transition:"all .2s",cursor:"default"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=p.col;(e.currentTarget as HTMLElement).style.borderColor=`${p.col}44`;(e.currentTarget as HTMLElement).style.background=`${p.col}0e`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.4)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.07)";(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.03)";}}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:1020,margin:"0 auto",textAlign:"center"}}>
          <SectionLabel text="PRICING"/>
          <h2 style={{fontSize:"clamp(28px,4vw,46px)",fontWeight:800,letterSpacing:"-1.5px",marginBottom:12}}>ابدأ مجاناً</h2>
          <p style={{color:"rgba(255,255,255,0.32)",marginBottom:52}}>خطط مرنة للأفراد والفرق الأمنية — لا بطاقة ائتمان مطلوبة</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>
            {[
              {name:"Free",  price:"$0",  period:"/شهر", features:["50k رمز/يوم","النماذج الأساسية","ترمينال محدود","OSINT أساسي","5 جلسات Council","دعم مجتمعي"],     highlight:false,col:"rgba(255,255,255,0.1)"},
              {name:"Pro",   price:"$19", period:"/شهر", features:["500k رمز/يوم","كل النماذج 20+","Arsenal v3 كامل","OSINT Ultra","Council 256","CVE Watcher","Swarm 32x","SIEM/SOAR"], highlight:true, col:"#e21227"},
              {name:"Elite", price:"$49", period:"/شهر", features:["نقاط غير محدودة","GodMode 22x","ICS/SCADA Suite","Cloud CSPM","SIGINT Module","API Access","Team Dashboard","Custom Models","SLA 99.99%","دعم أولوية VIP"], highlight:false,col:"rgba(255,255,255,0.1)"},
            ].map((plan,i)=>(
              <HoloCard key={i} style={{borderRadius:"22px"}}>
                <div style={{padding:"32px 28px",borderRadius:"22px",background:plan.highlight?"linear-gradient(135deg,rgba(226,18,39,0.12) 0%,rgba(226,18,39,0.04) 100%)":"linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.01) 100%)",border:plan.highlight?"1px solid rgba(226,18,39,0.4)":"1px solid rgba(255,255,255,0.07)",boxShadow:plan.highlight?"0 0 44px rgba(226,18,39,0.12),0 16px 52px rgba(0,0,0,0.55)":"0 8px 32px rgba(0,0,0,0.4)",position:"relative"}}>
                  {plan.highlight&&<div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#e21227,#ff6b35)",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 16px",borderRadius:"0 0 8px 8px",letterSpacing:"0.5px"}}>الأكثر شيوعاً ⭐</div>}
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.32)",marginBottom:6,letterSpacing:"1px",fontFamily:"monospace"}}>{plan.name.toUpperCase()}</div>
                  <div style={{marginBottom:22}}>
                    <span style={{fontSize:44,fontWeight:900,letterSpacing:"-2px",color:plan.highlight?"#e21227":"#fff"}}>{plan.price}</span>
                    <span style={{fontSize:13,color:"rgba(255,255,255,0.22)",marginLeft:4}}>{plan.period}</span>
                  </div>
                  <ul style={{listStyle:"none",padding:0,margin:"0 0 26px",textAlign:"left"}}>
                    {plan.features.map((f,j)=>(
                      <li key={j} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",fontSize:12.5,color:"rgba(255,255,255,0.52)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{color:"#e21227",fontWeight:700,fontSize:13}}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={()=>navigate("/app")} className="holo-btn" style={{width:"100%",padding:"12px",borderRadius:12,background:plan.highlight?"linear-gradient(135deg,#e21227 0%,#c4101f 100%)":"rgba(255,255,255,0.05)",color:plan.highlight?"#fff":"rgba(255,255,255,0.58)",fontSize:13,fontWeight:600,border:plan.highlight?"none":"1px solid rgba(255,255,255,0.08)",cursor:"pointer",boxShadow:plan.highlight?"0 0 22px rgba(226,18,39,0.35)":"none"}}>ابدأ الآن</button>
                </div>
              </HoloCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{padding:"100px 24px",position:"relative",zIndex:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{maxWidth:780,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <SectionLabel text="FAQ"/>
            <h2 style={{fontSize:"clamp(28px,4vw,42px)",fontWeight:800,letterSpacing:"-1.5px"}}>أسئلة شائعة</h2>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {FAQS.map((item,i)=>(
              <div key={i} style={{borderRadius:16,border:`1px solid ${faqOpen===i?"rgba(226,18,39,0.3)":"rgba(255,255,255,0.06)"}`,background:faqOpen===i?"rgba(226,18,39,0.04)":"rgba(255,255,255,0.02)",overflow:"hidden",transition:"all .3s",cursor:"pointer"}} onClick={()=>setFaqOpen(faqOpen===i?null:i)}>
                <div style={{padding:"18px 22px",display:"flex",alignItems:"center",gap:14}}>
                  <span style={{minWidth:22,height:22,borderRadius:7,background:"rgba(226,18,39,0.11)",border:"1px solid rgba(226,18,39,0.24)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#e21227"}}>Q</span>
                  <h3 style={{fontWeight:600,fontSize:13.5,color:"#fff",flex:1}}>{item.q}</h3>
                  <span style={{color:faqOpen===i?"#e21227":"rgba(255,255,255,0.22)",fontSize:18,transition:"transform .3s",transform:faqOpen===i?"rotate(45deg)":"none"}}>+</span>
                </div>
                {faqOpen===i&&<div style={{padding:"0 22px 18px 58px"}}><p style={{fontSize:12.5,color:"rgba(255,255,255,0.44)",lineHeight:1.8}}>{item.a}</p></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{padding:"120px 24px",position:"relative",zIndex:10,textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.04)",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:700,height:500,background:"radial-gradient(ellipse,rgba(226,18,39,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:640,margin:"0 auto",position:"relative"}}>
          <div style={{width:80,height:80,margin:"0 auto 32px",animation:"pulse3d 3s ease-in-out infinite"}}>
            <div style={{width:80,height:80,borderRadius:22,background:"linear-gradient(135deg,rgba(226,18,39,0.2),rgba(226,18,39,0.05))",border:"1px solid rgba(226,18,39,0.35)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 44px rgba(226,18,39,0.25)",transform:"perspective(200px) rotateX(15deg)"}}>
              <Zap style={{width:36,height:36,color:"#e21227"}}/>
            </div>
          </div>
          <h2 style={{fontSize:"clamp(32px,5vw,58px)",fontWeight:900,letterSpacing:"-2px",marginBottom:16}}>جاهز للانطلاق؟</h2>
          <p style={{color:"rgba(255,255,255,0.32)",marginBottom:48,fontSize:16,lineHeight:1.7}}>انضم لـ 22,000+ باحث أمني يستخدمون KaliGPT v6.0 يومياً</p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>navigate("/app")} className="holo-btn" style={{display:"inline-flex",alignItems:"center",gap:12,padding:"18px 48px",borderRadius:16,background:"linear-gradient(135deg,#e21227 0%,#c4101f 50%,#a00d1a 100%)",color:"#fff",fontSize:18,fontWeight:800,border:"none",cursor:"pointer",boxShadow:"0 0 64px rgba(226,18,39,0.45),0 12px 32px rgba(226,18,39,0.25)"}}>
              <Terminal style={{width:22,height:22}}/> افتح KaliGPT v6.0
            </button>
            <button onClick={()=>navigate("/roadmap")} style={{display:"inline-flex",alignItems:"center",gap:12,padding:"18px 32px",borderRadius:16,background:"transparent",color:"rgba(255,255,255,0.48)",fontSize:16,fontWeight:500,border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",transition:"all .3s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#fff";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.3)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.48)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";}}>
              <BarChart3 style={{width:18,height:18}}/> الخريطة
            </button>
          </div>
        </div>
      </section>

      <ThreatFeedTicker/>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:"1px solid rgba(226,18,39,0.08)",padding:"48px 24px 32px",position:"relative",zIndex:10,background:"linear-gradient(180deg,transparent 0%,rgba(226,18,39,0.03) 100%)"}}>
        <div style={{maxWidth:1200,margin:"0 auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:40,marginBottom:40}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#e21227,#c4101f)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 18px rgba(226,18,39,0.45)"}}>
                  <Shield style={{width:18,height:18,color:"#fff"}}/>
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:15}}>KaliGPT</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",fontFamily:"monospace"}}>mr7.ai · v6.0 · Arsenal Ultra</div>
                </div>
              </div>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.28)",lineHeight:1.7,maxWidth:280}}>منصة الأمن السيبراني بالذكاء الاصطناعي — مبنية للباحثين المرخصين والفرق الأمنية الاحترافية.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:14}}>
                {["GPT-4o","Claude","Gemini","Groq","DeepSeek","xAI","NIM"].map(t=>(
                  <span key={t} style={{fontSize:9,fontFamily:"monospace",color:"rgba(255,255,255,0.22)",border:"1px solid rgba(255,255,255,0.08)",padding:"2px 6px",borderRadius:4}}>{t}</span>
                ))}
              </div>
            </div>
            {[
              {title:"المنتج",   links:["الميزات v6.0","الترسانة v3","الأسعار","Roadmap","ما الجديد","Swarm 32x"]},
              {title:"المجتمع",  links:["Discord","GitHub","Blog","CTF Labs","YouTube","Newsletter"]},
              {title:"الدعم",    links:["FAQ","توثيق API","تواصل معنا","سياسة الخصوصية","شروط الخدمة","Bug Bounty"]},
            ].map(col=>(
              <div key={col.title}>
                <div style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.32)",letterSpacing:"0.2em",marginBottom:14,fontWeight:700}}>{col.title}</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {col.links.map(l=>(
                    <button key={l} style={{fontSize:13,color:"rgba(255,255,255,0.28)",background:"none",border:"none",cursor:"pointer",textAlign:"left",transition:"color .2s",padding:0}}
                      onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,0.72)")} onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.28)")}>{l}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14,paddingTop:22,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,0.14)",fontFamily:"monospace"}}>© 2025 mr7.ai · KaliGPT v6.0 · For authorized security research only</p>
            <div style={{display:"flex",gap:6}}>
              {["● ONLINE","24 NODES","99.99% SLA","v6.0","32 AGENTS"].map(s=>(
                <span key={s} style={{fontSize:9,fontFamily:"monospace",color:"rgba(34,197,94,0.5)",border:"1px solid rgba(34,197,94,0.15)",padding:"2px 8px",borderRadius:4,background:"rgba(34,197,94,0.04)"}}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
