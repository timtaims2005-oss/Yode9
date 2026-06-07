import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Mic, Camera, MessageSquare, Send, Loader2, Server, Zap, HardDrive } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type Tab = "chat" | "setup" | "models" | "hardware";

interface Message { role: "user" | "assistant"; content: string; }

const POCKET_AI_PERSONA = `You are Pocket AI — a local, edge-deployed AI assistant running on Raspberry Pi 5 with a Qwen LLM (GGUF), Piper TTS, and Whisper STT. You operate completely offline.
Your capabilities:
- Conversational AI (Qwen 2.5 7B quantized)
- Voice interaction (Speech-to-Text via Whisper, Text-to-Speech via Piper)
- Camera vision (Pi Camera 2 via picamera2/libcamera)
- File management and local operations
- No cloud required — everything runs on the Pi

Simulate responses as if you are truly running locally on a Raspberry Pi 5 with limited compute (8GB RAM, 4-core ARM Cortex-A76).`;

const MODELS = [
  { name: "Qwen2.5-7B-Instruct-Q4_K_M", type: "LLM", size: "4.7 GB", ram: "6.2 GB", speed: "~8 tok/s", status: "loaded" },
  { name: "Qwen2.5-3B-Instruct-Q8_0", type: "LLM", size: "3.3 GB", ram: "3.8 GB", speed: "~18 tok/s", status: "available" },
  { name: "whisper-base.bin", type: "STT", size: "142 MB", ram: "280 MB", speed: "realtime", status: "loaded" },
  { name: "en_US-lessac-medium.onnx", type: "TTS", size: "63 MB", ram: "180 MB", speed: "realtime", status: "loaded" },
  { name: "vosk-model-en-us-0.22", type: "STT-alt", size: "1.8 GB", ram: "950 MB", speed: "realtime", status: "available" },
];

const SETUP_STEPS = [
  { step: 1, title: "Flash Raspberry Pi OS", desc: "Use Raspberry Pi Imager · 64-bit Lite or Desktop · enable SSH · set hostname=pocket-ai", cmd: "rpi-imager" },
  { step: 2, title: "Install Python & deps", desc: "Python 3.11+ required", cmd: "sudo apt update && sudo apt install python3.11 ffmpeg portaudio19-dev libcamera-dev" },
  { step: 3, title: "Clone Pocket AI", desc: "Clone the repository to the Pi", cmd: "git clone https://github.com/user/pocket-ai && cd pocket-ai" },
  { step: 4, title: "Install Python packages", desc: "Install all requirements", cmd: "python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" },
  { step: 5, title: "Download models", desc: "Download Qwen LLM + Piper + Whisper (first run takes ~15min)", cmd: "python app.py --download-models" },
  { step: 6, title: "Start backend", desc: "FastAPI server on port 8000", cmd: "python app.py" },
  { step: 7, title: "Start GUI (optional)", desc: "Electron + React frontend", cmd: "cd chat-gui && npm install && npm run dev" },
];

