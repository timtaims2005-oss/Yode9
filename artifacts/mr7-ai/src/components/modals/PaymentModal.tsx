import { useState } from "react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, ExternalLink, Bitcoin, CreditCard, Building2, Send } from "lucide-react";
import { type SubscriptionTier, TIER_LABELS, TIER_PRICES, loadPaymentSettings } from "@/lib/subscription";
import { useToast } from "@/hooks/use-toast";

type PaymentTab = "usdt_trc20" | "usdt_bep20" | "btc" | "paypal" | "bank";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SubscriptionTier;
  yearly: boolean;
  onActivate: () => void;
}

export function PaymentModal({ open, onOpenChange, plan, yearly, onActivate }: PaymentModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<PaymentTab>("usdt_trc20");
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState<"payment" | "confirm">("payment");

  const pay = loadPaymentSettings();
  const price = yearly ? TIER_PRICES[plan].yearly : TIER_PRICES[plan].monthly;
  const label = TIER_LABELS[plan];

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
    toast({ description: "Copied to clipboard" });
  }

  const TABS: { id: PaymentTab; icon: React.ReactNode; label: string }[] = [
    { id: "usdt_trc20", icon: <span className="text-emerald-400 font-bold text-[10px]">USDT</span>, label: "USDT TRC20" },
    { id: "usdt_bep20", icon: <span className="text-yellow-400 font-bold text-[10px]">USDT</span>, label: "USDT BEP20" },
    { id: "btc", icon: <Bitcoin className="w-3.5 h-3.5 text-orange-400" />, label: "Bitcoin" },
    { id: "paypal", icon: <CreditCard className="w-3.5 h-3.5 text-blue-400" />, label: "PayPal" },
    { id: "bank", icon: <Building2 className="w-3.5 h-3.5 text-purple-400" />, label: "Bank" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-[#0d0d0d] border border-[#1f1f1f] w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === "payment" ? (
              <span>Complete Payment — <span className="text-primary">{label} Plan</span></span>
            ) : (
              <span className="text-emerald-400">Payment Submitted</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === "payment" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
              <div>
                <div className="font-bold text-primary">{label}</div>
                <div className="text-[12px] text-muted-foreground">{yearly ? "Yearly billing" : "Monthly billing"}</div>
              </div>
              <div className="text-2xl font-black font-mono">${price}<span className="text-sm text-muted-foreground font-sans">/mo</span></div>
            </div>

            <div className="flex gap-1 p-1 bg-background rounded-xl border border-border">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    tab === t.id ? "bg-card border border-border shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:block">{t.label}</span>
                </button>
              ))}
            </div>

            {(tab === "usdt_trc20" || tab === "usdt_bep20") && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    {tab === "usdt_trc20" ? "TRON (TRC20)" : "BNB Smart Chain (BEP20)"}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono text-emerald-400 break-all bg-accent/30 px-2 py-1.5 rounded">
                      {tab === "usdt_trc20" ? pay.usdt_trc20 : pay.usdt_bep20}
                    </code>
                    <button
                      onClick={() => copy(tab === "usdt_trc20" ? pay.usdt_trc20 : pay.usdt_bep20, tab)}
                      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                    >
                      {copied === tab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 p-2 rounded-lg">
                    Send exactly <strong className="text-amber-400">${price} USDT</strong> on the{" "}
                    <strong>{tab === "usdt_trc20" ? "TRON TRC20" : "BEP20"}</strong> network only.
                  </div>
                </div>
              </div>
            )}

            {tab === "btc" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Bitcoin Network</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono text-orange-400 break-all bg-accent/30 px-2 py-1.5 rounded">
                      {pay.btc}
                    </code>
                    <button
                      onClick={() => copy(pay.btc, "btc")}
                      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                    >
                      {copied === "btc" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 p-2 rounded-lg">
                    Send BTC equivalent to <strong className="text-amber-400">${price} USD</strong> at current rate.
                  </div>
                </div>
              </div>
            )}

            {tab === "paypal" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">PayPal</div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-[13px] font-mono text-blue-400">{pay.paypal_handle}</span>
                    <button
                      onClick={() => copy(pay.paypal_handle, "paypal")}
                      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      {copied === "paypal" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <a
                      href={pay.paypal_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[12px] font-semibold hover:bg-blue-500/30 transition-colors"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 p-2 rounded-lg">
                    Send <strong className="text-amber-400">${price} USD</strong> via PayPal Friends &amp; Family.
                    Include your plan name in the note: <strong>{label}</strong>
                  </div>
                </div>
              </div>
            )}

            {tab === "bank" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Bank Transfer</div>
                  {[
                    { label: "Bank", value: pay.bank_name },
                    { label: "Account Name", value: pay.bank_account_name },
                    { label: "IBAN", value: pay.bank_iban },
                    { label: "SWIFT / BIC", value: pay.bank_swift },
                  ].map(({ label: lbl, value }) => (
                    <div key={lbl} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground w-28 shrink-0">{lbl}</span>
                      <code className="flex-1 text-[11px] font-mono text-purple-400 break-all bg-accent/30 px-2 py-1 rounded">{value}</code>
                      <button
                        onClick={() => copy(value, lbl)}
                        className="p-1.5 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                      >
                        {copied === lbl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                      </button>
                    </div>
                  ))}
                  <div className="text-[11px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 p-2 rounded-lg">
                    Transfer <strong className="text-amber-400">${price} USD</strong>. Include "<strong>{label} Plan</strong>" in transfer notes.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep("confirm")}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> I have completed the payment
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-lg">Payment Submitted</div>
              <div className="text-sm text-muted-foreground mt-1">
                Your activation will be processed within 1–24 hours after payment confirmation.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border space-y-3 text-left">
              <div className="text-[12px] font-bold text-foreground">Next steps:</div>
              <div className="space-y-2 text-[12px] text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Send payment proof (screenshot) to our Telegram support.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Include your plan: <strong className="text-foreground">{label}</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>You will receive an activation code within 1–24 hours.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Enter the code in the "Activate Plan" field in settings.</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={pay.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold text-sm hover:bg-blue-500/30 transition-colors"
              >
                <Send className="w-4 h-4" /> Telegram Support
              </a>
              <a
                href={`mailto:${pay.email}?subject=${encodeURIComponent(`${label} Plan Payment`)}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Email Support
              </a>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Have a code already?{" "}
              <button
                onClick={() => { onOpenChange(false); onActivate(); }}
                className="text-primary hover:underline"
              >
                Enter activation code
              </button>
            </div>

            <button
              onClick={() => { setStep("payment"); onOpenChange(false); }}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </DialogContentTop>
    </Dialog>
  );
}
