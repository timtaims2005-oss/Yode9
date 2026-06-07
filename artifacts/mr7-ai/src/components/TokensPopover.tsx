import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins } from "lucide-react";

export function TokensPopover({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border hover:bg-accent transition-colors">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-mono font-bold text-foreground">5.2K</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 bg-card border-border">
        <div className="text-sm font-bold mb-2">Token usage</div>
        <div className="space-y-2 text-[13px]">
          <Row label="Used today" value="780" />
          <Row label="This week" value="4.2K" />
          <Row label="Plan limit" value="10K / month" />
          <Row label="Resets in" value="4d 09h" />
        </div>
        <div className="h-1.5 bg-background rounded-full overflow-hidden mt-3 mb-3">
          <div className="h-full bg-primary rounded-full" style={{ width: "52%" }} />
        </div>
        <button
          onClick={onUpgrade}
          className="w-full py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90"
        >
          Get more tokens
        </button>
      </PopoverContent>
    </Popover>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
