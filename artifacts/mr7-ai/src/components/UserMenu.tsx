import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, Palette, MoreVertical, LogIn, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { tokenUsagePercent } from "@/lib/auth";

const TIER_COLORS: Record<string, string> = {
  free:         "rgba(120,120,140,0.85)",
  starter:      "#22c55e",
  pro:          "#e21227",
  professional: "#e21227",
  elite:        "#a78bfa",
  enterprise:   "#a78bfa",
};

const TIER_LABELS: Record<string, string> = {
  free:         "FREE",
  starter:      "STARTER",
  pro:          "PRO",
  professional: "PRO",
  elite:        "ELITE",
  enterprise:   "ENTERPRISE",
};

export function UserMenu({
  trigger,
  onAccount,
  onSettings,
  onTheme,
  onLogin,
}: {
  trigger?: "row" | "dots";
  onAccount: () => void;
  onSettings: () => void;
  onTheme: () => void;
  onLogin?: () => void;
}) {
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const tier      = user?.subscription ?? "free";
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.free;
  const tierLabel = TIER_LABELS[tier] ?? "FREE";
  const initial   = user
    ? (user.firstName?.[0] ?? user.username?.[0] ?? user.email?.[0] ?? "?").toUpperCase()
    : "?";
  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : user.username ?? user.email)
    : "Guest";
  const tokenPct = tokenUsagePercent(user);

  async function handleSignOut() {
    await signOut();
    toast({ description: "Signed out." });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger === "dots" ? (
          <button className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground" aria-label="More">
            <MoreVertical className="w-4 h-4" />
          </button>
        ) : (
          <button className="flex items-center gap-3 hover:bg-accent rounded-lg px-1 py-1 transition-colors">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner border"
              style={{
                background: user
                  ? `linear-gradient(135deg, ${tierColor}cc, ${tierColor}44)`
                  : "linear-gradient(135deg, #333, #555)",
                borderColor: `${tierColor}44`,
                boxShadow: user ? `0 0 8px ${tierColor}40` : "none",
              }}
            >
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : initial}
            </div>
            <div className="text-left">
              <div className="font-semibold text-[13px] leading-tight truncate max-w-[90px]">{displayName}</div>
              <div className="text-[10px] font-bold tracking-widest" style={{ color: tierColor }}>{tierLabel}</div>
            </div>
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 bg-card border-border">
        {/* Header */}
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border shrink-0"
            style={{ background: `linear-gradient(135deg, ${tierColor}cc, ${tierColor}44)`, borderColor: `${tierColor}44` }}
          >
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initial}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] truncate">{displayName}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user?.email ?? "Not signed in"}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="w-2.5 h-2.5" style={{ color: tierColor }} />
              <span className="text-[10px] font-bold tracking-widest" style={{ color: tierColor }}>{tierLabel}</span>
            </div>
          </div>
        </div>

        {/* Token progress bar — only for logged-in users */}
        {user && (
          <div className="px-3 pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Zap className="w-2.5 h-2.5" />
                <span>Token usage</span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: tierColor }}>
                {tokenPct}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tokenPct}%`,
                  background: tokenPct > 85 ? "#e21227" : tokenPct > 60 ? "#f59e0b" : tierColor,
                  boxShadow: `0 0 4px ${tierColor}80`,
                }}
              />
            </div>
            <div className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono">
              {user.tokensUsed.toLocaleString()} / {user.tokensLimit.toLocaleString()} tokens
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        {user ? (
          <>
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
            <DropdownMenuItem onSelect={handleSignOut} className="text-primary">
              <LogOut className="w-4 h-4" /> Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onSettings}>
              <Settings className="w-4 h-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onTheme}>
              <Palette className="w-4 h-4" /> Theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogin} className="text-primary">
              <LogIn className="w-4 h-4" /> Sign in
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
