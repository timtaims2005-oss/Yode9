import {
  useState, useCallback, useEffect, useMemo,
  useRef, memo, type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { useMinimizedArtifacts, type MinimizedArtifact } from "@/state/minimizedArtifacts";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ArtifactLanguage = "html" | "react" | "javascript";
type ViewMode   = "preview" | "code" | "split";
type Viewport   = "mobile" | "tablet" | "desktop";
type CLevel     = "log" | "warn" | "error" | "info";

export interface ArtifactCardProps {
  title: string;
  language: ArtifactLanguage;
  code: string;
  artifactId?: string;
}
interface ArtifactVersion { code: string; timestamp: number; label: string }
interface ConsoleEntry    { level: CLevel; args: string[]; time: number; id: number }

// ─── Version store — persistent in localStorage, in-memory Map as cache ───────
// Key: "artifact-versions:<id>", max 20 entries per artifact
const LS_VERS  = "artifact-versions:";
const MAX_VERS = 20;
const store    = new Map<string, ArtifactVersion[]>();
let _cid = 0;

function _lsLoadVers(id: string): ArtifactVersion[] {
  try { const r = localStorage.getItem(LS_VERS + id); return r ? (JSON.parse(r) as ArtifactVersion[]) : []; }
  catch { return []; }
}
function _lsSaveVers(id: string, list: ArtifactVersion[]) {
  try { localStorage.setItem(LS_VERS + id, JSON.stringify(list)); } catch { /* quota */ }
}

function pushVer(id: string, code: string) {
  let list = store.get(id);
  if (!list) { list = _lsLoadVers(id); store.set(id, list); }
  if (list.length && list.at(-1)!.code === code) return;
  const next = [...list, { code, timestamp: Date.now(), label: `v${list.length + 1}` }].slice(-MAX_VERS);
  store.set(id, next);
  _lsSaveVers(id, next);
}
function getVers(id: string): ArtifactVersion[] {
  if (store.has(id)) return store.get(id)!;
  const list = _lsLoadVers(id);
  store.set(id, list);
  return list;
}

// ─── Share-link encoding (matches ArtifactPreviewPage decoding) ───────────────
function encodeForShare(code: string): string {
  return btoa(unescape(encodeURIComponent(code)));
}

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0c0b18",
  panel:    "#13112a",
  surface:  "#1a1830",
  border:   "#252245",
  borderHi: "#3d3870",
  accent:   "#8b5cf6",
  accentLo: "rgba(139,92,246,0.18)",
  teal:     "#2dd4bf",
  tealLo:   "rgba(45,212,191,0.15)",
  text:     "#f0ecff",
  muted:    "#7368a0",
  dim:      "#302b55",
  danger:   "#f87171",
  warn:     "#fbbf24",
  success:  "#34d399",
  info:     "#60a5fa",
};

const LANG: Record<ArtifactLanguage, { color: string; bg: string; label: string; symbol: string }> = {
  html:       { color: "#e34c26", bg: "rgba(227,76,38,.15)",   label: "HTML",       symbol: "⟨/⟩" },
  react:      { color: "#61dafb", bg: "rgba(97,218,251,.12)",  label: "React",      symbol: "⚛"   },
  javascript: { color: "#f7df1e", bg: "rgba(247,223,30,.12)",  label: "JavaScript", symbol: "JS"  },
};

const VIEWS: Record<Viewport, { w: number | "100%"; label: string }> = {
  mobile:  { w: 375,   label: "موبايل 375" },
  tablet:  { w: 768,   label: "تابلت 768"  },
  desktop: { w: "100%", label: "ديسكتوب"   },
};

// ─── iframe srcdoc builder ────────────────────────────────────────────────────
const BRIDGE = `<script>(function(){
  var s=function(l,a){try{window.parent.postMessage({__ac:1,l:l,a:Array.from(a).map(function(x){try{return typeof x==="object"?JSON.stringify(x,null,2):String(x)}catch(e){return String(x)}})},"*")}catch(e){}};
  ["log","warn","error","info"].forEach(function(m){var o=console[m];console[m]=function(){s(m,arguments);o&&o.apply(console,arguments)};});
  window.onerror=function(m){s("error",[m])};
  window.onunhandledrejection=function(e){s("error",[e.reason&&e.reason.message||String(e.reason)])};
}());<\/script>`;

