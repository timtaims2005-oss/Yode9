import { useState } from "react";
import { Brain, Plus, Trash2, X, Sparkles } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const MEMORY_PRESETS = [
  "I prefer answers in Arabic with English technical terms preserved when relevant.",
  "When you produce code, default to Python 3.12 unless told otherwise.",
  "Always be concise. Skip preambles and disclaimers — get to the answer fast.",
  "When I ask for writing, match a confident, friendly, professional tone.",
  "I work in product / engineering. Frame examples in that context when helpful.",
  "When you give a list, rank items by importance and explain the ranking briefly.",
];

export function MemoryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [ci, setCi] = useState(state.customInstructions);

  function add() {
    const v = draft.trim();
    if (!v) return;
    dispatch({ type: "ADD_MEMORY", entry: v });
    setDraft("");
    toast({ description: "Memory saved." });
  }

  function saveCi() {
    dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", text: ci });
    toast({ description: "Custom instructions updated." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-card border-border w-[96vw] max-w-2xl max-h-[82vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="w-5 h-5 text-primary" /> Memory & Custom Instructions
          </DialogTitle>
          <DialogDescription>
            Stored locally in your browser and injected into every model call so the AI knows you across all chats.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Custom instructions</div>
          <textarea
            value={ci}
            onChange={(e) => setCi(e.target.value)}
            placeholder="e.g. Always answer in Arabic. Default to Linux. Show CVSS scores. Cite RFCs when discussing protocols."
            rows={5}
            maxLength={4000}
            className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">{ci.length}/4000</span>
            <button onClick={saveCi} className="px-3 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:opacity-90">Save</button>
          </div>
        </section>

        <section className="space-y-2 mt-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Long-term memory ({state.memory.length})</div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="Add a fact about you the AI should always remember…"
              maxLength={300}
              className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-primary"
            />
            <button onClick={add} disabled={!draft.trim()} className="px-3 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold disabled:opacity-40 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-1.5 mt-2">
            {state.memory.length === 0 ? (
              <div className="text-[12px] text-muted-foreground italic py-3 text-center">No memories yet. Add presets below.</div>
            ) : state.memory.map((m, i) => (
              <div key={i} className="flex items-center gap-2 bg-background/60 border border-border rounded-md px-3 py-2 text-[13px]">
                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="flex-1 break-words">{m}</span>
                <button onClick={() => dispatch({ type: "DELETE_MEMORY", index: i })} className="p-1 text-muted-foreground hover:text-primary" aria-label="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mt-3">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {MEMORY_PRESETS.filter((p) => !state.memory.includes(p)).map((p) => (
              <button
                key={p}
                onClick={() => { dispatch({ type: "ADD_MEMORY", entry: p }); toast({ description: "Added." }); }}
                className="text-[11px] bg-background/60 border border-border rounded-full px-2.5 py-1 hover:bg-accent flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {p.slice(0, 50)}{p.length > 50 ? "…" : ""}
              </button>
            ))}
          </div>
          <button onClick={() => onOpenChange(false)} className="hidden">Close <X /></button>
        </section>
      </DialogContentTop>
    </Dialog>
  );
}
