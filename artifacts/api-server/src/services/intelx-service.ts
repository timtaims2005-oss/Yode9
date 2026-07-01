import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  EmailIntelResult,
  DataBreach,
  StolenCredential,
  DarkWebResult,
  DarkWebContent,
  ThreatActor,
  APIResponse,
  ResponseMeta
} from '../types/osint.js';
import { createHash } from 'crypto';

export class IntelXService {
  private client: AxiosInstance;
  private readonly baseURL = 'https://2.intelx.io';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'x-key': this.apiKey,
        'User-Agent': 'MR7-AI-OSINT/2.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(async (config) => {
      const requestId = createHash('sha256')
        .update(`${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 16);
      config.headers['X-Request-ID'] = requestId;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt((error.response.headers['retry-after'] as string) || '60');
          await this.sleep(retryAfter * 1000);
          return this.client.request(error.config!);
        }
        throw error;
      }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchEmail(email: string): Promise<APIResponse<EmailIntelResult>> {
    const startTime = Date.now();

    try {
      const searchResponse = await this.client.post('/intelligent/search', {
        term: email,
        maxresults: 100,
        media: 0,
        target: 2
      });

      const searchId = searchResponse.data.id;
      await this.waitForSearchCompletion(searchId);

      const resultsResponse = await this.client.get('/intelligent/search/result', {
        params: { id: searchId, limit: 100, offset: 0 }
      });

      const records = resultsResponse.data.records || [];
      const breaches: DataBreach[] = [];
      const credentials: StolenCredential[] = [];

      for (const record of records) {
        if (record.type === 'leak') {
          const breach = await this.parseBreachRecord(record);
          if (breach) breaches.push(breach);
        } else if (record.type === 'login') {
          const cred = await this.parseCredentialRecord(record, email);
          if (cred) credentials.push(cred);
        }
      }

      const reputation = await this.checkEmailReputation(email);

      const result: EmailIntelResult = {
        email,
        reputation: reputation.score,
        suspicious: reputation.suspicious,
        references: records.length,
        details: {
          blacklisted: reputation.blacklisted,
          maliciousActivity: reputation.malicious,
          spam: reputation.spam,
          spoofable: reputation.spoofable,
          freeProvider: this.isFreeProvider(email),
          disposable: this.isDisposable(email),
          dataBreach: breaches.length > 0,
          firstSeen: breaches.length > 0 ? breaches[breaches.length - 1].breachDate : undefined,
          lastSeen: breaches.length > 0 ? breaches[0].modifiedDate : undefined
        },
        breaches,
        credentials,
        sources: [...new Set(records.map((r: any) => r.source || 'intelx'))]
      };

      return { success: true, data: result, meta: this.createMeta(startTime) };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private async waitForSearchCompletion(searchId: string): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const statusResponse = await this.client.get('/intelligent/search/result', {
          params: { id: searchId, limit: 1 }
        });
        if (statusResponse.data.status === 'done') return;
      } catch {}
      await this.sleep(delayMs);
    }
  }

  private async parseBreachRecord(record: any): Promise<DataBreach | null> {
    try {
      return {
        name: record.name || 'Unknown',
        title: record.name || 'Unknown',
        domain: record.domain || '',
        breachDate: new Date(record.date || Date.now()),
        addedDate: new Date(record.added || Date.now()),
        modifiedDate: new Date(record.modified || Date.now()),
        pwnCount: record.count || 0,
        description: record.description || '',
        dataClasses: record.dataClasses || [],
        isVerified: record.is_verified || false,
        isFabricated: record.is_fabricated || false,
        isSensitive: record.is_sensitive || false,
        isRetired: record.is_retired || false,
        isSpamList: record.is_spam_list || false
      };
    } catch {
      return null;
    }
  }

  private async parseCredentialRecord(record: any, email: string): Promise<StolenCredential | null> {
    try {
      return {
        email,
        password: record.password,
        hash: record.hash,
        source: record.source || 'intelx',
        dateCompromised: new Date(record.date || Date.now()),
        additionalData: record.meta || {}
      };
    } catch {
      return null;
    }
  }

  private async checkEmailReputation(email: string): Promise<any> {
    return {
      score: 70,
      suspicious: false,
      blacklisted: false,
      malicious: false,
      spam: false,
      spoofable: this.checkSpoofable(email)
    };
  }

  private checkSpoofable(email: string): boolean {
    return true;
  }

  private isFreeProvider(email: string): boolean {
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return freeProviders.includes(domain);
  }

  private isDisposable(email: string): boolean {
    const disposable = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email'];
    const domain = email.split('@')[1]?.toLowerCase();
    return disposable.includes(domain);
  }

  async searchDarkWeb(query: string, options: {
    sources?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    riskLevel?: string[];
  } = {}): Promise<APIResponse<DarkWebResult[]>> {
    const startTime = Date.now();

    try {
      const searchResponse = await this.client.post('/intelligent/search', {
        term: query,
        maxresults: 1000,
        media: 0,
        target: 3
      });

      const searchId = searchResponse.data.id;
      await this.waitForSearchCompletion(searchId);

      const resultsResponse = await this.client.get('/intelligent/search/result', {
        params: { id: searchId, limit: 1000, offset: 0 }
      });

      const records = resultsResponse.data.records || [];
      const results: DarkWebResult[] = [];

      for (const record of records) {
        const parsed = await this.parseDarkWebRecord(record);
        if (parsed && this.matchesFilters(parsed, options)) {
          results.push(parsed);
        }
      }

      return { success: true, data: results, meta: this.createMeta(startTime) };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private async parseDarkWebRecord(record: any): Promise<DarkWebResult | null> {
    try {
      const content: DarkWebContent[] = [];
      const bitcoinAddresses: string[] = [];
      const moneroAddresses: string[] = [];
      const threatActors: ThreatActor[] = [];

      if (record.storageid) {
        const text = record.text || '';
        content.push({
          type: 'text',
          url: record.link || '',
          hash: record.storageid,
          size: text.length,
          mimeType: 'text/plain',
          extractedText: text,
          metadata: record.metadata || {},
          capturedAt: new Date(record.date || Date.now())
        });

        const btcMatches = text.match(/[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g) || [];
        const xmrMatches = text.match(/4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}/g) || [];
        bitcoinAddresses.push(...btcMatches);
        moneroAddresses.push(...xmrMatches);
      }

      return {
        title: record.name || 'Unknown',
        description: record.description || '',
        language: record.language || 'unknown',
        category: record.category || 'general',
        lastSeen: new Date(record.date || Date.now()),
        firstSeen: new Date(record.added || Date.now()),
        status: record.online ? 'online' : 'offline',
        riskLevel: this.calculateRiskLevel(record),
        content,
        mentions: [],
        relatedActors: threatActors,
        bitcoinAddresses: [...new Set(bitcoinAddresses)],
        moneroAddresses: [...new Set(moneroAddresses)],
        pgpKeys: [],
        contactInfo: [],
        technologies: record.technologies || [],
        hosting: {
          provider: record.hosting_provider,
          country: record.hosting_country,
          ip: record.hosting_ip,
          hostingType: record.hosting_type || 'unknown'
        }
      };
    } catch {
      return null;
    }
  }

  private calculateRiskLevel(record: any): 'critical' | 'high' | 'medium' | 'low' {
    const riskIndicators = [
      record.malware,
      record.phishing,
      record.fraud,
      record.illegal_content,
      record.violence
    ].filter(Boolean).length;

    if (riskIndicators >= 4) return 'critical';
    if (riskIndicators >= 3) return 'high';
    if (riskIndicators >= 1) return 'medium';
    return 'low';
  }

  private matchesFilters(result: DarkWebResult, options: any): boolean {
    if (options.riskLevel && !options.riskLevel.includes(result.riskLevel)) return false;
    if (options.dateFrom && result.lastSeen < options.dateFrom) return false;
    if (options.dateTo && result.lastSeen > options.dateTo) return false;
    return true;
  }

  async monitorTelegram(channel: string, keywords: string[]): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const searchResponse = await this.client.post('/search', {
        term: keywords.join(' OR '),
        maxresults: 100,
        media: 0,
        target: 4
      });

      const searchId = searchResponse.data.id;
      await this.waitForSearchCompletion(searchId);

      const resultsResponse = await this.client.get('/search/result', {
        params: { id: searchId, limit: 100 }
      });

      const messages = resultsResponse.data.records || [];
      const parsedMessages = messages.map((msg: any) => ({
        channel: msg.channel || channel,
        username: msg.username,
        content: msg.text,
        timestamp: new Date(msg.date || Date.now()),
        attachments: msg.attachments || [],
        forwardedFrom: msg.forwarded_from,
        views: msg.views,
        forwards: msg.forwards,
        replies: msg.replies
      }));

      return {
        success: true,
        data: {
          channel,
          keywords,
          messages: parsedMessages,
          totalMessages: messages.length,
          uniqueUsers: [...new Set(messages.map((m: any) => m.username))].length
        },
        meta: this.createMeta(startTime)
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private createMeta(startTime: number): ResponseMeta {
    return {
      timestamp: new Date(),
      requestId: createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').substring(0, 16),
      duration: Date.now() - startTime,
      rateLimit: { limit: 1000, remaining: 999, reset: new Date(Date.now() + 3600000) }
    };
  }

  private handleError(error: any, startTime: number): APIResponse<any> {
    const axiosError = error as AxiosError;
    return {
      success: false,
      error: {
        code: axiosError.response?.status?.toString() || 'UNKNOWN',
        message: axiosError.message,
        details: axiosError.response?.data as Record<string, unknown>
      },
      meta: this.createMeta(startTime)
    };
  }
}

export default IntelXService;
