/**
 * AI Tools API Routes for Yode9 / MR7.AI
 * ========================================
 * نقاط النهاية للأدوات الجديدة
 */

import { Router, type Request, type Response } from 'express';
import { AI_PROVIDERS, getAvailableProviders } from '../../lib/ai-providers.js';
import { AISecurityGuard, validateAIRequest } from '../../lib/ai-security-guard.js';
import { globalAICache } from '../../lib/ai-cache.js';
import { AIStreamingOptimizer } from '../../lib/ai-streaming.js';

const router = Router();

router.get('/providers', (_req: Request, res: Response) => {
  try {
    const availableProviders = getAvailableProviders();
    const providers = Object.entries(AI_PROVIDERS).map(([id, config]) => ({
      id,
      name: config.name,
      models: config.models,
      streaming: config.streaming,
      available: availableProviders.includes(id as keyof typeof AI_PROVIDERS),
    }));

    res.json({
      providers,
      count: providers.length,
      available: availableProviders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.post('/scan', (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message?: string };

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = AISecurityGuard.scanInput(message);

    return res.json({
      isSafe: result.isSafe,
      riskScore: result.riskScore,
      threatCount: result.threats.length,
      threats: result.threats,
      sanitized: result.sanitized,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Scan failed' });
  }
});

router.post('/validate', (req: Request, res: Response) => {
  try {
    const options = req.body as {
      message?: string;
      model?: string;
      provider?: string;
      temperature?: number;
      maxTokens?: number;
    };

    const result = validateAIRequest({
      message: options.message ?? '',
      model: options.model ?? '',
      provider: options.provider ?? '',
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    return res.json({
      valid: result.valid,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Validation failed' });
  }
});

router.get('/cache/stats', (_req: Request, res: Response) => {
  try {
    const stats = globalAICache.getStats();
    res.json({
      ...stats,
      hitRatePercent: Math.round(stats.hitRate * 100),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

router.delete('/cache', (_req: Request, res: Response) => {
  try {
    globalAICache.clear();
    res.json({ message: 'Cache cleared successfully', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

router.post('/sanitize-output', (req: Request, res: Response) => {
  try {
    const { output } = req.body as { output?: string };

    if (!output) {
      return res.status(400).json({ error: 'Output is required' });
    }

    const result = AISecurityGuard.validateOutput(output);

    return res.json({
      isValid: result.isValid,
      sanitized: result.sanitized,
      wasModified: result.sanitized !== output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Sanitization failed' });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  const availableProviders = getAvailableProviders();
  const cacheStats = globalAICache.getStats();

  res.json({
    status: 'healthy',
    version: '1.0.0',
    providers: {
      total: Object.keys(AI_PROVIDERS).length,
      available: availableProviders.length,
      list: availableProviders,
    },
    cache: {
      size: cacheStats.size,
      hitRate: Math.round(cacheStats.hitRate * 100) + '%',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
