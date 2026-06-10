import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Play, Square, Search, Zap } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

interface FuzzResult {
  url: string; status: number; size: number; type: "found" | "interesting" | "error"; desc: string;
}

const WORDLIST_NAMES = ["Common Endpoints", "API v2 Routes", "Admin Paths", "Backup Files", "Hidden Params", "Custom (paste below)"];
const METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"];
const MUTATION_STRATEGIES = ["Directory Brute-Force", "Parameter Fuzzing", "Header Injection", "JSON Payload Mutation", "SQL Param Injection"];

function generateResults(baseUrl: string): FuzzResult[] {
  const results: FuzzResult[] = [];
  const paths = [
    ["/admin", 302, "Redirect to login", "found"],
    ["/api/v1/users", 200, "User list exposed", "found"],
    ["/api/v1/users?id=1 OR 1=1", 200, "SQLi reflected in response", "interesting"],
    ["/.git/HEAD", 200, "Git repo exposed", "interesting"],
    ["/backup.zip", 200, "Backup file accessible", "interesting"],
    ["/api/v2/admin", 403, "Admin endpoint (forbidden)", "found"],
    ["/.env", 200, "Environment file leaked", "interesting"],
    ["/api/v1/debug", 200, "Debug endpoint active", "interesting"],
    ["/wp-admin/", 302, "WordPress admin redirect", "found"],
    ["/api/v1/users/1/delete", 401, "Delete endpoint found", "found"],
    ["/config.json", 200, "Config file exposed", "interesting"],
    ["/api/v1/token", 200, "Token endpoint found", "found"],
    ["/phpinfo.php", 200, "PHP info page exposed", "interesting"],
    ["/api/v1/exec?cmd=id", 500, "Command injection attempt", "error"],
    ["/api/graphql", 200, "GraphQL endpoint found", "found"],
    ["/.htaccess", 403, "htaccess protected", "found"],
  ];
  paths.forEach(([path, status, desc, type]) => {
    results.push({ url: `${baseUrl}${path}`, status: status as number, size: Math.floor(Math.random() * 5000) + 200, type: type as FuzzResult["type"], desc: desc as string });
  });
  return results;
}

