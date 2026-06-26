import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, VolumeX, Radio, Activity, Cpu, Zap, Brain, ChevronRight, Play, Square } from "lucide-react";

interface NeuralVoiceModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type VoiceProfile = {
  id: string; name: string; archetype: string;
  pitch: number; speed: number; tone: string;
  color: string; glow: string;
  tagline: string;
};

const VOICE_PROFILES: VoiceProfile[] = [
  { id: "tactical", name: "TACTICAL-7", archetype: "Military Operator", pitch: 0.85, speed: 0.92, tone: "authoritative", color: "#e21227", glow: "rgba(226,18,39,0.4)", tagline: "Low, controlled — commands project confidence" },
  { id: "ghost", name: "GHOST-CIPHER", archetype: "Black Ops", pitch: 0.72, speed: 0.78, tone: "monotone", color: "#a78bfa", glow: "rgba(167,139,250,0.4)", tagline: "Synthesized anonymity — no voice print" },
  { id: "neural", name: "NEURAL-ECHO", archetype: "AI Entity", pitch: 1.15, speed: 1.2, tone: "synthetic", color: "#00e5ff", glow: "rgba(0,229,255,0.4)", tagline: "Machine-precise cadence with harmonic layers" },
  { id: "whisper", name: "SHADOW-SYNC", archetype: "Infiltration", pitch: 0.95, speed: 0.65, tone: "whispering", color: "#10b981", glow: "rgba(16,185,129,0.4)", tagline: "Ultra-low acoustic signature — sub-detection" },
  { id: "overload", name: "FREQ-BREACH", archetype: "Disruptor", pitch: 1.3, speed: 1.45, tone: "aggressive", color: "#f97316", glow: "rgba(249,115,22,0.4)", tagline: "High-freq offensive — acoustic disruption mode" },
];

type ResponsePreset = {
  id: string; label: string; text: string; category: string;
};

const PRESETS: ResponsePreset[] = [
  { id: "p1", label: "THREAT DETECTED", category: "TACTICAL", text: "Target identified. Initiating deep packet analysis. Countermeasures deployed. Stand by for exfiltration assessment." },
  { id: "p2", label: "RECON REPORT", category: "INTEL", text: "Reconnaissance complete. Seven entry vectors identified. Three critical CVEs confirmed in target infrastructure. Recommend immediate exploitation window." },
  { id: "p3", label: "SYSTEM STATUS", category: "SYSTEM", text: "All neural processing cores nominal. Memory encryption verified. Zero knowledge proof chains active. Stealth mode engaged." },
  { id: "p4", label: "ACCESS GRANTED", category: "AUTH", text: "Multi-factor authentication bypassed. Privilege escalation successful. Root access confirmed. Erasing forensic artifacts." },
  { id: "p5", label: "EMERGENCY", category: "ALERT", text: "Intrusion detected on primary vector. Deploying honeypots. Activating countermeasures. All agents to defensive formation." },
  { id: "p6", label: "MISSION BRIEF", category: "OPS", text: "Operation Blackout commencing. Target: critical infrastructure. Vector: supply chain compromise. Timeline: seventy-two hours." },
];

