import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Server, Shield, AlertTriangle, Wifi, Eye, Search, Loader2, Download, Map, Activity } from 'lucide-react';

interface IPResult {
  ip: string;
  type: string;
  riskScore: number;
  riskLevel: string;
  sources: {
    greynoise?: any;
    binaryedge?: any;
    virustotal?: any;
    onyphe?: any;
  };
  timestamp: string;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#e21227', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e'
};

export function NetworkIntelPanel({ onInjectToChat }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IPResult | null>(null);
  const [error, setError] = useState('');
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) { setError('Enter an IP address or domain'); return; }
    setLoading(true); setError(''); setResult(null);
    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(query.trim());
    const endpoint = isIP ? `/api/osint-intel/ip/${query.trim()}` : `/api/osint-intel/domain/${query.trim()}`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setResult({ ...data.data, timestamp: new Date().toISOString() });
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level: string) => RISK_COLORS[level] || '#6b7280';

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `network-intel-${result.ip}-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const ServiceCard = ({ name, data }: { name: string; data: any }) => {
    const isActive = activeSource === name;
    const available = data !== null && data !== undefined;
    return (
      <button onClick={() => setActiveSource(isActive ? null : name)}
        className={`text-left p-3 rounded-lg border transition-all ${isActive ? 'bg-blue-900/20 border-blue-500/30' : 'bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-300 capitalize">{name}</span>
          <span className={`w-2 h-2 rounded-full ${available ? 'bg-green-400' : 'bg-gray-600'}`} />
        </div>
        <p className="text-xs text-gray-600">{available ? 'Data available' : 'Not configured'}</p>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
          <Globe className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Network Intelligence</h2>
          <p className="text-xs text-gray-500">GreyNoise • BinaryEdge • VirusTotal • Onyphe</p>
        </div>
        {result && (
          <button onClick={exportResult} className="ml-auto p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all">
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-[#1f1f1f]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="IP address or domain (e.g. 1.1.1.1, example.com)"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-[#2a2a2a] rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Scanning' : 'Scan'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg">
                      <Server className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-mono text-sm text-white">{result.ip}</p>
                      <p className="text-xs text-gray-500 uppercase">{result.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: riskColor(result.riskLevel) }}>{result.riskScore}</p>
                    <p className="text-xs font-medium" style={{ color: riskColor(result.riskLevel) }}>{result.riskLevel}</p>
                  </div>
                </div>
                <div className="w-full bg-[#0d0d0d] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${result.riskScore}%`, backgroundColor: riskColor(result.riskLevel) }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.sources).map(([name, data]) => (
                  <ServiceCard key={name} name={name} data={data} />
                ))}
              </div>

              <AnimatePresence>
                {activeSource && result.sources[activeSource] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{activeSource} Data</p>
                    <pre className="text-xs text-gray-300 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-[#2a2a2a]">
                      {JSON.stringify(result.sources[activeSource], null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>

              {onInjectToChat && (
                <button onClick={() => onInjectToChat(`## Network Intelligence: ${result.ip}\n\nRisk Score: ${result.riskScore}/100 (${result.riskLevel})\nType: ${result.type}\n\nSources: GreyNoise, BinaryEdge, VirusTotal, Onyphe\nScanned: ${result.timestamp}`)}
                  className="w-full py-2 bg-[#161616] hover:bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg text-xs text-gray-400 hover:text-white transition-all">
                  Inject to Chat
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="text-center py-12 text-gray-700">
            <Wifi className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter an IP address or domain</p>
            <p className="text-xs mt-1">Multi-source network intelligence analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkIntelPanel;
