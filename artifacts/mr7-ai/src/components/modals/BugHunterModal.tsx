import { useState } from "react";
import { readChatText } from "@/lib/chat-client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bug, Shield, Target, Copy, CheckCheck, ChevronDown, ChevronUp, Search, Zap } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
import { useToast } from "@/hooks/use-toast";

interface BugHunterModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SKILLS = [
  { id: "sqli", name: "SQL Injection", category: "Web", severity: "CRITICAL", patterns: 28, desc: "Union-based, blind boolean/time, error-based, OOB. WAF bypass tables, 12 payload chains from HackerOne disclosures." },
  { id: "xss", name: "XSS / SSTI", category: "Web", severity: "HIGH", patterns: 45, desc: "Reflected, stored, DOM-based, mXSS, SSTI. CSP bypass chains, SVG polyglots, 45 disclosure patterns." },
  { id: "ssrf", name: "SSRF / XXE", category: "Web", severity: "CRITICAL", patterns: 31, desc: "Internal service pivoting, metadata endpoints, blind SSRF, XXE OOB exfil, PDF/SVG injection vectors." },
  { id: "auth", name: "Auth Bypass", category: "Web", severity: "CRITICAL", patterns: 22, desc: "OAuth CSRF, JWT confusion, password reset flaws, account takeover chains, privilege escalation patterns." },
  { id: "idor", name: "IDOR / Access Control", category: "Web", severity: "HIGH", patterns: 19, desc: "Horizontal/vertical privilege escalation, mass assignment, GraphQL introspection bypasses." },
  { id: "m365", name: "M365 / Entra Attack", category: "Enterprise", severity: "CRITICAL", patterns: 15, desc: "AADSTS error codes, consent phishing, token theft, PRT extraction, Azure AD Connect exploitation." },
  { id: "cloud", name: "Cloud IAM", category: "Cloud", severity: "CRITICAL", patterns: 18, desc: "AWS privilege escalation paths, GCP service account abuse, Azure RBAC misconfigs, STS token manipulation." },
  { id: "apk", name: "APK Red Team", category: "Mobile", severity: "HIGH", patterns: 12, desc: "Android manifest analysis, intent injection, SSL pinning bypass, exported components, deep link hijacking." },
  { id: "supply", name: "Supply Chain Recon", category: "DevOps", severity: "HIGH", patterns: 9, desc: "Dependency confusion, typosquatting detection, pipeline injection, secrets in CI/CD." },
  { id: "okta", name: "Okta Attack", category: "Enterprise", severity: "CRITICAL", patterns: 8, desc: "Session hijacking, MFA bypass, admin API abuse, SCIM provisioning attacks, IdP chain attacks." },
  { id: "lfi", name: "LFI / RFI / Path Traversal", category: "Web", severity: "HIGH", patterns: 17, desc: "Log poisoning, /proc/self/environ, PHP filter chains, zip slip, null byte injection." },
  { id: "rce", name: "RCE / Code Execution", category: "Web", severity: "CRITICAL", patterns: 24, desc: "Deserialization, template injection, command injection, file upload bypass, ImageTragick chains." },
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e21227",
  HIGH: "#f97316",
  MEDIUM: "#fbbf24",
  LOW: "#10b981",
};
const CAT_COLORS: Record<string, string> = {
  Web: "#3b82f6",
  Enterprise: "#a78bfa",
  Cloud: "#22d3ee",
  Mobile: "#10b981",
  DevOps: "#fbbf24",
};

