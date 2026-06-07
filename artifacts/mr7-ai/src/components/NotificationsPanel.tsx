import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { useStore } from "@/lib/store";

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsPanel() {
  const { state, dispatch } = useStore();
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => { if (o && unread > 0) dispatch({ type: "MARK_NOTIFS_READ" }); }}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-bold">Notifications</span>
          <span className="text-[11px] text-muted-foreground">{state.notifications.length} total</span>
        </div>
        <div className="max-h-[min(70vh,520px)] overflow-y-auto divide-y divide-border">
          {state.notifications.map((n) => (
            <div key={n.id} className="px-3 py-2.5 hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold leading-tight">{n.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.ts)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
