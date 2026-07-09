import axios from 'axios';

export interface TransactionNode {
  address: string;
  totalReceived: number;
  totalSent: number;
  balance: number;
  txCount: number;
  firstSeen?: Date;
  lastSeen?: Date;
  labels: string[];
  riskScore: number;
}

export interface TransactionEdge {
  from: string;
  to: string;
  amount: number;
  txHash: string;
  timestamp: Date;
  confirmations: number;
}

export interface BlockchainGraph {
  nodes: TransactionNode[];
  edges: TransactionEdge[];
  totalVolume: number;
  analysisDepth: number;
}

export class BlockchainAnalyzer {
  async analyzeAddress(address: string, chain: 'bitcoin' | 'ethereum' | 'litecoin' = 'bitcoin'): Promise<TransactionNode> {
    try {
      if (chain === 'bitcoin') {
        const res = await axios.get(`https://blockchain.info/rawaddr/${address}?limit=50`, { timeout: 15000 });
        const data = res.data;
        return {
          address,
          totalReceived: data.total_received / 1e8,
          totalSent: data.total_sent / 1e8,
          balance: data.final_balance / 1e8,
          txCount: data.n_tx,
          firstSeen: data.txs?.length ? new Date(data.txs[data.txs.length - 1].time * 1000) : undefined,
          lastSeen: data.txs?.length ? new Date(data.txs[0].time * 1000) : undefined,
          labels: [],
          riskScore: 0
        };
      } else if (chain === 'ethereum') {
        const res = await axios.get(`https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest`, { timeout: 15000 });
        return {
          address,
          totalReceived: 0,
          totalSent: 0,
          balance: parseInt(res.data.result || '0') / 1e18,
          txCount: 0,
          labels: [],
          riskScore: 0
        };
      }
    } catch (e) {}
    return {
      address, totalReceived: 0, totalSent: 0, balance: 0,
      txCount: 0, labels: [], riskScore: 0
    };
  }

  async getTransactions(address: string, chain: 'bitcoin' | 'ethereum' = 'bitcoin', limit = 50): Promise<TransactionEdge[]> {
    try {
      if (chain === 'bitcoin') {
        const res = await axios.get(`https://blockchain.info/rawaddr/${address}?limit=${limit}`, { timeout: 15000 });
        const txs: TransactionEdge[] = [];
        for (const tx of (res.data.txs || [])) {
          for (const output of (tx.out || [])) {
            if (output.addr && output.addr !== address) {
              txs.push({
                from: address,
                to: output.addr,
                amount: output.value / 1e8,
                txHash: tx.hash,
                timestamp: new Date(tx.time * 1000),
                confirmations: tx.block_height ? 1 : 0
              });
            }
          }
          for (const input of (tx.inputs || [])) {
            if (input.prev_out?.addr && input.prev_out.addr !== address) {
              txs.push({
                from: input.prev_out.addr,
                to: address,
                amount: input.prev_out.value / 1e8,
                txHash: tx.hash,
                timestamp: new Date(tx.time * 1000),
                confirmations: tx.block_height ? 1 : 0
              });
            }
          }
        }
        return txs;
      }
    } catch (e) {}
    return [];
  }

  async traceGraph(address: string, depth: number = 2, chain: 'bitcoin' | 'ethereum' = 'bitcoin'): Promise<BlockchainGraph> {
    const visited = new Set<string>();
    const nodeMap = new Map<string, TransactionNode>();
    const allEdges: TransactionEdge[] = [];

    const explore = async (addr: string, currentDepth: number) => {
      if (currentDepth <= 0 || visited.has(addr) || visited.size > 50) return;
      visited.add(addr);
      const node = await this.analyzeAddress(addr, chain);
      nodeMap.set(addr, node);
      if (currentDepth > 1) {
        const txs = await this.getTransactions(addr, chain, 10);
        for (const tx of txs) {
          allEdges.push(tx);
          const nextAddr = tx.from === addr ? tx.to : tx.from;
          await explore(nextAddr, currentDepth - 1);
        }
      }
    };

    await explore(address, depth);
    const totalVolume = allEdges.reduce((sum, e) => sum + e.amount, 0);
    return {
      nodes: Array.from(nodeMap.values()),
      edges: allEdges,
      totalVolume,
      analysisDepth: depth
    };
  }

  detectSuspiciousPatterns(graph: BlockchainGraph): string[] {
    const warnings: string[] = [];
    const highVolNodes = graph.nodes.filter(n => n.totalReceived > 100);
    if (highVolNodes.length > 0) warnings.push(`High-volume addresses detected: ${highVolNodes.length}`);
    const mixingIndicators = graph.nodes.filter(n => n.txCount > 1000);
    if (mixingIndicators.length > 0) warnings.push(`Potential mixing service: ${mixingIndicators.length} addresses with >1000 txs`);
    const clusterStrength = graph.edges.length / Math.max(graph.nodes.length, 1);
    if (clusterStrength > 5) warnings.push(`Dense transaction cluster detected (ratio: ${clusterStrength.toFixed(2)})`);
    return warnings;
  }
}

export default BlockchainAnalyzer;
