import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceCommand {
  id: string;
  transcript: string;
  action: string;
  ts: number;
  status: "processing" | "done" | "error";
}

const COMMANDS: Record<string, string> = {
  "scan": "Initiating full system vulnerability scan...",
  "threat": "Pulling live threat intelligence feed...",
  "status": "System status: All nodes operational. Threat level: ELEVATED",
  "help": "Available: scan, threat, status, agents, clear, lock, analyze, deploy",
  "agents": "3 AI agents active: Recon-7, Defense-Omega, Intel-Prime",
  "lock": "Initiating security lockdown protocol...",
  "analyze": "Deep behavioral analysis initiated — ETA 45s",
  "deploy": "Deploying countermeasure suite to all endpoints...",
  "clear": "Command log cleared.",
  "recon": "Starting OSINT reconnaissance sweep...",
  "exploit": "BLOCKED — Offensive operations require elevated clearance",
};

const BAR_COUNT = 32;

export function NeuralVoiceCommander() {
  const [listening, setListening] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [inputCmd, setInputCmd] = useState("");
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(BAR_COUNT).fill(0.1));
  const [wavePhase, setWavePhase] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const animateBars = useCallback(() => {
    setWavePhase(p => p + 0.08);
    if (listening && analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const step = Math.floor(data.length / BAR_COUNT);
      setAudioLevel(Array.from({ length: BAR_COUNT }, (_, i) => {
        const val = data[i * step] / 255;
        return Math.max(0.08, val);
      }));
    } else {
      setAudioLevel(prev => prev.map((_, i) => {
        const base = listening ? 0.2 : 0.06;
        return base + Math.abs(Math.sin(wavePhase + i * 0.25)) * (listening ? 0.4 : 0.08);
      }));
    }
    animRef.current = requestAnimationFrame(animateBars);
  }, [listening, wavePhase]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animateBars);
    return () => cancelAnimationFrame(animRef.current);
  }, [animateBars]);

  const processCommand = useCallback((text: string) => {
    const clean = text.toLowerCase().trim();
    const id = `cmd-${Date.now()}`;
    const newCmd: VoiceCommand = { id, transcript: text, action: "Processing...", ts: Date.now(), status: "processing" };
    setCommands(prev => [newCmd, ...prev.slice(0, 9)]);

    setTimeout(() => {
      const key = Object.keys(COMMANDS).find(k => clean.includes(k));
      const action = key ? COMMANDS[key] : `Neural analysis: "${text}" — no matching protocol`;
      setCommands(prev => prev.map(c => c.id === id
        ? { ...c, action, status: key ? "done" : "error" }
        : c));
    }, 800 + Math.random() * 600);
  }, []);

  const startListening = useCallback(async () => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      processCommand("[Voice API not supported — use text input]");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      const src = audioCtxRef.current.createMediaStreamSource(streamRef.current);
      src.connect(analyserRef.current);
    } catch { /* mic denied — visual only */ }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      processCommand(t);
    };
    rec.onend = () => {
      setListening(false);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [processCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const submitText = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    processCommand(inputCmd.trim());
    setInputCmd("");
  }, [inputCmd, processCommand]);

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 30px rgba(0,229,255,0.1), inset 0 0 40px rgba(0,0,0,0.5)" }}>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-cyan-900/30">
        <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #00e5ff", animation: listening ? "pulse 0.5s infinite" : "pulse 2s infinite" }} />
        <span className="text-xs font-bold tracking-[0.15em] text-cyan-400">NEURAL VOICE COMMANDER</span>
        <span className="ml-auto text-[10px] text-cyan-700 font-mono">{listening ? "● LISTENING" : "○ STANDBY"}</span>
      </div>

      <div className="p-4">
        <div className="flex items-end justify-center gap-[2px] h-16 mb-4">
          {audioLevel.map((level, i) => (
            <motion.div key={i}
              animate={{ scaleY: level, opacity: 0.4 + level * 0.6 }}
              transition={{ duration: 0.05, ease: "linear" }}
              className="w-[6px] rounded-full origin-bottom"
              style={{
                height: "100%",
                background: listening
                  ? `hsl(${180 + i * 2}, 100%, ${40 + level * 30}%)`
                  : "rgba(0,229,255,0.3)",
                boxShadow: listening && level > 0.5 ? `0 0 6px rgba(0,229,255,${level})` : "none",
              }}
            />
          ))}
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={listening ? stopListening : startListening}
            className="relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all"
            style={{
              borderColor: listening ? "#e21227" : "#00e5ff",
              background: listening ? "rgba(226,18,39,0.15)" : "rgba(0,229,255,0.08)",
              boxShadow: listening
                ? "0 0 30px rgba(226,18,39,0.5), inset 0 0 20px rgba(226,18,39,0.1)"
                : "0 0 20px rgba(0,229,255,0.2)",
            }}>
            {listening ? (
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1 bg-red-400 rounded-full" style={{ height: "20px", animation: `bounce 0.6s ${i*0.1}s infinite alternate` }} />)}
              </div>
            ) : (
              <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
              </svg>
            )}
            {listening && (
              <div className="absolute inset-0 rounded-full border border-red-500/40"
                style={{ animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite" }} />
            )}
          </button>
        </div>

        <form onSubmit={submitText} className="flex gap-2 mb-3">
          <input value={inputCmd} onChange={e => setInputCmd(e.target.value)}
            placeholder="Type command or speak..."
            className="flex-1 bg-white/5 border border-cyan-900/30 rounded-lg px-3 py-2 text-xs text-cyan-100 font-mono placeholder-cyan-900 focus:outline-none focus:border-cyan-500/50 transition-colors" />
          <button type="submit"
            className="px-3 py-2 rounded-lg border border-cyan-700/40 text-cyan-400 text-xs font-mono hover:bg-cyan-900/20 transition-colors">
            EXEC
          </button>
        </form>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          <AnimatePresence>
            {commands.map(cmd => (
              <motion.div key={cmd.id}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-lg border p-2.5"
                style={{
                  borderColor: cmd.status === "done" ? "#00e5ff33" : cmd.status === "error" ? "#e2122733" : "#ffffff15",
                  background: cmd.status === "done" ? "rgba(0,229,255,0.05)" : cmd.status === "error" ? "rgba(226,18,39,0.05)" : "rgba(255,255,255,0.03)",
                }}>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono mt-0.5"
                    style={{ color: cmd.status === "done" ? "#00e5ff" : cmd.status === "error" ? "#e21227" : "#888" }}>
                    {cmd.status === "done" ? "▶" : cmd.status === "error" ? "✕" : "◎"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400 font-mono truncate">» {cmd.transcript}</div>
                    <div className="text-[11px] text-white font-mono mt-0.5">
                      {cmd.status === "processing"
                        ? <span className="animate-pulse text-gray-500">processing...</span>
                        : cmd.action}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {commands.length === 0 && (
            <div className="text-center py-4 text-[11px] text-gray-600 font-mono">
              Click microphone or type to execute neural commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
