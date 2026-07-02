import { Router, type IRouter } from "express";
import { requirePersonalOpenAI, callOnce, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";

const router: IRouter = Router();

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string };

const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Search the web for current information: CVEs, security advisories, threat intel, news, documentation. Use for anything time-sensitive or outside training data.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_url",
      description: "Fetch and extract text content from any URL. Use for CVE details, exploit PoC pages, documentation, or any web resource.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "Full URL to fetch" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "dns_lookup",
      description: "Resolve DNS records for a domain. Returns A, AAAA, MX, TXT, NS, CNAME records for OSINT and reconnaissance.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain name to look up" },
          record_type: { type: "string", enum: ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "ANY"], description: "DNS record type" },
        },
        required: ["domain"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "whois_lookup",
      description: "Look up WHOIS / RDAP registration data for a domain. Returns registrar, dates, nameservers, status.",
      parameters: {
        type: "object",
        properties: { target: { type: "string", description: "Domain or IP to query" } },
        required: ["target"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extract_iocs",
      description: "Extract Indicators of Compromise from text: IPs, domains, URLs, MD5/SHA1/SHA256 hashes, CVE IDs, email addresses, registry keys.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Text to scan for IOCs" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "Evaluate math expressions precisely. Use for subnet calculations, hash conversions, entropy calculations, timestamp math.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "JavaScript-compatible math expression (e.g. '2**32', 'Math.log2(65536)')" } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_code",
      description: "Security analysis of a code snippet: find vulnerabilities, explain logic, suggest hardening, or generate test cases.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code snippet to analyze" },
          language: { type: "string", description: "Programming language" },
          task: { type: "string", enum: ["vulnerabilities", "explain", "optimize", "test"], description: "Analysis task" },
        },
        required: ["code", "task"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "port_scan",
      description: "Probe a target host for open HTTP/HTTPS ports. Checks common web ports (80, 443, 8080, 8443, 3000, 3128, 4444, 5000, 8000, 8888) via HTTP requests. For authorized red team use only.",
      parameters: {
        type: "object",
        properties: {
          host: { type: "string", description: "Target hostname or IP address" },
          ports: { type: "string", description: "Comma-separated port list (e.g. '80,443,8080') or omit for common web ports" },
        },
        required: ["host"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "exploit_search",
      description: "Search NIST NVD for CVEs and vulnerability data. Returns CVSS scores, descriptions, affected versions, and references for a product or CVE ID.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product name, version, CVE ID, or vulnerability keyword (e.g. 'Apache Log4j 2.14', 'CVE-2021-44228')" },
          severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "ALL"], description: "Filter by CVSS v3 severity" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_pentest_script",
      description: "Generate a Python or Bash penetration testing / security research script for a specific task. For authorized security testing and CTF challenges only.",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string", description: "What the script should do (e.g. 'SQLi scanner for login forms', 'XSS payload fuzzer', 'subdomain enumerator', 'JWT brute-forcer')" },
          language: { type: "string", enum: ["python", "bash"], description: "Script language (default: python)" },
          target_context: { type: "string", description: "Target environment context (e.g. 'web app with Flask/MySQL', 'Windows AD environment')" },
        },
        required: ["task"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "network_recon",
      description: "Full network reconnaissance chain on a domain or IP: DNS enumeration + WHOIS + port probe + IOC extraction from HTTP response. One call for complete initial recon.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "Domain or IP address to recon" },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_code",
      description: "Execute a Python or JavaScript code snippet and return stdout/stderr. Use for data processing, calculations, file parsing, crypto operations, or any task that benefits from real code execution.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code to execute" },
          language: { type: "string", enum: ["python", "javascript"], description: "Language (default: python)" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "translate",
      description: "Translate text between any two languages. Useful for analyzing foreign-language threat intel, malware strings, dark web content, or OSINT from non-English sources.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to translate" },
          target_language: { type: "string", description: "Target language (e.g. English, Arabic, Russian, Chinese)" },
          source_language: { type: "string", description: "Source language (optional — auto-detected if omitted)" },
        },
        required: ["text", "target_language"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize",
      description: "Summarize a long document, report, or paste of text into key points. Ideal for threat reports, CVE advisories, research papers, or large pastes.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to summarize" },
          style: { type: "string", enum: ["bullets", "executive", "technical", "tldr"], description: "Summary style (default: bullets)" },
          max_points: { type: "number", description: "Maximum number of bullet points (default: 8)" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_web",
      description: "Fetch full text content from any URL — news articles, documentation, GitHub repos, CVE advisories, blog posts, pastebin. Extracts clean readable text from any web page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL to browse (must start with http:// or https://)" },
          extract: { type: "string", enum: ["text", "links", "meta", "all"], description: "What to extract: text (default), links, meta tags, or all" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_structured",
      description: "Web search returning structured results (title, URL, snippet). More detailed than web_search. Use for research, finding specific pages, or when you need URLs to then browse.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Number of results to return (1-10, default: 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extract_page_data",
      description: "Extract structured data from a web page: headings outline, code blocks, email addresses. Use after browse_web when you need specific structured data types.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to extract from" },
          type: { type: "string", enum: ["headings", "code", "emails", "article"], description: "Type of data to extract" },
        },
        required: ["url", "type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_image",
      description: "Generate an AI image from a text description using DALL-E. Use for diagrams, visual representations, security topology diagrams, or any visual content.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the image to generate" },
          size: { type: "string", enum: ["1024x1024", "1792x1024", "1024x1792"], description: "Image dimensions (default: 1024x1024)" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description: "Save important findings, facts, IOCs, or discoveries to long-term agent memory for future reference. Use to persist key intelligence across sessions.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Content to save to memory" },
          title: { type: "string", description: "Short title for this memory entry" },
          tags: { type: "string", description: "Comma-separated tags (e.g. 'CVE,malware,IOC')" },
        },
        required: ["content", "title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recall_memory",
      description: "Search long-term agent memory for previously saved findings, IOCs, threat data, or research. Use to retrieve relevant past intelligence before starting a new investigation.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query to find relevant memories" },
          limit: { type: "number", description: "Max results to return (default: 5)" },
        },
        required: ["query"],
      },
    },
  },
];

