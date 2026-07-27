/**
 * Free OSINT API Routes — no paid API keys required (except HIBP optional)
 * ─────────────────────────────────────────────────────────────────────────
 * GET  /api/osint/dns/:target          DNS enumeration (A, AAAA, MX, TXT, NS, CNAME, SOA)
 * GET  /api/osint/whois/:domain        RDAP WHOIS lookup (rdap.org free)
 * GET  /api/osint/cve                  NIST NVD CVE search (?keyword=&limit=&severity=)
 * GET  /api/osint/hibp/:email          HaveIBeenPwned breach check (HIBP_API_KEY optional)
 * GET  /api/osint/shodan/ip/:ip        Shodan InternetDB (free, no key)
 * GET  /api/osint/crtsh/:domain        Certificate Transparency (crt.sh free)
 * GET  /api/osint/ipinfo/:ip           IP geolocation + ASN (ipinfo.io free tier)
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import dns from "dns";
import { cacheGet, cacheSet } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { requireUnifiedAuth } from "../middlewares/unifiedAuthMiddleware.js";

const router = Router();

// ── Auth guard: all OSINT-free endpoints require a signed-in user ─────────────
// Accepts any auth strategy except anonymous: Clerk session, API key,
// Bearer JWT, Cloudflare Access, or internal key.
router.use("/osint", requireUnifiedAuth);
// Alias to avoid collision with Express Response
type FetchRes = Awaited<ReturnType<typeof fetch>>;

const TIMEOUT = 10_000;
const safeFetch = (url: string, init: RequestInit = {}): Promise<FetchRes> =>
  fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });

// ─── Input validators ────────────────────────────────────────────────────────
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const IP_RE     = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDomain(s: string): boolean { return DOMAIN_RE.test(s); }
function isIP(s: string):     boolean { return IP_RE.test(s); }
function isEmail(s: string):  boolean { return EMAIL_RE.test(s); }

// ─── Zod schemas ─────────────────────────────────────────────────────────────
const CveQuerySchema = z.object({
  keyword:  z.string().min(1).max(200).trim().optional(),
  cveId:    z.string().regex(/^CVE-\d{4}-\d{4,7}$/i).optional(),
  severity: z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]).optional(),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
}).refine(d => d.keyword || d.cveId, { message: "Either keyword or cveId is required" });

// ────────────────────────────────────────────────────────────────────────────
// 1. DNS ENUMERATION
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/dns/:target", async (req: Request<{ target: string }>, res: Response): Promise<void> => {
  const { target } = req.params;
  if (!isDomain(target) && !isIP(target)) {
    res.status(400).json({ success: false, error: "Invalid domain or IP address" });
    return;
  }

  const cacheKey = `osint:dns:${target}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  const resolver = new dns.promises.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1", "9.9.9.9"]);

  const settle = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try { return await fn(); } catch { return null; }
  };

  try {
    const [A, AAAA, MX, TXT, NS, CNAME, SOA] = await Promise.all([
      settle(() => resolver.resolve4(target, { ttl: true })),
      settle(() => resolver.resolve6(target)),
      settle(() => resolver.resolveMx(target)),
      settle(() => resolver.resolveTxt(target)),
      settle(() => resolver.resolveNs(target)),
      settle(() => resolver.resolveCname(target)),
      settle(() => resolver.resolveSoa(target)),
    ]);

    const data = {
      target, timestamp: new Date().toISOString(),
      A, AAAA, MX, TXT: (TXT as string[][] | null)?.map(r => r.join(" ")),
      NS, CNAME, SOA,
      spfRecord:  (TXT as string[][] | null)?.flat().find(r => r.startsWith("v=spf1")) ?? null,
      dmarcRecord:(TXT as string[][] | null)?.flat().find(r => r.toLowerCase().startsWith("v=dmarc1")) ?? null,
    };
    await cacheSet(cacheKey, data, 300).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, target }, "[osint/dns] lookup failed");
    res.status(500).json({ success: false, error: "DNS lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. WHOIS via RDAP (free, no key)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/whois/:domain", async (req: Request<{ domain: string }>, res: Response): Promise<void> => {
  const { domain } = req.params;
  const target = domain.toLowerCase().trim();
  if (!isDomain(target) && !isIP(target)) {
    res.status(400).json({ success: false, error: "Invalid domain or IP" });
    return;
  }

  const cacheKey = `osint:whois:${target}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    const url = isIP(target)
      ? `https://rdap.arin.net/registry/ip/${encodeURIComponent(target)}`
      : `https://rdap.org/domain/${encodeURIComponent(target)}`;

    const r = await safeFetch(url, { headers: { "Accept": "application/rdap+json, application/json" } });
    if (!r.ok) {
      res.status(r.status).json({ success: false, error: `RDAP returned HTTP ${r.status}` });
      return;
    }
    const raw = await r.json() as Record<string, unknown>;

    // Normalise key fields
    const events   = (raw.events as Array<{ eventAction: string; eventDate: string }> | undefined) ?? [];
    const entities = (raw.entities as Array<{ vcardArray?: unknown[][]; roles?: string[] }> | undefined) ?? [];
    const status   = raw.status as string[] | undefined;
    const nameservers = (raw.nameservers as Array<{ ldhName?: string }> | undefined) ?? [];

    const getDate = (action: string): string | null =>
      events.find(e => e.eventAction === action)?.eventDate ?? null;

    const extractVcard = (e: typeof entities[0]): { name?: string; email?: string; org?: string } => {
      const arr = (e.vcardArray?.[1] ?? []) as Array<[string, unknown, unknown, string]>;
      const fn  = arr.find(v => v[0] === "fn");
      const email = arr.find(v => v[0] === "email");
      const org = arr.find(v => v[0] === "org");
      return { name: fn?.[3], email: email?.[3], org: org?.[3] };
    };

    const registrar = entities.find(e => e.roles?.includes("registrar"));
    const registrant = entities.find(e => e.roles?.includes("registrant"));

    const data = {
      domain: target,
      ldhName: raw.ldhName ?? target,
      status: status ?? [],
      registrar:  registrar  ? extractVcard(registrar)  : null,
      registrant: registrant ? extractVcard(registrant) : null,
      nameservers: nameservers.map(ns => ns.ldhName).filter(Boolean),
      registered: getDate("registration"),
      updated:    getDate("last changed"),
      expires:    getDate("expiration"),
      timestamp:  new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 3600).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, domain }, "[osint/whois] lookup failed");
    res.status(500).json({ success: false, error: "WHOIS lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 3. NIST NVD CVE Search (free, rate-limit 5 req/30s unauthenticated)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/cve", async (req: Request, res: Response): Promise<void> => {
  const parse = CveQuerySchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parse.error.issues });
    return;
  }
  const { keyword, cveId, severity, limit } = parse.data;

  const cacheKey = `osint:cve:${cveId ?? keyword ?? ""}:${severity ?? ""}:${limit}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    const params = new URLSearchParams();
    if (cveId)    params.set("cveId", cveId.toUpperCase());
    if (keyword)  params.set("keywordSearch", keyword);
    if (severity) params.set("cvssV3Severity", severity);
    params.set("resultsPerPage", String(limit));

    const nvdKey = process.env.NVD_API_KEY;
    const headers: Record<string, string> = { "User-Agent": "mr7-osint/2.0" };
    if (nvdKey) headers["apiKey"] = nvdKey;

    const r = await safeFetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?${params}`, { headers });

    if (!r.ok) {
      res.status(r.status).json({ success: false, error: `NVD API returned HTTP ${r.status}` });
      return;
    }

    const raw = await r.json() as {
      totalResults?: number;
      resultsPerPage?: number;
      vulnerabilities?: Array<{
        cve: {
          id: string;
          published: string;
          lastModified: string;
          descriptions?: Array<{ lang: string; value: string }>;
          metrics?: {
            cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }>;
            cvssMetricV30?: Array<{ cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }>;
          };
          references?: Array<{ url: string; source?: string; tags?: string[] }>;
          weaknesses?: Array<{ description: Array<{ value: string }> }>;
        };
      }>;
    };

    const cves = (raw.vulnerabilities ?? []).map(v => {
      const cve = v.cve;
      const desc = cve.descriptions?.find(d => d.lang === "en")?.value ?? "No description";
      const cvssV3 = cve.metrics?.cvssMetricV31?.[0] ?? cve.metrics?.cvssMetricV30?.[0];
      const cwes = cve.weaknesses?.flatMap(w => w.description.map(d => d.value)).filter(s => s !== "NVD-CWE-noinfo") ?? [];
      return {
        id:         cve.id,
        published:  cve.published,
        modified:   cve.lastModified,
        description: desc,
        score:      cvssV3?.cvssData.baseScore ?? null,
        severity:   cvssV3?.cvssData.baseSeverity ?? null,
        vector:     cvssV3?.cvssData.vectorString ?? null,
        cwes,
        references: (cve.references ?? []).slice(0, 5).map(r => r.url),
      };
    });

    const data = {
      keyword, cveId, severity,
      total:  raw.totalResults ?? cves.length,
      count:  cves.length,
      cves,
      source: "NIST NVD",
      timestamp: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 900).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err }, "[osint/cve] NVD lookup failed");
    res.status(500).json({ success: false, error: "CVE lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. HaveIBeenPwned (HIBP_API_KEY optional — free for educational use)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/hibp/:email", async (req: Request<{ email: string }>, res: Response): Promise<void> => {
  const email = decodeURIComponent(req.params.email).toLowerCase().trim();
  if (!isEmail(email)) {
    res.status(400).json({ success: false, error: "Invalid email address" });
    return;
  }

  const apiKey = process.env.HIBP_API_KEY;
  const cacheKey = `osint:hibp:${email}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    const headers: Record<string, string> = {
      "User-Agent":    "mr7-osint/2.0",
      "hibp-api-key":  apiKey ?? "",
    };

    const [breachRes, pasteRes] = await Promise.allSettled([
      safeFetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, { headers }),
      apiKey ? safeFetch(`https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(email)}`, { headers }) : Promise.resolve(null),
    ]);

    let breaches: object[] = [];
    let breachError: string | null = null;
    if (breachRes.status === "fulfilled" && breachRes.value) {
      const r = breachRes.value;
      if (r.status === 404) {
        breaches = []; // Not found in any breach
      } else if (r.ok) {
        breaches = await r.json() as object[];
      } else {
        breachError = `HIBP returned HTTP ${r.status}${r.status === 401 ? " (API key required)" : ""}`;
      }
    } else if (breachRes.status === "rejected") {
      breachError = String(breachRes.reason);
    }

    let pastes: object[] | null = null;
    if (pasteRes.status === "fulfilled" && pasteRes.value && (pasteRes.value as FetchRes).ok) {
      pastes = await (pasteRes.value as FetchRes).json() as object[];
    }

    const data = {
      email,
      breachCount: breaches.length,
      pasteCount:  pastes?.length ?? null,
      breaches: (breaches as Array<{ Name: string; Domain?: string; BreachDate?: string; AddedDate?: string; PwnCount?: number; Description?: string; DataClasses?: string[]; IsVerified?: boolean; IsSensitive?: boolean }>).map(b => ({
        name:        b.Name,
        domain:      b.Domain,
        breachDate:  b.BreachDate,
        addedDate:   b.AddedDate,
        pwnCount:    b.PwnCount,
        description: b.Description,
        dataClasses: b.DataClasses,
        isVerified:  b.IsVerified,
        isSensitive: b.IsSensitive,
      })),
      pastes,
      apiKeyPresent: !!apiKey,
      error: breachError,
      timestamp: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 600).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, email }, "[osint/hibp] lookup failed");
    res.status(500).json({ success: false, error: "HIBP lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Shodan InternetDB (free, no key — basic port/CVE data per IP)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/shodan/ip/:ip", async (req: Request<{ ip: string }>, res: Response): Promise<void> => {
  const { ip } = req.params;
  if (!isIP(ip)) {
    res.status(400).json({ success: false, error: "Invalid IPv4 address" });
    return;
  }

  const cacheKey = `osint:shodan:ip:${ip}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    // Shodan InternetDB — free, no key required
    const r = await safeFetch(`https://internetdb.shodan.io/${ip}`, {
      headers: { "User-Agent": "mr7-osint/2.0" },
    });

    if (r.status === 404) {
      const data = { ip, ports: [], cves: [], tags: [], hostnames: [], vulns: [], source: "Shodan InternetDB", timestamp: new Date().toISOString() };
      res.json({ success: true, cached: false, data });
      return;
    }
    if (!r.ok) {
      res.status(r.status).json({ success: false, error: `Shodan returned HTTP ${r.status}` });
      return;
    }

    const raw = await r.json() as {
      ip?: string; ports?: number[]; cpes?: string[]; tags?: string[];
      hostnames?: string[]; vulns?: string[];
    };

    // Also try Shodan Search API if key is present
    let detailData: object | null = null;
    const shodanKey = process.env.SHODAN_API_KEY;
    if (shodanKey) {
      try {
        const detail = await safeFetch(`https://api.shodan.io/shodan/host/${ip}?key=${shodanKey}`);
        if (detail.ok) detailData = await detail.json() as object;
      } catch { /* skip */ }
    }

    const data = {
      ip: raw.ip ?? ip,
      ports:     raw.ports ?? [],
      cpes:      raw.cpes ?? [],
      tags:      raw.tags ?? [],
      hostnames: raw.hostnames ?? [],
      vulns:     raw.vulns ?? [],
      detail:    detailData,
      source:    "Shodan InternetDB" + (shodanKey ? " + Shodan API" : ""),
      timestamp: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 1800).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, ip }, "[osint/shodan] lookup failed");
    res.status(500).json({ success: false, error: "Shodan lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Certificate Transparency (crt.sh — free, no key)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/crtsh/:domain", async (req: Request<{ domain: string }>, res: Response): Promise<void> => {
  const { domain } = req.params;
  if (!isDomain(domain)) {
    res.status(400).json({ success: false, error: "Invalid domain" });
    return;
  }

  const cacheKey = `osint:crtsh:${domain}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    // Include wildcard subdomains via %25 prefix
    const r = await safeFetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json&deduplicate=Y`,
      { headers: { "User-Agent": "mr7-osint/2.0" } },
    );
    if (!r.ok) {
      res.status(r.status).json({ success: false, error: `crt.sh returned HTTP ${r.status}` });
      return;
    }

    const raw = await r.json() as Array<{
      id: number; issuer_ca_id?: number; issuer_name: string;
      name_value: string; not_before: string; not_after: string;
    }>;

    // Deduplicate by domain name
    const seen = new Set<string>();
    const certs = raw
      .filter(c => { const k = c.name_value; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 100)
      .map(c => ({
        id:      c.id,
        issuer:  c.issuer_name?.match(/O=([^,]+)/)?.[1] ?? c.issuer_name,
        domain:  c.name_value?.split("\n")[0] ?? "",
        allNames: c.name_value?.split("\n") ?? [],
        notBefore: c.not_before?.slice(0, 10),
        notAfter:  c.not_after?.slice(0, 10),
      }));

    // Extract unique subdomains
    const subdomains = [...new Set(
      certs.flatMap(c => c.allNames)
        .filter(n => n.endsWith(`.${domain}`) && !n.startsWith("*"))
    )].sort();

    const data = {
      domain, certCount: certs.length, subdomainCount: subdomains.length,
      certs: certs.slice(0, 50), subdomains: subdomains.slice(0, 200),
      source: "crt.sh", timestamp: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 3600).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, domain }, "[osint/crtsh] lookup failed");
    res.status(500).json({ success: false, error: "crt.sh lookup failed", message: String(err) });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 7. IP Geolocation + ASN (ipinfo.io free tier — 50K req/month, no key for basics)
// ────────────────────────────────────────────────────────────────────────────
router.get("/osint/ipinfo/:ip", async (req: Request<{ ip: string }>, res: Response): Promise<void> => {
  const { ip } = req.params;
  if (!isIP(ip)) {
    res.status(400).json({ success: false, error: "Invalid IPv4 address" });
    return;
  }

  const cacheKey = `osint:ipinfo:${ip}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) { res.setHeader("X-Cache", "HIT"); res.json({ success: true, cached: true, data: cached }); return; }

  try {
    const ipinfoKey = process.env.IPINFO_API_KEY ?? "";
    const url = ipinfoKey
      ? `https://ipinfo.io/${ip}?token=${ipinfoKey}`
      : `https://ipinfo.io/${ip}/json`;

    const r = await safeFetch(url, { headers: { "User-Agent": "mr7-osint/2.0", "Accept": "application/json" } });
    if (!r.ok) {
      res.status(r.status).json({ success: false, error: `ipinfo.io returned HTTP ${r.status}` });
      return;
    }

    const raw = await r.json() as {
      ip?: string; city?: string; region?: string; country?: string;
      loc?: string; org?: string; postal?: string; timezone?: string;
      hostname?: string; anycast?: boolean;
    };

    const [lat, lon] = (raw.loc ?? "").split(",").map(Number);
    const data = {
      ip: raw.ip ?? ip,
      city:     raw.city,
      region:   raw.region,
      country:  raw.country,
      lat:      isNaN(lat) ? null : lat,
      lon:      isNaN(lon) ? null : lon,
      org:      raw.org,
      asn:      raw.org?.split(" ")[0] ?? null,
      hostname: raw.hostname,
      timezone: raw.timezone,
      source:   "ipinfo.io",
      timestamp: new Date().toISOString(),
    };

    await cacheSet(cacheKey, data, 3600).catch(() => {});
    res.json({ success: true, cached: false, data });
  } catch (err) {
    logger.error({ err, ip }, "[osint/ipinfo] lookup failed");
    res.status(500).json({ success: false, error: "IP info lookup failed", message: String(err) });
  }
});

export default router;
