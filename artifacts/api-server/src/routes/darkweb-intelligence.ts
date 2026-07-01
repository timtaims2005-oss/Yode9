import { Router, Request, Response } from 'express';
import IntelXService from '../services/intelx-service.js';
import ShodanService from '../services/shodan-service.js';
import HudsonRockService from '../services/hudsonrock-service.js';
import RecordedFutureService from '../services/recorded-future-service.js';
import ChainalysisService from '../services/chainalysis-service.js';
import Neo4jService from '../services/neo4j-service.js';
import TorScraper from '../integrations/tor-scraper.js';
import AICorrelationService from '../integrations/ai-correlation.js';

const router = Router();

// Initialize services (gracefully - no API key required for basic operation)
const intelx = new IntelXService(process.env.INTELX_API_KEY || '');
const shodan = new ShodanService(process.env.SHODAN_API_KEY || '');
const hudsonrock = new HudsonRockService(process.env.HUDSONROCK_API_KEY || '');
const recordedFuture = new RecordedFutureService(process.env.RF_API_KEY || '');
const chainalysis = new ChainalysisService(process.env.CHAINALYSIS_API_KEY || '');
const neo4j = new Neo4jService(
  process.env.NEO4J_URI || '',
  process.env.NEO4J_USER || 'neo4j',
  process.env.NEO4J_PASSWORD || ''
);
const torScraper = new TorScraper();
const aiCorrelation = new AICorrelationService(process.env.OPENAI_API_KEY || '');

// ==========================================
// EMAIL INTELLIGENCE ROUTES
// ==========================================

router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const [intelxResult, hudsonrockResult] = await Promise.all([
      intelx.searchEmail(email),
      hudsonrock.searchEmail(email)
    ]);

    const aggregated = {
      email,
      sources: {
        intelx: intelxResult.data,
        hudsonrock: hudsonrockResult.data
      },
      breaches: [
        ...(intelxResult.data?.breaches || []),
        ...(hudsonrockResult.data?.map((c: any) => ({
          name: c.source,
          breachDate: c.dateCompromised
        })) || [])
      ],
      credentials: [
        ...(intelxResult.data?.credentials || []),
        ...(hudsonrockResult.data || [])
      ],
      riskScore: calculateEmailRisk(intelxResult.data, hudsonrockResult.data)
    };

    // Store in graph database
    await neo4j.importOSINTData({
      emails: [email],
      relationships: (aggregated.credentials || []).map((c: any) => ({
        source: email,
        target: c.source || 'unknown',
        type: 'COMPROMISED_IN',
        properties: { date: c.dateCompromised }
      }))
    });

    res.json({ success: true, data: aggregated });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// IP INTELLIGENCE ROUTES
// ==========================================

