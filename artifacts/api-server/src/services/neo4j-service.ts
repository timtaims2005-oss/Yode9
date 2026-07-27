import {
  GraphNode,
  GraphRelationship,
  GraphAnalysis,
  GraphPath,
  Community,
  CentralityResult,
  Anomaly
} from '../types/osint.js';

// Neo4j driver - gracefully handle if not installed
let neo4j: any = null;
try {
  neo4j = require('neo4j-driver');
} catch {
  // Neo4j driver not available - will use mock mode
}

export class Neo4jService {
  private driver: any = null;
  private readonly uri: string;
  private readonly user: string;
  private readonly password: string;
  private mockMode: boolean;

  constructor(uri: string, user: string, password: string) {
    this.uri = uri;
    this.user = user;
    this.password = password;
    this.mockMode = !neo4j || !uri;

    if (!this.mockMode) {
      try {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      } catch {
        this.mockMode = true;
      }
    }
  }

  async createNode(node: GraphNode): Promise<void> {
    if (this.mockMode) return;

    const session = this.driver.session();
    try {
      await session.run(
        `MERGE (n {id: $id}) SET n += $properties RETURN n`,
        { id: node.id, properties: node.properties }
      );
    } finally {
      await session.close();
    }
  }

  async createRelationship(rel: GraphRelationship): Promise<void> {
    if (this.mockMode) return;

    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (a {id: $source}), (b {id: $target})
         MERGE (a)-[r:${rel.type}]->(b)
         SET r += $properties
         RETURN r`,
        { source: rel.source, target: rel.target, properties: rel.properties }
      );
    } finally {
      await session.close();
    }
  }

  async correlateEmail(email: string): Promise<GraphAnalysis> {
    if (this.mockMode) {
      return this.mockGraphAnalysis(email, 'email');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (e:Email {address: $email})-[r]-(n)
         RETURN e, r, n`,
        { email }
      );

