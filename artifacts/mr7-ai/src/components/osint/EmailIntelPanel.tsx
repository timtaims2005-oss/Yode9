import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Shield, AlertTriangle, Clock, Database, Eye, EyeOff, Search, Loader2, Download, Copy } from 'lucide-react';

interface BreachRecord {
  name: string;
  domain: string;
  breachDate: string;
  pwnCount: number;
  dataClasses: string[];
}

interface EmailResult {
  email: string;
  riskScore: number;
  sources: {
    spycloud?: { hits: number; results: any[] } | null;
    binaryedge?: { leaks: any[] } | null;
  };
  breaches: BreachRecord[];
  timestamp: string;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

export function EmailIntelPanel({ onInjectToChat }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState('');
  const [masked, setMasked] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const maskEmail = (e: string) => {
    const [u, d] = e.split('@');
    if (!d) return e;
    return `${u.substring(0, 2)}***@${d}`;
  };

  const riskColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 20) return 'text-yellow-400';
    return 'text-green-400';
  };

  const riskLabel = (score: number) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  };

  const search = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/osint-intel/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        const r: EmailResult = {
          email,
          riskScore: data.data.riskScore || 0,
          sources: data.data.sources || {},
          breaches: data.data.breaches || [],
          timestamp: new Date().toISOString()
        };
        setResult(r);
        setHistory(h => [email, ...h.filter(x => x !== email)].slice(0, 10));
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportResult = () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `email-intel-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const injectToChat = () => {
    if (!result || !onInjectToChat) return;
    const text = `## Email Intelligence Report\n\nEmail: ${result.email}\nRisk Score: ${result.riskScore}/100 (${riskLabel(result.riskScore)})\n\nSources queried: SpyCloud, BinaryEdge\nTimestamp: ${result.timestamp}\n\n${result.breaches.length > 0 ? `Breaches: ${result.breaches.map(b => b.name).join(', ')}` : 'No breaches found in configured sources'}`;
    onInjectToChat(text);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <Mail className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Email Intelligence</h2>
          <p className="text-xs text-gray-500">SpyCloud • BinaryEdge • HIBP</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setMasked(m => !m)} title={masked ? 'Show email' : 'Mask email'}
            className="p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-all">
            {masked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          {result && (
            <>
              <button onClick={exportResult} className="p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all"><Download className="w-4 h-4" /></button>
              {onInjectToChat && <button onClick={injectToChat} className="p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-blue-400 transition-all"><Copy className="w-4 h-4" /></button>}
            </>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-[#1f1f1f]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="target@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-[#2a2a2a] rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Scanning' : 'Scan'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length > 0 && !result && (
          <div>
            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Recent</p>
            <div className="flex flex-wrap gap-2">
              {history.map(h => (
                <button key={h} onClick={() => { setEmail(h); }}
                  className="px-2 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded text-xs text-gray-400 hover:text-white transition-all">
                  {masked ? maskEmail(h) : h}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Target Email</p>
                    <p className="text-sm font-mono text-white">{masked ? maskEmail(result.email) : result.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-0.5">Risk Score</p>
                    <p className={`text-2xl font-bold ${riskColor(result.riskScore)}`}>{result.riskScore}</p>
                    <p className={`text-xs font-medium ${riskColor(result.riskScore)}`}>{riskLabel(result.riskScore)}</p>
                  </div>
                </div>
                <div className="w-full bg-[#0d0d0d] rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${result.riskScore >= 80 ? 'bg-red-500' : result.riskScore >= 50 ? 'bg-orange-500' : result.riskScore >= 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${result.riskScore}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.sources).map(([source, data]) => (
                  <div key={source} className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-medium text-gray-300 capitalize">{source}</span>
                      <span className={`ml-auto w-1.5 h-1.5 rounded-full ${data ? 'bg-green-400' : 'bg-gray-600'}`} />
                    </div>
                    <p className="text-lg font-bold text-white">
                      {data ? (typeof (data as any).hits === 'number' ? (data as any).hits : typeof (data as any).leaks?.length === 'number' ? (data as any).leaks.length : '?') : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600">records found</p>
                  </div>
                ))}
              </div>

              {result.breaches.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-400" /> Breaches ({result.breaches.length})
                  </p>
                  <div className="space-y-2">
                    {result.breaches.map((b, i) => (
                      <div key={i} className="bg-[#161616] border border-red-900/20 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{b.name}</p>
                            <p className="text-xs text-gray-500">{b.domain}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-red-400 font-medium">{b.pwnCount?.toLocaleString()} records</p>
                            <p className="text-xs text-gray-600">{b.breachDate}</p>
                          </div>
                        </div>
                        {b.dataClasses?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {b.dataClasses.slice(0, 6).map((dc, j) => (
                              <span key={j} className="px-1.5 py-0.5 bg-red-900/20 border border-red-900/30 rounded text-xs text-red-400">{dc}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-600">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No breaches found in configured sources</p>
                  <p className="text-xs mt-1">Configure API keys for comprehensive results</p>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-gray-700">
                <Clock className="w-3 h-3" />
                Scanned at {new Date(result.timestamp).toLocaleString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && history.length === 0 && (
          <div className="text-center py-12 text-gray-700">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter an email address to scan</p>
            <p className="text-xs mt-1">Checks SpyCloud, BinaryEdge, and breach databases</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailIntelPanel;
