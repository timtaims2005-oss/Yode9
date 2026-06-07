import { useState, useEffect, useRef } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Hand, Zap, Copy, CheckCheck, GitMerge, RotateCcw } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface HandClawModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type GestureCommand = { gesture: string; emoji: string; desc: string; action: string };
const GESTURES: GestureCommand[] = [
  { gesture: "OPEN PALM", emoji: "✋", desc: "Stop / Cancel current task", action: "stop" },
  { gesture: "POINT UP", emoji: "☝️", desc: "Send last message again", action: "resend" },
  { gesture: "THUMBS UP", emoji: "👍", desc: "Approve and pipe output", action: "pipe" },
  { gesture: "FIST", emoji: "✊", desc: "Clear and reset", action: "reset" },
  { gesture: "PEACE", emoji: "✌️", desc: "Switch to code mode", action: "code" },
  { gesture: "PINCH", emoji: "🤌", desc: "Summarize last output", action: "summarize" },
];

const VOICE_CMDS = [
  "scan <target>", "explain <topic>", "generate code for <task>",
  "analyze <input>", "compare <A> vs <B>", "debug <code>",
  "write test for <function>", "optimize <code>", "translate to <language>",
];

export function HandClawModal({ open, onOpenChange }: HandClawModalProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"voice" | "gesture">("voice");
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => { recogRef.current?.stop(); };
  }, []);

  function toggleListen() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast({ description: "Speech recognition not supported in this browser" });
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recog = new (SR as any)();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = "en-US";
    recog.onstart = () => setListening(true);
    recog.onend = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) processVoice(t);
    };
    recog.start();
    recogRef.current = recog;
  }

  async function processVoice(text: string) {
    if (!text.trim() || running) return;
    setRunning(true);
    setOutput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are HandClaw — a voice-controlled AI assistant. Interpret voice commands and execute them precisely. Be concise and direct." },
            { role: "user", content: text },
          ],
          model: "gpt-5.4"
        }),
      });
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content ?? "";
      setOutput(result);
      pipeline.push({ source: "HANDCLAW", sourceColor: "#fb7185", label: `Voice: ${text.slice(0, 30)}`, content: result });
    } catch { /* ignore */ }
    setRunning(false);
  }

  function triggerGesture(g: GestureCommand) {
    setActiveGesture(g.gesture);
    setTimeout(() => setActiveGesture(null), 1500);
    if (g.action === "pipe" && output) {
      pipeline.push({ source: "HANDCLAW", sourceColor: "#fb7185", label: "Gesture pipe", content: output });
      toast({ description: "Output piped to pipeline" });
    } else if (g.action === "reset") {
      setTranscript(""); setOutput("");
    } else if (g.action === "summarize" && output) {
      processVoice(`Summarize in 3 bullet points: ${output}`);
    } else if (g.action === "code") {
      toast({ description: "Code mode activated" });
    }
  }

  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#080808", border: "1px solid rgba(251,113,133,0.25)", boxShadow: "0 0 60px rgba(251,113,133,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(251,113,133,0.2)", background: "rgba(251,113,133,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(251,113,133,0.1)", borderColor: "rgba(251,113,133,0.4)" }}>
                  <Hand className="w-4 h-4" style={{ color: "#fb7185" }} />
                  {listening && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: "#fb7185" }} />}
                </div>
                <div>
                  <div className="text-sm font-black tracking-widest" style={{ color: "#fb7185" }}>HANDCLAW</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>Voice & gesture-controlled AI interface</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onOpenChange(false)} className="p-1.5 text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {(["voice", "gesture"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2.5 text-[10px] font-bold tracking-widest transition-colors"
                  style={{ color: mode === m ? "#fb7185" : "#444", borderBottom: mode === m ? "2px solid #fb7185" : "2px solid transparent", background: "#0a0a0a" }}>
                  {m === "voice" ? "VOICE COMMANDS" : "GESTURE TRIGGERS"}
                </button>
              ))}
            </div>

            {mode === "voice" && (
              <div className="flex-1 flex flex-col p-4 gap-4">
                {/* Microphone button */}
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    onClick={toggleListen}
                    animate={{ scale: listening ? [1, 1.05, 1] : 1 }}
                    transition={{ repeat: listening ? Infinity : 0, duration: 1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                    style={{ background: listening ? "rgba(251,113,133,0.15)" : "rgba(255,255,255,0.04)", borderColor: listening ? "#fb7185" : "rgba(255,255,255,0.1)", boxShadow: listening ? "0 0 30px rgba(251,113,133,0.3)" : "none" }}>
                    {listening ? <Mic className="w-8 h-8" style={{ color: "#fb7185" }} /> : <MicOff className="w-8 h-8" style={{ color: "#333" }} />}
                  </motion.button>
                  <div className="text-[10px] font-mono" style={{ color: listening ? "#fb7185" : "#333" }}>
                    {listening ? "Listening… speak your command" : "Tap to start voice control"}
                  </div>
                </div>

                {transcript && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.2)" }}>
                    <div className="text-[9px] font-mono mb-1" style={{ color: "#555" }}>TRANSCRIPT</div>
                    <div className="text-[12px]" style={{ color: "#fb7185" }}>{transcript}</div>
                  </div>
                )}

                {(output || running) && (
                  <div className="rounded-xl p-3 flex-1" style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[9px] font-mono mb-1" style={{ color: "#555" }}>RESPONSE</div>
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: "#888" }}>
                      {output}{running && <span className="animate-pulse">▊</span>}
                    </div>
                    {output && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold border"
                          style={{ background: "rgba(251,113,133,0.06)", borderColor: "rgba(251,113,133,0.2)", color: "#fb7185" }}>
                          {copied ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                        <button onClick={() => pipeline.push({ source: "HANDCLAW", sourceColor: "#fb7185", label: "Voice output", content: output })}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-bold border"
                          style={{ background: "rgba(0,229,204,0.06)", borderColor: "rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                          <GitMerge className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[9px] font-mono" style={{ color: "#2a2a2a" }}>
                  Commands: {VOICE_CMDS.join(" · ")}
                </div>
              </div>
            )}

            {mode === "gesture" && (
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
                {GESTURES.map((g) => (
                  <motion.button key={g.gesture} onClick={() => triggerGesture(g)}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-xl p-3 text-left flex flex-col gap-1.5"
                    style={{
                      background: activeGesture === g.gesture ? "rgba(251,113,133,0.12)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${activeGesture === g.gesture ? "rgba(251,113,133,0.4)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <div className="text-2xl">{g.emoji}</div>
                    <div className="text-[10px] font-bold" style={{ color: "#fb7185" }}>{g.gesture}</div>
                    <div className="text-[9px]" style={{ color: "#555" }}>{g.desc}</div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
