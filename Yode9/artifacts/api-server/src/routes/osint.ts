import { Router, type IRouter } from "express";
import { requirePersonalOpenAI, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";
import dns from "dns";

const router: IRouter = Router();

const FETCH_TIMEOUT = 8000;
const SHORT_TIMEOUT = 5000;

function withTimeout(promise: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function extractIocs(text: string): Record<string, string[]> {
  const t = text.slice(0, 100000);
  return {
    ipv4: [...new Set((t.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g) ?? []))].filter((ip) => !ip.startsWith("127.") && ip !== "0.0.0.0"),
    domains: [...new Set((t.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|edu|gov|io|co|xyz|onion|ru|cn|de|uk|fr|nl|info|tech|app|dev|biz)\b/gi) ?? []))],
    urls: [...new Set(t.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi) ?? [])],
    md5: [...new Set(t.match(/\b[0-9a-f]{32}\b/gi) ?? [])],
    sha1: [...new Set(t.match(/\b[0-9a-f]{40}\b/gi) ?? [])],
    sha256: [...new Set(t.match(/\b[0-9a-f]{64}\b/gi) ?? [])],
    cves: [...new Set(t.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])],
    emails: [...new Set(t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])],
  };
}

const PRIVATE_IP_RE = /^(https?:\/\/)(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0|::1|fd[0-9a-f]{2}:)/i;

function isPrivateUrl(url: string): boolean {
  return PRIVATE_IP_RE.test(url);
}

