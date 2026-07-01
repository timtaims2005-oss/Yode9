import axios from 'axios';
import {
  ThreatIntelResult,
  IndicatorOfCompromise,
  Threat,
  ThreatActor,
  DarkWebResult,
  SecurityRecommendation,
  APIResponse
} from '../types/osint.js';

export class RecordedFutureService {
  private client: any;
  private apiKey: string;
  private readonly baseURL = 'https://api.recordedfuture.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'X-RFToken': this.apiKey,
        'User-Agent': 'MR7-AI-OSINT/2.0'
      }
    });
  }

  async analyzeIOC(ioc: string, type: string): Promise<APIResponse<ThreatIntelResult>> {
    const startTime = Date.now();

    try {
      const [entityResponse, riskResponse, linksResponse] = await Promise.all([
        this.client.get(`/v2/${type}/${encodeURIComponent(ioc)}`),
        this.client.get(`/v2/${type}/${encodeURIComponent(ioc)}/risk`),
        this.client.get(`/v2/${type}/${encodeURIComponent(ioc)}/links`)
      ]);

      const indicators: IndicatorOfCompromise[] = [{
        type: type as any,
        value: ioc,
        confidence: (entityResponse.data.data?.risk?.score || 0) / 100,
        severity: this.scoreToSeverity(entityResponse.data.data?.risk?.score || 0),
        firstSeen: new Date(entityResponse.data.data?.timestamps?.firstSeen || Date.now()),
        lastSeen: new Date(entityResponse.data.data?.timestamps?.lastSeen || Date.now()),
        sources: entityResponse.data.data?.sources || [],
        tags: entityResponse.data.data?.tags || []
      }];

      const result: ThreatIntelResult = {
        ioc: indicators[0],
        threats: await this.extractThreats(linksResponse.data),
        campaigns: [],
        actors: await this.extractActors(linksResponse.data),
        signatures: [],
        mitreAttacks: [],
        recommendations: this.generateRecommendations(riskResponse.data)
      };

      return {
        success: true,
        data: result,
        meta: {
          timestamp: new Date(),
          requestId: `rf-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async searchDarkWeb(query: string): Promise<APIResponse<DarkWebResult[]>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/v2/search', {
        params: { query, limit: 100, type: 'darkweb' }
      });

      const results: DarkWebResult[] = (response.data?.data?.results || []).map((item: any) => ({
        title: item.title || 'Unknown',
        description: item.summary || '',
        language: item.language || 'unknown',
        category: item.category || 'general',
        lastSeen: new Date(item.timestamp || Date.now()),
        firstSeen: new Date(item.firstseen || Date.now()),
        status: 'online' as const,
        riskLevel: this.riskScoreToLevel(item.risk?.score || 0),
        content: [{
          type: 'text' as const,
          url: item.url || '',
          hash: item.hash || '',
          size: item.size || 0,
          mimeType: 'text/html',
          extractedText: item.content || '',
          metadata: item.metadata || {},
          capturedAt: new Date(item.timestamp || Date.now())
        }],
        mentions: [],
        relatedActors: [],
        bitcoinAddresses: this.extractBitcoinAddresses(item.content || ''),
        moneroAddresses: [],
        pgpKeys: [],
        contactInfo: [],
        technologies: [],
        hosting: {
          provider: item.host || undefined,
          country: item.country || undefined,
          hostingType: 'unknown' as const
        }
      }));

      return {
        success: true,
        data: results,
        meta: {
          timestamp: new Date(),
          requestId: `rf-dw-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getThreatActor(actorName: string): Promise<APIResponse<ThreatActor>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/v2/actor/${encodeURIComponent(actorName)}`);

      const actor: ThreatActor = {
        name: response.data.data?.name || actorName,
        aliases: response.data.data?.aliases || [],
        group: response.data.data?.group,
        country: response.data.data?.origin,
        motivation: response.data.data?.motivation,
        firstSeen: new Date(response.data.data?.timestamps?.firstSeen || Date.now()),
        lastSeen: new Date(response.data.data?.timestamps?.lastSeen || Date.now()),
        tactics: response.data.data?.tactics || [],
        targets: response.data.data?.targets || [],
        associatedMalware: response.data.data?.malware || [],
        confidence: response.data.data?.confidence || 0
      };

      return {
        success: true,
        data: actor,
        meta: {
          timestamp: new Date(),
          requestId: `rf-actor-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async createAlert(rule: {
    name: string;
    query: string;
    severity: string;
    notify: string[];
  }): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/v2/alert/rule', rule);

      return {
        success: true,
        data: { alertId: response.data.data?.id, status: 'active', createdAt: new Date() },
        meta: {
          timestamp: new Date(),
          requestId: `rf-alert-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getAlerts(): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get('/v2/alert');

      return {
        success: true,
        data: response.data.data,
        meta: {
          timestamp: new Date(),
          requestId: `rf-alerts-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private scoreToSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private riskScoreToLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private async extractThreats(data: any): Promise<Threat[]> {
    return [];
  }

  private async extractActors(data: any): Promise<ThreatActor[]> {
    return [];
  }

  private extractBitcoinAddresses(content: string): string[] {
    const regex = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/g;
    return content.match(regex) || [];
  }

  private generateRecommendations(riskData: any): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    if (riskData?.data?.risk?.score > 70) {
      recommendations.push({
        priority: 'critical',
        category: 'immediate_action',
        description: 'High risk indicator detected',
        action: 'Block immediately and investigate',
        automation: 'auto-block',
        references: []
      });
    }

    return recommendations;
  }

  private handleError(error: any, startTime: number): APIResponse<any> {
    return {
      success: false,
      error: {
        code: error.response?.status?.toString() || 'UNKNOWN',
        message: error.message,
        details: error.response?.data
      },
      meta: { timestamp: new Date(), requestId: '', duration: Date.now() - startTime, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }
}

export default RecordedFutureService;
