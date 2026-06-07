import { useState, useMemo } from "react";
import { Shield, Copy, Download, Search, X, Globe, Hash, Mail, Link, Cpu, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

type IocType = "ip" | "domain" | "url" | "email" | "md5" | "sha1" | "sha256" | "cve";
type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

interface ThreatScore { level: ThreatLevel; reason: string }

interface Ioc {
  type: IocType;
  value: string;
  chats: string[];
  count: number;
  score: ThreatScore;
}

const THREAT_META: Record<ThreatLevel, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: "Critical", color: "text-red-400",    bg: "bg-red-500/15 border-red-500/40",    dot: "bg-red-400" },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/40", dot: "bg-orange-400" },
  medium:   { label: "Medium",   color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/40",  dot: "bg-amber-400" },
  low:      { label: "Low",      color: "text-green-400",  bg: "bg-green-500/15 border-green-500/40",  dot: "bg-green-400" },
  info:     { label: "Info",     color: "text-sky-400",    bg: "bg-sky-500/15 border-sky-500/40",      dot: "bg-sky-400" },
};

function scoreThreat(type: IocType, value: string, count: number): ThreatScore {
  const v = value.toLowerCase();
  if (type === "cve") {
    const year = parseInt(v.match(/cve-(\d{4})/)?.[1] ?? "2000");
    if (year >= 2023) return { level: "critical", reason: "Recent CVE — actively exploited in the wild" };
    if (year >= 2020) return { level: "high",     reason: "Modern CVE — public exploits likely available" };
    if (year >= 2017) return { level: "medium",   reason: "Known CVE — verify patch status" };
    return                   { level: "low",      reason: "Legacy CVE" };
  }
  if (type === "sha256" || type === "sha1" || type === "md5") {
    return { level: "medium", reason: "File hash — cross-reference with VirusTotal / threat intel" };
  }
  if (type === "ip") {
    if (v.startsWith("10.") || v.startsWith("192.168.") || v.startsWith("127.") || v === "0.0.0.0")
      return { level: "info", reason: "Private/loopback — internal address" };
    const knownBadPrefixes = ["45.33.", "185.220.", "194.165.", "91.108.", "77.83.", "198.54."];
    if (knownBadPrefixes.some((p) => v.startsWith(p)))
      return { level: "critical", reason: "IP matches known threat actor ranges" };
    if (count >= 5) return { level: "high",   reason: "High-frequency IP — possible C2, scanner, or DDoS source" };
    if (count >= 2) return { level: "medium", reason: "Recurring public IP — verify with threat intel" };
    return               { level: "low",    reason: "Public IP — no immediate indicators" };
  }
  if (type === "url") {
    const c2Paths = ["/shell", "/cmd", "/c2", "/beacon", "/gate", "/bot", "/payload", "/wp-admin/plugin", "/.git/", "/phpinfo"];
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"];
    const badTlds = [".ru/", ".cn/", ".tk/", ".top/", ".onion/", ".xyz/"];
    if (c2Paths.some((p) => v.includes(p))) return { level: "critical", reason: "Suspicious path — possible C2, webshell, or RCE endpoint" };
    if (badTlds.some((t) => v.includes(t)))  return { level: "high",     reason: "High-risk TLD associated with malicious infrastructure" };
    if (shorteners.some((s) => v.includes(s))) return { level: "medium", reason: "URL shortener — potential phishing redirect" };
    if (v.includes("http://") && !v.includes("https://")) return { level: "low", reason: "Unencrypted HTTP — possible MITM risk" };
    return { level: "info", reason: "URL — no immediate indicators detected" };
  }
  if (type === "domain") {
    const badTlds = [".ru", ".cn", ".tk", ".top", ".xyz", ".onion", ".bit", ".su"];
    const phishWords = ["update", "secure", "login", "account", "verify", "bank", "paypal", "microsoft", "apple", "google", "amazon", "signin"];
    if (badTlds.some((t) => v.endsWith(t)))                               return { level: "high",   reason: "High-risk TLD historically linked to malicious hosting" };
    if (phishWords.some((w) => v.includes(w) && v.split(".").length > 3)) return { level: "high",   reason: "Likely phishing domain — brand impersonation pattern" };
    if (count >= 5) return { level: "medium", reason: "Frequently seen domain — review for C2 or exfiltration" };
    return               { level: "low",    reason: "Domain — verify reputation" };
  }
  if (type === "email") {
    const freeMailers = ["protonmail", "tutanota", "guerrillamail", "tempmail", "yopmail"];
    if (freeMailers.some((f) => v.includes(f))) return { level: "medium", reason: "Anonymous/ephemeral mailer — possible threat actor comms" };
    return { level: "low", reason: "Email address — verify sender reputation" };
  }
  return { level: "info", reason: "Indicator — manual review recommended" };
}