async function aiAnalyze(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const completion = await requirePersonalOpenAI().chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: 1800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    return completion.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

function riskFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function extractMxSecurity(txtRecords: string[][]): { spf: string | null; dmarc: string | null; dkim: string[] } {
  const flat = txtRecords.map(r => r.join(" "));
  const spf = flat.find(r => r.startsWith("v=spf1")) ?? null;
  const dmarc = flat.find(r => r.toLowerCase().startsWith("v=dmarc1")) ?? null;
  const dkim = flat.filter(r => r.includes("v=DKIM1") || r.includes("k=rsa") || r.includes("p="));
  return { spf, dmarc, dkim };
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
router.post("/osint/email", async (req, res) => {
  try {
    const { email, language } = req.body as { email?: string; language?: string };
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string; disabled?: boolean }> = {};

    const HIBP_KEY = process.env.HIBP_API_KEY;
    const HUNTER_KEY = process.env.HUNTER_API_KEY;
    const domain = email.split("@")[1] ?? "";
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const [hibpResult, hunterResult, mxResult, txtResult] = await Promise.allSettled([
      HIBP_KEY
        ? withTimeout(
            fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
              headers: { "hibp-api-key": HIBP_KEY, "User-Agent": "mr7-osint/1.0" },
            }),
            FETCH_TIMEOUT
          )
        : Promise.reject(new Error("HIBP_API_KEY not configured")),
      HUNTER_KEY
        ? withTimeout(
            fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_KEY}`),
            FETCH_TIMEOUT
          )
        : Promise.reject(new Error("HUNTER_API_KEY not configured")),
      resolver.resolveMx(domain).catch(() => [] as dns.MxRecord[]),
      resolver.resolveTxt(domain).catch(() => [] as string[][]),
    ]);

    let breaches: unknown[] = [];
    let hunterData: unknown = null;

    if (!HIBP_KEY) {
      sources["Have I Been Pwned"] = { success: false, disabled: true, error: "HIBP_API_KEY not set — get it at https://haveibeenpwned.com/API/Key" };
    } else if (hibpResult.status === "fulfilled") {
      const r = hibpResult.value;
      if (r.status === 200) {
        breaches = await r.json() as unknown[];
        sources["Have I Been Pwned"] = { success: true };
      } else if (r.status === 404) {
        sources["Have I Been Pwned"] = { success: true };
      } else {
        sources["Have I Been Pwned"] = { success: false, error: `HTTP ${r.status}` };
      }
    } else {
      sources["Have I Been Pwned"] = { success: false, error: (hibpResult as PromiseRejectedResult).reason?.message };
    }

    if (!HUNTER_KEY) {
      sources["Hunter.io"] = { success: false, disabled: true, error: "HUNTER_API_KEY not set — get it at https://hunter.io (free: 25 req/month)" };
    } else if (hunterResult.status === "fulfilled") {
      const r = hunterResult.value;
      if (r.ok) {
        hunterData = await r.json();
        sources["Hunter.io"] = { success: true };
      } else {
        sources["Hunter.io"] = { success: false, error: `HTTP ${r.status}` };
      }
    } else {
      sources["Hunter.io"] = { success: false, error: (hunterResult as PromiseRejectedResult).reason?.message };
    }

    const mxRecords = mxResult.status === "fulfilled" ? (mxResult.value as dns.MxRecord[]) : [];
    const txtRecords = txtResult.status === "fulfilled" ? (txtResult.value as string[][]) : [];
    const mxSecurity = extractMxSecurity(txtRecords);
    sources["Email Domain DNS"] = { success: mxResult.status === "fulfilled" };

    const domainAge = null;
    const disposableDomains = ["guerrillamail", "mailinator", "tempmail", "throwam", "yopmail", "sharklasers", "guerrillamailblock", "grr.la", "spam4.me", "trashmail", "maildrop"];
    const isDisposable = disposableDomains.some(d => domain.toLowerCase().includes(d));

    const riskScore = breaches.length > 5 ? 85 : breaches.length > 2 ? 60 : breaches.length > 0 ? 35 : isDisposable ? 30 : 5;
    const riskLevel = riskFromScore(riskScore);

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst. Analyze this email intelligence data and provide:
1. Executive Summary
2. Breach Analysis (if any breaches found)
3. Email Validity & Domain Assessment
4. Email Security Posture (SPF/DMARC status)
5. Risk Assessment
6. Specific Recommendations (bullet points)
Format as structured Markdown. ${langNote}`,
      `Email: ${email}
Domain: ${domain}
Disposable domain: ${isDisposable}
Breaches found: ${breaches.length}
Breach details: ${JSON.stringify(breaches).slice(0, 3000)}
Hunter.io verification: ${JSON.stringify(hunterData).slice(0, 500)}
MX Records: ${JSON.stringify(mxRecords).slice(0, 500)}
SPF: ${mxSecurity.spf ?? "not found"}
DMARC: ${mxSecurity.dmarc ?? "not found"}`
    );

    return res.json({
      sources,
      results: {
        email,
        domain,
        breaches,
        breachCount: breaches.length,
        hunter: hunterData,
        mxRecords,
        mxSecurity,
        isDisposable,
        domainAge,
      },
      analysis: analysisText,
      riskLevel,
      recommendations: breaches.length > 0
        ? ["Change passwords immediately for affected services", "Enable 2FA on all accounts", "Monitor for identity theft", "Use unique passwords per service", "Consider a password manager"]
        : ["Password appears safe — maintain good hygiene", "Enable 2FA as preventive measure", "Set up breach monitoring alerts"],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Email OSINT failed" });
  }
});

// ── IP ────────────────────────────────────────────────────────────────────────
router.post("/osint/ip", async (req, res) => {
  try {
    const { ip, language } = req.body as { ip?: string; language?: string };
    if (!ip || !/^[\d.:a-fA-F]+$/.test(ip)) {
      return res.status(400).json({ error: "Valid IP address required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY;
    const sources: Record<string, { success: boolean; error?: string; disabled?: boolean }> = {};

    const [abuseResult, ipapiResult, ipApiResult, shodanResult] = await Promise.allSettled([
      ABUSEIPDB_KEY
        ? withTimeout(
            fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`, {
              headers: { Key: ABUSEIPDB_KEY, Accept: "application/json" },
            }),
            FETCH_TIMEOUT
          )
        : Promise.reject(new Error("ABUSEIPDB_API_KEY not configured")),
      withTimeout(fetch(`https://ipapi.co/${ip}/json/`, { headers: { "User-Agent": "mr7-osint/1.0" } }), FETCH_TIMEOUT),
      withTimeout(fetch(`http://ip-api.com/json/${ip}?fields=66846719`), FETCH_TIMEOUT),
      withTimeout(fetch(`https://internetdb.shodan.io/${ip}`, { headers: { "User-Agent": "mr7-osint/1.0" } }), SHORT_TIMEOUT),
    ]);

    let abuseData: unknown = null;
    let ipapiData: unknown = null;
    let ipApiData: unknown = null;
    let shodanData: { ports?: number[]; tags?: string[]; vulns?: string[]; hostnames?: string[]; cpes?: string[] } | null = null;

    if (!ABUSEIPDB_KEY) {
      sources["AbuseIPDB"] = { success: false, disabled: true, error: "ABUSEIPDB_API_KEY not set — get it at https://abuseipdb.com (free: 1000 req/day)" };
    } else if (abuseResult.status === "fulfilled" && abuseResult.value.ok) {
      abuseData = await abuseResult.value.json();
      sources["AbuseIPDB"] = { success: true };
    } else {
      sources["AbuseIPDB"] = { success: false, error: abuseResult.status === "rejected" ? (abuseResult as PromiseRejectedResult).reason?.message : `HTTP ${(abuseResult as PromiseFulfilledResult<Response>).value.status}` };
    }

    if (ipapiResult.status === "fulfilled" && ipapiResult.value.ok) {
      ipapiData = await ipapiResult.value.json();
      sources["ipapi.co"] = { success: true };
    } else {
      sources["ipapi.co"] = { success: false, error: ipapiResult.status === "rejected" ? (ipapiResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    if (ipApiResult.status === "fulfilled" && ipApiResult.value.ok) {
      ipApiData = await ipApiResult.value.json();
      sources["ip-api.com"] = { success: true };
    } else {
      sources["ip-api.com"] = { success: false, error: ipApiResult.status === "rejected" ? (ipApiResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    if (shodanResult.status === "fulfilled" && shodanResult.value.ok) {
      shodanData = await shodanResult.value.json() as typeof shodanData;
      sources["Shodan InternetDB"] = { success: true };
    } else if (shodanResult.status === "fulfilled" && shodanResult.value.status === 404) {
      shodanData = { ports: [], tags: [], vulns: [], hostnames: [], cpes: [] };
      sources["Shodan InternetDB"] = { success: true };
    } else {
      sources["Shodan InternetDB"] = { success: false, error: shodanResult.status === "rejected" ? (shodanResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    const abuseScore = (abuseData as { data?: { abuseConfidenceScore?: number } } | null)?.data?.abuseConfidenceScore ?? 0;
    const vulnCount = shodanData?.vulns?.length ?? 0;
    const combinedRiskScore = Math.max(abuseScore, vulnCount > 0 ? 50 + vulnCount * 5 : 0);
    const riskLevel = riskFromScore(combinedRiskScore);

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst specializing in IP threat intelligence. Analyze this IP data and provide:
1. Executive Summary
2. Geolocation & Infrastructure Analysis
3. Threat Assessment (based on abuse score and reports)
4. Open Ports & Exposure Analysis (if Shodan data available)
5. Known Vulnerabilities (CVEs from Shodan if present)
6. Classification (residential/datacenter/VPN/TOR/proxy)
7. Recommended Actions
Format as structured Markdown. ${langNote}`,
      `IP: ${ip}
AbuseIPDB data: ${JSON.stringify(abuseData).slice(0, 2000)}
IPAPI.co geo data: ${JSON.stringify(ipapiData).slice(0, 1000)}
IP-API.com data: ${JSON.stringify(ipApiData).slice(0, 1000)}
Shodan InternetDB: ${JSON.stringify(shodanData).slice(0, 1000)}`
    );

    return res.json({
      sources,
      results: { ip, abuseData, ipapiData, ipApiData, shodanData, abuseScore },
      analysis: analysisText,
      riskLevel,
      recommendations: abuseScore > 50 || vulnCount > 0
        ? ["Block this IP in firewall immediately", "Review logs for connections from this IP", "Report to your SOC team", "Add to threat blocklist", "Check for lateral movement"]
        : abuseScore > 10
        ? ["Monitor traffic from this IP", "Implement rate limiting", "Review access logs periodically"]
        : ["IP appears clean — continue normal monitoring", "Maintain baseline logging", "Review periodically"],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "IP OSINT failed" });
  }
});

// ── DOMAIN ────────────────────────────────────────────────────────────────────
router.post("/osint/domain", async (req, res) => {
  try {
    const { domain, language } = req.body as { domain?: string; language?: string };
    if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: "Valid domain required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const [dnsResults, crtResult, rdapResult, waybackResult] = await Promise.allSettled([
      Promise.allSettled([
        resolver.resolve4(domain).catch(() => [] as string[]),
        resolver.resolve6(domain).catch(() => [] as string[]),
        resolver.resolveMx(domain).catch(() => [] as dns.MxRecord[]),
        resolver.resolveTxt(domain).catch(() => [] as string[][]),
        resolver.resolveNs(domain).catch(() => [] as string[]),
        resolver.resolveSoa(domain).catch(() => null as dns.SoaRecord | null),
        resolver.resolveCaa(domain).catch(() => [] as dns.CaaRecord[]),
      ]),
      withTimeout(fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`), FETCH_TIMEOUT),
      withTimeout(fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        headers: { Accept: "application/rdap+json" },
      }), FETCH_TIMEOUT),
      withTimeout(fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(domain)}`), SHORT_TIMEOUT),
    ]);

    let dnsRecords: { a: string[]; aaaa: string[]; mx: dns.MxRecord[]; txt: string[][]; ns: string[]; soa: dns.SoaRecord | null; caa: dns.CaaRecord[] } = { a: [], aaaa: [], mx: [], txt: [], ns: [], soa: null, caa: [] };
    let crtData: unknown[] = [];
    let rdapData: unknown = null;
    let subdomains: string[] = [];
    let waybackData: unknown = null;

    if (dnsResults.status === "fulfilled") {
      const [a, aaaa, mx, txt, ns, soa, caa] = dnsResults.value;
      dnsRecords = {
        a: a.status === "fulfilled" ? (a.value as string[]) : [],
        aaaa: aaaa.status === "fulfilled" ? (aaaa.value as string[]) : [],
        mx: mx.status === "fulfilled" ? (mx.value as dns.MxRecord[]) : [],
        txt: txt.status === "fulfilled" ? (txt.value as string[][]) : [],
        ns: ns.status === "fulfilled" ? (ns.value as string[]) : [],
        soa: soa.status === "fulfilled" ? (soa.value as dns.SoaRecord | null) : null,
        caa: caa.status === "fulfilled" ? (caa.value as dns.CaaRecord[]) : [],
      };
      sources["DNS"] = { success: true };
    } else {
      sources["DNS"] = { success: false, error: dnsResults.reason?.message };
    }

    if (crtResult.status === "fulfilled" && crtResult.value.ok) {
      const raw = await crtResult.value.json() as { name_value?: string }[];
      crtData = raw.slice(0, 200);
      const seen = new Set<string>();
      for (const entry of raw) {
        const names = (entry.name_value ?? "").split("\n");
        for (const n of names) {
          const cleaned = n.trim().replace(/^\*\./, "");
          if (cleaned && cleaned.endsWith(domain) && !seen.has(cleaned)) {
            seen.add(cleaned);
            subdomains.push(cleaned);
          }
        }
      }
      subdomains = [...new Set(subdomains)].slice(0, 100);
      sources["crt.sh (SSL Transparency)"] = { success: true };
    } else {
      sources["crt.sh (SSL Transparency)"] = { success: false, error: crtResult.status === "rejected" ? (crtResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    if (rdapResult.status === "fulfilled" && rdapResult.value.ok) {
      rdapData = await rdapResult.value.json();
      sources["RDAP/WHOIS"] = { success: true };
    } else {
      sources["RDAP/WHOIS"] = { success: false, error: rdapResult.status === "rejected" ? (rdapResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    if (waybackResult.status === "fulfilled" && waybackResult.value.ok) {
      waybackData = await waybackResult.value.json();
      sources["Wayback Machine"] = { success: true };
    } else {
      sources["Wayback Machine"] = { success: false, error: waybackResult.status === "rejected" ? (waybackResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    const mxSecurity = extractMxSecurity(dnsRecords.txt);

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst. Build a comprehensive attack surface map for this domain and provide:
1. Infrastructure Overview
2. DNS Security Analysis (SPF/DKIM/DMARC status from TXT records)
3. CAA Records Assessment (certificate authority authorization)
4. Subdomain Exposure Assessment
5. WHOIS/Registration Intelligence
6. SSL Certificate History Insights
7. Wayback Machine History
8. Attack Surface Summary
9. Recommended Hardening Steps
Format as structured Markdown. ${langNote}`,
      `Domain: ${domain}
DNS Records: ${JSON.stringify(dnsRecords).slice(0, 2000)}
SPF: ${mxSecurity.spf ?? "not found"}
DMARC: ${mxSecurity.dmarc ?? "not found"}
DKIM entries: ${mxSecurity.dkim.length}
CAA Records: ${JSON.stringify(dnsRecords.caa).slice(0, 200)}
Subdomains found (${subdomains.length}): ${subdomains.slice(0, 30).join(", ")}
RDAP/WHOIS: ${JSON.stringify(rdapData).slice(0, 1500)}
SSL certificates count: ${crtData.length}
Wayback Machine: ${JSON.stringify(waybackData).slice(0, 500)}`
    );

    const riskScore = subdomains.length > 50 ? 55 : subdomains.length > 20 ? 35 : 15;

    return res.json({
      sources,
      results: { domain, dnsRecords, subdomains, rdapData, sslCount: crtData.length, mxSecurity, waybackData },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        "Review all exposed subdomains for unintended services",
        mxSecurity.spf ? "SPF record detected — verify it is restrictive (-all)" : "Add SPF record to prevent email spoofing",
        mxSecurity.dmarc ? "DMARC detected — ensure policy is p=reject" : "Add DMARC policy to enforce email authentication",
        "Enable DNSSEC if not already active",
        "Monitor crt.sh for unauthorized certificate issuance",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Domain OSINT failed" });
  }
});

// ── HASH ──────────────────────────────────────────────────────────────────────
router.post("/osint/hash", async (req, res) => {
  try {
    const { hash, language } = req.body as { hash?: string; language?: string };
    if (!hash || !/^[0-9a-fA-F]{32,64}$/.test(hash)) {
      return res.status(400).json({ error: "Valid MD5/SHA1/SHA256 hash required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const VT_KEY = process.env.VT_API_KEY;
    const sources: Record<string, { success: boolean; error?: string; disabled?: boolean }> = {};

    let vtData: unknown = null;
    let mbData: unknown = null;

    const [vtResult, mbResult] = await Promise.allSettled([
      VT_KEY
        ? withTimeout(
            fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
              headers: { "x-apikey": VT_KEY },
            }),
            FETCH_TIMEOUT
          )
        : Promise.reject(new Error("VT_API_KEY not configured")),
      withTimeout(
        fetch(`https://mb-api.abuse.ch/api/v1/`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `query=get_info&hash=${encodeURIComponent(hash)}`,
        }),
        SHORT_TIMEOUT
      ),
    ]);

    if (!VT_KEY) {
      sources["VirusTotal"] = { success: false, disabled: true, error: "VT_API_KEY not set — get it at https://virustotal.com (free: 500 req/day)" };
    } else if (vtResult.status === "fulfilled" && vtResult.value.ok) {
      vtData = await vtResult.value.json();
      sources["VirusTotal"] = { success: true };
    } else if (vtResult.status === "fulfilled" && vtResult.value.status === 404) {
      sources["VirusTotal"] = { success: true };
    } else {
      sources["VirusTotal"] = { success: false, error: vtResult.status === "rejected" ? (vtResult as PromiseRejectedResult).reason?.message : `HTTP ${(vtResult as PromiseFulfilledResult<Response>).value.status}` };
    }

    if (mbResult.status === "fulfilled" && mbResult.value.ok) {
      const mbJson = await mbResult.value.json() as { query_status?: string; data?: unknown[] };
      if (mbJson.query_status === "ok" && Array.isArray(mbJson.data) && mbJson.data.length > 0) {
        mbData = mbJson.data[0];
        sources["MalwareBazaar"] = { success: true };
      } else {
        sources["MalwareBazaar"] = { success: true };
      }
    } else {
      sources["MalwareBazaar"] = { success: false, error: mbResult.status === "rejected" ? (mbResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    const attrs = (vtData as { data?: { attributes?: Record<string, unknown> } } | null)?.data?.attributes ?? {};
    const stats = (attrs.last_analysis_stats as { malicious?: number; suspicious?: number; undetected?: number; harmless?: number } | undefined) ?? {};
    const totalEngines = (stats.malicious ?? 0) + (stats.suspicious ?? 0) + (stats.undetected ?? 0) + (stats.harmless ?? 0);
    const maliciousCount = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
    const detectionRatio = totalEngines > 0 ? (maliciousCount / totalEngines) * 100 : 0;

    const mbAttrs = mbData as { file_type?: string; file_name?: string; file_size?: number; first_seen?: string; signature?: string; tags?: string[]; delivery_method?: string } | null;

    const analysisText = await aiAnalyze(
      `You are a malware analyst. Analyze this file hash intelligence and provide:
1. Malware Classification (if detected)
2. Detection Rate Analysis
3. Likely Malware Family & Signature
4. MalwareBazaar Threat Context
5. MITRE ATT&CK Techniques (if identifiable)
6. Threat Severity Assessment
7. Recommended Response Actions
Format as structured Markdown. ${langNote}`,
      `Hash: ${hash}
Hash type: ${hash.length === 32 ? "MD5" : hash.length === 40 ? "SHA1" : "SHA256"}
VirusTotal data: ${JSON.stringify(vtData).slice(0, 3000)}
MalwareBazaar data: ${JSON.stringify(mbData).slice(0, 1000)}`
    );

    const riskLevel = riskFromScore(detectionRatio);

    return res.json({
      sources,
      results: {
        hash,
        hashType: hash.length === 32 ? "MD5" : hash.length === 40 ? "SHA1" : "SHA256",
        vtData,
        mbData,
        detectionStats: stats,
        maliciousCount,
        totalEngines,
        detectionRatio: Math.round(detectionRatio),
        fileInfo: {
          name: mbAttrs?.file_name ?? attrs.meaningful_name ?? attrs.names ?? null,
          type: mbAttrs?.file_type ?? attrs.type_description ?? attrs.magic ?? null,
          size: mbAttrs?.file_size ?? attrs.size ?? null,
          firstSeen: mbAttrs?.first_seen ?? attrs.first_submission_date ?? null,
          signature: mbAttrs?.signature ?? null,
          tags: mbAttrs?.tags ?? (attrs.tags as string[] | undefined) ?? [],
          deliveryMethod: mbAttrs?.delivery_method ?? null,
        },
      },
      analysis: analysisText,
      riskLevel,
      recommendations: maliciousCount > 0
        ? ["Quarantine or delete file immediately", "Scan all systems for similar files", "Identify infection vector", "Collect and preserve forensic evidence", "Notify incident response team"]
        : mbData
        ? ["Found in MalwareBazaar — treat as suspicious", "Do not execute this file", "Submit to sandbox for dynamic analysis"]
        : ["Hash not found or appears clean", "Verify hash integrity", "Continue monitoring", "Submit sample if suspicious behavior observed"],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Hash OSINT failed" });
  }
});

// ── USERNAME ──────────────────────────────────────────────────────────────────
router.post("/osint/username", async (req, res) => {
  try {
    const { username, language } = req.body as { username?: string; language?: string };
    if (!username || username.length < 2) {
      return res.status(400).json({ error: "Valid username required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};

    const PLATFORMS = [
      { name: "GitHub", url: `https://github.com/${username}`, category: "dev" },
      { name: "GitLab", url: `https://gitlab.com/${username}`, category: "dev" },
      { name: "npm", url: `https://www.npmjs.com/~${username}`, category: "dev" },
      { name: "PyPI", url: `https://pypi.org/user/${username}/`, category: "dev" },
      { name: "Docker Hub", url: `https://hub.docker.com/u/${username}`, category: "dev" },
      { name: "Reddit", url: `https://www.reddit.com/user/${username}`, category: "social" },
      { name: "Twitch", url: `https://www.twitch.tv/${username}`, category: "social" },
      { name: "Keybase", url: `https://keybase.io/${username}`, category: "social" },
      { name: "Telegram", url: `https://t.me/${username}`, category: "social" },
      { name: "Medium", url: `https://medium.com/@${username}`, category: "blog" },
      { name: "Dev.to", url: `https://dev.to/${username}`, category: "blog" },
      { name: "Pastebin", url: `https://pastebin.com/u/${username}`, category: "paste" },
      { name: "HackerOne", url: `https://hackerone.com/${username}`, category: "security" },
      { name: "Bugcrowd", url: `https://bugcrowd.com/${username}`, category: "security" },
      { name: "Exploit-DB", url: `https://www.exploit-db.com/author/${username}`, category: "security" },
      { name: "Replit", url: `https://replit.com/@${username}`, category: "dev" },
      { name: "Codepen", url: `https://codepen.io/${username}`, category: "dev" },
      { name: "Mastodon", url: `https://mastodon.social/@${username}`, category: "social" },
      { name: "Intigriti", url: `https://app.intigriti.com/researcher/${username}`, category: "security" },
      { name: "Fiverr", url: `https://www.fiverr.com/${username}`, category: "work" },
    ];

    const checkResults = await Promise.allSettled(
      PLATFORMS.map(async (p) => {
        try {
          const r = await withTimeout(
            fetch(p.url, {
              method: "HEAD",
              headers: { "User-Agent": "Mozilla/5.0 (compatible; mr7-osint/1.0)" },
              redirect: "follow",
            }),
            FETCH_TIMEOUT
          );
          return { platform: p.name, url: p.url, category: p.category, found: r.status === 200, status: r.status };
        } catch {
          return { platform: p.name, url: p.url, category: p.category, found: false, status: 0, error: "timeout" };
        }
      })
    );

    const platformResults = checkResults.map((r) =>
      r.status === "fulfilled" ? r.value : { platform: "unknown", url: "", category: "other", found: false, status: 0, error: "failed" }
    );

    sources["Platform Checks"] = { success: true };

    const foundPlatforms = platformResults.filter((p) => p.found);

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst. Analyze this username intelligence and provide:
1. Identity Pattern Analysis
2. Platform Presence Assessment (by category: dev/social/security/blog)
3. Behavioral Patterns (inferred from platform types)
4. Potential Identity Correlation
5. Security Community Presence (HackerOne/Bugcrowd/Intigriti)
6. Privacy Exposure Level
7. Recommendations
Format as structured Markdown. ${langNote}`,
      `Username: ${username}
Found on platforms (${foundPlatforms.length}/${PLATFORMS.length}): ${foundPlatforms.map((p) => `${p.platform} (${p.category})`).join(", ")}
All platform check results: ${JSON.stringify(platformResults)}`
    );

    const riskScore = foundPlatforms.length > 8 ? 65 : foundPlatforms.length > 4 ? 40 : 20;

    return res.json({
      sources,
      results: { username, platformResults, foundCount: foundPlatforms.length, totalChecked: PLATFORMS.length },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        "Review privacy settings on all discovered accounts",
        "Use different usernames across platforms to prevent correlation",
        "Remove personal information from public profiles",
        "Enable 2FA on all discovered accounts",
        "Consider username rotation for sensitive activities",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Username OSINT failed" });
  }
});

// ── PHONE ─────────────────────────────────────────────────────────────────────
router.post("/osint/phone", async (req, res) => {
  try {
    const { phone, language } = req.body as { phone?: string; language?: string };
    if (!phone || phone.length < 7) {
      return res.status(400).json({ error: "Valid phone number required" });
    }

    const langNote = language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const NUMVERIFY_KEY = process.env.NUMVERIFY_API_KEY;
    const sources: Record<string, { success: boolean; error?: string; disabled?: boolean }> = {};

    let numverifyData: unknown = null;
    let callerData: unknown = null;

    const cleaned = phone.replace(/\s+/g, "");

    const countryCodeMap: Record<string, { name: string; region: string }> = {
      "+1": { name: "United States / Canada", region: "North America" },
      "+44": { name: "United Kingdom", region: "Europe" },
      "+49": { name: "Germany", region: "Europe" },
      "+33": { name: "France", region: "Europe" },
      "+966": { name: "Saudi Arabia", region: "Middle East" },
      "+971": { name: "UAE", region: "Middle East" },
      "+965": { name: "Kuwait", region: "Middle East" },
      "+974": { name: "Qatar", region: "Middle East" },
      "+20": { name: "Egypt", region: "Africa" },
      "+962": { name: "Jordan", region: "Middle East" },
      "+90": { name: "Turkey", region: "Europe/Asia" },
      "+91": { name: "India", region: "Asia" },
      "+86": { name: "China", region: "Asia" },
      "+7": { name: "Russia", region: "Europe/Asia" },
      "+55": { name: "Brazil", region: "South America" },
      "+34": { name: "Spain", region: "Europe" },
      "+39": { name: "Italy", region: "Europe" },
      "+81": { name: "Japan", region: "Asia" },
      "+82": { name: "South Korea", region: "Asia" },
      "+61": { name: "Australia", region: "Oceania" },
    };

    let detectedCountry: { name: string; region: string } | null = null;
    for (const [prefix, info] of Object.entries(countryCodeMap)) {
      if (cleaned.startsWith(prefix)) {
        detectedCountry = info;
        break;
      }
    }

    const numverifyResult = await Promise.allSettled([
      NUMVERIFY_KEY
        ? withTimeout(
            fetch(`http://apilayer.net/api/validate?access_key=${NUMVERIFY_KEY}&number=${encodeURIComponent(cleaned)}&country_code=&format=1`),
            FETCH_TIMEOUT
          )
        : Promise.reject(new Error("NUMVERIFY_API_KEY not configured")),
    ]);

    if (!NUMVERIFY_KEY) {
      sources["Numverify"] = { success: false, disabled: true, error: "NUMVERIFY_API_KEY not set — get it at https://numverify.com (free: 100 req/month)" };
    } else if (numverifyResult[0].status === "fulfilled" && numverifyResult[0].value.ok) {
      numverifyData = await numverifyResult[0].value.json();
      sources["Numverify"] = { success: true };
    } else {
      sources["Numverify"] = { success: false, error: numverifyResult[0].status === "rejected" ? (numverifyResult[0] as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    sources["Country Code Parser"] = { success: true };

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst. Analyze this phone number intelligence and provide:
1. Number Type Analysis (mobile/landline/VoIP/toll-free)
2. Geographic & Carrier Information
3. Format Validation
4. Risk Assessment (potential for spam/fraud based on country and type)
5. Recommended Investigation Steps
Format as structured Markdown. ${langNote}`,
      `Phone: ${cleaned}
Detected country prefix: ${detectedCountry ? JSON.stringify(detectedCountry) : "unknown"}
Numverify data: ${JSON.stringify(numverifyData).slice(0, 2000)}`
    );

    return res.json({
      sources,
      results: { phone: cleaned, numverifyData, callerData, detectedCountry },
      analysis: analysisText,
      riskLevel: "medium" as const,
      recommendations: [
        "Verify ownership before taking action",
        "Cross-reference with spam databases (TrueCaller, 800notes)",
        "Report to carrier if suspected fraud",
        "Use reverse lookup services for further verification",
        "Check if number is VoIP — common in scam calls",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Phone OSINT failed" });
  }
});

// ── URL ───────────────────────────────────────────────────────────────────────
router.post("/osint/url", async (req, res) => {
  try {
    const body = req.body as { url?: string; language?: string };
    const url = (body.url ?? "").trim();
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Valid URL required" });
    }
    if (isPrivateUrl(url)) {
      return res.status(403).json({ error: "Private/internal URLs are not allowed" });
    }

    const langNote = body.language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string; disabled?: boolean }> = {};
    const VT_KEY = process.env.VT_API_KEY;

    let pageContent = "";
    let pageTitle = url;
    let pageStatus = 0;
    let pageHeaders: Record<string, string> = {};
    let vtUrlData: unknown = null;
    let urlscanData: unknown = null;

    const [fetchResult, vtUrlResult, urlscanResult] = await Promise.allSettled([
      withTimeout(fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; mr7-osint/1.0)" },
      }), FETCH_TIMEOUT),
      VT_KEY
        ? withTimeout(fetch(`https://www.virustotal.com/api/v3/urls`, {
            method: "POST",
            headers: { "x-apikey": VT_KEY, "Content-Type": "application/x-www-form-urlencoded" },
            body: `url=${encodeURIComponent(url)}`,
          }), FETCH_TIMEOUT)
        : Promise.reject(new Error("VT_API_KEY not configured")),
      withTimeout(fetch(`https://urlscan.io/api/v1/search/?q=page.url:"${encodeURIComponent(url)}"&size=1`, {
        headers: { "User-Agent": "mr7-osint/1.0" },
      }), SHORT_TIMEOUT),
    ]);

    if (fetchResult.status === "fulfilled" && fetchResult.value.ok) {
      const html = await fetchResult.value.text();
      pageStatus = fetchResult.value.status;
      fetchResult.value.headers.forEach((v, k) => { pageHeaders[k] = v; });
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : url;
      sources["HTTP Fetch"] = { success: true };
    } else {
      sources["HTTP Fetch"] = { success: false, error: fetchResult.status === "rejected" ? (fetchResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    if (!VT_KEY) {
      sources["VirusTotal URL"] = { success: false, disabled: true, error: "VT_API_KEY not set — get it at https://virustotal.com" };
    } else if (vtUrlResult.status === "fulfilled" && vtUrlResult.value.ok) {
      vtUrlData = await vtUrlResult.value.json();
      sources["VirusTotal URL"] = { success: true };
    } else {
      sources["VirusTotal URL"] = { success: false, error: "Request failed" };
    }

    if (urlscanResult.status === "fulfilled" && urlscanResult.value.ok) {
      const usJson = await urlscanResult.value.json() as { results?: unknown[] };
      if ((usJson.results?.length ?? 0) > 0) {
        urlscanData = usJson.results?.[0];
        sources["URLScan.io"] = { success: true };
      } else {
        sources["URLScan.io"] = { success: true };
      }
    } else {
      sources["URLScan.io"] = { success: false, error: urlscanResult.status === "rejected" ? (urlscanResult as PromiseRejectedResult).reason?.message : "Request failed" };
    }

    const iocs = extractIocs(pageContent);
    const securityHeaders = {
      csp: pageHeaders["content-security-policy"] ?? null,
      hsts: pageHeaders["strict-transport-security"] ?? null,
      xfo: pageHeaders["x-frame-options"] ?? null,
      xcto: pageHeaders["x-content-type-options"] ?? null,
      rp: pageHeaders["referrer-policy"] ?? null,
    };

    const missingSecHeaders = Object.entries(securityHeaders).filter(([, v]) => !v).map(([k]) => k.toUpperCase());

    const analysisText = await aiAnalyze(
      `You are a cyber OSINT analyst. Analyze the fetched URL intelligence and provide:
1. Executive Summary
2. Technology Fingerprinting
3. Security Headers Assessment
4. IOC Analysis (IPs/domains/emails found in page)
5. VirusTotal Reputation (if available)
6. URLScan.io History (if available)
7. Threat Assessment (malicious/suspicious/clean)
8. Recommended Next Steps
Format as structured Markdown. ${langNote}`,
      `URL: ${url}
Title: ${pageTitle}
HTTP Status: ${pageStatus}
Security Headers Missing: ${missingSecHeaders.join(", ") || "none"}
Headers: ${JSON.stringify(pageHeaders).slice(0, 500)}
IOCs found: ${JSON.stringify(iocs).slice(0, 1000)}
Content preview: ${pageContent.slice(0, 1500)}
VirusTotal URL data: ${JSON.stringify(vtUrlData).slice(0, 500)}
URLScan.io data: ${JSON.stringify(urlscanData).slice(0, 500)}`
    );

    const hasIocs = Object.values(iocs).some(arr => arr.length > 0);
    const riskScore = hasIocs ? 45 : missingSecHeaders.length > 3 ? 25 : 10;

    return res.json({
      sources,
      results: {
        url,
        title: pageTitle,
        status: pageStatus,
        iocs,
        securityHeaders,
        missingSecHeaders,
        vtUrlData,
        urlscanData,
        contentLength: pageContent.length,
        serverHeader: pageHeaders["server"] ?? null,
        poweredBy: pageHeaders["x-powered-by"] ?? null,
      },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        ...missingSecHeaders.map(h => `Add missing security header: ${h}`),
        hasIocs ? "Investigate IOCs found in page content" : "No IOCs detected in page",
        "Submit URL to URLScan.io for full browser analysis",
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OSINT URL analysis failed";
    return res.status(500).json({ error: message });
  }
});

// ── ANALYZE (text/image/domain/ip/hash) ──────────────────────────────────────
router.post("/osint/analyze", async (req, res) => {
  try {
    const body = req.body as {
      content?: string;
      type?: "text" | "image" | "domain" | "ip" | "hash";
      filename?: string;
      language?: string;
    };
    const content = (body.content ?? "").trim();
    const type = body.type ?? "text";
    const filename = body.filename ?? "";
    const langNote = body.language === "ar" ? "Respond in Arabic." : "Respond in English.";

    if (!content) return res.status(400).json({ error: "content required" });

    let analysisMessages: { role: "system" | "user"; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[] = [];

    if (type === "image" && content.startsWith("data:image/")) {
      analysisMessages = [
        {
          role: "system",
          content: `You are a cyber OSINT analyst specializing in visual intelligence. ${langNote} Analyze this image for: embedded text (OCR), metadata hints, visible IOCs (IPs, domains, hashes, CVEs), technology identifiers, threat actor artifacts, geolocation clues, and any sensitive data. Produce a structured OSINT report.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Image file: ${filename || "unknown"}. Perform a thorough OSINT analysis.` },
            { type: "image_url", image_url: { url: content } },
          ],
        },
      ];
    } else {
      const iocs = extractIocs(content);
      const iocSummary = Object.entries(iocs)
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => `${k}: ${v.slice(0, 5).join(", ")}${v.length > 5 ? ` +${v.length - 5} more` : ""}`)
        .join("\n");

      const typeContexts: Record<string, string> = {
        text: "Analyze this text for threat intelligence: extract IOCs, infer context (malware, phishing, recon, exploit, etc.), identify threat actors or campaigns if recognizable, assess severity.",
        domain: "Perform domain OSINT analysis: infer registrar patterns, infrastructure relationships, look for DGA patterns, parking, sinkholing. Assess maliciousness.",
        ip: "Perform IP OSINT: classify (residential/datacenter/TOR/VPN), infer geolocation hints, look for known threat actor ASNs, identify likely use.",
        hash: "Analyze this file hash: classify type (MD5/SHA1/SHA256), infer file type from length, note this would be looked up in VirusTotal/MISP/OTX in a real workflow.",
      };

      analysisMessages = [
        {
          role: "system",
          content: `You are a cyber OSINT analyst. ${typeContexts[type] ?? typeContexts.text} ${langNote} Produce a structured Markdown report with: Executive Summary, IOCs Found, Context Analysis, Threat Assessment, and Recommended Actions.`,
        },
        {
          role: "user",
          content: `File: ${filename || "pasted content"}\nType: ${type}\n\nExtracted IOCs:\n${iocSummary || "(none)"}\n\nContent:\n${content.slice(0, 4000)}`,
        },
      ];
    }

    const completion = await requirePersonalOpenAI().chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: 2000,
      messages: analysisMessages as import("openai/resources/chat/completions").ChatCompletionMessageParam[],
    });

    const iocs = type === "image" ? {} : extractIocs(content);

    return res.json({
      analysis: completion.choices?.[0]?.message?.content ?? "",
      iocs,
      type,
      filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OSINT analysis failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
