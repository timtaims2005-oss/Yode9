import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Bell, BellOff, Trash2, Plus, X, Rss, AlertTriangle, Clock, Eye } from 'lucide-react';

interface MonitorAlert {
  id: string;
  keyword: string;
  source: 'paste' | 'telegram' | 'darkweb';
  title: string;
  content: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  url?: string;
  read: boolean;
}

interface MonitorKeyword {
  id: string;
  keyword: string;
  sources: ('paste' | 'telegram' | 'darkweb')[];
  active: boolean;
  alertCount: number;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

const RISK_COLORS = { critical: '#e21227', high: '#f97316', medium: '#eab308', low: '#22c55e' };

export function RealTimeMonitor({ onInjectToChat }: Props) {
  const [keywords, setKeywords] = useState<MonitorKeyword[]>([
    { id: '1', keyword: 'breach', sources: ['paste', 'telegram'], active: true, alertCount: 0 },
    { id: '2', keyword: 'exploit', sources: ['paste', 'darkweb'], active: true, alertCount: 0 }
  ]);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedSources, setSelectedSources] = useState<('paste' | 'telegram' | 'darkweb')[]>(['paste', 'telegram']);
  const [monitoring, setMonitoring] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef(0);

  const SOURCES = [
    { id: 'paste', label: 'Paste Sites', color: '#3b82f6' },
    { id: 'telegram', label: 'Telegram', color: '#0ea5e9' },
    { id: 'darkweb', label: 'Dark Web', color: '#e21227' }
  ] as const;

