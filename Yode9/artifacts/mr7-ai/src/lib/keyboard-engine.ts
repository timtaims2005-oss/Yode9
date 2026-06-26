/**
 * Keyboard Engine — centralized, conflict-free keyboard shortcut management.
 * Priority-based resolution, context-aware (modal open → block global shortcuts),
 * Vim-style sequence support (e.g. "g g" → go to top), chord support.
 */

export type KeyMod = "ctrl" | "shift" | "alt" | "meta";
export type KeyContext = "global" | "chat" | "modal" | "editor";

export interface Shortcut {
  id: string;
  keys: string; // e.g. "ctrl+k", "ctrl+shift+p", "g g"
  description: string;
  descriptionAr?: string;
  context?: KeyContext;
  priority?: number; // higher = wins conflicts
  action: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
  allowInInput?: boolean;
}

function parseKey(keys: string): { mods: Set<KeyMod>; key: string }[] {
  return keys.split(" ").map(chord => {
    const parts = chord.toLowerCase().split("+");
    const key = parts.pop()!;
    const mods = new Set<KeyMod>(parts as KeyMod[]);
    return { mods, key };
  });
}

function matchChord(e: KeyboardEvent, chord: { mods: Set<KeyMod>; key: string }): boolean {
  if (e.ctrlKey  !== chord.mods.has("ctrl"))  return false;
  if (e.shiftKey !== chord.mods.has("shift")) return false;
  if (e.altKey   !== chord.mods.has("alt"))   return false;
  if (e.metaKey  !== chord.mods.has("meta"))  return false;
  const k = e.key.toLowerCase();
  return k === chord.key || (chord.key === "enter" && k === "enter") || (chord.key === "escape" && k === "escape");
}

class KeyboardEngine {
  private shortcuts = new Map<string, Shortcut>();
  private activeContext: KeyContext = "global";
  private sequence: string[] = [];
  private sequenceTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled = true;

  init() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", this.onKeyDown, true);
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown, true);
  }

  register(shortcut: Shortcut) {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  setContext(ctx: KeyContext) {
    this.activeContext = ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }

  getAll(): Shortcut[] {
    return [...this.shortcuts.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    const target = e.target as HTMLElement;
    const inInput = ["INPUT", "TEXTAREA"].includes(target?.tagName ?? "") || target?.isContentEditable;

    // Build current key string for sequence matching
    const parts: string[] = [];
    if (e.ctrlKey)  parts.push("ctrl");
    if (e.metaKey)  parts.push("meta");
    if (e.altKey)   parts.push("alt");
    if (e.shiftKey) parts.push("shift");
    parts.push(e.key.toLowerCase());
    const keyStr = parts.join("+");

    // Update sequence buffer
    this.sequence.push(keyStr);
    if (this.sequence.length > 5) this.sequence.shift();
    if (this.sequenceTimer) clearTimeout(this.sequenceTimer);
    this.sequenceTimer = setTimeout(() => { this.sequence = []; }, 800);

    // Find matching shortcut (priority order)
    const candidates = [...this.shortcuts.values()]
      .filter(s => !s.context || s.context === "global" || s.context === this.activeContext)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const shortcut of candidates) {
      if (inInput && !shortcut.allowInInput) continue;
      const chords = parseKey(shortcut.keys);
      const isSequence = chords.length > 1;

      if (isSequence) {
        const seqStr = chords.map(c => [...c.mods, c.key].join("+")).join(" ");
        const seqWindow = this.sequence.slice(-chords.length).join(" ");
        if (seqStr === seqWindow) {
          if (shortcut.preventDefault !== false) e.preventDefault();
          this.sequence = [];
          shortcut.action(e);
          return;
        }
      } else {
        if (matchChord(e, chords[0])) {
          if (shortcut.preventDefault !== false) e.preventDefault();
          this.sequence = [];
          shortcut.action(e);
          return;
        }
      }
    }
  };
}

export const keyboardEngine = new KeyboardEngine();
