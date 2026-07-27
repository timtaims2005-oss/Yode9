/**
 * Unified System Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * All endpoints here use req.unifiedAuth (populated by the Unified Auth
 * Framework middleware) for identity and access control.
 *
 * Mounted at: /api/system/*
 *
 * POST /api/system/ai/generate     — Unified AI inference
 * GET  /api/system/ai/stats        — AI orchestrator health
 * POST /api/system/sandbox/execute — Isolated code execution
 * POST /api/system/crypto/encrypt  — AES-256-GCM encrypt
 * POST /api/system/crypto/decrypt  — AES-256-GCM decrypt
 * POST /api/system/crypto/hash     — SHA3-256 credential hash
 * GET  /api/system/metrics         — Real-time system metrics
 * GET  /api/system/auth/whoami     — Inspect resolved auth context (debug)
 */

import { Router, type Request, type Response } from 'express';
import { globalAIOrchestrator } from '../../infrastructure/ai/AIOrchestrator.js';
import { globalSandbox } from '../../infrastructure/execution/FirecrackerSandbox.js';
import { getCryptoService } from '../../infrastructure/security/CryptoService.js';
import { metricsAggregator } from '../../infrastructure/observability/OpenTelemetryConfig.js';
import { logger } from '../../lib/logger.js';
import {
  requireUnifiedAuth,
  requireRole,
  requirePermission,
  requireTier,
  authSummary,
} from '../../middlewares/unifiedAuthMiddleware.js';
import type {
  ExecuteCodeDTO,
  InferenceRequestDTO,
  EncryptDTO,
  DecryptDTO,
} from '../../application/dto/index.js';

const router = Router();

// ── AI Orchestrator endpoints ─────────────────────────────────────────────────

/**
 * POST /api/system/ai/generate
 * Requires: authenticated + permission "ai.generate" (or wildcard)
 * Passes userId from unifiedAuth into the orchestrator for per-user tracking.
 */
router.post(
  '/ai/generate',
  requireUnifiedAuth,
  requirePermission('chat'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const body = req.body as InferenceRequestDTO;
      if (!body.prompt || typeof body.prompt !== 'string') {
        return res.status(400).json({ error: 'prompt is required' });
      }

      // Use the unified auth context for identity — works for all 5 strategies
      const authCtx = req.unifiedAuth;

      const result = await globalAIOrchestrator.generate({
        prompt:         body.prompt,
        systemPrompt:   body.systemPrompt,
        image:          body.image,
        expectedOutput: body.expectedOutput ?? 'text',
        maxTokens:      body.maxTokens,
        temperature:    body.temperature,
        priority:       body.priority ?? 'normal',
        userId:         authCtx.userId,
        conversationId: body.modelPreference,
        modelPreference:body.modelPreference,
      });

      metricsAggregator.recordRequest(Date.now() - startTime);
      return res.json(result);
    } catch (err) {
      metricsAggregator.recordRequest(Date.now() - startTime, true);
      logger.error({ err, auth: authSummary(req) }, '[UnifiedSystem] AI generate error');
      return res.status(500).json({ error: 'AI inference failed.' });
    }
  },
);

/**
 * GET /api/system/ai/stats
 * Public — no auth required (read-only health data).
 */
router.get('/ai/stats', (_req: Request, res: Response) => {
  return res.json(globalAIOrchestrator.getStats());
});

// ── Sandbox execution endpoints ───────────────────────────────────────────────

/**
 * POST /api/system/sandbox/execute
 * Requires: authenticated + starter tier or above (resource-intensive).
 */
