import axios from 'axios';

export interface ESQuery {
  index: string;
  query: any;
  size?: number;
  from?: number;
  sort?: any[];
  aggregations?: any;
}

export interface ESResult {
  hits: { total: number; hits: Array<{ _id: string; _score: number; _source: any }> };
  aggregations?: any;
  took: number;
}

export class ElasticsearchClient {
  private client: any;
  private baseURL: string;
  private available: boolean;

  constructor(url?: string, username?: string, password?: string) {
    this.baseURL = url || process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    this.available = false;
    const auth = (username || process.env.ELASTICSEARCH_USER) && (password || process.env.ELASTICSEARCH_PASS)
      ? { username: username || process.env.ELASTICSEARCH_USER || '', password: password || process.env.ELASTICSEARCH_PASS || '' }
      : undefined;
    this.client = axios.create({
      baseURL: this.baseURL, timeout: 10000,
      ...(auth ? { auth } : {})
    });
    // Test connectivity
    this.client.get('/').then(() => { this.available = true; }).catch(() => { this.available = false; });
  }

  isAvailable(): boolean { return this.available; }

  async index(indexName: string, document: any, id?: string): Promise<any> {
    if (!this.available) return { result: 'mock_indexed', _id: id || `mock-${Date.now()}` };
    try {
      const url = id ? `/${indexName}/_doc/${id}` : `/${indexName}/_doc`;
      const res = await this.client.post(url, document);
      return res.data;
    } catch (e: any) { return { result: 'error', error: e.message }; }
  }

  async search(query: ESQuery): Promise<ESResult> {
    if (!this.available) return { hits: { total: 0, hits: [] }, took: 0 };
    try {
      const res = await this.client.post(`/${query.index}/_search`, {
        query: query.query,
        size: query.size || 10,
        from: query.from || 0,
        ...(query.sort ? { sort: query.sort } : {}),
        ...(query.aggregations ? { aggs: query.aggregations } : {})
      });
      return {
        hits: {
          total: res.data.hits.total.value || res.data.hits.total,
          hits: res.data.hits.hits
        },
        aggregations: res.data.aggregations,
        took: res.data.took
      };
    } catch (e: any) { return { hits: { total: 0, hits: [] }, took: 0 }; }
  }

  async searchOSINT(term: string, types: string[] = []) {
    return this.search({
      index: 'osint-*',
      query: {
        bool: {
          must: [{ multi_match: { query: term, fields: ['*'] } }],
          filter: types.length > 0 ? [{ terms: { type: types } }] : []
        }
      },
      size: 50,
      sort: [{ timestamp: { order: 'desc' } }]
    });
  }

  async createIndex(name: string, mappings?: any) {
    if (!this.available) return { acknowledged: true, mock: true };
    try {
      const res = await this.client.put(`/${name}`, mappings ? { mappings } : {});
      return res.data;
    } catch (e: any) { return { acknowledged: false, error: e.message }; }
  }

  async deleteDocument(index: string, id: string) {
    if (!this.available) return { result: 'not_found', mock: true };
    try {
      const res = await this.client.delete(`/${index}/_doc/${id}`);
      return res.data;
    } catch (e: any) { return { result: 'error', error: e.message }; }
  }

  async bulkIndex(index: string, docs: Array<{ id?: string; doc: any }>) {
    if (!this.available) return { took: 0, errors: false, items: [], mock: true };
    const body = docs.flatMap(({ id, doc }) => [
      { index: { _index: index, ...(id ? { _id: id } : {}) } },
      doc
    ]);
    try {
      const res = await this.client.post('/_bulk', body.map(b => JSON.stringify(b)).join('\n') + '\n', {
        headers: { 'Content-Type': 'application/x-ndjson' }
      });
      return res.data;
    } catch (e: any) { return { errors: true, error: e.message }; }
  }

  async getStats() {
    if (!this.available) return { available: false, url: this.baseURL };
    try {
      const res = await this.client.get('/_cluster/stats');
      return { available: true, ...res.data };
    } catch { return { available: false, url: this.baseURL }; }
  }
}

export const esClient = new ElasticsearchClient();
export default ElasticsearchClient;