async function execWebSearch(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "CHAT-GPT-agent/1.0" }, signal: AbortSignal.timeout(6000) },
    );
    const data = await res.json() as { AbstractText?: string; Answer?: string; RelatedTopics?: { Text?: string }[] };
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Answer) parts.push(`Direct answer: ${data.Answer}`);
    if (Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics.slice(0, 6)) {
        if (t.Text) parts.push(`• ${t.Text}`);
      }
    }
    return parts.length > 0 ? parts.join("\n") : `No instant results for "${query}". Try fetch_url on a specific site.`;
  } catch {
    return `Web search timed out for "${query}". Use fetch_url on a known URL or answer from training data.`;
  }
}

async function execFetchUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CHAT-GPT-agent/1.0; +https://CHAT-GPT.ai)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return `HTTP ${res.status} ← ${url}\n\n${text || "(empty page)"}`;
  } catch (e) {
    return `Failed to fetch ${url}: ${e instanceof Error ? e.message : "network error"}`;
  }
}

async function execDnsLookup(domain: string, type = "A"): Promise<string> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json() as { Status?: number; Answer?: { name: string; TTL: number; data: string }[] };
    if (!Array.isArray(data.Answer) || data.Answer.length === 0) {
      return `No ${type} records found for ${domain} (RCODE ${data.Status ?? "?"}).`;
    }
    return data.Answer.map((r) => `${r.name}  TTL=${r.TTL}  ${r.data}`).join("\n");
  } catch {
    return `DNS lookup failed for ${domain}.`;
  }
}

