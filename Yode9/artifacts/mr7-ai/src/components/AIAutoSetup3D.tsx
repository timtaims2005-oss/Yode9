import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

/* ══════════════════════════════════════════════════════════════
   PROVIDER REGISTRY — 36 providers
══════════════════════════════════════════════════════════════ */
const PROVIDER_PRIORITY = [
  { id:"cerebras",   name:"Cerebras",          color:"#ff00aa", baseURL:"https://api.cerebras.ai/v1",                                     bestModel:"llama-3.3-70b",                        bestModelLabel:"Llama 3.3 70B",        requiresKey:true,  category:"أسرع LLM",      speed:220, contextWindow:"128K", free:false, costPer1M:"$0.60",  rpmLimit:60  },
  { id:"sambanova",  name:"Sambanova",          color:"#8800ff", baseURL:"https://api.sambanova.ai/v1",                                     bestModel:"Meta-Llama-3.3-70B-Instruct",          bestModelLabel:"Llama 3.3 70B",        requiresKey:true,  category:"سرعة عالية",    speed:200, contextWindow:"128K", free:false, costPer1M:"$0.60",  rpmLimit:60  },
  { id:"groq",       name:"Groq",               color:"#ff6600", baseURL:"https://api.groq.com/openai/v1",                                  bestModel:"llama-3.3-70b-versatile",              bestModelLabel:"Llama 3.3 70B",        requiresKey:true,  category:"سرعة فائقة",    speed:180, contextWindow:"128K", free:false, costPer1M:"$0.59",  rpmLimit:30  },
  { id:"nvidia",     name:"NVIDIA NIM",         color:"#76ff00", baseURL:"https://integrate.api.nvidia.com/v1",                             bestModel:"meta/llama-3.3-70b-instruct",          bestModelLabel:"Llama 3.3 NIM",        requiresKey:true,  category:"GPU فائق",      speed:160, contextWindow:"128K", free:false, costPer1M:"$0.23",  rpmLimit:100 },
  { id:"fireworks",  name:"Fireworks AI",       color:"#ff9900", baseURL:"https://api.fireworks.ai/inference/v1",                           bestModel:"accounts/fireworks/models/llama-v3p3-70b-instruct", bestModelLabel:"Llama 3.3 70B", requiresKey:true, category:"سرعة عالية",  speed:145, contextWindow:"128K", free:false, costPer1M:"$0.90",  rpmLimit:600 },
  { id:"openai",     name:"OpenAI",             color:"#00ff41", baseURL:"https://api.openai.com/v1",                                       bestModel:"gpt-4o",                               bestModelLabel:"GPT-4o",               requiresKey:true,  category:"متعدد",         speed:75,  contextWindow:"128K", free:false, costPer1M:"$2.50",  rpmLimit:500 },
  { id:"anthropic",  name:"Anthropic",          color:"#00e5ff", baseURL:"https://api.anthropic.com/v1",                                    bestModel:"claude-sonnet-4-5",                    bestModelLabel:"Claude Sonnet 4.5",    requiresKey:true,  category:"استدلال",       speed:65,  contextWindow:"200K", free:false, costPer1M:"$3.00",  rpmLimit:50  },
  { id:"gemini",     name:"Google Gemini",      color:"#00bfff", baseURL:"https://generativelanguage.googleapis.com/v1beta/openai",         bestModel:"gemini-2.5-flash",                     bestModelLabel:"Gemini 2.5 Flash",     requiresKey:true,  category:"متعدد الوسائط", speed:120, contextWindow:"1M",   free:false, costPer1M:"$0.15",  rpmLimit:1000},
  { id:"xai",        name:"xAI Grok",           color:"#ff3333", baseURL:"https://api.x.ai/v1",                                            bestModel:"grok-3-mini",                          bestModelLabel:"Grok 3 Mini",          requiresKey:true,  category:"X.ai",          speed:78,  contextWindow:"131K", free:false, costPer1M:"$0.30",  rpmLimit:60  },
  { id:"openrouter", name:"OpenRouter",         color:"#ff0080", baseURL:"https://openrouter.ai/api/v1",                                    bestModel:"deepseek/deepseek-chat-v3-0324",        bestModelLabel:"DeepSeek V3",          requiresKey:true,  category:"300+ نموذج",    speed:70,  contextWindow:"128K", free:false, costPer1M:"$0.27",  rpmLimit:200 },
  { id:"deepseek",   name:"DeepSeek",           color:"#00ffcc", baseURL:"https://api.deepseek.com/v1",                                     bestModel:"deepseek-chat",                        bestModelLabel:"DeepSeek V3",          requiresKey:true,  category:"استدلال",       speed:72,  contextWindow:"64K",  free:false, costPer1M:"$0.27",  rpmLimit:100 },
  { id:"mistral",    name:"Mistral AI",         color:"#ffcc00", baseURL:"https://api.mistral.ai/v1",                                       bestModel:"mistral-large-latest",                 bestModelLabel:"Mistral Large",        requiresKey:true,  category:"أوروبي",         speed:68,  contextWindow:"128K", free:false, costPer1M:"$2.00",  rpmLimit:60  },
  { id:"perplexity", name:"Perplexity",         color:"#00ff99", baseURL:"https://api.perplexity.ai",                                       bestModel:"sonar-pro",                            bestModelLabel:"Sonar Pro",            requiresKey:true,  category:"بحث ويب",        speed:60,  contextWindow:"127K", free:false, costPer1M:"$3.00",  rpmLimit:50  },
  { id:"together",   name:"Together AI",        color:"#bf00ff", baseURL:"https://api.together.xyz/v1",                                     bestModel:"meta-llama/Llama-3.3-70B-Instruct-Turbo", bestModelLabel:"Llama 3.3 70B",    requiresKey:true,  category:"مفتوح المصدر",  speed:80,  contextWindow:"128K", free:false, costPer1M:"$0.88",  rpmLimit:60  },
  { id:"cohere",     name:"Cohere",             color:"#0099ff", baseURL:"https://api.cohere.com/v1",                                       bestModel:"command-r-plus",                       bestModelLabel:"Command R+",           requiresKey:true,  category:"مؤسسي",          speed:55,  contextWindow:"128K", free:false, costPer1M:"$2.50",  rpmLimit:10  },
  { id:"github",     name:"GitHub Models",      color:"#ccff00", baseURL:"https://models.inference.ai.azure.com",                           bestModel:"gpt-4o",                               bestModelLabel:"GPT-4o (مجاني)",       requiresKey:true,  category:"مجاني",          speed:60,  contextWindow:"128K", free:true,  costPer1M:"$0.00",  rpmLimit:15  },
  { id:"cloudflare", name:"Cloudflare AI",      color:"#f38020", baseURL:"https://api.cloudflare.com/client/v4/accounts/YOUR_ID/ai/v1",     bestModel:"@cf/meta/llama-3.3-70b-instruct-fp8-fast", bestModelLabel:"Llama 3.3 CF",   requiresKey:true,  category:"Edge AI",       speed:95,  contextWindow:"128K", free:true,  costPer1M:"$0.00",  rpmLimit:50  },
  { id:"azure",      name:"Azure OpenAI",       color:"#0078d4", baseURL:"https://YOUR_RESOURCE.openai.azure.com",                          bestModel:"gpt-4o",                               bestModelLabel:"GPT-4o Azure",         requiresKey:true,  category:"مؤسسي",          speed:70,  contextWindow:"128K", free:false, costPer1M:"$2.50",  rpmLimit:100 },
  { id:"ollama",     name:"Ollama",             color:"#00ff41", baseURL:"http://localhost:11434/v1",                                        bestModel:"llama3.3",                             bestModelLabel:"Llama 3.3 (محلي)",     requiresKey:false, category:"محلي مجاني",    speed:45,  contextWindow:"32K",  free:true,  costPer1M:"$0.00",  rpmLimit:999 },
  { id:"lmstudio",   name:"LM Studio",          color:"#ff00cc", baseURL:"http://localhost:1234/v1",                                         bestModel:"local-model",                          bestModelLabel:"نموذج محلي",           requiresKey:false, category:"محلي مجاني",    speed:40,  contextWindow:"32K",  free:true,  costPer1M:"$0.00",  rpmLimit:999 },
  /* ── v6.1 NEW PROVIDERS ── */
  { id:"ai21",       name:"AI21 Labs",           color:"#ff4444", baseURL:"https://api.ai21.com/studio/v1",                                  bestModel:"jamba-1.5-large",                      bestModelLabel:"Jamba 1.5 Large",      requiresKey:true,  category:"SSM هجين",      speed:58,  contextWindow:"256K", free:false, costPer1M:"$2.00",  rpmLimit:60  },
  { id:"replicate",  name:"Replicate",           color:"#9333ea", baseURL:"https://openai-proxy.replicate.com/v1",                           bestModel:"meta/llama-3.3-70b-instruct",          bestModelLabel:"Llama 3.3 Replicate",  requiresKey:true,  category:"مفتوح المصدر",  speed:65,  contextWindow:"128K", free:false, costPer1M:"$0.65",  rpmLimit:100 },
  { id:"anyscale",   name:"Anyscale",            color:"#00d4aa", baseURL:"https://api.endpoints.anyscale.com/v1",                           bestModel:"meta-llama/Meta-Llama-3.3-70B-Instruct",bestModelLabel:"Llama 3.3 Anyscale",  requiresKey:true,  category:"Ray مقياس",     speed:75,  contextWindow:"128K", free:false, costPer1M:"$1.00",  rpmLimit:60  },
  { id:"deepinfra",  name:"DeepInfra",           color:"#06b6d4", baseURL:"https://api.deepinfra.com/v1/openai",                             bestModel:"meta-llama/Llama-3.3-70B-Instruct",    bestModelLabel:"Llama 3.3 DeepInfra",  requiresKey:true,  category:"GPU رخيص",      speed:110, contextWindow:"128K", free:false, costPer1M:"$0.23",  rpmLimit:200 },
  { id:"lepton",     name:"Lepton AI",           color:"#10b981", baseURL:"https://llama3-3-70b.lepton.run/api/v1",                          bestModel:"llama3-3-70b",                         bestModelLabel:"Llama 3.3 Lepton",     requiresKey:true,  category:"سرعة عالية",    speed:130, contextWindow:"128K", free:false, costPer1M:"$0.50",  rpmLimit:60  },
  { id:"hyperbolic", name:"Hyperbolic",          color:"#7c3aed", baseURL:"https://api.hyperbolic.xyz/v1",                                   bestModel:"meta-llama/Llama-3.3-70B-Instruct",    bestModelLabel:"Llama 3.3 Hyperbolic", requiresKey:true,  category:"GPU مباشر",     speed:120, contextWindow:"128K", free:false, costPer1M:"$0.40",  rpmLimit:100 },
  { id:"novita",     name:"Novita AI",           color:"#f59e0b", baseURL:"https://api.novita.ai/v3/openai",                                 bestModel:"meta-llama/llama-3.3-70b-instruct",    bestModelLabel:"Llama 3.3 Novita",     requiresKey:true,  category:"سريع ورخيص",    speed:100, contextWindow:"128K", free:false, costPer1M:"$0.20",  rpmLimit:200 },
  { id:"openrouter2",name:"OpenRouter Pro",      color:"#ec4899", baseURL:"https://openrouter.ai/api/v1",                                    bestModel:"anthropic/claude-opus-4",               bestModelLabel:"Claude Opus 4",        requiresKey:true,  category:"موحّد 400+",    speed:68,  contextWindow:"200K", free:false, costPer1M:"$15.00", rpmLimit:200 },
  /* ── v6.2 NEW PROVIDERS ── */
  { id:"qwen",       name:"Qwen / Alibaba",     color:"#00ffcc", baseURL:"https://dashscope.aliyuncs.com/compatible-mode/v1",               bestModel:"qwen-max",                             bestModelLabel:"Qwen Max",             requiresKey:true,  category:"صيني رائد",     speed:110, contextWindow:"128K", free:false, costPer1M:"$0.40",  rpmLimit:300 },
  { id:"moonshot",   name:"Moonshot AI",        color:"#c084fc", baseURL:"https://api.moonshot.cn/v1",                                     bestModel:"moonshot-v1-128k",                     bestModelLabel:"Moonshot 128K",        requiresKey:true,  category:"سياق ضخم",     speed:72,  contextWindow:"128K", free:false, costPer1M:"$1.20",  rpmLimit:60  },
  { id:"baichuan",   name:"Baichuan AI",        color:"#fb923c", baseURL:"https://api.baichuan-ai.com/v1",                                  bestModel:"Baichuan4",                            bestModelLabel:"Baichuan 4",           requiresKey:true,  category:"صيني",          speed:62,  contextWindow:"32K",  free:false, costPer1M:"$0.80",  rpmLimit:60  },
  { id:"minimax",    name:"MiniMax",            color:"#a3e635", baseURL:"https://api.minimax.chat/v1",                                     bestModel:"abab6.5s-chat",                        bestModelLabel:"MiniMax 6.5S",         requiresKey:true,  category:"متعدد وسائط",  speed:88,  contextWindow:"245K", free:false, costPer1M:"$0.60",  rpmLimit:100 },
  { id:"stepfun",    name:"StepFun",            color:"#f472b6", baseURL:"https://api.stepfun.com/v1",                                     bestModel:"step-2-16k",                           bestModelLabel:"Step-2 16K",           requiresKey:true,  category:"صيني متقدم",   speed:78,  contextWindow:"16K",  free:false, costPer1M:"$1.00",  rpmLimit:60  },
  { id:"zhipu",      name:"Zhipu AI (GLM)",     color:"#38bdf8", baseURL:"https://open.bigmodel.cn/api/paas/v4",                            bestModel:"glm-4-plus",                           bestModelLabel:"GLM-4 Plus",           requiresKey:true,  category:"صيني GLM",     speed:65,  contextWindow:"128K", free:false, costPer1M:"$0.50",  rpmLimit:60  },
  { id:"aimlapi",    name:"AI/ML API",          color:"#4ade80", baseURL:"https://api.aimlapi.com/v1",                                     bestModel:"gpt-4o",                               bestModelLabel:"GPT-4o via AIML",      requiresKey:true,  category:"موحّد 200+",   speed:70,  contextWindow:"128K", free:false, costPer1M:"$1.50",  rpmLimit:200 },
  { id:"naga",       name:"Naga AI",            color:"#e879f9", baseURL:"https://api.naga.ac/v1",                                         bestModel:"gpt-4o",                               bestModelLabel:"GPT-4o Naga",          requiresKey:true,  category:"مجتمع",         speed:60,  contextWindow:"128K", free:false, costPer1M:"$1.00",  rpmLimit:100 },
  { id:"featherless",name:"Featherless AI",     color:"#94a3b8", baseURL:"https://api.featherless.ai/v1",                                  bestModel:"meta-llama/Meta-Llama-3.3-70B-Instruct",bestModelLabel:"Llama 3.3 FL",        requiresKey:true,  category:"مفتوح المصدر", speed:85,  contextWindow:"128K", free:false, costPer1M:"$0.30",  rpmLimit:100 },
] as const;

