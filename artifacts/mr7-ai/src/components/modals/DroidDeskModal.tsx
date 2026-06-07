import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Terminal, Copy, CheckCheck, ChevronDown, ChevronUp, Zap, CheckCircle } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface DroidDeskModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SETUP_STEPS = [
  {
    id: "termux", title: "Install Termux", command: "# Install from F-Droid (not Play Store)\n# https://f-droid.org/packages/com.termux/\npkg update && pkg upgrade",
    desc: "Get Termux from F-Droid — the Play Store version is outdated and broken.",
    tools: ["Termux:X11", "Termux:API"],
  },
  {
    id: "proot", title: "Install Debian via PRoot", command: "pkg install proot-distro\nproot-distro install debian\nproot-distro login debian",
    desc: "PRoot gives you a real Linux userland on Android — no root required.",
    tools: ["proot-distro"],
  },
  {
    id: "desktop", title: "Install Desktop Environment", command: "apt update && apt install -y xfce4 xfce4-goodies\napt install -y dbus-x11 x11-xserver-utils",
    desc: "XFCE4 is the best balance of performance and functionality on mobile hardware.",
    tools: ["XFCE4", "X11"],
  },
  {
    id: "display", title: "Configure Display", command: "# In Termux (outside proot):\npkg install termux-x11-nightly\n\n# Start X server:\ntermux-x11 :1 &\nXDISPLAY=:1 startxfce4 &",
    desc: "Termux:X11 renders the desktop directly on your Android screen — no VNC lag.",
    tools: ["Termux:X11", "XFCE4"],
  },
  {
    id: "monitor", title: "Connect External Monitor", command: "# USB-C to HDMI or DisplayPort adapter\n# Samsung DeX / Huawei Desktop Mode enabled\n# Or Miracast wireless display",
    desc: "Connect your phone to a monitor and get a full desktop PC experience.",
    tools: ["USB-C hub", "HDMI/DP"],
  },
  {
    id: "vscode", title: "Install VS Code", command: "# Install code-server (VS Code in browser)\ncurl -fsSL https://code-server.dev/install.sh | sh\ncode-server --bind-addr 0.0.0.0:8080",
    desc: "Full VS Code with extensions, Python, Node.js, Git — everything works.",
    tools: ["code-server", "Node.js"],
  },
  {
    id: "ai", title: "Install AI Coding Agents", command: "# Claude Code\nnpm install -g @anthropic-ai/claude-code\n\n# Gemini CLI\nnpm install -g @google/gemini-cli\n\n# Cursor (AppImage via Box64)\n./Cursor.AppImage --no-sandbox",
    desc: "Run Claude Code, Gemini CLI, or Cursor directly on your phone.",
    tools: ["Claude Code", "Gemini CLI", "Cursor"],
  },
  {
    id: "metasploit", title: "Security Tools", command: "apt install -y metasploit-framework\napt install -y nmap wireshark\napt install -y burpsuite || true",
    desc: "Metasploit, Nmap, Wireshark — full pentesting toolkit on your phone.",
    tools: ["Metasploit", "Nmap", "Wireshark"],
  },
];