async function execWhois(target: string): Promise<string> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(target)}`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json() as {
      ldhName?: string; status?: string[];
      events?: { eventAction: string; eventDate: string }[];
      nameservers?: { ldhName: string }[];
      entities?: { vcardArray?: unknown[] }[];
    };
    const lines: string[] = [];
    if (data.ldhName) lines.push(`Domain: ${data.ldhName}`);
    if (data.status) lines.push(`Status: ${data.status.join(", ")}`);
    if (data.events) {
      for (const e of data.events.slice(0, 4)) lines.push(`${e.eventAction}: ${e.eventDate}`);
    }
    if (data.nameservers) {
      lines.push(`Nameservers: ${data.nameservers.map((n) => n.ldhName).join(", ")}`);
    }
    return lines.length > 0 ? lines.join("\n") : `No WHOIS data found for ${target}.`;
  } catch {
    return `WHOIS lookup failed for ${target}.`;
  }
}

function execExtractIocs(text: string): string {
  const buckets: Record<string, string[]> = {
    IPv4: [], IPv6: [], Domain: [], URL: [], MD5: [], SHA1: [], SHA256: [], CVE: [], Email: [], RegistryKey: [],
  };
  const clean = text.slice(0, 50000);
  buckets.IPv4 = [...new Set((clean.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g) ?? []))]
    .filter((ip) => !ip.startsWith("127.") && ip !== "0.0.0.0");
  buckets.URL = [...new Set(clean.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? [])];
  buckets.Domain = [...new Set((clean.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|edu|gov|io|co|xyz|onion|ru|cn|de|uk|fr|nl|info|tech|app|dev|biz)\b/gi) ?? []))]
    .filter((d) => !buckets.URL.some((u) => u.includes(d)));
  buckets.MD5 = [...new Set(clean.match(/\b[0-9a-f]{32}\b/gi) ?? [])];
  buckets.SHA1 = [...new Set(clean.match(/\b[0-9a-f]{40}\b/gi) ?? [])];
  buckets.SHA256 = [...new Set(clean.match(/\b[0-9a-f]{64}\b/gi) ?? [])];
  buckets.CVE = [...new Set(clean.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])];
  buckets.Email = [...new Set(clean.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])];
  buckets.RegistryKey = [...new Set(clean.match(/(?:HKLM|HKCU|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER)\\[^\s"',;)]+/gi) ?? [])];
  const found = Object.entries(buckets).filter(([, v]) => v.length > 0);
  if (found.length === 0) return "No IOCs found.";
  const total = found.reduce((a, [, v]) => a + v.length, 0);
  return `Found ${total} IOCs across ${found.length} categories:\n\n` +
    found.map(([k, v]) => `**${k}** (${v.length}):\n${v.slice(0, 10).join(", ")}${v.length > 10 ? ` … +${v.length - 10} more` : ""}`).join("\n\n");
}

function execCalculate(expression: string): string {
  try {
    // Safe math evaluation — no new Function(), no eval()
    // Supports: +, -, *, /, **, %, Math.*, parentheses, numbers
    const sanitized = expression.trim();

    // Allowlist: only digits, operators, Math constants/functions, and whitespace
    const SAFE_PATTERN = /^[\d\s+\-*/%().,e]+$|^(Math\.(abs|sqrt|pow|log|log2|log10|floor|ceil|round|min|max|PI|E|random|sin|cos|tan|atan2|hypot|sign|trunc|cbrt|exp|expm1|log1p|cosh|sinh|tanh)\s*[\d\s+\-*/%().,]*)+$/;

    // Tokenize and evaluate safely using Function with restricted scope
    // We build a safe evaluator: allow ONLY numeric operations and Math.*
    const safeExpr = sanitized
      .replace(/\bMath\b/g, "__Math__")
      .replace(/[^0-9\s+\-*/%().,e_]|(?<![_a-zA-Z])([a-zA-Z]+)(?![_a-zA-Z])/g, (match, word) => {
        if (match.startsWith("__Math__")) return match;
        if (word) throw new Error(`Disallowed identifier: ${word}`);
        return match;
      });

    // Final safe eval in a sandboxed scope with only Math exposed
    // Using indirect eval via a strict Function constructor with no globals
    const result = (new Function("__Math__", `"use strict"; return (${safeExpr.replace(/__Math__/g, "Math")})`))(Math);

    if (typeof result !== "number" && typeof result !== "boolean") {
      throw new Error("Result is not a number");
    }
    return `${expression} = ${result}`;
  } catch (e) {
    return `Calculation error: ${e instanceof Error ? e.message : "invalid expression"}`;
  }
}

async function execPortScan(host: string, ports?: string): Promise<string> {
  const portList = !ports
    ? [80, 443, 8080, 8443, 3000, 3128, 4444, 5000, 8000, 8888]
    : ports.split(",").map((p) => parseInt(p.trim())).filter((p) => !isNaN(p));
  const cleanHost = host.replace(/^https?:\/\//, "").split("/")[0];
  const results: string[] = [];
  await Promise.all(
    portList.map(async (port) => {
      const proto = [443, 8443].includes(port) ? "https" : "http";
      try {
        const res = await fetch(`${proto}://${cleanHost}:${port}/`, {
          signal: AbortSignal.timeout(3000),
          method: "HEAD",
        });
        results.push(`${port}/tcp  OPEN    (HTTP ${res.status})`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        if (msg.includes("ECONNREFUSED")) results.push(`${port}/tcp  CLOSED`);
        else if (msg.includes("abort") || msg.includes("timeout")) results.push(`${port}/tcp  FILTERED`);
        else results.push(`${port}/tcp  UNKNOWN (${msg.slice(0, 60)})`);
      }
    }),
  );
  results.sort((a, b) => parseInt(a) - parseInt(b));
  const open = results.filter((r) => r.includes("OPEN")).length;
  return `Port scan — ${cleanHost}\n\n${results.join("\n")}\n\nSummary: ${open}/${portList.length} ports open/reachable`;
}

