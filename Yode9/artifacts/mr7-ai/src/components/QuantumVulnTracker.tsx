import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CVEEntry {
  id: string; cve: string; score: number; severity: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";
  product: string; description: string; published: string;
  patchAvailable: boolean; exploitAvailable: boolean;
}

const DEMO_CVES: CVEEntry[] = [
  { id:"1", cve:"CVE-2024-3094", score:10.0, severity:"CRITICAL",
    product:"XZ Utils 5.6.0-5.6.1", patchAvailable:true, exploitAvailable:true,
    description:"Backdoor in XZ Utils via build system compromise (supply chain)", published:"2024-03-29" },
  { id:"2", cve:"CVE-2024-21887", score:9.1, severity:"CRITICAL",
    product:"Ivanti Connect Secure", patchAvailable:true, exploitAvailable:true,
    description:"Command injection in web components allows remote execution", published:"2024-01-10" },
  { id:"3", cve:"CVE-2024-1234", score:9.8, severity:"CRITICAL",
    product:"Custom API Server", patchAvailable:false, exploitAvailable:true,
    description:"Unauthenticated RCE via unvalidated deserialization in REST endpoint", published:"2024-06-01" },
  { id:"4", cve:"CVE-2024-4040", score:8.6, severity:"HIGH",
    product:"CrushFTP <10.7.1", patchAvailable:true, exploitAvailable:true,
    description:"Server-side template injection allows VFS escape", published:"2024-04-19" },
  { id:"5", cve:"CVE-2024-22024", score:8.3, severity:"HIGH",
    product:"Ivanti Policy Secure", patchAvailable:true, exploitAvailable:false,
    description:"XML external entity allows authentication bypass", published:"2024-02-08" },
  { id:"6", cve:"CVE-2024-27198", score:9.8, severity:"CRITICAL",
    product:"JetBrains TeamCity", patchAvailable:true, exploitAvailable:true,
    description:"Auth bypass enables RCE without credentials on all endpoints", published:"2024-03-04" },
  { id:"7", cve:"CVE-2023-44487", score:7.5, severity:"HIGH",
    product:"nginx <1.25.3", patchAvailable:true, exploitAvailable:true,
    description:"HTTP/2 Rapid Reset Attack causing denial of service", published:"2023-10-10" },
  { id:"8", cve:"CVE-2024-6387", score:8.1, severity:"HIGH",
    product:"OpenSSH <9.8p1", patchAvailable:true, exploitAvailable:false,
    description:"regreSSHion: RCE in glibc-based Linux systems via signal handler race", published:"2024-07-01" },
];

const SEV_COLORS: Record<CVEEntry["severity"], string> = {
  CRITICAL:"#e21227", HIGH:"#ff7800", MEDIUM:"#f59e0b", LOW:"#10b981",
};

