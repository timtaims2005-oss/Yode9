import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Eye, EyeOff, KeyRound, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FAKE_KEY = "CHAT-GPT_sk_live_b7c41f0b8e2a4d1c9f5b7a6e3c2d1f0a9e8b7d6c";

export function ApiAccessModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const masked = FAKE_KEY.slice(0, 12) + "•".repeat(20) + FAKE_KEY.slice(-4);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[96vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            API Access
          </DialogTitle>
          <DialogDescription>
            Use your API key to drive CHAT-GPT models from your own tooling. Keep it secret. Rotate often.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2">
            <code className="flex-1 font-mono text-[12.5px] text-foreground/90 truncate">
              {shown ? FAKE_KEY : masked}
            </code>
            <button
              onClick={() => setShown((s) => !s)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
              aria-label={shown ? "Hide key" : "Show key"}
            >
              {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(FAKE_KEY);
                setCopied(true);
                toast({ description: "API key copied to clipboard." });
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent"
              aria-label="Copy key"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">Quickstart</div>
            <pre className="bg-[#0a0a0a] border border-border rounded-xl p-3 text-[12px] font-mono leading-relaxed overflow-x-auto">
{`curl https://api.CHAT-GPT.ai/v1/chat \\
  -H "Authorization: Bearer ${shown ? FAKE_KEY : "<YOUR_KEY>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"CHAT-GPT-fast","messages":[{"role":"user","content":"hi"}]}'`}
            </pre>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Rate limit on Free plan: 20 req/min. Upgrade for higher quotas and streaming endpoints.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
