import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, RotateCcw, Copy, CheckCheck, ChevronDown, Loader2,
  Columns3, Zap, Brain, Cpu, Globe, FlaskConical, Bot, Server,
  Check, Sparkles, Trophy, ArrowRight, Download, Maximize2,
} from "lucide-react";
import { streamChat, type ChatRequest } from "@/lib/chat-client";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface ModelCompareModalProps {
  open: boolean;
  onClose: () => void;
}

const COMPARE_MODELS = [
  { id: "CHAT-GPT Fast",       label: "CHAT-GPT Fast",       icon: Zap,         color: "#10b981", group: "OpenAI" },
  { id: "CHAT-GPT Pro",        label: "CHAT-GPT Pro",        icon: Brain,       color: "#6366f1", group: "OpenAI" },
  { id: "CHAT-GPT Vision",     label: "CHAT-GPT Vision",     icon: Cpu,         color: "#3b82f6", group: "OpenAI" },
  { id: "CHAT-GPT Reasoning",  label: "CHAT-GPT Reasoning",  icon: FlaskConical,color: "#a78bfa", group: "OpenAI" },
  { id: "CHAT-GPT Code",       label: "CHAT-GPT Code",       icon: Cpu,         color: "#f59e0b", group: "OpenAI" },
  { id: "CHAT-GPT Ultra",      label: "CHAT-GPT Ultra",      icon: Trophy,      color: "#e21227", group: "OpenAI" },
  { id: "CHAT-GPT Research",   label: "CHAT-GPT Research",   icon: Globe,       color: "#06b6d4", group: "OpenAI" },
  { id: "CHAT-GPT Agent",      label: "CHAT-GPT Agent",      icon: Bot,         color: "#8b5cf6", group: "OpenAI" },
  { id: "Claude Opus",         label: "Claude Opus",         icon: FlaskConical,color: "#f97316", group: "Anthropic" },
  { id: "Claude Sonnet",       label: "Claude Sonnet",       icon: FlaskConical,color: "#fb923c", group: "Anthropic" },
  { id: "Claude Haiku",        label: "Claude Haiku",        icon: FlaskConical,color: "#fdba74", group: "Anthropic" },
  { id: "Gemini Pro",          label: "Gemini Pro",          icon: Globe,       color: "#4285f4", group: "Google" },
  { id: "Gemini Ultra",        label: "Gemini Ultra",        icon: Globe,       color: "#34a853", group: "Google" },
  { id: "Gemini Flash",        label: "Gemini Flash",        icon: Zap,         color: "#fbbc04", group: "Google" },
  { id: "Llama 4 Scout",       label: "Llama 4 Scout",       icon: Server,      color: "#00ff41", group: "Meta/Local" },
  { id: "Llama 4 Maverick",    label: "Llama 4 Maverick",   icon: Server,      color: "#00e5ff", group: "Meta/Local" },
  { id: "Mistral Large",       label: "Mistral Large",       icon: Brain,       color: "#ff6b35", group: "Mistral" },
  { id: "DeepSeek R2",         label: "DeepSeek R2",         icon: Brain,       color: "#60a5fa", group: "DeepSeek" },
  { id: "Grok 3",              label: "Grok 3",              icon: Zap,         color: "#1d9bf0", group: "xAI" },
  { id: "Qwen2.5 Max",         label: "Qwen2.5 Max",         icon: Globe,       color: "#f43f5e", group: "Alibaba" },
];

const SLOT_COLORS = [
  { border: "border-cyan-500/50",   bg: "bg-cyan-500/5",    text: "text-cyan-400",   dot: "#00e5ff" },
  { border: "border-violet-500/50", bg: "bg-violet-500/5",  text: "text-violet-400", dot: "#a78bfa" },
  { border: "border-emerald-500/50",bg: "bg-emerald-500/5", text: "text-emerald-400",dot: "#10b981" },
];

type SlotState = {
  modelId: string;
  streaming: boolean;
  content: string;
  done: boolean;
  error: string | null;
  timeMs: number | null;
  tokens: number;
};

