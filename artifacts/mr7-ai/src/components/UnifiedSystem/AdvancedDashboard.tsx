import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Shield, Zap, LayoutGrid,
  ChevronLeft, ChevronRight, Search, X,
  Wifi, WifiOff, Server, Cpu, MemoryStick,
  TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { FeatureRegistry, type FeatureEntry } from './FeatureRegistry';

// ── Real-time metrics shape ───────────────────────────────────────────────────
interface SystemMetrics {
  activeConnections: number;
  requestsPerSecond: number;
  avgLatency: number;
  errorRate: number;
  ai?: {
    totalRequests: number;
    totalTokensUsed: number;
    modelHealth: Record<string, { health: number; state: string }>;
  };
  memory?: { heapUsedMb: number; heapTotalMb: number };
  uptime?: number;
}

// ── WebSocket hook for real-time metrics ──────────────────────────────────────
function useMetricsSocket(wsPath: string) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeConnections: 0,
    requestsPerSecond: 0,
    avgLatency: 0,
    errorRate: 0,
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function connect() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}${wsPath}`);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.data) setMetrics(msg.data);
          } catch { /* ignore parse errors */ }
        };
        ws.onclose = () => {
          setConnected(false);
          retryRef.current = setTimeout(connect, 3000);
        };
        ws.onerror = () => ws.close();
      } catch {
        retryRef.current = setTimeout(connect, 3000);
      }
    }

    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [wsPath]);

  return { metrics, connected };
}

// ── Advanced Dashboard ────────────────────────────────────────────────────────
export const AdvancedDashboard: React.FC = () => {
  const { metrics, connected } = useMetricsSocket('/ws/metrics');
  const [activeFeature, setActiveFeature] = useState<string>('dashboard');
  const [sidebarMode, setSidebarMode] = useState<'icon' | 'full'>('full');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const features = searchQuery
    ? FeatureRegistry.search(searchQuery)
    : FeatureRegistry.list();

  const grouped = FeatureRegistry.byCategory();

  const currentFeature = FeatureRegistry.get(activeFeature);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarMode === 'full' ? 280 : 72 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex flex-col bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/50 shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800/50">
          <div className="relative shrink-0">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/50">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
          </div>
          <AnimatePresence>
            {sidebarMode === 'full' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="min-w-0"
              >
                <p className="font-bold text-white text-sm leading-none">MR7-AI</p>
                <p className={`text-xs mt-0.5 flex items-center gap-1 ${connected ? 'text-green-400' : 'text-red-400'}`}>
                  {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {connected ? 'System Online' : 'Reconnecting...'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Metrics Bar */}
        <AnimatePresence>
          {sidebarMode === 'full' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 p-3 border-b border-gray-800/50 bg-black/20"
            >
              <MetricCard label="Latency" value={`${metrics.avgLatency}ms`} icon={Activity}
                status={metrics.avgLatency < 200 ? 'good' : metrics.avgLatency < 500 ? 'warn' : 'bad'} />
              <MetricCard label="RPS" value={metrics.requestsPerSecond.toFixed(1)} icon={TrendingUp} status="good" />
              <MetricCard label="Errors" value={`${metrics.errorRate.toFixed(1)}%`} icon={AlertTriangle}
                status={metrics.errorRate < 1 ? 'good' : metrics.errorRate < 5 ? 'warn' : 'bad'} />
              <MetricCard label="Conns" value={metrics.activeConnections} icon={Server} status="good" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <AnimatePresence>
          {sidebarMode === 'full' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2 border-b border-gray-800/50"
            >
              <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-gray-600 flex-1 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3 h-3 text-gray-500 hover:text-white" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800">
          {searchQuery ? (
            <div className="px-2 space-y-0.5">
              {features.map((feature) => (
                <NavItem
                  key={feature.id}
                  feature={feature}
                  isActive={activeFeature === feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  mode={sidebarMode}
                />
              ))}
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-3">
                {sidebarMode === 'full' && (
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                    {category}
                  </p>
                )}
                <div className="px-2 space-y-0.5">
                  {items.map((feature) => (
                    <NavItem
                      key={feature.id}
                      feature={feature}
                      isActive={activeFeature === feature.id}
                      onClick={() => setActiveFeature(feature.id)}
                      mode={sidebarMode}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Security + Collapse Footer */}
        <div className="p-3 border-t border-gray-800/50 space-y-2">
          {sidebarMode === 'full' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 bg-green-950/40 border border-green-900/50 rounded-lg px-3 py-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span className="text-[10px] text-green-400/80 font-mono">AES-256-GCM Active</span>
              <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
            </motion.div>
          )}
          <button
            onClick={() => setSidebarMode((m) => (m === 'full' ? 'icon' : 'full'))}
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-white hover:bg-gray-800/50 rounded-lg px-3 py-1.5 transition-colors text-xs"
          >
            {sidebarMode === 'full' ? (
              <><ChevronLeft className="w-4 h-4" /> <span>Collapse</span></>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800/50 bg-gray-900/40 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="font-bold text-white text-sm">{currentFeature?.name ?? 'Dashboard'}</h2>
            <p className="text-gray-500 text-xs">{currentFeature?.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {metrics.memory && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MemoryStick className="w-3.5 h-3.5" />
                <span>{metrics.memory.heapUsedMb}MB / {metrics.memory.heapTotalMb}MB</span>
              </div>
            )}
            {metrics.ai && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Cpu className="w-3.5 h-3.5" />
                <span>{metrics.ai.totalRequests.toLocaleString()} requests</span>
              </div>
            )}
          </div>
        </header>

        {/* Feature content area */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="max-w-7xl mx-auto"
            >
              <FeatureContent featureId={activeFeature} metrics={metrics} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.FC<{ className?: string; style?: React.CSSProperties; size?: number }>;
  status: 'good' | 'warn' | 'bad';
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, status }) => {
  const colors = {
    good: 'text-green-400',
    warn: 'text-yellow-400',
    bad: 'text-red-400',
  };
  return (
    <div className="bg-gray-800/40 rounded-lg p-2 text-center border border-gray-700/30">
      <Icon className={`w-3 h-3 mx-auto mb-1 ${colors[status]}`} />
      <p className="text-[10px] text-gray-500 leading-none">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${colors[status]}`}>{value}</p>
    </div>
  );
};

