import type { WebSocketServer, WebSocket } from 'ws';
import { metricsAggregator } from '../../infrastructure/observability/OpenTelemetryConfig.js';
import { globalAIOrchestrator } from '../../infrastructure/ai/AIOrchestrator.js';
import { logger } from '../../lib/logger.js';

// ── Real-time metrics broadcast over WebSocket ───────────────────────────────
export function setupMetricsWebSocket(wss: WebSocketServer): void {
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws, req) => {
    // Only serve /ws/metrics path
    if (!req.url?.startsWith('/ws/metrics') && !req.url?.startsWith('/metrics')) {
      ws.close(4004, 'Not a metrics socket');
      return;
    }

    clients.add(ws);
    metricsAggregator.setActiveConnections(clients.size);
    logger.info({ total: clients.size }, '[MetricsWS] client connected');

    // Send initial snapshot
    ws.send(JSON.stringify(buildPayload()));

    ws.on('close', () => {
      clients.delete(ws);
      metricsAggregator.setActiveConnections(clients.size);
      logger.info({ total: clients.size }, '[MetricsWS] client disconnected');
    });

    ws.on('error', (err) => {
      logger.warn({ err }, '[MetricsWS] client error');
      clients.delete(ws);
    });
  });

  // Broadcast every 2 seconds
  const broadcastInterval = setInterval(() => {
    if (clients.size === 0) return;
    const payload = JSON.stringify(buildPayload());
    for (const client of clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      } else {
        clients.delete(client);
      }
    }
  }, 2000);

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(broadcastInterval);
    for (const client of clients) client.close();
  });
}

function buildPayload() {
  const metrics = metricsAggregator.getSnapshot();
  const aiStats = globalAIOrchestrator.getStats();
  return {
    type: 'metrics',
    data: {
      activeConnections: metrics.activeConnections,
      requestsPerSecond: Math.round(metrics.requestsPerSecond * 100) / 100,
      avgLatency: Math.round(metrics.avgLatencyMs),
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      ai: {
        totalRequests: aiStats.totalRequests,
        totalTokensUsed: aiStats.totalTokensUsed,
        modelHealth: aiStats.modelHealth,
      },
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1_048_576),
        heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1_048_576),
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  };
}
