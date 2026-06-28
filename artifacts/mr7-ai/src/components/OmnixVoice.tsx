// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX VOICE & GESTURE — واجهة الأوامر الصوتية والنصية بلغة طبيعية
//  يدعم العربية والإنجليزية — ينفذ الأوامر فوراً بدون ضغط أي زر
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchNaturalLanguage, OMNIX_REGISTRY_MAP, type OmnixCommand } from "@/lib/OmnixRegistry";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { OmnixBrain } from "@/lib/OmnixBrain";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

interface OmnixVoiceProps {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}

interface VoiceResult {
  text: string;
  command: OmnixCommand | null;
  executed: boolean;
  success?: boolean;
  ts: number;
}

// ── Speech Recognition wrapper ───────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

function getSR(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ── Voice command executor ───────────────────────────────────────────────────

function executeVoiceCommand(
  cmd: OmnixCommand,
  params: Record<string, unknown>,
  dispatchers: NexusDispatchers
) {
  const result = cmd.execute(params, dispatchers);
  OmnixMemory.recordAction({
    actionId: cmd.id,
    actionLabel: cmd.nameAr,
    params,
    success: result.success,
  });
  OmnixBrain.setWindowOpen("omnixVoice", false);
  window.dispatchEvent(
    new CustomEvent("omnix:action-executed", { detail: { actionId: cmd.id, result } })
  );
  return result;
}

// ── Quick command input ──────────────────────────────────────────────────────

function QuickInput({
  dispatchers,
  onResult,
}: {
  dispatchers: NexusDispatchers | null;
  onResult: (r: VoiceResult) => void;
}) {
  const [text, setText] = useState("");

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !dispatchers) return;
    const cmd = matchNaturalLanguage(trimmed);
    if (cmd) {
      const res = executeVoiceCommand(cmd, {}, dispatchers);
      onResult({ text: trimmed, command: cmd, executed: true, success: res.success, ts: Date.now() });
      dispatchers.toast(`✅ ${res.messageAr}`);
    } else {
      onResult({ text: trimmed, command: null, executed: false, ts: Date.now() });
      dispatchers.toast("لم يُعثر على أمر مطابق");
    }
    setText("");
  }

  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="اكتب أمراً بالعربية أو الإنجليزية... (Enter للتنفيذ)"
        className="flex-1 bg-black/40 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-400/60 transition-colors"
        dir="auto"
      />
      <button
        onClick={handleSubmit}
        className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #00ff8820, #00e5ff10)",
          border: "1px solid #00ff8840",
          color: "#00ff88",
        }}
      >
        ⚡ نفّذ
      </button>
    </div>
  );
}

// ── Main OMNIX Voice Component ───────────────────────────────────────────────

