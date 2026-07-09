import axios from 'axios';
import { createHash } from 'crypto';
import { DarkWebResult, DarkWebContent, PGPKey, ContactInfo } from '../types/osint.js';

// Cheerio - gracefully handle if not available
let cheerio: any = null;
try {
  cheerio = require('cheerio');
} catch {
  // cheerio not available
}

// SocksProxyAgent - gracefully handle if not available
let SocksProxyAgent: any = null;
try {
  SocksProxyAgent = require('socks-proxy-agent').SocksProxyAgent;
} catch {
  // socks-proxy-agent not available
}

export class TorScraper {
  private agent: any;
  private readonly torProxy: string;
  private torAvailable: boolean;

  constructor(torProxy: string = 'socks5://127.0.0.1:9050') {
    this.torProxy = torProxy;
    this.torAvailable = !!SocksProxyAgent;

    if (this.torAvailable) {
      try {
        this.agent = new SocksProxyAgent(torProxy);
      } catch {
        this.torAvailable = false;
      }
    }
  }

  async scrapeOnionSite(url: string): Promise<DarkWebResult> {
    try {
      const options: any = {
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
        }
      };

      if (this.torAvailable && this.agent) {
        options.httpAgent = this.agent;
        options.httpsAgent = this.agent;
      }

      const response = await axios.get(url, options);
      const text = this.extractText(response.data);
      const content: DarkWebContent[] = [];

      content.push({
        type: 'text',
        url,
        hash: this.calculateHash(text),
        size: text.length,
        mimeType: 'text/html',
        extractedText: text.substring(0, 10000),
        metadata: {
          title: this.extractTitle(response.data),
          description: this.extractDescription(response.data)
        },
        capturedAt: new Date()
      });

      const bitcoinAddresses = this.extractBitcoinAddresses(text);
      const moneroAddresses = this.extractMoneroAddresses(text);
      const pgpKeys = this.extractPGPKeys(text);

      return {
        title: this.extractTitle(response.data) || 'Unknown',
        description: this.extractDescription(response.data) || '',
        language: this.detectLanguage(text),
        category: this.categorizeContent(text),
        lastSeen: new Date(),
        firstSeen: new Date(),
        status: 'online',
        riskLevel: this.assessRisk(text, url),
        content,
        mentions: [],
        relatedActors: [],
        bitcoinAddresses,
        moneroAddresses,
        pgpKeys,
        contactInfo: this.extractContactInfo(text),
        technologies: this.detectTechnologies(response.headers),
        hosting: await this.detectHosting(url, response.headers)
      };

    } catch (error: any) {
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  async monitorTelegramChannel(channel: string, keywords: string[]): Promise<any[]> {
    const messages: any[] = [];

    try {
      const options: any = {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
        }
      };

      if (this.torAvailable && this.agent) {
        options.httpAgent = this.agent;
        options.httpsAgent = this.agent;
      }

      const response = await axios.get(`https://t.me/s/${channel}`, options);
      const text = this.extractText(response.data);

      if (cheerio) {
        const $ = cheerio.load(response.data);
        $('.tgme_widget_message').each((_: any, msg: any) => {
          const msgText = $(msg).find('.tgme_widget_message_text').text();
          const date = $(msg).find('.tgme_widget_message_date time').attr('datetime');

          const containsKeyword = keywords.some(k =>
            msgText.toLowerCase().includes(k.toLowerCase())
          );

          if (containsKeyword) {
            messages.push({
              channel,
              content: msgText,
              timestamp: new Date(date || Date.now()),
              views: $(msg).find('.tgme_widget_message_views').text(),
              media: $(msg).find('.tgme_widget_message_photo').length > 0
            });
          }
        });
      }

    } catch (error: any) {
      console.error(`Failed to monitor Telegram channel ${channel}:`, error.message);
    }

    return messages;
  }