  const pollForAlerts = useCallback(async () => {
    const activeKws = keywords.filter(k => k.active);
    if (!activeKws.length) return;
    pollRef.current++;
    const sources = [...new Set(activeKws.flatMap(k => k.sources))];
    const kws = activeKws.map(k => k.keyword);
    try {
      const promises: Promise<any>[] = [];
      if (sources.includes('paste')) {
        promises.push(fetch('/api/osint-intel/paste/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: kws })
        }).then(r => r.json()).catch(() => ({ success: false })));
      }
      if (sources.includes('telegram')) {
        promises.push(fetch('/api/osint-intel/telegram/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: kws })
        }).then(r => r.json()).catch(() => ({ success: false })));
      }
      const results = await Promise.all(promises);
      const newAlerts: MonitorAlert[] = [];
      for (const result of results) {
        if (!result.success || !result.data) continue;
        const items = result.data.results || result.data.posts || [];
        for (const item of items.slice(0, 5)) {
          const matched = kws.filter(k => (item.text || item.content || '').toLowerCase().includes(k.toLowerCase()));
          if (!matched.length) continue;
          const alertId = `alert-${item.id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          if (alerts.some(a => a.id === alertId)) continue;
          newAlerts.push({
            id: alertId,
            keyword: matched[0],
            source: item.channel ? 'telegram' : 'paste',
            title: item.title || item.channel || 'Unknown',
            content: (item.text || item.content || '').substring(0, 300),
            riskLevel: item.riskLevel || 'medium',
            timestamp: new Date(),
            url: item.url,
            read: false
          });
        }
      }
      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 100));
        setUnreadCount(c => c + newAlerts.length);
        setKeywords(prev => prev.map(k => ({
          ...k,
          alertCount: k.alertCount + newAlerts.filter(a => a.keyword === k.keyword).length
        })));
      }
    } catch {}
  }, [keywords, alerts]);

  useEffect(() => {
    if (monitoring) {
      intervalRef.current = setInterval(pollForAlerts, 60_000);
      pollForAlerts();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [monitoring, pollForAlerts]);

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    setKeywords(prev => [...prev, {
      id: Date.now().toString(), keyword: newKeyword.trim(),
      sources: selectedSources, active: true, alertCount: 0
    }]);
    setNewKeyword(''); setShowAddForm(false);
  };

  const removeKeyword = (id: string) => setKeywords(prev => prev.filter(k => k.id !== id));
  const toggleKeyword = (id: string) => setKeywords(prev => prev.map(k => k.id === id ? { ...k, active: !k.active } : k));
  const markAllRead = () => { setAlerts(prev => prev.map(a => ({ ...a, read: true }))); setUnreadCount(0); };
  const clearAlerts = () => { setAlerts([]); setUnreadCount(0); };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className={`p-2 rounded-lg border ${monitoring ? 'bg-green-500/10 border-green-500/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
          <Rss className={`w-5 h-5 ${monitoring ? 'text-green-400' : 'text-gray-500'}`} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Real-Time Monitor</h2>
          <p className="text-xs text-gray-500">Paste Sites • Telegram • Dark Web</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-600 rounded-full text-xs font-bold text-white">{unreadCount}</span>
          )}
          <button onClick={() => setMonitoring(m => !m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${monitoring ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
            {monitoring ? <><BellOff className="w-3.5 h-3.5" /> Stop</> : <><Bell className="w-3.5 h-3.5" /> Monitor</>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 border-r border-[#1f1f1f] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Keywords</span>
            <button onClick={() => setShowAddForm(s => !s)} className="p-1 hover:bg-[#2a2a2a] rounded text-gray-500 hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-[#1f1f1f] p-2 space-y-2 bg-[#111]">
                <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()}
                  placeholder="keyword..."
                  className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-white placeholder-gray-600 focus:outline-none" />
                <div className="flex flex-wrap gap-1">
                  {SOURCES.map(s => (
                    <button key={s.id} onClick={() => setSelectedSources(prev =>
                      prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                      style={{ borderColor: selectedSources.includes(s.id) ? s.color : undefined }}
                      className={`px-1.5 py-0.5 rounded border text-xs transition-all ${selectedSources.includes(s.id) ? 'text-white' : 'border-[#2a2a2a] text-gray-600'}`}>
                      {s.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <button onClick={addKeyword} className="w-full py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-all">Add</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto">
            {keywords.map(kw => (
              <div key={kw.id} className="flex items-center gap-1.5 px-3 py-2 border-b border-[#111] hover:bg-[#111] group">
                <button onClick={() => toggleKeyword(kw.id)}
                  className={`w-2 h-2 rounded-full transition-all ${kw.active ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="flex-1 text-xs text-gray-300 truncate">{kw.keyword}</span>
                {kw.alertCount > 0 && <span className="text-xs text-red-400 font-bold">{kw.alertCount}</span>}
                <button onClick={() => removeKeyword(kw.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-gray-600 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-[#1f1f1f]">
            {monitoring && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
            <span className="text-xs text-gray-500">Alerts ({alerts.length})</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 transition-all">Mark all read</button>}
              {alerts.length > 0 && <button onClick={clearAlerts} className="p-1 hover:bg-[#2a2a2a] rounded text-gray-500 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <AnimatePresence>
              {alerts.map(alert => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  className={`bg-[#161616] border rounded-lg p-3 transition-all ${!alert.read ? 'border-l-2' : 'border-[#2a2a2a]'}`}
                  style={!alert.read ? { borderLeftColor: RISK_COLORS[alert.riskLevel] } : undefined}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: RISK_COLORS[alert.riskLevel] + '20', color: RISK_COLORS[alert.riskLevel] }}>
                        {alert.riskLevel.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{alert.source}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-gray-700" />
                      <span className="text-xs text-gray-700">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-300 mb-1">{alert.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{alert.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-xs text-blue-400">"{alert.keyword}"</span>
                    {onInjectToChat && (
                      <button onClick={() => onInjectToChat(`## Real-Time Alert\nSource: ${alert.source}\nKeyword: "${alert.keyword}"\nRisk: ${alert.riskLevel.toUpperCase()}\n\n${alert.content}`)}
                        className="text-xs text-gray-600 hover:text-white transition-all">Inject</button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-700 py-12">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">{monitoring ? 'Monitoring — waiting for alerts...' : 'Start monitoring to receive alerts'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealTimeMonitor;
