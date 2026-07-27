import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Insight {
  id: string;
  type: "threat" | "anomaly" | "recommendation" | "prediction";
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  timestamp: Date;
  confidence: number;
  action?: string;
}

const TYPE_ICON: Record<Insight["type"], string> = {
  threat: "◈", anomaly: "⬟", recommendation: "◉", prediction: "◆",
};
const SEV_COLOR: Record<Insight["severity"], string> = {
  critical: "#e21227", warning: "#ff7800", info: "#00e5ff", success: "#10b981",
};

const INSIGHT_POOL: Omit<Insight, "id" | "timestamp">[] = [
  { type: "threat", severity: "critical", confidence: 97,
    title: "APT-28 lateral movement detected",
    body: "Anomalous SMB traversal across 3 internal hosts in the last 4 minutes. MITRE T1021.002.",
    action: "Isolate hosts immediately" },
  { type: "anomaly", severity: "warning", confidence: 84,
    title: "Beaconing interval detected",
    body: "Host 10.0.1.44 making requests every 30s to external IP. C2 pattern probability: 84%.",
    action: "Block egress" },
  { type: "recommendation", severity: "info", confidence: 100,
    title: "Enable MFA on 12 accounts",
    body: "12 accounts without MFA have access to sensitive data. Enforce before next sprint.",
    action: "Open IAM policy" },
  { type: "prediction", severity: "warning", confidence: 76,
    title: "DDoS surge predicted in 2h",
    body: "ML model sees traffic patterns matching pre-DDoS baseline from 3 similar incidents.",
    action: "Pre-scale load balancers" },
  { type: "threat", severity: "warning", confidence: 91,
    title: "Credential stuffing attack",
    body: "Login failures spiked 430% in 8 minutes targeting API endpoints from 47 IPs.",
    action: "Enable CAPTCHA + rate limit" },
  { type: "anomaly", severity: "info", confidence: 68,
    title: "Unusual data exfiltration volume",
    body: "5.2GB outbound traffic in last hour — 4.1x normal baseline. Investigating.",
    action: "Inspect traffic" },
  { type: "recommendation", severity: "success", confidence: 100,
    title: "Patch applied: CVE-2024-1234",
    body: "Critical RCE vulnerability patched on 47/47 affected systems. Zero exposure.",
    action: "View report" },
  { type: "prediction", severity: "critical", confidence: 89,
    title: "Supply chain compromise risk",
    body: "Third-party library updated — hash mismatch vs known-good baseline. Verify provenance.",
    action: "Check dependency" },
];

function mkInsight(pool: typeof INSIGHT_POOL[0]): Insight {
  return { ...pool, id: Math.random().toString(36).slice(2), timestamp: new Date() };
}

export function AIInsightPanel() {
  const [insights, setInsights] = useState<Insight[]>(() =>
    INSIGHT_POOL.slice(0, 4).map(mkInsight)
  );
  const [dismissed, setDismissed] = useState(new Set<string>());

  useEffect(() => {
    const addNew = () => {
      const pool = INSIGHT_POOL[Math.floor(Math.random() * INSIGHT_POOL.length)];
      const insight = mkInsight(pool);
      setInsights(prev => [insight, ...prev].slice(0, 12));
    };
    const iv = setInterval(addNew, 12000 + Math.random() * 8000);
    return () => clearInterval(iv);
  }, []);

  const visible = insights.filter(i => !dismissed.has(i.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 font-mono">AI INSIGHTS</span>
          <span className="text-[9px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-mono border border-red-900/40">
            {visible.length}
          </span>
        </div>
        <span className="text-[9px] text-gray-600 font-mono">NEURAL ENGINE v4</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.2) transparent" }}>
        <AnimatePresence mode="popLayout">
          {visible.slice(0, 8).map(insight => {
            const color = SEV_COLOR[insight.severity];
            return (
              <motion.div key={insight.id}
                layout initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="rounded-lg border p-2.5 relative overflow-hidden"
                style={{
                  borderColor: `${color}30`,
                  background: `linear-gradient(135deg, ${color}08, transparent)`,
                }}>
                <div className="absolute top-0 left-0 w-0.5 h-full" style={{ backgroundColor: color }} />
                <div className="flex items-start justify-between gap-2 ml-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-sm mt-0.5" style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}>
                      {TYPE_ICON[insight.type]}
                    </span>
                    <div>
                      <div className="text-[11px] font-semibold text-white/90 font-mono leading-tight">
                        {insight.title}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 leading-relaxed">
                        {insight.body}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {insight.action && (
                          <button className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border transition-all hover:opacity-90"
                            style={{ color, borderColor: `${color}50`, background: `${color}10` }}>
                            {insight.action}
                          </button>
                        )}
                        <span className="text-[9px] text-gray-700 font-mono">
                          {insight.confidence}% conf · {insight.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDismissed(s => new Set([...s, insight.id]))}
                    className="text-gray-700 hover:text-gray-400 transition-colors text-xs flex-shrink-0">
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {visible.length === 0 && (
          <div className="text-center text-gray-700 text-[10px] font-mono py-8">
            No active insights — system nominal
          </div>
        )}
      </div>
    </div>
  );
}
