import { Router, type IRouter } from "express";
import { requirePersonalOpenAI, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";
import dns from "dns";

const router: IRouter = Router();

const FETCH_TIMEOUT = 8000;
const SHORT_TIMEOUT = 3000;

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
      max_tokens: 1500,
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

async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
router.post("/osint/email", async (req, res) => {
  try {
    const body = req.body as { email?: string; value?: string; language?: string };
    const email = (body.value ?? body.email ?? "").trim();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const failedSources: string[] = [];

    const domain = email.split("@")[1] ?? "";
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    // Source 1: Node DNS — SPF/DMARC from TXT records
    const [mxResult, txtResult] = await Promise.allSettled([
      resolver.resolveMx(domain).catch(() => [] as dns.MxRecord[]),
      resolver.resolveTxt(domain).catch(() => [] as string[][]),
    ]);

    const mxRecords = mxResult.status === "fulfilled" ? (mxResult.value as dns.MxRecord[]) : [];
    const txtRecords = txtResult.status === "fulfilled" ? (txtResult.value as string[][]) : [];
    const mxSecurity = extractMxSecurity(txtRecords);
    sources["DNS (MX/TXT)"] = { success: mxResult.status === "fulfilled" };

    // Source 2: Cloudflare DoH — _dmarc TXT record
    let cfDmarc: string | null = null;
    try {
      const cfResp = await safeFetch(
        `https://cloudflare-dns.com/dns-query?name=_dmarc.${encodeURIComponent(domain)}&type=TXT`,
        { headers: { Accept: "application/dns-json" } },
        FETCH_TIMEOUT
      );
      if (cfResp.ok) {
        const cfJson = await cfResp.json() as { Answer?: { data?: string }[] };
        cfDmarc = cfJson.Answer?.find(a => a.data?.includes("v=DMARC1"))?.data ?? null;
        sources["Cloudflare DoH"] = { success: true };
      } else {
        sources["Cloudflare DoH"] = { success: false, error: `HTTP ${cfResp.status}` };
        failedSources.push("Cloudflare DoH");
      }
    } catch (e) {
      sources["Cloudflare DoH"] = { success: false, error: (e as Error).message };
      failedSources.push("Cloudflare DoH");
    }

    // Source 3: LeakCheck free API (no key)
    type LeakData = { success?: boolean; found?: number; fields?: string[] };
    let leakData: LeakData | null = null;
    try {
      const lcResp = await safeFetch(
        `https://leakcheck.io/api/free?check=${encodeURIComponent(email)}`,
        { headers: { "User-Agent": "mr7-osint/1.0" } },
        FETCH_TIMEOUT
      );
      if (lcResp.ok) {
        leakData = await lcResp.json() as LeakData;
        sources["LeakCheck.io (free)"] = { success: true };
      } else {
        sources["LeakCheck.io (free)"] = { success: false, error: `HTTP ${lcResp.status}` };
        failedSources.push("LeakCheck.io");
      }
    } catch (e) {
      sources["LeakCheck.io (free)"] = { success: false, error: (e as Error).message };
      failedSources.push("LeakCheck.io");
    }

    const disposableDomains = ["guerrillamail", "mailinator", "tempmail", "throwam", "yopmail", "sharklasers", "grr.la", "spam4.me", "trashmail", "maildrop"];
    const isDisposable = disposableDomains.some(d => domain.toLowerCase().includes(d));
    const effectiveDmarc = mxSecurity.dmarc ?? cfDmarc;
    const leakFound = leakData?.found ?? 0;

    const riskScore = leakFound > 0 ? 70 : isDisposable ? 35 : !mxSecurity.spf && !effectiveDmarc ? 20 : 5;
    const riskLevel = riskFromScore(riskScore);

    const analysisText = await aiAnalyze(
      `أنت محلل OSINT أمني متخصص. حلّل بيانات استخبارات البريد الإلكتروني هذه وقدّم:
1. ملخص تنفيذي
2. تحليل حماية البريد (SPF/DMARC/DKIM)
3. تقييم التسريبات (إن وُجدت)
4. تقييم المخاطر
5. توصيات محددة (نقاط)
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `البريد: ${email}
الدومين: ${domain}
دومين مؤقت: ${isDisposable}
سجلات MX: ${JSON.stringify(mxRecords).slice(0, 300)}
SPF: ${mxSecurity.spf ?? "غير موجود"}
DMARC (DNS): ${mxSecurity.dmarc ?? "غير موجود"}
DMARC (Cloudflare DoH): ${cfDmarc ?? "غير موجود"}
DKIM مكتشف: ${mxSecurity.dkim.length} مفتاح
LeakCheck نتيجة: ${JSON.stringify(leakData)}
مصادر فاشلة: ${failedSources.join(", ") || "لا شيء"}`
    );

    return res.json({
      sources,
      results: {
        email,
        domain,
        isDisposable,
        mxRecords,
        mxSecurity: { ...mxSecurity, dmarc: mxSecurity.dmarc ?? cfDmarc },
        leakData,
        leakFound,
      },
      analysis: analysisText,
      riskLevel,
      recommendations: leakFound > 0
        ? ["غيّر كلمات المرور فوراً للخدمات المتأثرة", "فعّل المصادقة الثنائية (2FA)", "راقب نشاط حساباتك", "استخدم كلمة مرور فريدة لكل خدمة"]
        : ["كلمة المرور تبدو آمنة — حافظ على عادات أمنية جيدة", "فعّل 2FA كإجراء وقائي", "اضبط تنبيهات مراقبة التسريبات",
           ...(mxSecurity.spf ? [] : ["أضف سجل SPF لمنع انتحال هوية البريد"]),
           ...(effectiveDmarc ? [] : ["أضف سياسة DMARC لتعزيز المصادقة"])],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Email OSINT failed" });
  }
});

// ── IP ────────────────────────────────────────────────────────────────────────
router.post("/osint/ip", async (req, res) => {
  try {
    const body = req.body as { ip?: string; value?: string; language?: string };
    const ip = (body.value ?? body.ip ?? "").trim();
    if (!ip || !/^[\d.:a-fA-F]+$/.test(ip)) {
      return res.status(400).json({ error: "Valid IP address required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const failedSources: string[] = [];

    // Reverse DNS via Google
    const reverseName = ip.split(".").reverse().join(".") + ".in-addr.arpa";
    let reverseDns: string[] = [];
    try {
      const rdResp = await safeFetch(
        `https://dns.google/resolve?name=${encodeURIComponent(reverseName)}&type=PTR`,
        {},
        SHORT_TIMEOUT
      );
      if (rdResp.ok) {
        const rdJson = await rdResp.json() as { Answer?: { data?: string }[] };
        reverseDns = (rdJson.Answer ?? []).map(a => a.data ?? "").filter(Boolean);
        sources["Google DNS (rDNS)"] = { success: true };
      } else {
        sources["Google DNS (rDNS)"] = { success: false };
        failedSources.push("Google DNS");
      }
    } catch (e) {
      sources["Google DNS (rDNS)"] = { success: false, error: (e as Error).message };
      failedSources.push("Google DNS");
    }

    const [ipApiResult, ipwhoResult, ipapiResult] = await Promise.allSettled([
      // Source 1: ip-api.com — country, city, ISP, ASN
      safeFetch(`http://ip-api.com/json/${ip}?fields=66846719`, {}, FETCH_TIMEOUT),
      // Source 2: ipwho.is — free, no key
      safeFetch(`https://ipwho.is/${ip}`, { headers: { "User-Agent": "mr7-osint/1.0" } }, FETCH_TIMEOUT),
      // Source 3: ipapi.co — fallback geo
      safeFetch(`https://ipapi.co/${ip}/json/`, { headers: { "User-Agent": "mr7-osint/1.0" } }, FETCH_TIMEOUT),
    ]);

    let ipApiData: unknown = null;
    let ipwhoData: unknown = null;
    let ipapiData: unknown = null;

    if (ipApiResult.status === "fulfilled" && ipApiResult.value.ok) {
      ipApiData = await ipApiResult.value.json();
      sources["ip-api.com"] = { success: true };
    } else {
      sources["ip-api.com"] = { success: false };
      failedSources.push("ip-api.com");
    }

    if (ipwhoResult.status === "fulfilled" && ipwhoResult.value.ok) {
      ipwhoData = await ipwhoResult.value.json();
      sources["ipwho.is"] = { success: true };
    } else {
      sources["ipwho.is"] = { success: false };
      failedSources.push("ipwho.is");
    }

    if (ipapiResult.status === "fulfilled" && ipapiResult.value.ok) {
      ipapiData = await ipapiResult.value.json();
      sources["ipapi.co"] = { success: true };
    } else {
      sources["ipapi.co"] = { success: false };
      failedSources.push("ipapi.co");
    }

    const geo1 = ipApiData as { city?: string; country?: string; countryCode?: string; regionName?: string; isp?: string; org?: string; as?: string; lat?: number; lon?: number; mobile?: boolean; proxy?: boolean; hosting?: boolean; timezone?: string } | null;
    const geo2 = ipwhoData as { city?: string; country?: string; country_code?: string; region?: string; connection?: { isp?: string; org?: string; asn?: number } } | null;

    const isProxy = geo1?.proxy ?? false;
    const isHosting = geo1?.hosting ?? false;
    const isMobile = geo1?.mobile ?? false;

    const riskScore = isProxy || isHosting ? 40 : isMobile ? 15 : 5;
    const riskLevel = riskFromScore(riskScore);

    const analysisText = await aiAnalyze(
      `أنت محلل OSINT أمني متخصص في استخبارات IP. حلّل بيانات IP هذه وقدّم:
1. ملخص تنفيذي
2. تحليل الموقع الجغرافي والبنية التحتية
3. تقييم التهديد (Proxy/Hosting/Mobile/VPN)
4. تصنيف (سكني/مركز بيانات/VPN/TOR/Proxy)
5. الإجراءات الموصى بها
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `IP: ${ip}
Reverse DNS: ${reverseDns.join(", ") || "لا يوجد"}
ip-api.com: ${JSON.stringify(ipApiData).slice(0, 800)}
ipwho.is: ${JSON.stringify(ipwhoData).slice(0, 800)}
ipapi.co: ${JSON.stringify(ipapiData).slice(0, 500)}
مصادر فاشلة: ${failedSources.join(", ") || "لا شيء"}`
    );

    return res.json({
      sources,
      results: { ip, ipApiData, ipwhoData, ipapiData, reverseDns, isProxy, isHosting, isMobile, abuseScore: 0 },
      analysis: analysisText,
      riskLevel,
      recommendations: isProxy || isHosting
        ? ["راجع سجلات الاتصال من هذا IP", "طبّق تقييد معدل الطلبات (rate limiting)", "أضف للقائمة السوداء إذا كان مشبوهاً", "تحقق من حركة مرور غير عادية"]
        : ["IP يبدو نظيفاً — استمر في المراقبة الاعتيادية", "احتفظ بسجلات الوصول", "راجعه دورياً"],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "IP OSINT failed" });
  }
});

// ── DOMAIN ────────────────────────────────────────────────────────────────────
router.post("/osint/domain", async (req, res) => {
  try {
    const body = req.body as { domain?: string; value?: string; language?: string };
    const domain = (body.value ?? body.domain ?? "").trim();
    if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: "Valid domain required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const failedSources: string[] = [];
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const [dnsResults, crtResult, rdapResult, cfResult] = await Promise.allSettled([
      // Source 1: Node.js DNS — A, AAAA, MX, TXT, NS
      Promise.allSettled([
        resolver.resolve4(domain).catch(() => [] as string[]),
        resolver.resolve6(domain).catch(() => [] as string[]),
        resolver.resolveMx(domain).catch(() => [] as dns.MxRecord[]),
        resolver.resolveTxt(domain).catch(() => [] as string[][]),
        resolver.resolveNs(domain).catch(() => [] as string[]),
        resolver.resolveSoa(domain).catch(() => null as dns.SoaRecord | null),
        resolver.resolveCaa(domain).catch(() => [] as dns.CaaRecord[]),
      ]),
      // Source 2: crt.sh — subdomains from SSL transparency
      safeFetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {}, FETCH_TIMEOUT),
      // Source 3: rdap.org — registration data
      safeFetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { headers: { Accept: "application/rdap+json" } }, FETCH_TIMEOUT),
      // Source 4: Cloudflare DoH — additional records
      safeFetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, { headers: { Accept: "application/dns-json" } }, FETCH_TIMEOUT),
    ]);

    let dnsRecords: { a: string[]; aaaa: string[]; mx: dns.MxRecord[]; txt: string[][]; ns: string[]; soa: dns.SoaRecord | null; caa: dns.CaaRecord[] } = { a: [], aaaa: [], mx: [], txt: [], ns: [], soa: null, caa: [] };
    let crtData: unknown[] = [];
    let rdapData: unknown = null;
    let subdomains: string[] = [];
    let cfData: unknown = null;

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
      sources["DNS (A/AAAA/MX/TXT/NS)"] = { success: true };
    } else {
      sources["DNS"] = { success: false };
      failedSources.push("DNS");
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
      sources["crt.sh"] = { success: false };
      failedSources.push("crt.sh");
    }

    if (rdapResult.status === "fulfilled" && rdapResult.value.ok) {
      rdapData = await rdapResult.value.json();
      sources["RDAP/WHOIS"] = { success: true };
    } else {
      sources["RDAP/WHOIS"] = { success: false };
      failedSources.push("RDAP");
    }

    if (cfResult.status === "fulfilled" && cfResult.value.ok) {
      cfData = await cfResult.value.json();
      sources["Cloudflare DoH"] = { success: true };
    } else {
      sources["Cloudflare DoH"] = { success: false };
      failedSources.push("Cloudflare DoH");
    }

    const mxSecurity = extractMxSecurity(dnsRecords.txt);

    const analysisText = await aiAnalyze(
      `أنت محلل OSINT أمني. ابنِ خريطة سطح هجوم شاملة لهذا الدومين وقدّم:
1. نظرة عامة على البنية التحتية
2. تحليل أمان DNS (SPF/DKIM/DMARC)
3. تقييم النطاقات الفرعية المكشوفة
4. استخبارات WHOIS/التسجيل
5. ملخص سطح الهجوم
6. خطوات التصلب الموصى بها
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `الدومين: ${domain}
سجلات DNS: ${JSON.stringify(dnsRecords).slice(0, 1500)}
SPF: ${mxSecurity.spf ?? "غير موجود"}
DMARC: ${mxSecurity.dmarc ?? "غير موجود"}
DKIM: ${mxSecurity.dkim.length} مفتاح
سجلات CAA: ${JSON.stringify(dnsRecords.caa).slice(0, 200)}
النطاقات الفرعية (${subdomains.length}): ${subdomains.slice(0, 30).join(", ")}
RDAP/WHOIS: ${JSON.stringify(rdapData).slice(0, 1000)}
عدد شهادات SSL: ${crtData.length}
Cloudflare DoH: ${JSON.stringify(cfData).slice(0, 300)}
مصادر فاشلة: ${failedSources.join(", ") || "لا شيء"}`
    );

    const riskScore = subdomains.length > 50 ? 55 : subdomains.length > 20 ? 35 : 15;

    return res.json({
      sources,
      results: { domain, dnsRecords, subdomains, rdapData, sslCount: crtData.length, mxSecurity, cfData },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        "راجع جميع النطاقات الفرعية المكشوفة بحثاً عن خدمات غير مقصودة",
        mxSecurity.spf ? "سجل SPF مكتشف — تحقق من أنه مقيّد (-all)" : "أضف سجل SPF لمنع انتحال هوية البريد",
        mxSecurity.dmarc ? "DMARC مكتشف — تأكد من أن السياسة p=reject" : "أضف سياسة DMARC لتعزيز مصادقة البريد",
        "فعّل DNSSEC إذا لم يكن مفعّلاً",
        "راقب crt.sh لاكتشاف شهادات غير مصرح بها",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Domain OSINT failed" });
  }
});

// ── USERNAME ──────────────────────────────────────────────────────────────────
router.post("/osint/username", async (req, res) => {
  try {
    const body = req.body as { username?: string; value?: string; language?: string };
    const username = (body.value ?? body.username ?? "").trim();
    if (!username || username.length < 2) {
      return res.status(400).json({ error: "Valid username required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};

    const PLATFORMS = [
      { name: "GitHub", url: `https://github.com/${username}`, category: "dev" },
      { name: "GitLab", url: `https://gitlab.com/${username}`, category: "dev" },
      { name: "Reddit", url: `https://www.reddit.com/user/${username}`, category: "social" },
      { name: "Telegram", url: `https://t.me/${username}`, category: "social" },
      { name: "HackerOne", url: `https://hackerone.com/${username}`, category: "security" },
      { name: "Bugcrowd", url: `https://bugcrowd.com/${username}`, category: "security" },
      { name: "Dev.to", url: `https://dev.to/${username}`, category: "blog" },
      { name: "Keybase", url: `https://keybase.io/${username}`, category: "social" },
      { name: "ProductHunt", url: `https://www.producthunt.com/@${username}`, category: "social" },
      { name: "Replit", url: `https://replit.com/@${username}`, category: "dev" },
      { name: "Codepen", url: `https://codepen.io/${username}`, category: "dev" },
      { name: "Speakerdeck", url: `https://speakerdeck.com/${username}`, category: "blog" },
      { name: "npm", url: `https://www.npmjs.com/~${username}`, category: "dev" },
      { name: "Docker Hub", url: `https://hub.docker.com/u/${username}`, category: "dev" },
      { name: "Medium", url: `https://medium.com/@${username}`, category: "blog" },
      { name: "Pastebin", url: `https://pastebin.com/u/${username}`, category: "paste" },
      { name: "Intigriti", url: `https://app.intigriti.com/researcher/${username}`, category: "security" },
      { name: "Fiverr", url: `https://www.fiverr.com/${username}`, category: "work" },
      { name: "Mastodon", url: `https://mastodon.social/@${username}`, category: "social" },
      { name: "Twitch", url: `https://www.twitch.tv/${username}`, category: "social" },
    ];

    const checkResults = await Promise.allSettled(
      PLATFORMS.map(async (p) => {
        try {
          const r = await safeFetch(p.url, {
            method: "HEAD",
            headers: { "User-Agent": "Mozilla/5.0 (compatible; mr7-osint/1.0)" },
            redirect: "follow",
          } as RequestInit, SHORT_TIMEOUT);
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
      `أنت محلل OSINT أمني. حلّل استخبارات اسم المستخدم هذا وقدّم:
1. تحليل نمط الهوية
2. تقييم التواجد على المنصات (dev/social/security/blog)
3. الأنماط السلوكية المستنتجة
4. التواجد في مجتمع الأمن (HackerOne/Bugcrowd/Intigriti)
5. مستوى الكشف عن الخصوصية
6. التوصيات
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `اسم المستخدم: ${username}
وُجد على المنصات (${foundPlatforms.length}/${PLATFORMS.length}): ${foundPlatforms.map((p) => `${p.platform} (${p.category})`).join(", ")}
نتائج فحص كل المنصات: ${JSON.stringify(platformResults)}`
    );

    const riskScore = foundPlatforms.length > 8 ? 65 : foundPlatforms.length > 4 ? 40 : 20;

    return res.json({
      sources,
      results: { username, platformResults, foundCount: foundPlatforms.length, totalChecked: PLATFORMS.length },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        "راجع إعدادات الخصوصية على جميع الحسابات المكتشفة",
        "استخدم أسماء مستخدم مختلفة عبر المنصات لمنع الربط",
        "أزل المعلومات الشخصية من الملفات الشخصية العامة",
        "فعّل 2FA على جميع الحسابات المكتشفة",
        "فكّر في تدوير أسماء المستخدم للأنشطة الحساسة",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Username OSINT failed" });
  }
});

// ── PHONE ─────────────────────────────────────────────────────────────────────
router.post("/osint/phone", async (req, res) => {
  try {
    const body = req.body as { phone?: string; value?: string; language?: string };
    const phone = (body.value ?? body.phone ?? "").trim();
    if (!phone || phone.length < 7) {
      return res.status(400).json({ error: "Valid phone number required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};

    const cleaned = phone.replace(/[\s\-()]/g, "");

    // Comprehensive country code map — sorted longest prefix first for accurate matching
    const COUNTRY_CODES: [string, { name: string; region: string }][] = [
      // 3-digit codes first (must match before shorter prefixes)
      ["+212", { name: "المغرب", region: "شمال أفريقيا" }],
      ["+213", { name: "الجزائر", region: "شمال أفريقيا" }],
      ["+216", { name: "تونس", region: "شمال أفريقيا" }],
      ["+218", { name: "ليبيا", region: "شمال أفريقيا" }],
      ["+249", { name: "السودان", region: "أفريقيا" }],
      ["+966", { name: "السعودية", region: "الشرق الأوسط" }],
      ["+971", { name: "الإمارات", region: "الشرق الأوسط" }],
      ["+965", { name: "الكويت", region: "الشرق الأوسط" }],
      ["+974", { name: "قطر", region: "الشرق الأوسط" }],
      ["+973", { name: "البحرين", region: "الشرق الأوسط" }],
      ["+968", { name: "عُمان", region: "الشرق الأوسط" }],
      ["+967", { name: "اليمن", region: "الشرق الأوسط" }],
      ["+962", { name: "الأردن", region: "الشرق الأوسط" }],
      ["+961", { name: "لبنان", region: "الشرق الأوسط" }],
      ["+970", { name: "فلسطين", region: "الشرق الأوسط" }],
      ["+963", { name: "سوريا", region: "الشرق الأوسط" }],
      ["+964", { name: "العراق", region: "الشرق الأوسط" }],
      ["+234", { name: "نيجيريا", region: "أفريقيا" }],
      ["+254", { name: "كينيا", region: "أفريقيا" }],
      ["+256", { name: "أوغندا", region: "أفريقيا" }],
      ["+255", { name: "تنزانيا", region: "أفريقيا" }],
      ["+251", { name: "إثيوبيا", region: "أفريقيا" }],
      ["+353", { name: "أيرلندا", region: "أوروبا" }],
      ["+358", { name: "فنلندا", region: "أوروبا" }],
      ["+351", { name: "البرتغال", region: "أوروبا" }],
      ["+380", { name: "أوكرانيا", region: "أوروبا" }],
      ["+371", { name: "لاتفيا", region: "أوروبا" }],
      ["+372", { name: "إستونيا", region: "أوروبا" }],
      ["+370", { name: "ليتوانيا", region: "أوروبا" }],
      ["+386", { name: "سلوفينيا", region: "أوروبا" }],
      ["+420", { name: "التشيك", region: "أوروبا" }],
      ["+421", { name: "سلوفاكيا", region: "أوروبا" }],
      ["+852", { name: "هونج كونج", region: "آسيا" }],
      ["+853", { name: "ماكاو", region: "آسيا" }],
      ["+855", { name: "كمبوديا", region: "آسيا" }],
      ["+856", { name: "لاوس", region: "آسيا" }],
      ["+880", { name: "بنغلاديش", region: "آسيا" }],
      ["+886", { name: "تايوان", region: "آسيا" }],
      ["+961", { name: "لبنان", region: "الشرق الأوسط" }],
      // 2-digit codes
      ["+20", { name: "مصر", region: "أفريقيا" }],
      ["+27", { name: "جنوب أفريقيا", region: "أفريقيا" }],
      ["+33", { name: "فرنسا", region: "أوروبا" }],
      ["+34", { name: "إسبانيا", region: "أوروبا" }],
      ["+36", { name: "هنغاريا", region: "أوروبا" }],
      ["+39", { name: "إيطاليا", region: "أوروبا" }],
      ["+40", { name: "رومانيا", region: "أوروبا" }],
      ["+41", { name: "سويسرا", region: "أوروبا" }],
      ["+43", { name: "النمسا", region: "أوروبا" }],
      ["+44", { name: "بريطانيا", region: "أوروبا" }],
      ["+45", { name: "الدنمارك", region: "أوروبا" }],
      ["+46", { name: "السويد", region: "أوروبا" }],
      ["+47", { name: "النرويج", region: "أوروبا" }],
      ["+48", { name: "بولندا", region: "أوروبا" }],
      ["+49", { name: "ألمانيا", region: "أوروبا" }],
      ["+52", { name: "المكسيك", region: "أمريكا اللاتينية" }],
      ["+54", { name: "الأرجنتين", region: "أمريكا اللاتينية" }],
      ["+55", { name: "البرازيل", region: "أمريكا اللاتينية" }],
      ["+56", { name: "تشيلي", region: "أمريكا اللاتينية" }],
      ["+57", { name: "كولومبيا", region: "أمريكا اللاتينية" }],
      ["+58", { name: "فنزويلا", region: "أمريكا اللاتينية" }],
      ["+60", { name: "ماليزيا", region: "آسيا" }],
      ["+61", { name: "أستراليا", region: "أوقيانوسيا" }],
      ["+62", { name: "إندونيسيا", region: "آسيا" }],
      ["+63", { name: "الفلبين", region: "آسيا" }],
      ["+64", { name: "نيوزيلندا", region: "أوقيانوسيا" }],
      ["+65", { name: "سنغافورة", region: "آسيا" }],
      ["+66", { name: "تايلاند", region: "آسيا" }],
      ["+81", { name: "اليابان", region: "آسيا" }],
      ["+82", { name: "كوريا الجنوبية", region: "آسيا" }],
      ["+84", { name: "فيتنام", region: "آسيا" }],
      ["+86", { name: "الصين", region: "آسيا" }],
      ["+90", { name: "تركيا", region: "أوروبا/آسيا" }],
      ["+91", { name: "الهند", region: "آسيا" }],
      ["+92", { name: "باكستان", region: "آسيا" }],
      ["+93", { name: "أفغانستان", region: "آسيا" }],
      ["+98", { name: "إيران", region: "الشرق الأوسط" }],
      // 1-digit codes (must match last)
      ["+1", { name: "الولايات المتحدة / كندا", region: "أمريكا الشمالية" }],
      ["+7", { name: "روسيا / كازاخستان", region: "أوروبا/آسيا" }],
    ];

    let detectedCountry: { name: string; region: string } | null = null;
    let matchedCode = "";

    // Try to match — try with + prefix first, then without
    const withPlus = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
    for (const [code, info] of COUNTRY_CODES) {
      if (withPlus.startsWith(code)) {
        detectedCountry = info;
        matchedCode = code;
        break;
      }
    }

    sources["Country Code Parser"] = { success: true };

    const localNumber = withPlus.slice(matchedCode.length);
    const areaCode = localNumber.slice(0, 3);

    const analysisText = await aiAnalyze(
      `أنت محلل OSINT أمني. حلّل رقم الهاتف هذا وقدّم:
1. تحليل نوع الرقم (جوال/أرضي/VoIP/مجاني)
2. المعلومات الجغرافية والمشغّل المحتمل
3. التحقق من التنسيق
4. تقييم المخاطر (احتمال الاحتيال/السبام بناءً على الدولة والنوع)
5. خطوات التحقيق الموصى بها
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `الرقم المُنظَّف: ${cleaned}
الرقم مع البادئة: ${withPlus}
رمز الدولة المكتشف: ${matchedCode || "غير معروف"}
معلومات الدولة: ${detectedCountry ? JSON.stringify(detectedCountry) : "غير معروفة"}
الرقم المحلي: ${localNumber}
رمز المنطقة المحتمل: ${areaCode}`
    );

    return res.json({
      sources,
      results: {
        phone: cleaned,
        phoneWithPlus: withPlus,
        detectedCountry,
        countryCode: matchedCode,
        localNumber,
      },
      analysis: analysisText,
      riskLevel: "medium" as const,
      recommendations: [
        "تحقق من الملكية قبل اتخاذ أي إجراء",
        "قارن مع قواعد بيانات السبام (TrueCaller, 800notes)",
        "أبلّغ شركة الاتصالات في حالة الاحتيال المشتبه به",
        "استخدم خدمات البحث العكسي للتحقق الإضافي",
        "تحقق مما إذا كان الرقم VoIP — شائع في مكالمات الاحتيال",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Phone OSINT failed" });
  }
});

// ── HASH ──────────────────────────────────────────────────────────────────────
router.post("/osint/hash", async (req, res) => {
  try {
    const body = req.body as { hash?: string; value?: string; language?: string };
    const hash = (body.value ?? body.hash ?? "").trim();
    if (!hash || !/^[0-9a-fA-F]{32,64}$/.test(hash)) {
      return res.status(400).json({ error: "Valid MD5/SHA1/SHA256 hash required" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const failedSources: string[] = [];

    let mbData: unknown = null;
    let bazaarData: unknown = null;

    // Source 1: MalwareBazaar (mb-api.abuse.ch) — no key needed
    try {
      const mbResp = await safeFetch(
        `https://mb-api.abuse.ch/api/v1/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `query=get_info&hash=${encodeURIComponent(hash)}`,
        },
        FETCH_TIMEOUT
      );
      if (mbResp.ok) {
        const mbJson = await mbResp.json() as { query_status?: string; data?: unknown[] };
        if (mbJson.query_status === "ok" && Array.isArray(mbJson.data) && mbJson.data.length > 0) {
          mbData = mbJson.data[0];
        }
        sources["MalwareBazaar"] = { success: true };
      } else {
        sources["MalwareBazaar"] = { success: false, error: `HTTP ${mbResp.status}` };
        failedSources.push("MalwareBazaar");
      }
    } catch (e) {
      sources["MalwareBazaar"] = { success: false, error: (e as Error).message };
      failedSources.push("MalwareBazaar");
    }

    // Source 2: bazaar.abuse.ch (alternate endpoint) — no key needed
    try {
      const bzResp = await safeFetch(
        `https://bazaar.abuse.ch/api/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `query=get_info&hash_value=${encodeURIComponent(hash)}`,
        },
        FETCH_TIMEOUT
      );
      if (bzResp.ok) {
        bazaarData = await bzResp.json();
        sources["Bazaar (abuse.ch)"] = { success: true };
      } else {
        sources["Bazaar (abuse.ch)"] = { success: false };
        failedSources.push("Bazaar");
      }
    } catch (e) {
      sources["Bazaar (abuse.ch)"] = { success: false, error: (e as Error).message };
      failedSources.push("Bazaar");
    }

    const mbAttrs = mbData as { file_type?: string; file_name?: string; file_size?: number; first_seen?: string; signature?: string; tags?: string[]; delivery_method?: string } | null;
    const hashType = hash.length === 32 ? "MD5" : hash.length === 40 ? "SHA1" : "SHA256";
    const isMalicious = mbData !== null;

    const analysisText = await aiAnalyze(
      `أنت محلل برمجيات خبيثة. حلّل بيانات Hash هذه وقدّم:
1. تصنيف البرمجيات الخبيثة (إن اكتُشفت)
2. عائلة البرمجية الخبيثة المحتملة والتوقيع
3. سياق التهديد من MalwareBazaar
4. تقنيات MITRE ATT&CK (إن كانت قابلة للتحديد)
5. تقييم خطورة التهديد
6. إجراءات الاستجابة الموصى بها
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `Hash: ${hash}
نوع Hash: ${hashType}
MalwareBazaar: ${JSON.stringify(mbData).slice(0, 1500)}
Bazaar: ${JSON.stringify(bazaarData).slice(0, 500)}
مصادر فاشلة: ${failedSources.join(", ") || "لا شيء"}`
    );

    const riskScore = isMalicious ? 85 : 5;

    return res.json({
      sources,
      results: {
        hash,
        hashType,
        mbData,
        bazaarData,
        isMalicious,
        fileInfo: mbAttrs ? {
          name: mbAttrs.file_name ?? null,
          type: mbAttrs.file_type ?? null,
          size: mbAttrs.file_size ?? null,
          firstSeen: mbAttrs.first_seen ?? null,
          signature: mbAttrs.signature ?? null,
          tags: mbAttrs.tags ?? [],
          deliveryMethod: mbAttrs.delivery_method ?? null,
        } : null,
      },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: isMalicious
        ? ["عزل الملف أو احذفه فوراً", "افحص جميع الأنظمة بحثاً عن ملفات مشابهة", "حدّد ناقل الإصابة", "اجمع الأدلة الجنائية واحفظها", "أخطر فريق الاستجابة للحوادث"]
        : ["لم يُعثر على Hash — قد يكون الملف نظيفاً أو غير موثق", "تحقق من سلامة Hash", "استمر في المراقبة", "أرسل العينة للتحليل الديناميكي إذا بدا سلوكها مشبوهاً"],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Hash OSINT failed" });
  }
});

// ── URL ───────────────────────────────────────────────────────────────────────
router.post("/osint/url", async (req, res) => {
  try {
    const body = req.body as { url?: string; value?: string; language?: string };
    const url = (body.value ?? body.url ?? "").trim();
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Valid URL required" });
    }
    if (isPrivateUrl(url)) {
      return res.status(403).json({ error: "Private/internal URLs are not allowed" });
    }

    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";
    const sources: Record<string, { success: boolean; error?: string }> = {};
    const failedSources: string[] = [];

    let pageContent = "";
    let pageTitle = url;
    let pageStatus = 0;
    let pageHeaders: Record<string, string> = {};
    let urlscanData: unknown = null;
    const extractedLinks: string[] = [];

    // Source 1: HTTP fetch — page content, title, links, headers
    try {
      const fetchResp = await safeFetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      }, FETCH_TIMEOUT);

      pageStatus = fetchResp.status;
      fetchResp.headers.forEach((v, k) => { pageHeaders[k] = v; });

      const html = await fetchResp.text();

      // Extract links
      const linkMatches = html.match(/href=["']([^"']+)["']/gi) ?? [];
      for (const m of linkMatches.slice(0, 50)) {
        const href = m.replace(/href=["']/i, "").replace(/["']$/, "");
        if (href.startsWith("http")) extractedLinks.push(href);
      }

      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : url;

      sources["HTTP Fetch"] = { success: fetchResp.ok };
    } catch (e) {
      sources["HTTP Fetch"] = { success: false, error: (e as Error).message };
      failedSources.push("HTTP Fetch");
    }

    // Source 2: URLScan.io — free, no key needed for search
    try {
      const usResp = await safeFetch(
        `https://urlscan.io/api/v1/search/?q=page.url:"${encodeURIComponent(url)}"&size=1`,
        { headers: { "User-Agent": "mr7-osint/1.0" } },
        FETCH_TIMEOUT
      );
      if (usResp.ok) {
        const usJson = await usResp.json() as { results?: unknown[] };
        urlscanData = usJson.results?.[0] ?? null;
        sources["URLScan.io"] = { success: true };
      } else {
        sources["URLScan.io"] = { success: false };
        failedSources.push("URLScan.io");
      }
    } catch (e) {
      sources["URLScan.io"] = { success: false, error: (e as Error).message };
      failedSources.push("URLScan.io");
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
      `أنت محلل OSINT أمني. حلّل استخبارات URL هذه وقدّم:
1. ملخص تنفيذي
2. بصمة التقنيات المستخدمة
3. تقييم رؤوس الأمان (Security Headers)
4. تحليل IOCs (IPs/domains/emails في الصفحة)
5. تحليل الروابط المكتشفة
6. تقييم التهديد (خبيث/مشبوه/نظيف)
7. الخطوات التالية الموصى بها
اكتب بتنسيق Markdown منظم. ${langNote}`,
      `URL: ${url}
العنوان: ${pageTitle}
حالة HTTP: ${pageStatus}
رؤوس الأمان الناقصة: ${missingSecHeaders.join(", ") || "لا شيء"}
رؤوس HTTP: ${JSON.stringify(pageHeaders).slice(0, 400)}
IOCs مكتشفة: ${JSON.stringify(iocs).slice(0, 800)}
روابط خارجية: ${extractedLinks.slice(0, 10).join(", ")}
معاينة المحتوى: ${pageContent.slice(0, 1200)}
URLScan.io: ${JSON.stringify(urlscanData).slice(0, 400)}
مصادر فاشلة: ${failedSources.join(", ") || "لا شيء"}`
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
        extractedLinks: extractedLinks.slice(0, 20),
        securityHeaders,
        missingSecHeaders,
        urlscanData,
        contentLength: pageContent.length,
        serverHeader: pageHeaders["server"] ?? null,
        poweredBy: pageHeaders["x-powered-by"] ?? null,
      },
      analysis: analysisText,
      riskLevel: riskFromScore(riskScore),
      recommendations: [
        ...missingSecHeaders.map(h => `أضف رأس الأمان الناقص: ${h}`),
        hasIocs ? "تحقق من IOCs المكتشفة في محتوى الصفحة" : "لم تُكتشف IOCs في الصفحة",
        "أرسل URL إلى URLScan.io لتحليل متصفح كامل",
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "OSINT URL analysis failed" });
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
    const langNote = body.language === "ar" ? "أجب باللغة العربية." : "Respond in English.";

    if (!content) return res.status(400).json({ error: "content required" });

    let analysisMessages: { role: "system" | "user"; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[] = [];

    if (type === "image" && content.startsWith("data:image/")) {
      analysisMessages = [
        {
          role: "system",
          content: `أنت محلل OSINT أمني متخصص في الاستخبارات البصرية. ${langNote} حلّل هذه الصورة بحثاً عن: نصوص مضمّنة (OCR)، تلميحات البيانات الوصفية، IOCs مرئية (IPs/Domains/Hashes/CVEs)، معرّفات التقنيات، آثار الجهات الخبيثة، خيوط الموقع الجغرافي، وأي بيانات حساسة. أنتج تقرير OSINT منظماً.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `ملف الصورة: ${filename || "غير معروف"}. أجرِ تحليل OSINT شاملاً.` },
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
        text: "حلّل هذا النص بحثاً عن استخبارات التهديدات: استخرج IOCs، استنتج السياق (برمجيات خبيثة، تصيد، استطلاع، استغلال)، حدّد الجهات الخبيثة أو الحملات المعروفة، قيّم الخطورة.",
        domain: "أجرِ تحليل OSINT للدومين: استنتج أنماط المسجّل، علاقات البنية التحتية، ابحث عن أنماط DGA والاصطياد والتوجيه. قيّم الخطورة.",
        ip: "أجرِ OSINT للـ IP: صنّفه (سكني/مركز بيانات/TOR/VPN)، استنتج تلميحات الموقع الجغرافي، ابحث عن ASNs لجهات التهديد المعروفة، حدّد الاستخدام المحتمل.",
        hash: "حلّل هذا Hash: صنّف النوع (MD5/SHA1/SHA256)، استنتج نوع الملف من الطول، لاحظ أنه سيُبحث عنه في VirusTotal/MISP/OTX في سير عمل حقيقي.",
      };

      analysisMessages = [
        {
          role: "system",
          content: `أنت محلل OSINT أمني. ${typeContexts[type] ?? typeContexts.text} ${langNote} أنتج تقرير Markdown منظماً يتضمن: الملخص التنفيذي، IOCs المكتشفة، تحليل السياق، تقييم التهديد، الإجراءات الموصى بها.`,
        },
        {
          role: "user",
          content: `الملف: ${filename || "محتوى ملصوق"}\nالنوع: ${type}\n\nIOCs مستخرجة:\n${iocSummary || "(لا شيء)"}\n\nالمحتوى:\n${content.slice(0, 4000)}`,
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
