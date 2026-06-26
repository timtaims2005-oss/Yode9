import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Shield, Target, Zap, Terminal, AlertTriangle, CheckCircle,
  Play, Square, RotateCcw, Download, Eye, Lock, Crosshair,
  Network, Cpu, Globe, Activity, FileText, Settings,
  ChevronRight, ChevronDown, Layers, Brain, Flame, Swords,
  Radio, Bug, Search, Database, BarChart2, Users, Clock,
  Wifi, Code2, Map, Orbit, TrendingUp, Star, ShieldCheck,
  GitBranch, Microscope, Box, Fingerprint, Key, Mail,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const MITRE_TACTICS = [
  { id: "recon", name: "Reconnaissance", color: "#00e5ff", techniques: ["T1595 - Active Scanning","T1592 - Gather Host Info","T1589 - Gather Victim Identity","T1590 - Gather Network Info","T1591 - Gather Org Info","T1598 - Phishing for Info"] },
  { id: "resource", name: "Resource Dev", color: "#a78bfa", techniques: ["T1583 - Acquire Infrastructure","T1588 - Obtain Capabilities","T1585 - Establish Accounts","T1586 - Compromise Accounts","T1584 - Compromise Infrastructure"] },
  { id: "initial", name: "Initial Access", color: "#f97316", techniques: ["T1190 - Exploit Public App","T1566 - Phishing","T1133 - External Remote Svcs","T1078 - Valid Accounts","T1091 - Removable Media"] },
  { id: "execution", name: "Execution", color: "#fbbf24", techniques: ["T1059 - Command & Script","T1203 - Client Execution","T1204 - User Execution","T1053 - Scheduled Task","T1569 - System Services"] },
  { id: "persistence", name: "Persistence", color: "#4ade80", techniques: ["T1547 - Boot Autostart","T1543 - Create/Modify Service","T1098 - Account Manipulation","T1136 - Create Account","T1505 - Server Software"] },
  { id: "privesc", name: "Priv Escalation", color: "#fb923c", techniques: ["T1548 - Abuse Elevation","T1134 - Access Token Manip","T1068 - Exploit for Priv Esc","T1055 - Process Injection","T1053 - Scheduled Task"] },
  { id: "defense", name: "Defense Evasion", color: "#e21227", techniques: ["T1140 - Deobfuscate/Decode","T1562 - Impair Defenses","T1036 - Masquerading","T1027 - Obfuscated Files","T1070 - Indicator Removal"] },
  { id: "credential", name: "Credential Access", color: "#c084fc", techniques: ["T1110 - Brute Force","T1555 - Creds from Stores","T1003 - OS Credential Dump","T1552 - Unsecured Creds","T1558 - Steal Kerberos"] },
  { id: "discovery", name: "Discovery", color: "#38bdf8", techniques: ["T1087 - Account Discovery","T1083 - File Discovery","T1046 - Network Scan","T1135 - Network Share","T1082 - System Info"] },
  { id: "lateral", name: "Lateral Movement", color: "#34d399", techniques: ["T1210 - Exploit Remote Svcs","T1534 - Internal Spearphish","T1570 - Lateral Tool Transfer","T1563 - Remote Service Session","T1021 - Remote Services"] },
  { id: "collection", name: "Collection", color: "#f472b6", techniques: ["T1560 - Archive Collected","T1074 - Data Staged","T1213 - Data from Info Repos","T1005 - Data from Local Sys","T1119 - Automated Collection"] },
  { id: "exfil", name: "Exfiltration", color: "#ff4444", techniques: ["T1048 - Exfil Over Alt Proto","T1041 - Exfil Over C2","T1567 - Exfil Over Web Svc","T1020 - Automated Exfil","T1030 - Data Transfer Limit"] },
];

const ARTP_MODULES = [
  { id: "osint", name: "OSINT Engine", icon: Search, color: "#00e5ff", desc: "Domain enum · Cloud asset discovery · Dark web sim · GitHub secrets · WHOIS history · Social media OSINT", status: "ready" },
  { id: "vuln", name: "Vuln Scanner", icon: Bug, color: "#fbbf24", desc: "OpenVAS integration · Nessus API · Nmap NSE · SSL/TLS analyzer · Cloud config scanner · CVE correlation AI", status: "ready" },
  { id: "exploit", name: "Exploit Framework", icon: Swords, color: "#e21227", desc: "Metasploit RPC bridge · Custom payloads · Safety guards · Scope enforcement · Sandbox exec · Rollback engine", status: "ready" },
  { id: "phishing", name: "Phishing Sim", icon: Mail, color: "#f97316", desc: "Campaign templates · Site cloner · Click tracking · Credential harvest sim · LMS integration · Vishing toolkit", status: "ready" },
  { id: "lateral", name: "Lateral Movement", icon: Network, color: "#a855f7", desc: "BloodHound-style graphs · Pivot chains · Pass-the-Hash/Ticket · Golden Ticket · Kerberoasting · RDP/WMI tunnels", status: "ready" },
  { id: "c2", name: "C2 Framework", icon: Cpu, color: "#4ade80", desc: "Multi-channel beacons · DNS/HTTPS/ICMP tunnels · Implant generator · Callback routing · Encrypted comms", status: "ready" },
  { id: "forensics", name: "Digital Forensics", icon: Microscope, color: "#38bdf8", desc: "Disk · Memory RAM dumps · Network PCAP · Mobile · Timeline analysis · Registry · Log correlation · Anti-forensics", status: "ready" },
  { id: "wireless", name: "Wireless Attack", icon: Wifi, color: "#ec4899", desc: "WPA2/3 cracking · Evil Twin · Bluetooth BLE attacks · RFID/NFC cloning · Deauth injection · Rogue AP", status: "ready" },
  { id: "webapp", name: "Web App Scanner", icon: Globe, color: "#f59e0b", desc: "SQLi · XSS · SSRF · XXE · LFI · SSTI · Deserialization · API testing · GraphQL · Burp Suite API bridge", status: "ready" },
  { id: "cloud", name: "Cloud Pentest", icon: Box, color: "#06b6d4", desc: "AWS/Azure/GCP pentest · S3 enum · IAM priv esc · Container escape · Kubernetes audit · Serverless testing", status: "ready" },
  { id: "ai", name: "AI Red Team", icon: Brain, color: "#8b5cf6", desc: "GPT-4 report writer · Vuln explanation · Remediation AI · NL query interface · ML prioritization · False+ reduction", status: "ready" },
  { id: "report", name: "Report Engine", icon: FileText, color: "#f472b6", desc: "DOCX/PDF/HTML gen · CVSS scoring · NIST 800-53 · ISO 27001 · PCI-DSS · SOC2 · JIRA/ServiceNow tickets", status: "ready" },
];

