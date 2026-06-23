import type { SubscriptionTier } from './subscription';

// Server-side verification functions
export const verifyAdminPassword = async (password: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Admin password verification failed:', error);
    return false;
  }
};

export const generateActivationCode = async (
  tier: SubscriptionTier,
  days: number
): Promise<{ ok: boolean; code?: string; error?: string }> => {
  try {
    const response = await fetch('/api/subscriptions/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, days })
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to generate activation code:', error);
    return { ok: false, error: 'Network error' };
  }
};

export { 
  loadPaymentSettings, 
  savePaymentSettings, 
  type PaymentSettings 
} from './subscription';
