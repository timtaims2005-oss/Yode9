import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

/* ════════════════════════════════════════════════════════════
   BOOT LOG — 60 entries
════════════════════════════════════════════════════════════ */
const BOOT_LOG = [
  { ms: 0,    text: "[ BIOS ] KaliGPT Quantum Neural Engine v6.0 — COLD BOOT INITIATED",    col: "#00ff41" },
  { ms: 55,   text: "[ UEFI ] Secure boot chain SHA-512 verified. TPM 3.0 SEALED",           col: "#00ff41" },
  { ms: 110,  text: "[ MEM  ] Allocating 48.8TB threat intelligence cache… DONE",            col: "#00ff41" },
  { ms: 165,  text: "[ CPU  ] 1024-core quantum tensor cluster — ONLINE @ 4.8GHz",           col: "#00ff41" },
  { ms: 220,  text: "[ GPU  ] 24× H200 NVL tensor cores armed. VRAM: 3.84TB — READY",       col: "#00e5ff" },
  { ms: 270,  text: "[ QUANT] Quantum entanglement layer: 99.99% coherence stable",          col: "#a78bfa" },
  { ms: 320,  text: "[ QKEY ] Quantum key distribution: 4096-bit lattice — GENERATED",       col: "#a78bfa" },
  { ms: 370,  text: "[ NET  ] Quantum-encrypted mesh: 24 relay nodes active",                col: "#00e5ff" },
  { ms: 415,  text: "[ VPN  ] Onion layer + WireGuard: 6 hops — anonymized",                col: "#a78bfa" },
  { ms: 460,  text: "[ TLS  ] mTLS handshake complete. Cert chain valid (ECC-521)",          col: "#00ff41" },
  { ms: 510,  text: "[ AUTH ] Zero-trust auth layer: ACTIVE — multi-factor biometric",       col: "#fbbf24" },
  { ms: 555,  text: "[ DNA  ] Operator DNA hash: 0xDEAD9F3A matched — VERIFIED",             col: "#22c55e" },
  { ms: 600,  text: "[ RETI ] Retinal pattern hash: 0x7F2A9C1B — MATCHED",                  col: "#22c55e" },
  { ms: 645,  text: "[ VOIC ] Voice biometric: 99.4% confidence — PASS",                    col: "#22c55e" },
  { ms: 690,  text: "[ AI   ] Loading 256-brain council framework… OK",                      col: "#00ff41" },
  { ms: 735,  text: "[ PERS ] Persona matrix: 48 identities mounted… OK",                    col: "#00ff41" },
  { ms: 780,  text: "[ HUB  ] Arsenal Hub v3: 180+ modules armed and locked",                col: "#fbbf24" },
  { ms: 825,  text: "[ PRV1 ] OpenAI · Anthropic · Groq · Gemini · DeepSeek · xAI",         col: "#00e5ff" },
  { ms: 865,  text: "[ PRV2 ] Mistral · Perplexity · Together · Fireworks · NVIDIA NIM",    col: "#00e5ff" },
  { ms: 905,  text: "[ PRV3 ] Cerebras · Sambanova · Cloudflare AI · Azure OpenAI · AWS",   col: "#00e5ff" },
  { ms: 945,  text: "[ OSNT ] Dark-web indexers synced. 11 new CVEs detected",               col: "#a78bfa" },
  { ms: 985,  text: "[ OSNT2] I2P + Freenet + ZeroNet crawlers: ACTIVE",                     col: "#a78bfa" },
  { ms: 1025, text: "[ SEC  ] CSRF shield armed. Rate-limiter: 500 req/min",                 col: "#00ff41" },
  { ms: 1065, text: "[ WAF  ] Web Application Firewall: 2,847 rules loaded — ACTIVE",        col: "#00ff41" },
  { ms: 1105, text: "[ IDS  ] Intrusion Detection System: behavioral models calibrated",      col: "#fbbf24" },
  { ms: 1145, text: "[ RAG  ] Vector DB indexed: 24.7M security documents — READY",          col: "#00e5ff" },
  { ms: 1185, text: "[ LLM  ] Embedding model: 1536-dim vectors, HNSW index built",          col: "#00e5ff" },
  { ms: 1225, text: "[ PIPE ] Chain Builder v3: 48 active rules. Pipeline READY",            col: "#00ff41" },
  { ms: 1265, text: "[ GOD  ] GodMode cores UNLOCKED — all 22 modes hot",                    col: "#e21227" },
  { ms: 1305, text: "[ OLL  ] Ollama v0.38.0: llama3.3 + qwen2.5 + phi4 — LOCAL OK",        col: "#22c55e" },
  { ms: 1345, text: "[ LMS  ] LM Studio local server: 3 models loaded",                     col: "#22c55e" },
  { ms: 1385, text: "[ SYNC ] Cloud sync: PostgreSQL replication lag <0.3ms",               col: "#00e5ff" },
  { ms: 1425, text: "[ CVE  ] NVD feed: 24,891 entries · CISA KEV: 2,341 · ExploitDB: 48K", col: "#fbbf24" },
  { ms: 1465, text: "[ FUZZ ] Parseltongue v4 fuzzer armed. AFL++ + LibFuzzer ready",        col: "#a78bfa" },
  { ms: 1505, text: "[ MLWR ] Malware sandbox: 16 isolated VMs + QEMU snapshots",            col: "#e21227" },
  { ms: 1545, text: "[ DASM ] Binary disassembler: Ghidra + Radare2 + BinaryNinja ready",   col: "#a78bfa" },
  { ms: 1585, text: "[ HONP ] HoneyPot network: 20 decoys + canary tokens deployed",         col: "#f97316" },
  { ms: 1625, text: "[ SIEM ] SIEM engine: 8.4M events/sec processing capacity",             col: "#00e5ff" },
  { ms: 1665, text: "[ SOAR ] SOAR playbooks: 96 automated response rules loaded",           col: "#22c55e" },
  { ms: 1705, text: "[ UEBA ] User Entity Behavior Analytics: baseline computed",            col: "#fbbf24" },
  { ms: 1745, text: "[ DLP  ] Data Loss Prevention: DNN model v4 calibrated",                col: "#00ff41" },
  { ms: 1785, text: "[ DASH ] Monitoring: Prometheus · Grafana · Loki · Tempo · Jaeger OK", col: "#00e5ff" },
  { ms: 1825, text: "[ ZERO ] Zero-Day scanner: 9 new signatures loaded",                    col: "#fbbf24" },
  { ms: 1865, text: "[ FRNS ] Digital forensics: Volatility3 + Rekall + YARA ready",        col: "#a78bfa" },
  { ms: 1905, text: "[ PRIV ] PrivEsc AI v3: 580 privilege escalation vectors loaded",       col: "#e21227" },
  { ms: 1945, text: "[ CRPT ] CipherBreak v2: RSA/AES/ChaCha/Kyber analyzers ARMED",        col: "#a78bfa" },
  { ms: 1985, text: "[ SWRM ] Agent Swarm: 32 autonomous agents initialized",                col: "#00e5ff" },
  { ms: 2025, text: "[ CTRL ] C2 frameworks: Cobalt Strike + Havoc + Sliver integrated",    col: "#fbbf24" },
  { ms: 2065, text: "[ PHSH ] PhishKit v2: 48 templates + domain spoofer — ARMED",          col: "#e21227" },
  { ms: 2105, text: "[ SOCL ] Social engineering AI: LinkedIn/Twitter/Telegram scrapers",    col: "#a78bfa" },
  { ms: 2145, text: "[ WIFI ] WiFi attack suite: WPA3 + PMKID capture — READY",              col: "#fbbf24" },
  { ms: 2185, text: "[ BLTH ] Bluetooth/BLE scanner: BLE hijack module armed",               col: "#00e5ff" },
  { ms: 2225, text: "[ RFID ] RFID/NFC cloner: Mifare + DESFire emulator — READY",          col: "#a78bfa" },
  { ms: 2265, text: "[ SATL ] SIGINT module: radio spectrum analyzer armed",                 col: "#fbbf24" },
  { ms: 2305, text: "[ DRNE ] Drone recon module: ADS-B tracker active",                     col: "#00e5ff" },
  { ms: 2345, text: "[ SCAD ] ICS/SCADA scanner: Modbus + DNP3 + Profinet probes",          col: "#e21227" },
  { ms: 2385, text: "[ IOT  ] IoT fingerprinter: 12,000 device signatures loaded",           col: "#fbbf24" },
  { ms: 2425, text: "[ K8S  ] Kubernetes attack suite: cluster escape vectors loaded",       col: "#a78bfa" },
  { ms: 2465, text: "[ CLD  ] Cloud attack surface: AWS/GCP/Azure CSPM online",              col: "#00e5ff" },
  { ms: 2505, text: "[ CORE ] All 180 subsystems nominal. Booting UI shell…",                col: "#00ff41" },
  { ms: 2580, text: "[ DONE ] ████████████████████ 100% — WELCOME, OPERATOR. GODSPEED.",    col: "#e21227" },
];

/* ── Crypto status ── */
const CRYPTO_STATUS = [
  { algo: "Kyber-1024",     type: "KEM",        bits: 1024, status: "ACTIVE",  col: "#a78bfa", strength: 98 },
  { algo: "Dilithium-5",    type: "SIGN",       bits: 256,  status: "ACTIVE",  col: "#a78bfa", strength: 99 },
  { algo: "SPHINCS+-256",   type: "HASH-SIGN",  bits: 256,  status: "ACTIVE",  col: "#00e5ff", strength: 97 },
  { algo: "AES-256-GCM",    type: "SYMM",       bits: 256,  status: "ACTIVE",  col: "#22c55e", strength: 100 },
  { algo: "ChaCha20-Poly",  type: "SYMM",       bits: 256,  status: "ACTIVE",  col: "#22c55e", strength: 99 },
  { algo: "X25519",         type: "DH",         bits: 255,  status: "ACTIVE",  col: "#00e5ff", strength: 96 },
  { algo: "Ed448",          type: "SIGN",       bits: 448,  status: "ACTIVE",  col: "#a78bfa", strength: 99 },
  { algo: "NTRU-Prime",     type: "KEM",        bits: 761,  status: "ARMED",   col: "#fbbf24", strength: 95 },
  { algo: "FrodoKEM",       type: "KEM",        bits: 1344, status: "STANDBY", col: "#f97316", strength: 94 },
  { algo: "RSA-8192",       type: "LEGACY",     bits: 8192, status: "MONITOR", col: "#e21227", strength: 72 },
];

/* ── Radar contacts ── */
const RADAR_CONTACTS = [
  { id:"TGT-01", type:"HOST",    threat:"CRIT", ang: 30,  dist: 0.55, col:"#e21227" },
  { id:"TGT-02", type:"APT",     threat:"HIGH", ang: 75,  dist: 0.72, col:"#fbbf24" },
  { id:"TGT-03", type:"BOT",     threat:"MED",  ang:140,  dist: 0.38, col:"#a78bfa" },
  { id:"TGT-04", type:"CVE",     threat:"CRIT", ang:200,  dist: 0.61, col:"#e21227" },
  { id:"TGT-05", type:"SCAN",    threat:"LOW",  ang:255,  dist: 0.83, col:"#22c55e" },
  { id:"TGT-06", type:"RANSOMW", threat:"CRIT", ang:310,  dist: 0.45, col:"#e21227" },
  { id:"TGT-07", type:"ICS",     threat:"HIGH", ang:  5,  dist: 0.92, col:"#fbbf24" },
  { id:"TGT-08", type:"CLOUD",   threat:"MED",  ang:105,  dist: 0.67, col:"#a78bfa" },
  { id:"TGT-09", type:"WIFI",    threat:"LOW",  ang:170,  dist: 0.29, col:"#00e5ff" },
  { id:"TGT-10", type:"K8S",     threat:"HIGH", ang:340,  dist: 0.58, col:"#fbbf24" },
];

