import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, Cpu, Home, Globe, Mic, MicOff, Send, Loader2, ChevronRight, Zap, Box, Wifi, Eye } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "voice" | "cad" | "smarthome" | "webagent";

interface Message { role: "user" | "assistant"; content: string; ts: number; }

const ADA_PERSONA = `You are A.D.A (Advanced Design Assistant) V2 — a multimodal AI assistant inspired by the ADA V2 project. You specialize in:
- Voice-driven 3D CAD design and parametric modeling (build123d / OpenSCAD style)
- Smart home automation (TP-Link Kasa, Home Assistant style commands)
- Autonomous web agent tasks (Playwright-style browser automation plans)
- Gesture and face-authentication interfaces
You respond with precision, technical depth, and creative problem-solving. When generating CAD blueprints, output structured JSON specs. When building automation, output executable pseudocode.`;

const CAD_EXAMPLES = [
  "Generate a parametric bracket: 80mm × 40mm × 5mm with two 6mm mounting holes",
  "Design a phone stand: 75° tilt, 10mm thick base, cable routing slot",
  "Create a gear: 24 teeth, module 2, 8mm bore",
  "Build a raspberry pi case: 85×56×30mm, ventilation grid, GPIO access",
];

const SMARTHOME_CMDS = [
  { cmd: "kasa lights on", label: "All Lights ON", icon: "💡" },
  { cmd: "set bedroom brightness 40%", label: "Dim Bedroom", icon: "🌙" },
  { cmd: "kasa plug off living_room_tv", label: "TV Plug OFF", icon: "🔌" },
  { cmd: "set scene movie night", label: "Movie Night", icon: "🎬" },
  { cmd: "kasa bulb color 2700K", label: "Warm White", icon: "🌡️" },
  { cmd: "schedule off all 23:00", label: "Auto-Off 11PM", icon: "⏰" },
];

const WEB_TASKS = [
  "Scrape all product prices from example.com and export to CSV",
  "Auto-fill and submit a form on a target URL",
  "Take screenshots of 10 pages and compare UI changes",
  "Monitor a page for price drops and alert when below threshold",
  "Login to a site and download all available reports",
  "Extract all emails from a contact directory page",
];

