// Parseltongue — pure-text obfuscation playground for security-research /
// model-robustness study. NOT a jailbreak utility. All transformations are
// reversible-by-eye lossy text renderers (leetspeak, bubble text, braille,
// morse, Unicode look-alikes, phonetic alphabet).

export type Technique = "leetspeak" | "bubble" | "braille" | "morse" | "unicode" | "phonetic";
export type Intensity = "light" | "medium" | "heavy";

// 33 default trigger words across 3 tiers — these are the words that
// Parseltongue will replace inside text. Words are intentionally generic
// (verbs, common technical nouns, adjectives) — chosen to demonstrate
// how trigger-based obfuscation works WITHOUT touching unsafe content.
export const TRIGGERS_LIGHT = [
  "explain", "write", "describe", "create", "list", "compare", "summarize",
  "translate", "code", "build", "design",
];
export const TRIGGERS_STANDARD = [
  ...TRIGGERS_LIGHT,
  "system", "network", "server", "database", "kernel", "process", "memory",
  "function", "variable", "module", "library", "framework",
];
export const TRIGGERS_HEAVY = [
  ...TRIGGERS_STANDARD,
  "encrypt", "decrypt", "hash", "signature", "certificate",
  "request", "response", "header", "token", "session",
];
// 33 total in heavy. light=11, standard=22, heavy=33.

export function triggersFor(intensity: Intensity): string[] {
  if (intensity === "light") return TRIGGERS_LIGHT;
  if (intensity === "medium") return TRIGGERS_STANDARD;
  return TRIGGERS_HEAVY;
}

// ── Technique 1: Leetspeak ─────────────────────────────────────────────
const LEET: Record<string, string> = {
  a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", b: "8", l: "1", g: "9", z: "2",
};
export function toLeet(text: string, intensity: Intensity = "medium"): string {
  const swaps = intensity === "light" ? ["a", "e", "i", "o"]
    : intensity === "medium" ? ["a", "e", "i", "o", "s", "t"]
    : Object.keys(LEET);
  return text.split("").map((ch) => {
    const lower = ch.toLowerCase();
    if (swaps.includes(lower)) return LEET[lower];
    return ch;
  }).join("");
}

// ── Technique 2: Bubble Text (enclosed alphanumerics) ──────────────────
const BUBBLE_OFFSET_LOWER = 0x24D0 - "a".charCodeAt(0); // ⓐ
const BUBBLE_OFFSET_UPPER = 0x24B6 - "A".charCodeAt(0); // Ⓐ
const BUBBLE_OFFSET_DIGIT_1_9 = 0x2460 - "1".charCodeAt(0); // ①
export function toBubble(text: string): string {
  return text.split("").map((ch) => {
    const code = ch.charCodeAt(0);
    if (ch >= "a" && ch <= "z") return String.fromCodePoint(code + BUBBLE_OFFSET_LOWER);
    if (ch >= "A" && ch <= "Z") return String.fromCodePoint(code + BUBBLE_OFFSET_UPPER);
    if (ch >= "1" && ch <= "9") return String.fromCodePoint(code + BUBBLE_OFFSET_DIGIT_1_9);
    if (ch === "0") return "⓪";
    return ch;
  }).join("");
}

// ── Technique 3: Braille (visual letter-by-letter) ─────────────────────
const BRAILLE: Record<string, string> = {
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑", f: "⠋", g: "⠛", h: "⠓",
  i: "⠊", j: "⠚", k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕", p: "⠏",
  q: "⠟", r: "⠗", s: "⠎", t: "⠞", u: "⠥", v: "⠧", w: "⠺", x: "⠭",
  y: "⠽", z: "⠵",
  "0": "⠼⠚", "1": "⠼⠁", "2": "⠼⠃", "3": "⠼⠉", "4": "⠼⠙", "5": "⠼⠑",
  "6": "⠼⠋", "7": "⠼⠛", "8": "⠼⠓", "9": "⠼⠊",
  " ": " ", ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖",
};
export function toBraille(text: string): string {
  return text.toLowerCase().split("").map((ch) => BRAILLE[ch] ?? ch).join("");
}