  async monitorPasteSites(keywords: string[]): Promise<any[]> {
    const pastes: any[] = [];
    const pasteSites = [
      'https://pastebin.com',
      'https://paste.ee',
      'https://ghostbin.com',
      'https://0bin.net'
    ];

    for (const site of pasteSites) {
      try {
        const options: any = {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
          }
        };

        if (this.torAvailable && this.agent) {
          options.httpAgent = this.agent;
          options.httpsAgent = this.agent;
        }

        const response = await axios.get(site, options);

        if (cheerio) {
          const $ = cheerio.load(response.data);
          $('.paste').each((_: any, paste: any) => {
            const title = $(paste).find('.title').text();
            const content = $(paste).find('.content').text();

            if (keywords.some(k => content.toLowerCase().includes(k.toLowerCase()))) {
              pastes.push({
                site,
                title,
                content: content.substring(0, 1000),
                timestamp: new Date(),
                url: $(paste).find('a').attr('href')
              });
            }
          });
        }

      } catch (error: any) {
        console.error(`Failed to monitor ${site}:`, error.message);
      }
    }

    return pastes;
  }

  async crawlForum(forumUrl: string, credentials?: {
    username: string;
    password: string;
  }): Promise<any[]> {
    const posts: any[] = [];

    try {
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
      };

      const options: any = { headers };
      if (this.torAvailable && this.agent) {
        options.httpAgent = this.agent;
        options.httpsAgent = this.agent;
      }

      if (credentials) {
        const loginResponse = await axios.post(`${forumUrl}/login`, credentials, options);
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) headers['Cookie'] = cookies.join('; ');
      }

      const sections = ['/general', '/marketplace', '/tutorials', '/services'];

      for (const section of sections) {
        try {
          const response = await axios.get(`${forumUrl}${section}`, options);

          if (cheerio) {
            const $ = cheerio.load(response.data);
            $('.post, .thread, .topic').each((_: any, post: any) => {
              posts.push({
                title: $(post).find('.title, .subject').text(),
                content: $(post).find('.content, .message').text(),
                author: $(post).find('.author, .username').text(),
                timestamp: $(post).find('.date, .time').text(),
                section,
                url: $(post).find('a').attr('href')
              });
            });
          }
        } catch {}
      }

    } catch (error: any) {
      console.error(`Failed to crawl forum ${forumUrl}:`, error.message);
    }

    return posts;
  }

  async scrapeI2PSite(url: string): Promise<DarkWebResult> {
    try {
      const response = await axios.get(url, {
        proxy: { host: '127.0.0.1', port: 4444 },
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
        }
      });

      const text = this.extractText(response.data);

      return {
        title: this.extractTitle(response.data) || 'Unknown',
        description: this.extractDescription(response.data) || '',
        language: this.detectLanguage(text),
        category: this.categorizeContent(text),
        lastSeen: new Date(),
        firstSeen: new Date(),
        status: 'online',
        riskLevel: this.assessRisk(text, url),
        content: [{
          type: 'text',
          url,
          hash: this.calculateHash(text),
          size: text.length,
          mimeType: 'text/html',
          extractedText: text.substring(0, 10000),
          metadata: { title: this.extractTitle(response.data) },
          capturedAt: new Date()
        }],
        mentions: [],
        relatedActors: [],
        bitcoinAddresses: this.extractBitcoinAddresses(text),
        moneroAddresses: this.extractMoneroAddresses(text),
        pgpKeys: this.extractPGPKeys(text),
        contactInfo: this.extractContactInfo(text),
        technologies: this.detectTechnologies(response.headers),
        hosting: { provider: 'I2P Network', hostingType: 'anonymous' }
      };

    } catch (error: any) {
      throw new Error(`Failed to scrape I2P site ${url}: ${error.message}`);
    }
  }

  async scrapeFreenetSite(key: string): Promise<DarkWebResult> {
    const freenetApi = 'http://127.0.0.1:8888';

    try {
      const response = await axios.get(`${freenetApi}/freenet:${key}`, { timeout: 60000 });
      const text = response.data as string;

      return {
        title: 'Freenet Content',
        description: text.substring(0, 200),
        language: this.detectLanguage(text),
        category: 'general',
        lastSeen: new Date(),
        firstSeen: new Date(),
        status: 'online',
        riskLevel: this.assessRisk(text, key),
        content: [{
          type: 'text',
          url: `freenet:${key}`,
          hash: this.calculateHash(text),
          size: text.length,
          mimeType: 'text/plain',
          extractedText: text.substring(0, 10000),
          metadata: {},
          capturedAt: new Date()
        }],
        mentions: [],
        relatedActors: [],
        bitcoinAddresses: this.extractBitcoinAddresses(text),
        moneroAddresses: this.extractMoneroAddresses(text),
        pgpKeys: this.extractPGPKeys(text),
        contactInfo: this.extractContactInfo(text),
        technologies: ['Freenet'],
        hosting: { provider: 'Freenet', hostingType: 'distributed' }
      };

    } catch (error: any) {
      throw new Error(`Failed to scrape Freenet key ${key}: ${error.message}`);
    }
  }

  async scrapeZeroNet(site: string): Promise<DarkWebResult> {
    const zeroNetApi = 'http://127.0.0.1:43110';

    try {
      const response = await axios.get(`${zeroNetApi}/${site}`, { timeout: 60000 });
      const text = this.extractText(response.data);

      return {
        title: this.extractTitle(response.data) || 'ZeroNet Site',
        description: this.extractDescription(response.data) || '',
        language: this.detectLanguage(text),
        category: this.categorizeContent(text),
        lastSeen: new Date(),
        firstSeen: new Date(),
        status: 'online',
        riskLevel: this.assessRisk(text, site),
        content: [{
          type: 'text',
          url: `${zeroNetApi}/${site}`,
          hash: this.calculateHash(text),
          size: text.length,
          mimeType: 'text/html',
          extractedText: text.substring(0, 10000),
          metadata: { title: this.extractTitle(response.data) },
          capturedAt: new Date()
        }],
        mentions: [],
        relatedActors: [],
        bitcoinAddresses: this.extractBitcoinAddresses(text),
        moneroAddresses: this.extractMoneroAddresses(text),
        pgpKeys: this.extractPGPKeys(text),
        contactInfo: this.extractContactInfo(text),
        technologies: ['ZeroNet'],
        hosting: { provider: 'ZeroNet', hostingType: 'peer-to-peer' }
      };

    } catch (error: any) {
      throw new Error(`Failed to scrape ZeroNet site ${site}: ${error.message}`);
    }
  }

  async bulkScrape(urls: string[], options: {
    maxConcurrency?: number;
    timeout?: number;
  } = {}): Promise<{ success: DarkWebResult[]; failed: string[] }> {
    const { maxConcurrency = 5, timeout = 60000 } = options;
    const success: DarkWebResult[] = [];
    const failed: string[] = [];

    const queue = [...urls];
    const active = new Set<Promise<void>>();

    const processUrl = async (url: string) => {
      try {
        const result = await Promise.race([
          this.scrapeOnionSite(url),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
        success.push(result);
      } catch {
        failed.push(url);
      }
    };

    while (queue.length > 0 || active.size > 0) {
      while (active.size < maxConcurrency && queue.length > 0) {
        const url = queue.shift()!;
        const promise = processUrl(url).then(() => { active.delete(promise); });
        active.add(promise);
      }

      if (active.size > 0) {
        await Promise.race(active);
      }
    }

    return { success, failed };
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private extractText(html: string): string {
    if (cheerio) {
      const $ = cheerio.load(html);
      return $('body').text().trim();
    }
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extractTitle(html: string): string {
    if (cheerio) {
      const $ = cheerio.load(html);
      return $('title').text();
    }
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1] : '';
  }

  private extractDescription(html: string): string {
    if (cheerio) {
      const $ = cheerio.load(html);
      return $('meta[name="description"]').attr('content') || '';
    }
    const match = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    return match ? match[1] : '';
  }

  private detectLanguage(text: string): string {
    const languages: Record<string, string[]> = {
      'en': ['the', 'is', 'and', 'to', 'of'],
      'ar': ['في', 'من', 'إلى', 'على', 'هذا'],
      'ru': ['в', 'на', 'и', 'не', 'что'],
      'zh': ['的', '了', '在', '是', '我']
    };

    const lowerText = text.toLowerCase();
    let bestLang = 'unknown';
    let maxScore = 0;

    for (const [lang, words] of Object.entries(languages)) {
      const score = words.filter(w => lowerText.includes(w)).length;
      if (score > maxScore) {
        maxScore = score;
        bestLang = lang;
      }
    }

    return bestLang;
  }

  private categorizeContent(text: string): string {
    const categories: Record<string, string[]> = {
      'marketplace': ['buy', 'sell', 'price', 'market', 'vendor', 'product'],
      'hacking': ['exploit', 'vulnerability', 'hack', 'breach', 'leak'],
      'fraud': ['carding', 'fraud', 'scam', 'phishing', 'steal'],
      'drugs': ['cocaine', 'heroin', 'cannabis', 'drug', 'narcotic'],
      'weapons': ['gun', 'weapon', 'firearm', 'ammo', 'explosive'],
      'services': ['hosting', 'vpn', 'bulletproof', 'ddos', 'malware']
    };

    const lowerText = text.toLowerCase();
    let bestCategory = 'general';
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      const score = keywords.filter(k => lowerText.includes(k)).length;
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  private assessRisk(text: string, url: string): 'critical' | 'high' | 'medium' | 'low' {
    const riskIndicators = {
      critical: ['child', 'cp', 'exploitation', 'terrorism', 'hitman', 'assassination'],
      high: ['fentanyl', 'heroin', 'cocaine', 'weapon', 'exploit', '0day', 'ransomware'],
      medium: ['cannabis', 'fraud', 'carding', 'phishing', 'malware', 'stealer'],
      low: ['vpn', 'hosting', 'privacy', 'security']
    };

    const lowerText = text.toLowerCase();

    for (const [level, keywords] of Object.entries(riskIndicators)) {
      if (keywords.some(k => lowerText.includes(k))) {
        return level as 'critical' | 'high' | 'medium' | 'low';
      }
    }

    if (url.includes('market') || url.includes('shop')) return 'medium';
    if (url.includes('forum')) return 'low';

    return 'low';
  }

  private extractBitcoinAddresses(text: string): string[] {
    const regex = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g;
    const bech32Regex = /bc1[a-z0-9]{39,59}/gi;
    return [...(text.match(regex) || []), ...(text.match(bech32Regex) || [])];
  }

  private extractMoneroAddresses(text: string): string[] {
    const regex = /4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}/g;
    return text.match(regex) || [];
  }

  private extractPGPKeys(text: string): PGPKey[] {
    const pgpBlockRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]*?-----END PGP PUBLIC KEY BLOCK-----/g;
    const matches = text.match(pgpBlockRegex) || [];

    return matches.map((key, index) => ({
      fingerprint: createHash('sha256').update(key).digest('hex').substring(0, 16),
      keyId: `key-${index}`,
      algorithm: 'RSA',
      size: key.length,
      created: new Date(),
      identities: [],
      emails: this.extractEmails(key)
    }));
  }

  private extractEmails(text: string): string[] {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(regex) || [])];
  }

  private extractContactInfo(text: string): ContactInfo[] {
    const contacts: ContactInfo[] = [];

    this.extractEmails(text).forEach(email => {
      contacts.push({ type: 'email', value: email, verified: false });
    });

    const jabberRegex = /[a-zA-Z0-9._%+-]+@jabber\.[a-zA-Z]{2,}/g;
    (text.match(jabberRegex) || []).forEach(jid => {
      contacts.push({ type: 'jabber', value: jid, verified: false });
    });

    const telegramRegex = /@\w{5,32}/g;
    (text.match(telegramRegex) || []).forEach(tg => {
      contacts.push({ type: 'telegram', value: tg, verified: false });
    });

    return contacts;
  }

  private detectTechnologies(headers: any): string[] {
    const techs: string[] = [];
    const server = headers['server'] || '';
    if (server.includes('nginx')) techs.push('nginx');
    if (server.includes('Apache')) techs.push('Apache');
    if (server.includes('IIS')) techs.push('IIS');

    const poweredBy = headers['x-powered-by'] || '';
    if (poweredBy.includes('PHP')) techs.push('PHP');
    if (poweredBy.includes('ASP.NET')) techs.push('ASP.NET');

    return techs;
  }

  private async detectHosting(url: string, headers?: any): Promise<any> {
    if (headers) {
      const server = headers['server'] || '';
      if (server.includes('cloudflare')) return { provider: 'Cloudflare', hostingType: 'cdn' };
      if (server.includes('ddos-guard')) return { provider: 'DDoS-Guard', hostingType: 'bulletproof' };
    }

    return { provider: 'Unknown', hostingType: 'unknown' };
  }
}

export default TorScraper;
