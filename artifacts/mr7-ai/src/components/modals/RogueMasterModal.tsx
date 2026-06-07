import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wifi, Radio, Cpu, Zap, Shield, Terminal, Play, ChevronRight, Usb } from "lucide-react";
import { streamChat } from "@/lib/chat-client";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const CATEGORIES = [
  {
    id: "subghz", label: "Sub-GHz", icon: Radio, color: "#f59e0b",
    plugins: ["Keeloq", "CAME", "Ansonic", "BFT Mitto", "Chamberlain KLIK3U", "Linear Delta3", "NeroSketch", "Nice Flor S", "Princeton", "Security+ 2.0", "Waveman"],
    desc: "Capture, replay, and analyze Sub-GHz RF signals (300-928 MHz). Includes gate remotes, garage doors, and car fobs."
  },
  {
    id: "nfc", label: "NFC / RFID", icon: Cpu, color: "#3b82f6",
    plugins: ["NFC Magic", "Mifare Classic Tool", "EM4100 Writer", "HID Prox Writer", "iClass Writer", "Legic Prime", "Metroflip", "T5577 Writer"],
    desc: "Read, emulate, and write NFC/RFID cards. Supports Mifare Classic, NTAG, HID, EM4100, and more."
  },
  {
    id: "badusb", label: "BadUSB", icon: Usb, color: "#ef4444",
    plugins: ["USB Rubber Ducky", "WiFi Marauder", "AT Commands", "Bluetooth Bypass", "USB HID Injector", "Keystroke Logger", "Rickroll Payload"],
    desc: "Emulate HID devices (keyboard/mouse). Execute pre-programmed payloads when connected to target USB ports."
  },
  {
    id: "infrared", label: "Infrared", icon: Zap, color: "#8b5cf6",
    plugins: ["Universal TV Remote", "AC Controller", "Universal Media", "Projector Control", "Brute Force TV", "FLIP TV Universal"],
    desc: "Send and receive IR signals. Control any IR-enabled device with 1000+ built-in remotes."
  },
  {
    id: "gpio", label: "GPIO / Tools", icon: Cpu, color: "#10b981",
    plugins: ["WiFi Scanner", "BLE Scanner", "Spectrum Analyzer", "Frequency Analyzer", "Logic Analyzer", "UART Terminal", "I2C Scanner", "SPI Flash"],
    desc: "Hardware hacking and GPIO expansion tools. Connect to external modules for advanced attacks."
  },
  {
    id: "games", label: "Games / Fun", icon: Shield, color: "#ec4899",
    plugins: ["Doom", "Tetris", "Snake", "FlappyBird", "2048", "Blackjack", "Weather App", "Metronome", "Music Player"],
    desc: "Entertainment plugins and creative tools for the Flipper Zero."
  },
];

export function RogueMasterModal({ open, onOpenChange }: Props) {
  const [selectedCat, setSelectedCat] = useState("subghz");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState("");

  const cat = CATEGORIES.find(c => c.id === selectedCat)!;
  const CatIcon = cat.icon;

  const runQuery = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const systemPrompt = `You are an expert in Flipper Zero security research and the RogueMaster firmware. You have deep knowledge of:
- RogueMaster firmware (based on unleashed/OFW with 100+ extra plugins)
- ${cat.label} category: ${cat.desc}
- Available plugins: ${cat.plugins.join(", ")}
${selectedPlugin ? `- Focused plugin: ${selectedPlugin}` : ""}

Provide detailed technical guidance for security research and educational purposes. Include specific steps, compatible hardware, legal considerations, and practical examples. Always note that users must comply with local laws regarding RF transmission and device hacking.`;
      await streamChat({ model: "gpt-5.4", persona: null, customInstructions: "", language: "en", memory: [], messages: [{ role: "user", content: query }], customSystemPrompt: systemPrompt }, (chunk) => { setResponse(p => p + chunk); }, undefined);
    } catch {
      setResponse("Error connecting to AI. Please add your OPENAI_API_KEY in Secrets.");
    } finally {
      setStreaming(false);
    }
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
            style={{ background: "#080808", borderColor: "rgba(245,158,11,0.25)", maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(245,158,11,0.15)", background: "linear-gradient(135deg,#0a0800,#080808)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <Radio className="w-4 h-4" style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>RogueMaster</div>
                  <div className="text-[10px] font-mono" style={{ color: "#555" }}>Flipper Zero Firmware · 100+ Plugins</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded-lg border text-[9px] font-mono" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)", color: "#f59e0b" }}>
                  RM-420.X
                </div>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" style={{ color: "#444" }} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <div className="w-44 border-r flex flex-col py-2" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  return (
                    <button key={c.id} onClick={() => { setSelectedCat(c.id); setSelectedPlugin(""); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-left text-[10px] font-bold transition-all mx-2 rounded-lg mb-0.5"
                      style={{ background: selectedCat === c.id ? `${c.color}15` : "transparent", color: selectedCat === c.id ? c.color : "#444", border: `1px solid ${selectedCat === c.id ? `${c.color}25` : "transparent"}` }}>
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Main */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Category Info */}
                <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="text-sm font-bold" style={{ color: cat.color }}>{cat.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.plugins.length} plugins</span>
                  </div>
                  <p className="text-[10px] font-mono" style={{ color: "#444" }}>{cat.desc}</p>
                </div>

                {/* Plugins Grid */}
                <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>Available Plugins</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.plugins.map(plugin => (
                      <button key={plugin} onClick={() => setSelectedPlugin(selectedPlugin === plugin ? "" : plugin)}
                        className="px-2 py-1 rounded text-[10px] font-mono border transition-all"
                        style={{ borderColor: selectedPlugin === plugin ? `${cat.color}50` : "rgba(255,255,255,0.08)", background: selectedPlugin === plugin ? `${cat.color}10` : "rgba(255,255,255,0.02)", color: selectedPlugin === plugin ? cat.color : "#555" }}>
                        {plugin}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Assistant */}
                <div className="flex-1 flex flex-col min-h-0 p-5">
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#333" }}>
                    AI Research Assistant{selectedPlugin ? ` · ${selectedPlugin}` : ""}
                  </div>
                  {response && (
                    <div className="flex-1 overflow-y-auto rounded-lg p-3 mb-3 text-[11px] font-mono leading-relaxed" style={{ background: "rgba(0,0,0,0.4)", color: "#aaa", whiteSpace: "pre-wrap", minHeight: "80px", maxHeight: "220px" }}>
                      {response}
                      {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: cat.color }} />}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && runQuery()}
                      placeholder={selectedPlugin ? `Ask about ${selectedPlugin}...` : `Ask about ${cat.label} plugins...`}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] font-mono border outline-none"
                      style={{ background: "#0a0a0a", borderColor: `${cat.color}25`, color: "#ddd" }} />
                    <button onClick={runQuery} disabled={!query.trim() || streaming}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: query.trim() && !streaming ? `${cat.color}20` : "rgba(255,255,255,0.05)", color: query.trim() && !streaming ? cat.color : "#333", border: `1px solid ${query.trim() && !streaming ? `${cat.color}40` : "rgba(255,255,255,0.08)"}` }}>
                      <Play className="w-3 h-3" />Ask
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)", background: "#060606" }}>
              <div className="text-[9px] font-mono" style={{ color: "#222" }}>For educational &amp; authorized security research only</div>
              <Radio className="w-3.5 h-3.5" style={{ color: "#1a1a1a" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