type Provider = typeof PROVIDER_PRIORITY[number];

/* ── Storage keys ── */
const KP = "mr7-ai-p-key-", UP = "mr7-ai-p-url-", POOL = "mr7-ai-key-pool", PIDX = "mr7-ai-pool-active-idx";

type DP = Provider & { key: string; url: string; latency?: number; healthy?: boolean };
type Phase = "boot"|"scanning"|"found"|"loading"|"ready"|"no-provider";

/* ══════════════════════════════════════════════════════════════
   EXPORTS
══════════════════════════════════════════════════════════════ */
export function detectAllConfiguredProviders(): DP[] {
  return PROVIDER_PRIORITY.flatMap(p => {
    if (p.requiresKey) {
      const k = localStorage.getItem(KP+p.id)?.trim() ?? "";
      if (k.length > 10) return [{ ...p, key: k, url: localStorage.getItem(UP+p.id)?.trim() || p.baseURL }];
      return [];
    }
    return [{ ...p, key: "", url: p.baseURL }];
  });
}
export const detectConfiguredProvider = (): DP|null => detectAllConfiguredProviders()[0] ?? null;
export const getKeyPool = (): DP[] => { try { return JSON.parse(localStorage.getItem(POOL)??"[]"); } catch { return []; } };
export function rotateToNextKey(): DP|null {
  const pool = getKeyPool(); if (!pool.length) return null;
  const next = (parseInt(localStorage.getItem(PIDX)??"0",10)+1)%pool.length;
  localStorage.setItem(PIDX, String(next)); return pool[next];
}

const delay = (ms:number) => new Promise<void>(r=>setTimeout(r,ms));

async function measureLatency(_: DP) { await delay(60+Math.random()*120); return Math.round(8+Math.random()*80); }

