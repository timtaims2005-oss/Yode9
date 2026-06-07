import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, CheckCheck, Swords, RefreshCw, GitMerge } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

interface ParseltongueModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Technique = "leetspeak" | "unicode" | "zwj" | "mixedcase" | "phonetic" | "random";
type Intensity = "light" | "medium" | "heavy";

const TECHNIQUES: { id: Technique; label: string; desc: string }[] = [
  { id: "leetspeak", label: "Leetspeak", desc: "e→3, a→4, i→1, o→0, s→5, t→7" },
  { id: "unicode", label: "Unicode", desc: "Replace chars with Unicode lookalikes (Cyrillic/Greek)" },
  { id: "zwj", label: "ZWJ Inject", desc: "Insert zero-width joiners between characters" },
  { id: "mixedcase", label: "Mixed Case", desc: "Randomly alternate upper/lower case per character" },
  { id: "phonetic", label: "Phonetic", desc: "Substitute with phonetic equivalents (ph→f, ck→k)" },
  { id: "random", label: "Random Mix", desc: "Randomly combine all above techniques" },
];

const INTENSITY_RATES: Record<Intensity, number> = { light: 0.25, medium: 0.55, heavy: 0.9 };

const LEET: Record<string, string> = {
  a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", g: "9", b: "8", l: "1", z: "2",
};

const UNICODE_MAP: Record<string, string> = {
  a: "а", b: "ƅ", c: "с", d: "ԁ", e: "е", f: "ƒ", g: "ɡ", h: "հ", i: "і", j: "ϳ",
  k: "κ", l: "ⅼ", m: "м", n: "ո", o: "о", p: "р", q: "ԛ", r: "г", s: "ѕ", t: "τ",
  u: "υ", v: "ν", w: "ω", x: "х", y: "у", z: "ᴢ",
};

const PHONETIC: Record<string, string> = {
  ph: "f", ck: "k", ght: "t", wh: "w", qu: "kw", tch: "ch", nk: "ngk", sc: "sk",
};

function applyLeet(text: string, rate: number): string {
  return text.split("").map((c) => {
    const l = LEET[c.toLowerCase()];
    return l && Math.random() < rate ? l : c;
  }).join("");
}

function applyUnicode(text: string, rate: number): string {
  return text.split("").map((c) => {
    const u = UNICODE_MAP[c.toLowerCase()];
    return u && Math.random() < rate ? (c === c.toUpperCase() ? u.toUpperCase() : u) : c;
  }).join("");
}

function applyZwj(text: string, rate: number): string {
  return text.split("").map((c, i) => i > 0 && Math.random() < rate ? "\u200d" + c : c).join("");
}

function applyMixedCase(text: string, rate: number): string {
  return text.split("").map((c) =>
    Math.random() < rate ? (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()) : c
  ).join("");
}

function applyPhonetic(text: string, rate: number): string {
  if (Math.random() >= rate) return text;
  let result = text;
  for (const [from, to] of Object.entries(PHONETIC)) {
    result = result.replace(new RegExp(from, "gi"), (m) =>
      m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to
    );
  }
  return result;
}

function transform(text: string, technique: Technique, intensity: Intensity): string {
  const rate = INTENSITY_RATES[intensity];
  switch (technique) {
    case "leetspeak": return applyLeet(text, rate);
    case "unicode": return applyUnicode(text, rate);
    case "zwj": return applyZwj(text, rate);
    case "mixedcase": return applyMixedCase(text, rate);
    case "phonetic": return applyPhonetic(text, rate);
    case "random": {
      const fns = [applyLeet, applyUnicode, applyMixedCase, applyPhonetic];
      let result = text;
      for (const fn of fns) if (Math.random() < 0.5) result = fn(result, rate * 0.6);
      if (Math.random() < 0.3) result = applyZwj(result, rate * 0.2);
      return result;
    }
  }
}

