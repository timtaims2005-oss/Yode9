import axios from 'axios';

export class URLScanService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://urlscan.io/api/v1',
        timeout: 30000,
        headers: { 'API-Key': apiKey, 'Content-Type': 'application/json', 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async scanURL(url: string, visibility: 'public' | 'private' | 'unlisted' = 'private') {
    if (!this.client) return this.mock({
      uuid: `mock-${Date.now()}`, result: 'https://urlscan.io/result/mock/',
      api: 'https://urlscan.io/api/v1/result/mock/', visibility, options: {}
    });
    try {
      const res = await this.client.post('/scan/', { url, visibility });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getResult(uuid: string) {
    if (!this.client) return this.mock({ task: {}, page: {}, stats: {}, verdicts: { overall: { score: 0 } } });
    try {
      const res = await this.client.get(`/result/${uuid}/`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchScans(query: string, size = 100) {
    if (!this.client) {
      try {
        const pub = await axios.get(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent(query)}&size=${size}`);
        return { success: true, data: pub.data };
      } catch { return this.mock({ total: 0, results: [], query }); }
    }
    try {
      const res = await this.client.get(`/search/?q=${encodeURIComponent(query)}&size=${size}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getDOMResult(uuid: string) {
    try {
      const res = await axios.get(`https://urlscan.io/dom/${uuid}/`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default URLScanService;
