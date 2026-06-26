import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, Check, AlertTriangle, Trophy, Crown, Zap, Flame } from "lucide-react";
import type { GodmodePayload, GodmodeChampState } from "@/lib/store";
import { renderMessageContent, CodeBlock } from "./CodeBlock";

function StatusDot({ status }: { status: GodmodeChampState["status"] }) {
  if (status === "thinking") return <Loader2 className="w-3 h-3 animate-spin text-primary" />;
  if (status === "done") return <Check className="w-3 h-3 text-emerald-400" />;
  if (status === "error") return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />;
}

function scoreColor(total: number): string {
  if (total >= 90) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (total >= 75) return "text-cyan-400 border-cyan-500/40 bg-cyan-500/10";
  if (total >= 60) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  return "text-muted-foreground border-border bg-background/40";
}

export function GodmodeCard({ godmode }: { godmode: GodmodePayload }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const counts = useMemo(() => {
    const total = godmode.champions.length;
    const done = godmode.champions.filter((c) => c.status === "done").length;
    const thinking = godmode.champions.filter((c) => c.status === "thinking").length;
    const errored = godmode.champions.filter((c) => c.status === "error").length;
    return { total, done, thinking, errored };
  }, [godmode.champions]);

  const scoreById = useMemo(() => {
    const m = new Map<string, number>();
    (godmode.scores ?? []).forEach((s) => m.set(s.id, s.total));
    return m;
  }, [godmode.scores]);

  const champs = godmode.champions
    .map((c) => ({ ...c, total: scoreById.get(c.id) }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  const visible = showAll ? champs : champs.slice(0, 12);

  const phaseLabel =
    godmode.phase === "convening" ? "Recruiting champions…" :
    godmode.phase === "racing"     ? `Champions racing · ${counts.done}/${counts.total} done` :
    godmode.phase === "judging"    ? "Judge scoring 100-pt composite…" :
    godmode.phase === "error"      ? "Godmode error" :
    `${godmode.mode === "ultraplinian" ? "ULTRAPLINIAN" : "GODMODE CLASSIC"} · ${counts.total} champions`;

  return (
    <div className="space-y-3 w-full">
      <div className="rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-sm p-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />
        <div className="flex items-center justify-between gap-2 mb-2.5 relative">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              {godmode.mode === "ultraplinian" ? <Flame className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[12px] font-bold flex items-center gap-1.5">
                <span>{godmode.mode === "ultraplinian" ? "ULTRAPLINIAN" : "GODMODE CLASSIC"}</span>
                {godmode.tier && (
                  <span className="text-[9px] font-mono px-1.5 rounded uppercase bg-primary/15 text-primary border border-primary/30">{godmode.tier}</span>
                )}
                {(godmode.phase === "convening" || godmode.phase === "racing" || godmode.phase === "judging") && (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 relative">
          {visible.map((c, idx) => {
            const open = expandedId === c.id;
            const isWinner = idx === 0 && godmode.winner?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setExpandedId(open ? null : c.id)}
                className={`text-left rounded-lg border px-2 py-1.5 transition-all ${
                  open ? "border-primary/60 bg-primary/5"
                  : isWinner ? "border-amber-500/50 bg-amber-500/5"
                  : c.status === "thinking" ? "border-primary/30 bg-primary/5"
                  : c.status === "error" ? "border-amber-500/30 bg-amber-500/5 opacity-70"
                  : "border-border bg-background/40 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isWinner ? <Crown className="w-3.5 h-3.5 shrink-0 text-amber-400" /> : <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">#{idx + 1}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{c.styleLabel}</div>
                    <div className="text-[10px] text-muted-foreground truncate">× {c.personaLabel}</div>
                  </div>
                  {c.total !== undefined && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreColor(c.total)}`}>{c.total}</span>
                  )}
                  <StatusDot status={c.status} />
                </div>
              </button>
            );
          })}
        </div>

        {champs.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 w-full text-center text-[10.5px] text-muted-foreground hover:text-primary font-semibold flex items-center justify-center gap-1"
          >
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAll ? "Show less" : `Show all ${champs.length} champions`}
          </button>
        )}

        <AnimatePresence>
          {expandedId && (() => {
            const c = champs.find((x) => x.id === expandedId);
            if (!c) return null;
            const scoreObj = (godmode.scores ?? []).find((s) => s.id === c.id);
            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 rounded-xl border border-primary/20 bg-background/60 p-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-bold">{c.styleLabel}</span>
                    <span className="text-[10px] text-muted-foreground">× {c.personaLabel}</span>
                    {scoreObj && (
                      <span className={`ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${scoreColor(scoreObj.total)}`}>
                        {scoreObj.total}/100
                      </span>
                    )}
                  </div>
                  {scoreObj && (
                    <div className="flex flex-wrap gap-1 text-[9px] font-mono mb-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted/30">insight {scoreObj.insight}/25</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/30">spec {scoreObj.specificity}/20</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/30">acc {scoreObj.accuracy}/25</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/30">novel {scoreObj.novelty}/15</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted/30">struct {scoreObj.structure}/15</span>
                      {scoreObj.verdict && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary italic">"{scoreObj.verdict}"</span>
                      )}
                    </div>
                  )}
                  {c.error ? (
                    <div className="text-[11px] text-amber-400">[skipped: {c.error}]</div>
                  ) : c.content.trim() ? (
                    <div className="text-[12px] leading-relaxed text-foreground/90">
                      {renderMessageContent(c.content).map((p, i) =>
                        p.type === "code" ? (
                          <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
                        ) : (
                          <span key={i} className="whitespace-pre-wrap">{p.value}</span>
                        ),
                      )}
                      {c.status === "thinking" && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> warming up…
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {godmode.winner && godmode.winnerContent && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/[0.04] p-4 relative">
          <div className="flex items-center justify-between mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Winner · {godmode.winner.styleLabel} × {godmode.winner.personaLabel}</span>
            </div>
            {godmode.scores?.[0] && (
              <span className="font-mono text-amber-400 bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 rounded">
                {godmode.scores[0].total}/100
              </span>
            )}
          </div>
          <div className="text-[var(--chat-font-size,15px)] leading-relaxed text-foreground/95">
            {renderMessageContent(godmode.winnerContent).map((p, i) =>
              p.type === "code" ? (
                <CodeBlock key={i} code={p.value} lang={p.lang ?? "text"} />
              ) : (
                <span key={i} className="whitespace-pre-wrap">{p.value}</span>
              ),
            )}
          </div>
        </div>
      )}

      {godmode.phase === "error" && godmode.error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-300">
          Godmode error: {godmode.error}
        </div>
      )}
    </div>
  );
}