export function DroidDeskModal({ open, onOpenChange }: DroidDeskModalProps) {
  const [expanded, setExpanded] = useState<string | null>("termux");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [aiHelp, setAiHelp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState("");

  function toggleComplete(id: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function copyCmd(id: string, cmd: string) {
    navigator.clipboard.writeText(cmd);
    setCopied(id);
    pipeline.push({ source: "DroidDesk", sourceColor: "#0ea5e9", label: `Command: ${id}`, content: cmd });
    setTimeout(() => setCopied(null), 2000);
  }

  async function askAI() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiHelp("");

    const prompt = `You are a DroidDesk expert — Linux desktop on Android specialist.

User question: ${aiQuery}

Context: DroidDesk uses Termux + PRoot-Distro + Termux:X11 to run a full Linux desktop (XFCE4) on Android without root. The stack supports VS Code, Claude Code, Metasploit, Wireshark, Blender, and more.

Provide a specific, actionable answer for this Android Linux setup question.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const _droidContent = await readChatText(resp);
        setAiHelp(_droidContent);
        pipeline.push({ source: "DroidDesk", sourceColor: "#0ea5e9", label: aiQuery, content: _droidContent });
      } else {
        setAiHelp("DroidDesk AI assistant ready. Ask about setup, troubleshooting, or configurations.");
      }
    } catch {
      setAiHelp("Connection error. Please try again.");
    }
    setAiLoading(false);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0d0d0d", border: "1px solid rgba(14,165,233,0.25)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(14,165,233,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)" }}>
                  <Monitor className="w-4 h-4" style={{ color: "#0ea5e9" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">DroidDesk</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>Full Linux desktop on Android — VS Code, Metasploit, AI agents, no root</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-mono px-2 py-1 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                  {completed.size}/{SETUP_STEPS.length} done
                </div>
                <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {/* Progress bar */}
              <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #0ea5e9, #10b981)" }}
                  animate={{ width: `${(completed.size / SETUP_STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>

              {/* Steps */}
              {SETUP_STEPS.map((step) => (
                <div key={step.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${completed.has(step.id) ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                  <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: completed.has(step.id) ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.01)" }}>
                    <button onClick={() => toggleComplete(step.id)}>
                      <CheckCircle className="w-4 h-4" style={{ color: completed.has(step.id) ? "#10b981" : "#2a2a2a" }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold" style={{ color: completed.has(step.id) ? "#10b981" : "#ccc" }}>{step.title}</div>
                      <div className="flex gap-1 mt-0.5">
                        {step.tools.map(t => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(14,165,233,0.08)", color: "#0ea5e9" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setExpanded(expanded === step.id ? null : step.id)}>
                      {expanded === step.id ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#444" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#444" }} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {expanded === step.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <div className="p-3 space-y-2">
                          <div className="text-[10px]" style={{ color: "#666" }}>{step.desc}</div>
                          <div className="relative rounded-lg overflow-hidden" style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <pre className="text-[9px] font-mono p-3 overflow-x-auto whitespace-pre" style={{ color: "#0ea5e9" }}>{step.command}</pre>
                            <button onClick={() => copyCmd(step.id, step.command)}
                              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[8px]"
                              style={{ background: "rgba(255,255,255,0.06)", color: copied === step.id ? "#10b981" : "#555" }}>
                              {copied === step.id ? <><CheckCheck className="w-2.5 h-2.5" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* AI Help */}
              <div className="rounded-xl p-3" style={{ background: "rgba(14,165,233,0.04)", border: "1px solid rgba(14,165,233,0.12)" }}>
                <div className="text-[10px] font-bold font-mono mb-2" style={{ color: "#0ea5e9" }}>AI SETUP ASSISTANT</div>
                <div className="flex gap-2">
                  <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askAI()}
                    placeholder="Ask about setup issues, hardware, software…"
                    className="flex-1 bg-transparent border rounded-xl px-3 py-2 text-[11px] outline-none"
                    style={{ borderColor: "rgba(14,165,233,0.2)", color: "#ccc" }} />
                  <button onClick={askAI} disabled={!aiQuery.trim() || aiLoading}
                    className="px-3 py-2 rounded-xl border text-[10px] font-bold disabled:opacity-40 transition-all"
                    style={{ background: "rgba(14,165,233,0.1)", borderColor: "rgba(14,165,233,0.3)", color: "#0ea5e9" }}>
                    {aiLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><Zap className="w-3 h-3" /></motion.div> : <Zap className="w-3 h-3" />}
                  </button>
                </div>
                {aiHelp && (
                  <div className="mt-2 text-[10px] p-2 rounded-lg whitespace-pre-wrap" style={{ background: "rgba(255,255,255,0.02)", color: "#888" }}>
                    {aiHelp}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