router.get('/ip/:ip', async (req: Request, res: Response) => {
  try {
    const { ip } = req.params;

    const [shodanResult] = await Promise.all([
      shodan.searchIP(ip)
    ]);

    const aggregated = {
      ip,
      network: shodanResult.data,
      reputation: { shodan: shodanResult.data?.reputation },
      threats: shodanResult.data?.malware,
      vulnerabilities: shodanResult.data?.vulnerabilities,
      openPorts: shodanResult.data?.openPorts,
      services: shodanResult.data?.services,
      location: shodanResult.data?.location
    };

    await neo4j.importOSINTData({
      ips: [ip],
      relationships: (shodanResult.data?.services || []).map((s: any) => ({
        source: ip,
        target: `${s.port}/${s.protocol}`,
        type: 'HAS_SERVICE',
        properties: { service: s.service, version: s.version }
      }))
    });

    res.json({ success: true, data: aggregated });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DOMAIN INTELLIGENCE ROUTES
// ==========================================

router.get('/domain/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    res.json({
      success: true,
      data: {
        domain,
        message: 'Domain intelligence requires additional API configuration',
        whois: null,
        dns: null,
        certificates: null
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DARK WEB SEARCH ROUTES
// ==========================================

router.post('/darkweb/search', async (req: Request, res: Response) => {
  try {
    const { query, sources = ['tor', 'telegram', 'paste'], options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const results: any[] = [];

    // Search via IntelX (covers Tor/dark web)
    if (sources.includes('tor') || sources.includes('darkweb')) {
      const torResults = await intelx.searchDarkWeb(query, options);
      if (torResults.success && torResults.data) {
        results.push(...torResults.data.map(r => ({ ...r, source: 'intelx_darkweb' })));
      }

      // Also search via Recorded Future
      const rfResults = await recordedFuture.searchDarkWeb(query);
      if (rfResults.success && rfResults.data) {
        results.push(...rfResults.data.map(r => ({ ...r, source: 'recorded_future' })));
      }
    }

    // Telegram monitoring
    if (sources.includes('telegram') && options.keywords?.length > 0) {
      const telegramResults = await intelx.monitorTelegram(query, options.keywords || [query]);
      if (telegramResults.success && telegramResults.data?.messages) {
        results.push(...telegramResults.data.messages.map((m: any) => ({ ...m, source: 'telegram' })));
      }
    }

    // Paste site monitoring
    if (sources.includes('paste')) {
      const pasteResults = await torScraper.monitorPasteSites(options.keywords || [query]);
      results.push(...pasteResults.map(r => ({ ...r, source: 'paste' })));
    }

    // AI analysis
    let analysis = null;
    if (results.length > 0) {
      analysis = await aiCorrelation.analyzePatterns(results);
    }

    res.json({
      success: true,
      data: {
        query,
        results,
        analysis,
        total: results.length,
        sources: sources,
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/darkweb/scrape', async (req: Request, res: Response) => {
  try {
    const { url, type = 'tor' } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    let result;
    switch (type) {
      case 'tor':
        result = await torScraper.scrapeOnionSite(url);
        break;
      case 'i2p':
        result = await torScraper.scrapeI2PSite(url);
        break;
      case 'freenet':
        result = await torScraper.scrapeFreenetSite(url);
        break;
      case 'zeronet':
        result = await torScraper.scrapeZeroNet(url);
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }

    res.json({ success: true, data: result });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/darkweb/monitor/telegram', async (req: Request, res: Response) => {
  try {
    const { channel, keywords = [] } = req.body;

    if (!channel) {
      return res.status(400).json({ success: false, error: 'Channel is required' });
    }

    const [intelxResult, scrapedResult] = await Promise.all([
      intelx.monitorTelegram(channel, keywords),
      torScraper.monitorTelegramChannel(channel, keywords)
    ]);

    const allMessages = [
      ...(intelxResult.data?.messages || []),
      ...scrapedResult
    ];

    res.json({
      success: true,
      data: {
        channel,
        keywords,
        messages: allMessages,
        total: allMessages.length
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/darkweb/monitor/paste', async (req: Request, res: Response) => {
  try {
    const { keywords = [] } = req.body;

    if (keywords.length === 0) {
      return res.status(400).json({ success: false, error: 'Keywords are required' });
    }

    const results = await torScraper.monitorPasteSites(keywords);

    res.json({
      success: true,
      data: { keywords, results, total: results.length }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// BLOCKCHAIN ROUTES
// ==========================================

router.get('/blockchain/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { chain = 'bitcoin' } = req.query;

    const result = await chainalysis.analyzeAddress(address, chain as string);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/blockchain/trace', async (req: Request, res: Response) => {
  try {
    const { sourceAddress, depth = 3, options = {} } = req.body;

    if (!sourceAddress) {
      return res.status(400).json({ success: false, error: 'sourceAddress is required' });
    }

    const result = await chainalysis.traceFunds(sourceAddress, depth, options);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/blockchain/tx/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    const { chain = 'bitcoin' } = req.query;

    const result = await chainalysis.trackTransaction(hash, chain as string);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/blockchain/monitor', async (req: Request, res: Response) => {
  try {
    const { addresses } = req.body;

    if (!addresses || addresses.length === 0) {
      return res.status(400).json({ success: false, error: 'addresses are required' });
    }

    const result = await chainalysis.createMonitor(addresses);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// THREAT INTELLIGENCE ROUTES
// ==========================================

router.get('/threat/ioc/:ioc', async (req: Request, res: Response) => {
  try {
    const { ioc } = req.params;
    const { type = 'ip' } = req.query;

    const result = await recordedFuture.analyzeIOC(ioc, type as string);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/threat/actor/:actor', async (req: Request, res: Response) => {
  try {
    const { actor } = req.params;

    const result = await recordedFuture.getThreatActor(actor);

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/threat/classify', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'description is required' });
    }

    const result = await aiCorrelation.classifyThreat(description);

    res.json({ success: true, data: result });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/threat/alert', async (req: Request, res: Response) => {
  try {
    const { name, query, severity, notify } = req.body;

    const result = await recordedFuture.createAlert({ name, query, severity, notify });

    res.json(result);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// NETWORK INTELLIGENCE ROUTES
// ==========================================

router.get('/network/scada', async (req: Request, res: Response) => {
  try {
    const result = await shodan.searchSCADA();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/network/webcams', async (req: Request, res: Response) => {
  try {
    const result = await shodan.searchWebcams();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/network/databases', async (req: Request, res: Response) => {
  try {
    const result = await shodan.searchDatabases();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/network/rdp', async (req: Request, res: Response) => {
  try {
    const result = await shodan.searchRDP();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/network/iot', async (req: Request, res: Response) => {
  try {
    const result = await shodan.searchIoT();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/network/monitor', async (req: Request, res: Response) => {
  try {
    const { query, callbackUrl = '' } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const result = await shodan.createMonitor(query, callbackUrl);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GRAPH ANALYSIS ROUTES
// ==========================================

router.get('/graph/correlate/:type/:value', async (req: Request, res: Response) => {
  try {
    const { type, value } = req.params;

    let result;
    switch (type) {
      case 'email':
        result = await neo4j.correlateEmail(value);
        break;
      case 'ip':
        result = await neo4j.correlateIP(value);
        break;
      case 'domain':
        result = await neo4j.correlateDomain(value);
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }

    const anomalies = await aiCorrelation.detectAnomalies(result.nodes, result.relationships);

    res.json({
      success: true,
      data: { ...result, anomalies }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/graph/paths', async (req: Request, res: Response) => {
  try {
    const { sourceId, targetId, maxDepth = 4 } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({ success: false, error: 'sourceId and targetId are required' });
    }

    const paths = await neo4j.findPaths(sourceId, targetId, maxDepth);

    res.json({ success: true, data: { paths, total: paths.length } });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/graph/query', async (req: Request, res: Response) => {
  try {
    const { cypher, parameters = {} } = req.body;

    if (!cypher) {
      return res.status(400).json({ success: false, error: 'cypher query is required' });
    }

    // Basic injection prevention
    const dangerousPatterns = ['DELETE', 'DROP', 'REMOVE', 'DETACH'];
    const upperCypher = cypher.toUpperCase();
    if (dangerousPatterns.some(p => upperCypher.includes(p))) {
      return res.status(403).json({ success: false, error: 'Destructive operations not allowed' });
    }

    const result = await neo4j.executeQuery(cypher, parameters);

    res.json({ success: true, data: result });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// AI ANALYSIS ROUTES
// ==========================================

router.post('/ai/analyze', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'data is required' });
    }

    const analysis = await aiCorrelation.analyzePatterns(Array.isArray(data) ? data : [data]);

    res.json({ success: true, data: analysis });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai/report', async (req: Request, res: Response) => {
  try {
    const { data, template = 'standard' } = req.body;

    const report = await aiCorrelation.generateReport(data, template);

    res.json({ success: true, data: { report, generatedAt: new Date() } });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const result = await aiCorrelation.processNaturalQuery(query);

    res.json({ success: true, data: result });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ai/predict', async (req: Request, res: Response) => {
  try {
    const { historicalData } = req.body;

    if (!historicalData) {
      return res.status(400).json({ success: false, error: 'historicalData is required' });
    }

    const predictions = await aiCorrelation.predictThreats(
      Array.isArray(historicalData) ? historicalData : [historicalData]
    );

    res.json({ success: true, data: predictions });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// UNIFIED SEARCH ROUTE
// ==========================================

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, types = ['email', 'ip', 'darkweb'], filters, enrichment = true } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const results: any[] = [];

    for (const type of types) {
      try {
        switch (type) {
          case 'email': {
            const emailResult = await intelx.searchEmail(query);
            if (emailResult.success) results.push({ type: 'email', data: emailResult.data });
            break;
          }
          case 'ip': {
            const ipResult = await shodan.searchIP(query);
            if (ipResult.success) results.push({ type: 'ip', data: ipResult.data });
            break;
          }
          case 'darkweb': {
            const dwResult = await intelx.searchDarkWeb(query);
            if (dwResult.success) results.push({ type: 'darkweb', data: dwResult.data });
            break;
          }
          case 'blockchain': {
            const bcResult = await chainalysis.analyzeAddress(query);
            if (bcResult.success) results.push({ type: 'blockchain', data: bcResult.data });
            break;
          }
          case 'threat': {
            const threatResult = await recordedFuture.searchDarkWeb(query);
            if (threatResult.success) results.push({ type: 'threat', data: threatResult.data });
            break;
          }
        }
      } catch {}
    }

    let analysis = null;
    if (enrichment && results.length > 0) {
      analysis = await aiCorrelation.analyzePatterns(results);
    }

    res.json({
      success: true,
      data: {
        query,
        results,
        analysis,
        total: results.length,
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// STATUS & HEALTH
// ==========================================

router.get('/status', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      services: {
        intelx: !!process.env.INTELX_API_KEY,
        shodan: !!process.env.SHODAN_API_KEY,
        hudsonrock: !!process.env.HUDSONROCK_API_KEY,
        recordedFuture: !!process.env.RF_API_KEY,
        chainalysis: !!process.env.CHAINALYSIS_API_KEY,
        neo4j: !!process.env.NEO4J_URI,
        openai: !!process.env.OPENAI_API_KEY
      },
      features: {
        darkWebSearch: true,
        blockchainTracking: true,
        threatIntelligence: true,
        networkIntelligence: true,
        emailIntelligence: true,
        aiCorrelation: !!process.env.OPENAI_API_KEY,
        graphAnalysis: !!process.env.NEO4J_URI,
        torScraping: true,
        telegramMonitoring: true,
        pasteMonitoring: true
      },
      version: '2.0.0-military',
      timestamp: new Date()
    }
  });
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function calculateEmailRisk(intelxData: any, hudsonrockData: any): number {
  let score = 0;
  if (intelxData?.breaches?.length > 0) score += 30;
  if (intelxData?.credentials?.length > 0) score += 40;
  if (hudsonrockData?.length > 0) score += 30;
  return Math.min(100, score);
}

export default router;
