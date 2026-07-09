import { useEffect, useState } from 'react';

/**
 * CSRF Token management for secure form submissions
 */

let csrfToken: string | null = null;

/**
 * Generate a CSRF token using Web Crypto API
 */
async function generateCSRFToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token
 */
export async function getCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  
  // Try to get from cookie first
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) {
    csrfToken = match[1];
    return csrfToken;
  }
  
  // Generate new token
  csrfToken = await generateCSRFToken();
  
  // Store in cookie
  document.cookie = `XSRF-TOKEN=${csrfToken}; path=/; SameSite=Strict; Secure`;
  
  return csrfToken;
}

/**
 * Validate CSRF token on server requests
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
  if (!storedToken) return false;
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) return false;
  
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  
  return mismatch === 0;
}

/**
 * Hook to automatically include CSRF token in fetch requests
 */
export function useCSRFProtection() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    getCSRFToken().then(setToken);
  }, []);
  
  const fetchWithCSRF = async (url: string, options: RequestInit = {}) => {
    if (!token) await getCSRFToken();
    
    const headers = new Headers(options.headers || {});
    headers.set('X-CSRF-Token', token!);
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  };
  
  return { fetchWithCSRF, csrfToken: token };
}

/**
 * Middleware to validate CSRF tokens on server
 */
export function csrfProtection(req: any, res: any, next: () => void) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const token = req.headers?.get?.('X-CSRF-Token') || req.headers?.['x-csrf-token'];
  if (!token) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  // In production, validate against stored token
  // For now, just check format
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
}