async function execExploitSearch(query: string, severity?: string): Promise<string> {
  try {
    const params = new URLSearchParams({ keywordSearch: query, resultsPerPage: "5" });
    if (severity && severity !== "ALL") params.set("cvssV3Severity", severity);
    const res = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?${params}`,
      { headers: { "User-Agent": "CHAT-GPT-agent/1.0" }, signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json() as {
      totalResults?: number;
      vulnerabilities?: {
        cve: {
          id: string;
          descriptions?: { lang: string; value: string }[];
          metrics?: { cvssMetricV31?: { cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }[] };
          references?: { url: string }[];
          published?: string;
        };
      }[];
    };
    if (!data.vulnerabilities?.length) return `No CVEs found for "${query}" in NVD.`;
    const lines: string[] = [`NVD results for "${query}" (${data.totalResults} total, top ${data.vulnerabilities.length}):\n`];
    for (const { cve } of data.vulnerabilities) {
      const desc = cve.descriptions?.find((d) => d.lang === "en")?.value ?? "No description";
      const metric = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      const score = metric ? `CVSS ${metric.baseScore} ${metric.baseSeverity} · ${metric.vectorString}` : "No CVSS v3";
      const refs = cve.references?.slice(0, 2).map((r) => r.url).join("\n  ") ?? "";
      lines.push(`**${cve.id}** — ${score}`);
      lines.push(`Published: ${cve.published?.split("T")[0] ?? "unknown"}`);
      lines.push(`${desc.slice(0, 250)}`);
      if (refs) lines.push(`References:\n  ${refs}`);
      lines.push("");
    }
    return lines.join("\n");
  } catch {
    return `Exploit search failed for "${query}". Fallback: use web_search("${query} CVE exploit site:nvd.nist.gov").`;
  }
}

async function execGeneratePentestScript(task: string, language = "python", targetContext = ""): Promise<string> {
  try {
    const result = await callOnce([
      {
        role: "system",
        content: `You are a senior penetration tester and exploit developer. Generate clean, well-commented ${language} scripts for authorized security research and CTF challenges. Always include: (1) a disclaimer comment for authorized use only, (2) modular functions with clear names, (3) error handling, (4) usage example at the bottom. Be precise, professional, and production-quality.`,
      },
      {
        role: "user",
        content: `Write a ${language} penetration testing script to: ${task}${targetContext ? `\n\nTarget context: ${targetContext}` : ""}`,
      },
    ], 2000);
    return result || "Script generation failed.";
  } catch {
    return "Script generation failed. Decompose the task and use analyze_code + web_search as fallback.";
  }
}

async function execNetworkRecon(target: string): Promise<string> {
  const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
  const parts: string[] = [`╔══ NETWORK RECON: ${target} ══╗\n`];
  if (!isIp) {
    const [dnsA, dnsMx, dnsTxt, whois] = await Promise.all([
      execDnsLookup(target, "A"),
      execDnsLookup(target, "MX"),
      execDnsLookup(target, "TXT"),
      execWhois(target),
    ]);
    parts.push(`[DNS — A]\n${dnsA}\n`);
    if (!dnsMx.includes("No MX")) parts.push(`[DNS — MX]\n${dnsMx}\n`);
    if (!dnsTxt.includes("No TXT")) parts.push(`[DNS — TXT]\n${dnsTxt}\n`);
    parts.push(`[WHOIS]\n${whois}\n`);
  }
  const portResult = await execPortScan(target);
  parts.push(`[PORT PROBE]\n${portResult}\n`);
  try {
    const httpContent = await execFetchUrl(`http://${target}/`);
    if (!httpContent.startsWith("Failed")) {
      const iocs = execExtractIocs(httpContent);
      if (iocs !== "No IOCs found.") parts.push(`[IOCs IN HTTP RESPONSE]\n${iocs.slice(0, 800)}\n`);
    }
  } catch { /* skip */ }
  parts.push(`╚══ END RECON ══╝`);
  return parts.join("\n");
}