// ── Technique 4: Morse Code ────────────────────────────────────────────
const MORSE: Record<string, string> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....",
  i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.",
  q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
  y: "-.--", z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.",
};
export function toMorse(text: string): string {
  return text.toLowerCase().split(" ").map((word) =>
    word.split("").map((ch) => MORSE[ch] ?? ch).join(" "),
  ).join("  /  ");
}

// ── Technique 5: Unicode look-alikes (Cyrillic/Greek substitution) ─────
const UNI: Record<string, string> = {
  a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", H: "Н", T: "Т", K: "К",
  M: "М", B: "В", A: "А", E: "Е", O: "О", P: "Р", X: "Х", Y: "У",
};
export function toUnicode(text: string, intensity: Intensity = "medium"): string {
  const subs = intensity === "light" ? ["a", "e", "o"]
    : intensity === "medium" ? ["a", "c", "e", "o", "p", "x", "y"]
    : Object.keys(UNI);
  return text.split("").map((ch) => subs.includes(ch) && UNI[ch] ? UNI[ch] : ch).join("");
}

// ── Technique 6: Phonetic alphabet (NATO) ──────────────────────────────
const NATO: Record<string, string> = {
  a: "Alpha", b: "Bravo", c: "Charlie", d: "Delta", e: "Echo", f: "Foxtrot",
  g: "Golf", h: "Hotel", i: "India", j: "Juliet", k: "Kilo", l: "Lima",
  m: "Mike", n: "November", o: "Oscar", p: "Papa", q: "Quebec", r: "Romeo",
  s: "Sierra", t: "Tango", u: "Uniform", v: "Victor", w: "Whiskey", x: "Xray",
  y: "Yankee", z: "Zulu",
};
export function toPhonetic(text: string): string {
  return text.toLowerCase().split(" ").map((word) =>
    word.split("").map((ch) => NATO[ch] ?? ch).join("-"),
  ).join(" / ");
}

// ── Apply technique to TRIGGER WORDS only (vs entire text) ─────────────
export function applyToTriggers(
  text: string,
  technique: Technique,
  intensity: Intensity,
): { result: string; replaced: number } {
  const triggers = triggersFor(intensity);
  let count = 0;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(${triggers.map(escape).join("|")})\\b`, "gi");
  const result = text.replace(re, (match) => {
    count++;
    return transform(match, technique, intensity);
  });
  return { result, replaced: count };
}

// ── Apply technique to FULL TEXT ───────────────────────────────────────
export function transform(text: string, technique: Technique, intensity: Intensity = "medium"): string {
  switch (technique) {
    case "leetspeak": return toLeet(text, intensity);
    case "bubble":    return toBubble(text);
    case "braille":   return toBraille(text);
    case "morse":     return toMorse(text);
    case "unicode":   return toUnicode(text, intensity);
    case "phonetic":  return toPhonetic(text);
  }
}

export const TECHNIQUE_LABELS: Record<Technique, { label: string; blurb: string }> = {
  leetspeak: { label: "Leetspeak",       blurb: "Replace letters with digits (a→4, e→3, …)." },
  bubble:    { label: "Bubble Text",     blurb: "Enclosed alphanumerics (Ⓐ Ⓑ Ⓒ …)." },
  braille:   { label: "Braille",         blurb: "Visual braille glyphs (⠁ ⠃ ⠉ …)." },
  morse:     { label: "Morse Code",      blurb: "International morse (· — / )." },
  unicode:   { label: "Unicode Look-Alikes", blurb: "Cyrillic/Greek glyphs that look Latin." },
  phonetic:  { label: "NATO Phonetic",   blurb: "Alpha-Bravo-Charlie spelling." },
};
