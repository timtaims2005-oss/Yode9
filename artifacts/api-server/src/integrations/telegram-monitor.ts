import axios from 'axios';

export interface TelegramPost {
  id: number;
  channel: string;
  text: string;
  date: Date;
  views?: number;
  forwards?: number;
  media?: { type: string; url?: string };
  keywords: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export class TelegramMonitor {
  private botToken: string;
  private client: any;

  constructor(botToken = '') {
    this.botToken = botToken;
    if (botToken) {
      this.client = axios.create({
        baseURL: `https://api.telegram.org/bot${botToken}`,
        timeout: 15000
      });
    }
  }

  private assessRisk(text: string, keywords: string[]): 'critical' | 'high' | 'medium' | 'low' {
    const lower = text.toLowerCase();
    const criticalTerms = ['0day', 'zero-day', 'ransomware', 'payload', 'exploit kit', 'c2 server', 'botnet', 'ddos'];
    const highTerms = ['breach', 'leak', 'credentials', 'shell', 'backdoor', 'malware', 'phishing kit'];
    const mediumTerms = ['vulnerability', 'cve-', 'hack', 'bypass', 'injection'];
    if (criticalTerms.some(t => lower.includes(t))) return 'critical';
    if (highTerms.some(t => lower.includes(t))) return 'high';
    if (mediumTerms.some(t => lower.includes(t)) || keywords.some(k => lower.includes(k.toLowerCase()))) return 'medium';
    return 'low';
  }

  async monitorPublicChannel(channelUsername: string, keywords: string[] = [], limit = 50): Promise<TelegramPost[]> {
    const results: TelegramPost[] = [];
    if (!this.client) {
      // Use public MTProto API via t.me preview
      try {
        const res = await axios.get(`https://t.me/s/${channelUsername}`, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' }
        });
        // Minimal parse of t.me/s page
        const html: string = typeof res.data === 'string' ? res.data : '';
        const msgRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        let match;
        let idx = 0;
        while ((match = msgRegex.exec(html)) !== null && idx < limit) {
          const rawText = match[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
          if (!rawText) continue;
          const matchedKws = keywords.filter(k => rawText.toLowerCase().includes(k.toLowerCase()));
          if (keywords.length === 0 || matchedKws.length > 0) {
            results.push({
              id: idx++,
              channel: channelUsername,
              text: rawText.substring(0, 1000),
              date: new Date(),
              keywords: matchedKws,
              riskLevel: this.assessRisk(rawText, keywords)
            });
          }
        }
      } catch (e) {
        // Channel not accessible or rate-limited
      }
      return results;
    }
    try {
      const res = await this.client.get('/getUpdates', { params: { limit, allowed_updates: ['channel_post'] } });
      const updates = res.data.result || [];
      for (const update of updates) {
        const post = update.channel_post;
        if (!post || !post.text) continue;
        const matchedKws = keywords.filter(k => post.text.toLowerCase().includes(k.toLowerCase()));
        if (keywords.length === 0 || matchedKws.length > 0) {
          results.push({
            id: post.message_id,
            channel: channelUsername,
            text: post.text.substring(0, 1000),
            date: new Date(post.date * 1000),
            views: post.views,
            keywords: matchedKws,
            riskLevel: this.assessRisk(post.text, keywords)
          });
        }
      }
    } catch (e) {}
    return results;
  }

  async searchDarkWebChannels(keywords: string[]): Promise<TelegramPost[]> {
    const darkWebChannels = [
      'cthulhusec', 'leakbase', 'dark_web_leaks', 'cybersecurity_news',
      'hackernews_bot', 'exploit_db', 'vulndb', 'malware_traffic'
    ];
    const allResults: TelegramPost[] = [];
    for (const channel of darkWebChannels.slice(0, 3)) {
      try {
        const posts = await this.monitorPublicChannel(channel, keywords, 20);
        allResults.push(...posts);
      } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    return allResults;
  }

  async searchByKeywords(keywords: string[], channels?: string[]): Promise<TelegramPost[]> {
    const targetChannels = channels || ['hackernews', 'securitynews', 'cyberalert'];
    const allPosts: TelegramPost[] = [];
    for (const ch of targetChannels) {
      const posts = await this.monitorPublicChannel(ch, keywords, 30);
      allPosts.push(...posts);
    }
    return allPosts.sort((a, b) => {
      const risk = { critical: 4, high: 3, medium: 2, low: 1 };
      return risk[b.riskLevel] - risk[a.riskLevel];
    });
  }
}

export default TelegramMonitor;
