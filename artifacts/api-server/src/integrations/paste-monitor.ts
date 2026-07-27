import axios from 'axios';

export interface PasteResult {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  timestamp: Date;
  matches: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export class PasteMonitor {
  private pastebinKey: string;

  constructor(pastebinKey = '') {
    this.pastebinKey = pastebinKey;
  }

  private assessRisk(content: string, keywords: string[]): 'critical' | 'high' | 'medium' | 'low' {
    const lower = content.toLowerCase();
    const criticalWords = ['password', 'credentials', 'private key', 'secret key', 'api key', 'token', 'ssn', 'credit card'];
    const highWords = ['email', 'username', 'hash', 'exploit', 'vulnerability', 'cve'];
    if (criticalWords.some(w => lower.includes(w))) return 'critical';
    if (highWords.some(w => lower.includes(w))) return 'high';
    if (keywords.some(k => lower.includes(k.toLowerCase()))) return 'medium';
    return 'low';
  }

  async monitorPastebin(keywords: string[]): Promise<PasteResult[]> {
    const results: PasteResult[] = [];
    try {
      const scrapeRes = await axios.get('https://scrape.pastebin.com/api_scraping.php?limit=100', {
        timeout: 15000
      });
      const pastes: any[] = Array.isArray(scrapeRes.data) ? scrapeRes.data : [];
      for (const paste of pastes.slice(0, 50)) {
        try {
          const contentRes = await axios.get(`https://scrape.pastebin.com/api_scrape_item.php?i=${paste.key}`, { timeout: 10000 });
          const content = typeof contentRes.data === 'string' ? contentRes.data : '';
          const lowerContent = content.toLowerCase();
          const matchedKeywords = keywords.filter(k => lowerContent.includes(k.toLowerCase()));
          if (matchedKeywords.length > 0 || keywords.length === 0) {
            results.push({
              id: paste.key,
              source: 'pastebin',
              url: `https://pastebin.com/${paste.key}`,
              title: paste.title || 'Untitled',
              content: content.substring(0, 2000),
              author: paste.user || 'anonymous',
              timestamp: new Date(parseInt(paste.date) * 1000),
              matches: matchedKeywords,
              riskLevel: this.assessRisk(content, keywords)
            });
          }
        } catch {}
      }
    } catch (e) {
      console.log('[PasteMonitor] Pastebin scrape not available, returning empty results');
    }
    return results;
  }

  async monitorGhist(keywords: string[]): Promise<PasteResult[]> {
    const results: PasteResult[] = [];
    try {
      for (const keyword of keywords.slice(0, 3)) {
        const res = await axios.get(`https://gist.github.com/search?q=${encodeURIComponent(keyword)}&s=updated`, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        results.push({
          id: `ghist-${Date.now()}`,
          source: 'github-gist',
          url: `https://gist.github.com/search?q=${encodeURIComponent(keyword)}`,
          title: `GitHub Gist search: ${keyword}`,
          content: `Search results for "${keyword}" on GitHub Gist`,
          timestamp: new Date(),
          matches: [keyword],
          riskLevel: 'low'
        });
      }
    } catch (e) {}
    return results;
  }

  async searchAllPastes(keywords: string[]): Promise<PasteResult[]> {
    const [pastebin, ghist] = await Promise.allSettled([
      this.monitorPastebin(keywords),
      this.monitorGhist(keywords)
    ]);
    const all: PasteResult[] = [
      ...(pastebin.status === 'fulfilled' ? pastebin.value : []),
      ...(ghist.status === 'fulfilled' ? ghist.value : [])
    ];
    return all.sort((a, b) => {
      const risk = { critical: 4, high: 3, medium: 2, low: 1 };
      return risk[b.riskLevel] - risk[a.riskLevel];
    });
  }
}

export default PasteMonitor;
