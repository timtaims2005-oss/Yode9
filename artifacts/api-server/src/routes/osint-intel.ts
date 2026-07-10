import { Router, Request, Response } from 'express';
import { validators } from '../utils/validators.js';
import { formatters } from '../utils/formatters.js';
import { withCache, globalCache } from '../utils/cache-manager.js';
import CensysService from '../services/censys-service.js';
import VirusTotalService from '../services/virustotal-service.js';
import GreyNoiseService from '../services/greynoise-service.js';
import URLScanService from '../services/urlscan-service.js';
import SpyCloudService from '../services/spycloud-service.js';
import FlashpointService from '../services/flashpoint-service.js';
import AnomaliService from '../services/anomali-service.js';
import BinaryEdgeService from '../services/binaryedge-service.js';
import OnypheService from '../services/onyphe-service.js';
import KelaService from '../services/kela-service.js';
import TelegramMonitor from '../integrations/telegram-monitor.js';
import PasteMonitor from '../integrations/paste-monitor.js';
import BlockchainAnalyzer from '../integrations/blockchain-analyzer.js';
import { ElasticsearchClient } from '../integrations/elasticsearch-client.js';

const router = Router();

// Service singletons
const censys = new CensysService(process.env.CENSYS_API_ID, process.env.CENSYS_API_SECRET);
const virustotal = new VirusTotalService(process.env.VT_API_KEY);
const greynoise = new GreyNoiseService(process.env.GREYNOISE_API_KEY);
const urlscan = new URLScanService(process.env.URLSCAN_API_KEY);
const spycloud = new SpyCloudService(process.env.SPYCLOUD_API_KEY);
const flashpoint = new FlashpointService(process.env.FLASHPOINT_API_KEY);
const anomali = new AnomaliService(process.env.ANOMALI_API_KEY, process.env.ANOMALI_USERNAME);
const binaryedge = new BinaryEdgeService(process.env.BINARYEDGE_API_KEY);
const onyphe = new OnypheService(process.env.ONYPHE_API_KEY);
const kela = new KelaService(process.env.KELA_API_KEY);
const telegram = new TelegramMonitor(process.env.TELEGRAM_BOT_TOKEN);
const paste = new PasteMonitor(process.env.PASTEBIN_API_KEY);
const blockchain = new BlockchainAnalyzer();
const esClient = new ElasticsearchClient();

// ==========================================
// SERVICE STATUS
// ==========================================
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      services: {
        censys: !!process.env.CENSYS_API_ID,
        virustotal: !!process.env.VT_API_KEY,
        greynoise: !!process.env.GREYNOISE_API_KEY,
        urlscan: !!process.env.URLSCAN_API_KEY,
        spycloud: !!process.env.SPYCLOUD_API_KEY,
        flashpoint: !!process.env.FLASHPOINT_API_KEY,
        anomali: !!process.env.ANOMALI_API_KEY,
        binaryedge: !!process.env.BINARYEDGE_API_KEY,
        onyphe: !!process.env.ONYPHE_API_KEY,
        kela: !!process.env.KELA_API_KEY,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
        elasticsearch: esClient.isAvailable()
      },
      cache: globalCache.stats(),
      version: '3.0.0-military',
      timestamp: new Date()
    }
  });
});

// ==========================================
// UNIFIED TYPE DETECT
// ==========================================
router.get('/detect', (req: Request, res: Response): void => {
  const { q } = req.query as { q?: string };
  if (!q) { res.status(400).json({ success: false, error: 'Query required' }); return; }
  const sanitized = validators.sanitize(q);
  const type = validators.detectType(sanitized);
  res.json({ success: true, data: { value: sanitized, type, timestamp: new Date() } });
});

