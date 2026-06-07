export type PipelineItem = {
  id: string;
  source: string;
  sourceColor: string;
  label: string;
  content: string;
  timestamp: string;
};

export type PipelineHistoryEntry = PipelineItem & {
  destination: string | null;
  destinationColor: string | null;
  routedAt: string | null;
};

export type ChainRule = {
  id: string;
  name: string;
  sourceModule: string;
  destinationModule: string;
  destinationColor: string;
  enabled: boolean;
  triggerKeyword: string;
  createdAt: number;
  execCount: number;
};

type Listener = () => void;

const CHAIN_RULES_KEY = "mr7-chain-rules";

let _items: PipelineItem[] = [];
let _history: PipelineHistoryEntry[] = [];
let _rules: ChainRule[] = loadRules();
const _listeners = new Set<Listener>();
const _histListeners = new Set<Listener>();
const _rulesListeners = new Set<Listener>();
let _chainCallbacks: ((sourceModule: string, item: PipelineItem) => void)[] = [];

function notify() { _listeners.forEach((fn) => fn()); }
function notifyHistory() { _histListeners.forEach((fn) => fn()); }
function notifyRules() { _rulesListeners.forEach((fn) => fn()); }

function loadRules(): ChainRule[] {
  try {
    const raw = localStorage.getItem(CHAIN_RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRules() {
  localStorage.setItem(CHAIN_RULES_KEY, JSON.stringify(_rules));
}

export const pipeline = {
  getItems(): PipelineItem[] {
    return [..._items];
  },

  push(item: Omit<PipelineItem, "id" | "timestamp">) {
    const entry: PipelineItem = {
      ...item,
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    _items = [entry, ..._items.slice(0, 9)];
    _history = [
      { ...entry, destination: null, destinationColor: null, routedAt: null },
      ..._history.slice(0, 49),
    ];
    notify();
    notifyHistory();

    // Auto-chain: check rules
    setTimeout(() => {
      for (const rule of _rules) {
        if (!rule.enabled) continue;
        const srcMatch = rule.sourceModule === "*" || item.source.toLowerCase().includes(rule.sourceModule.toLowerCase());
        if (!srcMatch) continue;
        const kwMatch = !rule.triggerKeyword || item.content.toLowerCase().includes(rule.triggerKeyword.toLowerCase());
        if (!kwMatch) continue;
        // Fire chain callbacks
        _chainCallbacks.forEach((cb) => cb(rule.destinationModule, entry));
        pipeline.recordRoute(entry.id, rule.destinationModule, rule.destinationColor);
        // Update exec count
        _rules = _rules.map((r) => r.id === rule.id ? { ...r, execCount: r.execCount + 1 } : r);
        saveRules();
        notifyRules();
      }
    }, 200);

    return entry;
  },

  recordRoute(id: string, destination: string, destinationColor: string) {
    _history = _history.map((h) =>
      h.id === id
        ? { ...h, destination, destinationColor, routedAt: new Date().toLocaleTimeString("en-US", { hour12: false }) }
        : h
    );
    notifyHistory();
  },

  remove(id: string) {
    _items = _items.filter((i) => i.id !== id);
    notify();
  },

  clear() {
    _items = [];
    notify();
  },

  clearHistory() {
    _history = [];
    notifyHistory();
  },

  latest(): PipelineItem | null {
    return _items[0] ?? null;
  },

  getHistory(): PipelineHistoryEntry[] {
    return [..._history];
  },

  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },

  subscribeHistory(fn: Listener): () => void {
    _histListeners.add(fn);
    return () => { _histListeners.delete(fn); };
  },

  // Chain Builder
  getRules(): ChainRule[] {
    return [..._rules];
  },

  addRule(rule: Omit<ChainRule, "id" | "createdAt" | "execCount">): ChainRule {
    const newRule: ChainRule = {
      ...rule,
      id: Math.random().toString(36).slice(2, 9),
      createdAt: Date.now(),
      execCount: 0,
    };
    _rules = [newRule, ..._rules];
    saveRules();
    notifyRules();
    return newRule;
  },

  updateRule(id: string, patch: Partial<ChainRule>) {
    _rules = _rules.map((r) => r.id === id ? { ...r, ...patch } : r);
    saveRules();
    notifyRules();
  },

  deleteRule(id: string) {
    _rules = _rules.filter((r) => r.id !== id);
    saveRules();
    notifyRules();
  },

  subscribeRules(fn: Listener): () => void {
    _rulesListeners.add(fn);
    return () => { _rulesListeners.delete(fn); };
  },

  onChainFire(cb: (destinationModule: string, item: PipelineItem) => void) {
    _chainCallbacks.push(cb);
    return () => { _chainCallbacks = _chainCallbacks.filter((c) => c !== cb); };
  },
};
