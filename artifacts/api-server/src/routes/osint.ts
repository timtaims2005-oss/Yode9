import { Router, type IRouter } from "express";
import { getPersonalOpenAI, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";

const router: IRouter = Router();

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

    const fetchRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CHAT-GPT-osint/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await fetchRes.text();
    const plainText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    const headers: Record<string, string> = {};
    fetchRes.headers.forEach((v, k) => { headers[k] = v; });

    const iocs = extractIocs(plainText);

    const langNote = body.language === "ar" ? "Respond in Arabic." : "Respond in English.";
    const analysisText = await getPersonalOpenAI().chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are a cyber OSINT analyst. Analyze the fetched page and produce a structured intelligence report. ${langNote}

Include: purpose of the page, technology fingerprints, threat indicators, key entities (orgs, people, locations), risk assessment (Low/Medium/High/Critical), and recommended next steps for an analyst.`,
        },
        {
          role: "user",
          content: `URL: ${url}\nStatus: ${fetchRes.status}\nHeaders: ${JSON.stringify(headers, null, 2).slice(0, 800)}\n\nContent:\n${plainText.slice(0, 3000)}`,
        },
      ],
    });

    return res.json({
      url,
      title,
      status: fetchRes.status,
      headers,
      iocs,
      analysis: analysisText.choices?.[0]?.message?.content ?? "",
      contentLength: plainText.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OSINT URL analysis failed";
    return res.status(500).json({ error: message });
  }
});

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

    const completion = await getPersonalOpenAI().chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: 2000,
      messages: analysisMessages as Parameters<ReturnType<typeof getPersonalOpenAI>["chat"]["completions"]["create"]>[0]["messages"],
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
