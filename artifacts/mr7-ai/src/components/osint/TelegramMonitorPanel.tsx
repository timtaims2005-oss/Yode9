import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search, Loader2, AlertTriangle, Hash, Eye, Download, Filter, Clock } from 'lucide-react';

interface TelegramPost {
  id: number;
  channel: string;
  text: string;
  date: string;
  views?: number;
  keywords: string[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS = { critical: '#e21227', high: '#f97316', medium: '#eab308', low: '#22c55e' };

export function TelegramMonitorPanel({ onInjectToChat }: Props) {
  const [mode, setMode] = useState<'channel' | 'keyword'>('keyword');
  const [channelName, setChannelName] = useState('');
  const [keywords, setKeywords] = useState('exploit,breach,0day');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const search = async () => {
    setLoading(true); setError(''); setPosts([]);
    try {
      let res;
      if (mode === 'channel' && channelName) {
        const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);
        res = await fetch(`/api/osint-intel/telegram/channel/${encodeURIComponent(channelName)}?keywords=${kws.join(',')}`);
      } else {
        const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);
        res = await fetch('/api/osint-intel/telegram/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: kws })
        });
      }
      const data = await res.json();
      if (data.success) {
        setPosts(data.data.posts || []);
      } else setError(data.error || 'Search failed');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.riskLevel === filter);
  const counts = { all: posts.length, critical: 0, high: 0, medium: 0, low: 0 };
  posts.forEach(p => counts[p.riskLevel]++);

  const exportResults = () => {
    const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `telegram-monitor-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
          <MessageCircle className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Telegram Monitor</h2>
          <p className="text-xs text-gray-500">Public channels • Keyword detection</p>
        </div>
        {posts.length > 0 && (
          <button onClick={exportResults} className="ml-auto p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all">
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-[#1f1f1f] space-y-3">
        <div className="flex gap-1">
          {(['keyword', 'channel'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${mode === m ? 'bg-sky-600 text-white' : 'bg-[#1a1a1a] text-gray-500 hover:text-white'}`}>
              {m === 'keyword' ? 'By Keyword' : 'By Channel'}
            </button>
          ))}
        </div>

        {mode === 'channel' && (
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={channelName} onChange={e => setChannelName(e.target.value)}
              placeholder="channel_username (without @)"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition-colors" />
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="keyword1,keyword2,keyword3"
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-[#2a2a2a] rounded-lg text-sm flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {posts.length > 0 && (
          <div className="flex gap-1.5 items-center">
            <Filter className="w-3.5 h-3.5 text-gray-600" />
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-xs transition-all ${filter === f ? 'bg-sky-600 text-white' : 'bg-[#1a1a1a] text-gray-500 hover:text-white'}`}>
                {f === 'all' ? `All (${counts.all})` : `${f[0].toUpperCase()} (${counts[f as keyof typeof counts]})`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {filtered.map((post, i) => (
            <motion.div key={`${post.channel}-${post.id}-${i}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#3a3a3a] transition-all">
              <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
                <div className="p-1.5 bg-sky-900/20 rounded shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: RISK_COLORS[post.riskLevel] + '20', color: RISK_COLORS[post.riskLevel] }}>
                      {post.riskLevel.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium text-sky-400">@{post.channel}</span>
                    {post.views && (
                      <span className="text-xs text-gray-600 flex items-center gap-0.5 ml-auto">
                        <Eye className="w-3 h-3" />{post.views?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2">{post.text}</p>
                  {post.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.keywords.map((k, j) => (
                        <span key={j} className="px-1 py-0.5 bg-yellow-900/20 border border-yellow-900/30 rounded text-xs text-yellow-400">"{k}"</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expanded === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[#2a2a2a]">
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-gray-300 whitespace-pre-wrap">{post.text}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{new Date(post.date).toLocaleString()}
                        </span>
                        {onInjectToChat && (
                          <button onClick={() => onInjectToChat(`## Telegram Intelligence\nChannel: @${post.channel}\nRisk: ${post.riskLevel.toUpperCase()}\nKeywords: ${post.keywords.join(', ')}\n\n${post.text}`)}
                            className="text-xs text-gray-600 hover:text-white transition-all ml-auto">Inject</button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && posts.length === 0 && (
          <div className="text-center py-12 text-gray-700">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Monitor Telegram for threat intelligence</p>
            <p className="text-xs mt-1">Searches public channels for keywords</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-sky-400" />
              <p className="text-sm">Scanning Telegram channels...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TelegramMonitorPanel;
