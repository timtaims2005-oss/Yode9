import { Router, type Request, type Response } from "express";
import { callOnce } from "../lib/ai-providers";

const router = Router();

/* ══════════════════════════════════════════════════════════════════
   OSINT ADVANCED ENGINE v2 — محرك OSINT المتقدم
   DNS · crt.sh · HIBP · VirusTotal · Shodan · Censys · Wayback
   Whois · GeoIP · ASN · ReverseIP · Subdomains · EmailRep
   PassiveDNS · GitHub · Pastebin · ThreatFeed · GreyNoise
══════════════════════════════════════════════════════════════════ */

function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

// ── DNS full scan ─────────────────────────────────────────────────
async function dnsLookup(domain: string): Promise<Record<string, unknown>> {
  const types = ["A", "AAAA", "MX", "TXT", "NS", "SRV", "CNAME", "SOA", "PTR", "CAA", "DNSKEY"];
  const results: Record<string, unknown> = {};
  await Promise.allSettled(
    types.map(async (type) => {
      try {
        const r = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const d = await r.json() as { Answer?: unknown[]; Authority?: unknown[] };
          results[type] = d.Answer ?? d.Authority ?? [];
        }
      } catch { results[type] = []; }
    })
  );
  return results;
}

// ── SSL Certificates via crt.sh ───────────────────────────────────
async function crtShLookup(domain: string): Promise<unknown[]> {
  const queries = [`%.${domain}`, domain];
  for (const q of queries) {
    try {
      const r = await fetch(
        `https://crt.sh/?q=${encodeURIComponent(q)}&output=json&deduplicate=Y`,
        {
          signal: AbortSignal.timeout(12000),
          headers: { "Accept": "application/json", "User-Agent": "KaliGPT-OSINT/2.0" },
        }
      );
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.trim().length < 2) continue;
      const data = JSON.parse(text) as unknown[];
      if (!Array.isArray(data) || data.length === 0) continue;
      const seen = new Set<string>();
      return data.slice(0, 100).filter((c: unknown) => {
        const cert = c as Record<string, unknown>;
        const key = String(cert.common_name ?? cert.id);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    } catch { continue; }
  }
  return [];
}

// ── Have I Been Pwned ─────────────────────────────────────────────
async function hibpLookup(email: string, apiKey?: string): Promise<unknown[]> {
  if (!apiKey) {
    return [{ simulated: true, message: "HIBP API key required. Provide HIBP_API_KEY in environment." }];
  }
  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": apiKey, "User-Agent": "KaliGPT-OSINT/2.0" }, signal: AbortSignal.timeout(6000) }
    );
    if (r.status === 404) return [];
    if (!r.ok) return [{ error: `HIBP HTTP ${r.status}` }];
    return await r.json() as unknown[];
  } catch (e) { return [{ error: String(e) }]; }
}

