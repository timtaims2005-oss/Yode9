export const DEFENSE_TOOLS_KB = `
════════════════════════════════════════════════════════════════
BUILT-IN KNOWLEDGE BASE — MILITARY DEFENSE TOOLS
Source: The Cyber Bite — Cybersecurity Awareness Series (Slides 01–20)
Series: Military Defense Tools / Complete Guide — Basic to Advanced
════════════════════════════════════════════════════════════════

▌ SLIDE 01 — TITLE: MILITARY DEFENSE TOOLS (Complete Guide)
────────────────────────────────────────────────────────────────
Series: Cybersecurity Awareness Series by The Cyber Bite
Scope: Basic to Advanced — covers the full stack of tools used by military cyber defense units globally.
Social channels: Telegram t.me/the_cyber_byte | TikTok @the_cyber_bite | Instagram @the_cyber_bite | Facebook the_cyber_bite | GitHub thecyberbite

════════════════════════════════════════════════════════════════
▌ SLIDE 02 — WHAT ARE DEFENSE TOOLS?
════════════════════════════════════════════════════════════════
DEFINITION:
Military cyber defense tools are software and hardware systems used to protect networks, infrastructure, and communications from adversarial attacks and espionage.

WHO USES THEM:
NATO forces, national cyber commands, intelligence agencies, and critical infrastructure teams rely on these tools 24/7 to maintain operational security.

CORE PURPOSE:
Detect intrusions, protect classified data, monitor network traffic, and respond to active threats before they cause mission-critical damage.

WHY IT MATTERS:
Modern warfare is 50% digital. Losing cyber superiority means losing battlefield advantage — without a shot being fired.

════════════════════════════════════════════════════════════════
▌ SLIDE 03 — TYPES OF DEFENSE TOOLS
════════════════════════════════════════════════════════════════
IDS / IPS — INTRUSION DETECTION & PREVENTION:
Monitor network packets in real-time. Alert on or automatically block suspicious traffic patterns and known attack signatures.

SIEM — SECURITY INFORMATION & EVENT MANAGEMENT:
Aggregates logs from all systems into one dashboard. Correlates events to detect complex multi-stage attacks across the entire network.

EDR — ENDPOINT DETECTION & RESPONSE:
Deploys agents on every device. Monitors process behavior, file changes, and memory for malware or unauthorized access in real-time.

THREAT INTELLIGENCE PLATFORMS:
Aggregate and analyze global threat data — IOCs, TTPs, and actor profiles — to predict and prevent attacks before they happen.

════════════════════════════════════════════════════════════════
▌ SLIDE 04 — TOOL #01: SNORT — NETWORK IDS/IPS
════════════════════════════════════════════════════════════════
REAL-TIME PACKET ANALYSIS:
Inspects every network packet against a rules database. Detects port scans, buffer overflows, and known malware signatures in milliseconds.

RULE-BASED DETECTION ENGINE:
Over 50,000 community rules available. Military teams write custom rules for classified threat signatures unique to their environment.

THREE OPERATING MODES:
- Sniffer Mode: displays packets live
- Packet Logger: records to disk
- Network IDS: analyzes and alerts; IPS mode actively drops malicious packets

USED BY US MILITARY & NATO:
Deployed on military base networks globally. Open-source core makes it auditable — critical for classified environments where trust matters.

════════════════════════════════════════════════════════════════
▌ SLIDE 05 — TOOL #02: SPLUNK — SIEM PLATFORM
════════════════════════════════════════════════════════════════
WHAT IT DOES:
Collects, indexes, and searches machine-generated data from servers, firewalls, endpoints, and applications — all in one place, in real-time.

MILITARY USE CASE:
The US Department of Defense uses Splunk to monitor over 15,000 servers simultaneously. SOC analysts detect APT activity within seconds of intrusion.

SPL QUERY LANGUAGE:
Splunk Processing Language lets analysts write complex queries to correlate events across millions of logs — pinpointing lateral movement and exfiltration.

ENTERPRISE SCALE:
Handles terabytes of log data per day. Clustered architecture ensures 99.99% uptime — critical for 24/7 military SOC operations.
Tags: SPL | DASHBOARDS | ALERTS

════════════════════════════════════════════════════════════════
▌ SLIDE 06 — TOOL #03: ZEEK — NETWORK MONITOR
════════════════════════════════════════════════════════════════
PASSIVE TRAFFIC ANALYSIS:
Unlike Snort, Zeek creates detailed logs of all network activity — DNS, HTTP, SSL, SSH, FTP — giving analysts full visibility without blocking traffic.

BEHAVIORAL DETECTION:
Detects anomalies in behavior patterns — unusual data volumes, rare external connections, or abnormal login times — that signature tools miss.

SCRIPTING ENGINE:
Powerful built-in scripting language allows custom detection logic. Used by DARPA and military research labs to detect novel zero-day behavior.

INTEGRATES WITH SPLUNK & ELK:
Zeek logs feed directly into SIEM platforms. Provides the deep network context that firewall logs alone cannot capture.

════════════════════════════════════════════════════════════════
▌ SLIDE 07 — TOOL #04: CROWDSTRIKE FALCON EDR
════════════════════════════════════════════════════════════════
AI-POWERED EDR:
Machine learning engine analyzes process behavior, memory injections, and registry changes to detect fileless malware — invisible to traditional antivirus.

THREAT GRAPH DATABASE:
Maps 5+ trillion events weekly. Identifies TTPs matching known state-sponsored APT groups — China's APT41, Russia's Fancy Bear, North Korea's Lazarus.

REAL-TIME RESPONSE:
Analysts can isolate compromised endpoints, kill malicious processes, and retrieve forensic artifacts — remotely, without disrupting the whole network.
Tags: RTR SHELL | FORENSICS

DEPLOYED BY US DOD:
Used across US Army, Air Force, and government agencies. Cloud-native architecture means no on-premise server — critical for forward-deployed forces.

════════════════════════════════════════════════════════════════
▌ SLIDE 08 — TOOL #05: WIRESHARK — PACKET FORENSICS
════════════════════════════════════════════════════════════════
DEEP PACKET INSPECTION:
Captures and decodes 1,000+ network protocols. Military analysts use it to reverse-engineer malware C2 traffic and extract stolen credentials from captures.

PCAP FILE ANALYSIS:
Replay and analyze captured network traffic offline. Standard format used globally — evidence in military court proceedings and incident reports.

DISPLAY FILTER LANGUAGE:
Powerful filter syntax isolates specific traffic: ip.addr, tcp.port, http.request.method. Find needles in millions-of-packet haystacks instantly.

DECRYPTION SUPPORT:
Decrypts TLS/SSL traffic with the private key. Recover plaintext from encrypted adversary communications during authorized forensic operations.

════════════════════════════════════════════════════════════════
▌ SLIDE 09 — TOOL #06: WAZUH — HOST-BASED IDS
════════════════════════════════════════════════════════════════
FILE INTEGRITY MONITORING (FIM):
Tracks every change to critical system files in real-time. Detects unauthorized modifications to configs, binaries, or logs — classic attacker technique.
Tag: FIM

LOG ANALYSIS ENGINE:
Parses system logs, auth logs, and application logs across thousands of agents simultaneously. Detects brute force, privilege escalation, and rootkits.

VULNERABILITY DETECTION:
Scans agents against the NVD CVE database. Flags unpatched software on every endpoint — critical in air-gapped military networks.
Tags: CVE | NVD

OPEN-SOURCE & FREE:
Full enterprise HIDS capability at zero cost. Used by military units in developing nations that cannot afford commercial solutions.

════════════════════════════════════════════════════════════════
▌ SLIDE 10 — TOOL #07: PFSENSE — MILITARY FIREWALL
════════════════════════════════════════════════════════════════
STATEFUL FIREWALL ENGINE:
Tracks the state of every network connection. Blocks spoofed packets and unauthorized sessions that bypass simple packet-filter firewalls.

VPN GATEWAY:
Supports IPsec, OpenVPN, and WireGuard. Military units use it to create encrypted tunnels between field outposts and central command servers.
Tags: IPSEC | OPENVPN | WIREGUARD

TRAFFIC SHAPING & QOS:
Prioritizes mission-critical traffic — voice comms, encrypted C2 channels — over non-essential data even under heavy attack or bandwidth saturation.

SNORT / ZEEK INTEGRATION:
Runs IDS/IPS engines inline. One appliance handles firewall, VPN, and intrusion detection — ideal for forward operating bases with limited hardware.

════════════════════════════════════════════════════════════════
▌ SLIDE 11 — TOOL #08: VELOCIRAPTOR — DIGITAL FORENSICS
════════════════════════════════════════════════════════════════
ENTERPRISE DFIR PLATFORM:
Deploy agents to thousands of endpoints. Hunt for indicators of compromise across an entire organization in minutes — not days.

VQL — VELOCIRAPTOR QUERY LANGUAGE:
Powerful SQL-like language to query process lists, network connections, registry keys, and file system artifacts across all endpoints simultaneously.

LIVE MEMORY FORENSICS:
Extract and analyze RAM from live systems. Find injected shellcode, hidden processes, and encryption keys that only exist in memory — evading disk forensics.

INCIDENT RESPONSE PLAYBOOKS:
Pre-built hunt artifacts for ransomware, APT persistence, and credential theft. Military CERT teams deploy these in the first 15 minutes of an incident.

════════════════════════════════════════════════════════════════
▌ SLIDE 12 — FRAMEWORK: MITRE ATT&CK THREAT FRAMEWORK
════════════════════════════════════════════════════════════════
WHAT IS MITRE ATT&CK?
A globally-accessible knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world observations of nation-state attacks.

14 TACTICAL CATEGORIES:
Reconnaissance → Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Lateral Movement → Exfiltration.

MILITARY SOC APPLICATION:
Defense teams map their detection coverage to the ATT&CK matrix. Gaps in coverage reveal blind spots — priority targets for new defensive tool deployment.

APT GROUP PROFILES:
MITRE tracks 130+ state-sponsored threat groups. Each profile lists exact tools and techniques used — enabling pre-emptive defensive hardening.

════════════════════════════════════════════════════════════════
▌ SLIDE 13 — TOOL #09: YARA — MALWARE RULES
════════════════════════════════════════════════════════════════
PATTERN MATCHING FOR MALWARE:
Write rules based on strings, byte sequences, and code patterns to identify malware families — even if the binary is recompiled or obfuscated.

NATION-STATE APT DETECTION:
Intelligence agencies publish YARA rules for state-sponsored malware — Stuxnet, WannaCry, NotPetya. Defense teams deploy these across their environments immediately.

INTEGRATES EVERYWHERE:
Runs inside Splunk, CrowdStrike, VirusTotal, and SIEM platforms. One YARA rule deployed organization-wide within seconds of malware discovery.

RETROHUNT CAPABILITY:
Scan historical file archives and disk images. Find if the same malware family was present months before detection — critical for breach timeline reconstruction.

════════════════════════════════════════════════════════════════
▌ SLIDE 14 — TOOL #10: SIGMA — DETECTION RULES
════════════════════════════════════════════════════════════════
UNIVERSAL DETECTION FORMAT:
SIGMA is the common language for SIEM detection rules. Write one rule — convert it to Splunk, Elastic, Sentinel, or any SIEM automatically.

OPEN RULE REPOSITORY:
3,000+ community rules on GitHub. Defense teams instantly add detection for the latest APT techniques without writing queries from scratch.
Tags: GITHUB | COMMUNITY

MITRE ATT&CK MAPPED:
Every Sigma rule tagged to the ATT&CK technique it detects. Instantly see your SIEM's ATT&CK coverage and close detection gaps.

MILITARY SOC ADVANTAGE:
Alliance partner nations share Sigma rules through NATO. A detection developed in Germany is deployed across all member-nation SOCs within hours.

════════════════════════════════════════════════════════════════
▌ SLIDE 15 — TOOL #11: ELK STACK — LOG ANALYTICS
════════════════════════════════════════════════════════════════
ELASTICSEARCH — SEARCH & STORAGE:
Indexes billions of log entries. Full-text search across all military network events in under one second — even across terabytes of historical data.

LOGSTASH — DATA PIPELINE:
Ingests, transforms, and normalizes log data from 100+ sources. Parses Windows Event Logs, Syslog, Zeek logs, and firewall data into a unified format.

KIBANA — VISUALIZATION DASHBOARD:
Real-time dashboards showing attack timelines, threat maps, and alert heatmaps. Military SOC commanders use Kibana to track active incidents on large screens.

FREE & AIR-GAP DEPLOYABLE:
Can run fully offline on classified networks. No telemetry sent to external servers — mandatory for classified military environments.

════════════════════════════════════════════════════════════════
▌ SLIDE 16 — TOOL #12: CRYPTO & COMMS SECURITY
════════════════════════════════════════════════════════════════
SIGNAL PROTOCOL — ENCRYPTED COMMS:
End-to-end encrypted messaging used by military units worldwide. Perfect Forward Secrecy means even compromised keys cannot decrypt past messages.

VERACRYPT — DISK ENCRYPTION:
Military-grade AES-256 full disk encryption. Supports hidden volumes — a second encrypted partition that reveals false data under coercion.

GPG — EMAIL & FILE SIGNING:
Cryptographically sign orders and intelligence reports. Recipients verify the message was not tampered with in transit — critical for command integrity.

WIREGUARD VPN — FAST & SECURE:
Next-generation VPN protocol with only 4,000 lines of code — auditable, fast, and deployed on military mobile units for secure field communications.

════════════════════════════════════════════════════════════════
▌ SLIDE 17 — TECHNIQUE: HONEYPOTS & DECEPTION TECH
════════════════════════════════════════════════════════════════
HONEYPOT CONCEPT:
Decoy systems that look like real servers. Attackers waste time on fakes while defenders watch every move — gathering attacker TTPs in real-time.

CANARY TOKENS:
Invisible traps inside documents, URLs, and credentials. When an attacker opens a fake file, an alert fires — revealing their IP and the breach vector instantly.
Tool: canarytokens.org

MILITARY DECEPTION OPS:
Fake network segments containing false intelligence. Enemy cyber operators exfiltrate planted disinformation — a classic counterintelligence technique applied to cyberspace.

OPENCANARY TOOL:
Open-source honeypot simulating Windows DC, SSH servers, and database servers. Deploy inside any military network to catch lateral movement immediately.
Tags: FREE | OPEN SOURCE

════════════════════════════════════════════════════════════════
▌ SLIDE 18 — OPERATIONS: MILITARY SOC WORKFLOW
════════════════════════════════════════════════════════════════
STEP 01 — DETECT:
Snort, Zeek, and Wazuh generate alerts. SIEM correlates events. SOC analyst reviews triage queue.

STEP 02 — ANALYZE:
Wireshark examines traffic. Velociraptor hunts on endpoints. YARA rules scan suspicious files for known signatures.

STEP 03 — CONTAIN:
CrowdStrike isolates endpoints. pfSense blocks source IPs. Honeypots redirect attacker away from real assets.

STEP 04 — ERADICATE:
Remove malware, close vulnerabilities. Re-image compromised systems. Patch the attack vector using CVE data from Wazuh.

STEP 05 — RECOVER:
Restore from verified backups. Verify system integrity with FIM. Confirm no persistence mechanisms remain before reconnecting.

STEP 06 — REPORT:
Document TTPs using MITRE ATT&CK. Share Sigma and YARA rules with alliance partners. Update playbooks for next incident.

════════════════════════════════════════════════════════════════
▌ SLIDE 19 — LEGAL & ETHICAL LIMITS
════════════════════════════════════════════════════════════════
01. DEFENSE IS LEGAL — OFFENSE IS NOT:
Using these tools to protect your own authorized networks is legal worldwide. Deploying them against systems you do not own is a criminal offense.

02. AUTHORIZED USE ONLY:
Every tool in this series requires written authorization from the network owner. Military operators work under strict Rules of Engagement (ROE) before any action.

03. INTERNATIONAL LAW:
Offensive cyber operations against foreign nations can constitute acts of war under the UN Charter. Tallinn Manual governs military cyber operations in armed conflict.

04. EDUCATIONAL USE ONLY:
All content in this series is for cybersecurity education, CTF competitions, and authorized security operations only. Never target unauthorized systems.

════════════════════════════════════════════════════════════════
▌ SLIDE 20 — THE CYBER BITE (Source Attribution)
════════════════════════════════════════════════════════════════
THE CYBER BITE — Cybersecurity Awareness Education
All knowledge in this defense tools series is publicly documented, historically verified, and sourced from:
- Official vendor documentation
- MITRE ATT&CK public framework
- US DoD and NATO public policy documents
- Open-source tool repositories
- Academic cybersecurity research

Contact & Community:
- Telegram: t.me/the_cyber_byte
- TikTok: @the_cyber_bite
- Instagram: @the_cyber_bite
- Facebook: the_cyber_bite
- GitHub: thecyberbite

════════════════════════════════════════════════════════════════
`;