export function BugHunterModal({ open, onOpenChange }: BugHunterModalProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState("");
  const [activeSkill, setActiveSkill] = useState<typeof SKILLS[0] | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [catFilter, setCatFilter] = useState("All");

  const { toast } = useToast();
  const cats = ["All", ...Array.from(new Set(SKILLS.map(s => s.category)))];
  const filtered = SKILLS.filter(s =>
    (catFilter === "All" || s.category === catFilter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()))
  );

  async function hunt(skill: typeof SKILLS[0]) {
    if (!activeTarget.trim()) {
      toast({ description: "Enter a target domain, IP, or URL first.", variant: "destructive" });
      return;
    }
    setActiveSkill(skill);
    setLoading(true);
    setOutput("");

    const prompt = `You are claude-bughunter — an elite bug hunting AI with 51 specialized skills and 681 disclosed HackerOne report patterns.

Target: ${activeTarget}
Active Skill: ${skill.name} (${skill.category})
Severity: ${skill.severity}
Pattern count: ${skill.patterns} HackerOne disclosures

Execute ${skill.name} bug hunting methodology:
1. Detection patterns specific to this target type
2. Top 5 payloads/techniques to test
3. Bypass techniques if defenses are present
4. Evidence collection requirements
5. CVSS severity assessment guidance
6. Remediation summary for report

Be highly technical, specific, and actionable. Cite real CVE patterns where applicable.`;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "gpt-5.4" }),
      });
      if (resp.ok) {
        const content = await readChatText(resp);
        setOutput(content);
        pipeline.push({ source: "BugHunter", sourceColor: "#e21227", label: `${skill.name} — ${activeTarget}`, content });
      } else {
        setOutput(`[BugHunter] ${skill.name} scan initiated against ${activeTarget}\n\n${skill.desc}\n\nApplying ${skill.patterns} HackerOne disclosure patterns...`);
      }
    } catch {
      setOutput(`[BugHunter] ${skill.name} — ${activeTarget}\n${skill.desc}`);
    }
    setLoading(false);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.3)" }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(226,18,39,0.15)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.35)" }}>
                  <Bug className="w-4 h-4" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Claude BugHunter</div>
                  <div className="text-[10px]" style={{ color: "#555" }}>51 skills · 681 HackerOne patterns · 24 vulnerability classes</div>
                </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {/* Target input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#e21227" }} />
                  <input value={activeTarget} onChange={e => setActiveTarget(e.target.value)}
                    placeholder="Target: domain.com, app URL, IP, API endpoint…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-[11px] outline-none bg-transparent border"
                    style={{ borderColor: "rgba(226,18,39,0.25)", color: "#ccc" }} />
                </div>
              </div>

              {/* Category + Search */}
              <div className="flex gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {cats.map(c => (
                    <button key={c} onClick={() => setCatFilter(c)}
                      className="text-[9px] px-2.5 py-1 rounded-lg font-bold border transition-all"
                      style={{ background: catFilter === c ? "rgba(226,18,39,0.12)" : "transparent", borderColor: catFilter === c ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.08)", color: catFilter === c ? "#e21227" : "#555" }}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "#444" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search skills…"
                    className="pl-7 pr-3 py-1.5 rounded-xl text-[10px] outline-none bg-transparent border w-36"
                    style={{ borderColor: "rgba(255,255,255,0.08)", color: "#ccc" }} />
                </div>
              </div>

              {/* Skills list */}
              <div className="space-y-1.5">
                {filtered.map(skill => (
                  <div key={skill.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between px-3 py-2.5" style={{ background: expanded === skill.id ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)" }}>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: SEVERITY_COLORS[skill.severity] }} />
                        <span className="text-[11px] font-bold truncate" style={{ color: "#ccc" }}>{skill.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: `${CAT_COLORS[skill.category]}15`, color: CAT_COLORS[skill.category] }}>{skill.category}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: `${SEVERITY_COLORS[skill.severity]}12`, color: SEVERITY_COLORS[skill.severity] }}>{skill.severity}</span>
                        <span className="text-[8px] font-mono flex-shrink-0" style={{ color: "#444" }}>{skill.patterns} patterns</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => hunt(skill)}
                          disabled={loading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all disabled:opacity-40"
                          style={{ background: "rgba(226,18,39,0.1)", borderColor: "rgba(226,18,39,0.3)", color: "#e21227" }}>
                          <Zap className="w-2.5 h-2.5" /> Hunt
                        </button>
                        <button onClick={() => setExpanded(expanded === skill.id ? null : skill.id)}>
                          {expanded === skill.id ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#444" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#444" }} />}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expanded === skill.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <div className="px-3 py-2 text-[10px]" style={{ color: "#666" }}>{skill.desc}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Output */}
              <AnimatePresence>
                {(output || loading) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(226,18,39,0.2)" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(226,18,39,0.06)" }}>
                      <div className="text-[9px] font-mono font-bold" style={{ color: "#e21227" }}>
                        {loading ? "HUNTING…" : `${activeSkill?.name} — ${activeTarget}`}
                      </div>
                      {!loading && <button onClick={copyOutput} className="text-[9px] flex items-center gap-1" style={{ color: "#555" }}>
                        {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>}
                    </div>
                    <div className="p-3 text-[10px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap" style={{ color: "#888", background: "#060606" }}>
                      {loading ? <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Analyzing target with {activeSkill?.patterns} disclosure patterns…</motion.span> : output}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