export function OmnixVoice({ dispatchers, open, onClose }: OmnixVoiceProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<VoiceResult[]>([]);
  const [supported, setSupported] = useState(true);
  const [pulse, setPulse] = useState(false);
  const srRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR || !dispatchers) return;

    const sr = new SR();
    srRef.current = sr;
    sr.continuous = false;
    sr.interimResults = true;
    sr.lang = "ar-SA";

    sr.onstart = () => { setListening(true); setPulse(true); };
    sr.onend = () => { setListening(false); setPulse(false); };

    sr.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(text);

      if (event.results[0].isFinal) {
        const cmd = matchNaturalLanguage(text);
        if (cmd) {
          const res = executeVoiceCommand(cmd, {}, dispatchers);
          setResults((prev) => [
            { text, command: cmd, executed: true, success: res.success, ts: Date.now() },
            ...prev.slice(0, 9),
          ]);
          dispatchers.toast(`🎙️ ${res.messageAr}`);
        } else {
          // Try in English too
          sr.lang = "en-US";
          setResults((prev) => [
            { text, command: null, executed: false, ts: Date.now() },
            ...prev.slice(0, 9),
          ]);
        }
        setTranscript("");
      }
    };

    sr.onerror = () => { setListening(false); setPulse(false); };
    sr.start();
  }, [dispatchers]);

  const stopListening = useCallback(() => {
    srRef.current?.stop();
    setListening(false);
    setPulse(false);
  }, []);

  function handleResult(r: VoiceResult) {
    setResults((prev) => [r, ...prev.slice(0, 9)]);
  }

  // Top commands for quick access
  const topCmds = OmnixMemory.getTopCommands(6);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(0,8,18,0.97)",
            borderColor: "#00ff8840",
            boxShadow: "0 0 60px #00ff8820, 0 20px 60px #00000080",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "#00ff8820" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <div>
                <h2 className="text-sm font-bold text-emerald-400 tracking-widest">OMNIX VOICE</h2>
                <p className="text-xs text-white/40">أوامر صوتية ونصية بلغة طبيعية</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors text-xl"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Voice Control */}
            {supported && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={listening ? stopListening : startListening}
                  className="relative w-20 h-20 rounded-full transition-all duration-300 active:scale-95"
                  style={{
                    background: listening
                      ? "radial-gradient(circle, #00ff8840, #00ff8810)"
                      : "radial-gradient(circle, #00ff8820, #00ff8805)",
                    border: `2px solid ${listening ? "#00ff88" : "#00ff8840"}`,
                    boxShadow: listening ? "0 0 30px #00ff8850" : "0 0 10px #00ff8820",
                  }}
                >
                  {pulse && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: "#00ff8820" }}
                    />
                  )}
                  <span className="relative text-3xl">{listening ? "⏹" : "🎙️"}</span>
                </button>
                <p className="text-xs text-white/40 text-center">
                  {listening
                    ? "يستمع... تحدث الآن"
                    : "اضغط للتحدث بالعربية أو الإنجليزية"}
                </p>
                {transcript && (
                  <p className="text-sm text-emerald-300 text-center animate-pulse" dir="auto">
                    "{transcript}"
                  </p>
                )}
              </div>
            )}

            {/* Quick Text Input */}
            <div>
              <p className="text-xs text-white/40 mb-2">أو اكتب أمراً مباشرة:</p>
              <QuickInput dispatchers={dispatchers} onResult={handleResult} />
            </div>

            {/* Quick Commands */}
            {topCmds.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">الأوامر الأكثر استخداماً:</p>
                <div className="flex flex-wrap gap-2">
                  {topCmds.map((stat) => {
                    const cmd = OMNIX_REGISTRY_MAP.get(stat.actionId);
                    if (!cmd) return null;
                    return (
                      <button
                        key={stat.actionId}
                        onClick={() => {
                          if (!dispatchers) return;
                          const res = executeVoiceCommand(cmd, {}, dispatchers);
                          handleResult({
                            text: cmd.nameAr,
                            command: cmd,
                            executed: true,
                            success: res.success,
                            ts: Date.now(),
                          });
                          dispatchers.toast(`✅ ${res.messageAr}`);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                          background: "#00ff8810",
                          border: "1px solid #00ff8830",
                          color: "#00ff88",
                        }}
                      >
                        {cmd.nameAr}
                        <span className="ml-1.5 text-white/30">×{stat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results History */}
            {results.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">سجل الأوامر:</p>
                <div
                  className="rounded-xl border divide-y max-h-40 overflow-y-auto"
                  style={{ borderColor: "#00ff8815", borderTopColor: "#00ff8815" }}
                >
                  {results.map((r) => (
                    <div
                      key={r.ts}
                      className="flex items-center gap-3 px-3 py-2"
                      style={{ borderColor: "#ffffff08" }}
                    >
                      <span className="text-xs flex-shrink-0">
                        {r.executed ? (r.success ? "✅" : "❌") : "❓"}
                      </span>
                      <span className="text-xs text-white/70 flex-1 truncate" dir="auto">
                        {r.text}
                      </span>
                      {r.command && (
                        <span className="text-xs text-emerald-400/60 flex-shrink-0">
                          {r.command.nameAr}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!supported && (
              <p className="text-xs text-yellow-400/70 text-center">
                ⚠️ المتصفح لا يدعم التعرف الصوتي — استخدم الإدخال النصي
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
