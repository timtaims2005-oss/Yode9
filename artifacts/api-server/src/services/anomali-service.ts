import axios from 'axios';

export class AnomaliService {
  private client: any;
  private apiKey: string;
  private username: string;

  constructor(apiKey = '', username = '') {
    this.apiKey = apiKey;
    this.username = username;
    if (apiKey && username) {
      this.client = axios.create({
        baseURL: 'https://api.threatstream.com/api/v2',
        timeout: 30000,
        headers: {
          Authorization: `apikey ${username}:${apiKey}`,
          'User-Agent': 'MR7AI-OSINT/2.0'
        }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { source: 'mock', timestamp: new Date() } };
  }

  async searchIndicators(value: string, type?: string) {
    if (!this.client) return this.mock({
      total_count: 0, objects: [], value,
      note: 'Anomali ThreatStream API key not configured'
    });
    try {
      const params: any = { value__contains: value, limit: 100 };
      if (type) params.type = type;
      const res = await this.client.get('/intelligence/', { params });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getThreatModel(id: string) {
    if (!this.client) return this.mock({ id, name: 'Unknown', description: '', iocs: [] });
    try {
      const res = await this.client.get(`/tipreport/${id}/`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getActors() {
    if (!this.client) return this.mock({ objects: [], total_count: 0 });
    try {
      const res = await this.client.get('/actor/');
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchVulnerabilities(query: string) {
    if (!this.client) return this.mock({ vulnerabilities: [], total: 0 });
    try {
      const res = await this.client.get('/vulnerability/', { params: { name__contains: query, limit: 50 } });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getThreatBulletin(id: string) {
    if (!this.client) return this.mock({ id, name: 'Unknown', body: '' });
    try {
      const res = await this.client.get(`/tipreport/${id}/`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default AnomaliService;
