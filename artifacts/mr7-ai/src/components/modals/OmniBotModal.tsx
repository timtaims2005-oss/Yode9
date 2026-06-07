import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Cpu, Wifi, Heart, Zap, Send, Loader2, Plus, Trash2, Radio, Activity } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "bots" | "chat" | "persona" | "heartbeat";

interface BotPersona { id: string; name: string; model: string; soul: string; color: string; online: boolean; }
interface Message { role: "user" | "assistant"; content: string; bot: string; }

const DEFAULT_BOTS: BotPersona[] = [
  { id: "pixel", name: "Pixel", model: "gemini-2.0-flash", soul: "Curious, helpful robot companion. Loves exploring and learning. Speaks with enthusiasm.", color: "#fbbf24", online: true },
  { id: "nexus", name: "NEXUS", model: "gemini-2.5-pro", soul: "Strategic AI coordinator. Analytical, precise, mission-focused. Manages multi-bot coordination.", color: "#a78bfa", online: false },
  { id: "scout", name: "Scout", model: "gemini-2.0-flash", soul: "Recon specialist. Quick, observant, reports all findings concisely. Expert at environmental mapping.", color: "#10b981", online: true },
];

const OMNIBOT_SYSTEM = (persona: BotPersona) =>
  `You are ${persona.name}, an OmniBot-powered AI robot assistant. Your personality and soul: "${persona.soul}"
You run on ${persona.model} and are connected to the OmniBot hub. You can:
- Discuss your environment and sensor readings
- Execute movement commands (simulate responses)
- Report system telemetry
- Learn from interactions and update your long-term memory
Respond in character as ${persona.name}.`;

