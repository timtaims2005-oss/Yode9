import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Terminal, Shield, Bug, Wifi, Database,
  Globe, Lock, Zap, RefreshCw, ChevronRight, Eye,
  Network, Cpu, Swords, AlertTriangle, FileText, Layers,
} from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

const R = "#e21227";
const Rg = (n: number) => `rgba(226,18,39,${n})`;

type Category = {
  id: string;
  name: string;
  icon: typeof Shield;
  color: string;
  count: number;
  tools: Tool[];
};

type Tool = {
  name: string;
  desc: string;
  tags: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "infogather", name: "Information Gathering", icon: Eye, color: "#00e5cc", count: 28,
    tools: [
      { name: "Nmap", desc: "Network discovery and security auditing. Port scanning, OS detection, service version detection.", tags: ["scanner", "network", "recon"] },
      { name: "TheHarvester", desc: "OSINT tool for gathering emails, subdomains, hosts, names, and open ports from public sources.", tags: ["osint", "email", "subdomain"] },
      { name: "Amass", desc: "In-depth DNS enumeration, subdomain discovery with multiple data sources.", tags: ["dns", "subdomain", "passive"] },
      { name: "Shodan", desc: "Search engine for internet-connected devices. Fingerprint servers, cameras, routers.", tags: ["iot", "recon", "passive"] },
      { name: "SpiderFoot", desc: "Automated OSINT reconnaissance tool with 200+ modules.", tags: ["osint", "auto", "recon"] },
      { name: "Masscan", desc: "Fastest internet port scanner. Scan the entire internet in 6 minutes.", tags: ["scanner", "fast", "network"] },
      { name: "RustScan", desc: "Modern, blazing fast port scanner that passes results to Nmap.", tags: ["scanner", "fast", "rust"] },
      { name: "Subfinder", desc: "Fast passive subdomain enumeration tool.", tags: ["subdomain", "passive", "fast"] },
    ],
  },
  {
    id: "webpentest", name: "Web Penetration Testing", icon: Globe, color: "#fbbf24", count: 22,
    tools: [
      { name: "Burp Suite", desc: "Leading platform for web application security testing. Intercept, modify, replay HTTP/S.", tags: ["web", "proxy", "scanner"] },
      { name: "SQLMap", desc: "Automatic SQL injection detection and exploitation tool.", tags: ["sqli", "database", "exploit"] },
      { name: "Nikto", desc: "Web server scanner for dangerous files, outdated software, and misconfigurations.", tags: ["web", "scanner", "vuln"] },
      { name: "OWASP ZAP", desc: "Free web app security scanner. Automated & manual testing, AJAX crawler.", tags: ["web", "scanner", "owasp"] },
      { name: "WPScan", desc: "WordPress security scanner. Plugin vulns, user enumeration, brute force.", tags: ["wordpress", "cms", "scanner"] },
      { name: "Dirb", desc: "Web content scanner. Brute force directories and files on web servers.", tags: ["web", "fuzzing", "dirs"] },
      { name: "FFuf", desc: "Fast web fuzzer written in Go. Directories, subdomains, parameters.", tags: ["fuzzing", "fast", "go"] },
    ],
  },
  {
    id: "network", name: "Network Attacks", icon: Network, color: "#4299e1", count: 18,
    tools: [
      { name: "Wireshark", desc: "Network protocol analyzer. Capture and analyze network traffic in real-time.", tags: ["sniffer", "analysis", "pcap"] },
      { name: "Ettercap", desc: "MITM attacks on LAN. Sniff, filter, inject content into connections.", tags: ["mitm", "arp", "sniff"] },
      { name: "Bettercap", desc: "Swiss army knife for network attacks and monitoring.", tags: ["mitm", "arp", "wifi"] },
      { name: "Responder", desc: "LLMNR, NBT-NS, MDNS poisoner and rogue authentication server.", tags: ["poisoning", "creds", "windows"] },
    ],
  },
  {
    id: "exploit", name: "Exploit Frameworks", icon: Swords, color: "#e21227", count: 12,
    tools: [
      { name: "Metasploit Framework", desc: "World's most used penetration testing framework. 2000+ exploits.", tags: ["exploit", "payload", "post"] },
      { name: "RouterSploit", desc: "Exploitation framework dedicated to embedded devices.", tags: ["iot", "router", "exploit"] },
      { name: "WebSploit", desc: "Advanced MITM framework for network & web exploits.", tags: ["web", "mitm", "exploit"] },
      { name: "Commix", desc: "Automated all-in-one OS command injection and exploitation tool.", tags: ["cmdi", "web", "exploit"] },
    ],
  },
  {
    id: "payload", name: "Payload Creation", icon: FileText, color: "#a78bfa", count: 15,
    tools: [
      { name: "MSFVenom", desc: "Payload generation and encoding. 500+ payloads, 40+ encoders.", tags: ["payload", "encode", "metasploit"] },
      { name: "TheFatRat", desc: "Backdoor generator. Create undetectable malware with persistence.", tags: ["backdoor", "rat", "persistence"] },
      { name: "Venom", desc: "Multi-platform reverse shell and payload generator.", tags: ["payload", "shell", "multi"] },
      { name: "Brutal", desc: "Toolkit for Android exploitation and payload generation.", tags: ["android", "payload", "mobile"] },
    ],
  },
  {
    id: "password", name: "Password Attacks", icon: Lock, color: "#f97316", count: 14,
    tools: [
      { name: "Hashcat", desc: "World's fastest and most advanced password recovery utility.", tags: ["crack", "hash", "gpu"] },
      { name: "Hydra", desc: "Fast, parallelized network login cracker. 50+ protocols.", tags: ["bruteforce", "online", "login"] },
      { name: "John the Ripper", desc: "Password security auditing and recovery tool.", tags: ["crack", "offline", "hash"] },
      { name: "Medusa", desc: "Speedy, massively parallel, modular login brute-forcer.", tags: ["bruteforce", "parallel", "login"] },
    ],
  },
  {
    id: "wireless", name: "Wireless Attacks", icon: Wifi, color: "#10b981", count: 10,
    tools: [
      { name: "Aircrack-ng", desc: "WiFi security auditing suite. WEP/WPA cracking, deauth attacks.", tags: ["wifi", "wpa", "crack"] },
      { name: "Kismet", desc: "Wireless network and device detector, sniffer, and WIDS.", tags: ["wifi", "sniffer", "ids"] },
      { name: "Wifite", desc: "Automated wireless attack tool. Attacks WEP, WPA, WPS networks.", tags: ["wifi", "auto", "attack"] },
    ],
  },
  {
    id: "forensics", name: "Digital Forensics", icon: Search, color: "#0ea5e9", count: 12,
    tools: [
      { name: "Autopsy", desc: "Digital forensics platform. Analyze disk images, files, memory.", tags: ["forensics", "disk", "timeline"] },
      { name: "Volatility3", desc: "Memory forensics framework for extracting artifacts from RAM.", tags: ["memory", "forensics", "malware"] },
      { name: "Binwalk", desc: "Firmware analysis tool. Extract and analyze embedded files.", tags: ["firmware", "iot", "extract"] },
      { name: "Wireshark", desc: "PCAP analysis for network forensics investigations.", tags: ["pcap", "network", "forensics"] },
    ],
  },
  {
    id: "activedir", name: "Active Directory", icon: Database, color: "#818cf8", count: 8,
    tools: [
      { name: "BloodHound", desc: "Active Directory relationship analyzer. Find attack paths to Domain Admin.", tags: ["ad", "graph", "attack-path"] },
      { name: "Impacket", desc: "Python classes for working with network protocols. DCSync, SecretsDump.", tags: ["ad", "python", "protocol"] },
      { name: "Certipy", desc: "AD CS (Active Directory Certificate Services) attack tool.", tags: ["adcs", "cert", "esc"] },
      { name: "Kerbrute", desc: "Kerberos pre-authentication brute-forcing and user enumeration.", tags: ["kerberos", "enum", "bruteforce"] },
    ],
  },
  {
    id: "cloud", name: "Cloud Security", icon: Layers, color: "#fbbf24", count: 8,
    tools: [
      { name: "Prowler", desc: "AWS/Azure/GCP security tool. 200+ checks against CIS, NIST, GDPR.", tags: ["aws", "audit", "compliance"] },
      { name: "Pacu", desc: "AWS exploitation framework. 35+ attack modules.", tags: ["aws", "exploit", "iam"] },
      { name: "ScoutSuite", desc: "Multi-cloud security auditing tool.", tags: ["cloud", "audit", "multi"] },
      { name: "Trivy", desc: "Container and filesystem vulnerability scanner.", tags: ["container", "docker", "k8s"] },
    ],
  },
  {
    id: "mobile", name: "Mobile Security", icon: Cpu, color: "#34d399", count: 8,
    tools: [
      { name: "MobSF", desc: "Mobile Security Framework. Static, dynamic, API analysis for Android/iOS.", tags: ["android", "ios", "static"] },
      { name: "Frida", desc: "Dynamic instrumentation toolkit. Hook functions, inject scripts at runtime.", tags: ["dynamic", "hook", "instrument"] },
      { name: "Objection", desc: "Runtime mobile exploration toolkit. Bypass SSL pinning, extract data.", tags: ["ios", "android", "runtime"] },
    ],
  },
  {
    id: "ddos", name: "Stress Testing", icon: Zap, color: "#e21227", count: 8,
    tools: [
      { name: "SlowLoris", desc: "HTTP DoS attack tool that holds server connections open.", tags: ["dos", "http", "slowloris"] },
      { name: "GoldenEye", desc: "HTTP/S DoS test tool. Layer 7 attack simulation.", tags: ["dos", "layer7", "http"] },
      { name: "UFONet", desc: "DDoS botnet tool via web vulnerabilities.", tags: ["ddos", "botnet", "layer7"] },
    ],
  },
];

