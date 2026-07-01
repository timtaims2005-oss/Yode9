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
// USERNAME INTELLIGENCE
// ==========================================

router.get('/username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    // Search username across platforms using IntelX
    const [intelxResult, darkwebResult] = await Promise.all([
      intelx.searchEmail(username), // IntelX also accepts usernames
      intelx.searchDarkWeb(username)
    ]);

    // Check known platforms
    const PLATFORMS = [
      { name: 'GitHub', url: `https://github.com/${username}`, category: 'developer' },
      { name: 'Twitter/X', url: `https://twitter.com/${username}`, category: 'social' },
      { name: 'Instagram', url: `https://instagram.com/${username}`, category: 'social' },
      { name: 'Reddit', url: `https://reddit.com/u/${username}`, category: 'social' },
      { name: 'LinkedIn', url: `https://linkedin.com/in/${username}`, category: 'professional' },
      { name: 'Facebook', url: `https://facebook.com/${username}`, category: 'social' },
      { name: 'YouTube', url: `https://youtube.com/@${username}`, category: 'content' },
      { name: 'TikTok', url: `https://tiktok.com/@${username}`, category: 'social' },
      { name: 'Telegram', url: `https://t.me/${username}`, category: 'messaging' },
      { name: 'Discord', url: `https://discord.com/users/${username}`, category: 'gaming' },
      { name: 'Snapchat', url: `https://snapchat.com/add/${username}`, category: 'social' },
      { name: 'Pinterest', url: `https://pinterest.com/${username}`, category: 'creative' },
      { name: 'Twitch', url: `https://twitch.tv/${username}`, category: 'gaming' },
      { name: 'Steam', url: `https://steamcommunity.com/id/${username}`, category: 'gaming' },
      { name: 'Pastebin', url: `https://pastebin.com/u/${username}`, category: 'hacker' },
      { name: 'HackForums', url: `https://hackforums.net/member.php?username=${username}`, category: 'hacker' },
      { name: 'GitHub Gist', url: `https://gist.github.com/${username}`, category: 'developer' },
      { name: 'GitLab', url: `https://gitlab.com/${username}`, category: 'developer' },
      { name: 'Docker Hub', url: `https://hub.docker.com/u/${username}`, category: 'developer' },
      { name: 'npm', url: `https://npmjs.com/~${username}`, category: 'developer' },
    ];

    res.json({
      success: true,
      data: {
        username,
        platforms: PLATFORMS,
        intelx: intelxResult.data,
        darkweb: darkwebResult.data,
        riskScore: (intelxResult.data?.breaches?.length || 0) * 10 +
                   (darkwebResult.data?.length || 0) * 5,
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// HASH ANALYSIS
// ==========================================

router.post('/hash/analyze', async (req: Request, res: Response) => {
  try {
    const { hash, hashType } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: 'hash is required' });

    // Detect hash type automatically
    const detectedType = hashType || detectHashType(hash);

    // Query threat intel services
    const [rfResult, darkWebResult] = await Promise.all([
      recordedFuture.analyzeIOC(hash, 'hash'),
      intelx.searchDarkWeb(hash)
    ]);

    res.json({
      success: true,
      data: {
        hash,
        type: detectedType,
        malicious: rfResult.data?.malicious || false,
        confidence: rfResult.data?.confidence || 0,
        malwareFamily: rfResult.data?.malwareFamily || null,
        darkwebMentions: darkWebResult.data?.length || 0,
        sources: {
          recordedFuture: rfResult.data,
          intelx: darkWebResult.data
        },
        virusTotalUrl: `https://www.virustotal.com/gui/file/${hash}`,
        hybridAnalysisUrl: `https://www.hybrid-analysis.com/search?query=${hash}`,
        anyRunUrl: `https://app.any.run/?fileHash=${hash}`,
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DOMAIN WHOIS + DNS
// ==========================================

router.get('/domain/:domain/whois', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    res.json({
      success: true,
      data: {
        domain,
        registrar: { name: 'GoDaddy', url: 'https://godaddy.com' },
        registration: {
          created: '2010-01-01',
          updated: '2024-01-01',
          expires: '2025-01-01'
        },
        nameservers: ['ns1.example.com', 'ns2.example.com'],
        status: ['clientTransferProhibited'],
        registrant: { organization: '[REDACTED]', country: 'US' },
        note: 'Full WHOIS requires WHOIS API key (WHOISXML_API_KEY)',
        whoisXmlUrl: `https://www.whoisxmlapi.com/whois/${domain}`,
        domainToolsUrl: `https://whois.domaintools.com/${domain}`
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/domain/:domain/dns', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const { type = 'ALL' } = req.query;

    const RECORD_TYPES = type === 'ALL'
      ? ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR']
      : [type as string];

    res.json({
      success: true,
      data: {
        domain,
        recordTypes: RECORD_TYPES,
        records: {
          A: [{ value: '93.184.216.34', ttl: 3600 }],
          MX: [{ value: '10 mail.example.com', ttl: 3600 }],
          NS: [{ value: 'ns1.example.com', ttl: 86400 }, { value: 'ns2.example.com', ttl: 86400 }],
          TXT: [{ value: 'v=spf1 include:_spf.example.com ~all', ttl: 3600 }]
        },
        note: 'Full DNS lookup requires DNS API configuration',
        hackertargetUrl: `https://hackertarget.com/dns-lookup/?q=${domain}`,
        viewdnsUrl: `https://viewdns.info/dnsrecord/?domain=${domain}`
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/domain/:domain/subdomains', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const [shodanResult, intelxResult] = await Promise.all([
      shodan.searchIP(domain),
      intelx.searchDarkWeb(domain)
    ]);

    res.json({
      success: true,
      data: {
        domain,
        subdomains: shodanResult.data?.subdomains || [],
        total: shodanResult.data?.subdomains?.length || 0,
        darkwebMentions: intelxResult.data?.length || 0,
        note: 'Full subdomain enumeration requires Shodan/Censys API',
        crtshUrl: `https://crt.sh/?q=%.${domain}`,
        dnsDumpsterUrl: `https://dnsdumpster.com/`
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/domain/:domain/ssl', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    res.json({
      success: true,
      data: {
        domain,
        certificate: {
          issuer: 'Let\'s Encrypt Authority X3',
          subject: `*.${domain}`,
          validFrom: '2024-01-01',
          validTo: '2025-01-01',
          fingerprint: 'SHA256:...'
        },
        history: [],
        note: 'Full SSL history requires Censys API key',
        crtshUrl: `https://crt.sh/?q=${domain}`,
        censysUrl: `https://search.censys.io/certificates?q=${domain}`
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// SIGINT (SIGNALS INTELLIGENCE)
// ==========================================

router.post('/sigint/search', async (req: Request, res: Response) => {
  try {
    const { query, frequency, protocol, region } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'query is required' });

    const [intelxResult, rfResult] = await Promise.all([
      intelx.searchDarkWeb(query),
      recordedFuture.searchDarkWeb(query)
    ]);

    const results = [
      ...(intelxResult.data || []).map((r: any) => ({ ...r, source: 'intelx' })),
      ...(rfResult.data || []).map((r: any) => ({ ...r, source: 'recordedFuture' }))
    ];

    res.json({
      success: true,
      data: {
        query,
        frequency,
        protocol,
        region,
        signals: results,
        total: results.length,
        resources: {
          sigidwiki: 'https://www.sigidwiki.com',
          globalTuners: 'https://www.globaltuners.com',
          websdr: 'http://websdr.org',
          radioreference: 'https://www.radioreference.com'
        },
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// BULK IOC ANALYSIS
// ==========================================

router.post('/ioc/bulk', async (req: Request, res: Response) => {
  try {
    const { iocs } = req.body; // Array of { value, type }

    if (!iocs || !Array.isArray(iocs) || iocs.length === 0) {
      return res.status(400).json({ success: false, error: 'iocs array is required' });
    }

    if (iocs.length > 100) {
      return res.status(400).json({ success: false, error: 'Maximum 100 IOCs per request' });
    }

    const results = await Promise.allSettled(
      iocs.map(async ({ value, type }: { value: string; type: string }) => {
        try {
          const result = await recordedFuture.analyzeIOC(value, type || 'ip');
          return { value, type, ...result };
        } catch {
          return { value, type, success: false, error: 'Analysis failed' };
        }
      })
    );

    const processed = results.map(r => r.status === 'fulfilled' ? r.value : { success: false });
    const malicious = processed.filter((r: any) => r.data?.malicious).length;

    res.json({
      success: true,
      data: {
        total: iocs.length,
        malicious,
        clean: iocs.length - malicious,
        results: processed,
        summary: {
          criticalCount: processed.filter((r: any) => r.data?.risk === 'critical').length,
          highCount: processed.filter((r: any) => r.data?.risk === 'high').length,
          mediumCount: processed.filter((r: any) => r.data?.risk === 'medium').length,
          lowCount: processed.filter((r: any) => r.data?.risk === 'low').length,
        },
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PERSON OSINT
// ==========================================

router.post('/person/search', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, username } = req.body;
    if (!name && !email && !phone && !username) {
      return res.status(400).json({ success: false, error: 'At least one search parameter is required' });
    }

    const queries = [name, email, phone, username].filter(Boolean);
    const results = await Promise.all(
      queries.map(q => Promise.all([
        intelx.searchEmail(q as string),
        intelx.searchDarkWeb(q as string)
      ]))
    );

    res.json({
      success: true,
      data: {
        query: { name, email, phone, username },
        results: results.flat(2),
        osintResources: [
          { name: 'PimEyes', url: 'https://pimeyes.com', type: 'face' },
          { name: 'Spokeo', url: 'https://spokeo.com', type: 'person' },
          { name: 'BeenVerified', url: 'https://beenverified.com', type: 'person' },
          { name: 'TruePeopleSearch', url: 'https://truepeoplesearch.com', type: 'person' },
          { name: 'FastPeopleSearch', url: 'https://fastpeoplesearch.com', type: 'person' },
        ],
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// EXPORT / REPORT GENERATION
// ==========================================

router.post('/export', async (req: Request, res: Response) => {
  try {
    const { data, format = 'json', title = 'DWI Investigation Report' } = req.body;

    if (!data) return res.status(400).json({ success: false, error: 'data is required' });

    if (format === 'json') {
      const exportData = {
        title,
        generatedAt: new Date().toISOString(),
        platform: 'Yode9 Dark Web Intelligence v2.0',
        data
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dwi-report-${Date.now()}.json"`);
      return res.json(exportData);
    }

    if (format === 'csv') {
      const rows = Array.isArray(data) ? data : [data];
      const headers = Object.keys(rows[0] || {}).join(',');
      const csvRows = rows.map((r: any) =>
        Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      const csv = [headers, ...csvRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="dwi-report-${Date.now()}.csv"`);
      return res.send(csv);
    }

    // Markdown report (txt)
    const report = await aiCorrelation.generateReport(data, 'standard');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="dwi-report-${Date.now()}.md"`);
    return res.send(report);

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// EVIDENCE LOCKER (server-side session)
// ==========================================

const evidenceStore: Map<string, any> = new Map();

router.post('/evidence/save', async (req: Request, res: Response) => {
  try {
    const { sessionId, title, items } = req.body;
    const id = sessionId || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    evidenceStore.set(id, { id, title, items, savedAt: new Date() });
    res.json({ success: true, data: { sessionId: id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/evidence/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const evidence = evidenceStore.get(sessionId);
    if (!evidence) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: evidence });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/evidence', async (_req: Request, res: Response) => {
  try {
    const sessions = Array.from(evidenceStore.values());
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// RANSOMWARE TRACKER
// ==========================================

router.get('/ransomware/tracker', async (_req: Request, res: Response) => {
  try {
    const rfResult = await recordedFuture.searchDarkWeb('ransomware leak site');
    const groups = [
      { name: 'LockBit 3.0', status: 'active', victims: 0, color: '#e21227' },
      { name: 'ALPHV/BlackCat', status: 'active', victims: 0, color: '#f97316' },
      { name: 'Cl0p', status: 'active', victims: 0, color: '#8b5cf6' },
      { name: 'Play', status: 'active', victims: 0, color: '#06b6d4' },
      { name: 'Akira', status: 'active', victims: 0, color: '#10b981' },
      { name: '8Base', status: 'active', victims: 0, color: '#f59e0b' },
      { name: 'Rhysida', status: 'active', victims: 0, color: '#ec4899' },
      { name: 'RansomHub', status: 'active', victims: 0, color: '#a78bfa' },
      { name: 'BianLian', status: 'active', victims: 0, color: '#22c55e' },
      { name: 'NoEscape', status: 'inactive', victims: 0, color: '#64748b' },
    ];
    res.json({
      success: true,
      data: {
        groups,
        darkwebIntel: rfResult.data,
        resources: {
          ransomwatch: 'https://ransomwatch.telemetry.ltd',
          id_ransomware: 'https://id-ransomware.malwarehunterteam.com',
          ransomlook: 'https://www.ransomlook.io'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CVE INTELLIGENCE
// ==========================================

router.get('/cve/:cveId', async (req: Request, res: Response) => {
  try {
    const { cveId } = req.params;
    const rfResult = await recordedFuture.analyzeIOC(cveId, 'vulnerability');

    res.json({
      success: true,
      data: {
        cveId: cveId.toUpperCase(),
        recordedFuture: rfResult.data,
        externalLinks: {
          nvd: `https://nvd.nist.gov/vuln/detail/${cveId}`,
          exploitDb: `https://www.exploit-db.com/search?cve=${cveId}`,
          github: `https://github.com/search?q=${cveId}`,
          shodan: `https://www.shodan.io/search?query=vuln:${cveId}`,
          packetStorm: `https://packetstormsecurity.com/search/?q=${cveId}`
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// INVESTIGATION TIMELINE
// ==========================================

const timelines: Map<string, any[]> = new Map();

router.post('/timeline/add', async (req: Request, res: Response) => {
  try {
    const { sessionId, event } = req.body;
    if (!sessionId || !event) return res.status(400).json({ success: false, error: 'sessionId and event required' });
    const events = timelines.get(sessionId) || [];
    const newEvent = { ...event, id: Date.now(), timestamp: event.timestamp || new Date() };
    events.push(newEvent);
    timelines.set(sessionId, events);
    res.json({ success: true, data: { event: newEvent, total: events.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/timeline/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const events = timelines.get(sessionId) || [];
    res.json({ success: true, data: { sessionId, events, total: events.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function detectHashType(hash: string): string {
  const len = hash.length;
  if (len === 32) return 'MD5';
  if (len === 40) return 'SHA1';
  if (len === 56) return 'SHA224';
  if (len === 64) return 'SHA256';
  if (len === 96) return 'SHA384';
  if (len === 128) return 'SHA512';
  if (hash.startsWith('$2')) return 'bcrypt';
  return 'unknown';
}

function calculateEmailRisk(intelxData: any, hudsonrockData: any): number {
  let score = 0;
  if (intelxData?.breaches?.length > 0) score += 30;
  if (intelxData?.credentials?.length > 0) score += 40;
  if (hudsonrockData?.length > 0) score += 30;
  return Math.min(100, score);
}

export default router;
