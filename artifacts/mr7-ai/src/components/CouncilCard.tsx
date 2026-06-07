import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, Check, AlertTriangle, Sparkles, Users, Brain, GitMerge, Trophy } from "lucide-react";
import type { CouncilPayload, CouncilSeatState } from "@/lib/store";
import { COUNCIL_BRAIN_META } from "@/lib/council-brains";
import { renderMessageContent, CodeBlock } from "./CodeBlock";

function scoreColor(total: number): string {
  if (total >= 90) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (total >= 75) return "text-cyan-400 border-cyan-500/40 bg-cyan-500/10";
  if (total >= 60) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  return "text-muted-foreground border-border bg-background/40";
}

function brainMeta(id: string) {
  return COUNCIL_BRAIN_META.find((b) => b.id === id);
}

function StatusDot({ status }: { status: CouncilSeatState["status"] }) {
  if (status === "thinking") return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
  if (status === "done") return <Check className="w-3 h-3 text-emerald-400" />;
  if (status === "error") return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />;
}

export function CouncilCard({ council }: { council: CouncilPayload }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const counts = useMemo(() => {
    const total = council.brains.length;
    const done = council.brains.filter((b) => b.status === "done").length;
    const thinking = council.brains.filter((b) => b.status === "thinking").length;
    const errored = council.brains.filter((b) => b.status === "error").length;
    return { total, done, thinking, errored };
  }, [council.brains]);

  const scoreById = useMemo(() => {
    const m = new Map<string, number>();
    (council.scores ?? []).forEach((s) => m.set(s.id, s.total));
    return m;
  }, [council.scores]);

  const sortedBrains = council.scores && council.scores.length
    ? [...council.brains].sort((a, b) => (scoreById.get(b.id) ?? -1) - (scoreById.get(a.id) ?? -1))
    : council.brains;
  const visible = showAll ? sortedBrains : sortedBrains.slice(0, 12);

  const phaseLabel =
    council.phase === "convening" ? "Convening the council…" :
    council.phase === "thinking" ? `Thinking in parallel · ${counts.done}/${counts.total} done` :
    council.phase === "fusing" ? "Round 2 · brains cross-pollinating their takes…" :
    council.phase === "scoring" ? "Judge scoring brains on the 100-pt composite…" :
    council.phase === "synthesizing" ? "Synthesizing the council's answer…" :
    council.phase === "error" ? "Council error" :
    `Council answer · ${counts.total} brains consulted${council.fusion ? " · 2 rounds" : ""}`;

  return (
    <div className="space-y-3 w-full">
      {/* Council header */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[12px] font-bold flex items-center gap-1.5">
                <span>Council of {counts.total} brains</span>
                {council.fusion && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase px-1 rounded bg-primary/15 text-primary border border-primary/30">
                    <GitMerge className="w-2.5 h-2.5" /> fusion
                  </span>
                )}
                {council.scores && council.scores.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase px-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Trophy className="w-2.5 h-2.5" /> scored
                  </span>
                )}
                {(council.phase === "convening" || council.phase === "thinking" || council.phase === "synthesizing" || council.phase === "fusing" || council.phase === "scoring") && (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
              </div>
              <div className="text-[10.5px] text-muted-foreground">{phaseLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-1.5 py-0.5">{counts.done} done</span>
            {counts.thinking > 0 && (
              <span className="text-primary bg-primary/10 border border-primary/30 rounded-md px-1.5 py-0.5">{counts.thinking} live</span>
            )}
            {counts.errored > 0 && (
              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5">{counts.errored} skip</span>
            )}
          </div>
        </div>

        {/* Brain grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {visible.map((seat) => {
            const meta = brainMeta(seat.id);
            const Icon = meta?.icon ?? Brain;
            const open = expandedId === seat.id;
            const hasContent = seat.content.trim().length > 0;
            const total = scoreById.get(seat.id);
            return (
              <button
                key={seat.id}
                disabled={!hasContent && seat.status !== "thinking"}
                onClick={() => setExpandedId(open ? null : seat.id)}
                className={`text-left rounded-lg border px-2 py-1.5 transition-all ${
                  open ? "border-primary/50 bg-primary/5"
                  : seat.status === "thinking" ? "border-primary/30 bg-primary/5"
                  : seat.status === "error" ? "border-amber-500/30 bg-amber-500/5 opacity-70"
                  : seat.status === "done" ? "border-border bg-background/40 hover:border-primary/30"
                  : "border-border/50 bg-background/20 opacity-60"
                }`}
                title={meta?.blurb}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3 h-3 shrink-0 ${meta?.color ?? "text-muted-foreground"}`} />
                  <span className="text-[10.5px] font-semibold truncate flex-1">{seat.label}</span>
                  {seat.round === 2 && (
                    <span className="text-[8px] font-mono px-1 rounded bg-primary/15 text-primary border border-primary/30" title="Round 2 (fusion)">R2</span>
                  )}
                  {total !== undefined && (
                    <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${scoreColor(total)}`}>{total}</span>
                  )}
                  <StatusDot status={seat.status} />
                </div>
              </button>
            );
          })}
        </div>

        {council.brains.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 w-full text-center text-[10.5px] text-muted-foreground hover:text-primary font-semibold flex items-center justify-center gap-1"
          >
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAll ? "Show less" : `Show all ${council.brains.length} brains`}
          </button>
        )}

        {/* Expanded brain content */}
        <AnimatePresence>
          {expandedId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {(() => {
                const seat = council.brains.find((b) => b.id === expandedId);
                if (!seat) return null;
                const meta = brainMeta(seat.id);
                const Icon = meta?.icon ?? Brain;
                return (
                  <div className="mt-2.5 rounded-xl border border-primary/20 bg-background/60 p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <Icon className={`w-3.5 h-3.5 ${meta?.color ?? "text-muted-foreground"}`} />
                      <span className="text-[11px] font-bold">{seat.label}</span>
                      <span className="text-[10px] text-muted-foreground">· {seat.category}</span>
                      {seat.round === 2 && (
                        <span className="text-[9px] font-mono uppercase px-1 rounded bg-primary/15 text-primary border border-primary/30">round 2</span>
                      )}
                      {(() => {
                        const sObj = (council.scores ?? []).find((s) => s.id === seat.id);
                        if (!sObj) return null;
                        return (
                          <>
                            <span className={`ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreColor(sObj.total)}`}>{sObj.total}/100</span>
                          </>
                        );
                      })()}
                    </div>
                    {(() => {
                      const sObj = (council.scores ?? []).find((s) => s.id === seat.id);
                      if (!sObj) return null;
                      return (
                        <div className="flex flex-wrap gap-1 text-[9px] font-mono mb-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-muted/30">insight {sObj.insight}/25</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted/30">spec {sObj.specificity}/20</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted/30">acc {sObj.accuracy}/25</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted/30">novel {sObj.novelty}/15</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted/30">struct {sObj.structure}/15</span>
                        </div>
                      );
                    })()}
                    {seat.error ? (
                      <div className="text-[11px] text-amber-400">[skipped: {seat.error}]</div>
                    ) : seat.content.trim() ? (
                      <div className="text-[12px] leading-relaxed text-foreground/90">
                        {renderMessageContent(seat.content).map((p, i) =>
                          p.type === "code" ? (
                            <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
                          ) : (
                            <span key={i} className="whitespace-pre-wrap">{p.value}</span>
                          ),
                        )}
                        {seat.status === "thinking" && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> warming up…
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Synthesized answer */}
      {(council.phase === "synthesizing" || council.phase === "done" || council.synthesis) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Council synthesis</span>
            {council.phase === "synthesizing" && <Loader2 className="w-3 h-3 animate-spin" />}
          </div>
          {council.synthesis.trim() ? (
            <div className="text-[var(--chat-font-size,15px)] leading-relaxed text-foreground/95">
              {renderMessageContent(council.synthesis).map((p, i) =>
                p.type === "code" ? (
                  <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
                ) : (
                  <span key={i} className="whitespace-pre-wrap">{p.value}</span>
                ),
              )}
              {council.phase === "synthesizing" && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
              )}
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Combining the council's answers into one…
            </div>
          )}
        </div>
      )}

      {council.phase === "error" && council.error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-300">
          Council error: {council.error}
        </div>
      )}
    </div>
  );
}
