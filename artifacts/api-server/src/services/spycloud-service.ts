import axios from 'axios';

export class SpyCloudService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://api.spycloud.io/enterprise-v2',
        timeout: 30000,
        headers: { 'X-API-Key': apiKey, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async lookupEmail(email: string) {
    if (!this.client) return this.mock({
      hits: 0, results: [], email,
      note: 'SpyCloud API key not configured'
    });
    try {
      const res = await this.client.get(`/breach/data/emails/${encodeURIComponent(email)}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async lookupDomain(domain: string) {
    if (!this.client) return this.mock({ hits: 0, results: [], domain });
    try {
      const res = await this.client.get(`/breach/data/domains/${domain}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async lookupIP(ip: string) {
    if (!this.client) return this.mock({ hits: 0, results: [], ip });
    try {
      const res = await this.client.get(`/breach/data/ips/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getBreachCatalog() {
    if (!this.client) return this.mock({ breaches: [], total: 0 });
    try {
      const res = await this.client.get('/breach/catalog');
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getWatchlist() {
    if (!this.client) return this.mock({ watchlist: [] });
    try {
      const res = await this.client.get('/watchlist');
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default SpyCloudService;
