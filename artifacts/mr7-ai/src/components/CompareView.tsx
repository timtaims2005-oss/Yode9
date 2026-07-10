import { useEffect, useRef, useState } from "react";
import { X, Send, Copy, Loader2, ArrowLeftRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { AI_MODELS } from "@/lib/ai-config";
import { renderMessageContent, CodeBlock } from "./CodeBlock";
import { streamChat } from "@/lib/chat-client";

export function CompareView({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const abortA = useRef<AbortController | null>(null);
  const abortB = useRef<AbortController | null>(null);

  useEffect(() => () => { abortA.current?.abort(); abortB.current?.abort(); }, []);

  async function run() {
    const text = prompt.trim();
    if (!text) return;
    setA(""); setB("");
    setLoadingA(true); setLoadingB(true);
    abortA.current?.abort();
    abortB.current?.abort();
    abortA.current = new AbortController();
    abortB.current = new AbortController();

    const ctx = {
      persona: state.activePersona,
      customInstructions: state.customInstructions,
      language: state.settings.language,
      memory: state.memory,
      messages: [{ role: "user" as const, content: text }],
    };

    streamChat({ ...ctx, model: state.compareModels[0] }, (chunk) => setA((s) => s + chunk), abortA.current.signal)
      .catch((err) => { if (err?.name !== "AbortError") setA((s) => s + `\n\n[error: ${err?.message ?? "stream failed"}]`); })
      .finally(() => setLoadingA(false));

    streamChat({ ...ctx, model: state.compareModels[1] }, (chunk) => setB((s) => s + chunk), abortB.current.signal)
      .catch((err) => { if (err?.name !== "AbortError") setB((s) => s + `\n\n[error: ${err?.message ?? "stream failed"}]`); })
      .finally(() => setLoadingB(false));
  }

  function swap() {
    dispatch({ type: "SET_COMPARE_MODELS", models: [state.compareModels[1], state.compareModels[0]] });
    setA(b); setB(a);
  }

  return (
    <div className="absolute inset-0 z-30 bg-background flex flex-col">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <ArrowLeftRight className="w-4 h-4 text-primary" /> Compare two models
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent" aria-label="Close compare">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
        <Pane
          label="A"
          model={state.compareModels[0]}
          loading={loadingA}
          content={a}
          onChangeModel={(m) => dispatch({ type: "SET_COMPARE_MODELS", models: [m, state.compareModels[1]] })}
        />
        <div className="border-t md:border-t-0 md:border-l border-border min-h-0 overflow-hidden">
          <Pane
            label="B"
            model={state.compareModels[1]}
            loading={loadingB}
            content={b}
            onChangeModel={(m) => dispatch({ type: "SET_COMPARE_MODELS", models: [state.compareModels[0], m] })}
          />
        </div>
      </div>

      <div className="border-t border-border p-3 bg-card/60">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <button onClick={swap} className="px-3 py-2 rounded-lg border border-border bg-background/60 hover:bg-accent text-[12px] font-semibold flex items-center gap-1" aria-label="Swap">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Swap
          </button>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
            placeholder="Send the same prompt to both models…"
            rows={1}
            className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-[14px] resize-none focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => { void toast; run(); }}
            disabled={!prompt.trim() || loadingA || loadingB}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 shadow-[0_0_15px_rgba(226,18,39,0.45)]"
            aria-label="Send to both"
          >
            {(loadingA || loadingB) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pane({ label, model, loading, content, onChangeModel }: { label: string; model: string; loading: boolean; content: string; onChangeModel: (m: string) => void }) {
  const { toast } = useToast();
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-10 px-3 flex items-center justify-between border-b border-border bg-card/40">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
          <select
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
            className="bg-background/60 border border-border rounded-md px-2 py-1 text-[12px] focus:outline-none focus:border-primary"
          >
            {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          <button onClick={() => { navigator.clipboard.writeText(content); toast({ description: "Copied." }); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground" aria-label="Copy">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 text-[14px] leading-relaxed whitespace-pre-wrap">
        {content
          ? renderMessageContent(content).map((p, i) => p.type === "code"
              ? <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
              : <span key={i}>{p.value}</span>)
          : <span className="text-muted-foreground italic text-[12px]">Awaiting prompt…</span>}
      </div>
    </div>
  );
}
