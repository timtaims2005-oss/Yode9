/**
 * Returns the absolute base URL for the API server.
 * Reads EXPO_PUBLIC_DOMAIN injected at build time.
 */
export function useBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  // Fall back to dev domain for local testing
  return 'http://localhost:8080';
}
