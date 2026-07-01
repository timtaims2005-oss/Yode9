import OpenAI from 'openai';
import { GraphNode, GraphRelationship, Anomaly } from '../types/osint.js';

export class AICorrelationService {
  private openai: OpenAI;
  private available: boolean;

  constructor(apiKey: string) {
    this.available = !!apiKey;
    this.openai = new OpenAI({ apiKey: apiKey || 'placeholder' });
  }

  async analyzePatterns(data: any[]): Promise<any> {
    if (!this.available || data.length === 0) {
      return this.mockPatternAnalysis(data);
    }

    try {
      const prompt = `
        Analyze the following OSINT data for patterns and relationships:
        ${JSON.stringify(data.slice(0, 5), null, 2)}
        
        Identify:
        1. Common patterns
        2. Temporal correlations
        3. Geographic clusters
        4. Behavioral similarities
        5. Potential threat indicators
        
        Return as JSON with structured analysis.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return this.mockPatternAnalysis(data);
    }
  }

  async classifyThreat(description: string): Promise<{
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    indicators: string[];
  }> {
    if (!this.available) {
      return this.mockThreatClassification(description);
    }

    try {
      const prompt = `
        Classify the following threat description:
        "${description}"
        
        Provide:
        1. Threat category (malware, phishing, fraud, etc.)
        2. Severity level (critical, high, medium, low)
        3. Confidence score (0-1)
        4. Key indicators
        
        Return as JSON.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return this.mockThreatClassification(description);
    }
  }

  async resolveEntities(entities: any[]): Promise<{
    clusters: any[];
    relationships: any[];
    confidence: number;
  }> {
    if (!this.available) {
      return { clusters: [], relationships: [], confidence: 0 };
    }

    try {
      const prompt = `
        Resolve and cluster the following entities:
        ${JSON.stringify(entities.slice(0, 10), null, 2)}
        
        Identify:
        1. Same entities with different identifiers
        2. Related entities
        3. Entity types and roles
        4. Confidence scores for matches
        
        Return as JSON.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return { clusters: [], relationships: [], confidence: 0 };
    }
  }

  async detectAnomalies(nodes: GraphNode[], relationships: GraphRelationship[]): Promise<Anomaly[]> {
    if (!this.available) {
      return this.mockAnomalyDetection(nodes, relationships);
    }

    try {
      const prompt = `
        Analyze this graph data for anomalies:
        Nodes: ${JSON.stringify(nodes.slice(0, 20))}
        Relationships: ${JSON.stringify(relationships.slice(0, 20))}
        
        Identify:
        1. Unusual connection patterns
        2. Rapid relationship changes
        3. Isolated clusters
        4. High-centrality outliers
        5. Temporal anomalies
        
        Return anomalies as JSON array with field "anomalies".
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.anomalies || [];
    } catch {
      return this.mockAnomalyDetection(nodes, relationships);
    }
  }

  async predictThreats(historicalData: any[]): Promise<{
    predictions: any[];
    confidence: number;
    timeline: string;
  }> {
    if (!this.available) {
      return { predictions: [], confidence: 0, timeline: 'N/A' };
    }

    try {
      const prompt = `
        Based on this historical threat data:
        ${JSON.stringify(historicalData.slice(0, 10), null, 2)}
        
        Predict:
        1. Future threat trends
        2. Potential targets
        3. Attack vectors
        4. Timeline predictions
        
        Return as JSON with fields: predictions, confidence, timeline.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return { predictions: [], confidence: 0, timeline: 'N/A' };
    }
  }

  async processNaturalQuery(query: string): Promise<{
    intent: string;
    entities: string[];
    filters: any;
    sort: any;
  }> {
    if (!this.available) {
      return { intent: 'search', entities: [query], filters: {}, sort: { field: 'timestamp', order: 'desc' } };
    }

    try {
      const prompt = `
        Convert this natural language query to structured search:
        "${query}"
        
        Extract:
        1. Search intent
        2. Target entities (emails, IPs, domains, etc.)
        3. Filters to apply
        4. Sort preferences
        
        Return as JSON with fields: intent, entities, filters, sort.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return { intent: 'search', entities: [query], filters: {}, sort: { field: 'timestamp', order: 'desc' } };
    }
  }

  async generateReport(data: any, template: string): Promise<string> {
    if (!this.available) {
      return `# Intelligence Report\n\n## Executive Summary\nData analyzed: ${JSON.stringify(data).length} bytes\nTemplate: ${template}\n\n*Full AI analysis requires API configuration.*`;
    }

    try {
      const prompt = `
        Generate an intelligence report using this template: ${template}
        
        Data:
        ${JSON.stringify(data, null, 2).substring(0, 3000)}
        
        Include:
        1. Executive summary
        2. Key findings
        3. Detailed analysis
        4. Recommendations
        5. Appendices
        
        Format as professional markdown.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      });

      return response.choices[0].message.content || '';
    } catch {
      return `# Intelligence Report\n\nAnalysis failed. Please check API configuration.`;
    }
  }

  async correlateIOCs(iocs: string[]): Promise<{
    clusters: any[];
    threatActors: string[];
    campaigns: string[];
    confidence: number;
  }> {
    if (!this.available) {
      return { clusters: [], threatActors: [], campaigns: [], confidence: 0 };
    }

    try {
      const prompt = `
        Correlate the following indicators of compromise (IOCs):
        ${JSON.stringify(iocs.slice(0, 50))}
        
        Identify:
        1. Clusters of related IOCs
        2. Possible threat actors
        3. Associated campaigns
        4. Confidence in correlation
        
        Return as JSON with fields: clusters, threatActors, campaigns, confidence.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return { clusters: [], threatActors: [], campaigns: [], confidence: 0 };
    }
  }

  private mockPatternAnalysis(data: any[]): any {
    return {
      patterns: [],
      temporalCorrelations: [],
      geographicClusters: [],
      threatIndicators: [],
      summary: `Analyzed ${data.length} data points. AI analysis requires OpenAI API key.`,
      confidence: 0
    };
  }

  private mockThreatClassification(description: string): {
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    indicators: string[];
  } {
    const keywords = description.toLowerCase();
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let category = 'unknown';

    if (keywords.includes('ransomware') || keywords.includes('critical')) {
      severity = 'critical';
      category = 'ransomware';
    } else if (keywords.includes('malware') || keywords.includes('exploit')) {
      severity = 'high';
      category = 'malware';
    } else if (keywords.includes('phishing') || keywords.includes('fraud')) {
      severity = 'medium';
      category = 'phishing';
    }

    return { category, severity, confidence: 0.5, indicators: [] };
  }

  private mockAnomalyDetection(nodes: GraphNode[], relationships: GraphRelationship[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const highDegreeNodes = nodes.filter(node => {
      const degree = relationships.filter(r => r.source === node.id || r.target === node.id).length;
      return degree > 5;
    });

    if (highDegreeNodes.length > 0) {
      anomalies.push({
        type: 'high_centrality',
        description: `${highDegreeNodes.length} node(s) with unusually high connection degree`,
        nodes: highDegreeNodes.map(n => n.id),
        relationships: [],
        score: 0.7,
        severity: 'medium'
      });
    }

    return anomalies;
  }
}

export default AICorrelationService;