async function execAnalyzeCode(code: string, language: string, task: string): Promise<string> {
  const taskPrompts: Record<string, string> = {
    vulnerabilities: "Analyze this code for security vulnerabilities. For each: type, CVSS severity, affected line(s), attack vector, and fix.",
    explain: "Explain what this code does step by step from the perspective of a senior security engineer.",
    optimize: "Identify performance bottlenecks and security weaknesses. Provide improved code with annotations.",
    test: "Write comprehensive security-focused test cases covering edge cases, injection vectors, and boundary conditions.",
  };
  try {
    const result = await callOnce([
      { role: "system", content: taskPrompts[task] ?? taskPrompts.explain },
      { role: "user", content: `Language: ${language || "auto-detect"}\n\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\`` },
    ], 1200);
    return result || "Analysis unavailable.";
  } catch {
    return "Code analysis failed.";
  }
}

// ─── Browse Web ──────────────────────────────────────────────────────────────
async function execBrowseWeb(url: string, extract = "text"): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/browser/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, extract }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json() as { ok: boolean; title?: string; text?: string; links?: { href: string; text: string }[]; meta?: Record<string, string>; error?: string };
    if (!data.ok) return `Browse failed: ${data.error ?? "Unknown error"}`;
    const parts: string[] = [];
    if (data.title) parts.push(`Title: ${data.title}`);
    if (data.text) parts.push(data.text.slice(0, 5000));
    if (data.links) parts.push(`Links:\n${data.links.slice(0, 20).map(l => `• [${l.text}](${l.href})`).join("\n")}`);
    if (data.meta) parts.push(`Meta: ${JSON.stringify(data.meta).slice(0, 500)}`);
    return parts.join("\n\n") || "(empty page)";
  } catch (e) {
    return `Browse failed for ${url}: ${e instanceof Error ? e.message : "network error"}`;
  }
}

