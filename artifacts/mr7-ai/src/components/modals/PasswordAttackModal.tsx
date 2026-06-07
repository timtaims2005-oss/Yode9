import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Terminal, Zap, Lock, Play, Database, Hash, Key } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const ATTACK_TYPES = [
  { id: "bruteforce", label: "Brute Force", icon: Zap, color: "#ef4444", desc: "Systematically try all possible combinations until the correct one is found." },
  { id: "dictionary", label: "Dictionary", icon: Database, color: "#f59e0b", desc: "Attack using wordlists like rockyou.txt, SecLists, or custom dictionaries." },
  { id: "hashcrack", label: "Hash Cracking", icon: Hash, color: "#8b5cf6", desc: "Crack MD5, SHA1, SHA256, NTLM, bcrypt, and other hash formats." },
  { id: "mutation", label: "Password Mutation", icon: Key, color: "#3b82f6", desc: "Apply rules and transformations: 1337 speak, append numbers, case variations." },
  { id: "hybrid", label: "Hybrid Attack", icon: Shield, color: "#10b981", desc: "Combine dictionary words with brute force extensions for higher coverage." },
  { id: "spray", label: "Password Spraying", icon: Terminal, color: "#f97316", desc: "Try common passwords against many accounts to avoid lockout policies." },
];

const TOOLS = [
  { name: "Hashcat", lang: "CUDA/OpenCL", tags: ["GPU", "Hash", "Rules", "Masks"] },
  { name: "John the Ripper", lang: "C", tags: ["Cross-platform", "Hash", "Dictionary"] },
  { name: "Hydra", lang: "C", tags: ["Online", "Network", "SSH/FTP/HTTP"] },
  { name: "Medusa", lang: "C", tags: ["Parallel", "Network", "Modular"] },
  { name: "CrackStation", lang: "Web", tags: ["Lookup", "Rainbow Table", "Free"] },
  { name: "Aircrack-ng", lang: "C", tags: ["WPA/WEP", "WiFi", "Capture"] },
  { name: "THC-Hydra", lang: "C", tags: ["Network", "50+ protocols", "Fast"] },
  { name: "RainbowCrack", lang: "C++", tags: ["Rainbow Table", "Time-memory tradeoff"] },
];

const WORDLISTS = [
  { name: "rockyou.txt", size: "14M passwords", url: "SecLists" },
  { name: "kaonashi.txt", size: "1.4B hashes", url: "crackstation" },
  { name: "SecLists/Passwords", size: "100+ lists", url: "danielmiessler/SecLists" },
  { name: "hashesorg2019", size: "550M hashes", url: "hashesorg" },
];

