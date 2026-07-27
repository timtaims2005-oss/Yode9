import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Loader2, AlertTriangle, Clock, Link, Download, Filter } from 'lucide-react';

interface PasteResult {
  id: string;
  source: string;
  url: string;
  title: string;
  content: string;
  author?: string;
  timestamp: string;
  matches: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS = { critical: '#e21227', high: '#f97316', medium: '#eab308', low: '#22c55e' };

export function PasteMonitorPanel({ onInjectToChat }: Props) {
  const [keywords, setKeywords] = useState('password,credentials,leak');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PasteResult[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const search = async () => {
    const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (!kws.length) { setError('Enter at least one keyword'); return; }
    setLoading(true); setError(''); setResults([]);
    try {
      const res = await fetch('/api/osint-intel/paste/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws })
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data.results || []);
      } else setError(data.error || 'Search failed');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? results : results.filter(r => r.riskLevel === filter);
  const counts = { all: results.length, critical: 0, high: 0, medium: 0, low: 0 };
  results.forEach(r => counts[r.riskLevel]++);

  const exportResults = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `paste-monitor-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Paste Monitor</h2>
          <p className="text-xs text-gray-500">Pastebin • GitHub Gist • Hastebin</p>
        </div>
        {results.length > 0 && (
          <button onClick={exportResults} className="ml-auto p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all">
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-[#1f1f1f] space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="password,leak,credentials (comma-separated)"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-[#2a2a2a] rounded-lg text-sm flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {results.length > 0 && (
          <div className="flex gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-600 mt-0.5" />
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-xs transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-[#1a1a1a] text-gray-500 hover:text-white'}`}>
                {f === 'all' ? `All (${counts.all})` : `${f[0].toUpperCase()}+${f.slice(1)} (${counts[f]})`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {filtered.map((result, i) => (
            <motion.div key={result.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#3a3a3a] transition-all">
              <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpanded(expanded === result.id ? null : result.id)}>
                <div className="shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: RISK_COLORS[result.riskLevel] + '20', color: RISK_COLORS[result.riskLevel] }}>
                      {result.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{result.source}</span>
                    <span className="text-xs text-gray-700 ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />{new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white truncate">{result.title || 'Untitled Paste'}</p>
                  {result.matches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.matches.map((m, j) => (
                        <span key={j} className="px-1 py-0.5 bg-yellow-900/20 border border-yellow-900/30 rounded text-xs text-yellow-400">"{m}"</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded === result.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[#2a2a2a]">
                    <div className="p-3 space-y-2">
                      <pre className="text-xs text-gray-300 bg-[#0d0d0d] rounded p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">{result.content}</pre>
                      <div className="flex items-center gap-2">
                        {result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-all">
                            <Link className="w-3 h-3" /> View paste
                          </a>
                        )}
                        {onInjectToChat && (
                          <button onClick={() => onInjectToChat(`## Paste Monitor Alert\nSource: ${result.source}\nTitle: ${result.title}\nRisk: ${result.riskLevel.toUpperCase()}\nKeywords matched: ${result.matches.join(', ')}\n\nContent preview:\n${result.content.substring(0, 500)}`)}
                            className="text-xs text-gray-600 hover:text-white transition-all ml-auto">Inject to Chat</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && results.length === 0 && (
          <div className="text-center py-12 text-gray-700">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Monitor paste sites for leaked data</p>
            <p className="text-xs mt-1">Enter keywords and click Search</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-sm">Scanning paste sites...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PasteMonitorPanel;
