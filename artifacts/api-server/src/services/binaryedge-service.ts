import axios from 'axios';

export class BinaryEdgeService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://api.binaryedge.io/v2',
        timeout: 30000,
        headers: { 'X-Key': apiKey, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async queryIP(ip: string) {
    if (!this.client) return this.mock({
      ip, events: [], total: 0, note: 'BinaryEdge API key not configured'
    });
    try {
      const res = await this.client.get(`/query/ip/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getIPScore(ip: string) {
    if (!this.client) return this.mock({ ip, score: { normalized_ip_score: 0 }, results: [] });
    try {
      const res = await this.client.get(`/query/score/ip/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchHosts(query: string, page = 1) {
    if (!this.client) return this.mock({ total: 0, events: [], query });
    try {
      const res = await this.client.get(`/query/search?query=${encodeURIComponent(query)}&page=${page}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getDomainSubdomains(domain: string) {
    if (!this.client) return this.mock({ subdomains: [], total: 0, domain });
    try {
      const res = await this.client.get(`/query/domains/subdomain/${domain}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getDataLeaks(email: string) {
    if (!this.client) return this.mock({ leaks: [], total: 0, email });
    try {
      const res = await this.client.get(`/query/dataleaks/email/${encodeURIComponent(email)}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default BinaryEdgeService;
