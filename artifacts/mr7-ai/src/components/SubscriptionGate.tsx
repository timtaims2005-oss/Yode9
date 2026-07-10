import { Lock } from "lucide-react";
import { type SubscriptionTier, TIER_LABELS, tierAtLeast } from "@/lib/subscription";
import { useStore } from "@/lib/store";

interface SubscriptionGateProps {
  required: SubscriptionTier;
  feature?: string;
  onUpgrade: () => void;
  children: React.ReactNode;
  compact?: boolean;
}

export function SubscriptionGate({ required, feature, onUpgrade, children, compact = false }: SubscriptionGateProps) {
  const { state } = useStore();
  const tier = state.subscription.tier;

  if (tierAtLeast(tier, required)) {
    return <>{children}</>;
  }

  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold hover:bg-primary/10 transition-colors"
      >
        <Lock className="w-3 h-3" />
        {TIER_LABELS[required]}+ required
      </button>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="font-bold text-sm mb-1">{feature ?? "Feature Locked"}</div>
          <div className="text-[12px] text-muted-foreground mb-3">
            Requires <span className="text-primary font-semibold">{TIER_LABELS[required]}</span> plan or higher
          </div>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
          >
            Upgrade to {TIER_LABELS[required]}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useTier() {
  const { state } = useStore();
  return {
    tier: state.subscription.tier,
    can: (required: SubscriptionTier) => tierAtLeast(state.subscription.tier, required),
    isExpired: () => {
      const { expiresAt } = state.subscription;
      return expiresAt !== null && Date.now() > expiresAt;
    },
  };
}
