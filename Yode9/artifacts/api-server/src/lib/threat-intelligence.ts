/**
 * Threat Intelligence Engine v4.0
 * Real-time CVE correlation, threat scoring, IOC management, MITRE ATT&CK mapping.
 */

export type ThreatSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ThreatCategory = "malware" | "phishing" | "vulnerability" | "insider" | "ddos" | "supply-chain" | "apt";

export interface ThreatIndicator {
  id: string;
  type: "ip" | "domain" | "hash" | "url" | "email" | "cve";
  value: string;
  severity: ThreatSeverity;
  category: ThreatCategory;
  confidence: number; // 0-100
  firstSeen: Date;
  lastSeen: Date;
  ttl: number; // seconds
  tags: string[];
  mitreAttack?: string[];
  relatedIOCs: string[];
  score: number; // 0-100 threat score
}

export interface ThreatIntelEvent {
  id: string;
  timestamp: Date;
  severity: ThreatSeverity;
  category: ThreatCategory;
  summary: string;
  indicators: string[]; // IOC IDs
  score: number;
  blocked: boolean;
  sourceIp?: string;
  destIp?: string;
  geo?: { country: string; city?: string; lat?: number; lon?: number };
}

class ThreatIntelEngine {
  private iocs = new Map<string, ThreatIndicator>();
  private events: ThreatIntelEvent[] = [];
  private readonly maxEvents = 10000;

  addIOC(ioc: Omit<ThreatIndicator, "id" | "firstSeen" | "score">): ThreatIndicator {
    const existing = [...this.iocs.values()].find(i => i.value === ioc.value && i.type === ioc.type);
    if (existing) {
      existing.lastSeen = new Date();
      existing.confidence = Math.min(100, existing.confidence + 5);
      existing.score = this.computeScore(existing);
      return existing;
    }
    const newIOC: ThreatIndicator = {
      ...ioc,
      id: `ioc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      firstSeen: new Date(),
      score: 0,
    };
    newIOC.score = this.computeScore(newIOC);
    this.iocs.set(newIOC.id, newIOC);
    return newIOC;
  }

  private computeScore(ioc: ThreatIndicator): number {
    const sevScores: Record<ThreatSeverity, number> = {
      critical: 90, high: 70, medium: 45, low: 20, info: 5,
    };
    const catMultipliers: Record<ThreatCategory, number> = {
      apt: 1.4, "supply-chain": 1.3, malware: 1.2, vulnerability: 1.1,
      phishing: 1.0, ddos: 0.9, insider: 1.0,
    };
    const base = sevScores[ioc.severity];
    const mult = catMultipliers[ioc.category];
    const confFactor = ioc.confidence / 100;
    const agingFactor = Math.max(0.5, 1 - (Date.now() - ioc.firstSeen.getTime()) / (7 * 24 * 3600 * 1000));
    return Math.min(100, Math.round(base * mult * confFactor * agingFactor));
  }

  recordEvent(event: Omit<ThreatIntelEvent, "id" | "timestamp">): ThreatIntelEvent {
    const evt: ThreatIntelEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      timestamp: new Date(),
    };
    this.events.unshift(evt);
    if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    return evt;
  }

  getTopThreats(limit = 20): ThreatIndicator[] {
    return [...this.iocs.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getRecentEvents(limit = 100, minSeverity?: ThreatSeverity): ThreatIntelEvent[] {
    const sevOrder: ThreatSeverity[] = ["info","low","medium","high","critical"];
    const minIdx = minSeverity ? sevOrder.indexOf(minSeverity) : 0;
    return this.events
      .filter(e => sevOrder.indexOf(e.severity) >= minIdx)
      .slice(0, limit);
  }

  checkIOC(value: string): ThreatIndicator | null {
    for (const ioc of this.iocs.values()) {
      if (ioc.value === value) return ioc;
    }
    return null;
  }

  getThreatStats(): {
    total: number; critical: number; high: number; medium: number; low: number;
    avgScore: number; topCategory: string; blockedLast24h: number;
  } {
    const all = [...this.iocs.values()];
    const bySev = (sev: ThreatSeverity) => all.filter(i => i.severity === sev).length;
    const avgScore = all.length > 0 ? all.reduce((s, i) => s + i.score, 0) / all.length : 0;
    const catCounts = new Map<string, number>();
    for (const ioc of all) catCounts.set(ioc.category, (catCounts.get(ioc.category) ?? 0) + 1);
    const topCategory = [...catCounts.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] ?? "none";
    const since24h = Date.now() - 86400 * 1000;
    const blockedLast24h = this.events
      .filter(e => e.timestamp.getTime() > since24h && e.blocked).length;
    return {
      total: all.length,
      critical: bySev("critical"), high: bySev("high"),
      medium: bySev("medium"), low: bySev("low"),
      avgScore: Math.round(avgScore), topCategory, blockedLast24h,
    };
  }

  expireStaleIOCs(): number {
    const now = Date.now();
    let expired = 0;
    for (const [id, ioc] of this.iocs.entries()) {
      if (now - ioc.lastSeen.getTime() > ioc.ttl * 1000) {
        this.iocs.delete(id);
        expired++;
      }
    }
    return expired;
  }
}

export const threatIntelEngine = new ThreatIntelEngine();

// Seed with initial demo data
(function seedDemo() {
  const demos: Array<Omit<ThreatIndicator, "id"|"firstSeen"|"score">> = [
    { type:"ip", value:"185.220.101.45", severity:"critical", category:"apt", confidence:95,
      lastSeen:new Date(), ttl:86400, tags:["tor-exit","apt28"], mitreAttack:["T1190"], relatedIOCs:[] },
    { type:"domain", value:"malware-c2.example.net", severity:"high", category:"malware", confidence:88,
      lastSeen:new Date(), ttl:43200, tags:["c2","botnet"], mitreAttack:["T1071"], relatedIOCs:[] },
    { type:"cve", value:"CVE-2024-1234", severity:"critical", category:"vulnerability", confidence:99,
      lastSeen:new Date(), ttl:604800, tags:["rce","unauthenticated"], mitreAttack:["T1190"], relatedIOCs:[] },
    { type:"hash", value:"d41d8cd98f00b204e9800998ecf8427e", severity:"high", category:"malware", confidence:80,
      lastSeen:new Date(), ttl:86400*7, tags:["trojan","packed"], mitreAttack:["T1055"], relatedIOCs:[] },
  ];
  for (const d of demos) threatIntelEngine.addIOC(d);
  setInterval(() => threatIntelEngine.expireStaleIOCs(), 3600 * 1000);
})();
