/**
 * Browser Automation Tool — Server-side web browsing
 * POST /api/browser/fetch    — Fetch page content (text extraction)
 * POST /api/browser/search   — Web search via multiple engines
 * POST /api/browser/extract  — Extract structured data from a page
 * POST /api/browser/links    — Extract all links from a page
 */
import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

const UA = "Mozilla/5.0 (compatible; CHAT-GPT-Browser/1.0; +https://mr7.ai)";
const FETCH_TIMEOUT = 15_000;
const MAX_CONTENT = 8_000;

// ── HTML → Text extraction ─────────────────────────────────────────────────────
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null && links.length < 50) {
    const href = m[1].trim();
    const text = htmlToText(m[2]).trim().slice(0, 100);
    if (!href.startsWith("javascript:") && !href.startsWith("#") && text) {
      try {
        const abs = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        links.push({ href: abs, text });
      } catch { /* invalid URL */ }
    }
  }
  return links;
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /<meta[^>]+>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const nameM = tag.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentM = tag.match(/content=["']([^"']+)["']/i);
    if (nameM && contentM) meta[nameM[1]] = contentM[1];
  }
  return meta;
}

// ── POST /api/browser/fetch ───────────────────────────────────────────────────
router.post("/browser/fetch", async (req: Request, res: Response): Promise<void> => {
  const { url, extract = "text", headers: customHeaders = {} } = req.body as {
    url?: string;
    extract?: "text" | "html" | "links" | "meta" | "all";
    headers?: Record<string, string>;
  };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,*/*", ...customHeaders },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    const html = await response.text();
    const title = extractTitle(html);
    const contentType = response.headers.get("content-type") ?? "";

    const result: Record<string, unknown> = {
      ok: true,
      url,
      status: response.status,
      title,
      contentType,
    };

    if (extract === "html") {
      result["html"] = html.slice(0, MAX_CONTENT);
    } else if (extract === "links") {
      result["links"] = extractLinks(html, url);
    } else if (extract === "meta") {
      result["meta"] = extractMeta(html);
    } else if (extract === "all") {
      result["text"] = htmlToText(html).slice(0, MAX_CONTENT);
      result["links"] = extractLinks(html, url);
      result["meta"] = extractMeta(html);
    } else {
      result["text"] = htmlToText(html).slice(0, MAX_CONTENT);
    }

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    logger.warn({ url, err: msg }, "[browser] fetch failed");
    res.status(500).json({ ok: false, error: msg, url });
  }
});

// ── POST /api/browser/search ──────────────────────────────────────────────────
router.post("/browser/search", async (req: Request, res: Response): Promise<void> => {
  const { query, engine = "ddg", limit = 5 } = req.body as {
    query?: string;
    engine?: "ddg" | "brave" | "bing";
    limit?: number;
  };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const q = encodeURIComponent(query);
  const results: { title: string; url: string; snippet: string }[] = [];

  try {
    if (engine === "brave" && process.env.BRAVE_SEARCH_API_KEY) {
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${q}&count=${Math.min(limit, 10)}`,
        {
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      const data = await r.json() as { web?: { results?: { title: string; url: string; description?: string }[] } };
      for (const item of data.web?.results ?? []) {
        results.push({ title: item.title, url: item.url, snippet: item.description ?? "" });
      }
    } else {
      // DuckDuckGo Instant Answer API
      const r = await fetch(
        `https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
      );
      const data = await r.json() as {
        AbstractText?: string;
        AbstractURL?: string;
        Answer?: string;
        RelatedTopics?: { Text?: string; FirstURL?: string; Result?: string }[];
      };

      if (data.AbstractText && data.AbstractURL) {
        results.push({ title: query, url: data.AbstractURL, snippet: data.AbstractText });
      }
      if (data.Answer) {
        results.push({ title: "Direct Answer", url: "", snippet: data.Answer });
      }
      for (const topic of (data.RelatedTopics ?? []).slice(0, limit)) {
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text });
        }
      }
    }

    res.json({ ok: true, query, engine, results: results.slice(0, limit) });
  } catch (err) {
    logger.warn({ query, err }, "[browser] search failed");
    res.json({ ok: false, query, results: [], error: err instanceof Error ? err.message : "Search failed" });
  }
});

// ── POST /api/browser/extract ─────────────────────────────────────────────────
router.post("/browser/extract", async (req: Request, res: Response): Promise<void> => {
  const { url, selector_type = "article" } = req.body as {
    url?: string;
    selector_type?: "article" | "headings" | "tables" | "code" | "prices" | "emails";
  };

  if (!url) { res.status(400).json({ error: "url is required" }); return; }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const html = await response.text();

    let extracted: unknown = null;

    switch (selector_type) {
      case "headings": {
        const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
        const headings: { level: number; text: string }[] = [];
        let m;
        while ((m = re.exec(html)) !== null) {
          headings.push({ level: parseInt(m[1]), text: htmlToText(m[2]).trim() });
        }
        extracted = headings;
        break;
      }
      case "code": {
        const re = /<code[^>]*>([\s\S]*?)<\/code>/gi;
        const codes: string[] = [];
        let m;
        while ((m = re.exec(html)) !== null && codes.length < 10) {
          const code = htmlToText(m[1]).trim();
          if (code.length > 10) codes.push(code);
        }
        extracted = codes;
        break;
      }
      case "emails": {
        const emails = [...new Set(html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [])];
        extracted = emails.slice(0, 20);
        break;
      }
      default: {
        extracted = htmlToText(html).slice(0, MAX_CONTENT);
      }
    }

    res.json({ ok: true, url, type: selector_type, data: extracted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Extract failed" });
  }
});

export default router;
