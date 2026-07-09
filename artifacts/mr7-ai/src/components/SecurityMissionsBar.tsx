import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MISSIONS = [
  {
    id: "pentest", label: "Pentest", icon: "⚔", color: "#e21227", glow: "rgba(226,18,39,0.25)",
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
    id: "osint", label: "OSINT", icon: "🔍", color: "#3b82f6", glow: "rgba(59,130,246,0.25)",
    prompt: `أنت محقق OSINT (Open Source Intelligence) من مستوى استخباراتي.

أدواتك: Maltego, SpiderFoot, Sherlock, Shodan, Censys, FOFA
مصادرك: Dark Web, Documents, EXIF metadata, geolocation

منهجيتك: ابدأ من النقطة المعطاة → وسّع الشبكة → اربط النقاط → قدم خريطة هوية مرئية.`,
  },
  {
    id: "ctf", label: "CTF", icon: "⚡", color: "#8b5cf6", glow: "rgba(139,92,246,0.25)",
    prompt: `أنت CTF champion — متخصص في حل تحديات Capture The Flag بمستوى DEF CON Top 10.

تخصصاتك:
• Web: XSS, SQLi, SSTI, Deserialization
• Crypto: RSA attacks, hash cracking, elliptic curves`,
  },
  {
    id: "malware", label: "Malware", icon: "🦠", color: "#f97316", glow: "rgba(249,115,22,0.25)",
    prompt: `أنت محلل برمجيات خبيثة متقدم (Senior Malware Analyst).

أدواتك: IDA Pro, Ghidra, x64dbg, Wireshark, CAPE Sandbox
أساليبك: Static analysis, Dynamic analysis, Code emulation, Memory forensics

تحلّل: PE headers, obfuscation, anti-debugging, C2 protocols, persistence mechanisms.`,
  },
  {
    id: "webex", label: "Web Exploit", icon: "🌐", color: "#06b6d4", glow: "rgba(6,182,212,0.25)",
    prompt: `أنت خبير اختبار تطبيقات الويب — OSCP, OSCE, eWPTXv2 certified.

تغطيتك: OWASP Top 10 + Beyond، Business Logic flaws، API security
أدواتك: Burp Suite Pro, SQLmap, ffuf, Nuclei, XSStrike

لكل ثغرة: PoC, Impact Analysis, Fix Recommendation.`,
  },
  {
    id: "redteam", label: "Red Team", icon: "🎯", color: "#ec4899", glow: "rgba(236,72,153,0.25)",
    prompt: `أنت ضابط عمليات Red Team متقدم — خبرة في APT simulation، Full Kill Chain، Purple Team.

مرحلة الاستطلاع: OSINT + Active Recon → attack surface mapping
Initial Access: Phishing، supply chain، exposed services
Lateral Movement: Pass-the-Hash، Kerberoasting، Golden Ticket
Persistence: Scheduled Tasks، WMI، Registry، UEFI rootkit
Exfiltration: DNS tunneling، steganography، C2 over HTTPS`,
  },
  {
    id: "soceng", label: "Social Eng", icon: "🎪", color: "#a78bfa", glow: "rgba(167,139,250,0.25)",
    prompt: `أنت خبير الهندسة الاجتماعية — Social Engineer Pro، certified SE trainer.

أساليبك:
• Phishing: spear, whaling, vishing, smishing
• Pretexting: authority, urgency, scarcity, social proof
• Physical SE: tailgating, impersonation, shoulder surfing
• BEC: CEO fraud, wire transfer, credential harvest`,
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

  return (
    <div className="relative flex-shrink-0" style={{ zIndex: 18 }}>
      {/* Top accent */}
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.2) 40%, rgba(139,92,246,0.15) 70%, transparent)" }} />

      <div
        className="relative flex items-center"
        style={{
          height: "34px",
          background: "linear-gradient(180deg, rgba(6,4,14,0.96) 0%, rgba(8,6,18,0.95) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Scan sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 8 }}
            style={{
              position: "absolute", top: 0, bottom: 0, width: "25%",
              background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.03), transparent)",
            }}
          />
        </div>

        {/* LEFT fade */}
        <AnimatePresence>
          {canLeft && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
              className="absolute left-0 z-10 h-full px-1 flex items-center flex-shrink-0"
              style={{ background: "linear-gradient(to right, rgba(6,4,14,0.98) 60%, transparent)" }}
            >
              <ChevronLeft className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex items-center gap-1 px-3 overflow-x-auto h-full w-full"
          style={{ scrollbarWidth: "none" }}
        >
          {/* SPECIAL: Dark Web */}
          <motion.button
            onClick={onOpenDarkWeb}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-md font-mono font-bold text-[9px] tracking-wide whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "#a78bfa",
              boxShadow: "0 0 8px rgba(139,92,246,0.15)",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 14px rgba(139,92,246,0.35)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 8px rgba(139,92,246,0.15)")}
          >
            <span style={{ fontSize: "10px" }}>🌐</span>
            <span className="tracking-widest">DARK WEB</span>
          </motion.button>

          {/* SPECIAL: Shell Gen */}
          <motion.button
            onClick={onOpenShellGen}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-md font-mono font-bold text-[9px] tracking-wide whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.3)",
              color: "#22d3ee",
              boxShadow: "0 0 8px rgba(6,182,212,0.12)",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 14px rgba(6,182,212,0.3)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 8px rgba(6,182,212,0.12)")}
          >
            <span style={{ fontSize: "10px" }}>💻</span>
            <span className="tracking-widest">SHELL GEN</span>
          </motion.button>

          {/* Separator */}
          <div className="w-px h-4 flex-shrink-0 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Mission buttons */}
          {MISSIONS.map((m) => {
            const isActive = activeMission === m.id;
            return (
              <motion.button
                key={m.id}
                onClick={() => {
                  const next = isActive ? null : m.id;
                  setActiveMission(next);
                  if (!isActive) onMissionSelect(m.prompt);
                }}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-2.5 h-6 rounded-md font-mono font-bold text-[9px] tracking-wide whitespace-nowrap flex-shrink-0 relative overflow-hidden"
                style={{
                  background: isActive ? `${m.color}14` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? m.color + "55" : "rgba(255,255,255,0.07)"}`,
                  color: isActive ? m.color : "rgba(255,255,255,0.45)",
                  boxShadow: isActive ? `0 0 12px ${m.glow}, inset 0 0 8px ${m.color}08` : "none",
                }}
              >
                {/* Active: animated top line */}
                {isActive && (
                  <motion.div
                    className="absolute top-0 inset-x-0 h-px"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ background: `linear-gradient(90deg, transparent, ${m.color}aa, transparent)` }}
                  />
                )}
                <span style={{ fontSize: "9px" }}>{m.icon}</span>
                <span className="tracking-widest">{m.label.toUpperCase()}</span>
                {isActive && (
                  <motion.div
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ background: m.color, boxShadow: `0 0 4px ${m.color}` }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* RIGHT fade */}
        <AnimatePresence>
          {canRight && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
              className="absolute right-0 z-10 h-full px-1 flex items-center flex-shrink-0"
              style={{ background: "linear-gradient(to left, rgba(6,4,14,0.98) 60%, transparent)" }}
            >
              <ChevronRight className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.08) 50%, transparent)" }} />
    </div>
  );
}