/* ── Network topology nodes ── */
const NET_NODES = [
  { id:"GW-01",  label:"Gateway",    type:"ROUTER",    ip:"10.0.0.1",   status:"OK",      conns:["FW-01","SW-01"],          threat:"none",  col:"#00e5ff" },
  { id:"FW-01",  label:"Firewall",   type:"FIREWALL",  ip:"10.0.0.2",   status:"ALERT",   conns:["SW-01","DMZ-01"],         threat:"HIGH",  col:"#e21227" },
  { id:"SW-01",  label:"Switch-Core",type:"SWITCH",    ip:"10.0.1.1",   status:"OK",      conns:["SRV-01","SRV-02","DB-01"],threat:"none",  col:"#00e5ff" },
  { id:"DMZ-01", label:"DMZ Zone",   type:"SEGMENT",   ip:"10.0.5.0/24",status:"WARN",    conns:["WEB-01","API-01"],        threat:"MED",   col:"#fbbf24" },
  { id:"SRV-01", label:"App Server", type:"SERVER",    ip:"10.0.1.10",  status:"OK",      conns:["DB-01"],                  threat:"none",  col:"#22c55e" },
  { id:"SRV-02", label:"Auth Server",type:"SERVER",    ip:"10.0.1.11",  status:"OK",      conns:["DB-01"],                  threat:"none",  col:"#22c55e" },
  { id:"DB-01",  label:"DB Cluster", type:"DATABASE",  ip:"10.0.1.20",  status:"CRITICAL",conns:[],                         threat:"CRIT",  col:"#e21227" },
  { id:"WEB-01", label:"Web Server", type:"SERVER",    ip:"10.0.5.10",  status:"WARN",    conns:[],                         threat:"MED",   col:"#fbbf24" },
  { id:"API-01", label:"API GW",     type:"GATEWAY",   ip:"10.0.5.20",  status:"OK",      conns:[],                         threat:"LOW",   col:"#00bfff" },
  { id:"K8S-01", label:"K8s Master", type:"CONTAINER", ip:"10.0.2.1",   status:"WARN",    conns:["SRV-01","SRV-02"],        threat:"MED",   col:"#a78bfa" },
];

/* ── Zero-day tracker ── */
const ZERODAY_LIST = [
  { cve:"CVE-2025-1337", cvss:10.0, product:"Apache 2.4.x",      type:"RCE",      status:"ACTIVE",  discovered:"2025-06-01", col:"#e21227", poc:true  },
  { cve:"CVE-2025-0892", cvss:9.8,  product:"OpenSSL 3.x",       type:"OVERFLOW", status:"PATCH",   discovered:"2025-05-20", col:"#fbbf24", poc:true  },
  { cve:"CVE-2025-2041", cvss:9.1,  product:"Linux Kernel 6.x",  type:"PRIVESC",  status:"ACTIVE",  discovered:"2025-06-10", col:"#e21227", poc:false },
  { cve:"CVE-2025-3318", cvss:8.9,  product:"VMware ESXi 8",     type:"ESCAPE",   discovered:"2025-06-12", col:"#f97316", status:"ACTIVE",  poc:true  },
  { cve:"CVE-2025-4401", cvss:8.5,  product:"Cisco IOS-XE",      type:"AUTH BYP", discovered:"2025-06-08", col:"#fbbf24", status:"PATCH",   poc:false },
  { cve:"CVE-2025-5599", cvss:7.8,  product:"Windows AD",        type:"LDAP INJ", discovered:"2025-05-30", col:"#fbbf24", status:"PENDING", poc:false },
  { cve:"CVE-2025-6700", cvss:9.5,  product:"Fortinet FortiOS",  type:"RCE",      discovered:"2025-06-14", col:"#e21227", status:"ACTIVE",  poc:true  },
  { cve:"CVE-2025-7812", cvss:7.5,  product:"MySQL 8.x",         type:"SQLi",     discovered:"2025-06-05", col:"#00e5ff", status:"PATCH",   poc:false },
];

/* ── SIEM events ── */
const SIEM_EVENTS = [
  { id:"EVT-1001", rule:"BRUTE_FORCE",       src:"185.220.101.42", dst:"10.0.1.11", severity:"HIGH",   action:"BLOCKED", proto:"SSH",   time:"04:51:22", col:"#e21227" },
  { id:"EVT-1002", rule:"DATA_EXFIL",        src:"10.0.1.20",      dst:"203.0.113.5",severity:"CRITICAL",action:"ALERT",  proto:"HTTPS", time:"04:49:38", col:"#e21227" },
  { id:"EVT-1003", rule:"LATERAL_MOVEMENT",  src:"10.0.1.10",      dst:"10.0.1.20", severity:"HIGH",   action:"MONITOR", proto:"SMB",   time:"04:48:11", col:"#f97316" },
  { id:"EVT-1004", rule:"PORT_SCAN",         src:"45.33.32.156",   dst:"10.0.5.0",  severity:"MEDIUM", action:"BLOCKED", proto:"TCP",   time:"04:47:55", col:"#fbbf24" },
  { id:"EVT-1005", rule:"SQL_INJECTION",     src:"92.118.160.5",   dst:"10.0.5.10", severity:"HIGH",   action:"BLOCKED", proto:"HTTP",  time:"04:46:30", col:"#e21227" },
  { id:"EVT-1006", rule:"PRIV_ESC_ATTEMPT",  src:"10.0.1.11",      dst:"10.0.1.11", severity:"CRITICAL",action:"ALERT",  proto:"LOCAL", time:"04:45:09", col:"#e21227" },
  { id:"EVT-1007", rule:"ANOMALY_BASELINE",  src:"10.0.1.15",      dst:"8.8.8.8",   severity:"LOW",    action:"LOG",     proto:"DNS",   time:"04:44:02", col:"#22c55e" },
  { id:"EVT-1008", rule:"RANSOMWARE_SIG",    src:"10.0.1.30",      dst:"*",          severity:"CRITICAL",action:"QUARANT",proto:"FILE",  time:"04:42:50", col:"#e21227" },
  { id:"EVT-1009", rule:"BEACONING",         src:"10.0.1.22",      dst:"198.51.100.3",severity:"HIGH",  action:"BLOCK",   proto:"HTTPS", time:"04:41:17", col:"#f97316" },
  { id:"EVT-1010", rule:"CERT_ANOMALY",      src:"10.0.5.20",      dst:"*",          severity:"MEDIUM", action:"ALERT",   proto:"TLS",   time:"04:39:44", col:"#fbbf24" },
];

/* ── Mission ops ── */
const MISSION_OPS = [
  { id:"OP-PHANTOM",  target:"203.0.113.48",    type:"RED TEAM",   status:"ACTIVE",  progress:78, agent:"SA-07", col:"#e21227", start:"04:12" },
  { id:"OP-NIGHTFALL",target:"corp.target.io",  type:"OSINT",      status:"ACTIVE",  progress:91, agent:"SA-13", col:"#00e5ff", start:"03:44" },
  { id:"OP-VORTEX",   target:"10.0.5.0/24",     type:"NET SCAN",   status:"PENDING", progress:0,  agent:"SA-02", col:"#fbbf24", start:"05:00" },
  { id:"OP-CIPHER",   target:"api.corp.internal",type:"CRYPTO",     status:"DONE",    progress:100,agent:"SA-21", col:"#22c55e", start:"02:11" },
  { id:"OP-SPECTRE",  target:"192.168.50.1",    type:"ICS/SCADA",  status:"ACTIVE",  progress:55, agent:"SA-09", col:"#a78bfa", start:"04:37" },
  { id:"OP-BLACKOUT", target:"cloud.aws.target", type:"CLOUD CSPM", status:"ACTIVE",  progress:62, agent:"SA-18", col:"#f97316", start:"04:51" },
  { id:"OP-POLARIS",  target:"wifi-range-b2",   type:"SIGINT",     status:"ACTIVE",  progress:34, agent:"SA-31", col:"#00bfff", start:"04:58" },
  { id:"OP-ZERO",     target:"plc.factory.ics",  type:"ZERO-DAY",   status:"PENDING", progress:0,  agent:"SA-06", col:"#ff0080", start:"05:15" },
];

/* ── Vuln scan targets ── */
const VULN_TARGETS = [
  { host:"web01.corp",    ip:"10.0.1.11",  cves:3,  critical:2, col:"#e21227", score:9.8, status:"EXPLOITABLE" },
  { host:"db02.corp",     ip:"10.0.1.22",  cves:7,  critical:1, col:"#fbbf24", score:7.5, status:"PATCHING"    },
  { host:"api.corp",      ip:"10.0.1.35",  cves:1,  critical:0, col:"#22c55e", score:4.2, status:"MONITORING"  },
  { host:"vpn.corp",      ip:"10.0.1.50",  cves:5,  critical:3, col:"#e21227", score:9.1, status:"CRITICAL"    },
  { host:"ics-plc01",     ip:"192.168.50.1",cves:9, critical:4, col:"#e21227", score:10,  status:"EMERGENCY"   },
  { host:"k8s-master",    ip:"10.0.2.1",   cves:4,  critical:1, col:"#fbbf24", score:8.8, status:"PATCHING"    },
  { host:"mail.corp",     ip:"10.0.1.80",  cves:2,  critical:0, col:"#00e5ff", score:5.5, status:"MONITORING"  },
  { host:"backup.corp",   ip:"10.0.1.99",  cves:6,  critical:2, col:"#f97316", score:8.0, status:"RISK"        },
];

/* ── 70 modules ── */
const MODULES_FLASH = [
  "KaliAgent v6","NEXUS CORE","JARVIS PRO","Parseltongue v4","RAGFlow v2","OpenGravity",
  "TeamAgent","Skills Lib v3","AgentOS","GeminiCLI","Hermes Pro","Graphify",
  "GodMode 22x","CCSwitch","UI/UX Ultra","CareerOps","RedTeam AI","DarkWeb Mon v2",
  "OSINT Ultra","Council 256","Arsenal v3","ShellGen v3","CVEWatch Live","NetScan Pro",
  "ChainBuilder v3","Forensics AI","PrivEsc AI v3","CipherBreak v2","MalwareLab v2","LogicBomb",
  "HoneyPot v2","SIEM Engine","SOAR Engine","DLP Shield v2","ZeroDay Scanner v2",
  "Swarm AI 32x","C2 Framework","BinaryAnalysis","ThreatHunter","MemDump Analyzer",
  "PacketSniffer","PortKnocker","SQLInjector","XSS Hunter","BufferBreak v2",
  "ReverseShell","MetaLoader","PhishKit v2","DNSpoison","SSLStrip",
  "WiFi Attack","BLE Scanner","RFID Cloner","SIGINT Module","ADS-B Tracker",
  "ICS Scanner","IoT Finger","K8s Escape","Cloud CSPM","UEBA Engine",
  "LLM Jailbreak","Prompt Inject","MemExtract","DeepFake AI","VoiceClone",
  "GAN Arsenal","AdvAttack","ModelPoison","DataExfil AI","CertForge",
];

