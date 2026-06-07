import { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Sparkles, Users, RotateCcw, Zap, GitMerge, Trophy } from "lucide-react";
import { COUNCIL_BRAIN_META, COUNCIL_CATEGORIES, defaultAutoBrains, COUNCIL_PRESETS } from "@/lib/council-brains";

export type CouncilConfig = {
  mode: "auto" | "manual" | "all";
  brainIds: string[];
  maxBrains: number;
  fusion: boolean;
  scoring: boolean;
};

export const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  mode: "auto",
  brainIds: defaultAutoBrains(),
  maxBrains: 7,
  fusion: true,
  scoring: true,
};

// FUSION preset — every brain in parallel with full integration & scoring.
export const FUSION_COUNCIL_CONFIG: CouncilConfig = {
  mode: "all",
  brainIds: COUNCIL_BRAIN_META.map((b) => b.id),
  maxBrains: COUNCIL_BRAIN_META.length,
  fusion: true,
  scoring: true,
};

// DEBATE preset — adversarial 3-brain panel: argue both sides, judge between them.
// devils-advocate (con) vs steelman (pro) judged by critical-thinker.
export const DEBATE_COUNCIL_CONFIG: CouncilConfig = {
  mode: "manual",
  brainIds: ["devils-advocate", "steelman", "critical-thinker"],
  maxBrains: 3,
  fusion: true,
  scoring: true,
};

// HYDRA preset — 5 elite reasoning brains in parallel, fused & scored.
// Adds first-principles + polymath on top of the debate trio for deeper reach.
export const HYDRA_COUNCIL_CONFIG: CouncilConfig = {
  mode: "manual",
  brainIds: ["first-principles", "devils-advocate", "steelman", "critical-thinker", "polymath"],
  maxBrains: 5,
  fusion: true,
  scoring: true,
};