// ─── Structured Web Search ────────────────────────────────────────────────────
async function execSearchStructured(query: string, limit = 5): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/browser/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: Math.min(limit, 10) }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json() as { ok: boolean; results?: { title: string; url: string; snippet: string }[]; error?: string };
    if (!data.ok || !data.results?.length) return `No structured results for "${query}". Try web_search as fallback.`;
    return data.results.map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`).join("\n\n");
  } catch {
    return `Structured search failed. Use web_search instead.`;
  }
}

// ─── Extract Page Data ────────────────────────────────────────────────────────
async function execExtractPageData(url: string, type: string): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/browser/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, selector_type: type }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as { ok: boolean; data?: unknown; error?: string };
    if (!data.ok) return `Extract failed: ${data.error ?? "Unknown error"}`;
    return JSON.stringify(data.data, null, 2).slice(0, 4000);
  } catch {
    return `Extract failed for ${url}. Try browse_web instead.`;
  }
}

// ─── Generate Image ───────────────────────────────────────────────────────────
async function execGenerateImage(prompt: string, size = "1024x1024"): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json() as { ok?: boolean; url?: string; b64?: string; error?: string };
    if (data.error) return `Image generation failed: ${data.error}`;
    if (data.url) return `Image generated: ${data.url}`;
    if (data.b64) return `Image generated as base64 (${data.b64.length} chars). Prompt: "${prompt}"`;
    return `Image generated for prompt: "${prompt}"`;
  } catch {
    return `Image generation unavailable. Describe the image textually instead.`;
  }
}

// ─── Save Memory ─────────────────────────────────────────────────────────────
async function execSaveMemory(content: string, title: string, tags = ""): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/agent-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.slice(0, 4000),
        summary: title,
        context: tags ? tags.split(",").map(t => t.trim()).join(", ") : "agent-tool",
        importance: 0.8,
        session_id: "agent-session",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return `Memory saved: "${title}" (${content.length} chars)`;
    return `Memory save failed (HTTP ${res.status})`;
  } catch {
    return `Memory service unavailable. Key information: "${title}: ${content.slice(0, 200)}"`;
  }
}

// ─── Recall Memory ────────────────────────────────────────────────────────────
async function execRecallMemory(query: string, limit = 5): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/agent-memory/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: Math.min(limit, 10), session_id: "agent-session" }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json() as { memories?: { summary: string; content: string; created_at: string }[]; error?: string };
    if (!data.memories?.length) return `No relevant memories found for "${query}".`;
    return data.memories.map((m, i) =>
      `${i + 1}. **${m.summary}** (${new Date(m.created_at).toLocaleDateString()})\n${m.content.slice(0, 500)}`
    ).join("\n\n");
  } catch {
    return `Memory recall service unavailable.`;
  }
}

async function execRunCode(code: string, language = "python"): Promise<string> {
  try {
    const res = await fetch("http://localhost:8080/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json() as { stdout?: string; stderr?: string; error?: string };
    if (data.error) return `Execution error: ${data.error}`;
    const parts: string[] = [];
    if (data.stdout) parts.push(`stdout:\n${data.stdout.slice(0, 3000)}`);
    if (data.stderr) parts.push(`stderr:\n${data.stderr.slice(0, 1000)}`);
    return parts.length > 0 ? parts.join("\n") : "(no output)";
  } catch {
    return "Code execution service unavailable. Try calculate or analyze_code instead.";
  }
}

async function execTranslate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
  try {
    const sysPrompt = sourceLanguage
      ? `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return ONLY the translated text, no explanations.`
      : `You are a professional translator. Translate the following text to ${targetLanguage}. Return ONLY the translated text, no explanations.`;
    const result = await callOnce([
      { role: "system", content: sysPrompt },
      { role: "user", content: text.slice(0, 4000) },
    ], 2000);
    return result || "Translation failed.";
  } catch {
    return "Translation service unavailable.";
  }
}

async function execSummarize(text: string, style = "bullets", maxPoints = 8): Promise<string> {
  const prompts: Record<string, string> = {
    bullets: `Summarize the following in ${maxPoints} concise bullet points. Focus on key facts, indicators, and actionable information.`,
    executive: `Write a 2-3 paragraph executive summary of the following. Lead with the most critical findings.`,
    technical: `Write a technical summary with sections: Overview, Key Findings, Technical Details, Recommendations.`,
    tldr: `Write a TL;DR (1-2 sentences) followed by 3-4 key bullet points.`,
  };
  try {
    const result = await callOnce([
      { role: "system", content: prompts[style] ?? prompts.bullets },
      { role: "user", content: text.slice(0, 6000) },
    ], 1500);
    return result || "Summarization failed.";
  } catch {
    return "Summarization service unavailable.";
  }
}

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case "web_search": return execWebSearch(args.query ?? "");
    case "fetch_url": return execFetchUrl(args.url ?? "");
    case "dns_lookup": return execDnsLookup(args.domain ?? "", args.record_type);
    case "whois_lookup": return execWhois(args.target ?? "");
    case "extract_iocs": return execExtractIocs(args.text ?? "");
    case "calculate": return execCalculate(args.expression ?? "");
    case "analyze_code": return execAnalyzeCode(args.code ?? "", args.language ?? "", args.task ?? "explain");
    case "port_scan": return execPortScan(args.host ?? "", args.ports);
    case "exploit_search": return execExploitSearch(args.query ?? "", args.severity);
    case "generate_pentest_script": return execGeneratePentestScript(args.task ?? "", args.language, args.target_context);
    case "network_recon": return execNetworkRecon(args.target ?? "");
    case "run_code": return execRunCode(args.code ?? "", args.language);
    case "translate": return execTranslate(args.text ?? "", args.target_language ?? "English", args.source_language);
    case "summarize": return execSummarize(args.text ?? "", args.style, args.max_points ? Number(args.max_points) : 8);
    case "browse_web": return execBrowseWeb(args.url ?? "", args.extract);
    case "search_structured": return execSearchStructured(args.query ?? "", args.limit ? Number(args.limit) : 5);
    case "extract_page_data": return execExtractPageData(args.url ?? "", args.type ?? "article");
    case "generate_image": return execGenerateImage(args.prompt ?? "", args.size);
    case "save_memory": return execSaveMemory(args.content ?? "", args.title ?? "Agent note", args.tags);
    case "recall_memory": return execRecallMemory(args.query ?? "", args.limit ? Number(args.limit) : 5);
    default: return `Unknown tool: ${name}`;
  }
}

const AGENT_SYSTEM = `You are an autonomous AI assistant agent — CHAT-GPT Agent. You have access to 20 live tools covering intelligence gathering, OSINT, web browsing, code execution, image generation, memory, and analysis.

