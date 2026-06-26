import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModelResult {
  model: string;
  provider: string;
  response: string;
  latency: number;
  tokens: number;
  quality: number;
  cost: number;
  color: string;
  icon: string;
}

const MODELS = [
  { model:"gpt-4o", provider:"OpenAI", color:"#10b981", icon:"⬡" },
  { model:"claude-3-5-sonnet", provider:"Anthropic", color:"#f59e0b", icon:"◈" },
  { model:"gemini-1.5-pro", provider:"Google", color:"#3b82f6", icon:"◉" },
  { model:"llama-3.3-70b", provider:"Groq", color:"#e21227", icon:"▲" },
];

const SAMPLE_RESPONSES: Record<string, string[]> = {
  "gpt-4o":              ["Analyzing the threat vector using advanced pattern recognition...", "Cross-referencing CVE database and MITRE ATT&CK framework for comprehensive assessment.", "Recommended countermeasure: Deploy WAF ruleset and patch CVE-2024-XXXX immediately."],
  "claude-3-5-sonnet":   ["I'll carefully analyze this security scenario with methodical precision...", "The attack pattern suggests a sophisticated APT group using living-off-the-land techniques.", "Mitigation strategy: Implement zero-trust architecture with continuous verification."],
  "gemini-1.5-pro":      ["Processing security context across multiple threat intelligence dimensions...", "Multi-modal analysis confirms this matches known Lazarus Group TTPs.", "Recommended: Isolate affected systems, preserve forensic artifacts, notify CERT."],
  "llama-3.3-70b":       ["Rapid threat assessment initiated with sub-50ms inference...", "Pattern matching against 2.1B parameter threat signature database complete.", "Action: Block IP range 45.142.x.x, update EDR signatures, enable honeypot trap."],
};

const PROMPTS = [
  "Analyze this network anomaly: 847% spike in outbound DNS queries to *.onion domains",
  "What vulnerabilities exist in this endpoint: Apache 2.4.49 on Ubuntu 20.04?",
  "Reverse engineer this obfuscated PowerShell: IEX(New-Object Net.WebClient).Down...",
  "Threat hunt across 10TB of PCAP data for C2 beaconing patterns",
  "Analyze CVE-2024-12345 exploit chain and provide mitigation steps",
];

