import { useMemo, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

function highlight(text: string, q: string): { __html: string } {
  if (!q.trim()) return { __html: text };
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return { __html: safe.replace(re, '<mark class="bg-primary/30 text-primary rounded px-0.5">$1</mark>') };
}

export function SearchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const ql = q.toLowerCase();
    const out: { chatId: string; chatTitle: string; msgId: string; content: string; role: string; ts: number }[] = [];
    for (const c of state.chats) {
      if (c.title.toLowerCase().includes(ql)) {
        out.push({ chatId: c.id, chatTitle: c.title, msgId: "_title", content: `(chat title) ${c.title}`, role: "title", ts: c.createdAt });
      }
      for (const m of c.messages) {
        if (m.content.toLowerCase().includes(ql)) {
          const idx = m.content.toLowerCase().indexOf(ql);
          const start = Math.max(0, idx - 80);
          const end = Math.min(m.content.length, idx + ql.length + 120);
          const snippet = (start > 0 ? "…" : "") + m.content.slice(start, end) + (end < m.content.length ? "…" : "");
          out.push({ chatId: c.id, chatTitle: c.title, msgId: m.id, content: snippet, role: m.role, ts: m.ts });
        }
      }
    }
    return out.sort((a, b) => b.ts - a.ts).slice(0, 100);
  }, [q, state.chats]);

  function open_chat(id: string) {
    dispatch({ type: "SELECT_CHAT", id });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-card border-border w-[96vw] max-w-2xl max-h-[82vh] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="w-5 h-5 text-primary" /> Search all chats
          </DialogTitle>
          <DialogDescription>{state.chats.length} chats · {state.chats.reduce((s, c) => s + c.messages.length, 0)} messages</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages, code, titles…"
            className="w-full bg-background/60 border border-border rounded-lg pl-9 pr-9 py-2.5 text-[14px] focus:outline-none focus:border-primary"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label="Clear">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1">
          {!q.trim() ? (
            <div className="text-[12px] text-muted-foreground italic py-8 text-center">Type to search.</div>
          ) : results.length === 0 ? (
            <div className="text-[12px] text-muted-foreground italic py-8 text-center">No matches.</div>
          ) : results.map((r, i) => (
            <button
              key={`${r.chatId}-${r.msgId}-${i}`}
              onClick={() => open_chat(r.chatId)}
              className="w-full text-left bg-background/60 border border-border rounded-lg p-2.5 hover:border-primary/40 hover:bg-accent/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{r.chatTitle.slice(0, 50)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{r.role}</span>
              </div>
              <div
                className="text-[12.5px] text-foreground/90 break-words"
                dangerouslySetInnerHTML={highlight(r.content, q)}
              />
              <div className="flex justify-end mt-1 text-muted-foreground group-hover:text-primary"><ArrowRight className="w-3.5 h-3.5" /></div>
            </button>
          ))}
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
