import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, BookOpen, Play, Copy, CheckCheck, Tag, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface SkillsLibraryModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInject?: (prompt: string, skillName: string) => void;
}

type Skill = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  desc: string;
  prompt: string;
  source: "antigravity" | "ruflo";
};

const SKILL_CATEGORIES = [
  "All", "Offensive", "OSINT", "Malware", "Forensics", "Network",
  "Web", "Crypto", "Social Eng", "Defense", "Code", "AI Agent", "Recon",
];

const SKILLS: Skill[] = [
  // Offensive / Red Team
  { id: "active-directory", name: "Active Directory Attacks", category: "Offensive", tags: ["AD", "kerberos", "LDAP"], desc: "Comprehensive techniques for attacking Microsoft Active Directory — recon, credential harvesting, Kerberoasting, pass-the-hash, lateral movement.", source: "antigravity",
    prompt: "You are an Active Directory penetration testing expert. Analyse the target AD environment and provide: (1) Reconnaissance techniques for enumeration (users/groups/GPOs/trusts), (2) Credential harvesting methods (Kerberoasting, AS-REP Roasting, DCSync), (3) Lateral movement strategies (pass-the-hash, pass-the-ticket, WMI/PSExec), (4) Privilege escalation paths, (5) Domain compromise techniques and persistence. Be specific and technical." },
  { id: "buffer-overflow", name: "Buffer Overflow Exploitation", category: "Offensive", tags: ["exploit", "binary", "shellcode"], desc: "Step-by-step buffer overflow exploitation — stack smashing, ROP chains, shellcode generation, ASLR/DEP bypass.", source: "antigravity",
    prompt: "You are a binary exploitation expert specialising in buffer overflows. Provide: (1) Fuzzing methodology to find the overflow offset, (2) Control of EIP/RIP register, (3) Shellcode selection and bad-char analysis, (4) ASLR/DEP/NX bypass techniques (ret2libc, ROP chains), (5) Exploit skeleton in Python/pwntools. Include specific debugging commands (GDB, pwndbg) and memory analysis steps." },
  { id: "web-app-pentest", name: "Web App Pentest", category: "Web", tags: ["SQLi", "XSS", "IDOR", "SSRF"], desc: "Full web application penetration testing methodology — OWASP Top 10, API testing, auth bypass, business logic flaws.", source: "antigravity",
    prompt: "You are a senior web application penetration tester. Provide a comprehensive assessment plan covering: (1) Recon (tech fingerprinting, endpoint enumeration, JS analysis), (2) Authentication testing (brute force, default creds, JWT flaws, OAuth misconfig), (3) OWASP Top 10 testing (SQLi, XSS, IDOR, SSRF, XXE, SSTI, path traversal), (4) API security testing (mass assignment, broken object auth, rate limiting), (5) Business logic testing. Include specific payloads and tools." },
  { id: "malware-analysis", name: "Malware Analysis", category: "Malware", tags: ["RE", "static", "dynamic"], desc: "Static and dynamic malware analysis workflow — disassembly, sandbox evasion detection, IOC extraction, C2 analysis.", source: "antigravity",
    prompt: "You are a malware analyst. Provide a complete analysis workflow for the given sample: (1) Static analysis (hashing, strings extraction, import table, PE structure, obfuscation detection), (2) Dynamic analysis (sandbox execution, process monitoring, network captures, registry changes), (3) Code analysis (disassembly key functions, identify anti-analysis tricks, unpacking), (4) IOC extraction (IPs, domains, mutexes, registry keys, file paths), (5) C2 protocol analysis and YARA rule generation." },
  { id: "osint-recon", name: "OSINT Reconnaissance", category: "OSINT", tags: ["OSINT", "recon", "HUMINT"], desc: "Full OSINT methodology for target profiling — domain intel, email harvesting, social media, dark web monitoring.", source: "antigravity",
    prompt: "You are an OSINT specialist. Build a complete reconnaissance profile using: (1) Domain/IP intelligence (WHOIS, DNS history, ASN, subdomains, certificate transparency), (2) Email harvesting and employee enumeration (LinkedIn, Hunter.io, Clearbit), (3) Social media profiling and SOCMINT, (4) Breach data and credential exposure search, (5) Dark web monitoring and paste sites, (6) Physical location and metadata extraction from images/documents. Provide specific tools and search queries." },
  { id: "network-pivoting", name: "Network Pivoting & Tunneling", category: "Network", tags: ["pivot", "tunnel", "C2"], desc: "Advanced network pivoting — SSH tunneling, SOCKS proxies, chisel, ligolo, port forwarding for internal network access.", source: "antigravity",
    prompt: "You are a network penetration testing expert. Explain comprehensive pivoting and tunneling techniques: (1) SSH local/remote/dynamic port forwarding, (2) Chisel and ligolo-ng setup for SOCKS5 proxying, (3) Metasploit route/meterpreter pivoting, (4) Proxychains configuration and usage, (5) DNS tunneling (iodine, dnscat2), (6) HTTP/S tunneling through restricted firewalls. Include specific commands and configurations for each technique." },
  { id: "forensics-investigation", name: "Digital Forensics Investigation", category: "Forensics", tags: ["forensics", "artifacts", "timeline"], desc: "Digital forensics investigation methodology — disk imaging, memory analysis, timeline reconstruction, artifact collection.", source: "antigravity",
    prompt: "You are a digital forensics investigator. Guide a comprehensive investigation: (1) Evidence acquisition (disk imaging with dd/FTK Imager, memory dump with WinPmem/Volatility, chain of custody), (2) File system analysis (deleted files, MFT analysis, timeline with plaso), (3) Memory forensics (process list, network connections, injected code, Volatility plugins), (4) Log analysis (Windows Event Logs, Syslog, web server logs, PowerShell logs), (5) Artifact extraction (browser history, prefetch, registry hives, LNK files). Include specific tools and commands." },
  { id: "social-engineering", name: "Social Engineering Tactics", category: "Social Eng", tags: ["phishing", "vishing", "pretexting"], desc: "Social engineering campaign planning — spear phishing, pretexting, vishing scripts, physical intrusion.", source: "antigravity",
    prompt: "You are a social engineering expert (authorized red team context). Design a comprehensive social engineering assessment: (1) Target profiling and pretext development, (2) Spear phishing campaign (GoPhish setup, email templates, credential harvesting pages), (3) Vishing scripts for help desk and IT impersonation, (4) Physical intrusion techniques (tailgating, badge cloning, drop attacks), (5) Pretexting scenarios for sensitive data extraction. All for authorized security assessments only." },
  { id: "crypto-attacks", name: "Cryptography Attacks", category: "Crypto", tags: ["crypto", "hash", "SSL"], desc: "Cryptographic attack techniques — hash cracking, SSL/TLS weaknesses, JWT attacks, padding oracle, timing attacks.", source: "antigravity",
    prompt: "You are a cryptography security expert. Cover: (1) Hash cracking techniques (hashcat modes, rainbow tables, rule-based attacks, wordlists), (2) SSL/TLS vulnerability exploitation (BEAST, POODLE, Heartbleed, weak ciphers, cert validation bypass), (3) JWT attacks (algorithm confusion, none algorithm, key confusion HS256/RS256), (4) Padding oracle attacks (CBC mode, PKCS#7), (5) Side-channel and timing attacks, (6) Weak PRNG exploitation. Include specific commands and tool configurations." },
  { id: "code-audit", name: "Source Code Security Audit", category: "Code", tags: ["SAST", "vuln", "review"], desc: "Comprehensive source code security audit — SAST workflow, dangerous functions, injection patterns, insecure patterns.", source: "antigravity",
    prompt: "You are a source code security auditor. Perform a comprehensive audit covering: (1) Automated SAST (Semgrep rules, CodeQL queries, Bandit/ESLint-security patterns), (2) Injection vulnerabilities (SQL, command, LDAP, XPath, template), (3) Authentication/authorization flaws (hardcoded credentials, insecure session, broken access control), (4) Insecure data handling (sensitive data in logs/URLs, weak encryption, insecure deserialization), (5) Dependency analysis (CVE checking, supply chain risks). Provide specific code patterns to search for." },
  { id: "cloud-pentest", name: "Cloud Penetration Testing", category: "Offensive", tags: ["AWS", "Azure", "GCP", "S3"], desc: "Cloud infrastructure penetration testing — AWS/Azure/GCP misconfigurations, IAM privilege escalation, storage bucket attacks.", source: "antigravity",
    prompt: "You are a cloud security penetration tester. Cover all major clouds: (1) AWS — S3 bucket enumeration/misconfig, IAM privilege escalation (RoleChaining, AssumeRole abuse), EC2 metadata SSRF, Lambda exploitation, (2) Azure — Storage account misconfig, Service Principal exploitation, AzureAD abuse, (3) GCP — GCS bucket attacks, metadata server abuse, service account key extraction, (4) Container/K8s attacks (Docker socket, pod escape, RBAC misconfig), (5) CI/CD pipeline attacks. Include specific tools (Pacu, Prowler, ScoutSuite)." },
  { id: "wireless-attacks", name: "Wireless Network Attacks", category: "Network", tags: ["WiFi", "WPA2", "Bluetooth"], desc: "Wireless penetration testing — WPA2 cracking, PMKID attack, evil twin, WPS exploitation, Bluetooth attacks.", source: "antigravity",
    prompt: "You are a wireless security specialist. Cover: (1) WPA2 attacks (4-way handshake capture, PMKID attack with hcxdumptool/hashcat, dict/rule attacks), (2) WPS exploitation (Reaver, Bully, pixie dust attack), (3) Evil twin attacks (hostapd-wpe, airbase-ng, karma attacks for captive portals), (4) KARMA/MANA attacks for probe response abuse, (5) Bluetooth attacks (BLE enumeration, GATT exploitation, BlueBorne), (6) Deauth/DoS attacks for capture. Include specific commands for each." },
  // AI Agent skills
  { id: "autonomous-agent", name: "Autonomous Agent Design", category: "AI Agent", tags: ["agent", "ReAct", "planning"], desc: "Design patterns for autonomous AI agents — ReAct loop, tool use, memory, multi-step planning, error recovery.", source: "ruflo",
    prompt: "You are an autonomous AI agent architecture expert. Design a comprehensive agent system: (1) ReAct (Reason+Act) loop implementation with thinking, action, observation cycles, (2) Tool integration patterns (function calling, structured outputs), (3) Memory systems (short-term context, long-term vector store, episodic memory), (4) Planning strategies (chain-of-thought, tree-of-thought, Monte Carlo rollouts), (5) Error recovery and self-correction mechanisms, (6) Multi-agent coordination patterns (supervisor, peer-to-peer, blackboard). Include pseudocode and design patterns." },
  { id: "prompt-injection", name: "Prompt Injection Attacks", category: "Offensive", tags: ["LLM", "injection", "jailbreak"], desc: "Prompt injection attack techniques for LLM systems — direct injection, indirect RAG poisoning, jailbreaks, context manipulation.", source: "antigravity",
    prompt: "You are an LLM security researcher. Cover prompt injection comprehensively: (1) Direct prompt injection (instruction override, role confusion, context injection), (2) Indirect injection via RAG (document poisoning, web content injection), (3) Jailbreak techniques (DAN, roleplay, many-shot, encoded payloads, token smuggling), (4) Multi-turn manipulation strategies, (5) Output manipulation (format injection, code injection, exfiltration via side channels), (6) Defense bypass for common guardrails. For authorized AI red team testing only." },
  { id: "threat-intelligence", name: "Threat Intelligence Analysis", category: "OSINT", tags: ["CTI", "APT", "IOC", "MITRE"], desc: "CTI analysis workflow — APT profiling, MITRE ATT&CK mapping, IOC enrichment, threat hunting queries.", source: "ruflo",
    prompt: "You are a Cyber Threat Intelligence analyst. Provide a comprehensive CTI analysis: (1) Threat actor profiling (TTP mapping to MITRE ATT&CK, motivation, capability, target sectors), (2) IOC analysis and enrichment (IP/domain reputation, passive DNS, WHOIS history, VirusTotal pivoting), (3) Malware family analysis and clustering, (4) STIX/TAXII report structure for sharing, (5) Detection engineering from TTPs (Sigma rules, YARA rules, Splunk/ELK queries), (6) Threat hunting hypotheses and query templates for the target TTP." },
  { id: "physical-security", name: "Physical Security Testing", category: "Offensive", tags: ["physical", "lockpick", "badge"], desc: "Physical penetration testing — lock picking, badge cloning, RFID attacks, dumpster diving, physical access.", source: "antigravity",
    prompt: "You are a physical security penetration testing expert. Cover: (1) Reconnaissance (facility mapping, employee patterns, security camera placement, guard schedules), (2) Lock picking and bypass (pin tumbler, wafer, disc detainer, bump keys, impressioning), (3) Access control attacks (RFID/HID cloning with Proxmark, flipper zero, relay attacks), (4) Tailgating and social engineering for physical access, (5) Dumpster diving methodology and sensitive document recovery, (6) USB drop attacks and malicious charging station deployment. Authorized red team context only." },
];