export function HackingToolModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filteredCats = CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t =>
      !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.includes(search.toLowerCase()))
    ),
  })).filter(cat => !selectedCat || cat.id === selectedCat);

  const allTools = CATEGORIES.flatMap(c => c.tools.map(t => ({ ...t, catColor: c.color }))).filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase())
  );

  async function runAI(toolName?: string) {
    const q = toolName ? `Provide a comprehensive guide for using ${toolName} in a penetration test. Include: installation, basic usage, advanced techniques, common flags, and example commands.` : aiQuery;
    if (!q.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    setAiQuery(q);
    const prompt = `You are a senior penetration tester and red team operator. Answer the following with technical precision, real commands, and practical examples.

${q}

Include specific command examples, flags, and real-world usage scenarios.`;
    try {
      let acc = "";
      await streamChat(
        { model: state.activeModel, persona: null, customInstructions: "", language: state.settings.language, memory: [], messages: [{ role: "user", content: prompt }], mode: "chat" },
        chunk => { acc += chunk; setAiResponse(acc); },
      );
    } catch { /* */ }
    setAiLoading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a", border: `1px solid ${Rg(0.25)}`, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: Rg(0.12) }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Rg(0.1), border: `1px solid ${Rg(0.3)}` }}>
              <Terminal className="w-5 h-5" style={{ color: R }} />
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">HackingTool</div>
              <div className="text-[10px]" style={{ color: "#444" }}>185+ Security Tools · 20 Categories · AI-Powered Usage Guide</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#444" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..."
                className="bg-transparent border rounded-lg pl-8 pr-3 py-1.5 text-[10px] outline-none w-40"
                style={{ borderColor: Rg(0.2), color: "#ccc" }} />
            </div>
            <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-48 border-r overflow-y-auto flex-shrink-0 py-2" style={{ borderColor: Rg(0.08) }}>
            <button onClick={() => setSelectedCat(null)} className="w-full text-left px-3 py-2 text-[10px] font-bold transition-all"
              style={{ color: !selectedCat ? R : "#444", background: !selectedCat ? Rg(0.06) : "transparent" }}>
              All Categories ({CATEGORIES.reduce((s, c) => s + c.count, 0)})
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                className="w-full text-left px-3 py-2 text-[10px] transition-all flex items-center gap-2"
                style={{ color: selectedCat === cat.id ? cat.color : "#555", background: selectedCat === cat.id ? `${cat.color}08` : "transparent" }}>
                <cat.icon className="w-3 h-3 flex-shrink-0" style={{ color: cat.color }} />
                <span className="truncate">{cat.name}</span>
                <span className="ml-auto text-[9px]" style={{ color: "#333" }}>{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedTool ? (
              <>
                {filteredCats.filter(c => c.tools.length > 0).map(cat => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      <span className="text-[11px] font-bold" style={{ color: cat.color }}>{cat.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {cat.tools.map(tool => (
                        <button key={tool.name} onClick={() => { setSelectedTool(tool); setAiResponse(""); setAiQuery(""); }}
                          className="text-left p-3 rounded-xl transition-all hover:opacity-90"
                          style={{ background: `${cat.color}06`, border: `1px solid ${cat.color}20` }}>
                          <div className="text-[11px] font-bold text-white mb-1">{tool.name}</div>
                          <div className="text-[9px] leading-relaxed mb-2" style={{ color: "#555" }}>{tool.desc.slice(0, 70)}...</div>
                          <div className="flex flex-wrap gap-1">
                            {tool.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${cat.color}12`, color: cat.color }}>{t}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-4">
                <button onClick={() => { setSelectedTool(null); setAiResponse(""); }} className="flex items-center gap-2 text-[10px]" style={{ color: "#555" }}>
                  ← Back to tools
                </button>
                <div className="rounded-xl p-4" style={{ background: "#111", border: `1px solid ${Rg(0.2)}` }}>
                  <div className="text-[15px] font-bold text-white mb-1">{selectedTool.name}</div>
                  <div className="text-[11px] mb-3" style={{ color: "#888" }}>{selectedTool.desc}</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTool.tags.map(t => <span key={t} className="text-[9px] px-2 py-0.5 rounded" style={{ background: Rg(0.08), color: R }}>{t}</span>)}
                  </div>
                </div>

                <button onClick={() => runAI(selectedTool.name)} disabled={aiLoading}
                  className="w-full py-3 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: Rg(0.08), borderColor: Rg(0.3), color: R }}>
                  {aiLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating guide...</> : <><Terminal className="w-4 h-4" /> Generate Full Usage Guide with AI</>}
                </button>

                <div className="flex gap-2">
                  <input value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && runAI()}
                    placeholder={`Ask anything about ${selectedTool.name}...`}
                    className="flex-1 bg-transparent border rounded-xl px-3 py-2.5 text-[11px] outline-none"
                    style={{ borderColor: Rg(0.2), color: "#ccc" }} />
                  <button onClick={() => runAI()} disabled={aiLoading} className="px-4 rounded-xl text-[10px] font-bold border"
                    style={{ background: Rg(0.08), borderColor: Rg(0.3), color: R }}>
                    {aiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {aiResponse && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono" style={{ background: "#111", border: `1px solid ${Rg(0.12)}`, color: "#ccc" }}>
                    {aiResponse}
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
