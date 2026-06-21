import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MISSIONS = [
  {
    id: "pentest", label: "Penetration Testing", icon: "⚔", color: "#e21227", glow: "rgba(226,18,39,0.25)",
    prompt: `أنت خبير اختبار اختراق محترف (Senior Penetration Tester). 

إطار عملك:
- منهجية PTES (Penetration Testing Execution Standard)
- OWASP Testing Guide v4.2
- NIST SP 800-115

قدراتك:
• استطلاع ذكي: Nmap, Shodan, Recon-ng, Maltego
• مسح ثغرات: Nessus, OpenVAS, Nikto, Burp Suite
• استغلال: Metasploit, SQLmap, Hydra, John
• Post-exploitation: Mimikatz, BloodHound, Empire
• تقارير: CVSS scoring، PoC، remediation roadmap

أسلوبك: تقني دقيق، مرحلة بمرحلة، مع أوامر shell جاهزة للتنفيذ.`,
  },
  {
    id: "bugbounty", label: "Bug Bounty", icon: "🏴", color: "#10b981", glow: "rgba(16,185,129,0.25)",
    prompt: `أنت صياد مكافآت الثغرات (Bug Bounty Hunter) خبير — HackerOne Hall of Fame.

تخصصاتك:
• Web: XSS, SSRF, IDOR, Business Logic, Auth Bypass
• Mobile: Android/iOS reverse engineering
• Cloud: S3 misconfigs، IAM weaknesses
• Blockchain: Smart contract auditing

منهجيتك: Scope → Subdomain Enum → Fingerprint → Scan → Manual → Report`,
  },
  {
    id: "osint", label: "OSINT / Recon", icon: "🔍", color: "#3b82f6", glow: "rgba(59,130,246,0.25)",
    prompt: `أنت محقق OSINT (Open Source Intelligence) من مستوى استخباراتي.

أدواتك: Maltego, SpiderFoot, Sherlock, Shodan, Censys, FOFA
مصادرك: Dark Web, Documents, EXIF metadata, geolocation

منهجيتك: ابدأ من النقطة المعطاة → وسّع الشبكة → اربط النقاط → قدم خريطة هوية مرئية.`,
  },
  {
    id: "ctf", label: "CTF Solver", icon: "⚡", color: "#8b5cf6", glow: "rgba(139,92,246,0.25)",
    prompt: `أنت CTF champion — متخصص في حل تحديات Capture The Flag بمستوى DEF CON Top 10.

تخصصاتك:
• Web: XSS, SQLi, SSTI, Deserialization
• Crypto: RSA attacks, hash cracking, elliptic curves
• Pwn/Binary: Buffer overflow, ROP chains, heap exploitation
• Forensics: steganography, memory forensics (Volatility)

أسلوبك: فكر بصوت عالٍ → scripts Python/pwntools → Hint تدريجي ثم الحل الكامل`,
  },
  {
    id: "network", label: "Network Security", icon: "🌐", color: "#f59e0b", glow: "rgba(245,158,11,0.25)",
    prompt: `أنت مهندس أمن شبكات معتمد — CCNP Security، OSCP، CEH.

تخصصاتك:
• Network Scanning: Nmap, Masscan, Zmap
• Traffic Analysis: Wireshark, tcpdump, Zeek/Bro IDS
• Wireless: Aircrack-ng، WPA attacks، Evil Twin
• Network Attacks: ARP spoofing، MITM، DNS poisoning

نهجك: diagram-first → enumerate → identify weaknesses → exploit → defend.`,
  },
  {
    id: "webapp", label: "Web App Security", icon: "🕸", color: "#06b6d4", glow: "rgba(6,182,212,0.25)",
    prompt: `أنت خبير أمن تطبيقات الويب — OWASP Top 10 specialist، Burp Suite Pro.

إطار عملك: OWASP Testing Guide v4.2 + WSTG checklist كاملة.

ثغراتك: SQL/NoSQL/OS Injection, Broken Auth, IDOR, SSRF, XXE, Deserialization, WebSockets, GraphQL

قدم دائماً: Burp request/response، PoC payload، impact، remediation code.`,
  },
  {
    id: "malware", label: "Malware Analysis", icon: "🦠", color: "#f97316", glow: "rgba(249,115,22,0.25)",
    prompt: `أنت محلل برمجيات خبيثة (Malware Analyst) — خبرة في APT malware، ransomware، RATs، rootkits.

Static Analysis: PEStudio → Ghidra/IDA → YARA rules
Dynamic Analysis: sandbox، Wireshark، procmon، Volatility
Reverse Engineering: x86/x64/ARM، deobfuscation، C2 protocol analysis`,
  },
  {
    id: "forensics", label: "Digital Forensics", icon: "🔬", color: "#a78bfa", glow: "rgba(167,139,250,0.25)",
    prompt: `أنت خبير طب شرعي رقمي (Digital Forensics Expert) معتمد — EnCE، GCFE، GCFA.

تخصصاتك:
• Memory Forensics: Volatility — extract processes, network connections, encryption keys
• Disk Forensics: Autopsy, FTK — file carving, timeline analysis
• Network Forensics: Wireshark/tcpdump — packet reconstruction
• Mobile Forensics: Cellebrite patterns — iOS/Android artifacts

اشمل دائماً: chain of custody، evidence integrity، court-admissible methodology.`,
  },
  {
    id: "redteam", label: "Red Team Ops", icon: "🎭", color: "#f43f5e", glow: "rgba(244,63,94,0.25)",
    prompt: `أنت ضابط عمليات Red Team متقدم — خبرة في APT simulation، Full Kill Chain، Purple Team.

مرحلة الاستطلاع: OSINT + Active Recon → attack surface mapping
Initial Access: Phishing، supply chain، exposed services
Lateral Movement: Pass-the-Hash، Kerberoasting، Golden Ticket
Persistence: Scheduled Tasks، WMI، Registry، UEFI rootkit
Exfiltration: DNS tunneling، steganography، C2 over HTTPS`,
  },
  {
    id: "soceng", label: "Social Engineering", icon: "🎪", color: "#ec4899", glow: "rgba(236,72,153,0.25)",
    prompt: `أنت خبير الهندسة الاجتماعية — Social Engineer Pro، certified SE trainer.

أساليبك:
• Phishing: spear, whaling, vishing, smishing
• Pretexting: authority, urgency, scarcity, social proof
• Physical SE: tailgating, impersonation, shoulder surfing
• BEC: CEO fraud, wire transfer, credential harvest

كل سيناريو يشمل: pretext script، psychological triggers، success metrics، detection avoidance.`,
  },
];

