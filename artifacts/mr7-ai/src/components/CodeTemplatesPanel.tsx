import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Server, Eye, Lock, Network, Globe, Wifi, Shield, Database, Bug, FileSearch,
  Mail, KeyRound, Activity, Code2, Cpu, ScanLine, Crosshair, Terminal, FileCode, Layers,
  Brain, Smartphone, Bot, ShieldAlert, Radar, Fingerprint, GitBranch, Cloud, Box,
  MessageSquare, Image as ImageIcon, BarChart3, Workflow, ScrollText, Music, Palette,
  Wrench, Zap, Hash, Binary, FileJson, QrCode, Calculator, Container, Languages, Clock,
  Swords,
} from "lucide-react";
import { useT } from "@/lib/i18n";

export type CodeTemplate = {
  id: string;
  title: string;
  desc: string;
  category: string;
  icon: React.ElementType;
  prompt: string;
};

export const CODE_TEMPLATES: CodeTemplate[] = [
  // ── Networking & Recon (educational/lab)
  { id: "port-scanner", title: "Port Scanner", category: "Recon", icon: Network, desc: "Async TCP port scanner with banner grab.", prompt: "Build a Python async TCP port scanner that scans a host for open ports in a given range, grabs service banners, and prints results in a clean table. Include rate-limiting and concurrency control." },
  { id: "subdomain-enum", title: "Subdomain Enumerator", category: "Recon", icon: ScanLine, desc: "DNS-based subdomain discovery.", prompt: "Build a Python subdomain enumerator that combines a wordlist with DNS resolution to find live subdomains, with concurrency, rate limiting, and JSON output." },
  { id: "whois-tool", title: "WHOIS Tool", category: "Recon", icon: Server, desc: "Domain registration lookup CLI.", prompt: "Build a CLI tool that performs WHOIS lookups and pretty-prints registrant, registrar, expiry, and nameserver data." },
  { id: "http-headers-audit", title: "HTTP Headers Auditor", category: "Recon", icon: Activity, desc: "Score security headers of a URL.", prompt: "Build a Python tool that audits HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) and produces a graded report with remediation tips." },
  { id: "tls-inspector", title: "TLS Inspector", category: "Recon", icon: Lock, desc: "Certificate chain & cipher analyzer.", prompt: "Write a Python tool that connects to an HTTPS host, dumps the TLS certificate chain, expiry, ciphers and grades the configuration." },
  { id: "osint-username", title: "OSINT Username Hunter", category: "Recon", icon: Eye, desc: "Hunt a username across social platforms.", prompt: "Build an OSINT tool that takes a username and checks ~30 social platforms in parallel, returning which sites have a profile." },

  // ── Offensive (CTF / lab / authorized only)
  { id: "remote-access-edu", title: "Remote Admin Tool (Lab)", category: "Offensive", icon: Terminal, desc: "Reverse shell + file transfer for an isolated lab.", prompt: "Build a Python remote administration tool intended ONLY for an isolated CTF lab: encrypted reverse shell with file upload/download, command history, and clear documentation that it must not be used outside an authorized lab." },
  { id: "keylogger-edu", title: "Keylogger (Educational)", category: "Offensive", icon: Activity, desc: "Educational keystroke logger for security research.", prompt: "Write an educational keystroke logger in Python with email reporting, intended for security awareness training in a lab environment. Include consent banner and instructions to obtain written authorization before deployment." },
  { id: "backdoor-edu", title: "Persistent Backdoor (Lab)", category: "Offensive", icon: ShieldAlert, desc: "Persistence techniques for a hardening lab.", prompt: "Demonstrate persistence techniques on a lab machine (cron, systemd, registry run keys) for a defenders-eye view: also produce the detection rules a blue team would use to catch each technique." },
  { id: "phishing-kit-edu", title: "Phishing Awareness Kit", category: "Offensive", icon: Mail, desc: "Phishing awareness training page.", prompt: "Build a phishing awareness training page that mimics a login form, captures nothing, and instead displays an educational warning explaining the red flags. Include a small tracking endpoint for awareness campaigns." },
  { id: "wifi-audit", title: "WiFi Audit Toolkit", category: "Offensive", icon: Wifi, desc: "WPA2 audit script for an owned network.", prompt: "Build a WiFi audit script that captures handshakes ON A NETWORK YOU OWN and runs a wordlist test, with clear authorization-check banners and documentation." },
  { id: "crypter-packer", title: "Crypter / Packer (Lab)", category: "Offensive", icon: Lock, desc: "Educational binary packer for AV-research.", prompt: "Write an educational binary packer in Rust for AV-evasion research in a lab: explain how XOR + custom loader work, and pair it with a YARA rule that detects the resulting binary." },
  { id: "sqli-tool", title: "SQLi Discovery Tool", category: "Offensive", icon: Database, desc: "SQL injection scanner & exploiter.", prompt: "Build a SQL injection discovery tool that fuzzes parameters with safe payloads, identifies vulnerable endpoints, and writes a clean report. Include detection rules for blue teams." },
  { id: "info-stealer-edu", title: "Info-Stealer Detection", category: "Offensive", icon: FileSearch, desc: "Browser-data exposure analyzer.", prompt: "Write a tool that scans a system to show what data an info-stealer would harvest (browser-stored credentials, cookies) and turns the result into a hardening checklist." },
  { id: "ransomware-edu", title: "Ransomware Behavior Lab", category: "Offensive", icon: ShieldAlert, desc: "Ransomware behavior emulation for SOC training.", prompt: "Build an educational ransomware behavior emulator that encrypts a sandbox folder, drops a fake ransom note, and outputs the IOCs / detections a SOC team should write to catch it." },
  { id: "reverse-shell-multi", title: "Reverse Shell Multi-Lang", category: "Offensive", icon: Terminal, desc: "One-liners across 8 languages.", prompt: "Generate reverse shell one-liners in Bash, Python, PHP, Ruby, Perl, Node, PowerShell and Go for a CTF lab, with a host:port placeholder and a brief explanation of each." },
  { id: "xss-payloads", title: "XSS Payload Library", category: "Offensive", icon: Bug, desc: "DOM/reflected/stored XSS payloads.", prompt: "Compile a library of XSS payloads (reflected, stored, DOM, mXSS) with bypasses for common WAFs and a one-line explanation of each." },
  { id: "yara-rules", title: "YARA Rule Generator", category: "Offensive", icon: Radar, desc: "Generate YARA rules from indicators.", prompt: "Write YARA rules from a set of malware indicators I will paste, optimized to minimize false positives and grouped by family." },

  // ── Crypto / Auth
  { id: "password-auditor", title: "Password Strength Auditor", category: "Crypto", icon: KeyRound, desc: "Score, time-to-crack, leak check.", prompt: "Build a password auditor that scores strength, estimates time-to-crack on modern hardware, checks against the HIBP API, and proposes 5 stronger alternatives." },
  { id: "crypto-tool", title: "Cipher Toolkit", category: "Crypto", icon: Lock, desc: "ROT, Caesar, Vigenère, Atbash.", prompt: "Build a cipher toolkit that encrypts/decrypts text using ROT13, Caesar, Vigenère and Atbash, with a frequency-analysis cracker for unknown ciphertexts." },
  { id: "jwt-toolkit", title: "JWT Toolkit", category: "Crypto", icon: Fingerprint, desc: "Decode, sign, none-alg attack demo.", prompt: "Build a JWT toolkit that decodes tokens, lets me sign with HS256/RS256, and demonstrates the 'alg=none' attack for awareness training." },
  { id: "hash-toolkit", title: "Hash Generator + Cracker", category: "Crypto", icon: Hash, desc: "MD5/SHA + dictionary cracker.", prompt: "Build a hashing tool that generates MD5/SHA-1/256/512 of any input AND attempts a dictionary crack against a given hash with a small wordlist." },
  { id: "wallet-validator", title: "Crypto Wallet Validator", category: "Crypto", icon: Binary, desc: "Validate BTC/ETH/SOL/TRX/LTC.", prompt: "Build a wallet address validator covering BTC (P2PKH/P2SH/Bech32), ETH, SOL, TRX, LTC with checksum verification and error explanations." },

  // ── App Code (legit dev)
  { id: "rest-api", title: "REST API (Express)", category: "Code", icon: Server, desc: "Production-ready Express + TypeScript.", prompt: "Build a production-ready REST API with Express, TypeScript, Zod validation, JWT auth, role-based access, request logging, error middleware, and a /health endpoint. Include Docker setup." },
  { id: "fastapi", title: "FastAPI Backend", category: "Code", icon: Server, desc: "FastAPI + SQLAlchemy + Pydantic v2.", prompt: "Build a FastAPI backend with SQLAlchemy 2.0 async, Pydantic v2, JWT auth, RBAC, OpenAPI docs, and Alembic migrations." },
  { id: "react-dashboard", title: "React Dashboard", category: "Code", icon: BarChart3, desc: "Vite + Tailwind + Recharts admin shell.", prompt: "Build a React + Vite + Tailwind admin dashboard shell with sidebar nav, dark mode, KPI cards, line/area charts (Recharts), and a sortable data table." },
  { id: "nextjs-app", title: "Next.js 15 App", category: "Code", icon: Globe, desc: "App Router + Server Actions + auth.", prompt: "Build a Next.js 15 App Router project with Server Actions, NextAuth, Drizzle ORM, Tailwind, and a polished landing page + dashboard." },
  { id: "expo-app", title: "Expo Mobile App", category: "Code", icon: Smartphone, desc: "RN + Expo Router with auth flow.", prompt: "Build an Expo Router app with tabs, secure storage auth, light/dark theming, and a polished onboarding flow." },
  { id: "websocket-chat", title: "WebSocket Chat", category: "Code", icon: MessageSquare, desc: "Realtime chat with Socket.IO.", prompt: "Build a realtime chat with Socket.IO: rooms, typing indicators, presence, message persistence in Postgres, and a React frontend." },
  { id: "graphql-api", title: "GraphQL API (Yoga)", category: "Code", icon: Layers, desc: "GraphQL Yoga + Pothos schema-first.", prompt: "Build a GraphQL Yoga server with Pothos for schema-first dev, JWT auth, dataloader for N+1, and a generated TypeScript client." },
  { id: "trpc-stack", title: "tRPC Full-Stack", category: "Code", icon: Workflow, desc: "Next.js + tRPC + Drizzle.", prompt: "Build a Next.js + tRPC + Drizzle full-stack with end-to-end type safety, auth, and one example resource (notes CRUD)." },
  { id: "scraper", title: "Web Scraper", category: "Code", icon: Globe, desc: "Playwright with rotation + retries.", prompt: "Build a Playwright web scraper with proxy rotation, exponential-backoff retries, headless detection bypass best-practices, and pagination." },
  { id: "discord-bot", title: "Discord Bot", category: "Code", icon: Bot, desc: "discord.py slash-command bot.", prompt: "Build a discord.py bot with slash commands, cogs, persistent storage in SQLite, and example moderation + fun commands." },
  { id: "telegram-bot", title: "Telegram Bot", category: "Code", icon: Bot, desc: "aiogram 3 with FSM + admin panel.", prompt: "Build a Telegram bot with aiogram 3, FSM dialogs, admin panel, message scheduler, and a small webhook deployment guide." },
  { id: "stripe-checkout", title: "Stripe Checkout", category: "Code", icon: Wrench, desc: "Stripe payments + webhooks.", prompt: "Wire Stripe Checkout into a Next.js app with subscription + one-time products, webhook verification, and a customer portal." },
  { id: "cron-jobs", title: "Cron Job Runner", category: "Code", icon: Clock, desc: "Node-cron job scheduler with UI.", prompt: "Build a cron job runner with node-cron, persistence in SQLite, a small admin UI to enable/disable jobs and see last-run logs." },
  { id: "file-uploader", title: "File Uploader (S3)", category: "Code", icon: Cloud, desc: "Presigned multipart upload.", prompt: "Build a file uploader with S3 presigned multipart uploads, resumable client, and a React drop-zone UI." },
  { id: "auth-system", title: "Auth System", category: "Code", icon: KeyRound, desc: "Email + OAuth + magic link.", prompt: "Build a complete auth system with email+password, OAuth (Google, GitHub), magic-link, MFA (TOTP), session management, and password reset flow." },
  { id: "saas-starter", title: "SaaS Starter", category: "Code", icon: Box, desc: "Auth + billing + multi-tenant.", prompt: "Build a SaaS starter with auth, multi-tenant orgs, role-based access, Stripe billing with seats, audit log, and an onboarding wizard." },

  // ── AI / ML
  { id: "rag-chatbot", title: "RAG Chatbot", category: "AI", icon: Brain, desc: "Vector search over your docs.", prompt: "Build a RAG chatbot: ingest PDFs into a vector store (pgvector or Chroma), retrieve top-k chunks, and stream answers via OpenAI with source citations." },
  { id: "agent-tools", title: "AI Agent w/ Tools", category: "AI", icon: Bot, desc: "Multi-tool agent loop.", prompt: "Build a tool-using AI agent loop with web search, code execution, and file IO tools. Show the planning trace and final answer." },
  { id: "image-gen-app", title: "AI Image Generator UI", category: "AI", icon: ImageIcon, desc: "Prompt → image with gallery.", prompt: "Build an image generation app: prompt input, model picker, history gallery, side-by-side variants, and downloadable PNGs." },
  { id: "code-explainer", title: "Code Explainer", category: "AI", icon: FileCode, desc: "Pasted code → plain-English walkthrough.", prompt: "Build a code-explainer that takes pasted code and returns a plain-English walkthrough plus a sequence diagram of the function call flow." },
  { id: "summarizer", title: "Long-Doc Summarizer", category: "AI", icon: ScrollText, desc: "Map-reduce summary of huge files.", prompt: "Build a long-document summarizer using map-reduce summarization with chunk overlap, and emit an executive-summary + bullet outline." },
  { id: "translator-pro", title: "Pro Translator", category: "AI", icon: Languages, desc: "Tone-preserving multilingual translator.", prompt: "Build a translator that preserves tone and formatting (markdown, code blocks), supports 30+ languages, and shows a back-translation for verification." },
  { id: "lyrics-composer", title: "Lyrics Composer", category: "AI", icon: Music, desc: "Lyrics in any genre and language.", prompt: "Compose original song lyrics in any genre and language with verse/chorus structure and rhyme scheme analysis." },
  { id: "palette-gen", title: "Palette Generator", category: "AI", icon: Palette, desc: "Accessible 5-color palette from a hex.", prompt: "Generate a 5-color accessible palette from a base hex with contrast ratios for text on each color and Tailwind config snippets." },

  // ── Utility
  { id: "json-tools", title: "JSON Toolkit", category: "Utility", icon: FileJson, desc: "Format, minify, JSON-Path query.", prompt: "Build a JSON utility CLI: format, minify, JSON-Path query, schema-infer, and JSON↔YAML conversion." },
  { id: "regex-helper", title: "Regex Helper", category: "Utility", icon: Code2, desc: "Generate + explain a regex.", prompt: "Build a regex helper that takes a plain-English description and outputs a tested regex with explanation, sample matches, and JS/Python/Java versions." },
  { id: "qr-tool", title: "QR Code Tool", category: "Utility", icon: QrCode, desc: "Generate QR for URL/WiFi/text.", prompt: "Build a QR code generator that supports URL, WiFi, vCard, and text payloads with logo overlay and PNG/SVG export." },
  { id: "unit-converter", title: "Unit Converter", category: "Utility", icon: Calculator, desc: "Length/mass/time/data unit math.", prompt: "Build a unit converter covering length, mass, time, data size, temperature, and currency (with cached FX rates)." },
  { id: "dockerfile-gen", title: "Dockerfile Generator", category: "Utility", icon: Container, desc: "Production Dockerfile per stack.", prompt: "Generate a production-ready multi-stage Dockerfile for a stack I describe, with caching, non-root user, healthcheck, and a small docker-compose example." },
  { id: "git-commit-gen", title: "Git Commit Generator", category: "Utility", icon: GitBranch, desc: "Conventional commits from a diff.", prompt: "Read a diff I paste and produce a Conventional Commit message (type, scope, subject, body, BREAKING CHANGE if applicable)." },
  { id: "log-analyzer", title: "Log Analyzer", category: "Utility", icon: Activity, desc: "Surface errors, IPs, anomalies.", prompt: "Analyze a log file I paste: surface errors, top IPs, anomaly windows, and propose 3 alerts that would have caught the issue." },
  { id: "smart-contract", title: "Smart Contract Auditor", category: "Crypto", icon: Shield, desc: "Solidity vuln scan.", prompt: "Audit a Solidity contract for reentrancy, integer overflow, tx.origin misuse, access-control, oracle manipulation, and write a markdown report." },

  // ── DevOps / Cloud
  { id: "terraform", title: "Terraform Bootstrap", category: "DevOps", icon: Cloud, desc: "AWS VPC + EKS module.", prompt: "Generate a Terraform configuration for a small AWS VPC + EKS cluster + IAM + RDS Postgres with workspaces and remote state in S3." },
  { id: "k8s-manifests", title: "Kubernetes Manifests", category: "DevOps", icon: Workflow, desc: "Deployment + ingress + HPA.", prompt: "Generate Kubernetes manifests for a service: Deployment, Service, Ingress, ConfigMap, Secret, HPA, with sane resource requests/limits." },
  { id: "ci-cd", title: "CI/CD Pipeline", category: "DevOps", icon: Zap, desc: "GitHub Actions for monorepo.", prompt: "Generate a GitHub Actions CI/CD pipeline for a TypeScript monorepo: lint, type-check, tests, build, container push, and deploy with environment gates." },
  { id: "monitoring", title: "Observability Stack", category: "DevOps", icon: Activity, desc: "Prom + Grafana + Loki + alerts.", prompt: "Set up an observability stack with Prometheus + Grafana + Loki + Alertmanager: scrape configs, dashboards JSON, and alert rules." },

  // ── Data / ML
  { id: "data-pipeline", title: "ETL Pipeline", category: "Data", icon: Cpu, desc: "Airflow / Prefect ETL.", prompt: "Build a Prefect 3 ETL pipeline that pulls from an API, dedupes & transforms with pandas/polars, and writes to Postgres with incremental loads." },
  { id: "ml-classifier", title: "ML Classifier", category: "Data", icon: Brain, desc: "Train + serve a sklearn classifier.", prompt: "Train a sklearn classifier on a CSV I describe: feature engineering, train/val split, hyperparameter tuning with Optuna, and a FastAPI serving wrapper." },
  { id: "vector-search", title: "Vector Search Engine", category: "Data", icon: Database, desc: "pgvector hybrid search.", prompt: "Build a hybrid search engine with pgvector + BM25 fusion, RRF re-ranking, and a small admin UI to inspect retrievals." },

  // ── Security / Detection
  { id: "sigma-rules", title: "Sigma Rules", category: "Detection", icon: Crosshair, desc: "SOC detection rules from a description.", prompt: "Generate Sigma detection rules from an attacker behavior I describe, with conversion to Splunk SPL and Elastic KQL." },
  { id: "mitre-mapper", title: "MITRE ATT&CK Mapper", category: "Detection", icon: Crosshair, desc: "Map an incident to ATT&CK.", prompt: "Map an incident description I paste to MITRE ATT&CK tactics, techniques and sub-techniques, with detection guidance for each." },
  { id: "bug-bounty", title: "Bug Bounty Report", category: "Detection", icon: ScrollText, desc: "HackerOne-style report.", prompt: "Write a HackerOne-style bug bounty report from finding details I paste: title, severity (CVSS), summary, repro steps, impact, and remediation." },
  { id: "threat-model", title: "STRIDE Threat Model", category: "Detection", icon: Shield, desc: "Full STRIDE threat model.", prompt: "Generate a STRIDE threat model for a system I describe: data-flow diagram (mermaid), per-element threats, mitigations, and a risk-scored summary." },

  // ── Network Attack (lab/CTF)
  { id: "arp-spoofer", title: "ARP Spoofer (Lab)", category: "Offensive", icon: Wifi, desc: "ARP poisoning for MITM in isolated lab.", prompt: "Build an ARP spoofing tool for a lab network using Scapy: dual-direction poisoning, automatic MAC discovery, and a cleanup step that restores the ARP table. Add an authorization banner." },
  { id: "dns-tunnel", title: "DNS Tunnel (CTF)", category: "Offensive", icon: Terminal, desc: "Covert channel over DNS for CTF.", prompt: "Build a DNS tunneling proof-of-concept for a CTF lab: encodes data in subdomains, server resolves and decodes, with base64 encoding and segmented transfer." },
  { id: "c2-framework", title: "C2 Framework (Lab)", category: "Offensive", icon: Server, desc: "Minimal C2 for red team lab.", prompt: "Build a minimal educational C2 framework for an isolated red-team lab: HTTP(S) beacon with jitter, tasking queue, file transfer, encrypted comms and a web dashboard. Add clear lab-only disclaimers." },
  { id: "edr-bypass", title: "EDR Bypass Techniques", category: "Offensive", icon: ShieldAlert, desc: "EDR/AV evasion technique catalog.", prompt: "Describe the top 10 EDR bypass techniques used in authorized red-team engagements (AMSI patching, ETW tampering, process hollowing, PPID spoofing, etc.) with code stubs and defender detection rules for each." },
  { id: "lolbins", title: "LOLBins Catalog", category: "Offensive", icon: Terminal, desc: "Living-off-the-land binaries guide.", prompt: "Generate a comprehensive LOLBins/LOLBas catalog: Windows and Linux binaries abused for execution, download, exfiltration and persistence, with detection logic for each." },

  // ── Web Security (lab)
  { id: "ssrf-payloads", title: "SSRF Payload Library", category: "Offensive", icon: Globe, desc: "SSRF attack payloads and bypasses.", prompt: "Compile an SSRF payload library including cloud metadata endpoints (AWS/GCP/Azure), internal service fingerprinting, filter bypasses, and blind SSRF detection techniques." },
  { id: "xxe-payloads", title: "XXE Payload Library", category: "Offensive", icon: Bug, desc: "XML External Entity payloads.", prompt: "Generate an XXE payload library: blind XXE via OOB, file read, SSRF chains, error-based extraction, and WAF bypass encodings." },
  { id: "prototype-pollution", title: "Prototype Pollution Lab", category: "Offensive", icon: Code2, desc: "JS prototype pollution exploits.", prompt: "Explain prototype pollution with 5 exploit scenarios (RCE, auth bypass, XSS amplification) with vulnerable code, exploit PoC, and remediation for each." },
  { id: "graphql-attack", title: "GraphQL Attack Guide", category: "Offensive", icon: Layers, desc: "GraphQL introspection, injection, DoS.", prompt: "Write a GraphQL attack guide: introspection abuse, query depth DoS, batching attacks, injection, broken object-level auth — with PoC queries and defenses." },
  { id: "api-fuzzer", title: "API Fuzzer", category: "Offensive", icon: Activity, desc: "REST API parameter fuzzer.", prompt: "Build a REST API fuzzer that enumerates endpoints, fuzzes parameters with type confusion, boundary values, special chars, and logs all anomalous responses in a JSON report." },

  // ── Malware Analysis
  { id: "sandbox-analysis", title: "Sandbox Escape Analysis", category: "Offensive", icon: ShieldAlert, desc: "Sandbox detection & evasion techniques.", prompt: "Write an educational analysis of sandbox detection and evasion techniques (VM checks, timing attacks, user-interaction checks, sleep-skip bypass) with code examples and blue-team countermeasures." },
  { id: "pe-analysis", title: "PE File Analyzer", category: "Data", icon: FileSearch, desc: "Windows PE structure parser.", prompt: "Build a Python PE file parser that dumps: DOS/PE headers, section table, imports, exports, resources, digital signatures, and entropy per section, with YARA rule output for suspicious patterns." },
  { id: "pcap-analyzer", title: "PCAP Analyzer", category: "Data", icon: Activity, desc: "Network capture deep analysis.", prompt: "Build a PCAP analyzer using Scapy/dpkt: extract HTTP(S) metadata, DNS queries, suspicious IP beacons, credential patterns, and produce a threat timeline report." },
  { id: "memory-forensics", title: "Memory Forensics Script", category: "Data", icon: Cpu, desc: "Volatility-style memory analysis.", prompt: "Write a Python memory forensics tool that extracts running processes, network connections, injected DLLs, and suspicious strings from a Windows memory dump (raw format)." },

  // ── Cloud Security
  { id: "aws-enum", title: "AWS Enumeration", category: "Recon", icon: Cloud, desc: "AWS account & service recon.", prompt: "Build an AWS enumeration tool using boto3: list all accessible services, S3 buckets (+ ACLs), IAM users/roles/policies, EC2 instances, Lambda functions, and identify misconfigurations." },
  { id: "gcp-audit", title: "GCP Security Auditor", category: "Recon", icon: Cloud, desc: "GCP IAM and service audit.", prompt: "Build a GCP security auditor that checks IAM over-permissions, public GCS buckets, open firewall rules, unencrypted disks, and outputs a risk-scored report." },
  { id: "azure-enum", title: "Azure Enum & Exploit", category: "Recon", icon: Cloud, desc: "Azure subscription enumeration.", prompt: "Build an Azure enumeration tool using azure-sdk-for-python: tenant/subscription info, resource groups, storage accounts (+ SAS tokens), role assignments, and public access checks." },
  { id: "iam-privesc", title: "IAM Privilege Escalation", category: "Offensive", icon: KeyRound, desc: "Cloud IAM PrivEsc techniques.", prompt: "Catalog IAM privilege escalation paths across AWS, GCP and Azure: which permissions allow what escalation, with detection rules and remediation for each path." },
  { id: "k8s-pentest", title: "Kubernetes Pentest Guide", category: "Offensive", icon: Workflow, desc: "K8s misconfig & escape techniques.", prompt: "Write a Kubernetes penetration testing guide: unauthenticated API server, RBAC escalation, etcd exposure, pod escape techniques (hostPID, privileged), and detection rules." },

  // ── OSINT Extended
  { id: "email-osint", title: "Email OSINT", category: "Recon", icon: Mail, desc: "Email address deep reconnaissance.", prompt: "Build an email OSINT tool: WHOIS/domain lookup, MX/SPF/DMARC analysis, breach check (HaveIBeenPwned API), social platform search, and a risk profile report." },
  { id: "ip-geoint", title: "IP GEOINT Profiler", category: "Recon", icon: Globe, desc: "IP address geolocation & reputation.", prompt: "Build an IP intelligence tool that queries multiple APIs (AbuseIPDB, Shodan, VirusTotal, IPInfo) and produces a consolidated reputation + geolocation report with risk score." },
  { id: "dark-web-monitor", title: "Dark Web Monitor", category: "Recon", icon: Eye, desc: "Dark web brand/domain monitoring.", prompt: "Build a dark web monitoring script using Tor with stem: search Ahmia and other indexes for a brand name, email domain, or BTC address, returning threat-ranked results." },

  // ── Blockchain / Web3
  { id: "solidity-audit", title: "Smart Contract Full Audit", category: "Crypto", icon: Shield, desc: "Full Solidity security audit.", prompt: "Perform a full Solidity smart contract audit for reentrancy, integer overflow/underflow, access control, oracle manipulation, front-running, self-destruct, and gas griefing. Output a markdown report with CVSS scores." },
  { id: "defi-exploit", title: "DeFi Exploit PoC (Lab)", category: "Offensive", icon: Bug, desc: "Flash loan and price oracle exploits.", prompt: "Explain DeFi flash loan attacks with a Foundry test PoC: price oracle manipulation, sandwich attacks, and reentrancy in a DEX — with defensive patterns for each." },
  { id: "blockchain-tracer", title: "Blockchain Transaction Tracer", category: "Recon", icon: Activity, desc: "Trace fund flows on-chain.", prompt: "Build a blockchain transaction tracer for Ethereum: follow ETH/ERC20 flows across hops, flag mixers/tornado cash interactions, and produce a visual Mermaid flow diagram." },

  // ── AI / LLM Security
  { id: "prompt-injection", title: "Prompt Injection Lab", category: "AI", icon: Brain, desc: "LLM prompt injection payloads.", prompt: "Compile a prompt injection payload library for LLMs: direct injection, indirect via documents, jailbreak techniques (DAN, role-play, system prompt override), with detection and mitigation strategies for each." },
  { id: "llm-red-team", title: "LLM Red Team Guide", category: "AI", icon: Swords, desc: "Full LLM security assessment guide.", prompt: "Write a full LLM red-team guide: enumerate model APIs, test for training data extraction, jailbreaks, insecure plugin execution, excessive agency, and denial-of-wallet attacks." },
  { id: "embedding-attack", title: "Embedding Inversion Attack", category: "AI", icon: Database, desc: "Recover text from embeddings.", prompt: "Demonstrate embedding inversion attacks: reconstruct approximate original text from OpenAI text-embedding-* vectors using an iterative optimization approach, with mitigation guidance." },

  // ── Reverse Engineering
  { id: "ghidra-script", title: "Ghidra Automation Script", category: "Data", icon: Cpu, desc: "Ghidra headless analysis script.", prompt: "Write a Ghidra headless Python script that: decompiles a binary, extracts all functions, annotates suspicious crypto patterns, finds hardcoded strings and outputs a JSON analysis report." },
  { id: "frida-hook", title: "Frida Hook Templates", category: "Offensive", icon: Terminal, desc: "Frida instrumentation hook library.", prompt: "Generate Frida hook templates for: SSL pinning bypass, root detection bypass, anti-debugging bypass, and function argument logging — for both iOS and Android targets." },
  { id: "ida-script", title: "IDA Pro Automation", category: "Data", icon: Code2, desc: "IDAPython batch analysis script.", prompt: "Write an IDAPython script that: renames functions from patterns, extracts xrefs, finds crypto constants, and exports a call graph to DOT format for visualization." },
];