export function WebFuzzingModal({ open, onOpenChange }: Props) {
  const [url, setUrl] = useState("https://target.example.com");
  const [wordlist, setWordlist] = useState(WORDLIST_NAMES[0]);
  const [method, setMethod] = useState("GET");
  const [strategy, setStrategy] = useState(MUTATION_STRATEGIES[0]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<FuzzResult[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [found, setFound] = useState(0);
  const [customWordlist, setCustomWordlist] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startFuzz() {
    setResults([]); setRunning(true); setRequestCount(0); setFound(0);
    const generated = generateResults(url);
    let i = 0;
    reqTimerRef.current = setInterval(() => setRequestCount(c => c + Math.floor(Math.random() * 8) + 3), 150);
    timerRef.current = setInterval(() => {
      if (i >= generated.length) {
        clearInterval(timerRef.current!); clearInterval(reqTimerRef.current!); setRunning(false); return;
      }
      setResults(prev => [...prev, generated[i]]);
      setFound(prev => prev + (generated[i].type !== "error" ? 1 : 0));
      i++;
    }, 400);
  }

  function stop() {
    clearInterval(timerRef.current!); clearInterval(reqTimerRef.current!); setRunning(false);
  }

  const statusColor = (s: number) => s >= 500 ? "#e21227" : s >= 400 ? "#f97316" : s >= 300 ? "#fbbf24" : s >= 200 ? "#4ade80" : "#888";
  const typeColor = (t: FuzzResult["type"]) => t === "interesting" ? "#f97316" : t === "found" ? "#4ade80" : "#e21227";

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{ maxWidth: 1200, maxHeight: "90vh", background: "#080808", border: "1px solid #1a1a1a" }}
          initial={{ scale: 0.95 }} animate={{ scale: 1 }}>

          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#141414" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <Globe className="w-5 h-5" style={{ color: "#fbbf24" }} />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest" style={{ color: "#fbbf24" }}>AI WEB FUZZER</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "#2a2a2a" }}>Intelligent Fuzzing · Hidden Endpoints · API Discovery · SQLi/XSS Probe</div>
              </div>
            </div>
            {running || results.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="text-center"><div className="text-[9px] font-mono" style={{ color: "#333" }}>REQUESTS</div><div className="text-sm font-bold font-mono" style={{ color: "#fbbf24" }}>{requestCount.toLocaleString()}</div></div>
                <div className="text-center"><div className="text-[9px] font-mono" style={{ color: "#333" }}>FOUND</div><div className="text-sm font-bold font-mono" style={{ color: "#4ade80" }}>{found}</div></div>
                <div className="text-center"><div className="text-[9px] font-mono" style={{ color: "#333" }}>INTERESTING</div><div className="text-sm font-bold font-mono" style={{ color: "#f97316" }}>{results.filter(r => r.type === "interesting").length}</div></div>
              </div>
            ) : null}
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5">
              <X className="w-4 h-4" style={{ color: "#666" }} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="w-60 border-r flex flex-col p-4 gap-3 overflow-y-auto" style={{ borderColor: "#111" }}>
              <div>
                <div className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: "#333" }}>TARGET URL</div>
                <input value={url} onChange={e => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[10px] font-mono bg-transparent outline-none"
                  style={{ border: "1px solid #1a1a1a", color: "#888" }} />
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: "#333" }}>HTTP METHOD</div>
                <div className="grid grid-cols-3 gap-1">
                  {METHODS.map(m => (
                    <button key={m} onClick={() => setMethod(m)}
                      className="py-1 rounded text-[9px] font-bold"
                      style={{ background: method === m ? "rgba(251,191,36,0.12)" : "#0a0a0a", border: `1px solid ${method === m ? "rgba(251,191,36,0.35)" : "#111"}`, color: method === m ? "#fbbf24" : "#333" }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: "#333" }}>STRATEGY</div>
                <div className="flex flex-col gap-1">
                  {MUTATION_STRATEGIES.map(s => (
                    <button key={s} onClick={() => setStrategy(s)}
                      className="px-2 py-1.5 rounded-lg text-left text-[9px] font-mono"
                      style={{ background: strategy === s ? "rgba(251,191,36,0.08)" : "transparent", border: `1px solid ${strategy === s ? "rgba(251,191,36,0.25)" : "#0d0d0d"}`, color: strategy === s ? "#fbbf24" : "#2a2a2a" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: "#333" }}>WORDLIST</div>
                <div className="flex flex-col gap-1">
                  {WORDLIST_NAMES.map(w => (
                    <button key={w} onClick={() => setWordlist(w)}
                      className="px-2 py-1.5 rounded text-left text-[9px] font-mono"
                      style={{ background: wordlist === w ? "rgba(251,191,36,0.06)" : "transparent", border: `1px solid ${wordlist === w ? "rgba(251,191,36,0.2)" : "transparent"}`, color: wordlist === w ? "#fbbf24" : "#2a2a2a" }}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              {!running ? (
                <motion.button onClick={startFuzz} whileTap={{ scale: 0.97 }}
                  className="mt-auto py-2.5 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24" }}>
                  <Play className="w-3.5 h-3.5" /> START FUZZING
                </motion.button>
              ) : (
                <motion.button onClick={stop} whileTap={{ scale: 0.97 }}
                  className="mt-auto py-2.5 rounded-xl text-[10px] font-bold tracking-widest flex items-center justify-center gap-2"
                  style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                  <Square className="w-3.5 h-3.5" /> STOP
                </motion.button>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-2 border-b text-[9px] font-bold font-mono tracking-widest" style={{ borderColor: "#111", color: "#1a1a1a" }}>
                <span className="w-8">STATUS</span>
                <span className="flex-1">URL</span>
                <span className="w-16">SIZE</span>
                <span className="w-20">TYPE</span>
                <span className="flex-1">DESCRIPTION</span>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                {results.length === 0 && !running && (
                  <div className="h-full flex items-center justify-center" style={{ color: "#1a1a1a" }}>
                    <div className="text-center"><Globe className="w-10 h-10 mx-auto mb-2 opacity-20" /><div className="text-sm">Configure target and start fuzzing</div></div>
                  </div>
                )}
                {results.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 px-4 py-2 border-b hover:bg-white/2"
                    style={{ borderColor: "#080808" }}>
                    <span className="w-8 text-xs font-bold font-mono" style={{ color: statusColor(r.status) }}>{r.status}</span>
                    <span className="flex-1 text-[10px] font-mono truncate" style={{ color: r.type === "interesting" ? "#f97316" : "#555" }}>{r.url}</span>
                    <span className="w-16 text-[9px] font-mono" style={{ color: "#333" }}>{r.size}B</span>
                    <span className="w-20 text-[9px] font-bold uppercase" style={{ color: typeColor(r.type) }}>{r.type}</span>
                    <span className="flex-1 text-[9px]" style={{ color: "#333" }}>{r.desc}</span>
                  </motion.div>
                ))}
                {running && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <motion.div className="w-2 h-2 rounded-full" style={{ background: "#fbbf24" }} animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
                    <span className="text-[10px] font-mono" style={{ color: "#fbbf24" }}>Fuzzing {url} with {strategy}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