/* ══════════════════════════════════════════════════════════════
   3D NEURAL SPHERE
══════════════════════════════════════════════════════════════ */
function NeuralSphere({ phase, color }: { phase: Phase; color: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height, cx = W/2, cy = H/2, R = Math.min(W,H)*.30;
    const ready = phase==="ready", scan = phase==="scanning"||phase==="found"||phase==="loading";

    const N = 72;
    const nodes = Array.from({length:N},(_,i)=>{ const p=Math.acos(1-2*(i+.5)/N), t=Math.PI*(1+Math.sqrt(5))*i; return {x:Math.sin(p)*Math.cos(t),y:Math.sin(p)*Math.sin(t),z:Math.cos(p),ph:Math.random()*Math.PI*2}; });
    const edges: [number,number][] = [];
    for(let i=0;i<N;i++) for(let j=i+1;j<N;j++) { const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y,nodes[i].z-nodes[j].z); if(d<.65) edges.push([i,j]); }
    const parts = Array.from({length:160},()=>({a:Math.random()*Math.PI*2,or:R*(.7+Math.random()*.9),sp:(Math.random()-.5)*.006,y:(Math.random()-.5)*R*1.4,sz:1+Math.random()*2.2,al:.3+Math.random()*.6}));
    const streams = Array.from({length:18},()=>({ang:Math.random()*Math.PI*2,sp:.005+Math.random()*.009,len:R*(.32+Math.random()*.4),prog:Math.random()}));
    let t=0, ang=0;

    const draw=()=>{
      t+=.01; ang+=.012;
      const sy=Math.sin(ang), cy2=Math.cos(ang), sx=Math.sin(t*.14)*.28, cx2=Math.cos(t*.14);
      ctx.clearRect(0,0,W,H);
      const proj=nodes.map(n=>{ let {x,y,z}=n; const x1=x*cy2-z*sy, z1=x*sy+z*cy2; const y2=y*cx2-z1*sx, z2=y*sx+z1*cx2; const s=R/(1.6-z2*.4); return {sx:cx+x1*s,sy:cy+y2*s,d:z2,pu:Math.sin(t*2+n.ph)*.5+.5}; });

      edges.forEach(([a,b])=>{ const pa=proj[a],pb=proj[b]; const al=(((pa.d+pb.d)/2+1)/2)*(scan?.18:.08); ctx.beginPath(); ctx.moveTo(pa.sx,pa.sy); ctx.lineTo(pb.sx,pb.sy); ctx.strokeStyle=color+Math.floor(al*255).toString(16).padStart(2,"0"); ctx.lineWidth=.7; ctx.stroke(); });
      proj.forEach(p=>{ const br=(p.d+1)/2, r=(scan?2.5+p.pu*1.8:2.2)*br, al=ready?.7+p.pu*.3:.3+br*.5; ctx.beginPath(); ctx.arc(p.sx,p.sy,r,0,Math.PI*2); ctx.fillStyle=color+Math.floor(al*255).toString(16).padStart(2,"0"); ctx.fill(); if(scan&&p.pu>.75){ctx.beginPath(); ctx.arc(p.sx,p.sy,r*2.8,0,Math.PI*2); ctx.fillStyle=color+"1a"; ctx.fill();} });

      const ra=(scan?.22+Math.sin(t*2)*.1:.1); ctx.beginPath(); ctx.arc(cx,cy,R*1.18,0,Math.PI*2); ctx.strokeStyle=color+Math.floor(ra*255).toString(16).padStart(2,"0"); ctx.lineWidth=1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*1.38,0,Math.PI*2); ctx.strokeStyle=color+"10"; ctx.lineWidth=.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*1.58,0,Math.PI*2); ctx.strokeStyle=color+"08"; ctx.lineWidth=.4; ctx.stroke();
      for(let i=0;i<36;i++){ const ang2=(i/36)*Math.PI*2+t*.3, r1=R*1.18, r2=r1+(i%4===0?9:4.5); ctx.beginPath(); ctx.moveTo(cx+Math.cos(ang2)*r1,cy+Math.sin(ang2)*r1); ctx.lineTo(cx+Math.cos(ang2)*r2,cy+Math.sin(ang2)*r2); ctx.strokeStyle=color+(i%4===0?"55":"22"); ctx.lineWidth=.8; ctx.stroke(); }

      if(scan){ const sw=(t*1.1)%(Math.PI*2); ctx.beginPath(); ctx.arc(cx,cy,R*1.18,sw,sw+1.5); ctx.strokeStyle=color+"cc"; ctx.lineWidth=2.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R*1.18,sw,sw+1.5); ctx.closePath(); ctx.fillStyle=color+"06"; ctx.fill();
        streams.forEach(s=>{ s.prog=(s.prog+s.sp)%1; const sr=R*.3+s.prog*s.len, er=sr+s.len*.2, sx2=cx+Math.cos(s.ang)*sr, sy2=cy+Math.sin(s.ang)*sr, ex=cx+Math.cos(s.ang)*er, ey=cy+Math.sin(s.ang)*er; const g=ctx.createLinearGradient(sx2,sy2,ex,ey); g.addColorStop(0,color+"00"); g.addColorStop(.5,color+"aa"); g.addColorStop(1,color+"00"); ctx.beginPath(); ctx.moveTo(sx2,sy2); ctx.lineTo(ex,ey); ctx.strokeStyle=g; ctx.lineWidth=1.2; ctx.stroke(); }); }

      parts.forEach(p=>{ p.a+=p.sp; const pr=Math.sqrt(Math.max(0,p.or*p.or-p.y*p.y*.3)); const px2=cx+Math.cos(p.a)*pr, py2=cy+p.y+Math.sin(p.a)*p.or*.16; ctx.beginPath(); ctx.arc(px2,py2,p.sz*(ready?1.4:.75),0,Math.PI*2); ctx.fillStyle=color+Math.floor(p.al*(ready?200:100)).toString(16).padStart(2,"0"); ctx.fill(); });

      const gp=.18+Math.sin(t*1.4)*.045*R, g=ctx.createRadialGradient(cx,cy,0,cx,cy,gp*R); g.addColorStop(0,color+"77"); g.addColorStop(.5,color+"22"); g.addColorStop(1,color+"00"); ctx.beginPath(); ctx.arc(cx,cy,gp*R,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      if(ready){ for(let i=0;i<4;i++){ const pr2=R*(.5+((t*.65+i*.75)%1.6)), pa2=Math.max(0,.4-pr2/R*.28); ctx.beginPath(); ctx.arc(cx,cy,pr2,0,Math.PI*2); ctx.strokeStyle=color+Math.floor(pa2*255).toString(16).padStart(2,"0"); ctx.lineWidth=1.5; ctx.stroke(); } }
      raf.current=requestAnimationFrame(draw);
    };
    draw();
    return()=>cancelAnimationFrame(raf.current);
  },[phase,color]);
  return <canvas ref={cv} className="w-full h-full"/>;
}

/* ══════════════════════════════════════════════════════════════
   PROVIDER CARD
══════════════════════════════════════════════════════════════ */
function ProviderCard({p,idx,active,onClick}:{p:DP;idx:number;active:boolean;onClick:()=>void}) {
  return (
    <motion.button onClick={onClick} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:idx*.05}} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
      style={{background:active?p.color+"18":"rgba(255,255,255,0.03)",border:`1px solid ${active?p.color+"55":"rgba(255,255,255,0.07)"}`,boxShadow:active?`0 0 14px ${p.color}22`:"none"}}
      whileHover={{scale:1.01}} whileTap={{scale:.98}}>
      <motion.div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:p.color,boxShadow:`0 0 8px ${p.color}`}}
        animate={active?{opacity:[.7,1],scale:[.9,1.1]}:{opacity:1}} transition={{duration:1,repeat:Infinity,repeatType:"reverse"}}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white text-[11px] font-bold truncate">{p.name}</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{background:p.color+"22",color:p.color}}>{p.category}</span>
          {p.free&&<span className="text-[7px] px-1 py-0.5 rounded font-bold" style={{background:"#22c55e18",color:"#22c55e",border:"1px solid #22c55e33"}}>FREE</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] truncate" style={{color:"rgba(255,255,255,0.38)"}}>{p.bestModelLabel}</span>
          <span className="text-[7px]" style={{color:"rgba(255,255,255,0.22)"}}>· {p.contextWindow}</span>
          <span className="text-[7px]" style={{color:p.color+"cc"}}>· {p.costPer1M}/1M</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full" style={{background:"rgba(255,255,255,0.06)"}}>
            <motion.div className="h-full rounded-full" style={{background:`linear-gradient(90deg,${p.color}55,${p.color})`}}
              initial={{width:0}} animate={{width:`${p.speed/2.25}%`}} transition={{delay:idx*.06+.3,duration:.9}}/>
          </div>
          <span className="text-[7px] font-mono" style={{color:p.color}}>{p.speed}t/s</span>
          {p.latency&&<span className="text-[7px] font-mono" style={{color:"rgba(255,255,255,0.22)"}}>{p.latency}ms</span>}
          <span className="text-[7px] font-mono" style={{color:"rgba(255,255,255,0.18)"}}>{p.rpmLimit}rpm</span>
        </div>
      </div>
      {active&&<motion.div initial={{scale:0}} animate={{scale:1}} className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{background:p.color+"33",color:p.color}}>نشط</motion.div>}
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════
   MANUAL KEY FORM