/* ── 30 subsystems ── */
const SUBSYSTEMS = [
  { label: "Auth Layer",        status: "OK",   col: "#00ff41", delay: 200  },
  { label: "Quantum Encrypt",   status: "OK",   col: "#a78bfa", delay: 290  },
  { label: "Quantum Keys",      status: "4096", col: "#a78bfa", delay: 360  },
  { label: "OSINT Engine",      status: "OK",   col: "#00ff41", delay: 430  },
  { label: "Vector DB",         status: "24.7M",col: "#00e5ff", delay: 500  },
  { label: "GodMode 22x",       status: "HOT",  col: "#e21227", delay: 570  },
  { label: "Mesh Network",      status: "24N",  col: "#00e5ff", delay: 640  },
  { label: "Arsenal Hub v3",    status: "180+", col: "#fbbf24", delay: 710  },
  { label: "Council AI",        status: "256x", col: "#a78bfa", delay: 780  },
  { label: "Fuzz Engine v4",    status: "RDY",  col: "#22c55e", delay: 850  },
  { label: "Malware Lab v2",    status: "16VM", col: "#a78bfa", delay: 920  },
  { label: "CVE Monitor",       status: "LIVE", col: "#fbbf24", delay: 990  },
  { label: "Chain Builder v3",  status: "48R",  col: "#00e5ff", delay: 1060 },
  { label: "Local Engines",     status: "3MDL", col: "#22c55e", delay: 1130 },
  { label: "SIEM Engine",       status: "LIVE", col: "#00e5ff", delay: 1200 },
  { label: "SOAR Engine",       status: "96R",  col: "#22c55e", delay: 1270 },
  { label: "UEBA Baseline",     status: "OK",   col: "#fbbf24", delay: 1340 },
  { label: "HoneyPot Net",      status: "20D",  col: "#f97316", delay: 1410 },
  { label: "Swarm AI 32x",      status: "RDY",  col: "#a78bfa", delay: 1480 },
  { label: "WAF Shield",        status: "2847", col: "#00ff41", delay: 1550 },
  { label: "IDS Behavioral",    status: "OK",   col: "#fbbf24", delay: 1620 },
  { label: "Zero-Day Scanner",  status: "RDY",  col: "#e21227", delay: 1690 },
  { label: "C2 Framework",      status: "3FW",  col: "#fbbf24", delay: 1760 },
  { label: "WiFi Attack Suite", status: "RDY",  col: "#00e5ff", delay: 1830 },
  { label: "ICS/SCADA",         status: "ARM",  col: "#e21227", delay: 1900 },
  { label: "Cloud CSPM",        status: "OK",   col: "#00e5ff", delay: 1970 },
  { label: "K8s Escape",        status: "RDY",  col: "#a78bfa", delay: 2040 },
  { label: "IoT Finger",        status: "12K",  col: "#fbbf24", delay: 2110 },
  { label: "Forensics Suite",   status: "RDY",  col: "#22c55e", delay: 2180 },
  { label: "AI Adversarial",    status: "HOT",  col: "#e21227", delay: 2250 },
];

/* ── System metrics ── */
const SYS_METRICS = [
  { label: "QUANTUM CPU",    pct: 94,  col: "#00ff41" },
  { label: "NEURAL RAM",     pct: 78,  col: "#00e5ff" },
  { label: "MESH NET",       pct: 99,  col: "#a78bfa" },
  { label: "THREAT DB",      pct: 100, col: "#e21227" },
  { label: "LOCAL ENGINE",   pct: 62,  col: "#22c55e" },
  { label: "VECTOR INDEX",   pct: 88,  col: "#fbbf24" },
  { label: "SWARM AGENT",    pct: 73,  col: "#f97316" },
  { label: "SIEM PROC",      pct: 91,  col: "#00e5ff" },
  { label: "IDS ENGINE",     pct: 85,  col: "#fbbf24" },
  { label: "CLOUD CSPM",     pct: 77,  col: "#a78bfa" },
];

/* ── Threat events ── */
const THREAT_EVENTS = [
  "CVE-2025-1337 · CVSS 10.0 CRITICAL — RCE in Apache",
  "CVE-2025-9920 · CVSS 9.8 — LPE in Linux kernel 6.x",
  "APT-29 Cozy Bear: new spear-phishing wave detected",
  "APT-41: supply-chain attack on npm ecosystem",
  "Dark-web actor 0xSHADOW active — tracking now",
  "Ransomware LockBit 4.0 beacon — 3 endpoints",
  "SQL injection wave blocked: 2,847 attempts/min",
  "CISA KEV updated: +11 entries this week",
  "Zero-day PoC published for CVE-2025-7744",
  "Dark web credential dump: 14.2M records",
  "Quantum key exchange: 99.99% coherence",
  "ICS attack: Modbus probe on industrial segment",
  "BLE eavesdrop detected: 5 rogue beacons",
  "K8s cluster escape attempt blocked",
  "Cloud misconfiguration: S3 bucket exposed",
  "AI adversarial prompt injection detected",
  "Deepfake voice call attempt on exec",
  "DNS tunneling exfiltration blocked: 9.4MB",
];

/* ── Network nodes ── */
const NETWORK_NODES = [
  { id: "N01", ip: "10.0.0.1",   region: "CORE",    ping: 1,   status: "OK"   },
  { id: "N02", ip: "10.0.0.14",  region: "EU-W",    ping: 12,  status: "OK"   },
  { id: "N03", ip: "10.0.0.27",  region: "US-E",    ping: 9,   status: "OK"   },
  { id: "N04", ip: "10.0.0.38",  region: "APAC",    ping: 31,  status: "OK"   },
  { id: "N05", ip: "10.0.1.2",   region: "TOR",     ping: 44,  status: "TOR"  },
  { id: "N06", ip: "10.0.1.15",  region: "RELAY",   ping: 8,   status: "OK"   },
  { id: "N07", ip: "10.0.2.1",   region: "RELAY",   ping: 19,  status: "WARN" },
  { id: "N08", ip: "10.0.2.9",   region: "BACKUP",  ping: 6,   status: "OK"   },
  { id: "N09", ip: "10.0.3.5",   region: "EXIT",    ping: 55,  status: "OK"   },
  { id: "N10", ip: "10.0.3.22",  region: "VPN",     ping: 14,  status: "OK"   },
  { id: "N11", ip: "10.0.4.1",   region: "HIDDEN",  ping: 77,  status: "TOR"  },
  { id: "N12", ip: "10.0.4.18",  region: "EU-N",    ping: 22,  status: "OK"   },
  { id: "N13", ip: "10.0.5.3",   region: "ME",      ping: 38,  status: "OK"   },
  { id: "N14", ip: "10.0.5.77",  region: "AF",      ping: 61,  status: "OK"   },
  { id: "N15", ip: "10.0.6.2",   region: "SA",      ping: 28,  status: "OK"   },
  { id: "N16", ip: "10.0.6.55",  region: "US-W",    ping: 7,   status: "OK"   },
  { id: "N17", ip: "10.0.7.1",   region: "QUANT",   ping: 2,   status: "OK"   },
  { id: "N18", ip: "10.0.7.30",  region: "DARK",    ping: 92,  status: "TOR"  },
  { id: "N19", ip: "10.0.8.12",  region: "AS",      ping: 45,  status: "OK"   },
  { id: "N20", ip: "10.0.8.99",  region: "ONION",   ping: 110, status: "TOR"  },
  { id: "N21", ip: "10.0.9.1",   region: "I2P",     ping: 134, status: "TOR"  },
  { id: "N22", ip: "10.0.9.44",  region: "FREENET", ping: 180, status: "TOR"  },
  { id: "N23", ip: "10.0.10.5",  region: "SIGINT",  ping: 3,   status: "OK"   },
  { id: "N24", ip: "10.0.10.22", region: "SAT",     ping: 540, status: "SAT"  },
];

/* ── Quick launch ── */
const QUICK_LAUNCH = [
  { label: "KaliGPT App",     emoji: "⚡", path: "/app",     col: "#e21227", sub: "الدردشة الرئيسية" },
  { label: "Council Mode",    emoji: "🧠", path: "/app",     col: "#a78bfa", sub: "256 عقل" },
  { label: "Arsenal Hub v3",  emoji: "🔧", path: "/app",     col: "#00e5ff", sub: "180+ أداة" },
  { label: "GodMode 22x",     emoji: "🔥", path: "/app",     col: "#fbbf24", sub: "22 وضع" },
  { label: "Swarm 32x",       emoji: "🐝", path: "/app",     col: "#a78bfa", sub: "32 عميل" },
  { label: "OSINT Ultra",     emoji: "👁",  path: "/app",     col: "#00e5ff", sub: "مصادر مفتوحة" },
  { label: "Pentest Lab",     emoji: "🧪", path: "/app",     col: "#f97316", sub: "بيئة اختبار" },
  { label: "ICS/SCADA",       emoji: "⚙",  path: "/app",     col: "#e21227", sub: "صناعي" },
  { label: "Cloud CSPM",      emoji: "☁",  path: "/app",     col: "#00e5ff", sub: "AWS/GCP/Azure" },
  { label: "Roadmap",         emoji: "🗺",  path: "/roadmap", col: "#22c55e", sub: "خريطة الطريق" },
  { label: "CVE Watcher",     emoji: "🛡",  path: "/app",     col: "#fbbf24", sub: "ثغرات حية" },
  { label: "Binary Analysis", emoji: "💻", path: "/app",     col: "#a78bfa", sub: "Ghidra + r2" },
  { label: "AI Adversarial",  emoji: "🤖", path: "/app",     col: "#ff0080", sub: "LLM Jailbreak" },
  { label: "SIGINT Module",   emoji: "📡", path: "/app",     col: "#a78bfa", sub: "RF Spectrum" },
  { label: "Forensics AI",    emoji: "🔬", path: "/app",     col: "#22c55e", sub: "Volatility3 + YARA" },
  { label: "ZeroDay Scanner", emoji: "🎯", path: "/app",     col: "#fbbf24", sub: "AFL++ + LibFuzzer" },
];

/* ── AI benchmarks ── */
const AI_BENCHMARKS = [
  { name: "Groq Llama 3.3",   speed: 180, tokens: "3.3K/s",  col: "#ff6600", latency: "11ms"  },
  { name: "Cerebras",          speed: 220, tokens: "4.1K/s",  col: "#ff00aa", latency: "8ms"   },
  { name: "Sambanova",         speed: 200, tokens: "3.8K/s",  col: "#8800ff", latency: "14ms"  },
  { name: "NVIDIA NIM",        speed: 160, tokens: "3.0K/s",  col: "#76ff00", latency: "18ms"  },
  { name: "Fireworks AI",      speed: 145, tokens: "2.7K/s",  col: "#ff9900", latency: "22ms"  },
  { name: "GPT-4o",            speed: 75,  tokens: "1.1K/s",  col: "#00ff41", latency: "66ms"  },
  { name: "Gemini 2.5 Flash",  speed: 120, tokens: "1.8K/s",  col: "#00bfff", latency: "40ms"  },
  { name: "DeepSeek V3",       speed: 95,  tokens: "1.4K/s",  col: "#00ffcc", latency: "55ms"  },
];

/* ── Swarm agents ── */
const SWARM_AGENTS = [
  { id: "SA-01", role: "RECON",    status: "SCANNING", col: "#00e5ff", target: "example.com"  },
  { id: "SA-02", role: "EXPLOIT",  status: "ARMED",    col: "#e21227", target: "CVE-2025-1337" },
  { id: "SA-03", role: "OSINT",    status: "INDEXING", col: "#a78bfa", target: "dark-web feed" },
  { id: "SA-04", role: "PHISH",    status: "READY",    col: "#fbbf24", target: "template v12"  },
  { id: "SA-05", role: "FORENSIC", status: "ANALYSIS", col: "#22c55e", target: "mem.dump"      },
  { id: "SA-06", role: "C2",       status: "ACTIVE",   col: "#ff6b35", target: "havoc listener" },
  { id: "SA-07", role: "FUZZ",     status: "RUNNING",  col: "#00ff41", target: "target binary"  },
  { id: "SA-08", role: "SOCIAL",   status: "CRAWLING", col: "#a78bfa", target: "linkedin feed"  },
  { id: "SA-09", role: "WIFI",     status: "SNIFFING", col: "#00e5ff", target: "ch 1-14"        },
  { id: "SA-10", role: "ICS",      status: "PROBING",  col: "#e21227", target: "modbus:502"     },
  { id: "SA-11", role: "CLOUD",    status: "SCANNING", col: "#00bfff", target: "s3 buckets"     },
  { id: "SA-12", role: "AI-ADV",   status: "TESTING",  col: "#ff0080", target: "LLM boundary"   },
  { id: "SA-13", role: "BINARY",   status: "DISASM",   col: "#a78bfa", target: "malware.exe"    },
  { id: "SA-14", role: "PRIV-ESC", status: "HUNTING",  col: "#fbbf24", target: "kernel surface"  },
  { id: "SA-15", role: "EXFIL",    status: "STAGING",  col: "#f97316", target: "dns tunnel"     },
  { id: "SA-16", role: "COVER",    status: "ACTIVE",   col: "#22c55e", target: "log cleanup"    },
];