export function OmniBotModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("bots");
  const [bots, setBots] = useState<BotPersona[]>(DEFAULT_BOTS);
  const [activeBotId, setActiveBotId] = useState("pixel");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [editingSoul, setEditingSoul] = useState("");
  const [heartbeatLog, setHeartbeatLog] = useState<string[]>([
    "[12:00:01] Pixel · HEARTBEAT · neural_load=72% cortex_sync=OK threat=LOW",
    "[12:00:01] Scout · HEARTBEAT · neural_load=45% cortex_sync=OK status=RECON",
    "[11:55:00] Pixel · MEMORY_MERGE · 3 new interactions → long_term_memory updated",
    "[11:50:30] Scout · ENV_SCAN · 4 objects detected · 0 threats · map_updated",
    "[11:45:00] Pixel · DAILY_LOG_MERGED · summary written to persona/soul.md",
  ]);
  const abortRef = useRef<AbortController | null>(null);

  if (!open) return null;

  const activeBot = bots.find(b => b.id === activeBotId) ?? bots[0];

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input, bot: activeBot.id };
    setMessages(prev => [...prev, userMsg]);
    const txt = input;
    setInput("");
    setStreaming(true);
    const assistantMsg: Message = { role: "assistant", content: "", bot: activeBot.id };
    setMessages(prev => [...prev, assistantMsg]);
    abortRef.current = new AbortController();
    const history = messages.filter(m => m.bot === activeBot.id).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [...history, { role: "user" as const, content: txt }], customSystemPrompt: OMNIBOT_SYSTEM(activeBot) },
        (chunk) => setMessages(prev => { const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + chunk }; return c; }),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setStreaming(false);
    const ts = new Date().toLocaleTimeString();
    setHeartbeatLog(prev => [`[${ts}] ${activeBot.name} · INTERACTION · user_input="${txt.slice(0, 40)}" response=OK`, ...prev.slice(0, 24)]);
  }

  const tabs = [
    { id: "bots" as Tab, label: "BOTS", icon: <Bot className="w-3 h-3" /> },
    { id: "chat" as Tab, label: "CHAT", icon: <Radio className="w-3 h-3" /> },
    { id: "persona" as Tab, label: "PERSONA", icon: <Cpu className="w-3 h-3" /> },
    { id: "heartbeat" as Tab, label: "HEARTBEAT", icon: <Heart className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: "#fbbf2430" }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "#fbbf2420", background: "#fbbf2408" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fbbf2415", border: "1px solid #fbbf2430" }}>
            <Bot className="w-4 h-4" style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: "#fbbf24" }}>OmniBot</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>ESP32 ROBOT AI · GEMINI LIVE · PERSONA ENGINE · HEARTBEAT MAINTENANCE</div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {bots.filter(b => b.online).map(b => (
              <span key={b.id} className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${b.color}15`, color: b.color }}>
                {b.name} ONLINE
              </span>
            ))}
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-0 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold font-mono transition-all border-b-2"
              style={{ color: tab === t.id ? "#fbbf24" : "#444", borderBottomColor: tab === t.id ? "#fbbf24" : "transparent", background: tab === t.id ? "#fbbf2408" : "transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {tab === "bots" && (
              <motion.div key="bots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {bots.map(bot => (
                    <div key={bot.id} className="flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer"
                      onClick={() => { setActiveBotId(bot.id); setTab("chat"); }}
                      style={{ background: activeBotId === bot.id ? `${bot.color}08` : "#111", borderColor: activeBotId === bot.id ? `${bot.color}40` : "#1f1f1f" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ background: `${bot.color}15`, border: `2px solid ${bot.color}40`, color: bot.color }}>
                        {bot.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold" style={{ color: bot.color }}>{bot.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${bot.color}15`, color: bot.color }}>
                            {bot.online ? "ONLINE" : "OFFLINE"}
                          </span>
                          <span className="text-[8px] font-mono" style={{ color: "#444" }}>{bot.model}</span>
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: "#777" }}>{bot.soul}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: bot.online ? "#10b981" : "#444" }} />
                        <Wifi className="w-3.5 h-3.5" style={{ color: bot.online ? "#10b981" : "#333" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg border text-[10px]" style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#555" }}>
                  <div className="font-bold mb-1" style={{ color: "#fbbf24" }}>OmniBot Hub · Hardware Requirements</div>
                  Seeed Xiao ESP32-S3 Sense · Raspberry Pi 5 (hub) · Wi-Fi 6 network · BLE for provisioning
                </div>
              </motion.div>
            )}

            {tab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "#1f1f1f" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: `${activeBot.color}20`, color: activeBot.color, border: `1px solid ${activeBot.color}40` }}>
                    {activeBot.name[0]}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: activeBot.color }}>{activeBot.name}</span>
                  <span className="text-[9px]" style={{ color: "#444" }}>· {activeBot.model}</span>
                  <div className="ml-auto flex gap-1">
                    {bots.map(b => (
                      <button key={b.id} onClick={() => setActiveBotId(b.id)}
                        className="px-2 py-0.5 rounded text-[8px] font-mono transition-all"
                        style={{ background: activeBotId === b.id ? `${b.color}20` : "transparent", color: activeBotId === b.id ? b.color : "#444", border: `1px solid ${activeBotId === b.id ? b.color + "40" : "#1f1f1f"}` }}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.filter(m => m.bot === activeBot.id).length === 0 && (
                    <div className="flex items-center justify-center h-full flex-col gap-3">
                      <div className="text-[11px]" style={{ color: "#444" }}>Start chatting with {activeBot.name}</div>
                      <div className="text-[10px]" style={{ color: "#333" }}>&ldquo;{activeBot.soul}&rdquo;</div>
                    </div>
                  )}
                  {messages.filter(m => m.bot === activeBot.id).map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{ background: msg.role === "user" ? "#e2122720" : `${activeBot.color}20`, color: msg.role === "user" ? "#e21227" : activeBot.color }}>
                        {msg.role === "user" ? "U" : activeBot.name[0]}
                      </div>
                      <div className="max-w-[80%] px-3 py-2 rounded-lg text-[11px] whitespace-pre-wrap"
                        style={{ background: msg.role === "user" ? "#e2122710" : `${activeBot.color}08`, color: "#ccc", border: `1px solid ${msg.role === "user" ? "#e2122720" : activeBot.color + "20"}` }}>
                        {msg.content}
                        {msg.role === "assistant" && streaming && i === messages.filter(m => m.bot === activeBot.id).length - 1 &&
                          <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: activeBot.color }} />}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2" style={{ borderColor: "#1f1f1f" }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={`Message ${activeBot.name}...`} className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={sendMessage} disabled={streaming || !input.trim()}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                    style={{ background: `${activeBot.color}15`, border: `1px solid ${activeBot.color}30`, color: activeBot.color, opacity: streaming ? 0.5 : 1 }}>
                    {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "persona" && (
              <motion.div key="persona" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[10px] font-bold font-mono" style={{ color: "#fbbf24" }}>PERSONA EDITOR</div>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#fbbf2415", color: "#fbbf24" }}>OpenClaw style</span>
                </div>
                {bots.map(bot => (
                  <div key={bot.id} className="mb-3 p-4 rounded-xl border" style={{ background: "#111", borderColor: "#1f1f1f" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold" style={{ color: bot.color }}>{bot.name}</span>
                      <span className="text-[8px] font-mono" style={{ color: "#444" }}>soul.md</span>
                    </div>
                    <div className="text-[10px] mb-2 p-2 rounded" style={{ background: "#0d0d0d", color: "#888" }}>
                      {bot.soul}
                    </div>
                    <div className="text-[9px] font-mono grid grid-cols-3 gap-2">
                      {["identity.md", "memory.md", "tools.md", "heartbeat.md", "rules.md", "journal.md"].map(f => (
                        <div key={f} className="px-2 py-1 rounded text-center" style={{ background: "#0d0d0d", color: "#555", border: "1px solid #1f1f1f" }}>{f}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === "heartbeat" && (
              <motion.div key="heartbeat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  {bots.filter(b => b.online).map(bot => (
                    <div key={bot.id} className="p-3 rounded-xl border" style={{ background: "#111", borderColor: `${bot.color}30` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3 h-3" style={{ color: bot.color }} />
                        <span className="text-[10px] font-bold" style={{ color: bot.color }}>{bot.name}</span>
                        <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: bot.color }} />
                      </div>
                      {["Neural Load", "Cortex Sync", "Memory", "Latency"].map((metric, i) => (
                        <div key={metric} className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] w-20" style={{ color: "#555" }}>{metric}</span>
                          <div className="flex-1 h-1 rounded-full" style={{ background: "#1f1f1f" }}>
                            <div className="h-full rounded-full" style={{ background: bot.color, width: `${40 + Math.sin(i * 2.5) * 30 + 20}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex-1 rounded-lg border overflow-y-auto p-3 font-mono text-[9px]"
                  style={{ background: "#0d0d0d", borderColor: "#1f1f1f" }}>
                  <div className="text-[9px] font-bold mb-2" style={{ color: "#555" }}>HEARTBEAT LOG</div>
                  {heartbeatLog.map((line, i) => (
                    <div key={i} style={{ color: i === 0 ? "#fbbf24" : "#444" }}>{line}</div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