function buildDoc(lang: ArtifactLanguage, code: string): string {
  const head = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${BRIDGE}<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>`;
  if (lang === "html") {
    if (/<html[\s>]/i.test(code)) {
      return /<\/head>/i.test(code)
        ? code.replace(/<\/head>/i, `${BRIDGE}</head>`)
        : BRIDGE + code;
    }
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>${head}</head><body>${code}</body></html>`;
  }
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>${head}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"><\/script>
  <style>#root{min-height:100vh}</style>
</head><body><div id="root"></div>
<script type="text/babel" data-presets="react,env">
try{${code}
  const _r=document.getElementById("root");
  const _R=ReactDOM.createRoot(_r);
  const _C=typeof App!=="undefined"?App:null;
  if(_C){_R.render(React.createElement(_C))}else{_r.innerHTML="<p style='padding:24px;color:#f87171;font-family:monospace'>لم يتم العثور على مكوّن باسم App</p>"}
}catch(_e){document.getElementById("root").innerHTML="<pre style='padding:20px;color:#f87171;font-size:13px;direction:ltr'>"+_e.message+"</pre>"}
<\/script></body></html>`;
}

function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function ext(l: ArtifactLanguage) { return l==="react"?"jsx":l==="javascript"?"js":"html"; }

// ─── Prism loader ─────────────────────────────────────────────────────────────
let _pp: Promise<void> | null = null;
function loadPrism(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).Prism) return Promise.resolve();
  if (_pp) return _pp;
  _pp = new Promise(res => {
    const id = "__ptheme";
    if (!document.getElementById(id)) {
      const l = document.createElement("link"); l.id = id; l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
      document.head.appendChild(l);
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js";
    s.onload = () => {
      const a = document.createElement("script");
      a.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js";
      a.onload = () => res(); a.onerror = () => res();
      document.body.appendChild(a);
    };
    s.onerror = () => res(); document.body.appendChild(s);
  });
  return _pp;
}

// ─── Inject global CSS once ───────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const sid = "__av3css";
  if (!document.getElementById(sid)) {
    const s = document.createElement("style"); s.id = sid;
    s.textContent = `
      @keyframes av3-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes av3-spin{to{transform:rotate(360deg)}}
      @keyframes av3-pill-in{from{opacity:0;transform:translateY(20px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes av3-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      .av3-page{animation:av3-in .22s cubic-bezier(.34,1.56,.64,1) both}
      .av3-drag{cursor:col-resize;user-select:none}
      .av3-drag:hover .av3-drag-bar,.av3-drag-active .av3-drag-bar{background:${C.accent}!important}
      .av3-ibtn:hover{background:${C.surface}!important;color:${C.text}!important}
      .av3-ibtn.active{background:${C.accentLo}!important;color:${C.accent}!important}
      .av3-tab.active{background:${C.surface}!important;color:${C.text}!important}
      .av3-vp.active{background:${C.accentLo}!important;color:${C.accent}!important;outline:1px solid ${C.accent}44}
      .av3-ver:hover{background:${C.surface}!important}
      .av3-ver.active{background:${C.accentLo}!important;color:${C.accent}!important}
      .av3-editor::-webkit-scrollbar{width:6px;height:6px}
      .av3-editor::-webkit-scrollbar-track{background:transparent}
      .av3-editor::-webkit-scrollbar-thumb{background:${C.dim};border-radius:3px}
      .av3-spin{animation:av3-spin .7s linear infinite}
      .av3-pill{animation:av3-pill-in .25s cubic-bezier(.34,1.56,.64,1) both}
      .av3-pill:hover{box-shadow:0 12px 40px rgba(139,92,246,.3),0 0 0 1px ${C.accent}!important;transform:translateY(-2px)}
      .av3-toast{animation:av3-toast-in .2s ease both}
    `;
    document.head.appendChild(s);
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const I = {
  Back:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Play:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  Reload:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  Copy:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Check:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>,
  Download: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  NewTab:   ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Console:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  Eye:      ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Code2:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Split:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
  Sidebar:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Clock:    ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Bolt:     ()=><svg width="14" height="14" viewBox="0 0 24 24" fill={C.teal}><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>,
  // ── NEW ICONS ──
  Share:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  Minimize: ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Restore:  ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 12 12 8 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>,
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function IBtn({ icon, label, onClick, active = false, highlight = false, badge }: {
  icon: React.ReactNode; label?: string; onClick: () => void;
  active?: boolean; highlight?: boolean; badge?: number;
}) {
  return (
    <button
      className={`av3-ibtn${active ? " active" : ""}`}
      title={label}
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:4,
        padding: label ? "4px 10px" : "5px 7px",
        border:"none", borderRadius:7, cursor:"pointer",
        background:"transparent",
        color: highlight ? C.teal : active ? C.accent : C.muted,
        fontFamily:"inherit", fontSize:12,
        transition:"all .15s",
      }}
    >
      {icon}
      {label && <span>{label}</span>}
      {!!badge && (
        <span style={{
          background:C.danger, color:"#fff", borderRadius:4,
          padding:"1px 4px", fontSize:9, fontWeight:700,
        }}>{badge}</span>
      )}
    </button>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700,
      color, background:bg, border:`1px solid ${color}33`,
    }}>{label}</span>
  );
}

// (InlineToast removed — using project-wide useToast() instead)

// ─────────────────────────────────────────────────────────────────────────────
// ArtifactCard — compact chat card
// ─────────────────────────────────────────────────────────────────────────────
export function ArtifactCard({
  title = "تطبيق تفاعلي",
  language = "html",
  code = "",
  artifactId,
}: Partial<ArtifactCardProps>) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const m = LANG[language];
  const vcount = artifactId ? getVers(artifactId).length : 0;
  const preview = code.split("\n").slice(0, 3).join("\n");

  useEffect(() => { if (artifactId && code) pushVer(artifactId, code); }, [artifactId, code]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display:"flex", alignItems:"stretch", gap:0,
          width:"100%", maxWidth:500,
          background: hov ? C.surface : C.panel,
          border:`1px solid ${hov ? C.borderHi : C.border}`,
          borderRadius:14, cursor:"pointer", textAlign:"right",
          fontFamily:"inherit", transition:"all .18s",
          boxShadow: hov ? `0 6px 28px ${C.accentLo},inset 0 0 0 1px ${C.borderHi}` : "0 2px 10px rgba(0,0,0,.3)",
          outline:"none", overflow:"hidden", position:"relative",
        }}
      >
        {/* Top glow bar */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:2,
          background: hov ? `linear-gradient(90deg,transparent,${m.color},transparent)` : "transparent",
          transition:"all .3s",
        }}/>

        {/* Language column */}
        <div style={{
          flexShrink:0, width:64,
          background: m.bg,
          borderLeft:`1px solid ${m.color}22`,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:2,
          padding:"16px 0",
        }}>
          <span style={{ fontSize:22, lineHeight:1 }}>{m.symbol}</span>
          <span style={{ fontSize:10, fontWeight:700, color:m.color, letterSpacing:.5 }}>{m.label}</span>
        </div>

        {/* Info */}
        <div style={{ flex:1, padding:"14px 16px", minWidth:0 }}>
          <div style={{
            fontWeight:700, fontSize:14, color:C.text,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>{title}</div>
          {preview && (
            <div style={{
              fontFamily:"monospace", fontSize:11, color:C.muted, marginTop:5,
              overflow:"hidden", maxHeight:42, lineHeight:"14px",
              direction:"ltr", textAlign:"left",
            }}>
              {preview.length > 120 ? preview.slice(0, 120) + "…" : preview}
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:8 }}>
            <Pill label={m.label} color={m.color} bg={m.bg} />
            {vcount > 1 && <Pill label={`${vcount} نسخ`} color={C.accent} bg={C.accentLo} />}
            <span style={{ fontSize:11, color:C.muted, marginRight:"auto" }}>انقر للفتح</span>
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          flexShrink:0, width:36,
          display:"flex", alignItems:"center", justifyContent:"center",
          color: hov ? C.accent : C.dim, fontSize:18, transition:"all .18s",
        }}>›</div>
      </button>

      {open && (
        <ArtifactPage
          title={title} language={language} code={code}
          artifactId={artifactId} onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArtifactPage — FULL SCREEN viewer (100vw × 100vh, z-index 9999)
// ─────────────────────────────────────────────────────────────────────────────
interface PageProps extends ArtifactCardProps {
  onClose: () => void;
  /** Called when the user hits the Minimize button. Pill/bubble handles persistence. */
  onMinimize?: (artifact: MinimizedArtifact) => void;
  /** Pre-load these into editCode/view when opened from a minimized pill */
  initialEditCode?: string;
  initialView?: "preview" | "code" | "split";
}

export function ArtifactPage({ title, language, code, artifactId, onClose, onMinimize, initialEditCode, initialView }: PageProps) {
  const m = LANG[language];

  // Hooks
  const { toast }    = useToast();
  const { minimize } = useMinimizedArtifacts();

  // UI state
  const [view,        setView]        = useState<ViewMode>(initialView ?? "split");
  const [viewport,    setViewport]    = useState<Viewport>("desktop");
  const [sidebar,     setSidebar]     = useState(true);
  const [showCons,    setShowCons]    = useState(false);
  const [consH,       setConsH]       = useState(180);
  const [reloadKey,   setReloadKey]   = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [prismReady,  setPrismReady]  = useState(false);
  const [logs,        setLogs]        = useState<ConsoleEntry[]>([]);
  const [splitPct,    setSplitPct]    = useState(50);
  const [mounted,     setMounted]     = useState(false);

  // Versions — loads latest from localStorage automatically via getVers()
  const versions = useMemo(
    () => {
      const vers = artifactId ? getVers(artifactId) : [];
      return vers.length ? vers : [{ code, timestamp: Date.now(), label: "v1" }];
    },
    [artifactId, code],
  );
  const [vIdx,  setVIdx]  = useState(versions.length - 1);
  const baseCode = versions[vIdx]?.code ?? code;

  // Editable code — prefer initialEditCode (from minimized pill restore), then localStorage version
  const [editCode,    setEditCode]    = useState(initialEditCode ?? baseCode);
  const [previewCode, setPreviewCode] = useState(initialEditCode ?? baseCode);

  const isModified = editCode !== previewCode;

  useEffect(() => { setEditCode(baseCode); setPreviewCode(baseCode); }, [vIdx]);

  const srcDoc = useMemo(() => buildDoc(language, previewCode), [language, previewCode]);

  // Mount animation
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  // Disable body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Prism
  const codeRef  = useRef<HTMLElement | null>(null);
  const taRef    = useRef<HTMLTextAreaElement | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragActive   = useRef(false);

  useEffect(() => {
    if (view !== "preview") loadPrism().then(() => setPrismReady(true));
  }, [view]);

  useEffect(() => {
    if (prismReady && codeRef.current && (window as any).Prism)
      (window as any).Prism.highlightElement(codeRef.current);
  }, [prismReady, editCode, view]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleRun();
      if ((e.ctrlKey || e.metaKey) && e.key === "b") setSidebar(s => !s);
      if ((e.ctrlKey || e.metaKey) && e.key === "m") handleMinimize();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCode]);

  // Console bridge
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (!e.data?.__ac) return;
      setLogs(p => [...p.slice(-299), {
        level: e.data.l as CLevel, args: e.data.a as string[],
        time: Date.now(), id: ++_cid,
      }]);
      if (!showCons) setShowCons(true);
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [showCons]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // ── Live Edit: Auto-run in split mode (debounce 500ms) ───────────────────
  // بعد توقف الكتابة بـ 500ms تُحدَّث المعاينة تلقائياً
  useEffect(() => {
    if (view !== "split") return;
    const t = setTimeout(() => {
      if (editCode !== previewCode) {
        setPreviewCode(editCode);
        setLoading(true);
        setReloadKey(k => k + 1);
        setLogs([]);
        if (artifactId) pushVer(artifactId, editCode);
      }
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCode, view]);

  // ── Live Edit: Keep previewCode fresh in code-only mode ──────────────────
  // حتى لو المستخدم في وضع "كود فقط"، يُحدَّث previewCode في الخلفية
  useEffect(() => {
    if (view !== "code") return;
    const t = setTimeout(() => {
      if (editCode !== previewCode) setPreviewCode(editCode);
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCode, view]);

  // Draggable divider
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragActive.current = true;
    const onMove = (mv: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((mv.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => {
      dragActive.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Resizable console drag
  const startConsDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = consH;
    const onMove = (mv: MouseEvent) => {
      setConsH(Math.max(80, Math.min(400, startH - (mv.clientY - startY))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [consH]);

  const handleRun = useCallback(() => {
    setPreviewCode(editCode);
    setLoading(true);
    setReloadKey(k => k + 1);
    setLogs([]);
    if (artifactId) pushVer(artifactId, editCode);
  }, [editCode, artifactId]);

  const handleReload = useCallback(() => { setLoading(true); setReloadKey(k => k + 1); setLogs([]); }, []);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(editCode); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* ignore */ }
  }, [editCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([editCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g,"-").toLowerCase()}.${ext(language)}`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }, [editCode, language, title]);

  const handleNewTab = useCallback(() => {
    const blob = new Blob([buildDoc(language, editCode)], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [language, editCode]);

  // Share Link — uses project-wide toast system
  const handleShareLink = useCallback(async () => {
    const encoded = encodeForShare(editCode);
    const url = `${window.location.origin}/artifact-preview?code=${encoded}&lang=${language}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: "✅ تم نسخ رابط المشاركة للحافظة!" });
    } catch {
      window.prompt("انسخ الرابط:", url);
    }
  }, [editCode, language, toast]);

  // Minimize → global store (persists across card close/scroll)
  const handleMinimize = useCallback(() => {
    if (!artifactId) { onClose(); return; }
    const artifact: MinimizedArtifact = { artifactId, title, language, editCode, view };
    if (onMinimize) {
      // Opened from a pill — let the pill handle store update + close
      onMinimize(artifact);
    } else {
      // Opened from ArtifactCard — push to global store then close overlay
      minimize(artifact);
      onClose();
    }
  }, [artifactId, title, language, editCode, view, onMinimize, minimize, onClose]);

  const errCount = logs.filter(l => l.level === "error").length;
  const lineCount = editCode.split("\n").length;
  const prismClass = language === "react" ? "language-jsx"
    : language === "javascript" ? "language-javascript" : "language-markup";

  const showPrev = view === "preview" || view === "split";
  const showCode = view === "code"    || view === "split";

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:C.bg,
      display:"flex", flexDirection:"column",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(20px)",
      transition:"opacity .2s ease,transform .25s cubic-bezier(.34,1.56,.64,1)",
    }}>

      {/* ── TOP BAR ────────────────────────────────────────────────── */}
      <div style={{
        height:48, flexShrink:0,
        display:"flex", alignItems:"center", gap:6,
        padding:"0 10px",
        background:C.panel,
        borderBottom:`1px solid ${C.border}`,
      }}>

        {/* Back */}
        <button
          onClick={onClose}
          style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"5px 10px", border:"none", borderRadius:8,
            background:"transparent", color:C.muted, cursor:"pointer",
            fontFamily:"inherit", fontSize:12, flexShrink:0,
            transition:"all .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.muted; }}
          title="إغلاق (Esc)"
        >
          <I.Back />
          <span>رجوع</span>
        </button>

        <div style={{ width:1, height:20, background:C.border, flexShrink:0 }}/>

        {/* Sidebar toggle */}
        <IBtn icon={<I.Sidebar/>} onClick={() => setSidebar(s => !s)} active={sidebar} label="السجل" />

        <div style={{ width:1, height:20, background:C.border, flexShrink:0 }}/>

        {/* Title + badge */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
          <div style={{
            flexShrink:0, width:28, height:28, borderRadius:7,
            background:m.bg, border:`1px solid ${m.color}44`,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:m.color, fontSize:13, fontWeight:700,
          }}>{m.symbol}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
            <div style={{ fontSize:10, color:C.muted }}>
              {m.label} · {lineCount} سطر{isModified ? <span style={{color:C.warn}}> · معدّل</span> : null}
              {artifactId && <span style={{color:C.teal, marginRight:4}}> · محفوظ تلقائياً</span>}
            </div>
          </div>
        </div>

        {/* View mode tabs */}
        <div style={{ display:"flex", background:C.bg, borderRadius:9, padding:3, border:`1px solid ${C.border}`, flexShrink:0 }}>
          {([["preview","معاينة",<I.Eye/>],["split","مقسّم",<I.Split/>],["code","الكود",<I.Code2/>]] as const).map(([mode, label, icon]) => (
            <button
              key={mode}
              className={`av3-tab${view===mode?" active":""}`}
              onClick={() => setView(mode as ViewMode)}
              style={{
                display:"flex", alignItems:"center", gap:4,
                padding:"4px 11px", border:"none", borderRadius:7,
                cursor:"pointer", fontSize:12, fontFamily:"inherit",
                background:"transparent", color:view===mode?C.text:C.muted,
                fontWeight:view===mode?600:400, transition:"all .15s",
              }}
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>

        {/* Viewport (only when preview visible) */}
        {showPrev && (
          <div style={{ display:"flex", background:C.bg, borderRadius:8, padding:2, border:`1px solid ${C.border}`, flexShrink:0 }}>
            {(["mobile","tablet","desktop"] as Viewport[]).map(vp => (
              <button
                key={vp}
                className={`av3-vp${viewport===vp?" active":""}`}
                onClick={() => setViewport(vp)}
                style={{
                  padding:"3px 9px", border:"none", borderRadius:6,
                  background:"transparent", color:viewport===vp?C.accent:C.muted,
                  cursor:"pointer", fontSize:11, fontFamily:"inherit",
                  transition:"all .15s",
                }}
              >
                {vp==="mobile"?"📱":vp==="tablet"?"📲":"🖥"}{" "}{VIEWS[vp].label}
              </button>
            ))}
          </div>
        )}

        <div style={{ width:1, height:20, background:C.border, flexShrink:0 }}/>

        {/* Actions */}
        <IBtn icon={<I.Play/>}     label="تشغيل"       onClick={handleRun}     highlight />
        <IBtn icon={<I.Reload/>}   label="إعادة تحميل" onClick={handleReload}  />
        <IBtn icon={<I.Console/>}  onClick={() => setShowCons(s => !s)} active={showCons}
          badge={errCount || undefined} label={`وحدة التحكم`} />

        <div style={{ width:1, height:20, background:C.border, flexShrink:0 }}/>

        <IBtn icon={copied ? <I.Check/> : <I.Copy/>} onClick={handleCopy}    label="نسخ"    />
        <IBtn icon={<I.Download/>}                   onClick={handleDownload} label="تحميل"  />
        <IBtn icon={<I.NewTab/>}                     onClick={handleNewTab}   label="تبويب"  />

        {/* ── NEW: Share Link button ── */}
        <IBtn
          icon={<I.Share/>}
          onClick={handleShareLink}
          label="مشاركة"
          highlight={false}
        />

        <div style={{ width:1, height:20, background:C.border, flexShrink:0 }}/>

        {/* ── NEW: Minimize button ── */}
        <button
          onClick={handleMinimize}
          title={artifactId ? "تصغير (Ctrl+M)" : "إغلاق"}
          style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            width:28, height:28, border:"none", borderRadius:7,
            background:"transparent", color:C.muted, cursor:"pointer",
            transition:"all .15s", flexShrink:0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.muted; }}
        >
          <I.Minimize />
        </button>
      </div>

      {/* ── BODY (sidebar + main) ─────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Sidebar */}
        {sidebar && (
          <div style={{
            width:220, flexShrink:0,
            borderLeft:`1px solid ${C.border}`,
            background:C.panel,
            display:"flex", flexDirection:"column",
            overflow:"hidden",
          }}>
            {/* File info */}
            <div style={{ padding:"14px 14px 10px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>معلومات الملف</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <Row label="اللغة"   value={m.label}             color={m.color} />
                <Row label="الأسطر"  value={`${lineCount}`}        />
                <Row label="الحجم"   value={`${(editCode.length/1024).toFixed(1)} KB`} />
                <Row label="النسخ"   value={`${versions.length}`}  color={versions.length>1?C.accent:undefined} />
                <Row label="الحفظ"   value={artifactId ? "تلقائي ✓" : "—"} color={artifactId ? C.teal : undefined} />
              </div>
            </div>

            {/* Version history */}
            <div style={{ padding:"10px 14px 6px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:1, display:"flex", alignItems:"center", gap:4 }}>
                <I.Clock/> سجل الإصدارات
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto" }} className="av3-editor">
              {[...versions].reverse().map((v, ri) => {
                const i = versions.length - 1 - ri;
                return (
                  <button
                    key={i}
                    className={`av3-ver${vIdx===i?" active":""}`}
                    onClick={() => setVIdx(i)}
                    style={{
                      display:"flex", flexDirection:"column", gap:1,
                      width:"100%", padding:"8px 14px",
                      border:"none", background:"transparent",
                      cursor:"pointer", textAlign:"right", fontFamily:"inherit",
                      borderBottom:`1px solid ${C.border}22`,
                      color:vIdx===i?C.accent:C.muted,
                    }}
                  >
                    <span style={{ fontSize:12, fontWeight:600 }}>{v.label}</span>
                    <span style={{ fontSize:10, direction:"ltr", textAlign:"left" }}>
                      {new Date(v.timestamp).toLocaleTimeString("en-US")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Shortcuts */}
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, fontSize:10, color:C.muted }}>
              <div style={{ marginBottom:4, fontWeight:600 }}>اختصارات</div>
              <ShortcutRow keys="Ctrl+↵" label="تشغيل" />
              <ShortcutRow keys="Ctrl+B" label="Sidebar" />
              <ShortcutRow keys="Ctrl+M" label="تصغير" />
              <ShortcutRow keys="Esc"    label="إغلاق" />
              <ShortcutRow keys="Tab"    label="مسافة بادئة" />
            </div>
          </div>
        )}

        {/* ── CONTENT AREA ─────────────────────────────────────────────── */}
        <div ref={containerRef} style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

          {/* Preview pane */}
          {showPrev && (
            <div style={{
              flex: view==="split" ? `0 0 ${splitPct}%` : 1,
              display:"flex", flexDirection:"column",
              overflow:"hidden", position:"relative",
              background: viewport==="desktop" ? "#fff" : C.bg,
              borderLeft: view==="split" ? `1px solid ${C.border}` : "none",
            }}>
              {/* Viewport frame wrapper */}
              <div style={{
                flex:1, overflow:"auto",
                display:"flex", justifyContent:"center",
                background: viewport!=="desktop" ? C.bg : "#fff",
              }}>
                {loading && (
                  <div style={{
                    position:"absolute", inset:0, zIndex:2,
                    display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center",
                    background:C.bg, gap:12,
                  }}>
                    <div className="av3-spin" style={{
                      width:28, height:28,
                      border:`2px solid ${C.accent}30`,
                      borderTopColor:C.accent,
                      borderRadius:"50%",
                    }}/>
                    <span style={{ color:C.muted, fontSize:13 }}>جارٍ تحميل المعاينة…</span>
                  </div>
                )}
                <div style={{
                  width: VIEWS[viewport].w,
                  height: viewport==="desktop" ? "100%" : undefined,
                  minHeight: viewport!=="desktop" ? "100%" : undefined,
                  flexShrink:0,
                  boxShadow: viewport!=="desktop" ? "0 0 0 1px rgba(0,0,0,.5),0 12px 48px rgba(0,0,0,.5)" : "none",
                  transition:"width .25s ease",
                }}>
                  <iframe
                    key={reloadKey}
                    srcDoc={srcDoc}
                    sandbox="allow-scripts allow-forms allow-popups"
                    onLoad={() => setLoading(false)}
                    style={{ width:"100%", height:"100%", border:"none", display:"block", minHeight:300 }}
                    title={title}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Drag divider */}
          {view === "split" && (
            <div
              className="av3-drag"
              onMouseDown={startDrag}
              style={{ width:6, flexShrink:0, position:"relative", zIndex:10 }}
            >
              <div className="av3-drag-bar" style={{
                position:"absolute", top:0, bottom:0, left:"50%",
                width:2, transform:"translateX(-50%)",
                background:C.border, transition:"background .15s",
              }}/>
            </div>
          )}

          {/* Code pane */}
          {showCode && (
            <div style={{
              flex: view==="split" ? `0 0 ${100-splitPct}%` : 1,
              display:"flex", flexDirection:"column",
              overflow:"hidden", background:C.bg,
            }}>
              {/* Code toolbar */}
              <div style={{
                height:34, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"0 12px",
                background:C.panel,
                borderBottom:`1px solid ${C.border}`,
              }}>
                <span style={{ fontSize:11, color:C.muted }}>
                  {m.label} · {lineCount} سطر · {(editCode.length/1024).toFixed(1)} KB
                  <span style={{ color:C.teal, marginRight:8, fontSize:10 }}>
                    {view==="split" ? "• تحديث تلقائي 500ms" : "• تعديل مباشر"}
                  </span>
                </span>
                {(isModified || view!=="split") && (
                  <button
                    onClick={handleRun}
                    style={{
                      display:"flex", alignItems:"center", gap:5,
                      padding:"3px 11px", border:"none", borderRadius:6,
                      background:C.teal, color:"#0a1a18",
                      fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      boxShadow:`0 0 12px ${C.tealLo}`,
                    }}
                  >
                    <I.Play/> تشغيل
                  </button>
                )}
              </div>

              {/* Editor */}
              <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
                {/* Line numbers */}
                <div style={{
                  width:44, flexShrink:0,
                  background:C.panel,
                  borderLeft:`1px solid ${C.border}`,
                  overflowY:"hidden",
                  padding:"14px 0",
                  userSelect:"none",
                }}>
                  {Array.from({length:lineCount},(_,i)=>(
                    <div key={i} style={{
                      height:"1.5em", lineHeight:"1.5em",
                      fontFamily:"monospace", fontSize:12,
                      color:C.dim, textAlign:"right", paddingRight:8,
                    }}>{i+1}</div>
                  ))}
                </div>

                {/* Textarea + prism overlay */}
                <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
                  {/* Highlighted layer */}
                  <pre
                    aria-hidden
                    style={{
                      position:"absolute", inset:0, margin:0,
                      padding:"14px 12px",
                      fontFamily:"'Fira Code','Cascadia Code','Consolas',monospace",
                      fontSize:13, lineHeight:"1.5em",
                      direction:"ltr", textAlign:"left",
                      pointerEvents:"none", overflow:"hidden",
                      background:"transparent", whiteSpace:"pre",
                    }}
                  >
                    <code ref={codeRef} className={prismClass} style={{background:"transparent"}}>
                      {editCode}
                    </code>
                  </pre>

                  {/* Editable layer (Live Edit) */}
                  <textarea
                    ref={taRef}
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    onScroll={e => {
                      const pre = (e.currentTarget.parentElement?.querySelector("pre")) as HTMLElement | null;
                      if (pre) { pre.scrollTop = e.currentTarget.scrollTop; pre.scrollLeft = e.currentTarget.scrollLeft; }
                    }}
                    onKeyDown={e => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const ta = e.currentTarget;
                        const s = ta.selectionStart, end = ta.selectionEnd;
                        const v = editCode.slice(0,s) + "  " + editCode.slice(end);
                        setEditCode(v);
                        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s+2; });
                      }
                    }}
                    spellCheck={false}
                    className="av3-editor"
                    style={{
                      position:"absolute", inset:0,
                      resize:"none", border:"none", outline:"none",
                      background:"transparent",
                      color:"transparent", caretColor:C.teal,
                      fontFamily:"'Fira Code','Cascadia Code','Consolas',monospace",
                      fontSize:13, lineHeight:"1.5em",
                      padding:"14px 12px",
                      whiteSpace:"pre", overflowWrap:"normal",
                      zIndex:2,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONSOLE PANEL ──────────────────────────────────────────────── */}
      {showCons && (
        <div style={{
          height:consH, flexShrink:0,
          borderTop:`1px solid ${C.border}`,
          background:"#090910",
          display:"flex", flexDirection:"column",
        }}>
          {/* Drag handle */}
          <div
            onMouseDown={startConsDrag}
            style={{
              height:5, cursor:"row-resize", flexShrink:0,
              background:"transparent",
              borderBottom:`1px solid ${C.border}`,
            }}
          />
          {/* Header */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"3px 12px",
            borderBottom:`1px solid ${C.border}`,
            flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:C.muted }}>
              <I.Console/>
              <span>وحدة التحكم</span>
              {errCount > 0 && (
                <span style={{ background:C.danger, color:"#fff", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:700 }}>{errCount} خطأ</span>
              )}
              {logs.length > 0 && (
                <span style={{ color:C.dim }}>{logs.length} رسالة</span>
              )}
            </div>
            <button
              onClick={() => setLogs([])}
              style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:11, fontFamily:"inherit" }}
            >مسح</button>
          </div>

          {/* Log entries */}
          <div style={{ flex:1, overflow:"auto" }} className="av3-editor">
            {logs.length === 0 ? (
              <div style={{ color:C.dim, fontSize:12, padding:"12px 16px", fontFamily:"monospace" }}>لا توجد مخرجات بعد…</div>
            ) : logs.map(e => (
              <div key={e.id} style={{
                display:"flex", gap:8, padding:"3px 14px",
                fontFamily:"monospace", fontSize:12,
                direction:"ltr", textAlign:"left",
                color: e.level==="error"?C.danger:e.level==="warn"?C.warn:e.level==="info"?C.info:C.text,
                borderBottom:`1px solid ${C.border}18`,
              }}>
                <span style={{ color:C.dim, flexShrink:0, fontSize:10, marginTop:2 }}>
                  {new Date(e.time).toLocaleTimeString("en-US")}
                </span>
                <span style={{ flexShrink:0, width:32, fontSize:10, fontWeight:700, opacity:.7, marginTop:2 }}>
                  {e.level.toUpperCase()}
                </span>
                <span style={{ wordBreak:"break-all" }}>{e.args.join(" ")}</span>
              </div>
            ))}
            <div ref={logEndRef}/>
          </div>
        </div>
      )}

      {/* ── Share link toast ──────────────────────────────────────────── */}
      {/* Toast rendered globally via <Toaster /> in App.tsx */}
    </div>,
    document.body
  );
}

// ─── Sidebar helpers ──────────────────────────────────────────────────────────
function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
      <span style={{ color:C.muted }}>{label}</span>
      <span style={{ color: color ?? C.text, fontWeight:500 }}>{value}</span>
    </div>
  );
}
function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:10 }}>
      <span style={{ color:C.dim }}>{label}</span>
      <kbd style={{
        background:C.surface, border:`1px solid ${C.border}`, borderRadius:3,
        padding:"1px 5px", fontFamily:"monospace", color:C.muted, fontSize:9,
      }}>{keys}</kbd>
    </div>
  );
}

export default ArtifactCard;