/* ── Intel feed ── */
const INTEL_FEED = [
  { sev: "CRIT", src: "NVD",       msg: "CVE-2025-1337 — Apache RCE CVSS 10.0",           col: "#e21227" },
  { sev: "HIGH", src: "CISA KEV",  msg: "CVE-2025-7744 — Windows LPE CVSS 9.8",            col: "#fbbf24" },
  { sev: "CRIT", src: "0DAY",      msg: "CVE-2025-9920 — Linux kernel 6.x RCE",             col: "#e21227" },
  { sev: "HIGH", src: "APT",       msg: "APT-41 — supply-chain npm compromise",              col: "#fbbf24" },
  { sev: "MED",  src: "DARKWEB",   msg: "14.2M credentials dump — $0.003/record",           col: "#a78bfa" },
  { sev: "CRIT", src: "RANSOMWARE",msg: "LockBit 4.0 — new variant polymorphic",             col: "#e21227" },
  { sev: "HIGH", src: "VENDOR",    msg: "Cisco IOS-XE auth bypass CVE-2025-3311",            col: "#fbbf24" },
  { sev: "MED",  src: "OSINT",     msg: "ICS/SCADA modbus exposure: 47,000 devices",         col: "#a78bfa" },
  { sev: "INFO", src: "THREAT INT",msg: "Conti successor group 'BlackStar' active",           col: "#22c55e" },
  { sev: "HIGH", src: "BUG BOUNTY",msg: "P1 Android kernel — $150K payout",                  col: "#fbbf24" },
  { sev: "CRIT", src: "CLOUD",     msg: "AWS IAM privilege esc 0-day — unpatched",           col: "#e21227" },
  { sev: "MED",  src: "AI",        msg: "GPT-4 jailbreak — 99% bypass rate (new prompt)",    col: "#a78bfa" },
];

/* ── Precomputed values ── */
const WAVE_H = Array.from({ length: 36 }, () => 4 + Math.random() * 20);
const WAVE_D = Array.from({ length: 36 }, () => 0.25 + Math.random() * 0.65);

/* ════════════════════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════════════════════ */
function CornerHUD({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 8, left: 8 }, tr: { top: 8, right: 8 },
    bl: { bottom: 8, left: 8 }, br: { bottom: 8, right: 8 },
  };
  const rotate = { tl: "0deg", tr: "90deg", bl: "270deg", br: "180deg" }[pos];
  return (
    <div style={{ position: "absolute", ...styles[pos], width: 52, height: 52, pointerEvents: "none", zIndex: 20 }}>
      <svg width="52" height="52" style={{ transform: `rotate(${rotate})` }}>
        <polyline points="0,26 0,0 26,0" fill="none" stroke="rgba(226,18,39,0.75)" strokeWidth="2" />
        <polyline points="7,33 7,7 33,7" fill="none" stroke="rgba(226,18,39,0.2)" strokeWidth="0.8" />
        <circle cx="0" cy="0" r="3.5" fill="#e21227" opacity="0.85" />
        <motion.circle cx="14" cy="0" r="1.2" fill="#e21227" opacity="0.45"
          animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <motion.circle cx="0" cy="14" r="1.2" fill="#00e5ff" opacity="0.35"
          animate={{ opacity: [0.35, 0.8, 0.35] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }} />
      </svg>
    </div>
  );
}

