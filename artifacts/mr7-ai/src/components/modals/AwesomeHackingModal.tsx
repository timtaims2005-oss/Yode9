import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ExternalLink, Star, Shield, Globe, Code2, Brain, Zap, Bug, Lock, Terminal, Database, Layers, Eye, Cpu, AlertTriangle, BookOpen, ChevronRight, Filter } from "lucide-react";

const P = "#a78bfa"; // purple
const Pg = (n: number) => `rgba(167,139,250,${n})`;

interface AwesomeHackingModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

interface Resource { name: string; desc: string; url: string; stars?: string; category: string; tags: string[]; }

const CATEGORIES = [
  { id: "all",       label: "All Resources", icon: Layers,        count: 54 },
  { id: "android",   label: "Android Security", icon: Cpu,        count: 6  },
  { id: "appsec",    label: "AppSec",         icon: Shield,       count: 5  },
  { id: "bug",       label: "Bug Bounty",     icon: Bug,          count: 4  },
  { id: "ctf",       label: "CTF",            icon: Terminal,     count: 5  },
  { id: "forensics", label: "Forensics",      icon: Eye,          count: 5  },
  { id: "malware",   label: "Malware Analysis",icon: AlertTriangle,count: 6 },
  { id: "network",   label: "Network Hacking",icon: Globe,        count: 4  },
  { id: "osint",     label: "OSINT",          icon: Search,       count: 4  },
  { id: "pentest",   label: "Pentest",        icon: Zap,          count: 5  },
  { id: "reverse",   label: "Reverse Eng.",   icon: Code2,        count: 4  },
  { id: "web",       label: "Web Security",   icon: Lock,         count: 6  },
];

const RESOURCES: Resource[] = [
  { name: "Awesome Android Security", desc: "Collection of Android security related resources and tools", url: "https://github.com/ashishb/android-security-awesome", stars: "7.2k", category: "android", tags: ["mobile","android","apk"] },
  { name: "Awesome AppSec", desc: "Resources for learning about application security", url: "https://github.com/paragonie/awesome-appsec", stars: "5.9k", category: "appsec", tags: ["web","appsec","owasp"] },
  { name: "Awesome Bug Bounty", desc: "List of Bug Bounty Programs and write-ups from hunters", url: "https://github.com/djadmin/awesome-bug-bounty", stars: "4.1k", category: "bug", tags: ["bounty","writeup","hackerone"] },
  { name: "Awesome CTF", desc: "CTF frameworks, libraries, resources and tools", url: "https://github.com/apsdehal/awesome-ctf", stars: "9.8k", category: "ctf", tags: ["ctf","pwn","crypto"] },
  { name: "Awesome Forensics", desc: "Forensic analysis tools and resources", url: "https://github.com/Cugu/awesome-forensics", stars: "3.2k", category: "forensics", tags: ["forensics","disk","memory"] },
  { name: "Awesome Malware Analysis", desc: "Malware analysis tools and resources", url: "https://github.com/rshipp/awesome-malware-analysis", stars: "11.2k", category: "malware", tags: ["malware","sandbox","reverse"] },
  { name: "Awesome Network Hacking", desc: "Network attack tools and resources", url: "https://github.com/Hack-with-Github/Awesome-Hacking", stars: "14.5k", category: "network", tags: ["network","mitm","wifi"] },
  { name: "Awesome OSINT", desc: "OSINT tools and resources collection", url: "https://github.com/jivoi/awesome-osint", stars: "18.7k", category: "osint", tags: ["osint","recon","socmint"] },
  { name: "Awesome Penetration Testing", desc: "Penetration testing resources, tools and frameworks", url: "https://github.com/enaqx/awesome-pentest", stars: "22.1k", category: "pentest", tags: ["pentest","exploit","recon"] },
  { name: "Awesome Reverse Engineering", desc: "Reverse engineering resources and tools", url: "https://github.com/onethawt/reverseengineering-reading-list", stars: "4.7k", category: "reverse", tags: ["reverse","disasm","binary"] },
  { name: "Awesome Web Security", desc: "Curated list of Web Security materials and resources", url: "https://github.com/qazbnm456/awesome-web-security", stars: "10.8k", category: "web", tags: ["web","xss","sqli","csrf"] },
  { name: "PayloadsAllTheThings", desc: "Useful payloads and bypasses for Web Application Security", url: "https://github.com/swisskyrepo/PayloadsAllTheThings", stars: "61.4k", category: "web", tags: ["payload","bypass","web"] },
  { name: "SecLists", desc: "Collection of multiple types of lists for security assessments", url: "https://github.com/danielmiessler/SecLists", stars: "58.2k", category: "pentest", tags: ["wordlist","fuzzing","brute"] },
  { name: "GTFOBins", desc: "Unix binaries exploitable to bypass local security restrictions", url: "https://gtfobins.github.io", stars: "11.3k", category: "pentest", tags: ["privilege","lolbins","unix"] },
  { name: "Hack The Box", desc: "Online cybersecurity training platform with CTF challenges", url: "https://hackthebox.com", stars: undefined, category: "ctf", tags: ["labs","practice","pwn"] },
  { name: "CyberChef", desc: "Web app for analysing and decoding data without complex tools", url: "https://gchq.github.io/CyberChef", stars: "28.6k", category: "forensics", tags: ["encoding","decode","analysis"] },
  { name: "OWASP Top 10", desc: "Standard awareness document for web application security risks", url: "https://owasp.org/Top10", stars: undefined, category: "appsec", tags: ["owasp","web","standard"] },
  { name: "Metasploit Framework", desc: "World's most used penetration testing framework", url: "https://github.com/rapid7/metasploit-framework", stars: "34.1k", category: "pentest", tags: ["exploit","payload","post"] },
  { name: "Volatility3", desc: "Memory forensics framework for extracting artifacts from RAM", url: "https://github.com/volatilityfoundation/volatility3", stars: "2.9k", category: "forensics", tags: ["memory","forensics","malware"] },
  { name: "Ghidra", desc: "NSA software reverse engineering framework", url: "https://github.com/NationalSecurityAgency/ghidra", stars: "51.7k", category: "reverse", tags: ["reverse","decompiler","nsa"] },
  { name: "Awesome Hacking Resources", desc: "Collection of hacking & security tutorials, tools and resources", url: "https://github.com/vitalysim/Awesome-Hacking-Resources", stars: "14.8k", category: "pentest", tags: ["tutorial","tool","resource"] },
  { name: "Awesome Red Teaming", desc: "List of awesome red team resources, tools and techniques", url: "https://github.com/yeyintminthuhtut/Awesome-Red-Teaming", stars: "7.4k", category: "pentest", tags: ["redteam","c2","post-exploit"] },
];

