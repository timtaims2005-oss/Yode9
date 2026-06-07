import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["⌘", "/"], label: "Focus chat search" },
  { keys: ["⌘", "N"], label: "New chat" },
  { keys: ["?"], label: "Open this shortcuts panel" },
  { keys: ["Esc"], label: "Close any open panel" },
  { keys: ["Enter"], label: "Send message" },
  { keys: ["Shift", "Enter"], label: "New line" },
];

export function ShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[96vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-foreground/90">{r.label}</span>
              <div className="flex items-center gap-1">
                {r.keys.map((k) => (
                  <kbd key={k} className="px-2 py-0.5 rounded-md bg-background border border-border text-[11px] font-mono">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