function WaveformBar({ color = "#00ff41", bars = 36 }: { color?: string; bars?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 24 }}>
      {WAVE_H.slice(0, bars).map((h, i) => (
        <motion.div key={i}
          style={{ width: 2, borderRadius: 1, background: color, originY: 1 }}
          animate={{ height: [3, h, 3] }}
          transition={{ duration: WAVE_D[i], repeat: Infinity, delay: i * 0.03, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function MetricBar({ label, pct, col, delay }: { label: string; pct: number; col: string; delay: number }) {
  const [live, setLive] = useState(pct);
  useEffect(() => {
    const id = setInterval(() => setLive(p => Math.max(5, Math.min(100, p + (Math.random() - 0.5) * 5))), 1800 + Math.random() * 800);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay / 1000 + 0.4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.32)", letterSpacing: "0.16em" }}>{label}</span>
        <span style={{ fontSize: 6.5, fontFamily: "monospace", color: col }}>{Math.round(live)}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div style={{ height: "100%", background: `linear-gradient(90deg,${col}77,${col})`, borderRadius: 2 }}
          animate={{ width: `${live}%` }} transition={{ duration: 1.1 }} />
      </div>
    </motion.div>
  );
}

function BiometricScanner({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
      {[0, 6, 13, 20].map((inset, i) => (
        <motion.div key={i} style={{
          position: "absolute", inset, borderRadius: "50%",
          border: `${i % 2 === 0 ? "1.5px" : "0.8px"} ${i % 2 === 0 ? "solid" : "dashed"} ${
            i === 0 ? "rgba(0,229,255,0.55)" : i === 1 ? "rgba(226,18,39,0.45)" : i === 2 ? "rgba(167,139,250,0.3)" : "rgba(0,229,255,0.15)"
          }`,
        }}
          animate={{ rotate: i % 2 === 0 ? [0, 360] : [0, -360] }}
          transition={{ duration: [3.5, 2.5, 7, 12][i], repeat: Infinity, ease: "linear" }}
        />
      ))}
      <div style={{ position: "absolute", inset: 22, border: "1px solid rgba(0,229,255,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect x="8" y="5" width="22" height="28" rx="7" stroke="rgba(0,229,255,0.65)" strokeWidth="1.2"/>
          <circle cx="14" cy="17" r="2.2" fill="#00e5ff" opacity="0.85"/>
          <circle cx="24" cy="17" r="2.2" fill="#00e5ff" opacity="0.85"/>
          <path d="M11 26 Q19 31 27 26" stroke="rgba(0,229,255,0.65)" strokeWidth="1.2" fill="none"/>
          <line x1="8"  y1="10" x2="13" y2="10" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <line x1="25" y1="10" x2="30" y2="10" stroke="rgba(0,229,255,0.5)" strokeWidth="1"/>
          <line x1="8"  y1="19" x2="11" y2="19" stroke="rgba(0,229,255,0.3)" strokeWidth="0.8"/>
          <line x1="27" y1="19" x2="30" y2="19" stroke="rgba(0,229,255,0.3)" strokeWidth="0.8"/>
          <line x1="19" y1="5"  x2="19" y2="8"  stroke="rgba(0,229,255,0.4)" strokeWidth="1"/>
          <line x1="19" y1="30" x2="19" y2="33" stroke="rgba(0,229,255,0.4)" strokeWidth="1"/>
        </svg>
      </div>
      {active && (
        <motion.div style={{ position: "absolute", inset: 22, borderRadius: "50%", overflow: "hidden" }}>
          <motion.div style={{ position: "absolute", left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg,transparent,#00e5ff,transparent)", boxShadow: "0 0 16px #00e5ff" }}
            animate={{ top: ["0%","100%","0%"] }} transition={{ duration: 1.3, repeat: Infinity }} />
        </motion.div>
      )}
      <motion.div style={{ position: "absolute", bottom: 2, right: 2, width: 11, height: 11, borderRadius: "50%", background: active ? "#22c55e" : "#e21227", boxShadow: `0 0 12px ${active ? "#22c55e" : "#e21227"}` }}
        animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.75, repeat: Infinity }} />
    </div>
  );
}

function SphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  useEffect(() => {
    const cv  = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    cv.width  = 290; cv.height = 290;
    const cx = 145, cy = 145, R = 112;
    let angle = 0, t = 0;
    const COLORS = ["#e21227","#00e5ff","#a78bfa","#22c55e","#fbbf24","#f97316","#ff0080","#00ffcc","#ffcc00","#76ff00","#bf00ff","#ff6600"];

    function draw() {
      ctx.clearRect(0, 0, 290, 290); angle += 0.013; t += 0.025;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
      grd.addColorStop(0, "rgba(226,18,39,0.07)"); grd.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.7, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill();

      const rings = [
        { r: R, col: "rgba(226,18,39,", t: 0 }, { r: R*.77, col: "rgba(0,229,255,", t: Math.PI/4 },
        { r: R*.54, col: "rgba(167,139,250,", t: Math.PI/2.5 }, { r: R*.9, col: "rgba(34,197,94,", t: Math.PI/6 },
        { r: R*.63, col: "rgba(251,191,36,", t: Math.PI/3.5 }, { r: R*.39, col: "rgba(249,115,22,", t: Math.PI/1.8 },
        { r: R*.82, col: "rgba(0,255,204,", t: Math.PI/5 }, { r: R*.47, col: "rgba(255,0,128,", t: Math.PI/2.2 },
      ];
      rings.forEach(({ r, col, t: tilt }) => {
        for (let lat = -Math.PI/2; lat <= Math.PI/2; lat += Math.PI/7) {
          const yr = r * Math.sin(lat), r2 = r * Math.cos(lat);
          ctx.beginPath(); let first = true;
          for (let lon = 0; lon <= Math.PI*2+.1; lon += 0.08) {
            const x3 = r2*Math.cos(lon+angle+tilt), z3 = r2*Math.sin(lon+angle+tilt);
            const xF = x3, yF = yr*Math.cos(tilt)-z3*Math.sin(tilt), zF = yr*Math.sin(tilt)+z3*Math.cos(tilt);
            const p = 370/(370+zF), px = cx+xF*p, py = cy+yF*p;
            const al = Math.max(0,(zF/r+1)/2);
            ctx.strokeStyle = `${col}${(al*.5).toFixed(2)})`; ctx.lineWidth = .6;
            if (first) { ctx.moveTo(px,py); first=false; } else ctx.lineTo(px,py);
          }
          ctx.stroke();
        }
      });

      const nPts = 260;
      for (let i = 0; i < nPts; i++) {
        const phi = Math.acos(1-2*i/nPts), theta = Math.PI*(1+Math.sqrt(5))*i+angle*2;
        const x = R*Math.sin(phi)*Math.cos(theta), y = R*Math.sin(phi)*Math.sin(theta), z = R*Math.cos(phi);
        const p = 370/(370+z), px = cx+x*p, py = cy+y*p;
        const br = (z/R+1)/2, pulse = .5+.5*Math.sin(t+i*.22), pr = 2*p*(.5+.5*pulse);
        ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2);
        ctx.fillStyle = `rgba(226,18,39,${(br*.9*pulse).toFixed(2)})`; ctx.fill();
      }

      COLORS.forEach((col, i) => {
        const oa = angle*(1.25+i*.13)+(Math.PI*2/COLORS.length)*i;
        const orR = R*(.3+i*.065);
        const ox = cx+orR*Math.cos(oa), oy = cy+orR*Math.sin(oa)*.38, oz = orR*Math.sin(oa);
        const p = 370/(370+oz);
        ctx.beginPath(); ctx.arc(ox*p+cx*(1-p), oy*p+cy*(1-p), 4*p, 0, Math.PI*2);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
      });

      const cp = .5+.5*Math.sin(t*2);
      const cg = ctx.createRadialGradient(cx,cy,0,cx,cy,28*cp);
      cg.addColorStop(0,`rgba(226,18,39,${(.75*cp).toFixed(2)})`); cg.addColorStop(.5,`rgba(167,139,250,${(.32*cp).toFixed(2)})`); cg.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(cx,cy,28*cp,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

function NetworkMap() {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(0,229,255,0.45)", fontWeight: 700 }}>
        ▶ NETWORK NODES [{NETWORK_NODES.length}/24]
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {NETWORK_NODES.map(n => (
          <div key={n.id} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", borderRadius: 4,
            background: "rgba(0,229,255,0.025)",
            border: `1px solid ${n.status==="WARN"?"rgba(251,191,36,0.2)":n.status==="TOR"?"rgba(167,139,250,0.2)":n.status==="SAT"?"rgba(0,191,255,0.2)":"rgba(0,229,255,0.08)"}`,
          }}>
            <motion.div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: n.status==="WARN"?"#fbbf24":n.status==="TOR"?"#a78bfa":n.status==="SAT"?"#00bfff":"#22c55e",
              boxShadow: `0 0 4px ${n.status==="WARN"?"#fbbf24":n.status==="TOR"?"#a78bfa":n.status==="SAT"?"#00bfff":"#22c55e"}`,
            }} animate={{ opacity: n.status==="WARN"?[1,.3,1]:1 }} transition={{ duration:.9, repeat:Infinity }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {n.id} · {n.region}
              </div>
              <div style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(0,229,255,0.35)", marginTop: 1 }}>
                {n.ip} · {n.ping}ms
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIBenchmarkPanel() {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(251,191,36,0.5)", fontWeight: 700 }}>
        ▶ AI PROVIDER BENCHMARKS
      </div>
      {AI_BENCHMARKS.map((b, i) => (
        <motion.div key={b.name} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{b.name}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{b.latency}</span>
              <span style={{ fontSize: 6.5, fontFamily: "monospace", color: b.col }}>{b.tokens}</span>
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div style={{ height: "100%", background: `linear-gradient(90deg,${b.col}55,${b.col})`, borderRadius: 2 }}
              initial={{ width: 0 }} animate={{ width: `${b.speed/2.25}%` }}
              transition={{ delay: .5+i*.09, duration: 1.1 }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SwarmAgentPanel() {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(167,139,250,0.5)", fontWeight: 700 }}>
        ▶ SWARM AGENTS [16/32]
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {SWARM_AGENTS.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
            <motion.div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: a.col, boxShadow: `0 0 6px ${a.col}` }}
              animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2+i*.1, repeat: Infinity }} />
            <span style={{ fontSize: 6, fontFamily: "monospace", color: a.col, fontWeight: 700, width: 58, flexShrink: 0 }}>{a.id} {a.role}</span>
            <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.status} → {a.target}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NetworkTopologyPanel() {
  const critical = NET_NODES.filter(n => n.status === "CRITICAL").length;
  const alerts   = NET_NODES.filter(n => n.status === "ALERT" || n.status === "WARN").length;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(0,229,255,0.55)", fontWeight: 700 }}>
        ▶ NETWORK TOPOLOGY — {NET_NODES.length} NODES
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
        {[
          { label:"NODES",    val: NET_NODES.length, col:"#00e5ff" },
          { label:"CRITICAL", val: critical,          col:"#e21227" },
          { label:"ALERTS",   val: alerts,            col:"#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ textAlign:"center", padding:"4px 2px", borderRadius:4, background:`${s.col}08`, border:`1px solid ${s.col}20` }}>
            <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:900, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", letterSpacing:"0.2em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {NET_NODES.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
            style={{ padding:"4px 6px", borderRadius:5, background:`${n.col}07`, border:`1px solid ${n.col}18` }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <motion.div style={{ width:4, height:4, borderRadius:"50%", background:n.col, flexShrink:0 }}
                animate={n.status==="CRITICAL"||n.status==="ALERT"?{opacity:[1,0.2,1]}:{opacity:0.6}} transition={{ duration:0.9, repeat:Infinity }}/>
              <span style={{ fontSize:6.5, fontFamily:"monospace", fontWeight:700, color:"rgba(255,255,255,0.7)", flex:1 }}>{n.id}</span>
              <span style={{ fontSize:5.5, fontFamily:"monospace", color:"rgba(255,255,255,0.28)" }}>{n.type}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", fontWeight:700, padding:"1px 3px", borderRadius:2,
                background:n.status==="OK"?"rgba(34,197,94,0.12)":n.status==="CRITICAL"?"rgba(226,18,39,0.18)":n.status==="ALERT"?"rgba(226,18,39,0.12)":"rgba(251,191,36,0.1)",
                color:n.status==="OK"?"#22c55e":n.status==="CRITICAL"||n.status==="ALERT"?"#e21227":"#fbbf24",
                border:`1px solid ${n.status==="OK"?"rgba(34,197,94,0.2)":n.status==="CRITICAL"||n.status==="ALERT"?"rgba(226,18,39,0.25)":"rgba(251,191,36,0.2)"}` }}>
                {n.status}
              </span>
            </div>
            <div style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", paddingLeft:9, marginTop:1.5 }}>
              {n.ip} · {n.conns.length > 0 ? `→ ${n.conns.slice(0,2).join(", ")}` : "leaf node"}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ZeroDayPanel() {
  const active = ZERODAY_LIST.filter(z => z.status === "ACTIVE");
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(226,18,39,0.55)", fontWeight: 700 }}>
        ▶ ZERO-DAY TRACKER — {active.length} ACTIVE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
        {[
          { label:"ACTIVE",  val: active.length, col:"#e21227" },
          { label:"POC RDY", val: ZERODAY_LIST.filter(z=>z.poc).length, col:"#ff0080" },
          { label:"PATCHED", val: ZERODAY_LIST.filter(z=>z.status==="PATCH").length, col:"#22c55e" },
        ].map(s => (
          <div key={s.label} style={{ textAlign:"center", padding:"4px 2px", borderRadius:4, background:`${s.col}08`, border:`1px solid ${s.col}20` }}>
            <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:900, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", letterSpacing:"0.18em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {ZERODAY_LIST.map((z, i) => (
          <motion.div key={z.cve} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
            style={{ padding:"5px 7px", borderRadius:5, background:`${z.col}07`, border:`1px solid ${z.col}18` }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
              <span style={{ fontSize:6.5, fontFamily:"monospace", fontWeight:700, color:z.col, flex:1 }}>{z.cve}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", fontWeight:900, color:"#fff",
                background:z.cvss>=9.5?"#e21227":z.cvss>=8?"#f97316":"#fbbf24",
                padding:"1px 3px", borderRadius:2 }}>CVSS {z.cvss}</span>
              {z.poc && <span style={{ fontSize:5, fontFamily:"monospace", fontWeight:700, padding:"1px 3px", borderRadius:2,
                background:"rgba(255,0,128,0.15)", color:"#ff0080", border:"1px solid rgba(255,0,128,0.3)" }}>PoC</span>}
            </div>
            <div style={{ display:"flex", gap:6, paddingLeft:0 }}>
              <span style={{ fontSize:5.5, fontFamily:"monospace", color:"rgba(255,255,255,0.38)", flex:1 }}>{z.product}</span>
              <span style={{ fontSize:5.5, fontFamily:"monospace", color:"rgba(255,255,255,0.25)" }}>{z.type}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", padding:"1px 3px", borderRadius:2,
                background:z.status==="ACTIVE"?"rgba(226,18,39,0.15)":z.status==="PATCH"?"rgba(34,197,94,0.1)":"rgba(251,191,36,0.1)",
                color:z.status==="ACTIVE"?"#e21227":z.status==="PATCH"?"#22c55e":"#fbbf24",
                border:`1px solid ${z.status==="ACTIVE"?"rgba(226,18,39,0.25)":z.status==="PATCH"?"rgba(34,197,94,0.2)":"rgba(251,191,36,0.2)"}` }}>
                {z.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SIEMPanel() {
  const crit = SIEM_EVENTS.filter(e=>e.severity==="CRITICAL").length;
  const [liveIdx, setLiveIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLiveIdx(i => (i+1) % SIEM_EVENTS.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily:"monospace", letterSpacing:"0.3em", marginBottom:8, color:"rgba(167,139,250,0.55)", fontWeight:700 }}>
        ▶ SIEM — {SIEM_EVENTS.length} EVENTS
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginBottom:8 }}>
        {[
          { label:"CRITICAL", val:crit, col:"#e21227" },
          { label:"BLOCKED",  val:SIEM_EVENTS.filter(e=>e.action==="BLOCKED"||e.action==="BLOCK").length, col:"#22c55e" },
          { label:"ALERTS",   val:SIEM_EVENTS.filter(e=>e.action==="ALERT").length, col:"#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ textAlign:"center", padding:"4px 2px", borderRadius:4, background:`${s.col}08`, border:`1px solid ${s.col}20` }}>
            <div style={{ fontSize:13, fontFamily:"monospace", fontWeight:900, color:s.col }}>{s.val}</div>
            <div style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", letterSpacing:"0.15em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:3.5 }}>
        {SIEM_EVENTS.map((e, i) => (
          <motion.div key={e.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
            style={{ padding:"4px 6px", borderRadius:4, background:liveIdx===i?`${e.col}10`:`${e.col}05`,
              border:`1px solid ${liveIdx===i?e.col+"35":e.col+"12"}`, transition:"all 0.4s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:1.5 }}>
              <span style={{ fontSize:5.5, fontFamily:"monospace", fontWeight:700, color:e.col, flex:1 }}>{e.rule}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.25)" }}>{e.time}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", fontWeight:700, padding:"1px 3px", borderRadius:2,
                background:e.severity==="CRITICAL"?"rgba(226,18,39,0.18)":e.severity==="HIGH"?"rgba(249,115,22,0.12)":"rgba(251,191,36,0.08)",
                color:e.severity==="CRITICAL"?"#e21227":e.severity==="HIGH"?"#f97316":"#fbbf24",
                border:`1px solid ${e.severity==="CRITICAL"?"rgba(226,18,39,0.3)":e.severity==="HIGH"?"rgba(249,115,22,0.2)":"rgba(251,191,36,0.15)"}` }}>
                {e.severity}
              </span>
            </div>
            <div style={{ display:"flex", gap:5, paddingLeft:0 }}>
              <span style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.22)", flex:1 }}>
                {e.src} → {e.dst}
              </span>
              <span style={{ fontSize:5, fontFamily:"monospace", color:"rgba(255,255,255,0.25)" }}>{e.proto}</span>
              <span style={{ fontSize:5, fontFamily:"monospace", fontWeight:700, color:
                e.action==="BLOCKED"||e.action==="BLOCK"||e.action==="QUARANT"?"#22c55e":e.action==="ALERT"?"#e21227":"#fbbf24" }}>
                {e.action}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MissionPanel() {
  const active = MISSION_OPS.filter(m => m.status === "ACTIVE");
  const done   = MISSION_OPS.filter(m => m.status === "DONE");
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(226,18,39,0.55)", fontWeight: 700 }}>
        ▶ MISSION CONTROL — {active.length} OPS ACTIVE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
        {[
          { label: "ACTIVE", val: active.length, col: "#e21227" },
          { label: "DONE",   val: done.length,   col: "#22c55e" },
          { label: "PENDING",val: MISSION_OPS.filter(m=>m.status==="PENDING").length, col: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "4px 2px", borderRadius: 4, background: `${s.col}08`, border: `1px solid ${s.col}20` }}>
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 900, color: s.col }}>{s.val}</div>
            <div style={{ fontSize: 5, fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.2em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {MISSION_OPS.map((op, i) => (
          <motion.div key={op.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.055 }}
            style={{ padding: "5px 7px", borderRadius: 5, background: `${op.col}07`, border: `1px solid ${op.col}18` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <motion.div style={{ width: 4, height: 4, borderRadius: "50%", background: op.col, flexShrink: 0 }}
                animate={op.status === "ACTIVE" ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.4 }} transition={{ duration: 1.2, repeat: Infinity }} />
              <span style={{ fontSize: 6.5, fontFamily: "monospace", fontWeight: 700, color: op.col, flex: 1 }}>{op.id}</span>
              <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{op.type}</span>
              <span style={{ fontSize: 5, fontFamily: "monospace", fontWeight: 700, padding: "1px 3px", borderRadius: 2,
                background: op.status==="ACTIVE"?"rgba(226,18,39,0.15)":op.status==="DONE"?"rgba(34,197,94,0.12)":"rgba(251,191,36,0.1)",
                color: op.status==="ACTIVE"?"#e21227":op.status==="DONE"?"#22c55e":"#fbbf24",
                border: `1px solid ${op.status==="ACTIVE"?"rgba(226,18,39,0.25)":op.status==="DONE"?"rgba(34,197,94,0.2)":"rgba(251,191,36,0.2)"}` }}>
                {op.status}
              </span>
            </div>
            <div style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.28)", marginBottom: 3, paddingLeft: 9 }}>
              {op.target} · {op.agent} · {op.start}
            </div>
            {op.progress > 0 && (
              <div style={{ height: 2.5, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginLeft: 9 }}>
                <motion.div style={{ height: "100%", background: `linear-gradient(90deg,${op.col}66,${op.col})`, borderRadius: 2 }}
                  initial={{ width: 0 }} animate={{ width: `${op.progress}%` }} transition={{ delay: i * 0.06 + 0.3, duration: 1 }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VulnScanPanel() {
  const [scanIdx, setScanIdx] = useState(0);
  const [pulseMap, setPulseMap] = useState<Record<string,boolean>>({});
  useEffect(() => {
    const id = setInterval(() => {
      setScanIdx(i => (i + 1) % VULN_TARGETS.length);
      setPulseMap(p => { const n = {...p}; VULN_TARGETS.forEach(v => { n[v.host] = Math.random() > 0.5; }); return n; });
    }, 900);
    return () => clearInterval(id);
  }, []);
  const totalCrit = VULN_TARGETS.reduce((s, v) => s + v.critical, 0);
  const totalCves = VULN_TARGETS.reduce((s, v) => s + v.cves, 0);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(226,18,39,0.55)", fontWeight: 700 }}>
        ▶ VULNERABILITY SCANNER — {VULN_TARGETS.length} HOSTS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
        {[
          { label: "TOTAL CVEs",  val: totalCves,  col: "#fbbf24" },
          { label: "CRITICAL",    val: totalCrit,  col: "#e21227" },
          { label: "AVG SCORE",   val: (VULN_TARGETS.reduce((s,v)=>s+v.score,0)/VULN_TARGETS.length).toFixed(1), col: "#f97316" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "4px 2px", borderRadius: 4, background: `${s.col}08`, border: `1px solid ${s.col}20` }}>
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 900, color: s.col }}>{s.val}</div>
            <div style={{ fontSize: 5, fontFamily: "monospace", color: "rgba(255,255,255,0.22)", letterSpacing: "0.15em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {VULN_TARGETS.map((v, i) => (
          <motion.div key={v.host} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: "4px 6px", borderRadius: 4, background: `${v.col}07`, border: `1px solid ${v.col}${scanIdx===i?"35":"14"}`,
              transition: "border-color 0.3s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <motion.div style={{ width: 4, height: 4, borderRadius: "50%", background: v.col, flexShrink: 0 }}
                animate={pulseMap[v.host] ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} />
              <span style={{ fontSize: 6.5, fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.65)", flex: 1 }}>{v.host}</span>
              <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{v.ip}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, paddingLeft: 8 }}>
              <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "#fbbf24" }}>CVEs: {v.cves}</span>
              <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "#e21227" }}>CRIT: {v.critical}</span>
              <div style={{ flex: 1, height: 2.5, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${(v.score/10)*100}%`, height: "100%", background: `linear-gradient(90deg,${v.col}66,${v.col})`, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 5.5, fontFamily: "monospace", fontWeight: 700, color: v.col }}>CVSS {v.score}</span>
              <span style={{ fontSize: 5, fontFamily: "monospace", padding: "1px 3px", borderRadius: 2,
                background: `${v.col}12`, color: v.col, border: `1px solid ${v.col}22`, whiteSpace: "nowrap" }}>{v.status}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RadarPanel() {
  const cv = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width = 280; c.height = 280;
    const cx = 140, cy = 140, R = 120;
    let sweep = 0, t = 0;
    const blips: { ang: number; dist: number; col: string; alpha: number; id: string; type: string; threat: string }[] = RADAR_CONTACTS.map(rc => ({
      ang: (rc.ang * Math.PI) / 180, dist: rc.dist, col: rc.col, alpha: 0, id: rc.id, type: rc.type, threat: rc.threat,
    }));
    const draw = () => {
      t += 0.018; sweep = (sweep + 0.022) % (Math.PI * 2);
      ctx.clearRect(0, 0, 280, 280);
      ctx.fillStyle = "#020808"; ctx.fillRect(0, 0, 280, 280);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      bg.addColorStop(0, "rgba(0,229,255,0.06)"); bg.addColorStop(1, "rgba(0,229,255,0.01)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
      [1, 0.75, 0.5, 0.25].forEach(f => {
        ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${0.06 + f * 0.04})`; ctx.lineWidth = 0.7; ctx.stroke();
      });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.strokeStyle = "rgba(0,229,255,0.07)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      const sweepGrad = ctx.createConicalGradient ? null : null;
      ctx.save();
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
      grad.addColorStop(0, "rgba(0,229,255,0.0)"); grad.addColorStop(1, "rgba(0,229,255,0.35)");
      for (let a = sweep - 0.9; a < sweep; a += 0.04) {
        const fadeA = (a - (sweep - 0.9)) / 0.9;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a, a + 0.04);
        ctx.closePath();
        ctx.fillStyle = `rgba(0,229,255,${fadeA * 0.18})`; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
      ctx.strokeStyle = "rgba(0,229,255,0.9)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      blips.forEach(b => {
        const diff = Math.abs(((sweep - b.ang) + Math.PI * 4) % (Math.PI * 2));
        if (diff < 0.1) b.alpha = 1;
        else b.alpha = Math.max(0, b.alpha - 0.003);
        if (b.alpha > 0) {
          const bx = cx + Math.cos(b.ang) * R * b.dist;
          const by = cy + Math.sin(b.ang) * R * b.dist;
          const glow = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
          glow.addColorStop(0, b.col + Math.floor(b.alpha * 200).toString(16).padStart(2, "0"));
          glow.addColorStop(1, b.col + "00");
          ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
          ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = b.col; ctx.fill();
          ctx.font = "bold 6.5px monospace"; ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.75})`;
          ctx.fillText(`${b.type}`, bx + 5, by - 4);
        }
      });
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = "#00e5ff"; ctx.fill();
      ctx.font = "7px monospace"; ctx.fillStyle = "rgba(0,229,255,0.4)";
      ctx.fillText("N", cx - 3, cy - R - 4); ctx.fillText("S", cx - 2, cy + R + 12);
      ctx.fillText("E", cx + R + 4, cy + 3); ctx.fillText("W", cx - R - 12, cy + 3);
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, []);
  const critCount = RADAR_CONTACTS.filter(r => r.threat === "CRIT").length;
  const highCount = RADAR_CONTACTS.filter(r => r.threat === "HIGH").length;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(226,18,39,0.55)", fontWeight: 700 }}>
        ▶ THREAT RADAR — {RADAR_CONTACTS.length} CONTACTS
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <canvas ref={cv} style={{ display: "block", width: 200, height: 200 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginTop: 6 }}>
        {[{ label: "CRITICAL", val: critCount, col: "#e21227" }, { label: "HIGH", val: highCount, col: "#fbbf24" }, { label: "TOTAL", val: RADAR_CONTACTS.length, col: "#00e5ff" }].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "4px 2px", borderRadius: 4, background: `${s.col}08`, border: `1px solid ${s.col}20` }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: s.col }}>{s.val}</div>
            <div style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
        {RADAR_CONTACTS.slice(0, 5).map((rc, i) => (
          <motion.div key={rc.id} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 4px", borderRadius: 3, background: `${rc.col}08`, border: `1px solid ${rc.col}15` }}>
            <motion.div style={{ width: 4, height: 4, borderRadius: "50%", background: rc.col, flexShrink: 0 }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
            <span style={{ fontSize: 5.5, fontFamily: "monospace", color: rc.col, fontWeight: 700, width: 40, flexShrink: 0 }}>{rc.id}</span>
            <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{rc.type}</span>
            <span style={{ fontSize: 5, fontFamily: "monospace", color: rc.col, marginLeft: "auto" }}>{rc.threat}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CryptoPanel() {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(167,139,250,0.55)", fontWeight: 700 }}>
        ▶ QUANTUM CRYPTO SUITE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {CRYPTO_STATUS.map((c, i) => (
          <motion.div key={c.algo} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", borderRadius: 4, background: `${c.col}06`, border: `1px solid ${c.col}15` }}>
            <motion.div style={{ width: 5, height: 5, borderRadius: "50%", background: c.col, boxShadow: `0 0 6px ${c.col}`, flexShrink: 0 }}
              animate={c.status === "ACTIVE" ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.4 }} transition={{ duration: 1.4, repeat: Infinity }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 6.5, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.algo}</div>
              <div style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>{c.type} · {c.bits}b</div>
            </div>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
              <motion.div style={{ height: "100%", background: `linear-gradient(90deg,${c.col}55,${c.col})`, borderRadius: 2 }}
                initial={{ width: 0 }} animate={{ width: `${c.strength}%` }} transition={{ delay: i * 0.07 + 0.3, duration: 0.8 }} />
            </div>
            <span style={{ fontSize: 5, fontFamily: "monospace", fontWeight: 700, padding: "1px 3px", borderRadius: 2, background: `${c.col}18`, color: c.col, flexShrink: 0 }}>{c.status}</span>
          </motion.div>
        ))}
      </div>
      <div style={{ marginTop: 8, padding: "5px 8px", borderRadius: 6, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
        <div style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(167,139,250,0.7)", marginBottom: 3 }}>QUANTUM COHERENCE</div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div style={{ height: "100%", background: "linear-gradient(90deg,#a78bfa,#00e5ff,#a78bfa)", borderRadius: 2 }}
            animate={{ width: ["97%", "99.99%", "97%"] }} transition={{ duration: 3.5, repeat: Infinity }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>4096-bit lattice</span>
          <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "#a78bfa" }}>99.99%</span>
        </div>
      </div>
    </div>
  );
}

function IntelFeedPanel() {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 6.5, fontFamily: "monospace", letterSpacing: "0.3em", marginBottom: 8, color: "rgba(226,18,39,0.5)", fontWeight: 700 }}>
        ▶ THREAT INTELLIGENCE FEED
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {INTEL_FEED.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
            style={{ display: "flex", gap: 5, alignItems: "flex-start", padding: "3px 5px", borderRadius: 4,
              background: `${item.col}06`, border: `1px solid ${item.col}18` }}>
            <span style={{ fontSize: 5.5, fontFamily: "monospace", fontWeight: 700, padding: "1px 3px", borderRadius: 2,
              background: `${item.col}22`, color: item.col, flexShrink: 0, letterSpacing: "0.05em" }}>{item.sev}</span>
            <span style={{ fontSize: 5.5, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>[{item.src}]</span>
            <span style={{ fontSize: 6, fontFamily: "monospace", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{item.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function QuickLaunchPanel({ onSelect }: { onSelect: (path: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
        width: "min(960px, 96vw)", zIndex: 30,
        background: "rgba(0,0,0,0.95)", backdropFilter: "blur(32px)",
        border: "1px solid rgba(226,18,39,0.4)", borderRadius: 24, padding: "24px 28px",
        boxShadow: "0 0 100px rgba(226,18,39,0.2), 0 24px 72px rgba(0,0,0,0.85)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <motion.div animate={{ opacity: [1, .3, 1] }} transition={{ duration: .65, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 14px #e21227" }} />
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(226,18,39,0.85)", letterSpacing: "0.35em", fontWeight: 700 }}>
          MISSION CONTROL v3 — SELECT OPERATION
        </span>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg,rgba(226,18,39,0.3),transparent)" }} />
        <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>انقر للدخول</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {QUICK_LAUNCH.map((item, i) => (
          <motion.button key={item.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.045 }}
            onClick={() => onSelect(item.path)}
            style={{
              padding: "12px 10px", borderRadius: 12, background: `${item.col}0e`,
              border: `1px solid ${item.col}28`, cursor: "pointer", transition: "all 0.22s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background=`${item.col}22`; el.style.borderColor=`${item.col}60`; el.style.transform="translateY(-3px) scale(1.02)"; el.style.boxShadow=`0 8px 24px ${item.col}28`; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background=`${item.col}0e`; el.style.borderColor=`${item.col}28`; el.style.transform="none"; el.style.boxShadow="none"; }}
          >
            <span style={{ fontSize: 20 }}>{item.emoji}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: item.col, fontFamily: "monospace", letterSpacing: "0.08em" }}>{item.label}</span>
            <span style={{ fontSize: 7.5, color: "rgba(255,255,255,0.28)", fontFamily: "monospace" }}>{item.sub}</span>
          </motion.button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {[["ESC","تخطي"],["ENTER","دخول"],["F12","GodMode"],["?","مساعدة"],["F5","تحديث"],["F1","OSINT"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 7, fontFamily: "monospace", padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.38)" }}>{k}</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>{v}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN BOOTSCREEN
════════════════════════════════════════════════════════════ */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [, navigate]    = useLocation();
  const [show,          setShow]          = useState(true);
  const [lines,         setLines]         = useState<{ text: string; col: string }[]>([]);
  const [progress,      setProgress]      = useState(0);
  const [modIdx,        setModIdx]        = useState(0);
  const [phase,         setPhase]         = useState<"boot"|"scan"|"modules"|"done">("boot");
  const [subsysReady,   setSubsysReady]   = useState<boolean[]>(Array(SUBSYSTEMS.length).fill(false));
  const [threatIdx,     setThreatIdx]     = useState(0);
  const [showLaunch,    setShowLaunch]    = useState(false);
  const [rightTab,      setRightTab]      = useState<"log"|"nodes"|"bench"|"swarm"|"intel">("log");
  const [scanDone,      setScanDone]      = useState(false);
  const [sessionSec,    setSessionSec]    = useState(0);
  const [threatCount,   setThreatCount]   = useState(0);
  const [pktCount,      setPktCount]      = useState(0);
  const [cpuTemp,       setCpuTemp]       = useState(68);
  const [gpuTemp,       setGpuTemp]       = useState(72);
  const [operatorId]    = useState(() => { const h = () => Math.floor(Math.random()*0xffff).toString(16).padStart(4,"0").toUpperCase(); return `OPR-${h()}-${h()}-${h()}`; });
  const [clearance]     = useState(() => ["ALPHA","BRAVO","CHARLIE","DELTA","OMEGA"][Math.floor(Math.random()*5)]);
  const [missionCode]   = useState(() => `OP-${Math.floor(Math.random()*9000+1000)}-SHADOW`);

  const dismiss = useCallback((path?: string) => {
    setShow(false);
    setTimeout(() => { onDone(); if (path && path !== "/app") navigate(path); }, 500);
  }, [onDone, navigate]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LOG.forEach(({ ms, text, col }) => {
      timers.push(setTimeout(() => {
        setLines(l => [...l, { text, col }]);
        setProgress(p => Math.min(100, p + Math.round(100 / BOOT_LOG.length)));
      }, ms));
    });
    SUBSYSTEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setSubsysReady(prev => { const n=[...prev]; n[i]=true; return n; }), SUBSYSTEMS[i].delay));
    });
    timers.push(setTimeout(() => setPhase("scan"), 2750));
    timers.push(setTimeout(() => setScanDone(true), 3100));
    timers.push(setTimeout(() => setPhase("modules"), 3200));
    MODULES_FLASH.forEach((_, i) => { timers.push(setTimeout(() => setModIdx(i+1), 3250+i*45)); });
    const doneAt = 3250 + MODULES_FLASH.length * 45;
    timers.push(setTimeout(() => { setPhase("done"); setShowLaunch(true); }, doneAt));
    timers.push(setTimeout(() => dismiss(), doneAt + 4000));

    const tickers = [
      setInterval(() => setThreatIdx(i => (i+1)%THREAT_EVENTS.length), 750),
      setInterval(() => setSessionSec(s => s+1), 1000),
      setInterval(() => setThreatCount(c => c+Math.floor(Math.random()*4)), 1100),
      setInterval(() => setPktCount(c => c+Math.floor(Math.random()*12000+5000)), 800),
      setInterval(() => setCpuTemp(t => Math.max(55, Math.min(92, t+(Math.random()-.45)*3))), 2000),
      setInterval(() => setGpuTemp(t => Math.max(60, Math.min(96, t+(Math.random()-.45)*2.5))), 2200),
    ];
    return () => { timers.forEach(clearTimeout); tickers.forEach(clearInterval); };
  }, [dismiss]);

  const fmtTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const fmtPkt  = (n: number) => n >= 1e9 ? `${(n/1e9).toFixed(1)}G` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : `${(n/1e3).toFixed(0)}K`;

  const tabs = [
    { id: "log",     label: "LOG"    },
    { id: "nodes",   label: "NET"    },
    { id: "bench",   label: "BENCH"  },
    { id: "swarm",   label: "SWARM"  },
    { id: "intel",   label: "INTEL"  },
    { id: "radar",   label: "RADAR"  },
    { id: "crypto",  label: "CRYPTO" },
    { id: "mission",  label: "OPS"    },
    { id: "vuln",     label: "VULN"   },
    { id: "net-topo", label: "TOPO"   },
    { id: "zero",     label: "0-DAY"  },
    { id: "siem",     label: "SIEM"   },
  ] as const;

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[99999] flex flex-col overflow-hidden"
          style={{ background: "#000" }}
          exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.5, ease: [0.4,0,.2,1] }}
          onClick={() => !showLaunch && dismiss()}>

          <CornerHUD pos="tl"/><CornerHUD pos="tr"/>
          <CornerHUD pos="bl"/><CornerHUD pos="br"/>

          {/* Grid backgrounds */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"linear-gradient(rgba(226,18,39,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(226,18,39,0.03) 1px,transparent 1px)", backgroundSize:"56px 56px" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"linear-gradient(45deg,rgba(0,229,255,0.01) 1px,transparent 1px)", backgroundSize:"84px 84px" }} />
          <motion.div className="absolute inset-x-0 h-px pointer-events-none" style={{ background:"linear-gradient(90deg,transparent,rgba(0,229,255,0.18),transparent)", zIndex: 5 }}
            animate={{ top:["0%","100%"] }} transition={{ duration:7, repeat:Infinity, ease:"linear" }} />

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-2 z-10 flex-shrink-0"
            style={{ borderBottom:"1px solid rgba(226,18,39,0.12)", background:"rgba(0,0,0,0.75)" }}>
            <div className="flex items-center gap-3">
              <motion.div animate={{ opacity:[1,.2,1] }} transition={{ duration:.65,repeat:Infinity }}
                style={{ width:7,height:7,borderRadius:"50%",background:"#e21227",boxShadow:"0 0 12px #e21227" }} />
              <span className="font-mono text-[8.5px] tracking-[0.28em]" style={{ color:"rgba(226,18,39,0.85)" }}>
                KALIGPT QNEV6 · {missionCode} · AUTHORIZED
              </span>
              {["SECURE","QUANTUM","TOR"].map(b => (
                <span key={b} className="font-mono text-[7px] px-1.5 py-0.5 rounded"
                  style={{ color:b==="TOR"?"#a78bfa":b==="QUANTUM"?"#a78bfa":"#22c55e", border:`1px solid ${b==="TOR"?"rgba(167,139,250,0.3)":b==="QUANTUM"?"rgba(167,139,250,0.3)":"rgba(34,197,94,0.3)"}`, background:`${b==="TOR"?"rgba(167,139,250,0.07)":b==="QUANTUM"?"rgba(167,139,250,0.07)":"rgba(34,197,94,0.07)"}` }}>{b}</span>
              ))}
            </div>
            <div className="flex items-center gap-5">
              <span className="font-mono text-[7px]" style={{ color:"rgba(226,18,39,0.65)" }}>
                THREATS: <motion.span animate={{ opacity:[1,.4,1] }} transition={{ duration:.5,repeat:Infinity }} style={{ color:"#e21227",fontWeight:700 }}>{threatCount}</motion.span>
              </span>
              <span className="font-mono text-[7px]" style={{ color:"rgba(0,229,255,0.5)" }}>PKT: {fmtPkt(pktCount)}/s</span>
              <span className="font-mono text-[7.5px]" style={{ color:"rgba(0,229,255,0.5)" }}>SESSION: {fmtTime(sessionSec)}</span>
              <span className="font-mono text-[7.5px]" style={{ color:"rgba(255,255,255,0.28)" }}>{new Date().toISOString().replace("T"," ").slice(0,19)} UTC</span>
              <span className="font-mono text-[7px] px-2 py-0.5 rounded" style={{ color:"#fbbf24",border:"1px solid rgba(251,191,36,0.3)",background:"rgba(251,191,36,0.07)" }}>THREAT: CRITICAL</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 overflow-hidden relative">
            <AnimatePresence>
              {showLaunch && <QuickLaunchPanel onSelect={p => dismiss(p)} />}
            </AnimatePresence>

            {/* Left panel */}
            <div className="flex-1 flex flex-col items-center justify-center relative px-4 gap-2">
              <motion.div className="absolute inset-x-0 h-px pointer-events-none z-10"
                style={{ background:"linear-gradient(90deg,transparent,rgba(226,18,39,0.7),rgba(0,229,255,0.35),rgba(226,18,39,0.7),transparent)" }}
                animate={{ top:["0%","100%","0%"] }} transition={{ duration:3, repeat:Infinity, ease:"linear" }} />

              <motion.div initial={{ scale:.45,opacity:0 }} animate={{ scale:1,opacity:1 }} transition={{ duration:.8,ease:[.16,1,.3,1] }}>
                <SphereCanvas />
              </motion.div>

              <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ delay:.2 }} className="text-center">
                <div className="text-5xl font-black tracking-widest mb-1">
                  <motion.span style={{ color:"#e21227" }}
                    animate={{ textShadow:["0 0 8px #e21227","0 0 44px #e21227, 0 0 88px #e21227aa","0 0 8px #e21227"] }}
                    transition={{ duration:1.7,repeat:Infinity }}>KALI</motion.span>
                  <span className="text-white">GPT</span>
                </div>
                <div className="font-mono tracking-[0.35em] text-[7.5px] uppercase" style={{ color:"rgba(255,255,255,0.2)" }}>
                  AUTONOMOUS CYBER AI · v6.0 · ARSENAL MODE ULTRA PRO
                </div>
              </motion.div>

              {/* Progress */}
              <div className="w-64">
                <div className="flex justify-between mb-1">
                  <span className="font-mono text-[7.5px]" style={{ color:"rgba(255,255,255,0.22)" }}>SYSTEM INIT [{progress}/100]</span>
                  <span className="font-mono text-[7.5px]" style={{ color:"#e21227" }}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background:"rgba(255,255,255,0.04)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background:"linear-gradient(90deg,#e21227,#ff6b6b,#a78bfa,#00e5ff,#22c55e,#fbbf24)" }}
                    animate={{ width:`${progress}%` }} transition={{ duration:.1 }} />
                  <motion.div className="absolute inset-0 rounded-full"
                    style={{ background:"linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.28) 50%,transparent 80%)", backgroundSize:"200% 100%" }}
                    animate={{ backgroundPosition:["-200% 0","200% 0"] }} transition={{ duration:1.1,repeat:Infinity }} />
                </div>
              </div>

              {/* Metrics */}
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.7 }} className="w-64 space-y-1.5">
                {SYS_METRICS.map((m,i) => <MetricBar key={m.label} label={m.label} pct={m.pct} col={m.col} delay={i*100} />)}
              </motion.div>

              {/* Waveforms */}
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.1 }} className="flex items-center gap-2">
                <span className="font-mono text-[6.5px]" style={{ color:"rgba(226,18,39,0.45)" }}>NEURAL</span>
                <WaveformBar color="#e21227" bars={18}/>
                <WaveformBar bars={14}/>
                <span className="font-mono text-[6.5px]" style={{ color:"rgba(0,255,65,0.45)" }}>LIVE</span>
              </motion.div>

              {/* Phase status */}
              <AnimatePresence mode="wait">
                {phase==="scan" && (
                  <motion.div key="scan" initial={{ opacity:0,y:5 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-5 }}
                    className="font-mono text-[8.5px] font-bold tracking-widest" style={{ color:"#00e5ff" }}>
                    ⬡ SCANNING OPERATOR — BIOMETRIC + DNA + VOICE…
                  </motion.div>
                )}
                {phase==="modules" && modIdx<MODULES_FLASH.length && (
                  <motion.div key={`mod-${modIdx}`} initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-4 }}
                    transition={{ duration:.04 }} className="font-mono text-[8.5px] font-black tracking-widest" style={{ color:"#00e5ff" }}>
                    ⟳ LOADING: {MODULES_FLASH[modIdx]??""} [{modIdx}/{MODULES_FLASH.length}]
                  </motion.div>
                )}
                {phase==="done" && (
                  <motion.div initial={{ opacity:0,scale:.8 }} animate={{ opacity:1,scale:1 }}
                    className="font-mono text-[9.5px] font-black tracking-widest" style={{ color:"#22c55e",textShadow:"0 0 20px #22c55e" }}>
                    ✓ ALL 180 SYSTEMS ONLINE — OPERATOR CLEARED
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="font-mono text-[7px]" style={{ color:"rgba(255,255,255,0.1)" }}>
                {showLaunch?"اختر عملية من لوحة التحكم":"انقر في أي مكان للتخطي"}
              </div>
            </div>

            {/* Middle panel */}
            <div className="w-58 flex flex-col justify-center items-center gap-2.5 py-4"
              style={{ borderLeft:"1px solid rgba(0,229,255,0.08)",borderRight:"1px solid rgba(0,229,255,0.08)",width:224 }}>
              <div className="font-mono text-[6.5px] tracking-[0.3em] uppercase font-bold" style={{ color:"rgba(0,229,255,0.4)" }}>
                ▶ OPERATOR CLEARANCE
              </div>
              <BiometricScanner active={phase==="scan"||phase==="boot"} />
              <AnimatePresence mode="wait">
                {!scanDone ? (
                  <motion.div key="sc" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="text-center">
                    <div className="font-mono text-[7.5px] mb-0.5" style={{ color:"rgba(0,229,255,0.55)" }}>SCANNING…</div>
                    <div className="font-mono text-[6.5px]" style={{ color:"rgba(255,255,255,0.18)" }}>BIOMETRIC + DNA + VOICE</div>
                  </motion.div>
                ) : (
                  <motion.div key="id" initial={{ opacity:0,y:5 }} animate={{ opacity:1,y:0 }} className="text-center space-y-0.5">
                    <div className="font-mono text-[6.5px]" style={{ color:"#22c55e" }}>✓ OPERATOR VERIFIED</div>
                    <div className="font-mono text-[7.5px] font-bold" style={{ color:"#00e5ff" }}>{operatorId}</div>
                    <div className="font-mono text-[6px]" style={{ color:"rgba(34,197,94,0.55)" }}>CLEARANCE: {clearance}</div>
                    <div className="font-mono text-[6px]" style={{ color:"rgba(251,191,36,0.55)" }}>ROLE: RED TEAM LEAD</div>
                    <div className="font-mono text-[6px]" style={{ color:"rgba(167,139,250,0.55)" }}>DNA: 0xDEAD9F3A ✓</div>
                    <div className="font-mono text-[6px]" style={{ color:"rgba(0,229,255,0.55)" }}>VOICE: 99.4% ✓</div>
                    <div className="font-mono text-[6px]" style={{ color:"rgba(255,255,255,0.3)" }}>{missionCode}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subsystem badges */}
              <div className="w-full px-3 mt-1 overflow-hidden" style={{ maxHeight: 220 }}>
                <div className="font-mono text-[6px] tracking-[0.25em] uppercase mb-1.5" style={{ color:"rgba(255,255,255,0.18)" }}>
                  SUBSYSTEMS [{SUBSYSTEMS.filter((_,i)=>subsysReady[i]).length}/{SUBSYSTEMS.length}]
                </div>
                <div className="space-y-0.5">
                  {SUBSYSTEMS.map((sys,i) => (
                    <motion.div key={sys.label} initial={{ opacity:0,x:-5 }}
                      animate={{ opacity:subsysReady[i]?1:.2,x:0 }}
                      transition={{ delay:sys.delay/1000,duration:.2 }}
                      className="flex items-center justify-between">
                      <span className="font-mono text-[6px]" style={{ color:subsysReady[i]?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.15)" }}>{sys.label}</span>
                      <span className="font-mono text-[5.5px] font-bold px-1 py-0.5 rounded"
                        style={{ color:sys.col,background:`${sys.col}12`,border:`1px solid ${sys.col}28` }}>
                        {subsysReady[i]?sys.status:"…"}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Threat feed */}
              <div className="w-full px-3 mt-1">
                <div className="font-mono text-[6px] tracking-[0.25em] uppercase mb-1" style={{ color:"rgba(167,139,250,0.35)" }}>LIVE THREAT</div>
                <AnimatePresence mode="wait">
                  <motion.div key={threatIdx} initial={{ opacity:0,y:4 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-4 }} transition={{ duration:.18 }}
                    className="font-mono text-[6.5px] leading-snug" style={{ color:"rgba(167,139,250,0.7)" }}>
                    ⚡ {THREAT_EVENTS[threatIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-80 flex flex-col py-4 px-4 font-mono overflow-hidden"
              style={{ borderLeft:"1px solid rgba(226,18,39,0.1)",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(18px)" }}>

              {/* Tabs */}
              <div className="flex gap-1 mb-3 flex-wrap">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                    padding:"3px 8px",borderRadius:6,fontSize:5.8,fontFamily:"monospace",fontWeight:700,letterSpacing:"0.16em",
                    cursor:"pointer",transition:"all 0.2s",textTransform:"uppercase",
                    background:rightTab===tab.id?"rgba(226,18,39,0.15)":"rgba(255,255,255,0.03)",
                    color:rightTab===tab.id?"#e21227":"rgba(255,255,255,0.25)",
                    border:`1px solid ${rightTab===tab.id?"rgba(226,18,39,0.35)":"rgba(255,255,255,0.06)"}`,
                  }}>{tab.label}</button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {rightTab==="log" && (
                  <motion.div key="log" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col flex-1 overflow-hidden">
                    <div className="text-[6.5px] tracking-[0.3em] uppercase mb-2 font-bold" style={{ color:"rgba(226,18,39,0.5)" }}>
                      ▶ BOOT LOG [{lines.length}/{BOOT_LOG.length}]
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      {lines.map((ln,i) => (
                        <motion.div key={i} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ duration:.07 }}
                          className="text-[7.5px] leading-snug" style={{ color:ln.col,textShadow:`0 0 5px ${ln.col}44` }}>
                          {ln.text}
                        </motion.div>
                      ))}
                      <motion.div animate={{ opacity:[1,0,1] }} transition={{ duration:.55,repeat:Infinity }} className="text-[8.5px]" style={{ color:"#00ff41" }}>_</motion.div>
                    </div>
                  </motion.div>
                )}
                {rightTab==="nodes" && (
                  <motion.div key="nodes" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <NetworkMap />
                  </motion.div>
                )}
                {rightTab==="bench" && (
                  <motion.div key="bench" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <AIBenchmarkPanel />
                  </motion.div>
                )}
                {rightTab==="swarm" && (
                  <motion.div key="swarm" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <SwarmAgentPanel />
                  </motion.div>
                )}
                {rightTab==="intel" && (
                  <motion.div key="intel" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <IntelFeedPanel />
                  </motion.div>
                )}
                {rightTab==="radar" && (
                  <motion.div key="radar" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <RadarPanel />
                  </motion.div>
                )}
                {rightTab==="crypto" && (
                  <motion.div key="crypto" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <CryptoPanel />
                  </motion.div>
                )}
                {rightTab==="mission" && (
                  <motion.div key="mission" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <MissionPanel />
                  </motion.div>
                )}
                {rightTab==="vuln" && (
                  <motion.div key="vuln" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <VulnScanPanel />
                  </motion.div>
                )}
                {rightTab==="net-topo" && (
                  <motion.div key="net-topo" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <NetworkTopologyPanel />
                  </motion.div>
                )}
                {rightTab==="zero" && (
                  <motion.div key="zero" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <ZeroDayPanel />
                  </motion.div>
                )}
                {rightTab==="siem" && (
                  <motion.div key="siem" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                    <SIEMPanel />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Module chips */}
              {phase!=="boot" && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
                  className="mt-3 pt-3" style={{ borderTop:"1px solid rgba(226,18,39,0.1)" }}>
                  <div className="text-[6px] tracking-[0.25em] uppercase mb-2" style={{ color:"rgba(226,18,39,0.35)" }}>
                    ARSENAL [{modIdx}/{MODULES_FLASH.length}]
                  </div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:3 }}>
                    {MODULES_FLASH.slice(0,modIdx).map((mod,i) => (
                      <motion.span key={mod} initial={{ opacity:0,scale:.7 }} animate={{ opacity:1,scale:1 }} transition={{ duration:.09 }}
                        style={{
                          fontSize:5.5,fontFamily:"monospace",padding:"1.5px 4px",borderRadius:3,fontWeight:700,
                          background:i%4===0?"rgba(226,18,39,0.1)":i%4===1?"rgba(0,229,255,0.08)":i%4===2?"rgba(167,139,250,0.1)":"rgba(34,197,94,0.08)",
                          color:i%4===0?"rgba(226,18,39,0.75)":i%4===1?"rgba(0,229,255,0.75)":i%4===2?"rgba(167,139,250,0.75)":"rgba(34,197,94,0.75)",
                          border:`1px solid ${i%4===0?"rgba(226,18,39,0.22)":i%4===1?"rgba(0,229,255,0.16)":i%4===2?"rgba(167,139,250,0.22)":"rgba(34,197,94,0.16)"}`,
                        }}>{mod}</motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 z-10"
            style={{ borderTop:"1px solid rgba(226,18,39,0.1)",background:"rgba(0,0,0,0.75)" }}>
            <div className="flex items-center gap-5">
              {[
                { label:"CPU TEMP", val:`${Math.round(cpuTemp)}°C`, col:cpuTemp>85?"#e21227":cpuTemp>75?"#fbbf24":"#22c55e" },
                { label:"GPU TEMP", val:`${Math.round(gpuTemp)}°C`, col:gpuTemp>90?"#e21227":gpuTemp>80?"#fbbf24":"#22c55e" },
                { label:"LATENCY",  val:"1ms",                      col:"#00e5ff" },
                { label:"PKT/S",    val:fmtPkt(pktCount),           col:"#22c55e" },
                { label:"NODES",    val:"24/24",                    col:"#a78bfa" },
                { label:"AGENTS",   val:"32/32",                    col:"#f97316" },
              ].map(({ label,val,col }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="font-mono text-[6.5px]" style={{ color:"rgba(255,255,255,0.2)" }}>{label}:</span>
                  <span className="font-mono text-[6.5px] font-bold" style={{ color:col }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <motion.span animate={{ opacity:[1,.3,1] }} transition={{ duration:.9,repeat:Infinity }}
                className="font-mono text-[6.5px]" style={{ color:"#22c55e" }}>● LIVE</motion.span>
              <span className="font-mono text-[6.5px]" style={{ color:"rgba(255,255,255,0.15)" }}>
                KaliGPT v6.0 · Arsenal Ultra · {SUBSYSTEMS.filter((_,i)=>subsysReady[i]).length}/{SUBSYSTEMS.length} online
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