export function AwesomeHackingModal({ open, onOpenChange }: AwesomeHackingModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  if (!open) return null;

  const filtered = RESOURCES.filter(r => {
    const matchCat = category === "all" || r.category === category;
    const q = query.toLowerCase();
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.tags.some(t => t.includes(q));
    return matchCat && matchQ;
  });

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#080614 0%,#050310 100%)", border: `1px solid ${Pg(0.2)}`, boxShadow: `0 0 80px ${Pg(0.1)}` }} initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}>

          {/* Particle top bar */}
          <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${P},transparent)` }} />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Pg(0.12), background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: Pg(0.12), border: `1px solid ${Pg(0.3)}` }} animate={{ boxShadow: [`0 0 10px ${Pg(0.15)}`, `0 0 25px ${Pg(0.35)}`, `0 0 10px ${Pg(0.15)}`] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <BookOpen size={18} style={{ color: P }} />
              </motion.div>
              <div>
                <div className="text-sm font-black font-mono" style={{ color: P }}>AWESOME HACKING</div>
                <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.38)" }}>Curated Security Resources Directory · {RESOURCES.length} repos</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search resources…" className="pl-7 pr-3 py-1.5 rounded-lg text-xs font-mono bg-transparent outline-none" style={{ border: `1px solid ${Pg(0.25)}`, color: "rgba(255,255,255,0.78)", width: 200 }}
                  onFocus={e => (e.currentTarget.style.border = `1px solid ${Pg(0.55)}`)}
                  onBlur={e => (e.currentTarget.style.border = `1px solid ${Pg(0.25)}`)} />
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <X size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar categories */}
            <div className="w-52 flex-shrink-0 border-r overflow-y-auto p-2 space-y-0.5" style={{ borderColor: Pg(0.08) }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button key={cat.id} onClick={() => setCategory(cat.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all" style={{ background: active ? Pg(0.1) : "transparent", border: `1px solid ${active ? Pg(0.25) : "transparent"}` }}>
                    <Icon size={12} style={{ color: active ? P : "rgba(255,255,255,0.38)" }} />
                    <span className="flex-1 text-xs font-mono truncate" style={{ color: active ? "#eee" : "rgba(255,255,255,0.48)" }}>{cat.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{filtered.length} resources</div>
                <div className="flex gap-1">
                  {(["grid","list"] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} className="px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: view === v ? Pg(0.1) : "rgba(255,255,255,0.04)", border: `1px solid ${view === v ? Pg(0.28) : "rgba(255,255,255,0.08)"}`, color: view === v ? P : "rgba(255,255,255,0.45)" }}>
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className={view === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2"}>
                {filtered.map((r, i) => (
                  <motion.div key={r.url} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ scale: 1.01, y: -1 }} className={`rounded-xl p-3.5 transition-all group cursor-pointer ${view === "list" ? "flex items-center gap-3" : ""}`} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)` }} onClick={() => window.open(r.url, "_blank")}>
                    {view === "grid" ? (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-xs font-bold font-mono" style={{ color: "#ddd" }}>{r.name}</div>
                            {r.stars && <div className="flex items-center gap-1 mt-0.5"><Star size={9} style={{ color: "#fbbf24" }} /><span className="text-[9px] font-mono" style={{ color: "#555" }}>{r.stars}</span></div>}
                          </div>
                          <ExternalLink size={12} style={{ color: P }} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: "rgba(255,255,255,0.48)" }}>{r.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {r.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: Pg(0.08), color: P }}>{t}</span>)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: Pg(0.1), border: `1px solid ${Pg(0.2)}` }}>
                          <BookOpen size={14} style={{ color: P }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold font-mono" style={{ color: "#ddd" }}>{r.name}</div>
                          <div className="text-[10px] leading-relaxed truncate" style={{ color: "rgba(255,255,255,0.42)" }}>{r.desc}</div>
                        </div>
                        {r.stars && <div className="flex items-center gap-1 flex-shrink-0"><Star size={10} style={{ color: "#fbbf24" }} /><span className="text-[10px] font-mono" style={{ color: "#555" }}>{r.stars}</span></div>}
                        <ExternalLink size={12} style={{ color: P }} className="flex-shrink-0" />
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: Pg(0.08), background: "rgba(0,0,0,0.4)" }}>
            <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>Hack with GitHub · Community maintained · MIT License</div>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <Star size={12} style={{ color: P }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