function makeSlot(modelId: string): SlotState {
  return { modelId, streaming: false, content: "", done: false, error: null, timeMs: null, tokens: 0 };
}

function ModelPicker({
  value, onChange, exclude, colorClass,
}: { value: string; onChange: (v: string) => void; exclude: string[]; colorClass: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = COMPARE_MODELS.find((m) => m.id === value);

  const filtered = COMPARE_MODELS.filter(
    (m) => !exclude.includes(m.id) || m.id === value,
  ).filter((m) => m.label.toLowerCase().includes(q.toLowerCase()) || m.group.toLowerCase().includes(q.toLowerCase()));

  const groups = Array.from(new Set(filtered.map((m) => m.group)));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border ${SLOT_COLORS[0].border} bg-[#0d0d0d] hover:bg-[#161616] transition-colors text-left`}
      >
        {selected && (
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${selected.color}22` }}>
            <selected.icon className="w-3 h-3" style={{ color: selected.color }} />
          </span>
        )}
        <span className={`flex-1 text-[13px] font-semibold truncate ${colorClass}`}>{selected?.label ?? "اختر نموذجاً"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-1.5 border-b border-[#1f1f1f]">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث عن نموذج..."
                className="w-full bg-[#080808] border border-[#1f1f1f] rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-primary/50 text-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-2">
              {groups.map((grp) => (
                <div key={grp}>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 py-1">{grp}</div>
                  {filtered.filter((m) => m.group === grp).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onChange(m.id); setOpen(false); setQ(""); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                        m.id === value ? "bg-primary/10 text-primary" : "hover:bg-[#161616] text-foreground"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}22` }}>
                        <m.icon className="w-3 h-3" style={{ color: m.color }} />
                      </span>
                      <span className="text-[12px] font-medium truncate">{m.label}</span>
                      {m.id === value && <Check className="w-3 h-3 ml-auto flex-shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResponseCard({
  slot, idx, isWinner,
}: { slot: SlotState; idx: number; isWinner: boolean }) {
  const [copied, setCopied] = useState(false);
  const { border, bg, text } = SLOT_COLORS[idx % 3];
  const model = COMPARE_MODELS.find((m) => m.id === slot.modelId);

  async function copy() {
    await navigator.clipboard.writeText(slot.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`relative flex flex-col rounded-2xl border ${border} ${bg} overflow-hidden h-full`}>
      {isWinner && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-0.5 text-[9px] font-bold text-amber-400">
          <Trophy className="w-3 h-3" /> الأسرع
        </div>
      )}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-[#1f1f1f]`}>
        <div className="flex items-center gap-2">
          {model && (
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${model.color}22`, border: `1px solid ${model.color}55` }}>
              <model.icon className="w-4 h-4" style={{ color: model.color }} />
            </span>
          )}
          <div>
            <div className={`text-[13px] font-bold ${text}`}>{slot.modelId}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {slot.streaming ? (
                <span className="text-primary animate-pulse">يكتب...</span>
              ) : slot.done ? (
                <span>{slot.timeMs ? `${slot.timeMs}ms` : ""} · {slot.tokens} رمز</span>
              ) : (
                <span className="text-muted-foreground/40">انتظار...</span>
              )}
            </div>
          </div>
        </div>
        {slot.done && slot.content && (
          <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-[13px] leading-relaxed text-foreground/90 min-h-0">
        {slot.error ? (
          <div className="text-red-400 text-[12px]">[خطأ: {slot.error}]</div>
        ) : slot.content ? (
          <pre className="whitespace-pre-wrap font-sans">{slot.content}</pre>
        ) : !slot.streaming ? (
          <div className="text-muted-foreground/30 text-[12px] text-center mt-8">أرسل رسالة للبدء</div>
        ) : null}
        {slot.streaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
        )}
      </div>
      {slot.done && slot.content && (
        <div className="px-3 py-2 border-t border-[#1f1f1f] flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground font-mono">{Math.ceil(slot.content.length / 4)} رمز مقدّر</div>
          <div className={`text-[10px] font-bold ${text}`}>{model?.group}</div>
        </div>
      )}
    </div>
  );
}

export function ModelCompareModal({ open, onClose }: ModelCompareModalProps) {
  const { state } = useStore();
  const { toast } = useToast();
  const lang = state.settings.language;
  const abortRefs = useRef<(AbortController | null)[]>([null, null, null]);

  const [slots, setSlots] = useState<[SlotState, SlotState, SlotState]>([
    makeSlot("CHAT-GPT Fast"),
    makeSlot("CHAT-GPT Pro"),
    makeSlot("CHAT-GPT Reasoning"),
  ]);
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Array<{ q: string; responses: string[] }>>([]);

  function setSlot(idx: number, patch: Partial<SlotState>) {
    setSlots((prev) => {
      const copy = [...prev] as [SlotState, SlotState, SlotState];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }

  function setModel(idx: number, modelId: string) {
    if (running) return;
    setSlot(idx, { modelId, content: "", done: false, error: null, streaming: false, timeMs: null, tokens: 0 });
  }

  const stopAll = useCallback(() => {
    abortRefs.current.forEach((ac) => ac?.abort());
    abortRefs.current = [null, null, null];
    setRunning(false);
    setSlots((prev) => {
      const copy = [...prev] as [SlotState, SlotState, SlotState];
      copy.forEach((s, i) => { if (s.streaming) copy[i] = { ...s, streaming: false, done: true }; });
      return copy;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    if (!message.trim() || running) return;
    const q = message.trim();
    setMessage("");
    setRunning(true);

    setSlots((prev) => prev.map((s) => ({ ...s, content: "", done: false, error: null, streaming: true, timeMs: null, tokens: 0 })) as [SlotState, SlotState, SlotState]);

    const results = ["", "", ""];

    await Promise.all(slots.map(async (slot, idx) => {
      const ac = new AbortController();
      abortRefs.current[idx] = ac;
      const t0 = Date.now();
      try {
        const req: ChatRequest = {
          model: slot.modelId,
          persona: state.activePersona,
          customInstructions: state.customInstructions ?? "",
          language: lang,
          memory: state.memory,
          messages: [{ role: "user", content: q }],
          mode: "chat",
        };
        await streamChat(req, (chunk) => {
          results[idx] += chunk;
          setSlot(idx, { content: results[idx], streaming: true });
        }, ac.signal);
        const elapsed = Date.now() - t0;
        setSlot(idx, { streaming: false, done: true, timeMs: elapsed, tokens: Math.ceil(results[idx].length / 4) });
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setSlot(idx, { streaming: false, done: true, error: e instanceof Error ? e.message : "خطأ غير متوقع" });
      }
    }));

    setHistory((h) => [...h, { q, responses: results }]);
    setRunning(false);
  }, [message, running, slots, state, lang]);

  function reset() {
    stopAll();
    setSlots((prev) => prev.map((s) => makeSlot(s.modelId)) as [SlotState, SlotState, SlotState]);
    setMessage("");
  }

  const winnerIdx = (() => {
    if (!slots.every((s) => s.done)) return -1;
    let best = -1, bestTime = Infinity;
    slots.forEach((s, i) => { if (s.timeMs !== null && s.timeMs < bestTime && !s.error) { bestTime = s.timeMs; best = i; } });
    return best;
  })();

  function exportComparison() {
    if (!history.length) return;
    const last = history[history.length - 1];
    const md = `# Model Comparison\n\n**سؤال:** ${last.q}\n\n${slots.map((s, i) => `## ${s.modelId}\n\n${last.responses[i]}`).join("\n\n---\n\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "model-comparison.md"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير المقارنة" });
  }

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#080808]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0d0d0d] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Columns3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground">مقارنة النماذج</h2>
            <p className="text-[11px] text-muted-foreground">أرسل رسالة واحدة لـ 3 نماذج في آنٍ واحد</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            {slots.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#161616] border border-[#262626] text-[10px] font-semibold" style={{ color: SLOT_COLORS[i].dot }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLOT_COLORS[i].dot }} />
                {s.modelId.split(" ").slice(-1)[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {history.length > 0 && (
            <button onClick={exportComparison} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] border border-[#262626] text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-3.5 h-3.5" /> تصدير
            </button>
          )}
          <button onClick={reset} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="إعادة تعيين">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model Selectors */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
        {slots.map((slot, idx) => (
          <div key={idx} className="space-y-1">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${SLOT_COLORS[idx].text} flex items-center gap-1.5`}>
              <span className="w-2 h-2 rounded-full" style={{ background: SLOT_COLORS[idx].dot }} />
              النموذج {idx + 1}
            </div>
            <div className="relative">
              <ModelPickerSimple
                value={slot.modelId}
                onChange={(v) => setModel(idx, v)}
                disabled={running}
                colorClass={SLOT_COLORS[idx].text}
                color={SLOT_COLORS[idx].dot}
                exclude={slots.filter((_, i) => i !== idx).map((s) => s.modelId)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Response Grid */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-4 min-h-0 overflow-hidden">
        {slots.map((slot, idx) => (
          <ResponseCard key={idx} slot={slot} idx={idx} isWinner={winnerIdx === idx} />
        ))}
      </div>

      {/* Winner Banner */}
      <AnimatePresence>
        {winnerIdx >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-4 mb-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-[12px]"
          >
            <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300">
              <span className="font-bold">{slots[winnerIdx]?.modelId}</span> كان الأسرع استجابةً
              {slots[winnerIdx]?.timeMs && <span className="text-amber-400/70 ml-1">({slots[winnerIdx].timeMs}ms)</span>}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500/50 ml-auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="flex gap-2 bg-[#0d0d0d] border border-[#262626] rounded-2xl overflow-hidden focus-within:border-primary/40 transition-colors">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={lang === "ar" ? "اكتب رسالتك لمقارنة 3 نماذج..." : "Type your message to compare 3 models..."}
            rows={2}
            className="flex-1 bg-transparent px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none resize-none font-sans"
            disabled={running}
          />
          <div className="flex items-end gap-1 px-2 py-2">
            {running ? (
              <button
                onClick={stopAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[12px] font-bold transition-colors"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> إيقاف
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 text-[12px] font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إرسال للكل</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Enter لإرسال · Shift+Enter لسطر جديد
          </div>
          {history.length > 0 && (
            <div className="text-[10px] text-muted-foreground/50">{history.length} مقارنة سابقة</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ModelPickerSimple({
  value, onChange, disabled, colorClass, color, exclude,
}: { value: string; onChange: (v: string) => void; disabled: boolean; colorClass: string; color: string; exclude: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const model = COMPARE_MODELS.find((m) => m.id === value);

  const filtered = COMPARE_MODELS.filter((m) => !exclude.includes(m.id) || m.id === value)
    .filter((m) => m.label.toLowerCase().includes(q.toLowerCase()));

  if (disabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#262626] bg-[#0d0d0d] opacity-60">
        {model && <model.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: model.color }} />}
        <span className={`text-[12px] font-semibold truncate ${colorClass}`}>{model?.label}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[#262626] bg-[#0d0d0d] hover:border-[#333] hover:bg-[#111] transition-colors"
      >
        {model && <model.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: model.color }} />}
        <span className={`flex-1 text-[12px] font-semibold truncate text-left ${colorClass}`}>{model?.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQ(""); }} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d0d] border border-[#262626] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-1.5 border-b border-[#1f1f1f]">
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="بحث..."
                  className="w-full bg-[#080808] rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-foreground"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onChange(m.id); setOpen(false); setQ(""); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      m.id === value ? "bg-primary/10" : "hover:bg-[#161616]"
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: m.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-foreground truncate">{m.label}</div>
                      <div className="text-[9px] text-muted-foreground/60">{m.group}</div>
                    </div>
                    {m.id === value && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
