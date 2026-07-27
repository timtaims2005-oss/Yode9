import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bitcoin, ArrowRight, AlertTriangle, Search, Loader2, Download, Activity, Link2 } from 'lucide-react';

interface TxNode {
  address: string;
  totalReceived: number;
  totalSent: number;
  balance: number;
  txCount: number;
  labels: string[];
  riskScore: number;
}

interface TxEdge {
  from: string;
  to: string;
  amount: number;
  txHash: string;
  timestamp: string;
}

interface BCResult {
  address: string;
  chain: string;
  node: TxNode;
  transactions: TxEdge[];
  warnings: string[];
  timestamp: string;
}

interface Props {
  onInjectToChat?: (text: string) => void;
}

export function BlockchainTracker({ onInjectToChat }: Props) {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<'bitcoin' | 'ethereum'>('bitcoin');
  const [traceMode, setTraceMode] = useState(false);
  const [traceDepth, setTraceDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BCResult | null>(null);
  const [error, setError] = useState('');

  const search = async () => {
    if (!address.trim()) { setError('Enter a blockchain address'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      if (traceMode) {
        const res = await fetch('/api/osint-intel/blockchain/trace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, depth: traceDepth, chain })
        });
        const data = await res.json();
        if (data.success) {
          setResult({ address, chain, node: data.data.nodes?.[0] || {}, transactions: data.data.edges || [], warnings: data.data.warnings || [], timestamp: new Date().toISOString() });
        } else setError(data.error);
      } else {
        const res = await fetch(`/api/osint-intel/blockchain/${address.trim()}?chain=${chain}`);
        const data = await res.json();
        if (data.success) {
          setResult({ address, chain, node: data.data.node, transactions: data.data.transactions || [], warnings: data.data.warnings || [], timestamp: new Date().toISOString() });
        } else setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chainIcon = chain === 'bitcoin' ? '₿' : 'Ξ';
  const chainColor = chain === 'bitcoin' ? 'text-orange-400' : 'text-purple-400';

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `blockchain-${result.address.slice(0, 8)}-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const formatBTC = (val: number) => val.toFixed(8);
  const truncateAddr = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#161616]">
        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <Bitcoin className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Blockchain Tracker</h2>
          <p className="text-xs text-gray-500">Bitcoin • Ethereum • Transaction Tracing</p>
        </div>
        {result && (
          <button onClick={exportResult} className="ml-auto p-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-gray-400 hover:text-green-400 transition-all">
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-[#1f1f1f] space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${chainColor}`}>{chainIcon}</span>
            <input value={address} onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={chain === 'bitcoin' ? '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf...' : '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA...'}
              className="w-full pl-8 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50 transition-colors" />
          </div>
          <button onClick={search} disabled={loading}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-[#2a2a2a] rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {(['bitcoin', 'ethereum'] as const).map(c => (
              <button key={c} onClick={() => setChain(c)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${chain === c ? (c === 'bitcoin' ? 'bg-orange-600 text-white' : 'bg-purple-600 text-white') : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
                {c === 'bitcoin' ? '₿ Bitcoin' : 'Ξ Ethereum'}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={traceMode} onChange={e => setTraceMode(e.target.checked)} className="rounded" />
            Trace graph
          </label>
          {traceMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Depth:</span>
              {[1, 2, 3].map(d => (
                <button key={d} onClick={() => setTraceDepth(d)}
                  className={`w-6 h-6 rounded text-xs transition-all ${traceDepth === d ? 'bg-orange-600 text-white' : 'bg-[#1a1a1a] text-gray-500 hover:text-white'}`}>{d}</button>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-lg font-bold ${chainColor}`}>{chainIcon}</span>
                  <p className="font-mono text-xs text-gray-300 break-all">{result.address}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Balance', value: `${formatBTC(result.node.balance)} ${chain === 'bitcoin' ? 'BTC' : 'ETH'}` },
                    { label: 'Received', value: `${formatBTC(result.node.totalReceived)}` },
                    { label: 'Transactions', value: result.node.txCount?.toLocaleString() || '0' }
                  ].map(s => (
                    <div key={s.label} className="bg-[#0d0d0d] rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-600 mb-1">{s.label}</p>
                      <p className={`text-sm font-bold ${chainColor}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-xs font-medium text-red-400">Suspicious Patterns Detected</p>
                  </div>
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-red-300 mt-1">• {w}</p>
                  ))}
                </div>
              )}

              {result.transactions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Recent Transactions ({result.transactions.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.transactions.slice(0, 20).map((tx, i) => (
                      <div key={i} className="bg-[#161616] border border-[#2a2a2a] rounded p-2.5 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono text-gray-400 truncate">{truncateAddr(tx.from)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                            <span className="font-mono text-gray-400 truncate">{truncateAddr(tx.to)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 font-mono">{truncateAddr(tx.txHash)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-bold ${chainColor}`}>{formatBTC(tx.amount)}</p>
                          <p className="text-xs text-gray-700">{chain === 'bitcoin' ? 'BTC' : 'ETH'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onInjectToChat && (
                <button onClick={() => onInjectToChat(`## Blockchain Analysis: ${result.address.slice(0, 12)}...\n\nChain: ${result.chain.toUpperCase()}\nBalance: ${formatBTC(result.node.balance)} ${chain === 'bitcoin' ? 'BTC' : 'ETH'}\nTransactions: ${result.node.txCount}\n\nWarnings: ${result.warnings.join('; ') || 'None'}`)}
                  className="w-full py-2 bg-[#161616] hover:bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg text-xs text-gray-400 hover:text-white transition-all">
                  Inject to Chat
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="text-center py-12 text-gray-700">
            <Link2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter a blockchain address</p>
            <p className="text-xs mt-1">Tracks Bitcoin and Ethereum transactions</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockchainTracker;