router.post(
  '/sandbox/execute',
  requireUnifiedAuth,
  requireTier('starter', 'professional', 'elite', 'system'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const body = req.body as ExecuteCodeDTO;

      if (!body.code || typeof body.code !== 'string') {
        return res.status(400).json({ error: 'code is required' });
      }
      if (!['javascript', 'python'].includes(body.language)) {
        return res.status(400).json({ error: 'language must be javascript or python' });
      }
      if (body.code.length > 50_000) {
        return res.status(400).json({ error: 'code too large (max 50 KB)' });
      }

      const result = await globalSandbox.execute(body.code, body.language);
      metricsAggregator.recordRequest(Date.now() - startTime, !result.success);
      return res.json(result);
    } catch (err) {
      metricsAggregator.recordRequest(Date.now() - startTime, true);
      logger.error({ err, auth: authSummary(req) }, '[UnifiedSystem] sandbox execute error');
      return res.status(500).json({ error: 'Code execution failed.' });
    }
  },
);

// ── Military-Grade Crypto endpoints ──────────────────────────────────────────

/**
 * POST /api/system/crypto/encrypt
 * Requires: authenticated + admin or system role (sensitive operation).
 */
router.post(
  '/crypto/encrypt',
  requireUnifiedAuth,
  requireRole('admin', 'system'),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as EncryptDTO;
      if (!body.plaintext || typeof body.plaintext !== 'string') {
        return res.status(400).json({ error: 'plaintext is required' });
      }
      const crypto = getCryptoService();
      const encrypted = await crypto.encrypt(body.plaintext, body.context);
      return res.json(encrypted);
    } catch (err) {
      logger.error({ err, auth: authSummary(req) }, '[UnifiedSystem] encrypt error');
      return res.status(500).json({ error: 'Encryption failed.' });
    }
  },
);

/**
 * POST /api/system/crypto/decrypt
 * Requires: authenticated + admin or system role (sensitive operation).
 */
router.post(
  '/crypto/decrypt',
  requireUnifiedAuth,
  requireRole('admin', 'system'),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as DecryptDTO;
      const crypto = getCryptoService();
      const plaintext = await crypto.decrypt(
        {
          encrypted:   body.encrypted,
          salt:        body.salt,
          iv:          body.iv,
          authTag:     body.authTag,
          version:     body.version,
          contextHash: body.contextHash,
        },
        body.expectedContext,
      );
      return res.json({ plaintext });
    } catch (err) {
      logger.error({ err, auth: authSummary(req) }, '[UnifiedSystem] decrypt error');
      return res.status(400).json({ error: 'Decryption failed — invalid data or context mismatch.' });
    }
  },
);

/**
 * POST /api/system/crypto/hash
 * Requires: authenticated (any strategy).
 */
router.post(
  '/crypto/hash',
  requireUnifiedAuth,
  (req: Request, res: Response) => {
    const { credential } = req.body as { credential: string };
    if (!credential) return res.status(400).json({ error: 'credential is required' });
    const crypto = getCryptoService();
    const hash = crypto.hashCredential(credential);
    return res.json({ hash });
  },
);

// ── System metrics ────────────────────────────────────────────────────────────

/**
 * GET /api/system/metrics
 * Public — no auth required (aggregate, non-sensitive metrics).
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const metrics = metricsAggregator.getSnapshot();
  const aiStats = globalAIOrchestrator.getStats();
  return res.json({
    ...metrics,
    ai:        aiStats,
    uptime:    process.uptime(),
    memory:    process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// ── Auth context debug endpoint ───────────────────────────────────────────────

/**
 * GET /api/system/auth/whoami
 * Returns the resolved Unified Auth context for the current request.
 * Useful for debugging authentication from any client.
 * Requires: authenticated (any strategy).
 */
router.get(
  '/auth/whoami',
  requireUnifiedAuth,
  (req: Request, res: Response) => {
    const ctx = req.unifiedAuth;
    return res.json({
      authStrategy: ctx.authStrategy,
      role:         ctx.role,
      tier:         ctx.tier,
      permissions:  ctx.permissions,
      tokenQuota:   ctx.tokenQuota,
      // Never expose userId or email in plaintext — use redacted summary
      ...authSummary(req),
    });
  },
);

export default router;
