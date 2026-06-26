/**
 * Crash Recovery System
 * Snapshots the current state every 30 seconds via IndexedDB.
 * On startup, detects an incomplete previous session and offers recovery.
 */

import { idbSaveSnapshot, idbLoadLatestSnapshot, idbSetMeta, idbGetMeta } from "./idb-storage";
import type { AppState } from "./store";

const SNAP_INTERVAL_MS = 30_000;
const SESSION_KEY      = "mr7-session-id";
const CLOSED_CLEAN_KEY = "mr7-closed-clean";

// Generate or restore a session ID
const SESSION_ID = (() => {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
})();

export type RecoveryResult = {
  available: boolean;
  ts:        number;
  chatCount: number;
  msgCount:  number;
  state?:    AppState;
};

class CrashRecoverySystem {
  private timer:    ReturnType<typeof setInterval> | null = null;
  private lastSnap: AppState | null = null;
  private dirty     = false;

  // ── Startup: check for crash ──────────────────────────────────────────────

  async checkForRecovery(): Promise<RecoveryResult> {
    try {
      const closedClean = await idbGetMeta<boolean>(CLOSED_CLEAN_KEY);
      if (closedClean) {
        await idbSetMeta(CLOSED_CLEAN_KEY, false);
        return { available: false, ts: 0, chatCount: 0, msgCount: 0 };
      }

      const snap = await idbLoadLatestSnapshot<AppState>();
      if (!snap) return { available: false, ts: 0, chatCount: 0, msgCount: 0 };

      // If snapshot is older than 24 h, don't offer recovery
      if (Date.now() - snap.ts > 86_400_000) {
        return { available: false, ts: snap.ts, chatCount: 0, msgCount: 0 };
      }

      const chatCount = snap.data?.chats?.length ?? 0;
      const msgCount  = snap.data?.chats?.reduce((a, c: { messages?: unknown[] }) =>
        a + (c.messages?.length ?? 0), 0) ?? 0;

      await idbSetMeta(CLOSED_CLEAN_KEY, false);
      return { available: true, ts: snap.ts, chatCount, msgCount, state: snap.data };
    } catch {
      return { available: false, ts: 0, chatCount: 0, msgCount: 0 };
    }
  }

  // ── Snapshot scheduling ───────────────────────────────────────────────────

  startAutoSave(getState: () => AppState) {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      if (!this.dirty) return;
      try {
        const state = getState();
        await idbSaveSnapshot(state);
        this.lastSnap = state;
        this.dirty    = false;
      } catch { /* silent */ }
    }, SNAP_INTERVAL_MS);

    // Mark dirty immediately on changes
    window.addEventListener("beforeunload", () => {
      idbSetMeta(CLOSED_CLEAN_KEY, true).catch(() => {});
    });
  }

  markDirty() { this.dirty = true; }

  stopAutoSave() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async saveNow(state: AppState) {
    try {
      await idbSaveSnapshot(state);
      this.lastSnap = state;
      this.dirty    = false;
    } catch { /* silent */ }
  }

  get sessionId() { return SESSION_ID; }
}

export const crashRecovery = new CrashRecoverySystem();