// ── VirusTotal IP/Domain/URL/Hash ─────────────────────────────────
async function virusTotalLookup(target: string, type: "ip" | "domain" | "url" | "file", apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return { simulated: true, message: "VT_API_KEY required.", target, type, stats: { malicious: 0, suspicious: 1, harmless: 60, undetected: 10 } };
  }
  try {
    let url = "";
    if (type === "ip") url = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`;
    else if (type === "domain") url = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(target)}`;
    else if (type === "file") url = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(target)}`;
    else {
      const b64 = Buffer.from(target).toString("base64url");
      url = `https://www.virustotal.com/api/v3/urls/${b64}`;
    }
    const r = await fetch(url, { headers: { "x-apikey": apiKey }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { error: `VT HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Censys ────────────────────────────────────────────────────────
async function censysLookup(target: string, apiId?: string, apiSecret?: string): Promise<unknown> {
  if (!apiId || !apiSecret) {
    return {
      simulated: true,
      query: target,
      message: "Censys API credentials required.",
      results: [
        { ip: target, protocols: ["443/https", "80/http", "22/ssh"], location: { country: "محاكاة" }, autonomous_system: { name: "ISP محاكاة" } },
      ],
    };
  }
  try {
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(target);
    const endpoint = isIp
      ? `https://search.censys.io/api/v2/hosts/${encodeURIComponent(target)}`
      : `https://search.censys.io/api/v2/hosts/search?q=${encodeURIComponent(target)}&per_page=10`;
    const r = await fetch(endpoint, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiId}:${apiSecret}`).toString("base64")}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { error: `Censys HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Shodan IP lookup ──────────────────────────────────────────────
async function shodanLookup(ip: string, apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return {
      simulated: true, ip,
      ports: [80, 443, 22, 8080, 8443, 21, 25, 3306, 5432, 6379],
      country_name: "محاكاة", org: "محاكاة",
      hostnames: [`host.${ip.replace(/\./g, "-")}.example.com`],
      vulns: ["CVE-2024-1234", "CVE-2023-5678"], os: null, isp: "ISP محاكاة",
      tags: ["cdn", "self-signed"],
      data: [{ port: 80, transport: "tcp", product: "nginx", version: "1.18.0" }],
    };
  }
  try {
    const r = await fetch(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return { error: `Shodan HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Wayback Machine ───────────────────────────────────────────────
async function waybackLookup(domain: string): Promise<unknown> {
  try {
    const r = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&limit=30&fl=timestamp,original,statuscode,mimetype&collapse=urlkey`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!r.ok) return { snapshots: [] };
    const data = await r.json() as unknown[][];
    const [headers, ...rows] = data;
    if (!headers) return { snapshots: [] };
    const hdr = headers as string[];
    return {
      total: rows.length,
      snapshots: rows.slice(0, 30).map(row => {
        const r2 = row as string[];
        return Object.fromEntries(hdr.map((h, i) => [h, r2[i]]));
      }),
    };
  } catch (e) { return { error: String(e), snapshots: [] }; }
}

// ── IP Geolocation ────────────────────────────────────────────────
async function geoLookup(ip: string): Promise<unknown> {
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

// ── WHOIS via rdap ────────────────────────────────────────────────
async function whoisLookup(target: string): Promise<unknown> {
  const endpoints = [
    `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(target)}`,
    `https://rdap.org/domain/${encodeURIComponent(target)}`,
    `https://rdap.iana.org/domain/${encodeURIComponent(target)}`,
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, { signal: AbortSignal.timeout(6000) });
      if (r.ok) return await r.json();
    } catch { continue; }
  }
  return { error: "WHOIS lookup failed for all RDAP endpoints" };
}

// ── ASN / BGP Lookup ─────────────────────────────────────────────
async function asnLookup(target: string): Promise<unknown> {
  try {
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(target);
    const isAsn = /^AS\d+$/i.test(target);
    let url = "";
    if (isIp) url = `https://api.bgpview.io/ip/${encodeURIComponent(target)}`;
    else if (isAsn) url = `https://api.bgpview.io/asn/${encodeURIComponent(target).replace(/^AS/i, "")}`;
    else url = `https://api.bgpview.io/search?query_term=${encodeURIComponent(target)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "KaliGPT-OSINT/2.0" } });
    if (!r.ok) return { error: `BGPView HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Reverse IP / Domain Hosting ───────────────────────────────────
async function reverseIpLookup(ip: string): Promise<unknown> {
  try {
    const r = await fetch(`https://api.hackertarget.com/reverseiplookup/?q=${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "KaliGPT-OSINT/2.0" },
    });
    if (!r.ok) return { error: `ReverseIP HTTP ${r.status}` };
    const text = await r.text();
    if (text.includes("error")) return { error: text };
    const domains = text.trim().split("\n").filter(Boolean);
    return { ip, domains, count: domains.length };
  } catch (e) { return { error: String(e) }; }
}

// ── Email Reputation ──────────────────────────────────────────────
async function emailRepLookup(email: string): Promise<unknown> {
  try {
    const r = await fetch(`https://emailrep.io/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "KaliGPT-OSINT/2.0", "Accept": "application/json" },
    });
    if (!r.ok) return { error: `EmailRep HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Subdomain Enumeration ─────────────────────────────────────────
async function subdomainEnum(domain: string): Promise<unknown> {
  const subdomains = new Set<string>();

  // Source 1: crt.sh subdomains
  try {
    const certs = await crtShLookup(domain) as Array<{ common_name?: string; name_value?: string }>;
    for (const cert of certs) {
      const names = [cert.common_name, ...(cert.name_value?.split("\n") ?? [])];
      for (const name of names) {
        if (name && name.endsWith(`.${domain}`) && !name.includes("*")) {
          subdomains.add(name.toLowerCase().trim());
        }
      }
    }
  } catch { /* ignore */ }

  // Source 2: HackerTarget
  try {
    const r = await fetch(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const text = await r.text();
      for (const line of text.split("\n")) {
        const [sub] = line.split(",");
        if (sub && sub.endsWith(`.${domain}`)) subdomains.add(sub.trim());
      }
    }
  } catch { /* ignore */ }

  // Source 3: DNS brute force common names
  const commonSubs = [
    "www", "mail", "remote", "blog", "webmail", "server", "ns1", "ns2",
    "smtp", "secure", "vpn", "m", "shop", "ftp", "api", "dev", "staging",
    "portal", "admin", "ssh", "owa", "cdn", "app", "test", "backend",
    "login", "support", "help", "en", "ar", "static", "assets", "media",
  ];

  await Promise.allSettled(
    commonSubs.map(async (sub) => {
      try {
        const full = `${sub}.${domain}`;
        const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(full)}&type=A`, {
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) {
          const d = await r.json() as { Answer?: unknown[] };
          if (d.Answer && d.Answer.length > 0) subdomains.add(full);
        }
      } catch { /* ignore */ }
    })
  );

  return {
    domain,
    subdomains: [...subdomains].sort(),
    count: subdomains.size,
  };
}

// ── GreyNoise IP Check ────────────────────────────────────────────
async function greyNoiseLookup(ip: string, apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return {
      simulated: true,
      ip,
      seen: Math.random() > 0.5,
      classification: ["benign", "malicious", "unknown"][Math.floor(Math.random() * 3)],
      name: "محاكاة - GreyNoise API key required",
      tags: ["scanner", "tor"],
      message: "Provide GREYNOISE_API_KEY for real data",
    };
  }
  try {
    const r = await fetch(`https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`, {
      headers: { "key": apiKey, "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { error: `GreyNoise HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── GitHub Recon ──────────────────────────────────────────────────
async function githubRecon(target: string): Promise<unknown> {
  try {
    const isOrg = !target.includes("@");
    const endpoint = isOrg
      ? `https://api.github.com/orgs/${encodeURIComponent(target)}`
      : `https://api.github.com/search/users?q=${encodeURIComponent(target.replace("@", ""))}+in:email`;

    const [userR, reposR] = await Promise.allSettled([
      fetch(endpoint, { headers: { "User-Agent": "KaliGPT-OSINT/2.0", "Accept": "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(6000) }),
      fetch(`https://api.github.com/orgs/${encodeURIComponent(target)}/repos?per_page=10&sort=updated`, {
        headers: { "User-Agent": "KaliGPT-OSINT/2.0" }, signal: AbortSignal.timeout(6000),
      }),
    ]);

    const result: Record<string, unknown> = { target };
    if (userR.status === "fulfilled" && userR.value.ok) result.profile = await userR.value.json();
    if (reposR.status === "fulfilled" && reposR.value.ok) result.repos = await reposR.value.json();
    return result;
  } catch (e) { return { error: String(e) }; }
}

// ── Pastebin/Paste Search ─────────────────────────────────────────
async function pastebinSearch(target: string): Promise<unknown> {
  try {
    const r = await fetch(`https://psbdmp.ws/api/v3/search/${encodeURIComponent(target)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "KaliGPT-OSINT/2.0" },
    });
    if (r.ok) {
      const data = await r.json() as { data?: unknown[] };
      return { target, results: data.data?.slice(0, 10) ?? [], source: "psbdmp.ws" };
    }
  } catch { /* ignore */ }

  // Fallback simulated
  return {
    simulated: true,
    target,
    results: [
      { id: "abc123", tags: ["credentials", "dump"], date: "2024-01", size: 4521 },
      { id: "def456", tags: ["email", "password"], date: "2023-11", size: 2103 },
    ],
    message: "Live paste search attempted — showing simulated results",
  };
}

// ── Threat Intelligence Feed ──────────────────────────────────────
async function threatFeedLookup(target: string): Promise<unknown> {
  const results: Record<string, unknown> = {};

  // ThreatFox
  try {
    const r = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "search_ioc", search_term: target }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) results.threatfox = await r.json();
  } catch { /* ignore */ }

  // URLhaus
  try {
    const r = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `host=${encodeURIComponent(target)}`,
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) results.urlhaus = await r.json();
  } catch { /* ignore */ }

  return results;
}

// ── Passive DNS via SecurityTrails fallback ───────────────────────
async function passiveDns(domain: string): Promise<unknown> {
  try {
    // Use HackerTarget as free passive DNS source
    const r = await fetch(`https://api.hackertarget.com/dnslookup/?q=${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const text = await r.text();
      const records = text.trim().split("\n").map(line => {
        const parts = line.split(" ");
        return { name: parts[0], type: parts[1], value: parts[parts.length - 1] };
      });
      return { domain, records, source: "HackerTarget" };
    }
  } catch { /* ignore */ }

  // Fallback to DNS over HTTPS
  return await dnsLookup(domain);
}

// ── Certificate Transparency (detailed) ──────────────────────────
async function certTransparency(domain: string): Promise<unknown> {
  const certs = await crtShLookup(domain) as Array<Record<string, unknown>>;
  const issuers = new Map<string, number>();
  const subdomains = new Set<string>();
  let earliest = "";
  let latest = "";

  for (const cert of certs) {
    const issuer = String(cert.issuer_name ?? "Unknown");
    issuers.set(issuer, (issuers.get(issuer) ?? 0) + 1);
    const names = [cert.common_name, ...(String(cert.name_value ?? "").split("\n"))];
    for (const n of names) {
      if (n && typeof n === "string" && n.endsWith(`.${domain}`)) subdomains.add(n.trim());
    }
    const notBefore = String(cert.not_before ?? "");
    if (!earliest || notBefore < earliest) earliest = notBefore;
    if (!latest || notBefore > latest) latest = notBefore;
  }

  return {
    domain,
    totalCerts: certs.length,
    subdomains: [...subdomains].sort(),
    subdomainCount: subdomains.size,
    issuers: Object.fromEntries([...issuers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)),
    earliest,
    latest,
    certs: certs.slice(0, 20),
  };
}

// ── IP Abuse Check ────────────────────────────────────────────────
async function abuseIPCheck(ip: string, apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return { simulated: true, ip, abuseConfidenceScore: Math.floor(Math.random() * 100), countryCode: "XX", message: "Provide ABUSEIPDB_API_KEY for real data" };
  }
  try {
    const r = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, {
      headers: { "Key": apiKey, "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { error: `AbuseIPDB HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Social Media Presence Check ───────────────────────────────────
async function socialPresenceCheck(username: string): Promise<unknown> {
  const platforms = [
    { name: "Twitter/X",   url: `https://twitter.com/${username}` },
    { name: "GitHub",      url: `https://github.com/${username}` },
    { name: "Instagram",   url: `https://www.instagram.com/${username}` },
    { name: "LinkedIn",    url: `https://www.linkedin.com/in/${username}` },
    { name: "TikTok",      url: `https://www.tiktok.com/@${username}` },
    { name: "Reddit",      url: `https://www.reddit.com/user/${username}` },
    { name: "YouTube",     url: `https://www.youtube.com/@${username}` },
    { name: "Pinterest",   url: `https://www.pinterest.com/${username}` },
    { name: "Snapchat",    url: `https://www.snapchat.com/add/${username}` },
    { name: "Twitch",      url: `https://www.twitch.tv/${username}` },
    { name: "Medium",      url: `https://medium.com/@${username}` },
    { name: "GitLab",      url: `https://gitlab.com/${username}` },
    { name: "Keybase",     url: `https://keybase.io/${username}` },
    { name: "HackerNews",  url: `https://news.ycombinator.com/user?id=${username}` },
  ];

  const results = await Promise.allSettled(
    platforms.map(async (p) => {
      try {
        const r = await fetch(p.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(4000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; KaliGPT-OSINT/2.0)" },
          redirect: "follow",
        });
        return { ...p, status: r.status, found: r.status === 200 };
      } catch {
        return { ...p, status: 0, found: false };
      }
    })
  );

  return {
    username,
    results: results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { ...platforms[i], status: 0, found: false }
    ),
    found: results.filter(r => r.status === "fulfilled" && (r.value as { found: boolean }).found).length,
  };
}

// ── AI Analysis ───────────────────────────────────────────────────
async function aiAnalyze(target: string, allData: Record<string, unknown>): Promise<string> {
  const summary = JSON.stringify(allData, null, 2).slice(0, 5000);
  return callOnce([
    {
      role: "system",
      content: `أنت محلل OSINT خبير متخصص في الأمن السيبراني. حلل البيانات المجمعة وقدم تقريراً احترافياً شاملاً باللغة العربية.`,
    },
    {
      role: "user",
      content: `الهدف: ${target}\n\nالبيانات المجمعة:\n${summary}\n\nقدم تحليلاً شاملاً يشمل:\n1. ملخص تنفيذي\n2. الأصول المكتشفة والبنية التحتية\n3. نقاط الضعف المحتملة والمخاطر\n4. العلاقات بين الكيانات المكتشفة\n5. التوصيات الأمنية\n6. مستوى الخطر الإجمالي (منخفض/متوسط/عالٍ/حرج)\n7. خطوات الاستجابة المقترحة\n\nاكتب بأسلوب احترافي وتقني.`,
    },
  ], 2500);
}

// ── MAIN SCAN ENDPOINT (SSE streaming) ───────────────────────────
router.post("/scan/stream", async (req: Request, res: Response): Promise<void> => {
  const {
    target, modules = [], apiKeys = {}
  } = req.body as {
    target: string;
    modules: string[];
    apiKeys: Record<string, string>;
  };

  if (!target?.trim()) { res.status(400).json({ error: "target required" }); return; }

  sseHeaders(res);
  sse(res, "start", { target, modules, ts: Date.now() });

  const results: Record<string, unknown> = {};
  const tasks: Array<{ id: string; fn: () => Promise<unknown> }> = [];

  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(target.trim());
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.trim());
  const domain = isIp ? "" : isEmail ? target.split("@")[1] : target.replace(/^https?:\/\//, "").split("/")[0];

  if (modules.includes("dns") && (domain || isIp)) {
    tasks.push({ id: "dns", fn: () => dnsLookup(isIp ? target : domain) });
  }
  if (modules.includes("crt") && domain) {
    tasks.push({ id: "crt", fn: () => crtShLookup(domain) });
  }
  if (modules.includes("certTransparency") && domain) {
    tasks.push({ id: "certTransparency", fn: () => certTransparency(domain) });
  }
  if (modules.includes("hibp") && isEmail) {
    tasks.push({ id: "hibp", fn: () => hibpLookup(target, apiKeys["hibp"] || process.env["HIBP_API_KEY"]) });
  }
  if (modules.includes("emailrep") && isEmail) {
    tasks.push({ id: "emailrep", fn: () => emailRepLookup(target) });
  }
  if (modules.includes("vt")) {
    const vtKey = apiKeys["vt"] || process.env["VT_API_KEY"];
    const vtType = isIp ? "ip" : target.includes("http") ? "url" : target.match(/^[0-9a-f]{32,64}$/i) ? "file" : "domain";
    tasks.push({ id: "vt", fn: () => virusTotalLookup(isIp ? target : domain || target, vtType, vtKey) });
  }
  if (modules.includes("shodan")) {
    if (isIp) {
      tasks.push({ id: "shodan", fn: () => shodanLookup(target, apiKeys["shodan"] || process.env["SHODAN_API_KEY"]) });
    } else if (domain) {
      tasks.push({ id: "shodan", fn: async () => {
        const dns = await dnsLookup(domain);
        const aRecords = (dns["A"] as Array<{data?: string}> ?? []).map(r => r.data).filter(Boolean);
        if (aRecords[0]) return shodanLookup(aRecords[0] as string, apiKeys["shodan"] || process.env["SHODAN_API_KEY"]);
        return { error: "No A records found for Shodan lookup" };
      }});
    }
  }
  if (modules.includes("wayback") && (domain || !isIp)) {
    tasks.push({ id: "wayback", fn: () => waybackLookup(domain || target) });
  }
  if (modules.includes("whois") && domain) {
    tasks.push({ id: "whois", fn: () => whoisLookup(domain) });
  }
  if (modules.includes("geo") && isIp) {
    tasks.push({ id: "geo", fn: () => geoLookup(target) });
  }
  if (modules.includes("geo") && !isIp && domain) {
    tasks.push({ id: "geo", fn: async () => {
      const dns = await dnsLookup(domain);
      const aRecords = (dns["A"] as Array<{data?: string}> ?? []).map(r => r.data).filter(Boolean);
      if (aRecords[0]) return geoLookup(aRecords[0] as string);
      return { error: "Could not resolve IP for geolocation" };
    }});
  }
  if (modules.includes("censys")) {
    tasks.push({
      id: "censys",
      fn: () => censysLookup(isIp ? target : domain, apiKeys["censys_id"] || process.env["CENSYS_API_ID"], apiKeys["censys_secret"] || process.env["CENSYS_API_SECRET"]),
    });
  }
  if (modules.includes("asn")) {
    tasks.push({ id: "asn", fn: () => asnLookup(isIp ? target : domain || target) });
  }
  if (modules.includes("reverseip") && isIp) {
    tasks.push({ id: "reverseip", fn: () => reverseIpLookup(target) });
  }
  if (modules.includes("subdomains") && domain) {
    tasks.push({ id: "subdomains", fn: () => subdomainEnum(domain) });
  }
  if (modules.includes("greynoise") && isIp) {
    tasks.push({ id: "greynoise", fn: () => greyNoiseLookup(target, apiKeys["greynoise"] || process.env["GREYNOISE_API_KEY"]) });
  }
  if (modules.includes("github")) {
    tasks.push({ id: "github", fn: () => githubRecon(target) });
  }
  if (modules.includes("pastebin")) {
    tasks.push({ id: "pastebin", fn: () => pastebinSearch(target) });
  }
  if (modules.includes("threatfeed")) {
    tasks.push({ id: "threatfeed", fn: () => threatFeedLookup(target) });
  }
  if (modules.includes("passiveDns") && domain) {
    tasks.push({ id: "passiveDns", fn: () => passiveDns(domain) });
  }
  if (modules.includes("abuseipdb") && isIp) {
    tasks.push({ id: "abuseipdb", fn: () => abuseIPCheck(target, apiKeys["abuseipdb"] || process.env["ABUSEIPDB_API_KEY"]) });
  }
  if (modules.includes("social") && !isIp && !isEmail) {
    tasks.push({ id: "social", fn: () => socialPresenceCheck(target) });
  }

  // Run all tasks in parallel, stream each result as it arrives
  await Promise.allSettled(
    tasks.map(async ({ id, fn }) => {
      sse(res, "module_start", { id, ts: Date.now() });
      try {
        const data = await fn();
        results[id] = data;
        sse(res, "module_done", { id, data, ts: Date.now() });
      } catch (err) {
        results[id] = { error: String(err) };
        sse(res, "module_error", { id, error: String(err), ts: Date.now() });
      }
    })
  );

  // AI Analysis
  sse(res, "ai_start", { ts: Date.now() });
  try {
    const analysis = await aiAnalyze(target, results);
    results["ai_analysis"] = analysis;
    sse(res, "ai_done", { analysis, ts: Date.now() });
  } catch (err) {
    sse(res, "ai_error", { error: String(err), ts: Date.now() });
  }

  sse(res, "complete", { results, ts: Date.now() });
  res.end();
});

// ── Quick DNS only ────────────────────────────────────────────────
router.post("/scan/dns", async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body as { domain: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  try {
    const data = await dnsLookup(domain);
    res.json({ domain, data });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Quick crt.sh ──────────────────────────────────────────────────
router.post("/scan/crt", async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body as { domain: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  try {
    const certs = await crtShLookup(domain);
    res.json({ domain, certs });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Subdomain enum ────────────────────────────────────────────────
router.post("/scan/subdomains", async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body as { domain: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  try {
    const data = await subdomainEnum(domain);
    res.json(data);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── ASN Lookup ────────────────────────────────────────────────────
router.post("/scan/asn", async (req: Request, res: Response): Promise<void> => {
  const { target } = req.body as { target: string };
  if (!target) { res.status(400).json({ error: "target required" }); return; }
  try {
    const data = await asnLookup(target);
    res.json(data);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Social Presence ───────────────────────────────────────────────
router.post("/scan/social", async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body as { username: string };
  if (!username) { res.status(400).json({ error: "username required" }); return; }
  try {
    const data = await socialPresenceCheck(username);
    res.json(data);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Threat Feed ───────────────────────────────────────────────────
router.post("/scan/threatfeed", async (req: Request, res: Response): Promise<void> => {
  const { target } = req.body as { target: string };
  if (!target) { res.status(400).json({ error: "target required" }); return; }
  try {
    const data = await threatFeedLookup(target);
    res.json(data);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Generate Report ───────────────────────────────────────────────
router.post("/report/generate", async (req: Request, res: Response): Promise<void> => {
  const { target, results, analysis } = req.body as { target: string; results: unknown; analysis: string };
  try {
    const report = await callOnce([
      {
        role: "system",
        content: "أنت خبير OSINT وأمن سيبراني. أنشئ تقريراً احترافياً بصيغة Markdown شاملاً ومفصلاً.",
      },
      {
        role: "user",
        content: `أنشئ تقرير OSINT احترافي وشامل للهدف: ${target}\n\nالتحليل:\n${analysis}\n\nالبيانات:\n${JSON.stringify(results, null, 2).slice(0, 4000)}\n\nالتقرير يجب أن يشمل:\n- غلاف التقرير مع التاريخ والتصنيف\n- ملخص تنفيذي\n- منهجية الفحص والأدوات المستخدمة\n- النتائج التفصيلية لكل وحدة\n- خريطة البنية التحتية\n- نقاط الضعف والمخاطر مصنفة حسب الخطورة\n- التوصيات والحلول\n- خطة الاستجابة للحوادث\n- المراجع والمصادر`,
      },
    ], 3500);
    res.json({ report, target, generatedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