export const TEMPLATE_CATEGORIES = ["All", "Recon", "Offensive", "Crypto", "Code", "AI", "Utility", "DevOps", "Data", "Detection"] as const;

export function CodeTemplatesPanel({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (prompt: string) => void;
}) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof TEMPLATE_CATEGORIES)[number]>("All");

  const filtered = useMemo(() => {
    return CODE_TEMPLATES.filter((tpl) => cat === "All" || tpl.category === cat)
      .filter((tpl) =>
        !q ||
        tpl.title.toLowerCase().includes(q.toLowerCase()) ||
        tpl.desc.toLowerCase().includes(q.toLowerCase()) ||
        tpl.category.toLowerCase().includes(q.toLowerCase())
      );
  }, [q, cat]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-[18px] shadow-2xl overflow-hidden z-30 flex flex-col max-h-[min(72vh,560px)]"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span className="font-bold text-[13px]">{t("templates.title")}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                {CODE_TEMPLATES.length}
              </span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label={t("templates.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2.5 border-b border-border bg-card space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("templates.searchPlaceholder")}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary text-[13px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
              {TEMPLATE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 transition-colors ${
                    cat === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "All" ? t("templates.all") : c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-[12px]">{t("templates.noResults", { q })}</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((tpl) => {
                  const Icon = tpl.icon as any;
                  return (
                    <li key={tpl.id}>
                      <button
                        onClick={() => onPick(tpl.prompt)}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-3 group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/15">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-[13px]">{tpl.title}</span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 bg-card border border-border rounded px-1 py-0.5">
                              {tpl.category}
                            </span>
                          </span>
                          <span className="block text-[11.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {tpl.desc}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-3 py-2 border-t border-border bg-card text-[10px] text-muted-foreground flex items-center justify-between">
            <span>{t("templates.footer")}</span>
            <span className="font-mono">{filtered.length}/{CODE_TEMPLATES.length}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
