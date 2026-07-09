// OSINT input validators
export const validators = {
  isEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  },
  isIPv4(val: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(val.trim()) &&
      val.split('.').every(o => parseInt(o) <= 255);
  },
  isIPv6(val: string): boolean {
    return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(val.trim());
  },
  isIP(val: string): boolean {
    return validators.isIPv4(val) || validators.isIPv6(val);
  },
  isDomain(val: string): boolean {
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(val.trim());
  },
  isBitcoinAddress(val: string): boolean {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(val.trim()) ||
      /^bc1[a-z0-9]{39,59}$/.test(val.trim());
  },
  isEthereumAddress(val: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(val.trim());
  },
  isHash(val: string): 'md5' | 'sha1' | 'sha256' | 'sha512' | null {
    const len = val.trim().length;
    if (len === 32 && /^[0-9a-fA-F]+$/.test(val)) return 'md5';
    if (len === 40 && /^[0-9a-fA-F]+$/.test(val)) return 'sha1';
    if (len === 64 && /^[0-9a-fA-F]+$/.test(val)) return 'sha256';
    if (len === 128 && /^[0-9a-fA-F]+$/.test(val)) return 'sha512';
    return null;
  },
  isOnionAddress(val: string): boolean {
    return /^[a-z2-7]{16,56}\.onion$/i.test(val.trim());
  },
  isCVE(val: string): boolean {
    return /^CVE-\d{4}-\d{4,}$/i.test(val.trim());
  },
  isURL(val: string): boolean {
    try { new URL(val); return true; } catch { return false; }
  },
  detectType(val: string): string {
    const trimmed = val.trim();
    if (validators.isEmail(trimmed)) return 'email';
    if (validators.isIPv4(trimmed)) return 'ipv4';
    if (validators.isIPv6(trimmed)) return 'ipv6';
    if (validators.isBitcoinAddress(trimmed)) return 'bitcoin';
    if (validators.isEthereumAddress(trimmed)) return 'ethereum';
    if (validators.isHash(trimmed)) return validators.isHash(trimmed) + '_hash';
    if (validators.isOnionAddress(trimmed)) return 'onion';
    if (validators.isCVE(trimmed)) return 'cve';
    if (validators.isDomain(trimmed)) return 'domain';
    if (validators.isURL(trimmed)) return 'url';
    return 'keyword';
  },
  sanitize(val: string, maxLength = 500): string {
    return val.replace(/[<>"'&]/g, '').replace(/\0/g, '').substring(0, maxLength).trim();
  }
};

export default validators;