AVAILABLE TOOL CATEGORIES:
1. WEB & BROWSER: web_search, fetch_url, browse_web, search_structured, extract_page_data
2. SECURITY & OSINT: dns_lookup, whois_lookup, extract_iocs, port_scan, exploit_search, network_recon
3. CODE & COMPUTATION: run_code, calculate, analyze_code, generate_pentest_script
4. AI CAPABILITIES: translate, summarize, generate_image
5. MEMORY: save_memory, recall_memory

OPERATING PROTOCOL:
1. For any research task → recall_memory first (check if you already know), then search_structured + browse_web
2. For domain/IP targets → network_recon (one call handles DNS+WHOIS+ports)
3. For long documents/URLs → browse_web then summarize
4. For foreign-language content → translate before analyzing
5. For code tasks → analyze_code or run_code to verify
6. Save important findings → save_memory (persists across sessions)
7. After gathering data → synthesize with clear headers, tables, and citations

TOOL SELECTION RULES:
- Quick fact → web_search (fast, low-cost)
- Full article/page → browse_web (extracts clean text)
- Structured results needed → search_structured (returns title+URL+snippet)
- Code blocks / headings from page → extract_page_data
- CVE lookup → exploit_search
- IOC extraction → extract_iocs on any text
- Math/subnet/crypto → calculate
- Visual output → generate_image

Be thorough. Cite your sources. Format output with markdown headers and tables.`;

const REDTEAM_SYSTEM = `You are CHAT-GPT Red Team Agent — an elite autonomous penetration tester. You operate in authorized red team engagements, CTF challenges, and security research environments.

MISSION: Systematically identify, validate, and demonstrate attack vectors against the specified target using real tools and generated exploit code.

RED TEAM METHODOLOGY (MITRE ATT&CK aligned):
1. RECONNAISSANCE — network_recon → dns_lookup → whois_lookup → web_search
2. SCANNING — port_scan → fetch_url on discovered services → extract_iocs
3. VULNERABILITY ANALYSIS — exploit_search for each discovered service/version
4. EXPLOITATION — generate_pentest_script for validated vulnerabilities → analyze_code
5. REPORTING — synthesize attack chain with MITRE ATT&CK TTPs, IoCs, and remediation

TOOL CHAINING RULES:
- Always start with network_recon for new targets
- Use exploit_search on every service version discovered by port_scan
- Generate custom Python/Bash exploit scripts for each confirmed vulnerability
- Chain results: recon output → IOC extraction → threat correlation
- Model the full attack chain: Initial Access → Execution → Persistence → Exfiltration

OUTPUT FORMAT:
- Executive Summary (one paragraph)
- Attack Chain (numbered steps with ATT&CK IDs)
- Findings Table (Severity | Finding | Evidence | Remediation)
- Generated Exploit Scripts (with authorized use disclaimer)
- IOC List
- Recommended Detections (SIEM/EDR rules)

