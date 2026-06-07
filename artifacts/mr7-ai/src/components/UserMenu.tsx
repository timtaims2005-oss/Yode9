import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Palette, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UserMenu({
  trigger,
  onAccount,
  onSettings,
  onTheme,
}: {
  trigger?: "row" | "dots";
  onAccount: () => void;
  onSettings: () => void;
  onTheme: () => void;
}) {
  const { toast } = useToast();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger === "dots" ? (
          <button className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground" aria-label="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        ) : (
          <button className="flex items-center gap-3 hover:bg-accent rounded-lg px-1 py-1 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner border border-white/10">
              A
            </div>
            <div className="text-left">
              <div className="font-semibold text-[13px] leading-tight">Ali Noej</div>
              <div className="text-[11px] text-muted-foreground">Free</div>
            </div>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel>Ali Noej · Free</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAccount}>
          <User className="w-4 h-4" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSettings}>
          <Settings className="w-4 h-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onTheme}>
          <Palette className="w-4 h-4" /> Theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast({ description: "Sign-out is disabled in this preview." })}
          className="text-primary"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
