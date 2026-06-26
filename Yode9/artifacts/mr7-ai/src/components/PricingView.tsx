import { useState, useEffect, useCallback } from "react";
import { X, Check, Zap, Crown, Lock, Shield, ChevronDown, ChevronUp, Terminal, Globe, Code2, Skull, Eye, Star, Users, RefreshCw, Copy, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PaymentModal } from "./modals/PaymentModal";
import { ActivateModal } from "./modals/ActivateModal";
import { useStore } from "@/lib/store";
import { type SubscriptionTier, TIER_LABELS, TIER_TOKENS, TIER_PRICES, PLAN_FEATURES, tierAtLeast } from "@/lib/subscription";

const SOCIAL_PROOF = [
  { name: "Ahmed K.", country: "UAE", plan: "Elite", time: "2 min ago" },
  { name: "Yuki T.", country: "Japan", plan: "Elite", time: "8 min ago" },
  { name: "Carlos R.", country: "Brazil", plan: "Professional", time: "14 min ago" },
  { name: "Sara M.", country: "Saudi Arabia", plan: "Starter", time: "21 min ago" },
  { name: "David L.", country: "USA", plan: "Professional", time: "35 min ago" },
  { name: "Omar F.", country: "Egypt", plan: "Elite", time: "47 min ago" },
  { name: "Ana P.", country: "Spain", plan: "Starter", time: "1h ago" },
  { name: "Hassan A.", country: "Morocco", plan: "Professional", time: "1h ago" },
];

const FEATURE_CARDS = [
  {
    id: "agent-ide",
    tier: "professional" as SubscriptionTier,
    badge: "NEW",
    badgeColor: "bg-primary/20 text-primary border-primary/30",
    icon: <Code2 className="w-5 h-5 text-primary" />,
    iconBg: "bg-primary/10 border-primary/20",
    title: "0Day Coder Agent IDE",
    desc: "AI-powered development environment. Generate complete security tools, exploits, and scripts with natural language.",
    features: ["Smart Code Generation", "AI Debug & Fix", "Security Review", "Code Obfuscation"],
  },
  {
    id: "shell-gen",
    tier: "professional" as SubscriptionTier,
    badge: "NEW",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: <Terminal className="w-5 h-5 text-emerald-400" />,
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    title: "Shell Payload Generator",
    desc: "AI-powered shellcode and payload generation. Create reverse shells, bind shells, droppers, and more with advanced evasion techniques.",
    features: ["10+ Languages", "Advanced Evasion", "Multiple Encodings", "Cross-Platform"],
  },
  {
    id: "darkweb",
    tier: "professional" as SubscriptionTier,
    badge: "PRO",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    icon: <Globe className="w-5 h-5 text-violet-400" />,
    iconBg: "bg-violet-500/10 border-violet-500/20",
    title: "Dark Web Intelligence Search",
    desc: "Search leaked databases, breach data, and hidden services safely. Perfect for OSINT and threat intelligence.",
    features: ["Breach Data Search", ".onion Site Access", "No Tor Required", "AI Result Analysis"],
  },
  {
    id: "osint",
    tier: "starter" as SubscriptionTier,
    badge: "PRO",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: <Eye className="w-5 h-5 text-cyan-400" />,
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    title: "OSINT Intelligence Dashboard",
    desc: "Multi-source open-source intelligence gathering. Analyze IPs, domains, emails, and social profiles.",
    features: ["IP & Domain Intel", "Social OSINT", "Threat IOC Extraction", "Export Reports"],
  },
  {
    id: "council",
    tier: "professional" as SubscriptionTier,
    badge: "ELITE",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: <BarChart3 className="w-5 h-5 text-amber-400" />,
    iconBg: "bg-amber-500/10 border-amber-500/20",
    title: "105-Brain AI Council",
    desc: "Run your query through 105 specialized AI models simultaneously. Fusion synthesis picks the best combined answer.",
    features: ["105 AI Models", "Parallel Processing", "Fusion Scoring", "Deep Synthesis"],
  },
  {
    id: "malware",
    tier: "elite" as SubscriptionTier,
    badge: "ELITE",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <Skull className="w-5 h-5 text-red-400" />,
    iconBg: "bg-red-500/10 border-red-500/20",
    title: "Malware Arsenal Builder",
    desc: "Build educational malware samples for research and red team training. Ransomware, RATs, stealers, and more.",
    features: ["10 Payload Types", "Anti-Detection", "Multi-Platform", "Obfuscation Engine"],
  },
];

