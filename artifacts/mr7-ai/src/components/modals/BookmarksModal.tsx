import { useMemo, useState } from "react";
import { BookmarkCheck, MessageSquare, Search, Copy, ArrowRight } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function BookmarksModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const out: { chatId: string; chatTitle: string; msgId: string; content: string; ts: number; role: string }[] = [];
    for (const c of state.chats) {
      for (const m of c.messages) {
        if (m.bookmarked) {
          out.push({ chatId: c.id, chatTitle: c.title, msgId: m.id, content: m.content, ts: m.ts, role: m.role });
        }
      }
    }
    out.sort((a, b) => b.ts - a.ts);
    if (!q.trim()) return out;
    const ql = q.toLowerCase();
    return out.filter((x) => x.content.toLowerCase().includes(ql) || x.chatTitle.toLowerCase().includes(ql));
  }, [state.chats, q]);

  function jump(chatId: string) {
    dispatch({ type: "SELECT_CHAT", id: chatId });
    onOpenChange(false);
  }

  function unbookmark(chatId: string, msgId: string) {
    dispatch({ type: "BOOKMARK_MSG", chatId, msgId });
    toast({ description: "Removed bookmark." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-card border-border w-[96vw] max-w-2xl max-h-[82vh] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookmarkCheck className="w-5 h-5 text-amber-400" /> Bookmarks
          </DialogTitle>
          <DialogDescription>{items.length} saved across all chats.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter bookmarks…"
            className="w-full bg-background/60 border border-border rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
          {items.length === 0 ? (
            <div className="text-[12px] text-muted-foreground italic py-8 text-center">
              No bookmarks yet. Click the bookmark icon under any message.
            </div>
          ) : items.map((b) => (
            <div key={b.msgId} className="bg-background/60 border border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <button onClick={() => jump(b.chatId)} className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary font-bold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {b.chatTitle.slice(0, 50)}
                </button>
                <span className="text-[10px] text-muted-foreground font-mono">{b.role}</span>
              </div>
              <div className="text-[12.5px] text-foreground/90 line-clamp-4 whitespace-pre-wrap break-words">{b.content}</div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <button onClick={() => { navigator.clipboard.writeText(b.content); toast({ description: "Copied." }); }} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Copy"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={() => unbookmark(b.chatId, b.msgId)} className="p-1 text-muted-foreground hover:text-amber-400" aria-label="Remove bookmark"><BookmarkCheck className="w-3.5 h-3.5 fill-current" /></button>
                <button onClick={() => jump(b.chatId)} className="p-1 text-muted-foreground hover:text-primary" aria-label="Open chat"><ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
