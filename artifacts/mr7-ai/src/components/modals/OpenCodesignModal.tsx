import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Code2, Palette, Users, MessageSquare, GitBranch, Play,
  Eye, Layers, Zap, ChevronRight, Send, RefreshCw, Copy,
  CheckCheck, Monitor, Smartphone, Tablet, Share2, Download,
  Settings, Search, Plus, Star, Clock, ExternalLink, Brain,
} from "lucide-react";

const T = "#14b8a6"; // teal
const Tg = (n: number) => `rgba(20,184,166,${n})`;
const VIOLET = "#8b5cf6";

interface OpenCodesignModalProps { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "editor" | "preview" | "collab" | "history";
type Viewport = "desktop" | "tablet" | "mobile";

const COLLAB_USERS = [
  { name: "Alice Chen",    role: "Designer",   color: "#f97316", cursor: "⬡" },
  { name: "Bob Torres",    role: "Engineer",   color: "#60a5fa", cursor: "◆" },
  { name: "Sara Kim",      role: "PM",         color: "#a78bfa", cursor: "●" },
];

const HISTORY_ENTRIES = [
  { user: "Alice", action: "Updated Hero gradient colors",    ts: "2m ago",  color: "#f97316" },
  { user: "Bob",   action: "Added responsive breakpoints",    ts: "8m ago",  color: "#60a5fa" },
  { user: "Sara",  action: "Added CTA button component",      ts: "15m ago", color: "#a78bfa" },
  { user: "Alice", action: "Imported Figma design tokens",    ts: "32m ago", color: "#f97316" },
  { user: "Bob",   action: "Synced Tailwind config",          ts: "1h ago",  color: "#60a5fa" },
];

const STARTER_CODE = `/* Open Codesign — Live Design Editor */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 24px;
  background: linear-gradient(135deg,
    #0f172a 0%,
    #1e3a5f 50%,
    #0f172a 100%
  );
  min-height: 100vh;
}

.hero__title {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 900;
  color: #ffffff;
  text-align: center;
  background: linear-gradient(to right, #3b82f6, #14b8a6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero__cta {
  margin-top: 32px;
  padding: 16px 40px;
  background: #3b82f6;
  border: none;
  border-radius: 100px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(59,130,246,0.4);
}`;

const VIEWPORT_WIDTHS: Record<Viewport, number> = { desktop: 100, tablet: 60, mobile: 35 };

export function OpenCodesignModal({ open, onOpenChange }: OpenCodesignModalProps) {
  const [tab, setTab] = useState<Tab>("editor");
  const [code, setCode] = useState(STARTER_CODE);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { user: "Sara",  text: "Can we make the gradient more vibrant?", color: "#a78bfa" },
    { user: "Alice", text: "Sure! I'll update the color stops.",      color: "#f97316" },
    { user: "Bob",   text: "Also added the mobile breakpoint.",        color: "#60a5fa" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(m => [...m, { user: "You", text: chatInput, color: T }]);
    setChatInput("");
  };

  const aiGenerate = useCallback(async () => {
    setAiLoading(true);
    try {
      const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "Generate a beautiful CSS snippet for a modern hero section with glassmorphism card. Return only valid CSS, no markdown." }], stream: false }) });
      if (resp.ok) { const d = await resp.json() as { content?: string }; if (d.content) setCode(d.content); }
    } catch { /* */ }
    setAiLoading(false);
  }, []);

  if (!open) return null;

  const TabBtn = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: typeof Code2 }) => (
    <button onClick={() => setTab(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all" style={{ background: tab === id ? Tg(0.14) : "rgba(255,255,255,0.03)", border: `1px solid ${tab === id ? Tg(0.45) : "rgba(255,255,255,0.07)"}`, color: tab === id ? T : "rgba(255,255,255,0.45)" }}>
      <Icon size={11} />{label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg,#030d0b 0%,#050f0d 100%)", border: `1px solid ${Tg(0.2)}`, boxShadow: `0 0 80px ${Tg(0.1)}` }} initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}>

          <motion.div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${T},transparent)` }} />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: Tg(0.12), background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: Tg(0.15), border: `1px solid ${Tg(0.35)}` }} animate={{ boxShadow: [`0 0 8px ${Tg(0.2)}`, `0 0 20px ${Tg(0.4)}`, `0 0 8px ${Tg(0.2)}`] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Code2 size={16} style={{ color: T }} />
              </motion.div>
              <div>
                <div className="text-sm font-black font-mono" style={{ color: T }}>OPEN CODESIGN</div>
                <div className="text-[10px] font-mono" style={{ color: "#333" }}>Collaborative Code + Design Platform</div>
              </div>
              {/* Online users */}
              <div className="hidden sm:flex items-center gap-1 ml-2">
                {COLLAB_USERS.map(u => (
                  <div key={u.name} title={`${u.name} (${u.role})`} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-black" style={{ background: u.color + "33", color: u.color }}>
                    {u.name[0]}
                  </div>
                ))}
                <span className="ml-1 text-[10px] font-mono" style={{ color: "#444" }}>3 online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: Tg(0.1), border: `1px solid ${Tg(0.25)}`, color: T }}>
                <Share2 size={11} />Invite
              </button>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <X size={14} style={{ color: "#666" }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: Tg(0.07) }}>
            <TabBtn id="editor"  label="EDITOR"   icon={Code2}        />
            <TabBtn id="preview" label="PREVIEW"  icon={Eye}          />
            <TabBtn id="collab"  label="COLLAB"   icon={MessageSquare}/>
            <TabBtn id="history" label="HISTORY"  icon={Clock}        />
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* ── EDITOR ── */}
              {tab === "editor" && (
                <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full">
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: Tg(0.07) }}>
                      <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "#444" }}>
                        <Palette size={11} style={{ color: T }} /><span style={{ color: T }}>hero.css</span>
                        <span style={{ color: "#282828" }}>|</span>
                        <GitBranch size={10} style={{ color: "#333" }} /><span>main</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={aiGenerate} disabled={aiLoading} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: Tg(0.08), border: `1px solid ${Tg(0.2)}`, color: T }}>
                          {aiLoading ? <RefreshCw size={10} className="animate-spin" /> : <Brain size={10} />}AI GENERATE
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#555" }}>
                          {copied ? <><CheckCheck size={10} style={{ color: "#4ade80" }} />COPIED</> : <><Copy size={10} />COPY</>}
                        </button>
                      </div>
                    </div>
                    <textarea value={code} onChange={e => setCode(e.target.value)} className="flex-1 p-4 font-mono text-[11px] leading-relaxed resize-none outline-none" style={{ background: "transparent", color: "#ccc", caretColor: T }} spellCheck={false} />
                  </div>

                  {/* Live preview */}
                  <div className="w-72 flex-shrink-0 border-l flex flex-col" style={{ borderColor: Tg(0.07) }}>
                    <div className="px-3 py-1.5 border-b text-[10px] font-mono flex items-center gap-2" style={{ borderColor: Tg(0.07), color: "#444" }}>
                      <Eye size={11} style={{ color: T }} />LIVE PREVIEW
                    </div>
                    <div className="flex-1 overflow-hidden p-3">
                      <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <style>{code}</style>
                        <div className="hero" style={{ minHeight: "100%", padding: "24px 16px" }}>
                          <div className="hero__title" style={{ fontSize: "1.5rem", marginBottom: "16px" }}>Beautiful Design</div>
                          <button className="hero__cta" style={{ padding: "10px 24px", fontSize: "14px" }}>Get Started</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PREVIEW ── */}
              {tab === "preview" && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-b" style={{ borderColor: Tg(0.07) }}>
                    {(["desktop","tablet","mobile"] as Viewport[]).map(v => {
                      const Icon = v === "desktop" ? Monitor : v === "tablet" ? Tablet : Smartphone;
                      return (
                        <button key={v} onClick={() => setViewport(v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all" style={{ background: viewport === v ? Tg(0.1) : "transparent", border: `1px solid ${viewport === v ? T : "transparent"}`, color: viewport === v ? T : "#444" }}>
                          <Icon size={12} />{v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 overflow-hidden flex items-center justify-center p-6" style={{ background: "#111" }}>
                    <motion.div animate={{ width: `${VIEWPORT_WIDTHS[viewport]}%` }} transition={{ type: "spring", damping: 20 }} className="h-full rounded-xl overflow-hidden shadow-2xl" style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", minWidth: 280 }}>
                      <style>{code}</style>
                      <div className="hero">
                        <div className="hero__title">Build Beautiful Apps</div>
                        <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 16, fontSize: 16 }}>Design and code in perfect harmony with real-time collaboration.</p>
                        <button className="hero__cta">Get Started Free</button>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ── COLLAB ── */}
              {tab === "collab" && (
                <motion.div key="collab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full">
                  <div className="w-56 border-r flex flex-col p-3 gap-2" style={{ borderColor: Tg(0.07) }}>
                    <div className="text-[10px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.42)" }}>TEAM MEMBERS</div>
                    {COLLAB_USERS.map(u => (
                      <div key={u.name} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${u.color}22` }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: u.color + "22", color: u.color }}>{u.name[0]}</div>
                        <div>
                          <div className="text-xs font-mono" style={{ color: "#ccc" }}>{u.name}</div>
                          <div className="text-[10px] font-mono" style={{ color: u.color }}>{u.role}</div>
                        </div>
                        <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: m.color + "22", color: m.color }}>{m.user[0]}</div>
                          <div className="flex-1">
                            <div className="text-[10px] font-mono mb-1" style={{ color: m.color }}>{m.user}</div>
                            <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#bbb" }}>{m.text}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="p-3 border-t" style={{ borderColor: Tg(0.07) }}>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${Tg(0.15)}` }}>
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message the team…" className="flex-1 bg-transparent outline-none text-xs font-mono text-gray-300 placeholder-gray-600" />
                        <button onClick={sendChat} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: Tg(0.15), border: `1px solid ${Tg(0.3)}` }}>
                          <Send size={12} style={{ color: T }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── HISTORY ── */}
              {tab === "history" && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 space-y-2">
                  {HISTORY_ENTRIES.map((h, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${h.color}18` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: h.color + "22", color: h.color }}>{h.user[0]}</div>
                      <div className="flex-1">
                        <div className="text-xs font-mono" style={{ color: "#ccc" }}>{h.action}</div>
                        <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{h.user} · {h.ts}</div>
                      </div>
                      <button className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: Tg(0.06) }}>
                        <RefreshCw size={10} style={{ color: T }} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: Tg(0.07), background: "rgba(0,0,0,0.4)" }}>
            <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>Open Codesign · Real-time collaborative code + design</div>
            <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <Zap size={12} style={{ color: T }} />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