const NavItem: React.FC<{
  feature: FeatureEntry;
  isActive: boolean;
  onClick: () => void;
  mode: 'icon' | 'full';
}> = ({ feature, isActive, onClick, mode }) => {
  const Icon = feature.icon;
  return (
    <button
      onClick={onClick}
      title={mode === 'icon' ? feature.name : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 text-left group relative
        ${isActive
          ? 'bg-red-600/20 text-red-400 border border-red-500/30'
          : 'text-gray-500 hover:bg-gray-800/50 hover:text-white'
        }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-400' : 'group-hover:text-white'}`} />
      {mode === 'full' && (
        <>
          <span className="text-xs font-medium flex-1 truncate">{feature.name}</span>
          {feature.badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              feature.isNew
                ? 'bg-red-600/30 text-red-300 border border-red-500/30'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {feature.badge}
            </span>
          )}
        </>
      )}
    </button>
  );
};

// ── Feature Content Router ────────────────────────────────────────────────────
const FeatureContent: React.FC<{ featureId: string; metrics: SystemMetrics }> = ({
  featureId,
  metrics,
}) => {
  if (featureId === 'dashboard') {
    return <DashboardOverview metrics={metrics} />;
  }
  // Placeholder for other features (they exist in the main app routes)
  const feature = FeatureRegistry.get(featureId);
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      {feature && <feature.icon className="w-12 h-12 text-gray-700 mb-4" />}
      <h3 className="text-gray-400 font-semibold">{feature?.name ?? featureId}</h3>
      <p className="text-gray-600 text-sm mt-1">{feature?.description}</p>
      <p className="text-gray-700 text-xs mt-3">Navigate to this module from the main navigation</p>
    </div>
  );
};

// ── Dashboard Overview (default view) ─────────────────────────────────────────
const DashboardOverview: React.FC<{ metrics: SystemMetrics }> = ({ metrics }) => {
  const modelEntries = Object.entries(metrics.ai?.modelHealth ?? {});

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Connections', value: metrics.activeConnections, icon: Wifi, color: 'blue' },
          { label: 'Requests / sec', value: metrics.requestsPerSecond.toFixed(2), icon: Activity, color: 'green' },
          { label: 'Avg Latency', value: `${metrics.avgLatency}ms`, icon: TrendingUp, color: 'yellow' },
          { label: 'Error Rate', value: `${metrics.errorRate.toFixed(2)}%`, icon: AlertTriangle, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-gray-900 border border-gray-800 rounded-2xl p-4`}>
            <div className={`w-8 h-8 rounded-xl bg-${color}-950/50 border border-${color}-900/40 flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Model Health */}
      {modelEntries.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-red-400" />
            AI Model Health
          </h3>
          <div className="space-y-3">
            {modelEntries.map(([modelId, { health, state }]) => (
              <div key={modelId} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  state === 'closed' ? 'bg-green-500' : state === 'half-open' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-400 flex-1 font-mono">{modelId}</span>
                <div className="w-32 bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      health > 0.7 ? 'bg-green-500' : health > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${health * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-10 text-right">{Math.round(health * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory */}
      {metrics.memory && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-blue-400" />
            Memory Usage
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-800 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(metrics.memory.heapUsedMb / metrics.memory.heapTotalMb) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
              {metrics.memory.heapUsedMb}MB / {metrics.memory.heapTotalMb}MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