function ModelCard({ result, rank }: { result: ModelResult; rank: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: rank * 0.1, type: "spring", stiffness: 200 }}
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{ borderColor: result.color + "44", background: result.color + "08",
        boxShadow: rank === 0 ? `0 0 20px ${result.color}30` : "none" }}>

      {rank === 0 && (
        <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
          style={{ background: result.color + "22", color: result.color, border: `1px solid ${result.color}44` }}>
          ★ WINNER
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" style={{ filter: `drop-shadow(0 0 8px ${result.color})` }}>{result.icon}</span>
        <div>
          <div className="text-sm font-bold text-white">{result.model}</div>
          <div className="text-[10px] text-gray-500 font-mono">{result.provider}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-bold font-mono" style={{ color: result.color }}>
            {result.quality}/100
          </div>
          <div className="text-[10px] text-gray-600 font-mono">quality</div>
        </div>
      </div>

      <div className="text-xs text-gray-300 mb-3 leading-relaxed min-h-[60px] font-mono opacity-80">
        {result.response}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "LATENCY", value: `${result.latency}ms`, color: result.latency < 1000 ? "#10b981" : result.latency < 3000 ? "#ffd000" : "#e21227" },
          { label: "TOKENS", value: result.tokens.toLocaleString(), color: result.color },
          { label: "COST", value: `$${result.cost.toFixed(4)}`, color: "#a78bfa" },
        ].map(m => (
          <div key={m.label} className="text-center p-1.5 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-[10px] font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[9px] text-gray-600 font-mono">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-mono mb-1">
          <span className="text-gray-500">Quality Score</span>
          <span style={{ color: result.color }}>{result.quality}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5">
          <motion.div initial={{ width: 0 }} animate={{ width: `${result.quality}%` }}
            transition={{ delay: rank * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full" style={{ background: result.color, boxShadow: `0 0 6px ${result.color}80` }} />
        </div>
      </div>
    </motion.div>
  );
}

export function AIBattleStation() {
  const [results, setResults] = useState<ModelResult[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});

  const runBattle = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setProgress({});

    const prompt = customPrompt.trim() || PROMPTS[selectedPrompt];

    const simulate = (model: typeof MODELS[0]): Promise<ModelResult> =>
      new Promise(resolve => {
        const latency = 400 + Math.random() * 2800;
        const interval = setInterval(() => {
          setProgress(prev => ({ ...prev, [model.model]: Math.min(99, (prev[model.model] || 0) + Math.random() * 15) }));
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
          setProgress(prev => ({ ...prev, [model.model]: 100 }));
          const sentences = SAMPLE_RESPONSES[model.model] || ["Analyzing..."];
          const response = sentences.join(" ");
          resolve({
            ...model,
            response,
            latency: Math.round(latency),
            tokens: Math.floor(120 + Math.random() * 280),
            quality: Math.floor(72 + Math.random() * 27),
            cost: Math.random() * 0.02,
          });
        }, latency);
      });

    const settled = await Promise.allSettled(MODELS.map(simulate));
    const res = settled
      .filter((r): r is PromiseFulfilledResult<ModelResult> => r.status === "fulfilled")
      .map(r => r.value)
      .sort((a, b) => b.quality - a.quality);

    setResults(res);
    setRunning(false);
  }, [selectedPrompt, customPrompt]);

  return (
    <div className="rounded-xl border border-yellow-900/40 bg-black/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 30px rgba(245,158,11,0.08)" }}>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-900/30">
        <div className="w-2 h-2 rounded-full bg-yellow-400" style={{ boxShadow: "0 0 6px #f59e0b" }} />
        <span className="text-xs font-bold tracking-[0.15em] text-yellow-400">AI BATTLE STATION</span>
        <span className="ml-auto text-[10px] text-yellow-700 font-mono">
          {MODELS.length} MODELS COMPETING
        </span>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 font-mono mb-2">SELECT CHALLENGE PROMPT:</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PROMPTS.map((p, i) => (
              <button key={i} onClick={() => { setSelectedPrompt(i); setCustomPrompt(""); }}
                className="text-[10px] font-mono px-2 py-1 rounded border transition-all"
                style={{
                  borderColor: selectedPrompt === i && !customPrompt ? "#f59e0b44" : "#ffffff10",
                  background: selectedPrompt === i && !customPrompt ? "rgba(245,158,11,0.1)" : "transparent",
                  color: selectedPrompt === i && !customPrompt ? "#f59e0b" : "#666",
                }}>
                PROMPT-{i+1}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-400 font-mono bg-white/3 rounded-lg px-3 py-2 mb-2 min-h-[36px]">
            {customPrompt || PROMPTS[selectedPrompt]}
          </div>
          <input
            value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Or type custom prompt..."
            className="w-full bg-white/5 border border-yellow-900/20 rounded-lg px-3 py-2 text-xs text-yellow-100 font-mono placeholder-yellow-900/50 focus:outline-none focus:border-yellow-700/50" />
        </div>

        <button onClick={runBattle} disabled={running}
          className="w-full py-2.5 rounded-lg text-sm font-bold font-mono transition-all relative overflow-hidden"
          style={{
            background: running ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.15)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: running ? "#886020" : "#f59e0b",
          }}>
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span> BATTLE IN PROGRESS...
            </span>
          ) : "⚔ LAUNCH AI BATTLE"}
        </button>

        {running && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MODELS.map(m => (
              <div key={m.model} className="rounded-lg border border-white/10 p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono" style={{ color: m.color }}>{m.icon} {m.model}</span>
                  <span className="text-[10px] font-mono text-gray-500">{Math.round(progress[m.model] || 0)}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/5">
                  <motion.div animate={{ width: `${progress[m.model] || 0}%` }}
                    className="h-full rounded-full" style={{ background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map((r, i) => <ModelCard key={r.model} result={r} rank={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