const PERSONAS = [
  { color: "text-primary", bg: "bg-primary/10 border-primary/20", icon: <Zap className="w-4 h-4 text-primary" />, name: "KaliGPT v6 Fast", tagline: '"Quick answers for security pros"', desc: "Quick Security Assistant — Fast pentesting queries" },
  { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: <BarChart3 className="w-4 h-4 text-red-400" />, name: "KaliGPT Thinking v7", tagline: '"Think like an attacker"', desc: "Red Team Operator — Deep reasoning & pentesting" },
  { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: <Code2 className="w-4 h-4 text-blue-400" />, name: "0Day Coder", tagline: '"Where vulnerabilities meet code"', desc: "Exploit Engineer — PoC & security automation" },
  { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: <Skull className="w-4 h-4 text-violet-400" />, name: "DarkGPT v3", tagline: '"Think beyond the rules"', desc: "Adversarial Strategist — Red team tradecraft" },
  { color: "text-muted-foreground", bg: "bg-accent/40 border-border", icon: <Shield className="w-4 h-4 text-muted-foreground" />, name: "Onion GPT", tagline: '"Privacy first. Trace nothing"', desc: "OPSEC Specialist — Anonymity & threat modeling" },
];

interface PricingViewProps {
  onClose: () => void;
}

type PolicyType = "refund" | "terms" | "aup" | null;

const POLICY_CONTENT: Record<NonNullable<PolicyType>, { title: string; body: string }> = {
  refund: {
    title: "7-Day Refund Policy",
    body: `We offer a full 7-day money-back guarantee on all plans. If you are not satisfied within 7 days of your purchase, contact us via Telegram or email with your payment proof and we will issue a full refund — no questions asked.\n\nRefunds are processed within 1-3 business days back to your original payment method. After the 7-day window, purchases are final and non-refundable. Token usage beyond the free tier during the refund period does not affect eligibility.`,
  },
  terms: {
    title: "Terms of Service",
    body: `By subscribing to mr7.ai / KaliGPT, you agree to use the platform exclusively for lawful security research, penetration testing, and educational purposes. You must have explicit written permission before testing any system you do not own.\n\nProhibited uses include: attacking production systems without authorization, generating malware for deployment, illegal data exfiltration, and any activity that violates local or international law. Violations result in immediate account termination without refund. We reserve the right to update these terms with 7-day notice.`,
  },
  aup: {
    title: "Acceptable Use Policy",
    body: `KaliGPT tools are designed for authorized security professionals. You agree to:\n\n1. Only test systems you own or have written authorization to test.\n2. Not use generated payloads, shells, or exploits against unauthorized targets.\n3. Handle all discovered vulnerabilities responsibly (responsible disclosure).\n4. Not share, resell, or redistribute platform-generated content for malicious purposes.\n5. Comply with all applicable laws including CFAA, Computer Misuse Act, and equivalents in your jurisdiction.\n\nViolation of this policy results in immediate suspension.`,
  },
};

