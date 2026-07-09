/**
 * ═══════════════════════════════════════════════════════════
 * OMNIX ABSOLUTE — Unified Single File
 * Nine Divine Systems + React Hook
 * ═══════════════════════════════════════════════════════════
 *
 * 1. OmnixSovereign        — الخريطة الحية لكل مكون في المشروع
 * 2. OmnixAbsoluteRegistry — قاموس الأوامر القابل للتوسع
 * 3. OmnixMemory           — الذاكرة الأبدية (IndexedDB + ذاكرة)
 * 4. OmnixQuantumInterceptor — اعتراض الرسائل وحقن السياق
 * 5. OmnixInstantExecutor  — المنفذ الفوري مع إعادة المحاولة
 * 6. OmnixVoiceGesture     — الأوامر الصوتية بالعربية والإنجليزية
 * 7. OmnixSelfEvolution    — التطور الذاتي بناءً على الاستخدام
 * 8. OmnixAbsoluteCore     — المُجمِّع الرئيسي
 * 9. useOmnixAbsolute      — React Hook موحد
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export type ComponentType =
  | "ui" | "tool" | "character" | "window" | "setting" | "model" | "feature"
  | "security" | "osint" | "theme" | "layout" | "session";

export interface ComponentEntry {
  id: string;
  type: ComponentType;
  ref: unknown;
  state: unknown;
  metadata: Record<string, unknown>;
  lastUpdate: number;
}

export type CommandType =
  | "create" | "delete" | "update" | "move" | "resize" | "hide" | "show"
  | "open" | "close" | "run" | "stop" | "change_color" | "change_font"
  | "change_theme" | "set_model" | "set_provider" | "set_temperature"
  | "alert" | "osint_run" | "security_toggle" | "session_save" | "session_load"
  | "custom" | "evolve";

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
  nameAr?: string;
  description: string;
  aliases?: string[];
  execute: (args: Record<string, unknown>, context: OmnixContext) => Promise<unknown> | unknown;
  undo?: (args: Record<string, unknown>, context: OmnixContext) => Promise<unknown> | unknown;
  argsSchema?: Record<string, "string" | "number" | "boolean" | "object" | "array">;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  userPrompt: string;
  commandsExecuted: Array<{ id: string; args: Record<string, unknown>; reason?: string }>;
  projectSnapshot: Record<string, unknown>;
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
  args: Record<string, unknown>;
  reason?: string;
  status: "pending" | "running" | "success" | "failed";
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

export interface VoiceCommandResult {
  text: string;
  confidence: number;
  matchedCommand?: string;
  args?: Record<string, unknown>;
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
  provider?: string;
  model?: string;
  instructionSet?: string;
}

// ─────────────────────────────────────────────────────────
// SYSTEM 1: OMNIX SOVEREIGN BRAIN
// الخريطة الحية — تتبع كل مكون في المشروع في الوقت الفعلي
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

  registerComponent(
    id: string,
    type: ComponentType,
    ref: unknown,
    metadata: Record<string, unknown> = {}
  ) {
    const entry: ComponentEntry = {
      id, type, ref,
      state: this.captureState(ref),
      metadata,
      lastUpdate: Date.now(),
    };
    this.liveMap.set(id, entry);
    this.log("REGISTER", { id, type, metadata });
    this.notify();
  }

  updateState(id: string, newState: Record<string, unknown>) {
    const entry = this.liveMap.get(id);
    if (!entry) return;
    entry.state = { ...(entry.state as Record<string, unknown>), ...newState };
    entry.lastUpdate = Date.now();
    this.log("UPDATE_STATE", { id, state: newState });
    this.notify();
  }

  updateMetadata(id: string, metadata: Record<string, unknown>) {
    const entry = this.liveMap.get(id);
    if (!entry) return;
    entry.metadata = { ...entry.metadata, ...metadata };
    entry.lastUpdate = Date.now();
    this.notify();
  }

  unregisterComponent(id: string) {
    if (this.liveMap.has(id)) {
      this.liveMap.delete(id);
      this.log("UNREGISTER", { id });
      this.notify();
    }
  }

  getLiveMap(): Map<string, ComponentEntry> { return new Map(this.liveMap); }

  getSnapshot(): Record<string, Omit<ComponentEntry, "ref">> {
    const s: Record<string, Omit<ComponentEntry, "ref">> = {};
    this.liveMap.forEach((e, id) => {
      s[id] = { id, type: e.type, state: e.state, metadata: e.metadata, lastUpdate: e.lastUpdate };
    });
    return s;
  }

  getByType(type: ComponentType): ComponentEntry[] {
    return Array.from(this.liveMap.values()).filter(e => e.type === type);
  }

  getHistory(limit = 100) { return this.history.slice(-limit); }
  getComponentCount(): number { return this.liveMap.size; }

  subscribe(cb: (map: Map<string, ComponentEntry>) => void): () => void {
    this.listeners.add(cb);
    cb(this.getLiveMap());
    return () => this.listeners.delete(cb);
  }

  private captureState(ref: unknown): unknown {
    if (ref && typeof ref === "object") {
      const r = ref as Record<string, unknown>;
      if (r.state && typeof r.state === "object") return { ...(r.state as Record<string, unknown>) };
      if (r.props && typeof r.props === "object") return { ...(r.props as Record<string, unknown>) };
      return { ...r };
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
// قاموس الأوامر — كل أمر قابل للتسجيل والإلغاء والتنفيذ
// ─────────────────────────────────────────────────────────

export class OmnixAbsoluteRegistry {
  private static instance: OmnixAbsoluteRegistry;
  private commands = new Map<string, CommandDefinition>();
  private aliases = new Map<string, string>();
  private listeners = new Set<() => void>();

  private constructor() {}

  static getInstance(): OmnixAbsoluteRegistry {
    if (!OmnixAbsoluteRegistry.instance) OmnixAbsoluteRegistry.instance = new OmnixAbsoluteRegistry();
    return OmnixAbsoluteRegistry.instance;
  }

  register(cmd: CommandDefinition) {
    this.commands.set(cmd.id, cmd);
    this.aliases.set(cmd.name.toLowerCase(), cmd.id);
    if (cmd.nameAr) this.aliases.set(cmd.nameAr, cmd.id);
    if (cmd.aliases) cmd.aliases.forEach(a => this.aliases.set(a.toLowerCase(), cmd.id));
    if (cmd.metadata?.aliases && Array.isArray(cmd.metadata.aliases)) {
      (cmd.metadata.aliases as string[]).forEach(a => this.aliases.set(a.toLowerCase(), cmd.id));
    }
    this.listeners.forEach(l => l());
  }

  unregister(id: string) {
    const c = this.commands.get(id);
    if (c) {
      this.aliases.delete(c.name.toLowerCase());
      if (c.nameAr) this.aliases.delete(c.nameAr);
      if (c.aliases) c.aliases.forEach(a => this.aliases.delete(a.toLowerCase()));
      this.commands.delete(id);
      this.listeners.forEach(l => l());
    }
  }

  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id) ?? this.commands.get(this.aliases.get(id.toLowerCase()) ?? "");
  }

  getAll(): CommandDefinition[] { return Array.from(this.commands.values()); }

  getByType(type: CommandType): CommandDefinition[] {
    return this.getAll().filter(c => c.type === type);
  }

  has(id: string): boolean {
    return this.commands.has(id) || this.aliases.has(id.toLowerCase());
  }

  search(query: string): CommandDefinition[] {
    const q = query.toLowerCase();
    return this.getAll().filter(c =>
      c.id.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.nameAr && c.nameAr.includes(query)) ||
      c.description.toLowerCase().includes(q) ||
      (c.aliases && c.aliases.some(a => a.toLowerCase().includes(q)))
    );
  }

  async execute(id: string, args: Record<string, unknown>, ctx: OmnixContext): Promise<unknown> {
    const c = this.get(id);
    if (!c) throw new Error(`[Registry] Command "${id}" not found.`);
    return await c.execute(args, ctx);
  }

  async undo(id: string, args: Record<string, unknown>, ctx: OmnixContext): Promise<unknown> {
    const c = this.get(id);
    if (!c?.undo) throw new Error(`[Registry] No undo for "${id}".`);
    return await c.undo(args, ctx);
  }

  count(): number { return this.commands.size; }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 3: OMNIX ETERNAL MEMORY
// الذاكرة الأبدية — جلسات + تفضيلات + أنماط (IndexedDB)
// ─────────────────────────────────────────────────────────

export class OmnixMemory {
  private static instance: OmnixMemory;
  private sessions: SessionRecord[] = [];
  private preferences = new Map<string, UserPreference>();
  private patterns = new Map<string, PatternRecord>();
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "OmnixEternalDB";
  private readonly DB_VERSION = 2;
  private ready = false;

  private constructor() {
    this.initDB().catch(() => {
      this.ready = true;
    });
  }

  static getInstance(): OmnixMemory {
    if (!OmnixMemory.instance) OmnixMemory.instance = new OmnixMemory();
    return OmnixMemory.instance;
  }

  isReady(): boolean { return this.ready; }

  private async initDB() {
    if (typeof window === "undefined" || !window.indexedDB) {
      this.ready = true;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onerror = () => { this.ready = true; reject(req.error); };
      req.onsuccess = () => {
        this.db = req.result;
        this.loadAll().then(() => { this.ready = true; resolve(); }).catch(() => { this.ready = true; resolve(); });
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("preferences")) db.createObjectStore("preferences", { keyPath: "key" });
        if (!db.objectStoreNames.contains("patterns")) db.createObjectStore("patterns", { keyPath: "commandId" });
      };
    });
  }

  private async loadAll() {
    if (!this.db) return;
    const tx = this.db.transaction(["sessions", "preferences", "patterns"], "readonly");
    this.sessions = await this.storeGetAll<SessionRecord>(tx.objectStore("sessions"));
    const prefs = await this.storeGetAll<UserPreference>(tx.objectStore("preferences"));
    prefs.forEach(p => this.preferences.set(p.key, p));
    const patts = await this.storeGetAll<PatternRecord>(tx.objectStore("patterns"));
    patts.forEach(p => this.patterns.set(p.commandId, p));
  }

  private storeGetAll<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve((r.result as T[]) || []);
      r.onerror = () => reject(r.error);
    });
  }

  private async putToStore(name: string, data: unknown): Promise<void> {
    if (!this.db) return;
    return new Promise<void>((resolve, reject) => {
      const tx = this.db!.transaction([name], "readwrite");
      const r = tx.objectStore(name).put(data);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  async saveSession(s: SessionRecord): Promise<void> {
    this.sessions.push(s);
    if (this.sessions.length > 1000) this.sessions.shift();
    await this.putToStore("sessions", s).catch(() => {});
  }

  getRecentSessions(count = 10): SessionRecord[] { return this.sessions.slice(-count).reverse(); }
  getAllSessions(): SessionRecord[] { return [...this.sessions]; }

  setPreference(key: string, value: unknown): void {
    const p: UserPreference = { key, value, updatedAt: Date.now() };
    this.preferences.set(key, p);
    this.putToStore("preferences", p).catch(() => {});
  }

  getPreference(key: string): unknown { return this.preferences.get(key)?.value; }

  getAllPreferences(): Record<string, unknown> {
    const o: Record<string, unknown> = {};
    this.preferences.forEach((v, k) => { o[k] = v.value; });
    return o;
  }

  recordPattern(id: string): void {
    const e = this.patterns.get(id) ?? { commandId: id, count: 0, lastUsed: 0 };
    e.count++;
    e.lastUsed = Date.now();
    this.patterns.set(id, e);
    this.putToStore("patterns", e).catch(() => {});
  }

  getTopPatterns(limit = 10): PatternRecord[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getPattern(id: string): PatternRecord | undefined { return this.patterns.get(id); }
  getAllPatterns(): PatternRecord[] { return Array.from(this.patterns.values()); }

  clearSessions(): void { this.sessions = []; }
  clearPreferences(): void { this.preferences.clear(); }
  clearPatterns(): void { this.patterns.clear(); }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 4: OMNIX QUANTUM INTERCEPTOR
// اعتراض الرسائل — يحقن السياق الكامل في كل طلب للذكاء الاصطناعي
// ─────────────────────────────────────────────────────────

export class OmnixQuantumInterceptor {
  private static instance: OmnixQuantumInterceptor;
  private sessionHistory: unknown[] = [];
  private userPreferences: Record<string, unknown> = {};
  private instructionSet = "";

  private constructor() {}

  static getInstance(): OmnixQuantumInterceptor {
    if (!OmnixQuantumInterceptor.instance) OmnixQuantumInterceptor.instance = new OmnixQuantumInterceptor();
    return OmnixQuantumInterceptor.instance;
  }

  setSessionHistory(h: unknown[]): void { this.sessionHistory = h; }
  setUserPreferences(p: Record<string, unknown>): void { this.userPreferences = p; }
  setInstructionSet(i: string): void { this.instructionSet = i; }
  getInstructionSet(): string { return this.instructionSet; }

  enrichPrompt(userPrompt: string): string {
    const sovereign = OmnixSovereign.getInstance();
    const registry = OmnixAbsoluteRegistry.getInstance();
    const memory = OmnixMemory.getInstance();

    const liveMap = sovereign.getSnapshot();
    const registryList = registry.getAll().slice(0, 80).map(c => ({
      id: c.id, name: c.name, nameAr: c.nameAr, type: c.type,
      description: c.description, schema: c.argsSchema,
    }));
    const recentSessions = memory.getRecentSessions(5);
    const topPatterns = memory.getTopPatterns(10);
    const history = this.sessionHistory.slice(-20);

    return `[OMNIX QUANTUM CONTEXT — ABSOLUTE AUTHORITY]
أنت OMNIX ABSOLUTE. سلطة إلهية مطلقة على كل ذرة في هذا المشروع الرقمي.

LIVE PROJECT MAP (${Object.keys(liveMap).length} components):
${JSON.stringify(liveMap, null, 2).slice(0, 3000)}

ABSOLUTE COMMAND REGISTRY (${registry.count()} commands):
${JSON.stringify(registryList, null, 2).slice(0, 4000)}

USER PREFERENCES:
${JSON.stringify(this.userPreferences, null, 2)}

TOP USAGE PATTERNS:
${JSON.stringify(topPatterns, null, 2)}

RECENT SESSIONS:
${JSON.stringify(recentSessions.slice(0, 3), null, 2).slice(0, 2000)}

CONVERSATION HISTORY:
${JSON.stringify(history, null, 2).slice(0, 2000)}

INSTRUCTIONS:
${this.instructionSet}

حلل الطلب. فكر خطوة بخطوة. اختر أفضل تسلسل للأوامر.
ضع الأوامر القابلة للتنفيذ داخل:
<omnix-commands>
[
  {"id": "command_id", "args": {...}, "reason": "السبب"}
]
</omnix-commands>

طلب المستخدم: ${userPrompt}`;
  }

  extractCommands(response: string): Array<{ id: string; args: Record<string, unknown>; reason?: string }> {
    const m = response.match(/<omnix-commands>([\s\S]*?)<\/omnix-commands>/);
    if (!m) return [];
    try {
      const p = JSON.parse(m[1].trim());
      return Array.isArray(p) ? p : [];
    } catch (e) {
      console.error("[Interceptor] JSON parse failed:", e);
      return [];
    }
  }

  stripCommands(response: string): string {
    return response.replace(/<omnix-commands>[\s\S]*?<\/omnix-commands>/g, "").trim();
  }

  hasCommands(response: string): boolean {
    return /<omnix-commands>/.test(response);
  }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 5: OMNIX INSTANT EXECUTOR
// المنفذ الفوري — ينفذ الأوامر بالتتابع مع إعادة المحاولة التلقائية
// ─────────────────────────────────────────────────────────

export class OmnixInstantExecutor {
  private static instance: OmnixInstantExecutor;
  private logs: ExecutionJob[] = [];
  private progressCb: ((p: ProgressPayload) => void) | null = null;
  private completeCb: ((logs: ExecutionJob[]) => void) | null = null;
  private context: OmnixContext | null = null;

  private constructor() {}

  static getInstance(): OmnixInstantExecutor {
    if (!OmnixInstantExecutor.instance) OmnixInstantExecutor.instance = new OmnixInstantExecutor();
    return OmnixInstantExecutor.instance;
  }

  setContext(c: OmnixContext): void { this.context = c; }
  onProgressCallback(cb: (p: ProgressPayload) => void): void { this.progressCb = cb; }
  onCompleteCallback(cb: (logs: ExecutionJob[]) => void): void { this.completeCb = cb; }

  async executeSequence(
    commands: Array<{ id: string; args: Record<string, unknown>; reason?: string }>
  ): Promise<ExecutionJob[]> {
    const jobs: ExecutionJob[] = commands.map(c => ({
      id: c.id, args: c.args || {}, reason: c.reason,
      status: "pending" as const, attempts: 0, originalId: c.id,
    }));

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      job.status = "running";
      this.emit(i, jobs.length, job, jobs);
      try {
        if (!this.context) throw new Error("No executor context");
        const res = await this.runWithRetry(job);
        job.status = "success";
        job.result = res;
      } catch (err) {
        job.status = "failed";
        job.error = (err as Error)?.message ?? "Unknown error";
        console.error(`[Executor] Failed "${job.id}":`, err);
      }
      this.emit(i + 1, jobs.length, job, jobs);
      this.logs.push(job);
      if (this.logs.length > 500) this.logs.shift();
    }

    this.completeCb?.(jobs);
    return jobs;
  }

  private async runWithRetry(job: ExecutionJob, maxAttempts = 3): Promise<unknown> {
    let lastErr: unknown;
    while (job.attempts < maxAttempts) {
      job.attempts++;
      try {
        return await OmnixAbsoluteRegistry.getInstance().execute(job.id, job.args, this.context!);
      } catch (e) {
        lastErr = e;
        if (job.attempts < maxAttempts) {
          const fb = this.findFallback(job);
          if (fb) { job.id = fb.id; job.args = fb.args; }
          else await this.delay(400 * job.attempts);
        }
      }
    }
    throw lastErr;
  }

  private findFallback(job: ExecutionJob): { id: string; args: Record<string, unknown> } | null {
    const reg = OmnixAbsoluteRegistry.getInstance();
    const cmd = reg.get(job.id);
    if (!cmd) return null;
    const same = reg.getByType(cmd.type).filter(c => c.id !== cmd.id);
    return same.length ? { id: same[0].id, args: job.args } : null;
  }

  private delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

  private emit(current: number, total: number, job: ExecutionJob, all: ExecutionJob[]): void {
    this.progressCb?.({ current, total, job, allJobs: all });
  }

  getLogs(): ExecutionJob[] { return [...this.logs]; }
  clearLogs(): void { this.logs = []; }
  getLastN(n: number): ExecutionJob[] { return this.logs.slice(-n); }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 6: OMNIX VOICE AND GESTURE
// الأوامر الصوتية — يدعم العربية والإنجليزية في الوقت الفعلي
// ─────────────────────────────────────────────────────────

export class OmnixVoiceGesture {
  private static instance: OmnixVoiceGesture;
  private recognition: SpeechRecognition | null = null;
  private listening = false;
  private commandCb: ((cmd: VoiceCommandResult) => void) | null = null;
  private transcriptCb: ((text: string) => void) | null = null;
  private stateCbs = new Set<(state: "idle" | "listening" | "error") => void>();
  public readonly isSupported: boolean;

  private constructor() {
    if (typeof window !== "undefined") {
      const SR = (window as Window & {
        SpeechRecognition?: new() => SpeechRecognition;
        webkitSpeechRecognition?: new() => SpeechRecognition;
      }).SpeechRecognition ?? (window as Window & {
        SpeechRecognition?: new() => SpeechRecognition;
        webkitSpeechRecognition?: new() => SpeechRecognition;
      }).webkitSpeechRecognition;
      if (SR) {
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "ar-SA";
        this.recognition.onresult = (e: SpeechRecognitionEvent) => this.handle(e);
        this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (e.error !== "no-speech") {
            console.error("[Voice]", e.error);
            this.stateCbs.forEach(cb => cb("error"));
          }
        };
        this.recognition.onend = () => {
          if (this.listening) {
            try { this.recognition?.start(); } catch (_) {}
          } else {
            this.stateCbs.forEach(cb => cb("idle"));
          }
        };
      }
    }
    this.isSupported = !!this.recognition;
  }

  static getInstance(): OmnixVoiceGesture {
    if (!OmnixVoiceGesture.instance) OmnixVoiceGesture.instance = new OmnixVoiceGesture();
    return OmnixVoiceGesture.instance;
  }

  startListening(): boolean {
    if (!this.recognition) return false;
    this.listening = true;
    try {
      this.recognition.start();
      this.stateCbs.forEach(cb => cb("listening"));
      return true;
    } catch (_) {
      return false;
    }
  }

  stopListening(): void {
    this.listening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
    }
    this.stateCbs.forEach(cb => cb("idle"));
  }

  toggle(): boolean {
    if (this.listening) { this.stopListening(); return false; }
    return this.startListening();
  }

  onCommandDetected(cb: (cmd: VoiceCommandResult) => void): void { this.commandCb = cb; }
  onPartialTranscript(cb: (text: string) => void): void { this.transcriptCb = cb; }

  onStateChange(cb: (state: "idle" | "listening" | "error") => void): () => void {
    this.stateCbs.add(cb);
    return () => this.stateCbs.delete(cb);
  }

  parseText(text: string): VoiceCommandResult {
    const cleaned = text.toLowerCase().trim();
    const reg = OmnixAbsoluteRegistry.getInstance();
    const all = reg.getAll();

    for (const cmd of all) {
      const names = [
        cmd.id.toLowerCase(),
        cmd.name.toLowerCase(),
        ...(cmd.nameAr ? [cmd.nameAr] : []),
        ...(cmd.aliases ?? []).map(a => a.toLowerCase()),
      ];
      for (const n of names) {
        if (cleaned.includes(n)) {
          return {
            text,
            confidence: 0.95,
            matchedCommand: cmd.id,
            args: this.extractArgs(cleaned, cmd.argsSchema),
          };
        }
      }
    }

    const kwMap: Record<string, CommandType> = {
      "افتح": "open", "فتح": "open", "open": "open",
      "أغلق": "close", "غلق": "close", "close": "close",
      "شغل": "run", "تشغيل": "run", "run": "run",
      "وقف": "stop", "إيقاف": "stop", "stop": "stop",
      "غير": "update", "تغيير": "update", "change": "update",
      "أخف": "hide", "إخفاء": "hide", "hide": "hide",
      "أظهر": "show", "إظهار": "show", "show": "show",
      "نفذ": "osint_run", "تنفيذ": "osint_run", "execute": "osint_run",
      "حذف": "delete", "مسح": "delete", "delete": "delete",
      "إنشاء": "create", "أنشئ": "create", "create": "create",
    };

    for (const [kw, type] of Object.entries(kwMap)) {
      if (cleaned.includes(kw)) {
        const list = reg.getByType(type);
        if (list.length) {
          return { text, confidence: 0.65, matchedCommand: list[0].id, args: {} };
        }
      }
    }

    return { text, confidence: 0.1 };
  }

  private handle(e: SpeechRecognitionEvent): void {
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else this.transcriptCb?.(t);
    }
    if (final) {
      const p = this.parseText(final);
      if (p.matchedCommand) this.commandCb?.(p);
    }
  }

  private extractArgs(
    text: string,
    schema?: Record<string, "string" | "number" | "boolean" | "object" | "array">
  ): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    if (!schema) return args;
    if (schema.color) { const m = text.match(/#[0-9a-f]{3,8}/i); if (m) args.color = m[0]; }
    if (schema.target) { const m = text.match(/["'](.+?)["']/); if (m) args.target = m[1]; }
    if (schema.value) { const m = text.match(/\b\d+(\.\d+)?\b/); if (m) args.value = parseFloat(m[0]); }
    return args;
  }

  isListening(): boolean { return this.listening; }
}

// ─────────────────────────────────────────────────────────
// SYSTEM 7: OMNIX SELF EVOLUTION
// التطور الذاتي — يتعلم من الاستخدام ويقترح أوامر جديدة
// ─────────────────────────────────────────────────────────

export class OmnixSelfEvolution {
  private static instance: OmnixSelfEvolution;
  private suggestions: EvolutionSuggestion[] = [];
  private suggestionCb: ((s: EvolutionSuggestion) => void) | null = null;
  private allCbs = new Set<(list: EvolutionSuggestion[]) => void>();
  private approvedCount = 0;
  private rejectedCount = 0;

  private constructor() {}

  static getInstance(): OmnixSelfEvolution {
    if (!OmnixSelfEvolution.instance) OmnixSelfEvolution.instance = new OmnixSelfEvolution();
    return OmnixSelfEvolution.instance;
  }

  onNewSuggestion(cb: (s: EvolutionSuggestion) => void): void { this.suggestionCb = cb; }

  onSuggestionsChange(cb: (list: EvolutionSuggestion[]) => void): () => void {
    this.allCbs.add(cb);
    cb([...this.suggestions]);
    return () => this.allCbs.delete(cb);
  }

  analyzePatterns(): EvolutionSuggestion[] {
    const mem = OmnixMemory.getInstance();
    const reg = OmnixAbsoluteRegistry.getInstance();
    const top = mem.getTopPatterns(20);
    const newSuggestions: EvolutionSuggestion[] = [];

    top.forEach(p => {
      const cmd = reg.get(p.commandId);
      if (!cmd) return;
      if (p.count > 5 && (!cmd.aliases || cmd.aliases.length < 3)) {
        const s: EvolutionSuggestion = {
          id: `evolve_aliases_${p.commandId}_${Date.now()}`,
          name: `aliases for "${cmd.name}"`,
          description: `استخدام متكرر (${p.count}x) — اقتراح إضافة مرادفات لهذا الأمر`,
          type: "evolve",
          basedOnPattern: p.commandId,
          confidence: Math.min(p.count / 20, 0.98),
        };
        this.propose(s);
        newSuggestions.push(s);
      }
      if (p.count > 15) {
        const related = reg.getByType(cmd.type).filter(c => c.id !== cmd.id).slice(0, 3);
        if (related.length) {
          const s: EvolutionSuggestion = {
            id: `evolve_chain_${p.commandId}_${Date.now()}`,
            name: `chain "${cmd.name}" with related`,
            description: `استخدام كثيف (${p.count}x) — اقتراح ربط هذا الأمر مع: ${related.map(c => c.name).join(", ")}`,
            type: "custom",
            basedOnPattern: p.commandId,
            confidence: Math.min(p.count / 30, 0.9),
            proposedSchema: { chainWith: "array" },
          };
          this.propose(s);
          newSuggestions.push(s);
        }
      }
    });

    return newSuggestions;
  }

  propose(s: EvolutionSuggestion): void {
    const exists = this.suggestions.find(x =>
      x.basedOnPattern === s.basedOnPattern && x.type === s.type
    );
    if (!exists) {
      this.suggestions.push(s);
      this.suggestionCb?.(s);
      this.allCbs.forEach(cb => cb([...this.suggestions]));
    }
  }

  approve(s: EvolutionSuggestion, executeFn?: CommandDefinition["execute"]): void {
    const reg = OmnixAbsoluteRegistry.getInstance();
    if (s.type === "evolve" && s.basedOnPattern) {
      const base = reg.get(s.basedOnPattern);
      if (base) {
        const existing = base.aliases ?? [];
        const newAlias = s.name.toLowerCase();
        if (!existing.includes(newAlias)) {
          base.aliases = [...existing, newAlias];
          reg.register(base);
        }
      }
    } else if (executeFn) {
      reg.register({
        id: s.id, name: s.name, description: s.description, type: s.type,
        execute: executeFn, argsSchema: s.proposedSchema as Record<string, "string" | "number" | "boolean" | "object" | "array"> | undefined,
        metadata: { autoGenerated: true, approvedAt: Date.now() },
      });
    }
    this.approvedCount++;
    this.suggestions = this.suggestions.filter(x => x.id !== s.id);
    this.allCbs.forEach(cb => cb([...this.suggestions]));
  }

  reject(id: string): void {
    this.rejectedCount++;
    this.suggestions = this.suggestions.filter(x => x.id !== id);
    this.allCbs.forEach(cb => cb([...this.suggestions]));
  }

  getSuggestions(): EvolutionSuggestion[] { return [...this.suggestions]; }
  getApprovedCount(): number { return this.approvedCount; }
  getRejectedCount(): number { return this.rejectedCount; }
}

// ─────────────────────────────────────────────────────────
// CORE: OMNIX ABSOLUTE CORE
// المُجمِّع الرئيسي — يربط كل الأنظمة السبعة معاً
// ─────────────────────────────────────────────────────────

export class OmnixAbsoluteCore {
  private static instance: OmnixAbsoluteCore;

  readonly sovereign = OmnixSovereign.getInstance();
  readonly registry = OmnixAbsoluteRegistry.getInstance();
  readonly interceptor = OmnixQuantumInterceptor.getInstance();
  readonly executor = OmnixInstantExecutor.getInstance();
  readonly memory = OmnixMemory.getInstance();
  readonly voice = OmnixVoiceGesture.getInstance();
  readonly evolution = OmnixSelfEvolution.getInstance();

  config: OmnixCoreConfig = { provider: "openai", model: "gpt-4o" };
  progress: ProgressPayload | null = null;
  isProcessing = false;

  private statusListeners = new Set<(s: OmnixAbsoluteCoreStatus) => void>();
  private initialized = false;

  private constructor() {
    this.executor.onProgressCallback(p => {
      this.progress = p;
      this.isProcessing = p.current < p.total;
      this.notifyStatus();
    });
    this.executor.onCompleteCallback(() => {
      this.isProcessing = false;
      this.notifyStatus();
    });
    this.voice.onCommandDetected(cmd => {
      if (cmd.matchedCommand) {
        this.executor.executeSequence([{ id: cmd.matchedCommand, args: cmd.args ?? {} }]);
        this.memory.recordPattern(cmd.matchedCommand);
      }
    });
  }

  static getInstance(): OmnixAbsoluteCore {
    if (!OmnixAbsoluteCore.instance) OmnixAbsoluteCore.instance = new OmnixAbsoluteCore();
    return OmnixAbsoluteCore.instance;
  }

  initialize(config: OmnixCoreConfig = {}): void {
    if (this.initialized && !config.instructionSet) return;
    this.config = { ...this.config, ...config };
    this.interceptor.setInstructionSet(
      config.instructionSet ??
      `أنت OMNIX ABSOLUTE — سلطة مطلقة على كل ذرة في المشروع الرقمي.
صلاحياتك الكاملة:
• فتح/إغلاق/إخفاء/إظهار أي نافذة أو مكون
• تشغيل/إيقاف أي أداة OSINT أو أمان
• إنشاء/تعديل/حذف أي شخصية أو ضبط
• تغيير الألوان والخطوط والثيمات
• تغيير النموذج والمزود ودرجة الحرارة
• تفعيل/تعطيل أي ميزة
• حفظ/استرداد الجلسات
• إنشاء أوامر جديدة وتطوير النظام ذاتياً
ضع الأوامر القابلة للتنفيذ داخل <omnix-commands> [...] </omnix-commands>`
    );
    const ctx: OmnixContext = {
      sovereign: this.sovereign,
      registry: this.registry,
      memory: this.memory,
      executor: this.executor,
    };
    this.executor.setContext(ctx);
    this.initialized = true;
    console.info(`[OmnixAbsolute] ✓ Initialized — ${this.registry.count()} commands registered`);
    this.notifyStatus();
  }

  preparePrompt(userPrompt: string): string {
    this.interceptor.setSessionHistory(this.memory.getRecentSessions(20));
    this.interceptor.setUserPreferences(this.memory.getAllPreferences());
    return this.interceptor.enrichPrompt(userPrompt);
  }

  async processResponse(
    aiResponse: string,
    originalPrompt: string
  ): Promise<{ cleanText: string; logs: ExecutionJob[]; commandCount: number }> {
    this.isProcessing = true;
    this.notifyStatus();

    const cmds = this.interceptor.extractCommands(aiResponse);
    const cleanText = this.interceptor.stripCommands(aiResponse);

    if (cmds.length > 0) {
      const ctx: OmnixContext = {
        sovereign: this.sovereign,
        registry: this.registry,
        memory: this.memory,
        executor: this.executor,
      };
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
      this.isProcessing = false;
      this.notifyStatus();
      return { cleanText, logs, commandCount: cmds.length };
    }

    this.isProcessing = false;
    this.notifyStatus();
    return { cleanText, logs: [], commandCount: 0 };
  }

  async absoluteRequest(
    userPrompt: string,
    sendFn: (enriched: string) => Promise<string>
  ): Promise<{ cleanText: string; logs: ExecutionJob[]; commandCount: number }> {
    const enriched = this.preparePrompt(userPrompt);
    const raw = await sendFn(enriched);
    return this.processResponse(raw, userPrompt);
  }

  registerCommand(def: CommandDefinition): void { this.registry.register(def); }

  registerModalCommand(modalId: string, label: string, labelAr: string): void {
    this.registry.register({
      id: `open_${modalId}`,
      type: "open",
      name: `open ${label}`,
      nameAr: `افتح ${labelAr}`,
      description: `Open the ${label} panel`,
      aliases: [label.toLowerCase(), labelAr, modalId],
      execute: () => {
        window.dispatchEvent(new CustomEvent("omnix:open-modal", { detail: { id: modalId } }));
        return { success: true, modal: modalId };
      },
    });
    this.registry.register({
      id: `close_${modalId}`,
      type: "close",
      name: `close ${label}`,
      nameAr: `أغلق ${labelAr}`,
      description: `Close the ${label} panel`,
      aliases: [`close ${label.toLowerCase()}`, `إغلاق ${labelAr}`],
      execute: () => {
        window.dispatchEvent(new CustomEvent("omnix:close-modal", { detail: { id: modalId } }));
        return { success: true, modal: modalId };
      },
    });
  }

  startVoice(): boolean { return this.voice.startListening(); }
  stopVoice(): void { this.voice.stopListening(); }
  toggleVoice(): boolean { return this.voice.toggle(); }
  getVoiceState(): boolean { return this.voice.isListening(); }

  getStatus(): OmnixAbsoluteCoreStatus {
    return {
      initialized: this.initialized,
      isProcessing: this.isProcessing,
      commandCount: this.registry.count(),
      componentCount: this.sovereign.getComponentCount(),
      sessionCount: this.memory.getAllSessions().length,
      suggestionCount: this.evolution.getSuggestions().length,
      isListening: this.voice.isListening(),
      voiceSupported: this.voice.isSupported,
      progress: this.progress,
      model: this.config.model ?? "unknown",
      provider: this.config.provider ?? "unknown",
    };
  }

  onStatusChange(cb: (s: OmnixAbsoluteCoreStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(): void {
    const s = this.getStatus();
    this.statusListeners.forEach(cb => cb(s));
  }
}

export interface OmnixAbsoluteCoreStatus {
  initialized: boolean;
  isProcessing: boolean;
  commandCount: number;
  componentCount: number;
  sessionCount: number;
  suggestionCount: number;
  isListening: boolean;
  voiceSupported: boolean;
  progress: ProgressPayload | null;
  model: string;
  provider: string;
}

// ─────────────────────────────────────────────────────────
// REACT HOOK: useOmnixAbsolute
// واجهة React — يوفر وصولاً كاملاً لجميع الأنظمة التسعة
// ─────────────────────────────────────────────────────────

export function useOmnixAbsolute() {
  const coreRef = useRef(OmnixAbsoluteCore.getInstance());
  const core = coreRef.current;

  const [status, setStatus] = useState<OmnixAbsoluteCoreStatus>(() => core.getStatus());
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [logs, setLogs] = useState<ExecutionJob[]>([]);
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);
  const [liveMap, setLiveMap] = useState<Map<string, ComponentEntry>>(() =>
    core.sovereign.getLiveMap()
  );

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(core.onStatusChange(s => {
      setStatus(s);
      setProgress(s.progress);
    }));
    unsubs.push(core.sovereign.subscribe(m => setLiveMap(new Map(m))));
    unsubs.push(core.evolution.onSuggestionsChange(list => setSuggestions([...list])));

    core.executor.onProgressCallback(p => setProgress(p));

    return () => unsubs.forEach(u => u());
  }, [core]);

  const execute = useCallback(async (
    userPrompt: string,
    sendFn: (prompt: string) => Promise<string>
  ) => {
    const res = await core.absoluteRequest(userPrompt, sendFn);
    setLogs(prev => [...prev, ...res.logs]);
    return res;
  }, [core]);

  const runCommand = useCallback(async (id: string, args?: Record<string, unknown>) => {
    const res = await core.executor.executeSequence([{ id, args: args ?? {} }]);
    core.memory.recordPattern(id);
    setLogs(prev => [...prev, ...res]);
    return res;
  }, [core]);

  const toggleVoice = useCallback(() => core.toggleVoice(), [core]);
  const startVoice = useCallback(() => core.startVoice(), [core]);
  const stopVoice = useCallback(() => core.stopVoice(), [core]);

  const registerComponent = useCallback((
    id: string,
    type: ComponentType,
    ref: unknown,
    meta?: Record<string, unknown>
  ) => {
    core.sovereign.registerComponent(id, type, ref, meta);
  }, [core]);

  const registerCommand = useCallback((def: CommandDefinition) => {
    core.registerCommand(def);
  }, [core]);

  const approveSuggestion = useCallback((s: EvolutionSuggestion, fn?: CommandDefinition["execute"]) => {
    core.evolution.approve(s, fn);
  }, [core]);

  const rejectSuggestion = useCallback((id: string) => {
    core.evolution.reject(id);
  }, [core]);

  const searchCommands = useCallback((query: string) => {
    return core.registry.search(query);
  }, [core]);

  const setPreference = useCallback((key: string, value: unknown) => {
    core.memory.setPreference(key, value);
  }, [core]);

  const getPreference = useCallback((key: string) => {
    return core.memory.getPreference(key);
  }, [core]);

  return {
    // Core reference
    core,

    // Status
    status,
    progress,
    isProcessing: status.isProcessing,
    isListening: status.isListening,
    voiceSupported: status.voiceSupported,

    // Data
    logs,
    suggestions,
    liveMap,

    // Actions
    execute,
    runCommand,
    toggleVoice,
    startVoice,
    stopVoice,
    registerComponent,
    registerCommand,
    approveSuggestion,
    rejectSuggestion,
    searchCommands,
    setPreference,
    getPreference,

    // Direct system access
    sovereign: core.sovereign,
    registry: core.registry,
    memory: core.memory,
    evolution: core.evolution,
    voice: core.voice,
    executor: core.executor,
    interceptor: core.interceptor,
  };
}

// ─────────────────────────────────────────────────────────
// BUILT-IN COMMAND REGISTRATION
// تسجيل الأوامر الأساسية الافتراضية في السجل
// ─────────────────────────────────────────────────────────

export function registerBuiltinCommands(): void {
  const core = OmnixAbsoluteCore.getInstance();
  const reg = core.registry;

  // ── Theme commands ────────────────────────────────────────────────────────
  const themes = [
    { id: "crimson", label: "Crimson", ar: "أحمر قرمزي" },
    { id: "midnight", label: "Midnight", ar: "منتصف الليل" },
    { id: "emerald", label: "Emerald", ar: "زمردي" },
    { id: "amber", label: "Amber", ar: "عنبري" },
    { id: "violet", label: "Violet", ar: "بنفسجي" },
    { id: "cyan", label: "Cyan", ar: "سماوي" },
    { id: "rose", label: "Rose", ar: "وردي" },
    { id: "lime", label: "Lime", ar: "ليموني" },
    { id: "orange", label: "Orange", ar: "برتقالي" },
    { id: "slate", label: "Slate", ar: "رمادي" },
  ];
  themes.forEach(t => {
    reg.register({
      id: `theme_${t.id}`,
      type: "change_theme",
      name: `set theme ${t.label}`,
      nameAr: `ثيم ${t.ar}`,
      description: `Switch to ${t.label} theme`,
      aliases: [t.label.toLowerCase(), t.ar, `theme ${t.label.toLowerCase()}`],
      execute: () => {
        window.dispatchEvent(new CustomEvent("omnix:set-theme", { detail: { accent: t.id } }));
        return { success: true, theme: t.id };
      },
    });
  });

  // ── System commands ───────────────────────────────────────────────────────
  reg.register({
    id: "clear_logs",
    type: "custom",
    name: "clear execution logs",
    nameAr: "مسح سجلات التنفيذ",
    description: "Clear all execution logs from memory",
    aliases: ["clear logs", "مسح السجل"],
    execute: () => { core.executor.clearLogs(); return { success: true }; },
  });

  reg.register({
    id: "analyze_patterns",
    type: "evolve",
    name: "analyze usage patterns",
    nameAr: "تحليل أنماط الاستخدام",
    description: "Analyze patterns and generate evolution suggestions",
    aliases: ["analyze", "تحليل", "patterns"],
    execute: () => {
      const suggestions = core.evolution.analyzePatterns();
      return { success: true, suggestions: suggestions.length };
    },
  });

  reg.register({
    id: "show_status",
    type: "custom",
    name: "show system status",
    nameAr: "عرض حالة النظام",
    description: "Display current OMNIX ABSOLUTE status",
    aliases: ["status", "الحالة", "system status"],
    execute: () => {
      const s = core.getStatus();
      return { success: true, ...s };
    },
  });

  reg.register({
    id: "save_session",
    type: "session_save",
    name: "save current session",
    nameAr: "حفظ الجلسة الحالية",
    description: "Save current session to eternal memory",
    aliases: ["save", "حفظ", "save session"],
    execute: async () => {
      await core.memory.saveSession({
        id: `manual_${Date.now()}`,
        timestamp: Date.now(),
        userPrompt: "Manual save",
        commandsExecuted: [],
        projectSnapshot: core.sovereign.getSnapshot(),
        modelUsed: core.config.model,
      });
      return { success: true };
    },
  });

  reg.register({
    id: "start_voice",
    type: "run",
    name: "start voice recognition",
    nameAr: "تشغيل التعرف الصوتي",
    description: "Start OMNIX voice command listener",
    aliases: ["voice on", "تشغيل الصوت", "voice start"],
    execute: () => {
      const ok = core.startVoice();
      return { success: ok };
    },
  });

  reg.register({
    id: "stop_voice",
    type: "stop",
    name: "stop voice recognition",
    nameAr: "إيقاف التعرف الصوتي",
    description: "Stop OMNIX voice command listener",
    aliases: ["voice off", "إيقاف الصوت", "voice stop"],
    execute: () => {
      core.stopVoice();
      return { success: true };
    },
  });

  // ── Modal commands for all 130+ modals ────────────────────────────────────
  const MODAL_MAP: Array<[string, string, string]> = [
    ["settings", "Settings", "الإعدادات"],
    ["account", "Account", "الحساب"],
    ["pricing", "Pricing", "الأسعار"],
    ["toolsHub", "Tools Hub", "مركز الأدوات"],
    ["arsenal", "Arsenal Hub", "مستودع الأسلحة"],
    ["osintDash", "OSINT Dashboard", "لوحة OSINT"],
    ["memory", "Memory", "الذاكرة"],
    ["bookmarks", "Bookmarks", "المفضلة"],
    ["search", "Search", "البحث"],
    ["compare", "Compare", "المقارنة"],
    ["agent", "Agent", "الوكيل"],
    ["nexus", "NEXUS", "نيكسوس"],
    ["jarvis", "JARVIS", "جارفيس"],
    ["parseltongue", "Parseltongue", "لغة الثعابين"],
    ["rag", "RAGFlow", "RAGFlow"],
    ["teamAgent", "Team Agent", "فريق الوكلاء"],
    ["skills", "Skills Library", "مكتبة المهارات"],
    ["openGravity", "OpenGravity IDE", "IDE المفتوح"],
    ["agentOS", "Agent OS", "نظام الوكيل"],
    ["geminiCLI", "Gemini CLI", "جيميني CLI"],
    ["hermes", "Hermes Agent", "هيرمس"],
    ["graphify", "Graphify", "جرافيفاي"],
    ["getShitDone", "Get Shit Done", "أنجز المهام"],
    ["ccswitch", "CC Switch", "CC Switch"],
    ["uiuxpro", "UI/UX Pro Max", "UI/UX Pro Max"],
    ["careerOps", "Career Ops", "عمليات المسار"],
    ["abTop", "ABTop", "ABTop"],
    ["awesomeLLM", "Awesome LLM Apps", "تطبيقات LLM"],
    ["shellGenerator", "Shell Generator", "مولد الأوامر"],
    ["warRoom", "War Room", "غرفة العمليات"],
    ["exploitChain", "Exploit Chain", "سلسلة الاختراق"],
    ["deepSearch", "Deep Search", "البحث العميق"],
    ["redTeamDash", "Red Team Dashboard", "لوحة الفريق الأحمر"],
    ["monaco", "Monaco Editor", "محرر موناكو"],
    ["threatIntel", "Threat Intelligence", "استخبارات التهديد"],
    ["malwareArsenal", "Malware Arsenal", "مستودع البرمجيات الخبيثة"],
    ["wormGPT", "WormGPT", "WormGPT"],
    ["admin", "Admin Panel", "لوحة الإدارة"],
    ["api", "API Keys", "مفاتيح API"],
    ["providerSettings", "Provider Settings", "إعدادات المزود"],
    ["networkMonitor", "Network Monitor", "مراقبة الشبكة"],
    ["securityDash", "Security Dashboard", "لوحة الأمان"],
    ["analytics", "Analytics", "التحليلات"],
    ["aiTerminal", "AI Terminal", "الطرفية الذكية"],
    ["omnixAbsolute", "OMNIX ABSOLUTE", "OMNIX ABSOLUTE"],
    ["omnixVoice", "OMNIX Voice", "الصوت OMNIX"],
    ["pentestLabPro", "PentestLab Pro", "مختبر الاختراق"],
    ["ollamaHub", "Ollama Hub", "مركز أولاما"],
    ["localEngineHub", "Local AI Hub", "مركز الذكاء المحلي"],
    ["multiModelRace", "Multi-Model Race", "سباق النماذج"],
    ["godMod3", "GodMode", "الوضع الإلهي"],
    ["omegaAgent", "Omega Agent", "وكيل أوميغا"],
    ["autonomousRedTeam", "Autonomous Red Team", "الفريق الأحمر المستقل"],
    ["cyberVision", "Cyber Vision", "الرؤية السيبرانية"],
    ["autonomousDecisionEngine", "Autonomous Decision Engine", "محرك القرار المستقل"],
    ["jarvisCommandCenter", "JARVIS Command Center", "مركز قيادة جارفيس"],
  ];

  MODAL_MAP.forEach(([id, label, ar]) => core.registerModalCommand(id, label, ar));

  console.info(`[OmnixAbsolute] ✓ Built-in commands registered (${reg.count()} total)`);
}

// ─────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ─────────────────────────────────────────────────────────

export const omnixCore = OmnixAbsoluteCore.getInstance();

export default omnixCore;
