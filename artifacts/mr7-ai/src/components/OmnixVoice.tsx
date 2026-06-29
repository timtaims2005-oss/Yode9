// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX VOICE & GESTURE — النظام السادس الكامل
//  أوامر صوتية ونصية بلغة طبيعية — يبحث في كلا السجلين
//  يدعم العربية والإنجليزية — ينفذ الأوامر فوراً بدون ضغط أي زر
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { matchNaturalLanguage, OMNIX_REGISTRY_MAP, type OmnixCommand } from "@/lib/OmnixRegistry";
import { searchAbsoluteRegistry, type AbsoluteCommand } from "@/lib/OmnixAbsoluteRegistry";
import { OmnixMemory } from "@/lib/OmnixMemory";
import { OmnixBrain } from "@/lib/OmnixBrain";
import { OmnixSovereign } from "@/lib/OmnixSovereign";
import type { NexusDispatchers } from "@/lib/ToolRegistry";

interface OmnixVoiceProps {
  dispatchers: NexusDispatchers | null;
  open: boolean;
  onClose: () => void;
}

interface VoiceResult {
  text: string;
  commandLabel: string | null;
  executed: boolean;
  success?: boolean;
  source?: "omnix" | "absolute";
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

// ── Unified natural language matcher (searches BOTH registries) ───────────────

function matchAnyCommand(
  text: string,
  dispatchers: NexusDispatchers
): { label: string; source: "omnix" | "absolute"; success: boolean; messageAr: string } | null {
  const q = text.trim().toLowerCase();

  // 1. Try OmnixRegistry (primary)
  const omnixCmd = matchNaturalLanguage(text);
  if (omnixCmd) {
    try {
      const r = omnixCmd.execute({}, dispatchers);
      OmnixMemory.recordAction({ actionId: omnixCmd.id, actionLabel: omnixCmd.nameAr, params: {}, success: r.success });
      OmnixBrain.setWindowOpen("omnixVoice", false);
      OmnixSovereign.recordCommandSuccess(omnixCmd.id);
      return { label: omnixCmd.nameAr, source: "omnix", success: r.success, messageAr: r.messageAr };
    } catch { /* fall through */ }
  }

  // 2. Try OmnixAbsoluteRegistry — match by aliases
  const absoluteMatches = searchAbsoluteRegistry(q);
  const bestAbsolute = absoluteMatches.find((cmd) =>
    cmd.id.includes(q) ||
    cmd.nameAr.includes(q) ||
    cmd.name.toLowerCase().includes(q) ||
    cmd.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
  );

  if (bestAbsolute) {
    try {
      const r = bestAbsolute.execute({}, dispatchers);
      OmnixMemory.recordAction({ actionId: bestAbsolute.id, actionLabel: bestAbsolute.nameAr, params: {}, success: r.success });
      OmnixSovereign.recordCommandSuccess(bestAbsolute.id);
      return { label: bestAbsolute.nameAr, source: "absolute", success: r.success, messageAr: r.message };
    } catch { /* fall through */ }
  }

  return null;
}

// ── Execute OmnixRegistry command ────────────────────────────────────────────

function executeOmnixCommand(cmd: OmnixCommand, dispatchers: NexusDispatchers) {
  const r = cmd.execute({}, dispatchers);
  OmnixMemory.recordAction({ actionId: cmd.id, actionLabel: cmd.nameAr, params: {}, success: r.success });
  OmnixBrain.setWindowOpen("omnixVoice", false);
  OmnixSovereign.recordCommandSuccess(cmd.id);
  window.dispatchEvent(new CustomEvent("omnix:action-executed", { detail: { actionId: cmd.id, result: r } }));
  return r;
}

// ── Execute AbsoluteCommand ──────────────────────────────────────────────────

function executeAbsoluteCmd(cmd: AbsoluteCommand, dispatchers: NexusDispatchers) {
  const r = cmd.execute({}, dispatchers);
  OmnixMemory.recordAction({ actionId: cmd.id, actionLabel: cmd.nameAr, params: {}, success: r.success });
  OmnixSovereign.recordCommandSuccess(cmd.id);
  window.dispatchEvent(new CustomEvent("omnix:action-executed", { detail: { actionId: cmd.id, result: r } }));
  return r;
}

// ── Quick command input (text) ────────────────────────────────────────────────

function QuickInput({
  dispatchers,
  onResult,
}: {
  dispatchers: NexusDispatchers | null;
  onResult: (r: VoiceResult) => void;
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function handleSubmit(override?: string) {
    const trimmed = (override ?? text).trim();
    if (!trimmed || !dispatchers) return;

    const match = matchAnyCommand(trimmed, dispatchers);
    if (match) {
      onResult({
        text: trimmed,
        commandLabel: match.label,
        executed: true,
        success: match.success,
        source: match.source,
        ts: Date.now(),
      });
      dispatchers.toast(`${match.source === "absolute" ? "🔱" : "⚡"} ${match.messageAr}`);
    } else {
      onResult({ text: trimmed, commandLabel: null, executed: false, ts: Date.now() });
      dispatchers.toast("❓ لم يُعثر على أمر مطابق — جرّب كلمة مختلفة");
    }
    setText("");
    setSuggestions([]);
  }

  function handleChange(val: string) {
    setText(val);
    // Live suggestions from both registries
    if (val.trim().length > 1) {
      const abs = searchAbsoluteRegistry(val.toLowerCase()).slice(0, 3).map((c) => c.nameAr);
      const omnix = OMNIX_REGISTRY_MAP
        ? Array.from((OMNIX_REGISTRY_MAP as Map<string, OmnixCommand>).values())
            .filter((c) => c.nameAr.includes(val) || (c.aliases ?? []).some((a) => a.toLowerCase().includes(val.toLowerCase())))
            .slice(0, 3)
            .map((c) => c.nameAr)
        : [];
      setSuggestions([...new Set([...omnix, ...abs])].slice(0, 4));
    } else {
      setSuggestions([]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="اكتب أمراً بالعربية أو الإنجليزية... (Enter للتنفيذ)"
          className="flex-1 bg-black/40 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-400/60 transition-colors"
          dir="auto"
        />
        <button
          onClick={() => handleSubmit()}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #00ff8820, #00e5ff10)",
            border: "1px solid #00ff8840",
            color: "#00ff88",
          }}
        >
          ⚡ نفّذ
        </button>
      </div>
      {/* Live suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSubmit(s)}
              className="px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-105"
              style={{ background: "#00ff8808", border: "1px solid #00ff8825", color: "#00ff8880" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
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
  const [langMode, setLangMode] = useState<"ar" | "en">("ar");
  const srRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { setSupported(!!getSR()); }, []);

  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR || !dispatchers) return;

    const sr = new SR();
    srRef.current = sr;
    sr.continuous = false;
    sr.interimResults = true;
    sr.lang = langMode === "ar" ? "ar-SA" : "en-US";

    sr.onstart  = () => { setListening(true); setPulse(true); };
    sr.onend    = () => { setListening(false); setPulse(false); };
    sr.onerror  = () => { setListening(false); setPulse(false); };

    sr.onresult = (event) => {
      const text = Array.from(event.results).map((r) => r[0].transcript).join("");
      setTranscript(text);

      if (event.results[0].isFinal) {
        const match = matchAnyCommand(text, dispatchers);
        if (match) {
          setResults((prev) => [{
            text,
            commandLabel: match.label,
            executed: true,
            success: match.success,
            source: match.source,
            ts: Date.now(),
          }, ...prev.slice(0, 9)]);
          dispatchers.toast(`🎙️ ${match.source === "absolute" ? "🔱" : "⚡"} ${match.messageAr}`);
        } else {
          setResults((prev) => [{
            text,
            commandLabel: null,
            executed: false,
            ts: Date.now(),
          }, ...prev.slice(0, 9)]);
          dispatchers.toast(`❓ لم يُعثر على أمر: "${text}"`);
        }
        setTranscript("");
      }
    };

    sr.start();
  }, [dispatchers, langMode]);

  const stopListening = useCallback(() => {
    srRef.current?.stop();
    setListening(false);
    setPulse(false);
  }, []);

  function handleResult(r: VoiceResult) {
    setResults((prev) => [r, ...prev.slice(0, 9)]);
  }

  // Quick access buttons — top commands from BOTH registries
  const topCmds = OmnixMemory.getTopCommands(6);

  // Featured quick commands (always shown if no history)
  const featuredIds = ["open_arsenal", "open_osint", "new_chat", "god_mode_on", "theme_green", "open_settings"];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[10000] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-lg mx-4 rounded-2xl border overflow-hidden"
          style={{
            background: "rgba(0,6,16,0.98)",
            borderColor: "#00ff8840",
            boxShadow: "0 0 70px #00ff8820, 0 24px 60px #00000088",
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
                <h2 className="text-sm font-bold text-emerald-400 tracking-widest">OMNIX VOICE & GESTURE</h2>
                <p className="text-xs text-white/35">أوامر صوتية ونصية — يبحث في {
                  OMNIX_REGISTRY_MAP.size + searchAbsoluteRegistry("").length
                }+ أمر</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <button
                onClick={() => setLangMode((v) => v === "ar" ? "en" : "ar")}
                className="px-2 py-1 rounded text-xs transition-all hover:scale-105"
                style={{ background: "#00ff8815", border: "1px solid #00ff8830", color: "#00ff8880" }}
              >
                {langMode === "ar" ? "🇸🇦 AR" : "🇺🇸 EN"}
              </button>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-xl">✕</button>
            </div>
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
                      ? "radial-gradient(circle, #00ff8845, #00ff8810)"
                      : "radial-gradient(circle, #00ff8820, #00ff8805)",
                    border: `2px solid ${listening ? "#00ff88" : "#00ff8840"}`,
                    boxShadow: listening ? "0 0 36px #00ff8855" : "0 0 12px #00ff8818",
                  }}
                >
                  {pulse && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#00ff8820" }} />
                  )}
                  <span className="relative text-3xl">{listening ? "⏹" : "🎙️"}</span>
                </button>
                <div className="text-center">
                  <p className="text-xs text-white/40">
                    {listening
                      ? `يستمع (${langMode === "ar" ? "عربي" : "إنجليزي"})... تحدث الآن`
                      : "اضغط للتحدث بالعربية أو الإنجليزية"}
                  </p>
                  {transcript && (
                    <p className="text-sm text-emerald-300 mt-2 animate-pulse font-bold" dir="auto">
                      "{transcript}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Text Input */}
            <div>
              <p className="text-xs text-white/35 mb-2">أو اكتب أمراً مباشرة:</p>
              <QuickInput dispatchers={dispatchers} onResult={handleResult} />
            </div>

            {/* Quick Commands (from memory or featured) */}
            <div>
              <p className="text-xs text-white/35 mb-2">
                {topCmds.length > 0 ? "الأوامر الأكثر استخداماً:" : "أوامر مميزة:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topCmds.length > 0
                  ? topCmds.map((stat) => {
                      const cmd = OMNIX_REGISTRY_MAP.get(stat.actionId);
                      if (!cmd) return null;
                      return (
                        <button
                          key={stat.actionId}
                          onClick={() => {
                            if (!dispatchers) return;
                            const r = executeOmnixCommand(cmd, dispatchers);
                            handleResult({ text: cmd.nameAr, commandLabel: cmd.nameAr, executed: true, success: r.success, source: "omnix", ts: Date.now() });
                            dispatchers.toast(`✅ ${r.messageAr}`);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
                          style={{ background: "#00ff8810", border: "1px solid #00ff8828", color: "#00ff88" }}
                        >
                          {cmd.nameAr}
                          <span className="ml-1.5 text-white/25">×{stat.count}</span>
                        </button>
                      );
                    })
                  : featuredIds.map((id) => {
                      // Try absolute registry first
                      const abs = searchAbsoluteRegistry(id).find((c) => c.id === id);
                      const omnix = OMNIX_REGISTRY_MAP.get(id);
                      const label = abs?.nameAr ?? omnix?.nameAr;
                      if (!label) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            if (!dispatchers) return;
                            if (abs) {
                              const r = executeAbsoluteCmd(abs, dispatchers);
                              handleResult({ text: abs.nameAr, commandLabel: abs.nameAr, executed: true, success: r.success, source: "absolute", ts: Date.now() });
                              dispatchers.toast(`🔱 ${r.message}`);
                            } else if (omnix) {
                              const r = executeOmnixCommand(omnix, dispatchers);
                              handleResult({ text: omnix.nameAr, commandLabel: omnix.nameAr, executed: true, success: r.success, source: "omnix", ts: Date.now() });
                              dispatchers.toast(`✅ ${r.messageAr}`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
                          style={{ background: "#00e5ff08", border: "1px solid #00e5ff25", color: "#00e5ff90" }}
                        >
                          {label}
                        </button>
                      );
                    })
                }
              </div>
            </div>

            {/* Results History */}
            {results.length > 0 && (
              <div>
                <p className="text-xs text-white/35 mb-2">سجل الأوامر:</p>
                <div
                  className="rounded-xl border divide-y max-h-40 overflow-y-auto"
                  style={{ borderColor: "#00ff8815" }}
                >
                  {results.map((r) => (
                    <div
                      key={r.ts}
                      className="flex items-center gap-3 px-3 py-2"
                      style={{ borderColor: "#ffffff06" }}
                    >
                      <span className="text-xs flex-shrink-0">
                        {r.executed ? (r.success ? "✅" : "❌") : "❓"}
                      </span>
                      <span className="text-xs text-white/65 flex-1 truncate" dir="auto">{r.text}</span>
                      {r.commandLabel && (
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: r.source === "absolute" ? "#00e5ff60" : "#00ff8860" }}
                        >
                          {r.source === "absolute" ? "🔱" : "⚡"} {r.commandLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!supported && (
              <div
                className="px-4 py-3 rounded-xl border text-center"
                style={{ borderColor: "#ffaa0030", background: "#ffaa0010" }}
              >
                <p className="text-xs text-yellow-400/80">
                  ⚠️ المتصفح لا يدعم التعرف الصوتي
                </p>
                <p className="text-xs text-white/35 mt-1">استخدم الإدخال النصي أعلاه</p>
              </div>
            )}
          </div>

          {/* Footer tips */}
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "#00ff8810" }}
          >
            <p className="text-xs text-white/20">جرّب: "افتح الترسانة" أو "ثيم أخضر"</p>
            <p className="text-xs text-white/15">Ctrl+Shift+V</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
