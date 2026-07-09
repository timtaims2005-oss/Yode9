import axios from 'axios';

export class GreyNoiseService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://api.greynoise.io/v3',
        timeout: 20000,
        headers: { key: apiKey, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async analyzeIP(ip: string) {
    if (!this.client) return this.mock({
      ip, seen: false, classification: 'unknown', noise: false, riot: false,
      name: 'Unknown', link: null, last_seen: null, message: 'Not available — API key not set'
    });
    try {
      const res = await this.client.get(`/community/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async analyzeIPContext(ip: string) {
    if (!this.client) return this.mock({ ip, seen: false, tags: [], metadata: {} });
    try {
      const res = await this.client.get(`/noise/context/${ip}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async quickCheck(ips: string[]) {
    if (!this.client) return this.mock(ips.map(ip => ({ ip, noise: false, riot: false, code: '0x05' })));
    try {
      const res = await this.client.post('/noise/quick', { ips });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async gnqlQuery(query: string, size = 25) {
    if (!this.client) return this.mock({ complete: true, count: 0, data: [], message: 'No API key' });
    try {
      const res = await this.client.get('/experimental/gnql', { params: { query, size } });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getTags() {
    if (!this.client) return this.mock({ metadata: [] });
    try {
      const res = await this.client.get('/meta/metadata');
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default GreyNoiseService;
