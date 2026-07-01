import axios from 'axios';

export class KelaService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://api.ke-la.com/v1',
        timeout: 30000,
        headers: { 'X-API-Key': apiKey, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async searchCredentials(query: string) {
    if (!this.client) return this.mock({ results: [], total: 0, query, note: 'KELA API key not configured' });
    try {
      const res = await this.client.get('/credentials', { params: { q: query } });
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async searchDarkWebMentions(keyword: string, from?: string, to?: string) {
    if (!this.client) return this.mock({ mentions: [], total: 0 });
    try {
      const res = await this.client.get('/mentions', { params: { keyword, from, to } });
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async getMarketActivity(market: string) {
    if (!this.client) return this.mock({ market, listings: [], vendors: [] });
    try {
      const res = await this.client.get(`/markets/${market}`);
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async getRansomwareActivity(limit = 50) {
    if (!this.client) return this.mock({ groups: [], attacks: [], total: 0 });
    try {
      const res = await this.client.get('/ransomware', { params: { limit } });
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }

  async getThreatActors() {
    if (!this.client) return this.mock({ actors: [], total: 0 });
    try {
      const res = await this.client.get('/actors');
      return { success: true, data: res.data };
    } catch (e: any) { return { success: false, error: e.message, data: null }; }
  }
}

export default KelaService;