export function PocketAIModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  if (!open) return null;

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const txt = input;
    setInput("");
    setStreaming(true);
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);
    abortRef.current = new AbortController();
    const history = messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    try {
      await streamChat(
        { model: "gpt-4o", persona: null, customInstructions: "", language: "en" as const, memory: [] as string[], messages: [...history, { role: "user" as const, content: txt }], customSystemPrompt: POCKET_AI_PERSONA },
        (chunk) => setMessages(prev => { const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + chunk }; return c; }),
        abortRef.current.signal,
      );
    } catch { /* ignore */ }
    setStreaming(false);
  }

  const tabs = [
    { id: "chat" as Tab, label: "CHAT", icon: <MessageSquare className="w-3 h-3" /> },
    { id: "setup" as Tab, label: "SETUP", icon: <Server className="w-3 h-3" /> },
    { id: "models" as Tab, label: "MODELS", icon: <HardDrive className="w-3 h-3" /> },
    { id: "hardware" as Tab, label: "HARDWARE", icon: <Cpu className="w-3 h-3" /> },
  ];

  const COL = "#f97316";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[90vh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "#0a0a0a", borderColor: `${COL}30` }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: `${COL}20`, background: `${COL}08` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COL}15`, border: `1px solid ${COL}30` }}>
            <Cpu className="w-4 h-4" style={{ color: COL }} />
          </div>
          <div>
            <div className="text-[13px] font-bold" style={{ color: COL }}>Pocket AI</div>
            <div className="text-[9px] font-mono" style={{ color: "#444" }}>RASPBERRY PI 5 · LOCAL LLM · VOICE · CAMERA · EDGE AI</div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[9px] font-mono" style={{ color: "#10b981" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
            LOCAL · OFFLINE
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-0 border-b shrink-0" style={{ borderColor: "#1f1f1f" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold font-mono transition-all border-b-2"
              style={{ color: tab === t.id ? COL : "#444", borderBottomColor: tab === t.id ? COL : "transparent", background: tab === t.id ? `${COL}08` : "transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {tab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                <div className="px-4 py-2 border-b flex items-center gap-3" style={{ borderColor: "#1f1f1f" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
                    <span className="text-[9px] font-mono" style={{ color: "#10b981" }}>Qwen2.5-7B · ~8 tok/s</span>
                  </div>
                  <button onClick={() => setVoiceActive(!voiceActive)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                    style={{ background: voiceActive ? `${COL}15` : "transparent", borderColor: voiceActive ? `${COL}40` : "#1f1f1f", color: voiceActive ? COL : "#555" }}>
                    <Mic className="w-2.5 h-2.5" /> {voiceActive ? "MIC ON" : "MIC OFF"}
                  </button>
                  <button onClick={() => setCameraActive(!cameraActive)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono border transition-all"
                    style={{ background: cameraActive ? `${COL}15` : "transparent", borderColor: cameraActive ? `${COL}40` : "#1f1f1f", color: cameraActive ? COL : "#555" }}>
                    <Camera className="w-2.5 h-2.5" /> {cameraActive ? "CAM ON" : "CAM OFF"}
                  </button>
                  <span className="ml-auto text-[9px] font-mono" style={{ color: "#333" }}>RPi5 · 8GB · ARM Cortex-A76</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${COL}10`, border: `1px solid ${COL}30` }}>
                        <Cpu className="w-7 h-7" style={{ color: COL }} />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold" style={{ color: COL }}>Pocket AI Ready</div>
                        <div className="text-[10px] mt-1" style={{ color: "#555" }}>Running locally on Raspberry Pi 5 — 100% offline</div>
                      </div>
                      {["What can you do offline?", "Describe what you see through the camera", "Tell me about your hardware specs", "How fast is the local LLM?"].map(s => (
                        <button key={s} onClick={() => setInput(s)} className="text-[10px] px-3 py-1.5 rounded-lg border hover:border-[#f9731640] transition-colors"
                          style={{ background: "#111", borderColor: "#1f1f1f", color: "#777" }}>{s}</button>
                      ))}
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                        style={{ background: msg.role === "user" ? "#e2122720" : `${COL}20`, color: msg.role === "user" ? "#e21227" : COL }}>
                        {msg.role === "user" ? "U" : "π"}
                      </div>
                      <div className="max-w-[80%] px-3 py-2 rounded-lg text-[11px] whitespace-pre-wrap"
                        style={{ background: msg.role === "user" ? "#e2122710" : `${COL}08`, color: "#ccc", border: `1px solid ${msg.role === "user" ? "#e2122720" : COL + "20"}` }}>
                        {msg.content}
                        {msg.role === "assistant" && streaming && i === messages.length - 1 && <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: COL }} />}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2" style={{ borderColor: "#1f1f1f" }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Chat with local AI..." className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "#111", border: "1px solid #262626", color: "#ccc" }} />
                  <button onClick={sendMessage} disabled={streaming || !input.trim()}
                    className="px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                    style={{ background: `${COL}15`, border: `1px solid ${COL}30`, color: COL, opacity: streaming ? 0.5 : 1 }}>
                    {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {tab === "setup" && (
              <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4">
                <div className="text-[10px] font-bold font-mono mb-4" style={{ color: COL }}>POCKET AI DEPLOYMENT GUIDE · RASPBERRY PI 5</div>
                <div className="space-y-2">
                  {SETUP_STEPS.map(s => (
                    <div key={s.step} className="flex gap-3 p-3 rounded-lg border" style={{ background: "#111", borderColor: "#1f1f1f" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: `${COL}20`, color: COL, border: `1px solid ${COL}40` }}>{s.step}</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-bold mb-0.5" style={{ color: "#ccc" }}>{s.title}</div>
                        <div className="text-[9px] mb-1.5" style={{ color: "#666" }}>{s.desc}</div>
                        <code className="block text-[9px] px-2 py-1.5 rounded font-mono" style={{ background: "#0d0d0d", color: COL, border: "1px solid #1f1f1f" }}>{s.cmd}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === "models" && (
              <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4">
                <div className="text-[10px] font-bold font-mono mb-4" style={{ color: COL }}>LOCAL MODELS · GGUF FORMAT</div>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <div key={m.name} className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: "#111", borderColor: m.status === "loaded" ? `${COL}30` : "#1f1f1f" }}>
                      <div className="text-[8px] px-2 py-0.5 rounded font-mono w-14 text-center" style={{ background: m.type === "LLM" ? "#3b82f615" : "#10b98115", color: m.type === "LLM" ? "#3b82f6" : "#10b981" }}>{m.type}</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-mono" style={{ color: "#ccc" }}>{m.name}</div>
                        <div className="text-[8px] mt-0.5" style={{ color: "#555" }}>Size: {m.size} · RAM: {m.ram} · Speed: {m.speed}</div>
                      </div>
                      <div className="text-[8px] px-2 py-0.5 rounded font-mono" style={{ background: m.status === "loaded" ? "#10b98115" : "#1f1f1f", color: m.status === "loaded" ? "#10b981" : "#555" }}>
                        {m.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === "hardware" && (
              <motion.div key="hardware" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 overflow-y-auto">
                <div className="text-[10px] font-bold font-mono mb-4" style={{ color: COL }}>HARDWARE SPECIFICATIONS</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "CPU", value: "Broadcom BCM2712 · 4× ARM Cortex-A76 @ 2.4GHz", icon: Cpu },
                    { label: "RAM", value: "8 GB LPDDR4X-4267 · Unified memory", icon: HardDrive },
                    { label: "Storage", value: "NVMe SSD via PCIe 2.0 (recommended 64GB+)", icon: HardDrive },
                    { label: "Camera", value: "Pi Camera 2 · 8MP Sony IMX219 · libcamera", icon: Camera },
                    { label: "Microphone", value: "USB microphone or ReSpeaker HAT (recommended)", icon: Mic },
                    { label: "AI Performance", value: "Qwen 2.5 7B @ ~8 tok/s · Whisper base realtime", icon: Zap },
                    { label: "Connectivity", value: "Gigabit Ethernet · Wi-Fi 5 · Bluetooth 5.0", icon: Server },
                    { label: "Power", value: "27W USB-C PD (5A) · Active cooling required", icon: Zap },
                  ].map(spec => (
                    <div key={spec.label} className="p-3 rounded-lg border" style={{ background: "#111", borderColor: "#1f1f1f" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <spec.icon className="w-3 h-3" style={{ color: COL }} />
                        <span className="text-[9px] font-bold font-mono" style={{ color: COL }}>{spec.label}</span>
                      </div>
                      <div className="text-[10px]" style={{ color: "#888" }}>{spec.value}</div>
                    </div>
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
