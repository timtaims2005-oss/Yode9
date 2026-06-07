import { useState } from "react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Key, Check, AlertCircle, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { verifyActivationCode, TIER_LABELS } from "@/lib/subscription";

interface ActivateModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ActivateModal({ open, onOpenChange }: ActivateModalProps) {
  const { dispatch } = useStore();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activatedTier, setActivatedTier] = useState("");

  function activate() {
    const result = verifyActivationCode(code.trim());
    if (!result) {
      setError("Invalid or expired activation code. Please check the code and try again.");
      return;
    }
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: {
        tier: result.tier,
        activatedAt: Date.now(),
        expiresAt: result.expiresAt,
        tokensUsed: 0,
        activationCode: code.trim(),
      },
    });
    setActivatedTier(TIER_LABELS[result.tier]);
    setSuccess(true);
    toast({ description: `${TIER_LABELS[result.tier]} plan activated successfully.` });
  }

  function handleClose(v: boolean) {
    if (!v) { setCode(""); setError(""); setSuccess(false); setActivatedTier(""); }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContentTop className="bg-card border border-border w-[96vw] max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5 text-primary" /> Activate Plan
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-lg text-emerald-400">{activatedTier} Activated!</div>
              <div className="text-sm text-muted-foreground mt-1">All plan features are now unlocked.</div>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition-colors"
            >
              Start using {activatedTier}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[12px] text-muted-foreground">
              Enter the activation code you received after payment. Codes are case-insensitive.
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && activate()}
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className={`w-full bg-background border ${error ? "border-red-500/60" : "border-border"} rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono tracking-wider`}
                autoFocus
              />
              {error && (
                <div className="flex items-start gap-1.5 text-red-400 text-[12px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
            <button
              onClick={activate}
              disabled={!code.trim()}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Activate
            </button>
            <div className="text-[11px] text-muted-foreground text-center">
              Don't have a code yet?{" "}
              <button onClick={() => handleClose(false)} className="text-primary hover:underline">
                View Plans
              </button>
            </div>
          </div>
        )}
      </DialogContentTop>
    </Dialog>
  );
}
