/**
 * A/B Testing client — Phase 4
 * Uses deterministic hash on deviceId so variant never changes per device.
 */

const API_BASE = "/api";

export interface ABVariant {
  variant:  string;
  assigned: boolean;
}

const _cache = new Map<string, string>();

export async function getVariant(testName: string, deviceId: string): Promise<string> {
  const key = `${testName}:${deviceId}`;
  if (_cache.has(key)) return _cache.get(key)!;

  try {
    const resp = await fetch(
      `${API_BASE}/ab/variant?testName=${encodeURIComponent(testName)}&deviceId=${encodeURIComponent(deviceId)}`
    );
    if (!resp.ok) throw new Error("AB variant fetch failed");
    const data = await resp.json() as ABVariant;
    _cache.set(key, data.variant);
    return data.variant;
  } catch {
    _cache.set(key, "control");
    return "control";
  }
}

export async function trackEvent(
  testName: string,
  variant:  string,
  event:    string,
  deviceId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await fetch(`${API_BASE}/ab/event`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ testName, variant, event, deviceId, metadata }),
    });
  } catch {
    // Non-critical — silent failure
  }
}

export function useABTest(testName: string, deviceId: string) {
  return {
    track: (event: string, metadata?: Record<string, unknown>) =>
      trackEvent(testName, "control", event, deviceId, metadata),
    getVariant: () => getVariant(testName, deviceId),
  };
}