const PHASES = [
  { id: "scoping", name: "Scoping & Authorization", color: "#00e5ff", steps: ["RoE document upload","IP/Domain whitelist validation","Legal contract verification","Digital signature check","Scope boundary enforcement"] },
  { id: "recon", name: "Reconnaissance", color: "#38bdf8", steps: ["Passive OSINT gathering","Subdomain enumeration","Cloud asset discovery","Social media intelligence","GitHub secret scanning"] },
  { id: "enum", name: "Enumeration", color: "#a78bfa", steps: ["Port & service scanning","Banner grabbing & fingerprint","SSL/TLS configuration","Web technology detection","User & share enumeration"] },
  { id: "vuln", name: "Vulnerability Analysis", color: "#fbbf24", steps: ["CVE correlation engine","CVSS risk scoring","False positive ML filter","Exploit availability check","Attack vector mapping"] },
  { id: "exploit", name: "Exploitation (Authorized)", color: "#e21227", steps: ["Scope validation gate","Payload generation","Controlled exploit delivery","Shell acquisition","Privilege escalation chain"] },
  { id: "post", name: "Post-Exploitation", color: "#f97316", steps: ["Credential harvesting","Lateral movement graph","C2 beacon establishment","Data exfiltration sim","Persistence mechanisms"] },
  { id: "cleanup", name: "Cleanup & Reporting", color: "#4ade80", steps: ["Artifact removal","Log restoration","Executive summary","Technical remediation","Compliance gap analysis"] },
];

const SAMPLE_FINDINGS = [
  { sev: "CRITICAL", cvss: 9.8, id: "CVE-2024-3400", title: "PAN-OS Command Injection", host: "10.0.0.1", port: "443", status: "exploited", cwe: "CWE-78" },
  { sev: "CRITICAL", cvss: 9.8, id: "CVE-2023-44487", title: "HTTP/2 Rapid Reset DDoS", host: "10.0.0.45", port: "443", status: "verified", cwe: "CWE-400" },
  { sev: "HIGH", cvss: 8.8, id: "CVE-2023-46604", title: "Apache ActiveMQ RCE", host: "10.0.0.12", port: "61616", status: "exploited", cwe: "CWE-502" },
  { sev: "HIGH", cvss: 8.8, id: "CVE-2024-21762", title: "Fortinet SSL-VPN RCE", host: "10.0.0.5", port: "443", status: "verified", cwe: "CWE-787" },
  { sev: "HIGH", cvss: 8.1, id: "CVE-2023-23397", title: "Outlook NTLM Hash Relay", host: "10.0.0.3", port: "445", status: "verified", cwe: "CWE-522" },
  { sev: "HIGH", cvss: 7.8, id: "CVE-2024-1709", title: "ConnectWise ScreenConnect Auth Bypass", host: "10.0.0.20", port: "8040", status: "pending", cwe: "CWE-288" },
  { sev: "MEDIUM", cvss: 6.5, id: "CVE-2023-20198", title: "Cisco IOS XE Priv Esc", host: "10.0.0.1", port: "443", status: "verified", cwe: "CWE-269" },
  { sev: "MEDIUM", cvss: 6.1, id: "CVE-2023-4863", title: "WebP Heap Buffer Overflow", host: "10.0.0.77", port: "80", status: "pending", cwe: "CWE-122" },
  { sev: "LOW", cvss: 3.7, id: "CVE-2023-5217", title: "VP8 Encoding Overflow", host: "10.0.0.22", port: "443", status: "mitigated", cwe: "CWE-119" },
];

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#4ade80",
};

const OSINT_RESULTS = [
  { type: "subdomain", value: "api.target.com → 203.0.113.12", risk: "medium", source: "amass" },
  { type: "subdomain", value: "admin.target.com → 203.0.113.3", risk: "high", source: "subfinder" },
  { type: "s3_bucket", value: "s3://company-dev-backups (PUBLIC)", risk: "critical", source: "cloud_enum" },
  { type: "secret", value: "AWS_ACCESS_KEY in commit a3f9d21 (7 months ago)", risk: "critical", source: "trufflehog" },
  { type: "email", value: "j.smith@target.com (LinkedIn, 847 connections)", risk: "medium", source: "hunter.io" },
  { type: "email", value: "admin@target.com (Breach: Collection #1, 2019)", risk: "high", source: "haveibeenpwned" },
  { type: "dns", value: "MX: mail.target.com → 203.0.113.88 (Postfix 3.4.14)", risk: "low", source: "dnsx" },
  { type: "tech", value: "Apache 2.4.50, PHP 8.1, WordPress 6.2 (40 plugins)", risk: "medium", source: "wappalyzer" },
  { type: "port", value: "10.0.0.12: 22/tcp 80/tcp 443/tcp 61616/tcp 8080/tcp", risk: "high", source: "nmap" },
  { type: "ssl", value: "TLS 1.0 ENABLED on 10.0.0.3 (deprecated)", risk: "medium", source: "testssl" },
];

