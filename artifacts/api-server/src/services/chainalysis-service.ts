import axios from 'axios';
import {
  BlockchainResult,
  Transaction,
  Entity,
  RiskCategory,
  ExchangeDeposit,
  DarkWebConnection,
  ClusteringResult,
  APIResponse
} from '../types/osint.js';

export class ChainalysisService {
  private client: any;
  private apiKey: string;
  private readonly baseURL = 'https://api.chainalysis.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'User-Agent': 'MR7-AI-OSINT/2.0'
      }
    });
  }

  async analyzeAddress(address: string, chain: string = 'bitcoin'): Promise<APIResponse<BlockchainResult>> {
    const startTime = Date.now();

    try {
      const [addressResponse, transactionsResponse, clusteringResponse] = await Promise.all([
        this.client.get(`/api/v1/address/${address}`),
        this.getTransactions(address, chain),
        this.getClustering(address, chain)
      ]);

      const riskCategories = this.categorizeRisks(addressResponse.data);

      const result: BlockchainResult = {
        address,
        type: chain as any,
        balance: addressResponse.data.balance || 0,
        transactions: transactionsResponse.data || [],
        riskScore: addressResponse.data.risk?.score || 0,
        riskCategories,
        entities: addressResponse.data.entities || [],
        clustering: clusteringResponse.data || {
          clusterId: '',
          addresses: [address],
          confidence: 0,
          algorithm: 'unknown'
        },
        mixingDetected: this.detectMixing(transactionsResponse.data || []),
        exchangeDeposits: this.extractExchangeDeposits(transactionsResponse.data || []),
        darkWebConnections: this.extractDarkWebConnections(addressResponse.data)
      };

      return {
        success: true,
        data: result,
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async trackTransaction(txHash: string, chain: string = 'bitcoin'): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/api/v1/transaction/${txHash}`);

      return {
        success: true,
        data: {
          hash: txHash,
          chain,
          inputs: response.data.inputs,
          outputs: response.data.outputs,
          value: response.data.value,
          timestamp: new Date(response.data.timestamp),
          blockHeight: response.data.block_height,
          confirmations: response.data.confirmations,
          risk: response.data.risk,
          entities: response.data.entities,
          tags: response.data.tags
        },
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-tx-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async traceFunds(
    sourceAddress: string,
    depth: number = 3,
    options: {
      minValue?: number;
      maxTransactions?: number;
      direction?: 'forward' | 'backward' | 'both';
    } = {}
  ): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/api/v1/trace', {
        source_address: sourceAddress,
        depth,
        min_value: options.minValue || 0,
        max_transactions: options.maxTransactions || 1000,
        direction: options.direction || 'both'
      });

      return {
        success: true,
        data: {
          paths: (response.data.paths || []).map((path: any) => ({
            nodes: path.addresses,
            transactions: path.transactions,
            totalValue: path.total_value,
            hops: path.hops,
            riskScore: path.risk_score,
            entities: path.entities
          })),
          summary: {
            totalPaths: response.data.paths?.length || 0,
            totalValue: response.data.total_value,
            highRiskPaths: (response.data.paths || []).filter((p: any) => p.risk_score > 70).length,
            entitiesInvolved: [...new Set((response.data.paths || []).flatMap((p: any) => p.entities || []))]
          }
        },
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-trace-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async analyzeCluster(clusterId: string): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/api/v1/cluster/${clusterId}`);

      return {
        success: true,
        data: {
          clusterId,
          addresses: response.data.addresses,
          totalTransactions: response.data.total_transactions,
          totalReceived: response.data.total_received,
          totalSent: response.data.total_sent,
          currentBalance: response.data.current_balance,
          entity: response.data.entity,
          riskScore: response.data.risk_score,
          firstActivity: new Date(response.data.first_activity),
          lastActivity: new Date(response.data.last_activity),
          tags: response.data.tags,
          relatedClusters: response.data.related_clusters
        },
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-cluster-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async createMonitor(addresses: string[]): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/api/v1/monitor', {
        addresses,
        webhook_url: process.env.WEBHOOK_URL,
        events: ['transaction', 'risk_change', 'entity_tag']
      });

      return {
        success: true,
        data: { monitorId: response.data.id, addresses, status: 'active', createdAt: new Date() },
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-monitor-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getRiskScore(address: string): Promise<APIResponse<any>> {
    const startTime = Date.now();

    try {
      const response = await this.client.get(`/api/v1/risk/${address}`);

      return {
        success: true,
        data: {
          address,
          riskScore: response.data.risk_score,
          riskLevel: this.scoreToRiskLevel(response.data.risk_score),
          categories: response.data.risk_categories,
          explanation: response.data.explanation
        },
        meta: {
          timestamp: new Date(),
          requestId: `chainalysis-risk-${Date.now()}`,
          duration: Date.now() - startTime,
          rateLimit: { limit: 1000, remaining: 999, reset: new Date() }
        }
      };

    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  private async getTransactions(address: string, chain: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/address/${address}/transactions`);
      return {
        data: (response.data.transactions || []).map((tx: any) => ({
          hash: tx.hash,
          timestamp: new Date(tx.timestamp),
          value: tx.value,
          valueUSD: tx.value_usd,
          from: (tx.inputs || []).map((i: any) => i.address),
          to: (tx.outputs || []).map((o: any) => o.address),
          fee: tx.fee || 0,
          confirmations: tx.confirmations || 0,
          blockHeight: tx.block_height || 0,
          isSuspicious: (tx.risk || 0) > 50,
          tags: tx.tags || []
        }))
      };
    } catch {
      return { data: [] };
    }
  }

  private async getClustering(address: string, chain: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/v1/address/${address}/cluster`);
      return { data: response.data };
    } catch {
      return { data: null };
    }
  }

  private categorizeRisks(data: any): RiskCategory[] {
    const categories: RiskCategory[] = [];

    if (data.risk?.darkweb) {
      categories.push({
        category: 'darkweb',
        risk: 'high',
        description: 'Connected to dark web marketplace',
        evidence: data.risk.darkweb.evidence || []
      });
    }

    if (data.risk?.sanctions) {
      categories.push({
        category: 'sanctions',
        risk: 'high',
        description: 'Address on sanctions list',
        evidence: data.risk.sanctions.evidence || []
      });
    }

    if (data.risk?.stolen) {
      categories.push({
        category: 'stolen_funds',
        risk: 'high',
        description: 'Connected to stolen funds',
        evidence: data.risk.stolen.evidence || []
      });
    }

    return categories;
  }

  private detectMixing(transactions: Transaction[]): boolean {
    return transactions.some(tx =>
      tx.tags?.includes('mixing') ||
      tx.tags?.includes('tumbler') ||
      tx.tags?.includes('coinjoin')
    );
  }

  private extractExchangeDeposits(transactions: Transaction[]): ExchangeDeposit[] {
    return transactions
      .filter(tx => tx.tags?.includes('exchange'))
      .map(tx => ({
        exchange: tx.tags?.find((t: string) => t.includes('exchange:')) || 'unknown',
        address: tx.to[0] || '',
        timestamp: tx.timestamp,
        value: tx.value,
        txHash: tx.hash
      }));
  }

  private extractDarkWebConnections(data: any): DarkWebConnection[] {
    return data.darkweb_connections || [];
  }

  private scoreToRiskLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private handleError(error: any, startTime: number): APIResponse<any> {
    return {
      success: false,
      error: {
        code: error.response?.status?.toString() || 'UNKNOWN',
        message: error.message,
        details: error.response?.data
      },
      meta: { timestamp: new Date(), requestId: '', duration: Date.now() - startTime, rateLimit: { limit: 1000, remaining: 999, reset: new Date() } }
    };
  }
}

export default ChainalysisService;
