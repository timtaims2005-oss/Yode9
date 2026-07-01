import axios, { AxiosInstance } from 'axios';
import {
  NetworkIntelResult,
  NetworkService,
  NetworkHistoryEvent,
  Vulnerability,
  MalwareSample,
  APIResponse
} from '../types/osint.js';

export class ShodanService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.shodan.io',
      timeout: 30000,
      headers: { 'User-Agent': 'MR7-AI-OSINT/2.0' }
    });
  }

  async searchIP(ip: string): Promise<APIResponse<NetworkIntelResult>> {
    const startTime = Date.now();

    try {
      const [hostResponse, vulnResponse] = await Promise.all([
        this.client.get(`/shodan/host/${ip}?key=${this.apiKey}`),
        this.searchVulnerabilities(ip)
      ]);

      const hostData = hostResponse.data;

      const result: NetworkIntelResult = {
        ip,
        type: ip.includes(':') ? 'ipv6' : 'ipv4',
        asn: {
          asn: `AS${hostData.asn || '0'}`,
          name: hostData.org || 'Unknown',
          domain: hostData.asn_domain || '',
          route: hostData.network || '',
          type: this.getASNType(hostData.asn || '0')
        },
        location: {
          city: hostData.city || 'Unknown',
          region: hostData.region_code || '',
          country: hostData.country_name || 'Unknown',
          countryCode: hostData.country_code || '',
          continent: hostData.continent_code || '',
          latitude: hostData.latitude || 0,
          longitude: hostData.longitude || 0,
          timezone: hostData.timezone || 'UTC'
        },
        reputation: await this.getReputation(ip),
        services: this.parseServices(hostData.data || []),
        history: await this.getHistory(ip),
        openPorts: hostData.ports || [],
        vulnerabilities: vulnResponse.data || [],
        threatActors: [],
        malware: []
      };

      return {
        success: true,
        data: result,
        meta: { timestamp: new Date(), requestId: `shodan-${Date.now()}`, duration: Date.now() - startTime, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private parseServices(data: any[]): NetworkService[] {
    return data.map(item => ({
      port: item.port,
      protocol: item.transport || 'tcp',
      service: item.product || 'unknown',
      product: item.product,
      version: item.version,
      banner: item.data,
      cpe: item.cpe || [],
      timestamp: new Date(item.timestamp || Date.now())
    }));
  }

  async searchSCADA(): Promise<APIResponse<any>> {
    const queries = [
      'port:502 modbus',
      'port:102 Siemens',
      'port:20000 DNPSec',
      'port:44818 Rockwell',
      'port:2404 IEC'
    ];

    const results = await Promise.all(queries.map(q => this.executeSearch(q)));

    return {
      success: true,
      data: {
        systems: results.flat(),
        total: results.flat().length,
        categories: this.categorizeSCADA(results.flat())
      },
      meta: { timestamp: new Date(), requestId: `scada-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }

  async searchWebcams(): Promise<APIResponse<any>> {
    const queries = [
      'webcamxp',
      'Server: SQ-WEBCAM',
      'title:"Live View / - AXIS"',
      'title:"webcam 7"',
      'Server: "Camera Web Server"'
    ];

    const results = await Promise.all(queries.map(q => this.executeSearch(q, 100)));

    return {
      success: true,
      data: {
        cameras: results.flat(),
        total: results.flat().length,
        brands: this.extractBrands(results.flat())
      },
      meta: { timestamp: new Date(), requestId: `webcams-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }

  async searchDatabases(): Promise<APIResponse<any>> {
    const queries = [
      'product:MongoDB authentication:false',
      'product:"ElasticSearch" port:9200',
      'product:Redis',
      'product:Cassandra',
      'product:PostgreSQL',
      'product:MySQL'
    ];

    const results = await Promise.all(queries.map(q => this.executeSearch(q)));

    return {
      success: true,
      data: {
        databases: results.flat(),
        total: results.flat().length,
        exposed: results.flat().filter((r: any) => !r.auth).length
      },
      meta: { timestamp: new Date(), requestId: `databases-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }

  async searchRDP(): Promise<APIResponse<any>> {
    const results = await this.executeSearch('port:3389 "Remote Desktop"', 500);
    return {
      success: true,
      data: {
        servers: results,
        total: results.length,
        vulnerable: await this.checkRDPVulnerabilities(results)
      },
      meta: { timestamp: new Date(), requestId: `rdp-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }

  async searchIoT(): Promise<APIResponse<any>> {
    const queries = [
      '"default password"',
      'admin:admin',
      'root:root',
      'ubnt:ubnt',
      'title:"router" admin',
      'title:"NAS" login'
    ];

    const results = await Promise.all(queries.map(q => this.executeSearch(q, 100)));

    return {
      success: true,
      data: {
        devices: results.flat(),
        total: results.flat().length,
        withDefaultCreds: results.flat().filter((r: any) =>
          r.data?.includes('default password') || r.data?.includes('admin:admin')
        ).length
      },
      meta: { timestamp: new Date(), requestId: `iot-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }

  async createMonitor(query: string, callbackUrl: string): Promise<APIResponse<any>> {
    try {
      const response = await this.client.post(`/shodan/alert?key=${this.apiKey}`, {
        name: `MR7-AI-${Date.now()}`,
        query,
        filters: { port: [], tag: [], net: [] },
        webhook: callbackUrl
      });

      return {
        success: true,
        data: { alertId: response.data.id, query, status: 'active', createdAt: new Date() },
        meta: { timestamp: new Date(), requestId: `monitor-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
      };
    } catch (error) {
      return this.handleError(error, Date.now());
    }
  }

  async getNetworkAlerts(): Promise<APIResponse<any>> {
    try {
      const response = await this.client.get(`/shodan/alert?key=${this.apiKey}`);
      return {
        success: true,
        data: response.data,
        meta: { timestamp: new Date(), requestId: `alerts-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
      };
    } catch (error) {
      return this.handleError(error, Date.now());
    }
  }

  async downloadData(query: string, format: 'json' | 'csv' = 'json'): Promise<APIResponse<any>> {
    try {
      const response = await this.client.get(`/shodan/search/download?key=${this.apiKey}&query=${encodeURIComponent(query)}&format=${format}`);
      return {
        success: true,
        data: { downloadId: response.data.id, status: 'pending', estimatedSize: response.data.size, format },
        meta: { timestamp: new Date(), requestId: `download-${Date.now()}`, duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
      };
    } catch (error) {
      return this.handleError(error, Date.now());
    }
  }

  private async executeSearch(query: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await this.client.get(`/shodan/host/search?key=${this.apiKey}&query=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data.matches || [];
    } catch {
      return [];
    }
  }

  private async getReputation(ip: string): Promise<any> {
    try {
      const response = await this.client.get(`/labs/honeyscore/${ip}?key=${this.apiKey}`);
      return {
        score: response.data.score || 0,
        classification: (response.data.score || 0) > 0.5 ? 'suspicious' : 'benign',
        c2: (response.data.score || 0) > 0.8
      };
    } catch {
      return { score: 0, classification: 'unknown', c2: false };
    }
  }

  private async getHistory(ip: string): Promise<NetworkHistoryEvent[]> {
    try {
      const response = await this.client.get(`/shodan/host/${ip}/history?key=${this.apiKey}`);
      return (response.data.data || []).map((item: any) => ({
        timestamp: new Date(item.timestamp),
        event: 'service_change',
        oldValue: item.prev,
        newValue: item.curr,
        source: 'shodan'
      }));
    } catch {
      return [];
    }
  }

  private async searchVulnerabilities(ip: string): Promise<APIResponse<Vulnerability[]>> {
    try {
      const response = await this.client.get(`/shodan/host/${ip}?key=${this.apiKey}`);
      const vulns = response.data.vulns || {};
      return {
        success: true,
        data: Object.keys(vulns).map((cve: string) => ({
          cve,
          cvss: vulns[cve].cvss || 0,
          severity: this.cvssToSeverity(vulns[cve].cvss || 0),
          title: vulns[cve].title || cve,
          description: vulns[cve].description || '',
          exploitAvailable: vulns[cve].exploit || false,
          patched: false
        })),
        meta: { timestamp: new Date(), requestId: '', duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
      };
    } catch {
      return { success: true, data: [], meta: { timestamp: new Date(), requestId: '', duration: 0, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } } };
    }
  }

  private cvssToSeverity(cvss: number): 'critical' | 'high' | 'medium' | 'low' {
    if (cvss >= 9.0) return 'critical';
    if (cvss >= 7.0) return 'high';
    if (cvss >= 4.0) return 'medium';
    return 'low';
  }

  private getASNType(asn: string): string {
    const asnNum = parseInt(asn.replace('AS', ''));
    if (asnNum >= 64512 && asnNum <= 65534) return 'private';
    if (asnNum >= 4200000000) return 'private';
    return 'public';
  }

  private categorizeSCADA(systems: any[]): any {
    const categories: Record<string, any[]> = {};
    for (const sys of systems) {
      const product = sys.product || 'Unknown';
      if (!categories[product]) categories[product] = [];
      categories[product].push(sys);
    }
    return categories;
  }

  private extractBrands(cameras: any[]): string[] {
    const brands = cameras.map(c => {
      if (c.product?.includes('AXIS')) return 'AXIS';
      if (c.product?.includes('Hikvision')) return 'Hikvision';
      if (c.product?.includes('Dahua')) return 'Dahua';
      if (c.product?.includes('Foscam')) return 'Foscam';
      return 'Other';
    });
    return [...new Set(brands)];
  }

  private async checkRDPVulnerabilities(servers: any[]): Promise<any[]> {
    return servers.filter((s: any) => {
      const os = s.os || '';
      return os.includes('Windows') && (os.includes('7') || os.includes('2008') || os.includes('XP'));
    });
  }

  private handleError(error: any, startTime: number): APIResponse<any> {
    return {
      success: false,
      error: { code: 'ERROR', message: error.message, details: error.response?.data },
      meta: { timestamp: new Date(), requestId: '', duration: Date.now() - startTime, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }
}

export default ShodanService;