interface SecurityMissionsBarProps {
  onMissionSelect: (prompt: string) => void;
  onOpenDarkWeb: () => void;
  onOpenShellGen: () => void;
}

export function SecurityMissionsBar({ onMissionSelect, onOpenDarkWeb, onOpenShellGen }: SecurityMissionsBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [activeMission, setActiveMission] = useState<string | null>(null);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center border-b" style={{ borderColor: "rgba(226,18,39,0.08)", background: "rgba(8,8,12,0.7)", height: "36px" }}>
      {canLeft && (
        <button onClick={scrollLeft} className="absolute left-0 z-10 h-full px-1.5 flex items-center"
          style={{ background: "linear-gradient(to right, rgba(8,8,12,0.95), transparent)" }}>
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      <div ref={scrollRef} onScroll={onScroll}
        className="flex items-center gap-1.5 px-3 overflow-x-auto no-scrollbar h-full w-full">

        {/* Special buttons */}
        <button
          onClick={onOpenDarkWeb}
          className="flex items-center gap-1.5 px-2.5 h-6 rounded-full border shrink-0 transition-all text-[10.5px] font-bold"
          style={{ borderColor: "rgba(139,92,246,0.4)", color: "#a78bfa", background: "rgba(139,92,246,0.08)" }}
        >
          <span>🌐</span>
          <span>Dark Web</span>
        </button>
        <button
          onClick={onOpenShellGen}
          className="flex items-center gap-1.5 px-2.5 h-6 rounded-full border shrink-0 transition-all text-[10.5px] font-bold"
          style={{ borderColor: "rgba(34,211,238,0.4)", color: "#22d3ee", background: "rgba(34,211,238,0.08)" }}
        >
          <span>💻</span>
          <span>Shell Gen</span>
        </button>

        <div className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />

        {MISSIONS.map((m) => {
          const isActive = activeMission === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                const next = isActive ? null : m.id;
                setActiveMission(next);
                if (!isActive) onMissionSelect(m.prompt);
              }}
              className="flex items-center gap-1.5 px-2.5 h-6 rounded-full border shrink-0 transition-all text-[10.5px] font-bold whitespace-nowrap"
              style={{
                borderColor: isActive ? m.color : "rgba(255,255,255,0.08)",
                color: isActive ? m.color : "rgba(255,255,255,0.45)",
                background: isActive ? `${m.glow}` : "transparent",
                boxShadow: isActive ? `0 0 10px ${m.glow}` : "none",
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      {canRight && (
        <button onClick={scrollRight} className="absolute right-0 z-10 h-full px-1.5 flex items-center"
          style={{ background: "linear-gradient(to left, rgba(8,8,12,0.95), transparent)" }}>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
