import axios from 'axios';

export class VirusTotalService {
  private client: any;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = axios.create({
        baseURL: 'https://www.virustotal.com/api/v3',
        timeout: 30000,
        headers: { 'x-apikey': apiKey, 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { timestamp: new Date(), source: 'mock' } };
  }

  async analyzeIP(ip: string) {
    if (!this.client) return this.mock({
      ip, malicious: 0, suspicious: 0, harmless: 0, undetected: 0,
      country: 'Unknown', as_owner: 'Unknown', reputation: 0,
      tags: [], last_analysis_stats: { malicious: 0 }
    });
    try {
      const res = await this.client.get(`/ip_addresses/${ip}`);
      return { success: true, data: res.data.data.attributes };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async analyzeDomain(domain: string) {
    if (!this.client) return this.mock({
      domain, reputation: 0, categories: {}, malicious_count: 0,
      last_analysis_stats: { malicious: 0, suspicious: 0 }, whois: ''
    });
    try {
      const res = await this.client.get(`/domains/${domain}`);
      return { success: true, data: res.data.data.attributes };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async analyzeHash(hash: string) {
    if (!this.client) return this.mock({
      sha256: hash, meaningful_name: 'Unknown', type_description: 'Unknown',
      size: 0, malicious: 0, suspicious: 0,
      last_analysis_stats: { malicious: 0 }, names: []
    });
    try {
      const res = await this.client.get(`/files/${hash}`);
      return { success: true, data: res.data.data.attributes };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async analyzeURL(url: string) {
    if (!this.client) return this.mock({
      url, malicious: 0, suspicious: 0, harmless: 0,
      last_analysis_stats: { malicious: 0 }, categories: {}
    });
    try {
      const encoded = Buffer.from(url).toString('base64').replace(/=+$/, '');
      const res = await this.client.get(`/urls/${encoded}`);
      return { success: true, data: res.data.data.attributes };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async submitFileForScan(fileBuffer: Buffer, filename: string) {
    if (!this.client) return this.mock({ id: 'mock-scan-id', type: 'analysis' });
    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', fileBuffer, filename);
      const res = await this.client.post('/files', form, { headers: form.getHeaders() });
      return { success: true, data: res.data.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getThreatActors() {
    if (!this.client) return this.mock({ actors: [], total: 0 });
    try {
      const res = await this.client.get('/threat_actors');
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getLivehunt(ruleId: string) {
    if (!this.client) return this.mock({ matches: [], total: 0 });
    try {
      const res = await this.client.get(`/intelligence/hunting_rulesets/${ruleId}/matching_files`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default VirusTotalService;