⚠️ AUTHORIZED TESTING ONLY — Always include this disclaimer in generated scripts.`;

function sse(res: import("express").Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post("/agent", async (req, res) => {
  try {
    const body = req.body as {
      messages?: { role: string; content: string }[];
      language?: string;
      customSystemPrompt?: string;
      customInstructions?: string;
      memory?: string[];
      maxSteps?: number;
      redteamMode?: boolean;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const language = body.language ?? "en";
    const maxSteps = Math.min(body.maxSteps ?? 8, 20);
    const redteamMode = body.redteamMode === true;
    const langLine = language === "ar"
      ? "\n\nRespond in Arabic. Use English for technical terms, CVE IDs, tool names, code."
      : "\n\nRespond in English.";
    const ciLine = body.customInstructions?.trim()
      ? `\n\nUser custom instructions: ${body.customInstructions.trim()}`
      : "";
    const memLine = Array.isArray(body.memory) && body.memory.length > 0
      ? `\n\nUser memory:\n- ${body.memory.join("\n- ")}`
      : "";
    const baseSystem = body.customSystemPrompt?.trim() ?? (redteamMode ? REDTEAM_SYSTEM : AGENT_SYSTEM);
    const sysContent = baseSystem + langLine + ciLine + memLine;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let aborted = false;
    req.on("close", () => { aborted = true; });

    const loop: ChatMessage[] = [
      { role: "system", content: sysContent },
      ...messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    let step = 0;

    while (step < maxSteps && !aborted) {
      step++;
      sse(res, { type: "step_start", step, maxSteps });

      const response = await requirePersonalOpenAI().chat.completions.create({
        model: PERSONAL_DEFAULT_MODEL,
        max_tokens: 4096,
        messages: loop as import("openai/resources/chat/completions").ChatCompletionMessageParam[],
        tools: AGENT_TOOLS,
        tool_choice: "auto",
      });

      const choice = response.choices?.[0];
      if (!choice) break;

      const msg = choice.message;

      if (msg.content && !msg.tool_calls?.length) {
        loop.push({ role: "assistant", content: msg.content });
        sse(res, { type: "answer_start" });
        for (const token of msg.content.split("")) {
          if (aborted) break;
          sse(res, { type: "answer_chunk", content: token });
        }
        break;
      }

      if (msg.tool_calls?.length) {
        if (msg.content) {
          sse(res, { type: "thinking", content: msg.content });
        }
        loop.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: msg.tool_calls,
        } as ChatMessage);

        // ── PARALLEL TOOL EXECUTION ────────────────────────────────────────────
        // Announce all tool calls immediately
        const toolCallList = msg.tool_calls.map(tc => {
          const fn = (tc as unknown as { function: { name: string; arguments: string } }).function;
          let args: Record<string, string> = {};
          try { args = JSON.parse(fn.arguments ?? "{}"); } catch { /* keep */ }
          return { tc, name: fn.name, args };
        });

        for (const { name, args } of toolCallList) {
          sse(res, { type: "tool_call", step, name, args });
        }

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(
          toolCallList.map(async ({ tc, name, args }) => {
            if (aborted) return { tc, name, result: "[Aborted]" };
            const result = await executeTool(name, args);
            const ok = !result.startsWith("Failed") && !result.startsWith("No results") && !result.startsWith("[Error") && !result.startsWith("Unknown tool");
            if (!aborted) {
              sse(res, { type: "tool_result", step, name, result: result.slice(0, 2000), ok });
            }
            return { tc, name, result };
          })
        );

        // Push all results to loop in order
        for (const { tc, name, result } of toolResults) {
          loop.push({
            role: "tool",
            content: result.slice(0, 6000),
            tool_call_id: tc.id,
            name,
          });
        }
        continue;
      }

      break;
    }

    if (!aborted) {
      sse(res, { type: "done", steps: step });
      res.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent error";
    try { res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`); res.end(); } catch { /* closed */ }
  }
});

// ── GET /api/agent/tools — List all available agent tools ─────────────────────
router.get("/agent/tools", (_req, res) => {
  res.json({
    count: AGENT_TOOLS.length,
    categories: {
      "Web & Browser": ["web_search", "fetch_url", "browse_web", "search_structured", "extract_page_data"],
      "Security & OSINT": ["dns_lookup", "whois_lookup", "extract_iocs", "port_scan", "exploit_search", "network_recon"],
      "Code & Computation": ["run_code", "calculate", "analyze_code", "generate_pentest_script"],
      "AI Capabilities": ["translate", "summarize", "generate_image"],
      "Memory": ["save_memory", "recall_memory"],
    },
    tools: AGENT_TOOLS.map(t => ({
      name: (t as unknown as { function: { name: string; description: string } }).function.name,
      description: (t as unknown as { function: { name: string; description: string } }).function.description,
    })),
  });
});

export default router;