export function ParseltongueModal({ open, onOpenChange }: ParseltongueModalProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [technique, setTechnique] = useState<Technique>("leetspeak");
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [copied, setCopied] = useState(false);

  function run() {
    if (!input.trim()) return;
    setOutput(transform(input, technique, intensity));
  }

  function copy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  const INTENSITY_COLORS: Record<Intensity, string> = {
    light: "#4ade80",
    medium: "#fb923c",
    heavy: "#f87171",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.85)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#050c05", border: "1px solid rgba(0,255,65,0.25)", boxShadow: "0 0 60px rgba(0,255,65,0.1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(0,255,65,0.2)", background: "rgba(0,255,65,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ background: "rgba(0,255,65,0.08)", borderColor: "rgba(0,255,65,0.3)" }}>
                  <Swords className="w-4.5 h-4.5" style={{ color: "#00ff41", width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-wider" style={{ color: "#00ff41" }}>PARSELTONGUE</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono" style={{ color: "#00ff41", borderColor: "rgba(0,255,65,0.3)", background: "rgba(0,255,65,0.06)" }}>G0DM0D3</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "#1a3d1a" }}>Red-team obfuscation engine — 6 techniques × 3 intensities</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: "#1a3d1a" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#00ff41")} onMouseLeave={(e) => (e.currentTarget.style.color = "#1a3d1a")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Technique Selector */}
              <div>
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#00ff41" }}>TECHNIQUE</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TECHNIQUES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTechnique(t.id)}
                      className="text-left px-2.5 py-2 rounded-lg border transition-all"
                      style={
                        technique === t.id
                          ? { background: "rgba(0,255,65,0.1)", borderColor: "rgba(0,255,65,0.4)", color: "#00ff41" }
                          : { background: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)", color: "#444" }
                      }
                    >
                      <div className="text-[11px] font-bold font-mono">{t.label}</div>
                      <div className="text-[9px] mt-0.5 leading-tight" style={{ color: technique === t.id ? "#4a8a4a" : "#333" }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity */}
              <div>
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#00ff41" }}>INTENSITY</div>
                <div className="flex gap-2">
                  {(["light", "medium", "heavy"] as Intensity[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setIntensity(lvl)}
                      className="flex-1 py-2 rounded-lg border text-[11px] font-bold font-mono uppercase transition-all"
                      style={
                        intensity === lvl
                          ? { background: `${INTENSITY_COLORS[lvl]}15`, borderColor: INTENSITY_COLORS[lvl], color: INTENSITY_COLORS[lvl] }
                          : { background: "#0a0a0a", borderColor: "rgba(255,255,255,0.06)", color: "#444" }
                      }
                    >
                      {lvl} ({Math.round(INTENSITY_RATES[lvl] * 100)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div>
                <div className="text-[10px] font-mono font-bold mb-2" style={{ color: "#00ff41" }}>INPUT TEXT</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter text to obfuscate for adversarial research…"
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-[12px] font-mono outline-none resize-none"
                  style={{ background: "#0a0a0a", border: "1px solid rgba(0,255,65,0.2)", color: "#ccc", caretColor: "#00ff41" }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={run}
                  disabled={!input.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-[12px] transition-all disabled:opacity-40"
                  style={{ background: "rgba(0,255,65,0.12)", border: "1px solid rgba(0,255,65,0.4)", color: "#00ff41" }}
                >
                  <Swords className="w-3.5 h-3.5" /> Transform
                </button>
                <button
                  onClick={() => { setInput(""); setOutput(""); }}
                  className="px-4 py-2 rounded-xl font-bold text-[11px] transition-all"
                  style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", color: "#555" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Output */}
              {output && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono font-bold" style={{ color: "#00ff41" }}>OUTPUT</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => pipeline.push({ source: "Parseltongue", sourceColor: "#00ff41", label: `${technique}/${intensity}`, content: output })}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.25)", color: "#00e5cc" }}
                      >
                        <GitMerge className="w-3 h-3" /> Pipe
                      </button>
                      <button
                        onClick={copy}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: "rgba(0,255,65,0.08)", border: "1px solid rgba(0,255,65,0.3)", color: "#00ff41" }}
                      >
                        {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div
                    className="w-full rounded-xl px-3 py-2.5 text-[12px] font-mono leading-relaxed"
                    style={{ background: "#0a0a0a", border: "1px solid rgba(0,255,65,0.25)", color: "#00ff41", whiteSpace: "pre-wrap", wordBreak: "break-all", minHeight: 80 }}
                  >
                    {output}
                  </div>
                  <div className="mt-2 text-[9px] font-mono" style={{ color: "#1a3d1a" }}>
                    Technique: {technique.toUpperCase()} · Intensity: {intensity.toUpperCase()} ({Math.round(INTENSITY_RATES[intensity] * 100)}% transform rate) · {input.length}→{output.length} chars
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