export function CouncilSettingsModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: CouncilConfig;
  onClose: () => void;
  onSave: (cfg: CouncilConfig) => void;
}) {
  const [mode, setMode] = useState<CouncilConfig["mode"]>(initial.mode);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.brainIds));
  const [maxBrains, setMaxBrains] = useState(initial.maxBrains);
  const [fusion, setFusion] = useState(initial.fusion);
  const [scoring, setScoring] = useState(initial.scoring);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) {
      setMode(initial.mode);
      setSelected(new Set(initial.brainIds));
      setMaxBrains(initial.maxBrains);
      setFusion(initial.fusion);
      setScoring(initial.scoring);
      setFilter("");
    }
  }, [open, initial]);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return COUNCIL_CATEGORIES.map((cat) => ({
      cat,
      items: COUNCIL_BRAIN_META.filter(
        (b) => b.category === cat && (!f || b.label.toLowerCase().includes(f) || b.blurb.toLowerCase().includes(f)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [filter]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    if (mode !== "manual") setMode("manual");
  }

  function selectCategory(cat: string, on: boolean) {
    const next = new Set(selected);
    COUNCIL_BRAIN_META.filter((b) => b.category === cat).forEach((b) => {
      if (on) next.add(b.id);
      else next.delete(b.id);
    });
    setSelected(next);
    if (mode !== "manual") setMode("manual");
  }

  function reset() {
    setMode("auto");
    setSelected(new Set(defaultAutoBrains()));
    setMaxBrains(7);
    setFusion(false);
    setScoring(false);
  }

  function save() {
    const ids = Array.from(selected);
    onSave({
      mode,
      brainIds: mode === "manual" ? ids : defaultAutoBrains(),
      maxBrains: Math.max(1, Math.min(maxBrains, COUNCIL_BRAIN_META.length)),
      fusion,
      scoring,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold">Council of {COUNCIL_BRAIN_META.length} brains</div>
              <div className="text-[11px] text-muted-foreground">Pick which AI brains will think in parallel on your next question.</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setMode("auto"); setSelected(new Set(defaultAutoBrains())); }}
              className={`px-3 py-2 rounded-xl border text-left ${mode === "auto" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-[12px] font-bold flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Auto</div>
              <div className="text-[10.5px] text-muted-foreground">Router picks the best brains for the question.</div>
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-3 py-2 rounded-xl border text-left ${mode === "manual" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-[12px] font-bold">Manual</div>
              <div className="text-[10.5px] text-muted-foreground">Choose the exact brains below ({selected.size} selected).</div>
            </button>
            <button
              onClick={() => { setMode("all"); setSelected(new Set(COUNCIL_BRAIN_META.map((b) => b.id))); }}
              className={`px-3 py-2 rounded-xl border text-left ${mode === "all" ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-[12px] font-bold">All {COUNCIL_BRAIN_META.length}</div>
              <div className="text-[10.5px] text-muted-foreground">Convene every brain. Slower but most thorough.</div>
            </button>
          </div>

          {mode === "auto" && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">Max brains the router can pick:</span>
              <input
                type="range" min={3} max={30} value={maxBrains}
                onChange={(e) => setMaxBrains(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="font-mono text-primary font-bold w-6 text-right">{maxBrains}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFusion(!fusion)}
              className={`px-2.5 py-2 rounded-xl border text-left transition-all ${fusion ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <GitMerge className={`w-3.5 h-3.5 ${fusion ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[12px] font-bold">Fusion (Round 2)</span>
                <span className={`text-[9px] font-mono ml-auto px-1 rounded ${fusion ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"}`}>{fusion ? "ON" : "OFF"}</span>
              </div>
              <div className="text-[10.5px] text-muted-foreground leading-tight">Brains see each other's takes and refine in a 2nd round.</div>
            </button>
            <button
              onClick={() => setScoring(!scoring)}
              className={`px-2.5 py-2 rounded-xl border text-left transition-all ${scoring ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Trophy className={`w-3.5 h-3.5 ${scoring ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[12px] font-bold">Composite scoring</span>
                <span className={`text-[9px] font-mono ml-auto px-1 rounded ${scoring ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"}`}>{scoring ? "ON" : "OFF"}</span>
              </div>
              <div className="text-[10.5px] text-muted-foreground leading-tight">100-pt judge ranks every brain's answer.</div>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[10.5px] uppercase tracking-wider font-bold text-muted-foreground">Quick presets</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {COUNCIL_PRESETS.map((p) => {
                const ids = p.brainIds.filter((id) => COUNCIL_BRAIN_META.some((b) => b.id === id));
                const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
                return (
                  <button
                    key={p.id}
                    onClick={() => { setMode("manual"); setSelected(new Set(ids)); }}
                    title={p.blurb}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                      allOn
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {p.label}
                    <span className="ml-1.5 text-[10px] font-mono opacity-60">{ids.length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search brains by name or specialty…"
              className="w-full bg-background border border-border rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-primary text-[12px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {grouped.map(({ cat, items }) => {
            const allOn = items.every((i) => selected.has(i.id));
            const someOn = items.some((i) => selected.has(i.id));
            return (
              <div key={cat}>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{cat} <span className="text-[10px] font-mono text-muted-foreground/70">· {items.length}</span></h4>
                  <button
                    onClick={() => selectCategory(cat, !allOn)}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary font-bold"
                  >
                    {allOn ? "Clear" : someOn ? "Select all" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items.map((b) => {
                    const Icon = b.icon;
                    const on = selected.has(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggle(b.id)}
                        className={`flex items-center gap-2 text-left p-2 rounded-lg border transition-all ${
                          on ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 bg-background/40"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${b.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold truncate">{b.label}</div>
                          <div className="text-[10.5px] text-muted-foreground truncate">{b.blurb}</div>
                        </div>
                        {on && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
          <button onClick={reset} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] hover:bg-accent">Cancel</button>
            <button
              onClick={save}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90"
            >
              Save council
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
