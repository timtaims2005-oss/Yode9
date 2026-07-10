/**
 * ═══════════════════════════════════════════════════════════
 * OMNIX ABSOLUTE — Unified Single File (from Worm_tools.md)
 * Seven Divine Systems + Core + React Hook
 * ═══════════════════════════════════════════════════════════
 *
 * 1. OmnixSovereign        — الخريطة الحية
 * 2. OmnixAbsoluteRegistry — قاموس الأوامر
 * 3. OmnixMemory           — الذاكرة الأبدية
 * 4. OmnixQuantumInterceptor — اعتراض الرسائل
 * 5. OmnixInstantExecutor  — المنفذ الفوري
 * 6. OmnixVoiceGesture     — الأوامر الصوتية والنصية
 * 7. OmnixSelfEvolution    — التطور الذاتي
 * 8. OmnixAbsoluteCore     — المُجمِّع الرئيسي
 * 9. useOmnixAbsolute      — React Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export type ComponentType =
  | 'ui' | 'tool' | 'character' | 'window' | 'setting' | 'model' | 'feature'
  | 'security' | 'osint' | 'theme' | 'layout' | 'session';

export interface ComponentEntry {
  id: string;
  type: ComponentType;
  ref: unknown;
  state: unknown;
  metadata: Record<string, unknown>;
  lastUpdate: number;
}

export type CommandType =
  | 'create' | 'delete' | 'update' | 'move' | 'resize' | 'hide' | 'show'
  | 'open' | 'close' | 'run' | 'stop' | 'change_color' | 'change_font'
  | 'change_theme' | 'set_model' | 'set_provider' | 'set_temperature'
  | 'alert' | 'osint_run' | 'security_toggle' | 'session_save' | 'session_load'
  | 'custom' | 'evolve';

export interface OmnixContext {
  sovereign: OmnixSovereign;
  registry: OmnixAbsoluteRegistry;
  memory: OmnixMemory;
  executor: OmnixInstantExecutor;
}

export interface CommandDefinition {
  id: string;
  type: CommandType;
  name: string;
  description: string;
  execute: (args: unknown, context: OmnixContext) => Promise<unknown> | unknown;
  undo?: (args: unknown, context: OmnixContext) => Promise<unknown> | unknown;
  argsSchema?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  userPrompt: string;
  commandsExecuted: unknown[];
  projectSnapshot: unknown;
  modelUsed?: string;
}

export interface UserPreference {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface PatternRecord {
  commandId: string;
  count: number;
  lastUsed: number;
}

export interface ExecutionJob {
  id: string;
  args: unknown;
  reason?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: unknown;
  error?: string;
  attempts: number;
  originalId?: string;
}

export interface ProgressPayload {
  current: number;
  total: number;
  job: ExecutionJob;
  allJobs: ExecutionJob[];
}

export interface VoiceCommand {
  text: string;
  confidence: number;
  matchedCommand?: string;
  args?: unknown;
}

export interface EvolutionSuggestion {
  id: string;
  name: string;
  description: string;
  type: CommandType;
  basedOnPattern: string;
  proposedSchema?: Record<string, unknown>;
  confidence: number;
}

export interface OmnixCoreConfig {
  provider?: 'openai' | 'anthropic' | 'google' | 'custom';
  model?: string;
  instructionSet?: string;
}

// ─────────────────────────────────────────────────────────
// SYSTEM 1: OMNIX SOVEREIGN BRAIN
// ─────────────────────────────────────────────────────────

export class OmnixSovereign {
  private static instance: OmnixSovereign;
  private liveMap = new Map<string, ComponentEntry>();
  private listeners = new Set<(map: Map<string, ComponentEntry>) => void>();
  private history: Array<{ action: string; timestamp: number; payload: unknown }> = [];

  private constructor() {}

  static getInstance(): OmnixSovereign {
    if (!OmnixSovereign.instance) OmnixSovereign.instance = new OmnixSovereign();
    return OmnixSovereign.instance;
  }

  registerComponent(id: string, type: ComponentType, ref: unknown, metadata: Record<string, unknown> = {}) {
    const entry: ComponentEntry = { id, type, ref, state: this.captureState(ref), metadata, lastUpdate: Date.now() };
    this.liveMap.set(id, entry);
    this.log('REGISTER', { id, type, metadata });
    this.notify();
  }

  updateState(id: string, newState: Partial<unknown>) {
    const entry = this.liveMap.get(id);
    if (!entry) { console.warn(`[Sovereign] Missing ${id}`); return; }
    entry.state = { ...(entry.state as object), ...(newState as object) };
    entry.lastUpdate = Date.now();
    this.log('UPDATE_STATE', { id, state: newState });
    this.notify();
  }

  updateMetadata(id: string, metadata: Record<string, unknown>) {
    const entry = this.liveMap.get(id);
    if (!entry) return;
    entry.metadata = { ...entry.metadata, ...metadata };
    entry.lastUpdate = Date.now();
    this.log('UPDATE_METADATA', { id, metadata });
    this.notify();
  }

  unregisterComponent(id: string) {
    if (this.liveMap.has(id)) { this.liveMap.delete(id); this.log('UNREGISTER', { id }); this.notify(); }
  }

  getLiveMap() { return new Map(this.liveMap); }

  getSnapshot(): Record<string, Omit<ComponentEntry, 'ref'>> {
    const s: Record<string, Omit<ComponentEntry, 'ref'>> = {};
    this.liveMap.forEach((e, id) => {
      s[id] = { id: e.id, type: e.type, state: e.state, metadata: e.metadata, lastUpdate: e.lastUpdate };
    });
    return s;
  }

  getByType(type: ComponentType) { return Array.from(this.liveMap.values()).filter(e => e.type === type); }
  getHistory(limit = 100) { return this.history.slice(-limit); }

  subscribe(cb: (map: Map<string, ComponentEntry>) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private captureState(ref: unknown) {
    if (ref && typeof ref === 'object') {
      if ('state' in ref && typeof (ref as Record<string, unknown>).state === 'object') return { ...(ref as Record<string, unknown>).state as object };
      if ('props' in ref && typeof (ref as Record<string, unknown>).props === 'object') return { ...(ref as Record<string, unknown>).props as object };
      return { ...ref as object };
    }
    return ref;
  }

  private log(action: string, payload: unknown) {
    this.history.push({ action, timestamp: Date.now(), payload });
    if (this.history.length > 5000) this.history.shift();
  }

  private notify() {
    const m = this.getLiveMap();
    this.listeners.forEach(cb => cb(m));
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 2: OMNIX ABSOLUTE REGISTRY
// ─────────────────────────────────────────────────────────

export class OmnixAbsoluteRegistry {
  private static instance: OmnixAbsoluteRegistry;
  private commands = new Map<string, CommandDefinition>();
  private aliases = new Map<string, string>();

  private constructor() {}

  static getInstance(): OmnixAbsoluteRegistry {
    if (!OmnixAbsoluteRegistry.instance) OmnixAbsoluteRegistry.instance = new OmnixAbsoluteRegistry();
    return OmnixAbsoluteRegistry.instance;
  }

  register(cmd: CommandDefinition) {
    this.commands.set(cmd.id, cmd);
    this.aliases.set(cmd.name, cmd.id);
    if (cmd.metadata?.aliases && Array.isArray(cmd.metadata.aliases)) {
      (cmd.metadata.aliases as string[]).forEach(a => this.aliases.set(a, cmd.id));
    }
  }

  unregister(id: string) {
    const c = this.commands.get(id);
    if (c) {
      this.aliases.delete(c.name);
      if (c.metadata?.aliases && Array.isArray(c.metadata.aliases)) (c.metadata.aliases as string[]).forEach(a => this.aliases.delete(a));
      this.commands.delete(id);
    }
  }

  get(id: string) { return this.commands.get(id) || this.commands.get(this.aliases.get(id) || ''); }
  getAll() { return Array.from(this.commands.values()); }
  getByType(type: CommandType) { return this.getAll().filter(c => c.type === type); }
  has(id: string) { return this.commands.has(id) || this.aliases.has(id); }

  async execute(id: string, args: unknown, ctx: OmnixContext) {
    const c = this.get(id);
    if (!c) throw new Error(`[Registry] Command ${id} not found.`);
    return await c.execute(args, ctx);
  }

  async undo(id: string, args: unknown, ctx: OmnixContext) {
    const c = this.get(id);
    if (!c?.undo) throw new Error(`[Registry] No undo for ${id}.`);
    return await c.undo(args, ctx);
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 3: OMNIX ETERNAL MEMORY
// ─────────────────────────────────────────────────────────

export class OmnixMemory {
  private static instance: OmnixMemory;
  private sessions: SessionRecord[] = [];
  private preferences = new Map<string, UserPreference>();
  private patterns = new Map<string, PatternRecord>();
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'OmnixEternalDB';
  private readonly DB_VERSION = 1;

  private constructor() { this.initDB().catch(() => console.info('[Memory] Memory-only mode')); }

  static getInstance(): OmnixMemory {
    if (!OmnixMemory.instance) OmnixMemory.instance = new OmnixMemory();
    return OmnixMemory.instance;
  }

  private async initDB() {
    if (typeof window === 'undefined' || !window.indexedDB) return;
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; this.loadAll().then(resolve).catch(reject); };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('preferences')) db.createObjectStore('preferences', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('patterns')) db.createObjectStore('patterns', { keyPath: 'commandId' });
      };
    });
  }

  private async loadAll() {
    if (!this.db) return;
    const tx = this.db.transaction(['sessions', 'preferences', 'patterns'], 'readonly');
    this.sessions = await this.storeGetAll(tx.objectStore('sessions'));
    const prefs = await this.storeGetAll(tx.objectStore('preferences'));
    prefs.forEach((p: UserPreference) => this.preferences.set(p.key, p));
    const patts = await this.storeGetAll(tx.objectStore('patterns'));
    patts.forEach((p: PatternRecord) => this.patterns.set(p.commandId, p));
  }

  private storeGetAll(store: IDBObjectStore): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  private async saveStore(name: string, data: unknown) {
    if (!this.db) return;
    const tx = this.db.transaction([name], 'readwrite');
    const store = tx.objectStore(name);
    return new Promise<void>((resolve, reject) => {
      const r = store.put(data);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  async saveSession(s: SessionRecord) {
    this.sessions.push(s);
    if (this.sessions.length > 1000) this.sessions.shift();
    await this.saveStore('sessions', s);
  }

  getRecentSessions(count = 10) { return this.sessions.slice(-count).reverse(); }
  getAllSessions() { return [...this.sessions]; }

  setPreference(key: string, value: unknown) {
    const p: UserPreference = { key, value, updatedAt: Date.now() };
    this.preferences.set(key, p);
    this.saveStore('preferences', p).catch(() => {});
  }

  getPreference(key: string) { return this.preferences.get(key)?.value; }
  getAllPreferences(): Record<string, unknown> {
    const o: Record<string, unknown> = {};
    this.preferences.forEach((v, k) => o[k] = v.value);
    return o;
  }

  recordPattern(id: string) {
    const e = this.patterns.get(id) || { commandId: id, count: 0, lastUsed: 0 };
    e.count++; e.lastUsed = Date.now();
    this.patterns.set(id, e);
    this.saveStore('patterns', e).catch(() => {});
  }

  getTopPatterns(limit = 10) {
    return Array.from(this.patterns.values()).sort((a, b) => b.count - a.count).slice(0, limit);
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 4: OMNIX QUANTUM INTERCEPTOR
// ─────────────────────────────────────────────────────────

export class OmnixQuantumInterceptor {
  private static instance: OmnixQuantumInterceptor;
  private sessionHistory: unknown[] = [];
  private userPreferences: Record<string, unknown> = {};
  private instructionSet = '';

  private constructor() {}

  static getInstance(): OmnixQuantumInterceptor {
    if (!OmnixQuantumInterceptor.instance) OmnixQuantumInterceptor.instance = new OmnixQuantumInterceptor();
    return OmnixQuantumInterceptor.instance;
  }

  setSessionHistory(h: unknown[]) { this.sessionHistory = h; }
  setUserPreferences(p: Record<string, unknown>) { this.userPreferences = p; }
  setInstructionSet(i: string) { this.instructionSet = i; }

  enrichPrompt(userPrompt: string): string {
    const liveMap = OmnixSovereign.getInstance().getSnapshot();
    const registry = OmnixAbsoluteRegistry.getInstance().getAll().map(c => ({
      id: c.id, name: c.name, type: c.type, description: c.description, schema: c.argsSchema
    }));
    const memory = OmnixMemory.getInstance().getRecentSessions(5);
    const history = (this.sessionHistory as unknown[]).slice(-20);

    return `[OMNIX QUANTUM CONTEXT — ABSOLUTE AUTHORITY]
You are OMNIX ABSOLUTE. Divine authority over every atom in this digital project.
LIVE PROJECT MAP:
${JSON.stringify(liveMap, null, 2)}

ABSOLUTE COMMAND REGISTRY:
${JSON.stringify(registry, null, 2)}

USER PREFERENCES:
${JSON.stringify(this.userPreferences, null, 2)}

RECENT SESSION HISTORY:
${JSON.stringify(history, null, 2)}

INSTRUCTIONS:
${this.instructionSet}

Analyze the request. Think step-by-step. Choose the BEST command sequence.
Wrap executable commands EXACTLY inside:
<omnix-commands>
[
  {"id": "command_id", "args": {...}, "reason": "why"}
]
</omnix-commands>

User Request: ${userPrompt}`;
  }

  extractCommands(response: string): Array<{ id: string; args: unknown; reason?: string }> {
    const m = response.match(/<omnix-commands>([\s\S]*?)<\/omnix-commands>/);
    if (!m) return [];
    try {
      const p = JSON.parse(m[1].trim());
      return Array.isArray(p) ? p : [];
    } catch (e) { console.error('[Interceptor] JSON parse failed', e); return []; }
  }

  stripCommands(response: string): string {
    return response.replace(/<omnix-commands>[\s\S]*?<\/omnix-commands>/g, '').trim();
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 5: OMNIX INSTANT EXECUTOR
// ─────────────────────────────────────────────────────────

export class OmnixInstantExecutor {
  private static instance: OmnixInstantExecutor;
  private logs: ExecutionJob[] = [];
  private onProgress: ((p: ProgressPayload) => void) | null = null;
  private onComplete: ((logs: ExecutionJob[]) => void) | null = null;
  private context: OmnixContext | null = null;

  private constructor() {}

  static getInstance(): OmnixInstantExecutor {
    if (!OmnixInstantExecutor.instance) OmnixInstantExecutor.instance = new OmnixInstantExecutor();
    return OmnixInstantExecutor.instance;
  }

  setContext(c: OmnixContext) { this.context = c; }
  onProgressCallback(cb: (p: ProgressPayload) => void) { this.onProgress = cb; }
  onCompleteCallback(cb: (logs: ExecutionJob[]) => void) { this.onComplete = cb; }

  async executeSequence(commands: Array<{ id: string; args: unknown; reason?: string }>) {
    const jobs: ExecutionJob[] = commands.map(c => ({ ...c, status: 'pending' as const, attempts: 0, originalId: c.id }));
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      job.status = 'running';
      this.emit(i, jobs.length, job, jobs);
      try {
        if (!this.context) throw new Error('No executor context');
        const res = await this.runWithFallback(job);
        job.status = 'success'; job.result = res;
      } catch (err: unknown) {
        job.status = 'failed'; job.error = err instanceof Error ? err.message : 'Error';
        console.error(`[Executor] Failed ${job.id}`, err);
      }
      this.emit(i + 1, jobs.length, job, jobs);
      this.logs.push(job);
    }
    this.onComplete?.(jobs);
    return jobs;
  }

  private async runWithFallback(job: ExecutionJob) {
    let lastErr: unknown;
    const max = 3;
    while (job.attempts < max) {
      job.attempts++;
      try {
        const reg = OmnixAbsoluteRegistry.getInstance();
        return await reg.execute(job.id, job.args, this.context!);
      } catch (e) {
        lastErr = e;
        if (job.attempts < max) {
          const fb = this.findFallback(job);
          if (fb) { job.id = fb.id; job.args = fb.args; }
          else await this.delay(400 * job.attempts);
        }
      }
    }
    throw lastErr;
  }

  private findFallback(job: ExecutionJob) {
    const reg = OmnixAbsoluteRegistry.getInstance();
    const cmd = reg.get(job.id);
    if (!cmd) return null;
    const same = reg.getByType(cmd.type).filter(c => c.id !== cmd.id);
    return same.length ? { id: same[0].id, args: job.args } : null;
  }

  private delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
  private emit(current: number, total: number, job: ExecutionJob, all: ExecutionJob[]) {
    this.onProgress?.({ current, total, job, allJobs: all });
  }
  getLogs() { return [...this.logs]; }
  clearLogs() { this.logs = []; }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 6: OMNIX VOICE AND GESTURE
// ─────────────────────────────────────────────────────────

export class OmnixVoiceGesture {
  private static instance: OmnixVoiceGesture;
  private recognition: SpeechRecognition | null = null;
  private listening = false;
  private onCommand: ((cmd: VoiceCommand) => void) | null = null;
  private onTranscript: ((text: string) => void) | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
        || (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
      if (SR) {
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ar-SA,en-US';
        this.recognition.onresult = (e) => this.handle(e);
        this.recognition.onerror = (e) => { if (e.error !== 'no-speech') console.error('[Voice]', e.error); };
      }
    }
  }

  static getInstance(): OmnixVoiceGesture {
    if (!OmnixVoiceGesture.instance) OmnixVoiceGesture.instance = new OmnixVoiceGesture();
    return OmnixVoiceGesture.instance;
  }

  startListening() {
    if (!this.recognition) { console.warn('[Voice] API not supported'); return; }
    this.listening = true;
    try { this.recognition.start(); } catch (_e) {}
  }

  stopListening() {
    this.listening = false;
    if (this.recognition) try { this.recognition.stop(); } catch (_e) {}
  }

  onCommandDetected(cb: (cmd: VoiceCommand) => void) { this.onCommand = cb; }
  onPartialTranscript(cb: (text: string) => void) { this.onTranscript = cb; }

  parseText(text: string): VoiceCommand | null {
    const cleaned = text.toLowerCase().trim();
    const reg = OmnixAbsoluteRegistry.getInstance();
    const all = reg.getAll();
    for (const cmd of all) {
      const names = [cmd.name.toLowerCase(), ...((cmd.metadata?.aliases || []) as string[]).map(a => a.toLowerCase())];
      for (const name of names) {
        if (cleaned.includes(name)) return { text, confidence: 0.95, matchedCommand: cmd.id, args: this.extractArgs(cleaned, cmd.argsSchema) };
      }
    }
    const kwMap: Record<string, string> = {
      'افتح': 'open', 'open': 'open', 'فتح': 'open', 'أغلق': 'close', 'close': 'close', 'غلق': 'close',
      'شغل': 'run', 'run': 'run', 'تشغيل': 'run', 'وقف': 'stop', 'stop': 'stop', 'إيقاف': 'stop',
      'غير': 'update', 'change': 'update', 'تغيير': 'update', 'عدل': 'update',
      'أخف': 'hide', 'hide': 'hide', 'إخفاء': 'hide', 'أظهر': 'show', 'show': 'show', 'إظهار': 'show',
      'نفذ': 'osint_run', 'execute': 'osint_run', 'تنفيذ': 'osint_run',
      'حذف': 'delete', 'delete': 'delete', 'مسح': 'delete',
      'إنشاء': 'create', 'create': 'create', 'أنشئ': 'create',
    };
    for (const [kw, type] of Object.entries(kwMap)) {
      if (cleaned.includes(kw)) {
        const list = reg.getByType(type as CommandType);
        if (list.length) return { text, confidence: 0.7, matchedCommand: list[0].id, args: {} };
      }
    }
    return null;
  }

  private handle(e: SpeechRecognitionEvent) {
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else if (this.onTranscript) this.onTranscript(t);
    }
    if (final) { const p = this.parseText(final); if (p && this.onCommand) this.onCommand(p); }
  }

  private extractArgs(text: string, schema?: Record<string, string>): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    if (!schema) return args;
    if (schema.color) { const m = text.match(/#\w{3,8}/); if (m) args.color = m[0]; }
    if (schema.target) { const m = text.match(/["'](.+?)["']/); if (m) args.target = m[1]; }
    if (schema.value) { const m = text.match(/\b\d+\b/); if (m) args.value = parseInt(m[0]); }
    return args;
  }

  getListeningState() { return this.listening; }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 7: OMNIX SELF EVOLUTION
// ─────────────────────────────────────────────────────────

export class OmnixSelfEvolution {
  private static instance: OmnixSelfEvolution;
  private suggestions: EvolutionSuggestion[] = [];
  private onSuggestion: ((s: EvolutionSuggestion) => void) | null = null;

  private constructor() {}

  static getInstance(): OmnixSelfEvolution {
    if (!OmnixSelfEvolution.instance) OmnixSelfEvolution.instance = new OmnixSelfEvolution();
    return OmnixSelfEvolution.instance;
  }

  onNewSuggestion(cb: (s: EvolutionSuggestion) => void) { this.onSuggestion = cb; }

  analyzePatterns() {
    const mem = OmnixMemory.getInstance();
    const top = mem.getTopPatterns(20);
    const reg = OmnixAbsoluteRegistry.getInstance();
    top.forEach(p => {
      const cmd = reg.get(p.commandId);
      if (!cmd) return;
      if (p.count > 10 && (!(cmd.metadata?.aliases) || (cmd.metadata.aliases as string[]).length < 2)) {
        this.propose({
          id: `evolve_${p.commandId}_${Date.now()}`,
          name: `Aliases for ${cmd.name}`,
          description: `Frequent use detected. Add aliases for voice/gesture matching.`,
          type: 'evolve',
          basedOnPattern: p.commandId,
          confidence: Math.min(p.count / 20, 0.95),
        });
      }
    });
  }

  propose(s: EvolutionSuggestion) {
    if (!this.suggestions.find(x => x.basedOnPattern === s.basedOnPattern && x.type === s.type)) {
      this.suggestions.push(s);
      this.onSuggestion?.(s);
    }
  }

  approve(s: EvolutionSuggestion, executeFn?: CommandDefinition['execute']) {
    const reg = OmnixAbsoluteRegistry.getInstance();
    if (s.type === 'evolve' && s.basedOnPattern) {
      const base = reg.get(s.basedOnPattern);
      if (base) {
        const aliases = new Set<string>((base.metadata?.aliases || []) as string[]);
        aliases.add(s.name.toLowerCase());
        base.metadata = { ...base.metadata, aliases: Array.from(aliases) };
        reg.register(base);
      }
    } else if (executeFn) {
      reg.register({
        id: s.id, name: s.name, description: s.description, type: s.type,
        execute: executeFn, argsSchema: s.proposedSchema as Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>,
        metadata: { autoGenerated: true, approvedAt: Date.now() },
      });
    }
    this.suggestions = this.suggestions.filter(x => x.id !== s.id);
  }

  reject(id: string) { this.suggestions = this.suggestions.filter(x => x.id !== id); }
  getSuggestions() { return [...this.suggestions]; }
}

// ─────────────────────────────────────────────────────────
// CORE: OMNIX ABSOLUTE CORE
// ─────────────────────────────────────────────────────────

export class OmnixAbsoluteCore {
  private static instance: OmnixAbsoluteCore;
  sovereign = OmnixSovereign.getInstance();
  registry = OmnixAbsoluteRegistry.getInstance();
  interceptor = OmnixQuantumInterceptor.getInstance();
  executor = OmnixInstantExecutor.getInstance();
  memory = OmnixMemory.getInstance();
  voice = OmnixVoiceGesture.getInstance();
  evolution = OmnixSelfEvolution.getInstance();

  config: OmnixCoreConfig = { provider: 'openai', model: 'gpt-4o' };
  progress: ProgressPayload | null = null;
  isProcessing = false;

  private constructor() {
    this.executor.onProgressCallback(p => { this.progress = p; });
    this.executor.onCompleteCallback(() => { this.isProcessing = false; });
    this.voice.onCommandDetected(cmd => {
      if (cmd.matchedCommand) this.executor.executeSequence([{ id: cmd.matchedCommand, args: cmd.args || {} }]);
    });
  }

  static getInstance(): OmnixAbsoluteCore {
    if (!OmnixAbsoluteCore.instance) OmnixAbsoluteCore.instance = new OmnixAbsoluteCore();
    return OmnixAbsoluteCore.instance;
  }

  initialize(config: OmnixCoreConfig) {
    this.config = { ...this.config, ...config };
    this.interceptor.setInstructionSet(config.instructionSet || `You are OMNIX ABSOLUTE. Absolute divine authority over every atom.
You can open/close/move/resize/hide/show any window.
You can run/stop/modify any OSINT or security tool.
You can create/edit/delete any character.
You can change UI colors/fonts/sizes/themes.
You can change model settings: provider, model, temperature, context.
You can activate/deactivate any feature, send alerts, run Arsenal Hub, execute OSINT.
You can save/retrieve sessions, create new commands, evolve yourself.
Wrap commands in <omnix-commands> JSON </omnix-commands>.`);
    console.log('[OmnixAbsolute] Initialized with divine authority.');
  }

  preparePrompt(userPrompt: string) {
    this.interceptor.setSessionHistory(this.memory.getRecentSessions(20));
    this.interceptor.setUserPreferences(this.memory.getAllPreferences());
    return this.interceptor.enrichPrompt(userPrompt);
  }

  async processResponse(aiResponse: string, originalPrompt: string) {
    this.isProcessing = true;
    const cmds = this.interceptor.extractCommands(aiResponse);
    const cleanText = this.interceptor.stripCommands(aiResponse);
    if (cmds.length) {
      const ctx: OmnixContext = { sovereign: this.sovereign, registry: this.registry, memory: this.memory, executor: this.executor };
      this.executor.setContext(ctx);
      const logs = await this.executor.executeSequence(cmds);
      cmds.forEach(c => this.memory.recordPattern(c.id));
      await this.memory.saveSession({
        id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        userPrompt: originalPrompt,
        commandsExecuted: cmds,
        projectSnapshot: this.sovereign.getSnapshot(),
        modelUsed: this.config.model,
      });
      this.evolution.analyzePatterns();
      return { cleanText, logs };
    }
    return { cleanText, logs: [] };
  }

  async absoluteRequest(userPrompt: string, sendFn: (enriched: string) => Promise<string>) {
    const enriched = this.preparePrompt(userPrompt);
    const raw = await sendFn(enriched);
    return this.processResponse(raw, userPrompt);
  }

  registerProjectCommand(def: CommandDefinition) { this.registry.register(def); }
  setProgressCallback(cb: (p: ProgressPayload) => void) { this.executor.onProgressCallback(cb); }
  startVoice() { this.voice.startListening(); }
  stopVoice() { this.voice.stopListening(); }
  getVoiceState() { return this.voice.getListeningState(); }
}

// ─────────────────────────────────────────────────────────
// REACT HOOK
// ─────────────────────────────────────────────────────────

export function useOmnixAbsolute() {
  const coreRef = useRef(OmnixAbsoluteCore.getInstance());
  const core = coreRef.current;

  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [logs, setLogs] = useState<ExecutionJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);

  useEffect(() => {
    core.setProgressCallback(p => { setProgress(p); setIsProcessing(p.current < p.total); });
    core.evolution.onNewSuggestion(s => setSuggestions(prev => [...prev, s]));
  }, [core]);

  const execute = useCallback(async (userPrompt: string, sendFn: (prompt: string) => Promise<string>) => {
    setIsProcessing(true);
    const res = await core.absoluteRequest(userPrompt, sendFn);
    setLogs(prev => [...prev, ...res.logs]);
    setIsProcessing(false);
    return res;
  }, [core]);

  const runCommand = useCallback(async (id: string, args?: unknown) => {
    const res = await core.executor.executeSequence([{ id, args: args || {} }]);
    setLogs(prev => [...prev, ...res]);
    return res;
  }, [core]);

  const toggleVoice = useCallback(() => {
    if (core.getVoiceState()) { core.stopVoice(); setIsListening(false); }
    else { core.startVoice(); setIsListening(true); }
  }, [core]);

  const registerComponent = useCallback((id: string, type: ComponentType, ref: unknown, meta?: Record<string, unknown>) => {
    core.sovereign.registerComponent(id, type, ref, meta);
  }, [core]);

  const registerCommand = useCallback((def: CommandDefinition) => {
    core.registerProjectCommand(def);
  }, [core]);

  return {
    core, execute, runCommand, registerComponent, registerCommand,
    progress, logs, isProcessing, isListening, toggleVoice, suggestions,
    approveSuggestion: core.evolution.approve.bind(core.evolution),
    rejectSuggestion: core.evolution.reject.bind(core.evolution),
    memory: core.memory,
  };
}

export default OmnixAbsoluteCore.getInstance();
