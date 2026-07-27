/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Awesome Hacking Adapter — Curated security research resource library
 *  Source: Awesome-Hacking-master (https://github.com/Hack-with-Github/Awesome-Hacking)
 *
 *  A searchable in-memory index of 50+ curated "awesome" GitHub repositories
 *  covering every domain of offensive/defensive security. The AI can query this
 *  to discover the best tools and resources for any security task.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Resource entry type ───────────────────────────────────────────────────────
export interface AwesomeResource {
  name: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
}

// ── Full resource catalogue (extracted from Awesome-Hacking README) ───────────
export const AWESOME_HACKING_RESOURCES: AwesomeResource[] = [
  // Platform / OS
  { name: "Android Security",       url: "https://github.com/ashishb/android-security-awesome",         description: "Collection of Android security related resources",                                          category: "mobile",      tags: ["android", "mobile", "apk", "frida"] },
  { name: "iOS Security",           url: "https://github.com/ashishb/osx-and-ios-security-awesome",     description: "OSX and iOS related security tools",                                                        category: "mobile",      tags: ["ios", "osx", "mobile", "jailbreak"] },
  { name: "Linux Kernel Exploits",  url: "https://github.com/SecWiki/linux-kernel-exploits",             description: "Linux kernel CVEs with PoC",                                                                category: "exploitation", tags: ["linux", "kernel", "privesc", "exploit"] },
  { name: "Windows Exploits",       url: "https://github.com/SecWiki/windows-kernel-exploits",          description: "Windows kernel vulnerabilities with PoC exploits",                                          category: "exploitation", tags: ["windows", "kernel", "privesc", "exploit"] },
  // Application
  { name: "AppSec",                 url: "https://github.com/paragonie/awesome-appsec",                  description: "Resources for learning about application security",                                         category: "appsec",      tags: ["web", "appsec", "secure-coding", "owasp"] },
  { name: "Web Security",           url: "https://github.com/qazbnm456/awesome-web-security",            description: "Curated list of web security materials and resources",                                      category: "appsec",      tags: ["web", "xss", "sqli", "csrf", "ssrf"] },
  { name: "API Security",           url: "https://github.com/arainho/awesome-api-security",              description: "Collection of API Security tools and resources",                                            category: "appsec",      tags: ["api", "rest", "graphql", "oauth"] },
  // Recon / OSINT
  { name: "Asset Discovery",        url: "https://github.com/redhuntlabs/Awesome-Asset-Discovery",       description: "Resources for asset discovery phase of security assessments",                               category: "recon",       tags: ["osint", "recon", "subdomain", "asset-discovery"] },
  { name: "OSINT",                  url: "https://github.com/jivoi/awesome-osint",                       description: "Awesome list of OSINT tools and techniques",                                                category: "recon",       tags: ["osint", "recon", "intelligence", "scraping"] },
  { name: "Threat Intelligence",    url: "https://github.com/hslatman/awesome-threat-intelligence",      description: "A curated list of awesome Threat Intelligence resources",                                   category: "threat-intel", tags: ["threat-intel", "ioc", "misp", "stix"] },
  // Bug Bounty
  { name: "Bug Bounty",             url: "https://github.com/djadmin/awesome-bug-bounty",                description: "List of Bug Bounty Programs and write-ups",                                                 category: "bug-bounty",  tags: ["bug-bounty", "bounty", "hackerone", "bugcrowd"] },
  { name: "Bug Bounty Resources",   url: "https://github.com/nahamsec/Resources-for-Beginner-Bug-Bounty-Hunters", description: "Resources for beginner bug bounty hunters",                                  category: "bug-bounty",  tags: ["bug-bounty", "beginner", "recon", "methodology"] },
  // CTF / Challenges
  { name: "CTF",                    url: "https://github.com/apsdehal/awesome-ctf",                      description: "Curated list of CTF frameworks, libraries, resources and tools",                           category: "ctf",         tags: ["ctf", "competition", "forensics", "crypto"] },
  { name: "CTF Writeups",           url: "https://github.com/ctfs/write-ups-2014",                       description: "CTF write-ups, solutions, hints, and tools",                                                category: "ctf",         tags: ["ctf", "writeup", "challenge"] },
  // Vulnerability Research
  { name: "CVE PoCs",               url: "https://github.com/qazbnm456/awesome-cve-poc",                 description: "Curated list of CVE PoCs",                                                                  category: "vulns",       tags: ["cve", "poc", "exploit", "vulnerability"] },
  { name: "Exploit Development",    url: "https://github.com/FabioBaroni/awesome-exploit-development",   description: "Resources for learning about exploit development",                                          category: "exploitation", tags: ["exploit", "shellcode", "rop", "heap"] },
  { name: "Fuzzing",                url: "https://github.com/secfigo/Awesome-Fuzzing",                    description: "List of fuzzing books, courses, tools, use cases, and writeups",                           category: "vulns",       tags: ["fuzzing", "afl", "libfuzzer", "bug-finding"] },
  // Malware / Reverse Engineering
  { name: "Malware Analysis",       url: "https://github.com/rshipp/awesome-malware-analysis",           description: "Malware analysis tools and resources",                                                      category: "malware",     tags: ["malware", "reverse-engineering", "sandbox", "yara"] },
  { name: "Reversing",              url: "https://github.com/tylerha97/awesome-reversing",                description: "List of awesome reversing resources",                                                       category: "malware",     tags: ["reversing", "disassembly", "ghidra", "ida"] },
  // Network / Infrastructure
  { name: "Network Analysis",       url: "https://github.com/raboof/nethogs",                             description: "Network traffic analysis tools",                                                            category: "network",     tags: ["network", "traffic", "pcap", "wireshark"] },
  { name: "Honeypots",              url: "https://github.com/paralax/awesome-honeypots",                  description: "List of honeypot resources, tools, components and more",                                    category: "network",     tags: ["honeypot", "detection", "deception", "canary"] },
  { name: "Cellular Hacking",       url: "https://github.com/W00t3k/Awesome-Cellular-Hacking",           description: "Security research in the 3G/4G/5G cellular space",                                         category: "network",     tags: ["cellular", "5g", "4g", "baseband", "radio"] },
  // Cloud / DevSecOps
  { name: "Cloud Security",         url: "https://github.com/4ndersonLin/awesome-cloud-security",         description: "Awesome cloud security resources",                                                          category: "cloud",       tags: ["cloud", "aws", "gcp", "azure", "iam"] },
  { name: "DevSecOps",              url: "https://github.com/TaptuIT/awesome-devsecops",                  description: "Resources for integrating security into DevOps workflows",                                  category: "cloud",       tags: ["devsecops", "ci-cd", "sast", "dast", "iac"] },
  { name: "Container Security",     url: "https://github.com/kai5263499/container-security-awesome",      description: "Container and Kubernetes security resources",                                               category: "cloud",       tags: ["docker", "kubernetes", "container", "k8s"] },
  // Cryptography
  { name: "Cryptography",           url: "https://github.com/sobolevn/awesome-cryptography",              description: "Cryptography resources and tools",                                                          category: "crypto",      tags: ["crypto", "encryption", "hash", "tls", "pki"] },
  // Social Engineering
  { name: "Social Engineering",     url: "https://github.com/v2-dev/awesome-social-engineering",         description: "List of awesome social engineering resources",                                              category: "social-eng",  tags: ["social-engineering", "phishing", "pretexting", "vishing"] },
  // Incident Response / Forensics
  { name: "Incident Response",      url: "https://github.com/meirwah/awesome-incident-response",         description: "List of tools and resources for incident responders",                                       category: "dfir",        tags: ["incident-response", "forensics", "dfir", "ioc"] },
  { name: "PCAP Tools",             url: "https://github.com/caesar0301/awesome-pcaptools",                description: "Tools for processing network traces and PCAP files",                                       category: "dfir",        tags: ["pcap", "network-forensics", "wireshark", "snort"] },
  // Hacking Resources / Collections
  { name: "Hacking",                url: "https://github.com/carpedm20/awesome-hacking",                  description: "List of awesome Hacking tutorials, tools and resources",                                    category: "general",     tags: ["hacking", "pentesting", "tutorials", "tools"] },
  { name: "Hacking Resources",      url: "https://github.com/vitalysim/Awesome-Hacking-Resources",       description: "Collection of hacking/penetration testing resources",                                       category: "general",     tags: ["hacking", "resources", "learning", "pentesting"] },
  { name: "Red Teaming",            url: "https://github.com/yeyintminthuhtut/Awesome-Red-Teaming",      description: "List of awesome red teaming resources",                                                     category: "red-team",    tags: ["red-team", "adversarial", "evasion", "c2"] },
  { name: "Blue Team",              url: "https://github.com/fabacab/awesome-cybersecurity-blueteam",     description: "Resources for blue team, SOC, and defensive security",                                     category: "blue-team",   tags: ["blue-team", "soc", "siem", "edr", "detection"] },
  { name: "Security Talks",         url: "https://github.com/PaulSec/awesome-sec-talks",                  description: "Collected list of awesome security talks",                                                  category: "learning",    tags: ["talks", "conferences", "defcon", "blackhat"] },
  { name: "Security Newsletters",   url: "https://github.com/TalEliyahu/awesome-security-newsletters",   description: "Periodic security newsletters, blogs, and podcast resources",                               category: "learning",    tags: ["newsletters", "blog", "podcast", "news"] },
  { name: "Pentest Cheat Sheets",   url: "https://github.com/coreb1t/awesome-pentest-cheat-sheets",      description: "Collection of cheat sheets for penetration testing",                                        category: "general",     tags: ["cheatsheet", "pentest", "reference", "commands"] },
  { name: "Security Checklists",    url: "https://github.com/netbiosX/Checklists",                        description: "Penetration testing checklists for various assessment types",                               category: "general",     tags: ["checklist", "methodology", "pentest", "assessment"] },
  { name: "ICS/SCADA Security",     url: "https://github.com/hslatman/awesome-industrial-control-system-security", description: "Industrial control system security resources",                              category: "ics",         tags: ["ics", "scada", "ot", "industrial", "critical-infrastructure"] },
  { name: "Vehicle Security",       url: "https://github.com/jaredthecoder/awesome-vehicle-security",    description: "Resources for car security research",                                                       category: "hardware",    tags: ["vehicle", "car", "can-bus", "automotive"] },
  { name: "Hardware Hacking",       url: "https://github.com/nebgnahz/awesome-iot-hacks",                 description: "Collection of hacks in IoT space",                                                         category: "hardware",    tags: ["iot", "hardware", "firmware", "embedded"] },
  { name: "Lockpicking",            url: "https://github.com/fabacab/awesome-lockpicking",                description: "Lockpicking guides, tools, and resources",                                                  category: "physical",    tags: ["lockpicking", "physical", "bypass", "access-control"] },
];

// Build category index
const _categoryIndex = new Map<string, AwesomeResource[]>();
for (const r of AWESOME_HACKING_RESOURCES) {
  if (!_categoryIndex.has(r.category)) _categoryIndex.set(r.category, []);
  _categoryIndex.get(r.category)!.push(r);
}

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const AWESOME_HACKING_TOOL_SCHEMAS = {
  ah_list_categories: {
    name: "ah_list_categories",
    description: "List all Awesome Hacking resource categories with resource counts.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  ah_get_by_category: {
    name: "ah_get_by_category",
    description: "Get all curated security resources within a specific category.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Category name (e.g. mobile, appsec, recon, exploitation, malware, cloud, red-team, blue-team)",
        },
      },
      required: ["category"],
    },
  },
  ah_search: {
    name: "ah_search",
    description: "Search the Awesome Hacking catalogue by keyword across names, descriptions, and tags.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (e.g. 'fuzzing', 'android apk', 'kernel exploit')" },
        limit: { type: "number", description: "Maximum results to return (default: 10)" },
      },
      required: ["query"],
    },
  },
  ah_get_resource: {
    name: "ah_get_resource",
    description: "Get details for a specific Awesome Hacking resource by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Resource name (e.g. 'CTF', 'Malware Analysis')" },
      },
      required: ["name"],
    },
  },
  ah_recommend: {
    name: "ah_recommend",
    description: "Get curated resource recommendations for a specific security task or goal.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Security task description (e.g. 'I want to learn web app pentesting')" },
        limit: { type: "number", description: "Max recommendations (default: 5)" },
      },
      required: ["task"],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class AwesomeHackingAdapter {
  async listCategories(call: ToolCall): Promise<ToolResult> {
    const categories = Array.from(_categoryIndex.entries()).map(([id, resources]) => ({
      id,
      count: resources.length,
      tags: [...new Set(resources.flatMap(r => r.tags))].slice(0, 6),
    }));
    return { callId: call.id, ok: true, output: categories as unknown as JsonValue };
  }

  async getByCategory(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { category: string };
    const resources = _categoryIndex.get(input.category);
    if (!resources) {
      const available = Array.from(_categoryIndex.keys()).join(", ");
      return { callId: call.id, ok: false, output: null, error: `Category "${input.category}" not found. Available: ${available}` };
    }
    return { callId: call.id, ok: true, output: resources as unknown as JsonValue };
  }

  async search(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { query: string; limit?: number };
    const q = input.query.toLowerCase();
    const limit = input.limit ?? 10;
    const results = AWESOME_HACKING_RESOURCES.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some(t => t.includes(q))
    ).slice(0, limit);
    return { callId: call.id, ok: true, output: results as unknown as JsonValue };
  }

  async getResource(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { name: string };
    const resource = AWESOME_HACKING_RESOURCES.find(
      r => r.name.toLowerCase() === input.name.toLowerCase()
    );
    if (!resource) return { callId: call.id, ok: false, output: null, error: `Resource "${input.name}" not found.` };
    return { callId: call.id, ok: true, output: resource as unknown as JsonValue };
  }

  async recommend(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { task: string; limit?: number };
    const q = input.task.toLowerCase();
    const limit = input.limit ?? 5;
    // Score by tag/description overlap
    const scored = AWESOME_HACKING_RESOURCES.map(r => {
      let score = 0;
      if (r.description.toLowerCase().includes(q)) score += 3;
      r.tags.forEach(t => { if (q.includes(t) || t.includes(q.split(" ")[0])) score += 2; });
      if (r.name.toLowerCase().includes(q)) score += 1;
      return { ...r, score };
    });
    const top = scored.sort((a, b) => b.score - a.score).filter(r => r.score > 0).slice(0, limit);
    return { callId: call.id, ok: true, output: top as unknown as JsonValue };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "ah_list_categories": return this.listCategories(call);
      case "ah_get_by_category": return this.getByCategory(call);
      case "ah_search":          return this.search(call);
      case "ah_get_resource":    return this.getResource(call);
      case "ah_recommend":       return this.recommend(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `AwesomeHackingAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(AWESOME_HACKING_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
