/**
 * XSS Sanitization utilities
 * Prevents cross-site scripting attacks in user input
 */

/**
 * Sanitize HTML string to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/href\s*=\s*["'](?:javascript|data):[^"']*["']/gi, '');
  sanitized = sanitized.replace(/src\s*=\s*["'](?:javascript|data):[^"']*["']/gi, '');
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|applet|form|input|button|textarea|select)\b[^>]*>.*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(iframe|object|embed|applet|form|input|button|textarea|select)\b[^>]*\/?>/gi, '');
  
  // Remove style tags with expressions
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove base and meta tags that can redirect
  sanitized = sanitized.replace(/<(base|meta)\b[^>]*>/gi, '');
  
  // Remove eval() and similar
  sanitized = sanitized.replace(/\beval\s*\(/g, '');
  sanitized = sanitized.replace(/\bFunction\s*\(/g, '');
  sanitized = sanitized.replace(/\bsetTimeout\s*\(\s*["']/g, '');
  sanitized = sanitized.replace(/\bsetInterval\s*\(\s*["']/g, '');
  
  // Remove document.write
  sanitized = sanitized.replace(/\bdocument\.write\s*\(/g, '');
  
  return sanitized;
}

/**
 * Sanitize text input (no HTML allowed)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
}

/**
 * Sanitize URL to prevent XSS via URLs
 */
export function sanitizeURL(url: string): string {
  // Allow only http, https, mailto, tel
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const parsedURL = new URL(url);
    if (!allowedProtocols.includes(parsedURL.protocol)) {
      return '';
    }
    
    // Remove javascript: and data: from the URL
    if (/^(?:javascript|data|vbscript):/i.test(url)) {
      return '';
    }
    
    return url;
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitize object keys and values recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeText(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * React hook to safely render HTML content
 */
export function useSafeHTML(html: string): { __html: string } {
  return { __html: sanitizeHTML(html) };
}

/**
 * Middleware for Express to sanitize request body
 */
export function sanitizeRequestBody(req: any, res: any, next: () => void) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}
