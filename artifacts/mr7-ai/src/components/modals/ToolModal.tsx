import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TerminalSquare } from "lucide-react";

export function ToolModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const fullLog = [
    "$ CHAT-GPT-agent run --task \"plan launch week\"",
    "[+] Loading project context...",
    "[+] Pulled 14 docs from connected workspace",
    "[+] Drafting outline: hero copy, blog, social, email...",
    "[+] Writing landing-page hero variant A",
    "[+] Writing landing-page hero variant B",
    "[+] Generating 5-day social schedule",
    "[+] Drafting launch email (3 variants)",
    "[+] Compiling press kit one-pager",
    "[!] Reminder: human review pass before publishing",
    "[+] Plan generated. Awaiting your approval.",
  ];
  useEffect(() => {
    if (!open) {
      setLines([]);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      setLines((prev) => [...prev, fullLog[i]]);
      i++;
      if (i >= fullLog.length) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[96vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-emerald-400" />
            CHAT-GPT Agent CLI
          </DialogTitle>
          <DialogDescription>Autonomous task agent. Watch a real run materialize.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-[#050505] border border-border p-3 font-mono text-[12px] leading-relaxed h-72 overflow-y-auto">
          {lines.map((l, i) => (
            <div key={i} className={l.startsWith("[!]") ? "text-amber-400" : l.startsWith("[+]") ? "text-emerald-400" : l.startsWith("$") ? "text-primary" : "text-foreground/80"}>
              {l}
            </div>
          ))}
          <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
