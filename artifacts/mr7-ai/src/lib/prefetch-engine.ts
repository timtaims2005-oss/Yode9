import { contextMemory } from "./context-memory";
import { predictiveCache } from "./predictive-cache";

export type PredictionNode = {
  id: string;
  text: string;
  confidence: number;
  category: string;
  prefetched: boolean;
  hit: boolean;
};

export type PrefetchStats = {
  totalPredictions: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  prefetchesQueued: number;
  avgConfidence: number;
};

type ConversationPattern = {
  triggerKeywords: string[];
  followUps: string[];
  category: string;
};

const PATTERNS: ConversationPattern[] = [
  { triggerKeywords: ["scan","nmap","network","port"], category: "Network Recon",
    followUps: ["كيف أفسر نتائج الـ nmap?","ما هي المنافذ المفتوحة الخطيرة عادةً?","كيف أكتشف الخدمات على المنافذ?"] },
  { triggerKeywords: ["exploit","metasploit","payload","shell"], category: "Exploitation",
    followUps: ["كيف أُعد listener لاستقبال الـ shell?","ما هو الفرق بين reverse shell وbind shell?","كيف أرفع صلاحياتي بعد الوصول?"] },
  { triggerKeywords: ["sql","injection","sqlmap","database"], category: "SQL Injection",
    followUps: ["كيف أستخرج قاعدة البيانات كاملة؟","ما هو الفرق بين UNION-based وBlind SQLi?","كيف أتجاوز WAF في SQLi?"] },
  { triggerKeywords: ["xss","cross-site","script","javascript"], category: "XSS",
    followUps: ["كيف أحول XSS إلى session hijacking?","ما هو الفرق بين Reflected وStored XSS?","كيف أتجاوز CSP في XSS؟"] },
  { triggerKeywords: ["privesc","privilege","escalation","root","sudo"], category: "Privilege Escalation",
    followUps: ["كيف أبحث عن SUID binaries؟","ما هي أدوات enum linux تلقائياً?","كيف أستغل sudo misconfiguration؟"] },
  { triggerKeywords: ["password","hash","crack","hashcat","john"], category: "Password Cracking",
    followUps: ["ما هي أقوى قواميس الكلمات للـ wordlist؟","كيف أحدد نوع الـ hash؟","كيف أستخدم rules في hashcat؟"] },
  { triggerKeywords: ["reverse","binary","malware","re","disassemble"], category: "Reverse Engineering",
    followUps: ["كيف أبدأ تحليل binary مجهول؟","ما الفرق بين static analysis وdynamic analysis؟","كيف أستخدم Ghidra للتحليل؟"] },
  { triggerKeywords: ["phishing","social","email","spear"], category: "Social Engineering",
    followUps: ["كيف أبني صفحة phishing واقعية؟","ما هي أفضل أدوات GoPhish وEvilginx؟","كيف أتجنب اكتشاف phishing من email filters؟"] },
  { triggerKeywords: ["wifi","wireless","wpa","handshake","aircrack"], category: "Wireless",
    followUps: ["كيف أكسر WPA2 بعد capture الـ handshake؟","ما هو Evil Twin attack؟","كيف أعمل deauth attack؟"] },
  { triggerKeywords: ["docker","kubernetes","container","k8s"], category: "Cloud/Container",
    followUps: ["كيف أهرب من container إلى host؟","ما هي ثغرات Kubernetes الشائعة؟","كيف أبحث عن secrets في pods؟"] },
  { triggerKeywords: ["forensics","memory","volatility","dump","artifact"], category: "Digital Forensics",
    followUps: ["كيف أحلل memory dump بـ Volatility؟","أين تتواجد artifacts الـ Windows للاختراق؟","كيف أبني timeline للحادثة؟"] },
  { triggerKeywords: ["c2","command","cobalt","beacon","rat","implant"], category: "C2 & Malware",
    followUps: ["كيف أخفي C2 traffic وراء HTTPS؟","ما هو الفرق بين Cobalt Strike وHavoc C2؟","كيف أتجاوز EDR detection؟"] },
];

let _nodeCounter = 0;

function scorePattern(keywords: string[], msgLower: string): number {
  const matches = keywords.filter((k) => msgLower.includes(k)).length;
  return matches / Math.max(keywords.length, 1);
}

class PrefetchEngine {
  private predictions: PredictionNode[] = [];
  private stats: PrefetchStats = {
    totalPredictions: 0, totalHits: 0, totalMisses: 0,
    hitRate: 0, prefetchesQueued: 0, avgConfidence: 0,
  };
  private subscribers = new Set<() => void>();

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }
  private notify() { this.subscribers.forEach((cb) => cb()); }

  getPredictions(): PredictionNode[] { return [...this.predictions]; }
  getStats(): PrefetchStats { return { ...this.stats }; }

  analyze(lastUserMessage: string, lastAssistantMessage: string) {
    const combined = (lastUserMessage + " " + lastAssistantMessage).toLowerCase();
    const memKeywords = contextMemory.getLongTermKeywords().slice(0, 10).map(([k]) => k);
    const contextStr = combined + " " + memKeywords.join(" ");

    const scored = PATTERNS.map((p) => ({
      pattern: p,
      score: scorePattern(p.triggerKeywords, contextStr),
    })).filter((x) => x.score > 0.1).sort((a, b) => b.score - a.score);

    const newNodes: PredictionNode[] = [];
    for (const { pattern, score } of scored.slice(0, 3)) {
      for (const followUp of pattern.followUps.slice(0, 2)) {
        const id = `pred-${++_nodeCounter}`;
        const confidence = Math.min(0.95, score * 1.4 + Math.random() * 0.1);
        const cacheKey = `prefetch-${followUp.slice(0, 30)}`;
        const prefetched = !!predictiveCache.get(cacheKey);
        newNodes.push({ id, text: followUp, confidence, category: pattern.category, prefetched, hit: false });
        this.stats.prefetchesQueued++;
      }
    }

    if (newNodes.length > 0) {
      this.predictions = newNodes.slice(0, 5);
      this.stats.totalPredictions += newNodes.length;
      this.stats.avgConfidence = this.predictions.reduce((s, n) => s + n.confidence, 0) / this.predictions.length;
      this.notify();
    }
  }

  recordHit(matchedText: string) {
    const matched = this.predictions.find((p) => {
      const msgLower = matchedText.toLowerCase();
      return p.text.split(" ").filter((w) => w.length > 3).some((w) => msgLower.includes(w.toLowerCase()));
    });
    if (matched) {
      matched.hit = true;
      this.stats.totalHits++;
    } else {
      this.stats.totalMisses++;
    }
    this.stats.hitRate = this.stats.totalHits / Math.max(this.stats.totalHits + this.stats.totalMisses, 1);
    this.notify();
  }

  clear() { this.predictions = []; this.notify(); }
}

export const prefetchEngine = new PrefetchEngine();
