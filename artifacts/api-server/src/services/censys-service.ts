import axios from 'axios';

export class CensysService {
  private client: any;
  private apiId: string;
  private apiSecret: string;

  constructor(apiId = '', apiSecret = '') {
    this.apiId = apiId;
    this.apiSecret = apiSecret;
    if (apiId && apiSecret) {
      this.client = axios.create({
        baseURL: 'https://search.censys.io/api',
        timeout: 30000,
        auth: { username: apiId, password: apiSecret },
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'MR7AI-OSINT/2.0' }
      });
    }
  }

  private mock(data: any) {
    return { success: true, data, meta: { timestamp: new Date(), source: 'mock', duration: 0 } };
  }

  async searchHosts(query: string, page = 1, perPage = 25) {
    if (!this.client) return this.mock({
      total: 0, results: [], query,
      note: 'Censys API key not configured — mock response'
    });
    try {
      const res = await this.client.post('/v2/hosts/search', { q: query, per_page: perPage, cursor: null });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getHostDetails(ip: string) {
    if (!this.client) return this.mock({
      ip, services: [], location: {}, autonomous_system: {},
      note: 'Censys API key not configured'
    });
    try {
      const res = await this.client.get(`/v2/hosts/${ip}`);
      return { success: true, data: res.data.result };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async searchCertificates(query: string) {
    if (!this.client) return this.mock({ total: 0, results: [], query });
    try {
      const res = await this.client.post('/v1/search/certificates', {
        query, fields: ['parsed.subject_dn', 'parsed.issuer_dn', 'parsed.validity.start', 'parsed.names']
      });
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }

  async getDomainReport(domain: string) {
    if (!this.client) return this.mock({ domain, subdomains: [], records: [], certificates: [] });
    try {
      const res = await this.client.get(`/v2/certificates/domain/${domain}`);
      return { success: true, data: res.data };
    } catch (e: any) {
      return { success: false, error: e.message, data: null };
    }
  }
}

export default CensysService;