export function SkillsLibraryModal({ open, onOpenChange, onInject }: SkillsLibraryModalProps) {
  const { dispatch } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = SKILLS.filter((s) => {
    const matchCat = activeCategory === "All" || s.category === activeCategory;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  function injectSkill(skill: Skill) {
    if (onInject) {
      onInject(skill.prompt, skill.name);
    } else {
      dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: skill.prompt } });
      toast({ description: `Skill "${skill.name}" injected into AI system prompt` });
    }
    onOpenChange(false);
  }

  function copyPrompt(skill: Skill) {
    navigator.clipboard.writeText(skill.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#070f0a", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 60px rgba(16,185,129,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.35)" }}>
                  <BookOpen className="w-4.5 h-4.5" style={{ color: "#10b981", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#10b981" }}>SKILLS LIBRARY</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
                      Antigravity + Ruflo
                    </span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#0d3520" }}>{SKILLS.length} curated security skill playbooks — click to inject into AI</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg" style={{ color: "#0d3520" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#10b981")} onMouseLeave={(e) => (e.currentTarget.style.color = "#0d3520")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#10b981" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills…"
                  className="w-full bg-transparent border rounded-lg pl-8 pr-3 py-1.5 text-[12px] outline-none"
                  style={{ borderColor: "rgba(16,185,129,0.2)", color: "#ccc" }}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-b" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all"
                  style={activeCategory === cat
                    ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }
                    : { background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)", color: "#444" }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Skill List */}
              <div className="w-1/2 overflow-y-auto border-r p-2 space-y-1" style={{ borderColor: "rgba(16,185,129,0.1)" }}>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-[11px]" style={{ color: "#0d3520" }}>No skills found</div>
                ) : (
                  filtered.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelected(skill)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border transition-all"
                      style={selected?.id === skill.id
                        ? { background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.35)", color: "#10b981" }
                        : { background: "#0d0d0d", borderColor: "rgba(255,255,255,0.06)", color: "#ccc" }
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold">{skill.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      </div>
                      <div className="text-[9px] mb-1" style={{ color: selected?.id === skill.id ? "#10b98180" : "#444" }}>{skill.category}</div>
                      <div className="flex gap-1 flex-wrap">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Skill Detail */}
              <div className="flex-1 overflow-y-auto p-4">
                {selected ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[13px] font-black mb-0.5" style={{ color: "#10b981" }}>{selected.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.05)", color: "#555" }}>{selected.category}</span>
                        <span className="text-[9px]" style={{ color: "#0d3520" }}>src: {selected.source}</span>
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: "#888" }}>{selected.desc}</p>

                    <div className="flex gap-1 flex-wrap">
                      {selected.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <Tag className="w-2 h-2" />{tag}
                        </span>
                      ))}
                    </div>

                    <div>
                      <div className="text-[9px] font-mono font-bold mb-1" style={{ color: "#10b981" }}>SYSTEM PROMPT PREVIEW</div>
                      <div className="px-3 py-2.5 rounded-xl text-[10px] font-mono leading-relaxed overflow-y-auto max-h-32" style={{ background: "#0a0f0c", border: "1px solid rgba(16,185,129,0.15)", color: "#555", whiteSpace: "pre-wrap" }}>
                        {selected.prompt.slice(0, 300)}…
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => injectSkill(selected)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all"
                        style={{ background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Inject into AI
                      </button>
                      <button
                        onClick={() => copyPrompt(selected)}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold border transition-all"
                        style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)", color: "#555" }}
                      >
                        {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <BookOpen className="w-10 h-10" style={{ color: "rgba(16,185,129,0.2)" }} />
                    <span className="text-[11px]" style={{ color: "#0d3520" }}>Select a skill to preview and inject</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
