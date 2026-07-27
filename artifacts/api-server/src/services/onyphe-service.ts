import axios from 'axios';

export class OnypheService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://www.onyphe.io/api/v2',
        timeout: 30000,
        headers: { Authorization: `apikey ${apiKey}`, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async queryIP(ip: string) {
    if (!this.client) return this.mock({ ip, results: [], total: 0, note: 'Onyphe key not configured' });
    try {
      const res = await this.client.get(`/summary/ip/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async queryDomain(domain: string) {
    if (!this.client) return this.mock({ domain, results: [], total: 0 });
    try {
      const res = await this.client.get(`/summary/domain/${domain}`);
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async search(oql: string, page = 1) {
    if (!this.client) return this.mock({ results: [], total: 0, query: oql });
    try {
      const res = await this.client.get(`/search/${encodeURIComponent(oql)}`, { params: { page } });
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async getGeoloc(ip: string) {
    if (!this.client) return this.mock({ ip, country: 'Unknown', city: 'Unknown', lat: 0, lon: 0 });
    try {
      const res = await this.client.get(`/simple/ip/${ip}/geoloc`);
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async getThreat(ip: string) {
    if (!this.client) return this.mock({ ip, threats: [], score: 0 });
    try {
      const res = await this.client.get(`/simple/ip/${ip}/threat`);
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }
}

export default OnypheService;
