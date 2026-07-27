import axios from 'axios';

export class FlashpointService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://fp.tools/api/v4',
        timeout: 30000,
        headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async searchEvents(query: string, limit = 25) {
    if (!this.client) return this.mock({
      total: 0, items: [], query,
      note: 'Flashpoint API key not configured'
    });
    try {
      const res = await this.client.get('/sources/aggregation/highlights/simple-stream', {
        params: { query, limit }
      });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchCredentials(query: string) {
    if (!this.client) return this.mock({ credentials: [], total: 0, query });
    try {
      const res = await this.client.get('/credentials/search', { params: { query } });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchVulnerabilities(cveOrKeyword: string) {
    if (!this.client) return this.mock({ vulnerabilities: [], total: 0 });
    try {
      const res = await this.client.get('/vulnerabilities/search', { params: { q: cveOrKeyword } });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getAlerts(since?: string) {
    if (!this.client) return this.mock({ alerts: [] });
    try {
      const res = await this.client.get('/alerts', { params: since ? { since } : {} });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchMediaExchange(query: string) {
    if (!this.client) return this.mock({ media: [], total: 0 });
    try {
      const res = await this.client.get('/sources/media/search', { params: { query } });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default FlashpointService;