export function QuantumVulnTracker({ className = "" }: { className?: string }) {
  const [cves, setCves] = useState(DEMO_CVES);
  const [sortBy, setSortBy] = useState<"score"|"published">("score");
  const [filterSev, setFilterSev] = useState<CVEEntry["severity"]|"ALL">("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      const newCve: CVEEntry = {
        id: Math.random().toString(36).slice(2),
        cve: `CVE-2024-${Math.floor(10000+Math.random()*89999)}`,
        score: +(7 + Math.random() * 3).toFixed(1),
        severity: Math.random() > 0.5 ? "HIGH" : "CRITICAL",
        product: ["Apache 2.4", "WordPress 6.x", "OpenSSL 3.x", "nginx 1.22"][Math.floor(Math.random()*4)],
        description: "New vulnerability detected by threat intel feed — analysis in progress",
        published: new Date().toISOString().slice(0,10),
        patchAvailable: Math.random() > 0.6,
        exploitAvailable: Math.random() > 0.7,
      };
      setCves(prev => [newCve, ...prev].slice(0,50));
    }, 25000);
    return () => clearInterval(iv);
  }, []);

  const sorted = [...cves]
    .filter(c => filterSev === "ALL" || c.severity === filterSev)
    .filter(c => !search || c.cve.toLowerCase().includes(search.toLowerCase()) ||
      c.product.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortBy === "score" ? b.score - a.score : b.published.localeCompare(a.published));

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-wrap gap-y-1">
        <span className="text-[10px] font-bold tracking-[0.15em] text-red-400 font-mono">CVE TRACKER</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search CVE or product..."
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] text-gray-300 placeholder:text-gray-700 outline-none font-mono" />
        <select value={filterSev} onChange={e=>setFilterSev(e.target.value as typeof filterSev)}
          className="bg-black border border-white/10 rounded px-1 py-0.5 text-[9px] text-gray-400 outline-none font-mono">
          <option value="ALL">ALL</option>
          {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(s =>
            <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={()=>setSortBy(s=>s==="score"?"published":"score")}
          className="text-[9px] text-gray-600 hover:text-gray-400 font-mono border border-white/5 px-1.5 py-0.5 rounded">
          SORT: {sortBy === "score" ? "SCORE" : "DATE"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto"
        style={{scrollbarWidth:"thin",scrollbarColor:"rgba(226,18,39,0.2) transparent"}}>
        <AnimatePresence>
          {sorted.map(cve => {
            const color = SEV_COLORS[cve.severity];
            return (
              <motion.div key={cve.id} layout initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                className="border-b border-white/4 hover:bg-white/2 cursor-pointer transition-colors"
                onClick={()=>setExpanded(e=>e===cve.id?null:cve.id)}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-shrink-0 text-center w-8">
                    <div className="text-[11px] font-bold" style={{color}}>
                      {cve.score.toFixed(1)}
                    </div>
                    <div className="text-[8px] text-gray-700">/10</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono text-white/90">{cve.cve}</span>
                      <span className="text-[8px] font-bold px-1 rounded"
                        style={{color, background:`${color}20`, border:`1px solid ${color}40`}}>
                        {cve.severity}
                      </span>
                      {cve.exploitAvailable && (
                        <span className="text-[8px] text-red-500 border border-red-900/40 px-1 rounded">PoC</span>
                      )}
                      {!cve.patchAvailable && (
                        <span className="text-[8px] text-yellow-600 border border-yellow-900/40 px-1 rounded">0-DAY</span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono truncate">{cve.product}</div>
                  </div>
                  <div className="text-[8px] text-gray-700 font-mono flex-shrink-0">{cve.published}</div>
                  <div className="text-gray-700 text-[10px]">{expanded===cve.id?"▲":"▼"}</div>
                </div>
                <AnimatePresence>
                  {expanded===cve.id && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
                      exit={{height:0,opacity:0}} className="overflow-hidden">
                      <div className="px-3 pb-3 text-[9px] font-mono space-y-1"
                        style={{borderLeft:`2px solid ${color}40`, marginLeft:12}}>
                        <p className="text-gray-400 leading-relaxed">{cve.description}</p>
                        <div className="flex gap-4 text-gray-600 mt-1.5">
                          <span>Patch: <span style={{color:cve.patchAvailable?"#10b981":"#e21227"}}>
                            {cve.patchAvailable?"AVAILABLE":"PENDING"}
                          </span></span>
                          <span>Exploit: <span style={{color:cve.exploitAvailable?"#e21227":"#10b981"}}>
                            {cve.exploitAvailable?"PUBLIC":"PRIVATE"}
                          </span></span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button className="text-[9px] px-2 py-0.5 rounded border"
                            style={{color,borderColor:`${color}40`,background:`${color}10`}}>
                            View Details
                          </button>
                          <button className="text-[9px] px-2 py-0.5 rounded border border-white/10 text-gray-600 hover:text-white">
                            Add to Report
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="px-3 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] text-gray-700 font-mono">{sorted.length} CVEs</span>
        <div className="flex gap-2">
          {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(s => (
            <span key={s} className="text-[9px] font-mono" style={{color:SEV_COLORS[s]}}>
              {s[0]}:{cves.filter(c=>c.severity===s).length}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
