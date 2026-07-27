/**
 * POST /api/threat-intel/enrich  — Structured node enrichment
 * POST /api/threat-intel/analyze-chain — Full-chain AI analysis
 *
 * Uses real public/free APIs (ipapi.co, crt.sh, RDAP, GreyNoise community)
 * plus OpenAI structured outputs (response_format: json_object) so the
 * frontend receives machine-readable data — no fragile regex JSON extraction.
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { cacheGet, cacheSet } from "../lib/redis.js";

const router = Router();

// ── OpenAI client (lazy — only instantiated when a key is present) ───────────
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

// ── Input schemas ─────────────────────────────────────────────────────────────
const EnrichSchema = z.object({
  nodeType: z.enum(["ip", "domain", "person", "org", "malware", "vuln", "tool", "event"]),
  value:    z.string().min(1).max(500).trim(),
});

const AnalyzeChainSchema = z.object({
  nodes: z.array(z.object({
    id:    z.string(),
    type:  z.string(),
    label: z.string(),
    value: z.string().optional(),
    risk:  z.string().optional(),
    intel: z.record(z.unknown()).optional(),
  })).min(2).max(50),
  links: z.array(z.object({
    from:     z.string(),
    to:       z.string(),
    relation: z.string(),
    strength: z.string(),
  })).max(100),
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface EnrichResult {
  geoCountry:      string | null;
  geoCity:         string | null;
  isp:             string | null;
  asnumber:        string | null;
  reputationScore: number;
  openPorts:       string[];
  cves:            { id: string; cvss: number; desc: string }[];
  malwareFamily:   string | null;
  lastSeen:        string | null;
  indicators:      string[];
  summary:         string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIMEOUT = 6_000;

async function safeFetch(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { "User-Agent": "mr7-osint/3.0", ...(init?.headers ?? {}) },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// Real IP data from ipapi.co (free tier, no key)
async function fetchIPGeo(ip: string) {
  const d = await safeFetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
  if (!d || d.error) return null;
  return {
    country: d.country_name ?? null,
    city:    d.city ?? null,
    isp:     d.org ?? null,
    asn:     d.asn ?? null,
  };
}

// GreyNoise community API (free, no key, rate-limited)
async function fetchGreyNoise(ip: string) {
  const d = await safeFetch(`https://api.greynoise.io/v3/community/${encodeURIComponent(ip)}`, {
    headers: { "key": process.env.GREYNOISE_API_KEY ?? "" },
  });
  return d;
}

// crt.sh certificate transparency
async function fetchCertDomains(query: string): Promise<string[]> {
  const data = await safeFetch(
    `https://crt.sh/?q=${encodeURIComponent(query)}&output=json`
  );
  if (!Array.isArray(data)) return [];
  return [...new Set(
    data.slice(0, 10).map((c: any) => c.name_value?.split("\n")[0]).filter(Boolean)
  )];
}

// RDAP WHOIS for domains
async function fetchRDAP(domain: string) {
  return safeFetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
}

// NVD CVE API (free, no key)
async function fetchCVE(keyword: string): Promise<{ id: string; cvss: number; desc: string }[]> {
  const data = await safeFetch(
    `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=3`
  );
  if (!data?.vulnerabilities) return [];
  return data.vulnerabilities.slice(0, 3).map((v: any) => ({
    id:   v.cve?.id ?? "",
    cvss: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
          ?? v.cve?.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore
          ?? 0,
    desc: v.cve?.descriptions?.find((d: any) => d.lang === "en")?.value?.slice(0, 100) ?? "",
  }));
}

// Build a rich AI analysis using structured JSON output
async function aiEnrich(nodeType: string, value: string, realData: Record<string, any>): Promise<EnrichResult> {
  const systemPrompt = `You are a cyber-threat intelligence analyst.
Given real-world OSINT data about a ${nodeType}, produce a structured intelligence report.
Respond ONLY with valid JSON matching this exact schema:
{
  "geoCountry": string|null,
  "geoCity": string|null,
  "isp": string|null,
  "asnumber": string|null,
  "reputationScore": number (0-100, higher = more dangerous),
  "openPorts": string[],
  "cves": [{"id":string,"cvss":number,"desc":string}],
  "malwareFamily": string|null,
  "lastSeen": string|null,
  "indicators": string[],
  "summary": string (2 sentences max, professional tone)
}`;

  const userMsg = `Node type: ${nodeType}
Value: ${value}
Real OSINT collected: ${JSON.stringify(realData, null, 2)}

Produce the intelligence JSON now. Base score on actual data. If geo data is provided, use it exactly.`;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMsg },
    ],
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw) as EnrichResult; }
  catch { return {
    geoCountry: null, geoCity: null, isp: null, asnumber: null,
    reputationScore: 0, openPorts: [], cves: [], malwareFamily: null,
    lastSeen: null, indicators: [], summary: "Could not parse enrichment result.",
  }; }
}

// ── POST /threat-intel/enrich ─────────────────────────────────────────────────
router.post("/threat-intel/enrich", async (req: Request, res: Response): Promise<void> => {
  const parse = EnrichSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { nodeType, value } = parse.data;
  const cacheKey = `enrich:${nodeType}:${Buffer.from(value).toString("base64").slice(0, 24)}`;

  const cached = await cacheGet<EnrichResult>(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json({ success: true, data: cached, cached: true });
    return;
  }

  try {
    const realData: Record<string, any> = {};

    // ── Gather real data in parallel based on node type ──────────────────────
    if (nodeType === "ip") {
      const [geo, gnoise] = await Promise.allSettled([
        fetchIPGeo(value),
        fetchGreyNoise(value),
      ]);
      if (geo.status === "fulfilled" && geo.value) realData.geo = geo.value;
      if (gnoise.status === "fulfilled" && gnoise.value) realData.greynoise = gnoise.value;
    }

    if (nodeType === "domain") {
      const [certs, rdap] = await Promise.allSettled([
        fetchCertDomains(value),
        fetchRDAP(value),
      ]);
      if (certs.status === "fulfilled") realData.certificates = certs.value;
      if (rdap.status === "fulfilled" && rdap.value) realData.rdap = rdap.value;
    }

    if (nodeType === "vuln" || value.match(/^CVE-\d{4}-\d+$/i)) {
      const cves = await fetchCVE(value);
      if (cves.length > 0) realData.nvdCVEs = cves;
    }

    if (nodeType === "malware" || nodeType === "tool") {
      const cves = await fetchCVE(value);
      if (cves.length > 0) realData.relatedCVEs = cves;
    }

    // ── AI structured analysis ───────────────────────────────────────────────
    let result: EnrichResult;
    if (process.env.OPENAI_API_KEY) {
      result = await aiEnrich(nodeType, value, realData);
      // Merge real geo data into result if available
      if (realData.geo) {
        result.geoCountry = result.geoCountry ?? realData.geo.country;
        result.geoCity    = result.geoCity    ?? realData.geo.city;
        result.isp        = result.isp        ?? realData.geo.isp;
        result.asnumber   = result.asnumber   ?? realData.geo.asn;
      }
      if (realData.nvdCVEs?.length && result.cves.length === 0) {
        result.cves = realData.nvdCVEs;
      }
    } else {
      // No OpenAI key — return real data only with basic scoring
      const geo = realData.geo;
      result = {
        geoCountry:      geo?.country ?? null,
        geoCity:         geo?.city    ?? null,
        isp:             geo?.isp     ?? null,
        asnumber:        geo?.asn     ?? null,
        reputationScore: realData.greynoise?.classification === "malicious" ? 75 : 25,
        openPorts:       [],
        cves:            realData.nvdCVEs ?? [],
        malwareFamily:   null,
        lastSeen:        null,
        indicators:      realData.certificates ?? [],
        summary:         `${nodeType} node ${value}. OSINT data collected from public sources.`,
      };
    }

    await cacheSet(cacheKey, result, 300).catch(() => {});
    res.json({ success: true, data: result, cached: false });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: "Enrichment failed", message: msg });
  }
});

// ── POST /threat-intel/analyze-chain ─────────────────────────────────────────
router.post("/threat-intel/analyze-chain", async (req: Request, res: Response): Promise<void> => {
  const parse = AnalyzeChainSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { nodes, links } = parse.data;

  // Summarize nodes and links for the prompt
  const nodeLines = nodes.map(n =>
    `- [${n.type.toUpperCase()}] ${n.label}: ${n.value ?? "—"} | risk: ${n.risk ?? "low"}`
    + (n.intel ? ` | ${(n.intel as any).summary?.slice(0, 80) ?? ""}` : "")
  ).join("\n");

  const linkLines = links.length
    ? links.map(l => {
        const f = nodes.find(n => n.id === l.from);
        const t = nodes.find(n => n.id === l.to);
        return `- ${f?.label ?? l.from} --[${l.relation}]--> ${t?.label ?? l.to} (${l.strength})`;
      }).join("\n")
    : "No connections";

  const systemPrompt = `You are a strategic cyber-threat intelligence analyst.
Analyze the supplied threat-intelligence graph and return a structured JSON report.
Schema:
{
  "summary": "2-3 sentence network overview",
  "riskScore": number (0-100),
  "patterns": [{"title":string, "description":string, "severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}],
  "attackPath": string,
  "recommendations": [string],
  "ttps": [{"id":string,"name":string,"tactic":string}]
}
Respond ONLY with valid JSON.`;

  const userMsg = `Nodes:\n${nodeLines}\n\nConnections:\n${linkLines}`;

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json({ success: false, error: "OpenAI API key not configured" });
      return;
    }
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMsg },
      ],
      max_tokens: 1000,
    });

    const raw  = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);
    res.json({ success: true, data });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: "Chain analysis failed", message: msg });
  }
});

export default router;
