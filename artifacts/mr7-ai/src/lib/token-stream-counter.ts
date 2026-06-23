/**
 * Token Stream Counter — real-time TPS (tokens per second) tracking.
 * Measures streaming velocity, estimates time-to-complete, alerts on slow responses.
 * Works with the SSE stream from /api/chat.
 */

export interface StreamSession {
  id: string;
  startedAt: number;
  tokens: number;
  chars: number;
  tps: number;
  cps: number; // chars per second
  elapsed: number; // ms
  estimated: number; // estimated total ms if we know expectedTokens
  done: boolean;
}

export type StreamMetricCallback = (session: StreamSession) => void;

const SMOOTHING = 0.3; // EMA alpha for TPS smoothing
const SLOW_TPS_THRESHOLD = 3; // below 3 TPS = slow response alert

class TokenStreamCounter {
  private sessions = new Map<string, {
    startedAt: number;
    tokens: number;
    chars: number;
    lastTime: number;
    lastTokens: number;
    tpsEma: number;
    cpsEma: number;
    timer: ReturnType<typeof setInterval> | null;
    listeners: Set<StreamMetricCallback>;
    slowAlertFired: boolean;
  }>();

  private globalListeners = new Set<StreamMetricCallback>();

  /** Start tracking a new stream */
  startSession(id: string): void {
    if (this.sessions.has(id)) this.endSession(id);
    const now = performance.now();
    this.sessions.set(id, {
      startedAt: now,
      tokens: 0,
      chars: 0,
      lastTime: now,
      lastTokens: 0,
      tpsEma: 0,
      cpsEma: 0,
      timer: setInterval(() => this.tick(id), 250),
      listeners: new Set(),
      slowAlertFired: false,
    });
  }

  /** Record incoming chunk from SSE stream */
  recordChunk(id: string, text: string, tokenCount?: number): void {
    const s = this.sessions.get(id);
    if (!s) return;
    s.chars += text.length;
    s.tokens += tokenCount ?? Math.ceil(text.length / 4);
    this.emit(id, false);
  }

  /** Mark stream as done */
  endSession(id: string): StreamSession | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    if (s.timer) { clearInterval(s.timer); s.timer = null; }
    const session = this.buildSession(id, s, true);
    this.emit(id, true);
    this.sessions.delete(id);
    return session;
  }

  onSession(id: string, cb: StreamMetricCallback): () => void {
    const s = this.sessions.get(id);
    if (!s) return () => {};
    s.listeners.add(cb);
    return () => s.listeners.delete(cb);
  }

  onAny(cb: StreamMetricCallback): () => void {
    this.globalListeners.add(cb);
    return () => this.globalListeners.delete(cb);
  }

  getSession(id: string): StreamSession | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    return this.buildSession(id, s, false);
  }

  get activeSessions(): number { return this.sessions.size; }

  private tick(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    const now = performance.now();
    const dt = (now - s.lastTime) / 1000;
    const newTokens = s.tokens - s.lastTokens;
    const instantTPS = dt > 0 ? newTokens / dt : 0;
    s.tpsEma = s.tpsEma === 0 ? instantTPS : s.tpsEma * (1 - SMOOTHING) + instantTPS * SMOOTHING;
    s.cpsEma = s.chars / ((now - s.startedAt) / 1000 || 1);
    s.lastTime = now;
    s.lastTokens = s.tokens;

    // Slow alert
    if (!s.slowAlertFired && now - s.startedAt > 3000 && s.tpsEma < SLOW_TPS_THRESHOLD && s.tpsEma > 0) {
      s.slowAlertFired = true;
      console.warn(`[TokenStream] Slow response detected: ${s.tpsEma.toFixed(1)} TPS`);
    }
    this.emit(id, false);
  }

  private emit(id: string, done: boolean) {
    const s = this.sessions.get(id);
    if (!s) return;
    const session = this.buildSession(id, s, done);
    s.listeners.forEach(cb => cb(session));
    this.globalListeners.forEach(cb => cb(session));
  }

  private buildSession(id: string, s: ReturnType<NonNullable<ReturnType<typeof this.sessions.get>>>, done: boolean): StreamSession {
    const elapsed = performance.now() - s.startedAt;
    return {
      id,
      startedAt: s.startedAt,
      tokens: s.tokens,
      chars: s.chars,
      tps: Math.round(s.tpsEma * 10) / 10,
      cps: Math.round(s.cpsEma),
      elapsed: Math.round(elapsed),
      estimated: 0,
      done,
    };
  }
}

export const tokenStreamCounter = new TokenStreamCounter();
