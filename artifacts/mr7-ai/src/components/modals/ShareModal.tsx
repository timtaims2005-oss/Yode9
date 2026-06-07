import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ShareModal({
  open,
  onOpenChange,
  chatId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chatId: string;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const link = `https://CHAT-GPT.ai/c/${chatId.slice(-8)}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[96vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share conversation
          </DialogTitle>
          <DialogDescription>Anyone with the link can read this conversation.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2">
          <code className="flex-1 font-mono text-[12px] truncate text-foreground/90">{link}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              toast({ description: "Share link copied." });
              setTimeout(() => setCopied(false), 1500);
            }}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