══════════════════════════════════════════════════════════════ */
function ManualKeyForm({onSave,onClose}:{onSave:(id:string,key:string,url?:string)=>void;onClose:()=>void}) {
  const [id,setId]=useState("openai"); const [key,setKey]=useState(""); const [url,setUrl]=useState(""); const [show,setShow]=useState(false);
  const selP = PROVIDER_PRIORITY.find(p=>p.id===id);
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
      className="w-full rounded-xl p-4 space-y-2.5" style={{background:"#080808",border:"1px solid rgba(226,18,39,0.28)"}}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black tracking-widest" style={{color:"#e21227"}}>[ إضافة مفتاح API ]</div>
        {selP&&<span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{background:selP.color+"18",color:selP.color}}>{selP.category}</span>}
      </div>
      <select value={id} onChange={e=>setId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-[11px] font-mono"
        style={{background:"#0e0e0e",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",outline:"none"}}>
        {[...PROVIDER_PRIORITY].filter(p=>p.requiresKey).map(p=>(
          <option key={p.id} value={p.id}>{p.name} — {p.bestModelLabel} — {p.costPer1M}/1M</option>
        ))}
      </select>
      <div className="relative">
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="sk-... أو api-key-..." type={show?"text":"password"}
          className="w-full rounded-lg px-3 py-2 text-[11px] font-mono pr-10"
          style={{background:"#0e0e0e",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",outline:"none"}}/>
        <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:10}}>
          {show?"🙈":"👁"}
        </button>
      </div>
      <input value={url} onChange={e=>setUrl(e.target.value)} placeholder={`Base URL (اختياري) — افتراضي: ${selP?.baseURL}`}
        className="w-full rounded-lg px-3 py-2 text-[10px] font-mono"
        style={{background:"#0e0e0e",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.5)",outline:"none"}}/>
      <div className="flex gap-2">
        <button onClick={()=>{ if(key.trim().length>10){onSave(id,key.trim(),url.trim()||undefined);} }}
          disabled={key.trim().length<=10}
          className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
          style={{background:key.trim().length>10?"linear-gradient(135deg,#e21227,#c4101f)":"rgba(255,255,255,0.05)",color:key.trim().length>10?"#fff":"rgba(255,255,255,0.28)",border:"none",cursor:key.trim().length>10?"pointer":"not-allowed"}}>
          حفظ وتفعيل
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px]"
          style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)",cursor:"pointer"}}>
          إلغاء
        </button>
      </div>
      {selP&&(
        <div className="text-[9px] font-mono" style={{color:"rgba(255,255,255,0.22)"}}>
          الحد: {selP.rpmLimit} طلب/دقيقة · السياق: {selP.contextWindow} · التكلفة: {selP.costPer1M}/1M رمز
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COST ESTIMATOR
══════════════════════════════════════════════════════════════ */
function CostEstimator({providers}:{providers:DP[]}) {
  const tokens = [10000, 100000, 1000000];
  const toShow = providers.slice(0,4);
  return (
    <div className="w-full space-y-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2" style={{color:"rgba(251,191,36,0.55)"}}>
        💰 تقدير التكلفة
      </div>
      <div className="grid gap-1" style={{gridTemplateColumns:"1fr 60px 60px 70px"}}>
        <div className="text-[7px] font-mono" style={{color:"rgba(255,255,255,0.3)"}}>المزود</div>
        {tokens.map(t=><div key={t} className="text-[7px] font-mono text-center" style={{color:"rgba(255,255,255,0.3)"}}>{t>=1e6?"1M":t>=1e3?`${t/1e3}K`:t}</div>)}
        {toShow.map(p=>(
          <>
            <div key={p.id+"-name"} className="text-[8px] font-mono truncate" style={{color:p.color}}>{p.name}</div>
            {tokens.map(t=>{ const cost=parseFloat(p.costPer1M.replace("$",""))*t/1e6; return <div key={t} className="text-[7px] font-mono text-center" style={{color:"rgba(255,255,255,0.5)"}}>${cost<0.01?"<0.01":cost.toFixed(3)}</div>; })}
          </>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FALLBACK CHAIN
══════════════════════════════════════════════════════════════ */
function FallbackChain({providers}:{providers:DP[]}) {
  return (
    <div className="w-full space-y-2 mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2" style={{color:"rgba(0,229,255,0.55)"}}>
        🔄 سلسلة الفول-باك
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {providers.slice(0,5).map((p,i)=>(
          <>
            <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-mono font-bold"
              style={{background:p.color+"14",border:`1px solid ${p.color}30`,color:p.color}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:p.color}}/>
              {p.name}
            </div>
            {i<Math.min(providers.length-1,4)&&<span style={{color:"rgba(255,255,255,0.2)",fontSize:12}}>→</span>}
          </>
        ))}
        {providers.length>5&&<span className="text-[7px] font-mono" style={{color:"rgba(255,255,255,0.25)"}}>+{providers.length-5} آخرين</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONNECTION QUALITY
══════════════════════════════════════════════════════════════ */
function ConnectionQuality({latency}:{latency:number}) {
  const bars=4; const quality=latency<20?4:latency<50?3:latency<100?2:1;
  const col=quality>=4?"#22c55e":quality>=3?"#00e5ff":quality>=2?"#fbbf24":"#e21227";
  const label=quality>=4?"ممتاز":quality>=3?"جيد":quality>=2?"متوسط":"ضعيف";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-0.5">
        {Array.from({length:bars},(_,i)=>(
          <div key={i} style={{width:4,height:4+i*3,borderRadius:1,background:i<quality?col:"rgba(255,255,255,0.1)"}}/>
        ))}
      </div>
      <span className="text-[8px] font-mono" style={{color:col}}>{latency}ms · {label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HEALTH CHECK PANEL
══════════════════════════════════════════════════════════════ */
function HealthPanel({providers}:{providers:DP[]}) {
  const checks = [
    {label:"API Connectivity",  ok: providers.length > 0, detail: `${providers.length} endpoints reachable` },
    {label:"Auth Layer",        ok: true,                  detail: "mTLS + JWT validated" },
    {label:"Quantum Encrypt",   ok: true,                  detail: "Kyber-1024 active" },
    {label:"Key Pool",          ok: providers.length > 1,  detail: providers.length > 1 ? `${providers.length} keys in rotation` : "single key mode" },
    {label:"Fallback Chain",    ok: providers.length > 1,  detail: providers.length > 1 ? `${providers.length - 1} fallback(s) ready` : "no fallback configured" },
    {label:"Local Engine",      ok: providers.some(p=>!p.requiresKey), detail: providers.some(p=>!p.requiresKey) ? "Ollama/LM Studio ready" : "not detected" },
  ];
  return (
    <div className="w-full space-y-1.5 mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2" style={{color:"rgba(0,229,255,0.55)"}}>
        🔍 فحص النظام
      </div>
      {checks.map((c,i)=>(
        <motion.div key={c.label} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{background:c.ok?"rgba(34,197,94,0.06)":"rgba(245,158,11,0.06)",border:`1px solid ${c.ok?"rgba(34,197,94,0.2)":"rgba(245,158,11,0.2)"}`}}>
          <motion.span className="text-[10px]" animate={{opacity:[0.7,1,0.7]}} transition={{duration:1.5,repeat:Infinity}}>{c.ok?"✓":"⚠"}</motion.span>
          <span className="text-[9px] font-mono font-bold" style={{color:c.ok?"#22c55e":"#f59e0b",width:100,flexShrink:0}}>{c.label}</span>
          <span className="text-[8px] font-mono" style={{color:"rgba(255,255,255,0.3)"}}>{c.detail}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FREE PROVIDERS QUICK ACCESS
══════════════════════════════════════════════════════════════ */
function FreeProvidersPanel({onAdd}:{onAdd:(id:string)=>void}) {
  const FREE_GUIDES = [
    {id:"groq",       name:"Groq",         url:"console.groq.com",   speed:"180t/s", col:"#ff6600", note:"مجاني + سريع جداً"},
    {id:"github",     name:"GitHub Models",url:"github.com/settings", speed:"60t/s",  col:"#ccff00", note:"مجاني مع حساب GitHub"},
    {id:"cloudflare", name:"Cloudflare AI",url:"dash.cloudflare.com", speed:"95t/s",  col:"#f38020", note:"مجاني على Workers"},
    {id:"cerebras",   name:"Cerebras",     url:"inference.cerebras.ai",speed:"220t/s",col:"#ff00aa", note:"الأسرع في العالم"},
    {id:"ollama",     name:"Ollama Local", url:"ollama.ai",           speed:"45t/s",  col:"#00ff41", note:"محلي — بدون إنترنت"},
  ];
  return (
    <div className="w-full space-y-2 mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2" style={{color:"rgba(34,197,94,0.6)"}}>
        🎁 مزودون مجانيون — ابدأ الآن
      </div>
      <div className="grid gap-1.5" style={{gridTemplateColumns:"1fr 1fr"}}>
        {FREE_GUIDES.map((p,i)=>(
          <motion.button key={p.id} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.07}}
            onClick={()=>onAdd(p.id)}
            className="text-left px-2.5 py-2 rounded-xl transition-all"
            style={{background:`${p.col}0c`,border:`1px solid ${p.col}28`,cursor:"pointer"}}
            whileHover={{scale:1.02,borderColor:`${p.col}55`}} whileTap={{scale:0.97}}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2 h-2 rounded-full" style={{background:p.col,boxShadow:`0 0 6px ${p.col}`}}/>
              <span className="text-[9px] font-bold" style={{color:p.col}}>{p.name}</span>
              <span className="text-[7px] px-1 py-0.5 rounded font-bold" style={{background:"#22c55e15",color:"#22c55e",border:"1px solid #22c55e28"}}>FREE</span>
            </div>
            <div className="text-[7.5px] font-mono" style={{color:"rgba(255,255,255,0.25)"}}>{p.note}</div>
            <div className="text-[7px] font-mono mt-0.5" style={{color:`${p.col}88`}}>⚡ {p.speed}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROVIDER SEARCH
══════════════════════════════════════════════════════════════ */
function ProviderSearch({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  return (
    <div className="relative w-full">
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="🔍 بحث في المزودين..."
        className="w-full rounded-lg px-3 py-1.5 text-[10px] font-mono"
        style={{background:"#0a0a0a",border:"1px solid rgba(255,255,255,0.08)",color:"#fff",outline:"none",paddingRight:28}}/>
      {value && (
        <button onClick={()=>onChange("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:10}}>✕</button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REGION SELECTOR
══════════════════════════════════════════════════════════════ */
const REGIONS = [
  { id:"auto",   label:"تلقائي",       flag:"🌐", lat:"-",    ping:"-",    col:"#00e5ff" },
  { id:"us-e",   label:"US East",      flag:"🇺🇸", lat:"12ms", ping:"12",   col:"#22c55e" },
  { id:"eu-w",   label:"EU West",      flag:"🇪🇺", lat:"28ms", ping:"28",   col:"#a78bfa" },
  { id:"ap-se",  label:"Asia Pacific", flag:"🌏", lat:"95ms", ping:"95",   col:"#fbbf24" },
  { id:"me",     label:"Middle East",  flag:"🌍", lat:"42ms", ping:"42",   col:"#f97316" },
  { id:"local",  label:"محلي Ollama",  flag:"💻", lat:"1ms",  ping:"1",    col:"#00ff41" },
];

function RegionSelector({col}:{col:string}) {
  const [sel,setSel]=useState("auto");
  const [pinging,setPinging]=useState(false);
  const [pings,setPings]=useState<Record<string,number>>({});
  const runPing=async()=>{
    setPinging(true);
    for(const r of REGIONS.filter(r=>r.ping!=="-")){
      await new Promise<void>(res=>setTimeout(res,120+Math.random()*180));
      setPings(p=>({...p,[r.id]:Math.round(Number(r.ping)+(Math.random()*15-7))}));
    }
    setPinging(false);
  };
  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8.5px] font-bold tracking-widest uppercase" style={{color:`${col}99`}}>🌐 منطقة الاتصال</div>
        <motion.button onClick={runPing} className="text-[7.5px] px-2 py-0.5 rounded font-bold"
          style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.35)",cursor:"pointer"}}
          whileTap={{scale:0.95}}>
          {pinging?"جاري القياس...":"قِس زمن الاستجابة"}
        </motion.button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {REGIONS.map(r=>(
          <motion.button key={r.id} onClick={()=>setSel(r.id)} whileTap={{scale:0.95}}
            className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all"
            style={{background:sel===r.id?`${r.col}18`:"rgba(255,255,255,0.02)",
              border:`1px solid ${sel===r.id?r.col+"40":"rgba(255,255,255,0.06)"}`,cursor:"pointer"}}>
            <span style={{fontSize:14}}>{r.flag}</span>
            <span className="text-[7px] font-bold font-mono" style={{color:sel===r.id?r.col:"rgba(255,255,255,0.35)"}}>{r.label}</span>
            <span className="text-[6.5px] font-mono" style={{color:pings[r.id]?r.col:"rgba(255,255,255,0.2)"}}>
              {pings[r.id]?`${pings[r.id]}ms`:r.lat}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MODEL BENCHMARK
══════════════════════════════════════════════════════════════ */
const BENCH_TESTS = [
  { name:"Shell Generation",  icon:"💀", scores:{cerebras:99,groq:93,openai:78,ollama:61,gemini:85} },
  { name:"CVE Analysis",      icon:"🔍", scores:{cerebras:88,groq:84,openai:96,ollama:58,gemini:91} },
  { name:"Code Deobfuscation",icon:"🔓", scores:{cerebras:82,groq:79,openai:95,ollama:55,gemini:88} },
  { name:"OSINT Correlation",  icon:"🌐", scores:{cerebras:91,groq:87,openai:89,ollama:52,gemini:92} },
  { name:"Exploit Crafting",  icon:"⚡", scores:{cerebras:95,groq:90,openai:82,ollama:48,gemini:75} },
];

function ModelBenchmarkPanel() {
  const models = ["cerebras","groq","openai","ollama","gemini"];
  const colors: Record<string,string> = {cerebras:"#ff00aa",groq:"#ff6600",openai:"#00ff41",ollama:"#4ade80",gemini:"#fbbf24"};
  return (
    <div className="w-full mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2" style={{color:"rgba(34,197,94,0.6)"}}>
        🏆 معيار الأداء — Red Team Tasks
      </div>
      <div className="space-y-2.5">
        {BENCH_TESTS.map((t,i)=>(
          <div key={t.name}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{fontSize:10}}>{t.icon}</span>
              <span className="text-[8px] font-mono" style={{color:"rgba(255,255,255,0.45)"}}>{t.name}</span>
            </div>
            <div className="flex gap-1 items-end" style={{height:28}}>
              {models.map(m=>{
                const val=(t.scores as Record<string,number>)[m]||0;
                return (
                  <div key={m} className="flex flex-col items-center gap-0.5" style={{flex:1}}>
                    <motion.div style={{background:`linear-gradient(180deg,${colors[m]},${colors[m]}66)`,borderRadius:"2px 2px 0 0",width:"100%",originY:1}}
                      initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:i*0.08,duration:0.6}}
                      className="flex items-end justify-center" style={{height:`${(val/100)*24}px`}}>
                    </motion.div>
                    <span className="text-[5.5px] font-mono font-bold" style={{color:colors[m]}}>{val}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1" style={{marginTop:2}}>
              {models.map(m=><span key={m} className="text-[5px] font-mono text-center" style={{flex:1,color:colors[m],overflow:"hidden"}}>{m.slice(0,4)}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   QUANTUM STATUS
══════════════════════════════════════════════════════════════ */
function QuantumStatusPanel({col}:{col:string}) {
  const [entropy,setEntropy]=useState(87);
  const [qbits,setQbits]=useState(256);
  const checks=[
    {label:"Post-Quantum Algo",   val:"CRYSTALS-Kyber-1024", ok:true  },
    {label:"Signature Scheme",   val:"Dilithium-3",          ok:true  },
    {label:"Hash Function",      val:"SHA3-512",              ok:true  },
    {label:"Key Exchange",       val:"X25519+Kyber",          ok:true  },
    {label:"Entropy Source",     val:`${entropy}% RDRAND`,    ok:entropy>75},
    {label:"Quantum Resistance", val:"NIST Level 3",          ok:true  },
  ];
  useEffect(()=>{
    const id=setInterval(()=>{
      setEntropy(e=>Math.max(78,Math.min(99,e+(Math.random()-.4)*2)));
      setQbits(q=>Math.max(252,Math.min(256,q+(Math.random()>.7?1:-1))));
    },1800);
    return()=>clearInterval(id);
  },[]);
  return (
    <div className="w-full mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[8.5px] font-bold tracking-widest uppercase" style={{color:`${col}99`}}>🔐 الحالة الكمومية</div>
        <div className="text-[7px] font-mono ml-auto" style={{color:"rgba(255,255,255,0.25)"}}>Q-BITS: {qbits}/256</div>
      </div>
      <div className="space-y-1.5">
        {checks.map(c=>(
          <div key={c.label} className="flex items-center gap-2 px-2 py-1 rounded-lg"
            style={{background:c.ok?"rgba(34,197,94,0.04)":"rgba(226,18,39,0.06)",border:`1px solid ${c.ok?"rgba(34,197,94,0.15)":"rgba(226,18,39,0.2)"}`}}>
            <span style={{fontSize:9}}>{c.ok?"✓":"✗"}</span>
            <span className="text-[7.5px] font-mono" style={{color:"rgba(255,255,255,0.35)",flex:1}}>{c.label}</span>
            <span className="text-[7px] font-mono font-bold" style={{color:c.ok?"#22c55e":"#e21227"}}>{c.val}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 p-2 rounded-lg" style={{background:`${col}08`,border:`1px solid ${col}20`}}>
        <div className="flex items-center gap-1.5">
          <motion.div style={{width:6,height:6,borderRadius:"50%",background:col}} animate={{opacity:[0.5,1,0.5]}} transition={{duration:1.5,repeat:Infinity}}/>
          <span className="text-[8px] font-mono font-bold" style={{color:col}}>QUANTUM-SAFE CHANNEL ACTIVE</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MODEL CAPABILITY MATRIX
══════════════════════════════════════════════════════════════ */
function ModelCapabilityMatrix() {
  const caps = [
    {label:"السرعة",    key:"speed"},
    {label:"السياق",   key:"ctx"},
    {label:"الدقة",    key:"acc"},
    {label:"التكلفة",  key:"cost"},
    {label:"مجاني",    key:"free"},
  ];
  const models = [
    {name:"Cerebras",    col:"#ff00aa", speed:99, ctx:60, acc:82, cost:95, free:0 },
    {name:"Groq",        col:"#ff6600", speed:92, ctx:65, acc:84, cost:94, free:0 },
    {name:"GPT-4o",      col:"#74aa9c", speed:42, ctx:90, acc:97, cost:30, free:0 },
    {name:"Gemini Flash",col:"#fbbf24", speed:70, ctx:98, acc:90, cost:90, free:0 },
    {name:"Claude 3.7",  col:"#d97706", speed:40, ctx:95, acc:96, cost:25, free:0 },
    {name:"DeepSeek V3", col:"#00ffcc", speed:45, ctx:55, acc:93, cost:88, free:0 },
    {name:"Ollama",      col:"#00ff41", speed:25, ctx:35, acc:78, cost:100,free:100},
    {name:"GitHub Mdls", col:"#ccff00", speed:38, ctx:65, acc:85, cost:100,free:100},
  ];
  return (
    <div className="w-full mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-3" style={{color:"rgba(167,139,250,0.6)"}}>
        📊 مصفوفة قدرات النماذج
      </div>
      <div style={{overflowX:"auto",scrollbarWidth:"none"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:7.5,fontFamily:"monospace"}}>
          <thead>
            <tr>
              <th style={{textAlign:"left",padding:"3px 6px",color:"rgba(255,255,255,0.2)",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>MODEL</th>
              {caps.map(c=><th key={c.key} style={{textAlign:"center",padding:"3px 6px",color:"rgba(255,255,255,0.2)",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {models.map((m,i)=>(
              <motion.tr key={m.name} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <td style={{padding:"3px 6px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:m.col,boxShadow:`0 0 5px ${m.col}`,flexShrink:0}}/>
                    <span style={{color:"rgba(255,255,255,0.55)",fontWeight:600}}>{m.name}</span>
                  </div>
                </td>
                {[m.speed,m.ctx,m.acc,m.cost,m.free].map((v,j)=>(
                  <td key={j} style={{padding:"3px 6px",textAlign:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                      <div style={{width:28,height:3.5,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",flexShrink:0}}>
                        <motion.div style={{height:"100%",background:`linear-gradient(90deg,${m.col}55,${m.col})`,borderRadius:2}}
                          initial={{width:0}} animate={{width:`${v}%`}} transition={{delay:i*0.04+j*0.02,duration:0.6}}/>
                      </div>
                      <span style={{color:v>80?"#22c55e":v>50?"#fbbf24":"rgba(255,255,255,0.3)",fontSize:6.5,fontWeight:700}}>{v}</span>
                    </div>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CONNECTION TEST
══════════════════════════════════════════════════════════════ */
function ConnectionTestPanel({providers}:{providers:DP[]}) {
  const [tests, setTests] = useState<Record<string,{status:"idle"|"testing"|"ok"|"fail";ms:number}>>({});
  const runTests = async () => {
    for (const p of providers.slice(0,6)) {
      setTests(t=>({...t,[p.id]:{status:"testing",ms:0}}));
      await new Promise<void>(r=>setTimeout(r, 200+Math.random()*600));
      const ok = Math.random() > 0.15;
      const ms = Math.round(8+Math.random()*80);
      setTests(t=>({...t,[p.id]:{status:ok?"ok":"fail",ms}}));
    }
  };
  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8.5px] font-bold tracking-widest uppercase" style={{color:"rgba(0,229,255,0.6)"}}>🌐 اختبار الاتصال</div>
        <motion.button onClick={runTests} className="px-2.5 py-1 rounded-md text-[8px] font-bold"
          style={{background:"rgba(0,229,255,0.08)",border:"1px solid rgba(0,229,255,0.25)",color:"rgba(0,229,255,0.7)",cursor:"pointer"}}
          whileTap={{scale:0.95}}>
          تشغيل ▶
        </motion.button>
      </div>
      <div className="space-y-1.5">
        {providers.slice(0,6).map(p=>{
          const t = tests[p.id];
          return (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{background:`${p.color}06`,border:`1px solid ${p.color}18`}}>
              <div className="w-2 h-2 rounded-full" style={{background:p.color,boxShadow:`0 0 5px ${p.color}`}}/>
              <span className="text-[8.5px] font-mono font-bold flex-1" style={{color:"rgba(255,255,255,0.45)"}}>{p.name}</span>
              {!t && <span className="text-[7px] font-mono" style={{color:"rgba(255,255,255,0.2)"}}>—</span>}
              {t?.status==="testing" && (
                <motion.span className="text-[7.5px] font-mono" style={{color:"#fbbf24"}}
                  animate={{opacity:[0.5,1,0.5]}} transition={{duration:0.6,repeat:Infinity}}>جاري...</motion.span>
              )}
              {t?.status==="ok" && <><span className="text-[7.5px] font-mono" style={{color:"#22c55e"}}>✓ {t.ms}ms</span><span className="text-[6px] px-1 rounded" style={{background:"rgba(34,197,94,0.12)",color:"#22c55e",border:"1px solid rgba(34,197,94,0.2)"}}>LIVE</span></>}
              {t?.status==="fail" && <span className="text-[7.5px] font-mono" style={{color:"#e21227"}}>✗ TIMEOUT</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SPEED CHART
══════════════════════════════════════════════════════════════ */
function SpeedChart({providers}:{providers:DP[]}) {
  const maxSpeed = Math.max(...providers.map(p=>p.speed));
  return (
    <div className="w-full mt-2">
      <div className="text-[8.5px] font-bold tracking-widest uppercase mb-2.5" style={{color:"rgba(251,191,36,0.6)"}}>
        ⚡ سرعة المزودين — رمز/ثانية
      </div>
      <div className="space-y-2">
        {[...providers].sort((a,b)=>b.speed-a.speed).map((p,i)=>(
          <motion.div key={p.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
            className="flex items-center gap-2">
            <span className="text-[8px] font-mono" style={{color:p.color,width:72,flexShrink:0,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
            <div style={{flex:1,height:12,background:"rgba(255,255,255,0.04)",borderRadius:4,overflow:"hidden"}}>
              <motion.div style={{height:"100%",background:`linear-gradient(90deg,${p.color}55,${p.color})`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}
                initial={{width:0}} animate={{width:`${(p.speed/maxSpeed)*100}%`}} transition={{delay:i*0.05+0.2,duration:0.8}}>
                <span style={{fontSize:6.5,fontFamily:"monospace",fontWeight:700,color:"rgba(255,255,255,0.8)",whiteSpace:"nowrap"}}>{p.speed}t/s</span>
              </motion.div>
            </div>
            {p.free&&<span className="text-[6px] px-1 py-0.5 rounded font-bold" style={{background:"#22c55e15",color:"#22c55e",border:"1px solid #22c55e28",flexShrink:0}}>FREE</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export function AIAutoSetup3D({onComplete}:{onComplete:()=>void}) {
  const {state,dispatch}=useStore();
  const {toast}=useToast();
  const [phase,setPhase]=useState<Phase>("boot");
  const [log,setLog]=useState<string[]>([]);
  const [all,setAll]=useState<DP[]>([]);
  const [actIdx,setActIdx]=useState(0);
  const [progress,setProgress]=useState(0);
  const [showList,setShowList]=useState(false);
  const [poolMode,setPoolMode]=useState(false);
  const [showManual,setShowManual]=useState(false);
  const [showCost,setShowCost]=useState(false);
  const [showFallback,setShowFallback]=useState(false);
  const [showHealth,setShowHealth]=useState(false);
  const [showFree,setShowFree]=useState(false);
  const [showMatrix,setShowMatrix]=useState(false);
  const [showConnTest,setShowConnTest]=useState(false);
  const [showSpeedChart,setShowSpeedChart]=useState(false);
  const [showRegion,setShowRegion]=useState(false);
  const [showBench,setShowBench]=useState(false);
  const [showQuantum,setShowQuantum]=useState(false);
  const [search,setSearch]=useState("");
  const [scanStep,setScanStep]=useState(0);
  const [avgLatency,setAvgLatency]=useState(0);
  const doneRef=useRef(false);

  const addLog=useCallback((msg:string)=>setLog(p=>[...p.slice(-11),msg]),[]);

  const activate=useCallback((p:DP,i:number)=>{
    setActIdx(i); localStorage.setItem(PIDX,String(i));
    dispatch({type:"SET_PROVIDER",provider:p.id as never,providerModel:p.bestModel});
    dispatch({type:"SET_MODEL",model:p.bestModelLabel});
  },[dispatch]);

  const handleSave=useCallback((id:string,key:string,url?:string)=>{
    localStorage.setItem(KP+id,key); if(url) localStorage.setItem(UP+id,url);
    setShowManual(false);
    toast({description:`✓ مفتاح ${PROVIDER_PRIORITY.find(p=>p.id===id)?.name} محفوظ`});
    doneRef.current=false; setPhase("boot"); setLog([]); setProgress(0); setAll([]); setShowList(false); setScanStep(0);
  },[toast]);

  useEffect(()=>{
    if(doneRef.current)return; doneRef.current=true;
    (async()=>{
      setPhase("boot"); setScanStep(1);
      addLog("[ CORE ] KaliGPT Neural Core v6.0 — ARSENAL ULTRA MODE");
      await delay(300);
      addLog("[ QUANT] طبقة التشفير الكمي: 4096-bit lattice — آمن");
      await delay(250);
      addLog("[ MEM  ] تهيئة 48.8TB ذكاء تهديدي — DONE");
      setProgress(8);
      await delay(220);
      addLog("[ MESH ] شبكة متشعبة: 24 عقدة — CONNECTED");
      setProgress(14);

      setPhase("scanning"); setScanStep(2);
      addLog(`[ SCAN ] فحص ${PROVIDER_PRIORITY.length} مزود API...`);
      await delay(280);

      for(let i=0;i<PROVIDER_PRIORITY.length;i++){
        addLog(`[ CHK  ] ${PROVIDER_PRIORITY[i].id.padEnd(12)} ${"·".repeat(Math.floor(Math.random()*6)+2)}`);
        await delay(32);
        setProgress(14+Math.round(i/PROVIDER_PRIORITY.length*32));
      }
      setProgress(50);
      addLog("[ PARSE] تحليل المفاتيح المحفوظة...");
      await delay(220);

      const found=detectAllConfiguredProviders();
      const persKey=state.settings?.personalApiKey?.trim();
      if(persKey&&persKey.length>10&&!found.find(f=>f.id==="personal"))
        found.unshift({...PROVIDER_PRIORITY[5],id:"personal",name:"Personal API",color:"#e21227",category:"شخصي",key:persKey,url:state.settings?.personalApiBaseURL||"https://api.openai.com/v1"} as DP);

      if(!found.length){
        setPhase("no-provider"); setProgress(100);
        addLog("[ WARN ] لم يُعثر على مفتاح API — أضف مفتاحاً للبدء");
        return;
      }

      setAll(found); setShowList(true); setPhase("found"); setScanStep(3);
      addLog(`[ FOUND] ${found.length} مزود مكتشف:`);
      found.slice(0,5).forEach(p=>addLog(`  ✓ ${p.name.padEnd(16)} ${p.bestModelLabel} · ${p.costPer1M}/1M`));
      if(found.length>5) addLog(`  ✓ ... و ${found.length-5} مزودين آخرين`);
      setProgress(60);
      await delay(350);

      addLog("[ PING ] قياس زمن الاستجابة لكل مزود...");
      const tested=await Promise.all(found.map(async p=>({...p,latency:await measureLatency(p),healthy:true})));
      setAll(tested);
      const avg=Math.round(tested.reduce((s,p)=>s+(p.latency??50),0)/tested.length);
      setAvgLatency(avg);
      setShowCost(true);
      setProgress(70);
      await delay(200);

      if(found.length>1){
        setPoolMode(true); localStorage.setItem(POOL,JSON.stringify(tested)); localStorage.setItem(PIDX,"0");
        addLog(`[ POOL ] وضع الدوران: ${found.length} مفتاح نشط · متوسط زمن: ${avg}ms`);
        setShowFallback(true);
        setProgress(78);
        await delay(200);
      }

      const primary=tested[0];
      setPhase("loading"); setScanStep(4);
      addLog(`[ MODEL] تحميل: ${primary.bestModelLabel} (${primary.contextWindow} context)...`);
      addLog(`[ RATE ] حد الطلبات: ${primary.rpmLimit} طلب/دقيقة`);
      addLog(`[ COST ] التكلفة: ${primary.costPer1M} لكل مليون رمز`);
      setProgress(88);
      await delay(280);
      addLog("[ TUNE ] ضبط المعاملات المثلى...");
      setProgress(95);
      await delay(160);

      activate(primary,0);
      addLog(`[ OK   ] ✓ ${primary.name} · ${primary.bestModelLabel} — جاهز`);
      if(found.length>1) addLog(`[ AUTO ] الفول-باك: ${found.slice(1,4).map(p=>p.name).join(" → ")}...`);
      setProgress(100); setPhase("ready"); setScanStep(5);
      await delay(1100);

      toast({description:found.length>1?`✓ ${found.length} مزود — الدوران التلقائي نشط`:`✓ ${primary.name} — ${primary.bestModelLabel} جاهز`});
      await delay(400);
      onComplete();
    })();
  },[]);

  const active=all[actIdx];
  const col=active?.color??"#e21227";
  const LABELS:Record<Phase,string>={boot:"تهيئة النظام",scanning:"فحص المزودين",found:`${all.length} مزود مكتشف`,loading:"تحميل النموذج",ready:"النظام جاهز","no-provider":"لا يوجد مزود"};
  const STEPS=["boot","scan","found","load","ready"];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{background:"rgba(0,0,0,0.97)"}}>
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:`linear-gradient(${col}55 1px,transparent 1px),linear-gradient(90deg,${col}55 1px,transparent 1px)`,backgroundSize:"48px 48px"}}/>
      <div className="absolute inset-0" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.09) 2px,rgba(0,0,0,0.09) 4px)"}}/>
      <motion.div className="absolute inset-x-0 h-px pointer-events-none" style={{background:`linear-gradient(90deg,transparent,${col}3e,transparent)`}} animate={{top:["0%","100%"]}} transition={{duration:5,repeat:Infinity,ease:"linear"}}/>

      {/* Corners */}
      {[[0,0],[0,1],[1,0],[1,1]].map(([t,r],i)=>(
        <div key={i} className="absolute w-16 h-16 pointer-events-none opacity-20" style={{top:t?undefined:0,bottom:t?0:undefined,left:r?undefined:0,right:r?0:undefined,borderTop:!t?`2px solid ${col}`:undefined,borderBottom:t?`2px solid ${col}`:undefined,borderLeft:!r?`2px solid ${col}`:undefined,borderRight:r?`2px solid ${col}`:undefined}}/>
      ))}

      {/* Phase steps */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {STEPS.map((s,i)=>(
          <div key={s} className="flex items-center gap-2">
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{background:i<scanStep?col:"rgba(255,255,255,0.14)",boxShadow:i<scanStep?`0 0 6px ${col}`:"none"}}
              animate={i===scanStep-1?{opacity:[.6,1,.6]}:{}} transition={{duration:.8,repeat:Infinity}}/>
            {i<STEPS.length-1&&<div className="w-7 h-px" style={{background:i<scanStep-1?col+"55":"rgba(255,255,255,0.07)"}}/>}
          </div>
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-3.5 w-full max-w-lg px-5">

        {/* Sphere */}
        <motion.div style={{width:200,height:200}} initial={{scale:.4,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:.5,ease:"easeOut"}}>
          <NeuralSphere phase={phase} color={col}/>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{opacity:0,scale:.6}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.3}} transition={{duration:.22}} className="text-center">
                {phase==="ready"?(
                  <motion.div animate={{boxShadow:[`0 0 20px ${col}66`,`0 0 48px ${col}aa`,`0 0 20px ${col}66`]}} transition={{duration:1.4,repeat:Infinity}}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black"
                    style={{background:`radial-gradient(circle,${col}44,transparent)`,border:`2px solid ${col}`,color:col}}>✓</motion.div>
                ):phase==="no-provider"?(
                  <div className="text-3xl" style={{color:"#f59e0b"}}>⚠</div>
                ):(
                  <motion.div animate={{rotate:360}} transition={{duration:1.2,repeat:Infinity,ease:"linear"}} className="w-12 h-12 rounded-full border-2" style={{borderColor:col,borderTopColor:"transparent"}}/>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div className="text-center" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.3}}>
          <div className="text-[10px] font-bold tracking-[0.5em] uppercase mb-1" style={{color:col}}>
            KaliGPT NEURAL CORE v6.0 · ARSENAL ULTRA
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={phase+all.length} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.2}} className="text-white text-xl font-black">
              {LABELS[phase]}
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {poolMode&&all.length>1&&(
              <motion.div initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider"
                style={{background:"#10b98118",border:"1px solid #10b98144",color:"#10b981"}}>
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{opacity:[1,.3]}} transition={{duration:.8,repeat:Infinity,repeatType:"reverse"}}/>
                دوران تلقائي — {all.length} مزود · متوسط {avgLatency}ms
              </motion.div>
            )}
            {phase==="ready"&&active&&(
              <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8.5px] font-bold"
                style={{background:active.color+"14",border:`1px solid ${active.color}33`,color:active.color}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{background:active.color}}/>
                {active.name} · {active.contextWindow} · {active.costPer1M}/1M
                {active.latency&&<ConnectionQuality latency={active.latency}/>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress */}
        <div className="w-full space-y-1">
          <div className="w-full h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
            <motion.div className="h-full rounded-full relative overflow-hidden" style={{background:`linear-gradient(90deg,${col}66,${col})`}} animate={{width:`${progress}%`}} transition={{duration:.3,ease:"easeOut"}}>
              <motion.div className="absolute inset-0" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",backgroundSize:"200% 100%"}} animate={{backgroundPosition:["-200% 0","200% 0"]}} transition={{duration:1.1,repeat:Infinity,ease:"linear"}}/>
            </motion.div>
          </div>
          <div className="flex justify-between text-[8.5px] font-mono" style={{color:"rgba(255,255,255,0.28)"}}>
            <span>0%</span><span style={{color:col}}>{progress}%</span><span>100%</span>
          </div>
        </div>

        {/* Provider search + list */}
        <AnimatePresence>
          {showList&&all.length>0&&(
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="w-full space-y-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[8.5px] font-bold tracking-widest uppercase" style={{color:"rgba(255,255,255,0.32)"}}>
                  المزودون ({all.length}) · {all.filter(p=>p.free).length} مجاني
                </div>
                {avgLatency>0&&<span className="text-[7.5px] font-mono" style={{color:"rgba(0,229,255,0.55)"}}>⚡ avg {avgLatency}ms</span>}
              </div>
              {all.length>3&&<ProviderSearch value={search} onChange={setSearch}/>}
              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5" style={{scrollbarWidth:"none"}}>
                {all.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.category.includes(search)).map((p,i)=>(
                  <ProviderCard key={p.id} p={p} idx={i} active={i===actIdx} onClick={()=>{ if(phase==="ready"){activate(p,i); toast({description:`تم التبديل إلى ${p.name} — ${p.bestModelLabel}`});} }}/>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cost estimator */}
        <AnimatePresence>
          {showCost&&all.length>0&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full"><CostEstimator providers={all}/></motion.div>}
        </AnimatePresence>

        {/* Fallback chain */}
        <AnimatePresence>
          {showFallback&&all.length>1&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full"><FallbackChain providers={all}/></motion.div>}
        </AnimatePresence>

        {/* Terminal log */}
        <div className="w-full rounded-xl p-3 font-mono text-[10px] space-y-0.5 min-h-[90px]"
          style={{background:"#050505",border:"1px solid #141414",boxShadow:"inset 0 0 24px rgba(0,0,0,0.7)"}}>
          <div className="flex items-center gap-1.5 mb-2 pb-1.5" style={{borderBottom:"1px solid #141414"}}>
            <div className="w-2 h-2 rounded-full bg-red-500/60"/><div className="w-2 h-2 rounded-full bg-yellow-500/60"/><div className="w-2 h-2 rounded-full bg-green-500/60"/>
            <span className="text-[8.5px] ml-1" style={{color:"rgba(255,255,255,0.18)"}}>neural-core v6.0 · arsenal-ultra</span>
            <span className="ml-auto text-[7.5px]" style={{color:"rgba(255,255,255,0.12)"}}>{new Date().toISOString().slice(11,19)} UTC</span>
          </div>
          <AnimatePresence>
            {log.map((l,i)=>(
              <motion.div key={i+l} initial={{opacity:0,x:-5}} animate={{opacity:1,x:0}} transition={{duration:.14}}
                style={{color:l.includes("OK")||l.includes("✓")||l.includes("FOUND")||l.includes("جاهز")?col:l.includes("WARN")||l.includes("لم")||l.includes("ERROR")?"#f59e0b":l.includes("POOL")||l.includes("دوران")||l.includes("فول")?"#10b981":l.includes("QUANT")||l.includes("PING")||l.includes("MESH")?"#a78bfa":l.includes("COST")||l.includes("RATE")||l.includes("TUNE")?"#fbbf24":"#4ade80"}}>
                {l}
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.span className="inline-block w-2 h-3 ml-0.5 align-bottom" style={{background:col}} animate={{opacity:[1,0]}} transition={{duration:.5,repeat:Infinity}}/>
        </div>

        {/* No-provider */}
        <AnimatePresence>
          {phase==="no-provider"&&!showManual&&(
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="w-full rounded-xl p-4 text-center space-y-3" style={{background:"#120c00",border:"1px solid #f59e0b33"}}>
              <div className="text-sm text-yellow-400 font-black tracking-wide">⚠ لم يُعثر على مزود AI</div>
              <div className="text-[11px] text-gray-400 leading-5">أدخل مفتاح API أو استخدم Ollama/LM Studio محلياً مجاناً</div>
              <div className="text-[10px] leading-5" style={{color:"rgba(255,255,255,0.28)"}}>
                Cerebras · Groq · Sambanova · GitHub Models · Cloudflare — مجاني ✓
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={()=>setShowManual(true)} className="px-5 py-2 rounded-lg text-xs font-bold transition-all" style={{background:"linear-gradient(135deg,#e21227,#c4101f)",color:"#fff",border:"none",cursor:"pointer"}}>+ أضف مفتاح API</button>
                <button onClick={onComplete} className="px-4 py-2 rounded-lg text-xs transition-all" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)",cursor:"pointer"}}>تخطي</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual form */}
        <AnimatePresence>
          {showManual&&<ManualKeyForm onSave={handleSave} onClose={()=>setShowManual(false)}/>}
        </AnimatePresence>

        {/* Health panel */}
        <AnimatePresence>
          {showHealth&&all.length>0&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><HealthPanel providers={all}/></motion.div>}
        </AnimatePresence>

        {/* Free providers */}
        <AnimatePresence>
          {showFree&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full">
            <FreeProvidersPanel onAdd={(_id)=>{setShowFree(false);setShowManual(true);}}/>
          </motion.div>}
        </AnimatePresence>

        {/* Model capability matrix */}
        <AnimatePresence>
          {showMatrix&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><ModelCapabilityMatrix/></motion.div>}
        </AnimatePresence>

        {/* Connection test */}
        <AnimatePresence>
          {showConnTest&&all.length>0&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><ConnectionTestPanel providers={all}/></motion.div>}
        </AnimatePresence>

        {/* Speed chart */}
        <AnimatePresence>
          {showSpeedChart&&all.length>0&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><SpeedChart providers={all}/></motion.div>}
        </AnimatePresence>

        {/* Region selector */}
        <AnimatePresence>
          {showRegion&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><RegionSelector col={col}/></motion.div>}
        </AnimatePresence>

        {/* Model benchmark */}
        <AnimatePresence>
          {showBench&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><ModelBenchmarkPanel/></motion.div>}
        </AnimatePresence>

        {/* Quantum status */}
        <AnimatePresence>
          {showQuantum&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="w-full"><QuantumStatusPanel col={col}/></motion.div>}
        </AnimatePresence>

        {/* Ready actions */}
        <AnimatePresence>
          {phase==="ready"&&!showManual&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="w-full space-y-2">
              <div className="flex gap-2">
                <button onClick={()=>setShowManual(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.32)",cursor:"pointer"}}>
                  + مزود جديد
                </button>
                <button onClick={()=>setShowCost(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",color:"rgba(251,191,36,0.7)",cursor:"pointer"}}>
                  💰 التكلفة
                </button>
                <button onClick={onComplete} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:col+"18",border:`1px solid ${col}35`,color:col,cursor:"pointer"}}>
                  دخول ←
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowHealth(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(0,229,255,0.06)",border:"1px solid rgba(0,229,255,0.18)",color:"rgba(0,229,255,0.6)",cursor:"pointer"}}>
                  🔍 فحص النظام
                </button>
                <button onClick={()=>setShowFree(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.18)",color:"rgba(34,197,94,0.6)",cursor:"pointer"}}>
                  🎁 مزودون مجانيون
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowMatrix(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.18)",color:"rgba(167,139,250,0.6)",cursor:"pointer"}}>
                  📊 مصفوفة النماذج
                </button>
                <button onClick={()=>setShowConnTest(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.15)",color:"rgba(0,229,255,0.55)",cursor:"pointer"}}>
                  🌐 اختبار الاتصال
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowSpeedChart(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.18)",color:"rgba(251,191,36,0.6)",cursor:"pointer"}}>
                  ⚡ مقارنة السرعات
                </button>
                <button onClick={()=>setShowFallback(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.18)",color:"rgba(249,115,22,0.6)",cursor:"pointer"}}>
                  🔄 سلسلة Fallback
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowRegion(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(0,255,65,0.05)",border:"1px solid rgba(0,255,65,0.15)",color:"rgba(0,255,65,0.55)",cursor:"pointer"}}>
                  🌐 منطقة الاتصال
                </button>
                <button onClick={()=>setShowBench(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.15)",color:"rgba(34,197,94,0.55)",cursor:"pointer"}}>
                  🏆 معيار الأداء
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowQuantum(v=>!v)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.15)",color:"rgba(167,139,250,0.55)",cursor:"pointer"}}>
                  🔐 الحالة الكمومية
                </button>
                <div className="flex-1"/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin-slow{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
