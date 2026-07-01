import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Shield,
  AlertTriangle,
  Globe,
  Lock,
  Eye,
  Database,
  Activity,
  FileText,
  Bitcoin,
  Users,
  Server,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  X,
  Wifi,
  Zap,
  Radio,
  Cpu,
  Network,
  Terminal,
  Filter,
  RefreshCw
} from 'lucide-react';

interface DarkWebResult {
  title: string;
  description: string;
  onionAddress?: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  lastSeen: string;
  firstSeen?: string;
  status?: string;
  content: any[];
  bitcoinAddresses: string[];
  moneroAddresses?: string[];
  relatedActors: any[];
  pgpKeys?: any[];
  contactInfo?: any[];
  technologies?: string[];
  hosting?: any;
  source?: string;
  language?: string;
}

interface SearchFilters {
  sources: string[];
  riskLevels: string[];
  dateFrom?: Date;
  dateTo?: Date;
  categories: string[];
}

interface ServiceStatus {
  intelx: boolean;
  shodan: boolean;
  hudsonrock: boolean;
  recordedFuture: boolean;
  chainalysis: boolean;
  neo4j: boolean;
  openai: boolean;
}

const RISK_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', badge: 'bg-red-600' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50', badge: 'bg-orange-500' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', badge: 'bg-yellow-500' },
  low: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', badge: 'bg-green-500' }
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  email: FileText,
  ip: Server,
  domain: Globe,
  darkweb: Lock,
  blockchain: Bitcoin,
  threat: Shield,
  paste: Database,
  telegram: Radio,
  default: Eye
};