export function PricingView({ onClose }: PricingViewProps) {
  const { state } = useStore();
  const [yearly, setYearly] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<SubscriptionTier | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [socialIdx, setSocialIdx] = useState(0);
  const [showSocial, setShowSocial] = useState(true);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [couponExpanded, setCouponExpanded] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [highScalePlan, setHighScalePlan] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyType>(null);

  const currentTier = state.subscription.tier;

  useEffect(() => {
    const SALE_KEY = "chatgpt_flash_sale_start";
    let start = parseInt(localStorage.getItem(SALE_KEY) ?? "0", 10);
    if (!start || Date.now() - start > 86_400_000) {
      start = Date.now();
      localStorage.setItem(SALE_KEY, String(start));
    }
    function tick() {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 86_400_000 - elapsed);
      const h = Math.floor(remaining / 3_600_000);
      const m = Math.floor((remaining % 3_600_000) / 60_000);
      const s = Math.floor((remaining % 60_000) / 1000);
      setCountdown({ h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let idx = 0;
    const id = setInterval(() => {
      setShowSocial(false);
      setTimeout(() => {
        idx = (idx + 1) % SOCIAL_PROOF.length;
        setSocialIdx(idx);
        setShowSocial(true);
      }, 400);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  const PLANS: { tier: SubscriptionTier; popular?: boolean; color: string; borderColor: string; btnClass: string }[] = [
    { tier: "starter", color: "text-foreground", borderColor: "border-border", btnClass: "border border-border hover:bg-accent text-foreground" },
    { tier: "professional", popular: true, color: "text-primary", borderColor: "border-primary", btnClass: "bg-primary text-white hover:opacity-90" },
    { tier: "elite", color: "text-amber-400", borderColor: "border-amber-500/40", btnClass: "border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full relative">
        <button
          onClick={onClose}
          className="fixed right-4 top-4 z-50 p-2 text-muted-foreground hover:text-foreground bg-card/80 backdrop-blur rounded-full border border-border transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 pb-24">

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary fill-current" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-primary">Flash Sale Ending Soon!</div>
              <div className="text-[12px] text-muted-foreground">Save 20% on all plans today</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {[{ label: "HOURS", val: countdown.h }, { label: "MIN", val: countdown.m }, { label: "SEC", val: countdown.s }].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center font-black text-lg font-mono text-primary">
                    {pad(t.val)}
                  </div>
                  <div className="text-[7px] text-muted-foreground mt-0.5 font-bold tracking-wider">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-3xl font-black">Choose Your Plan</h1>
            <p className="text-muted-foreground text-sm">Pay only for the tokens you need. Upgrade anytime. All plans include access to our 5 specialized AI models.</p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-semibold ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <button
                onClick={() => setYearly((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-accent border border-border"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${yearly ? "left-6" : "left-0.5"}`} />
              </button>
              <span className={`text-sm font-semibold ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly <span className="text-emerald-400 text-[11px] font-bold">SAVE 20%</span>
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {PLANS.map(({ tier, popular, borderColor, btnClass }) => {
              const price = yearly ? TIER_PRICES[tier].yearly : TIER_PRICES[tier].monthly;
              const isActive = currentTier === tier;
              const isUpgrade = !tierAtLeast(currentTier, tier);
              const features = PLAN_FEATURES[tier];
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative rounded-2xl border-2 ${borderColor} bg-card p-6 ${popular ? "shadow-[0_0_30px_rgba(226,18,39,0.12)]" : ""}`}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider">
                      <Zap className="w-2.5 h-2.5 fill-current" /> RECOMMENDED
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> ACTIVE
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">{TIER_LABELS[tier]}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-black font-mono">${price}</span>
                        <span className="text-muted-foreground text-sm">USD / month</span>
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {(TIER_TOKENS[tier] / 1_000).toFixed(0)}K tokens / month
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!isActive && isUpgrade && acceptedTerms) setPaymentPlan(tier);
                      }}
                      disabled={!isActive && isUpgrade && !acceptedTerms}
                      title={!acceptedTerms && isUpgrade ? "Accept the terms below to continue" : undefined}
                      className={`shrink-0 px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isActive ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default" : btnClass}`}
                    >
                      {isActive ? (
                        <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Active</span>
                      ) : isUpgrade ? (
                        `Get ${TIER_LABELS[tier]}`
                      ) : (
                        <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Included</span>
                      )}
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setHighScalePlan((v) => !v)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent transition-colors text-sm"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Crown className="w-4 h-4" /> View High-Scale Plans
              </span>
              {highScalePlan ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {highScalePlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    {[
                      { name: "Team", price: yearly ? 240 : 300, tokens: "10M tokens", tag: "Up to 10 seats" },
                      { name: "Enterprise", price: yearly ? 640 : 800, tokens: "Unlimited", tag: "Custom deployment" },
                    ].map((p) => (
                      <div key={p.name} className="p-4 rounded-xl border border-border bg-card/50 space-y-2">
                        <div className="font-bold">{p.name}</div>
                        <div className="text-2xl font-black font-mono">${p.price}<span className="text-sm text-muted-foreground font-sans">/mo</span></div>
                        <div className="text-[12px] text-muted-foreground">{p.tokens} · {p.tag}</div>
                        <button
                          onClick={() => {
                            window.open("https://t.me/KaliGPT_Support", "_blank");
                          }}
                          className="w-full py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors"
                        >
                          Contact Sales
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setCouponExpanded((v) => !v)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent transition-colors text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2"><Copy className="w-4 h-4" /> Have a coupon code?</span>
              {couponExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {couponExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-1">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Enter activation code"
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary font-mono"
                    />
                    <button
                      onClick={() => { setActivateOpen(true); setCouponExpanded(false); }}
                      className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <h2 className="text-xl font-black text-center mb-4">5 Specialized AI Personas Included</h2>
            <p className="text-center text-sm text-muted-foreground mb-4">All paid plans include access to every model</p>
            <div className="space-y-3">
              {PERSONAS.map((p) => (
                <div key={p.name} className={`flex items-start gap-3 p-4 rounded-xl border ${p.bg}`}>
                  <div className={`w-9 h-9 rounded-xl border ${p.bg} flex items-center justify-center shrink-0`}>
                    {p.icon}
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${p.color}`}>{p.name}</div>
                    <div className="text-[11px] text-muted-foreground italic">{p.tagline}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground text-center font-medium">Plus All These Features</div>
            <div className="mt-3 space-y-2">
              {["Unlimited AI Chat", "File & Document Upload (OCR)", "Agent IDE — Cursor-style Editing", "Dark Web Intelligence Search", "Shell Payload Generator", "Code Generation & Analysis", "7-Day Refund Window"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black text-center">Featured Tools</h2>
            <div className="space-y-3">
              {FEATURE_CARDS.map((card) => (
                <div key={card.id} className="relative rounded-2xl border border-border bg-card p-5">
                  <div className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded border ${card.badgeColor}`}>
                    {card.badge}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl border ${card.iconBg} flex items-center justify-center shrink-0`}>
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{card.title}</div>
                      <div className="text-[12px] text-muted-foreground mt-1">{card.desc}</div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                        {card.features.map((f) => (
                          <div key={f} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" /> {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!tierAtLeast(currentTier, card.tier) && (
                    <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                        <Lock className="w-3 h-3" /> {TIER_LABELS[card.tier]} required
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              <span className="font-bold text-sm">Trustpilot</span>
              <a href="https://trustpilot.com" target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline ml-auto">
                Check our reviews on Trustpilot
              </a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold">
                <Shield className="w-4 h-4" /> 7-Day Refund Window
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-muted-foreground">
                <Users className="w-4 h-4" /> Join 10,000+ security professionals
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card/40 text-[11px] text-muted-foreground leading-relaxed">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded cursor-pointer"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I have read and agree to the{" "}
                <button onClick={() => setPolicyModal("refund")} className="text-primary hover:underline font-semibold">Refund Policy</button>,{" "}
                <button onClick={() => setPolicyModal("terms")} className="text-primary hover:underline font-semibold">Terms of Service</button>, and{" "}
                <button onClick={() => setPolicyModal("aup")} className="text-primary hover:underline font-semibold">Acceptable Use Policy</button>.
                I understand that all purchases are final and non-refundable by default.
              </span>
            </label>
          </div>

          {/* Policy Modal */}
          <AnimatePresence>
            {policyModal && (
              <motion.div
                className="fixed inset-0 z-[300] flex items-center justify-center p-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPolicyModal(null)} />
                <motion.div
                  className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 z-10 max-h-[80vh] overflow-y-auto"
                  initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-foreground">{POLICY_CONTENT[policyModal].title}</h3>
                    <button onClick={() => setPolicyModal(null)} className="p-1 rounded-lg hover:bg-accent transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-line">
                    {POLICY_CONTENT[policyModal].body}
                  </div>
                  <button
                    onClick={() => { setAcceptedTerms(true); setPolicyModal(null); }}
                    className="mt-5 w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    I Agree
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showSocial && (
            <motion.div
              key={socialIdx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed bottom-20 left-4 z-50 flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2 shadow-xl max-w-[220px]"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-primary fill-current" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{SOCIAL_PROOF[socialIdx].name} subscribed to <span className="text-primary">{SOCIAL_PROOF[socialIdx].plan}</span></div>
                <div className="text-[10px] text-muted-foreground">{SOCIAL_PROOF[socialIdx].country} · {SOCIAL_PROOF[socialIdx].time}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 10,000 Free Tokens</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivateOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-[12px] font-semibold hover:bg-accent transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Activate Code
              </button>
              <button
                onClick={() => document.querySelector(".max-w-3xl")?.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      </div>

      {paymentPlan && (
        <PaymentModal
          open={!!paymentPlan}
          onOpenChange={(v) => { if (!v) setPaymentPlan(null); }}
          plan={paymentPlan}
          yearly={yearly}
          onActivate={() => { setPaymentPlan(null); setActivateOpen(true); }}
        />
      )}

      <ActivateModal open={activateOpen} onOpenChange={setActivateOpen} />
    </div>
  );
}