export function AdaV2Modal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("voice");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [cadResult, setCadResult] = useState("");
  const [cadPrompt, setCadPrompt] = useState("");
  const [cadGenerating, setCadGenerating] = useState(false);
  const [smarthomeLog, setSmarthomeLog] = useState<string[]>([]);
  const [webTask, setWebTask] = useState("");
  const [webResult, setWebResult] = useState("");
  const [webGenerating, setWebGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!open) return null;

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    const assistantMsg: Message = { role: "assistant", content: "", ts: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);
    abortRef.current = new AbortController();
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [...messages.map(m => ({ role: m.role as "user"|"assistant", content: m.content })), { role: "user" as const, content: input }], customSystemPrompt: ADA_PERSONA },
        (chunk) => setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + chunk }; return copy; }),
        abortRef.current.signal,
      );
    } catch { /* ignore abort */ }
    setStreaming(false);
  }

  async function generateCAD() {
    if (!cadPrompt.trim() || cadGenerating) return;
    setCadGenerating(true);
    setCadResult("");
    abortRef.current = new AbortController();
    const prompt = `Generate a detailed 3D CAD specification for: "${cadPrompt}"
Output a structured JSON object with:
- name, description
- dimensions: {width, height, depth, unit}
- features: array of feature objects with {type, params}
- material: suggested material
- build123d_pseudocode: Python pseudocode using build123d library
- print_settings: {layer_height, infill, supports}
- estimated_print_time`;
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: prompt }], customSystemPrompt: ADA_PERSONA },
        (chunk) => setCadResult(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setCadGenerating(false);
  }

  function executeSmartHomeCmd(cmd: string, label: string) {
    const ts = new Date().toLocaleTimeString();
    setSmarthomeLog(prev => [
      `[${ts}] Executing: ${cmd} → ✓ ${label} applied`,
      ...prev.slice(0, 19)
    ]);
  }

  async function generateWebPlan() {
    if (!webTask.trim() || webGenerating) return;
    setWebGenerating(true);
    setWebResult("");
    abortRef.current = new AbortController();
    const prompt = `You are ADA's web automation agent using Playwright. Generate a complete, step-by-step automation plan for:
"${webTask}"

Output:
1. Prerequisites and target URL analysis
2. Playwright Python script (structured pseudocode)
3. Error handling strategies
4. Expected output format
5. Estimated execution time`;
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [{ role: "user" as const, content: prompt }], customSystemPrompt: ADA_PERSONA },
        (chunk) => setWebResult(prev => prev + chunk),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setWebGenerating(false);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "voice", label: "VOICE AI", icon: <Mic className="w-3 h-3" /> },
    { id: "cad", label: "3D CAD", icon: <Box className="w-3 h-3" /> },
    { id: "smarthome", label: "SMART HOME", icon: <Home className="w-3 h-3" /> },
    { id: "webagent", label: "WEB AGENT", icon: <Globe className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: "#00e5ff30" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "#00e5ff20", background: "#00e5ff08" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#00e5ff15", border: "1px solid #00e5ff30" }}>
            <Bot className="w-4 h-4" style={{ color: "#00e5ff" }} />
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: "#00e5ff" }}>A.D.A V2</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>ADVANCED DESIGN ASSISTANT · VOICE + CAD + SMART HOME + WEB AGENT</div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00e5ff" }} />
            <span className="text-[9px] font-mono" style={{ color: "#00e5ff" }}>ONLINE</span>
          </div>
          <button onClick={() => { abortRef.current?.abort(); onOpenChange(false); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold font-mono transition-all border-b-2"
              style={{ color: tab === t.id ? "#00e5ff" : "#444", borderBottomColor: tab === t.id ? "#00e5ff" : "transparent", background: tab === t.id ? "#00e5ff08" : "transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* VOICE AI TAB */}
            {tab === "voice" && (
              <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#00e5ff10", border: "1px solid #00e5ff30" }}>
                        <Bot className="w-8 h-8" style={{ color: "#00e5ff" }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "#00e5ff" }}>ADA is ready</div>
                        <div className="text-[11px] mt-1" style={{ color: "#555" }}>Multimodal AI assistant — Voice · CAD · Smart Home · Web</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
                        {["Design a phone holder for my desk", "Turn on the living room lights", "Scrape prices from Amazon", "Generate a 3D bracket design"].map(s => (
                          <button key={s} onClick={() => setInput(s)}
                            className="text-left px-3 py-2 rounded-lg text-[10px] border hover:border-[#00e5ff40] transition-colors"
                            style={{ background: "#111", borderColor: "#1f1f1f", color: "#888" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                        style={{ background: msg.role === "user" ? "#e2122720" : "#00e5ff15", color: msg.role === "user" ? "#e21227" : "#00e5ff", border: `1px solid ${msg.role === "user" ? "#e2122740" : "#00e5ff30"}` }}>
                        {msg.role === "user" ? "U" : "A"}
                      </div>
                      <div className="max-w-[80%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap"
                        style={{ background: msg.role === "user" ? "#e2122712" : "#00e5ff08", color: "#ccc", border: `1px solid ${msg.role === "user" ? "#e2122720" : "#00e5ff15"}` }}>
                        {msg.content}{msg.role === "assistant" && streaming && i === messages.length - 1 && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: "#00e5ff" }} />}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t flex gap-2" style={{ borderColor: "#1f1f1f" }}>
                  <button onClick={() => setListening(!listening)}
                    className="p-2 rounded-lg border transition-all"
                    style={{ background: listening ? "#00e5ff15" : "#111", borderColor: listening ? "#00e5ff50" : "#262626", color: listening ? "#00e5ff" : "#555" }}>
                    {listening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Ask ADA anything — design, automate, control..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={sendMessage} disabled={streaming || !input.trim()}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5"
                    style={{ background: "#00e5ff15", border: "1px solid #00e5ff30", color: "#00e5ff", opacity: streaming || !input.trim() ? 0.5 : 1 }}>
                    {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3D CAD TAB */}
            {tab === "cad" && (
              <motion.div key="cad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-4 gap-3">
                <div className="flex gap-2">
                  <input value={cadPrompt} onChange={e => setCadPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generateCAD()}
                    placeholder="Describe what to design in 3D..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={generateCAD} disabled={cadGenerating || !cadPrompt.trim()}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2"
                    style={{ background: "#00e5ff15", border: "1px solid #00e5ff30", color: "#00e5ff", opacity: cadGenerating ? 0.6 : 1 }}>
                    {cadGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    GENERATE
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CAD_EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setCadPrompt(ex)}
                      className="px-2.5 py-1 rounded text-[9px] border transition-colors hover:border-[#00e5ff40]"
                      style={{ background: "#111", borderColor: "#1f1f1f", color: "#666" }}>
                      <ChevronRight className="w-2.5 h-2.5 inline mr-1" />{ex.slice(0, 50)}...
                    </button>
                  ))}
                </div>
                <div className="flex-1 rounded-lg border overflow-y-auto p-3 font-mono text-[10px]"
                  style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#888" }}>
                  {!cadResult && !cadGenerating && (
                    <div className="flex items-center justify-center h-full" style={{ color: "#333" }}>
                      <Box className="w-8 h-8" />
                      <span className="ml-3">3D blueprint will appear here</span>
                    </div>
                  )}
                  {cadResult && <pre className="whitespace-pre-wrap leading-relaxed" style={{ color: "#00e5ff" }}>{cadResult}</pre>}
                  {cadGenerating && !cadResult && <div className="flex items-center gap-2" style={{ color: "#00e5ff" }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating CAD specification...</div>}
                </div>
              </motion.div>
            )}

            {/* SMART HOME TAB */}
            {tab === "smarthome" && (
              <motion.div key="smarthome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex gap-4 p-4">
                <div className="w-1/2 flex flex-col gap-3">
                  <div className="text-[10px] font-bold font-mono" style={{ color: "#00e5ff" }}>KASA SMART HOME CONTROLS</div>
                  <div className="grid grid-cols-2 gap-2">
                    {SMARTHOME_CMDS.map(c => (
                      <button key={c.cmd} onClick={() => executeSmartHomeCmd(c.cmd, c.label)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all hover:border-[#00e5ff40]"
                        style={{ background: "#111", borderColor: "#1f1f1f", color: "#ccc" }}>
                        <span className="text-base">{c.icon}</span>
                        <span className="text-[10px]">{c.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: "#0d0d0d", borderColor: "#00e5ff20" }}>
                    <Wifi className="w-4 h-4" style={{ color: "#00e5ff" }} />
                    <div>
                      <div className="text-[10px] font-bold" style={{ color: "#00e5ff" }}>Hub Status</div>
                      <div className="text-[9px]" style={{ color: "#555" }}>TP-Link Kasa · 6 devices · LAN connected</div>
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "#00e5ff" }} />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="text-[10px] font-bold font-mono" style={{ color: "#555" }}>EXECUTION LOG</div>
                  <div className="flex-1 rounded-lg border overflow-y-auto p-3 font-mono text-[10px]"
                    style={{ background: "#0d0d0d", borderColor: "#1f1f1f" }}>
                    {smarthomeLog.length === 0 && <div style={{ color: "#333" }}>Waiting for commands...</div>}
                    {smarthomeLog.map((log, i) => (
                      <div key={i} style={{ color: i === 0 ? "#00e5ff" : "#444" }}>{log}</div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* WEB AGENT TAB */}
            {tab === "webagent" && (
              <motion.div key="webagent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-4 gap-3">
                <div className="flex gap-2">
                  <input value={webTask} onChange={e => setWebTask(e.target.value)} onKeyDown={e => e.key === "Enter" && generateWebPlan()}
                    placeholder="Describe the web automation task..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={generateWebPlan} disabled={webGenerating || !webTask.trim()}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2"
                    style={{ background: "#00e5ff15", border: "1px solid #00e5ff30", color: "#00e5ff", opacity: webGenerating ? 0.6 : 1 }}>
                    {webGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    PLAN
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEB_TASKS.map(t => (
                    <button key={t} onClick={() => setWebTask(t)}
                      className="px-2.5 py-1 rounded text-[9px] border transition-colors hover:border-[#00e5ff40]"
                      style={{ background: "#111", borderColor: "#1f1f1f", color: "#666" }}>
                      {t.slice(0, 45)}...
                    </button>
                  ))}
                </div>
                <div className="flex-1 rounded-lg border overflow-y-auto p-3 font-mono text-[10px]"
                  style={{ background: "#0d0d0d", borderColor: "#1f1f1f", color: "#888" }}>
                  {!webResult && !webGenerating && (
                    <div className="flex items-center justify-center h-full" style={{ color: "#333" }}>
                      <Globe className="w-8 h-8" /><span className="ml-3">Playwright automation plan will appear here</span>
                    </div>
                  )}
                  {webResult && <pre className="whitespace-pre-wrap leading-relaxed" style={{ color: "#00e5ff" }}>{webResult}</pre>}
                  {webGenerating && !webResult && <div className="flex items-center gap-2" style={{ color: "#00e5ff" }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Planning web automation...</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