export const DarkWebSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DarkWebResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DarkWebResult | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'analysis' | 'graph' | 'blockchain'>('results');
  const [analysis, setAnalysis] = useState<any>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    sources: ['tor', 'telegram', 'paste'],
    riskLevels: ['critical', 'high', 'medium', 'low'],
    categories: []
  });
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  const [searchMode, setSearchMode] = useState<'unified' | 'darkweb' | 'blockchain' | 'threat'>('unified');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load service status on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/darkweb-intelligence/status')
        .then(r => r.json())
        .then(data => {
          if (data.success) setServiceStatus(data.data.services);
        })
        .catch(() => {});

      if (inputRef.current) inputRef.current.focus();
    }
  }, [isOpen]);

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setAnalysis(null);

    try {
      let endpoint = '/api/darkweb-intelligence/search';
      let body: any = {
        query,
        types: searchMode === 'unified'
          ? ['email', 'ip', 'darkweb', 'threat']
          : [searchMode],
        enrichment: true
      };

      if (searchMode === 'darkweb') {
        endpoint = '/api/darkweb-intelligence/darkweb/search';
        body = {
          query,
          sources: filters.sources,
          options: {
            riskLevels: filters.riskLevels,
            keywords: [query],
            categories: filters.categories
          }
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        const allResults = data.data.results || [];
        setResults(allResults);
        setAnalysis(data.data.analysis);
        setStats({
          total: allResults.length,
          critical: allResults.filter((r: DarkWebResult) => r.riskLevel === 'critical').length,
          high: allResults.filter((r: DarkWebResult) => r.riskLevel === 'high').length,
          medium: allResults.filter((r: DarkWebResult) => r.riskLevel === 'medium').length,
          low: allResults.filter((r: DarkWebResult) => r.riskLevel === 'low').length
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters, searchMode]);

  useEffect(() => {
    if (initialQuery && isOpen) {
      performSearch();
    }
  }, [initialQuery, isOpen]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') performSearch();
    if (e.key === 'Escape') onClose();
  };

  const exportResults = () => {
    const data = JSON.stringify({ query, results, analysis, stats, timestamp: new Date() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `darkweb-intel-${query}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskConfig = (level: string) => RISK_CONFIG[level as keyof typeof RISK_CONFIG] || RISK_CONFIG.low;

  const ScanningAnimation = () => (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 animate-ping absolute inset-0" />
        <div className="w-24 h-24 rounded-full border-2 border-cyan-500/50 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-10 h-10 text-cyan-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-cyan-400 font-mono text-sm animate-pulse">SCANNING DARK WEB...</p>
        <p className="text-gray-500 text-xs mt-1">Querying Tor, I2P, Telegram, Paste sites</p>
      </div>
      <div className="flex gap-2">
        {['IntelX', 'Shodan', 'RecordedFuture', 'Chainalysis'].map((svc, i) => (
          <div
            key={svc}
            className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 border border-gray-700"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            {svc}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-7xl bg-gray-950 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-800/50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-950 via-purple-950 to-gray-950 p-5 flex items-center justify-between border-b border-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-500/30">
                  <Shield className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white font-mono">DARK WEB INTELLIGENCE</h2>
                    <span className="px-2 py-0.5 bg-red-500/20 rounded text-[10px] text-red-300 border border-red-500/40 font-mono">
                      MILITARY GRADE
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-500/20 rounded text-[10px] text-cyan-300 border border-cyan-500/40 font-mono">
                      5D LIVE
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 font-mono">
                    Tor • I2P • Freenet • ZeroNet • Telegram • Blockchain • AI Correlation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {results.length > 0 && (
                  <button
                    onClick={exportResults}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    title="Export results"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Service Status Bar */}
            {serviceStatus && (
              <div className="px-5 py-2 bg-gray-900/50 border-b border-gray-800/50 flex items-center gap-4 overflow-x-auto">
                <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">SERVICES:</span>
                {Object.entries(serviceStatus).map(([name, active]) => (
                  <div key={name} className="flex items-center gap-1 whitespace-nowrap">
                    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className={`text-[10px] font-mono ${active ? 'text-green-400' : 'text-gray-600'}`}>
                      {name.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Search Bar */}
            <div className="p-5 border-b border-gray-800/50 space-y-3">
              {/* Search Mode Selector */}
              <div className="flex gap-2">
                {[
                  { id: 'unified', label: 'Unified', icon: Zap },
                  { id: 'darkweb', label: 'Dark Web', icon: Lock },
                  { id: 'blockchain', label: 'Blockchain', icon: Bitcoin },
                  { id: 'threat', label: 'Threat Intel', icon: Shield }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSearchMode(id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      searchMode === id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Main Search Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Search: email, IP, domain, hash, blockchain address, keywords..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono text-sm"
                  />
                  {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={performSearch}
                  disabled={loading || !query.trim()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-mono text-sm transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> SCANNING</>
                  ) : (
                    <><Search className="w-4 h-4" /> SEARCH</>
                  )}
                </button>
              </div>

              {/* Source Filters */}
              {searchMode === 'darkweb' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                    <Filter className="w-3 h-3" /> SOURCES:
                  </span>
                  {['tor', 'i2p', 'telegram', 'paste', 'freenet', 'zeronet'].map(source => (
                    <button
                      key={source}
                      onClick={() => setFilters(f => ({
                        ...f,
                        sources: f.sources.includes(source)
                          ? f.sources.filter(s => s !== source)
                          : [...f.sources, source]
                      }))}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                        filters.sources.includes(source)
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-gray-600 border border-gray-700 hover:text-gray-400'
                      }`}
                    >
                      {source.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Bar */}
            {(results.length > 0 || loading) && (
              <div className="px-5 py-2.5 bg-gray-900/30 border-b border-gray-800/50 flex items-center gap-6">
                <span className="text-xs text-gray-500 font-mono">RESULTS: <span className="text-white">{stats.total}</span></span>
                {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                  stats[level] > 0 && (
                    <div key={level} className={`flex items-center gap-1 text-xs font-mono ${getRiskConfig(level).color}`}>
                      <div className={`w-2 h-2 rounded-full ${getRiskConfig(level).badge}`} />
                      {stats[level]} {level.toUpperCase()}
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Tab Navigation */}
            {results.length > 0 && (
              <div className="flex gap-0 border-b border-gray-800/50">
                {[
                  { id: 'results', label: 'Results', icon: Database, count: stats.total },
                  { id: 'analysis', label: 'AI Analysis', icon: Cpu },
                  { id: 'graph', label: 'Graph', icon: Network },
                  { id: 'blockchain', label: 'Blockchain', icon: Bitcoin }
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-mono transition-all border-b-2 ${
                      activeTab === id
                        ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {count !== undefined && count > 0 && (
                      <span className="px-1.5 py-0.5 bg-gray-800 rounded text-[10px]">{count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {loading && <ScanningAnimation />}

              {!loading && results.length === 0 && query && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                  <Lock className="w-12 h-12 mb-4 opacity-30" />
                  <p className="font-mono text-sm">NO RESULTS FOUND</p>
                  <p className="text-xs mt-1">Try different search terms or enable more sources</p>
                </div>
              )}

              {!loading && results.length === 0 && !query && (
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Lock, title: 'Tor Network', desc: 'Search .onion sites and dark web markets', color: 'red' },
                    { icon: Radio, title: 'Telegram Monitoring', desc: 'Monitor dark web Telegram channels', color: 'blue' },
                    { icon: Database, title: 'Paste Sites', desc: 'Monitor Pastebin, Ghostbin, and more', color: 'purple' },
                    { icon: Bitcoin, title: 'Blockchain Trace', desc: 'Track crypto transactions and wallets', color: 'yellow' },
                    { icon: Shield, title: 'Threat Intelligence', desc: 'IOC analysis and threat actor tracking', color: 'orange' },
                    { icon: Server, title: 'Network OSINT', desc: 'Shodan, SCADA, IoT device scanning', color: 'cyan' },
                    { icon: FileText, title: 'Email Intelligence', desc: 'Breach data and credential lookup', color: 'green' },
                    { icon: Cpu, title: 'AI Correlation', desc: 'Pattern recognition and anomaly detection', color: 'pink' }
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div
                      key={title}
                      className={`p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-${color}-500/30 transition-all cursor-pointer group`}
                      onClick={() => setQuery(title.toLowerCase().replace(' ', '_'))}
                    >
                      <Icon className={`w-6 h-6 text-${color}-400 mb-2 group-hover:scale-110 transition-transform`} />
                      <p className="text-white text-xs font-mono font-semibold">{title}</p>
                      <p className="text-gray-500 text-[10px] mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Results Tab */}
              {!loading && activeTab === 'results' && results.length > 0 && (
                <div className="divide-y divide-gray-800/50">
                  {results.map((result, index) => {
                    const riskCfg = getRiskConfig(result.riskLevel);
                    const isExpanded = expandedResult === `${index}`;
                    const CategoryIcon = CATEGORY_ICONS[result.source || result.category] || CATEGORY_ICONS.default;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`p-4 hover:bg-gray-900/50 transition-colors ${riskCfg.bg} border-l-2 ${riskCfg.border}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${riskCfg.bg} border ${riskCfg.border} flex-shrink-0`}>
                              <CategoryIcon className={`w-4 h-4 ${riskCfg.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-white font-mono text-sm font-semibold truncate">
                                  {result.title || 'Unknown'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white ${riskCfg.badge}`}>
                                  {result.riskLevel?.toUpperCase()}
                                </span>
                                {result.category && (
                                  <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 font-mono">
                                    {result.category}
                                  </span>
                                )}
                                {result.source && (
                                  <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 font-mono">
                                    {result.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{result.description}</p>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {result.lastSeen && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {new Date(result.lastSeen).toLocaleString()}
                                  </span>
                                )}
                                {result.bitcoinAddresses?.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-yellow-500/70 font-mono">
                                    <Bitcoin className="w-3 h-3" />
                                    {result.bitcoinAddresses.length} BTC address(es)
                                  </span>
                                )}
                                {result.relatedActors?.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-red-400/70 font-mono">
                                    <Users className="w-3 h-3" />
                                    {result.relatedActors.length} actor(s)
                                  </span>
                                )}
                                {result.pgpKeys?.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-green-400/70 font-mono">
                                    <Lock className="w-3 h-3" />
                                    {result.pgpKeys.length} PGP key(s)
                                  </span>
                                )}
                                {result.content?.length > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-purple-400/70 font-mono">
                                    <FileText className="w-3 h-3" />
                                    {result.content.length} content item(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedResult(isExpanded ? null : `${index}`)}
                            className="p-1 hover:bg-white/10 rounded flex-shrink-0"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />
                            }
                          </button>
                        </div>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 pl-9 overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Bitcoin Addresses */}
                                {result.bitcoinAddresses?.length > 0 && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-yellow-500/20">
                                    <p className="text-yellow-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <Bitcoin className="w-3 h-3" /> BITCOIN ADDRESSES
                                    </p>
                                    {result.bitcoinAddresses.slice(0, 5).map((addr, i) => (
                                      <p key={i} className="text-xs text-gray-300 font-mono truncate">{addr}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Monero Addresses */}
                                {result.moneroAddresses?.length > 0 && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-orange-500/20">
                                    <p className="text-orange-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <Bitcoin className="w-3 h-3" /> MONERO ADDRESSES
                                    </p>
                                    {result.moneroAddresses.slice(0, 3).map((addr, i) => (
                                      <p key={i} className="text-xs text-gray-300 font-mono truncate">{addr}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Threat Actors */}
                                {result.relatedActors?.length > 0 && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-red-500/20">
                                    <p className="text-red-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <Users className="w-3 h-3" /> THREAT ACTORS
                                    </p>
                                    {result.relatedActors.slice(0, 3).map((actor: any, i: number) => (
                                      <div key={i} className="text-xs">
                                        <span className="text-white font-mono">{actor.name}</span>
                                        {actor.country && <span className="text-gray-500 ml-2">({actor.country})</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Technologies */}
                                {result.technologies?.length > 0 && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-cyan-500/20">
                                    <p className="text-cyan-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <Cpu className="w-3 h-3" /> TECHNOLOGIES
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {result.technologies.map((tech, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 font-mono">
                                          {tech}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Hosting */}
                                {result.hosting && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <Server className="w-3 h-3" /> HOSTING
                                    </p>
                                    <div className="text-xs text-gray-300 font-mono space-y-0.5">
                                      {result.hosting.provider && <p>Provider: {result.hosting.provider}</p>}
                                      {result.hosting.country && <p>Country: {result.hosting.country}</p>}
                                      {result.hosting.hostingType && <p>Type: {result.hosting.hostingType}</p>}
                                    </div>
                                  </div>
                                )}

                                {/* Content Preview */}
                                {result.content?.[0]?.extractedText && (
                                  <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 md:col-span-2">
                                    <p className="text-gray-400 text-[10px] font-mono mb-2 flex items-center gap-1">
                                      <FileText className="w-3 h-3" /> CONTENT PREVIEW
                                    </p>
                                    <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-4">
                                      {result.content[0].extractedText}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* AI Analysis Tab */}
              {!loading && activeTab === 'analysis' && (
                <div className="p-6">
                  {analysis ? (
                    <div className="space-y-4">
                      <h3 className="text-cyan-400 font-mono text-sm flex items-center gap-2">
                        <Cpu className="w-4 h-4" /> AI CORRELATION ANALYSIS
                      </h3>
                      <pre className="bg-gray-900 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-auto max-h-96 border border-gray-800">
                        {JSON.stringify(analysis, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                      <Cpu className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-mono text-sm">NO AI ANALYSIS AVAILABLE</p>
                      <p className="text-xs mt-1">Configure OPENAI_API_KEY for AI correlation</p>
                    </div>
                  )}
                </div>
              )}

              {/* Graph Tab */}
              {!loading && activeTab === 'graph' && (
                <div className="p-6 flex flex-col items-center justify-center py-12 text-gray-600">
                  <Network className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-mono text-sm">GRAPH VISUALIZATION</p>
                  <p className="text-xs mt-1 text-center max-w-xs">
                    Configure NEO4J_URI to enable interactive graph analysis of OSINT correlations
                  </p>
                </div>
              )}

              {/* Blockchain Tab */}
              {!loading && activeTab === 'blockchain' && (
                <div className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-yellow-400 font-mono text-sm flex items-center gap-2">
                      <Bitcoin className="w-4 h-4" /> BLOCKCHAIN ADDRESSES FOUND
                    </h3>
                    {results.flatMap(r => r.bitcoinAddresses || []).length > 0 ? (
                      <div className="space-y-2">
                        {[...new Set(results.flatMap(r => r.bitcoinAddresses || []))].map((addr, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-yellow-500/20"
                          >
                            <span className="text-yellow-400 font-mono text-xs">{addr}</span>
                            <button
                              onClick={() => {
                                setQuery(addr);
                                setSearchMode('blockchain');
                                performSearch();
                              }}
                              className="text-[10px] text-gray-500 hover:text-white font-mono px-2 py-1 hover:bg-gray-700 rounded transition-colors"
                            >
                              TRACE
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                        <Bitcoin className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-mono text-sm">NO BLOCKCHAIN ADDRESSES IN RESULTS</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-900/50 border-t border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gray-500 font-mono">LIVE MONITORING ACTIVE</span>
                </div>
                <span className="text-gray-700">|</span>
                <span className="text-[10px] text-gray-600 font-mono">
                  IntelX • Shodan • RecordedFuture • Chainalysis • TorScraper • AI Correlation
                </span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">
                MR7.AI DARK WEB INTELLIGENCE v2.0
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DarkWebSearchModal;
