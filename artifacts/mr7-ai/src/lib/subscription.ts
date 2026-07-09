export type SubscriptionTier = "free" | "starter" | "professional" | "elite";

export type Subscription = {
  tier: SubscriptionTier;
  activatedAt: number | null;
  expiresAt: number | null;
  tokensUsed: number;
  activationCode: string | null;
};

export const TIER_TOKENS: Record<SubscriptionTier, number> = {
  free: 10_000,
  starter: 300_000,
  professional: 1_500_000,
  elite: 3_000_000,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  elite: "Elite",
};

export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 25, yearly: 20 },
  professional: { monthly: 90, yearly: 72 },
  elite: { monthly: 150, yearly: 120 },
};

export const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  elite: 3,
};

// ── Server-side verified subscription state ───────────────────────────────────
// The actual tier check happens on the server.
// On the client we cache the latest verified state and fall back to "free".

let _cachedSubscription: Subscription | null = null;

/**
 * Fetch subscription status from the server.
 * No secrets on the client — server handles all verification.
 */
export async function fetchSubscriptionStatus(deviceId: string): Promise<Subscription> {
  try {
    const res = await fetch(`/api/subscriptions/status?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: { "X-Internal-Key": getInternalKey() },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      tier: SubscriptionTier;
      activatedAt: number | null;
      expiresAt: number | null;
      tokensUsed: number;
      active: boolean;
    };
    const sub: Subscription = {
      tier: data.tier,
      activatedAt: data.activatedAt,
      expiresAt: data.expiresAt,
      tokensUsed: data.tokensUsed,
      activationCode: null,
    };
    _cachedSubscription = sub;
    persistSubscriptionState(sub, deviceId);
    return sub;
  } catch {
    return loadCachedSubscription();
  }
}

/**
 * Verify an activation code via the server.
 * The ADMIN_SECRET never leaves the server.
 */
export async function verifyActivationCodeServer(
  code: string,
  deviceId: string,
): Promise<{ ok: boolean; tier?: SubscriptionTier; expiresAt?: number; error?: string }> {
  try {
    const res = await fetch("/api/subscriptions/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": getInternalKey(),
      },
      body: JSON.stringify({ code, deviceId }),
    });
    const data = await res.json() as {
      ok: boolean;
      tier?: SubscriptionTier;
      expiresAt?: number;
      error?: string;
    };
    if (data.ok && data.tier && data.expiresAt) {
      const sub: Subscription = {
        tier: data.tier,
        activatedAt: Date.now(),
        expiresAt: data.expiresAt,
        tokensUsed: 0,
        activationCode: code,
      };
      _cachedSubscription = sub;
      persistSubscriptionState(sub, deviceId);
    }
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Backward compatibility alias for verifyActivationCodeServer.
 * @deprecated Use verifyActivationCodeServer instead
 */
export const verifyActivationCode = verifyActivationCodeServer;

/**
 * Verify admin password via the server.
 * Server-side only - never exposes the ADMIN_SECRET to the client.
 */
export async function verifyAdminPassword(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/subscriptions/verify-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": getInternalKey(),
      },
      body: JSON.stringify({ password }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Generate an activation code via the server (admin only).
 * Server-side only - requires admin authentication.
 */
export async function generateActivationCode(
  adminPassword: string,
  tier: SubscriptionTier,
  days: number,
): Promise<{ ok: boolean; code?: string; error?: string }> {
  try {
    const res = await fetch("/api/subscriptions/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": getInternalKey(),
      },
      body: JSON.stringify({ adminPassword, tier, days }),
    });
    const data = await res.json() as { ok: boolean; code?: string; error?: string };
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Client-side tier check. Uses the cached server-verified tier.
 * Falls back to "free" if no valid subscription is cached.
 */
export function tierAtLeast(current: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[required];
}

/**
 * Check if a subscription has expired.
 * Returns updated subscription or null if still valid.
 */
export function checkAndExpireSubscription(sub: Subscription): Subscription | null {
  if (sub.expiresAt && Date.now() > sub.expiresAt) {
    return { ...sub, tier: "free", expiresAt: null };
  }
  return null;
}

/**
 * Get the initial subscription state — starts as "free" until server verifies.
 */
export const INITIAL_SUBSCRIPTION: Subscription = {
  tier: "free",
  activatedAt: null,
  expiresAt: null,
  tokensUsed: 0,
  activationCode: null,
};

export const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    "10,000 tokens / month",
    "CHAT-GPT Fast model",
    "Basic AI chat",
    "5 messages context",
  ],
  starter: [
    "300K tokens / month",
    "All 5 AI models",
    "Max 8K tokens per request",
    "Up to 5 agent loops",
    "3 files per session",
    "Standard processing speed",
    "AI Chat & Code Generation",
    "AI Image Generator",
    "File & Document Upload (OCR)",
    "7-Day Refund Window",
  ],
  professional: [
    "1.5M tokens / month",
    "All 5 AI models",
    "Max 32K tokens per request",
    "Up to 15 agent loops",
    "15 files per session",
    "Faster processing speed",
    "Agent IDE — Cursor-style Editing",
    "Dark Web Intelligence Search",
    "Shell Security Code Generator",
    "AI Image Generator (Unrestricted)",
    "Priority support",
    "7-Day Refund Window",
  ],
  elite: [
    "3M tokens / month",
    "All 5 AI models",
    "Unlimited practical context",
    "Deep reasoning enabled",
    "Unlimited agent loops",
    "Priority queue processing",
    "Agent IDE with Cursor-style editing",
    "Dark Web Intelligence Search",
    "Shell Security Code Generator",
    "AI Image Generator (Unrestricted)",
    "Advanced code obfuscation",
    "7-Day Refund Window",
  ],
};

// ── Payment settings (unchanged — UI config only) ─────────────────────────────

export type PaymentSettings = {
  usdt_trc20: string;
  usdt_bep20: string;
  btc: string;
  paypal_handle: string;
  paypal_link: string;
  bank_iban: string;
  bank_swift: string;
  bank_name: string;
  bank_account_name: string;
  telegram: string;
  email: string;
};

const PAYMENT_SETTINGS_KEY = "mr7-payment-settings";
const SUBSCRIPTION_STATE_KEY = "mr7-subscription-state-v3";

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  usdt_trc20: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
  usdt_bep20: "0x742d35Cc6634C0532925a3b8D4C9C3e6F1A7B8D2",
  btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  paypal_handle: "@mr7ai",
  paypal_link: "https://paypal.me/mr7ai",
  bank_iban: "SA03 8000 0000 6080 1016 7519",
  bank_swift: "RJHISARI",
  bank_name: "Al Rajhi Bank",
  bank_account_name: "CHAT-GPT AI",
  telegram: "https://t.me/KaliGPT_Support",
  email: "support@kaligpt.ai",
};

export function loadPaymentSettings(): PaymentSettings {
  try {
    const raw = localStorage.getItem(PAYMENT_SETTINGS_KEY);
    return raw ? { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_PAYMENT_SETTINGS };
  } catch {
    return { ...DEFAULT_PAYMENT_SETTINGS };
  }
}

export function savePaymentSettings(settings: PaymentSettings): void {
  localStorage.setItem(PAYMENT_SETTINGS_KEY, JSON.stringify(settings));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function getInternalKey(): string {
  // In dev, the frontend proxy passes this header to the backend.
  // In production, the frontend is served from the same origin so no header needed.
  return (import.meta as any).env?.VITE_INTERNAL_KEY ?? "";
}

function persistSubscriptionState(sub: Subscription, deviceId: string): void {
  try {
    localStorage.setItem(
      SUBSCRIPTION_STATE_KEY,
      JSON.stringify({ sub, deviceId, savedAt: Date.now() }),
    );
  } catch { /* storage full or unavailable */ }
}

function loadCachedSubscription(): Subscription {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STATE_KEY);
    if (!raw) return INITIAL_SUBSCRIPTION;
    const data = JSON.parse(raw) as { sub: Subscription; savedAt: number };
    // Invalidate if older than 1 hour
    if (Date.now() - data.savedAt > 3600_000) return INITIAL_SUBSCRIPTION;
    // Check expiry
    const expired = checkAndExpireSubscription(data.sub);
    return expired ?? data.sub;
  } catch {
    return INITIAL_SUBSCRIPTION;
  }
}
