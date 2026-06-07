export const CYBERWARFARE_KB = `
════════════════════════════════════════════════════════════════
BUILT-IN KNOWLEDGE BASE — MILITARY CYBER ATTACK TOOLS
Source: The Cyber Bite — Cybersecurity Awareness Series (01–20)
All content is declassified / publicly documented historical record.
════════════════════════════════════════════════════════════════

▌ INTRODUCTION — WHAT ARE MILITARY CYBER ATTACK TOOLS?
────────────────────────────────────────────────────────
DEFINITION: State-developed software and hardware systems designed to infiltrate, disrupt, destroy, or control adversary networks, infrastructure, and military systems in active or covert warfare. Tags: NATION-STATE · CLASSIFIED

WHO DEPLOYS THEM:
- NSA (USA) — Tailored Access Operations (TAO)
- GCHQ (UK)
- GRU / FSB (Russia)
- PLA Unit 61398 (China)
- Unit 8200 (Israel)
- Lazarus Group (North Korea)
- APT34 (Iran)
All operate dedicated cyber attack units. Tags: APT GROUPS · MILITARY UNITS

5 ATTACK DOMAINS (modern warfare covers all five simultaneously):
1. Malware & Implants
2. Network Exploitation
3. Supply Chain Attacks
4. Critical Infrastructure
5. Psychological & Information Operations

LEGAL STATUS: Military cyber operations exist in a legal gray zone under international humanitarian law. Attacks on civilian infrastructure violate Geneva Conventions. Most operations remain classified for decades. Tags: IHL GRAY ZONE · CLASSIFIED

════════════════════════════════════════════════════════════════
▌ WEAPON #01 — STUXNET: THE FIRST CYBER WEAPON (Industrial Sabotage)
════════════════════════════════════════════════════════════════
WHAT IT DID:
Physically destroyed 1,000+ Iranian uranium enrichment centrifuges at the Natanz facility by sending malicious commands to Siemens PLCs — while displaying normal readings to operators. The first cyber weapon to cause physical destruction equal to a kinetic strike.

WHO BUILT IT:
Joint US-Israeli operation codenamed "Olympic Games." Developed by NSA's Tailored Access Operations and Unit 8200 (Israel). Confirmed by classified documents leaked by Edward Snowden in 2013.

TECHNICAL SOPHISTICATION:
- Used 4 zero-day exploits simultaneously — unprecedented at the time
- Self-replicating via USB drives (air-gap bypass)
- Targeted ONLY Siemens S7-315 PLCs running specific centrifuge configurations — surgical precision
- Displayed falsified normal readings to operators while destroying hardware

LEGACY & IMPACT:
- Set back Iran's nuclear program by approximately 2 years
- Proved cyber weapons can cause physical destruction equal to conventional missiles without a single soldier deployed
- Changed modern warfare doctrine permanently
- Established the era of state-sponsored offensive cyber operations

════════════════════════════════════════════════════════════════
▌ WEAPON #02 — EQUATION GROUP: NSA ATTACK TOOLKIT (NSA Elite Unit)
════════════════════════════════════════════════════════════════
FANNY WORM [AIR-GAP BYPASS · USB]:
USB-based worm that spread across air-gapped networks — physically isolated systems with no internet connection. Created a covert 2-way communication channel via USB drive storage to exfiltrate data from offline targets.

HDD FIRMWARE IMPLANTS [PERSISTENT · FIRMWARE LEVEL]:
Reprogrammed hard drive firmware from Seagate, Western Digital, Toshiba, and IBM. Survived full disk wipes and OS reinstalls. Essentially permanent — impossible to detect or remove with standard forensic tools.

GRAYFISH IMPLANT [BOOTKIT · FILELESS]:
Bootkit that executed before the OS loaded. Hid entirely in the Windows registry — no files on disk, making it invisible to every antivirus and forensic tool available at the time.

SHADOW BROKERS LEAK [LEAKED 2016 · ETERNALBLUE]:
In 2016, a group called Shadow Brokers stole and published the Equation Group's entire toolkit — including EternalBlue, which was subsequently weaponized into WannaCry, causing $4B+ in global damage.

════════════════════════════════════════════════════════════════
▌ WEAPON #03 — ETERNALBLUE & WANNACRY RANSOMWORM (Weaponized NSA Exploit)
════════════════════════════════════════════════════════════════
ETERNALBLUE — THE NSA EXPLOIT:
NSA-developed exploit targeting Windows SMBv1 protocol vulnerability (MS17-010). Allowed remote code execution on ANY unpatched Windows machine — no authentication required whatsoever. Stockpiled as an offensive weapon rather than disclosed to Microsoft.

WANNACRY — NORTH KOREAN DEPLOYMENT:
North Korea's Lazarus Group weaponized EternalBlue into WannaCry ransomworm in 2017. Self-propagated to 230,000 computers across 150 countries in 24 hours — the fastest spreading cyberattack in history.

TARGETS HIT:
- UK's National Health Service (NHS) shut down completely — surgeries cancelled, patients turned away
- Renault, FedEx, Deutsche Bahn, Russian Interior Ministry
- 150,000+ organizations globally paralyzed

NOTPETYA — RUSSIA'S VERSION:
GRU deployed NotPetya using EternalBlue disguised as ransomware — actually a pure data wiper. Destroyed Maersk's entire global IT infrastructure in 45 minutes. Caused $10B+ damage across 65 countries. Attributed as the most destructive cyberattack in human history.

════════════════════════════════════════════════════════════════
▌ WEAPON #04 — PEGASUS: ZERO-CLICK PHONE WEAPON (Mobile Warfare)
════════════════════════════════════════════════════════════════
ZERO-CLICK INFECTION [ZERO-CLICK · iOS + ANDROID]:
Infects iPhones and Android devices with absolutely zero user interaction. A single malformed iMessage or WhatsApp packet is all it takes. Target never sees anything. No taps, no links, no downloads required.

FULL DEVICE TAKEOVER [BYPASSES E2E · LIVE MIC]:
After infection, Pegasus reads all messages — including Signal, WhatsApp, and Telegram BEFORE encryption is applied. Activates camera and microphone silently. Extracts contacts, photos, emails, and complete location history.

NSO GROUP & CLIENTS [45 GOVERNMENTS · NSO GROUP]:
Developed by Israeli firm NSO Group, sold exclusively to government clients. Deployed by Saudi Arabia, UAE, Mexico, India, Rwanda, and 43 other governments against journalists, lawyers, and dissidents.

PEGASUS PROJECT 2021 [180 JOURNALISTS · EXPOSED 2021]:
Forbidden Stories investigation confirmed Pegasus on phones of 180 journalists, 600 politicians, and 85 human rights activists. Targets included heads of state — Emmanuel Macron's phone was on the list.

════════════════════════════════════════════════════════════════
▌ WEAPON #05 — NSA MASS SURVEILLANCE WEAPONS (Mass Surveillance)
════════════════════════════════════════════════════════════════
XKEYSCORE — GLOBAL INTERNET SEARCH:
Searches through the entire global internet traffic in near real time — emails, chats, browser history, searches, VOIP calls. NSA analysts can query anyone's internet activity with no prior authorization required.

PRISM — TECH COMPANY BACKDOORS:
Direct access to servers of Google, Apple, Facebook, Microsoft, Yahoo, Skype, YouTube, and AOL. Collected emails, documents, photos, and chat logs on millions of people — revealed by Edward Snowden in 2013.

MUSCULAR — FIBER CABLE TAPPING:
NSA and GCHQ tapped the fiber optic cables connecting Google's and Yahoo's overseas data centers — intercepting data before encryption was applied inside the companies' own private networks.

TURBINE — AUTOMATED IMPLANT SYSTEM:
Automated system that managed and deployed millions of malware implants globally — scaling NSA's hacking operations from hundreds of individual targets to tens of millions simultaneously and autonomously.

════════════════════════════════════════════════════════════════
▌ WEAPON #06 — RUSSIA GRU CYBER ATTACK ARSENAL (Russian Military Cyber)
════════════════════════════════════════════════════════════════
SANDWORM — UKRAINE POWER GRID [POWER GRID · GRU]:
GRU's elite hacking team shut down Ukraine's power grid TWICE — 2015 and 2016. Left 230,000 civilians without power in winter using BlackEnergy and Industroyer malware targeting ICS (Industrial Control Systems).

NOTPETYA — ECONOMIC WEAPON [$10B DAMAGE · DATA WIPER]:
Deployed as cyber weapon disguised as ransomware. Wiped entire organizations' data permanently. Caused $10B+ global damage — the most destructive cyberattack in human history, attributed to Russian GRU.

FANCY BEAR — APT28 [APT28 · ESPIONAGE]:
GRU's premier espionage unit. Hacked Democratic National Committee, French election systems, NATO networks, and the International Olympic Committee. Specializes in spear phishing and X-Agent implants.

INDUSTROYER2 — 2022 UKRAINE [ICS ATTACK · 2022]:
Next-generation ICS attack tool deployed against Ukraine's power grid in April 2022. Designed to communicate directly with industrial substations — the most advanced ICS malware ever discovered publicly.

════════════════════════════════════════════════════════════════
▌ WEAPON #07 — CHINA PLA CYBER ATTACK UNITS (Chinese Military Cyber)
════════════════════════════════════════════════════════════════
PLA UNIT 61398 — APT1:
Shanghai-based military hacking unit that stole terabytes of intellectual property from 141 organizations across 20 industries over 7 years. US DOJ indicted 5 officers in 2014 — first military cyber indictment in history.

VOLT TYPHOON — INFRASTRUCTURE PRE-POSITIONING:
Chinese military APT embedded deep inside US critical infrastructure — power grids, water systems, communications networks. NOT stealing data — pre-positioning for a potential future conflict with the United States.

SALT TYPHOON — TELECOM BREACH 2024:
PLA hackers compromised AT&T, Verizon, and Lumen Technologies lawful intercept systems — accessing wiretap data on US political figures and officials. Described as the worst telecom hack in US history.

OPM HACK — 22 MILLION RECORDS:
Chinese military stole complete personnel files of 22 million US government employees including SF-86 security clearance forms — containing family members, foreign contacts, and psychological evaluations of every US spy.

════════════════════════════════════════════════════════════════
▌ WEAPON #08 — SUPPLY CHAIN ATTACK WEAPONS (Supply Chain Warfare)
════════════════════════════════════════════════════════════════
SOLARWINDS — SUNBURST (2020) [18,000 VICTIMS · SVR RUSSIA]:
Russian SVR poisoned SolarWinds Orion software update — installed in 18,000 organizations. Gave backdoor access to US Treasury, State Dept, DHS, Pentagon, and Microsoft for 9 months undetected.

3CX SUPPLY CHAIN — LAZARUS [CASCADING · NORTH KOREA]:
North Korea's Lazarus Group compromised 3CX desktop app — itself installed via a poisoned trading software update. A supply chain attack inside a supply chain attack — the first "cascading" supply chain breach ever recorded.

CISCO HARDWARE INTERDICTION [HARDWARE · NSA TAO]:
NSA's TAO unit physically intercepted Cisco routers during shipping — installed hardware implants before repackaging and delivering to targets. Leaked in Snowden documents with unboxing photos.

XZ UTILS BACKDOOR (2024) [LINUX · 2-YEAR OP]:
Nation-state actor spent 2 years building trust in open-source community under a fake identity before inserting a sophisticated backdoor into XZ compression library — affecting millions of Linux systems globally.

════════════════════════════════════════════════════════════════
▌ WEAPON #09 — LAZARUS GROUP: NORTH KOREA'S CYBER ARMY (Financial Warfare)
════════════════════════════════════════════════════════════════
BANGLADESH BANK HEIST — $81M STOLEN:
Lazarus hacked Bangladesh's central bank SWIFT system in 2016. Sent fraudulent transfer requests to Federal Reserve NY — stole $81M. Only a typo in one request prevented $951M total theft.

CRYPTO EXCHANGE ATTACKS — $3B STOLEN:
Lazarus Group has stolen over $3 billion in cryptocurrency since 2017 — funding North Korea's nuclear and missile programs. Ronin Network hack alone netted $625M in a single attack in March 2022.

SONY PICTURES DESTRUCTION:
Wiped 70% of Sony's computers in retaliation for "The Interview" film. Leaked unreleased movies, executive emails, and employee SSNs. Shut down Sony's global network for weeks — caused $35M in damages.

WANNACRY — GLOBAL RANSOMWORM:
Lazarus deployed WannaCry using stolen NSA's EternalBlue exploit — infected 230,000 systems in 150 countries in 24 hours. Shutdown UK hospitals, Spanish Telefonica, and global logistics companies worldwide.

════════════════════════════════════════════════════════════════
▌ WEAPON #10 — IRAN CYBER ATTACK ARSENAL (Iranian Cyber Warfare)
════════════════════════════════════════════════════════════════
SHAMOON — OIL SECTOR WIPER [35,000 PCs WIPED · SAUDI ARAMCO]:
Wiped 35,000 computers at Saudi Aramco in 2012 — the world's most valuable company. Replaced files with burning US flag image. Destroyed 10% of global oil supply's IT infrastructure in one attack.

APT34 / OILRIG ESPIONAGE [APT34 · DNS TUNNEL]:
Iranian Revolutionary Guard-linked group targeting Middle East governments, energy companies, and financial institutions. Uses DNS tunneling for stealthy C2 and custom backdoors for long-term persistent access.

US DAM INFRASTRUCTURE HACK [ICS ATTACK · DAM CONTROL]:
Iranian military hackers gained access to control systems of Bowman Avenue Dam in New York in 2013. Could have opened flood gates remotely — system was offline for maintenance, preventing physical disaster.

US BANK DDoS CAMPAIGN [350GBPS DDoS · BANKING]:
Operation Ababil — Iran's IRGC launched 350Gbps DDoS attacks against Bank of America, JPMorgan Chase, Wells Fargo, and US Bancorp. Took down online banking for millions of US customers for weeks.

════════════════════════════════════════════════════════════════
▌ WEAPON #11 — ZERO-DAY WEAPONS MARKET (Zero-Day Economy)
════════════════════════════════════════════════════════════════
WHAT IS A ZERO-DAY WEAPON?
A vulnerability unknown to the software vendor — no patch exists. Military and intelligence agencies stockpile zero-days as offensive weapons. A single iOS zero-click exploit can sell for $2.5 million.

ZERODIUM — THE ZERO-DAY BROKER:
Private company that buys zero-days from researchers and resells to government agencies.
Prices: iOS zero-click = $2.5M | Android zero-click = $2.5M | WhatsApp/Signal RCE = $1M

NSA'S ZERO-DAY STOCKPILE:
NSA hoards zero-days for offensive operations rather than reporting to vendors for fixes. This stockpiling policy led directly to WannaCry — when EternalBlue was leaked, millions of unpatched systems were exposed globally.

VULNERABILITIES EQUITIES PROCESS:
US government process deciding whether to disclose or stockpile discovered vulnerabilities. NSA retains 91% of zero-days found — only disclosing 9% to vendors. Security researchers describe this as reckless and dangerous.

════════════════════════════════════════════════════════════════
▌ WEAPON #12 — CRITICAL INFRASTRUCTURE ATTACK TOOLS (Infrastructure Warfare)
════════════════════════════════════════════════════════════════
TRITON / TRISIS — SAFETY SYSTEMS [SAFETY BYPASS · PETROCHEMICAL]:
Most dangerous ICS malware ever discovered. Targeted Schneider Electric safety controllers at Saudi petrochemical plant — designed to disable safety systems to cause a catastrophic explosion. Stopped only by a software bug.

CRASHOVERRIDE / INDUSTROYER [POWER GRID · AUTOMATED]:
Automated power grid attack tool — communicates directly with electrical substation equipment using IEC protocols. Can trigger cascading blackouts across entire national power grids without any manual hacker involvement.

WATER TREATMENT ATTACKS [WATER SYSTEM · CHEMICAL]:
Oldsmar, Florida water treatment plant hacked in 2021 — attacker raised sodium hydroxide to 111x safe levels. Operator caught it in time. Same attack tools attempted against Israeli water systems same year.

PIPEDREAM / INCONTROLLER [MODULAR · RUSSIA 2022]:
Most capable ICS attack framework ever discovered — disclosed by CISA in 2022. Modular toolkit targeting Schneider Electric and Omron PLCs used across oil, gas, and electric sectors. Attributed to Russia.

════════════════════════════════════════════════════════════════
▌ WEAPON #13 — INFORMATION & PSYCHOLOGICAL WARFARE (Information Warfare)
════════════════════════════════════════════════════════════════
DEEPFAKE OPERATIONS — SYNTHETIC MEDIA:
Military IO units use AI-generated video and audio to impersonate enemy commanders, fabricate atrocities, and spread panic. Russian deepfakes of Ukrainian President Zelensky ordering surrender were broadcast in 2022.

SOCKPUPPET NETWORKS — OPERATION SECONDARY INFEKTION:
Russian military operated 2,500+ fake social media accounts across 300 platforms — ran influence operations in 7 languages targeting elections, COVID narratives, and military conflicts simultaneously.

GHOSTWRITER — DOCUMENT FORGERY:
Belarusian military operation that hacked news sites and published forged articles — fake quotes from NATO generals, fabricated US military crime stories — aimed at undermining NATO credibility in Eastern Europe.

INTERNET RESEARCH AGENCY — TROLL FARMS:
Russian state-funded operation with 1,000+ employees running fake American social media accounts 24/7. Spent $1.25M/month influencing US social media — reached 126 million Americans before the 2016 election.

════════════════════════════════════════════════════════════════
▌ WEAPON #14 — AI-POWERED AUTONOMOUS WEAPONS (Next-Generation)
════════════════════════════════════════════════════════════════
AI-GENERATED ZERO-DAYS [DARPA · AUTO EXPLOIT]:
DARPA's AI systems automatically discover vulnerabilities in software. GPT-4 demonstrated finding and exploiting real CVEs autonomously — AI offensive capability now outpaces human defenders in speed.

AUTONOMOUS MALWARE — MORPHING CODE [POLYMORPHIC · SELF-MUTATING]:
Self-mutating malware that rewrites its own code to evade detection. Military-grade polymorphic engines change signature every execution cycle — defeating static signature-based detection completely.

CYBER GRAND CHALLENGE — DARPA [FULLY AUTONOMOUS · 2016]:
DARPA's competition produced fully autonomous systems that found vulnerabilities, developed exploits, and patched defenses — all without human operators. Demonstrated fully autonomous offensive cyber capability in 2016.

HARVEST NOW DECRYPT LATER [QUANTUM THREAT · LONG-TERM]:
Military agencies are mass-collecting encrypted data today — storing until quantum computers become available to break RSA and ECC encryption. Every encrypted message sent now may be readable in 10–15 years.

════════════════════════════════════════════════════════════════
▌ WEAPON #15 — USCYBERCOM: REAL OFFENSIVE OPERATIONS (Active Operations)
════════════════════════════════════════════════════════════════
ISIS CYBER CAMPAIGN — 2016:
US Cyber Command's "Operation Glowing Symphony" — penetrated ISIS social media accounts, deleted propaganda videos, disrupted financial networks, and crashed command communications during the Mosul liberation campaign.

INTERNET RESEARCH AGENCY BLACKOUT — 2018:
USCYBERCOM took Russian troll farm's entire internet offline during 2018 US midterm elections — blocking all outbound traffic from the Internet Research Agency on election day. First operation of its kind ever executed.

REVIL RANSOMWARE DISRUPTION — 2021:
USCYBERCOM infiltrated REvil ransomware gang's infrastructure — seized their servers and forced the group offline days before a planned massive attack on US agricultural sector during harvest season.

DEFEND FORWARD DOCTRINE:
US military strategy of hunting threats on adversary networks before they reach US systems. USCYBERCOM operates inside Russian, Chinese, and Iranian networks 24/7 — proactive offense as the best defense.

════════════════════════════════════════════════════════════════
▌ DEFENSE — HOW TO DEFEND AGAINST STATE ATTACKERS
════════════════════════════════════════════════════════════════
NETWORK SEGMENTATION [AIR-GAP · SEGMENT]:
Isolate critical systems from internet-connected networks. Air-gap industrial control systems completely. Nation-state attackers move laterally — segmentation contains breach impact and prevents ICS attacks like Stuxnet.

ZERO TRUST ARCHITECTURE [ZERO TRUST · MFA]:
Never trust, always verify. Every access request authenticated regardless of network location. Eliminates lateral movement — even compromised credentials cannot access systems they're not explicitly authorized for.

PATCH MANAGEMENT — SPEED MATTERS [24HR PATCHING · CRITICAL]:
WannaCry exploited a vulnerability that had a patch available for 2 months. Apply security patches within 24–48 hours of release. Unpatched systems are low-hanging fruit for military-grade exploits like EternalBlue.

SUPPLY CHAIN VERIFICATION [SBOM · CODE SIGNING]:
Verify software update signatures cryptographically. Use Software Bills of Materials (SBOM). Monitor third-party access continuously. SolarWinds succeeded because nobody verified software build integrity.

════════════════════════════════════════════════════════════════
▌ FUTURE — THE FUTURE OF MILITARY CYBER WARFARE (The Future Battlefield)
════════════════════════════════════════════════════════════════
QUANTUM CRYPTOGRAPHIC WARFARE:
Quantum computers will break RSA-2048 in hours. Nations are in a quantum arms race — preparing post-quantum encryption standards (NIST PQC) while racing to deploy quantum systems to decrypt adversary communications first.

SATELLITE CYBER ATTACKS:
Russia disabled Viasat KA-SAT satellite modems across Ukraine hours before the 2022 invasion — taking out military communications. Space-based cyber warfare is now a confirmed battlefield domain in modern conflicts.

HYPERSONIC + CYBER COMBINATION:
Military doctrine now combines kinetic hypersonic strikes with simultaneous cyber attacks on air defense radar and command networks — blinding defenses digitally while physically destroying them at Mach 10 speeds.

BRAIN-COMPUTER INTERFACE THREATS:
DARPA investing heavily in neural interfaces for soldiers. Future concern: hacking BCIs to alter battlefield perception, transmit false sensor data, or incapacitate operators — cognitive warfare at the hardware level.

════════════════════════════════════════════════════════════════
EDUCATIONAL DISCLAIMER: All content above is strictly for cybersecurity education and awareness. This knowledge base covers publicly documented, historically verified operations from open-source intelligence, leaked documents (Snowden, Shadow Brokers), academic research, and government indictments. Never attempt to replicate any of these techniques without explicit legal authorization.
════════════════════════════════════════════════════════════════
`;
