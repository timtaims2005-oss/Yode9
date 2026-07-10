// OSINT data formatters

export const formatters = {
  bytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  },

  riskBadge(level: 'critical' | 'high' | 'medium' | 'low'): string {
    const map = { critical: '🔴 CRITICAL', high: '🟠 HIGH', medium: '🟡 MEDIUM', low: '🟢 LOW' };
    return map[level] || '⚪ UNKNOWN';
  },

  score(score: number): string {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  },

  maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const masked = user.length > 3
      ? user.substring(0, 2) + '***' + user.substring(user.length - 1)
      : '***';
    return `${masked}@${domain}`;
  },

  maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.*${parts[3].slice(-1)}`;
    }
    return ip.substring(0, 8) + '***';
  },

  truncateHash(hash: string, chars = 8): string {
    if (hash.length <= chars * 2) return hash;
    return `${hash.substring(0, chars)}...${hash.substring(hash.length - chars)}`;
  },

  cvssColor(score: number): string {
    if (score >= 9) return '#e21227';
    if (score >= 7) return '#f97316';
    if (score >= 4) return '#eab308';
    return '#22c55e';
  },

  relativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  },

  formatJSON(obj: any, indent = 2): string {
    try { return JSON.stringify(obj, null, indent); }
    catch { return String(obj); }
  },

  toCSV(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => {
        const val = String(row[h] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(','));
    }
    return lines.join('\n');
  },

  toIOCFormat(iocs: Array<{ type: string; value: string }>): string {
    return iocs.map(i => `[${i.type.toUpperCase()}] ${i.value}`).join('\n');
  },

  asnFormat(asn: string | number): string {
    const n = String(asn).replace(/^AS/i, '');
    return `AS${n}`;
  }
};

export default formatters;
