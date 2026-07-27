/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HackingTool Adapter — Comprehensive offensive security tool suite
 *  Source: hackingtool-master (https://github.com/Z4nzu/hackingtool) v2.0.0
 *
 *  HackingTool is a categorized collection of 300+ security research tools
 *  covering information gathering, exploitation, post-exploitation, forensics,
 *  and more. This adapter exposes the full catalogue as AI-invocable tools.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Static tool catalogue (from hackingtool/tools/*.py) ───────────────────────
export type HackingToolEntry = {
  name: string;
  description: string;
  installCmd?: string;
  runCmd?: string;
  requiresTarget?: boolean;
  platform?: string[];
  repoUrl?: string;
};

export type HackingToolCategory = {
  id: string;
  label: string;
  description: string;
  tools: HackingToolEntry[];
};

export const HACKINGTOOL_CATALOGUE: HackingToolCategory[] = [
  {
    id: "information_gathering",
    label: "Information Gathering",
    description: "OSINT, recon, network mapping, subdomain enum, port scanning",
    tools: [
      { name: "Nmap", description: "Network exploration and port scanning", installCmd: "apt-get install nmap", runCmd: "nmap", requiresTarget: true, repoUrl: "https://github.com/nmap/nmap" },
      { name: "Maltego", description: "Interactive data mining and link analysis", requiresTarget: false },
      { name: "Recon-ng", description: "Full-featured web reconnaissance framework", installCmd: "pip install recon-ng", requiresTarget: true },
      { name: "theHarvester", description: "Email, hostname, subdomain enumeration", installCmd: "pip install theHarvester", requiresTarget: true },
      { name: "Shodan", description: "Search engine for internet-connected devices", requiresTarget: true },
      { name: "Amass", description: "In-depth DNS enumeration and attack surface mapping", requiresTarget: true },
      { name: "Subfinder", description: "Subdomain discovery tool", requiresTarget: true },
      { name: "DNSx", description: "Fast DNS toolkit", requiresTarget: true },
    ],
  },
  {
    id: "password_attacks",
    label: "Password Attacks",
    description: "Brute force, hash cracking, credential stuffing",
    tools: [
      { name: "Hashcat", description: "Advanced CPU/GPU-based hash cracking", runCmd: "hashcat", requiresTarget: true },
      { name: "John the Ripper", description: "Classic password cracker for 100+ hash types", runCmd: "john", requiresTarget: true },
      { name: "Hydra", description: "Online password brute-force tool for 50+ protocols", runCmd: "hydra", requiresTarget: true },
      { name: "Medusa", description: "Parallel network login auditor", requiresTarget: true },
      { name: "CrackMapExec", description: "Swiss army knife for network pentesting", requiresTarget: true },
    ],
  },
  {
    id: "wireless_attacks",
    label: "Wireless Attacks",
    description: "WiFi cracking, WPS attacks, rogue AP, packet injection",
    tools: [
      { name: "Aircrack-ng", description: "WiFi network security assessment suite", runCmd: "aircrack-ng", requiresTarget: true },
      { name: "Wifite", description: "Automated wireless auditor", runCmd: "wifite", requiresTarget: false },
      { name: "Kismet", description: "Wireless network detector and sniffer", requiresTarget: false },
      { name: "Bully", description: "WPS brute force attack tool", requiresTarget: true },
      { name: "Fluxion", description: "MITM WPA attack framework", requiresTarget: true },
    ],
  },
  {
    id: "web_attacks",
    label: "Web Application Attacks",
    description: "Vulnerability scanning, fuzzing, directory enumeration, API testing",
    tools: [
      { name: "Burp Suite", description: "Web security testing platform", requiresTarget: true },
      { name: "OWASP ZAP", description: "Open-source web application scanner", requiresTarget: true },
      { name: "Nikto", description: "Web server vulnerability scanner", runCmd: "nikto", requiresTarget: true },
      { name: "Gobuster", description: "Directory/file/DNS/vhost bruteforcer", runCmd: "gobuster", requiresTarget: true },
      { name: "ffuf", description: "Fast web fuzzer", runCmd: "ffuf", requiresTarget: true },
      { name: "Feroxbuster", description: "Recursive content discovery tool", requiresTarget: true },
      { name: "Wfuzz", description: "Web application fuzzer", requiresTarget: true },
    ],
  },
  {
    id: "sql_injection",
    label: "SQL Injection",
    description: "Automated SQLi detection and exploitation",
    tools: [
      { name: "SQLMap", description: "Automatic SQL injection and database takeover", runCmd: "sqlmap", requiresTarget: true, repoUrl: "https://github.com/sqlmapproject/sqlmap" },
      { name: "BBQSQL", description: "Blind SQL injection exploitation tool", requiresTarget: true },
      { name: "NoSQLMap", description: "Automated NoSQL injection and MongoDB attacks", requiresTarget: true },
    ],
  },
  {
    id: "phishing_attacks",
    label: "Phishing Attacks",
    description: "Social engineering, credential harvesting, spear phishing",
    tools: [
      { name: "SET (Social Engineering Toolkit)", description: "Open-source social engineering framework", runCmd: "setoolkit", requiresTarget: false },
      { name: "King-Phisher", description: "Phishing campaign toolkit", requiresTarget: false },
      { name: "Gophish", description: "Open-source phishing simulation framework", requiresTarget: false },
      { name: "Evilginx2", description: "MITM attack framework for phishing 2FA", requiresTarget: true },
    ],
  },
  {
    id: "post_exploitation",
    label: "Post Exploitation",
    description: "Privilege escalation, persistence, lateral movement, data exfiltration",
    tools: [
      { name: "Metasploit Framework", description: "Advanced penetration testing platform", runCmd: "msfconsole", requiresTarget: true },
      { name: "Empire", description: "Post-exploitation PowerShell and Python framework", requiresTarget: true },
      { name: "Covenant", description: ".NET C2 framework", requiresTarget: true },
      { name: "Sliver", description: "Cross-platform adversary simulation C2", requiresTarget: true },
      { name: "Mimikatz", description: "Windows credential extraction", requiresTarget: true, platform: ["windows"] },
    ],
  },
  {
    id: "exploit_frameworks",
    label: "Exploit Frameworks",
    description: "Vulnerability exploitation, CVE databases, shellcode generation",
    tools: [
      { name: "Metasploit", description: "World's most used penetration testing framework", repoUrl: "https://github.com/rapid7/metasploit-framework" },
      { name: "Exploit-DB", description: "Comprehensive archive of public exploits and shellcode", repoUrl: "https://github.com/offensive-security/exploitdb" },
      { name: "RouterSploit", description: "Exploitation framework for embedded devices", requiresTarget: true },
      { name: "BeEF", description: "Browser Exploitation Framework", requiresTarget: true },
      { name: "BetterCAP", description: "Swiss army knife for network attacks and monitoring", requiresTarget: true },
    ],
  },
  {
    id: "forensics",
    label: "Forensics & Analysis",
    description: "Memory forensics, disk imaging, log analysis, malware analysis",
    tools: [
      { name: "Volatility", description: "Memory forensics framework", runCmd: "vol.py", requiresTarget: false },
      { name: "Autopsy", description: "Digital forensics platform", requiresTarget: false },
      { name: "Wireshark", description: "Network protocol analyser", runCmd: "wireshark", requiresTarget: false },
      { name: "Foremost", description: "File carving and data recovery", requiresTarget: false },
      { name: "Binwalk", description: "Firmware analysis and extraction tool", runCmd: "binwalk", requiresTarget: false },
      { name: "Ghidra", description: "NSA reverse engineering suite", requiresTarget: false },
    ],
  },
  {
    id: "payload_creator",
    label: "Payload Creation",
    description: "Shellcode, exploit payloads, obfuscation, bypass tools",
    tools: [
      { name: "MSFvenom", description: "Payload generator and encoder", runCmd: "msfvenom", requiresTarget: false },
      { name: "Veil", description: "Tool for generating AV-evasion payloads", requiresTarget: false },
      { name: "Shellter", description: "Dynamic shellcode injection tool", requiresTarget: false, platform: ["windows"] },
    ],
  },
  {
    id: "reverse_engineering",
    label: "Reverse Engineering",
    description: "Disassembly, decompilation, binary analysis, debugging",
    tools: [
      { name: "Ghidra", description: "NSA's open-source SRE framework", requiresTarget: false },
      { name: "Radare2", description: "Unix-like reverse engineering framework", runCmd: "r2", requiresTarget: false },
      { name: "IDA Pro (Free)", description: "Interactive disassembler", requiresTarget: false },
      { name: "x64dbg", description: "Open-source x64/x32 debugger", platform: ["windows"] },
      { name: "OllyDbg", description: "32-bit assembler level debugger", platform: ["windows"] },
      { name: "Binary Ninja", description: "Binary analysis platform", requiresTarget: false },
    ],
  },
  {
    id: "ddos",
    label: "DDoS Testing",
    description: "Stress testing, load generation, flood tools",
    tools: [
      { name: "LOIC", description: "Low Orbit Ion Cannon — stress testing tool", requiresTarget: true },
      { name: "hping3", description: "TCP/IP packet assembler and analyser", runCmd: "hping3", requiresTarget: true },
      { name: "SlowHTTPTest", description: "Application-layer DoS attack tool", requiresTarget: true },
    ],
  },
  {
    id: "cloud_security",
    label: "Cloud Security",
    description: "AWS/GCP/Azure misconfig scanning, IAM analysis, S3 bucket tools",
    tools: [
      { name: "Pacu", description: "AWS exploitation framework", requiresTarget: true },
      { name: "CloudMapper", description: "AWS environment visualiser and auditor", requiresTarget: true },
      { name: "ScoutSuite", description: "Multi-cloud security auditing tool", requiresTarget: true },
      { name: "Prowler", description: "AWS/GCP/Azure security assessment tool", requiresTarget: true },
      { name: "Trivy", description: "Container and cloud config vulnerability scanner", requiresTarget: true },
    ],
  },
  {
    id: "mobile_security",
    label: "Mobile Security",
    description: "Android/iOS app analysis, APK reversing, mobile pentesting",
    tools: [
      { name: "MobSF", description: "Mobile Security Framework — static & dynamic analysis", requiresTarget: false },
      { name: "Frida", description: "Dynamic instrumentation toolkit", runCmd: "frida", requiresTarget: true },
      { name: "Objection", description: "Runtime mobile exploration framework built on Frida", requiresTarget: true },
      { name: "apktool", description: "Android APK reverse engineering tool", runCmd: "apktool", requiresTarget: false },
      { name: "jadx", description: "Dex to Java decompiler", requiresTarget: false },
    ],
  },
  {
    id: "xss_attack",
    label: "XSS Attacks",
    description: "Cross-site scripting detection and exploitation",
    tools: [
      { name: "XSStrike", description: "Advanced XSS detection suite", requiresTarget: true },
      { name: "XSS Hunter", description: "XSS payload management and blind XSS detection", requiresTarget: true },
      { name: "Dalfox", description: "Powerful XSS scanning and parameter analysis", requiresTarget: true },
    ],
  },
  {
    id: "active_directory",
    label: "Active Directory",
    description: "AD enumeration, Kerberoasting, BloodHound, DCSync attacks",
    tools: [
      { name: "BloodHound", description: "AD attack path analysis tool", requiresTarget: true },
      { name: "Impacket", description: "Python classes for network protocols — AD attacks", requiresTarget: true },
      { name: "Rubeus", description: "C# toolset for Kerberos interaction", requiresTarget: true, platform: ["windows"] },
      { name: "CrackMapExec", description: "Active Directory Swiss army knife", requiresTarget: true },
      { name: "PowerView", description: "PowerShell recon tool for AD environments", requiresTarget: true, platform: ["windows"] },
    ],
  },
  {
    id: "steganography",
    label: "Steganography",
    description: "Hide/extract data in images, audio, and other media",
    tools: [
      { name: "Steghide", description: "Data hiding in JPEG/BMP/WAV/AU", runCmd: "steghide", requiresTarget: false },
      { name: "OpenStego", description: "Digital watermarking and data hiding", requiresTarget: false },
      { name: "Snow", description: "Whitespace steganography tool", requiresTarget: false },
    ],
  },
  {
    id: "wordlist_generator",
    label: "Wordlist Generation",
    description: "Custom wordlist and password mutation tools",
    tools: [
      { name: "Crunch", description: "Wordlist generator from user-defined character sets", runCmd: "crunch", requiresTarget: false },
      { name: "CUPP", description: "Common User Passwords Profiler", requiresTarget: false },
      { name: "CeWL", description: "Custom wordlist generator from target website", requiresTarget: true },
    ],
  },
];

// ── Driver ────────────────────────────────────────────────────────────────────
export type HackingToolDriver = {
  install(toolName: string): Promise<{ success: boolean; log: string }>;
  run(toolName: string, args: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
};

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const HACKINGTOOL_TOOL_SCHEMAS = {
  ht_list_categories: {
    name: "ht_list_categories",
    description: "List all HackingTool security categories with descriptions and tool counts.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  ht_list_tools: {
    name: "ht_list_tools",
    description: "List all tools within a specific HackingTool category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category ID (e.g. information_gathering, sql_injection, forensics)" },
      },
      required: ["category"],
    },
  },
  ht_search_tools: {
    name: "ht_search_tools",
    description: "Full-text search across all HackingTool tools by name or description.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
      },
      required: ["query"],
    },
  },
  ht_install_tool: {
    name: "ht_install_tool",
    description: "Install a specific tool from the HackingTool catalogue.",
    inputSchema: {
      type: "object",
      properties: {
        toolName: { type: "string", description: "Exact tool name (e.g. 'SQLMap', 'Nmap')" },
      },
      required: ["toolName"],
    },
  },
  ht_run_tool: {
    name: "ht_run_tool",
    description: "Run a HackingTool suite tool with arguments. Returns stdout/stderr.",
    inputSchema: {
      type: "object",
      properties: {
        toolName: { type: "string", description: "Tool name (e.g. 'nmap', 'sqlmap')" },
        args: { type: "string", description: "CLI arguments as a single string (e.g. '-sV 192.168.1.1')" },
        cwd: { type: "string", description: "Working directory" },
      },
      required: ["toolName", "args"],
    },
  },
  ht_get_tool_info: {
    name: "ht_get_tool_info",
    description: "Get detailed information about a specific tool: description, install command, run command, repo URL.",
    inputSchema: {
      type: "object",
      properties: {
        toolName: { type: "string", description: "Tool name" },
      },
      required: ["toolName"],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class HackingToolAdapter {
  private readonly toolIndex: Map<string, { category: string; tool: HackingToolEntry }> = new Map();

  constructor(private readonly driver?: HackingToolDriver) {
    // Build a flat name→{category,tool} index on construction
    for (const cat of HACKINGTOOL_CATALOGUE) {
      for (const tool of cat.tools) {
        this.toolIndex.set(tool.name.toLowerCase(), { category: cat.id, tool });
      }
    }
  }

  async listCategories(call: ToolCall): Promise<ToolResult> {
    return {
      callId: call.id,
      ok: true,
      output: HACKINGTOOL_CATALOGUE.map(c => ({
        id: c.id,
        label: c.label,
        description: c.description,
        toolCount: c.tools.length,
      })) as unknown as JsonValue,
    };
  }

  async listTools(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { category: string };
    const cat = HACKINGTOOL_CATALOGUE.find(c => c.id === input.category);
    if (!cat) {
      return { callId: call.id, ok: false, output: null, error: `Unknown category: "${input.category}". Use ht_list_categories first.` };
    }
    return { callId: call.id, ok: true, output: cat.tools as unknown as JsonValue };
  }

  async searchTools(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { query: string };
    const q = input.query.toLowerCase();
    const matches: Array<{ category: string; categoryLabel: string } & HackingToolEntry> = [];
    for (const cat of HACKINGTOOL_CATALOGUE) {
      for (const tool of cat.tools) {
        if (tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q)) {
          matches.push({ ...tool, category: cat.id, categoryLabel: cat.label });
        }
      }
    }
    return { callId: call.id, ok: true, output: matches as unknown as JsonValue };
  }

  async getToolInfo(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { toolName: string };
    const entry = this.toolIndex.get(input.toolName.toLowerCase());
    if (!entry) {
      return { callId: call.id, ok: false, output: null, error: `Tool "${input.toolName}" not found in catalogue.` };
    }
    return { callId: call.id, ok: true, output: { category: entry.category, ...entry.tool } as unknown as JsonValue };
  }

  async installTool(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { toolName: string };
    if (!this.driver) {
      const entry = this.toolIndex.get(input.toolName.toLowerCase());
      return {
        callId: call.id, ok: true,
        output: {
          status: "queued",
          toolName: input.toolName,
          installCmd: entry?.tool.installCmd ?? `apt-get install ${input.toolName.toLowerCase()}`,
          message: "Install queued. Connect a subprocess driver to execute.",
        } as unknown as JsonValue,
      };
    }
    const result = await this.driver.install(input.toolName);
    return { callId: call.id, ok: result.success, output: { log: result.log } as unknown as JsonValue };
  }

  async runTool(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { toolName: string; args: string; cwd?: string };
    if (!this.driver) {
      return {
        callId: call.id, ok: true,
        output: { status: "queued", toolName: input.toolName, args: input.args, message: "Run queued. Connect a subprocess driver." } as unknown as JsonValue,
      };
    }
    const result = await this.driver.run(input.toolName, input.args, input.cwd);
    return {
      callId: call.id,
      ok: result.exitCode === 0,
      output: { stdout: result.stdout, stderr: result.stderr } as unknown as JsonValue,
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "ht_list_categories": return this.listCategories(call);
      case "ht_list_tools":      return this.listTools(call);
      case "ht_search_tools":    return this.searchTools(call);
      case "ht_install_tool":    return this.installTool(call);
      case "ht_run_tool":        return this.runTool(call);
      case "ht_get_tool_info":   return this.getToolInfo(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `HackingToolAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(HACKINGTOOL_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