export function PasswordAttackModal({ open, onOpenChange }: Props) {
  const [selectedAttack, setSelectedAttack] = useState("bruteforce");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"attacks" | "tools" | "wordlists">("attacks");

  const attack = ATTACK_TYPES.find(a => a.id === selectedAttack)!;

  const runQuery = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const systemPrompt = `You are an expert in password security, penetration testing, and offensive security. Focus on the "${attack.label}" technique: ${attack.desc}

Provide detailed technical information for authorized security testing, CTF challenges, and penetration testing. Include:
- Specific tool commands (hashcat, john, hydra, medusa, etc.)
- Wordlist recommendations
- Attack optimization strategies  
- Hash format identification
- Defense countermeasures

Always note these techniques require explicit authorization to use on target systems.`;
      await streamChat({ model: "gpt-5.4", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: query }], customSystemPrompt: systemPrompt }, (chunk) => { setResponse(p => p + chunk); }, undefined);
    } catch {
      setResponse("Error connecting to AI. Please add your OPENAI_API_KEY in Secrets.");
    } finally {
      setStreaming(false);
    }
  };

  const HASHCAT_EXAMPLES: Record<string, string> = {
    bruteforce: "# Brute force 8-char alphanumeric\nhashcat -m 0 hash.txt -a 3 ?a?a?a?a?a?a?a?a\n\n# Increment mode (auto-length)\nhashcat -m 1000 ntlm.txt -a 3 --increment ?a?a?a?a?a?a?a?a",
    dictionary: "# Dictionary attack with rockyou\nhashcat -m 0 hash.txt rockyou.txt\n\n# Multiple wordlists\nhashcat -m 0 hash.txt rockyou.txt custom.txt",
    hashcrack: "# Identify hash type\nhashid hash.txt\n\n# SHA256 crack\nhashcat -m 1400 sha256.txt rockyou.txt\n\n# bcrypt (slow)\nhashcat -m 3200 bcrypt.txt rockyou.txt",
    mutation: "# Built-in rules\nhashcat -m 0 hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule\n\n# Toggle case + append digits\nhashcat -m 0 hash.txt rockyou.txt -r toggles1.rule -r append_nums.rule",
    hybrid: "# Dictionary + mask (append 4 digits)\nhashcat -m 0 hash.txt -a 6 rockyou.txt ?d?d?d?d\n\n# Mask + dictionary\nhashcat -m 0 hash.txt -a 7 ?u rockyou.txt",
    spray: "# Hydra SSH spray\nhydra -L users.txt -p 'Password123!' ssh://target.com\n\n# HTTP form\nhydra -L users.txt -P passwords.txt target.com http-post-form '/login:user=^USER^&pass=^PASS^:F=failed'",
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: "#080808", borderColor: "rgba(239,68,68,0.25)", maxHeight: "90vh" }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(239,68,68,0.15)", background: "linear-gradient(135deg,#0f0404,#080808)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <Lock className="w-4 h-4" style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#ef4444" }}>Password Attack Hub</div>
                  <div className="text-[10px] font-mono" style={{ color: "#555" }}>Brute Force · Dictionary · Hash Cracking · Mutation</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" style={{ color: "#444" }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {(["attacks", "tools", "wordlists"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors capitalize"
                  style={{ borderColor: activeTab === tab ? "#ef4444" : "transparent", color: activeTab === tab ? "#ef4444" : "#333" }}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {activeTab === "attacks" && (
                <div className="flex h-full min-h-0">
                  {/* Attack Types */}
                  <div className="w-44 border-r py-2" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
                    {ATTACK_TYPES.map(a => {
                      const Icon = a.icon;
                      return (
                        <button key={a.id} onClick={() => setSelectedAttack(a.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[10px] font-bold transition-all mx-2 rounded-lg mb-0.5"
                          style={{ background: selectedAttack === a.id ? `${a.color}15` : "transparent", color: selectedAttack === a.id ? a.color : "#444", border: `1px solid ${selectedAttack === a.id ? `${a.color}25` : "transparent"}`, width: "calc(100% - 16px)" }}>
                          <Icon className="w-3 h-3 flex-shrink-0" />{a.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-1 flex flex-col min-w-0 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <attack.icon className="w-4 h-4" style={{ color: attack.color }} />
                      <span className="text-sm font-bold" style={{ color: attack.color }}>{attack.label}</span>
                    </div>
                    <p className="text-[10px] font-mono mb-3" style={{ color: "#444" }}>{attack.desc}</p>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Example Commands</div>
                    <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto mb-4" style={{ background: "rgba(0,0,0,0.5)", color: "#86efac", lineHeight: 1.6 }}>
                      {HASHCAT_EXAMPLES[selectedAttack]}
                    </pre>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>AI Assistant</div>
                    {response && (
                      <div className="overflow-y-auto rounded-lg p-3 mb-3 text-[11px] font-mono leading-relaxed" style={{ background: "rgba(0,0,0,0.4)", color: "#aaa", whiteSpace: "pre-wrap", maxHeight: "180px" }}>
                        {response}
                        {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-red-400 animate-pulse" />}
                      </div>
                    )}
                    <div className="flex gap-2 mt-auto">
                      <input value={query} onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && runQuery()}
                        placeholder={`Ask about ${attack.label}...`}
                        className="flex-1 px-3 py-2 rounded-lg text-[11px] font-mono border outline-none"
                        style={{ background: "#0a0a0a", borderColor: `${attack.color}25`, color: "#ddd" }} />
                      <button onClick={runQuery} disabled={!query.trim() || streaming}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                        style={{ background: query.trim() && !streaming ? `${attack.color}20` : "rgba(255,255,255,0.05)", color: query.trim() && !streaming ? attack.color : "#333", border: `1px solid ${query.trim() && !streaming ? `${attack.color}40` : "rgba(255,255,255,0.08)"}` }}>
                        <Play className="w-3 h-3" />Go
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tools" && (
                <div className="p-5 grid grid-cols-2 gap-3">
                  {TOOLS.map(tool => (
                    <div key={tool.name} className="p-4 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold" style={{ color: "#ef4444" }}>{tool.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#444" }}>{tool.lang}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tool.tags.map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(239,68,68,0.08)", color: "#666" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "wordlists" && (
                <div className="p-5 space-y-3">
                  {WORDLISTS.map(wl => (
                    <div key={wl.name} className="p-4 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0a" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-bold font-mono" style={{ color: "#ef4444" }}>{wl.name}</div>
                          <div className="text-[9px] font-mono mt-0.5" style={{ color: "#333" }}>{wl.size} · {wl.url}</div>
                        </div>
                        <Terminal className="w-3.5 h-3.5" style={{ color: "#333" }} />
                      </div>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl border text-[10px] font-mono" style={{ borderColor: "rgba(239,68,68,0.1)", background: "rgba(239,68,68,0.03)", color: "#444" }}>
                    <span style={{ color: "#ef4444" }}>Note:</span> Only use these against systems you own or have explicit written authorization to test.
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              <div className="text-[9px] font-mono" style={{ color: "#222" }}>Authorized testing only · Educational purposes</div>
              <Lock className="w-3.5 h-3.5" style={{ color: "#1a1a1a" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