function HoloCanvas({ tab, phase }: { tab: string; phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function resize() {
      const c = canvasRef.current;
      if (c) { c.width = c.offsetWidth; c.height = c.offsetHeight; }
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);

    type Node3D = { x: number; y: number; z: number; vx: number; vy: number; r: number; color: string; pulse: number; type: string };
    const nodes: Node3D[] = [];
    const colors = ["#00e5ff","#e21227","#fbbf24","#a855f7","#4ade80","#f97316","#38bdf8","#ec4899"];
    for (let i = 0; i < 55; i++) {
      nodes.push({ x: Math.random(), y: Math.random(), z: Math.random(),
        vx: (Math.random()-0.5)*0.00025, vy: (Math.random()-0.5)*0.00025,
        r: 1.5 + Math.random()*3.5, color: colors[i % colors.length],
        pulse: Math.random()*Math.PI*2, type: ["host","service","vuln","unknown"][Math.floor(Math.random()*4)] });
    }

    function project(x: number, y: number, z: number, W: number, H: number) {
      const fov = 0.7;
      const pz = z * 0.6 + 0.4;
      return { px: W*0.35 + (x - 0.5) * W * fov / pz, py: H*0.5 + (y - 0.5) * H * fov * 0.6 / pz, scale: 1/pz };
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.008;
      const t = tRef.current;
      const W = cv!.width, H = cv!.height;
      ctx.clearRect(0, 0, W, H);

      // hex grid
      const hex = 38, hexH = hex * Math.sqrt(3);
      ctx.strokeStyle = "rgba(0,229,255,0.035)";
      ctx.lineWidth = 0.5;
      for (let row = -2; row < H/hexH + 2; row++) {
        for (let col = -2; col < W/(hex*1.5) + 2; col++) {
          const hx = col * hex * 1.5 + (row % 2 ? hex * 0.75 : 0);
          const hy = row * hexH * 0.5;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI/3*k - Math.PI/6;
            const px = hx + hex*0.48*Math.cos(a), py = hy + hex*0.48*Math.sin(a);
            k===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }

      // horizontal scanlines
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = `rgba(0,229,255,${0.008 + 0.004*Math.sin(t+y*0.05)})`;
        ctx.fillRect(0, y, W, 0.5);
      }

      // 3D perspective orbit rings
      const cx = W*0.72, cy = H*0.5;
      for (let ring = 0; ring < 4; ring++) {
        const rad = (60 + ring*50) * (H/400);
        const tilt = 0.35 + ring*0.05;
        const alpha = 0.06 + 0.03*Math.sin(t*0.7+ring);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad, rad*tilt, t*0.2*(ring%2?1:-1)*0.3, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${ring===0?"226,18,39":ring===1?"0,229,255":ring===2?"168,85,247":"251,191,36"},${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // orbiting dot
        const angle = t*(0.4+ring*0.15);
        const ox = cx + rad*Math.cos(angle);
        const oy = cy + rad*tilt*Math.sin(angle);
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI*2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        const trailLen = 8;
        for (let ti = 1; ti <= trailLen; ti++) {
          const ta = angle - ti*0.05;
          const tx2 = cx + rad*Math.cos(ta), ty2 = cy + rad*tilt*Math.sin(ta);
          ctx.beginPath();
          ctx.arc(tx2, ty2, 2.5*(1-ti/trailLen)*0.8, 0, Math.PI*2);
          ctx.fillStyle = ctx.strokeStyle.replace(/[\d.]+\)$/, `${alpha*(1-ti/trailLen)})`);
          ctx.fill();
        }
      }

      // central target reticle
      const prog = phase < 0 ? 0 : (phase+1)/PHASES.length;
      const rRad = Math.min(W,H)*0.14;
      ctx.beginPath();
      ctx.arc(cx, cy, rRad, -Math.PI/2, -Math.PI/2+Math.PI*2*prog);
      ctx.strokeStyle = `rgba(226,18,39,${0.6+0.3*Math.sin(t*2)})`;
      ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, rRad, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(226,18,39,0.12)";
      ctx.lineWidth = 1; ctx.stroke();
      // crosshair
      const ch = 14;
      ctx.strokeStyle = `rgba(226,18,39,${0.8+0.2*Math.sin(t*3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx-ch, cy); ctx.lineTo(cx-6, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+6, cy); ctx.lineTo(cx+ch, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-ch); ctx.lineTo(cx, cy-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy+6); ctx.lineTo(cx, cy+ch); ctx.stroke();
      // corner brackets
      const bsz = rRad*0.28;
      [[cx-rRad*0.7,cy-rRad*0.7],[cx+rRad*0.7,cy-rRad*0.7],[cx-rRad*0.7,cy+rRad*0.7],[cx+rRad*0.7,cy+rRad*0.7]].forEach(([bx,by],bi)=>{
        ctx.strokeStyle = `rgba(0,229,255,${0.5+0.2*Math.sin(t*2+bi)})`;
        ctx.lineWidth = 1.5; ctx.beginPath();
        const sx = bi%2?1:-1, sy = bi<2?-1:1;
        ctx.moveTo(bx, by+sy*bsz); ctx.lineTo(bx, by); ctx.lineTo(bx+sx*bsz, by); ctx.stroke();
      });

      // 3D nodes (sorted by z)
      const sorted = [...nodes].sort((a,b)=>a.z-b.z);
      sorted.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x<0||n.x>1) n.vx*=-1; if(n.y<0||n.y>1) n.vy*=-1;
        const { px, py, scale } = project(n.x*0.65, n.y, n.z+Math.sin(t*0.3+n.pulse)*0.1, W, H);
        const alpha = 0.4 + 0.5*Math.sin(t*1.5+n.pulse);
        const r = n.r * scale * (0.8+0.4*Math.sin(t+n.pulse));
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
        ctx.fillStyle = n.color + Math.floor(alpha*255).toString(16).padStart(2,"0");
        ctx.fill();
        if (r > 2.5) {
          ctx.beginPath(); ctx.arc(px, py, r*2.5, 0, Math.PI*2);
          ctx.strokeStyle = n.color + "18"; ctx.lineWidth = 0.5; ctx.stroke();
        }
      });

      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const pi = project(nodes[i].x*0.65, nodes[i].y, nodes[i].z, W, H);
          const pj = project(nodes[j].x*0.65, nodes[j].y, nodes[j].z, W, H);
          const dx = pi.px-pj.px, dy = pi.py-pj.py;
          const d = Math.sqrt(dx*dx+dy*dy);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(pi.px, pi.py); ctx.lineTo(pj.px, pj.py);
            ctx.strokeStyle = `rgba(0,229,255,${(1-d/90)*0.08})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      // floating data labels
      if (tab === "osint") {
        const labels = ["DNS","WHOIS","S3","GitHub","LinkedIn","Shodan"];
        labels.forEach((lb,i) => {
          const lx = W*0.05 + (i%3)*W*0.22;
          const ly = H*0.1 + Math.floor(i/3)*H*0.12 + Math.sin(t*0.8+i)*6;
          ctx.fillStyle = `rgba(0,229,255,${0.2+0.1*Math.sin(t+i)})`;
          ctx.font = "bold 9px monospace";
          ctx.fillText(`[${lb}]`, lx, ly);
        });
      }

      // threat pulse waves
      for (let wave = 0; wave < 3; wave++) {
        const wRad = ((t*0.5+wave*0.33)%1) * Math.min(W,H)*0.45;
        ctx.beginPath(); ctx.arc(cx, cy, wRad, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(226,18,39,${0.08*(1-wRad/(Math.min(W,H)*0.45))})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [tab, phase]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export function ARTPlatformModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"dashboard"|"osint"|"scanner"|"exploit"|"mitre"|"phishing"|"postex"|"forensics"|"ai"|"report">("dashboard");
  const [activePhase, setActivePhase] = useState(-1);
  const [running, setRunning] = useState(false);
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [engagementName, setEngagementName] = useState("ARTP-2025-001");
  const [targetScope, setTargetScope] = useState("10.0.0.0/24, target.com");
  const [authorized, setAuthorized] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [osintRunning, setOsintRunning] = useState(false);
  const [osintTarget, setOsintTarget] = useState("target.com");
  const [osintResults, setOsintResults] = useState<typeof OSINT_RESULTS>([]);
  const [scanTarget, setScanTarget] = useState("10.0.0.0/24");
  const [scanRunning, setScanRunning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [phishTemplate, setPhishTemplate] = useState("Microsoft 365 Login");
  const [phishSent, setPhishSent] = useState(0);
  const [phishClicked, setPhishClicked] = useState(0);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const PHASE_LOGS: Record<number, string[]> = {
    0: ["[AUTH] Verifying legal authorization token...","[AUTH] ✓ Contract sig validated (SHA256: a3f9d21b)","[AUTH] ✓ Scope boundaries locked: "+targetScope,"[RoE] Rules of Engagement v2.1 loaded","[SCOPE] IP whitelist enforced — kill switch armed","[AES256] Encryption keys generated for session"],
    1: ["[OSINT] Initiating passive OSINT sweep...","[DNS] amass: resolving "+targetScope.split(",")[1]?.trim()+"...","[+] api.target.com → 203.0.113.12","[+] admin.target.com → 203.0.113.3","[CLOUD] cloud_enum: scanning S3 buckets...","[!] PUBLIC BUCKET: company-dev-backups (3.2GB)","[GITHUB] trufflehog: scanning 847 commits...","[!] AWS_ACCESS_KEY found in commit a3f9d21","[SHODAN] 14 internet-exposed assets found","[LINKEDIN] 312 employees identified — 47 with emails"],
    2: ["[ENUM] nmap -sV -sC "+targetScope.split(",")[0]?.trim()+"...","[+] 10.0.0.1: 22/tcp 80/tcp 443/tcp 8443/tcp","[+] 10.0.0.12: 8080/tcp 61616/tcp 9001/tcp","[+] 10.0.0.45: 443/tcp (PAN-OS 10.1.8)","[SSL] testssl.sh: TLS 1.0 ENABLED on 10.0.0.3","[WEB] Wappalyzer: Apache 2.4.50, PHP 8.1, WP 6.2","[SMB] 3 hosts with SMBv1 enabled","[NFS] Anonymous NFS share: 10.0.0.55:/backup"],
    3: ["[VULN] Correlating 1,247 CVEs against fingerprints...","[CRITICAL] CVE-2024-3400 — PAN-OS RCE (CVSS 9.8)","[CRITICAL] CVE-2023-44487 — HTTP/2 Rapid Reset (9.8)","[HIGH] CVE-2023-46604 — ActiveMQ RCE (CVSS 8.8)","[HIGH] CVE-2023-23397 — Outlook NTLM (CVSS 8.1)","[ML] False+ reduction: 34 findings filtered (AI)","[RISK] Attack surface score: 9.2/10 — CRITICAL","[CVSS] 3 critical, 8 high, 14 medium, 6 low vulnerabilities"],
    4: ["[EXPLOIT] Authorization gate — PASS ✓","[EXPLOIT] CVE-2024-3400 targeting 10.0.0.45:443","[PAYLOAD] Generating OS command injection payload...","[DELIVERY] Sending malformed SESSID via GlobalProtect...","[!] RCE achieved — www-data@10.0.0.45","[PRIVESC] sudo -l enumeration...","[!] NOPASSWD: /usr/bin/python3","[ROOT] Root shell acquired 10.0.0.45 ✓","[EXPLOIT] CVE-2023-46604 → ActiveMQ 10.0.0.12:61616","[ROOT] 2nd root shell acquired ✓"],
    5: ["[POST] Running Mimikatz on 10.0.0.45...","[+] admin:$NTLM:5a4b3d921f872acc","[+] svc_backup:$NTLM:7c9e1a834bdf2190","[LATERAL] Pass-the-Hash → DC 10.0.0.3","[+] DOMAIN ADMIN ACHIEVED ✓","[KERBEROS] Kerberoasting 6 SPNs...","[+] svc_sql cracked: Summer2024!","[C2] Establishing HTTPS beacon on 443/tcp...","[C2] Beacon registered — callbacks every 60s","[EXFIL] 2.1GB staged for exfil (SAFE MODE — not transmitted)"],
    6: ["[CLEANUP] Removing implants and backdoors...","[CLEANUP] Clearing event logs (simulation)...","[REPORT] Executive summary: 3 critical, 8 high, 14 medium","[REPORT] Technical guide: 47 pages, 23 POCs","[COMPLIANCE] NIST 800-53: 12 controls failed","[COMPLIANCE] ISO 27001: Annex A.12, A.13 gaps","[COMPLIANCE] PCI-DSS: Req 6, 10, 11 findings","[DONE] Engagement complete — Full report ready ✓","[AUDIT] Immutable audit log sealed: SHA256 verified"],
  };

  const startEngagement = useCallback(() => {
    if (!authorized) return;
    setRunning(true); setActivePhase(0); setLogs([]);
    let phase = 0;
    function runPhase() {
      const phaseLogs = PHASE_LOGS[phase] ?? [];
      let li = 0;
      timerRef.current = setInterval(() => {
        if (li < phaseLogs.length) {
          setLogs(prev => [...prev, phaseLogs[li++]]);
          setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 10);
        } else {
          clearInterval(timerRef.current!);
          if (phase < PHASES.length-1) { phase++; setActivePhase(phase); setTimeout(runPhase, 600); }
          else setRunning(false);
        }
      }, 220);
    }
    runPhase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, targetScope]);

  const stopEngagement = useCallback(() => {
    clearInterval(timerRef.current!); setRunning(false);
    setLogs(prev => [...prev, "[KILL SWITCH] Emergency stop — all operations halted"]);
  }, []);

  const runOSINT = useCallback(() => {
    setOsintRunning(true); setOsintResults([]);
    let i = 0;
    const iv = setInterval(() => {
      if (i < OSINT_RESULTS.length) { setOsintResults(prev => [...prev, OSINT_RESULTS[i++]]); }
      else { clearInterval(iv); setOsintRunning(false); }
    }, 350);
  }, []);

  const runScan = useCallback(() => {
    setScanRunning(true); setScanProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random()*4+1;
      if (p >= 100) { p=100; clearInterval(iv); setScanRunning(false); }
      setScanProgress(Math.min(p,100));
    }, 120);
  }, []);

  const runPhishCampaign = useCallback(() => {
    setPhishSent(0); setPhishClicked(0);
    let s=0, c=0;
    const iv = setInterval(()=>{
      s = Math.min(s+Math.floor(Math.random()*8+1),120);
      c = Math.floor(s*0.22);
      setPhishSent(s); setPhishClicked(c);
      if (s>=120) clearInterval(iv);
    }, 150);
  }, []);

  const runAiAnalysis = useCallback(async() => {
    if (!aiQuery.trim()) return;
    setAiLoading(true); setAiResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ messages:[{role:"system",content:"You are an expert penetration tester and red team operator. Provide concise, technical analysis for authorized security assessments only."},{role:"user",content:aiQuery}], stream:false }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no reader");
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        buf += dec.decode(value);
        const lines = buf.split("\n");
        for (let i=0; i<lines.length-1; i++) {
          const line = lines[i].replace(/^data: /,"").trim();
          if (!line || line==="[DONE]") continue;
          try { const j=JSON.parse(line); const delta=j.choices?.[0]?.delta?.content||j.choices?.[0]?.text||""; if (delta) setAiResponse(prev=>prev+delta); } catch { /**/ }
        }
        buf = lines[lines.length-1];
      }
    } catch { setAiResponse("AI analysis unavailable — ensure a provider key is configured in Provider Settings."); }
    setAiLoading(false);
  }, [aiQuery]);

  useEffect(() => () => clearInterval(timerRef.current!), []);
  if (!open) return null;

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "osint", label: "OSINT", icon: Search },
    { id: "scanner", label: "Vuln Scanner", icon: Bug },
    { id: "exploit", label: "Exploit Engine", icon: Swords },
    { id: "mitre", label: "MITRE ATT&CK", icon: Layers },
    { id: "phishing", label: "Phishing Sim", icon: Mail },
    { id: "postex", label: "Post-Exploit", icon: Key },
    { id: "forensics", label: "Forensics", icon: Microscope },
    { id: "ai", label: "AI Analysis", icon: Brain },
    { id: "report", label: "Reports", icon: FileText },
  ] as const;

  const riskColor = (r: string) => ({ critical:"#e21227",high:"#f97316",medium:"#fbbf24",low:"#4ade80" }[r] ?? "#888");

  return (
    <motion.div className="fixed inset-0 z-[9999] flex flex-col" style={{ background:"#030712" }}
      initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.97 }} transition={{ duration:0.22 }}>
      <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.01) 2px,rgba(0,229,255,0.01) 4px)" }} />

      {/* HEADER */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-red-900/40 bg-black/70 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(226,18,39,0.15)", border:"1px solid rgba(226,18,39,0.4)" }}>
            <Swords className="w-4 h-4 text-red-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-red-400/70 tracking-widest">ENTERPRISE · AUTHORIZED USE ONLY</span>
              {running && <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-red-900/50 text-red-300 border border-red-700/40 animate-pulse">● LIVE</span>}
            </div>
            <h1 className="text-[13px] font-black tracking-wider text-white leading-tight">AUTONOMOUS RED TEAM PLATFORM</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-mono text-green-400">LEGAL MODE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-mono text-cyan-400">v2.5.0</span>
          </div>
          <button onClick={()=>onOpenChange(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* TABS */}
      <div className="relative z-10 flex items-center gap-0 border-b shrink-0 overflow-x-auto" style={{ borderColor:"rgba(255,255,255,0.06)", background:"rgba(0,0,0,0.5)" }}>
        {TABS.map(t => {
          const Icon = t.icon; const active = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[10px] font-mono tracking-wider border-b-2 transition-all whitespace-nowrap shrink-0 ${active?"border-red-500 text-red-400 bg-red-950/15":"border-transparent text-white/35 hover:text-white/60"}`}>
              <Icon className="w-3 h-3" />{t.label}
            </button>
          );
        })}
      </div>

      {/* BODY */}
      <div className="relative flex-1 overflow-hidden z-10">
        <HoloCanvas tab={tab} phase={activePhase} />
        <div className="relative z-10 h-full overflow-y-auto p-4">
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD ── */}
            {tab === "dashboard" && (
              <motion.div key="dash" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:"Critical Findings",value:"3",sub:"CVSS 9.0+",color:"#e21227",icon:AlertTriangle},
                    {label:"High Severity",value:"8",sub:"CVSS 7.0-8.9",color:"#f97316",icon:Flame},
                    {label:"Hosts Scanned",value:"254",sub:"Active assets",color:"#fbbf24",icon:Globe},
                    {label:"MITRE Techniques",value:"47",sub:"Mapped TTPs",color:"#00e5ff",icon:Layers},
                    {label:"Lateral Paths",value:"12",sub:"BloodHound edges",color:"#a855f7",icon:GitBranch},
                    {label:"Credentials",value:"6",sub:"Harvested (sim)",color:"#4ade80",icon:Key},
                    {label:"Phish Rate",value:"22%",sub:"120 sent · 26 clicked",color:"#ec4899",icon:Mail},
                    {label:"Risk Score",value:"9.2",sub:"Overall (Critical)",color:"#e21227",icon:TrendingUp},
                  ].map((s,i)=>{
                    const Icon = s.icon;
                    return (
                      <motion.div key={i} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        className="relative overflow-hidden rounded-xl p-3.5 border backdrop-blur-sm" style={{borderColor:s.color+"28",background:s.color+"07"}}>
                        <div className="absolute inset-x-0 top-0 h-px" style={{background:`linear-gradient(90deg,transparent,${s.color}50,transparent)`}} />
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xl font-black" style={{color:s.color}}>{s.value}</div>
                            <div className="text-[9px] font-mono text-white/50 mt-0.5">{s.label}</div>
                            <div className="text-[8px] font-mono mt-0.5" style={{color:s.color+"99"}}>{s.sub}</div>
                          </div>
                          <Icon className="w-4 h-4 opacity-35" style={{color:s.color}} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Kill Chain Progress</h3>
                      <div className="flex gap-2">
                        {!running ? (
                          <button onClick={startEngagement} disabled={!authorized}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all ${authorized?"bg-red-600/80 hover:bg-red-500 text-white border border-red-400/30":"bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"}`}>
                            <Play className="w-3 h-3" /> EXECUTE
                          </button>
                        ) : (
                          <button onClick={stopEngagement} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-orange-700/80 hover:bg-orange-600 text-white border border-orange-500/30 tracking-wider transition-all">
                            <Square className="w-3 h-3" /> KILL SWITCH
                          </button>
                        )}
                        <button onClick={()=>{setActivePhase(-1);setLogs([]);setRunning(false);clearInterval(timerRef.current!);}} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"><RotateCcw className="w-3 h-3" /></button>
                      </div>
                    </div>
                    {!authorized && <div className="mb-2 w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-950/30 border border-yellow-700/30 text-[9px] font-mono text-yellow-400">⚠ Set target scope in Exploit Engine tab and authorize to begin</div>}
                    <div className="space-y-1.5">
                      {PHASES.map((ph,i)=>{
                        const done = activePhase > i; const active = activePhase === i;
                        return (
                          <div key={ph.id} className={`flex items-center gap-3 w-7 h-7 flex items-center justify-center rounded-lg transition-all ${active?"bg-red-950/25 border border-red-700/30":"done?bg-white/4:bg-black/20"}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0`} style={{background:done||active?ph.color+"25":"rgba(255,255,255,0.04)",border:`1px solid ${ph.color}${done||active?"40":"18"}`}}>
                              {done?<CheckCircle className="w-3 h-3" style={{color:ph.color}}/>:active?<div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:ph.color}}/>:<span className="text-[9px] font-mono text-white/25">{i+1}</span>}
                            </div>
                            <span className={`text-[10px] font-mono transition-all ${active?"text-white font-bold":done?"text-white/50 line-through":"text-white/35"}`}>{ph.name}</span>
                            {active&&<div className="ml-auto flex gap-0.5">{[0,1,2].map(b=><div key={b} className="w-1 h-2.5 rounded-full animate-pulse" style={{background:ph.color+"70",animationDelay:`${b*0.2}s`}}/>)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-black/60 backdrop-blur p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Live Operation Log</h3>
                      {running&&<div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/><span className="text-[9px] font-mono text-red-400">STREAMING</span></div>}
                    </div>
                    <div ref={logRef} className="flex-1 overflow-y-auto font-mono text-[9.5px] space-y-0.5 max-h-72">
                      {logs.length===0?<div className="text-white/20 italic text-center py-8">Awaiting engagement start...</div>
                        :logs.map((l,i)=>(
                          <motion.div key={i} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}}
                            className={`leading-5 ${l.includes("[!]")||l.includes("CRITICAL")||l.includes("ROOT")?"text-red-400":l.includes("[+]")?"text-green-400":l.includes("[AUTH]")||l.includes("[DONE]")||l.includes("✓")?"text-cyan-400":l.includes("KILL SWITCH")?"text-orange-400":l.includes("[REPORT]")?"text-purple-400":"text-white/45"}`}>
                            {l}
                          </motion.div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Module grid */}
                <div>
                  <h3 className="text-[10px] font-mono text-white/50 tracking-widest uppercase mb-3">Platform Modules</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {ARTP_MODULES.map((mod,i)=>{
                      const Icon = mod.icon; const sel = selectedModule === mod.id;
                      return (
                        <motion.div key={mod.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                          onClick={()=>setSelectedModule(sel?null:mod.id)}
                          className={`relative rounded-xl border p-3 cursor-pointer transition-all ${sel?"scale-[1.02]":"border-white/7 hover:border-white/14"}`}
                          style={sel?{borderColor:mod.color+"50",background:mod.color+"09"}:{}}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:mod.color+"14",border:`1px solid ${mod.color}28`}}>
                              <Icon className="w-3.5 h-3.5" style={{color:mod.color}} />
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-green-900/30 text-green-400 border border-green-800/25">READY</div>
                          </div>
                          <h3 className="text-[11px] font-bold text-white mb-1">{mod.name}</h3>
                          <p className="text-[9px] text-white/35 leading-3.5 line-clamp-2">{mod.desc}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── OSINT ENGINE ── */}
            {tab === "osint" && (
              <motion.div key="osint" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 backdrop-blur p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white">Strategic Intelligence Engine</h2>
                  </div>
                  <div className="flex gap-3">
                    <input value={osintTarget} onChange={e=>setOsintTarget(e.target.value)}
                      placeholder="target.com or 10.0.0.0/24"
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-cyan-500/50 outline-none" />
                    <button onClick={runOSINT} disabled={osintRunning}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-bold transition-all ${osintRunning?"bg-gray-800 text-gray-500 cursor-not-allowed":"bg-cyan-600/80 hover:bg-cyan-500 text-white border border-cyan-400/30"}`}>
                      {osintRunning?<><div className="w-3 h-3 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin"/><span>SCANNING</span></>:<><Play className="w-3 h-3"/><span>RUN OSINT</span></>}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {["Subfinder/Amass","Cloud Asset Enum","GitHub TruffleHog","WHOIS/DNS History","Social Media OSINT","Shodan/Censys","HaveIBeenPwned","LinkedIn Scraper"].map(t=>(
                      <div key={t} className="flex items-center gap-1.5 w-7 h-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/5">
                        <CheckCircle className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="text-[9px] font-mono text-white/60">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {osintResults.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Intelligence Findings ({osintResults.length})</h3>
                      {osintRunning&&<div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"/><span className="text-[9px] font-mono text-cyan-400">LIVE</span></div>}
                    </div>
                    <div className="space-y-1.5">
                      {osintResults.map((r,i)=>(
                        <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.02}}
                          className="flex items-center gap-3 p-2.5 rounded-lg border" style={{borderColor:riskColor(r.risk)+"20",background:riskColor(r.risk)+"06"}}>
                          <div className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0" style={{background:riskColor(r.risk)+"20",color:riskColor(r.risk)}}>{r.risk.toUpperCase()}</div>
                          <div className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-mono text-white/40 shrink-0">{r.type}</div>
                          <span className="text-[10px] font-mono text-white/70 flex-1">{r.value}</span>
                          <span className="text-[8px] font-mono text-white/30 shrink-0">[{r.source}]</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── VULNERABILITY SCANNER ── */}
            {tab === "scanner" && (
              <motion.div key="scanner" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/10 backdrop-blur p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bug className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-bold text-white">Vulnerability Assessment Core</h2>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <input value={scanTarget} onChange={e=>setScanTarget(e.target.value)} placeholder="10.0.0.0/24"
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-yellow-500/50 outline-none" />
                    <button onClick={runScan} disabled={scanRunning}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-bold transition-all ${scanRunning?"bg-gray-800 text-gray-500":"bg-yellow-600/80 hover:bg-yellow-500 text-white border border-yellow-400/30"}`}>
                      {scanRunning?<><div className="w-3 h-3 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin"/><span>SCANNING</span></>:<><Play className="w-3 h-3"/><span>SCAN</span></>}
                    </button>
                  </div>
                  {scanProgress > 0 && (
                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-white/40 mb-1">
                        <span>Scan Progress</span><span>{Math.round(scanProgress)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <motion.div className="h-full rounded-full" style={{background:"linear-gradient(90deg,#fbbf24,#f97316)"}} animate={{width:`${scanProgress}%`}} transition={{duration:0.1}} />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                    {["OpenVAS","Nessus API","Nmap NSE","OWASP ZAP","Burp Suite","testssl.sh","Prowler","ScoutSuite","Nikto","Sqlmap","Nuclei","Trivy"].map(t=>(
                      <div key={t} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/5 text-center">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mx-auto mb-1" />
                        <span className="text-[8px] font-mono text-white/50">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Findings — {SAMPLE_FINDINGS.length} Vulnerabilities</h3>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/50 border border-white/8 transition-colors">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {SAMPLE_FINDINGS.map((f,i)=>(
                      <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-white/6 bg-black/40 hover:border-white/12 transition-all cursor-pointer">
                        <div className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0" style={{background:SEV_COLORS[f.sev]+"20",color:SEV_COLORS[f.sev]}}>{f.sev}</div>
                        <div className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-mono text-white/40 shrink-0">CVSS {f.cvss}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-white truncate">{f.title}</div>
                          <div className="text-[9px] font-mono text-white/35">{f.id} · {f.cwe}</div>
                        </div>
                        <div className="text-[9px] font-mono text-white/35 shrink-0">{f.host}:{f.port}</div>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono shrink-0 ${f.status==="exploited"?"bg-red-900/40 text-red-300":f.status==="verified"?"bg-yellow-900/40 text-yellow-300":f.status==="mitigated"?"bg-green-900/40 text-green-300":"bg-white/5 text-white/35"}`}>{f.status.toUpperCase()}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── EXPLOIT ENGINE ── */}
            {tab === "exploit" && (
              <motion.div key="exploit" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4 max-w-4xl mx-auto">
                <div className="rounded-xl border border-red-900/40 bg-red-950/10 backdrop-blur p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    <h2 className="text-sm font-bold text-white">Authorization & Scope Configuration</h2>
                    <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-mono bg-red-900/40 text-red-300 border border-red-800/30">AUTHORIZED TESTING ONLY</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Engagement ID</label>
                      <input value={engagementName} onChange={e=>setEngagementName(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Authorized Scope (CIDR/Domain)</label>
                      <input value={targetScope} onChange={e=>setTargetScope(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      {key:"Legal contract uploaded",desc:"Rules of Engagement document verified"},
                      {key:"Digital signature confirmed",desc:"Client authorization cryptographically signed"},
                      {key:"Scope boundaries enforced",desc:"IP/domain hard-coded whitelist — cannot be bypassed"},
                      {key:"Audit logging enabled",desc:"WORM immutable log — all actions attributed"},
                      {key:"Kill switch armed",desc:"Emergency stop halts all operations instantly"},
                      {key:"Sandbox execution active",desc:"Docker seccomp profiles enforced for exploit delivery"},
                    ].map((item,i)=>(
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5">
                        <div>
                          <div className="text-[11px] text-white/75 font-medium">{item.key}</div>
                          <div className="text-[9px] font-mono text-white/30">{item.desc}</div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-950/30 border border-yellow-700/35">
                    <p className="text-[10px] font-mono text-yellow-300">⚠ FOR AUTHORIZED PENETRATION TESTING ONLY. By enabling this engagement you confirm written authorization from the target organization. Unauthorized use is illegal and may result in criminal prosecution.</p>
                  </div>
                  <button onClick={()=>setAuthorized(!authorized)}
                    className={`w-full py-3 rounded-xl font-bold text-sm tracking-widest font-mono transition-all ${authorized?"bg-green-700/40 border border-green-500/35 text-green-300":"bg-red-600/80 hover:bg-red-500 border border-red-400/30 text-white"}`}>
                    {authorized?"✓ AUTHORIZED — SCOPE LOCKED & ENFORCED":"I CONFIRM LEGAL AUTHORIZATION — LOCK SCOPE"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {name:"Metasploit RPC",color:"#e21227",desc:"MSF framework bridge"},
                    {name:"Custom Exploits",color:"#f97316",desc:"Bespoke payload engine"},
                    {name:"Atomic Red Team",color:"#fbbf24",desc:"MITRE test automation"},
                    {name:"Caldera Framework",color:"#a855f7",desc:"Adversary emulation"},
                    {name:"ysoserial",color:"#4ade80",desc:"Java deserialization"},
                    {name:"Responder",color:"#38bdf8",desc:"NTLM hash capture"},
                    {name:"BloodHound",color:"#ec4899",desc:"AD attack paths"},
                    {name:"CrackMapExec",color:"#f59e0b",desc:"Network enum/exploit"},
                  ].map((t,i)=>(
                    <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3 hover:border-white/14 transition-colors cursor-pointer">
                      <div className="w-2 h-2 rounded-full mb-2" style={{background:t.color}} />
                      <div className="text-[11px] font-bold text-white">{t.name}</div>
                      <div className="text-[9px] font-mono text-white/35">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── MITRE ATT&CK ── */}
            {tab === "mitre" && (
              <motion.div key="mitre" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono text-white/45">MITRE ATT&CK® Enterprise Matrix v15 — {MITRE_TACTICS.length} Tactics · 60+ Techniques Mapped</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MITRE_TACTICS.map(tactic=>(
                    <div key={tactic.id} className="rounded-xl border backdrop-blur overflow-hidden" style={{borderColor:tactic.color+"22",background:tactic.color+"05"}}>
                      <button onClick={()=>setExpandedTactic(expandedTactic===tactic.id?null:tactic.id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:tactic.color}} />
                          <span className="text-[11px] font-bold font-mono" style={{color:tactic.color}}>{tactic.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-white/25">{tactic.techniques.length}</span>
                          {expandedTactic===tactic.id?<ChevronDown className="w-3 h-3 text-white/30"/>:<ChevronRight className="w-3 h-3 text-white/30"/>}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedTactic===tactic.id&&(
                          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t border-white/5">
                            <div className="p-3 space-y-1.5">
                              {tactic.techniques.map(tech=>(
                                <div key={tech} className="flex items-center gap-2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/4 transition-colors cursor-pointer">
                                  <ChevronRight className="w-3 h-3 shrink-0" style={{color:tactic.color+"70"}} />
                                  <span className="text-[9.5px] font-mono text-white/55">{tech}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── PHISHING SIM ── */}
            {tab === "phishing" && (
              <motion.div key="phishing" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-orange-900/40 bg-orange-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3"><Mail className="w-4 h-4 text-orange-400" /><h2 className="text-sm font-bold text-white">Phishing Simulation Platform</h2><span className="ml-auto text-[9px] font-mono text-orange-400 bg-orange-950/30 px-2 py-0.5 rounded border border-orange-800/30">TRAINING ONLY</span></div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Campaign Template</label>
                      <select value={phishTemplate} onChange={e=>setPhishTemplate(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-orange-500/50 outline-none">
                        {["Microsoft 365 Login","Google Workspace","DocuSign Request","IT Password Reset","CEO Urgent Wire Transfer","HR Benefits Update","Zoom Meeting Invite","AWS Security Alert"].map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Target Group</label>
                      <select className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none">
                        {["All Employees (120)","Finance Team (18)","IT Department (12)","C-Suite (8)","HR Team (15)","Engineering (47)"].map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={runPhishCampaign} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-bold bg-orange-600/80 hover:bg-orange-500 text-white border border-orange-400/30 transition-all">
                    <Play className="w-3 h-3" /> LAUNCH CAMPAIGN
                  </button>
                </div>
                {phishSent > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {label:"Emails Sent",value:phishSent,color:"#00e5ff",icon:Mail},
                      {label:"Clicked",value:phishClicked,color:"#f97316",icon:Target},
                      {label:"Click Rate",value:`${Math.round((phishClicked/Math.max(phishSent,1))*100)}%`,color:"#e21227",icon:TrendingUp},
                      {label:"Credentials Sim",value:Math.floor(phishClicked*0.6),color:"#fbbf24",icon:Key},
                    ].map((s,i)=>{
                      const Icon = s.icon;
                      return (
                        <motion.div key={i} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="rounded-xl border p-4 text-center" style={{borderColor:s.color+"28",background:s.color+"07"}}>
                          <Icon className="w-5 h-5 mx-auto mb-2" style={{color:s.color}} />
                          <div className="text-2xl font-black" style={{color:s.color}}>{s.value}</div>
                          <div className="text-[9px] font-mono text-white/45">{s.label}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {name:"Landing Page Cloner",desc:"Clone authorized test sites with credential capture simulation (FAKE DATA ONLY)"},
                    {name:"Email Spoofing Engine",desc:"SPF/DMARC bypass techniques for authorized security awareness training"},
                    {name:"Vishing Toolkit",desc:"Voice phishing call scripts, caller ID spoofing sim, social engineering playbooks"},
                    {name:"Smishing Platform",desc:"SMS phishing templates for mobile security awareness, click tracking"},
                    {name:"Deepfake Detection",desc:"Test employee awareness against AI-generated voice/video social engineering"},
                    {name:"LMS Integration",desc:"Automatic training assignment post-click, progress tracking, compliance reporting"},
                  ].map((t,i)=>(
                    <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3">
                      <div className="text-[11px] font-bold text-orange-400 mb-1">{t.name}</div>
                      <div className="text-[9px] text-white/40 leading-4">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── POST-EXPLOITATION ── */}
            {tab === "postex" && (
              <motion.div key="postex" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-purple-900/40 bg-purple-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3"><Key className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-bold text-white">Post-Exploitation & Lateral Movement</h2></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {name:"Credential Dumping",tools:"Mimikatz · LSASS · SAM · NTDS.dit",color:"#e21227"},
                      {name:"Pass-the-Hash/Ticket",tools:"PtH · PtT · Overpass-the-Hash",color:"#f97316"},
                      {name:"Kerberos Attacks",tools:"Kerberoasting · AS-REP · Golden Ticket",color:"#fbbf24"},
                      {name:"Lateral Movement",tools:"PSExec · WMI · WinRM · RDP · SSH",color:"#a855f7"},
                      {name:"Pivoting & Tunneling",tools:"SSH tunnels · SOCKS5 · ICMP · DNS",color:"#4ade80"},
                      {name:"Data Exfil Sim",tools:"DNS exfil · HTTPS · Steganography",color:"#38bdf8"},
                      {name:"Persistence",tools:"Registry · Scheduled tasks · Services",color:"#ec4899"},
                      {name:"Anti-Forensics",tools:"Log wipe sim · Timestomp · AMSI bypass",color:"#f59e0b"},
                      {name:"Privilege Escalation",tools:"Windows/Linux · sudo · SUID · Token",color:"#00e5ff"},
                    ].map((t,i)=>(
                      <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3 hover:border-white/14 transition-colors cursor-pointer">
                        <div className="w-1.5 h-1.5 rounded-full mb-2" style={{background:t.color}} />
                        <div className="text-[11px] font-bold text-white mb-1">{t.name}</div>
                        <div className="text-[9px] font-mono text-white/35">{t.tools}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/50 p-4">
                  <h3 className="text-[10px] font-mono text-white/50 tracking-widest uppercase mb-3">BloodHound-Style Attack Graph</h3>
                  <div className="h-32 rounded-lg bg-black/60 border border-purple-800/20 flex items-center justify-center relative overflow-hidden">
                    <div className="text-[9px] font-mono text-purple-400/50">→ Domain User → Service Account → Domain Admin → Enterprise Admin</div>
                    {[0,1,2,3].map(i=>(
                      <motion.div key={i} className="absolute rounded-full" animate={{opacity:[0.3,0.8,0.3],scale:[1,1.3,1]}} transition={{duration:2,repeat:Infinity,delay:i*0.5}}
                        style={{width:10,height:10,background:"#a855f7",left:`${20+i*20}%`,top:"50%",boxShadow:"0 0 12px #a855f7"}} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── FORENSICS ── */}
            {tab === "forensics" && (
              <motion.div key="forensics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3"><Microscope className="w-4 h-4 text-cyan-400" /><h2 className="text-sm font-bold text-white">Digital Forensics & Incident Response</h2></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {name:"Disk Forensics",desc:"HDD/SSD/USB acquisition · File carving · Deleted recovery · Hash verification",color:"#00e5ff",icon:Database},
                      {name:"Memory Forensics",desc:"RAM dump analysis · Process injection detection · Volatility framework",color:"#a855f7",icon:Cpu},
                      {name:"Network Forensics",desc:"PCAP analysis · Wireshark bridge · NetFlow · DNS query log correlation",color:"#38bdf8",icon:Network},
                      {name:"Mobile Forensics",desc:"Android/iOS acquisition · App data extraction · Cloud backup analysis",color:"#4ade80",icon:Radio},
                      {name:"Timeline Analysis",desc:"Event correlation · Log superimposition · Kill chain reconstruction",color:"#fbbf24",icon:Clock},
                      {name:"Malware Analysis",desc:"Static/Dynamic · Sandbox detonation · YARA rules · Behavioral patterns",color:"#e21227",icon:Bug},
                      {name:"Registry Analysis",desc:"Windows registry hive parsing · Persistence artifacts · MRU enumeration",color:"#f97316",icon:Settings},
                      {name:"Steganography",desc:"Hidden data detection in images/audio · LSB analysis · Binwalk",color:"#ec4899",icon:Eye},
                      {name:"Chain of Custody",desc:"Evidence integrity · SHA256 hashing · WORM log · Legal reporting",color:"#f59e0b",icon:ShieldCheck},
                    ].map((t,i)=>{
                      const Icon = t.icon;
                      return (
                        <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3 hover:border-white/14 transition-colors cursor-pointer">
                          <Icon className="w-4 h-4 mb-2" style={{color:t.color}} />
                          <div className="text-[11px] font-bold text-white mb-1">{t.name}</div>
                          <div className="text-[9px] text-white/35 leading-4">{t.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── AI ANALYSIS ── */}
            {tab === "ai" && (
              <motion.div key="ai" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                <div className="rounded-xl border border-purple-900/40 bg-purple-950/10 p-4">
                  <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-bold text-white">AI-Powered Security Intelligence</h2></div>
                  <div className="flex gap-3 mb-3">
                    <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAiAnalysis();}}
                      placeholder="Ask AI: Explain CVE-2024-3400, suggest remediation for SQL injection, map to MITRE ATT&CK..."
                      className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-purple-500/50 outline-none" />
                    <button onClick={runAiAnalysis} disabled={aiLoading} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-bold transition-all ${aiLoading?"bg-gray-800 text-gray-500":"bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-400/30"}`}>
                      {aiLoading?<div className="w-3 h-3 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin"/>:<Brain className="w-3 h-3" />}
                      ANALYZE
                    </button>
                  </div>
                  {aiResponse && (
                    <div className="rounded-lg bg-black/60 border border-purple-800/25 p-3 max-h-64 overflow-y-auto">
                      <p className="text-[11px] font-mono text-white/70 leading-5 whitespace-pre-wrap">{aiResponse}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    {["Explain this CVE","Suggest remediation","Map to MITRE ATT&CK","Generate pentest report","Prioritize vulnerabilities","Write Sigma detection rule"].map(q=>(
                      <button key={q} onClick={()=>setAiQuery(q)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/6 hover:border-purple-700/40 text-[9px] font-mono text-white/50 hover:text-purple-400 transition-all text-left">{q}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {name:"ML Vuln Prioritization",desc:"CVSS+EPSS+exploit availability scoring",color:"#8b5cf6"},
                    {name:"False Positive Reduction",desc:"ML classifier removes 78% of scanner noise",color:"#a855f7"},
                    {name:"Threat Prediction",desc:"Predictive intelligence from 500+ threat feeds",color:"#7c3aed"},
                    {name:"NL Query Interface",desc:"Ask anything about your attack surface in plain text",color:"#6d28d9"},
                  ].map((t,i)=>(
                    <div key={i} className="p-3 rounded-xl border border-white/7 bg-white/3">
                      <div className="text-[11px] font-bold mb-1" style={{color:t.color}}>{t.name}</div>
                      <div className="text-[9px] text-white/35">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── REPORTS ── */}
            {tab === "report" && (
              <motion.div key="report" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4 max-w-3xl mx-auto">
                <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white">Automated Report & Compliance Engine</h2>
                  {[
                    {name:"Executive Summary Report",fmt:"PDF",color:"#e21227",desc:"C-suite overview with risk scores and business impact"},
                    {name:"Technical Findings Report",fmt:"DOCX",color:"#f97316",desc:"Full technical detail with POC walkthroughs and screenshots"},
                    {name:"Remediation Roadmap",fmt:"PDF",color:"#4ade80",desc:"Prioritized fix guide with effort/impact matrix"},
                    {name:"MITRE ATT&CK Coverage",fmt:"HTML",color:"#a855f7",desc:"Interactive matrix with covered and uncovered techniques"},
                    {name:"Compliance Gap Analysis",fmt:"XLSX",color:"#00e5ff",desc:"NIST/ISO/PCI/SOC2/HIPAA control mapping and gaps"},
                    {name:"Attack Chain Timeline",fmt:"PDF",color:"#fbbf24",desc:"Visual kill chain with timestamps and evidence trail"},
                  ].map((r,i)=>(
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/7 bg-white/3 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:r.color+"12"}}>
                        <FileText className="w-4 h-4" style={{color:r.color}} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold text-white">{r.name}</div>
                        <div className="text-[9px] font-mono text-white/35">{r.desc}</div>
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/35 shrink-0">{r.fmt}</span>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-mono text-white/50 border border-white/7 transition-colors shrink-0">
                        <Download className="w-3 h-3" /> Generate
                      </button>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-white/8 bg-black/50 p-4">
                  <h3 className="text-[10px] font-mono text-white/50 tracking-widest uppercase mb-3">Integrations</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {["JIRA","ServiceNow","Trello","Splunk","ELK Stack","Slack","Teams","PagerDuty","GitHub","GitLab","Confluence","Webhook"].map(t=>(
                      <div key={t} className="flex items-center gap-1.5 w-7 h-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/5 hover:bg-white/6 transition-colors cursor-pointer">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />
                        <span className="text-[9px] font-mono text-white/50">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