// ==========================================
// IP INTELLIGENCE (multi-source)
// ==========================================
router.get('/ip/:ip', async (req: Request, res: Response): Promise<void> => {
  const { ip } = req.params;
  if (!validators.isIP(ip)) { res.status(400).json({ success: false, error: 'Invalid IP address' }); return; }
  const cacheKey = `ip:${ip}`;
  try {
    const result = await withCache(cacheKey, async () => {
      const [gn, be, vt, onypheRes] = await Promise.allSettled([
        greynoise.analyzeIP(ip),
        binaryedge.queryIP(ip),
        virustotal.analyzeIP(ip),
        onyphe.queryIP(ip)
      ]);
      const gnData = gn.status === 'fulfilled' ? gn.value : null;
      const beData = be.status === 'fulfilled' ? be.value : null;
      const vtData = vt.status === 'fulfilled' ? vt.value : null;
      const onypheData = onypheRes.status === 'fulfilled' ? onypheRes.value : null;
      const riskScore = calculateIPRisk(gnData?.data, vtData?.data);
      return {
        ip,
        type: validators.isIPv4(ip) ? 'ipv4' : 'ipv6',
        riskScore,
        riskLevel: formatters.score(riskScore),
        sources: {
          greynoise: gnData?.data || null,
          binaryedge: beData?.data || null,
          virustotal: vtData?.data || null,
          onyphe: onypheData?.data || null
        },
        timestamp: new Date()
      };
    }, 600);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// DOMAIN INTELLIGENCE (multi-source)
// ==========================================
router.get('/domain/:domain', async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.params;
  if (!validators.isDomain(domain)) { res.status(400).json({ success: false, error: 'Invalid domain' }); return; }
  const cacheKey = `domain:${domain}`;
  try {
    const result = await withCache(cacheKey, async () => {
      const [vtRes, censysRes, beRes, urlRes] = await Promise.allSettled([
        virustotal.analyzeDomain(domain),
        censys.getDomainReport(domain),
        binaryedge.getDomainSubdomains(domain),
        urlscan.searchScans(`domain:${domain}`, 20)
      ]);
      return {
        domain,
        sources: {
          virustotal: vtRes.status === 'fulfilled' ? vtRes.value.data : null,
          censys: censysRes.status === 'fulfilled' ? censysRes.value.data : null,
          binaryedge: beRes.status === 'fulfilled' ? beRes.value.data : null,
          urlscan: urlRes.status === 'fulfilled' ? urlRes.value.data : null
        },
        timestamp: new Date()
      };
    }, 600);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// HASH INTELLIGENCE
// ==========================================
router.get('/hash/:hash', async (req: Request, res: Response): Promise<void> => {
  const { hash } = req.params;
  const hashType = validators.isHash(hash);
  if (!hashType) { res.status(400).json({ success: false, error: 'Invalid hash format' }); return; }
  try {
    const result = await withCache(`hash:${hash}`, async () => {
      const vt = await virustotal.analyzeHash(hash);
      return { hash, hashType, virustotal: vt.data, timestamp: new Date() };
    }, 3600);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// URL INTELLIGENCE
// ==========================================
router.get('/url', async (req: Request, res: Response): Promise<void> => {
  const { u } = req.query as { u?: string };
  if (!u) { res.status(400).json({ success: false, error: 'URL required' }); return; }
  try {
    const [vtRes, scanRes] = await Promise.allSettled([
      virustotal.analyzeURL(u),
      urlscan.scanURL(u, 'private')
    ]);
    res.json({
      success: true,
      data: {
        url: u,
        virustotal: vtRes.status === 'fulfilled' ? vtRes.value.data : null,
        urlscan: scanRes.status === 'fulfilled' ? scanRes.value.data : null,
        timestamp: new Date()
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// CREDENTIAL LEAK SEARCH
// ==========================================
router.post('/credentials', async (req: Request, res: Response): Promise<void> => {
  const { email, domain } = req.body;
  try {
    const results: any = { sources: {} };
    if (email && validators.isEmail(email)) {
      const [sc, be] = await Promise.allSettled([
        spycloud.lookupEmail(email),
        binaryedge.getDataLeaks(email)
      ]);
      results.sources.spycloud = sc.status === 'fulfilled' ? sc.value.data : null;
      results.sources.binaryedge = sc.status === 'fulfilled' ? be.value : null;
      results.email = formatters.maskEmail(email);
    }
    if (domain && validators.isDomain(domain)) {
      const sc = await spycloud.lookupDomain(domain);
      results.sources.spycloud_domain = sc.data;
      results.domain = domain;
    }
    results.timestamp = new Date();
    res.json({ success: true, data: results });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// DARK WEB MENTION SEARCH (Kela + Flashpoint)
// ==========================================
router.post('/darkweb/mentions', async (req: Request, res: Response): Promise<void> => {
  const { keyword, from, to } = req.body;
  if (!keyword) { res.status(400).json({ success: false, error: 'Keyword required' }); return; }
  try {
    const [kelaRes, fpRes] = await Promise.allSettled([
      kela.searchDarkWebMentions(keyword, from, to),
      flashpoint.searchEvents(keyword)
    ]);
    res.json({
      success: true,
      data: {
        keyword,
        kela: kelaRes.status === 'fulfilled' ? kelaRes.value.data : null,
        flashpoint: fpRes.status === 'fulfilled' ? fpRes.value.data : null,
        timestamp: new Date()
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// TELEGRAM MONITORING
// ==========================================
router.post('/telegram/monitor', async (req: Request, res: Response): Promise<void> => {
  const { keywords = [], channels } = req.body;
  try {
    const posts = await telegram.searchByKeywords(keywords, channels);
    res.json({ success: true, data: { posts, total: posts.length, timestamp: new Date() } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/telegram/channel/:username', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;
  const { keywords } = req.query as { keywords?: string };
  try {
    const kws = keywords ? keywords.split(',').map(k => k.trim()) : [];
    const posts = await telegram.monitorPublicChannel(username, kws, 50);
    res.json({ success: true, data: { channel: username, posts, total: posts.length, timestamp: new Date() } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// PASTE SITE MONITORING
// ==========================================
router.post('/paste/monitor', async (req: Request, res: Response): Promise<void> => {
  const { keywords = [] } = req.body;
  try {
    const results = await paste.searchAllPastes(keywords);
    res.json({ success: true, data: { results, total: results.length, timestamp: new Date() } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// BLOCKCHAIN ANALYSIS
// ==========================================
router.get('/blockchain/:address', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.params;
  const { chain = 'bitcoin' } = req.query as { chain?: 'bitcoin' | 'ethereum' };
  try {
    const [node, txs] = await Promise.all([
      blockchain.analyzeAddress(address, chain),
      blockchain.getTransactions(address, chain as 'bitcoin' | 'ethereum', 50)
    ]);
    const warnings = blockchain.detectSuspiciousPatterns({ nodes: [node], edges: txs, totalVolume: txs.reduce((s, t) => s + t.amount, 0), analysisDepth: 1 });
    res.json({
      success: true,
      data: { address, chain, node, transactions: txs, warnings, timestamp: new Date() }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/blockchain/trace', async (req: Request, res: Response): Promise<void> => {
  const { address, depth = 2, chain = 'bitcoin' } = req.body;
  if (!address) { res.status(400).json({ success: false, error: 'Address required' }); return; }
  try {
    const graph = await blockchain.traceGraph(address, Math.min(depth, 3), chain);
    const warnings = blockchain.detectSuspiciousPatterns(graph);
    res.json({ success: true, data: { ...graph, warnings, timestamp: new Date() } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// THREAT INTELLIGENCE (Anomali + Flashpoint + Kela)
// ==========================================
router.get('/threat/ioc', async (req: Request, res: Response): Promise<void> => {
  const { value, type } = req.query as { value?: string; type?: string };
  if (!value) { res.status(400).json({ success: false, error: 'Value required' }); return; }
  try {
    const detectedType = type || validators.detectType(value);
    const [anomaliRes, fpRes] = await Promise.allSettled([
      anomali.searchIndicators(value, detectedType !== 'keyword' ? detectedType : undefined),
      flashpoint.searchEvents(value, 20)
    ]);
    res.json({
      success: true,
      data: {
        value,
        detectedType,
        anomali: anomaliRes.status === 'fulfilled' ? anomaliRes.value.data : null,
        flashpoint: fpRes.status === 'fulfilled' ? fpRes.value.data : null,
        timestamp: new Date()
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/threat/ransomware', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await withCache('ransomware:activity', () => kela.getRansomwareActivity(100), 1800);
    res.json({ success: true, data: result.data || result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/threat/actors', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [kelaRes, anomaliRes] = await Promise.allSettled([
      withCache('threat:actors:kela', () => kela.getThreatActors(), 3600),
      withCache('threat:actors:anomali', () => anomali.getActors(), 3600)
    ]);
    res.json({
      success: true,
      data: {
        kela: kelaRes.status === 'fulfilled' ? (kelaRes.value as any).data : null,
        anomali: anomaliRes.status === 'fulfilled' ? (anomaliRes.value as any).data : null,
        timestamp: new Date()
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// CENSYS SEARCH
// ==========================================
router.post('/censys/search', async (req: Request, res: Response): Promise<void> => {
  const { query, page = 1 } = req.body;
  if (!query) { res.status(400).json({ success: false, error: 'Query required' }); return; }
  try {
    const result = await censys.searchHosts(query, page);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// ELASTICSEARCH SEARCH
// ==========================================
router.post('/search/elastic', async (req: Request, res: Response): Promise<void> => {
  const { term, types } = req.body;
  if (!term) { res.status(400).json({ success: false, error: 'Search term required' }); return; }
  try {
    const result = await esClient.searchOSINT(term, types);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// UNIFIED MULTI-SOURCE SEARCH
// ==========================================
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  const { query, sources = ['all'] } = req.body;
  if (!query) { res.status(400).json({ success: false, error: 'Query required' }); return; }
  const sanitized = validators.sanitize(query);
  const detectedType = validators.detectType(sanitized);
  const results: any = { query: sanitized, type: detectedType, sources: {}, timestamp: new Date() };
  try {
    const tasks: Promise<void>[] = [];
    const useAll = sources.includes('all');
    if (useAll || sources.includes('virustotal')) {
      tasks.push(virustotal.analyzeIP(sanitized).then(r => { results.sources.virustotal = r.data; }).catch(() => {}));
    }
    if ((useAll || sources.includes('greynoise')) && detectedType === 'ipv4') {
      tasks.push(greynoise.analyzeIP(sanitized).then(r => { results.sources.greynoise = r.data; }).catch(() => {}));
    }
    if ((useAll || sources.includes('binaryedge')) && detectedType === 'ipv4') {
      tasks.push(binaryedge.queryIP(sanitized).then(r => { results.sources.binaryedge = r.data; }).catch(() => {}));
    }
    if ((useAll || sources.includes('spycloud')) && detectedType === 'email') {
      tasks.push(spycloud.lookupEmail(sanitized).then(r => { results.sources.spycloud = r.data; }).catch(() => {}));
    }
    if ((useAll || sources.includes('anomali'))) {
      tasks.push(anomali.searchIndicators(sanitized).then(r => { results.sources.anomali = r.data; }).catch(() => {}));
    }
    await Promise.all(tasks);
    res.json({ success: true, data: results });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==========================================
// UTILITY
// ==========================================
function calculateIPRisk(gnData: any, vtData: any): number {
  let score = 0;
  if (gnData?.classification === 'malicious') score += 50;
  if (gnData?.noise) score += 20;
  if (vtData?.last_analysis_stats?.malicious > 0) score += Math.min(30, vtData.last_analysis_stats.malicious * 3);
  return Math.min(100, score);
}

export { router as osintIntelRouter };
export default router;
