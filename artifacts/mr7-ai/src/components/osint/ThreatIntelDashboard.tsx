import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Search, Loader2, Users, Target, Activity, Download, RefreshCw, Skull } from 'lucide-react';

interface ThreatActor {
  name: string;
  group?: string;
  country?: string;
  motivation?: string;
  tactics?: string[];
}

interface IOCResult {
  value: string;
  detectedType: string;
  anomali?: any;
  flashpoint?: any;
  timestamp: string;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS = { CRITICAL: '#e21227', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' } as const;

export function ThreatIntelDashboard({ onInjectToChat }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [iocResult, setIocResult] = useState<IOCResult | null>(null);
  const [actors, setActors] = useState<ThreatActor[]>([]);
  const [ransomware, setRansomware] = useState<any>(null);
  const [tab, setTab] = useState<'ioc' | 'actors' | 'ransomware'>('ioc');
  const [error, setError] = useState('');
  const [loadingActors, setLoadingActors] = useState(false);
  const [loadingRansomware, setLoadingRansomware] = useState(false);

  const searchIOC = async () => {
    if (!query.trim()) { setError('Enter an IOC value'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/osint-intel/threat/ioc?value=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setIocResult({ ...data.data, timestamp: new Date().toISOString() });
      } else setError(data.error || 'Search failed');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadActors = async () => {
    setLoadingActors(true);
    try {
      const res = await fetch('/api/osint-intel/threat/actors');
      const data = await res.json();
      if (data.success) {
        const kelaActors = data.data.kela?.actors || [];
        const anomaliActors = data.data.anomali?.objects || [];
        setActors([...kelaActors, ...anomaliActors].slice(0, 20));
      }
    } catch {}
    setLoadingActors(false);
  };

  const loadRansomware = async () => {
    setLoadingRansomware(true);
    try {
      const res = await fetch('/api/osint-intel/threat/ransomware');
      const data = await res.json();
      if (data.success) setRansomware(data.data);
    } catch {}
    setLoadingRansomware(false);
  };

  useEffect(() => {
    if (tab === 'actors' && actors.length === 0) loadActors();
    if (tab === 'ransomware' && !ransomware) loadRansomware();
  }, [tab]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Threat Intelligence</h2>
          <p className="text-xs text-gray-500">Anomali • Flashpoint • KELA • IOC Analysis</p>
        </div>
        <button onClick={() => { if (tab === 'actors') loadActors(); if (tab === 'ransomware') loadRansomware(); }}
          className="ml-auto p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-500 hover:text-white transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-[#1f1f1f]">
        {(['ioc', 'actors', 'ransomware'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab === t ? 'text-red-400 border-b-2 border-red-400 bg-red-400/5' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'ioc' ? 'IOC Search' : t === 'actors' ? 'Threat Actors' : 'Ransomware'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'ioc' && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchIOC()}
                  placeholder="IP, domain, hash, CVE, email, URL..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors" />
              </div>
              <button onClick={searchIOC} disabled={loading}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-[#2a2a2a] rounded-lg text-sm flex items-center gap-2 transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}

            <AnimatePresence>
              {iocResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm text-white break-all">{iocResult.value}</p>
                        <span className="px-2 py-0.5 bg-[#2a2a2a] rounded text-xs text-gray-400 mt-1 inline-block">
                          {iocResult.detectedType.toUpperCase()}
                        </span>
                      </div>
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#0d0d0d] rounded p-2">
                        <p className="text-gray-600 mb-1">Anomali</p>
                        <p className="text-white">{iocResult.anomali ? 'Data available' : 'No data / Not configured'}</p>
                      </div>
                      <div className="bg-[#0d0d0d] rounded p-2">
                        <p className="text-gray-600 mb-1">Flashpoint</p>
                        <p className="text-white">{iocResult.flashpoint ? 'Data available' : 'No data / Not configured'}</p>
                      </div>
                    </div>
                    {iocResult.anomali && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">View raw Anomali data</summary>
                        <pre className="mt-2 text-xs text-gray-400 bg-[#0d0d0d] rounded p-2 overflow-x-auto max-h-32">{JSON.stringify(iocResult.anomali, null, 2)}</pre>
                      </details>
                    )}
                    {onInjectToChat && (
                      <button onClick={() => onInjectToChat(`## IOC Analysis: ${iocResult.value}\nType: ${iocResult.detectedType}\nSources: Anomali ThreatStream, Flashpoint\nTimestamp: ${iocResult.timestamp}`)}
                        className="mt-3 w-full py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded text-xs text-gray-500 hover:text-white transition-all">
                        Inject to Chat
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!iocResult && !loading && (
              <div className="text-center py-10 text-gray-700">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Search for IOCs across threat intelligence platforms</p>
                <p className="text-xs mt-1">Supports: IPs, domains, hashes, CVEs, URLs, emails</p>
              </div>
            )}
          </div>
        )}

        {tab === 'actors' && (
          <div className="p-4">
            {loadingActors ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
            ) : actors.length > 0 ? (
              <div className="space-y-2">
                {actors.map((actor, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3 hover:border-red-900/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-900/20 rounded-lg shrink-0">
                        <Skull className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{actor.name || 'Unknown Actor'}</p>
                        {actor.country && <p className="text-xs text-gray-500">{actor.country} {actor.group ? `• ${actor.group}` : ''}</p>}
                        {actor.motivation && <p className="text-xs text-gray-600 mt-1">{actor.motivation}</p>}
                        {actor.tactics && actor.tactics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {actor.tactics.slice(0, 4).map((t, j) => (
                              <span key={j} className="px-1.5 py-0.5 bg-red-900/20 border border-red-900/30 rounded text-xs text-red-400">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-700">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No threat actors loaded</p>
                <p className="text-xs mt-1">Configure KELA or Anomali API keys</p>
                <button onClick={loadActors} className="mt-3 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded text-xs text-gray-400 hover:text-white transition-all">Retry</button>
              </div>
            )}
          </div>
        )}

        {tab === 'ransomware' && (
          <div className="p-4">
            {loadingRansomware ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
            ) : ransomware ? (
              <div className="space-y-3">
                {ransomware.groups?.slice(0, 10).map((g: any, i: number) => (
                  <div key={i} className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3">
                    <p className="text-sm font-medium text-white">{g.name || g}</p>
                    {g.attacks && <p className="text-xs text-gray-500">{g.attacks} attacks</p>}
                  </div>
                )) || (
                  <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
                    <p className="text-xs text-gray-500">Ransomware data loaded — configure KELA API key for full data</p>
                    <pre className="mt-2 text-xs text-gray-400 overflow-x-auto max-h-48">{JSON.stringify(ransomware, null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-700">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No ransomware data</p>
                <button onClick={loadRansomware} className="mt-3 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded text-xs text-gray-400 hover:text-white transition-all">Load</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreatIntelDashboard;