const IOC_PATTERNS: { type: IocType; re: RegExp }[] = [
  { type: "url",    re: /https?:\/\/[^\s<>"')\]]+/g },
  { type: "ip",     re: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
  { type: "email",  re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { type: "sha256", re: /\b[0-9a-fA-F]{64}\b/g },
  { type: "sha1",   re: /\b[0-9a-fA-F]{40}\b/g },
  { type: "md5",    re: /\b[0-9a-fA-F]{32}\b/g },
  { type: "cve",    re: /CVE-\d{4}-\d{4,7}/gi },
  { type: "domain", re: new RegExp(String.raw`\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|gov|edu|mil|info|biz|app|dev|ai|tech|cloud|online|site|web|co|uk|de|fr|ru|cn|jp|au|in|ca|br|mx)\b`, "gi") },
];

const IOC_META: Record<IocType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  ip:     { label: "IP",     icon: Cpu,    color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30" },
  domain: { label: "Domain", icon: Globe,  color: "text-sky-400",    bg: "bg-sky-400/10 border-sky-400/30" },
  url:    { label: "URL",    icon: Link,   color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/30" },
  email:  { label: "Email",  icon: Mail,   color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
  md5:    { label: "MD5",    icon: Hash,   color: "text-rose-400",   bg: "bg-rose-400/10 border-rose-400/30" },
  sha1:   { label: "SHA1",   icon: Hash,   color: "text-pink-400",   bg: "bg-pink-400/10 border-pink-400/30" },
  sha256: { label: "SHA256", icon: Hash,   color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  cve:    { label: "CVE",    icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
};

function extractIocs(text: string): Map<string, IocType> {
  const found = new Map<string, IocType>();
  for (const { type, re } of IOC_PATTERNS) {
    const matches = text.match(re) ?? [];
    for (const m of matches) {
      const key = m.toLowerCase();
      if (!found.has(key)) found.set(key, type);
    }
  }
  return found;
}

const ALL_FILTER = "all";
type SortKey = "count" | "type" | "value" | "risk";

export function OsintDashboard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const { toast } = useToast();
  const { t } = useT();
  const [filter, setFilter] = useState<string>(ALL_FILTER);
  const [riskFilter, setRiskFilter] = useState<string>(ALL_FILTER);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortAsc, setSortAsc] = useState(false);
  const [chatFilter, setChatFilter] = useState<string>(ALL_FILTER);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const iocs = useMemo<Ioc[]>(() => {
    const map = new Map<string, Ioc>();
    for (const chat of state.chats) {
      for (const msg of chat.messages) {
        if (!msg.content) continue;
        const found = extractIocs(msg.content);
        for (const [val, type] of found) {
          const existing = map.get(val);
          if (existing) {
            existing.count++;
            if (!existing.chats.includes(chat.id)) existing.chats.push(chat.id);
            existing.score = scoreThreat(existing.type, existing.value, existing.count);
          } else {
            map.set(val, { type, value: val, chats: [chat.id], count: 1, score: scoreThreat(type, val, 1) });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [state.chats]);

  const RISK_ORDER: ThreatLevel[] = ["critical", "high", "medium", "low", "info"];

  const filtered = useMemo(() => {
    let list = iocs;
    if (filter !== ALL_FILTER) list = list.filter((i) => i.type === filter);
    if (riskFilter !== ALL_FILTER) list = list.filter((i) => i.score.level === riskFilter);
    if (chatFilter !== ALL_FILTER) list = list.filter((i) => i.chats.includes(chatFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.value.toLowerCase().includes(q) || i.score.reason.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "count") cmp = b.count - a.count;
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "risk") cmp = RISK_ORDER.indexOf(a.score.level) - RISK_ORDER.indexOf(b.score.level);
      else cmp = a.value.localeCompare(b.value);
      return sortAsc ? -cmp : cmp;
    });
    return list;
  }, [iocs, filter, riskFilter, chatFilter, search, sortKey, sortAsc]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: iocs.length };
    for (const ioc of iocs) c[ioc.type] = (c[ioc.type] ?? 0) + 1;
    return c;
  }, [iocs]);

  function copy(val: string) {
    navigator.clipboard.writeText(val);
    toast({ description: "Copied." });
  }

  function exportCsv() {
    const rows = [["Type", "Value", "Count", "Chats"].join(",")];
    for (const i of filtered) {
      const chatTitles = i.chats.map((id) => state.chats.find((c) => c.id === id)?.title ?? id).join("; ");
      rows.push([i.type, `"${i.value.replace(/"/g, '""')}"`, String(i.count), `"${chatTitles}"`].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `osint-iocs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ description: `Exported ${filtered.length} IOCs.` });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />)
      : null;

  const lang = state.settings.language;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop className="bg-card border-border w-[96vw] max-w-4xl max-h-[82vh] flex flex-col p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-primary" />
            {lang === "ar" ? "لوحة OSINT — كاشف مؤشرات الاختراق" : "OSINT Intelligence Dashboard"}
            <span className="ml-auto text-[11px] font-mono text-muted-foreground font-normal">
              {iocs.length} {lang === "ar" ? "مؤشر" : "IOCs"} · {state.chats.length} {lang === "ar" ? "محادثة" : "chats"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {lang === "ar"
              ? "يستخرج مؤشرات الاختراق من كل المحادثات: عناوين IP والنطاقات والروابط والبريد الإلكتروني والهاشات وأكواد CVE."
              : "Extracts all IOCs from your conversation history: IPs, domains, URLs, emails, hashes, and CVEs."}
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-border shrink-0 space-y-2.5">
          {/* Type filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter(ALL_FILTER)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${filter === ALL_FILTER ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
            >
              {lang === "ar" ? "الكل" : "All"} <span className="opacity-60">({counts.all})</span>
            </button>
            {(Object.keys(IOC_META) as IocType[]).filter((k) => counts[k]).map((k) => {
              const m = IOC_META[k];
              const Icon = m.icon;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${filter === k ? `${m.bg} ${m.color}` : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                >
                  <Icon className="w-3 h-3" /> {m.label} <span className="opacity-60">({counts[k]})</span>
                </button>
              );
            })}
          </div>

          {/* Risk filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold mr-0.5 shrink-0">
              {lang === "ar" ? "الخطورة:" : "Risk:"}
            </span>
            <button
              onClick={() => setRiskFilter(ALL_FILTER)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${riskFilter === ALL_FILTER ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
            >
              {lang === "ar" ? "الكل" : "All"}
            </button>
            {(["critical", "high", "medium", "low", "info"] as ThreatLevel[]).map((level) => {
              const tm = THREAT_META[level];
              return (
                <button key={level} onClick={() => setRiskFilter(level)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${riskFilter === level ? `${tm.bg} ${tm.color}` : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                >
                  <span className={`w-2 h-2 rounded-full ${tm.dot}`} />
                  {tm.label}
                </button>
              );
            })}
          </div>

          {/* Search + chat filter + export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "ar" ? "ابحث في المؤشرات…" : "Search IOCs…"}
                className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-background border border-border text-[12px] focus:outline-none focus:border-primary/40"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <select
              value={chatFilter}
              onChange={(e) => setChatFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-[12px] text-foreground focus:outline-none focus:border-primary/40 min-w-[130px]"
            >
              <option value={ALL_FILTER}>{lang === "ar" ? "كل المحادثات" : "All chats"}</option>
              {state.chats.map((c) => (
                <option key={c.id} value={c.id}>{c.title.slice(0, 40)}</option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              {lang === "ar" ? "تصدير CSV" : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Shield className="w-12 h-12 opacity-20" />
              <p className="text-[13px]">
                {iocs.length === 0
                  ? (lang === "ar" ? "لم يتم الكشف عن أي مؤشرات بعد. ابدأ محادثة أو أرفق ملفاً." : "No IOCs detected yet. Start a conversation or attach a file.")
                  : (lang === "ar" ? "لا توجد نتائج تطابق الفلتر." : "No results match the current filter.")}
              </p>
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-card border-b border-border z-10">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("risk")}>
                    {lang === "ar" ? "الخطورة" : "Risk"}<SortIcon k="risk" />
                  </th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("type")}>
                    {lang === "ar" ? "النوع" : "Type"}<SortIcon k="type" />
                  </th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-semibold cursor-pointer hover:text-foreground" onClick={() => toggleSort("value")}>
                    {lang === "ar" ? "القيمة" : "Value"}<SortIcon k="value" />
                  </th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-semibold cursor-pointer hover:text-foreground w-16" onClick={() => toggleSort("count")}>
                    {lang === "ar" ? "عدد" : "Count"}<SortIcon k="count" />
                  </th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-semibold">
                    {lang === "ar" ? "المصدر" : "Source"}
                  </th>
                  <th className="px-4 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ioc, idx) => {
                  const m = IOC_META[ioc.type];
                  const Icon = m.icon;
                  const isExpanded = expandedRow === ioc.value;
                  const chatNames = ioc.chats.map((id) => state.chats.find((c) => c.id === id)?.title ?? id);
                  return (
                    <>
                      <tr
                        key={ioc.value}
                        className={`border-b border-border/50 hover:bg-accent/40 transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-card/30"}`}
                        onClick={() => setExpandedRow(isExpanded ? null : ioc.value)}
                      >
                        <td className="px-4 py-2.5">
                          {(() => {
                            const tm = THREAT_META[ioc.score.level];
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${tm.bg} ${tm.color}`} title={ioc.score.reason}>
                                <span className={`w-1.5 h-1.5 rounded-full ${tm.dot}`} /> {tm.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${m.bg} ${m.color}`}>
                            <Icon className="w-2.5 h-2.5" /> {m.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[11px] text-foreground/90 break-all">{ioc.value.slice(0, 80)}{ioc.value.length > 80 ? "…" : ""}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`font-mono font-bold text-[11px] ${ioc.count > 2 ? "text-primary" : "text-muted-foreground"}`}>{ioc.count}×</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {chatNames.length === 1 ? (
                            <span className="truncate max-w-[160px] block">{chatNames[0]}</span>
                          ) : (
                            <span>{chatNames.length} chats</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); copy(ioc.value); }}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${ioc.value}-exp`} className="border-b border-primary/20 bg-primary/5">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="space-y-2">
                              <div className="font-mono text-[11px] text-foreground break-all select-all bg-background rounded-lg px-3 py-2 border border-border">
                                {ioc.value}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {chatNames.map((n, i) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">{n}</span>
                                ))}
                              </div>
                              {ioc.type === "url" && (
                                <a href={ioc.value} target="_blank" rel="noopener noreferrer" className="text-[11px] text-sky-400 hover:underline flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> {lang === "ar" ? "فتح الرابط" : "Open URL"}
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border shrink-0 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>{filtered.length} {lang === "ar" ? "مؤشر ظاهر من" : "of"} {iocs.length} {lang === "ar" ? "إجمالاً" : "total IOCs"}</span>
          <span>{lang === "ar" ? "انقر على صف للتوسع • اضغط ESC للإغلاق" : "Click row to expand · ESC to close"}</span>
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