      return this.parseGraphResult(result);
    } finally {
      await session.close();
    }
  }

  async correlateIP(ip: string): Promise<GraphAnalysis> {
    if (this.mockMode) {
      return this.mockGraphAnalysis(ip, 'ip');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (ip:IP {address: $ip})-[r]-(n)
         RETURN ip, r, n`,
        { ip }
      );

      return this.parseGraphResult(result);
    } finally {
      await session.close();
    }
  }

  async correlateDomain(domain: string): Promise<GraphAnalysis> {
    if (this.mockMode) {
      return this.mockGraphAnalysis(domain, 'domain');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (d:Domain {name: $domain})-[r]-(n)
         RETURN d, r, n`,
        { domain }
      );

      return this.parseGraphResult(result);
    } finally {
      await session.close();
    }
  }

  async findPaths(sourceId: string, targetId: string, maxDepth: number = 4): Promise<GraphPath[]> {
    if (this.mockMode) {
      return [{
        nodes: [sourceId, targetId],
        relationships: ['CONNECTED_TO'],
        length: 1,
        weight: 1,
        start: sourceId,
        end: targetId
      }];
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH path = shortestPath((a {id: $sourceId})-[*1..${maxDepth}]-(b {id: $targetId}))
         RETURN path LIMIT 10`,
        { sourceId, targetId }
      );

      return result.records.map((record: any) => {
        const path = record.get('path');
        const nodes = path.segments.map((s: any) => s.start.properties.id);
        nodes.push(path.end.properties.id);
        const relationships = path.segments.map((s: any) => s.relationship.type);

        return {
          nodes,
          relationships,
          length: path.length,
          weight: path.segments.length,
          start: sourceId,
          end: targetId
        };
      });
    } finally {
      await session.close();
    }
  }

  async importOSINTData(data: {
    emails?: string[];
    ips?: string[];
    domains?: string[];
    relationships?: Array<{ source: string; target: string; type: string; properties?: any }>;
  }): Promise<void> {
    if (this.mockMode) return;

    const session = this.driver.session();
    try {
      if (data.emails) {
        for (const email of data.emails) {
          await session.run(
            `MERGE (e:Email {address: $email}) SET e.updatedAt = datetime() RETURN e`,
            { email }
          );
        }
      }

      if (data.ips) {
        for (const ip of data.ips) {
          await session.run(
            `MERGE (i:IP {address: $ip}) SET i.updatedAt = datetime() RETURN i`,
            { ip }
          );
        }
      }

      if (data.domains) {
        for (const domain of data.domains) {
          await session.run(
            `MERGE (d:Domain {name: $domain}) SET d.updatedAt = datetime() RETURN d`,
            { domain }
          );
        }
      }

      if (data.relationships) {
        for (const rel of data.relationships) {
          await session.run(
            `MATCH (a {id: $source}), (b {id: $target})
             MERGE (a)-[r:${rel.type}]->(b)
             SET r += $properties
             RETURN r`,
            { source: rel.source, target: rel.target, properties: rel.properties || {} }
          );
        }
      }
    } finally {
      await session.close();
    }
  }

  async executeQuery(cypher: string, parameters: Record<string, unknown> = {}): Promise<any[]> {
    if (this.mockMode) return [];

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, parameters);
      return result.records;
    } finally {
      await session.close();
    }
  }

  async detectCommunities(): Promise<Community[]> {
    if (this.mockMode) return [];

    const session = this.driver.session();
    try {
      const result = await session.run(`
        CALL gds.louvain.stream('graph')
        YIELD nodeId, communityId
        RETURN communityId, collect(nodeId) AS members
        ORDER BY size(collect(nodeId)) DESC
      `);

      return result.records.map((record: any, index: number) => ({
        id: index,
        members: record.get('members'),
        size: record.get('members').length,
        density: 0,
        centrality: 0
      }));
    } catch {
      return [];
    } finally {
      await session.close();
    }
  }

  async calculateCentrality(): Promise<CentralityResult[]> {
    if (this.mockMode) return [];

    const session = this.driver.session();
    try {
      const result = await session.run(`
        CALL gds.pageRank.stream('graph')
        YIELD nodeId, score
        RETURN nodeId, score
        ORDER BY score DESC
        LIMIT 100
      `);

      return result.records.map((record: any) => ({
        node: record.get('nodeId'),
        degree: 0,
        betweenness: 0,
        closeness: 0,
        eigenvector: 0,
        pagerank: record.get('score')
      }));
    } catch {
      return [];
    } finally {
      await session.close();
    }
  }

  private parseGraphResult(result: any): GraphAnalysis {
    const nodes: GraphNode[] = [];
    const relationships: GraphRelationship[] = [];

    if (result && result.records) {
      result.records.forEach((record: any) => {
        record.keys.forEach((key: string) => {
          const item = record.get(key);
          if (!item) return;

          if (item.labels) {
            const node: GraphNode = {
              id: item.properties?.id || item.elementId || key,
              type: item.labels[0] || 'Unknown',
              labels: item.labels,
              properties: item.properties || {},
            };
            if (!nodes.find(n => n.id === node.id)) {
              nodes.push(node);
            }
          } else if (item.type && item.startNodeElementId) {
            const rel: GraphRelationship = {
              id: item.elementId || `${item.startNodeElementId}-${item.endNodeElementId}`,
              type: item.type,
              source: item.startNodeElementId,
              target: item.endNodeElementId,
              properties: item.properties || {},
              direction: 'out'
            };
            if (!relationships.find(r => r.id === rel.id)) {
              relationships.push(rel);
            }
          }
        });
      });
    }

    return {
      nodes,
      relationships,
      paths: [],
      communities: [],
      centralities: [],
      anomalies: this.detectAnomalies(nodes, relationships)
    };
  }

  private detectAnomalies(nodes: GraphNode[], relationships: GraphRelationship[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const highDegreeNodes = nodes.filter(node => {
      const degree = relationships.filter(r => r.source === node.id || r.target === node.id).length;
      return degree > 10;
    });

    if (highDegreeNodes.length > 0) {
      anomalies.push({
        type: 'high_centrality',
        description: 'Nodes with unusually high connection degree detected',
        nodes: highDegreeNodes.map(n => n.id),
        relationships: [],
        score: 0.8,
        severity: 'medium'
      });
    }

    return anomalies;
  }

  private mockGraphAnalysis(value: string, type: string): GraphAnalysis {
    const node: GraphNode = {
      id: value,
      type: type.toUpperCase(),
      labels: [type.toUpperCase()],
      properties: { value, analyzedAt: new Date().toISOString() }
    };

    return {
      nodes: [node],
      relationships: [],
      paths: [],
      communities: [],
      centralities: [],
      anomalies: []
    };
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

export default Neo4jService;