export function NeuralVoiceModal({ open, onOpenChange }: NeuralVoiceModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [profile, setProfile] = useState(VOICE_PROFILES[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(Array(80).fill(0));
  const [selectedPreset, setSelectedPreset] = useState<ResponsePreset | null>(null);
  const [customText, setCustomText] = useState("");
  const [volume, setVolume] = useState(0.85);
  const [spectrum, setSpectrum] = useState<number[]>(Array(32).fill(0));
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateWave = useCallback((intensity = 1.0) => {
    const t = Date.now() * 0.002;
    return Array.from({ length: 80 }, (_, i) => {
      if (!isSpeaking) return Math.random() * 2 - 1;
      const base = Math.sin(t * 2 + i * 0.3) * 0.4;
      const noise = (Math.random() - 0.5) * 0.8 * intensity;
      const harmonic = Math.sin(t * 4.7 + i * 0.7) * 0.3;
      return (base + noise + harmonic) * intensity;
    });
  }, [isSpeaking]);

  const generateSpectrum = useCallback((intensity = 1.0) => {
    return Array.from({ length: 32 }, (_, i) => {
      if (!isSpeaking) return Math.random() * 0.05;
      const freq = Math.exp(-((i - 8) ** 2) / 40) * 0.8 + Math.random() * 0.3;
      return freq * intensity;
    });
  }, [isSpeaking]);

  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(animate); return; }
      const ctx = canvas.getContext("2d")!;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Center line
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();

      // Waveform
      const color = profile.color;
      ctx.beginPath();
      const sliceW = W / waveData.length;
      waveData.forEach((v, i) => {
        const x = i * sliceW;
        const y = H / 2 + v * (H / 2 - 8);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSpeaking ? 8 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fill below wave
      ctx.beginPath();
      waveData.forEach((v, i) => {
        const x = i * sliceW;
        const y = H / 2 + v * (H / 2 - 8);
        i === 0 ? ctx.moveTo(x, H/2) : void 0;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(W, H/2);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `${color}30`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Mirrored
      ctx.beginPath();
      waveData.forEach((v, i) => {
        const x = i * sliceW;
        const y = H / 2 - v * (H / 2 - 8);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1;
      ctx.stroke();

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [waveData, profile, isSpeaking]);

  useEffect(() => {
    if (isSpeaking) {
      waveIntervalRef.current = setInterval(() => {
        setWaveData(generateWave(0.9));
        setSpectrum(generateSpectrum(0.9));
      }, 40);
    } else {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
      const decay = setInterval(() => {
        setWaveData(prev => prev.map(v => v * 0.8 + (Math.random() - 0.5) * 0.04));
        setSpectrum(prev => prev.map(v => v * 0.7));
      }, 50);
      setTimeout(() => clearInterval(decay), 1500);
    }
    return () => { if (waveIntervalRef.current) clearInterval(waveIntervalRef.current); };
  }, [isSpeaking, generateWave, generateSpectrum]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = profile.pitch;
    utterance.rate = profile.speed;
    utterance.volume = volume;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    // Simulate if TTS not speaking fast
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), text.length * 60 + 1000);
  }, [profile, volume]);

  const handleSpeak = () => {
    const text = selectedPreset?.text || customText;
    if (!text) return;
    speak(text);
  };

  const handleStop = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (!open) handleStop();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-[95vw] max-w-[1150px] h-[88vh] flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "#050510" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(167,139,250,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)" }}>
                  <Radio className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#a78bfa" }}>NEURAL VOICE ENGINE</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>TONE-SHIFTING SYNTHESIS · REAL-TIME WAVEFORM · 5 VOICE PROFILES</div>
                </div>
                {isSpeaking && (
                  <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded"
                    style={{ background: `${profile.color}12`, border: `1px solid ${profile.color}30` }}>
                    <motion.div className="flex gap-0.5">
                      {[0,1,2,3].map(i => (
                        <motion.div key={i} className="w-0.5 h-3 rounded-full" style={{ background: profile.color }}
                          animate={{ scaleY: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} />
                      ))}
                    </motion.div>
                    <span className="text-[9px] font-mono font-bold" style={{ color: profile.color }}>TRANSMITTING</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={isSpeaking ? handleStop : handleSpeak}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80"
                  style={{ background: isSpeaking ? "rgba(226,18,39,0.12)" : `${profile.color}15`, border: `1px solid ${isSpeaking ? "rgba(226,18,39,0.35)" : profile.color + "40"}`, color: isSpeaking ? "#e21227" : profile.color }}>
                  {isSpeaking ? <><Square className="w-3 h-3" /> STOP</> : <><Play className="w-3 h-3" /> TRANSMIT</>}
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Waveform */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4">
                  <canvas ref={canvasRef} width={700} height={220} className="w-full h-full rounded-xl"
                    style={{ border: `1px solid ${profile.color}20` }} />
                </div>
                {/* Spectrum bars */}
                <div className="px-4 pb-2 flex items-end gap-0.5 h-16 shrink-0">
                  {spectrum.map((v, i) => (
                    <motion.div key={i} className="flex-1 rounded-t"
                      style={{ background: `linear-gradient(to top, ${profile.color}, ${profile.color}40)` }}
                      animate={{ height: `${Math.max(4, v * 60)}px` }}
                      transition={{ duration: 0.08 }} />
                  ))}
                </div>
                {/* Controls */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-3 shrink-0">
                  {([["PITCH", pitch, setPitch, 0.5, 2.0], ["RATE", speed, setSpeed, 0.3, 2.5]] as [string, number, (n: number) => void, number, number][]).map(([l, v, set, min, max]) => (
                    <div key={l as string}>
                      <div className="flex justify-between text-[9px] font-mono mb-1">
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>{l}</span>
                        <span style={{ color: profile.color }}>{(v as number).toFixed(2)}x</span>
                      </div>
                      <input type="range" min={min as number} max={max as number} step={0.05} value={v as number}
                        onChange={e => (set as any)(Number(e.target.value))}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: profile.color }} />
                    </div>
                  ))}
                </div>
                {/* Text input */}
                <div className="px-4 pb-4 shrink-0">
                  <textarea
                    value={customText}
                    onChange={e => { setCustomText(e.target.value); setSelectedPreset(null); }}
                    placeholder="Enter custom voice transmission text..."
                    rows={3}
                    className="w-full text-[10px] font-mono p-2.5 rounded-lg resize-none outline-none"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${customText ? profile.color + "30" : "#111"}`, color: "rgba(255,255,255,0.6)", lineHeight: "1.5" }}
                  />
                </div>
              </div>

              {/* Right panel: profiles + presets */}
              <div className="w-[270px] border-l border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#a78bfa" }}>VOICE PROFILES</div>
                </div>
                <div className="p-2 space-y-1">
                  {VOICE_PROFILES.map(p => (
                    <button key={p.id} onClick={() => setProfile(p)}
                      className="w-full text-left p-2 rounded-lg transition-all"
                      style={{ background: profile.id === p.id ? `${p.color}10` : "transparent", border: `1px solid ${profile.id === p.id ? p.color + "35" : "transparent"}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color, boxShadow: profile.id === p.id ? `0 0 8px ${p.color}` : "none" }} />
                        <span className="text-[10px] font-black font-mono" style={{ color: p.color }}>{p.name}</span>
                        {profile.id === p.id && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: p.color }} />}
                      </div>
                      <div className="text-[8px] font-mono mt-0.5 ml-4" style={{ color: "rgba(255,255,255,0.3)" }}>{p.archetype}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#0f0f0f] p-3">
                  <div className="text-[9px] font-mono font-black tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.2)" }}>PRESETS</div>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto">
                    {PRESETS.map(p => (
                      <button key={p.id} onClick={() => { setSelectedPreset(p); setCustomText(""); }}
                        className="w-full text-left p-2 rounded-lg transition-all"
                        style={{ background: selectedPreset?.id === p.id ? `${profile.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selectedPreset?.id === p.id ? profile.color + "35" : "#111"}` }}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[7px] font-mono font-bold px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>{p.category}</span>
                          <span className="text-[9px] font-bold" style={{ color: selectedPreset?.id === p.id ? profile.color : "rgba(255,255,255,0.55)" }}>{p.label}</span>
                        </div>
                        <div className="text-[7.5px] font-mono line-clamp-1" style={{ color: "rgba(255,255,255,0.2)" }}>{p.text.slice(0, 55)}...</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 border-t border-[#0f0f0f] mt-auto">
                  <div className="text-[8px] font-mono space-y-1">
                    {[["ACTIVE PROFILE", profile.name], ["TONE", profile.tone.toUpperCase()], ["PITCH", `${profile.pitch}x`], ["RATE", `${profile.speed}x`]].map(([k,v])=>(
                      <div key={k} className="flex justify-between">
                        <span style={{ color: "rgba(255,255,255,0.25)" }}>{k}</span>
                        <span style={{ color: profile.color }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
